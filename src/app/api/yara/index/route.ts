import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Rota chamada por cron (Vercel Cron ou externo) para gerar embeddings pendentes
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY não configurada' }, { status: 503 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: pendentes, error } = await supabase
    .from('properties_pending_embedding')
    .select('*')
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pendentes?.length) return NextResponse.json({ indexed: 0, message: 'Nenhum pendente' });

  let indexed = 0;

  for (const prop of pendentes) {
    const content = [
      prop.titulo,
      prop.descricao,
      prop.tipo,
      prop.bairro,
      prop.valor ? `R$ ${prop.valor}` : '',
      prop.area_m2 ? `${prop.area_m2}m²` : '',
    ]
      .filter(Boolean)
      .join(' — ');

    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: content }),
    });

    if (!res.ok) continue;

    const { data } = await res.json();
    const embedding = data?.[0]?.embedding;
    if (!embedding) continue;

    await supabase.from('property_embeddings').upsert(
      { property_id: prop.id, embedding, content },
      { onConflict: 'property_id' }
    );

    await supabase
      .from('properties')
      .update({ embedding_pending: false, embedding_updated_at: new Date().toISOString() })
      .eq('id', prop.id);

    indexed++;
  }

  return NextResponse.json({ indexed, total_pendentes: pendentes.length });
}
