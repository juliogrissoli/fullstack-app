import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo');
  const de = searchParams.get('de');
  const ate = searchParams.get('ate');
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const pageSize = 20;

  let query = supabase
    .from('wallet_transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (tipo) query = query.eq('tipo', tipo);
  if (de)  query = query.gte('created_at', de);
  if (ate) query = query.lte('created_at', ate);

  const { data: transacoes, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: saldoData } = await supabase
    .from('wallet_transactions')
    .select('valor_liquido, tipo')
    .eq('user_id', user.id)
    .eq('status', 'liberado');

  const saldo = saldoData?.reduce((acc, t) => {
    return t.tipo === 'credito' ? acc + t.valor_liquido : acc - t.valor_liquido;
  }, 0) ?? 0;

  return NextResponse.json({
    saldo,
    transacoes,
    total: count ?? 0,
    page,
    pages: Math.ceil((count ?? 0) / pageSize),
  });
}
