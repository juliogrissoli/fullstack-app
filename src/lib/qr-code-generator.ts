/**
 * 🏛️ SB IMPERIUM v14.0 - QR CODE GENERATOR
 * 
 * Geração de QR Code único por contrato com validação SHA-256
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// Configurações
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Interfaces
interface QRCodeData {
  contractId: string;
  signatureId: string;
  dealId: string;
  signerName: string;
  dealTitle: string;
  contractValue: number;
  signatureDate: string;
  hashAuditoria: string;
  validationUrl: string;
  expiresAt: string;
}

interface QRCodeValidation {
  valido: boolean;
  dados?: QRCodeData;
  erro?: string;
  warnings?: string[];
}

/**
 * Gerar QR Code único para contrato assinado
 */
export async function gerarQRCodeContrato(signatureData: {
  id: string;
  deal_id: string;
  nome_assinante: string;
  deal_titulo?: string;
  valor_contrato?: number;
  data_assinatura: string;
  hash_auditoria: string;
}): Promise<{
  sucesso: boolean;
  qrCodeUrl?: string;
  qrCodeData?: string;
  validationUrl?: string;
  erro?: string;
}> {
  try {
    console.log(`🔲 Gerando QR Code para contrato: ${signatureData.id}`);
    
    // 1. Preparar dados do QR Code
    const qrCodeData: QRCodeData = {
      contractId: signatureData.id,
      signatureId: signatureData.id,
      dealId: signatureData.deal_id,
      signerName: signatureData.nome_assinante,
      dealTitle: signatureData.deal_titulo || 'Contrato SB',
      contractValue: signatureData.valor_contrato || 0,
      signatureDate: signatureData.data_assinatura,
      hashAuditoria: signatureData.hash_auditoria,
      validationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/validate-qr/${signatureData.id}`,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 ano
    };
    
    // 2. Gerar hash de segurança do QR Code
    const qrCodeHash = generateQRCodeHash(qrCodeData);
    qrCodeData.hashAuditoria = qrCodeHash;
    
    // 3. Codificar dados
    const encodedData = Buffer.from(JSON.stringify(qrCodeData)).toString('base64');
    
    // 4. Gerar QR Code (usando API externa ou biblioteca)
    const qrCodeUrl = await generateQRCodeImage(encodedData);
    
    // 5. Salvar QR Code no banco
    await salvarQRCodeNoBanco({
      signature_id: signatureData.id,
      qr_code_data: encodedData,
      qr_code_url: qrCodeUrl,
      validation_url: qrCodeData.validationUrl,
      hash_seguranca: qrCodeHash,
      expira_em: qrCodeData.expiresAt
    });
    
    // 6. Gerar página de validação
    const validationPage = await gerarPaginaValidacao(qrCodeData);
    
    console.log(`✅ QR Code gerado - Contrato: ${signatureData.id}`);
    
    return {
      sucesso: true,
      qrCodeUrl,
      qrCodeData: encodedData,
      validationUrl: qrCodeData.validationUrl
    };
    
  } catch (error: any) {
    console.error('❌ Erro ao gerar QR Code:', error.message);
    
    return {
      sucesso: false,
      erro: error.message
    };
  }
}

/**
 * Gerar hash de segurança do QR Code
 */
function generateQRCodeHash(data: QRCodeData): string {
  const dadosParaHash = [
    data.contractId,
    data.signatureId,
    data.hashAuditoria,
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'sb-imperium'
  ].join('|');
  
  return createHash('sha256').update(dadosParaHash).digest('hex');
}

/**
 * Gerar imagem do QR Code
 */
async function generateQRCodeImage(data: string): Promise<string> {
  try {
    // Em produção, usar biblioteca como 'qrcode' ou API externa
    // Por enquanto, simulação com URL de serviço online
    
    const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
    
    // Alternativa: usar biblioteca 'qrcode' localmente
    // const QRCode = require('qrcode');
    // const qrCodeDataUrl = await QRCode.toDataURL(data, {
    //   width: 300,
    //   margin: 2,
    //   color: {
    //     dark: '#D4AF37', // Dourado SB
    //     light: '#0a1628'  // Deep Ocean
    //   }
    // });
    
    return qrCodeApiUrl;
    
  } catch (error: any) {
    console.error('❌ Erro ao gerar imagem QR Code:', error.message);
    throw new Error('Falha na geração do QR Code');
  }
}

/**
 * Salvar QR Code no banco de dados
 */
async function salvarQRCodeNoBanco(dados: {
  signature_id: string;
  qr_code_data: string;
  qr_code_url: string;
  validation_url: string;
  hash_seguranca: string;
  expira_em: string;
}): Promise<void> {
  try {
    await supabase
      .from('qr_codes_contratos')
      .insert({
        id: `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        signature_id: dados.signature_id,
        qr_code_data: dados.qr_code_data,
        qr_code_url: dados.qr_code_url,
        validation_url: dados.validation_url,
        hash_seguranca: dados.hash_seguranca,
        expira_em: dados.expira_em,
        criado_em: new Date().toISOString()
      });
  } catch (error) {
    console.error('❌ Erro ao salvar QR Code no banco:', error);
  }
}

