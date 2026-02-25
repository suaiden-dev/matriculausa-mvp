// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getStripeConfig } from '../stripe-config.ts';
import { calculateCardAmountWithFees, calculatePIXAmountWithFees } from '../utils/stripe-fee-calculator.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
  if (status === 204) return new Response(null, { status, headers });
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (req) => {
  try {
    console.log('[stripe-checkout-translation-fee] 🚀 Function invoked');
    if (req.method === 'OPTIONS') return corsResponse(null, 204);

    const config = getStripeConfig(req);
    const stripe = new Stripe(config.secretKey, {
      appInfo: { name: 'MatriculaUSA Translation', version: '1.0.0' },
    });

    let requestBody;
    try {
      requestBody = await req.json();
      console.log('[stripe-checkout-translation-fee] 📋 Request body:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      return corsResponse({ error: 'Invalid JSON in request body' }, 400);
    }

    const { amount, success_url, cancel_url, payment_method, metadata } = requestBody;

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return corsResponse({ error: 'No authorization header' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return corsResponse({ error: 'Invalid token' }, 401);

    console.log('[stripe-checkout-translation-fee] ✅ User:', user.id, '| Amount:', amount, '| Method:', payment_method);

    // Exchange rate for PIX
    let exchangeRate = 1;
    if (payment_method === 'pix') {
      const frontendRate = metadata?.exchange_rate ? parseFloat(metadata.exchange_rate) : null;
      if (frontendRate && frontendRate > 0) {
        exchangeRate = frontendRate;
      } else {
        try {
          const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
          if (response.ok) {
            const data = await response.json();
            exchangeRate = parseFloat(data.rates.BRL) * 1.04;
          } else {
            exchangeRate = 5.6;
          }
        } catch {
          exchangeRate = 5.6;
        }
      }
      console.log('[stripe-checkout-translation-fee] 💱 PIX exchange rate:', exchangeRate);
    }

    // Calculate Stripe amount with fees
    const baseAmount = Number(amount);
    if (!baseAmount || baseAmount <= 0) return corsResponse({ error: 'Invalid amount' }, 400);

    let grossAmountInCents: number;
    if (payment_method === 'pix') {
      grossAmountInCents = calculatePIXAmountWithFees(baseAmount, exchangeRate);
    } else {
      grossAmountInCents = calculateCardAmountWithFees(baseAmount);
    }

    const sessionMetadata = {
      student_id: user.id,
      fee_type: 'translation_fee',
      payment_method: payment_method || 'stripe',
      base_amount: baseAmount.toString(),
      gross_amount: (grossAmountInCents / 100).toString(),
      ...(metadata || {}),
    };

    const sessionConfig: any = {
      payment_method_types: payment_method === 'pix' ? ['pix'] : ['card'],
      client_reference_id: user.id,
      customer_email: user.email,
      mode: 'payment',
      success_url: payment_method === 'pix' ? `${success_url}&pix_payment=true` : success_url,
      cancel_url,
      metadata: sessionMetadata,
      line_items: [
        {
          price_data: {
            currency: payment_method === 'pix' ? 'brl' : 'usd',
            product_data: {
              name: 'Certified Document Translation',
              description: `Document translation to English (${metadata?.total_pages || 1} pages)`,
            },
            unit_amount: grossAmountInCents,
          },
          quantity: 1,
        },
      ],
    };

    console.log('[stripe-checkout-translation-fee] 💰 Base:', baseAmount, '| Gross:', grossAmountInCents / 100);

    const session = await stripe.checkout.sessions.create(sessionConfig);
    console.log('[stripe-checkout-translation-fee] ✅ Session created:', session.id);

    // Update translation orders with stripe session ID
    if (metadata?.translation_order_ids) {
      const orderIds = metadata.translation_order_ids.split(',');
      for (const orderId of orderIds) {
        await supabase
          .from('translation_orders')
          .update({ stripe_session_id: session.id })
          .eq('id', orderId.trim());
      }
      console.log('[stripe-checkout-translation-fee] ✅ Updated translation orders with session ID');
    }

    // Log action
    try {
      const { data: userProfile } = await supabase.from('user_profiles').select('id').eq('user_id', user.id).single();
      if (userProfile) {
        await supabase.rpc('log_student_action', {
          p_student_id: userProfile.id,
          p_action_type: 'translation_checkout_created',
          p_action_description: `Stripe checkout for document translation ($${baseAmount})`,
          p_performed_by: user.id,
          p_performed_by_type: 'student',
          p_metadata: {
            fee_type: 'translation_fee',
            payment_method: payment_method || 'stripe',
            session_id: session.id,
            amount: baseAmount,
            translation_order_ids: metadata?.translation_order_ids,
          }
        });
      }
    } catch (logError) {
      console.error('Failed to log:', logError);
    }

    return corsResponse({ session_url: session.url }, 200);
  } catch (error) {
    console.error('[stripe-checkout-translation-fee] ❌ Error:', error);
    return corsResponse({ error: 'Internal server error', details: error.message }, 500);
  }
});
