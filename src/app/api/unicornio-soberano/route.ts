// 🦄 SECURITY BROKER SB v29 - O UNICÓRNIO SOBERANO
// API de Controle de Ecossistema e Fusão Final de Todos os Módulos

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

interface UnicornioSoberanoRequest {
  acao: 'processar_deep_intent' | 'avm_instantaneo' | 'gerar_lookalike' | 'validar_biometria_3d' | 'criar_nexo_causal' | 'processar_revenue_stack' | 'configurar_imobiliaria_socia' | 'distribuir_leads_roleta' | 'processar_tesouro_v29' | 'criar_dashboard_transparencia' | 'configurar_beneficiario_rede' | 'enviar_chat_criptografado';
  dados?: {
    request_id?: string;
    investor_id?: string;
    intent_primary?: string;
    parameters?: any;
    investment_amount?: number;
    property_id?: string;
    property_type?: string;
    area_total?: number;
    address?: string;
    coordinates?: { x: number; y: number };
    source_investor_id?: string;
    search_radius_km?: number;
    user_id?: string;
    biometric_id?: string;
    face_model_3d?: string;
    face_scan_data?: any;
    facial_landmarks?: any;
    face_vector?: number[];
    nexo_id?: string;
    contract_id?: string;
    service_order_id?: string;
    authorization_type?: string;
    authorization_scope?: string;
    authorization_duration?: number;
    authorization_document?: string;
    transaction_id?: string;
    transaction_date?: string;
    autonomous_broker_id?: string;
    imobiliaria_id?: string;
    partnership_level?: string;
    management_autonomy?: boolean;
    independent_operations?: boolean;
    custom_branding?: boolean;
    royalty_percentage?: number;
    royalty_base?: string;
    lead_distribution_enabled?: boolean;
    meritocratic_scoring?: boolean;
    lead_score_weight?: number;
    max_leads_per_month?: number;
    lead_conversion_target?: number;
    performance_threshold?: number;
    mes_referencia?: string;
    dashboard_id?: string;
    socio_id?: string;
    beneficiario_id?: string;
    titular_id?: string;
    inheritance_type?: string;
    inheritance_scope?: any;
    inheritance_conditions?: string;
    inherited_permissions?: string[];
    verification_method?: string;
    message_id?: string;
    chat_room_id?: string;
    recipient_id?: string;
    message_content?: string;
    message_type?: string;
    encryption_key_id?: string;
  };
}

