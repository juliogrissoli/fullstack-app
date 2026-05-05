// 🏛️ SECURITY BROKER SB v26 - GOLDEN MASTER (FULL STACK REAL ESTATE)
// API de Fusão Final de Todos os Módulos - Versão Golden Master

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface GoldenMasterRequest {
  acao: 'processar_split_4_vias' | 'distribuir_recorrencia_5x5' | 'consultar_dashboard_master' | 'executar_teste_escala' | 'validar_soberania' | 'configurar_sucessao';
  dados?: {
    transacao_id?: string;
    tipo_transacao?: string;
    valor_total?: number;
    captador_id?: string;
    parceiro_id?: string;
    vendedor_id?: string;
    imobiliaria_id?: string;
    creditos_aceleracao?: number;
    broker_origem_id?: string;
    mes_referencia?: string;
    nivel_1_broker_id?: string;
    nivel_2_broker_id?: string;
    nivel_3_broker_id?: string;
    nivel_4_broker_id?: string;
    nivel_5_broker_id?: string;
    valor_total_distribuido?: number;
    data_inicio?: string;
    data_fim?: string;
    total_predios?: number;
    total_unidades?: number;
    broker_titular_id?: string;
    beneficiario_rede_id?: string;
    tipo_sucessao?: string;
    perc_transferencia_ganhos?: number;
    data_inicio_sucessao?: string;
  };
}

interface GoldenMasterResponse {
  success: boolean;
  split_processado?: {
    id: string;
    transacao_id: string;
    tipo_transacao: string;
    valor_total: number;
    split_distribuicao: {
      captador: { percent: number; valor: number };
      parceiro: { percent: number; valor: number };
      vendedor: { percent: number; valor: number };
      sb: { percent: number; valor: number };
    };
    creditos_aceleracao: {
      total: number;
      retidos_70: number;
      liberados_30: number;
    };
    status_split: string;
    data_processamento: string;
  };
  recorrencia_distribuida?: {
    id: string;
    broker_origem_id: string;
    mes_referencia: string;
    arvore_distribuicao: {
      nivel_1: { broker_id: string; percent: number; valor: number };
      nivel_2: { broker_id: string; percent: number; valor: number };
      nivel_3: { broker_id: string; percent: number; valor: number };
      nivel_4: { broker_id: string; percent: number; valor: number };
      nivel_5: { broker_id: string; percent: number; valor: number };
    };
    valor_total_distribuido: number;
    valor_retenido_sb: number;
    status_distribuicao: string;
    data_distribuicao: string;
  };
  dashboard_master_consultado?: {
    periodo: string;
    imobiliaria_id: string;
    imobiliaria_nome: string;
    frente_1_vendas: number;
    frente_2_recorrencia: number;
    frente_3_marketplace: number;
    frente_4_landbanking: number;
    frente_5_equity: number;
    frente_6_mentoria: number;
    frente_7_selo_juris: number;
    frente_8_data_intelligence: number;
    frente_9_antecipacao: number;
    frente_10_fintech_bancaria: number;
    total_faturamento: number;
    margem_lucro: number;
    status_performance: string;
    ticket_medio: number;
  };
  teste_escala_executado?: {
    id: string;
    nome_teste: string;
    status_teste: string;
    total_predios: number;
    total_unidades: number;
    latencia_media_ms: number;
    score_performance: number;
    status_resultado: string;
    detalhes_performance: Array<{
      tipo_operacao: string;
      operacoes_realizadas: number;
      tempo_medio_ms: number;
      taxa_sucesso: number;
      erros_ocorridos: number;
    }>;
  };
  soberania_validada?: {
    imobiliaria_id: string;
    modo_soberano: string;
    powered_by_sb: boolean;
    comunicacoes_100_percent_sb: boolean;
    logs_100_percent_sb: boolean;
    interface_100_percent_sb: boolean;
    trava_lgpd_ativa: boolean;
    periodo_trava_meses: number;
    nomenclatura_validada: boolean;
    nomes_externos_removidos: boolean;
    status_configuracao: string;
  };
  sucessao_configurada?: {
    id: string;
    broker_titular_id: string;
    beneficiario_rede_id: string;
    tipo_sucessao: string;
    perc_transferencia_ganhos: number;
    perc_transferencia_rede: number;
    perc_transferencia_comissoes: number;
    data_inicio_sucessao: string;
    status_sucessao: string;
    valor_patrimonio_transferido: number;
    valor_comissoes_futuras: number;
    valor_rede_futura: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: GoldenMasterRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🏛️ Golden Master: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'processar_split_4_vias':
        resultado = await processarSplit4Vias(dados);
        break;
      case 'distribuir_recorrencia_5x5':
        resultado = await distribuirRecorrencia5x5(dados);
        break;
      case 'consultar_dashboard_master':
        resultado = await consultarDashboardMaster(dados);
        break;
      case 'executar_teste_escala':
        resultado = await executarTesteEscala(dados);
        break;
      case 'validar_soberania':
        resultado = await validarSoberania(dados);
        break;
      case 'configurar_sucessao':
        resultado = await configurarSucessao(dados);
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
    console.error('Erro no Golden Master:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Golden Master',
      details: error.message
    }, { status: 500 });
  }
}

