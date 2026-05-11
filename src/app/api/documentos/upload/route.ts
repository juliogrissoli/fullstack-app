import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('documento') as File;
  const tipo = formData.get('tipo') as string; // 'matricula', 'iptu', 'rg', 'cpf'

  if (!file) return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 });

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documentos')
    .upload(`${user.id}/${Date.now()}-${file.name}`, file);

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = supabase.storage
    .from('documentos')
    .getPublicUrl(uploadData.path);

  const dadosExtraidos = {
    tipo_documento: tipo,
    url: urlData.publicUrl,
    data_extracao: new Date().toISOString(),
    status: 'pendente_validacao',
    texto_extraido: 'OCR pendente de processamento. Validar manualmente.',
  };

  const { data, error } = await supabase
    .from('doc_vault')
    .insert({
      user_id: user.id,
      tipo_documento: tipo,
      url_documento: urlData.publicUrl,
      dados_extraidos: dadosExtraidos,
      hash_sha256: '',
      status: 'pendente',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, documento: data });
}
