import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('permutas')
    .select('*')
    .eq('status', 'aberto')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ permutas: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { tipo, descricao, valor_estimado } = body as { tipo: string; descricao: string; valor_estimado?: number };
  if (!tipo || !descricao) {
    return NextResponse.json({ error: 'Tipo e descrição obrigatórios' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('permutas')
    .insert({ usuario_id: user.id, tipo, descricao, valor_estimado: valor_estimado ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, permuta: data }, { status: 201 });
}
