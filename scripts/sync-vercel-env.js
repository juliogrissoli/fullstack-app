#!/usr/bin/env node

/**
 * 🏛️ SECURITY BROKER SB - VERCEL ENV SYNC SCRIPT
 * 
 * Script para sincronizar variáveis de ambiente críticas com Vercel
 * e resolver status Crítico para Soberano
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configurações críticas
const CRITICAL_ENV_VARS = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'URL do Supabase',
    required: true,
    currentValue: process.env.NEXT_PUBLIC_SUPABASE_URL
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Service Role Key do Supabase',
    required: true,
    currentValue: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Anonymous Key do Supabase',
    required: true,
    currentValue: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  },
  {
    name: 'RESEND_API_KEY',
    description: 'API Key do Resend',
    required: true,
    currentValue: process.env.RESEND_API_KEY
  },
  {
    name: 'STRIPE_SECRET_KEY',
    description: 'Secret Key do Stripe',
    required: true,
    currentValue: process.env.STRIPE_SECRET_KEY
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    description: 'Webhook Secret do Stripe',
    required: true,
    currentValue: process.env.STRIPE_WEBHOOK_SECRET
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    description: 'URL pública da aplicação',
    required: true,
    currentValue: process.env.NEXT_PUBLIC_APP_URL
  },
  {
    name: 'JWT_SECRET',
    description: 'Secret para JWT',
    required: true,
    currentValue: process.env.JWT_SECRET
  },
  {
    name: 'ENCRYPTION_KEY',
    description: 'Chave de criptografia (32 chars)',
    required: true,
    currentValue: process.env.ENCRYPTION_KEY
  }
];

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️ ${message}`, 'cyan');
}

/**
 * Verifica se Vercel CLI está instalado
 */
