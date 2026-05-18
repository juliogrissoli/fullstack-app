// 🏛️ SECURITY BROKER SB v20 - AUDITORIA SPLIT
// API de Auditoria Soberana com Extrato Detalhado

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

interface AuditoriaSplitRequest {
  acao: 'gerar_extrato_soberano' | 'validar_split' | 'consultar_logs_auditoria' | 'emitir_relatorio_completo';
  dados?: {
    broker_id?: string;
    match_id?: string;
    data_inicio?: string;
    data_fim?: string;
    tipo_relatorio?: string;
  };
}

interface AuditoriaSplitResponse {
  success: boolean;
  extrato_soberano?: {
    broker_nome: string;
    broker_email: string;
    total_participacoes: number;
    total_disponiveis: number;
    total_bloqueados: number;
    total_parciais: number;
    total_ganhos: number;
    total_reinvestimento: number;
    total_disponivel_saque: number;
    total_bloqueado: number;
    resumo_comissoes: string;
    detalhes_participacoes: Array<{
      match_id: string;
      tipo_participacao: string;
      comissao_total: string;
      sua_parte: string;
      saldo_reinvestimento: string;
      status_comissao: string;
      dados_match: {
        valor_imovel: string;
        data_match: string;
        status_match: string;
        participantes: {
          captador_nome: string;
          parceiro_nome: string;
          vendedor_nome: string;
          cliente_nome: string;
        };
      };
    }>;
  };
  split_validado?: {
    status_validacao: string;
    match_id: string;
    split_distribuicao: {
      captador: number;
      parceiro: number;
      vendedor: number;
      sb_system: number;
    };
    soma_total: number;
    percentual_distribuicao: {
      captador: string;
      parceiro: string;
      vendedor: string;
      sb_system: string;
    };
    auditoria_soberana: boolean;
    conformidade_legal: boolean;
  };
  logs_auditoria?: Array<{
    id: string;
    tipo_auditoria: string;
    dados_novos: any;
    split_validado: boolean;
    auditoria_soberana: boolean;
    status_auditoria: string;
    data_auditoria: string;
    observacoes: string;
  }>;
  relatorio_completo?: {
    periodo_analise: string;
    broker_info: {
      nome: string;
      email: string;
      total_matches: number;
    };
    estatisticas_gerais: {
      total_comissoes: number;
      valor_total: number;
      media_por_participacao: number;
      taxa_disponibilidade: number;
    };
    analise_split: {
      distribuicao_correta: boolean;
      validacao_estrutura: boolean;
      conformidade_soberana: boolean;
      recomendacoes: string[];
    };
    status_final: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AuditoriaSplitRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🏛️ Auditoria Split: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'gerar_extrato_soberano':
        resultado = await gerarExtratoSoberano(dados);
        break;
      case 'validar_split':
        resultado = await validarSplit(dados);
        break;
      case 'consultar_logs_auditoria':
        resultado = await consultarLogsAuditoria(dados);
        break;
      case 'emitir_relatorio_completo':
        resultado = await emitirRelatorioCompleto(dados);
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
    console.error('Erro na Auditoria Split:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno na Auditoria Split',
      details: error.message
    }, { status: 500 });
  }
}

async function gerarExtratoSoberano(dados: any): Promise<AuditoriaSplitResponse['extrato_soberano']> {
  const { broker_id, data_inicio, data_fim } = dados;
  
  // Validar dados obrigatórios
  if (!broker_id) {
    throw new Error('ID do broker não fornecido');
  }
  
  // Buscar dados consolidados do broker
  const { data: consolidado, error: errorConsolidado } = await supabase
    .from('extrato_consolidado_autonomos')
    .select('*')
    .eq('broker_id', broker_id)
    .single();
  
  if (errorConsolidado) {
    throw new Error(`Erro ao buscar dados consolidados: ${errorConsolidado.message}`);
  }
  
  // Buscar participações detalhadas
  const { data: participacoes, error: errorParticipacoes } = await supabase
    .rpc('gerar_extrato_detalhado', {
      p_broker_id: broker_id,
      p_data_inicio: data_inicio,
      p_data_fim: data_fim
    });
  
  if (errorParticipacoes) {
    throw new Error(`Erro ao buscar participações: ${errorParticipacoes.message}`);
  }
  
  // Formatar resumo de comissões
  const resumoComissoes = `Comissão Total: R$ ${consolidado.total_ganhos.toFixed(2)} | Sua Parte: R$ ${consolidado.total_disponivel_saque.toFixed(2)} | Saldo Reinvestimento: R$ ${consolidado.total_reinvestimento.toFixed(2)}`;
  
  return {
    broker_nome: consolidado.broker_nome,
    broker_email: consolidado.broker_email,
    total_participacoes: consolidado.total_participacoes,
    total_disponiveis: consolidado.total_disponiveis,
    total_bloqueados: consolidado.total_bloqueados,
    total_parciais: consolidado.total_parciais,
    total_ganhos: consolidado.total_ganhos,
    total_reinvestimento: consolidado.total_reinvestimento,
    total_disponivel_saque: consolidado.total_disponivel_saque,
    total_bloqueado: consolidado.total_bloqueado,
    resumo_comissoes: resumoComissoes,
    detalhes_participacoes: participacoes.map((p: any) => ({
      match_id: p.match_id,
      tipo_participacao: p.tipo_participacao,
      comissao_total: `R$ ${p.comissao_total.toFixed(2)}`,
      sua_parte: `R$ ${p.sua_parte.toFixed(2)}`,
      saldo_reinvestimento: `R$ ${p.saldo_reinvestimento.toFixed(2)}`,
      status_comissao: p.status_comissao,
      dados_match: {
        valor_imovel: `R$ ${p.dados_match.valor_imovel.toFixed(2)}`,
        data_match: new Date(p.dados_match.data_match).toLocaleDateString('pt-BR'),
        status_match: p.dados_match.status_match,
        participantes: {
          captador_nome: p.dados_match.captador_nome,
          parceiro_nome: p.dados_match.parceiro_nome,
          vendedor_nome: p.dados_match.vendedor_nome,
          cliente_nome: p.dados_match.cliente_nome
        }
      }
    }))
  };
}

