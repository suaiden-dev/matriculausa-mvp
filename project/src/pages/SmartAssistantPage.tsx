import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Message {
  sender: 'You' | 'AI';
  content: string;
  timestamp: Date;
}

const SmartAssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Webhook URL do n8n - IMPORTANTE: não modificar este ID
  const webhookUrl = "https://nwh.suaiden.com/webhook/21b3f55c-ae5f-4acd-b4d0-5a4ea7615d29";

  useEffect(() => {
    // Gerar ID único para o chat
    setChatId('chat_' + Date.now() + '_' + Math.floor(Math.random() * 100000));
    
    // Adicionar mensagem de boas-vindas
    setMessages([{
      sender: 'AI',
      content: 'Hello! I\'m your Smart Assistant. How can I help you today? I can answer questions about scholarships, fees, application process and much more.',
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const appendMessage = (sender: 'You' | 'AI', content: string) => {
    const newMessage: Message = {
      sender,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    setIsLoading(true);
    appendMessage('You', text);
    setInputValue('');

    try {
      const payload = { chatId, message: text };
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = { response: '(Invalid server response)' };
      }

      const formattedResponse = (data.response || '(no response)').replace(/\n/g, '<br>');
      appendMessage('AI', formattedResponse);
    } catch (err) {
      appendMessage('AI', '<span style="color:#ff8181">Error sending message. Please try again.</span>');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const goBack = () => {
    // Verificar se há uma página anterior no histórico
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Se não houver histórico, ir para a página inicial
      navigate('/');
    }
  };

  return (
    <div className="min-h-dvh bg-[#fafbfc] font-['Inter',system-ui,sans-serif] antialiased flex flex-col">
      {/* Header Premium - Responsivo */}
      <div className="bg-white border-b border-gray-100 shadow-sm backdrop-blur-sm bg-white/95 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-5">
          <div className="flex items-center justify-between">
            {/* Left side - Back button and title */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={goBack}
                className="group p-2 sm:p-3 hover:bg-gray-50 rounded-xl transition-all duration-300 hover:shadow-md flex-shrink-0"
                title="Go Back"
              >
                <svg width="20" height="20" className="text-gray-600 group-hover:text-[#05294E] transition-colors duration-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#05294E] flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg width="24" height="24" className="text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill="currentColor"/>
                    <path d="M7 9H17V11H7V9ZM7 12H13V14H7V12Z" fill="currentColor"/>
                    <circle cx="9" cy="9" r="1" fill="currentColor"/>
                    <circle cx="15" cy="9" r="1" fill="currentColor"/>
                  </svg>
                </div>
                
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 tracking-tight truncate">Smart Assistant</h1>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">Your intelligent companion for scholarships</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container Premium - Responsivo */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 flex-1 flex flex-col min-h-0">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-gray-100 transform transition-all duration-500 hover:shadow-3xl flex-1 flex flex-col">
          {/* Messages Area - Responsivo */}
          <div 
            ref={chatRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-gradient-to-br from-gray-50 to-white flex flex-col gap-3 sm:gap-4 md:gap-6"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#e5e7eb transparent'
            }}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[90%] sm:max-w-[85%] transform transition-all duration-500 ease-out ${
                  message.sender === 'You' 
                    ? 'self-end ml-auto animate-slide-in-right' 
                    : 'self-start animate-slide-in-left'
                }`}
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <div className={`p-3 sm:p-4 md:p-6 rounded-2xl sm:rounded-3xl shadow-lg border ${
                  message.sender === 'You' 
                    ? 'bg-[#05294E] text-white shadow-[#05294E]/20' 
                    : 'bg-white text-gray-800 border-gray-200 shadow-gray-100'
                } transition-all duration-300 hover:shadow-xl`}>
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                    <div className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 ${
                      message.sender === 'You' 
                        ? 'bg-white/20 text-white' 
                        : 'bg-[#05294E] text-white'
                    }`}>
                      {message.sender === 'You' ? 'Y' : 'AI'}
                    </div>
                    <span className="font-semibold text-xs sm:text-sm truncate flex-1">
                      {message.sender === 'You' ? 'You' : 'Smart Assistant'}
                    </span>
                    <span className="text-xs opacity-70 flex-shrink-0">
                      {message.timestamp.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <div 
                    className="text-xs sm:text-sm leading-relaxed break-words"
                    dangerouslySetInnerHTML={{ __html: message.content }}
                  />
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="self-start bg-white text-gray-800 border border-gray-200 rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6 max-w-[90%] sm:max-w-[85%] shadow-lg animate-fade-in">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-[#05294E] flex items-center justify-center text-xs sm:text-sm font-bold text-white flex-shrink-0">
                    AI
                  </div>
                  <span className="font-semibold text-xs sm:text-sm flex-1">Smart Assistant</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                  <div className="flex gap-1 sm:gap-2">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-[#05294E] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-[#05294E] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-[#05294E] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="font-medium">Typing...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Section Premium - Responsivo */}
          <div className="bg-white border-t border-gray-100 p-3 sm:p-4 md:p-8">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative group">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about scholarships, fees, or application process..."
                  disabled={isLoading}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 border-2 border-gray-200 rounded-xl sm:rounded-2xl bg-gray-50 text-gray-800 text-sm sm:text-base focus:outline-none focus:border-[#05294E] focus:bg-white transition-all duration-300 disabled:opacity-50 group-hover:border-gray-300 group-hover:bg-white"
                />
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-[#05294E] text-white border-none rounded-xl sm:rounded-2xl cursor-pointer font-semibold text-sm sm:text-base shadow-lg transition-all duration-300 hover:bg-[#041f3f] hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg flex items-center justify-center gap-2 sm:gap-3 group"
              >
                <span>Send</span>
                <svg width="18" height="18" className="group-hover:translate-x-1 transition-transform duration-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            
          </div>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* DVH Support with fallbacks */
          .min-h-dvh {
            min-height: 100vh; /* Fallback for older browsers */
            min-height: 100dvh; /* Dynamic viewport height for modern browsers */
          }

          /* Ensure proper mobile viewport handling */
          @supports (height: 100dvh) {
            .min-h-dvh {
              min-height: 100dvh;
            }
          }

          /* Mobile-specific viewport adjustments */
          @media (max-width: 768px) {
            .min-h-dvh {
              min-height: 100vh;
              min-height: 100dvh;
            }
            
            /* Prevent address bar issues on mobile */
            @supports (height: 100dvh) {
              .min-h-dvh {
                min-height: 100dvh;
              }
            }
          }

          .smart-chat-messages::-webkit-scrollbar {
            width: 6px;
          }
          
          .smart-chat-messages::-webkit-scrollbar-track {
            background: transparent;
          }
          
          .smart-chat-messages::-webkit-scrollbar-thumb {
            background: #e5e7eb;
            border-radius: 3px;
            transition: background 0.3s ease;
          }
          
          .smart-chat-messages::-webkit-scrollbar-thumb:hover {
            background: #d1d5db;
          }

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

          .shadow-3xl {
            box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
          }

          /* Mobile-specific optimizations */
          @media (max-width: 640px) {
            .smart-chat-messages::-webkit-scrollbar {
              width: 4px;
            }
            
            /* Additional mobile viewport fixes */
            .min-h-dvh {
              min-height: 100vh;
              min-height: 100dvh;
            }
          }

          /* iOS Safari specific fixes */
          @supports (-webkit-touch-callout: none) {
            .min-h-dvh {
              min-height: -webkit-fill-available;
            }
          }
        `
      }} />
    </div>
  );
};

export default SmartAssistantPage;
