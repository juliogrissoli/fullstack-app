// 🏛️ SECURITY BROKER SB v13 - SISTEMA DE MERITOCRACIA
// Espelho de vendas com prioridade para "Pastas 100%"

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

interface MeritocraciaRequest {
  empreendimento_id: string;
  broker_id?: string;
  incorporadora_id?: string;
}

interface MeritocraciaResponse {
  empreendimento: {
    id: string;
    nome: string;
    total_unidades: number;
    unidades_disponiveis: number;
    unidades_vendidas: number;
    percentual_vendido: number;
  };
  espelho_vendas: Array<{
    broker_id: string;
    broker_nome: string;
    pastas_100: number;
    pastas_em_progresso: number;
    total_leads: number;
    unidades_prioritarias: number;
    posicao_ranking: number;
    score_merito: number;
  }>;
  unidades_disponiveis: Array<{
    id: string;
    numero: string;
    tipo: string;
    preco_venda: number;
    status: string;
    prioridade_para: string[];
  }>;
  alertas: Array<{
    tipo: string;
    mensagem: string;
    nivel: 'info' | 'alerta' | 'critico';
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: MeritocraciaRequest = await request.json();
    
    if (!body.empreendimento_id) {
      return NextResponse.json({
        success: false,
        error: 'empreendimento_id é obrigatório'
      }, { status: 400 });
    }

    const resultado = await calcularEspelhoVendasMeritocratico(body);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Espelho de vendas meritocrático calculado com sucesso'
    });

  } catch (error: any) {
    console.error('Erro no sistema de meritocracia:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no sistema de meritocracia',
      details: error.message
    }, { status: 500 });
  }
}

async function calcularEspelhoVendasMeritocratico(request: MeritocraciaRequest): Promise<MeritocraciaResponse> {
  const { empreendimento_id, broker_id, incorporadora_id } = request;
  
  // 1. Buscar dados do empreendimento
  const { data: empreendimento, error: errorEmpreendimento } = await supabase
    .from('empreendimentos')
    .select('*')
    .eq('id', empreendimento_id)
    .single();
  
  if (errorEmpreendimento) {
    throw new Error('Empreendimento não encontrado');
  }
  
  // 2. Buscar brokers com leads neste empreendimento
  let queryBrokers = supabase
    .from('brokers')
    .select(`
      id,
      nome,
      pastas_documentos!inner(
        id,
        status,
        progresso_percentual,
        lead_id,
        leads!inner(
          id,
          nome,
          status
        )
      )
    `)
    .eq('incorporadora_id', empreendimento.incorporadora_id);
  
  if (broker_id) {
    queryBrokers = queryBrokers.eq('id', broker_id);
  }
  
  const { data: brokers, error: errorBrokers } = await queryBrokers;
  
  if (errorBrokers) {
    throw new Error('Erro ao buscar brokers');
  }
  
  // 3. Calcular métricas de meritocracia para cada broker
  const espelhoVendas: MeritocraciaResponse['espelho_vendas'] = [];
  
  for (const broker of brokers || []) {
    const pastas = broker.pastas_documentos || [];
    const pastas100 = pastas.filter(p => p.progresso_percentual === 100).length;
    const pastasEmProgresso = pastas.filter(p => p.progresso_percentual > 0 && p.progresso_percentual < 100).length;
    const totalLeads = pastas.length;
    
    // Calcular score de mérito (baseado em pastas 100% e qualidade)
    const scoreMerito = calcularScoreMerito(pastas100, pastasEmProgresso, totalLeads);
    
    // Calcular unidades prioritárias (regra: pastas 100% vs unidades disponíveis)
    const unidadesPrioritarias = Math.min(
      pastas100,
      Math.floor(empreendimento.unidades_disponiveis * 0.6) // Máximo 60% para um broker
    );
    
    espelhoVendas.push({
      broker_id: broker.id,
      broker_nome: broker.nome,
      pastas_100: pastas100,
      pastas_em_progresso: pastasEmProgresso,
      total_leads: totalLeads,
      unidades_prioritarias: unidadesPrioritarias,
      posicao_ranking: 0, // Será calculado depois
      score_merito: scoreMerito
    });
  }
  
  // 4. Ordenar por score de mérito e definir ranking
  espelhoVendas.sort((a, b) => b.score_merito - a.score_merito);
  espelhoVendas.forEach((broker, index) => {
    broker.posicao_ranking = index + 1;
  });
  
  // 5. Buscar unidades disponíveis e marcar prioridade
  const { data: unidades, error: errorUnidades } = await supabase
    .from('unidades')
    .select('*')
    .eq('empreendimento_id', empreendimento_id)
    .eq('status', 'disponivel')
    .order('preco_venda', { ascending: true });
  
  if (errorUnidades) {
    throw new Error('Erro ao buscar unidades');
  }
  
  // Distribuir unidades baseado na meritocracia
  const unidadesDisponiveis: MeritocraciaResponse['unidades_disponiveis'] = [];
  let unidadeIndex = 0;
  
  for (const broker of espelhoVendas) {
    if (broker.unidades_prioritarias > 0 && unidadeIndex < (unidades?.length || 0)) {
      const unidadesBroker = (unidades || []).slice(unidadeIndex, unidadeIndex + broker.unidades_prioritarias);
      
      unidadesBroker.forEach(unidade => {
        unidadesDisponiveis.push({
          id: unidade.id,
          numero: unidade.numero,
          tipo: unidade.tipo,
          preco_venda: unidade.preco_venda,
          status: unidade.status,
          prioridade_para: [broker.broker_id]
        });
      });
      
      unidadeIndex += broker.unidades_prioritarias;
    }
  }
  
  // Adicionar unidades restantes sem prioridade específica
  if (unidadeIndex < (unidades?.length || 0)) {
    const unidadesRestantes = (unidades || []).slice(unidadeIndex);
    const topBrokers = espelhoVendas.slice(0, 3).map(b => b.broker_id);
    
    unidadesRestantes.forEach(unidade => {
      unidadesDisponiveis.push({
        id: unidade.id,
        numero: unidade.numero,
        tipo: unidade.tipo,
        preco_venda: unidade.preco_venda,
        status: unidade.status,
        prioridade_para: topBrokers
      });
    });
  }
  
  // 6. Gerar alertas do sistema
  const alertas = gerarAlertasMeritocracia(espelhoVendas, empreendimento);
  
  return {
    empreendimento: {
      id: empreendimento.id,
      nome: empreendimento.nome,
      total_unidades: empreendimento.total_unidades,
      unidades_disponiveis: empreendimento.unidades_disponiveis,
      unidades_vendidas: empreendimento.total_unidades - empreendimento.unidades_disponiveis,
      percentual_vendido: ((empreendimento.total_unidades - empreendimento.unidades_disponiveis) / empreendimento.total_unidades) * 100
    },
    espelho_vendas: espelhoVendas,
    unidades_disponiveis: unidadesDisponiveis,
    alertas
  };
}

