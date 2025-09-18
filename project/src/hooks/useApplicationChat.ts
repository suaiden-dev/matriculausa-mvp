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
  read_at?: string | null;
  updated_at?: string | null;
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
      const formatted = {
        id: msg.id,
        senderId: msg.sender_id,
        recipientId: msg.recipient_id,
        message: msg.message,
        sentAt: msg.sent_at,
        isOwn: msg.sender_id === user?.id,
        attachments: msg.attachments,
        status: msg.sender_id === user?.id ? status : 'sent',
        readAt: msg.read_at,
        updatedAt: msg.updated_at,
      };
      
      // Debug log para verificar readAt
      if (msg.read_at) {
        console.log('📖 [formatMessage] Message with readAt:', {
          id: msg.id,
          readAt: msg.read_at,
          isOwn: formatted.isOwn,
          status: formatted.status
        });
      }
      
      return formatted;
    },
    [user]
  );

  const fetchMessages = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    setError(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const { data, error: functionError } = await supabase.functions.invoke('list-application-messages', {
        method: 'POST',
        body: { application_id: applicationId },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (functionError) {
        throw functionError;
      }

      const apiMessages = data.messages || [];
      console.log('📖 [fetchMessages] Raw messages from API:', apiMessages);
      const formattedMessages: ChatMessage[] = apiMessages.map((msg: ApiMessage) => formatMessage(msg));
      console.log('📖 [fetchMessages] Formatted messages:', formattedMessages);
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
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'application_messages', filter: `application_id=eq.${applicationId}` },
          (payload) => {
            const updatedMessage = formatMessage(payload.new as ApiMessage);
            setMessages((prevMessages) =>
              prevMessages.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [applicationId, user, fetchMessages, formatMessage]);

  const markAsRead = useCallback(async (messageId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('application_messages')
        .update({ 
          read_at: new Date().toISOString(),
          is_read: true 
        })
        .eq('id', messageId)
        .eq('recipient_id', user.id);
      
      if (error) {
        console.error('Error marking message as read:', error);
        return;
      }
      
      // Update local state
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId ? { ...msg, readAt: new Date().toISOString() } : msg
        )
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user || !applicationId) return;
    
    console.log('📖 [markAllAsRead] Starting to mark messages as read for user:', user.id);
    
    try {
      const { error } = await supabase
        .from('application_messages')
        .update({ 
          read_at: new Date().toISOString(),
          is_read: true 
        })
        .eq('application_id', applicationId)
        .eq('recipient_id', user.id)
        .is('read_at', null);
      
      if (error) {
        console.error('Error marking all messages as read:', error);
        return;
      }
      
      console.log('📖 [markAllAsRead] Successfully marked messages as read in database');
      
      // Update local state
      const readAtTimestamp = new Date().toISOString();
      setMessages(prevMessages => {
        console.log('📖 [markAllAsRead] Current messages before update:', prevMessages.map(m => ({
          id: m.id,
          recipientId: m.recipientId,
          readAt: m.readAt,
          isOwn: m.isOwn,
          senderId: m.senderId
        })));
        
        const updated = prevMessages.map(msg => {
          if (msg.recipientId === user.id && !msg.readAt) {
            console.log('📖 [markAllAsRead] Updating local message:', msg.id, 'with readAt:', readAtTimestamp);
            return { ...msg, readAt: readAtTimestamp };
          }
          return msg;
        });
        console.log('📖 [markAllAsRead] Updated messages:', updated.map(m => ({
          id: m.id,
          recipientId: m.recipientId,
          readAt: m.readAt,
          isOwn: m.isOwn
        })));
        
        // Verificar se as mensagens que estão sendo renderizadas estão no estado atualizado
        const renderedMessageIds = ['3e9564f3-11b2-41e7-a762-fd152e3f8634', 'de43a6dc-dd1e-421f-a756-a003460a6ad1', 'c5a4fc5a-7991-454c-82d6-2265ae2249c0'];
        const renderedMessages = updated.filter(m => renderedMessageIds.includes(m.id));
        console.log('📖 [markAllAsRead] Rendered messages in updated state:', renderedMessages.map(m => ({
          id: m.id,
          recipientId: m.recipientId,
          readAt: m.readAt,
          isOwn: m.isOwn
        })));
        
        // Verificar se as mensagens que estão sendo atualizadas estão sendo renderizadas
        const updatedMessageIds = ['07eb0ee8-4201-4c95-bccb-2e2f31858cb4', '9c624282-ff64-426b-9493-3d80b17a6871'];
        const updatedMessages = updated.filter(m => updatedMessageIds.includes(m.id));
        console.log('📖 [markAllAsRead] Updated messages in state:', updatedMessages.map(m => ({
          id: m.id,
          recipientId: m.recipientId,
          readAt: m.readAt,
          isOwn: m.isOwn
        })));
        return updated;
      });
    } catch (error) {
      console.error('Error marking all messages as read:', error);
    }
  }, [user, applicationId]);

  const editMessage = useCallback(async (messageId: string, newText: string) => {
    if (!user) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      const { data, error } = await supabase.functions.invoke('edit-application-message', {
        method: 'POST',
        body: {
          message_id: messageId,
          text: newText
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (error) {
        console.error('Error editing message:', error);
        setError(error.message || 'Failed to edit message');
        return;
      }

      // Atualizar mensagem localmente
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, message: newText, updatedAt: new Date().toISOString() }
          : msg
      ));

      console.log('✅ Message edited successfully');
    } catch (err) {
      console.error('Error editing message:', err);
      setError('Failed to edit message');
    }
  }, [user]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      const { data, error } = await supabase.functions.invoke('delete-application-message', {
        method: 'POST',
        body: {
          message_id: messageId
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (error) {
        console.error('Error deleting message:', error);
        setError(error.message || 'Failed to delete message');
        return;
      }

      // Remover mensagem localmente
      setMessages(prev => prev.filter(msg => msg.id !== messageId));

      console.log('✅ Message deleted successfully');
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('Failed to delete message');
    }
  }, [user]);

  // Mark messages as read when user views the chat
  useEffect(() => {
    if (user && messages.length > 0) {
      const unreadMessages = messages.filter(
        msg => msg.recipientId === user.id && !msg.readAt
      );
      
      console.log('📖 [useEffect] Checking unread messages:', {
        totalMessages: messages.length,
        unreadCount: unreadMessages.length,
        userId: user.id
      });
      
      if (unreadMessages.length > 0) {
        console.log('📖 [useEffect] Found unread messages, will mark as read in 1 second');
        // Mark all unread messages as read after a short delay
        const timer = setTimeout(() => {
          markAllAsRead();
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [user, messages, markAllAsRead]);

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
        console.log('[ChatUpload] applicationId:', applicationId);
        console.log('[ChatUpload] user.id:', user?.id);
        console.log('[ChatUpload] filePath:', filePath);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(filePath, file);
        if (uploadError) {
          console.error('[ChatUpload] Erro detalhado do upload:', uploadError);
          setError(`Erro no upload: ${uploadError.message || 'Erro desconhecido.'}`);
          throw new Error('Failed to upload attachment.');
        } else {
          console.log('[ChatUpload] Upload realizado com sucesso:', uploadData);
        }
        const { data: urlData } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(uploadData.path);
        file_url = urlData.publicUrl;
        file_name = file.name;
      }
      console.log('[ChatUpload] Enviando mensagem para backend', {
        application_id: applicationId,
        text,
        file_url,
        file_name,
      });
      const { data: sentMessageData, error: functionError } = await supabase.functions.invoke('send-application-message', {
        body: {
          application_id: applicationId,
          text,
          file_url,
          file_name,
        },
      });
      if (functionError) {
        console.error('[ChatUpload] Erro do backend:', functionError);
        throw functionError;
      }
      console.log('[ChatUpload] Resposta do backend:', sentMessageData);
      const sentMessage = formatMessage(sentMessageData as ApiMessage, 'sent');
      
      // Debug: Log da mensagem formatada
      console.log('🔍 [ChatUpload] Mensagem formatada:', {
        id: sentMessage.id,
        attachments: sentMessage.attachments,
        status: sentMessage.status
      });
      
      setMessages((prevMessages) => {
        console.log('🔍 [ChatUpload] Mensagens antes da atualização:', prevMessages.map(m => ({
          id: m.id,
          attachments: m.attachments,
          status: m.status
        })));
        
        const updated = prevMessages.map((msg) => (msg.id === tempId ? sentMessage : msg));
        
        console.log('🔍 [ChatUpload] Mensagens após atualização:', updated.map(m => ({
          id: m.id,
          attachments: m.attachments,
          status: m.status
        })));
        
        return updated;
      });

      // Refresh automático após upload para garantir que a imagem apareça
      console.log('🔄 [ChatUpload] Fazendo refresh automático após upload...');
      setTimeout(() => {
        fetchMessages();
      }, 1000); // Aguarda 1 segundo para dar tempo do backend processar

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

  return {
    messages, 
    loading, 
    isSending, 
    error, 
    sendMessage, 
    markAsRead,
    markAllAsRead,
    editMessage,
    deleteMessage,
    refetchMessages: fetchMessages 
  };
}; 