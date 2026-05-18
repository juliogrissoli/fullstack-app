import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const [{ data: scoreData }, { count: vendasCount }, { data: profileData }] = await Promise.all([
    supabase.from('score_logs').select('score_total').eq('user_id', user.id).single(),
    supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('broker_id', user.id).eq('status', 'pago'),
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
  ]);

  const score = scoreData?.score_total ?? 0;

  if (score < 60) {
    return NextResponse.json({
      error: 'Score insuficiente para upgrade. Mínimo: 60 pontos.',
      score_atual: score,
    }, { status: 403 });
  }

  if ((vendasCount ?? 0) < 3) {
    return NextResponse.json({
      error: 'Mínimo de 3 vendas concluídas para upgrade PRO.',
      vendas_atuais: vendasCount ?? 0,
    }, { status: 403 });
  }

  // Gerar slug único baseado no nome
  const slugBase = (profileData?.full_name ?? 'associado')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);

  const slug = `${slugBase}-${Date.now().toString(36)}`;

  const { error } = await supabase
    .from('brokers')
    .update({
      plan: 'pro',
      is_associado: true,
      associado_slug: slug,
      percentual_lucro: 50.0,
    })
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    plan: 'pro',
    is_associado: true,
    associado_slug: slug,
    percentual_lucro: 50.0,
    mensagem: 'Parabéns! Você agora é um Associado PRO da Anjoimob.',
  });
}