function calcularScoreMerito(pastas100: number, pastasEmProgresso: number, totalLeads: number): number {
  let score = 0;
  
  // Base: 50 pontos por cada pasta 100%
  score += pastas100 * 50;
  
  // Bônus: 20 pontos por cada pasta em progresso
  score += pastasEmProgresso * 20;
  
  // Bônus de eficiência: se pastas100 > 0, calcular taxa de conversão
  if (totalLeads > 0 && pastas100 > 0) {
    const taxaConversao = (pastas100 / totalLeads) * 100;
    score += Math.min(taxaConversao * 10, 100); // Máximo 100 pontos bônus
  }
  
  // Penalidade: se não tiver pastas 100%
  if (pastas100 === 0 && totalLeads > 0) {
    score -= totalLeads * 5; // Penalidade por leads sem conversão
  }
  
  return Math.max(score, 0); // Não permitir score negativo
}

function gerarAlertasMeritocracia(espelhoVendas: MeritocraciaResponse['espelho_vendas'], empreendimento: any): MeritocraciaResponse['alertas'] {
  const alertas: MeritocraciaResponse['alertas'] = [];
  
  // Alerta de baixa conversão
  const totalPastas100 = espelhoVendas.reduce((sum, broker) => sum + broker.pastas_100, 0);
  const totalLeads = espelhoVendas.reduce((sum, broker) => sum + broker.total_leads, 0);
  
  if (totalLeads > 0 && (totalPastas100 / totalLeads) < 0.1) {
    alertas.push({
      tipo: 'baixa_conversao',
      mensagem: `Taxa de conversão baixa: ${((totalPastas100 / totalLeads) * 100).toFixed(1)}%. Ações de qualificação recomendadas.`,
      nivel: 'alerta'
    });
  }
  
  // Alerta de liderança
  if (espelhoVendas.length > 0) {
    const topBroker = espelhoVendas[0];
    if (topBroker.pastas_100 > 0) {
      alertas.push({
        tipo: 'lideranca_merito',
        mensagem: `${topBroker.broker_nome} lidera com ${topBroker.pastas_100} pastas 100% e ${topBroker.unidades_prioritarias} unidades prioritárias.`,
        nivel: 'info'
      });
    }
  }
  
  // Alerta de estoque crítico
  if (empreendimento.unidades_disponiveis < empreendimento.total_unidades * 0.1) {
    alertas.push({
      tipo: 'estoque_critico',
      mensagem: `Estoque crítico: apenas ${empreendimento.unidades_disponiveis} unidades disponíveis (${((empreendimento.unidades_disponiveis / empreendimento.total_unidades) * 100).toFixed(1)}%).`,
      nivel: 'critico'
    });
  }
  
  // Alerta de competição
  const brokersComPastas100 = espelhoVendas.filter(b => b.pastas_100 > 0).length;
  if (brokersComPastas100 > 3) {
    alertas.push({
      tipo: 'alta_competicao',
      mensagem: `${brokersComPastas100} brokers com pastas 100%. Competição acirrada por unidades disponíveis.`,
      nivel: 'alerta'
    });
  }
  
  // Alerta de oportunidade
  const unidadesDisponiveis = empreendimento.unidades_disponiveis;
  const totalPrioridades = espelhoVendas.reduce((sum, broker) => sum + broker.unidades_prioritarias, 0);
  
  if (totalPrioridades < unidadesDisponiveis) {
    alertas.push({
      tipo: 'oportunidade_vendas',
      mensagem: `${unidadesDisponiveis - totalPrioridades} unidades sem prioridade definida. Oportunidade para novos leads.`,
      nivel: 'info'
    });
  }
  
  return alertas;
}

