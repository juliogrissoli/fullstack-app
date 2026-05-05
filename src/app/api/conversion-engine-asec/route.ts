// 🏛️ SECURITY BROKER SB v31 - CONVERSION ENGINE (ASEC + PATRIMONIAL)
// API de sistema operacional de conteúdo e conversão patrimonial

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ConversionEngineASECRequest {
  acao: 'processar_sequencia_asec' | 'gerar_asset_visual' | 'processar_decisao_patrimonial' | 'disparar_automacao_direct' | 'validar_gatekeeper' | 'processar_contribuicao_reino_jesus_cristo_v31' | 'consultar_configuracoes_sequencia' | 'consultar_ciclos_conteudo' | 'consultar_assets_gerados' | 'consultar_decisoes_automaticas' | 'consultar_logs_automação' | 'consultar_validacoes_gatekeeper' | 'consultar_tesouro_reino_jesus_cristo_v31';
  dados?: {
    // Dados para sequência ASEC
    lead_id?: string;
    estagio_destino?: string;
    motivo_transicao?: string;
    usuario_transicao?: string;
    
    // Dados para geração de assets
    lead_id_asset?: string;
    tipo_asset?: string;
    titulo_asset?: string;
    descricao_asset?: string;
    categoria_autoridade?: string;
    
    // Dados para decisão patrimonial
    lead_id_decisao?: string;
    dados_entrada?: any;
    modelo_decisao?: string;
    
    // Dados para automação direct
    lead_id_direct?: string;
    plataforma_direct?: string;
    mensagem_direct?: string;
    
    // Dados para validação gatekeeper
    lead_id_validacao?: string;
    tipo_validacao?: string;
    usuario_id?: string;
    
    // Dados para contribuição social
    mes_referencia?: string;
  };
}

interface ConversionEngineASECResponse {
  success: boolean;
  sequencia_processada?: {
    sucesso: boolean;
    ciclo_id: string;
    estagio_atual: string;
    estagio_anterior: string;
    progresso_ciclo: number;
    pontos_conquistados: number;
    mensagem: string;
  };
  asset_gerado?: {
    sucesso: boolean;
    asset_id: string;
    tipo_asset: string;
    titulo_asset: string;
    validacao_golden_ratio: boolean;
    score_harmonia: number;
    mensagem: string;
  };
  decisao_processada?: {
    sucesso: boolean;
    decisao_id: string;
    modelo_utilizado: string;
    decisao_automatica: string;
    probabilidade_calculada: number;
    confianca_decisao: number;
    mensagem: string;
  };
  automacao_disparada?: {
    sucesso: boolean;
    log_id: string;
    tipo_automação: string;
    plataforma: string;
    resultado_operacao: any;
    mensagem: string;
  };
  validacao_processada?: {
    sucesso: boolean;
    validacao_id: string;
    tipo_validacao: string;
    resultado_validacao: string;
    proximos_passos: string[];
    mensagem: string;
  };
  contribuicao_processada?: {
    sucesso: boolean;
    tesouro_id: string;
    mes_referencia: string;
    faturamento_bruto_total: number;
    faturamento_asec_patrimonial: number;
    faturamento_conteudo_digital: number;
    valor_contribuicao: number;
    destinacao_obras_sociais: number;
    destinacao_educacao_crista: number;
    destinacao_acao_caridade: number;
    mensagem: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ConversionEngineASECRequest = await request.json();
    const { acao, dados } = body;
    
    console.log(`🏛️ Conversion Engine ASEC: ${acao}`);
    
    let resultado;
    
    switch (acao) {
      case 'processar_sequencia_asec':
        resultado = await processarSequenciaASEC(dados);
        break;
      case 'gerar_asset_visual':
        resultado = await gerarAssetVisual(dados);
        break;
      case 'processar_decisao_patrimonial':
        resultado = await processarDecisaoPatrimonial(dados);
        break;
      case 'disparar_automacao_direct':
        resultado = await dispararAutomacaoDirect(dados);
        break;
      case 'validar_gatekeeper':
        resultado = await validarGatekeeper(dados);
        break;
      case 'processar_contribuicao_reino_jesus_cristo_v31':
        resultado = await processarContribuicaoReinoJesusCristoV31(dados);
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
    console.error('Erro no Conversion Engine ASEC:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no Conversion Engine ASEC',
      details: error.message
    }, { status: 500 });
  }
}

