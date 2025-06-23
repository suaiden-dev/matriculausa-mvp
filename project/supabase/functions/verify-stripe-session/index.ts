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
  console.log('--- verify-stripe-session: Request received ---');
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
      const feeType = session.metadata?.fee_type;
      const applicationId = session.metadata?.application_id;

      console.log(`Processing successful payment. UserID: ${userId}, FeeType: ${feeType}, ApplicationID: ${applicationId}`);

      if (!userId) return corsResponse({ error: 'User ID (client_reference_id) missing in session.' }, 400);

      if (!applicationId) {
        console.error('application_id ausente no metadata ao verificar sessão Stripe:', session.metadata);
        return corsResponse({ error: 'application_id ausente no metadata.' }, 400);
      }

      // --- Lógica Condicional de Pagamento ---

      if (feeType === 'application_fee') {
        console.log('Processing: Application Fee');
        
        // 1. Atualizar perfil do usuário
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ is_application_fee_paid: true })
          .eq('user_id', userId);
        if (profileError) throw new Error(`Failed to update user_profiles: ${profileError.message}`);
        console.log(`User profile updated for user: ${userId}`);
        
        // 2. Atualizar a aplicação existente para 'under_review'
        const { error: appError } = await supabase
          .from('scholarship_applications')
          .update({ status: 'under_review' })
          .eq('id', applicationId)
          .eq('student_id', userId);
        if (appError) throw new Error(`Failed to update scholarship_application: ${appError.message}`);
        console.log(`Application status updated to under_review for application: ${applicationId}`);
        
        // 3. Limpar o carrinho do usuário
        const { error: cartError } = await supabase.from('user_cart').delete().eq('user_id', userId);
        if (cartError) throw new Error(`Failed to clear user_cart: ${cartError.message}`);
        console.log(`Cart cleared for user: ${userId}`);

        // Resposta de sucesso padronizada
        return corsResponse({ status: 'complete', message: 'Session verified and processed successfully.' }, 200);
      } else if (feeType === 'enrollment_fee') {
        console.log('Processing: Enrollment Fee');
        
        // Atualizar o status da aplicação existente
        const { error: updateError } = await supabase
          .from('scholarship_applications')
          .update({ status: 'enrollment_fee_paid' })
          .eq('student_id', userId)
          .eq('id', applicationId);
        if (updateError) throw new Error(`Failed to update application status: ${updateError.message}`);
        console.log(`Application status updated for enrollment: ${applicationId}`);

        return corsResponse({ status: 'complete', message: 'Session verified and processed successfully.' }, 200);
      } else if (feeType === 'scholarship_fee') {
        console.log('Processing: Scholarship Fee');

        // Atualizar o status da aplicação existente
        const { error: updateError } = await supabase
          .from('scholarship_applications')
          .update({ status: 'approved' })
          .eq('student_id', userId)
          .eq('id', applicationId);
        if (updateError) throw new Error(`Failed to update application status for scholarship fee: ${updateError.message}`);
        console.log(`Application status updated for scholarship fee: ${applicationId}`);

        return corsResponse({ status: 'complete', message: 'Session verified and processed successfully.' }, 200);
      } else if (feeType === 'selection_process') {
        console.log('Processing: Selection Process Fee');

        // Atualizar o perfil do usuário, mesmo que não haja applicationId
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ has_paid_selection_process_fee: true })
          .eq('user_id', userId);
        if (profileError) throw new Error(`Failed to update user_profiles: ${profileError.message}`);
        console.log(`User profile updated for user: ${userId}`);

        // Se houver applicationId, atualiza o status da aplicação
        const { error: updateError } = await supabase
          .from('scholarship_applications')
          .update({ status: 'selection_process_paid' })
          .eq('student_id', userId)
          .eq('id', applicationId);
        if (updateError) throw new Error(`Failed to update application status for selection process fee: ${updateError.message}`);
        console.log(`Application status updated for selection process fee: ${applicationId}`);

        // Limpar o carrinho do usuário
        const { error: cartError } = await supabase.from('user_cart').delete().eq('user_id', userId);
        if (cartError) throw new Error(`Failed to clear user_cart: ${cartError.message}`);
        console.log(`Cart cleared for user: ${userId}`);

        return corsResponse({ status: 'complete', message: 'Session verified and processed successfully.' }, 200);
      } else {
        console.warn(`Unhandled fee_type: ${feeType}`);
      }

      return corsResponse({ message: 'Session verified and processed successfully.' }, 200);
    } else {
      console.log('Session not paid or complete.');
      return corsResponse({ message: 'Session not ready.', status: session.status }, 202);
    }
  } catch (error: any) {
    console.error(`--- CRITICAL ERROR in verify-stripe-session ---:`, error.message);
    return corsResponse({ error: 'An unexpected error occurred.', details: error.message }, 500);
  }
}); 