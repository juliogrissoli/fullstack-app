// 🏛️ SECURITY BROKER SB v19 - AUDITORIA SOBERANA
// API de Auditoria CRECI e Art. 725 CC para Conformidade Legal

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

interface AuditoriaSoberanaRequest {
  acao: 'iniciar_auditoria' | 'verificar_conformidade_crecci' | 'verificar_artigo_725' | 'emitir_relatorio_auditoria';
  dados?: {
    transacao_comissao_id?: string;
    broker_id?: string;
    percentual_aplicado?: number;
    data_primeiro_contato?: string;
    data_intermediacao?: string;
    data_fechamento?: string;
    contrato_existente?: boolean;
    relatorio_visitas_existente?: boolean;
  };
}

interface AuditoriaSoberanaResponse {
  success: boolean;
  auditoria_iniciada?: {
    id: string;
    transacao_comissao_id: string;
    status_auditoria: string;
    data_auditoria: string;
  };
  conformidade_crecci?: {
    status_conformidade: string;
    tabela_crecci_respeitada: boolean;
    percentual_maximo_respeitado: boolean;
    comissao_justa: boolean;
    percentual_aplicado: number;
    percentual_maximo_permitido: number;
    recomendacoes: string[];
  };
  artigo_725_verificado?: {
    status_conformidade: string;
    nexo_causal_presente: boolean;
    intermedia_efetiva: boolean;
    comissao_justa: boolean;
    dias_intermediacao: number;
    documentacao_completa: boolean;
    recomendacoes: string[];
  };
  relatorio_auditoria?: {
    status_geral: string;
    conformidade_crecci: boolean;
    artigo_725_cc: boolean;
    risco_legal: string;
    recomendacoes_gerais: string[];
    proximos_passos: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AuditoriaSoberanaRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🏛️ Auditoria Soberana: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'iniciar_auditoria':
        resultado = await iniciarAuditoria(dados);
        break;
      case 'verificar_conformidade_crecci':
        resultado = await verificarConformidadeCRECI(dados);
        break;
      case 'verificar_artigo_725':
        resultado = await verificarArtigo725(dados);
        break;
      case 'emitir_relatorio_auditoria':
        resultado = await emitirRelatorioAuditoria(dados);
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
    console.error('Erro na Auditoria Soberana:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno na Auditoria Soberana',
      details: error.message
    }, { status: 500 });
  }
}

async function iniciarAuditoria(dados: any): Promise<AuditoriaSoberanaResponse['auditoria_iniciada']> {
  const { transacao_comissao_id } = dados;
  
  // Validar dados obrigatórios
  if (!transacao_comissao_id) {
    throw new Error('ID da transação não fornecido');
  }
  
  // Buscar transação
  const { data: transacao, error: errorTransacao } = await supabase
    .from('transacoes_comissao')
    .select('*')
    .eq('id', transacao_comissao_id)
    .single();
  
  if (errorTransacao || !transacao) {
    throw new Error('Transação não encontrada');
  }
  
  // Iniciar auditoria CRECI
  const { data: auditoriaCRECI } = await supabase
    .from('auditoria_conformidade_crecci')
    .insert({
      transacao_comissao_id,
      tabela_crecci_respeitada: false,
      percentual_maximo_respeitado: false,
      comissao_justa: false,
      percentual_aplicado: transacao.comissao_percentual,
      status_auditoria: 'pendente',
      data_auditoria: new Date().toISOString()
    })
    .select('*')
    .single();
  
  // Iniciar auditoria Art. 725 CC
  const { data: auditoria725 } = await supabase
    .from('auditoria_artigo_725_cc')
    .insert({
      transacao_comissao_id,
      nexo_causal_presente: false,
      intermedia_efetiva: false,
      comissao_justa: false,
      data_primeiro_contato: new Date().toISOString().split('T')[0],
      data_intermediacao: new Date().toISOString().split('T')[0],
      data_fechamento: transacao.data_transacao,
      dias_intermediacao: 0,
      contrato_intermediacao_existente: false,
      relatorio_visitas_existente: false,
      documentacao_completa: false,
      status_auditoria: 'pendente',
      data_auditoria: new Date().toISOString()
    })
    .select('*')
    .single();
  
  return {
    id: auditoriaCRECI.id,
    transacao_comissao_id,
    status_auditoria: auditoriaCRECI.status_auditoria,
    data_auditoria: auditoriaCRECI.data_auditoria
  };
}

