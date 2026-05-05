// 🏛️ SECURITY BROKER SB v24 - ROLETA DE LEADS YARA
// API de Distribuição Inteligente de Leads com Score de Performance

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RoletaLeadsYaraRequest {
  acao: 'processar_distribuicao' | 'atualizar_score' | 'configurar_roleta' | 'consultar_ranking';
  dados?: {
    imobiliaria_id?: string;
    lead_id?: string;
    broker_id?: string;
    nome_configuracao?: string;
    peso_score_performance?: number;
    peso_tempo_resposta?: number;
    peso_taxa_conversao?: number;
    peso_disponibilidade?: number;
    maximo_leads_por_corretor?: number;
    maximo_leads_dia?: number;
    corretores_excluidos?: string[];
    corretores_prioritarios?: string[];
  };
}

interface RoletaLeadsYaraResponse {
  success: boolean;
  distribuicao_processada?: {
    leads_distribuidos: number;
    corretores_participantes: number;
    metodo_distribuicao: string;
    data_processamento: string;
    detalhes_leads: Array<{
      lead_id: string;
      broker_selecionado: string;
      score_performance: number;
      tempo_resposta: number;
      taxa_conversao: number;
      motivo_selecao: string;
    }>;
  };
  score_atualizado?: {
    broker_id: string;
    data_referencia: string;
    total_leads_recebidos: number;
    leads_convertidos: number;
    taxa_conversao: number;
    tempo_medio_resposta: number;
    score_final: number;
    ranking_imobiliaria: number;
  };
  roleta_configurada?: {
    id: string;
    nome_configuracao: string;
    pesos_configurados: {
      score_performance: number;
      tempo_resposta: number;
      taxa_conversao: number;
      disponibilidade: number;
    };
    limites_configurados: {
      maximo_leads_por_corretor: number;
      maximo_leads_dia: number;
    };
    status_configuracao: string;
  };
  ranking_consultado?: {
    periodo: string;
    total_corretores: number;
    ranking_corretores: Array<{
      broker_id: string;
      broker_nome: string;
      score_final: number;
      ranking: number;
      total_leads: number;
      leads_convertidos: number;
      taxa_conversao: number;
      tempo_medio_resposta: number;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: RoletaLeadsYaraRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🎯 Roleta Leads Yara: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'processar_distribuicao':
        resultado = await processarDistribuicao(dados);
        break;
      case 'atualizar_score':
        resultado = await atualizarScore(dados);
        break;
      case 'configurar_roleta':
        resultado = await configurarRoleta(dados);
        break;
      case 'consultar_ranking':
        resultado = await consultarRanking(dados);
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
    console.error('Erro na Roleta Leads Yara:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno na Roleta Leads Yara',
      details: error.message
    }, { status: 500 });
  }
}

