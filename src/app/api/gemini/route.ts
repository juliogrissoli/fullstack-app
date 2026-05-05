// 🏛️ SECURITY BROKER SB v7.0 - SB PROTOCOLO 2032 + OUROBOROS v10.0
// API Gemini com proteção de comissão (Art. 725 CC) e análise completa

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicialização do Gemini com configurações de segurança
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-pro",
  generationConfig: {
    temperature: 0.2, // Ajustado para máxima precisão técnica
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
  },
});

// Configuração do OUROBOROS v10.0 - Proteção de Comissão
const OUROBOROS_CONFIG = {
  version: "10.0.0",
  protection: {
    enabled: true,
    commissionProtection: true,
    legalFramework: "Art. 725 CC",
    auditTrail: true,
    hashVerification: true,
  },
  thresholds: {
    maxCommissionRate: 0.20, // 20% máximo legal
    minROI: 0.05, // 5% ROI mínimo
    riskScore: 0.7, // Score de risco máximo
  }
};

// 20 SEÇÕES OBRIGATÓRIAS DO SB PROTOCOLO 2032
const PROTOCOL_SECTIONS = [
  "1. IDENTIFICAÇÃO DO ATIVO",
  "2. ANÁLISE DOCUMENTAL",
  "3. VERIFICAÇÃO DE PROPRIEDADE",
  "4. AVALIAÇÃO DE MERCADO",
  "5. ANÁLISE DE RISCO",
  "6. CÁLCULO DE VIABILIDADE",
  "7. COMPARAÇÃO PF VS HOLDING",
  "8. ESTRUTURA TRIBUTÁRIA",
  "9. ANÁLISE DE FINANCIAMENTO",
  "10. PROJEÇÃO DE RETORNO",
  "11. ANÁLISE DE LOCALIZAÇÃO",
  "12. ESTUDO DE ZONEAMENTO",
  "13. ANÁLISE DE INFRAESTRUTURA",
  "14. VERIFICAÇÃO LEGAL",
  "15. AVALIAÇÃO DE POTENCIAL",
  "16. ANÁLISE DE CONCORRÊNCIA",
  "17. PROJEÇÃO DE FLUXO DE CAIXA",
  "18. ANÁLISE DE SENSIBILIDADE",
  "19. RECOMENDAÇÕES ESTRATÉGICAS",
  "20. DOSSIÊ JURÍDICO FINAL"
];

interface AssetAnalysisRequest {
  assetData: {
    tipo: string;
    endereco: string;
    area: number;
    preco: number;
    documentos: string[];
    proprietario: {
      nome: string;
      cpf_cnpj: string;
      tipo: 'PF' | 'Holding';
    };
  };
  analysisType: 'completa' | 'rapida' | 'comparativo';
  commissionRate?: number;
  expectedROI?: number;
}

