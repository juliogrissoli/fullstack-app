/**
 * REDE UNIFICADA ANJOIMOB
 * Substitui: multinivel.ts (parte de rede), split-financeiro.ts (cascata),
 *            v18_marketplace_multinivel, v19_autonomo_matriz
 *
 * Sistema único com dois modos de distribuição:
 *   cascata  — sobre os 80% líquidos do corretor
 *   indicacao — sobre os 20% retidos pela Anjoimob
 */

// ============================================================
// CONFIGURAÇÃO PADRÃO (ajustável via tabela config_split)
// ============================================================
const DEFAULT_CASCATA:   number[] = [0.40, 0.25, 0.15, 0.10, 0.10];
const DEFAULT_INDICACAO: number[] = [0.05, 0.04, 0.03, 0.02, 0.01];

// ============================================================
// 1. VERIFICAR ELEGIBILIDADE (SCORE)
// Aceita supabase como parâmetro para funcionar em server e client
// ============================================================
export async function verificarElegibilidadeRede(
  supabase: any,
  userId: string
): Promise<{ nivelLiberado: number; score: number }> {
  const { data } = await supabase
    .from('score_logs')
    .select('score_total, nivel_liberado')
    .eq('user_id', userId)
    .single();

  return {
    score: data?.score_total ?? 0,
    nivelLiberado: data?.nivel_liberado ?? 0,
  };
}

// ============================================================
// 2. DISTRIBUIR CASCATA (sobre 80% líquido)
// ============================================================
export function distribuirCascata(
  valorLiquido: number,
  nivelLiberado: number,
  cascata: number[] = DEFAULT_CASCATA
): { distribuicao: number[]; valorNaoDistribuido: number } {
  const distribuicao: number[] = [0, 0, 0, 0, 0];
  let distribuido = 0;

  for (let i = 0; i < nivelLiberado && i < 5; i++) {
    distribuicao[i] = valorLiquido * cascata[i];
    distribuido += distribuicao[i];
  }

  return { distribuicao, valorNaoDistribuido: valorLiquido - distribuido };
}

// ============================================================
// 3. DISTRIBUIR INDICAÇÃO (sobre os 20% SB)
// ============================================================
export function distribuirIndicacao(
  valorSB: number,
  nivelLiberado: number
): { distribuicao: number[]; valorNaoDistribuido: number } {
  const distribuicao: number[] = [0, 0, 0, 0, 0];
  let distribuido = 0;

  for (let i = 0; i < nivelLiberado && i < 5; i++) {
    distribuicao[i] = valorSB * DEFAULT_INDICACAO[i];
    distribuido += distribuicao[i];
  }

  return { distribuicao, valorNaoDistribuido: valorSB - distribuido };
}

// ============================================================
// 4. PROCESSAR REDE COMPLETA (função principal)
// ============================================================
export async function processarRedeCompleta(
  supabase: any,
  userId: string,
  valorComissao: number
): Promise<{
  cascata: { distribuicao: number[]; valorNaoDistribuido: number };
  indicacao: { distribuicao: number[]; valorNaoDistribuido: number };
  score: number;
  nivelLiberado: number;
  totalRevertido: number;
}> {
  const { nivelLiberado, score } = await verificarElegibilidadeRede(supabase, userId);

  const valorSB      = valorComissao * 0.20;
  const valorLiquido = valorComissao * 0.80;

  const cascata   = distribuirCascata(valorLiquido, nivelLiberado);
  const indicacao = distribuirIndicacao(valorSB, nivelLiberado);

  const totalRevertido = cascata.valorNaoDistribuido + indicacao.valorNaoDistribuido;

  // Registrar valor não distribuído no caixa Anjoimob
  if (totalRevertido > 0) {
    await supabase.from('caixa_anjoimob').insert({
      origem: 'rede_nao_distribuida',
      motivo: nivelLiberado === 0 ? 'score_insuficiente' : 'niveis_nao_liberados',
      user_id: userId,
      valor: totalRevertido,
      score,
    });
  }

  return { cascata, indicacao, score, nivelLiberado, totalRevertido };
}