async function verificarConformidadeCRECI(dados: any): Promise<AuditoriaSoberanaResponse['conformidade_crecci']> {
  const { transacao_comissao_id, percentual_aplicado } = dados;
  
  // Validar dados obrigatórios
  if (!transacao_comissao_id || !percentual_aplicado) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Buscar auditoria existente
  const { data: auditoria, error: errorAuditoria } = await supabase
    .from('auditoria_conformidade_crecci')
    .select('*')
    .eq('transacao_comissao_id', transacao_comissao_id)
    .single();
  
  if (errorAuditoria || !auditoria) {
    throw new Error('Auditoria CRECI não encontrada');
  }
  
  // Tabela CRECI padrão (simulada)
  const tabelaCRECI = {
    residencial: { minimo: 4, maximo: 6 },
    comercial: { minimo: 4, maximo: 8 },
    rural: { minimo: 6, maximo: 10 },
    industrial: { minimo: 2, maximo: 4 }
  };
  
  // Buscar tipo do imóvel
  const { data: transacao } = await supabase
    .from('transacoes_comissao')
    .select(`
      *,
      imoveis_exclusividade!inner(
        tipo_imovel,
        valor_venda
      )
    `)
    .eq('id', transacao_comissao_id)
    .single();
  
  const tipoImovel = transacao.imoveis_exclusividade.tipo_imovel || 'residencial';
  const limites = (tabelaCRECI as any)[tipoImovel] || tabelaCRECI.residencial;
  
  // Verificações
  const tabelaRespeitada = percentual_aplicado >= limites.minimo && percentual_aplicado <= limites.maximo;
  const percentualMaximoRespeitado = percentual_aplicado <= limites.maximo;
  const comissaoJusta = percentual_aplicado >= limites.minimo;
  
  // Calcular diferença
  const diferencaPercentual = percentual_aplicado - limites.maximo;
  
  // Gerar recomendações
  const recomendacoes = [];
  if (!tabelaRespeitada) {
    recomendacoes.push(`Percentual aplicado (${percentual_aplicado}%) está fora da tabela CRECI para imóvel ${tipoImovel}`);
    recomendacoes.push(`Percentual permitido: ${limites.minimo}% a ${limites.maximo}%`);
  }
  if (!percentualMaximoRespeitado) {
    recomendacoes.push(`Percentual excede o máximo permitido pela tabela CRECI`);
    recomendacoes.push('Ajustar para percentual dentro dos limites legais');
  }
  if (!comissaoJusta) {
    recomendacoes.push(`Percentual abaixo do mínimo permitido pela tabela CRECI`);
    recomendacoes.push('Verificar se há acordo especial justificado');
  }
  
  // Atualizar auditoria
  await supabase
    .from('auditoria_conformidade_crecci')
    .update({
      tabela_crecci_respeitada: tabelaRespeitada,
      percentual_maximo_respeitado: percentualMaximoRespeitado,
      comissao_justa: comissaoJusta,
      percentual_aplicado,
      percentual_maximo_permitido: limites.maximo,
      diferenca_percentual: diferencaPercentual,
      status_auditoria: 'aprovado',
      observacoes_auditoria: recomendacoes.join('; ')
    })
    .eq('id', auditoria.id);
  
  return {
    status_conformidade: tabelaRespeitada ? 'conforme' : 'nao_conforme',
    tabela_crecci_respeitada: tabelaRespeitada,
    percentual_maximo_respeitado: percentualMaximoRespeitado,
    comissao_justa: comissaoJusta,
    percentual_aplicado,
    percentual_maximo_permitido: limites.maximo,
    recomendacoes
  };
}

