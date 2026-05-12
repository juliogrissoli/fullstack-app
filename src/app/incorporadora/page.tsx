'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function IncorporadoraPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', empreendimento: '', unidades_paradas: 0, vgv_estimado: 0 });

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    await fetch('/api/lead/incorporadora', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    router.push('/obrigado');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-gray-800 rounded-xl p-8 border border-[#D4AF37]">
        <h1 className="text-3xl font-bold text-[#D4AF37] mb-2">🏗️ Seu estoque está parado?</h1>
        <p className="text-gray-400 mb-6">A Anjoimob assume a coordenação master do seu empreendimento com taxa fixa de 2% sobre o VGV.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Nome da Incorporadora" required className="w-full p-3 bg-gray-700 rounded-lg text-white" onChange={e => setForm({...form, nome: e.target.value})} />
          <input type="email" placeholder="E-mail" required className="w-full p-3 bg-gray-700 rounded-lg text-white" onChange={e => setForm({...form, email: e.target.value})} />
          <input type="tel" placeholder="Telefone" required className="w-full p-3 bg-gray-700 rounded-lg text-white" onChange={e => setForm({...form, telefone: e.target.value})} />
          <input type="text" placeholder="Nome do Empreendimento" required className="w-full p-3 bg-gray-700 rounded-lg text-white" onChange={e => setForm({...form, empreendimento: e.target.value})} />
          <input type="number" placeholder="Unidades paradas" required className="w-full p-3 bg-gray-700 rounded-lg text-white" onChange={e => setForm({...form, unidades_paradas: Number(e.target.value)})} />
          <input type="number" placeholder="VGV estimado (R$)" required className="w-full p-3 bg-gray-700 rounded-lg text-white" onChange={e => setForm({...form, vgv_estimado: Number(e.target.value)})} />
          <button type="submit" className="btn-gold-glow w-full py-3 rounded-lg font-bold">Solicitar Diagnóstico Gratuito</button>
        </form>
      </div>
    </div>
  );
}
