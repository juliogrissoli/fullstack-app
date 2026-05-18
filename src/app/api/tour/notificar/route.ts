import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export async function POST(req: NextRequest) {
    // Requer chave interna para evitar abuso por terceiros
    const internalKey = process.env.INTERNAL_API_KEY;
    if (internalKey) {
        const provided = req.headers.get('x-internal-key');
        if (provided !== internalKey) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }
    }

    const supabase = await createClient();

    const body = await req.json();
    const { imovel_id, lead_nome, lead_telefone, duracao_segundos } = body;

    if (!imovel_id) {
        return NextResponse.json({ error: 'imovel_id é obrigatório' }, { status: 400 });
    }

    const { data: imovel } = await supabase
        .from('properties')
        .select('titulo, broker_id')
        .eq('id', imovel_id)
        .single();

    if (!imovel?.broker_id) {
        return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }

    const { data: corretor } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('id', imovel.broker_id)
        .single();

    if (!corretor?.email) {
        return NextResponse.json({ error: 'Corretor sem e-mail cadastrado' }, { status: 404 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
        return NextResponse.json({ error: 'RESEND_API_KEY não configurada' }, { status: 503 });
    }

    const minutos = Math.floor((duracao_segundos ?? 0) / 60);
    const segundos = (duracao_segundos ?? 0) % 60;
    const tempo = minutos > 0 ? `${minutos}min ${segundos}s` : `${segundos}s`;
    const nomeVisitante = escapeHtml(lead_nome?.trim() || 'Visitante anônimo');
    const telefone = escapeHtml(lead_telefone?.trim() || 'Não informado');
    const tituloImovel = escapeHtml(imovel.titulo ?? '');
    const nomeCorretor = escapeHtml(corretor.name || 'corretor');

    const resend = new Resend(resendKey);

    const { error: emailError } = await resend.emails.send({
        from: 'Anjoimob <contato@anjoimob.com>',
        to: corretor.email,
        subject: `Lead quente — ${nomeVisitante} passou ${tempo} no tour de ${tituloImovel}`,
        html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#111827;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;padding:32px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1f2937;border-radius:12px;border:1px solid #D4AF37;overflow:hidden;">
        <tr>
          <td style="background:#D4AF37;padding:20px 28px;">
            <p style="margin:0;color:#111827;font-size:20px;font-weight:bold;">Anjoimob — Alerta de Lead Quente</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 20px;color:#f9fafb;font-size:16px;">
              Olá, <strong>${nomeCorretor}</strong>! Um visitante demonstrou interesse alto no seu imóvel.
            </p>
            <table width="100%" cellpadding="8" cellspacing="0" style="background:#111827;border-radius:8px;border:1px solid #374151;margin-bottom:24px;">
              <tr>
                <td style="color:#9ca3af;font-size:13px;width:130px;padding:10px 12px;">Imóvel</td>
                <td style="color:#f9fafb;font-size:13px;font-weight:bold;padding:10px 12px;">${tituloImovel}</td>
              </tr>
              <tr style="border-top:1px solid #374151;">
                <td style="color:#9ca3af;font-size:13px;padding:10px 12px;">Visitante</td>
                <td style="color:#f9fafb;font-size:13px;padding:10px 12px;">${nomeVisitante}</td>
              </tr>
              <tr style="border-top:1px solid #374151;">
                <td style="color:#9ca3af;font-size:13px;padding:10px 12px;">WhatsApp</td>
                <td style="color:#f9fafb;font-size:13px;padding:10px 12px;">${telefone}</td>
              </tr>
              <tr style="border-top:1px solid #374151;">
                <td style="color:#9ca3af;font-size:13px;padding:10px 12px;">Tempo no tour</td>
                <td style="color:#D4AF37;font-size:13px;font-weight:bold;padding:10px 12px;">${tempo}</td>
              </tr>
            </table>
            <p style="margin:0 0 20px;color:#d1d5db;font-size:14px;">
              Leads com mais de 2 minutos no tour têm <strong style="color:#D4AF37;">taxa de conversão 3× maior</strong>. Entre em contato agora.
            </p>
            <a href="https://anjoimob.com/dashboard" style="display:inline-block;background:#D4AF37;color:#111827;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;">
              Ver no Dashboard →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px;border-top:1px solid #374151;">
            <p style="margin:0;color:#6b7280;font-size:12px;">Anjoimob · Sistema Imobiliário de Alta Performance</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    if (emailError) {
        return NextResponse.json({ error: emailError.message }, { status: 500 });
    }

    await supabase.from('agent_logs').insert({
        agent_name: 'hermes',
        lead_id: body.lead_id ?? null,
        action: 'notificar_intencao_alta',
        decision: 'enviado',
        message: `E-mail para ${corretor.email} — ${nomeVisitante} no tour de ${imovel.titulo} (${tempo})`,
    });

    return NextResponse.json({ ok: true, notificado: corretor.email });
}
