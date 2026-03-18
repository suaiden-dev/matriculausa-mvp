import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
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
      if (fee_type !== 'ds160_package' && fee_type !== 'i539_cos_package') {
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
      } else {
        updateData.has_paid_i539_cos_package = true;
        updateData.i539_cos_package_payment_method = paymentMethod;
      }

      const { error: profileError } = await supabase.from('user_profiles').update(updateData).eq('user_id', userId);
      if (profileError) throw new Error(`Failed to update user_profiles: ${profileError.message}`);

      // 2. Registrar pagamento na individual_fee_payments
      // Convertendo para USD se for BRL usando exchange_rate do metadata
      let paymentAmountUSD = amountValue;
      if (session.currency?.toLowerCase() === 'brl' && session.metadata?.exchange_rate) {
        const rate = parseFloat(session.metadata.exchange_rate);
        if (rate > 0) paymentAmountUSD = amountValue / rate;
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
          p_gross_amount_usd: session.metadata?.gross_amount ? parseFloat(session.metadata.gross_amount) : null,
          p_fee_amount_usd: session.metadata?.fee_amount ? parseFloat(session.metadata.fee_amount) : null
        });
      } catch (recordError) {
        console.warn('[Individual Fee Payment] Warning: Failed to record payment:', recordError);
      }

      // 3. Log da ação
      try {
        const { data: userProfile } = await supabase.from('user_profiles').select('id').eq('user_id', userId).single();
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
