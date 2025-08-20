import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useUniversity } from '../../context/UniversityContext';
import { supabase } from '../../lib/supabase';
import { 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  ExternalLink,
  CreditCard,
  Loader
} from 'lucide-react';

const StripeConnectCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { university } = useUniversity();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!university) return;

    const processCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage('Error during Stripe authorization');
          setError(error);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('Authorization code not received');
          return;
        }

        const { data, error: processError } = await supabase.functions.invoke('process-stripe-connect-callback', {
          body: {
            university_id: university.id,
            code,
            state
          }
        });

        if (processError) {
          throw new Error(processError.message);
        }

        if (data?.success) {
          setStatus('success');
          setMessage('Stripe account connected successfully!');
          
          setTimeout(() => {
            navigate('/school/dashboard/stripe-connect');
          }, 3000);
        } else {
          throw new Error(data?.message || 'Error processing connection');
        }

      } catch (error: any) {
        console.error('Error processing callback:', error);
        setStatus('error');
        setMessage('Error processing Stripe connection');
        setError(error.message);
      }
    };

    processCallback();
  }, [university, searchParams, navigate]);

  const handleRetry = () => {
    navigate('/school/dashboard/stripe-connect');
  };

  const handleDashboard = () => {
    navigate('/school/dashboard');
  };

  if (!university) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        {status === 'loading' && (
          <>
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader className="h-10 w-10 text-slate-600 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              Processing Connection
            </h2>
            <p className="text-slate-600 text-sm">
              Please wait while we securely process your Stripe connection
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              Connection Successful
            </h2>
            <p className="text-slate-600 mb-6 text-sm">
              {message}
            </p>
            <div className="space-y-3">
              <button
                onClick={handleDashboard}
                className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
              <a
                href="https://dashboard.stripe.com/connect/accounts"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full px-4 py-3 text-blue-600 font-medium border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Stripe Dashboard
              </a>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              Connection Error
            </h2>
            <p className="text-slate-600 mb-4 text-sm">
              {message}
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-red-600 font-mono">
                  {error}
                </p>
              </div>
            )}
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleDashboard}
                className="w-full px-4 py-3 text-slate-600 font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StripeConnectCallback;
