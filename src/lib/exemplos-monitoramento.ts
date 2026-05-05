/**
 * 🏛️ EXEMPLOS DE USO - MONITORAMENTO SOBERANO SB v6.7.0
 * 
 * Este arquivo demonstra como integrar o sistema de monitoramento
 * nos endpoints principais da aplicação.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  healthCheckRealTime, 
  enviarNotificacaoErroCritico, 
  registrarSucessoMatch, 
  verificarStatusModulo,
  withModuleCheck 
} from './monitoramento-soberano';

/**
 * EXEMPLO 1: Integrar em endpoint Match
 */
export async function exemploMatchComMonitoramento(request: NextRequest) {
  try {
    // Verificar se o módulo está habilitado
    const moduloEnabled = await verificarStatusModulo('match-autonomos');
    if (!moduloEnabled) {
      return NextResponse.json({
        success: false,
        error: 'Módulo Match Autônomos está temporariamente desabilitado para manutenção'
      }, { status: 503 });
    }

    // Processar o match normalmente
    const body = await request.json();
    const resultado = await processarMatch(body);
    
    // Registrar sucesso se o match foi concluído
    if (resultado.success && resultado.vgv) {
      await registrarSucessoMatch(resultado.vgv, {
        match_id: resultado.match_id,
        broker_id: resultado.broker_id,
        cliente_id: resultado.cliente_id
      });
    }
    
    return NextResponse.json(resultado);
    
  } catch (error: any) {
    // Enviar notificação de erro crítico
    await enviarNotificacaoErroCritico({
      modulo: 'Match Autônomos',
      skill: 'ASEC',
      erro: error.message,
      timestamp: new Date().toISOString(),
      severidade: 'high',
      contexto: {
        endpoint: '/api/match-autonomos',
        method: 'POST',
        body: await request.clone().json()
      }
    });
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

/**
 * EXEMPLO 2: Health Check Endpoint
 */
export async function exemploHealthCheckEndpoint() {
  try {
    const healthResult = await healthCheckRealTime();
    
    return NextResponse.json({
      success: true,
      data: healthResult,
      message: `Status: ${healthResult.overall}`
    }, { 
      status: healthResult.overall === 'healthy' ? 200 : 
             healthResult.overall === 'degraded' ? 206 : 503 
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Falha ao verificar saúde do sistema',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * EXEMPLO 3: Middleware de verificação de módulo
 */
export const withModuleCheckExample = withModuleCheck('conversion-engine-asec');

/**
 * EXEMPLO 4: Uso em endpoint complexo (Conversion Engine ASEC)
 */
export async function exemploConversionEngineComMonitoramento(request: NextRequest) {
  return withModuleCheckExample(async () => {
    try {
      const body = await request.json();
      
      // Health check rápido antes de processar
      const healthCheck = await healthCheckRealTime();
      if (healthCheck.overall === 'critical') {
        throw new Error('Sistema em estado crítico - processamento suspenso');
      }
      
      // Processar conversão
      const resultado = await processarConversao(body);
      
      // Registrar sucesso se aplicável
      if (resultado.success && resultado.vgv) {
        await registrarSucessoMatch(resultado.vgv, {
          tipo_conversao: 'asec',
          cliente_id: resultado.cliente_id,
          taxa_conversao: resultado.taxa_conversao
        });
      }
      
      return NextResponse.json(resultado);
      
    } catch (error: any) {
      await enviarNotificacaoErroCritico({
        modulo: 'Conversion Engine ASEC',
        skill: 'ASEC',
        erro: error.message,
        timestamp: new Date().toISOString(),
        severidade: 'critical',
        contexto: {
          endpoint: '/api/conversion-engine-asec',
          method: 'POST'
        }
      });
      
      return NextResponse.json({
        success: false,
        error: 'Falha na conversão ASEC'
      }, { status: 500 });
    }
  });
}

/**
 * EXEMPLO 5: Monitoramento em lote (batch processing)
 */
export async function exemploProcessamentoEmLote(dados: any[]) {
  const resultados = [];
  const erros = [];
  
  for (const item of dados) {
    try {
      const resultado = await processarItem(item);
      resultados.push(resultado);
      
      // Registrar sucesso individual
      if (resultado.success && resultado.vgv) {
        await registrarSucessoMatch(resultado.vgv, {
          tipo: 'batch',
          item_id: item.id
        });
      }
      
    } catch (error: any) {
      erros.push({
        item_id: item.id,
        erro: error.message
      });
      
      // Notificar erro crítico se necessário
      if (error.severidade === 'critical') {
        await enviarNotificacaoErroCritico({
          modulo: 'Batch Processing',
          skill: 'ASEC',
          erro: error.message,
          timestamp: new Date().toISOString(),
          severidade: 'critical',
          contexto: {
            item_id: item.id,
            batch_size: dados.length
          }
        });
      }
    }
  }
  
  return {
    success: erros.length === 0,
    processados: resultados.length,
    erros: erros.length,
    detalhes_erros: erros
  };
}

/**
 * EXEMPLO 6: Dashboard de monitoramento
 */
export async function exemploDashboardMonitoramento() {
  try {
    // Health check atual
    const healthCheck = await healthCheckRealTime();
    
    // Estatísticas de transações
    const stats = await buscarEstatisticasTransacoes();
    
    // Status dos módulos
    const modulosStatus = await buscarStatusModulos();
    
    return NextResponse.json({
      success: true,
      data: {
        health_check: healthCheck,
        estatisticas: stats,
        modulos: modulosStatus,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    await enviarNotificacaoErroCritico({
      modulo: 'Dashboard Monitoramento',
      skill: 'ASEC',
      erro: error.message,
      timestamp: new Date().toISOString(),
      severidade: 'medium'
    });
    
    return NextResponse.json({
      success: false,
      error: 'Falha ao carregar dashboard'
    }, { status: 500 });
  }
}

/**
 * Funções auxiliares para os exemplos
 */
async function processarMatch(dados: any) {
  // Simulação de processamento de match
  return {
    success: true,
    match_id: `match-${Date.now()}`,
    broker_id: dados.broker_id,
    cliente_id: dados.cliente_id,
    vgv: dados.valor || 100000
  };
}

async function processarConversao(dados: any) {
  // Simulação de processamento ASEC
  return {
    success: true,
    cliente_id: dados.cliente_id,
    vgv: dados.valor || 50000,
    taxa_conversao: 0.85
  };
}

async function processarItem(item: any) {
  // Simulação de processamento individual
  return {
    success: true,
    id: item.id,
    vgv: item.valor || 25000
  };
}

async function buscarEstatisticasTransacoes() {
  // Simulação de busca de estatísticas
  return {
    total_matches: 1250,
    vgv_total: 125000000,
    taxa_conversao: 0.73,
    ultimas_24h: {
      matches: 45,
      vgv: 4500000
    }
  };
}

async function buscarStatusModulos() {
  // Simulação de status dos módulos
  return {
    'match-autonomos': { enabled: true, uptime: '99.9%' },
    'match-sb': { enabled: true, uptime: '99.8%' },
    'conversion-engine-asec': { enabled: true, uptime: '99.7%' },
    'ouroboros-2.0': { enabled: false, reason: 'Manutenção programada' }
  };
}

/**
 * EXEMPLO 7: Cron job para monitoramento automático
 */
export async function exemploCronMonitoramento() {
  console.log('🏛️ Iniciando cron job de monitoramento');
  
  try {
    // Health check completo
    const healthCheck = await healthCheckRealTime();
    
    // Verificar módulos críticos
    const modulosCriticos = ['match-autonomos', 'match-sb', 'conversion-engine-asec'];
    const modulosInativos = [];
    
    for (const modulo of modulosCriticos) {
      const enabled = await verificarStatusModulo(modulo);
      if (!enabled) {
        modulosInativos.push(modulo);
      }
    }
    
    // Se há problemas, enviar alerta
    if (healthCheck.overall !== 'healthy' || modulosInativos.length > 0) {
      await enviarNotificacaoErroCritico({
        modulo: 'Cron Monitoramento',
        skill: 'ASEC',
        erro: `Problemas detectados - Health: ${healthCheck.overall}, Módulos inativos: ${modulosInativos.join(', ')}`,
        timestamp: new Date().toISOString(),
        severidade: 'high',
        contexto: {
          health_check: healthCheck,
          modulos_inativos: modulosInativos
        }
      });
    }
    
    console.log('✅ Cron job de monitoramento concluído');
    
  } catch (error: any) {
    console.error('❌ Erro no cron job de monitoramento:', error);
  }
}

// Exportar exemplos
export default {
  exemploMatchComMonitoramento,
  exemploHealthCheckEndpoint,
  withModuleCheckExample,
  exemploConversionEngineComMonitoramento,
  exemploProcessamentoEmLote,
  exemploDashboardMonitoramento,
  exemploCronMonitoramento
};
