import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
// Import jsPDF for Deno environment
// @ts-ignore
import jsPDF from "https://esm.sh/jspdf@2.5.1?target=deno";
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const stripe = new Stripe(stripeSecret, {
  apiVersion: '2024-04-10',
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0'
  }
});
// Function to send term acceptance notification with PDF after successful payment
async function sendTermAcceptanceNotificationAfterPayment(userId, feeType) {
  try {
    console.log('[NOTIFICAÇÃO] Buscando dados do usuário para notificação...');
    // Get user profile data
    const { data: userProfile, error: userError } = await supabase.from('user_profiles').select('email, full_name, country, seller_referral_code').eq('user_id', userId).single();
    if (userError || !userProfile) {
      console.error('[NOTIFICAÇÃO] Erro ao buscar perfil do usuário:', userError);
      return;
    }
    // Get the most recent term acceptance for this user
    const { data: termAcceptance, error: termError } = await supabase.from('comprehensive_term_acceptance').select('term_id, accepted_at, ip_address, user_agent').eq('user_id', userId).eq('term_type', 'checkout_terms').order('accepted_at', {
      ascending: false
    }).limit(1).single();
    if (termError || !termAcceptance) {
      console.error('[NOTIFICAÇÃO] Erro ao buscar aceitação de termos:', termError);
      return;
    }
    // Get term content
    const { data: termData, error: termDataError } = await supabase.from('application_terms').select('title, content').eq('id', termAcceptance.term_id).single();
    if (termDataError || !termData) {
      console.error('[NOTIFICAÇÃO] Erro ao buscar conteúdo do termo:', termDataError);
      return;
    }
    // Get seller data if user has seller_referral_code
    let sellerData = null;
    if (userProfile.seller_referral_code) {
      const { data: sellerResult } = await supabase.from('sellers').select('name, email, referral_code, user_id, affiliate_admin_id').eq('referral_code', userProfile.seller_referral_code).single();
      if (sellerResult) {
        sellerData = sellerResult;
      }
    }
    // Get affiliate admin data if seller has affiliate_admin_id
    let affiliateAdminData = null;
    if (sellerData?.affiliate_admin_id) {
      const { data: affiliateResult } = await supabase.from('affiliate_admins').select('name, email').eq('id', sellerData.affiliate_admin_id).single();
      if (affiliateResult) {
        affiliateAdminData = {
          full_name: affiliateResult.name,
          email: affiliateResult.email
        };
      }
    }
    // Generate PDF for the term acceptance
    let pdfBlob = null;
    try {
      console.log('[NOTIFICAÇÃO] Gerando PDF para notificação...');
      // Create PDF document
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let currentY = margin;
      // Function to add wrapped text
      const addWrappedText = (text, x, y, maxWidth, fontSize = 12)=>{
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        for(let i = 0; i < lines.length; i++){
          if (y > pdf.internal.pageSize.getHeight() - margin) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(lines[i], x, y);
          y += fontSize * 0.6;
        }
        return y;
      };
      // PDF Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TERM ACCEPTANCE DOCUMENT', pageWidth / 2, currentY, {
        align: 'center'
      });
      currentY += 15;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('MatriculaUSA - Academic Management System', pageWidth / 2, currentY, {
        align: 'center'
      });
      currentY += 20;
      // Separator line
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;
      // Student Information
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('STUDENT INFORMATION', margin, currentY);
      currentY += 12;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      // Name
      pdf.setFont('helvetica', 'bold');
      pdf.text('Name:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(userProfile.full_name, margin + 30, currentY);
      currentY += 8;
      // Email
      pdf.setFont('helvetica', 'bold');
      pdf.text('Email:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(userProfile.email, margin + 30, currentY);
      currentY += 8;
      // Country
      if (userProfile.country) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Country:', margin, currentY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(userProfile.country, margin + 40, currentY);
        currentY += 8;
      }
      currentY += 10;
      // Term Information
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TERM ACCEPTANCE DETAILS', margin, currentY);
      currentY += 12;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      // Term Title
      pdf.setFont('helvetica', 'bold');
      pdf.text('Term Title:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      currentY = addWrappedText(termData.title, margin + 50, currentY, pageWidth - margin - 50, 11);
      currentY += 5;
      // Acceptance Date
      pdf.setFont('helvetica', 'bold');
      pdf.text('Accepted At:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(new Date(termAcceptance.accepted_at).toLocaleString(), margin + 50, currentY);
      currentY += 8;
      // IP Address
      pdf.setFont('helvetica', 'bold');
      pdf.text('IP Address:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(termAcceptance.ip_address || 'N/A', margin + 50, currentY);
      currentY += 8;
      // Generate PDF blob
      const pdfArrayBuffer = pdf.output('arraybuffer');
      pdfBlob = new Blob([
        pdfArrayBuffer
      ], {
        type: 'application/pdf'
      });
      console.log('[NOTIFICAÇÃO] PDF gerado com sucesso!');
    } catch (pdfError) {
      console.error('[NOTIFICAÇÃO] Erro ao gerar PDF:', pdfError);
      // Continue without PDF but log the error
      console.warn('[NOTIFICAÇÃO] Continuando sem PDF devido ao erro na geração');
      // Don't throw error to avoid breaking the payment process
    }
    // Prepare notification payload
    const webhookPayload = {
      tipo_notf: "Student Term Acceptance",
      email_admin: "admin@matriculausa.com",
      nome_admin: "Admin MatriculaUSA",
      email_aluno: userProfile.email,
      nome_aluno: userProfile.full_name,
      email_seller: sellerData?.email || "",
      nome_seller: sellerData?.name || "N/A",
      email_affiliate_admin: affiliateAdminData?.email || "",
      nome_affiliate_admin: affiliateAdminData?.full_name || "N/A",
      o_que_enviar: `Student ${userProfile.full_name} has accepted the Student Checkout Terms & Conditions and completed ${feeType} payment via Stripe. This shows the student is progressing through the enrollment process.`,
      term_title: termData.title,
      term_type: 'checkout_terms',
      accepted_at: termAcceptance.accepted_at,
      ip_address: termAcceptance.ip_address,
      student_country: userProfile.country,
      seller_id: sellerData?.user_id || "",
      referral_code: sellerData?.referral_code || "",
      affiliate_admin_id: sellerData?.affiliate_admin_id || ""
    };
    console.log('[NOTIFICAÇÃO] Enviando webhook com payload:', webhookPayload);
    
    let webhookResponse;
    if (pdfBlob) {
      // Send webhook notification with PDF
      const formData = new FormData();
      // Add each field individually for n8n to process correctly
      Object.entries(webhookPayload).forEach(([key, value])=>{
        formData.append(key, value !== null && value !== undefined ? value.toString() : '');
      });
      // Add PDF with descriptive filename
      const fileName = `term_acceptance_${userProfile.full_name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
      formData.append('pdf', pdfBlob, fileName);
      console.log('[NOTIFICAÇÃO] PDF anexado à notificação:', fileName);
      webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
        method: 'POST',
        body: formData
      });
    } else {
      // Send webhook notification without PDF
      console.log('[NOTIFICAÇÃO] Enviando notificação sem PDF devido ao erro na geração');
      webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PostmanRuntime/7.36.3'
        },
        body: JSON.stringify(webhookPayload)
      });
    }
    if (webhookResponse.ok) {
      console.log('[NOTIFICAÇÃO] Notificação enviada com sucesso!');
    } else {
      const errorText = await webhookResponse.text();
      console.warn('[NOTIFICAÇÃO] Erro ao enviar notificação:', webhookResponse.status, errorText);
    }
  } catch (error) {
    console.error('[NOTIFICAÇÃO] Erro ao enviar notificação de aceitação de termos:', error);
  // Don't throw error to avoid breaking the payment process
  }
}
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
  console.log('--- verify-stripe-session-selection-process-fee: Request received ---');
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
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log(`Session status: ${session.status}, Payment status: ${session.payment_status}`);
    } catch (stripeError) {
      console.error(`Stripe error retrieving session ${sessionId}:`, stripeError.message);
      return corsResponse({
        error: 'Session not found or invalid.',
        details: stripeError.message
      }, 404);
    }
    if (session.payment_status === 'paid' && session.status === 'complete') {
      const userId = session.client_reference_id;
      const applicationId = session.metadata?.application_id;
      console.log(`Processing successful payment. UserID: ${userId}, ApplicationID: ${applicationId}`);
      if (!userId) return corsResponse({
        error: 'User ID (client_reference_id) missing in session.'
      }, 400);
      // Atualiza perfil do usuário
      const { error: profileError } = await supabase.from('user_profiles').update({
        has_paid_selection_process_fee: true,
        selection_process_fee_payment_method: 'stripe'
      }).eq('user_id', userId);
      if (profileError) throw new Error(`Failed to update user_profiles: ${profileError.message}`);

      // Log the payment action
      try {
        const { data: userProfile } = await supabase.from('user_profiles').select('id, full_name').eq('user_id', userId).single();
        if (userProfile) {
          await supabase.rpc('log_student_action', {
            p_student_id: userProfile.id,
            p_action_type: 'fee_payment',
            p_action_description: `Selection Process Fee paid via Stripe (${sessionId})`,
            p_performed_by: userId,
            p_performed_by_type: 'student',
            p_metadata: {
              fee_type: 'selection_process',
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
      // Se houver applicationId, atualiza a aplicação
      if (applicationId) {
        const { error: updateError } = await supabase.from('scholarship_applications').update({
          status: 'selection_process_paid'
        }).eq('student_id', userId).eq('id', applicationId);
        if (updateError) throw new Error(`Failed to update application status for selection process fee: ${updateError.message}`);
      }
      // Verifica se o usuário utilizou algum código de referência
      const { data: usedCode, error: usedError } = await supabase.from('used_referral_codes').select('*').eq('user_id', userId).order('applied_at', {
        ascending: false
      }).limit(1).maybeSingle();
      if (usedError) {
        console.error('Error fetching used_referral_codes:', usedError);
      }
      if (usedCode && usedCode.referrer_id) {
        const referrerId = usedCode.referrer_id;
        console.log('[Referral Reward] Found referrer:', referrerId, 'affiliate_code:', usedCode.affiliate_code);
        // Obter nome/email do usuário que pagou (referred)
        let referredDisplayName = '';
        try {
          const { data: referredProfile } = await supabase.from('user_profiles').select('full_name').eq('user_id', userId).maybeSingle();
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
        const { error: upsertRefError } = await supabase.from('affiliate_referrals').upsert({
          referrer_id: referrerId,
          referred_id: userId,
          affiliate_code: usedCode.affiliate_code,
          payment_amount: Number(session.amount_total ? session.amount_total / 100 : 0),
          credits_earned: 180,
          status: 'completed',
          payment_session_id: sessionId,
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'referred_id'
        });
        if (upsertRefError) {
          console.error('[Referral Reward] Failed to upsert affiliate_referrals:', upsertRefError);
        }
        console.log('[Referral Reward] Crediting 180 MatriculaCoins to referrer...');
        const description = `Referral reward: Selection Process Fee paid by ${referredDisplayName}`;
        const { error: rewardError } = await supabase.rpc('add_coins_to_user_matricula', {
          user_id_param: referrerId,
          coins_to_add: 180,
          reason: description
        });
        if (rewardError) {
          console.error('[Referral Reward] Failed to add credits:', rewardError);
        } else {
          console.log('[Referral Reward] 180 MatriculaCoins credited successfully');
        }
      } else {
        console.log('[Referral Reward] No used referral code found for this user.');
      }
      // Limpa carrinho
      const { error: cartError } = await supabase.from('user_cart').delete().eq('user_id', userId);
      if (cartError) throw new Error(`Failed to clear user_cart: ${cartError.message}`);
      // --- NOTIFICAÇÕES VIA WEBHOOK N8N ---
      try {
        console.log(`📤 [verify-stripe-session-selection-process-fee] Iniciando notificações...`);
        // Buscar dados do aluno (incluindo seller_referral_code)
        const { data: alunoData, error: alunoError } = await supabase.from('user_profiles').select('full_name, email, seller_referral_code').eq('user_id', userId).single();
        if (alunoError || !alunoData) {
          console.error('[NOTIFICAÇÃO] Erro ao buscar dados do aluno:', alunoError);
          return corsResponse({
            status: 'complete',
            message: 'Session verified and processed successfully.'
          }, 200);
        }
        // Send term acceptance notification with PDF after successful payment
        try {
          console.log('[NOTIFICAÇÃO] Enviando notificação de aceitação de termos...');
          await sendTermAcceptanceNotificationAfterPayment(userId, 'selection_process');
          console.log('[NOTIFICAÇÃO] Notificação de aceitação de termos enviada com sucesso!');
        } catch (notificationError) {
          console.error('[NOTIFICAÇÃO] Erro ao enviar notificação de aceitação de termos:', notificationError);
        // Continue with other notifications even if term acceptance fails
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
            'User-Agent': 'PostmanRuntime/7.36.3'
          },
          body: JSON.stringify(alunoNotificationPayload)
        });
        const alunoResult = await alunoNotificationResponse.text();
        console.log('[NOTIFICAÇÃO ALUNO] Resposta do n8n (aluno):', alunoNotificationResponse.status, alunoResult);
        // 2. NOTIFICAÇÃO PARA SELLER/ADMIN/AFFILIATE (se houver código de seller)
        console.log(`📤 [verify-stripe-session-selection-process-fee] DEBUG - alunoData.seller_referral_code:`, alunoData.seller_referral_code);
        console.log(`📤 [verify-stripe-session-selection-process-fee] DEBUG - alunoData completo:`, alunoData);
        if (alunoData.seller_referral_code) {
          console.log(`📤 [verify-stripe-session-selection-process-fee] ✅ CÓDIGO SELLER ENCONTRADO! Buscando seller através do seller_referral_code: ${alunoData.seller_referral_code}`);
          // Buscar informações do seller através do seller_referral_code
          console.log(`📤 [verify-stripe-session-selection-process-fee] Executando query: SELECT * FROM sellers WHERE referral_code = '${alunoData.seller_referral_code}'`);
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
          console.log(`📤 [verify-stripe-session-selection-process-fee] Resultado da busca do seller:`, {
            sellerData,
            sellerError
          });
          if (sellerData && !sellerError) {
            console.log(`📤 [verify-stripe-session-selection-process-fee] ✅ SELLER ENCONTRADO! Dados:`, sellerData);
            // Buscar dados do affiliate_admin se houver
            let affiliateAdminData = {
              email: "",
              name: "Affiliate Admin",
              phone: ""
            };
            if (sellerData.affiliate_admin_id) {
              console.log(`📤 [verify-stripe-session-selection-process-fee] Buscando affiliate_admin: ${sellerData.affiliate_admin_id}`);
              const { data: affiliateData, error: affiliateError } = await supabase.from('affiliate_admins').select('user_id').eq('id', sellerData.affiliate_admin_id).single();
              if (affiliateData && !affiliateError) {
                const { data: affiliateProfile, error: profileError } = await supabase.from('user_profiles').select('email, full_name, phone').eq('user_id', affiliateData.user_id).single();
                if (affiliateProfile && !profileError) {
                  affiliateAdminData = {
                    email: affiliateProfile.email || "",
                    name: affiliateProfile.full_name || "Affiliate Admin",
                    phone: affiliateProfile.phone || ""
                  };
                  console.log(`📤 [verify-stripe-session-selection-process-fee] Affiliate admin encontrado:`, affiliateAdminData);
                }
              }
            }
            // NOTIFICAÇÕES SEPARADAS PARA ADMIN, SELLER E AFFILIATE ADMIN
            // 1. NOTIFICAÇÃO PARA ADMIN
            // Buscar telefone do admin (usando email admin@matriculausa.com)
            const { data: adminProfile, error: adminProfileError } = await supabase.from('user_profiles').select('phone').eq('email', 'admin@matriculausa.com').single();
            const adminPhone = adminProfile?.phone || "";
            const adminNotificationPayload = {
              tipo_notf: "Pagamento Stripe de selection process confirmado - Admin",
              email_admin: "admin@matriculausa.com",
              nome_admin: "Admin MatriculaUSA",
              phone_admin: adminPhone,
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              o_que_enviar: `Pagamento Stripe de selection process no valor de $${(session.amount_total / 100).toFixed(2)} do aluno ${alunoData.full_name} foi processado com sucesso. Seller responsável: ${sellerData.name} (${sellerData.referral_code}). Affiliate: ${affiliateAdminData.name}`,
              payment_id: sessionId,
              fee_type: 'selection_process',
              amount: session.amount_total / 100,
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code,
              commission_rate: sellerData.commission_rate,
              payment_method: "stripe",
              notification_type: "admin"
            };
            console.log('📧 [verify-stripe-session-selection-process-fee] ✅ ENVIANDO NOTIFICAÇÃO PARA ADMIN:', adminNotificationPayload);
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
              console.log('📧 [verify-stripe-session-selection-process-fee] Notificação para ADMIN enviada com sucesso:', adminResult);
            } else {
              const adminError = await adminNotificationResponse.text();
              console.error('📧 [verify-stripe-session-selection-process-fee] Erro ao enviar notificação para ADMIN:', adminError);
            }
            // 2. NOTIFICAÇÃO PARA SELLER
            // Buscar telefone do seller
            const { data: sellerProfile, error: sellerProfileError } = await supabase.from('user_profiles').select('phone').eq('user_id', sellerData.user_id).single();
            const sellerPhone = sellerProfile?.phone || "";
            const sellerNotificationPayload = {
              tipo_notf: "Pagamento Stripe de selection process confirmado - Seller",
              email_seller: sellerData.email,
              nome_seller: sellerData.name,
              phone_seller: sellerPhone,
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              o_que_enviar: `Parabéns! Seu aluno ${alunoData.full_name} pagou a taxa de selection process no valor de $${(session.amount_total / 100).toFixed(2)}. Sua comissão será calculada em breve.`,
              payment_id: sessionId,
              fee_type: 'selection_process',
              amount: session.amount_total / 100,
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code,
              commission_rate: sellerData.commission_rate,
              payment_method: "stripe",
              notification_type: "seller"
            };
            console.log('📧 [verify-stripe-session-selection-process-fee] ✅ ENVIANDO NOTIFICAÇÃO PARA SELLER:', sellerNotificationPayload);
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
              console.log('📧 [verify-stripe-session-selection-process-fee] Notificação para SELLER enviada com sucesso:', sellerResult);
            } else {
              const sellerError = await sellerNotificationResponse.text();
              console.error('📧 [verify-stripe-session-selection-process-fee] Erro ao enviar notificação para SELLER:', sellerError);
            }
            // 3. NOTIFICAÇÃO PARA AFFILIATE ADMIN (se houver)
            if (affiliateAdminData.email) {
              const affiliateNotificationPayload = {
                tipo_notf: "Pagamento Stripe de selection process confirmado - Affiliate Admin",
                email_affiliate_admin: affiliateAdminData.email,
                nome_affiliate_admin: affiliateAdminData.name,
                phone_affiliate_admin: affiliateAdminData.phone,
                email_aluno: alunoData.email,
                nome_aluno: alunoData.full_name,
                email_seller: sellerData.email,
                nome_seller: sellerData.name,
                o_que_enviar: `O seller ${sellerData.name} (${sellerData.referral_code}) do seu afiliado teve um pagamento de selection process no valor de $${(session.amount_total / 100).toFixed(2)} do aluno ${alunoData.full_name}.`,
                payment_id: sessionId,
                fee_type: 'selection_process',
                amount: session.amount_total / 100,
                seller_id: sellerData.user_id,
                referral_code: sellerData.referral_code,
                commission_rate: sellerData.commission_rate,
                payment_method: "stripe",
                notification_type: "affiliate_admin"
              };
              console.log('📧 [verify-stripe-session-selection-process-fee] ✅ ENVIANDO NOTIFICAÇÃO PARA AFFILIATE ADMIN:', affiliateNotificationPayload);
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
                console.log('📧 [verify-stripe-session-selection-process-fee] Notificação para AFFILIATE ADMIN enviada com sucesso:', affiliateResult);
              } else {
                const affiliateError = await affiliateNotificationResponse.text();
                console.error('📧 [verify-stripe-session-selection-process-fee] Erro ao enviar notificação para AFFILIATE ADMIN:', affiliateError);
              }
            } else {
              console.log('📧 [verify-stripe-session-selection-process-fee] Não há affiliate admin para notificar');
            }
          } else {
            console.log(`📤 [verify-stripe-session-selection-process-fee] ❌ SELLER NÃO ENCONTRADO para seller_referral_code: ${alunoData.seller_referral_code}`);
            console.log(`📤 [verify-stripe-session-selection-process-fee] ❌ ERRO na busca do seller:`, sellerError);
          }
        } else {
          console.log(`📤 [verify-stripe-session-selection-process-fee] ❌ NENHUM SELLER_REFERRAL_CODE encontrado, não há seller para notificar`);
        }
      } catch (notifErr) {
        console.error('[NOTIFICAÇÃO] Erro ao notificar selection process via n8n:', notifErr);
      }
      // --- FIM DAS NOTIFICAÇÕES ---
      return corsResponse({
        status: 'complete',
        message: 'Session verified and processed successfully.'
      }, 200);
    } else {
      console.log('Session not paid or complete.');
      return corsResponse({
        message: 'Session not ready.',
        status: session.status
      }, 202);
    }
  } catch (error) {
    console.error(`--- CRITICAL ERROR in verify-stripe-session-selection-process-fee ---:`, error.message);
    return corsResponse({
      error: 'An unexpected error occurred.',
      details: error.message
    }, 500);
  }
});
