import React from 'react';
import { RefreshCw } from 'lucide-react';

interface EmailTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  color?: string;
}

interface EmailTabsProps {
  tabs: EmailTab[];
  activeTab: string;
  emailCounts: Record<string, number>;
  loading: boolean;
  onTabChange: (tabId: string) => void;
  onRefresh: () => void;
}

const EmailTabs: React.FC<EmailTabsProps> = ({
  tabs,
  activeTab,
  emailCounts,
  loading,
  onTabChange,
  onRefresh
}) => {
  // Filtrar abas que devem ser mostradas
  const visibleTabs = tabs.filter(tab => {
    // Sempre mostrar a aba ativa
    if (activeTab === tab.id) return true;
    // Mostrar outras abas apenas se tiverem emails
    return emailCounts[tab.id] && emailCounts[tab.id] > 0;
  });

  // Se nenhuma aba ficou visível, mostrar pelo menos a aba ativa
  const tabsToShow = visibleTabs.length > 0 ? visibleTabs : tabs.filter(tab => tab.id === activeTab);

  return (
    <div className="px-6 sm:px-8 py-4 border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide flex-1 min-w-0 tab-container">
          {tabsToShow.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center space-x-3 px-4 sm:px-5 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 tab-item ${
                activeTab === tab.id
                  ? 'bg-[#05294E] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={`View ${tab.label} emails`}
              aria-label={`View ${tab.label} emails`}
            >
              <span className={activeTab === tab.id ? 'text-white' : tab.color}>
                {tab.icon}
              </span>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.charAt(0)}</span>
                {emailCounts[tab.id] && emailCounts[tab.id] > 0 && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ml-1 ${
                    activeTab === tab.id 
                      ? 'bg-white/20 text-white' 
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {emailCounts[tab.id] > 999 ? `${(emailCounts[tab.id] / 1000).toFixed(1)}k` : emailCounts[tab.id]}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
        
        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0 ml-3"
          title="Refresh emails"
          aria-label="Refresh emails"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-base hidden sm:inline">Refresh</span>
        </button>
      </div>
    </div>
  );
};

export default EmailTabs; 