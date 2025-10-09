import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface UnreadMessagesContextType {
  unreadCount: number;
  updateUnreadCount: (newCount: number) => void;
  decrementUnreadCount: () => void;
  resetUnreadCount: () => void;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextType | undefined>(undefined);

interface UnreadMessagesProviderProps {
  children: ReactNode;
  initialCount?: number;
}

export const UnreadMessagesProvider: React.FC<UnreadMessagesProviderProps> = ({ 
  children, 
  initialCount = 0 
}) => {
  const [unreadCount, setUnreadCount] = useState(initialCount);

  const updateUnreadCount = useCallback((newCount: number) => {
    setUnreadCount(Math.max(0, newCount));
  }, []);

  const decrementUnreadCount = useCallback(() => {
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return (
    <UnreadMessagesContext.Provider 
      value={{ 
        unreadCount, 
        updateUnreadCount, 
        decrementUnreadCount, 
        resetUnreadCount 
      }}
    >
      {children}
    </UnreadMessagesContext.Provider>
  );
};

export const useUnreadMessages = (): UnreadMessagesContextType => {
  const context = useContext(UnreadMessagesContext);
  if (context === undefined) {
    throw new Error('useUnreadMessages must be used within an UnreadMessagesProvider');
  }
  return context;
};
