import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    const { price_id, success_url, cancel_url, mode, metadata } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsResponse({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return corsResponse({ error: 'Invalid token' }, 401);
    }

    console.log('[stripe-checkout-application-fee] Received payload:', { price_id, success_url, cancel_url, mode, metadata });

    // Busca o perfil do usuário para obter o user_profiles.id correto
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, user_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('[stripe-checkout-application-fee] User profile not found:', profileError);
      return corsResponse({ error: 'User profile not found' }, 404);
    }

    // Verifica se application_id foi fornecido
    let applicationId = metadata?.application_id;
    if (!applicationId) {
      return corsResponse({ error: 'Application ID is required in metadata' }, 400);
    }

    // Verifica se a aplicação existe e pertence ao usuário (usando userProfile.id)
    let { data: application, error: appError } = await supabase
      .from('scholarship_applications')
      .select('id, student_id, scholarship_id, student_process_type')
      .eq('id', applicationId)
      .eq('student_id', userProfile.id)
      .single();

    // Se a aplicação não existe, tenta criar uma nova
    if (appError || !application) {
      console.log('[stripe-checkout-application-fee] Application not found, attempting to create new one');
      
      // Extrai scholarship_id do metadata se disponível
      const scholarshipId = metadata?.selected_scholarship_id || metadata?.scholarship_id;
      if (!scholarshipId) {
        console.error('[stripe-checkout-application-fee] No scholarship_id in metadata to create application');
        return corsResponse({ error: 'Application not found and scholarship_id missing to create new one' }, 404);
      }

      // Preparar dados da aplicação incluindo student_process_type se disponível
      const applicationData: any = {
        student_id: userProfile.id,
        scholarship_id: scholarshipId,
        status: 'pending',
        applied_at: new Date().toISOString(),
      };

      // Adicionar student_process_type se disponível no metadata
      if (metadata?.student_process_type) {
        applicationData.student_process_type = metadata.student_process_type;
        console.log('[stripe-checkout-application-fee] Adding student_process_type:', metadata.student_process_type);
      }

      // Cria nova aplicação usando userProfile.id (correto)
      const { data: newApp, error: insertError } = await supabase
        .from('scholarship_applications')
        .insert(applicationData)
        .select('id, student_id, scholarship_id, student_process_type')
        .single();

      if (insertError || !newApp) {
        console.error('[stripe-checkout-application-fee] Error creating application:', insertError);
        return corsResponse({ error: 'Failed to create application' }, 500);
      }

      application = newApp;
      applicationId = newApp.id;
      console.log('[stripe-checkout-application-fee] New application created:', application.id);
    } else {
      console.log('[stripe-checkout-application-fee] Application verified:', application.id);
      
      // Se a aplicação existe mas não tem student_process_type, atualiza se disponível
      if (!application.student_process_type && metadata?.student_process_type) {
        console.log('[stripe-checkout-application-fee] Updating existing application with student_process_type:', metadata.student_process_type);
        const { error: updateError } = await supabase
          .from('scholarship_applications')
          .update({ student_process_type: metadata.student_process_type })
          .eq('id', application.id);
        
        if (updateError) {
          console.error('[stripe-checkout-application-fee] Error updating student_process_type:', updateError);
        }
      }
    }

    // Monta o metadata para o Stripe (usando user.id para compatibilidade com webhooks)
    const sessionMetadata = {
      student_id: user.id,
      fee_type: 'application_fee',
      application_id: applicationId,
      student_process_type: application?.student_process_type || metadata?.student_process_type || null,
      ...metadata,
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      client_reference_id: user.id,
      customer_email: user.email,
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: mode || 'payment',
      success_url: success_url,
      cancel_url: cancel_url,
      metadata: sessionMetadata,
    });

    console.log('[stripe-checkout-application-fee] Created Stripe session with metadata:', session.metadata);

    return corsResponse({ session_url: session.url }, 200);
  } catch (error) {
    console.error('Checkout error:', error);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
}); 