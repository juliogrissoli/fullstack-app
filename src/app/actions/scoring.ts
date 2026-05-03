'use server';

import { supabase } from '@/lib/supabase';
import { SecurityBroker } from '@/lib/security';

const security = SecurityBroker.getInstance();

export async function updateLeadScore(
  userId: string,
  searchIntent: 'ROI' | 'Zoneamento' | 'Gap_Precos' | 'general',
  engagementBonus: number = 0
): Promise<{ success: boolean; newScore?: number; error?: string }> {
  try {
    // Sanitize inputs
    const sanitizedUserId = security.sanitizeInput(userId);
    const sanitizedIntent = security.sanitizeInput(searchIntent);
    
    // Call database function
    const { data, error } = await supabase.rpc('update_lead_score', {
      p_user_id: sanitizedUserId,
      p_search_intent: sanitizedIntent,
      p_engagement_bonus: engagementBonus
    });

    if (error) {
      console.error('Error updating lead score:', error);
      return { success: false, error: error.message };
    }

    // Check if score reached Priority S threshold
    if (data && data > 80) {
      await triggerPrioritySAlert(sanitizedUserId, data);
    }

    return { success: true, newScore: data };
  } catch (error) {
    console.error('Unexpected error in updateLeadScore:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function recordLeadView(
  userId: string,
  assetId: string
): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    // Sanitize inputs
    const sanitizedUserId = security.sanitizeInput(userId);
    const sanitizedAssetId = security.sanitizeInput(assetId);

    // Record the view (hash will be generated automatically by trigger)
    const { data, error } = await supabase
      .from('lead_views')
      .insert({
        user_id: sanitizedUserId,
        asset_id: sanitizedAssetId
      })
      .select('nexo_causal_hash')
      .single();

    if (error) {
      console.error('Error recording lead view:', error);
      return { success: false, error: error.message };
    }

    return { success: true, hash: data.nexo_causal_hash };
  } catch (error) {
    console.error('Unexpected error in recordLeadView:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function getLeadScore(userId: string): Promise<{ success: boolean; score?: number; error?: string }> {
  try {
    const sanitizedUserId = security.sanitizeInput(userId);

    const { data, error } = await supabase
      .from('lead_behavior_scoring')
      .select('score')
      .eq('user_id', sanitizedUserId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error getting lead score:', error);
      return { success: false, error: error.message };
    }

    return { success: true, score: data?.score || 0 };
  } catch (error) {
    console.error('Unexpected error in getLeadScore:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function getUserEngagementHistory(userId: string): Promise<{ 
  success: boolean; 
  views?: any[]; 
  score?: number;
  error?: string 
}> {
  try {
    const sanitizedUserId = security.sanitizeInput(userId);

    // Get user's views with asset details
    const { data: views, error: viewsError } = await supabase
      .from('lead_views')
      .select(`
        nexo_causal_hash,
        viewed_at,
        land_opportunities (
          id,
          titulo,
          valor_total,
          roi_projetado
        )
      `)
      .eq('user_id', sanitizedUserId)
      .order('viewed_at', { ascending: false });

    // Get user's score
    const { data: scoreData, error: scoreError } = await supabase
      .from('lead_behavior_scoring')
      .select('score, search_intent, last_interaction')
      .eq('user_id', sanitizedUserId)
      .single();

    if (viewsError || scoreError) {
      console.error('Error getting engagement history:', viewsError || scoreError);
      return { success: false, error: 'Failed to fetch engagement data' };
    }

    return { 
      success: true, 
      views: views || [], 
      score: scoreData?.score || 0 
    };
  } catch (error) {
    console.error('Unexpected error in getUserEngagementHistory:', error);
    return { success: false, error: 'Internal server error' };
  }
}

async function triggerPrioritySAlert(userId: string, score: number): Promise<void> {
  try {
    // Log priority alert
    console.log(`🚨 PRIORITY S ALERT: User ${userId} reached score ${score}`);
    
    // Here you can implement webhook calls, notifications, etc.
    // For example:
    // await fetch(process.env.WEBHOOK_URL!, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     type: 'priority_s_alert',
    //     userId,
    //     score,
    //     timestamp: new Date().toISOString()
    //   })
    // });
    
    // You could also send an email via Resend, Slack notification, etc.
  } catch (error) {
    console.error('Error triggering Priority S alert:', error);
  }
}

export async function getTopPerformingAssets(limit: number = 10): Promise<{
  success: boolean;
  assets?: any[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('land_opportunities')
      .select(`
        id,
        titulo,
        valor_total,
        roi_projetado,
        status,
        lead_views(count)
      `)
      .eq('status', 'publicado')
      .order('roi_projetado', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting top assets:', error);
      return { success: false, error: error.message };
    }

    return { success: true, assets: data };
  } catch (error) {
    console.error('Unexpected error in getTopPerformingAssets:', error);
    return { success: false, error: 'Internal server error' };
  }
}
