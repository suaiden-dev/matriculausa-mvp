// Exemplo de página dedicada de chat no admin dashboard
import React from 'react';
import { AdminStudentChat } from '../components/Chat';

const AdminChatPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Student Messages</h1>
        
        <AdminStudentChat 
          className="h-[calc(100vh-200px)]"
          showInbox={true}
        />
      </div>
    </div>
  );
};

export default AdminChatPage;