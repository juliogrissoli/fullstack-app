// 🏛️ SECURITY BROKER SB v24 - IMOBILIÁRIA & FINTECH
// API de Gestão Privada para Imobiliárias e Comissionamento Bancário

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface GestaoImobiliariaRequest {
  acao: 'criar_imobiliaria' | 'configurar_split_interno' | 'distribuir_lead' | 'registrar_financiamento' | 'calcular_royalties' | 'consultar_dashboard';
  dados?: {
    nome_fantasia?: string;
    razao_social?: string;
    cnpj?: string;
    telefone?: string;
    email?: string;
    cidade?: string;
    estado?: string;
    faturamento_mensal?: number;
    royalty_tecnologia_percent?: number;
    limite_verba_marketing?: number;
    imobiliaria_id?: string;
    nome_configuracao?: string;
    corretor_vendedor_percent?: number;
    corretor_captador_percent?: number;
    gerente_comercial_percent?: number;
    imobiliaria_gestao_percent?: number;
    fundo_marketing_percent?: number;
    lead_id?: string;
    broker_id?: string;
    banco_origem?: string;
    valor_financiado?: number;
    comissao_originador_percent?: number;
    imobiliaria_percent?: number;
    corretor_percent?: number;
    sb_tecnologia_percent?: number;
    mes_referencia?: string;
  };
}

interface GestaoImobiliariaResponse {
  success: boolean;
  imobiliaria_criada?: {
    id: string;
    nome_fantasia: string;
    razao_social: string;
    cnpj: string;
    status_imobiliaria: string;
    royalty_tecnologia_percent: number;
    data_contrato: string;
  };
  split_configurado?: {
    id: string;
    nome_configuracao: string;
    split_distribuicao: {
      corretor_vendedor: number;
      corretor_captador: number;
      gerente_comercial: number;
      imobiliaria_gestao: number;
      fundo_marketing: number;
    };
    total_percentual: number;
    status_configuracao: string;
  };
  lead_distribuido?: {
    lead_id: string;
    broker_selecionado: string;
    metodo_distribuicao: string;
    data_distribuicao: string;
  };
  financiamento_registrado?: {
    id: string;
    banco_origem: string;
    valor_financiado: number;
    valor_comissao_total: number;
    split_distribuicao: {
      imobiliaria: number;
      corretor: number;
      sb_tecnologia: number;
    };
    status_financiamento: string;
  };
  royalties_calculados?: {
    faturamento_total: number;
    faturamento_tecnologia: number;
    royalty_percent: number;
    valor_royalty: number;
    mes_referencia: string;
  };
  dashboard_imobiliaria?: {
    total_corretores_vinculados: number;
    corretores_ativos: number;
    total_entradas_mes: number;
    total_saidas_mes: number;
    saldo_liquido_mes: number;
    margem_lucro_mes: number;
    total_leads_mes: number;
    leads_convertidos_mes: number;
    total_financiamentos: number;
    total_comissoes_financiamento: number;
    total_royalties_pagos: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: GestaoImobiliariaRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🏛️ Gestão Imobiliária: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'criar_imobiliaria':
        resultado = await criarImobiliaria(dados);
        break;
      case 'configurar_split_interno':
        resultado = await configurarSplitInterno(dados);
        break;
      case 'distribuir_lead':
        resultado = await distribuirLead(dados);
        break;
      case 'registrar_financiamento':
        resultado = await registrarFinanciamento(dados);
        break;
      case 'calcular_royalties':
        resultado = await calcularRoyalties(dados);
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
    console.error('Erro na Gestão Imobiliária:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno na Gestão Imobiliária',
      details: error.message
    }, { status: 500 });
  }
}

