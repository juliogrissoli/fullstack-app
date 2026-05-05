/**
 * 🏛️ API DE MONITORAMENTO SOBERANO SB v6.7.0
 * 
 * Endpoints para monitoramento em tempo real do sistema
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  healthCheckRealTime, 
  enviarNotificacaoErroCritico, 
  verificarStatusModulo,
  desabilitarModulo,
  habilitarModulo
} from '@/lib/monitoramento-soberano';

// GET /api/monitoramento - Health check geral
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'health':
        return await handleHealthCheck();
      case 'modules':
        return await handleModulesStatus();
      case 'test-webhook':
        return await handleTestWebhook();
      default:
        return await handleDashboard();
    }
    
  } catch (error: any) {
    await enviarNotificacaoErroCritico({
      modulo: 'API Monitoramento',
      skill: 'ASEC',
      erro: error.message,
      timestamp: new Date().toISOString(),
      severidade: 'medium'
    });
    
    return NextResponse.json({
      success: false,
      error: 'Erro no endpoint de monitoramento'
    }, { status: 500 });
  }
}

// POST /api/monitoramento - Controle de módulos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, module, reason } = body;
    
    switch (action) {
      case 'disable':
        return await handleDisableModule(module, reason);
      case 'enable':
        return await handleEnableModule(module, reason);
      case 'alert':
        return await handleSendAlert(body);
      default:
        return NextResponse.json({
          success: false,
          error: 'Ação inválida'
        }, { status: 400 });
    }
    
  } catch (error: any) {
    await enviarNotificacaoErroCritico({
      modulo: 'API Monitoramento',
      skill: 'ASEC',
      erro: error.message,
      timestamp: new Date().toISOString(),
      severidade: 'high'
    });
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar requisição'
    }, { status: 500 });
  }
}

/**
 * Health check completo do sistema
 */
async function handleHealthCheck() {
  const healthResult = await healthCheckRealTime();
  
  return NextResponse.json({
    success: true,
    data: healthResult,
    message: `Status: ${healthResult.overall}`,
    recomendations: getHealthRecommendations(healthResult)
  }, { 
    status: healthResult.overall === 'healthy' ? 200 : 
           healthResult.overall === 'degraded' ? 206 : 503 
  });
}

/**
 * Status de todos os módulos
 */
async function handleModulesStatus() {
  const modules = [
    'match-autonomos',
    'match-sb', 
    'match-areas',
    'conversion-engine-asec',
    'ouroboros-2.0',
    'global-standard-gates-musk',
    'golden-master',
    'mercado-secundario',
    'financeiro',
    'logistics-cleaning-rotation'
  ];
  
  const status: Record<string, any> = {};
  
  for (const module of modules) {
    try {
      status[module] = {
        enabled: await verificarStatusModulo(module),
        last_check: new Date().toISOString()
      };
    } catch (error) {
      status[module] = {
        enabled: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        last_check: new Date().toISOString()
      };
    }
  }
  
  return NextResponse.json({
    success: true,
    data: {
      modules: status,
      total_modules: modules.length,
      enabled_modules: Object.values(status).filter((m: any) => m.enabled).length,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Teste de webhook
 */
async function handleTestWebhook() {
  await enviarNotificacaoErroCritico({
    modulo: 'API Monitoramento',
    skill: 'ASEC',
    erro: 'Teste de webhook - Sistema funcionando normalmente',
    timestamp: new Date().toISOString(),
    severidade: 'low'
  });
  
  return NextResponse.json({
    success: true,
    message: 'Teste de webhook enviado com sucesso'
  });
}

/**
 * Dashboard completo de monitoramento
 */
async function handleDashboard() {
  // Health check
  const healthCheck = await healthCheckRealTime();
  
  // Status dos módulos
  const modulesResponse = await handleModulesStatus();
  const modulesData = await modulesResponse.json();
  
  // Estatísticas simuladas (em produção viriam do banco)
  const stats = {
    total_matches_hoje: 127,
    vgv_processado_hoje: 12700000,
    taxa_conversao: 0.73,
    transacoes_sucesso: 125,
    transacoes_falha: 2,
    uptime_sistema: '99.9%',
    alertas_ultimas_24h: 3,
    modulo_desabilitado: modulesData.data.enabled_modules < modulesData.data.total_modules
  };
  
  return NextResponse.json({
    success: true,
    data: {
      health: healthCheck,
      modules: modulesData.data,
      estatisticas: stats,
      timestamp: new Date().toISOString(),
      status_geral: healthCheck.overall === 'healthy' && !stats.modulo_desabilitado ? 'operacional' : 'atencao'
    }
  });
}

/**
 * Desabilitar módulo
 */
async function handleDisableModule(module: string, reason?: string) {
  if (!module) {
    return NextResponse.json({
      success: false,
      error: 'Nome do módulo é obrigatório'
    }, { status: 400 });
  }
  
  try {
    await desabilitarModulo(module, reason);
    
    return NextResponse.json({
      success: true,
      message: `Módulo ${module} desabilitado com sucesso`,
      data: {
        module,
        reason: reason || 'Sem motivo especificado',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: `Falha ao desabilitar módulo: ${error.message}`
    }, { status: 500 });
  }
}

/**
 * Habilitar módulo
 */
async function handleEnableModule(module: string, reason?: string) {
  if (!module) {
    return NextResponse.json({
      success: false,
      error: 'Nome do módulo é obrigatório'
    }, { status: 400 });
  }
  
  try {
    await habilitarModulo(module, reason);
    
    return NextResponse.json({
      success: true,
      message: `Módulo ${module} habilitado com sucesso`,
      data: {
        module,
        reason: reason || 'Sem motivo especificado',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: `Falha ao habilitar módulo: ${error.message}`
    }, { status: 500 });
  }
}

/**
 * Enviar alerta personalizado
 */
async function handleSendAlert(body: any) {
  const { modulo, skill, erro, severidade = 'medium' } = body;
  
  if (!modulo || !skill || !erro) {
    return NextResponse.json({
      success: false,
      error: 'Campos modulo, skill e erro são obrigatórios'
    }, { status: 400 });
  }
  
  try {
    await enviarNotificacaoErroCritico({
      modulo,
      skill,
      erro,
      timestamp: new Date().toISOString(),
      severidade,
      contexto: body.contexto
    });
    
    return NextResponse.json({
      success: true,
      message: 'Alerta enviado com sucesso'
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: `Falha ao enviar alerta: ${error.message}`
    }, { status: 500 });
  }
}

/**
 * Gera recomendações baseado no health check
 */
function getHealthRecommendations(healthResult: any): string[] {
  const recommendations: string[] = [];
  
  if (healthResult.supabase.status === 'critical') {
    recommendations.push('Verificar conexão com Supabase - possível instabilidade do banco de dados');
  }
  
  if (healthResult.supabase.latency > 500) {
    recommendations.push('Otimizar queries do Supabase - latência elevada detectada');
  }
  
  if (healthResult.resend.status === 'critical') {
    recommendations.push('Verificar API Key do Resend - serviço de e-mail inacessível');
  }
  
  if (healthResult.resend.latency > 500) {
    recommendations.push('Verificar limites da API Resend - latência elevada');
  }
  
  if (healthResult.overall === 'healthy') {
    recommendations.push('Sistema operando normalmente - continue monitorando');
  }
  
  return recommendations;
}
