import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  apiVersion: '2024-04-10',
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json',
  };

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers },
  });
}

Deno.serve(async (req) => {
  console.log('--- verify-stripe-session-selection-process-fee: Request received ---');
  try {
    if (req.method === 'OPTIONS') return corsResponse(null, 204);
    if (req.method !== 'POST') return corsResponse({ error: 'Method Not Allowed' }, 405);

    const { sessionId } = await req.json();
    if (!sessionId) return corsResponse({ error: 'Session ID is required' }, 400);
    console.log(`Verifying session ID: ${sessionId}`);

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(`Session status: ${session.status}, Payment status: ${session.payment_status}`);
    
    if (session.payment_status === 'paid' && session.status === 'complete') {
      const userId = session.client_reference_id;
      const applicationId = session.metadata?.application_id;

      console.log(`Processing successful payment. UserID: ${userId}, ApplicationID: ${applicationId}`);

      if (!userId) return corsResponse({ error: 'User ID (client_reference_id) missing in session.' }, 400);

      // Atualiza perfil do usuário
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ has_paid_selection_process_fee: true })
        .eq('user_id', userId);
      if (profileError) throw new Error(`Failed to update user_profiles: ${profileError.message}`);

      // Se houver applicationId, atualiza a aplicação
      if (applicationId) {
        const { error: updateError } = await supabase
          .from('scholarship_applications')
          .update({ status: 'selection_process_paid' })
          .eq('student_id', userId)
          .eq('id', applicationId);
        if (updateError) throw new Error(`Failed to update application status for selection process fee: ${updateError.message}`);
      }

      // Verifica se o usuário utilizou algum código de referência
      const { data: usedCode, error: usedError } = await supabase
        .from('used_referral_codes')
        .select('*')
        .eq('user_id', userId)
        .order('applied_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (usedError) {
        console.error('Error fetching used_referral_codes:', usedError);
      }

      if (usedCode && usedCode.referrer_id) {
        const referrerId = usedCode.referrer_id as string;
        console.log('[Referral Reward] Found referrer:', referrerId, 'affiliate_code:', usedCode.affiliate_code);

        // Obter nome/email do usuário que pagou (referred)
        let referredDisplayName = '';
        try {
          const { data: referredProfile } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('user_id', userId)
            .maybeSingle();
          if (referredProfile?.full_name) {
            referredDisplayName = referredProfile.full_name;
          } else {
            const { data: authUser } = await supabase.auth.admin.getUserById(userId);
            referredDisplayName = authUser?.user?.email || userId;
          }
        } catch (e) {
          console.warn('[Referral Reward] Could not resolve referred user name, using ID. Error:', e);
          referredDisplayName = userId;
        }

        // Upsert affiliate_referrals (1 por referred_id) com créditos de 200 e dados do pagamento
        const { error: upsertRefError } = await supabase
          .from('affiliate_referrals')
          .upsert({
            referrer_id: referrerId,
            referred_id: userId,
            affiliate_code: usedCode.affiliate_code,
            payment_amount: Number(session.amount_total ? session.amount_total / 100 : 0),
            credits_earned: 180,
            status: 'completed',
            payment_session_id: sessionId,
            completed_at: new Date().toISOString(),
          }, { onConflict: 'referred_id' });

        if (upsertRefError) {
          console.error('[Referral Reward] Failed to upsert affiliate_referrals:', upsertRefError);
        }

        // Evitar duplicidade: se já existe transação com reference_type = 'selection_process_referral' e reference_id = usedCode.id, não creditar novamente
        const { data: existingTx, error: txFetchError } = await supabase
          .from('matriculacoin_transactions')
          .select('id')
          .eq('user_id', referrerId)
          .eq('reference_id', usedCode.id)
          .eq('reference_type', 'selection_process_referral')
          .maybeSingle();

        if (txFetchError) {
          console.error('[Referral Reward] Failed to check existing transaction:', txFetchError);
        }

        if (!existingTx) {
          console.log('[Referral Reward] Crediting 180 MatriculaCoins to referrer...');
          const description = `Referral reward: Selection Process Fee paid by ${referredDisplayName}`;

          const { error: rewardError } = await supabase.rpc('add_credits_to_user', {
            user_id_param: referrerId,
            amount_param: 180,
            reference_id_param: usedCode.id,
            reference_type_param: 'selection_process_referral',
            description_param: description,
          });

          if (rewardError) {
            console.error('[Referral Reward] Failed to add credits:', rewardError);
          } else {
            console.log('[Referral Reward] 180 MatriculaCoins credited successfully');
          }
        } else {
          console.log('[Referral Reward] Transaction already exists. Skipping duplicate credit.');
        }
      } else {
        console.log('[Referral Reward] No used referral code found for this user.');
      }

      // Limpa carrinho
      const { error: cartError } = await supabase.from('user_cart').delete().eq('user_id', userId);
      if (cartError) throw new Error(`Failed to clear user_cart: ${cartError.message}`);

      // --- NOTIFICAÇÕES VIA WEBHOOK N8N ---
      try {
        console.log(`📤 [verify-stripe-session-selection-process-fee] Iniciando notificações...`)
        
        // Buscar dados do aluno (incluindo seller_referral_code)
        const { data: alunoData, error: alunoError } = await supabase
          .from('user_profiles')
          .select('full_name, email, seller_referral_code')
          .eq('user_id', userId)
          .single();
        
        if (alunoError || !alunoData) {
          console.error('[NOTIFICAÇÃO] Erro ao buscar dados do aluno:', alunoError);
          return corsResponse({ status: 'complete', message: 'Session verified and processed successfully.' }, 200);
        }

        // 1. NOTIFICAÇÃO PARA O ALUNO
        const alunoNotificationPayload = {
          tipo_notf: 'Pagamento de selection process confirmado',
          email_aluno: alunoData.email,
          nome_aluno: alunoData.full_name,
          o_que_enviar: `O pagamento da taxa de processo seletivo foi confirmado para ${alunoData.full_name}. Agora você pode selecionar as escolas para aplicar.`,
          payment_id: sessionId,
          fee_type: 'selection_process',
          amount: session.amount_total / 100,
          payment_method: "stripe"
        };
        
        console.log('[NOTIFICAÇÃO ALUNO] Enviando notificação para aluno:', alunoNotificationPayload);
        
        const alunoNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PostmanRuntime/7.36.3',
          },
          body: JSON.stringify(alunoNotificationPayload),
        });
        
        const alunoResult = await alunoNotificationResponse.text();
        console.log('[NOTIFICAÇÃO ALUNO] Resposta do n8n (aluno):', alunoNotificationResponse.status, alunoResult);

        // 2. NOTIFICAÇÃO PARA SELLER/ADMIN/AFFILIATE (se houver código de seller)
        console.log(`📤 [verify-stripe-session-selection-process-fee] DEBUG - alunoData.seller_referral_code:`, alunoData.seller_referral_code);
        
        if (alunoData.seller_referral_code) {
          console.log(`📤 [verify-stripe-session-selection-process-fee] Buscando seller através do seller_referral_code: ${alunoData.seller_referral_code}`);
          
          // Buscar informações do seller através do seller_referral_code
          console.log(`📤 [verify-stripe-session-selection-process-fee] Executando query: SELECT * FROM sellers WHERE referral_code = '${alunoData.seller_referral_code}'`);
          
          // Query simplificada para evitar erro de relacionamento
          const { data: sellerData, error: sellerError } = await supabase
            .from('sellers')
            .select(`
              id,
              user_id,
              name,
              email,
              referral_code,
              commission_rate,
              affiliate_admin_id
            `)
            .eq('referral_code', alunoData.seller_referral_code)
            .single();

          console.log(`📤 [verify-stripe-session-selection-process-fee] Resultado da busca do seller:`, { sellerData, sellerError });

          if (sellerData && !sellerError) {
            console.log(`📤 [verify-stripe-session-selection-process-fee] Seller encontrado:`, sellerData);

            // Buscar dados do affiliate_admin se houver
            let affiliateAdminData = { email: "", name: "Affiliate Admin" };
            if (sellerData.affiliate_admin_id) {
              console.log(`📤 [verify-stripe-session-selection-process-fee] Buscando affiliate_admin: ${sellerData.affiliate_admin_id}`);
              
              const { data: affiliateData, error: affiliateError } = await supabase
                .from('affiliate_admins')
                .select('user_id')
                .eq('id', sellerData.affiliate_admin_id)
                .single();

              if (affiliateData && !affiliateError) {
                const { data: affiliateProfile, error: profileError } = await supabase
                  .from('user_profiles')
                  .select('email, full_name')
                  .eq('user_id', affiliateData.user_id)
                  .single();

                if (affiliateProfile && !profileError) {
                  affiliateAdminData = {
                    email: affiliateProfile.email || "",
                    name: affiliateProfile.full_name || "Affiliate Admin"
                  };
                  console.log(`📤 [verify-stripe-session-selection-process-fee] Affiliate admin encontrado:`, affiliateAdminData);
                }
              }
            }

            // NOTIFICAÇÃO PARA ADMIN/SELLER/AFFILIATE
            const adminNotificationPayload = {
              tipo_notf: "Pagamento Stripe de selection process confirmado",
              email_admin: "admin@matriculausa.com",
              nome_admin: "Admin MatriculaUSA",
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              email_seller: sellerData.email,
              nome_seller: sellerData.name,
              email_affiliate_admin: affiliateAdminData.email,
              nome_affiliate_admin: affiliateAdminData.name,
              o_que_enviar: `Pagamento Stripe de selection process no valor de $${(session.amount_total / 100).toFixed(2)} do aluno ${alunoData.full_name} foi processado com sucesso. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
              payment_id: sessionId,
              fee_type: 'selection_process',
              amount: session.amount_total / 100,
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code,
              commission_rate: sellerData.commission_rate,
              payment_method: "stripe"
            };

            console.log('📧 [verify-stripe-session-selection-process-fee] Enviando notificação para admin/seller/affiliate:', adminNotificationPayload);

            const adminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PostmanRuntime/7.36.3',
              },
              body: JSON.stringify(adminNotificationPayload),
            });

            if (adminNotificationResponse.ok) {
              const adminResult = await adminNotificationResponse.text();
              console.log('📧 [verify-stripe-session-selection-process-fee] Notificação para admin/seller/affiliate enviada com sucesso:', adminResult);
            } else {
              const adminError = await adminNotificationResponse.text();
              console.error('📧 [verify-stripe-session-selection-process-fee] Erro ao enviar notificação para admin/seller/affiliate:', adminError);
            }
          } else {
            console.log(`📤 [verify-stripe-session-selection-process-fee] Seller não encontrado para seller_referral_code: ${alunoData.seller_referral_code}`);
          }
        } else {
          console.log(`📤 [verify-stripe-session-selection-process-fee] Nenhum seller_referral_code encontrado, não há seller para notificar`);
        }
      } catch (notifErr) {
        console.error('[NOTIFICAÇÃO] Erro ao notificar selection process via n8n:', notifErr);
      }
      // --- FIM DAS NOTIFICAÇÕES ---

      return corsResponse({ status: 'complete', message: 'Session verified and processed successfully.' }, 200);
    } else {
      console.log('Session not paid or complete.');
      return corsResponse({ message: 'Session not ready.', status: session.status }, 202);
    }
  } catch (error: any) {
    console.error(`--- CRITICAL ERROR in verify-stripe-session-selection-process-fee ---:`, error.message);
    return corsResponse({ error: 'An unexpected error occurred.', details: error.message }, 500);
  }
});