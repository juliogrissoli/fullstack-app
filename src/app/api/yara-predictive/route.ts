// 🏛️ SECURITY BROKER SB v25 - OMNISCIENT INTELIGÊNCIA PREDITIVA
// API de Yara Predictive (Lookalike) e Análise de Potenciais Investidores

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

interface YaraPredictiveRequest {
  acao: 'criar_perfil' | 'analisar_lookalike' | 'consultar_potenciais' | 'gerar_alerta' | 'consultar_perfis';
  dados?: {
    nome_perfil?: string;
    descricao_perfil?: string;
    faixa_etaria?: string;
    faixa_renda?: string;
    perfil_profissional?: string;
    tipos_imovel_preferidos?: string[];
    bairros_preferidos?: string[];
    valor_medio_compra?: number;
    prazo_medio_compra?: number;
    taxa_engajamento?: number;
    taxa_conversao?: number;
    tempo_medio_decisao?: number;
    regioes_atuacao?: string[];
    raio_atuacao_km?: number;
    perfil_referencia_id?: string;
    regiao_analise?: string;
    raio_analise_km?: number;
    analise_id?: string;
    broker_id?: string;
    alerta_tipo?: string;
    mensagem_alerta?: string;
    potenciais_ids?: string[];
  };
}

interface YaraPredictiveResponse {
  success: boolean;
  perfil_criado?: {
    id: string;
    nome_perfil: string;
    descricao_perfil: string;
    faixa_etaria: string;
    faixa_renda: string;
    perfil_profissional: string;
    tipos_imovel_preferidos: string[];
    bairros_preferidos: string[];
    valor_medio_compra: number;
    prazo_medio_compra: number;
    taxa_engajamento: number;
    taxa_conversao: number;
    tempo_medio_decisao: number;
    regioes_atuacao: string[];
    raio_atuacao_km: number;
    status_perfil: string;
    hash_perfil: string;
  };
  lookalike_analisado?: {
    id: string;
    nome_analise: string;
    tipo_analise: string;
    perfil_referencia: string;
    regiao_analise: string;
    raio_analise_km: number;
    total_potenciais_detectados: number;
    score_confianca: number;
    status_analise: string;
    data_conclusao: string;
    mensagem_oportunidade: string;
    potenciais_gerados: string[];
  };
  potenciais_consultados?: {
    analise_id: string;
    total_potenciais: number;
    potenciais_detectados: Array<{
      id: string;
      cliente_id: string;
      score_similaridade: number;
      fatores_similaridade: object;
      dados_cliente: object;
      status_potencial: string;
      data_contato: string;
      data_conversao: string;
      broker_responsavel_id: string;
    }>;
  };
  alerta_gerado?: {
    id: string;
    tipo_alerta: string;
    mensagem: string;
    total_potenciais: number;
    regiao: string;
    perfil_referencia: string;
    score_confianca: number;
    data_geracao: string;
    broker_id: string;
    status_alerta: string;
  };
  perfis_consultados?: {
    total_perfis: number;
    perfis_ativos: number;
    perfis_inativos: number;
    detalhes_perfis: Array<{
      id: string;
      nome_perfil: string;
      descricao_perfil: string;
      faixa_etaria: string;
      faixa_renda: string;
      perfil_profissional: string;
      valor_medio_compra: number;
      taxa_conversao: number;
      status_perfil: string;
      data_criacao: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: YaraPredictiveRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🤖 Yara Predictive: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'criar_perfil':
        resultado = await criarPerfil(dados);
        break;
      case 'analisar_lookalike':
        resultado = await analisarLookalike(dados);
        break;
      case 'consultar_potenciais':
        resultado = await consultarPotenciais(dados);
        break;
      case 'gerar_alerta':
        resultado = await gerarAlerta(dados);
        break;
      case 'consultar_perfis':
        resultado = await consultarPerfis(dados);
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
    console.error('Erro no Yara Predictive:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Yara Predictive',
      details: error.message
    }, { status: 500 });
  }
}

