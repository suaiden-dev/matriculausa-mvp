import { SupabaseClient } from '@supabase/supabase-js';
import { EligibleUser } from './types.ts';
import { TEST_MODE } from './constants.ts';
import { isUserEligibleForCampaign, canSendCampaignToUser, getStepStatus } from './utils.ts';

/**
 * Busca usuários elegíveis para campanhas do tipo "registered_no_payment"
 */
export async function getEligibleUsersForRegisteredNoPayment(
  supabase: SupabaseClient,
  campaignId: string,
  cooldownDays: number,
  daysSinceRegistration: number = 2,
  limit: number = 50,
  ignoreRateLimit: boolean = false
): Promise<EligibleUser[]> {
  const { data: eligibleUsers, error: queryError } = await supabase
    .from('user_profiles')
    .select('user_id, email, full_name, id, role, has_paid_selection_process_fee')
    .eq('role', 'student')
    .eq('has_paid_selection_process_fee', false)
    .not('email', 'is', null)
    .limit(limit * 3);

  if (queryError || !eligibleUsers) return [];

  const { data: authUsers } = await supabase.auth.admin.listUsers();
  
  const usersWithCreationDate = eligibleUsers
    .map((profile: any) => {
      const authUser = authUsers?.users.find((u: any) => u.id === profile.user_id);
      if (!authUser) return null;

      const createdAt = new Date(authUser.created_at);
      const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (!TEST_MODE && daysSinceRegistration > 0 && daysSinceCreation < daysSinceRegistration) {
        return null;
      }

      return {
        user_id: profile.user_id,
        email: profile.email || '',
        full_name: profile.full_name || 'Estudante',
        user_profile_id: profile.id
      };
    })
    .filter((u: any): u is EligibleUser => u !== null);

  const finalEligibleUsers: EligibleUser[] = [];
  for (const user of usersWithCreationDate) {
    if (!(await isUserEligibleForCampaign(supabase, user.user_id, 'registered_no_payment'))) continue;

    const { canSend } = await canSendCampaignToUser(supabase, user.user_id, campaignId, cooldownDays, TEST_MODE || ignoreRateLimit);
    if (!canSend) continue;

    finalEligibleUsers.push(user);
  }

  return attachAffiliateCodes(supabase, finalEligibleUsers);
}

/**
 * Busca usuários elegíveis para campanhas do tipo "paid_no_application"
 */
export async function getEligibleUsersForPaidNoApplication(
  supabase: SupabaseClient,
  campaignId: string,
  cooldownDays: number,
  daysSincePayment: number = 3,
  limit: number = 50,
  ignoreRateLimit: boolean = false
): Promise<EligibleUser[]> {
  const { data: eligibleUsers, error: queryError } = await supabase
    .from('user_profiles')
    .select('user_id, email, full_name, id, role, has_paid_selection_process_fee')
    .eq('role', 'student')
    .eq('has_paid_selection_process_fee', true)
    .not('email', 'is', null)
    .limit(limit * 2);

  if (queryError || !eligibleUsers) return [];

  const usersWithoutApplication: EligibleUser[] = [];
  for (const profile of eligibleUsers) {
    const { data: applications } = await supabase
      .from('scholarship_applications')
      .select('id')
      .eq('student_id', profile.id)
      .limit(1);

    if (applications && applications.length > 0) continue;

    if (!TEST_MODE && daysSincePayment > 0) {
      const { data: payment } = await supabase
        .from('individual_fee_payments')
        .select('payment_date')
        .eq('user_id', profile.user_id)
        .eq('fee_type', 'selection_process')
        .order('payment_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (payment?.payment_date) {
        const paymentDate = new Date(payment.payment_date);
        const daysSincePaymentDate = (Date.now() - paymentDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSincePaymentDate < daysSincePayment) continue;
      }
    }

    if (!(await isUserEligibleForCampaign(supabase, profile.user_id, 'paid_no_application'))) continue;

    const { canSend } = await canSendCampaignToUser(supabase, profile.user_id, campaignId, cooldownDays, TEST_MODE || ignoreRateLimit);
    if (!canSend) continue;

    usersWithoutApplication.push({
      user_id: profile.user_id,
      email: profile.email || '',
      full_name: profile.full_name || 'Estudante',
      user_profile_id: profile.id
    });

    if (usersWithoutApplication.length >= limit) break;
  }

  return attachAffiliateCodes(supabase, usersWithoutApplication);
}

/**
 * Busca usuários elegíveis para campanhas baseadas em estágios do application flow
 */
