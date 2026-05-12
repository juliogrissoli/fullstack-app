// 🏛️ SECURITY BROKER SB v13 - CRONJOBS SERVIÇOS CRONOLÓGICOS
// Sistema de cobrança e gestão de workflow D+10/D+30

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: ReturnType<typeof createClient> | null = null;
const supabase = new Proxy({}, {
  get(_: unknown, prop: string | symbol) {
    if (!_supabase) {
      _supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
    return Reflect.get(_supabase, prop);
  },
}) as SupabaseClient<any>;

// Função principal para executar todos os cronjobs
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // Verificar chave de segurança para cronjobs
  if (authHeader !== `Bearer ${process.env.CRONJOB_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = {
      timestamp: new Date().toISOString(),
      cobrancaSetup: await processarCobrancaSetup(),
      cobrancaEstruturacao: await processarCobrancaEstruturacao(),
      bloqueioSistema: await verificarBloqueios(),
      walletCreditos: await processarWalletCreditos(),
      comissoesAtrasadas: await processarComissoesAtrasadas(),
      expiracaoCreditos: await processarExpiracaoCreditos(),
      slaRedistribuicao: await executarSlaRedistribuicao(),
    };

    return NextResponse.json({ 
      success: true, 
      results,
      message: 'Cronjobs executados com sucesso'
    });

  } catch (error: any) {
    console.error('Erro nos cronjobs:', error);
    return NextResponse.json({ 
      error: 'Erro interno nos cronjobs',
      details: error.message
    }, { status: 500 });
  }
}

// Processar cobrança de Setup (D+10)
async function processarCobrancaSetup() {
  try {
    const hoje = new Date();
    const dataD10 = new Date(hoje);
    dataD10.setDate(hoje.getDate() + 10);

    // Buscar incorporadoras com vencimento em D+10
    const { data: incorporadoras, error } = await supabase
      .from('incorporadoras')
      .select('*')
      .eq('status', 'ativa')
      .eq('plano', 'basico')
      .eq('valor_setup', 55000)
      .lte('proximo_vencimento', dataD10.toISOString())
      .is('data_ultimo_pagamento', null);

    if (error) throw error;

    let processados = 0;
    let bloqueados = 0;

    for (const incorporadora of incorporadoras) {
      // Verificar se já tem aporte de setup
      const { data: aporteExistente } = await supabase
        .from('aportes_marketing')
        .select('*')
        .eq('incorporadora_id', incorporadora.id)
        .eq('tipo', 'setup')
        .eq('status', 'pago')
        .single();

      if (!aporteExistente) {
        // Criar notificação de cobrança
        await supabase
          .from('notificacoes')
          .insert({
            incorporadora_id: incorporadora.id,
            tipo: 'alerta',
            titulo: 'Cobrança de Setup - D+10',
            mensagem: `Seu aporte de Setup de R$ 55.000,00 vence em 10 dias. Efetue o pagamento para evitar o bloqueio do sistema.`,
            status: 'nao_lida'
          });

        // Se já venceu, bloquear sistema
        if (new Date(incorporadora.proximo_vencimento) <= hoje) {
          await supabase
            .from('incorporadoras')
            .update({ status: 'suspenso' })
            .eq('id', incorporadora.id);

          bloqueados++;
        }

        processados++;
      }
    }

    return {
      processados,
      bloqueados,
      message: `Processados ${processados} setups, ${bloqueados} sistemas bloqueados`
    };

  } catch (error: any) {
    return { error: error.message, message: 'Erro ao processar cobrança de setup' };
  }
}

// Processar cobrança de Estruturação (D+30)
async function processarCobrancaEstruturacao() {
  try {
    const hoje = new Date();
    const dataD30 = new Date(hoje);
    dataD30.setDate(hoje.getDate() + 30);

    // Buscar incorporadoras com vencimento em D+30
    const { data: incorporadoras, error } = await supabase
      .from('incorporadoras')
      .select('*')
      .eq('status', 'ativa')
      .in('plano', ['premium', 'imperial'])
      .gte('valor_setup', 135000)
      .lte('proximo_vencimento', dataD30.toISOString())
      .is('data_ultimo_pagamento', null);

    if (error) throw error;

    let processados = 0;
    let bloqueados = 0;

    for (const incorporadora of incorporadoras) {
      // Verificar se já tem aporte de estruturação
      const { data: aporteExistente } = await supabase
        .from('aportes_marketing')
        .select('*')
        .eq('incorporadora_id', incorporadora.id)
        .eq('tipo', 'estruturacao')
        .eq('status', 'pago')
        .single();

      if (!aporteExistente) {
        // Criar notificação de cobrança
        await supabase
          .from('notificacoes')
          .insert({
            incorporadora_id: incorporadora.id,
            tipo: 'alerta',
            titulo: 'Cobrança de Estruturação - D+30',
            mensagem: `Seu aporte de Estruturação de R$ ${incorporadora.valor_setup.toLocaleString('pt-BR')},00 vence em 30 dias. Efetue o pagamento para evitar o bloqueio do sistema.`,
            status: 'nao_lida'
          });

        // Se já venceu, bloquear sistema
        if (new Date(incorporadora.proximo_vencimento) <= hoje) {
          await supabase
            .from('incorporadoras')
            .update({ status: 'suspenso' })
            .eq('id', incorporadora.id);

          bloqueados++;
        }

        processados++;
      }
    }

    return {
      processados,
      bloqueados,
      message: `Processados ${processados} estruturações, ${bloqueados} sistemas bloqueados`
    };

  } catch (error: any) {
    return { error: error.message, message: 'Erro ao processar cobrança de estruturação' };
  }
}

// Verificar bloqueios do sistema
async function verificarBloqueios() {
  try {
    const { data: bloqueados, error } = await supabase
      .from('incorporadoras')
      .select('id, nome_fantasia, status, proximo_vencimento')
      .eq('status', 'suspenso');

    if (error) throw error;

    return {
      total_bloqueados: bloqueados.length,
      bloqueados: bloqueados.map(inc => ({
        id: inc.id,
        nome: inc.nome_fantasia,
        vencimento: inc.proximo_vencimento
      })),
      message: `${bloqueados.length} sistemas bloqueados`
    };

  } catch (error: any) {
    return { error: error.message, message: 'Erro ao verificar bloqueios' };
  }
}

// Processar wallet de créditos (20% do faturamento B2B)
async function processarWalletCreditos() {
  try {
    const ultimoMes = new Date();
    ultimoMes.setMonth(ultimoMes.getMonth() - 1);

    // Buscar vendas do último mês
    const { data: vendas, error } = await supabase
      .from('vendas')
      .select('incorporadora_id, valor_venda, comissao_sb')
      .gte('data_venda', ultimoMes.toISOString())
      .eq('status', 'confirmada');

    if (error) throw error;

    // Agrupar por incorporadora
    const faturamentoPorIncorporadora = vendas.reduce((acc: any, venda: any) => {
      if (!acc[venda.incorporadora_id]) {
        acc[venda.incorporadora_id] = {
          total_vendas: 0,
          total_comissoes: 0
        };
      }
      acc[venda.incorporadora_id].total_vendas += venda.valor_venda;
      acc[venda.incorporadora_id].total_comissoes += venda.comissao_sb;
      return acc;
    }, {});

    let creditosGerados = 0;

    for (const [incorporadoraId, dados] of Object.entries(faturamentoPorIncorporadora)) {
      const faturamento = dados as any;
      const creditoWallet = faturamento.total_comissoes * 0.20; // 20% das comissões SB

      if (creditoWallet > 0) {
        // Criar crédito na wallet
        await supabase
          .from('wallet_creditos')
          .insert({
            incorporadora_id: incorporadoraId,
            tipo: 'leads',
            valor: creditoWallet,
            origem: 'faturamento_b2b',
            status: 'disponivel',
            data_expiracao: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 dias
          });

        // Notificar incorporadora
        await supabase
          .from('notificacoes')
          .insert({
            incorporadora_id: incorporadoraId,
            tipo: 'info',
            titulo: 'Créditos Adicionados à Wallet',
            mensagem: `R$ ${creditoWallet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em créditos foram adicionados à sua wallet para uso em leads e anúncios.`,
            status: 'nao_lida'
          });

        creditosGerados++;
      }
    }

    return {
      creditos_gerados: creditosGerados,
      total_vendas: vendas.length,
      message: `${creditosGerados} wallets de créditos geradas`
    };

  } catch (error: any) {
    return { error: error.message, message: 'Erro ao processar wallet de créditos' };
  }
}

// Processar comissões atrasadas (Cláusula de Dobro)
async function processarComissoesAtrasadas() {
  try {
    const hoje = new Date();
    const cincoDiasAtras = new Date(hoje);
    cincoDiasAtras.setDate(hoje.getDate() - 5);

    // Buscar comissões atrasadas
    const { data: comissoes, error } = await supabase
      .from('comissoes')
      .select('*')
      .eq('status', 'pendente')
      .lt('data_vencimento', cincoDiasAtras.toISOString());

    if (error) throw error;

    let processadas = 0;

    for (const comissao of comissoes) {
      // Aplicar multa de 10% e juros de 1%
      const multa = comissao.valor_corretor * 0.10;
      const juros = comissao.valor_corretor * 0.01;
      const valorTotal = comissao.valor_corretor + multa + juros;

      await supabase
        .from('comissoes')
        .update({
          status: 'atrasado',
          multa_atraso: multa,
          juros_atraso: juros,
          valor_total_recebido: valorTotal
        })
        .eq('id', comissao.id);

      // Notificar corretor
      await supabase
        .from('notificacoes')
        .insert({
          broker_id: comissao.corretor_id,
          tipo: 'alerta',
          titulo: 'Comissão em Atraso - Cláusula de Dobro',
          mensagem: `Sua comissão está atrasada. Foi aplicada multa de 10% (R$ ${multa.toLocaleString('pt-BR')}) e juros de 1% (R$ ${juros.toLocaleString('pt-BR')}). Valor total a receber: R$ ${valorTotal.toLocaleString('pt-BR')}.`,
          status: 'nao_lida'
        });

      processadas++;
    }

    return {
      processadas,
      message: `${processadas} comissões processadas com cláusula de dobro`
    };

  } catch (error: any) {
    return { error: error.message, message: 'Erro ao processar comissões atrasadas' };
  }
}

// Executar SLA e redistribuição de leads frios
async function executarSlaRedistribuicao() {
  try {
    const { error } = await supabase.rpc('verificar_sla_e_redistribuir');
    if (error) throw error;
    return { success: true, message: 'SLA e redistribuição executados' };
  } catch (error: any) {
    return { error: error.message, message: 'Erro ao executar SLA' };
  }
}

// Processar expiração de créditos
async function processarExpiracaoCreditos() {
  try {
    const hoje = new Date();

    // Buscar créditos expirados
    const { data: creditos, error } = await supabase
      .from('wallet_creditos')
      .select('*')
      .eq('status', 'disponivel')
      .lte('data_expiracao', hoje.toISOString());

    if (error) throw error;

    let expirados = 0;

    for (const credito of creditos) {
      await supabase
        .from('wallet_creditos')
        .update({ status: 'expirado' })
        .eq('id', credito.id);

      // Notificar incorporadora
      await supabase
        .from('notificacoes')
        .insert({
          incorporadora_id: credito.incorporadora_id,
          tipo: 'alerta',
          titulo: 'Créditos Expirados',
          mensagem: `R$ ${credito.valor.toLocaleString('pt-BR')} em créditos expiraram e foram removidos da sua wallet.`,
          status: 'nao_lida'
        });

      expirados++;
    }

    return {
      expirados,
      message: `${expirados} créditos expirados processados`
    };

  } catch (error: any) {
    return { error: error.message, message: 'Erro ao processar expiração de créditos' };
  }
}
