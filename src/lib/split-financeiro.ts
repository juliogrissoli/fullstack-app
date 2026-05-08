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
