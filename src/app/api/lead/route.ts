import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
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
    const supabase = await createClient();
    const body = await request.json();

    const { data: lead, error } = await supabase.from('leads').insert({
      lead_name: body.lead_name,
      tax_id: body.tax_id,
      intent_type: body.intent_type,
      financial_capacity: body.financial_capacity,
      monthly_income: body.monthly_income,
      decision_urgency: body.decision_urgency,
      has_collateral: body.has_collateral,
      consent_credit_check: body.consent_credit_check,
      target_roi: body.target_roi
    }).select('id').single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: decision } = await supabase
      .from('decision_engine')
      .select('decision_path')
      .eq('lead_id', lead.id)
      .single();

    if (decision?.decision_path === 'ATACAR' && body.email) {
      await resend.emails.send({
        from: 'Anjoimob <contato@anjoimob.com>',
        to: body.email,
        subject: 'Pré-aprovado! Agende agora.',
        html: `<h1>Parabéns, ${body.lead_name}!</h1><p>Sua qualificação foi aprovada. Nossa equipe entrará em contato em até 24h para agendar sua consultoria exclusiva.</p>`
      });
    }

    return NextResponse.json({
      success: true,
      lead_id: lead.id,
      decision: decision?.decision_path ?? 'REJEITAR'
    });

  } catch (error: any) {
    console.error('Erro no /api/lead:', error);
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
}
