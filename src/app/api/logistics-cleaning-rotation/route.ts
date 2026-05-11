// 🏛️ SECURITY BROKER SB v29.1 - LOGISTICS & CLEANING ROTATION
// API de gestão de manutenção e roleta de prestadores

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

interface LogisticsCleaningRotationRequest {
  acao: 'processar_rotacao_prestadores' | 'criar_os_limpeza' | 'processar_auditoria_danos' | 'enviar_notificacao_automatica' | 'sincronizar_liberacao_imediata' | 'processar_contribuicao_social_v29_1' | 'consultar_prestadores' | 'consultar_os_limpeza' | 'consultar_vistorias' | 'consultar_fluxo_danos' | 'consultar_notificacoes' | 'consultar_sync_imoveis' | 'consultar_tesouro_v29_1';
  dados?: {
    // Dados para criar OS de limpeza
    os_id?: string;
    imovel_id?: string;
    cliente_id?: string;
    tipo_servico?: string;
    descricao_servico?: string;
    data_agendada?: string;
    valor_servico?: number;
    endereco_servico?: string;
    coordinates?: { x: number; y: number };
    
    // Dados para auditoria de danos
    vistoria_id?: string;
    dano_detectado?: boolean;
    tipo_dano?: string;
    gravidade_dano?: string;
    custo_estimado?: number;
    
    // Dados para notificação
    destinatario_id?: string;
    destinatario_tipo?: string;
    destinatario_telefone?: string;
    destinatario_email?: string;
    tipo_notificacao?: string;
    titulo_mensagem?: string;
    corpo_mensagem?: string;
    canal_envio?: string;
    
    // Dados para sincronização
    imovel_id_sync?: string;
    status_novo?: string;
    
    // Consultas
    prestador_id?: string;
    tipo_prestador?: string;
    status_os?: string;
    mes_referencia?: string;
  };
}

interface LogisticsCleaningRotationResponse {
  success: boolean;
  prestadores_cadastrados?: {
    sucesso: boolean;
    total_prestadores: number;
    mensagem: string;
  };
  os_criada?: {
    sucesso: boolean;
    os_id: string;
    status_os: string;
    timer_aceite_minutos: number;
    data_limite_aceite: string;
    mensagem: string;
  };
  auditoria_processada?: {
    sucesso: boolean;
    vistoria_id: string;
    dano_detectado: boolean;
    payment_link_gerado: boolean;
    payment_link_url?: string;
    custo_reparo: number;
    garantia_bloqueada: boolean;
    mensagem: string;
  };
  notificacao_enviada?: {
    sucesso: boolean;
    notificacao_id: string;
    canal_envio: string;
    destinatario_tipo: string;
    tipo_notificacao: string;
    mensagem: string;
  };
  sincronizacao_realizada?: {
    sucesso: boolean;
    sync_id: string;
    imovel_id: string;
    status_novo: string;
    sincronizado: boolean;
    mensagem: string;
  };
  contribuicao_processada?: {
    sucesso: boolean;
    tesouro_id: string;
    mes_referencia: string;
    faturamento_bruto_total: number;
    faturamento_prestadores: number;
    valor_contribuicao: number;
    destinacao_capacitacao_prestadores: number;
    mensagem: string;
  };
  rotacao_processada?: {
    sucesso: boolean;
    total_os_reatribuidas: number;
    mensagem: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: LogisticsCleaningRotationRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🏛️ Logistics & Cleaning Rotation: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'processar_rotacao_prestadores':
        resultado = await processarRotacaoPrestadores();
        break;
      case 'criar_os_limpeza':
        resultado = await criarOSLimpeza(dados);
        break;
      case 'processar_auditoria_danos':
        resultado = await processarAuditoriaDanos(dados);
        break;
      case 'enviar_notificacao_automatica':
        resultado = await enviarNotificacaoAutomatica(dados);
        break;
      case 'sincronizar_liberacao_imediata':
        resultado = await sincronizarLiberacaoImediata(dados);
        break;
      case 'processar_contribuicao_social_v29_1':
        resultado = await processarContribuicaoSocialV29_1(dados);
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
    console.error('Erro no Logistics & Cleaning Rotation:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Logistics & Cleaning Rotation',
      details: error.message
    }, { status: 500 });
  }
}

