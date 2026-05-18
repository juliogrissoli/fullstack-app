import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get('categoria');
  const status = searchParams.get('status') ?? 'ativo';

  let query = supabase
    .from('prestadores')
    .select('*, avaliacoes(nota)')
    .eq('status', status)
    .order('avaliacao', { ascending: false });

  if (categoria) query = query.eq('categoria', categoria);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, prestadores: data ?? [], total: data?.length ?? 0 });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  let body: { acao: string; dados?: Record<string, unknown> };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { acao, dados } = body;

  if (acao === 'cadastrar_prestador') {
    const { nome, categoria, descricao } = (dados ?? {}) as { nome?: string; categoria?: string; descricao?: string };
    if (!nome || !categoria) return NextResponse.json({ error: 'nome e categoria são obrigatórios' }, { status: 400 });

    const { data, error } = await supabase
      .from('prestadores')
      .insert({ user_id: user.id, nome, categoria, descricao, status: 'pendente' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, prestador: data });
  }

  if (acao === 'avaliar') {
    const { prestador_id, nota, comentario } = (dados ?? {}) as { prestador_id?: string; nota?: number; comentario?: string };
    if (!prestador_id || !nota) return NextResponse.json({ error: 'prestador_id e nota obrigatórios' }, { status: 400 });

    const { data, error } = await supabase
      .from('avaliacoes')
      .insert({ prestador_id, cliente_id: user.id, nota, comentario })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, avaliacao: data });
  }

  if (acao === 'listar_permutas') {
    const { data, error } = await supabase
      .from('permutas')
      .select('*')
      .eq('status', 'aberto')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, permutas: data ?? [] });
  }

  return NextResponse.json({ error: 'Ação inválida. Use: cadastrar_prestador, avaliar, listar_permutas' }, { status: 400 });
}
