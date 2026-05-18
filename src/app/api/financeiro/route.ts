// 🏛️ SECURITY BROKER SB v13 - MOTOR FINANCEIRO E COMISSÕES
// Split Soberano: 2% Coordenação SB, 6% Success Fee, Cláusula de Dobro

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

interface ComissaoRequest {
  venda_id: string;
  corretor_id: string;
  valor_total: number;
  tipo_transacao: 'venda_unidade' | 'captacao_investimento';
  dados_adicionais?: {
    success_fee_percentual?: number;
    forma_pagamento?: string;
    prazo_dias?: number;
  };
}

interface ComissaoResponse {
  success: boolean;
  comissao_id?: string;
  detalhes_comissao?: {
    valor_total: number;
    percentual_coordenacao: number;
    valor_coordenacao: number;
    percentual_corretor: number;
    valor_corretor: number;
    percentual_sb: number;
    valor_sb: number;
    success_fee?: number;
    data_vencimento: string;
    status: string;
  };
  alertas?: Array<{
    tipo: string;
    mensagem: string;
    nivel: 'info' | 'alerta' | 'critico';
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: ComissaoRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!body.venda_id || !body.corretor_id || !body.valor_total) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }

    // Processar split de comissões
    const resultado = await processarSplitComissoes(body);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Split de comissões processado com sucesso'
    });

  } catch (error: any) {
    console.error('Erro no processamento de comissões:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no processamento de comissões',
      details: error.message
    }, { status: 500 });
  }
}

