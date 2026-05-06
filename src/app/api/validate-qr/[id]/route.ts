/**
 * 🏛️ SB IMPERIUM v14.0 - QR CODE VALIDATION ENDPOINT
 * 
 * Endpoint para validar QR Codes de contratos e mostrar página de verificação
 */

import { NextRequest, NextResponse } from 'next/server';
import { validarQRCode } from '@/lib/qr-code-generator';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: signatureId } = await context.params;
  try {
    
    console.log(`🔲 Validando QR Code - Signature ID: ${signatureId}`);
    
    // 1. Buscar dados do QR Code no banco
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: qrCodeRecord, error } = await supabase
      .from('qr_codes_contratos')
      .select('*')
      .eq('signature_id', signatureId)
      .single();
    
    if (error || !qrCodeRecord) {
      return NextResponse.json({
        erro: 'QR Code não encontrado',
        detalhes: 'O QR Code solicitado não existe em nossa base de dados'
      }, { status: 404 });
    }
    
    // 2. Validar QR Code
    const validacao = await validarQRCode(qrCodeRecord.qr_code_data);
    
    if (!validacao.valido) {
      // Retornar página de erro
      const errorHtml = gerarPaginaErro(validacao.erro || 'QR Code inválido', validacao.warnings || []);
      
      return new Response(errorHtml, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }
    
    // 3. Gerar página de validação
    const validationHtml = gerarPaginaValidacao(validacao.dados!);
    
    // 4. Registrar log de acesso
    await registrarLogAcessoQRCode({
      signature_id: signatureId,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'desconhecido',
      user_agent: request.headers.get('user-agent') || 'desconhecido',
      validacao: validacao
    });
    
    console.log(`✅ QR Code validado com sucesso - Signature: ${signatureId}`);
    
    return new Response(validationHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro na validação do QR Code:', error.message);
    
    const errorHtml = gerarPaginaErro('Erro interno na validação', [error.message]);
    
    return new Response(errorHtml, {
      status: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

/**
 * Gerar página de erro para QR Code inválido
 */
function gerarPaginaErro(erro: string, warnings: string[]): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QR Code Inválido - Security Broker SB</title>
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
            background: #dc2626;
            color: white;
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
            background: #fef2f2;
            border: 2px solid #dc2626;
        }
        
        .status-icon {
            font-size: 48px;
        }
        
        .status-text h3 {
            color: #dc2626;
            margin-bottom: 5px;
        }
        
        .status-text p {
            color: #666;
            font-size: 14px;
        }
        
        .error-details {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
        }
        
        .error-title {
            font-size: 16px;
            font-weight: 600;
            color: #dc2626;
            margin-bottom: 10px;
        }
        
        .error-message {
            font-size: 14px;
            color: #666;
            margin-bottom: 15px;
        }
        
        .warnings {
            margin-top: 15px;
        }
        
        .warning-title {
            font-size: 14px;
            font-weight: 600;
            color: #f59e0b;
            margin-bottom: 8px;
        }
        
        .warning-item {
            font-size: 13px;
            color: #666;
            margin-bottom: 5px;
            padding-left: 20px;
            position: relative;
        }
        
        .warning-item:before {
            content: "⚠️";
            position: absolute;
            left: 0;
        }
        
        .actions {
            display: flex;
            gap: 15px;
            margin-top: 25px;
        }
        
        .btn {
            flex: 1;
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            text-align: center;
            transition: all 0.3s ease;
        }
        
        .btn-primary {
            background: #D4AF37;
            color: #0a1628;
        }
        
        .btn-primary:hover {
            background: #b8941f;
            transform: translateY(-1px);
        }
        
        .btn-secondary {
            background: #6b7280;
            color: white;
        }
        
        .btn-secondary:hover {
            background: #4b5563;
            transform: translateY(-1px);
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
        
        @media (max-width: 600px) {
            .actions {
                flex-direction: column;
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
            <div class="subtitle">QR Code Inválido</div>
        </div>
        
        <div class="content">
            <div class="status">
                <div class="status-icon">❌</div>
                <div class="status-text">
                    <h3>QR Code Inválido</h3>
                    <p>Não foi possível validar este QR Code</p>
                </div>
            </div>
            
            <div class="error-details">
                <div class="error-title">Detalhes do Erro</div>
                <div class="error-message">${erro}</div>
                
                ${warnings.length > 0 ? `
                <div class="warnings">
                    <div class="warning-title">Informações Adicionais:</div>
                    ${warnings.map(warning => `<div class="warning-item">${warning}</div>`).join('')}
                </div>
                ` : ''}
            </div>
            
            <div class="actions">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}" class="btn btn-primary">
                    🏠 Ir para o Início
                </a>
                <button onclick="window.history.back()" class="btn btn-secondary">
                    ← Voltar
                </button>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-logo">SECURITY BROKER SB</div>
            <div class="footer-text">Sistema Soberano de Assinaturas Digitais</div>
            <div class="footer-text">Verificação falhou em ${new Date().toLocaleString('pt-BR')}</div>
        </div>
    </div>
</body>
</html>
  `.trim();
}

/**
 * Registrar log de acesso ao QR Code
 */
async function registrarLogAcessoQRCode(dados: {
  signature_id: string;
  ip: string;
  user_agent: string;
  validacao: any;
}): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    await supabase
      .from('logs_qr_code')
      .insert({
        id: `QRLOG-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        signature_id: dados.signature_id,
        ip_acesso: dados.ip,
        user_agent: dados.user_agent,
        validacao_resultado: dados.validacao.valido,
        validacao_erro: dados.validacao.erro,
        validacao_warnings: dados.validacao.warnings,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('❌ Erro ao registrar log QR Code:', error);
  }
}