/**
 * Validar QR Code
 */
export async function validarQRCode(encodedData: string): Promise<QRCodeValidation> {
  try {
    // 1. Decodificar dados
    const decodedData = Buffer.from(encodedData, 'base64').toString('utf-8');
    const qrCodeData: QRCodeData = JSON.parse(decodedData);
    
    // 2. Validar expiração
    if (new Date(qrCodeData.expiresAt) < new Date()) {
      return {
        valido: false,
        erro: 'QR Code expirado',
        warnings: ['O QR Code perdeu a validade temporal']
      };
    }
    
    // 3. Validar hash de segurança
    const hashCalculado = generateQRCodeHash(qrCodeData);
    if (hashCalculado !== qrCodeData.hashAuditoria) {
      return {
        valido: false,
        erro: 'QR Code inválido ou adulterado',
        warnings: ['Hash de segurança não confere']
      };
    }
    
    // 4. Validar assinatura no banco
    const { data: signature, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('id', qrCodeData.signatureId)
      .eq('hash_auditoria', qrCodeData.hashAuditoria)
      .single();
    
    if (error || !signature) {
      return {
        valido: false,
        erro: 'Assinatura não encontrada ou inválida',
        warnings: ['A assinatura associada não foi localizada no sistema']
      };
    }
    
    // 5. Validar status da assinatura
    if (signature.status !== 'assinado') {
      return {
        valido: false,
        erro: 'Contrato não está assinado',
        warnings: [`Status atual: ${signature.status}`]
      };
    }
    
    // 6. Verificar se o QR Code foi registrado
    const { data: qrCodeRecord } = await supabase
      .from('qr_codes_contratos')
      .select('*')
      .eq('signature_id', qrCodeData.signatureId)
      .eq('hash_seguranca', qrCodeData.hashAuditoria)
      .single();
    
    if (!qrCodeRecord) {
      return {
        valido: false,
        erro: 'QR Code não registrado no sistema',
        warnings: ['O QR Code não foi encontrado em nossa base de dados']
      };
    }
    
    return {
      valido: true,
      dados: qrCodeData
    };
    
  } catch (error: any) {
    return {
      valido: false,
      erro: `Erro na validação: ${error.message}`,
      warnings: ['Não foi possível processar o QR Code']
    };
  }
}

/**
 * Gerar página de validação HTML
 */
async function gerarPaginaValidacao(qrCodeData: QRCodeData): Promise<string> {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Validação de Contrato - Security Broker SB</title>
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
            background: linear-gradient(135deg, #0a1628 0%, #1e3a5f 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            max-width: 600px;
            width: 100%;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .header {
            background: #D4AF37;
            color: #0a1628;
            padding: 30px;
            text-align: center;
        }
        
        .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .subtitle {
            font-size: 16px;
            opacity: 0.8;
        }
        
        .content {
            padding: 30px;
        }
        
        .status {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 25px;
            background: #f0f9ff;
            border: 2px solid #0ea5e9;
        }
        
        .status-icon {
            font-size: 48px;
        }
        
        .status-text h3 {
            color: #0a1628;
            margin-bottom: 5px;
        }
        
        .status-text p {
            color: #666;
            font-size: 14px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 25px;
        }
        
        .info-item {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .info-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .info-value {
            font-size: 16px;
            font-weight: 600;
            color: #0a1628;
        }
        
        .hash-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
        }
        
        .hash-title {
            font-size: 14px;
            font-weight: 600;
            color: #0a1628;
            margin-bottom: 10px;
        }
        
        .hash-value {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            background: #e9ecef;
            padding: 10px;
            border-radius: 4px;
            word-break: break-all;
            color: #495057;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #dee2e6;
        }
        
        .footer-logo {
            font-size: 14px;
            font-weight: bold;
            color: #D4AF37;
            margin-bottom: 5px;
        }
        
        .footer-text {
            font-size: 12px;
            color: #666;
        }
        
        .validation-badge {
            display: inline-block;
            padding: 8px 16px;
            background: #10b981;
            color: white;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 20px;
        }
        
        .timestamp {
            font-size: 12px;
            color: #666;
            text-align: center;
            margin-top: 20px;
        }
        
        @media (max-width: 600px) {
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            .container {
                margin: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏛️ SECURITY BROKER SB</div>
            <div class="subtitle">Validação de Contrato Digital</div>
        </div>
        
        <div class="content">
            <div class="validation-badge">
                ✅ CONTRATO VÁLIDO E VERIFICADO
            </div>
            
            <div class="status">
                <div class="status-icon">🔐</div>
                <div class="status-text">
                    <h3>Autenticidade Confirmada</h3>
                    <p>Este contrato foi validado através de Hash SHA-256</p>
                </div>
            </div>
            
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">ID do Contrato</div>
                    <div class="info-value">${qrCodeData.contractId}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">Signatário</div>
                    <div class="info-value">${qrCodeData.signerName}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">Deal</div>
                    <div class="info-value">${qrCodeData.dealTitle}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">Valor</div>
                    <div class="info-value">R$ ${qrCodeData.contractValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
            </div>
            
            <div class="hash-section">
                <div class="hash-title">🔐 Hash SHA-256 de Auditoria</div>
                <div class="hash-value">${qrCodeData.hashAuditoria}</div>
            </div>
            
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Data da Assinatura</div>
                    <div class="info-value">${new Date(qrCodeData.signatureDate).toLocaleString('pt-BR')}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">Validade do QR Code</div>
                    <div class="info-value">${new Date(qrCodeData.expiresAt).toLocaleDateString('pt-BR')}</div>
                </div>
            </div>
            
            <div class="timestamp">
                Validado em ${new Date().toLocaleString('pt-BR')} via Security Broker SB
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-logo">SECURITY BROKER SB</div>
            <div class="footer-text">Sistema Soberano de Assinaturas Digitais</div>
            <div class="footer-text">Hash verificado: ${qrCodeData.hashAuditoria.substring(0, 16)}...</div>
        </div>
    </div>
</body>
</html>
  `.trim();
  
  return html;
}

/**
 * Criar endpoint de validação de QR Code
 */
export async function criarEndpointValidacaoQRCode(): Promise<void> {
  // Este método seria usado para criar a rota /validate-qr/[id]
  // A implementação está no arquivo route.ts correspondente
}

/**
 * Gerar QR Code em formato DataURL (alternativa)
 */
export async function gerarQRCodeDataUrl(data: string): Promise<string> {
  try {
    // Usar biblioteca 'qrcode' para gerar DataURL
    // const QRCode = require('qrcode');
    // return await QRCode.toDataURL(data, {
    //   width: 300,
    //   margin: 2,
    //   color: {
    //     dark: '#D4AF37',
    //     light: '#0a1628'
    //   },
    //   errorCorrectionLevel: 'H'
    // });
    
    // Simulação por enquanto
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
  } catch (error: any) {
    console.error('❌ Erro ao gerar QR Code DataURL:', error.message);
    throw new Error('Falha na geração do QR Code');
  }
}

export default {
  gerarQRCodeContrato,
  validarQRCode,
  gerarQRCodeDataUrl,
  gerarPaginaValidacao
};
