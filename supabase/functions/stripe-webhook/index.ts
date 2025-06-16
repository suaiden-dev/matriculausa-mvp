import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'stripe'

// Initialize the Stripe client with the secret key.
// The key will be read from a Supabase Secret.
// @ts-expect-error Deno global is available at runtime in Supabase Edge Functions
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15', // Use the latest Stripe API version
});

// Initialize the Supabase client with the Service Role Key to bypass RLS.
// IMPORTANT: Replace <YOUR_PROJECT_REF> with your actual Supabase project ID
// and ensure SUPABASE_SERVICE_ROLE_KEY is set in Supabase Secrets.
// @ts-expect-error Deno global is available at runtime in Supabase Edge Functions
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') as string,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
);

// @ts-expect-error Deno global is available at runtime in Supabase Edge Functions
Deno.serve(async (req) => {
  let event: Stripe.Event; // Declare event variable here
  const signature = req.headers.get('stripe-signature');
  // @ts-expect-error Deno global is available at runtime in Supabase Edge Functions
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET'); // Webhook signing secret from Stripe

  // 1. Webhook Signature Verification (CRITICAL for security)
  // Check if signature or secret are missing.
  if (!signature || !webhookSecret) {
    console.error("Missing Stripe-Signature header or webhook secret.");
    return new Response("Missing Stripe-Signature header or webhook secret.", { status: 400 });
  }

  try {
    const body = await req.text(); // The request body MUST be read as raw text for signature verification
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    // Error in signature verification or body parsing
    console.error(`Webhook Error: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 2. Process Stripe Events (NEW LOGIC STARTS HERE)
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
      const studentIdSuccess = paymentIntentSucceeded.metadata?.student_id;
      console.log(`PaymentIntent succeeded: ${paymentIntentSucceeded.id} for student ${studentIdSuccess}`);

      if (!studentIdSuccess) {
        console.warn(`PaymentIntent succeeded without student_id metadata: ${paymentIntentSucceeded.id}`);
        return new Response('Missing student_id in metadata', { status: 400 });
      }

      // 2.1. Update student status in user_profiles table
      const { error: updateUserError } = await supabase
        .from('user_profiles')
        .update({
          is_application_fee_paid: true,
          stripe_payment_intent_id: paymentIntentSucceeded.id,
          stripe_customer_id: paymentIntentSucceeded.customer ? String(paymentIntentSucceeded.customer) : null
        })
        .eq('user_id', studentIdSuccess);

      if (updateUserError) {
        console.error('Error updating user_profiles for success:', updateUserError.message);
        return new Response('Database update error for user_profiles', { status: 500 });
      }

      // 2.2. Insert record into 'payments' table
      const { error: insertPaymentError } = await supabase
        .from('payments')
        .insert({
          student_id: studentIdSuccess,
          payment_type: 'application_fee',
          amount_charged: paymentIntentSucceeded.amount / 100,
          currency: paymentIntentSucceeded.currency,
          status: 'succeeded',
          stripe_charge_id: (paymentIntentSucceeded.charges?.data?.[0]?.id || null),
          stripe_payment_intent_id: paymentIntentSucceeded.id,
          platform_fee_amount: paymentIntentSucceeded.amount / 100,
          amount_transferred_to_recipient: 0
        });

      if (insertPaymentError) {
        console.error('Error inserting record into payments:', insertPaymentError.message);
        return new Response('Database insert error for payments', { status: 500 });
      }

      console.log('User profile and payment record updated successfully.');
      // TODO: Trigger notifications (email/WhatsApp) for the student - to be handled by n8n/João
      break;
    }
    case 'payment_intent.payment_failed': {
      const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
      const studentIdFailed = paymentIntentFailed.metadata?.student_id;
      console.log(`PaymentIntent failed: ${paymentIntentFailed.id} for student ${studentIdFailed}`);

      if (!studentIdFailed) {
        console.warn(`PaymentIntent failed without student_id metadata: ${paymentIntentFailed.id}`);
        return new Response('Missing student_id in metadata for failed payment', { status: 400 });
      }

      // Optional: Update student status in user_profiles for failure
      // This is useful for tracking attempts or showing explicit failure status
      const { error: updateFailedError } = await supabase
        .from('user_profiles')
        .update({ 
          is_application_fee_paid: false, // Ensure it's false or update to a more specific status
          stripe_payment_intent_id: paymentIntentFailed.id 
        })
        .eq('user_id', studentIdFailed);

      if (updateFailedError) {
        console.error('Error updating user_profiles for failure:', updateFailedError.message);
        return new Response('Database update error for user_profiles (failed payment)', { status: 500 });
      }

      // Optional: Insert record into 'payments' table for failed attempt
      const { error: insertFailedPaymentError } = await supabase
        .from('payments')
        .insert({
          student_id: studentIdFailed,
          payment_type: 'application_fee',
          amount_charged: paymentIntentFailed.amount / 100, // Still log the intended amount
          currency: paymentIntentFailed.currency,
          status: 'failed', // Mark as failed
          stripe_charge_id: (paymentIntentFailed.charges?.data?.[0]?.id || null),
          stripe_payment_intent_id: paymentIntentFailed.id,
          platform_fee_amount: 0, // No fee retained if failed
          amount_transferred_to_recipient: 0
        });

      if (insertFailedPaymentError) {
        console.error('Error inserting failed payment record into payments:', insertFailedPaymentError.message);
        return new Response('Database insert error for failed payment', { status: 500 });
      }

      console.log('User profile and payment record updated for failed attempt.');
      // TODO: Trigger notifications (email/WhatsApp) for the student about the failure - to be handled by n8n/João
      break; // Don't forget the break statement!
    }
    // Add other Stripe events you want to handle here
    default:
      console.warn(`Unhandled Webhook Event Type: ${event.type}`);
  }

  // 3. Return a 200 OK status to Stripe (very important)
  return new Response('OK', { status: 200 });
}); 