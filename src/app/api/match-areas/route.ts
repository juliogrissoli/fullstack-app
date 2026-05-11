// 🏛️ SECURITY BROKER SB v14 - MATCH DE ÁREA E PERMUTA CONSOLIDADO
// Botão MATCH habilitado para Tipos de Negócio com Estudo de Demanda do Bairro

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

interface MatchAreasRequest {
  incorporadora_id: string;
  broker_id: string;
  tipo_negocio: 'permuta_fisica' | 'permuta_financeira' | 'venda_vista' | 'hibrido' | 'estruturado';
  configuracoes_negocio: {
    percentual_fisico?: number;
    percentual_financeiro?: number;
    percentual_cash?: number;
    periodo_obra_meses?: number;
    valor_entrada?: number;
  };
  criterios_busca?: {
    bairros?: string[];
    raio_km?: number;
    area_min?: number;
    area_max?: number;
    valor_min?: number;
    valor_max?: number;
  };
}

interface MatchAreasResponse {
  success: boolean;
  matches_encontrados: Array<{
    match_id: string;
    permuta_id: string;
    score_match: number;
    tipo_negocio: string;
    detalhes: {
      permuta_endereco: string;
      permuta_area: number;
      permuta_valor: number;
      distancia_km: number;
      compatibilidade_area: number;
      compatibilidade_valor: number;
      viabilidade_negocio: number;
    };
    configuracao_negocio: {
      percentuais: Record<string, number>;
      detalhes: Record<string, any>;
    };
    monetizacao_sb: {
      percentual: number;
      valor_intermediacao: number;
    };
    status: string;
  }>;
  estudo_demanda_bairro?: {
    bairro: string;
    demanda_total: number;
    oferta_total: number;
    gap_quantitativo: number;
    gap_percentual: number;
    banco_areas_disponiveis: number;
    areas_escassas: string[];
    tendencia_mercado: string;
    oportunidade_score: number;
    recomendacoes: string[];
  };
  bi_analise: {
    total_permutas_disponiveis: number;
    total_matches_possiveis: number;
    score_medio_matches: number;
    viabilidade_media_negocio: number;
    oportunidades_prioritarias: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: MatchAreasRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!body.incorporadora_id || !body.broker_id || !body.tipo_negocio) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }

    // Executar match de áreas consolidado
    const resultado = await executarMatchAreas(body);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Match de áreas consolidado executado com sucesso'
    });

  } catch (error: any) {
    console.error('Erro no Match de Áreas:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Match de Áreas',
      details: error.message
    }, { status: 500 });
  }
}

