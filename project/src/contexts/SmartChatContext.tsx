import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SmartChatContextType {
  isSmartChatOpen: boolean;
  openSmartChat: () => void;
  closeSmartChat: () => void;
  toggleSmartChat: () => void;
}

const SmartChatContext = createContext<SmartChatContextType | undefined>(undefined);

interface SmartChatProviderProps {
  children: ReactNode;
}

export const SmartChatProvider: React.FC<SmartChatProviderProps> = ({ children }) => {
  const [isSmartChatOpen, setIsSmartChatOpen] = useState(false);

  const openSmartChat = () => {
    setIsSmartChatOpen(true);
  };

  const closeSmartChat = () => {
    setIsSmartChatOpen(false);
  };

  const toggleSmartChat = () => {
    setIsSmartChatOpen(!isSmartChatOpen);
  };

  const value: SmartChatContextType = {
    isSmartChatOpen,
    openSmartChat,
    closeSmartChat,
    toggleSmartChat
  };

  return (
    <SmartChatContext.Provider value={value}>
      {children}
    </SmartChatContext.Provider>
  );
};

export const useSmartChat = (): SmartChatContextType => {
  const context = useContext(SmartChatContext);
  if (context === undefined) {
    throw new Error('useSmartChat must be used within a SmartChatProvider');
  }
  return context;
};
