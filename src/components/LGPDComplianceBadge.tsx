/**
 * 🏛️ SB IMPERIUM v14.0 - SELO LGPD COMPLIANT
 * 
 * Componente para exibir status de conformidade LGPD no Dashboard
 */

'use client';

import React, { useState, useEffect } from 'react';
import { validarConformidadeLGPD } from '@/lib/lgpd-compliance';

// 🎨 CORES SOBERANAS
const COLORS = {
  gold: '#D4AF37',
  deepOcean: '#0a1628',
  ocean: '#1e3a5f',
  lightGold: '#f4e5c2',
  white: '#ffffff',
  green: '#4CAF50',
  red: '#f44336',
  orange: '#ff9800'
};

interface LGPDStatus {
  conforme: boolean;
  rls_ativo: boolean;
  tabelas_protegidas: string[];
  tabelas_desprotegidas: string[];
  recomendacoes: string[];
}

interface LGPDComplianceBadgeProps {
  className?: string;
  showDetails?: boolean;
}

export function LGPDComplianceBadge({ className = '', showDetails = false }: LGPDComplianceBadgeProps) {
  const [lgpdStatus, setLgpdStatus] = useState<LGPDStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const validarLGPD = async () => {
      try {
        setIsLoading(true);
        const status = await validarConformidadeLGPD();
        setLgpdStatus(status);
      } catch (error) {
        console.error('❌ Erro ao validar conformidade LGPD:', error);
        setLgpdStatus({
          conforme: false,
          rls_ativo: false,
          tabelas_protegidas: [],
          tabelas_desprotegidas: [],
          recomendacoes: ['Erro na validação de conformidade']
        });
      } finally {
        setIsLoading(false);
      }
    };

    validarLGPD();
    
    // Atualizar a cada 5 minutos
    const interval = setInterval(validarLGPD, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (isLoading) return COLORS.lightGold;
    if (!lgpdStatus) return COLORS.red;
    if (lgpdStatus.conforme) return COLORS.green;
    if (lgpdStatus.tabelas_desprotegidas.length <= 2) return COLORS.orange;
    return COLORS.red;
  };

  const getStatusText = () => {
    if (isLoading) return 'Validando...';
    if (!lgpdStatus) return 'LGPD: Erro';
    if (lgpdStatus.conforme) return 'LGPD: Conforme';
    if (lgpdStatus.tabelas_desprotegidas.length <= 2) return 'LGPD: Parcial';
    return 'LGPD: Não Conforme';
  };

  const getStatusIcon = () => {
    if (isLoading) return '⏳';
    if (!lgpdStatus) return '❌';
    if (lgpdStatus.conforme) return '✅';
    if (lgpdStatus.tabelas_desprotegidas.length <= 2) return '⚠️';
    return '❌';
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${className}`}
           style={{ 
             borderColor: COLORS.gold, 
             backgroundColor: COLORS.deepOcean 
           }}>
        <div className="w-4 h-4 rounded-full animate-pulse"
             style={{ backgroundColor: COLORS.gold }} />
        <span className="text-xs" style={{ color: COLORS.lightGold }}>
          Validando LGPD...
        </span>
      </div>
    );
  }

  return (
    <>
      <div 
        className={`flex items-center gap-2 px-3 py-1 rounded-full border cursor-pointer transition-all hover:opacity-80 ${className}`}
        style={{ 
          borderColor: getStatusColor(), 
          backgroundColor: COLORS.deepOcean 
        }}
        onClick={() => showDetails && setShowModal(true)}
        title={showDetails ? 'Clique para ver detalhes' : 'Status LGPD'}
      >
        <span className="text-sm">{getStatusIcon()}</span>
        <span className="text-xs font-medium" style={{ color: getStatusColor() }}>
          {getStatusText()}
        </span>
        
        {lgpdStatus?.rls_ativo && (
          <span className="text-xs px-1 py-0.5 rounded"
                style={{ 
                  backgroundColor: COLORS.green, 
                  color: COLORS.white 
                }}>
            RLS
          </span>
        )}
      </div>

      {/* Modal de Detalhes */}
      {showDetails && showModal && lgpdStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
             onClick={() => setShowModal(false)}>
          <div 
            className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-gray-600"
            style={{ backgroundColor: COLORS.deepOcean }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2"
                  style={{ color: COLORS.gold }}>
                🏛️ Status de Conformidade LGPD
                <span className={`px-2 py-1 rounded text-xs ${
                  lgpdStatus.conforme 
                    ? 'bg-green-900 text-green-300' 
                    : lgpdStatus.tabelas_desprotegidas.length <= 2
                    ? 'bg-orange-900 text-orange-300'
                    : 'bg-red-900 text-red-300'
                }`}>
                  {getStatusText()}
                </span>
              </h2>
              <button 
                className="text-gray-400 hover:text-white"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Status Geral */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3" style={{ color: COLORS.lightGold }}>
                📊 Visão Geral
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded p-3">
                  <div className="text-sm text-gray-400">Status RLS</div>
                  <div className="text-lg font-bold flex items-center gap-2">
                    {lgpdStatus.rls_ativo ? '✅ Ativo' : '❌ Inativo'}
                  </div>
                </div>
                <div className="bg-gray-700 rounded p-3">
                  <div className="text-sm text-gray-400">Tabelas Protegidas</div>
                  <div className="text-lg font-bold">
                    {lgpdStatus.tabelas_protegidas.length} / {lgpdStatus.tabelas_protegidas.length + lgpdStatus.tabelas_desprotegidas.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabelas Protegidas */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3" style={{ color: COLORS.lightGold }}>
                🛡️ Tabelas com RLS Ativo
              </h3>
              <div className="space-y-2">
                {lgpdStatus.tabelas_protegidas.length > 0 ? (
                  lgpdStatus.tabelas_protegidas.map((tabela, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="text-green-400">✅</span>
                      <span className="text-gray-300">{tabela}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-sm">Nenhuma tabela protegida</div>
                )}
              </div>
            </div>

            {/* Tabelas Desprotegidas */}
            {lgpdStatus.tabelas_desprotegidas.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3" style={{ color: COLORS.lightGold }}>
                  ⚠️ Tabelas sem RLS
                </h3>
                <div className="space-y-2">
                  {lgpdStatus.tabelas_desprotegidas.map((tabela, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="text-red-400">❌</span>
                      <span className="text-gray-300">{tabela}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recomendações */}
            {lgpdStatus.recomendacoes.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3" style={{ color: COLORS.lightGold }}>
                  💡 Recomendações
                </h3>
                <div className="space-y-2">
                  {lgpdStatus.recomendacoes.map((rec, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-yellow-400 mt-0.5">•</span>
                      <span className="text-gray-300">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Informações Adicionais */}
            <div className="border-t border-gray-600 pt-4">
              <div className="text-xs text-gray-400 space-y-1">
                <div>• RLS (Row Level Security) garante acesso apenas aos dados permitidos</div>
                <div>• Conformidade validada em tempo real</div>
                <div>• Status atualizado a cada 5 minutos</div>
                <div>• Direito ao Esquecimento implementado</div>
              </div>
            </div>

            {/* Botão Fechar */}
            <div className="mt-6 text-center">
              <button 
                className="px-4 py-2 rounded font-medium transition-colors"
                style={{ 
                  backgroundColor: COLORS.gold, 
                  color: COLORS.deepOcean 
                }}
                onClick={() => setShowModal(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default LGPDComplianceBadge;
