import React from 'react';
import { useParams } from 'react-router-dom';
import ApplicationChat from '../../components/ApplicationChat';
import { useApplicationChat } from '../../hooks/useApplicationChat';
import { useAuth } from '../../hooks/useAuth';

const ApplicationChatPage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { user } = useAuth();
  const { messages, sendMessage, loading, isSending, error } = useApplicationChat(applicationId);

  // This check prevents rendering with an invalid state that can cause hook order issues.
  if (!user) {
    return <div className="text-center text-gray-500 py-10">Authenticating...</div>;
  }

  return (
    <div className="p-4 md:p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          Application Chat
        </h2>
        
        <ApplicationChat
          messages={messages}
          onSend={sendMessage}
          loading={loading}
          isSending={isSending}
          error={error}
          currentUserId={user.id}
        />

        {loading && messages.length === 0 && (
            <div className="text-center text-gray-500 py-10">Loading Chat...</div>
        )}

        {error && !loading && (
          <div className="text-center text-red-500 py-10">
            Failed to load chat. Please try refreshing the page.
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationChatPage; 