// 🏛️ SECURITY BROKER SB v18 - HIERARQUIA DE INDICAÇÃO
// Validação de hierarquia Pai/Filho/Neto na rede SB

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

interface HierarquiaRequest {
  acao: 'validar_indicacao' | 'consultar_rede' | 'gerar_relatorio';
  dados?: {
    indicador_id?: string;
    indicado_id?: string;
    indicador_cpf?: string;
    indicado_cpf?: string;
    tipo_relacao?: string;
    nivel_hierarquia?: string;
  };
}

interface HierarquiaResponse {
  success: boolean;
  validacao?: {
    status: string;
    tipo_relacao: string;
    nivel_hierarquia: string;
    respeita_regra: boolean;
    detalhes?: any;
  };
  rede_hierarquica?: Array<{
    broker_id: string;
    nome: string;
    email: string;
    nivel_hierarquia: string;
    indicados_diretos: number;
    indicados_indiretos: number;
    total_indicacoes: number;
    score_hierarquia: number;
  }>;
  relatorio?: {
    total_brokers: number;
    total_indicacoes: number;
    violacoes_regras: number;
    redes_estruturadas: number;
    redes_quebradas: number;
    recomendacoes: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: HierarquiaRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🏛️ Hierarquia: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'validar_indicacao':
        resultado = await validarIndicacao(dados);
        break;
      case 'consultar_rede':
        resultado = await consultarRedeHierarquica(dados);
        break;
      case 'gerar_relatorio':
        resultado = await gerarRelatorioHierarquia();
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
    console.error('Erro na Hierarquia de Indicação:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno na Hierarquia',
      details: error.message
    }, { status: 500 });
  }
}

async function validarIndicacao(dados: any): Promise<HierarquiaResponse['validacao']> {
  const { indicador_id, indicado_id, indicador_cpf, indicado_cpf, tipo_relacao } = dados;
  
  // Validar dados obrigatórios
  if (!indicador_id || !indicado_id || !indicador_cpf || !indicado_cpf || !tipo_relacao) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Buscar dados do indicador
  const { data: indicador, error: errorIndicador } = await supabase
    .from('brokers')
    .select('*')
    .eq('id', indicador_id)
    .single();
  
  if (errorIndicador || !indicador) {
    throw new Error('Indicador não encontrado');
  }
  
  // Buscar dados do indicado
  const { data: indicado, error: errorIndicado } = await supabase
    .from('brokers')
    .select('*')
    .eq('id', indicado_id)
    .single();
  
  if (errorIndicado || !indicado) {
    throw new Error('Indicado não encontrado');
  }
  
  // Validar CPFs
  if (indicador.cpf !== indicador_cpf || indicado.cpf !== indicado_cpf) {
    throw new Error('CPF fornecido não corresponde ao cadastro');
  }
  
  // Determinar nível hierárquico
  const nivelIndicador = await determinarNivelHierarquico(indicador_id);
  const nivelIndicado = await determinarNivelHierarquico(indicado_id);
  
  // Validar regra de hierarquia
  const validacao = await validarRegraHierarquia(indicador_id, indicado_id, tipo_relacao);
  
  // Criar log de validação
  await supabase
    .from('logs_governanca')
    .insert({
      broker_id: indicador_id,
      acao: 'validacao_indicacao',
      entidade_afetada: indicado_id,
      dados_antigos: {
        tipo_relacao_anterior: indicado.tipo_relacao || null,
        nivel_hierarquia_anterior: nivelIndicado
      },
      dados_novos: {
        tipo_relacao: tipo_relacao,
        nivel_hierarquia: nivelIndicado,
        indicador_id: indicador_id,
        indicado_id: indicado_id
      },
      status: 'sucesso',
      hash_registro: gerarHashRegistro(indicador_id, indicado_id, tipo_relacao),
      created_at: new Date().toISOString()
    });
  
  return {
    status: validacao.respeita_regra ? 'valida' : 'invalida',
    tipo_relacao,
    nivel_hierarquia: nivelIndicado,
    respeita_regra: validacao.respeita_regra,
    detalhes: validacao
  };
}

