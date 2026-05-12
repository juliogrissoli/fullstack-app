import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, email, telefone, empreendimento, unidades_paradas, vgv_estimado } = body;

    if (!nome || !email || !empreendimento) {
      return NextResponse.json({ error: 'Nome, email e empreendimento são obrigatórios' }, { status: 400 });
    }

    const supabase = await createClient();

    await supabase.from('leads').insert({
      lead_name: nome,
      email,
      telefone,
      intent_type: 'Incorporadora',
      financial_capacity: vgv_estimado,
      decision_urgency: 'urgente',
      has_collateral: true,
      consent_credit_check: true,
      target_roi: 15,
      empreendimento,
      unidades_paradas,
      vgv_estimado
    });

    return NextResponse.json({ sucesso: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
