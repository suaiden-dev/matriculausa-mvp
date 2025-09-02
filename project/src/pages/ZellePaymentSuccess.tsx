import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, CreditCard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const ZellePaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const method = searchParams.get('method');
  const status = searchParams.get('status');
  const feeType = searchParams.get('fee_type');
  const amount = searchParams.get('amount');
  const { user } = useAuth();

  // Se não for um pagamento Zelle aprovado, redireciona
  if (method !== 'zelle' || status !== 'approved') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Invalid Payment Status</h2>
          <p className="text-slate-600 mb-6">This page is only for successful Zelle payments.</p>
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

  const getFeeTypeName = (type: string | null) => {
    switch (type) {
      case 'i-20_control_fee':
        return 'I-20 Control Fee';
      case 'application_fee':
        return 'Application Fee';
      case 'scholarship_fee':
        return 'Scholarship Fee';
      case 'selection_process':
        return 'Selection Process Fee';
      default:
        return 'Payment';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Zelle Payment Successful!</h2>
        
        <p className="text-slate-600 mb-6">
          Thank you for your payment, {user?.name || 'valued customer'}! Your Zelle payment has been verified and approved.
        </p>

        {/* Payment Details */}
        <div className="bg-slate-50 rounded-xl p-6 mb-6 text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Payment Details</h3>
              <p className="text-sm text-slate-600">Zelle payment verified</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Fee Type:</span>
              <span className="font-medium text-slate-900">{getFeeTypeName(feeType)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Amount:</span>
              <span className="font-medium text-slate-900">${amount} USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Status:</span>
              <span className="font-medium text-green-600">Approved</span>
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-slate-50 rounded-xl p-6 mb-6 text-left">
          <h3 className="font-bold text-slate-900 mb-2">What's Next?</h3>
          <ul className="space-y-2 text-slate-600">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Your Zelle payment has been verified and approved
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

        {/* Action Buttons */}
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

export default ZellePaymentSuccess;
