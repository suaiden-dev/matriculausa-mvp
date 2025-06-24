import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { ChatMessage } from '../components/ApplicationChat';

// This interface is for the raw data from the DB/API
interface ApiMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  sent_at: string;
  attachments?: { file_url: string; file_name?: string; uploaded_at?: string }[];
}

export const useApplicationChat = (applicationId?: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatMessage = useCallback(
    (msg: ApiMessage, status: 'sent' | 'pending' | 'error' = 'sent'): ChatMessage => {
      return {
        id: msg.id,
        senderId: msg.sender_id,
        recipientId: msg.recipient_id,
        message: msg.message,
        sentAt: msg.sent_at,
        isOwn: msg.sender_id === user?.id,
        attachments: msg.attachments,
        status: msg.sender_id === user?.id ? status : 'sent',
      };
    },
    [user]
  );

  const fetchMessages = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('list-application-messages', {
        method: 'POST',
        body: { application_id: applicationId },
      });

      if (functionError) {
        throw functionError;
      }

      const apiMessages = data.messages || [];
      const formattedMessages: ChatMessage[] = apiMessages.map((msg: ApiMessage) => formatMessage(msg));
      setMessages(formattedMessages);
    } catch (e: any) {
      console.error('Failed to fetch messages:', e);
      setError('Failed to fetch messages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [applicationId, formatMessage]);

  useEffect(() => {
    if (user) { // Only run hooks if user is authenticated
      fetchMessages();

      const channel = supabase
        .channel(`application-messages-${applicationId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'application_messages', filter: `application_id=eq.${applicationId}` },
          (payload) => {
            const newMessage = formatMessage(payload.new as ApiMessage);
            if (newMessage.senderId !== user?.id) {
              setMessages((prevMessages) => [...prevMessages, newMessage]);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [applicationId, user, fetchMessages, formatMessage]);

  const sendMessage = async (text: string, file: File | null) => {
    if (!applicationId || !user) {
      setError('Could not identify the application or user.');
      return;
    }

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      senderId: user.id,
      recipientId: '',
      message: text,
      sentAt: new Date().toISOString(),
      isOwn: true,
      status: 'pending',
      attachments: file ? [{ file_url: URL.createObjectURL(file), file_name: file.name }] : [],
    };

    setMessages((prevMessages) => [...prevMessages, optimisticMessage]);
    setIsSending(true);
    setError(null);

    try {
      let file_url: string | undefined = undefined;
      let file_name: string | undefined = undefined;

      if (file) {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
        
        const sanitizedBaseName = fileNameWithoutExt
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/\s+/g, '-')
          .replace(/--+/g, '-');
        
        const finalFileName = `${Date.now()}-${sanitizedBaseName}.${fileExt}`;
        const filePath = `${applicationId}/${user?.id}/${finalFileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(filePath, file);

        if (uploadError) throw new Error('Failed to upload attachment.');
        
        const { data: urlData } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(uploadData.path);
          
        file_url = urlData.publicUrl;
        file_name = file.name;
      }
      
      const { data: sentMessageData, error: functionError } = await supabase.functions.invoke('send-application-message', {
        body: {
          application_id: applicationId,
          text,
          file_url,
          file_name,
        },
      });

      if (functionError) throw functionError;
      
      const sentMessage = formatMessage(sentMessageData as ApiMessage, 'sent');
      setMessages((prevMessages) =>
        prevMessages.map((msg) => (msg.id === tempId ? sentMessage : msg))
      );

    } catch (e: any) {
      setError('Failed to send message.');
      console.error(e);
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === tempId ? { ...optimisticMessage, status: 'error' } : msg
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  return { messages, loading, isSending, error, sendMessage, refetchMessages: fetchMessages };
}; 