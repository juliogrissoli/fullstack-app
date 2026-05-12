import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function calcularAVM(supabase: any, bairro: string, area_m2: number) {
  const { data: properties, error } = await supabase
    .from('properties')
    .select('valor, area_m2')
    .ilike('bairro', `%${bairro}%`)
    .eq('status', 'disponivel')
    .not('valor', 'is', null)
    .not('area_m2', 'is', null);

  if (error) throw new Error(error.message);

  const amostras = (properties ?? []).filter((p: any) => p.valor > 0 && p.area_m2 > 0);
  const preco_medio_m2 =
    amostras.length > 0
      ? amostras.reduce((acc: number, p: any) => acc + p.valor / p.area_m2, 0) / amostras.length
      : null;

  const valor_estimado = preco_medio_m2 && area_m2 > 0 ? Math.round(preco_medio_m2 * area_m2) : null;
  const faixa_min = valor_estimado ? Math.round(valor_estimado * 0.85) : null;
  const faixa_max = valor_estimado ? Math.round(valor_estimado * 1.15) : null;

  return {
    bairro,
    area_m2: area_m2 || null,
    preco_medio_m2: preco_medio_m2 ? Math.round(preco_medio_m2) : null,
    valor_estimado,
    faixa_min,
    faixa_max,
    amostras: amostras.length,
    confianca: amostras.length >= 10 ? 'alta' : amostras.length >= 3 ? 'media' : 'baixa',
    fonte: 'anjoimob_properties',
    gerado_em: new Date().toISOString(),
  };
}

// GET ?bairro=Moema&area_m2=80
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const bairro = searchParams.get('bairro');
  const area_m2 = Number(searchParams.get('area_m2') ?? '0');

  if (!bairro) return NextResponse.json({ error: 'Parâmetro bairro obrigatório' }, { status: 400 });

  try {
    return NextResponse.json(await calcularAVM(supabase, bairro, area_m2));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST { endereco: "Rua X, 123, Moema, SP" }
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { endereco } = await request.json();

  if (!endereco) return NextResponse.json({ error: 'endereco obrigatório' }, { status: 400 });

  // Extrai bairro: último segmento antes de sigla de estado ou da vírgula final
  const partes = endereco.split(',').map((s: string) => s.trim()).filter(Boolean);
  const bairro = partes.length >= 2 ? partes[partes.length - 2] : partes[0];

  try {
    return NextResponse.json(await calcularAVM(supabase, bairro, 0));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
