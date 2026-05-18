// 🏛️ SECURITY BROKER SB v13 - JORNADA DO CLIENTE & YARA IA
// App SB Cliente 100% transparência, OCR e Gatilho de Crédito

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

interface JornadaClienteRequest {
  lead_id: string;
  cpf: string;
  acao: 'status_jornada' | 'upload_documento' | 'autorizar_credito' | 'verificar_yara';
  dados?: {
    documento?: File;
    tipo_documento?: string;
    biometria?: {
      foto_base64: string;
      ip_address: string;
    };
    dados_cliente?: {
      nome: string;
      email: string;
      telefone: string;
      renda_mensal: number;
    };
  };
}

interface JornadaClienteResponse {
  success: boolean;
  jornada?: {
    etapa_atual: string;
    progresso_geral: number;
    etapas_concluidas: string[];
    proxima_etapa: string;
    documentos_pendentes: string[];
    status_pasta: string;
    progresso_pasta: number;
  };
  yara_ia?: {
    score_qualificacao: number;
    probabilidade_conversao: number;
    perfil_comportamental: any;
    recomendacoes: any;
    status: string;
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
  documento?: {
    tipo: string;
    status: string;
    confianca: number;
    dados_extraidos: any;
    progresso_geral: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: JornadaClienteRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!body.lead_id || !body.cpf || !body.acao) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }

    // Executar ação da jornada
    const resultado = await executarJornadaCliente(body);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Jornada do cliente processada com sucesso'
    });

  } catch (error: any) {
    console.error('Erro na Jornada do Cliente:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno na Jornada do Cliente',
      details: error.message
    }, { status: 500 });
  }
}

async function executarJornadaCliente(request: JornadaClienteRequest): Promise<JornadaClienteResponse> {
  const { lead_id, cpf, acao, dados } = request;
  
  switch (acao) {
    case 'status_jornada':
      return await obterStatusJornada(lead_id);
    case 'upload_documento':
      return await processarUploadDocumento(lead_id, dados!);
    case 'autorizar_credito':
      return await autorizarAnaliseCredito(lead_id, dados!);
    case 'verificar_yara':
      return await verificarAnaliseYara(lead_id);
    default:
      throw new Error('Ação inválida');
  }
}

