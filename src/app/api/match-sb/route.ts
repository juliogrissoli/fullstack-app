// 🏛️ SECURITY BROKER SB v13 - MOTOR DE MATCH DE ÁREAS
// Land Banking & Permuta com DNA de Negócio e Monetização

import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient, supabaseAdmin, validateUserContext, logSecurityEvent } from '@/lib/supabase-clients';

// Use anon key client for public operations - SECURITY FIX
const supabase = supabaseClient;

interface MatchSBRequest {
  incorporadora_id: string;
  broker_id: string;
  tipo_match: 'permuta_fisica' | 'permuta_financeira' | 'hibrido' | 'estruturado';
  configuracoes_negocio: {
    percentual_fisico?: number;
    percentual_financeiro?: number;
    percentual_cash?: number;
    periodo_obra_meses?: number;
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

interface MatchSBResponse {
  success: boolean;
  matches_encontrados: Array<{
    match_id: string;
    permuta_id: string;
    score_match: number;
    tipo_match: string;
    detalhes: {
      permuta_endereco: string;
      permuta_area: number;
      permuta_valor: number;
      distancia_km: number;
      compatibilidade_area: number;
      compatibilidade_valor: number;
    };
    monetizacao_sb: {
      percentual: number;
      valor_intermediacao: number;
    };
    status: string;
  }>;
  gap_bairro: {
    demanda_total: number;
    oferta_total: number;
    gap_numerico: number;
    gap_percentual: number;
    status_gap: string;
  };
  bi_analise: {
    total_permutas_disponiveis: number;
    total_matches_possiveis: number;
    score_medio_matches: number;
    oportunidades_prioritarias: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Validate authentication
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    let user;
    
    try {
      user = await validateUserContext(token || '');
    } catch (authError) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        details: authError instanceof Error ? authError.message : 'Authentication failed'
      }, { status: 401 });
    }

    const body: MatchSBRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!body.incorporadora_id || !body.broker_id || !body.tipo_match) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }

    // SECURITY: Log the operation
    await logSecurityEvent(
      user.id,
      'match_sb_execute',
      'match_sb',
      { body, timestamp: new Date().toISOString() },
      request.headers.get('x-forwarded-for') || 'unknown'
    );

    // Executar motor de match
    const resultado = await executarMatchSB(body);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Match SB executado com sucesso'
    });

  } catch (error: any) {
    console.error('Erro no Motor de Match SB:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Motor de Match SB',
      details: error.message
    }, { status: 500 });
  }
}

async function executarMatchSB(request: MatchSBRequest): Promise<MatchSBResponse> {
  const { incorporadora_id, broker_id, tipo_match, configuracoes_negocio, criterios_busca } = request;
  
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
  const matchesEncontrados: MatchSBResponse['matches_encontrados'] = [];
  
  for (const empreendimento of empreendimentos) {
    for (const permuta of permutas) {
      // Calcular score de match
      const scoreMatch = await calcularScoreMatch(empreendimento, permuta, criterios_busca?.raio_km || 20);
      
      // Apenas considerar matches com score >= 50
      if (scoreMatch >= 50) {
        // Calcular detalhes do match
        const detalhesMatch = await calcularDetalhesMatch(empreendimento, permuta);
        
        // Calcular monetização para SB (10%-20%)
        const monetizacaoSB = calcularMonetizacaoSB(permuta.valor_mercado, tipo_match);
        
        // Criar registro do match
        const { data: matchCriado, error: errorMatch } = await supabase
          .from('matches_permuta')
          .insert({
            incorporadora_id,
            empreendimento_id: empreendimento.id,
            permuta_id: permuta.id,
            broker_id,
            score_match: scoreMatch,
            tipo_match,
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
            tipo_match,
            detalhes: detalhesMatch,
            monetizacao_sb: monetizacaoSB,
            status: 'pendente'
          });
        }
      }
    }
  }

  // 4. Calcular Gap do Bairro
  const gapBairro = await calcularGapBairro(empreendimentos);

  // 5. Gerar análise de BI
  const biAnalise = await gerarBIAnalise(matchesEncontrados, permutas.length);

  // 6. Ordenar matches por score
  matchesEncontrados.sort((a, b) => b.score_match - a.score_match);

  return {
    success: true,
    matches_encontrados: matchesEncontrados,
    gap_bairro: gapBairro,
    bi_analise: biAnalise
  };
}

