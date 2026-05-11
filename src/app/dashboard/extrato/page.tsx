import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const tipoLabel: Record<string, string> = {
  saque_acelerado: 'Saque Acelerado',
  saque_normal: 'Saque Normal',
  credito: 'Crédito',
  debito: 'Débito',
};

const tipoColor: Record<string, string> = {
  credito: 'text-green-400',
  saque_acelerado: 'text-red-400',
  saque_normal: 'text-red-400',
  debito: 'text-red-400',
};

export default async function ExtratoPage({
  searchParams,
}: {
  searchParams: { tipo?: string; page?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const page = Math.max(1, Number(searchParams.page ?? '1'));
  const tipo = searchParams.tipo;
  const pageSize = 20;

  let query = supabase
    .from('wallet_transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (tipo) query = query.eq('tipo', tipo);

  const { data: transacoes, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / pageSize);

  const { data: todas } = await supabase
    .from('wallet_transactions')
    .select('valor_liquido, tipo')
    .eq('user_id', user.id)
    .eq('status', 'liberado');

  const saldo = (todas ?? []).reduce((acc, t) =>
    t.tipo === 'credito' ? acc + t.valor_liquido : acc - t.valor_liquido, 0
  );

  const TIPOS = ['', 'credito', 'saque_acelerado', 'saque_normal', 'debito'];

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Extrato da Carteira</h1>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <p className="text-sm text-gray-500">Saldo disponível</p>
        <p className={`text-4xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {TIPOS.map((t) => (
          <a
            key={t}
            href={t ? `?tipo=${t}` : '?'}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              tipo === t || (!tipo && !t)
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
            }`}
          >
            {t ? tipoLabel[t] ?? t : 'Todos'}
          </a>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Valor Bruto</th>
              <th className="px-4 py-3 text-right">Taxa</th>
              <th className="px-4 py-3 text-right">Líquido</th>
              <th className="px-4 py-3 text-left">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transacoes && transacoes.length > 0 ? transacoes.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className={`px-4 py-3 font-medium ${tipoColor[t.tipo] ?? 'text-gray-700'}`}>
                  {tipoLabel[t.tipo] ?? t.tipo}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    t.status === 'liberado' ? 'bg-green-100 text-green-700' :
                    t.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>{t.status}</span>
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {Number(t.valor_bruto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-3 text-right text-red-400">
                  {t.taxa > 0 ? `-${Number(t.taxa).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : '—'}
                </td>
                <td className={`px-4 py-3 text-right font-semibold ${tipoColor[t.tipo] ?? 'text-gray-700'}`}>
                  {Number(t.valor_liquido).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(t.created_at).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  Nenhuma transação encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 p-4 border-t">
            {Array.from({ length: totalPages }, (_, i) => (
              <a
                key={i}
                href={`?${tipo ? `tipo=${tipo}&` : ''}page=${i + 1}`}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm ${
                  page === i + 1 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {i + 1}
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
