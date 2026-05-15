import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const { imovel_id, duracao_segundos, intencao_alta } = body;

    if (!imovel_id) {
        return NextResponse.json({ error: 'imovel_id obrigatório' }, { status: 400 });
    }

    const { error } = await supabase.from('tours_analytics').insert({
        imovel_id,
        user_id: user?.id ?? null,
        duracao_segundos: duracao_segundos ?? 0,
        intencao_alta: intencao_alta ?? false,
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (intencao_alta && imovel_id) {
        await supabase
            .from('leads')
            .update({ status: 'intencao_alta' })
            .eq('property_id', imovel_id)
            .eq('user_id', user?.id ?? '');
    }

    return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const imovelId = searchParams.get('imovel_id');

    let query = supabase
        .from('tours_analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (imovelId) query = query.eq('imovel_id', imovelId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ analytics: data });
}
