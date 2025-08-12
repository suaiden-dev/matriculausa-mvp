import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { STRIPE_PRODUCTS } from '../stripe-config';
import { supabase } from '../lib/supabase';

interface StripeCheckoutProps {
  productId: keyof typeof STRIPE_PRODUCTS;
  buttonText?: string;
  className?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  paymentType?: string;
  feeType: 'application_fee' | 'enrollment_fee' | 'scholarship_fee' | 'selection_process';
  scholarshipsIds?: string[];
  successUrl?: string;
  cancelUrl?: string;
  disabled?: boolean;
  metadata?: { [key: string]: any };
  studentProcessType?: string | null;
  beforeCheckout?: () => Promise<{ applicationId: string } | undefined>;
}

export const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  productId,
  buttonText = 'Checkout',
  className = '',
  onSuccess,
  onError,
  paymentType = 'selection_process',
  feeType,
  scholarshipsIds,
  successUrl,
  cancelUrl,
  disabled = false,
  studentProcessType,
  metadata = {},
  beforeCheckout,
}) => {
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, updateUserProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const product = STRIPE_PRODUCTS[productId as keyof typeof STRIPE_PRODUCTS];
  
  if (!product) {
    console.error(`Product '${productId}' não encontrado em stripe-config.ts. Verifique se o nome está correto e padronizado.`);
    return <p className="text-red-500">Erro: Produto Stripe não encontrado. Contate o suporte.</p>;
  }

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      onError?.('You must be logged in to checkout');
      return;
    }

    setLoading(true);
    try {
      // 🔒 VALIDAÇÃO DE AUTO-REFERÊNCIA: Verificar se o usuário está tentando usar seu próprio código
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          // Buscar o código de afiliado do usuário atual
          const { data: userAffiliateCode, error: codeError } = await supabase
            .from('affiliate_codes')
            .select('code')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();
          
          if (!codeError && userAffiliateCode) {
            console.log('🔍 [StripeCheckout] Usuário tem código próprio:', userAffiliateCode.code);
            console.log('⚠️ [StripeCheckout] ATENÇÃO: Usuário pode tentar usar seu próprio código no checkout!');
            console.log('⚠️ [StripeCheckout] O Stripe não valida auto-referência automaticamente');
            
            // 🔒 BLOQUEAR: Mostrar aviso para o usuário
            const userCode = userAffiliateCode.code;
            const warningMessage = `⚠️ ATENÇÃO: Você tem o código de referência "${userCode}". 
            
❌ NÃO use seu próprio código para obter desconto - isso é considerado fraude e pode resultar em penalidades.

✅ Use apenas códigos de outros usuários para obter descontos legítimos.

Deseja continuar com o checkout?`;
            
            const shouldContinue = window.confirm(warningMessage);
            if (!shouldContinue) {
              setLoading(false);
              setError('Checkout cancelado pelo usuário');
              return;
            }
          }
        } catch (error) {
          console.error('❌ [StripeCheckout] Erro ao verificar código próprio do usuário:', error);
        }
      }

      let applicationId = metadata?.application_id;
      if (beforeCheckout) {
        const result = await beforeCheckout();
        if (result?.applicationId) {
          applicationId = result.applicationId;
        } else {
          setLoading(false);
          setError('Não foi possível criar a aplicação. Tente novamente.');
          return;
        }
      }
      let apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;
      if (feeType === 'selection_process') {
        apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-selection-process-fee`;
      } else if (feeType === 'application_fee') {
        apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-application-fee`;
      } else if (feeType === 'scholarship_fee') {
        apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-scholarship-fee`;
      }
      console.log('Getting session data...');
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Session data:', sessionData);
      const token = sessionData.session?.access_token;
      console.log('Token:', token ? 'Found' : 'Not found');
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
          success_url: (successUrl || `${window.location.origin}/checkout/success`).replace(/\?.*/, '') + '?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: cancelUrl || `${window.location.origin}/checkout/cancel`,
          mode: product.mode,
          payment_type: paymentType,
          fee_type: feeType,
          metadata: {
            ...metadata,
            scholarships_ids: scholarshipsIds?.join(',') ?? undefined,
            selected_scholarship_id: scholarshipsIds?.[0] ?? undefined,
            student_process_type: studentProcessType ?? undefined,
            application_id: applicationId,
          },
        })
      });

      const data = await response.json();
      
      if (!data || data.error) {
        setLoading(false);
        setError(data?.error || 'Erro ao criar sessão de pagamento. Tente novamente.');
        return;
      }
      if (!data.session_url) {
        setLoading(false);
        setError('Falha ao criar sessão de pagamento. Tente novamente.');
        return;
      }
      
      if (data.session_url) {
        window.location.href = data.session_url;
        onSuccess?.();
        setTimeout(() => {
          updateUserProfile({});
        }, 2000);
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
    <>
      <button
        onClick={handleCheckout}
        disabled={loading || disabled}
        className={`bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-300 font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
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
      {error && (
        <p className="text-red-500 mt-2">{error}</p>
      )}
    </>
  );
};