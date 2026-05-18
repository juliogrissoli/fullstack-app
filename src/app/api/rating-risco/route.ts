// 🏛️ SECURITY BROKER SB v17 - RATING DE RISCO SB (SCORE AAA)
// Algoritmo de Rating com cruzamento de dados e Selo de Confiança

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

interface RatingRiscoRequest {
  projeto_id: string;
  avaliador_id?: string;
  forcar_calculo?: boolean;
}

interface RatingRiscoResponse {
  success: boolean;
  rating_calculado?: {
    id: string;
    score_risco: number;
    rating_final: string;
    data_avaliacao: string;
    status: string;
    elegibilidade_fundo: string;
    status_cor: string;
  };
  analise_detalhada?: {
    documental: {
      percentual: number;
      score: number;
      status: string;
    };
    prazo_obra: {
      meses: number;
      score: number;
      status: string;
    };
    volume_unidades: {
      unidades_dossie: number;
      unidades_total: number;
      percentual: number;
      score: number;
      status: string;
    };
  };
  recomendacoes?: string[];
  restricoes?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: RatingRiscoRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!body.projeto_id) {
      return NextResponse.json({
        success: false,
        error: 'ID do projeto é obrigatório'
      }, { status: 400 });
    }

    // Processar rating de risco
    const resultado = await processarRatingRisco(body);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Rating de risco calculado com sucesso'
    });

  } catch (error: any) {
    console.error('Erro no Rating de Risco:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Rating de Risco',
      details: error.message
    }, { status: 500 });
  }
}

async function processarRatingRisco(request: RatingRiscoRequest): Promise<RatingRiscoResponse['rating_calculado']> {
  const { projeto_id, avaliador_id, forcar_calculo } = request;
  
  // 1. Validar projeto
  const { data: projeto, error: errorProjeto } = await supabase
    .from('empreendimentos_sb')
    .select('*')
    .eq('id', projeto_id)
    .single();
  
  if (errorProjeto || !projeto) {
    throw new Error('Projeto não encontrado');
  }
  
  // 2. Verificar se já existe rating recente
  const { data: ratingExistente } = await supabase
    .from('rating_risco_projetos')
    .select('*')
    .eq('projeto_id', projeto_id)
    .eq('status', 'aprovado')
    .order('data_avaliacao', { ascending: false })
    .limit(1);
  
  if (ratingExistente && ratingExistente.length > 0 && !forcar_calculo) {
    const rating = ratingExistente[0];
    return {
      id: rating.id,
      score_risco: rating.score_risco,
      rating_final: rating.rating_final,
      data_avaliacao: rating.data_avaliacao,
      status: rating.status,
      elegibilidade_fundo: rating.rating_final in ['AAA', 'AA', 'A'] ? 'aprovado_fundo' : 'reprovado_fundo',
      status_cor: rating.score_risco >= 80 ? 'verde' : rating.score_risco >= 60 ? 'amarelo' : 'vermelho'
    };
  }
  
  // 3. Coletar dados para cálculo
  const dadosRating = await coletarDadosRating(projeto_id);
  
  // 4. Criar novo rating
  const { data: novoRating, error: errorRating } = await supabase
    .from('rating_risco_projetos')
    .insert({
      projeto_id,
      percentual_documentacao: dadosRating.percentual_documentacao,
      prazo_obra_meses: dadosRating.prazo_obra_meses,
      unidades_dossie: dadosRating.unidades_dossie,
      unidades_total: dadosRating.unidades_total,
      score_estrutura: dadosRating.score_estrutura,
      score_mercado: dadosRating.score_mercado,
      fator_risco_construcao: dadosRating.fator_risco_construcao,
      fator_risco_mercado: dadosRating.fator_risco_mercado,
      fator_risco_regulatorio: dadosRating.fator_risco_regulatorio,
      fator_risco_financeiro: dadosRating.fator_risco_financeiro,
      status: 'em_analise',
      avaliador_id: avaliador_id || '00000000-0000-0000-0000-000000000000'
    })
    .select('*')
    .single();
  
  if (errorRating) {
    throw new Error(`Erro ao criar rating: ${errorRating.message}`);
  }
  
  // 5. Aprovar rating automaticamente se score >= 60
  if (novoRating.score_risco >= 60) {
    await supabase
      .from('rating_risco_projetos')
      .update({
        status: 'aprovado',
        data_aprovacao: new Date().toISOString()
      })
      .eq('id', novoRating.id);
    
    novoRating.status = 'aprovado';
    novoRating.data_aprovacao = new Date().toISOString();
  }
  
  // 6. Criar notificação
  await supabase
    .from('notificacoes')
    .insert({
      broker_id: avaliador_id || '00000000-0000-0000-0000-000000000000',
      incorporadora_id: projeto.incorporadora_id,
      tipo: 'rating',
      titulo: 'Rating de Risco Calculado',
      mensagem: `Projeto ${projeto.nome} recebeu rating ${novoRating.rating_final} com score ${novoRating.score_risco}`,
      status: 'nao_lida'
    });
  
  return {
    id: novoRating.id,
    score_risco: novoRating.score_risco,
    rating_final: novoRating.rating_final,
    data_avaliacao: novoRating.data_avaliacao,
    status: novoRating.status,
    elegibilidade_fundo: novoRating.rating_final in ['AAA', 'AA', 'A'] ? 'aprovado_fundo' : 'reprovado_fundo',
    status_cor: novoRating.score_risco >= 80 ? 'verde' : novoRating.score_risco >= 60 ? 'amarelo' : 'vermelho'
  };
}

