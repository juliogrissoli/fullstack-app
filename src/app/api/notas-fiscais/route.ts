// 🏛️ SECURITY BROKER SB v15 - AUDITORIA E COMPLIANCE FISCAL
// Gestão de NFs, Relatório de Bitributação e Validação Automática

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface NotaFiscalRequest {
  broker_id: string;
  venda_id?: string;
  transacao_id?: string;
  numero_nf: string;
  serie_nf?: string;
  data_emissao: string;
  valor_nf: number;
  valor_imposto?: number;
  emitente_cnpj: string;
  emitente_razao_social: string;
  emitente_ie?: string;
  destinatario_cnpj?: string;
  destinatario_razao_social?: string;
  destinatario_ie?: string;
  tipo_servico?: string;
  descricao_servico?: string;
  arquivo_base64?: string;
  arquivo_nome?: string;
}

interface NotaFiscalResponse {
  success: boolean;
  nota_fiscal?: {
    id: string;
    numero_nf: string;
    status: string;
    hash_nf: string;
    data_validacao?: string;
    valor_nf: number;
    economia_tributaria?: number;
  };
  validacoes?: Array<{
    tipo: string;
    resultado: 'aprovado' | 'rejeitado';
    mensagem: string;
  }>;
  relatorio_bitributacao?: {
    periodo_inicio: string;
    periodo_fim: string;
    economia_tributaria: number;
    percentual_economia: number;
    detalhes: {
      economia_pis_cofins: number;
      economia_iss: number;
      valor_comissoes_tradicionais: number;
      valor_comissoes_split: number;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: NotaFiscalRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!body.broker_id || !body.numero_nf || !body.data_emissao || !body.valor_nf || !body.emitente_cnpj || !body.emitente_razao_social) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }

    // Processar nota fiscal
    const resultado = await processarNotaFiscal(body, request);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Nota fiscal processada com sucesso'
    });

  } catch (error: any) {
    console.error('Erro na Gestão de Notas Fiscais:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno na Gestão de Notas Fiscais',
      details: error.message
    }, { status: 500 });
  }
}

async function processarNotaFiscal(request: NotaFiscalRequest, httpRequest: NextRequest): Promise<NotaFiscalResponse['nota_fiscal']> {
  const { broker_id, venda_id, transacao_id, arquivo_base64, arquivo_nome } = request;
  
  // 1. Validar broker
  const { data: broker, error: errorBroker } = await supabase
    .from('brokers')
    .select('*')
    .eq('id', broker_id)
    .single();
  
  if (errorBroker || !broker) {
    throw new Error('Broker não encontrado');
  }
  
  // 2. Salvar arquivo se fornecido
  let arquivoUrl;
  if (arquivo_base64 && arquivo_nome) {
    arquivoUrl = await salvarArquivoNF(arquivo_base64, arquivo_nome, broker_id);
  }
  
  // 3. Criar nota fiscal
  const { data: notaFiscal, error: errorNF } = await supabase
    .from('notas_fiscais')
    .insert({
      broker_id,
      venda_id,
      transacao_id,
      numero_nf: request.numero_nf,
      serie_nf: request.serie_nf,
      data_emissao: request.data_emissao,
      valor_nf: request.valor_nf,
      valor_imposto: request.valor_imposto || 0,
      emitente_cnpj: request.emitente_cnpj,
      emitente_razao_social: request.emitente_razao_social,
      emitente_ie: request.emitente_ie,
      destinatario_cnpj: request.destinatario_cnpj,
      destinatario_razao_social: request.destinatario_razao_social,
      destinatario_ie: request.destinatario_ie,
      tipo_servico: request.tipo_servico || 'intermediacao_imobiliaria',
      descricao_servico: request.descricao_servico,
      url_documento: arquivoUrl,
      ip_upload: httpRequest.headers.get('x-forwarded-for') || '127.0.0.1',
      usuario_upload_id: httpRequest.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000000'
    })
    .select('*')
    .single();
  
  if (errorNF) {
    throw new Error(`Erro ao criar nota fiscal: ${errorNF.message}`);
  }
  
  // 4. Validação automática
  const validacoes = await validarNotaFiscal(notaFiscal);
  
  // 5. Atualizar status baseado nas validações
  const statusFinal = (validacoes || []).every(v => v.resultado === 'aprovado') ? 'aprovada' : 'rejeitada';
  
  await supabase
    .from('notas_fiscais')
    .update({
      status: statusFinal,
      validacao_automatica: true,
      data_validacao: statusFinal === 'aprovada' ? new Date().toISOString() : null
    })
    .eq('id', notaFiscal.id);
  
  // 6. Se aprovada, liberar retenções técnicas
  if (statusFinal === 'aprovada') {
    await liberarRetencoesPorNF(notaFiscal);
  }
  
  // 7. Gerar relatório de bitributação
  const relatorioBitributacao = await gerarRelatorioBitributacao(broker.incorporadora_id);
  
  return {
    id: notaFiscal.id,
    numero_nf: notaFiscal.numero_nf,
    status: statusFinal,
    hash_nf: notaFiscal.hash_nf,
    data_validacao: statusFinal === 'aprovada' ? new Date().toISOString() : undefined,
    valor_nf: notaFiscal.valor_nf,
    economia_tributaria: relatorioBitributacao?.economia_tributaria
  };
}