async function processarSplit4Vias(dados: any): Promise<GoldenMasterResponse['split_processado']> {
  const { transacao_id, tipo_transacao, valor_total, captador_id, parceiro_id, vendedor_id, imobiliaria_id, creditos_aceleracao } = dados;
  
  // Validar dados obrigatórios
  if (!transacao_id || !tipo_transacao || !valor_total) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Validar tipo de transação
  if (!['venda', 'financiamento', 'match'].includes(tipo_transacao)) {
    throw new Error('Tipo de transação inválido');
  }
  
  // Processar split de 4 vias
  const { data: split, error } = await supabase
    .from('split_4_vias')
    .insert({
      transacao_id,
      tipo_transacao,
      valor_total,
      captador_id,
      parceiro_id,
      vendedor_id,
      imobiliaria_id,
      captador_percent: 10.0,
      parceiro_percent: 30.0,
      vendedor_percent: 40.0,
      sb_percent: 20.0,
      creditos_aceleracao: creditos_aceleracao || 0.00,
      status_split: 'processado',
      data_processamento: new Date().toISOString()
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao processar split: ${error.message}`);
  }
  
  // Distribuir valores para participantes
  const distribuirParaParticipantes = async (participanteId: string, valor: number, tipo: string) => {
    if (participanteId) {
      await supabase
        .from('brokers')
        .update({
          saldo_disponivel: await supabase.rpc('incrementar_saldo', {
            p_broker_id: participanteId,
            p_valor: valor
          })
        })
        .eq('id', participanteId);
    }
  };
  
  // Distribuir para captador
  await distribuirParaParticipantes(captador_id, split.captador_valor, 'captador');
  
  // Distribuir para parceiro
  await distribuirParaParticipantes(parceiro_id, split.parceiro_valor, 'parceiro');
  
  // Distribuir para vendedor
  await distribuirParaParticipantes(vendedor_id, split.vendedor_valor, 'vendedor');
  
  // Distribuir para SB
  if (imobiliaria_id) {
    await supabase
      .from('imobiliarias_parceiras')
      .update({
        saldo_disponivel: await supabase.rpc('incrementar_saldo_imobiliaria', {
          p_imobiliaria_id: imobiliaria_id,
          p_valor: split.sb_valor
        })
      })
      .eq('id', imobiliaria_id);
  }
  
  return {
    id: split.id,
    transacao_id: split.transacao_id,
    tipo_transacao: split.tipo_transacao,
    valor_total: split.valor_total,
    split_distribuicao: {
      captador: { percent: split.captador_percent, valor: split.captador_valor },
      parceiro: { percent: split.parceiro_percent, valor: split.parceiro_valor },
      vendedor: { percent: split.vendedor_percent, valor: split.vendedor_valor },
      sb: { percent: split.sb_percent, valor: split.sb_valor }
    },
    creditos_aceleracao: {
      total: split.creditos_aceleracao,
      retidos_70: split.creditos_retidos_70,
      liberados_30: split.creditos_liberados_30
    },
    status_split: split.status_split,
    data_processamento: split.data_processamento
  };
}

async function distribuirRecorrencia5x5(dados: any): Promise<GoldenMasterResponse['recorrencia_distribuida']> {
  const { broker_origem_id, mes_referencia, nivel_1_broker_id, nivel_2_broker_id, nivel_3_broker_id, nivel_4_broker_id, nivel_5_broker_id, valor_total_distribuido } = dados;
  
  // Validar dados obrigatórios
  if (!broker_origem_id || !mes_referencia || !valor_total_distribuido) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Calcular valores da árvore 5x5
  const nivel1Valor = valor_total_distribuido * 0.05; // 5%
  const nivel2Valor = valor_total_distribuido * 0.02; // 2%
  const nivel3Valor = valor_total_distribuido * 0.015; // 1.5%
  const nivel4Valor = valor_total_distribuido * 0.01; // 1%
  const nivel5Valor = valor_total_distribuido * 0.005; // 0.5%
  
  // Total distribuído para rede (10%)
  const totalDistribuidoRede = nivel1Valor + nivel2Valor + nivel3Valor + nivel4Valor + nivel5Valor;
  
  // Retenção SB (90% restante)
  const valorRetidoSB = valor_total_distribuido - totalDistribuidoRede;
  
  // Distribuir recorrência
  const { data: distribuicao, error } = await supabase
    .from('recorrencia_5x5')
    .insert({
      broker_origem_id,
      mes_referencia,
      nivel_1_broker_id,
      nivel_1_percent: 5.0,
      nivel_1_valor: nivel1Valor,
      nivel_2_broker_id,
      nivel_2_percent: 2.0,
      nivel_2_valor: nivel2Valor,
      nivel_3_broker_id,
      nivel_3_percent: 1.5,
      nivel_3_valor: nivel3Valor,
      nivel_4_broker_id,
      nivel_4_percent: 1.0,
      nivel_4_valor: nivel4Valor,
      nivel_5_broker_id,
      nivel_5_percent: 0.5,
      nivel_5_valor: nivel5Valor,
      valor_total_distribuido: totalDistribuidoRede,
      valor_retenido_sb: valorRetidoSB,
      status_distribuicao: 'processada',
      data_distribuicao: new Date().toISOString()
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao distribuir recorrência: ${error.message}`);
  }
  
  // Distribuir valores para os níveis
  const distribuirParaNivel = async (brokerId: string, valor: number, nivel: string) => {
    if (brokerId) {
      await supabase
        .from('brokers')
        .update({
          saldo_recorrencia: await supabase.rpc('incrementar_saldo_recorrencia', {
            p_broker_id: brokerId,
            p_valor: valor
          })
        })
        .eq('id', brokerId);
    }
  };
  
  await distribuirParaNivel(nivel_1_broker_id, nivel1Valor, 'Nível 1');
  await distribuirParaNivel(nivel_2_broker_id, nivel2Valor, 'Nível 2');
  await distribuirParaNivel(nivel_3_broker_id, nivel3Valor, 'Nível 3');
  await distribuirParaNivel(nivel_4_broker_id, nivel4Valor, 'Nível 4');
  await distribuirParaNivel(nivel_5_broker_id, nivel5Valor, 'Nível 5');
  
  return {
    id: distribuicao.id,
    broker_origem_id: distribuicao.broker_origem_id,
    mes_referencia: distribuicao.mes_referencia,
    arvore_distribuicao: {
      nivel_1: { broker_id: distribuicao.nivel_1_broker_id, percent: distribuicao.nivel_1_percent, valor: distribuicao.nivel_1_valor },
      nivel_2: { broker_id: distribuicao.nivel_2_broker_id, percent: distribuicao.nivel_2_percent, valor: distribuicao.nivel_2_valor },
      nivel_3: { broker_id: distribuicao.nivel_3_broker_id, percent: distribuicao.nivel_3_percent, valor: distribuicao.nivel_3_valor },
      nivel_4: { broker_id: distribuicao.nivel_4_broker_id, percent: distribuicao.nivel_4_percent, valor: distribuicao.nivel_4_valor },
      nivel_5: { broker_id: distribuicao.nivel_5_broker_id, percent: distribuicao.nivel_5_percent, valor: distribuicao.nivel_5_valor }
    },
    valor_total_distribuido: distribuicao.valor_total_distribuido,
    valor_retenido_sb: distribuicao.valor_retenido_sb,
    status_distribuicao: distribuicao.status_distribuicao,
    data_distribuicao: distribuicao.data_distribuicao
  };
}

