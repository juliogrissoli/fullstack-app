// 🏛️ SECURITY BROKER SB v25 - OMNISCIENT INTELIGÊNCIA PREDITIVA
// API de Dashboard de Fluxo Bancário (FinTech Layer)

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

interface FluxoBancarioRequest {
  acao: 'consultar_dashboard' | 'consolidar_fluxo' | 'consultar_transacoes' | 'gerar_relatorio' | 'consultar_lucro_originador';
  dados?: {
    imobiliaria_id?: string;
    data_inicio?: string;
    data_fim?: string;
    tipo_relatorio?: string;
    broker_id?: string;
    mes_referencia?: string;
  };
}

interface FluxoBancarioResponse {
  success: boolean;
  dashboard_consultado?: {
    imobiliaria_id: string;
    imobiliaria_nome: string;
    imobiliaria_cnpj: string;
    total_financiamentos: number;
    total_parcelas: number;
    total_rebates: number;
    total_comissoes_recebidas: number;
    comissoes_pendentes: number;
    comissoes_atrasadas: number;
    total_imobiliaria: number;
    total_corretores: number;
    total_sb_tecnologia: number;
    total_rebates_gerados: number;
    total_rebates_distribuidos: number;
    rebates_pendentes: number;
    total_creditos_concedidos: number;
    total_parcelas_recebidas: number;
    total_parcelas_pendentes: number;
    total_juros_recebidos: number;
    lucro_bruto: number;
    custos_operacionais: number;
    lucro_liquido: number;
    margem_lucro: number;
    status_financeiro: string;
    taxa_conversao_financiamento: number;
    prazo_medio_financiamento: number;
    ticket_medio: number;
  };
  fluxo_consolidado?: {
    data_consolidacao: string;
    mes_referencia: string;
    total_comissoes_recebidas: number;
    total_imobiliaria: number;
    total_corretores: number;
    total_sb_tecnologia: number;
    total_rebates_gerados: number;
    total_rebates_distribuidos: number;
    total_creditos_concedidos: number;
    total_parcelas_recebidas: number;
    total_parcelas_pendentes: number;
    total_juros_recebidos: number;
    lucro_bruto: number;
    custos_operacionais: number;
    lucro_liquido: number;
    margem_lucro: number;
    status_consolidacao: string;
  };
  transacoes_consultadas?: {
    periodo_consulta: string;
    total_transacoes: number;
    valor_total_transacoes: number;
    detalhes_transacoes: Array<{
      id: string;
      data_transacao: string;
      tipo_transacao: string;
      valor_transacao: number;
      valor_liquido: number;
      taxa_transacao: number;
      origem_id: string;
      origem_tipo: string;
      imobiliaria_id: string;
      broker_id: string;
      status_transacao: string;
      data_conclusao: string;
    }>;
  };
  relatorio_gerado?: {
    tipo_relatorio: string;
    periodo: string;
    data_geracao: string;
    resumo_executivo: {
      total_receitas: number;
      total_despesas: number;
      lucro_liquido: number;
      margem_lucro: number;
      total_operacoes: number;
    };
    detalhes_operacoes: Array<{
      categoria: string;
      total_operacoes: number;
      valor_total: number;
      percentual_total: number;
    }>;
    recomendacoes: string[];
  };
  lucro_originador?: {
    broker_id: string;
    broker_nome: string;
    periodo_analise: string;
    total_financiamentos_originados: number;
    valor_total_originado: number;
    comissoes_recebidas: number;
    rebates_recebidos: number;
    juros_recebidos: number;
    lucro_bruto: number;
    custos_diretos: number;
    lucro_liquido: number;
    margem_lucro: number;
    ranking_performance: number;
    metricas_desempenho: {
      taxa_conversao: number;
      ticket_medio: number;
      prazo_medio: number;
      satisfacao_cliente: number;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: FluxoBancarioRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`💰 Fluxo Bancário: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'consultar_dashboard':
        resultado = await consultarDashboard(dados);
        break;
      case 'consolidar_fluxo':
        resultado = await consolidarFluxo(dados);
        break;
      case 'consultar_transacoes':
        resultado = await consultarTransacoes(dados);
        break;
      case 'gerar_relatorio':
        resultado = await gerarRelatorio(dados);
        break;
      case 'consultar_lucro_originador':
        resultado = await consultarLucroOriginador(dados);
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
    console.error('Erro no Fluxo Bancário:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Fluxo Bancário',
      details: error.message
    }, { status: 500 });
  }
}

async function consultarDashboard(dados: any): Promise<FluxoBancarioResponse['dashboard_consultado']> {
  const { imobiliaria_id } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id) {
    throw new Error('ID da imobiliária não fornecido');
  }
  
  // Buscar dashboard do fluxo bancário
  const { data: dashboard, error } = await supabase
    .from('dashboard_fluxo_bancario')
    .select('*')
    .eq('imobiliaria_id', imobiliaria_id)
    .order('data_consolidacao', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !dashboard) {
    throw new Error('Dashboard não encontrado');
  }
  
  return {
    imobiliaria_id: dashboard.imobiliaria_id,
    imobiliaria_nome: dashboard.imobiliaria_nome,
    imobiliaria_cnpj: dashboard.imobiliaria_cnpj,
    total_financiamentos: dashboard.total_financiamentos || 0,
    total_parcelas: dashboard.total_parcelas || 0,
    total_rebates: dashboard.total_rebates || 0,
    total_comissoes_recebidas: dashboard.total_comissoes_recebidas || 0,
    comissoes_pendentes: dashboard.comissoes_pendentes || 0,
    comissoes_atrasadas: dashboard.comissoes_atrasadas || 0,
    total_imobiliaria: dashboard.total_imobiliaria || 0,
    total_corretores: dashboard.total_corretores || 0,
    total_sb_tecnologia: dashboard.total_sb_tecnologia || 0,
    total_rebates_gerados: dashboard.total_rebates_gerados || 0,
    total_rebates_distribuidos: dashboard.total_rebates_distribuidos || 0,
    rebates_pendentes: dashboard.rebates_pendentes || 0,
    total_creditos_concedidos: dashboard.total_creditos_concedidos || 0,
    total_parcelas_recebidas: dashboard.total_parcelas_recebidas || 0,
    total_parcelas_pendentes: dashboard.total_parcelas_pendentes || 0,
    total_juros_recebidos: dashboard.total_juros_recebidos || 0,
    lucro_bruto: dashboard.lucro_bruto || 0,
    custos_operacionais: dashboard.custos_operacionais || 0,
    lucro_liquido: dashboard.lucro_liquido || 0,
    margem_lucro: dashboard.margem_lucro || 0,
    status_financeiro: dashboard.status_financeiro || 'neutro',
    taxa_conversao_financiamento: dashboard.taxa_conversao_financiamento || 0,
    prazo_medio_financiamento: dashboard.prazo_medio_financiamento || 0,
    ticket_medio: dashboard.ticket_medio || 0
  };
}

async function consolidarFluxo(dados: any): Promise<FluxoBancarioResponse['fluxo_consolidado']> {
  const { imobiliaria_id, data_consolidacao } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id) {
    throw new Error('ID da imobiliária não fornecido');
  }
  
  const dataConsolidacao = data_consolidacao || new Date().toISOString().split('T')[0];
  
  // Buscar dados para consolidação
  const { data: consolidado, error } = await supabase
    .from('fluxo_bancario_consolidado')
    .select('*')
    .eq('imobiliaria_id', imobiliaria_id)
    .eq('data_consolidacao', dataConsolidacao)
    .single();
  
  if (error || !consolidado) {
    throw new Error('Consolidação não encontrada');
  }
  
  return {
    data_consolidacao: consolidado.data_consolidacao,
    mes_referencia: consolidado.mes_referencia,
    total_comissoes_recebidas: consolidado.total_comissoes_recebidas || 0,
    total_imobiliaria: consolidado.total_imobiliaria || 0,
    total_corretores: consolidado.total_corretores || 0,
    total_sb_tecnologia: consolidado.total_sb_tecnologia || 0,
    total_rebates_gerados: consolidado.total_rebates_gerados || 0,
    total_rebates_distribuidos: consolidado.total_rebates_distribuidos || 0,
    total_creditos_concedidos: consolidado.total_creditos_concedidos || 0,
    total_parcelas_recebidas: consolidado.total_parcelas_recebidas || 0,
    total_parcelas_pendentes: consolidado.total_parcelas_pendentes || 0,
    total_juros_recebidos: consolidado.total_juros_recebidos || 0,
    lucro_bruto: consolidado.lucro_bruto || 0,
    custos_operacionais: consolidado.custos_operacionais || 0,
    lucro_liquido: consolidado.lucro_liquido || 0,
    margem_lucro: consolidado.margem_lucro || 0,
    status_consolidacao: consolidado.status_consolidacao
  };
}

async function consultarTransacoes(dados: any): Promise<FluxoBancarioResponse['transacoes_consultadas']> {
  const { imobiliaria_id, data_inicio, data_fim } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id) {
    throw new Error('ID da imobiliária não fornecido');
  }
  
  // Buscar transações
  let query = supabase
    .from('transacoes_bancarias_detalhadas')
    .select('*')
    .eq('imobiliaria_id', imobiliaria_id);
  
  if (data_inicio && data_fim) {
    query = query
      .gte('data_transacao', data_inicio)
      .lte('data_transacao', data_fim);
  } else {
    // Mês atual por padrão
    const mesAtual = new Date().toISOString().split('T')[0].substring(0, 7);
    query = query.like('data_transacao', `${mesAtual}%`);
  }
  
  const { data: transacoes, error } = await query.order('data_transacao', { ascending: false });
  
  if (error) {
    throw new Error(`Erro ao consultar transações: ${error.message}`);
  }
  
  const totalTransacoes = transacoes.length;
  const valorTotalTransacoes = transacoes.reduce((sum, t) => sum + t.valor_transacao, 0);
  
  return {
    periodo_consulta: data_inicio && data_fim ? `${data_inicio} a ${data_fim}` : 'Mês atual',
    total_transacoes: totalTransacoes,
    valor_total_transacoes: valorTotalTransacoes,
    detalhes_transacoes: transacoes.map(t => ({
      id: t.id,
      data_transacao: t.data_transacao,
      tipo_transacao: t.tipo_transacao,
      valor_transacao: t.valor_transacao,
      valor_liquido: t.valor_liquido,
      taxa_transacao: t.taxa_transacao,
      origem_id: t.origem_id,
      origem_tipo: t.origem_tipo,
      imobiliaria_id: t.imobiliaria_id,
      broker_id: t.broker_id,
      status_transacao: t.status_transacao,
      data_conclusao: t.data_conclusao
    }))
  };
}

async function gerarRelatorio(dados: any): Promise<FluxoBancarioResponse['relatorio_gerado']> {
  const { imobiliaria_id, tipo_relatorio, data_inicio, data_fim } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id || !tipo_relatorio) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Buscar dados para o relatório
  let query = supabase
    .from('fluxo_bancario_consolidado')
    .select('*')
    .eq('imobiliaria_id', imobiliaria_id);
  
  if (data_inicio && data_fim) {
    query = query
      .gte('data_consolidacao', data_inicio)
      .lte('data_consolidacao', data_fim);
  } else {
    // Últimos 6 meses por padrão
    const dataInicio = new Date();
    dataInicio.setMonth(dataInicio.getMonth() - 6);
    query = query.gte('data_consolidacao', dataInicio.toISOString().split('T')[0]);
  }
  
  const { data: consolidacoes, error } = await query.order('data_consolidacao', { ascending: false });
  
  if (error) {
    throw new Error(`Erro ao gerar relatório: ${error.message}`);
  }
  
  // Calcular totais
  const totalReceitas = consolidacoes.reduce((sum, c) => sum + c.total_comissoes_recebidas + c.total_rebates_distribuidos + c.total_juros_recebidos, 0);
  const totalDespesas = consolidacoes.reduce((sum, c) => sum + c.custos_operacionais, 0);
  const lucroLiquido = totalReceitas - totalDespesas;
  const margemLucro = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;
  const totalOperacoes = consolidacoes.reduce((sum, c) => sum + c.total_financiamentos, 0);
  
  // Detalhes por categoria
  const detalhesOperacoes = [
    {
      categoria: 'Comissões de Financiamento',
      total_operacoes: consolidacoes.reduce((sum, c) => sum + c.total_financiamentos, 0),
      valor_total: consolidacoes.reduce((sum, c) => sum + c.total_comissoes_recebidas, 0),
      percentual_total: 0
    },
    {
      categoria: 'Rebates de Originação',
      total_operacoes: consolidacoes.reduce((sum, c) => sum + c.total_rebates_gerados, 0),
      valor_total: consolidacoes.reduce((sum, c) => sum + c.total_rebates_distribuidos, 0),
      percentual_total: 0
    },
    {
      categoria: 'Juros de Parcelas',
      total_operacoes: consolidacoes.reduce((sum, c) => sum + c.total_parcelas, 0),
      valor_total: consolidacoes.reduce((sum, c) => sum + c.total_juros_recebidos, 0),
      percentual_total: 0
    }
  ];
  
  // Calcular percentuais
  detalhesOperacoes.forEach(detalhe => {
    detalhe.percentual_total = totalReceitas > 0 ? (detalhe.valor_total / totalReceitas) * 100 : 0;
  });
  
  // Gerar recomendações
  const recomendacoes = [];
  if (margemLucro < 15) {
    recomendacoes.push('Margem de lucro abaixo de 15%. Considere revisar custos operacionais.');
  }
  if (totalOperacoes < 10) {
    recomendacoes.push('Baixo volume de operações. Considere estratégias para aumentar o número de financiamentos.');
  }
  if (totalReceitas > 100000 && margemLucro > 25) {
    recomendacoes.push('Excelente performance! Considere expandir as operações.');
  }
  
  return {
    tipo_relatorio,
    periodo: data_inicio && data_fim ? `${data_inicio} a ${data_fim}` : 'Últimos 6 meses',
    data_geracao: new Date().toISOString(),
    resumo_executivo: {
      total_receitas: totalReceitas,
      total_despesas: totalDespesas,
      lucro_liquido: lucroLiquido,
      margem_lucro: margemLucro,
      total_operacoes: totalOperacoes
    },
    detalhes_operacoes: detalhesOperacoes,
    recomendacoes
  };
}

async function consultarLucroOriginador(dados: any): Promise<FluxoBancarioResponse['lucro_originador']> {
  const { broker_id, data_inicio, data_fim } = dados;
  
  // Validar dados obrigatórios
  if (!broker_id) {
    throw new Error('ID do broker não fornecido');
  }
  
  // Buscar dados do broker
  const { data: broker, error: errorBroker } = await supabase
    .from('brokers')
    .select('*')
    .eq('id', broker_id)
    .single();
  
  if (errorBroker || !broker) {
    throw new Error('Broker não encontrado');
  }
  
  // Buscar financiamentos do broker
  let query = supabase
    .from('comissoes_financiamento')
    .select('*')
    .eq('broker_id', broker_id);
  
  if (data_inicio && data_fim) {
    query = query
      .gte('data_contrato', data_inicio)
      .lte('data_contrato', data_fim);
  } else {
    // Últimos 6 meses por padrão
    const dataInicio = new Date();
    dataInicio.setMonth(dataInicio.getMonth() - 6);
    query = query.gte('data_contrato', dataInicio.toISOString().split('T')[0]);
  }
  
  const { data: financiamentos, error } = await query.order('data_contrato', { ascending: false });
  
  if (error) {
    throw new Error(`Erro ao consultar financiamentos: ${error.message}`);
  }
  
  // Calcular métricas
  const totalFinanciamentosOriginados = financiamentos.length;
  const valorTotalOriginado = financiamentos.reduce((sum, f) => sum + f.valor_financiado, 0);
  const comissoesRecebidas = financiamentos.reduce((sum, f) => sum + f.valor_corretor, 0);
  
  // Buscar rebates do broker
  const { data: rebates } = await supabase
    .from('rebate_origenacao')
    .select('*')
    .eq('broker_id', broker_id)
    .eq('status_rebate', 'distribuido');
  
  const rebatesRecebidos = rebates?.reduce((sum, r) => sum + r.valor_corretor, 0) || 0;
  
  // Buscar parcelas recebidas
  const { data: parcelas } = await supabase
    .from('parcelas_credito')
    .select('*')
    .in('credito_id', financiamentos.map(f => f.id))
    .eq('status_parcela', 'paga');
  
  const jurosRecebidos = parcelas?.reduce((sum, p) => sum + p.valor_juros, 0) || 0;
  
  // Calcular lucros
  const lucroBruto = comissoesRecebidas + rebatesRecebidos + jurosRecebidos;
  const custosDiretos = valorTotalOriginado * 0.05; // Estimativa de 5% de custos
  const lucroLiquido = lucroBruto - custosDiretos;
  const margemLucro = lucroBruto > 0 ? (lucroLiquido / lucroBruto) * 100 : 0;
  
  // Calcular métricas de desempenho
  const taxaConversao = financiamentos.length > 0 ? 25.0 : 0; // Simulado
  const ticketMedio = financiamentos.length > 0 ? valorTotalOriginado / financiamentos.length : 0;
  const prazoMedio = financiamentos.length > 0 ? financiamentos.reduce((sum, f) => sum + (f.prazo_meses || 12), 0) / financiamentos.length : 12;
  const satisfacaoCliente = 4.5; // Simulado
  
  // Calcular ranking (simulado)
  const rankingPerformance = Math.floor(Math.random() * 100) + 1;
  
  return {
    broker_id: broker.id,
    broker_nome: broker.nome,
    periodo_analise: data_inicio && data_fim ? `${data_inicio} a ${data_fim}` : 'Últimos 6 meses',
    total_financiamentos_originados: totalFinanciamentosOriginados,
    valor_total_originado: valorTotalOriginado,
    comissoes_recebidas: comissoesRecebidas,
    rebates_recebidos: rebatesRecebidos,
    juros_recebidos: jurosRecebidos,
    lucro_bruto: lucroBruto,
    custos_diretos: custosDiretos,
    lucro_liquido: lucroLiquido,
    margem_lucro: margemLucro,
    ranking_performance: rankingPerformance,
    metricas_desempenho: {
      taxa_conversao: taxaConversao,
      ticket_medio: ticketMedio,
      prazo_medio: prazoMedio,
      satisfacao_cliente: satisfacaoCliente
    }
  };
}

// Endpoint para consultas específicas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const imobiliaria_id = searchParams.get('imobiliaria_id');
    const broker_id = searchParams.get('broker_id');
    
    if (tipo === 'resumo_mensal' && imobiliaria_id) {
      return await consultarResumoMensal(imobiliaria_id);
    }
    
    if (tipo === 'ranking_originadores') {
      return await consultarRankingOriginadores();
    }
    
    if (tipo === 'metricas_gerais') {
      return await consultarMetricasGerais();
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

async function consultarResumoMensal(imobiliariaId: string): Promise<NextResponse> {
  // Buscar resumo dos últimos 12 meses
  const dataInicio = new Date();
  dataInicio.setMonth(dataInicio.getMonth() - 12);
  
  const { data: resumo } = await supabase
    .from('fluxo_bancario_consolidado')
    .select('*')
    .eq('imobiliaria_id', imobiliariaId)
    .gte('data_consolidacao', dataInicio.toISOString().split('T')[0])
    .order('data_consolidacao', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: resumo || [],
    message: 'Resumo mensal consultado com sucesso'
  });
}

async function consultarRankingOriginadores(): Promise<NextResponse> {
  // Buscar ranking de originadores (top 10)
  const { data: ranking } = await supabase
    .from('comissoes_financiamento')
    .select(`
      broker_id,
      brokers!inner(nome),
      COUNT(*) as total_financiamentos,
      SUM(valor_financiado) as valor_total_originado,
      SUM(valor_corretor) as total_comissoes,
      AVG(prazo_meses) as prazo_medio
    `)
    .eq('status_comissao', 'pago')
        .order('valor_total_originado', { ascending: false })
    .limit(10);
  
  return NextResponse.json({
    success: true,
    data: ranking || [],
    message: 'Ranking de originadores consultado com sucesso'
  });
}

async function consultarMetricasGerais(): Promise<NextResponse> {
  // Buscar métricas gerais do sistema
  const { data: metricas } = await supabase
    .from('fluxo_bancario_consolidado')
    .select('*')
    .gte('data_consolidacao', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('data_consolidacao', { ascending: false });
  
  if (!metricas || metricas.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        total_imobiliarias_ativas: 0,
        total_financiamentos: 0,
        valor_total_originado: 0,
        total_juros_recebidos: 0,
        lucro_medio: 0,
        margem_media: 0
      },
      message: 'Métricas gerais consultadas com sucesso'
    });
  }
  
  const totalImobiliariasAtivas = new Set(metricas.map(m => m.imobiliaria_id)).size;
  const totalFinanciamentos = metricas.reduce((sum, m) => sum + m.total_financiamentos, 0);
  const valorTotalOriginado = metricas.reduce((sum, m) => sum + m.total_creditos_concedidos, 0);
  const totalJurosRecebidos = metricas.reduce((sum, m) => sum + m.total_juros_recebidos, 0);
  const lucroMedio = metricas.reduce((sum, m) => sum + m.lucro_liquido, 0) / metricas.length;
  const margemMedia = metricas.reduce((sum, m) => sum + m.margem_lucro, 0) / metricas.length;
  
  return NextResponse.json({
    success: true,
    data: {
      total_imobiliarias_ativas: totalImobiliariasAtivas,
      total_financiamentos: totalFinanciamentos,
      valor_total_originado: valorTotalOriginado,
      total_juros_recebidos: totalJurosRecebidos,
      lucro_medio: lucroMedio,
      margem_media: margemMedia
    },
    message: 'Métricas gerais consultadas com sucesso'
  });
}
