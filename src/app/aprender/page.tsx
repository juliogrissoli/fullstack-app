import Link from 'next/link';

const conteudos = [
  {
    titulo: 'Guia de ROI Imobiliário 2026',
    descricao: 'Como calcular o retorno sobre investimento em imóveis de alto padrão em Ribeirão Preto e região.',
    link: '/aprender/guia-roi',
    icone: '📊'
  },
  {
    titulo: 'Zoneamento e Potencial Construtivo',
    descricao: 'Entenda as regras de zoneamento do Plano Diretor e como elas impactam a valorização do seu terreno.',
    link: '/aprender/zoneamento',
    icone: '🗺️'
  },
  {
    titulo: 'Blindagem de Comissão (Art. 725 CC)',
    descricao: 'Como o Nexo Causal protege o corretor contra bypass e garante o pagamento da comissão.',
    link: '/aprender/nexo-causal',
    icone: '🛡️'
  },
  {
    titulo: 'Land Banking: O Que É e Como Investir',
    descricao: 'Estratégia de aquisição de terrenos para valorização futura. Guia completo para investidores.',
    link: '/aprender/land-banking',
    icone: '🏗️'
  },
  {
    titulo: 'Comparativo PF vs Holding Patrimonial',
    descricao: 'Simulação de carga tributária para pessoa física e holding na compra e venda de imóveis.',
    link: '/aprender/pf-vs-holding',
    icone: '⚖️'
  },
  {
    titulo: 'Índice CBR: Valorização por Bairro',
    descricao: 'Acompanhe a valorização dos principais bairros de Ribeirão Preto com dados atualizados.',
    link: '/aprender/indice-cbr',
    icone: '📈'
  }
];

export default function AprenderPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-center mb-4">
          📚 Central de <span className="text-[#D4AF37]">Conhecimento</span>
        </h1>
        <p className="text-center text-gray-400 mb-12">
          Guias, análises e relatórios para investidores e profissionais do mercado imobiliário.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {conteudos.map((item) => (
            <Link
              key={item.titulo}
              href={item.link}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-[#D4AF37] transition"
            >
              <p className="text-4xl mb-4">{item.icone}</p>
              <h2 className="text-xl font-bold text-white mb-2">{item.titulo}</h2>
              <p className="text-gray-400 text-sm">{item.descricao}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
