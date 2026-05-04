// 🏛️ NEXO CAUSAL DIGITAL - GEO v8.1 IMPERIUM EDITION
// Security Broker SB v6.7.0 - Prova Legal Imutável
// Gera hash SHA-256 vinculando Lead + Ativo + Timestamp

import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function gerarNexoCausal(
  leadId: string,
  assetId: string
): Promise<{ hash: string; success: boolean; error?: string }> {
  try {
    // Sanitizar inputs
    const sanitizedLeadId = leadId.replace(/[^a-zA-Z0-9-]/g, '');
    const sanitizedAssetId = assetId.replace(/[^a-zA-Z0-9-]/g, '');
    
    // Gerar timestamp ISO
    const timestamp = new Date().toISOString();
    
    // Gerar hash SHA-256
    const hash = crypto.createHash('sha256')
      .update(`${sanitizedLeadId}${sanitizedAssetId}${timestamp}`)
      .digest('hex');
    
    // Inserir no banco de dados
    const { data, error } = await supabaseAdmin.from('lead_views').insert({
      lead_id: sanitizedLeadId,
      asset_id: sanitizedAssetId,
      nexo_causal_hash: hash,
      viewed_at: timestamp
    });
    
    if (error) {
      console.error('Erro ao gerar nexo causal:', error);
      return { hash: '', success: false, error: error.message };
    }
    
    console.log(`🔗 Nexo Causal gerado: ${hash.substring(0, 8)}...`);
    
    return { hash, success: true };
    
  } catch (error) {
    console.error('Exceção ao gerar nexo causal:', error);
    return { hash: '', success: false, error: 'Internal server error' };
  }
}

export async function calcularScoringPreditivo(leadData: {
  id: string;
  palavras_chave_busca?: string[];
  origem_trafego?: string;
  tempo_no_site_segundos?: number;
  documentos_baixados?: string[];
}): Promise<{ score: number; prioridade: string; detalhes: any }> {
  try {
    let score = 0;
    const detalhes: any = {};
    
    // +30 pontos: Buscou ROI ou zoneamento
    const palavrasChave = leadData.palavras_chave_busca || [];
    if (palavrasChave.some((k: string) => 
      ['roi', 'zoneamento', 'incorporação', 'lucro'].includes(k.toLowerCase())
    )) {
      score += 30;
      detalhes.intencao_roi = true;
    }
    
    // +20 pontos: Tempo no site > 3 minutos
    if (leadData.tempo_no_site_segundos && leadData.tempo_no_site_segundos > 180) {
      score += 20;
      detalhes.tempo_qualificado = true;
    }
    
    // +25 pontos: Baixou documentos
    if (leadData.documentos_baixados && leadData.documentos_baixados.length > 0) {
      score += 25;
      detalhes.documentos_baixados = leadData.documentos_baixados.length;
    }
    
    // +25 pontos: Origem de tráfego qualificado
    if (leadData.origem_trafego && ['linkedin', 'google-ads', 'facebook-ads'].includes(leadData.origem_trafego)) {
      score += 25;
      detalhes.origem_qualificada = true;
    }
    
    // +15 pontos: Intenção técnica
    if (palavrasChave.some((k: string) => 
      ['api', 'integracao', 'sistema', 'tecnologia'].includes(k.toLowerCase())
    )) {
      score += 15;
      detalhes.intencao_tecnica = true;
    }
    
    // Limitar score a 100
    score = Math.min(score, 100);
    
    // Definir prioridade
    let prioridade = 'baixa';
    if (score >= 80) {
      prioridade = 'urgente';
    } else if (score >= 60) {
      prioridade = 'alta';
    } else if (score >= 40) {
      prioridade = 'media';
    }
    
    // Inserir scoring no banco
    const { data, error } = await supabaseAdmin.from('lead_behavior_scoring').insert({
      lead_id: leadData.id,
      score_total: score,
      intencao_roi: detalhes.intencao_roi || false,
      intencao_zoneamento: detalhes.intencao_zoneamento || false,
      intencao_tecnica: detalhes.intencao_tecnica || false,
      palavras_chave_busca: palavrasChave,
      origem_trafego: leadData.origem_trafego || null,
      tempo_no_site_segundos: leadData.tempo_no_site_segundos || 0,
      documentos_baixados: leadData.documentos_baixados || [],
      prioridade
    });
    
    if (error) {
      console.error('Erro ao salvar scoring:', error);
      return { score: 0, prioridade: 'baixa', error: error.message };
    }
    
    console.log(`🎯 Score calculado: ${score} (${prioridade})`);
    
    return { score, prioridade, detalhes };
    
  } catch (error) {
    console.error('Exceção ao calcular scoring:', error);
    return { score: 0, prioridade: 'baixa', error: 'Internal server error' };
  }
}

export async function verificarPrioridadeS(score: number): Promise<boolean> {
  return score >= 80;
}
