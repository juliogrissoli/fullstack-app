'use client';

import { useState } from 'react';

interface Lead {
  id: string;
  lead_name: string;
  status: string;
  score: number;
  corretor: string;
  ultimaAtividade: string;
}

const estagios = [
  { id: 'novo', titulo: 'Novo', cor: 'border-gray-500', bg: 'bg-gray-700' },
  { id: 'contato', titulo: 'Contato', cor: 'border-blue-500', bg: 'bg-blue-900/30' },
  { id: 'qualificado', titulo: 'Qualificado', cor: 'border-yellow-500', bg: 'bg-yellow-900/30' },
  { id: 'visita', titulo: 'Visita', cor: 'border-purple-500', bg: 'bg-purple-900/30' },
  { id: 'proposta', titulo: 'Proposta', cor: 'border-orange-500', bg: 'bg-orange-900/30' },
  { id: 'fechado', titulo: 'Fechado', cor: 'border-green-500', bg: 'bg-green-900/30' },
  { id: 'perdido', titulo: 'Perdido', cor: 'border-red-500', bg: 'bg-red-900/30' }
];

const leadsMock: Lead[] = [
  { id: '1', lead_name: 'Carlos Silva', status: 'novo', score: 85, corretor: 'Ana', ultimaAtividade: 'há 5 min' },
  { id: '2', lead_name: 'Marina Souza', status: 'qualificado', score: 72, corretor: 'Pedro', ultimaAtividade: 'há 2h' },
  { id: '3', lead_name: 'Roberto Lima', status: 'proposta', score: 90, corretor: 'Ana', ultimaAtividade: 'há 30 min' }
];

export default function PipelineKanban() {
  const [leads] = useState<Lead[]>(leadsMock);

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h2 className="text-2xl font-bold text-[#D4AF37] mb-6">📊 Pipeline de Vendas</h2>
      <div className="grid grid-cols-7 gap-4">
        {estagios.map((estagio) => (
          <div key={estagio.id} className={`rounded-lg p-3 ${estagio.bg} border ${estagio.cor}`}>
            <h3 className="text-sm font-bold text-white mb-3">{estagio.titulo}</h3>
            <div className="space-y-3">
              {leads.filter(l => l.status === estagio.id).map((lead) => (
                <div key={lead.id} className="bg-gray-800 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-white">{lead.lead_name}</p>
                  <p className="text-gray-400 text-xs">Corretor: {lead.corretor}</p>
                  <p className="text-[#D4AF37] text-xs">Score: {lead.score}</p>
                  <p className="text-gray-500 text-xs">{lead.ultimaAtividade}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
