import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import CustomLoading from '../../components/CustomLoading';
import { CheckCircle } from 'lucide-react';

const messages = {
  title: 'Scholarship Fee Payment Successful!',
  processed: 'We have received your Scholarship Fee payment. We will contact you soon with the next steps for your scholarship process.',
  sessionId: 'Session ID:',
  confirmation: 'You will receive a confirmation email shortly.',
  goHome: 'Return Home',
  verifying: 'Verifying your payment...',
  pleaseWait: 'Please wait.',
  errorTitle: 'Payment Processing Error',
  errorTryAgain: 'Please try again or contact support.'
};

const ScholarshipFeeSuccess: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, userProfile, loading: authLoading } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    setSessionId(sessionId);
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
            <CustomLoading color="green" title="Verifying Payment..." message="Please wait while we confirm your payment." />
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
            <h1 className="text-3xl font-bold text-red-700 mb-2">Scholarship Fee Payment Error</h1>
            <p className="text-slate-700 mb-6 text-center">There was a problem processing your payment.<br/>Please try again. If the error persists, contact support.</p>
            <button onClick={handleGoToChat} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300">Go to View Details</button>
          </div>
        </div>
    );
  }

  return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-white px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
          <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
          <h1 className="text-3xl font-bold text-green-700 mb-2">Scholarship Fee Payment Successful!</h1>
          <p className="text-slate-700 mb-6 text-center">
            Your payment of <span className="font-bold">$400</span> was processed successfully.<br/>
            Your application will now proceed to the next step.
          </p>
          <button
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-all duration-300"
            disabled={!applicationId}
            onClick={() => {
              if (applicationId) navigate(`/student/dashboard/application/${applicationId}/chat`);
            }}
          >
            Go to View Details
          </button>
        </div>
      </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
    padding: '40px',
    maxWidth: '600px',
    margin: '50px auto',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#333',
  },
  heading: {
    color: '#28a745',
    fontSize: '2em',
    marginBottom: '20px',
  },
  text: {
    fontSize: '1.1em',
    lineHeight: '1.6',
    marginBottom: '15px',
  },
  errorText: {
    color: '#dc3545',
    fontSize: '1.1em',
    lineHeight: '1.6',
    marginBottom: '15px',
  },
  sessionId: {
    backgroundColor: '#f0f0f0',
    padding: '10px',
    borderRadius: '4px',
    display: 'inline-block',
    margin: '10px 0',
    fontSize: '0.9em',
    color: '#555',
  },
  button: {
    display: 'inline-block',
    marginTop: '20px',
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    textDecoration: 'none',
    border: 'none',
    borderRadius: '5px',
    fontSize: '1em',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
};

export default ScholarshipFeeSuccess; 