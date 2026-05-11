// 🏛️ SECURITY BROKER SB v27 - REINO SOCIAL (PROPÓSITO E FILANTROPIA)
// API de Motor de Contribuição Social e Destinação de Recursos para Causas de Caridade

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

interface ReinoSocialRequest {
  acao: 'processar_contribuicao' | 'criar_projeto_social' | 'destinar_recursos' | 'oferecer_servico_pro_bono' | 'aplicar_servico_social' | 'conceder_selo_solidario' | 'consultar_dashboard_social' | 'consultar_transparencia';
  dados?: {
    mes_referencia?: string;
    faturamento_bruto?: number;
    custos_operacionais?: number;
    splits_distribuidos?: number;
    nome_projeto?: string;
    descricao_projeto?: string;
    tipo_projeto?: string;
    endereco?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    area_total_m2?: number;
    capacidade_pessoas?: number;
    numero_unidades?: number;
    valor_estimado?: number;
    data_inicio_planejado?: string;
    data_fim_planejado?: string;
    tesouro_reino_id?: string;
    projeto_social_id?: string;
    valor_destinado?: number;
    motivo_destinacao?: string;
    prestador_id?: string;
    imobiliaria_id?: string;
    tipo_servico?: string;
    nome_servico?: string;
    descricao_servico?: string;
    tipo_oferta?: string;
    valor_normal?: number;
    valor_social?: number;
    horas_disponiveis?: number;
    servico_pro_bono_id?: string;
    horas_aplicadas?: number;
    broker_id?: string;
    imobiliaria_id_selo?: string;
    tipo_selo?: string;
    nivel_selo?: string;
    motivo_selo?: string;
    data_inicio?: string;
    data_fim?: string;
    projeto_id?: string;
    visibilidade_publica?: boolean;
  };
}

interface ReinoSocialResponse {
  success: boolean;
  contribuicao_processada?: {
    id: string;
    mes_referencia: string;
    faturamento_bruto: number;
    custos_operacionais: number;
    splits_distribuidos: number;
    faturamento_liquido: number;
    valor_contribuicao: number;
    percentual_contribuicao: number;
    status_contribuicao: string;
    data_calculo: string;
  };
  projeto_social_criado?: {
    id: string;
    nome_projeto: string;
    descricao_projeto: string;
    tipo_projeto: string;
    status_projeto: string;
    endereco: string;
    bairro: string;
    cidade: string;
    estado: string;
    area_total_m2: number;
    capacidade_pessoas: number;
    numero_unidades: number;
    valor_estimado: number;
    data_inicio_planejado: string;
    data_fim_planejado: string;
    coordenada_central: { latitude: number; longitude: number };
  };
  recursos_destinados?: {
    id: string;
    tesouro_reino_id: string;
    projeto_social_id: string;
    valor_destinado: number;
    percentual_destinado: number;
    motivo_destinacao: string;
    data_destinacao: string;
    status_destinacao: string;
  };
  servico_pro_bono_oferecido?: {
    id: string;
    prestador_id: string;
    tipo_servico: string;
    nome_servico: string;
    descricao_servico: string;
    tipo_oferta: string;
    valor_normal: number;
    valor_social: number;
    horas_disponiveis: number;
    status_servico: string;
    data_inicio_disponibilidade: string;
    data_fim_disponibilidade: string;
  };
  servico_social_aplicado?: {
    id: string;
    servico_pro_bono_id: string;
    projeto_social_id: string;
    horas_aplicadas: number;
    valor_normal_estimado: number;
    valor_social_aplicado: number;
    economia_gerada: number;
    status_aplicacao: string;
    data_inicio_execucao: string;
  };
  selo_solidario_concedido?: {
    id: string;
    broker_id: string;
    imobiliaria_id: string;
    tipo_selo: string;
    nivel_selo: string;
    status_selo: string;
    data_concessao: string;
    data_expiracao: string;
    codigo_verificacao: string;
  };
  dashboard_social_consultado?: {
    periodo: string;
    total_contribuicoes: number;
    total_destinacoes: number;
    total_projetos_ativos: number;
    total_projetos_concluidos: number;
    valor_projetos_concluidos: number;
    valor_total_arrecadado: number;
    valor_total_gasto: number;
    total_servicos_pro_bono: number;
    total_servicos_ativos: number;
    total_horas_disponiveis: number;
    total_selos_concedidos: number;
    total_selos_ativos: number;
    total_logs_transparencia: number;
    total_logs_publicos: number;
  };
  transparencia_consultada?: {
    total_logs: number;
    logs_publicos: number;
    detalhes_logs: Array<{
      id: string;
      tipo_log: string;
      descricao_evento: string;
      valor_envolvido: number;
      data_evento: string;
      fotos_evento: string[];
      status_verificacao: string;
      visibilidade_publica: boolean;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ReinoSocialRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🏛️ Reino Social: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'processar_contribuicao':
        resultado = await processarContribuicao(dados);
        break;
      case 'criar_projeto_social':
        resultado = await criarProjetoSocial(dados);
        break;
      case 'destinar_recursos':
        resultado = await destinarRecursos(dados);
        break;
      case 'oferecer_servico_pro_bono':
        resultado = await oferecerServicoProBono(dados);
        break;
      case 'aplicar_servico_social':
        resultado = await aplicarServicoSocial(dados);
        break;
      case 'conceder_selo_solidario':
        resultado = await concederSeloSolidario(dados);
        break;
      case 'consultar_dashboard_social':
        resultado = await consultarDashboardSocial(dados);
        break;
      case 'consultar_transparencia':
        resultado = await consultarTransparencia(dados);
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
    console.error('Erro no Reino Social:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Reino Social',
      details: error.message
    }, { status: 500 });
  }
}

