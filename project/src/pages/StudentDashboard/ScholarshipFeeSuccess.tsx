import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const ScholarshipFeeSuccess: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    setSessionId(sessionId);
    if (!sessionId) {
      setError('Session ID not found.');
      setLoading(false);
      return;
    }
    const verifySession = async () => {
      try {
        const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/verify-stripe-session-scholarship-fee`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        if (!response.ok) throw new Error('Failed to verify payment.');
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };
    verifySession();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
        <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
        <h1 className="text-3xl font-bold text-green-700 mb-2">Scholarship Fee payment successful!</h1>
        <p className="text-slate-700 mb-6 text-center">
          Your payment of <span className="font-bold">$550</span> was processed successfully.<br/>
          Now your application will be reviewed and you will receive a notification when it is approved.
        </p>
        <Link to="/student/dashboard/applications" className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-all duration-300">
          Go to My Applications
        </Link>
      </div>
    </div>
  );
};

export default ScholarshipFeeSuccess; 