'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function YaraFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-[#D4AF37] rounded-full shadow-2xl flex items-center justify-center text-2xl hover:scale-110 transition-all"
        title="Fale com a Yara">🦅</button>
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 bg-gray-800 rounded-xl border border-[#D4AF37] shadow-2xl p-6">
          <p className="text-[#D4AF37] font-bold mb-2">Yara AI</p>
          <p className="text-gray-300 text-sm mb-4">Sou sua assistente de inteligência imobiliária.</p>
          <div className="space-y-2">
            <Link href="/yara?q=Quero investir em imóveis de alto retorno" className="block text-sm text-gray-300 hover:text-[#D4AF37] p-2 bg-gray-700 rounded-lg">💰 Quero investir com alto retorno</Link>
            <Link href="/yara?q=Qual o valor do meu imóvel?" className="block text-sm text-gray-300 hover:text-[#D4AF37] p-2 bg-gray-700 rounded-lg">🏠 Quanto vale meu imóvel?</Link>
            <Link href="/yara?q=Como proteger minha comissão?" className="block text-sm text-gray-300 hover:text-[#D4AF37] p-2 bg-gray-700 rounded-lg">🛡️ Como proteger minha comissão?</Link>
            <Link href="/yara" className="block text-sm text-[#D4AF37] hover:underline p-2 text-center">Abrir chat completo →</Link>
          </div>
        </div>
      )}
    </>
  );
}