async function validarSplit(dados: any): Promise<AuditoriaSplitResponse['split_validado']> {
  const { match_id } = dados;
  
  // Validar dados obrigatórios
  if (!match_id) {
    throw new Error('ID do match não fornecido');
  }
  
  // Buscar dados do match
  const { data: match, error } = await supabase
    .from('matches_autonomos')
    .select('*')
    .eq('id', match_id)
    .single();
  
  if (error) {
    throw new Error(`Erro ao buscar match: ${error.message}`);
  }
  
  // Validar distribuição do split
  const splitDistribuicao = {
    captador: match.captador_parte,
    parceiro: match.parceiro_parte,
    vendedor: match.vendedor_parte,
    sb_system: match.sb_system_parte
  };
  
  const somaTotal = Object.values(splitDistribuicao).reduce((sum, val) => sum + val, 0);
  const somaEsperada = match.comissao_total;
  
  // Validar percentuais
  const percentualDistribuicao = {
    captador: '10%',
    parceiro: '30%',
    vendedor: '40%',
    sb_system: '20%'
  };
  
  // Verificar conformidade
  const splitValidado = Math.abs(somaTotal - somaEsperada) < 0.01;
  const auditoriaSoberana = !match.hash_match.includes('externo');
  const conformidadeLegal = splitValidado && auditoriaSoberana;
  
  return {
    status_validacao: splitValidado ? 'valido' : 'invalido',
    match_id: match.id,
    split_distribuicao: splitDistribuicao,
    soma_total: somaTotal,
    percentual_distribuicao: percentualDistribuicao,
    auditoria_soberana: auditoriaSoberana,
    conformidade_legal: conformidadeLegal
  };
}

async function consultarLogsAuditoria(dados: any): Promise<AuditoriaSplitResponse['logs_auditoria']> {
  const { broker_id, data_inicio, data_fim } = dados;
  
  // Buscar logs de auditoria
  let query = supabase
    .from('logs_auditoria_split')
    .select(`
      *,
      matches_autonomos!inner(
        captador_id,
        parceiro_id,
        vendedor_id
      )
    `)
    .order('created_at', { ascending: false });
  
  // Aplicar filtros se fornecidos
  if (broker_id) {
    query = query.or(`matches_autonomos.captador_id.eq.${broker_id},matches_autonomos.parceiro_id.eq.${broker_id},matches_autonomos.vendedor_id.eq.${broker_id}`);
  }
  
  if (data_inicio) {
    query = query.gte('created_at', data_inicio);
  }
  
  if (data_fim) {
    query = query.lte('created_at', data_fim);
  }
  
  const { data: logs, error } = await query;
  
  if (error) {
    throw new Error(`Erro ao consultar logs: ${error.message}`);
  }
  
  return logs.map((log: any) => ({
    id: log.id,
    tipo_auditoria: log.tipo_auditoria,
    dados_novos: log.dados_novos,
    split_validado: log.split_validado,
    auditoria_soberana: log.auditoria_soberana,
    status_auditoria: log.status_auditoria,
    data_auditoria: log.created_at,
    observacoes: log.observacoes
  }));
}

