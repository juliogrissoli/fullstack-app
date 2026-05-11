// 🏛️ SECURITY BROKER SB v13 - YARA IA
// Sistema de qualificação de leads sob o 'Guarda-Chuva' da incorporadora

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

interface LeadQualificationRequest {
  lead_id: string;
  incorporadora_id: string;
  dados_cliente: {
    nome: string;
    email: string;
    telefone: string;
    cpf: string;
    renda_mensal: number;
    profissao: string;
    data_nascimento: string;
    endereco?: string;
    interesses?: string[];
  };
  empreendimento_id?: string;
  unidade_desejada?: string;
}

interface YaraAnalysisResult {
  score_qualificacao: number; // 0-100
  probabilidade_conversao: number; // 0-100%
  perfil_comportamental: {
    perfil: string;
    caracteristicas: string[];
    nivel_interesse: string;
    capacidade_compra: string;
    urgencia: string;
  };
  recomendacoes: {
    proximos_passos: string[];
    abordagem_recomendada: string;
    produtos_sugeridos: string[];
    alertas: string[];
  };
  status: 'qualificado' | 'em_analise' | 'rejeitado';
  confianca: number; // 0-100%
}

export async function POST(request: NextRequest) {
  try {
    const body: LeadQualificationRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!body.lead_id || !body.incorporadora_id || !body.dados_cliente) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      }, { status: 400 });
    }

    // Executar análise Yara IA
    const resultado = await analisarLeadYaraIA(body);
    
    // Salvar resultado no banco
    await salvarAnaliseYara(body.lead_id, resultado);
    
    // Criar ações automáticas baseadas no resultado
    await executarAcoesAutomaticas(body, resultado);
    
    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Análise Yara IA concluída com sucesso'
    });

  } catch (error: any) {
    console.error('Erro na análise Yara IA:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno na análise Yara IA',
      details: error.message
    }, { status: 500 });
  }
}

async function analisarLeadYaraIA(request: LeadQualificationRequest): Promise<YaraAnalysisResult> {
  const { dados_cliente, incorporadora_id } = request;
  
  // Calcular score de qualificação baseado em múltiplos fatores
  let scoreQualificacao = 0;
  const fatores: string[] = [];
  
  // 1. Capacidade de compra (renda vs preço médio)
  const rendaAnual = dados_cliente.renda_mensal * 12;
  const precoMedioEmpreendimento = await getPrecoMedioEmpreendimento(incorporadora_id);
  const capacidadeCompra = (rendaAnual * 0.3) / precoMedioEmpreendimento; // 30% da renda anual
  
  if (capacidadeCompra >= 1) {
    scoreQualificacao += 30;
    fatores.push('Capacidade de compra adequada');
  } else if (capacidadeCompra >= 0.7) {
    scoreQualificacao += 20;
    fatores.push('Capacidade de compra razoável');
  } else {
    fatores.push('Capacidade de compra limitada');
  }
  
  // 2. Idade e perfil de investimento
  const idade = calcularIdade(dados_cliente.data_nascimento);
  if (idade >= 25 && idade <= 55) {
    scoreQualificacao += 20;
    fatores.push('Faixa etária ideal');
  } else if (idade >= 18 && idade <= 65) {
    scoreQualificacao += 10;
    fatores.push('Faixa etária aceitável');
  }
  
  // 3. Profissão e estabilidade
  const profissoesEstaveis = [
    'engenheiro', 'médico', 'advogado', 'arquiteto', 'administrador',
    'gerente', 'diretor', 'empresário', 'contador', 'professor'
  ];
  
  if (profissoesEstaveis.some(p => dados_cliente.profissao.toLowerCase().includes(p))) {
    scoreQualificacao += 15;
    fatores.push('Profissão estável');
  }
  
  // 4. Contato e engajamento
  if (dados_cliente.email && dados_cliente.telefone) {
    scoreQualificacao += 10;
    fatores.push('Contato completo');
  }
  
  // 5. Histórico de interesse
  if (dados_cliente.interesses && dados_cliente.interesses.length > 0) {
    scoreQualificacao += 10;
    fatores.push('Interesses específicos');
  }
  
  // 6. Localização (se fornecida)
  if (dados_cliente.endereco) {
    scoreQualificacao += 5;
    fatores.push('Endereço fornecido');
  }
  
  // Calcular probabilidade de conversão
  const probabilidadeConversao = Math.min(scoreQualificacao + Math.random() * 20, 95);
  
  // Determinar perfil comportamental
  const perfil = determinarPerfilComportamental(scoreQualificacao, dados_cliente);
  
  // Gerar recomendações
  const recomendacoes = gerarRecomendacoes(scoreQualificacao, perfil, dados_cliente);
  
  // Determinar status final
  let status: 'qualificado' | 'em_analise' | 'rejeitado';
  if (scoreQualificacao >= 70) {
    status = 'qualificado';
  } else if (scoreQualificacao >= 40) {
    status = 'em_analise';
  } else {
    status = 'rejeitado';
  }
  
  return {
    score_qualificacao: scoreQualificacao,
    probabilidade_conversao: probabilidadeConversao,
    perfil_comportamental: perfil,
    recomendacoes: recomendacoes,
    status,
    confianca: Math.min(scoreQualificacao + 10, 100)
  };
}

