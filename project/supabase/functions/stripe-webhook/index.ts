import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getStripeConfig } from '../stripe-config.ts';
import { getAllWebhookSecrets, getStripeEnvironmentVariables } from '../shared/environment-detector.ts';
// Import jsPDF for Deno environment
// @ts-ignore
import jsPDF from "https://esm.sh/jspdf@2.5.1?target=deno";

// Configurações do MailerSend (REMOVIDAS - usando apenas webhook n8n)
// const mailerSendApiKey = Deno.env.get('MAILERSEND_API_KEY');
// const mailerSendUrl = 'https://api.mailersend.com/v1/email';
// const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@matriculausa.com';
// const fromName = Deno.env.get('FROM_NAME') || 'MatriculaUSA';
// const companyName = Deno.env.get('COMPANY_NAME') || 'MatriculaUSA';
// const companyWebsite = Deno.env.get('COMPANY_WEBSITE') || 'https://matriculausa.com';
// const companyLogo = Deno.env.get('COMPANY_LOGO') || 'https://matriculausa.com/logo.png';
const supportEmail = Deno.env.get('SUPPORT_EMAIL') || 'support@matriculausa.com';
if (!supportEmail) {
  throw new Error('Missing required environment variable: SUPPORT_EMAIL');
}
// Configurações adicionais para templates de email
const companyName = Deno.env.get('COMPANY_NAME') || 'Matrícula USA';
const companyWebsite = Deno.env.get('COMPANY_WEBSITE') || 'https://matriculausa.com/';
const companyLogo = Deno.env.get('COMPANY_LOGO') || 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/logo%20matriculaUSA.jpg';

