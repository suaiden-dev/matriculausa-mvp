import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const stripe = new Stripe(stripeSecret, {
  apiVersion: '2024-04-10',
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0'
  }
});
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
  console.log('--- verify-stripe-session-application-fee: Request received ---');
  console.log('--- TESTE: Edge Function funcionando ---');
  try {
    if (req.method === 'OPTIONS') return corsResponse(null, 204);
    if (req.method !== 'POST') return corsResponse({
      error: 'Method Not Allowed'
    }, 405);
    const { sessionId } = await req.json();
    if (!sessionId) return corsResponse({
      error: 'Session ID is required'
    }, 400);
    console.log(`Verifying session ID: ${sessionId}`);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(`Session status: ${session.status}, Payment status: ${session.payment_status}`);
    console.log('Session metadata:', session.metadata);
    if (session.payment_status === 'paid' && session.status === 'complete') {
      const userId = session.client_reference_id;
      const applicationId = session.metadata?.application_id;
      console.log(`Processing successful payment. UserID: ${userId}, ApplicationID: ${applicationId}`);
      if (!userId) return corsResponse({
        error: 'User ID (client_reference_id) missing in session.'
      }, 400);
      if (!applicationId) return corsResponse({
        error: 'Application ID missing in session metadata.'
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
      // Verifica se a aplicação existe e pertence ao usuário (usando userProfile.id)
      const { data: application, error: fetchError } = await supabase.from('scholarship_applications').select('id, student_id, scholarship_id, student_process_type, status').eq('id', applicationId).eq('student_id', userProfile.id).single();
      if (fetchError || !application) {
        console.error('Application not found:', fetchError);
        return corsResponse({
          error: 'Application not found or access denied'
        }, 404);
      }
      console.log('Application found:', application);
      // Preparar dados para atualização
      const updateData = {
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        is_application_fee_paid: true,
        application_fee_payment_method: 'stripe'
      };
      // Preservar o status atual se já estiver 'approved' (universidade já aprovou)
      console.log(`[verify-stripe-session-application-fee] Current application status: '${application.status}' for user ${userId}, application ${applicationId}.`);
      if (application.status !== 'approved') {
        updateData.status = 'under_review';
        console.log(`[verify-stripe-session-application-fee] Application status set to 'under_review' for user ${userId}, application ${applicationId}.`);
      } else {
        console.log(`[verify-stripe-session-application-fee] Preserving 'approved' status for user ${userId}, application ${applicationId} (university already approved).`);
      }
      // Se student_process_type não existe na aplicação, tentar obter dos metadados da sessão
      if (!application.student_process_type && session.metadata?.student_process_type) {
        updateData.student_process_type = session.metadata.student_process_type;
        console.log('Adding student_process_type from session metadata:', session.metadata.student_process_type);
      }
      // Atualiza a aplicação
      const { error: updateError } = await supabase.from('scholarship_applications').update(updateData).eq('id', applicationId).eq('student_id', userProfile.id);
      if (updateError) {
        console.error('Failed to update application status:', updateError);
        throw new Error(`Failed to update application status: ${updateError.message}`);
      }
      if (updateData.status) {
        console.log(`Application status updated to '${updateData.status}' with payment info`);
      } else {
        console.log('Application payment info updated (status preserved)');
      }
      // Buscar documentos do user_profiles e vincular à application (usando userId para user_profiles)
      const { data: userProfileDocs, error: userProfileError } = await supabase.from('user_profiles').select('documents').eq('user_id', userId).single();
      if (userProfileError) {
        console.error('Failed to fetch user profile documents:', userProfileError);
      } else if (userProfileDocs?.documents) {
        const documents = Array.isArray(userProfileDocs.documents) ? userProfileDocs.documents : [];
        let formattedDocuments = documents;
        // Se for array de strings (URLs), converter para array de objetos completos
        if (documents.length > 0 && typeof documents[0] === 'string') {
          const docTypes = [
            'passport',
            'diploma',
            'funds_proof'
          ];
          formattedDocuments = documents.map((url, idx)=>({
              type: docTypes[idx] || `doc${idx + 1}`,
              url,
              uploaded_at: new Date().toISOString()
            }));
        }
        if (formattedDocuments.length > 0) {
          const { error: docUpdateError } = await supabase.from('scholarship_applications').update({
            documents: formattedDocuments
          }).eq('id', applicationId).eq('student_id', userProfile.id);
          if (docUpdateError) {
            console.error('Failed to update application documents:', docUpdateError);
          } else {
            console.log('Application documents updated');
          }
        }
      }
      // Atualiza perfil do usuário para marcar que pagou a application fee
      const { error: profileUpdateError } = await supabase.from('user_profiles').update({
        is_application_fee_paid: true,
        last_payment_date: new Date().toISOString()
      }).eq('user_id', userId);
      if (profileUpdateError) {
        console.error('Failed to update user_profiles:', profileUpdateError);
        throw new Error(`Failed to update user_profiles: ${profileUpdateError.message}`);
      }
      console.log('User profile updated - application fee paid');
      // Limpa carrinho
      const { error: cartError } = await supabase.from('user_cart').delete().eq('user_id', userId);
      if (cartError) {
        console.error('Failed to clear user_cart:', cartError);
      } else {
        console.log('User cart cleared');
      }
      // --- NOTIFICAÇÕES VIA WEBHOOK N8N ---
      try {
        console.log(`📤 [verify-stripe-session-application-fee] Iniciando notificações...`);
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
        // Buscar dados da aplicação (já temos application.scholarship_id)
        const scholarshipId = application.scholarship_id;
        // Buscar dados da bolsa
        const { data: scholarship, error: scholarshipError } = await supabase.from('scholarships').select('id, title, university_id').eq('id', scholarshipId).single();
        if (scholarshipError || !scholarship) throw new Error('Bolsa não encontrada para notificação');
        // Buscar dados da universidade
        const { data: universidade, error: univError } = await supabase.from('universities').select('id, name, contact').eq('id', scholarship.university_id).single();
        if (univError || !universidade) throw new Error('Universidade não encontrada para notificação');
        const contact = universidade.contact || {};
        const emailUniversidade = contact.admissionsEmail || contact.email || '';
        // 1. NOTIFICAÇÃO PARA O ALUNO
        const mensagemAluno = `O aluno ${alunoData.full_name} selecionou a bolsa "${scholarship.title}" da universidade ${universidade.name} e pagou a taxa de aplicação. Acesse o painel para revisar a candidatura.`;
        const alunoNotificationPayload = {
          tipo_notf: 'Novo pagamento de application fee',
          email_aluno: alunoData.email,
          nome_aluno: alunoData.full_name,
          phone_aluno: alunoData.phone || "",
          nome_bolsa: scholarship.title,
          nome_universidade: universidade.name,
          email_universidade: emailUniversidade,
          o_que_enviar: mensagemAluno,
          payment_amount: session.metadata?.amount || '10',
          payment_method: 'stripe',
          payment_id: sessionId,
          fee_type: 'application',
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
        const mensagemUniversidade = `O aluno ${alunoData.full_name} pagou a taxa de aplicação de $${session.metadata?.amount || '10'} via Stripe para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Acesse o painel para revisar a candidatura.`;
        const universidadeNotificationPayload = {
          tipo_notf: 'Notificação para Universidade - Pagamento de Application Fee',
          email_aluno: alunoData.email,
          nome_aluno: alunoData.full_name,
          phone_aluno: alunoData.phone || "",
          nome_bolsa: scholarship.title,
          nome_universidade: universidade.name,
          email_universidade: emailUniversidade,
          o_que_enviar: mensagemUniversidade,
          payment_amount: session.metadata?.amount || '10',
          payment_method: 'stripe',
          payment_id: sessionId,
          fee_type: 'application',
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
        console.log(`📤 [verify-stripe-session-application-fee] DEBUG - alunoData.seller_referral_code:`, alunoData.seller_referral_code);
        if (alunoData.seller_referral_code) {
          console.log(`📤 [verify-stripe-session-application-fee] Buscando seller através do seller_referral_code: ${alunoData.seller_referral_code}`);
          // Buscar informações do seller através do seller_referral_code
          console.log(`📤 [verify-stripe-session-application-fee] Executando query: SELECT * FROM sellers WHERE referral_code = '${alunoData.seller_referral_code}'`);
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
          console.log(`📤 [verify-stripe-session-application-fee] Resultado da busca do seller:`, {
            sellerData,
            sellerError
          });
          if (sellerData && !sellerError) {
            console.log(`📤 [verify-stripe-session-application-fee] Seller encontrado:`, sellerData);
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
              console.log(`📤 [verify-stripe-session-application-fee] Buscando affiliate_admin: ${sellerData.affiliate_admin_id}`);
              const { data: affiliateData, error: affiliateError } = await supabase.from('affiliate_admins').select('user_id').eq('id', sellerData.affiliate_admin_id).single();
              if (affiliateData && !affiliateError) {
                const { data: affiliateProfile, error: profileError } = await supabase.from('user_profiles').select('email, full_name, phone').eq('user_id', affiliateData.user_id).single();
                if (affiliateProfile && !profileError) {
                  affiliateAdminData = {
                    email: affiliateProfile.email || "",
                    name: affiliateProfile.full_name || "Affiliate Admin",
                    phone: affiliateProfile.phone || ""
                  };
                  console.log(`📤 [verify-stripe-session-application-fee] Affiliate admin encontrado:`, affiliateAdminData);
                }
              }
            }
            // 3.1. NOTIFICAÇÃO PARA O SELLER
            const sellerNotificationPayload = {
              tipo_notf: "Pagamento Stripe de application fee confirmado - Seller",
              email_seller: sellerData.email,
              nome_seller: sellerData.name,
              phone_seller: sellerPhone,
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              phone_aluno: alunoData.phone || "",
              nome_bolsa: scholarship.title,
              nome_universidade: universidade.name,
              o_que_enviar: `Pagamento Stripe de application fee no valor de $${session.metadata?.amount || '10'} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Seu código de referência: ${sellerData.referral_code}`,
              payment_id: sessionId,
              fee_type: 'application',
              amount: session.metadata?.amount || '10',
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code,
              commission_rate: sellerData.commission_rate,
              payment_method: "stripe",
              notification_target: 'seller'
            };
            console.log('📧 [verify-stripe-session-application-fee] Enviando notificação para seller:', sellerNotificationPayload);
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
              console.log('📧 [verify-stripe-session-application-fee] Notificação para seller enviada com sucesso:', sellerResult);
            } else {
              const sellerError = await sellerNotificationResponse.text();
              console.error('📧 [verify-stripe-session-application-fee] Erro ao enviar notificação para seller:', sellerError);
            }
            // 3.2. NOTIFICAÇÃO PARA O AFFILIATE ADMIN (se existir)
            if (affiliateAdminData.email) {
              const affiliateNotificationPayload = {
                tipo_notf: "Pagamento Stripe de application fee confirmado - Affiliate Admin",
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
                o_que_enviar: `Pagamento Stripe de application fee no valor de $${session.metadata?.amount || '10'} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
                payment_id: sessionId,
                fee_type: 'application',
                amount: session.metadata?.amount || '10',
                seller_id: sellerData.user_id,
                referral_code: sellerData.referral_code,
                commission_rate: sellerData.commission_rate,
                payment_method: "stripe",
                notification_target: 'affiliate_admin'
              };
              console.log('📧 [verify-stripe-session-application-fee] Enviando notificação para affiliate admin:', affiliateNotificationPayload);
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
                console.log('📧 [verify-stripe-session-application-fee] Notificação para affiliate admin enviada com sucesso:', affiliateResult);
              } else {
                const affiliateError = await affiliateNotificationResponse.text();
                console.error('📧 [verify-stripe-session-application-fee] Erro ao enviar notificação para affiliate admin:', affiliateError);
              }
            }
            // 3.3. NOTIFICAÇÃO PARA O ADMIN
            const adminNotificationPayload = {
              tipo_notf: "Pagamento Stripe de application fee confirmado - Admin",
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
              o_que_enviar: `Pagamento Stripe de application fee no valor de $${session.metadata?.amount || '10'} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
              payment_id: sessionId,
              fee_type: 'application',
              amount: session.metadata?.amount || '10',
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code,
              commission_rate: sellerData.commission_rate,
              payment_method: "stripe",
              notification_target: 'admin'
            };
            console.log('📧 [verify-stripe-session-application-fee] Enviando notificação para admin:', adminNotificationPayload);
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
              console.log('📧 [verify-stripe-session-application-fee] Notificação para admin enviada com sucesso:', adminResult);
            } else {
              const adminError = await adminNotificationResponse.text();
              console.error('📧 [verify-stripe-session-application-fee] Erro ao enviar notificação para admin:', adminError);
            }
          } else {
            console.log(`📤 [verify-stripe-session-application-fee] Seller não encontrado para seller_referral_code: ${alunoData.seller_referral_code}`);
          }
        } else {
          console.log(`📤 [verify-stripe-session-application-fee] Nenhum seller_referral_code encontrado, não há seller para notificar`);
        }
      } catch (notifErr) {
        console.error('[NOTIFICAÇÃO] Erro ao notificar application fee via n8n:', notifErr);
      }

      try {
        const { data: userProfile } = await supabase.from('user_profiles').select('id, full_name').eq('user_id', userId).single();
        if (userProfile) {
          await supabase.rpc('log_student_action', {
            p_student_id: userProfile.id,
            p_action_type: 'fee_payment',
            p_action_description: `Application Fee paid via Stripe (${sessionId})`,
            p_performed_by: userId,
            p_performed_by_type: 'student',
            p_metadata: {
              fee_type: 'application',
              payment_method: 'stripe',
              amount: session.amount_total / 100,
              session_id: sessionId,
              application_id: applicationId
            }
          });
        }
      } catch (logError) {
        console.error('Failed to log payment action:', logError);
      }
      // --- FIM DAS NOTIFICAÇÕES ---
      return corsResponse({
        status: 'complete',
        message: 'Session verified and processed successfully.',
        applicationId: applicationId,
        studentProcessType: application.student_process_type || session.metadata?.student_process_type
      }, 200);
    } else {
      console.log('Session not paid or complete.');
      return corsResponse({
        message: 'Session not ready.',
        status: session.status
      }, 202);
    }
  } catch (error) {
    console.error(`--- CRITICAL ERROR in verify-stripe-session-application-fee ---:`, error.message);
    return corsResponse({
      error: 'An unexpected error occurred.',
      details: error.message
    }, 500);
  }
});
