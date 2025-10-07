// Exemplo de página de chat para estudantes
import React from 'react';
import { AdminStudentChat } from '../components/Chat';
import { useAuth } from '../hooks/useAuth';

const StudentChatPage: React.FC = () => {
  const { userProfile } = useAuth();
  
  // Para estudantes, podemos começar uma conversa com um admin específico
  // Aqui você precisará definir como determinar qual admin o estudante deve conversar
  const adminId = 'admin-user-id'; // Substituir pela lógica real

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Support Chat</h1>
        
        <AdminStudentChat 
          className="h-[calc(100vh-200px)]"
          defaultRecipientId={adminId}
          showInbox={false} // Estudantes não precisam ver inbox
        />
      </div>
    </div>
  );
};

export default StudentChatPage;