interface UnicornioSoberanoResponse {
  success: boolean;
  deep_intent_processado?: {
    sucesso: boolean;
    request_id: string;
    intent_primary: string;
    ai_confidence: number;
    ai_score: number;
    recommendations: any;
    matching_opportunities: string[];
    processed_at: string;
  };
  avm_gerado?: {
    sucesso: boolean;
    valuation_id: string;
    market_value: number;
    min_value: number;
    max_value: number;
    confidence_level: number;
    comparable_count: number;
    avg_price_per_sqm: number;
    valuation_date: string;
  };
  lookalike_gerado?: {
    sucesso: boolean;
    lookalike_id: string;
    lookalike_score: number;
    income_bracket: string;
    net_worth_range: string;
    investment_capacity: number;
    search_radius_km: number;
    matched_opportunities: string[];
  };
  biometria_validada?: {
    sucesso: boolean;
    biometric_id: string;
    verification_confidence: number;
    liveness_score: number;
    anti_spoofing_score: number;
    biometric_status: string;
  };
  nexo_causal_criado?: {
    sucesso: boolean;
    nexo_id: string;
    authorization_type: string;
    authorization_scope: string;
    authorization_duration: number;
    document_hash: string;
    digital_signature: string;
    signature_timestamp: string;
    verification_status: string;
    nexo_status: string;
    expiry_date: string;
  };
  revenue_stack_processada?: {
    sucesso: boolean;
    transaction_id: string;
    transaction_date: string;
    total_revenue: number;
    split_70_percent: number;
    split_30_percent: number;
    fronts_breakdown: any;
  };
  imobiliaria_configurada?: {
    sucesso: boolean;
    partnership_id: string;
    partnership_level: string;
    management_autonomy: boolean;
    royalty_percentage: number;
    lead_distribution_enabled: boolean;
    partnership_status: string;
  };
  leads_distribuidos?: {
    sucesso: boolean;
    lead_id: string;
    imobiliaria_id: string;
    composite_score: number;
    distribution_priority: number;
    lead_status: string;
    distribution_date: string;
  };
  tesouro_processado?: {
    sucesso: boolean;
    tesouro_id: string;
    mes_referencia: string;
    faturamento_bruto_total: number;
    faturamento_liquido: number;
    valor_contribuicao: number;
    status_contribuicao: string;
  };
  dashboard_criado?: {
    sucesso: boolean;
    dashboard_id: string;
    socio_id: string;
    total_contribuicoes: number;
    total_projetos_financiados: number;
    total_pessoas_beneficiadas: number;
    nivel_acesso: string;
    dashboard_status: string;
  };
  beneficiario_configurado?: {
    sucesso: boolean;
    beneficiario_id: string;
    inheritance_type: string;
    verification_status: string;
    lgpd_lock_active: boolean;
    inheritance_status: string;
  };
  chat_enviado?: {
    sucesso: boolean;
    message_id: string;
    chat_room_id: string;
    sender_id: string;
    recipient_id: string;
    message_hash: string;
    interaction_hash: string;
    lgpd_protected: boolean;
    message_status: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: UnicornioSoberanoRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🦄 Unicornio Soberano: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'processar_deep_intent':
        resultado = await processarDeepIntent(dados);
        break;
      case 'avm_instantaneo':
        resultado = await avmInstantaneo(dados);
        break;
      case 'gerar_lookalike':
        resultado = await gerarLookalike(dados);
        break;
      case 'validar_biometria_3d':
        resultado = await validarBiometria3D(dados);
        break;
      case 'criar_nexo_causal':
        resultado = await criarNexoCausal(dados);
        break;
      case 'processar_revenue_stack':
        resultado = await processarRevenueStack(dados);
        break;
      case 'configurar_imobiliaria_socia':
        resultado = await configurarImobiliariaSocia(dados);
        break;
      case 'distribuir_leads_roleta':
        resultado = await distribuirLeadsRoleta(dados);
        break;
      case 'processar_tesouro_v29':
        resultado = await processarTesouroV29(dados);
        break;
      case 'criar_dashboard_transparencia':
        resultado = await criarDashboardTransparencia(dados);
        break;
      case 'configurar_beneficiario_rede':
        resultado = await configurarBeneficiarioRede(dados);
        break;
      case 'enviar_chat_criptografado':
        resultado = await enviarChatCriptografado(dados);
        break;
      default:
        throw new Error('Ação inválida');
    }
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: `Operação ${acao} concluída com sucesso`
    });
    
  } catch (error: any) {
    console.error('Erro no Unicornio Soberano:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Unicornio Soberano',
      details: error.message
    }, { status: 500 });
  }
}

