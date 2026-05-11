// 🏛️ SECURITY BROKER SB v25 - OMNISCIENT INTELIGÊNCIA PREDITIVA
// API de Crédito para Documentação (ITBI/Registro) e Rebate de Originação

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

interface CreditoDocumentacaoRequest {
  acao: 'solicitar_credito' | 'aprovar_credito' | 'consultar_parcelas' | 'processar_rebate' | 'consultar_fluxo';
  dados?: {
    broker_id?: string;
    imobiliaria_id?: string;
    cliente_id?: string;
    transacao_id?: string;
    tipo_transacao?: string;
    valor_transacao?: number;
    descricao_transacao?: string;
    data_transacao?: string;
    custos_totais?: number;
    parcelas_desejadas?: number;
    juros_mensais?: number;
    credito_id?: string;
    rebate_id?: string;
    status_aprovacao?: string;
    data_inicio?: string;
    data_fim?: string;
  };
}

interface CreditoDocumentacaoResponse {
  success: boolean;
  credito_solicitado?: {
    id: string;
    transacao_id: string;
    tipo_transacao: string;
    valor_transacao: number;
    custos_totais: number;
    valor_financiado: number;
    parcelas_desejadas: number;
    juros_mensais: number;
    valor_parcela_calculado: number;
    total_juros: number;
    total_pago: number;
    status_credito: string;
  };
  credito_aprovado?: {
    id: string;
    status_credito: string;
    data_aprovacao: string;
    data_primeira_parcela: string;
    data_ultima_parcela: string;
    parcelas_geradas: Array<{
      numero_parcela: number;
      valor_parcela: number;
      valor_juros: number;
      valor_principal: number;
      data_vencimento: string;
    }>;
  };
  parcelas_consultadas?: {
    credito_id: string;
    total_parcelas: number;
    parcelas_pendentes: number;
    parcelas_pagas: number;
    parcelas_atrasadas: number;
    valor_total_pendente: number;
    valor_total_pago: number;
    detalhes_parcelas: Array<{
      numero_parcela: number;
      valor_parcela: number;
      valor_juros: number;
      valor_principal: number;
      data_vencimento: string;
      data_pagamento: string;
      status_parcela: string;
      dias_atraso: number;
    }>;
  };
  rebate_processado?: {
    id: string;
    transacao_origem: string;
    valor_total_rebate: number;
    split_distribuicao: {
      sb: number;
      imobiliaria: number;
      corretor: number;
    };
    status_rebate: string;
    data_distribuicao: string;
  };
  fluxo_consultado?: {
    periodo_consulta: string;
    total_creditos_concedidos: number;
    total_parcelas_recebidas: number;
    total_juros_recebidos: number;
    total_rebates_gerados: number;
    total_rebates_distribuidos: number;
    lucro_liquido: number;
    margem_lucro: number;
    detalhes_transacoes: Array<{
      data_transacao: string;
      tipo_transacao: string;
      valor_transacao: number;
      status_transacao: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: CreditoDocumentacaoRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`💳 Crédito Documentação: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'solicitar_credito':
        resultado = await solicitarCredito(dados);
        break;
      case 'aprovar_credito':
        resultado = await aprovarCredito(dados);
        break;
      case 'consultar_parcelas':
        resultado = await consultarParcelas(dados);
        break;
      case 'processar_rebate':
        resultado = await processarRebate(dados);
        break;
      case 'consultar_fluxo':
        resultado = await consultarFluxo(dados);
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
    console.error('Erro no Crédito Documentação:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Crédito Documentação',
      details: error.message
    }, { status: 500 });
  }
}

async function solicitarCredito(dados: any): Promise<CreditoDocumentacaoResponse['credito_solicitado']> {
  const { broker_id, imobiliaria_id, cliente_id, transacao_id, tipo_transacao, valor_transacao, descricao_transacao, data_transacao, custos_totais, parcelas_desejadas, juros_mensais } = dados;
  
  // Validar dados obrigatórios
  if (!broker_id || !transacao_id || !tipo_transacao || !valor_transacao || !custos_totais) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Validar tipo de transação
  if (!['itbi', 'registro', 'escritura', 'averbacao'].includes(tipo_transacao)) {
    throw new Error('Tipo de transação inválido');
  }
  
  // Calcular valor financiado (80% dos custos)
  const valorFinanciado = custos_totais * 0.8;
  
  // Calcular juros compostos
  const taxaMensal = (juros_mensais || 2.99) / 100;
  const numeroParcelas = parcelas_desejadas || 12;
  
  // Fórmula de juros compostos: M = P * (1 + i)^n
  const valorParcela = valorFinanciado * (taxaMensal * Math.pow(1 + taxaMensal, numeroParcelas)) / (Math.pow(1 + taxaMensal, numeroParcelas) - 1);
  const totalJuros = (valorParcela * numeroParcelas) - valorFinanciado;
  const totalPago = valorParcela * numeroParcelas;
  
  // Solicitar crédito
  const { data: credito, error } = await supabase
    .from('creditos_documentacao')
    .insert({
      broker_id,
      imobiliaria_id,
      cliente_id,
      transacao_id,
      tipo_transacao,
      valor_transacao,
      descricao_transacao,
      data_transacao: data_transacao || new Date().toISOString().split('T')[0],
      custos_totais,
      taxa_imobiliaria: 2.0,
      taxa_cartorio: 1.5,
      taxa_outros: 0.5,
      valor_financiado: valorFinanciado,
      parcelas_desejadas: numeroParcelas,
      juros_mensais: juros_mensais || 2.99,
      valor_parcela_calculado: valorParcela,
      total_juros: totalJuros,
      status_credito: 'pendente',
      fintech_parceira: 'sb_fintech',
      id_transacao_fintech: 'SB-' + Date.now()
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao solicitar crédito: ${error.message}`);
  }
  