async function criarImobiliaria(dados: any): Promise<GestaoImobiliariaResponse['imobiliaria_criada']> {
  const { nome_fantasia, razao_social, cnpj, telefone, email, cidade, estado, faturamento_mensal, royalty_tecnologia_percent, limite_verba_marketing } = dados;
  
  // Validar dados obrigatórios
  if (!nome_fantasia || !razao_social || !cnpj || !cidade || !estado) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Validar CNPJ
  if (cnpj.length !== 18) {
    throw new Error('CNPJ inválido');
  }
  
  // Validar royalty (6% a 10%)
  if (royalty_tecnologia_percent < 6 || royalty_tecnologia_percent > 10) {
    throw new Error('Royalty tecnológico deve estar entre 6% e 10%');
  }
  
  // Verificar se CNPJ já existe
  const { data: imobiliariaExistente } = await supabase
    .from('imobiliarias_parceiras')
    .select('*')
    .eq('cnpj', cnpj)
    .single();
  
  if (imobiliariaExistente) {
    throw new Error('CNPJ já cadastrado');
  }
  
  // Criar imobiliária
  const { data: imobiliaria, error } = await supabase
    .from('imobiliarias_parceiras')
    .insert({
      nome_fantasia,
      razao_social,
      cnpj,
      telefone,
      email,
      cidade,
      estado,
      faturamento_mensal: faturamento_mensal || 0,
      royalty_tecnologia_percent: royalty_tecnologia_percent || 8.0,
      limite_verba_marketing: limite_verba_marketing || 0,
      status_imobiliaria: 'ativa',
      data_contrato: new Date().toISOString().split('T')[0],
      data_inicio_operacao: new Date().toISOString().split('T')[0]
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao criar imobiliária: ${error.message}`);
  }
  
  // Criar configuração de split padrão
  await supabase
    .from('split_interno_imobiliaria')
    .insert({
      imobiliaria_id: imobiliaria.id,
      nome_configuracao: 'Padrão SB',
      corretor_vendedor_percent: 60.0,
      corretor_captador_percent: 10.0,
      gerente_comercial_percent: 5.0,
      imobiliaria_gestao_percent: 20.0,
      fundo_marketing_percent: 5.0,
      status_configuracao: 'ativa',
      data_vigencia_inicio: new Date().toISOString().split('T')[0]
    });
  
  // Criar configuração da roleta Yara padrão
  await supabase
    .from('configuracao_roleta_yara')
    .insert({
      imobiliaria_id: imobiliaria.id,
      nome_configuracao: 'Configuração Padrão',
      peso_score_performance: 40.0,
      peso_tempo_resposta: 30.0,
      peso_taxa_conversao: 20.0,
      peso_disponibilidade: 10.0,
      maximo_leads_por_corretor: 10,
      maximo_leads_dia: 50,
      status_configuracao: 'ativa'
    });
  
  return {
    id: imobiliaria.id,
    nome_fantasia: imobiliaria.nome_fantasia,
    razao_social: imobiliaria.razao_social,
    cnpj: imobiliaria.cnpj,
    status_imobiliaria: imobiliaria.status_imobiliaria,
    royalty_tecnologia_percent: imobiliaria.royalty_tecnologia_percent,
    data_contrato: imobiliaria.data_contrato
  };
}

async function configurarSplitInterno(dados: any): Promise<GestaoImobiliariaResponse['split_configurado']> {
  const { imobiliaria_id, nome_configuracao, corretor_vendedor_percent, corretor_captador_percent, gerente_comercial_percent, imobiliaria_gestao_percent, fundo_marketing_percent } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id || !nome_configuracao || corretor_vendedor_percent === undefined || imobiliaria_gestao_percent === undefined) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Validar total do split (deve ser 100%)
  const totalPercentual = (corretor_vendedor_percent || 0) + (corretor_captador_percent || 0) + (gerente_comercial_percent || 0) + imobiliaria_gestao_percent + (fundo_marketing_percent || 0);
  
  if (Math.abs(totalPercentual - 100) > 0.01) {
    throw new Error('A soma dos percentuais deve ser exatamente 100%');
  }
  
  // Criar configuração de split
  const { data: split, error } = await supabase
    .from('split_interno_imobiliaria')
    .insert({
      imobiliaria_id,
      nome_configuracao,
      corretor_vendedor_percent,
      corretor_captador_percent: corretor_captador_percent || 0,
      gerente_comercial_percent: gerente_comercial_percent || 0,
      imobiliaria_gestao_percent,
      fundo_marketing_percent: fundo_marketing_percent || 0,
      status_configuracao: 'ativa',
      data_vigencia_inicio: new Date().toISOString().split('T')[0]
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao configurar split: ${error.message}`);
  }
  
  return {
    id: split.id,
    nome_configuracao: split.nome_configuracao,
    split_distribuicao: {
      corretor_vendedor: split.corretor_vendedor_percent,
      corretor_captador: split.corretor_captador_percent,
      gerente_comercial: split.gerente_comercial_percent,
      imobiliaria_gestao: split.imobiliaria_gestao_percent,
      fundo_marketing: split.fundo_marketing_percent
    },
    total_percentual: split.total_percentual,
    status_configuracao: split.status_configuracao
  };
}

