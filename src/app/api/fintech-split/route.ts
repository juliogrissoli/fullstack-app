// 🏛️ SECURITY BROKER SB v15 - MÓDULO FINTECH (SPLIT DE MESA)
// Integração API com gateways, Split de Pagamentos e Retenção Técnica

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

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

interface FinTechSplitRequest {
  transacao_id?: string;
  venda_id?: string;
  gateway_id: string;
  valor_total: number;
  tipo_transacao: 'entrada_reserva' | 'parcela' | 'comissao' | 'multa';
  forma_pagamento: 'cartao_credito' | 'pix' | 'boleto' | 'transferencia';
  parcelas?: number;
  numero_parcela?: number;
  dados_pagamento?: {
    numero_cartao?: string;
    cvv?: string;
    validade?: string;
    nome_titular?: string;
    cpf_titular?: string;
    chave_pix?: string;
    email?: string;
  };
}

interface FinTechSplitResponse {
  success: boolean;
  transacao?: {
    id: string;
    status: string;
    valor_total: number;
    gateway_transacao_id: string;
    data_aprovacao?: string;
    split_processado: boolean;
    retencao_tecnica: boolean;
    condicao_liberacao: string;
  };
  split_mesa?: {
    percentual_sb: number;
    valor_sb: number;
    percentual_corretor: number;
    valor_corretor: number;
    percentual_incorporadora: number;
    valor_incorporadora: number;
    status_distribuicao: string;
  };
  webhook_url?: string;
  proximos_passos?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: FinTechSplitRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!body.gateway_id || !body.valor_total || !body.tipo_transacao || !body.forma_pagamento) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }

    // Processar transação FinTech
    const resultado = await processarTransacaoFinTech(request, body);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Transação FinTech processada com sucesso'
    });

  } catch (error: any) {
    console.error('Erro no Módulo FinTech:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Módulo FinTech',
      details: error.message
    }, { status: 500 });
  }
}

async function processarTransacaoFinTech(request: NextRequest, body: FinTechSplitRequest): Promise<FinTechSplitResponse> {
  const { gateway_id, valor_total, tipo_transacao, forma_pagamento, dados_pagamento } = body;
  
  // 1. Buscar dados do gateway
  const { data: gateway, error: errorGateway } = await supabase
    .from('gateway_pagamentos')
    .select('*')
    .eq('id', gateway_id)
    .eq('status', 'ativo')
    .single();
  
  if (errorGateway || !gateway) {
    throw new Error('Gateway de pagamento não encontrado ou inativo');
  }
  
  // 2. Criar transação inicial
  const { data: transacao, error: errorTransacao } = await supabase
    .from('transacoes_pagamento')
    .insert({
      gateway_id,
      valor_total,
      valor_original: valor_total,
      tipo_transacao,
      forma_pagamento,
      parcelas: body.parcelas || 1,
      numero_parcela: body.numero_parcela || 1,
      status: 'pendente',
      retencao_tecnica: true, // Por padrão, fica retido
      condicao_liberacao: 'upload_nf', // Padrão: upload de NF
      dados_gateway: dados_pagamento || {},
      ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      user_agent: request.headers.get('user-agent') || 'SB Sistema'
    })
    .select('*')
    .single();
  
  if (errorTransacao) {
    throw new Error(`Erro ao criar transação: ${errorTransacao.message}`);
  }
  
  // 3. Processar pagamento no gateway
  const resultadoGateway = await processarPagamentoGateway(gateway, transacao, dados_pagamento);
  
  // 4. Atualizar status da transação
  const { data: transacaoAtualizada, error: errorAtualizacao } = await supabase
    .from('transacoes_pagamento')
    .update({
      status: resultadoGateway.status,
      gateway_transacao_id: resultadoGateway.gateway_transacao_id,
      gateway_status: resultadoGateway.gateway_status,
      data_aprovacao: resultadoGateway.data_aprovacao,
      dados_gateway: resultadoGateway.dados_resposta
    })
    .eq('id', transacao.id)
    .select('*')
    .single();
  
  if (errorAtualizacao) {
    throw new Error(`Erro ao atualizar transação: ${errorAtualizacao.message}`);
  }
  
  // 5. Gerar split automático se aprovado
  let splitMesa;
  if (resultadoGateway.status === 'aprovado') {
    splitMesa = await gerarSplitMesa(transacaoAtualizada);
  }
  
  // 6. Gerar próximos passos
  const proximosPassos = gerarProximosPassos(transacaoAtualizada, splitMesa);
  
  return {
    success: true,
    transacao: {
      id: transacaoAtualizada.id,
      status: transacaoAtualizada.status,
      valor_total: transacaoAtualizada.valor_total,
      gateway_transacao_id: transacaoAtualizada.gateway_transacao_id,
      data_aprovacao: transacaoAtualizada.data_aprovacao,
      split_processado: transacaoAtualizada.split_processado,
      retencao_tecnica: transacaoAtualizada.retencao_tecnica,
      condicao_liberacao: transacaoAtualizada.condicao_liberacao
    },
    split_mesa: splitMesa,
    webhook_url: gateway.webhook_url,
    proximos_passos: proximosPassos
  };
}

