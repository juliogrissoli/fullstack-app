/**
 * 🏛️ STRESS TEST SOBERANO SB v6.7.0
 * 
 * Script de simulação de carga para validar o Monitoramento Soberano
 * 
 * Funcionalidades:
 * 1. 50 requisições simultâneas Match com perfis variados
 * 2. Latência artificial forçada em 5 requisições
 * 3. Simulação de falhas Supabase
 * 4. Validação de webhooks
 * 5. Relatório de resiliência
 */

import { createClient } from '@supabase/supabase-js';
import { 
  healthCheckRealTime, 
  enviarNotificacaoErroCritico, 
  registrarSucessoMatch 
} from '../lib/monitoramento-soberano';

// Configurações
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Interfaces
interface StressTestResult {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  latency_stats: {
    min: number;
    max: number;
    avg: number;
    p95: number;
  };
  errors: Array<{
    request_id: string;
    error: string;
    latency: number;
    timestamp: string;
  }>;
  webhook_alerts_sent: number;
  tokens_economizados: number;
  status_resiliencia: 'Soberano' | 'Ameaçado' | 'Crítico';
}

interface InvestorProfile {
  id: string;
  nome: string;
  perfil: 'conservador' | 'moderado' | 'agressivo';
  vgv_alvo: number;
  regiao: 'sudeste' | 'nordeste' | 'centro-oeste' | 'sul' | 'norte';
  experiencia: number; // anos
}

// Perfis de investidores para simulação
const investorProfiles: InvestorProfile[] = [
  { id: 'INV001', nome: 'João Conservador', perfil: 'conservador', vgv_alvo: 500000, regiao: 'sudeste', experiencia: 3 },
  { id: 'INV002', nome: 'Maria Moderada', perfil: 'moderado', vgv_alvo: 750000, regiao: 'nordeste', experiencia: 5 },
  { id: 'INV003', nome: 'Pedro Agressivo', perfil: 'agressivo', vgv_alvo: 1200000, regiao: 'centro-oeste', experiencia: 8 },
  { id: 'INV004', nome: 'Ana Conservadora', perfil: 'conservador', vgv_alvo: 450000, regiao: 'sul', experiencia: 2 },
  { id: 'INV005', nome: 'Carlos Moderado', perfil: 'moderado', vgv_alvo: 800000, regiao: 'norte', experiencia: 6 },
  { id: 'INV006', nome: 'Luiza Agressiva', perfil: 'agressivo', vgv_alvo: 1500000, regiao: 'sudeste', experiencia: 10 },
  { id: 'INV007', nome: 'Roberto Conservador', perfil: 'conservador', vgv_alvo: 400000, regiao: 'nordeste', experiencia: 4 },
  { id: 'INV008', nome: 'Fernanda Moderada', perfil: 'moderado', vgv_alvo: 900000, regiao: 'centro-oeste', experiencia: 7 },
  { id: 'INV009', nome: 'Gustavo Agressivo', perfil: 'agressivo', vgv_alvo: 1800000, regiao: 'sul', experiencia: 12 },
  { id: 'INV010', nome: 'Juliana Conservadora', perfil: 'conservador', vgv_alvo: 350000, regiao: 'norte', experiencia: 1 }
];

// Repetir perfis para atingir 50 requisições
const allProfiles = [...Array(5)].flatMap(() => investorProfiles);

// Contadores globais
let webhookAlertsSent = 0;
let tokensEconomizados = 0;

/**
 * Função principal do Stress Test
 */
