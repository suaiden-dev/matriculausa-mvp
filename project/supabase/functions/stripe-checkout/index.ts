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

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  // For 204 No Content, don't include Content-Type or body
  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const { price_id, success_url, cancel_url, mode } = await req.json();

    if (!price_id || !success_url || !cancel_url || !mode) {
      console.error('Missing required fields for checkout session:', { price_id, success_url, cancel_url, mode });
      return corsResponse({ error: 'Missing required fields: price_id, success_url, cancel_url, or mode' }, 400);
    }

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      console.error('Authentication error:', getUserError);
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }

    if (!user) {
      console.error('User not found after authentication.');
      return corsResponse({ error: 'User not found' }, 404);
    }

    let customerId;

    const { data: existingCustomerRow, error: getCustomerError } = await supabase
      .from('stripe_customers')
      .select('id, user_id, customer_id, deleted_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (getCustomerError) {
      console.error('Failed to fetch customer information from the database:', getCustomerError);
      return corsResponse({ error: 'Failed to fetch customer information' }, 500);
    }

    if (existingCustomerRow) {
      console.log(`Found mapping for user ${user.id}: customer_id=${existingCustomerRow.customer_id}, deleted_at=${existingCustomerRow.deleted_at}`);

      let stripeCustomerFromDb: Stripe.Customer | null = null;
      try {
        stripeCustomerFromDb = await stripe.customers.retrieve(existingCustomerRow.customer_id);
        if (stripeCustomerFromDb && stripeCustomerFromDb.deleted) {
          console.log(`Stripe customer ${existingCustomerRow.customer_id} found in Stripe but is deleted. Treating as non-existent.`);
          stripeCustomerFromDb = null;
        } else if (stripeCustomerFromDb) {
          console.log(`Stripe customer ${existingCustomerRow.customer_id} found and active in Stripe.`);
        }
      } catch (retrieveError: any) {
        if (retrieveError.code === 'resource_missing') {
          console.log(`Stripe customer ${existingCustomerRow.customer_id} not found in Stripe. Will create new.`);
          stripeCustomerFromDb = null;
        } else {
          console.error('Error retrieving Stripe customer:', retrieveError);
          return corsResponse({ error: 'Failed to verify Stripe customer with Stripe API' }, 500);
        }
      }

      if (stripeCustomerFromDb) {
        customerId = existingCustomerRow.customer_id;
        if (existingCustomerRow.deleted_at !== null) {
          const { error: updateCustomerError } = await supabase
            .from('stripe_customers')
            .update({ deleted_at: null, updated_at: new Date().toISOString() })
            .eq('id', existingCustomerRow.id);
          if (updateCustomerError) {
            console.error('Failed to reactivate customer mapping:', updateCustomerError);
            return corsResponse({ error: 'Failed to reactivate customer mapping' }, 500);
          }
          console.log(`Reactivated mapping for ${customerId}.`);
        } else {
          console.log(`Using active mapping for ${customerId}.`);
        }
      } else {
        console.log(`Stripe customer from DB mapping is gone. Creating a NEW Stripe customer.`);
        const newStripeCustomer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id },
        });
        customerId = newStripeCustomer.id;

        const { error: updateCustomerError } = await supabase
          .from('stripe_customers')
          .update({ customer_id: newStripeCustomer.id, deleted_at: null, updated_at: new Date().toISOString() })
          .eq('id', existingCustomerRow.id);

        if (updateCustomerError) {
          console.error('Failed to update mapping with new Stripe ID:', updateCustomerError);
          try { await stripe.customers.del(newStripeCustomer.id); } catch (delErr) { console.error('Cleanup failed:', delErr); }
          return corsResponse({ error: 'Failed to update customer mapping with new Stripe ID' }, 500);
        }
        console.log(`Updated mapping with new Stripe customer ${customerId}.`);
      }
    } else {
      console.log(`No existing customer mapping found. Creating NEW Stripe customer and mapping.`);
      const newStripeCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = newStripeCustomer.id;

      const { error: createCustomerError } = await supabase.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: newStripeCustomer.id,
      });
      if (createCustomerError) {
        console.error('Failed to save NEW customer information:', createCustomerError);
        try { await stripe.customers.del(newStripeCustomer.id); } catch (delErr) { console.error('Cleanup failed:', delErr); }
        return corsResponse({ error: 'Failed to create new customer mapping' }, 500);
      }
      console.log(`Successfully created new customer mapping ${customerId}.`);
    }

    console.log(`Attempting to create Stripe Checkout Session with customerId: ${customerId}`);
    console.log(`Session parameters: price_id=${price_id}, success_url=${success_url}, cancel_url=${cancel_url}, mode=${mode}`);

    let session;
    try {
      if (mode === 'subscription') {
        session = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: 'subscription',
          line_items: [
            {
              price: price_id,
              quantity: 1,
            },
          ],
          success_url: success_url,
          cancel_url: cancel_url,
        });
      } else if (mode === 'payment') {
        session = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: 'payment',
          line_items: [
            {
              price: price_id,
              quantity: 1,
            },
          ],
          success_url: success_url,
          cancel_url: cancel_url,
        });
      } else {
        console.error('Invalid checkout mode provided:', mode);
        return corsResponse({ error: 'Invalid checkout mode' }, 400);
      }
      console.log('Stripe Checkout Session created successfully. Session URL:', session.url);
    } catch (sessionError: any) {
      console.error('Error during stripe.checkout.sessions.create:', sessionError);
      return corsResponse({ error: sessionError.message || 'Failed to create Stripe Checkout Session.' }, 500);
    }

    return corsResponse({ session_url: session.url });
  } catch (error: any) {
    console.error(`Checkout error (caught in main try/catch): ${error.message}`, error);
    return corsResponse({ error: error.message || 'An unexpected error occurred during checkout.' }, 500);
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