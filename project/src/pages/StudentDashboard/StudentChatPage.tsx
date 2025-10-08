import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import AdminStudentChatPage from '../../components/Chat/AdminStudentChatPage';

const StudentChatPage: React.FC = () => {
  const { userProfile } = useAuth();
  
  // For students, we need to determine which admin they should chat with
  // This could be based on their assigned admin, or a default support admin
  // For now, we'll let the hook handle conversation creation
  
  return (
    <div className="h-[calc(100dvh-90px)] pt-4 bg-[#fafbfc] font-['Inter',system-ui,sans-serif] antialiased flex flex-col">
      <AdminStudentChatPage 
        showInbox={false} // Students don't need to see an inbox, just their conversation
        className="flex-1 flex flex-col min-h-0"
      />
    </div>
  );
};

export default StudentChatPage;