async function processarDistribuicao(dados: any): Promise<RoletaLeadsYaraResponse['distribuicao_processada']> {
  const { imobiliaria_id } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id) {
    throw new Error('ID da imobiliária não fornecido');
  }
  
  // Buscar configuração da roleta
  const { data: configRoleta } = await supabase
    .from('configuracao_roleta_yara')
    .select('*')
    .eq('imobiliaria_id', imobiliaria_id)
    .eq('status_configuracao', 'ativa')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!configRoleta) {
    throw new Error('Configuração da roleta não encontrada');
  }
  
  // Buscar leads pendentes de distribuição
  const { data: leadsPendentes } = await supabase
    .from('leads_imobiliaria')
    .select('*')
    .eq('imobiliaria_id', imobiliaria_id)
    .eq('status_lead', 'novo')
    .is('broker_distribuido_id', null)
    .order('data_captacao', { ascending: true });
  
  if (!leadsPendentes || leadsPendentes.length === 0) {
    return {
      leads_distribuidos: 0,
      corretores_participantes: 0,
      metodo_distribuicao: 'roleta_yara',
      data_processamento: new Date().toISOString(),
      detalhes_leads: []
    };
  }
  
  // Buscar corretores disponíveis com scores
  const { data: corretoresHoje } = await supabase
    .from('score_performance_corretores')
    .select(`
      *,
      brokers!inner(nome, email),
      corretores_imobiliaria!inner(funcao, nivel_hierarquico)
    `)
    .eq('imobiliaria_id', imobiliaria_id)
    .eq('data_referencia', new Date().toISOString().split('T')[0])
    .not('broker_id', 'in', `(${configRoleta.corretores_excluidos.join(',')})`)
    .order('score_final', { ascending: false });
  
  let corretoresDisponiveis = corretoresHoje || [];
  
  // Se não encontrar scores do dia, buscar do dia anterior
  if (!corretoresDisponiveis || corretoresDisponiveis.length === 0) {
    const { data: corretoresOntem } = await supabase
      .from('score_performance_corretores')
      .select(`
        *,
        brokers!inner(nome, email),
        corretores_imobiliaria!inner(funcao, nivel_hierarquico)
      `)
      .eq('imobiliaria_id', imobiliaria_id)
      .eq('data_referencia', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .not('broker_id', 'in', `(${configRoleta.corretores_excluidos.join(',')})`)
      .order('score_final', { ascending: false });
    
    if (corretoresOntem && corretoresOntem.length > 0) {
      corretoresDisponiveis = corretoresOntem;
    }
  }
  
  // Se ainda não encontrar, buscar corretores ativos sem score
  if (!corretoresDisponiveis || corretoresDisponiveis.length === 0) {
    const { data: corretoresAtivos } = await supabase
      .from('corretores_imobiliaria')
      .select(`
        *,
        brokers!inner(nome, email)
      `)
      .eq('imobiliaria_id', imobiliaria_id)
      .eq('status', 'ativo')
      .not('broker_id', 'in', `(${configRoleta.corretores_excluidos.join(',')})`);
    
    if (corretoresAtivos && corretoresAtivos.length > 0) {
      corretoresDisponiveis = corretoresAtivos.map((c: any) => ({
        ...c,
        score_final: 50, // Score padrão para corretores sem histórico
        total_leads_recebidos: 0,
        leads_convertidos: 0,
        taxa_conversao: 0,
        tempo_medio_resposta: 0
      }));
    }
  }
  
  if (!corretoresDisponiveis || corretoresDisponiveis.length === 0) {
    throw new Error('Nenhum corretor disponível para distribuição');
  }
  
  // Processar distribuição
  const detalhesLeads = [];
  let leadsDistribuidos = 0;
  
  for (const lead of leadsPendentes) {
    if (leadsDistribuidos >= configRoleta.maximo_leads_dia) {
      break;
    }
    
    // Calcular score ponderado para cada corretor
    const corretoresPontuados = corretoresDisponiveis.map(corretor => {
      const scorePerformance = corretor.score_final || 0;
      const tempoResposta = corretor.tempo_medio_resposta || 0;
      const taxaConversao = corretor.taxa_conversao || 0;
      const disponibilidade = 1; // Simplificado
      
      // Calcular score ponderado
      const scorePonderado = (
        (scorePerformance * configRoleta.peso_score_performance / 100) +
        (Math.max(0, 100 - Math.min(tempoResposta, 100)) * configRoleta.peso_tempo_resposta / 100) +
        (taxaConversao * configRoleta.peso_taxa_conversao / 100) +
        (disponibilidade * configRoleta.peso_disponibilidade / 100)
      );
      
      return {
        ...corretor,
        score_ponderado: scorePonderado
      };
    });
    
    // Ordenar por score ponderado e disponibilidade
    corretoresPontuados.sort((a, b) => {
      // Priorizar corretores prioritários
      const aPrioritario = configRoleta.corretores_prioritarios.includes(a.broker_id);
      const bPrioritario = configRoleta.corretores_prioritarios.includes(b.broker_id);
      
      if (aPrioritario && !bPrioritario) return -1;
      if (!aPrioritario && bPrioritario) return 1;
      
      // Verificar limite de leads por corretor
      const aLeadsHoje = detalhesLeads.filter(l => l.broker_selecionado === a.broker_id).length;
      const bLeadsHoje = detalhesLeads.filter(l => l.broker_selecionado === b.broker_id).length;
      
      if (aLeadsHoje >= configRoleta.maximo_leads_por_corretor && bLeadsHoje < configRoleta.maximo_leads_por_corretor) return 1;
      if (bLeadsHoje >= configRoleta.maximo_leads_por_corretor && aLeadsHoje < configRoleta.maximo_leads_por_corretor) return -1;
      
      // Ordenar por score ponderado
      return b.score_ponderado - a.score_ponderado;
    });
    
    // Selecionar o melhor corretor
    const corretorSelecionado = corretoresPontuados[0];
    
    if (!corretorSelecionado) {
      continue; // Pular este lead se não houver corretor disponível
    }
    
    // Distribuir o lead
    await supabase
      .from('leads_imobiliaria')
      .update({
        broker_distribuido_id: corretorSelecionado.broker_id,
        data_distribuicao: new Date().toISOString(),
        metodo_distribuicao: 'roleta_yara',
        status_lead: 'em_atendimento',
        data_primeiro_contato: new Date().toISOString()
      })
      .eq('id', lead.id);
    
    // Atualizar score do corretor
    await supabase
      .from('score_performance_corretores')
      .upsert({
        broker_id: corretorSelecionado.broker_id,
        imobiliaria_id,
        data_referencia: new Date().toISOString().split('T')[0],
        total_leads_recebidos: (corretorSelecionado.total_leads_recebidos || 0) + 1,
        leads_convertidos: corretorSelecionado.leads_convertidos || 0,
        taxa_conversao: corretorSelecionado.taxa_conversao || 0,
        tempo_medio_resposta: corretorSelecionado.tempo_medio_resposta || 0,
        score_atendimento: corretorSelecionado.score_atendimento || 0,
        score_conversao: corretorSelecionado.score_conversao || 0
      }, {
        onConflict: 'broker_id, imobiliaria_id, data_referencia'
      });
    
    // Adicionar aos detalhes
    detalhesLeads.push({
      lead_id: lead.id,
      broker_selecionado: corretorSelecionado.broker_id,
      score_performance: corretorSelecionado.score_final || 0,
      tempo_resposta: corretorSelecionado.tempo_medio_resposta || 0,
      taxa_conversao: corretorSelecionado.taxa_conversao || 0,
      motivo_selecao: corretorSelecionado.score_ponderado > 70 ? 'score_alto' : 'disponibilidade'
    });
    
    leadsDistribuidos++;
  }
  
  return {
    leads_distribuidos: leadsDistribuidos,
    corretores_participantes: corretoresDisponiveis.length,
    metodo_distribuicao: 'roleta_yara',
    data_processamento: new Date().toISOString(),
    detalhes_leads: detalhesLeads
  };
}

