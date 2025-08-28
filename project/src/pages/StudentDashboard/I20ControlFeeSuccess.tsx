import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const I20ControlFeeSuccess: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  console.log('🔍 [I20ControlFeeSuccess] Componente renderizado');

  useEffect(() => {
    // Simular verificação de pagamento
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
        {loading ? (
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
              Your payment of <span className="font-bold">$1,250</span> has been processed successfully.<br/>
              Your I-20 document will be processed and sent to you soon.
            </p>
            <Link to="/student/dashboard/applications" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300">
              Back to My Applications
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default I20ControlFeeSuccess; 