import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PaymentStatusOverlay from '../../components/PaymentStatusOverlay';
import { useTranslation } from 'react-i18next';
import { dispatchCacheInvalidationEvent, CacheInvalidationEvent } from '../../utils/cacheInvalidation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

const SelectionProcessFeeSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session_id');
  const reference = params.get('reference') || params.get('ref'); // Parcelow
  const paymentMethod = params.get('payment_method') || (params.get('pm') === 'p' ? 'parcelow' : params.get('pm')); // 'parcelow'
  const isPixPayment = params.get('pix_payment') === 'true' || params.get('pm') === 'pix';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationSuccess, setAnimationSuccess] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);
  const { t } = useTranslation(['dashboard', 'common']);
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const { user, userProfile } = useAuth();
  console.log('[SelectionProcessFeeSuccess] Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
  const hasRunRef = useRef(false);

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
        console.log(`[PIX] 🚀 Resposta da API (tentativa ${attempts}):`, data);
        if (data.error) console.error(`[PIX] ❌ Erro retornado pela API:`, data.error);

        // Extrair informações do pagamento
        // Priorizar gross_amount_usd (valor bruto que o aluno realmente pagou), senão usar final_amount ou amount_paid
        if (data.gross_amount_usd !== null && data.gross_amount_usd !== undefined) {
          setPaidAmount(data.gross_amount_usd);
        } else if (data.final_amount) {
          setPaidAmount(data.final_amount);
        } else if (data.amount_paid) {
          setPaidAmount(data.amount_paid);
        }

        // Verificar se há erro de sessão não encontrada
        if (data.error && data.error.includes('Session not found')) {
          console.log('[PIX] ⚠️ Sessão não encontrada - pode ter expirado ou sido processada');
          // Se a sessão não foi encontrada, assumir que foi processada com sucesso
          localStorage.removeItem('last_payment_method');
          navigate('/student/dashboard/selection-survey');
          return;
        }

        // Se for PIX e estiver completo, mostrar animação de sucesso
        if (data.payment_method === 'pix' && data.status === 'complete') {
          console.log('[PIX] ✅ Webhook processou PIX! Mostrando animação...');
          // Invalidar cache
          dispatchCacheInvalidationEvent(CacheInvalidationEvent.PAYMENT_COMPLETED);
          setLoading(false);
          setAnimationSuccess(true);
          setShowAnimation(true);
          setHasVerified(true);
          // Aguardar 6 segundos e então redirecionar
          setTimeout(() => {
            localStorage.removeItem('last_payment_method');
            navigate('/student/dashboard/selection-survey');
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
            navigate('/student/dashboard/selection-survey');
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
            navigate('/student/dashboard/selection-survey');
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
            navigate('/student/dashboard/selection-survey');
          }, 6000);
        } else {
          console.log(`[PIX] ⏳ Tentando novamente em 10s... (${attempts}/${maxAttempts})`);
          setTimeout(poll, 10000);
        }
      }
    };

    poll();
  };

  // Função para verificar pagamento Parcelow
  const verifyParcelowPayment = async () => {
    if (!user?.id || !reference) {
      setError('Invalid Parcelow payment reference.');
      setLoading(false);
      return;
    }

    const maxAttempts = 30; // 5 minutos
    let attempts = 0;

    const poll = async () => {
      if (hasVerified) {
        console.log('[Parcelow] Já foi verificado, parando polling');
        return;
      }

      attempts++;
      console.log(`[Parcelow] Tentativa ${attempts}/${maxAttempts} - Verificando status do pagamento...`);

      try {
        // Buscar pagamento mais recente do usuário para selection_process
        // Usamos ilike com % para lidar com truncamento de URL pela Parcelow
        const { data: payment, error: paymentError } = await supabase
          .from('individual_fee_payments')
          .select('*')
          .eq('user_id', user.id) // ✅ Segurança: filtrar pelo usuárioLogado
          .ilike('parcelow_reference', `${reference}%`) // ✅ Resiliência: lidar com truncamento
          .eq('payment_method', 'parcelow')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (paymentError) {
          console.error('[Parcelow] Erro ao buscar pagamento:', paymentError);
        }

        if (payment) {
          console.log('[Parcelow] Pagamento encontrado, status:', payment.parcelow_status);
          setPaidAmount(payment.amount);

          if (payment.parcelow_status === 'paid') {
            console.log('[Parcelow] ✅ Pagamento confirmado!');
            dispatchCacheInvalidationEvent(CacheInvalidationEvent.PAYMENT_COMPLETED);
            setLoading(false);
            setAnimationSuccess(true);
            setShowAnimation(true);
            setHasVerified(true);

            setTimeout(() => {
              navigate('/student/dashboard/selection-survey');
            }, 6000);
            return;
          }
        }

        if (attempts >= maxAttempts) {
          console.log('[Parcelow] ⏰ Timeout - Mostrando erro...');
          setLoading(false);
          setAnimationSuccess(false);
          setShowAnimation(true);

          setTimeout(() => {
            navigate('/student/dashboard/selection-survey');
          }, 6000);
          return;
        }

        console.log(`[Parcelow] ⏳ Aguardando webhook processar... (${attempts}/${maxAttempts})`);
        setTimeout(poll, 10000);
      } catch (error) {
        console.error('[Parcelow] ❌ Erro no polling:', error);
        if (attempts >= maxAttempts) {
          setLoading(false);
          setAnimationSuccess(false);
          setShowAnimation(true);

          setTimeout(() => {
            navigate('/student/dashboard/selection-survey');
          }, 6000);
        } else {
          setTimeout(poll, 10000);
        }
      }
    };

    poll();
  };

  useEffect(() => {
    if (isVerifying) {
      console.log('[Payment] ⚠️ Verificação já em andamento, ignorando chamada duplicada');
      return;
    }

    console.log('[Payment] 🔍 useEffect iniciado - user:', !!user, 'userProfile:', !!userProfile);

    // Aguardar usuário estar carregado
    if (!user) {
      console.log('[Payment] Aguardando autenticação do usuário...');
      return;
    }

    if (hasRunRef.current) {
      console.log('[Payment] Verificação já foi executada, ignorando chamada duplicada do React Strict Mode');
      return;
    }

    hasRunRef.current = true;

    // Detectar se é pagamento Parcelow ou Stripe
    // Se houver reference e NÃO houver session_id, é Parcelow
    // (A Parcelow trunca a URL, então não podemos depender do payment_method)
    if (reference && !sessionId) {
      console.log('[Parcelow] Pagamento Parcelow detectado (via reference), iniciando verificação...');
      verifyParcelowPayment();
      return;
    }

    // Fallback: se tiver payment_method=parcelow explicitamente
    if (paymentMethod === 'parcelow' && reference) {
      console.log('[Parcelow] Pagamento Parcelow detectado (via payment_method), iniciando verificação...');
      verifyParcelowPayment();
      return;
    }

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
        console.log('[PIX] 🚀 Resposta da verificação imediata:', data);
        if (data.error) console.error('[PIX] ❌ Erro na verificação imediata:', data.error);

        // Extrair informações do pagamento
        // Priorizar gross_amount_usd (valor bruto que o aluno realmente pagou), senão usar final_amount ou amount_paid
        if (data.gross_amount_usd !== null && data.gross_amount_usd !== undefined) {
          setPaidAmount(data.gross_amount_usd);
        } else if (data.final_amount) {
          setPaidAmount(data.final_amount);
        } else if (data.amount_paid) {
          setPaidAmount(data.amount_paid);
        }

        // Verificar se há erro de sessão não encontrada
        if (data.error && data.error.includes('Session not found')) {
          console.log('[PIX] ⚠️ Sessão não encontrada na verificação inicial - assumindo sucesso');
          setLoading(false);
          setAnimationSuccess(true);
          setShowAnimation(true);

          setTimeout(() => {
            localStorage.removeItem('last_payment_method');
            navigate('/student/dashboard/selection-survey');
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
            const redirectUrl = data.redirect_url || '/student/dashboard/selection-survey';
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
            navigate('/student/dashboard/selection-survey');
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
  }, [sessionId, isPixPayment, paymentMethod, reference, user]);

  // Debug: Log das mudanças de estado
  useEffect(() => {
    console.log('🔄 Estado mudou:', { loading, showAnimation, animationSuccess });
  }, [loading, showAnimation, animationSuccess]);

  // Determine current overlay status
  const getOverlayStatus = (): 'loading' | 'success' | 'error' => {
    if (error || (showAnimation && !animationSuccess)) return 'error';
    if (showAnimation && animationSuccess) return 'success';
    return 'loading';
  };

  return (
    <PaymentStatusOverlay
      status={getOverlayStatus()}
      title={
        getOverlayStatus() === 'loading' ? t('successPages.selectionProcessFee.verifying') :
        getOverlayStatus() === 'success' ? t('successPages.selectionProcessFee.title') :
        t('successPages.selectionProcessFee.errorTitle')
      }
      message={
        getOverlayStatus() === 'loading' ? t('successPages.selectionProcessFee.pleaseWait') :
        getOverlayStatus() === 'success' ? t('successPages.selectionProcessFee.description', { amount: paidAmount ? `$${paidAmount}` : '' }) :
        (error || t('successPages.common.paymentError'))
      }
      errorDetails={error}
      onRetry={() => navigate('/student/dashboard/selection-survey')}
      onHome={() => navigate('/student/dashboard')}
      showPremiumLoading={true}
    />
  );
};

export default SelectionProcessFeeSuccess;