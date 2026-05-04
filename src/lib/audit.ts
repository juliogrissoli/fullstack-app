// 🏛️ AUDIT LOGS - GEO v8.1 IMPERIUM EDITION
// Security Broker SB v6.7.0 - Log Imutável de Ações Sensíveis
// Conformidade LGPD + Governança de Dados

import { supabaseAdmin } from '@/lib/supabase-admin';

export interface AuditAction {
  action: string;
  tableName: string;
  recordId: string;
  oldValue?: any;
  newValue?: any;
  userId?: string;
}

export async function registrarAuditoria({
  action,
  tableName,
  recordId,
  oldValue,
  newValue,
  userId
}: AuditAction): Promise<{ success: boolean; error?: string }> {
  try {
    // Obter IP real do cliente (se disponível)
    const clientIP = getClientIP();
    
    // Inserir registro de auditoria imutável
    const { data, error } = await supabaseAdmin.from('audit_logs').insert({
      user_id: userId || null,
      action,
      table_name: tableName,
      record_id: recordId,
      old_value: oldValue || null,
      new_value: newValue || null,
      ip_address: clientIP,
      created_at: new Date().toISOString()
    });
    
    if (error) {
      console.error('Erro ao registrar auditoria:', error);
      return { success: false, error: error.message };
    }
    
    console.log(`📋 Auditoria registrada: ${action} em ${tableName}`);
    return { success: true };
    
  } catch (error) {
    console.error('Exceção ao registrar auditoria:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function registrarAlteracaoAtivo(
  assetId: string,
  userId: string,
  campoAlterado: string,
  valorAnterior: any,
  valorNovo: any
): Promise<{ success: boolean; error?: string }> {
  return await registrarAuditoria({
    action: 'ALTEROU_CAMPO_ATIVO',
    tableName: 'land_opportunities',
    recordId: assetId,
    oldValue: { [campoAlterado]: valorAnterior },
    newValue: { [campoAlterado]: valorNovo },
    userId
  });
}

export async function registrarVisualizacaoDocumento(
  assetId: string,
  userId: string,
  documentoAcessado: string
): Promise<{ success: boolean; error?: string }> {
  return await registrarAuditoria({
    action: 'VISUALIZOU_DOCUMENTO',
    tableName: 'land_opportunities',
    recordId: assetId,
    newValue: { documento_acessado: documentoAcessado },
    userId
  });
}

export async function registrarAlteracaoComissao(
  comissaoId: string,
  userId: string,
  statusAnterior: string,
  statusNovo: string
): Promise<{ success: boolean; error?: string }> {
  return await registrarAuditoria({
    action: 'ALTEROU_COMISSAO',
    tableName: 'sales_commissions',
    recordId: comissaoId,
    oldValue: { status: statusAnterior },
    newValue: { status: statusNovo },
    userId
  });
}

export async function registrarAcessoLead(
  leadId: string,
  userId: string,
  origemAcesso: string
): Promise<{ success: boolean; error?: string }> {
  return await registrarAuditoria({
    action: 'ACEDEU_LEAD',
    tableName: 'lead_behavior_scoring',
    recordId: leadId,
    newValue: { origem_acesso: origemAcesso },
    userId
  });
}

// Função auxiliar para obter IP real do cliente
function getClientIP(): string {
  // Em produção, isso viria dos headers da requisição
  // Por enquanto, retorna placeholder
  return 'SERVER_SIDE'; // TODO: Implementar detecção real de IP
}

export async function obterHistoricoAuditoria(
  userId: string,
  limite: number = 50
): Promise<{ success: boolean; logs?: any[]; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limite);
    
    if (error) {
      console.error('Erro ao obter histórico:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, logs: data };
    
  } catch (error) {
    console.error('Exceção ao obter histórico:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function gerarRelatorioAuditoria(
  periodo: '24h' | '7d' | '30d' | '90d',
  filtros?: { userId?: string; acao?: string }
): Promise<{ success: boolean; relatorio?: any; error?: string }> {
  try {
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*, users(email)')
      .order('created_at', { ascending: false });
    
    // Aplicar filtros
    if (filtros?.userId) {
      query = query.eq('user_id', filtros.userId);
    }
    
    if (filtros?.acao) {
      query = query.eq('action', filtros.acao);
    }
    
    // Aplicar filtro de período
    const agora = new Date();
    let dataInicio: Date;
    
    switch (periodo) {
      case '24h':
        dataInicio = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        dataInicio = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dataInicio = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dataInicio = new Date(agora.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }
    
    query = query.gte('created_at', dataInicio.toISOString());
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao gerar relatório:', error);
      return { success: false, error: error.message };
    }
    
    // Agrupar por tipo de ação
    const relatorio = {
      periodo,
      dataInicio: dataInicio.toISOString(),
      dataFim: agora.toISOString(),
      totalRegistros: data?.length || 0,
      acoes: data?.reduce((acc: any, log) => {
        const acao = log.action;
        acc[acao] = (acc[acao] || 0) + 1;
        return acc;
      }, {}),
      usuarios: data?.reduce((acc: any, log) => {
        if (log.users?.email) {
          acc[log.users.email] = (acc[log.users.email] || 0) + 1;
        }
        return acc;
      }, {}),
      dados: data
    };
    
    console.log(`📊 Relatório gerado: ${periodo} - ${relatorio.totalRegistros} registros`);
    
    return { success: true, relatorio };
    
  } catch (error) {
    console.error('Exceção ao gerar relatório:', error);
    return { success: false, error: 'Internal server error' };
  }
}
