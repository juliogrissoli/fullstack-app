/**
 * 🏛️ SB IMPERIUM v14.0 - CAMADA DE HIPER-CONVENIÊNCIA CHINESA
 * 
 * WhatsApp Flow com Deep Link para assinatura (80% pre-fetch)
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// Configurações
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Interfaces
interface WhatsAppMessage {
  to: string;
  templateName: string;
  dealId: string;
  signerName: string;
  dealTitle: string;
  contractValue: number;
  preFetchData: PreFetchData;
}

interface PreFetchData {
  signerName: string;
  signerEmail: string;
  signerPhone: string;
  dealId: string;
  dealTitle: string;
  contractValue: number;
  brokerId: string;
  termsVersion: string;
  timestamp: string;
}

interface DeepLinkPayload {
  action: 'sign_contract';
  data: PreFetchData;
  hash: string;
  expires: string;
}

/**
 * Gerar Deep Link com 80% dos dados preenchidos
 */
export function generateDeepLink(preFetchData: PreFetchData): string {
  // Criar payload com dados preenchidos
  const payload: DeepLinkPayload = {
    action: 'sign_contract',
    data: preFetchData,
    hash: generateDeepLinkHash(preFetchData),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
  };
  
  // Codificar payload
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
  
  // Gerar Deep Link
  const deepLink = `sbimperium://sign/${encodedPayload}`;
  
  // Fallback para web
  const webUrl = `${process.env.NEXT_PUBLIC_APP_URL}/sign?data=${encodedPayload}`;
  
  return `${deepLink}?fallback=${encodeURIComponent(webUrl)}`;
}

/**
 * Gerar hash de segurança do Deep Link
 */
function generateDeepLinkHash(data: PreFetchData): string {
  const dadosParaHash = [
    data.dealId,
    data.signerEmail,
    data.timestamp,
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'sb-imperium'
  ].join('|');
  
  return createHash('sha256').update(dadosParaHash).digest('hex');
}

/**
 * Template de mensagem WhatsApp
 */
