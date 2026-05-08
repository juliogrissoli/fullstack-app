import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as any,
})

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature inválida:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Idempotência — evita processar o mesmo evento duas vezes
  const { data: jaProcessado } = await supabaseAdmin
    .from('processed_events')
    .select('id')
    .eq('id', event.id)
    .single()

  if (jaProcessado) {
    return NextResponse.json({ received: true, skipped: true })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      await supabaseAdmin.from('clientes').upsert(
        {
          email: session.customer_email,
          stripe_customer_id: session.customer as string,
          plano: session.metadata?.plano || 'starter',
          status: 'ativo',
          data_compra: new Date().toISOString(),
        },
        { onConflict: 'email' }
      )
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription

      await supabaseAdmin
        .from('clientes')
        .update({ status: 'cancelado' })
        .eq('stripe_customer_id', sub.customer as string)
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice

      await supabaseAdmin
        .from('clientes')
        .update({ status: 'inadimplente' })
        .eq('stripe_customer_id', invoice.customer as string)
    }

    // Marcar como processado
    await supabaseAdmin.from('processed_events').insert({ id: event.id })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Erro ao processar webhook Stripe:', error)
    return NextResponse.json({ error: 'Processing error' }, { status: 500 })
  }
}
