import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardJuridico() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: properties } = await supabase
        .from('properties')
        .select('*')
        .eq('broker_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

    const { data: analises } = await supabase
        .from('agent_logs')
        .select('*')
        .eq('agent_name', 'themis')
        .order('created_at', { ascending: false })
        .limit(30);

    const totalCriticos = properties?.filter(p => p.legal_semaforo === 'vermelho')?.length || 0;
    const totalPendentes = properties?.filter(p => p.legal_semaforo === 'amarelo')?.length || 0;
    const totalRegulares = properties?.filter(p => p.legal_semaforo === 'verde')?.length || 0;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold text-[#D4AF37] mb-8">
                ⚖️ Dashboard de Risco Jurídico
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-green-900/30 p-6 rounded-lg border border-green-700">
                    <p className="text-gray-300 text-sm">Regulares</p>
                    <p className="text-4xl font-bold text-green-400">{totalRegulares}</p>
                    <p className="text-green-300 text-sm mt-2">Prontos para venda</p>
                </div>
                <div className="bg-yellow-900/30 p-6 rounded-lg border border-yellow-700">
                    <p className="text-gray-300 text-sm">Pendentes</p>
                    <p className="text-4xl font-bold text-yellow-400">{totalPendentes}</p>
                    <p className="text-yellow-300 text-sm mt-2">Aguardando correção</p>
                </div>
                <div className="bg-red-900/30 p-6 rounded-lg border border-red-700">
                    <p className="text-gray-300 text-sm">Críticos</p>
                    <p className="text-4xl font-bold text-red-400">{totalCriticos}</p>
                    <p className="text-red-300 text-sm mt-2">Venda não recomendada</p>
                </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
                <h2 className="text-xl font-bold text-[#D4AF37] mb-4">🏠 Imóveis no Radar</h2>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-gray-400 border-b border-gray-700">
                            <th className="text-left py-2">Imóvel</th>
                            <th className="text-left py-2">Status</th>
                            <th className="text-left py-2">Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {properties?.map((p) => (
                            <tr key={p.id} className="border-b border-gray-700">
                                <td className="py-2">{p.titulo || 'Sem título'}</td>
                                <td className="py-2">
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                        p.legal_semaforo === 'verde'
                                            ? 'bg-green-900 text-green-300'
                                            : p.legal_semaforo === 'amarelo'
                                                ? 'bg-yellow-900 text-yellow-300'
                                                : 'bg-red-900 text-red-300'
                                    }`}>
                                        {p.legal_semaforo === 'verde' ? '✅ Regular' : p.legal_semaforo === 'amarelo' ? '⚠️ Pendente' : '🔴 Crítico'}
                                    </span>
                                </td>
                                <td className="py-2">
                                    <a href={`/dashboard/juridico/${p.id}`} className="text-[#D4AF37] hover:underline text-sm">
                                        Ver detalhes →
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-[#D4AF37] mb-4">🔍 Últimas Análises do Themis</h2>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-gray-400 border-b border-gray-700">
                            <th className="text-left py-2">Ação</th>
                            <th className="text-left py-2">Decisão</th>
                            <th className="text-left py-2">Mensagem</th>
                            <th className="text-left py-2">Data</th>
                        </tr>
                    </thead>
                    <tbody>
                        {analises?.map((a) => (
                            <tr key={a.id} className="border-b border-gray-700">
                                <td className="py-2">{a.action}</td>
                                <td className="py-2">{a.decision}</td>
                                <td className="py-2 text-gray-400 text-xs">{a.message?.substring(0, 80)}...</td>
                                <td className="py-2 text-gray-500 text-xs">{new Date(a.created_at).toLocaleDateString('pt-BR')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