export function createWhatsAppTemplate(message: WhatsAppMessage): {
  templateName: string;
  components: any[];
  language: { code: string };
} {
  const deepLink = generateDeepLink(message.preFetchData);
  
  return {
    templateName: 'sb_signature_request',
    components: [
      {
        type: 'header',
        parameters: [
          {
            type: 'text',
            text: '🏛️ Security Broker SB'
          }
        ]
      },
      {
        type: 'body',
        parameters: [
          {
            type: 'text',
            text: message.signerName
          },
          {
            type: 'text',
            text: message.dealTitle
          },
          {
            type: 'text',
            text: `R$ ${message.contractValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          },
          {
            type: 'text',
            text: deepLink
          }
        ]
      },
      {
        type: 'button',
        subType: 'url',
        index: '0',
        parameters: [
          {
            type: 'text',
            text: deepLink
          }
        ]
      }
    ],
    language: { code: 'pt_BR' }
  };
}

/**
 * Enviar mensagem WhatsApp via Twilio
 */
export async function sendWhatsAppSignatureRequest(message: WhatsAppMessage): Promise<{
  sucesso: boolean;
  messageId?: string;
  deepLink?: string;
  erro?: string;
}> {
  try {
    console.log(`📱 Enviando WhatsApp para ${message.to}`);
    
    // Criar template
    const template = createWhatsAppTemplate(message);
    
    // Enviar via Twilio (simulação)
    const twilioResponse = await sendViaTwilio(message.to, template);
    
    if (twilioResponse.success) {
      // Registrar log de envio
      await registrarLogWhatsApp({
        para: message.to,
        dealId: message.dealId,
        template: template.templateName,
        deepLink: generateDeepLink(message.preFetchData),
        messageId: twilioResponse.messageId ?? '',
        status: 'enviado'
      });
      
      console.log(`✅ WhatsApp enviado - Message ID: ${twilioResponse.messageId}`);
      
      return {
        sucesso: true,
        messageId: twilioResponse.messageId,
        deepLink: generateDeepLink(message.preFetchData)
      };
    } else {
      throw new Error(twilioResponse.error);
    }
    
  } catch (error: any) {
    console.error('❌ Erro ao enviar WhatsApp:', error.message);
    
    return {
      sucesso: false,
      erro: error.message
    };
  }
}

/**
 * Simulação de envio via Twilio
 */
async function sendViaTwilio(to: string, template: any): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    // Em produção, usar o SDK do Twilio:
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // 
    // const message = await client.messages.create({
    //   from: 'whatsapp:+14155238886', // Número do WhatsApp Business
    //   to: `whatsapp:${to}`,
    //   contentSid: template.templateName,
    //   contentVariables: JSON.stringify(template.components)
    // });
    
    // Simulação para desenvolvimento
    const messageId = `WA_${Date.now()}_${Math.random().toString(36).slice(2, 11).toUpperCase()}`;
    
    console.log(`📱 Simulação Twilio - Para: ${to}, Template: ${template.templateName}`);
    
    return {
      success: true,
      messageId
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Processar Deep Link recebido
 */
export function processDeepLink(encodedData: string): {
  valido: boolean;
  data?: PreFetchData;
  erro?: string;
} {
  try {
    // Decodificar payload
    const decodedPayload = Buffer.from(encodedData, 'base64').toString('utf-8');
    const payload: DeepLinkPayload = JSON.parse(decodedPayload);
    
    // Validar expiração
    if (new Date(payload.expires) < new Date()) {
      return {
        valido: false,
        erro: 'Deep Link expirado'
      };
    }
    
    // Validar hash
    const hashCalculado = generateDeepLinkHash(payload.data);
    if (hashCalculado !== payload.hash) {
      return {
        valido: false,
        erro: 'Hash de segurança inválido'
      };
    }
    
    return {
      valido: true,
      data: payload.data
    };
    
  } catch (error: any) {
    return {
      valido: false,
      erro: `Erro ao processar Deep Link: ${error.message}`
    };
  }
}

/**
 * Criar página de assinatura com pre-fetch
 */
export async function criarPaginaAssinaturaPreFetch(encodedData: string): Promise<{
  sucesso: boolean;
  preFetchData?: PreFetchData;
  erro?: string;
}> {
  try {
    const resultado = processDeepLink(encodedData);
    
    if (!resultado.valido) {
      return {
        sucesso: false,
        erro: resultado.erro
      };
    }
    
    // Buscar dados adicionais do deal
    const { data: deal } = await supabase
      .from('deals')
      .select('*')
      .eq('id', resultado.data!.dealId)
      .single();
    
    if (!deal) {
      return {
        sucesso: false,
        erro: 'Deal não encontrado'
      };
    }
    
    // Enriquecer dados pre-fetch
    const enrichedData = {
      ...resultado.data!,
      dealData: deal,
      termosText: await getTermosText(),
      politicaPrivacidade: await getPoliticaPrivacidade()
    };
    
    return {
      sucesso: true,
      preFetchData: enrichedData as any
    };
    
  } catch (error: any) {
    return {
      sucesso: false,
      erro: error.message
    };
  }
}

/**
 * Obter texto dos termos
 */
async function getTermosText(): Promise<string> {
  return `
TERMOS DE USO SB SIGNATURE v1.0

1. ACEITE DOS TERMOS
Ao utilizar este serviço de assinatura digital, você concorda com estes termos.

2. VALIDADE JURÍDICA
As assinaturas digitais geradas possuem validade jurídica conforme Lei nº 14.063/2020.

3. PROTEÇÃO DE DADOS
Seus dados são protegidos pela Lei Geral de Proteção de Dados (LGPD).

4. ARMAZENAMENTO
As assinaturas são armazenadas com hash SHA-256 para garantia de integridade.

5. AUDITORIA
Todas as operações são registradas para fins de auditoria e conformidade.
  `.trim();
}

/**
 * Obter política de privacidade
 */
async function getPoliticaPrivacidade(): Promise<string> {
  return `
POLÍTICA DE PRIVACIDADE SB IMPERIUM

1. COLETA DE DADOS
Coletamos apenas dados essenciais para a assinatura digital.

2. USO DE DADOS
Seus dados são utilizados exclusivamente para fins de assinatura e auditoria.

3. COMPARTILHAMENTO
Não compartilhamos seus dados com terceiros sem sua autorização.

4. ARMAZENAMENTO SEGURO
Utilizamos criptografia e hash para proteger suas informações.

5. DIREITOS DO TITULAR
Você tem direito à acesso, correção e exclusão de seus dados.
  `.trim();
}

/**
 * Registrar log de WhatsApp
 */
async function registrarLogWhatsApp(dados: {
  para: string;
  dealId: string;
  template: string;
  deepLink: string;
  messageId: string;
  status: string;
}): Promise<void> {
  try {
    await supabase
      .from('logs_whatsapp')
      .insert({
        id: `WA-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`,
        para: dados.para,
        deal_id: dados.dealId,
        template: dados.template,
        deep_link: dados.deepLink,
        message_id: dados.messageId,
        status: dados.status,
        criado_em: new Date().toISOString()
      });
  } catch (error) {
    console.error('❌ Erro ao registrar log WhatsApp:', error);
  }
}

/**
 * Criar fluxo completo de assinatura via WhatsApp
 */
export async function criarFluxoAssinaturaWhatsApp(dados: {
  dealId: string;
  signerPhone: string;
  signerName: string;
  signerEmail: string;
  dealTitle: string;
  contractValue: number;
  brokerId: string;
}): Promise<{
  sucesso: boolean;
  deepLink?: string;
  messageId?: string;
  erro?: string;
}> {
  try {
    // Preparar dados pre-fetch
    const preFetchData: PreFetchData = {
      signerName: dados.signerName,
      signerEmail: dados.signerEmail,
      signerPhone: dados.signerPhone,
      dealId: dados.dealId,
      dealTitle: dados.dealTitle,
      contractValue: dados.contractValue,
      brokerId: dados.brokerId,
      termsVersion: 'v1.0-2024',
      timestamp: new Date().toISOString()
    };
    
    // Enviar WhatsApp
    const resultado = await sendWhatsAppSignatureRequest({
      to: dados.signerPhone,
      templateName: 'sb_signature_request',
      dealId: dados.dealId,
      signerName: dados.signerName,
      dealTitle: dados.dealTitle,
      contractValue: dados.contractValue,
      preFetchData
    });
    
    if (resultado.sucesso) {
      // Registrar fluxo iniciado
      await supabase
        .from('fluxos_assinatura')
        .insert({
          id: `FLUXO-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`,
          deal_id: dados.dealId,
          signer_phone: dados.signerPhone,
          signer_name: dados.signerName,
          message_id: resultado.messageId,
          deep_link: resultado.deepLink,
          status: 'enviado',
          criado_em: new Date().toISOString()
        });
    }
    
    return resultado;
    
  } catch (error: any) {
    console.error('❌ Erro ao criar fluxo WhatsApp:', error.message);
    
    return {
      sucesso: false,
      erro: error.message
    };
  }
}

export default {
  generateDeepLink,
  createWhatsAppTemplate,
  sendWhatsAppSignatureRequest,
  processDeepLink,
  criarPaginaAssinaturaPreFetch,
  criarFluxoAssinaturaWhatsApp
};
