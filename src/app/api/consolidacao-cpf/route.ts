// 🏛️ SECURITY BROKER SB v14 - CONSOLIDAÇÃO DE CPF E MÉRITO (OUROBOROS 3.0)
// Trava de Mérito e CPF com Consolidação e Nexo Causal Definitivo

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

interface ConsolidacaoCPFRequest {
  cpf: string;
  acao: 'verificar_consolidacao' | 'consolidar_merito' | 'eleger_broker' | 'gerar_alerta';
  broker_id?: string;
  incorporadora_id?: string;
  dados_cliente?: {
    nome: string;
    email: string;
    telefone: string;
  };
}

interface ConsolidacaoCPFResponse {
  success: boolean;
  consolidacao?: {
    cpf: string;
    total_cadastros: number;
    status_consolidacao: string;
    brokers_envolvidos: Array<{
      broker_id: string;
      broker_nome: string;
      incorporadora_nome: string;
      pasta_progresso: number;
      status_pasta: string;
    }>;
    broker_eleito?: {
      broker_id: string;
      broker_nome: string;
      incorporadora_nome: string;
      pasta_progresso: number;
      motivo_eleicao: string;
    };
    eficiencia_conversao: number;
    alerta_nivel: string;
  };
  nexo_causal?: {
    hash: string;
    data_geracao: string;
    tipo_registro: string;
    status: string;
  };
  alertas?: Array<{
    tipo: string;
    mensagem: string;
    nivel: 'info' | 'alerta' | 'critico';
    destinatario: string;
    acao_recomendada: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: ConsolidacaoCPFRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!body.cpf || !body.acao) {
      return NextResponse.json({
        success: false,
        error: 'CPF e ação são obrigatórios'
      }, { status: 400 });
    }

    // Executar ação de consolidação
    const resultado = await executarConsolidacaoCPF(body);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Consolidação de CPF processada com sucesso'
    });

  } catch (error: any) {
    console.error('Erro na Consolidação de CPF:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno na Consolidação de CPF',
      details: error.message
    }, { status: 500 });
  }
}

async function executarConsolidacaoCPF(request: ConsolidacaoCPFRequest): Promise<ConsolidacaoCPFResponse> {
  const { cpf, acao, broker_id, incorporadora_id, dados_cliente } = request;
  
  switch (acao) {
    case 'verificar_consolidacao':
      return await verificarConsolidacaoCPF(cpf);
    case 'consolidar_merito':
      return await consolidarMeritoCPF(cpf);
    case 'eleger_broker':
      return await elegerBrokerCPF(cpf, broker_id!, dados_cliente!);
    case 'gerar_alerta':
      return await gerarAlertaConsolidacao(cpf, incorporadora_id!);
    default:
      throw new Error('Ação inválida');
  }
}

async function verificarConsolidacaoCPF(cpf: string): Promise<ConsolidacaoCPFResponse> {
  // Buscar consolidação existente
  const { data: consolidacao, error: errorConsolidacao } = await supabase
    .from('consolidacao_cpf')
    .select('*')
    .eq('cpf', cpf)
    .single();
  
  if (errorConsolidacao && errorConsolidacao.code !== 'PGRST116') {
    throw new Error(`Erro ao buscar consolidação: ${errorConsolidacao.message}`);
  }
  
  // Se não existir, criar nova consolidação
  if (!consolidacao) {
    return await criarNovaConsolidacao(cpf);
  }
  
  // Buscar detalhes dos brokers envolvidos
  const brokersDetalhados = await buscarBrokersDetalhados(consolidacao.brokers_envolvidos);
  
  // Determinar broker eleito
  let brokerEleito;
  if (consolidacao.broker_eleito_id) {
    brokerEleito = brokersDetalhados.find(b => b.broker_id === consolidacao.broker_eleito_id);
    brokerEleito.motivo_eleicao = 'Eleição definitiva via APP SB Cliente';
  } else {
    brokerEleito = determinarBrokerEleito(brokersDetalhados);
  }
  
  // Calcular nível de alerta
  const alertaNivel = calcularAlertaNivel(consolidacao.total_cadastros, consolidacao.eficiencia_conversao);
  
  return {
    success: true,
    consolidacao: {
      cpf: consolidacao.cpf,
      total_cadastros: consolidacao.total_cadastros,
      status_consolidacao: consolidacao.status_consolidacao,
      brokers_envolvidos: brokersDetalhados,
      broker_eleito: brokerEleito,
      eficiencia_conversao: consolidacao.eficiencia_conversao,
      alerta_nivel: alertaNivel
    }
  };
}

