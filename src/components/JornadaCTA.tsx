import Link from 'next/link';

const jornadas = [
  { titulo: 'Quero Investir', descricao: 'Acesse ativos de alto retorno, com blindagem jurídica e inteligência de mercado.', link: '/qualifica?perfil=investidor', icone: '📈', cor: 'border-green-500 hover:bg-green-900/20' },
  { titulo: 'Quero Comprar', descricao: 'Encontre o imóvel ideal com proteção de comissão e Nexo Causal garantido.', link: '/qualifica?perfil=comprador', icone: '🏡', cor: 'border-blue-500 hover:bg-blue-900/20' },
  { titulo: 'Sou Incorporadora', descricao: 'Coordenação master de lançamentos, banco de áreas e matching com investidores.', link: '/qualifica?perfil=incorporadora', icone: '🏗️', cor: 'border-purple-500 hover:bg-purple-900/20' }
];

export default function JornadaCTA() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-center text-white mb-8">Como a <span className="text-[#D4AF37]">Anjoimob</span> pode te ajudar?</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {jornadas.map((j) => (
          <Link key={j.titulo} href={j.link} className={`bg-gray-800 rounded-xl p-8 border ${j.cor} transition text-center`}>
            <p className="text-4xl mb-4">{j.icone}</p>
            <h3 className="text-xl font-bold text-white mb-3">{j.titulo}</h3>
            <p className="text-gray-400">{j.descricao}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