async function calcularScoreMatch(
  empreendimento: any,
  permuta: any,
  raioKm: number = 20
): Promise<number> {
  let score = 0;
  
  // 1. Proximidade geográfica (40%)
  const distancia = await calcularDistancia(
    empreendimento.coordenadas,
    permuta.coordenadas
  );
  
  if (distancia <= raioKm) {
    score += 40 * (1 - distancia / raioKm); // Decrescente com distância
  }
  
  // 2. Compatibilidade de área (30%)
  const areaRatio = Math.min(permuta.area_m2 / empreendimento.area_total_m2, 2);
  const areaScore = Math.max(0, 30 * (1 - Math.abs(1 - areaRatio)));
  score += areaScore;
  
  // 3. Compatibilidade de valor (30%)
  const valorRatio = Math.min(permuta.valor_mercado / empreendimento.valor_medio_unidade, 2);
  const valorScore = Math.max(0, 30 * (1 - Math.abs(1 - valorRatio)));
  score += valorScore;
  
  return Math.round(score * 100) / 100; // Arredondar para 2 casas decimais
}

async function calcularDistancia(coord1: string, coord2: string): Promise<number> {
  // Simplificação - em produção usar função geográfica real
  return Math.random() * 15; // Simular distância em km
}

async function calcularDetalhesMatch(empreendimento: any, permuta: any): Promise<any> {
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
    ) / 100
  };
}

function calcularMonetizacaoSB(valorMercado: number, tipoMatch: string): {
  percentual: number;
  valor_intermediacao: number;
} {
  // Percentual baseado no tipo de match
  let percentual = 15; // Padrão 15%
  
  switch (tipoMatch) {
    case 'permuta_fisica':
      percentual = 10; // 10% para permuta física simples
      break;
    case 'permuta_financeira':
      percentual = 20; // 20% para permuta financeira complexa
      break;
    case 'hibrido':
      percentual = 15; // 15% para híbrido
      break;
    case 'estruturado':
      percentual = 18; // 18% para estruturado
      break;
  }
  
  const valorIntermediacao = valorMercado * (percentual / 100);
  
  return {
    percentual,
    valor_intermediacao: Math.round(valorIntermediacao * 100) / 100
  };
}

async function calcularGapBairro(empreendimentos: any[]): Promise<any> {
  // Agrupar por bairro
  const bairros = new Map();
  
  for (const emp of empreendimentos) {
    if (!bairros.has(emp.bairro)) {
      bairros.set(emp.bairro, {
        bairro: emp.bairro,
        cidade: emp.cidade,
        demanda_total: 0,
        oferta_total: 0
      });
    }
    
    const bairro = bairros.get(emp.bairro);
    bairro.oferta_total += emp.unidades_disponiveis;
  }
  
  // Calcular demanda (simulação)
  for (const [bairro, dados] of bairros) {
    dados.demanda_total = Math.floor(dados.oferta_total * (0.8 + Math.random() * 0.4)); // 80%-120%
  }
  
  // Calcular gap
  const gaps = Array.from(bairros.values()).map(dados => ({
    ...dados,
    gap_numerico: dados.demanda_total - dados.oferta_total,
    gap_percentual: dados.oferta_total > 0 
      ? Math.round(((dados.demanda_total - dados.oferta_total) / dados.oferta_total) * 100 * 100) / 100
      : 0,
    status_gap: dados.demanda_total > dados.oferta_total ? 'excesso_demanda' : 
                 dados.demanda_total < dados.oferta_total ? 'excesso_oferta' : 'equilibrado'
  }));
  
  // Retornar o bairro com maior gap
  const maiorGap = gaps.reduce((maior, atual) => 
    Math.abs(atual.gap_percentual) > Math.abs(maior.gap_percentual) ? atual : maior
  );
  
  return maiorGap;
}

async function gerarBIAnalise(matches: any[], totalPermutas: number): Promise<any> {
  const totalMatches = matches.length;
  const scoreMedio = totalMatches > 0 
    ? matches.reduce((sum, m) => sum + m.score_match, 0) / totalMatches 
    : 0;
  const oportunidadesPrioritarias = matches.filter(m => m.score_match >= 80).length;
  
  return {
    total_permutas_disponiveis: totalPermutas,
    total_matches_possiveis: totalMatches,
    score_medio_matches: Math.round(scoreMedio * 100) / 100,
    oportunidades_prioritarias: oportunidadesPrioritarias
  };
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
      resultado = await confirmarMatch(match);
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

async function confirmarMatch(match: any): Promise<any> {
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
      mensagem: `Match confirmado com sucesso! Intermediação de R$ ${match.valor_intermediacao.toLocaleString('pt-BR')} processada.`,
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
      user_agent: 'SB Match System',
      dados_acao: {
        match_id: match.id,
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
