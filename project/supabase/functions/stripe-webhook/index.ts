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