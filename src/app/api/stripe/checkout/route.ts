import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import stripe, { PLANOS, type PlanoKey } from '@/lib/stripe';

// POST — cria sessão de checkout para upgrade de plano
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  let body: { plano: PlanoKey };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const plano = PLANOS[body.plano];
  if (!plano) {
    return NextResponse.json({ error: 'Plano inválido. Use: essencial | pro | enterprise' }, { status: 400 });
  }

  const { data: broker } = await supabase
    .from('brokers')
    .select('email, full_name, stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  // Recuperar ou criar customer Stripe
  let customerId = broker?.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: broker?.email ?? user.email ?? undefined,
      name: broker?.full_name ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from('brokers').update({ stripe_customer_id: customerId }).eq('user_id', user.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: { name: plano.nome, description: plano.descricao },
          recurring: { interval: plano.recorrencia },
          unit_amount: plano.preco,
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pagamentos?checkout=success&plano=${body.plano}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pagamentos?checkout=cancelled`,
    metadata: { user_id: user.id, plano: body.plano },
  });

  return NextResponse.json({ url: session.url, session_id: session.id });
}

// GET — verifica status de uma sessão de checkout
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const sessionId = new URL(request.url).searchParams.get('session_id');
  if (!sessionId) return NextResponse.json({ error: 'session_id obrigatório' }, { status: 400 });

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  return NextResponse.json({
    status: session.status,
    payment_status: session.payment_status,
    plano: session.metadata?.plano,
    amount_total: session.amount_total,
  });
}
