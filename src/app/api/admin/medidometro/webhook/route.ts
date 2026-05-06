/**
 * 🏛️ SB IMPERIUM v14.0 - WEBHOOK FINANCEIRO DO MEDIDÔMETRO
 * 
 * Webhook para atualizar a Função Social de Jesus instantaneamente
 * quando uma assinatura é salva no sistema.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// Configurações
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Interfaces
interface WebhookPayload {
  tipo: 'nova_assinatura' | 'deal_concluido' | 'split_gerado';
  signature_id?: string;
  deal_id?: string;
  valor_funcao_social: number;
  data_assinatura: string;
  hash_auditoria: string;
}

interface FuncaoSocialUpdate {
  total_funcao_social: number;
  valor_adicionado: number;
  data_atualizacao: string;
  origem: string;
  hash_transacao: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🏛️ Webhook do Medidômetro recebido');
    
    // 1. Parse e validação do payload
    const payload: WebhookPayload = await request.json();
    
    if (!payload.tipo || !payload.valor_funcao_social || !payload.hash_auditoria) {
      return NextResponse.json({
        erro: 'Payload inválido',
        campos_obrigatorios: ['tipo', 'valor_funcao_social', 'hash_auditoria']
      }, { status: 400 });
    }
    
    // 2. Validar hash de integridade
    const hashCalculado = generateWebhookHash(payload);
    if (hashCalculado !== payload.hash_auditoria) {
      return NextResponse.json({
        erro: 'Hash de auditoria inválido',
        hash_recebido: payload.hash_auditoria,
        hash_calculado: hashCalculado
      }, { status: 401 });
    }
    
    // 3. Buscar dados atuais da Função Social
    const { data: statsAtuais, error: errorStats } = await supabase
      .from('funcao_social_stats')
      .select('*')
      .eq('id', 'principal')
      .single();
    
    if (errorStats && errorStats.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar estatísticas: ${errorStats.message}`);
    }
    
    // 4. Calcular novo total
    const totalAtual = statsAtuais?.total_funcao_social || 0;
    const novoTotal = totalAtual + payload.valor_funcao_social;
    
    // 5. Preparar dados de atualização
    const updateData: FuncaoSocialUpdate = {
      total_funcao_social: novoTotal,
      valor_adicionado: payload.valor_funcao_social,
      data_atualizacao: new Date().toISOString(),
      origem: payload.tipo,
      hash_transacao: payload.hash_auditoria
    };
    
    // 6. Atualizar ou inserir estatísticas
    const { data: statsAtualizadas, error: errorUpdate } = await supabase
      .from('funcao_social_stats')
      .upsert({
        id: 'principal',
        total_funcao_social: novoTotal,
        total_atualizacoes: (statsAtuais?.total_atualizacoes || 0) + 1,
        ultima_atualizacao: new Date().toISOString(),
        valor_ultima_atualizacao: payload.valor_funcao_social,
        origem_ultima_atualizacao: payload.tipo,
        hash_ultima_transacao: payload.hash_auditoria
      }, {
        onConflict: 'id'
      })
      .select()
      .single();
    
    if (errorUpdate) {
      throw new Error(`Erro ao atualizar estatísticas: ${errorUpdate.message}`);
    }
    
    // 7. Registrar transação individual
    await registrarTransacao(payload, updateData);
    
    // 8. Verificar marcos e notificar se necessário
    await verificarENotificarMarcos(novoTotal, payload);
    
    // 9. Atualizar cache do dashboard (se necessário)
    await atualizarCacheDashboard(statsAtualizadas);
    
    // 10. Registrar log de auditoria
    await registrarLogAuditoria({
      tipo: 'webhook_medidometro',
      payload,
      resultado: updateData,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'desconhecido',
      user_agent: request.headers.get('user-agent') || 'desconhecido'
    });
    
    console.log(`✅ Função Social atualizada: R$ ${payload.valor_funcao_social.toLocaleString('pt-BR')} | Total: R$ ${novoTotal.toLocaleString('pt-BR')}`);
    
    // 11. Resposta de sucesso
    return NextResponse.json({
      sucesso: true,
      mensagem: 'Função Social atualizada com sucesso',
      dados: {
        valor_adicionado: payload.valor_funcao_social,
        total_anterior: totalAtual,
        total_atual: novoTotal,
        data_atualizacao: updateData.data_atualizacao,
        hash_transacao: payload.hash_auditoria
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro no webhook do Medidômetro:', error.message);
    
    // Registrar erro
    await registrarLogErro({
      erro: error.message,
      payload: await request.clone().json(),
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({
      sucesso: false,
      erro: 'Erro interno no webhook',
      detalhes: error.message
    }, { status: 500 });
  }
}

/**
 * Gerar hash para validação do webhook
 */
function generateWebhookHash(payload: WebhookPayload): string {
  const dadosParaHash = [
    payload.tipo,
    payload.signature_id || '',
    payload.deal_id || '',
    payload.valor_funcao_social.toString(),
    payload.data_assinatura
  ].join('|');
  
  return createHash('sha256').update(dadosParaHash).digest('hex');
}

/**
 * Registrar transação individual
 */
