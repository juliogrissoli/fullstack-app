'use client';

import { useEffect, useState } from 'react';
import { SecurityBroker } from '@/lib/security';

interface ComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  type: 'data_processing' | 'risk_disclosure' | 'investment_terms';
}

export function ModalCompliance({ isOpen, onClose, onAccept, type }: ComplianceModalProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
      setIsAccepting(false);
    }
  }, [isOpen]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
    setHasScrolledToBottom(isAtBottom);
  };

  const handleAccept = async () => {
    if (!hasScrolledToBottom) return;
    
    setIsAccepting(true);
    
    try {
      // Log compliance acceptance
      console.log(`📋 Compliance accepted: ${type}`);
      
      // Call the onAccept callback
      onAccept();
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error accepting compliance:', error);
    } finally {
      setIsAccepting(false);
    }
  };

  const getModalContent = () => {
    switch (type) {
      case 'data_processing':
        return {
          title: 'Política de Processamento de Dados',
          content: (
            <div className="space-y-4 text-sm">
              <h3 className="font-semibold text-soberano-gold">🏛️ GEO v8.1 Imperium Edition</h3>
              
              <section>
                <h4 className="font-medium mb-2">1. Coleta de Dados</h4>
                <p>Coletamos informações essenciais para proporcionar a melhor experiência de investimento em terras:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Dados de identificação e contato</li>
                  <li>Informações de perfil e preferências</li>
                  <li>Comportamento de navegação e engajamento</li>
                  <li>Dados transacionais (quando aplicável)</li>
                </ul>
              </section>

              <section>
                <h4 className="font-medium mb-2">2. Uso de Dados</h4>
                <p>Seus dados são utilizados para:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Personalizar sua experiência</li>
                  <li>Análise de inteligência preditiva</li>
                  <li>Validação de conformidade regulatória</li>
                  <li>Comunicação sobre oportunidades</li>
                </ul>
              </section>

              <section>
                <h4 className="font-medium mb-2">3. Segurança e Privacidade</h4>
                <p>Implementamos medidas de segurança de ponta:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Criptografia SHA-256 para dados sensíveis</li>
                  <li>Row Level Security (RLS) dinâmico</li>
                  <li>Auditoria completa de ações</li>
                  <li>Nexo Causal Hash para rastreabilidade</li>
                </ul>
              </section>

              <section>
                <h4 className="font-medium mb-2">4. Seus Direitos</h4>
                <p>Você tem direito a:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Acessar seus dados a qualquer momento</li>
                  <li>Solicificar correções ou exclusão</li>
                  <li>Exportar seus dados</li>
                  <li>Revogar consentimento</li>
                </ul>
              </section>

              <div className="mt-6 p-4 bg-soberano-deep/20 rounded-lg border border-soberano-gold/20">
                <p className="text-xs text-soberano-steel">
                  <strong>Nota Importante:</strong> Ao aceitar esta política, você concorda com nosso processamento de dados 
                  conforme a Lei Geral de Proteção de Dados (LGPD) e regulamentações aplicáveis.
                </p>
              </div>
            </div>
          ),
        };

      case 'risk_disclosure':
        return {
          title: 'Divulgação de Riscos de Investimento',
          content: (
            <div className="space-y-4 text-sm">
              <h3 className="font-semibold text-soberano-gold">⚠️ Aviso Importante</h3>
              
              <section>
                <h4 className="font-medium mb-2">Riscos de Mercado</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Volatilidade do mercado imobiliário</li>
                  <li>Mudanças regulatórias e zoneamento</li>
                  <li>Flutuações econômicas regionais</li>
                  <li>Riscos ambientais e climáticos</li>
                </ul>
              </section>

              <section>
                <h4 className="font-medium mb-2">Riscos Específicos</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Liquidez limitada de ativos</li>
                  <li>Complexidade legal de transações</li>
                  <li>Possíveis disputas de propriedade</li>
                  <li>Custos de manutenção e impostos</li>
                </ul>
              </section>

              <section>
                <h4 className="font-medium mb-2">Recomendações</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Diversifique seus investimentos</li>
                  <li>Consulte assessores especializados</li>
                  <li>Faça due diligence completa</li>
                  <li>Invista apenas capital de risco</li>
                </ul>
              </section>

              <div className="mt-6 p-4 bg-red-900/20 rounded-lg border border-red-500/20">
                <p className="text-xs text-red-400">
                  <strong>Atenção:</strong> Investimentos em terras envolvem riscos significativos e podem resultar 
                  em perdas totais. Investimentos passados não garantem retornos futuros.
                </p>
              </div>
            </div>
          ),
        };

      case 'investment_terms':
        return {
          title: 'Termos e Condições de Investimento',
          content: (
            <div className="space-y-4 text-sm">
              <h3 className="font-semibold text-soberano-gold">📋 Termos de Serviço</h3>
              
              <section>
                <h4 className="font-medium mb-2">1. Elegibilidade</h4>
                <p>Para investir em nossa plataforma, você deve:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Ser maior de 18 anos</li>
                  <li>Ter capacidade legal para contratar</li>
                  <li>Comprovar origem dos recursos</li>
                  <li>Aceitar nossos termos de risco</li>
                </ul>
              </section>

              <section>
                <h4 className="font-medium mb-2">2. Processo de Investimento</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Validação de identidade e documentos</li>
                  <li>Análise de perfil de investidor</li>
                  <li>Aprovação de compliance</li>
                  <li>Execução da transação</li>
                </ul>
              </section>

              <section>
                <h4 className="font-medium mb-2">3. Taxas e Comissões</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Taxa de plataforma: 2% sobre o valor</li>
                  <li>Comissão de sucesso: 5% sobre lucros</li>
                  <li>Taxas legais e registrais</li>
                  <li>Impostos aplicáveis por lei</li>
                </ul>
              </section>

              <section>
                <h4 className="font-medium mb-2">4. Disputas e Resolução</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Mediação como primeiro passo</li>
                  <li>Arbitragem obrigatória</li>
                  <li>Foro de São Paulo/SP</li>
                  <li>Aplicação do direito brasileiro</li>
                </ul>
              </section>

              <div className="mt-6 p-4 bg-soberano-emerald/20 rounded-lg border border-soberano-emerald/20">
                <p className="text-xs text-soberano-emerald">
                  <strong>Transparência:</strong> Todos os termos são claros e não há cláusulas abusivas. 
                  Dúvidas podem ser esclarecidas antes do investimento.
                </p>
              </div>
            </div>
          ),
        };

      default:
        return {
          title: 'Termos de Uso',
          content: <p>Carregando conteúdo...</p>,
        };
    }
  };

  if (!isOpen) return null;

  const modalContent = getModalContent();

  return (
    <div className="imperial-overlay">
      <div className="bg-white dark:bg-soberano-deep rounded-2xl shadow-imperial max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-soberano-deep to-soberano-midnight px-6 py-4 border-b border-soberano-gold/20">
          <h2 className="text-xl font-bold text-soberano-gold">{modalContent.title}</h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-soberano-pearl hover:text-soberano-gold transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto p-6"
          onScroll={handleScroll}
        >
          {modalContent.content}
        </div>

        {/* Footer */}
        <div className="border-t border-soberano-gold/20 p-6 bg-soberano-deep/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${hasScrolledToBottom ? 'bg-soberano-emerald' : 'bg-soberano-steel'}`} />
              <span className="text-sm text-soberano-steel">
                {hasScrolledToBottom ? '✓ Documento lido completamente' : 'Role até o final para habilitar aceite'}
              </span>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-soberano-pearl hover:text-soberano-gold transition-colors"
                disabled={isAccepting}
              >
                Cancelar
              </button>
              <button
                onClick={handleAccept}
                disabled={!hasScrolledToBottom || isAccepting}
                className={`btn-gold-glow disabled:opacity-50 disabled:cursor-not-allowed ${
                  !hasScrolledToBottom || isAccepting ? 'animate-none' : ''
                }`}
              >
                {isAccepting ? (
                  <span className="flex items-center">
                    <div className="loading-imperial mr-2 h-4 w-4" />
                    Processando...
                  </span>
                ) : (
                  'Li e Aceito'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
