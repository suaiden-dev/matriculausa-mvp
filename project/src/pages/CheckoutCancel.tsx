import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle, ArrowLeft, HelpCircle } from 'lucide-react';

const CheckoutCancel: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="h-10 w-10 text-slate-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Payment Cancelled</h2>
        <p className="text-slate-600 mb-6">
          Your payment process was cancelled. No charges have been made to your account.
        </p>
        <div className="bg-slate-50 rounded-xl p-6 mb-6 text-left">
          <h3 className="font-bold text-slate-900 mb-2 flex items-center">
            <HelpCircle className="h-5 w-5 mr-2 text-[#05294E]" />
            Need Help?
          </h3>
          <p className="text-slate-600 mb-4">
            If you encountered any issues during the checkout process or have questions about our services, please don't hesitate to contact our support team.
          </p>
          <p className="text-slate-600">
            <strong>Email:</strong> support@matriculausa.com
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/scholarships"
            className="bg-[#05294E] text-white px-6 py-3 rounded-xl hover:bg-[#05294E]/90 transition-colors font-bold flex items-center justify-center"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Try Again
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

export default CheckoutCancel;