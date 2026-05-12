import Link from 'next/link';

export default function ObrigadoPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="max-w-lg text-center">
        <p className="text-6xl mb-6">🦅</p>
        <h1 className="text-4xl font-bold text-[#D4AF37] mb-4">Recebemos seu contato!</h1>
        <p className="text-gray-300 text-lg mb-8">
          Nossa equipe entrará em contato em até 24h para apresentar o diagnóstico completo do seu empreendimento.
        </p>
        <Link href="/" className="btn-gold-glow px-8 py-3 rounded-lg font-semibold inline-block">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
