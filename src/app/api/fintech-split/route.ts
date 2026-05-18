import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { calcularSplitPro } from '@/lib/split-financeiro';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  let body: {
    transaction_id: string;
    captador_id?: string;
    parceiro_id?: string;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { transaction_id, captador_id, parceiro_id } = body;
  if (!transaction_id) return NextResponse.json({ error: 'transaction_id obrigatório' }, { status: 400 });

  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .select('*, brokers(user_id, is_associado, percentual_lucro)')
    .eq('id', transaction_id)
    .single();

  if (txErr || !tx) return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });

  const comissaoTotal: number = tx.commission_total ?? 0;
  const brokerId: string = tx.broker_id;
  const isAssociado: boolean = tx.brokers?.is_associado ?? false;
  const vendedorId: string = brokerId;

  const split = calcularSplitPro(
    comissaoTotal,
    isAssociado,
    captador_id ?? null,
    vendedorId,
    parceiro_id ?? null,
  );

  const inserts = [];
  if (split.captadorValor > 0 && captador_id) {
    inserts.push(supabase.from('wallet_transactions').insert({
      user_id: captador_id, tipo: 'split_captador',
      valor_bruto: split.captadorValor, taxa: 0,
      valor_liquido: split.captadorValor, status: 'pendente',
    }));
  }
  if (split.vendedorValor > 0) {
    const vendedorUserId = tx.brokers?.user_id ?? vendedorId;
    inserts.push(supabase.from('wallet_transactions').insert({
      user_id: vendedorUserId, tipo: 'split_vendedor',
      valor_bruto: split.vendedorValor, taxa: 0,
      valor_liquido: split.vendedorValor, status: 'pendente',
    }));
  }
  if (split.anjoimobValor > 0) {
    inserts.push(supabase.from('caixa_anjoimob').insert({
      origem: 'split_comissao', motivo: split.cenario,
      user_id: user.id, valor: split.anjoimobValor,
    }));
  }
  if (split.redeValor > 0) {
    inserts.push(supabase.from('caixa_anjoimob').insert({
      origem: 'split_rede', motivo: 'aguardando_distribuicao_multinivel',
      user_id: user.id, valor: split.redeValor,
    }));
  }

  await Promise.allSettled(inserts);

  await supabase.from('agent_logs').insert({
    agent_name: 'plutus', lead_id: tx.lead_id,
    action: 'fintech_split', decision: split.cenario,
    score_impact: 0,
    message: `Split processado: Anjoimob R$${split.anjoimobValor.toFixed(2)} | Corretor R$${split.vendedorValor.toFixed(2)} | Captador R$${split.captadorValor.toFixed(2)}`,
  });

  return NextResponse.json({
    success: true,
    split,
    cenario: split.cenario,
    transacao_id: transaction_id,
  });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get('tipo');

  let query = supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (tipo) query = query.eq('tipo', tipo);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data: data ?? [] });
}
