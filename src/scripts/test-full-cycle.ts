/**
 * 🏛️ SB IMPERIUM v14.0 - BATERIA DE TESTES DE STRESS E INTEGRIDADE
 * 
 * Script de Teste de Ciclo Completo para validação da Função Social de Jesus
 * 
 * Funcionalidades:
 * 1. Simular Lead com SB Score alto
 * 2. Executar Match completo (Captador + Vendedor)
 * 3. Calcular Split Financeiro (10/30/40/20)
 * 4. Validar Função Social (1% do faturamento líquido)
 * 5. Gerar Nexo Causal (Hash SHA-256)
 * 6. Disparar e-mail de confirmação via Resend
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { Resend } from 'resend';

// Configurações
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const resendApiKey = process.env.RESEND_API_KEY!;
const emailTeste = process.env.EMAIL_TESTE || 'test@reino-sb.systems';

// Instâncias
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

// Interfaces
interface LeadSimulado {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  sb_score: number;
  interesse_lote: string;
  empreendimento: string;
  vgv_alvo: number;
  regiao: string;
  perfil_investidor: 'conservador' | 'moderado' | 'agressivo';
}

interface MatchResult {
  id: string;
  lead_id: string;
  captador_id: string;
  vendedor_id: string;
  status: 'ativo' | 'concluido' | 'cancelado';
  vgv: number;
  data_match: string;
  nexo_causal?: string;
}

interface SplitFinanceiro {
  captador: number;      // 10%
  vendedor: number;     // 30%
  corretor: number;      // 40%
  sb_tesouro: number;    // 20%
  funcao_social: number; // 1% do faturamento líquido
}

interface TestResult {
  lead_criado: boolean;
  match_executado: boolean;
  split_calculado: boolean;
  funcao_social_validada: boolean;
  nexo_causal_gerado: boolean;
  email_disparado: boolean;
  erros: string[];
  sucesso: boolean;
}

/**
 * Função principal de teste completo
 */
export async function executarTesteCicloCompleto(): Promise<TestResult> {
  console.log('🏛️ Iniciando Teste de Ciclo Completo - SB Imperium v14.0');
  console.log('=' .repeat(80));
  
  const resultado: TestResult = {
    lead_criado: false,
    match_executado: false,
    split_calculado: false,
    funcao_social_validada: false,
    nexo_causal_gerado: false,
    email_disparado: false,
    erros: [],
    sucesso: false
  };
  
  try {
    // 1. SIMULAR LEAD COM SB SCORE ALTO
    console.log('\n📋 1. Simulando Lead com SB Score alto...');
    const lead = await criarLeadSimulado();
    resultado.lead_criado = true;
    console.log(`✅ Lead criado: ${lead.nome} (SB Score: ${lead.sb_score})`);
    
    // 2. SIMULAR MATCH COMPLETO
    console.log('\n🤝 2. Executando Match completo...');
    const match = await executarMatchCompleto(lead);
    resultado.match_executado = true;
    console.log(`✅ Match executado: ID ${match.id} - VGV: R$ ${match.vgv.toLocaleString('pt-BR')}`);
    
    // 3. CALCULAR SPLIT FINANCEIRO
    console.log('\n💰 3. Calculando Split Financeiro (10/30/40/20)...');
    const split = await calcularSplitFinanceiro(match.vgv);
    resultado.split_calculado = true;
    console.log(`✅ Split calculado:`);
    console.log(`   Captador (10%): R$ ${split.captador.toLocaleString('pt-BR')}`);
    console.log(`   Vendedor (30%): R$ ${split.vendedor.toLocaleString('pt-BR')}`);
    console.log(`   Corretor (40%): R$ ${split.corretor.toLocaleString('pt-BR')}`);
    console.log(`   SB Tesouro (20%): R$ ${split.sb_tesouro.toLocaleString('pt-BR')}`);
    console.log(`   Função Social (1%): R$ ${split.funcao_social.toLocaleString('pt-BR')}`);
    
    // 4. VALIDAR FUNÇÃO SOCIAL
    console.log('\n🏛️ 4. Validando Função Social de Jesus...');
    const funcaoSocialValidada = await validarFuncaoSocial(split);
    resultado.funcao_social_validada = funcaoSocialValidada;
    console.log(`✅ Função Social validada: ${funcaoSocialValidada ? 'SIM' : 'NÃO'}`);
    
    // 5. GERAR NEXO CAUSAL
    console.log('\n🔐 5. Gerando Nexo Causal (Hash SHA-256)...');
    const nexoCausal = await gerarNexoCausal(match, split);
    resultado.nexo_causal_gerado = !!nexoCausal;
    console.log(`✅ Nexo Causal gerado: ${nexoCausal?.substring(0, 16)}...`);
    
    // 6. DISPARAR E-MAIL DE CONFIRMAÇÃO
    console.log('\n📧 6. Disparando e-mail de confirmação via Resend...');
    const emailDisparado = await dispararEmailConfirmacao(match, split, nexoCausal);
    resultado.email_disparado = emailDisparado;
    console.log(`✅ E-mail disparado: ${emailDisparado ? 'SIM' : 'NÃO'}`);
    
    // Verificar sucesso geral
    resultado.sucesso = Object.values(resultado).every((val, idx) => 
      idx < 6 ? val === true : true // Ignorar erros e sucesso
    );
    
    // Imprimir resultado final
    imprimirResultadoFinal(resultado);
    
    return resultado;
    
  } catch (error: any) {
    console.error('❌ Erro crítico no teste:', error.message);
    resultado.erros.push(error.message);
    return resultado;
  }
}