async function criarNovaConsolidacao(cpf: string): Promise<ConsolidacaoCPFResponse> {
  // Buscar todos os leads com este CPF
  const { data: leads, error: errorLeads } = await supabase
    .from('leads')
    .select(`
      *,
      brokers!inner(
        id,
        nome,
        incorporadoras!inner(
          id,
          nome_fantasia
        )
      ),
      pastas_documentos(
        progresso_percentual,
        status
      )
    `)
    .eq('cpf', cpf);
  
  if (errorLeads) {
    throw new Error(`Erro ao buscar leads: ${errorLeads.message}`);
  }
  
  if (!leads || leads.length === 0) {
    throw new Error('Nenhum cadastro encontrado para este CPF');
  }
  
  // Preparar dados para consolidação
  const brokersEnvolvidos = leads.map(lead => ({
    broker_id: lead.brokers.id,
    broker_nome: lead.brokers.nome,
    incorporadora_nome: lead.brokers.incorporadoras.nome_fantasia,
    pasta_progresso: lead.pastas_documentos[0]?.progresso_percentual || 0,
    status_pasta: lead.pastas_documentos[0]?.status || 'nao_iniciada'
  }));
  
  const incorporadorasEnvolvidas = [...new Set(leads.map(l => l.brokers.incorporadoras.id))];
  const maxProgresso = Math.max(...brokersEnvolvidos.map(b => b.pasta_progresso));
  
  // Criar registro de consolidação
  const { data: novaConsolidacao, error: errorNovaConsolidacao } = await supabase
    .from('consolidacao_cpf')
    .insert({
      cpf,
      total_cadastros: leads.length,
      brokers_envolvidos: brokersEnvolvidos.map(b => b.broker_id),
      incorporadoras_envolvidas: incorporadorasEnvolvidas,
      status_consolidacao: leads.length >= 3 ? 'em_analise' : 'pendente',
      pasta_progresso_maxima: maxProgresso,
      eficiencia_conversao: calcularEficienciaConversao(brokersEnvolvidos)
    })
    .select('*')
    .single();
  
  if (errorNovaConsolidacao) {
    throw new Error(`Erro ao criar consolidação: ${errorNovaConsolidacao.message}`);
  }
  
  // Gerar Nexo Causal
  const nexoCausal = await gerarNexoCausalConsolidacao(cpf, 'criacao_consolidacao', novaConsolidacao.id);
  
  // Determinar broker eleito
  const brokerEleito = determinarBrokerEleito(brokersEnvolvidos);
  
  // Calcular nível de alerta
  const alertaNivel = calcularAlertaNivel(leads.length, novaConsolidacao.eficiencia_conversao);
  
  return {
    success: true,
    consolidacao: {
      cpf: novaConsolidacao.cpf,
      total_cadastros: novaConsolidacao.total_cadastros,
      status_consolidacao: novaConsolidacao.status_consolidacao,
      brokers_envolvidos: brokersEnvolvidos,
      broker_eleito: brokerEleito,
      eficiencia_conversao: novaConsolidacao.eficiencia_conversao,
      alerta_nivel: alertaNivel
    },
    nexo_causal: nexoCausal
  };
}

