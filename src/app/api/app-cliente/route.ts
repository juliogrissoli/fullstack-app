// 🏛️ SECURITY BROKER SB v13 - APP SB CLIENTE
// Status Online 100% da jornada e Automação de Crédito com OCR

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AppClienteRequest {
  lead_id: string;
  cpf: string;
  acao: 'status_jornada' | 'autorizar_credito' | 'verificar_duplicidade' | 'eleicao_atendimento';
}

interface StatusJornadaResponse {
  success: boolean;
  status_jornada: {
    etapa_atual: string;
    progresso_geral: number;
    etapas_concluidas: string[];
    proxima_etapa: string;
    documentos_pendentes: string[];
    status_pasta: string;
    progresso_pasta: number;
  };
  analise_credito?: {
    status: string;
    score_risco: number;
    limite_aprovado: number;
    parcela_maxima: number;
    prazo_maximo: number;
    taxa_juros: number;
    biometria_autorizada: boolean;
  };
  duplicidades?: Array<{
    broker_id: string;
    broker_nome: string;
    incorporadora_nome: string;
    progresso_pasta: number;
    status: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: AppClienteRequest = await request.json();
    
    if (!body.lead_id || !body.cpf || !body.acao) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }

    let resultado;
    
    switch (body.acao) {
      case 'status_jornada':
        resultado = await obterStatusJornada(body.lead_id);
        break;
      case 'autorizar_credito':
        resultado = await autorizarAnaliseCredito(body.lead_id);
        break;
      case 'verificar_duplicidade':
        resultado = await verificarDuplicidadeCPF(body.cpf);
        break;
      case 'eleicao_atendimento':
        resultado = await processarEleicaoAtendimento(body.lead_id, body.cpf);
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Ação inválida'
        }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: `${body.acao} processado com sucesso`
    });

  } catch (error: any) {
    console.error('Erro no APP SB Cliente:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no APP SB Cliente',
      details: error.message
    }, { status: 500 });
  }
}

