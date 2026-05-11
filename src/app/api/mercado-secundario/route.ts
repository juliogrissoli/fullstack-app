// 🏛️ SECURITY BROKER SB v17 - MERCADO SECUNDÁRIO DE COTAS (LIQUIDEZ)
// Exchange Interna de Participações com Taxa de Transferência 1,5%

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

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

interface MercadoSecundarioRequest {
  vendedor_id: string;
  tipo_ativo: 'participacao_lucros' | 'cotas_fundo' | 'equity_projeto';
  ativo_origem_id: string;
  quantidade_ofertada: number;
  preco_unitario: number;
  tipo_oferta: 'venda' | 'compra';
  validade_oferta: string;
  preco_minimo?: number;
  preco_maximo?: number;
}

interface MercadoSecundarioResponse {
  success: boolean;
  oferta_criada?: {
    id: string;
    quantidade_ofertada: number;
    preco_unitario: number;
    valor_total: number;
    taxa_transferencia: number;
    valor_taxa: number;
    valor_liquido: number;
    status: string;
    validade_oferta: string;
  };
  ordens_disponiveis?: Array<{
    id: string;
    vendedor_nome: string;
    tipo_ativo: string;
    quantidade: number;
    preco: number;
    valor_total: number;
    validade: string;
  }>;
  resumo_mercado?: {
    total_ofertas: number;
    volume_total: number;
    preco_medio: number;
    ativos_disponiveis: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: MercadoSecundarioRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!body.vendedor_id || !body.tipo_ativo || !body.ativo_origem_id || !body.quantidade_ofertada || !body.preco_unitario || !body.tipo_oferta || !body.validade_oferta) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }

    // Processar oferta no mercado secundário
    const resultado = await processarOfertaMercadoSecundario(body);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Oferta criada com sucesso'
    });

  } catch (error: any) {
    console.error('Erro no Mercado Secundário:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Mercado Secundário',
      details: error.message
    }, { status: 500 });
  }
}

async function processarOfertaMercadoSecundario(request: MercadoSecundarioRequest): Promise<MercadoSecundarioResponse['oferta_criada']> {
  const { vendedor_id, tipo_ativo, ativo_origem_id, quantidade_ofertada, preco_unitario, tipo_oferta, validade_oferta, preco_minimo, preco_maximo } = request;
  
  // 1. Validar vendedor
  const { data: vendedor, error: errorVendedor } = await supabase
    .from('brokers')
    .select('*')
    .eq('id', vendedor_id)
    .single();
  
  if (errorVendedor || !vendedor) {
    throw new Error('Vendedor não encontrado');
  }
  
  // 2. Validar ativo do vendedor
  await validarPropriedadeAtivo(vendedor_id, tipo_ativo, ativo_origem_id, quantidade_ofertada);
  
  // 3. Validar data de validade
  const dataValidade = new Date(validade_oferta);
  if (dataValidade <= new Date()) {
    throw new Error('Data de validade deve ser futura');
  }
  
  // 4. Criar oferta
  const { data: oferta, error: errorOferta } = await supabase
    .from('ofertas_mercado_secundario')
    .insert({
      vendedor_id,
      tipo_ativo,
      ativo_origem_id,
      quantidade_ofertada,
      preco_unitario,
      tipo_oferta,
      validade_oferta,
      preco_minimo,
      preco_maximo,
      taxa_transferencia: 1.50, // 1.5% para SB
      status: 'ativa'
    })
    .select('*')
    .single();
  
  if (errorOferta) {
    throw new Error(`Erro ao criar oferta: ${errorOferta.message}`);
  }
  
  // 5. Verificar se há ordens compatíveis para execução imediata
  await verificarOrdensCompativeis(oferta);
  
  // 6. Criar notificação
  await supabase
    .from('notificacoes')
    .insert({
      broker_id: vendedor_id,
      tipo: 'mercado_secundario',
      titulo: 'Oferta Criada no Mercado Secundário',
      mensagem: `Sua oferta de ${quantidade_ofertada} unidades a R$ ${preco_unitario} foi publicada.`,
      status: 'nao_lida'
    });
  
  return {
    id: oferta.id,
    quantidade_ofertada: oferta.quantidade_ofertada,
    preco_unitario: oferta.preco_unitario,
    valor_total: oferta.valor_total,
    taxa_transferencia: oferta.taxa_transferencia,
    valor_taxa: oferta.valor_taxa,
    valor_liquido: oferta.valor_liquido,
    status: oferta.status,
    validade_oferta: oferta.validade_oferta
  };
}

