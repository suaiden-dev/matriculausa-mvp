import React, { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAdminStudentChat } from '../../hooks/useAdminStudentChat';
import ApplicationChat from '../ApplicationChat';
import ChatInbox from './ChatInbox';
import { ArrowLeft, MessageSquare, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface AdminStudentChatProps {
  className?: string;
  defaultConversationId?: string;
  defaultRecipientId?: string;
  showInbox?: boolean;
}

const AdminStudentChat: React.FC<AdminStudentChatProps> = ({
  className = '',
  defaultConversationId,
  defaultRecipientId,
  showInbox = true,
}) => {
  const { user, userProfile } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(defaultConversationId);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | undefined>(defaultRecipientId);
  const [selectedRecipientName, setSelectedRecipientName] = useState<string>('');
  const [showMobileInbox, setShowMobileInbox] = useState(true);
  const [selectedRecipientInfo, setSelectedRecipientInfo] = useState<{ email?: string; phone?: string } | null>(null);
  const [selectedRecipientProfileId, setSelectedRecipientProfileId] = useState<string | null>(null);

  // Initialize chat with selected conversation or recipient
  const chat = useAdminStudentChat(selectedConversationId, selectedRecipientId);

  const handleConversationSelect = useCallback((conversationId: string, recipientId: string, recipientName: string) => {
    setSelectedConversationId(conversationId);
    setSelectedRecipientId(recipientId);
    setSelectedRecipientName(recipientName);
    setShowMobileInbox(false); // Hide inbox on mobile when conversation is selected
  }, []);

  // Fetch basic student info for header when admin selects a conversation
  React.useEffect(() => {
    const fetchRecipientInfo = async () => {
      if (!selectedRecipientId || !(userProfile?.role === 'admin' || userProfile?.role === 'affiliate_admin')) {
        setSelectedRecipientInfo(null);
        setSelectedRecipientProfileId(null);
        return;
      }
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('id, email, phone')
          .eq('user_id', selectedRecipientId)
          .single();
        setSelectedRecipientInfo({ email: data?.email || '', phone: data?.phone || '' });
        setSelectedRecipientProfileId(data?.id || null);
      } catch {
        setSelectedRecipientInfo(null);
        setSelectedRecipientProfileId(null);
      }
    };
    fetchRecipientInfo();
  }, [selectedRecipientId, userProfile?.role]);

  const handleBackToInbox = () => {
    setShowMobileInbox(true);
  };

  const handleSendMessage = useCallback((text: string, file?: File) => {
    chat.sendMessage(text, file);
  }, [chat]);

  if (!user || !userProfile) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-slate-200 p-6 ${className}`}>
        <p className="text-center text-slate-500">Please log in to access chat.</p>
      </div>
    );
  }

  // Mobile layout (stacked)
  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden ${className}`}>
        {showMobileInbox ? (
          <ChatInbox
            onConversationSelect={handleConversationSelect}
            selectedConversationId={selectedConversationId}
            className="border-0 shadow-none"
          />
        ) : (
          <div className="h-full flex flex-col">
            {/* Mobile header */}
            <div className="bg-gradient-to-r from-[#05294E] to-[#0a4a7a] px-4 py-3 flex items-center">
              <button
                onClick={handleBackToInbox}
                className="text-white hover:text-slate-200 mr-3"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-semibold text-sm">
                    {selectedRecipientName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">{selectedRecipientName}</h3>
                  <p className="text-slate-200 text-xs">
                    {userProfile.role === 'affiliate_admin' ? 'Student' : 'Support Team'}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1">
              <ApplicationChat
                messages={chat.messages}
                onSend={handleSendMessage}
                onEditMessage={chat.editMessage}
                onDeleteMessage={chat.deleteMessage}
                loading={chat.loading}
                isSending={chat.isSending}
                error={chat.error}
                currentUserId={user.id}
                onMarkAllAsRead={chat.markAllAsRead}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop layout (side by side)
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 h-full min-h-[600px]">
        {/* Inbox sidebar */}
        {showInbox && (
          <div className="lg:col-span-1 border-r border-slate-200">
            <ChatInbox
              onConversationSelect={handleConversationSelect}
              selectedConversationId={selectedConversationId}
              className="border-0 shadow-none h-full"
            />
          </div>
        )}

        {/* Chat area */}
        <div className={`${showInbox ? 'lg:col-span-2' : 'lg:col-span-3'} flex flex-col`}>
          {selectedConversationId || selectedRecipientId ? (
            <>
              {/* Desktop header with student info and link */}
              <div className="bg-gradient-to-r from-[#05294E] to-[#0a4a7a] px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center min-w-0">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-white font-semibold">
                        {selectedRecipientName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white font-semibold truncate">
                        {selectedRecipientName || 'Chat'}
                      </h3>
                      {(userProfile.role === 'affiliate_admin' || userProfile.role === 'admin') && (
                        <div className="text-slate-200 text-xs flex flex-wrap gap-x-4 gap-y-1">
                          {selectedRecipientInfo?.email && <span className="truncate">{selectedRecipientInfo.email}</span>}
                          {selectedRecipientInfo?.phone && <span className="truncate">{selectedRecipientInfo.phone}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  {(userProfile.role === 'affiliate_admin' || userProfile.role === 'admin') && selectedRecipientProfileId && (
                    <Link
                      to={`/admin/dashboard/students/${selectedRecipientProfileId}`}
                      className="text-xs bg-white text-[#05294E] hover:bg-slate-100 px-3 py-1.5 rounded-md font-medium whitespace-nowrap"
                      title="Open student details"
                    >
                      View student details
                    </Link>
                  )}
                </div>
              </div>

              {/* Chat component */}
              <div className="flex-1">
                <ApplicationChat
                  messages={chat.messages}
                  onSend={handleSendMessage}
                  onEditMessage={chat.editMessage}
                  onDeleteMessage={chat.deleteMessage}
                  loading={chat.loading}
                  isSending={chat.isSending}
                  error={chat.error}
                  currentUserId={user.id}
                  onMarkAllAsRead={chat.markAllAsRead}
                />
              </div>
            </>
          ) : (
            // Empty state
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {userProfile.role === 'affiliate_admin' 
                    ? 'Select a student conversation' 
                    : 'Start a conversation'
                  }
                </h3>
                <p className="text-slate-500 max-w-sm">
                  {userProfile.role === 'affiliate_admin'
                    ? 'Choose a conversation from the sidebar to start chatting with students.'
                    : 'Select a conversation from the sidebar or start a new one with an admin.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminStudentChat;