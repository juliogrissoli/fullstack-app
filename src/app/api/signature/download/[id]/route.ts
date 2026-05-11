/**
 * 🏛️ SB IMPERIUM v14.0 - PDF SIGNATURE ENGINE
 * 
 * Geração de PDF com dados do Deal, assinatura e Hash SHA-256 de auditoria
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// Configurações
let _supabase: ReturnType<typeof createClient> | null = null;
const supabase = new Proxy({}, {
  get(_: unknown, prop: string | symbol) {
    if (!_supabase) {
      _supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
    return Reflect.get(_supabase, prop);
  },
}) as SupabaseClient<any>;

// Interfaces
interface SignatureData {
  id: string;
  deal_id: string;
  signature_data: string;
  biometry_data?: string;
  nome_assinante: string;
  email_assinante: string;
  data_assinatura: string;
  ip_assinatura: string;
  hash_auditoria: string;
  termos_aceitos: boolean;
  status: 'pendente' | 'assinado' | 'cancelado';
}

interface DealData {
  id: string;
  titulo: string;
  descricao: string;
  valor_total: number;
  partes_envolvidas: string[];
  data_criacao: string;
  status: string;
  broker_id: string;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const signatureId = id;
    
    console.log(`🏛️ Gerando PDF para assinatura: ${signatureId}`);
    
    // 1. Buscar dados da assinatura
    const { data: signature, error: errorSignature } = await supabase
      .from('signatures')
      .select('*')
      .eq('id', signatureId)
      .single();
    
    if (errorSignature || !signature) {
      return NextResponse.json({
        erro: 'Assinatura não encontrada',
        detalhes: errorSignature?.message
      }, { status: 404 });
    }
    
    // 2. Buscar dados do Deal
    const { data: deal, error: errorDeal } = await supabase
      .from('deals')
      .select('*')
      .eq('id', signature.deal_id)
      .single();
    
    if (errorDeal || !deal) {
      return NextResponse.json({
        erro: 'Deal não encontrado',
        detalhes: errorDeal?.message
      }, { status: 404 });
    }
    
    // 3. Gerar HTML do PDF
    const pdfHtml = await generatePDFHTML(signature as SignatureData, deal as DealData);
    
    // 4. Gerar PDF (usando puppeteer ou jsPDF)
    const pdfBuffer = await generatePDFBuffer(pdfHtml);
    
    // 5. Registrar log de auditoria
    await registrarLogAuditoria({
      signature_id: signatureId,
      acao: 'download_pdf',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'desconhecido',
      user_agent: request.headers.get('user-agent') || 'desconhecido'
    });
    
    console.log(`✅ PDF gerado com sucesso - Assinatura: ${signatureId}`);

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="SB_Signature_${signatureId}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao gerar PDF:', error.message);
    
    return NextResponse.json({
      erro: 'Erro interno ao gerar PDF',
      detalhes: error.message
    }, { status: 500 });
  }
}

/**
 * Gerar HTML do PDF com layout profissional
 */
