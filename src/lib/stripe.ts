import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as any,
});

export default stripe;

export const PLANOS = {
  pro: {
    nome: 'Anjoimob PRO',
    preco: 29700,
    descricao: 'Acesso completo à plataforma, CRM avançado, split automático',
    recorrencia: 'month' as const,
  },
  imperial: {
    nome: 'Anjoimob Imperial',
    preco: 99700,
    descricao: 'Tudo do PRO + White Label, gestão de incorporadoras, API dedicada',
    recorrencia: 'month' as const,
  },
} as const;

export type PlanoKey = keyof typeof PLANOS;
