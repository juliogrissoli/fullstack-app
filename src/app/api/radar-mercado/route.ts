// 🏛️ SECURITY BROKER SB v14 - RADAR DE MERCADO 5KM (IA SENTINEL)
// Geofencing de Preços, Análise Geracional, Indicadores Econômicos

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

interface RadarMercadoRequest {
  empreendimento_id?: string;
  bairro?: string;
  cidade?: string;
  raio_km?: number;
  tipo_analise: 'geofencing_precos' | 'analise_geracional' | 'indicadores_economicos' | 'completa';
}

interface RadarMercadoResponse {
  success: boolean;
  geofencing_precos?: {
    preco_medio_m2: number;
    preco_minimo_m2: number;
    preco_maximo_m2: number;
    total_anuncios: number;
    variacao_percentual: number;
    tendencia: string;
    data_coleta: string;
    comparacao_vs_empreendimento: {
      diferenca_percentual: number;
      posicao_mercado: string;
    };
  };
  analise_geracional?: Array<{
    geracao: string;
    faixa_etaria: { min: number; max: number };
    total_leads: number;
    percentual_conversao: number;
    ticket_medio: number;
    preferencia_tipo_imovel: string;
    poder_aquisitivo: string;
    insights: string[];
  }>;
  indicadores_economicos?: {
    incc: { valor: number; variacao_mensal: number; impacto_financiamento: string };
    selic: { valor: number; variacao_mensal: number; impacto_parcelas: string };
    ipca: { valor: number; variacao_mensal: number; impacto_inflacao: string };
    igpm: { valor: number; variacao_mensal: number; impacto_construcao: string };
    data_atualizacao: string;
    recomendacoes: string[];
  };
  estudo_demanda?: {
    demanda_total: number;
    oferta_total: number;
    gap_quantitativo: number;
    gap_percentual: number;
    banco_areas_disponiveis: number;
    areas_escassas: string[];
    tendencia_mercado: string;
    oportunidade_score: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: RadarMercadoRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!body.tipo_analise) {
      return NextResponse.json({
        success: false,
        error: 'Tipo de análise é obrigatório'
      }, { status: 400 });
    }

    // Executar análise do radar de mercado
    const resultado = await executarRadarMercado(body);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Radar de mercado analisado com sucesso'
    });

  } catch (error: any) {
    console.error('Erro no Radar de Mercado:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Radar de Mercado',
      details: error.message
    }, { status: 500 });
  }
}

async function executarRadarMercado(request: RadarMercadoRequest): Promise<RadarMercadoResponse> {
  const { empreendimento_id, bairro, cidade, raio_km, tipo_analise } = request;
  
  const resultado: RadarMercadoResponse = { success: true };
  
  switch (tipo_analise) {
    case 'geofencing_precos':
      resultado.geofencing_precos = await analisarGeofencingPrecos(empreendimento_id, bairro, cidade, raio_km);
      break;
    case 'analise_geracional':
      resultado.analise_geracional = await analisarGeracional(bairro, cidade);
      break;
    case 'indicadores_economicos':
      resultado.indicadores_economicos = await analisarIndicadoresEconomicos();
      break;
    case 'completa':
      resultado.geofencing_precos = await analisarGeofencingPrecos(empreendimento_id, bairro, cidade, raio_km);
      resultado.analise_geracional = await analisarGeracional(bairro, cidade);
      resultado.indicadores_economicos = await analisarIndicadoresEconomicos();
      resultado.estudo_demanda = await gerarEstudoDemanda(bairro, cidade);
      break;
  }
  
  return resultado;
}

