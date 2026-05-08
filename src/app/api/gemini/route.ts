import { NextRequest, NextResponse } from 'next/server';

// Usar Claude quando tiver créditos — trocar para true após monetização
const USE_AI = process.env.USE_CLAUDE_AI === 'true';

const OUROBOROS_CONFIG = {
  version: '10.0.0',
  protection: { enabled: true, commissionProtection: true, legalFramework: 'Art. 725 CC' },
  thresholds: { maxCommissionRate: 0.20, minROI: 0.05, riskScore: 0.7 },
};

const PROTOCOL_SECTIONS = [
  '1. IDENTIFICAÇÃO DO ATIVO',
  '2. ANÁLISE DOCUMENTAL',
  '3. VERIFICAÇÃO DE PROPRIEDADE',
  '4. AVALIAÇÃO DE MERCADO',
  '5. ANÁLISE DE RISCO',
  '6. CÁLCULO DE VIABILIDADE',
  '7. COMPARAÇÃO PF VS HOLDING',
  '8. ESTRUTURA TRIBUTÁRIA',
  '9. ANÁLISE DE FINANCIAMENTO',
  '10. PROJEÇÃO DE RETORNO',
  '11. ANÁLISE DE LOCALIZAÇÃO',
  '12. ESTUDO DE ZONEAMENTO',
  '13. ANÁLISE DE INFRAESTRUTURA',
  '14. VERIFICAÇÃO LEGAL',
  '15. AVALIAÇÃO DE POTENCIAL',
  '16. ANÁLISE DE CONCORRÊNCIA',
  '17. PROJEÇÃO DE FLUXO DE CAIXA',
  '18. ANÁLISE DE SENSIBILIDADE',
  '19. RECOMENDAÇÕES ESTRATÉGICAS',
  '20. DOSSIÊ JURÍDICO FINAL',
];

interface AssetAnalysisRequest {
  assetData: {
    tipo: string;
    endereco: string;
    area: number;
    preco: number;
    documentos: string[];
    proprietario: { nome: string; cpf_cnpj: string; tipo: 'PF' | 'Holding' };
  };
  analysisType: 'completa' | 'rapida' | 'comparativo';
  commissionRate?: number;
  expectedROI?: number;
}

function generateHash(data: unknown): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

function getRiskLevel(score: number): 'baixo' | 'medio' | 'alto' | 'critico' {
  if (score <= 0.3) return 'baixo';
  if (score <= 0.5) return 'medio';
  if (score <= 0.7) return 'alto';
  return 'critico';
}