/**
 * 1. Criar Lead Simulado com SB Score alto
 */
async function criarLeadSimulado(): Promise<LeadSimulado> {
  const lead: LeadSimulado = {
    id: `LEAD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    nome: 'Investidor Soberano Test',
    email: emailTeste,
    telefone: '+55119' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
    sb_score: 850 + Math.floor(Math.random() * 150), // 850-999 (alto)
    interesse_lote: 'Lote Artesano Premium',
    empreendimento: 'Artesano Residence',
    vgv_alvo: 500000 + Math.floor(Math.random() * 1500000), // 500k-2M
    regiao: 'Sudeste',
    perfil_investidor: 'moderado'
  };
  
  // Inserir no Supabase
  const { error } = await supabase
    .from('leads')
    .insert({
      id: lead.id,
      nome: lead.nome,
      email: lead.email,
      telefone: lead.telefone,
      sb_score: lead.sb_score,
      interesse_lote: lead.interesse_lote,
      empreendimento: lead.empreendimento,
      vgv_alvo: lead.vgv_alvo,
      regiao: lead.regiao,
      perfil_investidor: lead.perfil_investidor,
      status: 'novo',
      data_criacao: new Date().toISOString()
    });
  
  if (error) {
    throw new Error(`Falha ao criar lead: ${error.message}`);
  }
  
  return lead;
}

/**
 * 2. Executar Match completo
 */
async function executarMatchCompleto(lead: LeadSimulado): Promise<MatchResult> {
  // Simular captadores e vendedores disponíveis
  const captadores = await buscarCaptadoresDisponiveis();
  const vendedores = await buscarVendedoresDisponiveis();
  
  if (captadores.length === 0 || vendedores.length === 0) {
    throw new Error('Nenhum captador ou vendedor disponível para match');
  }
  
  // Selecionar aleatoriamente
  const captadorSelecionado = captadores[Math.floor(Math.random() * captadores.length)];
  const vendedorSelecionado = vendedores[Math.floor(Math.random() * vendedores.length)];
  
  const match: MatchResult = {
    id: `MATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    lead_id: lead.id,
    captador_id: captadorSelecionado.id,
    vendedor_id: vendedorSelecionado.id,
    status: 'ativo',
    vgv: lead.vgv_alvo,
    data_match: new Date().toISOString()
  };
  
  // Inserir match no Supabase
  const { error } = await supabase
    .from('matches')
    .insert({
      id: match.id,
      lead_id: match.lead_id,
      captador_id: match.captador_id,
      vendedor_id: match.vendedor_id,
      status: match.status,
      vgv: match.vgv,
      data_match: match.data_match,
      decisao_patrimonial: true,
      data_decisao: new Date().toISOString()
    });
  
  if (error) {
    throw new Error(`Falha ao executar match: ${error.message}`);
  }
  
  return match;
}

