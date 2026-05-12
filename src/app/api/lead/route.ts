import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

let _supabase: ReturnType<typeof createClient> | null = null;
const supabase = new Proxy({}, {
  get(_: object, prop: string | symbol) {
    if (!_supabase) _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    return Reflect.get(_supabase, prop);
  },
}) as SupabaseClient<any>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      lead_name, tax_id, intent_type,
      financial_capacity, monthly_income,
      decision_urgency, has_collateral,
      consent_credit_check, target_roi
    } = body;

    if (!lead_name || !tax_id) {
      return NextResponse.json({ erro: 'Nome e CPF/CNPJ são obrigatórios' }, { status: 400 });
    }

    // Insere o lead — o trigger calcular_score_lead dispara automaticamente
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        lead_name,
        tax_id,
        intent_type,
        financial_capacity,
        monthly_income,
        decision_urgency,
        has_collateral,
        consent_credit_check,
        target_roi,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (leadError) {
      console.error('Erro ao inserir lead:', leadError);
      return NextResponse.json({ erro: leadError.message }, { status: 500 });
    }

    // Busca a decisão gerada pelo trigger
    const { data: engine } = await supabase
      .from('decision_engine')
      .select('lead_score, decision_path')
      .eq('lead_id', lead.id)
      .single();

    return NextResponse.json({
      sucesso: true,
      lead_id: lead.id,
      score: engine?.lead_score ?? 0,
      decision: engine?.decision_path ?? 'REJEITAR'
    });

  } catch (error: any) {
    console.error('Erro no /api/lead:', error);
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
}
