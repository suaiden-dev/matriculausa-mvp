import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import PaymentStatusOverlay from '../../components/PaymentStatusOverlay';
import { dispatchCacheInvalidationEvent, CacheInvalidationEvent } from '../../utils/cacheInvalidation';
import { useTranslation } from 'react-i18next';

const ScholarshipFeeSuccess: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState<boolean>(false);
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const navigate = useNavigate();
  const { userProfile, user } = useAuth();
  const verificationRef = useRef<boolean>(false);
  const [searchParams] = useSearchParams();
  const { t } = useTranslation(['dashboard', 'common']);

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
        // Buscar o pagamento pelo reference (que pode estar truncado)
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

          setTimeout(() => {
            if (applicationId) navigate(`/student/dashboard/application/${applicationId}/chat`);
            else navigate('/student/dashboard/applications');
          }, 6000);
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
    // Aguardar usuário estar carregado
    if (!user) {
      return;
    }

    if (verificationRef.current) {
      return;
    }
    
    verificationRef.current = true;

    // Aceitar tanto parâmetros encurtados (ref, pm) quanto completos (reference, payment_method)
    const reference = searchParams.get('ref') || searchParams.get('reference');
    const paymentMethod = searchParams.get('pm') || searchParams.get('payment_method');
    const sessionId = searchParams.get('session_id');

    // Detectar se é pagamento Parcelow
    // Se houver reference e NÃO houver session_id, é Parcelow
    // pm=p significa payment_method=parcelow
    if (reference && !sessionId) {
      verifyParcelowPayment(reference);
      return;
    }
    
    // Fallback: se tiver payment_method=parcelow ou pm=p explicitamente
    if ((paymentMethod === 'parcelow' || paymentMethod === 'p') && reference) {
      verifyParcelowPayment(reference);
      return;
    }

    if (!sessionId) {
      setError('Session ID not found.');
      setLoading(false);
      return;
    }
    
    const verifySession = async () => {
      try {
        const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_URL;
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('Usuário não autenticado.');
        const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/verify-stripe-session-scholarship-fee`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ sessionId })
        });
        const result = await response.json();
        
        if (!response.ok) throw new Error(result?.error || 'Failed to verify payment.');
        if (result.status !== 'complete') {
          navigate('/student/dashboard/scholarship-fee-error');
          return;
        }
        
        // Extrair informações do pagamento
        // Priorizar gross_amount_usd (valor bruto que o aluno realmente pagou), senão usar final_amount ou amount_paid
        const gAmount = result.gross_amount_usd != null ? Number(result.gross_amount_usd) : 
                        result.final_amount != null ? Number(result.final_amount) : 
                        result.amount_paid != null ? Number(result.amount_paid) : null;
        
        if (gAmount) setPaidAmount(gAmount);
        
        let appId = null;
        if (Array.isArray(result.application_ids) && result.application_ids.length > 0) {
          appId = result.application_ids[result.application_ids.length - 1];
        } else if (result.application_id) {
          appId = result.application_id;
        } else {
          const lastAppId = localStorage.getItem('lastApplicationId');
          if (lastAppId) {
            appId = lastAppId;
          }
        }
        setApplicationId(appId);
        // Invalidar cache
        dispatchCacheInvalidationEvent(CacheInvalidationEvent.PAYMENT_COMPLETED);
        // Força refetch de applications para refletir is_scholarship_fee_paid e status atualizados
        try {
          if (userProfile?.id) {
            await supabase
              .from('scholarship_applications')
              .select('id')
              .eq('student_id', userProfile.id)
              .order('updated_at', { ascending: false });
          }
        } catch {}
        
        setLoading(false);
        setShowAnimation(true);
        
        // Aguardar animação e redirecionar
        setTimeout(() => {
          if (appId) {
            navigate(`/student/dashboard/application/${appId}/chat`);
          } else {
            navigate('/student/dashboard/applications');
          }
        }, 6000);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };
    verifySession();
  }, [navigate, searchParams, user, userProfile]);

  const getStatus = (): 'loading' | 'success' | 'error' => {
    if (error) return 'error';
    if (showAnimation && !loading) return 'success';
    return 'loading';
  };

  return (
    <PaymentStatusOverlay
      status={getStatus()}
      title={
        getStatus() === 'loading' ? t('successPages.scholarshipFee.verifying') :
        getStatus() === 'success' ? t('successPages.scholarshipFee.title') :
        t('successPages.scholarshipFee.errorTitle')
      }
      message={
        getStatus() === 'loading' ? t('successPages.scholarshipFee.pleaseWait') :
        getStatus() === 'success' ? `${t('successPages.common.paymentProcessedAmount')} $${paidAmount || ''} ${t('successPages.scholarshipFee.message')}` :
        (error || t('successPages.scholarshipFee.errorMessage'))
      }
      errorDetails={error}
      onRetry={() => {
        if (applicationId) navigate(`/student/dashboard/application/${applicationId}/chat`);
        else navigate('/student/dashboard/applications');
      }}
      onHome={() => navigate('/student/dashboard')}
      showPremiumLoading={true}
    />
  );
};

export default ScholarshipFeeSuccess;