// Endpoint para atualizar prioridade de unidade
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { unidade_id, broker_id, acao } = body; // acao: 'priorizar' ou 'remover_prioridade'
    
    if (!unidade_id || !broker_id || !acao) {
      return NextResponse.json({
        success: false,
        error: 'unidade_id, broker_id e acao são obrigatórios'
      }, { status: 400 });
    }
    
    // Verificar se o broker tem direito à prioridade
    const { data: broker, error: errorBroker } = await supabase
      .from('brokers')
      .select('id, nome, pastas_100')
      .eq('id', broker_id)
      .single();
    
    if (errorBroker || !broker) {
      return NextResponse.json({
        success: false,
        error: 'Broker não encontrado'
      }, { status: 404 });
    }
    
    // Verificar se o broker tem pastas 100%
    if (broker.pastas_100 === 0) {
      return NextResponse.json({
        success: false,
        error: 'Broker não possui pastas 100% para priorizar unidades'
      }, { status: 400 });
    }
    
    // Buscar a unidade
    const { data: unidade, error: errorUnidade } = await supabase
      .from('unidades')
      .select('*')
      .eq('id', unidade_id)
      .single();
    
    if (errorUnidade || !unidade) {
      return NextResponse.json({
        success: false,
        error: 'Unidade não encontrada'
      }, { status: 404 });
    }
    
    // Atualizar status da unidade
    let novoStatus = unidade.status;
    if (acao === 'priorizar' && unidade.status === 'disponivel') {
      novoStatus = 'reservado';
    } else if (acao === 'remover_prioridade' && unidade.status === 'reservado') {
      novoStatus = 'disponivel';
    }
    
    const { data: unidadeAtualizada, error: errorUpdate } = await supabase
      .from('unidades')
      .update({ status: novoStatus })
      .eq('id', unidade_id)
      .select()
      .single();
    
    if (errorUpdate) {
      throw new Error('Erro ao atualizar unidade');
    }
    
    // Criar notificação
    await supabase
      .from('notificacoes')
      .insert({
        broker_id: broker_id,
        tipo: 'info',
        titulo: `Unidade ${acao === 'priorizar' ? 'Priorizada' : 'Liberada'}`,
        mensagem: `Unidade ${unidade.numero} foi ${acao === 'priorizar' ? 'priorizada' : 'liberada'} para você.`,
        status: 'nao_lida'
      });
    
    return NextResponse.json({
      success: true,
      data: unidadeAtualizada,
      message: `Unidade ${acao === 'priorizar' ? 'priorizada' : 'liberada'} com sucesso`
    });
    
  } catch (error: any) {
    console.error('Erro ao atualizar prioridade:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao atualizar prioridade',
      details: error.message
    }, { status: 500 });
  }
}

// Endpoint para obter ranking de brokers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empreendimento_id = searchParams.get('empreendimento_id');
    
    if (!empreendimento_id) {
      return NextResponse.json({
        success: false,
        error: 'empreendimento_id é obrigatório'
      }, { status: 400 });
    }
    
    const resultado = await calcularEspelhoVendasMeritocratico({ empreendimento_id });
    
    // Retornar apenas o ranking
    return NextResponse.json({
      success: true,
      data: {
        ranking: resultado.espelho_vendas,
        alertas: resultado.alertas,
        empreendimento: resultado.empreendimento
      }
    });
    
  } catch (error: any) {
    console.error('Erro ao obter ranking:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao obter ranking',
      details: error.message
    }, { status: 500 });
  }
}
