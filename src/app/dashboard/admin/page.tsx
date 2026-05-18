import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

function MetricaCard({ titulo, valor, cor }: { titulo: string; valor: string; cor: string }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
      <p className="text-gray-400 text-sm mb-1">{titulo}</p>
      <p className={`text-3xl font-bold ${cor}`}>{valor}</p>
    </div>
  );
}

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/dashboard');

  const [
    { count: totalBrokers },
    { count: totalLeads },
    { count: totalProperties },
    { count: totalTransactions },
  ] = await Promise.all([
    supabase.from('brokers').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('properties').select('*', { count: 'exact', head: true }),
    supabase.from('stripe_transactions').select('*', { count: 'exact', head: true }),
  ]);

  // Soma do caixa via stripe_transactions pagas
  const { data: transacoes } = await supabase
    .from('stripe_transactions')
    .select('amount')
    .eq('status', 'paid');

  const totalCaixa = (transacoes ?? []).reduce((acc, t) => acc + (t.amount ?? 0), 0);

  // Distribuição de planos
  const { data: planos } = await supabase
    .from('brokers')
    .select('plan');

  const distribuicaoPlanos = (planos ?? []).reduce<Record<string, number>>((acc, b) => {
    const p = b.plan ?? 'starter';
    acc[p] = (acc[p] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold text-[#D4AF37] mb-8">Painel de Administração</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <MetricaCard titulo="Corretores" valor={String(totalBrokers ?? 0)} cor="text-blue-400" />
        <MetricaCard titulo="Leads" valor={String(totalLeads ?? 0)} cor="text-green-400" />
        <MetricaCard titulo="Imóveis" valor={String(totalProperties ?? 0)} cor="text-purple-400" />
        <MetricaCard titulo="Transações" valor={String(totalTransactions ?? 0)} cor="text-yellow-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h2 className="text-xl font-bold text-[#D4AF37] mb-4">Caixa (pagamentos aprovados)</h2>
          <p className="text-3xl font-bold text-green-400">
            {totalCaixa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h2 className="text-xl font-bold text-[#D4AF37] mb-4">Distribuição de Planos</h2>
          <div className="space-y-2">
            {Object.entries(distribuicaoPlanos).map(([plano, qtd]) => (
              <div key={plano} className="flex justify-between text-sm">
                <span className="text-gray-400 capitalize">{plano}</span>
                <span className="text-white font-bold">{qtd}</span>
              </div>
            ))}
            {Object.keys(distribuicaoPlanos).length === 0 && (
              <p className="text-gray-500 text-sm">Nenhum broker cadastrado</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h2 className="text-xl font-bold text-[#D4AF37] mb-4">Links Rápidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/api/docs" target="_blank" className="block text-blue-400 hover:underline text-sm">
            Documentação da API (OpenAPI)
          </a>
          <a href="/api/health" target="_blank" className="block text-blue-400 hover:underline text-sm">
            Health Check
          </a>
          <a href="/api/admin/system-check" target="_blank" className="block text-blue-400 hover:underline text-sm">
            System Check (requer secret)
          </a>
          <a href="/dashboard/tours/analytics" className="block text-blue-400 hover:underline text-sm">
            Analytics de Tours
          </a>
          <a href="/dashboard/pagamentos" className="block text-blue-400 hover:underline text-sm">
            Pagamentos
          </a>
        </div>
      </div>
    </div>
  );
}
