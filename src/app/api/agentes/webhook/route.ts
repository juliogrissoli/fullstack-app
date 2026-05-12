import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { evento, lead_id } = body;

  const triggerMap: Record<string, string> = {
    'lead_criado': 'novo_lead',
    'visita_registrada': 'visita',
    'proposta_enviada': 'proposta',
    'proposta_aceita': 'fechamento'
  };

  const trigger = triggerMap[evento] || 'novo_lead';

  const orquestradorUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/agentes/orquestrar`;

  const response = await fetch(orquestradorUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead_id, trigger })
  });

  const resultado = await response.json();

  return NextResponse.json({ success: true, evento, trigger, resultado });
}