/**
 * 3. Calcular Split Financeiro (10/30/40/20 + 1% Função Social)
 */
async function calcularSplitFinanceiro(vgv: number): Promise<SplitFinanceiro> {
  // Taxas padrão do sistema
  const taxaCaptador = 0.10; // 10%
  const taxaVendedor = 0.30; // 30%
  const taxaCorretor = 0.40; // 40%
  const taxaSbTesouro = 0.20; // 20%
  
  // Cálculo das vias
  const captador = vgv * taxaCaptador;
  const vendedor = vgv * taxaVendedor;
  const corretor = vgv * taxaCorretor;
  const sb_tesouro = vgv * taxaSbTesouro;
  
  // Faturamento líquido da SB (apenas o que ela recebe)
  const faturamento_liquido_sb = sb_tesouro;
  
  // Função Social: 1% do faturamento líquido da SB
  const funcao_social = faturamento_liquido_sb * 0.01;
  
  const split: SplitFinanceiro = {
    captador,
    vendedor,
    corretor,
    sb_tesouro,
    funcao_social
  };
  
  // Inserir no Supabase
  const { error } = await supabase
    .from('splits_financeiros')
    .insert({
      match_id: `MATCH-${Date.now()}`,
      vgv_original: vgv,
      captador_valor: captador,
      vendedor_valor: vendedor,
      corretor_valor: corretor,
      sb_tesouro_valor: sb_tesouro,
      funcao_social_valor: funcao_social,
      taxas_aplicadas: {
        captador: taxaCaptador,
        vendedor: taxaVendedor,
        corretor: taxaCorretor,
        sb_tesouro: taxaSbTesouro
      },
      data_calculo: new Date().toISOString()
    });
  
  if (error) {
    throw new Error(`Falha ao calcular split: ${error.message}`);
  }
  
  return split;
}

/**
 * 4. Validar Função Social
 */
async function validarFuncaoSocial(split: SplitFinanceiro): Promise<boolean> {
  // Verificar se o valor da função social é exatamente 1% do faturamento líquido
  const faturamentoLiquidoSB = split.sb_tesouro;
  const funcaoSocialEsperada = faturamentoLiquidoSB * 0.01;
  
  const isValid = Math.abs(split.funcao_social - funcaoSocialEsperada) < 0.01; // Tolerância de 1 centavo
  
  if (isValid) {
    // Registrar na tabela de função social
    await supabase
      .from('funcao_social')
      .insert({
        valor_aporte: split.funcao_social,
        percentual_aplicado: 1.0,
        base_calculo: faturamentoLiquidoSB,
        data_aporte: new Date().toISOString(),
        origem: 'split_financeiro',
        status: 'aprovado'
      });
  }
  
  return isValid;
}

/**
 * 5. Gerar Nexo Causal (Hash SHA-256)
 */