  return {
    id: credito.id,
    transacao_id: credito.transacao_id,
    tipo_transacao: credito.tipo_transacao,
    valor_transacao: credito.valor_transacao,
    custos_totais: credito.custos_totais,
    valor_financiado: credito.valor_financiado,
    parcelas_desejadas: credito.parcelas_desejadas,
    juros_mensais: credito.juros_mensais,
    valor_parcela_calculado: credito.valor_parcela_calculado,
    total_juros: credito.total_juros,
    total_pago: credito.total_pago,
    status_credito: credito.status_credito
  };
}

async function aprovarCredito(dados: any): Promise<CreditoDocumentacaoResponse['credito_aprovado']> {
  const { credito_id, status_aprovacao } = dados;
  
  // Validar dados obrigatórios
  if (!credito_id || !status_aprovacao) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Buscar crédito
  const { data: credito, error } = await supabase
    .from('creditos_documentacao')
    .select('*')
    .eq('id', credito_id)
    .single();
  
  if (error || !credito) {
    throw new Error('Crédito não encontrado');
  }
  
  // Validar status
  if (!['aprovado', 'rejeitado'].includes(status_aprovacao)) {
    throw new Error('Status de aprovação inválido');
  }
  
  if (status_aprovacao === 'rejeitado') {
    // Rejeitar crédito
    const { data: creditoRejeitado } = await supabase
      .from('creditos_documentacao')
      .update({
        status_credito: 'rejeitado',
        data_aprovacao: new Date().toISOString()
      })
      .eq('id', credito_id)
      .select('*')
      .single();
    
    return {
      id: creditoRejeitado.id,
      status_credito: creditoRejeitado.status_credito,
      data_aprovacao: creditoRejeitado.data_aprovacao,
      data_primeira_parcela: creditoRejeitado.data_primeira_parcela,
      data_ultima_parcela: creditoRejeitado.data_ultima_parcela,
      parcelas_geradas: []
    };
  }
  
  // Aprovar crédito e gerar parcelas
  const dataPrimeiraParcela = new Date();
  dataPrimeiraParcela.setDate(dataPrimeiraParcela.getDate() + 30);
  
  const dataUltimaParcela = new Date(dataPrimeiraParcela);
  dataUltimaParcela.setMonth(dataUltimaParcela.getMonth() + credito.parcelas_desejadas);
  
  // Atualizar status do crédito
  const { data: creditoAprovado } = await supabase
    .from('creditos_documentacao')
    .update({
      status_credito: 'aprovado',
      data_aprovacao: new Date().toISOString(),
      data_primeira_parcela: dataPrimeiraParcela.toISOString(),
      data_ultima_parcela: dataUltimaParcela.toISOString()
    })
    .eq('id', credito_id)
    .select('*')
    .single();
  
  // Gerar parcelas
  const parcelas = [];
  for (let i = 1; i <= credito.parcelas_desejadas; i++) {
    const dataVencimento = new Date(dataPrimeiraParcela);
    dataVencimento.setMonth(dataVencimento.getMonth() + (i - 1));
    
    const { data: parcela } = await supabase
      .from('parcelas_credito')
      .insert({
        credito_id,
        numero_parcela: i,
        valor_parcela: credito.valor_parcela_calculado,
        valor_juros: credito.total_juros / credito.parcelas_desejadas,
        data_vencimento: dataVencimento.toISOString().split('T')[0],
        status_parcela: 'pendente'
      })
      .select('*')
      .single();
    
    parcelas.push({
      numero_parcela: parcela.numero_parcela,
      valor_parcela: parcela.valor_parcela,
      valor_juros: parcela.valor_juros,
      valor_principal: parcela.valor_principal,
      data_vencimento: parcela.data_vencimento
    });
  }
  
  // Gerar rebate de originação (33/33/33)
  const valorRebate = credito.valor_financiado * 0.05; // 5% do valor financiado
  
  const { data: rebate } = await supabase
    .from('rebate_origenacao')
    .insert({
      credito_id,
      transacao_origem: `CRED-${credito.id}`,
      valor_total_rebate: valorRebate,
      sb_percent: 33.33,
      imobiliaria_percent: 33.33,
      corretor_percent: 33.34,
      imobiliaria_id: credito.imobiliaria_id,
      broker_id: credito.broker_id,
      status_rebate: 'pendente'
    })
    .select('*')
    .single();
  
  return {
    id: creditoAprovado.id,
    status_credito: creditoAprovado.status_credito,
    data_aprovacao: creditoAprovado.data_aprovacao,
    data_primeira_parcela: creditoAprovado.data_primeira_parcela,
    data_ultima_parcela: creditoAprovado.data_ultima_parcela,
    parcelas_geradas: parcelas
  };
}

async function consultarParcelas(dados: any): Promise<CreditoDocumentacaoResponse['parcelas_consultadas']> {
  const { credito_id } = dados;
  
  // Validar dados obrigatórios
  if (!credito_id) {
    throw new Error('ID do crédito não fornecido');
  }
  
  // Buscar parcelas
  const { data: parcelas, error } = await supabase
    .from('parcelas_credito')
    .select('*')
    .eq('credito_id', credito_id)
    .order('numero_parcela', { ascending: true });
  
  if (error) {
    throw new Error(`Erro ao consultar parcelas: ${error.message}`);
  }
  
  // Calcular totais
  const totalParcelas = parcelas.length;
  const parcelasPendentes = parcelas.filter(p => p.status_parcela === 'pendente').length;
  const parcelasPagas = parcelas.filter(p => p.status_parcela === 'paga').length;
  const parcelasAtrasadas = parcelas.filter(p => p.status_parcela === 'atrasada').length;
  
  const valorTotalPendente = parcelas
    .filter(p => p.status_parcela === 'pendente')
    .reduce((sum, p) => sum + p.valor_parcela, 0);
  
  const valorTotalPago = parcelas
    .filter(p => p.status_parcela === 'paga')
    .reduce((sum, p) => sum + p.valor_parcela, 0);
  
  return {
    credito_id,
    total_parcelas: totalParcelas,
    parcelas_pendentes: parcelasPendentes,
    parcelas_pagas: parcelasPagas,
    parcelas_atrasadas: parcelasAtrasadas,
    valor_total_pendente: valorTotalPendente,
    valor_total_pago: valorTotalPago,
    detalhes_parcelas: parcelas.map(p => ({
      numero_parcela: p.numero_parcela,
      valor_parcela: p.valor_parcela,
      valor_juros: p.valor_juros,
      valor_principal: p.valor_principal,
      data_vencimento: p.data_vencimento,
      data_pagamento: p.data_pagamento,
      status_parcela: p.status_parcela,
      dias_atraso: p.dias_atraso
    }))
  };
}

async function processarRebate(dados: any): Promise<CreditoDocumentacaoResponse['rebate_processado']> {
  const { rebate_id } = dados;
  
  // Validar dados obrigatórios
  if (!rebate_id) {
    throw new Error('ID do rebate não fornecido');
  }
  
  // Buscar rebate
  const { data: rebate, error } = await supabase
    .from('rebate_origenacao')
    .select('*')
    .eq('id', rebate_id)
    .single();
  
  if (error || !rebate) {
    throw new Error('Rebate não encontrado');
  }
  
  // Processar distribuição
  const { data: rebateProcessado } = await supabase
    .from('rebate_origenacao')
    .update({
      status_rebate: 'distribuido',
      data_processamento: new Date().toISOString(),
      data_distribuicao: new Date().toISOString(),
      sb_pago: true,
      imobiliaria_pago: true,
      corretor_pago: true
    })
    .eq('id', rebate_id)
    .select('*')
    .single();
  
  // Registrar transações bancárias
  await supabase
    .from('transacoes_bancarias_detalhadas')
    .insert([
      {
        data_transacao: new Date().toISOString().split('T')[0],
        tipo_transacao: 'rebate_origenacao',
        valor_transacao: rebateProcessado.valor_sb,
        origem_id: rebateProcessado.id,
        origem_tipo: 'rebate_origenacao',
        status_transacao: 'concluida',
        data_conclusao: new Date().toISOString(),
        hash_transacao: 'SB-REBATE-' + Date.now()
      },
      {
        data_transacao: new Date().toISOString().split('T')[0],
        tipo_transacao: 'rebate_origenacao',
        valor_transacao: rebateProcessado.valor_imobiliaria,
        origem_id: rebateProcessado.id,
        origem_tipo: 'rebate_origenacao',
        imobiliaria_id: rebateProcessado.imobiliaria_id,
        status_transacao: 'concluida',
        data_conclusao: new Date().toISOString(),
        hash_transacao: 'IM-REBATE-' + Date.now()
      },
      {
        data_transacao: new Date().toISOString().split('T')[0],
        tipo_transacao: 'rebate_origenacao',
        valor_transacao: rebateProcessado.valor_corretor,
        origem_id: rebateProcessado.id,
        origem_tipo: 'rebate_origenacao',
        broker_id: rebateProcessado.corretor_id,
        status_transacao: 'concluida',
        data_conclusao: new Date().toISOString(),
        hash_transacao: 'BR-REBATE-' + Date.now()
      }
    ]);
  
  return {
    id: rebateProcessado.id,
    transacao_origem: rebateProcessado.transacao_origem,
    valor_total_rebate: rebateProcessado.valor_total_rebate,
    split_distribuicao: {
      sb: rebateProcessado.valor_sb,
      imobiliaria: rebateProcessado.valor_imobiliaria,
      corretor: rebateProcessado.valor_corretor
    },
    status_rebate: rebateProcessado.status_rebate,
    data_distribuicao: rebateProcessado.data_distribuicao
  };
}

async function consultarFluxo(dados: any): Promise<CreditoDocumentacaoResponse['fluxo_consultado']> {
  const { imobiliaria_id, data_inicio, data_fim } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id) {
    throw new Error('ID da imobiliária não fornecido');
  }
  
  // Buscar fluxo bancário consolidado
  let query = supabase
    .from('fluxo_bancario_consolidado')
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
  
  const { data: fluxo, error } = await query.order('data_consolidacao', { ascending: false });
  
  if (error) {
    throw new Error(`Erro ao consultar fluxo: ${error.message}`);
  }
  
  // Buscar transações detalhadas
  const { data: transacoes } = await supabase
    .from('transacoes_bancarias_detalhadas')
    .select('*')
    .eq('imobiliaria_id', imobiliaria_id)
    .in('tipo_transacao', ['comissao_financiamento', 'rebate_origenacao', 'parcela_credito'])
    .order('data_transacao', { ascending: false })
    .limit(50);
  
  // Calcular totais do período
  const totalCreditosConcedidos = fluxo.reduce((sum, f) => sum + f.total_creditos_concedidos, 0);
  const totalParcelasRecebidas = fluxo.reduce((sum, f) => sum + f.total_parcelas_recebidas, 0);
  const totalJurosRecebidos = fluxo.reduce((sum, f) => sum + f.total_juros_recebidos, 0);
  const totalRebatesGerados = fluxo.reduce((sum, f) => sum + f.total_rebates_gerados, 0);
  const totalRebatesDistribuidos = fluxo.reduce((sum, f) => sum + f.total_rebates_distribuidos, 0);
  const lucroLiquido = fluxo.reduce((sum, f) => sum + f.lucro_liquido, 0);
  const margemLucro = fluxo.length > 0 ? fluxo.reduce((sum, f) => sum + f.margem_lucro, 0) / fluxo.length : 0;
  
  return {
    periodo_consulta: data_inicio && data_fim ? `${data_inicio} a ${data_fim}` : 'Mês atual',
    total_creditos_concedidos: totalCreditosConcedidos,
    total_parcelas_recebidas: totalParcelasRecebidas,
    total_juros_recebidos: totalJurosRecebidos,
    total_rebates_gerados: totalRebatesGerados,
    total_rebates_distribuidos: totalRebatesDistribuidos,
    lucro_liquido: lucroLiquido,
    margem_lucro: margemLucro,
    detalhes_transacoes: (transacoes || []).map(t => ({
      data_transacao: t.data_transacao,
      tipo_transacao: t.tipo_transacao,
      valor_transacao: t.valor_transacao,
      status_transacao: t.status_transacao
    }))
  };
}

// Endpoint para consultas específicas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const broker_id = searchParams.get('broker_id');
    const imobiliaria_id = searchParams.get('imobiliaria_id');
    const credito_id = searchParams.get('credito_id');
    
    if (tipo === 'creditos' && broker_id) {
      return await consultarCreditosBroker(broker_id);
    }
    
    if (tipo === 'rebates' && imobiliaria_id) {
      return await consultarRebatesImobiliaria(imobiliaria_id);
    }
    
    if (tipo === 'parcelas_vencidas') {
      return await consultarParcelasVencidas();
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

async function consultarCreditosBroker(brokerId: string): Promise<NextResponse> {
  // Buscar créditos do broker
  const { data: creditos } = await supabase
    .from('creditos_documentacao')
    .select('*')
    .eq('broker_id', brokerId)
    .order('created_at', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: creditos || [],
    message: 'Créditos consultados com sucesso'
  });
}

async function consultarRebatesImobiliaria(imobiliariaId: string): Promise<NextResponse> {
  // Buscar rebates da imobiliária
  const { data: rebates } = await supabase
    .from('rebate_origenacao')
    .select('*')
    .eq('imobiliaria_id', imobiliariaId)
    .order('created_at', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: rebates || [],
    message: 'Rebates consultados com sucesso'
  });
}

async function consultarParcelasVencidas(): Promise<NextResponse> {
  // Buscar parcelas vencidas (atrasadas)
  const hoje = new Date().toISOString().split('T')[0];
  
  const { data: parcelas } = await supabase
    .from('parcelas_credito')
    .select(`
      *,
      creditos_documentacao!inner(
        broker_id,
        imobiliaria_id,
        cliente_id
      )
    `)
    .lt('data_vencimento', hoje)
    .in('status_parcela', ['pendente', 'atrasada'])
    .order('data_vencimento', { ascending: true });
  
  return NextResponse.json({
    success: true,
    data: parcelas || [],
    message: 'Parcelas vencidas consultadas com sucesso'
  });
}
