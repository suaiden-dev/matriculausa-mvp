import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import PaymentSuccessOverlay from '../../components/PaymentSuccessOverlay';


const I20ControlFeeSuccess: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const { user } = useAuth();
  const { getFeeAmount } = useFeeConfig(user?.id);
  const sessionId = params.get('session_id');
  const { t } = useTranslation();

  console.log('🔍 [I20ControlFeeSuccess] Componente renderizado com sessionId:', sessionId);

  useEffect(() => {
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

        console.log('✅ [I20ControlFeeSuccess] Sessão verificada com sucesso:', data);
        setLoading(false);
        setShowAnimation(true);
        
        // Aguardar animação e redirecionar
        setTimeout(() => {
          navigate('/student/dashboard/applications');
        }, 6000);

        // Log Stripe payment success
        // try {
        //   // IP best-effort
        //   let clientIp: string | undefined = undefined;
        //   try {
        //     const controller = new AbortController();
        //     const timeout = setTimeout(() => controller.abort(), 2000);
        //     const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
        //     clearTimeout(timeout);
        //     if (res.ok) {
        //       const j = await res.json();
        //       clientIp = j?.ip;
        //     }
        //   } catch (_) {}

        //   const { data: authUser } = await supabase.auth.getUser();
        //   const authUserId = authUser.user?.id;
        //   if (authUserId) {
        //     const { data: profile } = await supabase.from('user_profiles').select('id').eq('user_id', authUserId).single();
        //     if (profile?.id) {
        //       await supabase.rpc('log_student_action', {
        //         p_student_id: profile.id,
        //         p_action_type: 'fee_payment',
        //         p_action_description: 'I-20 Control Fee paid via Stripe',
        //         p_performed_by: authUserId,
        //         p_performed_by_type: 'student',
        //         p_metadata: {
        //           fee_type: 'i20_control',
        //           payment_method: 'stripe',
        //           amount: getFeeAmount('i20_control_fee') || 0,
        //           session_id: sessionId,
        //           ip: clientIp
        //         }
        //       });
        //     }
        //   }
        // } catch (logErr) {
        //   console.error('[I20ControlFeeSuccess] Failed to log stripe payment:', logErr);
        // }
      } catch (err: any) {
        console.error('❌ [I20ControlFeeSuccess] Erro ao verificar sessão:', err);
        setError(err.message || 'Error verifying payment.');
        setLoading(false);
      }
    };

    verifySession();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
          <svg className="h-16 w-16 text-green-600 mb-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          </svg>
            <h1 className="text-3xl font-bold text-green-700 mb-2">{t('successPages.i20ControlFee.verifying')}</h1>
            <p className="text-slate-700 mb-6 text-center">{t('successPages.i20ControlFee.pleaseWait')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
          <svg className="h-16 w-16 text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
          </svg>
          <h1 className="text-3xl font-bold text-red-700 mb-2">I-20 Control Fee Payment Error</h1>
          <p className="text-slate-700 mb-6 text-center">There was a problem processing your payment.<br/>Please try again. If the error persists, contact support.</p>
          <button 
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300"
            onClick={() => navigate('/student/dashboard/applications')}
          >
            Back to My Applications
          </button>
        </div>
      </div>
    );
  }

  // Se deve mostrar animação, usar o overlay
  if (showAnimation && !loading && !error) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-4 relative">
        <PaymentSuccessOverlay
          isSuccess={true}
          title={t('successPages.i20ControlFee.title')}
          message={`${t('successPages.common.paymentProcessedAmount', { amount: '900.00' })} ${t('successPages.i20ControlFee.message')}`}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
        {loading ? (
          <>
            <svg className="h-16 w-16 text-green-600 mb-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            </svg>
            <h1 className="text-3xl text-center font-bold text-green-700 mb-2">{t('successPages.i20ControlFee.verifying')}</h1>
            <p className="text-slate-700 mb-6 text-center">{t('successPages.i20ControlFee.pleaseWait')}</p>
          </>
        ) : error ? (
          <>
            <svg className="h-16 w-16 text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
            </svg>
            <h1 className="text-3xl font-bold text-red-700 mb-2">{t('successPages.i20ControlFee.errorTitle')}</h1>
            <p className="text-slate-700 mb-6 text-center">{t('successPages.i20ControlFee.errorMessage')}<br/>{t('successPages.i20ControlFee.errorRetry')}</p>
            <button 
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300"
              onClick={() => navigate('/student/dashboard/applications')}
            >
              {t('successPages.i20ControlFee.button')}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default I20ControlFeeSuccess; 