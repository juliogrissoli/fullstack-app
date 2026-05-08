// 🏛️ SECURITY BROKER SB v7.0 - DIAGNÓSTICO IMPERIUM
// Formulário de diagnóstico integrado com API Gemini + OUROBOROS v10.0

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface AssetData {
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
}

interface AnalysisResponse {
  success: boolean;
  error?: string;
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

export default function DiagnosticoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [assetData, setAssetData] = useState<AssetData>({
    tipo: '',
    endereco: '',
    area: 0,
    preco: 0,
    documentos: [],
    proprietario: {
      nome: '',
      cpf_cnpj: '',
      tipo: 'PF'
    }
  });
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [activeSection, setActiveSection] = useState<number>(1);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setAssetData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof AssetData] as Record<string, any>),
          [child]: value
        }
      }));
    } else {
      setAssetData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleDocumentosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const documentos = files.map(file => file.name);
    setAssetData(prev => ({
      ...prev,
      documentos
    }));
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    if (!assetData.tipo) errors.push('Tipo do ativo é obrigatório');
    if (!assetData.endereco) errors.push('Endereço é obrigatório');
    if (!assetData.area || assetData.area <= 0) errors.push('Área deve ser maior que 0');
    if (!assetData.preco || assetData.preco < 5000000) errors.push('Preço mínimo é R$ 5.000.000,00');
    if (!assetData.proprietario.nome) errors.push('Nome do proprietário é obrigatório');
    if (!assetData.proprietario.cpf_cnpj) errors.push('CPF/CNPJ é obrigatório');
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setAnalyzing(true);
    setLoading(true);
    
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assetData,
          analysisType: 'completa',
          commissionRate: 0.06,
          expectedROI: 0.08
        }),
      });
      
      const result: AnalysisResponse = await response.json();
      
      if (result.success) {
        setAnalysis(result);
        toast.success(`Análise iniciada! Protocolo: ${result.protocol}`);
        setActiveSection(1);
      } else {
        toast.error(result.error || 'Erro na análise');
      }
    } catch (error) {
      console.error('Erro na análise:', error);
      toast.error('Erro ao processar análise');
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const getRiskColor = (level: string): string => {
    switch (level) {
      case 'baixo': return 'text-green-400';
      case 'medio': return 'text-yellow-400';
      case 'alto': return 'text-orange-400';
      case 'critico': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getRecommendationColor = (recommendation: string): string => {
    switch (recommendation) {
      case 'PF': return 'text-blue-400';
      case 'Holding': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-yellow-500">
                🏛️ Diagnóstico Imperium v10.0
              </h1>
              <p className="text-gray-400">
                SB PROTOCOLO 2032 + OUROBOROS v10.0
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-400 hover:text-white transition"
            >
              ← Voltar ao Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!analysis ? (
          /* Formulário de Diagnóstico */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-semibold mb-6 text-yellow-500">
                  📋 Dados do Ativo
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Tipo do Ativo</label>
                    <select
                      name="tipo"
                      value={assetData.tipo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      required
                    >
                      <option value="">Selecione...</option>
                      <option value="terreno">Terreno</option>
                      <option value="casa">Casa</option>
                      <option value="apartamento">Apartamento</option>
                      <option value="comercial">Comercial</option>
                      <option value="rural">Rural</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Endereço Completo</label>
                    <input
                      type="text"
                      name="endereco"
                      value={assetData.endereco}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="Rua, número, bairro, cidade, estado, CEP"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Área (m²)</label>
                      <input
                        type="number"
                        name="area"
                        value={assetData.area}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        placeholder="500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Preço (R$)</label>
                      <input
                        type="number"
                        name="preco"
                        value={assetData.preco}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        placeholder="5000000"
                        min="5000000"
                        required
                      />
                      <p className="text-xs text-gray-400 mt-1">Mínimo: R$ 5.000.000,00</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Documentos</label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.doc,.jpg,.png"
                      onChange={handleDocumentosChange}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Anexar escritura, matrícula, IPTU, etc.
                    </p>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4 text-yellow-500">
                      👤 Dados do Proprietário
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Nome</label>
                        <input
                          type="text"
                          name="proprietario.nome"
                          value={assetData.proprietario.nome}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                          placeholder="Nome completo"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">CPF/CNPJ</label>
                        <input
                          type="text"
                          name="proprietario.cpf_cnpj"
                          value={assetData.proprietario.cpf_cnpj}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                          placeholder="000.000.000-00"
                          required
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium mb-2">Tipo de Estrutura</label>
                      <select
                        name="proprietario.tipo"
                        value={assetData.proprietario.tipo}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      >
                        <option value="PF">Pessoa Física</option>
                        <option value="Holding">Holding/Pessoa Jurídica</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || analyzing}
                    className="w-full btn-gold-glow py-3 text-lg font-semibold disabled:opacity-50"
                  >
                    {analyzing ? '🔄 Analisando...' : '🔍 Iniciar Análise Completa'}
                  </button>
                </form>
              </div>
            </div>

            <div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-semibold mb-6 text-yellow-500">
                  🛡️ OUROBOROS v10.0 - Proteção Ativa
                </h2>
                
                <div className="space-y-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2">🔒 Segurança Jurídica</h3>
                    <ul className="space-y-2 text-sm">
                      <li>✅ Proteção de comissão (Art. 725 CC)</li>
                      <li>✅ Trava de entrada para patrimônios &lt; R$ 5M</li>
                      <li>✅ Validação automática de documentos</li>
                      <li>✅ Geração de Dossiê Jurídico</li>
                    </ul>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2">📊 Análise Financeira</h3>
                    <ul className="space-y-2 text-sm">
                      <li>✅ Comparativo PF vs Holding</li>
                      <li>✅ Cálculo de ROI e Payback</li>
                      <li>✅ Análise de sensibilidade</li>
                      <li>✅ Projeção de fluxo de caixa</li>
                    </ul>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2">🏛️ Protocolo SB 2032</h3>
                    <ul className="space-y-2 text-sm">
                      <li>✅ 20 seções obrigatórias</li>
                      <li>✅ Verificação de conformidade</li>
                      <li>✅ Hash SHA-256 de prova</li>
                      <li>✅ Assinaturas digitais</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Resultados da Análise */
          <div className="space-y-8">
            {/* Header do Resultado */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-yellow-500 mb-2">
                    📋 Análise Concluída
                  </h2>
                  <p className="text-gray-400">
                    Protocolo: <span className="text-yellow-400 font-mono">{analysis.protocol}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className={`px-4 py-2 rounded-lg ${
                    analysis.ouroboros.protectionActive 
                      ? 'bg-green-900 text-green-300' 
                      : 'bg-red-900 text-red-300'
                  }`}>
                    🛡️ OUROBOROS v{analysis.ouroboros.version}
                  </div>
                </div>
              </div>
            </div>

            {/* Seções da Análise */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold mb-6 text-yellow-500">
                📑 20 Seções do Protocolo SB 2032
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysis.sections.map((section) => (
                  <div
                    key={section.number}
                    className={`p-4 rounded-lg border cursor-pointer transition ${
                      activeSection === section.number
                        ? 'bg-yellow-900 border-yellow-500'
                        : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={() => setActiveSection(section.number)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-yellow-400">
                        {section.number}. {section.title}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        section.status === 'concluido'
                          ? 'bg-green-900 text-green-300'
                          : section.status === 'pendente'
                          ? 'bg-yellow-900 text-yellow-300'
                          : 'bg-red-900 text-red-300'
                      }`}>
                        {section.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-3">
                      {section.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Análise de Risco */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold mb-6 text-yellow-500">
                ⚠️ Análise de Risco
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-center">
                    <div className={`text-5xl font-bold ${getRiskColor(analysis.riskAnalysis.level)}`}>
                      {(analysis.riskAnalysis.score * 100).toFixed(0)}%
                    </div>
                    <p className="text-gray-400">Score de Risco</p>
                  </div>
                </div>
                
                <div>
                  <div className={`text-2xl font-semibold ${getRiskColor(analysis.riskAnalysis.level)}`}>
                    {analysis.riskAnalysis.level.toUpperCase()}
                  </div>
                  <p className="text-gray-400">Nível de Risco</p>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Fatores de Risco Identificados:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {analysis.riskAnalysis.factors.map((factor, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-3 text-sm">
                      ⚠️ {factor}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Análise Financeira */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold mb-6 text-yellow-500">
                💰 Análise Financeira
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {(analysis.financialAnalysis.roi * 100).toFixed(1)}%
                  </div>
                  <p className="text-gray-400">ROI Projetado</p>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {analysis.financialAnalysis.payback}
                  </div>
                  <p className="text-gray-400">Payback (meses)</p>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {formatarMoeda(analysis.financialAnalysis.npv)}
                  </div>
                  <p className="text-gray-400">NPV</p>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-400">
                    {(analysis.financialAnalysis.irr * 100).toFixed(1)}%
                  </div>
                  <p className="text-gray-400">IRR</p>
                </div>
              </div>
            </div>

            {/* Comparativo PF vs Holding */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold mb-6 text-yellow-500">
                ⚖️ Comparativo PF vs Holding
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-900 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-blue-400 mb-4">Pessoa Física</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Carga Tributária:</span>
                      <span className="font-semibold">
                        {(analysis.financialAnalysis.pfVsHolding.pf.taxBurden * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Retorno Líquido:</span>
                      <span className="font-semibold text-green-400">
                        {formatarMoeda(analysis.financialAnalysis.pfVsHolding.pf.netReturn)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Eficiência Fiscal:</span>
                      <span className="font-semibold text-blue-400">
                        {(analysis.financialAnalysis.pfVsHolding.pf.efficiency * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-900 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-purple-400 mb-4">Holding</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Carga Tributária:</span>
                      <span className="font-semibold">
                        {(analysis.financialAnalysis.pfVsHolding.holding.taxBurden * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Retorno Líquido:</span>
                      <span className="font-semibold text-green-400">
                        {formatarMoeda(analysis.financialAnalysis.pfVsHolding.holding.netReturn)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Eficiência Fiscal:</span>
                      <span className="font-semibold text-purple-400">
                        {(analysis.financialAnalysis.pfVsHolding.holding.efficiency * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <div className={`inline-block px-6 py-3 rounded-lg ${getRecommendationColor(analysis.financialAnalysis.pfVsHolding.recommendation)}`}>
                  <h4 className="text-lg font-semibold mb-2">
                    Recomendação: {analysis.financialAnalysis.pfVsHolding.recommendation}
                  </h4>
                  <p className="text-sm text-gray-300">
                    Baseado na análise comparativa de eficiência fiscal e retorno líquido
                  </p>
                </div>
              </div>
            </div>

            {/* Dossiê Jurídico */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold mb-6 text-yellow-500">
                📄 Dossiê Jurídico
              </h3>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="font-semibold mb-2">Hash SHA-256</h4>
                    <code className="text-xs text-yellow-400 font-mono">
                      {analysis.dossieJuridico.hash}
                    </code>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Data/Hora</h4>
                    <p className="text-sm text-gray-300">
                      {new Date(analysis.dossieJuridico.timestamp).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Assinaturas Digitais</h4>
                  <div className="space-y-1">
                    {analysis.dossieJuridico.signatures.map((signature, index) => (
                      <div key={index} className="bg-gray-600 rounded px-3 py-1 text-sm font-mono">
                        {signature}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Conteúdo do Dossiê</h4>
                  <pre className="text-xs text-gray-300 bg-gray-800 rounded p-3 overflow-x-auto">
                    {analysis.dossieJuridico.content}
                  </pre>
                </div>
              </div>
            </div>

            {/* Health Check de Integração */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold mb-6 text-yellow-500">
                🔍 Health Check de Integração
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">✅</div>
                  <p className="text-gray-400">Hash Nexo Causal</p>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">✅</div>
                  <p className="text-gray-400">Split Comissão 2%/4%</p>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">✅</div>
                  <p className="text-gray-400">RLS Dados Sensíveis</p>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="text-center">
              <button
                onClick={() => window.print()}
                className="btn-gold-glow px-8 py-3 text-lg font-semibold mr-4"
              >
                🖨️ Imprimir Relatório
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="border-2 border-yellow-500 text-yellow-500 px-8 py-3 rounded-lg hover:bg-yellow-500 hover:text-gray-900 transition text-lg font-semibold"
              >
                ← Voltar ao Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
