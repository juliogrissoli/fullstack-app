/**
 * 🏛️ MONITORAMENTO SOBERANO SB v6.7.0
 * Sistema de Monitoramento em Tempo Real para Saúde Patrimonial
 * 
 * Funcionalidades:
 * 1. Health Check Real-Time (Supabase + Resend)
 * 2. Notificação de Erro Crítico via Webhook
 * 3. Log de Sucesso (O Pulso) - a cada 100 transações
 * 4. Integração Vercel Edge Config
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { createHash } from 'crypto';

// Configurações
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const resendApiKey = process.env.RESEND_API_KEY!;
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL!;
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL!;
const emailComendador = process.env.EMAIL_COMENDADOR!;

// Interfaces
interface HealthCheckResult {
  supabase: {
    status: 'healthy' | 'degraded' | 'critical';
    latency: number;
    error?: string;
  };
  resend: {
    status: 'healthy' | 'degraded' | 'critical';
    latency: number;
    error?: string;
  };
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'critical';
}

interface CriticalErrorAlert {
  modulo: string;
  skill: string;
  erro: string;
  timestamp: string;
  contexto?: any;
  severidade: 'low' | 'medium' | 'high' | 'critical';
}

interface MatchSuccessLog {
  total_matches: number;
  vgv_processado: number;
  dizimo_reino_sb: number;
  timestamp: string;
  periodo: string;
}

interface ModuleStatus {
  [moduleName: string]: {
    enabled: boolean;
    reason?: string;
    lastToggled?: string;
  };
}

// Instâncias
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

// Contador global para transações Match
let matchTransactionCount = 0;
let lastSuccessLog: Date | null = null;

/**
 * 1. HEALTH CHECK REAL-TIME
 * Testa latência do Supabase e status da API Resend
 */