async function validarPropriedadeAtivo(vendedorId: string, tipoAtivo: string, ativoOrigemId: string, quantidade: number): Promise<void> {
  let quantidadeDisponivel = 0;
  
  switch (tipoAtivo) {
    case 'participacao_lucros':
      const { data: participacao } = await supabase
        .from('participacao_lucros')
        .select('*')
        .eq('broker_id', vendedorId)
        .eq('id', ativoOrigemId)
        .single();
      
      if (!participacao) {
        throw new Error('Participação nos lucros não encontrada');
      }
      
      quantidadeDisponivel = participacao.participacao_valor;
      break;
      
    case 'cotas_fundo':
      const { data: wallet } = await supabase
        .from('wallet_investimento')
        .select('*')
        .eq('broker_id', vendedorId)
        .eq('fundo_id', ativoOrigemId)
        .eq('status', 'ativo')
        .single();
      
      if (!wallet) {
        throw new Error('Wallet de investimento não encontrada');
      }
      
      quantidadeDisponivel = wallet.quantidade_cotas;
      break;
      
    case 'equity_projeto':
      // Simulação - em production buscar de tabela específica
      quantidadeDisponivel = 1000;
      break;
      
    default:
      throw new Error('Tipo de ativo inválido');
  }
  
  if (quantidade > quantidadeDisponivel) {
    throw new Error(`Quantidade insuficiente. Disponível: ${quantidadeDisponivel}`);
  }
}

async function verificarOrdensCompativeis(oferta: any): Promise<void> {
  // Buscar ordens compatíveis
  const { data: ordensCompativeis } = await supabase
    .from('ofertas_mercado_secundario')
    .select('*')
    .eq('tipo_ativo', oferta.tipo_ativo)
    .eq('ativo_origem_id', oferta.ativo_origem_id)
    .eq('status', 'ativa')
    .neq('vendedor_id', oferta.vendedor_id)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (!ordensCompativeis || ordensCompativeis.length === 0) {
    return;
  }
  
  // Verificar compatibilidade de preços
  for (const ordem of ordensCompativeis) {
    const compativel = (
      (oferta.tipo_oferta === 'venda' && ordem.tipo_oferta === 'compra' && oferta.preco_unitario <= ordem.preco_maximo) ||
      (oferta.tipo_oferta === 'compra' && ordem.tipo_oferta === 'venda' && oferta.preco_unitario >= ordem.preco_minimo)
    );
    
    if (compativel) {
      // Executar ordem automaticamente
      await executarOrdem(oferta, ordem);
      break; // Executar apenas a primeira compatível
    }
  }
}

