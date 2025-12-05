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

interface Campaign {
  id: string;
  campaign_key: string;
  name: string;
  email_subject_template: string;
  email_body_template: string;
  cooldown_days: number;
  trigger_conditions?: {
    type?: 'registered_no_payment' | 'paid_no_application';
    days?: number;
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
  limit: number = 50
): Promise<EligibleUser[]> {
  const { data, error } = await supabase.rpc('get_eligible_users_for_campaign', {
    p_campaign_key: 'registered_no_payment',
    p_limit: limit
  });

  if (error) {
    console.error('[Newsletter] Erro ao buscar usuários elegíveis (registered_no_payment):', error);
    return [];
  }

  // Filtrar usuários que atendem às condições específicas desta campanha
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
    .limit(limit);

  if (queryError || !eligibleUsers) {
    console.error('[Newsletter] Erro ao buscar user_profiles:', queryError);
    return [];
  }

  // Buscar data de criação dos usuários
  const userIds = eligibleUsers.map(u => u.user_id);
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  
  const usersWithCreationDate = eligibleUsers
    .map(profile => {
      const authUser = authUsers?.users.find(u => u.id === profile.user_id);
      if (!authUser) return null;

      // Verificar se passaram os dias mínimos desde o registro (exceto em modo de teste)
      if (!TEST_MODE) {
        const createdAt = new Date(authUser.created_at);
        const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceCreation < daysSinceRegistration) return null;
      }

      return {
        user_id: profile.user_id,
        email: profile.email || '',
        full_name: profile.full_name || 'Estudante',
        user_profile_id: profile.id
      };
    })
    .filter((u): u is EligibleUser => u !== null);

  // Verificar rate limit e cooldown para cada usuário (ignorar em modo de teste)
  const finalEligibleUsers: EligibleUser[] = [];
  
  for (const user of usersWithCreationDate) {
    // Verificar se pode receber email (rate limit e opt-out) - IGNORAR EM MODO DE TESTE
    if (!TEST_MODE) {
      const { data: canReceive } = await supabase.rpc('check_user_can_receive_email', {
        p_user_id: user.user_id
      });

      if (!canReceive) {
        console.log(`[Newsletter] Usuário ${user.email} não pode receber email (rate limit ou opt-out)`);
        continue;
      }
    } else {
      console.log(`[Newsletter] 🧪 TESTE: Ignorando rate limit para ${user.email}`);
    }

    // Verificar cooldown desta campanha - IGNORAR EM MODO DE TESTE
    if (!TEST_MODE) {
      const { data: lastEmail } = await supabase
        .from('newsletter_sent_emails')
        .select('sent_at')
        .eq('user_id', user.user_id)
        .eq('campaign_id', campaignId)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastEmail?.sent_at) {
        const lastSentDate = new Date(lastEmail.sent_at);
        const daysSinceLastEmail = (Date.now() - lastSentDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastEmail < cooldownDays) {
          console.log(`[Newsletter] Usuário ${user.email} está em cooldown (${daysSinceLastEmail.toFixed(1)} dias)`);
          continue;
        }
      }
    } else {
      console.log(`[Newsletter] 🧪 TESTE: Ignorando cooldown para ${user.email}`);
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
  limit: number = 50
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
    if (!TEST_MODE) {
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

    // Verificar rate limit e cooldown - IGNORAR EM MODO DE TESTE
    if (!TEST_MODE) {
      const { data: canReceive } = await supabase.rpc('check_user_can_receive_email', {
        p_user_id: profile.user_id
      });

      if (!canReceive) {
        continue;
      }

      // Verificar cooldown
      const { data: lastEmail } = await supabase
        .from('newsletter_sent_emails')
        .select('sent_at')
        .eq('user_id', profile.user_id)
        .eq('campaign_id', campaignId)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastEmail?.sent_at) {
        const lastSentDate = new Date(lastEmail.sent_at);
        const daysSinceLastEmail = (Date.now() - lastSentDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastEmail < cooldownDays) {
          continue;
        }
      }
    } else {
      console.log(`[Newsletter] 🧪 TESTE: Ignorando rate limit e cooldown para ${profile.email}`);
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
 * Processa uma campanha específica
 */
async function processCampaign(campaign: Campaign): Promise<{ sent: number; failed: number }> {
  console.log(`[Newsletter] Processando campanha: ${campaign.name} (${campaign.campaign_key})`);

  let eligibleUsers: EligibleUser[] = [];

  // Determinar tipo e dias baseado no campaign_key ou trigger_conditions
  const triggerType = campaign.trigger_conditions?.type || 
    (campaign.campaign_key.startsWith('registered_no_payment') ? 'registered_no_payment' : 
     campaign.campaign_key.startsWith('paid_no_application') ? 'paid_no_application' : null);
  
  // Extrair dias do campaign_key (ex: registered_no_payment_14d -> 14) ou usar trigger_conditions
  let daysSinceTrigger = campaign.trigger_conditions?.days;
  
  if (!daysSinceTrigger) {
    // Tentar extrair do campaign_key
    const daysMatch = campaign.campaign_key.match(/(\d+)d$/);
    if (daysMatch) {
      daysSinceTrigger = parseInt(daysMatch[1]);
    } else {
      // Valores padrão para compatibilidade com campanhas antigas
      daysSinceTrigger = triggerType === 'registered_no_payment' ? 2 : 3;
    }
  }

  // Buscar usuários elegíveis baseado na campanha
  if (triggerType === 'registered_no_payment') {
    eligibleUsers = await getEligibleUsersForRegisteredNoPayment(
      supabase,
      campaign.id,
      campaign.cooldown_days,
      daysSinceTrigger,
      50
    );
  } else if (triggerType === 'paid_no_application') {
    eligibleUsers = await getEligibleUsersForPaidNoApplication(
      supabase,
      campaign.id,
      campaign.cooldown_days,
      daysSinceTrigger,
      50
    );
  } else {
    console.warn(`[Newsletter] Campanha desconhecida: ${campaign.campaign_key}`);
    return { sent: 0, failed: 0 };
  }

  console.log(`[Newsletter] Encontrados ${eligibleUsers.length} usuários elegíveis para ${campaign.campaign_key}`);

  // Filtrar apenas email de teste se estiver em modo de teste
  if (TEST_MODE) {
    console.log(`[Newsletter] 🧪 MODO DE TESTE ATIVO - Filtrando apenas para: ${TEST_EMAIL}`);
    eligibleUsers = eligibleUsers.filter(user => user.email.toLowerCase() === TEST_EMAIL.toLowerCase());
    console.log(`[Newsletter] Após filtro de teste: ${eligibleUsers.length} usuário(s) elegível(is)`);
  }

  let sent = 0;
  let failed = 0;

  // Processar cada usuário
  for (const user of eligibleUsers) {
    try {
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
    const { campaign_key, limit } = body;

    console.log('[Newsletter] Iniciando processamento de campanhas');

    // Buscar campanhas ativas (incluindo trigger_conditions)
    let query = supabase
      .from('newsletter_campaigns')
      .select('id, campaign_key, name, email_subject_template, email_body_template, cooldown_days, trigger_conditions')
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
      const result = await processCampaign(campaign);
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

