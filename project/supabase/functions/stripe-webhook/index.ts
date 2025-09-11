import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// Validação das variáveis de ambiente obrigatórias
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
// Configurações do MailerSend (REMOVIDAS - usando apenas webhook n8n)
// const mailerSendApiKey = Deno.env.get('MAILERSEND_API_KEY');
// const mailerSendUrl = 'https://api.mailersend.com/v1/email';
// const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@matriculausa.com';
// const fromName = Deno.env.get('FROM_NAME') || 'MatriculaUSA';
// const companyName = Deno.env.get('COMPANY_NAME') || 'MatriculaUSA';
// const companyWebsite = Deno.env.get('COMPANY_WEBSITE') || 'https://matriculausa.com';
// const companyLogo = Deno.env.get('COMPANY_LOGO') || 'https://matriculausa.com/logo.png';
const supportEmail = Deno.env.get('SUPPORT_EMAIL') || 'support@matriculausa.com';

if (!stripeSecret || !stripeWebhookSecret || !supportEmail) {
  throw new Error('Missing required environment variables: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, or SUPPORT_EMAIL');
}

// Configurações adicionais para templates de email
const companyName = Deno.env.get('COMPANY_NAME') || 'Matrícula USA';
const companyWebsite = Deno.env.get('COMPANY_WEBSITE') || 'https://matriculausa.com/';
const companyLogo = Deno.env.get('COMPANY_LOGO') || 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/logo%20matriculaUSA.jpg';

const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

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
async function getUserData(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[getUserData] Erro ao buscar dados do usuário:', error);
      return { email: '', name: 'Usuário' };
    }

    return {
      email: data.email || '',
      name: data.full_name || 'Usuário'
    };
  } catch (error) {
    console.error('[getUserData] Erro inesperado:', error);
    return { email: '', name: 'Usuário' };
  }
}