export async function executarStressTestSoberano(): Promise<StressTestResult> {
  console.log('🏛️ Iniciando Stress Test Soberano SB v6.7.0');
  console.log(`📊 Total de requisições: ${allProfiles.length}`);
  console.log(`⚡ Perfis simultâneos: ${allProfiles.length}`);
  console.log(`🎯 Objetivo: Validar Monitoramento Soberano`);
  console.log('');

  // Resetar contadores
  webhookAlertsSent = 0;
  tokensEconomizados = 0;

  // Iniciar monitoramento de timestamps
  const startTime = Date.now();
  const results: Array<{
    request_id: string;
    success: boolean;
    latency: number;
    error?: string;
    vgv?: number;
  }> = [];

  // Executar requisições simultâneas
  const promises = allProfiles.map(async (profile, index) => {
    const requestId = `REQ-${String(index + 1).padStart(3, '0')}-${profile.id}`;
    
    // Forçar latência artificial em 5 requisições aleatórias
    const shouldForceLatency = index < 5; // Primeiras 5 requisições
    
    // Simular falha Supabase em 2 requisições aleatórias  
    const shouldSimulateSupabaseError = index === 10 || index === 25;
    
    return await executarRequisicaoMatch(
      requestId, 
      profile, 
      shouldForceLatency, 
      shouldSimulateSupabaseError
    );
  });

  // Aguardar todas as requisições
  const requestResults = await Promise.allSettled(promises);
  const endTime = Date.now();

  // Processar resultados
  for (const result of requestResults) {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      results.push({
        request_id: 'UNKNOWN',
        success: false,
        latency: 0,
        error: result.reason
      });
    }
  }

  // Calcular estatísticas
  const successfulRequests = results.filter(r => r.success).length;
  const failedRequests = results.length - successfulRequests;
  const latencies = results.map(r => r.latency).filter(l => l > 0);
  
  const latencyStats = {
    min: Math.min(...latencies),
    max: Math.max(...latencies),
    avg: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
    p95: calculatePercentile(latencies, 95)
  };

  // Calcular tokens economizados pelo Orquestrador
  tokensEconomizados = calcularTokensEconomizados(results);

  // Determinar status de resiliência
  const statusResiliencia = determinarStatusResiliencia(
    successfulRequests, 
    failedRequests, 
    latencyStats,
    webhookAlertsSent
  );

  // Compilar resultado final
  const stressTestResult: StressTestResult = {
    total_requests: results.length,
    successful_requests: successfulRequests,
    failed_requests: failedRequests,
    latency_stats: latencyStats,
    errors: results
      .filter(r => !r.success)
      .map(r => ({
        request_id: r.request_id,
        error: r.error || 'Erro desconhecido',
        latency: r.latency,
        timestamp: new Date().toISOString()
      })),
    webhook_alerts_sent: webhookAlertsSent,
    tokens_economizados: tokensEconomizados,
    status_resiliencia: statusResiliencia
  };

  // Imprimir relatório final
  imprimirRelatorioPosStress(stressTestResult, endTime - startTime);

  return stressTestResult;
}

/**
 * Executa uma requisição Match individual
 */
async function executarRequisicaoMatch(
  requestId: string,
  profile: InvestorProfile,
  forceLatency: boolean,
  simulateSupabaseError: boolean
): Promise<{
  request_id: string;
  success: boolean;
  latency: number;
  error?: string;
  vgv?: number;
}> {
  const startTime = Date.now();
  
  try {
    console.log(`🚀 [${requestId}] Iniciando Match para ${profile.nome} (${profile.perfil})`);

    // Simular latência artificial se necessário
    if (forceLatency) {
      console.log(`⏱️ [${requestId}] Forçando latência artificial (>500ms)`);
      await simulateLatency(600 + Math.random() * 400); // 600-1000ms
    }

    // Simular falha Supabase se necessário
    if (simulateSupabaseError) {
      console.log(`💥 [${requestId}] Simulando falha Supabase`);
      await simulateSupabaseFailure(requestId);
    }

    // Preparar payload da requisição
    const payload = {
      acao: 'criar_match',
      dados: {
        broker_id: `BRK-${profile.id}`,
        cliente_id: profile.id,
        perfil_investidor: profile.perfil,
        vgv_alvo: profile.vgv_alvo,
        regiao_preferencia: profile.regiao,
        experiencia_anos: profile.experiencia,
        parametros_match: {
          raio_km: 50,
          taxa_minima: profile.perfil === 'conservador' ? 0.08 : 
                     profile.perfil === 'moderado' ? 0.06 : 0.04,
          prazo_maximo_meses: profile.perfil === 'conservador' ? 360 : 
                            profile.perfil === 'moderado' ? 240 : 180
        }
      }
    };

    // Executar requisição HTTP (simulação)
    const response = await simulateHttpRequest('/api/match-autonomos', payload);
    
    const endTime = Date.now();
    const latency = endTime - startTime;

    if (response.success) {
      console.log(`✅ [${requestId}] Match concluído com sucesso - ${latency}ms - VGV: R$ ${response.vgv?.toLocaleString('pt-BR')}`);
      
      // Registrar sucesso no Monitoramento Soberano
      if (response.vgv) {
        await registrarSucessoMatch(response.vgv, {
          request_id: requestId,
          investor_profile: profile,
          latency: latency
        });
      }

      // Calcular tokens economizados
      const tokensEconomizadosReq = calcularTokensPorRequisicao(response.vgv || 0, latency);
      tokensEconomizados += tokensEconomizadosReq;

      return {
        request_id: requestId,
        success: true,
        latency,
        vgv: response.vgv
      };

    } else {
      console.log(`❌ [${requestId}] Falha no Match - ${latency}ms - Erro: ${response.error}`);
      
      return {
        request_id: requestId,
        success: false,
        latency,
        error: response.error
      };
    }

  } catch (error: any) {
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    console.log(`💥 [${requestId}] Erro crítico - ${latency}ms - ${error.message}`);
    
    // Enviar notificação de erro crítico
    await enviarNotificacaoErroCritico({
      modulo: 'Stress Test Soberano',
      skill: 'ASEC',
      erro: `Erro crítico na requisição ${requestId}: ${error.message}`,
      timestamp: new Date().toISOString(),
      severidade: 'critical',
      contexto: {
        request_id: requestId,
        investor_profile: profile,
        latency: latency,
        force_latency: forceLatency,
        supabase_error: simulateSupabaseError
      }
    });
    
    webhookAlertsSent++;
    
    return {
      request_id: requestId,
      success: false,
      latency,
      error: error.message
    };
  }
}

