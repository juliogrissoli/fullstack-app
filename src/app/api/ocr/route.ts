import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Extração de padrões brasileiros comuns em documentos imobiliários
function extrairDadosTexto(texto: string): Record<string, string | null> {
  const cpf = texto.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/)?.[0] ?? null;
  const cnpj = texto.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/)?.[0] ?? null;
  const cep = texto.match(/\d{5}-?\d{3}/)?.[0] ?? null;
  const matricula = texto.match(/(?:matrícula|matricula|nº)\s*[:\s]*([\d./-]+)/i)?.[1] ?? null;
  const areaMatch = texto.match(/(\d+[\.,]?\d*)\s*m[²2]/i);
  const area_m2 = areaMatch ? areaMatch[1].replace(',', '.') : null;
  const valorMatch = texto.match(/R\$\s*([\d.,]+)/i);
  const valor = valorMatch ? valorMatch[1].replace(/\./g, '').replace(',', '.') : null;

  return { cpf, cnpj, cep, matricula, area_m2, valor };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('arquivo') as File | null;
  const docVaultId = formData.get('doc_vault_id') as string | null;

  if (!file) return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 });

  const tipoArquivo = file.type;
  let textoExtraido = '';

  // Usar Google Vision se configurado, senão extração local de padrões
  const visionKey = process.env.GOOGLE_VISION_API_KEY;

  if (visionKey && tipoArquivo.startsWith('image/')) {
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${visionKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64 },
            features: [{ type: 'TEXT_DETECTION' }],
          }],
        }),
      }
    );

    if (visionRes.ok) {
      const visionData = await visionRes.json();
      textoExtraido = visionData.responses?.[0]?.fullTextAnnotation?.text ?? '';
    }
  } else {
    // Modo fallback: extração por padrão regex sem OCR externo
    textoExtraido = `Arquivo: ${file.name} — OCR manual necessário (${tipoArquivo})`;
  }

  const dadosExtraidos = extrairDadosTexto(textoExtraido);

  // Atualizar doc_vault se ID fornecido
  if (docVaultId) {
    await supabase
      .from('doc_vault')
      .update({
        dados_extraidos: { ...dadosExtraidos, texto_extraido: textoExtraido },
        status: textoExtraido ? 'processado' : 'pendente_manual',
      })
      .eq('id', docVaultId)
      .eq('user_id', user.id);
  }

  return NextResponse.json({
    success: true,
    texto_extraido: textoExtraido || null,
    dados_extraidos: dadosExtraidos,
    modo: visionKey ? 'google_vision' : 'fallback_regex',
  });
}
