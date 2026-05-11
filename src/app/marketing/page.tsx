import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function MarketingDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('broker_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const totalLeads = leads?.length ?? 0;
  const leadsQualificados = leads?.filter(l => l.status === 'qualificado').length ?? 0;
  const leadsConvertidos = leads?.filter(l => l.status === 'convertido').length ?? 0;
  const taxaConversao = totalLeads > 0
    ? ((leadsConvertidos / totalLeads) * 100).toFixed(1)
    : '0.0';

  const statusColor: Record<string, string> = {
    novo: 'bg-blue-100 text-blue-800',
    qualificado: 'bg-yellow-100 text-yellow-800',
    convertido: 'bg-green-100 text-green-800',
    perdido: 'bg-red-100 text-red-800',
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard de Marketing</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Total Leads</p>
          <p className="text-3xl font-bold text-gray-900">{totalLeads}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Qualificados</p>
          <p className="text-3xl font-bold text-yellow-600">{leadsQualificados}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Convertidos</p>
          <p className="text-3xl font-bold text-green-600">{leadsConvertidos}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Taxa de Conversão</p>
          <p className="text-3xl font-bold text-indigo-600">{taxaConversao}%</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Leads Recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Telefone</th>
                <th className="px-4 py-3 text-left">Origem</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads && leads.length > 0 ? (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{lead.client_name}</td>
                    <td className="px-4 py-3 text-gray-600">{lead.client_phone}</td>
                    <td className="px-4 py-3 text-gray-600">{lead.source ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[lead.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Nenhum lead capturado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
