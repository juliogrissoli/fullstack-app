'use client';

import { useState } from 'react';

export function ROICalculator({ assetId, baseValue }: { assetId: string; baseValue: number }) {
  const [investment, setInvestment] = useState(baseValue);
  const [timeHorizon, setTimeHorizon] = useState(12); // months
  const [appreciation, setAppreciation] = useState(15); // annual percentage
  const [showResults, setShowResults] = useState(false);

  const calculateROI = () => {
    // Cálculo de ROI com base em land banking
    const monthlyAppreciation = appreciation / 100 / 12;
    const futureValue = investment * Math.pow(1 + monthlyAppreciation, timeHorizon);
    const profit = futureValue - investment;
    const roiPercentage = (profit / investment) * 100;
    const annualizedROI = ((futureValue / investment) ** (12 / timeHorizon) - 1) * 100;

    return {
      futureValue: Math.round(futureValue),
      profit: Math.round(profit),
      roiPercentage: Math.round(roiPercentage * 100) / 100,
      annualizedROI: Math.round(annualizedROI * 100) / 100,
      monthlyReturn: Math.round(profit / timeHorizon)
    };
  };

  const results = calculateROI();

  return (
    <div className="imperial-card p-6 bg-soberano-deep/50 border border-soberano-gold/30">
      <h3 className="text-xl font-semibold text-soberano-gold mb-4">📊 Simulador ROI</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-soberano-pearl text-sm mb-2">
            Investimento (R$)
          </label>
          <input
            type="number"
            value={investment}
            onChange={(e) => setInvestment(Number(e.target.value))}
            className="w-full px-3 py-2 bg-soberano-deep/70 border border-soberano-gold/30 rounded-lg text-soberano-pearl focus:border-soberano-gold focus:outline-none"
            min="10000"
            step="5000"
          />
        </div>

        <div>
          <label className="block text-soberano-pearl text-sm mb-2">
            Horizonte (meses)
          </label>
          <input
            type="range"
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(Number(e.target.value))}
            className="w-full"
            min="6"
            max="60"
          />
          <div className="text-center text-soberano-pearl text-sm">{timeHorizon} meses</div>
        </div>

        <div>
          <label className="block text-soberano-pearl text-sm mb-2">
            Apreciação Anual (%)
          </label>
          <input
            type="range"
            value={appreciation}
            onChange={(e) => setAppreciation(Number(e.target.value))}
            className="w-full"
            min="5"
            max="30"
          />
          <div className="text-center text-soberano-pearl text-sm">{appreciation}%</div>
        </div>

        <button
          onClick={() => setShowResults(!showResults)}
          className="w-full btn-gold-glow"
        >
          {showResults ? '🔄 Recalcular' : '📈 Calcular ROI'}
        </button>

        {showResults && (
          <div className="mt-6 p-4 bg-soberano-gold/10 rounded-lg border border-soberano-gold/30">
            <h4 className="text-lg font-semibold text-soberano-gold mb-3">Resultados</h4>
            
            <div className="space-y-2 text-soberano-pearl">
              <div className="flex justify-between">
                <span>Valor Futuro:</span>
                <span className="font-bold text-soberano-gold">
                  R$ {results.futureValue.toLocaleString('pt-BR')}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Lucro Total:</span>
                <span className="font-bold text-soberano-emerald">
                  R$ {results.profit.toLocaleString('pt-BR')}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>ROI Total:</span>
                <span className="font-bold text-soberano-gold">
                  {results.roiPercentage}%
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>ROI Anualizado:</span>
                <span className="font-bold text-soberano-gold">
                  {results.annualizedROI}%
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Retorno Mensal:</span>
                <span className="font-bold text-soberano-emerald">
                  R$ {results.monthlyReturn.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-soberano-emerald/10 rounded text-xs text-soberano-pearl">
              <strong>📋 Análise:</strong> {results.roiPercentage > 50 ? 'Excelente oportunidade!' : results.roiPercentage > 25 ? 'Bom investimento!' : 'Considere maior horizonte.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