async function atualizarScore(dados: any): Promise<RoletaLeadsYaraResponse['score_atualizado']> {
  const { broker_id, imobiliaria_id } = dados;
  
  // Validar dados obrigatórios
  if (!broker_id || !imobiliaria_id) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Buscar dados do corretor
  const { data: corretor } = await supabase
    .from('corretores_imobiliaria')
    .select('*')
    .eq('broker_id', broker_id)
    .eq('imobiliaria_id', imobiliaria_id)
    .single();
  
  if (!corretor) {
    throw new Error('Corretor não encontrado na imobiliária');
  }
  
  // Buscar métricas do dia
  const dataHoje = new Date().toISOString().split('T')[0];
  
  // Total de leads recebidos hoje
  const { data: leadsHoje } = await supabase
    .from('leads_imobiliaria')
    .select('*')
    .eq('imobiliaria_id', imobiliaria_id)
    .eq('broker_distribuido_id', broker_id)
    .like('data_distribuicao', `${dataHoje}%`);
  
  // Leads convertidos hoje
  const { data: leadsConvertidos } = await supabase
    .from('leads_imobiliaria')
    .select('*')
    .eq('imobiliaria_id', imobiliaria_id)
    .eq('broker_distribuido_id', broker_id)
    .eq('status_lead', 'convertido')
    .like('data_distribuicao', `${dataHoje}%`);
  
  // Tempo médio de resposta (simulado)
  const tempoMedioResposta = Math.floor(Math.random() * 60) + 5; // 5 a 65 minutos
  
  // Taxa de conversão
  const taxaConversao = leadsHoje && leadsHoje.length > 0 
    ? ((leadsConvertidos?.length || 0) / leadsHoje.length) * 100 
    : 0;
  
  // Score de atendimento (simulado)
  const scoreAtendimento = Math.floor(Math.random() * 30) + 70; // 70 a 100
  
  // Score de conversão (baseado na taxa)
  const scoreConversao = Math.min(taxaConversao * 2, 100); // Máximo 100
  
  // Calcular score final
  const scoreFinal = (taxaConversao * 0.4) + 
                    (Math.max(0, 100 - Math.min(tempoMedioResposta, 100)) * 0.3) + 
                    (scoreAtendimento * 0.2) + 
                    (scoreConversao * 0.1);
  
  // Atualizar ou inserir score
  const { data: scoreAtualizado } = await supabase
    .from('score_performance_corretores')
    .upsert({
      broker_id,
      imobiliaria_id,
      data_referencia: dataHoje,
      total_leads_recebidos: leadsHoje?.length || 0,
      leads_convertidos: leadsConvertidos?.length || 0,
      taxaConversao,
      tempo_medio_resposta: tempoMedioResposta,
      score_atendimento: scoreAtendimento,
      score_conversao: scoreConversao,
      score_final: scoreFinal
    }, {
      onConflict: 'broker_id, imobiliaria_id, data_referencia'
    })
    .select('*')
    .single();
  
  // Calcular ranking
  const { data: ranking } = await supabase
    .from('score_performance_corretores')
    .select('broker_id')
    .eq('imobiliaria_id', imobiliaria_id)
    .eq('data_referencia', dataHoje)
    .order('score_final', { ascending: false });
  
  const rankingImobiliaria = ranking?.findIndex(r => r.broker_id === broker_id) + 1 || 0;
  
  return {
    broker_id: scoreAtualizado.broker_id,
    data_referencia: scoreAtualizado.data_referencia,
    total_leads_recebidos: scoreAtualizado.total_leads_recebidos,
    leads_convertidos: scoreAtualizado.leads_convertidos,
    taxa_conversao: scoreAtualizado.taxa_conversao,
    tempo_medio_resposta: scoreAtualizado.tempo_medio_resposta,
    score_final: scoreAtualizado.score_final,
    ranking_imobiliaria: rankingImobiliaria
  };
}

