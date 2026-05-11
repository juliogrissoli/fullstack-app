import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A192F] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-[#D4AF37] mb-4">404</h1>
        <p className="text-2xl text-white mb-4">Rota não encontrada</p>
        <p className="text-gray-400 mb-8">A Yara está verificando o caminho correto.</p>
        <Link
          href="/dashboard"
          className="btn-gold-glow px-8 py-3 rounded-lg font-semibold"
        >
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  );
}
