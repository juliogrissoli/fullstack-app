export const dynamic = 'force-dynamic';

const servicos = [
    { titulo: 'Gestão de Lançamentos', descricao: 'Estratégia completa: estudo de cenário, plano comercial, jurídico e crédito. Operação do dia D.', icone: '🏗️' },
    { titulo: 'Marketing Inteligente', descricao: 'Campanhas com BI, tráfego pago, SDR digital e IA para gerar leads qualificados.', icone: '📢' },
    { titulo: 'Crédito Imobiliário', descricao: 'Análise de crédito integrada, acompanhamento do repasse bancário em tempo real.', icone: '💰' },
    { titulo: 'Gestão de Recebíveis', descricao: 'Controle total do fluxo financeiro: recebíveis, comissões e repasses automatizados.', icone: '📊' },
    { titulo: 'Vistoria Soberana', descricao: 'Vistorias com Hash SHA-256 (Protocolo Ouroboros) — prova jurídica imutável.', icone: '🔍' },
    { titulo: 'Plataforma Única', descricao: 'Funil completo, BI, contratos digitais, assistente Yara IA — sem precisar de CRM externo.', icone: '🦅' }
];

export default function CoordenacaoMasterPage() {
    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="max-w-6xl mx-auto px-4 py-16">
                <h1 className="text-4xl font-bold text-center mb-4">
                    🏛️ Coordenação <span className="text-[#D4AF37]">Master</span>
                </h1>
                <p className="text-center text-gray-400 mb-4">
                    Sua construtora não precisa de 10 fornecedores. Precisa de 1 parceiro.
                </p>
                <p className="text-center text-2xl font-bold text-[#D4AF37] mb-12">
                    Taxa fixa: 2% sobre o VGV
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {servicos.map((s) => (
                        <div key={s.titulo} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-[#D4AF37] transition">
                            <p className="text-4xl mb-4">{s.icone}</p>
                            <h3 className="text-xl font-bold text-white mb-2">{s.titulo}</h3>
                            <p className="text-gray-400">{s.descricao}</p>
                        </div>
                    ))}
                </div>

                <div className="text-center">
                    <a href="/incorporadora" className="btn-gold-glow px-8 py-4 rounded-lg text-lg font-bold">
                        Solicitar Diagnóstico Gratuito
                    </a>
                </div>
            </div>
        </div>
    );
}
