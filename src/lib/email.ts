// 📧 EMAIL TRANSACIONAL - GEO v8.1 IMPERIUM EDITION
// Security Broker SB v6.7.0 - Comunicação Automatizada
// Templates HTML e Envio via Resend

import { Resend } from 'resend';

let _resend: Resend | null = null;
const resend = new Proxy({}, {
  get(_: object, prop: string | symbol) {
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
    return Reflect.get(_resend, prop);
  },
}) as unknown as Resend;

export interface EmailData {
  para: string;
  nome?: string;
  dados?: any;
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

export async function enviarEmailTransacional(
  tipo: 'boas-vindas' | 'match-area' | 'visita-confirmada' | 'relatorio-roi' | 'alerta-prioridade-s',
  dados: EmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = gerarTemplate(tipo, dados);
    
    const { data, error } = await resend.emails.send({
      from: 'Security Broker <noreply@securitybroker.com.br>',
      to: dados.para,
      subject: template.subject,
      html: template.html,
    });

    if (error) {
      console.error('Erro ao enviar email:', error);
      return { success: false, error: error.message };
    }

    console.log(`📧 Email enviado: ${tipo} para ${dados.para}`);
    return { success: true };
    
  } catch (error) {
    console.error('Exceção ao enviar email:', error);
    return { success: false, error: 'Internal server error' };
  }
}

