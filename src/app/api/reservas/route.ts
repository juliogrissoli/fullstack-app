import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await request.json();
  const { property_id, unit_number } = body;

  if (!property_id || !unit_number) {
    return NextResponse.json({ error: 'property_id e unit_number são obrigatórios' }, { status: 400 });
  }

  const hashData = `${property_id}-${unit_number}-${user.id}-${Date.now()}`;
  const reservationHash = crypto.createHash('sha256').update(hashData).digest('hex');

  const { data, error } = await supabase.from('reservas').insert({
    property_id,
    unit_number,
    broker_id: user.id,
    reservation_hash: reservationHash,
    expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    status: 'ativa'
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    reservation_hash: reservationHash,
    expires_at: data.expires_at,
    mensagem: 'Unidade reservada por 48h. Comissão blindada.'
  });
}
