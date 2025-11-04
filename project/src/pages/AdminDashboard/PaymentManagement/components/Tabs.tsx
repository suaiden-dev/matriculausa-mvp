import React from 'react';

export type AdminTabs = 'payments' | 'university-requests' | 'affiliate-requests' | 'zelle-payments';

type TabsProps = {
  activeTab: AdminTabs;
  setActiveTab: (tab: AdminTabs) => void;
  onRefresh?: () => void;
};

const TabsBase: React.FC<TabsProps> = ({ activeTab, setActiveTab, onRefresh }) => {
  return (
    <div className="border-b border-gray-200">
      <div className="flex items-center justify-between">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Student Payments
          </button>
          <button
            onClick={() => setActiveTab('university-requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'university-requests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            University Payment Requests
          </button>
          <button
            onClick={() => setActiveTab('affiliate-requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'affiliate-requests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Affiliate Payment Requests
          </button>
          <button
            onClick={() => setActiveTab('zelle-payments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'zelle-payments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Zelle Payments
          </button>
        </nav>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Refresh all data"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        )}
      </div>
    </div>
  );
};

export const Tabs = React.memo(TabsBase);
export default Tabs;