export async function healthCheckRealTime(): Promise<HealthCheckResult> {
  const timestamp = new Date().toISOString();
  
  // Teste Supabase
  const supabaseStart = Date.now();
  let supabaseStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  let supabaseError: string | undefined;
  
  try {
    const { error } = await supabase
      .from('health_check')
      .select('timestamp')
      .limit(1)
      .single();
    
    if (error) {
      supabaseStatus = 'critical';
      supabaseError = error.message;
    }
  } catch (error) {
    supabaseStatus = 'critical';
    supabaseError = error instanceof Error ? error.message : 'Erro desconhecido';
  }
  
  const supabaseLatency = Date.now() - supabaseStart;
  
  if (supabaseLatency > 1000) {
    supabaseStatus = 'critical';
  } else if (supabaseLatency > 500) {
    supabaseStatus = 'degraded';
  }
  
  // Teste Resend
  const resendStart = Date.now();
  let resendStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  let resendError: string | undefined;
  
  try {
    // Teste simples de verificação de API
    const response = await fetch('https://api.resend.com/domains', {
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      resendStatus = 'critical';
      resendError = `HTTP ${response.status}`;
    }
  } catch (error) {
    resendStatus = 'critical';
    resendError = error instanceof Error ? error.message : 'Erro de conexão';
  }
  
  const resendLatency = Date.now() - resendStart;
  
  if (resendLatency > 1000) {
    resendStatus = 'critical';
  } else if (resendLatency > 500) {
    resendStatus = 'degraded';
  }
  
  // Status geral
  const overall: 'healthy' | 'degraded' | 'critical' = 
    supabaseStatus === 'critical' || resendStatus === 'critical' ? 'critical' :
    supabaseStatus === 'degraded' || resendStatus === 'degraded' ? 'degraded' : 'healthy';
  
  const result: HealthCheckResult = {
    supabase: {
      status: supabaseStatus,
      latency: supabaseLatency,
      error: supabaseError
    },
    resend: {
      status: resendStatus,
      latency: resendLatency,
      error: resendError
    },
    timestamp,
    overall
  };
  
  // Registrar alerta se necessário
  if (overall !== 'healthy') {
    await registrarAlertaInstabilidade(result);
  }
  
  return result;
}

/**
 * Registra alerta de instabilidade no Log ASEC
 */
async function registrarAlertaInstabilidade(healthResult: HealthCheckResult): Promise<void> {
  try {
    const alertMessage = `🚨 ALERTA DE INSTABILIDADE PATRIMONIAL
📊 Status Geral: ${healthResult.overall.toUpperCase()}
🗄️ Supabase: ${healthResult.supabase.status} (${healthResult.supabase.latency}ms)
📧 Resend: ${healthResult.resend.status} (${healthResult.resend.latency}ms)
⏰ Timestamp: ${healthResult.timestamp}
${healthResult.supabase.error ? `❌ Supabase Error: ${healthResult.supabase.error}` : ''}
${healthResult.resend.error ? `❌ Resend Error: ${healthResult.resend.error}` : ''}`;

    await supabase
      .from('logs_asec')
      .insert({
        tipo_alerta: 'instabilidade_patrimonial',
        severidade: healthResult.overhead === 'critical' ? 'critical' : 'warning',
        mensagem: alertMessage,
        dados_tecnicos: healthResult,
        timestamp: new Date().toISOString(),
        skill: 'ASEC',
        modulo: 'monitoramento_soberano'
      });
    
    // Enviar notificação crítica
    await enviarNotificacaoErroCritico({
      modulo: 'Monitoramento Soberano',
      skill: 'ASEC',
      erro: `Instabilidade Patrimonial Detectada - Status: ${healthResult.overall}`,
      timestamp: healthResult.timestamp,
      severidade: healthResult.overall === 'critical' ? 'critical' : 'high'
    });
    
  } catch (error) {
    console.error('❌ Falha ao registrar alerta de instabilidade:', error);
  }
}

/**
 * 2. NOTIFICAÇÃO DE ERRO CRÍTICO
 * Envia alertas via Discord/Slack Webhook
 */
export async function enviarNotificacaoErroCritico(alert: CriticalErrorAlert): Promise<void> {
  const webhookUrl = discordWebhookUrl || slackWebhookUrl;
  if (!webhookUrl) {
    console.warn('⚠️ Nenhum webhook configurado para notificações críticas');
    return;
  }
  
  const isDiscord = webhookUrl.includes('discord.com');
  
  let payload: any;
  
  if (isDiscord) {
    // Formato Discord
    payload = {
      embeds: [{
        title: '🚨 ERRO CRÍTICO DETECTADO',
        color: alert.severidade === 'critical' ? 0xFF0000 : 
               alert.severidade === 'high' ? 0xFF6600 : 
               alert.severidade === 'medium' ? 0xFFFF00 : 0x00FF00,
        fields: [
          {
            name: '🏛️ Módulo',
            value: alert.modulo,
            inline: true
          },
          {
            name: '⚡ Skill',
            value: alert.skill,
            inline: true
          },
          {
            name: '🔥 Severidade',
            value: alert.severidade.toUpperCase(),
            inline: true
          },
          {
            name: '❌ Erro',
            value: `\`\`\`${alert.erro}\`\`\``,
            inline: false
          },
          {
            name: '⏰ Timestamp',
            value: alert.timestamp,
            inline: true
          }
        ],
        footer: {
          text: 'Sistema de Monitoramento Soberano SB v6.7.0'
        },
        timestamp: alert.timestamp
      }]
    };
  } else {
    // Formato Slack
    payload = {
      text: '🚨 ERRO CRÍTICO DETECTADO',
      attachments: [{
        color: alert.severidade === 'critical' ? 'danger' : 
               alert.severidade === 'high' ? 'warning' : 'good',
        fields: [
          {
            title: '🏛️ Módulo',
            value: alert.modulo,
            short: true
          },
          {
            title: '⚡ Skill',
            value: alert.skill,
            short: true
          },
          {
            title: '🔥 Severidade',
            value: alert.severidade.toUpperCase(),
            short: true
          },
          {
            title: '❌ Erro',
            value: alert.erro,
            short: false
          },
          {
            title: '⏰ Timestamp',
            value: alert.timestamp,
            short: true
          }
        ],
        footer: 'Sistema de Monitoramento Soberano SB v6.7.0',
        ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
      }]
    };
  }
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Webhook response: ${response.status} ${response.statusText}`);
    }
    
    console.log(`✅ Notificação crítica enviada para ${isDiscord ? 'Discord' : 'Slack'}`);
    
  } catch (error) {
    console.error('❌ Falha ao enviar notificação crítica:', error);
  }
}

/**
 * 3. LOG DE SUCESSO (O PULSO)
 * Registra e envia resumo a cada 100 transações Match
 */
export async function registrarSucessoMatch(vgv: number, detalhes?: any): Promise<void> {
  matchTransactionCount++;
  
  // Calcular dízimo (10% para Reino SB)
  const dizimoReinoSB = vgv * 0.1;
  
  // Registrar transação individual
  await supabase
    .from('transacoes_match_sucesso')
    .insert({
      vgv,
      dizimo_reino_sb: dizimoReinoSB,
      timestamp: new Date().toISOString(),
      detalhes
    });
  
  // Verificar se atingiu 100 transações
  if (matchTransactionCount % 100 === 0) {
    await enviarResumoSucesso();
  }
}

/**
 * Envia resumo de sucesso para o Comendador
 */
async function enviarResumoSucesso(): Promise<void> {
  try {
    const periodo = lastSuccessLog 
      ? `Últimas 100 transações desde ${lastSuccessLog.toLocaleString('pt-BR')}`
      : 'Primeiras 100 transações';
    
    // Buscar estatísticas do período
    const { data: stats } = await supabase
      .from('transacoes_match_sucesso')
      .select('vgv, dizimo_reino_sb')
      .order('timestamp', { ascending: false })
      .limit(100);
    
    if (!stats || stats.length === 0) {
      console.warn('⚠️ Nenhuma estatística encontrada para o resumo');
      return;
    }
    
    const totalVGV = stats.reduce((sum, t) => sum + t.vgv, 0);
    const totalDizimo = stats.reduce((sum, t) => sum + t.dizimo_reino_sb, 0);
    
    const logSucesso: MatchSuccessLog = {
      total_matches: stats.length,
      vgv_processado: totalVGV,
      dizimo_reino_sb: totalDizimo,
      timestamp: new Date().toISOString(),
      periodo
    };
    
    // Enviar e-mail para o Comendador
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>🏛️ PULSO DO REINO SB - Resumo de Transações</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #FFD700, #FFA500); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin: 0; font-size: 28px;">🏛️ PULSO DO REINO SB</h1>
          <p style="color: #1a1a1a; margin: 10px 0; font-size: 16px;">Relatório de Transações Match com Sucesso</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">📊 Estatísticas do Período</h2>
          <p style="color: #666; margin: 5px 0;"><strong>Período:</strong> ${logSucesso.periodo}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Total de Matches:</strong> ${logSucesso.total_matches}</p>
          <p style="color: #666; margin: 5px 0;"><strong>VGV Processado:</strong> R$ ${logSucesso.vgv_processado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Dízimo Reino SB:</strong> R$ ${logSucesso.dizimo_reino_sb.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
          <h3 style="color: #155724; margin-top: 0;">✅ Saúde do Sistema</h3>
          <p style="color: #155724; margin: 5px 0;">Todas as transações foram processadas com sucesso!</p>
          <p style="color: #155724; margin: 5px 0;">O Reino SB continua prosperando com estabilidade patrimonial.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f1f3f4; border-radius: 8px;">
          <p style="color: #666; margin: 0; font-size: 14px;">Gerado automaticamente pelo Sistema de Monitoramento Soberano SB v6.7.0</p>
          <p style="color: #666; margin: 5px 0 0 0; font-size: 12px;">Timestamp: ${logSucesso.timestamp}</p>
        </div>
      </body>
      </html>
    `;
    
    await resend.emails.send({
      from: 'monitoramento@reino-sb.systems',
      to: [emailComendador],
      subject: `🏛️ PULSO DO REINO SB - ${logSucesso.total_matches} Transações Processadas`,
      html: emailHtml
    });
    
    // Registrar no log ASEC
    await supabase
      .from('logs_asec')
      .insert({
        tipo_alerta: 'pulso_sucesso',
        severidade: 'info',
        mensagem: `🎉 PULSO DO REINO: ${logSucesso.total_matches} matches processados - VGV: R$ ${logSucesso.vgv_processado.toLocaleString('pt-BR')} - Dízimo: R$ ${logSucesso.dizimo_reino_sb.toLocaleString('pt-BR')}`,
        dados_tecnicos: logSucesso,
        timestamp: new Date().toISOString(),
        skill: 'ASEC',
        modulo: 'monitoramento_soberano'
      });
    
    lastSuccessLog = new Date();
    console.log(`✅ Resumo de sucesso enviado - ${logSucesso.total_matches} transações processadas`);
    
  } catch (error) {
    console.error('❌ Falha ao enviar resumo de sucesso:', error);
  }
}

