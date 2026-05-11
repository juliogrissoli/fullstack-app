// 🏛️ SECURITY BROKER SB v22 - ECOSSISTEMA TOTAL
// API do Ecossistema Total com 10 Frentes de Monetização

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

interface EcossistemaTotalRequest {
  acao: 'criar_projeto' | 'vender_unidade' | 'calcular_recorrencia' | 'auditoria_stress' | 'consultar_dashboard';
  dados?: {
    nome_projeto?: string;
    codigo_projeto?: string;
    incorporadora_id?: string;
    broker_master_id?: string;
    total_projetos?: number;
    unidades_por_projeto?: number;
    endereco_principal?: string;
    cidade?: string;
    estado?: string;
    valor_medio_unidade?: number;
    unidade_id?: string;
    captador_id?: string;
    parceiro_id?: string;
    vendedor_id?: string;
    cliente_id?: string;
    valor_venda?: number;
    comissao_percentual?: number;
    broker_id?: string;
    mes_referencia?: string;
    escala_projetos?: number;
  };
}

interface EcossistemaTotalResponse {
  success: boolean;
  projeto_criado?: {
    id: string;
    nome_projeto: string;
    codigo_projeto: string;
    total_unidades: number;
    valor_total_estimado: number;
    status_projeto: string;
  };
  unidade_vendida?: {
    id: string;
    valor_venda: number;
    comissao_total: number;
    split_distribuicao: {
      captador: number;
      parceiro: number;
      vendedor: number;
      sb_system: number;
    };
    retencao_70_30: {
      comissoes_80_percent: number;
      taxa_sb_20_percent: number;
      taxa_sb_70_percent: number;
      taxa_sb_30_percent: number;
    };
    status_disponibilidade: string;
  };
  projecao_recorrencia?: {
    total_indicados: number;
    valor_base: number;
    nivel1: number;
    nivel2: number;
    nivel3: number;
    nivel4: number;
    nivel5: number;
    total_recorrencia: number;
    mes_referencia: string;
  };
  auditoria_stress?: {
    escala_projetos: number;
    unidades_por_projeto: number;
    total_unidades: number;
    latencia_split_4vias: string;
    processamento_retencao_70_30: string;
    stress_result: string;
    data_teste: string;
  };
  dashboard_ecossistema?: {
    total_projetos: number;
    total_unidades: number;
    total_vendidas: number;
    valor_total_vendas: number;
    valor_total_comissoes: number;
    total_matches: number;
    total_recorrencias: number;
    total_marketplace: number;
    total_landbanking: number;
    total_fundo_investimentos: number;
    total_mentorias: number;
    total_selos_juris: number;
    total_data_intelligence: number;
    total_anticipacoes: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: EcossistemaTotalRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🏛️ Ecossistema Total: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'criar_projeto':
        resultado = await criarProjeto(dados);
        break;
      case 'vender_unidade':
        resultado = await venderUnidade(dados);
        break;
      case 'calcular_recorrencia':
        resultado = await calcularRecorrencia(dados);
        break;
      case 'auditoria_stress':
        resultado = await auditoriaStress(dados);
        break;
      case 'consultar_dashboard':
        resultado = await consultarDashboard(dados);
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
    console.error('Erro no Ecossistema Total:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Ecossistema Total',
      details: error.message
    }, { status: 500 });
  }
}

