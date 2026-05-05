// 🏛️ SECURITY BROKER SB v18 - MARKETPLACE DE SERVIÇOS
// Engine de Marketplace com Taxa de Intermediação 20% e Split Multinível

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MarketplaceRequest {
  acao: 'criar_servico' | 'buscar_servicos' | 'criar_ordem' | 'processar_checkout';
  dados?: {
    categoria_id?: string;
    nome_servico?: string;
    descricao_servico?: string;
    preco_base?: number;
    preco_minimo?: number;
    preco_maximo?: number;
    tipo_preco?: 'fixo' | 'faixa' | 'orcamento';
    taxa_intermediacao?: number;
    split_nivel1?: number;
    split_nivel2?: number;
    split_nivel3?: number;
    servico_id?: string;
    cliente_id?: string;
    descricao_ordem?: string;
    preco_final?: number;
    endereco_execucao?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    coordenadas_lat?: number;
    coordenadas_lng?: number;
    forma_pagamento?: 'cartao_sb' | 'pix_sb' | 'debito_sb';
    parcelas?: number;
    broker_nivel1_id?: string;
    broker_nivel2_id?: string;
    broker_nivel3_id?: string;
    broker_nivel4_id?: string;
    broker_nivel5_id?: string;
  };
}

interface MarketplaceResponse {
  success: boolean;
  servico_criado?: {
    id: string;
    nome_servico: string;
    taxa_intermediacao: number;
    split_niveis: any;
    status: string;
  };
  servicos_disponiveis?: Array<{
    id: string;
    nome_servico: string;
    categoria: string;
    preco_base: number;
    taxa_intermediacao: number;
    split_niveis: any;
    avaliacao_media: number;
    total_avaliacoes: number;
    selo_qualidade: string;
    prestador: {
      id: string;
      nome: string;
      email: string;
      telefone: string;
    };
    disponibilidade: {
      disponivel: boolean;
      regioes_atendidas: string[];
      tempo_entrega_estimado: number;
      horario_funcionamento: any;
    };
  }>;
  ordem_criada?: {
    id: string;
    status: string;
    data_expiracao: string;
    mensagem: string;
  };
  checkout_processado?: {
    checkout_id: string;
    status: string;
    valores_distribuidos: any;
    mensagem: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: MarketplaceRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🏛️ Marketplace: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'criar_servico':
        resultado = await criarServicoMarketplace(dados);
        break;
      case 'buscar_servicos':
        resultado = await buscarServicosDisponiveis(dados);
        break;
      case 'criar_ordem':
        resultado = await criarOrdemServico(dados);
        break;
      case 'processar_checkout':
        resultado = await processarCheckoutNativo(dados);
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
    console.error('Erro no Marketplace:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Marketplace',
      details: error.message
    }, { status: 500 });
  }
}

