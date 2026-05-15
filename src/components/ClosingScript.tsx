'use client';
import { useState } from 'react';

const scripts = [
    {
        situacao: 'Lead visitou o tour mas não deixou contato',
        mensagem: `Olá! Vi que você explorou o tour 360° do imóvel. O que achou?
Tenho informações exclusivas sobre essa unidade que não estão no site.
Posso te mandar aqui mesmo?`,
    },
    {
        situacao: 'Lead deixou contato mas não respondeu',
        mensagem: `Oi [Nome]! Aqui é o [Corretor] da Anjoimob.
Você pediu informações sobre o imóvel e eu separei 3 unidades com o perfil que você busca.
Faz sentido eu te mandar agora ou prefere agendar uma visita?`,
    },
    {
        situacao: 'Lead pediu informações e sumiu após 24h',
        mensagem: `[Nome], bom dia!
Não quero ser insistente, mas aquela unidade que você viu está com alta procura.
Se fizer sentido, consigo segurar uma condição especial até amanhã.
Me diz aqui: quer que eu te mande a simulação?`,
    },
];

export default function ClosingScript() {
    const [copied, setCopied] = useState<number | null>(null);

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopied(index);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-[#D4AF37] mb-4">Scripts de Fechamento</h2>
            <div className="space-y-4">
                {scripts.map((item, i) => (
                    <div key={i} className="bg-gray-700/60 rounded-lg p-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{item.situacao}</p>
                        <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-line mb-3">
                            {item.mensagem}
                        </p>
                        <button
                            onClick={() => handleCopy(item.mensagem, i)}
                            className="text-xs font-medium text-[#D4AF37] hover:text-yellow-300 transition-colors"
                        >
                            {copied === i ? '✓ Copiado!' : 'Copiar script'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
