import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generatePropertyInsight } from '@/lib/yara-advanced';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  let property_id: string;
  try {
    ({ property_id } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  if (!property_id) {
    return NextResponse.json({ error: 'property_id obrigatório' }, { status: 400 });
  }

  try {
    const insight = await generatePropertyInsight(property_id);
    return NextResponse.json({ success: true, insight });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const status = msg.includes('não configurada') ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
