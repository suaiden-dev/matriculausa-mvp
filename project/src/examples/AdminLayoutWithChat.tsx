// Exemplo de como integrar o ChatSidebar no layout do admin
import React from 'react';
import { ChatSidebar } from '../components/Chat';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header do admin */}
      <header className="bg-white shadow-sm">
        {/* Conteúdo do header */}
      </header>
      
      {/* Conteúdo principal */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Chat sidebar - posicionado globalmente */}
      <ChatSidebar />
    </div>
  );
};

export default AdminLayout;