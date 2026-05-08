// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getStripeConfig } from '../stripe-config.ts';

// @ts-ignore
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

function corsResponse(body: any, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json'
  };
  if (status === 204) {
    return new Response(null, { status, headers });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers
  });
}

function getCurrencyInfo(session: any) {
  const currency = session.currency?.toLowerCase() || 'usd';
  const isPix = session.payment_method_types?.includes('pix') || session.metadata?.payment_method === 'pix';
  if (currency === 'brl' || isPix) {
    return { currency: 'BRL', symbol: 'R$', code: 'brl' };
  }
  return { currency: 'USD', symbol: '$', code: 'usd' };
}

function formatAmountWithCurrency(amount: number, session: any) {
  const currencyInfo = getCurrencyInfo(session);
  return `${currencyInfo.symbol}${amount.toFixed(2)}`;
}

async function getAllAdmins(supabase: any) {
  try {
    const { data: adminProfiles } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name, phone')
      .eq('role', 'admin');
    const admins = adminProfiles ? adminProfiles.filter((a: any) => a.email) : [];
    return admins.length > 0 ? admins : [{ user_id: '', email: 'admin@matriculausa.com', full_name: 'Admin MatriculaUSA', phone: '' }];
  } catch {
    return [{ user_id: '', email: 'admin@matriculausa.com', full_name: 'Admin MatriculaUSA', phone: '' }];
  }
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') return corsResponse(null, 204);
    if (req.method !== 'POST') return corsResponse({ error: 'Method Not Allowed' }, 405);
    
    const config = getStripeConfig(req);
    const stripe = new Stripe(config.secretKey, {
      apiVersion: '2025-02-24.acacia',
      appInfo: { name: 'MatriculaUSA Integration', version: '1.0.0' }
    });
    
    const { sessionId } = await req.json();
    if (!sessionId) return corsResponse({ error: 'Session ID is required' }, 400);

    // Expandir payment_intent
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    });

    if (session.payment_status === 'paid' && session.status === 'complete') {
      const userId = session.client_reference_id;
      const fee_type = session.metadata?.fee_type;
      
      if (!userId) return corsResponse({ error: 'User ID missing in session.' }, 400);
      if (fee_type !== 'ds160_package' && fee_type !== 'i539_cos_package' && fee_type !== 'reinstatement_package') {
        return corsResponse({ error: 'fee_type inválido no metadata da sessão.' }, 400);
      }

      // Detalhes do pagamento
      let paymentIntentId = '';
      if (typeof session.payment_intent === 'string') {
        paymentIntentId = session.payment_intent;
      } else if (session.payment_intent && typeof session.payment_intent === 'object' && 'id' in session.payment_intent) {
        paymentIntentId = (session.payment_intent as any).id;
      }
      
      const isPix = session.payment_method_types?.includes('pix') || session.metadata?.payment_method === 'pix';
      const paymentMethod = isPix ? 'pix' : 'stripe';
      const amountValue = session.amount_total ? session.amount_total / 100 : 0;
      
      console.log(`[Package Fee Verified] ${fee_type} paid by ${userId}. Method: ${paymentMethod}, Amount: ${amountValue}`);

      // 1. Atualizar user_profiles
      const updateData: any = {};
      if (fee_type === 'ds160_package') {
        updateData.has_paid_ds160_package = true;
        updateData.ds160_package_payment_method = paymentMethod;
      } else if (fee_type === 'i539_cos_package') {
        updateData.has_paid_i539_cos_package = true;
        updateData.i539_cos_package_payment_method = paymentMethod;
      } else if (fee_type === 'reinstatement_package') {
        updateData.has_paid_reinstatement_package = true;
        updateData.reinstatement_package_payment_method = paymentMethod;
      }

      const { error: profileError } = await supabase.from('user_profiles').update(updateData).eq('user_id', userId);
      if (profileError) {
        console.warn(`[Package Fee Verified] Warning: Failed to update user_profiles (might lack columns): ${profileError.message}`);
      }

      // 2. Registrar pagamento na individual_fee_payments
      // Buscar o valor líquido real (USD) do Stripe Balance API para garantir precisão universal
      let paymentAmountUSD = amountValue;
      let grossAmountUsd: number | null = null;
      let feeAmountUsd: number | null = null;

      if (paymentIntentId) {
        console.log(`✅ [Package Fee] Buscando valor líquido, bruto e taxas do Stripe (BalanceTransaction)`);
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['latest_charge.balance_transaction']
          });
          
          if (paymentIntent.latest_charge) {
            const charge = typeof paymentIntent.latest_charge === 'string' 
              ? await stripe.charges.retrieve(paymentIntent.latest_charge, {
                  expand: ['balance_transaction']
                })
              : paymentIntent.latest_charge;
            
            if (charge.balance_transaction) {
              const bt = typeof charge.balance_transaction === 'string'
                ? await stripe.balanceTransactions.retrieve(charge.balance_transaction)
                : charge.balance_transaction;
              
              if (bt.net && bt.currency === 'usd') {
                paymentAmountUSD = bt.net / 100;
                grossAmountUsd = bt.amount / 100;
                feeAmountUsd = bt.fee / 100;
                console.log(`[Package Fee] Valores recebidos do Stripe: Líquido=${paymentAmountUSD}, Bruto=${grossAmountUsd}, Taxas=${feeAmountUsd} (USD)`);
              } else if (session.currency?.toLowerCase() === 'brl' && session.metadata?.exchange_rate) {
                const rate = parseFloat(session.metadata.exchange_rate);
                if (rate > 0) paymentAmountUSD = amountValue / rate;
              }
            }
          }
        } catch (stripeError) {
          console.error('[Package Fee] Erro ao buscar valor real do Stripe:', stripeError);
          if (session.currency?.toLowerCase() === 'brl' && session.metadata?.exchange_rate) {
            const rate = parseFloat(session.metadata.exchange_rate);
            if (rate > 0) paymentAmountUSD = amountValue / rate;
          }
        }
      }

      try {
        await supabase.rpc('insert_individual_fee_payment', {
          p_user_id: userId,
          p_fee_type: fee_type,
          p_amount: paymentAmountUSD,
          p_payment_date: new Date().toISOString(),
          p_payment_method: 'stripe',
          p_payment_intent_id: paymentIntentId,
          p_stripe_charge_id: null,
          p_zelle_payment_id: null,
          p_gross_amount_usd: grossAmountUsd || (session.metadata?.gross_amount ? parseFloat(session.metadata.gross_amount) : null),
          p_fee_amount_usd: feeAmountUsd || (session.metadata?.fee_amount ? parseFloat(session.metadata.fee_amount) : null)
        });
      } catch (recordError) {
        console.warn('[Individual Fee Payment] Warning: Failed to record payment:', recordError);
      }

      // 3. Log da ação + Notificações
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id, user_id, full_name, email, phone, seller_referral_code')
        .eq('user_id', userId)
        .single();

      try {
        if (userProfile) {
          await supabase.rpc('log_student_action', {
            p_student_id: userProfile.id,
            p_action_type: 'fee_payment',
            p_action_description: `${fee_type} payment verified via Stripe`,
            p_performed_by: userId,
            p_performed_by_type: 'student',
            p_metadata: {
              fee_type: fee_type,
              payment_method: paymentMethod,
              amount: amountValue,
              session_id: sessionId,
              payment_intent_id: paymentIntentId
            }
          });
        }
      } catch (logErr) {
        console.error('Log error:', logErr);
      }

      // 4. Notificações
      try {
        const feeLabel = (fee_type === 'ds160_package' || fee_type === 'i539_cos_package') ? 'Control Fee' : 'Reinstatement Fee';
        const formattedAmount = formatAmountWithCurrency(paymentAmountUSD, session);

        if (userProfile) {
          // Aluno
          fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo_notf: `Pagamento Stripe de ${feeLabel} confirmado`,
              email_aluno: userProfile.email,
              nome_aluno: userProfile.full_name,
              formatted_amount: formattedAmount,
              payment_id: sessionId,
              fee_type: fee_type,
              notification_target: 'student'
            })
          }).catch(e => console.error('Error sending student notification:', e));

          // Seller e Affiliate Admin
          if (userProfile.seller_referral_code) {
            const { data: sellerData } = await supabase
              .from('sellers')
              .select('id, user_id, name, email, referral_code, commission_rate, affiliate_admin_id')
              .eq('referral_code', userProfile.seller_referral_code)
              .single();

            if (sellerData) {
              const { data: sellerProfile } = await supabase
                .from('user_profiles').select('phone').eq('user_id', sellerData.user_id).single();

              fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tipo_notf: `Pagamento de ${feeLabel} confirmado - Seller`,
                  email_seller: sellerData.email,
                  nome_seller: sellerData.name,
                  phone_seller: sellerProfile?.phone || '',
                  email_aluno: userProfile.email,
                  nome_aluno: userProfile.full_name,
                  o_que_enviar: `Parabéns! Seu aluno ${userProfile.full_name} pagou a ${feeLabel} no valor de ${formattedAmount} via Stripe. Sua comissão será calculada em breve.`,
                  payment_id: sessionId,
                  fee_type: fee_type,
                  amount: paymentAmountUSD,
                  seller_id: sellerData.user_id,
                  referral_code: sellerData.referral_code,
                  commission_rate: sellerData.commission_rate,
                  payment_method: 'stripe'
                })
              }).catch(e => console.error('Error sending seller notification:', e));

              if (sellerData.affiliate_admin_id) {
                const { data: affiliateAdmin } = await supabase
                  .from('affiliate_admins').select('user_id').eq('id', sellerData.affiliate_admin_id).single();

                if (affiliateAdmin) {
                  const { data: affiliateProfile } = await supabase
                    .from('user_profiles').select('full_name, email, phone').eq('user_id', affiliateAdmin.user_id).single();

                  if (affiliateProfile) {
                    fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        tipo_notf: `Pagamento de ${feeLabel} confirmado - Affiliate Admin`,
                        email_affiliate_admin: affiliateProfile.email,
                        nome_affiliate_admin: affiliateProfile.full_name,
                        phone_affiliate_admin: affiliateProfile.phone || '',
                        email_aluno: userProfile.email,
                        nome_aluno: userProfile.full_name,
                        email_seller: sellerData.email,
                        nome_seller: sellerData.name,
                        o_que_enviar: `O aluno ${userProfile.full_name} do seu seller ${sellerData.name} pagou a ${feeLabel} no valor de ${formattedAmount} via Stripe.`,
                        payment_id: sessionId,
                        fee_type: fee_type,
                        amount: paymentAmountUSD,
                        seller_id: sellerData.user_id,
                        referral_code: sellerData.referral_code,
                        payment_method: 'stripe'
                      })
                    }).catch(e => console.error('Error sending affiliate notification:', e));
                  }
                }
              }
            }
          }

          // Admin
          const admins = await getAllAdmins(supabase);
          for (const admin of admins) {
            fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tipo_notf: `Pagamento de ${feeLabel} confirmado - Admin`,
                email_admin: admin.email,
                nome_admin: admin.full_name,
                phone_admin: admin.phone || '',
                email_aluno: userProfile.email,
                nome_aluno: userProfile.full_name,
                o_que_enviar: `Pagamento Stripe de ${feeLabel} no valor de ${formattedAmount} do aluno ${userProfile.full_name} foi confirmado.`,
                payment_id: sessionId,
                fee_type: fee_type,
                amount: paymentAmountUSD,
                payment_method: 'stripe'
              })
            }).catch(e => console.error(`Error sending admin notification to ${admin.email}:`, e));
          }
        }
      } catch (notifErr) {
        console.error('Error in notifications:', notifErr);
      }

      return corsResponse({
        status: 'complete',
        message: 'Payment verified and processed successfully.',
        fee_type: fee_type,
        amount_paid: paymentAmountUSD,
        currency: session.currency?.toUpperCase() || 'USD'
      }, 200);
    }

    return corsResponse({ message: "Session not ready.", status: session.status, payment_status: session.payment_status }, 202);
  } catch (error: any) {
    console.error("Unhandled error:", error.message);
    return corsResponse({ error: "Internal Server Error", details: error.message }, 500);
  }
});
