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
  console.log('--- verify-stripe-session-application-fee: Request received ---');
  try {
    if (req.method === 'OPTIONS') return corsResponse(null, 204);
    if (req.method !== 'POST') return corsResponse({ error: 'Method Not Allowed' }, 405);

    const { sessionId } = await req.json();
    if (!sessionId) return corsResponse({ error: 'Session ID is required' }, 400);
    console.log(`Verifying session ID: ${sessionId}`);

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(`Session status: ${session.status}, Payment status: ${session.payment_status}`);
    console.log('Session metadata:', session.metadata);
    
    if (session.payment_status === 'paid' && session.status === 'complete') {
      const userId = session.client_reference_id;
      const applicationId = session.metadata?.application_id;

      console.log(`Processing successful payment. UserID: ${userId}, ApplicationID: ${applicationId}`);

      if (!userId) return corsResponse({ error: 'User ID (client_reference_id) missing in session.' }, 400);
      if (!applicationId) return corsResponse({ error: 'Application ID missing in session metadata.' }, 400);

      // Verifica se a aplicação existe e pertence ao usuário
      const { data: application, error: fetchError } = await supabase
        .from('scholarship_applications')
        .select('id, student_id, scholarship_id')
        .eq('id', applicationId)
        .eq('student_id', userId)
        .single();

      if (fetchError || !application) {
        console.error('Application not found:', fetchError);
        return corsResponse({ error: 'Application not found or access denied' }, 404);
      }

      console.log('Application found:', application);

      // Atualiza a aplicação para status 'under_review'
      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({ status: 'under_review' })
        .eq('id', applicationId)
        .eq('student_id', userId);

      if (updateError) {
        console.error('Failed to update application status:', updateError);
        throw new Error(`Failed to update application status: ${updateError.message}`);
      }

      console.log('Application status updated to under_review');

      // Buscar documentos do user_profiles e vincular à application
      const { data: userProfile, error: userProfileError } = await supabase
        .from('user_profiles')
        .select('documents')
        .eq('user_id', userId)
        .single();

      if (userProfileError) {
        console.error('Failed to fetch user profile documents:', userProfileError);
      } else if (userProfile?.documents) {
        const documents = Array.isArray(userProfile.documents) ? userProfile.documents : [];
        let formattedDocuments = documents;

        // Se for array de strings (URLs), converter para array de objetos completos
        if (documents.length > 0 && typeof documents[0] === 'string') {
          const docTypes = ['passport', 'diploma', 'funds_proof'];
          formattedDocuments = documents.map((url: string, idx: number) => ({
            type: docTypes[idx] || `doc${idx+1}`,
            url,
            uploaded_at: new Date().toISOString()
          }));
        }

        if (formattedDocuments.length > 0) {
          const { error: docUpdateError } = await supabase
            .from('scholarship_applications')
            .update({ documents: formattedDocuments })
            .eq('id', applicationId)
            .eq('student_id', userId);

          if (docUpdateError) {
            console.error('Failed to update application documents:', docUpdateError);
          } else {
            console.log('Application documents updated');
          }
        }
      }

      // Atualiza perfil do usuário para marcar que pagou a application fee
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ is_application_fee_paid: true })
        .eq('user_id', userId);

      if (profileError) {
        console.error('Failed to update user_profiles:', profileError);
        throw new Error(`Failed to update user_profiles: ${profileError.message}`);
      }

      console.log('User profile updated - application fee paid');

      // Limpa carrinho
      const { error: cartError } = await supabase.from('user_cart').delete().eq('user_id', userId);
      if (cartError) {
        console.error('Failed to clear user_cart:', cartError);
      } else {
        console.log('User cart cleared');
      }

      return corsResponse({ 
        status: 'complete', 
        message: 'Session verified and processed successfully.',
        applicationId: applicationId
      }, 200);
    } else {
      console.log('Session not paid or complete.');
      return corsResponse({ message: 'Session not ready.', status: session.status }, 202);
    }
  } catch (error: any) {
    console.error(`--- CRITICAL ERROR in verify-stripe-session-application-fee ---:`, error.message);
    return corsResponse({ error: 'An unexpected error occurred.', details: error.message }, 500);
  }
}); 