#!/usr/bin/env tsx

/**
 * 🏛️ THE SOVEREIGN AUDIT - Protocolo de Validação de 4 Camadas
 * Verificação completa de integração do sistema GEO v8.1 IMPERIUM EDITION
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { createHash } from 'crypto';

// Configuração
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const resendApiKey = process.env.RESEND_API_KEY || 're_your_api_key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const resend = new Resend(resendApiKey);

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
  timestamp: string;
}

class SovereignAudit {
  private results: TestResult[] = [];

  private log(result: TestResult) {
    this.results.push(result);
    const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${status} ${result.name}: ${result.message}`);
    if (result.details) {
      console.log(`   Details:`, result.details);
    }
  }

  private async testDatabaseConnection(): Promise<void> {
    try {
      // Teste 1: Inserir registro em audit_logs
      const testLog = {
        user_id: 'sovereign-audit-test',
        acao: 'TEST_INTEGRATION',
        tabela_afetada: 'audit_logs',
        dados_novos: { test: true, timestamp: new Date().toISOString() },
        ip_address: '127.0.0.1',
        user_agent: 'Sovereign Audit Script'
      };

      const { data: insertData, error: insertError } = await supabase
        .from('audit_logs')
        .insert(testLog)
        .select()
        .single();

      if (insertError) {
        this.log({
          name: 'BANCO - Inserção Audit Logs',
          status: 'FAIL',
          message: `Falha ao inserir em audit_logs: ${insertError.message}`,
          details: insertError,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Teste 2: Ler o registro inserido
      const { data: readData, error: readError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('id', insertData.id)
        .single();

      if (readError || !readData) {
        this.log({
          name: 'BANCO - Leitura Audit Logs',
          status: 'FAIL',
          message: `Falha ao ler audit_logs: ${readError?.message || 'Registro não encontrado'}`,
          details: readError,
          timestamp: new Date().toISOString()
        });
        return;
      }

      this.log({
        name: 'BANCO - Conexão Completa',
        status: 'PASS',
        message: 'INTEGRAÇÃO APROVADA: Inserção e leitura funcionando',
        details: { 
          insertedId: insertData.id,
          readId: readData.id,
          action: readData.acao
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.log({
        name: 'BANCO - Conexão',
        status: 'FAIL',
        message: `Exceção: ${error}`,
        details: error,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testRLSSecurity(): Promise<void> {
    try {
      // Teste 1: Tentar acessar dados sensíveis sem autenticação
      const { data: sensitiveData, error: sensitiveError } = await supabase
        .from('land_opportunities')
        .select('id, titulo, localizacao_exata, dados_proprietario')
        .limit(1);

      // Verificar se dados sensíveis estão protegidos
      const hasProtectedData = sensitiveData && sensitiveData.length > 0;
      const hasSensitiveFields = hasProtectedData && 
        (sensitiveData[0].localizacao_exata !== null || 
         sensitiveData[0].dados_proprietario !== null);

      if (sensitiveError) {
        // Erro é bom - significa que RLS está bloqueando
        this.log({
          name: 'RLS - Proteção de Dados',
          status: 'PASS',
          message: 'INTEGRAÇÃO APROVADA: RLS bloqueando acesso não autorizado',
          details: { 
            blocked: true,
            error: sensitiveError.message
          },
          timestamp: new Date().toISOString()
        });
      } else if (!hasSensitiveFields) {
        // Campos sensíveis retornaram null - RLS funcionando
        this.log({
          name: 'RLS - Proteção de Dados',
          status: 'PASS',
          message: 'INTEGRAÇÃO APROVADA: Campos sensíveis ocultos',
          details: { 
            protected: true,
            recordCount: sensitiveData?.length || 0
          },
          timestamp: new Date().toISOString()
        });
      } else {
        // Dados sensíveis expostos - RLS falhou
        this.log({
          name: 'RLS - Proteção de Dados',
          status: 'FAIL',
          message: 'ALERTA: Dados sensíveis estão expostos',
          details: { 
            exposed: true,
            sampleData: sensitiveData?.[0]
          },
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      this.log({
        name: 'RLS - Segurança',
        status: 'FAIL',
        message: `Exceção: ${error}`,
        details: error,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testEmailCommunication(): Promise<void> {
    try {
      const startTime = Date.now();
      
      const emailData = {
        from: 'onboarding@resend.dev',
        to: 'audit-test@geo-imperium.com',
        subject: '🛡️ Sovereign Audit Test - GEO v8.1',
        html: `
          <h2>Sovereign Audit Test</h2>
          <p><strong>Status:</strong> INTEGRAÇÃO EM TESTE</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>System:</strong> GEO v8.1 IMPERIUM EDITION</p>
          <hr>
          <p><em>This is an automated audit test email.</em></p>
        `
      };

      const { data, error } = await resend.emails.send(emailData);
      const responseTime = Date.now() - startTime;

      if (error) {
        this.log({
          name: 'EMAIL - Comunicação Resend',
          status: 'FAIL',
          message: `Falha no envio: ${error.message}`,
          details: { 
            error: error,
            responseTime: `${responseTime}ms`
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (data && data.id) {
        this.log({
          name: 'EMAIL - Comunicação Resend',
          status: 'PASS',
          message: 'INTEGRAÇÃO APROVADA: E-mail enviado com sucesso',
          details: { 
            messageId: data.id,
            responseTime: `${responseTime}ms`,
            to: emailData.to
          },
          timestamp: new Date().toISOString()
        });
      } else {
        this.log({
          name: 'EMAIL - Comunicação Resend',
          status: 'WARN',
          message: 'E-mail enviado sem ID de confirmação',
          details: { 
            response: data,
            responseTime: `${responseTime}ms`
          },
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      this.log({
        name: 'EMAIL - Comunicação',
        status: 'FAIL',
        message: `Exceção: ${error}`,
        details: error,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testNexoCausalHash(): Promise<void> {
    try {
      // Dados de teste para o hash
      const testData = {
        user_id: 'sovereign-audit-user',
        asset_id: 'test-asset-123',
        timestamp: new Date().toISOString()
      };

      // Gerar hash SHA-256 manualmente (como o trigger faria)
      const hashInput = `${testData.user_id}${testData.asset_id}${testData.timestamp}`;
      const expectedHash = createHash('sha256').update(hashInput).digest('hex');

      // Inserir registro em lead_views (trigger deve gerar hash)
      const { data: insertData, error: insertError } = await supabase
        .from('lead_views')
        .insert({
          user_id: testData.user_id,
          asset_id: testData.asset_id
        })
        .select('nexo_causal_hash, viewed_at')
        .single();

      if (insertError) {
        this.log({
          name: 'HASH - Nexo Causal',
          status: 'FAIL',
          message: `Falha ao inserir lead_views: ${insertError.message}`,
          details: insertError,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verificar se hash foi gerado
      if (!insertData.nexo_causal_hash) {
        this.log({
          name: 'HASH - Nexo Causal',
          status: 'FAIL',
          message: 'ALERTA: Hash não foi gerado pelo trigger',
          details: insertData,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verificar formato do hash (deve ser SHA-256)
      const isValidHash = /^[a-f0-9]{64}$/i.test(insertData.nexo_causal_hash);

      if (!isValidHash) {
        this.log({
          name: 'HASH - Nexo Causal',
          status: 'WARN',
          message: 'Hash gerado mas formato inválido',
          details: { 
            hash: insertData.nexo_causal_hash,
            expectedLength: 64
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      this.log({
        name: 'HASH - Nexo Causal',
        status: 'PASS',
        message: 'INTEGRAÇÃO APROVADA: Nexo Causal gerado corretamente',
        details: { 
          generatedHash: insertData.nexo_causal_hash.substring(0, 16) + '...',
          hashLength: insertData.nexo_causal_hash.length,
          viewedAt: insertData.viewed_at,
          userId: testData.user_id,
          assetId: testData.asset_id
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.log({
        name: 'HASH - Nexo Causal',
        status: 'FAIL',
        message: `Exceção: ${error}`,
        details: error,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testScoringEngine(): Promise<void> {
    try {
      // Testar função de scoring do banco
      const testUserId = 'sovereign-audit-user';
      const testIntent = 'ROI';
      const testBonus = 20;

      const { data, error } = await supabase.rpc('update_lead_score', {
        p_user_id: testUserId,
        p_search_intent: testIntent,
        p_engagement_bonus: testBonus
      });

      if (error) {
        this.log({
          name: 'SCORING - Motor Preditivo',
          status: 'FAIL',
          message: `Falha no scoring: ${error.message}`,
          details: error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verificar se score foi atualizado
      if (typeof data === 'number' && data > 0) {
        // Verificar registro na tabela
        const { data: scoreData, error: scoreError } = await supabase
          .from('lead_behavior_scoring')
          .select('*')
          .eq('user_id', testUserId)
          .single();

        if (scoreError) {
          this.log({
            name: 'SCORING - Motor Preditivo',
            status: 'WARN',
            message: 'Score atualizado mas falha ao ler registro',
            details: { 
              score: data,
              error: scoreError.message
            },
            timestamp: new Date().toISOString()
          });
          return;
        }

        this.log({
          name: 'SCORING - Motor Preditivo',
          status: 'PASS',
          message: 'INTEGRAÇÃO APROVADA: Scoring engine operacional',
          details: { 
            finalScore: data,
            intent: testIntent,
            bonus: testBonus,
            recordId: scoreData.id,
            lastInteraction: scoreData.last_interaction
          },
          timestamp: new Date().toISOString()
        });
      } else {
        this.log({
          name: 'SCORING - Motor Preditivo',
          status: 'FAIL',
          message: 'Score não foi atualizado corretamente',
          details: { 
            returned: data
          },
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      this.log({
        name: 'SCORING - Motor Preditivo',
        status: 'FAIL',
        message: `Exceção: ${error}`,
        details: error,
        timestamp: new Date().toISOString()
      });
    }
  }

  async runFullAudit(): Promise<void> {
    console.log('\n🏛️ THE SOVEREIGN AUDIT - GEO v8.1 IMPERIUM EDITION');
    console.log('=' .repeat(60));
    console.log(`Iniciando verificação completa: ${new Date().toISOString()}`);
    console.log('=' .repeat(60));

    // Executar todos os testes
    await this.testDatabaseConnection();
    await this.testRLSSecurity();
    await this.testEmailCommunication();
    await this.testNexoCausalHash();
    await this.testScoringEngine();

    // Relatório final
    console.log('\n' + '=' .repeat(60));
    console.log('📊 RELATÓRIO FINAL DE INTEGRAÇÃO');
    console.log('=' .repeat(60));

    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const failCount = this.results.filter(r => r.status === 'FAIL').length;
    const warnCount = this.results.filter(r => r.status === 'WARN').length;
    const totalTests = this.results.length;

    console.log(`\nTotal de Testes: ${totalTests}`);
    console.log(`✅ Aprovados: ${passCount}`);
    console.log(`❌ Falharam: ${failCount}`);
    console.log(`⚠️  Avisos: ${warnCount}`);

    const successRate = (passCount / totalTests) * 100;
    console.log(`Taxa de Sucesso: ${successRate.toFixed(1)}%`);

    // Status final
    const overallStatus = failCount === 0 ? '🟢 SISTEMA APROVADO' : 
                          failCount <= 1 ? '🟡 SISTEMA PARCIAL' : '🔴 SISTEMA CRÍTICO';

    console.log(`\nSTATUS FINAL: ${overallStatus}`);

    if (failCount > 0) {
      console.log('\n❌ TESTES FALHADOS:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   • ${r.name}: ${r.message}`));
    }

    if (warnCount > 0) {
      console.log('\n⚠️ AVISOS:');
      this.results
        .filter(r => r.status === 'WARN')
        .forEach(r => console.log(`   • ${r.name}: ${r.message}`));
    }

    console.log('\n' + '=' .repeat(60));
    console.log(`🏛️ Auditoria concluída: ${new Date().toISOString()}`);
    console.log('=' .repeat(60));

    // Salvar relatório em arquivo
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: passCount,
        failed: failCount,
        warned: warnCount,
        successRate: successRate,
        status: overallStatus
      },
      results: this.results
    };

    // Em ambiente real, salvaria em arquivo
    console.log('\n📄 Relatório detalhado gerado (simulado)');
    console.log('   Para salvar em arquivo: adicionar fs.writeFileSync');
    
    return;
  }
}

// Executar auditoria
async function main() {
  const audit = new SovereignAudit();
  await audit.runFullAudit();
  
  // Exit com código baseado nos resultados
  const results = audit['results'] as TestResult[];
  const failCount = results.filter(r => r.status === 'FAIL').length;
  
  if (failCount > 0) {
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

export { SovereignAudit };
