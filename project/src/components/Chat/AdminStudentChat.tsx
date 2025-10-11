import React, { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAdminStudentChat, useAdminStudentConversations } from '../../hooks/useAdminStudentChat';
import ApplicationChat from '../ApplicationChat';
import ChatInbox from './ChatInbox';
import { ArrowLeft, Users, ExternalLink, HelpCircle } from 'lucide-react';
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
  const [showGuide, setShowGuide] = useState(false);

  // Get conversations hook to access updateConversationUnreadCount
  const { updateConversationUnreadCount } = useAdminStudentConversations();
  
  // Initialize chat with selected conversation or recipient
  const chat = useAdminStudentChat(selectedConversationId, selectedRecipientId, updateConversationUnreadCount);

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
      <div className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden ${className}`} style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
        {showMobileInbox ? (
          <ChatInbox
            onConversationSelect={handleConversationSelect}
            selectedConversationId={selectedConversationId}
            className="border-0 shadow-none"
          />
        ) : (
          <div className="h-full flex flex-col">
            {/* Mobile header */}
            <div className="bg-gradient-to-r from-[#05294E] to-[#0a4a7a] px-4 py-3 flex items-center justify-between">
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
              <button
                onClick={() => setShowGuide(true)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-white/30 text-white hover:bg-white/10"
                title="How it works"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Chat area */}
            <div className="flex-1 min-h-0">
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
                overrideHeights={true}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop layout (side by side)
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden ${className}`} style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowGuide(true)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-white/30 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
                      title="How it works"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    {(userProfile.role === 'affiliate_admin' || userProfile.role === 'admin') && selectedRecipientProfileId && (
                      <Link
                        to={`/admin/dashboard/students/${selectedRecipientProfileId}`}
                        className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] sm:text-xs text-white border border-white/30 bg-white/10 hover:bg-white/20 backdrop-blur-[2px] shadow-sm transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-white/40"
                        title="Open student details"
                      >
                        <ExternalLink className="w-4 h-4 opacity-90" />
                        Student details
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat component */}
              <div className="flex-1 min-h-0">
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
                  overrideHeights={true}
                  className="h-full"
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
      {showGuide && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" role="dialog" aria-label="Chat guide">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md md:max-w-lg p-5">
            <h3 className="text-slate-900 font-semibold mb-2">About this chat</h3>
            <p className="text-sm text-slate-700">This channel connects you and the student. Use it to guide, request documents and follow the application progress.</p>
            <ul className="mt-3 text-sm text-slate-700 list-disc pl-5 space-y-1">
              <li>Files and images are supported</li>
              <li>Replies mainly during business hours</li>
              <li>Conversation history is stored</li>
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowGuide(false)} className="px-3 py-1.5 rounded-md bg-[#05294E] text-white hover:bg-[#041f3f] text-sm">Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudentChat;