import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const categoria = searchParams.get('categoria');

  let query = supabase
    .from('prestadores')
    .select('*')
    .eq('status', 'ativo')
    .order('avaliacao', { ascending: false });

  if (categoria) query = query.eq('categoria', categoria);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ prestadores: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { nome, categoria, descricao } = body as Record<string, string>;
  if (!nome || !categoria) {
    return NextResponse.json({ error: 'Nome e categoria obrigatórios' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('prestadores')
    .insert({ user_id: user.id, nome, categoria, descricao: descricao ?? null, status: 'pendente' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, prestador: data }, { status: 201 });
}
