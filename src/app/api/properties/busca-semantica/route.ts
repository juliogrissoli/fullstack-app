import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { query } = await request.json();

  if (!query) {
    return NextResponse.json({ error: 'Query é obrigatória' }, { status: 400 });
  }

  const openaiResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: query,
    }),
  });

  const { data: embeddingData } = await openaiResponse.json();
  const embedding = embeddingData[0]?.embedding;

  if (!embedding) {
    return NextResponse.json({ error: 'Falha ao gerar embedding' }, { status: 500 });
  }

  const { data: results, error } = await supabase.rpc('search_properties', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: 10,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const propertyIds = results?.map((r: { property_id: string }) => r.property_id) ?? [];

  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .in('id', propertyIds);

  return NextResponse.json({
    query,
    results: properties?.map((p: Record<string, unknown>) => ({
      ...p,
      similarity: results?.find((r: { property_id: string }) => r.property_id === p.id)?.similarity,
    })) ?? [],
    total: results?.length ?? 0,
  });
}
