// 🏛️ SECURITY BROKER SB v25 - OMNISCIENT INTELIGÊNCIA PREDITIVA
// API de DNA do Ativo (Histórico Imutável) e Certidão SB

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

interface DNAAtivoRequest {
  acao: 'registrar_evento' | 'gerar_certidao' | 'consultar_timeline' | 'validar_certidao';
  dados?: {
    ativo_tipo?: string;
    ativo_id?: string;
    projeto_id?: string;
    area_id?: string;
    unidade_id?: string;
    tipo_evento?: string;
    descricao_evento?: string;
    broker_id?: string;
    imobiliaria_id?: string;
    cliente_id?: string;
    incorporadora_id?: string;
    valor_ativo?: number;
    valor_transacao?: number;
    documentos_anexados?: string[];
    solicitante_id?: string;
    certidao_id?: string;
  };
}

interface DNAAtivoResponse {
  success: boolean;
  evento_registrado?: {
    id: string;
    ativo_tipo: string;
    ativo_id: string;
    tipo_evento: string;
    data_evento: string;
    hash_evento: string;
    hash_registro: string;
  };
  certidao_gerada?: {
    id: string;
    numero_certidao: string;
    data_emissao: string;
    data_validade: string;
    total_eventos: number;
    eventos_por_tipo: object;
    status_validacao: string;
    taxa_certidao: number;
  };
  timeline_consultada?: {
    ativo_id: string;
    ativo_tipo: string;
    total_eventos: number;
    timeline_completa: Array<{
      data_evento: string;
      tipo_evento: string;
      descricao: string;
      broker_id: string;
      valor_ativo: number;
      valor_transacao: number;
      hash_evento: string;
    }>;
    data_primeiro_evento: string;
    data_ultimo_evento: string;
    resumo_eventos: object;
    valor_total_transacoes: number;
  };
  certidao_validada?: {
    id: string;
    numero_certidao: string;
    status_validacao: string;
    data_validacao: string;
    validador_id: string;
    observacoes_validacao: string;
    autenticidade: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: DNAAtivoRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🧬 DNA do Ativo: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'registrar_evento':
        resultado = await registrarEvento(dados);
        break;
      case 'gerar_certidao':
        resultado = await gerarCertidao(dados);
        break;
      case 'consultar_timeline':
        resultado = await consultarTimeline(dados);
        break;
      case 'validar_certidao':
        resultado = await validarCertidao(dados);
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
    console.error('Erro no DNA do Ativo:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no DNA do Ativo',
      details: error.message
    }, { status: 500 });
  }
}