async function obterStatusJornada(leadId: string): Promise<JornadaClienteResponse> {
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

  // Definir etapas da jornada 100% transparente
  const etapasJornada = [
    { nome: 'Cadastro Inicial', concluida: true },
    { nome: 'Verificação Duplicidade CPF', concluida: lead.duplicidade_detectada },
    { nome: 'Análise Yara IA', concluida: lead.origem === 'yara_ia' },
    { nome: 'Coleta de Documentos', concluida: pasta ? pasta.progresso_percentual === 100 : false },
    { nome: 'Processamento OCR', concluida: pasta ? pasta.progresso_percentual >= 80 : false },
    { nome: 'Análise de Crédito', concluida: false },
    { nome: 'Autorização Biométrica', concluida: false },
    { nome: 'Aprovação Final', concluida: false },
    { nome: 'Liberação de Unidade', concluida: false }
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

  // Buscar análise Yara IA
  let yaraIA;
  if (lead.origem === 'yara_ia') {
    const { data: yara } = await supabase
      .from('yara_ia_analises')
      .select('*')
      .eq('lead_id', leadId)
      .single();
    
    if (yara) {
      yaraIA = {
        score_qualificacao: yara.score_qualificacao,
        probabilidade_conversao: yara.probabilidade_conversao,
        perfil_comportamental: yara.perfil_comportamental,
        recomendacoes: yara.recomendacoes,
        status: yara.status
      };
    }
  }

  // Buscar análise de crédito se existir
  let analiseCredito;
  if (pasta && pasta.progresso_percentual >= 80) {
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
    success: true,
    jornada: {
      etapa_atual: proximaEtapa,
      progresso_geral: progressoGeral,
      etapas_concluidas: etapasConcluidas,
      proxima_etapa: proximaEtapa,
      documentos_pendentes: documentosPendentes,
      status_pasta: pasta ? pasta.status : 'nao_iniciada',
      progresso_pasta: pasta ? pasta.progresso_percentual : 0
    },
    ...(yaraIA && { yara_ia: yaraIA }),
    ...(analiseCredito && { analise_credito: analiseCredito })
  };
}

async function processarUploadDocumento(leadId: string, dados: any): Promise<JornadaClienteResponse> {
  const { documento, tipo_documento } = dados;
  
  if (!documento || !tipo_documento) {
    throw new Error('Documento e tipo são obrigatórios');
  }

  // Processar OCR do documento
  const resultadoOCR = await processarOCRDocumento(documento, tipo_documento);

  // Buscar pasta do lead
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
    [tipo_documento]: {
      status: resultadoOCR.valido ? 'completo' : 'pendente',
      url: resultadoOCR.url,
      dados_extraidos: resultadoOCR.dados,
      confianca: resultadoOCR.confianca,
      data_processamento: new Date().toISOString()
    }
  };

  // Calcular novo progresso
  const documentosCompletos = Object.values(documentosAtualizados)
    .filter((doc: any) => doc.status === 'completo').length;
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
    await criarAnaliseCreditoAutomatica(leadId, pasta.id);
  }

  // Se atingiu 80%, notificar sobre análise de crédito
  if (novoProgresso >= 80 && !pastaAtualizada.data_conclusao) {
    await supabase
      .from('notificacoes')
      .insert({
        lead_id: leadId,
        tipo: 'info',
        titulo: 'Análise de Crédito Disponível',
        mensagem: 'Sua documentação está quase completa. Autorize a análise de crédito para continuar.',
        status: 'nao_lida'
      });
  }

  return {
    success: true,
    documento: {
      tipo: tipo_documento,
      status: resultadoOCR.valido ? 'completo' : 'pendente',
      confianca: resultadoOCR.confianca,
      dados_extraidos: resultadoOCR.dados,
      progresso_geral: novoProgresso
    }
  };
}

async function autorizarAnaliseCredito(leadId: string, dados: any): Promise<JornadaClienteResponse> {
  const { biometria, dados_cliente } = dados;
  
  if (!biometria || !dados_cliente) {
    throw new Error('Biometria e dados do cliente são obrigatórios');
  }

  // Verificar se pasta está 100% completa
  const { data: pasta, error: errorPasta } = await supabase
    .from('pastas_documentos')
    .select('*')
    .eq('lead_id', leadId)
    .single();

  if (errorPasta || !pasta || pasta.progresso_percentual < 100) {
    throw new Error('Pasta de documentos não está 100% completa');
  }

  // Validar biometria
  const resultadoBiometria = await validarBiometriaFacial(biometria.foto_base64);
  
  if (!resultadoBiometria.valida) {
    throw new Error('Validação biométrica falhou');
  }

  // Criar ou atualizar análise de crédito
  const { data: analise, error: errorAnalise } = await supabase
    .from('analises_credito')
    .upsert({
      lead_id: leadId,
      pasta_id: pasta.id,
      status: 'em_analise',
      score_risco: calcularScoreRisco(dados_cliente),
      limite_aprovado: calcularLimiteAprovado(dados_cliente),
      parcela_maxima: calcularParcelaMaxima(dados_cliente),
      prazo_maximo: 360,
      taxa_juros: 9.5 + Math.random() * 2,
      data_solicitacao: new Date().toISOString(),
      biometria_autorizada: true,
      ip_autorizacao: biometria.ip_address
    })
    .select('*')
    .single();

  if (errorAnalise) {
    throw new Error(`Erro ao criar análise de crédito: ${errorAnalise.message}`);
  }

  // Processar análise automaticamente
  await processarAnaliseCreditoAutomatica(analise.id);

  // Notificar cliente
  await supabase
    .from('notificacoes')
    .insert({
      lead_id: leadId,
      tipo: 'info',
      titulo: 'Análise de Crédito Autorizada',
      mensagem: 'Sua análise de crédito foi autorizada com biometria. Processando...',
      status: 'nao_lida'
    });

  return {
    success: true,
    analise_credito: {
      status: analise.status,
      score_risco: analise.score_risco,
      limite_aprovado: analise.limite_aprovado,
      parcela_maxima: analise.parcela_maxima,
      prazo_maximo: analise.prazo_maximo,
      taxa_juros: analise.taxa_juros,
      biometria_autorizada: analise.biometria_autorizada
    }
  };
}

