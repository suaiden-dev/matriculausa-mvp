import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Award, FileText } from 'lucide-react';
import ScholarshipManagement from './ScholarshipManagement';
import UniversityGlobalDocumentRequests from './UniversityGlobalDocumentRequests';

const ScholarshipsWrapper: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    {
      id: 'scholarships',
      label: 'Scholarships',
      path: '/school/dashboard/scholarships',
      icon: Award
    },
    {
      id: 'documents',
      label: 'Global Documents',
      path: '/school/dashboard/scholarships/global-document-requests',
      icon: FileText
    }
  ];

  const isActive = (path: string) => {
    if (path === '/school/dashboard/scholarships' && currentPath === '/school/dashboard/scholarships') return true;
    return currentPath.startsWith(path) && path !== '/school/dashboard/scholarships';
  };

  return (
    <div className="space-y-6">
      {/* Shared Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-8 bg-slate-50 border-b border-slate-200">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
            Scholarships & Global Documents
          </h1>
          <p className="text-slate-600">
            Manage your university's scholarship opportunities and global document requirements in one place.
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="px-6 bg-white">
          <div className="flex justify-center border-b border-slate-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = isActive(tab.path);
              return (
                <Link
                  key={tab.id}
                  to={tab.path}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
                    active
                      ? 'border-[#05294E] text-[#05294E] bg-slate-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/30'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-[#05294E]' : 'text-slate-400'}`} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-500">
        <Routes>
          <Route index element={<ScholarshipManagement isTabbed />} />
          <Route path="global-document-requests" element={<UniversityGlobalDocumentRequests isTabbed />} />
          <Route path="*" element={<Navigate to="/school/dashboard/scholarships" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default ScholarshipsWrapper;