async function processarSequenciaASEC(dados: any): Promise<ConversionEngineASECResponse['sequencia_processada']> {
  const { lead_id, estagio_destino, motivo_transicao, usuario_transicao } = dados;
  
  // Validar dados obrigatórios
  if (!lead_id || !estagio_destino) {
    throw new Error('ID do lead e estágio destino são obrigatórios');
  }
  
  // Buscar configuração da sequência
  const { data: config, error: errorConfig } = await supabase
    .from('configuracao_sequencia_operacional')
    .select('*')
    .eq('status_config', 'ativo')
    .single();
  
  if (errorConfig || !config) {
    throw new Error('Configuração da sequência ASEC não encontrada');
  }
  
  // Verificar se estágio é válido
  const estagiosValidos = config.estagios_sequencia as string[];
  if (!estagiosValidos.includes(estagio_destino)) {
    throw new Error(`Estágio ${estagio_destino} não é válido na sequência ASEC`);
  }
  
  // Buscar ciclo atual do lead
  const { data: cicloAtual, error: errorCiclo } = await supabase
    .from('ciclo_conteudo_lead')
    .select('*')
    .eq('lead_id', lead_id)
    .eq('status_ciclo', 'ativo')
    .order('data_entrada_estagio', { ascending: false })
    .limit(1)
    .single();
  
  let estagioAnterior = null;
  let progressoAtual = 0;
  let pontosAtuais = 0;
  
  if (cicloAtual) {
    // Finalizar estágio anterior
    await supabase
      .from('ciclo_conteudo_lead')
      .update({
        data_saida_estagio: new Date().toISOString(),
        duracao_dias: Math.floor((Date.now() - new Date(cicloAtual.data_entrada_estagio).getTime()) / (1000 * 60 * 60 * 24)),
        status_ciclo: 'concluido',
        motivo_conclusao: motivo_transicao || 'Transição para próximo estágio',
        updated_at: new Date().toISOString()
      })
      .eq('id', cicloAtual.id);
    
    estagioAnterior = cicloAtual.estagio_atual;
    progressoAtual = cicloAtual.progresso_ciclo;
    pontosAtuais = cicloAtual.pontos_conquistados;
  }
  
  // Verificar trava do estágio final
  if (config.trava_estagio_final && estagio_destino === config.estagio_final_travado) {
    // Verificar se os 5 estágios anteriores foram concluídos
    const { data: estagiosConcluidos, error: errorEstagios } = await supabase
      .from('ciclo_conteudo_lead')
      .select('*')
      .eq('lead_id', lead_id)
      .eq('status_ciclo', 'concluido')
      .in('estagio_atual', estagiosValidos.filter(e => e !== config.estagio_final_travado));
    
    if (errorEstagios || !estagiosConcluidos || estagiosConcluidos.length < 5) {
      throw new Error(`Estágio ${config.estagio_final_travado} está travado. É necessário concluir os 5 estágios anteriores.`);
    }
  }
  
  // Calcular progresso e pontos do novo estágio
  const estagioConfig = config.configuracao_estagios as any;
  const estagioAtualConfig = estagioConfig[estagio_destino];
  const novoProgresso = progressoAtual + (100 / estagiosValidos.length);
  const novosPontos = pontosAtuais + estagioAtualConfig.kpi_conversao * 100;
  
  // Criar novo ciclo
  const ciclo_id = `CICLO-${Date.now()}`;
  const { data: novoCiclo, error: errorNovoCiclo } = await supabase
    .from('ciclo_conteudo_lead')
    .insert({
      ciclo_id,
      lead_id,
      estagio_atual: estagio_destino,
      estagio_anterior: estagioAnterior,
      data_entrada_estagio: new Date().toISOString(),
      progresso_ciclo: novoProgresso,
      pontos_conquistados: novosPontos,
      pontos_maximos_estagio: 100,
      status_ciclo: 'ativo'
    })
    .select('*')
    .single();
  
  if (errorNovoCiclo || !novoCiclo) {
    throw new Error(`Erro ao criar novo ciclo: ${errorNovoCiclo?.message}`);
  }
  
  return {
    sucesso: true,
    ciclo_id: novoCiclo.ciclo_id,
    estagio_atual: novoCiclo.estagio_atual,
    estagio_anterior: novoCiclo.estagio_anterior,
    progresso_ciclo: novoCiclo.progresso_ciclo,
    pontos_conquistados: novoCiclo.pontos_conquistados,
    mensagem: `Sequência ASEC processada com sucesso. Lead avançou para o estágio ${estagio_destino}`
  };
}