async function processarPagamentoGateway(gateway: any, transacao: any, dadosPagamento?: any): Promise<{
  status: string;
  gateway_transacao_id: string;
  gateway_status: string;
  data_aprovacao?: string;
  dados_resposta: any;
}> {
  // Simulação de processamento em gateway real
  // Em produção, integrar com APIs reais dos gateways
  
  const gatewayTransacaoId = `gw_${gateway.nome.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Simulação baseada no tipo de gateway e forma de pagamento
  let status = 'aprovado';
  let gatewayStatus = 'approved';
  let dataAprovacao: string | undefined;
  let dadosResposta: any = {};
  
  switch (gateway.nome.toLowerCase()) {
    case 'stripe':
      dadosResposta = await processarStripe(transacao, dadosPagamento);
      break;
    case 'mercado pago':
      dadosResposta = await processarMercadoPago(transacao, dadosPagamento);
      break;
    case 'picpay':
      dadosResposta = await processarPicPay(transacao, dadosPagamento);
      break;
    case 'gerencianet':
      dadosResposta = await processarGerencianet(transacao, dadosPagamento);
      break;
    case 'pagseguro':
      dadosResposta = await processarPagSeguro(transacao, dadosPagamento);
      break;
    default:
      dadosResposta = { status: 'processed', transaction_id: gatewayTransacaoId };
  }
  
  // Simulação de aprovação (90% de chance)
  if (Math.random() > 0.1) {
    dataAprovacao = new Date().toISOString();
  } else {
    status = 'rejeitado';
    gatewayStatus = 'rejected';
  }
  
  return {
    status,
    gateway_transacao_id: gatewayTransacaoId,
    gateway_status: gatewayStatus,
    data_aprovacao: dataAprovacao,
    dados_resposta: dadosResposta
  };
}

async function processarStripe(transacao: any, dadosPagamento?: any): Promise<any> {
  // Simulação de integração com Stripe
  return {
    id: `ch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    object: 'charge',
    amount: transacao.valor_total * 100, // Stripe trabalha em centavos
    currency: 'brl',
    status: 'succeeded',
    payment_method: dadosPagamento?.numero_cartao ? 'card' : 'pix',
    created: Math.floor(Date.now() / 1000)
  };
}

async function processarMercadoPago(transacao: any, dadosPagamento?: any): Promise<any> {
  // Simulação de integração com Mercado Pago
  return {
    id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: 'approved',
    payment_type_id: transacao.forma_pagamento === 'pix' ? 'pix' : 'credit_card',
    transaction_amount: transacao.valor_total,
    date_approved: new Date().toISOString()
  };
}