/**
 * 4. INTEGRAÇÃO VERCEL EDGE CONFIG
 * Controle de módulos via Dashboard Vercel
 */
export async function verificarStatusModulo(moduleName: string): Promise<boolean> {
  try {
    // Simular verificação com Vercel Edge Config
    // Em produção, isso usaria @vercel/edge-config
    const edgeConfig = await getEdgeConfig();
    
    return edgeConfig.modules[moduleName]?.enabled ?? true;
    
  } catch (error) {
    console.warn(`⚠️ Falha ao verificar status do módulo ${moduleName}:`, error);
    return true; // Default: habilitado
  }
}

/**
 * Obtém configuração do Edge (simulação)
 */
async function getEdgeConfig(): Promise<{ modules: ModuleStatus }> {
  // Simulação - em produção usaria Vercel Edge Config real
  return {
    modules: {
      'match-autonomos': { enabled: true },
      'match-sb': { enabled: true },
      'match-areas': { enabled: true },
      'conversion-engine-asec': { enabled: true },
      'ouroboros-2.0': { enabled: true },
      'global-standard-gates-musk': { enabled: true },
      'golden-master': { enabled: true },
      'mercado-secundario': { enabled: true }
    }
  };
}

/**
 * Desabilita módulo via Edge Config
 */
