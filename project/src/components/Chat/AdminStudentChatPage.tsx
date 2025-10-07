import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAdminStudentChat, useAdminStudentConversations } from '../../hooks/useAdminStudentChat';
import ApplicationChat from '../ApplicationChat';
import ChatInbox from './ChatInbox';
import { MessageSquare, ArrowLeft, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface AdminStudentChatProps {
  className?: string;
  showInbox?: boolean;
  defaultRecipientId?: string;
  defaultConversationId?: string;
}

const AdminStudentChat: React.FC<AdminStudentChatProps> = ({ 
  className = '', 
  showInbox = true,
  defaultRecipientId,
  defaultConversationId
}) => {
  const { user, userProfile } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(defaultRecipientId || null);
  const [selectedRecipientName, setSelectedRecipientName] = useState<string>('');
  const [showMobileInbox, setShowMobileInbox] = useState(true);
  const [selectedRecipientInfo, setSelectedRecipientInfo] = useState<{ email?: string; phone?: string } | null>(null);
  const [selectedRecipientProfileId, setSelectedRecipientProfileId] = useState<string | null>(null);

  // Hook for the selected conversation
  const chat = useAdminStudentChat(selectedConversationId || undefined, selectedRecipientId || undefined);

  // Hook for conversations list (for inbox)
  const { conversations, refetchConversations } = useAdminStudentConversations();

  // Set default conversation if provided
  useEffect(() => {
    if (defaultConversationId && !selectedConversationId) {
      setSelectedConversationId(defaultConversationId);
      setShowMobileInbox(false); // Hide inbox on mobile when conversation is selected
    }
  }, [defaultConversationId, selectedConversationId]);

  const handleConversationSelect = (conversationId: string, recipientId: string, recipientName: string) => {
    // If conversationId is empty, it means admin is starting a new conversation with a student
    if (conversationId === '') {
      setSelectedConversationId(null); // Let the hook create a new conversation
    } else {
      setSelectedConversationId(conversationId);
    }
    setSelectedRecipientId(recipientId);
    setSelectedRecipientName(recipientName);
    setShowMobileInbox(false); // Hide inbox on mobile when conversation is selected
  };

  // Buscar email/telefone do destinatário para o header (quando admin/affiliate_admin)
  useEffect(() => {
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
    setSelectedConversationId(null);
    setSelectedRecipientId(null);
    setSelectedRecipientName('');
  };

  // Helper function to determine the correct label for the other party
  const getOtherPartyLabel = () => {
    if (userProfile?.role === 'affiliate_admin' || userProfile?.role === 'admin') {
      return selectedRecipientName || 'Student';
    } else {
      return 'Support Team';
    }
  };

  // Auto-mark messages as read when admin enters a conversation
  useEffect(() => {
    if (
      selectedConversationId && 
      chat.messages.length > 0 && 
      (userProfile?.role === 'admin' || userProfile?.role === 'affiliate_admin')
    ) {
      // Wait a bit for messages to load, then mark as read
      const timer = setTimeout(async () => {
        await chat.markAllAsRead();
        // Force refetch conversations to update unread counts
        refetchConversations();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [selectedConversationId, chat.messages.length, userProfile?.role, chat.markAllAsRead, refetchConversations]);

  if (!user || !userProfile) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-slate-200 p-6 ${className}`}>
        <p className="text-slate-500">Please log in to access chat.</p>
      </div>
    );
  }

  // Mobile view: show either inbox or chat
  const isMobile = window.innerWidth < 1024;
  if (isMobile) {
    // If no inbox should be shown, always show chat
    if (!showInbox) {
      return (
        <div className={`bg-white rounded-lg shadow-sm border border-slate-200 ${className}`}>
          <ApplicationChat
            messages={chat.messages}
            onSend={chat.sendMessage}
            onEditMessage={chat.editMessage}
            onDeleteMessage={chat.deleteMessage}
            loading={chat.loading}
            isSending={chat.isSending}
            error={chat.error}
            currentUserId={user.id}
            onMarkAllAsRead={chat.markAllAsRead}
            otherPartyLabel={getOtherPartyLabel()}
          />
        </div>
      );
    }

    // Show inbox or chat based on selection
    if (showMobileInbox || !selectedConversationId) {
      return (
        <div className={`bg-white rounded-lg shadow-sm border border-slate-200 ${className}`}>
          <ChatInbox
            onConversationSelect={handleConversationSelect}
            selectedConversationId={selectedConversationId || undefined}
          />
        </div>
      );
    } else {
      return (
        <div className={`bg-white rounded-lg shadow-sm border border-slate-200 ${className}`}>
          {/* Mobile header with back button */}
          <div className="flex items-center p-4 border-b border-slate-200">
            <button
              onClick={handleBackToInbox}
              className="mr-3 p-1 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center mr-3">
                <span className="text-slate-600 font-semibold text-sm">
                  {selectedRecipientName.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="font-medium text-slate-900">{selectedRecipientName}</h3>
            </div>
          </div>
          
          <div className="h-[calc(100%-4rem)]">
            <ApplicationChat
              messages={chat.messages}
              onSend={chat.sendMessage}
              onEditMessage={chat.editMessage}
              onDeleteMessage={chat.deleteMessage}
              loading={chat.loading}
              isSending={chat.isSending}
              error={chat.error}
              currentUserId={user.id}
              onMarkAllAsRead={chat.markAllAsRead}
              otherPartyLabel={getOtherPartyLabel()}
            />
          </div>
        </div>
      );
    }
  }

  // Desktop view: show inbox and chat side by side
  if (!showInbox) {
    // Only chat, no inbox - always show chat interface
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-slate-200 ${className}`}>
          <ApplicationChat
            messages={chat.messages}
            onSend={chat.sendMessage}
            onEditMessage={chat.editMessage}
            onDeleteMessage={chat.deleteMessage}
            loading={chat.loading}
            isSending={chat.isSending}
            error={chat.error}
            currentUserId={user.id}
            onMarkAllAsRead={chat.markAllAsRead}
            otherPartyLabel={getOtherPartyLabel()}
          />
      </div>
    );
  }

  // Desktop view with inbox
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden ${className}`}>
      <div className="flex h-full">
        {/* Inbox sidebar */}
        <div className="w-80 border-r border-slate-200 flex-shrink-0">
          <ChatInbox
            onConversationSelect={handleConversationSelect}
            selectedConversationId={selectedConversationId || undefined}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedConversationId || selectedRecipientId ? (
            <>
              {/* Header com informações do estudante e link para detalhes (apenas admin/affiliate_admin) */}
              {selectedRecipientName && (
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 gap-4">
                  <div className="flex items-center min-w-0">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-slate-700 font-semibold">
                        {selectedRecipientName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-slate-900 truncate">{selectedRecipientName}</h3>
                      {(userProfile.role === 'affiliate_admin' || userProfile.role === 'admin') && (
                        <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                          {selectedRecipientInfo?.email && <span className="truncate">{selectedRecipientInfo.email}</span>}
                          {selectedRecipientInfo?.phone && <span className="truncate">{selectedRecipientInfo.phone}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  {(userProfile.role === 'affiliate_admin' || userProfile.role === 'admin') && selectedRecipientProfileId && (
                    <Link
                      to={`/admin/dashboard/students/${selectedRecipientProfileId}`}
                      className="text-xs bg-[#05294E] text-white hover:bg-[#041f3f] px-3 py-1.5 rounded-md font-medium whitespace-nowrap"
                      title="Open student details"
                    >
                      View student details
                    </Link>
                  )}
                </div>
              )}
              
                <ApplicationChat
                  messages={chat.messages}
                  onSend={chat.sendMessage}
                  onEditMessage={chat.editMessage}
                  onDeleteMessage={chat.deleteMessage}
                  loading={chat.loading}
                  isSending={chat.isSending}
                  error={chat.error}
                  currentUserId={user.id}
                  onMarkAllAsRead={chat.markAllAsRead}
                  otherPartyLabel={getOtherPartyLabel()}
                />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {(userProfile.role === 'affiliate_admin' || userProfile.role === 'admin') 
                    ? 'Select a student to chat with' 
                    : 'Start a conversation'
                  }
                </h3>
                <p className="text-slate-500">
                  {(userProfile.role === 'affiliate_admin' || userProfile.role === 'admin')
                    ? 'Choose a conversation from the sidebar to begin messaging'
                    : 'Select a conversation or start a new one with support'
                  }
                </p>
                {conversations.length === 0 && (
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg">
                      <Users className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-sm text-blue-700">
                        {(userProfile.role === 'affiliate_admin' || userProfile.role === 'admin')
                          ? 'No student conversations yet'
                          : 'No conversations yet'
                        }
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminStudentChat;