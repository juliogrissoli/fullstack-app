// 🏛️ SECURITY BROKER SB v18 - GESTÃO DE CRÉDITOS SB_CREDITS
// Wallet de Créditos com Expiração TTL e Reversão Automática

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CreditosRequest {
  acao: 'criar_wallet' | 'gerar_credito' | 'consultar_saldo' | 'usar_credito' | 'consultar_transacoes';
  dados?: {
    broker_id?: string;
    origem_transacao?: string;
    id_origem?: string;
    descricao_transacao?: string;
    valor_transacao?: number;
    tipo_melhoria?: string;
    custo_creditos?: number;
  };
}

interface CreditosResponse {
  success: boolean;
  wallet_criada?: {
    id: string;
    saldo_disponivel: number;
    saldo_bloqueado: number;
    limite_credito: number;
    nivel_credito: string;
    status: string;
  };
  credito_gerado?: {
    id: string;
    valor_transacao: number;
    saldo_antes: number;
    saldo_depois: number;
    data_expiracao: string;
    notificacoes_60d: boolean;
    notificacoes_30d: boolean;
    notificacoes_7d: boolean;
  };
  saldo_disponivel?: {
    wallet_id: string;
    saldo_disponivel: number;
    saldo_bloqueado: number;
    saldo_total: number;
    nivel_credito: string;
    score_credito: number;
  };
  transacoes?: Array<{
    id: string;
    tipo_transacao: string;
    valor_transacao: number;
    saldo_antes: number;
    saldo_depois: number;
    origem_transacao: string;
    data_transacao: string;
    data_expiracao: string;
    status_expiracao: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreditosRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🏛️ Créditos SB: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'criar_wallet':
        resultado = await criarWalletCreditos(dados);
        break;
      case 'gerar_credito':
        resultado = await gerarCreditoSB(dados);
        break;
      case 'consultar_saldo':
        resultado = await consultarSaldoCreditos(dados);
        break;
      case 'usar_credito':
        resultado = await usarCreditoSB(dados);
        break;
      case 'consultar_transacoes':
        resultado = await consultarTransacoesCreditos(dados);
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
    console.error('Erro na Gestão de Créditos:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno na Gestão de Créditos',
      details: error.message
    }, { status: 500 });
  }
}

async function criarWalletCreditos(dados: any): Promise<CreditosResponse['wallet_criada']> {
  const { broker_id } = dados;
  
  // Validar broker
  const { data: broker, error: errorBroker } = await supabase
    .from('brokers')
    .select('*')
    .eq('id', broker_id)
    .single();
  
  if (errorBroker || !broker) {
    throw new Error('Broker não encontrado');
  }
  
  // Verificar se wallet já existe
  const { data: walletExistente } = await supabase
    .from('wallet_creditos_sb')
    .select('*')
    .eq('broker_id', broker_id)
    .single();
  
  if (walletExistente) {
    return {
      id: walletExistente.id,
      saldo_disponivel: walletExistente.saldo_disponivel,
      saldo_bloqueado: walletExistente.saldo_bloqueado,
      limite_credito: walletExistente.limite_credito,
      nivel_credito: walletExistente.nivel_credito,
      status: walletExistente.status
    };
  }
  
  // Criar nova wallet
  const { data: wallet, error: errorWallet } = await supabase
    .from('wallet_creditos_sb')
    .insert({
      broker_id,
      saldo_disponivel: 0.00,
      saldo_bloqueado: 0.00,
      limite_credito: 5000.00, // R$ 5.000 padrão
      score_credito: 0.00,
      nivel_credito: 'basico',
      status: 'ativo'
    })
    .select('*')
    .single();
  
  if (errorWallet) {
    throw new Error(`Erro ao criar wallet: ${errorWallet.message}`);
  }
  
  // Criar notificação
  await supabase
    .from('notificacoes')
    .insert({
      broker_id,
      tipo: 'creditos',
      titulo: 'Wallet SB_CREDITS Criada',
      mensagem: 'Sua wallet de créditos foi criada com sucesso.',
      status: 'nao_lida'
    });
  
  return {
    id: wallet.id,
    saldo_disponivel: wallet.saldo_disponivel,
    saldo_bloqueado: wallet.saldo_bloqueado,
    limite_credito: wallet.limite_credito,
    nivel_credito: wallet.nivel_credito,
    status: wallet.status
  };
}

