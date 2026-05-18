import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import stripe from '@/lib/stripe';

// POST — cria ou recupera conta Stripe Express do corretor
export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const { data: broker } = await supabase
    .from('brokers')
    .select('stripe_account_id, email')
    .eq('user_id', user.id)
    .single();

  let accountId = broker?.stripe_account_id as string | null;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'BR',
      email: broker?.email ?? user.email ?? undefined,
      capabilities: { transfers: { requested: true } },
      business_profile: { name: profile?.full_name ?? 'Corretor Anjoimob' },
    });

    accountId = account.id;

    await supabase
      .from('brokers')
      .update({ stripe_account_id: accountId })
      .eq('user_id', user.id);
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pagamentos?stripe=refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pagamentos?stripe=success`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: accountLink.url, account_id: accountId });
}

// GET — retorna status da conta Stripe Connect do corretor
export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: broker } = await supabase
    .from('brokers')
    .select('stripe_account_id, stripe_verified, plan, plano_ativo_ate')
    .eq('user_id', user.id)
    .single();

  if (!broker?.stripe_account_id) {
    return NextResponse.json({ connected: false, plan: broker?.plan ?? 'starter' });
  }

  const account = await stripe.accounts.retrieve(broker.stripe_account_id as string);

  return NextResponse.json({
    connected: account.details_submitted,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    account_id: account.id,
    plan: broker.plan,
    plano_ativo_ate: broker.plano_ativo_ate,
  });
}
