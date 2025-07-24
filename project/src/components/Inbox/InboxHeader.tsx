import React from 'react';
import { Mail, Plus, Settings } from 'lucide-react';
import GmailAccountSelector from './GmailAccountSelector';

interface InboxHeaderProps {
  activeTab: string;
  loading: boolean;
  filteredEmails: any[];
  emailCounts: Record<string, number>;
  onCompose: () => void;
  onShowEmailIntegration: () => void;
  onShowManageConnections: () => void;
  connection: any;
  onAccountChange?: (email: string) => void;
}

const InboxHeader: React.FC<InboxHeaderProps> = ({
  activeTab,
  loading,
  filteredEmails,
  emailCounts,
  onCompose,
  onShowEmailIntegration,
  onShowManageConnections,
  connection,
  onAccountChange
}) => {
  return (
    <div className="bg-gradient-to-r from-[#05294E] to-[#D0151C] px-6 sm:px-8 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 sm:space-x-6">
          <div className="bg-white/20 p-3 rounded-xl">
            <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
            <p className="text-white/80 text-sm sm:text-base">
              {loading ? 'Loading...' : (
                <>
                  {emailCounts[activeTab] ? (
                    <>
                      {emailCounts[activeTab]} message{emailCounts[activeTab] !== 1 ? 's' : ''}
                    </>
                  ) : (
                    'No messages'
                  )}
                </>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Seletor de conta Gmail */}
          <GmailAccountSelector onAccountChange={onAccountChange} />
          
          <button
            onClick={onCompose}
            disabled={!connection}
            className="bg-white text-[#05294E] px-4 sm:px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors flex items-center space-x-2 disabled:opacity-50 text-base sm:text-lg"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">New Email</span>
            <span className="sm:hidden">New</span>
          </button>
          <button 
            onClick={onShowManageConnections}
            className="bg-white/20 text-white px-3 sm:px-4 py-3 rounded-xl font-semibold hover:bg-white/30 transition-colors flex items-center space-x-2 text-base sm:text-lg"
          >
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Manage Connections</span>
            <span className="sm:hidden">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InboxHeader; 