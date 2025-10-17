import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAdminStudentConversations } from '../../hooks/useAdminStudentChat';
import { useGlobalStudentUnread } from '../../hooks/useGlobalStudentUnread';
import AdminStudentChat from './AdminStudentChat';
import { MessageSquare, X, Minimize2, Maximize2 } from 'lucide-react';

interface ChatSidebarProps {
  className?: string;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ className = '' }) => {
  const { user, userProfile } = useAuth();
  const { conversations } = useAdminStudentConversations();
  const { totalUnread } = useGlobalStudentUnread();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Calculate total unread messages
  useEffect(() => {
    const total = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
    // Preferir contador global se maior (cobre casos de múltiplos admins)
    setUnreadCount(Math.max(total, totalUnread));
  }, [conversations, totalUnread]);

  // Auto-minimize when clicking outside (for mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const chatElement = document.getElementById('chat-sidebar');
      if (chatElement && !chatElement.contains(event.target as Node) && isOpen && !isMinimized) {
        setIsMinimized(true);
      }
    };

    if (isOpen && window.innerWidth < 768) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, isMinimized]);

  if (!user || !userProfile) {
    return null;
  }

  const toggleChat = () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
    } else {
      setIsOpen(false);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
          <button
            onClick={toggleChat}
            className="bg-[#05294E] hover:bg-[#041f3f] text-white rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-105 relative"
            title={userProfile.role === 'affiliate_admin' ? 'Student Chat' : 'Support Chat'}
          >
            <MessageSquare className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[1.25rem] text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          id="chat-sidebar"
          className={`fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-2xl border border-slate-200 transition-all duration-300 ${
            isMinimized
              ? 'w-80 h-14'
              : 'w-96 h-[600px] lg:w-[800px] lg:h-[600px]'
          } ${className}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#05294E] to-[#0a4a7a] rounded-t-lg">
            <div className="flex items-center text-white">
              <MessageSquare className="w-5 h-5 mr-2" />
              <span className="font-medium text-sm">
                {userProfile.role === 'affiliate_admin' ? 'Student Chat' : 'Support Chat'}
              </span>
              {unreadCount > 0 && !isMinimized && (
                <span className="ml-2 bg-white/20 text-white text-xs rounded-full px-2 py-1">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={toggleMinimize}
                className="text-white hover:text-slate-200 p-1 rounded transition-colors"
                title={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={closeChat}
                className="text-white hover:text-slate-200 p-1 rounded transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <div className="h-[calc(100%-3.5rem)]">
              <AdminStudentChat 
                className="border-0 shadow-none h-full rounded-none"
                showInbox={window.innerWidth >= 1024} // Only show inbox on large screens
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ChatSidebar;