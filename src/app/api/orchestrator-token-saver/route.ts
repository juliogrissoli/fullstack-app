// 🏛️ SECURITY BROKER SB v30 - ORCHESTRATOR & TOKEN SAVER
// API de orquestração, economia de tokens e precisão de dados

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

interface OrchestratorTokenSaverRequest {
  acao: 'route_query_intent' | 'semantic_search_vector_cache' | 'processar_transicao_estado' | 'executar_auditoria_middleware' | 'processar_contribuicao_social_v30' | 'consultar_configuracoes_intent_router' | 'consultar_historico_queries' | 'consultar_vector_cache' | 'consultar_estado_imoveis' | 'consultar_configuracoes_middleware' | 'consultar_logs_auditoria' | 'consultar_tesouro_reino_sb_v30';
  dados?: {
    // Dados para roteamento de query
    usuario_id?: string;
    query?: string;
    contexto?: any;
    
    // Dados para busca semântica
    query_busca?: string;
    max_results?: number;
    similarity_threshold?: number;
    
    // Dados para transição de estado
    imovel_id?: string;
    estado_destino?: string;
    motivo_transicao?: string;
    usuario_transicao?: string;
    sistema_origem?: string;
    
    // Dados para auditoria
    pilar_envolvido?: string;
    operacao_auditada?: string;
    dados_operacao?: any;
    
    // Dados para contribuição social
    mes_referencia?: string;
  };
}

interface OrchestratorTokenSaverResponse {
  success: boolean;
  query_roteada?: {
    sucesso: boolean;
    roteamento_aplicado: string;
    query_processada: string;
    tokens_utilizados: number;
    tokens_economizados: number;
    custo_economizado: number;
    cache_hit: boolean;
    mensagem: string;
  };
  semantic_search?: {
    sucesso: boolean;
    query: string;
    resultados_encontrados: number;
    resultados: any[];
    mensagem: string;
  };
  transicao_processada?: {
    sucesso: boolean;
    estado_anterior: string;
    estado_atual: string;
    transicao_id: string;
    transicao_valida: boolean;
    regras_aplicadas: string[];
    mensagem: string;
  };
  auditoria_executada?: {
    sucesso: boolean;
    auditoria_id: string;
    pilar_envolvido: string;
    operacao_auditada: string;
    resultado_validacao: string;
    acoes_executadas: string[];
    bloqueios_aplicados: string[];
    mensagem: string;
  };
  contribuicao_processada?: {
    sucesso: boolean;
    tesouro_id: string;
    mes_referencia: string;
    faturamento_bruto_total: number;
    faturamento_economia_tokens: number;
    faturamento_liquido: number;
    valor_contribuicao: number;
    destinacao_tecnologia_social: number;
    mensagem: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: OrchestratorTokenSaverRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🏛️ Orchestrator & Token Saver: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'route_query_intent':
        resultado = await routeQueryIntent(dados);
        break;
      case 'semantic_search_vector_cache':
        resultado = await semanticSearchVectorCache(dados);
        break;
      case 'processar_transicao_estado':
        resultado = await processarTransicaoEstado(dados);
        break;
      case 'executar_auditoria_middleware':
        resultado = await executarAuditoriaMiddleware(dados);
        break;
      case 'processar_contribuicao_social_v30':
        resultado = await processarContribuicaoSocialV30(dados);
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
    console.error('Erro no Orchestrator & Token Saver:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Orchestrator & Token Saver',
      details: error.message
    }, { status: 500 });
  }
}

