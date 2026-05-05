// 🏛️ SECURITY BROKER SB v19 - MATRIZ 5X5
// API de Engine de Matriz 5x5 para Recorrência e Distribuição

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Matriz5x5Request {
  acao: 'entrar_matriz' | 'consultar_estrutura' | 'processar_creditos_rede' | 'calcular_potencial_recorrencia';
  dados?: {
    broker_id?: string;
    indicador_id?: string;
    nivel_desejado?: number;
    transacao_comissao_id?: string;
    mes_referencia?: string;
  };
}

interface Matriz5x5Response {
  success: boolean;
  posicao_matriz?: {
    id: string;
    nivel_matriz: number;
    posicao_matriz: number;
    status_indicacao: string;
    data_indicacao: string;
  };
  estrutura_matriz?: Array<{
    id: string;
    broker_id: string;
    broker_nome: string;
    nivel_matriz: number;
    posicao_matriz: number;
    total_indicados: number;
    total_fechamentos: number;
    total_comissoes_geradas: number;
    status_indicacao: string;
  }>;
  creditos_gerados?: {
    id: string;
    valor_credito: number;
    valor_nivel1: number;
    valor_nivel2: number;
    valor_nivel3: number;
    valor_nivel4: number;
    valor_nivel5: number;
    status_credito: string;
    beneficiarios: Array<{
      nivel: number;
      broker_id: string;
      valor: number;
    }>;
  };
  potencial_recorrencia?: {
    potencial_total: number;
    potencial_por_nivel: Array<{
      nivel: number;
      valor: number;
      percentual: string;
    }>;
    projecao_mensal: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: Matriz5x5Request = await request.json();
    const { acao, dados } = body;
    
    console.log(`🏛️ Matriz 5x5: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'entrar_matriz':
        resultado = await entrarMatriz(dados);
        break;
      case 'consultar_estrutura':
        resultado = await consultarEstruturaMatriz(dados);
        break;
      case 'processar_creditos_rede':
        resultado = await processarCreditosRede(dados);
        break;
      case 'calcular_potencial_recorrencia':
        resultado = await calcularPotencialRecorrenciaCompleto(dados);
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
    console.error('Erro na Matriz 5x5:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno na Matriz 5x5',
      details: error.message
    }, { status: 500 });
  }
}

async function entrarMatriz(dados: any): Promise<Matriz5x5Response['posicao_matriz']> {
  const { broker_id, indicador_id, nivel_desejado } = dados;
  
  // Validar dados obrigatórios
  if (!broker_id || !indicador_id) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Verificar se broker já está na matriz
  const { data: posicaoExistente } = await supabase
    .from('matriz_indicacao_5x5')
    .select('*')
    .eq('broker_id', broker_id)
    .single();
  
  if (posicaoExistente) {
    throw new Error('Broker já está na matriz');
  }
  
  // Buscar posição do indicador
  const { data: posicaoIndicador } = await supabase
    .from('matriz_indicacao_5x5')
    .select('*')
    .eq('broker_id', indicador_id)
    .eq('status_indicacao', 'ativa')
    .single();
  
  // Determinar nível e posição
  let nivelMatriz = 1;
  let paiId = null;
  
  if (posicaoIndicador) {
    nivelMatriz = posicaoIndicador.nivel_matriz + 1;
    paiId = posicaoIndicador.id;
    
    // Verificar limite de níveis (máximo 5)
    if (nivelMatriz > 5) {
      throw new Error('Limite de níveis da matriz atingido (máximo 5)');
    }
  }
  
  // Verificar limite de indicados diretos do indicador
  const { data: totalIndicados } = await supabase
    .from('matriz_indicacao_5x5')
    .select('id')
    .eq('pai_id', paiId)
    .eq('status_indicacao', 'ativa');
  
  if (totalIndicados && totalIndicados.length >= 5) {
    throw new Error('Indicador já atingiu o limite de 5 indicados diretos');
  }
  
  // Determinar próxima posição disponível no nível
  const { data: posicoesNivel } = await supabase
    .from('matriz_indicacao_5x5')
    .select('posicao_matriz')
    .eq('nivel_matriz', nivelMatriz)
    .eq('status_indicacao', 'ativa')
    .order('posicao_matriz', { ascending: false })
    .limit(1);
  
  let proximaPosicao = 1;
  if (posicoesNivel && posicoesNivel.length > 0) {
    proximaPosicao = posicoesNivel[0].posicao_matriz + 1;
  }
  
  // Criar entrada na matriz
  const { data: novaPosicao, error } = await supabase
    .from('matriz_indicacao_5x5')
    .insert({
      broker_id,
      indicador_id,
      nivel_matriz: nivelMatriz,
      posicao_matriz: proximaPosicao,
      pai_id: paiId,
      data_indicacao: new Date().toISOString().split('T')[0],
      status_indicacao: 'ativa',
      limite_indicados_nivel: 5,
      limite_fechamentos_mes: 10
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao entrar na matriz: ${error.message}`);
  }
  
