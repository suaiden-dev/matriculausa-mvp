import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const n8nUrl = 'https://nwh.suaiden.com/webhook/notfmatriculausa';
const baseUrl = Deno.env.get('BASE_URL') || 'https://matriculausa.com';

// Modo de teste: apenas enviar para email específico
const TEST_MODE = Deno.env.get('NEWSLETTER_TEST_MODE') === 'true';
const TEST_EMAIL = Deno.env.get('NEWSLETTER_TEST_EMAIL') || 'antoniocruzgomes940@gmail.com';

interface EligibleUser {
  user_id: string;
  email: string;
  full_name: string;
  user_profile_id: string;
}

/**
 * Verifica se o usuário tem opt-in explícito para receber emails
 * CRÍTICO: Esta verificação é obrigatória para compliance GDPR/LGPD
 * Retorna true APENAS se email_opt_in = true explicitamente
 */
async function hasExplicitOptIn(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: preferences } = await supabase
    .from('newsletter_user_preferences')
    .select('email_opt_in, email_opt_out')
    .eq('user_id', userId)
    .maybeSingle();

  // Se não tem registro OU não consentiu explicitamente (opt_in não é true), NÃO pode receber
  if (!preferences || preferences.email_opt_in !== true) {
    return false;
  }

  // Se optou por sair, não pode receber
  if (preferences.email_opt_out === true) {
    return false;
  }

  return true;
}

/**
 * Verifica se a campanha pode ser enviada para o usuário
 * Retorna { canSend: boolean, reason?: string }
 * - Se send_once = true e já foi enviado → não pode enviar
 * - Se send_once = false e está em cooldown → não pode enviar
 * - Caso contrário → pode enviar
 */
async function canSendCampaignToUser(
  supabase: SupabaseClient,
  userId: string,
  campaignId: string,
  cooldownDays: number,
  testMode: boolean = false
): Promise<{ canSend: boolean; reason?: string }> {
  // IMPORTANTE: send_once deve ser SEMPRE respeitado, mesmo em modo de teste
  // Apenas o cooldown pode ser ignorado em modo de teste
  
  // Buscar configuração da campanha PRIMEIRO para verificar send_once
  const { data: campaign, error: campaignError } = await supabase
    .from('newsletter_campaigns')
    .select('send_once')
    .eq('id', campaignId)
    .single();

  if (campaignError) {
    console.error(`[Newsletter] Erro ao buscar campanha ${campaignId}:`, campaignError);
    // Em caso de erro, não permitir envio por segurança
    return { canSend: false, reason: `Error fetching campaign: ${campaignError.message}` };
  }

  // Verificar se já foi enviado (qualquer status: sent, pending, failed)
  const { data: lastEmail, error: emailError } = await supabase
    .from('newsletter_sent_emails')
    .select('sent_at, status')
    .eq('user_id', userId)
    .eq('campaign_id', campaignId)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (emailError) {
    console.error(`[Newsletter] Erro ao verificar emails enviados para user ${userId}:`, emailError);
    // Em caso de erro, não permitir envio por segurança
    return { canSend: false, reason: `Error checking sent emails: ${emailError.message}` };
  }

  // Se nunca foi enviado, pode enviar
  if (!lastEmail?.sent_at) {
    console.log(`[Newsletter] ✅ Usuário ${userId} nunca recebeu esta campanha, pode enviar`);
    return { canSend: true };
  }

  console.log(`[Newsletter] 📧 Usuário ${userId} já recebeu esta campanha anteriormente (enviado em ${lastEmail.sent_at}, status: ${lastEmail.status})`);

  // Se send_once = true, não reenviar nunca (independente de quando foi enviado)
  if (campaign?.send_once === true) {
    console.log(`[Newsletter] ⛔ BLOQUEADO: Usuário ${userId} já recebeu esta campanha (send_once=true, enviado em ${lastEmail.sent_at}, status: ${lastEmail.status})`);
    return { 
      canSend: false, 
      reason: `Campaign configured to send only once (send_once=true). Last sent: ${lastEmail.sent_at}` 
    };
  }

  // Se send_once = false, verificar cooldown
  // IMPORTANTE: Se cooldownDays = 0, permite reenvio imediato (sem verificar cooldown)
  if (cooldownDays === 0) {
    console.log(`[Newsletter] ✅ Cooldown = 0, permitindo reenvio imediato para user ${userId} (último envio: ${lastEmail.sent_at})`);
    return { canSend: true };
  }

  // Se cooldownDays > 0, verificar se passou o período de cooldown
  if (!testMode) {
    const lastSentDate = new Date(lastEmail.sent_at);
    const daysSinceLastEmail = (Date.now() - lastSentDate.getTime()) / (1000 * 60 * 60 * 24);
    
    console.log(`[Newsletter] 📊 Cooldown check: ${daysSinceLastEmail.toFixed(3)} dias desde último envio, necessário: ${cooldownDays} dias`);
    
    if (daysSinceLastEmail < cooldownDays) {
      console.log(`[Newsletter] ⏳ Usuário ${userId} está em cooldown (${daysSinceLastEmail.toFixed(3)} dias, necessário: ${cooldownDays} dias)`);
      return { 
        canSend: false, 
        reason: `User is in cooldown (${daysSinceLastEmail.toFixed(3)} days, required: ${cooldownDays} days). Last sent: ${lastEmail.sent_at}` 
      };
    }
  } else {
    console.log(`[Newsletter] 🧪 TESTE: Ignorando cooldown para user ${userId} (mas send_once ainda é respeitado)`);
  }

  console.log(`[Newsletter] ✅ Usuário ${userId} pode receber esta campanha`);
  return { canSend: true };
}

interface Campaign {
  id: string;
  campaign_key: string;
  name: string;
  email_subject_template: string;
  email_body_template: string;
  cooldown_days: number;
  send_once?: boolean; // Se true, envia apenas uma vez por usuário
  trigger_conditions?: {
    type?: 'registered_no_payment' | 'paid_no_application' | 'application_flow_stage' | 'all_users';
    days?: number;
    stage?: string;
    stage_status?: string;
  };
}

/**
 * Busca usuários elegíveis para campanhas do tipo "registered_no_payment"
 * Suporta diferentes intervalos de dias (2, 7, 14, 21, etc.)
 */
