import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const SelectionProcessFeeError: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const error = params.get('error') || 'An error occurred while processing the selection process fee payment.';

  return (
    <div className="max-w-lg mx-auto mt-20 bg-white rounded-2xl shadow-lg p-8 text-center">
      <h1 className="text-3xl font-bold text-red-700 mb-4">Selection Process Fee Payment Error</h1>
      <p className="text-slate-700 mb-4">{error}</p>
      <button
        className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
        onClick={() => navigate('/student/dashboard/scholarships')}
      >
        Back to Scholarships
      </button>
    </div>
  );
};

export default SelectionProcessFeeError; 