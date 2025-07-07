import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import StudentDashboardLayout from './StudentDashboardLayout';
import { useAuth } from '../../hooks/useAuth';

const I20ControlFeeSuccess: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, userProfile, loading: authLoading } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    setSessionId(sessionId);
    console.log('[I20ControlFeeSuccess] sessionId from URL:', sessionId);
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
        const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/verify-stripe-session-i20-control-fee`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ sessionId })
        });
        const result = await response.json();
        console.log('[I20ControlFeeSuccess] Resposta do backend:', result);
        if (!response.ok) throw new Error(result?.error || 'Failed to verify payment.');
        if (result.status !== 'complete') {
          console.log('[I20ControlFeeSuccess] Pagamento não está completo:', result.status);
          navigate('/student/dashboard/i20-control-fee-error');
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
        console.log('[I20ControlFeeSuccess] applicationId definido:', appId);
        setApplicationId(appId);
        setLoading(false);
      } catch (err: any) {
        console.error('[I20ControlFeeSuccess] Erro:', err.message);
        setError(err.message);
        setLoading(false);
      }
    };
    verifySession();
  }, [navigate]);

  return (
    <StudentDashboardLayout user={user} profile={userProfile} loading={authLoading}>
      <div className={`min-h-[60vh] flex flex-col items-center justify-center ${error ? 'bg-red-50' : 'bg-green-50'} px-4`}>
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
          {error ? (
            <>
              <svg className="h-16 w-16 text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
              </svg>
              <h1 className="text-3xl font-bold text-red-700 mb-2">I-20 Control Fee Payment Error</h1>
              <p className="text-slate-700 mb-6 text-center">
                There was a problem processing your <span className="font-bold">$900</span> payment.<br/>
                Please try again. If the error persists, contact support.
              </p>
              <Link to="/student/dashboard/applications" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300">
                Back to My Applications
              </Link>
            </>
          ) : loading ? (
            <>
              <svg className="h-16 w-16 text-green-600 mb-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              </svg>
              <h1 className="text-3xl font-bold text-green-700 mb-2">Verifying Payment...</h1>
              <p className="text-slate-700 mb-6 text-center">Please wait while we confirm your payment.</p>
            </>
          ) : (
            <>
              <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
              <h1 className="text-3xl font-bold text-green-700 mb-2">I-20 Control Fee Payment Successful!</h1>
              <p className="text-slate-700 mb-6 text-center">
                Your payment of <span className="font-bold">$900</span> was processed successfully.<br/>
                Your application will now proceed to the next step.
              </p>
              <button
                className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-all duration-300"
                disabled={!applicationId}
                onClick={() => {
                  console.log('[I20ControlFeeSuccess] Botão clicado. applicationId:', applicationId);
                  if (applicationId) navigate(`/student/dashboard/application/${applicationId}/chat`);
                }}
              >
                Go to View Details
              </button>
            </>
          )}
        </div>
      </div>
    </StudentDashboardLayout>
  );
};

export default I20ControlFeeSuccess; 