import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageCircle, Bot, Sparkles } from 'lucide-react';

interface EmbedChatProps {
  agentId?: string;
  agentName?: string;
  companyName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  onClose?: () => void;
  isEmbedded?: boolean;
}

const EmbedChat: React.FC<EmbedChatProps> = ({
  agentId,
  agentName = "AI Assistant",
  companyName = "Amatricula USA",
  primaryColor = "#3B82F6",
  secondaryColor = "#1E40AF",
  onClose,
  isEmbedded = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: `Hi! I'm ${agentName} from ${companyName}. How can I help you today?`,
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() && !isLoading) {
      const userMessage = {
        id: messages.length + 1,
        text: inputMessage,
        isBot: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);
      const currentMessage = inputMessage;
      setInputMessage('');
      setIsLoading(true);

      try {
        // Enviar mensagem para nossa API
        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: currentMessage,
            agentId,
            agentName,
            companyName,
            source: 'embed-chat'
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const botResponse = {
          id: messages.length + 2,
          text: data.response || "Thank you for your message! Our team will get back to you soon.",
          isBot: true,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, botResponse]);

      } catch (error) {
        console.error('Error sending message:', error);
        
        const errorResponse = {
          id: messages.length + 2,
          text: "Sorry, there was an error processing your message. Please try again in a moment.",
          isBot: true,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, errorResponse]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setIsOpen(false);
    }
  };

  // Se estiver embedado, renderizar apenas a interface do chat
  if (isEmbedded) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div 
          className="text-white p-6 rounded-t-3xl flex justify-between items-center relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
          }}
        >
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20">
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-xl">{agentName}</h3>
              <p className="text-white/90 text-sm font-medium">{companyName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
            title="Close chat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gradient-to-b from-gray-50 to-white">
          {messages.map((message, index) => (
            <div key={message.id} className="animate-fade-in">
              <div
                className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[280px] px-5 py-4 rounded-2xl shadow-sm ${
                    message.isBot
                      ? 'bg-white text-gray-800 border border-gray-100'
                      : 'text-white shadow-lg'
                  }`}
                  style={{
                    background: message.isBot 
                      ? 'white' 
                      : `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                  }}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-white text-gray-800 px-5 py-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div 
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ backgroundColor: primaryColor }}
                    ></div>
                    <div 
                      className="w-2 h-2 rounded-full animate-bounce" 
                      style={{ 
                        backgroundColor: primaryColor,
                        animationDelay: '0.1s' 
                      }}
                    ></div>
                    <div 
                      className="w-2 h-2 rounded-full animate-bounce" 
                      style={{ 
                        backgroundColor: primaryColor,
                        animationDelay: '0.2s' 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500">Typing...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-100 bg-white">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:border-transparent text-sm transition-all duration-200"
                style={{
                  '--tw-ring-color': primaryColor,
                  '--tw-ring-opacity': '0.5'
                } as React.CSSProperties}
                disabled={isLoading}
              />
              {isLoading && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="flex gap-1">
                    <div 
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ backgroundColor: primaryColor }}
                    ></div>
                    <div 
                      className="w-1.5 h-1.5 rounded-full animate-bounce" 
                      style={{ 
                        backgroundColor: primaryColor,
                        animationDelay: '0.1s' 
                      }}
                    ></div>
                    <div 
                      className="w-1.5 h-1.5 rounded-full animate-bounce" 
                      style={{ 
                        backgroundColor: primaryColor,
                        animationDelay: '0.2s' 
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="text-white p-4 rounded-2xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
              }}
              title="Send message"
            >
              <Send size={18} />
            </button>
          </div>

          {/* Footer */}
          <div className="text-center mt-4">
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
              <Sparkles size={12} style={{ color: primaryColor }} />
              Powered by <a href="#" className="font-medium" style={{ color: primaryColor }}>Amatricula USA</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Botão flutuante para abrir o chat
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 border-2 border-white relative overflow-hidden group"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
          }}
          title="Open chat"
        >
          <MessageCircle size={28} className="text-white" />
        </button>
      )}

      {isOpen && (
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-[400px] h-[600px] flex flex-col overflow-hidden">
          <EmbedChat 
            agentId={agentId}
            agentName={agentName}
            companyName={companyName}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            onClose={() => setIsOpen(false)}
            isEmbedded={true}
          />
        </div>
      )}
    </div>
  );
};

export default EmbedChat; 