async function coletarDadosRating(projetoId: string): Promise<any> {
  // Simulação de coleta de dados (em produção buscar de tabelas reais)
  
  // 1. Status Documental
  const { data: documentos } = await supabase
    .from('pastas_documentos')
    .select('progresso')
    .eq('empreendimento_id', projetoId);
  
  const percentualDocumentacao = documentos && documentos.length > 0 
    ? documentos.reduce((sum, doc) => sum + doc.progresso, 0) / documentos.length
    : 85; // Simulação
  
  // 2. Prazo de Obra
  const { data: projeto } = await supabase
    .from('empreendimentos_sb')
    .select('prazo_obra_meses')
    .eq('id', projetoId)
    .single();
  
  const prazoObraMeses = projeto?.prazo_obra_meses || 18;
  
  // 3. Volume de Unidades em Dossiê
  const { data: unidades } = await supabase
    .from('unidades')
    .select('status')
    .eq('empreendimento_id', projetoId);
  
  const unidadesDossie = unidades?.filter(u => u.status === 'dossie_completo').length || 45;
  const unidadesTotal = unidades?.length || 50;
  
  // 4. Fatores de Risco (simulação)
  const fatoresRisco = {
    fator_risco_construcao: 'baixo',
    fator_risco_mercado: 'medio',
    fator_risco_regulatorio: 'baixo',
    fator_risco_financeiro: 'baixo',
    score_estrutura: 8,
    score_mercado: 7
  };
  
  return {
    percentual_documentacao: percentualDocumentacao,
    prazo_obra_meses: prazoObraMeses,
    unidades_dossie: unidadesDossie,
    unidades_total: unidadesTotal,
    ...fatoresRisco
  };
}

// Endpoint para consultar rating completo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projeto_id = searchParams.get('projeto_id');
    const rating = searchParams.get('rating');
    
    if (projeto_id) {
      return await consultarRatingCompleto(projeto_id);
    }
    
    if (rating === 'dashboard') {
      return await consultarDashboardRating();
    }
    
    return NextResponse.json({
      success: false,
      error: 'Parâmetros insuficientes'
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Erro ao consultar rating:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar rating',
      details: error.message
    }, { status: 500 });
  }
}