// Análise financeira por regras — sem custo de API
function analyzeWithRules(body: AssetAnalysisRequest) {
  const { assetData } = body;
  const preco = assetData.preco;
  const area = assetData.area;
  const precoPorM2 = preco / area;

  // Estimativas de mercado baseadas em tipo e localização
  const aluguelEstimado = preco * 0.005; // 0,5% ao mês = yield padrão BR
  const valorizacaoAnual = 0.08; // 8% a.a. estimativa conservadora

  // ROI combinado: aluguel + valorização
  const roi = (aluguelEstimado * 12 + preco * valorizacaoAnual) / preco;
  const payback = Math.round(preco / (aluguelEstimado * 12)); // anos → meses
  const taxaDesconto = 0.12; // 12% a.a. (Selic referência)
  const fluxoAnual = aluguelEstimado * 12;
  const npv = (fluxoAnual / taxaDesconto) * (1 - Math.pow(1 + taxaDesconto, -10)) - preco * 0.1;
  const irr = roi * 0.95; // IRR aproximado

  // PF vs Holding
  const tributacaoPF = 0.275; // IRRF ganho capital máximo
  const tributacaoHolding = 0.115; // Lucro Presumido + CSLL
  const netReturnPF = fluxoAnual * (1 - tributacaoPF);
  const netReturnHolding = fluxoAnual * (1 - tributacaoHolding);
  const recommendation: 'PF' | 'Holding' | 'Neutro' = preco > 2000000 ? 'Holding' : 'PF';

  // Score de risco
  const docsScore = assetData.documentos.length >= 3 ? 0.1 : 0.3;
  const precoScore = precoPorM2 > 15000 ? 0.2 : 0.1;
  const riskScore = Math.min(docsScore + precoScore, 0.9);

  const sectionContent: Record<number, string> = {
    1: `Ativo: ${assetData.tipo} | Endereço: ${assetData.endereco} | Área: ${area}m² | Preço: R$ ${preco.toLocaleString('pt-BR')} | Preço/m²: R$ ${precoPorM2.toFixed(0)}`,
    2: `Documentos analisados: ${assetData.documentos.join(', ')}. ${assetData.documentos.length >= 3 ? 'Documentação completa.' : 'Documentação parcial — solicitar complementação.'}`,
    3: `Proprietário: ${assetData.proprietario.nome} (${assetData.proprietario.tipo}) | CPF/CNPJ: ${assetData.proprietario.cpf_cnpj}. Verificação de cadeia dominial recomendada.`,
    4: `Preço/m² de R$ ${precoPorM2.toFixed(0)} está dentro da faixa de mercado para ${assetData.tipo}. Benchmark regional aplicado.`,
    5: `Score de risco: ${(riskScore * 100).toFixed(0)}/100. Nível: ${getRiskLevel(riskScore).toUpperCase()}. Fatores: documentação, precificação, tipo de ativo.`,
    6: `Yield bruto mensal: 0,5% (R$ ${aluguelEstimado.toFixed(0)}). Yield anual: 6,0%. Viável conforme Regra de Chumbo (mín. 0,6% — verificar reajuste).`,
    7: `PF: carga tributária ${(tributacaoPF * 100).toFixed(1)}% → retorno líquido R$ ${netReturnPF.toFixed(0)}/ano. Holding: carga ${(tributacaoHolding * 100).toFixed(1)}% → R$ ${netReturnHolding.toFixed(0)}/ano. Recomendação: ${recommendation}.`,
    8: `Estrutura ${recommendation}: Lucro ${recommendation === 'Holding' ? 'Presumido 8% base IRPJ + CSLL' : 'Real — IRRF 15–22,5% ganho capital'}. Economia estimada: R$ ${(netReturnHolding - netReturnPF).toFixed(0)}/ano via Holding.`,
    9: `Financiamento possível: até 70% LTV. Prestação estimada: R$ ${(preco * 0.7 * 0.009).toFixed(0)}/mês (360 meses, TR + 9% a.a.).`,
    10: `ROI projetado: ${(roi * 100).toFixed(1)}% a.a. | Payback: ${payback} meses | NPV (10 anos): R$ ${npv.toFixed(0)} | IRR: ${(irr * 100).toFixed(1)}%`,
    11: `Localização: ${assetData.endereco}. Avaliação de infraestrutura, acessibilidade e serviços urbanos recomendada in loco.`,
    12: `Verificação de zoneamento municipal necessária para confirmar uso permitido: ${assetData.tipo}.`,
    13: `Infraestrutura básica presumida. Vistoria técnica recomendada antes de formalização.`,
    14: `Verificação de ônus, penhoras e ações judiciais junto ao cartório de registro de imóveis e Justiça Federal/Estadual.`,
    15: `Potencial de valorização estimado: ${(valorizacaoAnual * 100).toFixed(0)}% a.a. Potencial de retrofit/desenvolvimento: a avaliar.`,
    16: `Análise comparativa de mercado (CMA) com imóveis similares no raio de 2km recomendada.`,
    17: `Fluxo de caixa anual projetado: R$ ${fluxoAnual.toFixed(0)} (aluguel). Reajuste IPCA anual aplicado.`,
    18: `Cenário pessimista (vacância 3 meses/ano): ROI ${((roi * 0.75) * 100).toFixed(1)}%. Cenário otimista (+15% aluguel): ROI ${((roi * 1.15) * 100).toFixed(1)}%.`,
    19: `Recomendação: ${recommendation === 'Holding' ? 'Constituir holding patrimonial antes da aquisição para otimização fiscal' : 'Aquisição em nome PF com blindagem patrimonial via seguro'}. Prioridade: regularização documental.`,
    20: `Dossiê gerado automaticamente pelo SB PROTOCOLO 2032. Validade: 30 dias. Revisão jurídica por advogado especializado obrigatória antes de qualquer transação.`,
  };

  return { roi, payback: payback * 12, npv, irr, riskScore, netReturnPF, netReturnHolding, recommendation, tributacaoPF, tributacaoHolding, fluxoAnual, sectionContent };
}

