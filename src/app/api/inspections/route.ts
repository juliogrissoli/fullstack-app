import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await request.json();
  const { property_id, inspection_type, photos, checklist, notes, latitude, longitude } = body;

  if (!property_id || !inspection_type) {
    return NextResponse.json({ error: 'property_id e inspection_type são obrigatórios' }, { status: 400 });
  }

  const { data, error } = await supabase.from('inspections').insert({
    property_id,
    broker_id: user.id,
    inspection_type,
    photos: photos || [],
    checklist: checklist || {},
    notes,
    latitude,
    longitude,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    inspection_hash: data.inspection_hash,
    id: data.id,
    mensagem: 'Vistoria registrada com protocolo Ouroboros SHA-256.'
  });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get('property_id');

  let query = supabase
    .from('inspections')
    .select('*, properties(titulo)')
    .order('inspected_at', { ascending: false });

  if (propertyId) query = query.eq('property_id', propertyId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inspections: data });
}
