import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ApplicationFeeError: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const error = params.get('error') || 'An error occurred while processing the application fee payment.';

  return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-red-700 mb-4">Application Fee Payment Error</h1>
          <p className="text-slate-700 mb-4">{error}</p>
          <button
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
            onClick={() => navigate('/student/dashboard/applications')}
          >
            Back to My Applications
          </button>
        </div>
      </div>
  );
};

export default ApplicationFeeError; 