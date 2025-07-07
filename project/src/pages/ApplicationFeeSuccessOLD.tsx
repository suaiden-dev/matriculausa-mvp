import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type VerificationStatus = 'loading' | 'success' | 'error';

const ApplicationFeeSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [error, setError] = useState<string | null>(null);

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
          <>
            <Loader2 className="text-blue-500 h-16 w-16 mx-auto mb-6 animate-spin" />
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Verifying Payment...</h1>
            <p className="text-slate-600">Please wait while we confirm your transaction. This may take a moment.</p>
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="text-green-500 h-16 w-16 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Payment Successful!</h1>
            <p className="text-slate-600 mb-6">
              Thank you! Your application has been submitted and will now appear under "My Applications".
            </p>
            <button
              onClick={() => navigate('/student/dashboard/applications')}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>Go to My Applications</span>
              <ArrowRight className="h-5 w-5" />
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-slate-200">
        {renderContent()}
      </div>
    </div>
  );
};

export default ApplicationFeeSuccess; 