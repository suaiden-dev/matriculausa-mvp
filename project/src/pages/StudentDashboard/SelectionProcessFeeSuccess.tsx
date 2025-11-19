import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CustomLoading from '../../components/CustomLoading';
import PaymentSuccessOverlay from '../../components/PaymentSuccessOverlay';
import { useDynamicFees } from '../../hooks/useDynamicFees';
import { useTranslation } from 'react-i18next';

const SelectionProcessFeeSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session_id');
  const isPixPayment = params.get('pix_payment') === 'true';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationSuccess, setAnimationSuccess] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);
  const hasRunRef = useRef(false);
  const { selectionProcessFeeAmount } = useDynamicFees();
  const { t } = useTranslation();
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const [promotionalCoupon, setPromotionalCoupon] = useState<string | null>(null);

  // Função para fazer polling do status do PIX (otimizada para webhook)
  const pollPixPaymentStatus = async () => {
    const maxAttempts = 30; // 5 minutos (10s * 30)
    let attempts = 0;
    
    const poll = async () => {
      // Se já foi verificado, parar polling
      if (hasVerified) {
        console.log('[PIX] Já foi verificado, parando polling');
        return;
      }
      
      attempts++;
      console.log(`[PIX] Tentativa ${attempts}/${maxAttempts} - Verificando se webhook processou PIX...`);
      
      try {
        const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_URL;
        const EDGE_FUNCTION_ENDPOINT = `${SUPABASE_PROJECT_URL}/functions/v1/verify-stripe-session-selection-process-fee`;
        let token = null;
        try {
          const raw = localStorage.getItem(`sb-${SUPABASE_PROJECT_URL.split('//')[1].split('.')[0]}-auth-token`);
          if (raw) {
            const tokenObj = JSON.parse(raw);
            token = tokenObj?.access_token || null;
          }
        } catch (e) {
          token = null;
        }
        
        const response = await fetch(EDGE_FUNCTION_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify({ sessionId }),
        });
        
        const data = await response.json();
        console.log(`[PIX] Resposta da API (tentativa ${attempts}):`, data);
        
        // Extrair informações do pagamento
        if (data.final_amount) {
          setPaidAmount(data.final_amount);
        } else if (data.amount_paid) {
          setPaidAmount(data.amount_paid);
        }
        if (data.promotional_coupon) {
          setPromotionalCoupon(data.promotional_coupon);
        }
        
        // Verificar se há erro de sessão não encontrada
        if (data.error && data.error.includes('Session not found')) {
          console.log('[PIX] ⚠️ Sessão não encontrada - pode ter expirado ou sido processada');
          // Se a sessão não foi encontrada, assumir que foi processada com sucesso
          localStorage.removeItem('last_payment_method');
          navigate('/student/dashboard/scholarships');
          return;
        }
        
        // Se for PIX e estiver completo, mostrar animação de sucesso
        if (data.payment_method === 'pix' && data.status === 'complete') {
          console.log('[PIX] ✅ Webhook processou PIX! Mostrando animação...');
          setLoading(false);
          setAnimationSuccess(true);
          setShowAnimation(true);
          setHasVerified(true);
          // Aguardar 6 segundos e então redirecionar
          setTimeout(() => {
            localStorage.removeItem('last_payment_method');
            navigate('/student/dashboard/scholarships');
          }, 6000);
          return;
        }
        
        // Se não for PIX, processar normalmente
        if (data.payment_method !== 'pix' && data.status === 'complete') {
          console.log('[PIX] Pagamento não-PIX confirmado, processando normalmente...');
          setLoading(false);
          setAnimationSuccess(true);
          setShowAnimation(true);
          
          // Aguardar 6 segundos e então redirecionar
          setTimeout(() => {
            navigate('/student/dashboard/scholarships');
          }, 6000);
          return;
        }
        
        if (attempts >= maxAttempts) {
          console.log('[PIX] ⏰ Timeout após 5 minutos - Mostrando erro...');
          setLoading(false);
          setAnimationSuccess(false);
          setShowAnimation(true);
          
          // Aguardar 6 segundos antes de redirecionar
          setTimeout(() => {
            localStorage.removeItem('last_payment_method');
            navigate('/student/dashboard/scholarships');
          }, 6000);
          return;
        }
        
        // Aguardar 10 segundos antes da próxima tentativa
        console.log(`[PIX] ⏳ Aguardando webhook processar... (${attempts}/${maxAttempts})`);
        setTimeout(poll, 10000);
        
      } catch (error) {
        console.error('[PIX] ❌ Erro no polling:', error);
        if (attempts >= maxAttempts) {
          console.log('[PIX] ❌ Erro persistente - Mostrando erro...');
          setLoading(false);
          setAnimationSuccess(false);
          setShowAnimation(true);
          
          setTimeout(() => {
            localStorage.removeItem('last_payment_method');
            navigate('/student/dashboard/scholarships');
          }, 6000);
        } else {
          console.log(`[PIX] ⏳ Tentando novamente em 10s... (${attempts}/${maxAttempts})`);
          setTimeout(poll, 10000);
        }
      }
    };
    
    poll();
  };

  useEffect(() => {
    // Prevenir múltiplas execuções (React Strict Mode executa useEffect duas vezes em desenvolvimento)
    if (hasRunRef.current) {
      console.log('[PIX] Verificação já foi executada, ignorando chamada duplicada do React Strict Mode');
      return;
    }
    
    // Prevenir múltiplas execuções simultâneas
    if (isVerifying) {
      console.log('[PIX] Verificação já em andamento, ignorando chamada duplicada');
      return;
    }
    
    hasRunRef.current = true;
    
    const verifySession = async () => {
      if (!sessionId) {
        setError('Session ID not found in URL.');
        setLoading(false);
        return;
      }

      setIsVerifying(true);

      // Verificar se é pagamento PIX
      if (isPixPayment) {
        console.log('[PIX] Pagamento PIX detectado - iniciando polling para webhook...');
        // Iniciar polling para verificar se webhook já processou
        await pollPixPaymentStatus();
        setIsVerifying(false);
        return;
      }

      // Verificar imediatamente se PIX já foi pago
      console.log('[PIX] Verificando status imediato do PIX...');
      try {
        const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_URL;
        const EDGE_FUNCTION_ENDPOINT = `${SUPABASE_PROJECT_URL}/functions/v1/verify-stripe-session-selection-process-fee`;
        let token = null;
        try {
          const raw = localStorage.getItem(`sb-${SUPABASE_PROJECT_URL.split('//')[1].split('.')[0]}-auth-token`);
          if (raw) {
            const tokenObj = JSON.parse(raw);
            token = tokenObj?.access_token || null;
          }
        } catch (e) {
          token = null;
        }
        
        const response = await fetch(EDGE_FUNCTION_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify({ sessionId }),
        });
        
        const data = await response.json();
        console.log('[PIX] Resposta da verificação:', data);
        
        // Extrair informações do pagamento
        if (data.final_amount) {
          setPaidAmount(data.final_amount);
        } else if (data.amount_paid) {
          setPaidAmount(data.amount_paid);
        }
        if (data.promotional_coupon) {
          setPromotionalCoupon(data.promotional_coupon);
        }
        
        // Verificar se há erro de sessão não encontrada
        if (data.error && data.error.includes('Session not found')) {
          console.log('[PIX] ⚠️ Sessão não encontrada na verificação inicial - assumindo sucesso');
          setLoading(false);
          setAnimationSuccess(true);
          setShowAnimation(true);
          
          setTimeout(() => {
            localStorage.removeItem('last_payment_method');
            navigate('/student/dashboard/scholarships');
          }, 6000);
          return;
        }
        
        // Se PIX já foi pago, mostrar animação de sucesso
        if (data.payment_method === 'pix' && data.status === 'complete') {
          console.log('[PIX] PIX já foi pago! Mostrando animação...');
          setLoading(false);
          setAnimationSuccess(true);
          setShowAnimation(true);
          setHasVerified(true);
          
          setTimeout(() => {
            localStorage.removeItem('last_payment_method');
            const redirectUrl = data.redirect_url || '/student/dashboard/scholarships';
            console.log('[PIX] Redirecionando para:', redirectUrl);
            navigate(redirectUrl);
          }, 6000);
          return;
        }
        
        // Se não for PIX, processar normalmente
        if (data.payment_method !== 'pix' && data.status === 'complete') {
          console.log('[PIX] Pagamento não-PIX confirmado, processando normalmente...');
          setHasVerified(true);
          setLoading(false);
          setAnimationSuccess(true);
          setShowAnimation(true);
          
          setTimeout(() => {
            navigate('/student/dashboard/scholarships');
          }, 6000);
          return;
        }
        
        // Se ainda não foi pago, iniciar polling
        console.log('[PIX] PIX ainda não foi pago, iniciando polling...');
        await pollPixPaymentStatus();
        
      } catch (error) {
        console.error('[PIX] Erro na verificação inicial:', error);
        // Em caso de erro, iniciar polling mesmo assim
        await pollPixPaymentStatus();
      } finally {
        setIsVerifying(false);
      }
    };
    verifySession();
  }, [sessionId, isPixPayment]);

  // Debug: Log das mudanças de estado
  useEffect(() => {
    console.log('🔄 Estado mudou:', { loading, showAnimation, animationSuccess });
  }, [loading, showAnimation, animationSuccess]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center bg-white px-4 relative">
      {/* Conteúdo principal - só mostra se ainda está carregando */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
          <CustomLoading 
            color="green" 
            title={t('successPages.selectionProcessFee.verifying')} 
            message={t('successPages.selectionProcessFee.pleaseWait')} 
          />
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
          <svg className="h-16 w-16 text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
          </svg>
          <h1 className="text-3xl font-bold text-red-700 mb-2">{t('successPages.selectionProcessFee.errorTitle')}</h1>
          <p className="text-slate-700 mb-6 text-center">
            {t('successPages.selectionProcessFee.errorMessage')}<br/>
            {t('successPages.selectionProcessFee.errorRetry')}
          </p>
          <button 
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300" 
            onClick={() => navigate('/student/dashboard/scholarships')}
          >
            {t('successPages.selectionProcessFee.button')}
          </button>
        </div>
      ) : (
        /* Overlay com animação */
        <PaymentSuccessOverlay
          isSuccess={animationSuccess}
          title={animationSuccess 
            ? t('successPages.selectionProcessFee.title')
            : t('successPages.selectionProcessFee.errorTitle')
          }
          message={animationSuccess
            ? (() => {
                const displayAmount = paidAmount ? paidAmount.toFixed(2) : (selectionProcessFeeAmount?.toFixed(2) || '400.00');
                const baseMessage = t('successPages.common.paymentProcessedAmount', { amount: displayAmount });
                return promotionalCoupon 
                  ? `${baseMessage} (Cupom ${promotionalCoupon} aplicado)`
                  : baseMessage;
              })()
            : t('successPages.common.paymentError')
          }
        />
      )}
    </div>
  );
};

export default SelectionProcessFeeSuccess;