import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getStripeConfig } from '../stripe-config.ts';
import { getStripeBalanceTransaction } from '../shared/stripe-utils.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

function getCurrencyInfo(session) {
  const currency = session.currency?.toLowerCase() || 'usd';
  const isPix = session.payment_method_types?.includes('pix') || session.metadata?.payment_method === 'pix';
  if (currency === 'brl' || isPix) {
    return { currency: 'BRL', symbol: 'R$', code: 'brl' };
  }
  return { currency: 'USD', symbol: '$', code: 'usd' };
}

function formatAmountWithCurrency(amount, session) {
  const currencyInfo = getCurrencyInfo(session);
  return `${currencyInfo.symbol}${amount.toFixed(2)}`;
}

async function getAllAdmins(supabase, isDevelopment: boolean = false) {
  const devBlockedEmails = [
    'luizedmiola@gmail.com', 'chimentineto@gmail.com', 'fsuaiden@gmail.com',
    'rayssathefuture@gmail.com', 'gui.reis@live.com', 'admin@matriculausa.com'
  ];
  try {
    const { data: adminProfiles } = await supabase.from('user_profiles').select('user_id, email, full_name, phone').eq('role', 'admin');
    let admins = adminProfiles ? adminProfiles.filter(a => a.email) : [];
    if (isDevelopment) admins = admins.filter(a => !devBlockedEmails.includes(a.email));
    return admins.length > 0 ? admins : [{ user_id: '', email: 'admin@matriculausa.com', full_name: 'Admin MatriculaUSA', phone: '' }];
  } catch (error) {
    return [{ user_id: '', email: 'admin@matriculausa.com', full_name: 'Admin MatriculaUSA', phone: '' }];
  }
}

function corsResponse(body, status = 200) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': '*', 'Content-Type': 'application/json' };
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

