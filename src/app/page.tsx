'use client';

import { useState } from 'react';
import Link from 'next/link';
import HomeWidgets from '@/components/HomeWidgets';
import JornadaCTA from '@/components/JornadaCTA';
import YaraFloatingButton from '@/components/YaraFloatingButton';

const PLANOS = [
  {
    id: 'basic',
    nome: 'Básico',
    descricao: 'Ideal para corretores iniciantes',
    preco_mensal: 97,
    preco_anual: 970,
    features: ['Até 10 imóveis', 'Até 50 leads', 'Dashboard básico'],
  },
  {
    id: 'professional',
    nome: 'Profissional',
    descricao: 'Para corretores em crescimento',
    preco_mensal: 197,
    preco_anual: 1970,
    features: ['Até 50 imóveis', 'Até 200 leads', 'Dashboard avançado', 'LGPD Compliance'],
  },
  {
    id: 'enterprise',
    nome: 'Enterprise',
    descricao: 'Solução completa para empresas',
    preco_mensal: 397,
    preco_anual: 3970,
    features: ['Imóveis ilimitados', 'Leads ilimitados', 'Dashboard completo', 'API exclusiva'],
  },
];

function formatarPreco(preco: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(preco);
}

export default function LandingPage() {
  const [isAnual, setIsAnual] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-yellow-500">🏛️ Security Broker SB</h1>
            <div className="flex space-x-4 items-center">
              <Link href="/planos" className="text-gray-300 hover:text-white transition">
                Planos
              </Link>
              <Link href="/login" className="text-gray-300 hover:text-white transition">
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg hover:bg-yellow-400 transition font-semibold"
              >
                Criar Conta
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold mb-6">
            O Sistema Operacional do
            <span className="text-yellow-500 block">Corretor Moderno</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            CRM completo, gestão de imóveis, rede multinível e SB Academy em uma única plataforma.
            Transforme sua carreira imobiliária com tecnologia de ponta.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/cadastro" className="btn-gold-glow text-lg px-8 py-4 text-center">
              Criar conta grátis 7 dias
            </Link>
            <Link
              href="/planos"
              className="border-2 border-yellow-500 text-yellow-500 px-8 py-4 rounded-lg hover:bg-yellow-500 hover:text-gray-900 transition text-lg text-center"
            >
              Ver Planos
            </Link>
          </div>
        </div>
      </section>

      {/* Seção de Widgets (AVM + BuyAbility) */}
      <HomeWidgets />

      {/* Seção de Jornadas */}
      <JornadaCTA />

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Tudo que você precisa para
            <span className="text-yellow-500 block">alavancar suas vendas</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: '🏠', title: 'Gestão de Imóveis', desc: 'Controle completo do seu portfólio com fotos, descrições e status em tempo real' },
              { icon: '👥', title: 'CRM Inteligente', desc: 'Organize leads, acompanhe negociações e feche mais negócios' },
              { icon: '🌐', title: 'Rede Multinível', desc: 'Ganhe receita recorrente indicando outros corretores' },
              { icon: '🎓', title: 'SB Academy', desc: 'Cursos exclusivos para dominar o mercado imobiliário' },
            ].map((f) => (
              <div key={f.title} className="text-center">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Escolha seu plano e
            <span className="text-yellow-500 block">comece a crescer</span>
          </h2>

          <div className="flex justify-center mb-12">
            <div className="bg-gray-800 rounded-lg p-1 flex">
              <button
                onClick={() => setIsAnual(false)}
                className={`px-6 py-2 rounded-lg transition ${!isAnual ? 'bg-yellow-500 text-gray-900' : 'text-gray-400 hover:text-white'}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setIsAnual(true)}
                className={`px-6 py-2 rounded-lg transition ${isAnual ? 'bg-yellow-500 text-gray-900' : 'text-gray-400 hover:text-white'}`}
              >
                Anual (20% OFF)
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PLANOS.map((plano) => (
              <div
                key={plano.id}
                className={`bg-gray-800 rounded-lg p-8 border-2 ${plano.id === 'professional' ? 'border-yellow-500 transform scale-105' : 'border-gray-700'}`}
              >
                {plano.id === 'professional' && (
                  <div className="bg-yellow-500 text-gray-900 text-sm font-semibold px-3 py-1 rounded-full text-center mb-4">
                    MAIS POPULAR
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plano.nome}</h3>
                <p className="text-gray-400 mb-6">{plano.descricao}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-yellow-500">
                    {formatarPreco(isAnual ? plano.preco_anual / 12 : plano.preco_mensal)}
                  </span>
                  <span className="text-gray-400">/mês</span>
                  {isAnual && <div className="text-sm text-green-400 mt-2">Economize 20% no plano anual</div>}
                </div>
                <ul className="space-y-3 mb-8">
                  {plano.features.map((f) => (
                    <li key={f} className="flex items-center">
                      <span className="text-green-400 mr-2">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/cadastro?plano=${plano.id}`}
                  className={`w-full block text-center py-3 rounded-lg font-semibold transition ${plano.id === 'professional' ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                  Começar Agora
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Como funciona a
            <span className="text-yellow-500 block">rede multinível SB</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: '1', title: 'Indique Amigos', desc: 'Compartilhe seu link de indicação e convide outros corretores para a plataforma' },
              { n: '2', title: 'Ganhe Recorrente', desc: 'Receba 20% sobre honorários de quem você indicou, distribuídos em 5 níveis' },
              { n: '3', title: 'Cresça Sem Limites', desc: 'Construa uma rede lucrativa e tenha renda passiva enquanto foca em vendas' },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="bg-yellow-500 text-gray-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  {s.n}
                </div>
                <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
                <p className="text-gray-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Pronto para revolucionar
            <span className="text-yellow-500 block">sua carreira imobiliária?</span>
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Comece agora com 7 dias grátis. Sem compromisso, sem cartão de crédito.
          </p>
          <Link href="/cadastro" className="btn-gold-glow text-lg px-8 py-4 inline-block">
            Criar Conta Grátis
          </Link>
        </div>
      </section>

      <YaraFloatingButton />

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-700 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold text-yellow-500 mb-4">🏛️ Security Broker SB</h3>
              <p className="text-gray-400">O Sistema Operacional do Corretor Moderno</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/planos" className="hover:text-white">Planos</Link></li>
                <li><Link href="/diagnostico" className="hover:text-white">Diagnóstico</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Conta</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/login" className="hover:text-white">Entrar</Link></li>
                <li><Link href="/cadastro" className="hover:text-white">Criar conta</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/termos" className="hover:text-white">Termos de Uso</Link></li>
                <li><Link href="/privacidade" className="hover:text-white">Privacidade</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2026 Security Broker SB. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
