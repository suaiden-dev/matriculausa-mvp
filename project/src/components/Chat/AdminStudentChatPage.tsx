import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useAdminStudentChat, useAdminStudentConversations } from '../../hooks/useAdminStudentChat';
import ApplicationChat from '../ApplicationChat';
import ChatInbox from './ChatInbox';
import { MessageSquare, ArrowLeft, Users, HelpCircle } from 'lucide-react';
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
  const { t } = useTranslation();
  const { user, userProfile } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(defaultRecipientId || null);
  const [selectedRecipientName, setSelectedRecipientName] = useState<string>('');
  const [showMobileInbox, setShowMobileInbox] = useState(true);
  const [selectedRecipientInfo, setSelectedRecipientInfo] = useState<{ email?: string; phone?: string } | null>(null);
  const [showStudentGuidance, setShowStudentGuidance] = useState(false);
  const [selectedRecipientProfileId, setSelectedRecipientProfileId] = useState<string | null>(null);
  const [guideEnter, setGuideEnter] = useState(false);
  const [guideExit, setGuideExit] = useState(false);

  // Hook for the selected conversation
  const { updateConversationUnreadCount } = useAdminStudentConversations();
  const chat = useAdminStudentChat(selectedConversationId || undefined, selectedRecipientId || undefined, updateConversationUnreadCount);

  // Removed conversations hook here to avoid duplicate realtime subscriptions; inbox owns the list

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

  // Mostrar uma mensagem de orientação apenas na primeira vez que o aluno abre o chat
  useEffect(() => {
    if (!userProfile) return;
    // Exibir apenas para estudantes
    if (userProfile.role === 'student') {
      const storageKey = 'student_chat_seen_info';
      const seen = localStorage.getItem(storageKey);
      if (!seen) {
        setShowStudentGuidance(true);
        localStorage.setItem(storageKey, 'true');
      }
    }
  }, [userProfile]);

  // Controla animação de entrada ao montar a dica
  useEffect(() => {
    if (showStudentGuidance) {
      const t = setTimeout(() => setGuideEnter(true), 10);
      return () => {
        clearTimeout(t);
        setGuideEnter(false);
      };
    }
  }, [showStudentGuidance]);

  const dismissGuide = () => {
    setGuideExit(true);
    setTimeout(() => {
      setShowStudentGuidance(false);
      setGuideExit(false);
      setGuideEnter(false);
    }, 250);
  };

  const handleBackToInbox = () => {
    setShowMobileInbox(true);
    setSelectedConversationId(null);
    setSelectedRecipientId(null);
    setSelectedRecipientName('');
  };

  // Helper function to determine the correct label for the other party
  const getOtherPartyLabel = () => {
    if (userProfile?.role === 'affiliate_admin' || userProfile?.role === 'admin') {
      return selectedRecipientName || t('studentDashboard.applicationChatPage.studentChat.recipientLabel.student', { defaultValue: 'Student' });
    } else {
      return t('studentDashboard.applicationChatPage.studentChat.recipientLabel.support', { defaultValue: 'Administration' });
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
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [selectedConversationId, chat.messages.length, userProfile?.role, chat.markAllAsRead]);

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
        <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-gray-100 transform transition-all duration-500 hover:shadow-3xl flex-1 flex flex-col ${className}`}>
          {/* Student header indicating admin/support */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white gap-4">
            <div className="flex items-center min-w-0">
              <div className="min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{t('studentDashboard.applicationChatPage.studentChat.header.title', { defaultValue: 'Equipe de suporte' })}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('studentDashboard.applicationChatPage.studentChat.header.responseTime', { defaultValue: 'Tempo de resposta: 1-2 horas úteis' })}</p>
              </div>
            </div>
            <button
              onClick={() => setShowStudentGuidance(true)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#05294E]/20 transition-all duration-300"
              title={t('studentChat.header.helpTooltip', { defaultValue: 'How does the chat work?' })}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          {showStudentGuidance && (
            <div className="md:hidden fixed inset-x-3 bottom-24 z-40" role="dialog" aria-label="Dica do chat">
              <div className={`bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 transition-all duration-300 ${guideEnter && !guideExit ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">i</div>
                  <div className="text-slate-700">
                    <p className="text-sm font-semibold mb-1">{t('studentDashboard.applicationChatPage.studentChat.guide.title', { defaultValue: 'Chat with Administration' })}</p>
                    <p className="text-xs leading-relaxed">{t('studentDashboard.applicationChatPage.studentChat.guide.subtitle', { defaultValue: 'Ask about scholarships, documents and your application progress.' })}</p>
                    <ul className="mt-2 text-xs text-slate-600 list-disc pl-4 space-y-1">
                      <li>{t('studentDashboard.applicationChatPage.studentChat.guide.supportsAttachments', { defaultValue: 'Send messages and attachments' })}</li>
                      <li>{t('studentDashboard.applicationChatPage.studentChat.guide.businessHours', { defaultValue: 'Replies during business hours' })}</li>
                      <li>{t('studentDashboard.applicationChatPage.studentChat.guide.historySaved', { defaultValue: 'Conversation history is saved' })}</li>
                    </ul>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={dismissGuide}
                        className="px-3 py-1.5 rounded-md text-xs bg-[#05294E] text-white hover:bg-[#041f3f]"
                        title={t('studentDashboard.applicationChatPage.studentChat.guide.ctaStart', { defaultValue: 'Start' })}
                      >{t('studentDashboard.applicationChatPage.studentChat.guide.ctaStart', { defaultValue: 'Entendi' })}</button>
                      <button
                        onClick={dismissGuide}
                        className="px-3 py-1.5 rounded-md text-xs bg-slate-100 text-slate-700 hover:bg-slate-200"
                        title={t('studentDashboard.applicationChatPage.studentChat.guide.ctaLater', { defaultValue: 'Not now' })}
                      >{t('studentDashboard.applicationChatPage.studentChat.guide.ctaLater', { defaultValue: 'Agora não' })}</button>
                    </div>
                  </div>
                </div>
              </div>
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
            hideBubbleHeader={true}
            overrideHeights={true}
            className="flex-1 min-h-0"
            inputPlaceholder={t('studentDashboard.applicationChatPage.studentChat.input.placeholder', { defaultValue: 'Type your message...' })}
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
      <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-gray-100 transform transition-all duration-500 hover:shadow-3xl flex-1 flex flex-col ${className}`}>
          {/* Student header indicating admin/support */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white gap-4">
            <div className="flex items-center min-w-0">
              <div className="min-w-0">
                <h3 className="font-medium text-gray-900 truncate">{t('studentDashboard.applicationChatPage.studentChat.header.title')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('studentDashboard.applicationChatPage.studentChat.header.responseTime')}</p>
              </div>
            </div>
            <button
              onClick={() => setShowStudentGuidance(true)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#05294E]/20 transition-all duration-300"
              title={t('studentDashboard.applicationChatPage.studentChat.header.helpTooltip')}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          {showStudentGuidance && (
            <div className="px-4 py-3 bg-blue-50 text-blue-900 text-xs border-b border-blue-100">
              <div className="flex items-start justify-between gap-3">
                <p className="leading-relaxed">
                  {t('studentDashboard.applicationChatPage.studentChat.guide.subtitle')}
                </p>
                <button
                  className="text-blue-700 hover:text-blue-900 whitespace-nowrap"
                  onClick={() => setShowStudentGuidance(false)}
                  title={t('studentDashboard.applicationChatPage.studentChat.guide.ctaStart')}
                >
                  {t('studentDashboard.applicationChatPage.studentChat.guide.ctaStart')}
                </button>
              </div>
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
            hideBubbleHeader={true}
            overrideHeights={true}
            className="flex-1 min-h-0"
            inputPlaceholder={t('studentDashboard.applicationChatPage.studentChat.input.placeholder')}
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
                  hideBubbleHeader={true}
                  overrideHeights={true}
                  className="h-full"
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminStudentChat;