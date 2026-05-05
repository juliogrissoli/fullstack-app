// 🏛️ SECURITY BROKER SB v13 - MOTOR FINANCEIRO (CONTRATOS REAIS)
// Setup D+10/D+30, Split de Gestão 2% VGV, Success Fee 6%, Penalidade de Mora

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MotorFinanceiroRequest {
  incorporadora_id: string;
  tipo_acao: 'setup' | 'split_vgv' | 'success_fee' | 'penalidade_mora';
  dados?: {
    valor_setup?: number;
    tipo_setup?: 'basico' | 'premium';
    venda_id?: string;
    valor_venda?: number;
    comissao_id?: string;
    dias_atraso?: number;
  };
}

interface MotorFinanceiroResponse {
  success: boolean;
  resultado?: {
    setup?: {
      valor: number;
      data_vencimento: string;
      status: string;
      proxima_cobranca: string;
    };
    split_gestao?: {
      valor_venda: number;
      percentual_gestao: number;
      valor_gestao: number;
      status: string;
      data_vencimento: string;
    };
    success_fee?: {
      valor_captado: number;
      percentual_fee: number;
      valor_fee: number;
      status: string;
    };
    penalidade?: {
      valor_original: number;
      dias_atraso: number;
      multa_percentual: number;
      multa_valor: number;
      juros_percentual: number;
      juros_valor: number;
      valor_total: number;
    };
  };
  alertas?: Array<{
    tipo: string;
    mensagem: string;
    nivel: 'info' | 'alerta' | 'critico';
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: MotorFinanceiroRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!body.incorporadora_id || !body.tipo_acao) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }

    // Executar ação do motor financeiro
    const resultado = await executarMotorFinanceiro(body);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Motor Financeiro executado com sucesso'
    });

  } catch (error: any) {
    console.error('Erro no Motor Financeiro:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Motor Financeiro',
      details: error.message
    }, { status: 500 });
  }
}

async function executarMotorFinanceiro(request: MotorFinanceiroRequest): Promise<MotorFinanceiroResponse> {
  const { incorporadora_id, tipo_acao, dados } = request;
  
  switch (tipo_acao) {
    case 'setup':
      return await processarSetup(incorporadora_id, dados);
    case 'split_vgv':
      return await processarSplitVGV(incorporadora_id, dados);
    case 'success_fee':
      return await processarSuccessFee(incorporadora_id, dados);
    case 'penalidade_mora':
      return await processarPenalidadeMora(incorporadora_id, dados);
    default:
      throw new Error('Tipo de ação inválido');
  }
}

async function processarSetup(incorporadora_id: string, dados?: any): Promise<MotorFinanceiroResponse> {
  // Valores padrão conforme contrato
  const valorSetup = dados?.valor_setup || (dados?.tipo_setup === 'basico' ? 55000 : 135000);
  
  // Verificar se já tem setup pendente
  const { data: setupExistente, error: errorExistente } = await supabase
    .from('aportes_setup')
    .select('*')
    .eq('incorporadora_id', incorporadora_id)
    .eq('tipo', 'setup')
    .eq('status', 'pendente')
    .single();
  
  if (!errorExistente && setupExistente) {
    throw new Error('Já existe um setup pendente para esta incorporadora');
  }
  
  // Calcular datas D+10/D+30
  const dataAporte = new Date();
  const dataVencimentoD10 = new Date(dataAporte);
  dataVencimentoD10.setDate(dataAporte.getDate() + 10);
  
  const dataVencimentoD30 = new Date(dataAporte);
  dataVencimentoD30.setDate(dataAporte.getDate() + 30);
  
  // Criar registro de setup
  const { data: setup, error: errorSetup } = await supabase
    .from('aportes_setup')
    .insert({
      incorporadora_id,
      valor: valorSetup,
      tipo: 'setup',
      data_aporte: dataAporte.toISOString(),
      data_vencimento: dados?.tipo_setup === 'basico' ? dataVencimentoD10.toISOString() : dataVencimentoD30.toISOString(),
      status: 'pendente',
      metodo_pagamento: 'transferencia',
      referencia: `Setup SB - ${dados?.tipo_setup || 'premium'}`
    })
    .select('*')
    .single();
  
  if (errorSetup) {
    throw new Error(`Erro ao criar setup: ${errorSetup.message}`);
  }
  
  // Criar notificação
  await supabase
    .from('notificacoes')
    .insert({
      incorporadora_id,
      tipo: 'alerta',
      titulo: 'Setup SB Criado',
      mensagem: `Setup de R$ ${valorSetup.toLocaleString('pt-BR')} criado. Vencimento em ${dados?.tipo_setup === 'basico' ? 'D+10' : 'D+30'}.`,
      status: 'nao_lida'
    });
  
  const alertas = gerarAlertasSetup(setup);
  
  return {
    success: true,
    resultado: {
      setup: {
        valor: setup.valor,
        data_vencimento: setup.data_vencimento,
        status: setup.status,
        proxima_cobranca: setup.data_vencimento
      }
    },
    alertas
  };
}

async function processarSplitVGV(incorporadora_id: string, dados?: any): Promise<MotorFinanceiroResponse> {
  if (!dados?.venda_id || !dados?.valor_venda) {
    throw new Error('Dados da venda são obrigatórios para split de VGV');
  }
  
  // Calcular split de gestão (2% sobre VGV)
  const percentualGestao = 2.0;
  const valorGestao = dados.valor_venda * (percentualGestao / 100);
  
  // Data de vencimento (padrão: 5 dias após a venda)
  const dataVencimento = new Date();
  dataVencimento.setDate(dataVencimento.getDate() + 5);
  
  // Criar registro de comissão com split de gestão
  const { data: comissao, error: errorComissao } = await supabase
    .from('comissoes')
    .insert({
      venda_id: dados.venda_id,
      corretor_id: dados.corretor_id || '00000000-0000-0000-0000-000000000000',
      valor_total: dados.valor_venda,
      percentual_gestao: percentualGestao,
      data_vencimento: dataVencimento.toISOString(),
      status: 'pendente'
    })
    .select('*')
    .single();
  
  if (errorComissao) {
    throw new Error(`Erro ao criar split de gestão: ${errorComissao.message}`);
  }
  
  // Atualizar venda com split de gestão
  await supabase
    .from('vendas')
    .update({
      comissao_gestao: valorGestao,
      updated_at: new Date().toISOString()
    })
    .eq('id', dados.venda_id);
  
  const alertas = gerarAlertasSplitVGV(comissao);
  
  return {
    success: true,
    resultado: {
      split_gestao: {
        valor_venda: dados.valor_venda,
        percentual_gestao: percentualGestao,
        valor_gestao: valorGestao,
        status: comissao.status,
        data_vencimento: comissao.data_vencimento
      }
    },
    alertas
  };
}

async function processarSuccessFee(incorporadora_id: string, dados?: any): Promise<MotorFinanceiroResponse> {
  if (!dados?.valor_captado) {
    throw new Error('Valor captado é obrigatório para Success Fee');
  }
  
  // Calcular Success Fee (6% sobre captação)
  const percentualFee = 6.0;
  const valorFee = dados.valor_captado * (percentualFee / 100);
  
  // Data de vencimento (padrão: 7 dias após captação)
  const dataVencimento = new Date();
  dataVencimento.setDate(dataVencimento.getDate() + 7);
  
  // Criar registro de Success Fee
  const { data: successFee, error: errorSuccessFee } = await supabase
    .from('comissoes')
    .insert({
      venda_id: dados.venda_id || '00000000-0000-0000-0000-000000000000',
      corretor_id: dados.corretor_id || '00000000-0000-0000-0000-000000000000',
      valor_total: dados.valor_captado,
      percentual_sb: percentualFee,
      valor_sb: valorFee,
      data_vencimento: dataVencimento.toISOString(),
      status: 'pendente'
    })
    .select('*')
    .single();
  
  if (errorSuccessFee) {
    throw new Error(`Erro ao criar Success Fee: ${errorSuccessFee.message}`);
  }
  
  // Adicionar à wallet de créditos (20% do faturamento B2B)
  await supabase
    .from('wallet_creditos')
    .insert({
      incorporadora_id,
      tipo: 'success_fee',
      valor: valorFee * 0.20, // 20% do Success Fee
      origem: 'faturamento_b2b',
      status: 'disponivel',
      data_expiracao: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 dias
    });
  
  const alertas = gerarAlertasSuccessFee(successFee);
  
  return {
    success: true,
    resultado: {
      success_fee: {
        valor_captado: dados.valor_captado,
        percentual_fee: percentualFee,
        valor_fee: valorFee,
        status: successFee.status
      }
    },
    alertas
  };
}