const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
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
      const { data: affiliateResult } = await supabase.from('affiliate_admins').select('full_name, email').eq('id', sellerData.affiliate_admin_id).single();
      if (affiliateResult) {
        affiliateAdminData = affiliateResult;
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
      // Don't continue without PDF as it's required for this notification
      throw new Error('Failed to generate PDF for term acceptance notification');
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
      o_que_enviar: `Student ${userProfile.full_name} has accepted the ${termData.title} and completed ${feeType} payment. This shows the student is progressing through the enrollment process.`,
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
    // Send webhook notification with PDF (always required for term acceptance)
    if (!pdfBlob) {
      throw new Error('PDF is required for term acceptance notification but was not generated');
    }
    const formData = new FormData();
    // Add each field individually for n8n to process correctly
    Object.entries(webhookPayload).forEach(([key, value])=>{
      formData.append(key, value !== null && value !== undefined ? value.toString() : '');
    });
    // Add PDF with descriptive filename
    const fileName = `term_acceptance_${userProfile.full_name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
    formData.append('pdf', pdfBlob, fileName);
    console.log('[NOTIFICAÇÃO] PDF anexado à notificação:', fileName);
    const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
      method: 'POST',
      body: formData
    });
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
// Função para enviar e-mail via MailerSend (REMOVIDA - usando apenas webhook n8n)
// async function sendEmail(paymentData: {
//   eventType: 'payment_success' | 'payment_failed';
//   userEmail: string;
//   userName: string;
//   paymentAmount: number;
//   paymentType: string;
//   sessionId: string;
//   origin: string;
// }) {
//   try {
//     console.log('[MailerSend] Enviando e-mail:', paymentData);
//     
//     let subject = '';
//     let htmlContent = '';
//     
//     if (paymentData.eventType === 'payment_success') {
//       switch (paymentData.paymentType) {
//         case 'selection_process':
//           subject = 'Payment successful - Selective process';
//           htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Payment successful - Selective process</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9f9f9;color:#333}.wrapper{max-width:600px;margin:0 auto;background-color:#fff}.header{background-color:#0052cc;padding:20px;text-align:center}.header img{max-width:120px;height:auto}.content{padding:20px}.footer{padding:15px;background-color:#f0f0f0;text-align:center;font-size:12px;color:#777}a{color:#0052cc;text-decoration:none}@media screen and (max-width:600px){.wrapper{width:100%!important}}</style></head><body><div class="wrapper"><div class="header"><img src="' + companyLogo + '" alt="' + companyName + '" style="max-width:120px;height:auto;"></div><div class="content"><strong>🎓 Payment successful - Selective process</strong><br><br><p>Hello ' + paymentData.userName + ',</p><p>Your payment was successfully processed.</p><p>📚 The next step is to select the schools to which you want to apply for enrollment.</p><p>This step is essential to proceed with your application.</p><p><strong>Please do not reply to this email.</strong></p><br><p>Best regards,<br><strong>' + companyName + '</strong><br><a href="' + companyWebsite + '">' + companyWebsite + '</a></p></div><div class="footer">You are receiving this message because you registered on the ' + companyName + ' platform.<br>© 2025 ' + companyName + '. All rights reserved.</div></div></body></html>';
//           break;
//         case 'application_fee':
//           subject = 'Application Fee Payment Confirmed';
//           htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Application Fee Payment Confirmed</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9f9f9;color:#333}.wrapper{max-width:600px;margin:0 auto;background-color:#fff}.header{background-color:#0052cc;padding:20px;text-align:center}.header img{max-width:120px;height:auto}.content{padding:20px}.footer{padding:15px;background-color:#f0f0f0;text-align:center;font-size:12px;color:#777}a{color:#0052cc;text-decoration:none}@media screen and (max-width:600px){.wrapper{width:100%!important}}</style></head><body><div class="wrapper"><div class="header"><img src="' + companyLogo + '" alt="' + companyName + '" style="max-width:120px;height:auto;"></div><div class="content"><strong>✅ Application Fee Payment Confirmed</strong><br><br><p>Hello ' + paymentData.userName + ',</p><p>Your application fee payment was successful.</p><p>To continue, please pay the Scholarship Fee to advance your application process.</p><p><strong>Please do not reply to this email.</strong></p><br><p>Best regards,<br><strong>' + companyName + '</strong><br><a href="' + companyWebsite + '">' + companyWebsite + '</a></p></div><div class="footer">You are receiving this message because you registered on the ' + companyName + ' platform.<br>© 2025 ' + companyName + '. All rights reserved.</div></div></body></html>';
//           break;
//         case 'scholarship_fee':
//           subject = 'Scholarship Fee Payment Confirmed';
//           htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Scholarship Fee Payment Confirmed</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9f9f9;color:#333}.wrapper{max-width:600px;margin:0 auto;background-color:#fff}.header{background-color:#0052cc;padding:20px;text-align:center}.header img{max-width:120px;height:auto}.content{padding:20px}.footer{padding:15px;background-color:#f0f0f0;text-align:center;font-size:12px;color:#777}a{color:#0052cc;text-decoration:none}@media screen and (max-width:600px){.wrapper{width:100%!important}}</style></head><body><div class="wrapper"><div class="header"><img src="' + companyLogo + '" alt="' + companyName + '" style="max-width:120px;height:auto;"></div><div class="content"><strong>🎓 Scholarship Fee Payment Confirmed</strong><br><br><p>Hello ' + paymentData.userName + ',</p><p>Your scholarship fee payment was successful.</p><p>The university will now analyze your application. You will be notified by email once a decision is made.</p><p><strong>Please do not reply to this email.</strong></p><br><p>Best regards,<br><strong>' + companyName + '</strong><br><a href="' + companyWebsite + '">' + companyWebsite + '</a></p></div><div class="footer">You are receiving this message because you registered on the ' + companyName + ' platform.<br>© 2025 ' + companyName + '. All rights reserved.</div></div></body></html>';
//           break;
//         case 'i20_control_fee':
//           subject = 'I-20 Control Fee Payment Confirmed';
//           htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>I-20 Control Fee Payment Confirmed</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9f9f9;color:#333}.wrapper{max-width:600px;margin:0 auto;background-color:#fff}.header{background-color:#0052cc;padding:20px;text-align:center}.header img{max-width:120px;height:auto}.content{padding:20px}.footer{padding:15px;background-color:#f0f0f0;text-align:center;font-size:12px;color:#777}a{color:#0052cc;text-decoration:none}@media screen and (max-width:600px){.wrapper{width:100%!important}}</style></head><body><div class="wrapper"><div class="header"><img src="' + companyLogo + '" alt="' + companyName + '" style="max-width:120px;height:auto;"></div><div class="content"><strong>📄 I-20 Control Fee Payment Confirmed</strong><br><br><p>Hello ' + paymentData.userName + ',</p><p>Your I-20 control fee payment was successful.</p><p>Your I-20 document will be processed and sent to you soon. Please monitor your email for updates.</p><p><strong>Please do not reply to this email.</strong></p><br><p>Best regards,<br><strong>' + companyName + '</strong><br><a href="' + companyWebsite + '">' + companyWebsite + '</a></p></div><div class="footer">You are receiving this message because you registered on the ' + companyName + ' platform.<br>© 2025 ' + companyName + '. All rights reserved.</div></div></body></html>';
//           break;
//         default:
//           subject = 'Payment successful';
//           htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Payment successful</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9f9f9;color:#333}.wrapper{max-width:600px;margin:0 auto;background-color:#fff}.header{background-color:#0052cc;padding:20px;text-align:center}.header img{max-width:120px;height:auto}.content{padding:20px}.footer{padding:15px;background-color:#f0f0f0;text-align:center;font-size:12px;color:#777}a{color:#0052cc;text-decoration:none}@media screen and (max-width:600px){.wrapper{width:100%!important}}</style></head><body><div class="wrapper"><div class="header"><img src="' + companyLogo + '" alt="' + companyName + '" style="max-width:120px;height:auto;"></div><div class="content"><strong>💳 Payment successful</strong><br><br><p>Hello ' + paymentData.userName + ',</p><p>Your payment was successfully processed.</p><p><strong>Please do not reply to this email.</strong></p><br><p>Best regards,<br><strong>' + companyName + '</strong><br><a href="' + companyWebsite + '">' + companyWebsite + '</a></p></div><div class="footer">You are receiving this message because you registered on the ' + companyName + ' platform.<br>© 2025 ' + companyName + '. All rights reserved.</div></div></body></html>';
//       }
//     } else {
//       subject = 'Payment failed – Action required';
//       htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Payment failed – Action required</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9f9f9;color:#333}.wrapper{max-width:600px;margin:0 auto;background-color:#fff}.header{background-color:#0052cc;padding:20px;text-align:center}.header img{max-width:120px;height:auto}.content{padding:20px}.footer{padding:15px;background-color:#f0f0f0;text-align:center;font-size:12px;color:#777}a{color:#0052cc;text-decoration:none}@media screen and (max-width:600px){.wrapper{width:100%!important}}</style></head><body><div class="wrapper"><div class="header"><img src="' + companyLogo + '" alt="' + companyName + '" style="max-width:120px;height:auto;"></div><div class="content"><strong>❗ Payment failed – Action required</strong><br><br><p>Hello ' + paymentData.userName + ',</p><p>Unfortunately, we were not able to complete your payment.</p><p>This may have occurred due to an issue with your card or payment provider.</p><p>To resolve this, please contact our support team so we can assist you directly.</p><p>💬 <strong><a href="' + companyWebsite + 'support">Click here to talk to our team</a></strong></p><p>We\'re here to help you complete your enrollment process.</p><p><strong>Please do not reply to this email.</strong></p><br><p>Best regards,<br><strong>' + companyName + '</strong><br><a href="' + companyWebsite + '">' + companyWebsite + '</a></p></div><div class="footer">You are receiving this message because you registered on the ' + companyName + ' platform.<br>© 2025 ' + companyName + '. All rights reserved.</div></div></body></html>';
//     }
//     
//     const response = await fetch(mailerSendUrl, {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${mailerSendApiKey}`,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         from: { email: fromEmail, name: fromName },
//         to: [{ email: paymentData.userEmail, name: paymentData.userName }],
//         subject,
//         html: htmlContent,
//       }),
//     });
//     console.log('[MailerSend] Status da resposta:', response.status, response.statusText);
//     // Só tenta fazer .json() se o status não for 202 e houver corpo
//     let result = null;
//     if (response.status !== 202) {
//       try {
//       result = await response.json();
//       } catch (e) {
//         console.warn('[MailerSend] Corpo da resposta não é JSON:', e);
//       }
//     }
//     return result;
//   } catch (error) {
//     console.error('[MailerSend] Erro ao enviar e-mail:', error);
//     // Não vamos falhar o webhook por causa do e-mail
//     return null;
//   }
// }
// Função para buscar dados do usuário
async function getUserData(userId) {
  try {
    const { data, error } = await supabase.from('user_profiles').select('full_name, email').eq('user_id', userId).single();
    if (error) {
      console.error('[getUserData] Erro ao buscar dados do usuário:', error);
      return {
        email: '',
        name: 'Usuário'
      };
    }
    return {
      email: data.email || '',
      name: data.full_name || 'Usuário'
    };
  } catch (error) {
    console.error('[getUserData] Erro inesperado:', error);
    return {
      email: '',
      name: 'Usuário'
    };
  }
}
// Função para verificar assinatura Stripe (IMPLEMENTAÇÃO MANUAL CORRETA)
async function verifyStripeSignature(body, signature, secret) {
  try {
    if (!signature) {
      console.error('[stripe-webhook] Assinatura Stripe ausente!');
      return false;
    }
    // Step 1: Extract timestamp and signatures from header
    const elements = signature.split(',');
    let timestamp = '';
    let v1Signature = '';
    for (const element of elements){
      const [prefix, value] = element.split('=');
      if (prefix === 't') {
        timestamp = value;
      } else if (prefix === 'v1') {
        v1Signature = value;
      }
    }
    if (!timestamp || !v1Signature) {
      console.error('[stripe-webhook] Formato de assinatura inválido:', signature);
      return false;
    }
    // Step 2: Create signed_payload string
    const signedPayload = `${timestamp}.${body}`;
    // Step 3: Compute HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {
      name: 'HMAC',
      hash: 'SHA-256'
    }, false, [
      'sign'
    ]);
    const signedData = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const expectedSignature = Array.from(new Uint8Array(signedData)).map((b)=>b.toString(16).padStart(2, '0')).join('');
    // Step 4: Compare signatures (constant-time comparison)
    const isValid = expectedSignature === v1Signature;
    if (!isValid) {
      console.error('[stripe-webhook] Assinatura Stripe inválida!');
      console.error('[stripe-webhook] Esperada:', expectedSignature);
      console.error('[stripe-webhook] Recebida:', v1Signature);
    } else {
      console.log('[stripe-webhook] Assinatura Stripe verificada com sucesso!');
    }
    return isValid;
  } catch (err) {
    console.error('[stripe-webhook] Erro ao verificar assinatura Stripe:', err);
    return false;
  }
}
// Função principal do webhook
Deno.serve(async (req)=>{
  try {
    const sig = req.headers.get('stripe-signature');
    const body = await req.text();
    
    // Tentar verificar com todos os webhook secrets disponíveis
    const allSecrets = getAllWebhookSecrets();
    let validConfig = null;
    let isValid = false;
    
    console.log(`[stripe-webhook] Tentando verificar assinatura com ${allSecrets.length} secrets disponíveis...`);
    
    for (const { env, secret } of allSecrets) {
      isValid = await verifyStripeSignature(body, sig, secret);
      if (isValid) {
        console.log(`✅ Assinatura verificada com sucesso usando ambiente: ${env}`);
        validConfig = { environment: env, secret };
        break;
      }
    }
    
    if (!isValid || !validConfig) {
      console.error('❌ Webhook signature verification failed with all available secrets');
      return new Response(JSON.stringify({
        error: 'Webhook signature verification failed.'
      }), {
        status: 400
      });
    }
    
    // Obter configuração completa do Stripe para o ambiente correto
    const envInfo = {
      environment: validConfig.environment,
      isProduction: validConfig.environment === 'production',
      isStaging: validConfig.environment === 'staging',
      isTest: validConfig.environment === 'test'
    };
    
    const stripeVars = getStripeEnvironmentVariables(envInfo);
    const stripe = new Stripe(stripeVars.secretKey, {
      appInfo: {
        name: 'MatriculaUSA Integration',
        version: '1.0.0'
      }
    });

    console.log(`🔧 Using Stripe in ${validConfig.environment} mode`);
    // Parse o evento manualmente
    let event;
    try {
      event = JSON.parse(body);
    } catch (err) {
      console.error('[stripe-webhook] Erro ao fazer parse do body:', err);
      return new Response(JSON.stringify({
        error: 'Invalid JSON.'
      }), {
        status: 400
      });
    }
    // Log detalhado do evento
    console.log('[stripe-webhook] 🔍 Evento recebido:', event.type);
    console.log('[stripe-webhook] 🔍 Event ID:', event.id);
    console.log('[stripe-webhook] 🔍 Event data keys:', Object.keys(event.data || {}));
    
    // Processar eventos de checkout para cartões e PIX
    if (event.type === 'checkout.session.completed') {
      console.log('[stripe-webhook] Processando checkout.session.completed...');
      return await handleCheckoutSessionCompleted(event.data.object, stripe);
    } else if (event.type === 'checkout.session.async_payment_succeeded') {
      console.log('[stripe-webhook] Processando checkout.session.async_payment_succeeded (PIX)...');
      console.log('[PIX] 🎉 PIX pago com sucesso!');
      console.log('[PIX] 🆔 Session ID:', event.data.object.id);
      console.log('[PIX] 💰 Valor pago:', event.data.object.amount_total);
      console.log('[PIX] 💱 Moeda:', event.data.object.currency);
      console.log('[PIX] 🔗 Success URL:', event.data.object.success_url);
      console.log('[PIX] 📊 Payment Status:', event.data.object.payment_status);
      console.log('[PIX] 📊 Session Status:', event.data.object.status);
      return await handleCheckoutSessionCompleted(event.data.object, stripe);
    } else if (event.type === 'checkout.session.async_payment_failed') {
      console.log('[stripe-webhook] Processando checkout.session.async_payment_failed (PIX falhou)...');
      return await handleCheckoutSessionFailed(event.data.object);
    } else if (event.type === 'payment_intent.succeeded') {
      console.log('[stripe-webhook] Processando payment_intent.succeeded...');
      
      // Para PIX, payment_intent.succeeded é o evento principal de confirmação
      const paymentIntent = event.data.object;
      console.log('[stripe-webhook] Payment Intent details:', {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount_received: paymentIntent.amount_received,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        payment_method_types: paymentIntent.payment_method_types
      });
      
      // Verificar se é PIX
      const isPixPayment = paymentIntent.payment_method_types?.includes('pix');
      
      if (isPixPayment && paymentIntent.status === 'succeeded' && paymentIntent.amount_received > 0) {
        console.log('[stripe-webhook] 🎉 PIX pago com sucesso via payment_intent.succeeded!');
        console.log('[stripe-webhook] 💰 Valor recebido:', paymentIntent.amount_received);
        console.log('[stripe-webhook] 💱 Moeda:', paymentIntent.currency);
        
        // Buscar a sessão de checkout correspondente para processar o pagamento
        try {
          const sessions = await stripe.checkout.sessions.list({
            payment_intent: paymentIntent.id,
            limit: 1
          });
          
          if (sessions.data.length > 0) {
            const session = sessions.data[0];
            console.log('[stripe-webhook] 🔗 Sessão encontrada:', session.id);
            
            // Verificar se esta sessão já foi processada para evitar duplicação
            // Verificar tanto por checkout_session_processed quanto por fee_payment
            const { data: existingCheckoutLog } = await supabase
              .from('student_action_logs')
              .select('id')
              .eq('action_type', 'checkout_session_processed')
              .eq('metadata->>session_id', session.id)
              .single();
            
            const { data: existingFeeLog } = await supabase
              .from('student_action_logs')
              .select('id')
              .eq('action_type', 'fee_payment')
              .eq('metadata->>session_id', session.id)
              .single();
            
            if (existingCheckoutLog || existingFeeLog) {
              console.log(`[DUPLICAÇÃO] Session ${session.id} já foi processada via checkout.session.completed, ignorando payment_intent.succeeded para evitar duplicação.`);
              return new Response(JSON.stringify({
                received: true,
                message: 'Session already processed via checkout.session.completed'
              }), {
                status: 200
              });
            }
            
            return await handleCheckoutSessionCompleted(session, stripe);
          } else {
            console.log('[stripe-webhook] ⚠️ Nenhuma sessão encontrada para o Payment Intent:', paymentIntent.id);
            return new Response(JSON.stringify({
              received: true,
              message: 'Payment Intent processado mas sessão não encontrada'
            }), {
              status: 200
            });
          }
        } catch (stripeError) {
          console.error('[stripe-webhook] Erro ao buscar sessão:', stripeError);
          return new Response(JSON.stringify({
            received: true,
            message: `Erro ao processar payment_intent.succeeded: ${stripeError.message}`
          }), {
            status: 200
          });
        }
      } else {
        console.log('[stripe-webhook] Ignorando payment_intent.succeeded (não é PIX ou não foi pago)');
        return new Response(JSON.stringify({
          received: true,
          message: 'payment_intent.succeeded ignorado (não é PIX pago)'
        }), {
          status: 200
        });
      }
    } else {
      console.log(`[stripe-webhook] Evento não suportado: ${event.type}`);
      return new Response(JSON.stringify({
        received: true,
        message: `Evento não suportado: ${event.type}`
      }), {
        status: 200
      });
    }
  } catch (err) {
    console.error('[stripe-webhook] Erro inesperado no handler:', err);
    return new Response(JSON.stringify({
      error: 'Internal server error.'
    }), {
      status: 500
    });
  }
});
// Função para processar falhas de PIX
// Função auxiliar para determinar moeda e símbolo baseado na session do Stripe
function getCurrencyInfo(session) {
  const currency = session.currency?.toLowerCase() || 'usd';
  const isPix = session.payment_method_types?.includes('pix') || session.metadata?.payment_method === 'pix';
  
  // Se for PIX ou currency for BRL, usar Real
  if (currency === 'brl' || isPix) {
    return {
      currency: 'BRL',
      symbol: 'R$',
      code: 'brl'
    };
  }
  
  // Caso contrário, usar Dólar
  return {
    currency: 'USD',
    symbol: '$',
    code: 'usd'
  };
}

