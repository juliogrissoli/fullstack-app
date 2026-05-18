// 🏛️ SECURITY BROKER SB v14 - LOGS IMUTÁVEIS DE GOVERNANÇA
// Logs imutáveis de cada centavo e cada lead com rastreabilidade completa

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { createHash } from 'crypto';

interface LogsGovernancaRequest {
  tipo_registro: 'centavo' | 'lead' | 'transacao' | 'decisao';
  entidade_id: string;
  entidade_tabela: string;
  acao: 'create' | 'update' | 'delete' | 'approve' | 'reject';
  dados_anteriores?: any;
  dados_novos?: any;
  valor_movimentado?: number;
  motivo?: string;
}

interface LogsGovernancaResponse {
  success: boolean;
  log_criado?: {
    id: string;
    hash_imutavel: string;
    tipo_registro: string;
    entidade_id: string;
    acao: string;
    valor_movimentado: number;
    data_registro: string;
    ip_address: string;
    usuario_id: string;
  };
  auditoria?: Array<{
    id: string;
    tipo_registro: string;
    entidade_id: string;
    acao: string;
    valor_movimentado: number;
    data_registro: string;
    hash_imutavel: string;
    usuario: string;
    detalhes: any;
  }>;
  relatorio?: {
    total_registros: number;
    total_centavos: number;
    total_leads: number;
    total_transacoes: number;
    total_decisoes: number;
    valor_total_movimentado: number;
    periodo_analise: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: LogsGovernancaRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!body.tipo_registro || !body.entidade_id || !body.entidade_tabela || !body.acao) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }

    // Criar log de governança
    const resultado = await criarLogGovernanca(body, request);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Log de governança criado com sucesso'
    });

  } catch (error: any) {
    console.error('Erro nos Logs de Governança:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno nos Logs de Governança',
      details: error.message
    }, { status: 500 });
  }
}

async function criarLogGovernanca(request: LogsGovernancaRequest, httpRequest: NextRequest): Promise<LogsGovernancaResponse['log_criado']> {
  const { tipo_registro, entidade_id, entidade_tabela, acao, dados_anteriores, dados_novos, valor_movimentado, motivo } = request;
  
  // Obter IP e User-Agent
  const ipAddress = httpRequest.headers.get('x-forwarded-for') || 
                    httpRequest.headers.get('x-real-ip') || 
                    '127.0.0.1';
  const userAgent = httpRequest.headers.get('user-agent') || 'SB Sistema';
  
  // Obter usuário_id do token (simulação - em produção usar autenticação real)
  const usuario_id = httpRequest.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000000';
  
  // Criar hash imutável
  const hashImutavel = gerarHashImutavel({
    tipo_registro,
    entidade_id,
    entidade_tabela,
    acao,
    valor_movimentado: valor_movimentado || 0,
    timestamp: new Date().toISOString(),
    ip_address: ipAddress,
    usuario_id
  });
  
  // Inserir log de governança
  const { data, error } = await supabase
    .from('logs_governanca')
    .insert({
      tipo_registro,
      entidade_id,
      entidade_tabela,
      acao,
      dados_anteriores,
      dados_novos,
      valor_movimentado: valor_movimentado || 0,
      ip_address: ipAddress,
      user_agent: userAgent,
      usuario_id,
      hash_imutavel: hashImutavel
    })
    .select(`
      id,
      hash_imutavel,
      tipo_registro,
      entidade_id,
      acao,
      valor_movimentado,
      data_registro,
      ip_address,
      usuario_id
    `)
    .single();
  
  if (error) {
    throw new Error(`Erro ao criar log de governança: ${error.message}`);
  }
  
  // Criar log de auditoria adicional para transações financeiras
  if (tipo_registro === 'centavo' || tipo_registro === 'transacao') {
    await criarLogAuditoriaAdicional(data, motivo);
  }
  
  return data;
}

function gerarHashImutavel(dados: any): string {
  const dadosString = JSON.stringify(dados, Object.keys(dados).sort());
  return createHash('sha256').update(dadosString).digest('hex');
}

async function criarLogAuditoriaAdicional(logData: any, motivo?: string): Promise<void> {
  // Registra log duplicado em agent_logs para rastreabilidade cruzada
  try {
    await supabase.from('agent_logs').insert({
      agent_name: 'governanca',
      action: `${logData.tipo_registro}_${logData.acao}`,
      decision: 'logged',
      message: motivo ?? `Log de governança: ${logData.id}`,
    });
  } catch {
    // Não quebrar o fluxo principal
  }
}

