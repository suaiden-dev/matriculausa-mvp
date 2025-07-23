import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing connection...');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Verificar parâmetros da URL
        const statusParam = searchParams.get('status');
        const errorParam = searchParams.get('error');
        const emailParam = searchParams.get('email');
        const messageParam = searchParams.get('message');

        console.log('🔍 Auth callback params:', { statusParam, errorParam, emailParam, messageParam });

        if (errorParam) {
          setStatus('error');
          setMessage(messageParam || `Connection error: ${errorParam}`);
          return;
        }

        if (statusParam === 'success') {
          setStatus('success');
          setMessage(`Gmail connected successfully!${emailParam ? ` (${emailParam})` : ''}`);
          
          // Iniciar countdown para redirecionamento
          const timer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer);
                navigate('/school/dashboard/inbox');
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          return () => clearInterval(timer);
        }

        // Se não há parâmetros claros, assumir erro
        setStatus('error');
        setMessage('Invalid callback parameters');

      } catch (error) {
        console.error('Callback error:', error);
        setStatus('error');
        setMessage('Unexpected processing error');
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  const handleManualRedirect = () => {
    navigate('/school/dashboard/inbox');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          {/* Loading State */}
          {status === 'processing' && (
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#05294E] mx-auto mb-6"></div>
          )}
          
          {/* Success State */}
          {status === 'success' && (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          )}
          
          {/* Error State */}
          {status === 'error' && (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          )}

          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            {status === 'processing' && 'Connecting Gmail...'}
            {status === 'success' && 'Connection Successful!'}
            {status === 'error' && 'Connection Error'}
          </h2>
          
          <p className="text-slate-600 mb-6">{message}</p>
          
          {status === 'success' && countdown > 0 && (
            <p className="text-sm text-slate-500 mb-4">
              Redirecting to Inbox in {countdown} second{countdown !== 1 ? 's' : ''}...
            </p>
          )}
          
          <div className="space-y-3">
            {status === 'success' && (
              <button
                onClick={handleManualRedirect}
                className="w-full bg-[#05294E] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#041f3f] transition-colors flex items-center justify-center space-x-2"
              >
                <Mail className="w-5 h-5" />
                <span>Go to Inbox</span>
              </button>
            )}
            
            {status === 'error' && (
              <button
                onClick={handleManualRedirect}
                className="w-full bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
              >
                Back to Dashboard
              </button>
            )}
          </div>
          
          {status === 'error' && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">
                If the problem persists, try:
              </p>
              <ul className="text-sm text-red-600 mt-2 space-y-1">
                <li>• Check your internet connection</li>
                <li>• Try connecting again</li>
                <li>• Clear browser cache</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback; 