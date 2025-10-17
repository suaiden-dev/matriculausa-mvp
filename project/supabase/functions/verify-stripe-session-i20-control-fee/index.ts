// Função edge inicial para verificar sessão de pagamento do I-20 Control Fee
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
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid' && session.status === 'complete') {
      const userId = session.client_reference_id;
      const paymentIntentId = session.payment_intent;
      const paymentMethod = session.metadata?.payment_method || 'stripe';
      if (!userId) return corsResponse({
        error: 'User ID (client_reference_id) missing in session.'
      }, 400);
      // Atualiza user_profiles para marcar o pagamento do I-20 Control Fee
      const { error: profileError } = await supabase.from('user_profiles').update({
        has_paid_i20_control_fee: true,
        i20_control_fee_payment_method: paymentMethod,
        i20_control_fee_due_date: new Date().toISOString(),
        i20_control_fee_payment_intent_id: paymentIntentId
      }).eq('user_id', userId);
      if (profileError) throw new Error(`Failed to update user_profiles: ${profileError.message}`);

      // Registrar pagamento na tabela individual_fee_payments
      try {
        const paymentDate = new Date().toISOString();
        const paymentAmount = session.amount_total ? session.amount_total / 100 : 0;
        
        console.log('[Individual Fee Payment] Recording i20_control fee payment...');
        const { data: insertResult, error: insertError } = await supabase.rpc('insert_individual_fee_payment', {
          p_user_id: userId,
          p_fee_type: 'i20_control',
          p_amount: paymentAmount,
          p_payment_date: paymentDate,
          p_payment_method: paymentMethod,
          p_payment_intent_id: paymentIntentId as string || null,
          p_stripe_charge_id: null,
          p_zelle_payment_id: null
        });
        
        if (insertError) {
          console.warn('[Individual Fee Payment] Warning: Could not record fee payment:', insertError);
        } else {
          console.log('[Individual Fee Payment] I20 control fee recorded successfully:', insertResult);
        }
      } catch (recordError) {
        console.warn('[Individual Fee Payment] Warning: Failed to record individual fee payment:', recordError);
        // Não quebra o fluxo - continua normalmente
      }

      // Log the payment action
      try {
        const { data: userProfile } = await supabase.from('user_profiles').select('id, full_name').eq('user_id', userId).single();
        if (userProfile) {
          await supabase.rpc('log_student_action', {
            p_student_id: userProfile.id,
            p_action_type: 'fee_payment',
            p_action_description: `I-20 Control Fee paid via Stripe (${sessionId})`,
            p_performed_by: userId,
            p_performed_by_type: 'student',
            p_metadata: {
              fee_type: 'i20_control',
              payment_method: paymentMethod,
              amount: session.amount_total / 100,
              session_id: sessionId,
              payment_intent_id: paymentIntentId
            }
          });
        }
      } catch (logError) {
        console.error('Failed to log payment action:', logError);
      }
      // Buscar o application_id mais recente do usuário
      const { data: userProfile } = await supabase.from('user_profiles').select('id').eq('user_id', userId).single();
      console.log('[I20ControlFee] userId do Stripe:', userId);
      console.log('[I20ControlFee] userProfile encontrado:', userProfile);
      let applicationId = null;
      if (userProfile && userProfile.id) {
        const { data: applications } = await supabase.from('scholarship_applications').select('id').eq('student_id', userProfile.id).order('created_at', {
          ascending: false
        }).limit(1);
        console.log('[I20ControlFee] applications encontradas:', applications);
        if (applications && applications.length > 0) {
          applicationId = applications[0].id;
        }
      }
      // --- NOTIFICAÇÕES VIA WEBHOOK N8N ---
      try {
        console.log(`📤 [verify-stripe-session-i20-control-fee] Iniciando notificações...`);
        // Buscar dados do aluno (incluindo seller_referral_code)
        const { data: alunoData, error: alunoError } = await supabase.from('user_profiles').select('full_name, email, phone, seller_referral_code').eq('user_id', userId).single();
        // Buscar telefone do admin
        const { data: adminProfile, error: adminProfileError } = await supabase.from('user_profiles').select('phone').eq('email', 'admin@matriculausa.com').single();
        const adminPhone = adminProfile?.phone || "";
        if (alunoError || !alunoData) {
          console.error('[NOTIFICAÇÃO] Erro ao buscar dados do aluno:', alunoError);
          return corsResponse({
            status: 'complete',
            message: 'Session verified and processed successfully.',
            application_id: applicationId
          }, 200);
        }
        // 1. NOTIFICAÇÃO PARA O ALUNO
        const alunoNotificationPayload = {
          tipo_notf: 'Pagamento de I-20 control fee confirmado',
          email_aluno: alunoData.email,
          nome_aluno: alunoData.full_name,
          phone_aluno: alunoData.phone || "",
          o_que_enviar: `O pagamento da taxa de controle I-20 foi confirmado para ${alunoData.full_name}. Seu documento I-20 será processado e enviado em breve.`,
          payment_id: sessionId,
          fee_type: 'i20_control_fee',
          amount: session.amount_total / 100,
          payment_method: paymentMethod
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
        // 2. NOTIFICAÇÃO PARA SELLER/ADMIN/AFFILIATE (se houver código de seller)
        console.log(`📤 [verify-stripe-session-i20-control-fee] DEBUG - alunoData.seller_referral_code:`, alunoData.seller_referral_code);
        console.log(`📤 [verify-stripe-session-i20-control-fee] DEBUG - alunoData completo:`, alunoData);
        if (alunoData.seller_referral_code) {
          console.log(`📤 [verify-stripe-session-i20-control-fee] ✅ CÓDIGO SELLER ENCONTRADO! Buscando seller através do seller_referral_code: ${alunoData.seller_referral_code}`);
          // Buscar informações do seller através do seller_referral_code
          console.log(`📤 [verify-stripe-session-i20-control-fee] Executando query: SELECT * FROM sellers WHERE referral_code = '${alunoData.seller_referral_code}'`);
          // Query simplificada para evitar erro de relacionamento
          const { data: sellerData, error: sellerError } = await supabase.from('sellers').select(`
              id,
              user_id,
              name,
              email,
              referral_code,
              commission_rate,
              affiliate_admin_id
            `).eq('referral_code', alunoData.seller_referral_code).single();
          console.log(`📤 [verify-stripe-session-i20-control-fee] Resultado da busca do seller:`, {
            sellerData,
            sellerError
          });
          if (sellerData && !sellerError) {
            const { data: sellerProfile, error: sellerProfileError } = await supabase.from('user_profiles').select('phone').eq('user_id', sellerData.user_id).single();
            const sellerPhone = sellerProfile?.phone;

            console.log(`📤 [verify-stripe-session-i20-control-fee] ✅ SELLER ENCONTRADO! Dados:`, sellerData);
            // Buscar dados do affiliate_admin se houver
            let affiliateAdminData = {
              email: "",
              name: "Affiliate Admin"
            };
            if (sellerData.affiliate_admin_id) {
              console.log(`📤 [verify-stripe-session-i20-control-fee] Buscando affiliate_admin: ${sellerData.affiliate_admin_id}`);
              const { data: affiliateData, error: affiliateError } = await supabase.from('affiliate_admins').select('user_id').eq('id', sellerData.affiliate_admin_id).single();
              if (affiliateData && !affiliateError) {
                const { data: affiliateProfile, error: profileError } = await supabase.from('user_profiles').select('email, full_name').eq('user_id', affiliateData.user_id).single();
                if (affiliateProfile && !profileError) {
                  affiliateAdminData = {
                    email: affiliateProfile.email || "",
                    name: affiliateProfile.full_name || "Affiliate Admin"
                  };
                  console.log(`📤 [verify-stripe-session-i20-control-fee] Affiliate admin encontrado:`, affiliateAdminData);
                }
              }
            }
            // NOTIFICAÇÕES SEPARADAS PARA ADMIN, SELLER E AFFILIATE ADMIN
            // 1. NOTIFICAÇÃO PARA ADMIN
            const adminNotificationPayload = {
              tipo_notf: "Pagamento Stripe de I-20 control fee confirmado - Admin",
              email_admin: "admin@matriculausa.com",
              nome_admin: "Admin MatriculaUSA",
              phone_admin: adminPhone,
              email_seller: sellerData.email,
              nome_seller: sellerData.name,
              phone_seller: sellerPhone || "",
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              phone_aluno: alunoData.phone || "",
              email_affiliate_admin: affiliateAdminData.email,
              nome_affiliate_admin: affiliateAdminData.name,
              phone_affiliate_admin: (await (async ()=>{ try { const { data: a, error: e } = await supabase.from('user_profiles').select('phone').eq('email', affiliateAdminData.email).single(); return a?.phone || "" } catch { return "" } })()),
              o_que_enviar: `Pagamento Stripe de I-20 control fee no valor de ${(session.amount_total / 100).toFixed(2)} do aluno ${alunoData.full_name} foi processado com sucesso. Seller responsável: ${sellerData.name} (${sellerData.referral_code}). Affiliate: ${affiliateAdminData.name}`,
              payment_id: sessionId,
              fee_type: 'i20_control_fee',
              amount: session.amount_total / 100,
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code,
              commission_rate: sellerData.commission_rate,
              payment_method: paymentMethod,
              notification_type: "admin"
            };
            console.log('📧 [verify-stripe-session-i20-control-fee] ✅ ENVIANDO NOTIFICAÇÃO PARA ADMIN:', adminNotificationPayload);
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
              console.log('📧 [verify-stripe-session-i20-control-fee] Notificação para ADMIN enviada com sucesso:', adminResult);
            } else {
              const adminError = await adminNotificationResponse.text();
              console.error('📧 [verify-stripe-session-i20-control-fee] Erro ao enviar notificação para ADMIN:', adminError);
            }
            // 2. NOTIFICAÇÃO PARA SELLER
            const sellerNotificationPayload = {
              tipo_notf: "Pagamento Stripe de I-20 control fee confirmado - Seller",
              email_seller: sellerData.email,
              nome_seller: sellerData.name,
              phone_seller: sellerPhone || "",
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              phone_aluno: alunoData.phone || "",
              o_que_enviar: `Parabéns! Seu aluno ${alunoData.full_name} pagou a taxa de I-20 control fee no valor de ${(session.amount_total / 100).toFixed(2)}. O documento I-20 será processado em breve.`,
              payment_id: sessionId,
              fee_type: 'i20_control_fee',
              amount: session.amount_total / 100,
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code,
              commission_rate: sellerData.commission_rate,
              payment_method: paymentMethod,
              notification_type: "seller"
            };
            console.log('📧 [verify-stripe-session-i20-control-fee] ✅ ENVIANDO NOTIFICAÇÃO PARA SELLER:', sellerNotificationPayload);
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
              console.log('📧 [verify-stripe-session-i20-control-fee] Notificação para SELLER enviada com sucesso:', sellerResult);
            } else {
              const sellerError = await sellerNotificationResponse.text();
              console.error('📧 [verify-stripe-session-i20-control-fee] Erro ao enviar notificação para SELLER:', sellerError);
            }
            // 3. NOTIFICAÇÃO PARA AFFILIATE ADMIN (se houver)
            if (affiliateAdminData.email) {
              const affiliateNotificationPayload = {
                tipo_notf: "Pagamento Stripe de I-20 control fee confirmado - Affiliate Admin",
                email_affiliate_admin: affiliateAdminData.email,
                nome_affiliate_admin: affiliateAdminData.name,
                phone_affiliate_admin: (await (async ()=>{ try { const { data: a, error: e } = await supabase.from('user_profiles').select('phone').eq('email', affiliateAdminData.email).single(); return a?.phone || "" } catch { return "" } })()),
                email_aluno: alunoData.email,
                nome_aluno: alunoData.full_name,
                phone_aluno: alunoData.phone || "",
                email_seller: sellerData.email,
                nome_seller: sellerData.name,
                phone_seller: sellerPhone || "",
                o_que_enviar: `O seller ${sellerData.name} (${sellerData.referral_code}) do seu afiliado teve um pagamento de I-20 control fee no valor de ${(session.amount_total / 100).toFixed(2)} do aluno ${alunoData.full_name}.`,
                payment_id: sessionId,
                fee_type: 'i20_control_fee',
                amount: session.amount_total / 100,
                seller_id: sellerData.user_id,
                referral_code: sellerData.referral_code,
                commission_rate: sellerData.commission_rate,
                payment_method: paymentMethod,
                notification_type: "affiliate_admin"
              };
              console.log('📧 [verify-stripe-session-i20-control-fee] ✅ ENVIANDO NOTIFICAÇÃO PARA AFFILIATE ADMIN:', affiliateNotificationPayload);
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
                console.log('📧 [verify-stripe-session-i20-control-fee] Notificação para AFFILIATE ADMIN enviada com sucesso:', affiliateResult);
              } else {
                const affiliateError = await affiliateNotificationResponse.text();
                console.error('📧 [verify-stripe-session-i20-control-fee] Erro ao enviar notificação para AFFILIATE ADMIN:', affiliateError);
              }
            } else {
              console.log('📧 [verify-stripe-session-i20-control-fee] Não há affiliate admin para notificar');
            }
          } else {
            console.log(`📤 [verify-stripe-session-i20-control-fee] ❌ SELLER NÃO ENCONTRADO para seller_referral_code: ${alunoData.seller_referral_code}`);
            console.log(`📤 [verify-stripe-session-i20-control-fee] ❌ ERRO na busca do seller:`, sellerError);
          }
        } else {
          console.log(`📤 [verify-stripe-session-i20-control-fee] ❌ NENHUM SELLER_REFERRAL_CODE encontrado, não há seller para notificar`);
        }
      } catch (notifErr) {
        console.error('[NOTIFICAÇÃO] Erro ao notificar I-20 control fee via n8n:', notifErr);
      }
      // --- FIM DAS NOTIFICAÇÕES ---
      return corsResponse({
        status: 'complete',
        message: 'Session verified and processed successfully.',
        application_id: applicationId
      }, 200);
    } else {
      return corsResponse({
        message: 'Session not ready.',
        status: session.status
      }, 202);
    }
  } catch (error) {
    console.error(`--- CRITICAL ERROR in verify-stripe-session-i20-control-fee ---:`, error.message);
    return corsResponse({
      error: 'An unexpected error occurred.',
      details: error.message
    }, 500);
  }
});
