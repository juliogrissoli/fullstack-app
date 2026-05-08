import { NextRequest, NextResponse } from 'next/server';
import { enviarEmailBoasVindas } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, nome } = await request.json();

    if (!email || !nome) {
      return NextResponse.json({ error: 'email e nome são obrigatórios' }, { status: 400 });
    }

    await enviarEmailBoasVindas({ email, nome });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Não bloquear cadastro por falha de email
    console.error('Erro ao enviar email de boas-vindas:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
