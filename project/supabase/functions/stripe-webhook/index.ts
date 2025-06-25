import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  console.log('[stripe-webhook] Received a request.');
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else if (mode === 'payment' && payment_status === 'paid') {
      const session = stripeData as Stripe.Checkout.Session;
      const { metadata, payment_intent, customer } = session;

      if (metadata?.payment_type === 'application_fee') {
        const userId = metadata.user_id;
        const applicationId = metadata.application_id;

        if (!userId || !applicationId) {
          console.error('Missing user_id or application_id in metadata for application_fee payment.');
          return;
        }

        // Atualizar status da aplicação existente para 'under_review'
        const { error: updateError } = await supabase
          .from('scholarship_applications')
          .update({ status: 'under_review' })
          .eq('id', applicationId)
          .eq('student_id', userId);
        if (updateError) {
          console.error(`Failed to update application for user ${userId} and application ${applicationId}:`, updateError);
        } else {
          console.log(`Successfully updated application for user ${userId} for application ${applicationId}.`);
        }

        // Atualizar o perfil do usuário
        const { error: profileUpdateError } = await supabase
          .from('user_profiles')
          .update({ is_application_fee_paid: true })
          .eq('user_id', userId);
        if (profileUpdateError) {
          console.error(`Failed to update user_profile for user ${userId}:`, profileUpdateError);
        } else {
          console.log(`Successfully updated is_application_fee_paid for user ${userId}.`);
        }
      } else if (metadata?.payment_type === 'scholarship_fee') {
        // Log detalhado do metadata recebido
        console.log('[stripe-webhook] Metadata recebido:', metadata);
        const applicationId = metadata.application_id;
        const userId = metadata.user_id || metadata.student_id;
        console.log('[stripe-webhook] applicationId extraído:', applicationId);
        console.log('[stripe-webhook] userId/studentId extraído:', userId);

        if (!applicationId) {
            console.error('Missing application_id in metadata for scholarship_fee payment. Metadata:', metadata);
            return;
        }

        // Log para depuração
        console.log(`[stripe-webhook] Atualizando status para approved. applicationId: ${applicationId}, userId/studentId: ${userId}`);

        // Atualiza com ou sem userId/studentId
        let updateQuery = supabase
            .from('scholarship_applications')
            .update({ status: 'approved' })
            .eq('id', applicationId);
        if (userId) {
          updateQuery = updateQuery.eq('student_id', userId);
        }
        const { error: updateError } = await updateQuery;

        if (updateError) {
            console.error(`[stripe-webhook] Failed to update application status for application ${applicationId}:`, updateError);
        } else {
            console.log(`[stripe-webhook] Successfully updated status for application ${applicationId} to approved.`);
        }
      }

      try {
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;

        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed', // assuming we want to mark it as completed since payment is successful
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // TODO verify if needed
    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}

export default async function handler(req: Request) {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Verificar se é um pagamento da taxa de inscrição
        if (session.metadata?.payment_type === 'application_fee') {
          const userId = session.metadata?.user_id;
          const applicationId = session.metadata?.application_id;
          
          if (userId && applicationId) {
            // Atualizar o status da aplicação existente para 'under_review'
            const { error } = await supabase
              .from('scholarship_applications')
              .update({ 
                status: 'under_review',
                updated_at: new Date().toISOString()
              })
              .eq('id', applicationId)
              .eq('student_id', userId);

            if (error) {
              console.error('Error updating application status:', error);
            } else {
              console.log('Application fee payment processed successfully for user:', userId);
            }
          }
        }
        
        // Novo: Verificar se é um pagamento da scholarship fee
        if (session.metadata?.payment_type === 'scholarship_fee') {
          const userId = session.metadata?.user_id;
          const scholarshipsIds = session.metadata?.scholarships_ids;
          const paymentIntentId = session.payment_intent;
          
          if (userId) {
            // Atualizar o status da scholarship fee no perfil do usuário
            const { error } = await supabase
              .from('user_profiles')
              .update({ 
                is_scholarship_fee_paid: true,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId);

            if (error) {
              console.error('Error updating scholarship fee status:', error);
            } else {
              console.log('Scholarship fee payment processed successfully for user:', userId);
            }
            // Se houver bolsas no metadata, registrar na tabela de pagamentos de scholarship fee
            if (scholarshipsIds && paymentIntentId) {
              const { error: insertError } = await supabase
                .from('scholarship_fee_payments')
                .insert({
                  user_id: userId,
                  scholarships_ids: scholarshipsIds,
                  payment_intent_id: paymentIntentId,
                  created_at: new Date().toISOString()
                });
              if (insertError) {
                console.error('Error inserting scholarship fee payment record:', insertError);
              } else {
                console.log('Scholarship fee payment record inserted for user:', userId);
              }
            }
          }
        }
        
        // Processar outros tipos de pagamento (como a taxa de processo seletivo)
        if (session.metadata?.payment_type === 'selection_process') {
          const userId = session.metadata?.user_id;
          
          if (userId) {
            const { error } = await supabase
              .from('user_profiles')
              .update({ 
                has_paid_selection_process_fee: true,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId);

            if (error) {
              console.error('Error updating selection process fee status:', error);
            }
          }
        }
        break;

      // ... handle other events as needed ...
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook error', { status: 500 });
  }
}