/**
 * 🏛️ SB IMPERIUM v14.0 - SIGNATURE CREATE ENDPOINT
 * 
 * Endpoint para criar assinaturas com registro de termos aceitos
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// Configurações
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Interfaces
interface SignatureCreateRequest {
  deal_id: string;
  signature_data: string;
  biometry_data?: string;
  face_validation_frames?: string[];
  termos_aceitos: boolean;
  termos_versao: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🏛️ Criando nova assinatura');
    
    // 1. Parse e validação do request
    const body: SignatureCreateRequest = await request.json();
    
    if (!body.deal_id || !body.signature_data) {
      return NextResponse.json({
        erro: 'Dados obrigatórios faltando',
        campos_obrigatorios: ['deal_id', 'signature_data', 'termos_aceitos']
      }, { status: 400 });
    }

    if (!body.termos_aceitos) {
      return NextResponse.json({
        erro: 'Termos de uso não aceitos',
        mensagem: 'Você deve aceitar os Termos de Uso SB Signature para continuar'
      }, { status: 400 });
    }
    
    if (body.termos_versao !== 'v1.0') {
      return NextResponse.json({
        erro: 'Versão dos termos inválida',
        mensagem: 'Versão aceita: v1.0'
      }, { status: 400 });
    }
    
    // 2. Obter IP do cliente
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'desconhecido';
    
    // 3. Obter User-Agent
    const userAgent = request.headers.get('user-agent') || 'desconhecido';
    
    // 4. Obter dados do usuário autenticado
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({
        erro: 'Não autorizado',
        mensagem: 'Usuário não autenticado'
      }, { status: 401 });
    }
    
    // Extrair token JWT (implementação simplificada)
    const token = authHeader.replace('Bearer ', '');
    let userId = null;
    
    try {
      // Em produção, validar JWT com Supabase
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    } catch (error) {
      return NextResponse.json({
        erro: 'Token inválido',
        mensagem: 'Falha na autenticação'
      }, { status: 401 });
    }
    
    if (!userId) {
      return NextResponse.json({
        erro: 'Usuário não encontrado',
        mensagem: 'Não foi possível identificar o usuário'
      }, { status: 401 });
    }
    
    // 5. Gerar hash SHA-256 de auditoria
    const dadosParaHash = [
      body.deal_id,
      userId,
      body.signature_data,
      new Date().toISOString(),
      body.biometry_data || '',
      clientIP
    ].join('|');
    
    const hashAuditoria = createHash('sha256').update(dadosParaHash).digest('hex');
    
    // 6. Preparar registro da assinatura
    const signatureRecord = {
      id: `SIG-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`,
      deal_id: body.deal_id,
      user_id: userId,
      signature_data: body.signature_data,
      biometry_data: body.biometry_data,
      face_validation_frames: body.face_validation_frames || [],
      nome_assinante: '', // Será preenchido pelo backend
      email_assinante: '', // Será preenchido pelo backend
      data_assinatura: new Date().toISOString(),
      ip_assinatura: clientIP,
      user_agent: userAgent,
      hash_auditoria: hashAuditoria,
      termos_aceitos: body.termos_aceitos,
      termos_versao: body.termos_versao,
      status: 'assinado'
    };
    
    // 7. Buscar dados do usuário para completar registro
    const { data: userProfile } = await supabase
      .from('perfil_completo')
      .select('nome, email')
      .eq('id', userId)
      .single();
    
    if (userProfile) {
      signatureRecord.nome_assinante = userProfile.nome;
      signatureRecord.email_assinante = userProfile.email;
    }
    
    // 8. Salvar assinatura no banco
    const { data: savedSignature, error: errorSave } = await supabase
      .from('signatures')
      .insert(signatureRecord)
      .select()
      .single();
    
    if (errorSave) {
      console.error('❌ Erro ao salvar assinatura:', errorSave);
      return NextResponse.json({
        erro: 'Erro ao salvar assinatura',
        detalhes: errorSave.message
      }, { status: 500 });
    }
    
    // 9. Registrar log de auditoria
    await registrarLogAuditoria({
      user_id: userId,
      signature_id: savedSignature.id,
      deal_id: body.deal_id,
      ip: clientIP,
      user_agent: userAgent,
      hash_auditoria: hashAuditoria,
      termos_aceitos: body.termos_aceitos,
      termos_versao: body.termos_versao
    });
    
    // 10. Disparar webhook do Medidômetro
    await dispararWebhookMedidometro(savedSignature);
    
    // 11. Gerar QR Code para o contrato
    const { gerarQRCodeContrato } = await import('@/lib/qr-code-generator');
    const qrCodeResult = await gerarQRCodeContrato(savedSignature);
    
    console.log(`✅ Assinatura criada com sucesso - ID: ${savedSignature.id}`);
    
    // 12. Resposta de sucesso
    return NextResponse.json({
      sucesso: true,
      mensagem: 'Assinatura criada com sucesso',
      dados: {
        signature_id: savedSignature.id,
        deal_id: savedSignature.deal_id,
        hash_auditoria: savedSignature.hash_auditoria,
        data_assinatura: savedSignature.data_assinatura,
        qr_code_url: qrCodeResult.qrCodeUrl,
        validation_url: qrCodeResult.validationUrl,
        termos_aceitos: savedSignature.termos_aceitos,
        termos_versao: savedSignature.termos_versao
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao criar assinatura:', error.message);
    
    return NextResponse.json({
      sucesso: false,
      erro: 'Erro interno ao criar assinatura',
      detalhes: error.message
    }, { status: 500 });
  }
}

/**
 * Registrar log de auditoria da assinatura
 */
