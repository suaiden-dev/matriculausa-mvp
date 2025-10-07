import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import AdminStudentChatPage from '../../components/Chat/AdminStudentChatPage';

const StudentChatPage: React.FC = () => {
  const { userProfile } = useAuth();
  
  // For students, we need to determine which admin they should chat with
  // This could be based on their assigned admin, or a default support admin
  // For now, we'll let the hook handle conversation creation
  
  return (
    <div className="py-6">
      {/* <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support Chat</h1>
        <p className="text-gray-600">Get help from our support team</p>
      </div> */}
      
      <AdminStudentChatPage 
        showInbox={false} // Students don't need to see an inbox, just their conversation
      />
    </div>
  );
};

export default StudentChatPage;