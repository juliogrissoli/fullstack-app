import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { analisarDocumento } from '@/lib/agentes/themis';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const { property_id } = body;

    if (!property_id) {
        return NextResponse.json({ error: 'property_id é obrigatório' }, { status: 400 });
    }

    const { data: docs } = await supabase
        .from('doc_vault')
        .select('*')
        .eq('property_id', property_id)
        .order('created_at', { ascending: false });

    const analises: any[] = [];
    const tiposObrigatorios = ['matricula', 'iptu', 'certidao'];
    const tiposEncontrados = new Set(docs?.map(d => d.tipo_documento) || []);

    if (docs) {
        for (const doc of docs) {
            const analise = await analisarDocumento(doc.id, doc.tipo_documento);
            analises.push(analise);
        }
    }

    for (const tipo of tiposObrigatorios) {
        if (!tiposEncontrados.has(tipo)) {
            const analise = await analisarDocumento('', tipo);
            analises.push(analise);
        }
    }

    const scoreGeral = analises.length > 0
        ? Math.round(analises.reduce((acc, a) => acc + a.scoreRisco, 0) / analises.length)
        : 100;

    let semaforo: 'verde' | 'amarelo' | 'vermelho' = 'verde';
    if (scoreGeral >= 60) semaforo = 'vermelho';
    else if (scoreGeral >= 25) semaforo = 'amarelo';

    const { data: existingDecision } = await supabase
        .from('decision_engine')
        .select('id')
        .eq('property_id', property_id)
        .single();

    if (existingDecision) {
        await supabase.from('decision_engine')
            .update({ legal_score: scoreGeral, legal_semaforo: semaforo })
            .eq('id', existingDecision.id);
    }

    await supabase.from('agent_logs').insert({
        agent_name: 'themis',
        action: 'due_diligence_completa',
        decision: semaforo,
        score_impact: 100 - scoreGeral,
        message: `Due Diligence: ${semaforo}. Score: ${scoreGeral}/100. ${analises.length} documentos analisados.`
    });

    return NextResponse.json({
        success: true,
        property_id,
        scoreGeral,
        semaforo,
        documentos: analises,
        alertas: analises.filter(a => a.status === 'critico' || a.status === 'irregular'),
        mensagem: semaforo === 'verde'
            ? '✅ Imóvel apto para transação'
            : semaforo === 'amarelo'
                ? '⚠️ Existem pendências documentais. Recomenda-se correção antes da venda.'
                : '🔴 Imóvel com restrições. Venda não recomendada sem regularização.'
    });
}
