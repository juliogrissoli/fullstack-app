// 💰 SECURITY BROKER SB v29.2 - SERVICE REVENUE & SPLIT
// API de monetização sobre prestação de serviços

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ServiceRevenueSplitRequest {
  acao: 'processar_split_servico' | 'processar_conclusao_servico' | 'calcular_taxa_conveniencia' | 'calcular_take_rate_score' | 'processar_contribuicao_social_reino_jesus_cristo' | 'consultar_configuracoes_split' | 'consultar_fluxos_servico' | 'consultar_wallets_sb' | 'consultar_movimentacoes_wallet' | 'consultar_taxas_conveniencia' | 'consultar_metricas_fotograficas' | 'consultar_ranking_fotografico' | 'consultar_tesouro_reino_jesus_cristo';
  dados?: {
    // Dados para split de serviço
    os_id?: string;
    prestador_id?: string;
    valor_total_servico?: number;
    forma_pagamento_cliente?: string;
    forma_pagamento_prestador?: string;
    
    // Dados para conclusão
    status_conclusao?: string;
    
    // Dados para taxa de conveniência
    reserva_id?: string;
    tipo_imovel?: string;
    valor_diaria?: number;
    dias_estadia?: number;
    data_checkin?: string;
    
    // Dados para take rate
    prestador_id_score?: string;
    tipo_servico_score?: string;
    valor_servico_score?: number;
    
    // Dados para contribuição social
    mes_referencia?: string;
  };
}

interface ServiceRevenueSplitResponse {
  success: boolean;
  split_processado?: {
    sucesso: boolean;
    transacao_id: string;
    take_rate_aplicada: number;
    valor_total_servico: number;
    valor_retido_plataforma: number;
    valor_liquido_prestador: number;
    wallet_id: string;
    fluxo_id: string;
    mensagem: string;
  };
  conclusao_processada?: {
    sucesso: boolean;
    fluxo_id: string;
    valor_final_prestador: number;
    valor_final_plataforma: number;
    wallet_id: string;
    saldo_disponivel_wallet: number;
    mensagem: string;
  };
  taxa_calculada?: {
    sucesso: boolean;
    taxa_id: string;
    taxa_aplicada: number;
    valor_base_calculo: number;
    valor_taxa_conveniencia: number;
    valor_total_com_taxa: number;
    valor_total_sem_taxa: number;
    mensagem: string;
  };
  take_rate_calculado?: {
    sucesso: boolean;
    take_rate: number;
    score_prestador: number;
    reducao_aplicada: number;
    mensagem: string;
  };
  contribuicao_processada?: {
    sucesso: boolean;
    tesouro_id: string;
    mes_referencia: string;
    faturamento_bruto_total: number;
    faturamento_prestadores: number;
    faturamento_taxa_conveniencia: number;
    valor_contribuicao: number;
    destinacao_capacitacao_prestadores: number;
    destinacao_igrejas_locais: number;
    destinacao_obra_missionaria: number;
    destinacao_ajuda_desamparados: number;
    destinacao_evangelizacao: number;
    destinacao_acao_social: number;
    mensagem: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ServiceRevenueSplitRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`💰 Service Revenue & Split: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'processar_split_servico':
        resultado = await processarSplitServico(dados);
        break;
      case 'processar_conclusao_servico':
        resultado = await processarConclusaoServico(dados);
        break;
      case 'calcular_taxa_conveniencia':
        resultado = await calcularTaxaConveniencia(dados);
        break;
      case 'calcular_take_rate_score':
        resultado = await calcularTakeRateScore(dados);
        break;
      case 'processar_contribuicao_social_reino_jesus_cristo':
        resultado = await processarContribuicaoSocialReinoJesusCristo(dados);
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
    console.error('Erro no Service Revenue & Split:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Service Revenue & Split',
      details: error.message
    }, { status: 500 });
  }
}

async function processarSplitServico(dados: any): Promise<ServiceRevenueSplitResponse['split_processado']> {
  const { 
    os_id, prestador_id, valor_total_servico, 
    forma_pagamento_cliente, forma_pagamento_prestador 
  } = dados;
  
  // Validar dados obrigatórios
  if (!os_id || !prestador_id || !valor_total_servico) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Processar split via função RPC
  const { data: resultado, error } = await supabase
    .rpc('processar_split_servico', {
      p_os_id: os_id,
      p_prestador_id: prestador_id,
      p_valor_total_servico: valor_total_servico,
      p_forma_pagamento_cliente: forma_pagamento_cliente || 'pix',
      p_forma_pagamento_prestador: forma_pagamento_prestador || 'pix'
    });
  
  if (error) {
    throw new Error(`Erro ao processar split de serviço: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao processar split');
  }
  
