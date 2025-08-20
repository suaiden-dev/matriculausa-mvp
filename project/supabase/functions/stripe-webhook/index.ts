import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// Validação das variáveis de ambiente obrigatórias
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const mailerSendApiKey = Deno.env.get('MAILERSEND_API_KEY');

if (!stripeSecret || !stripeWebhookSecret || !mailerSendApiKey) {
  throw new Error('Missing required environment variables: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, or MAILERSEND_API_KEY');
}

// Configurações do MailerSend com fallbacks
const mailerSendUrl = Deno.env.get('MAILERSEND_URL') || 'https://api.mailersend.com/v1/email';
const fromEmail = Deno.env.get('FROM_EMAIL') || 'support@matriculausa.com';
const fromName = Deno.env.get('FROM_NAME') || 'Matrícula USA';

// Configurações adicionais para templates de email
const companyName = Deno.env.get('COMPANY_NAME') || 'Matrícula USA';
const companyWebsite = Deno.env.get('COMPANY_WEBSITE') || 'https://matriculausa.com/';
const companyLogo = Deno.env.get('COMPANY_LOGO') || 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/logo%20matriculaUSA.jpg';
const supportEmail = Deno.env.get('SUPPORT_EMAIL') || 'support@matriculausa.com';

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
          htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Payment successful - Selective process</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9f9f9;color:#333}.wrapper{max-width:600px;margin:0 auto;background-color:#fff}.header{background-color:#0052cc;padding:20px;text-align:center}.header img{max-width:120px;height:auto}.content{padding:20px}.footer{padding:15px;background-color:#f0f0f0;text-align:center;font-size:12px;color:#777}a{color:#0052cc;text-decoration:none}@media screen and (max-width:600px){.wrapper{width:100%!important}}</style></head><body><div class="wrapper"><div class="header"><img src="' + companyLogo + '" alt="' + companyName + '" style="max-width:120px;height:auto;"></div><div class="content"><strong>🎓 Payment successful - Selective process</strong><br><br><p>Hello ' + paymentData.userName + ',</p><p>Your payment was successfully processed.</p><p>📚 The next step is to select the schools to which you want to apply for enrollment.</p><p>This step is essential to proceed with your application.</p><p><strong>Please do not reply to this email.</strong></p><br><p>Best regards,<br><strong>' + companyName + '</strong><br><a href="' + companyWebsite + '">' + companyWebsite + '</a></p></div><div class="footer">You are receiving this message because you registered on the ' + companyName + ' platform.<br>© 2025 ' + companyName + '. All rights reserved.</div></div></body></html>';
          break;
        case 'application_fee':
          subject = 'Application Fee Payment Confirmed';
          htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Application Fee Payment Confirmed</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9f9f9;color:#333}.wrapper{max-width:600px;margin:0 auto;background-color:#fff}.header{background-color:#0052cc;padding:20px;text-align:center}.header img{max-width:120px;height:auto}.content{padding:20px}.footer{padding:15px;background-color:#f0f0f0;text-align:center;font-size:12px;color:#777}a{color:#0052cc;text-decoration:none}@media screen and (max-width:600px){.wrapper{width:100%!important}}</style></head><body><div class="wrapper"><div class="header"><img src="' + companyLogo + '" alt="' + companyName + '" style="max-width:120px;height:auto;"></div><div class="content"><strong>✅ Application Fee Payment Confirmed</strong><br><br><p>Hello ' + paymentData.userName + ',</p><p>Your application fee payment was successful.</p><p>To continue, please pay the Scholarship Fee to advance your application process.</p><p><strong>Please do not reply to this email.</strong></p><br><p>Best regards,<br><strong>' + companyName + '</strong><br><a href="' + companyWebsite + '">' + companyWebsite + '</a></p></div><div class="footer">You are receiving this message because you registered on the ' + companyName + ' platform.<br>© 2025 ' + companyName + '. All rights reserved.</div></div></body></html>';
          break;
        case 'scholarship_fee':
          subject = 'Scholarship Fee Payment Confirmed';
          htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Scholarship Fee Payment Confirmed</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9f9f9;color:#333}.wrapper{max-width:600px;margin:0 auto;background-color:#fff}.header{background-color:#0052cc;padding:20px;text-align:center}.header img{max-width:120px;height:auto}.content{padding:20px}.footer{padding:15px;background-color:#f0f0f0;text-align:center;font-size:12px;color:#777}a{color:#0052cc;text-decoration:none}@media screen and (max-width:600px){.wrapper{width:100%!important}}</style></head><body><div class="wrapper"><div class="header"><img src="' + companyLogo + '" alt="' + companyName + '" style="max-width:120px;height:auto;"></div><div class="content"><strong>🎓 Scholarship Fee Payment Confirmed</strong><br><br><p>Hello ' + paymentData.userName + ',</p><p>Your scholarship fee payment was successful.</p><p>The university will now analyze your application. You will be notified by email once a decision is made.</p><p><strong>Please do not reply to this email.</strong></p><br><p>Best regards,<br><strong>' + companyName + '</strong><br><a href="' + companyWebsite + '">' + companyWebsite + '</a></p></div><div class="footer">You are receiving this message because you registered on the ' + companyName + ' platform.<br>© 2025 ' + companyName + '. All rights reserved.</div></div></body></html>';
          break;
        case 'i20_control_fee':
          subject = 'I-20 Control Fee Payment Confirmed';
          htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>I-20 Control Fee Payment Confirmed</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9f9f9;color:#333}.wrapper{max-width:600px;margin:0 auto;background-color:#fff}.header{background-color:#0052cc;padding:20px;text-align:center}.header img{max-width:120px;height:auto}.content{padding:20px}.footer{padding:15px;background-color:#f0f0f0;text-align:center;font-size:12px;color:#777}a{color:#0052cc;text-decoration:none}@media screen and (max-width:600px){.wrapper{width:100%!important}}</style></head><body><div class="wrapper"><div class="header"><img src="' + companyLogo + '" alt="' + companyName + '" style="max-width:120px;height:auto;"></div><div class="content"><strong>📄 I-20 Control Fee Payment Confirmed</strong><br><br><p>Hello ' + paymentData.userName + ',</p><p>Your I-20 control fee payment was successful.</p><p>Your I-20 document will be processed and sent to you soon. Please monitor your email for updates.</p><p><strong>Please do not reply to this email.</strong></p><br><p>Best regards,<br><strong>' + companyName + '</strong><br><a href="' + companyWebsite + '">' + companyWebsite + '</a></p></div><div class="footer">You are receiving this message because you registered on the ' + companyName + ' platform.<br>© 2025 ' + companyName + '. All rights reserved.</div></div></body></html>';
          break;
        default:
          subject = 'Payment successful';
          htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Payment successful</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9f9f9;color:#333}.wrapper{max-width:600px;margin:0 auto;background-color:#fff}.header{background-color:#0052cc;padding:20px;text-align:center}.header img{max-width:120px;height:auto}.content{padding:20px}.footer{padding:15px;background-color:#f0f0f0;text-align:center;font-size:12px;color:#777}a{color:#0052cc;text-decoration:none}@media screen and (max-width:600px){.wrapper{width:100%!important}}</style></head><body><div class="wrapper"><div class="header"><img src="' + companyLogo + '" alt="' + companyName + '" style="max-width:120px;height:auto;"></div><div class="content"><strong>💳 Payment successful</strong><br><br><p>Hello ' + paymentData.userName + ',</p><p>Your payment was successfully processed.</p><p><strong>Please do not reply to this email.</strong></p><br><p>Best regards,<br><strong>' + companyName + '</strong><br><a href="' + companyWebsite + '">' + companyWebsite + '</a></p></div><div class="footer">You are receiving this message because you registered on the ' + companyName + ' platform.<br>© 2025 ' + companyName + '. All rights reserved.</div></div></body></html>';
      }
    } else {
      subject = 'Payment failed – Action required';
      htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Payment failed – Action required</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background-color:#f9f9f9;color:#333}.wrapper{max-width:600px;margin:0 auto;background-color:#fff}.header{background-color:#0052cc;padding:20px;text-align:center}.header img{max-width:120px;height:auto}.content{padding:20px}.footer{padding:15px;background-color:#f0f0f0;text-align:center;font-size:12px;color:#777}a{color:#0052cc;text-decoration:none}@media screen and (max-width:600px){.wrapper{width:100%!important}}</style></head><body><div class="wrapper"><div class="header"><img src="' + companyLogo + '" alt="' + companyName + '" style="max-width:120px;height:auto;"></div><div class="content"><strong>❗ Payment failed – Action required</strong><br><br><p>Hello ' + paymentData.userName + ',</p><p>Unfortunately, we were not able to complete your payment.</p><p>This may have occurred due to an issue with your card or payment provider.</p><p>To resolve this, please contact our support team so we can assist you directly.</p><p>💬 <strong><a href="' + companyWebsite + 'support">Click here to talk to our team</a></strong></p><p>We\'re here to help you complete your enrollment process.</p><p><strong>Please do not reply to this email.</strong></p><br><p>Best regards,<br><strong>' + companyName + '</strong><br><a href="' + companyWebsite + '">' + companyWebsite + '</a></p></div><div class="footer">You are receiving this message because you registered on the ' + companyName + ' platform.<br>© 2025 ' + companyName + '. All rights reserved.</div></div></body></html>';
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

// Função para verificar assinatura Stripe
async function verifyStripeSignature(body: string, signature: string | null, secret: string): Promise<boolean> {
  try {
    if (!signature) {
      console.error('[stripe-webhook] Assinatura Stripe ausente!');
      return false;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(body);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA256' },
      false,
      ['sign']
    );
    const signedData = await crypto.subtle.sign('HMAC', key, data);
    const signatureHex = Array.from(new Uint8Array(signedData))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

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
    
    await handleEvent(event);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error('[stripe-webhook] Erro inesperado no handler:', err);
    return new Response(JSON.stringify({ error: 'Internal server error.' }), { status: 500 });
  }
});

