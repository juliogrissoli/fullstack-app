// 🏛️ SECURITY BROKER SB v16 - FUNDO DE INVESTIMENTO DOS CORRETORES
// Wallet de Investimento e Curadoria IA de Oportunidades

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

interface FundoInvestimentoRequest {
  broker_id: string;
  tipo_aplicacao: 'comissao' | 'recurso_proprio' | 'bonus';
  valor_aplicado: number;
  origem_recurso_id?: string;
  percentual_comissao_alocado?: number;
  prazo_lockup?: number;
}

interface FundoInvestimentoResponse {
  success: boolean;
  aplicacao_criada?: {
    id: string;
    valor_aplicado: number;
    cotacao_aplicacao: number;
    quantidade_cotas: number;
    valor_atual: number;
    rentabilidade_parcial: number;
    status: string;
    data_aplicacao: string;
  };
  performance_fundo?: {
    patrimonio_total: number;
    cotacao_atual: number;
    rentabilidade_mensal: number;
    rentabilidade_anual: number;
    total_investidores: number;
    sharpe_ratio: number;
  };
  oportunidades_curadoria?: Array<{
    id: string;
    nome_projeto: string;
    localizacao: { cidade: string; estado: string };
    dados_financeiros: {
      valor_minimo_aporte: number;
      roi_projetado: number;
      tir_projetada: number;
      payback_meses: number;
    };
    curadoria_ia: {
      score_oportunidade: number;
      recomendacao_ia: string;
      tags: string[];
    };
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: FundoInvestimentoRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!body.broker_id || !body.tipo_aplicacao || !body.valor_aplicado) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }

    // Processar aplicação no fundo
    const resultado = await processarAplicacaoFundo(body);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Aplicação no fundo processada com sucesso'
    });

  } catch (error: any) {
    console.error('Erro no Fundo de Investimento:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Fundo de Investimento',
      details: error.message
    }, { status: 500 });
  }
}

async function processarAplicacaoFundo(request: FundoInvestimentoRequest): Promise<FundoInvestimentoResponse['aplicacao_criada']> {
  const { broker_id, tipo_aplicacao, valor_aplicado, origem_recurso_id, percentual_comissao_alocado, prazo_lockup } = request;
  
  // 1. Validar broker
  const { data: broker, error: errorBroker } = await supabase
    .from('brokers')
    .select('*')
    .eq('id', broker_id)
    .single();
  
  if (errorBroker || !broker) {
    throw new Error('Broker não encontrado');
  }
  
  // 2. Buscar fundo ativo
  const { data: fundo, error: errorFundo } = await supabase
    .from('fundo_investimento_corretores')
    .select('*')
    .eq('status', 'ativo')
    .single();
  
  if (errorFundo || !fundo) {
    throw new Error('Fundo de investimento não encontrado ou inativo');
  }
  
  // 3. Validar valor mínimo
  if (valor_aplicado < fundo.investimento_minimo) {
    throw new Error(`Valor mínimo de aplicação é R$ ${fundo.investimento_minimo.toFixed(2)}`);
  }
  
  // 4. Criar aplicação
  const { data: aplicacao, error: errorAplicacao } = await supabase
    .from('wallet_investimento')
    .insert({
      broker_id,
      fundo_id: fundo.id,
      tipo_aplicacao,
      valor_aplicado,
      cotacao_aplicacao: fundo.cotacao_atual,
      origem_recurso_id,
      percentual_comissao_alocado: percentual_comissao_alocado || 0,
      data_aplicacao: new Date().toISOString().split('T')[0],
      prazo_lockup: prazo_lockup || 12,
      status: 'ativo'
    })
    .select('*')
    .single();
  
  if (errorAplicacao) {
    throw new Error(`Erro ao criar aplicação: ${errorAplicacao.message}`);
  }
  
  // 5. Atualizar total de cotas do fundo
  await supabase
    .from('fundo_investimento_corretores')
    .update({
      total_cotas_emitidas: fundo.total_cotas_emitidas + aplicacao.quantidade_cotas,
      patrimonio_total: fundo.patrimonio_total + valor_aplicado
    })
    .eq('id', fundo.id);
  
  // 6. Criar notificação
  await supabase
    .from('notificacoes')
    .insert({
      broker_id,
      tipo: 'investimento',
      titulo: 'Aplicação no Fundo Realizada',
      mensagem: `Aplicação de R$ ${valor_aplicado.toFixed(2)} realizada no fundo ${fundo.nome_fundo}.`,
      status: 'nao_lida'
    });
  
  return {
    id: aplicacao.id,
    valor_aplicado: aplicacao.valor_aplicado,
    cotacao_aplicacao: aplicacao.cotacao_aplicacao,
    quantidade_cotas: aplicacao.quantidade_cotas,
    valor_atual: aplicacao.valor_atual,
    rentabilidade_parcial: aplicacao.rentabilidade_parcial,
    status: aplicacao.status,
    data_aplicacao: aplicacao.data_aplicacao
  };
}

// Endpoint para consultar performance e curadoria
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const broker_id = searchParams.get('broker_id');
    const curadoria = searchParams.get('curadoria');
    const performance = searchParams.get('performance');
    
    if (curadoria === 'true' && broker_id) {
      return await consultarCuradoriaIA(broker_id);
    }
    
    if (performance === 'true') {
      return await consultarPerformanceFundo();
    }
    
    // Consultar wallet do broker
    if (broker_id) {
      return await consultarWalletBroker(broker_id);
    }
    
    return NextResponse.json({
      success: false,
      error: 'Parâmetros insuficientes'
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Erro ao consultar fundo:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar fundo',
      details: error.message
    }, { status: 500 });
  }
}