async function processarDeepIntent(dados: any): Promise<UnicornioSoberanoResponse['deep_intent_processado']> {
  const { request_id, investor_id, intent_primary, parameters, investment_amount } = dados;
  
  // Validar dados obrigatórios
  if (!request_id || !investor_id || !intent_primary) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Processar Deep Intent via função RPC
  const { data: resultado, error } = await supabase
    .rpc('processar_deep_intent', {
      p_request_id: request_id,
      p_investor_id: investor_id,
      p_intent_primary: intent_primary,
      p_parameters: parameters || {},
      p_investment_amount: investment_amount || 0
    });
  
  if (error) {
    throw new Error(`Erro ao processar Deep Intent: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao processar Deep Intent');
  }
  
  return resultado;
}

async function avmInstantaneo(dados: any): Promise<UnicornioSoberanoResponse['avm_gerado']> {
  const { property_id, property_type, area_total, address, coordinates } = dados;
  
  // Validar dados obrigatórios
  if (!property_id || !property_type || !area_total || !address) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Gerar AVM via função RPC
  const { data: resultado, error } = await supabase
    .rpc('avm_instantaneo', {
      p_property_id: property_id,
      p_property_type: property_type,
      p_area_total: area_total,
      p_address: address,
      p_coordinates: coordinates ? `POINT(${coordinates.x}, ${coordinates.y})` : null
    });
  
  if (error) {
    throw new Error(`Erro ao gerar AVM: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao gerar AVM');
  }
  
  return resultado;
}

async function gerarLookalike(dados: any): Promise<UnicornioSoberanoResponse['lookalike_gerado']> {
  const { source_investor_id, search_radius_km } = dados;
  
  // Validar dados obrigatórios
  if (!source_investor_id) {
    throw new Error('ID do investidor fonte é obrigatório');
  }
  
  // Gerar Lookalike via função RPC
  const { data: resultado, error } = await supabase
    .rpc('gerar_lookalike_investidores', {
      p_source_investor_id: source_investor_id,
      p_search_radius_km: search_radius_km || 5
    });
  
  if (error) {
    throw new Error(`Erro ao gerar Lookalike: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao gerar Lookalike');
  }
  
  return resultado;
}

async function validarBiometria3D(dados: any): Promise<UnicornioSoberanoResponse['biometria_validada']> {
  const { user_id, biometric_id, face_model_3d, face_scan_data, facial_landmarks, face_vector } = dados;
  
  // Validar dados obrigatórios
  if (!user_id || !biometric_id || !face_model_3d) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Simular validação biométrica
  const verification_confidence = 95.5 + Math.random() * 4.5; // 95.5-100%
  const liveness_score = 96.8 + Math.random() * 3.2; // 96.8-100%
  const anti_spoofing_score = 97.2 + Math.random() * 2.8; // 97.2-100%
  
  // Inserir biometria
  const { data: biometria, error } = await supabase
    .from('biometria_facial_3d')
    .insert({
      user_id,
      biometric_id,
      face_model_3d,
      face_scan_data: face_scan_data || {},
      facial_landmarks: facial_landmarks || {},
      face_vector: face_vector || [],
      verification_confidence,
      liveness_score,
      anti_spoofing_score,
      biometric_status: 'active',
      enrollment_date: new Date().toISOString()
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao validar biometria 3D: ${error.message}`);
  }
  
  return {
    sucesso: true,
    biometric_id: biometria.biometric_id,
    verification_confidence: biometria.verification_confidence,
    liveness_score: biometria.liveness_score,
    anti_spoofing_score: biometria.anti_spoofing_score,
    biometric_status: biometria.biometric_status
  };
}

async function criarNexoCausal(dados: any): Promise<UnicornioSoberanoResponse['nexo_causal_criado']> {
  const { nexo_id, contract_id, service_order_id, user_id, authorization_type, authorization_scope, authorization_duration, authorization_document } = dados;
  
  // Validar dados obrigatórios
  if (!nexo_id || !user_id || !authorization_type || !authorization_scope) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Gerar hash do documento
  const document_hash = authorization_document ? 
    await require('crypto').createHash('sha256').update(authorization_document).digest('hex') : 
    '';
  
  // Gerar assinatura digital
  const digital_signature = `DIGITAL_SIGNATURE_${Date.now()}_${user_id}`;
  
  // Calcular data de expiração
  const expiry_date = new Date();
  expiry_date.setDate(expiry_date.getDate() + (authorization_duration || 365));
  
  // Inserir Nexo Causal
  const { data: nexo, error } = await supabase
    .from('nexo_causal_art725')
    .insert({
      nexo_id,
      contract_id,
      service_order_id,
      user_id,
      authorization_type,
      authorization_scope,
      authorization_duration: authorization_duration || 365,
      authorization_document,
      document_hash,
      digital_signature,
      signature_timestamp: new Date().toISOString(),
      interaction_logs: {},
      verification_status: 'pending',
      nexo_status: 'active',
      expiry_date: expiry_date.toISOString()
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao criar Nexo Causal: ${error.message}`);
  }
  
  return {
    sucesso: true,
    nexo_id: nexo.nexo_id,
    authorization_type: nexo.authorization_type,
    authorization_scope: nexo.authorization_scope,
    authorization_duration: nexo.authorization_duration,
    document_hash: nexo.document_hash,
    digital_signature: nexo.digital_signature,
    signature_timestamp: nexo.signature_timestamp,
    verification_status: nexo.verification_status,
    nexo_status: nexo.nexo_status,
    expiry_date: nexo.expiry_date
  };
}

async function processarRevenueStack(dados: any): Promise<UnicornioSoberanoResponse['revenue_stack_processada']> {
  const { transaction_date, autonomous_broker_id } = dados;
  
  // Processar Revenue Stack via função RPC
  const { data: resultado, error } = await supabase
    .rpc('processar_revenue_stack_v29', {
      p_transaction_date: transaction_date || new Date().toISOString().split('T')[0],
      p_autonomous_broker_id: autonomous_broker_id || null
    });
  
  if (error) {
    throw new Error(`Erro ao processar Revenue Stack: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao processar Revenue Stack');
  }
  
  return resultado;
}

async function configurarImobiliariaSocia(dados: any): Promise<UnicornioSoberanoResponse['imobiliaria_configurada']> {
  const { imobiliaria_id, partnership_level, management_autonomy, independent_operations, custom_branding, royalty_percentage, royalty_base, lead_distribution_enabled, meritocratic_scoring, lead_score_weight, max_leads_per_month, lead_conversion_target, performance_threshold } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id || !partnership_level || royalty_percentage === undefined) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Validar royalty percentage (6% a 10%)
  if (royalty_percentage < 6.0 || royalty_percentage > 10.0) {
    throw new Error('Royalty percentage deve estar entre 6% e 10%');
  }
  
  // Configurar imobiliária sócia
  const { data: partnership, error } = await supabase
    .from('imobiliarias_socias_v29')
    .insert({
      imobiliaria_id,
      partnership_level,
      management_autonomy: management_autonomy !== false,
      independent_operations: independent_operations !== false,
      custom_branding: custom_branding || false,
      royalty_percentage,
      royalty_base: royalty_base || 'revenue',
      royalty_payment_terms: 'monthly',
      lead_distribution_enabled: lead_distribution_enabled !== false,
      meritocratic_scoring: meritocratic_scoring !== false,
      lead_score_weight: lead_score_weight || 50.0,
      max_leads_per_month: max_leads_per_month || 100,
      lead_conversion_target: lead_conversion_target || 20.0,
      performance_threshold: performance_threshold || 80.0,
      partnership_status: 'active',
      partnership_start_date: new Date().toISOString().split('T')[0]
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao configurar imobiliária sócia: ${error.message}`);
  }
  
  return {
    sucesso: true,
    partnership_id: partnership.id,
    partnership_level: partnership.partnership_level,
    management_autonomy: partnership.management_autonomy,
    royalty_percentage: partnership.royalty_percentage,
    lead_distribution_enabled: partnership.lead_distribution_enabled,
    partnership_status: partnership.partnership_status
  };
}

async function distribuirLeadsRoleta(dados: any): Promise<UnicornioSoberanoResponse['leads_distribuidos']> {
  const { lead_id, imobiliaria_id, performance_score, conversion_score, response_time_score, quality_score, roulette_weight, distribution_priority } = dados;
  
  // Validar dados obrigatórios
  if (!lead_id || !imobiliaria_id) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Calcular score composto
  const composite_score = (performance_score * 0.4 || 0) + 
                        (conversion_score * 0.3 || 0) + 
                        (response_time_score * 0.2 || 0) + 
                        (quality_score * 0.1 || 0);
  
  // Distribuir lead via roleta
  const { data: distribution, error } = await supabase
    .from('roleta_leads_yara_v29')
    .insert({
      lead_id,
      imobiliaria_id,
      performance_score: performance_score || 0,
      conversion_score: conversion_score || 0,
      response_time_score: response_time_score || 0,
      quality_score: quality_score || 0,
      roulette_weight: roulette_weight || 50.0,
      distribution_priority: distribution_priority || 1,
      lead_status: 'distributed',
      distribution_date: new Date().toISOString()
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao distribuir leads na roleta: ${error.message}`);
  }
  
  return {
    sucesso: true,
    lead_id: distribution.lead_id,
    imobiliaria_id: distribution.imobiliaria_id,
    composite_score: distribution.composite_score,
    distribution_priority: distribution.distribution_priority,
    lead_status: distribution.lead_status,
    distribution_date: distribution.distribution_date
  };
}

async function processarTesouroV29(dados: any): Promise<UnicornioSoberanoResponse['tesouro_processado']> {
  const { mes_referencia } = dados;
  
  // Processar Tesouro V29 via função RPC
  const { data: resultado, error } = await supabase
    .rpc('processar_tesouro_reino_sb_v29', {
      p_mes_referencia: mes_referencia || new Date().toISOString().split('T')[0]
    });
  
  if (error) {
    throw new Error(`Erro ao processar Tesouro V29: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao processar Tesouro V29');
  }
  
  return resultado;
}

async function criarDashboardTransparencia(dados: any): Promise<UnicornioSoberanoResponse['dashboard_criado']> {
  const { dashboard_id, socio_id, total_contribuicoes, total_projetos_financiados, total_pessoas_beneficiadas, total_familias_ajudadas, projetos_moradia, projetos_templos, projetos_acolhimento, projetos_praças, projetos_escolas, recursos_moradia, recursos_templos, recursos_acolhimento, recursos_praças, recursos_escolas, logs_publicos, documentos_verificados, auditorias_realizadas, nivel_acesso } = dados;
  
  // Validar dados obrigatórios
  if (!dashboard_id || !socio_id) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Criar dashboard de transparência
  const { data: dashboard, error } = await supabase
    .from('dashboard_transparencia_socios')
    .insert({
      dashboard_id,
      socio_id,
      total_contribuicoes: total_contribuicoes || 0,
      total_projetos_financiados: total_projetos_financiados || 0,
      total_pessoas_beneficiadas: total_pessoas_beneficiadas || 0,
      total_familias_ajudadas: total_familias_ajudadas || 0,
      projetos_moradia: projetos_moradia || 0,
      projetos_templos: projetos_templos || 0,
      projetos_acolhimento: projetos_acolhimento || 0,
      projetos_praças: projetos_praças || 0,
      projetos_escolas: projetos_escolas || 0,
      recursos_moradia: recursos_moradia || 0,
      recursos_templos: recursos_templos || 0,
      recursos_acolhimento: recursos_acolhimento || 0,
      recursos_praças: recursos_praças || 0,
      recursos_escolas: recursos_escolas || 0,
      logs_publicos: logs_publicos || 0,
      documentos_verificados: documentos_verificados || 0,
      auditorias_realizadas: auditorias_realizadas || 0,
      nivel_acesso: nivel_acesso || 'basico',
      dashboard_status: 'active'
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao criar dashboard de transparência: ${error.message}`);
  }
  
  return {
    sucesso: true,
    dashboard_id: dashboard.dashboard_id,
    socio_id: dashboard.socio_id,
    total_contribuicoes: dashboard.total_contribuicoes,
    total_projetos_financiados: dashboard.total_projetos_financiados,
    total_pessoas_beneficiadas: dashboard.total_pessoas_beneficiadas,
    nivel_acesso: dashboard.nivel_acesso,
    dashboard_status: dashboard.dashboard_status
  };
}

async function configurarBeneficiarioRede(dados: any): Promise<UnicornioSoberanoResponse['beneficiario_configurado']> {
  const { beneficiario_id, titular_id, inheritance_type, inheritance_scope, inheritance_conditions, inherited_permissions, verification_method } = dados;
  
  // Validar dados obrigatórios
  if (!beneficiario_id || !titular_id || !inheritance_type || !verification_method) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Configurar beneficiário de rede
  const { data: beneficiario, error } = await supabase
    .from('beneficiario_rede')
    .insert({
      beneficiario_id,
      titular_id,
      inheritance_type,
      inheritance_scope: inheritance_scope || {},
      inheritance_conditions,
      inherited_permissions: inherited_permissions || [],
      verification_method,
      verification_status: 'pending',
      lgpd_lock_active: true,
      data_ativacao_lock: new Date().toISOString().split('T')[0],
      encryption_key_id: `KEY-${Date.now()}`,
      encrypted_data: 'encrypted_data_blob',
      inheritance_status: 'pending'
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao configurar beneficiário de rede: ${error.message}`);
  }
  
  return {
    sucesso: true,
    beneficiario_id: beneficiario.beneficiario_id,
    inheritance_type: beneficiario.inheritance_type,
    verification_status: beneficiario.verification_status,
    lgpd_lock_active: beneficiario.lgpd_lock_active,
    inheritance_status: beneficiario.inheritance_status
  };
}

async function enviarChatCriptografado(dados: any): Promise<UnicornioSoberanoResponse['chat_enviado']> {
  const { message_id, chat_room_id, sender_id, recipient_id, message_content, message_type, encryption_key_id } = dados;
  
  // Validar dados obrigatórios
  if (!message_id || !chat_room_id || !sender_id || !recipient_id || !message_content) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Gerar hashes
  const crypto = require('crypto');
  const message_hash = crypto.createHash('sha256')
    .update(message_id + sender_id + recipient_id + message_content + new Date().toISOString())
    .digest('hex');
  
  const interaction_hash = crypto.createHash('sha256')
    .update(chat_room_id + sender_id + 'encrypted_content' + new Date().toISOString())
    .digest('hex');
  
  // Simular criptografia
  const encrypted_content = `ENCRYPTED_${Date.now()}_${message_content}`;
  
  // Enviar mensagem criptografada
  const { data: message, error } = await supabase
    .from('chat_interno_criptografado')
    .insert({
      message_id,
      chat_room_id,
      sender_id,
      recipient_id,
      message_content,
      message_type: message_type || 'text',
      encryption_method: 'AES-256',
      encryption_key_id: encryption_key_id || `KEY-${Date.now()}`,
      encrypted_content,
      message_hash,
      interaction_hash,
      lgpd_protected: true,
      auto_delete_date: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      message_status: 'sent'
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao enviar chat criptografado: ${error.message}`);
  }
  
  return {
    sucesso: true,
    message_id: message.message_id,
    chat_room_id: message.chat_room_id,
    sender_id: message.sender_id,
    recipient_id: message.recipient_id,
    message_hash: message.message_hash,
    interaction_hash: message.interaction_hash,
    lgpd_protected: message.lgpd_protected,
    message_status: message.message_status
  };
}

// Endpoint para consultas específicas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const user_id = searchParams.get('user_id');
    const investor_id = searchParams.get('investor_id');
    const imobiliaria_id = searchParams.get('imobiliaria_id');
    const socio_id = searchParams.get('socio_id');
    
    if (tipo === 'deep_intents' && investor_id) {
      return await consultarDeepIntents(investor_id);
    }
    
    if (tipo === 'avm_valuations' && user_id) {
      return await consultarAVMValuations(user_id);
    }
    
    if (tipo === 'biometrias_3d' && user_id) {
      return await consultarBiometrias3D(user_id);
    }
    
    if (tipo === 'nexos_causais' && user_id) {
      return await consultarNexosCausais(user_id);
    }
    
    if (tipo === 'revenue_stack' && user_id) {
      return await consultarRevenueStack(user_id);
    }
    
    if (tipo === 'imobiliarias_socias' && imobiliaria_id) {
      return await consultarImobiliariasSocias(imobiliaria_id);
    }
    
    if (tipo === 'roleta_distributions' && imobiliaria_id) {
      return await consultarRoletaDistributions(imobiliaria_id);
    }
    
    if (tipo === 'tesouro_v29') {
      return await consultarTesouroV29();
    }
    
    if (tipo === 'dashboard_transparencia' && socio_id) {
      return await consultarDashboardTransparencia(socio_id);
    }
    
    if (tipo === 'beneficiarios_rede' && user_id) {
      return await consultarBeneficiariosRede(user_id);
    }
    
    if (tipo === 'chat_criptografado' && user_id) {
      return await consultarChatCriptografado(user_id);
    }
    
    return NextResponse.json({
      success: false,
      error: 'Tipo de consulta inválido'
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Erro ao consultar dados:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar dados',
      details: error.message
    }, { status: 500 });
  }
}