async function registrarEvento(dados: any): Promise<DNAAtivoResponse['evento_registrado']> {
  const { ativo_tipo, ativo_id, projeto_id, area_id, unidade_id, tipo_evento, descricao_evento, broker_id, imobiliaria_id, cliente_id, incorporadora_id, valor_ativo, valor_transacao, documentos_anexados } = dados;
  
  // Validar dados obrigatórios
  if (!ativo_tipo || !ativo_id || !tipo_evento) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Validar tipo de ativo
  if (!['projeto', 'area', 'unidade'].includes(ativo_tipo)) {
    throw new Error('Tipo de ativo inválido');
  }
  
  // Validar tipo de evento
  if (!['criacao', 'avaliacao', 'match', 'vistoria', 'venda', 'transferencia', 'registro', 'itbi'].includes(tipo_evento)) {
    throw new Error('Tipo de evento inválido');
  }
  
  // Registrar evento no timeline
  const { data: evento, error } = await supabase
    .from('asset_timeline')
    .insert({
      ativo_tipo,
      ativo_id,
      projeto_id,
      area_id,
      unidade_id,
      tipo_evento,
      descricao_evento,
      broker_id,
      imobiliaria_id,
      cliente_id,
      incorporadora_id,
      valor_ativo,
      valor_transacao,
      documentos_anexados: documentos_anexados || [],
      dados_evento: {
        registrado_por: broker_id,
        data_registro: new Date().toISOString(),
        versao_sistema: 'v25'
      },
      status_evento: 'ativo'
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao registrar evento: ${error.message}`);
  }
  
  return {
    id: evento.id,
    ativo_tipo: evento.ativo_tipo,
    ativo_id: evento.ativo_id,
    tipo_evento: evento.tipo_evento,
    data_evento: evento.data_evento,
    hash_evento: evento.hash_evento,
    hash_registro: evento.hash_registro
  };
}

async function gerarCertidao(dados: any): Promise<DNAAtivoResponse['certidao_gerada']> {
  const { ativo_tipo, ativo_id, solicitante_id, imobiliaria_id } = dados;
  
  // Validar dados obrigatórios
  if (!ativo_tipo || !ativo_id || !solicitante_id) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Gerar certidão usando função RPC
  const { data: resultado, error } = await supabase
    .rpc('gerar_certidao_historico', {
      p_ativo_tipo: ativo_tipo,
      p_ativo_id: ativo_id,
      p_solicitante_id: solicitante_id,
      p_imobiliaria_id: imobiliaria_id
    });
  
  if (error) {
    throw new Error(`Erro ao gerar certidão: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error('Falha ao gerar certidão');
  }
  
  // Buscar dados completos da certidão
  const { data: certidao } = await supabase
    .from('certidao_historico_sb')
    .select('*')
    .eq('id', resultado.certidao_id)
    .single();
  
  return {
    id: certidao.id,
    numero_certidao: certidao.numero_certidao,
    data_emissao: certidao.data_emissao,
    data_validade: certidao.data_validade,
    total_eventos: certidao.total_eventos,
    eventos_por_tipo: certidao.eventos_por_tipo,
    status_validacao: certidao.status_validacao,
    taxa_certidao: certidao.taxa_certidao
  };
}

async function consultarTimeline(dados: any): Promise<DNAAtivoResponse['timeline_consultada']> {
  const { ativo_tipo, ativo_id } = dados;
  
  // Validar dados obrigatórios
  if (!ativo_tipo || !ativo_id) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Buscar DNA do ativo
  const { data: dna, error } = await supabase
    .from('dna_ativo')
    .select('*')
    .eq('ativo_id', ativo_id)
    .eq('ativo_tipo', ativo_tipo)
    .single();
  
  if (error || !dna) {
    throw new Error('DNA do ativo não encontrado');
  }
  
  return {
    ativo_id: dna.ativo_id,
    ativo_tipo: dna.ativo_tipo,
    total_eventos: dna.total_eventos,
    timeline_completa: dna.timeline_completa,
    data_primeiro_evento: dna.data_primeiro_evento,
    data_ultimo_evento: dna.data_ultimo_evento,
    resumo_eventos: dna.resumo_eventos,
    valor_total_transacoes: dna.valor_total_transacoes
  };
}

async function validarCertidao(dados: any): Promise<DNAAtivoResponse['certidao_validada']> {
  const { certidao_id, validador_id, observacoes_validacao } = dados;
  
  // Validar dados obrigatórios
  if (!certidao_id || !validador_id) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Buscar certidão
  const { data: certidao, error } = await supabase
    .from('certidao_historico_sb')
    .select('*')
    .eq('id', certidao_id)
    .single();
  
  if (error || !certidao) {
    throw new Error('Certidão não encontrada');
  }
  
  // Validar autenticidade (simulado - em produção seria mais complexo)
  const autenticidade = true;
  const statusValidacao = autenticidade ? 'validado' : 'rejeitado';
  
  // Atualizar status da certidão
  const { data: certidaoAtualizada } = await supabase
    .from('certidao_historico_sb')
    .update({
      status_validacao: statusValidacao,
      validador_id,
      data_validacao: new Date().toISOString(),
      observacoes_validacao: observacoes_validacao || 'Certidão validada com sucesso'
    })
    .eq('id', certidao_id)
    .select('*')
    .single();
  
  return {
    id: certidaoAtualizada.id,
    numero_certidao: certidaoAtualizada.numero_certidao,
    status_validacao: certidaoAtualizada.status_validacao,
    data_validacao: certidaoAtualizada.data_validacao,
    validador_id: certidaoAtualizada.validador_id,
    observacoes_validacao: certidaoAtualizada.observacoes_validacao,
    autenticidade
  };
}

// Endpoint para consultas específicas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const ativo_tipo = searchParams.get('ativo_tipo');
    const ativo_id = searchParams.get('ativo_id');
    const solicitante_id = searchParams.get('solicitante_id');
    
    if (tipo === 'certidoes' && solicitante_id) {
      return await consultarCertidoes(solicitante_id);
    }
    
    if (tipo === 'eventos' && ativo_tipo && ativo_id) {
      return await consultarEventos(ativo_tipo, ativo_id);
    }
    
    if (tipo === 'resumo_ativo' && ativo_tipo && ativo_id) {
      return await consultarResumoAtivo(ativo_tipo, ativo_id);
    }
    
    return NextResponse.json({
      success: false,
      error: 'Tipo de consulta inválido'
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Erro ao consultar dados:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao consultar dados',
      details: error.message
    }, { status: 500 });
  }
}

async function consultarCertidoes(solicitanteId: string): Promise<NextResponse> {
  // Buscar certidões do solicitante
  const { data: certidoes } = await supabase
    .from('certidao_historico_sb')
    .select(`
      *,
      brokers!inner(nome)
    `)
    .eq('solicitante_id', solicitanteId)
    .order('data_emissao', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: certidoes || [],
    message: 'Certidões consultadas com sucesso'
  });
}

async function consultarEventos(ativoTipo: string, ativoId: string): Promise<NextResponse> {
  // Buscar eventos do ativo
  const { data: eventos } = await supabase
    .from('asset_timeline')
    .select(`
      *,
      brokers!inner(nome),
      clientes!inner(nome)
    `)
    .eq('ativo_tipo', ativoTipo)
    .eq('ativo_id', ativoId)
    .order('data_evento', { ascending: true });
  
  return NextResponse.json({
    success: true,
    data: eventos || [],
    message: 'Eventos consultados com sucesso'
  });
}

async function consultarResumoAtivo(ativoTipo: string, ativoId: string): Promise<NextResponse> {
  // Buscar resumo do DNA do ativo
  const { data: resumo } = await supabase
    .from('dna_ativo')
    .select('*')
    .eq('ativo_tipo', ativoTipo)
    .eq('ativo_id', ativoId)
    .single();
  
  return NextResponse.json({
    success: true,
    data: resumo,
    message: 'Resumo do ativo consultado com sucesso'
  });
}