async function getEligibleUsersForRegisteredNoPayment(
  supabase: SupabaseClient,
  campaignId: string,
  cooldownDays: number,
  daysSinceRegistration: number = 2,
  limit: number = 50,
  ignoreRateLimit: boolean = false
): Promise<EligibleUser[]> {
  // Buscar usuários diretamente (não usar RPC que pode ter validações próprias)
  // Isso nos dá mais controle sobre as validações
  // Filtrar usuários que atendem às condições específicas desta campanha
  // Aumentar o limite para garantir que encontramos todos os usuários elegíveis
  const { data: eligibleUsers, error: queryError } = await supabase
    .from('user_profiles')
    .select(`
      user_id,
      email,
      full_name,
      id,
      role,
      has_paid_selection_process_fee
    `)
    .eq('role', 'student')
    .eq('has_paid_selection_process_fee', false)
    .not('email', 'is', null)
    .limit(limit * 3); // Aumentar para garantir que encontramos todos

  if (queryError || !eligibleUsers) {
    console.error('[Newsletter] Erro ao buscar user_profiles:', queryError);
    return [];
  }

  console.log(`[Newsletter] 📊 Busca inicial encontrou ${eligibleUsers.length} usuários com has_paid_selection_process_fee=false`);

  // Buscar data de criação dos usuários
  const userIds = eligibleUsers.map(u => u.user_id);
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  
  console.log(`[Newsletter] 📊 Total de usuários auth encontrados: ${authUsers?.users.length || 0}`);
  
  const usersWithCreationDate = eligibleUsers
    .map(profile => {
      const authUser = authUsers?.users.find(u => u.id === profile.user_id);
      if (!authUser) {
        console.log(`[Newsletter] ⚠️ Usuário ${profile.email} não encontrado em auth.users`);
        return null;
      }

      // Verificar se passaram os dias mínimos desde o registro (exceto em modo de teste)
      // Se daysSinceRegistration for 0, enviar imediatamente (não verificar dias)
      const createdAt = new Date(authUser.created_at);
      const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (!TEST_MODE && daysSinceRegistration > 0) {
        if (daysSinceCreation < daysSinceRegistration) {
          console.log(`[Newsletter] ⏳ Usuário ${profile.email} não passou no filtro de dias (${daysSinceCreation.toFixed(3)} dias < ${daysSinceRegistration} dias)`);
          return null;
        }
      } else {
        console.log(`[Newsletter] ✅ Usuário ${profile.email} passou no filtro de dias (daysSinceRegistration=${daysSinceRegistration}, daysSinceCreation=${daysSinceCreation.toFixed(3)}, TEST_MODE=${TEST_MODE})`);
      }

      return {
        user_id: profile.user_id,
        email: profile.email || '',
        full_name: profile.full_name || 'Estudante',
        user_profile_id: profile.id
      };
    })
    .filter((u): u is EligibleUser => u !== null);

  console.log(`[Newsletter] 📊 Após filtrar por dias, restam ${usersWithCreationDate.length} usuários`);

  // Verificar rate limit e cooldown para cada usuário (ignorar em modo de teste)
  const finalEligibleUsers: EligibleUser[] = [];
  
  console.log(`[Newsletter] 🔍 Iniciando validações para ${usersWithCreationDate.length} usuários`);
  
  for (const user of usersWithCreationDate) {
    console.log(`[Newsletter] 🔍 Processando usuário: ${user.email} (${user.user_id})`);
    
    // ✅ CRÍTICO: Verificar opt-in explícito ANTES de qualquer outra verificação
    // Isso garante compliance GDPR/LGPD - apenas usuários que consentiram podem receber
    const { data: preferences, error: prefError } = await supabase
      .from('newsletter_user_preferences')
      .select('email_opt_in, email_opt_out')
      .eq('user_id', user.user_id)
      .maybeSingle();

    if (prefError) {
      console.error(`[Newsletter] ❌ Erro ao buscar preferências para ${user.email}:`, prefError);
      continue;
    }

    // Se não tem registro OU não consentiu explicitamente (opt_in não é true), NÃO pode receber
    if (!preferences || preferences.email_opt_in !== true) {
      console.log(`[Newsletter] ⛔ Usuário ${user.email} não pode receber email: opt-in não confirmado (opt_in=${preferences?.email_opt_in}, preferences existe: ${!!preferences})`);
      continue;
    }

    // Se optou por sair, não pode receber
    if (preferences.email_opt_out === true) {
      console.log(`[Newsletter] ⛔ Usuário ${user.email} optou por sair (opt-out)`);
      continue;
    }

    console.log(`[Newsletter] ✅ Usuário ${user.email} passou na verificação de opt-in`);

    // ✅ IMPORTANTE: Verificar cooldown da campanha ANTES do rate limit global
    const { canSend, reason } = await canSendCampaignToUser(
      supabase,
      user.user_id,
      campaignId,
      cooldownDays,
      TEST_MODE
    );

    if (!canSend) {
      console.log(`[Newsletter] ⛔ Usuário ${user.email} não pode receber esta campanha: ${reason}`);
      continue;
    }

    // Verificar rate limit global (máximo 1 email por 24h) - IGNORAR EM MODO DE TESTE OU SE ignoreRateLimit = true
    if (!TEST_MODE && !ignoreRateLimit) {
      const { data: canReceive } = await supabase.rpc('check_user_can_receive_email', {
        p_user_id: user.user_id
      });

      if (!canReceive) {
        console.log(`[Newsletter] ⏳ Usuário ${user.email} não pode receber email (rate limit global: máximo 1 email por 24h)`);
        continue;
      }
    } else {
      if (ignoreRateLimit) {
        console.log(`[Newsletter] ⚡ IGNORANDO rate limit para ${user.email} (processamento manual)`);
      } else {
        console.log(`[Newsletter] 🧪 TESTE: Ignorando rate limit para ${user.email}`);
      }
    }

    finalEligibleUsers.push(user);
  }

  return finalEligibleUsers;
}

/**
 * Busca usuários elegíveis para campanhas do tipo "paid_no_application"
 * Suporta diferentes intervalos de dias (3, 7, 14, 21, etc.)
 */