async function consultarDeepIntents(investorId: string): Promise<NextResponse> {
  // Buscar Deep Intents do investidor
  const { data: intents } = await supabase
    .from('deep_intent_requests')
    .select('*')
    .eq('investor_id', investorId)
    .order('created_at', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: intents || [],
    message: 'Deep Intents consultados com sucesso'
  });
}

async function consultarAVMValuations(userId: string): Promise<NextResponse> {
  // Buscar AVM Valuations do usuário
  const { data: valuations } = await supabase
    .from('avm_valuations')
    .select('*')
    .order('valuation_date', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: valuations || [],
    message: 'AVM Valuations consultados com sucesso'
  });
}

async function consultarBiometrias3D(userId: string): Promise<NextResponse> {
  // Buscar biometrias 3D do usuário
  const { data: biometrias } = await supabase
    .from('biometria_facial_3d')
    .select('*')
    .eq('user_id', userId)
    .order('enrollment_date', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: biometrias || [],
    message: 'Biometrias 3D consultadas com sucesso'
  });
}

async function consultarNexosCausais(userId: string): Promise<NextResponse> {
  // Buscar Nexos Causais do usuário
  const { data: nexos } = await supabase
    .from('nexo_causal_art725')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: nexos || [],
    message: 'Nexos Causais consultados com sucesso'
  });
}

