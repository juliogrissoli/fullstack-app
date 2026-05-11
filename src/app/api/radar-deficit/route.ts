// 🏛️ SECURITY BROKER SB v16 - RADAR DE DÉFICIT HABITACIONAL & ORIGINAÇÃO
// Dashboard georreferenciado de regiões com alto déficit habitacional

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

interface RadarDeficitRequest {
  cidade?: string;
  estado?: string;
  raio_km?: number;
  filtros?: {
    score_minimo?: number;
    classificacao?: string;
    tendencia_mercado?: string;
  };
}

interface RadarDeficitResponse {
  success: boolean;
  regioes_analisadas?: Array<{
    id: string;
    nome_regiao: string;
    cidade: string;
    estado: string;
    coordenadas: { lat: number; lng: number };
    deficit_habitacional: {
      quantitativo: number;
      percentual: number;
      demanda_reprimida: number;
      total_necessidade: number;
    };
    dados_mercado: {
      preco_medio_m2: number;
      preco_minimo_viavel: number;
      oferta_publica: number;
      tempo_medio_venda: number;
    };
    indices_oportunidade: {
      score_oportunidade: number;
      indice_escassez: number;
      potencial_valorizacao: number;
      classificacao: string;
      tendencia_mercado: string;
    };
    recomendacoes: string[];
  }>;
  analise_geral?: {
    total_regioes: number;
    media_score_oportunidade: number;
    deficit_total: number;
    oportunidade_principal: {
      nome_regiao: string;
      score: number;
      motivo: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: RadarDeficitRequest = await request.json();
    
    // Executar análise de déficit habitacional
    const resultado = await analisarRadarDeficit(body);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Radar de déficit habitacional analisado com sucesso'
    });

  } catch (error: any) {
    console.error('Erro no Radar de Déficit Habitacional:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Radar de Déficit Habitacional',
      details: error.message
    }, { status: 500 });
  }
}

async function analisarRadarDeficit(request: RadarDeficitRequest): Promise<RadarDeficitResponse> {
  const { cidade, estado, raio_km, filtros } = request;
  
  let query = supabase
    .from('dashboard_deficit_habitacional')
    .select('*');
  
  // Aplicar filtros
  if (cidade) {
    query = query.ilike('cidade', `%${cidade}%`);
  }
  
  if (estado) {
    query = query.eq('estado', estado);
  }
  
  if (filtros?.score_minimo) {
    query = query.gte('score_oportunidade', filtros.score_minimo);
  }
  
  if (filtros?.classificacao) {
    query = query.eq('classificacao', filtros.classificacao);
  }
  
  if (filtros?.tendencia_mercado) {
    query = query.eq('tendencia_mercado', filtros.tendencia_mercado);
  }
  
  const { data: regioes, error } = await query
    .order('score_oportunidade', { ascending: false })
    .limit(50);
  
  if (error) {
    throw new Error(`Erro ao buscar regiões: ${error.message}`);
  }
  
  // Processar coordenadas e formatar dados
  const regioesFormatadas = (regioes || []).map(regiao => ({
    id: regiao.id,
    nome_regiao: regiao.nome_regiao,
    cidade: regiao.cidade,
    estado: regiao.estado,
    coordenadas: {
      lat: parseFloat(regiao.coordenadas?.coordinates?.[1] || '0'),
      lng: parseFloat(regiao.coordenadas?.coordinates?.[0] || '0')
    },
    deficit_habitacional: {
      quantitativo: regiao.deficit_quantitativo,
      percentual: regiao.deficit_percentual,
      demanda_reprimida: regiao.demanda_reprimida,
      total_necessidade: regiao.deficit_quantitativo + regiao.demanda_reprimida
    },
    dados_mercado: {
      preco_medio_m2: regiao.preco_medio_m2,
      preco_minimo_viavel: regiao.preco_minimo_viavel,
      oferta_publica: regiao.oferta_publica,
      tempo_medio_venda: regiao.tempo_medio_venda
    },
    indices_oportunidade: {
      score_oportunidade: regiao.score_oportunidade,
      indice_escassez: regiao.indice_escassez,
      potencial_valorizacao: regiao.potencial_valorizacao,
      classificacao: regiao.classificacao,
      tendencia_mercado: regiao.tendencia_mercado
    },
    recomendacoes: gerarRecomendacoesRegiao(regiao)
  }));
  
  // Análise geral
  const analiseGeral = gerarAnaliseGeral(regioesFormatadas);
  
  return {
    success: true,
    regioes_analisadas: regioesFormatadas,
    analise_geral: analiseGeral
  };
}

