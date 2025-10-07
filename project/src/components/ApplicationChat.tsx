import React, { useRef, useState, useEffect } from 'react';
import ImagePreviewModal from './ImagePreviewModal';

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  message: string;
  sentAt: string;
  isOwn: boolean;
  status?: 'pending' | 'sent' | 'error';
  readAt?: string | null;
  editedAt?: string | null;
  isDeleted?: boolean;
  attachments?: { 
    file_url: string; 
    file_name?: string; 
    uploaded_at?: string;
    isUploading?: boolean;
  }[];
}

interface ApplicationChatProps {
  messages: ChatMessage[];
  onSend: (text: string, file?: File) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  loading?: boolean;
  isSending?: boolean;
  error?: string | null;
  currentUserId: string;
  messageContainerClassName?: string;
  onMarkAllAsRead?: () => void;
  otherPartyLabel?: string; // Label for the other party (e.g., "University Staff", "Student", "Admin")
}

interface I20ControlFeeCardProps {
  hasPaid: boolean;
  dueDate: string | null;
  onPay: () => void;
  isExpired: boolean;
  isLoading: boolean;
  paymentDate?: string | null;
}

const I20ControlFeeCard: React.FC<I20ControlFeeCardProps> = ({ hasPaid, dueDate, onPay, isExpired, isLoading, paymentDate }) => {
  const [now, setNow] = React.useState<Date>(new Date());
  React.useEffect(() => {
    if (!dueDate || hasPaid) return;
    const interval = setInterval(() => setNow(new Date()), 1000 * 60);
    return () => clearInterval(interval);
  }, [dueDate, hasPaid]);

  let content = null;
  let badge = null;
  let cardColor = 'border-red-200';
  let titleColor = 'text-red-700';
  let buttonColor = 'bg-red-500 hover:bg-red-600';
  let badgeColor = 'bg-red-100 text-red-700';

  if (hasPaid) {
    badge = <span className="mt-2 inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Paid</span>;
    cardColor = 'border-green-200';
    titleColor = 'text-green-700';
    buttonColor = 'bg-green-500 hover:bg-green-600';
    badgeColor = 'bg-green-100 text-green-700';
    content = (
      <>
        <span className={`font-semibold text-lg ${titleColor}`}>I-20 Control Fee Paid</span>
        {paymentDate && <span className="text-xs text-gray-500 mt-1">Paid on {new Date(paymentDate).toLocaleDateString()}</span>}
        {badge}
      </>
    );
  } else if (isExpired) {
    badge = <span className="mt-2 inline-block bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Expired</span>;
    content = (
      <>
        <span className="font-semibold text-lg text-red-700">I-20 Control Fee Expired</span>
        {badge}
      </>
    );
  } else {
    let timeLeft = '';
    if (dueDate) {
      const due = new Date(dueDate);
      const diff = due.getTime() - now.getTime();
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        timeLeft = `${days}d ${hours}h left`;
      }
    }
    badge = <span className={`mt-2 inline-block ${badgeColor} px-3 py-1 rounded-full text-xs font-bold`}>Pending</span>;
    content = (
      <>
        <span className={`font-semibold text-lg ${titleColor}`}>I-20 Control Fee Pending</span>
        {dueDate && <span className="text-xs text-gray-500 mt-1">Due: {new Date(dueDate).toLocaleDateString()} {timeLeft && `(${timeLeft})`}</span>}
        <button
          className={`mt-3 ${buttonColor} text-white px-5 py-2 rounded-full text-base font-bold disabled:opacity-60 transition`}
          onClick={onPay}
          disabled={isLoading}
        >
          {isLoading ? 'Redirecting...' : 'Pay I-20 Control Fee'}
        </button>
        {badge}
      </>
    );
  }
  return (
    <div className={`w-full max-w-md mx-auto mb-8 p-6 bg-white ${cardColor} border-2 rounded-2xl shadow flex flex-col items-center justify-center`}>
      {content}
    </div>
  );
};

