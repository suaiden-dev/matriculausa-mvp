import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
// Configurações do MailerSend
const mailerSendApiKey = 'mlsn.b2e23b41cf2afd47427c4cd02eb718ca04baaa4e18b2b4ef835ff1f88f4c93b8'; // Token real do MailerSend
const mailerSendUrl = 'https://api.mailersend.com/v1/email';
const fromEmail = 'support@matriculausa.com';
const fromName = 'Matrícula USA';

const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Função para enviar e-mail via MailerSend
async function sendEmail(paymentData: {
  eventType: 'payment_success' | 'payment_failed';
  userEmail: string;
  userName: string;
  paymentAmount: number;
  paymentType: string;
  sessionId: string;
  origin: string;
}) {
  try {
    console.log('[MailerSend] Enviando e-mail:', paymentData);
    
    let subject = '';
    let htmlContent = '';
    
    if (paymentData.eventType === 'payment_success') {
      switch (paymentData.paymentType) {
        case 'selection_process':
          subject = 'Payment successful - Selective process';
          htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Payment successful - Selective process</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9f9f9;color:#333}.wrapper{max-width:600px;margin:0 auto;background-color:#fff}.header{background-color:#0052cc;padding:20px;text-align:center}.header img{max-width:120px;height:auto}.content{padding:20px}.footer{padding:15px;background-color:#f0f0f0;text-align:center;font-size:12px;color:#777}a{color:#0052cc;text-decoration:none}@media screen and (max-width:600px){.wrapper{width:100%!important}}</style></head><body><div class="wrapper"><div class="header"><img src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/logo%20matriculaUSA.jpg" alt="Matrícula USA" style="max-width:120px;height:auto;"></div><div class="content"><strong>🎓 Payment successful - Selective process</strong><br><br><p>Hello ' + paymentData.userName + ',</p><p>Your payment was successfully processed.</p><p>📚 The next step is to select the schools to which you want to apply for enrollment.</p><p>This step is essential to proceed with your application.</p><p><strong>Please do not reply to this email.</strong></p><br><p>Best regards,<br><strong>Matrícula USA</strong><br><a href="https://matriculausa.com/">https://matriculausa.com/</a></p></div><div class="footer">You are receiving this message because you registered on the Matrícula USA platform.<br>© 2025 Matrícula USA. All rights reserved.</div></div></body></html>';
          break;
        case 'application_fee':
          subject = 'Application Fee Payment Confirmed';
          htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Application Fee Payment Confirmed</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9f9f9;color:#333}.wrapper{max-width:600px;margin:0 auto;background-color:#fff}.header{background-color:#0052cc;padding:20px;text-align:center}.header img{max-width:120px;height:auto}.content{padding:20px}.footer{padding:15px;background-color:#f0f0f0;text-align:center;font-size:12px;color:#777}a{color:#0052cc;text-decoration:none}@media screen and (max-width:600px){.wrapper{width:100%!important}}</style></head><body><div class="wrapper"><div class="header"><img src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/logo%20matriculaUSA.jpg" alt="Matrícula USA" style="max-width:120px;height:auto;"></div><div class="content"><strong>✅ Application Fee Payment Confirmed</strong><br><br><p>Hello ' + paymentData.userName + ',</p><p>Your application fee payment was successful.</p><p>To continue, please pay the Scholarship Fee to advance your application process.</p><p><strong>Please do not reply to this email.</strong></p><br><p>Best regards,<br><strong>Matrícula USA</strong><br><a href="https://matriculausa.com/">https://matriculausa.com/</a></p></div><div class="footer">You are receiving this message because you registered on the Matrícula USA platform.<br>© 2025 Matrícula USA. All rights reserved.</div></div></body></html>';
          break;
        case 'scholarship_fee':
          subject = 'Scholarship Fee Payment Confirmed';
          htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Scholarship Fee Payment Confirmed</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9f9f9;color:#333}.wrapper{max-width:600px;margin:0 auto;background-color:#fff}.header{background-color:#0052cc;padding:20px;text-align:center}.header img{max-width:120px;height:auto}.content{padding:20px}.footer{padding:15px;background-color:#f0f0f0;text-align:center;font-size:12px;color:#777}a{color:#0052cc;text-decoration:none}@media screen and (max-width:600px){.wrapper{width:100%!important}}</style></head><body><div class="wrapper"><div class="header"><img src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/logo%20matriculaUSA.jpg" alt="Matrícula USA" style="max-width:120px;height:auto;"></div><div class="content"><strong>🎓 Scholarship Fee Payment Confirmed</strong><br><br><p>Hello ' + paymentData.userName + ',</p><p>Your scholarship fee payment was successful.</p><p>The university will now analyze your application. You will be notified by email once a decision is made.</p><p><strong>Please do not reply to this email.</strong></p><br><p>Best regards,<br><strong>Matrícula USA</strong><br><a href="https://matriculausa.com/">https://matriculausa.com/</a></p></div><div class="footer">You are receiving this message because you registered on the Matrícula USA platform.<br>© 2025 Matrícula USA. All rights reserved.</div></div></body></html>';
          break;
        case 'i20_control_fee':
          subject = 'I-20 Control Fee Payment Confirmed';
          htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>I-20 Control Fee Payment Confirmed</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9f9f9;color:#333}.wrapper{max-width:600px;margin:0 auto;background-color:#fff}.header{background-color:#0052cc;padding:20px;text-align:center}.header img{max-width:120px;height:auto}.content{padding:20px}.footer{padding:15px;background-color:#f0f0f0;text-align:center;font-size:12px;color:#777}a{color:#0052cc;text-decoration:none}@media screen and (max-width:600px){.wrapper{width:100%!important}}</style></head><body><div class="wrapper"><div class="header"><img src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/logo%20matriculaUSA.jpg" alt="Matrícula USA" style="max-width:120px;height:auto;"></div><div class="content"><strong>📄 I-20 Control Fee Payment Confirmed</strong><br><br><p>Hello ' + paymentData.userName + ',</p><p>Your I-20 control fee payment was successful.</p><p>Your I-20 document will be processed and sent to you soon. Please monitor your email for updates.</p><p><strong>Please do not reply to this email.</strong></p><br><p>Best regards,<br><strong>Matrícula USA</strong><br><a href="https://matriculausa.com/">https://matriculausa.com/</a></p></div><div class="footer">You are receiving this message because you registered on the Matrícula USA platform.<br>© 2025 Matrícula USA. All rights reserved.</div></div></body></html>';
          break;
        default:
          subject = 'Payment successful';
          htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Payment successful</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9f9f9;color:#333}.wrapper{max-width:600px;margin:0 auto;background-color:#fff}.header{background-color:#0052cc;padding:20px;text-align:center}.header img{max-width:120px;height:auto}.content{padding:20px}.footer{padding:15px;background-color:#f0f0f0;text-align:center;font-size:12px;color:#777}a{color:#0052cc;text-decoration:none}@media screen and (max-width:600px){.wrapper{width:100%!important}}</style></head><body><div class="wrapper"><div class="header"><img src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/logo%20matriculaUSA.jpg" alt="Matrícula USA" style="max-width:120px;height:auto;"></div><div class="content"><strong>💳 Payment successful</strong><br><br><p>Hello ' + paymentData.userName + ',</p><p>Your payment was successfully processed.</p><p><strong>Please do not reply to this email.</strong></p><br><p>Best regards,<br><strong>Matrícula USA</strong><br><a href="https://matriculausa.com/">https://matriculausa.com/</a></p></div><div class="footer">You are receiving this message because you registered on the Matrícula USA platform.<br>© 2025 Matrícula USA. All rights reserved.</div></div></body></html>';
      }
    } else {
      subject = 'Payment failed – Action required';
      htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Payment failed – Action required</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9f9f9;color:#333}.wrapper{max-width:600px;margin:0 auto;background-color:#fff}.header{background-color:#0052cc;padding:20px;text-align:center}.header img{max-width:120px;height:auto}.content{padding:20px}.footer{padding:15px;background-color:#f0f0f0;text-align:center;font-size:12px;color:#777}a{color:#0052cc;text-decoration:none}@media screen and (max-width:600px){.wrapper{width:100%!important}}</style></head><body><div class="wrapper"><div class="header"><img src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/logo%20matriculaUSA.jpg" alt="Matrícula USA" style="max-width:120px;height:auto;"></div><div class="content"><strong>❗ Payment failed – Action required</strong><br><br><p>Hello ' + paymentData.userName + ',</p><p>Unfortunately, we were not able to complete your payment.</p><p>This may have occurred due to an issue with your card or payment provider.</p><p>To resolve this, please contact our support team so we can assist you directly.</p><p>💬 <strong><a href="https://matriculausa.com/support">Click here to talk to our team</a></strong></p><p>We\'re here to help you complete your enrollment process.</p><p><strong>Please do not reply to this email.</strong></p><br><p>Best regards,<br><strong>Matrícula USA</strong><br><a href="https://matriculausa.com/">https://matriculausa.com/</a></p></div><div class="footer">You are receiving this message because you registered on the Matrícula USA platform.<br>© 2025 Matrícula USA. All rights reserved.</div></div></body></html>';
    }
    
    const response = await fetch(mailerSendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mailerSendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { email: fromEmail, name: fromName },
        to: [{ email: paymentData.userEmail, name: paymentData.userName }],
        subject,
        html: htmlContent,
      }),
    });
    console.log('[MailerSend] Status da resposta:', response.status, response.statusText);
    // Só tenta fazer .json() se o status não for 202 e houver corpo
    let result = null;
    if (response.status !== 202) {
      try {
        result = await response.json();
      } catch (e) {
        console.warn('[MailerSend] Corpo da resposta não é JSON:', e);
      }
    }
    return result;
  } catch (error) {
    console.error('[MailerSend] Erro ao enviar e-mail:', error);
    // Não vamos falhar o webhook por causa do e-mail
    return null;
  }
}

