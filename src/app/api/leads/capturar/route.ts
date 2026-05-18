import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const {
    nome,
    telefone,
    email,
    property_id,
    utm_source,
    utm_medium,
    utm_campaign,
    corretor_ref,
  } = body;

  if (!nome || !telefone) {
    return NextResponse.json({ error: 'Nome e telefone obrigatórios' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({
      lead_name: nome,
      phone: telefone,
      email: email ?? null,
      property_id: property_id ?? null,
      source: utm_source ?? 'organico',
      utm_medium: utm_medium ?? null,
      utm_campaign: utm_campaign ?? null,
      broker_id: corretor_ref ?? null,
      status: 'novo',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    lead_id: data.id,
    mensagem: 'Lead registrado com sucesso!',
  });
}
