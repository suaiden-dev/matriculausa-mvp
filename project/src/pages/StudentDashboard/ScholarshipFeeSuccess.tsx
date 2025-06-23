import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const ScholarshipFeeSuccess: React.FC = () => {
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