async function consultarCuradoriaIA(brokerId: string): Promise<NextResponse> {
  try {
    // Buscar curadoria de oportunidades
    const { data, error } = await supabase
      .rpc('curadoria_oportunidades_ia', {
        p_broker_id: brokerId,
        p_risco_maximo: 'medio',
        p_roi_minimo: 10.0
      });
    
    if (error) {
      throw new Error(`Erro na curadoria IA: ${error.message}`);
    }
    
    const resultado = Array.isArray(data) ? data[0] : data;
    
    // Formatar oportunidades
    const oportunidadesFormatadas = resultado.oportunidades.map((oportunidade: any) => ({
      id: oportunidade.id,
      nome_projeto: oportunidade.nome_projeto,
      localizacao: oportunidade.localizacao,
      dados_financeiros: oportunidade.dados_financeiros,
      curadoria_ia: oportunidade.curadoria_ia
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        broker: resultado.broker,
        criterios_busca: resultado.criterios_busca,
        oportunidades_encontradas: resultado.oportunidades_encontradas,
        oportunidades: oportunidadesFormatadas,
        resumo: resultado.resumo
      },
      message: 'Curadoria IA gerada com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro na curadoria IA:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno na curadoria IA',
      details: error.message
    }, { status: 500 });
  }
}

async function consultarPerformanceFundo(): Promise<NextResponse> {
  try {
    const { data, error } = await supabase
      .from('performance_fundo_investimento')
      .select('*')
      .single();
    
    if (error) {
      throw new Error(`Erro ao consultar performance: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      data: data,
      message: 'Performance do fundo consultada com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar performance:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar performance',
      details: error.message
    }, { status: 500 });
  }
}

async function consultarWalletBroker(brokerId: string): Promise<NextResponse> {
  try {
    const { data, error } = await supabase
      .from('wallet_investimento')
      .select(`
        *,
        fundo_investimento_corretores!inner(
          id,
          nome_fundo,
          cotacao_atual
        )
      `)
      .eq('broker_id', brokerId)
      .eq('status', 'ativo')
      .order('data_aplicacao', { ascending: false });
    
    if (error) {
      throw new Error(`Erro ao consultar wallet: ${error.message}`);
    }
    
    // Calcular totais
    const totalAplicado = data?.reduce((sum, item) => sum + item.valor_aplicado, 0) || 0;
    const totalAtual = data?.reduce((sum, item) => sum + item.valor_atual, 0) || 0;
    const rentabilidadeTotal = totalAplicado > 0 ? ((totalAtual - totalAplicado) / totalAplicado) * 100 : 0;
    
    return NextResponse.json({
      success: true,
      data: {
        aplicacoes: data || [],
        resumo: {
          total_aplicado: totalAplicado,
          total_atual: totalAtual,
          rentabilidade_total: Math.round(rentabilidadeTotal * 100) / 100,
          total_investimentos: data?.length || 0
        }
      },
      message: 'Wallet consultada com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar wallet:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar wallet',
      details: error.message
    }, { status: 500 });
  }
}

// Endpoint para resgate
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_id, broker_id, valor_resgate } = body;
    
    if (!wallet_id || !broker_id || !valor_resgate) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }
    
    // Buscar aplicação
    const { data: aplicacao, error: errorAplicacao } = await supabase
      .from('wallet_investimento')
      .select('*')
      .eq('id', wallet_id)
      .eq('broker_id', broker_id)
      .eq('status', 'ativo')
      .single();
    
    if (errorAplicacao || !aplicacao) {
      return NextResponse.json({
        success: false,
        error: 'Aplicação não encontrada ou já resgatada'
      }, { status: 404 });
    }
    
    // Validar valor de resgate
    if (valor_resgate > aplicacao.valor_atual) {
      return NextResponse.json({
        success: false,
        error: 'Valor de resgate maior que o valor atual'
      }, { status: 400 });
    }
    
    // Verificar lockup
    const dataAplicacao = new Date(aplicacao.data_aplicacao);
    const dataAtual = new Date();
    const mesesLockup = aplicacao.prazo_lockup || 12;
    const dataFimLockup = new Date(dataAplicacao);
    dataFimLockup.setMonth(dataFimLockup.getMonth() + mesesLockup);
    
    if (dataAtual < dataFimLockup) {
      return NextResponse.json({
        success: false,
        error: `Aplicação em período de lockup até ${dataFimLockup.toLocaleDateString('pt-BR')}`
      }, { status: 400 });
    }
    
    // Processar resgate
    const { data: resgate, error: errorResgate } = await supabase
      .from('wallet_investimento')
      .update({
        status: 'resgatado',
        data_resgate_efetivo: new Date().toISOString(),
        valor_resgate,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet_id)
      .select('*')
      .single();
    
    if (errorResgate) {
      throw new Error(`Erro ao processar resgate: ${errorResgate.message}`);
    }
    
    // Criar notificação
    await supabase
      .from('notificacoes')
      .insert({
        broker_id,
        tipo: 'resgate',
        titulo: 'Resgate Realizado',
        mensagem: `Resgate de R$ ${valor_resgate.toFixed(2)} realizado com sucesso.`,
        status: 'nao_lida'
      });
    
    return NextResponse.json({
      success: true,
      data: resgate,
      message: 'Resgate processado com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro no resgate:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no resgate',
      details: error.message
    }, { status: 500 });
  }
}