async function processarSplitComissoes(request: ComissaoRequest): Promise<ComissaoResponse['detalhes_comissao']> {
  const { venda_id, corretor_id, valor_total, tipo_transacao, dados_adicionais } = request;
  
  // Definir percentuais baseado no tipo de transação
  let percentualCoordenacao = 2.0; // 2% Coordenação SB (padrão)
  let percentualCorretor = 4.0; // 4% Corretor (padrão)
  let percentualSB = 6.0; // 6% Security Broker (padrão)
  let successFee = 0;
  
  if (tipo_transacao === 'captacao_investimento') {
    percentualCoordenacao = 0; // Sem coordenação em captação
    percentualCorretor = 0; // Sem corretor em captação
    percentualSB = dados_adicionais?.success_fee_percentual || 6.0; // Success Fee configurável
    successFee = valor_total * (percentualSB / 100);
  }
  
  // Calcular valores
  const valorCoordenacao = valor_total * (percentualCoordenacao / 100);
  const valorCorretor = valor_total * (percentualCorretor / 100);
  const valorSB = tipo_transacao === 'captacao_investimento' ? successFee : valor_total * (percentualSB / 100);
  
  // Definir data de vencimento (5 dias padrão, configurável)
  const prazoDias = dados_adicionais?.prazo_dias || 5;
  const dataVencimento = new Date();
  dataVencimento.setDate(dataVencimento.getDate() + prazoDias);
  
  // Inserir registro de comissão
  const comissaoData = {
    venda_id,
    corretor_id,
    valor_total,
    percentual_coordenacao: percentualCoordenacao,
    valor_coordenacao: valorCoordenacao,
    percentual_corretor: percentualCorretor,
    valor_corretor: valorCorretor,
    percentual_sb: percentualSB,
    valor_sb: valorSB,
    status: 'pendente',
    data_vencimento: dataVencimento.toISOString(),
    tipo_transacao,
    success_fee: successFee || undefined
  };
  
  const { data, error } = await supabase
    .from('comissoes')
    .insert(comissaoData)
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Erro ao inserir comissão: ${error.message}`);
  }
  
  // Atualizar venda com valores de comissão
  await supabase
    .from('vendas')
    .update({
      comissao_corretor: valorCorretor,
      comissao_coordenacao: valorCoordenacao,
      comissao_sb: valorSB,
      success_fee: successFee || undefined
    })
    .eq('id', venda_id);
  
  // Gerar alertas se necessário
  await gerarAlertasComissao({
    ...comissaoData,
    id: data.id
  });
  
  return {
    ...comissaoData
  };
}

async function gerarAlertasComissao(comissao: any): Promise<void> {
  const alertas: Array<{
    tipo: string;
    mensagem: string;
    nivel: 'info' | 'alerta' | 'critico';
  }> = [];
  
  // Alerta de valor alto
  if (comissao.valor_total > 1000000) {
    alertas.push({
      tipo: 'valor_alto',
      mensagem: `Transação de alto valor: R$ ${comissao.valor_total.toLocaleString('pt-BR')}`,
      nivel: 'alerta'
    });
  }
  
  // Alerta de prazo curto
  const dataVencimento = new Date(comissao.data_vencimento);
  const diasAteVencimento = Math.ceil((dataVencimento.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  if (diasAteVencimento < 3) {
    alertas.push({
      tipo: 'prazo_curto',
      mensagem: `Vencimento em ${diasAteVencimento} dias. Risco de atraso.`,
      nivel: 'critico'
    });
  }
  
  // Enviar notificações para alertas críticas
  for (const alerta of alertas) {
    if (alerta.nivel === 'critico') {
      await supabase
        .from('notificacoes')
        .insert({
          broker_id: comissao.corretor_id,
          tipo: 'alerta',
          titulo: 'Alerta de Comissão',
          mensagem: alerta.mensagem,
          status: 'nao_lida'
        });
    }
  }
}

// Endpoint para aplicar cláusula de dobro (multa 10% + juros 1%)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const comissaoId = searchParams.get('comissao_id');
    const acao = searchParams.get('acao'); // 'aplicar_multa' ou 'liquidar'
    
    if (!comissaoId || !acao) {
      return NextResponse.json({
        success: false,
        error: 'comissao_id e acao são obrigatórios'
      }, { status: 400 });
    }
    
    // Buscar comissão
    const { data: comissao, error } = await supabase
      .from('comissoes')
      .select('*')
      .eq('id', comissaoId)
      .single();
    
    if (error || !comissao) {
      return NextResponse.json({
        success: false,
        error: 'Comissão não encontrada'
      }, { status: 404 });
    }
    
    let resultado;
    
    if (acao === 'aplicar_multa') {
      resultado = await aplicarMultaAtraso(comissao);
    } else if (acao === 'liquidar') {
      resultado = await liquidarComissao(comissao);
    } else {
      return NextResponse.json({
        success: false,
        error: 'Ação inválida'
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: `Comissão ${acao === 'aplicar_multa' ? 'multa aplicada' : 'liquidada'} com sucesso`
    });
    
  } catch (error: any) {
    console.error('Erro ao processar cláusula de dobro:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao processar cláusula de dobro',
      details: error.message
    }, { status: 500 });
  }
}

async function aplicarMultaAtraso(comissao: any): Promise<any> {
  // Verificar se está atrasada
  const dataVencimento = new Date(comissao.data_vencimento);
  const hoje = new Date();
  
  if (dataVencimento > hoje) {
    throw new Error('Comissão não está atrasada');
  }
  
  // Calcular multa e juros
  const multa = comissao.valor_corretor * 0.10; // 10% de multa
  const juros = comissao.valor_corretor * 0.01; // 1% de juros
  const valorTotal = comissao.valor_corretor + multa + juros;
  
  // Atualizar comissão
  const { data, error } = await supabase
    .from('comissoes')
    .update({
      status: 'atrasado',
      multa_atraso: multa,
      juros_atraso: juros,
      valor_total_recebido: valorTotal,
      updated_at: new Date().toISOString()
    })
    .eq('id', comissao.id)
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao aplicar multa: ${error.message}`);
  }
  
  // Notificar corretor
  await supabase
    .from('notificacoes')
    .insert({
      broker_id: comissao.corretor_id,
      tipo: 'alerta',
      titulo: 'Cláusula de Dobro Aplicada',
      mensagem: `Multa de 10% (R$ ${multa.toLocaleString('pt-BR')}) e juros de 1% (R$ ${juros.toLocaleString('pt-BR')}) aplicados. Total a receber: R$ ${valorTotal.toLocaleString('pt-BR')}.`,
      status: 'nao_lida'
    });
  
  return data;
}

