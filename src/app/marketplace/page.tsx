'use client';

import { useState, useEffect } from 'react';

interface Prestador {
  id: string;
  nome: string;
  categoria: string;
  descricao?: string;
  avaliacao: number;
  total_avaliacoes: number;
}

const CATEGORIAS = [
  { nome: 'Todos', valor: '' },
  { nome: 'Reforma', valor: 'Reforma' },
  { nome: 'Jurídico', valor: 'Jurídico' },
  { nome: 'Topografia', valor: 'Topografia' },
  { nome: 'Arquitetura', valor: 'Arquitetura' },
  { nome: 'Decoração', valor: 'Decoração' },
  { nome: 'Financiamento', valor: 'Financiamento' },
];

export default function MarketplacePage() {
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [categoria, setCategoria] = useState('');
  const [modal, setModal] = useState<Prestador | null>(null);

  useEffect(() => {
    const url = categoria ? `/api/prestadores?categoria=${categoria}` : '/api/prestadores';
    fetch(url)
      .then((r) => r.json())
      .then((d) => setPrestadores(d.prestadores ?? []));
  }, [categoria]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold text-yellow-500 mb-2">Marketplace Anjoimob</h1>
      <p className="text-gray-400 mb-6">Serviços verificados para corretores e proprietários</p>

      <div className="flex gap-3 mb-8 flex-wrap">
        {CATEGORIAS.map((cat) => (
          <button
            key={cat.valor}
            onClick={() => setCategoria(cat.valor)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              categoria === cat.valor
                ? 'bg-yellow-500 text-gray-900'
                : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-yellow-500'
            }`}
          >
            {cat.nome}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {prestadores.length > 0 ? prestadores.map((p) => (
          <div key={p.id} className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-yellow-500 transition">
            <h3 className="text-lg font-semibold text-yellow-400">{p.nome}</h3>
            <p className="text-gray-400 text-sm mb-2">{p.categoria}</p>
            {p.descricao && <p className="text-gray-500 text-xs mb-3">{p.descricao}</p>}
            <div className="flex items-center mb-4">
              <span className="text-yellow-400">{'★'.repeat(Math.round(p.avaliacao ?? 0))}</span>
              <span className="text-gray-500 text-xs ml-2">
                {Number(p.avaliacao).toFixed(1)} ({p.total_avaliacoes} avaliações)
              </span>
            </div>
            <button
              onClick={() => setModal(p)}
              className="w-full py-2 bg-yellow-500 text-gray-900 rounded-lg font-semibold text-sm hover:bg-yellow-400 transition"
            >
              Contratar
            </button>
          </div>
        )) : (
          <div className="col-span-3 text-center text-gray-500 py-16">
            Nenhum prestador encontrado nesta categoria.
          </div>
        )}
      </div>

      {/* Modal de Contratação */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-yellow-400">{modal.nome}</h2>
                <p className="text-gray-400 text-sm">{modal.categoria}</p>
              </div>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white text-xl">
                ×
              </button>
            </div>

            <p className="text-gray-300 text-sm mb-6">
              {modal.descricao || 'Entre em contato para solicitar orçamento personalizado.'}
            </p>

            <div className="space-y-3">
              <a
                href={`https://wa.me/?text=Olá! Vi seu perfil na Anjoimob e gostaria de um orçamento para ${modal.categoria}.`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-500 transition"
              >
                WhatsApp
              </a>
              <button
                onClick={() => setModal(null)}
                className="w-full py-3 border border-gray-600 text-gray-300 rounded-xl font-semibold hover:border-gray-400 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