// Função auxiliar para formatar valor com moeda
function formatAmountWithCurrency(amount, session) {
  const currencyInfo = getCurrencyInfo(session);
  return `${currencyInfo.symbol}${amount.toFixed(2)}`;
}

async function handleCheckoutSessionFailed(session) {
  console.log('[stripe-webhook] handleCheckoutSessionFailed called with session:', JSON.stringify(session, null, 2));
  const metadata = session.metadata || {};
  const userId = metadata?.user_id || metadata?.student_id;
  console.log('[stripe-webhook] PIX payment failed for user:', userId);
  // Log da falha do pagamento
  if (userId) {
    try {
      const { data: userProfile } = await supabase.from('user_profiles').select('id').eq('user_id', userId).single();
      if (userProfile) {
        await supabase.rpc('log_student_action', {
          p_student_id: userProfile.id,
          p_action_type: 'pix_payment_failed',
          p_action_description: `PIX payment failed for session ${session.id}`,
          p_performed_by: userId,
          p_performed_by_type: 'admin',
          p_metadata: {
            session_id: session.id,
            payment_method: 'pix',
            fee_type: metadata.fee_type
          }
        });
      }
    } catch (logError) {
      console.error('[stripe-webhook] Failed to log PIX payment failure:', logError);
    }
  }
  return new Response(JSON.stringify({
    received: true,
    message: 'PIX payment failure processed'
  }), {
    status: 200
  });
}
// Função para processar checkout.session.completed
async function handleCheckoutSessionCompleted(session, stripe) {
  console.log('[stripe-webhook] handleCheckoutSessionCompleted called with session:', JSON.stringify(session, null, 2));
  const stripeData = session;
  console.log('[stripe-webhook] stripeData:', JSON.stringify(stripeData, null, 2));
  
  // ✅ VERIFICAÇÃO CRÍTICA: Só processar se o pagamento foi realmente realizado
  if (session.payment_status !== 'paid') {
    // Para PIX, verificar se o pagamento foi realmente realizado consultando o Stripe
    const isPixPayment = session.payment_method_types?.includes('pix') || session.metadata?.payment_method === 'pix';
    
    if (isPixPayment && session.payment_intent) {
      console.log(`[stripe-webhook] 🔍 PIX detectado com payment_status: ${session.payment_status}, verificando status real no Stripe...`);
      
      try {
        // Consultar o Payment Intent diretamente no Stripe para verificar o status real
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
        console.log(`[stripe-webhook] 📊 Payment Intent status:`, {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount_received: paymentIntent.amount_received,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency
        });
        
        // Se o Payment Intent está pago, processar mesmo com payment_status unpaid
        if (paymentIntent.status === 'succeeded' && paymentIntent.amount_received > 0) {
          console.log(`[stripe-webhook] ✅ PIX realmente pago! Payment Intent status: ${paymentIntent.status}, amount_received: ${paymentIntent.amount_received}`);
          // Continuar com o processamento
        } else {
          console.log(`[stripe-webhook] ❌ PIX não foi pago. Payment Intent status: ${paymentIntent.status}`);
          return new Response(JSON.stringify({
            received: true,
            message: `PIX payment not completed (Payment Intent status: ${paymentIntent.status})`
          }), {
            status: 200
          });
        }
      } catch (stripeError) {
        console.error(`[stripe-webhook] Erro ao consultar Payment Intent:`, stripeError);
        return new Response(JSON.stringify({
          received: true,
          message: `Error checking payment status: ${stripeError.message}`
        }), {
          status: 200
        });
      }
    } else {
      console.log(`[stripe-webhook] ⚠️ Pagamento não foi realizado (payment_status: ${session.payment_status}), ignorando processamento`);
      console.log(`[stripe-webhook] 📊 Detalhes da sessão:`, {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        payment_method_types: session.payment_method_types,
        payment_intent: session.payment_intent,
        metadata: session.metadata
      });
      return new Response(JSON.stringify({
        received: true,
        message: `Payment not completed (status: ${session.payment_status})`
      }), {
        status: 200
      });
    }
  }
  
  // Verificar se já foi processado para evitar duplicação
  const sessionId = session.id;
  const { data: existingLog } = await supabase
    .from('student_action_logs')
    .select('id')
    .eq('action_type', 'checkout_session_processed')
    .eq('metadata->>session_id', sessionId)
    .single();
    
  if (existingLog) {
    console.log('[stripe-webhook] Session já foi processada, ignorando duplicação:', sessionId);
    return new Response(JSON.stringify({
      received: true,
      message: 'Session already processed'
    }), {
      status: 200
    });
  }
  
  // Criar log ANTES de processar para evitar duplicação em chamadas simultâneas
  const metadata = stripeData.metadata || {};
  const userId = metadata?.user_id || metadata?.student_id;
  if (userId) {
    try {
      const { data: userProfile } = await supabase.from('user_profiles').select('id').eq('user_id', userId).single();
      if (userProfile) {
        const { error: logError } = await supabase.rpc('log_student_action', {
          p_student_id: userProfile.id,
          p_action_type: 'checkout_session_processed',
          p_action_description: `Checkout session processing started: ${sessionId}`,
          p_performed_by: userId,
          p_performed_by_type: 'admin',
          p_metadata: {
            session_id: sessionId,
            payment_method: metadata?.payment_method || 'stripe',
            fee_type: metadata.fee_type,
            processing_started: true
          }
        });
        
        if (logError) {
          console.error('[DUPLICAÇÃO] Erro ao criar log:', logError);
          // Se falhar ao criar log, verificar novamente se já existe (race condition)
          const { data: recheckLog } = await supabase
            .from('student_action_logs')
            .select('id')
            .eq('action_type', 'checkout_session_processed')
            .eq('metadata->>session_id', sessionId)
            .single();
          
          if (recheckLog) {
            console.log(`[DUPLICAÇÃO] Session ${sessionId} já está sendo processada, retornando sucesso.`);
            return new Response(JSON.stringify({
              received: true,
              message: 'Session already being processed'
            }), {
              status: 200
            });
          }
        } else {
          console.log('[DUPLICAÇÃO] Log de processamento criado para evitar duplicação');
          
          // Verificar novamente após criar o log para garantir que não há duplicação
          // (em caso de race condition onde dois eventos criaram o log simultaneamente)
          const { data: verifyLog } = await supabase
            .from('student_action_logs')
            .select('id, created_at')
            .eq('action_type', 'checkout_session_processed')
            .eq('metadata->>session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(2);
          
          if (verifyLog && verifyLog.length > 1) {
            console.log(`[DUPLICAÇÃO] Múltiplos logs detectados para session ${sessionId}, retornando sucesso para evitar duplicação.`);
            return new Response(JSON.stringify({
              received: true,
              message: 'Session already being processed (multiple logs detected)'
            }), {
              status: 200
            });
          }
        }
      }
    } catch (logError) {
      console.error('[DUPLICAÇÃO] Erro inesperado ao criar log:', logError);
      // Se falhar ao criar log, verificar novamente se já existe (race condition)
      const { data: recheckLog } = await supabase
        .from('student_action_logs')
        .select('id')
        .eq('action_type', 'checkout_session_processed')
        .eq('metadata->>session_id', sessionId)
        .single();
      
      if (recheckLog) {
        console.log(`[DUPLICAÇÃO] Session ${sessionId} já está sendo processada, retornando sucesso.`);
        return new Response(JSON.stringify({
          received: true,
          message: 'Session already being processed'
        }), {
          status: 200
        });
      }
    }
  }
  
  // Só processa envio de e-mail para checkout.session.completed
  console.log('[stripe-webhook] Evento checkout.session.completed recebido!');
  const { mode, payment_status } = stripeData;
  const amount_total = stripeData.amount_total;
  const sessionData = stripeData;
  // Obter dados do usuário para o e-mail
  // userId já foi declarado acima
  let userData = {
    email: '',
    name: 'Usuário'
  };
  if (userId) {
    userData = await getUserData(userId);
    console.log('[stripe-webhook] userData extraído para e-mail:', userData);
  } else {
    console.warn('[stripe-webhook] Nenhum userId encontrado no metadata para envio de e-mail.');
  }
  // Fallback: extrair e-mail e nome do evento Stripe se não encontrar no banco
  if (!userData.email) {
    userData.email = sessionData.customer_email || sessionData.customer_details?.email || '';
    if (userData.email) {
      console.log('[stripe-webhook] E-mail extraído do evento Stripe:', userData.email);
    } else {
      console.warn('[stripe-webhook] Nenhum e-mail encontrado nem no banco nem no evento Stripe.');
    }
  }
  if (!userData.name || userData.name === 'Usuário') {
    userData.name = sessionData.customer_details?.name || 'Usuário';
    if (userData.name && userData.name !== 'Usuário') {
      console.log('[stripe-webhook] Nome extraído do evento Stripe:', userData.name);
    }
  }
  // Referenciar corretamente o metadado de origem
  const paymentOrigin = metadata?.origin || 'site';
  console.log('[stripe-webhook] Metadado de origem do pagamento:', paymentOrigin);
  // Log antes do envio de e-mail
  // REMOVIDO: Envio via MailerSend para evitar duplicação com webhook n8n
  console.log('[stripe-webhook] Notificação de pagamento será enviada apenas via webhook n8n para evitar duplicação');
  // Processar diferentes tipos de pagamento
  const paymentType = metadata?.payment_type || metadata?.fee_type;
  console.log('[stripe-webhook] PaymentType detectado:', paymentType);
  console.log('[stripe-webhook] Metadata completo:', JSON.stringify(metadata, null, 2));
  if (paymentType === 'application_fee') {
    // userId já foi declarado acima, usar o valor do metadata se necessário
    const finalUserId = metadata.user_id || metadata.student_id || userId;
    const applicationId = metadata.application_id;
    const applicationFeeAmount = metadata.application_fee_amount || '350.00';
    const universityId = metadata.university_id;
    const feeType = metadata.fee_type || 'application_fee';
    const paymentMethod = metadata?.payment_method || 'stripe'; // Usar método do metadata
    
    console.log(`[stripe-webhook] Processing application_fee for user: ${finalUserId}, application: ${applicationId}, payment method: ${paymentMethod}`);
    
    if (finalUserId && applicationId) {
      // Buscar o perfil do usuário para obter o user_profiles.id correto
      const { data: userProfile, error: userProfileError } = await supabase.from('user_profiles').select('id, user_id').eq('user_id', finalUserId).single();
      if (userProfileError || !userProfile) {
        console.error('[stripe-webhook] User profile not found:', userProfileError);
      } else {
        console.log(`[stripe-webhook] User profile found: ${userProfile.id} for auth user: ${finalUserId}`);
        
      // Buscar o status atual da aplicação para preservar 'approved' se já estiver
        const { data: currentApp, error: fetchError } = await supabase.from('scholarship_applications').select('status, scholarship_id, student_process_type').eq('id', applicationId).eq('student_id', userProfile.id).single();
        
        const updateData: any = {
        is_application_fee_paid: true,
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
          application_fee_payment_method: metadata?.payment_method || 'stripe',
          updated_at: new Date().toISOString()
      };
        
      // Só alterar status se não estiver 'approved' (universidade já aprovou)
      if (!currentApp || currentApp.status !== 'approved') {
        updateData.status = 'under_review';
          console.log(`[stripe-webhook] Application status set to 'under_review' for user ${finalUserId}, application ${applicationId}.`);
        } else {
          console.log(`[stripe-webhook] Preserving 'approved' status for user ${finalUserId}, application ${applicationId} (university already approved).`);
        }
        
        // Se student_process_type não existe na aplicação, tentar obter dos metadados da sessão
        if (!currentApp?.student_process_type && session.metadata?.student_process_type) {
          updateData.student_process_type = session.metadata.student_process_type;
          console.log('[stripe-webhook] Adding student_process_type from session metadata:', session.metadata.student_process_type);
        }
        
        const { error: appError } = await supabase.from('scholarship_applications').update(updateData).eq('id', applicationId).eq('student_id', userProfile.id);
      if (appError) {
          console.error('[stripe-webhook] Error updating application status:', appError);
      } else {
          console.log('[stripe-webhook] Application fee payment processed successfully for user:', finalUserId);
        }
        
        // Buscar documentos do user_profiles e vincular à application
        const { data: userProfileDocs, error: userProfileError } = await supabase.from('user_profiles').select('documents').eq('user_id', finalUserId).single();
        if (userProfileError) {
          console.error('[stripe-webhook] Failed to fetch user profile documents:', userProfileError);
        } else if (userProfileDocs?.documents) {
          const documents = Array.isArray(userProfileDocs.documents) ? userProfileDocs.documents : [];
          let formattedDocuments = documents;
          // Se for array de strings (URLs), converter para array de objetos completos
          if (documents.length > 0 && typeof documents[0] === 'string') {
            const docTypes = ['passport', 'diploma', 'funds_proof'];
            formattedDocuments = documents.map((url, idx) => ({
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
              console.error('[stripe-webhook] Failed to update application documents:', docUpdateError);
            } else {
              console.log('[stripe-webhook] Application documents updated');
            }
          }
        }
      }
      
      // Atualizar também o perfil do usuário para manter consistência
      const { error: profileUpdateError } = await supabase.from('user_profiles').update({
        is_application_fee_paid: true,
        last_payment_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('user_id', finalUserId);
      if (profileUpdateError) {
        console.error('[stripe-webhook] Error updating user profile:', profileUpdateError);
      } else {
        console.log('[stripe-webhook] User profile updated - application fee paid');
      }

      // Registrar pagamento na tabela individual_fee_payments
      try {
        const paymentDate = new Date().toISOString();
        const paymentAmountRaw = session.amount_total ? session.amount_total / 100 : 0;
        const currency = session.currency?.toUpperCase() || 'USD';
        const paymentIntentId = session.payment_intent as string || '';
        
        // Converter BRL para USD se necessário (sempre registrar em USD)
        let paymentAmount = paymentAmountRaw;
        if (currency === 'BRL' && session.metadata?.exchange_rate) {
          const exchangeRate = parseFloat(session.metadata.exchange_rate);
          if (exchangeRate > 0) {
            paymentAmount = paymentAmountRaw / exchangeRate;
            console.log(`[Individual Fee Payment] Convertendo BRL para USD: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`);
          }
        }
        
        console.log('[Individual Fee Payment] Recording application fee payment via PIX/Stripe...');
        console.log(`[Individual Fee Payment] Valor original: ${paymentAmountRaw} ${currency}, Valor em USD: ${paymentAmount} USD`);
        const { data: insertResult, error: insertError } = await supabase.rpc('insert_individual_fee_payment', {
          p_user_id: finalUserId,
          p_fee_type: 'application',
          p_amount: paymentAmount, // Sempre em USD
          p_payment_date: paymentDate,
          p_payment_method: 'stripe',
          p_payment_intent_id: paymentIntentId,
          p_stripe_charge_id: null,
          p_zelle_payment_id: null
        });
        
        if (insertError) {
          console.warn('[Individual Fee Payment] Warning: Could not record fee payment:', insertError);
        } else {
          console.log('[Individual Fee Payment] Application fee recorded successfully:', insertResult);
        }
      } catch (recordError) {
        console.warn('[Individual Fee Payment] Warning: Failed to record individual fee payment:', recordError);
      }
      
      // Limpar carrinho
      const { error: cartError } = await supabase.from('user_cart').delete().eq('user_id', finalUserId);
      if (cartError) {
        console.error('[stripe-webhook] Failed to clear user_cart:', cartError);
      } else {
        console.log('[stripe-webhook] User cart cleared');
      }
      
      // --- NOTIFICAÇÕES REMOVIDAS ---
      // Todas as notificações (PIX e cartão) são enviadas via verify-stripe-session-application-fee
      // para evitar duplicação e centralizar a lógica de notificações
      console.log('[NOTIFICAÇÃO] Notificações de application_fee serão enviadas via verify-stripe-session-application-fee');
      
      // Log dos valores processados
      console.log('Application fee payment processed:', {
        userId: finalUserId,
        applicationId,
        applicationFeeAmount,
        universityId
      });
      // Processar transferência via Stripe Connect se aplicável (100% para universidade)
      const requiresTransfer = metadata.requires_transfer === 'true';
      const stripeConnectAccountId = metadata.stripe_connect_account_id;
      const transferAmount = metadata.transfer_amount || amount_total; // 100% do valor
      console.log('🔍 [TRANSFER DEBUG] Iniciando verificação de transferência:', {
        requiresTransfer,
        stripeConnectAccountId,
        transferAmount,
        amount_total,
        metadata: JSON.stringify(metadata, null, 2)
      });
      if (requiresTransfer && stripeConnectAccountId && amount_total) {
        try {
          console.log('🚀 [TRANSFER DEBUG] Iniciando transferência Stripe Connect:', {
            universityId,
            stripeConnectAccountId,
            transferAmount: transferAmount + ' cents',
            totalAmount: amount_total + ' cents',
            sessionId: session.id,
            paymentIntentId: session.payment_intent
          });
          // Verificar se a conta Stripe Connect existe e está ativa
          console.log('🔍 [TRANSFER DEBUG] Verificando conta Stripe Connect...');
          const accountInfo = await stripe.accounts.retrieve(stripeConnectAccountId);
          console.log('✅ [TRANSFER DEBUG] Conta Stripe Connect encontrada:', {
            accountId: accountInfo.id,
            country: accountInfo.country,
            chargesEnabled: accountInfo.charges_enabled,
            payoutsEnabled: accountInfo.payouts_enabled,
            requirementsCompleted: accountInfo.requirements?.details_submitted,
            capabilities: accountInfo.capabilities
          });
          // Verificar saldo da plataforma antes da transferência
          console.log('💰 [TRANSFER DEBUG] Verificando saldo da plataforma...');
          const balance = await stripe.balance.retrieve();
          console.log('✅ [TRANSFER DEBUG] Saldo da plataforma:', {
            available: balance.available.map((b)=>({
                amount: b.amount,
                currency: b.currency
              })),
            pending: balance.pending.map((b)=>({
                amount: b.amount,
                currency: b.currency
              })),
            instantAvailable: balance.instant_available?.map((b)=>({
                amount: b.amount,
                currency: b.currency
              })) || []
          });
          // Transferir 100% do valor para a universidade
          const finalTransferAmount = parseInt(transferAmount.toString());
          console.log('💰 [TRANSFER DEBUG] Criando transferência com parâmetros:', {
            amount: finalTransferAmount,
            currency: 'usd',
            destination: stripeConnectAccountId,
            description: `Application fee transfer for session ${session.id}`,
            metadata: {
              session_id: session.id,
              application_id: applicationId,
              university_id: universityId,
              user_id: userId,
              original_amount: amount_total.toString(),
              platform_fee: '0'
            }
          });
          const transfer = await stripe.transfers.create({
            amount: finalTransferAmount,
            currency: 'usd',
            destination: stripeConnectAccountId,
            description: `Application fee transfer for session ${session.id}`,
            metadata: {
              session_id: session.id,
              application_id: applicationId,
              university_id: universityId,
              user_id: userId,
              original_amount: amount_total.toString(),
              platform_fee: '0'
            }
          });
          console.log('🎉 [TRANSFER DEBUG] Transferência criada com sucesso:', {
            transferId: transfer.id,
            amount: finalTransferAmount + ' cents',
            destination: stripeConnectAccountId,
            status: transfer.pending ? 'pending' : 'completed',
            universityPortion: '100%',
            platformFee: 'disabled',
            transferObject: JSON.stringify(transfer, null, 2)
          });
          // Registrar a transferência no banco de dados
          console.log('💾 [TRANSFER DEBUG] Salvando transferência no banco...');
          const { error: transferError } = await supabase.from('stripe_connect_transfers').insert({
            transfer_id: transfer.id,
            session_id: session.id,
            payment_intent_id: session.payment_intent || '',
            application_id: applicationId,
            user_id: userId,
            university_id: universityId,
            amount: transferAmount,
            status: transfer.pending ? 'pending' : 'succeeded',
            destination_account: stripeConnectAccountId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          if (transferError) {
            console.error('❌ [TRANSFER DEBUG] Erro ao salvar no banco:', transferError);
          } else {
            console.log('✅ [TRANSFER DEBUG] Transferência salva no banco com sucesso');
          }
        } catch (transferError) {
          console.error('💥 [TRANSFER DEBUG] Erro ao processar transferência:', {
            error: transferError.message,
            errorType: transferError.type,
            errorCode: transferError.code,
            errorParam: transferError.param,
            fullError: JSON.stringify(transferError, null, 2)
          });
          // Registrar falha da transferência no banco
          console.log('💾 [TRANSFER DEBUG] Salvando falha da transferência no banco...');
          const { error: failedTransferError } = await supabase.from('stripe_connect_transfers').insert({
            session_id: session.id,
            payment_intent_id: session.payment_intent || '',
            application_id: applicationId,
            user_id: userId,
            university_id: universityId,
            amount: amount_total,
            status: 'failed',
            destination_account: stripeConnectAccountId,
            error_message: transferError.message,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          if (failedTransferError) {
            console.error('❌ [TRANSFER DEBUG] Erro ao salvar falha no banco:', failedTransferError);
          } else {
            console.log('✅ [TRANSFER DEBUG] Falha da transferência salva no banco');
          }
        }
      } else {
        console.log('⚠️ [TRANSFER DEBUG] Transferência não será processada:', {
          requiresTransfer,
          hasStripeConnectAccount: !!stripeConnectAccountId,
          hasAmount: !!amount_total,
          reason: !requiresTransfer ? 'requires_transfer = false' : !stripeConnectAccountId ? 'sem stripe_connect_account_id' : !amount_total ? 'sem amount_total' : 'desconhecido'
        });
      }
      if (universityId && amount_total) {
        // Fallback para o fluxo antigo se não tiver Stripe Connect
        try {
          console.log('Using legacy transfer flow (no Stripe Connect)');
          const transferResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-stripe-connect-transfer`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              session_id: session.id,
              payment_intent_id: session.payment_intent,
              amount: amount_total,
              university_id: universityId,
              application_id: applicationId,
              user_id: userId
            })
          });
          if (transferResponse.ok) {
            const transferResult = await transferResponse.json();
            console.log('Legacy transfer result:', transferResult);
          }
        } catch (legacyError) {
          console.error('Error in legacy transfer flow:', legacyError);
        }
      }
    }
  }
  if (paymentType === 'scholarship_fee') {
    const userId = metadata?.user_id || metadata?.student_id;
    const scholarshipsIds = metadata?.scholarships_ids;
    const paymentIntentId = sessionData.payment_intent;
    console.log('[NOTIFICAÇÃO] Processando scholarship_fee para userId:', userId);
    if (userId) {
      // Buscar o perfil do usuário para obter o user_profiles.id correto
      const { data: userProfile, error: userProfileError } = await supabase.from('user_profiles').select('id, user_id').eq('user_id', userId).single();
      if (userProfileError || !userProfile) {
        console.error('[stripe-webhook] User profile not found:', userProfileError);
      } else {
        console.log(`[stripe-webhook] User profile found: ${userProfile.id} for auth user: ${userId}`);
        
        // Atualizar scholarship_applications para marcar scholarship fee como pago
        if (scholarshipsIds) {
          const scholarshipIdsArray = scholarshipsIds.split(',').map(id => id.trim());
          const { error: appError } = await supabase.from('scholarship_applications').update({
            is_scholarship_fee_paid: true,
            scholarship_fee_payment_method: metadata?.payment_method || 'stripe',
            payment_status: 'paid',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).eq('student_id', userProfile.id).in('scholarship_id', scholarshipIdsArray);
          
          if (appError) {
            console.error('[stripe-webhook] Error updating scholarship_applications:', appError);
          } else {
            console.log('[stripe-webhook] Scholarship applications updated - scholarship fee paid');
          }
        }
        
        // Atualizar também o perfil do usuário para manter consistência
        const { error: profileUpdateError } = await supabase.from('user_profiles').update({
          is_scholarship_fee_paid: true,
          last_payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('user_id', userId);
        if (profileUpdateError) {
          console.error('[stripe-webhook] Error updating user profile:', profileUpdateError);
      } else {
        console.log('Scholarship fee payment processed successfully for user:', userId);
        }

        // Registrar pagamento na tabela individual_fee_payments
        try {
          const paymentDate = new Date().toISOString();
          const paymentAmountRaw = session.amount_total ? session.amount_total / 100 : 0;
          const currency = session.currency?.toUpperCase() || 'USD';
          const paymentIntentId = session.payment_intent as string || '';
          
          // Converter BRL para USD se necessário (sempre registrar em USD)
          let paymentAmount = paymentAmountRaw;
          if (currency === 'BRL' && session.metadata?.exchange_rate) {
            const exchangeRate = parseFloat(session.metadata.exchange_rate);
            if (exchangeRate > 0) {
              paymentAmount = paymentAmountRaw / exchangeRate;
              console.log(`[Individual Fee Payment] Convertendo BRL para USD: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`);
            }
          }
          
          console.log('[Individual Fee Payment] Recording scholarship fee payment via PIX/Stripe...');
          console.log(`[Individual Fee Payment] Valor original: ${paymentAmountRaw} ${currency}, Valor em USD: ${paymentAmount} USD`);
          const { data: insertResult, error: insertError } = await supabase.rpc('insert_individual_fee_payment', {
            p_user_id: userId,
            p_fee_type: 'scholarship',
            p_amount: paymentAmount, // Sempre em USD
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
        }
      }
      // Registrar pagamento na tabela affiliate_referrals para faturamento
      try {
        // Buscar se o usuário usou algum código de referência
        const { data: usedCode, error: codeError } = await supabase.from('used_referral_codes').select('referrer_id, affiliate_code').eq('user_id', userId).single();
        if (!codeError && usedCode) {
          console.log('[FATURAMENTO] Registrando scholarship_fee para faturamento do seller:', usedCode.referrer_id);
          // Usar valor base do metadata (sem markup) para comissões, se disponível
          const baseAmount = metadata.base_amount ? Number(metadata.base_amount) : (amount_total ? amount_total / 100 : 0);
          console.log('[FATURAMENTO] Valor base usado para comissão:', baseAmount, '(gross:', amount_total ? amount_total / 100 : 0, ')');
          const { error: upsertRefError } = await supabase.from('affiliate_referrals').upsert({
            referrer_id: usedCode.referrer_id,
            referred_id: userId,
            affiliate_code: usedCode.affiliate_code,
            payment_amount: baseAmount, // Usar valor base, não o valor com markup
            credits_earned: 0,
            status: 'completed',
            payment_session_id: session.id,
            completed_at: new Date().toISOString()
          }, {
            onConflict: 'referred_id'
          });
          if (upsertRefError) {
            console.error('[FATURAMENTO] Erro ao registrar scholarship_fee no faturamento:', upsertRefError);
          } else {
            console.log('[FATURAMENTO] Scholarship fee registrada no faturamento com sucesso');
          }
        } else {
          console.log('[FATURAMENTO] Usuário não usou código de referência, não há faturamento para registrar');
        }
      } catch (billingError) {
        console.error('[FATURAMENTO] Erro ao processar faturamento da scholarship_fee:', billingError);
      }
      // Se houver bolsas no metadata, registrar na tabela de pagamentos de scholarship fee
      if (scholarshipsIds && paymentIntentId) {
        const { error: insertError } = await supabase.from('scholarship_fee_payments').insert({
          user_id: userId,
          scholarships_ids: scholarshipsIds,
          payment_intent_id: paymentIntentId,
          created_at: new Date().toISOString()
        });
        if (insertError) {
          console.error('Error inserting scholarship fee payment record:', insertError);
        } else {
          console.log('Scholarship fee payment record inserted for user:', userId);
        }
      }
      // --- NOTIFICAÇÕES PARA PIX ---
      // Para PIX, as notificações devem ser enviadas pelo webhook, pois o verify-stripe-session
      // pode não ser chamado automaticamente. Para cartões, as notificações são enviadas via verify.
      const isPixPayment = session.payment_method_types?.includes('pix') || session.metadata?.payment_method === 'pix';
      
      if (isPixPayment) {
        console.log('[NOTIFICAÇÃO] Pagamento PIX detectado - enviando notificações via webhook para scholarship_fee...');
        try {
          console.log(`📤 [stripe-webhook] Iniciando notificações para scholarship_fee (PIX)...`);
        // Buscar dados do aluno
        const { data: alunoData, error: alunoError } = await supabase.from('user_profiles').select('full_name, email, phone, seller_referral_code').eq('user_id', userId).single();
        // Buscar telefone do admin
        const { data: adminProfile, error: adminProfileError } = await supabase.from('user_profiles').select('phone').eq('email', 'admin@matriculausa.com').single();
        const adminPhone = adminProfile?.phone || "";
        
        if (alunoError || !alunoData) {
          console.error('[stripe-webhook] Erro ao buscar dados do aluno:', alunoError);
        } else {
          console.log('[stripe-webhook] Dados do aluno encontrados:', alunoData);
          
          // Buscar dados das bolsas para notificações
          const scholarshipsIds = session.metadata?.scholarships_ids;
          if (scholarshipsIds) {
            const scholarshipIdsArray = scholarshipsIds.split(',').map(id => id.trim());
            
            // Para cada scholarship, enviar notificações
            for (const scholarshipId of scholarshipIdsArray) {
              try {
                // Buscar dados da bolsa
                const { data: scholarship, error: scholarshipError } = await supabase.from('scholarships').select('id, title, university_id').eq('id', scholarshipId).single();
                if (scholarshipError || !scholarship) continue;
                
                // Buscar dados da universidade
                const { data: universidade, error: univError } = await supabase.from('universities').select('id, name, contact').eq('id', scholarship.university_id).single();
                if (univError || !universidade) continue;
                const contact = universidade.contact || {};
                const emailUniversidade = contact.admissionsEmail || contact.email || '';
                
                // Preparar informações de moeda
                const currencyInfo = getCurrencyInfo(session);
                const amountValue = session.amount_total ? session.amount_total / 100 : 0;
                const formattedAmount = formatAmountWithCurrency(amountValue, session);
                
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
                  payment_amount: amountValue,
                  amount: amountValue,
                  currency: currencyInfo.currency,
                  currency_symbol: currencyInfo.symbol,
                  formatted_amount: formattedAmount,
                  payment_method: 'stripe',
                  payment_id: session.id,
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
                
                // 2. NOTIFICAÇÃO PARA A UNIVERSIDADE - REMOVIDA
                // Scholarship fee NÃO envia notificação para universidade (apenas application fee faz isso)
                console.log('[NOTIFICAÇÃO UNIVERSIDADE] Scholarship fee não envia notificação para universidade');
                
                // 3. NOTIFICAÇÃO PARA SELLER/ADMIN/AFFILIATE (se houver código de seller)
                console.log(`📤 [stripe-webhook] DEBUG - alunoData.seller_referral_code:`, alunoData.seller_referral_code);
                if (alunoData.seller_referral_code) {
                  console.log(`📤 [stripe-webhook] Buscando seller através do seller_referral_code: ${alunoData.seller_referral_code}`);
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
                  console.log(`📤 [stripe-webhook] Resultado da busca do seller:`, {
                    sellerData,
                    sellerError
                  });
                  if (sellerData && !sellerError) {
                    console.log(`📤 [stripe-webhook] Seller encontrado:`, sellerData);
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
                      console.log(`📤 [stripe-webhook] Buscando affiliate_admin: ${sellerData.affiliate_admin_id}`);
                      const { data: affiliateData, error: affiliateError } = await supabase.from('affiliate_admins').select('user_id').eq('id', sellerData.affiliate_admin_id).single();
                      if (affiliateData && !affiliateError) {
                        const { data: affiliateProfile, error: profileError } = await supabase.from('user_profiles').select('email, full_name, phone').eq('user_id', affiliateData.user_id).single();
                        if (affiliateProfile && !profileError) {
                          affiliateAdminData = {
                            email: affiliateProfile.email || "",
                            name: affiliateProfile.full_name || "Affiliate Admin",
                            phone: affiliateProfile.phone || ""
                          };
                          console.log(`📤 [stripe-webhook] Affiliate admin encontrado:`, affiliateAdminData);
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
                      o_que_enviar: `Pagamento Stripe de scholarship fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Seu código de referência: ${sellerData.referral_code}`,
                      payment_id: session.id,
                      fee_type: 'scholarship',
                      amount: amountValue,
                      currency: currencyInfo.currency,
                      currency_symbol: currencyInfo.symbol,
                      formatted_amount: formattedAmount,
                      seller_id: sellerData.user_id,
                      referral_code: sellerData.referral_code,
                      commission_rate: sellerData.commission_rate,
                      payment_method: "stripe",
                      notification_target: 'seller'
                    };
                    console.log('📧 [stripe-webhook] Enviando notificação para seller:', sellerNotificationPayload);
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
                      console.log('📧 [stripe-webhook] Notificação para seller enviada com sucesso:', sellerResult);
                    } else {
                      const sellerError = await sellerNotificationResponse.text();
                      console.error('📧 [stripe-webhook] Erro ao enviar notificação para seller:', sellerError);
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
                        o_que_enviar: `Pagamento Stripe de scholarship fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
                        payment_id: session.id,
                        fee_type: 'scholarship',
                        amount: amountValue,
                        currency: currencyInfo.currency,
                        currency_symbol: currencyInfo.symbol,
                        formatted_amount: formattedAmount,
                        seller_id: sellerData.user_id,
                        referral_code: sellerData.referral_code,
                        commission_rate: sellerData.commission_rate,
                        payment_method: "stripe",
                        notification_target: 'affiliate_admin'
                      };
                      console.log('📧 [stripe-webhook] Enviando notificação para affiliate admin:', affiliateNotificationPayload);
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
                        console.log('📧 [stripe-webhook] Notificação para affiliate admin enviada com sucesso:', affiliateResult);
                      } else {
                        const affiliateError = await affiliateNotificationResponse.text();
                        console.error('📧 [stripe-webhook] Erro ao enviar notificação para affiliate admin:', affiliateError);
                      }
                    }
                  } else {
                    console.log(`📤 [stripe-webhook] Seller não encontrado para seller_referral_code: ${alunoData.seller_referral_code}`);
                  }
                } else {
                  console.log(`📤 [stripe-webhook] Nenhum seller_referral_code encontrado, não há seller para notificar`);
                }
              } catch (notifErr) {
                console.error('[NOTIFICAÇÃO] Erro ao notificar scholarship:', scholarshipId, notifErr);
              }
            }
          }
          
          // Preparar informações de moeda para notificação do admin
          const currencyInfoAdmin = getCurrencyInfo(session);
          const amountValueAdmin = session.amount_total ? session.amount_total / 100 : 0;
          const formattedAmountAdmin = formatAmountWithCurrency(amountValueAdmin, session);
          
          // NOTIFICAÇÃO PARA O ADMIN DA PLATAFORMA (SEMPRE ENVIADA)
          const adminNotificationPayload = {
            tipo_notf: "Pagamento Stripe de scholarship fee confirmado - Admin",
            email_admin: "admin@matriculausa.com",
            nome_admin: "Admin MatriculaUSA",
            phone_admin: adminPhone,
            email_aluno: alunoData.email,
            nome_aluno: alunoData.full_name,
            phone_aluno: alunoData.phone || "",
            o_que_enviar: `Pagamento Stripe de scholarship fee no valor de ${formattedAmountAdmin} do aluno ${alunoData.full_name} foi processado com sucesso.`,
            payment_id: session.id,
            fee_type: 'scholarship',
            amount: amountValueAdmin,
            currency: currencyInfoAdmin.currency,
            currency_symbol: currencyInfoAdmin.symbol,
            formatted_amount: formattedAmountAdmin,
            payment_method: 'stripe',
            notification_target: 'admin'
          };
          console.log('📧 [stripe-webhook] Enviando notificação para admin da plataforma:', adminNotificationPayload);
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
            console.log('📧 [stripe-webhook] Notificação para admin enviada com sucesso:', adminResult);
          } else {
            const adminError = await adminNotificationResponse.text();
            console.error('📧 [stripe-webhook] Erro ao enviar notificação para admin:', adminError);
          }
        }
      } catch (notifErr) {
        console.error('[stripe-webhook] Erro ao notificar scholarship fee via n8n:', notifErr);
      }
      } else {
        // Para cartões, as notificações são enviadas via verify-stripe-session-scholarship-fee
        console.log('[NOTIFICAÇÃO] Pagamento via cartão detectado - notificações serão enviadas via verify-stripe-session-scholarship-fee');
      }
    // --- FIM DA NOTIFICAÇÃO ---
    }
  }
  if (paymentType === 'i20_control_fee') {
    const userId = metadata?.user_id || metadata?.student_id;
    console.log('[NOTIFICAÇÃO] Processando i20_control_fee para userId:', userId);
    
    if (userId) {
      // Buscar o perfil do usuário para obter o user_profiles.id correto
      const { data: userProfile, error: userProfileError } = await supabase.from('user_profiles').select('id, user_id').eq('user_id', userId).single();
      if (userProfileError || !userProfile) {
        console.error('[stripe-webhook] User profile not found:', userProfileError);
      } else {
        console.log(`[stripe-webhook] User profile found: ${userProfile.id} for auth user: ${userId}`);
        
        // Atualizar scholarship_applications para marcar I20 control fee como pago
        const { error: appError } = await supabase.from('scholarship_applications').update({
          is_i20_control_fee_paid: true,
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('student_id', userProfile.id);
        
        if (appError) {
          console.error('[stripe-webhook] Error updating scholarship_applications for I20 control fee:', appError);
        } else {
          console.log('[stripe-webhook] Scholarship applications updated - I20 control fee paid');
        }
        
        // Atualizar também o perfil do usuário para manter consistência
        const i20PaymentMethod = metadata?.payment_method || 'stripe';
        const { error: profileUpdateError } = await supabase.from('user_profiles').update({
          has_paid_i20_control_fee: true,
          i20_control_fee_due_date: new Date().toISOString(),
          i20_control_fee_payment_intent_id: sessionData.payment_intent,
          i20_control_fee_payment_method: i20PaymentMethod,
          last_payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('user_id', userId);
        if (profileUpdateError) {
          console.error('[stripe-webhook] Error updating user profile for I20 control fee:', profileUpdateError);
        } else {
          console.log('I20 control fee payment processed successfully for user:', userId);
        }

        // Registrar pagamento na tabela individual_fee_payments
        try {
          const paymentDate = new Date().toISOString();
          const paymentAmountRaw = session.amount_total ? session.amount_total / 100 : 0;
          const currency = session.currency?.toUpperCase() || 'USD';
          const paymentIntentId = session.payment_intent as string || '';
          
          // Converter BRL para USD se necessário (sempre registrar em USD)
          let paymentAmount = paymentAmountRaw;
          if (currency === 'BRL' && session.metadata?.exchange_rate) {
            const exchangeRate = parseFloat(session.metadata.exchange_rate);
            if (exchangeRate > 0) {
              paymentAmount = paymentAmountRaw / exchangeRate;
              console.log(`[Individual Fee Payment] Convertendo BRL para USD: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`);
            }
          }
          
          console.log('[Individual Fee Payment] Recording i20_control fee payment via PIX/Stripe...');
          console.log(`[Individual Fee Payment] Valor original: ${paymentAmountRaw} ${currency}, Valor em USD: ${paymentAmount} USD`);
          const { data: insertResult, error: insertError } = await supabase.rpc('insert_individual_fee_payment', {
            p_user_id: userId,
            p_fee_type: 'i20_control',
            p_amount: paymentAmount, // Sempre em USD
            p_payment_date: paymentDate,
            p_payment_method: 'stripe',
            p_payment_intent_id: paymentIntentId,
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
        }
      }
      
      // --- NOTIFICAÇÕES REMOVIDAS ---
      // Todas as notificações (PIX e cartão) são enviadas via verify-stripe-session-i20-control-fee
      // para evitar duplicação e centralizar a lógica de notificações
      console.log('[NOTIFICAÇÃO] Notificações de i20_control_fee serão enviadas via verify-stripe-session-i20-control-fee');
    }
  }
  if (paymentType === 'selection_process') {
    const userId = metadata?.user_id || metadata?.student_id;
    console.log('[NOTIFICAÇÃO] Processando selection_process para userId:', userId);
    if (userId) {
      const selectionPaymentMethod = metadata?.payment_method || 'stripe';
      const { error } = await supabase.from('user_profiles').update({
        has_paid_selection_process_fee: true,
        selection_process_fee_payment_method: selectionPaymentMethod,
        updated_at: new Date().toISOString()
      }).eq('user_id', userId);
      if (error) {
        console.error('Error updating selection process fee status:', error);
      } else {
        console.log('Selection process fee payment processed successfully for user:', userId);
        // Term acceptance notification removed to avoid duplication
        // Will be sent via verify-stripe-session-selection-process-fee
        console.log('[NOTIFICAÇÃO] Term acceptance notification removed from webhook to avoid duplication');
      }

      // Registrar pagamento na tabela individual_fee_payments
      try {
        const paymentDate = new Date().toISOString();
        const paymentAmountRaw = session.amount_total ? session.amount_total / 100 : 0;
        const currency = session.currency?.toUpperCase() || 'USD';
        const paymentIntentId = session.payment_intent as string || '';
        
        // Converter BRL para USD se necessário (sempre registrar em USD)
        let paymentAmount = paymentAmountRaw;
        if (currency === 'BRL' && session.metadata?.exchange_rate) {
          const exchangeRate = parseFloat(session.metadata.exchange_rate);
          if (exchangeRate > 0) {
            paymentAmount = paymentAmountRaw / exchangeRate;
            console.log(`[Individual Fee Payment] Convertendo BRL para USD: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`);
          }
        }
        
        console.log('[Individual Fee Payment] Recording selection_process fee payment via PIX/Stripe...');
        console.log(`[Individual Fee Payment] Valor original: ${paymentAmountRaw} ${currency}, Valor em USD: ${paymentAmount} USD`);
        const { data: insertResult, error: insertError } = await supabase.rpc('insert_individual_fee_payment', {
          p_user_id: userId,
          p_fee_type: 'selection_process',
          p_amount: paymentAmount, // Sempre em USD
          p_payment_date: paymentDate,
          p_payment_method: 'stripe',
          p_payment_intent_id: paymentIntentId,
          p_stripe_charge_id: null,
          p_zelle_payment_id: null
        });
        
        if (insertError) {
          console.warn('[Individual Fee Payment] Warning: Could not record fee payment:', insertError);
        } else {
          console.log('[Individual Fee Payment] Selection process fee recorded successfully:', insertResult);
        }
      } catch (recordError) {
        console.warn('[Individual Fee Payment] Warning: Failed to record individual fee payment:', recordError);
      }
      // --- NOTIFICAÇÕES REMOVIDAS ---
      // Todas as notificações (PIX e cartão) são enviadas via verify-stripe-session-selection-process-fee
      // para evitar duplicação e centralizar a lógica de notificações
      console.log('[NOTIFICAÇÃO] Notificações de selection_process serão enviadas via verify-stripe-session-selection-process-fee');
      // --- MATRICULA REWARDS - ADICIONAR COINS ---
      try {
        console.log('[MATRICULA REWARDS] Verificando se usuário usou código de referência...');
        // Buscar se o usuário usou algum código de referência
        const { data: usedCode, error: codeError } = await supabase.from('used_referral_codes').select('referrer_id, affiliate_code').eq('user_id', userId).single();
        if (!codeError && usedCode) {
          console.log('[MATRICULA REWARDS] Usuário usou código de referência, adicionando 180 coins para:', usedCode.referrer_id);
          // Adicionar 180 coins para o usuário que fez a indicação
          const { data: coinsResult, error: coinsError } = await supabase.rpc('add_coins_to_user_matricula', {
            user_id_param: usedCode.referrer_id,
            coins_to_add: 180,
            reason: `Referral reward: Selection Process Fee paid by ${userId}`
          });
          if (coinsError) {
            console.error('[MATRICULA REWARDS] Erro ao adicionar coins:', coinsError);
          } else {
            console.log('[MATRICULA REWARDS] Coins adicionados com sucesso:', coinsResult);
          }
        } else {
          console.log('[MATRICULA REWARDS] Usuário não usou código de referência, não há coins para adicionar');
        }
      } catch (rewardsError) {
        console.error('[MATRICULA REWARDS] Erro ao processar Matricula Rewards:', rewardsError);
      }
    // --- FIM MATRICULA REWARDS ---
    }
  }
  if (paymentType === 'i20_control_fee') {
    const userId = metadata?.user_id || metadata?.student_id;
    console.log('[NOTIFICAÇÃO] Processando i20_control_fee para userId:', userId);
    if (userId) {
      // Atualizar o status da i20 control fee no perfil do usuário
      const { error } = await supabase.from('user_profiles').update({
        has_paid_i20_control_fee: true,
        updated_at: new Date().toISOString()
      }).eq('user_id', userId);
      if (error) {
        console.error('Error updating i20 control fee status:', error);
      } else {
        console.log('I-20 control fee payment processed successfully for user:', userId);
      // Note: Term acceptance notification with PDF is only sent for selection_process_fee
      }
      // Registrar pagamento na tabela affiliate_referrals para faturamento
      try {
        // Buscar se o usuário usou algum código de referência
        const { data: usedCode, error: codeError } = await supabase.from('used_referral_codes').select('referrer_id, affiliate_code').eq('user_id', userId).single();
        if (!codeError && usedCode) {
          console.log('[FATURAMENTO] Registrando i20_control_fee para faturamento do seller:', usedCode.referrer_id);
          const { error: upsertRefError } = await supabase.from('affiliate_referrals').upsert({
            referrer_id: usedCode.referrer_id,
            referred_id: userId,
            affiliate_code: usedCode.affiliate_code,
            payment_amount: Number(amount_total ? amount_total / 100 : 0),
            credits_earned: 0,
            status: 'completed',
            payment_session_id: session.id,
            completed_at: new Date().toISOString()
          }, {
            onConflict: 'referred_id'
          });
          if (upsertRefError) {
            console.error('[FATURAMENTO] Erro ao registrar i20_control_fee no faturamento:', upsertRefError);
          } else {
            console.log('[FATURAMENTO] I20 control fee registrada no faturamento com sucesso');
          }
        } else {
          console.log('[FATURAMENTO] Usuário não usou código de referência, não há faturamento para registrar');
        }
      } catch (billingError) {
        console.error('[FATURAMENTO] Erro ao processar faturamento da i20_control_fee:', billingError);
      }
      // --- NOTIFICAÇÃO VIA WEBHOOK N8N ---
      // REMOVIDO: Notificação duplicada para aluno via webhook
      // A notificação será enviada apenas pela edge function verify-stripe-session-i20-control-fee
      console.log('[NOTIFICAÇÃO] Notificação de I-20 Control Fee será enviada apenas via edge function para evitar duplicação');
    // --- FIM DA NOTIFICAÇÃO ---
    }
  }
  
  // Log já foi criado no início da função para evitar duplicação

  return new Response(JSON.stringify({
    received: true
  }), {
    status: 200
  });
}