async function processarPenalidadeMora(incorporadora_id: string, dados?: any): Promise<MotorFinanceiroResponse> {
  if (!dados?.comissao_id) {
    throw new Error('ID da comissão é obrigatório para penalidade de mora');
  }
  
  // Buscar comissão
  const { data: comissao, error: errorComissao } = await supabase
    .from('comissoes')
    .select('*')
    .eq('id', dados.comissao_id)
    .single();
  
  if (errorComissao || !comissao) {
    throw new Error('Comissão não encontrada');
  }
  
  // Verificar se está atrasada
  const dataVencimento = new Date(comissao.data_vencimento);
  const hoje = new Date();
  const diasAtraso = Math.floor((hoje.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diasAtraso <= 0) {
    throw new Error('Comissão não está atrasada');
  }
  
  // Calcular penalidade (10% multa + 1% juros ao mês)
  const multaPercentual = 10.0;
  const multaValor = comissao.valor_corretor * (multaPercentual / 100);
  
  const jurosPercentual = 1.0; // 1% ao mês
  const jurosMeses = Math.ceil(diasAtraso / 30); // Juros por mês completo
  const jurosValor = comissao.valor_corretor * (jurosPercentual / 100) * jurosMeses;
  
  const valorTotal = comissao.valor_corretor + multaValor + jurosValor;
  
  // Atualizar comissão com penalidade
  const { data: comissaoAtualizada, error: errorAtualizacao } = await supabase
    .from('comissoes')
    .update({
      status: 'atrasado',
      multa_atraso: multaValor,
      juros_atraso: jurosValor,
      valor_total_recebido: valorTotal,
      updated_at: new Date().toISOString()
    })
    .eq('id', dados.comissao_id)
    .select('*')
    .single();
  
  if (errorAtualizacao) {
    throw new Error(`Erro ao aplicar penalidade: ${errorAtualizacao.message}`);
  }
  
  // Notificar broker
  await supabase
    .from('notificacoes')
    .insert({
      broker_id: comissao.corretor_id,
      tipo: 'alerta',
      titulo: 'Penalidade de Mora Aplicada',
      mensagem: `Penalidade aplicada: ${diasAtraso} dias de atraso. Multa de R$ ${multaValor.toLocaleString('pt-BR')} e juros de R$ ${jurosValor.toLocaleString('pt-BR')}. Total: R$ ${valorTotal.toLocaleString('pt-BR')}.`,
      status: 'nao_lida'
    });
  
  const alertas = gerarAlertasPenalidade(comissaoAtualizada);
  
  return {
    success: true,
    resultado: {
      penalidade: {
        valor_original: comissao.valor_corretor,
        dias_atraso: diasAtraso,
        multa_percentual: multaPercentual,
        multa_valor: multaValor,
        juros_percentual: jurosPercentual,
        juros_valor: jurosValor,
        valor_total: valorTotal
      }
    },
    alertas
  };
}

function gerarAlertasSetup(setup: any): MotorFinanceiroResponse['alertas'] {
  const alertas: MotorFinanceiroResponse['alertas'] = [];
  
  const valor = setup.valor;
  if (valor >= 100000) {
    alertas.push({
      tipo: 'valor_alto',
      mensagem: `Setup de alto valor: R$ ${valor.toLocaleString('pt-BR')}`,
      nivel: 'alerta'
    });
  }
  
  const dataVencimento = new Date(setup.data_vencimento);
  const diasParaVencimento = Math.ceil((dataVencimento.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  if (diasParaVencimento <= 5) {
    alertas.push({
      tipo: 'vencimento_proximo',
      mensagem: `Vencimento em ${diasParaVencimento} dias`,
      nivel: 'critico'
    });
  }
  
  return alertas;
}

function gerarAlertasSplitVGV(comissao: any): MotorFinanceiroResponse['alertas'] {
  const alertas: MotorFinanceiroResponse['alertas'] = [];
  
  const valorGestao = comissao.valor_gestao;
  if (valorGestao >= 10000) {
    alertas.push({
      tipo: 'split_alto',
      mensagem: `Split de gestão de alto valor: R$ ${valorGestao.toLocaleString('pt-BR')}`,
      nivel: 'info'
    });
  }
  
  return alertas;
}

function gerarAlertasSuccessFee(successFee: any): MotorFinanceiroResponse['alertas'] {
  const alertas: MotorFinanceiroResponse['alertas'] = [];
  
  const valorFee = successFee.valor_sb;
  if (valorFee >= 50000) {
    alertas.push({
      tipo: 'success_fee_alto',
      mensagem: `Success Fee de alto valor: R$ ${valorFee.toLocaleString('pt-BR')}`,
      nivel: 'alerta'
    });
  }
  
  return alertas;
}

function gerarAlertasPenalidade(comissao: any): MotorFinanceiroResponse['alertas'] {
  const alertas: MotorFinanceiroResponse['alertas'] = [];
  
  const totalPenalidade = comissao.multa_atraso + comissao.juros_atraso;
  if (totalPenalidade >= 1000) {
    alertas.push({
      tipo: 'penalidade_alta',
      mensagem: `Penalidade de alta: R$ ${totalPenalidade.toLocaleString('pt-BR')}`,
      nivel: 'critico'
    });
  }
  
  return alertas;
}

// Endpoint para consultar status financeiro
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const incorporadora_id = searchParams.get('incorporadora_id');
    const tipo = searchParams.get('tipo'); // setup, split, success_fee, penalidade
    
    if (!incorporadora_id) {
      return NextResponse.json({
        success: false,
        error: 'incorporadora_id é obrigatório'
      }, { status: 400 });
    }
    
    let query;
    
    switch (tipo) {
      case 'setup':
        query = supabase
          .from('aportes_setup')
          .select('*')
          .eq('incorporadora_id', incorporadora_id)
          .eq('tipo', 'setup')
          .order('created_at', { ascending: false });
        break;
      case 'split':
        query = supabase
          .from('comissoes')
          .select(`
            *,
            vendas!inner(
              id,
              valor_venda,
              leads!inner(
                id,
                nome
              )
            )
          `)
          .eq('vendas.incorporadora_id', incorporadora_id)
          .gt('percentual_gestao', 0)
          .order('created_at', { ascending: false });
        break;
      case 'success_fee':
        query = supabase
          .from('comissoes')
          .select('*')
          .eq('incorporadora_id', incorporadora_id)
          .gt('percentual_sb', 0)
          .order('created_at', { ascending: false });
        break;
      case 'penalidade':
        query = supabase
          .from('comissoes')
          .select('*')
          .eq('status', 'atrasado')
          .order('created_at', { ascending: false });
        break;
      default:
        query = supabase
          .from('comissoes')
          .select('*')
          .eq('incorporadora_id', incorporadora_id)
          .order('created_at', { ascending: false });
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Erro ao consultar dados: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      data: data || [],
      message: 'Dados financeiros consultados com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar status financeiro:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar status',
      details: error.message
    }, { status: 500 });
  }
}