function checkVercelCLI() {
  try {
    execSync('vercel --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    logError('Vercel CLI não está instalado');
    logInfo('Instale com: npm i -g vercel');
    return false;
  }
}

/**
 * Verifica variáveis de ambiente locais
 */
function checkLocalEnvVars() {
  log('\n🔍 VERIFICANDO VARIÁVEIS DE AMBIENTE LOCAIS', 'bright');
  log('=' .repeat(60));
  
  const missingVars = [];
  const placeholderVars = [];
  
  CRITICAL_ENV_VARS.forEach(variable => {
    const isMissing = !variable.currentValue;
    const isPlaceholder = variable.currentValue && (
      variable.currentValue.includes('PLACEHOLDER') ||
      variable.currentValue.includes('your_') ||
      variable.currentValue.includes('SECRET_KEY_PLACEHOLDER')
    );
    
    if (isMissing) {
      missingVars.push(variable.name);
      logError(`❌ ${variable.name}: NÃO DEFINIDA`);
    } else if (isPlaceholder) {
      placeholderVars.push(variable.name);
      logWarning(`⚠️ ${variable.name}: PLACEHOLDER DETECTADO`);
    } else {
      logSuccess(`✅ ${variable.name}: CONFIGURADA`);
    }
    
    log(`   ${variable.description}`, 'white');
  });
  
  return { missingVars, placeholderVars };
}

/**
 * Gera arquivo .env.production
 */
function generateProductionEnv() {
  log('\n📝 GERANDO .ENV.PRODUCTION', 'bright');
  log('=' .repeat(60));
  
  let envContent = '# 🏛️ SECURITY BROKER SB - PRODUCTION ENVIRONMENT\n';
  envContent += '# Gerado automaticamente em ' + new Date().toISOString() + '\n\n';
  
  CRITICAL_ENV_VARS.forEach(variable => {
    const value = variable.currentValue;
    if (value && !value.includes('PLACEHOLDER') && !value.includes('your_')) {
      envContent += `${variable.name}=${value}\n`;
    }
  });
  
  fs.writeFileSync('.env.production', envContent);
  logSuccess('Arquivo .env.production gerado com sucesso');
}

/**
 * Sincroniza variáveis com Vercel
 */
function syncWithVercel() {
  log('\n🚀 SINCRONIZANDO COM VERCEL', 'bright');
  log('=' .repeat(60));
  
  try {
    // Verificar se está logado no Vercel
    execSync('vercel whoami', { stdio: 'pipe' });
    
    // Sincronizar variáveis de ambiente
    const syncCommand = 'vercel env pull .env.production';
    logInfo(`Executando: ${syncCommand}`);
    
    execSync(syncCommand, { stdio: 'inherit' });
    
    logSuccess('Variáveis sincronizadas com Vercel');
    
    // Fazer deploy para aplicar as variáveis
    log('\n🌐 FAZENDO DEPLOY PARA APLICAR VARIÁVEIS', 'bright');
    log('=' .repeat(60));
    
    execSync('vercel --prod', { stdio: 'inherit' });
    
    logSuccess('Deploy realizado com sucesso!');
    
  } catch (error) {
    logError('Erro na sincronização com Vercel: ' + error.message);
    logInfo('Verifique se está logado: vercel login');
    logInfo('Verifique se está no diretório correto do projeto');
  }
}

/**
 * Testa conexões após sincronização
 */
function testConnections() {
  log('\n🧪 TESTANDO CONEXÕES PÓS-SYNC', 'bright');
  log('=' .repeat(60));
  
  try {
    // Testar system-check
    logInfo('Testando system-check...');
    const systemCheckResponse = execSync('curl -s http://localhost:3000/api/admin/system-check', { 
      encoding: 'utf8',
      timeout: 30000
    });
    
    const systemCheck = JSON.parse(systemCheckResponse);
    
    if (systemCheck.status === 'Soberano') {
      logSuccess('🏛️ SISTEMA EM MODO SOBERANO!');
      logSuccess('Todas as conexões estão operacionais');
    } else if (systemCheck.status === 'Parcial') {
      logWarning('⚠️ SISTEMA EM MODO PARCIAL');
      logInfo('Algumas conexões podem precisar de atenção');
    } else {
      logError('❌ SISTEMA AINDA EM MODO CRÍTICO');
      logInfo('Verifique os logs para mais detalhes');
    }
    
    // Mostrar detalhes do system-check
    log('\n📊 DETALHES DO SYSTEM-CHECK', 'bright');
    log('-'.repeat(40));
    
    Object.entries(systemCheck.infra).forEach(([component, status]) => {
      const statusIcon = status.status === 'ok' ? '✅' : 
                        status.status === 'error' ? '❌' : '⚠️';
      log(`${statusIcon} ${component.toUpperCase()}: ${status.details}`);
    });
    
  } catch (error) {
    logError('Erro ao testar conexões: ' + error.message);
    logInfo('Verifique se o servidor está rodando em localhost:3000');
  }
}

/**
 * Função principal
 */
function main() {
  log('\n🏛️ SECURITY BROKER SB - VERCEL ENV SYNC', 'bright');
  log('=' .repeat(60));
  log('Script para resolver status Crítico → Soberano', 'cyan');
  log('Data: ' + new Date().toLocaleString('pt-BR'));
  
  // 1. Verificar Vercel CLI
  if (!checkVercelCLI()) {
    process.exit(1);
  }
  
  // 2. Verificar variáveis locais
  const { missingVars, placeholderVars } = checkLocalEnvVars();
  
  if (missingVars.length > 0) {
    logError(`\n❌ VARIÁVEIS FALTANTES: ${missingVars.join(', ')}`);
    logInfo('Configure as variáveis no .env.local antes de continuar');
    process.exit(1);
  }
  
  if (placeholderVars.length > 0) {
    logWarning(`\n⚠️ VARIÁVEIS COM PLACEHOLDER: ${placeholderVars.join(', ')}`);
    logInfo('Substitua os PLACEHOLDER pelos valores reais antes do deploy');
  }
  
  // 3. Gerar .env.production
  generateProductionEnv();
  
  // 4. Sincronizar com Vercel
  syncWithVercel();
  
  // 5. Testar conexões
  testConnections();
  
  log('\n🎯 PROCESSO CONCLUÍDO', 'bright');
  log('=' .repeat(60));
  logSuccess('O SB Imperium deve estar em modo Soberano!');
  logInfo('Acesse: https://imobai-psi.vercel.app/api/admin/system-check');
}

// Executar script
if (require.main === module) {
  main();
}

module.exports = {
  checkLocalEnvVars,
  generateProductionEnv,
  syncWithVercel,
  testConnections
};