async function getEligibleUsersForPaidNoApplication(
  supabase: SupabaseClient,
  campaignId: string,
  cooldownDays: number,
  daysSincePayment: number = 3,
  limit: number = 50,
  ignoreRateLimit: boolean = false
): Promise<EligibleUser[]> {
  // Buscar usuários que pagaram selection process fee mas não têm aplicação
  const { data: eligibleUsers, error: queryError } = await supabase
    .from('user_profiles')
    .select(`
      user_id,
      email,
      full_name,
      id,
      role,
      has_paid_selection_process_fee
    `)
    .eq('role', 'student')
    .eq('has_paid_selection_process_fee', true)
    .not('email', 'is', null)
    .limit(limit * 2); // Buscar mais para filtrar depois

  if (queryError || !eligibleUsers) {
    console.error('[Newsletter] Erro ao buscar user_profiles:', queryError);
    return [];
  }

  // Verificar quais não têm aplicação
  const usersWithoutApplication: EligibleUser[] = [];
  
  for (const profile of eligibleUsers) {
    // Verificar se tem aplicação
    const { data: applications } = await supabase
      .from('scholarship_applications')
      .select('id')
      .eq('student_id', profile.id)
      .limit(1);

    if (applications && applications.length > 0) {
      continue; // Tem aplicação, não é elegível
    }

    // Verificar se pagou há mais de X dias (exceto em modo de teste)
    // Se daysSincePayment for 0, enviar imediatamente (não verificar dias)
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
        
        if (daysSincePaymentDate < daysSincePayment) {
          continue; // Pagou há menos de X dias
        }
      }
    }

    // ✅ CRÍTICO: Verificar opt-in explícito ANTES de qualquer outra verificação
    const hasOptIn = await hasExplicitOptIn(supabase, profile.user_id);
    if (!hasOptIn) {
      console.log(`[Newsletter] ⛔ Usuário ${profile.email} não pode receber email: opt-in não confirmado`);
      continue;
    }

    // ✅ IMPORTANTE: Verificar cooldown da campanha ANTES do rate limit global
    const { canSend, reason } = await canSendCampaignToUser(
      supabase,
      profile.user_id,
      campaignId,
      cooldownDays,
      TEST_MODE
    );

    if (!canSend) {
      console.log(`[Newsletter] ⛔ Usuário ${profile.email} não pode receber esta campanha: ${reason}`);
      continue;
    }

    // Verificar rate limit global (máximo 1 email por 24h) - IGNORAR EM MODO DE TESTE OU SE ignoreRateLimit = true
    if (!TEST_MODE && !ignoreRateLimit) {
      const { data: canReceive } = await supabase.rpc('check_user_can_receive_email', {
        p_user_id: profile.user_id
      });

      if (!canReceive) {
        console.log(`[Newsletter] ⏳ Usuário ${profile.email} não pode receber email (rate limit global: máximo 1 email por 24h)`);
        continue;
      }
    } else {
      if (ignoreRateLimit) {
        console.log(`[Newsletter] ⚡ IGNORANDO rate limit para ${profile.email} (processamento manual)`);
      } else {
        console.log(`[Newsletter] 🧪 TESTE: Ignorando rate limit e cooldown para ${profile.email}`);
      }
    }

    usersWithoutApplication.push({
      user_id: profile.user_id,
      email: profile.email || '',
      full_name: profile.full_name || 'Estudante',
      user_profile_id: profile.id
    });

    if (usersWithoutApplication.length >= limit) {
      break;
    }
  }

  return usersWithoutApplication;
}

/**
 * Personaliza template de email com dados do usuário
 */
function personalizeEmailTemplate(
  template: string,
  user: EligibleUser,
  campaignKey: string
): string {
  let personalized = template;
  
  // Substituir variáveis do template
  personalized = personalized.replace(/\{\{full_name\}\}/g, user.full_name || 'Estudante');
  personalized = personalized.replace(/\{\{email\}\}/g, user.email);
  
  // Nota: Os links de redirecionamento agora estão hardcoded nos templates do banco
  // como https://matriculausa.com/student/dashboard para ambas as campanhas
  
  // URL de unsubscribe (gerar token seguro)
  // Usar base64 URL-safe (substituir + por - e / por _)
  const tokenData = `${user.user_id}:${Date.now()}`;
  const base64Token = btoa(tokenData).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(base64Token)}`;
  personalized = personalized.replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);
  
  return personalized;
}

/**
 * Envia email via webhook n8n
 */
async function sendEmailViaN8n(
  user: EligibleUser,
  campaign: Campaign,
  subject: string,
  htmlBody: string
): Promise<boolean> {
  try {
    const payload = {
      tipo_notf: 'Newsletter Campaign',
      campaign_key: campaign.campaign_key,
      email_aluno: user.email,
      nome_aluno: user.full_name,
      subject: subject,
      html_body: htmlBody,
      unsubscribe_url: htmlBody.match(/href="([^"]*unsubscribe[^"]*)"/)?.[1] || ''
    };

    console.log(`[Newsletter] Enviando email para ${user.email} (campanha: ${campaign.campaign_key})`);

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MatriculaUSA-Newsletter/1.0'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Newsletter] Erro ao enviar email para ${user.email}:`, response.status, errorText);
      return false;
    }

    console.log(`[Newsletter] Email enviado com sucesso para ${user.email}`);
    return true;
  } catch (error) {
    console.error(`[Newsletter] Erro ao enviar email para ${user.email}:`, error);
    return false;
  }
}

/**
 * Determina o status de um estágio específico para um estudante
 * Reutiliza a lógica do frontend para consistência
 */
function getStepStatus(student: any, step: string): string {
  switch (step) {
    case 'selection_fee':
      return student.has_paid_selection_process_fee ? 'completed' : 'pending';
    
    case 'apply':
      return (student.total_applications || 0) > 0 ? 'completed' : 'pending';
    
    case 'review':
      // Se tem alguma aplicação approved/enrolled, está completed
      if (student.has_approved_application) {
        return 'completed';
      }
      // Se todas as aplicações estão pending, está pending (elegível para email)
      if (student.all_applications_pending) {
        return 'pending';
      }
      // Se tem aplicação rejected
      if (student.application_status === 'rejected') {
        return 'rejected';
      }
      // Se está under_review
      if (student.application_status === 'under_review') {
        return 'in_progress';
      }
      // Caso padrão: pending
      return 'pending';
    
    case 'application_fee':
      // Se tem scholarship_fee pago, não deve receber email de application_fee
      if (student.is_scholarship_fee_paid) {
        if (student.email?.includes('antoniocruzgomes940')) {
          console.log(`[Newsletter] DEBUG - ${student.email}: application_fee skipped (has scholarship_fee_paid)`);
        }
        return 'skipped'; // Já passou desta etapa
      }
      // Se tem application_fee pago, está completed
      const result = student.is_application_fee_paid ? 'completed' : 'pending';
      if (student.email?.includes('antoniocruzgomes940')) {
        console.log(`[Newsletter] DEBUG - ${student.email}: application_fee status=${result}, is_application_fee_paid=${student.is_application_fee_paid}, is_scholarship_fee_paid=${student.is_scholarship_fee_paid}`);
      }
      return result;
    
    case 'scholarship_fee':
      // Para scholarship_fee, verificar se:
      // 1. Tem is_scholarship_fee_paid = true (em alguma aplicação)
      // 2. Tem is_application_fee_paid = true (em alguma aplicação)
      // 3. NÃO tem has_paid_i20_control_fee = true (em user_profiles)
      // Se todas as condições forem verdadeiras, está completed (elegível para email)
      if (!student.is_scholarship_fee_paid) {
        if (student.email?.includes('antoniocruzgomes940')) {
          console.log(`[Newsletter] DEBUG - ${student.email}: scholarship_fee pending (is_scholarship_fee_paid=false)`);
        }
        return 'pending';
      }
      if (!student.is_application_fee_paid) {
        if (student.email?.includes('antoniocruzgomes940')) {
          console.log(`[Newsletter] DEBUG - ${student.email}: scholarship_fee pending (is_application_fee_paid=false)`);
        }
        return 'pending';
      }
      if (student.has_paid_i20_control_fee) {
        if (student.email?.includes('antoniocruzgomes940')) {
          console.log(`[Newsletter] DEBUG - ${student.email}: scholarship_fee skipped (has_paid_i20_control_fee=true)`);
        }
        return 'skipped'; // Já passou desta etapa
      }
      // Todas as condições atendidas: scholarship_fee pago, application_fee pago, i20 não pago
      if (student.email?.includes('antoniocruzgomes940')) {
        console.log(`[Newsletter] DEBUG - ${student.email}: scholarship_fee completed (all conditions met)`);
      }
      return 'completed';
    
    case 'i20_fee':
      // Para i20_fee, verificar se:
      // 1. Tem is_scholarship_fee_paid = true (em alguma aplicação)
      // 2. Tem has_paid_i20_control_fee = true (em user_profiles)
      // 3. TODAS as aplicações têm acceptance_letter_status = 'pending'
      // 4. TODAS as aplicações têm transfer_form_status = null
      // Se todas as condições forem verdadeiras, está completed (elegível para email)
      if (!student.is_scholarship_fee_paid) {
        if (student.email?.includes('antoniocruzgomes940')) {
          console.log(`[Newsletter] DEBUG - ${student.email}: i20_fee pending (is_scholarship_fee_paid=false)`);
        }
        return 'pending';
      }
      if (!student.has_paid_i20_control_fee) {
        if (student.email?.includes('antoniocruzgomes940')) {
          console.log(`[Newsletter] DEBUG - ${student.email}: i20_fee pending (has_paid_i20_control_fee=false)`);
        }
        return 'pending';
      }
      if (!student.all_applications_have_pending_acceptance) {
        if (student.email?.includes('antoniocruzgomes940')) {
          console.log(`[Newsletter] DEBUG - ${student.email}: i20_fee pending (not all applications have acceptance_letter_status='pending')`);
        }
        return 'pending';
      }
      if (!student.all_applications_have_null_transfer_form) {
        if (student.email?.includes('antoniocruzgomes940')) {
          console.log(`[Newsletter] DEBUG - ${student.email}: i20_fee pending (not all applications have transfer_form_status=null)`);
        }
        return 'pending';
      }
      // Todas as condições atendidas
      if (student.email?.includes('antoniocruzgomes940')) {
        console.log(`[Newsletter] DEBUG - ${student.email}: i20_fee completed (all conditions met)`);
      }
      return 'completed';
    
    case 'acceptance_letter':
      // Para acceptance_letter, verificar se:
      // 1. Tem has_paid_i20_control_fee = true (em user_profiles)
      // 2. Alguma aplicação tem acceptance_letter_status = 'sent'
      // 3. Essa aplicação tem acceptance_letter_sent_at != null
      // 4. Essa aplicação tem acceptance_letter_url != null
      // 5. NÃO tem nenhuma aplicação com status = 'enrolled' (se tiver, deve ir para campanha de enrollment)
      // Se todas as condições forem verdadeiras, está completed (elegível para email)
      if (!student.has_paid_i20_control_fee) {
        if (student.email?.includes('antoniocruzgomes940')) {
          console.log(`[Newsletter] DEBUG - ${student.email}: acceptance_letter pending (has_paid_i20_control_fee=false)`);
        }
        return 'pending';
      }
      if (!student.has_sent_acceptance_letter) {
        if (student.email?.includes('antoniocruzgomes940')) {
          console.log(`[Newsletter] DEBUG - ${student.email}: acceptance_letter pending (no application with sent status, sent_at and url)`);
        }
        return 'pending';
      }
      // Se tem alguma aplicação enrolled, não deve receber email de acceptance_letter (deve ir para enrollment)
      if (student.has_enrolled_application) {
        if (student.email?.includes('antoniocruzgomes940')) {
          console.log(`[Newsletter] DEBUG - ${student.email}: acceptance_letter skipped (has enrolled application, should use enrollment campaign)`);
        }
        return 'skipped'; // Já passou desta etapa, deve usar campanha de enrollment
      }
      // Todas as condições atendidas
      if (student.email?.includes('antoniocruzgomes940')) {
        console.log(`[Newsletter] DEBUG - ${student.email}: acceptance_letter completed (all conditions met)`);
      }
      return 'completed';
    
    case 'enrollment':
      return student.application_status === 'enrolled' ? 'completed' : 'pending';
    
    default:
      return 'pending';
  }
}