async function getPrecoMedioEmpreendimento(incorporadora_id: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('empreendimentos')
      .select('valor_medio_unidade')
      .eq('incorporadora_id', incorporadora_id)
      .eq('status', 'lancamento')
      .limit(1)
      .single();
    
    if (error || !data) {
      return 500000; // Valor padrão R$ 500.000
    }
    
    return data.valor_medio_unidade || 500000;
  } catch {
    return 500000;
  }
}

function calcularIdade(dataNascimento: string): number {
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  
  return idade;
}

function determinarPerfilComportamental(score: number, dados: any): any {
  let perfil = 'Padrão';
  let caracteristicas: string[] = [];
  let nivelInteresse = 'Médio';
  let capacidadeCompra = 'Limitada';
  let urgencia = 'Baixa';
  
  // Determinar perfil baseado no score e características
  if (score >= 80) {
    perfil = 'Investidor Qualificado';
    caracteristicas = ['Alta capacidade financeira', 'Decisão rápida', 'Exigente com qualidade'];
    nivelInteresse = 'Alto';
    capacidadeCompra = 'Alta';
    urgencia = 'Média';
  } else if (score >= 60) {
    perfil = 'Comprador Sério';
    caracteristicas = ['Boa capacidade financeira', 'Pesquisador', 'Cauteloso'];
    nivelInteresse = 'Alto';
    capacidadeCompra = 'Boa';
    urgencia = 'Média';
  } else if (score >= 40) {
    perfil = 'Interessado em Potencial';
    caracteristicas = ['Capacidade moderada', 'Em pesquisa', 'Precisa de orientação'];
    nivelInteresse = 'Médio';
    capacidadeCompra = 'Moderada';
    urgencia = 'Baixa';
  } else {
    perfil = 'Curioso/Observador';
    caracteristicas = ['Capacidade limitada', 'Iniciante', 'Necessita qualificação'];
    nivelInteresse = 'Baixo';
    capacidadeCompra = 'Limitada';
    urgencia = 'Muito Baixa';
  }
  
  // Ajustar baseado em dados específicos
  if (dados.profissao.toLowerCase().includes('investidor') || 
      dados.profissao.toLowerCase().includes('empresário')) {
    caracteristicas.push('Perfil de investidor');
    urgencia = 'Alta';
  }
  
  if (dados.intereses && dados.intereses.includes('investimento')) {
    nivelInteresse = 'Alto';
    caracteristicas.push('Foco em investimento');
  }
  
  return {
    perfil,
    caracteristicas,
    nivel_interesse: nivelInteresse,
    capacidade_compra: capacidadeCompra,
    urgencia
  };
}

function gerarRecomendacoes(score: number, perfil: any, dados: any): any {
  const proximosPassos: string[] = [];
  let abordagemRecomendada: string = '';
  const produtosSugeridos: string[] = [];
  const alertas: string[] = [];
  
  if (score >= 80) {
    proximosPassos.push('Agendar visita imediata');
    proximosPassos.push('Apresentar unidades premium');
    proximosPassos.push('Iniciar processo de análise de crédito');
    
    abordagemRecomendada = 'Abordagem consultiva e exclusiva';
    
    produtosSugeridos.push('Unidades de alto padrão');
    produtosSugeridos.push('Opções de investimento');
    produtosSugeridos.push('Financiamento personalizado');
    
  } else if (score >= 60) {
    proximosPassos.push('Enviar material detalhado');
    proximosPassos.push('Agendar visita técnica');
    proximosPassos.push('Simular financiamento');
    
    abordagemRecomendada = 'Abordagem informativa e persuasiva';
    
    produtosSugeridos.push('Unidades padrão');
    produtosSugeridos.push('Opções de financiamento');
    
  } else if (score >= 40) {
    proximosPassos.push('Qualificar melhor o cliente');
    proximosPassos.push('Enviar material educativo');
    proximosPassos.push('Agendar conversa exploratória');
    
    abordagemRecomendada = 'Abordagem educativa e paciente';
    
    produtosSugeridos.push('Unidades de entrada');
    produtosSugeridos.push('Planos de parcelamento');
    
  } else {
    proximosPassos.push('Coletar mais informações');
    proximosPassos.push('Enviar material básico');
    proximosPassos.push('Manter em nutrição');
    
    abordagemRecomendada = 'Abordagem de nutrição de longo prazo';
    
    produtosSugeridos.push('Informações gerais');
    produtosSugeridos.push('Newsletter e atualizações');
  }
  
  // Gerar alertas específicos
  if (dados.renda_mensal < 5000) {
    alertas.push('Renda abaixo do mínimo para financiamento convencional');
  }
  
  if (calcularIdade(dados.data_nascimento) > 60) {
    alertas.push('Idade pode limitar opções de financiamento');
  }
  
  if (!dados.email || !dados.telefone) {
    alertas.push('Informações de contato incompletas');
  }
  
  return {
    proximos_passos: proximosPassos,
    abordagem_recomendada: abordagemRecomendada,
    produtos_sugeridos: produtosSugeridos,
    alertas
  };
}

