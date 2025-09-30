import React, { useState } from 'react';
import { GraduationCap, DollarSign } from 'lucide-react';
import StudentApplicationsView from '../../components/AdminDashboard/StudentApplicationsView';
import FeeManagement from '../../components/AdminDashboard/FeeManagement';

const UsersHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'applications' | 'feeManagement'>('applications');

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('applications')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'applications'
                ? 'border-[#05294E] text-[#05294E]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-5 w-5" />
              <span>Application Tracking</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('feeManagement')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'feeManagement'
                ? 'border-[#05294E] text-[#05294E]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Fee Management</span>
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'applications' ? (
        <StudentApplicationsView />
      ) : (
        <FeeManagement />
      )}
    </div>
  );
};

export default UsersHub;