async function consolidarMeritoCPF(cpf: string): Promise<ConsolidacaoCPFResponse> {
  // Buscar consolidação
  const { data: consolidacao, error } = await supabase
    .from('consolidacao_cpf')
    .select('*')
    .eq('cpf', cpf)
    .single();
  
  if (error || !consolidacao) {
    throw new Error('Consolidação não encontrada');
  }
  
  // Verificar se há pasta 100%
  const brokersDetalhados = await buscarBrokersDetalhados(consolidacao.brokers_envolvidos);
  const pasta100 = brokersDetalhados.find(b => b.pasta_progresso === 100);
  
  if (!pasta100) {
    throw new Error('Nenhuma pasta 100% encontrada para consolidação');
  }
  
  // Consolidar mérito
  const { data: consolidacaoAtualizada, error: errorAtualizacao } = await supabase
    .from('consolidacao_cpf')
    .update({
      broker_eleito_id: pasta100.broker_id,
      status_consolidacao: 'consolidado',
      data_consolidacao: new Date().toISOString(),
      eficiencia_conversao: 100 // Pasta 100% = 100% eficiência
    })
    .eq('cpf', cpf)
    .select('*')
    .single();
  
  if (errorAtualizacao) {
    throw new Error(`Erro ao consolidar mérito: ${errorAtualizacao.message}`);
  }
  
  // Gerar Nexo Causal
  const nexoCausal = await gerarNexoCausalConsolidacao(cpf, 'consolidacao_merito', consolidacaoAtualizada.id);
  
  // Atualizar preferência em todos os leads
  await atualizarPreferenciaLeads(cpf, pasta100.broker_id);
  
  // Gerar alertas
  const alertas = await gerarAlertasConsolidacaoMerito(cpf, pasta100, brokersDetalhados);
  
  return {
    success: true,
    consolidacao: {
      cpf: consolidacaoAtualizada.cpf,
      total_cadastros: consolidacaoAtualizada.total_cadastros,
      status_consolidacao: consolidacaoAtualizada.status_consolidacao,
      brokers_envolvidos: brokersDetalhados,
      broker_eleito: {
        ...pasta100,
        motivo_eleicao: 'Pasta 100% consolidada - Mérito definitivo'
      },
      eficiencia_conversao: consolidacaoAtualizada.eficiencia_conversao,
      alerta_nivel: 'consolidado'
    },
    nexo_causal: nexoCausal,
    alertas
  };
}

async function elegerBrokerCPF(cpf: string, brokerId: string, dadosCliente: any): Promise<ConsolidacaoCPFResponse> {
  // Verificar se broker está envolvido na consolidação
  const { data: consolidacao, error } = await supabase
    .from('consolidacao_cpf')
    .select('*')
    .eq('cpf', cpf)
    .single();
  
  if (error || !consolidacao) {
    throw new Error('Consolidação não encontrada');
  }
  
  if (!consolidacao.brokers_envolvidos.includes(brokerId)) {
    throw new Error('Broker não está envolvido na consolidação deste CPF');
  }
  
  // Eleger broker
  const { data: consolidacaoAtualizada, error: errorAtualizacao } = await supabase
    .from('consolidacao_cpf')
    .update({
      broker_eleito_id: brokerId,
      status_consolidacao: 'consolidado',
      data_consolidacao: new Date().toISOString(),
      eficiencia_conversao: calcularEficienciaConversao([{ broker_id: brokerId, pasta_progresso: 100 }])
    })
    .eq('cpf', cpf)
    .select('*')
    .single();
  
  if (errorAtualizacao) {
    throw new Error(`Erro ao eleger broker: ${errorAtualizacao.message}`);
  }
  
  // Gerar Nexo Causal definitivo
  const nexoCausal = await gerarNexoCausalConsolidacao(cpf, 'eleicao_cliente', consolidacaoAtualizada.id);
  
  // Atualizar dados do cliente
  if (dadosCliente) {
    await supabase
      .from('leads')
      .update({
        nome: dadosCliente.nome,
        email: dadosCliente.email,
        telefone: dadosCliente.telefone,
        preferencia_definida: true,
        broker_eleito_id: brokerId
      })
      .eq('cpf', cpf);
  }
  
  // Bloquear outros brokers
  await bloquearOutrosBrokers(cpf, brokerId);
  
  return {
    success: true,
    consolidacao: {
      cpf: consolidacaoAtualizada.cpf,
      total_cadastros: consolidacaoAtualizada.total_cadastros,
      status_consolidacao: consolidacaoAtualizada.status_consolidacao,
      brokers_envolvidos: await buscarBrokersDetalhados(consolidacao.brokers_envolvidos),
      broker_eleito: {
        broker_id: brokerId,
        broker_nome: await getBrokerNome(brokerId),
        incorporadora_nome: await getIncorporadoraNome(brokerId),
        pasta_progresso: 100,
        motivo_eleicao: 'Eleição definitiva via APP SB Cliente'
      },
      eficiencia_conversao: consolidacaoAtualizada.eficiencia_conversao,
      alerta_nivel: 'consolidado'
    },
    nexo_causal: nexoCausal
  };
}

