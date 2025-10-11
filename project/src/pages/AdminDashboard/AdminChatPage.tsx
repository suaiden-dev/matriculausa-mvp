import React from 'react';
import AdminStudentChatPage from '../../components/Chat/AdminStudentChatPage';

interface AdminChatPageProps {
  defaultConversationId?: string;
  defaultRecipientId?: string;
}

const AdminChatPage: React.FC<AdminChatPageProps> = ({ defaultConversationId, defaultRecipientId }) => {
  return (
    <div className="py-4">
      <AdminStudentChatPage 
        className="h-[calc(100vh-200px)]"
        showInbox={true}
        defaultConversationId={defaultConversationId}
        defaultRecipientId={defaultRecipientId}
      />
    </div>
  );
};

export default AdminChatPage;