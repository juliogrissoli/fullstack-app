import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PipelineKanban from '@/components/PipelineKanban';

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: leads } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    const { data: reservas } = await supabase.from('reservas').select('*, properties(titulo)').eq('status', 'ativa');

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold text-[#D4AF37] mb-8">📊 Pipeline de Vendas</h1>

            <PipelineKanban />

            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricaCard titulo="Leads Hoje" valor={leads?.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length.toString() || '0'} cor="text-blue-400" />
                <MetricaCard titulo="Visitas Agendadas" valor={leads?.filter(l => l.status === 'visita').length.toString() || '0'} cor="text-purple-400" />
                <MetricaCard titulo="Propostas Ativas" valor={leads?.filter(l => l.status === 'proposta').length.toString() || '0'} cor="text-orange-400" />
                <MetricaCard titulo="Reservas Blindadas" valor={reservas?.length.toString() || '0'} cor="text-green-400" />
            </div>

            {reservas && reservas.length > 0 && (
                <div className="mt-8 bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-xl font-bold text-[#D4AF37] mb-4">🔒 Reservas Blindadas</h2>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-gray-400 border-b border-gray-700">
                                <th className="text-left py-2">Imóvel</th>
                                <th className="text-left py-2">Unidade</th>
                                <th className="text-left py-2">Hash</th>
                                <th className="text-left py-2">Expira em</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reservas.map((r) => (
                                <tr key={r.id} className="border-b border-gray-700">
                                    <td className="py-2">{(r.properties as any)?.titulo || '-'}</td>
                                    <td className="py-2">{r.unit_number}</td>
                                    <td className="py-2 text-xs font-mono text-gray-400">{r.reservation_hash?.substring(0, 16)}...</td>
                                    <td className="py-2">{new Date(r.expires_at).toLocaleString('pt-BR')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function MetricaCard({ titulo, valor, cor }: { titulo: string; valor: string; cor: string }) {
    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-sm">{titulo}</p>
            <p className={`text-3xl font-bold ${cor}`}>{valor}</p>
        </div>
    );
}
