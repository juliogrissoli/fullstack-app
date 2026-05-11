// Split financeiro: 20% plataforma SB / 80% rede
// Cascata de repasse por nível: 40 / 25 / 15 / 10 / 10

export interface SplitResult {
  valorBruto: number
  retencaoSB: number
  valorLiquido: number
  repasses: { nivel: number; percentual: number; valor: number }[]
}

export function calcularSplit(valorBruto: number): SplitResult {
  const retencaoSB = valorBruto * 0.2
  const valorLiquido = valorBruto * 0.8

  const percentuais = [0.4, 0.25, 0.15, 0.1, 0.1]

  const repasses = percentuais.map((pct, idx) => ({
    nivel: idx + 1,
    percentual: pct * 100,
    valor: valorLiquido * pct,
  }))

  return { valorBruto, retencaoSB, valorLiquido, repasses }
}

// Regra de Chumbo — descarta automaticamente operações inviáveis
export function aprovadoRegraDeChumbo(params: {
  roiProjetado: number
  yieldMensal: number
  riscoJuridico: 'LOW' | 'MEDIUM' | 'HIGH'
}): { aprovado: boolean; motivo?: string } {
  if (params.roiProjetado < 15) {
    return {
      aprovado: false,
      motivo: `ROI ${params.roiProjetado}% abaixo do mínimo de 15%`,
    }
  }
  if (params.yieldMensal < 0.6) {
    return {
      aprovado: false,
      motivo: `Yield ${params.yieldMensal}% abaixo do mínimo de 0,6%/mês`,
    }
  }
  if (params.riscoJuridico === 'HIGH') {
    return { aprovado: false, motivo: 'Risco jurídico HIGH — operação bloqueada' }
  }
  return { aprovado: true }
}

// ─────────────────────────────────────────────────────────────
// ANJOIMOB vFINAL — Matriz de Acúmulo de Mérito
// ─────────────────────────────────────────────────────────────

export interface AcumuloResult {
  captadorPercent: number
  vendedorPercent: number
  parceiroPercent: number
  cenario: string
}

/**
 * Retorna percentuais sobre o valor BRUTO da comissão para cada papel.
 * A Anjoimob (20% ou 50% PRO) é calculada separadamente.
 *
 * Cenários:
 *  A — Captador = Vendedor, sem parceiro → 80% para o mesmo corretor
 *  B — Captador = Vendedor + parceiro   → 45% captador + 35% parceiro
 *  C — Apenas Captador (sem vendedor)   → 10%
 *  D — Apenas Vendedor, sem parceiro    → 70%
 *  E — Apenas Vendedor + parceiro       → 35% vendedor + 35% parceiro
 *  F — Captador e Vendedor distintos    → 10% captador + 70% vendedor
 */
export function calcularAcumuloMerito(
  captadorId: string | null,
  vendedorId: string | null,
  parceiroId: string | null = null
): AcumuloResult {
  // Cenário A: mesmo corretor captou e vendeu, sem parceiro
  if (captadorId && vendedorId && captadorId === vendedorId && !parceiroId) {
    return { captadorPercent: 0.80, vendedorPercent: 0, parceiroPercent: 0, cenario: 'captador_vendedor_solo' }
  }

  // Cenário B: mesmo corretor captou e vendeu, com parceiro
  if (captadorId && vendedorId && captadorId === vendedorId && parceiroId) {
    return { captadorPercent: 0.45, vendedorPercent: 0, parceiroPercent: 0.35, cenario: 'captador_parceria' }
  }

  // Cenário C: apenas captação (sem vendedor registrado)
  if (captadorId && !vendedorId) {
    return { captadorPercent: 0.10, vendedorPercent: 0, parceiroPercent: 0, cenario: 'apenas_captador' }
  }

  // Cenário D: apenas vendedor, sem parceiro
  if (!captadorId && vendedorId && !parceiroId) {
    return { captadorPercent: 0, vendedorPercent: 0.70, parceiroPercent: 0, cenario: 'apenas_vendedor_solo' }
  }

  // Cenário E: apenas vendedor + parceiro
  if (!captadorId && vendedorId && parceiroId) {
    return { captadorPercent: 0, vendedorPercent: 0.35, parceiroPercent: 0.35, cenario: 'apenas_vendedor_parceria' }
  }

  // Cenário F (padrão): captador e vendedor distintos
  return { captadorPercent: 0.10, vendedorPercent: 0.70, parceiroPercent: 0, cenario: 'padrao_distintos' }
}

export interface SplitProResult {
  anjoimobValor: number
  associadoValor: number
  redeValor: number
  captadorValor: number
  vendedorValor: number
  parceiroValor: number
  cenario: string
}

/**
 * Calcula o split completo incluindo Plano PRO e Matriz de Acúmulo.
 *
 * Autônomo:  Anjoimob 20% | 80% distribuído pela Matriz de Acúmulo
 * PRO:       Anjoimob 50% | Associado 50% bruto → 10% vai para rede → 90% líquido
 *            O líquido do Associado é então distribuído pela Matriz de Acúmulo
 */
export function calcularSplitPro(
  comissaoTotal: number,
  isAssociado: boolean,
  captadorId: string | null,
  vendedorId: string | null,
  parceiroId: string | null = null
): SplitProResult {
  const acumulo = calcularAcumuloMerito(captadorId, vendedorId, parceiroId)

  if (!isAssociado) {
    // Autônomo — Anjoimob retém 20%, corretor recebe 80% pela Matriz
    const anjoimobValor = comissaoTotal * 0.20
    // Percentuais da Matriz incidem sobre o bruto total (soma Anjoimob + corretor = 100%)
    return {
      anjoimobValor,
      associadoValor: 0,
      redeValor: 0,
      captadorValor: comissaoTotal * acumulo.captadorPercent,
      vendedorValor: comissaoTotal * acumulo.vendedorPercent,
      parceiroValor: comissaoTotal * acumulo.parceiroPercent,
      cenario: acumulo.cenario,
    }
  }

  // Associado PRO — Anjoimob 50%, Associado 50%
  const anjoimobValor = comissaoTotal * 0.50
  const associadoBruto = comissaoTotal * 0.50
  const redeValor = associadoBruto * 0.10        // 10% do associado vai para a rede
  const associadoLiquido = associadoBruto - redeValor  // 90% do associado (45% do total)

  // A Matriz de Acúmulo incide sobre o líquido do Associado
  return {
    anjoimobValor,
    associadoValor: associadoLiquido,
    redeValor,
    captadorValor: associadoLiquido * acumulo.captadorPercent,
    vendedorValor: associadoLiquido * acumulo.vendedorPercent,
    parceiroValor: associadoLiquido * acumulo.parceiroPercent,
    cenario: acumulo.cenario,
  }
}