function gerarTemplate(tipo: string, dados: EmailData): EmailTemplate {
  const templates = {
    'boas-vindas': {
      subject: '🏆 Bem-vindo ao Security Broker - Sistema GEO',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bem-vindo ao Security Broker</title>
            <style>
              body { font-family: Arial, sans-serif; background: #0A192F; color: #fff; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: #1A1A1A; border-radius: 10px; overflow: hidden; }
              .header { background: linear-gradient(135deg, #D4AF37, #B8860B); padding: 30px; text-align: center; }
              .content { padding: 30px; }
              .gold { color: #D4AF37; }
              .footer { background: #0A192F; padding: 20px; text-align: center; font-size: 12px; }
              h1 { color: #D4AF37; margin: 0; }
              h2 { color: #D4AF37; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏆 Bem-vindo ao Security Broker</h1>
                <p>Sistema GEO v8.1 IMPERIUM EDITION</p>
              </div>
              <div class="content">
                <h2>Olá, ${dados.nome || 'Investidor'}!</h2>
                <p>Seu acesso foi criado com sucesso no sistema mais avançado de Real Estate OS.</p>
                <p>Estamos felizes em ter você em nossa plataforma de elite.</p>
                <div style="margin: 20px 0; padding: 20px; background: rgba(212, 175, 55, 0.1); border-radius: 5px;">
                  <h3 class="gold">🎯 Próximos Passos:</h3>
                  <ul style="text-align: left; line-height: 1.6;">
                    <li>✅ Complete seu perfil com documentos</li>
                    <li>✅ Explore os ativos disponíveis</li>
                    <li>✅ Utilize a calculadora ROI</li>
                    <li>✅ Acesse white papers exclusivos</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>© 2026 Security Broker v3.0 - Todos os direitos reservados</p>
                <p>Este é um email automático. Por favor, não responda.</p>
              </div>
            </div>
          </body>
        </html>
      `
    },
    
    'match-area': {
      subject: '🎯 Nova Área Corresponde ao Seu Perfil',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nova Área Correspondente</title>
            <style>
              body { font-family: Arial, sans-serif; background: #0A192F; color: #fff; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: #1A1A1A; border-radius: 10px; overflow: hidden; }
              .header { background: linear-gradient(135deg, #D4AF37, #B8860B); padding: 30px; text-align: center; }
              .content { padding: 30px; }
              .gold { color: #D4AF37; }
              .emerald { color: #004D40; }
              .footer { background: #0A192F; padding: 20px; text-align: center; font-size: 12px; }
              h1 { color: #D4AF37; margin: 0; }
              h2 { color: #D4AF37; margin-top: 30px; }
              .metric { background: #2A2A2A; padding: 15px; margin: 10px 0; border-left: 4px solid #D4AF37; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎯 Área Perfeita Encontrada!</h1>
                <p>Com base em seu perfil, identificamos uma oportunidade exclusiva</p>
              </div>
              <div class="content">
                <h2>Detalhes da Área:</h2>
                <div class="metric">
                  <strong>Localização:</strong> ${dados.dados?.localizacao || 'Confidencial'}
                </div>
                <div class="metric">
                  <strong>Área Total:</strong> ${dados.dados?.area_m2 || '0'} m²
                </div>
                <div class="metric">
                  <strong>ROI Projetado:</strong> <span class="gold">${dados.dados?.roi || '0'}%</span>
                </div>
                <div class="metric">
                  <strong>Zoneamento:</strong> ${dados.dados?.zoneamento || 'Não informado'}
                </div>
                <div class="metric">
                  <strong>Potencial:</strong> <span class="emerald">Excelente</span>
                </div>
              </div>
              <div class="footer">
                <p>© 2026 Security Broker v3.0 - Todos os direitos reservados</p>
              </div>
            </div>
          </body>
        </html>
      `
    },
    
    'visita-confirmada': {
      subject: '✅ Visita Agendada - Documentos Validados',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Visita Confirmada</title>
            <style>
              body { font-family: Arial, sans-serif; background: #0A192F; color: #fff; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: #1A1A1A; border-radius: 10px; overflow: hidden; }
              .header { background: linear-gradient(135deg, #D4AF37, #B8860B); padding: 30px; text-align: center; }
              .content { padding: 30px; }
              .gold { color: #D4AF37; }
              .emerald { color: #004D40; }
              .footer { background: #0A192F; padding: 20px; text-align: center; font-size: 12px; }
              h1 { color: #D4AF37; margin: 0; }
              h2 { color: #D4AF37; margin-top: 30px; }
              .info-box { background: rgba(212, 175, 55, 0.1); padding: 20px; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Visita Agendada Confirmada</h1>
                <p>Seus documentos foram validados e sua visita foi agendada</p>
              </div>
              <div class="content">
                <h2>Detalhes da Visita:</h2>
                <div class="info-box">
                  <p><strong>Data:</strong> ${dados.dados?.data_visita || 'A definir'}</p>
                  <p><strong>Horário:</strong> ${dados.dados?.horario || 'A definir'}</p>
                  <p><strong>Local:</strong> ${dados.dados?.endereco || 'Confidencial até validação'}</p>
                  <p><strong>Profissional:</strong> ${dados.dados?.profissional || 'A ser definido'}</p>
                </div>
                <div style="margin: 20px 0; padding: 20px; background: rgba(0, 77, 64, 0.1); border-radius: 5px;">
                  <h3 class="gold">📋 Documentos Necessários:</h3>
                  <ul style="text-align: left; line-height: 1.6;">
                    <li>📄 Documento com foto</li>
                    <li>🆔 Comprovante de residência</li>
                    <li>💳 Comprovante de renda</li>
                    <li>📋 Declaração de interesse</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>© 2026 Security Broker v3.0 - Todos os direitos reservados</p>
                <p>Este é um email automático. Para dúvidas, contate nosso suporte.</p>
              </div>
            </div>
          </body>
        </html>
      `
    },
    
    'relatorio-roi': {
      subject: '📊 Relatório ROI Detalhado',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Relatório ROI</title>
            <style>
              body { font-family: Arial, sans-serif; background: #0A192F; color: #fff; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: #1A1A1A; border-radius: 10px; overflow: hidden; }
              .header { background: linear-gradient(135deg, #D4AF37, #B8860B); padding: 30px; text-align: center; }
              .content { padding: 30px; }
              .gold { color: #D4AF37; }
              .emerald { color: #004D40; }
              .footer { background: #0A192F; padding: 20px; text-align: center; font-size: 12px; }
              h1 { color: #D4AF37; margin: 0; }
              h2 { color: #D4AF37; margin-top: 30px; }
              .metric { background: #2A2A2A; padding: 15px; margin: 10px 0; border-left: 4px solid #D4AF37; }
              .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              .table th, .table td { padding: 10px; border: 1px solid #333; text-align: left; }
              .table th { background: #333; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📊 Relatório ROI - Security Broker</h1>
                <p>Análise detalhada de oportunidade de investimento</p>
              </div>
              <div class="content">
                <h2>Resumo do Investimento:</h2>
                <table class="table">
                  <tr>
                    <th>Ativo:</th>
                    <td>${dados.dados?.titulo || 'Não informado'}</td>
                  </tr>
                  <tr>
                    <th>Valor Total:</th>
                    <td class="gold">R$ ${dados.dados?.valor_total?.toLocaleString('pt-BR') || '0'}</td>
                  </tr>
                  <tr>
                    <th>Área:</th>
                    <td>${dados.dados?.area_m2 || '0'} m²</td>
                  </tr>
                  <tr>
                    <th>ROI Projetado:</th>
                    <td class="gold">${dados.dados?.roi_projetado || '0'}%</td>
                  </tr>
                </table>
                
                <h2>Análise de Rentabilidade:</h2>
                <div class="metric">
                  <strong>Retorno 12 meses:</strong> <span class="emerald">R$ ${dados.dados?.retorno_12meses?.toLocaleString('pt-BR') || '0'}</span>
                </div>
                <div class="metric">
                  <strong>Retorno 24 meses:</strong> <span class="emerald">R$ ${dados.dados?.retorno_24meses?.toLocaleString('pt-BR') || '0'}</span>
                </div>
                <div class="metric">
                  <strong>ROI Anualizado:</strong> <span class="gold">${dados.dados?.roi_anualizado || '0'}%</span>
                </div>
              </div>
              <div class="footer">
                <p>© 2026 Security Broker v3.0 - Todos os direitos reservados</p>
                <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </body>
        </html>
      `
    },
    
    'alerta-prioridade-s': {
      subject: '🚨 ALERTA DE PRIORIDADE S - Lead Qualificado',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ALERTA DE PRIORIDADE S</title>
            <style>
              body { font-family: Arial, sans-serif; background: #0A192F; color: #fff; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: #1A1A1A; border-radius: 10px; overflow: hidden; }
              .header { background: linear-gradient(135deg, #DC2626, #991B1B); padding: 30px; text-align: center; }
              .content { padding: 30px; }
              .alert { background: rgba(220, 38, 38, 0.2); border: 2px solid #DC2626; border-radius: 5px; padding: 20px; margin: 20px 0; }
              .gold { color: #D4AF37; }
              .red { color: #DC2626; }
              .footer { background: #0A192F; padding: 20px; text-align: center; font-size: 12px; }
              h1 { color: #fff; margin: 0; }
              h2 { color: #D4AF37; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚨 ALERTA DE PRIORIDADE S</h1>
                <p>Lead alcançou score qualificado para atendimento imediato</p>
              </div>
              <div class="content">
                <div class="alert">
                  <h2 class="red">🔥 ATENÇÃO: LEAD DE ALTO VALOR</h2>
                  <p>Um lead em seu sistema alcançou o score necessário para atendimento prioritário.</p>
                  <div style="margin: 20px 0;">
                    <strong>Lead ID:</strong> ${dados.dados?.lead_id || 'Não informado'}
                  </div>
                  <div style="margin: 20px 0;">
                    <strong>Score Alcançado:</strong> <span class="gold">${dados.dados?.score || '0'}/100</span>
                  </div>
                  <div style="margin: 20px 0;">
                    <strong>Status:</strong> <span class="red">URGENTE</span>
                  </div>
                  <div style="margin: 20px 0;">
                    <strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}
                  </div>
                </div>
                
                <div style="margin: 30px 0; padding: 20px; background: rgba(212, 175, 55, 0.1); border-radius: 5px;">
                  <h3 class="gold">🎯 Ações Recomendadas:</h3>
                  <ul style="text-align: left; line-height: 1.6;">
                    <li>📞 Contatar o lead imediatamente</li>
                    <li>📧 Agendar visita técnica</li>
                    <li>📊 Apresentar proposta personalizada</li>
                    <li>🏆 Fechar negócio em até 48h</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>© 2026 Security Broker v3.0 - Todos os direitos reservados</p>
                <p>Este é um alerta automático. Ação imediata necessária.</p>
              </div>
            </div>
          </body>
        </html>
      `
    }
  };

  return (templates as Record<string, EmailTemplate>)[tipo] || templates['boas-vindas'];
}

export async function enviarEmailBoasVindas(usuario: { email: string; nome: string }) {
  return await enviarEmailTransacional('boas-vindas', {
    para: usuario.email,
    nome: usuario.nome,
    dados: { usuario }
  });
}

export async function enviarEmailMatchArea(usuario: { email: string }, dadosArea: any) {
  return await enviarEmailTransacional('match-area', {
    para: usuario.email,
    dados: dadosArea
  });
}

export async function enviarEmailVisitaConfirmada(usuario: { email: string }, dadosVisita: any) {
  return await enviarEmailTransacional('visita-confirmada', {
    para: usuario.email,
    dados: dadosVisita
  });
}

export async function enviarEmailRelatorioROI(usuario: { email: string }, relatorio: any) {
  return await enviarEmailTransacional('relatorio-roi', {
    para: usuario.email,
    dados: relatorio
  });
}

export async function enviarAlertaPrioridadeS(usuario: { email: string }, dadosLead: any) {
  return await enviarEmailTransacional('alerta-prioridade-s', {
    para: usuario.email,
    dados: dadosLead
  });
}