async function verificarAnaliseYara(leadId: string): Promise<JornadaClienteResponse> {
  // Buscar análise Yara IA
  const { data: yara, error } = await supabase
    .from('yara_ia_analises')
    .select('*')
    .eq('lead_id', leadId)
    .single();

  if (error || !yara) {
    throw new Error('Análise Yara IA não encontrada');
  }

  return {
    success: true,
    yara_ia: {
      score_qualificacao: yara.score_qualificacao,
      probabilidade_conversao: yara.probabilidade_conversao,
      perfil_comportamental: yara.perfil_comportamental,
      recomendacoes: yara.recomendacoes,
      status: yara.status
    }
  };
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
          orgao_expedidor: 'SSP',
          uf: 'SP'
        };
        break;
      case 'cpf':
        dadosExtraidos = {
          cpf: '123.456.789-00',
          situacao: 'regular',
          data_emissao: '2020-01-01'
        };
        break;
      case 'comprovante_renda':
        dadosExtraidos = {
          renda_mensal: 10000,
          empresa: 'Empresa Teste LTDA',
          cargo: 'Analista',
          data_admissao: '2020-01-01'
        };
        break;
      case 'contrato_trabalho':
        dadosExtraidos = {
          empresa: 'Empresa Teste LTDA',
          cargo: 'Analista',
          salario: 10000,
          data_inicio: '2020-01-01'
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

async function validarBiometriaFacial(fotoBase64: string): Promise<{
  valida: boolean;
  score_confianca: number;
  face_id?: string;
}> {
  try {
    // Simulação de validação biométrica (em produção, integrar com API real)
    const scoreConfianca = Math.random() * 30 + 70; // 70-100%
    const faceId = `face_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      valida: scoreConfianca >= 75,
      score_confianca: scoreConfianca,
      face_id: faceId
    };

  } catch (error) {
    return {
      valida: false,
      score_confianca: 0
    };
  }
}

function calcularScoreRisco(dadosCliente: any): number {
  let score = 50; // Base neutro
  
  // Renda
  if (dadosCliente.renda_mensal >= 10000) score += 20;
  else if (dadosCliente.renda_mensal >= 5000) score += 10;
  else score -= 10;
  
  // Idade (simulada)
  score += Math.random() * 20 - 10;
  
  return Math.max(0, Math.min(100, score));
}

function calcularLimiteAprovado(dadosCliente: any): number {
  const rendaAnual = dadosCliente.renda_mensal * 12;
  return Math.floor(rendaAnual * 0.3); // 30% da renda anual
}

function calcularParcelaMaxima(dadosCliente: any): number {
  return Math.floor(dadosCliente.renda_mensal * 0.3); // 30% da renda mensal
}

async function criarAnaliseCreditoAutomatica(leadId: string, pastaId: string): Promise<void> {
  try {
    await supabase
      .from('analises_credito')
      .insert({
        lead_id: leadId,
        pasta_id: pastaId,
        status: 'pendente',
        data_solicitacao: new Date().toISOString()
      });
  } catch (error) {
    console.error('Erro ao criar análise de crédito automática:', error);
  }
}

async function processarAnaliseCreditoAutomatica(analiseId: string): Promise<void> {
  try {
    // Simular processamento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Atualizar status
    await supabase
      .from('analises_credito')
      .update({
        status: 'aprovado',
        data_analise: new Date().toISOString()
      })
      .eq('id', analiseId);
  } catch (error) {
    console.error('Erro no processamento automático:', error);
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
    
    return NextResponse.json({
      success: true,
      data: statusJornada,
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
