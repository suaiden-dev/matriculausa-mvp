import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import StudentDashboardLayout from './StudentDashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import CustomLoading from '../../components/CustomLoading';

type VerificationStatus = 'loading' | 'success' | 'error';

const ApplicationFeeSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const { user, userProfile, loading } = useAuth();

  useEffect(() => {
    const verifySession = async () => {
      const sessionId = searchParams.get('session_id');
      if (!sessionId) {
        setError('No session ID found in URL.');
        setStatus('error');
        return;
      }

      try {
        const { error: functionError } = await supabase.functions.invoke('verify-stripe-session', {
          body: { sessionId },
        });

        if (functionError) {
          throw new Error(`Verification failed: ${functionError.message}`);
        }
        
        // Marcar pagamento (application fee) sem alterar o status da aplicação (mantém 'approved')
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('user_id', user?.id || '')
            .single();
          if (profile?.id) {
            // Atualiza a aplicação mais recente do aluno
            const { data: app } = await supabase
              .from('scholarship_applications')
              .select('id, status')
              .eq('student_id', profile.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (app?.id) {
              await supabase
                .from('scholarship_applications')
                .update({ is_application_fee_paid: true, status: 'approved' })
                .eq('id', app.id);
            }
          }
          // Opcional: refletir no perfil
          if (user?.id) {
            await supabase
              .from('user_profiles')
              .update({ is_application_fee_paid: true })
              .eq('user_id', user.id);
          }
        } catch {}

        setStatus('success');

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
          <CustomLoading color="green" title="Verifying Payment..." message="Please wait while we confirm your transaction. This may take a moment." />
        );
      case 'success':
        return (
          <>
            <CheckCircle className="h-16 w-16 text-green-600 mb-4 mx-auto" />
            <h1 className="text-3xl font-bold text-green-700 mb-2">Application Fee Payment Successful!</h1>
            <p className="text-slate-700 mb-6 text-center">
              Your payment of <span className="font-bold">$350</span> was processed successfully.<br/>
              Your application will now proceed to the next step.
            </p>
            <button
              onClick={() => navigate('/student/dashboard/applications')}
              className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-all duration-300"
            >
              Go to My Applications
            </button>
          </>
        );
      case 'error':
        return (
           <>
            <XCircle className="text-red-500 h-16 w-16 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Verification Failed</h1>
            <p className="text-slate-600 mb-6">
              There was a problem verifying your payment. Please contact support.
            </p>
            <p className="text-sm text-red-700 bg-red-100 p-3 rounded-lg">{error}</p>
          </>
        );
    }
  };

  return (
    <StudentDashboardLayout user={user} profile={userProfile} loading={loading}>
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-green-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
          {renderContent()}
        </div>
      </div>
    </StudentDashboardLayout>
  );
};

export default ApplicationFeeSuccess; 