async function gerarAssetVisual(dados: any): Promise<ConversionEngineASECResponse['asset_gerado']> {
  const { lead_id_asset, tipo_asset, titulo_asset, descricao_asset, categoria_autoridade } = dados;
  
  // Validar dados obrigatórios
  if (!lead_id_asset || !tipo_asset || !titulo_asset) {
    throw new Error('ID do lead, tipo do asset e título são obrigatórios');
  }
  
  // Buscar configuração do motor visual
  const { data: config, error: errorConfig } = await supabase
    .from('configuracao_motor_visual')
    .select('*')
    .eq('status_config', 'ativo')
    .single();
  
  if (errorConfig || !config) {
    throw new Error('Configuração do motor visual não encontrada');
  }
  
  // Gerar asset com IA Yara
  const asset_id = `ASSET-${Date.now()}`;
  const prompt_geracao = `Gerar ${tipo_asset} com título "${titulo_asset}" e descrição "${descricao_asset || ''}" usando paleta de autoridade SB`;
  
  // Simulação de geração (integrar com IA real)
  const conteudo_gerado = `Conteúdo gerado pela IA Yara para ${tipo_asset}: ${titulo_asset}`;
  const score_qualidade = 85.5 + Math.random() * 10; // Simulação
  const validacao_golden_ratio = score_qualidade > 90; // Simulação
  const score_harmonia = validacao_golden_ratio ? 92.3 : 78.5; // Simulação
  
  // Inserir asset gerado
  const { data: asset, error: errorAsset } = await supabase
    .from('assets_gerados_ia')
    .insert({
      asset_id,
      lead_id: lead_id_asset,
      tipo_asset,
      titulo_asset,
      descricao_asset,
      categoria_autoridade: categoria_autoridade || 'padrao',
      conteudo_gerado,
      prompt_geracao,
      modelo_ia_utilizado: 'yara-vision',
      parametros_geracao: {
        paleta_autoridade: config.paleta_autoridade,
        layout_responsivo: config.layout_responsivo,
        acessibilidade: config.acessibilidade
      },
      score_qualidade,
      validacao_golden_ratio,
      score_harmonia,
      status_asset: 'gerado',
      data_geracao: new Date().toISOString()
    })
    .select('*')
    .single();
  
  if (errorAsset || !asset) {
    throw new Error(`Erro ao gerar asset: ${errorAsset?.message}`);
  }
  
  return {
    sucesso: true,
    asset_id: asset.asset_id,
    tipo_asset: asset.tipo_asset,
    titulo_asset: asset.titulo_asset,
    validacao_golden_ratio: asset.validacao_golden_ratio,
    score_harmonia: asset.score_harmonia,
    mensagem: `Asset visual gerado com sucesso usando motor Golden Ratio`
  };
}

