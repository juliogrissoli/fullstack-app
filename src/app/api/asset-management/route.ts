// 🏛️ SECURITY BROKER SB v28 - ASSET MANAGEMENT & HONORÁRIOS
// API de Gestão de Ativos e Tabela Referencial de Honorários CRECI

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

interface AssetManagementRequest {
  acao: 'consultar_honorarios' | 'criar_contrato_locacao' | 'registrar_checkin' | 'realizar_vistoria' | 'vender_seguro' | 'criar_ordem_servico' | 'gerar_documento_tecnico' | 'calcular_divisao_honorarios' | 'processar_contribuicao_v28';
  dados?: {
    tipo_servico?: string;
    subtipo_servico?: string;
    valor_transacao?: number;
    valor_condicao?: number;
    numero_contrato?: string;
    tipo_locacao?: string;
    tipo_imovel?: string;
    proprietario_id?: string;
    locatario_id?: string;
    imobiliaria_id?: string;
    corretor_captador_id?: string;
    corretor_locador_id?: string;
    imovel_id?: string;
    endereco_completo?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    valor_aluguel?: number;
    valor_condominio?: number;
    valor_iptu?: number;
    valor_seguro?: number;
    percentual_honorarios?: number;
    data_inicio_contrato?: string;
    data_fim_contrato?: string;
    data_vencimento_aluguel?: number;
    prazo_minimo_meses?: number;
    tipo_garantia?: string;
    valor_garantia?: number;
    fiador_id?: string;
    usuario_id?: string;
    tipo_acesso?: string;
    latitude?: number;
    longitude?: number;
    foto_usuario?: string;
    contrato_locacao_id?: string;
    tipo_vistoria?: string;
    motivo_vistoria?: string;
    data_vistoria?: string;
    hora_inicio?: string;
    hora_fim?: string;
    fotos_vistoria?: string[];
    videos_vistoria?: string[];
    checklist_completo?: any;
    laudo_vistoria?: string;
    seguradora_id?: string;
    corretor_seguros_id?: string;
    tipo_seguro?: string;
    modalidade_seguro?: string;
    apolice_numero?: string;
    data_emissao?: string;
    data_inicio_vigencia?: string;
    data_fim_vigencia?: string;
    valor_segurado?: number;
    premio_seguro?: number;
    franquia?: number;
    percentual_comissao?: number;
    numero_os?: string;
    cliente_id?: string;
    nome_cliente?: string;
    documento_cliente?: string;
    descricao_servico?: string;
    escopo_servico?: string;
    objetivos_servico?: string;
    profissional_id?: string;
    tipo_honorario?: string;
    valor_honorario?: number;
    percentual_honorario_os?: number;
    base_calculo_honorario?: string;
    data_solicitacao?: string;
    data_inicio_prevista?: string;
    data_entrega_prevista?: string;
    prazo_dias?: number;
    autorizacao_procura?: string;
    documento_autorizacao?: string;
    data_autorizacao?: string;
    ordem_servico_id?: string;
    tipo_documento?: string;
    titulo_documento?: string;
    conteudo_documento?: string;
    resumo_documento?: string;
    conclusoes?: string;
    recomendacoes?: string;
    metodologia_utilizada?: string;
    fontes_consultadas?: string[];
    valor_avaliado?: number;
    valor_mercado?: number;
    valor_venal?: number;
    arquivos_anexos?: string[];
    imagens_anexas?: string[];
    videos_anexos?: string[];
    contrato_divisao_id?: string;
    ajuste_escrito?: boolean;
    corretor_captador_percent?: number;
    corretor_locador_percent?: number;
    imobiliaria_percent?: number;
    motivo_ajuste?: string;
    documento_ajuste?: string;
    data_ajuste?: string;
    mes_referencia?: string;
  };
}