async function gerarAlertaConsolidacao(cpf: string, incorporadoraId: string): Promise<ConsolidacaoCPFResponse> {
  // Buscar consolidação
  const { data: consolidacao, error } = await supabase
    .from('consolidacao_cpf')
    .select('*')
    .eq('cpf', cpf)
    .single();
  
  if (error || !consolidacao) {
    throw new Error('Consolidação não encontrada');
  }
  
  // Gerar alertas baseadas na situação
  const alertas: ConsolidacaoCPFResponse['alertas'] = [];
  
  if (consolidacao.total_cadastros >= 3) {
    alertas.push({
      tipo: 'alta_competicao',
      mensagem: `CPF ${cpf} cadastrado ${consolidacao.total_cadastros} vezes. Eficiência de conversão pendente.`,
      nivel: 'critico',
      destinatario: 'incorporadora',
      acao_recomendada: 'Monitorar progresso das pastas e priorizar broker com melhor performance'
    });
  }
  
  if (consolidacao.eficiencia_conversao < 30) {
    alertas.push({
      tipo: 'baixa_eficiencia',
      mensagem: `Eficiência de conversão baixa (${consolidacao.eficiencia_conversao}%). Revisar estratégia de qualificação.`,
      nivel: 'alerta',
      destinatario: 'incorporadora',
      acao_recomendada: 'Avaliar qualidade dos leads e reforçar treinamento dos brokers'
    });
  }
  
  if (consolidacao.status_consolidacao === 'pendente' && consolidacao.total_cadastros >= 2) {
    alertas.push({
      tipo: 'consolidacao_pendente',
      mensagem: 'Consolidação pendente. Aguardando definição de preferência ou pasta 100%.',
      nivel: 'info',
      destinatario: 'incorporadora',
      acao_recomendada: 'Entrar em contato com o cliente para definição de preferência'
    });
  }
  
  // Enviar notificações
  for (const alerta of alertas) {
    await supabase
      .from('notificacoes')
      .insert({
        incorporadora_id: incorporadoraId,
        tipo: alerta.tipo,
        titulo: 'Alerta de Consolidação CPF',
        mensagem: alerta.mensagem,
        status: 'nao_lida'
      });
  }
  
  return {
    success: true,
    alertas
  };
}

// Funções auxiliares
async function buscarBrokersDetalhados(brokerIds: string[]): Promise<any[]> {
  // TODO: Fix types - Query complexa com joins e aliases precisa de tipagem específica
  const { data, error } = await supabase
    .from('brokers')
    .select(`
      id as broker_id,
      nome as broker_nome,
      incorporadoras!inner(
        id,
        nome_fantasia as incorporadora_nome
      ),
      pastas_documentos!inner(
        progresso_percentual as pasta_progresso,
        status as status_pasta
      )
    ` as any)
    .in('id', brokerIds);
  
  if (error) {
    throw new Error(`Erro ao buscar brokers detalhados: ${error.message}`);
  }
  
  return data || [];
}

function determinarBrokerEleito(brokers: any[]): any {
  // Regra: Pasta 100% > Maior progresso > Performance
  
  const pasta100 = brokers.find(b => b.pasta_progresso === 100);
  if (pasta100) {
    return {
      ...pasta100,
      motivo_eleicao: 'Pasta 100% - Prioridade absoluta'
    };
  }
  
  const maiorProgresso = brokers.reduce((maior, atual) => 
    atual.pasta_progresso > maior.pasta_progresso ? atual : maior
  );
  
  return {
    ...maiorProgresso,
    motivo_eleicao: `Maior progresso de pasta (${maiorProgresso.pasta_progresso}%)`
  };
}

function calcularEficienciaConversao(brokers: any[]): number {
  if (brokers.length === 0) return 0;
  
  const totalProgresso = brokers.reduce((sum, b) => sum + b.pasta_progresso, 0);
  const progressoMedio = totalProgresso / brokers.length;
  
  return Math.round(progressoMedio * 100) / 100;
}