async function processarDecisaoPatrimonial(dados: any): Promise<ConversionEngineASECResponse['decisao_processada']> {
  const { lead_id_decisao, dados_entrada, modelo_decisao } = dados;
  
  // Validar dados obrigatórios
  if (!lead_id_decisao || !dados_entrada) {
    throw new Error('ID do lead e dados de entrada são obrigatórios');
  }
  
  // Buscar configuração da engenharia de decisão
  const { data: config, error: errorConfig } = await supabase
    .from('configuracao_engenharia_decisao')
    .select('*')
    .eq('status_config', 'ativo')
    .single();
  
  if (errorConfig || !config) {
    throw new Error('Configuração da engenharia de decisão não encontrada');
  }
  
  // Aplicar substituição de termos
  const termos_substituicao = config.termos_substituicao as any;
  let dadosProcessados = { ...dados_entrada };
  
  if (termos_substituicao.venda_imoveis?.enabled) {
    termos_substituicao.venda_imoveis.termos_originais.forEach((termo: string, index: number) => {
      const novoTermo = termos_substituicao.venda_imoveis.termos_novos[index];
      dadosProcessados = JSON.parse(
        JSON.stringify(dadosProcessados).replace(new RegExp(termo, 'gi'), novoTermo)
      );
    });
  }
  
  // Simulação de processamento de decisão
  const modeloSelecionado = modelo_decisao || 'ensemble_voting';
  const probabilidadeCalculada = 0.75 + Math.random() * 0.2; // Simulação
  const confiancaDecisao = 0.80 + Math.random() * 0.15; // Simulação
  
  // Determinar decisão automática
  let decisaoAutomatica = 'aguardar';
  if (probabilidadeCalculada > 0.85) {
    decisaoAutomatica = 'aprovar';
  } else if (probabilidadeCalculada < 0.6) {
    decisaoAutomatica = 'rejeitar';
  } else {
    decisaoAutomatica = 'encaminhar';
  }
  
  // Inserir histórico de decisão
  const decisao_id = `DEC-${Date.now()}`;
  const { data: decisao, error: errorDecisao } = await supabase
    .from('historico_decisoes_automaticas')
    .insert({
      decisao_id,
      lead_id: lead_id_decisao,
      modelo_utilizado: modeloSelecionado,
      dados_entrada: dadosProcessados,
      features_analisadas: {
        renda: dadosProcessados.renda,
        idade: dadosProcessados.idade,
        patrimonio: dadosProcessados.patrimonio,
        score_ciclo: dadosProcessados.score_ciclo,
        engajamento: dadosProcessados.engajamento
      },
      probabilidadeCalculada,
      confiancaDecisao,
      decisao_automatica: decisaoAutomatica,
      justificativa_decisao: `Decisão automática baseada em modelo ${modeloSelecionado} com probabilidade ${(probabilidadeCalculada * 100).toFixed(2)}%`,
      parametros_decisao: (config.parametros_modelos as any)[modeloSelecionado],
      resultado_decisao: 'pendente',
      tempo_processamento_ms: Math.floor(Math.random() * 100) + 50, // Simulação
      custo_processamento: 0.0001,
      status_decisao: 'concluida',
      data_inicio: new Date().toISOString(),
      data_conclusao: new Date().toISOString()
    })
    .select('*')
    .single();
  
  if (errorDecisao || !decisao) {
    throw new Error(`Erro ao processar decisão: ${errorDecisao?.message}`);
  }
  
  return {
    sucesso: true,
    decisao_id: decisao.decisao_id,
    modelo_utilizado: decisao.modelo_utilizado,
    decisao_automatica: decisao.decisao_automatica,
    probabilidade_calculada: decisao.probabilidade_calculada,
    confianca_decisao: decisao.confianca_decisao,
    mensagem: `Decisão patrimonial processada com sucesso. Resultado: ${decisaoAutomatica}`
  };
}

