import React from 'react';
import AdminStudentChatPage from '../../components/Chat/AdminStudentChatPage';

const AdminChatPage: React.FC = () => {
  return (
    <div className="py-4">
      <AdminStudentChatPage 
        className="h-[calc(100vh-200px)]"
        showInbox={true}
      />
    </div>
  );
};

export default AdminChatPage;