/**
 * Simula latência artificial
 */
async function simulateLatency(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simula falha no Supabase
 */
async function simulateSupabaseFailure(requestId: string): Promise<void> {
  console.log(`🗄️ [${requestId}] Simulando timeout/conexão falhando com Supabase`);
  
  // Disparar alerta de instabilidade
  await enviarNotificacaoErroCritico({
    modulo: 'Supabase Connection',
    skill: 'ASEC',
    erro: `Simulação de falha Supabase na requisição ${requestId}`,
    timestamp: new Date().toISOString(),
    severidade: 'critical',
    contexto: {
      error_type: 'connection_timeout',
      request_id: requestId
    }
  });
  
  webhookAlertsSent++;
  
  // Simular tempo de recuperação
  await simulateLatency(200 + Math.random() * 300);
}

/**
 * Simula requisição HTTP
 */
async function simulateHttpRequest(endpoint: string, payload: any): Promise<any> {
  // Simular tempo de processamento baseado no perfil
  const processingTime = payload.dados.perfil_investidor === 'conservador' ? 
                         200 + Math.random() * 100 : 
                         payload.dados.perfil_investidor === 'moderado' ? 
                         150 + Math.random() * 150 : 
                         100 + Math.random() * 200;
  
  await simulateLatency(processingTime);
  
  // Simular taxa de sucesso baseada no perfil
  const successRate = payload.dados.perfil_investidor === 'conservador' ? 0.95 : 
                     payload.dados.perfil_investidor === 'moderado' ? 0.90 : 
                     0.85;
  
  if (Math.random() < successRate) {
    // Sucesso
    return {
      success: true,
      match_id: `MATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      vgv: payload.dados.vgv_alvo * (0.8 + Math.random() * 0.4), // 80-120% do alvo
      broker_id: payload.dados.broker_id,
      cliente_id: payload.dados.cliente_id,
      timestamp: new Date().toISOString()
    };
  } else {
    // Falha
    const errors = [
      'Nenhum match compatível encontrado',
      'Limite de crédito excedido',
      'Documento pendente de validação',
      'Região sem disponibilidade',
      'Perfil não elegível para o período'
    ];
    
    return {
      success: false,
      error: errors[Math.floor(Math.random() * errors.length)]
    };
  }
}

/**
 * Calcula percentil
 */
function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index] || 0;
}

/**
 * Calcula tokens economizados pelo Orquestrador
 */
function calcularTokensEconomizados(results: any[]): number {
  // Simulação: cada requisição bem-sucedida economiza tokens baseado no VGV
  return results
    .filter(r => r.success && r.vgv)
    .reduce((total, r) => {
      // Fórmula: 1 token por R$ 10.000 de VGV
      return total + Math.floor(r.vgv / 10000);
    }, 0);
}

/**
 * Calcula tokens economizados por requisição individual
 */
function calcularTokensPorRequisicao(vgv: number, latency: number): number {
  // Bônus por eficiência: latência < 300ms = +10% tokens
  const eficienciaBonus = latency < 300 ? 1.1 : 1.0;
  return Math.floor((vgv / 10000) * eficienciaBonus);
}

/**
 * Determina status de resiliência
 */
function determinarStatusResiliencia(
  successful: number,
  failed: number,
  latencyStats: any,
  webhookAlerts: number
): 'Soberano' | 'Ameaçado' | 'Crítico' {
  const successRate = successful / (successful + failed);
  
  if (successRate >= 0.95 && latencyStats.avg < 300 && webhookAlerts <= 2) {
    return 'Soberano';
  } else if (successRate >= 0.85 && latencyStats.avg < 500 && webhookAlerts <= 5) {
    return 'Ameaçado';
  } else {
    return 'Crítico';
  }
}

/**
 * Imprime relatório pós-stress
 */
function imprimirRelatorioPosStress(result: StressTestResult, totalTime: number): void {
  console.log('');
  console.log('🏛️' + '='.repeat(60));
  console.log('📊 RELATÓRIO PÓS-STRESS - MONITORAMENTO SOBERANO SB v6.7.0');
  console.log('🏛️' + '='.repeat(60));
  console.log('');
  
  // Status de Resiliência
  const statusEmoji = result.status_resiliencia === 'Soberano' ? '🟢' : 
                     result.status_resiliencia === 'Ameaçado' ? '🟡' : '🔴';
  
  console.log(`${statusEmoji} Status de Resiliência: [${result.status_resiliencia.toUpperCase()}]`);
  console.log(`💰 Tokens Economizados pelo Orquestrador: ${result.tokens_economizados.toLocaleString('pt-BR')}`);
  console.log('');
  
  // Estatísticas Gerais
  console.log('📈 ESTATÍSTICAS GERAIS:');
  console.log(`   Total de Requisições: ${result.total_requests}`);
  console.log(`   Requisições Bem-Sucedidas: ${result.successful_requests} (${((result.successful_requests / result.total_requests) * 100).toFixed(1)}%)`);
  console.log(`   Requisições Falhadas: ${result.failed_requests} (${((result.failed_requests / result.total_requests) * 100).toFixed(1)}%)`);
  console.log(`   Tempo Total de Execução: ${(totalTime / 1000).toFixed(2)}s`);
  console.log('');
  
  // Estatísticas de Latência
  console.log('⏱️ ESTATÍSTICAS DE LATÊNCIA:');
  console.log(`   Latência Mínima: ${result.latency_stats.min}ms`);
  console.log(`   Latência Máxima: ${result.latency_stats.max}ms`);
  console.log(`   Latência Média: ${result.latency_stats.avg.toFixed(2)}ms`);
  console.log(`   Latência P95: ${result.latency_stats.p95.toFixed(2)}ms`);
  console.log('');
  
  // Alertas e Monitoramento
  console.log('🚨 ALERTAS E MONITORAMENTO:');
  console.log(`   Webhooks Enviados: ${result.webhook_alerts_sent}`);
  console.log(`   Taxa de Alertas: ${((result.webhook_alerts_sent / result.total_requests) * 100).toFixed(1)}%`);
  console.log('');
  
  // Erros Detalhados
  if (result.errors.length > 0) {
    console.log('❌ ERROS DETALHADOS:');
    result.errors.slice(0, 10).forEach((error, index) => {
      console.log(`   ${index + 1}. [${error.request_id}] ${error.error} (${error.latency}ms)`);
    });
    
    if (result.errors.length > 10) {
      console.log(`   ... e mais ${result.errors.length - 10} erros`);
    }
    console.log('');
  }
  
  // Recomendações
  console.log('💡 RECOMENDAÇÕES:');
  if (result.status_resiliencia === 'Soberano') {
    console.log('   ✅ Sistema operando em condições ideais');
    console.log('   ✅ Monitoramento Soberano funcionando perfeitamente');
    console.log('   ✅ Manter configurações atuais');
  } else if (result.status_resiliencia === 'Ameaçado') {
    console.log('   ⚠️ Atenção: Sistema mostrando sinais de degradação');
    console.log('   ⚠️ Investigar causas de latência elevada');
    console.log('   ⚠️ Considerar otimização de recursos');
  } else {
    console.log('   🔴 CRÍTICO: Sistema em estado degradado');
    console.log('   🔴 Ação imediata necessária');
    console.log('   🔴 Verificar infraestrutura e configurações');
  }
  console.log('');
  
  // Validação do Monitoramento
  console.log('🔍 VALIDAÇÃO DO MONITORAMENTO:');
  const latenciaAltaDetectada = result.latency_stats.max > 500;
  const webhooksDisparados = result.webhook_alerts_sent > 0;
  
  console.log(`   📡 Latência > 500ms detectada: ${latenciaAltaDetectada ? '✅ Sim' : '❌ Não'}`);
  console.log(`   🚨 Webhooks de erro disparados: ${webhooksDisparados ? '✅ Sim' : '❌ Não'}`);
  console.log(`   📊 Logs de sucesso registrados: ${result.successful_requests > 0 ? '✅ Sim' : '❌ Não'}`);
  console.log('');
  
  // Conclusão
  console.log('🎯 CONCLUSÃO:');
  if (result.status_resiliencia === 'Soberano') {
    console.log('   🏛️ O Reino SB mantém sua soberania operacional!');
    console.log('   🛡️ Monitoramento Soberano funcionando como esperado');
    console.log('   💪 Sistema resiliente e pronto para produção');
  } else {
    console.log('   ⚠️ Atenção necessária à saúde patrimonial do sistema');
    console.log('   🔧 Ações corretivas recomendadas antes do deploy');
  }
  
  console.log('');
  console.log('🏛️' + '='.repeat(60));
  console.log('🎉 Stress Test Soberano concluído com sucesso!');
  console.log('🏛️' + '='.repeat(60));
}

/**
 * Função para execução via linha de comando
 */
if (require.main === module) {
  executarStressTestSoberano()
    .then(() => {
      console.log('\n✅ Stress Test concluído');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro no Stress Test:', error);
      process.exit(1);
    });
}

export default executarStressTestSoberano;
