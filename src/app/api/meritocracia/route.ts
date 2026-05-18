import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Meritocracia: ranking de corretores baseado em score, vendas e captações
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);

  const [scoresResult, transacoesResult, leadsResult] = await Promise.all([
    supabase.from('score_logs').select('user_id, score_total, nivel_liberado, updated_at').order('score_total', { ascending: false }).limit(limit),
    supabase.from('transactions').select('broker_id, commission_total, status').eq('status', 'pago'),
    supabase.from('leads').select('broker_id, status'),
  ]);

  const scores = scoresResult.data ?? [];
  const transacoes = transacoesResult.data ?? [];
  const leads = leadsResult.data ?? [];

  // Agrupa vendas por broker
  const vendasPorBroker: Record<string, { total: number; vgv: number }> = {};
  for (const t of transacoes) {
    if (!t.broker_id) continue;
    if (!vendasPorBroker[t.broker_id]) vendasPorBroker[t.broker_id] = { total: 0, vgv: 0 };
    vendasPorBroker[t.broker_id].total++;
    vendasPorBroker[t.broker_id].vgv += t.commission_total ?? 0;
  }

  // Agrupa leads por broker
  const leadsPorBroker: Record<string, number> = {};
  for (const l of leads) {
    if (!l.broker_id) continue;
    leadsPorBroker[l.broker_id] = (leadsPorBroker[l.broker_id] ?? 0) + 1;
  }

  const ranking = scores.map((s, idx) => ({
    posicao: idx + 1,
    user_id: s.user_id,
    score_total: s.score_total,
    nivel_liberado: s.nivel_liberado,
    vendas: vendasPorBroker[s.user_id]?.total ?? 0,
    vgv_total: vendasPorBroker[s.user_id]?.vgv ?? 0,
    leads_total: leadsPorBroker[s.user_id] ?? 0,
    updated_at: s.updated_at,
  }));

  return NextResponse.json({
    success: true,
    ranking,
    total_corretores: ranking.length,
    meu_ranking: ranking.findIndex((r) => r.user_id === user.id) + 1 || null,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  // Recalcula o score do usuário atual
  const { data: scoreData, error } = await supabase
    .rpc('calculate_score', { p_user_id: user.id });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: atualizado } = await supabase
    .from('score_logs')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return NextResponse.json({ success: true, score: scoreData, score_logs: atualizado });
}
