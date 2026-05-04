'use server';

import { updateLeadScore, triggerPrioritySAlert } from './scoring';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SecurityBroker } from '@/lib/security';

const security = SecurityBroker.getInstance();

export async function processLeadScoring(formData: FormData) {
  try {
    // Extract and sanitize form data
    const userId = formData.get('userId') as string;
    const searchIntent = formData.get('searchIntent') as string;
    const engagementBonus = parseInt(formData.get('engagementBonus') as string) || 0;

    // Validate inputs
    if (!userId || !searchIntent) {
      return { success: false, error: 'Missing required fields' };
    }

    const sanitizedUserId = security.sanitizeInput(userId);
    const sanitizedIntent = security.sanitizeInput(searchIntent);

    // Update lead score
    const result = await updateLeadScore(
      sanitizedUserId,
      sanitizedIntent as 'ROI' | 'Zoneamento' | 'Gap_Precos' | 'general',
      engagementBonus
    );

    if (!result.success) {
      return result;
    }

    // Log the scoring action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: sanitizedUserId,
      acao: 'LEAD_SCORE_UPDATED',
      tabela_afetada: 'lead_behavior_scoring',
      dados_novos: {
        new_score: result.newScore,
        search_intent: sanitizedIntent,
        engagement_bonus: engagementBonus
      },
      ip_address: 'server_action',
      user_agent: 'Security Broker v3.0'
    });

    return result;

  } catch (error) {
    console.error('Error in processLeadScoring:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function processStripeWebhook(formData: FormData) {
  try {
    const stripeSignature = formData.get('stripeSignature') as string;
    const payload = formData.get('payload') as string;

    // Validate Stripe webhook
    if (!stripeSignature || !payload) {
      return { success: false, error: 'Invalid webhook data' };
    }

    // Parse webhook payload (simplified - in production use Stripe SDK)
    const webhookData = JSON.parse(payload);
    const eventType = webhookData.type;

    // Handle different webhook events
    switch (eventType) {
      case 'payment_intent.succeeded':
        await handleSuccessfulPayment(webhookData.data);
        break;
      case 'payment_intent.payment_failed':
        await handleFailedPayment(webhookData.data);
        break;
      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return { success: true };

  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    return { success: false, error: 'Webhook processing failed' };
  }
}

async function handleSuccessfulPayment(paymentData: any) {
  try {
    // Update sales commission
    await supabaseAdmin.from('sales_commissions').insert({
      user_id: paymentData.metadata?.user_id,
      asset_id: paymentData.metadata?.asset_id,
      valor_comissao: paymentData.amount * 0.05, // 5% commission
      status_comissao: 'pendente',
      data_venda: new Date().toISOString()
    });

    // Log successful payment
    await supabaseAdmin.from('audit_logs').insert({
      user_id: paymentData.metadata?.user_id,
      acao: 'PAYMENT_SUCCESS',
      tabela_afetada: 'sales_commissions',
      dados_novos: {
        payment_id: paymentData.id,
        amount: paymentData.amount,
        commission_calculated: paymentData.amount * 0.05
      },
      ip_address: 'stripe_webhook',
      user_agent: 'stripe_webhook'
    });

  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

async function handleFailedPayment(paymentData: any) {
  try {
    // Log failed payment
    await supabaseAdmin.from('audit_logs').insert({
      user_id: paymentData.metadata?.user_id,
      acao: 'PAYMENT_FAILED',
      tabela_afetada: 'payment_attempts',
      dados_novos: {
        payment_id: paymentData.id,
        amount: paymentData.amount,
        failure_reason: paymentData.last_payment_error?.message
      },
      ip_address: 'stripe_webhook',
      user_agent: 'stripe_webhook'
    });

  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}