async function gerarCreditoSB(dados: any): Promise<CreditosResponse['credito_gerado']> {
  const { broker_id, origem_transacao, id_origem, descricao_transacao, valor_transacao } = dados;
  
  // Validar dados
  if (!broker_id || !origem_transacao || !valor_transacao) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Buscar wallet do broker
  const { data: wallet, error: errorWallet } = await supabase
    .from('wallet_creditos_sb')
    .select('*')
    .eq('broker_id', broker_id)
    .eq('status', 'ativo')
    .single();
  
  if (errorWallet || !wallet) {
    throw new Error('Wallet não encontrada ou inativa');
  }
  
  // Verificar limite
  const novoSaldoDisponivel = wallet.saldo_disponivel + valor_transacao;
  if (novoSaldoDisponivel > wallet.limite_credito) {
    throw new Error('Limite de crédito excedido');
  }
  
  // Gerar crédito (ganho)
  const dataExpiracao = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 dias
  
  const { data: transacao, error: errorTransacao } = await supabase
    .from('transacoes_creditos')
    .insert({
      wallet_id: wallet.id,
      tipo_transacao: 'ganho',
      valor_transacao,
      saldo_antes: wallet.saldo_disponivel,
      saldo_depois: novoSaldoDisponivel,
      origem_transacao,
      id_origem,
      descricao_transacao,
      data_expiracao: dataExpiracao.toISOString().split('T')[0],
      notificado_60d: false,
      notificado_30d: false,
      notificado_7d: false
    })
    .select('*')
    .single();
  
  if (errorTransacao) {
    throw new Error(`Erro ao gerar crédito: ${errorTransacao.message}`);
  }
  
  // Atualizar wallet
  await supabase
    .from('wallet_creditos_sb')
    .update({
      saldo_disponivel: novoSaldoDisponivel,
      saldo_total: novoSaldoDisponivel,
      data_ultima_atualizacao: new Date().toISOString(),
      score_credito: Math.min(wallet.score_credito + 1, 100) // Aumentar score
    })
    .eq('id', wallet.id);
  
  // Criar notificação
  await supabase
    .from('notificacoes')
    .insert({
      broker_id,
      tipo: 'creditos',
      titulo: 'Crédito Gerado',
      mensagem: `Crédito de R$ ${valor_transacao.toFixed(2)} gerado com expiração em 90 dias.`,
      status: 'nao_lida'
    });
  
  return {
    id: transacao.id,
    valor_transacao: transacao.valor_transacao,
    saldo_antes: transacao.saldo_antes,
    saldo_depois: transacao.saldo_depois,
    data_expiracao: transacao.data_expiracao,
    notificacoes_60d: transacao.notificado_60d,
    notificacoes_30d: transacao.notificado_30d,
    notificacoes_7d: transacao.notificado_7d
  };
}

async function consultarSaldoCreditos(dados: any): Promise<CreditosResponse['saldo_disponivel']> {
  const { broker_id } = dados;
  
  // Buscar wallet com informações do broker
  const { data: wallet, error } = await supabase
    .from('wallet_creditos_sb')
    .select(`
      *,
      brokers!inner(
        id,
        nome,
        email,
        score_meritocracia
      )
    `)
    .eq('broker_id', broker_id)
    .single();
  
  if (error || !wallet) {
    throw new Error('Wallet não encontrada');
  }
  
  return {
    wallet_id: wallet.id,
    saldo_disponivel: wallet.saldo_disponivel,
    saldo_bloqueado: wallet.saldo_bloqueado,
    saldo_total: wallet.saldo_total,
    nivel_credito: wallet.nivel_credito,
    score_credito: wallet.score_credito
  };
}

async function usarCreditoSB(dados: any): Promise<CreditosResponse['credito_gerado']> {
  const { broker_id, origem_transacao, id_origem, descricao_transacao, valor_transacao } = dados;
  
  // Validar dados
  if (!broker_id || !origem_transacao || !valor_transacao) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Buscar wallet do broker
  const { data: wallet, error: errorWallet } = await supabase
    .from('wallet_creditos_sb')
    .select('*')
    .eq('broker_id', broker_id)
    .eq('status', 'ativo')
    .single();
  
  if (errorWallet || !wallet) {
    throw new Error('Wallet não encontrada ou inativa');
  }
  
  // Verificar saldo disponível
  if (valor_transacao > wallet.saldo_disponivel) {
    throw new Error('Saldo insuficiente');
  }
  
  // Usar crédito (gasto)
  const novoSaldoDisponivel = wallet.saldo_disponivel - valor_transacao;
  const novoSaldoBloqueado = wallet.saldo_bloqueado + valor_transacao;
  
  const { data: transacao, error: errorTransacao } = await supabase
    .from('transacoes_creditos')
    .insert({
      wallet_id: wallet.id,
      tipo_transacao: 'gasto',
      valor_transacao,
      saldo_antes: wallet.saldo_disponivel,
      saldo_depois: novoSaldoDisponivel,
      origem_transacao,
      id_origem,
      descricao_transacao
    })
    .select('*')
    .single();
  
  if (errorTransacao) {
    throw new Error(`Erro ao usar crédito: ${errorTransacao.message}`);
  }
  
  // Atualizar wallet
  await supabase
    .from('wallet_creditos_sb')
    .update({
      saldo_disponivel: novoSaldoDisponivel,
      saldo_bloqueado: novoSaldoBloqueado,
      saldo_total: novoSaldoDisponivel + novoSaldoBloqueado,
      data_ultima_atualizacao: new Date().toISOString()
    })
    .eq('id', wallet.id);
  
  // Criar notificação
  await supabase
    .from('notificacoes')
    .insert({
      broker_id,
      tipo: 'creditos',
      titulo: 'Crédito Utilizado',
      mensagem: `Crédito de R$ ${valor_transacao.toFixed(2)} utilizado com sucesso.`,
      status: 'nao_lida'
    });
  
  return {
    id: transacao.id,
    valor_transacao: transacao.valor_transacao,
    saldo_antes: transacao.saldo_antes,
    saldo_depois: transacao.saldo_depois,
    data_expiracao: transacao.data_expiracao,
    notificacoes_60d: transacao.notificado_60d,
    notificacoes_30d: transacao.notificado_30d,
    notificacoes_7d: transacao.notificado_7d
  };
}

