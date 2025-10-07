import React from 'react';
import AdminStudentChatPage from '../../components/Chat/AdminStudentChatPage';

interface AdminChatPageProps {
  defaultConversationId?: string;
}

const AdminChatPage: React.FC<AdminChatPageProps> = ({ defaultConversationId }) => {
  return (
    <div className="py-4">
      <AdminStudentChatPage 
        className="h-[calc(100vh-200px)]"
        showInbox={true}
        defaultConversationId={defaultConversationId}
      />
    </div>
  );
};

export default AdminChatPage;