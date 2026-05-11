/**
 * 🏛️ SB IMPERIUM v14.0 - ENDPOINT DE CADASTRO DE LEAD COM LGPD
 * 
 * Funcionalidades:
 * 1. Cadastro de lead com validação LGPD
 * 2. Consentimento obrigatório
 * 3. Log de auditoria
 * 4. Validação de dados sensíveis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { registrarConsentimentoLGPD, criarLogComContexto } from '@/lib/lgpd-compliance';

// Configurações
let _supabase: ReturnType<typeof createClient> | null = null;
const supabase = new Proxy({}, {
  get(_: unknown, prop: string | symbol) {
    if (!_supabase) {
      _supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
    return Reflect.get(_supabase, prop);
  },
}) as SupabaseClient<any>;

// Interfaces
interface LeadCadastroRequest {
  nome: string;
  email: string;
  telefone: string;
  cpf?: string;
  interesse_lote: string;
  empreendimento: string;
  vgv_alvo: number;
  regiao: string;
  perfil_investidor: 'conservador' | 'moderado' | 'agressivo';
  consentimento_lgpd: boolean;
  termos_aceitos?: boolean;
  origem_cadastro?: string;
  broker_id?: string;
}

interface LeadCadastroResponse {
  sucesso: boolean;
  lead_id?: string;
  mensagem: string;
  erro?: string;
  dados_lgpd?: {
    consentimento_registrado: boolean;
    data_consentimento: string;
    ip_acesso: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('🏛️ Iniciando cadastro de lead com conformidade LGPD');
    
    // 1. Parse e validação dos dados
    const body: LeadCadastroRequest = await request.json();
    
    // Validações obrigatórias
    if (!body.nome || !body.email || !body.telefone) {
      return NextResponse.json({
        sucesso: false,
        mensagem: 'Dados obrigatórios não informados',
        erro: 'nome, email e telefone são obrigatórios'
      }, { status: 400 });
    }
    
    // 2. VALIDAÇÃO LGPD - Consentimento obrigatório
    if (!body.consentimento_lgpd) {
      return NextResponse.json({
        sucesso: false,
        mensagem: 'Consentimento LGPD é obrigatório',
        erro: 'O cadastro não pode ser concluído sem o consentimento da Lei Geral de Proteção de Dados'
      }, { status: 422 });
    }
    
    // 3. Validação de formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({
        sucesso: false,
        mensagem: 'E-mail inválido',
        erro: 'Formato de e-mail não é válido'
      }, { status: 400 });
    }
    
    // 4. Validação de CPF (se informado)
    if (body.cpf) {
      const cpfLimpo = body.cpf.replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        return NextResponse.json({
          sucesso: false,
          mensagem: 'CPF inválido',
          erro: 'CPF deve conter 11 dígitos'
        }, { status: 400 });
      }
    }
    
    // 5. Verificar duplicidade de e-mail/CPF
    const { data: leadExistente } = await supabase
      .from('leads')
      .select('id, email, cpf, status')
      .or(`email.eq.${body.email}${body.cpf ? `,cpf.eq.${body.cpf}` : ''}`)
      .limit(1);
    
    if (leadExistente && leadExistente.length > 0) {
      const duplicado = leadExistente[0];
      
      // Registrar tentativa de duplicidade
      await criarLogComContexto(
        'sistema',
        `tentativa_cadastro_duplicado_${duplicado.id}`,
        `DUPLICIDADE-${Date.now()}`,
        request
      );
      
      return NextResponse.json({
        sucesso: false,
        mensagem: 'Lead já cadastrado',
        erro: `Já existe um cadastro com este ${duplicado.email === body.email ? 'e-mail' : 'CPF'}`,
        lead_id: duplicado.id
      }, { status: 409 });
    }
    
    // 6. Gerar ID único para o lead
    const leadId = `LEAD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // 7. Preparar dados do lead
    const dadosLead = {
      id: leadId,
      nome: body.nome.trim(),
      email: body.email.toLowerCase().trim(),
      telefone: body.telefone.replace(/\D/g, ''),
      cpf: body.cpf ? body.cpf.replace(/\D/g, '') : null,
      interesse_lote: body.interesse_lote,
      empreendimento: body.empreendimento,
      vgv_alvo: body.vgv_alvo,
      regiao: body.regiao,
      perfil_investidor: body.perfil_investidor,
      status: 'novo',
      data_criacao: new Date().toISOString(),
      origem_cadastro: body.origem_cadastro || 'direct',
      broker_id: body.broker_id || null,
      sb_score: Math.floor(Math.random() * 200) + 600, // Score inicial 600-800
      lgpd_consentimento: body.consentimento_lgpd,
      data_consentimento_lgpd: new Date().toISOString(),
      ip_cadastro: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'desconhecido',
      user_agent_cadastro: request.headers.get('user-agent') || 'desconhecido'
    };
    
    // 8. Inserir lead no Supabase
    const { data: leadInserido, error: errorInsert } = await supabase
      .from('leads')
      .insert(dadosLead)
      .select()
      .single();
    
    if (errorInsert) {
      throw new Error(`Falha ao inserir lead: ${errorInsert.message}`);
    }
    
    // 9. Registrar consentimento LGPD
    const consentimentoResult = await registrarConsentimentoLGPD(
      leadId,
      body.consentimento_lgpd,
      request
    );
    
    if (!consentimentoResult.sucesso) {
      console.warn('⚠️ Falha ao registrar consentimento LGPD:', consentimentoResult.erro);
    }
    
    // 10. Gerar hash para Nexo Causal
    const dadosParaHash = [
      leadId,
      body.email,
      body.cpf || '',
      new Date().toISOString()
    ].join('|');
    
    const crypto = require('crypto');
    const nexoCausalHash = crypto.createHash('sha256').update(dadosParaHash).digest('hex');
    
    // 11. Registrar log de auditoria do cadastro
    await criarLogComContexto(
      body.broker_id || 'sistema',
      `lead_cadastrado_${leadId}`,
      nexoCausalHash,
      request
    );
    
    // 12. Resposta de sucesso
    const resposta: LeadCadastroResponse = {
      sucesso: true,
      lead_id: leadId,
      mensagem: 'Lead cadastrado com sucesso em conformidade com a LGPD',
      dados_lgpd: {
        consentimento_registrado: consentimentoResult.sucesso,
        data_consentimento: new Date().toISOString(),
        ip_acesso: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'desconhecido'
      }
    };
    
    console.log(`✅ Lead cadastrado com sucesso - ID: ${leadId} - LGPD: Conforme`);
    
    return NextResponse.json(resposta, { status: 201 });
    
  } catch (error: any) {
    console.error('❌ Erro no cadastro de lead:', error.message);
    
    // Registrar erro de auditoria
    try {
      await criarLogComContexto(
        'sistema',
        'erro_cadastro_lead',
        `ERRO-${Date.now()}`,
        request
      );
    } catch (logError) {
      console.error('❌ Falha ao registrar log de erro:', logError);
    }
    
    return NextResponse.json({
      sucesso: false,
      mensagem: 'Erro interno no cadastro',
      erro: error.message
    }, { status: 500 });
  }
}

/**
 * GET - Consultar leads (com restrições LGPD)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brokerId = searchParams.get('broker_id');
    const leadId = searchParams.get('lead_id');
    
    // Validação de acesso
    if (!brokerId && !leadId) {
      return NextResponse.json({
        erro: 'Parâmetro broker_id ou lead_id é obrigatório'
      }, { status: 400 });
    }
    
    let query = supabase.from('leads').select('*');
    
    if (leadId) {
      query = query.eq('id', leadId);
    } else if (brokerId) {
      query = query.eq('broker_id', brokerId);
    }
    
    const { data: leads, error } = await query;
    
    if (error) {
      throw new Error(`Falha ao consultar leads: ${error.message}`);
    }
    
    // Remover dados sensíveis anonimizados
    const leadsFiltrados = leads?.map(lead => {
      if (lead.lgpd_anonimizado) {
        return {
          ...lead,
          nome: 'DADO ANONIMIZADO',
          email: 'DADO ANONIMIZADO',
          cpf: 'DADO ANONIMIZADO',
          telefone: 'DADO ANONIMIZADO'
        };
      }
      return lead;
    }) || [];
    
    // Registrar log de consulta
    await criarLogComContexto(
      brokerId || 'sistema',
      `consulta_leads_${leadId || 'broker_' + brokerId}`,
      `CONSULTA-${Date.now()}`,
      request
    );
    
    return NextResponse.json({
      sucesso: true,
      leads: leadsFiltrados,
      total: leadsFiltrados.length
    });
    
  } catch (error: any) {
    console.error('❌ Erro na consulta de leads:', error.message);
    
    return NextResponse.json({
      sucesso: false,
      erro: error.message
    }, { status: 500 });
  }
}

/**
 * DELETE - Solicitar exclusão de dados (Direito ao Esquecimento)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');
    const motivo = searchParams.get('motivo') || 'direito_esquecimento';
    const solicitante = searchParams.get('solicitante') || 'titular';
    
    if (!leadId) {
      return NextResponse.json({
        sucesso: false,
        erro: 'lead_id é obrigatório'
      }, { status: 400 });
    }
    
    // Importar função de anonimização
    const { anonimizarDadosLead } = await import('@/lib/lgpd-compliance');
    
    // Executar anonimização
    const resultado = await anonimizarDadosLead(
      leadId,
      motivo as any,
      solicitante
    );
    
    if (!resultado.sucesso) {
      return NextResponse.json({
        sucesso: false,
        erro: resultado.erro
      }, { status: 500 });
    }
    
    return NextResponse.json({
      sucesso: true,
      mensagem: 'Dados anonimizados conforme Direito ao Esquecimento LGPD',
      dados_anonimizados: resultado.dados_anonimizados
    });
    
  } catch (error: any) {
    console.error('❌ Erro na anonimização de dados:', error.message);
    
    return NextResponse.json({
      sucesso: false,
      erro: error.message
    }, { status: 500 });
  }
}