Deno.serve(async (req) => {
  console.log('--- verify-stripe-session-reinstatement-fee: Request received ---');
  try {
    if (req.method === 'OPTIONS') return corsResponse(null, 204);
    const config = getStripeConfig(req);
    const stripe = new Stripe(config.secretKey, { apiVersion: '2024-04-10' });
    const { sessionId } = await req.json();
    if (!sessionId) return corsResponse({ error: 'Session ID is required' }, 400);

    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
    if (session.payment_status !== 'paid' || session.status !== 'complete') {
      return corsResponse({ message: 'Session not ready.', status: session.status }, 202);
    }

    const userId = session.client_reference_id;
    if (!userId) return corsResponse({ error: 'User ID missing in session.' }, 400);

    const { data: userProfile } = await supabase.from('user_profiles').select('id, user_id, full_name, email, phone, seller_referral_code').eq('user_id', userId).single();
    if (!userProfile) return corsResponse({ error: 'User profile not found' }, 404);

    // Evitar duplicação
    const { data: existingLog } = await supabase.from('student_action_logs').select('id').eq('action_type', 'fee_payment').eq('metadata->>session_id', sessionId).maybeSingle();
    if (existingLog) {
      return corsResponse({ status: 'complete', message: 'Session already processed.' }, 200);
    }

    // Atualizar perfil
    await supabase.from('user_profiles').update({ 
      has_paid_reinstatement_package: true,
      reinstatement_package_payment_method: session.metadata?.payment_method || 'stripe'
    }).eq('user_id', userId);

    // Registrar pagamento com net/gross/fee reais do Stripe
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
    const amountRaw = session.amount_total ? session.amount_total / 100 : 0;
    const currency = session.currency?.toUpperCase() || 'USD';

    const stripeInfo = await getStripeBalanceTransaction(stripe, paymentIntentId || '', amountRaw, currency);
    const amountPaid = stripeInfo.amount;
    
    await supabase.rpc('insert_individual_fee_payment', {
      p_user_id: userId,
      p_fee_type: 'reinstatement_package',
      p_amount: amountPaid,
      p_payment_date: new Date().toISOString(),
      p_payment_method: 'stripe',
      p_payment_intent_id: paymentIntentId,
      p_stripe_charge_id: null,
      p_zelle_payment_id: null,
      p_gross_amount_usd: stripeInfo.gross_amount_usd,
      p_fee_amount_usd: stripeInfo.fee_amount_usd,
    });

    // Logar ação
    await supabase.rpc('log_student_action', {
      p_student_id: userProfile.id,
      p_action_type: 'fee_payment',
      p_action_description: `Reinstatement Fee paid via Stripe (${sessionId})`,
      p_performed_by: userId,
      p_performed_by_type: 'student',
      p_metadata: { fee_type: 'reinstatement_package', payment_method: 'stripe', amount: amountPaid, session_id: sessionId }
    });

    // Notificações (Simplificado para n8n)
    const formattedAmount = formatAmountWithCurrency(amountPaid, session);
    
    // 1. NOTIFICAÇÃO PARA O ALUNO
    const alunoPayload = {
      tipo_notf: 'Pagamento Stripe de Reinstatement Fee confirmado',
      email_aluno: userProfile.email,
      nome_aluno: userProfile.full_name,
      formatted_amount: formattedAmount,
      payment_id: sessionId,
      fee_type: 'reinstatement_package',
      notification_target: 'student'
    };

    console.log('📧 Enviando notificação para o aluno...');
    fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alunoPayload)
    }).catch(e => console.error('Error sending student notification:', e));

    // 2. NOTIFICAÇÕES PARA ADMIN, SELLER E AFFILIATE ADMIN
    try {
      // Buscar informações do seller e affiliate admin
      if (userProfile.seller_referral_code) {
        const { data: sellerData } = await supabase
          .from('sellers')
          .select(`
            id, user_id, name, email, referral_code, commission_rate, affiliate_admin_id
          `)
          .eq('referral_code', userProfile.seller_referral_code)
          .single();

        if (sellerData) {
          // Buscar perfil do seller para pegar o telefone
          const { data: sellerProfile } = await supabase
            .from('user_profiles')
            .select('phone')
            .eq('user_id', sellerData.user_id)
            .single();

          // Buscar affiliate admin se houver
          let affiliateAdminData = null;
          if (sellerData.affiliate_admin_id) {
            const { data: affiliateAdmin } = await supabase
              .from('affiliate_admins')
              .select('user_id')
              .eq('id', sellerData.affiliate_admin_id)
              .single();

            if (affiliateAdmin) {
              const { data: affiliateProfile } = await supabase
                .from('user_profiles')
                .select('full_name, email, phone')
                .eq('user_id', affiliateAdmin.user_id)
                .single();
              
              if (affiliateProfile) {
                affiliateAdminData = {
                  ...affiliateProfile,
                  user_id: affiliateAdmin.user_id
                };
              }
            }
          }

          // Notificação para Seller
          const sellerPayload = {
            tipo_notf: 'Pagamento de Reinstatement Fee confirmado - Seller',
            email_seller: sellerData.email,
            nome_seller: sellerData.name,
            phone_seller: sellerProfile?.phone || "",
            email_aluno: userProfile.email,
            nome_aluno: userProfile.full_name,
            o_que_enviar: `Parabéns! Seu aluno ${userProfile.full_name} pagou a Reinstatement Fee no valor de ${formattedAmount} via Stripe. Sua comissão será calculada em breve.`,
            payment_id: sessionId,
            fee_type: 'reinstatement_package',
            amount: amountPaid,
            seller_id: sellerData.user_id,
            referral_code: sellerData.referral_code,
            commission_rate: sellerData.commission_rate,
            payment_method: 'stripe'
          };

          console.log('📧 Enviando notificação para o seller...');
          fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sellerPayload)
          }).catch(e => console.error('Error sending seller notification:', e));

          // Notificação para Affiliate Admin
          if (affiliateAdminData) {
            const affiliatePayload = {
              tipo_notf: 'Pagamento de Reinstatement Fee confirmado - Affiliate Admin',
              email_affiliate_admin: affiliateAdminData.email,
              nome_affiliate_admin: affiliateAdminData.full_name,
              phone_affiliate_admin: affiliateAdminData.phone || "",
              email_aluno: userProfile.email,
              nome_aluno: userProfile.full_name,
              email_seller: sellerData.email,
              nome_seller: sellerData.name,
              o_que_enviar: `O aluno ${userProfile.full_name} do seu seller ${sellerData.name} pagou a Reinstatement Fee no valor de ${formattedAmount} via Stripe.`,
              payment_id: sessionId,
              fee_type: 'reinstatement_package',
              amount: amountPaid,
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code,
              payment_method: 'stripe'
            };

            console.log('📧 Enviando notificação para affiliate admin...');
            fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(affiliatePayload)
            }).catch(e => console.error('Error sending affiliate notification:', e));
          }
        }
      }

      // Notificação para Admins da Plataforma
      const admins = await getAllAdmins(supabase);
      for (const admin of admins) {
        const adminPayload = {
          tipo_notf: 'Pagamento de Reinstatement Fee confirmado - Admin',
          email_admin: admin.email,
          nome_admin: admin.full_name,
          phone_admin: admin.phone || "",
          email_aluno: userProfile.email,
          nome_aluno: userProfile.full_name,
          o_que_enviar: `Pagamento Stripe de Reinstatement Fee no valor de ${formattedAmount} do aluno ${userProfile.full_name} foi confirmado.`,
          payment_id: sessionId,
          fee_type: 'reinstatement_package',
          amount: amountPaid,
          payment_method: 'stripe'
        };

        console.log(`📧 Enviando notificação para admin ${admin.email}...`);
        fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adminPayload)
        }).catch(e => console.error(`Error sending admin notification to ${admin.email}:`, e));
      }

    } catch (notifErr) {
      console.error('Error in secondary notifications:', notifErr);
    }

    return corsResponse({ status: 'complete', message: 'Reinstatement fee processed successfully.' }, 200);
  } catch (error) {
    console.error('Error in reinstatement-fee function:', error);
    return corsResponse({ error: 'Internal Server Error', details: (error as any).message }, 500);
  }
});