async function executarMatchAreas(request: MatchAreasRequest): Promise<MatchAreasResponse> {
  const { incorporadora_id, broker_id, tipo_negocio, configuracoes_negocio, criterios_busca } = request;
  
  // 1. Buscar empreendimentos da incorporadora
  const { data: empreendimentos, error: errorEmpreendimentos } = await supabase
    .from('empreendimentos_sb')
    .select('*')
    .eq('incorporadora_id', incorporadora_id)
    .eq('status', 'lancamento');
  
  if (errorEmpreendimentos || !empreendimentos || empreendimentos.length === 0) {
    throw new Error('Nenhum empreendimento em lançamento encontrado');
  }

  // 2. Buscar permutas disponíveis no banco
  let queryPermutas = supabase
    .from('banco_permutas')
    .select('*')
    .eq('status', 'disponivel');
  
  // Aplicar filtros de busca se fornecidos
  if (criterios_busca?.bairros && criterios_busca.bairros.length > 0) {
    queryPermutas = queryPermutas.in('bairro', criterios_busca.bairros);
  }
  
  if (criterios_busca?.area_min) {
    queryPermutas = queryPermutas.gte('area_m2', criterios_busca.area_min);
  }
  
  if (criterios_busca?.area_max) {
    queryPermutas = queryPermutas.lte('area_m2', criterios_busca.area_max);
  }
  
  if (criterios_busca?.valor_min) {
    queryPermutas = queryPermutas.gte('valor_mercado', criterios_busca.valor_min);
  }
  
  if (criterios_busca?.valor_max) {
    queryPermutas = queryPermutas.lte('valor_mercado', criterios_busca.valor_max);
  }
  
  const { data: permutas, error: errorPermutas } = await queryPermutas;
  
  if (errorPermutas || !permutas) {
    throw new Error('Erro ao buscar permutas disponíveis');
  }

  // 3. Calcular matches para cada empreendimento
  const matchesEncontrados: MatchAreasResponse['matches_encontrados'] = [];
  
  for (const empreendimento of empreendimentos) {
    for (const permuta of permutas) {
      // Calcular score de match
      const scoreMatch = await calcularScoreMatchConsolidado(empreendimento, permuta, tipo_negocio, criterios_busca?.raio_km || 20);
      
      // Apenas considerar matches com score >= 50
      if (scoreMatch >= 50) {
        // Calcular detalhes do match
        const detalhesMatch = await calcularDetalhesMatchConsolidado(empreendimento, permuta, tipo_negocio);
        
        // Calcular viabilidade do negócio
        const viabilidadeNegocio = calcularViabilidadeNegocio(tipo_negocio, configuracoes_negocio, permuta.valor_mercado);
        
        // Calcular monetização para SB
        const monetizacaoSB = calcularMonetizacaoSBConsolidado(permuta.valor_mercado, tipo_negocio);
        
        // Criar registro do match
        const { data: matchCriado, error: errorMatch } = await supabase
          .from('matches_permuta')
          .insert({
            incorporadora_id,
            empreendimento_id: empreendimento.id,
            permuta_id: permuta.id,
            broker_id,
            score_match: scoreMatch,
            tipo_match: tipo_negocio,
            detalhes_match: detalhesMatch,
            status: 'pendente',
            percentual_sb: monetizacaoSB.percentual,
            valor_intermediacao: monetizacaoSB.valor_intermediacao
          })
          .select('id')
          .single();
        
        if (!errorMatch && matchCriado) {
          matchesEncontrados.push({
            match_id: matchCriado.id,
            permuta_id: permuta.id,
            score_match: scoreMatch,
            tipo_negocio,
            detalhes: detalhesMatch,
            configuracao_negocio: {
              percentuais: configuracoes_negocio,
              detalhes: detalhesMatch
            },
            monetizacao_sb: monetizacaoSB,
            status: 'pendente'
          });
        }
      }
    }
  }

  // 4. Gerar Estudo de Demanda do Bairro
  const estudoDemanda = await gerarEstudoDemandaBairro(empreendimentos, permutas);

  // 5. Gerar análise de BI
  const biAnalise = await gerarBIAnaliseConsolidada(matchesEncontrados, permutas.length);

  // 6. Ordenar matches por score e viabilidade
  matchesEncontrados.sort((a, b) => {
    // Primeiro por score (60%), depois por viabilidade (40%)
    const scoreA = a.score_match * 0.6 + a.detalhes.viabilidade_negocio * 0.4;
    const scoreB = b.score_match * 0.6 + b.detalhes.viabilidade_negocio * 0.4;
    return scoreB - scoreA;
  });

  return {
    success: true,
    matches_encontrados: matchesEncontrados,
    estudo_demanda_bairro: estudoDemanda,
    bi_analise: biAnalise
  };
}