interface AssetManagementResponse {
  success: boolean;
  honorarios_consultados?: {
    sucesso: boolean;
    tipo_servico: string;
    subtipo_servico: string;
    percentual_minimo: number;
    percentual_maximo: number;
    percentual_aplicado: number;
    valor_minimo: number;
    valor_calculado: number;
    base_calculo: string;
    condicao_especial: string;
    nota_referencia: string;
  };
  contrato_locacao_criado?: {
    id: string;
    numero_contrato: string;
    tipo_locacao: string;
    tipo_imovel: string;
    proprietario_id: string;
    locatario_id: string;
    imovel_id: string;
    endereco_completo: string;
    valor_aluguel: number;
    valor_total: number;
    percentual_honorarios: number;
    valor_honorarios: number;
    data_inicio_contrato: string;
    data_fim_contrato: string;
    status_contrato: string;
  };
  checkin_registrado?: {
    id: string;
    contrato_locacao_id: string;
    usuario_id: string;
    tipo_acesso: string;
    latitude: number;
    longitude: number;
    data_hora_acesso: string;
    status_reconhecimento: string;
    geofence_validado: boolean;
    distancia_real: number;
  };
  vistoria_realizada?: {
    id: string;
    contrato_locacao_id: string;
    tipo_vistoria: string;
    data_vistoria: string;
    hora_inicio: string;
    hora_fim: string;
    duracao_minutos: number;
    fotos_vistoria: string[];
    videos_vistoria: string[];
    checklist_completo: any;
    laudo_vistoria: string;
    status_laudo: string;
  };
  seguro_vendido?: {
    id: string;
    contrato_locacao_id: string;
    apolice_numero: string;
    tipo_seguro: string;
    modalidade_seguro: string;
    valor_segurado: number;
    premio_seguro: number;
    percentual_comissao: number;
    valor_comissao: number;
    data_inicio_vigencia: string;
    data_fim_vigencia: string;
    status_seguro: string;
  };
  ordem_servico_criada?: {
    id: string;
    numero_os: string;
    tipo_servico: string;
    cliente_id: string;
    nome_cliente: string;
    imovel_id: string;
    descricao_servico: string;
    profissional_id: string;
    valor_honorario: number;
    status_os: string;
    data_solicitacao: string;
    bloqueio_entrega: boolean;
  };
  documento_tecnico_gerado?: {
    id: string;
    ordem_servico_id: string;
    tipo_documento: string;
    titulo_documento: string;
    conteudo_documento: string;
    status_documento: string;
    bloqueio_entrega: boolean;
    hash_documento: string;
  };
  divisao_honorarios_calculada?: {
    sucesso: boolean;
    divisao_id: string;
    contrato_id: string;
    valor_total_honorarios: number;
    divisao_padrao: boolean;
    ajuste_escrito: boolean;
    corretor_captador_percent: number;
    corretor_locador_percent: number;
    imobiliaria_percent: number;
    corretor_captador_valor: number;
    corretor_locador_valor: number;
    imobiliaria_valor: number;
  };
  contribuicao_processada?: {
    sucesso: boolean;
    tesouro_id: string;
    mes_referencia: string;
    faturamento_vendas: number;
    faturamento_locacoes: number;
    faturamento_bruto: number;
    custos_operacionais: number;
    splits_distribuidos: number;
    faturamento_liquido: number;
    valor_contribuicao: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AssetManagementRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🏛️ Asset Management: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'consultar_honorarios':
        resultado = await consultarHonorarios(dados);
        break;
      case 'criar_contrato_locacao':
        resultado = await criarContratoLocacao(dados);
        break;
      case 'registrar_checkin':
        resultado = await registrarCheckin(dados);
        break;
      case 'realizar_vistoria':
        resultado = await realizarVistoria(dados);
        break;
      case 'vender_seguro':
        resultado = await venderSeguro(dados);
        break;
      case 'criar_ordem_servico':
        resultado = await criarOrdemServico(dados);
        break;
      case 'gerar_documento_tecnico':
        resultado = await gerarDocumentoTecnico(dados);
        break;
      case 'calcular_divisao_honorarios':
        resultado = await calcularDivisaoHonorarios(dados);
        break;
      case 'processar_contribuicao_v28':
        resultado = await processarContribuicaoV28(dados);
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
    console.error('Erro no Asset Management:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Asset Management',
      details: error.message
    }, { status: 500 });
  }
}

