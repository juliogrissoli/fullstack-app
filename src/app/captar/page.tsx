'use client';

import { useState } from 'react';
import Link from 'next/link';

interface FormData {
    nome: string;
    telefone: string;
    email: string;
}

export default function CaptarPage() {
    const [form, setForm] = useState<FormData>({ nome: '', telefone: '', email: '' });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const searchParams = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : null;
    const utmSource = searchParams?.get('utm_source') ?? 'organico';
    const utmCampaign = searchParams?.get('utm_campaign') ?? null;
    const corretorRef = searchParams?.get('ref') ?? null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.nome.trim() || !form.telefone.trim()) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/leads/capturar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: form.nome.trim(),
                    telefone: form.telefone.trim(),
                    email: form.email.trim() || undefined,
                    utm_source: utmSource,
                    utm_campaign: utmCampaign,
                    corretor_ref: corretorRef,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? 'Erro ao registrar');
            }
            setSuccess(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erro inesperado');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <div className="text-6xl mb-6">🎉</div>
                    <h1 className="text-3xl font-bold text-[#D4AF37] mb-4">Recebemos seu contato!</h1>
                    <p className="text-gray-300 mb-8 leading-relaxed">
                        Um corretor especializado entrará em contato em até 2 horas com imóveis selecionados para o seu perfil.
                    </p>
                    <Link
                        href="/"
                        className="inline-block px-8 py-3 border border-[#D4AF37] text-[#D4AF37] rounded-lg hover:bg-[#D4AF37] hover:text-gray-900 transition-colors font-semibold"
                    >
                        Ver imóveis disponíveis
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="max-w-5xl mx-auto px-4 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* Left — value prop */}
                    <div>
                        <p className="text-[#D4AF37] text-sm font-semibold uppercase tracking-widest mb-4">
                            Anjoimob PRO
                        </p>
                        <h1 className="text-4xl font-bold text-white mb-6 leading-snug">
                            Encontre seu imóvel ideal em 48 horas
                        </h1>
                        <p className="text-gray-400 mb-10 leading-relaxed">
                            Nossa equipe seleciona imóveis com tour 360° de acordo com seu perfil e orçamento.
                            Sem burocracia. Sem perda de tempo.
                        </p>

                        <ul className="space-y-4">
                            {[
                                { icon: '🎬', text: 'Tour virtual 360° antes de qualquer visita' },
                                { icon: '⚡', text: 'Resposta em até 2 horas no horário comercial' },
                                { icon: '🛡️', text: 'Comissão blindada com SHA-256 — seu acordo protegido' },
                                { icon: '📊', text: 'Simulação de financiamento sem consulta ao SPC' },
                            ].map(item => (
                                <li key={item.text} className="flex items-start gap-3">
                                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                                    <span className="text-gray-300 text-sm">{item.text}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-10 flex gap-6 text-center">
                            {[
                                { valor: '+87%', label: 'Mais engajamento' },
                                { valor: '3min', label: 'Lead quente gerado' },
                                { valor: '7 dias', label: 'Garantia de retorno' },
                            ].map(m => (
                                <div key={m.label}>
                                    <p className="text-2xl font-bold text-[#D4AF37]">{m.valor}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right — form */}
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8">
                        <h2 className="text-xl font-bold text-white mb-2">Fale com um especialista</h2>
                        <p className="text-gray-400 text-sm mb-7">
                            Preencha seus dados e receba imóveis selecionados para o seu perfil.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">Nome completo *</label>
                                <input
                                    type="text"
                                    value={form.nome}
                                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                                    placeholder="Seu nome"
                                    required
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">WhatsApp *</label>
                                <input
                                    type="tel"
                                    value={form.telefone}
                                    onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                                    placeholder="(11) 99999-0000"
                                    required
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">E-mail</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="seu@email.com"
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                                />
                            </div>

                            {error && (
                                <p className="text-red-400 text-sm">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !form.nome.trim() || !form.telefone.trim()}
                                className="w-full btn-gold-glow py-4 rounded-lg font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-opacity mt-2"
                            >
                                {loading ? 'Enviando...' : 'Quero ser atendido agora'}
                            </button>

                            <p className="text-xs text-gray-600 text-center">
                                Seus dados são protegidos conforme a LGPD. Sem spam.
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
