import { createClient } from '@/lib/supabase/client';
import { Resend } from 'resend';

export interface AnaliseJuridica {
    docId: string;
    tipo: string;
    status: 'regular' | 'pendente' | 'irregular' | 'critico';
    scoreRisco: number;
    alertas: string[];
    acaoRecomendada: string;
    hashVerificacao?: string;
}

export async function analisarDocumento(
    docId: string,
    tipoDocumento: string
): Promise<AnaliseJuridica> {
    const supabase = createClient();
    const alertas: string[] = [];
    let scoreRisco = 0;
    let status: AnaliseJuridica['status'] = 'regular';

    if (!docId) {
        return {
            docId: '',
            tipo: tipoDocumento,
            status: 'critico',
            scoreRisco: 90,
            alertas: ['Documento não encontrado no Doc Vault'],
            acaoRecomendada: 'Solicitar envio imediato do documento'
        };
    }

    const { data: doc } = await supabase
        .from('doc_vault')
        .select('*')
        .eq('id', docId)
        .single();

    if (!doc) {
        return {
            docId,
            tipo: tipoDocumento,
            status: 'critico',
            scoreRisco: 85,
            alertas: ['Documento não localizado na base'],
            acaoRecomendada: 'Reenviar documento'
        };
    }

    if (!doc.hash_sha256) {
        alertas.push('Documento sem hash de autenticidade');
        scoreRisco += 20;
    }

    if (doc.created_at) {
        const diasDesdeEmissao = Math.floor(
            (Date.now() - new Date(doc.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diasDesdeEmissao > 90) {
            alertas.push(`Documento emitido há ${diasDesdeEmissao} dias — pode estar desatualizado`);
            scoreRisco += 15;
        }
    }

    if (doc.status === 'pendente') {
        alertas.push('Documento aguardando processamento OCR');
        scoreRisco += 25;
        status = 'pendente';
    }

    const regrasTipo: Record<string, { alertas: string[]; score: number }> = {
        'matricula': {
            alertas: doc.status !== 'validado' ? ['Matrícula não validada — verificar ônus reais'] : [],
            score: doc.status !== 'validado' ? 30 : 0
        },
        'iptu': {
            alertas: doc.status !== 'validado' ? ['IPTU não validado — verificar débitos'] : [],
            score: doc.status !== 'validado' ? 25 : 0
        },
        'certidao': {
            alertas: doc.status !== 'validado' ? ['Certidão não validada — verificar autenticidade'] : [],
            score: doc.status !== 'validado' ? 20 : 0
        }
    };

    if (regrasTipo[tipoDocumento]) {
        alertas.push(...regrasTipo[tipoDocumento].alertas);
        scoreRisco += regrasTipo[tipoDocumento].score;
    }

    if (scoreRisco >= 60) status = 'critico';
    else if (scoreRisco >= 30) status = 'irregular';
    else if (scoreRisco >= 10) status = 'pendente';

    let acaoRecomendada = 'Documento regular';
    if (status === 'critico') acaoRecomendada = 'Solicitar regularização urgente antes da transação';
    else if (status === 'irregular') acaoRecomendada = 'Recomendar correção documental antes da venda';
    else if (status === 'pendente') acaoRecomendada = 'Aguardar validação completa do documento';

    await supabase.from('agent_logs').insert({
        agent_name: 'themis',
        action: 'analisar_documento',
        decision: status,
        score_impact: 100 - scoreRisco,
        message: `Análise ${tipoDocumento}: ${status}. Alertas: ${alertas.join('; ')}`
    });

    return {
        docId,
        tipo: tipoDocumento,
        status,
        scoreRisco,
        alertas,
        acaoRecomendada,
        hashVerificacao: doc.hash_sha256
    };
}

let _resend: Resend | null = null;
const resend = new Proxy({}, {
    get(_: object, prop: string | symbol) {
        if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!);
        return Reflect.get(_resend, prop);
    }
}) as unknown as Resend;

export async function notificarPendenciaJuridica(
    email: string,
    nome: string,
    propriedade: string,
    alertas: string[]
): Promise<boolean> {
    try {
        await resend.emails.send({
            from: 'Anjoimob Jurídico <juridico@anjoimob.com.br>',
            to: email,
            subject: '⚠️ Pendência Jurídica Detectada — Anjoimob',
            html: `
                <div style="background:#1a1a2e; color:#fff; padding:24px; border-radius:12px; border:1px solid #D4AF37;">
                    <h2 style="color:#D4AF37;">⚖️ Themis IA — Alerta Jurídico</h2>
                    <p>Olá, <strong>${nome}</strong>.</p>
                    <p>O imóvel <strong>${propriedade}</strong> apresenta pendências documentais:</p>
                    <ul style="color:#f87171;">
                        ${alertas.map(a => `<li>${a}</li>`).join('')}
                    </ul>
                    <p style="margin-top:20px;">Acesse o <a href="https://anjoimob.com.br/dashboard/juridico" style="color:#D4AF37;">Dashboard Jurídico</a> para regularizar.</p>
                    <p style="color:#9ca3af; font-size:12px; margin-top:24px;">Este é um alerta automático do Agente Themis. Em caso de dúvidas, consulte seu advogado.</p>
                </div>
            `
        });
        return true;
    } catch {
        return false;
    }
}