async function salvarArquivoNF(arquivoBase64: string, nomeArquivo: string, brokerId: string): Promise<string> {
  try {
    // Criar diretório se não existir
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'notas-fiscais', brokerId);
    await mkdir(uploadsDir, { recursive: true });
    
    // Extrair dados do base64
    const matches = arquivoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Formato de arquivo inválido');
    }
    
    const tipo = matches[1];
    const dados = Buffer.from(matches[2], 'base64');
    
    // Salvar arquivo
    const extensao = tipo.split('/')[1] || 'pdf';
    const nomeCompleto = `${nomeArquivo}_${Date.now()}.${extensao}`;
    const caminhoArquivo = join(uploadsDir, nomeCompleto);
    
    await writeFile(caminhoArquivo, dados);
    
    // Retornar URL pública
    return `/uploads/notas-fiscais/${brokerId}/${nomeCompleto}`;
  } catch (error) {
    console.error('Erro ao salvar arquivo NF:', error);
    throw new Error('Erro ao salvar arquivo da nota fiscal');
  }
}

async function validarNotaFiscal(notaFiscal: any): Promise<NotaFiscalResponse['validacoes']> {
  const validacoes: NotaFiscalResponse['validacoes'] = [];
  
  // Validação 1: CNPJ do emitente
  if (validarCNPJ(notaFiscal.emitente_cnpj)) {
    validacoes.push({
      tipo: 'cnpj_emitente',
      resultado: 'aprovado',
      mensagem: 'CNPJ do emitente válido'
    });
  } else {
    validacoes.push({
      tipo: 'cnpj_emitente',
      resultado: 'rejeitado',
      mensagem: 'CNPJ do emitente inválido'
    });
  }
  
  // Validação 2: Data de emissão
  const dataEmissao = new Date(notaFiscal.data_emissao);
  const dataLimite = new Date();
  dataLimite.setMonth(dataLimite.getMonth() - 6); // Máximo 6 meses atrás
  
  if (dataEmissao >= dataLimite && dataEmissao <= new Date()) {
    validacoes.push({
      tipo: 'data_emissao',
      resultado: 'aprovado',
      mensagem: 'Data de emissão válida'
    });
  } else {
    validacoes.push({
      tipo: 'data_emissao',
      resultado: 'rejeitado',
      mensagem: 'Data de emissão fora do período permitido (máximo 6 meses)'
    });
  }
  
  // Validação 3: Valor da NF
  if (notaFiscal.valor_nf > 0 && notaFiscal.valor_nf <= 1000000) {
    validacoes.push({
      tipo: 'valor_nf',
      resultado: 'aprovado',
      mensagem: 'Valor da nota fiscal válido'
    });
  } else {
    validacoes.push({
      tipo: 'valor_nf',
      resultado: 'rejeitado',
      mensagem: 'Valor da nota fiscal inválido'
    });
  }
  
  // Validação 4: Tipo de serviço
  if (notaFiscal.tipo_servico === 'intermediacao_imobiliaria' || notaFiscal.tipo_servico === 'corretagem_imobiliaria') {
    validacoes.push({
      tipo: 'tipo_servico',
      resultado: 'aprovado',
      mensagem: 'Tipo de serviço compatível'
    });
  } else {
    validacoes.push({
      tipo: 'tipo_servico',
      resultado: 'rejeitado',
      mensagem: 'Tipo de serviço não compatível com intermediação imobiliária'
    });
  }
  
  // Validação 5: Série da NF
  if (!notaFiscal.serie_nf || notaFiscal.serie_nf.length <= 5) {
    validacoes.push({
      tipo: 'serie_nf',
      resultado: 'aprovado',
      mensagem: 'Série da NF válida'
    });
  } else {
    validacoes.push({
      tipo: 'serie_nf',
      resultado: 'rejeitado',
      mensagem: 'Série da NF muito longa'
    });
  }
  
  return validacoes;
}

