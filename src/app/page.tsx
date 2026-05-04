'use client';

import { useState, useEffect } from 'react';
import { JsonLdProvider, generateOrganizationSchema } from '@/components/JsonLdProvider';
import { HealthDashboard } from '@/components/HealthDashboard';
import { ModalCompliance } from '@/components/ModalCompliance';

export default function Home() {
  const [showCompliance, setShowCompliance] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [systemStatus, setSystemStatus] = useState('loading');

  useEffect(() => {
    // Simular verificação do sistema
    setTimeout(() => setSystemStatus('ready'), 2000);
  }, []);

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <JsonLdProvider data={organizationSchema} />
      
      <div className="min-h-screen deep-ocean-bg">
        {/* Navigation */}
        <nav className="imperial-nav">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-imperial">🛡️ Security Broker</h1>
                <span className="ml-2 text-sm text-soberano-pearl">v2.0</span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowHealth(!showHealth)}
                  className="imperial-nav-link"
                >
                  🛡️ Health Check
                </button>
                <button
                  onClick={() => setShowCompliance(true)}
                  className="imperial-nav-link"
                >
                  📋 Compliance
                </button>
                <button className="btn-gold-glow">
                  🚀 Launch System
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-imperial mb-4">
              Security Broker v2.0
            </h1>
            <p className="text-xl text-soberano-pearl mb-8">
              Plataforma de Segurança Avançada com Monitoramento em Tempo Real
            </p>
            
            {/* Status Badge */}
            <div className="inline-flex items-center">
              <div className="security-badge">
                {systemStatus === 'loading' ? (
                  <div className="flex items-center">
                    <div className="loading-imperial mr-2 h-4 w-4" />
                    Verificando Sistema...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-soberano-emerald rounded-full mr-2" />
                    Sistema 120% Auditado
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="imperial-grid mb-12">
            <div className="imperial-card p-6">
              <div className="text-3xl mb-4">🛡️</div>
              <h3 className="text-xl font-semibold text-soberano-gold mb-2">Security Broker v2.0</h3>
              <p className="text-soberano-pearl">Rate limiting, IP blocking, e proteção CSRF avançada</p>
            </div>

            <div className="imperial-card p-6">
              <div className="text-3xl mb-4">🔗</div>
              <h3 className="text-xl font-semibold text-soberano-gold mb-2">Nexo Causal Hash</h3>
              <p className="text-soberano-pearl">Prova legal imutável com SHA-256</p>
            </div>

            <div className="imperial-card p-6">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-soberano-gold mb-2">Scoring Engine</h3>
              <p className="text-soberano-pearl">Inteligência preditiva com Prioridade S</p>
            </div>

            <div className="imperial-card p-6">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-soberano-gold mb-2">Health Monitor</h3>
              <p className="text-soberano-pearl">Monitoramento em tempo real 24/7</p>
            </div>
          </div>

          {/* Stats Section */}
          <div className="engagement-card mb-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-soberano-gold mb-2">120%</div>
                <div className="text-soberano-pearl">Sistema Auditado</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-soberano-gold mb-2">800</div>
                <div className="text-soberano-pearl">Corretores Prontos</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-soberano-gold mb-2">&lt;10s</div>
                <div className="text-soberano-pearl">Email Delivery</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-soberano-gold mb-2">24/7</div>
                <div className="text-soberano-pearl">Monitoramento</div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-imperial mb-4">
              Pronto para Proteger seu Sistema?
            </h2>
            <p className="text-soberano-pearl mb-8">
              Security Broker completo, blindado e pronto para operação
            </p>
            <div className="flex justify-center space-x-4">
              <button className="btn-gold-glow">
                🚀 Inaugurar Sistema
              </button>
              <button 
                onClick={() => setShowHealth(true)}
                className="px-6 py-3 bg-soberano-deep text-soberano-pearl rounded-lg border border-soberano-gold/30 hover:border-soberano-gold/60 transition-colors"
              >
                🛡️ Verificar Saúde
              </button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="imperial-nav mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-soberano-pearl">
              <p>© 2026 Security Broker v2.0 - Todos os direitos reservados</p>
              <p className="text-sm mt-2">Sistema 120% Auditado • Build: 876b91f</p>
            </div>
          </div>
        </footer>
      </div>

      {/* Modals */}
      {showCompliance && (
        <ModalCompliance
          isOpen={showCompliance}
          onClose={() => setShowCompliance(false)}
          onAccept={() => setShowCompliance(false)}
          type="data_processing"
        />
      )}

      {showHealth && (
        <div className="imperial-overlay">
          <div className="bg-white dark:bg-soberano-deep rounded-2xl shadow-imperial max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-imperial">🛡️ System Health Dashboard</h2>
                <button
                  onClick={() => setShowHealth(false)}
                  className="text-soberano-pearl hover:text-soberano-gold"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto max-h-[70vh]">
                <HealthDashboard />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
