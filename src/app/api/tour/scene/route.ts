import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { imovel_id, scene_id } = await req.json();
    if (!imovel_id || !scene_id) {
        return NextResponse.json({ error: 'imovel_id e scene_id são obrigatórios' }, { status: 400 });
    }

    const { data: property } = await supabase
        .from('properties')
        .select('id')
        .eq('id', imovel_id)
        .eq('broker_id', user.id)
        .single();

    if (!property) {
        return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }

    const { data: scenes, error } = await supabase.rpc('remove_tour_scene', {
        p_imovel_id: imovel_id,
        p_scene_id: scene_id,
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, scenes });
}
