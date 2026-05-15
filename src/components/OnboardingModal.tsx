'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const LS_KEY = 'anjoimob_onboarding_done';

const STEPS = [
    {
        titulo: 'Bem-vindo ao Anjoimob',
        descricao: 'Sua plataforma imobiliária de alta performance. Siga as 3 etapas para colocar seu primeiro imóvel no ar.',
        extras: [
            'Tour 360° com detecção automática de intenção de compra',
            'CRM com scoring de leads em tempo real',
            'Analytics de tours e notificações de leads quentes',
            'IA Yara para avaliação automática de mercado',
        ],
    },
    {
        titulo: 'Cadastre seu primeiro imóvel',
        descricao: 'Adicione título, tipo, bairro, valor e fotos. Leva menos de 2 minutos.',
        acao: { label: 'Cadastrar imóvel agora', href: '/imoveis/novo' },
    },
    {
        titulo: 'Crie um tour 360°',
        descricao: 'Envie fotos panorâmicas do imóvel. O sistema notifica você por e-mail quando um visitante demonstra intenção alta de compra.',
        acao: { label: 'Gerenciar tours', href: '/dashboard/tours' },
    },
] as const;

interface Props {
    show: boolean;
}

export default function OnboardingModal({ show }: Props) {
    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState(0);
    const router = useRouter();

    useEffect(() => {
        if (show && typeof window !== 'undefined' && !localStorage.getItem(LS_KEY)) {
            setVisible(true);
        }
    }, [show]);

    const complete = async () => {
        if (typeof window !== 'undefined') localStorage.setItem(LS_KEY, '1');
        setVisible(false);
        const supabase = createClient();
        await supabase.auth.updateUser({ data: { onboarding_completed: true } });
    };

    const handleAcao = async (href: string) => {
        await complete();
        router.push(href);
    };

    if (!visible) return null;

    const current = STEPS[step];
    const isLast = step === STEPS.length - 1;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                onClick={complete}
            />

            <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl">
                {/* Progress bar */}
                <div className="h-1 bg-gray-800 rounded-t-2xl overflow-hidden">
                    <div
                        className="h-full bg-[#D4AF37] transition-all duration-500"
                        style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                    />
                </div>

                <div className="p-8">
                    {/* Step dots */}
                    <div className="flex gap-2 mb-6">
                        {STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                                    i <= step ? 'bg-[#D4AF37]' : 'bg-gray-700'
                                }`}
                            />
                        ))}
                    </div>

                    <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest mb-2">
                        Etapa {step + 1} de {STEPS.length}
                    </p>
                    <h2 className="text-xl font-bold text-white mb-2">{current.titulo}</h2>
                    <p className="text-gray-400 text-sm leading-relaxed">{current.descricao}</p>

                    {'extras' in current && (
                        <ul className="mt-5 space-y-2.5">
                            {current.extras.map(item => (
                                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-300">
                                    <span className="mt-0.5 w-4 h-4 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] text-xs flex-shrink-0">
                                        ✓
                                    </span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="mt-8 flex flex-col gap-2.5">
                        {'acao' in current && current.acao ? (
                            <>
                                <button
                                    onClick={() => handleAcao(current.acao.href)}
                                    className="w-full py-3 bg-[#D4AF37] text-gray-900 font-bold rounded-lg hover:bg-yellow-400 transition-colors"
                                >
                                    {current.acao.label}
                                </button>
                                <button
                                    onClick={() => (isLast ? complete() : setStep(s => s + 1))}
                                    className="w-full py-2.5 text-gray-500 hover:text-gray-300 text-sm transition-colors"
                                >
                                    {isLast ? 'Concluir sem ação' : 'Pular etapa →'}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setStep(s => s + 1)}
                                className="w-full py-3 bg-[#D4AF37] text-gray-900 font-bold rounded-lg hover:bg-yellow-400 transition-colors"
                            >
                                Próximo →
                            </button>
                        )}
                    </div>
                </div>

                <button
                    onClick={complete}
                    aria-label="Fechar"
                    className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-200 transition-colors rounded-full hover:bg-gray-700"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
