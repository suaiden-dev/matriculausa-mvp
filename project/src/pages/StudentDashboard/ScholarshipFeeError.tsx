import React from 'react';
import { XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { useAuth } from '../../hooks/useAuth';
import { useDynamicFees } from '../../hooks/useDynamicFees';

const ScholarshipFeeError: React.FC = () => {
  const { user } = useAuth();
  const { formatFeeAmount } = useFeeConfig(user?.id);
  const { scholarshipFee, hasSellerPackage } = useDynamicFees();
  
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center bg-white px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
        <XCircle className="h-16 w-16 text-red-600 mb-4" />
        <h1 className="text-3xl font-bold text-red-700 mb-2">Scholarship Fee Payment Error</h1>
        <p className="text-slate-700 mb-6 text-center">
          There was a problem processing your payment of <span className="font-bold">
            {hasSellerPackage ? scholarshipFee : formatFeeAmount(550)}
          </span>.<br/>
          Please try again. If the error persists, contact support.
        </p>
        <Link to="/student/dashboard/applications" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300">
          Back to My Applications
        </Link>
      </div>
    </div>
  );
};

export default ScholarshipFeeError; 