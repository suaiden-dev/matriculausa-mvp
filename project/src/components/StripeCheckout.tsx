import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
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
  const [showModal, setShowModal] = useState(false);
  const { isAuthenticated } = useAuth();
  
  const product = PRODUCTS[productId];
  
  if (!product) {
    console.error(`Product ${productId} not found in stripe-config.ts`);
    return null;
  }

  // Bloqueia/desbloqueia o scroll do body quando o modal está aberto
  useEffect(() => {
    if (showModal) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [showModal]);

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

  // Modal de requisitos
  const RequiredDocumentsModal = ({ open, onClose, onContinue }: { open: boolean, onClose: () => void, onContinue: () => void }) => {
    if (!open) return null;
    return ReactDOM.createPortal(
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[1000]">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 relative animate-fade-in">
          <h2 className="text-2xl font-extrabold mb-6 text-slate-800 text-center">Required Documents</h2>
          <ul className="mb-6 space-y-4">
            <li className="flex items-center gap-3">
              <span className="text-3xl">🛂</span>
              <div>
                <div className="font-semibold text-slate-700">Passport</div>
                <div className="text-sm text-gray-500">Valid passport (photo page)</div>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-3xl">🎓</span>
              <div>
                <div className="font-semibold text-slate-700">High School Diploma</div>
                <div className="text-sm text-gray-500">Proof of high school completion</div>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-3xl">💵</span>
              <div>
                <div className="font-semibold text-slate-700">Proof of Funds</div>
                <div className="text-sm text-gray-500">Recent bank statement</div>
              </div>
            </li>
          </ul>
          <div className="flex justify-end gap-3 mt-2">
            <button onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition">Cancel</button>
            <button onClick={onContinue} className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">Continue to Payment</button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      <RequiredDocumentsModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onContinue={() => { setShowModal(false); handleCheckout(); }}
      />
      <button
        onClick={() => setShowModal(true)}
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
    </>
  );
};