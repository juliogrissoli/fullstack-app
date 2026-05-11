// 🏛️ SECURITY BROKER SB v16 - GESTÃO DE PARTICIPAÇÃO E LUCROS (PL)
// Engine de Profit Sharing e Modelo de Investidor SB MASTER

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

interface ProfitSharingRequest {
  empreendimento_id: string;
  broker_id: string;
  tipo_participacao: 'lucro_venda' | 'lucro_construcao' | 'lucro_operacional';
  percentual_participacao: number;
  valor_base_calculo: number;
  condicao_pagamento?: 'vista' | 'parcelado' | 'final_obra';
  prazo_pagamento_meses?: number;
  data_inicio_participacao?: string;
}

interface ProfitSharingResponse {
  success: boolean;
  participacao_criada?: {
    id: string;
    tipo_participacao: string;
    percentual_participacao: number;
    valor_base_calculo: number;
    lucro_bruto: number;
    participacao_valor: number;
    condicao_pagamento: string;
    status: string;
    data_ativacao?: string;
  };
  simulacao_retorno?: {
    investimento_inicial: number;
    retorno_estimado: number;
    prazo_meses: number;
    taxa_mensal: number;
    risco_avaliado: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ProfitSharingRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!body.empreendimento_id || !body.broker_id || !body.tipo_participacao || !body.percentual_participacao || !body.valor_base_calculo) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }

    // Processar participação nos lucros
    const resultado = await processarParticipacaoLucros(body);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Participação nos lucros configurada com sucesso'
    });

  } catch (error: any) {
    console.error('Erro na Gestão de Participação e Lucros:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno na Gestão de Participação e Lucros',
      details: error.message
    }, { status: 500 });
  }
}

async function processarParticipacaoLucros(request: ProfitSharingRequest): Promise<ProfitSharingResponse['participacao_criada']> {
  const { empreendimento_id, broker_id, tipo_participacao, percentual_participacao, valor_base_calculo, condicao_pagamento, prazo_pagamento_meses, data_inicio_participacao } = request;
  
  // 1. Validar broker e empreendimento
  const { data: broker, error: errorBroker } = await supabase
    .from('brokers')
    .select('*')
    .eq('id', broker_id)
    .single();
  
  if (errorBroker || !broker) {
    throw new Error('Broker não encontrado');
  }
  
  const { data: empreendimento, error: errorEmpreendimento } = await supabase
    .from('empreendimentos_sb')
    .select('*')
    .eq('id', empreendimento_id)
    .single();
  
  if (errorEmpreendimento || !empreendimento) {
    throw new Error('Empreendimento não encontrado');
  }
  
  // 2. Calcular lucro bruto projetado
  const lucroBruto = calcularLucroBrutoProjetado(tipo_participacao, valor_base_calculo, empreendimento);
  
  // 3. Criar participação nos lucros
  const { data: participacao, error: errorParticipacao } = await supabase
    .from('participacao_lucros')
    .insert({
      empreendimento_id,
      broker_id,
      tipo_participacao,
      percentual_participacao,
      valor_base_calculo,
      lucro_bruto: lucroBruto,
      condicao_pagamento: condicao_pagamento || 'final_obra',
      prazo_pagamento_meses: prazo_pagamento_meses || 12,
      data_inicio_participacao: data_inicio_participacao || new Date().toISOString().split('T')[0],
      status: 'pendente'
    })
    .select('*')
    .single();
  
  if (errorParticipacao) {
    throw new Error(`Erro ao criar participação nos lucros: ${errorParticipacao.message}`);
  }
  
  // 4. Criar investidor SB MASTER se necessário
  await criarInvestidorSBMaster(broker_id, empreendimento.incorporadora_id);
  
  // 5. Gerar notificação
  await supabase
    .from('notificacoes')
    .insert({
      broker_id,
      incorporadora_id: empreendimento.incorporadora_id,
      tipo: 'profit_sharing',
      titulo: 'Participação nos Lucros Configurada',
      mensagem: `Participação de ${percentual_participacao}% nos lucros do empreendimento ${empreendimento.nome} foi configurada.`,
      status: 'nao_lida'
    });
  
  return {
    id: participacao.id,
    tipo_participacao: participacao.tipo_participacao,
    percentual_participacao: participacao.percentual_participacao,
    valor_base_calculo: participacao.valor_base_calculo,
    lucro_bruto: participacao.lucro_bruto,
    participacao_valor: participacao.participacao_valor,
    condicao_pagamento: participacao.condicao_pagamento,
    status: participacao.status,
    data_ativacao: participacao.data_ativacao
  };
}

