import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { renda, entrada, prazo } = await request.json();

    if (!renda || !entrada) {
      return NextResponse.json({ erro: 'renda e entrada são obrigatórios' }, { status: 400 });
    }

    let score = 0;

    // Renda mensal
    if (renda >= 20000) score += 40;
    else if (renda >= 10000) score += 30;
    else if (renda >= 5000) score += 20;
    else if (renda >= 3000) score += 10;

    // Entrada disponível
    if (entrada >= 500000) score += 30;
    else if (entrada >= 200000) score += 25;
    else if (entrada >= 100000) score += 20;
    else if (entrada >= 50000) score += 10;

    // Urgência de decisão
    if (prazo === 'urgente') score += 30;
    else if (prazo === 'medio') score += 15;
    else score += 5;

    // Poder de compra estimado: entrada + 30% da renda anual financiável
    const financiavel = renda * 12 * 0.3;
    const poder_compra = Math.round(entrada + financiavel);

    const mensagem =
      score >= 70
        ? 'Perfil aprovado! Você tem acesso ao portfólio premium Anjoimob.'
        : score >= 40
        ? 'Bom perfil. Vamos encontrar as melhores opções para você.'
        : 'Perfil em análise. Temos condições especiais para seu momento.';

    return NextResponse.json({ score, mensagem, poder_compra });

  } catch (error: any) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
}
