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

function isValidCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== Number(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === Number(digits[10]);
}

const INTENT_TYPES = ['comprar', 'vender', 'alugar', 'investir'] as const;
const URGENCY_TYPES = ['imediato', '30_dias', '90_dias', 'sem_pressa'] as const;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    if (!body.lead_name?.trim()) {
      return NextResponse.json({ error: 'lead_name é obrigatório' }, { status: 400 });
    }

    if (!body.consent_credit_check) {
      return NextResponse.json({ error: 'Consentimento para consulta de crédito é obrigatório' }, { status: 400 });
    }

    if (body.tax_id && !isValidCpf(body.tax_id)) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 });
    }

    if (body.intent_type && !INTENT_TYPES.includes(body.intent_type)) {
      return NextResponse.json({ error: 'intent_type inválido' }, { status: 400 });
    }

    if (body.decision_urgency && !URGENCY_TYPES.includes(body.decision_urgency)) {
      return NextResponse.json({ error: 'decision_urgency inválido' }, { status: 400 });
    }

    if (body.monthly_income !== undefined && (typeof body.monthly_income !== 'number' || body.monthly_income < 0)) {
      return NextResponse.json({ error: 'monthly_income inválido' }, { status: 400 });
    }

    const { data: lead, error } = await supabase.from('leads').insert({
      lead_name: body.lead_name.trim(),
      tax_id: body.tax_id ? body.tax_id.replace(/\D/g, '') : null,
      intent_type: body.intent_type ?? null,
      financial_capacity: body.financial_capacity ?? null,
      monthly_income: body.monthly_income ?? null,
      decision_urgency: body.decision_urgency ?? null,
      has_collateral: Boolean(body.has_collateral),
      consent_credit_check: Boolean(body.consent_credit_check),
      target_roi: body.target_roi ?? null,
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
        html: `<h1>Parabéns!</h1><p>Sua qualificação foi aprovada. Nossa equipe entrará em contato em até 24h para agendar sua consultoria exclusiva.</p>`,
      });
    }

    return NextResponse.json({
      success: true,
      lead_id: lead.id,
      decision: decision?.decision_path ?? 'REJEITAR',
    });

  } catch (error: any) {
    console.error('Erro no /api/lead:', error);
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
}
