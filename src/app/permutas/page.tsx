'use client';

import { useState, useEffect } from 'react';

interface Permuta {
  id: string;
  tipo: string;
  descricao: string;
  valor_estimado: number | null;
  status: string;
  created_at: string;
}

const TIPOS = ['imovel', 'terreno', 'cota', 'servico', 'outro'];

export default function PermutasPage() {
  const [permutas, setPermutas] = useState<Permuta[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo: 'imovel', descricao: '', valor_estimado: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/permutas')
      .then((r) => r.json())
      .then((d) => setPermutas(d.permutas ?? []));
  }, []);

  async function handleCriar() {
    setLoading(true);
    const res = await fetch('/api/permutas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: form.tipo,
        descricao: form.descricao,
        valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : null,
      }),
    });
    const json = await res.json();
    if (json.success) {
      setPermutas((p) => [json.permuta, ...p]);
      setShowForm(false);
      setForm({ tipo: 'imovel', descricao: '', valor_estimado: '' });
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-yellow-500">Permutas</h1>
          <p className="text-gray-400 mt-1">Troque ativos imobiliários sem dinheiro</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg font-semibold hover:bg-yellow-400 transition"
        >
          + Nova Permuta
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-xl border border-yellow-500 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Criar Permuta</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Valor estimado (R$)</label>
              <input
                type="number"
                value={form.valor_estimado}
                onChange={(e) => setForm({ ...form, valor_estimado: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="0"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              placeholder="Descreva o ativo para permuta..."
            />
          </div>
          <button
            onClick={handleCriar}
            disabled={loading || !form.descricao}
            className="px-6 py-2 bg-yellow-500 text-gray-900 rounded-lg font-semibold hover:bg-yellow-400 transition disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar Permuta'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {permutas.length > 0 ? permutas.map((p) => (
          <div key={p.id} className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <div className="flex items-start justify-between mb-2">
              <span className="px-2 py-0.5 bg-blue-900 text-blue-300 rounded-full text-xs font-medium uppercase">
                {p.tipo}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${p.status === 'aberto' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                {p.status}
              </span>
            </div>
            <p className="text-gray-300 text-sm mt-2 mb-3">{p.descricao}</p>
            {p.valor_estimado && (
              <p className="text-yellow-400 font-semibold">
                R$ {Number(p.valor_estimado).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        )) : (
          <div className="col-span-2 text-center text-gray-500 py-16">
            Nenhuma permuta aberta. Seja o primeiro!
          </div>
        )}
      </div>
    </main>
  );
}
