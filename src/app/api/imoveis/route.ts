import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { titulo, tipo, bairro, endereco, descricao, valor, area_m2, quartos, banheiros, vagas, fotos } = body;

    if (!titulo?.trim()) {
        return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 });
    }
    if (!valor || Number(valor) <= 0) {
        return NextResponse.json({ error: 'Valor deve ser maior que zero' }, { status: 400 });
    }

    const { data: property, error } = await supabase
        .from('properties')
        .insert({
            titulo: titulo.trim(),
            tipo: tipo || 'apartamento',
            bairro: bairro?.trim() || null,
            endereco: endereco?.trim() || null,
            descricao: descricao?.trim() || null,
            valor: Number(valor),
            area_m2: area_m2 ? Number(area_m2) : null,
            quartos: quartos ? Number(quartos) : null,
            banheiros: banheiros ? Number(banheiros) : null,
            vagas: vagas ? Number(vagas) : null,
            fotos: fotos ?? [],
            status: 'disponivel',
            tour_scenes: [],
            broker_id: user.id,
            embedding_pending: true,
        })
        .select('id')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: property.id }, { status: 201 });
}
