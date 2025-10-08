import React, { useState } from 'react';
import { 
  Star,
  Building,
  Users,
  FileCheck,
  History
} from 'lucide-react';
import FeaturedScholarshipsManagement from './FeaturedScholarshipsManagement';
import FeaturedUniversitiesManagement from './FeaturedUniversitiesManagement';
import UserManagement from './UserManagement';
import TermsManagement from './TermsManagement';

interface UserManagementPropsShape {
  users: any[];
  stats: {
    total: number;
    students: number;
    schools: number;
    admins: number;
    affiliate_admins?: number;
  };
  onSuspend: (userId: string) => void;
  onRefresh?: () => void;
}

interface SystemSettingsProps {
  userManagementProps?: UserManagementPropsShape;
}

const SystemSettings: React.FC<SystemSettingsProps> = ({ userManagementProps }) => {
  const [activeTab, setActiveTab] = useState('featured-scholarships');

  const tabs = [
    {
      id: 'featured-scholarships',
      label: 'Featured Scholarships',
      icon: Star,
      color: 'bg-yellow-100 text-yellow-600'
    },
    {
      id: 'featured-universities',
      label: 'Featured Universities',
      icon: Building,
      color: 'bg-green-100 text-green-600'
    },
    {
      id: 'user-management',
      label: 'User Management',
      icon: Users,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'terms-management',
      label: 'Terms Management',
      icon: FileCheck,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: 'acceptance-history',
      label: 'Acceptance History',
      icon: History,
      color: 'bg-orange-100 text-orange-600'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'featured-scholarships':
        return <FeaturedScholarshipsManagement />;
      case 'featured-universities':
        return <FeaturedUniversitiesManagement />;
      case 'user-management':
        return userManagementProps ? (
          <UserManagement 
            users={userManagementProps.users}
            stats={userManagementProps.stats}
            onSuspend={userManagementProps.onSuspend}
            onRefresh={userManagementProps.onRefresh}
            onlyUsersMode
          />
        ) : (
          <div className="text-sm text-slate-600">User management data not available.</div>
        );
      case 'terms-management':
        return <TermsManagement defaultTab="terms" />;
      case 'acceptance-history':
        return <TermsManagement defaultTab="history" />;
      default:
        return <FeaturedScholarshipsManagement />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Content Management</h2>
          <p className="text-slate-600">Manage featured scholarships and universities</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#05294E] text-white shadow-lg'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  isActive ? 'bg-white bg-opacity-20' : tab.color
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default SystemSettings;