export async function getEligibleUsersForApplicationFlowStage(
  supabase: SupabaseClient,
  campaignId: string,
  cooldownDays: number,
  stage: string,
  stageStatus?: string,
  limit: number = 50,
  ignoreRateLimit: boolean = false
): Promise<EligibleUser[]> {
  const { data: students, error: queryError } = await supabase
    .from('user_profiles')
    .select('user_id, email, full_name, id, role, has_paid_selection_process_fee, has_paid_i20_control_fee')
    .eq('role', 'student')
    .not('email', 'is', null)
    .limit(limit * 3);

  if (queryError || !students) return [];

  const studentIds = students.map((s: any) => s.id);
  const userIds = students.map((s: any) => s.user_id);
  
  const { data: applications } = await supabase
    .from('scholarship_applications')
    .select('student_id, status, is_application_fee_paid, is_scholarship_fee_paid, acceptance_letter_status, acceptance_letter_sent_at, acceptance_letter_url, transfer_form_status, student_process_type')
    .in('student_id', studentIds);

  const { data: payments } = await supabase
    .from('individual_fee_payments')
    .select('user_id, fee_type, status, payment_date')
    .in('user_id', userIds)
    .eq('status', 'succeeded');

  const eligibleStudents = students.map((profile: any) => {
    const studentApps = applications?.filter((app: any) => app.student_id === profile.id) || [];
    const studentPayments = payments?.filter((p: any) => p.user_id === profile.user_id) || [];
    
    const hasPaidApplicationFee = studentApps.some((app: any) => app.is_application_fee_paid) || studentPayments.some((p: any) => p.fee_type === 'application_fee');
    const hasPaidScholarshipFee = studentApps.some((app: any) => app.is_scholarship_fee_paid) || studentPayments.some((p: any) => p.fee_type === 'scholarship_fee');
    
    const latestApp = studentApps[0];
    
    return {
      ...profile,
      total_applications: studentApps.length,
      application_status: latestApp?.status || null,
      is_application_fee_paid: hasPaidApplicationFee,
      is_scholarship_fee_paid: hasPaidScholarshipFee,
      has_paid_i20_control_fee: profile.has_paid_i20_control_fee || false,
      has_approved_application: studentApps.some((app: any) => ['approved', 'enrolled'].includes(app.status)),
      has_enrolled_application: studentApps.some((app: any) => app.status === 'enrolled'),
      all_applications_pending: studentApps.length > 0 && studentApps.every((app: any) => app.status === 'pending'),
      all_applications_have_pending_acceptance: studentApps.length > 0 && studentApps.every((app: any) => app.acceptance_letter_status === 'pending'),
      all_applications_have_null_transfer_form: studentApps.length > 0 && studentApps.every((app: any) => !app.transfer_form_status),
      has_sent_acceptance_letter: studentApps.some((app: any) => app.acceptance_letter_status === 'sent' && app.acceptance_letter_sent_at && app.acceptance_letter_url)
    };
  }).filter((student: any) => {
    const status = getStepStatus(student, stage);
    if (stageStatus) {
      return status === stageStatus;
    }
    
    // Se não houver status definido na campanha, o padrão é ser estrito: apenas quem CONCLUIU o estágio
    return status === 'completed';
  });

  const finalEligibleUsers: EligibleUser[] = [];
  for (const student of eligibleStudents.slice(0, limit)) {
    // Aqui usamos o stage como parte da key para identificar que é uma campanha de alto valor se for i20_fee
    if (!(await isUserEligibleForCampaign(supabase, student.user_id, `app_flow_stage_${stage}`))) continue;

    const { canSend } = await canSendCampaignToUser(supabase, student.user_id, campaignId, cooldownDays, TEST_MODE || ignoreRateLimit);
    if (!canSend) continue;

    finalEligibleUsers.push({
      user_id: student.user_id,
      email: student.email || '',
      full_name: student.full_name || 'Estudante',
      user_profile_id: student.id
    });
  }

  return attachAffiliateCodes(supabase, finalEligibleUsers);
}

/**
 * Busca todos os usuários elegíveis para campanhas do tipo "all_users"
 */
export async function getEligibleUsersForAllUsers(
  supabase: SupabaseClient,
  campaignId: string,
  cooldownDays: number,
  limit: number = 50,
  ignoreRateLimit: boolean = false
): Promise<EligibleUser[]> {
  const { data: allUsers, error: queryError } = await supabase
    .from('user_profiles')
    .select('user_id, email, full_name, id, role')
    .eq('role', 'student')
    .not('email', 'is', null)
    .limit(limit * 3);

  if (queryError || !allUsers) return [];

  const finalEligibleUsers: EligibleUser[] = [];
  for (const user of allUsers) {
    if (!(await isUserEligibleForCampaign(supabase, user.user_id, 'all_users')) || !(await canSendCampaignToUser(supabase, user.user_id, campaignId, cooldownDays, TEST_MODE || ignoreRateLimit)).canSend) continue;

    finalEligibleUsers.push({
      user_id: user.user_id,
      email: user.email || '',
      full_name: user.full_name || 'Estudante',
      user_profile_id: user.id
    });

    if (finalEligibleUsers.length >= limit) break;
  }

  return attachAffiliateCodes(supabase, finalEligibleUsers);
}

/**
 * Busca e anexa códigos de afiliado aos usuários
 */
async function attachAffiliateCodes(
  supabase: SupabaseClient,
  users: EligibleUser[]
): Promise<EligibleUser[]> {
  if (users.length === 0) return users;

  const userIds = users.map(u => u.user_id);
  const { data: codes } = await supabase
    .from('affiliate_codes')
    .select('user_id, code')
    .in('user_id', userIds);

  return users.map(user => ({
    ...user,
    affiliate_code: codes?.find((c: any) => c.user_id === user.user_id)?.code
  }));
}