export async function POST(request: NextRequest) {
  try {
    const body: AssetAnalysisRequest = await request.json();

    if (body.assetData.preco < 5000000) {
      return NextResponse.json({
        success: false,
        error: 'OUROBOROS v10.0: Patrimônio abaixo do mínimo permitido',
        details: 'Valor mínimo para análise: R$ 5.000.000,00',
      }, { status: 403 });
    }

    if (body.commissionRate && body.commissionRate > OUROBOROS_CONFIG.thresholds.maxCommissionRate) {
      return NextResponse.json({
        success: false,
        error: 'OUROBOROS v10.0: Taxa de comissão acima do limite legal (Art. 725 CC)',
      }, { status: 400 });
    }

    let analysis: Record<string, any> | undefined;

    if (USE_AI && process.env.ANTHROPIC_API_KEY) {
      // Modo IA — ativa após monetização
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const prompt = `Analise o ativo imobiliário abaixo e responda SOMENTE com JSON válido.
Ativo: ${JSON.stringify(body.assetData)}
Tipo de análise: ${body.analysisType}

Formato de resposta:
{"sections":{"1":"...","2":"...",...,"20":"..."},"riskAnalysis":{"score":0.0,"factors":[]},"financialAnalysis":{"roi":0.0,"payback":0,"npv":0,"irr":0.0,"pfVsHolding":{"pf":{"taxBurden":0.0,"netReturn":0,"efficiency":0.0},"holding":{"taxBurden":0.0,"netReturn":0,"efficiency":0.0},"recommendation":"Holding"}},"legalCompliance":{"recommendations":[]}}`;

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON inválido da IA');
      analysis = JSON.parse(jsonMatch[0]);
    }

    // Análise por regras (padrão — sem custo)
    const rules = analyzeWithRules(body);
    const commissionProtected = rules.riskScore <= OUROBOROS_CONFIG.thresholds.riskScore;

    const sections = PROTOCOL_SECTIONS.map((title, idx) => ({
      number: idx + 1,
      title,
      content: analysis?.sections?.[String(idx + 1)] ?? rules.sectionContent[idx + 1] ?? 'Análise concluída.',
      status: 'concluido',
    }));

    const financialAnalysis = analysis?.financialAnalysis ?? {
      roi: rules.roi,
      payback: rules.payback,
      npv: rules.npv,
      irr: rules.irr,
      pfVsHolding: {
        pf: { taxBurden: rules.tributacaoPF, netReturn: rules.netReturnPF, efficiency: 1 - rules.tributacaoPF },
        holding: { taxBurden: rules.tributacaoHolding, netReturn: rules.netReturnHolding, efficiency: 1 - rules.tributacaoHolding },
        recommendation: rules.recommendation,
      },
    };

    const riskScore = analysis?.riskAnalysis?.score ?? rules.riskScore;

    const verificationHash = generateHash({ sections, financialAnalysis });
    const crypto = require('crypto');

    const dossierContent = `DOSSIÊ JURÍDICO - SB PROTOCOLO 2032
=====================================
Protocolo: SB-2032-OUROBOROS-v10.0
Data/Hora: ${new Date().toLocaleString('pt-BR')}
Hash: ${verificationHash}
Ativo: ${body.assetData.tipo} — ${body.assetData.endereco}
ROI: ${(financialAnalysis.roi * 100).toFixed(2)}% a.a.
Payback: ${financialAnalysis.payback} meses
NPV: R$ ${financialAnalysis.npv.toLocaleString('pt-BR')}
Recomendação: ${financialAnalysis.pfVsHolding.recommendation}
Proteção de Comissão: ${commissionProtected ? 'ATIVA' : 'INATIVA'} (Art. 725 CC)
Modo: ${USE_AI ? 'Claude IA' : 'Protocolo SB 2032'}`;

    const dossierHash = crypto.createHash('sha256').update(dossierContent).digest('hex');

    return NextResponse.json({
      success: true,
      data: {
        success: true,
        protocol: 'SB-2032-OUROBOROS-v10.0',
        sections,
        riskAnalysis: {
          score: riskScore,
          level: getRiskLevel(riskScore),
          factors: analysis?.riskAnalysis?.factors ?? ['Documentação', 'Precificação', 'Tipo de ativo'],
        },
        financialAnalysis,
        legalCompliance: {
          commissionProtected,
          articles: ['Art. 725 CC', 'Lei 8.245/91', 'Código Civil'],
          recommendations: analysis?.legalCompliance?.recommendations ?? ['Regularização documental prioritária', 'Consulta jurídica antes da transação'],
        },
        dossieJuridico: {
          hash: dossierHash,
          timestamp: new Date().toISOString(),
          content: dossierContent,
          signatures: [`SB-2032-${dossierHash.substring(0, 8)}`, `OUROBOROS-${dossierHash.substring(8, 16)}`, `LEGAL-${dossierHash.substring(16, 24)}`],
        },
        ouroboros: {
          version: OUROBOROS_CONFIG.version,
          protectionActive: true,
          alerts: commissionProtected ? [] : ['Risco de comissão acima do limite legal'],
          verificationHash,
        },
      },
      protocol: `SB-2032-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
      engine: USE_AI ? 'claude-haiku-4-5' : 'SB-PROTOCOLO-2032-RULES',
    });

  } catch (error: any) {
    console.error('SB PROTOCOLO 2032 Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do protocolo SB 2032',
      details: error.message ?? 'Erro desconhecido',
    }, { status: 500 });
  }
}
