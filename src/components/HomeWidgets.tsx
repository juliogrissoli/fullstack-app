'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeWidgets() {
  const router = useRouter();

  // Widget AVM
  const [avmEndereco, setAvmEndereco] = useState('');
  const [avmResultado, setAvmResultado] = useState<any>(null);
  const [avmLoading, setAvmLoading] = useState(false);

  const handleAVM = async () => {
    if (!avmEndereco) return;
    setAvmLoading(true);
    try {
      const res = await fetch('/api/yara/avm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endereco: avmEndereco })
      });
      const data = await res.json();
      setAvmResultado(data);
    } catch (error) {
      console.error('Erro AVM:', error);
    } finally {
      setAvmLoading(false);
    }
  };

  // Widget BuyAbility
  const [buyAbility, setBuyAbility] = useState({ renda: 0, entrada: 0, prazo: 'medio' });
  const [buyResult, setBuyResult] = useState<any>(null);
  const [buyLoading, setBuyLoading] = useState(false);

  const handleBuyAbility = async () => {
    if (!buyAbility.renda || !buyAbility.entrada) return;
    setBuyLoading(true);
    try {
      const res = await fetch('/api/lead/qualificacao-rapida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buyAbility)
      });
      const data = await res.json();
      setBuyResult(data);
      if (data.score >= 70) {
        router.push('/qualifica');
      }
    } catch (error) {
      console.error('Erro BuyAbility:', error);
    } finally {
      setBuyLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto px-4 py-12">
      {/* Widget AVM */}
      <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 hover:border-[#D4AF37] transition">
        <h3 className="text-2xl font-bold text-[#D4AF37] mb-2">
          🏠 Quanto vale seu imóvel?
        </h3>
        <p className="text-gray-400 mb-6">
          Descubra em 10 segundos com nossa IA de precificação.
        </p>
        <input
          type="text"
          placeholder="Digite o endereço completo"
          value={avmEndereco}
          onChange={(e) => setAvmEndereco(e.target.value)}
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg mb-4 text-white focus:outline-none focus:border-[#D4AF37]"
        />
        <button
          onClick={handleAVM}
          disabled={avmLoading}
          className="btn-gold-glow w-full py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {avmLoading ? 'Calculando...' : 'Ver Valor Estimado'}
        </button>
        {avmResultado && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-green-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avmResultado.valor_estimado || 0)}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Faixa: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avmResultado.faixa_min || 0)} – {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avmResultado.faixa_max || 0)}
            </p>
            <button
              onClick={() => router.push('/qualifica')}
              className="mt-3 text-[#D4AF37] hover:underline text-sm"
            >
              Quero vender com proteção Anjoimob →
            </button>
          </div>
        )}
      </div>

      {/* Widget BuyAbility */}
      <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 hover:border-[#D4AF37] transition">
        <h3 className="text-2xl font-bold text-[#D4AF37] mb-2">
          💰 Quanto você pode investir?
        </h3>
        <p className="text-gray-400 mb-6">
          Responda 3 perguntas e descubra seu poder de compra.
        </p>
        <input
          type="number"
          placeholder="Renda mensal (R$)"
          value={buyAbility.renda || ''}
          onChange={(e) => setBuyAbility({ ...buyAbility, renda: Number(e.target.value) })}
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg mb-3 text-white focus:outline-none focus:border-[#D4AF37]"
        />
        <input
          type="number"
          placeholder="Valor de entrada (R$)"
          value={buyAbility.entrada || ''}
          onChange={(e) => setBuyAbility({ ...buyAbility, entrada: Number(e.target.value) })}
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg mb-3 text-white focus:outline-none focus:border-[#D4AF37]"
        />
        <select
          value={buyAbility.prazo}
          onChange={(e) => setBuyAbility({ ...buyAbility, prazo: e.target.value })}
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg mb-4 text-white focus:outline-none focus:border-[#D4AF37]"
        >
          <option value="urgente">Quero resolver em até 30 dias</option>
          <option value="medio">Em 1 a 3 meses</option>
          <option value="longo">Em mais de 3 meses</option>
        </select>
        <button
          onClick={handleBuyAbility}
          disabled={buyLoading}
          className="btn-gold-glow w-full py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {buyLoading ? 'Calculando...' : 'Descobrir Meu Poder de Compra'}
        </button>
        {buyResult && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <p className={`text-2xl font-bold ${buyResult.score >= 70 ? 'text-green-400' : buyResult.score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
              Score: {buyResult.score}/100
            </p>
            <p className="text-gray-300 mt-1">{buyResult.mensagem}</p>
            {buyResult.score >= 70 && (
              <button
                onClick={() => router.push('/qualifica')}
                className="mt-3 btn-gold-glow px-4 py-2 rounded-lg text-sm"
              >
                Ver Imóveis para o Meu Perfil →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
