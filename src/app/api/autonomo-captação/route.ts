// 🏛️ SECURITY BROKER SB v19 - AUTÔNOMO & MATRIZ 5X5
// API de Captação e Distribuição de Comissão para Corretores Autônomos

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

interface AutonomoCaptacaoRequest {
  acao: 'cadastrar_exclusividade' | 'processar_comissao' | 'consultar_wallets' | 'verificar_potencial_recorrencia';
  dados?: {
    user_id?: string;
    codigo_imovel?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    tipo_exclusividade?: string;
    valor_venda?: number;
    comissao_percentual?: number;
    captador_user_id?: string;
    transacao_id?: string;
    tipo_transacao?: string;
    valor_transacao?: number;
    data_transacao?: string;
    mes_referencia?: string;
  };
}

interface AutonomoCaptacaoResponse {
  success: boolean;
  exclusividade_cadastrada?: {
    id: string;
    codigo_imovel: string;
    status_exclusividade: string;
    data_inicio_exclusividade: string;
    comissao_percentual: number;
  };
  comissao_processada?: {
    id: string;
    comissao_total: number;
    cota_captador: number;
    taxa_sb_total: number;
    wallet_saque_70: number;
    wallet_aceleracao_30: number;
    status_transacao: string;
  };
  wallets?: {
    wallet_saque: {
      saldo_disponivel: number;
      saldo_bloqueado: number;
      saldo_total: number;
    };
    wallet_aceleracao: {
      saldo_disponivel: number;
      saldo_bloqueado: number;
      saldo_total: number;
    };
  };
  potencial_recorrencia?: {
    potencial_total: number;
    potencial_nivel1: number;
    potencial_nivel2: number;
    potencial_nivel3: number;
    potencial_nivel4: number;
    potencial_nivel5: number;
    taxa_realizacao: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AutonomoCaptacaoRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🏛️ Autônomo Captação: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'cadastrar_exclusividade':
        resultado = await cadastrarExclusividade(dados);
        break;
      case 'processar_comissao':
        resultado = await processarComissao(dados);
        break;
      case 'consultar_wallets':
        resultado = await consultarWallets(dados);
        break;
      case 'verificar_potencial_recorrencia':
        resultado = await verificarPotencialRecorrencia(dados);
        break;
      default:
        throw new Error('Ação inválida');
    }
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: `Operação ${acao} concluída com sucesso`
    });
    
  } catch (error: any) {
    console.error('Erro no Autônomo Captação:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Autônomo Captação',
      details: error.message
    }, { status: 500 });
  }
}