async function configurarRoleta(dados: any): Promise<RoletaLeadsYaraResponse['roleta_configurada']> {
  const { imobiliaria_id, nome_configuracao, peso_score_performance, peso_tempo_resposta, peso_taxa_conversao, peso_disponibilidade, maximo_leads_por_corretor, maximo_leads_dia, corretores_excluidos, corretores_prioritarios } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id || !nome_configuracao) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Validar soma dos pesos (deve ser 100%)
  const totalPesos = (peso_score_performance || 0) + (peso_tempo_resposta || 0) + (peso_taxa_conversao || 0) + (peso_disponibilidade || 0);
  
  if (Math.abs(totalPesos - 100) > 0.01) {
    throw new Error('A soma dos pesos deve ser exatamente 100%');
  }
  
  // Criar configuração da roleta
  const { data: roletaConfigurada } = await supabase
    .from('configuracao_roleta_yara')
    .insert({
      imobiliaria_id,
      nome_configuracao,
      peso_score_performance: peso_score_performance || 40.0,
      peso_tempo_resposta: peso_tempo_resposta || 30.0,
      peso_taxa_conversao: peso_taxa_conversao || 20.0,
      peso_disponibilidade: peso_disponibilidade || 10.0,
      maximo_leads_por_corretor: maximo_leads_por_corretor || 10,
      maximo_leads_dia: maximo_leads_dia || 50,
      corretores_excluidos: corretores_excluidos || [],
      corretores_prioritarios: corretores_prioritarios || [],
      status_configuracao: 'ativa'
    })
    .select('*')
    .single();
  
  return {
    id: roletaConfigurada.id,
    nome_configuracao: roletaConfigurada.nome_configuracao,
    pesos_configurados: {
      score_performance: roletaConfigurada.peso_score_performance,
      tempo_resposta: roletaConfigurada.peso_tempo_resposta,
      taxa_conversao: roletaConfigurada.peso_taxa_conversao,
      disponibilidade: roletaConfigurada.peso_disponibilidade
    },
    limites_configurados: {
      maximo_leads_por_corretor: roletaConfigurada.maximo_leads_por_corretor,
      maximo_leads_dia: roletaConfigurada.maximo_leads_dia
    },
    status_configuracao: roletaConfigurada.status_configuracao
  };
}

