// 🏛️ SECURITY BROKER SB v13 - OUROBOROS 2.0
// Regras de Meritocracia e CPF com Eleição via APP SB

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

interface OuroborosRequest {
  cpf: string;
  acao: 'verificar_duplicidade' | 'eleger_atendimento' | 'confirmar_preferencia';
  broker_id?: string;
  lead_id?: string;
  dados_cliente?: {
    nome: string;
    email: string;
    telefone: string;
  };
}

interface OuroborosResponse {
  success: boolean;
  duplicidades?: Array<{
    broker_id: string;
    broker_nome: string;
    incorporadora_id: string;
    incorporadora_nome: string;
    progresso_pasta: number;
    status_pasta: string;
    data_cadastro: string;
    score_performance: number;
  }>;
  eleicao?: {
    broker_eleito_id: string;
    broker_eleito_nome: string;
    incorporadora_eleita_id: string;
    incorporadora_eleita_nome: string;
    motivo_eleicao: string;
    data_eleicao: string;
    nexo_causal_hash: string;
  };
  alertas?: Array<{
    tipo: string;
    mensagem: string;
    nivel: 'info' | 'alerta' | 'critico';
    destinatario: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: OuroborosRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!body.cpf || !body.acao) {
      return NextResponse.json({
        success: false,
        error: 'CPF e ação são obrigatórios'
      }, { status: 400 });
    }

    // Executar ação do OUROBOROS 2.0
    const resultado = await executarOuroboros20(body);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'OUROBOROS 2.0 executado com sucesso'
    });

  } catch (error: any) {
    console.error('Erro no OUROBOROS 2.0:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no OUROBOROS 2.0',
      details: error.message
    }, { status: 500 });
  }
}

async function executarOuroboros20(request: OuroborosRequest): Promise<OuroborosResponse> {
  const { cpf, acao, broker_id, lead_id, dados_cliente } = request;
  
  switch (acao) {
    case 'verificar_duplicidade':
      return await verificarDuplicidadeCPF(cpf);
    case 'eleger_atendimento':
      return await elegerAtendimento(cpf, broker_id!, lead_id!);
    case 'confirmar_preferencia':
      return await confirmarPreferenciaCliente(cpf, lead_id!, dados_cliente!);
    default:
      throw new Error('Ação inválida');
  }
}

async function verificarDuplicidadeCPF(cpf: string): Promise<OuroborosResponse> {
  // Buscar todos os cadastros com este CPF
  const { data: leads, error } = await supabase
    .from('leads')
    .select(`
      *,
      pastas_documentos(
        progresso_percentual,
        status,
        data_inicio
      ),
      brokers!inner(
        id,
        nome,
        performance_score,
        incorporadoras!inner(
          id,
          nome_fantasia
        )
      )
    `)
    .eq('cpf', cpf)
    .eq('duplicidade_detectada', true);
  
  if (error) {
    throw new Error(`Erro ao buscar duplicidades: ${error.message}`);
  }
  
  const duplicidades = leads?.map(lead => ({
    broker_id: lead.brokers.id,
    broker_nome: lead.brokers.nome,
    incorporadora_id: lead.brokers.incorporadoras.id,
    incorporadora_nome: lead.brokers.incorporadoras.nome_fantasia,
    progresso_pasta: lead.pastas_documentos[0]?.progresso_percentual || 0,
    status_pasta: lead.pastas_documentos[0]?.status || 'nao_iniciada',
    data_cadastro: lead.data_primeiro_contato,
    score_performance: lead.brokers.performance_score || 0
  })) || [];
  
  // Gerar alertas
  const alertas = gerarAlertasDuplicidade(duplicidades);
  
  return {
    success: true,
    duplicidades,
    alertas
  };
}

