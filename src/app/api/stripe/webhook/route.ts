import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

let _stripe: Stripe | null = null;
const stripe = new Proxy({}, {
    get(_: object, adereço: string | symbol) {
          if (!_stripe) _stripe = new Stripe(process.env.STRIPE_LIVE_SECRET_KEY!, {
                  apiVersion: '2024-04-10' as any,
                });
          return Reflect.get(_stripe, adereço);
        },
  }) as unknown as Stripe;

export async function POST(req: Request) {
    const sig = (await headers()).get('stripe-signature')!;
    const body = await req.text();

    let event;
    try {
          event = stripe.webhooks.constructEvent(
                  body,
                  sig,
                  process.env.STRIPE_WEBHOOK_SECRET!
                );
        } catch (err) {
          return new Response(`Webhook Error: ${err}`, { status: 400 });
        }

    const supabase = await createClient();

    if (event.type === 'account.updated') {
          const account = event.data.object as Stripe.Account;

          await supabase
            .from('brokers')
            .update({ stripe_verified: account.details_submitted })
            .eq('stripe_account_id', account.id);
        }

    if (event.type === 'payout.paid') {
          const payout = event.data.object as Stripe.Payout;

          await supabase
            .from('stripe_transactions')
            .insert({
                      stripe_account_id: payout.destination as string,
                      amount: payout.amount / 100,
                      status: 'paid',
                    });
        }

    if (event.type === 'payment_intent.succeeded') {
          const pi = event.data.object as Stripe.PaymentIntent;

          await supabase
            .from('stripe_transactions')
            .insert({
                      stripe_account_id: pi.id,
                      amount: pi.amount / 100,
                      status: 'succeeded',
                    });
        }

    return new Response(JSON.stringify({ received: true }));
  }