async function criarServicoMarketplace(dados: any): Promise<MarketplaceResponse['servico_criado']> {
  const { categoria_id, nome_servico, descricao_servico, preco_base, preco_minimo, preco_maximo, tipo_preco, taxa_intermediacao } = dados;
  
  // Validar dados obrigatórios
  if (!categoria_id || !nome_servico || !preco_base || !tipo_preco) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Configurar taxa padrão (20% SB)
  const taxaFinal = taxa_intermediacao || 20.00;
  
  // Configurar split multinível (padrão: 20% do valor split)
  const splitNiveis = {
    nivel1: { percentual: 20, broker_id: null }, // 20% do split
    nivel2: { percentual: 20, broker_id: null }, // 20% do valor do nível 1
    nivel3: { percentual: 20, broker_id: null }, // 20% do valor do nível 2
    nivel4: { percentual: 20, broker_id: null }, // 20% do valor do nível 3
    nivel5: { percentual: 20, broker_id: null }  // 20% do valor do nível 4 (restante)
  };
  
  // Criar serviço
  const { data: servico, error } = await supabase
    .from('servicos_marketplace')
    .insert({
      categoria_id,
      nome_servico,
      descricao_servico,
      preco_base,
      preco_minimo,
      preco_maximo,
      tipo_preco,
      taxa_intermediacao: taxaFinal,
      split_niveis: splitNiveis,
      disponivel: true,
      status: 'ativo'
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao criar serviço: ${error.message}`);
  }
  
  // Criar notificação
  await supabase
    .from('notificacoes')
    .insert({
      broker_id: servico.prestador_id,
      tipo: 'marketplace',
      titulo: 'Serviço Criado no Marketplace',
      mensagem: `Seu serviço "${nome_servico}" foi publicado com taxa de ${taxaFinal}%`,
      status: 'nao_lida'
    });
  
  return {
    id: servico.id,
    nome_servico: servico.nome_servico,
    taxa_intermediacao: servico.taxa_intermediacao,
    split_niveis: servico.split_niveis,
    status: servico.status
  };
}

async function buscarServicosDisponiveis(dados: any): Promise<MarketplaceResponse['servicos_disponiveis']> {
  const { categoria_id, cidade, preco_minimo, preco_maximo, limite = 50 } = dados;
  
  let query = supabase
    .from('dashboard_marketplace')
    .select(`
      *,
      prestador!inner(
        id,
        nome,
        email,
        telefone
      ),
      categoria!inner(
        id,
        nome_categoria,
        slug
      )
    `)
    .eq('disponivel', true)
    .eq('aprovado', true)
    .order('avaliacao_media', { ascending: false })
    .order('total_avaliacoes', { ascending: false })
    .limit(limite);
  
  // Aplicar filtros
  if (categoria_id) {
    query = query.eq('categoria_id', categoria_id);
  }
  
  if (cidade) {
    query = query.contains('regioes_atendidas', `[${cidade}]`);
  }
  
  if (preco_minimo) {
    query = query.gte('preco_base', preco_minimo);
  }
  
  if (preco_maximo) {
    query = query.lte('preco_base', preco_maximo);
  }
  
  const { data: servicos, error } = await query;
  
  if (error) {
    throw new Error(`Erro ao buscar serviços: ${error.message}`);
  }
  
  // Formatar resposta
  const servicosFormatados = servicos.map(servico => ({
    id: servico.id,
    nome_servico: servico.nome_servico,
    categoria: servico.nome_categoria,
    preco_base: servico.preco_base,
    taxa_intermediacao: servico.taxa_intermediacao,
    split_niveis: servico.split_niveis,
    avaliacao_media: servico.avaliacao_media,
    total_avaliacoes: servico.total_avaliacoes,
    selo_qualidade: servico.selo_qualidade,
    prestador: servico.prestador,
    disponibilidade: {
      disponivel: servico.disponivel,
      regioes_atendidas: servico.regioes_atendidas,
      tempo_entrega_estimado: servico.tempo_entrega_estimado,
      horario_funcionamento: servico.horario_funcionamento
    }
  }));
  
  return servicosFormatados;
}

async function criarOrdemServico(dados: any): Promise<MarketplaceResponse['ordem_criada']> {
  const { servico_id, cliente_id, descricao_ordem, preco_final, endereco_execucao, cidade, estado, cep, coordenadas_lat, coordenadas_lng } = dados;
  
  // Validar dados obrigatórios
  if (!servico_id || !cliente_id || !preco_final) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Criar ordem
  const { data: ordem, error } = await supabase
    .from('ordens_servicos')
    .insert({
      servico_id,
      cliente_id,
      descricao_ordem,
      preco_final,
      endereco_execucao,
      cidade,
      estado,
      cep,
      coordenadas: `POINT(${coordenadas_lng} ${coordenadas_lat})`,
      data_expiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao criar ordem: ${error.message}`);
  }
  
  // Notificar prestador
  await supabase
    .from('notificacoes')
    .insert([
      {
        broker_id: (await supabase.from('servicos_marketplace').select('prestador_id').eq('id', servico_id).single()).data?.prestador_id,
        tipo: 'marketplace',
        titulo: 'Nova Ordem de Serviço',
        mensagem: `Nova ordem recebida: ${descricao_ordem}`,
        status: 'nao_lida'
      },
      {
        cliente_id,
        tipo: 'marketplace',
        titulo: 'Ordem Criada com Sucesso',
        mensagem: `Sua ordem foi criada. Aguardando aceitação do prestador.`,
        status: 'nao_lida'
      }
    ]);
  
  return {
    id: ordem.id,
    status: ordem.status,
    data_expiracao: ordem.data_expiracao,
    mensagem: 'Ordem criada com sucesso. Aguardando aceitação do prestador.'
  };
}