function calcularAlertaNivel(totalCadastros: number, eficiencia: number): string {
  if (totalCadastros >= 3 && eficiencia < 30) {
    return 'critico';
  } else if (totalCadastros >= 2 || eficiencia < 50) {
    return 'alerta';
  } else {
    return 'info';
  }
}

async function gerarNexoCausalConsolidacao(cpf: string, acao: string, registroId: string): Promise<any> {
  const dados = {
    cpf,
    acao,
    registro_id: registroId,
    timestamp: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('nexo_causal')
    .insert({
      lead_id: registroId, // Usar como referência
      broker_id: '00000000-0000-0000-0000-000000000000',
      acao: `consolidacao_${acao}`,
      ip_address: '127.0.0.1',
      user_agent: 'SB Consolidação CPF',
      dados_acao: dados
    })
    .select('hash_sha256')
    .single();
  
  if (error) {
    throw new Error(`Erro ao gerar Nexo Causal: ${error.message}`);
  }
  
  return {
    hash: data.hash_sha256,
    data_geracao: new Date().toISOString(),
    tipo_registro: 'consolidacao_cpf',
    status: 'ativo'
  };
}

async function atualizarPreferenciaLeads(cpf: string, brokerEleitoId: string): Promise<void> {
  await supabase
    .from('leads')
    .update({
      preferencia_definida: true,
      broker_eleito_id: brokerEleitoId
    })
    .eq('cpf', cpf);
}

async function bloquearOutrosBrokers(cpf: string, brokerEleitoId: string): Promise<void> {
  // Buscar todos os leads com este CPF
  const { data: leads } = await supabase
    .from('leads')
    .select('id, broker_id')
    .eq('cpf', cpf);
  
  // Bloquear acesso para outros brokers
  for (const lead of leads || []) {
    if (lead.broker_id !== brokerEleitoId) {
      await supabase
        .from('notificacoes')
        .insert({
          broker_id: lead.broker_id,
          lead_id: lead.id,
          tipo: 'duplicidade',
          titulo: 'Atendimento Bloqueado',
          mensagem: 'Cliente escolheu atendimento exclusivo com outro broker. Seu acesso foi bloqueado.',
          status: 'nao_lida'
        });
    }
  }
}

async function gerarAlertasConsolidacaoMerito(cpf: string, brokerEleito: any, outrosBrokers: any[]): Promise<any[]> {
  const alertas: any[] = [];
  
  // Notificar broker eleito
  alertas.push({
    tipo: 'consolidacao_sucesso',
    mensagem: `Consolidação de mérito concluída. Você foi eleito como atendimento exclusivo.`,
    nivel: 'info',
    destinatario: 'broker',
    acao_recomendada: 'Iniciar processo de venda'
  });
  
  // Notificar outros brokers
  for (const broker of outrosBrokers) {
    if (broker.broker_id !== brokerEleito.broker_id) {
      alertas.push({
        tipo: 'consolidacao_perda',
        mensagem: `Consolidação concluída em favor de ${brokerEleito.broker_nome}. Seu acesso foi bloqueado.`,
        nivel: 'alerta',
        destinatario: 'broker',
        acao_recomendada: 'Focar em outros leads'
      });
    }
  }
  
  return alertas;
}

async function getBrokerNome(brokerId: string): Promise<string> {
  const { data } = await supabase
    .from('brokers')
    .select('nome')
    .eq('id', brokerId)
    .single();
  
  return data?.nome || '';
}

async function getIncorporadoraNome(brokerId: string): Promise<string> {
  const { data } = await supabase
    .from('brokers')
    .select(`
      incorporadoras!inner(
        nome_fantasia
      )
    `)
    .eq('id', brokerId)
    .single();
  
  return data?.incorporadoras?.[0]?.nome_fantasia || '';
}

// Endpoint para consultar status de consolidação
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cpf = searchParams.get('cpf');
    
    if (!cpf) {
      return NextResponse.json({
        success: false,
        error: 'CPF é obrigatório'
      }, { status: 400 });
    }
    
    const resultado = await verificarConsolidacaoCPF(cpf);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Status de consolidação consultado com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar consolidação:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar consolidação',
      details: error.message
    }, { status: 500 });
  }
}