async function consultarTransacoesCreditos(dados: any): Promise<CreditosResponse['transacoes']> {
  const { broker_id } = dados;
  
  // Buscar transações do broker
  const { data: transacoes, error } = await supabase
    .from('transacoes_creditos')
    .select(`
      *,
      wallet_creditos_sb!inner(
        broker_id
      )
    `)
    .eq('wallet_creditos_sb.broker_id', broker_id)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    throw new Error(`Erro ao consultar transações: ${error.message}`);
  }
  
  // Formatar transações
  const transacoesFormatadas = transacoes.map(transacao => ({
    id: transacao.id,
    tipo_transacao: transacao.tipo_transacao,
    valor_transacao: transacao.valor_transacao,
    saldo_antes: transacao.saldo_antes,
    saldo_depois: transacao.saldo_depois,
    origem_transacao: transacao.origem_transacao,
    data_transacao: transacao.created_at,
    data_expiracao: transacao.data_expiracao,
    status_expiracao: transacao.data_expiracao < new Date().toISOString().split('T')[0] ? 'expirado' : 'ativo'
  }));
  
  return transacoesFormatadas;
}

// Endpoint para verificar expiração (cron job)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const acao = searchParams.get('acao');
    
    if (acao === 'verificar_expiracao') {
      return await verificarExpiracaoCreditos();
    }
    
    return NextResponse.json({
      success: false,
      error: 'Ação inválida'
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Erro na verificação de expiração:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno na verificação',
      details: error.message
    }, { status: 500 });
  }
}

async function verificarExpiracaoCreditos(): Promise<NextResponse> {
  // Buscar créditos expirados não notificados
  const { data: creditosExpirados } = await supabase
    .from('transacoes_creditos')
    .select('*')
    .eq('tipo_transacao', 'ganho')
    .lt('data_expiracao', new Date().toISOString().split('T')[0])
    .eq('notificado_1_dia', false)
    .order('data_expiracao', { ascending: true });
  
  if (!creditosExpirados || creditosExpirados.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        mensagem: 'Nenhum crédito expirado encontrado',
        total_processado: 0
      }
    });
  }
  
  // Processar expiração
  const resultados = [];
  
  for (const credito of creditosExpirados) {
    // Criar transação de expiração
    const { data: transacaoExpiracao } = await supabase
      .from('transacoes_creditos')
      .insert({
        wallet_id: credito.wallet_id,
        tipo_transacao: 'expiracao',
        valor_transacao: credito.valor_transacao,
        saldo_antes: credito.saldo_depois,
        saldo_depois: credito.saldo_depois - credito.valor_transacao,
        origem_transacao: 'expiracao_automatica',
        id_origem: credito.id,
        descricao_transacao: 'Crédito expirado após 90 dias'
      })
      .select('*')
      .single();
    
    // Atualizar notificação
    await supabase
      .from('transacoes_creditos')
      .update({
        notificado_1_dia: true
      })
      .eq('id', credito.id);
    
    // Enviar notificação (simulado)
    await supabase
      .from('notificacoes')
      .insert({
        broker_id: credito.wallet_creditos_sb.broker_id,
        tipo: 'creditos',
        titulo: 'Crédito Expirado',
        mensagem: `Crédito de R$ ${credito.valor_transacao.toFixed(2)} expirou.`,
        status: 'nao_lida'
      });
    
    resultados.push({
      credito_id: credito.id,
      valor: credito.valor_transacao,
      data_expiracao: credito.data_expiracao,
      status: 'expirado'
    });
  }
  
  return NextResponse.json({
    success: true,
    data: {
      mensagem: 'Créditos expirados processados',
      total_processado: resultados.length,
      creditos: resultados
    }
  });
}