async function dispararAutomacaoDirect(dados: any): Promise<ConversionEngineASECResponse['automacao_disparada']> {
  const { lead_id_direct, plataforma_direct, mensagem_direct } = dados;
  
  // Validar dados obrigatórios
  if (!lead_id_direct || !plataforma_direct) {
    throw new Error('ID do lead e plataforma são obrigatórios');
  }
  
  // Buscar configuração de automação
  const { data: config, error: errorConfig } = await supabase
    .from('configuracao_automação')
    .select('*')
    .eq('status_config', 'ativo')
    .single();
  
  if (errorConfig || !config) {
    throw new Error('Configuração de automação não encontrada');
  }
  
  // Verificar se plataforma está habilitada
  const plataformasHabilitadas = config.edge_functions_habilitadas as string[];
  if (!plataformasHabilitadas.includes('direct_disparo')) {
    throw new Error('Direct disparo não está habilitado na configuração');
  }
  
  // Simulação de disparo
  const configDirect = (config.config_direct as any)[plataforma_direct];
  if (!configDirect?.enabled) {
    throw new Error(`Plataforma ${plataforma_direct} não está habilitada`);
  }
  
  const resultadoOperacao = {
    mensagem_enviada: mensagem_direct || 'Mensagem automática do SB',
    plataforma: plataforma_direct,
    business_account: configDirect.business_account,
    timestamp_envio: new Date().toISOString(),
    status_envio: 'enviado',
    id_mensagem: `MSG-${Date.now()}`
  };
  
  // Inserir log de automação
  const log_id = `LOG-${Date.now()}`;
  const { data: log, error: errorLog } = await supabase
    .from('logs_automação')
    .insert({
      log_id,
      config_id: config.id,
      tipo_automação: 'direct_disparo',
      origem_automação: 'edge_function',
      lead_id: lead_id_direct,
      dados_entrada: {
        plataforma: plataforma_direct,
        mensagem: mensagem_direct
      },
      resultado_operacao: resultadoOperacao,
      status_operacao: 'sucesso',
      tempo_execucao_ms: Math.floor(Math.random() * 200) + 100, // Simulação
      custo_operacional: 0.0001,
      tokens_utilizados: Math.floor(Math.random() * 50) + 10, // Simulação
      data_inicio: new Date().toISOString(),
      data_conclusao: new Date().toISOString(),
      status_log: 'concluido'
    })
    .select('*')
    .single();
  
  if (errorLog || !log) {
    throw new Error(`Erro ao registrar log de automação: ${errorLog?.message}`);
  }
  
  return {
    sucesso: true,
    log_id: log.log_id,
    tipo_automação: log.tipo_automação,
    plataforma: plataforma_direct,
    resultado_operacao: log.resultado_operacao,
    mensagem: `Automação direct disparada com sucesso para ${plataforma_direct}`
  };
}