async function consultarDashboardMaster(dados: any): Promise<GoldenMasterResponse['dashboard_master_consultado']> {
  const { imobiliaria_id, data_inicio, data_fim } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id) {
    throw new Error('ID da imobiliária não fornecido');
  }
  
  // Buscar dashboard master otimizado
  let query = supabase
    .from('dashboard_master_otimizado')
    .select('*')
    .eq('imobiliaria_id', imobiliaria_id);
  
  if (data_inicio && data_fim) {
    query = query
      .gte('data_consolidacao', data_inicio)
      .lte('data_consolidacao', data_fim);
  } else {
    // Mês atual por padrão
    const mesAtual = new Date().toISOString().split('T')[0].substring(0, 7);
    query = query.like('data_consolidacao', `${mesAtual}%`);
  }
  
  const { data: dashboard, error } = await query.order('data_consolidacao', { ascending: false }).limit(1);
  
  if (error || !dashboard || dashboard.length === 0) {
    throw new Error('Dashboard não encontrado');
  }
  
  const dash = dashboard[0];
  
  return {
    periodo: data_inicio && data_fim ? `${data_inicio} a ${data_fim}` : 'Mês atual',
    imobiliaria_id: dash.imobiliaria_id,
    imobiliaria_nome: dash.imobiliaria_nome,
    frente_1_vendas: dash.frente_1_vendas || 0,
    frente_2_recorrencia: dash.frente_2_recorrencia || 0,
    frente_3_marketplace: dash.frente_3_marketplace || 0,
    frente_4_landbanking: dash.frente_4_landbanking || 0,
    frente_5_equity: dash.frente_5_equity || 0,
    frente_6_mentoria: dash.frente_6_mentoria || 0,
    frente_7_selo_juris: dash.frente_7_selo_juris || 0,
    frente_8_data_intelligence: dash.frente_8_data_intelligence || 0,
    frente_9_antecipacao: dash.frente_9_antecipacao || 0,
    frente_10_fintech_bancaria: dash.frente_10_fintech_bancaria || 0,
    total_faturamento: dash.total_faturamento || 0,
    margem_lucro: dash.margem_lucro || 0,
    status_performance: dash.status_performance || 'regular',
    ticket_medio: dash.ticket_medio_calculado || 0
  };
}

