import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getStripeConfig } from '../stripe-config.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
function corsResponse(body, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json'
  };
  if (status === 204) {
    return new Response(null, {
      status,
      headers
    });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers
    }
  });
}
Deno.serve(async (req)=>{
  console.log('--- verify-stripe-session-scholarship-fee: Request received ---');
  try {
    if (req.method === 'OPTIONS') return corsResponse(null, 204);
    if (req.method !== 'POST') return corsResponse({
      error: 'Method Not Allowed'
    }, 405);
    
    // Obter configuração do Stripe baseada no ambiente detectado
    const config = getStripeConfig(req);
    const stripe = new Stripe(config.secretKey, {
      apiVersion: '2024-04-10',
      appInfo: {
        name: 'MatriculaUSA Integration',
        version: '1.0.0'
      }
    });
    
    const { sessionId } = await req.json();
    if (!sessionId) return corsResponse({
      error: 'Session ID is required'
    }, 400);
    console.log(`Verifying session ID: ${sessionId}`);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(`Session status: ${session.status}, Payment status: ${session.payment_status}`);
    if (session.payment_status === 'paid' && session.status === 'complete') {
      const userId = session.client_reference_id;
      // scholarships_ids pode ser um array ou string separada por vírgula
      const scholarshipsIds = session.metadata?.scholarships_ids;
      console.log(`Processing successful payment. UserID: ${userId}, ScholarshipsIDs: ${scholarshipsIds}`);
      if (!userId) return corsResponse({
        error: 'User ID (client_reference_id) missing in session.'
      }, 400);
      if (!scholarshipsIds) return corsResponse({
        error: 'Scholarships IDs missing in session metadata.'
      }, 400);
      // Busca o perfil do usuário para obter o user_profiles.id correto
      const { data: userProfile, error: profileError } = await supabase.from('user_profiles').select('id, user_id').eq('user_id', userId).single();
      if (profileError || !userProfile) {
        console.error('User profile not found:', profileError);
        return corsResponse({
          error: 'User profile not found'
        }, 404);
      }
      console.log(`User profile found: ${userProfile.id} for auth user: ${userId}`);
      // Atualiza perfil do usuário para marcar que pagou a scholarship fee (usando userId para user_profiles)
      const { error: profileUpdateError } = await supabase.from('user_profiles').update({
        is_scholarship_fee_paid: true
      }).eq('user_id', userId);
      if (profileUpdateError) throw new Error(`Failed to update user_profiles: ${profileUpdateError.message}`);
      console.log('User profile updated - scholarship fee paid');

      // Registrar pagamento na tabela individual_fee_payments
      try {
        const paymentDate = new Date().toISOString();
        const paymentAmount = session.amount_total ? session.amount_total / 100 : 0;
        const paymentIntentId = session.payment_intent as string || '';
        
        console.log('[Individual Fee Payment] Recording scholarship fee payment...');
        const { data: insertResult, error: insertError } = await supabase.rpc('insert_individual_fee_payment', {
          p_user_id: userId,
          p_fee_type: 'scholarship',
          p_amount: paymentAmount,
          p_payment_date: paymentDate,
          p_payment_method: 'stripe',
          p_payment_intent_id: paymentIntentId,
          p_stripe_charge_id: null,
          p_zelle_payment_id: null
        });
        
        if (insertError) {
          console.warn('[Individual Fee Payment] Warning: Could not record fee payment:', insertError);
        } else {
          console.log('[Individual Fee Payment] Scholarship fee recorded successfully:', insertResult);
        }
      } catch (recordError) {
        console.warn('[Individual Fee Payment] Warning: Failed to record individual fee payment:', recordError);
        // Não quebra o fluxo - continua normalmente
      }

      // Atualiza status das aplicações relacionadas para 'approved' (usando userProfile.id)
      const scholarshipIdsArray = scholarshipsIds.split(',').map((id)=>id.trim());
      console.log(`Updating applications for student_id: ${userProfile.id}, scholarship_ids: ${scholarshipIdsArray}`);
      const { data: updatedApps, error: appError } = await supabase.from('scholarship_applications').update({
        status: 'approved',
        is_scholarship_fee_paid: true,
        scholarship_fee_payment_method: 'stripe'
      }).eq('student_id', userProfile.id).in('scholarship_id', scholarshipIdsArray).select('id');
      if (appError) throw new Error(`Failed to update scholarship_applications: ${appError.message}`);
      console.log('Scholarship applications updated to approved status');

      // Log the payment action
      try {
        await supabase.rpc('log_student_action', {
          p_student_id: userProfile.id,
          p_action_type: 'fee_payment',
          p_action_description: `Scholarship Fee paid via Stripe (${sessionId})`,
          p_performed_by: userId,
          p_performed_by_type: 'student',
          p_metadata: {
            fee_type: 'scholarship',
            payment_method: 'stripe',
            amount: session.amount_total / 100,
            session_id: sessionId,
            scholarship_ids: scholarshipIdsArray,
            updated_applications: updatedApps?.map(app => app.id) || []
          }
        });
      } catch (logError) {
        console.error('Failed to log payment action:', logError);
      }
      // --- NOTIFICAÇÕES VIA WEBHOOK N8N ---
      try {
        console.log(`📤 [verify-stripe-session-scholarship-fee] Iniciando notificações...`);
        // Buscar dados do aluno (incluindo seller_referral_code e phone)
        const { data: alunoData, error: alunoError } = await supabase.from('user_profiles').select('full_name, email, phone, seller_referral_code').eq('user_id', userId).single();
        // Buscar telefone do admin
        const { data: adminProfile, error: adminProfileError } = await supabase.from('user_profiles').select('phone').eq('email', 'admin@matriculausa.com').single();
        const adminPhone = adminProfile?.phone || "";
        if (alunoError || !alunoData) {
          console.error('[NOTIFICAÇÃO] Erro ao buscar dados do aluno:', alunoError);
          return corsResponse({
            status: 'complete',
            message: 'Session verified and processed successfully.'
          }, 200);
        }
        // Para cada scholarship, enviar notificações
        for (const scholarshipId of scholarshipIdsArray){
          try {
            // Buscar dados da bolsa
            const { data: scholarship, error: scholarshipError } = await supabase.from('scholarships').select('id, title, university_id').eq('id', scholarshipId).single();
            if (scholarshipError || !scholarship) continue;
            // Buscar dados da universidade
            const { data: universidade, error: univError } = await supabase.from('universities').select('id, name, contact').eq('id', scholarship.university_id).single();
            if (univError || !universidade) continue;
            const contact = universidade.contact || {};
            const emailUniversidade = contact.admissionsEmail || contact.email || '';
            // 1. NOTIFICAÇÃO PARA O ALUNO
            const mensagemAluno = `Parabéns! Você pagou a taxa de bolsa para "${scholarship.title}" da universidade ${universidade.name} e foi aprovado. Agora você pode prosseguir com a matrícula.`;
            const alunoNotificationPayload = {
              tipo_notf: 'Pagamento de taxa de bolsa confirmado',
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              phone_aluno: alunoData.phone || "",
              nome_bolsa: scholarship.title,
              nome_universidade: universidade.name,
              email_universidade: emailUniversidade,
              o_que_enviar: mensagemAluno,
              payment_amount: session.amount_total / 100,
              payment_method: 'stripe',
              payment_id: sessionId,
              fee_type: 'scholarship',
              notification_target: 'student'
            };
            console.log('[NOTIFICAÇÃO ALUNO] Enviando notificação para aluno:', alunoNotificationPayload);
            const alunoNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PostmanRuntime/7.36.3'
              },
              body: JSON.stringify(alunoNotificationPayload)
            });
            const alunoResult = await alunoNotificationResponse.text();
            console.log('[NOTIFICAÇÃO ALUNO] Resposta do n8n (aluno):', alunoNotificationResponse.status, alunoResult);
            // 2. NOTIFICAÇÃO PARA A UNIVERSIDADE
            const mensagemUniversidade = `O aluno ${alunoData.full_name} pagou a taxa de bolsa para "${scholarship.title}" da universidade ${universidade.name}. O aluno foi aprovado e pode prosseguir com a matrícula.`;
            const universidadeNotificationPayload = {
              tipo_notf: 'Pagamento de taxa de bolsa - Universidade',
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              nome_bolsa: scholarship.title,
              nome_universidade: universidade.name,
              email_universidade: emailUniversidade,
              o_que_enviar: mensagemUniversidade,
              payment_amount: session.amount_total / 100,
              payment_method: 'stripe',
              payment_id: sessionId,
              fee_type: 'scholarship',
              notification_target: 'university'
            };
            console.log('[NOTIFICAÇÃO UNIVERSIDADE] Enviando notificação para universidade:', universidadeNotificationPayload);
            const universidadeNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PostmanRuntime/7.36.3'
              },
              body: JSON.stringify(universidadeNotificationPayload)
            });
            const universidadeResult = await universidadeNotificationResponse.text();
            console.log('[NOTIFICAÇÃO UNIVERSIDADE] Resposta do n8n (universidade):', universidadeNotificationResponse.status, universidadeResult);
            // 3. NOTIFICAÇÃO PARA SELLER/ADMIN/AFFILIATE (se houver código de seller)
            console.log(`📤 [verify-stripe-session-scholarship-fee] DEBUG - alunoData.seller_referral_code:`, alunoData.seller_referral_code);
            if (alunoData.seller_referral_code) {
              console.log(`📤 [verify-stripe-session-scholarship-fee] Buscando seller através do seller_referral_code: ${alunoData.seller_referral_code}`);
              // Buscar informações do seller através do seller_referral_code
              const { data: sellerData, error: sellerError } = await supabase.from('sellers').select(`
                  id,
                  user_id,
                  name,
                  email,
                  referral_code,
                  commission_rate,
                  affiliate_admin_id
                `).eq('referral_code', alunoData.seller_referral_code).single();
              console.log(`📤 [verify-stripe-session-scholarship-fee] Resultado da busca do seller:`, {
                sellerData,
                sellerError
              });
              if (sellerData && !sellerError) {
                console.log(`📤 [verify-stripe-session-scholarship-fee] Seller encontrado:`, sellerData);
                // Buscar telefone do seller
                const { data: sellerProfile, error: sellerProfileError } = await supabase.from('user_profiles').select('phone').eq('user_id', sellerData.user_id).single();
                const sellerPhone = sellerProfile?.phone || "";
                // Buscar dados do affiliate_admin se houver
                let affiliateAdminData = {
                  email: "",
                  name: "Affiliate Admin",
                  phone: ""
                };
                if (sellerData.affiliate_admin_id) {
                  console.log(`📤 [verify-stripe-session-scholarship-fee] Buscando affiliate_admin: ${sellerData.affiliate_admin_id}`);
                  const { data: affiliateData, error: affiliateError } = await supabase.from('affiliate_admins').select('user_id').eq('id', sellerData.affiliate_admin_id).single();
                  if (affiliateData && !affiliateError) {
                    const { data: affiliateProfile, error: profileError } = await supabase.from('user_profiles').select('email, full_name, phone').eq('user_id', affiliateData.user_id).single();
                    if (affiliateProfile && !profileError) {
                      affiliateAdminData = {
                        email: affiliateProfile.email || "",
                        name: affiliateProfile.full_name || "Affiliate Admin",
                        phone: affiliateProfile.phone || ""
                      };
                      console.log(`📤 [verify-stripe-session-scholarship-fee] Affiliate admin encontrado:`, affiliateAdminData);
                    }
                  }
                }
                // 3.1. NOTIFICAÇÃO PARA O SELLER
                const sellerNotificationPayload = {
                  tipo_notf: "Pagamento Stripe de scholarship fee confirmado - Seller",
                  email_seller: sellerData.email,
                  nome_seller: sellerData.name,
                  phone_seller: sellerPhone,
                  email_aluno: alunoData.email,
                  nome_aluno: alunoData.full_name,
                  phone_aluno: alunoData.phone || "",
                  nome_bolsa: scholarship.title,
                  nome_universidade: universidade.name,
                  o_que_enviar: `Pagamento Stripe de scholarship fee no valor de $${(session.amount_total / 100).toFixed(2)} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Seu código de referência: ${sellerData.referral_code}`,
                  payment_id: sessionId,
                  fee_type: 'scholarship',
                  amount: session.amount_total / 100,
                  seller_id: sellerData.user_id,
                  referral_code: sellerData.referral_code,
                  commission_rate: sellerData.commission_rate,
                  payment_method: "stripe",
                  notification_target: 'seller'
                };
                console.log('📧 [verify-stripe-session-scholarship-fee] Enviando notificação para seller:', sellerNotificationPayload);
                const sellerNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'PostmanRuntime/7.36.3'
                  },
                  body: JSON.stringify(sellerNotificationPayload)
                });
                if (sellerNotificationResponse.ok) {
                  const sellerResult = await sellerNotificationResponse.text();
                  console.log('📧 [verify-stripe-session-scholarship-fee] Notificação para seller enviada com sucesso:', sellerResult);
                } else {
                  const sellerError = await sellerNotificationResponse.text();
                  console.error('📧 [verify-stripe-session-scholarship-fee] Erro ao enviar notificação para seller:', sellerError);
                }
                // 3.2. NOTIFICAÇÃO PARA O AFFILIATE ADMIN (se existir)
                if (affiliateAdminData.email) {
                  const affiliateNotificationPayload = {
                    tipo_notf: "Pagamento Stripe de scholarship fee confirmado - Affiliate Admin",
                    email_affiliate_admin: affiliateAdminData.email,
                    nome_affiliate_admin: affiliateAdminData.name,
                    phone_affiliate_admin: affiliateAdminData.phone,
                    email_aluno: alunoData.email,
                    nome_aluno: alunoData.full_name,
                    phone_aluno: alunoData.phone || "",
                    email_seller: sellerData.email,
                    nome_seller: sellerData.name,
                    phone_seller: sellerPhone,
                    nome_bolsa: scholarship.title,
                    nome_universidade: universidade.name,
                    o_que_enviar: `Pagamento Stripe de scholarship fee no valor de $${(session.amount_total / 100).toFixed(2)} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
                    payment_id: sessionId,
                    fee_type: 'scholarship',
                    amount: session.amount_total / 100,
                    seller_id: sellerData.user_id,
                    referral_code: sellerData.referral_code,
                    commission_rate: sellerData.commission_rate,
                    payment_method: "stripe",
                    notification_target: 'affiliate_admin'
                  };
                  console.log('📧 [verify-stripe-session-scholarship-fee] Enviando notificação para affiliate admin:', affiliateNotificationPayload);
                  const affiliateNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'User-Agent': 'PostmanRuntime/7.36.3'
                    },
                    body: JSON.stringify(affiliateNotificationPayload)
                  });
                  if (affiliateNotificationResponse.ok) {
                    const affiliateResult = await affiliateNotificationResponse.text();
                    console.log('📧 [verify-stripe-session-scholarship-fee] Notificação para affiliate admin enviada com sucesso:', affiliateResult);
                  } else {
                    const affiliateError = await affiliateNotificationResponse.text();
                    console.error('📧 [verify-stripe-session-scholarship-fee] Erro ao enviar notificação para affiliate admin:', affiliateError);
                  }
                }
                // 3.3. NOTIFICAÇÃO PARA O ADMIN
                const adminNotificationPayload = {
                  tipo_notf: "Pagamento Stripe de scholarship fee confirmado - Admin",
                  email_admin: "admin@matriculausa.com",
                  nome_admin: "Admin MatriculaUSA",
                  phone_admin: adminPhone,
                  email_aluno: alunoData.email,
                  nome_aluno: alunoData.full_name,
                  phone_aluno: alunoData.phone || "",
                  email_seller: sellerData.email,
                  nome_seller: sellerData.name,
                  phone_seller: sellerPhone,
                  email_affiliate_admin: affiliateAdminData.email,
                  nome_affiliate_admin: affiliateAdminData.name,
                  phone_affiliate_admin: affiliateAdminData.phone,
                  nome_bolsa: scholarship.title,
                  nome_universidade: universidade.name,
                  o_que_enviar: `Pagamento Stripe de scholarship fee no valor de $${(session.amount_total / 100).toFixed(2)} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
                  payment_id: sessionId,
                  fee_type: 'scholarship',
                  amount: session.amount_total / 100,
                  seller_id: sellerData.user_id,
                  referral_code: sellerData.referral_code,
                  commission_rate: sellerData.commission_rate,
                  payment_method: "stripe",
                  notification_target: 'admin'
                };
                console.log('📧 [verify-stripe-session-scholarship-fee] Enviando notificação para admin:', adminNotificationPayload);
                const adminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'PostmanRuntime/7.36.3'
                  },
                  body: JSON.stringify(adminNotificationPayload)
                });
                if (adminNotificationResponse.ok) {
                  const adminResult = await adminNotificationResponse.text();
                  console.log('📧 [verify-stripe-session-scholarship-fee] Notificação para admin enviada com sucesso:', adminResult);
                } else {
                  const adminError = await adminNotificationResponse.text();
                  console.error('📧 [verify-stripe-session-scholarship-fee] Erro ao enviar notificação para admin:', adminError);
                }
              } else {
                console.log(`📤 [verify-stripe-session-scholarship-fee] Seller não encontrado para seller_referral_code: ${alunoData.seller_referral_code}`);
              }
            } else {
              console.log(`📤 [verify-stripe-session-scholarship-fee] Nenhum seller_referral_code encontrado, não há seller para notificar`);
            }
          } catch (notifErr) {
            console.error('[NOTIFICAÇÃO] Erro ao notificar scholarship:', scholarshipId, notifErr);
          }
        }
      } catch (notifErr) {
        console.error('[NOTIFICAÇÃO] Erro geral ao notificar scholarship fee via n8n:', notifErr);
      }
      // --- FIM DAS NOTIFICAÇÕES ---
      // Limpa carrinho (opcional)
      const { error: cartError } = await supabase.from('user_cart').delete().eq('user_id', userId);
      if (cartError) throw new Error(`Failed to clear user_cart: ${cartError.message}`);
      return corsResponse({
        status: 'complete',
        message: 'Session verified and processed successfully.',
        application_ids: updatedApps?.map((app)=>app.id) || []
      }, 200);
    } else {
      console.log('Session not paid or complete.');
      return corsResponse({
        message: 'Session not ready.',
        status: session.status
      }, 202);
    }
  } catch (error) {
    console.error(`--- CRITICAL ERROR in verify-stripe-session-scholarship-fee ---:`, error.message);
    return corsResponse({
      error: 'An unexpected error occurred.',
      details: error.message
    }, 500);
  }
});
  