async function validarGatekeeper(dados: any): Promise<ConversionEngineASECResponse['validacao_processada']> {
  const { lead_id_validacao, tipo_validacao, usuario_id } = dados;
  
  // Validar dados obrigatórios
  if (!lead_id_validacao || !tipo_validacao) {
    throw new Error('ID do lead e tipo de validação são obrigatórios');
  }
  
  // Buscar configuração do gatekeeper
  const { data: config, error: errorConfig } = await supabase
    .from('configuracao_gatekeeper')
    .select('*')
    .eq('status_config', 'ativo')
    .single();
  
  if (errorConfig || !config) {
    throw new Error('Configuração do gatekeeper não encontrada');
  }
  
  // Buscar ciclo atual do lead
  const { data: ciclo, error: errorCiclo } = await supabase
    .from('ciclo_conteudo_lead')
    .select('*')
    .eq('lead_id', lead_id_validacao)
    .eq('status_ciclo', 'ativo')
    .single();
  
  if (errorCiclo || !ciclo) {
    throw new Error('Ciclo ativo do lead não encontrado');
  }
  
  // Aplicar regras de validação
  const regrasValidacao = config.regras_validacao as any;
  const regraValidacao = regrasValidacao[tipo_validacao];
  
  if (!regraValidacao?.enabled) {
    throw new Error(`Tipo de validação ${tipo_validacao} não está habilitado`);
  }
  
  let resultadoValidacao = 'aprovado';
  let detalhesValidacao: any = {};
  let proximosPassos: string[] = [];
  
  // Simulação de validação baseada no tipo
  switch (tipo_validacao) {
    case 'gera_conexao':
      if (ciclo.interacoes_registradas < regraValidacao.min_interacoes) {
        resultadoValidacao = 'rejeitado';
        detalhesValidacao.erro = `Mínimo de ${regraValidacao.min_interacoes} interações não atingido`;
      } else if (ciclo.engajamento_medio < regraValidacao.min_engajamento) {
        resultadoValidacao = 'rejeitado';
        detalhesValidacao.erro = `Engajamento médio abaixo de ${regraValidacao.min_engajamento}%`;
      }
      proximosPassos = resultadoValidacao === 'aprovado' ? ['iniciar_conversa', 'agendar_reuniao'] : ['aumentar_interacoes', 'melhorar_engajamento'];
      break;
      
    case 'tomada_decisao':
      if (ciclo.progresso_ciclo < regraValidacao.min_score_ciclo) {
        resultadoValidacao = 'rejeitado';
        detalhesValidacao.erro = `Score do ciclo abaixo de ${regraValidacao.min_score_ciclo}%`;
      }
      proximosPassos = resultadoValidacao === 'aprovado' ? ['apresentar_proposta', 'iniciar_negociacao'] : ['continuar_nutricao', 'aguardar_maturacao'];
      break;
      
    case 'conversao_imovel':
      // Simulação de validação de conversão
      resultadoValidacao = Math.random() > 0.3 ? 'aprovado' : 'rejeitado';
      proximosPassos = resultadoValidacao === 'aprovado' ? ['gerar_contrato', 'iniciar_financiamento'] : ['reavaliar_proposta', 'oferecer_alternativas'];
      break;
  }
  
  // Inserir log de validação
  const validacao_id = `VAL-${Date.now()}`;
  const { data: validacao, error: errorValidacao } = await supabase
    .from('logs_validacao_gatekeeper')
    .insert({
      validacao_id,
      config_id: config.id,
      lead_id: lead_id_validacao,
      usuario_id: usuario_id || null,
      tipo_validacao,
      resultadoValidacao,
      detalhesValidacao,
      proximosPassos,
      iteracao_atual: 0,
      data_validacao: new Date().toISOString(),
      status_validacao: 'concluida'
    })
    .select('*')
    .single();
  
  if (errorValidacao || !validacao) {
    throw new Error(`Erro ao registrar validação: ${errorValidacao?.message}`);
  }
  
  // Se rejeitado, agendar próxima validação (loop de refinamento)
  if (resultadoValidacao === 'rejeitado' && (config.config_loop as any).refinamento_automatico) {
    const dataProximaValidacao = new Date();
    dataProximaValidacao.setDate(dataProximaValidacao.getDate() + 7); // 7 dias depois
    
    await supabase
      .from('logs_validacao_gatekeeper')
      .update({
        data_proxima_validacao: dataProximaValidacao.toISOString(),
        feedback_recebido: 'aguardando_melhorias',
        updated_at: new Date().toISOString()
      })
      .eq('id', validacao.id);
  }
  
  return {
    sucesso: true,
    validacao_id: validacao.validacao_id,
    tipo_validacao: validacao.tipo_validacao,
    resultado_validacao: validacao.resultado_validacao,
    proximos_passos: validacao.proximos_passos,
    mensagem: `Validação ${tipo_validacao} processada com sucesso. Resultado: ${resultadoValidacao}`
  };
}