async function processarContribuicao(dados: any): Promise<ReinoSocialResponse['contribuicao_processada']> {
  const { mes_referencia } = dados;
  
  // Validar dados obrigatórios
  if (!mes_referencia) {
    throw new Error('Mês de referência não fornecido');
  }
  
  // Processar contribuição social via função RPC
  const { data: resultado, error } = await supabase
    .rpc('processar_contribuicao_social_mensal', {
      p_mes_referencia: mes_referencia
    });
  
  if (error) {
    throw new Error(`Erro ao processar contribuição: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error('Falha ao processar contribuição social');
  }
  
  // Buscar dados completos do tesouro
  const { data: tesouro } = await supabase
    .from('tesouro_reino_sb')
    .select('*')
    .eq('id', resultado.tesouro_id)
    .single();
  
  return {
    id: tesouro.id,
    mes_referencia: tesouro.mes_referencia,
    faturamento_bruto: tesouro.faturamento_bruto,
    custos_operacionais: tesouro.custos_operacionais,
    splits_distribuidos: tesouro.splits_distribuidos,
    faturamento_liquido: tesouro.faturamento_liquido,
    valor_contribuicao: tesouro.valor_contribuicao,
    percentual_contribuicao: tesouro.percentual_contribuicao,
    status_contribuicao: tesouro.status_contribuicao,
    data_calculo: tesouro.data_calculo
  };
}

async function criarProjetoSocial(dados: any): Promise<ReinoSocialResponse['projeto_social_criado']> {
  const { nome_projeto, descricao_projeto, tipo_projeto, endereco, bairro, cidade, estado, area_total_m2, capacidade_pessoas, numero_unidades, valor_estimado, data_inicio_planejado, data_fim_planejado } = dados;
  
  // Validar dados obrigatórios
  if (!nome_projeto || !tipo_projeto) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Validar tipo de projeto
  if (!['moradias', 'templos', 'centros_acolhimento', 'pracas', 'escolas'].includes(tipo_projeto)) {
    throw new Error('Tipo de projeto inválido');
  }
  
  // Gerar coordenada central (simulado - em produção seria geocodificação)
  const coordenadaCentral = { x: -23.5505, y: -46.6333 }; // São Paulo como padrão
  
  // Criar projeto social
  const { data: projeto, error } = await supabase
    .from('projetos_sociais')
    .insert({
      nome_projeto,
      descricao_projeto,
      tipo_projeto,
      status_projeto: 'planejamento',
      endereco,
      bairro,
      cidade,
      estado,
      area_total_m2,
      capacidade_pessoas,
      numero_unidades,
      valor_estimado,
      data_inicio_planejado,
      data_fim_planejado,
      coordenada_central: `POINT(${coordenadaCentral.x}, ${coordenadaCentral.y})`
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao criar projeto social: ${error.message}`);
  }
  
  // Gerar log de transparência
  await supabase
    .from('logs_transparencia_social')
    .insert({
      tipo_log: 'projeto',
      entidade_id: projeto.id,
      descricao_evento: 'Criação de projeto social - ' + nome_projeto,
      valor_envolvido: valor_estimado || 0,
      status_verificacao: 'verificado',
      visibilidade_publica: true,
      hash_log: 'PROJETO-' + Date.now()
    });
  
  return {
    id: projeto.id,
    nome_projeto: projeto.nome_projeto,
    descricao_projeto: projeto.descricao_projeto,
    tipo_projeto: projeto.tipo_projeto,
    status_projeto: projeto.status_projeto,
    endereco: projeto.endereco,
    bairro: projeto.bairro,
    cidade: projeto.cidade,
    estado: projeto.estado,
    area_total_m2: projeto.area_total_m2,
    capacidade_pessoas: projeto.capacidade_pessoas,
    numero_unidades: projeto.numero_unidades,
    valor_estimado: projeto.valor_estimado,
    data_inicio_planejado: projeto.data_inicio_planejado,
    data_fim_planejado: projeto.data_fim_planejado,
    coordenada_central: {
      latitude: coordenadaCentral.x,
      longitude: coordenadaCentral.y
    }
  };
}

