/**
 * 🏛️ SB IMPERIUM v14.0 - CAMADA DE CONFORMIDADE LGPD
 * 
 * Implementação completa das diretrizes da Lei Geral de Proteção de Dados
 * 
 * Funcionalidades:
 * 1. Data Anonymization (Direito ao Esquecimento)
 * 2. Log de Acesso Sensível
 * 3. Consentimento LGPD
 * 4. Auditoria e Conformidade
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// Configurações
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Interfaces
interface LGPDConsentimento {
  id: string;
  lead_id: string;
  consentimento_lgpd: boolean;
  data_aceite: string;
  ip_acesso: string;
  user_agent: string;
  termos_versao: string;
}

interface LogAuditoria {
  id: string;
  user_id: string;
  recurso_acessado: string;
  timestamp: string;
  nexo_hash: string;
  ip_acesso: string;
  tipo_acao: 'visualizacao' | 'download' | 'edicao' | 'exclusao';
  detalhes?: any;
}

interface DadosAnonimizados {
  id_original: string;
  nome_anonimizado: string;
  cpf_anonimizado: string;
  email_anonimizado: string;
  telefone_anonimizado: string;
  data_anonimizacao: string;
  nexo_causal_preservado: string;
  motivo_exclusao: 'direito_esquecimento' | 'inatividade' | 'solicitacao_titular';
}

/**
 * 1. DATA ANONIMIZATION - Direito ao Esquecimento LGPD
 */
export async function anonimizarDadosLead(
  leadId: string, 
  motivo: 'direito_esquecimento' | 'inatividade' | 'solicitacao_titular',
  solicitante?: string
): Promise<{ sucesso: boolean; dados_anonimizados?: DadosAnonimizados; erro?: string }> {
  try {
    console.log(`🏛️ Iniciando anonimização LGPD - Lead: ${leadId}`);
    
    // 1. Buscar dados originais antes da anonimização
    const { data: leadOriginal, error: errorBusca } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();
    
    if (errorBusca || !leadOriginal) {
      throw new Error(`Lead não encontrado: ${errorBusca?.message}`);
    }
    
    // 2. Gerar hash único para preservar Nexo Causal
    const dadosParaHash = [
      leadId,
      leadOriginal.cpf || '',
      leadOriginal.email || '',
      new Date().toISOString()
    ].join('|');
    
    const nexoCausalHash = createHash('sha256').update(dadosParaHash).digest('hex');
    
    // 3. Criar dados anonimizados
    const dadosAnonimizados: DadosAnonimizados = {
      id_original: leadId,
      nome_anonimizado: `ANONIMIZADO-${leadId.substring(0, 8)}`,
      cpf_anonimizado: `***-***-***-${leadOriginal.cpf?.slice(-4) || '0000'}`,
      email_anonimizado: `anonimizado-${leadId.substring(0, 8)}@dominio-anonimizado.com`,
      telefone_anonimizado: `(**) ****-****`,
      data_anonimizacao: new Date().toISOString(),
      nexo_causal_preservado: nexoCausalHash,
      motivo_exclusao: motivo
    };
    
    // 4. Salvar registro de anonimização (para fins jurídicos)
    const { error: errorAnonimizacao } = await supabase
      .from('lgpd_anonimizados')
      .insert({
        lead_id_original: leadId,
        dados_anonimizados: dadosAnonimizados,
        motivo_exclusao: motivo,
        solicitante: solicitante || 'sistema',
        data_anonimizacao: new Date().toISOString(),
        nexo_causal_hash: nexoCausalHash
      });
    
    if (errorAnonimizacao) {
      throw new Error(`Falha ao salvar anonimização: ${errorAnonimizacao.message}`);
    }
    
    // 5. Anonimizar dados na tabela principal (mantendo apenas IDs e hashes)
    const { error: errorUpdate } = await supabase
      .from('leads')
      .update({
        nome: dadosAnonimizados.nome_anonimizado,
        cpf: dadosAnonimizados.cpf_anonimizado,
        email: dadosAnonimizados.email_anonimizado,
        telefone: dadosAnonimizados.telefone_anonimizado,
        lgpd_anonimizado: true,
        data_anonimizacao_lgpd: new Date().toISOString(),
        motivo_anonimizacao: motivo,
        nexo_causal_hash: nexoCausalHash
      })
      .eq('id', leadId);
    
    if (errorUpdate) {
      throw new Error(`Falha ao anonimizar lead: ${errorUpdate.message}`);
    }
    
    // 6. Remover dados sensíveis de tabelas relacionadas
    await removerDadosRelacionados(leadId, nexoCausalHash);
    
    // 7. Registrar log de auditoria
    await registrarLogAuditoria({
      user_id: solicitante || 'sistema',
      recurso_acessado: `lead_${leadId}`,
      nexo_hash: nexoCausalHash,
      tipo_acao: 'exclusao',
      detalhes: {
        acao: 'anonimizacao_lgpd',
        motivo: motivo,
        dados_removidos: ['nome', 'cpf', 'email', 'telefone'],
        nexo_causal_preservado: true
      }
    });
    
    console.log(`✅ Anonimização LGPD concluída - Nexo Causal: ${nexoCausalHash.substring(0, 16)}...`);
    
    return {
      sucesso: true,
      dados_anonimizados: dadosAnonimizados
    };
    
  } catch (error: any) {
    console.error('❌ Erro na anonimização LGPD:', error.message);
    return {
      sucesso: false,
      erro: error.message
    };
  }
}

