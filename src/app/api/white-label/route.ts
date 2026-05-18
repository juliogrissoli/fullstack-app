import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dominio = searchParams.get('dominio');

  if (dominio) {
    // Consulta pública por domínio (para white label serving)
    const { data, error } = await supabase
      .from('configuracoes_white_label')
      .select('nome_empresa, logo_url, cor_primaria, cor_secundaria, ativo')
      .eq('dominio', dominio)
      .eq('ativo', true)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Domínio não configurado' }, { status: 404 });
    return NextResponse.json({ success: true, config: data });
  }

  // Retorna configuração do broker autenticado
  const { data: broker } = await supabase
    .from('brokers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!broker) return NextResponse.json({ error: 'Broker não encontrado' }, { status: 404 });

  const { data, error } = await supabase
    .from('configuracoes_white_label')
    .select('*')
    .eq('broker_id', broker.id)
    .single();

  if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, config: data ?? null });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: broker } = await supabase
    .from('brokers')
    .select('id, is_associado')
    .eq('user_id', user.id)
    .single();

  if (!broker) return NextResponse.json({ error: 'Broker não encontrado' }, { status: 404 });
  if (!broker.is_associado) return NextResponse.json({ error: 'White Label disponível apenas para Associados PRO' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { dominio, logo_url, cor_primaria, cor_secundaria, nome_empresa, email_suporte, telefone_suporte } = body as {
    dominio?: string; logo_url?: string; cor_primaria?: string;
    cor_secundaria?: string; nome_empresa?: string; email_suporte?: string; telefone_suporte?: string;
  };

  const { data, error } = await supabase
    .from('configuracoes_white_label')
    .upsert({
      broker_id: broker.id,
      dominio,
      logo_url,
      cor_primaria: cor_primaria ?? '#D4AF37',
      cor_secundaria: cor_secundaria ?? '#1a1a2e',
      nome_empresa,
      email_suporte,
      telefone_suporte,
      ativo: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'broker_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Atualiza também o dominio_personalizado no broker
  if (dominio) {
    await supabase.from('brokers').update({ dominio_personalizado: dominio }).eq('id', broker.id);
  }

  return NextResponse.json({ success: true, config: data });
}

export async function DELETE(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: broker } = await supabase
    .from('brokers').select('id').eq('user_id', user.id).single();

  if (!broker) return NextResponse.json({ error: 'Broker não encontrado' }, { status: 404 });

  await supabase.from('configuracoes_white_label').update({ ativo: false }).eq('broker_id', broker.id);
  return NextResponse.json({ success: true });
}