async function consultarRedeHierarquica(dados: any): Promise<HierarquiaResponse['rede_hierarquica']> {
  const { nivel_hierarquia } = dados;
  
  // Buscar todos os brokers
  const { data: brokers, error } = await supabase
    .from('brokers')
    .select(`
      id,
      nome,
      email,
      nivel_hierarquia,
      indicacoes_diretas,
      indicacoes_indiretas,
      total_indicacoes,
      score_hierarquia
    `)
    .order('score_hierarquia', { ascending: false });
  
  if (error) {
    throw new Error(`Erro ao consultar rede: ${error.message}`);
  }
  
  // Filtrar por nível se especificado
  const filtrados = nivel_hierarquia 
    ? brokers.filter(b => b.nivel_hierarquia === nivel_hierarquia)
    : brokers;
  
  // Calcular estatísticas
  const totalBrokers = filtrados.length;
  const totalIndicacoes = filtrados.reduce((sum, b) => sum + (b.total_indicacoes || 0), 0);
  const mediaIndicacoes = totalBrokers > 0 ? totalIndicacoes / totalBrokers : 0;
  
  return filtrados.map(broker => ({
    broker_id: broker.id,
    nome: broker.nome,
    email: broker.email,
    nivel_hierarquia: broker.nivel_hierarquia || 'sem_nivel',
    indicados_diretos: broker.indicacoes_diretas || 0,
    indicados_indiretos: broker.indicacoes_indiretas || 0,
    total_indicacoes: broker.total_indicacoes || 0,
    score_hierarquia: broker.score_hierarquia || 0
  }));
}

async function gerarRelatorioHierarquia(): Promise<HierarquiaResponse['relatorio']> {
  // Buscar todos os brokers
  const { data: brokers, error } = await supabase
    .from('brokers')
    .select('*');
  
  if (error) {
    throw new Error(`Erro ao gerar relatório: ${error.message}`);
  }
  
  // Analisar estrutura hierárquica
  const analiseResult = await analisarEstruturaHierarquica(brokers);
  
  // Gerar recomendações
  const recomendacoes = gerarRecomendacoesHierarquia(analiseResult);
  
  // Criar relatório
  const relatorio = {
    total_brokers: brokers.length,
    total_indicacoes: brokers.reduce((sum: number, b: any) => sum + (b.total_indicacoes || 0), 0),
    violacoes_regras: analiseResult.violacoes,
    redes_estruturadas: analiseResult.redes_estruturadas,
    redes_quebradas: analiseResult.redes_quebradas,
    recomendacoes
  };
  
  // Salvar relatório
  await supabase
    .from('logs_governanca')
    .insert({
      broker_id: 'system',
      acao: 'relatorio_hierarquia',
      entidade_afetada: 'system',
      dados_antigos: null,
      dados_novos: relatorio,
      status: 'sucesso',
      hash_registro: gerarHashRegistro('system', 'relatorio_hierarquia', JSON.stringify(relatorio)),
      created_at: new Date().toISOString()
    });
  
  return relatorio;
}

async function determinarNivelHierarquico(brokerId: string): Promise<string> {
  // Buscar indicações diretas do broker
  const { data: indicacoes, error } = await supabase
    .from('indicacoes')
    .select('*')
    .eq('indicador_id', brokerId)
    .eq('tipo_relacao', 'direta');
  
  if (error) {
    return 'sem_nivel';
  }
  
  // Calcular nível baseado no número de indicações diretas
  const totalIndicacoes = indicacoes.length;
  
  if (totalIndicacoes === 0) {
    return 'nivel_0';
  } else if (totalIndicacoes <= 2) {
    return 'nivel_1';
  } else if (totalIndicacoes <= 4) {
    return 'nivel_2';
  } else if (totalIndicacoes <= 8) {
    return 'nivel_3';
  } else if (totalIndicacoes <= 16) {
    return 'nivel_4';
  } else {
    return 'nivel_5';
  }
}

async function validarRegraHierarquia(indicadorId: string, indicadoId: string, tipoRelacao: string): Promise<any> {
  const nivelIndicador = await determinarNivelHierarquico(indicadorId);
  const nivelIndicado = await determinarNivelHierarquico(indicadoId);
  
  // Converter níveis para valores numéricos
  const nivelNumericoIndicador = parseInt(nivelIndicador.replace('nivel_', ''));
  const nivelNumericoIndicado = parseInt(nivelIndicado.replace('nivel_', ''));
  
  // Regras de hierarquia
  let respeitaRegra = true;
  let detalhes = {
    nivel_indicador: nivelNumericoIndicador,
    nivel_indicado: nivelNumericoIndicado,
    tipo_relacao: tipoRelacao,
    validacao: 'aprovada',
    motivo: ''
  };

  // Validações específicas
  if (tipoRelacao === 'direta') {
    // Indicação direta: indicador deve ser nível superior ao indicado
    if (nivelNumericoIndicador <= nivelNumericoIndicado) {
      respeitaRegra = false;
      detalhes.validacao = 'reprovada';
      detalhes.motivo = 'Indicador deve ser nível superior ao indicado em indicação direta';
    }
  } else if (tipoRelacao === 'indireta') {
    // Indicação indireta: pode ser mesmo nível ou inferior
    if (nivelNumericoIndicador > nivelNumericoIndicado + 2) {
      respeitaRegra = false;
      detalhes.validacao = 'reprovada';
      detalhes.motivo = 'Diferença de níveis muito grande para indicação indireta';
    }
  } else if (tipoRelacao === 'parceria') {
    // Parceria: deve ser mesmo nível ou adjacente
    if (Math.abs(nivelNumericoIndicador - nivelNumericoIndicado) > 1) {
      respeitaRegra = false;
      detalhes.validacao = 'reprovada';
      detalhes.motivo = 'Parceria só permitida entre níveis adjacentes';
    }
  }

  return {
    respeita_regra: respeitaRegra,
    ...detalhes
  };
}