/**
 * Busca usuários elegíveis para campanhas baseadas em estágios do application flow
 */
async function getEligibleUsersForApplicationFlowStage(
  supabase: SupabaseClient,
  campaignId: string,
  cooldownDays: number,
  stage: string,
  stageStatus?: string,
  limit: number = 50,
  ignoreRateLimit: boolean = false
): Promise<EligibleUser[]> {
  console.log(`[Newsletter] Buscando usuários no estágio: ${stage}${stageStatus ? ` com status: ${stageStatus}` : ''}`);

  // Buscar todos os estudantes
  const { data: students, error: queryError } = await supabase
    .from('user_profiles')
    .select(`
      user_id,
      email,
      full_name,
      id,
      role,
      has_paid_selection_process_fee,
      has_paid_i20_control_fee
    `)
    .eq('role', 'student')
    .not('email', 'is', null)
    .limit(limit * 3); // Buscar mais para filtrar depois

  if (queryError || !students) {
    console.error('[Newsletter] Erro ao buscar user_profiles:', queryError);
    return [];
  }

  // Buscar dados de aplicações para cada estudante
  const userIds = students.map(s => s.user_id);
  const studentIds = students.map(s => s.id);
  
  // Buscar aplicações (incluindo student_process_type que está nesta tabela)
  const { data: applications } = await supabase
    .from('scholarship_applications')
    .select('student_id, status, is_application_fee_paid, is_scholarship_fee_paid, acceptance_letter_status, acceptance_letter_sent_at, acceptance_letter_url, transfer_form_status, student_process_type')
    .in('student_id', studentIds);

  // Buscar dados de pagamentos (tentar individual_fee_payments primeiro, depois stripe_payments se existir)
  let payments: any[] = [];
  const { data: paymentsData, error: paymentsError } = await supabase
    .from('individual_fee_payments')
    .select('user_id, fee_type, status, payment_date')
    .in('user_id', userIds)
    .eq('status', 'succeeded');
  
  if (paymentsData) {
    payments = paymentsData;
  } else if (paymentsError) {
    // Se individual_fee_payments não existir, tentar stripe_payments (pode não existir também)
    const { data: stripePayments } = await supabase
      .from('stripe_payments')
      .select('user_id, fee_type, status')
      .in('user_id', userIds)
      .eq('status', 'succeeded');
    if (stripePayments) {
      payments = stripePayments;
    } else {
      console.warn('[Newsletter] Nenhuma tabela de pagamentos encontrada, continuando sem dados de pagamento');
    }
  }

  // Mapear dados para facilitar busca
  const applicationsByStudentId: Record<string, any[]> = {};
  applications?.forEach(app => {
    if (!applicationsByStudentId[app.student_id]) {
      applicationsByStudentId[app.student_id] = [];
    }
    applicationsByStudentId[app.student_id].push(app);
  });

  const paymentsByUserId: Record<string, any[]> = {};
  payments?.forEach(payment => {
    if (!paymentsByUserId[payment.user_id]) {
      paymentsByUserId[payment.user_id] = [];
    }
    paymentsByUserId[payment.user_id].push(payment);
  });

  // Construir objeto student completo para cada estudante
  const studentsWithData = students.map(profile => {
    const studentApps = applicationsByStudentId[profile.id] || [];
    const studentPayments = paymentsByUserId[profile.user_id] || [];
    
    // Verificar fees nas aplicações (colunas is_application_fee_paid e is_scholarship_fee_paid)
    // Priorizar dados das aplicações sobre pagamentos da tabela individual_fee_payments
    const hasPaidApplicationFeeInApp = studentApps.some(app => app.is_application_fee_paid === true);
    const hasPaidScholarshipFeeInApp = studentApps.some(app => app.is_scholarship_fee_paid === true);
    
    // Fallback para pagamentos na tabela individual_fee_payments (caso as colunas das aplicações não estejam preenchidas)
    const hasPaidApplicationFeeInPayments = studentPayments.some(p => p.fee_type === 'application_fee');
    const hasPaidScholarshipFeeInPayments = studentPayments.some(p => p.fee_type === 'scholarship_fee');
    
    // Usar dados das aplicações se disponível, senão usar dados de pagamentos
    const hasPaidApplicationFee = hasPaidApplicationFeeInApp || hasPaidApplicationFeeInPayments;
    const hasPaidScholarshipFee = hasPaidScholarshipFeeInApp || hasPaidScholarshipFeeInPayments;
    
    // has_paid_i20_control_fee vem de user_profiles (não de pagamentos)
    const hasPaidI20Fee = profile.has_paid_i20_control_fee || false;
    
    const latestApp = studentApps[0];
    const applicationStatus = latestApp?.status || null;
    const acceptanceLetterStatus = latestApp?.acceptance_letter_status || null;
    const transferFormStatus = latestApp?.transfer_form_status || null;
    const studentProcessType = latestApp?.student_process_type || null;
    
    // Para o estágio "review", verificar se tem alguma aplicação approved/enrolled
    // Se tiver, não deve receber email de "pending"
    const hasApprovedApplication = studentApps.some(app => 
      app.status === 'approved' || app.status === 'enrolled'
    );
    const hasEnrolledApplication = studentApps.some(app => 
      app.status === 'enrolled'
    );
    const allApplicationsPending = studentApps.length > 0 && 
      studentApps.every(app => app.status === 'pending');
    
    // Para o estágio "i20_fee", verificar se TODAS as aplicações têm:
    // - acceptance_letter_status = 'pending'
    // - transfer_form_status = null
    const allApplicationsHavePendingAcceptance = studentApps.length > 0 && 
      studentApps.every(app => app.acceptance_letter_status === 'pending');
    const allApplicationsHaveNullTransferForm = studentApps.length > 0 && 
      studentApps.every(app => app.transfer_form_status === null || app.transfer_form_status === undefined);
    
    // Para o estágio "acceptance_letter", verificar se alguma aplicação tem:
    // - acceptance_letter_status = 'sent'
    // - acceptance_letter_sent_at != null
    // - acceptance_letter_url != null
    const hasSentAcceptanceLetter = studentApps.some(app => 
      app.acceptance_letter_status === 'sent' &&
      app.acceptance_letter_sent_at != null &&
      app.acceptance_letter_url != null
    );
    
    return {
      ...profile,
      total_applications: studentApps.length,
      application_status: applicationStatus,
      is_application_fee_paid: hasPaidApplicationFee,
      is_scholarship_fee_paid: hasPaidScholarshipFee,
      has_paid_i20_control_fee: hasPaidI20Fee,
      acceptance_letter_status: acceptanceLetterStatus,
      transfer_form_status: transferFormStatus,
      student_process_type: studentProcessType,
      has_approved_application: hasApprovedApplication,
      has_enrolled_application: hasEnrolledApplication,
      all_applications_pending: allApplicationsPending,
      all_applications_have_pending_acceptance: allApplicationsHavePendingAcceptance,
      all_applications_have_null_transfer_form: allApplicationsHaveNullTransferForm,
      has_sent_acceptance_letter: hasSentAcceptanceLetter
    };
  });

  // Filtrar estudantes que estão no estágio especificado
  console.log(`[Newsletter] Filtrando ${studentsWithData.length} estudantes para estágio: ${stage}${stageStatus ? ` com status: ${stageStatus}` : ' (qualquer status)'}`);
  
  const eligibleStudents = studentsWithData.filter(student => {
    const status = getStepStatus(student, stage);
    
    // Se stageStatus foi especificado, verificar se corresponde
    if (stageStatus) {
      const matches = status === stageStatus;
      if (!matches && student.email?.includes('antoniocruzgomes940')) {
        console.log(`[Newsletter] DEBUG - ${student.email}: status=${status}, esperado=${stageStatus}, stage=${stage}, total_applications=${student.total_applications}`);
      }
      return matches;
    }
    
    // Se não foi especificado, usar lógica padrão baseada no estágio
    // Para estágios de ação completa (apply, application_fee, etc), aceitar apenas 'completed'
    // Para estágios de processo (review), aceitar 'completed' ou 'in_progress'
    // Sempre rejeitar 'skipped' e 'pending' quando não especificado
    if (status === 'skipped') {
      if (student.email?.includes('antoniocruzgomes940')) {
        console.log(`[Newsletter] DEBUG - ${student.email}: status=skipped, stage=${stage}`);
      }
      return false;
    }
    
    // Estágios que representam ações completadas - só aceitar 'completed'
    const actionStages = ['selection_fee', 'apply', 'application_fee', 'scholarship_fee', 'i20_fee', 'acceptance_letter', 'enrollment'];
    if (actionStages.includes(stage)) {
      const matches = status === 'completed';
      if (student.email?.includes('antoniocruzgomes940')) {
        console.log(`[Newsletter] DEBUG - ${student.email}: status=${status}, stage=${stage}, total_applications=${student.total_applications}, matches=${matches}`);
      }
      return matches;
    }
    
    // Para estágios de processo (review), aceitar 'pending', 'completed' ou 'in_progress'
    // 'pending' = todas aplicações estão pending (elegível para email)
    // 'in_progress' = aplicação está under_review
    // 'completed' = tem aplicação approved/enrolled
    if (stage === 'review') {
      // Se stageStatus foi especificado, verificar se corresponde
      if (stageStatus) {
        const matches = status === stageStatus;
        if (student.email?.includes('antoniocruzgomes940')) {
          console.log(`[Newsletter] DEBUG - ${student.email}: status=${status}, stage=review, stageStatus=${stageStatus}, matches=${matches}, has_approved=${student.has_approved_application}, all_pending=${student.all_applications_pending}`);
        }
        return matches;
      }
      // Se não especificado, aceitar 'pending' (todas aplicações pending) ou 'in_progress' (under_review)
      // NÃO aceitar 'completed' (tem approved) nem 'rejected'
      const matches = status === 'pending' || status === 'in_progress';
      if (student.email?.includes('antoniocruzgomes940')) {
        console.log(`[Newsletter] DEBUG - ${student.email}: status=${status}, stage=review, matches=${matches}, has_approved=${student.has_approved_application}, all_pending=${student.all_applications_pending}`);
      }
      return matches;
    }
    
    // Por padrão, aceitar apenas 'completed'
    const matches = status === 'completed';
    if (student.email?.includes('antoniocruzgomes940')) {
      console.log(`[Newsletter] DEBUG - ${student.email}: status=${status}, stage=${stage}, matches=${matches}`);
    }
    return matches;
  });

  console.log(`[Newsletter] Encontrados ${eligibleStudents.length} estudantes no estágio ${stage}${stageStatus ? ` com status ${stageStatus}` : ' (completados)'}`);

  // Verificar rate limit e cooldown para cada usuário
  const finalEligibleUsers: EligibleUser[] = [];
  
  for (const student of eligibleStudents.slice(0, limit)) {
    // ✅ CRÍTICO: Verificar opt-in explícito ANTES de qualquer outra verificação
    const hasOptIn = await hasExplicitOptIn(supabase, student.user_id);
    if (!hasOptIn) {
      console.log(`[Newsletter] ⛔ Usuário ${student.email} não pode receber email: opt-in não confirmado`);
      continue;
    }

    // ✅ IMPORTANTE: Verificar cooldown da campanha ANTES do rate limit global
    const { canSend, reason } = await canSendCampaignToUser(
      supabase,
      student.user_id,
      campaignId,
      cooldownDays,
      TEST_MODE
    );

    if (!canSend) {
      console.log(`[Newsletter] ⛔ Usuário ${student.email} não pode receber esta campanha: ${reason}`);
      continue;
    }

    // Verificar rate limit global (máximo 1 email por 24h) - IGNORAR SE ignoreRateLimit = true
    if (!TEST_MODE && !ignoreRateLimit) {
      const { data: canReceive } = await supabase.rpc('check_user_can_receive_email', {
        p_user_id: student.user_id
      });

      if (!canReceive) {
        console.log(`[Newsletter] ⏳ Usuário ${student.email} não pode receber email (rate limit global: máximo 1 email por 24h)`);
        continue;
      }
    } else if (ignoreRateLimit) {
      console.log(`[Newsletter] ⚡ IGNORANDO rate limit para ${student.email} (processamento manual)`);
    }

    finalEligibleUsers.push({
      user_id: student.user_id,
      email: student.email || '',
      full_name: student.full_name || 'Estudante',
      user_profile_id: student.id
    });
  }

  return finalEligibleUsers;
}