async function calcularScoreMatchConsolidado(
  empreendimento: any,
  permuta: any,
  tipoNegocio: string,
  raioKm: number = 20
): Promise<number> {
  let score = 0;
  
  // 1. Proximidade geográfica (30%)
  const distancia = await calcularDistancia(
    empreendimento.coordenadas,
    permuta.coordenadas
  );
  
  if (distancia <= raioKm) {
    score += 30 * (1 - distancia / raioKm); // Decrescente com distância
  }
  
  // 2. Compatibilidade de área (25%)
  const areaRatio = Math.min(permuta.area_m2 / empreendimento.area_total_m2, 2);
  const areaScore = Math.max(0, 25 * (1 - Math.abs(1 - areaRatio)));
  score += areaScore;
  
  // 3. Compatibilidade de valor (25%)
  const valorRatio = Math.min(permuta.valor_mercado / empreendimento.valor_medio_unidade, 2);
  const valorScore = Math.max(0, 25 * (1 - Math.abs(1 - valorRatio)));
  score += valorScore;
  
  // 4. Viabilidade do tipo de negócio (20%)
  const viabilidadeScore = calcularViabilidadeScore(tipoNegocio, permuta.valor_mercado);
  score += viabilidadeScore * 0.2;
  
  return Math.round(score * 100) / 100; // Arredondar para 2 casas decimais
}

async function calcularDetalhesMatchConsolidado(
  empreendimento: any,
  permuta: any,
  tipoNegocio: string
): Promise<any> {
  const distancia = await calcularDistancia(empreendimento.coordenadas, permuta.coordenadas);
  
  return {
    permuta_endereco: permuta.endereco,
    permuta_area: permuta.area_m2,
    permuta_valor: permuta.valor_mercado,
    distancia_km: Math.round(distancia * 100) / 100,
    compatibilidade_area: Math.round(
      Math.max(0, 100 * (1 - Math.abs(1 - permuta.area_m2 / empreendimento.area_total_m2))) * 100
    ) / 100,
    compatibilidade_valor: Math.round(
      Math.max(0, 100 * (1 - Math.abs(1 - permuta.valor_mercado / empreendimento.valor_medio_unidade))) * 100
    ) / 100,
    viabilidade_negocio: calcularViabilidadeScore(tipoNegocio, permuta.valor_mercado)
  };
}

function calcularViabilidadeScore(tipoNegocio: string, valorMercado: number): number {
  // Score baseado no tipo de negócio e valor
  let scoreBase = 50; // Base neutro
  
  switch (tipoNegocio) {
    case 'permuta_fisica':
      scoreBase = 80; // Alta viabilidade
      break;
    case 'permuta_financeira':
      scoreBase = 60; // Média viabilidade
      break;
    case 'venda_vista':
      scoreBase = 90; // Altíssima viabilidade
      break;
    case 'hibrido':
      scoreBase = 70; // Boa viabilidade
      break;
    case 'estruturado':
      scoreBase = 55; // Média-baixa viabilidade
      break;
  }
  
  // Ajuste baseado no valor (valores muito altos ou muito baixos reduzem viabilidade)
  if (valorMercado > 2000000) {
    scoreBase -= 20; // Valor muito alto
  } else if (valorMercado < 200000) {
    scoreBase -= 15; // Valor muito baixo
  }
  
  return Math.max(0, Math.min(100, scoreBase));
}

function calcularViabilidadeNegocio(tipoNegocio: string, configuracoes: any, valorMercado: number): number {
  let viabilidade = 50;
  
  switch (tipoNegocio) {
    case 'permuta_fisica':
      viabilidade = 85; // Alta viabilidade
      break;
    case 'permuta_financeira':
      viabilidade = 70; // Configurações complexas
      if (configuracoes.percentual_financeiro > 70) {
        viabilidade -= 20; // Muito arriscado
      }
      break;
    case 'venda_vista':
      viabilidade = 95; // Altíssima viabilidade
      break;
    case 'hibrido':
      viabilidade = 75; // Balanceado
      if (configuracoes.percentual_fisico < 30 || configuracoes.percentual_financeiro < 30) {
        viabilidade -= 15; // Desbalanceado
      }
      break;
    case 'estruturado':
      viabilidade = 60; // Complexo
      if (configuracoes.periodo_obra_meses > 24) {
        viabilidade -= 25; // Prazo muito longo
      }
      break;
  }
  
  // Ajuste baseado no valor
  if (valorMercado > 1500000) {
    viabilidade -= 10;
  }
  
  return Math.max(0, Math.min(100, viabilidade));
}

