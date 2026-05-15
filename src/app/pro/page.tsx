import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Anjoimob PRO — Leads Qualificados em 7 Dias',
    description: 'Tour 360° imersivo, leads qualificados e comissão blindada com SHA-256. Teste grátis por 7 dias.',
};

const beneficios = [
    { titulo: 'Tour 360° Imersivo', descricao: 'Seus imóveis com experiência 3D que prende o comprador por minutos, não segundos.', icone: '🎬' },
    { titulo: 'Leads Qualificados', descricao: 'Receba leads que já passaram pelo tour e demonstraram intenção real de compra.', icone: '📞' },
    { titulo: 'Painel de Analytics', descricao: 'Veja quantos visitantes, tempo médio no tour e taxa de conversão por imóvel.', icone: '📊' },
    { titulo: 'Comissão Blindada', descricao: 'Nexo Causal com SHA-256. Sua comissão fica protegida contra bypass.', icone: '🛡️' },
    { titulo: 'Notificação em Tempo Real', descricao: 'Receba alerta por e-mail assim que um lead quente surgir no seu imóvel.', icone: '⚡' },
    { titulo: 'Rede Multinível', descricao: 'Monte sua rede de corretores e ganhe comissão sobre as vendas deles.', icone: '🌐' },
];

const planos = [
    {
        nome: 'Essencial',
        preco: 'R$ 97',
        items: [
            { ok: true, label: 'Até 3 imóveis' },
            { ok: true, label: 'Tour 360° básico' },
            { ok: true, label: 'Analytics simples' },
            { ok: false, label: 'Leads prioritários' },
            { ok: false, label: 'Rede multinível' },
        ],
        href: '/cadastro?plano=essencial',
        destaque: false,
        cta: 'Começar',
    },
    {
        nome: 'PRO',
        preco: 'R$ 297',
        items: [
            { ok: true, label: 'Imóveis ilimitados' },
            { ok: true, label: 'Tour 360° completo' },
            { ok: true, label: 'Analytics avançado' },
            { ok: true, label: 'Leads prioritários' },
            { ok: true, label: 'Rede multinível' },
            { ok: true, label: 'Notificações em tempo real' },
        ],
        href: '/cadastro?plano=pro',
        destaque: true,
        cta: 'Começar Grátis',
    },
    {
        nome: 'Enterprise',
        preco: 'R$ 997',
        items: [
            { ok: true, label: 'Tudo do PRO' },
            { ok: true, label: 'White Label' },
            { ok: true, label: 'API personalizada' },
            { ok: true, label: 'Equipe ilimitada' },
            { ok: true, label: 'Suporte dedicado' },
        ],
        href: '/cadastro?plano=enterprise',
        destaque: false,
        cta: 'Falar com Vendas',
    },
];

export default function ProPage() {
    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Hero */}
            <div className="max-w-6xl mx-auto px-4 py-20 text-center">
                <h1 className="text-5xl font-bold mb-4 text-[#D4AF37]">Anjoimob PRO</h1>
                <p className="text-2xl text-gray-300 mb-4">
                    Leads qualificados em 7 dias ou você não paga.
                </p>
                <p className="text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                    Suba seu imóvel, ative o tour 360° e receba contatos de compradores reais.
                    Se não gerarmos leads qualificados em 7 dias, devolvemos 100% do seu dinheiro.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                    <Link
                        href="/cadastro?plano=pro"
                        className="btn-gold-glow px-8 py-4 rounded-lg text-lg font-bold"
                    >
                        Começar Grátis por 7 Dias
                    </Link>
                    <Link
                        href="#planos"
                        className="border border-[#D4AF37] text-[#D4AF37] px-8 py-4 rounded-lg text-lg font-bold hover:bg-[#D4AF37] hover:text-gray-900 transition-colors"
                    >
                        Ver Planos
                    </Link>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                    {[
                        { valor: '+87%', label: 'Tempo de permanência vs. fotos' },
                        { valor: '3min', label: 'Para gerar lead quente' },
                        { valor: 'SHA-256', label: 'Comissão blindada' },
                    ].map(m => (
                        <div key={m.label} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <p className="text-3xl font-bold text-[#D4AF37]">{m.valor}</p>
                            <p className="text-gray-400 text-sm mt-1">{m.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Benefícios */}
            <div className="max-w-6xl mx-auto px-4 py-16">
                <h2 className="text-3xl font-bold text-center text-[#D4AF37] mb-12">O que o PRO inclui</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {beneficios.map(b => (
                        <div
                            key={b.titulo}
                            className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-[#D4AF37] transition-colors"
                        >
                            <p className="text-4xl mb-4">{b.icone}</p>
                            <h3 className="text-lg font-bold text-white mb-2">{b.titulo}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">{b.descricao}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Planos */}
            <div id="planos" className="max-w-5xl mx-auto px-4 py-16">
                <h2 className="text-3xl font-bold text-center text-[#D4AF37] mb-12">Planos</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {planos.map(p => (
                        <div
                            key={p.nome}
                            className={`bg-gray-800 p-8 rounded-xl text-center relative ${
                                p.destaque ? 'border-2 border-[#D4AF37]' : 'border border-gray-700'
                            }`}
                        >
                            {p.destaque && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-gray-900 text-xs px-3 py-1 rounded-full font-bold">
                                    MAIS POPULAR
                                </span>
                            )}
                            <h3 className="text-xl font-bold text-white mb-2">{p.nome}</h3>
                            <p className="text-3xl font-bold text-[#D4AF37] mb-6">
                                {p.preco}<span className="text-sm text-gray-400 font-normal">/mês</span>
                            </p>
                            <ul className="text-sm text-gray-400 space-y-2 mb-8 text-left">
                                {p.items.map(item => (
                                    <li key={item.label}>
                                        {item.ok ? '✅' : '❌'} {item.label}
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href={p.href}
                                className={`block w-full py-3 rounded-lg font-bold transition-colors ${
                                    p.destaque
                                        ? 'btn-gold-glow'
                                        : 'border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-gray-900'
                                }`}
                            >
                                {p.cta}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>

            {/* Garantia */}
            <div className="max-w-2xl mx-auto px-4 py-16 text-center">
                <p className="text-5xl mb-4">🛡️</p>
                <h2 className="text-2xl font-bold text-[#D4AF37] mb-3">Garantia de 7 Dias</h2>
                <p className="text-gray-400 leading-relaxed">
                    Se em 7 dias você não receber leads qualificados, devolvemos 100% do seu dinheiro.
                    Sem perguntas. Sem letras miúdas.
                </p>
            </div>
        </div>
    );
}
