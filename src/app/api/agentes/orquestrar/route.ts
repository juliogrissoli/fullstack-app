import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { lead_id, trigger } = body;

  if (!lead_id || !trigger) {
    return NextResponse.json({ error: 'lead_id e trigger são obrigatórios' }, { status: 400 });
  }

  const agentLog: any[] = [];
  const decisao = { acao: '', mensagem: '', proximoPasso: '' };

  const { data: lead } = await supabase.from('leads').select('*').eq('id', lead_id).single();
  const { data: decision } = await supabase.from('decision_engine').select('*').eq('lead_id', lead_id).single();

  if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

  // Árion — Qualificação
  const score = decision?.lead_score || 0;
  const nivel = score >= 70 ? 'ATACAR' : score >= 40 ? 'NUTRIR' : 'REJEITAR';

  await supabase.from('agent_logs').insert({ agent_name: 'arion', lead_id, action: 'qualificar', decision: nivel, score_impact: score, message: `Score ${score}: ${nivel}` });
  agentLog.push({ agente: 'Árion', decisao: nivel, score });

  // Themis — Validação Jurídica
  if (['visita', 'proposta', 'fechamento'].includes(trigger)) {
    const { data: checkin } = await supabase.from('checkins').select('*').eq('lead_id', lead_id).single();
    const nexoOk = !!checkin?.blockchain_hash;
    await supabase.from('agent_logs').insert({ agent_name: 'themis', lead_id, action: 'validar_nexo', decision: nexoOk ? 'seguro' : 'risco', message: nexoOk ? 'Nexo Causal confirmado' : 'ALERTA: Visita sem registro' });
    agentLog.push({ agente: 'Themis', decisao: nexoOk ? 'seguro' : 'risco' });
  }

  // Plutus — Cálculo Financeiro
  if (['proposta', 'fechamento'].includes(trigger)) {
    const valorEstimado = 500000;
    const comissao = valorEstimado * 0.06;
    const splitCorretor = comissao * 0.80;
    await supabase.from('agent_logs').insert({ agent_name: 'plutus', lead_id, action: 'calcular_split', decision: 'viavel', message: `Comissão: R$ ${comissao.toLocaleString('pt-BR')} | Corretor: R$ ${splitCorretor.toLocaleString('pt-BR')}` });
    agentLog.push({ agente: 'Plutus', decisao: 'viavel', comissao, splitCorretor });
  }

  // Yara — Decisão Final
  if (trigger === 'novo_lead') {
    if (nivel === 'ATACAR') { decisao.acao = 'notificar_corretor'; decisao.mensagem = '🔥 Lead QUENTE! Contate imediatamente.'; decisao.proximoPasso = 'Enviar mensagem via Resend e WhatsApp'; }
    else if (nivel === 'NUTRIR') { decisao.acao = 'nutrir'; decisao.mensagem = '⚡ Lead MORNO. Iniciar sequência de nutrição.'; decisao.proximoPasso = 'Enviar White Paper e agendar follow-up em 24h'; }
    else { decisao.acao = 'arquivar'; decisao.mensagem = '❄️ Lead FRIO. Arquivar sem queimar tempo.'; decisao.proximoPasso = 'Reavaliar em 30 dias'; }
  }

  if (trigger === 'fechamento') {
    decisao.acao = 'convocar_hermes';
    decisao.mensagem = '🤝 Acionar Hermes para conversa final com o corretor.';
    decisao.proximoPasso = 'Hermes enviará script de fechamento e proposta formal.';
  }

  await supabase.from('agent_logs').insert({ agent_name: 'yara', lead_id, action: trigger, decision: decisao.acao, message: decisao.mensagem });

  return NextResponse.json({ success: true, trigger, agentLog, decisao, mensagem: decisao.mensagem });
}