async function liquidarComissao(comissao: any): Promise<any> {
  // Calcular valor total (com multa e juros se houver)
  let valorTotal = comissao.valor_corretor;
  
  if (comissao.status === 'atrasado') {
    valorTotal = comissao.valor_total_recebido || comissao.valor_corretor;
  }
  
  // Atualizar status
  const { data, error } = await supabase
    .from('comissoes')
    .update({
      status: 'pago',
      data_pagamento: new Date().toISOString(),
      valor_total_recebido: valorTotal,
      updated_at: new Date().toISOString()
    })
    .eq('id', comissao.id)
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao liquidar comissão: ${error.message}`);
  }
  
  // Notificar corretor
  await supabase
    .from('notificacoes')
    .insert({
      broker_id: comissao.corretor_id,
      tipo: 'info',
      titulo: 'Comissão Liquidada',
      mensagem: `Comissão de R$ ${valorTotal.toLocaleString('pt-BR')} liquidada com sucesso.`,
      status: 'nao_lida'
    });
  
  return data;
}

// Endpoint para consultar comissões
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brokerId = searchParams.get('broker_id');
    const status = searchParams.get('status');
    const incorporadoraId = searchParams.get('incorporadora_id');
    
    let query = supabase
      .from('comissoes')
      .select(`
        *,
        vendas!inner(
          id,
          valor_venda,
          leads!inner(
            id,
            nome,
            cpf
          ),
          unidades!inner(
            id,
            numero,
            tipo
          )
        ),
        brokers!inner(
          id,
          nome
        )
      `);
    
    if (brokerId) {
      query = query.eq('corretor_id', brokerId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (incorporadoraId) {
      query = query.eq('incorporadora_id', incorporadoraId);
    }
    
    const { data, error } = await query
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Erro ao consultar comissões: ${error.message}`);
    }
    
    // Calcular estatísticas
    const estatisticas = {
      total_comissoes: data?.length || 0,
      valor_total: data?.reduce((sum, c) => sum + c.valor_corretor, 0) || 0,
      valor_recebido: data?.reduce((sum, c) => sum + (c.valor_total_recebido || 0), 0) || 0,
      pendentes: data?.filter(c => c.status === 'pendente').length || 0,
      atrasadas: data?.filter(c => c.status === 'atrasado').length || 0,
      pagas: data?.filter(c => c.status === 'pago').length || 0
    };
    
    return NextResponse.json({
      success: true,
      data: data || [],
      estatisticas,
      message: 'Comissões consultadas com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar comissões:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar comissões',
      details: error.message
    }, { status: 500 });
  }
}

// Endpoint para wallet de créditos (20% do faturamento B2B)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { incorporadora_id, tipo, valor } = body;
    
    if (!incorporadora_id || !tipo || !valor) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }
    
    // Adicionar crédito à wallet
    const { data, error } = await supabase
      .from('wallet_creditos')
      .insert({
        incorporadora_id,
        tipo,
        valor,
        origem: 'faturamento_b2b',
        status: 'disponivel',
        data_expiracao: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 dias
      })
      .select('*')
      .single();
    
    if (error) {
      throw new Error(`Erro ao adicionar crédito: ${error.message}`);
    }
    
    // Notificar incorporadora
    await supabase
      .from('notificacoes')
      .insert({
        incorporadora_id,
        tipo: 'info',
        titulo: 'Créditos Adicionados',
        mensagem: `R$ ${valor.toLocaleString('pt-BR')} em créditos adicionados à sua wallet.`,
        status: 'nao_lida'
      });
    
    return NextResponse.json({
      success: true,
      data,
      message: 'Créditos adicionados com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao adicionar créditos:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao adicionar créditos',
      details: error.message
    }, { status: 500 });
  }
}
