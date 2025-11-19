import React from 'react';
import RefreshButton from '../../../../components/RefreshButton';

export type AdminTabs = 'payments' | 'university-requests' | 'affiliate-requests' | 'zelle-payments';

type TabsProps = {
  activeTab: AdminTabs;
  setActiveTab: (tab: AdminTabs) => void;
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
};

const TabsBase: React.FC<TabsProps> = ({ activeTab, setActiveTab, onRefresh, isRefreshing = false }) => {
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
          <RefreshButton
            onClick={onRefresh}
            isRefreshing={isRefreshing}
            title="Refresh all data"
          />
        )}
      </div>
    </div>
  );
};

export const Tabs = React.memo(TabsBase);
export default Tabs;


