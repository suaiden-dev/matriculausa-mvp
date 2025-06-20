import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  apiVersion: '2024-04-10',
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json',
  };

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method Not Allowed' }, 405);
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      console.error('Missing sessionId in request body.');
      return corsResponse({ error: 'Session ID is required' }, 400);
    }

    // --- LÓGICA DE VERIFICAÇÃO DA SESSÃO STRIPE E ATUALIZAÇÃO DO SUPABASE VAI AQUI ---
    // 1. Recuperar a sessão do Stripe
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log('Stripe Session Retrieved:', session.id, 'Status:', session.status, 'Payment Status:', session.payment_status);
    } catch (stripeError: any) {
      console.error('Error retrieving Stripe session:', stripeError.message);
      if (stripeError.code === 'resource_missing' || stripeError.code === 'session_expired') {
        return corsResponse({ error: 'Stripe session not found or expired.' }, 404);
      }
      return corsResponse({ error: 'Failed to retrieve Stripe session.' }, 500);
    }

    // 2. Verificar o status do pagamento
    if (session.payment_status === 'paid' && session.status === 'complete') {
      const customerId = session.customer; // ID do cliente Stripe
      const userId = session.metadata?.userId; // O userId que você adicionou no metadata da sessão

      if (!userId) {
        console.error('User ID not found in Stripe session metadata. Cannot update database.');
        return corsResponse({ error: 'User ID missing in session metadata.' }, 400);
      }

      // 3. Atualizar o banco de dados Supabase
      // Usando a tabela stripe_orders
      const { data: updatedOrder, error: orderError } = await supabase
        .from('stripe_orders')
        .update({
          status: 'completed',
          checkout_session_id: sessionId,
          customer_id: customerId,
          amount_total: session.amount_total,
          currency: session.currency,
          payment_status: session.payment_status,
          payment_intent_id: session.payment_intent,
          updated_at: new Date().toISOString(),
        })
        .eq('checkout_session_id', sessionId)
        .maybeSingle();

      if (orderError) {
        console.error('Error updating order status in DB:', orderError);
        return corsResponse({ error: 'Failed to update order status in database.' }, 500);
      }

      if (!updatedOrder) {
        console.warn('Order not found or already updated for session:', sessionId);
      }

      console.log('Database updated successfully for session:', sessionId);

      // >>>>> NOVO BLOCO AQUI: ATUALIZAR user_profiles <<<<<
      console.log(`Attempting to update user_profiles for user ${userId}.`);

      // Lógica para determinar qual taxa foi paga e qual flag atualizar
      const updatedProfileFields: { is_application_fee_paid?: boolean; has_paid_selection_process_fee?: boolean } = {};

      // Verificar se é a Selection Process Fee ($350 = 35000 centavos)
      if (session.amount_total === 35000 && session.currency === 'usd') { // Ajuste a moeda se necessário
        updatedProfileFields.has_paid_selection_process_fee = true;
        console.log('Detected Selection Process Fee payment. Setting has_paid_selection_process_fee to true.');
      } 
      // (Futuramente, adicione lógica para a Application Fee ($350) e outras taxas aqui,
      //  usando o price_id ou um campo de metadata para distinguir os $350)
      // else if (session.amount_total === OUTRO_VALOR_DA_APPLICATION_FEE && session.currency === 'usd') {
      //   updatedProfileFields.is_application_fee_paid = true;
      //   console.log('Detected Application Fee payment. Setting is_application_fee_paid to true.');
      // }

      let updatedProfileResult = null;
      if (Object.keys(updatedProfileFields).length > 0) {
          const { data: updatedProfile, error: profileError } = await supabase
            .from('user_profiles')
            .update(updatedProfileFields) // Objeto com campos a serem atualizados
            .eq('user_id', userId)
            .maybeSingle();

          if (profileError) {
            console.error('Error updating user_profiles in DB:', profileError);
            return corsResponse({ message: 'Session verified, order updated, but failed to update user profile.', status: 'complete', order: updatedOrder, profile_update_error: profileError });
          }

          if (!updatedProfile) {
            console.warn('User profile not found or already updated for user:', userId);
          }
          console.log(`User profile for ${userId} updated successfully.`);
          updatedProfileResult = updatedProfile;
      } else {
          console.log('No specific profile fields updated for this payment type.');
      }
      // >>>>> FIM DO NOVO BLOCO <<<<<

      return corsResponse({ message: 'Session verified and database updated.', status: 'complete', order: updatedOrder, profile: updatedProfileResult });

    } else if (session.status === 'open') {
      console.log('Stripe session is still open:', sessionId);
      return corsResponse({ message: 'Session is still open.', status: 'open' });
    } else {
      console.log('Stripe session status is not paid or complete:', session.status);
      return corsResponse({ message: 'Session not paid or invalid.', status: session.status }, 400);
    }

  } catch (error: any) {
    console.error(`Error in verify-stripe-session: ${error.message}`, error);
    return corsResponse({ error: error.message || 'An unexpected error occurred during session verification.' }, 500);
  }
}); 