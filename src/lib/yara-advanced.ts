import { createClient } from '@/lib/supabase/server';

interface SearchResult {
  property_id: string;
  content: string;
  similarity: number;
  titulo?: string;
  preco?: number;
  bairro?: string;
}

async function getOpenAIEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embeddings: ${res.status} ${err}`);
  }

  const { data } = await res.json();
  return data?.[0]?.embedding as number[];
}

export async function semanticSearch(
  query: string,
  threshold = 0.7,
  limit = 10
): Promise<SearchResult[]> {
  const supabase = await createClient();
  const embedding = await getOpenAIEmbedding(query);

  const { data, error } = await supabase.rpc('search_properties', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) throw error;

  const ids = (data || []).map((r: { property_id: string }) => r.property_id);
  if (ids.length === 0) return [];

  const { data: properties } = await supabase
    .from('properties')
    .select('id, titulo, valor, bairro')
    .in('id', ids);

  const propertyMap = new Map((properties || []).map(p => [p.id, p]));

  return (data || []).map((r: { property_id: string; content: string; similarity: number }) => ({
    property_id: r.property_id,
    content: r.content,
    similarity: r.similarity,
    titulo: propertyMap.get(r.property_id)?.titulo,
    preco: propertyMap.get(r.property_id)?.valor,
    bairro: propertyMap.get(r.property_id)?.bairro,
  }));
}

export async function generatePropertyInsight(propertyId: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');

  const supabase = await createClient();

  const { data: property } = await supabase
    .from('properties')
    .select('titulo, tipo, area_m2, valor, bairro')
    .eq('id', propertyId)
    .single();

  if (!property) throw new Error('Imóvel não encontrado');

  const { count: toursCount } = await supabase
    .from('tours_analytics')
    .select('*', { count: 'exact', head: true })
    .eq('imovel_id', propertyId);

  const prompt = `Analise este imóvel e gere um insight de venda em 3 parágrafos curtos (precificação, perfil de comprador ideal, estratégia de marketing):
- Título: ${property.titulo}
- Tipo: ${property.tipo}
- Área: ${property.area_m2}m²
- Preço: R$ ${property.valor?.toLocaleString('pt-BR')}
- Bairro: ${property.bairro}
- Tours realizados: ${toursCount ?? 0}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 350,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI chat: ${res.status} ${err}`);
  }

  const aiData = await res.json();
  return aiData.choices?.[0]?.message?.content ?? 'Insight não disponível';
}
