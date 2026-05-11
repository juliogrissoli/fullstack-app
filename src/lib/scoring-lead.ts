/**
 * SCORING PREDITIVO ANJOIMOB (Skill #718 - Market Predictor)
 * Analisa o comportamento do lead e atribui pontuação.
 */

export function calcularScoringLead(dados: {
  termoBusca: string;
  interacoes: number;
  documentosVisualizados: boolean;
  propostasSolicitadas: boolean;
}): { score: number; nivel: string; acao: string } {
  let score = 0;

  const termosAltoValor = ['roi', 'zoneamento', 'cap rate', 'loteamento', 'investimento', 'permuta'];
  const termosMedioValor = ['apartamento', 'casa', 'terreno', 'condomínio', 'lançamento'];

  const termoLower = dados.termoBusca.toLowerCase();

  if (termosAltoValor.some(t => termoLower.includes(t))) {
    score += 50;
  } else if (termosMedioValor.some(t => termoLower.includes(t))) {
    score += 20;
  }

  score += Math.min(dados.interacoes * 5, 30);

  if (dados.documentosVisualizados) score += 10;
  if (dados.propostasSolicitadas) score += 10;

  let nivel: string;
  let acao: string;

  if (score >= 80) {
    nivel = 'QUENTE';
    acao = 'Contatar imediatamente. Lead de alta intenção.';
  } else if (score >= 50) {
    nivel = 'MORNO';
    acao = 'Enviar White Paper e agendar follow-up em 24h.';
  } else {
    nivel = 'FRIO';
    acao = 'Nutrir com conteúdo. Reavaliar em 7 dias.';
  }

  return { score, nivel, acao };
}
