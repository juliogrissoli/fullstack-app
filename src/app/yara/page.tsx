'use client';

import { useState } from 'react';

interface Mensagem {
  role: 'user' | 'yara';
  text: string;
}

const SUGESTOES = [
  'Buscar imóvel com ROI > 12%',
  'Calcular valorização em 3 anos',
  'Análise de mercado Ribeirão Preto',
  'AVM terreno 500m² no Centro',
];

export default function YaraPage() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    { role: 'yara', text: 'Olá! Sou a Yara, inteligência da Anjoimob. Como posso ajudar você hoje?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function enviar(texto?: string) {
    const query = texto ?? input;
    if (!query.trim()) return;

    setMensagens((m) => [...m, { role: 'user', text: query }]);
    setInput('');
    setLoading(true);

    // Tentar busca semântica primeiro
    const res = await fetch('/api/yara/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const json = await res.json();

    let resposta: string;
    if (json.error) {
      resposta = `Não consegui processar: ${json.error}`;
    } else if (json.total === 0) {
      resposta = 'Não encontrei imóveis com esse perfil no momento. Tente refinar sua busca ou consulte o Banco de Áreas.';
    } else {
      const nomes = json.results
        .slice(0, 3)
        .map((r: Record<string, unknown>, i: number) => `${i + 1}. ${r.titulo ?? r.id} — R$ ${Number(r.valor ?? 0).toLocaleString('pt-BR')}`)
        .join('\n');
      resposta = `Encontrei ${json.total} imóveis compatíveis:\n${nomes}`;
    }

    setMensagens((m) => [...m, { role: 'yara', text: resposta }]);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#0A192F] flex flex-col">
      <header className="bg-[#0A192F] border-b border-[#D4AF37] px-6 py-4">
        <h1 className="text-xl font-bold text-[#D4AF37]">Yara — IA da Anjoimob</h1>
        <p className="text-gray-400 text-sm">Busca semântica, AVM e análise de mercado</p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl mx-auto w-full">
        {mensagens.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line ${
                m.role === 'user'
                  ? 'bg-[#D4AF37] text-[#0A192F] font-medium'
                  : 'bg-gray-800 text-gray-200 border border-gray-700'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3">
              <span className="animate-pulse text-[#D4AF37] text-sm">Yara está pensando...</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-800 p-4 max-w-3xl mx-auto w-full">
        <div className="flex gap-2 mb-3 flex-wrap">
          {SUGESTOES.map((s) => (
            <button
              key={s}
              onClick={() => enviar(s)}
              className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-full hover:border-[#D4AF37] hover:text-[#D4AF37] transition"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviar()}
            placeholder="Pergunte à Yara..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#D4AF37] focus:outline-none"
          />
          <button
            onClick={() => enviar()}
            disabled={loading || !input.trim()}
            className="px-5 py-3 bg-[#D4AF37] text-[#0A192F] rounded-xl font-semibold hover:bg-yellow-400 transition disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </div>
    </main>
  );
}
