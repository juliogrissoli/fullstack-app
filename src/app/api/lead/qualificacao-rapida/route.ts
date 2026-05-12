import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { renda, entrada, prazo } = body;
  if (!renda || !entrada) return NextResponse.json({ error: 'Renda e entrada são obrigatórias' }, { status: 400 });

  let score = 0;
  if (entrada >= 200000) score += 40; else if (entrada >= 100000) score += 25; else if (entrada >= 50000) score += 10;
  if (renda >= 25000) score += 30; else if (renda >= 12000) score += 20; else if (renda >= 5000) score += 10;
  if (prazo === 'urgente') score += 30; else if (prazo === 'medio') score += 15;

  let mensagem = '';
  if (score >= 70) mensagem = 'Você tem perfil para investimentos de alto padrão.';
  else if (score >= 40) mensagem = 'Seu perfil é compatível com nosso portfólio.';
  else mensagem = 'No momento, seu perfil não se enquadra em nosso portfólio mínimo.';

  return NextResponse.json({ score, mensagem });
}
