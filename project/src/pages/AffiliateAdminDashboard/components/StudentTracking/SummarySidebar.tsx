import React from 'react';
import { FileText } from 'lucide-react';

interface SummarySidebarProps {
  registrationDate: string;
  onTabChange: (tab: 'details' | 'documents') => void;
}

const SummarySidebar: React.FC<SummarySidebarProps> = ({
  registrationDate,
  onTabChange
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  return (
    <div className="space-y-4">
      {/* Quick Stats Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#041f38] px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Application Summary</h3>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Submitted</span>
            <span className="text-sm text-slate-900">
              {formatDate(registrationDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activity Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="bg-gradient-to-r rounded-t-2xl from-slate-600 to-slate-700 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-sm text-slate-900">Application submitted</p>
                <p className="text-xs text-slate-500">{formatDate(registrationDate)}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className={`w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0`}></div>
              <div className="flex-1">
                <p className="text-sm text-slate-900">Last updated</p>
                <p className="text-xs text-slate-500">{formatDate(registrationDate)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="bg-gradient-to-r rounded-t-2xl from-slate-500 to-slate-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            <button
              onClick={() => onTabChange('documents')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-slate-600" />
                <span className="text-sm font-medium text-slate-900">Documents</span>
              </div>
              <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummarySidebar;
