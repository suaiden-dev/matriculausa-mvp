import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const I20ControlFeeSuccess: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session_id');

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
          <h1 className="text-3xl font-bold text-green-700 mb-2">Verifying Payment...</h1>
          <p className="text-slate-700 mb-6 text-center">Please wait while we confirm your payment.</p>
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

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
        <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
        <h1 className="text-3xl font-bold text-green-700 mb-2">I-20 Control Fee Payment Successful!</h1>
        <p className="text-slate-700 mb-6 text-center">
          Your payment of <span className="font-bold">$1,250</span> has been processed successfully.<br/>
          Your I-20 document will be processed and sent to you soon.
        </p>
        <Link to="/student/dashboard/applications" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300">
          Back to My Applications
        </Link>
      </div>
    </div>
  );
};

export default I20ControlFeeSuccess; 