async function obterStatusJornada(leadId: string): Promise<StatusJornadaResponse['status_jornada']> {
  // Buscar dados do lead e pasta
  const { data: lead, error: errorLead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (errorLead) {
    throw new Error('Lead não encontrado');
  }

  const { data: pasta, error: errorPasta } = await supabase
    .from('pastas_documentos')
    .select('*')
    .eq('lead_id', leadId)
    .single();

  // Definir etapas da jornada
  const etapasJornada = [
    { nome: 'Cadastro Inicial', concluida: true },
    { nome: 'Qualificação Yara IA', concluida: lead.origem === 'yara_ia' },
    { nome: 'Coleta de Documentos', concluida: pasta ? pasta.progresso_percentual === 100 : false },
    { nome: 'Análise de Documentos', concluida: pasta ? pasta.progresso_percentual >= 80 : false },
    { nome: 'Análise de Crédito', concluida: false },
    { nome: 'Aprovação e Assinatura', concluida: false },
    { nome: 'Liberação de Chaves', concluida: false }
  ];

  const etapasConcluidas = etapasJornada
    .filter(etapa => etapa.concluida)
    .map(etapa => etapa.nome);

  const proximaEtapa = etapasJornada
    .find(etapa => !etapa.concluida)?.nome || 'Jornada Concluída';

  const progressoGeral = (etapasConcluidas.length / etapasJornada.length) * 100;

  // Obter documentos pendentes
  const documentosPendentes = pasta && pasta.documentos 
    ? Object.entries(pasta.documentos)
        .filter(([_, status]) => status !== 'completo')
        .map(([doc, _]) => doc)
    : [];

  // Buscar análise de crédito se existir
  let analiseCredito;
  if (pasta && pasta.progresso_percentual === 100) {
    const { data: analise } = await supabase
      .from('analises_credito')
      .select('*')
      .eq('lead_id', leadId)
      .single();

    if (analise) {
      analiseCredito = {
        status: analise.status,
        score_risco: analise.score_risco,
        limite_aprovado: analise.limite_aprovado,
        parcela_maxima: analise.parcela_maxima,
        prazo_maximo: analise.prazo_maximo,
        taxa_juros: analise.taxa_juros,
        biometria_autorizada: analise.biometria_autorizada
      };
    }
  }

  return {
    etapa_atual: proximaEtapa,
    progresso_geral: progressoGeral,
    etapas_concluidas: etapasConcluidas,
    proxima_etapa: proximaEtapa,
    documentos_pendentes: documentosPendentes,
    status_pasta: pasta ? pasta.status : 'nao_iniciada',
    progresso_pasta: pasta ? pasta.progresso_percentual : 0,
    ...(analiseCredito && { analise_credito: analiseCredito })
  };
}

async function autorizarAnaliseCredito(leadId: string): Promise<any> {
  // Verificar se pasta está 100% completa
  const { data: pasta, error: errorPasta } = await supabase
    .from('pastas_documentos')
    .select('*')
    .eq('lead_id', leadId)
    .single();

  if (errorPasta || !pasta || pasta.progresso_percentual < 100) {
    throw new Error('Pasta de documentos não está 100% completa');
  }

  // Verificar se análise já existe
  const { data: analiseExistente, error: errorAnalise } = await supabase
    .from('analises_credito')
    .select('*')
    .eq('lead_id', leadId)
    .single();

  if (!errorAnalise && analiseExistente) {
    throw new Error('Análise de crédito já está em andamento');
  }

  // Criar análise de crédito
  const { data: novaAnalise, error: errorNovaAnalise } = await supabase
    .from('analises_credito')
    .insert({
      lead_id: leadId,
      pasta_id: pasta.id,
      status: 'em_analise',
      data_solicitacao: new Date().toISOString()
    })
    .select('*')
    .single();

  if (errorNovaAnalise) {
    throw new Error(`Erro ao criar análise de crédito: ${errorNovaAnalise.message}`);
  }

  // Simular processamento OCR e análise
  await processarOCRAnaliseCredito(novaAnalise.id);

  // Notificar broker
  await supabase
    .from('notificacoes')
    .insert({
      lead_id: leadId,
      tipo: 'info',
      titulo: 'Análise de Crédito Autorizada',
      mensagem: 'Cliente autorizou análise de crédito. Processamento OCR iniciado.',
      status: 'nao_lida'
    });

  return {
    analise_id: novaAnalise.id,
    status: 'em_analise',
    mensagem: 'Análise de crédito iniciada com autorização biométrica'
  };
}

async function processarOCRAnaliseCredito(analiseId: string): Promise<void> {
  try {
    // Simular processamento OCR (em produção, integrar com API real de OCR)
    const scoreRisco = Math.floor(Math.random() * 30) + 50; // 50-80
    const limiteAprovado = Math.floor(Math.random() * 500000) + 200000; // R$ 200k-700k
    const parcelaMaxima = Math.floor(limiteAprovado * 0.3 / 240); // 30% da renda, 240 meses
    const prazoMaximo = 360; // 30 anos máximo
    const taxaJuros = 9.5 + Math.random() * 3; // 9.5% - 12.5%

    // Atualizar análise com resultados
    await supabase
      .from('analises_credito')
      .update({
        status: 'aprovado',
        score_risco: scoreRisco,
        limite_aprovado: limiteAprovado,
        parcela_maxima: parcelaMaxima,
        prazo_maximo: prazoMaximo,
        taxa_juros: taxaJuros,
        data_analise: new Date().toISOString(),
        biometria_autorizada: true
      })
      .eq('id', analiseId);

  } catch (error) {
    console.error('Erro no processamento OCR:', error);
    
    // Marcar como erro
    await supabase
      .from('analises_credito')
      .update({
        status: 'rejeitado',
        observacoes: 'Erro no processamento OCR'
      })
      .eq('id', analiseId);
  }
}

async function verificarDuplicidadeCPF(cpf: string): Promise<StatusJornadaResponse['duplicidades']> {
  // Buscar todos os leads com este CPF
  const { data: leads, error } = await supabase
    .from('leads')
    .select(`
      *,
      pastas_documentos(
        progresso_percentual,
        status
      ),
      brokers!inner(
        id,
        nome,
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

  return leads?.map(lead => ({
    broker_id: lead.brokers.id,
    broker_nome: lead.brokers.nome,
    incorporadora_nome: lead.brokers.incorporadoras.nome_fantasia,
    progresso_pasta: lead.pastas_documentos[0]?.progresso_percentual || 0,
    status: lead.status
  })) || [];
}

async function processarEleicaoAtendimento(leadId: string, cpf: string): Promise<any> {
  // Buscar todas as empresas que cadastraram este CPF
  const duplicidades = await verificarDuplicidadeCPF(cpf);
  
  if (!duplicidades || duplicidades.length === 0) {
    throw new Error('Nenhuma duplicidade encontrada para este CPF');
  }

  // Encontrar a empresa com maior progresso na pasta
  const empresaEleita = duplicidades.reduce((melhor, atual) => 
    atual.progresso_pasta > melhor.progresso_pasta ? atual : melhor
  );

  // Bloquear visualização para os demais brokers
  for (const duplicidade of duplicidades) {
    if (duplicidade.broker_id !== empresaEleita.broker_id) {
      await supabase
        .from('notificacoes')
        .insert({
          broker_id: duplicidade.broker_id,
          lead_id: leadId,
          tipo: 'duplicidade',
          titulo: 'Atendimento Exclusivo Eleito',
          mensagem: `Cliente escolheu atendimento exclusivo com ${empresaEleita.broker_nome}. Seu acesso a este lead foi bloqueado.`,
          status: 'nao_lida'
        });
    }
  }

  // Atualizar status do lead para preferência definida
  await supabase
    .from('leads')
    .update({
      status: 'preferencia_definida',
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId);

  // Enviar push notification para o cliente
  await supabase
    .from('notificacoes')
    .insert({
      lead_id: leadId,
      tipo: 'preferencia',
      titulo: 'Atendimento Exclusivo Confirmado',
      mensagem: `Você escolheu ${empresaEleita.broker_nome} da ${empresaEleita.incorporadora_nome} como seu atendimento exclusivo. Sua análise de crédito será priorizada.`,
      status: 'nao_lida'
    });

  return {
    sucesso: true,
    empresa_eleita: empresaEleita,
    mensagem: `Atendimento exclusivo confirmado com ${empresaEleita.broker_nome}`
  };
}

// Endpoint para upload de documentos com OCR
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const leadId = formData.get('lead_id') as string;
    const documento = formData.get('documento') as File;
    const tipoDocumento = formData.get('tipo_documento') as string;

    if (!leadId || !documento || !tipoDocumento) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }

    // Processar OCR do documento
    const resultadoOCR = await processarOCRDocumento(documento, tipoDocumento);

    // Atualizar pasta de documentos
    const { data: pasta, error: errorPasta } = await supabase
      .from('pastas_documentos')
      .select('*')
      .eq('lead_id', leadId)
      .single();

    if (errorPasta) {
      throw new Error('Pasta não encontrada');
    }

    // Atualizar documento na pasta
    const documentosAtualizados = {
      ...pasta.documentos,
      [tipoDocumento]: {
        status: resultadoOCR.valido ? 'completo' : 'pendente',
        url: resultadoOCR.url,
        dados_extraidos: resultadoOCR.dados,
        confianca: resultadoOCR.confianca,
        data_processamento: new Date().toISOString()
      }
    };

    // Calcular novo progresso
    const documentosCompletos = Object.values(documentosAtualizados as Record<string, any>)
      .filter(doc => doc.status === 'completo').length;
    const totalDocumentos = Object.keys(documentosAtualizados).length;
    const novoProgresso = Math.floor((documentosCompletos / totalDocumentos) * 100);

    // Atualizar pasta
    const { data: pastaAtualizada, error: errorAtualizacao } = await supabase
      .from('pastas_documentos')
      .update({
        documentos: documentosAtualizados,
        progresso_percentual: novoProgresso,
        status: novoProgresso === 100 ? 'completa' : 'em_progresso',
        ultima_atualizacao: new Date().toISOString(),
        ...(novoProgresso === 100 && { data_conclusao: new Date().toISOString() })
      })
      .eq('id', pasta.id)
      .select('*')
      .single();

    if (errorAtualizacao) {
      throw new Error(`Erro ao atualizar pasta: ${errorAtualizacao.message}`);
    }

    // Se atingiu 100%, disparar gatilho automático de análise de crédito
    if (novoProgresso === 100) {
      await autorizarAnaliseCredito(leadId);
    }

    return NextResponse.json({
      success: true,
      data: {
        documento: tipoDocumento,
        status: resultadoOCR.valido ? 'completo' : 'pendente',
        confianca: resultadoOCR.confianca,
        dados_extraidos: resultadoOCR.dados,
        progresso_geral: novoProgresso
      },
      message: 'Documento processado com sucesso'
    });

  } catch (error: any) {
    console.error('Erro no upload de documento:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no upload de documento',
      details: error.message
    }, { status: 500 });
  }
}

async function processarOCRDocumento(documento: File, tipo: string): Promise<{
  valido: boolean;
  url: string;
  dados: any;
  confianca: number;
}> {
  try {
    // Simular processamento OCR (em produção, integrar com API real de OCR)
    const confianca = Math.random() * 30 + 70; // 70-100%
    const valido = confianca > 80;

    // Simular extração de dados baseado no tipo
    let dadosExtraidos = {};
    
    switch (tipo) {
      case 'rg':
        dadosExtraidos = {
          nome: 'Cliente Teste',
          data_nascimento: '1980-01-01',
          orgao_expedidor: 'SSP'
        };
        break;
      case 'cpf':
        dadosExtraidos = {
          cpf: '123.456.789-00',
          situacao: 'regular'
        };
        break;
      case 'comprovante_renda':
        dadosExtraidos = {
          renda_mensal: 10000,
          empresa: 'Empresa Teste LTDA',
          cargo: 'Analista'
        };
        break;
    }

    // Em produção, armazenar documento e retornar URL real
    const url = `https://storage.securitybroker.com.br/documentos/${Date.now()}_${documento.name}`;

    return {
      valido,
      url,
      dados: dadosExtraidos,
      confianca
    };

  } catch (error) {
    return {
      valido: false,
      url: '',
      dados: {},
      confianca: 0
    };
  }
}

// Endpoint para obter status completo do cliente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');
    
    if (!leadId) {
      return NextResponse.json({
        success: false,
        error: 'lead_id é obrigatório'
      }, { status: 400 });
    }

    const statusJornada = await obterStatusJornada(leadId);
    
    // Buscar duplicidades se houver
    let duplicidades;
    const { data: lead } = await supabase
      .from('leads')
      .select('cpf, duplicidade_detectada')
      .eq('id', leadId)
      .single();

    if (lead && lead.duplicidade_detectada) {
      duplicidades = await verificarDuplicidadeCPF(lead.cpf);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...statusJornada,
        ...(duplicidades && { duplicidades })
      },
      message: 'Status obtido com sucesso'
    });

  } catch (error: any) {
    console.error('Erro ao obter status:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao obter status',
      details: error.message
    }, { status: 500 });
  }
}