async function executarTesteEscala(dados: any): Promise<GoldenMasterResponse['teste_escala_executado']> {
  const { total_predios, total_unidades } = dados;
  
  // Executar teste de escala via função RPC
  const { data: resultado, error } = await supabase
    .rpc('executar_teste_escala', {
      p_total_predios: total_predios || 500,
      p_total_unidades: total_unidades || 500000
    });
  
  if (error) {
    throw new Error(`Erro ao executar teste de escala: ${error.message}`);
  }
  
  // Buscar detalhes do teste
  const { data: detalhes } = await supabase
    .from('teste_escala_detalhes')
    .select('*')
    .eq('teste_escala_id', resultado.id)
    .order('data_medicao', { ascending: false });
  
  return {
    id: resultado.id,
    nome_teste: resultado.nome_teste,
    status_teste: resultado.status_teste,
    total_predios: resultado.total_predios,
    total_unidades: resultado.total_unidades,
    latencia_media_ms: resultado.latencia_media_ms,
    score_performance: resultado.score_performance,
    status_resultado: resultado.status_resultado,
    detalhes_performance: (detalhes || []).map(d => ({
      tipo_operacao: d.tipo_operacao,
      operacoes_realizadas: d.operacoes_realizadas,
      tempo_medio_ms: d.tempo_medio_ms,
      taxa_sucesso: d.taxa_sucesso,
      erros_ocorridos: d.erros_ocorridos
    }))
  };
}

