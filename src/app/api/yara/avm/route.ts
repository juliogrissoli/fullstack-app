import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const bairro = searchParams.get('bairro');
  const area_m2 = Number(searchParams.get('area_m2') ?? '0');

  if (!bairro) {
    return NextResponse.json({ error: 'Parâmetro bairro obrigatório' }, { status: 400 });
  }

  // Busca preço médio/m² com dados reais da tabela properties
  const { data: properties, error } = await supabase
    .from('properties')
    .select('valor, area_m2')
    .ilike('bairro', `%${bairro}%`)
    .eq('status', 'disponivel')
    .not('valor', 'is', null)
    .not('area_m2', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const amostras = (properties ?? []).filter(
    (p) => p.valor > 0 && p.area_m2 > 0
  );

  const preco_medio_m2 =
    amostras.length > 0
      ? amostras.reduce((acc, p) => acc + p.valor / p.area_m2, 0) / amostras.length
      : null;

  const valor_estimado =
    preco_medio_m2 && area_m2 > 0 ? preco_medio_m2 * area_m2 : null;

  return NextResponse.json({
    bairro,
    area_m2: area_m2 || null,
    preco_medio_m2: preco_medio_m2 ? Math.round(preco_medio_m2) : null,
    valor_estimado: valor_estimado ? Math.round(valor_estimado) : null,
    amostras: amostras.length,
    confianca: amostras.length >= 10 ? 'alta' : amostras.length >= 3 ? 'media' : 'baixa',
    fonte: 'anjoimob_properties',
    gerado_em: new Date().toISOString(),
  });
}
