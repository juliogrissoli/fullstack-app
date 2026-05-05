#!/usr/bin/env node

/**
 * 🏛️ EXECUTOR DO STRESS TEST SOBERANO SB v6.7.0
 * 
 * Script para execução do stress test via linha de comando
 * Uso: npm run stress-test
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🏛️ Iniciando executor do Stress Test Soberano SB v6.7.0');
console.log('='.repeat(60));

try {
  // Verificar se as variáveis de ambiente necessárias estão definidas
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RESEND_API_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('⚠️ Variáveis de ambiente ausentes:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('');
    console.log('💡 O stress test será executado em modo simulação');
    console.log('   Para funcionamento completo, configure as variáveis acima');
    console.log('');
  }
  
  // Executar o stress test
  console.log('🚀 Executando stress test...');
  console.log('');
  
  const scriptPath = path.join(__dirname, 'stress-test-soberano.ts');
  
  try {
    // Tentar executar com tsx
    execSync(`npx tsx "${scriptPath}"`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (tsxError) {
    console.log('⚠️ tsx não disponível, tentando com ts-node...');
    
    try {
      // Tentar com ts-node
      execSync(`npx ts-node "${scriptPath}"`, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } catch (tsNodeError) {
      console.log('⚠️ ts-node não disponível, tentando compilação manual...');
      
      try {
        // Compilar e executar com tsc
        execSync(`npx tsc "${scriptPath}" --outDir ./dist --target es2020 --module commonjs`, { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        
        const compiledScript = scriptPath.replace('.ts', '.js').replace('src/scripts', 'dist/scripts');
        execSync(`node "${compiledScript}"`, { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        
      } catch (tscError) {
        console.error('❌ Não foi possível executar o stress test');
        console.error('💡 Instale tsx ou ts-node: npm install -g tsx');
        console.error('💡 Ou use: npx tsx src/scripts/stress-test-soberano.ts');
        process.exit(1);
      }
    }
  }
  
} catch (error) {
  console.error('❌ Erro na execução do stress test:', error.message);
  process.exit(1);
}

console.log('');
console.log('✅ Stress Test concluído!');
console.log('🏛️ Sistema Soberano SB validado com sucesso!');