async function analisarGeofencingPrecos(
  empreendimento_id?: string,
  bairro?: string,
  cidade?: string,
  raio_km: number = 5
): Promise<RadarMercadoResponse['geofencing_precos']> {
  
  // Se temos empreendimento_id, usar função SQL completa
  if (empreendimento_id) {
    const { data: analiseCompleta, error } = await supabase
      .rpc('analisar_mercado_5km', { p_empreendimento_id: empreendimento_id });
    
    if (error) {
      throw new Error(`Erro na análise de mercado: ${error.message}`);
    }
    
    const monitoramento = analiseCompleta?.monitoramento_precos;
    const empreendimento = analiseCompleta?.empreendimento;
    
    if (!monitoramento || !empreendimento) {
      throw new Error('Dados de monitoramento não encontrados');
    }
    
    // Calcular comparação com empreendimento
    const precoM2Empreendimento = empreendimento.valor_medio_unidade / 100; // Simulação de 100m²
    const diferencaPercentual = ((monitoramento.preco_medio_m2 - precoM2Empreendimento) / precoM2Empreendimento) * 100;
    
    return {
      preco_medio_m2: monitoramento.preco_medio_m2,
      preco_minimo_m2: monitoramento.preco_minimo_m2,
      preco_maximo_m2: monitoramento.preco_maximo_m2,
      total_anuncios: monitoramento.total_anuncios,
      variacao_percentual: monitoramento.variacao_percentual,
      tendencia: monitoramento.tendencia,
      data_coleta: monitoramento.data_coleta,
      comparacao_vs_empreendimento: {
        diferenca_percentual: Math.round(diferencaPercentual * 100) / 100,
        posicao_mercado: diferencaPercentual > 10 ? 'acima_mercado' : 
                         diferencaPercentual < -10 ? 'abaixo_mercado' : 'alinhado_mercado'
      }
    };
  }
  
  // Análise por bairro/cidade
  if (!bairro || !cidade) {
    throw new Error('É necessário fornecer bairro e cidade para análise');
  }
  
  // Buscar dados de monitoramento
  const { data: monitoramento, error } = await supabase
    .from('monitoramento_precos')
    .select('*')
    .eq('bairro', bairro)
    .eq('cidade', cidade)
    .eq('raio_km', raio_km)
    .order('data_coleta', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !monitoramento) {
    throw new Error('Dados de monitoramento não encontrados para esta região');
  }
  
  return {
    preco_medio_m2: monitoramento.preco_medio_m2,
    preco_minimo_m2: monitoramento.preco_minimo_m2,
    preco_maximo_m2: monitoramento.preco_maximo_m2,
    total_anuncios: monitoramento.total_anuncios,
    variacao_percentual: monitoramento.variacao_percentual,
    tendencia: monitoramento.tendencia,
    data_coleta: monitoramento.data_coleta,
    comparacao_vs_empreendimento: {
      diferenca_percentual: 0,
      posicao_mercado: 'alinhado_mercado'
    }
  };
}

async function analisarGeracional(bairro?: string, cidade?: string): Promise<RadarMercadoResponse['analise_geracional']> {
  if (!bairro || !cidade) {
    throw new Error('É necessário fornecer bairro e cidade para análise geracional');
  }
  
  // Buscar dados de análise geracional
  const { data: dadosGeracional, error } = await supabase
    .from('analise_geracional')
    .select('*')
    .eq('bairro', bairro)
    .eq('cidade', cidade)
    .order('data_analise', { ascending: false });
  
  if (error) {
    throw new Error(`Erro na análise geracional: ${error.message}`);
  }
  
  // Agrupar por geração e gerar insights
  const analisePorGeracao = new Map();
  
  (dadosGeracional || []).forEach(dado => {
    if (!analisePorGeracao.has(dado.geracao)) {
      analisePorGeracao.set(dado.geracao, {
        geracao: dado.geracao,
        faixa_etaria: { min: dado.faixa_etaria_min, max: dado.faixa_etaria_max },
        total_leads: 0,
        percentual_conversao: 0,
        ticket_medio: 0,
        preferencia_tipo_imovel: '',
        poder_aquisitivo: '',
        insights: [] as string[]
      });
    }
    
    const geracao = analisePorGeracao.get(dado.geracao);
    geracao.total_leads += dado.total_leads;
    geracao.percentual_conversao = Math.max(geracao.percentual_conversao, dado.percentual_conversao);
    geracao.ticket_medio = Math.max(geracao.ticket_medio, dado.ticket_medio);
    
    if (dado.preferencia_tipo_imovel) {
      geracao.preferencia_tipo_imovel = dado.preferencia_tipo_imovel;
    }
    
    if (dado.poder_aquisitivo) {
      geracao.poder_aquisitivo = dado.poder_aquisitivo;
    }
    
    // Gerar insights específicos por geração
    geracao.insights.push(...gerarInsightsGeracionais(dado.geracao, dado));
  });
  
  return Array.from(analisePorGeracao.values());
}

