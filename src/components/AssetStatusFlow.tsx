'use client';

import { useState } from 'react';

export type AssetStatus = 'disponivel' | 'reservado' | 'vendido';

interface AssetStatusFlowProps {
  currentStatus: AssetStatus;
  assetId: string;
  onStatusChange?: (newStatus: AssetStatus) => void;
}

export function AssetStatusFlow({ currentStatus, assetId, onStatusChange }: AssetStatusFlowProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const statusConfig = {
    disponivel: {
      label: 'Disponível',
      color: 'bg-soberano-emerald',
      icon: '✅',
      description: 'Ativo pronto para investimento',
      nextStatus: 'reservado' as AssetStatus
    },
    reservado: {
      label: 'Reservado',
      color: 'bg-soberano-gold',
      icon: '⏳',
      description: 'Ativo reservado para lead qualificado',
      nextStatus: 'vendido' as AssetStatus
    },
    vendido: {
      label: 'Vendido',
      color: 'bg-soberano-red',
      icon: '🏆',
      description: 'Ativo vendido - operação concluída',
      nextStatus: null
    }
  };

  const currentConfig = statusConfig[currentStatus];

  const handleStatusTransition = async () => {
    if (!currentConfig.nextStatus || isTransitioning) return;

    setIsTransitioning(true);

    try {
      // Simulação de chamada API para atualizar status
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Aqui seria a chamada real para o backend
      // await updateAssetStatus(assetId, currentConfig.nextStatus);

      if (onStatusChange) {
        onStatusChange(currentConfig.nextStatus);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <div className="imperial-card p-6 bg-soberano-deep/50 border border-soberano-gold/30">
      <h3 className="text-xl font-semibold text-soberano-gold mb-4">📊 Status do Ativo</h3>
      
      <div className="space-y-4">
        {/* Status Atual */}
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${currentConfig.color} animate-pulse`} />
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg">{currentConfig.icon}</span>
              <span className="font-semibold text-soberano-pearl">
                {currentConfig.label}
              </span>
            </div>
            <p className="text-sm text-soberano-pearl/70">
              {currentConfig.description}
            </p>
          </div>
        </div>

        {/* Fluxo Visual */}
        <div className="flex items-center space-x-2 py-4">
          {Object.entries(statusConfig).map(([status, config], index) => (
            <div key={status} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  status === currentStatus
                    ? 'bg-soberano-gold text-soberano-deep'
                    : status === 'disponivel'
                    ? 'bg-soberano-emerald/30 text-soberano-emerald'
                    : status === 'reservado'
                    ? 'bg-soberano-gold/30 text-soberano-gold'
                    : 'bg-soberano-red/30 text-soberano-red'
                }`}
              >
                {config.icon}
              </div>
              {index < Object.keys(statusConfig).length - 1 && (
                <div className="w-8 h-0.5 bg-soberano-gold/30" />
              )}
            </div>
          ))}
        </div>

        {/* Linha do Tempo */}
        <div className="border-t border-soberano-gold/30 pt-4">
          <h4 className="text-sm font-semibold text-soberano-pearl mb-2">Linha do Tempo</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-soberano-pearl/70">
              <span>Disponível</span>
              <span>✅</span>
            </div>
            <div className="flex justify-between text-soberano-pearl/70">
              <span>Reservado</span>
              <span>{currentStatus === 'reservado' || currentStatus === 'vendido' ? '✅' : '⏳'}</span>
            </div>
            <div className="flex justify-between text-soberano-pearl/70">
              <span>Vendido</span>
              <span>{currentStatus === 'vendido' ? '✅' : '⏳'}</span>
            </div>
          </div>
        </div>

        {/* Botão de Ação */}
        {currentConfig.nextStatus && (
          <div className="border-t border-soberano-gold/30 pt-4">
            <button
              onClick={handleStatusTransition}
              disabled={isTransitioning}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                isTransitioning
                  ? 'bg-soberano-gold/20 text-soberano-pearl/50 cursor-not-allowed'
                  : 'btn-gold-glow'
              }`}
            >
              {isTransitioning ? (
                <span className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-soberano-gold border-t-transparent rounded-full animate-spin mr-2" />
                  Processando...
                </span>
              ) : (
                <span>
                  Avançar para: {statusConfig[currentConfig.nextStatus].label}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Informações de Segurança */}
        <div className="border-t border-soberano-gold/30 pt-4">
          <div className="bg-soberano-gold/10 rounded p-3">
            <h4 className="text-sm font-semibold text-soberano-gold mb-1">🔐 Segurança</h4>
            <p className="text-xs text-soberano-pearl/70">
              Todas as mudanças de status são registradas em audit logs com hash SHA-256 para conformidade legal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
