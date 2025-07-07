// Função edge inicial para verificar sessão de pagamento do I-20 Control Fee
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
    if (req.method === 'OPTIONS') return corsResponse(null, 204);
    if (req.method !== 'POST') return corsResponse({ error: 'Method Not Allowed' }, 405);

    const { sessionId } = await req.json();
    if (!sessionId) return corsResponse({ error: 'Session ID is required' }, 400);

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid' && session.status === 'complete') {
      const userId = session.client_reference_id;
      const paymentIntentId = session.payment_intent as string;
      if (!userId) return corsResponse({ error: 'User ID (client_reference_id) missing in session.' }, 400);

      // Atualiza user_profiles para marcar o pagamento do I-20 Control Fee
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          has_paid_i20_control_fee: true,
          i20_control_fee_due_date: new Date().toISOString(),
          i20_control_fee_payment_intent_id: paymentIntentId,
        })
        .eq('user_id', userId);
      if (profileError) throw new Error(`Failed to update user_profiles: ${profileError.message}`);

      // Buscar o application_id mais recente do usuário
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();
      console.log('[I20ControlFee] userId do Stripe:', userId);
      console.log('[I20ControlFee] userProfile encontrado:', userProfile);
      let applicationId = null;
      if (userProfile && userProfile.id) {
        const { data: applications } = await supabase
          .from('scholarship_applications')
          .select('id')
          .eq('student_id', userProfile.id)
          .order('created_at', { ascending: false })
          .limit(1);
        console.log('[I20ControlFee] applications encontradas:', applications);
        if (applications && applications.length > 0) {
          applicationId = applications[0].id;
        }
      }

      return corsResponse({ status: 'complete', message: 'Session verified and processed successfully.', application_id: applicationId }, 200);
    } else {
      return corsResponse({ message: 'Session not ready.', status: session.status }, 202);
    }
  } catch (error: any) {
    console.error(`--- CRITICAL ERROR in verify-stripe-session-i20-control-fee ---:`, error.message);
    return corsResponse({ error: 'An unexpected error occurred.', details: error.message }, 500);
  }
}); 