function calcularMonetizacaoSBConsolidado(valorMercado: number, tipoNegocio: string): {
  percentual: number;
  valor_intermediacao: number;
} {
  // Percentual baseado no tipo de negócio e complexidade
  let percentual = 15; // Padrão 15%
  
  switch (tipoNegocio) {
    case 'permuta_fisica':
      percentual = 12; // 12% para permuta física simples
      break;
    case 'permuta_financeira':
      percentual = 18; // 18% para permuta financeira complexa
      break;
    case 'venda_vista':
      percentual = 10; // 10% para venda à vista
      break;
    case 'hibrido':
      percentual = 15; // 15% para híbrido
      break;
    case 'estruturado':
      percentual = 20; // 20% para estruturado
      break;
  }
  
  // Ajuste baseado no valor
  if (valorMercado > 1000000) {
    percentual = Math.max(percentual - 2, 8); // Reduzir para valores altos
  }
  
  const valorIntermediacao = valorMercado * (percentual / 100);
  
  return {
    percentual,
    valor_intermediacao: Math.round(valorIntermediacao * 100) / 100
  };
}

async function gerarEstudoDemandaBairro(empreendimentos: any[], permutas: any[]): Promise<MatchAreasResponse['estudo_demanda_bairro']> {
  // Agrupar por bairro
  const bairros = new Map();
  
  for (const emp of empreendimentos) {
    if (!bairros.has(emp.bairro)) {
      bairros.set(emp.bairro, {
        bairro: emp.bairro,
        cidade: emp.cidade,
        demanda_total: 0,
        oferta_total: 0,
        banco_areas_disponiveis: 0
      });
    }
    
    const bairro = bairros.get(emp.bairro);
    bairro.oferta_total += emp.unidades_disponiveis;
  }
  
  // Contar permutas por bairro
  for (const permuta of permutas) {
    if (bairros.has(permuta.bairro)) {
      const bairro = bairros.get(permuta.bairro);
      bairro.banco_areas_disponiveis += 1;
    }
  }
  
  // Calcular demanda (simulação baseada em leads)
  for (const [bairro, dados] of bairros) {
    dados.demanda_total = Math.floor(dados.oferta_total * (0.8 + Math.random() * 0.6)); // 80%-140%
    
    // Calcular gaps
    dados.gap_quantitativo = dados.demanda_total - dados.oferta_total;
    dados.gap_percentual = dados.oferta_total > 0 
      ? Math.round(((dados.demanda_total - dados.oferta_total) / dados.oferta_total) * 100 * 100) / 100
      : 0;
    
    // Determinar áreas escassas
    dados.areas_escassas = ['Apartamentos 2 quartos', 'Casas com jardim', 'Lojas comerciais'];
    
    // Tendência de mercado
    dados.tendencia_mercado = dados.gap_percentual > 20 ? 'aquecimento' : 
                           dados.gap_percentual < -20 ? 'resfriamento' : 'estabilidade';
  }
  
  // Retornar o bairro com maior oportunidade
  const bairrosArray = Array.from(bairros.values());
  const melhorBairro = bairrosArray.reduce((melhor, atual) => 
    Math.abs(atual.gap_percentual) > Math.abs(melhor.gap_percentual) ? atual : melhor
  );
  
  // Calcular score de oportunidade
  const oportunidadeScore = calcularOportunidadeScore(melhorBairro);
  
  // Gerar recomendações
  const recomendacoes = gerarRecomendacoesBairro(melhorBairro);
  
  return {
    ...melhorBairro,
    oportunidade_score: oportunidadeScore,
    recomendacoes
  };
}