async function registrarTransacao(payload: WebhookPayload, updateData: FuncaoSocialUpdate): Promise<void> {
  try {
    await supabase
      .from('funcao_social_transacoes')
      .insert({
        id: `TRANS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        tipo: payload.tipo,
        signature_id: payload.signature_id,
        deal_id: payload.deal_id,
        valor: payload.valor_funcao_social,
        data_transacao: payload.data_assinatura,
        hash_auditoria: payload.hash_auditoria,
        criado_em: new Date().toISOString()
      });
  } catch (error) {
    console.error('❌ Erro ao registrar transação:', error);
  }
}

/**
 * Verificar marcos e notificar
 */
async function verificarENotificarMarcos(total: number, payload: WebhookPayload): Promise<void> {
  try {
    // Marcos de R$ 10.000, R$ 50.000, R$ 100.000, R$ 500.000, R$ 1.000.000
    const marcos = [10000, 50000, 100000, 500000, 1000000];
    
    for (const marco of marcos) {
      if (total >= marco) {
        // Verificar se já foi notificado para este marco
        const { data: notificacaoExistente } = await supabase
          .from('funcao_social_notificacoes')
          .select('*')
          .eq('valor_marco', marco)
          .eq('tipo', 'marco_atingido')
          .single();
        
        if (!notificacaoExistente) {
          // Registrar notificação
          await supabase
            .from('funcao_social_notificacoes')
            .insert({
              id: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
              tipo: 'marco_atingido',
              valor_marco: marco,
              total_atual: total,
              origem: payload.tipo,
              criada_em: new Date().toISOString()
            });
          
          // Disparar webhook de notificação (Discord/Slack)
          await dispararNotificacaoMarco(marco, total, payload);
          
          console.log(`🎯 Marco atingido: R$ ${marco.toLocaleString('pt-BR')} | Total: R$ ${total.toLocaleString('pt-BR')}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar marcos:', error);
  }
}

/**
 * Disparar notificação de marco
 */
async function dispararNotificacaoMarco(marco: number, total: number, payload: WebhookPayload): Promise<void> {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.warn('⚠️ Discord webhook URL não configurada');
      return;
    }
    
    const mensagem = {
      embeds: [{
        title: '🏛️ MARCO DA FUNÇÃO SOCIAL ATINGIDO!',
        description: `A Função Social de Jesus alcançou um novo marco significativo!`,
        color: 0xD4AF37, // Dourado SB
        fields: [
          {
            name: '🎯 Marco Alcançado',
            value: `R$ ${marco.toLocaleString('pt-BR')}`,
            inline: true
          },
          {
            name: '💰 Total Acumulado',
            value: `R$ ${total.toLocaleString('pt-BR')}`,
            inline: true
          },
          {
            name: '📈 Origem',
            value: payload.tipo.replace('_', ' ').toUpperCase(),
            inline: true
          },
          {
            name: '🔐 Hash Auditoria',
            value: `\`${payload.hash_auditoria.substring(0, 16)}...\``,
            inline: false
          }
        ],
        footer: {
          text: 'SB Imperium v14.0 - Função Social de Jesus',
          icon_url: 'https://imobai-psi.vercel.app/favicon.ico'
        },
        timestamp: new Date().toISOString()
      }]
    };
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mensagem)
    });
    
    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.statusText}`);
    }
    
    console.log('✅ Notificação de marco enviada com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao enviar notificação de marco:', error);
  }
}

/**
 * Atualizar cache do dashboard
 */
async function atualizarCacheDashboard(stats: any): Promise<void> {
  try {
    // Aqui poderia implementar cache Redis ou similar
    // Por enquanto, apenas log
    console.log('📊 Cache do dashboard atualizado');
  } catch (error) {
    console.error('❌ Erro ao atualizar cache:', error);
  }
}

/**
 * Registrar log de auditoria
 */
async function registrarLogAuditoria(dados: {
  tipo: string;
  payload: any;
  resultado: any;
  ip: string;
  user_agent: string;
}): Promise<void> {
  try {
    await supabase
      .from('logs_auditoria')
      .insert({
        id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        user_id: 'webhook_medidometro',
        recurso_acessado: 'funcao_social',
        timestamp: new Date().toISOString(),
        nexo_hash: dados.payload.hash_auditoria,
        ip_acesso: dados.ip,
        tipo_acao: 'atualizacao',
        detalhes: {
          tipo_webhook: dados.tipo,
          payload: dados.payload,
          resultado: dados.resultado,
          user_agent: dados.user_agent
        }
      });
  } catch (error) {
    console.error('❌ Erro ao registrar log de auditoria:', error);
  }
}

/**
 * Registrar log de erro
 */
async function registrarLogErro(dados: {
  erro: string;
  payload: any;
  timestamp: string;
}): Promise<void> {
  try {
    await supabase
      .from('logs_erro')
      .insert({
        id: `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        tipo: 'webhook_medidometro',
        erro: dados.erro,
        payload: dados.payload,
        timestamp: dados.timestamp,
        criado_em: new Date().toISOString()
      });
  } catch (error) {
    console.error('❌ Erro ao registrar log de erro:', error);
  }
}

/**
 * GET - Status do webhook
 */
export async function GET() {
  try {
    // Buscar estatísticas atuais
    const { data: stats } = await supabase
      .from('funcao_social_stats')
      .select('*')
      .eq('id', 'principal')
      .single();
    
    // Buscar transações recentes
    const { data: transacoes } = await supabase
      .from('funcao_social_transacoes')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(10);
    
    return NextResponse.json({
      sucesso: true,
      webhook: 'medidometro',
      status: 'ativo',
      estatisticas: stats,
      transacoes_recentes: transacoes,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao buscar status:', error.message);
    
    return NextResponse.json({
      sucesso: false,
      erro: error.message
    }, { status: 500 });
  }
}
