import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import TourUploader from '@/components/TourUploader';
import type { TourScene } from '@/lib/tours';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function TourManagePage({ params }: Props) {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: property } = await supabase
        .from('properties')
        .select('id, titulo, tour_scenes')
        .eq('id', id)
        .eq('broker_id', user.id)
        .single();

    if (!property) notFound();

    const scenes = Array.isArray(property.tour_scenes)
        ? (property.tour_scenes as TourScene[])
        : [];

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
                <div>
                    <Link href="/dashboard/tours" className="text-[#D4AF37] hover:underline text-sm">
                        ← Tours
                    </Link>
                    <h1 className="text-2xl font-bold text-white mt-1">
                        {property.titulo || 'Imóvel'}
                    </h1>
                    <div className="flex items-center gap-4 mt-1">
                        <p className="text-gray-400 text-sm">Gerenciar cenas do tour 360°</p>
                        <Link
                            href={`/imoveis/${id}/tour`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#D4AF37] text-sm hover:underline"
                        >
                            Ver tour público →
                        </Link>
                    </div>
                </div>

                <TourUploader imovelId={id} initialScenes={scenes} />
            </div>
        </div>
    );
}