async function verificarArtigo725(dados: any): Promise<AuditoriaSoberanaResponse['artigo_725_verificado']> {
  const { transacao_comissao_id, data_primeiro_contato, data_intermediacao, data_fechamento, contrato_existente, relatorio_visitas_existente } = dados;
  
  // Validar dados obrigatórios
  if (!transacao_comissao_id || !data_primeiro_contato || !data_intermediacao || !data_fechamento) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Buscar auditoria existente
  const { data: auditoria, error: errorAuditoria } = await supabase
    .from('auditoria_artigo_725_cc')
    .select('*')
    .eq('transacao_comissao_id', transacao_comissao_id)
    .single();
  
  if (errorAuditoria || !auditoria) {
    throw new Error('Auditoria Art. 725 CC não encontrada');
  }
  
  // Calcular dias de intermediação
  const dataInicio = new Date(data_primeiro_contato);
  const dataIntermediacao = new Date(data_intermediacao);
  const dataFechamento = new Date(data_fechamento);
  
  const diasIntermediacao = Math.floor((dataFechamento.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
  
  // Verificações do Art. 725 CC
  const nexoCausalPresente = diasIntermediacao > 0 && diasIntermediacao <= 365; // 1 ano máximo
  const intermediaEfetiva = diasIntermediacao >= 7; // Mínimo 7 dias de intermediação
  const comissaoJusta = diasIntermediacao >= 30; // Mínimo 30 dias para comissão justa
  
  // Verificar documentação
  const documentacaoCompleta = (contrato_existente || false) && (relatorio_visitas_existente || false);
  
  // Gerar recomendações
  const recomendacoes = [];
  if (!nexoCausalPresente) {
    recomendacoes.push('Nexo causal não está claro - verificar datas de contato');
    if (diasIntermediacao > 365) {
      recomendacoes.push('Período de intermediação muito longo (> 1 ano)');
    }
  }
  if (!intermediaEfetiva) {
    recomendacoes.push('Período de intermediação muito curto (< 7 dias)');
    recomendacoes.push('Documentar melhor o processo de intermediação');
  }
  if (!comissaoJusta) {
    recomendacoes.push('Período de intermediação pode não justificar a comissão');
    recomendacoes.push('Considerar reduzir comissão ou documentar melhor o serviço');
  }
  if (!documentacaoCompleta) {
    recomendacoes.push('Documentação incompleta - necessário contrato e relatório de visitas');
    recomendacoes.push('Emitir contrato de intermediação imediatamente');
  }
  
  // Atualizar auditoria
  await supabase
    .from('auditoria_artigo_725_cc')
    .update({
      nexo_causal_presente: nexoCausalPresente,
      intermedia_efetiva: intermediaEfetiva,
      comissao_justa: comissaoJusta,
      data_primeiro_contato,
      data_intermediacao,
      data_fechamento,
      diasIntermediacao,
      contrato_intermediacao_existente: contrato_existente || false,
      relatorio_visitas_existente: relatorio_visitas_existente || false,
      documentacaoCompleta,
      status_auditoria: 'aprovado',
      observacoes_auditoria: recomendacoes.join('; ')
    })
    .eq('id', auditoria.id);
  
  return {
    status_conformidade: (nexoCausalPresente && intermediaEfetiva && comissaoJusta && documentacaoCompleta) ? 'conforme' : 'nao_conforme',
    nexo_causal_presente: nexoCausalPresente,
    intermedia_efetiva: intermediaEfetiva,
    comissao_justa: comissaoJusta,
    dias_intermediacao: diasIntermediacao,
    documentacao_completa: documentacaoCompleta,
    recomendacoes
  };
}

async function emitirRelatorioAuditoria(dados: any): Promise<AuditoriaSoberanaResponse['relatorio_auditoria']> {
  const { transacao_comissao_id } = dados;
  
  // Validar dados obrigatórios
  if (!transacao_comissao_id) {
    throw new Error('ID da transação não fornecido');
  }
  
  // Buscar auditorias
  const { data: auditoriaCRECI } = await supabase
    .from('auditoria_conformidade_crecci')
    .select('*')
    .eq('transacao_comissao_id', transacao_comissao_id)
    .single();
  
  const { data: auditoria725 } = await supabase
    .from('auditoria_artigo_725_cc')
    .select('*')
    .eq('transacao_comissao_id', transacao_comissao_id)
    .single();
  
  if (!auditoriaCRECI || !auditoria725) {
    throw new Error('Auditorias não encontradas');
  }
  
  // Avaliar conformidade geral
  const conformidadeCRECI = auditoriaCRECI.tabela_crecci_respeitada && auditoriaCRECI.percentual_maximo_respeitado;
  const artigo725CC = auditoria725.nexo_causal_presente && auditoria725.intermedia_efetiva && auditoria725.comissao_justa;
  
  // Determinar risco legal
  let riscoLegal = 'baixo';
  if (!conformidadeCRECI || !artigo725CC) {
    riscoLegal = 'medio';
  }
  if (!conformidadeCRECI && !artigo725CC) {
    riscoLegal = 'alto';
  }
  
  // Gerar recomendações gerais
  const recomendacoesGerais = [];
  if (!conformidadeCRECI) {
    recomendacoesGerais.push('Ajustar percentual de comissão para conformidade CRECI');
    recomendacoesGerais.push('Revisar tabela CRECI para o tipo de imóvel');
  }
  if (!artigo725CC) {
    recomendacoesGerais.push('Documentar melhor o processo de intermediação');
    recomendacoesGerais.push('Emitir contrato de intermediação padrão');
    recomendacoesGerais.push('Manter relatório de visitas detalhado');
  }
  
  // Próximos passos
  const proximosPassos = [];
  if (riscoLegal === 'baixo') {
    proximosPassos.push('Manter documentação atualizada');
    proximosPassos.push('Continuar seguindo os padrões atuais');
  } else if (riscoLegal === 'medio') {
    proximosPassos.push('Implementar correções recomendadas');
    proximosPassos.push('Treinar equipe sobre conformidade');
    proximosPassos.push('Revisar próximos contratos');
  } else {
    proximosPassos.push('Ação imediata necessária');
    proximosPassos.push('Consultoria jurídica recomendada');
    proximosPassos.push('Suspender transações similares até regularização');
  }
  
  // Status geral
  let statusGeral = 'conforme';
  if (!conformidadeCRECI || !artigo725CC) {
    statusGeral = 'parcialmente_conforme';
  }
  if (!conformidadeCRECI && !artigo725CC) {
    statusGeral = 'nao_conforme';
  }
  
  return {
    status_geral: statusGeral,
    conformidade_crecci: conformidadeCRECI,
    artigo_725_cc: artigo725CC,
    risco_legal: riscoLegal,
    recomendacoes_gerais: recomendacoesGerais,
    proximos_passos: proximosPassos
  };
}

// Endpoint para consultar auditorias pendentes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const broker_id = searchParams.get('broker_id');
    const status = searchParams.get('status');
    
    if (broker_id) {
      return await consultarAuditoriasBroker(broker_id, status || undefined);
    }
    
    return NextResponse.json({
      success: false,
      error: 'broker_id é obrigatório'
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Erro ao consultar auditorias:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar auditorias',
      details: error.message
    }, { status: 500 });
  }
}

