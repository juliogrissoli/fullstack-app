import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function AssociadoPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();

  const { data: associado } = await supabase
    .from('brokers')
    .select('*, profiles(name, email)')
    .eq('associado_slug', params.slug)
    .eq('is_associado', true)
    .single();

  if (!associado) return notFound();

  const profiles = associado.profiles as { name?: string; email?: string } | null;

  const { count: totalImoveis } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('broker_id', associado.user_id);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-[#0A192F] border-b border-[#D4AF37] p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#D4AF37]">
            {profiles?.name ?? 'Associado'}
          </h1>
          <span className="text-sm text-gray-400">Anjoimob PRO</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <p className="text-gray-400">Imóveis no Portfólio</p>
            <p className="text-3xl font-bold text-white">{totalImoveis ?? 0}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <p className="text-gray-400">Corretores na Rede</p>
            <p className="text-3xl font-bold text-blue-400">0</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <p className="text-gray-400">VGV Acumulado</p>
            <p className="text-3xl font-bold text-green-400">R$ 0</p>
          </div>
        </div>
      </main>
    </div>
  );
}
