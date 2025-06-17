// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'stripe'

// Inicializa o cliente Stripe com a chave secreta do Supabase Secret
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
});

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  try {
    // Obtenha o studentId do corpo da requisição JSON enviada pelo frontend
    const { studentId } = await req.json();

    // Validação: Verificar se o studentId foi fornecido
    if (!studentId) {
      return new Response(JSON.stringify({ error: 'studentId é obrigatório.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Criar o PaymentIntent no Stripe para $350 USD
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 35000, // $350.00 em centavos
      currency: 'usd',
      metadata: { student_id: studentId },
    });

    // Retornar o client_secret para o frontend
    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro na Edge Function create-payment-intent:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-payment-intent' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