async function consultarAuditoriasBroker(brokerId: string, status?: string): Promise<NextResponse> {
  // Buscar auditorias do broker
  const { data: auditorias } = await supabase
    .from('dashboard_auditoria_soberana')
    .select(`
      *,
      transacoes_comissao!inner(
        captador_user_id,
        data_transacao,
        valor_transacao,
        comissao_total
      )
    `)
    .eq('captador_user_id', brokerId);
  
  // Filtrar por status se especificado
  let auditoriasFiltradas = auditorias || [];
  if (status) {
    auditoriasFiltradas = auditoriasFiltradas.filter(a => a.status_conformidade_total === status);
  }
  
  // Estatísticas
  const totalAuditorias = auditoriasFiltradas.length;
  const conformes = auditoriasFiltradas.filter(a => a.status_conformidade_total === 'conforme').length;
  const naoConformes = auditoriasFiltradas.filter(a => a.status_conformidade_total === 'nao_conforme').length;
  const parcialmenteConformes = auditoriasFiltradas.filter(a => a.status_conformidade_total === 'parcialmente_conforme').length;
  
  return NextResponse.json({
    success: true,
    data: {
      auditorias: auditoriasFiltradas,
      estatisticas: {
        total: totalAuditorias,
        conformes,
        naoConformes,
        parcialmenteConformes,
        taxa_conformidade: totalAuditorias > 0 ? (conformes / totalAuditorias) * 100 : 0
      }
    },
    message: 'Auditorias consultadas com sucesso'
  });
}
