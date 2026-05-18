import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { SecurityBroker } from '@/lib/security';

export async function POST(request: NextRequest) {
  // Rate limit por IP — proteção parcial; substitua por Upstash Redis em produção
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const security = SecurityBroker.getInstance();
  if (!security.rateLimit(`capturar:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Muitas requisições. Tente novamente em instantes.' }, { status: 429 });
  }

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

  if (!nome?.trim() || !telefone?.trim()) {
    return NextResponse.json({ error: 'Nome e telefone obrigatórios' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({
      lead_name: nome.trim(),
      phone: telefone.trim(),
      email: email?.trim() ?? null,
      property_id: property_id ?? null,
      source: utm_source ?? 'organico',
      utm_medium: utm_medium ?? null,
      utm_campaign: utm_campaign ?? null,
      broker_id: corretor_ref ?? null,
      status: 'novo',
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erro ao registrar lead' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    lead_id: data.id,
    mensagem: 'Lead registrado com sucesso!',
  });
}