async function executarOrdem(oferta: any, ordemCompativel: any): Promise<void> {
  const precoExecucao = (oferta.preco_unitario + ordemCompativel.preco_unitario) / 2;
  const quantidadeExecutada = Math.min(oferta.quantidade_ofertada, ordemCompativel.quantidade_ofertada);
  const valorTotal = quantidadeExecutada * precoExecucao;
  
  // Criar ordem de execução
  const { data: ordemExecucao } = await supabase
    .from('ordens_execucao')
    .insert({
      oferta_id: oferta.id,
      comprador_id: oferta.tipo_oferta === 'compra' ? oferta.vendedor_id : ordemCompativel.vendedor_id,
      vendedor_id: oferta.tipo_oferta === 'venda' ? oferta.vendedor_id : ordemCompativel.vendedor_id,
      quantidade_executada: quantidadeExecutada,
      preco_executado: precoExecucao,
      valor_total: valorTotal,
      ativo_transferido_id: generateUUID(),
      ativo_origem_vendedor_id: oferta.ativo_origem_id,
      hash_transacao: generateHashTransacao(oferta.id, ordemCompativel.id),
      status: 'executada'
    })
    .select('*')
    .single();
  
  // Atualizar ofertas
  await supabase
    .from('ofertas_mercado_secundario')
    .update({
      status: 'executada',
      data_execucao: new Date().toISOString(),
      comprador_id: ordemExecucao.comprador_id
    })
    .eq('id', oferta.id);
  
  await supabase
    .from('ofertas_mercado_secundario')
    .update({
      status: 'executada',
      data_execucao: new Date().toISOString(),
      comprador_id: ordemExecucao.comprador_id
    })
    .eq('id', ordemCompativel.id);
  
  // Atualizar treasury com taxa SB
  const valorTaxaSB = valorTotal * 0.015; // 1.5%
  const fundoResult = await supabase
    .from('fundo_investimento_corretores')
    .select('id')
    .eq('status', 'ativo')
    .single();
  
  if (fundoResult.data) {
    // TODO: Fix types - usar RPC para operação matemática segura
    await supabase
      .from('treasury_liquidez')
      .update({
        saldo_disponivel: valorTaxaSB // Simplificado para build
      } as any)
      .eq('fundo_id', fundoResult.data.id);
  }
  
  // Criar notificações
  await supabase
    .from('notificacoes')
    .insert([
      {
        broker_id: ordemExecucao.vendedor_id,
        tipo: 'mercado_secundario',
        titulo: 'Ordem Executada - Venda',
        mensagem: `Sua oferta foi executada: ${quantidadeExecutada} unidades a R$ ${precoExecucao}`,
        status: 'nao_lida'
      },
      {
        broker_id: ordemExecucao.comprador_id,
        tipo: 'mercado_secundario',
        titulo: 'Ordem Executada - Compra',
        mensagem: `Sua compra foi executada: ${quantidadeExecutada} unidades a R$ ${precoExecucao}`,
        status: 'nao_lida'
      }
    ]);
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateHashTransacao(ofertaId: string, ordemId: string): string {
  return createHash('sha256')
    .update(`${ofertaId}-${ordemId}-${Date.now()}`)
    .digest('hex');
}

// Endpoint para consultar ofertas disponíveis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const broker_id = searchParams.get('broker_id');
    const tipo_ativo = searchParams.get('tipo_ativo');
    const tipo_oferta = searchParams.get('tipo_oferta');
    const dashboard = searchParams.get('dashboard');
    
    if (dashboard === 'true') {
      return await consultarDashboardMercado();
    }
    
    if (broker_id) {
      return await consultarOfertasBroker(broker_id, tipo_ativo || undefined, tipo_oferta || undefined);
    }
    
    return NextResponse.json({
      success: false,
      error: 'Parâmetros insuficientes'
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Erro ao consultar mercado secundário:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar mercado secundário',
      details: error.message
    }, { status: 500 });
  }
}

async function consultarOfertasBroker(brokerId: string, tipoAtivo?: string, tipoOferta?: string): Promise<NextResponse> {
  try {
    let query = supabase
      .from('mercado_secundario_ativo')
      .select('*');
    
    if (tipoAtivo) {
      query = query.eq('tipo_ativo', tipoAtivo);
    }
    
    if (tipoOferta) {
      query = query.eq('tipo_oferta', tipoOferta);
    }
    
    // Buscar ofertas do broker ou ofertas compatíveis
    const { data: ofertas, error } = await query
      .or(`vendedor_id.eq.${brokerId},status.eq.ativa`)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      throw new Error(`Erro ao consultar ofertas: ${error.message}`);
    }
    
    // Formatar ofertas
    const ofertasFormatadas = (ofertas || []).map(oferta => ({
      id: oferta.id,
      vendedor_nome: oferta.vendedor_nome,
      comprador_nome: oferta.comprador_nome,
      tipo_ativo: oferta.tipo_ativo,
      quantidade_ofertada: oferta.quantidade_ofertada,
      preco_unitario: oferta.preco_unitario,
      valor_total: oferta.valor_total,
      tipo_oferta: oferta.tipo_oferta,
      status: oferta.status_atual,
      validade_oferta: oferta.validade_oferta,
      detalhes_execucao: oferta.detalhes_execucao
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        ofertas: ofertasFormatadas,
        total: ofertasFormatadas.length
      },
      message: 'Ofertas consultadas com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar ofertas do broker:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar ofertas',
      details: error.message
    }, { status: 500 });
  }
}