function validarCNPJ(cnpj: string): boolean {
  // Remover caracteres não numéricos
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  // Verificar se tem 14 dígitos
  if (cnpj.length !== 14) {
    return false;
  }
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }
  
  // Cálculo do dígito verificador
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) {
      pos = 9;
    }
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  
  if (resultado !== parseInt(digitos.charAt(0))) {
    return false;
  }
  
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) {
      pos = 9;
    }
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  
  return resultado === parseInt(digitos.charAt(1));
}

async function liberarRetencoesPorNF(notaFiscal: any): Promise<void> {
  try {
    // Buscar transações do broker com retenção técnica
    const { data: transacoes } = await supabase
      .from('transacoes_pagamento')
      .select('*')
      .eq('broker_id', notaFiscal.broker_id)
      .eq('status', 'aprovado')
      .eq('retencao_tecnica', true)
      .eq('condicao_liberacao', 'upload_nf');
    
    if (!transacoes || transacoes.length === 0) {
      return;
    }
    
    // Liberar retenções
    for (const transacao of transacoes) {
      await supabase
        .from('transacoes_pagamento')
        .update({
          retencao_tecnica: false,
          documento_liberacao_id: notaFiscal.id,
          data_liberacao: new Date().toISOString(),
          status_liberacao: 'liberado'
        })
        .eq('id', transacao.id);
      
      // Liberar split do corretor
      await supabase
        .from('split_mesa')
        .update({
          status_corretor: 'processado',
          data_pagamento_corretor: new Date().toISOString()
        })
        .eq('transacao_id', transacao.id);
    }
    
    // Criar notificações
    await supabase
      .from('notificacoes')
      .insert({
        broker_id: notaFiscal.broker_id,
        tipo: 'info',
        titulo: 'Notas Fiscais Validadas',
        mensagem: `${transacoes.length} comissões liberadas após validação das notas fiscais.`,
        status: 'nao_lida'
      });
    
  } catch (error) {
    console.error('Erro ao liberar retenções por NF:', error);
  }
}

async function gerarRelatorioBitributacao(incorporadoraId: string): Promise<NotaFiscalResponse['relatorio_bitributacao']> {
  try {
    // Calcular período (últimos 30 dias)
    const dataFim = new Date();
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 30);
    
    // Gerar relatório usando função SQL
    const { data, error } = await supabase
      .rpc('gerar_relatorio_bitributacao', {
        p_incorporadora_id: incorporadoraId,
        p_data_inicio: dataInicio.toISOString().split('T')[0],
        p_data_fim: dataFim.toISOString().split('T')[0]
      });
    
    if (error) {
      throw new Error(`Erro ao gerar relatório: ${error.message}`);
    }
    
    const relatorio = Array.isArray(data) ? data[0] : data;
    
    return {
      periodo_inicio: dataInicio.toISOString().split('T')[0],
      periodo_fim: dataFim.toISOString().split('T')[0],
      economia_tributaria: relatorio.resumo?.total_economia_tributaria || 0,
      percentual_economia: relatorio.resumo?.economia_percentual || 0,
      detalhes: {
        economia_pis_cofins: relatorio.calculos_fiscais?.economia_pis_cofins || 0,
        economia_iss: relatorio.calculos_fiscais?.economia_iss || 0,
        valor_comissoes_tradicionais: relatorio.valores?.valor_comissoes_tradicionais || 0,
        valor_comissoes_split: relatorio.valores?.valor_comissoes_split || 0
      }
    };
    
  } catch (error) {
    console.error('Erro ao gerar relatório de bitributação:', error);
    return undefined;
  }
}