  // Criar notificação
  await supabase
    .from('notificacoes')
    .insert([
      {
        broker_id,
        tipo: 'matriz_5x5',
        titulo: 'Entrada na Matriz 5x5',
        mensagem: `Você entrou na matriz no nível ${nivelMatriz}, posição ${proximaPosicao}`,
        status: 'nao_lida'
      },
      {
        broker_id: indicador_id,
        tipo: 'matriz_5x5',
        titulo: 'Nova Indicação na Matriz',
        mensagem: `Novo broker entrando na sua linha de indicação`,
        status: 'nao_lida'
      }
    ]);
  
  return {
    id: novaPosicao.id,
    nivel_matriz: novaPosicao.nivel_matriz,
    posicao_matriz: novaPosicao.posicao_matriz,
    status_indicacao: novaPosicao.status_indicacao,
    data_indicacao: novaPosicao.data_indicacao
  };
}

async function consultarEstruturaMatriz(dados: any): Promise<Matriz5x5Response['estrutura_matriz']> {
  const { broker_id } = dados;
  
  // Buscar estrutura completa da matriz
  const { data: estrutura, error } = await supabase
    .from('dashboard_matriz_5x5')
    .select('*')
    .order('nivel_matriz', { ascending: true })
    .order('posicao_matriz', { ascending: true });
  
  if (error) {
    throw new Error(`Erro ao consultar estrutura: ${error.message}`);
  }
  
  // Formatar resposta
  const estruturaFormatada = estrutura.map(item => ({
    id: item.id,
    broker_id: item.broker_id,
    broker_nome: item.broker_nome,
    nivel_matriz: item.nivel_matriz,
    posicao_matriz: item.posicao_matriz,
    total_indicados: item.total_indicados_diretos || 0,
    total_fechamentos: item.total_fechamentos_indicados || 0,
    total_comissoes_geradas: item.total_fundo_recorrencia || 0,
    status_indicacao: 'ativa'
  }));
  
  return estruturaFormatada;
}