async function consultarHonorarios(dados: any): Promise<AssetManagementResponse['honorarios_consultados']> {
  const { tipo_servico, subtipo_servico, valor_transacao, valor_condicao } = dados;
  
  // Validar dados obrigatórios
  if (!tipo_servico || !subtipo_servico) {
    throw new Error('Tipo e subtipo de serviço são obrigatórios');
  }
  
  // Consultar honorários via função RPC
  const { data: resultado, error } = await supabase
    .rpc('consultar_honorarios_creci', {
      p_tipo_servico: tipo_servico,
      p_subtipo_servico: subtipo_servico,
      p_valor_transacao: valor_transacao || 0,
      p_valor_condicao: valor_condicao || 0
    });
  
  if (error) {
    throw new Error(`Erro ao consultar honorários: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao consultar honorários');
  }
  
  return resultado;
}

async function criarContratoLocacao(dados: any): Promise<AssetManagementResponse['contrato_locacao_criado']> {
  const { numero_contrato, tipo_locacao, tipo_imovel, proprietario_id, locatario_id, imobiliaria_id, corretor_captador_id, corretor_locador_id, imovel_id, endereco_completo, bairro, cidade, estado, cep, valor_aluguel, valor_condominio, valor_iptu, valor_seguro, percentual_honorarios, data_inicio_contrato, data_fim_contrato, data_vencimento_aluguel, prazo_minimo_meses, tipo_garantia, valor_garantia, fiador_id } = dados;
  
  // Validar dados obrigatórios
  if (!numero_contrato || !tipo_locacao || !proprietario_id || !locatario_id || !valor_aluguel || !data_inicio_contrato) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Consultar honorários de locação
  const honorariosResult = await consultarHonorarios({
    tipo_servico: 'locacao',
    subtipo_servico: tipo_locacao === 'temporada' ? 'temporada' : 'tradicional',
    valor_transacao: valor_aluguel
  });
  
  if (!honorariosResult || !honorariosResult.sucesso) {
    throw new Error('Não foi possível consultar os honorários');
  }
  
  // Gerar coordenada (simulado)
  const coordenadaImovel = { x: -23.5505, y: -46.6333 }; // São Paulo como padrão
  
  // Criar contrato de locação
  const { data: contrato, error } = await supabase
    .from('contratos_locacao')
    .insert({
      numero_contrato,
      tipo_locacao,
      tipo_imovel,
      proprietario_id,
      locatario_id,
      imobiliaria_id,
      corretor_captador_id,
      corretor_locador_id,
      imovel_id,
      endereco_completo,
      bairro,
      cidade,
      estado,
      cep,
      coordenada_imovel: `POINT(${coordenadaImovel.x}, ${coordenadaImovel.y})`,
      valor_aluguel,
      valor_condominio: valor_condominio || 0,
      valor_iptu: valor_iptu || 0,
      valor_seguro: valor_seguro || 0,
      percentual_honorarios: percentual_honorarios || honorariosResult?.percentual_aplicado || 0,
      data_inicio_contrato,
      data_fim_contrato,
      data_vencimento_aluguel: data_vencimento_aluguel || 1,
      prazo_minimo_meses: prazo_minimo_meses || 12,
      tipo_garantia,
      valor_garantia: valor_garantia || 0,
      fiador_id,
      status_contrato: 'ativo'
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao criar contrato de locação: ${error.message}`);
  }
  
  return {
    id: contrato.id,
    numero_contrato: contrato.numero_contrato,
    tipo_locacao: contrato.tipo_locacao,
    tipo_imovel: contrato.tipo_imovel,
    proprietario_id: contrato.proprietario_id,
    locatario_id: contrato.locatario_id,
    imovel_id: contrato.imovel_id,
    endereco_completo: contrato.endereco_completo,
    valor_aluguel: contrato.valor_aluguel,
    valor_total: contrato.valor_total,
    percentual_honorarios: contrato.percentual_honorarios,
    valor_honorarios: contrato.valor_honorarios,
    data_inicio_contrato: contrato.data_inicio_contrato,
    data_fim_contrato: contrato.data_fim_contrato,
    status_contrato: contrato.status_contrato
  };
}

