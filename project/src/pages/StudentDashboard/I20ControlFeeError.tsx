import React from 'react';
import { XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import StudentDashboardLayout from './StudentDashboardLayout';
import { useAuth } from '../../hooks/useAuth';

const I20ControlFeeError: React.FC = () => {
  const { user, userProfile, loading } = useAuth();

  return (
    <StudentDashboardLayout user={user} profile={userProfile} loading={loading}>
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-red-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
          <XCircle className="h-16 w-16 text-red-600 mb-4" />
          <h1 className="text-3xl font-bold text-red-700 mb-2">Error in I-20 Control Fee payment</h1>
          <p className="text-slate-700 mb-6 text-center">
            There was a problem processing your payment of <span className="font-bold">$350</span>.<br/>
            Please try again. If the error persists, contact support.
          </p>
          <Link to="/student/dashboard/applications" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300">
            Back to My Applications
          </Link>
        </div>
      </div>
    </StudentDashboardLayout>
  );
};

export default I20ControlFeeError; 