import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  let body: { dominio_personalizado: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const dominio = body.dominio_personalizado?.toLowerCase().trim();
  if (!dominio || dominio.length < 4) {
    return NextResponse.json({ error: 'Domínio inválido' }, { status: 400 });
  }

  // Verificar se é Associado PRO
  const { data: broker } = await supabase
    .from('brokers')
    .select('is_associado')
    .eq('user_id', user.id)
    .single();

  if (!broker?.is_associado) {
    return NextResponse.json(
      { error: 'Domínio personalizado exclusivo para Associados PRO' },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from('brokers')
    .update({ dominio_personalizado: dominio })
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, dominio_personalizado: dominio });
}
