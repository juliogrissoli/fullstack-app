'use client';

import { useState, useEffect } from 'react';

export default function DominioClient() {
  const [slug, setSlug] = useState('');
  const [dominio, setDominio] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/brokers/me')
      .then((r) => r.json())
      .then((d) => {
        setSlug(d.associado_slug ?? '');
        setDominio(d.dominio_personalizado ?? '');
        setInput(d.dominio_personalizado ?? '');
      });
  }, []);

  async function salvar() {
    setLoading(true);
    setMsg('');
    const res = await fetch('/api/brokers/dominio', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dominio_personalizado: input }),
    });
    const json = await res.json();
    if (json.success) {
      setDominio(input);
      setMsg('Domínio salvo com sucesso!');
    } else {
      setMsg(json.error ?? 'Erro ao salvar');
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Domínio Personalizado</h1>
      <p className="text-gray-500 mb-8">Configure seu domínio white label como Associado PRO</p>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-1">Seu slug público</p>
          <code className="bg-gray-100 px-3 py-2 rounded-lg text-sm block">
            anjoimob.com.br/associado/{slug || 'seu-slug'}
          </code>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Domínio personalizado
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toLowerCase().trim())}
            placeholder="seunome.com.br"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Sem https:// — apenas o domínio (ex: corretor.com.br)
          </p>
        </div>

        <button
          onClick={salvar}
          disabled={loading || !input || input === dominio}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar Domínio'}
        </button>

        {msg && (
          <p className={`mt-3 text-sm ${msg.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>
            {msg}
          </p>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h2 className="font-semibold text-blue-800 mb-3">Como configurar o DNS</h2>
        <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
          <li>Acesse o painel do seu registrador de domínio</li>
          <li>Crie um registro CNAME apontando para: <code className="bg-blue-100 px-1 rounded">cname.vercel-dns.com</code></li>
          <li>Salve o domínio aqui acima</li>
          <li>Aguarde propagação DNS (até 48h)</li>
          <li>Adicione o domínio no painel Vercel em Settings → Domains</li>
        </ol>
      </div>
    </main>
  );
}
