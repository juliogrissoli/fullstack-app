import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import stripe from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) return new Response('Missing stripe-signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature inválida:', err);
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  // Idempotência
  const { data: jaProcessado } = await supabaseAdmin
    .from('processed_events')
    .select('id')
    .eq('id', event.id)
    .single();

  if (jaProcessado) return new Response(JSON.stringify({ received: true, skipped: true }));

  try {
    switch (event.type) {
      // Checkout de plano concluído → ativar plano no broker
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plano = session.metadata?.plano;
        if (userId && plano) {
          const ativo_ate = new Date();
          ativo_ate.setMonth(ativo_ate.getMonth() + 1);
          await supabaseAdmin.from('brokers').update({
            plan: plano,
            is_associado: plano === 'pro' || plano === 'enterprise',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            plano_ativo_ate: ativo_ate.toISOString(),
          }).eq('user_id', userId);

          await supabaseAdmin.from('agent_logs').insert({
            agent_name: 'plutus',
            action: 'assinatura_ativada',
            decision: plano,
            message: `Broker ${userId} assinou plano ${plano} via checkout ${session.id}`,
          });
        }
        await supabaseAdmin.from('stripe_transactions').insert({
          stripe_account_id: session.customer as string,
          amount: (session.amount_total ?? 0) / 100,
          currency: session.currency ?? 'brl',
          status: 'paid',
          event_type: event.type,
          stripe_event_id: event.id,
        });
        break;
      }

      // Conta Express verificada
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await supabaseAdmin.from('brokers')
          .update({ stripe_verified: account.details_submitted })
          .eq('stripe_account_id', account.id);
        break;
      }

      // Repasse de comissão recebido na conta do corretor
      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout;
        await supabaseAdmin.from('stripe_transactions').insert({
          stripe_account_id: payout.destination as string,
          amount: payout.amount / 100,
          currency: payout.currency,
          status: 'paid',
          event_type: event.type,
          stripe_event_id: event.id,
        });
        break;
      }

      // Pagamento bem-sucedido
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await supabaseAdmin.from('stripe_transactions').insert({
          stripe_account_id: pi.customer as string ?? pi.id,
          amount: pi.amount / 100,
          currency: pi.currency,
          status: 'succeeded',
          event_type: event.type,
          stripe_event_id: event.id,
        });
        // Registrar crédito na wallet do broker se broker_id estiver nos metadados
        const brokerId = pi.metadata?.broker_id;
        if (brokerId) {
          try {
            await supabaseAdmin.from('wallet_transactions').insert({
              user_id: brokerId,
              tipo: 'comissao',
              valor_bruto: pi.amount / 100,
              valor_liquido: (pi.amount / 100) * 0.80,
              status: 'liberado',
            });
          } catch { /* tabela pode não existir ainda */ }
        }
        break;
      }

      // Assinatura cancelada → rebaixar plano
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await supabaseAdmin.from('brokers')
          .update({ plan: 'starter', stripe_subscription_id: null, plano_ativo_ate: null })
          .eq('stripe_customer_id', sub.customer as string);
        break;
      }

      // Renovação mensal aprovada
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const ativo_ate = new Date();
        ativo_ate.setMonth(ativo_ate.getMonth() + 1);
        await supabaseAdmin.from('brokers')
          .update({ plano_ativo_ate: ativo_ate.toISOString() })
          .eq('stripe_customer_id', invoice.customer as string);
        break;
      }

      // Falha de pagamento → alertar
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await supabaseAdmin.from('agent_logs').insert({
          agent_name: 'stripe',
          action: 'invoice_payment_failed',
          decision: 'alerta',
          message: `Falha no pagamento do cliente ${invoice.customer}`,
        });
        break;
      }
    }

    await supabaseAdmin.from('processed_events').insert({ id: event.id });
    return new Response(JSON.stringify({ received: true }));

  } catch (error) {
    console.error('Erro ao processar webhook Stripe:', error);
    return new Response(JSON.stringify({ error: 'Processing error' }), { status: 500 });
  }
}