async function salvarAnaliseYara(leadId: string, resultado: YaraAnalysisResult): Promise<void> {
  try {
    await supabase
      .from('yara_ia_analises')
      .insert({
        lead_id: leadId,
        score_qualificacao: resultado.score_qualificacao,
        probabilidade_conversao: resultado.probabilidade_conversao,
        perfil_comportamental: resultado.perfil_comportamental,
        recomendacoes: resultado.recomendacoes,
        status: resultado.status,
        modelo_versao: 'v1.0'
      });
  } catch (error) {
    console.error('Erro ao salvar análise Yara:', error);
    throw error;
  }
}

async function executarAcoesAutomaticas(request: LeadQualificationRequest, resultado: YaraAnalysisResult): Promise<void> {
  try {
    // 1. Atualizar status do lead baseado na qualificação
    let novoStatusLead = 'novo';
    if (resultado.status === 'qualificado') {
      novoStatusLead = 'qualificado';
    } else if (resultado.status === 'em_analise') {
      novoStatusLead = 'em_analise';
    } else {
      novoStatusLead = 'rejeitado';
    }
    
    await supabase
      .from('leads')
      .update({ 
        status: novoStatusLead,
        origem: 'yara_ia'
      })
      .eq('id', request.lead_id);
    
    // 2. Criar notificações para o broker
    const { data: pasta } = await supabase
      .from('pastas_documentos')
      .select('broker_id')
      .eq('lead_id', request.lead_id)
      .single();
    
    if (pasta) {
      await supabase
        .from('notificacoes')
        .insert({
          broker_id: pasta.broker_id,
          lead_id: request.lead_id,
          tipo: 'info',
          titulo: 'Análise Yara IA Concluída',
          mensagem: `Lead analisado com score ${resultado.score_qualificacao}/100. Status: ${resultado.status.toUpperCase()}. Perfil: ${resultado.perfil_comportamental.perfil}.`,
          status: 'nao_lida'
        });
    }
    
    // 3. Se qualificado, criar pasta de documentos automaticamente
    if (resultado.status === 'qualificado') {
      const { data: pastaExistente } = await supabase
        .from('pastas_documentos')
        .select('id')
        .eq('lead_id', request.lead_id)
        .single();
      
      if (!pastaExistente) {
        await supabase
          .from('pastas_documentos')
          .insert({
            lead_id: request.lead_id,
            broker_id: pasta?.broker_id,
            status: 'iniciada',
            progresso_percentual: 0
          });
      }
    }
    
    // 4. Adicionar à lista de prioridade se score alto
    if (resultado.score_qualificacao >= 80) {
      await supabase
        .from('notificacoes')
        .insert({
          broker_id: pasta?.broker_id,
          lead_id: request.lead_id,
          tipo: 'alerta',
          titulo: 'Lead de Alta Prioridade',
          mensagem: `Lead com score ${resultado.score_qualificacao}/100 identificado como alta prioridade. Probabilidade de conversão: ${resultado.probabilidade_conversao.toFixed(1)}%.`,
          status: 'nao_lida'
        });
    }
    
  } catch (error) {
    console.error('Erro ao executar ações automáticas:', error);
    throw error;
  }
}

// Endpoint para obter análises de um lead
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
    
    const { data, error } = await supabase
      .from('yara_ia_analises')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Análise não encontrada'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data
    });
    
  } catch (error: any) {
    console.error('Erro ao buscar análise Yara:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao buscar análise',
      details: error.message
    }, { status: 500 });
  }
}