const ApplicationChat: React.FC<ApplicationChatProps & {
  i20ControlFee?: {
    hasPaid: boolean;
    dueDate: string | null;
    isExpired: boolean;
    isLoading: boolean;
    onPay: () => void;
    paymentDate?: string | null;
  }
}> = ({
  messages,
  onSend,
  onEditMessage,
  onDeleteMessage,
  loading = false,
  isSending = false,
  error = null,
  currentUserId: _currentUserId,
  i20ControlFee,
  messageContainerClassName,
  onMarkAllAsRead: _onMarkAllAsRead,
  otherPartyLabel = 'University Staff', // Default para manter compatibilidade
}) => {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll inteligente: só rola se o usuário já estiver perto do final
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
    if (isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length]);

  // Auto-scroll to bottom when entering conversation or messages change
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // Scroll to bottom with multiple attempts to ensure it works
    const scrollToBottom = () => {
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    };
    
    // Immediate scroll
    scrollToBottom();
    
    // Multiple delayed scrolls to handle different rendering scenarios
    const timeout1 = setTimeout(scrollToBottom, 50);
    const timeout2 = setTimeout(scrollToBottom, 150);
    const timeout3 = setTimeout(scrollToBottom, 300);
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [messages.length]); // Trigger whenever messages change

  // Force scroll to bottom when component mounts (chat opens)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // Force scroll to bottom when chat opens
    const forceScrollToBottom = () => {
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    };
    
    // Multiple attempts to ensure scroll works
    forceScrollToBottom();
    const timeout1 = setTimeout(forceScrollToBottom, 100);
    const timeout2 = setTimeout(forceScrollToBottom, 300);
    const timeout3 = setTimeout(forceScrollToBottom, 500);
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, []); // Run only on mount

  // Focus no input quando o chat é aberto
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() || file) {
      onSend(text.trim(), file || undefined);
      setText('');
      setFile(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend(e);
    }
  };

  const isImage = (fileName?: string) => {
    if (!fileName) return false;
    const extension = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '');
  };

  const handleEditMessage = (messageId: string, currentText: string) => {
    setEditingMessageId(messageId);
    setEditingText(currentText);
  };

  const handleSaveEdit = (messageId: string) => {
    if (onEditMessage && editingText.trim()) {
      onEditMessage(messageId, editingText.trim());
    }
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleDeleteMessage = (messageId: string) => {
    setShowDeleteConfirm(messageId);
  };

  const confirmDeleteMessage = (messageId: string) => {
    if (onDeleteMessage) {
      onDeleteMessage(messageId);
    }
    setShowDeleteConfirm(null);
  };

  const cancelDeleteMessage = () => {
    setShowDeleteConfirm(null);
  };

  // Count unread messages (removed unused variable)

  return (
    <>
      {i20ControlFee && (
        <I20ControlFeeCard
          hasPaid={i20ControlFee.hasPaid}
          dueDate={i20ControlFee.dueDate}
          isExpired={i20ControlFee.isExpired}
          isLoading={i20ControlFee.isLoading}
          onPay={i20ControlFee.onPay}
          paymentDate={i20ControlFee.paymentDate}
        />
      )}
      
      {/* Área de Mensagens */}
      <div 
        ref={messagesContainerRef}
        className={`flex-1 overflow-y-auto p-4 bg-gradient-to-br from-gray-50 to-white flex flex-col gap-3 ${messageContainerClassName || ''}`}
        style={{ 
          minHeight: '400px', 
          maxHeight: '75vh',
          scrollbarWidth: 'thin',
          scrollbarColor: '#e5e7eb transparent'
        }}
      >
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-8 flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs text-gray-500">Start a conversation</p>
            </div>
          )}
          
          {messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`max-w-[85%] transform transition-all duration-500 ease-out group ${
                msg.isOwn 
                  ? 'self-end ml-auto animate-slide-in-right' 
                  : 'self-start animate-slide-in-left'
              }`}
              style={{
                animationDelay: `${index * 0.1}s`
              }}
            >
              <div className={`p-3 rounded-2xl shadow-lg border relative ${
                msg.isOwn 
                  ? 'bg-[#05294E] text-white shadow-[#05294E]/20' 
                  : 'bg-white text-gray-800 border-gray-200 shadow-gray-100'
              } transition-all duration-300 hover:shadow-xl`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    msg.isOwn 
                      ? 'bg-white/20 text-white' 
                      : 'bg-[#05294E] text-white'
                  }`}>
                    {msg.isOwn ? 'Y' : 'U'}
                  </div>
                  <span className="font-semibold text-xs truncate flex-1">
                    {msg.isOwn ? 'You' : otherPartyLabel}
                  </span>
                  <div className="flex items-center gap-2">
                    {msg.editedAt && (
                      <span className="text-xs opacity-60 italic">
                        (edited)
                      </span>
                    )}
                    <span className="text-xs opacity-70 flex-shrink-0">
                      {new Date(msg.sentAt).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>

                
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-2">
                    {msg.attachments.map((att, i) => {
                      // Verificar se o arquivo está sendo enviado
                      const isUploading = msg.status === 'pending' || 
                                        att.file_url.startsWith('blob:') || 
                                        att.file_url.includes('temp_') ||
                                        !att.file_url || 
                                        att.file_url === '';
                      
                      
                      return (
                        <div key={att.file_url + i}>
                          {isUploading ? (
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-100 animate-pulse">
                              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                              <div className="flex-1">
                                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                                <div className="text-xs text-gray-500 mt-1">Uploading...</div>
                              </div>
                            </div>
                          ) : isImage(att.file_name) ? (
                            <button onClick={() => setSelectedImage(att.file_url)} className="cursor-pointer">
                              <img
                                src={att.file_url}
                                alt={att.file_name || 'Attached image'}
                                className="max-w-xs max-h-48 rounded-md object-cover"
                              />
                            </button>
                          ) : (
                            <a
                              href={att.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                              <DocumentIcon />
                              <span className="text-sm text-gray-800 break-all">
                                {att.file_name || 'Attachment'}
                              </span>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Message content - with edit functionality */}
                {editingMessageId === msg.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className={`w-full p-2 rounded border resize-none text-sm ${
                        msg.isOwn 
                          ? 'bg-white/10 border-white/20 text-white placeholder-white/60' 
                          : 'bg-gray-50 border-gray-200 text-gray-800'
                      }`}
                      rows={3}
                      placeholder="Edit your message..."
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleSaveEdit(msg.id)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          msg.isOwn 
                            ? 'bg-white/20 hover:bg-white/30 text-white' 
                            : 'bg-[#05294E] hover:bg-[#05294E]/90 text-white'
                        }`}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          msg.isOwn 
                            ? 'bg-white/10 hover:bg-white/20 text-white/70' 
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed break-words whitespace-pre-line">
                    {msg.isDeleted ? (
                      <span className="italic opacity-60">{msg.message}</span>
                    ) : (
                      msg.message
                    )}
                  </div>
                )}
                

                {/* Status indicators */}
                {msg.isOwn && (
                  <div className="flex items-center justify-end gap-1 mt-2">
                    {msg.status === 'pending' && <ClockIcon />}
                    {msg.status === 'error' && <ErrorIcon />}
                    {msg.status === 'sent' && !msg.readAt && <SentIcon />}
                    {msg.status === 'sent' && msg.readAt && <ReadIcon />}
                  </div>
                )}
              </div>
              
              {/* Message Actions (Edit/Delete) - floating buttons below message */}
              {msg.isOwn && !msg.isDeleted && (onEditMessage || onDeleteMessage) && (
                <div className="flex gap-1 mt-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {onEditMessage && (
                    <button
                      onClick={() => handleEditMessage(msg.id, msg.message)}
                      className={`p-1.5 rounded-md transition-colors ${
                        msg.isOwn 
                          ? 'hover:bg-gray-100 text-gray-500 hover:text-gray-700' 
                          : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                      }`}
                      title="Edit message"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  {onDeleteMessage && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className={`p-1.5 rounded-md transition-colors ${
                        msg.isOwn 
                          ? 'hover:bg-red-50 text-gray-500 hover:text-red-600' 
                          : 'hover:bg-red-50 text-gray-500 hover:text-red-600'
                      }`}
                      title="Delete message"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          
          
          <div ref={messagesEndRef} />
      </div>

      {/* Área de Input */}
      <div className="bg-white border-t border-gray-100 p-4">
          {file && (
            <div className="mb-3 px-3 py-2 text-xs text-gray-600 bg-gray-100 rounded-lg flex items-center gap-2">
              <span>Attachment: {file.name}</span>
              <button
                type="button"
                className="text-red-500 hover:underline ml-2"
                onClick={() => setFile(null)}
              >
                Remove
              </button>
            </div>
          )}
          
          <form onSubmit={handleSend} className="flex gap-3">
            <div className="flex-1 relative group">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={loading || isSending}
                maxLength={1000}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-800 text-sm focus:outline-none focus:border-[#05294E] focus:bg-white transition-all duration-300 disabled:opacity-50 group-hover:border-gray-300 group-hover:bg-white"
              />
            </div>
            
            <label className="flex items-center cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept="*"
              />
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl hover:bg-gray-100 transition-colors">
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a4 4 0 10-5.656-5.656l-6.586 6.586a6 6 0 108.485 8.485l6.586-6.586" />
                </svg>
              </span>
            </label>
            
            <button
              type="submit"
              disabled={loading || isSending || (!text.trim() && !file)}
              className="px-6 py-3 bg-[#05294E] text-white border-none rounded-xl cursor-pointer font-semibold text-sm shadow-lg transition-all duration-300 hover:bg-[#041f3f] hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg flex items-center justify-center gap-2"
            >
              <span className="hidden sm:block">Send</span>
              <svg width="18" height="18" className="group-hover:translate-x-1 transition-transform duration-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>
          
          {error && (
            <div className="mt-3 px-3 py-2 text-xs text-red-600 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          )}
      </div>

      {selectedImage && (
        <ImagePreviewModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      )}

      {/* Estilos CSS para animações */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slide-in-right {
            from {
              opacity: 0;
              transform: translateX(30px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes slide-in-left {
            from {
              opacity: 0;
              transform: translateX(-30px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-slide-in-right {
            animation: slide-in-right 0.5s ease-out forwards;
          }

          .animate-slide-in-left {
            animation: slide-in-left 0.5s ease-out forwards;
          }

          .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
          }

          /* Melhorias específicas para iOS */
          @supports (-webkit-touch-callout: none) {
            .overflow-y-auto {
              -webkit-overflow-scrolling: touch;
            }
          }
        `
      }} />

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Message</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDeleteMessage}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDeleteMessage(showDeleteConfirm)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const DocumentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ErrorIcon = () => (
  <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const SentIcon = () => (
  <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ReadIcon = () => (
  <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default ApplicationChat;