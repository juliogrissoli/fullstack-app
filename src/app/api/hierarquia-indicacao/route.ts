import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { distribuirRedeComScore, verificarElegibilidadeRede } from '@/lib/multinivel';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  // Busca a cadeia de indicação do usuário (até 5 níveis)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, indicado_por, sb_score, codigo_indicacao')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });

  // Subir a cadeia de indicação recursivamente (até 5 níveis)
  const cadeia: { nivel: number; user_id: string; full_name: string }[] = [];
  let currentId: string | null = profile.indicado_por;
  let nivel = 1;

  while (currentId && nivel <= 5) {
    const { data: parent } = await supabase
      .from('profiles')
      .select('id, full_name, indicado_por')
      .eq('id', currentId)
      .single();
    if (!parent) break;
    cadeia.push({ nivel, user_id: parent.id, full_name: parent.full_name ?? 'Sem nome' });
    currentId = parent.indicado_por;
    nivel++;
  }

  // Contar indicados diretos
  const { count: totalIndicados } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('indicado_por', user.id);

  return NextResponse.json({
    success: true,
    perfil: {
      user_id: user.id,
      full_name: profile.full_name,
      codigo_indicacao: profile.codigo_indicacao,
      sb_score: profile.sb_score,
    },
    cadeia_indicacao: cadeia,
    indicados_diretos: totalIndicados ?? 0,
    niveis_na_rede: cadeia.length,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  let body: { acao: string; valor_rede?: number };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  if (body.acao === 'distribuir_rede') {
    const valorRede = body.valor_rede ?? 0;
    if (valorRede <= 0) return NextResponse.json({ error: 'valor_rede inválido' }, { status: 400 });

    const elegibilidade = await verificarElegibilidadeRede(supabase, user.id, valorRede);
    const distribuicao = distribuirRedeComScore(valorRede, elegibilidade.nivelLiberado);

    // Buscar cadeia e registrar repasses
    let currentId: string | null = user.id;
    const repasses: { nivel: number; user_id: string; valor: number }[] = [];

    for (let i = 0; i < 5; i++) {
      const { data: p } = await supabase
        .from('profiles')
        .select('id, indicado_por')
        .eq('id', currentId as string)
        .single();
      if (!p?.indicado_por) break;
      currentId = p.indicado_por as string;
      const valor = distribuicao[i];
      if (valor > 0) {
        repasses.push({ nivel: i + 1, user_id: currentId, valor });
        await supabase.from('wallet_transactions').insert({
          user_id: currentId, tipo: 'repasse_rede',
          valor_bruto: valor, taxa: 0, valor_liquido: valor, status: 'pendente',
        });
      }
    }

    return NextResponse.json({
      success: true,
      nivel_liberado: elegibilidade.nivelLiberado,
      valor_revertido: elegibilidade.valorRevertido,
      repasses,
    });
  }

  if (body.acao === 'gerar_codigo') {
    const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { error } = await supabase
      .from('profiles')
      .update({ codigo_indicacao: codigo })
      .eq('id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, codigo_indicacao: codigo });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}
