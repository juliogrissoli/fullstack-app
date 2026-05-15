import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import TourImersivoLoader from '@/components/TourImersivoLoader';

export const dynamic = 'force-dynamic';

interface Props {
    params: { id: string };
}

export async function generateMetadata({ params }: Props) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('properties')
        .select('titulo, descricao')
        .eq('id', params.id)
        .single();
    return {
        title: data?.titulo ? `Tour 360° — ${data.titulo} | Anjoimob` : 'Tour 360° | Anjoimob',
        description: data?.descricao || 'Tour imersivo 360° do imóvel.',
    };
}

export default async function TourPage({ params }: Props) {
    const supabase = await createClient();

    const { data: property } = await supabase
        .from('properties')
        .select('id, titulo, descricao, tour_scenes, broker_id')
        .eq('id', params.id)
        .single();

    if (!property) notFound();

    const cenas = Array.isArray(property.tour_scenes) ? property.tour_scenes : [];

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Link href={`/imoveis/${params.id}`} className="text-[#D4AF37] hover:underline text-sm">
                            ← Voltar ao imóvel
                        </Link>
                        <h1 className="text-2xl font-bold text-white mt-1">{property.titulo || 'Tour Imersivo'}</h1>
                        <p className="text-gray-400 text-sm mt-1">Tour 360° — navegue pelos ambientes</p>
                    </div>
                    <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full text-[#D4AF37] text-xs font-medium">
                            ◉ Tour Ativo
                        </span>
                    </div>
                </div>

                <TourImersivoLoader imovelId={params.id} cenas={cenas} />

                {property.descricao && (
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-lg font-semibold text-[#D4AF37] mb-2">Sobre o imóvel</h2>
                        <p className="text-gray-300 text-sm leading-relaxed">{property.descricao}</p>
                    </div>
                )}

                <div className="text-center pt-4">
                    <Link
                        href={`/imoveis/${params.id}`}
                        className="inline-block px-8 py-3 bg-[#D4AF37] text-gray-900 font-bold rounded-lg hover:bg-yellow-400 transition-colors"
                    >
                        Ver detalhes completos →
                    </Link>
                </div>
            </div>
        </div>
    );
}
