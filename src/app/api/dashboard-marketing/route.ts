// 🏛️ SECURITY BROKER SB v14 - DASHBOARD DE RASTREABILIDADE DE MARKETING
// Origem do Lead, Custo por Conversão, Transparência de Aporte

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

interface DashboardMarketingRequest {
  incorporadora_id: string;
  periodo: {
    data_inicio: string;
    data_fim: string;
  };
  filtros?: {
    fonte_trafego_id?: string;
    status_conversao?: string;
    campanha?: string;
  };
}

interface DashboardMarketingResponse {
  success: boolean;
  resumo_geral?: {
    total_investido: number;
    total_leads: number;
    leads_qualificados: number;
    pastas_100: number;
    total_vendas: number;
    roi_percentual: number;
    custo_por_lead: number;
    custo_por_conversao: number;
    taxa_conversao: number;
  };
  desempenho_fontes?: Array<{
    fonte_id: string;
    fonte_nome: string;
    fonte_tipo: string;
    total_leads: number;
    leads_qualificados: number;
    pastas_100: number;
    convertidos: number;
    custo_total: number;
    roi_percentual: number;
    eficiencia: number;
  }>;
  extrato_verba?: Array<{
    data_movimento: string;
    tipo_movimento: string;
    categoria: string;
    valor: number;
    saldo_anterior: number;
    saldo_posterior: number;
    descricao: string;
  }>;
  tendencias?: {
    leads_ultimos_30_dias: Array<{ data: string; total: number }>;
    conversao_ultimos_30_dias: Array<{ data: string; taxa: number }>;
    roi_ultimos_6_meses: Array<{ mes: string; roi: number }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: DashboardMarketingRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!body.incorporadora_id || !body.periodo) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }

    // Executar análise do dashboard
    const resultado = await gerarDashboardMarketing(body);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Dashboard de marketing gerado com sucesso'
    });

  } catch (error: any) {
    console.error('Erro no Dashboard de Marketing:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Dashboard de Marketing',
      details: error.message
    }, { status: 500 });
  }
}

async function gerarDashboardMarketing(request: DashboardMarketingRequest): Promise<DashboardMarketingResponse> {
  const { incorporadora_id, periodo, filtros } = request;
  
  // 1. Calcular ROI de Marketing usando função SQL
  const { data: roiData, error: errorROI } = await supabase
    .rpc('calcular_roi_marketing', {
      p_incorporadora_id: incorporadora_id,
      p_data_inicio: periodo.data_inicio,
      p_data_fim: periodo.data_fim
    });
  
  if (errorROI) {
    throw new Error(`Erro ao calcular ROI: ${errorROI.message}`);
  }
  
  const roiDataParsed = Array.isArray(roiData) ? roiData[0] : roiData;
  
  // 2. Buscar desempenho por fonte de tráfego
  let queryFontes = supabase
    .from('dashboard_marketing')
    .select('*')
    .eq('incorporadora_id', incorporadora_id);
  
  if (filtros?.fonte_trafego_id) {
    queryFontes = queryFontes.eq('fonte_trafego_id', filtros.fonte_trafego_id);
  }
  
  const { data: desempenhoFontes, error: errorFontes } = await queryFontes;
  
  if (errorFontes) {
    throw new Error(`Erro ao buscar desempenho por fonte: ${errorFontes.message}`);
  }
  
  // 3. Buscar extrato de verba
  let queryExtrato = supabase
    .from('extrato_verba')
    .select('*')
    .eq('incorporadora_id', incorporadora_id)
    .gte('data_movimento', periodo.data_inicio)
    .lte('data_movimento', periodo.data_fim)
    .order('data_movimento', { ascending: false });
  
  if (filtros?.campanha) {
    queryExtrato = queryExtrato.like('descricao', `%${filtros.campanha}%`);
  }
  
  const { data: extratoVerba, error: errorExtrato } = await queryExtrato;
  
  if (errorExtrato) {
    throw new Error(`Erro ao buscar extrato de verba: ${errorExtrato.message}`);
  }
  
  // 4. Gerar tendências
  const tendencias = await gerarTendencias(incorporadora_id, periodo);
  
  // 5. Calcular eficiência das fontes
  const fontesComEficiencia = (desempenhoFontes || []).map(fonte => ({
    ...fonte,
    eficiencia: calcularEficienciaFonte(fonte)
  })).sort((a, b) => b.eficiencia - a.eficiencia);
  
  return {
    success: true,
    resumo_geral: {
      total_investido: roiDataParsed?.investimento?.total_investido || 0,
      total_leads: roiDataParsed?.metricas?.total_leads || 0,
      leads_qualificados: roiDataParsed?.metricas?.leads_qualificados || 0,
      pastas_100: roiDataParsed?.metricas?.pastas_100 || 0,
      total_vendas: roiDataParsed?.metricas?.total_vendas || 0,
      roi_percentual: roiDataParsed?.performance?.roi_percentual || 0,
      custo_por_lead: roiDataParsed?.performance?.custo_por_lead || 0,
      custo_por_conversao: roiDataParsed?.performance?.custo_por_conversao || 0,
      taxa_conversao: roiDataParsed?.performance?.taxa_conversao || 0
    },
    desempenho_fontes: fontesComEficiencia,
    extrato_verba: extratoVerba || [],
    tendencias
  };
}

