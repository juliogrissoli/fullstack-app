import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/resend';
import { supabase } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { leadId, leadEmail, leadScore, assetId, whitePaperType } = await request.json();

    // Validar se lead está qualificado
    if (leadScore < 50) {
      return NextResponse.json(
        { error: 'Lead não qualificado para white paper' },
        { status: 400 }
      );
    }

    // Obter informações do lead e ativo
    const { data: leadData, error: leadError } = await supabase
      .from('lead_behavior_scoring')
      .select('*, users(email)')
      .eq('id', leadId)
      .single();

    if (leadError || !leadData) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      );
    }

    const { data: assetData, error: assetError } = await supabase
      .from('land_opportunities')
      .select('*')
      .eq('id', assetId)
      .single();

    if (assetError || !assetData) {
      return NextResponse.json(
        { error: 'Ativo não encontrado' },
        { status: 404 }
      );
    }

    // Gerar conteúdo do white paper
    const whitePaperContent = generateWhitePaperContent(whitePaperType, assetData, leadData);

    // Enviar email com white paper
    const emailResult = await sendEmail({
      to: leadEmail || leadData.users?.email,
      subject: `📊 White Paper: ${getWhitePaperTitle(whitePaperType)}`,
      html: whitePaperContent,
      from: 'whitepapers@securitybroker.com'
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Falha ao enviar white paper' },
        { status: 500 }
      );
    }

    // Registrar envio em audit logs
    await supabase.from('audit_logs').insert({
      user_id: leadId,
      acao: 'WHITE_PAPER_SENT',
      tabela_afetada: 'lead_behavior_scoring',
      dados_novos: {
        white_paper_type: whitePaperType,
        asset_id: assetId,
        lead_score: leadScore,
        email_sent: true
      },
      ip_address: 'api_automation',
      user_agent: 'Security Broker v3.0'
    });

    return NextResponse.json({
      success: true,
      message: 'White paper enviado com sucesso',
      whitePaperType,
      assetId,
      leadScore
    });

  } catch (error) {
    console.error('Erro na automação Resend:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

function generateWhitePaperContent(type: string, asset: any, lead: any): string {
  const baseStyles = `
    <style>
      body { font-family: Arial, sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; border-radius: 10px; overflow: hidden; }
      .header { background: linear-gradient(135deg, #FFD700, #B8860B); padding: 30px; text-align: center; }
      .content { padding: 30px; }
      .metric { background: #2a2a2a; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #FFD700; }
      .footer { background: #0a0a0a; padding: 20px; text-align: center; font-size: 12px; }
      h1 { color: #FFD700; margin: 0; }
      h2 { color: #FFD700; margin-top: 30px; }
      .gold { color: #FFD700; }
      .emerald { color: #50C878; }
    </style>
  `;

  switch (type) {
    case 'roi_analysis':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1>📊 Análise ROI Detalhada</h1>
            <p>Security Broker v3.0 - Inteligência de Investimentos</p>
          </div>
          <div class="content">
            <h2>📍 ${asset.titulo}</h2>
            <div class="metric">
              <strong>Valor Total:</strong> R$ ${asset.valor_total?.toLocaleString('pt-BR')}
            </div>
            <div class="metric">
              <strong>Área:</strong> ${asset.area_m2} m²
            </div>
            <div class="metric">
              <strong>ROI Projetado:</strong> <span class="gold">${asset.roi_projetado}%</span>
            </div>
            <div class="metric">
              <strong>Zoneamento:</strong> ${asset.tag_zoneamento}
            </div>
            
            <h2>📈 Projeções Financeiras</h2>
            <div class="metric">
              <strong>Retorno 12 meses:</strong> <span class="emerald">R$ ${(asset.valor_total * (asset.roi_projetado || 15) / 100).toLocaleString('pt-BR')}</span>
            </div>
            <div class="metric">
              <strong>Retorno 24 meses:</strong> <span class="emerald">R$ ${(asset.valor_total * (asset.roi_projetado || 15) * 2 / 100).toLocaleString('pt-BR')}</span>
            </div>
            
            <h2>🎯 Análise de Mercado</h2>
            <p>Com base em seu score de <strong>${lead.score}</strong>, identificamos alta compatibilidade com este ativo. 
               A análise preditiva indica potencial de valorização acima da média do mercado.</p>
            
            <div class="metric">
              <strong>Seu Score:</strong> <span class="gold">${lead.score}/100</span>
            </div>
            <div class="metric">
              <strong>Intent Detectado:</strong> ${lead.search_intent}
            </div>
          </div>
          <div class="footer">
            <p>© 2026 Security Broker v3.0 - Todos os direitos reservados</p>
            <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      `;

    case 'zone_guide':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1>📋 Guia de Zoneamento</h1>
            <p>Security Broker v3.0 - Análise Regulatória</p>
          </div>
          <div class="content">
            <h2>📍 ${asset.titulo}</h2>
            <div class="metric">
              <strong>Zoneamento Atual:</strong> <span class="gold">${asset.tag_zoneamento}</span>
            </div>
            <div class="metric">
              <strong>Área Total:</strong> ${asset.area_m2} m²
            </div>
            
            <h2>🏗️ Potencial de Desenvolvimento</h2>
            <div class="metric">
              <strong>Uso Permitido:</strong> Residencial, Comercial, Misto
            </div>
            <div class="metric">
              <strong>Densidade Máxima:</strong> 1.5x área do terreno
            </div>
            <div class="metric">
              <strong>Recuos Obrigatórios:</strong> 5m frontal, 3m laterais
            </div>
            
            <h2>💰 Oportunidades de Valorização</h2>
            <p>O zoneamento atual permite múltiplos usos, aumentando o potencial de valorização 
               através de desenvolvimento otimizado do terreno.</p>
            
            <div class="metric">
              <strong>Potencial de Construção:</strong> <span class="emerald">${Math.round(asset.area_m2 * 1.5)} m²</span>
            </div>
            <div class="metric">
              <strong>Valorização Estimada:</strong> <span class="gold">+${(asset.roi_projetado || 15) * 2}%</span>
            </div>
          </div>
          <div class="footer">
            <p>© 2026 Security Broker v3.0 - Todos os direitos reservados</p>
            <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      `;

    default:
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1>📊 Relatório Personalizado</h1>
            <p>Security Broker v3.0 - Análise Completa</p>
          </div>
          <div class="content">
            <h2>📍 ${asset.titulo}</h2>
            <p>Relatório personalizado baseado em seu perfil de investidor e análise preditiva do mercado.</p>
            
            <div class="metric">
              <strong>Seu Score:</strong> <span class="gold">${lead.score}/100</span>
            </div>
            <div class="metric">
              <strong>Compatibilidade:</strong> <span class="emerald">Excelente</span>
            </div>
          </div>
          <div class="footer">
            <p>© 2026 Security Broker v3.0 - Todos os direitos reservados</p>
          </div>
        </div>
      `;
  }
}

function getWhitePaperTitle(type: string): string {
  switch (type) {
    case 'roi_analysis':
      return 'Análise ROI Detalhada';
    case 'zone_guide':
      return 'Guia de Zoneamento';
    default:
      return 'Relatório Personalizado';
  }
}
