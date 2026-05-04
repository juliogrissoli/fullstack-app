import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: Request) {
  try {
    const { assetId, userId, reportType } = await request.json();

    // Validar dados
    if (!assetId || !userId || !reportType) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    // Obter informações do ativo
    const { data: asset, error: assetError } = await supabase
      .from('land_opportunities')
      .select('*')
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      return NextResponse.json(
        { error: 'Ativo não encontrado' },
        { status: 404 }
      );
    }

    // Definir preço baseado no tipo de relatório
    const reportPrices = {
      basic: 9700, // R$ 97,00 em centavos
      premium: 19700, // R$ 197,00 em centavos
      complete: 29700, // R$ 297,00 em centavos
    };

    const price = reportPrices[reportType as keyof typeof reportPrices] || reportPrices.basic;

    // Criar sessão de checkout Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `Relatório ROI - ${asset.titulo}`,
              description: `Relatório ${reportType} para análise de investimento em land banking`,
              images: [], // Adicionar URLs de imagens se disponível
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/assets/${assetId}?cancelled=true`,
      metadata: {
        asset_id: assetId,
        user_id: userId,
        report_type: reportType,
        asset_title: asset.titulo,
      },
      customer_email: undefined, // Será preenchido no frontend
    });

    // Registrar tentativa de checkout em audit logs
    await supabase.from('audit_logs').insert({
      user_id: userId,
      acao: 'CHECKOUT_INITIATED',
      tabela_afetada: 'land_opportunities',
      dados_novos: {
        session_id: session.id,
        asset_id: assetId,
        report_type: reportType,
        price: price,
        currency: 'BRL'
      },
      ip_address: 'api_stripe',
      user_agent: 'Security Broker v3.0'
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      price: price,
      currency: 'BRL'
    });

  } catch (error) {
    console.error('Erro no checkout Stripe:', error);
    return NextResponse.json(
      { error: 'Erro ao processar pagamento' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID não fornecido' },
        { status: 400 }
      );
    }

    // Recuperar sessão do Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se o pagamento foi concluído
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Pagamento não concluído' },
        { status: 400 }
      );
    }

    // Registrar pagamento bem-sucedido
    await supabase.from('audit_logs').insert({
      user_id: session.metadata?.user_id,
      acao: 'PAYMENT_SUCCESS',
      tabela_afetada: 'land_opportunities',
      dados_novos: {
        session_id: sessionId,
        asset_id: session.metadata?.asset_id,
        report_type: session.metadata?.report_type,
        amount: session.amount_total,
        currency: session.currency
      },
      ip_address: 'api_stripe',
      user_agent: 'Security Broker v3.0'
    });

    // Criar registro de venda
    await supabase.from('sales_commissions').insert({
      user_id: session.metadata?.user_id,
      asset_id: session.metadata?.asset_id,
      valor_comissao: session.amount_total * 0.05, // 5% de comissão
      status_comissao: 'pendente',
      data_venda: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        metadata: session.metadata
      }
    });

  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar pagamento' },
      { status: 500 }
    );
  }
}
