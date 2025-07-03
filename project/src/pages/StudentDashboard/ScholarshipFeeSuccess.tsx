import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ScholarshipFeeSuccess: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applicationIds, setApplicationIds] = useState<string[]>([]);
  const navigate = useNavigate();
  const { updateUserProfile } = useAuth();

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
        const result = await response.json();
        setApplicationIds(result.application_ids || []);
        await updateUserProfile({});
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };
    verifySession();
  }, [updateUserProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 px-4">
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
          <svg className="h-16 w-16 text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
          </svg>
          <h1 className="text-3xl font-bold text-red-700 mb-2">Scholarship Fee Payment Error</h1>
          <p className="text-slate-700 mb-6 text-center">{error}</p>
          <a href="/student/dashboard/applications" className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-all duration-300">
            Back to My Applications
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
        <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
        <h1 className="text-3xl font-bold text-green-700 mb-2">Scholarship Fee payment successful!</h1>
        <p className="text-slate-700 mb-6 text-center">
          Your payment of <span className="font-bold">$550</span> was processed successfully.<br/>
          Now your application will be reviewed and you will receive a notification when it is approved.
        </p>
        {applicationIds.length === 1 && (
          <Link to={`/student/dashboard/application/${applicationIds[0]}/chat`} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-all duration-300">
            Go to View Details
          </Link>
        )}
        {applicationIds.length > 1 && (
          <div className="flex flex-col gap-2 w-full">
            {applicationIds.map(id => (
              <Link key={id} to={`/student/dashboard/application/${id}/chat`} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-all duration-300 text-center">
                Go to View Details (Application {id.slice(0, 8)})
              </Link>
            ))}
          </div>
        )}
        {applicationIds.length === 0 && !loading && !error && (
          <Link to="/student/dashboard/applications" className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-all duration-300">
            Go to My Applications
          </Link>
        )}
      </div>
    </div>
  );
};

export default ScholarshipFeeSuccess; 