// Middleware para logs automáticos de operações críticas
export async function middlewareLogs(request: NextRequest, next: Function) {
  const startTime = Date.now();
  const method = request.method;
  const url = request.url;
  
  // Continuar com a requisição
  const response = await next();
  
  // Log automático para operações críticas
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Determinar tipo de registro baseado na URL
    let tipoRegistro: 'centavo' | 'lead' | 'transacao' | 'decisao' = 'transacao';
    let entidadeTabela = 'desconhecida';
    
    if (url.includes('/financeiro') || url.includes('/comissoes')) {
      tipoRegistro = 'centavo';
      entidadeTabela = 'comissoes';
    } else if (url.includes('/leads')) {
      tipoRegistro = 'lead';
      entidadeTabela = 'leads';
    } else if (url.includes('/matches')) {
      tipoRegistro = 'decisao';
      entidadeTabela = 'matches';
    }
    
    // Criar log automático
    await criarLogGovernanca({
      tipo_registro: tipoRegistro,
      entidade_id: 'auto_log',
      entidade_tabela: entidadeTabela,
      acao: method.toLowerCase() as 'create' | 'update' | 'delete' | 'approve' | 'reject',
      dados_novos: {
        url,
        method,
        duration,
        status: response.status
      },
      motivo: 'Log automático de operação'
    }, request);
  }
  
  return response;
}

// Endpoint para consultar logs de governança
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo_registro = searchParams.get('tipo_registro');
    const entidade_id = searchParams.get('entidade_id');
    const data_inicio = searchParams.get('data_inicio');
    const data_fim = searchParams.get('data_fim');
    const relatorio = searchParams.get('relatorio');
    
    if (relatorio === 'true') {
      return await gerarRelatorioLogs(data_inicio ?? undefined, data_fim ?? undefined);
    }
    
    let query = supabase
      .from('logs_governanca')
      .select(`
        *,
        auth.users!inner(
          email,
          raw_user_meta_data
        )
      `);
    
    if (tipo_registro) {
      query = query.eq('tipo_registro', tipo_registro);
    }
    
    if (entidade_id) {
      query = query.eq('entidade_id', entidade_id);
    }
    
    if (data_inicio) {
      query = query.gte('data_registro', data_inicio);
    }
    
    if (data_fim) {
      query = query.lte('data_registro', data_fim);
    }
    
    const { data, error } = await query
      .order('data_registro', { ascending: false })
      .limit(1000); // Limite para evitar sobrecarga
    
    if (error) {
      throw new Error(`Erro ao consultar logs: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      data: data || [],
      message: 'Logs de governança consultados com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar logs:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar logs',
      details: error.message
    }, { status: 500 });
  }
}

async function gerarRelatorioLogs(dataInicio?: string, dataFim?: string): Promise<NextResponse> {
  try {
    // Buscar todos os logs no período
    let query = supabase
      .from('logs_governanca')
      .select('*');
    
    if (dataInicio) {
      query = query.gte('data_registro', dataInicio);
    }
    
    if (dataFim) {
      query = query.lte('data_registro', dataFim);
    }
    
    const { data: logs, error } = await query;
    
    if (error) {
      throw new Error(`Erro ao buscar logs para relatório: ${error.message}`);
    }
    
    // Calcular estatísticas
    const estatisticas = {
      total_registros: logs?.length || 0,
      total_centavos: logs?.filter(l => l.tipo_registro === 'centavo').length || 0,
      total_leads: logs?.filter(l => l.tipo_registro === 'lead').length || 0,
      total_transacoes: logs?.filter(l => l.tipo_registro === 'transacao').length || 0,
      total_decisoes: logs?.filter(l => l.tipo_registro === 'decisao').length || 0,
      valor_total_movimentado: logs?.reduce((sum, l) => sum + (l.valor_movimentado || 0), 0) || 0,
      periodo_analise: `${dataInicio || 'início'} a ${dataFim || 'hoje'}`
    };
    
    // Buscar auditorias detalhadas
    const { data: auditorias } = await supabase
      .from('audit_logs')
      .select(`
        id,
        acao,
        tabela_afetada,
        registro_id,
        dados_anteriores,
        dados_novos,
        data_registro,
        user_id,
        ip_address
      `)
      .gte('data_registro', dataInicio)
      .lte('data_registro', dataFim)
      .order('data_registro', { ascending: false })
      .limit(100);
    
    // Formatar auditorias
    const auditoriasFormatadas = auditorias?.map(auditoria => ({
      id: auditoria.id,
      tipo_registro: 'auditoria',
      entidade_id: auditoria.registro_id,
      acao: auditoria.acao,
      valor_movimentado: auditoria.dados_novos?.valor || 0,
      data_registro: auditoria.data_registro,
      hash_imutavel: auditoria.id, // Usar ID como referência
      usuario: auditoria.user_id,
      detalhes: {
        tabela: auditoria.tabela_afetada,
        ip: auditoria.ip_address,
        mudanca: auditoria.dados_anteriores && auditoria.dados_novos ? {
          antes: auditoria.dados_anteriores,
          depois: auditoria.dados_novos
        } : null
      }
    })) || [];
    
    return NextResponse.json({
      success: true,
      data: {
        relatorio: estatisticas,
        auditoria: auditoriasFormatadas
      },
      message: 'Relatório de governança gerado com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao gerar relatório',
      details: error.message
    }, { status: 500 });
  }
}

// Endpoint para verificar integridade dos logs
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hash = searchParams.get('hash');
    
    if (!hash) {
      return NextResponse.json({
        success: false,
        error: 'Hash é obrigatório para verificação de integridade'
      }, { status: 400 });
    }
    
    // Buscar log pelo hash
    const { data: log, error } = await supabase
      .from('logs_governanca')
      .select('*')
      .eq('hash_imutavel', hash)
      .single();
    
    if (error || !log) {
      return NextResponse.json({
        success: false,
        error: 'Log não encontrado',
        integridade: 'invalid'
      }, { status: 404 });
    }
    
    // Verificar integridade do hash
    const hashCalculado = gerarHashImutavel({
      tipo_registro: log.tipo_registro,
      entidade_id: log.entidade_id,
      entidade_tabela: log.entidade_tabela,
      acao: log.acao,
      valor_movimentado: log.valor_movimentado,
      timestamp: log.data_registro,
      ip_address: log.ip_address,
      usuario_id: log.usuario_id
    });
    
    const integridadeValida = hashCalculado === log.hash_imutavel;
    
    return NextResponse.json({
      success: true,
      data: {
        log_id: log.id,
        hash_original: log.hash_imutavel,
        hash_calculado: hashCalculado,
        integridade: integridadeValida ? 'valid' : 'invalid',
        data_registro: log.data_registro,
        tipo_registro: log.tipo_registro,
        acao: log.acao
      },
      message: `Integridade ${integridadeValida ? 'válida' : 'inválida'}`
    });
    
  } catch (error: any) {
    console.error('Erro na verificação de integridade:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno na verificação de integridade',
      details: error.message
    }, { status: 500 });
  }
}

// Endpoint para exportar logs (CSV/JSON)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { formato, filtros } = body; // formato: 'csv' ou 'json'
    
    if (!formato || !filtros) {
      return NextResponse.json({
        success: false,
        error: 'Formato e filtros são obrigatórios'
      }, { status: 400 });
    }
    
    // Buscar logs conforme filtros
    let query = supabase
      .from('logs_governanca')
      .select(`
        id,
        tipo_registro,
        entidade_id,
        entidade_tabela,
        acao,
        valor_movimentado,
        data_registro,
        ip_address,
        usuario_id,
        hash_imutavel
      `);
    
    if (filtros.tipo_registro) {
      query = query.eq('tipo_registro', filtros.tipo_registro);
    }
    
    if (filtros.data_inicio) {
      query = query.gte('data_registro', filtros.data_inicio);
    }
    
    if (filtros.data_fim) {
      query = query.lte('data_registro', filtros.data_fim);
    }
    
    const { data: logs, error } = await query
      .order('data_registro', { ascending: false });
    
    if (error) {
      throw new Error(`Erro ao buscar logs para exportação: ${error.message}`);
    }
    
    // Formatar dados conforme formato solicitado
    let dadosFormatados: any;
    
    if (formato === 'csv') {
      dadosFormatados = formatarCSV(logs || []);
    } else {
      dadosFormatados = logs || [];
    }
    
    return NextResponse.json({
      success: true,
      data: dadosFormatados,
      message: `Logs exportados em formato ${formato.toUpperCase()}`
    });
    
  } catch (error: any) {
    console.error('Erro na exportação de logs:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno na exportação de logs',
      details: error.message
    }, { status: 500 });
  }
}

function formatarCSV(logs: any[]): string {
  const headers = [
    'ID',
    'Tipo Registro',
    'Entidade ID',
    'Tabela',
    'Ação',
    'Valor Movimentado',
    'Data Registro',
    'IP Address',
    'Usuário ID',
    'Hash Imutável'
  ];
  
  const rows = logs.map(log => [
    log.id,
    log.tipo_registro,
    log.entidade_id,
    log.entidade_tabela,
    log.acao,
    log.valor_movimentado,
    log.data_registro,
    log.ip_address,
    log.usuario_id,
    log.hash_imutavel
  ]);
  
  // Converter para CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}
