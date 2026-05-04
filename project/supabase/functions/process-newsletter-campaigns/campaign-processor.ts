import { SupabaseClient } from '@supabase/supabase-js';
import { EligibleUser, Campaign } from './types.ts';
import { TEST_MODE, TEST_EMAIL } from './constants.ts';
import { personalizeEmailTemplate, isUserEligibleForCampaign, canSendCampaignToUser } from './utils.ts';
import { sendEmailViaN8n } from './email-service.ts';
import {
  getEligibleUsersForRegisteredNoPayment,
  getEligibleUsersForPaidNoApplication,
  getEligibleUsersForApplicationFlowStage,
  getEligibleUsersForAllUsers
} from './eligible-users-service.ts';

/**
 * Processa uma campanha específica
 */
export async function processCampaign(
  supabase: SupabaseClient,
  campaign: Campaign,
  ignoreRateLimit: boolean = false
): Promise<{ sent: number; failed: number }> {
  console.log(`[Newsletter] Processando campanha: ${campaign.name} (${campaign.campaign_key})`);

  let eligibleUsers: EligibleUser[] = [];

  const triggerType = campaign.trigger_conditions?.type || 
    (campaign.campaign_key.startsWith('registered_no_payment') ? 'registered_no_payment' : 
     campaign.campaign_key.startsWith('paid_no_application') ? 'paid_no_application' : null);
  
  let daysSinceTrigger: number | undefined = campaign.trigger_conditions?.days;
  if (daysSinceTrigger === undefined || daysSinceTrigger === null) {
    const daysMatch = campaign.campaign_key.match(/(\d+)d$/);
    daysSinceTrigger = daysMatch ? parseInt(daysMatch[1]) : (triggerType === 'registered_no_payment' ? 2 : 3);
  }

  if (triggerType === 'registered_no_payment') {
    eligibleUsers = await getEligibleUsersForRegisteredNoPayment(supabase, campaign.id, campaign.cooldown_days, daysSinceTrigger, 50, ignoreRateLimit);
  } else if (triggerType === 'paid_no_application') {
    eligibleUsers = await getEligibleUsersForPaidNoApplication(supabase, campaign.id, campaign.cooldown_days, daysSinceTrigger, 50, ignoreRateLimit);
  } else if (triggerType === 'application_flow_stage') {
    const { stage, stage_status } = campaign.trigger_conditions || {};
    if (stage) {
      eligibleUsers = await getEligibleUsersForApplicationFlowStage(supabase, campaign.id, campaign.cooldown_days, stage, stage_status, 50, ignoreRateLimit);
    }
  } else if (triggerType === 'all_users') {
    eligibleUsers = await getEligibleUsersForAllUsers(supabase, campaign.id, campaign.cooldown_days, 50, ignoreRateLimit);
  }

  // Se estiver em modo de teste, filtrar apenas o email especificado
  if (TEST_MODE) {
    eligibleUsers = eligibleUsers.filter(u => u.email === TEST_EMAIL);
    console.log(`[Newsletter] 🧪 MODO DE TESTE ATIVO: Enviando APENAS para ${TEST_EMAIL}. Usuários elegíveis restantes: ${eligibleUsers.length}`);
  }

  let sent = 0;
  let failed = 0;

  for (const user of eligibleUsers) {
    try {
      if (!(await isUserEligibleForCampaign(supabase, user.user_id, campaign.campaign_key))) {
        failed++;
        continue;
      }

      const { canSend, reason } = await canSendCampaignToUser(supabase, user.user_id, campaign.id, campaign.cooldown_days, TEST_MODE);
      if (!canSend) {
        console.log(`[Newsletter] ⛔ BLOQUEADO PARA ${user.email}: ${reason}`);
        failed++;
        continue;
      }

      const subject = personalizeEmailTemplate(campaign.email_subject_template, user, campaign.campaign_key);
      const htmlBody = personalizeEmailTemplate(campaign.email_body_template, user, campaign.campaign_key);

      const { data: emailRecord, error: insertError } = await supabase
        .from('newsletter_sent_emails')
        .insert({
          user_id: user.user_id,
          campaign_id: campaign.id,
          email_address: user.email,
          subject: subject,
          status: 'pending',
          metadata: { full_name: user.full_name, campaign_key: campaign.campaign_key }
        })
        .select().single();

      if (insertError || !emailRecord) {
        failed++;
        continue;
      }

      const sentSuccessfully = await sendEmailViaN8n(user, campaign, subject, htmlBody);

      await supabase.from('newsletter_sent_emails').update({
        status: sentSuccessfully ? 'sent' : 'failed',
        sent_at: new Date().toISOString()
      }).eq('id', emailRecord.id);

      await supabase.from('newsletter_user_preferences').upsert({
        user_id: user.user_id,
        last_email_sent_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

      sentSuccessfully ? sent++ : failed++;
    } catch (error: any) {
      console.error(`[Newsletter] Erro ao processar usuário ${user.email}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}