async function cadastrarExclusividade(dados: any): Promise<AutonomoCaptacaoResponse['exclusividade_cadastrada']> {
  const { user_id, codigo_imovel, endereco, cidade, estado, tipo_exclusividade, valor_venda, comissao_percentual, captador_user_id } = dados;
  
  // Validar dados obrigatórios
  if (!user_id || !codigo_imovel || !endereco || !cidade || !estado || !tipo_exclusividade || !comissao_percentual) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Verificar se imóvel já existe
  const { data: imovelExistente } = await supabase
    .from('imoveis_exclusividade')
    .select('*')
    .eq('codigo_imovel', codigo_imovel)
    .single();
  
  if (imovelExistente) {
    throw new Error('Imóvel já cadastrado');
  }
  
  // Criar exclusividade
  const { data: exclusividade, error } = await supabase
    .from('imoveis_exclusividade')
    .insert({
      user_id,
      codigo_imovel,
      endereco,
      cidade,
      estado,
      tipo_exclusividade,
      valor_venda,
      comissao_percentual,
      data_inicio_exclusividade: new Date().toISOString().split('T')[0],
      status_exclusividade: 'ativa',
      captador_user_id: captador_user_id || user_id,
      data_captacao: new Date().toISOString().split('T')[0],
      status_captacao: 'aprovada'
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao cadastrar exclusividade: ${error.message}`);
  }
  
  // Criar notificação
  await supabase
    .from('notificacoes')
    .insert({
      broker_id: user_id,
      tipo: 'autonomo',
      titulo: 'Exclusividade Cadastrada',
      mensagem: `Imóvel ${codigo_imovel} cadastrado com exclusividade`,
      status: 'nao_lida'
    });
  
  return {
    id: exclusividade.id,
    codigo_imovel: exclusividade.codigo_imovel,
    status_exclusividade: exclusividade.status_exclusividade,
    data_inicio_exclusividade: exclusividade.data_inicio_exclusividade,
    comissao_percentual: exclusividade.comissao_percentual
  };
}

async function processarComissao(dados: any): Promise<AutonomoCaptacaoResponse['comissao_processada']> {
  const { transacao_id, tipo_transacao, valor_transacao, data_transacao, imovel_id } = dados;
  
  // Validar dados obrigatórios
  if (!imovel_id || !tipo_transacao || !valor_transacao || !data_transacao) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Buscar dados do imóvel
  const { data: imovel, error: errorImovel } = await supabase
    .from('imoveis_exclusividade')
    .select('*')
    .eq('id', imovel_id)
    .single();
  
  if (errorImovel || !imovel) {
    throw new Error('Imóvel não encontrado');
  }
  
  // Calcular comissão total
  let comissaoTotal = 0;
  if (imovel.comissao_tipo_calculo === 'percentual') {
    comissaoTotal = valor_transacao * (imovel.comissao_percentual / 100);
  } else if (imovel.comissao_tipo_calculo === 'fixo') {
    comissaoTotal = imovel.comissao_valor_fixo || 0;
  } else {
    // Misto
    const percentual = valor_transacao * (imovel.comissao_percentual / 100);
    const fixo = imovel.comissao_valor_fixo || 0;
    comissaoTotal = Math.max(percentual, fixo);
  }
  
  // Criar transação de comissão
  const { data: transacao, error: errorTransacao } = await supabase
    .from('transacoes_comissao')
    .insert({
      imovel_exclusividade_id: imovel_id,
      captador_user_id: imovel.captador_user_id,
      tipo_transacao,
      valor_transacao,
      data_transacao,
      comissao_total: comissaoTotal,
      comissao_percentual: imovel.comissao_percentual,
      status_transacao: 'processando',
      data_processamento: new Date().toISOString(),
      conformidade_crecci: false,
      artigo_725_cc: false,
      nexo_causal_protegido: false
    })
    .select('*')
    .single();
  
  if (errorTransacao) {
    throw new Error(`Erro ao processar comissão: ${errorTransacao.message}`);
  }
  
  // Iniciar auditoria automática
  await iniciarAuditoriaAutomatica(transacao.id);
  
  return {
    id: transacao.id,
    comissao_total: transacao.comissao_total,
    cota_captador: transacao.cota_captador,
    taxa_sb_total: transacao.taxa_sb_total,
    wallet_saque_70: transacao.wallet_saque_70,
    wallet_aceleracao_30: transacao.wallet_aceleracao_30,
    status_transacao: transacao.status_transacao
  };
}

async function consultarWallets(dados: any): Promise<AutonomoCaptacaoResponse['wallets']> {
  const { user_id } = dados;
  
  // Buscar wallet de saque
  const { data: walletSaque, error: errorSaque } = await supabase
    .from('wallet_saque_autonomo')
    .select('*')
    .eq('broker_id', user_id)
    .single();
  
  if (errorSaque) {
    // Criar wallet se não existir
    const { data: novaWalletSaque } = await supabase
      .from('wallet_saque_autonomo')
      .insert({
        broker_id: user_id,
        saldo_disponivel: 0,
        saldo_bloqueado: 0,
        status_wallet: 'ativa'
      })
      .select('*')
      .single();
    
    return {
      wallet_saque: {
        saldo_disponivel: novaWalletSaque.saldo_disponivel,
        saldo_bloqueado: novaWalletSaque.saldo_bloqueado,
        saldo_total: novaWalletSaque.saldo_total
      },
      wallet_aceleracao: {
        saldo_disponivel: 0,
        saldo_bloqueado: 0,
        saldo_total: 0
      }
    };
  }
  
  // Buscar wallet de aceleração
  const { data: walletAceleracao, error: errorAceleracao } = await supabase
    .from('wallet_aceleracao_autonomo')
    .select('*')
    .eq('broker_id', user_id)
    .single();
  
  if (errorAceleracao) {
    // Criar wallet se não existir
    const { data: novaWalletAceleracao } = await supabase
      .from('wallet_aceleracao_autonomo')
      .insert({
        broker_id: user_id,
        saldo_disponivel: 0,
        saldo_bloqueado: 0,
        status_wallet: 'ativa'
      })
      .select('*')
      .single();
    
    return {
      wallet_saque: {
        saldo_disponivel: walletSaque.saldo_disponivel,
        saldo_bloqueado: walletSaque.saldo_bloqueado,
        saldo_total: walletSaque.saldo_total
      },
      wallet_aceleracao: {
        saldo_disponivel: novaWalletAceleracao.saldo_disponivel,
        saldo_bloqueado: novaWalletAceleracao.saldo_bloqueado,
        saldo_total: novaWalletAceleracao.saldo_total
      }
    };
  }
  
  return {
    wallet_saque: {
      saldo_disponivel: walletSaque.saldo_disponivel,
      saldo_bloqueado: walletSaque.saldo_bloqueado,
      saldo_total: walletSaque.saldo_total
    },
    wallet_aceleracao: {
      saldo_disponivel: walletAceleracao.saldo_disponivel,
      saldo_bloqueado: walletAceleracao.saldo_bloqueado,
      saldo_total: walletAceleracao.saldo_total
    }
  };
}

async function verificarPotencialRecorrencia(dados: any): Promise<AutonomoCaptacaoResponse['potencial_recorrencia']> {
  const { user_id, mes_referencia } = dados;
  
  // Calcular potencial para o mês
  const mesReferencia = mes_referencia || new Date().toISOString().slice(0, 7);
  
  // Buscar dados de potencial
  const { data: potencial, error } = await supabase
    .from('potencial_recorrencia_mensal')
    .select('*')
    .eq('broker_id', user_id)
    .eq('mes_referencia', mesReferencia + '-01')
    .single();
  
  if (error) {
    // Calcular potencial se não existir
    const potencialCalculado = await calcularPotencialRecorrencia(user_id, mesReferencia + '-01');
    
    return {
      potencial_total: potencialCalculado.potencial_total_recorrencia,
      potencial_nivel1: potencialCalculado.potencial_nivel1,
      potencial_nivel2: potencialCalculado.potencial_nivel2,
      potencial_nivel3: potencialCalculado.potencial_nivel3,
      potencial_nivel4: potencialCalculado.potencial_nivel4,
      potencial_nivel5: potencialCalculado.potencial_nivel5,
      taxa_realizacao: potencialCalculado.taxa_realizacao
    };
  }
  
  return {
    potencial_total: potencial.potencial_total_recorrencia,
    potencial_nivel1: potencial.potencial_nivel1,
    potencial_nivel2: potencial.potencial_nivel2,
    potencial_nivel3: potencial.potencial_nivel3,
    potencial_nivel4: potencial.potencial_nivel4,
    potencial_nivel5: potencial.potencial_nivel5,
    taxa_realizacao: potencial.taxa_realizacao
  };
}

async function iniciarAuditoriaAutomatica(transacaoId: string): Promise<void> {
  // Iniciar auditoria CRECI
  await supabase
    .from('auditoria_conformidade_crecci')
    .insert({
      transacao_comissao_id: transacaoId,
      tabela_crecci_respeitada: false,
      percentual_maximo_respeitado: false,
      comissao_justa: false,
      status_auditoria: 'pendente'
    });
  
  // Iniciar auditoria Art. 725 CC
  await supabase
    .from('auditoria_artigo_725_cc')
    .insert({
      transacao_comissao_id: transacaoId,
      nexo_causal_presente: false,
      intermedia_efetiva: false,
      comissao_justa: false,
      status_auditoria: 'pendente'
    });
}

async function calcularPotencialRecorrencia(brokerId: string, mesReferencia: string): Promise<any> {
  // Buscar imóveis em exclusividade
  const { data: imoveis } = await supabase
    .from('imoveis_exclusividade')
    .select('*')
    .eq('captador_user_id', brokerId)
    .eq('status_exclusividade', 'ativa');
  
  // Buscar fechamentos do mês anterior para projeção
  const mesAnterior = new Date(mesReferencia);
  mesAnterior.setMonth(mesAnterior.getMonth() - 1);
  
  const { data: fechamentosAnteriores } = await supabase
    .from('transacoes_comissao')
    .select('comissao_total')
    .eq('captador_user_id', brokerId)
    .gte('data_transacao', mesAnterior.toISOString().slice(0, 7) + '-01')
    .lt('data_transacao', mesReferencia + '-01');
  
  // Calcular médias
  const totalFechamentos = fechamentosAnteriores?.length || 0;
  const valorMedioComissao = (fechamentosAnteriores?.reduce((sum, t) => sum + t.comissao_total, 0) || 0) / totalFechamentos || 0;
  
  // Calcular potencial
  const potencialNivel1 = valorMedioComissao * totalFechamentos * 0.10 * 0.05; // 5.0%
  const potencialNivel2 = valorMedioComissao * totalFechamentos * 0.10 * 0.02; // 2.0%
  const potencialNivel3 = valorMedioComissao * totalFechamentos * 0.10 * 0.015; // 1.5%
  const potencialNivel4 = valorMedioComissao * totalFechamentos * 0.10 * 0.01; // 1.0%
  const potencialNivel5 = valorMedioComissao * totalFechamentos * 0.10 * 0.005; // 0.5%
  
  const potencialTotal = potencialNivel1 + potencialNivel2 + potencialNivel3 + potencialNivel4 + potencialNivel5;
  
  return {
    potencial_total_recorrencia: potencialTotal,
    potencial_nivel1: potencialNivel1,
    potencial_nivel2: potencialNivel2,
    potencial_nivel3: potencialNivel3,
    potencial_nivel4: potencialNivel4,
    potencial_nivel5: potencialNivel5,
    taxa_realizacao: 0 // Será calculado quando houver realização
  };
}

// Endpoint para consultar dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const broker_id = searchParams.get('broker_id');
    
    if (!broker_id) {
      return NextResponse.json({
        success: false,
        error: 'broker_id é obrigatório'
      }, { status: 400 });
    }
    
    // Buscar dashboard completo
    const { data: dashboard, error } = await supabase
      .from('dashboard_autonomo')
      .select('*')
      .eq('id', broker_id)
      .single();
    
    if (error) {
      throw new Error(`Erro ao consultar dashboard: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      data: dashboard,
      message: 'Dashboard consultado com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar dashboard:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar dashboard',
      details: error.message
    }, { status: 500 });
  }
}
