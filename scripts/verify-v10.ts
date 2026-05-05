// 🏛️ SECURITY BROKER SB v7.0 - VERIFY-V10.TS
// Script de auditoria e teste de stress para SB PROTOCOLO 2032 + OUROBOROS v10.0

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// Configurações
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  details: string;
  timestamp: string;
}

interface VerificationReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  results: TestResult[];
  summary: {
    schemaIntegrity: boolean;
    nexoCausalGeneration: boolean;
    commissionSplitCalculation: boolean;
    rlsDataProtection: boolean;
    apiIntegration: boolean;
  };
}

class VerifyV10 {
  private supabase: any;
  private results: TestResult[] = [];

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async runAllTests(): Promise<VerificationReport> {
    console.log('🏛️ Iniciando verificação completa do SB PROTOCOLO 2032 + OUROBOROS v10.0');
    
    // 1. Testar geração de Hash Nexo Causal
    await this.testNexoCausalGeneration();
    
    // 2. Testar split de comissão 2%/4%
    await this.testCommissionSplitCalculation();
    
    // 3. Testar RLS de dados sensíveis
    await this.testRLSDataProtection();
    
    // 4. Testar integridade do schema
    await this.testSchemaIntegrity();
    
    // 5. Testar integração com API
    await this.testAPIIntegration();

    // Gerar relatório final
    return this.generateReport();
  }

