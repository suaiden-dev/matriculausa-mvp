import React from 'react';

export type TabId = 'overview' | 'documents' | 'scholarships' | 'logs';

interface Tab {
  id: TabId;
  label: string;
}

interface StudentDetailsTabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'scholarships', label: 'Scholarships' },
  { id: 'logs', label: 'Activity Log' },
];

/**
 * StudentDetailsTabNavigation - Tab navigation component
 * Displays and manages navigation between different sections
 */
const StudentDetailsTabNavigation: React.FC<StudentDetailsTabNavigationProps> = React.memo(({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8 px-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-[#05294E] text-[#05294E]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
});

StudentDetailsTabNavigation.displayName = 'StudentDetailsTabNavigation';

export default StudentDetailsTabNavigation;