async function processarContribuicaoReinoJesusCristoV31(dados: any): Promise<ConversionEngineASECResponse['contribuicao_processada']> {
  const { mes_referencia } = dados;
  
  // Processar contribuição social V31 via função RPC (simulação)
  const mesRef = mes_referencia || new Date().toISOString().split('T')[0];
  
  // Simulação de dados do mês
  const dadosTesouro = {
    mes_referencia: mesRef,
    faturamento_venda_match: 150000.00,
    faturamento_recorrencia_5x5: 85000.00,
    faturamento_short_stay: 45000.00,
    faturamento_administracao: 35000.00,
    faturamento_marketplace_servicos: 25000.00,
    faturamento_land_banking: 180000.00,
    faturamento_equity_fundo: 95000.00,
    faturamento_selo_juris: 15000.00,
    faturamento_data_sub: 22000.00,
    faturamento_antecipacao: 12000.00,
    faturamento_seguros: 28000.00,
    faturamento_financiamento_bancario: 75000.00,
    faturamento_prestadores_servicos: 75000.00,
    faturamento_taxa_conveniencia: 8500.00,
    faturamento_economia_tokens: 12000.00,
    faturamento_asec_patrimonial: 45000.00, // NOVO
    faturamento_conteudo_digital: 25000.00, // NOVO
    status_contribuicao: 'provisionado',
    data_calculo: new Date().toISOString().split('T')[0],
    data_provisionamento: new Date().toISOString().split('T')[0],
    destinacao_igrejas_locais: 25000.00,
    destinacao_obra_missionaria: 20000.00,
    destinacao_ajuda_desamparados: 15000.00,
    destinacao_evangelizacao: 10000.00,
    destinacao_acao_social: 10000.00,
    destinacao_capacitacao_prestadores: 5000.00,
    destinacao_tecnologia_social: 5000.00,
    destinacao_obras_sociais: 3000.00, // NOVO
    destinacao_educacao_crista: 2000.00, // NOVO
    destinacao_acao_caridade: 2000.00 // NOVO
  };
  
  // Inserir tesouro V31
  const { data: tesouro, error: errorTesouro } = await supabase
    .from('tesouro_reino_jesus_cristo_v31')
    .insert(dadosTesouro)
    .select('*')
    .single();
  
  if (errorTesouro || !tesouro) {
    throw new Error(`Erro ao processar contribuição social V31: ${errorTesouro?.message}`);
  }
  
  return {
    sucesso: true,
    tesouro_id: tesouro.id,
    mes_referencia: tesouro.mes_referencia,
    faturamento_bruto_total: tesouro.faturamento_bruto_total,
    faturamento_asec_patrimonial: tesouro.faturamento_asec_patrimonial,
    faturamento_conteudo_digital: tesouro.faturamento_conteudo_digital,
    valor_contribuicao: tesouro.valor_contribuicao,
    destinacao_obras_sociais: tesouro.destinacao_obras_sociais,
    destinacao_educacao_crista: tesouro.destinacao_educacao_crista,
    destinacao_acao_caridade: tesouro.destinacao_acao_caridade,
    mensagem: 'Contribuição social Reino Jesus Cristo V31 processada com sucesso'
  };
}

