import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import PaymentStatusOverlay from '../../components/PaymentStatusOverlay';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { dispatchCacheInvalidationEvent, CacheInvalidationEvent } from '../../utils/cacheInvalidation';

type VerificationStatus = 'loading' | 'success' | 'error';

const ApplicationFeeSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [applicationFeeAmount, setApplicationFeeAmount] = useState<number>(0);
  const { t } = useTranslation(['dashboard', 'payment', 'common']);
  const { userProfile, user } = useAuth();
  const hasRunRef = useRef(false);

  // Helper: calcular Application Fee exibida considerando dependentes (legacy) - mesma lógica do MyApplications
  const getApplicationFeeWithDependents = (base: number): number => {
    const deps = Number(userProfile?.dependents) || 0;
    return deps > 0 ? base + deps * 100 : base;
  };

  // Função para verificar pagamento Parcelow
  const verifyParcelowPayment = async (reference: string) => {
    if (!user?.id) {
      setError('User not authenticated.');
      setStatus('error');
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
          setApplicationFeeAmount(payment.amount);
          dispatchCacheInvalidationEvent(CacheInvalidationEvent.PAYMENT_COMPLETED);
          setStatus('success');
          setTimeout(() => navigate('/student/dashboard/applications'), 6000);
          return;
        }

        if (attempts >= maxAttempts) {
          setError('Payment verification timeout');
          setStatus('error');
          return;
        }
        setTimeout(poll, 10000);
      } catch (err) {
        if (attempts >= maxAttempts) {
          setError('Payment verification failed');
          setStatus('error');
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

    const reference = searchParams.get('ref') || searchParams.get('reference');
    const paymentMethod = searchParams.get('pm') || searchParams.get('payment_method');
    const sessionId = searchParams.get('session_id');

    if (reference && !sessionId) {
      verifyParcelowPayment(reference);
      return;
    }
    
    if ((paymentMethod === 'parcelow' || paymentMethod === 'p') && reference) {
      verifyParcelowPayment(reference);
      return;
    }

    const verifySession = async () => {
      if (!sessionId) {
        setError('No session ID found in URL.');
        setStatus('error');
        return;
      }

      try {
        const { data: sessionData, error: sessionError } = await supabase.functions.invoke('verify-stripe-session-application-fee', {
          body: { sessionId },
        });

        if (sessionError) throw new Error(`Verification failed: ${sessionError.message}`);

        if (sessionData?.gross_amount_usd !== null && sessionData?.gross_amount_usd !== undefined) {
          setApplicationFeeAmount(sessionData.gross_amount_usd);
        } else if (sessionData?.applicationId) {
          try {
            const { data: application } = await supabase
              .from('scholarship_applications')
              .select('scholarships ( application_fee_amount )')
              .eq('id', sessionData.applicationId)
              .single();

            if (application?.scholarships) {
              const scholarship: any = Array.isArray(application.scholarships) ? application.scholarships[0] : application.scholarships;
              const feeAmount = Number(scholarship?.application_fee_amount) || 0;
              setApplicationFeeAmount(getApplicationFeeWithDependents(feeAmount));
            } else {
              setApplicationFeeAmount(350);
            }
          } catch {
            setApplicationFeeAmount(350);
          }
        } else {
          setApplicationFeeAmount(350);
        }
        
        dispatchCacheInvalidationEvent(CacheInvalidationEvent.PAYMENT_COMPLETED);
        setStatus('success');
        setTimeout(() => navigate('/student/dashboard/applications'), 6000);
      } catch (e: any) {
        setError(e.message || 'An unknown error occurred during verification.');
        setStatus('error');
      }
    };

    verifySession();
  }, [searchParams, user]);

  return (
    <PaymentStatusOverlay
      status={status}
      title={
        status === 'loading' ? t('successPages.applicationFee.verifying') :
        status === 'success' ? t('successPages.applicationFee.title') :
        t('successPages.applicationFee.errorTitle')
      }
      message={
        status === 'loading' ? t('successPages.applicationFee.pleaseWait') :
        status === 'success' ? `${t('successPages.common.paymentProcessedAmount')} $${applicationFeeAmount || 350}` :
        (error || t('successPages.applicationFee.errorMessage'))
      }
      errorDetails={error}
      onRetry={() => navigate('/student/dashboard/applications')}
      onHome={() => navigate('/student/dashboard')}
      showPremiumLoading={true}
    />
  );
};

export default ApplicationFeeSuccess;