  private async testNexoCausalGeneration(): Promise<void> {
    console.log('🔍 Testando geração de Hash Nexo Causal...');
    
    try {
      // Criar dados de teste
      const { data: lead, error: leadError } = await this.supabase
        .from('crm_leads')
        .insert({
          nome: 'Test Lead',
          email: 'test@example.com',
          telefone: '(11) 99999-9999',
          status: 'novo'
        })
        .select()
        .single();

      if (leadError) {
        this.addResult({
          test: 'Nexo Causal - Criação Lead',
          status: 'FAIL',
          details: `Erro ao criar lead: ${leadError.message}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { data: asset, error: assetError } = await this.supabase
        .from('land_opportunities')
        .insert({
          titulo: 'Test Asset',
          descricao: 'Asset para teste',
          localizacao_publica: 'Test Location',
          area_m2: 500,
          preco_m2: 1000,
          valor_total: 500000,
          zoneamento: 'Residencial',
          status: 'disponivel'
        })
        .select()
        .single();

      if (assetError) {
        this.addResult({
          test: 'Nexo Causal - Criação Asset',
          status: 'FAIL',
          details: `Erro ao criar asset: ${assetError.message}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Inserir visualização para gerar hash
      const { data: view, error: viewError } = await this.supabase
        .from('lead_views')
        .insert({
          lead_id: lead.id,
          asset_id: asset.id,
          ip_address: '127.0.0.1',
          user_agent: 'Test Agent',
          duracao_visualizacao_segundos: 120,
          documentos_acessados: ['escritura.pdf', 'matricula.pdf']
        })
        .select()
        .single();

      if (viewError) {
        this.addResult({
          test: 'Nexo Causal - Geração Hash',
          status: 'FAIL',
          details: `Erro ao gerar hash: ${viewError.message}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verificar se hash foi gerado
      if (!view.nexo_causal_hash || view.nexo_causal_hash.length !== 64) {
        this.addResult({
          test: 'Nexo Causal - Validação Hash',
          status: 'FAIL',
          details: `Hash inválido: ${view.nexo_causal_hash}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verificar formato SHA-256
      const hashRegex = /^[a-f0-9]{64}$/i;
      if (!hashRegex.test(view.nexo_causal_hash)) {
        this.addResult({
          test: 'Nexo Causal - Formato SHA-256',
          status: 'FAIL',
          details: `Hash não está no formato SHA-256: ${view.nexo_causal_hash}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      this.addResult({
        test: 'Nexo Causal - Geração SHA-256',
        status: 'PASS',
        details: `Hash gerado com sucesso: ${view.nexo_causal_hash}`,
        timestamp: new Date().toISOString()
      });

      // Limpar dados de teste
      await this.supabase.from('lead_views').delete().eq('id', view.id);
      await this.supabase.from('land_opportunities').delete().eq('id', asset.id);
      await this.supabase.from('crm_leads').delete().eq('id', lead.id);

    } catch (error: any) {
      this.addResult({
        test: 'Nexo Causal - Erro Geral',
        status: 'FAIL',
        details: `Erro inesperado: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testCommissionSplitCalculation(): Promise<void> {
    console.log('💰 Testando cálculo de split de comissão 2%/4%...');
    
    try {
      const valorTotal = 100000; // R$ 100.000,00
      
      // Testar função SQL de split
      const { data, error } = await this.supabase
        .rpc('calcular_split_comissao', {
          p_valor_total: valorTotal,
          p_corretor_id: '00000000-0000-0000-0000-000000000000'
        });

      if (error) {
        this.addResult({
          test: 'Split Comissão - Função SQL',
          status: 'FAIL',
          details: `Erro na função: ${error.message}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      const split = data[0];
      
      // Verificar valores esperados
      const expectedCoordenacao = valorTotal * 0.02; // 2%
      const expectedOperacao = valorTotal * 0.04; // 4%
      const expectedSB = valorTotal * 0.06; // 6%
      const expectedCorretor = valorTotal * 0.88; // 88%

      if (
        split.valor_coordenacao !== expectedCoordenacao ||
        split.valor_operacao !== expectedOperacao ||
        split.valor_sb !== expectedSB ||
        split.valor_corretor !== expectedCorretor
      ) {
        this.addResult({
          test: 'Split Comissão - Cálculo Incorreto',
          status: 'FAIL',
          details: `Valores incorretos. Coordenação: ${split.valor_coordenacao} (esperado: ${expectedCoordenacao}), Operação: ${split.valor_operacao} (esperado: ${expectedOperacao})`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Testar inserção na tabela finance_commissions
      const { data: commission, error: insertError } = await this.supabase
        .from('finance_commissions')
        .insert({
          corretor_id: '00000000-0000-0000-0000-000000000000',
          valor_total: valorTotal,
          status: 'pendente'
        })
        .select()
        .single();

      if (insertError) {
        this.addResult({
          test: 'Split Comissão - Inserção Tabela',
          status: 'FAIL',
          details: `Erro ao inserir comissão: ${insertError.message}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verificar se valores calculados estão corretos
      if (
        commission.valor_coordenacao !== expectedCoordenacao ||
        commission.valor_operacao !== expectedOperacao ||
        commission.valor_sb !== expectedSB ||
        commission.valor_corretor !== expectedCorretor
      ) {
        this.addResult({
          test: 'Split Comissão - Valores Gerados',
          status: 'FAIL',
          details: `Valores gerados incorretos na tabela finance_commissions`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      this.addResult({
        test: 'Split Comissão - Cálculo 2%/4%',
        status: 'PASS',
        details: `Split calculado corretamente: Coordenação R$${expectedCoordenacao}, Operação R$${expectedOperacao}, SB R$${expectedSB}, Corretor R$${expectedCorretor}`,
        timestamp: new Date().toISOString()
      });

      // Limpar dados de teste
      await this.supabase.from('finance_commissions').delete().eq('id', commission.id);

    } catch (error: any) {
      this.addResult({
        test: 'Split Comissão - Erro Geral',
        status: 'FAIL',
        details: `Erro inesperado: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testRLSDataProtection(): Promise<void> {
    console.log('🔒 Testando RLS de dados sensíveis...');
    
    try {
      // Testar acesso anônimo a dados sensíveis
      const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      // Tentar acessar localizacao_exata (deve ser bloqueado)
      const { data: sensitiveData, error: sensitiveError } = await supabaseAnon
        .from('land_opportunities')
        .select('localizacao_exata, dados_proprietario')
        .limit(1);

      if (sensitiveError) {
        // Erro esperado - RLS bloqueando acesso
        this.addResult({
          test: 'RLS - Bloqueio Dados Sensíveis',
          status: 'PASS',
          details: `RLS bloqueou acesso anônimo a dados sensíveis: ${sensitiveError.message}`,
          timestamp: new Date().toISOString()
        });
      } else if (sensitiveData && sensitiveData.length > 0) {
        this.addResult({
          test: 'RLS - Bloqueio Dados Sensíveis',
          status: 'FAIL',
          details: 'RLS não bloqueou acesso a dados sensíveis para usuário anônimo',
          timestamp: new Date().toISOString()
        });
      }

      // Testar acesso público a dados básicos
      const { data: publicData, error: publicError } = await supabaseAnon
        .from('land_opportunities_public')
        .select('id, titulo, localizacao_publica, preco')
        .limit(1);

      if (publicError) {
        this.addResult({
          test: 'RLS - Acesso Público',
          status: 'FAIL',
          details: `Erro ao acessar view pública: ${publicError.message}`,
          timestamp: new Date().toISOString()
        });
      } else if (publicData && publicData.length > 0) {
        this.addResult({
          test: 'RLS - Acesso Público',
          status: 'PASS',
          details: 'Acesso público a view básicos funcionando corretamente',
          timestamp: new Date().toISOString()
        });
      } else {
        this.addResult({
          test: 'RLS - Acesso Público',
          status: 'FAIL',
          details: 'View pública não retornou dados',
          timestamp: new Date().toISOString()
        });
      }

      // Testar acesso administrativo
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('land_opportunities_full')
        .select('localizacao_exata, dados_proprietario')
        .limit(1);

      if (adminError) {
        this.addResult({
          test: 'RLS - Acesso Administrativo',
          status: 'FAIL',
          details: `Erro no acesso administrativo: ${adminError.message}`,
          timestamp: new Date().toISOString()
        });
      } else if (adminData && adminData.length > 0) {
        this.addResult({
          test: 'RLS - Acesso Administrativo',
          status: 'PASS',
          details: 'Acesso administrativo a dados completos funcionando',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error: any) {
      this.addResult({
        test: 'RLS - Erro Geral',
        status: 'FAIL',
        details: `Erro inesperado: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testSchemaIntegrity(): Promise<void> {
    console.log('🏗️ Testando integridade do schema...');
    
    try {
      const requiredTables = [
        'land_opportunities',
        'finance_commissions',
        'lead_views',
        'audit_logs',
        'profiles',
        'crm_leads',
        'atendimentos'
      ];

      let allTablesExist = true;
      const missingTables: string[] = [];

      for (const table of requiredTables) {
        const { data, error } = await this.supabase
          .from(table)
          .select('id')
          .limit(1);

        if (error) {
          allTablesExist = false;
          missingTables.push(table);
        }
      }

      if (!allTablesExist) {
        this.addResult({
          test: 'Schema - Tabelas Obrigatórias',
          status: 'FAIL',
          details: `Tabelas faltando: ${missingTables.join(', ')}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verificar views
      const requiredViews = [
        'land_opportunities_public',
        'land_opportunities_full'
      ];

      let allViewsExist = true;
      const missingViews: string[] = [];

      for (const view of requiredViews) {
        const { data, error } = await this.supabase
          .from(view)
          .select('id')
          .limit(1);

        if (error) {
          allViewsExist = false;
          missingViews.push(view);
        }
      }

      if (!allViewsExist) {
        this.addResult({
          test: 'Schema - Views Obrigatórias',
          status: 'FAIL',
          details: `Views faltando: ${missingViews.join(', ')}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verificar funções RPC
      const { data: rpcData, error: rpcError } = await this.supabase
        .rpc('calcular_split_comissao', {
          p_valor_total: 100000,
          p_corretor_id: '00000000-0000-0000-0000-000000000000'
        });

      if (rpcError) {
        this.addResult({
          test: 'Schema - Funções RPC',
          status: 'FAIL',
          details: `Função RPC não encontrada: ${rpcError.message}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      this.addResult({
        test: 'Schema - Integridade Completa',
        status: 'PASS',
        details: 'Todas as tabelas, views e funções obrigatórias existem',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      this.addResult({
        test: 'Schema - Erro Geral',
        status: 'FAIL',
        details: `Erro inesperado: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async testAPIIntegration(): Promise<void> {
    console.log('🔌 Testando integração com API...');
    
    try {
      // Testar endpoint /api/gemini
      const testData = {
        assetData: {
          tipo: 'terreno',
          endereco: 'Rua Test, 123, Test City, SP',
          area: 500,
          preco: 6000000, // Acima de R$ 5M
          documentos: ['test.pdf'],
          proprietario: {
            nome: 'Test User',
            cpf_cnpj: '123.456.789-00',
            tipo: 'PF' as const
          }
        },
        analysisType: 'completa' as const,
        commissionRate: 0.06,
        expectedROI: 0.08
      };

      const response = await fetch('http://localhost:3000/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.addResult({
          test: 'API - Resposta',
          status: 'FAIL',
          details: `API retornou erro ${response.status}: ${errorData.error}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await response.json();

      // Verificar estrutura da resposta
      const requiredFields = [
        'success',
        'protocol',
        'sections',
        'riskAnalysis',
        'financialAnalysis',
        'legalCompliance',
        'dossieJuridico',
        'ouroboros'
      ];

      const missingFields = requiredFields.filter(field => !(field in result));
      if (missingFields.length > 0) {
        this.addResult({
          test: 'API - Estrutura Resposta',
          status: 'FAIL',
          details: `Campos faltando: ${missingFields.join(', ')}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verificar se tem 20 seções
      if (!result.sections || result.sections.length !== 20) {
        this.addResult({
          test: 'API - 20 Seções',
          status: 'FAIL',
          details: `Resposta não tem 20 seções: ${result.sections?.length || 0}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verificar proteção OUROBOROS
      if (!result.ouroboros || !result.ouroboros.protectionActive) {
        this.addResult({
          test: 'API - OUROBOROS Proteção',
          status: 'FAIL',
          details: 'Proteção OUROBOROS não está ativa',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verificar Dossiê Jurídico
      if (!result.dossieJuridico || !result.dossieJuridico.hash) {
        this.addResult({
          test: 'API - Dossiê Jurídico',
          status: 'FAIL',
          details: 'Dossiê Jurídico não foi gerado',
          timestamp: new Date().toISOString()
        });
        return;
      }

      this.addResult({
        test: 'API - Integração Completa',
        status: 'PASS',
        details: `API funcionando corretamente. Protocolo: ${result.protocol}`,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      this.addResult({
        test: 'API - Erro Geral',
        status: 'FAIL',
        details: `Erro inesperado: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  private addResult(result: TestResult): void {
    this.results.push(result);
    console.log(`${result.status}: ${result.test} - ${result.details}`);
  }

  private generateReport(): VerificationReport {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      successRate,
      results: this.results,
      summary: {
        schemaIntegrity: this.results.some(r => r.test.includes('Schema') && r.status === 'PASS'),
        nexoCausalGeneration: this.results.some(r => r.test.includes('Nexo Causal') && r.status === 'PASS'),
        commissionSplitCalculation: this.results.some(r => r.test.includes('Split Comissão') && r.status === 'PASS'),
        rlsDataProtection: this.results.some(r => r.test.includes('RLS') && r.status === 'PASS'),
        apiIntegration: this.results.some(r => r.test.includes('API') && r.status === 'PASS')
      }
    };
  }

  printReport(report: VerificationReport): void {
    console.log('\n🏛️ RELATÓRIO DE VERIFICAÇÃO - SB PROTOCOLO 2032 + OUROBOROS v10.0');
    console.log('='.repeat(80));
    console.log(`📊 ESTATÍSTICAS GERAIS:`);
    console.log(`   Total de Testes: ${report.totalTests}`);
    console.log(`   Testes Passados: ${report.passedTests}`);
    console.log(`   Testes Falhados: ${report.failedTests}`);
    console.log(`   Taxa de Sucesso: ${report.successRate.toFixed(1)}%`);
    console.log('\n📋 RESUMO POR MÓDULO:');
    
    Object.entries(report.summary).forEach(([module, status]) => {
      const icon = status ? '✅' : '❌';
      console.log(`   ${icon} ${module.replace(/([A-Z])/g, ' $1').trim()}`);
    });

    console.log('\n📝 DETALHAMENTO DOS TESTES:');
    console.log('-'.repeat(80));
    
    report.results.forEach((result, index) => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${index + 1}. ${icon} ${result.test}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Detalhes: ${result.details}`);
      console.log(`   Timestamp: ${result.timestamp}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('🏛️ VERIFICAÇÃO CONCLUÍDA');
    
    if (report.successRate === 100) {
      console.log('🎉 TODOS OS TESTES PASSARAM! Sistema Imperium v10.0 está 100% operacional.');
    } else {
      console.log(`⚠️  ATENÇÃO: ${report.failedTests} teste(s) falharam. Verifique os detalhes acima.`);
    }
  }
}

// Execução principal
async function main() {
  const verifier = new VerifyV10();
  const report = await verifier.runAllTests();
  verifier.printReport(report);
  
  // Salvar relatório em arquivo
  const fs = require('fs');
  const reportPath = './verification-report.json';
  
  try {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Relatório salvo em: ${reportPath}`);
  } catch (error) {
    console.error('❌ Erro ao salvar relatório:', error);
  }
  
  // Retornar código de saída baseado no resultado
  process.exit(report.successRate === 100 ? 0 : 1);
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

export type { VerificationReport };
export { VerifyV10 };