async function analisarEstruturaHierarquica(brokers: any[]): Promise<any> {
  let violacoes = 0;
  let redesEstruturadas = 0;
  let redesQuebradas = 0;
  
  // Analisar cada broker
  for (const broker of brokers) {
    const nivelNumerico = parseInt(broker.nivel_hierarquia?.replace('nivel_', '') || '0');
    
    if (nivelNumerico === 0) {
      redesQuebradas++;
    } else if (nivelNumerico <= 2) {
      redesEstruturadas++;
    }
  }
  
  // Verificar violações de regras em batch
  const { data: indicacoes } = await supabase
    .from('indicacoes')
    .select('*')
    .in('indicador_id', brokers.map((b: any) => b.id));
  
  for (const indicacao of indicacoes || []) {
    const validacao = await validarRegraHierarquia(indicacao.indicador_id, indicacao.indicado_id, indicacao.tipo_relacao);
    if (!validacao.respeita_regra) {
      violacoes++;
    }
  }
  
  return {
    violacoes,
    redes_estruturadas: redesEstruturadas,
    redes_quebradas: redesQuebradas
  };
}

function gerarRecomendacoesHierarquia(analise: any): string[] {
  const recomendacoes = [];
  
  if (analise.violacoes > 0) {
    recomendacoes.push('Revisar imediatamente as indicações que violam as regras de hierarquia');
    recomendacoes.push('Implementar sistema de validação automática para novas indicações');
    recomendacoes.push('Treinar equipe sobre as regras de hierarquia da SB');
  }
  
  if (analise.redes_quebradas > analise.redes_estruturadas * 0.5) {
    recomendacoes.push('Focar em estruturar a rede de indicações');
    recomendacoes.push('Criar programa de mentoria para brokers nível 0-2');
  }
  
  if (analise.redes_estruturadas < analise.total_brokers * 0.3) {
    recomendacoes.push('Incentivar indicações diretas para fortalecer a rede');
    recomendacoes.push('Implementar sistema de bônus por indicações bem-sucedidas');
  }
  
  recomendacoes.push('Manter auditoria contínua da hierarquia de indicações');
  recomendacoes.push('Criar dashboard de acompanhamento da rede');
  
  return recomendacoes;
}

function gerarHashRegistro(indicadorId: string, indicadoId: string, tipoRelacao: string): string {
  const dados = `${indicadorId}:${indicadoId}:${tipoRelacao}:${new Date().toISOString()}`;
  return require('crypto').createHash('sha256').update(dados).digest('hex');
}

// Endpoint para consultar estatísticas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    
    if (tipo === 'estatisticas') {
      return await consultarEstatisticasHierarquia();
    }
    
    return NextResponse.json({
      success: false,
      error: 'Tipo de consulta inválido'
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Erro ao consultar estatísticas:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar estatísticas',
      details: error.message
    }, { status: 500 });
  }
}

async function consultarEstatisticasHierarquia(): Promise<NextResponse> {
  // Buscar estatísticas da hierarquia
  const { data: brokers, error } = await supabase
    .from('brokers')
    .select(`
      nivel_hierarquia,
      COUNT(*) as total_brokers,
      AVG(total_indicacoes) as media_indicacoes,
      SUM(total_indicacoes) as total_indicacoes,
      AVG(indicacoes_diretas) as media_indicacoes_diretas,
      SUM(indicacoes_diretas) as total_indicacoes_diretas
    `)
    .order('nivel_hierarquia')
    .order('nivel_hierarquia');
  
  if (error) {
    throw new Error(`Erro ao consultar estatísticas: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: {
      estatisticas_por_nivel: brokers || [],
      resumo: {
        total_brokers: (brokers || []).reduce((sum: number, b: any) => sum + (b.total_brokers || 0), 0),
        total_indicacoes: (brokers || []).reduce((sum: number, b: any) => sum + (b.total_indicacoes || 0), 0),
        media_indicacoes: (brokers || []).reduce((sum: number, b: any) => sum + (b.media_indicacoes || 0), 0) / (brokers?.length || 1),
        media_indicacoes_diretas: (brokers || []).reduce((sum: number, b: any) => sum + (b.media_indicacoes_diretas || 0), 0) / (brokers?.length || 1)
      }
    },
    message: 'Estatísticas consultadas com sucesso'
  });
}