/**
 * Busca todos os usuários elegíveis para campanhas do tipo "all_users"
 * Respeita rate limit e cooldown, mas não filtra por estágio ou condições específicas
 */
async function getEligibleUsersForAllUsers(
  supabase: SupabaseClient,
  campaignId: string,
  cooldownDays: number,
  limit: number = 50,
  ignoreRateLimit: boolean = false
): Promise<EligibleUser[]> {
  console.log(`[Newsletter] Buscando todos os usuários elegíveis para campanha broadcast`);

  // Buscar todos os estudantes com email
  const { data: allUsers, error: queryError } = await supabase
    .from('user_profiles')
    .select(`
      user_id,
      email,
      full_name,
      id,
      role
    `)
    .eq('role', 'student')
    .not('email', 'is', null)
    .limit(limit * 3); // Buscar mais para filtrar depois

  if (queryError || !allUsers) {
    console.error('[Newsletter] Erro ao buscar user_profiles:', queryError);
    return [];
  }

  console.log(`[Newsletter] Encontrados ${allUsers.length} usuários para filtrar`);

  // Verificar rate limit e cooldown para cada usuário
  const finalEligibleUsers: EligibleUser[] = [];
  
  for (const user of allUsers) {
    // ✅ CRÍTICO: Verificar opt-in explícito ANTES de qualquer outra verificação
    const hasOptIn = await hasExplicitOptIn(supabase, user.user_id);
    if (!hasOptIn) {
      console.log(`[Newsletter] ⛔ Usuário ${user.email} não pode receber email: opt-in não confirmado`);
      continue;
    }

    // ✅ IMPORTANTE: Verificar cooldown da campanha ANTES do rate limit global
    const { canSend, reason } = await canSendCampaignToUser(
      supabase,
      user.user_id,
      campaignId,
      cooldownDays,
      TEST_MODE
    );

    if (!canSend) {
      console.log(`[Newsletter] ⛔ Usuário ${user.email} não pode receber esta campanha: ${reason}`);
      continue;
    }

    // Verificar rate limit global (máximo 1 email por 24h) - IGNORAR EM MODO DE TESTE OU SE ignoreRateLimit = true
    if (!TEST_MODE && !ignoreRateLimit) {
      const { data: canReceive } = await supabase.rpc('check_user_can_receive_email', {
        p_user_id: user.user_id
      });

      if (!canReceive) {
        console.log(`[Newsletter] ⏳ Usuário ${user.email} não pode receber email (rate limit global: máximo 1 email por 24h)`);
        continue;
      }
    } else {
      if (ignoreRateLimit) {
        console.log(`[Newsletter] ⚡ IGNORANDO rate limit para ${user.email} (processamento manual)`);
      } else {
        console.log(`[Newsletter] 🧪 TESTE: Ignorando rate limit para ${user.email}`);
      }
    }

    finalEligibleUsers.push({
      user_id: user.user_id,
      email: user.email || '',
      full_name: user.full_name || 'Estudante',
      user_profile_id: user.id
    });

    if (finalEligibleUsers.length >= limit) {
      break;
    }
  }

  console.log(`[Newsletter] ${finalEligibleUsers.length} usuários elegíveis para campanha broadcast`);
  return finalEligibleUsers;
}