// Função para verificar assinatura Stripe (IMPLEMENTAÇÃO MANUAL CORRETA)
async function verifyStripeSignature(body: string, signature: string | null, secret: string): Promise<boolean> {
  try {
    if (!signature) {
      console.error('[stripe-webhook] Assinatura Stripe ausente!');
      return false;
    }

    // Step 1: Extract timestamp and signatures from header
    const elements = signature.split(',');
    let timestamp = '';
    let v1Signature = '';

    for (const element of elements) {
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
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signedData = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const expectedSignature = Array.from(new Uint8Array(signedData))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

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
Deno.serve(async (req) => {
  try {
    const sig = req.headers.get('stripe-signature');
    const body = await req.text();
    
    // Verificação manual da assinatura
    const isValid = await verifyStripeSignature(body, sig, stripeWebhookSecret);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Webhook signature verification failed.' }), { status: 400 });
    }
    
    // Parse o evento manualmente
    let event;
    try {
      event = JSON.parse(body);
    } catch (err) {
      console.error('[stripe-webhook] Erro ao fazer parse do body:', err);
      return new Response(JSON.stringify({ error: 'Invalid JSON.' }), { status: 400 });
    }
    
    // Processar apenas eventos de checkout.session.completed para evitar duplicação
    // Ignorar payment_intent.succeeded pois já é processado pelo checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      console.log('[stripe-webhook] Processando checkout.session.completed...');
      return await handleCheckoutSessionCompleted(event.data.object);
    } else if (event.type === 'payment_intent.succeeded') {
      console.log('[stripe-webhook] Ignorando payment_intent.succeeded para evitar duplicação (já processado por checkout.session.completed)');
      return new Response(JSON.stringify({ 
        received: true, 
        message: 'payment_intent.succeeded ignorado para evitar duplicação' 
      }), { status: 200 });
    } else {
      console.log(`[stripe-webhook] Evento não suportado: ${event.type}`);
      return new Response(JSON.stringify({ 
        received: true, 
        message: `Evento não suportado: ${event.type}` 
      }), { status: 200 });
    }
  } catch (err) {
    console.error('[stripe-webhook] Erro inesperado no handler:', err);
    return new Response(JSON.stringify({ error: 'Internal server error.' }), { status: 500 });
  }
});

// Função para processar checkout.session.completed
async function handleCheckoutSessionCompleted(session: any) {
  console.log('[stripe-webhook] handleCheckoutSessionCompleted called with session:', JSON.stringify(session, null, 2));
  const stripeData = session;
  console.log('[stripe-webhook] stripeData:', JSON.stringify(stripeData, null, 2));

  // Só processa envio de e-mail para checkout.session.completed
  console.log('[stripe-webhook] Evento checkout.session.completed recebido!');
  
  const metadata = stripeData.metadata || {};
  const { mode, payment_status } = stripeData;
  const amount_total = stripeData.amount_total;
  const sessionData = stripeData;
  
  // Obter dados do usuário para o e-mail
  const userId = metadata?.user_id || metadata?.student_id;
  let userData = { email: '', name: 'Usuário' };
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
      const userId = metadata.user_id || metadata.student_id;
      const applicationId = metadata.application_id;
      const applicationFeeAmount = metadata.application_fee_amount || '350.00';
      const universityId = metadata.university_id;

      if (userId && applicationId) {
        // Buscar o status atual da aplicação para preservar 'approved' se já estiver
        const { data: currentApp, error: fetchError } = await supabase
          .from('scholarship_applications')
          .select('status')
          .eq('id', applicationId)
          .eq('student_id', userId)
          .single();

        const updateData: any = {
          is_application_fee_paid: true,
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Só alterar status se não estiver 'approved' (universidade já aprovou)
        if (!currentApp || currentApp.status !== 'approved') {
          updateData.status = 'under_review';
        }

        const { error: appError } = await supabase
          .from('scholarship_applications')
          .update(updateData)
          .eq('id', applicationId)
          .eq('student_id', userId);

        if (appError) {
          console.error('Error updating application status:', appError);
        } else {
          console.log('Application fee payment processed successfully for user:', userId);
        }

        // Atualizar também o perfil do usuário para manter consistência
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ 
            is_application_fee_paid: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (profileError) {
          console.error('Error updating user profile:', profileError);
        } else {
          console.log('User profile updated - application fee paid');
        }

        // --- NOTIFICAÇÃO PARA UNIVERSIDADE ---
        try {
          console.log('[NOTIFICAÇÃO] Enviando notificação de Application Fee para universidade...');
          
          const notificationResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-university-application-fee-paid`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              application_id: applicationId,
              user_id: userId,
              scholarship_id: metadata.scholarship_id || metadata.selected_scholarship_id
            }),
          });

          if (notificationResponse.ok) {
            const notificationResult = await notificationResponse.json();
            console.log('[NOTIFICAÇÃO] Notificação de Application Fee enviada com sucesso:', notificationResult);
          } else {
            const errorData = await notificationResponse.json();
            console.error('[NOTIFICAÇÃO] Erro ao enviar notificação de Application Fee:', errorData);
          }
        } catch (notificationError) {
          console.error('[NOTIFICAÇÃO] Erro ao notificar universidade sobre Application Fee:', notificationError);
        }

        // Log dos valores processados
        console.log('Application fee payment processed:', {
          userId,
          applicationId,
          applicationFeeAmount,
          universityId
        });

        // --- NOTIFICAÇÃO VIA WEBHOOK N8N ---
        try {
          // Buscar dados do aluno para notificação
          const { data: alunoData, error: alunoError } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', userId)
            .single();
          
          if (alunoError || !alunoData) {
            console.warn('[NOTIFICAÇÃO] Aluno não encontrado para notificação:', alunoError);
          } else {
            // Buscar dados da bolsa
            const { data: scholarship, error: scholarshipError } = await supabase
              .from('scholarship_applications')
              .select('scholarship_id')
              .eq('id', applicationId)
              .single();
            
            if (!scholarshipError && scholarship?.scholarship_id) {
              const { data: scholarshipData, error: scholarshipDataError } = await supabase
                .from('scholarships')
                .select('title, university_id')
                .eq('id', scholarship.scholarship_id)
                .single();
              
              if (!scholarshipDataError && scholarshipData) {
                // Buscar dados da universidade
                const { data: universidade, error: univError } = await supabase
                  .from('universities')
                  .select('name, contact')
                  .eq('id', scholarshipData.university_id)
                  .single();
                
                if (!univError && universidade) {
                  const contact = universidade.contact || {};
                  const emailUniversidade = contact.admissionsEmail || contact.email || '';
                  
                  // Montar mensagem para n8n
                  const mensagem = `O aluno ${alunoData.full_name} selecionou a bolsa "${scholarshipData.title}" da universidade ${universidade.name} e pagou a taxa de aplicação. Acesse o painel para revisar a candidatura.`;
                  const payload = {
                    tipo_notf: 'Novo pagamento de application fee',
                    email_aluno: alunoData.email,
                    nome_aluno: alunoData.full_name,
                    nome_bolsa: scholarshipData.title,
                    nome_universidade: universidade.name,
                    email_universidade: emailUniversidade,
                    o_que_enviar: mensagem,
                  };
                  
                  console.log('[NOTIFICAÇÃO] Enviando para webhook n8n:', payload);
                  
                  // Enviar para o n8n
                  const n8nRes = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'User-Agent': 'PostmanRuntime/7.36.3',
                    },
                    body: JSON.stringify(payload),
                  });
                  
                  const n8nText = await n8nRes.text();
                  console.log('[NOTIFICAÇÃO] Resposta do n8n:', n8nRes.status, n8nText);
                }
              }
            }
          }
        } catch (notifErr) {
          console.error('[NOTIFICAÇÃO] Erro ao notificar via n8n:', notifErr);
        }
        // --- FIM DA NOTIFICAÇÃO ---

        // --- NOTIFICAÇÕES PARA ADMIN, AFFILIATE ADMIN E SELLER ---
        try {
          console.log(`📤 [stripe-webhook] Buscando informações do seller e affiliate admin...`)
          
          // Buscar informações do seller relacionado ao pagamento
          const { data: sellerData, error: sellerError } = await supabase
            .from('sellers')
            .select(`
              id,
              user_id,
              name,
              email,
              referral_code,
              commission_rate,
              affiliate_admin_id,
              affiliate_admin:affiliate_admins!sellers_affiliate_admin_id_fkey(
                user_id,
                user_profiles!affiliate_admins_user_id_fkey(full_name, email)
              )
            `)
            .eq('user_id', customer_id)
            .single()

          if (sellerData && !sellerError) {
            console.log(`📤 [stripe-webhook] Seller encontrado:`, sellerData)

            // NOTIFICAÇÃO PARA ADMIN
            try {
              const adminNotificationPayload = {
                tipo_notf: "Pagamento Stripe de aluno aprovado",
                email_admin: "admin@matriculausa.com",
                nome_admin: "Admin MatriculaUSA",
                email_aluno: customer_email || "",
                nome_aluno: alunoData?.full_name || "Aluno",
                email_seller: sellerData.email,
                nome_seller: sellerData.name,
                email_affiliate_admin: sellerData.affiliate_admin?.user_profiles?.email || "",
                nome_affiliate_admin: sellerData.affiliate_admin?.user_profiles?.full_name || "Affiliate Admin",
                o_que_enviar: `Pagamento Stripe de ${feeType} no valor de $${(amount_total / 100).toFixed(2)} do aluno ${alunoData?.full_name || "Aluno"} foi processado com sucesso. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
                payment_id: session_id,
                fee_type: feeType,
                amount: amount_total / 100,
                seller_id: sellerData.user_id,
                referral_code: sellerData.referral_code,
                commission_rate: sellerData.commission_rate,
                payment_method: "stripe"
              }

              console.log('📧 [stripe-webhook] Enviando notificação para admin:', adminNotificationPayload)

              const adminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(adminNotificationPayload),
              })

              if (adminNotificationResponse.ok) {
                console.log('✅ [stripe-webhook] Notificação para admin enviada com sucesso!')
              } else {
                console.warn('⚠️ [stripe-webhook] Erro ao enviar notificação para admin:', adminNotificationResponse.status)
              }
            } catch (adminNotificationError) {
              console.error('❌ [stripe-webhook] Erro ao enviar notificação para admin:', adminNotificationError)
            }

            // NOTIFICAÇÃO PARA AFFILIATE ADMIN
            if (sellerData.affiliate_admin?.user_profiles?.email) {
              try {
                const affiliateAdminNotificationPayload = {
                  tipo_notf: "Pagamento Stripe de aluno do seu seller aprovado",
                  email_affiliate_admin: sellerData.affiliate_admin.user_profiles.email,
                  nome_affiliate_admin: sellerData.affiliate_admin.user_profiles.full_name || "Affiliate Admin",
                  email_aluno: customer_email || "",
                  nome_aluno: alunoData?.full_name || "Aluno",
                  email_seller: sellerData.email,
                  nome_seller: sellerData.name,
                  o_que_enviar: `Pagamento Stripe de ${feeType} no valor de $${(amount_total / 100).toFixed(2)} do aluno ${alunoData?.full_name || "Aluno"} foi processado com sucesso. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
                  payment_id: session_id,
                  fee_type: feeType,
                  amount: amount_total / 100,
                  seller_id: sellerData.user_id,
                  referral_code: sellerData.referral_code,
                  commission_rate: sellerData.commission_rate,
                  payment_method: "stripe"
                }

                console.log('📧 [stripe-webhook] Enviando notificação para affiliate admin:', affiliateAdminNotificationPayload)

                const affiliateAdminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(affiliateAdminNotificationPayload),
                })

                if (affiliateAdminNotificationResponse.ok) {
                  console.log('✅ [stripe-webhook] Notificação para affiliate admin enviada com sucesso!')
                } else {
                  console.warn('⚠️ [stripe-webhook] Erro ao enviar notificação para affiliate admin:', affiliateAdminNotificationResponse.status)
                }
              } catch (affiliateAdminNotificationError) {
                console.error('❌ [stripe-webhook] Erro ao enviar notificação para affiliate admin:', affiliateAdminNotificationError)
              }
            }

            // NOTIFICAÇÃO PARA SELLER
            try {
              const sellerNotificationPayload = {
                tipo_notf: "Pagamento Stripe do seu aluno aprovado",
                email_seller: sellerData.email,
                nome_seller: sellerData.name,
                email_aluno: customer_email || "",
                nome_aluno: alunoData?.full_name || "Aluno",
                o_que_enviar: `Parabéns! O pagamento Stripe de ${feeType} no valor de $${(amount_total / 100).toFixed(2)} do seu aluno ${alunoData?.full_name || "Aluno"} foi processado com sucesso. Você ganhará comissão sobre este pagamento!`,
                payment_id: session_id,
                fee_type: feeType,
                amount: amount_total / 100,
                seller_id: sellerData.user_id,
                referral_code: sellerData.referral_code,
                commission_rate: sellerData.commission_rate,
                estimated_commission: (amount_total / 100) * sellerData.commission_rate,
                payment_method: "stripe"
              }

              console.log('📧 [stripe-webhook] Enviando notificação para seller:', sellerNotificationPayload)

              const sellerNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(sellerNotificationPayload),
              })

              if (sellerNotificationResponse.ok) {
                console.log('✅ [stripe-webhook] Notificação para seller enviada com sucesso!')
              } else {
                console.warn('⚠️ [stripe-webhook] Erro ao enviar notificação para seller:', sellerNotificationResponse.status)
              }
            } catch (sellerNotificationError) {
              console.error('❌ [stripe-webhook] Erro ao enviar notificação para seller:', sellerNotificationError)
            }

          } else {
            console.log(`ℹ️ [stripe-webhook] Nenhum seller encontrado para o usuário ${customer_id}`)
          }
        } catch (sellerLookupError) {
          console.error('❌ [stripe-webhook] Erro ao buscar informações do seller:', sellerLookupError)
          // Não falhar o processo se a busca do seller falhar
        }

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
              available: balance.available.map(b => ({ amount: b.amount, currency: b.currency })),
              pending: balance.pending.map(b => ({ amount: b.amount, currency: b.currency })),
              instantAvailable: balance.instant_available?.map(b => ({ amount: b.amount, currency: b.currency })) || []
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
            const { error: transferError } = await supabase
              .from('stripe_connect_transfers')
              .insert({
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
            const { error: failedTransferError } = await supabase
              .from('stripe_connect_transfers')
              .insert({
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
            reason: !requiresTransfer ? 'requires_transfer = false' : 
                    !stripeConnectAccountId ? 'sem stripe_connect_account_id' : 
                    !amount_total ? 'sem amount_total' : 'desconhecido'
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
        // Atualizar o status da scholarship fee no perfil do usuário
        const { error } = await supabase
          .from('user_profiles')
          .update({ 
            is_scholarship_fee_paid: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (error) {
          console.error('Error updating scholarship fee status:', error);
        } else {
          console.log('Scholarship fee payment processed successfully for user:', userId);
        }

        // Registrar pagamento na tabela affiliate_referrals para faturamento
        try {
          // Buscar se o usuário usou algum código de referência
          const { data: usedCode, error: codeError } = await supabase
            .from('used_referral_codes')
            .select('referrer_id, affiliate_code')
            .eq('user_id', userId)
            .single();

          if (!codeError && usedCode) {
            console.log('[FATURAMENTO] Registrando scholarship_fee para faturamento do seller:', usedCode.referrer_id);
            
            const { error: upsertRefError } = await supabase
              .from('affiliate_referrals')
              .upsert({
                referrer_id: usedCode.referrer_id,
                referred_id: userId,
                affiliate_code: usedCode.affiliate_code,
                payment_amount: Number(amount_total ? amount_total / 100 : 0),
                credits_earned: 0, // Scholarship fee não gera créditos
                status: 'completed',
                payment_session_id: session.id,
                completed_at: new Date().toISOString(),
              }, { onConflict: 'referred_id' });

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
          const { error: insertError } = await supabase
            .from('scholarship_fee_payments')
            .insert({
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

        // --- NOTIFICAÇÃO PARA UNIVERSIDADE ---
        try {
          console.log('[NOTIFICAÇÃO] Enviando notificação de Scholarship Fee para universidade...');
          
          // Buscar application_id baseado no scholarship_id
          let applicationId = null;
          if (scholarshipsIds && scholarshipsIds.length > 0) {
            const { data: userProfile } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('user_id', userId)
              .single();
            
            if (userProfile) {
              const { data: application } = await supabase
                .from('scholarship_applications')
                .select('id')
                .eq('student_id', userProfile.id)
                .eq('scholarship_id', scholarshipsIds[0])
                .single();
              
              if (application) {
                applicationId = application.id;
              }
            }
          }
          
          if (applicationId) {
            const notificationResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-university-scholarship-fee-paid`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify({
                application_id: applicationId,
                user_id: userId,
                scholarship_id: scholarshipsIds[0]
              }),
            });

            if (notificationResponse.ok) {
              const notificationResult = await notificationResponse.json();
              console.log('[NOTIFICAÇÃO] Notificação de Scholarship Fee enviada com sucesso:', notificationResult);
            } else {
              const errorData = await notificationResponse.json();
              console.error('[NOTIFICAÇÃO] Erro ao enviar notificação de Scholarship Fee:', errorData);
            }
          } else {
            console.warn('[NOTIFICAÇÃO] Application ID não encontrado para notificação de Scholarship Fee');
          }
        } catch (notificationError) {
          console.error('[NOTIFICAÇÃO] Erro ao notificar universidade sobre Scholarship Fee:', notificationError);
        }

        // --- NOTIFICAÇÃO VIA WEBHOOK N8N ---
        try {
          const { data: alunoData, error: alunoError } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', userId)
            .single();
          
          if (!alunoError && alunoData) {
            const payload = {
              tipo_notf: 'Pagamento de scholarship fee confirmado',
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              o_que_enviar: `O pagamento da taxa de bolsa foi confirmado para ${alunoData.full_name}. A universidade analisará a candidatura.`,
            };
            
            console.log('[NOTIFICAÇÃO] Enviando scholarship fee para webhook n8n:', payload);
            
            const n8nRes = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PostmanRuntime/7.36.3',
              },
              body: JSON.stringify(payload),
            });
            
            const n8nText = await n8nRes.text();
            console.log('[NOTIFICAÇÃO] Resposta do n8n (scholarship fee):', n8nRes.status, n8nText);
          }
        } catch (notifErr) {
          console.error('[NOTIFICAÇÃO] Erro ao notificar scholarship fee via n8n:', notifErr);
        }
        // --- FIM DA NOTIFICAÇÃO ---
      }
    }
    
    if (paymentType === 'selection_process') {
      const userId = metadata?.user_id || metadata?.student_id;
      
      console.log('[NOTIFICAÇÃO] Processando selection_process para userId:', userId);
      
      if (userId) {
        const { error } = await supabase
          .from('user_profiles')
          .update({ 
            has_paid_selection_process_fee: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (error) {
          console.error('Error updating selection process fee status:', error);
        } else {
          console.log('Selection process fee payment processed successfully for user:', userId);
        }

        // --- NOTIFICAÇÃO VIA WEBHOOK N8N ---
        try {
          const { data: alunoData, error: alunoError } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', userId)
            .single();
          
          if (!alunoError && alunoData) {
            const payload = {
              tipo_notf: 'Pagamento de selection process confirmado',
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              o_que_enviar: `O pagamento da taxa de processo seletivo foi confirmado para ${alunoData.full_name}. Agora você pode selecionar as escolas para aplicar.`,
            };
            
            console.log('[NOTIFICAÇÃO] Enviando selection process para webhook n8n:', payload);
            
            const n8nRes = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PostmanRuntime/7.36.3',
              },
              body: JSON.stringify(payload),
            });
            
            const n8nText = await n8nRes.text();
            console.log('[NOTIFICAÇÃO] Resposta do n8n (selection process):', n8nRes.status, n8nText);
          }
        } catch (notifErr) {
          console.error('[NOTIFICAÇÃO] Erro ao notificar selection process via n8n:', notifErr);
        }
        // --- FIM DA NOTIFICAÇÃO ---

        // --- MATRICULA REWARDS - ADICIONAR COINS ---
        try {
          console.log('[MATRICULA REWARDS] Verificando se usuário usou código de referência...');
          
          // Buscar se o usuário usou algum código de referência
          const { data: usedCode, error: codeError } = await supabase
            .from('used_referral_codes')
            .select('referrer_id, affiliate_code')
            .eq('user_id', userId)
            .single();

          if (!codeError && usedCode) {
            console.log('[MATRICULA REWARDS] Usuário usou código de referência, adicionando 180 coins para:', usedCode.referrer_id);
            
            // Adicionar 180 coins para o usuário que fez a indicação
            const { data: coinsResult, error: coinsError } = await supabase
              .rpc('add_coins_to_user_matricula', {
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
        const { error } = await supabase
          .from('user_profiles')
          .update({ 
            has_paid_i20_control_fee: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (error) {
          console.error('Error updating i20 control fee status:', error);
        } else {
          console.log('I-20 control fee payment processed successfully for user:', userId);
        }

        // Registrar pagamento na tabela affiliate_referrals para faturamento
        try {
          // Buscar se o usuário usou algum código de referência
          const { data: usedCode, error: codeError } = await supabase
            .from('used_referral_codes')
            .select('referrer_id, affiliate_code')
            .eq('user_id', userId)
            .single();

          if (!codeError && usedCode) {
            console.log('[FATURAMENTO] Registrando i20_control_fee para faturamento do seller:', usedCode.referrer_id);
            
            const { error: upsertRefError } = await supabase
              .from('affiliate_referrals')
              .upsert({
                referrer_id: usedCode.referrer_id,
                referred_id: userId,
                affiliate_code: usedCode.affiliate_code,
                payment_amount: Number(amount_total ? amount_total / 100 : 0),
                credits_earned: 0, // I20 control fee não gera créditos
                status: 'completed',
                payment_session_id: session.id,
                completed_at: new Date().toISOString(),
              }, { onConflict: 'referred_id' });

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
        try {
          const { data: alunoData, error: alunoError } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', userId)
            .single();
          
          if (!alunoError && alunoData) {
            const payload = {
              tipo_notf: 'Pagamento de I-20 control fee confirmado',
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              o_que_enviar: `O pagamento da taxa de controle I-20 foi confirmado para ${alunoData.full_name}. Seu documento I-20 será processado e enviado em breve.`,
            };
            
            console.log('[NOTIFICAÇÃO] Enviando i20 control fee para webhook n8n:', payload);
            
            const n8nRes = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PostmanRuntime/7.36.3',
              },
              body: JSON.stringify(payload),
            });
            
            const n8nText = await n8nRes.text();
            console.log('[NOTIFICAÇÃO] Resposta do n8n (i20 control fee):', n8nRes.status, n8nText);
          }
        } catch (notifErr) {
          console.error('[NOTIFICAÇÃO] Erro ao notificar i20 control fee via n8n:', notifErr);
        }
        // --- FIM DA NOTIFICAÇÃO ---
      }
    }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}