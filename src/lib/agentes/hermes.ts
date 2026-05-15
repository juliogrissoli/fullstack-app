import { Resend } from 'resend';

interface ScriptFechamento {
  canal: 'whatsapp' | 'email' | 'sms';
  mensagem: string;
  callToAction: string;
}

export function gerarScriptFechamento(dados: {
  nomeLead: string;
  nomeCorretor: string;
  valorImovel: number;
  roi: number;
  urgencia: string;
}): ScriptFechamento {
  const mensagem = `Olá ${dados.nomeLead}, sou ${dados.nomeCorretor} da Anjoimob.

Analisei seu perfil e o imóvel de R$ ${dados.valorImovel.toLocaleString('pt-BR')} tem um ROI projetado de ${dados.roi}% ao ano.
${dados.urgencia === 'urgente' ? 'Essa condição é válida apenas até esta semana.' : 'Podemos agendar uma visita quando for conveniente.'}

Faz sentido conversarmos hoje?`;

  return {
    canal: 'whatsapp',
    mensagem,
    callToAction: 'Responder "SIM" para agendar'
  };
}

let _resend: Resend | null = null;
const resend = new Proxy({}, {
  get(_: object, prop: string | symbol) {
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!);
    return Reflect.get(_resend, prop);
  },
}) as unknown as Resend;

export async function enviarScriptFechamento(
  emailLead: string,
  script: ScriptFechamento
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: 'Anjoimob <contato@anjoimob.com>',
      to: emailLead,
      subject: 'Proposta Exclusiva — Anjoimob',
      html: `<div style="background:#1a1a2e; color:#fff; padding:20px; border-radius:8px;">
        <h2 style="color:#D4AF37;">🦅 Proposta Anjoimob</h2>
        <p>${script.mensagem.replace(/\n/g, '<br>')}</p>
        <p style="margin-top:20px;"><strong>${script.callToAction}</strong></p>
      </div>`
    });
    return true;
  } catch {
    return false;
  }
}
