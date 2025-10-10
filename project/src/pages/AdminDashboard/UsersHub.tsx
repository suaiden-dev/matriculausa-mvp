import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GraduationCap, DollarSign, MessageSquare } from 'lucide-react';
import StudentApplicationsView from '../../components/AdminDashboard/StudentApplicationsView';
import FeeManagement from '../../components/AdminDashboard/FeeManagement';
import AdminChatPage from './AdminChatPage';
import { useUnreadMessagesCount } from '../../hooks/useUnreadMessagesCount';

const UsersHub: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'applications' | 'feeManagement' | 'messages'>('applications');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const { unreadCount } = useUnreadMessagesCount();

  // Read URL parameters on component mount
  useEffect(() => {
    const tab = searchParams.get('tab');
    const conversation = searchParams.get('conversation');
    const recipientId = searchParams.get('recipient_id');
    
    if (tab === 'messages') {
      setActiveTab('messages');
    } else if (tab === 'feeManagement') {
      setActiveTab('feeManagement');
    } else {
      setActiveTab('applications');
    }
    
    if (conversation) {
      setSelectedConversationId(conversation);
    }
    
    if (recipientId) {
      setSelectedRecipientId(recipientId);
    }
  }, [searchParams]);

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
          <button
            onClick={() => setActiveTab('messages')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'messages'
                ? 'border-[#05294E] text-[#05294E]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <div className="relative">
                <MessageSquare className="h-5 w-5" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <span>Student Messages</span>
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'applications' ? (
        <StudentApplicationsView />
      ) : activeTab === 'feeManagement' ? (
        <FeeManagement />
      ) : (
        <AdminChatPage 
          defaultConversationId={selectedConversationId || undefined}
          defaultRecipientId={selectedRecipientId || undefined}
        />
      )}
    </div>
  );
};

export default UsersHub;