// Endpoint para consultas específicas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const lead_id = searchParams.get('lead_id');
    const estagio = searchParams.get('estagio');
    const mes_referencia = searchParams.get('mes_referencia');
    
    if (tipo === 'configuracoes_sequencia') {
      return await consultarConfiguracoesSequencia();
    }
    
    if (tipo === 'ciclos_conteudo' && lead_id) {
      return await consultarCiclosConteudo(lead_id);
    }
    
    if (tipo === 'assets_gerados' && lead_id) {
      return await consultarAssetsGerados(lead_id);
    }
    
    if (tipo === 'decisoes_automaticas' && lead_id) {
      return await consultarDecisoesAutomaticas(lead_id);
    }
    
    if (tipo === 'logs_automação') {
      return await consultarLogsAutomacao();
    }
    
    if (tipo === 'validacoes_gatekeeper' && lead_id) {
      return await consultarValidacoesGatekeeper(lead_id);
    }
    
    if (tipo === 'tesouro_reino_jesus_cristo_v31') {
      return await consultarTesouroReinoJesusCristoV31(mes_referencia || undefined);
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

async function consultarConfiguracoesSequencia(): Promise<NextResponse> {
  const { data: configuracoes, error } = await supabase
    .from('configuracao_sequencia_operacional')
    .select('*')
    .eq('status_config', 'ativo')
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Erro ao consultar configurações da sequência: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: configuracoes || [],
    message: 'Configurações da sequência ASEC consultadas com sucesso'
  });
}

async function consultarCiclosConteudo(leadId: string): Promise<NextResponse> {
  const { data: ciclos, error } = await supabase
    .from('ciclo_conteudo_lead')
    .select('*')
    .eq('lead_id', leadId)
    .order('data_entrada_estagio', { ascending: false })
    .limit(20);
  
  if (error) {
    throw new Error(`Erro ao consultar ciclos de conteúdo: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: ciclos || [],
    message: 'Ciclos de conteúdo consultados com sucesso'
  });
}

async function consultarAssetsGerados(leadId: string): Promise<NextResponse> {
  const { data: assets, error } = await supabase
    .from('assets_gerados_ia')
    .select('*')
    .eq('lead_id', leadId)
    .order('data_geracao', { ascending: false })
    .limit(50);
  
  if (error) {
    throw new Error(`Erro ao consultar assets gerados: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: assets || [],
    message: 'Assets gerados consultados com sucesso'
  });
}

async function consultarDecisoesAutomaticas(leadId: string): Promise<NextResponse> {
  const { data: decisoes, error } = await supabase
    .from('historico_decisoes_automaticas')
    .select('*')
    .eq('lead_id', leadId)
    .order('data_inicio', { ascending: false })
    .limit(30);
  
  if (error) {
    throw new Error(`Erro ao consultar decisões automáticas: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: decisoes || [],
    message: 'Decisões automáticas consultadas com sucesso'
  });
}

async function consultarLogsAutomacao(): Promise<NextResponse> {
  const { data: logs, error } = await supabase
    .from('logs_automação')
    .select('*')
    .order('data_inicio', { ascending: false })
    .limit(100);
  
  if (error) {
    throw new Error(`Erro ao consultar logs de automação: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: logs || [],
    message: 'Logs de automação consultados com sucesso'
  });
}

async function consultarValidacoesGatekeeper(leadId: string): Promise<NextResponse> {
  const { data: validacoes, error } = await supabase
    .from('logs_validacao_gatekeeper')
    .select('*')
    .eq('lead_id', leadId)
    .order('data_validacao', { ascending: false })
    .limit(50);
  
  if (error) {
    throw new Error(`Erro ao consultar validações do gatekeeper: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: validacoes || [],
    message: 'Validações do gatekeeper consultadas com sucesso'
  });
}

async function consultarTesouroReinoJesusCristoV31(mesReferencia?: string): Promise<NextResponse> {
  let query = supabase.from('tesouro_reino_jesus_cristo_v31').select('*');
  
  if (mesReferencia) {
    query = query.eq('mes_referencia', mesReferencia);
  }
  
  const { data: tesouro, error } = await query
    .order('mes_referencia', { ascending: false })
    .limit(12);
  
  if (error) {
    throw new Error(`Erro ao consultar tesouro Reino Jesus Cristo V31: ${error.message}`);
  }
  
  return NextResponse.json({
    success: true,
    data: tesouro || [],
    message: 'Tesouro Reino Jesus Cristo V31 consultado com sucesso'
  });
}
