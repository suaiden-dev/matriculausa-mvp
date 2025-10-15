import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { channelManager } from '../lib/supabaseChannelManager';
import { useAdminStudentChatNotifications } from './useAdminStudentChatNotifications';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';
import { ChatMessage } from '../components/ApplicationChat';

// Interface for the raw data from the DB
interface AdminStudentApiMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
  read_at?: string | null;
  edited_at?: string | null;
  is_deleted?: boolean;
  attachments?: { file_url: string; file_name?: string; uploaded_at?: string }[];
}

// Interface for conversation data
interface Conversation {
  id: string;
  admin_id: string;
  student_id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  admin_profile?: {
    full_name: string;
    avatar_url?: string;
  };
  student_profile?: {
    full_name: string;
    avatar_url?: string;
  };
  unread_count?: number;
  last_message?: string;
}

export const useAdminStudentChat = (conversationId?: string, recipientId?: string, updateConversationUnreadCount?: (conversationId: string, newUnreadCount: number) => void) => {
  const { user, userProfile } = useAuth();
  const { markConversationAsRead } = useAdminStudentChatNotifications();
  const { resetUnreadCount } = useUnreadMessages();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null);
  const messagesChannelRef = useRef<any>(null);

  const formatMessage = useCallback(
    (msg: AdminStudentApiMessage, status: 'sent' | 'pending' | 'error' = 'sent'): ChatMessage => {
      return {
        id: msg.id,
        senderId: msg.sender_id,
        recipientId: msg.recipient_id,
        message: msg.message,
        sentAt: msg.created_at,
        isOwn: msg.sender_id === user?.id,
        attachments: msg.attachments,
        status: msg.sender_id === user?.id ? status : 'sent',
        readAt: msg.read_at,
        editedAt: msg.edited_at,
        isDeleted: msg.is_deleted || false,
      };
    },
    [user]
  );

  // Function to find a default admin for students to chat with
  const findDefaultAdmin = useCallback(async () => {
    if (!user || !userProfile || userProfile.role !== 'student') return null;

    try {
      // Look for regular admin first (this is for general student support)
      const { data: adminProfile, error } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (error || !adminProfile) {
        console.log('No regular admin found, looking for affiliate admin...');
        // Fallback to affiliate admin
        const { data: fallbackAdmin, error: fallbackError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name')
          .eq('role', 'affiliate_admin')
          .limit(1)
          .single();

        if (fallbackError || !fallbackAdmin) {
          console.error('No admin found for student to chat with');
          return null;
        }
        return fallbackAdmin.user_id;
      }

      return adminProfile.user_id;
    } catch (e) {
      console.error('Error finding default admin:', e);
      return null;
    }
  }, [user, userProfile]);

  // Create or get existing conversation
  const ensureConversation = useCallback(async () => {
    if (!user || !userProfile) return null;

    let targetRecipientId = recipientId;

    // If student and no recipientId provided, find a default admin
    if (userProfile.role === 'student' && !targetRecipientId) {
      targetRecipientId = await findDefaultAdmin();
      if (!targetRecipientId) {
        setError('No admin available for chat. Please try again later.');
        return null;
      }
    }

    if (!targetRecipientId) return null;

    try {
      // First, try to find existing conversation
      let query = supabase
        .from('admin_student_conversations')
        .select('*');

      if (userProfile.role === 'affiliate_admin') {
        // Affiliate admins only see their own conversations
        query = query.eq('admin_id', user.id).eq('student_id', targetRecipientId);
      } else if (userProfile.role === 'admin') {
        // Regular admins look for any existing conversation with this student
        query = query.eq('student_id', targetRecipientId);
      } else {
        // Students look for conversations with them
        query = query.eq('student_id', user.id).eq('admin_id', targetRecipientId);
      }

      const { data: existingConversations, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      if (existingConversations && existingConversations.length > 0) {
        // Return the first existing conversation (most recent)
        return existingConversations[0].id;
      }

      // Create new conversation
      const conversationData = (userProfile.role === 'affiliate_admin' || userProfile.role === 'admin') 
        ? { admin_id: user.id, student_id: targetRecipientId }
        : { admin_id: targetRecipientId, student_id: user.id };

      const { data: newConversation, error: createError } = await supabase
        .from('admin_student_conversations')
        .insert(conversationData)
        .select()
        .single();

      if (createError) throw createError;

      return newConversation.id;
    } catch (e) {
      console.error('Failed to ensure conversation:', e);
      setError('Failed to create or find conversation.');
      return null;
    }
  }, [user, userProfile, recipientId, findDefaultAdmin]);

  const fetchMessages = useCallback(async (convId?: string) => {
    const targetConversationId = convId || currentConversationId;
    if (!targetConversationId) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('admin_student_messages')
        .select(`
          *,
          admin_student_message_attachments(file_url, file_name, created_at)
        `)
        .eq('conversation_id', targetConversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      const formattedMessages: ChatMessage[] = (data || []).map((msg: any) => {
        const attachments = msg.admin_student_message_attachments?.map((att: any) => ({
          file_url: att.file_url,
          file_name: att.file_name,
          uploaded_at: att.created_at,
        })) || [];

        return formatMessage({
          id: msg.id,
          sender_id: msg.sender_id,
          recipient_id: msg.recipient_id,
          message: msg.message,
          created_at: msg.created_at,
          read_at: msg.read_at,
          edited_at: msg.edited_at,
          is_deleted: msg.is_deleted,
          attachments,
        });
      });

      setMessages(formattedMessages);
    } catch (e: any) {
      console.error('Failed to fetch messages:', e);
      setError('Failed to fetch messages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentConversationId, formatMessage]);

  // Initialize conversation and fetch messages
  useEffect(() => {
    const initializeChat = async () => {
      if (!user || !userProfile) return;

      if (conversationId) {
        setCurrentConversationId(conversationId);
        await fetchMessages(conversationId);
        // Marcar notificações da conversa como lidas
        await markConversationNotificationsAsRead(conversationId);
      } else if (recipientId || userProfile.role === 'student') {
        // For students, always try to create/find a conversation even without explicit recipientId
        const convId = await ensureConversation();
        if (convId) {
          setCurrentConversationId(convId);
          await fetchMessages(convId);
          // Marcar notificações da conversa como lidas
          await markConversationNotificationsAsRead(convId);
        }
      }
    };

    initializeChat();
  }, [user, userProfile, conversationId, recipientId, ensureConversation, fetchMessages]);

  // Função para marcar notificações da conversa como lidas
  const markConversationNotificationsAsRead = async (convId: string) => {
    if (!user) return;

    try {
      await supabase
        .rpc('mark_conversation_notifications_as_read', {
          conversation_id_param: convId
        });
    } catch (e) {
      console.error('Failed to mark conversation notifications as read:', e);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user || !currentConversationId) return;

    const channelName = `admin-student-messages-${currentConversationId}`;

    const channel = channelManager.subscribe(channelName)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'admin_student_messages', 
          filter: `conversation_id=eq.${currentConversationId}` 
        },
        async (payload: any) => {
          // Fetch the complete message with attachments
          const { data: fullMessage } = await supabase
            .from('admin_student_messages')
            .select(`
              *,
              admin_student_message_attachments(file_url, file_name, created_at)
            `)
            .eq('id', payload.new.id)
            .single();

          if (fullMessage) {
            const attachments = fullMessage.admin_student_message_attachments?.map((att: any) => ({
              file_url: att.file_url,
              file_name: att.file_name,
              uploaded_at: att.created_at,
            })) || [];

            const newMessage = formatMessage({
              id: fullMessage.id,
              sender_id: fullMessage.sender_id,
              recipient_id: fullMessage.recipient_id,
              message: fullMessage.message,
              created_at: fullMessage.created_at,
              read_at: fullMessage.read_at,
              edited_at: fullMessage.edited_at,
              is_deleted: fullMessage.is_deleted,
              attachments,
            });

            // Only add if it's not from current user (avoid duplicates)
            if (newMessage.senderId !== user?.id) {
              setMessages((prevMessages) => [...prevMessages, newMessage]);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'admin_student_messages', 
          filter: `conversation_id=eq.${currentConversationId}` 
        },
        async (payload: any) => {
          // Handle message updates (edit/delete)
          const { data: updatedMessage } = await supabase
            .from('admin_student_messages')
            .select(`
              *,
              admin_student_message_attachments(file_url, file_name, created_at)
            `)
            .eq('id', payload.new.id)
            .single();

          if (updatedMessage) {
            const attachments = updatedMessage.admin_student_message_attachments?.map((att: any) => ({
              file_url: att.file_url,
              file_name: att.file_name,
              uploaded_at: att.created_at,
            })) || [];

            const formattedMessage = formatMessage({
              id: updatedMessage.id,
              sender_id: updatedMessage.sender_id,
              recipient_id: updatedMessage.recipient_id,
              message: updatedMessage.message,
              created_at: updatedMessage.created_at,
              read_at: updatedMessage.read_at,
              edited_at: updatedMessage.edited_at,
              is_deleted: updatedMessage.is_deleted,
              attachments,
            });

            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.id === updatedMessage.id ? formattedMessage : msg
              )
            );
          }
        }
      );

    messagesChannelRef.current = channel;

    return () => {
      channelManager.unsubscribe(channelName);
      messagesChannelRef.current = null;
    };
  }, [currentConversationId, user, formatMessage]);

  const sendMessage = async (text: string, file?: File) => {
    if (!currentConversationId || !user || !userProfile) {
      setError('Could not identify the conversation or user.');
      return;
    }

    // Determine recipient ID from the conversation
    let targetRecipientId = recipientId;
    
    if (!targetRecipientId) {
      // Get recipient from conversation data
      const { data: convData } = await supabase
        .from('admin_student_conversations')
        .select('admin_id, student_id')
        .eq('id', currentConversationId)
        .single();
        
      if (convData) {
        targetRecipientId = user.id === convData.admin_id ? convData.student_id : convData.admin_id;
      }
    }

    if (!targetRecipientId) {
      setError('Could not identify the recipient.');
      return;
    }

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      senderId: user.id,
      recipientId: targetRecipientId,
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
      let attachmentData: any[] = [];

      // Handle file upload if present
      if (file) {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
        const sanitizedBaseName = fileNameWithoutExt
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/\s+/g, '-')
          .replace(/--+/g, '-');
        const finalFileName = `${Date.now()}-${sanitizedBaseName}.${fileExt}`;
        const filePath = `chat/${currentConversationId}/${finalFileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Failed to upload attachment.');
        }

        const { data: urlData } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(uploadData.path);

        attachmentData = [{
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        }];
      }

      // Insert message directly using Supabase client (RLS will handle permissions)
      const { data: sentMessage, error: messageError } = await supabase
        .from('admin_student_messages')
        .insert({
          conversation_id: currentConversationId,
          sender_id: user.id,
          recipient_id: targetRecipientId,
          message: text,
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Insert attachments if any
      if (attachmentData.length > 0) {
        const attachmentsToInsert = attachmentData.map(att => ({
          message_id: sentMessage.id,
          ...att,
        }));

        const { error: attachmentError } = await supabase
          .from('admin_student_message_attachments')
          .insert(attachmentsToInsert);

        if (attachmentError) {
          console.error('Attachment insert error:', attachmentError);
          // Continue anyway, message was sent
        }
      }

      const finalMessage = formatMessage({
        id: sentMessage.id,
        sender_id: sentMessage.sender_id,
        recipient_id: sentMessage.recipient_id,
        message: sentMessage.message,
        created_at: sentMessage.created_at,
        read_at: sentMessage.read_at,
        attachments: attachmentData.map(att => ({
          file_url: att.file_url,
          file_name: att.file_name,
          uploaded_at: new Date().toISOString(),
        })),
      }, 'sent');

      setMessages((prevMessages) =>
        prevMessages.map((msg) => (msg.id === tempId ? finalMessage : msg))
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

  const markAsRead = async (messageId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('admin_student_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('recipient_id', user.id);
    } catch (e) {
      console.error('Failed to mark message as read:', e);
    }
  };

  const markAllAsRead = async () => {
    if (!user || !currentConversationId) return;

    try {
      const { error } = await supabase
        .from('admin_student_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', currentConversationId)
        .eq('recipient_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('Failed to mark all messages as read:', error);
        return;
      }

      // Update local state to reflect read status immediately
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.recipientId === user.id && !msg.readAt
            ? { ...msg, readAt: new Date().toISOString() }
            : msg
        )
      );

      // Update the conversation unread count to 0
      if (currentConversationId && updateConversationUnreadCount) {
        updateConversationUnreadCount(currentConversationId, 0);
      }

      // Mark conversation notifications as read
      if (currentConversationId) {
        markConversationAsRead(currentConversationId);
      }

      // Reset global unread count immediately (this will make the blue dots disappear immediately)
      resetUnreadCount();
    } catch (e) {
      console.error('Failed to mark all messages as read:', e);
    }
  };

  const editMessage = async (messageId: string, newText: string) => {
    if (!user || !currentConversationId) return;

    try {
      // Only allow editing own messages
      const { data: updatedMessage, error } = await supabase
        .from('admin_student_messages')
        .update({ 
          message: newText,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId 
            ? { ...msg, message: newText, editedAt: updatedMessage.edited_at }
            : msg
        )
      );

    } catch (e: any) {
      console.error('Failed to edit message:', e);
      setError('Failed to edit message. Please try again.');
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user || !currentConversationId) return;

    try {
      // Soft delete - only allow deleting own messages
      const { error } = await supabase
        .from('admin_student_messages')
        .update({ 
          is_deleted: true,
          message: '[Deleted]'
        })
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) throw error;

      // Update local state
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId 
            ? { ...msg, message: '[Deleted]', isDeleted: true }
            : msg
        )
      );

    } catch (e: any) {
      console.error('Failed to delete message:', e);
      setError('Failed to delete message. Please try again.');
    }
  };

  return { 
    messages, 
    loading, 
    isSending, 
    error, 
    sendMessage, 
    editMessage,
    deleteMessage,
    refetchMessages: () => fetchMessages(currentConversationId || undefined),
    conversationId: currentConversationId,
    markAsRead,
    markAllAsRead,
  };
};

// Hook for listing conversations (for admin inbox)
export const useAdminStudentConversations = () => {
  const { user, userProfile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const conversationsChannelRef = useRef<any>(null);

  const fetchConversations = useCallback(async (showLoading = true) => {
    if (!user || !userProfile) return;

    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    try {
      let query = supabase
        .from('admin_student_conversations')
        .select(`
          *,
          admin_profile:admin_id(full_name, avatar_url),
          student_profile:student_id(full_name, avatar_url)
        `)
        .order('last_message_at', { ascending: false });

      // Filter based on user role
      if (userProfile.role === 'affiliate_admin') {
        // Affiliate admins only see their own conversations
        query = query.eq('admin_id', user.id);
      } else if (userProfile.role === 'student') {
        // Students only see their own conversations
        query = query.eq('student_id', user.id);
      }
      // Regular admins (role === 'admin') see all conversations - no filter

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Get unread counts and last messages for each conversation in a more efficient way
      const conversationIds = (data || []).map(conv => conv.id);
      
      let allMessages: any[] = [];
      
      // Only fetch messages if there are conversations
      if (conversationIds.length > 0) {
        const { data: messagesData } = await supabase
          .from('admin_student_messages')
          .select('conversation_id, message, created_at, recipient_id, id, read_at')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false });
        
        allMessages = messagesData || [];
      }

      // Process the data to get last message and unread count for each conversation
      const enrichedConversations = (data || []).map((conv: any) => {
        // Get messages for this conversation
        const conversationMessages = allMessages.filter(msg => msg.conversation_id === conv.id);
        
        // Get last message
        const lastMessage = conversationMessages.length > 0 ? conversationMessages[0] : null;
        
        // Count unread messages where current user is recipient
        const unreadCount = conversationMessages.filter(msg => 
          msg.recipient_id === user.id && !msg.read_at
        ).length;

        return {
          ...conv,
          unread_count: unreadCount || 0,
          last_message: lastMessage?.message || '',
        };
      });

      setConversations(enrichedConversations);
      setIsInitialLoad(false);
    } catch (e: any) {
      console.error('Failed to fetch conversations:', e);
      setError('Failed to fetch conversations. Please try again.');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [user, userProfile]);

  useEffect(() => {
    if (user && userProfile) {
      fetchConversations(true); // Show loading on initial load

      const channelName = `admin-student-conversations-updates-${user.id}`;

      // Set up real-time subscription for conversation updates
      const channel = channelManager.subscribe(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'admin_student_conversations' },
          () => {
            console.log('Conversation updated, refetching...');
            fetchConversations(false); // Don't show loading for real-time updates
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'admin_student_messages' },
          (payload: any) => {
            console.log('New message inserted, refetching conversations...', payload);
            fetchConversations(false); // Don't show loading for real-time updates
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'admin_student_messages' },
          (payload: any) => {
            console.log('Message updated (likely marked as read), refetching conversations...', payload);
            // Add a small delay to ensure the database has been updated
            setTimeout(() => {
              fetchConversations(false); // Don't show loading for real-time updates
            }, 100);
          }
        );

      conversationsChannelRef.current = channel;

      return () => {
        channelManager.unsubscribe(channelName);
        conversationsChannelRef.current = null;
      };
    }
  }, [user, userProfile, fetchConversations]);

  // Function to update unread count for a specific conversation
  const updateConversationUnreadCount = useCallback((conversationId: string, newUnreadCount: number) => {
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.id === conversationId 
          ? { ...conv, unread_count: newUnreadCount }
          : conv
      )
    );
  }, []);

  return { 
    conversations, 
    loading, 
    error, 
    isInitialLoad,
    refetchConversations: fetchConversations,
    updateConversationUnreadCount
  };
};