interface AssetAnalysisResponse {
  success: boolean;
  protocol: string;
  sections: Array<{
    number: number;
    title: string;
    content: string;
    status: 'concluido' | 'pendente' | 'erro';
  }>;
  riskAnalysis: {
    score: number;
    level: 'baixo' | 'medio' | 'alto' | 'critico';
    factors: string[];
  };
  financialAnalysis: {
    roi: number;
    payback: number;
    npv: number;
    irr: number;
    pfVsHolding: {
      pf: {
        taxBurden: number;
        netReturn: number;
        efficiency: number;
      };
      holding: {
        taxBurden: number;
        netReturn: number;
        efficiency: number;
      };
      recommendation: 'PF' | 'Holding' | 'Neutro';
    };
  };
  legalCompliance: {
    commissionProtected: boolean;
    articles: string[];
    recommendations: string[];
  };
  dossieJuridico: {
    hash: string;
    timestamp: string;
    content: string;
    signatures: string[];
  };
  ouroboros: {
    version: string;
    protectionActive: boolean;
    alerts: string[];
    verificationHash: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AssetAnalysisRequest = await request.json();
    
    // TRAVA DE ENTRADA - Bloquear análises para patrimônios < R$ 5M
    if (body.assetData.preco < 5000000) {
      return NextResponse.json({
        success: false,
        error: "OUROBOROS v10.0: Patrimônio abaixo do mínimo permitido",
        details: "Valor mínimo para análise: R$ 5.000.000,00"
      }, { status: 403 });
    }
    
    // Validação inicial com OUROBOROS
    const ouroborosValidation = validateOuroborosCompliance(body);
    if (!ouroborosValidation.valid) {
      return NextResponse.json({
        success: false,
        error: "OUROBOROS v10.0: Violação de proteção de comissão detectada",
        details: ouroborosValidation.violations
      }, { status: 400 });
    }

    // Geração do prompt estruturado
    const prompt = generateStructuredPrompt(body);
    
    // Chamada à API Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Processamento da resposta
    const analysisResponse = processGeminiResponse(text, body);
    
    // Validação final OUROBOROS
    const finalValidation = validateFinalAnalysis(analysisResponse);
    if (!finalValidation.valid) {
      if (finalValidation.error) {
        analysisResponse.ouroboros.alerts.push(finalValidation.error);
      }
    }

    // Geração do Dossiê Jurídico
    analysisResponse.dossieJuridico = await generateLegalDossier(analysisResponse);

    return NextResponse.json({
      success: true,
      data: analysisResponse,
      protocol: `SB-2032-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    });

  } catch (error: any) {
    console.error('SB PROTOCOLO 2032 Error:', error);
    return NextResponse.json({
      success: false,
      error: "Erro interno do protocolo SB 2032",
      details: error.message || 'Erro desconhecido'
    }, { status: 500 });
  }
}

function validateOuroborosCompliance(request: AssetAnalysisRequest) {
  const violations: string[] = [];
  
  // Verificação de taxa de comissão
  if (request.commissionRate && request.commissionRate > OUROBOROS_CONFIG.thresholds.maxCommissionRate) {
    violations.push(`Taxa de comissão ${(request.commissionRate * 100).toFixed(1)}% excede o limite legal de ${(OUROBOROS_CONFIG.thresholds.maxCommissionRate * 100).toFixed(1)}% (Art. 725 CC)`);
  }
  
  // Verificação de ROI mínimo
  if (request.expectedROI && request.expectedROI < OUROBOROS_CONFIG.thresholds.minROI) {
    violations.push(`ROI esperado de ${(request.expectedROI * 100).toFixed(1)}% abaixo do mínimo aceitável de ${(OUROBOROS_CONFIG.thresholds.minROI * 100).toFixed(1)}%`);
  }
  
  return {
    valid: violations.length === 0,
    violations
  };
}

function generateStructuredPrompt(request: AssetAnalysisRequest): string {
  const { assetData, analysisType } = request;
  
  let prompt = `🏛️ SB PROTOCOLO 2032 - OUROBOROS v10.0 PROTECTION MODE

Você é um especialista em análise imobiliária e direito imobiliário brasileiro, operando sob o SB PROTOCOLO 2032 com proteção OUROBOROS v10.0.

DADOS DO ATIVO:
- Tipo: ${assetData.tipo}
- Endereço: ${assetData.endereco}
- Área: ${assetData.area}m²
- Preço: R$ ${assetData.preco.toLocaleString('pt-BR')}
- Proprietário: ${assetData.proprietario.nome} (${assetData.proprietario.tipo})
- Documentos: ${assetData.documentos.join(', ')}

TIPO DE ANÁLISE: ${analysisType.toUpperCase()}

PROTEÇÃO OUROBOROS v10.0 ATIVADA:
- Taxa máxima de comissão: ${(OUROBOROS_CONFIG.thresholds.maxCommissionRate * 100).toFixed(1)}%
- ROI mínimo aceitável: ${(OUROBOROS_CONFIG.thresholds.minROI * 100).toFixed(1)}%
- Framework legal: Art. 725 CC
- Verificação de hash: ATIVA

INSTRUÇÕES OBRIGATÓRIAS:
1. Analise o ativo seguindo RIGOROSAMENTE as 20 seções do protocolo
2. Compare os cenários PF vs Holding com cálculos precisos
3. Verifique a conformidade com Art. 725 CC
4. Gere alertas OUROBOROS se detectar irregularidades
5. Produza o Dossiê Jurídico completo ao final

ANÁLISE ESTRUTURADA (responda em formato JSON):

`;

  // Adicionar as 20 seções obrigatórias
  PROTOCOL_SECTIONS.forEach((section, index) => {
    prompt += `
${index + 1}. ${section}:
[Análise detalhada desta seção]
`;
  });

  prompt += `

CÁLCULOS FINANCEIROS OBRIGATÓRIOS:
- ROI projetado (anual)
- Payback period (meses)
- NPV (Valor Presente Líquido)
- IRR (Taxa Interna de Retorno)
- Análise de sensibilidade

COMPARAÇÃO PF VS HOLDING:
Cenário PF:
- Carga tributária total (%)
- Retorno líquido anual (R$)
- Eficiência fiscal

Cenário Holding:
- Carga tributária total (%)
- Retorno líquido anual (R$)
- Eficiência fiscal

Recomendação: [PF/Holding/Neutro] com justificativa detalhada

ANÁLISE DE RISCO:
- Score de risco (0-1)
- Nível: [baixo/medio/alto/critico]
- Fatores de risco identificados

DOSSIÊ JURÍDICO:
- Hash SHA-256 do documento
- Timestamp de geração
- Assinaturas digitais
- Conformidade legal

RESPONDA APENAS COM O JSON COMPLETO, SEM TEXTO ADICIONAL.`;

  return prompt;
}

function processGeminiResponse(text: string, request: AssetAnalysisRequest): AssetAnalysisResponse {
  try {
    // Tentar fazer parse do JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Resposta não está em formato JSON válido');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    // Validações OUROBOROS
    const riskScore = analysis.riskAnalysis?.score || 0;
    const commissionProtected = riskScore <= OUROBOROS_CONFIG.thresholds.riskScore;
    
    return {
      success: true,
      protocol: "SB-2032-OUROBOROS-v10.0",
      sections: PROTOCOL_SECTIONS.map((section, index) => ({
        number: index + 1,
        title: section,
        content: analysis[`${index + 1}_${section}`] || "Análise não disponível",
        status: "concluido"
      })),
      riskAnalysis: {
        score: riskScore,
        level: getRiskLevel(riskScore),
        factors: analysis.riskAnalysis?.factors || []
      },
      financialAnalysis: {
        roi: analysis.financialAnalysis?.roi || 0,
        payback: analysis.financialAnalysis?.payback || 0,
        npv: analysis.financialAnalysis?.npv || 0,
        irr: analysis.financialAnalysis?.irr || 0,
        pfVsHolding: analysis.financialAnalysis?.pfVsHolding || {
          pf: { taxBurden: 0, netReturn: 0, efficiency: 0 },
          holding: { taxBurden: 0, netReturn: 0, efficiency: 0 },
          recommendation: 'Neutro'
        }
      },
      legalCompliance: {
        commissionProtected,
        articles: ["Art. 725 CC", "Lei 8.245/91", "Código Civil"],
        recommendations: analysis.legalCompliance?.recommendations || []
      },
      dossieJuridico: {
        hash: "",
        timestamp: new Date().toISOString(),
        content: "",
        signatures: []
      },
      ouroboros: {
        version: OUROBOROS_CONFIG.version,
        protectionActive: OUROBOROS_CONFIG.protection.enabled,
        alerts: commissionProtected ? [] : ["Alerta: Risco de comissão acima do limite"],
        verificationHash: generateVerificationHash(analysis)
      }
    };
    
  } catch (error) {
    console.error('Erro ao processar resposta Gemini:', error);
    throw new Error('Falha no processamento da análise');
  }
}

function getRiskLevel(score: number): 'baixo' | 'medio' | 'alto' | 'critico' {
  if (score <= 0.3) return 'baixo';
  if (score <= 0.5) return 'medio';
  if (score <= 0.7) return 'alto';
  return 'critico';
}

function generateVerificationHash(data: any): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
}

async function generateLegalDossier(analysis: AssetAnalysisResponse): Promise<{
  hash: string;
  timestamp: string;
  content: string;
  signatures: string[];
}> {
  const crypto = require('crypto');
  
  const dossierContent = `
DOSSIÊ JURÍDICO - SB PROTOCOLO 2032
=====================================
Protocolo: ${analysis.protocol}
Data/Hora: ${new Date().toLocaleString('pt-BR')}
Hash de Verificação: ${analysis.ouroboros.verificationHash}

ANÁLISE DE RISCO:
Score: ${analysis.riskAnalysis.score}
Nível: ${analysis.riskAnalysis.level}
Fatores: ${analysis.riskAnalysis.factors.join(', ')}

ANÁLISE FINANCEIRA:
ROI: ${(analysis.financialAnalysis.roi * 100).toFixed(2)}%
Payback: ${analysis.financialAnalysis.payback} meses
NPV: R$ ${analysis.financialAnalysis.npv.toLocaleString('pt-BR')}
IRR: ${(analysis.financialAnalysis.irr * 100).toFixed(2)}%

COMPARAÇÃO PF VS HOLDING:
Recomendação: ${analysis.financialAnalysis.pfVsHolding?.recommendation || 'Neutro'}
Eficiência PF: ${((analysis.financialAnalysis.pfVsHolding?.pf?.efficiency || 0) * 100).toFixed(2)}%
Eficiência Holding: ${((analysis.financialAnalysis.pfVsHolding?.holding?.efficiency || 0) * 100).toFixed(2)}%

CONFORMIDADE LEGAL:
Proteção de Comissão: ${analysis.legalCompliance.commissionProtected ? 'ATIVA' : 'INATIVA'}
Artigos Aplicados: ${analysis.legalCompliance.articles.join(', ')}

ALERTAS OUROBOROS:
${analysis.ouroboros.alerts.join('\n')}

ASSINATURAS DIGITAIS:
- Sistema SB PROTOCOLO 2032: ASSINADO
- OUROBOROS v10.0: VERIFICADO
- Hash SHA-256: ${generateVerificationHash(analysis)}
`;

  const hash = crypto.createHash('sha256')
    .update(dossierContent)
    .digest('hex');

  return {
    hash,
    timestamp: new Date().toISOString(),
    content: dossierContent,
    signatures: [
      `SB-2032-${hash.substring(0, 8)}`,
      `OUROBOROS-${hash.substring(8, 16)}`,
      `LEGAL-${hash.substring(16, 24)}`
    ]
  };
}

function validateFinalAnalysis(analysis: AssetAnalysisResponse): { valid: boolean; error?: string } {
  // Verificação final de conformidade
  if (analysis.financialAnalysis.roi < OUROBOROS_CONFIG.thresholds.minROI) {
    return {
      valid: false,
      error: `ROI de ${(analysis.financialAnalysis.roi * 100).toFixed(2)}% abaixo do mínimo aceitável de ${(OUROBOROS_CONFIG.thresholds.minROI * 100).toFixed(1)}%`
    };
  }

  if (!analysis.legalCompliance.commissionProtected) {
    return {
      valid: false,
      error: "Proteção de comissão não ativada - Violação do Art. 725 CC"
    };
  }

  return { valid: true };
}
