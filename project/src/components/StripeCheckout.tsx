import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { STRIPE_PRODUCTS } from '../stripe-config';
import { supabase } from '../lib/supabase';
import { PreCheckoutModal } from './PreCheckoutModal';

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
  const [showPreCheckoutModal, setShowPreCheckoutModal] = useState(false);
  const { isAuthenticated, updateUserProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const product = STRIPE_PRODUCTS[productId as keyof typeof STRIPE_PRODUCTS];
  
  if (!product) {
    console.error(`Product '${productId}' não encontrado em stripe-config.ts. Verifique se o nome está correto e padronizado.`);
    return <p className="text-red-500">Erro: Produto Stripe não encontrado. Contate o suporte.</p>;
  }

  const handleCheckoutClick = () => {
    if (!isAuthenticated) {
      onError?.('You must be logged in to checkout');
      return;
    }

    // Mostrar modal de pre-checkout para selection_process apenas se não houver desconto ativo
    if (feeType === 'selection_process') {
      // Verificar se já há desconto ativo antes de mostrar o modal
      checkActiveDiscount();
    } else {
      // Para outros tipos, ir direto para checkout
      handleCheckout();
    }
  };

  const checkActiveDiscount = async () => {
    console.log('🔍 [StripeCheckout] Verificando desconto ativo...');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        console.log('🔍 [StripeCheckout] Sem token, mostrando modal');
        setShowPreCheckoutModal(true);
        return;
      }

      // Verificar se já há desconto ativo usando função RPC diretamente
      console.log('🔍 [StripeCheckout] Chamando get_user_active_discount via RPC...');
      const { data: result, error } = await supabase.rpc('get_user_active_discount', {
        user_id_param: sessionData.session?.user?.id
      });

      if (error) {
        console.error('🔍 [StripeCheckout] Erro na função RPC:', error);
        setShowPreCheckoutModal(true);
        return;
      }

      console.log('🔍 [StripeCheckout] Resultado da verificação:', result);
      
      if (result && result.has_discount) {
        console.log('🔍 [StripeCheckout] ✅ Desconto ativo encontrado, indo direto para checkout');
        // Se já há desconto, ir direto para checkout
        handleCheckout();
      } else {
        console.log('🔍 [StripeCheckout] ❌ Sem desconto ativo, mostrando modal');
        // Se não há desconto, mostrar modal
        setShowPreCheckoutModal(true);
      }
    } catch (error) {
      console.error('🔍 [StripeCheckout] Erro ao verificar desconto:', error);
      // Em caso de erro, mostrar modal por segurança
      setShowPreCheckoutModal(true);
    }
  };

  const handlePreCheckoutProceed = async (discountCode?: string) => {
    console.log('🔍 [StripeCheckout] handlePreCheckoutProceed chamado com código:', discountCode);
    
    // Se há código de desconto, aplicar via edge function
    if (discountCode) {
      try {
        console.log('🔍 [StripeCheckout] Aplicando código de desconto via edge function...');
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        
        if (!token) {
          throw new Error('Usuário não autenticado');
        }

        // Aplicar código de desconto
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-referral-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ affiliate_code: discountCode }),
        });

        const result = await response.json();
        console.log('🔍 [StripeCheckout] Resultado da aplicação do código:', result);
        
        if (!result.success) {
          console.error('🔍 [StripeCheckout] ❌ Erro ao aplicar código:', result.error);
          onError?.(result.error || 'Erro ao aplicar código de desconto');
          return;
        }
        
        console.log('🔍 [StripeCheckout] ✅ Código aplicado com sucesso');
      } catch (error) {
        console.error('🔍 [StripeCheckout] ❌ Erro ao aplicar código:', error);
        onError?.(error instanceof Error ? error.message : 'Erro ao aplicar código de desconto');
        return;
      }
    } else {
      console.log('🔍 [StripeCheckout] Nenhum código de desconto fornecido');
    }

    // Continuar com o checkout
    console.log('🔍 [StripeCheckout] Continuando para checkout...');
    handleCheckout();
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
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
            application_id: applicationId,
            student_process_type: studentProcessType,
          },
          scholarships_ids: scholarshipsIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar sessão de checkout');
      }

      const { session_url } = await response.json();
      if (session_url) {
        window.location.href = session_url;
      } else {
        throw new Error('URL da sessão não encontrada na resposta');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      setError(error.message || 'Erro ao processar checkout');
      onError?.(error.message || 'Erro ao processar checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleCheckoutClick}
        disabled={disabled || loading}
        className={`${className} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? 'Processing...' : buttonText}
      </button>

      {/* Pre-Checkout Modal para Selection Process */}
      {showPreCheckoutModal && (
        <PreCheckoutModal
          isOpen={showPreCheckoutModal}
          onClose={() => setShowPreCheckoutModal(false)}
          onProceedToCheckout={handlePreCheckoutProceed}
          feeType={feeType}
          productName={product.name}
          productPrice={feeType === 'selection_process' ? 50 : 350}
        />
      )}

      {error && (
        <div className="mt-2 text-red-600 text-sm">
          {error}
        </div>
      )}
    </>
  );
};