async function criarPerfil(dados: any): Promise<YaraPredictiveResponse['perfil_criado']> {
  const { nome_perfil, descricao_perfil, faixa_etaria, faixa_renda, perfil_profissional, tipos_imovel_preferidos, bairros_preferidos, valor_medio_compra, prazo_medio_compra, taxa_engajamento, taxa_conversao, tempo_medio_decisao, regioes_atuacao, raio_atuacao_km } = dados;
  
  // Validar dados obrigatórios
  if (!nome_perfil || !descricao_perfil) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Validar faixas
  const faixasEtariaValidas = ['25-35', '36-45', '46-55', '56+'];
  const faixasRendaValidas = ['5k-10k', '10k-20k', '20k-50k', '50k+'];
  
  if (faixa_etaria && !faixasEtariaValidas.includes(faixa_etaria)) {
    throw new Error('Faixa etária inválida');
  }
  
  if (faixa_renda && !faixasRendaValidas.includes(faixa_renda)) {
    throw new Error('Faixa de renda inválida');
  }
  
  // Criar perfil
  const { data: perfil, error } = await supabase
    .from('perfis_compradores_sucesso')
    .insert({
      nome_perfil,
      descricao_perfil,
      faixa_etaria,
      faixa_renda,
      perfil_profissional,
      tipos_imovel_preferidos: tipos_imovel_preferidos || [],
      bairros_preferidos: bairros_preferidos || [],
      valor_medio_compra,
      prazo_medio_compra,
      taxa_engajamento,
      taxa_conversao,
      tempo_medio_decisao,
      regioes_atuacao: regioes_atuacao || [],
      raio_atuacao_km: raio_atuacao_km || 10,
      status_perfil: 'ativo'
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao criar perfil: ${error.message}`);
  }
  
  return {
    id: perfil.id,
    nome_perfil: perfil.nome_perfil,
    descricao_perfil: perfil.descricao_perfil,
    faixa_etaria: perfil.faixa_etaria,
    faixa_renda: perfil.faixa_renda,
    perfil_profissional: perfil.perfil_profissional,
    tipos_imovel_preferidos: perfil.tipos_imovel_preferidos,
    bairros_preferidos: perfil.bairros_preferidos,
    valor_medio_compra: perfil.valor_medio_compra,
    prazo_medio_compra: perfil.prazo_medio_compra,
    taxa_engajamento: perfil.taxa_engajamento,
    taxa_conversao: perfil.taxa_conversao,
    tempo_medio_decisao: perfil.tempo_medio_decisao,
    regioes_atuacao: perfil.regioes_atuacao,
    raio_atuacao_km: perfil.raio_atuacao_km,
    status_perfil: perfil.status_perfil,
    hash_perfil: perfil.hash_perfil
  };
}

async function analisarLookalike(dados: any): Promise<YaraPredictiveResponse['lookalike_analisado']> {
  const { perfil_referencia_id, regiao_analise, raio_analise_km } = dados;
  
  // Validar dados obrigatórios
  if (!perfil_referencia_id) {
    throw new Error('ID do perfil de referência não fornecido');
  }
  
  // Executar análise lookalike usando função RPC
  const { data: resultado, error } = await supabase
    .rpc('analisar_lookalike_compradores', {
      p_perfil_referencia_id: perfil_referencia_id,
      p_regiao: regiao_analise,
      p_raio_km: raio_analise_km || 10
    });
  
  if (error) {
    throw new Error(`Erro na análise lookalike: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error('Falha na análise lookalike');
  }
  
  // Buscar dados completos da análise
  const { data: analise } = await supabase
    .from('analises_predictivas')
    .select(`
      *,
      perfis_compradores_sucesso!inner(nome_perfil)
    `)
    .eq('id', resultado.analise_id)
    .single();
  
  return {
    id: analise.id,
    nome_analise: analise.nome_analise,
    tipo_analise: analise.tipo_analise,
    perfil_referencia: analise.perfis_compradores_sucesso.nome_perfil,
    regiao_analise: analise.regiao_analise,
    raio_analise_km: analise.raio_analise_km,
    total_potenciais_detectados: analise.total_potenciais_detectados,
    score_confianca: analise.score_confianca,
    status_analise: analise.status_analise,
    data_conclusao: analise.data_conclusao,
    mensagem_oportunidade: resultado.mensagem,
    potenciais_gerados: analise.potenciais_gerados
  };
}

async function consultarPotenciais(dados: any): Promise<YaraPredictiveResponse['potenciais_consultados']> {
  const { analise_id } = dados;
  
  // Validar dados obrigatórios
  if (!analise_id) {
    throw new Error('ID da análise não fornecido');
  }
  
  // Buscar potenciais detectados
  const { data: potenciais, error } = await supabase
    .from('potenciais_detectados')
    .select(`
      *,
      clientes!inner(nome, email, telefone),
      brokers!inner(nome)
    `)
    .eq('analise_id', analise_id)
    .order('score_similaridade', { ascending: false });
  
  if (error) {
    throw new Error(`Erro ao consultar potenciais: ${error.message}`);
  }
  
  return {
    analise_id,
    total_potenciais: potenciais.length,
    potenciais_detectados: potenciais.map(p => ({
      id: p.id,
      cliente_id: p.cliente_id,
      score_similaridade: p.score_similaridade,
      fatores_similaridade: p.fatores_similaridade,
      dados_cliente: p.dados_cliente,
      status_potencial: p.status_potencial,
      data_contato: p.data_contato,
      data_conversao: p.data_conversao,
      broker_responsavel_id: p.broker_responsavel_id
    }))
  };
}

async function gerarAlerta(dados: any): Promise<YaraPredictiveResponse['alerta_gerado']> {
  const { broker_id, alerta_tipo, mensagem_alerta, analise_id, potenciais_ids } = dados;
  
  // Validar dados obrigatórios
  if (!broker_id || !alerta_tipo || !mensagem_alerta) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Buscar dados da análise se fornecido
  let dadosAnalise = null;
  if (analise_id) {
    const { data: analise } = await supabase
      .from('analises_predictivas')
      .select(`
        *,
        perfis_compradores_sucesso!inner(nome_perfil)
      `)
      .eq('id', analise_id)
      .single();
    
    dadosAnalise = analise;
  }
  
  // Gerar alerta
  const { data: alerta, error } = await supabase
    .from('notificacoes')
    .insert({
      broker_id,
      tipo: 'yara_predictive',
      titulo: `Alerta Predictive: ${alerta_tipo}`,
      mensagem: mensagem_alerta,
      dados_adicionais: {
        tipo_alerta: alerta_tipo,
        analise_id: analise_id,
        potenciais_ids: potenciais_ids || [],
        dados_analise: dadosAnalise,
        data_geracao: new Date().toISOString()
      },
      status: 'nao_lida',
      prioridade: 'alta'
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao gerar alerta: ${error.message}`);
  }
  
  return {
    id: alerta.id,
    tipo_alerta: alerta_tipo,
    mensagem: mensagem_alerta,
    total_potenciais: potenciais_ids?.length || 0,
    regiao: dadosAnalise?.regiao_analise || 'Não especificada',
    perfil_referencia: dadosAnalise?.perfis_compradores_sucesso?.nome_perfil || 'Não especificado',
    score_confianca: dadosAnalise?.score_confianca || 0,
    data_geracao: alerta.created_at,
    broker_id,
    status_alerta: alerta.status
  };
}

async function consultarPerfis(dados: any): Promise<YaraPredictiveResponse['perfis_consultados']> {
  // Buscar todos os perfis
  const { data: perfis, error } = await supabase
    .from('perfis_compradores_sucesso')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Erro ao consultar perfis: ${error.message}`);
  }
  
  const totalPerfis = perfis.length;
  const perfisAtivos = perfis.filter(p => p.status_perfil === 'ativo').length;
  const perfisInativos = perfis.filter(p => p.status_perfil === 'inativo').length;
  
  return {
    total_perfis: totalPerfis,
    perfis_ativos: perfisAtivos,
    perfis_inativos: perfisInativos,
    detalhes_perfis: perfis.map(p => ({
      id: p.id,
      nome_perfil: p.nome_perfil,
      descricao_perfil: p.descricao_perfil,
      faixa_etaria: p.faixa_etaria,
      faixa_renda: p.faixa_renda,
      perfil_profissional: p.perfil_profissional,
      valor_medio_compra: p.valor_medio_compra,
      taxa_conversao: p.taxa_conversao,
      status_perfil: p.status_perfil,
      data_criacao: p.created_at
    }))
  };
}

// Endpoint para consultas específicas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const broker_id = searchParams.get('broker_id');
    const perfil_id = searchParams.get('perfil_id');
    
    if (tipo === 'analises' && broker_id) {
      return await consultarAnalisesBroker(broker_id);
    }
    
    if (tipo === 'oportunidades') {
      return await consultarOportunidades();
    }
    
    if (tipo === 'perfil' && perfil_id) {
      return await consultarPerfilDetalhado(perfil_id);
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

async function consultarAnalisesBroker(brokerId: string): Promise<NextResponse> {
  // Buscar análises do broker
  const { data: analises } = await supabase
    .from('analises_predictivas')
    .select(`
      *,
      perfis_compradores_sucesso!inner(nome_perfil)
    `)
    .eq('broker_responsavel_id', brokerId)
    .order('created_at', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: analises || [],
    message: 'Análises consultadas com sucesso'
  });
}

async function consultarOportunidades(): Promise<NextResponse> {
  // Buscar oportunidades recentes (análises concluídas)
  const { data: oportunidades } = await supabase
    .from('analises_predictivas')
    .select(`
      *,
      perfis_compradores_sucesso!inner(nome_perfil),
      brokers!inner(nome)
    `)
    .eq('status_analise', 'concluida')
    .eq('tipo_analise', 'lookalike')
    .order('data_conclusao', { ascending: false })
    .limit(10);
  
  return NextResponse.json({
    success: true,
    data: oportunidades || [],
    message: 'Oportunidades consultadas com sucesso'
  });
}

async function consultarPerfilDetalhado(perfilId: string): Promise<NextResponse> {
  // Buscar perfil detalhado
  const { data: perfil } = await supabase
    .from('perfis_compradores_sucesso')
    .select('*')
    .eq('id', perfilId)
    .single();
  
  // Buscar análises que usaram este perfil
  const { data: analises } = await supabase
    .from('analises_predictivas')
    .select('*')
    .eq('perfil_referencia_id', perfilId)
    .order('created_at', { ascending: false })
    .limit(5);
  
  // Buscar potenciais detectados para este perfil
  const { data: potenciais } = await supabase
    .from('potenciais_detectados')
    .select('*')
    .eq('perfil_comparado_id', perfilId)
    .order('score_similaridade', { ascending: false })
    .limit(10);
  
  return NextResponse.json({
    success: true,
    data: {
      perfil,
      analises: analises || [],
      potenciais: potenciais || []
    },
    message: 'Perfil detalhado consultado com sucesso'
  });
}
