import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

let _resend: Resend | null = null;
const resend = new Proxy({}, {
  get(_: object, prop: string | symbol) {
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!);
    return Reflect.get(_resend, prop);
  },
}) as unknown as Resend;

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

    await resend.emails.send({
      from: 'Anjoimob <contato@anjoimob.com.br>',
      to: 'comendador@anjoimob.com.br',
      subject: 'Nova Incorporadora Interessada',
      html: `<h2>Nova Lead de Incorporadora</h2>
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>E-mail:</strong> ${email}</p>
        <p><strong>Telefone:</strong> ${telefone}</p>
        <p><strong>Empreendimento:</strong> ${empreendimento}</p>
        <p><strong>Unidades Paradas:</strong> ${unidades_paradas}</p>
        <p><strong>VGV Estimado:</strong> R$ ${Number(vgv_estimado).toLocaleString('pt-BR')}</p>`
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
