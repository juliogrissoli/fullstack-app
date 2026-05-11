// 🏛️ SECURITY BROKER SB v20 - MATCH DE AUTÔNOMOS & SPLIT
// API de Match de Autônomos com Split de Mesa

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { Resend } from 'resend';

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

interface MatchAutonomosRequest {
  acao: 'criar_match' | 'processar_pagamento' | 'consultar_extrato' | 'liberar_comissoes';
  dados?: {
    imovel_id?: string;
    captador_id?: string;
    parceiro_id?: string;
    vendedor_id?: string;
    cliente_id?: string;
    valor_imovel?: number;
    comissao_percentual?: number;
    gateway_pagamento?: string;
    match_id?: string;
    broker_id?: string;
    data_inicio?: string;
    data_fim?: string;
    dossiê_100_percent?: boolean;
    nota_fiscal_validada?: boolean;
  };
}

interface MatchAutonomosResponse {
  success: boolean;
  match_criado?: {
    id: string;
    imovel_id: string;
    captador_id: string;
    parceiro_id: string;
    vendedor_id: string;
    valor_imovel: number;
    comissao_total: number;
    hash_nexo_causal: string;
    split_distribuicao: {
      captador: number;
      parceiro: number;
      vendedor: number;
      sb_system: number;
    };
    status_match: string;
    status_disponibilidade: string;
  };
  pagamento_processado?: {
    processamento_id: string;
    valor_total: number;
    gateway: string;
    participantes: Array<{
      tipo: string;
      valor: number;
      broker_id?: string;
    }>;
    status: string;
  };
  extrato_detalhado?: Array<{
    match_id: string;
    tipo_participacao: string;
    comissao_total: number;
    sua_parte: number;
    saldo_reinvestimento: number;
    status_comissao: string;
    motivo_bloqueio?: string;
    data_liberacao_parcial?: string;
    data_liberacao_total?: string;
  }>
  liberacao_efetuada?: {
    mensagem: string;
    comissoes_liberadas: number;
    valor_total_liberado: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: MatchAutonomosRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🏛️ Match Autônomos: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'criar_match':
        resultado = await criarMatch(dados);
        break;
      case 'processar_pagamento':
        resultado = await processarPagamento(dados);
        break;
      case 'consultar_extrato':
        resultado = await consultarExtrato(dados);
        break;
      case 'liberar_comissoes':
        resultado = await liberarComissoes(dados);
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
    console.error('Erro no Match Autônomos:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Match Autônomos',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * 🏛️ CONDUÇÃO DE DECISÃO PATRIMONIAL
 * Esta operação representa uma CONDUÇÃO DE DECISÃO PATRIMONIAL e não uma simples venda.
 * O Match de Autônomos é um processo estruturado que conecta os profissionais do ecossistema SB
 * para facilitar a condução patrimonial do cliente, com split de 4 vias e nexo causal digital.
 */
async function criarMatch(dados: any): Promise<MatchAutonomosResponse['match_criado']> {
  const { imovel_id, captador_id, parceiro_id, vendedor_id, cliente_id, valor_imovel, comissao_percentual } = dados;
  
  // Validar dados obrigatórios
  if (!imovel_id || !captador_id || !parceiro_id || !vendedor_id || !cliente_id || !valor_imovel || !comissao_percentual) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Validar se é um match (captador != vendedor)
  if (captador_id === vendedor_id) {
    throw new Error('Captador e Vendedor devem ser diferentes para criar um Match');
  }
  
  // Calcular comissão total
  const comissaoTotal: number = valor_imovel * (comissao_percentual / 100);
  
  // Gerar hash SHA-256 para nexo causal ANTES de criar o match
  const dadosMatch = {
    imovel_id,
    captador_id,
    parceiro_id,
    vendedor_id,
    cliente_id,
    valor_imovel,
    comissao_total: comissaoTotal,
    comissao_percentual,
    timestamp: new Date().toISOString()
  };
  
  const hashNexoCausal = createHash('sha256')
    .update(JSON.stringify(dadosMatch))
    .digest('hex');
  
  // Criar match com nexo causal
  const { data: match, error } = await supabase
    .from('matches_autonomos')
    .insert({
      imovel_id,
      captador_id,
      parceiro_id,
      vendedor_id,
      cliente_id,
      valor_imovel,
      comissao_total: comissaoTotal,
      comissao_percentual,
      hash_nexo_causal: hashNexoCausal,
      status_match: 'pendente',
      status_disponibilidade: 'bloqueado',
      motivo_bloqueio: 'dossiê_incompleto'
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao criar match: ${error.message}`);
  }
  
  // Criar notificações
  await supabase
    .from('notificacoes')
    .insert([
      {
        broker_id: captador_id,
        tipo: 'match_autonomos',
        titulo: 'Match de Autônomos Criado',
        mensagem: `Novo match criado com valor de R$ ${valor_imovel.toFixed(2)}`,
        status: 'nao_lida'
      },
      {
        broker_id: parceiro_id,
        tipo: 'match_autonomos',
        titulo: 'Participação em Match',
        mensagem: `Você foi selecionado como parceiro em um match`,
        status: 'nao_lida'
      },
      {
        broker_id: vendedor_id,
        tipo: 'match_autonomos',
        titulo: 'Participação em Match',
        mensagem: `Você foi selecionado como vendedor em um match`,
        status: 'nao_lida'
      }
    ]);
  
  // Calcular Split de 4 Vias (Captador 10%, Parceiro 30%, Vendedor 40%, SB 20%)
  const splitCaptador: number = comissaoTotal * 0.10;
  const splitParceiro: number = comissaoTotal * 0.30;
  const splitVendedor: number = comissaoTotal * 0.40;
  const splitSB: number = comissaoTotal * 0.20;
  
  // Atualizar match com split calculado
  await supabase
    .from('matches_autonomos')
    .update({
      captador_parte: splitCaptador,
      parceiro_parte: splitParceiro,
      vendedor_parte: splitVendedor,
      sb_system_parte: splitSB
    })
    .eq('id', match.id);
  
  return {
    id: match.id,
    imovel_id: match.imovel_id,
    captador_id: match.captador_id,
    parceiro_id: match.parceiro_id,
    vendedor_id: match.vendedor_id,
    valor_imovel: match.valor_imovel,
    comissao_total: comissaoTotal,
    hash_nexo_causal: hashNexoCausal,
    split_distribuicao: {
      captador: splitCaptador,
      parceiro: splitParceiro,
      vendedor: splitVendedor,
      sb_system: splitSB
    },
    status_match: match.status_match,
    status_disponibilidade: match.status_disponibilidade
  };
}

async function processarPagamento(dados: any): Promise<MatchAutonomosResponse['pagamento_processado']> {
  const { match_id, gateway_pagamento } = dados;
  
  // Validar dados obrigatórios
  if (!match_id) {
    throw new Error('ID do match não fornecido');
  }
  
  // Processar pagamento integral
  const { data: resultado, error } = await supabase
    .rpc('processar_pagamento_integral', {
      p_match_id: match_id,
      p_gateway: gateway_pagamento || 'stripe'
    });
  
  if (error) {
    throw new Error(`Erro ao processar pagamento: ${error.message}`);
  }
  
  // Atualizar status do match
  await supabase
    .from('matches_autonomos')
    .update({
      status_match: 'concluido',
      data_fechamento: new Date().toISOString(),
      status_pagamento: 'pago',
      data_pagamento: new Date().toISOString()
    })
    .eq('id', match_id);
  
  return {
    processamento_id: resultado.processamento_id,
    valor_total: resultado.valor_total,
    gateway: gateway_pagamento || 'stripe',
    participantes: resultado.participantes,
    status: 'concluido'
  };
}

async function consultarExtrato(dados: any): Promise<MatchAutonomosResponse['extrato_detalhado']> {
  const { broker_id, data_inicio, data_fim } = dados;
  
  // Validar dados obrigatórios
  if (!broker_id) {
    throw new Error('ID do broker não fornecido');
  }
  
  // Gerar extrato detalhado
  const { data: extrato, error } = await supabase
    .rpc('gerar_extrato_detalhado', {
      p_broker_id: broker_id,
      p_data_inicio: data_inicio,
      p_data_fim: data_fim
    });
  
  if (error) {
    throw new Error(`Erro ao consultar extrato: ${error.message}`);
  }
  
  return extrato;
}

async function liberarComissoes(dados: any): Promise<MatchAutonomosResponse['liberacao_efetuada']> {
  const { match_id, dossiê_100_percent, nota_fiscal_validada } = dados;
  
  // Validar dados obrigatórios
  if (!match_id) {
    throw new Error('ID do match não fornecido');
  }
  
  // Atualizar status do match
  const { data: match, error } = await supabase
    .from('matches_autonomos')
    .update({
      dossiê_100_percent: dossiê_100_percent || false,
      nota_fiscal_validada: nota_fiscal_validada || false
    })
    .eq('id', match_id)
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao liberar comissões: ${error.message}`);
  }
  
  // Contar comissões liberadas
  const { data: transacoes } = await supabase
    .from('transacoes_split_mesa')
    .select('valor_liquido')
    .eq('match_autonomo_id', match_id)
    .eq('status_transacao', 'disponivel');
  
  const valorTotalLiberado = transacoes?.reduce((sum, t) => sum + t.valor_liquido, 0) || 0;
  
  return {
    mensagem: dossiê_100_percent && nota_fiscal_validada 
      ? 'Comissões totalmente liberadas' 
      : 'Comissões parcialmente liberadas',
    comissoes_liberadas: transacoes?.length || 0,
    valor_total_liberado: valorTotalLiberado
  };
}

// Endpoint para consultar dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const broker_id = searchParams.get('broker_id');
    const tipo = searchParams.get('tipo');
    
    if (tipo === 'dashboard' && broker_id) {
      return await consultarDashboard(broker_id);
    }
    
    if (tipo === 'matches_pendentes') {
      return await consultarMatchesPendentes();
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

async function consultarDashboard(brokerId: string): Promise<NextResponse> {
  // Buscar dashboard completo
  const { data: dashboard, error } = await supabase
    .from('extrato_consolidado_autonomos')
    .select('*')
    .eq('broker_id', brokerId)
    .single();
  
  if (error) {
    throw new Error(`Erro ao consultar dashboard: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: dashboard,
    message: 'Dashboard consultado com sucesso'
  });
}

async function consultarMatchesPendentes(): Promise<NextResponse> {
  // Buscar matches pendentes
  const { data: matches } = await supabase
    .from('dashboard_match_autonomos')
    .select('*')
    .eq('status_match', 'pendente')
    .order('created_at', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: matches,
    message: 'Matches pendentes consultados com sucesso'
  });
}