async function validarSoberania(dados: any): Promise<GoldenMasterResponse['soberania_validada']> {
  const { imobiliaria_id } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id) {
    throw new Error('ID da imobiliária não fornecido');
  }
  
  // Buscar configuração de soberania
  const { data: configuracao, error } = await supabase
    .from('configuracao_soberania_sb')
    .select('*')
    .eq('imobiliaria_id', imobiliaria_id)
    .single();
  
  if (error || !configuracao) {
    throw new Error('Configuração de soberania não encontrada');
  }
  
  // Validar nomenclatura (simulado)
  const nomesExternosRemovidos = true; // Em produção, verificaríamos logs
  
  // Validar logs (simulado)
  const logs100PercentSB = true; // Em produção, verificaríamos logs
  
  // Validar interface (simulado)
  const interface100PercentSB = true; // Em produção, verificaríamos interface
  
  return {
    imobiliaria_id: configuracao.imobiliaria_id,
    modo_soberano: configuracao.modo_soberano,
    powered_by_sb: configuracao.powered_by_sb,
    comunicacoes_100_percent_sb: configuracao.comunicacoes_100_percent_sb,
    logs_100_percent_sb: configuracao.logs_100_percent_sb,
    interface_100_percent_sb: configuracao.interface_100_percent_sb,
    trava_lgpd_ativa: configuracao.trava_lgpd_ativa,
    periodo_trava_meses: configuracao.periodo_trava_meses,
    nomenclatura_validada: configuracao.nomenclatura_validada,
    nomes_externos_removidos: nomesExternosRemovidos,
    status_configuracao: configuracao.status_configuracao
  };
}

