import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const CheckoutSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        // Here you would typically verify the payment with your backend
        // For now, we'll just simulate a successful verification
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // In a real implementation, you would update the user's status in your database
        setLoading(false);
      } catch (err: any) {
        console.error('Error verifying payment:', err);
        setError(err.message || 'An error occurred while verifying your payment');
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E]"></div>
          <p className="text-slate-600 font-medium">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Payment Verification Failed</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link
            to="/"
            className="bg-[#05294E] text-white px-6 py-3 rounded-xl hover:bg-[#05294E]/90 transition-colors font-bold inline-flex items-center"
          >
            Return Home
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Payment Successful!</h2>
        <p className="text-slate-600 mb-6">
          Thank you for your purchase, {user?.name || 'valued customer'}! Your payment has been processed successfully.
        </p>
        <div className="bg-slate-50 rounded-xl p-6 mb-6 text-left">
          <h3 className="font-bold text-slate-900 mb-2">What's Next?</h3>
          <ul className="space-y-2 text-slate-600">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Your Selection Process has been activated
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              You can now access all features of the application process
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Our team will contact you shortly with next steps
            </li>
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/student/dashboard"
            className="bg-[#05294E] text-white px-6 py-3 rounded-xl hover:bg-[#05294E]/90 transition-colors font-bold flex items-center justify-center"
          >
            Go to Dashboard
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <Link
            to="/"
            className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors font-medium"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;