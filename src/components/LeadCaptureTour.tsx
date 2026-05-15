'use client';
import { useState } from 'react';

interface Props {
    imovelId: string;
    duracaoSegundos: number;
}

export default function LeadCaptureTour({ imovelId, duracaoSegundos }: Props) {
    const [nome, setNome] = useState('');
    const [telefone, setTelefone] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nome.trim() || !telefone.trim()) return;
        setStatus('sending');

        const res = await fetch('/api/tour/notificar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imovel_id: imovelId,
                lead_nome: nome.trim(),
                lead_telefone: telefone.trim(),
                duracao_segundos: duracaoSegundos,
            }),
        });

        setStatus(res.ok ? 'done' : 'error');
    };

    if (status === 'done') {
        return (
            <div className="bg-gray-800 rounded-xl border border-[#D4AF37]/40 p-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-green-900/40 border border-green-600 flex items-center justify-center mx-auto text-2xl">
                    ✓
                </div>
                <p className="font-bold text-white">Contato recebido!</p>
                <p className="text-gray-400 text-sm">O corretor entrará em contato com você em breve.</p>
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-gray-800 rounded-xl border border-[#D4AF37]/40 p-6 space-y-4"
        >
            <div>
                <p className="font-semibold text-[#D4AF37] text-base">Agendar visita presencial</p>
                <p className="text-gray-400 text-sm mt-0.5">
                    Deixe seu contato e o corretor te responde agora.
                </p>
            </div>

            <div className="space-y-3">
                <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome"
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                />
                <input
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="WhatsApp (ex: 16 99999-0000)"
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                />
            </div>

            {status === 'error' && (
                <p className="text-red-400 text-sm">Erro ao enviar. Tente novamente.</p>
            )}

            <button
                type="submit"
                disabled={status === 'sending' || !nome.trim() || !telefone.trim()}
                className="w-full py-3 bg-[#D4AF37] text-gray-900 font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {status === 'sending' ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                        Enviando…
                    </span>
                ) : 'Quero agendar visita'}
            </button>
        </form>
    );
}
