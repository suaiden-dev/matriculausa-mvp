import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  MessageCircle, 
  Eye,
  Reply,
  Globe,
  GraduationCap
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  message: string;
  sentAt: string;
  isOwn: boolean;
  status?: 'pending' | 'sent' | 'error';
  readAt?: string | null;
  updatedAt?: string | null;
  attachments?: { 
    file_url: string; 
    file_name?: string; 
    uploaded_at?: string;
    isUploading?: boolean;
  }[];
}

export interface StudentConversation {
  studentId: string;
  studentName: string;
  studentCountry: string;
  scholarshipTitle: string;
  lastMessage: ChatMessage;
  unreadCount: number;
  lastActivity: string;
  status: 'unread' | 'pending_reply' | 'active' | 'inactive';
  applicationId: string;
}

interface MessagesDashboardProps {
  conversations: StudentConversation[];
  onMarkAsRead: (conversationId: string) => void;
  onQuickReply: (conversationId: string, message: string) => void;
  loading?: boolean;
  isUpdating?: boolean;
}

const MessagesDashboard: React.FC<MessagesDashboardProps> = ({
  conversations,
  onMarkAsRead,
  onQuickReply,
  loading = false,
  isUpdating = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [scholarshipFilter, setScholarshipFilter] = useState<string>('');
  const [quickReplyText, setQuickReplyText] = useState<{ [key: string]: string }>({});
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);

  // Mostrar indicador quando há atualizações
  useEffect(() => {
    if (isUpdating) {
      setShowNewMessageIndicator(true);
      const timer = setTimeout(() => {
        setShowNewMessageIndicator(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isUpdating]);

  // Extrair dados únicos para filtros
  const scholarships = useMemo(() => {
    const scholarshipSet = new Set<string>();
    conversations.forEach(conv => {
      if (conv.scholarshipTitle) scholarshipSet.add(conv.scholarshipTitle);
    });
    return Array.from(scholarshipSet).sort();
  }, [conversations]);

  // Filtrar conversas
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(conv => 
        conv.studentName.toLowerCase().includes(term) ||
        conv.lastMessage.message.toLowerCase().includes(term) ||
        conv.scholarshipTitle.toLowerCase().includes(term)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(conv => conv.status === statusFilter);
    }

    if (scholarshipFilter) {
      filtered = filtered.filter(conv => conv.scholarshipTitle === scholarshipFilter);
    }

    // Ordenar por: não lidas primeiro, depois por última atividade
    return filtered.sort((a, b) => {
      if (a.status === 'unread' && b.status !== 'unread') return -1;
      if (b.status === 'unread' && a.status !== 'unread') return 1;
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });
  }, [conversations, searchTerm, statusFilter, scholarshipFilter]);


  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const truncateMessage = (message: string, maxLength: number = 80) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const handleQuickReply = (conversationId: string) => {
    const message = quickReplyText[conversationId];
    console.log('handleQuickReply called:', { conversationId, message, hasMessage: !!message?.trim() });
    
    if (message?.trim()) {
      console.log('Calling onQuickReply with:', { conversationId, message: message.trim() });
      onQuickReply(conversationId, message.trim());
      setQuickReplyText(prev => ({ ...prev, [conversationId]: '' }));
    } else {
      console.log('No message to send or message is empty');
    }
  };

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Student Messages</h2>
              <p className="text-sm text-slate-600">
                {totalUnread > 0 ? `${totalUnread} unread messages` : 'All messages read'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {totalUnread > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-red-600">{totalUnread}</span>
              </div>
            )}
            {isUpdating && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-blue-600">Updating...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <div className="lg:col-span-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search messages or students..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="unread">Unread</option>
              <option value="pending_reply">Pending Reply</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Scholarship Filter */}
          <div>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={scholarshipFilter}
              onChange={(e) => setScholarshipFilter(e.target.value)}
            >
              <option value="">All Scholarships</option>
              {scholarships.map(scholarship => (
                <option key={scholarship} value={scholarship}>{scholarship}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* New Message Indicator */}
      {showNewMessageIndicator && (
        <div className="px-6 py-2 bg-green-50 border-b border-green-200">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-700 font-medium">New messages received</span>
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="divide-y divide-slate-200">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No messages found</h3>
            <p className="text-slate-600">
              {searchTerm || statusFilter || scholarshipFilter
                ? 'Try adjusting your filters to see more messages.'
                : 'No student messages available at the moment.'
              }
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const isExpanded = quickReplyText[conversation.studentId] !== undefined;

            return (
              <div
                key={conversation.studentId}
                className={`p-4 hover:bg-slate-50 transition-colors ${
                  conversation.status === 'unread' ? 'bg-red-50/30' : ''
                }`}
              >
                <div className="flex items-start space-x-4">
                  {/* Status Indicator */}
                  <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                    conversation.status === 'unread' ? 'bg-red-500' : 'bg-slate-300'
                  }`} />

                  {/* Student Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">
                          {conversation.studentName}
                        </h3>
                        <div className="flex items-center space-x-2 text-xs text-slate-500">
                          <Globe className="w-3 h-3" />
                          <span>{conversation.studentCountry}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-slate-500">
                          <GraduationCap className="w-3 h-3" />
                          <span className="truncate max-w-32">{conversation.scholarshipTitle}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-500">
                          {formatTimeAgo(conversation.lastActivity)}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Last Message Preview */}
                    <div className="mb-3">
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {conversation.lastMessage.isOwn ? (
                          <>
                            <span className="text-blue-600 font-medium">You: </span>
                            {truncateMessage(conversation.lastMessage.message)}
                            {conversation.lastMessage.updatedAt && (
                              <span className="text-xs text-slate-400 italic ml-1">
                                (edited)
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {truncateMessage(conversation.lastMessage.message)}
                            {conversation.lastMessage.updatedAt && (
                              <span className="text-xs text-slate-400 italic ml-1">
                                (edited)
                              </span>
                            )}
                          </>
                        )}
                      </p>
                    </div>

                    {/* Status and Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {/* <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} border`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </span> */}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            if (isExpanded) {
                              // Cancel: remover o input
                              setQuickReplyText(prev => {
                                const newState = { ...prev };
                                delete newState[conversation.studentId];
                                return newState;
                              });
                            } else {
                              // Quick Reply: mostrar o input
                              setQuickReplyText(prev => ({
                                ...prev,
                                [conversation.studentId]: ''
                              }));
                            }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {isExpanded ? 'Cancel' : 'Quick Reply'}
                        </button>
                        <Link
                          to={`/school/dashboard/student/${conversation.applicationId}?scrollToBottom=true`}
                          className="text-xs text-slate-600 hover:text-slate-800 font-medium flex items-center"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Chat
                        </Link>
                        {conversation.unreadCount > 0 && (
                          <button
                            onClick={() => onMarkAsRead(conversation.studentId)}
                            className="text-xs text-green-600 hover:text-green-800 font-medium"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Reply Input */}
                    {isExpanded && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder="Type your quick reply..."
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={quickReplyText[conversation.studentId] || ''}
                            onChange={(e) => setQuickReplyText(prev => ({ 
                              ...prev, 
                              [conversation.studentId]: e.target.value 
                            }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleQuickReply(conversation.studentId);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleQuickReply(conversation.studentId)}
                            disabled={!quickReplyText[conversation.studentId]?.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                          >
                            <Reply className="w-4 h-4 mr-1" />
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MessagesDashboard;