/**
 * Processa uma campanha específica
 */
async function processCampaign(campaign: Campaign, ignoreRateLimit: boolean = false): Promise<{ sent: number; failed: number }> {
  console.log(`[Newsletter] Processando campanha: ${campaign.name} (${campaign.campaign_key})`);

  let eligibleUsers: EligibleUser[] = [];

  // Determinar tipo e dias baseado no campaign_key ou trigger_conditions
  const triggerType = campaign.trigger_conditions?.type || 
    (campaign.campaign_key.startsWith('registered_no_payment') ? 'registered_no_payment' : 
     campaign.campaign_key.startsWith('paid_no_application') ? 'paid_no_application' : null);
  
  // Extrair dias do campaign_key (ex: registered_no_payment_14d -> 14) ou usar trigger_conditions
  // IMPORTANTE: days pode ser 0, então não usar !daysSinceTrigger (0 é falsy)
  let daysSinceTrigger: number | undefined = campaign.trigger_conditions?.days;
  
  if (daysSinceTrigger === undefined || daysSinceTrigger === null) {
    // Tentar extrair do campaign_key
    const daysMatch = campaign.campaign_key.match(/(\d+)d$/);
    if (daysMatch) {
      daysSinceTrigger = parseInt(daysMatch[1]);
    } else {
      // Valores padrão para compatibilidade com campanhas antigas
      daysSinceTrigger = triggerType === 'registered_no_payment' ? 2 : 3;
    }
  }
  
  console.log(`[Newsletter] 📅 daysSinceTrigger extraído: ${daysSinceTrigger} (trigger_conditions.days: ${campaign.trigger_conditions?.days})`);

  // Buscar usuários elegíveis baseado na campanha
  if (triggerType === 'registered_no_payment') {
    eligibleUsers = await getEligibleUsersForRegisteredNoPayment(
      supabase,
      campaign.id,
      campaign.cooldown_days,
      daysSinceTrigger,
      50,
      ignoreRateLimit
    );
  } else if (triggerType === 'paid_no_application') {
    eligibleUsers = await getEligibleUsersForPaidNoApplication(
      supabase,
      campaign.id,
      campaign.cooldown_days,
      daysSinceTrigger,
      50,
      ignoreRateLimit
    );
  } else if (triggerType === 'application_flow_stage') {
    const stage = campaign.trigger_conditions?.stage;
    const stageStatus = campaign.trigger_conditions?.stage_status;
    
    if (!stage) {
      console.warn(`[Newsletter] Campanha application_flow_stage sem estágio especificado: ${campaign.campaign_key}`);
      return { sent: 0, failed: 0 };
    }
    
    eligibleUsers = await getEligibleUsersForApplicationFlowStage(
      supabase,
      campaign.id,
      campaign.cooldown_days,
      stage,
      stageStatus,
      50,
      ignoreRateLimit
    );
  } else if (triggerType === 'all_users') {
    eligibleUsers = await getEligibleUsersForAllUsers(
      supabase,
      campaign.id,
      campaign.cooldown_days,
      50,
      ignoreRateLimit
    );
  } else {
    console.warn(`[Newsletter] Campanha desconhecida: ${campaign.campaign_key} (tipo: ${triggerType})`);
    return { sent: 0, failed: 0 };
  }

  console.log(`[Newsletter] Encontrados ${eligibleUsers.length} usuários elegíveis para ${campaign.campaign_key}`);
  console.log(`[Newsletter] 📋 Configuração da campanha: send_once=${campaign.send_once}, cooldown_days=${campaign.cooldown_days}`);
  if (ignoreRateLimit) {
    console.log(`[Newsletter] ⚡ MODO MANUAL: Rate limit global será IGNORADO para esta campanha`);
  }

  let sent = 0;
  let failed = 0;

  // Processar cada usuário
  for (const user of eligibleUsers) {
    try {
      // ✅ VERIFICAÇÃO FINAL DE SEGURANÇA: Garantir opt-in explícito antes de enviar
      // Esta é uma verificação dupla de segurança para garantir compliance GDPR/LGPD
      const hasOptIn = await hasExplicitOptIn(supabase, user.user_id);
      if (!hasOptIn) {
        console.error(`[Newsletter] 🚨 BLOQUEADO: Tentativa de enviar email para ${user.email} sem opt-in explícito! Opt-in não confirmado.`);
        failed++;
        continue;
      }

      // ✅ VERIFICAÇÃO CRÍTICA: Verificar send_once e cooldown ANTES de enviar
      // Esta verificação é feita novamente aqui para evitar race conditions
      // IMPORTANTE: Quando ignoreRateLimit = true, ainda verificamos cooldown e send_once, mas não o rate limit global
      console.log(`[Newsletter] 🔍 Verificando se pode enviar para ${user.email} (campaign: ${campaign.id}, send_once: ${campaign.send_once}, cooldown: ${campaign.cooldown_days}, ignoreRateLimit: ${ignoreRateLimit}, TEST_MODE: ${TEST_MODE})`);
      const { canSend, reason } = await canSendCampaignToUser(
        supabase,
        user.user_id,
        campaign.id,
        campaign.cooldown_days,
        TEST_MODE
      );

      if (!canSend) {
        console.log(`[Newsletter] ⛔ BLOQUEADO ANTES DE ENVIAR: ${user.email} - ${reason}`);
        failed++;
        continue;
      }
      console.log(`[Newsletter] ✅ APROVADO PARA ENVIAR: ${user.email} (passou em todas as verificações)`);

      // Personalizar template
      const subject = personalizeEmailTemplate(campaign.email_subject_template, user, campaign.campaign_key);
      const htmlBody = personalizeEmailTemplate(campaign.email_body_template, user, campaign.campaign_key);

      // Registrar email antes de enviar (status: pending)
      const { data: emailRecord, error: insertError } = await supabase
        .from('newsletter_sent_emails')
        .insert({
          user_id: user.user_id,
          campaign_id: campaign.id,
          email_address: user.email,
          subject: subject,
          status: 'pending',
          metadata: {
            full_name: user.full_name,
            campaign_key: campaign.campaign_key
          }
        })
        .select()
        .single();

      if (insertError || !emailRecord) {
        console.error(`[Newsletter] Erro ao registrar email para ${user.email}:`, insertError);
        failed++;
        continue;
      }

      // Enviar email
      const sentSuccessfully = await sendEmailViaN8n(user, campaign, subject, htmlBody);

      // Atualizar status do email
      await supabase
        .from('newsletter_sent_emails')
        .update({
          status: sentSuccessfully ? 'sent' : 'failed',
          sent_at: new Date().toISOString()
        })
        .eq('id', emailRecord.id);

      // Atualizar last_email_sent_at nas preferências do usuário
      await supabase
        .from('newsletter_user_preferences')
        .upsert({
          user_id: user.user_id,
          last_email_sent_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (sentSuccessfully) {
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`[Newsletter] Erro ao processar usuário ${user.email}:`, error);
      failed++;
    }
  }

  console.log(`[Newsletter] Campanha ${campaign.campaign_key} concluída: ${sent} enviados, ${failed} falharam`);

  return { sent, failed };
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method Not Allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { campaign_key, limit, ignore_rate_limit } = body;

    const ignoreRateLimit = ignore_rate_limit === true;

    if (ignoreRateLimit) {
      console.log('[Newsletter] ⚡ Processamento manual: Rate limit será IGNORADO');
    }

    console.log('[Newsletter] Iniciando processamento de campanhas');

    // Buscar campanhas ativas (incluindo trigger_conditions)
    let query = supabase
      .from('newsletter_campaigns')
      .select('id, campaign_key, name, email_subject_template, email_body_template, cooldown_days, send_once, trigger_conditions')
      .eq('is_active', true);

    // Se especificou uma campanha, processar apenas ela
    if (campaign_key) {
      query = query.eq('campaign_key', campaign_key);
    }

    const { data: campaigns, error: campaignsError } = await query;

    if (campaignsError || !campaigns || campaigns.length === 0) {
      console.log('[Newsletter] Nenhuma campanha ativa encontrada');
      return new Response(
        JSON.stringify({ message: 'No active campaigns found', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Newsletter] Encontradas ${campaigns.length} campanha(s) ativa(s)`);

    const results: Record<string, { sent: number; failed: number }> = {};

    // Processar cada campanha
    for (const campaign of campaigns) {
      const result = await processCampaign(campaign, ignoreRateLimit);
      results[campaign.campaign_key] = result;
    }

    const totalSent = Object.values(results).reduce((sum, r) => sum + r.sent, 0);
    const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);

    return new Response(
      JSON.stringify({
        message: 'Campaigns processed successfully',
        results,
        total: {
          sent: totalSent,
          failed: totalFailed
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Newsletter] Erro crítico:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

