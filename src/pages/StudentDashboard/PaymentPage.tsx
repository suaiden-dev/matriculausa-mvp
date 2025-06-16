import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '../../lib/supabase'; // Your Supabase client

// IMPORTANT: Replace 'YOUR_STRIPE_PUBLISHABLE_KEY_HERE' with the actual Stripe publishable key
const stripePromise = loadStripe('YOUR_STRIPE_PUBLISHABLE_KEY_HERE');

// Inner component for the checkout form
const CheckoutForm = ({ clientSecret, studentId }: { clientSecret: string, studentId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/student/payment-status`, // Redirects to a post-payment status page
      },
    });

    if (error && (error.type === "card_error" || error.type === "validation_error")) {
      setMessage(error.message || '');
    } else if (error) {
      setMessage("An unexpected error occurred.");
    }
    setIsLoading(false);
  };

  const paymentElementOptions = {
    layout: "tabs", // Or "accordion", "auto"
    // Add appearance options here to customize the PaymentElement visual style
    // E.g.: appearance: { theme: 'stripe' }
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement id="payment-element" options={paymentElementOptions} />
      <button disabled={isLoading || !stripe || !elements} id="submit">
        <span id="button-text">
          {isLoading ? "Processing..." : "Pay $350"}
        </span>
      </button>
      {message && <div id="payment-message">{message}</div>}
    </form>
  );
};

// Main payment page component
const PaymentPage = () => {
  const [clientSecret, setClientSecret] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentIntent = async () => {
      // 1. Get the studentId of the logged-in user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.error("No active session found for student.");
        // Redirect to login or show error
        return;
      }
      setStudentId(session.user.id);

      // 2. Call the Edge Function to create the PaymentIntent
      // IMPORTANT: Replace <YOUR_PROJECT_REF> with your actual Supabase project ID
      const edgeFunctionUrl = `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/create-payment-intent`;

      try {
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Send the authentication token of the logged-in user (IMPORTANT for RLS on Edge Function if protected)
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ studentId: session.user.id }),
        });
        const data = await response.json();

        if (response.ok && data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          console.error("Error getting clientSecret:", data.error || data);
          // Handle error: show message to user
        }
      } catch (error) {
        console.error("Error requesting Edge Function:", error);
        // Handle network or request error
      }
    };

    fetchPaymentIntent();
  }, []);

  if (!clientSecret || !studentId) {
    return <div>Loading payment form...</div>; // Or a spinner
  }

  const options = {
    clientSecret,
    // Add appearance options for the PaymentElement here, if desired
    // E.g.: appearance: { theme: 'stripe' }
  };

  return (
    <Elements options={options} stripe={stripePromise}>
      <CheckoutForm clientSecret={clientSecret} studentId={studentId} />
    </Elements>
  );
};

export default PaymentPage; 