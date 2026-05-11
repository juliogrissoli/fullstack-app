import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

let _stripe: Stripe | null = null;
const stripe = new Proxy({}, {
  get(_: object, prop: string | symbol) {
    if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-04-22.dahlia' as any,
    });
    return Reflect.get(_stripe, prop);
  },
}) as unknown as Stripe;

export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, email')
    .eq('id', user.id)
    .single();

  // Verificar se já tem conta conectada
  const { data: broker } = await supabase
    .from('brokers')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .single();

  let accountId = broker?.stripe_account_id as string | null;

  if (!accountId) {
    // Criar conta Express no Stripe Connect
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'BR',
      email: profile?.email ?? user.email ?? undefined,
      capabilities: { transfers: { requested: true } },
      business_profile: { name: profile?.nome ?? 'Corretor Anjoimob' },
    });

    accountId = account.id;

    await supabase
      .from('brokers')
      .update({ stripe_account_id: accountId })
      .eq('user_id', user.id);
  }

  // Link de onboarding Stripe
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?stripe=refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?stripe=success`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: accountLink.url, account_id: accountId });
}

export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: broker } = await supabase
    .from('brokers')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .single();

  if (!broker?.stripe_account_id) {
    return NextResponse.json({ connected: false });
  }

  const account = await stripe.accounts.retrieve(broker.stripe_account_id as string);

  return NextResponse.json({
    connected: account.details_submitted,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    account_id: account.id,
  });
}