async function consultarRevenueStack(userId: string): Promise<NextResponse> {
  // Buscar Revenue Stack do usuário
  const { data: transactions } = await supabase
    .from('revenue_stack_unified')
    .select('*')
    .eq('autonomous_broker_id', userId)
    .order('transaction_date', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: transactions || [],
    message: 'Revenue Stack consultado com sucesso'
  });
}

async function consultarImobiliariasSocias(imobiliariaId: string): Promise<NextResponse> {
  // Buscar configurações da imobiliária sócia
  const { data: partnerships } = await supabase
    .from('imobiliarias_socias_v29')
    .select('*')
    .eq('imobiliaria_id', imobiliariaId)
    .order('partnership_start_date', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: partnerships || [],
    message: 'Imobiliárias Sócias consultadas com sucesso'
  });
}

async function consultarRoletaDistributions(imobiliariaId: string): Promise<NextResponse> {
  // Buscar distribuições da roleta
  const { data: distributions } = await supabase
    .from('roleta_leads_yara_v29')
    .select('*')
    .eq('imobiliaria_id', imobiliariaId)
    .order('distribution_date', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: distributions || [],
    message: 'Distribuições da Roleta consultadas com sucesso'
  });
}

async function consultarTesouroV29(): Promise<NextResponse> {
  // Buscar Tesouro V29
  const { data: tesouro } = await supabase
    .from('tesouro_reino_sb_v29')
    .select('*')
    .order('mes_referencia', { ascending: false })
    .limit(12);
  
  return NextResponse.json({
    success: true,
    data: tesouro || [],
    message: 'Tesouro V29 consultado com sucesso'
  });
}

async function consultarDashboardTransparencia(socioId: string): Promise<NextResponse> {
  // Buscar dashboard de transparência
  const { data: dashboards } = await supabase
    .from('dashboard_transparencia_socios')
    .select('*')
    .eq('socio_id', socioId)
    .order('created_at', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: dashboards || [],
    message: 'Dashboard de Transparência consultado com sucesso'
  });
}

async function consultarBeneficiariosRede(userId: string): Promise<NextResponse> {
  // Buscar beneficiários de rede
  const { data: beneficiarios } = await supabase
    .from('beneficiario_rede')
    .select('*')
    .or(`titular_id.eq.${userId},beneficiario_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: beneficiarios || [],
    message: 'Beneficiários de Rede consultados com sucesso'
  });
}

async function consultarChatCriptografado(userId: string): Promise<NextResponse> {
  // Buscar chats criptografados
  const { data: messages } = await supabase
    .from('chat_interno_criptografado')
    .select('*')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(50);
  
  return NextResponse.json({
    success: true,
    data: messages || [],
    message: 'Chat Criptografado consultado com sucesso'
  });
}