function gerarInsightsGeracionais(geracao: string, dados: any): string[] {
  const insights: string[] = [];
  
  switch (geracao) {
    case 'Gen Z':
      insights.push('Preferência por imóveis menores e tecnológicos');
      insights.push('Alta sensibilidade ao preço e taxa de juros');
      insights.push('Busca por localização próxima a transporte e entretenimento');
      if (dados.percentual_conversao > 50) {
        insights.push('Alta taxa de conversão - focar em marketing digital');
      }
      break;
      
    case 'Millennials':
      insights.push('Interesse em imóveis com espaço para home office');
      insights.push('Valoriza sustentabilidade e áreas comuns');
      insights.push('Busca financiamento longo prazo');
      if (dados.ticket_medio > 500000) {
        insights.push('Alto poder aquisitivo - oportunidade para imóveis premium');
      }
      break;
      
    case 'Gen X':
      insights.push('Busca estabilidade e valorização do imóvel');
      insights.push('Interesse em áreas com boa infraestrutura');
      insights.push('Preferência por imóveis maiores para família');
      if (dados.percentual_conversao > 60) {
        insights.push('Excelente taxa de conversão - público maduro');
      }
      break;
      
    case 'Boomers':
      insights.push('Preferência por imóveis térreos ou baixos');
      insights.push('Busca acessibilidade e segurança');
      insights.push('Alta capacidade de entrada');
      if (dados.ticket_medio > 800000) {
        insights.push('Alto ticket médio - focar em imóveis de luxo');
      }
      break;
  }
  
  return insights;
}

async function analisarIndicadoresEconomicos(): Promise<RadarMercadoResponse['indicadores_economicos']> {
  // Buscar indicadores econômicos mais recentes
  const { data: indicadores, error } = await supabase
    .from('indicadores_economicos')
    .select('*')
    .order('data_referencia', { ascending: false })
    .limit(4); // Últimos dados de cada indicador
  
  if (error) {
    throw new Error(`Erro nos indicadores econômicos: ${error.message}`);
  }
  
  // Agrupar por indicador
  const indicadoresMap = new Map();
  
  (indicadores || []).forEach(indicador => {
    indicadoresMap.set(indicador.indicador, indicador);
  });
  
  const incc = indicadoresMap.get('INCC');
  const selic = indicadoresMap.get('Selic');
  const ipca = indicadoresMap.get('IPCA');
  const igpm = indicadoresMap.get('IGPM');
  
  // Gerar recomendações baseadas nos indicadores
  const recomendacoes: string[] = [];
  
  if (selic?.valor > 12) {
    recomendacoes.push('Selic alta - focar em entrada maior para reduzir parcelas');
  } else if (selic?.valor < 8) {
    recomendacoes.push('Selic baixa - oportunidade para financiamento longo prazo');
  }
  
  if (incc?.valor > 0.5) {
    recomendacoes.push('INCC em alta - destacar imóveis prontos ou com entrega garantida');
  }
  
  if (ipca?.valor > 0.4) {
    recomendacoes.push('IPCA elevado - imóveis como reserva de valor');
  }
  
  return {
    incc: {
      valor: incc?.valor || 0,
      variacao_mensal: incc?.variacao_mensal || 0,
      impacto_financiamento: incc?.valor > 0.5 ? 'Custo de construção aumentando' : 'Custo estável'
    },
    selic: {
      valor: selic?.valor || 0,
      variacao_mensal: selic?.variacao_mensal || 0,
      impacto_parcelas: selic?.valor > 10 ? 'Parcelas mais altas' : 'Parcelas acessíveis'
    },
    ipca: {
      valor: ipca?.valor || 0,
      variacao_mensal: ipca?.variacao_mensal || 0,
      impacto_inflacao: ipca?.valor > 0.4 ? 'Poder de compra reduzido' : 'Inflação controlada'
    },
    igpm: {
      valor: igpm?.valor || 0,
      variacao_mensal: igpm?.variacao_mensal || 0,
      impacto_construcao: igpm?.valor > 0.6 ? 'Custo materiais em alta' : 'Custo materiais estável'
    },
    data_atualizacao: new Date().toISOString(),
    recomendacoes
  };
}

async function gerarEstudoDemanda(bairro?: string, cidade?: string): Promise<RadarMercadoResponse['estudo_demanda']> {
  if (!bairro || !cidade) {
    throw new Error('É necessário fornecer bairro e cidade para estudo de demanda');
  }
  
  // Buscar estudo de demanda existente
  const { data: estudo, error } = await supabase
    .from('estudo_demanda_bairro')
    .select('*')
    .eq('bairro', bairro)
    .eq('cidade', cidade)
    .order('data_estudo', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !estudo) {
    // Se não existir, criar novo estudo
    return await criarEstudoDemanda(bairro, cidade);
  }
  
  // Calcular score de oportunidade
  const oportunidadeScore = calcularOportunidadeScore(estudo);
  
  return {
    demanda_total: estudo.demanda_total,
    oferta_total: estudo.oferta_total,
    gap_quantitativo: estudo.gap_quantitativo,
    gap_percentual: estudo.gap_percentual,
    banco_areas_disponiveis: estudo.banco_areas_disponiveis,
    areas_escassas: estudo.areas_escassas,
    tendencia_mercado: estudo.tendencia_mercado,
    oportunidade_score: oportunidadeScore
  };
}

async function criarEstudoDemanda(bairro: string, cidade: string): Promise<RadarMercadoResponse['estudo_demanda']> {
  // Simular criação de estudo de demanda
  const demandaTotal = Math.floor(Math.random() * 500) + 100;
  const ofertaTotal = Math.floor(Math.random() * 300) + 50;
  const gapQuantitativo = demandaTotal - ofertaTotal;
  const gapPercentual = ofertaTotal > 0 ? (gapQuantitativo / ofertaTotal) * 100 : 0;
  
  const areasEscassas = ['Apartamentos 2 quartos', 'Casas com jardim', 'Lojas comerciais'];
  
  // Inserir novo estudo
  const { data: novoEstudo, error } = await supabase
    .from('estudo_demanda_bairro')
    .insert({
      bairro,
      cidade,
      estado: 'SP',
      coordenadas: `POINT(-46.6333 -23.5505)`, // São Paulo (simulação)
      demanda_total: demandaTotal,
      oferta_total: ofertaTotal,
      gap_quantitativo: gapQuantitativo,
      gap_percentual: gapPercentual,
      banco_areas_disponiveis: Math.floor(Math.random() * 20) + 5,
      areas_escassas: areasEscassas,
      preco_medio_m2: 8000 + Math.random() * 4000,
      poder_aquisitivo_medio: 15000 + Math.random() * 10000,
      tendencia_mercado: gapPercentual > 20 ? 'aquecimento' : gapPercentual < -20 ? 'resfriamento' : 'estabilidade'
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao criar estudo de demanda: ${error.message}`);
  }
  
  const oportunidadeScore = calcularOportunidadeScore(novoEstudo);
  
  return {
    demanda_total: novoEstudo.demanda_total,
    oferta_total: novoEstudo.oferta_total,
    gap_quantitativo: novoEstudo.gap_quantitativo,
    gap_percentual: novoEstudo.gap_percentual,
    banco_areas_disponiveis: novoEstudo.banco_areas_disponiveis,
    areas_escassas: novoEstudo.areas_escassas,
    tendencia_mercado: novoEstudo.tendencia_mercado,
    oportunidade_score: oportunidadeScore
  };
}

function calcularOportunidadeScore(estudo: any): number {
  let score = 50; // Base
  
  // Demanda vs Oferta (40%)
  if (estudo.gap_percentual > 20) {
    score += 40; // Alta demanda
  } else if (estudo.gap_percentual > 10) {
    score += 25; // Demanda moderada
  } else if (estudo.gap_percentual < -20) {
    score -= 20; // Excesso de oferta
  }
  
  // Banco de áreas (20%)
  if (estudo.banco_areas_disponiveis > 15) {
    score += 20;
  } else if (estudo.banco_areas_disponiveis > 5) {
    score += 10;
  }
  
  // Preço médio (20%)
  if (estudo.preco_medio_m2 < 6000) {
    score += 20; // Preço acessível
  } else if (estudo.preco_medio_m2 < 8000) {
    score += 10; // Preço razoável
  } else if (estudo.preco_medio_m2 > 12000) {
    score -= 10; // Preço alto
  }
  
  // Tendência (20%)
  if (estudo.tendencia_mercado === 'aquecimento') {
    score += 20;
  } else if (estudo.tendencia_mercado === 'estabilidade') {
    score += 10;
  } else if (estudo.tendencia_mercado === 'resfriamento') {
    score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

// Endpoint para consultar radar de mercado
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bairro = searchParams.get('bairro');
    const cidade = searchParams.get('cidade');
    const tipo = searchParams.get('tipo'); // precos, geracional, economicos, completo
    
    if (!bairro || !cidade || !tipo) {
      return NextResponse.json({
        success: false,
        error: 'bairro, cidade e tipo são obrigatórios'
      }, { status: 400 });
    }
    
    const radarRequest: RadarMercadoRequest = {
      bairro,
      cidade,
      tipo_analise: tipo as any
    };

    const resultado = await executarRadarMercado(radarRequest);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Radar de mercado consultado com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar radar:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar radar',
      details: error.message
    }, { status: 500 });
  }
}