  return resultado;
}

async function processarConclusaoServico(dados: any): Promise<ServiceRevenueSplitResponse['conclusao_processada']> {
  const { os_id, status_conclusao } = dados;
  
  // Validar dados obrigatórios
  if (!os_id) {
    throw new Error('ID da OS é obrigatório');
  }
  
  // Processar conclusão via função RPC
  const { data: resultado, error } = await supabase
    .rpc('processar_conclusao_servico', {
      p_os_id: os_id,
      p_status_conclusao: status_conclusao || 'concluido'
    });
  
  if (error) {
    throw new Error(`Erro ao processar conclusão de serviço: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao processar conclusão');
  }
  
  return resultado;
}

async function calcularTaxaConveniencia(dados: any): Promise<ServiceRevenueSplitResponse['taxa_calculada']> {
  const { 
    reserva_id, tipo_imovel, valor_diaria, 
    dias_estadia, data_checkin 
  } = dados;
  
  // Validar dados obrigatórios
  if (!reserva_id || !tipo_imovel || !valor_diaria || !dias_estadia) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Calcular taxa via função RPC
  const { data: resultado, error } = await supabase
    .rpc('calcular_taxa_conveniencia', {
      p_reserva_id: reserva_id,
      p_tipo_imovel: tipo_imovel,
      p_valor_diaria: valor_diaria,
      p_dias_estadia: dias_estadia,
      p_data_checkin: data_checkin ? new Date(data_checkin).toISOString() : new Date().toISOString()
    });
  
  if (error) {
    throw new Error(`Erro ao calcular taxa de conveniência: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao calcular taxa');
  }
  
  return resultado;
}

async function calcularTakeRateScore(dados: any): Promise<ServiceRevenueSplitResponse['take_rate_calculado']> {
  const { prestador_id_score, tipo_servico_score, valor_servico_score } = dados;
  
  // Validar dados obrigatórios
  if (!prestador_id_score || !tipo_servico_score || !valor_servico_score) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Calcular take rate via função RPC
  const { data: resultado, error } = await supabase
    .rpc('calcular_take_rate_score', {
      p_prestador_id: prestador_id_score,
      p_tipo_servico: tipo_servico_score,
      p_valor_servico: valor_servico_score
    });
  
  if (error) {
    throw new Error(`Erro ao calcular take rate por score: ${error.message}`);
  }
  
  return {
    sucesso: true,
    take_rate: resultado,
    score_prestador: 0, // Buscar do banco se necessário
    reducao_aplicada: 20 - resultado, // Cálculo da redução
    mensagem: 'Take rate calculado com sucesso baseado no score'
  };
}

async function processarContribuicaoSocialReinoJesusCristo(dados: any): Promise<ServiceRevenueSplitResponse['contribuicao_processada']> {
  const { mes_referencia } = dados;
  
  // Processar contribuição social via função RPC
  const { data: resultado, error } = await supabase
    .rpc('processar_contribuicao_social_reino_jesus_cristo', {
      p_mes_referencia: mes_referencia || new Date().toISOString().split('T')[0]
    });
  
  if (error) {
    throw new Error(`Erro ao processar contribuição social: ${error.message}`);
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
    const tipo_servico = searchParams.get('tipo_servico');
    const wallet_id = searchParams.get('wallet_id');
    const mes_referencia = searchParams.get('mes_referencia');
    const periodo_referencia = searchParams.get('periodo_referencia');
    
    if (tipo === 'configuracoes_split') {
      return await consultarConfiguracoesSplit(tipo_servico);
    }
    
    if (tipo === 'fluxos_servico' && prestador_id) {
      return await consultarFluxosServico(prestador_id);
    }
    
    if (tipo === 'wallets_sb') {
      return await consultarWalletsSB();
    }
    
    if (tipo === 'movimentacoes_wallet' && wallet_id) {
      return await consultarMovimentacoesWallet(wallet_id);
    }
    
    if (tipo === 'taxas_conveniencia') {
      return await consultarTaxasConveniencia();
    }
    
    if (tipo === 'metricas_fotograficas' && prestador_id) {
      return await consultarMetricasFotograficas(prestador_id);
    }
    
    if (tipo === 'ranking_fotografico') {
      return await consultarRankingFotografico(periodo_referencia);
    }
    
    if (tipo === 'tesouro_reino_jesus_cristo') {
      return await consultarTesouroReinoJesusCristo(mes_referencia);
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

async function consultarConfiguracoesSplit(tipoServico?: string): Promise<NextResponse> {
  let query = supabase.from('configuracao_split_servico').select('*');
  
  if (tipoServico) {
    query = query.eq('tipo_servico', tipoServico);
  }
  
  const { data: configuracoes, error } = await query.eq('status_config', 'ativo');
  
  if (error) {
    throw new Error(`Erro ao consultar configurações de split: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: configuracoes || [],
    message: 'Configurações de split consultadas com sucesso'
  });
}

async function consultarFluxosServico(prestadorId: string): Promise<NextResponse> {
  const { data: fluxos, error } = await supabase
    .from('fluxo_financeiro_servico')
    .select('*')
    .eq('prestador_id', prestadorId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Erro ao consultar fluxos de serviço: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: fluxos || [],
    message: 'Fluxos de serviço consultados com sucesso'
  });
}

async function consultarWalletsSB(): Promise<NextResponse> {
  const { data: wallets, error } = await supabase
    .from('wallet_sb')
    .select('*')
    .eq('status_wallet', 'ativa')
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Erro ao consultar wallets SB: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: wallets || [],
    message: 'Wallets SB consultadas com sucesso'
  });
}

async function consultarMovimentacoesWallet(walletId: string): Promise<NextResponse> {
  const { data: movimentacoes, error } = await supabase
    .from('movimentacoes_wallet_sb')
    .select('*')
    .eq('wallet_id', walletId)
    .order('data_movimentacao', { ascending: false })
    .limit(50);
  
  if (error) {
    throw new Error(`Erro ao consultar movimentações da wallet: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: movimentacoes || [],
    message: 'Movimentações da wallet consultadas com sucesso'
  });
}

async function consultarTaxasConveniencia(): Promise<NextResponse> {
  const { data: taxas, error } = await supabase
    .from('configuracao_taxa_conveniencia')
    .select('*')
    .eq('status_config', 'ativo')
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Erro ao consultar taxas de conveniência: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: taxas || [],
    message: 'Taxas de conveniência consultadas com sucesso'
  });
}

async function consultarMetricasFotograficas(prestadorId: string): Promise<NextResponse> {
  const { data: metricas, error } = await supabase
    .from('metricas_fotograficas_prestadores')
    .select('*')
    .eq('prestador_id', prestadorId)
    .order('timestamp_foto', { ascending: false })
    .limit(100);
  
  if (error) {
    throw new Error(`Erro ao consultar métricas fotográficas: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: metricas || [],
    message: 'Métricas fotográficas consultadas com sucesso'
  });
}

async function consultarRankingFotografico(periodoReferencia?: string): Promise<NextResponse> {
  let query = supabase.from('ranking_fotografico_prestadores').select('*');
  
  if (periodoReferencia) {
    query = query.eq('periodo_referencia', periodoReferencia);
  }
  
  const { data: rankings, error } = await query
    .eq('status_ranking', 'ativo')
    .order('posicao_ranking', { ascending: true })
    .limit(100);
  
  if (error) {
    throw new Error(`Erro ao consultar ranking fotográfico: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: rankings || [],
    message: 'Ranking fotográfico consultado com sucesso'
  });
}

async function consultarTesouroReinoJesusCristo(mesReferencia?: string): Promise<NextResponse> {
  let query = supabase.from('tesouro_reino_jesus_cristo_v29_2').select('*');
  
  if (mesReferencia) {
    query = query.eq('mes_referencia', mesReferencia);
  }
  
  const { data: tesouro, error } = await query
    .order('mes_referencia', { ascending: false })
    .limit(12);
  
  if (error) {
    throw new Error(`Erro ao consultar tesouro Reino Jesus Cristo: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: tesouro || [],
    message: 'Tesouro Reino Jesus Cristo consultado com sucesso'
  });
}
