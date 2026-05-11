'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log automático — integra com monitoramento-soberano em produção
    console.error('[Anjoimob Error]', error.message, error.digest);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0A192F] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-bold text-[#D4AF37] mb-4">500</h1>
        <p className="text-2xl text-white mb-2">Algo deu errado</p>
        <p className="text-gray-400 mb-2 text-sm">
          {error.message || 'Erro interno do servidor'}
        </p>
        {error.digest && (
          <p className="text-gray-600 text-xs mb-8 font-mono">
            ref: {error.digest}
          </p>
        )}
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-[#D4AF37] text-[#0A192F] rounded-lg font-semibold hover:bg-yellow-400 transition"
          >
            Tentar novamente
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-3 border border-[#D4AF37] text-[#D4AF37] rounded-lg font-semibold hover:bg-[#D4AF37] hover:text-[#0A192F] transition"
          >
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
