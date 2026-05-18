import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PagamentosClient from './_client';

export const dynamic = 'force-dynamic';

export default async function PagamentosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: broker }, { data: transacoes }] = await Promise.all([
    supabase
      .from('brokers')
      .select('stripe_account_id, stripe_verified, stripe_customer_id, plan, plano_ativo_ate, full_name, email')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('stripe_transactions')
      .select('*')
      .eq('stripe_account_id', (await supabase.from('brokers').select('stripe_account_id').eq('user_id', user.id).single()).data?.stripe_account_id ?? '')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return (
    <PagamentosClient
      broker={broker}
      transacoes={transacoes ?? []}
    />
  );
}