async function destinarRecursos(dados: any): Promise<ReinoSocialResponse['recursos_destinados']> {
  const { tesouro_reino_id, projeto_social_id, valor_destinado, motivo_destinacao } = dados;
  
  // Validar dados obrigatórios
  if (!tesouro_reino_id || !projeto_social_id || !valor_destinado) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Buscar dados do tesouro
  const { data: tesouro } = await supabase
    .from('tesouro_reino_sb')
    .select('*')
    .eq('id', tesouro_reino_id)
    .single();
  
  if (!tesouro) {
    throw new Error('Tesouro não encontrado');
  }
  
  // Calcular percentual destinado
  const percentualDestinado = (valor_destinado / tesouro.valor_contribuicao) * 100;
  
  // Destinar recursos
  const { data: destinacao, error } = await supabase
    .from('destinacoes_tesouro')
    .insert({
      tesouro_reino_id,
      projeto_social_id,
      valor_destinado,
      percentual_destinado: percentualDestinado,
      motivo_destinacao: motivo_destinacao || 'Destinação para projeto social',
      status_destinacao: 'provisionado',
      hash_destinacao: 'DESTINACAO-' + Date.now()
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao destinar recursos: ${error.message}`);
  }
  
  // Atualizar valor arrecadado do projeto
  const { data: novoValorArrecadado } = await supabase.rpc('incrementar_valor_arrecadado', {
    p_projeto_id: projeto_social_id,
    p_valor: valor_destinado
  });
  await supabase
    .from('projetos_sociais')
    .update({ valor_arrecadado: novoValorArrecadado })
    .eq('id', projeto_social_id);
  
  return {
    id: destinacao.id,
    tesouro_reino_id: destinacao.tesouro_reino_id,
    projeto_social_id: destinacao.projeto_social_id,
    valor_destinado: destinacao.valor_destinado,
    percentual_destinado: destinacao.percentual_destinado,
    motivo_destinacao: destinacao.motivo_destinacao,
    data_destinacao: destinacao.data_destinacao,
    status_destinacao: destinacao.status_destinacao
  };
}

async function oferecerServicoProBono(dados: any): Promise<ReinoSocialResponse['servico_pro_bono_oferecido']> {
  const { prestador_id, imobiliaria_id, tipo_servico, nome_servico, descricao_servico, tipo_oferta, valor_normal, valor_social, horas_disponiveis } = dados;
  
  // Validar dados obrigatórios
  if (!prestador_id || !tipo_servico || !nome_servico || !tipo_oferta) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Validar tipo de serviço
  if (!['engenharia', 'arquitetura', 'consultoria', 'juridico', 'marketing', 'tecnologia'].includes(tipo_servico)) {
    throw new Error('Tipo de serviço inválido');
  }
  
  // Validar tipo de oferta
  if (!['horas_pro_bono', 'preco_custo', 'desconto_social'].includes(tipo_oferta)) {
    throw new Error('Tipo de oferta inválido');
  }
  
  // Oferecer serviço pro bono
  const { data: servico, error } = await supabase
    .from('servicos_pro_bono')
    .insert({
      prestador_id,
      imobiliaria_id,
      tipo_servico,
      nome_servico,
      descricao_servico,
      tipo_oferta,
      valor_normal: valor_normal || 0,
      valor_social: valor_social || 0,
      horas_disponiveis: horas_disponiveis || 0,
      status_servico: 'ativo',
      data_inicio_disponibilidade: new Date().toISOString().split('T')[0],
      data_fim_disponibilidade: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 ano
      hash_servico: 'SERVICO-' + Date.now()
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao oferecer serviço pro bono: ${error.message}`);
  }
  
  return {
    id: servico.id,
    prestador_id: servico.prestador_id,
    tipo_servico: servico.tipo_servico,
    nome_servico: servico.nome_servico,
    descricao_servico: servico.descricao_servico,
    tipo_oferta: servico.tipo_oferta,
    valor_normal: servico.valor_normal,
    valor_social: servico.valor_social,
    horas_disponiveis: servico.horas_disponiveis,
    status_servico: servico.status_servico,
    data_inicio_disponibilidade: servico.data_inicio_disponibilidade,
    data_fim_disponibilidade: servico.data_fim_disponibilidade
  };
}

