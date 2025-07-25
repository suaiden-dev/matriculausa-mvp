// @ts-nocheck
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

    const { price_id, success_url, cancel_url, mode, fee_type, metadata } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsResponse({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return corsResponse({ error: 'Invalid token' }, 401);
    }

    console.log('[stripe-checkout] Received payload:', { price_id, success_url, cancel_url, mode, fee_type, metadata });

    let applicationId = null;
    let sessionMetadata = {
      student_id: user.id,
      fee_type: fee_type,
      payment_type: fee_type,
      ...metadata,
    };

    if (fee_type === 'application_fee' || fee_type === 'scholarship_fee') {
      // --- Application/Scholarship Fee: exige selected_scholarship_id ---
      const selectedScholarshipId = metadata?.selected_scholarship_id;
      const studentProcessType = metadata?.student_process_type;
      if (!selectedScholarshipId) {
        return corsResponse({ error: 'selected_scholarship_id é obrigatório para application_fee e scholarship_fee' }, 400);
      }
      // Verifica se já existe uma aplicação para este usuário e bolsa
      const { data: existingApp, error: findError } = await supabase
        .from('scholarship_applications')
        .select('id, student_process_type')
        .eq('student_id', user.id)
        .eq('scholarship_id', selectedScholarshipId)
        .maybeSingle();
      if (findError) {
        console.error('Erro ao buscar aplicação existente:', findError);
        return corsResponse({ error: 'Erro ao buscar aplicação existente' }, 500);
      }
      if (!existingApp) {
        // Cria nova aplicação
        const { data: newApp, error: insertError } = await supabase
          .from('scholarship_applications')
          .insert([
            {
              student_id: user.id,
              scholarship_id: selectedScholarshipId,
              status: 'pending',
              student_process_type: studentProcessType || null,
            },
          ])
          .select('id')
          .single();
        if (insertError || !newApp) {
          console.error('Erro ao criar aplicação:', insertError);
          return corsResponse({ error: 'Erro ao criar aplicação' }, 500);
        }
        applicationId = newApp.id;
      } else {
        applicationId = existingApp.id;
        // Atualiza o campo student_process_type se estiver vazio
        if (!existingApp.student_process_type && studentProcessType) {
          const { error: updateError } = await supabase
            .from('scholarship_applications')
            .update({ student_process_type: studentProcessType })
            .eq('id', applicationId);
          if (updateError) {
            console.error('Erro ao atualizar student_process_type:', updateError);
            return corsResponse({ error: 'Erro ao atualizar tipo de processo' }, 500);
          }
        }
      }
      // Garante que application_id sempre vai para o metadata
      sessionMetadata = {
        ...sessionMetadata,
      application_id: applicationId,
    };
    } else if (fee_type === 'selection_process') {
      // --- Selection Process Fee: não exige application, só marca o usuário ---
      // Nenhuma lógica extra aqui, apenas segue para criar a sessão Stripe
    } else {
      return corsResponse({ error: `fee_type inválido: ${fee_type}` }, 400);
    }

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

    console.log('[stripe-checkout] Created Stripe session with metadata:', session.metadata);

    return corsResponse({ session_url: session.url }, 200);
  } catch (error) {
    console.error('Checkout error:', error);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
});

type ExpectedType = 'string' | { values: string[] };
type Expectations<T> = { [K in keyof T]: ExpectedType };

function validateParameters<T extends Record<string, any>>(values: T, expected: Expectations<T>): string | undefined {
  for (const parameter in values) {
    const expectation = expected[parameter];
    const value = values[parameter];

    if (expectation === 'string') {
      if (value == null) {
        return `Missing required parameter ${parameter}`;
      }
      if (typeof value !== 'string') {
        return `Expected parameter ${parameter} to be a string got ${JSON.stringify(value)}`;
      }
    } else {
      if (!expectation.values.includes(value)) {
        return `Expected parameter ${parameter} to be one of ${expectation.values.join(', ')}`;
      }
    }
  }

  return undefined;
}