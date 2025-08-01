import React, { useState, useRef, useEffect } from 'react';

interface Message {
  sender: 'You' | 'AI';
  content: string;
  timestamp: Date;
}

const SmartChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Webhook URL do n8n - IMPORTANTE: não modificar este ID
  const webhookUrl = "https://nwh.suaiden.com/webhook/21b3f55c-ae5f-4acd-b4d0-5a4ea7615d29";

  useEffect(() => {
    if (isOpen && !chatId) {
      setChatId('chat_' + Date.now() + '_' + Math.floor(Math.random() * 100000));
    }
  }, [isOpen, chatId]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const openChat = () => {
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

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
      appendMessage('AI', '<span style="color:#ff8181">Error sending message.</span>');
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

  return (
    <>
      {/* Smart Assistant Chat Bubble */}
      <div
        onClick={openChat}
        className="fixed w-16 h-16 rounded-full bg-gradient-to-br from-[#193156] via-[#193156] to-[#a41e22] text-[#f7f7f7] flex items-center justify-center cursor-pointer shadow-[0_0_0_2.5px_#f7f7f7,0_6px_20px_rgba(10,20,40,0.6)] z-[1000] font-['Montserrat',Arial,sans-serif] hover:scale-105 transition-transform duration-200 group relative"
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          width: '64px',
          height: '64px',
          zIndex: 10000,
          background: 'linear-gradient(135deg, #193156 60%, #a41e22 100%)',
          boxShadow: '0 0 0 2.5px #f7f7f7, 0 6px 20px rgba(10,20,40,0.6)'
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

      {/* WhatsApp Button */}
      <div
        className="fixed rounded-full bg-[#25D366] text-white flex items-center justify-center cursor-pointer shadow-[0_8px_32px_rgba(37,211,102,0.3)] z-[1000] font-['Montserrat',Arial,sans-serif] hover:scale-105 transition-all duration-200 border-[3px] border-white group relative"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '64px',
          height: '64px',
          zIndex: 9999,
          backgroundColor: '#25D366',
          boxShadow: '0 8px 32px rgba(37, 211, 102, 0.3)'
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

      {/* Chat Container */}
      {isOpen && (
        <div 
          className="fixed bottom-2.5 right-5 w-[400px] max-w-[90vw] bg-[#161d29] border-[1.5px] border-[#2e3f60] rounded-2xl shadow-[0_6px_24px_rgba(0,0,0,0.4)] z-[1000] font-['Montserrat',Arial,sans-serif] text-[13px] overflow-hidden"
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '20px',
            zIndex: 10000,
            opacity: 0.95
          }}
        >
          {/* Header */}
          <div 
            className="px-4 py-2.5 text-[#f7f7f7] font-semibold text-sm flex items-center justify-between"
            style={{
              background: 'linear-gradient(90deg, #193156 70%, #a41e22 100%)'
            }}
          >
            <span>
              Smart Assistant
            </span>
            <span 
              className="cursor-pointer text-lg hover:text-gray-300 transition-colors"
              onClick={closeChat}
            >
              ×
            </span>
          </div>

          {/* Messages */}
          <div 
            ref={chatRef}
            className="p-2.5 h-[500px] overflow-y-auto bg-[#222a3a] flex flex-col gap-2 smart-chat-messages"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#3c4d6d transparent',
              scrollBehavior: 'smooth'
            }}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[78%] p-2 px-3 rounded-2xl text-[13px] font-['Montserrat',Arial,sans-serif] shadow-[0_2px_8px_rgba(0,0,0,0.15)] break-words ${
                  message.sender === 'You' 
                    ? 'self-end bg-[#3a3a41] text-[#f7f7f7] border-[1.5px] border-[#2b2b33] rounded-[14px_14px_0_14px]' 
                    : 'self-start bg-[#3a3a41] text-[#f7f7f7] border-[1.5px] border-[#2b2b33] rounded-[14px_14px_14px_0]'
                }`}
                dangerouslySetInnerHTML={{
                  __html: `<b>${message.sender}:</b> ${message.content}`
                }}
              />
            ))}
            {isLoading && (
              <div className="self-start bg-[#3a3a41] text-[#f7f7f7] border-[1.5px] border-[#2b2b33] rounded-[14px_14px_14px_0] p-2 px-3 max-w-[78%] text-[13px]">
                <b>AI:</b> <span className="text-gray-400">Typing...</span>
              </div>
            )}
          </div>

          {/* Input Section */}
          <div className="flex gap-2 p-2.5 bg-[#192134]">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about scholarships, fees, or the application process..."
              disabled={isLoading}
              className="flex-1 px-3 py-1.5 border-[1.5px] border-[#2d3c56] rounded-full bg-[#151a23] text-[#f7f7f7] text-[13px] font-['Montserrat',Arial,sans-serif] focus:outline-none focus:border-[#3c4d6d] disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="p-1.5 px-3 bg-gradient-to-r from-[#a41e22] via-[#a41e22] to-[#32445e] text-white border-none rounded-full cursor-pointer font-semibold text-[15px] font-['Montserrat',Arial,sans-serif] shadow-[0_1px_5px_rgba(0,0,0,0.2)] w-10 h-10 flex items-center justify-center transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: 'linear-gradient(90deg, #a41e22 60%, #32445e 100%)'
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .smart-chat-messages::-webkit-scrollbar {
            width: 8px;
          }
          
          .smart-chat-messages::-webkit-scrollbar-track {
            background: transparent;
          }
          
          .smart-chat-messages::-webkit-scrollbar-thumb {
            background: #3c4d6d;
            border-radius: 4px;
          }
          
          .smart-chat-messages::-webkit-scrollbar-thumb:hover {
            background: #51678f;
          }
        `
      }} />
    </>
  );
};

export default SmartChat; 