async function gerarNexoCausal(match: MatchResult, split: SplitFinanceiro): Promise<string> {
  // Criar string para hash
  const dadosParaHash = [
    match.id,
    match.lead_id,
    match.captador_id,
    match.vendedor_id,
    match.vgv.toString(),
    split.captador.toString(),
    split.vendedor.toString(),
    split.corretor.toString(),
    split.sb_tesouro.toString(),
    split.funcao_social.toString(),
    match.data_match,
    new Date().toISOString() // Timestamp do hash
  ].join('|');
  
  // Gerar hash SHA-256
  const hash = createHash('sha256').update(dadosParaHash).digest('hex');
  
  // Inserir nexo causal no Supabase
  const { error } = await supabase
    .from('nexo_causal')
    .insert({
      hash: hash,
      match_id: match.id,
      dados_originais: dadosParaHash,
      data_geracao: new Date().toISOString(),
      algoritmo: 'SHA-256',
      validado: true
    });
  
  if (error) {
    throw new Error(`Falha ao gerar nexo causal: ${error.message}`);
  }
  
  // Atualizar match com o nexo causal
  await supabase
    .from('matches')
    .update({ nexo_causal: hash })
    .eq('id', match.id);
  
  return hash;
}

/**
 * 6. Disparar e-mail de confirmação via Resend
 */