async function aplicarServicoSocial(dados: any): Promise<ReinoSocialResponse['servico_social_aplicado']> {
  const { servico_pro_bono_id, projeto_social_id, horas_aplicadas, solicitante_id } = dados;
  
  // Validar dados obrigatórios
  if (!servico_pro_bono_id || !projeto_social_id || !horas_aplicadas) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Buscar dados do serviço
  const { data: servico } = await supabase
    .from('servicos_pro_bono')
    .select('*')
    .eq('id', servico_pro_bono_id)
    .single();
  
  if (!servico) {
    throw new Error('Serviço pro bono não encontrado');
  }
  
  // Calcular valores
  const valorNormalEstimado = servico.valor_normal * (horas_aplicadas / servico.horas_disponiveis);
  const valorSocialAplicado = servico.valor_social * (horas_aplicadas / servico.horas_disponiveis);
  
  // Aplicar serviço social
  const { data: aplicacao, error } = await supabase
    .from('aplicacoes_servicos_sociais')
    .insert({
      servico_pro_bono_id,
      projeto_social_id,
      solicitante_id,
      horas_aplicadas,
      valor_normal_estimado: valorNormalEstimado,
      valor_social_aplicado: valorSocialAplicado,
      status_aplicacao: 'aprovado',
      data_aprovacao: new Date().toISOString().split('T')[0],
      data_inicio_execucao: new Date().toISOString().split('T')[0],
      hash_aplicacao: 'APLICACAO-' + Date.now()
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao aplicar serviço social: ${error.message}`);
  }
  
  // Atualizar horas utilizadas do serviço
  await supabase
    .from('servicos_pro_bono')
    .update({
      horas_utilizadas: servico.horas_utilizadas + horas_aplicadas
    })
    .eq('id', servico_pro_bono_id);
  
  // Atualizar valor gasto do projeto
  const { data: novoValorGasto } = await supabase.rpc('incrementar_valor_gasto', {
    p_projeto_id: projeto_social_id,
    p_valor: valorSocialAplicado
  });
  await supabase
    .from('projetos_sociais')
    .update({ valor_gasto: novoValorGasto })
    .eq('id', projeto_social_id);
  
  return {
    id: aplicacao.id,
    servico_pro_bono_id: aplicacao.servico_pro_bono_id,
    projeto_social_id: aplicacao.projeto_social_id,
    horas_aplicadas: aplicacao.horas_aplicadas,
    valor_normal_estimado: aplicacao.valor_normal_estimado,
    valor_social_aplicado: aplicacao.valor_social_aplicado,
    economia_gerada: aplicacao.economia_gerada,
    status_aplicacao: aplicacao.status_aplicacao,
    data_inicio_execucao: aplicacao.data_inicio_execucao
  };
}

async function concederSeloSolidario(dados: any): Promise<ReinoSocialResponse['selo_solidario_concedido']> {
  const { broker_id, imobiliaria_id_selo, tipo_selo, nivel_selo, motivo_selo } = dados;
  
  // Validar dados obrigatórios
  if (!broker_id && !imobiliaria_id_selo) {
    throw new Error('É necessário informar broker_id ou imobiliaria_id');
  }
  
  if (!tipo_selo || !nivel_selo) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Validar tipo de selo
  if (!['contribuinte', 'voluntario', 'pro_bono', 'sustentador', 'embaixador'].includes(tipo_selo)) {
    throw new Error('Tipo de selo inválido');
  }
  
  // Validar nível de selo
  if (!['bronze', 'prata', 'ouro', 'diamante'].includes(nivel_selo)) {
    throw new Error('Nível de selo inválido');
  }
  
  // Conceder selo via função RPC
  const { data: resultado, error } = await supabase
    .rpc('conceder_selo_parceiro_solidario', {
      p_broker_id: broker_id,
      p_imobiliaria_id: imobiliaria_id_selo,
      p_tipo_selo: tipo_selo,
      p_nivel_selo: nivel_selo,
      p_motivo: motivo_selo
    });
  
  if (error) {
    throw new Error(`Erro ao conceder selo: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error('Falha ao conceder selo solidário');
  }
  
  // Buscar dados completos do selo
  const { data: selo } = await supabase
    .from('selos_parceiro_solidario')
    .select('*')
    .eq('id', resultado.selo_id)
    .single();
  
  return {
    id: selo.id,
    broker_id: selo.broker_id,
    imobiliaria_id: selo.imobiliaria_id,
    tipo_selo: selo.tipo_selo,
    nivel_selo: selo.nivel_selo,
    status_selo: selo.status_selo,
    data_concessao: selo.data_concessao,
    data_expiracao: selo.data_expiracao,
    codigo_verificacao: selo.codigo_verificacao
  };
}

async function consultarDashboardSocial(dados: any): Promise<ReinoSocialResponse['dashboard_social_consultado']> {
  const { data_inicio, data_fim } = dados;
  
  // Buscar dashboard social
  let query = supabase
    .from('dashboard_social')
    .select('*');
  
  if (data_inicio && data_fim) {
    query = query
      .gte('mes_referencia', data_inicio)
      .lte('mes_referencia', data_fim);
  } else {
    // Últimos 6 meses por padrão
    const dataInicio = new Date();
    dataInicio.setMonth(dataInicio.getMonth() - 6);
    query = query.gte('mes_referencia', dataInicio.toISOString().split('T')[0]);
  }
  
  const { data: dashboard, error } = await query.order('mes_referencia', { ascending: false }).limit(1);
  
  if (error || !dashboard || dashboard.length === 0) {
    throw new Error('Dashboard social não encontrado');
  }
  
  const dash = dashboard[0];
  
  return {
    periodo: data_inicio && data_fim ? `${data_inicio} a ${data_fim}` : 'Últimos 6 meses',
    total_contribuicoes: dash.valor_contribuicao || 0,
    total_destinacoes: dash.valor_total_destinacoes || 0,
    total_projetos_ativos: dash.total_projetos_ativos || 0,
    total_projetos_concluidos: dash.total_projetos_concluidos || 0,
    valor_projetos_concluidos: dash.valor_projetos_concluidos || 0,
    valor_total_arrecadado: dash.valor_total_arrecadado || 0,
    valor_total_gasto: dash.valor_total_gasto || 0,
    total_servicos_pro_bono: dash.total_servicos_pro_bono || 0,
    total_servicos_ativos: dash.total_servicos_ativos || 0,
    total_horas_disponiveis: dash.total_horas_disponiveis || 0,
    total_selos_concedidos: dash.total_selos_concedidos || 0,
    total_selos_ativos: dash.total_selos_ativos || 0,
    total_logs_transparencia: dash.total_logs_transparencia || 0,
    total_logs_publicos: dash.total_logs_publicos || 0
  };
}

async function consultarTransparencia(dados: any): Promise<ReinoSocialResponse['transparencia_consultada']> {
  const { projeto_id, data_inicio, data_fim, visibilidade_publica } = dados;
  
  // Buscar logs de transparência
  let query = supabase
    .from('logs_transparencia_social')
    .select('*');
  
  if (projeto_id) {
    query = query.eq('entidade_id', projeto_id);
  }
  
  if (data_inicio && data_fim) {
    query = query
      .gte('data_evento', data_inicio)
      .lte('data_evento', data_fim);
  }
  
  if (visibilidade_publica !== undefined) {
    query = query.eq('visibilidade_publica', visibilidade_publica);
  }
  
  const { data: logs, error } = await query.order('data_evento', { ascending: false }).limit(50);
  
  if (error) {
    throw new Error(`Erro ao consultar transparência: ${error.message}`);
  }
  
  return {
    total_logs: logs.length,
    logs_publicos: logs.filter(l => l.visibilidade_publica).length,
    detalhes_logs: logs.map(l => ({
      id: l.id,
      tipo_log: l.tipo_log,
      descricao_evento: l.descricao_evento,
      valor_envolvido: l.valor_envolvido,
      data_evento: l.data_evento,
      fotos_evento: l.fotos_evento,
      status_verificacao: l.status_verificacao,
      visibilidade_publica: l.visibilidade_publica
    }))
  };
}

// Endpoint para consultas específicas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const broker_id = searchParams.get('broker_id');
    const imobiliaria_id = searchParams.get('imobiliaria_id');
    const projeto_id = searchParams.get('projeto_id');
    
    if (tipo === 'projetos_sociais') {
      return await consultarProjetosSociais();
    }
    
    if (tipo === 'servicos_pro_bono' && broker_id) {
      return await consultarServicosProBonoBroker(broker_id);
    }
    
    if (tipo === 'selos_solidarios' && (broker_id || imobiliaria_id)) {
      return await consultarSelosSolidarios(broker_id, imobiliaria_id);
    }
    
    if (tipo === 'projeto_detalhes' && projeto_id) {
      return await consultarProjetoDetalhes(projeto_id);
    }
    
    if (tipo === 'relatorios_impacto') {
      return await consultarRelatoriosImpacto();
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

async function consultarProjetosSociais(): Promise<NextResponse> {
  // Buscar todos os projetos sociais com progresso
  const { data: projetos } = await supabase
    .from('projetos_sociais_progresso')
    .select('*')
    .order('data_inicio_planejado', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: projetos || [],
    message: 'Projetos sociais consultados com sucesso'
  });
}

async function consultarServicosProBonoBroker(brokerId: string): Promise<NextResponse> {
  // Buscar serviços pro bono do broker
  const { data: servicos } = await supabase
    .from('servicos_pro_bono')
    .select('*')
    .eq('prestador_id', brokerId)
    .eq('status_servico', 'ativo')
    .order('created_at', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: servicos || [],
    message: 'Serviços pro bono consultados com sucesso'
  });
}