async function consultarRatingCompleto(projetoId: string): Promise<NextResponse> {
  try {
    // Buscar rating completo usando função SQL
    const { data, error } = await supabase
      .rpc('calcular_rating_completo', {
        p_projeto_id: projetoId
      });
    
    if (error) {
      throw new Error(`Erro ao consultar rating: ${error.message}`);
    }
    
    const resultado = Array.isArray(data) ? data[0] : data;
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Rating completo consultado com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar rating completo:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar rating completo',
      details: error.message
    }, { status: 500 });
  }
}

async function consultarDashboardRating(): Promise<NextResponse> {
  try {
    const { data, error } = await supabase
      .from('dashboard_rating_projetos')
      .select('*')
      .order('score_risco', { ascending: false })
      .limit(20);
    
    if (error) {
      throw new Error(`Erro ao consultar dashboard: ${error.message}`);
    }
    
    // Agrupar por rating
    const agrupado = (data || []).reduce((acc, item) => {
      const rating = item.rating_final;
      if (!acc[rating]) {
        acc[rating] = [];
      }
      acc[rating].push(item);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Calcular estatísticas
    const totalProjetos = data?.length || 0;
    const projetosAprovadosFundo = data?.filter(p => p.elegibilidade_fundo === 'aprovado_fundo').length || 0;
    const scoreMedio = data?.reduce((sum, p) => sum + p.score_risco, 0) / totalProjetos || 0;
    
    return NextResponse.json({
      success: true,
      data: {
        projetos: data || [],
        agrupado_por_rating: agrupado,
        estatisticas: {
          total_projetos: totalProjetos,
          projetos_aprovados_fundo: projetosAprovadosFundo,
          percentual_aprovados: totalProjetos > 0 ? (projetosAprovadosFundo / totalProjetos * 100) : 0,
          score_medio: Math.round(scoreMedio * 100) / 100,
          distribuicao_ratings: Object.keys(agrupado).map(rating => ({
            rating,
            quantidade: agrupado[rating].length,
            percentual: totalProjetos > 0 ? (agrupado[rating].length / totalProjetos * 100) : 0
          }))
        }
      },
      message: 'Dashboard de rating consultado com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar dashboard:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar dashboard',
      details: error.message
    }, { status: 500 });
  }
}

// Endpoint para atualizar rating manualmente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { rating_id, acao, observacoes } = body; // acao: 'aprovar', 'rejeitar', 'revisar'
    
    if (!rating_id || !acao) {
      return NextResponse.json({
        success: false,
        error: 'ID do rating e ação são obrigatórios'
      }, { status: 400 });
    }
    
    // Buscar rating
    const { data: rating, error: errorRating } = await supabase
      .from('rating_risco_projetos')
      .select('*')
      .eq('id', rating_id)
      .single();
    
    if (errorRating || !rating) {
      return NextResponse.json({
        success: false,
        error: 'Rating não encontrado'
      }, { status: 404 });
    }
    
    // Atualizar status
    const statusFinal = acao === 'aprovar' ? 'aprovado' : acao === 'rejeitar' ? 'rejeitado' : 'revisao';
    
    const { data: ratingAtualizado, error: errorAtualizacao } = await supabase
      .from('rating_risco_projetos')
      .update({
        status: statusFinal,
        data_aprovacao: acao === 'aprovar' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', rating_id)
      .select('*')
      .single();
    
    if (errorAtualizacao) {
      throw new Error(`Erro ao atualizar rating: ${errorAtualizacao.message}`);
    }
    
    // Criar histórico
    if (rating.status !== statusFinal) {
      await supabase
        .from('historico_rating')
        .insert({
          rating_id,
          rating_anterior: rating.rating_final,
          rating_atual: ratingAtualizado.rating_final,
          score_anterior: rating.score_risco,
          score_atual: ratingAtualizado.score_risco,
          motivo_alteracao: observacoes || `Alteração manual: ${acao}`
        });
    }
    
    return NextResponse.json({
      success: true,
      data: ratingAtualizado,
      message: `Rating ${acao} com sucesso`
    });
    
  } catch (error: any) {
    console.error('Erro ao atualizar rating:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao atualizar rating',
      details: error.message
    }, { status: 500 });
  }
}