async function processarRotacaoPrestadores(): Promise<LogisticsCleaningRotationResponse['rotacao_processada']> {
  // Processar rotação automática via função RPC
  const { data: resultado, error } = await supabase
    .rpc('processar_rotacao_prestadores');
  
  if (error) {
    throw new Error(`Erro ao processar rotação de prestadores: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao processar rotação');
  }
  
  return resultado;
}

async function criarOSLimpeza(dados: any): Promise<LogisticsCleaningRotationResponse['os_criada']> {
  const { 
    os_id, imovel_id, cliente_id, tipo_servico, descricao_servico, 
    data_agendada, valor_servico, endereco_servico, coordinates 
  } = dados;
  
  // Validar dados obrigatórios
  if (!os_id || !imovel_id || !cliente_id || !tipo_servico) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Buscar prestador disponível com melhor ranking
  const { data: prestador, error: errorPrestador } = await supabase
    .from('prestadores_servico')
    .select('*')
    .eq('tipo_prestador', tipo_servico)
    .eq('status_prestador', 'ativo')
    .gte('score_prestador', 90)
    .order('ranking_escala', { ascending: true })
    .order('tempo_medio_execucao', { ascending: true })
    .limit(1)
    .single();
  
  if (errorPrestador || !prestador) {
    throw new Error('Prestador disponível não encontrado');
  }
  
  // Inserir OS de limpeza
  const timer_aceite_minutos = 30; // Configurável
  const data_limite_aceite = new Date();
  data_limite_aceite.setMinutes(data_limite_aceite.getMinutes() + timer_aceite_minutos);
  
  const { data: os, error: errorOS } = await supabase
    .from('ordens_servicos_limpeza')
    .insert({
      os_id,
      imovel_id,
      cliente_id,
      prestador_id: prestador.id,
      tipo_servico,
      descricao_servico,
      data_agendada: data_agendada ? new Date(data_agendada).toISOString() : null,
      status_os: 'AGUARDANDO_PRESTADOR',
      timer_aceite_minutos,
      data_limite_aceite: data_limite_aceite.toISOString(),
      prioridade: 1,
      ranking_escala: prestador.ranking_escala,
      valor_servico,
      forma_pagamento: 'pix',
      endereco_servico,
      coordinates_servico: coordinates ? `POINT(${coordinates.x}, ${coordinates.y})` : null
    })
    .select('*')
    .single();
  
  if (errorOS) {
    throw new Error(`Erro ao criar OS de limpeza: ${errorOS.message}`);
  }
  
  // Enviar notificação automática para o prestador
  await enviarNotificacaoAutomatica({
    destinatario_id: prestador.id,
    destinatario_tipo: 'prestador',
    destinatario_telefone: prestador.whatsapp,
    tipo_notificacao: 'checkout',
    titulo_mensagem: '🧹 Nova oportunidade de serviço!',
    corpo_mensagem: `Nova OS de limpeza disponível: ${os_id}. Aceite em até ${data_limite_aceite.toLocaleString('pt-BR')}`,
    canal_envio: 'whatsapp'
  });
  
  return {
    sucesso: true,
    os_id: os.os_id,
    status_os: os.status_os,
    timer_aceite_minutos: os.timer_aceite_minutos,
    data_limite_aceite: os.data_limite_aceite,
    mensagem: 'OS de limpeza criada com sucesso'
  };
}

async function processarAuditoriaDanos(dados: any): Promise<LogisticsCleaningRotationResponse['auditoria_processada']> {
  const { 
    vistoria_id, dano_detectado, tipo_dano, gravidade_dano, custo_estimado 
  } = dados;
  
  // Validar dados obrigatórios
  if (!vistoria_id) {
    throw new Error('ID da vistoria é obrigatório');
  }
  
  // Processar auditoria via função RPC
  const { data: resultado, error } = await supabase
    .rpc('processar_auditoria_danos', {
      p_vistoria_id: vistoria_id,
      p_dano_detectado: dano_detectado || false,
      p_tipo_dano: tipo_dano || null,
      p_gravidade_dano: gravidade_dano || null,
      p_custo_estimado: custo_estimado || 0
    });
  
  if (error) {
    throw new Error(`Erro ao processar auditoria de danos: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao processar auditoria');
  }
  
  return resultado;
}

async function enviarNotificacaoAutomatica(dados: any): Promise<LogisticsCleaningRotationResponse['notificacao_enviada']> {
  const { 
    destinatario_id, destinatario_tipo, destinatario_telefone, 
    tipo_notificacao, titulo_mensagem, corpo_mensagem, canal_envio 
  } = dados;
  
  // Validar dados obrigatórios
  if (!destinatario_id || !tipo_notificacao || !canal_envio) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Enviar notificação via função RPC
  const { data: resultado, error } = await supabase
    .rpc('enviar_notificacao_automatica', {
      p_destinatario_id: destinatario_id,
      p_destinatario_tipo: destinatario_tipo || 'prestador',
      p_destinatario_telefone: destinatario_telefone || null,
      p_tipo_notificacao: tipo_notificacao,
      p_titulo_mensagem: titulo_mensagem,
      p_corpo_mensagem: corpo_mensagem,
      p_canal_envio: canal_envio
    });
  
  if (error) {
    throw new Error(`Erro ao enviar notificação automática: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao enviar notificação');
  }
  
  return resultado;
}

async function sincronizarLiberacaoImediata(dados: any): Promise<LogisticsCleaningRotationResponse['sincronizacao_realizada']> {
  const { imovel_id_sync, status_novo } = dados;
  
  // Validar dados obrigatórios
  if (!imovel_id_sync || !status_novo) {
    throw new Error('ID do imóvel e status novo são obrigatórios');
  }
  
  // Sincronizar via função RPC
  const { data: resultado, error } = await supabase
    .rpc('sincronizar_liberacao_imediata', {
      p_imovel_id: imovel_id_sync,
      p_status_novo: status_novo
    });
  
  if (error) {
    throw new Error(`Erro ao sincronizar liberação imediata: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao sincronizar');
  }
  
  return resultado;
}

async function processarContribuicaoSocialV29_1(dados: any): Promise<LogisticsCleaningRotationResponse['contribuicao_processada']> {
  const { mes_referencia } = dados;
  
  // Processar contribuição social V29.1 via função RPC
  const { data: resultado, error } = await supabase
    .rpc('processar_contribuicao_social_v29_1', {
      p_mes_referencia: mes_referencia || new Date().toISOString().split('T')[0]
    });
  
  if (error) {
    throw new Error(`Erro ao processar contribuição social V29.1: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao processar contribuição');
  }
  
  return resultado;
}

// Endpoint para consultas específicas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const prestador_id = searchParams.get('prestador_id');
    const tipo_prestador = searchParams.get('tipo_prestador');
    const status_os = searchParams.get('status_os');
    const mes_referencia = searchParams.get('mes_referencia');
    
    if (tipo === 'prestadores') {
      return await consultarPrestadores(tipo_prestador || undefined);
    }
    
    if (tipo === 'os_limpeza' && prestador_id) {
      return await consultarOSLimpeza(prestador_id, status_os || undefined);
    }
    
    if (tipo === 'vistorias' && prestador_id) {
      return await consultarVistorias(prestador_id);
    }
    
    if (tipo === 'fluxo_danos') {
      return await consultarFluxoDanos();
    }
    
    if (tipo === 'notificacoes') {
      return await consultarNotificacoes();
    }
    
    if (tipo === 'sync_imoveis') {
      return await consultarSyncImoveis();
    }
    
    if (tipo === 'tesouro_v29_1') {
      return await consultarTesouroV29_1(mes_referencia || undefined);
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

async function consultarPrestadores(tipoPrestador?: string): Promise<NextResponse> {
  let query = supabase.from('prestadores_servico').select('*');
  
  if (tipoPrestador) {
    query = query.eq('tipo_prestador', tipoPrestador);
  }
  
  const { data: prestadores, error } = await query.order('score_prestador', { ascending: false });
  
  if (error) {
    throw new Error(`Erro ao consultar prestadores: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: prestadores || [],
    message: 'Prestadores consultados com sucesso'
  });
}

async function consultarOSLimpeza(prestadorId: string, statusOs?: string): Promise<NextResponse> {
  let query = supabase.from('ordens_servicos_limpeza').select('*');
  
  if (prestadorId) {
    query = query.eq('prestador_id', prestadorId);
  }
  
  if (statusOs) {
    query = query.eq('status_os', statusOs);
  }
  
  const { data: os, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Erro ao consultar OS de limpeza: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: os || [],
    message: 'OS de limpeza consultadas com sucesso'
  });
}

async function consultarVistorias(prestadorId: string): Promise<NextResponse> {
  const { data: vistorias, error } = await supabase
    .from('vistorias_saida')
    .select('*')
    .eq('prestador_id', prestadorId)
    .order('data_vistoria', { ascending: false });
  
  if (error) {
    throw new Error(`Erro ao consultar vistorias: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: vistorias || [],
    message: 'Vistorias consultadas com sucesso'
  });
}

async function consultarFluxoDanos(): Promise<NextResponse> {
  const { data: fluxo, error } = await supabase
    .from('fluxo_financeiro_danos')
    .select('*')
    .order('data_dano_detectado', { ascending: false })
    .limit(100);
  
  if (error) {
    throw new Error(`Erro ao consultar fluxo de danos: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: fluxo || [],
    message: 'Fluxo de danos consultado com sucesso'
  });
}

async function consultarNotificacoes(): Promise<NextResponse> {
  const { data: notificacoes, error } = await supabase
    .from('logs_notificacao')
    .select('*')
    .order('data_criacao', { ascending: false })
    .limit(50);
  
  if (error) {
    throw new Error(`Erro ao consultar notificações: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: notificacoes || [],
    message: 'Notificações consultadas com sucesso'
  });
}

async function consultarSyncImoveis(): Promise<NextResponse> {
  const { data: sync, error } = await supabase
    .from('sync_imoveis_marketplace')
    .select('*')
    .order('data_mudanca_status', { ascending: false })
    .limit(100);
  
  if (error) {
    throw new Error(`Erro ao consultar sincronizações: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: sync || [],
    message: 'Sincronizações consultadas com sucesso'
  });
}

async function consultarTesouroV29_1(mesReferencia?: string): Promise<NextResponse> {
  let query = supabase.from('tesouro_reino_sb_v29_1').select('*');
  
  if (mesReferencia) {
    query = query.eq('mes_referencia', mesReferencia);
  }
  
  const { data: tesouro, error } = await query.order('mes_referencia', { ascending: false }).limit(12);
  
  if (error) {
    throw new Error(`Erro ao consultar tesouro V29.1: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: tesouro || [],
    message: 'Tesouro V29.1 consultado com sucesso'
  });
}
