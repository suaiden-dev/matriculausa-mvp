import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import PaymentStatusOverlay from '../../components/PaymentStatusOverlay';
import { dispatchCacheInvalidationEvent, CacheInvalidationEvent } from '../../utils/cacheInvalidation';
import { supabase } from '../../lib/supabase';

const I20ControlFeeSuccess: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session_id');
  const reference = searchParams.get('ref') || searchParams.get('reference');
  const paymentMethod = searchParams.get('pm') || searchParams.get('payment_method');
  const { t } = useTranslation(['dashboard', 'payment', 'common']);
  const hasRunRef = useRef(false);

  // Função para verificar pagamento Parcelow
  const verifyParcelowPayment = async (reference: string) => {
    if (!user?.id) {
      setError('User not authenticated.');
      setLoading(false);
      return;
    }

    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      attempts++;
      try {
        const { data: payment } = await supabase
          .from('individual_fee_payments')
          .select('*')
          .eq('user_id', user.id)
          .ilike('parcelow_reference', `${reference}%`)
          .eq('payment_method', 'parcelow')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (payment && payment.parcelow_status === 'paid') {
          setPaidAmount(payment.amount);
          dispatchCacheInvalidationEvent(CacheInvalidationEvent.PAYMENT_COMPLETED);
          setLoading(false);
          setShowAnimation(true);
          setTimeout(() => navigate('/student/dashboard/applications'), 6000);
          return;
        }

        if (attempts >= maxAttempts) {
          setError('Payment verification timeout');
          setLoading(false);
          return;
        }
        setTimeout(poll, 10000);
      } catch (err) {
        if (attempts >= maxAttempts) {
          setError('Payment verification failed');
          setLoading(false);
        } else {
          setTimeout(poll, 10000);
        }
      }
    };
    poll();
  };

  useEffect(() => {
    if (!user || hasRunRef.current) return;
    hasRunRef.current = true;

    if (reference && !sessionId) {
      verifyParcelowPayment(reference);
      return;
    }
    
    if (paymentMethod === 'parcelow' && reference) {
      verifyParcelowPayment(reference);
      return;
    }

    const verifySession = async () => {
      if (!sessionId) {
        setError('Session ID not found in URL.');
        setLoading(false);
        return;
      }

      try {
        const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_URL;
        const EDGE_FUNCTION_ENDPOINT = `${SUPABASE_PROJECT_URL}/functions/v1/verify-stripe-session-i20-control-fee`;
        
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
        
        if (!response.ok || data.status !== 'complete') {
          throw new Error(data.error || data.message || 'Failed to verify session.');
        }

        const gAmount = data.gross_amount_usd != null ? Number(data.gross_amount_usd) : 
                        data.final_amount != null ? Number(data.final_amount) : 
                        data.amount_paid != null ? Number(data.amount_paid) : null;
        
        if (gAmount) setPaidAmount(gAmount);
        
        dispatchCacheInvalidationEvent(CacheInvalidationEvent.PAYMENT_COMPLETED);
        setLoading(false);
        setShowAnimation(true);
        setTimeout(() => navigate('/student/dashboard/applications'), 6000);
      } catch (err: any) {
        setError(err.message || 'Error verifying payment.');
        setLoading(false);
      }
    };

    verifySession();
  }, [sessionId, reference, paymentMethod, user, navigate]);

  const getStatus = (): 'loading' | 'success' | 'error' => {
    if (error) return 'error';
    if (showAnimation && !loading) return 'success';
    return 'loading';
  };

  return (
    <PaymentStatusOverlay
      status={getStatus()}
      title={
        getStatus() === 'loading' ? t('successPages.i20ControlFee.verifying') :
        getStatus() === 'success' ? t('successPages.i20ControlFee.title') :
        t('successPages.i20ControlFee.errorTitle')
      }
      message={
        getStatus() === 'loading' ? t('successPages.i20ControlFee.pleaseWait') :
        getStatus() === 'success' ? `${t('successPages.common.paymentProcessedAmount')} $${paidAmount || ''} ${t('successPages.i20ControlFee.message')}` :
        (error || t('successPages.i20ControlFee.errorMessage'))
      }
      errorDetails={error}
      onRetry={() => navigate('/student/dashboard/applications')}
      onHome={() => navigate('/student/dashboard')}
      showPremiumLoading={true}
    />
  );
};

export default I20ControlFeeSuccess;