async function elegerAtendimento(cpf: string, brokerId: string, leadId: string): Promise<OuroborosResponse> {
  // Verificar duplicidades primeiro
  const duplicidadesResponse = await verificarDuplicidadeCPF(cpf);
  const duplicidades = duplicidadesResponse.duplicidades || [];
  
  if (duplicidades.length === 0) {
    throw new Error('Nenhuma duplicidade encontrada para este CPF');
  }
  
  // Encontrar o broker com maior performance e progresso
  const brokerEleito = duplicidades.reduce((melhor, atual) => {
    // Critério 1: Pasta 100% (prioridade absoluta)
    if (atual.progresso_pasta === 100 && melhor.progresso_pasta !== 100) {
      return atual;
    }
    
    // Critério 2: Maior progresso
    if (atual.progresso_pasta > melhor.progresso_pasta) {
      return atual;
    }
    
    // Critério 3: Maior performance score
    if (atual.progresso_pasta === melhor.progresso_pasta && 
        atual.score_performance > melhor.score_performance) {
      return atual;
    }
    
    return melhor;
  });
  
  // Gerar Nexo Causal para a eleição
  const nexoCausalHash = await gerarNexoCausalEleicao(cpf, brokerEleito.broker_id, leadId);
  
  // Atualizar preferência no lead
  const { error: errorUpdate } = await supabase
    .from('leads')
    .update({
      preferencia_definida: true,
      broker_eleito_id: brokerEleito.broker_id,
      updated_at: new Date().toISOString()
    })
    .eq('cpf', cpf);
  
  if (errorUpdate) {
    throw new Error(`Erro ao atualizar preferência: ${errorUpdate.message}`);
  }
  
  // Bloquear visualização para os demais brokers
  await bloquearVisualizacaoOutrosBrokers(duplicidades, brokerEleito.broker_id, leadId);
  
  // Gerar motivo da eleição
  const motivoEleicao = gerarMotivoEleicao(brokerEleito, duplicidades);
  
  return {
    success: true,
    eleicao: {
      broker_eleito_id: brokerEleito.broker_id,
      broker_eleito_nome: brokerEleito.broker_nome,
      incorporadora_eleita_id: brokerEleito.incorporadora_id,
      incorporadora_eleita_nome: brokerEleito.incorporadora_nome,
      motivo_eleicao: motivoEleicao,
      data_eleicao: new Date().toISOString(),
      nexo_causal_hash: nexoCausalHash
    }
  };
}

