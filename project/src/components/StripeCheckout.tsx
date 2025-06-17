import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { PRODUCTS } from '../stripe-config';

interface StripeCheckoutProps {
  productId: keyof typeof PRODUCTS;
  buttonText?: string;
  className?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  productId,
  buttonText = 'Checkout',
  className = '',
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  
  const product = PRODUCTS[productId];
  
  if (!product) {
    console.error(`Product ${productId} not found in stripe-config.ts`);
    return null;
  }

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      onError?.('You must be logged in to checkout');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;
      const { data: sessionData } = await import('../lib/supabase').then(m => m.supabase.auth.getSession());
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error('Usuário não autenticado. Token não encontrado.');
      }
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price_id: product.priceId,
          success_url: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/checkout/cancel`,
          mode: product.mode
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.session_url) {
        window.location.href = data.session_url;
        onSuccess?.();
      } else {
        console.error('DEBUG: data.session_url is falsy. Value:', data.session_url, 'Type:', typeof data.session_url);
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      onError?.(error.message || 'An error occurred during checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={`bg-[#D0151C] text-white px-6 py-3 rounded-xl hover:bg-[#B01218] transition-all duration-300 font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Processing...
        </div>
      ) : (
        buttonText
      )}
    </button>
  );
};