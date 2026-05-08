// 🏛️ SECURITY BROKER SB v25 - OMNISCIENT INTELIGÊNCIA PREDITIVA
// API de Configuração e Gestão de White Label (Modo Invisível)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WhiteLabelRequest {
  acao: 'configurar_white_label' | 'consultar_configuracao' | 'ativar_modo_invisivel' | 'desativar_modo_invisivel' | 'consultar_logs_acesso';
  dados?: {
    imobiliaria_id?: string;
    modo_invisivel?: boolean;
    mostrar_powered_by?: boolean;
    logo_personalizada_url?: string;
    cor_primaria?: string;
    cor_secundaria?: string;
    subdominio_personalizado?: string;
    dominio_personalizado?: string;
    ssl_ativo?: boolean;
    funcionalidades_visiveis?: string[];
    funcionalidades_ocultas?: string[];
    relatorios_personalizados?: boolean;
    logo_relatorios?: string;
    cabecalho_relatorios?: string;
    data_inicio?: string;
    data_fim?: string;
  };
}

interface WhiteLabelResponse {
  success: boolean;
  configuracao_criada?: {
    id: string;
    imobiliaria_id: string;
    modo_invisivel: boolean;
    mostrar_powered_by: boolean;
    logo_personalizada_url: string;
    cor_primaria: string;
    cor_secundaria: string;
    subdominio_personalizado: string;
    dominio_personalizado: string;
    ssl_ativo: boolean;
    funcionalidades_visiveis: string[];
    funcionalidades_ocultas: string[];
    relatorios_personalizados: boolean;
    logo_relatorios: string;
    cabecalho_relatorios: string;
    status_configuracao: string;
    data_ativacao: string;
    hash_configuracao: string;
  };
  configuracao_consultada?: {
    id: string;
    imobiliaria_id: string;
    modo_invisivel: boolean;
    mostrar_powered_by: boolean;
    logo_personalizada_url: string;
    cor_primaria: string;
    cor_secundaria: string;
    subdominio_personalizado: string;
    dominio_personalizado: string;
    ssl_ativo: boolean;
    funcionalidades_visiveis: string[];
    funcionalidades_ocultas: string[];
    relatorios_personalizados: boolean;
    status_configuracao: string;
    data_ativacao: string;
    powered_by_ativo: boolean;
  };
  modo_invisivel_ativado?: {
    imobiliaria_id: string;
    modo_invisivel: boolean;
    mostrar_powered_by: boolean;
    data_ativacao: string;
    dominio_personalizado: string;
    ssl_ativo: boolean;
    status_configuracao: string;
  };
  modo_invisivel_desativado?: {
    imobiliaria_id: string;
    modo_invisivel: boolean;
    data_desativacao: string;
    motivo_desativacao: string;
  };
  logs_acesso_consultados?: {
    imobiliaria_id: string;
    periodo_consulta: string;
    total_acessos: number;
    acessos_sucesso: number;
    acessos_falha: number;
    acessos_bloqueados: number;
    dispositivos_acessados: Array<{
      dispositivo_tipo: string;
      total_acessos: number;
      percentual_total: number;
    }>;
    paginas_acessadas: Array<{
      pagina_acessada: string;
      total_acessos: number;
      percentual_total: number;
    }>;
    detalhes_logs: Array<{
      id: string;
      usuario_id: string;
      usuario_nome: string;
      data_acesso: string;
      ip_acesso: string;
      dispositivo_tipo: string;
      url_acessada: string;
      status_acesso: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: WhiteLabelRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🎨 White Label: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'configurar_white_label':
        resultado = await configurarWhiteLabel(dados);
        break;
      case 'consultar_configuracao':
        resultado = await consultarConfiguracao(dados);
        break;
      case 'ativar_modo_invisivel':
        resultado = await ativarModoInvisivel(dados);
        break;
      case 'desativar_modo_invisivel':
        resultado = await desativarModoInvisivel(dados);
        break;
      case 'consultar_logs_acesso':
        resultado = await consultarLogsAcesso(dados);
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
    console.error('Erro no White Label:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no White Label',
      details: error.message
    }, { status: 500 });
  }
}

