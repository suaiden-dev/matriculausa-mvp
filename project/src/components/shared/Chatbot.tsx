import React, { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-80 md:w-96 bg-card rounded-3xl shadow-2xl border border-border overflow-hidden animate-fade-up">
          <div className="bg-primary p-6 text-primary-foreground flex justify-between items-center">
            <div>
              <h3 className="font-bold">Matrícula USA Assistant</h3>
              <p className="text-xs opacity-80">Online agora</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:opacity-70">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="h-64 p-6 bg-muted overflow-y-auto flex flex-col gap-4">
            <div className="bg-card p-3 rounded-2xl rounded-tl-none border border-border text-sm shadow-sm max-w-[85%] text-foreground">
              Olá! Como posso te ajudar com seu processo de visto hoje?
            </div>
          </div>

          <div className="p-4 bg-card border-t border-border flex gap-2">
            <input 
              type="text" 
              placeholder="Digite sua mensagem..." 
              className="flex-1 px-4 py-2 border border-input bg-background rounded-xl focus:outline-none text-sm text-foreground"
            />
            <button className="bg-primary text-primary-foreground p-2 rounded-xl transition-transform hover:scale-110 active:scale-95">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 gradient-coral-gold hover:opacity-90 text-primary-foreground rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 group"
      >
        {isOpen ? <X className="w-8 h-8" /> : (
          <>
            <MessageCircle className="w-8 h-8 group-hover:hidden" />
            <div className="hidden group-hover:flex items-center gap-2">
              <span className="text-xs font-bold whitespace-nowrap px-2">Chat</span>
            </div>
          </>
        )}
      </button>
    </div>
  );
};

export default Chatbot;