function calcularOportunidadeScore(bairro: any): number {
  let score = 50; // Base
  
  // Demanda vs Oferta (40%)
  if (bairro.gap_percentual > 20) {
    score += 40; // Alta demanda
  } else if (bairro.gap_percentual > 10) {
    score += 25; // Demanda moderada
  } else if (bairro.gap_percentual < -20) {
    score -= 20; // Excesso de oferta
  }
  
  // Banco de áreas (30%)
  if (bairro.banco_areas_disponiveis > 15) {
    score += 30;
  } else if (bairro.banco_areas_disponiveis > 5) {
    score += 15;
  }
  
  // Tendência (30%)
  if (bairro.tendencia_mercado === 'aquecimento') {
    score += 30;
  } else if (bairro.tendencia_mercado === 'estabilidade') {
    score += 15;
  } else if (bairro.tendencia_mercado === 'resfriamento') {
    score -= 15;
  }
  
  return Math.max(0, Math.min(100, score));
}

function gerarRecomendacoesBairro(bairro: any): string[] {
  const recomendacoes: string[] = [];
  
  if (bairro.gap_percentual > 20) {
    recomendacoes.push('Alta demanda vs oferta - Oportunidade para novos lançamentos');
    recomendacoes.push('Priorizar marketing para este bairro');
  } else if (bairro.gap_percentual < -20) {
    recomendacoes.push('Excesso de oferta - Focar em diferenciais competitivos');
    recomendacoes.push('Considerar promoções ou incentivos');
  }
  
  if (bairro.banco_areas_disponiveis > 10) {
    recomendacoes.push('Banco de áreas robusto - Oportunidade para permutas');
    recomendacoes.push('Criar campanhas específicas para permuta');
  }
  
  if (bairro.tendencia_mercado === 'aquecimento') {
    recomendacoes.push('Mercado em aquecimento - Ajustar preços para cima');
    recomendacoes.push('Acelerar lançamentos');
  } else if (bairro.tendencia_mercado === 'resfriamento') {
    recomendacoes.push('Mercado em resfriamento - Oferecer condições especiais');
    recomendacoes.push('Focar em valorização e qualidade');
  }
  
  return recomendacoes;
}

async function gerarBIAnaliseConsolidada(matches: any[], totalPermutas: number): Promise<MatchAreasResponse['bi_analise']> {
  const totalMatches = matches.length;
  const scoreMedio = totalMatches > 0 
    ? matches.reduce((sum, m) => sum + m.score_match, 0) / totalMatches 
    : 0;
  const viabilidadeMedia = totalMatches > 0
    ? matches.reduce((sum, m) => sum + m.detalhes.viabilidade_negocio, 0) / totalMatches
    : 0;
  const oportunidadesPrioritarias = matches.filter(m => 
    m.score_match >= 80 && m.detalhes.viabilidade_negocio >= 80
  ).length;
  
  return {
    total_permutas_disponiveis: totalPermutas,
    total_matches_possiveis: totalMatches,
    score_medio_matches: Math.round(scoreMedio * 100) / 100,
    viabilidade_media_negocio: Math.round(viabilidadeMedia * 100) / 100,
    oportunidades_prioritarias: oportunidadesPrioritarias
  };
}

async function calcularDistancia(coord1: string, coord2: string): Promise<number> {
  // Simplificação - em produção usar função geográfica real
  return Math.random() * 15; // Simular distância em km
}