async function routeQueryIntent(dados: any): Promise<OrchestratorTokenSaverResponse['query_roteada']> {
  const { usuario_id, query, contexto } = dados;
  
  // Validar dados obrigatórios
  if (!usuario_id || !query) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Rotear query via função RPC
  const { data: resultado, error } = await supabase
    .rpc('route_query_intent', {
      p_usuario_id: usuario_id,
      p_query: query,
      p_contexto: contexto || {}
    });
  
  if (error) {
    throw new Error(`Erro ao rotear query: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao rotear query');
  }
  
  return resultado;
}

async function semanticSearchVectorCache(dados: any): Promise<OrchestratorTokenSaverResponse['semantic_search']> {
  const { query_busca, max_results, similarity_threshold } = dados;
  
  // Validar dados obrigatórios
  if (!query_busca) {
    throw new Error('Query de busca é obrigatória');
  }
  
  // Realizar busca semântica via função RPC
  const { data: resultado, error } = await supabase
    .rpc('semantic_search_vector_cache', {
      p_query: query_busca,
      p_max_results: max_results || 10,
      p_similarity_threshold: similarity_threshold || 0.8
    });
  
  if (error) {
    throw new Error(`Erro ao realizar busca semântica: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao realizar busca semântica');
  }
  
  return resultado;
}

async function processarTransicaoEstado(dados: any): Promise<OrchestratorTokenSaverResponse['transicao_processada']> {
  const { 
    imovel_id, estado_destino, motivo_transicao, 
    usuario_transicao, sistema_origem 
  } = dados;
  
  // Validar dados obrigatórios
  if (!imovel_id || !estado_destino) {
    throw new Error('ID do imóvel e estado destino são obrigatórios');
  }
  
  // Processar transição via função RPC
  const { data: resultado, error } = await supabase
    .rpc('processar_transicao_estado', {
      p_imovel_id: imovel_id,
      p_estado_destino: estado_destino,
      p_motivo_transicao: motivo_transicao || null,
      p_usuario_transicao: usuario_transicao || null,
      p_sistema_origem: sistema_origem || 'manual'
    });
  
  if (error) {
    throw new Error(`Erro ao processar transição de estado: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao processar transição');
  }
  
  return resultado;
}

async function executarAuditoriaMiddleware(dados: any): Promise<OrchestratorTokenSaverResponse['auditoria_executada']> {
  const { 
    pilar_envolvido, operacao_auditada, dados_operacao 
  } = dados;
  
  // Validar dados obrigatórios
  if (!pilar_envolvido || !operacao_auditada) {
    throw new Error('Pilar e operação são obrigatórios');
  }
  
  // Executar auditoria via função RPC
  const { data: resultado, error } = await supabase
    .rpc('executar_auditoria_middleware', {
      p_pilar_envolvido: pilar_envolvido,
      p_operacao_auditada: operacao_auditada,
      p_dados_operacao: dados_operacao || {}
    });
  
  if (error) {
    throw new Error(`Erro ao executar auditoria: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao executar auditoria');
  }
  
  return resultado;
}

async function processarContribuicaoSocialV30(dados: any): Promise<OrchestratorTokenSaverResponse['contribuicao_processada']> {
  const { mes_referencia } = dados;
  
  // Processar contribuição social V30 via função RPC
  const { data: resultado, error } = await supabase
    .rpc('processar_contribuicao_social_v30', {
      p_mes_referencia: mes_referencia || new Date().toISOString().split('T')[0]
    });
  
  if (error) {
    throw new Error(`Erro ao processar contribuição social V30: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao processar contribuição');
  }
  
  return resultado;
}

// Endpoint para consultas específicas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const usuario_id = searchParams.get('usuario_id');
    const imovel_id = searchParams.get('imovel_id');
    const pilar_envolvido = searchParams.get('pilar_envolvido');
    const mes_referencia = searchParams.get('mes_referencia');
    
    if (tipo === 'configuracoes_intent_router') {
      return await consultarConfiguracoesIntentRouter();
    }
    
    if (tipo === 'historico_queries' && usuario_id) {
      return await consultarHistoricoQueries(usuario_id);
    }
    
    if (tipo === 'vector_cache') {
      return await consultarVectorCache();
    }
    
    if (tipo === 'estado_imoveis' && imovel_id) {
      return await consultarEstadoImoveis(imovel_id);
    }
    
    if (tipo === 'configuracoes_middleware') {
      return await consultarConfiguracoesMiddleware();
    }
    
    if (tipo === 'logs_auditoria' && pilar_envolvido) {
      return await consultarLogsAuditoria(pilar_envolvido);
    }
    
    if (tipo === 'tesouro_reino_sb_v30') {
      return await consultarTesouroReinoSBV30(mes_referencia || undefined);
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

async function consultarConfiguracoesIntentRouter(): Promise<NextResponse> {
  const { data: configuracoes, error } = await supabase
    .from('configuracao_intent_router')
    .select('*')
    .eq('status_config', 'ativo')
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Erro ao consultar configurações do Intent Router: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: configuracoes || [],
    message: 'Configurações do Intent Router consultadas com sucesso'
  });
}

async function consultarHistoricoQueries(usuarioId: string): Promise<NextResponse> {
  const { data: queries, error } = await supabase
    .from('historico_queries_intent_router')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('data_inicio', { ascending: false })
    .limit(100);
  
  if (error) {
    throw new Error(`Erro ao consultar histórico de queries: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: queries || [],
    message: 'Histórico de queries consultado com sucesso'
  });
}

async function consultarVectorCache(): Promise<NextResponse> {
  const { data: cache, error } = await supabase
    .from('vector_cache_conversas')
    .select('*')
    .eq('status_cache', 'ativo')
    .order('last_accessed', { ascending: false })
    .limit(50);
  
  if (error) {
    throw new Error(`Erro ao consultar Vector Cache: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: cache || [],
    message: 'Vector Cache consultado com sucesso'
  });
}

async function consultarEstadoImoveis(imovelId: string): Promise<NextResponse> {
  const { data: estados, error } = await supabase
    .from('estado_imoveis')
    .select('*')
    .eq('imovel_id', imovelId)
    .order('data_entrada_estado', { ascending: false })
    .limit(20);
  
  if (error) {
    throw new Error(`Erro ao consultar estado dos imóveis: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: estados || [],
    message: 'Estado dos imóveis consultado com sucesso'
  });
}

async function consultarConfiguracoesMiddleware(): Promise<NextResponse> {
  const { data: configuracoes, error } = await supabase
    .from('configuracao_middleware_auditoria')
    .select('*')
    .eq('status_config', 'ativo')
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Erro ao consultar configurações do Middleware: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: configuracoes || [],
    message: 'Configurações do Middleware consultadas com sucesso'
  });
}

async function consultarLogsAuditoria(pilarEnvolvido: string): Promise<NextResponse> {
  const { data: logs, error } = await supabase
    .from('logs_middleware_auditoria')
    .select('*')
    .eq('pilar_envolvido', pilarEnvolvido)
    .order('data_inicio', { ascending: false })
    .limit(100);
  
  if (error) {
    throw new Error(`Erro ao consultar logs de auditoria: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: logs || [],
    message: 'Logs de auditoria consultados com sucesso'
  });
}

async function consultarTesouroReinoSBV30(mesReferencia?: string): Promise<NextResponse> {
  let query = supabase.from('tesouro_reino_sb_v30').select('*');
  
  if (mesReferencia) {
    query = query.eq('mes_referencia', mesReferencia);
  }
  
  const { data: tesouro, error } = await query
    .order('mes_referencia', { ascending: false })
    .limit(12);
  
  if (error) {
    throw new Error(`Erro ao consultar Tesouro Reino SB V30: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: tesouro || [],
    message: 'Tesouro Reino SB V30 consultado com sucesso'
  });
}