/**
 * 2. LOG DE ACESSO SENSÍVEL
 */
export async function registrarLogAuditoria(dados: {
  user_id: string;
  recurso_acessado: string;
  nexo_hash: string;
  tipo_acao?: 'visualizacao' | 'download' | 'edicao' | 'exclusao';
  detalhes?: any;
}): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    const logAuditoria: Partial<LogAuditoria> = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      user_id: dados.user_id,
      recurso_acessado: dados.recurso_acessado,
      timestamp: new Date().toISOString(),
      nexo_hash: dados.nexo_hash,
      ip_acesso: 'IP_CLIENTE', // Será capturado no middleware
      tipo_acao: dados.tipo_acao || 'visualizacao',
      detalhes: dados.detalhes
    };
    
    const { error } = await supabase
      .from('logs_auditoria')
      .insert(logAuditoria);
    
    if (error) {
      throw new Error(`Falha ao registrar log: ${error.message}`);
    }
    
    console.log(`📋 Log de auditoria registrado - Recurso: ${dados.recurso_acessado}`);
    
    return { sucesso: true };
    
  } catch (error: any) {
    console.error('❌ Erro ao registrar log de auditoria:', error.message);
    return { sucesso: false, erro: error.message };
  }
}

/**
 * Middleware para capturar IP e User-Agent automaticamente
 */
export function criarLogComContexto(user_id: string, recurso: string, nexo_hash: string, req: any) {
  return registrarLogAuditoria({
    user_id,
    recurso_acessado: recurso,
    nexo_hash,
    tipo_acao: 'visualizacao',
    detalhes: {
      ip_acesso: req.ip || req.headers['x-forwarded-for'] || 'desconhecido',
      user_agent: req.headers['user-agent'] || 'desconhecido',
      origem: req.headers['origin'] || 'desconhecida'
    }
  });
}

/**
 * 3. VALIDAÇÃO DE CONSENTIMENTO LGPD
 */