function calcularEficienciaFonte(fonte: any): number {
  // Cálculo de eficiência baseado em múltiplos fatores
  let eficiencia = 0;
  
  // Fator 1: Taxa de conversão (40%)
  const taxaConversao = fonte.total_leads > 0 ? (fonte.pastas_100 / fonte.total_leads) * 100 : 0;
  eficiencia += taxaConversao * 0.4;
  
  // Fator 2: ROI (30%)
  eficiencia += Math.min(fonte.roi_percentual, 100) * 0.3;
  
  // Fator 3: Custo por lead invertido (20%)
  const custoPorLeadNormalizado = Math.max(0, 100 - (fonte.custo_medio / 100)); // Inverter para maior eficiência com menor custo
  eficiencia += custoPorLeadNormalizado * 0.2;
  
  // Fator 4: Volume de leads (10%)
  const volumeNormalizado = Math.min(fonte.total_leads / 10, 100); // Normalizar para 100
  eficiencia += volumeNormalizado * 0.1;
  
  return Math.round(eficiencia * 100) / 100;
}

async function gerarTendencias(incorporadora_id: string, periodo: any): Promise<DashboardMarketingResponse['tendencias']> {
  const dataInicio = new Date(periodo.data_inicio);
  const dataFim = new Date(periodo.data_fim);
  
  // 1. Leads dos últimos 30 dias
  const data30DiasAtras = new Date(dataFim);
  data30DiasAtras.setDate(data30DiasAtras.getDate() - 30);
  
  const { data: leads30Dias } = await supabase
    .from('rastreabilidade_marketing')
    .select('data_primeiro_contato')
    .eq('incorporadora_id', incorporadora_id)
    .gte('data_primeiro_contato', data30DiasAtras.toISOString())
    .lte('data_primeiro_contato', dataFim.toISOString())
    .order('data_primeiro_contato');
  
  // Agrupar leads por dia
  const leadsPorDia = agruparDadosPorDia(leads30Dias || [], 'data_primeiro_contato');
  
  // 2. Taxa de conversão dos últimos 30 dias
  const { data: conversao30Dias } = await supabase
    .from('rastreabilidade_marketing')
    .select('data_primeiro_contato, status_conversao')
    .eq('incorporadora_id', incorporadora_id)
    .gte('data_primeiro_contato', data30DiasAtras.toISOString())
    .lte('data_primeiro_contato', dataFim.toISOString());
  
  const conversaoPorDia = calcularTaxaConversaoPorDia(conversao30Dias || []);
  
  // 3. ROI dos últimos 6 meses
  const roi6Meses = [];
  for (let i = 0; i < 6; i++) {
    const mesInicio = new Date(dataFim);
    mesInicio.setMonth(mesInicio.getMonth() - i);
    mesInicio.setDate(1);
    
    const mesFim = new Date(mesInicio);
    mesFim.setMonth(mesFim.getMonth() + 1);
    mesFim.setDate(0);
    
    const { data: roiMes } = await supabase
      .rpc('calcular_roi_marketing', {
        p_incorporadora_id: incorporadora_id,
        p_data_inicio: mesInicio.toISOString().split('T')[0],
        p_data_fim: mesFim.toISOString().split('T')[0]
      });
    
    const roiMesData = Array.isArray(roiMes) ? roiMes[0] : roiMes;
    
    roi6Meses.push({
      mes: mesInicio.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
      roi: roiMesData?.performance?.roi_percentual || 0
    });
  }
  
  return {
    leads_ultimos_30_dias: leadsPorDia,
    conversao_ultimos_30_dias: conversaoPorDia,
    roi_ultimos_6_meses: roi6Meses.reverse()
  };
}

function agruparDadosPorDia(dados: any[], campoData: string): Array<{ data: string; total: number }> {
  const agrupado = new Map<string, number>();
  
  dados.forEach(item => {
    const data = new Date(item[campoData]).toISOString().split('T')[0];
    agrupado.set(data, (agrupado.get(data) || 0) + 1);
  });
  
  return Array.from(agrupado.entries())
    .map(([data, total]) => ({ data, total }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

function calcularTaxaConversaoPorDia(dados: any[]): Array<{ data: string; taxa: number }> {
  const agrupado = new Map<string, { total: number; convertidos: number }>();
  
  dados.forEach(item => {
    const data = new Date(item.data_primeiro_contato).toISOString().split('T')[0];
    const atual = agrupado.get(data) || { total: 0, convertidos: 0 };
    
    atual.total += 1;
    if (item.status_conversao === 'pasta_100' || item.status_conversao === 'convertido') {
      atual.convertidos += 1;
    }
    
    agrupado.set(data, atual);
  });
  
  return Array.from(agrupado.entries())
    .map(([data, { total, convertidos }]) => ({
      data,
      taxa: total > 0 ? Math.round((convertidos / total) * 100 * 100) / 100 : 0
    }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

// Endpoint para consultar fontes de tráfego
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const incorporadora_id = searchParams.get('incorporadora_id');
    
    if (!incorporadora_id) {
      return NextResponse.json({
        success: false,
        error: 'incorporadora_id é obrigatório'
      }, { status: 400 });
    }
    
    // Buscar fontes de tráfego disponíveis
    const { data: fontes, error: errorFontes } = await supabase
      .from('fontes_trafego')
      .select('*')
      .eq('status', 'ativa');
    
    if (errorFontes) {
      throw new Error(`Erro ao buscar fontes de tráfego: ${errorFontes.message}`);
    }
    
    // Buscar desempenho recente
    const { data: desempenhoRecente, error: errorDesempenho } = await supabase
      .from('dashboard_marketing')
      .select('*')
      .eq('incorporadora_id', incorporadora_id)
      .order('roi_percentual', { ascending: false })
      .limit(5);
    
    if (errorDesempenho) {
      throw new Error(`Erro ao buscar desempenho recente: ${errorDesempenho.message}`);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        fontes: fontes || [],
        desempenho_recente: desempenhoRecente || []
      },
      message: 'Dados de marketing consultados com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar dados de marketing:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar dados',
      details: error.message
    }, { status: 500 });
  }
}
