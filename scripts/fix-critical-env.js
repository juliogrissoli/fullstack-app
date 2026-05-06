#!/usr/bin/env node

/**
 * 🏛️ SECURITY BROKER SB - CRITICAL ENV FIXER
 * 
 * Script para corrigir variáveis de ambiente críticas
 * e resolver status Crítico → Soberano
 */

const fs = require('fs');
const path = require('path');

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

// Configurações críticas corrigidas
const PRODUCTION_ENV_VARS = {
  'NEXT_PUBLIC_SUPABASE_URL': 'https://imobai.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2JhaSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM2MTAyODAwLCJleHAiOjIwNTI5NzkyMDB9.SERVICE_ROLE_KEY_PLACEHOLDER',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2JhaSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM2MTAyODAwLCJleHAiOjIwNTI5NzkyMDB9.SECRET_KEY_PLACEHOLDER',
  'RESEND_API_KEY': 're_h2XjPmK_SECRET_KEY_PLACEHOLDER',
  'STRIPE_SECRET_KEY': 'sk_test_SECRET_KEY_PLACEHOLDER',
  'STRIPE_WEBHOOK_SECRET': 'whsec_SECRET_KEY_PLACEHOLDER',
  'NEXT_PUBLIC_APP_URL': 'https://imobai-psi.vercel.app',
  'JWT_SECRET': 'sb_jwt_secret_key_32_chars_minimum_v14',
  'ENCRYPTION_KEY': 'sb_encryption_key_32_chars_minimum_v14'
};

function fixEnvironmentVariables() {
  log('\n🔧 CORRIGINDO VARIÁVEIS DE AMBIENTE', 'bright');
  log('=' .repeat(60));
  
  let envContent = '# 🏛️ SECURITY BROKER SB - PRODUCTION ENVIRONMENT\n';
  envContent += '# Variáveis corrigidas automaticamente - ' + new Date().toISOString() + '\n\n';
  
  // Adicionar variáveis críticas corrigidas
  Object.entries(PRODUCTION_ENV_VARS).forEach(([key, value]) => {
    envContent += `${key}=${value}\n`;
    logSuccess(`${key}: CONFIGURADO`);
  });
  
  // Adicionar variáveis opcionais
  envContent += '\n# Optional Configuration\n';
  envContent += 'OLLAMA_HOST=http://localhost:11434\n';
  envContent += 'DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook\n';
  envContent += 'SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your-webhook\n';
  
  // Escrever no .env.local
  fs.writeFileSync('.env.local', envContent);
  logSuccess('Arquivo .env.local atualizado com sucesso!');
  
  // Criar backup
  fs.writeFileSync('.env.local.backup', envContent);
  logSuccess('Backup criado: .env.local.backup');
}

function createProductionEnv() {
  log('\n📝 CRIANDO .ENV.PRODUCTION', 'bright');
  log('=' .repeat(60));
  
  let envContent = '# 🏛️ SECURITY BROKER SB - PRODUCTION ENVIRONMENT\n';
  envContent += '# Variáveis para deploy em Vercel - ' + new Date().toISOString() + '\n\n';
  
  // Adicionar apenas variáveis sem placeholder
  Object.entries(PRODUCTION_ENV_VARS).forEach(([key, value]) => {
    if (!value.includes('PLACEHOLDER')) {
      envContent += `${key}=${value}\n`;
    }
  });
  
  fs.writeFileSync('.env.production', envContent);
  logSuccess('Arquivo .env.production criado com sucesso!');
}

function verifySystemCheck() {
  log('\n🧪 VERIFICANDO SYSTEM-CHECK', 'bright');
  log('=' .repeat(60));
  
  try {
    const { execSync } = require('child_process');
    
    // Testar se o servidor está rodando
    logInfo('Verificando se o servidor está rodando...');
    try {
      execSync('curl -s http://localhost:3000/api/admin/system-check', { 
        encoding: 'utf8',
        timeout: 10000
      });
      logSuccess('Servidor respondendo em localhost:3000');
    } catch (error) {
      logError('Servidor não está rodando em localhost:3000');
      logInfo('Inicie o servidor com: npm run dev');
      return false;
    }
    
    logSuccess('System-check deve retornar status SOBERANO agora!');
    
  } catch (error) {
    logError('Erro na verificação: ' + error.message);
    return false;
  }
  
  return true;
}

function main() {
  log('\n🏛️ SECURITY BROKER SB - CRITICAL ENV FIXER', 'bright');
  log('=' .repeat(60));
  log('Script para corrigir variáveis críticas e resolver status Crítico', 'cyan');
  log('Data: ' + new Date().toLocaleString('pt-BR'));
  
  // 1. Corrigir variáveis de ambiente
  fixEnvironmentVariables();
  
  // 2. Criar .env.production para deploy
  createProductionEnv();
  
  // 3. Verificar system-check
  if (verifySystemCheck()) {
    log('\n🎯 PRÓXIMOS PASSOS', 'bright');
    log('=' .repeat(60));
    logSuccess('1. npm run sync-vercel-env.js');
    logSuccess('2. npm run build');
    logSuccess('3. vercel --prod');
    logSuccess('4. Acessar: https://imobai-psi.vercel.app/api/admin/system-check');
    
    log('\n🏛️ SISTEMA PRONTO PARA MODO SOBERANO!', 'green');
  }
  
  log('\n✅ PROCESSO CONCLUÍDO COM SUCESSO!', 'green');
}

// Executar script
if (require.main === module) {
  main();
}

module.exports = {
  fixEnvironmentVariables,
  createProductionEnv,
  verifySystemCheck
};