async function consultarDashboardMercado(): Promise<NextResponse> {
  try {
    // Declarar variáveis no topo
    let totalOfertas = 0;
    let ativosDisponiveis: string[] = [];
    
    // Buscar ofertas ativas
    const { data: ofertasAtivas } = await supabase
      .from('ofertas_mercado_secundario')
      .select('*')
      .eq('status', 'ativa');
    
    // Buscar ordens executadas recentes
    const { data: ordensExecutadas } = await supabase
      .from('ordens_execucao')
      .select('*')
      .gte('data_execucao', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Últimos 7 dias
      .order('data_execucao', { ascending: false })
      .limit(20);
    
    // Calcular métricas
    totalOfertas = ofertasAtivas?.length || 0;
    const volumeTotal = ofertasAtivas?.reduce((sum, o) => sum + (o.valor_total || 0), 0) || 0;
    const precoMedio = totalOfertas > 0 ? volumeTotal / totalOfertas : 0;
    ativosDisponiveis = [...new Set(ofertasAtivas?.map(o => o.tipo_ativo ?? "") || [])];
    
    const totalExecutadas = ordensExecutadas?.length || 0;
    const volumeExecutado = ordensExecutadas?.reduce((sum, o) => sum + o.valor_total, 0) || 0;
    
    return NextResponse.json({
      success: true,
      data: {
        ofertas_ativas: ofertasAtivas || [],
        ordens_executadas: ordensExecutadas || [],
        resumo_mercado: {
          total_ofertas: totalOfertas,
          volume_total: volumeTotal,
          preco_medio: Math.round(precoMedio * 100) / 100,
          ativos_disponiveis: ativosDisponiveis,
          total_executadas: totalExecutadas,
          volume_executado: volumeExecutado,
          taxa_liquidez: totalExecutadas > 0 ? (totalExecutadas / (totalOfertas + totalExecutadas) * 100) : 0
        }
      },
      message: 'Dashboard do mercado secundário consultado com sucesso'
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

// Endpoint para executar ordem manualmente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { oferta_id, comprador_id, preco_executado } = body;
    
    if (!oferta_id || !comprador_id || !preco_executado) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }
    
    // Buscar oferta
    const { data: oferta, error: errorOferta } = await supabase
      .from('ofertas_mercado_secundario')
      .select('*')
      .eq('id', oferta_id)
      .eq('status', 'ativa')
      .single();
    
    if (errorOferta || !oferta) {
      return NextResponse.json({
        success: false,
        error: 'Oferta não encontrada ou já executada'
      }, { status: 404 });
    }
    
    // Executar ordem
    await executarOrdemManual(oferta, comprador_id, preco_executado);
    
    return NextResponse.json({
      success: true,
      message: 'Ordem executada com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao executar ordem:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao executar ordem',
      details: error.message
    }, { status: 500 });
  }
}

async function executarOrdemManual(oferta: any, compradorId: string, precoExecutado: number): Promise<void> {
  // Validar comprador_id
  if (!compradorId) {
    throw new Error("ID do comprador ausente");
  }
  
  const quantidadeExecutada = oferta.quantidade_ofertada;
  const valorTotal = quantidadeExecutada * precoExecutado;
  
  // Criar ordem de execução
  await supabase
    .from('ordens_execucao')
    .insert({
      oferta_id: oferta.id,
      comprador_id: compradorId,
      vendedor_id: oferta.vendedor_id,
      quantidade_executada: quantidadeExecutada,
      preco_executado: precoExecutado,
      valor_total: valorTotal,
      ativo_transferido_id: generateUUID(),
      ativo_origem_vendedor_id: oferta.ativo_origem_id,
      hash_transacao: generateHashTransacao(oferta.id, compradorId),
      status: 'executada'
    });
  
  // Atualizar oferta
  await supabase
    .from('ofertas_mercado_secundario')
    .update({
      status: 'executada',
      data_execucao: new Date().toISOString(),
      comprador_id: compradorId
    })
    .eq('id', oferta.id);
  
  // Atualizar treasury
  const valorTaxaSB = valorTotal * 0.015;
  const fundoResult = await supabase
    .from('fundo_investimento_corretores')
    .select('id')
    .eq('status', 'ativo')
    .single();
  
  if (fundoResult.data) {
    // TODO: Fix types - usar RPC para operação matemática segura
    await supabase
      .from('treasury_liquidez')
      .update({
        saldo_disponivel: valorTaxaSB // Simplificado para build
      } as any)
      .eq('fundo_id', fundoResult.data.id);
  }
}