export async function desabilitarModulo(moduleName: string, reason?: string): Promise<void> {
  try {
    // Em produção, isso atualizaria o Edge Config
    console.log(`🔧 Módulo ${moduleName} desabilitado: ${reason || 'Sem motivo especificado'}`);
    
    // Registrar alteração
    await supabase
      .from('logs_modulos')
      .insert({
        nome_modulo: moduleName,
        acao: 'desabilitar',
        motivo: reason,
        timestamp: new Date().toISOString(),
        origem: 'edge_config'
      });
    
  } catch (error) {
    console.error(`❌ Falha ao desabilitar módulo ${moduleName}:`, error);
  }
}

/**
 * Habilita módulo via Edge Config
 */
export async function habilitarModulo(moduleName: string, reason?: string): Promise<void> {
  try {
    // Em produção, isso atualizaria o Edge Config
    console.log(`🔧 Módulo ${moduleName} habilitado: ${reason || 'Sem motivo especificado'}`);
    
    // Registrar alteração
    await supabase
      .from('logs_modulos')
      .insert({
        nome_modulo: moduleName,
        acao: 'habilitar',
        motivo: reason,
        timestamp: new Date().toISOString(),
        origem: 'edge_config'
      });
    
  } catch (error) {
    console.error(`❌ Falha ao habilitar módulo ${moduleName}:`, error);
  }
}

/**
 * Middleware para verificar status do módulo antes de executar
 */
export function withModuleCheck(moduleName: string) {
  return async (handler: Function) => {
    const moduleEnabled = await verificarStatusModulo(moduleName);
    
    if (!moduleEnabled) {
      throw new Error(`Módulo ${moduleName} está temporariamente desabilitado para manutenção`);
    }
    
    return handler();
  };
}

/**
 * Função principal de monitoramento contínuo
 */
export async function iniciarMonitoramentoContinuo(): Promise<void> {
  console.log('🏛️ Iniciando Monitoramento Soberano SB v6.7.0');
  
  // Health check a cada 30 segundos
  setInterval(async () => {
    await healthCheckRealTime();
  }, 30000);
  
  console.log('✅ Monitoramento contínuo iniciado');
}

// Exportações
export default {
  healthCheckRealTime,
  enviarNotificacaoErroCritico,
  registrarSucessoMatch,
  verificarStatusModulo,
  desabilitarModulo,
  habilitarModulo,
  withModuleCheck,
  iniciarMonitoramentoContinuo
};
