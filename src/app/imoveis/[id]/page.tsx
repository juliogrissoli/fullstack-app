import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export function generateMetadata({ params }: { params: { id: string } }) {
  return {
    other: {
      'script:ld+json': JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: 'Propriedade Anjoimob',
        description: 'Imóvel verificado pela Anjoimob. Nexo Causal garantido.',
        provider: {
          '@type': 'RealEstateAgent',
          name: 'Anjoimob',
          areaServed: 'Ribeirão Preto, SP',
        },
      }),
    },
  };
}

export default async function ImovelPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!property) notFound();

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{property.title ?? 'Imóvel'}</h1>
      <p className="text-gray-600 mb-4">{property.description}</p>

      <div className="grid grid-cols-2 gap-4 bg-white rounded-xl shadow p-6">
        <div>
          <p className="text-xs text-gray-400 uppercase">Tipo</p>
          <p className="font-medium">{property.tipo ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase">Área</p>
          <p className="font-medium">{property.area_m2 ? `${property.area_m2} m²` : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase">Valor</p>
          <p className="font-medium text-green-700">
            {property.valor
              ? property.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase">Status</p>
          <p className="font-medium">{property.status ?? '—'}</p>
        </div>
      </div>
    </main>
  );
}
