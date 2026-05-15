import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ToursDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: imoveis } = await supabase
        .from('properties')
        .select('id, titulo, tour_scenes')
        .eq('broker_id', user.id)
        .order('created_at', { ascending: false });

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <Link href="/dashboard" className="text-[#D4AF37] hover:underline text-sm">
                            ← Dashboard
                        </Link>
                        <h1 className="text-2xl font-bold text-white mt-1">Tours 360°</h1>
                        <p className="text-gray-400 text-sm mt-1">
                            Gerencie as cenas panorâmicas dos seus imóveis
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href="/dashboard/tours/analytics"
                            className="flex-shrink-0 px-4 py-2.5 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-lg transition-colors text-sm"
                        >
                            Analytics
                        </Link>
                        <Link
                            href="/imoveis/novo"
                            className="flex-shrink-0 px-5 py-2.5 bg-[#D4AF37] text-gray-900 font-bold rounded-lg hover:bg-yellow-400 transition-colors text-sm"
                        >
                            + Novo imóvel
                        </Link>
                    </div>
                </div>

                {!imoveis || imoveis.length === 0 ? (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-10 text-center">
                        <p className="text-gray-400 text-sm">Nenhum imóvel cadastrado ainda.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {imoveis.map((imovel) => {
                            const sceneCount = Array.isArray(imovel.tour_scenes)
                                ? imovel.tour_scenes.length
                                : 0;
                            return (
                                <div
                                    key={imovel.id}
                                    className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex items-center justify-between gap-4"
                                >
                                    <div className="min-w-0">
                                        <p className="font-semibold text-white truncate">
                                            {imovel.titulo || 'Imóvel sem título'}
                                        </p>
                                        <p className="text-sm text-gray-400 mt-0.5">
                                            {sceneCount === 0
                                                ? 'Sem cenas'
                                                : `${sceneCount} cena${sceneCount > 1 ? 's' : ''}`}
                                        </p>
                                    </div>
                                    <Link
                                        href={`/dashboard/tours/${imovel.id}`}
                                        className="flex-shrink-0 px-4 py-2 bg-[#D4AF37] text-gray-900 text-sm font-medium rounded-lg hover:bg-yellow-400 transition-colors"
                                    >
                                        Gerenciar
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