async function registrarCheckin(dados: any): Promise<AssetManagementResponse['checkin_registrado']> {
  const { contrato_locacao_id, usuario_id, tipo_acesso, latitude, longitude, foto_usuario } = dados;
  
  // Validar dados obrigatórios
  if (!contrato_locacao_id || !usuario_id || !tipo_acesso || !latitude || !longitude) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Validar tipo de acesso
  if (!['entrada', 'saida', 'visita', 'vistoria'].includes(tipo_acesso)) {
    throw new Error('Tipo de acesso inválido');
  }
  
  // Registrar check-in
  const { data: checkin, error } = await supabase
    .from('checkin_geofencing')
    .insert({
      contrato_locacao_id,
      usuario_id,
      tipo_acesso,
      latitude,
      longitude,
      foto_usuario,
      status_reconhecimento: 'pendente',
      geofence_validado: false,
      distancia_permitida: 100,
      distancia_real: 0
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao registrar check-in: ${error.message}`);
  }
  
  return {
    id: checkin.id,
    contrato_locacao_id: checkin.contrato_locacao_id,
    usuario_id: checkin.usuario_id,
    tipo_acesso: checkin.tipo_acesso,
    latitude: checkin.latitude,
    longitude: checkin.longitude,
    data_hora_acesso: checkin.data_hora_acesso,
    status_reconhecimento: checkin.status_reconhecimento,
    geofence_validado: checkin.geofence_validado,
    distancia_real: checkin.distancia_real
  };
}

async function realizarVistoria(dados: any): Promise<AssetManagementResponse['vistoria_realizada']> {
  const { contrato_locacao_id, tipo_vistoria, motivo_vistoria, data_vistoria, hora_inicio, hora_fim, fotos_vistoria, videos_vistoria, checklist_completo, laudo_vistoria, vistoriador_id } = dados;
  
  // Validar dados obrigatórios
  if (!contrato_locacao_id || !tipo_vistoria || !data_vistoria) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Calcular duração
  let duracaoMinutos = 0;
  if (hora_inicio && hora_fim) {
    const inicio = new Date(`2000-01-01T${hora_inicio}`);
    const fim = new Date(`2000-01-01T${hora_fim}`);
    duracaoMinutos = Math.floor((fim.getTime() - inicio.getTime()) / 60000);
  }
  
  // Gerar coordenada (simulado)
  const coordenadaVistoria = { x: -23.5505, y: -46.6333 }; // São Paulo como padrão
  
  // Realizar vistoria
  const { data: vistoria, error } = await supabase
    .from('vistoria_auditada')
    .insert({
      contrato_locacao_id,
      tipo_vistoria,
      motivo_vistoria,
      data_vistoria,
      hora_inicio,
      hora_fim,
      duracao_minutos: duracaoMinutos,
      latitude_vistoria: coordenadaVistoria.x,
      longitude_vistoria: coordenadaVistoria.y,
      fotos_vistoria: fotos_vistoria || [],
      videos_vistoria: videos_vistoria || [],
      checklist_completo: checklist_completo || {},
      laudo_vistoria,
      status_laudo: laudo_vistoria ? 'aprovado' : 'pendente',
      data_laudo: laudo_vistoria ? new Date().toISOString().split('T')[0] : null,
      vistoriador_id
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao realizar vistoria: ${error.message}`);
  }
  
  return {
    id: vistoria.id,
    contrato_locacao_id: vistoria.contrato_locacao_id,
    tipo_vistoria: vistoria.tipo_vistoria,
    data_vistoria: vistoria.data_vistoria,
    hora_inicio: vistoria.hora_inicio,
    hora_fim: vistoria.hora_fim,
    duracao_minutos: vistoria.duracao_minutos,
    fotos_vistoria: vistoria.fotos_vistoria,
    videos_vistoria: vistoria.videos_vistoria,
    checklist_completo: vistoria.checklist_completo,
    laudo_vistoria: vistoria.laudo_vistoria,
    status_laudo: vistoria.status_laudo
  };
}

