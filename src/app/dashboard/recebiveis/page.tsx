import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RecebiveisPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    const { data: reservas } = await supabase
        .from('reservas')
        .select('*, properties(titulo)')
        .eq('status', 'ativa');

    const totalRecebiveis = transactions?.reduce((acc, t) => acc + (t.vgv || 0), 0) || 0;
    const totalComissoes = transactions?.reduce((acc, t) => acc + (t.commission_total || 0), 0) || 0;
    const totalPendentes = transactions?.filter(t => t.status === 'pendente').reduce((acc, t) => acc + (t.vgv || 0), 0) || 0;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold text-[#D4AF37] mb-8">💰 Gestão de Recebíveis</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <MetricaCard titulo="VGV Total" valor={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRecebiveis)} cor="text-blue-400" />
                <MetricaCard titulo="Comissões Geradas" valor={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalComissoes)} cor="text-green-400" />
                <MetricaCard titulo="Pendentes" valor={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPendentes)} cor="text-yellow-400" />
                <MetricaCard titulo="Reservas Ativas" valor={reservas?.length?.toString() || '0'} cor="text-purple-400" />
            </div>

            {transactions && transactions.length > 0 && (
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-xl font-bold text-[#D4AF37] mb-4">📋 Transações Recentes</h2>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-gray-400 border-b border-gray-700">
                                <th className="text-left py-2">ID</th>
                                <th className="text-left py-2">VGV</th>
                                <th className="text-left py-2">Comissão</th>
                                <th className="text-left py-2">Status</th>
                                <th className="text-left py-2">Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((t) => (
                                <tr key={t.id} className="border-b border-gray-700">
                                    <td className="py-2 font-mono text-xs">{t.id?.substring(0, 8)}</td>
                                    <td className="py-2">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.vgv || 0)}</td>
                                    <td className="py-2">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.commission_total || 0)}</td>
                                    <td className="py-2">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                            t.status === 'pago' ? 'bg-green-900 text-green-300' :
                                            t.status === 'pendente' ? 'bg-yellow-900 text-yellow-300' :
                                            'bg-red-900 text-red-300'
                                        }`}>{t.status}</span>
                                    </td>
                                    <td className="py-2 text-gray-400">{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
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