// Endpoint para consultar notas fiscais
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const broker_id = searchParams.get('broker_id');
    const incorporadora_id = searchParams.get('incorporadora_id');
    const status = searchParams.get('status');
    const data_inicio = searchParams.get('data_inicio');
    const data_fim = searchParams.get('data_fim');
    const relatorio = searchParams.get('relatorio');
    
    if (relatorio === 'true' && incorporadora_id) {
      return await consultarRelatorioBitributacao(incorporadora_id, data_inicio || undefined, data_fim || undefined);
    }
    
    let query = supabase
      .from('notas_fiscais')
      .select(`
        *,
        brokers!inner(
          id,
          nome,
          incorporadoras!inner(
            id,
            nome_fantasia
          )
        )
      `);
    
    if (broker_id) {
      query = query.eq('broker_id', broker_id);
    }
    
    if (incorporadora_id) {
      query = query.eq('brokers.incorporadoras.id', incorporadora_id);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (data_inicio) {
      query = query.gte('data_emissao', data_inicio);
    }
    
    if (data_fim) {
      query = query.lte('data_emissao', data_fim);
    }
    
    const { data, error } = await query
      .order('data_emissao', { ascending: false })
      .limit(100);
    
    if (error) {
      throw new Error(`Erro ao consultar notas fiscais: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      data: data || [],
      message: 'Notas fiscais consultadas com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar notas fiscais:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar notas fiscais',
      details: error.message
    }, { status: 500 });
  }
}

async function consultarRelatorioBitributacao(incorporadoraId: string, dataInicio?: string, dataFim?: string): Promise<NextResponse> {
  try {
    // Se não fornecer datas, usar último mês
    if (!dataInicio || !dataFim) {
      const dataFimObj = new Date();
      const dataInicioObj = new Date();
      dataInicioObj.setMonth(dataInicioObj.getMonth() - 1);
      
      dataInicio = dataInicioObj.toISOString().split('T')[0];
      dataFim = dataFimObj.toISOString().split('T')[0];
    }
    
    // Gerar relatório
    const { data, error } = await supabase
      .rpc('gerar_relatorio_bitributacao', {
        p_incorporadora_id: incorporadoraId,
        p_data_inicio: dataInicio,
        p_data_fim: dataFim
      });
    
    if (error) {
      throw new Error(`Erro ao gerar relatório: ${error.message}`);
    }
    
    // Buscar relatórios existentes
    const { data: relatorios, error: errorRelatorios } = await supabase
      .from('relatorios_bitributacao')
      .select('*')
      .eq('incorporadora_id', incorporadoraId)
      .gte('period_inicio', dataInicio)
      .lte('period_fim', dataFim)
      .order('data_geracao', { ascending: false });
    
    return NextResponse.json({
      success: true,
      data: {
        relatorio_gerado: Array.isArray(data) ? data[0] : data,
        relatorios_existentes: relatorios || []
      },
      message: 'Relatório de bitributação gerado com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao consultar relatório de bitributação:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar relatório',
      details: error.message
    }, { status: 500 });
  }
}

// Endpoint para validar nota fiscal manualmente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { nf_id, acao, observacoes } = body; // acao: 'aprovar' ou 'rejeitar'
    
    if (!nf_id || !acao) {
      return NextResponse.json({
        success: false,
        error: 'ID da NF e ação são obrigatórios'
      }, { status: 400 });
    }
    
    // Buscar nota fiscal
    const { data: nf, error: errorNF } = await supabase
      .from('notas_fiscais')
      .select('*')
      .eq('id', nf_id)
      .single();
    
    if (errorNF || !nf) {
      return NextResponse.json({
        success: false,
        error: 'Nota fiscal não encontrada'
      }, { status: 404 });
    }
    
    // Atualizar status
    const statusFinal = acao === 'aprovar' ? 'aprovada' : 'rejeitada';
    
    const { data: nfAtualizada, error: errorAtualizacao } = await supabase
      .from('notas_fiscais')
      .update({
        status: statusFinal,
        data_validacao: acao === 'aprovar' ? new Date().toISOString() : null,
        validador_id: request.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000000',
        observacoes: observacoes || null
      })
      .eq('id', nf_id)
      .select('*')
      .single();
    
    if (errorAtualizacao) {
      throw new Error(`Erro ao atualizar nota fiscal: ${errorAtualizacao.message}`);
    }
    
    // Se aprovada, liberar retenções
    if (acao === 'aprovar') {
      await liberarRetencoesPorNF(nfAtualizada);
    }
    
    return NextResponse.json({
      success: true,
      data: nfAtualizada,
      message: `Nota fiscal ${acao} com sucesso`
    });
    
  } catch (error: any) {
    console.error('Erro ao validar nota fiscal:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao validar nota fiscal',
      details: error.message
    }, { status: 500 });
  }
}
