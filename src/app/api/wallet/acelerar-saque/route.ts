import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let valor: number;
  try {
    const body = await request.json();
    valor = Number(body.valor);
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  if (!valor || valor <= 0) {
    return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
  }

  const [{ data: scoreData }, { data: brokerData }] = await Promise.all([
    supabase.from('score_logs').select('score_total').eq('user_id', user.id).single(),
    supabase.from('brokers').select('plan, is_associado').eq('user_id', user.id).single(),
  ]);

  const score = scoreData?.score_total ?? 0;
  const isAssociado = brokerData?.is_associado ?? false;

  // Taxa de aceleração baseada em score e plano PRO
  let taxa: number;

  if (score < 40) {
    return NextResponse.json({
      error: 'Score insuficiente para saque acelerado. Mínimo: 40 pontos.',
      score_atual: score,
    }, { status: 403 });
  } else if (isAssociado && score >= 80) {
    taxa = 0.03; // PRO com score alto: 3%
  } else if (isAssociado && score >= 60) {
    taxa = 0.04;
  } else if (score >= 80) {
    taxa = 0.05;
  } else if (score >= 60) {
    taxa = 0.07;
  } else {
    taxa = 0.08; // score 40–59
  }

  const taxaValor = valor * taxa;
  const valorLiquido = valor - taxaValor;

  const { data, error } = await supabase
    .from('wallet_transactions')
    .insert({
      user_id: user.id,
      tipo: 'saque_acelerado',
      valor_bruto: valor,
      taxa: taxaValor,
      valor_liquido: valorLiquido,
      status: 'liberado',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    transacao_id: data.id,
    valor_liquido: valorLiquido,
    taxa_cobrada: taxaValor,
    taxa_percentual: taxa * 100,
    score,
    plano: isAssociado ? 'pro' : (brokerData?.plan ?? 'autonomo'),
    mensagem: `Saque acelerado liberado! Taxa de ${(taxa * 100).toFixed(0)}% aplicada.`,
  });
}