async function venderSeguro(dados: any): Promise<AssetManagementResponse['seguro_vendido']> {
  const { contrato_locacao_id, seguradora_id, corretor_seguros_id, tipo_seguro, modalidade_seguro, apolice_numero, data_emissao, data_inicio_vigencia, data_fim_vigencia, valor_segurado, premio_seguro, franquia, percentual_comissao } = dados;
  
  // Validar dados obrigatórios
  if (!contrato_locacao_id || !tipo_seguro || !valor_segurado || !premio_seguro) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Vender seguro
  const { data: seguro, error } = await supabase
    .from('seguros_imobiliarios')
    .insert({
      contrato_locacao_id,
      seguradora_id,
      corretor_seguros_id,
      tipo_seguro,
      modalidade_seguro,
      apolice_numero,
      data_emissao: data_emissao || new Date().toISOString().split('T')[0],
      data_inicio_vigencia,
      data_fim_vigencia,
      valor_segurado,
      premio_seguro,
      franquia: franquia || 0,
      percentual_comissao: percentual_comissao || 10.0,
      status_seguro: 'ativo'
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao vender seguro: ${error.message}`);
  }
  
  return {
    id: seguro.id,
    contrato_locacao_id: seguro.contrato_locacao_id,
    apolice_numero: seguro.apolice_numero,
    tipo_seguro: seguro.tipo_seguro,
    modalidade_seguro: seguro.modalidade_seguro,
    valor_segurado: seguro.valor_segurado,
    premio_seguro: seguro.premio_seguro,
    percentual_comissao: seguro.percentual_comissao,
    valor_comissao: seguro.valor_comissao,
    data_inicio_vigencia: seguro.data_inicio_vigencia,
    data_fim_vigencia: seguro.data_fim_vigencia,
    status_seguro: seguro.status_seguro
  };
}

async function criarOrdemServico(dados: any): Promise<AssetManagementResponse['ordem_servico_criada']> {
  const { numero_os, tipo_servico, cliente_id, nome_cliente, documento_cliente, imovel_id, endereco_servico, descricao_servico, escopo_servico, objetivos_servico, profissional_id, imobiliaria_id, tipo_honorario, valor_honorario, percentual_honorario_os, base_calculo_honorario, data_solicitacao, data_inicio_prevista, data_entrega_prevista, prazo_dias, autorizacao_procura, documento_autorizacao, data_autorizacao } = dados;
  
  // Validar dados obrigatórios
  if (!numero_os || !tipo_servico || !cliente_id || !descricao_servico || !valor_honorario) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Gerar número de OS se não fornecido
  const numeroOS = numero_os || `OS-${Date.now()}`;
  
  // Criar ordem de serviço
  const { data: ordem, error } = await supabase
    .from('ordens_servico')
    .insert({
      numero_os: numeroOS,
      tipo_servico,
      cliente_id,
      nome_cliente,
      documento_cliente,
      imovel_id,
      endereco_servico,
      descricao_servico,
      escopo_servico,
      objetivos_servico,
      profissional_id,
      imobiliaria_id,
      tipo_honorario,
      valor_honorario,
      percentual_honorario_os: percentual_honorario_os || 0,
      base_calculo_honorario,
      data_solicitacao: data_solicitacao || new Date().toISOString().split('T')[0],
      data_inicio_prevista,
      data_entrega_prevista,
      prazo_dias: prazo_dias || 30,
      autorizacao_procura,
      documento_autorizacao,
      data_autorizacao,
      status_os: 'aberta',
      bloqueio_entrega: true,
      valor_total_servico: valor_honorario
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao criar ordem de serviço: ${error.message}`);
  }
  
  return {
    id: ordem.id,
    numero_os: ordem.numero_os,
    tipo_servico: ordem.tipo_servico,
    cliente_id: ordem.cliente_id,
    nome_cliente: ordem.nome_cliente,
    imovel_id: ordem.imovel_id,
    descricao_servico: ordem.descricao_servico,
    profissional_id: ordem.profissional_id,
    valor_honorario: ordem.valor_honorario,
    status_os: ordem.status_os,
    data_solicitacao: ordem.data_solicitacao,
    bloqueio_entrega: ordem.bloqueio_entrega
  };
}