async function processarCreditosRede(dados: any): Promise<Matriz5x5Response['creditos_gerados']> {
  const { transacao_comissao_id } = dados;
  
  // Validar dados obrigatórios
  if (!transacao_comissao_id) {
    throw new Error('ID da transação não fornecido');
  }
  
  // Buscar transação de comissão
  const { data: transacao, error: errorTransacao } = await supabase
    .from('transacoes_comissao')
    .select('*')
    .eq('id', transacao_comissao_id)
    .single();
  
  if (errorTransacao || !transacao) {
    throw new Error('Transação não encontrada');
  }
  
  // Buscar matriz do captador
  const { data: matrizCaptador } = await supabase
    .from('matriz_indicacao_5x5')
    .select('*')
    .eq('broker_id', transacao.captador_user_id)
    .eq('status_indicacao', 'ativa')
    .single();
  
  if (!matrizCaptador) {
    throw new Error('Captador não está na matriz');
  }
  
  // Verificar se crédito já foi gerado
  const { data: creditoExistente } = await supabase
    .from('creditos_rede_matriz')
    .select('*')
    .eq('transacao_comissao_id', transacao_comissao_id)
    .single();
  
  if (creditoExistente) {
    throw new Error('Crédito de rede já foi gerado para esta transação');
  }
  
  // Criar crédito de rede
  const { data: credito, error: errorCredito } = await supabase
    .from('creditos_rede_matriz')
    .insert({
      matriz_id: matrizCaptador.id,
      transacao_comissao_id,
      nivel_origem: matrizCaptador.nivel_matriz,
      percentual_credito: 100.00,
      valor_credito: transacao.taxa_sb_fundo_recorrencia,
      status_credito: 'pendente'
    })
    .select('*')
    .single();
  
  if (errorCredito) {
    throw new Error(`Erro ao criar crédito: ${errorCredito.message}`);
  }
  
  // Processar distribuição para os níveis
  const beneficiarios = await processarDistribuicaoNiveis(credito.id, matrizCaptador);
  
  // Atualizar status do crédito
  await supabase
    .from('creditos_rede_matriz')
    .update({
      status_credito: 'processado',
      data_processamento: new Date().toISOString()
    })
    .eq('id', credito.id);
  
  // Criar notificações para beneficiários
  for (const beneficiario of beneficiarios) {
    await supabase
      .from('notificacoes')
      .insert({
        broker_id: beneficiario.broker_id,
        tipo: 'creditos_rede',
        titulo: 'Crédito de Rede Recebido',
        mensagem: `Crédito de R$ ${beneficiario.valor.toFixed(2)} recebido - Nível ${beneficiario.nivel}`,
        status: 'nao_lida'
      });
  }
  
  return {
    id: credito.id,
    valor_credito: credito.valor_credito,
    valor_nivel1: credito.valor_nivel1,
    valor_nivel2: credito.valor_nivel2,
    valor_nivel3: credito.valor_nivel3,
    valor_nivel4: credito.valor_nivel4,
    valor_nivel5: credito.valor_nivel5,
    status_credito: credito.status_credito,
    beneficiarios
  };
}

async function processarDistribuicaoNiveis(creditoId: string, matrizCaptador: any): Promise<Array<{nivel: number, broker_id: string, valor: number}>> {
  const beneficiarios = [];
  
  // Buscar linha ascendente na matriz
  let nivelAtual = matrizCaptador;
  let nivelDistribuicao = 1;
  
  while (nivelAtual && nivelDistribuicao <= 5) {
    if (nivelAtual.pai_id) {
      // Buscar pai
      const { data: pai } = await supabase
        .from('matriz_indicacao_5x5')
        .select('broker_id')
        .eq('id', nivelAtual.pai_id)
        .single();
      
      if (pai) {
        // Calcular valor para este nível
        let percentualNivel = 0;
        switch (nivelDistribuicao) {
          case 1: percentualNivel = 5.0; break;  // 5.0%
          case 2: percentualNivel = 2.0; break;  // 2.0%
          case 3: percentualNivel = 1.5; break;  // 1.5%
          case 4: percentualNivel = 1.0; break;  // 1.0%
          case 5: percentualNivel = 0.5; break;  // 0.5%
        }
        
        const valorNivel = (matrizCaptador.taxa_sb_fundo_recorrencia || 0) * (percentualNivel / 100);
        
        beneficiarios.push({
          nivel: nivelDistribuicao,
          broker_id: pai.broker_id,
          valor: valorNivel
        });
        
        // Atualizar beneficiário no crédito
        await supabase
          .from('creditos_rede_matriz')
          .update({
            [`beneficiario_nivel${nivelDistribuicao}_id`]: pai.broker_id
          })
          .eq('id', creditoId);
      }
    }
    
    // Subir para o próximo nível
    if (nivelAtual.pai_id) {
      const { data: proximoNivel } = await supabase
        .from('matriz_indicacao_5x5')
        .select('*')
        .eq('id', nivelAtual.pai_id)
        .single();
      
      nivelAtual = proximoNivel;
    } else {
      nivelAtual = null;
    }
    
    nivelDistribuicao++;
  }
  
  return beneficiarios;
}

