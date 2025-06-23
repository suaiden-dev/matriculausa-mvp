import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ApplicationFeeSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session_id');

  return (
    <div className="max-w-lg mx-auto mt-20 bg-white rounded-2xl shadow-lg p-8 text-center">
      <h1 className="text-3xl font-bold text-green-700 mb-4">Application Fee payment successful!</h1>
      <p className="text-slate-700 mb-4">Your application has been processed and is under review. You will receive updates by email.</p>
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
        <div className="text-sm text-slate-600 mb-1">Session ID:</div>
        <div className="font-mono text-green-800 text-xs break-all">{sessionId}</div>
      </div>
      <button
        className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
        onClick={() => navigate('/student/dashboard/applications')}
      >
        Go to My Applications
      </button>
    </div>
  );
};

export default ApplicationFeeSuccess; 