async function gerarDocumentoTecnico(dados: any): Promise<AssetManagementResponse['documento_tecnico_gerado']> {
  const { ordem_servico_id, tipo_documento, titulo_documento, conteudo_documento, resumo_documento, conclusoes, recomendacoes, metodologia_utilizada, fontes_consultadas, valor_avaliado, valor_mercado, valor_venal, arquivos_anexos, imagens_anexas, videos_anexos } = dados;
  
  // Validar dados obrigatórios
  if (!ordem_servico_id || !tipo_documento || !titulo_documento) {
    throw new Error('Dados obrigatórios não fornecidos');
  }
  
  // Gerar documento técnico
  const { data: documento, error } = await supabase
    .from('documentos_tecnicos')
    .insert({
      ordem_servico_id,
      tipo_documento,
      titulo_documento,
      conteudo_documento,
      resumo_documento,
      conclusoes,
      recomendacoes,
      metodologia_utilizada,
      fontes_consultadas: fontes_consultadas || [],
      valor_avaliado: valor_avaliado || 0,
      valor_mercado: valor_mercado || 0,
      valor_venal: valor_venal || 0,
      arquivos_anexos: arquivos_anexos || [],
      imagens_anexas: imagens_anexas || [],
      videos_anexos: videos_anexos || [],
      status_documento: 'em_elaboracao',
      bloqueio_entrega: true
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Erro ao gerar documento técnico: ${error.message}`);
  }
  
  return {
    id: documento.id,
    ordem_servico_id: documento.ordem_servico_id,
    tipo_documento: documento.tipo_documento,
    titulo_documento: documento.titulo_documento,
    conteudo_documento: documento.conteudo_documento,
    status_documento: documento.status_documento,
    bloqueio_entrega: documento.bloqueio_entrega,
    hash_documento: documento.hash_documento
  };
}

async function calcularDivisaoHonorarios(dados: any): Promise<AssetManagementResponse['divisao_honorarios_calculada']> {
  const { contrato_divisao_id, ajuste_escrito, corretor_captador_percent, corretor_locador_percent, imobiliaria_percent, motivo_ajuste, documento_ajuste, data_ajuste } = dados;
  
  // Validar dados obrigatórios
  if (!contrato_divisao_id) {
    throw new Error('ID do contrato é obrigatório');
  }
  
  // Calcular divisão de honorários via função RPC
  const { data: resultado, error } = await supabase
    .rpc('calcular_divisao_honorarios_locacao', {
      p_contrato_locacao_id: contrato_divisao_id,
      p_ajuste_escrito: ajuste_escrito || false,
      p_corretor_captador_percent: corretor_captador_percent || 50.0,
      p_corretor_locador_percent: corretor_locador_percent || 50.0,
      p_imobiliaria_percent: imobiliaria_percent || 0.0
    });
  
  if (error) {
    throw new Error(`Erro ao calcular divisão de honorários: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error(resultado.erro || 'Erro ao calcular divisão de honorários');
  }
  
  // Atualizar dados adicionais se houver ajuste escrito
  if (ajuste_escrito && motivo_ajuste) {
    await supabase
      .from('divisao_honorarios_locacao')
      .update({
        motivo_ajuste,
        documento_ajuste,
        data_ajuste: data_ajuste || new Date().toISOString().split('T')[0]
      })
      .eq('id', resultado.divisao_id);
  }
  
  return resultado;
}

async function processarContribuicaoV28(dados: any): Promise<AssetManagementResponse['contribuicao_processada']> {
  const { mes_referencia } = dados;
  
  // Processar contribuição social via função RPC
  const { data: resultado, error } = await supabase
    .rpc('processar_contribuicao_social_v28', {
      p_mes_referencia: mes_referencia || new Date().toISOString().split('T')[0]
    });
  
  if (error) {
    throw new Error(`Erro ao processar contribuição social V28: ${error.message}`);
  }
  
  if (!resultado.sucesso) {
    throw new Error('Falha ao processar contribuição social V28');
  }
  
  return resultado;
}

// Endpoint para consultas específicas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const contrato_id = searchParams.get('contrato_id');
    const profissional_id = searchParams.get('profissional_id');
    const cliente_id = searchParams.get('cliente_id');
    
    if (tipo === 'tabela_honorarios') {
      return await consultarTabelaHonorarios();
    }
    
    if (tipo === 'contratos_locacao' && profissional_id) {
      return await consultarContratosLocacaoProfissional(profissional_id);
    }
    
    if (tipo === 'ordens_servico' && profissional_id) {
      return await consultarOrdensServicoProfissional(profissional_id);
    }
    
    if (tipo === 'documentos_tecnicos' && profissional_id) {
      return await consultarDocumentosTecnicosProfissional(profissional_id);
    }
    
    if (tipo === 'divisoes_honorarios' && contrato_id) {
      return await consultarDivisoesHonorariosContrato(contrato_id);
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

async function consultarTabelaHonorarios(): Promise<NextResponse> {
  // Buscar tabela de honorários ativa
  const { data: honorarios } = await supabase
    .from('tabela_honorarios_creci')
    .select('*')
    .eq('status_tabela', 'ativa')
    .order('tipo_servico, subtipo_servico');
  
  return NextResponse.json({
    success: true,
    data: honorarios || [],
    message: 'Tabela de honorários consultada com sucesso'
  });
}

async function consultarContratosLocacaoProfissional(profissionalId: string): Promise<NextResponse> {
  // Buscar contratos de locação do profissional
  const { data: contratos } = await supabase
    .from('contratos_locacao')
    .select('*')
    .or(`corretor_captador_id.eq.${profissionalId},corretor_locador_id.eq.${profissionalId}`)
    .order('data_inicio_contrato', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: contratos || [],
    message: 'Contratos de locação consultados com sucesso'
  });
}

async function consultarOrdensServicoProfissional(profissionalId: string): Promise<NextResponse> {
  // Buscar ordens de serviço do profissional
  const { data: ordens } = await supabase
    .from('ordens_servico')
    .select('*')
    .eq('profissional_id', profissionalId)
    .order('data_solicitacao', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: ordens || [],
    message: 'Ordens de serviço consultadas com sucesso'
  });
}

async function consultarDocumentosTecnicosProfissional(profissionalId: string): Promise<NextResponse> {
  // Buscar documentos técnicos do profissional
  const { data: documentos } = await supabase
    .from('documentos_tecnicos')
    .select('*')
    .eq('profissional_id', profissionalId)
    .order('created_at', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: documentos || [],
    message: 'Documentos técnicos consultados com sucesso'
  });
}

async function consultarDivisoesHonorariosContrato(contratoId: string): Promise<NextResponse> {
  // Buscar divisões de honorários do contrato
  const { data: divisoes } = await supabase
    .from('divisao_honorarios_locacao')
    .select('*')
    .eq('contrato_locacao_id', contratoId)
    .order('data_calculo', { ascending: false });
  
  return NextResponse.json({
    success: true,
    data: divisoes || [],
    message: 'Divisões de honorários consultadas com sucesso'
  });
}