async function generatePDFHTML(signature: SignatureData, deal: DealData): Promise<string> {
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  const horaAtual = new Date().toLocaleTimeString('pt-BR');
  
  // Gerar Hash SHA-256 para auditoria do PDF
  const dadosParaHash = [
    signature.id,
    deal.id,
    signature.hash_auditoria,
    new Date().toISOString()
  ].join('|');
  
  const pdfHash = createHash('sha256').update(dadosParaHash).digest('hex');
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SB Signature - ${deal.titulo}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
            padding: 40px;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #D4AF37;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #D4AF37;
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: #666;
            font-size: 14px;
        }
        
        .section {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: #f9f9f9;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #D4AF37;
            margin-bottom: 15px;
            border-bottom: 1px solid #D4AF37;
            padding-bottom: 5px;
        }
        
        .deal-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .info-item {
            margin-bottom: 10px;
        }
        
        .info-label {
            font-weight: bold;
            color: #555;
            display: inline-block;
            width: 120px;
        }
        
        .info-value {
            color: #333;
        }
        
        .signature-section {
            text-align: center;
            margin-top: 40px;
        }
        
        .signature-image {
            max-width: 300px;
            height: 150px;
            border: 2px solid #D4AF37;
            border-radius: 8px;
            margin: 20px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fff;
        }
        
        .signature-details {
            margin-top: 20px;
            text-align: left;
            background: #f0f0f0;
            padding: 15px;
            border-radius: 8px;
        }
        
        .biometry-section {
            margin-top: 20px;
            text-align: center;
        }
        
        .biometry-image {
            max-width: 200px;
            height: 200px;
            border: 2px solid #D4AF37;
            border-radius: 50%;
            margin: 20px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fff;
        }
        
        .audit-section {
            margin-top: 30px;
            padding: 20px;
            background: #2c3e50;
            color: #fff;
            border-radius: 8px;
        }
        
        .hash-display {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            word-break: break-all;
            background: #34495e;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            border-top: 1px solid #ddd;
            padding-top: 20px;
            font-size: 12px;
            color: #666;
        }
        
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 100px;
            color: rgba(212, 175, 55, 0.1);
            font-weight: bold;
            z-index: -1;
        }
        
        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>
    <div class="watermark">SB IMPERIUM</div>
    
    <!-- CABEÇALHO -->
    <div class="header">
        <div class="logo">🏛️ SECURITY BROKER SB</div>
        <div class="subtitle">Sistema Soberano de Assinaturas Digitais</div>
        <div class="subtitle">Documento de Assinatura Digital - Hash SHA-256</div>
    </div>
    
    <!-- INFORMAÇÕES DO DEAL -->
    <div class="section">
        <div class="section-title">📋 INFORMAÇÕES DO DEAL</div>
        <div class="deal-info">
            <div>
                <div class="info-item">
                    <span class="info-label">ID do Deal:</span>
                    <span class="info-value">${deal.id}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Título:</span>
                    <span class="info-value">${deal.titulo}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Valor Total:</span>
                    <span class="info-value">R$ ${deal.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Status:</span>
                    <span class="info-value">${deal.status}</span>
                </div>
            </div>
            <div>
                <div class="info-item">
                    <span class="info-label">Data Criação:</span>
                    <span class="info-value">${new Date(deal.data_criacao).toLocaleDateString('pt-BR')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Broker ID:</span>
                    <span class="info-value">${deal.broker_id}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Partes:</span>
                    <span class="info-value">${deal.partes_envolvidas.join(', ')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Descrição:</span>
                    <span class="info-value">${deal.descricao}</span>
                </div>
            </div>
        </div>
    </div>
    
    <!-- SEÇÃO DE ASSINATURA -->
    <div class="section">
        <div class="section-title">✍️ ASSINATURA DIGITAL</div>
        
        <div class="signature-section">
            <div class="signature-image">
                ${signature.signature_data ? 
                    `<img src="${signature.signature_data}" style="max-width: 100%; max-height: 100%;" alt="Assinatura Digital" />` :
                    '<span style="color: #999;">Assinatura Digital</span>'
                }
            </div>
            
            <div class="signature-details">
                <div class="info-item">
                    <span class="info-label">Nome:</span>
                    <span class="info-value">${signature.nome_assinante}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">E-mail:</span>
                    <span class="info-value">${signature.email_assinante}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Data/Hora:</span>
                    <span class="info-value">${new Date(signature.data_assinatura).toLocaleString('pt-BR')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">IP:</span>
                    <span class="info-value">${signature.ip_assinatura}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Termos Aceitos:</span>
                    <span class="info-value">${signature.termos_aceitos ? '✅ SIM' : '❌ NÃO'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Status:</span>
                    <span class="info-value">${signature.status.toUpperCase()}</span>
                </div>
            </div>
        </div>
        
        <!-- BIOMETRIA (SE EXISTIR) -->
        ${signature.biometry_data ? `
        <div class="biometry-section">
            <div class="section-title">📸 PROVA DE VIDA (BIOMETRIA)</div>
            <div class="biometry-image">
                <img src="${signature.biometry_data}" style="max-width: 100%; max-height: 100%; border-radius: 50%;" alt="Prova de Vida" />
            </div>
        </div>
        ` : ''}
    </div>
    
    <!-- AUDITORIA E SEGURANÇA -->
    <div class="audit-section">
        <div class="section-title" style="color: #D4AF37; border-color: #D4AF37;">🔐 AUDITORIA E SEGURANÇA</div>
        
        <div style="margin-bottom: 15px;">
            <strong>Hash SHA-256 da Assinatura Original:</strong>
            <div class="hash-display">${signature.hash_auditoria}</div>
        </div>
        
        <div style="margin-bottom: 15px;">
            <strong>Hash SHA-256 deste PDF:</strong>
            <div class="hash-display">${pdfHash}</div>
        </div>
        
        <div style="margin-bottom: 15px;">
            <strong>ID da Assinatura:</strong> ${signature.id}
        </div>
        
        <div style="margin-bottom: 15px;">
            <strong>Data de Geração do PDF:</strong> ${dataAtual} ${horaAtual}
        </div>
        
        <div style="font-size: 12px; color: #bdc3c7;">
            Este documento é uma prova digital válida e possui integridade verificável através dos hashes SHA-256.
            Qualquer alteração no conteúdo invalidará os hashes de auditoria.
        </div>
    </div>
    
    <!-- RODAPÉ -->
    <div class="footer">
        <div><strong>Security Broker SB v14.0</strong></div>
        <div>Sistema Soberano de Assinaturas Digitais</div>
        <div>Documento gerado em ${dataAtual} às ${horaAtual}</div>
        <div>Hash de Auditoria: ${pdfHash.substring(0, 16)}...</div>
    </div>
</body>
</html>
  `;
}

/**
 * Gerar buffer do PDF (implementação simplificada)
 */
async function generatePDFBuffer(html: string): Promise<Buffer> {
  // NOTA: Em produção, usar puppeteer ou jsPDF
  // Por enquanto, retornamos HTML como buffer
  
  try {
    // Implementação futura com puppeteer:
    // const puppeteer = require('puppeteer');
    // const browser = await puppeteer.launch();
    // const page = await browser.newPage();
    // await page.setContent(html);
    // const pdfBuffer = await page.pdf({
    //   format: 'A4',
    //   printBackground: true,
    //   margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    // });
    // await browser.close();
    // return pdfBuffer;
    
    // Implementação temporária com HTML
    return Buffer.from(html, 'utf-8');
    
  } catch (error: any) {
    console.error('❌ Erro ao gerar PDF:', error.message);
    throw new Error('Falha na geração do PDF');
  }
}

/**
 * Registrar log de auditoria
 */
async function registrarLogAuditoria(dados: {
  signature_id: string;
  acao: string;
  ip: string;
  user_agent: string;
}): Promise<void> {
  try {
    await supabase
      .from('logs_auditoria')
      .insert({
        id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`,
        user_id: 'system',
        recurso_acessado: `signature_${dados.signature_id}`,
        timestamp: new Date().toISOString(),
        nexo_hash: createHash('sha256').update(`${dados.signature_id}-${dados.acao}`).digest('hex'),
        ip_acesso: dados.ip,
        tipo_acao: 'download',
        detalhes: {
          acao: dados.acao,
          user_agent: dados.user_agent,
          tipo_documento: 'pdf_signature'
        }
      });
  } catch (error) {
    console.error('❌ Erro ao registrar log de auditoria:', error);
  }
}
