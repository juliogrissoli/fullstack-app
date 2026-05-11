import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  let query: string;
  try {
    const body = await request.json();
    query = body.query;
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  if (!query) return NextResponse.json({ error: 'Query obrigatória' }, { status: 400 });

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY não configurada. Configure no Vercel e redeploye.' },
      { status: 503 }
    );
  }

  const embeddingRes = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: query }),
  });

  if (!embeddingRes.ok) {
    return NextResponse.json({ error: 'Falha ao gerar embedding' }, { status: 502 });
  }

  const { data: embeddingData } = await embeddingRes.json();
  const embedding = embeddingData?.[0]?.embedding;
  if (!embedding) return NextResponse.json({ error: 'Embedding vazio' }, { status: 500 });

  const { data: results, error } = await supabase.rpc('search_properties', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: 10,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const propertyIds = (results ?? []).map((r: { property_id: string }) => r.property_id);

  const { data: properties } = propertyIds.length
    ? await supabase.from('properties').select('*').in('id', propertyIds)
    : { data: [] };

  return NextResponse.json({
    query,
    total: results?.length ?? 0,
    results: (properties ?? []).map((p: Record<string, unknown>) => ({
      ...p,
      similarity: results?.find(
        (r: { property_id: string }) => r.property_id === p.id
      )?.similarity,
    })),
  });
}