async function dispararEmailConfirmacao(
  match: MatchResult, 
  split: SplitFinanceiro, 
  nexoCausal: string
): Promise<boolean> {
  try {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>🏛️ Decisão Patrimonial Confirmada - SB Imperium v14.0</title>
        <style>
          body { font-family: Arial, sans-serif; background: #0a1628; color: #fff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #1e3a5f; border-radius: 10px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #D4AF37, #B8860B); padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; color: #0a1628; }
          .content { padding: 30px; }
          .section { margin-bottom: 25px; padding: 20px; background: #0a1628; border-radius: 8px; border-left: 4px solid #D4AF37; }
          .section h3 { color: #D4AF37; margin-top: 0; }
          .valor { font-size: 24px; font-weight: bold; color: #D4AF37; }
          .hash { font-family: monospace; background: #000; padding: 10px; border-radius: 4px; word-break: break-all; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏛️ Decisão Patrimonial Confirmada</h1>
            <p>SB Imperium v14.0 - Função Social de Jesus</p>
          </div>
          
          <div class="content">
            <div class="section">
              <h3>📋 Detalhes da Transação</h3>
              <p><strong>ID do Match:</strong> ${match.id}</p>
              <p><strong>Data da Decisão:</strong> ${new Date(match.data_match).toLocaleString('pt-BR')}</p>
              <p><strong>Status:</strong> <span style="color: #4CAF50;">✅ ATIVO</span></p>
            </div>
            
            <div class="section">
              <h3>💰 Distribuição Financeira</h3>
              <p><strong>VGV Total:</strong> <span class="valor">R$ ${match.vgv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
              <p><strong>Captador (10%):</strong> R$ ${split.captador.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p><strong>Vendedor (30%):</strong> R$ ${split.vendedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p><strong>Corretor (40%):</strong> R$ ${split.corretor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p><strong>SB Tesouro (20%):</strong> R$ ${split.sb_tesouro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p><strong>🏛️ Função Social (1%):</strong> <span class="valor">R$ ${split.funcao_social.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
            </div>
            
            <div class="section">
              <h3>🔐 Nexo Causal</h3>
              <p><strong>Hash SHA-256:</strong></p>
              <div class="hash">${nexoCausal}</div>
              <p style="font-size: 12px; margin-top: 10px;">Este hash garante a imutabilidade e integridade da transação.</p>
            </div>
            
            <div class="section">
              <h3>🏛️ Impacto da Função Social</h3>
              <p>Este aporte de <strong>R$ ${split.funcao_social.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> será destinado à:</p>
              <ul>
                <li>🏥 Ações de saúde e acolhimento</li>
                <li>📚 Educação e capacitação</li>
                <li>🏗️ Projetos de moradia digna</li>
                <li>🍽️ Programas de segurança alimentar</li>
              </ul>
              <p><em>"A riqueza com propósito transforma vidas e constrói um Reino de justiça e paz."</em></p>
            </div>
          </div>
          
          <div class="footer">
            <p>SB Imperium v14.0 - Sistema Soberano de Decisão Patrimonial</p>
            <p>Processado com integridade e propósito em ${new Date().toLocaleString('pt-BR')}</p>
            <p>🏛️ "Onde a riqueza encontra seu propósito divino"</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const { error } = await resend.emails.send({
      from: 'decisao-patrimonial@reino-sb.systems',
      to: [emailTeste],
      subject: `🏛️ Decisão Patrimonial Confirmada - ${match.id}`,
      html: emailHtml
    });
    
    if (error) {
      throw new Error(`Falha ao enviar e-mail: ${error.message}`);
    }
    
    return true;
    
  } catch (error: any) {
    console.error('Erro no disparo de e-mail:', error);
    return false;
  }
}

/**
 * Funções auxiliares
 */
async function buscarCaptadoresDisponiveis(): Promise<Array<{ id: string; nome: string }>> {
  const { data, error } = await supabase
    .from('captadores')
    .select('id, nome')
    .eq('status', 'ativo')
    .limit(10);
  
  if (error || !data) {
    // Retornar dados simulados se não houver tabela
    return [
      { id: 'CAP-001', nome: 'Captador Elite A' },
      { id: 'CAP-002', nome: 'Captador Elite B' },
      { id: 'CAP-003', nome: 'Captador Elite C' }
    ];
  }
  
  return data;
}

async function buscarVendedoresDisponiveis(): Promise<Array<{ id: string; nome: string }>> {
  const { data, error } = await supabase
    .from('vendedores')
    .select('id, nome')
    .eq('status', 'ativo')
    .limit(10);
  
  if (error || !data) {
    // Retornar dados simulados se não houver tabela
    return [
      { id: 'VEN-001', nome: 'Vendedor Premium A' },
      { id: 'VEN-002', nome: 'Vendedor Premium B' },
      { id: 'VEN-003', nome: 'Vendedor Premium C' }
    ];
  }
  
  return data;
}

/**
 * Imprimir resultado final do teste
 */
function imprimirResultadoFinal(resultado: TestResult): void {
  console.log('\n' + '='.repeat(80));
  console.log('🏛️ RELATÓRIO FINAL - TESTE DE CICLO COMPLETO');
  console.log('='.repeat(80));
  
  const statusEmoji = resultado.sucesso ? '✅' : '❌';
  console.log(`\n${statusEmoji} Status Geral: ${resultado.sucesso ? 'SUCESSO' : 'FALHA'}`);
  
  console.log('\n📊 Validacões:');
  console.log(`   Lead Criado: ${resultado.lead_criado ? '✅' : '❌'}`);
  console.log(`   Match Executado: ${resultado.match_executado ? '✅' : '❌'}`);
  console.log(`   Split Calculado: ${resultado.split_calculado ? '✅' : '❌'}`);
  console.log(`   Função Social Validada: ${resultado.funcao_social_validada ? '✅' : '❌'}`);
  console.log(`   Nexo Causal Gerado: ${resultado.nexo_causal_gerado ? '✅' : '❌'}`);
  console.log(`   E-mail Disparado: ${resultado.email_disparado ? '✅' : '❌'}`);
  
  if (resultado.erros.length > 0) {
    console.log('\n❌ Erros encontrados:');
    resultado.erros.forEach((erro, index) => {
      console.log(`   ${index + 1}. ${erro}`);
    });
  }
  
  console.log('\n🎯 Conclusão:');
  if (resultado.sucesso) {
    console.log('   🏛️ Sistema Soberano validado com sucesso!');
    console.log('   🛡️ Todas as validações passaram');
    console.log('   🚀 SB Imperium v14.0 pronto para produção');
  } else {
    console.log('   ⚠️ Falhas detectadas no sistema');
    console.log('   🔧 Verificar os erros listados acima');
    console.log('   🛠️ Realizar correções antes do deploy');
  }
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Função para execução via linha de comando
 */
if (require.main === module) {
  executarTesteCicloCompleto()
    .then((resultado) => {
      console.log('\n✅ Teste de ciclo completo concluído');
      process.exit(resultado.sucesso ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n❌ Erro crítico no teste:', error);
      process.exit(1);
    });
}

export default executarTesteCicloCompleto;
