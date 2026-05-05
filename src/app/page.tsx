// 🏛️ SECURITY BROKER SB v7.0 - LANDING PAGE
// Página principal com hero, planos e CTA

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface Plano {
  id: string;
  nome: string;
  descricao: string;
  preco_mensal: number;
  preco_anual: number;
  features: string[];
  limite_imoveis: number;
  limite_leads: number;
}

export default function LandingPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [isAnual, setIsAnual] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    buscarPlanos();
  }, []);

  const buscarPlanos = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      setPlanos(data || []);
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const formatarPreco = (preco: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(preco);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-yellow-500">🏛️ Security Broker SB</h1>
            </div>
            <div className="flex space-x-4">
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

      {/* Hero Section */}
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
            <Link 
              href="/cadastro" 
              className="btn-gold-glow text-lg px-8 py-4 text-center"
            >
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

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Tudo que você precisa para
            <span className="text-yellow-500 block">alavancar suas vendas</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">🏠</div>
              <h3 className="text-xl font-semibold mb-2">Gestão de Imóveis</h3>
              <p className="text-gray-400">Controle completo do seu portfólio com fotos, descrições e status em tempo real</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold mb-2">CRM Inteligente</h3>
              <p className="text-gray-400">Organize leads, acompanhe negociações e feche mais negócios</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🌐</div>
              <h3 className="text-xl font-semibold mb-2">Rede Multinível</h3>
              <p className="text-gray-400">Ganhe receita recorrente indicando outros corretores</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🎓</div>
              <h3 className="text-xl font-semibold mb-2">SB Academy</h3>
              <p className="text-gray-400">Cursos exclusivos para dominar o mercado imobiliário</p>
            </div>
          </div>
        </div>
      </section>

      {/* Planos Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Escolha seu plano e
            <span className="text-yellow-500 block">comece a crescer</span>
          </h2>
          
          {/* Toggle Mensal/Anual */}
          <div className="flex justify-center mb-12">
            <div className="bg-gray-800 rounded-lg p-1 flex">
              <button
                onClick={() => setIsAnual(false)}
                className={`px-6 py-2 rounded-lg transition ${
                  !isAnual 
                    ? 'bg-yellow-500 text-gray-900' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setIsAnual(true)}
                className={`px-6 py-2 rounded-lg transition ${
                  isAnual 
                    ? 'bg-yellow-500 text-gray-900' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Anual (20% OFF)
              </button>
            </div>
          </div>

          {/* Planos Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {planos.map((plano) => (
              <div 
                key={plano.id} 
                className={`bg-gray-800 rounded-lg p-8 border-2 ${
                  plano.nome === 'Pro' 
                    ? 'border-yellow-500 transform scale-105' 
                    : 'border-gray-700'
                }`}
              >
                {plano.nome === 'Pro' && (
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
                  {isAnual && (
                    <div className="text-sm text-green-400 mt-2">
                      Economize 20% no plano anual
                    </div>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {JSON.parse(plano.features || '[]').map((feature: string, index: number) => (
                    <li key={index} className="flex items-center">
                      <span className="text-green-400 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link 
                  href={`/cadastro?plano=${plano.id}`}
                  className={`w-full block text-center py-3 rounded-lg font-semibold transition ${
                    plano.nome === 'Pro'
                      ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Começar Agora
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como Funciona Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Como funciona a
            <span className="text-yellow-500 block">rede multinível SB</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-yellow-500 text-gray-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Indique Amigos</h3>
              <p className="text-gray-400">Compartilhe seu link de indicação e convide outros corretores para a plataforma</p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-500 text-gray-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Ganhe Recorrente</h3>
              <p className="text-gray-400">Receba 20% sobre honorários de quem você indicou, distribuídos em 5 níveis</p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-500 text-gray-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Cresça Sem Limites</h3>
              <p className="text-gray-400">Construa uma rede lucrativa e tenha renda passiva enquanto foca em vendas</p>
            </div>
          </div>
        </div>
      </section>

      {/* Depoimentos Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Corretores que estão
            <span className="text-yellow-500 block">transformando resultados</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-yellow-500 rounded-full mr-4"></div>
                <div>
                  <h4 className="font-semibold">João Silva</h4>
                  <p className="text-gray-400 text-sm">São Paulo, SP</p>
                </div>
              </div>
              <p className="text-gray-300">
                "A SB transformou meu negócio. Com a rede multinível, tenho renda extra todo mês enquanto foco em vender mais."
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-yellow-500 rounded-full mr-4"></div>
                <div>
                  <h4 className="font-semibold">Maria Santos</h4>
                  <p className="text-gray-400 text-sm">Rio de Janeiro, RJ</p>
                </div>
              </div>
              <p className="text-gray-300">
                "O CRM é incrível! Organizo todos meus leads e fecho 30% mais negócios. Os cursos da Academy são fantásticos."
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-yellow-500 rounded-full mr-4"></div>
                <div>
                  <h4 className="font-semibold">Pedro Costa</h4>
                  <p className="text-gray-400 text-sm">Belo Horizonte, MG</p>
                </div>
              </div>
              <p className="text-gray-300">
                "Indiquei 5 corretores e já ganho mais de R$ 2.000 por mês só da rede. A SB é revolucionária!"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Pronto para revolucionar
            <span className="text-yellow-500 block">sua carreira imobiliária?</span>
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Comece agora com 7 dias grátis. Sem compromisso, sem cartão de crédito.
          </p>
          <Link 
            href="/cadastro" 
            className="btn-gold-glow text-lg px-8 py-4 inline-block"
          >
            Criar Conta Grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-700 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold text-yellow-500 mb-4">🏛️ Security Broker SB</h3>
              <p className="text-gray-400">
                O Sistema Operacional do Corretor Moderno
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/planos" className="hover:text-white">Planos</Link></li>
                <li><Link href="/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/academy" className="hover:text-white">SB Academy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/sobre" className="hover:text-white">Sobre nós</Link></li>
                <li><Link href="/contato" className="hover:text-white">Contato</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/termos" className="hover:text-white">Termos de Uso</Link></li>
                <li><Link href="/privacidade" className="hover:text-white">Política de Privacidade</Link></li>
                <li><Link href="/lgpd" className="hover:text-white">LGPD</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2026 Security Broker SB v7.0. Todos os direitos reservados.</p>
            <p className="mt-2">Powered by Security Broker SB</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
