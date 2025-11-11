import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CustomLoading from '../../components/CustomLoading';
import PaymentSuccessOverlay from '../../components/PaymentSuccessOverlay';
import { useTranslation } from 'react-i18next';

type VerificationStatus = 'loading' | 'success' | 'error';

const ApplicationFeeSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const [showAnimation, setShowAnimation] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const verifySession = async () => {
      const sessionId = searchParams.get('session_id');
      if (!sessionId) {
        setError('No session ID found in URL.');
        setStatus('error');
        return;
      }

      try {
        // Chamar a Edge Function para verificar o pagamento e enviar notificação
        const { error: sessionError } = await supabase.functions.invoke('verify-stripe-session-application-fee', {
          body: { sessionId },
        });

        if (sessionError) {
          throw new Error(`Verification failed: ${sessionError.message}`);
        }


        
        setStatus('success');
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

        //   // Resolve student profile
        //   const { data: authUser } = await supabase.auth.getUser();
        //   const authUserId = authUser.user?.id;
        //   if (authUserId) {
        //     const { data: profile } = await supabase.from('user_profiles').select('id').eq('user_id', authUserId).single();
        //     const amount = (() => {
        //       try {
        //         if (application && Array.isArray(application.scholarships) && application.scholarships[0]?.application_fee_amount) {
        //           return Number(application.scholarships[0].application_fee_amount) || 0;
        //         }
        //       } catch {}
        //       return 0;
        //     })();
        //     if (profile?.id) {
        //       await supabase.rpc('log_student_action', {
        //         p_student_id: profile.id,
        //         p_action_type: 'fee_payment',
        //         p_action_description: 'Application Fee paid via Stripe',
        //         p_performed_by: authUserId,
        //         p_performed_by_type: 'student',
        //         p_metadata: {
        //           fee_type: 'application',
        //           payment_method: 'stripe',
        //           amount,
        //           session_id: sessionId,
        //           application_id: sessionData?.applicationId || null,
        //           ip: clientIp
        //         }
        //       });
        //     }
        //   }
        // } catch (logErr) {
        //   console.error('[ApplicationFeeSuccess] Failed to log stripe payment:', logErr);
        // }

      } catch (e: any) {
        setError(e.message || 'An unknown error occurred during verification.');
        setStatus('error');
      }
    };

    verifySession();
  }, [searchParams]);


  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <CustomLoading 
            color="green" 
            title={t('successPages.applicationFee.verifying')} 
            message={t('successPages.applicationFee.pleaseWait')} 
          />
        );
      case 'success':
        return null; // Sucesso será tratado pelo overlay
      case 'error':
        return (
           <>
            <XCircle className="text-red-500 h-16 w-16 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-slate-800 mb-4">{t('successPages.applicationFee.errorTitle')}</h1>
            <p className="text-slate-600 mb-6">
              {t('successPages.applicationFee.errorMessage')}
            </p>
            <p className="text-sm text-red-700 bg-red-100 p-3 rounded-lg">
              {t('successPages.applicationFee.errorDetails')} {error}
            </p>
          </>
        );
    }
  };

  // Se deve mostrar animação, usar o overlay
  if (showAnimation && status === 'success') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-white px-4 relative">
        <PaymentSuccessOverlay
          isSuccess={true}
          title={t('successPages.applicationFee.title')}
          message={t('successPages.applicationFee.message')}
        />
      </div>
    );
  }

  return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-white px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
          {renderContent()}
        </div>
      </div>
  );
};

export default ApplicationFeeSuccess; 