async function emitirRelatorioCompleto(dados: any): Promise<AuditoriaSplitResponse['relatorio_completo']> {
  const { broker_id, data_inicio, data_fim } = dados;
  
  // Validar dados obrigatórios
  if (!broker_id) {
    throw new Error('ID do broker não fornecido');
  }
  
  // Buscar informações do broker
  const { data: broker, error: errorBroker } = await supabase
    .from('brokers')
    .select('*')
    .eq('id', broker_id)
    .single();
  
  if (errorBroker) {
    throw new Error(`Erro ao buscar broker: ${errorBroker.message}`);
  }
  
  // Buscar estatísticas gerais
  const { data: participacoes, error: errorParticipacoes } = await supabase
    .from('extrato_detalhado_comissoes')
    .select('*')
    .eq('broker_id', broker_id);
  
  if (errorParticipacoes) {
    throw new Error(`Erro ao buscar participações: ${errorParticipacoes.message}`);
  }
  
  // Calcular estatísticas
  const totalComissoes = participacoes.length;
  const valorTotal = participacoes.reduce((sum, p) => sum + p.sua_parte, 0);
  const mediaPorParticipacao = totalComissoes > 0 ? valorTotal / totalComissoes : 0;
  const taxaDisponibilidade = totalComissoes > 0 
    ? (participacoes.filter(p => p.status_comissao === 'disponivel').length / totalComissoes) * 100 
    : 0;
  
  // Analisar split
  const validacaoSplit = await validarSplit({ match_id: participacoes[0]?.match_id });
  
  // Gerar recomendações
  const recomendacoes = [];
  if (!(validacaoSplit as any)?.split_validado) {
    recomendacoes.push('Revisar distribuição de split - valores inconsistentes');
  }
  if (!(validacaoSplit as any)?.auditoria_soberana) {
    recomendacoes.push('Verificar conformidade soberana - possíveis referências externas');
  }
  if (taxaDisponibilidade < 70) {
    recomendacoes.push('Aumentar taxa de disponibilidade - muitas comissões bloqueadas');
  }
  if (mediaPorParticipacao < 1000) {
    recomendacoes.push('Buscar matches de maior valor para aumentar média de ganhos');
  }
  
  // Determinar status final
  let statusFinal = 'aprovado';
  if (!(validacaoSplit as any)?.conformidade_legal || taxaDisponibilidade < 50) {
    statusFinal = 'reprovado';
  } else if (!(validacaoSplit as any)?.split_validado || taxaDisponibilidade < 70) {
    statusFinal = 'atencao';
  }
  
  return {
    periodo_analise: `${data_inicio || 'início'} a ${data_fim || 'atual'}`,
    broker_info: {
      nome: broker.nome,
      email: broker.email,
      total_matches: participacoes.length
    },
    estatisticas_gerais: {
      total_comissoes: totalComissoes,
      valor_total: valorTotal,
      media_por_participacao: mediaPorParticipacao,
      taxa_disponibilidade: taxaDisponibilidade
    },
    analise_split: {
      distribuicao_correta: (validacaoSplit as any)?.split_validado || false,
      validacao_estrutura: validacaoSplit?.auditoria_soberana || false,
      conformidade_soberana: validacaoSplit?.conformidade_legal || false,
      recomendacoes
    },
    status_final: statusFinal
  };
}

// Endpoint para consultar estatísticas gerais
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    
    if (tipo === 'estatisticas') {
      return await consultarEstatisticasGerais();
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

async function consultarEstatisticasGerais(): Promise<NextResponse> {
  // Buscar estatísticas gerais de matches
  const { data: matches } = await supabase
    .from('matches_autonomos')
    .select(`
      status_match,
      status_disponibilidade,
      COUNT(*) as total_matches,
      COUNT(CASE WHEN status_disponibilidade = 'disponivel' THEN 1 END) as total_disponiveis,
      COUNT(CASE WHEN status_disponibilidade = 'bloqueado' THEN 1 END) as total_bloqueados,
      COUNT(CASE WHEN status_disponibilidade = 'parcial' THEN 1 END) as total_parciais,
      AVG(valor_imovel) as media_valor_imovel,
      AVG(comissao_total) as media_comissao_total,
      SUM(comissao_total) as total_comissoes_gerais
    `);
  
  // Buscar estatísticas de split
  const { data: splits } = await supabase
    .from('transacoes_split_mesa')
    .select(`
      tipo_participante,
      COUNT(*) as total_transacoes,
      AVG(valor_liquido) as media_valor,
      SUM(valor_liquido) as total_valor,
      COUNT(CASE WHEN status_transacao = 'disponivel' THEN 1 END) as total_disponiveis,
      COUNT(CASE WHEN status_transacao = 'bloqueado' THEN 1 END) as total_bloqueados
    `);
  
  return NextResponse.json({
    success: true,
    data: {
      estatisticas_matches: matches || [],
      estatisticas_splits: splits || []
    },
    message: 'Estatísticas consultadas com sucesso'
  });
}
