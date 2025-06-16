// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Stripe from 'stripe'

console.log("Hello from Functions!")

// This function will not work until STRIPE_SECRET_KEY is set in Supabase Secrets.
// @ts-expect-error Deno global is available at runtime in Supabase Edge Functions
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16', // Use the latest Stripe API version
});

// @ts-expect-error Deno global is available at runtime in Supabase Edge Functions
Deno.serve(async (req) => {
  try {
    // Get the studentId from the JSON request body sent by the frontend
    const { studentId } = await req.json();

    // Validation: Check if studentId is provided
    if (!studentId) {
      return new Response(JSON.stringify({ error: 'studentId is required.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400, // Bad Request
      });
    }

    // 1. Create the PaymentIntent in Stripe for $350 USD
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 35000, // Amount in cents (350 * 100)
      currency: 'usd', // Currency
      metadata: { student_id: studentId }, // Link the PaymentIntent to the student's ID for tracking
      // payment_method_types: ['card'], // Optional: specify payment methods
    });

    // 2. Return the client_secret to the frontend
    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200, // OK
    });

  } catch (error) {
    // Error handling: log the error and return an error response to the frontend
    console.error('Error in create-payment-intent Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400, // Bad Request or specific error
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-payment-intent' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