async function consultarSelosSolidarios(brokerId: string | null, imobiliariaId: string | null): Promise<NextResponse> {
  // Buscar selos do broker ou imobiliária
  let query = supabase
    .from('selos_parceiro_solidario')
    .select('*');
  
  if (brokerId) {
    query = query.eq('broker_id', brokerId);
  }
  
  if (imobiliariaId) {
    query = query.eq('imobiliaria_id', imobiliariaId);
  }
  
  const { data: selos } = await query.order('data_concessao', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: selos || [],
    message: 'Selos solidários consultados com sucesso'
  });
}

async function consultarProjetoDetalhes(projetoId: string): Promise<NextResponse> {
  // Buscar detalhes completos do projeto
  const { data: projeto } = await supabase
    .from('projetos_sociais_progresso')
    .select('*')
    .eq('id', projetoId)
    .single();
  
  // Buscar logs de transparência do projeto
  const { data: logs } = await supabase
    .from('logs_transparencia_social')
    .select('*')
    .eq('entidade_id', projetoId)
    .eq('tipo_log', 'projeto')
    .order('data_evento', { ascending: false });
  
  // Buscar aplicações de serviços
  const { data: aplicacoes } = await supabase
    .from('aplicacoes_servicos_sociais')
    .select('*')
    .eq('projeto_social_id', projetoId)
    .order('data_inicio_execucao', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: {
      projeto,
      logs: logs || [],
      aplicacoes: aplicacoes || []
    },
    message: 'Detalhes do projeto consultados com sucesso'
  });
}

async function consultarRelatoriosImpacto(): Promise<NextResponse> {
  // Buscar relatórios de impacto social
  const { data: relatorios } = await supabase
    .from('relatorios_impacto_social')
    .select('*')
    .order('periodo_inicio', { ascending: false })
    .limit(10);
  
  return NextResponse.json({
    success: true,
    data: relatorios || [],
    message: 'Relatórios de impacto consultados com sucesso'
  });
}
