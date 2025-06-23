import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft } from 'lucide-react';

const ApplicationFeeCancel: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-slate-200">
        <XCircle className="text-red-500 h-16 w-16 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Payment Canceled</h1>
        <p className="text-slate-600 mb-8">
          Your payment was not completed. You can go back to the cart and try again. If you continue to have issues, please contact our support.
        </p>
        <button
          onClick={() => navigate('/student/dashboard/cart')}
          className="w-full bg-gray-600 text-white py-3 rounded-xl font-bold hover:bg-gray-700 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Cart</span>
        </button>
      </div>
    </div>
  );
};

export default ApplicationFeeCancel; 