function calcularLucroBrutoProjetado(tipoParticipacao: string, valorBase: number, empreendimento: any): number {
  switch (tipoParticipacao) {
    case 'lucro_venda':
      // Lucro baseado na margem de venda (simulação de 25% de margem)
      return valorBase * 0.25;
    
    case 'lucro_construcao':
      // Lucro baseado no custo de construção (simulação de 30% de margem)
      return valorBase * 0.30;
    
    case 'lucro_operacional':
      // Lucro baseado na operação completa (simulação de 35% de margem)
      return valorBase * 0.35;
    
    default:
      return valorBase * 0.25; // Padrão 25%
  }
}

async function criarInvestidorSBMaster(brokerId: string, incorporadoraId: string): Promise<void> {
  try {
    // Verificar se já existe investidor SB MASTER
    const { data: investidorExistente } = await supabase
      .from('investidores_sb_master')
      .select('*')
      .eq('broker_id', brokerId)
      .eq('incorporadora_id', incorporadoraId)
      .eq('tipo_investidor', 'sb_master')
      .single();
    
    if (investidorExistente) {
      return; // Já existe
    }
    
    // Criar investidor SB MASTER
    await supabase
      .from('investidores_sb_master')
      .insert({
        incorporadora_id: incorporadoraId,
        broker_id: brokerId,
        tipo_investidor: 'sb_master',
        cnpj_investidor: generateCNPJInvestidor(),
        razao_social: `SB MASTER INVESTIMENTOS - ${brokerId}`,
        capital_social: 100000.00, // R$ 100k capital social padrão
        percentual_sociedade: 1.00, // 1% participação societária
        valor_investimento: 10000.00, // R$ 10k investimento inicial
        data_investimento: new Date().toISOString().split('T')[0],
        direito_voto: true,
        direito_participacao_lucros: true,
        direito_informacao: true,
        clausula_buy_sell: true,
        prazo_lockup: 24, // 24 meses
        status: 'proposto'
      });
    
  } catch (error) {
    console.error('Erro ao criar investidor SB MASTER:', error);
    // Não lançar erro para não quebrar o fluxo principal
  }
}

function generateCNPJInvestidor(): string {
  // Gerar CNPJ fictício para investidor (em produção usar CNPJ real)
  const base = Math.floor(Math.random() * 900000000) + 100000000;
  return `${base}0001`;
}

// Endpoint para simular retorno de investimento
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { empreendimento_id, broker_id, percentual_participacao, valor_investimento } = body;
    
    if (!empreendimento_id || !broker_id || !percentual_participacao || !valor_investimento) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }
    
    // Buscar dados do empreendimento
    const { data: empreendimento } = await supabase
      .from('empreendimentos_sb')
      .select('*')
      .eq('id', empreendimento_id)
      .single();
    
    if (!empreendimento) {
      throw new Error('Empreendimento não encontrado');
    }
    
    // Calcular simulação
    const lucroProjetado = empreendimento.valor_medio_unidade * 0.25; // 25% de margem
    const retornoEstimado = lucroProjetado * (percentual_participacao / 100);
    const prazoMeses = 24; // Padrão 24 meses
    const taxaMensal = Math.pow((retornoEstimado / valor_investimento + 1), (1 / prazoMeses)) - 1;
    
    // Avaliar risco
    let riscoAvaliado = 'baixo';
    if (taxaMensal > 0.05) riscoAvaliado = 'alto';
    else if (taxaMensal > 0.03) riscoAvaliado = 'medio';
    
    const simulacao = {
      investimento_inicial: valor_investimento,
      retorno_estimado: retornoEstimado,
      prazo_meses: prazoMeses,
      taxa_mensal: Math.round(taxaMensal * 10000) / 100,
      risco_avaliado: riscoAvaliado
    };
    
    return NextResponse.json({
      success: true,
      data: simulacao,
      message: 'Simulação de retorno gerada com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro na simulação de retorno:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno na simulação',
      details: error.message
    }, { status: 500 });
  }
}

// Endpoint para consultar participações
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const broker_id = searchParams.get('broker_id');
    const empreendimento_id = searchParams.get('empreendimento_id');
    const status = searchParams.get('status');
    
    let query = supabase
      .from('participacao_lucros')
      .select(`
        *,
        brokers!inner(
          id,
          nome
        ),
        empreendimentos_sb!inner(
          id,
          nome,
          cidade,
          estado
        )
      `);
    
    if (broker_id) {
      query = query.eq('broker_id', broker_id);
    }
    
    if (empreendimento_id) {
      query = query.eq('empreendimento_id', empreendimento_id);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Erro ao consultar participações: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      data: data || [],
      message: 'Participações nos lucros consultadas com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar participações:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar participações',
      details: error.message
    }, { status: 500 });
  }
}
