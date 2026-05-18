import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as any,
});

export default stripe;

export const PLANOS = {
  essencial: {
    nome: 'Anjoimob Essencial',
    preco: 9700,
    descricao: 'Até 3 imóveis, tour 360° básico e analytics simples',
    recorrencia: 'month' as const,
  },
  pro: {
    nome: 'Anjoimob PRO',
    preco: 29700,
    descricao: 'Imóveis ilimitados, CRM avançado, leads prioritários, split automático',
    recorrencia: 'month' as const,
  },
  enterprise: {
    nome: 'Anjoimob Enterprise',
    preco: 99700,
    descricao: 'Tudo do PRO + White Label, gestão de incorporadoras, API dedicada, equipe ilimitada',
    recorrencia: 'month' as const,
  },
} as const;

export type PlanoKey = keyof typeof PLANOS;
