import { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';
import { EligibleUser, Campaign } from './types.ts';
import { TEST_MODE, baseUrl } from './constants.ts';

/**
 * Verifica se o usuário é elegível para receber a campanha.
 * Implementa uma lógica híbrida:
 * 1. Respeita estritamente o Opt-out (quem pediu para sair nunca recebe).
 * 2. Para campanhas de alto valor/serviço (ex: Rewards), permite envio sem opt-in explícito.
 * 3. Para outras campanhas, exige opt-in explícito.
 */
export async function isUserEligibleForCampaign(
  supabase: SupabaseClient,
  userId: string,
  campaignKey: string
): Promise<boolean> {
  const { data: preferences } = await supabase
    .from('newsletter_user_preferences')
    .select('email_opt_in, email_opt_out')
    .eq('user_id', userId)
    .maybeSingle();

  // 1. Respeito total ao Opt-out
  if (preferences?.email_opt_out === true) {
    return false;
  }

  // 2. Exceção para campanhas de Rewards/Alto Valor (Implicit Opt-in)
  const isHighValueCampaign = campaignKey.includes('rewards') || campaignKey.includes('i20_fee');
  if (isHighValueCampaign) {
    return true; // Envia se não houver opt-out
  }

  // 3. Padrão: Exige Opt-in explícito para marketing geral
  return preferences?.email_opt_in === true;
}

/**
 * Verifica se a campanha pode ser enviada para o usuário
 */
export async function canSendCampaignToUser(
  supabase: SupabaseClient,
  userId: string,
  campaignId: string,
  cooldownDays: number,
  testMode: boolean = false
): Promise<{ canSend: boolean; reason?: string }> {
  
  const { data: campaign, error: campaignError } = await supabase
    .from('newsletter_campaigns')
    .select('send_once')
    .eq('id', campaignId)
    .single();

  if (campaignError) {
    return { canSend: false, reason: `Error fetching campaign: ${campaignError.message}` };
  }

  const { data: lastEmail, error: emailError } = await supabase
    .from('newsletter_sent_emails')
    .select('sent_at, status')
    .eq('user_id', userId)
    .eq('campaign_id', campaignId)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (emailError) {
    return { canSend: false, reason: `Error checking sent emails: ${emailError.message}` };
  }

  if (!lastEmail?.sent_at) {
    return { canSend: true };
  }

  if (campaign?.send_once === true) {
    return { 
      canSend: false, 
      reason: `Campaign configured to send only once (send_once=true). Last sent: ${lastEmail.sent_at}` 
    };
  }

  if (cooldownDays === 0) {
    return { canSend: true };
  }

  if (!testMode) {
    const lastSentDate = new Date(lastEmail.sent_at);
    const daysSinceLastEmail = (Date.now() - lastSentDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastEmail < cooldownDays) {
      return { 
        canSend: false, 
        reason: `User is in cooldown. Last sent: ${lastEmail.sent_at}` 
      };
    }
  }

  return { canSend: true };
}

/**
 * Personaliza template de email com dados do usuário
 */
export function personalizeEmailTemplate(
  template: string,
  user: EligibleUser,
  _campaignKey: string
): string {
  let personalized = template;
  
  personalized = personalized.replace(/\{\{full_name\}\}/g, user.full_name || 'Estudante');
  personalized = personalized.replace(/\{\{email\}\}/g, user.email);
  personalized = personalized.replace(/\{\{referral_code\}\}/g, user.affiliate_code || '');
  
  const tokenData = `${user.user_id}:${Date.now()}`;
  const base64Token = btoa(tokenData).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(base64Token)}`;
  personalized = personalized.replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);
  
  return personalized;
}

/**
 * Determina o status de um estágio específico para um estudante
 */
export function getStepStatus(student: any, step: string): string {
  switch (step) {
    case 'selection_fee':
      return student.has_paid_selection_process_fee ? 'completed' : 'pending';
    
    case 'apply':
      return (student.total_applications || 0) > 0 ? 'completed' : 'pending';
    
    case 'review':
      if (student.has_approved_application) return 'completed';
      if (student.all_applications_pending) return 'pending';
      if (student.application_status === 'rejected') return 'rejected';
      if (student.application_status === 'under_review') return 'in_progress';
      return 'pending';
    
    case 'application_fee':
      if (student.is_scholarship_fee_paid) return 'skipped';
      return student.is_application_fee_paid ? 'completed' : 'pending';
    
    case 'scholarship_fee':
      if (!student.is_scholarship_fee_paid) return 'pending';
      if (!student.is_application_fee_paid) return 'pending';
      if (student.has_paid_i20_control_fee) return 'skipped';
      return 'completed';
    
    case 'i20_fee':
      if (student.has_paid_i20_control_fee) return 'completed';
      if (student.is_scholarship_fee_paid) return 'pending';
      return 'pending';
    
    case 'acceptance_letter':
      if (!student.has_paid_i20_control_fee) return 'pending';
      if (!student.has_sent_acceptance_letter) return 'pending';
      if (student.has_enrolled_application) return 'skipped';
      return 'completed';
    
    case 'enrollment':
      return student.application_status === 'enrolled' ? 'completed' : 'pending';
    
    default:
      return 'pending';
  }
}