async function confirmarPreferenciaCliente(
  cpf: string, 
  leadId: string, 
  dadosCliente: OuroborosRequest['dados_cliente']
): Promise<OuroborosResponse> {
  // Guard para dadosCliente
  if (!dadosCliente) {
    console.error("Falha na Condução de Decisão Patrimonial: Cliente não encontrado");
    return {
      success: false,
      duplicidades: [],
      alertas: [{
        tipo: 'erro_cliente',
        mensagem: 'Dados do cliente não fornecidos',
        nivel: 'critico',
        destinatario: 'system'
      }]
    };
  }
  
  // Verificar se o cliente já tem preferência definida
  const { data: lead, error: errorLead } = await supabase
    .from('leads')
    .select('*')
    .eq('cpf', cpf)
    .single();
  
  if (errorLead || !lead) {
    throw new Error('Lead não encontrado');
  }
  
  if (!lead.duplicidade_detectada) {
    throw new Error('Não há duplicidade para confirmar preferência');
  }
  
  // Buscar as opções de atendimento
  const duplicidadesResponse = await verificarDuplicidadeCPF(cpf);
  const duplicidades = duplicidadesResponse.duplicidades || [];
  
  // Guard para duplicidades vazias
  if (duplicidades.length === 0) {
    console.error("Falha na Condução de Decisão Patrimonial: Nenhuma duplicidade encontrada");
    return {
      success: false,
      duplicidades: [],
      alertas: [{
        tipo: 'sem_duplicidade',
        mensagem: 'Nenhuma duplicidade encontrada para este CPF',
        nivel: 'alerta',
        destinatario: 'system'
      }]
    };
  }
  
  // Encontrar a melhor opção (mesma lógica da eleição)
  const melhorOpcao = duplicidades.reduce((melhor, atual) => {
    if (atual?.progresso_pasta === 100 && melhor?.progresso_pasta !== 100) {
      return atual;
    }
    if (atual?.progresso_pasta > melhor?.progresso_pasta) {
      return atual;
    }
    if (atual?.progresso_pasta === melhor?.progresso_pasta && 
        atual?.score_performance > melhor?.score_performance) {
      return atual;
    }
    return melhor;
  });
  
  // Guard para melhorOpcao
  if (!melhorOpcao) {
    console.error("Falha na Condução de Decisão Patrimonial: Melhor opção não encontrada");
    return {
      success: false,
      duplicidades,
      alertas: [{
        tipo: 'erro_opcao',
        mensagem: 'Não foi possível determinar a melhor opção de atendimento',
        nivel: 'critico',
        destinatario: 'system'
      }]
    };
  }
  
  // Confirmar preferência do cliente
  const { error: errorConfirmacao } = await supabase
    .from('leads')
    .update({
      preferencia_definida: true,
      broker_eleito_id: melhorOpcao?.broker_id,
      nome: dadosCliente?.nome ?? "",
      email: dadosCliente?.email ?? "",
      telefone: dadosCliente?.telefone ?? "",
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId);
  
  if (errorConfirmacao) {
    throw new Error(`Erro ao confirmar preferência: ${errorConfirmacao.message}`);
  }
  
  // Gerar Nexo Causal definitivo
  const nexoCausalHash = await gerarNexoCausalDefinitivo(
    cpf, 
    melhorOpcao?.broker_id ?? "", 
    leadId, 
    dadosCliente
  );
  
  // Bloquear acesso para os demais
  await bloquearAcessoDefinitivo(duplicidades, melhorOpcao?.broker_id ?? "", leadId);
  
  // Enviar notificações
  await enviarNotificacoesConfirmacao(melhorOpcao, duplicidades, leadId);
  
  return {
    success: true,
    eleicao: {
      broker_eleito_id: melhorOpcao?.broker_id ?? "",
      broker_eleito_nome: melhorOpcao?.broker_nome ?? "",
      incorporadora_eleita_id: melhorOpcao?.incorporadora_id ?? "",
      incorporadora_eleita_nome: melhorOpcao?.incorporadora_nome ?? "",
      motivo_eleicao: 'Preferência confirmada pelo cliente - pasta mais completa',
      data_eleicao: new Date().toISOString(),
      nexo_causal_hash: nexoCausalHash
    }
  };
}

async function gerarNexoCausalEleicao(cpf: string, brokerId: string, leadId: string): Promise<string> {
  const dados = {
    cpf,
    broker_id: brokerId,
    lead_id: leadId,
    acao: 'eleicao_atendimento',
    timestamp: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('nexo_causal')
    .insert({
      lead_id: leadId,
      broker_id: brokerId,
      acao: 'eleicao_atendimento',
      ip_address: '127.0.0.1',
      user_agent: 'OUROBOROS 2.0 System',
      dados_acao: dados
    })
    .select('hash_sha256')
    .single();
  
  if (error) {
    throw new Error(`Erro ao gerar Nexo Causal: ${error.message}`);
  }
  
  return data.hash_sha256;
}

async function gerarNexoCausalDefinitivo(
  cpf: string,
  brokerId: string,
  leadId: string,
  dadosCliente: any
): Promise<string> {
  const dados = {
    cpf,
    broker_id: brokerId,
    lead_id: leadId,
    acao: 'preferencia_definitiva',
    dados_cliente: dadosCliente,
    timestamp: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('nexo_causal')
    .insert({
      lead_id: leadId,
      broker_id: brokerId,
      acao: 'preferencia_definitiva',
      ip_address: '127.0.0.1',
      user_agent: 'APP SB Cliente',
      dados_acao: dados
    })
    .select('hash_sha256')
    .single();
  
  if (error) {
    throw new Error(`Erro ao gerar Nexo Causal definitivo: ${error.message}`);
  }
  
  return data.hash_sha256;
}

async function bloquearVisualizacaoOutrosBrokers(
  duplicidades: OuroborosResponse['duplicidades'],
  brokerEleitoId: string,
  leadId: string
): Promise<void> {
  if (!duplicidades) return;
  
  for (const duplicidade of duplicidades) {
    if (duplicidade.broker_id !== brokerEleitoId) {
      // Criar notificação de bloqueio
      await supabase
        .from('notificacoes')
        .insert({
          broker_id: duplicidade.broker_id,
          lead_id: leadId,
          tipo: 'duplicidade',
          titulo: 'Atendimento Exclusivo Eleito',
          mensagem: `Cliente escolheu atendimento exclusivo com outro broker. Seu acesso a este lead foi bloqueado.`,
          status: 'nao_lida'
        });
    }
  }
}

async function bloquearAcessoDefinitivo(
  duplicidades: OuroborosResponse['duplicidades'],
  brokerEleitoId: string,
  leadId: string
): Promise<void> {
  if (!duplicidades) return;
  
  for (const duplicidade of duplicidades) {
    if (duplicidade.broker_id !== brokerEleitoId) {
      // Notificar sobre bloqueio definitivo
      await supabase
        .from('notificacoes')
        .insert({
          broker_id: duplicidade.broker_id,
          lead_id: leadId,
          tipo: 'duplicidade',
          titulo: 'Acesso Bloqueado Definitivamente',
          mensagem: `Cliente confirmou preferência por outro atendimento. Seu acesso foi bloqueado permanentemente (LGPD 2 anos).`,
          status: 'nao_lida'
        });
      
      // Marcar lead como bloqueado para este broker
      await supabase
        .from('leads')
        .update({
          data_bloqueio_lgpd: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) // 2 anos
        })
        .eq('id', leadId);
    }
  }
}

function gerarMotivoEleicao(brokerEleito: any, duplicidades: any[]): string {
  if (brokerEleito?.progresso_pasta === 100) {
    return `Pasta 100% completa - prioridade absoluta`;
  }
  
  const maiorProgresso = Math.max(...duplicidades.map(d => d?.progresso_pasta ?? 0));
  if (brokerEleito?.progresso_pasta === maiorProgresso) {
    return `Maior progresso de pasta (${brokerEleito?.progresso_pasta}%)`;
  }
  
  return `Maior performance score (${brokerEleito?.score_performance})`;
}

function gerarAlertasDuplicidade(duplicidades: OuroborosResponse['duplicidades']): OuroborosResponse['alertas'] {
  const alertas: OuroborosResponse['alertas'] = [];
  
  if (!duplicidades || duplicidades.length === 0) {
    return alertas;
  }
  
  // Alerta de pasta 100%
  const pasta100 = duplicidades.find(d => d?.progresso_pasta === 100);
  if (pasta100) {
    alertas.push({
      tipo: 'pasta_100',
      mensagem: `Broker ${pasta100?.broker_nome} atingiu 100% da pasta - prioridade absoluta`,
      nivel: 'critico',
      destinatario: 'incorporadora'
    });
  }
  
  // Alerta de alta competição
  if (duplicidades.length > 3) {
    alertas.push({
      tipo: 'alta_competicao',
      mensagem: `${duplicidades.length} brokers competindo pelo mesmo cliente`,
      nivel: 'alerta',
      destinatario: 'incorporadora'
    });
  }
  
  // Alerta de performance
  const topPerformance = duplicidades.filter(d => d?.score_performance >= 80);
  if (topPerformance.length > 1) {
    alertas.push({
      tipo: 'alta_performance',
      mensagem: `${topPerformance.length} brokers com alta performance disputando o cliente`,
      nivel: 'info',
      destinatario: 'incorporadora'
    });
  }
  
  return alertas;
}

async function enviarNotificacoesConfirmacao(
  brokerEleito: any,
  duplicidades: any[],
  leadId: string
): Promise<void> {
  // Notificar broker eleito
  await supabase
    .from('notificacoes')
    .insert({
      broker_id: brokerEleito.broker_id,
      lead_id: leadId,
      tipo: 'preferencia',
      titulo: 'Preferência Confirmada pelo Cliente',
      mensagem: 'Cliente confirmou seu atendimento exclusivo. Você agora tem prioridade absoluta neste lead.',
      status: 'nao_lida'
    });
  
  // Notificar incorporadora
  await supabase
    .from('notificacoes')
    .insert({
      incorporadora_id: brokerEleito.incorporadora_id,
      lead_id: leadId,
      tipo: 'preferencia',
      titulo: 'Preferência de Cliente Definida',
      mensagem: `Cliente confirmou atendimento com ${brokerEleito.broker_nome}. Outros brokers foram bloqueados.`,
      status: 'nao_lida'
    });
  
  // Push notification para o cliente (simulação)
  await supabase
    .from('notificacoes')
    .insert({
      lead_id: leadId,
      tipo: 'preferencia',
      titulo: 'Atendimento Exclusivo Confirmado',
      mensagem: `Você escolheu ${brokerEleito.broker_nome} como seu atendimento exclusivo. Sua jornada será priorizada.`,
      status: 'nao_lida',
      push_enviado: true
    });
}

// Endpoint para consultar status OUROBOROS
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cpf = searchParams.get('cpf');
    const lead_id = searchParams.get('lead_id');
    
    if (!cpf && !lead_id) {
      return NextResponse.json({
        success: false,
        error: 'CPF ou lead_id é obrigatório'
      }, { status: 400 });
    }
    
    let query = supabase
      .from('leads')
      .select(`
        *,
        brokers!inner(
          id,
          nome,
          performance_score,
          incorporadoras!inner(
            id,
            nome_fantasia
          )
        ),
        pastas_documentos(
          progresso_percentual,
          status
        )
      `);
    
    if (cpf) {
      query = query.eq('cpf', cpf);
    } else if (lead_id) {
      query = query.eq('id', lead_id);
    }
    
    const { data, error } = await query.single();
    
    if (error || !data) {
      return NextResponse.json({
        success: false,
        error: 'Lead não encontrado'
      }, { status: 404 });
    }
    
    // Buscar duplicidades se houver
    let duplicidades;
    if (data.duplicidade_detectada) {
      const duplicidadesResponse = await verificarDuplicidadeCPF(data.cpf);
      duplicidades = duplicidadesResponse.duplicidades;
    }
    
    return NextResponse.json({
      success: true,
      data: {
        lead: data,
        duplicidades,
        preferencia_definida: data.preferencia_definida,
        broker_eleito_id: data.broker_eleito_id
      },
      message: 'Status OUROBOROS consultado com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar status OUROBOROS:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar status',
      details: error.message
    }, { status: 500 });
  }
}