async function distribuirLead(dados: any): Promise<GestaoImobiliariaResponse['lead_distribuido']> {
  const { lead_id, imobiliaria_id } = dados;
  
  // Validar dados obrigatórios
  if (!lead_id || !imobiliaria_id) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Distribuir lead via roleta Yara
  const { data: resultado, error } = await supabase
    .rpc('distribuir_lead_roleta_yara', {
      p_lead_id: lead_id,
      p_imobiliaria_id: imobiliaria_id
    });
  
  if (error) {
    throw new Error(`Erro ao distribuir lead: ${error.message}`);
  }
  
  if (resultado.erro) {
    throw new Error(resultado.erro);
  }
  
  return {
    lead_id: resultado.lead_id,
    broker_selecionado: resultado.broker_selecionado,
    metodo_distribuicao: resultado.metodo_distribuicao,
    data_distribuicao: resultado.data_distribuicao
  };
}

async function registrarFinanciamento(dados: any): Promise<GestaoImobiliariaResponse['financiamento_registrado']> {
  const { imovel_id, cliente_id, broker_id, imobiliaria_id, banco_origem, valor_financiado, comissao_originador_percent, imobiliaria_percent, corretor_percent, sb_tecnologia_percent } = dados;
  
  // Validar dados obrigatórios
  if (!imovel_id || !cliente_id || !broker_id || !imobiliaria_id || !banco_origem || !valor_financiado || !comissao_originador_percent) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Validar split da comissão (deve ser 100%)
  const totalSplit = (imobiliaria_percent || 40) + (corretor_percent || 40) + (sb_tecnologia_percent || 20);
  
  if (Math.abs(totalSplit - 100) > 0.01) {
    throw new Error('A soma dos percentuais do split deve ser exatamente 100%');
  }
  
  // Registrar financiamento
  const { data: financiamento, error } = await supabase
    .from('comissoes_financiamento')
    .insert({
      imovel_id,
      cliente_id,
      broker_id,
      imobiliaria_id,
      banco_origem,
      data_contrato: new Date().toISOString().split('T')[0],
      valor_financiado,
      comissao_originador_percent,
      imobiliaria_percent: imobiliaria_percent || 40.0,
      corretor_percent: corretor_percent || 40.0,
      sb_tecnologia_percent: sb_tecnologia_percent || 20.0,
      status_financiamento: 'pendente',
      status_comissao: 'pendente'
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao registrar financiamento: ${error.message}`);
  }
  
  // Registrar cashflow de entrada (comissão esperada)
  await supabase
    .from('cashflow_imobiliaria')
    .insert({
      imobiliaria_id,
      data_transacao: new Date().toISOString().split('T')[0],
      tipo_transacao: 'entrada',
      categoria_transacao: 'comissao',
      descricao: `Comissão de financiamento - ${banco_origem}`,
      referencia_id: financiamento.id,
      referencia_tipo: 'comissao_bancaria',
      valor_transacao: financiamento.valor_comissao_total,
      centro_custo: 'vendas',
      status_transacao: 'pendente'
    });
  
  return {
    id: financiamento.id,
    banco_origem: financiamento.banco_origem,
    valor_financiado: financiamento.valor_financiado,
    valor_comissao_total: financiamento.valor_comissao_total,
    split_distribuicao: {
      imobiliaria: financiamento.valor_imobiliaria,
      corretor: financiamento.valor_corretor,
      sb_tecnologia: financiamento.valor_sb_tecnologia
    },
    status_financiamento: financiamento.status_financiamento
  };
}

async function calcularRoyalties(dados: any): Promise<GestaoImobiliariaResponse['royalties_calculados']> {
  const { imobiliaria_id, mes_referencia } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id || !mes_referencia) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Calcular royalties tecnológicos
  const { data: resultado, error } = await supabase
    .rpc('calcular_royalties_tecnologicos', {
      p_imobiliaria_id: imobiliaria_id,
      p_mes_referencia: mes_referencia
    });
  
  if (error) {
    throw new Error(`Erro ao calcular royalties: ${error.message}`);
  }
  
  if (resultado.erro) {
    throw new Error(resultado.erro);
  }
  
  // Registrar cashflow de saída (royalties)
  if (resultado.valor_royalty > 0) {
    await supabase
      .from('cashflow_imobiliaria')
      .insert({
        imobiliaria_id,
        data_transacao: new Date().toISOString().split('T')[0],
        tipo_transacao: 'saida',
        categoria_transacao: 'royalty',
        descricao: `Royalty tecnológico - ${mes_referencia}`,
        valor_transacao: resultado.valor_royalty,
        centro_custo: 'tecnologia',
        status_transacao: 'pendente'
      });
  }
  
  return {
    faturamento_total: resultado.faturamento_total,
    faturamento_tecnologia: resultado.faturamento_tecnologia,
    royalty_percent: resultado.royalty_percent,
    valor_royalty: resultado.valor_royalty,
    mes_referencia: resultado.mes_referencia
  };
}

async function consultarDashboard(dados: any): Promise<GestaoImobiliariaResponse['dashboard_imobiliaria']> {
  const { imobiliaria_id } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id) {
    throw new Error('ID da imobiliária não fornecido');
  }
  
  // Buscar dashboard da imobiliária
  const { data: dashboard, error } = await supabase
    .from('dashboard_imobiliaria')
    .select('*')
    .eq('id', imobiliaria_id)
    .single();
  
  if (error) {
    throw new Error(`Erro ao consultar dashboard: ${error.message}`);
  }
  
  return {
    total_corretores_vinculados: dashboard.total_corretores_vinculados || 0,
    corretores_ativos: dashboard.corretores_ativos || 0,
    total_entradas_mes: dashboard.total_entradas_mes || 0,
    total_saidas_mes: dashboard.total_saidas_mes || 0,
    saldo_liquido_mes: dashboard.saldo_liquido_mes || 0,
    margem_lucro_mes: dashboard.margem_lucro_mes || 0,
    total_leads_mes: dashboard.total_leads_mes || 0,
    leads_convertidos_mes: dashboard.leads_convertidos_mes || 0,
    total_financiamentos: dashboard.total_financiamentos || 0,
    total_comissoes_financiamento: dashboard.total_comissoes_financiamento || 0,
    total_royalties_pagos: dashboard.total_royalties_pagos || 0
  };
}

// Endpoint para consultas específicas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const imobiliaria_id = searchParams.get('imobiliaria_id');
    
    if (tipo === 'performance_corretores' && imobiliaria_id) {
      return await consultarPerformanceCorretores(imobiliaria_id);
    }
    
    if (tipo === 'cashflow' && imobiliaria_id) {
      return await consultarCashflow(imobiliaria_id);
    }
    
    if (tipo === 'leads' && imobiliaria_id) {
      return await consultarLeads(imobiliaria_id);
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

async function consultarPerformanceCorretores(imobiliariaId: string): Promise<NextResponse> {
  // Buscar performance de corretores
  const { data: performance } = await supabase
    .from('performance_corretores_imobiliaria')
    .select('*')
    .eq('imobiliaria_id', imobiliariaId)
    .order('score_final', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: performance,
    message: 'Performance de corretores consultada com sucesso'
  });
}

async function consultarCashflow(imobiliariaId: string): Promise<NextResponse> {
  // Buscar cashflow do mês atual
  const mesAtual = new Date().toISOString().split('T')[0].substring(0, 7);
  
  const { data: cashflow } = await supabase
    .from('cashflow_imobiliaria')
    .select('*')
    .eq('imobiliaria_id', imobiliariaId)
    .like('data_transacao', `${mesAtual}%`)
    .order('data_transacao', { ascending: false });
  
  // Buscar resumo mensal
  const { data: resumo } = await supabase
    .from('resumo_cashflow_mensal')
    .select('*')
    .eq('imobiliaria_id', imobiliariaId)
    .eq('mes_referencia', `${mesAtual}-01`)
    .single();
  
  return NextResponse.json({
    success: true,
    data: {
      transacoes: cashflow || [],
      resumo_mensal: resumo
    },
    message: 'Cashflow consultado com sucesso'
  });
}

async function consultarLeads(imobiliariaId: string): Promise<NextResponse> {
  // Buscar leads do mês
  const mesAtual = new Date().toISOString().split('T')[0].substring(0, 7);
  
  const { data: leads } = await supabase
    .from('leads_imobiliaria')
    .select(`
      *,
      brokers!inner(nome)
    `)
    .eq('imobiliaria_id', imobiliariaId)
    .like('data_captacao', `${mesAtual}%`)
    .order('data_captacao', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: leads,
    message: 'Leads consultados com sucesso'
  });
}