async function consultarRanking(dados: any): Promise<RoletaLeadsYaraResponse['ranking_consultado']> {
  const { imobiliaria_id } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id) {
    throw new Error('ID da imobiliária não fornecido');
  }
  
  // Buscar ranking do dia
  const dataHoje = new Date().toISOString().split('T')[0];
  
  const { data: rankingCorretores } = await supabase
    .from('score_performance_corretores')
    .select(`
      *,
      brokers!inner(nome, email),
      corretores_imobiliaria!inner(funcao, nivel_hierarquico)
    `)
    .eq('imobiliaria_id', imobiliaria_id)
    .eq('data_referencia', dataHoje)
    .order('score_final', { ascending: false });
  
  // Calcular ranking
  const rankingComPosicao = rankingCorretores?.map((corretor, index) => ({
    broker_id: corretor.broker_id,
    broker_nome: corretor.brokers.nome,
    score_final: corretor.score_final,
    ranking: index + 1,
    total_leads: corretor.total_leads_recebidos,
    leads_convertidos: corretor.leads_convertidos,
    taxa_conversao: corretor.taxa_conversao,
    tempo_medio_resposta: corretor.tempo_medio_resposta
  })) || [];
  
  return {
    periodo: dataHoje,
    total_corretores: rankingComPosicao.length,
    ranking_corretores: rankingComPosicao
  };
}

// Endpoint para consultas específicas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const imobiliaria_id = searchParams.get('imobiliaria_id');
    
    if (tipo === 'leads_pendentes' && imobiliaria_id) {
      return await consultarLeadsPendentes(imobiliaria_id);
    }
    
    if (tipo === 'configuracoes_ativas' && imobiliaria_id) {
      return await consultarConfiguracoesAtivas(imobiliaria_id);
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

async function consultarLeadsPendentes(imobiliariaId: string): Promise<NextResponse> {
  // Buscar leads pendentes de distribuição
  const { data: leads } = await supabase
    .from('leads_imobiliaria')
    .select('*')
    .eq('imobiliaria_id', imobiliariaId)
    .eq('status_lead', 'novo')
    .is('broker_distribuido_id', null)
    .order('data_captacao', { ascending: true });
  
  return NextResponse.json({
    success: true,
    data: leads || [],
    message: 'Leads pendentes consultados com sucesso'
  });
}

async function consultarConfiguracoesAtivas(imobiliariaId: string): Promise<NextResponse> {
  // Buscar configurações ativas da roleta
  const { data: configuracoes } = await supabase
    .from('configuracao_roleta_yara')
    .select('*')
    .eq('imobiliaria_id', imobiliariaId)
    .eq('status_configuracao', 'ativa')
    .order('created_at', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: configuracoes || [],
    message: 'Configurações ativas consultadas com sucesso'
  });
}