async function processarCheckoutNativo(dados: any): Promise<MarketplaceResponse['checkout_processado']> {
  const { ordem_servico_id, cliente_id, forma_pagamento, parcelas, broker_nivel1_id, broker_nivel2_id, broker_nivel3_id, broker_nivel4_id, broker_nivel5_id } = dados;
  
  // Validar dados obrigatórios
  if (!ordem_servico_id || !cliente_id || !forma_pagamento) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Buscar ordem
  const { data: ordem, error: errorOrdem } = await supabase
    .from('ordens_servicos')
    .select(`
      *,
      servicos_marketplace!inner(
        preco_base,
        taxa_intermediacao,
        split_niveis
      )
    `)
    .eq('id', ordem_servico_id)
    .single();
  
  if (errorOrdem || !ordem) {
    throw new Error('Ordem não encontrada');
  }
  
  // Calcular valores do split multinível (20% do valor do split)
  const valorTotal = ordem.preco_final;
  const valorSplit = valorTotal * 0.20; // 20% do valor total para split
  const valorNivel1 = valorSplit * 0.20; // 20% do split = 4% do total
  const valorNivel2 = valorNivel1 * 0.20; // 20% do nível 1 = 0.8% do total
  const valorNivel3 = valorNivel2 * 0.20; // 20% do nível 2 = 0.16% do total
  const valorNivel4 = valorNivel3 * 0.20; // 20% do nível 3 = 0.032% do total
  const valorNivel5 = valorSplit - (valorNivel1 + valorNivel2 + valorNivel3 + valorNivel4); // Restante = 12.8% do total
  
  // Criar checkout
  const { data: checkout, error: errorCheckout } = await supabase
    .from('checkout_nativo_sb')
    .insert({
      ordem_servico_id,
      cliente_id,
      valor_total: valorTotal,
      forma_pagamento,
      parcelas: parcelas || 1,
      broker_nivel1_id,
      broker_nivel2_id,
      broker_nivel3_id,
      broker_nivel4_id,
      broker_nivel5_id,
      status: 'processando'
    })
    .select('*')
    .single();
  
  if (errorCheckout) {
    throw new Error(`Erro ao processar checkout: ${errorCheckout.message}`);
  }
  
  // Atualizar status da ordem
  await supabase
    .from('ordens_servicos')
    .update({
      status: 'aceito',
      data_aceite: new Date().toISOString(),
      broker_id: broker_nivel1_id
    })
    .eq('id', ordem_servico_id);
  
  // Criar notificações
  await supabase
    .from('notificacoes')
    .insert([
      {
        broker_id: broker_nivel1_id,
        tipo: 'marketplace',
        titulo: 'Pagamento Recebido',
        mensagem: `Pagamento de R$ ${valorTotal.toFixed(2)} recebido via ${forma_pagamento}`,
        status: 'nao_lida'
      },
      {
        cliente_id,
        tipo: 'marketplace',
        titulo: 'Pagamento Processado',
        mensagem: `Seu pagamento foi processado com sucesso.`,
        status: 'nao_lida'
      }
    ]);
  
  return {
    checkout_id: checkout.id,
    status: checkout.status,
    valores_distribuidos: {
      valor_total: valorTotal,
      valor_split_total: valorSplit,
      nivel1: { broker_id: broker_nivel1_id, valor: valorNivel1 },
      nivel2: { broker_id: broker_nivel2_id, valor: valorNivel2 },
      nivel3: { broker_id: broker_nivel3_id, valor: valorNivel3 },
      nivel4: { broker_id: broker_nivel4_id, valor: valorNivel4 },
      nivel5: { broker_id: broker_nivel5_id, valor: valorNivel5 }
    },
    mensagem: 'Checkout processado com sucesso. Split multinível aplicado.'
  };
}

// Endpoint para consultar categorias
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    
    if (tipo === 'categorias') {
      const { data: categorias, error } = await supabase
        .from('categorias_servicos')
        .select('*')
        .order('ordem_exibicao', { ascending: true });
      
      if (error) {
        throw new Error(`Erro ao buscar categorias: ${error.message}`);
      }
      
      return NextResponse.json({
        success: true,
        data: categorias,
        message: 'Categorias consultadas com sucesso'
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Tipo de consulta inválido'
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Erro ao consultar categorias:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar categorias',
      details: error.message
    }, { status: 500 });
  }
}
