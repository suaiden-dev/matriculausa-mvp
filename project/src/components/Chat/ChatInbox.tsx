import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAdminStudentConversations } from '../../hooks/useAdminStudentChat';
import { useAdminStudentChatNotifications } from '../../hooks/useAdminStudentChatNotifications';
import { useUnreadMessages } from '../../contexts/UnreadMessagesContext';
import { useGlobalStudentUnread } from '../../hooks/useGlobalStudentUnread';
import { Users, MessageSquare, Plus } from 'lucide-react';
import StudentSelector from './StudentSelector';
import { supabase } from '../../lib/supabase';

interface ChatInboxProps {
  className?: string;
  onConversationSelect?: (conversationId: string, recipientId: string, recipientName: string) => void;
  selectedConversationId?: string;
}

interface ConversationItemProps {
  conversation: any;
  isSelected: boolean;
  onClick: () => void;
  getGlobalUnreadCount: (studentId: string) => number;
}

const ConversationItem: React.FC<ConversationItemProps> = ({ conversation, isSelected, onClick, getGlobalUnreadCount }) => {
  const { userProfile } = useAuth();
  
  // Determine recipient based on current user role
  const recipient = (userProfile?.role === 'affiliate_admin' || userProfile?.role === 'admin')
    ? conversation.student_profile 
    : conversation.admin_profile;
  
  const recipientName = recipient?.full_name || 'Unknown User';
  
  // Get global unread count for this student (if it's a student conversation)
  const globalUnreadCount = (userProfile?.role === 'affiliate_admin' || userProfile?.role === 'admin') 
    ? getGlobalUnreadCount(conversation.student_id) 
    : 0;
  
  // Use the maximum between conversation unread count and global unread count
  const effectiveUnreadCount = Math.max(conversation.unread_count, globalUnreadCount);
  const hasEffectiveUnread = effectiveUnreadCount > 0;
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div
      className={`flex items-center p-4 cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-all duration-200 ease-in-out ${
        isSelected ? 'bg-blue-50 border-blue-200' : ''
      }`}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mr-3">
        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
          {recipient?.avatar_url ? (
            <img
              src={recipient.avatar_url}
              alt={recipientName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <span className="text-slate-600 font-semibold text-lg">
              {recipientName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className={`text-sm font-medium text-slate-900 truncate ${hasEffectiveUnread ? 'font-semibold' : ''}`}>
            {recipientName}
          </h3>
          <span className="text-xs text-slate-500 flex items-center">
            {formatTime(conversation.last_message_at)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p className={`text-sm text-slate-600 truncate ${hasEffectiveUnread ? 'font-medium' : ''}`}>
            {conversation.last_message || 'No messages yet'}
          </p>
          {hasEffectiveUnread && (
            <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[1.25rem] text-center animate-pulse">
              {effectiveUnreadCount > 99 ? '99+' : effectiveUnreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const ChatInbox: React.FC<ChatInboxProps> = ({ 
  className = '', 
  onConversationSelect,
  selectedConversationId 
}) => {
  const { user, userProfile } = useAuth();
  const { conversations, loading, error, isInitialLoad, refetchConversations, updateConversationUnreadCount } = useAdminStudentConversations();
  const { markConversationAsRead } = useAdminStudentChatNotifications();
  const { resetUnreadCount } = useUnreadMessages();
  const { getUnreadCount } = useGlobalStudentUnread();
  const [searchTerm, setSearchTerm] = useState('');
  const [showStudentSelector, setShowStudentSelector] = useState(false);

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conversation => {
    const recipient = (userProfile?.role === 'affiliate_admin' || userProfile?.role === 'admin')
      ? conversation.student_profile 
      : conversation.admin_profile;
    const recipientName = recipient?.full_name || '';
    return recipientName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Auto-refresh conversations every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchConversations(false); // Don't show loading for auto-refresh
    }, 30000);

    return () => clearInterval(interval);
  }, [refetchConversations]);

  const handleConversationClick = (conversation: any) => {
    const recipient = (userProfile?.role === 'affiliate_admin' || userProfile?.role === 'admin')
      ? conversation.student_profile 
      : conversation.admin_profile;
    const recipientName = recipient?.full_name || 'Unknown User';
    const recipientId = (userProfile?.role === 'affiliate_admin' || userProfile?.role === 'admin')
      ? conversation.student_id 
      : conversation.admin_id;

    // Update unread count locally to 0 when conversation is selected
    if (conversation.unread_count > 0) {
      updateConversationUnreadCount(conversation.id, 0);
    }

    // Mark conversation notifications as read
    markConversationAsRead(conversation.id);

    // Reset global unread count immediately (this will make the blue dots disappear immediately)
    resetUnreadCount();

    onConversationSelect?.(conversation.id, recipientId, recipientName);
  };

  const handleStudentSelect = async (studentId: string, studentName: string) => {
    // First, try to find existing conversation with this student
    try {
      let query = supabase
        .from('admin_student_conversations')
        .select('id, admin_id')
        .eq('student_id', studentId);

      // For affiliate admins, only look for their own conversations
      // For regular admins, look for any existing conversation with this student
      if (userProfile?.role === 'affiliate_admin') {
        query = query.eq('admin_id', user?.id);
      }

      const { data: existingConversations, error } = await query;

      if (error) {
        console.error('Error finding existing conversation:', error);
      }

      if (existingConversations && existingConversations.length > 0) {
        // Use the first existing conversation (most recent)
        const existingConversation = existingConversations[0];
        onConversationSelect?.(existingConversation.id, studentId, studentName);
      } else {
        // Create new conversation by passing empty string
        onConversationSelect?.('', studentId, studentName);
      }
    } catch (e) {
      console.error('Error in handleStudentSelect:', e);
      // Fallback to creating new conversation
      onConversationSelect?.('', studentId, studentName);
    }
    setShowStudentSelector(false);
  };

  if (loading && isInitialLoad) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-slate-200 ${className}`}>
        <div className="p-4 border-b border-slate-200">
          <div className="h-6 w-40 bg-slate-100 rounded animate-pulse" />
          <div className="mt-3 h-9 w-full max-w-sm bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="p-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center p-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-full bg-slate-100 animate-pulse mr-3" />
              <div className="flex-1 min-w-0">
                <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse mb-2" />
                <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="w-10 h-3 bg-slate-100 rounded animate-pulse ml-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-slate-200 ${className}`}>
        <div className="p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => refetchConversations(true)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            {userProfile?.role === 'affiliate_admin' ? 'Student Conversations' : 'Support Chat'}
          </h2>
          <div className="flex items-center space-x-2">
            {userProfile?.role === 'affiliate_admin' && (
              <button
                onClick={() => setShowStudentSelector(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded-md flex items-center transition-colors"
                title="Start new conversation"
              >
                <Plus className="w-4 h-4 mr-1" />
                New Chat
              </button>
            )}
            <button
              onClick={() => refetchConversations(false)}
              className="text-slate-500 hover:text-slate-700 p-1 rounded"
              title="Refresh conversations"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder={userProfile?.role === 'affiliate_admin' ? 'Search students...' : 'Search conversations...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-6 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {conversations.length === 0 
                ? 'No conversations yet' 
                : 'No conversations match your search'
              }
            </p>
            {userProfile?.role === 'student' && conversations.length === 0 && (
              <p className="text-xs text-slate-400 mt-1">
                Start a conversation with an admin to get help
              </p>
            )}
          </div>
        ) : (
          <div>
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversationId === conversation.id}
                onClick={() => handleConversationClick(conversation)}
                getGlobalUnreadCount={getUnreadCount}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA - Start new conversation (admin/affiliate_admin) */}
      {(userProfile?.role === 'affiliate_admin' || userProfile?.role === 'admin') && (
        <div className="border-t border-slate-200 p-3 mt-auto sticky bottom-0 bg-white">
          <button
            onClick={() => setShowStudentSelector(true)}
            className="w-full bg-[#05294E] hover:bg-[#041f3f] text-white text-sm px-3 py-2 rounded-md flex items-center justify-center gap-2 transition-colors"
            title="Start new conversation"
          >
            <Plus className="w-4 h-4" />
            Start new conversation
          </button>
        </div>
      )}

      {/* Student Selector Modal */}
      <StudentSelector
        isOpen={showStudentSelector}
        onClose={() => setShowStudentSelector(false)}
        onStudentSelect={handleStudentSelect}
      />
    </div>
  );
};

export default ChatInbox;