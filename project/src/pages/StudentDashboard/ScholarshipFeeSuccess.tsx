import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import CustomLoading from '../../components/CustomLoading';
import { CheckCircle } from 'lucide-react';
import { useDynamicFees } from '../../hooks/useDynamicFees';
import { useTranslation } from 'react-i18next';

const ScholarshipFeeSuccess: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { scholarshipFeeAmount } = useDynamicFees();
  const { t } = useTranslation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    console.log('[ScholarshipFeeSuccess] sessionId from URL:', sessionId);
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
        console.log('[ScholarshipFeeSuccess] Resposta do backend:', result);
        if (!response.ok) throw new Error(result?.error || 'Failed to verify payment.');
        if (result.status !== 'complete') {
          console.log('[ScholarshipFeeSuccess] Pagamento não está completo:', result.status);
          navigate('/student/dashboard/scholarship-fee-error');
          return;
        }
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
        console.log('[ScholarshipFeeSuccess] applicationId definido:', appId);
        setApplicationId(appId);
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

        // Log Stripe payment success
        try {
          // IP best-effort
          let clientIp: string | undefined = undefined;
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
              const j = await res.json();
              clientIp = j?.ip;
            }
          } catch (_) {}

          const { data: authUser } = await supabase.auth.getUser();
          const authUserId = authUser.user?.id;
          if (authUserId) {
            const { data: profile } = await supabase.from('user_profiles').select('id').eq('user_id', authUserId).single();
            if (profile?.id) {
              await supabase.rpc('log_student_action', {
                p_student_id: profile.id,
                p_action_type: 'fee_payment',
                p_action_description: 'Scholarship Fee paid via Stripe',
                p_performed_by: authUserId,
                p_performed_by_type: 'student',
                p_metadata: {
                  fee_type: 'scholarship',
                  payment_method: 'stripe',
                  amount: scholarshipFeeAmount || 0,
                  session_id: sessionId,
                  application_id: appId,
                  ip: clientIp
                }
              });
            }
          }
        } catch (logErr) {
          console.error('[ScholarshipFeeSuccess] Failed to log stripe payment:', logErr);
        }
      } catch (err: any) {
        console.error('[ScholarshipFeeSuccess] Erro:', err.message);
        setError(err.message);
        setLoading(false);
      }
    };
    verifySession();
  }, [navigate]);

  const handleGoToChat = () => {
    if (applicationId) {
      navigate(`/student/dashboard/application/${applicationId}/chat`);
    } else {
      navigate('/student/dashboard/applications');
    }
  };

  if (loading) {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center bg-white px-4">
          <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
            <CustomLoading 
              color="green" 
              title={t('successPages.scholarshipFee.verifying')} 
              message={t('successPages.scholarshipFee.pleaseWait')} 
            />
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center bg-red-50 px-4">
          <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
            <svg className="h-16 w-16 text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
            </svg>
            <h1 className="text-3xl font-bold text-red-700 mb-2">{t('successPages.scholarshipFee.errorTitle')}</h1>
            <p className="text-slate-700 mb-6 text-center">
              {t('successPages.scholarshipFee.errorMessage')}<br/>
              {t('successPages.scholarshipFee.errorRetry')}
            </p>
            <button 
              onClick={handleGoToChat} 
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300"
            >
              {t('successPages.scholarshipFee.button')}
            </button>
          </div>
        </div>
    );
  }

  return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-white px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
          <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
          <h1 className="text-3xl font-bold text-green-700 mb-2 text-center">{t('successPages.scholarshipFee.title')}</h1>
          <p className="text-slate-700 mb-6 text-center">
            {/* Seu pagamento de ${scholarshipFeeAmount?.toFixed(2) || '900.00'} foi processado com sucesso.<br/> */}
            {t('successPages.scholarshipFee.message')}
          </p>
          <button
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-all duration-300"
            disabled={!applicationId}
            onClick={() => {
              if (applicationId) navigate(`/student/dashboard/application/${applicationId}/chat`);
            }}
          >
            {t('successPages.scholarshipFee.button')}
          </button>
        </div>
      </div>
  );
};

export default ScholarshipFeeSuccess; 