async function criarProjeto(dados: any): Promise<EcossistemaTotalResponse['projeto_criado']> {
  const { nome_projeto, codigo_projeto, incorporadora_id, broker_master_id, total_projetos, unidades_por_projeto, endereco_principal, cidade, estado, valor_medio_unidade } = dados;
  
  // Validar dados obrigatórios
  if (!nome_projeto || !codigo_projeto || !incorporadora_id || !broker_master_id || !total_projetos || !unidades_por_projeto || !cidade || !estado || !valor_medio_unidade) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Verificar se código já existe
  const { data: projetoExistente } = await supabase
    .from('projetos_sb')
    .select('*')
    .eq('codigo_projeto', codigo_projeto)
    .single();
  
  if (projetoExistente) {
    throw new Error('Código de projeto já existe');
  }
  
  // Criar projeto
  const { data: projeto, error } = await supabase
    .from('projetos_sb')
    .insert({
      nome_projeto,
      codigo_projeto,
      incorporadora_id,
      broker_master_id,
      total_projetos,
      unidades_por_projeto,
      endereco_principal,
      cidade,
      estado,
      valor_medio_unidade,
      status_projeto: 'planejamento',
      data_inicio_planejamento: new Date().toISOString().split('T')[0]
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao criar projeto: ${error.message}`);
  }
  
  // Criar unidades automaticamente
  const unidades = [];
  for (let i = 1; i <= total_projetos * unidades_por_projeto; i++) {
    unidades.push({
      projeto_id: projeto.id,
      numero_unidade: `U${String(i).padStart(4, '0')}`,
      tipo_unidade: 'apartamento',
      torre: `T${Math.ceil(i / unidades_por_projeto)}`,
      andar: ((i - 1) % unidades_por_projeto) + 1,
      area_util: 80.0 + (i % 20) * 5, // Variação de área
      area_total: 90.0 + (i % 20) * 5,
      quartos: 2 + (i % 3),
      banheiros: 1 + (i % 2),
      vagas: 1 + (i % 2),
      valor_venda: valor_medio_unidade + (Math.random() - 0.5) * 100000,
      status_unidade: 'disponivel'
    });
  }
  
  // Inserir unidades em lote
  const { data: unidadesInseridas } = await supabase
    .from('unidades_projetos')
    .insert(unidades)
    .select('id');
  
  // Criar notificação
  await supabase
    .from('notificacoes')
    .insert({
      broker_id: broker_master_id,
      tipo: 'ecossistema_total',
      titulo: 'Projeto Criado',
      mensagem: `Projeto ${nome_projeto} criado com ${unidades.length} unidades`,
      status: 'nao_lida'
    });
  
  return {
    id: projeto.id,
    nome_projeto: projeto.nome_projeto,
    codigo_projeto: projeto.codigo_projeto,
    total_unidades: projeto.total_unidades,
    valor_total_estimado: projeto.valor_total_estimado,
    status_projeto: projeto.status_projeto
  };
}

async function venderUnidade(dados: any): Promise<EcossistemaTotalResponse['unidade_vendida']> {
  const { unidade_id, captador_id, parceiro_id, vendedor_id, cliente_id, valor_venda, comissao_percentual } = dados;
  
  // Validar dados obrigatórios
  if (!unidade_id || !valor_venda || !comissao_percentual) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Buscar unidade
  const { data: unidade, error: errorUnidade } = await supabase
    .from('unidades_projetos')
    .select('*')
    .eq('id', unidade_id)
    .single();
  
  if (errorUnidade || !unidade) {
    throw new Error('Unidade não encontrada');
  }
  
  // Calcular comissão total
  const comissaoTotal = valor_venda * (comissao_percentual / 100);
  
  // Atualizar unidade
  const { data: unidadeAtualizada, error: errorAtualizacao } = await supabase
    .from('unidades_projetos')
    .update({
      valor_venda,
      comissao_total: comissaoTotal,
      captador_id,
      parceiro_id,
      vendedor_id,
      cliente_id,
      status_unidade: 'vendido',
      data_venda: new Date().toISOString()
    })
    .eq('id', unidade_id)
    .select('*')
    .single();
  
  if (errorAtualizacao) {
    throw new Error(`Erro ao vender unidade: ${errorAtualizacao.message}`);
  }
  
  // Criar monetização de captação (10%)
  if (captador_id) {
    await supabase
      .from('monetizacao_captacao')
      .insert({
        broker_id: captador_id,
        unidade_id,
        data_captacao: new Date().toISOString().split('T')[0],
        tipo_captacao: 'match',
        valor_captacao: valor_venda,
        status_captacao: 'concluida',
        data_conclusao: new Date().toISOString().split('T')[0]
      });
  }
  
  // Criar monetização de venda (40%)
  if (vendedor_id) {
    await supabase
      .from('monetizacao_venda')
      .insert({
        broker_id: vendedor_id,
        unidade_id,
        data_venda: new Date().toISOString().split('T')[0],
        valor_venda,
        status_venda: 'concluida',
        data_conclusao: new Date().toISOString().split('T')[0],
        eh_match: true
      });
  }
  
  return {
    id: unidadeAtualizada.id,
    valor_venda: unidadeAtualizada.valor_venda,
    comissao_total: unidadeAtualizada.comissao_total,
    split_distribuicao: {
      captador: unidadeAtualizada.captador_parte,
      parceiro: unidadeAtualizada.parceiro_parte,
      vendedor: unidadeAtualizada.vendedor_parte,
      sb_system: unidadeAtualizada.sb_system_parte
    },
    retencao_70_30: {
      comissoes_80_percent: unidadeAtualizada.comissoes_80_percent,
      taxa_sb_20_percent: unidadeAtualizada.taxa_sb_20_percent,
      taxa_sb_70_percent: unidadeAtualizada.taxa_sb_70_percent,
      taxa_sb_30_percent: unidadeAtualizada.taxa_sb_30_percent
    },
    status_disponibilidade: unidadeAtualizada.status_disponibilidade
  };
}

async function calcularRecorrencia(dados: any): Promise<EcossistemaTotalResponse['projecao_recorrencia']> {
  const { broker_id, mes_referencia } = dados;
  
  // Validar dados obrigatórios
  if (!broker_id || !mes_referencia) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Calcular projeção de recorrência
  const { data: projecao, error } = await supabase
    .rpc('calcular_projecao_recorrencia_mensal', {
      p_broker_id: broker_id,
      p_mes_referencia: mes_referencia
    });
  
  if (error) {
    throw new Error(`Erro ao calcular projeção: ${error.message}`);
  }
  
  return projecao;
}

async function auditoriaStress(dados: any): Promise<EcossistemaTotalResponse['auditoria_stress']> {
  const { escala_projetos, unidades_por_projeto } = dados;
  
  // Validar dados obrigatórios
  if (!escala_projetos || !unidades_por_projeto) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Executar auditoria de stress
  const { data: auditoria, error } = await supabase
    .rpc('auditoria_stress_escala', {
      p_escala_projetos: escala_projetos,
      p_unidades_por_projeto: unidades_por_projeto
    });
  
  if (error) {
    throw new Error(`Erro na auditoria de stress: ${error.message}`);
  }
  
  return auditoria;
}

async function consultarDashboard(dados: any): Promise<EcossistemaTotalResponse['dashboard_ecossistema']> {
  // Buscar dashboard do ecossistema
  const { data: dashboard, error } = await supabase
    .from('dashboard_ecossistema_total')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    throw new Error(`Erro ao consultar dashboard: ${error.message}`);
  }
  
  return {
    total_projetos: dashboard.total_projetos || 0,
    total_unidades: dashboard.total_unidades || 0,
    total_vendidas: dashboard.total_vendidas || 0,
    valor_total_vendas: dashboard.valor_total_vendas || 0,
    valor_total_comissoes: dashboard.valor_total_comissoes || 0,
    total_matches: dashboard.total_matches || 0,
    total_recorrencias: dashboard.total_recorrencias || 0,
    total_marketplace: dashboard.total_marketplace || 0,
    total_landbanking: dashboard.total_landbanking || 0,
    total_fundo_investimentos: dashboard.total_fundo_investimentos || 0,
    total_mentorias: dashboard.total_mentorias || 0,
    total_selos_juris: dashboard.total_selos_juris || 0,
    total_data_intelligence: dashboard.total_data_intelligence || 0,
    total_anticipacoes: dashboard.total_anticipacoes || 0
  };
}

// Endpoint para consultar monetização
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    
    if (tipo === 'monetizacao') {
      return await consultarMonetizacao();
    }
    
    if (tipo === 'compliance') {
      return await consultarCompliance();
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

async function consultarMonetizacao(): Promise<NextResponse> {
  // Buscar monetização consolidada
  const { data: monetizacao } = await supabase
    .from('monetizacao_consolidada')
    .select('*');
  
  return NextResponse.json({
    success: true,
    data: monetizacao,
    message: 'Monetização consultada com sucesso'
  });
}

async function consultarCompliance(): Promise<NextResponse> {
  // Buscar dados de compliance
  const { data: travaCpf } = await supabase
    .from('trava_cpf')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  const { data: nexoCausal } = await supabase
    .from('nexo_causal')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  const { data: radar5km } = await supabase
    .from('radar_5km')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  return NextResponse.json({
    success: true,
    data: {
      trava_cpf: travaCpf || [],
      nexo_causal: nexoCausal || [],
      radar_5km: radar5km || []
    },
    message: 'Compliance consultado com sucesso'
  });
}