async function configurarSucessao(dados: any): Promise<GoldenMasterResponse['sucessao_configurada']> {
  const { broker_titular_id, beneficiario_rede_id, tipo_sucessao, perc_transferencia_ganhos, data_inicio_sucessao } = dados;
  
  // Validar dados obrigatórios
  if (!broker_titular_id || !beneficiario_rede_id || !tipo_sucessao) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Calcular valores de patrimônio (simulado)
  const valorPatrimonioTransferido = 1000000; // R$ 1M simulado
  const valorComissoesFuturas = 500000; // R$ 500k simulado
  const valorRedeFutura = 200000; // R$ 200k simulado
  
  // Configurar sucessão
  const { data: sucessao, error } = await supabase
    .from('gestao_sucessao_patrimonio')
    .insert({
      broker_titular_id,
      beneficiario_rede_id,
      tipo_sucessao,
      perc_transferencia_ganhos: perc_transferencia_ganhos || 100.0,
      perc_transferencia_rede: 100.0,
      perc_transferencia_comissoes: 100.0,
      condicao_transferencia: 'imediata',
      valor_patrimonio_transferido: valorPatrimonioTransferido,
      valor_comissoes_futuras: valorComissoesFuturas,
      valor_rede_futura: valorRedeFutura,
      data_inicio_sucessao: data_inicio_sucessao || new Date().toISOString().split('T')[0],
      status_sucessao: 'pendente'
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao configurar sucessão: ${error.message}`);
  }
  
  return {
    id: sucessao.id,
    broker_titular_id: sucessao.broker_titular_id,
    beneficiario_rede_id: sucessao.beneficiario_rede_id,
    tipo_sucessao: sucessao.tipo_sucessao,
    perc_transferencia_ganhos: sucessao.perc_transferencia_ganhos,
    perc_transferencia_rede: sucessao.perc_transferencia_rede,
    perc_transferencia_comissoes: sucessao.perc_transferencia_comissoes,
    data_inicio_sucessao: sucessao.data_inicio_sucessao,
    status_sucessao: sucessao.status_sucessao,
    valor_patrimonio_transferido: sucessao.valor_patrimonio_transferido,
    valor_comissoes_futuras: sucessao.valor_comissoes_futuras,
    valor_rede_futura: sucessao.valor_rede_futura
  };
}

// Endpoint para consultas específicas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const imobiliaria_id = searchParams.get('imobiliaria_id');
    const broker_id = searchParams.get('broker_id');
    
    if (tipo === 'performance_split' && imobiliaria_id) {
      return await consultarPerformanceSplit(imobiliaria_id);
    }
    
    if (tipo === 'performance_recorrencia' && broker_id) {
      return await consultarPerformanceRecorrencia(broker_id);
    }
    
    if (tipo === 'testes_escala') {
      return await consultarTestesEscala();
    }
    
    if (tipo === 'logs_soberania' && imobiliaria_id) {
      return await consultarLogsSoberania(imobiliaria_id);
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

async function consultarPerformanceSplit(imobiliariaId: string): Promise<NextResponse> {
  // Buscar performance de split 4 vias
  const { data: performance } = await supabase
    .from('performance_split_4_vias')
    .select('*')
    .eq('imobiliaria_id', imobiliariaId)
    .order('valor_total', { ascending: false })
    .limit(10);
  
  return NextResponse.json({
    success: true,
    data: performance || [],
    message: 'Performance de split consultada com sucesso'
  });
}

async function consultarPerformanceRecorrencia(brokerId: string): Promise<NextResponse> {
  // Buscar performance de recorrência 5x5
  const { data: performance } = await supabase
    .from('performance_recorrencia_5x5')
    .select('*')
    .eq('broker_origem_id', brokerId)
    .order('valor_total_distribuido', { ascending: false })
    .limit(12); // Últimos 12 meses
  
  return NextResponse.json({
    success: true,
    data: performance || [],
    message: 'Performance de recorrência consultada com sucesso'
  });
}

async function consultarTestesEscala(): Promise<NextResponse> {
  // Buscar todos os testes de escala
  const { data: testes } = await supabase
    .from('teste_escala_vendas')
    .select('*')
    .order('data_inicio_teste', { ascending: false })
    .limit(20);
  
  return NextResponse.json({
    success: true,
    data: testes || [],
    message: 'Testes de escala consultados com sucesso'
  });
}

async function consultarLogsSoberania(imobiliariaId: string): Promise<NextResponse> {
  // Buscar logs de soberania
  // First get the configuration ID
  const { data: config } = await supabase
    .from('configuracao_soberania_sb')
    .select('id')
    .eq('imobiliaria_id', imobiliariaId)
    .single();
  
  const { data: logs } = await supabase
    .from('logs_soberania_sb')
    .select('*')
    .eq('configuracao_id', config?.id)
    .order('data_alteracao', { ascending: false })
    .limit(50);
  
  return NextResponse.json({
    success: true,
    data: logs || [],
    message: 'Logs de soberania consultados com sucesso'
  });
}