async function configurarWhiteLabel(dados: any): Promise<WhiteLabelResponse['configuracao_criada']> {
  const { 
    imobiliaria_id, 
    modo_invisivel, 
    mostrar_powered_by, 
    logo_personalizada_url, 
    cor_primaria, 
    cor_secundaria, 
    subdominio_personalizado, 
    dominio_personalizado, 
    ssl_ativo, 
    funcionalidades_visiveis, 
    funcionalidades_ocultas, 
    relatorios_personalizados, 
    logo_relatorios, 
    cabecalho_relatorios 
  } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id) {
    throw new Error('ID da imobiliária não fornecido');
  }
  
  // Validar cores (hexadecimal)
  const corPrimariaValida = cor_primaria ? /^#[0-9A-F]{6}$/i.test(cor_primaria) : true;
  const corSecundariaValida = cor_secundaria ? /^#[0-9A-F]{6}$/i.test(cor_secundaria) : true;
  
  if (!corPrimariaValida || !corSecundariaValida) {
    throw new Error('Cores devem estar em formato hexadecimal (#RRGGBB)');
  }
  
  // Validar funcionalidades
  const funcionalidadesValidas = ['dashboard', 'leads', 'financiamento', 'analytics', 'marketing', 'relatorios'];
  const funcionalidadesOcultasValidas = ['sb_branding', 'ecossistema_total', 'ourobos_compliance', 'dna_ativo', 'yara_predictive'];
  
  if (funcionalidades_visiveis) {
    const invalidas = funcionalidades_visiveis.filter((f: string) => !funcionalidadesValidas.includes(f));
    if (invalidas.length > 0) {
      throw new Error(`Funcionalidades visíveis inválidas: ${invalidas.join(', ')}`);
    }
  }

  if (funcionalidades_ocultas) {
    const invalidas = funcionalidades_ocultas.filter((f: string) => !funcionalidadesOcultasValidas.includes(f));
    if (invalidas.length > 0) {
      throw new Error(`Funcionalidades ocultas inválidas: ${invalidas.join(', ')}`);
    }
  }
  
  // Criar ou atualizar configuração
  const { data: configuracao, error } = await supabase
    .from('configuracoes_white_label')
    .upsert({
      imobiliaria_id,
      modo_invisivel: modo_invisivel ?? true,
      mostrar_powered_by: mostrar_powered_by ?? true,
      logo_personalizada_url,
      cor_primaria: cor_primaria ?? '#1a1a1a',
      cor_secundaria: cor_secundaria ?? '#2563eb',
      subdominio_personalizado,
      dominio_personalizado,
      ssl_ativo: ssl_ativo ?? false,
      funcionalidades_visiveis: funcionalidades_visiveis ?? ['dashboard', 'leads', 'financiamento'],
      funcionalidades_ocultas: funcionalidades_ocultas ?? ['sb_branding', 'ecossistema_total'],
      relatorios_personalizados: relatorios_personalizados ?? false,
      logo_relatorios,
      cabecalho_relatorios,
      status_configuracao: 'ativa',
      data_ativacao: new Date().toISOString().split('T')[0]
    }, {
      onConflict: 'imobiliaria_id'
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao configurar White Label: ${error.message}`);
  }
  
  return {
    id: configuracao.id,
    imobiliaria_id: configuracao.imobiliaria_id,
    modo_invisivel: configuracao.modo_invisivel,
    mostrar_powered_by: configuracao.mostrar_powered_by,
    logo_personalizada_url: configuracao.logo_personalizada_url,
    cor_primaria: configuracao.cor_primaria,
    cor_secundaria: configuracao.cor_secundaria,
    subdominio_personalizado: configuracao.subdominio_personalizado,
    dominio_personalizado: configuracao.dominio_personalizado,
    ssl_ativo: configuracao.ssl_ativo,
    funcionalidades_visiveis: configuracao.funcionalidades_visiveis,
    funcionalidades_ocultas: configuracao.funcionalidades_ocultas,
    relatorios_personalizados: configuracao.relatorios_personalizados,
    logo_relatorios: configuracao.logo_relatorios,
    cabecalho_relatorios: configuracao.cabecalho_relatorios,
    status_configuracao: configuracao.status_configuracao,
    data_ativacao: configuracao.data_ativacao,
    hash_configuracao: configuracao.hash_configuracao
  };
}

async function consultarConfiguracao(dados: any): Promise<WhiteLabelResponse['configuracao_consultada']> {
  const { imobiliaria_id } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id) {
    throw new Error('ID da imobiliária não fornecido');
  }
  
  // Buscar configuração
  const { data: configuracao, error } = await supabase
    .from('configuracoes_white_label')
    .select('*')
    .eq('imobiliaria_id', imobiliaria_id)
    .single();
  
  if (error || !configuracao) {
    throw new Error('Configuração não encontrada');
  }
  
  return {
    id: configuracao.id,
    imobiliaria_id: configuracao.imobiliaria_id,
    modo_invisivel: configuracao.modo_invisivel,
    mostrar_powered_by: configuracao.mostrar_powered_by,
    logo_personalizada_url: configuracao.logo_personalizada_url,
    cor_primaria: configuracao.cor_primaria,
    cor_secundaria: configuracao.cor_secundaria,
    subdominio_personalizado: configuracao.subdominio_personalizado,
    dominio_personalizado: configuracao.dominio_personalizado,
    ssl_ativo: configuracao.ssl_ativo,
    funcionalidades_visiveis: configuracao.funcionalidades_visiveis,
    funcionalidades_ocultas: configuracao.funcionalidades_ocultas,
    relatorios_personalizados: configuracao.relatorios_personalizados,
    status_configuracao: configuracao.status_configuracao,
    data_ativacao: configuracao.data_ativacao,
    powered_by_ativo: configuracao.mostrar_powered_by
  };
}

async function ativarModoInvisivel(dados: any): Promise<WhiteLabelResponse['modo_invisivel_ativado']> {
  const { imobiliaria_id, logo_personalizada_url, cor_primaria, cor_secundaria, dominio_personalizado } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id) {
    throw new Error('ID da imobiliária não fornecido');
  }
  
  // Ativar modo invisível
  const { data: configuracao, error } = await supabase
    .from('configuracoes_white_label')
    .update({
      modo_invisivel: true,
      mostrar_powered_by: true, // Sempre mostrar powered by quando em modo invisível
      logo_personalizada_url: logo_personalizada_url,
      cor_primaria: cor_primaria || '#1a1a1a',
      cor_secundaria: cor_secundaria || '#2563eb',
      dominio_personalizado: dominio_personalizado,
      ssl_ativo: dominio_personalizado ? true : false,
      status_configuracao: 'ativa',
      data_ativacao: new Date().toISOString().split('T')[0]
    })
    .eq('imobiliaria_id', imobiliaria_id)
    .select('*')
    .single();
  
  if (error || !configuracao) {
    throw new Error('Erro ao ativar modo invisível');
  }
  
  return {
    imobiliaria_id: configuracao.imobiliaria_id,
    modo_invisivel: configuracao.modo_invisivel,
    mostrar_powered_by: configuracao.mostrar_powered_by,
    data_ativacao: configuracao.data_ativacao,
    dominio_personalizado: configuracao.dominio_personalizado,
    ssl_ativo: configuracao.ssl_ativo,
    status_configuracao: configuracao.status_configuracao
  };
}

async function desativarModoInvisivel(dados: any): Promise<WhiteLabelResponse['modo_invisivel_desativado']> {
  const { imobiliaria_id, motivo_desativacao } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id) {
    throw new Error('ID da imobiliária não fornecido');
  }
  
  // Desativar modo invisível
  const { data: configuracao, error } = await supabase
    .from('configuracoes_white_label')
    .update({
      modo_invisivel: false,
      status_configuracao: 'manutencao',
      updated_at: new Date().toISOString()
    })
    .eq('imobiliaria_id', imobiliaria_id)
    .select('*')
    .single();
  
  if (error || !configuracao) {
    throw new Error('Erro ao desativar modo invisível');
  }
  
  return {
    imobiliaria_id: configuracao.imobiliaria_id,
    modo_invisivel: configuracao.modo_invisivel,
    data_desativacao: new Date().toISOString(),
    motivo_desativacao: motivo_desativacao || 'Solicitação do usuário'
  };
}

async function consultarLogsAcesso(dados: any): Promise<WhiteLabelResponse['logs_acesso_consultados']> {
  const { imobiliaria_id, data_inicio, data_fim } = dados;
  
  // Validar dados obrigatórios
  if (!imobiliaria_id) {
    throw new Error('ID da imobiliária não fornecido');
  }
  
  // Buscar logs de acesso
  let query = supabase
    .from('logs_acesso_white_label')
    .select(`
      *,
      brokers!inner(nome)
    `)
    .eq('imobiliaria_id', imobiliaria_id);
  
  if (data_inicio && data_fim) {
    query = query
      .gte('data_acesso', data_inicio)
      .lte('data_acesso', data_fim);
  } else {
    // Últimos 30 dias por padrão
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 30);
    query = query.gte('data_acesso', dataInicio.toISOString());
  }
  
  const { data: logs, error } = await query.order('data_acesso', { ascending: false });
  
  if (error) {
    throw new Error(`Erro ao consultar logs de acesso: ${error.message}`);
  }
  
  // Calcular estatísticas
  const totalAcessos = logs.length;
  const acessosSucesso = logs.filter(l => l.status_acesso === 'sucesso').length;
  const acessosFalha = logs.filter(l => l.status_acesso === 'falha').length;
  const acessosBloqueados = logs.filter(l => l.status_acesso === 'bloqueado').length;
  
  // Agrupar por dispositivo
  const dispositivosAgrupados = logs.reduce((acc: Record<string, number>, log) => {
    const tipo = log.dispositivo_tipo || 'desktop';
    if (!acc[tipo]) {
      acc[tipo] = 0;
    }
    acc[tipo]++;
    return acc;
  }, {});
  
  const dispositivos_acessados = Object.entries(dispositivosAgrupados).map(([tipo, total]) => ({
    dispositivo_tipo: tipo,
    total_acessos: total,
    percentual_total: totalAcessos > 0 ? (total / totalAcessos) * 100 : 0
  }));
  
  // Agrupar por página
  const paginasAgrupadas = logs.reduce((acc: Record<string, number>, log) => {
    const pagina = log.pagina_acessada || 'dashboard';
    if (!acc[pagina]) {
      acc[pagina] = 0;
    }
    acc[pagina]++;
    return acc;
  }, {});
  
  const paginas_acessadas = Object.entries(paginasAgrupadas).map(([pagina, total]) => ({
    pagina_acessada: pagina,
    total_acessos: total,
    percentual_total: totalAcessos > 0 ? (total / totalAcessos) * 100 : 0
  }));
  
  return {
    imobiliaria_id,
    periodo_consulta: data_inicio && data_fim ? `${data_inicio} a ${data_fim}` : 'Últimos 30 dias',
    total_acessos: totalAcessos,
    acessos_sucesso: acessosSucesso,
    acessos_falha: acessosFalha,
    acessos_bloqueados: acessosBloqueados,
    dispositivos_acessados,
    paginas_acessadas,
    detalhes_logs: logs.map(l => ({
      id: l.id,
      usuario_id: l.usuario_id,
      usuario_nome: l.brokers.nome,
      data_acesso: l.data_acesso,
      ip_acesso: l.ip_acesso,
      dispositivo_tipo: l.dispositivo_tipo,
      url_acessada: l.url_acessada,
      status_acesso: l.status_acesso
    }))
  };
}

// Endpoint para consultas específicas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const imobiliaria_id = searchParams.get('imobiliaria_id');
    
    if (tipo === 'verificar_modo_invisivel' && imobiliaria_id) {
      return await verificarModoInvisivel(imobiliaria_id);
    }
    
    if (tipo === 'listar_configuracoes') {
      return await listarConfiguracoes();
    }
    
    if (tipo === 'estatisticas_gerais') {
      return await consultarEstatisticasGerais();
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

async function verificarModoInvisivel(imobiliariaId: string): Promise<NextResponse> {
  // Verificar se a imobiliária está em modo invisível
  const { data: configuracao } = await supabase
    .from('configuracoes_white_label')
    .select('*')
    .eq('imobiliaria_id', imobiliariaId)
    .single();
  
  if (!configuracao) {
    return NextResponse.json({
      success: true,
      data: {
        modo_invisivel: false,
        mensagem: 'Configuração não encontrada'
      }
    });
  }
  
  return NextResponse.json({
    success: true,
    data: {
      modo_invisivel: configuracao.modo_invisivel,
      mostrar_powered_by: configuracao.mostrar_powered_by,
      dominio_personalizado: configuracao.dominio_personalizado,
      ssl_ativo: configuracao.ssl_ativo,
      status_configuracao: configuracao.status_configuracao
    }
  });
}

async function listarConfiguracoes(): Promise<NextResponse> {
  // Listar todas as configurações de White Label
  const { data: configuracoes } = await supabase
    .from('configuracoes_white_label')
    .select(`
      *,
      imobiliarias_parceiras!inner(nome_fantasia, cnpj)
    `)
    .order('created_at', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: configuracoes || [],
    message: 'Configurações listadas com sucesso'
  });
}

async function consultarEstatisticasGerais(): Promise<NextResponse> {
  // Consultar estatísticas gerais de White Label
  const { data: configuracoes } = await supabase
    .from('configuracoes_white_label')
    .select('*');
  
  if (!configuracoes || configuracoes.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        total_configuracoes: 0,
        modo_invisivel_ativos: 0,
        powered_by_ativos: 0,
        ssl_ativos: 0,
        funcionalidades_mais_visiveis: []
      }
    });
  }
  
  const totalConfiguracoes = configuracoes.length;
  const modoInvisivelAtivos = configuracoes.filter(c => c.modo_invisivel).length;
  const poweredByAtivos = configuracoes.filter(c => c.mostrar_powered_by).length;
  const sslAtivos = configuracoes.filter(c => c.ssl_ativo).length;
  
  // Funcionalidades mais visíveis
  const funcionalidadesVisiveis: Record<string, number> = {};
  configuracoes.forEach(c => {
    if (c.funcionalidades_visiveis) {
      c.funcionalidades_visiveis.forEach((f: string) => {
        if (!funcionalidadesVisiveis[f]) {
          funcionalidadesVisiveis[f] = 0;
        }
        funcionalidadesVisiveis[f]++;
      });
    }
  });
  
  const funcionalidadesMaisVisiveis = Object.entries(funcionalidadesVisiveis)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([funcionalidade, total]) => ({
      funcionalidade,
      total,
      percentual: (total / totalConfiguracoes) * 100
    }));
  
  return NextResponse.json({
    success: true,
    data: {
      total_configuracoes: totalConfiguracoes,
      modo_invisivel_ativos: modoInvisivelAtivos,
      powered_by_ativos: poweredByAtivos,
      ssl_ativos: sslAtivos,
      funcionalidades_mais_visiveis: funcionalidadesMaisVisiveis
    }
  });
}
