import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import TourAnalyticsChart from '@/components/TourAnalyticsChart';

export const dynamic = 'force-dynamic';

function formatTempo(seg: number) {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-3xl font-bold ${highlight ? 'text-[#D4AF37]' : 'text-white'}`}>{value}</p>
        </div>
    );
}

export default async function TourAnalyticsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: properties } = await supabase
        .from('properties')
        .select('id, titulo')
        .eq('broker_id', user.id);

    const propertyMap: Record<string, string> = Object.fromEntries(
        (properties ?? []).map(p => [p.id, p.titulo ?? 'Imóvel'])
    );
    const propertyIds = Object.keys(propertyMap);

    type AnalyticsRow = { imovel_id: string; duracao_segundos: number; intencao_alta: boolean; created_at: string };
    let analytics: AnalyticsRow[] = [];

    if (propertyIds.length > 0) {
        const { data } = await supabase
            .from('tours_analytics')
            .select('imovel_id, duracao_segundos, intencao_alta, created_at')
            .in('imovel_id', propertyIds)
            .order('created_at', { ascending: false });
        analytics = (data as AnalyticsRow[]) ?? [];
    }

    // Summary metrics
    const total = analytics.length;
    const conversoes = analytics.filter(a => a.intencao_alta).length;
    const taxaConversao = total > 0 ? ((conversoes / total) * 100).toFixed(1) : '0';
    const tempoMedioSeg = total > 0
        ? Math.round(analytics.reduce((s, a) => s + (a.duracao_segundos ?? 0), 0) / total)
        : 0;

    // Last 30 days trend
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const trendMap: Record<string, { dia: string; visitas: number; conversoes: number }> = {};
    for (const a of analytics) {
        if (new Date(a.created_at) < cutoff) continue;
        const dia = a.created_at.slice(0, 10);
        if (!trendMap[dia]) trendMap[dia] = { dia, visitas: 0, conversoes: 0 };
        trendMap[dia].visitas++;
        if (a.intencao_alta) trendMap[dia].conversoes++;
    }
    const trendData = Object.values(trendMap).sort((a, b) => a.dia.localeCompare(b.dia));

    // Top 5 by conversion rate
    const byProperty: Record<string, { imovelId: string; titulo: string; visitas: number; conversoes: number }> = {};
    for (const a of analytics) {
        if (!byProperty[a.imovel_id]) {
            byProperty[a.imovel_id] = {
                imovelId: a.imovel_id,
                titulo: propertyMap[a.imovel_id] ?? 'Imóvel',
                visitas: 0,
                conversoes: 0,
            };
        }
        byProperty[a.imovel_id].visitas++;
        if (a.intencao_alta) byProperty[a.imovel_id].conversoes++;
    }
    const top5 = Object.values(byProperty)
        .map(p => ({ ...p, taxa: p.visitas > 0 ? Math.round((p.conversoes / p.visitas) * 100) : 0 }))
        .sort((a, b) => b.taxa - a.taxa)
        .slice(0, 5);

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <Link href="/dashboard/tours" className="text-[#D4AF37] hover:underline text-sm">
                            ← Tours
                        </Link>
                        <h1 className="text-2xl font-bold text-white mt-1">Analytics de Tours</h1>
                        <p className="text-gray-400 text-sm mt-0.5">Desempenho de engajamento — últimos 30 dias</p>
                    </div>
                </div>

                {total === 0 ? (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
                        <p className="text-gray-400">Nenhuma visita registrada ainda.</p>
                        <p className="text-gray-600 text-sm mt-1">Os dados aparecem assim que visitantes acessam os tours.</p>
                    </div>
                ) : (
                    <>
                        {/* KPI cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard label="Total de visitas" value={total.toString()} />
                            <StatCard label="Intenção alta" value={conversoes.toString()} highlight />
                            <StatCard label="Taxa de conversão" value={`${taxaConversao}%`} />
                            <StatCard label="Tempo médio" value={formatTempo(tempoMedioSeg)} />
                        </div>

                        {/* Trend chart */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                            <h2 className="text-base font-semibold text-white mb-5">
                                Visitas e intenção alta — últimos 30 dias
                            </h2>
                            {trendData.length > 0 ? (
                                <TourAnalyticsChart data={trendData} />
                            ) : (
                                <p className="text-gray-500 text-sm py-10 text-center">Sem dados no período.</p>
                            )}
                        </div>

                        {/* Top 5 */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                            <h2 className="text-base font-semibold text-white mb-5">
                                Top 5 tours por taxa de conversão
                            </h2>
                            {top5.length === 0 ? (
                                <p className="text-gray-500 text-sm">Nenhum imóvel com visitas registradas.</p>
                            ) : (
                                <div className="space-y-4">
                                    {top5.map((t, i) => (
                                        <div key={t.imovelId} className="flex items-center gap-4">
                                            <span className="text-lg font-bold text-gray-600 w-5 text-right flex-shrink-0">
                                                {i + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-200 truncate">{t.titulo}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {t.visitas} visita{t.visitas !== 1 ? 's' : ''} · {t.conversoes} alta intenção
                                                </p>
                                            </div>
                                            <span className={`text-lg font-bold flex-shrink-0 ${
                                                t.taxa >= 50 ? 'text-green-400' : t.taxa >= 20 ? 'text-[#D4AF37]' : 'text-gray-400'
                                            }`}>
                                                {t.taxa}%
                                            </span>
                                            <div className="w-20 h-2 bg-gray-700 rounded-full flex-shrink-0 overflow-hidden">
                                                <div
                                                    className="h-full bg-[#D4AF37] rounded-full"
                                                    style={{ width: `${Math.min(t.taxa, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