// Endpoint para confirmar match
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { match_id, broker_id, acao } = body; // acao: 'confirmar' ou 'rejeitar'
    
    if (!match_id || !broker_id || !acao) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }
    
    // Buscar match
    const { data: match, error: errorMatch } = await supabase
      .from('matches_permuta')
      .select('*')
      .eq('id', match_id)
      .single();
    
    if (errorMatch || !match) {
      return NextResponse.json({
        success: false,
        error: 'Match não encontrado'
      }, { status: 404 });
    }
    
    // Verificar se o broker tem permissão
    if (match.broker_id !== broker_id) {
      return NextResponse.json({
        success: false,
        error: 'Broker não autorizado para este match'
      }, { status: 403 });
    }
    
    let resultado;
    
    if (acao === 'confirmar') {
      resultado = await confirmarMatchConsolidado(match);
    } else if (acao === 'rejeitar') {
      resultado = await rejeitarMatch(match);
    } else {
      return NextResponse.json({
        success: false,
        error: 'Ação inválida'
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: `Match ${acao} com sucesso`
    });
    
  } catch (error: any) {
    console.error('Erro ao processar match:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao processar match',
      details: error.message
    }, { status: 500 });
  }
}

async function confirmarMatchConsolidado(match: any): Promise<any> {
  // Atualizar status do match
  const { data, error } = await supabase
    .from('matches_permuta')
    .update({
      status: 'confirmado',
      data_confirmacao: new Date().toISOString()
    })
    .eq('id', match.id)
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao confirmar match: ${error.message}`);
  }
  
  // Atualizar status da permuta
  await supabase
    .from('banco_permutas')
    .update({ status: 'matched' })
    .eq('id', match.permuta_id);
  
  // Criar notificação
  await supabase
    .from('notificacoes')
    .insert({
      broker_id: match.broker_id,
      incorporadora_id: match.incorporadora_id,
      tipo: 'match',
      titulo: 'Match Confirmado',
      mensagem: `Match ${match.tipo_match} confirmado! Intermediação de R$ ${match.valor_intermediacao.toLocaleString('pt-BR')} processada.`,
      status: 'nao_lida'
    });
  
  // Gerar Nexo Causal
  await supabase
    .from('nexo_causal')
    .insert({
      lead_id: match.permuta_id, // Usar permuta_id como referência
      broker_id: match.broker_id,
      acao: 'match_confirmado',
      ip_address: '127.0.0.1',
      user_agent: 'SB Match Consolidado',
      dados_acao: {
        match_id: match.id,
        tipo_negocio: match.tipo_match,
        valor_intermediacao: match.valor_intermediacao,
        percentual_sb: match.percentual_sb
      }
    });
  
  return data;
}

async function rejeitarMatch(match: any): Promise<any> {
  // Atualizar status do match
  const { data, error } = await supabase
    .from('matches_permuta')
    .update({ status: 'rejeitado' })
    .eq('id', match.id)
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao rejeitar match: ${error.message}`);
  }
  
  // Liberar permuta para outros matches
  await supabase
    .from('banco_permutas')
    .update({ status: 'disponivel' })
    .eq('id', match.permuta_id);
  
  return data;
}

// Endpoint para consultar matches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const incorporadora_id = searchParams.get('incorporadora_id');
    const broker_id = searchParams.get('broker_id');
    const status = searchParams.get('status');
    const tipo_negocio = searchParams.get('tipo_negocio');
    
    let query = supabase
      .from('matches_permuta')
      .select(`
        *,
        empreendimentos_sb!inner(
          id,
          nome,
          bairro,
          cidade
        ),
        banco_permutas!inner(
          id,
          endereco,
          area_m2,
          valor_mercado
        ),
        brokers!inner(
          id,
          nome
        )
      `);
    
    if (incorporadora_id) {
      query = query.eq('incorporadora_id', incorporadora_id);
    }
    
    if (broker_id) {
      query = query.eq('broker_id', broker_id);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (tipo_negocio) {
      query = query.eq('tipo_match', tipo_negocio);
    }
    
    const { data, error } = await query
      .order('score_match', { ascending: false });
    
    if (error) {
      throw new Error(`Erro ao consultar matches: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      data: data || [],
      message: 'Matches consultados com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar matches:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar matches',
      details: error.message
    }, { status: 500 });
  }
}