async function processarPicPay(transacao: any, dadosPagamento?: any): Promise<any> {
  // Simulação de integração com PicPay
  return {
    referenceId: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: 'paid',
    paymentUrl: `https://picpay.me/payment/${Date.now()}`,
    value: transacao.valor_total,
    createdAt: new Date().toISOString()
  };
}

async function processarGerencianet(transacao: any, dadosPagamento?: any): Promise<any> {
  // Simulação de integração com Gerencianet
  return {
    charge_id: `charge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: 'paid',
    value: transacao.valor_total,
    payment_method: transacao.forma_pagamento,
    created_at: new Date().toISOString()
  };
}

async function processarPagSeguro(transacao: any, dadosPagamento?: any): Promise<any> {
  // Simulação de integração com PagSeguro
  return {
    code: `code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: 'paid',
    paymentMethod: {
      type: transacao.forma_pagamento
    },
    grossAmount: transacao.valor_total,
    date: new Date().toISOString()
  };
}

async function gerarSplitMesa(transacao: any): Promise<FinTechSplitResponse['split_mesa']> {
  // Buscar percentual de comissão do corretor
  const { data: broker, error: errorBroker } = await supabase
    .from('brokers')
    .select('comissao_percentual')
    .eq('id', transacao.broker_id)
    .single();
  
  if (errorBroker) {
    throw new Error(`Erro ao buscar dados do corretor: ${errorBroker.message}`);
  }
  
  // Calcular valores do split
  const percentualSB = 2.0;
  const percentualCorretor = broker.comissao_percentual || 4.0;
  const percentualIncorporadora = 100.0 - percentualSB - percentualCorretor;
  
  const valorSB = transacao.valor_total * (percentualSB / 100);
  const valorCorretor = transacao.valor_total * (percentualCorretor / 100);
  const valorIncorporadora = transacao.valor_total * (percentualIncorporadora / 100);
  
  // Criar split de mesa
  const { data: split, error: errorSplit } = await supabase
    .from('split_mesa')
    .insert({
      transacao_id: transacao.id,
      percentual_corretor: percentualCorretor,
      valor_corretor: valorCorretor,
      percentual_incorporadora: percentualIncorporadora,
      valor_incorporadora: valorIncorporadora,
      status_sb: transacao.retencao_tecnica ? 'pendente' : 'processado',
      status_corretor: transacao.retencao_tecnica ? 'pendente' : 'processado',
      status_incorporadora: 'processado', // Incorporadora sempre recebe
      data_pagamento_incorporadora: new Date().toISOString()
    })
    .select('*')
    .single();
  
  if (errorSplit) {
    throw new Error(`Erro ao criar split de mesa: ${errorSplit.message}`);
  }
  
  // Atualizar transação
  await supabase
    .from('transacoes_pagamento')
    .update({
      split_processado: true,
      split_data_processamento: new Date().toISOString()
    })
    .eq('id', transacao.id);
  
  return {
    percentual_sb: percentualSB,
    valor_sb: valorSB,
    percentual_corretor: percentualCorretor,
    valor_corretor: valorCorretor,
    percentual_incorporadora: percentualIncorporadora,
    valor_incorporadora: valorIncorporadora,
    status_distribuicao: transacao.retencao_tecnica ? 'parcial' : 'completo'
  };
}