// Função para buscar dados do usuário
async function getUserData(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('user_id', userId)
      .single();
    if (error) {
      console.warn('[stripe-webhook] Erro ao buscar dados do usuário:', error);
      return { email: '', name: 'Usuário' };
    }
    // Ajustar para retornar o nome correto
    return { email: data.email, name: data.full_name || 'Usuário' };
  } catch (err) {
    console.error('[stripe-webhook] Erro inesperado ao buscar dados do usuário:', err);
    return { email: '', name: 'Usuário' };
  }
}

// Função para notificar endpoint externo sobre o pagamento do processo seletivo
async function notifySelectionProcessWebhook({
  userName,
  userEmail,
  content,
  tipo_notif = 'pagamento_processo_seletivo',
  maxRetries = 2,
  origin: paymentOrigin,
}: {
  userName: string;
  userEmail: string;
  content: string;
  tipo_notif?: string;
  maxRetries?: number;
  origin: string;
}) {
  const url = 'https://nwh.suaiden.com/webhook/notfmatriculausa';
  const body = {
    'nome aluno': userName,
    'email_aluno': userEmail,
    'contente': content,
    'tipo_notif': tipo_notif,
    'origin': paymentOrigin,
  };
  let attempt = 0;
  let lastError = null;
  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Status: ${response.status} - ${errorText}`);
      }
      console.log(`[Webhook] Notificação enviada com sucesso para ${url}`);
      return true;
    } catch (err) {
      lastError = err;
      console.error(`[Webhook] Erro ao enviar notificação (tentativa ${attempt + 1}):`, err);
      attempt++;
    }
  }
  console.error('[Webhook] Falha ao notificar endpoint externo após múltiplas tentativas:', lastError);
  return false;
}

// Função para verificar assinatura Stripe manualmente (Deno/Supabase Edge)
async function verifyStripeSignature(payload, sigHeader, secret) {
  try {
    if (!sigHeader) {
      console.error('[stripe-webhook] Stripe signature header ausente!');
      return false;
    }
    const encoder = new TextEncoder();
    // Stripe envia múltiplas assinaturas, pegue t=... e v1=...
    const parts = sigHeader.split(',').map(s => s.trim());
    let timestamp = '';
    let signature = '';
    for (const part of parts) {
      if (part.startsWith('t=')) timestamp = part.replace('t=', '');
      if (part.startsWith('v1=')) signature = part.replace('v1=', '');
  }
    if (!timestamp || !signature) {
      console.error('[stripe-webhook] Não foi possível extrair timestamp ou assinatura do header:', sigHeader);
      return false;
    }
    const signedPayload = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    );
    const signatureHex = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    // Compare assinatura calculada com a recebida
    const isValid = signatureHex === signature;
    if (!isValid) {
      console.error('[stripe-webhook] Assinatura Stripe inválida!');
    }
    return isValid;
  } catch (err) {
    console.error('[stripe-webhook] Erro ao verificar assinatura Stripe:', err);
    return false;
    }
}

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
    await handleEvent(event);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error('[stripe-webhook] Erro inesperado no handler:', err);
    return new Response(JSON.stringify({ error: 'Internal server error.' }), { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  console.log('[stripe-webhook] handleEvent called with event:', JSON.stringify(event, null, 2));
  const stripeData = event?.data?.object ?? {};
  console.log('[stripe-webhook] stripeData:', JSON.stringify(stripeData, null, 2));

  // Só processa envio de e-mail para checkout.session.completed
    if (event.type === 'checkout.session.completed') {
    console.log('[stripe-webhook] Evento checkout.session.completed recebido!');
    // --- Bloco de envio de e-mail e atualização de status ---
    const metadata = stripeData.metadata || {};
    const { mode, payment_status } = stripeData;
    const amount_total = stripeData.amount_total;
    const session = stripeData;
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
        userData.email = session.customer_email || session.customer_details?.email || '';
        if (userData.email) {
          console.log('[stripe-webhook] E-mail extraído do evento Stripe:', userData.email);
        } else {
          console.warn('[stripe-webhook] Nenhum e-mail encontrado nem no banco nem no evento Stripe.');
        }
      }
      if (!userData.name || userData.name === 'Usuário') {
        userData.name = session.customer_details?.name || 'Usuário';
        if (userData.name && userData.name !== 'Usuário') {
          console.log('[stripe-webhook] Nome extraído do evento Stripe:', userData.name);
        }
      }
      // Referenciar corretamente o metadado de origem
    const paymentOrigin1 = metadata?.origin || 'site';
    console.log('[stripe-webhook] Metadado de origem do pagamento:', paymentOrigin1);
    // Log antes do envio de e-mail
      if (mailerSendApiKey && userData.email) {
      console.log('[stripe-webhook] Tentando enviar e-mail de confirmação para:', userData.email);
      const emailResult = await sendEmail({
          eventType: 'payment_success',
          userEmail: userData.email,
          userName: userData.name,
        paymentAmount: amount_total ? amount_total / 100 : 0,
          paymentType: metadata?.payment_type || metadata?.fee_type || 'unknown',
          sessionId: session.id,
        origin: paymentOrigin1
        });
      console.log('[stripe-webhook] Resultado do envio de e-mail:', emailResult);
    } else {
      console.warn('[stripe-webhook] Não foi possível enviar e-mail: mailerSendApiKey ou userData.email ausente.');
      }
    // --- Resto do processamento do evento (atualização de status, etc) ---
      // Aceitar tanto payment_type quanto fee_type
      const paymentType = metadata?.payment_type || metadata?.fee_type;
      if (paymentType === 'application_fee') {
        const userId = metadata.user_id || metadata.student_id;
        const applicationId = metadata.application_id;

        if (!userId || !applicationId) {
          console.error('Missing user_id or application_id in metadata for application_fee payment.');
          return;
        }

        // LOGS DETALHADOS PARA DEBUG
        console.log('[DEBUG] Tentando atualizar is_application_fee_paid:', { applicationId, userId });
        const { error: appFeePaidError, data: appFeePaidData } = await supabase
          .from('scholarship_applications')
          .update({ is_application_fee_paid: true })
          .eq('id', applicationId);
        console.log('[DEBUG] Resultado update is_application_fee_paid:', { appFeePaidError, appFeePaidData });
        if (appFeePaidError) {
          console.error(`[stripe-webhook] Failed to update is_application_fee_paid for application ${applicationId}:`, appFeePaidError);
        } else {
          console.log(`[stripe-webhook] is_application_fee_paid set to true for application ${applicationId}.`);
        }
      } else if (paymentType === 'scholarship_fee') {
        // Log detalhado do metadata recebido
        console.log('[stripe-webhook] Metadata recebido:', metadata);
        const applicationId = metadata.application_id;
        // Atualizar o campo de pagamento individual da scholarship fee
        console.log('[DEBUG] Tentando atualizar is_scholarship_fee_paid:', { applicationId });
        const { error: scholarshipFeePaidError, data: scholarshipFeePaidData } = await supabase
          .from('scholarship_applications')
          .update({ is_scholarship_fee_paid: true })
          .eq('id', applicationId);
        console.log('[DEBUG] Resultado update is_scholarship_fee_paid:', { scholarshipFeePaidError, scholarshipFeePaidData });
        if (scholarshipFeePaidError) {
          console.error(`[stripe-webhook] Failed to update is_scholarship_fee_paid for application ${applicationId}:`, scholarshipFeePaidError);
        } else {
          console.log(`[stripe-webhook] is_scholarship_fee_paid set to true for application ${applicationId}.`);
        }
      } else if (metadata?.payment_type === 'selection_process') {
        // Processar pagamento da taxa de processo seletivo ($350)
        const userId = metadata.user_id || metadata.student_id;
        let userData = { email: '', name: 'Usuário' };
        if (userId) {
          userData = await getUserData(userId);
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
        }
      }

      // NOVO: Processar indicação de afiliado se houver código
      const affiliateCode = metadata?.affiliate_code;
      if (affiliateCode && userId) {
        console.log('[stripe-webhook] Processando indicação de afiliado:', { affiliateCode, userId });
        try {
          const { data: referralResult, error: referralError } = await supabase
            .rpc('process_affiliate_referral', {
              affiliate_code_param: affiliateCode,
              referred_user_id_param: userId,
              payment_amount_param: amount_total ? amount_total / 100 : 0,
              payment_session_id_param: session.id
            });

          if (referralError) {
            console.error('[stripe-webhook] Erro ao processar indicação:', referralError);
          } else {
            console.log('[stripe-webhook] Indicação processada com sucesso:', referralResult);
            
            // Enviar notificação por e-mail para o referenciador
            if (referralResult) {
              await sendAffiliateNotification(affiliateCode, userId, 50); // $50 créditos
            }
          }
        } catch (error) {
          console.error('[stripe-webhook] Erro ao processar indicação de afiliado:', error);
        }
      }

      try {
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;
      // Definir variáveis necessárias para o insert
      const payment_intent = stripeData.payment_intent;
      const customerId = stripeData.customer || null;
      const payment_status = stripeData.payment_status || null;
        // Log para customerId null
        if (!customerId) {
          console.warn('[stripe-webhook] customer_id está null. Pagamento provavelmente de valor zero.');
        }
        // Buscar user_id válido
        let validUserId = null;
        if (userId) {
          // Verifica se existe no user_profiles (pode ser adaptado para consultar o Auth via API se necessário)
          const { data: userProfile, error: userProfileError } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('user_id', userId)
            .single();
          if (userProfile && userProfile.user_id) {
            validUserId = userProfile.user_id;
          } else {
            console.warn(`[stripe-webhook] user_id ${userId} não encontrado em user_profiles. O campo user_id será null no pedido.`);
          }
        }
        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId, // agora pode ser null
          user_id: validUserId, // só preenche se for válido
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed',
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing payment:', error);
      }
    }
  }
}

// NOVA: Função para enviar notificação de afiliado
async function sendAffiliateNotification(affiliateCode: string, referredUserId: string, creditsEarned: number) {
  try {
    // Busca dados do referenciador
    const { data: affiliateCodeData } = await supabase
      .from('affiliate_codes')
      .select('user_id')
      .eq('code', affiliateCode)
      .single();

    if (!affiliateCodeData) {
      console.log('[affiliate-notification] Código de afiliado não encontrado:', affiliateCode);
      return;
    }

    // Busca dados do usuário referenciador
    const { data: referrerData } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', affiliateCodeData.user_id)
      .single();

    // Busca dados do usuário referenciado
    const { data: referredData } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', referredUserId)
      .single();

    if (!referrerData || !referredData) {
      console.log('[affiliate-notification] Dados do usuário não encontrados');
      return;
    }

    // Busca e-mail do referenciador
    const { data: userData } = await supabase.auth.admin.getUserById(affiliateCodeData.user_id);
    
    if (!userData.user?.email) {
      console.log('[affiliate-notification] E-mail do referenciador não encontrado');
      return;
    }

    // Envia e-mail de notificação
    const emailResult = await sendEmail({
      eventType: 'payment_success',
      userEmail: userData.user.email,
      userName: referrerData.full_name || 'Usuário',
      paymentAmount: creditsEarned,
      paymentType: 'affiliate_referral',
      sessionId: 'affiliate-system',
      origin: 'affiliate'
    });

    console.log('[affiliate-notification] E-mail enviado com sucesso:', emailResult);
  } catch (error) {
    console.error('[affiliate-notification] Erro ao enviar notificação:', error);
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // TODO verify if needed
    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}

export default async function handler(req: Request) {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Verificar se é um pagamento da taxa de inscrição
        if (session.metadata?.payment_type === 'application_fee') {
          const userId = session.metadata?.user_id;
          const applicationId = session.metadata?.application_id;
          
          if (userId && applicationId) {
            // Atualizar o status da aplicação existente para 'under_review'
            const { error } = await supabase
              .from('scholarship_applications')
              .update({ 
                status: 'under_review',
                updated_at: new Date().toISOString()
              })
              .eq('id', applicationId)
              .eq('student_id', userId);

            if (error) {
              console.error('Error updating application status:', error);
            } else {
              console.log('Application fee payment processed successfully for user:', userId);
            }
          }
        }
        
        // Novo: Verificar se é um pagamento da scholarship fee
        if (session.metadata?.payment_type === 'scholarship_fee') {
          const userId = session.metadata?.user_id;
          const scholarshipsIds = session.metadata?.scholarships_ids;
          const paymentIntentId = session.payment_intent;
          
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
          }
        }
        
        // Processar outros tipos de pagamento (como a taxa de processo seletivo)
        if (session.metadata?.payment_type === 'selection_process') {
          const userId = session.metadata?.user_id;
          
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
            }
          }
        }
        break;

      // ... handle other events as needed ...
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook error', { status: 500 });
  }
}