async function calcularPotencialRecorrenciaCompleto(dados: any): Promise<Matriz5x5Response['potencial_recorrencia']> {
  const { broker_id, mes_referencia } = dados;
  
  // Buscar dados do broker
  const { data: broker } = await supabase
    .from('brokers')
    .select('*')
    .eq('id', broker_id)
    .single();
  
  if (!broker) {
    throw new Error('Broker não encontrado');
  }
  
  // Buscar potencial de recorrência
  const mesReferencia = mes_referencia || new Date().toISOString().slice(0, 7);
  
  const { data: potencial } = await supabase
    .from('potencial_recorrencia_mensal')
    .select('*')
    .eq('broker_id', broker_id)
    .eq('mes_referencia', mesReferencia + '-01')
    .single();
  
  if (!potencial) {
    // Calcular potencial se não existir
    await supabase.rpc('calcular_potencial_recorrencia_mensal', {
      p_broker_id: broker_id,
      p_mes_referencia: mesReferencia + '-01'
    });
    
    // Buscar novamente
    const { data: potencialCalculado } = await supabase
      .from('potencial_recorrencia_mensal')
      .select('*')
      .eq('broker_id', broker_id)
      .eq('mes_referencia', mesReferencia + '-01')
      .single();
    
    if (potencialCalculado) {
      return formatarPotencial(potencialCalculado);
    }
  }
  
  return formatarPotencial(potencial);
}

function formatarPotencial(potencial: any): Matriz5x5Response['potencial_recorrencia'] {
  return {
    potencial_total: potencial.potencial_total_recorrencia,
    potencial_por_nivel: [
      { nivel: 1, valor: potencial.potencial_nivel1, percentual: '5.0%' },
      { nivel: 2, valor: potencial.potencial_nivel2, percentual: '2.0%' },
      { nivel: 3, valor: potencial.potencial_nivel3, percentual: '1.5%' },
      { nivel: 4, valor: potencial.potencial_nivel4, percentual: '1.0%' },
      { nivel: 5, valor: potencial.potencial_nivel5, percentual: '0.5%' }
    ],
    projecao_mensal: potencial.potencial_total_recorrencia
  };
}

// Endpoint para consultar estatísticas da matriz
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    
    if (tipo === 'estatisticas') {
      return await consultarEstatisticasMatriz();
    }
    
    return NextResponse.json({
      success: false,
      error: 'Tipo de consulta inválido'
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Erro ao consultar estatísticas:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar estatísticas',
      details: error.message
    }, { status: 500 });
  }
}

async function consultarEstatisticasMatriz(): Promise<NextResponse> {
  // Buscar estatísticas gerais da matriz
  const { data: estatisticas } = await supabase
    .from('matriz_indicacao_5x5')
    .select(`
      nivel_matriz,
      COUNT(*) as total_brokers,
      COUNT(CASE WHEN status_indicacao = 'ativa' THEN 1 END) as total_ativos,
      AVG(total_indicados) as media_indicados,
      AVG(total_fechamentos) as media_fechamentos,
      AVG(total_comissoes_geradas) as media_comissoes
    `)
    .order('nivel_matriz');
  
  // Buscar totais de créditos
  const { data: creditosTotais } = await supabase
    .from('creditos_rede_matriz')
    .select(`
      COUNT(*) as total_creditos,
      COUNT(CASE WHEN status_credito = 'processado' THEN 1 END) as total_processados,
      SUM(valor_credito) as valor_total_creditos
    `)
    .single();
  
  return NextResponse.json({
    success: true,
    data: {
      estatisticas_por_nivel: estatisticas || [],
      totais_creditos: creditosTotais || {
        total_creditos: 0,
        total_processados: 0,
        valor_total_creditos: 0
      }
    },
    message: 'Estatísticas consultadas com sucesso'
  });
}