function gerarProximosPassos(transacao: any, split?: any): string[] {
  const passos: string[] = [];
  
  if (transacao.status === 'pendente') {
    passos.push('Aguardando processamento no gateway de pagamento');
  } else if (transacao.status === 'aprovado') {
    passos.push('Pagamento aprovado com sucesso');
    
    if (transacao.retencao_tecnica) {
      passos.push(`Comissão retida aguardando ${transacao.condicao_liberacao === 'upload_nf' ? 'upload da Nota Fiscal' : 'validação biométrica'}`);
      
      if (transacao.condicao_liberacao === 'upload_nf') {
        passos.push('Acesse a área deNFs para fazer o upload da nota fiscal');
        passos.push('Após validação, a comissão será liberada para saque');
      } else {
        passos.push('Cliente deve realizar validação biométrica no App SB');
        passos.push('Após validação, a comissão será liberada automaticamente');
      }
    } else {
      passos.push('Comissão liberada e disponível para saque');
    }
    
    if (split) {
      passos.push(`Split processado: SB R$${split.valor_sb.toFixed(2)} | Corretor R$${split.valor_corretor.toFixed(2)} | Incorporadora R$${split.valor_incorporadora.toFixed(2)}`);
    }
  } else if (transacao.status === 'rejeitado') {
    passos.push('Pagamento rejeitado pelo gateway');
    passos.push('Verifique os dados e tente novamente');
  }
  
  return passos;
}

// Endpoint para liberar retenção técnica
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { transacao_id, tipo_liberacao, documento_id } = body; // tipo_liberacao: 'upload_nf' ou 'biometria'
    
    if (!transacao_id || !tipo_liberacao) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }
    
    // Buscar transação
    const { data: transacao, error: errorTransacao } = await supabase
      .from('transacoes_pagamento')
      .select('*')
      .eq('id', transacao_id)
      .single();
    
    if (errorTransacao || !transacao) {
      return NextResponse.json({
        success: false,
        error: 'Transação não encontrada'
      }, { status: 404 });
    }
    
    if (!transacao.retencao_tecnica) {
      return NextResponse.json({
        success: false,
        error: 'Transação não possui retenção técnica'
      }, { status: 400 });
    }
    
    // Liberar retenção técnica
    const { data: transacaoAtualizada, error: errorAtualizacao } = await supabase
      .from('transacoes_pagamento')
      .update({
        retencao_tecnica: false,
        condicao_liberacao: tipo_liberacao,
        documento_liberacao_id: documento_id,
        data_liberacao: new Date().toISOString(),
        status_liberacao: 'liberado'
      })
      .eq('id', transacao_id)
      .select('*')
      .single();
    
    if (errorAtualizacao) {
      throw new Error(`Erro ao liberar retenção técnica: ${errorAtualizacao.message}`);
    }
    
    // Liberar split do corretor
    const { data: splitAtualizado, error: errorSplit } = await supabase
      .from('split_mesa')
      .update({
        status_corretor: 'processado',
        data_pagamento_corretor: new Date().toISOString()
      })
      .eq('transacao_id', transacao_id)
      .single();
    
    if (errorSplit) {
      throw new Error(`Erro ao liberar split: ${errorSplit.message}`);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        transacao: transacaoAtualizada,
        split: splitAtualizado,
        mensagem: 'Retenção técnica liberada com sucesso'
      }
    });
    
  } catch (error: any) {
    console.error('Erro ao liberar retenção técnica:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao liberar retenção técnica',
      details: error.message
    }, { status: 500 });
  }
}

// Endpoint para consultar transações
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const broker_id = searchParams.get('broker_id');
    const incorporadora_id = searchParams.get('incorporadora_id');
    const status = searchParams.get('status');
    const tipo_transacao = searchParams.get('tipo_transacao');
    
    let query = supabase
      .from('transacoes_com_split')
      .select('*');
    
    if (broker_id) {
      query = query.eq('broker_id', broker_id);
    }
    
    if (incorporadora_id) {
      query = query.eq('incorporadora_id', incorporadora_id);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (tipo_transacao) {
      query = query.eq('tipo_transacao', tipo_transacao);
    }
    
    const { data, error } = await query
      .order('data_aprovacao', { ascending: false })
      .limit(100);
    
    if (error) {
      throw new Error(`Erro ao consultar transações: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      data: data || [],
      message: 'Transações consultadas com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar transações:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar transações',
      details: error.message
    }, { status: 500 });
  }
}
