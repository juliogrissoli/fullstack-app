import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const imovelId = form.get('imovel_id') as string | null;
    const titulo = (form.get('titulo') as string | null)?.trim() || 'Ambiente';

    if (!file || !imovelId) {
        return NextResponse.json({ error: 'file e imovel_id são obrigatórios' }, { status: 400 });
    }

    const { data: property } = await supabase
        .from('properties')
        .select('id')
        .eq('id', imovelId)
        .eq('broker_id', user.id)
        .single();

    if (!property) {
        return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }

    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `tours/${imovelId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(path, file, { upsert: false, contentType: file.type });

    if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('property-images').getPublicUrl(path);

    const { data: scenes, error: rpcError } = await supabase.rpc('add_tour_scene', {
        p_imovel_id: imovelId,
        p_scene_id: randomUUID(),
        p_titulo: titulo,
        p_image_url: urlData.publicUrl,
    });

    if (rpcError) {
        return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, scenes });
}