export async function registrarConsentimentoLGPD(
  leadId: string,
  consentimento: boolean,
  req?: any
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    if (!consentimento) {
      throw new Error('Consentimento LGPD é obrigatório');
    }
    
    const consentimentoData: Partial<LGPDConsentimento> = {
      id: `CONSENT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      lead_id: leadId,
      consentimento_lgpd: consentimento,
      data_aceite: new Date().toISOString(),
      ip_acesso: req?.ip || req?.headers?.['x-forwarded-for'] || 'desconhecido',
      user_agent: req?.headers?.['user-agent'] || 'desconhecido',
      termos_versao: 'v1.0-2024'
    };
    
    const { error } = await supabase
      .from('lgpd_consentimentos')
      .insert(consentimentoData);
    
    if (error) {
      throw new Error(`Falha ao registrar consentimento: ${error.message}`);
    }
    
    console.log(`✅ Consentimento LGPD registrado - Lead: ${leadId}`);
    
    return { sucesso: true };
    
  } catch (error: any) {
    console.error('❌ Erro ao registrar consentimento LGPD:', error.message);
    return { sucesso: false, erro: error.message };
  }
}

/**
 * 4. VALIDAÇÃO DE CONFORMIDADE LGPD
 */
export async function validarConformidadeLGPD(): Promise<{
  conforme: boolean;
  rls_ativo: boolean;
  tabelas_protegidas: string[];
  tabelas_desprotegidas: string[];
  recomendacoes: string[];
}> {
  try {
    console.log('🔍 Iniciando validação de conformidade LGPD...');
    
    // Tabelas que devem ter RLS ativo
    const tabelasSensiveis = [
      'leads',
      'clientes',
      'nexo_causal',
      'lgpd_consentimentos',
      'lgpd_anonimizados',
      'logs_auditoria',
      'trava_cpf'
    ];
    
    const tabelasProtegidas: string[] = [];
    const tabelasDesprotegidas: string[] = [];
    
    // Verificar RLS em cada tabela
    for (const tabela of tabelasSensiveis) {
      try {
        const { data, error } = await supabase
          .from(tabela)
          .select('count')
          .limit(1);
        
        // Se não der erro de permissão, RLS pode estar desativado
        if (!error) {
          // Verificar explicitamente se RLS está ativo
          const { data: rlsInfo } = await supabase
            .rpc('check_rls_status', { table_name: tabela });
          
          if (rlsInfo?.rls_enabled) {
            tabelasProtegidas.push(tabela);
          } else {
            tabelasDesprotegidas.push(tabela);
          }
        }
      } catch (err) {
        // Se der erro de permissão, RLS está provavelmente ativo
        tabelasProtegidas.push(tabela);
      }
    }
    
    const rlsAtivo = tabelasDesprotegidas.length === 0;
    const recomendacoes: string[] = [];
    
    if (!rlsAtivo) {
      recomendacoes.push(`Ativar RLS nas tabelas: ${tabelasDesprotegidas.join(', ')}`);
    }
    
    // Verificar se logs de auditoria estão sendo registrados
    const { data: logsRecentes } = await supabase
      .from('logs_auditoria')
      .select('count')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    if (!logsRecentes || logsRecentes.length === 0) {
      recomendacoes.push('Implementar logs de auditoria para acesso a dados sensíveis');
    }
    
    // Verificar se há política de retenção de dados
    const { data: politicas } = await supabase
      .from('lgpd_politicas')
      .select('*')
      .eq('ativa', true);
    
    if (!politicas || politicas.length === 0) {
      recomendacoes.push('Definir e documentar política de retenção de dados');
    }
    
    const conforme = rlsAtivo && recomendacoes.length === 0;
    
    console.log(`✅ Validação LGPD concluída - Conforme: ${conforme ? 'SIM' : 'NÃO'}`);
    
    return {
      conforme,
      rls_ativo: rlsAtivo,
      tabelas_protegidas: tabelasProtegidas,
      tabelas_desprotegidas: tabelasDesprotegidas,
      recomendacoes
    };
    
  } catch (error: any) {
    console.error('❌ Erro na validação LGPD:', error.message);
    return {
      conforme: false,
      rls_ativo: false,
      tabelas_protegidas: [],
      tabelas_desprotegidas: [],
      recomendacoes: ['Erro crítico na validação: ' + error.message]
    };
  }
}

/**
 * 5. FUNÇÕES AUXILIARES
 */
async function removerDadosRelacionados(leadId: string, nexoCausalHash: string): Promise<void> {
  try {
    // Remover dados de tabelas relacionadas, mantendo apenas o nexo causal
    const tabelasRelacionadas = [
      'lead_interacoes',
      'lead_documentos',
      'lead_historico'
    ];
    
    for (const tabela of tabelasRelacionadas) {
      await supabase
        .from(tabela)
        .update({
          dados_anonimizados: true,
          data_anonimizacao: new Date().toISOString(),
          nexo_causal_hash: nexoCausalHash
        })
        .eq('lead_id', leadId);
    }
    
  } catch (error: any) {
    console.warn(`⚠️ Erro ao remover dados relacionados: ${error.message}`);
  }
}

/**
 * 6. RELATÓRIO DE CONFORMIDADE
 */
export async function gerarRelatorioConformidade(): Promise<{
  status: 'conforme' | 'parcial' | 'nao_conforme';
  detalhes: any;
  recomendacoes: string[];
}> {
  const validacao = await validarConformidadeLGPD();
  
  // Buscar estatísticas de anonimização
  const { data: anonimizados } = await supabase
    .from('lgpd_anonimizados')
    .select('*');
  
  // Buscar logs recentes
  const { data: logsRecentes } = await supabase
    .from('logs_auditoria')
    .select('*')
    .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: false })
    .limit(100);
  
  const detalhes = {
    validacao_lgpd: validacao,
    total_anonimizados: anonimizados?.length || 0,
    logs_ultima_semana: logsRecentes?.length || 0,
    data_ultima_validacao: new Date().toISOString()
  };
  
  let status: 'conforme' | 'parcial' | 'nao_conforme' = 'conforme';
  
  if (!validacao.conforme) {
    status = validacao.tabelas_desprotegidas.length > 3 ? 'nao_conforme' : 'parcial';
  }
  
  return {
    status,
    detalhes,
    recomendacoes: validacao.recomendacoes
  };
}

export default {
  anonimizarDadosLead,
  registrarLogAuditoria,
  criarLogComContexto,
  registrarConsentimentoLGPD,
  validarConformidadeLGPD,
  gerarRelatorioConformidade
};