// Função para processar eventos Stripe
async function handleEvent(event: Stripe.Event) {
  console.log('[stripe-webhook] handleEvent called with event:', JSON.stringify(event, null, 2));
  const stripeData = event?.data?.object ?? {};
  console.log('[stripe-webhook] stripeData:', JSON.stringify(stripeData, null, 2));

  // Só processa envio de e-mail para checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    console.log('[stripe-webhook] Evento checkout.session.completed recebido!');
    
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
    const paymentOrigin = metadata?.origin || 'site';
    console.log('[stripe-webhook] Metadado de origem do pagamento:', paymentOrigin);
    
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
        origin: paymentOrigin
      });
      console.log('[stripe-webhook] Resultado do envio de e-mail:', emailResult);
    } else {
      console.warn('[stripe-webhook] Não foi possível enviar e-mail: mailerSendApiKey ou userData.email ausente.');
    }
    
    // Processar diferentes tipos de pagamento
    const paymentType = metadata?.payment_type || metadata?.fee_type;
    
    if (paymentType === 'application_fee') {
      const userId = metadata.user_id || metadata.student_id;
      const applicationId = metadata.application_id;
      const applicationFeeAmount = metadata.application_fee_amount || '350.00';
      const platformFeePercentage = metadata.platform_fee_percentage || '15.00';
      const universityId = metadata.university_id;

      if (userId && applicationId) {
        // Atualizar o status da aplicação existente para 'under_review'
        const { error: appError } = await supabase
          .from('scholarship_applications')
          .update({ 
            status: 'under_review',
            is_application_fee_paid: true,
            payment_status: 'paid',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
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

        // Log dos valores dinâmicos processados
        console.log('Application fee payment processed with dynamic values:', {
          userId,
          applicationId,
          applicationFeeAmount,
          platformFeePercentage,
          universityId
        });

        // Processar transferência via Stripe Connect se aplicável
        if (universityId && amount_total) {
          try {
            console.log('Processing Stripe Connect transfer for university:', universityId);
            
            // Chamar a função de transferência
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
              console.log('Stripe Connect transfer result:', transferResult);
              
              if (transferResult.transfer_type === 'stripe_connect') {
                console.log('Transfer completed successfully via Stripe Connect');
              } else {
                console.log('Using current flow (no Stripe Connect)');
              }
            } else {
              console.error('Error calling transfer function:', transferResponse.status);
            }
          } catch (transferError) {
            console.error('Error processing Stripe Connect transfer:', transferError);
            // Não falhar o webhook por causa da transferência
          }
        }
      }
    }
    
    if (paymentType === 'scholarship_fee') {
      const userId = metadata?.user_id;
      const scholarshipsIds = metadata?.scholarships_ids;
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
    
    if (paymentType === 'selection_process') {
      const userId = metadata?.user_id;
      
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
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}