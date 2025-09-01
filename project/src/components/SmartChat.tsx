import React, { useState, useRef, useEffect } from 'react';

interface SmartChatProps {
  isStudentPage?: boolean;
}

interface Message {
  sender: 'You' | 'AI';
  content: string;
  timestamp: Date;
}

const SmartChat: React.FC<SmartChatProps> = ({isStudentPage = false}) => {
  const [isHelpExpanded, setIsHelpExpanded] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Webhook URL do n8n - IMPORTANTE: não modificar este ID
  const webhookUrl = "https://nwh.suaiden.com/webhook/21b3f55c-ae5f-4acd-b4d0-5a4ea7615d29";

  useEffect(() => {
    if (isChatOpen) {
      // Gerar ID único para o chat
      setChatId('chat_' + Date.now() + '_' + Math.floor(Math.random() * 100000));
      
      // Adicionar mensagem de boas-vindas
      setMessages([{
        sender: 'AI',
        content: 'Hello! I\'m your Smart Assistant. How can I help you today? I can answer questions about scholarships, fees, application process and much more.',
        timestamp: new Date()
      }]);

      // Focus no input após renderização
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [isChatOpen]);

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

  const openChat = () => {
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setMessages([]);
    setInputValue('');
    setIsLoading(false);
  };

  const toggleHelp = () => {
    setIsHelpExpanded(!isHelpExpanded);
  };

  return (
    <>
      {/* Botão de Ajuda - Dropdown para cima */}
      <div className="fixed flex items-center gap-3 z-[1000] font-['Montserrat',Arial,sans-serif]"
        style={{
          position: 'fixed',
          bottom: isStudentPage ? '100px' : '20px',
          right: '20px',
          zIndex: 10002,
        }}
      >
        {/* Botão de Ajuda */}
        <div
          onClick={toggleHelp}
          className={`w-16 h-16 rounded-full bg-[#193156] text-white flex items-center justify-center cursor-pointer shadow-[0_0_0_2.5px_#f7f7f7,0_6px_20px_rgba(25,49,86,0.4)] z-[1000] font-['Montserrat',Arial,sans-serif] transition-all duration-300 group relative hover:scale-105 ${
            isHelpExpanded ? 'rotate-180 scale-110' : ''
          }`}
          style={{
            width: '64px',
            height: '64px',
            background: '#193156',
            boxShadow: '0 0 0 2.5px #f7f7f7, 0 6px 20px rgba(25,49,86,0.4)'
          }}
          title={"Help & Support Options"}
        >
          {/* Ícone de Ajuda */}
          <svg 
            width="28" 
            height="28" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={`transition-transform duration-300 ${isHelpExpanded ? 'rotate-180' : ''}`}
          >
            {/* Círculo de fundo */}
            <circle cx="12" cy="12" r="12" fill="#193156" />
            
            {/* Borda branca */}
            <circle cx="12" cy="12" r="11" fill="none" stroke="white" strokeWidth="2" />
            
            {/* Interrogação branca */}
            <path 
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" 
              fill="white"
            />
          </svg>
        </div>
      </div>

      {/* Smart Assistant Chat Bubble - Com animação de dropdown */}
      <div
        onClick={openChat}
        className={`fixed w-16 h-16 rounded-full bg-gradient-to-br from-[#193156] via-[#193156] to-[#a41e22] text-[#f7f7f7] flex items-center justify-center cursor-pointer z-[1000] font-['Montserrat',Arial,sans-serif] transition-all duration-500 ease-out group relative hover:scale-105`}
        style={{
          position: 'fixed',
          bottom: isHelpExpanded 
            ? (isStudentPage ? '256px' : '200px') 
            : (isStudentPage ? '100px' : '20px'),
          right: '20px',
          width: '64px',
          height: '64px',
          zIndex: 10001,
          background: 'linear-gradient(135deg, #193156 60%, #a41e22 100%)',
          boxShadow: '0 0 0 2.5px #f7f7f7, 0 6px 20px rgba(10,20,40,0.6)',
          transform: `translateY(${isHelpExpanded ? '0px' : '0px'})`,
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        title="Smart Assistant - Ask me anything!"
      >
        {/* Tooltip */}
        <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-2 px-3 py-1 bg-[#161d29] text-[#f7f7f7] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-[#2e3f60] shadow-lg">
          Smart Assistant
          <div className="absolute top-1/2 left-full transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-[#161d29]"></div>
        </div>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill="currentColor"/>
          <path d="M7 9H17V11H7V9ZM7 12H13V14H7V12Z" fill="currentColor"/>
          <circle cx="9" cy="9" r="1" fill="currentColor"/>
          <circle cx="15" cy="9" r="1" fill="currentColor"/>
        </svg>
      </div>

      {/* WhatsApp Button - Com animação de dropdown */}
      <div
        className="fixed rounded-full bg-[#25D366] text-white flex items-center justify-center cursor-pointer shadow-[0_0_0_0,0_6px_20px_rgba(10,20,40,0.6)] z-[1000] font-['Montserrat',Arial,sans-serif] hover:scale-105 transition-all duration-500 ease-out border-[3px] border-white group relative"
        style={{
          position: 'fixed',
          bottom: isHelpExpanded 
            ? (isStudentPage ? '180px' : '120px') 
            : (isStudentPage ? '100px' : '20px'),
          right: '20px',
          width: '64px',
          height: '64px',
          zIndex: 10000,
          backgroundColor: '#25D366',
          boxShadow: '0 0 0 0, 0 6px 20px rgba(10,20,40,0.6)',
          transform: `translateY(${isHelpExpanded ? '0px' : '0px'})`,
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        title="Contact us via WhatsApp"
      >
        {/* Tooltip */}
        <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-2 px-3 py-1 bg-[#161d29] text-[#f7f7f7] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-[#2e3f60] shadow-lg">
          WhatsApp
          <div className="absolute top-1/2 left-full transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-[#161d29]"></div>
        </div>
        <a
          href="https://wa.me/12136762544"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-full flex items-center justify-center"
          aria-label="Contact us via WhatsApp"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="30" height="30" fill="white">
            <path d="M16.001 3.2c-7.11 0-12.8 5.689-12.8 12.8 0 2.226.584 4.344 1.696 6.24L3.2 28.8l6.832-1.744c1.824.96 3.872 1.472 5.969 1.472 7.11 0 12.8-5.689 12.8-12.8s-5.69-12.8-12.8-12.8zm0 23.2c-1.761 0-3.481-.455-5.024-1.328l-.36-.2-4.063 1.04 1.072-3.952-.208-.376c-1.016-1.808-1.552-3.856-1.552-5.936 0-6.065 4.935-11 11-11s11 4.935 11 11-4.936 11-11 11zm6.225-8.145c-.339-.17-2.004-.988-2.316-1.104-.311-.113-.536-.17-.76.17-.226.339-.87 1.104-1.068 1.33-.197.226-.394.254-.733.085s-1.429-.526-2.723-1.678c-1.006-.896-1.684-2.003-1.881-2.343-.197-.34-.021-.522.149-.691.154-.152.339-.395.509-.593.17-.198.226-.34.339-.566.113-.226.057-.425-.028-.593-.084-.17-.76-1.833-1.04-2.512-.273-.654-.55-.566-.76-.577l-.648-.011c-.226 0-.593.085-.903.425s-1.184 1.155-1.184 2.82 1.211 3.267 1.379 3.494c.17.226 2.379 3.632 5.767 5.088.807.348 1.438.557 1.929.713.81.258 1.548.221 2.131.134.65-.097 2.004-.818 2.288-1.608.283-.79.283-1.47.198-1.609-.085-.14-.311-.226-.65-.396z"/>
          </svg>
        </a>
      </div>

      {/* Modal do Smart Assistant */}
      {isChatOpen && (
        <div className="fixed inset-0 z-[10003] flex items-end justify-end p-4 pb-24">
          {/* Overlay de fundo */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={closeChat}
          />
          
          {/* Modal do Chat */}
          <div className="relative w-full max-w-md h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-slide-in-up">
            {/* Header do Modal */}
            <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#05294E] flex items-center justify-center shadow-lg">
                  <svg width="24" height="24" className="text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill="currentColor"/>
                    <path d="M7 9H17V11H7V9ZM7 12H13V14H7V12Z" fill="currentColor"/>
                    <circle cx="9" cy="9" r="1" fill="currentColor"/>
                    <circle cx="15" cy="9" r="1" fill="currentColor"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Smart Assistant</h3>
                  <p className="text-xs text-gray-500">Your intelligent companion</p>
                </div>
              </div>
              
              {/* Botão de fechar */}
              <button
                onClick={closeChat}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-200"
                title="Close chat"
              >
                <svg width="20" height="20" className="text-gray-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Área de Mensagens */}
            <div 
              ref={chatRef}
              className="flex-1 overflow-y-auto p-4 bg-gradient-to-br from-gray-50 to-white flex flex-col gap-3"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#e5e7eb transparent'
              }}
            >
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`max-w-[85%] transform transition-all duration-500 ease-out ${
                    message.sender === 'You' 
                      ? 'self-end ml-auto animate-slide-in-right' 
                      : 'self-start animate-slide-in-left'
                  }`}
                  style={{
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <div className={`p-3 rounded-2xl shadow-lg border ${
                    message.sender === 'You' 
                      ? 'bg-[#05294E] text-white shadow-[#05294E]/20' 
                      : 'bg-white text-gray-800 border-gray-200 shadow-gray-100'
                  } transition-all duration-300 hover:shadow-xl`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        message.sender === 'You' 
                          ? 'bg-white/20 text-white' 
                          : 'bg-[#05294E] text-white'
                      }`}>
                        {message.sender === 'You' ? 'Y' : 'AI'}
                      </div>
                      <span className="font-semibold text-xs truncate flex-1">
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
                      className="text-xs leading-relaxed break-words"
                      dangerouslySetInnerHTML={{ __html: message.content }}
                    />
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="self-start bg-white text-gray-800 border border-gray-200 rounded-2xl p-3 max-w-[85%] shadow-lg animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-[#05294E] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      AI
                    </div>
                    <span className="font-semibold text-xs flex-1">Smart Assistant</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-[#05294E] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-[#05294E] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="font-medium">Typing...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Área de Input */}
            <div className="bg-white border-t border-gray-100 p-4">
              <div className="flex gap-3">
                <div className="flex-1 relative group">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything..."
                    disabled={isLoading}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-800 text-sm focus:outline-none focus:border-[#05294E] focus:bg-white transition-all duration-300 disabled:opacity-50 group-hover:border-gray-300 group-hover:bg-white"
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  className="px-6 py-3 bg-[#05294E] text-white border-none rounded-xl cursor-pointer font-semibold text-sm shadow-lg transition-all duration-300 hover:bg-[#041f3f] hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg flex items-center justify-center gap-2"
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
      )}

      {/* Estilos CSS para animações */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slide-in-up {
            from {
              opacity: 0;
              transform: translateY(100%);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
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

          .animate-slide-in-up {
            animation: slide-in-up 0.3s ease-out forwards;
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
        `
      }} />
    </>
  );
};

export default SmartChat; 