function gerarRecomendacoesRegiao(regiao: any): string[] {
  const recomendacoes: string[] = [];
  
  if (regiao.score_oportunidade >= 80) {
    recomendacoes.push('Alta prioridade - Investir imediatamente');
    recomendacoes.push('ROI projetado acima de 20% ao ano');
  } else if (regiao.score_oportunidade >= 60) {
    recomendacoes.push('Média prioridade - Avaliar oportunidade');
    recomendacoes.push('Equilíbrio risco/retorno favorável');
  } else {
    recomendacoes.push('Baixa prioridade - Monitorar mercado');
    recomendacoes.push('Aguardar melhores condições');
  }
  
  if (regiao.oferta_publica < regiao.deficit_quantitativo) {
    recomendacoes.push('Déficit de oferta - Oportunidade de lançamento');
    recomendacoes.push('Considerar desenvolvimento de novos empreendimentos');
  } else {
    recomendacoes.push('Oferta adequada - Focar em qualidade e diferenciais');
  }
  
  if (regiao.tendencia_mercado === 'aquecimento') {
    recomendacoes.push('Mercado em aquecimento - Preços em alta');
    recomendacoes.push('Acelerar decisões de investimento');
  } else if (regiao.tendencia_mercado === 'resfriamento') {
    recomendacoes.push('Mercado em resfriamento - Oportunidade de negociação');
    recomendacoes.push('Buscar melhores condições de aquisição');
  }
  
  if (regiao.poder_aquisitivo_medio > 10000) {
    recomendacoes.push('Alto poder aquisitivo - Focar em imóveis premium');
  } else {
    recomendacoes.push('Poder aquisitivo moderado - Focar em imóveis populares');
  }
  
  return recomendacoes;
}

function gerarAnaliseGeral(regioes: any[]): RadarDeficitResponse['analise_geral'] {
  if (!regioes || regioes.length === 0) {
    return {
      total_regioes: 0,
      media_score_oportunidade: 0,
      deficit_total: 0,
      oportunidade_principal: {
        nome_regiao: '',
        score: 0,
        motivo: 'Nenhuma região encontrada'
      }
    };
  }
  
  const totalRegioes = regioes.length;
  const mediaScore = regioes.reduce((sum, r) => sum + r.indices_oportunidade.score_oportunidade, 0) / totalRegioes;
  const deficitTotal = regioes.reduce((sum, r) => sum + r.deficit_habitacional.total_necessidade, 0);
  
  const oportunidadePrincipal = regioes.reduce((melhor, atual) => 
    atual.indices_oportunidade.score_oportunidade > melhor.indices_oportunidade.score_oportunidade ? atual : melhor
  );
  
  return {
    total_regioes: totalRegioes,
    media_score_oportunidade: Math.round(mediaScore * 100) / 100,
    deficit_total: deficitTotal,
    oportunidade_principal: {
      nome_regiao: oportunidadePrincipal.nome_regiao,
      score: oportunidadePrincipal.indices_oportunidade.score_oportunidade,
      motivo: oportunidadePrincipal.indices_oportunidade.score_oportunidade >= 80 
        ? 'Score excepcional com alta demanda e baixa oferta'
        : 'Melhor oportunidade disponível na análise'
    }
  };
}

// Endpoint para consultar análise específica de região
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cidade = searchParams.get('cidade');
    const estado = searchParams.get('estado');
    
    if (!cidade || !estado) {
      return NextResponse.json({
        success: false,
        error: 'Cidade e estado são obrigatórios'
      }, { status: 400 });
    }
    
    // Buscar análise específica
    const { data, error } = await supabase
      .rpc('analisar_deficit_habitacional', {
        p_cidade: cidade,
        p_estado: estado
      });
    
    if (error) {
      throw new Error(`Erro ao analisar déficit habitacional: ${error.message}`);
    }
    
    const resultado = Array.isArray(data) ? data[0] : data;
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Análise de déficit habitacional consultada com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar análise de déficit:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar análise',
      details: error.message
    }, { status: 500 });
  }
}
