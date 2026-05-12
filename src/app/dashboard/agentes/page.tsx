import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AgentesDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: logs } = await supabase
    .from('agent_logs')
    .select('*, leads(lead_name)')
    .order('created_at', { ascending: false })
    .limit(50);

  const agentes = [
    { nome: 'Yara', icone: '🦅', funcao: 'Orquestradora', cor: 'text-yellow-400' },
    { nome: 'Árion', icone: '🔍', funcao: 'Qualificador', cor: 'text-blue-400' },
    { nome: 'Themis', icone: '⚖️', funcao: 'Jurídico', cor: 'text-purple-400' },
    { nome: 'Plutus', icone: '💰', funcao: 'Financeiro', cor: 'text-green-400' },
    { nome: 'Hermes', icone: '🤝', funcao: 'Fechador', cor: 'text-orange-400' }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold text-[#D4AF37] mb-8">🦅 Central de Agentes IA</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {agentes.map((a) => (
          <div key={a.nome} className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
            <p className="text-3xl mb-2">{a.icone}</p>
            <p className={`font-bold ${a.cor}`}>{a.nome}</p>
            <p className="text-xs text-gray-400">{a.funcao}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-[#D4AF37] mb-4">📋 Últimas Decisões</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Agente</th>
              <th className="text-left py-2">Lead</th>
              <th className="text-left py-2">Ação</th>
              <th className="text-left py-2">Decisão</th>
              <th className="text-left py-2">Mensagem</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((log) => (
              <tr key={log.id} className="border-b border-gray-700">
                <td className="py-2">{log.agent_name}</td>
                <td className="py-2">{(log.leads as any)?.lead_name || '-'}</td>
                <td className="py-2">{log.action}</td>
                <td className="py-2">{log.decision}</td>
                <td className="py-2 text-gray-400">{log.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