async function registrarLogAuditoria(dados: {
  user_id: string;
  signature_id: string;
  deal_id: string;
  ip: string;
  user_agent: string;
  hash_auditoria: string;
  termos_aceitos: boolean;
  termos_versao: string;
}): Promise<void> {
  try {
    await supabase
      .from('logs_auditoria')
      .insert({
        id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`,
        user_id: dados.user_id,
        recurso_acessado: `signature_${dados.signature_id}`,
        timestamp: new Date().toISOString(),
        nexo_hash: dados.hash_auditoria,
        ip_acesso: dados.ip,
        tipo_acao: 'assinatura_criada',
        detalhes: {
          deal_id: dados.deal_id,
          user_agent: dados.user_agent,
          termos_aceitos: dados.termos_aceitos,
          termos_versao: dados.termos_versao,
          origem: 'signature_create_api'
        }
      });
  } catch (error) {
    console.error('❌ Erro ao registrar log de auditoria:', error);
  }
}

/**
 * Disparar webhook do Medidômetro
 */
async function dispararWebhookMedidometro(signature: any): Promise<void> {
  try {
    // Calcular valor da função social (1% do valor do deal)
    const dealValue = 100000; // Simulação - buscar do deal real
    const funcaoSocialValue = dealValue * 0.01;
    
    // Chamar webhook do Medidômetro
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/medidometro/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tipo: 'nova_assinatura',
        signature_id: signature.id,
        deal_id: signature.deal_id,
        valor_funcao_social: funcaoSocialValue,
        data_assinatura: signature.data_assinatura,
        hash_auditoria: signature.hash_auditoria
      })
    });
    
    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }
    
    console.log('✅ Webhook do Medidômetro disparado com sucesso');
    
  } catch (error: any) {
    console.error('❌ Erro no webhook do Medidômetro:', error.message);
    // Não falhar a assinatura se o webhook falhar
  }
}

/**
 * GET - Listar assinaturas do usuário
 */
export async function GET(request: NextRequest) {
  try {
    // Obter token de autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({
        erro: 'Não autorizado'
      }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return NextResponse.json({
        erro: 'Usuário não autenticado'
      }, { status: 401 });
    }
    
    // Buscar assinaturas do usuário
    const { data: signatures, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('user_id', user.id)
      .order('data_assinatura', { ascending: false })
      .limit(50);
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      sucesso: true,
      assinaturas: signatures || [],
      total: signatures?.length || 0
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao listar assinaturas:', error.message);
    
    return NextResponse.json({
      sucesso: false,
      erro: 'Erro interno ao listar assinaturas',
      detalhes: error.message
    }, { status: 500 });
  }
}
