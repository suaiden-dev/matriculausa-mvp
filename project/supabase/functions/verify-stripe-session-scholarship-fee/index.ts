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
  console.log('--- verify-stripe-session-scholarship-fee: Request received ---');
  try {
    if (req.method === 'OPTIONS') return corsResponse(null, 204);
    if (req.method !== 'POST') return corsResponse({ error: 'Method Not Allowed' }, 405);

    const { sessionId } = await req.json();
    if (!sessionId) return corsResponse({ error: 'Session ID is required' }, 400);
    console.log(`Verifying session ID: ${sessionId}`);

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(`Session status: ${session.status}, Payment status: ${session.payment_status}`);
    
    if (session.payment_status === 'paid' && session.status === 'complete') {
      const userId = session.client_reference_id;
      // scholarships_ids pode ser um array ou string separada por vírgula
      const scholarshipsIds = session.metadata?.scholarships_ids;

      console.log(`Processing successful payment. UserID: ${userId}, ScholarshipsIDs: ${scholarshipsIds}`);

      if (!userId) return corsResponse({ error: 'User ID (client_reference_id) missing in session.' }, 400);
      if (!scholarshipsIds) return corsResponse({ error: 'Scholarships IDs missing in session metadata.' }, 400);

      // Atualiza perfil do usuário para marcar que pagou a scholarship fee
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ is_scholarship_fee_paid: true })
        .eq('user_id', userId);
      if (profileError) throw new Error(`Failed to update user_profiles: ${profileError.message}`);

      // Atualiza status das aplicações relacionadas para 'approved'
      const scholarshipIdsArray = scholarshipsIds.split(',').map((id: string) => id.trim());
      const { error: appError } = await supabase
        .from('scholarship_applications')
        .update({ status: 'approved' })
        .eq('student_id', userId)
        .in('scholarship_id', scholarshipIdsArray);
      if (appError) throw new Error(`Failed to update scholarship_applications: ${appError.message}`);

      // Limpa carrinho (opcional)
      const { error: cartError } = await supabase.from('user_cart').delete().eq('user_id', userId);
      if (cartError) throw new Error(`Failed to clear user_cart: ${cartError.message}`);
      return corsResponse({ status: 'complete', message: 'Session verified and processed successfully.' }, 200);
    } else {
      console.log('Session not paid or complete.');
      return corsResponse({ message: 'Session not ready.', status: session.status }, 202);
    }
  } catch (error: any) {
    console.error(`--- CRITICAL ERROR in verify-stripe-session-scholarship-fee ---:`, error.message);
    return corsResponse({ error: 'An unexpected error occurred.', details: error.message }, 500);
  }
}); 