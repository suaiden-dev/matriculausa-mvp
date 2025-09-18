import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useUniversity } from '../context/UniversityContext';
import { ChatMessage } from '../components/ApplicationChat';

export interface StudentConversation {
  studentId: string;
  studentName: string;
  studentCountry: string;
  scholarshipTitle: string;
  lastMessage: ChatMessage;
  unreadCount: number;
  lastActivity: string;
  status: 'unread' | 'pending_reply' | 'active' | 'inactive';
  applicationId: string;
}

interface ApiMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  sent_at: string;
  read_at?: string | null;
  application_id: string;
  attachments?: {
    id: string;
    file_url: string;
    file_name?: string;
    uploaded_at?: string;
  }[];
}

export const useUniversityMessages = () => {
  const { user } = useAuth();
  const { university, applications } = useUniversity();
  const [conversations, setConversations] = useState<StudentConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatMessage = (msg: ApiMessage): ChatMessage => {
    return {
      id: msg.id,
      senderId: msg.sender_id,
      recipientId: msg.recipient_id,
      message: msg.message,
      sentAt: msg.sent_at,
      isOwn: msg.sender_id === user?.id,
      status: 'sent',
      readAt: msg.read_at,
      attachments: msg.attachments?.map(att => ({
        file_url: att.file_url,
        file_name: att.file_name,
        uploaded_at: att.uploaded_at,
        isUploading: false
      }))
    };
  };

  const fetchUniversityMessages = useCallback(async () => {
    if (!university || !applications.length) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Buscar todas as mensagens das aplicações desta universidade
      const applicationIds = applications.map(app => app.id);
      
      const { data: messages, error: messagesError } = await supabase
        .from('application_messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          message,
          sent_at,
          read_at,
          application_id,
          attachments:application_message_attachments(
            id,
            file_url,
            file_name,
            uploaded_at
          )
        `)
        .in('application_id', applicationIds)
        .order('sent_at', { ascending: false });

      if (messagesError) {
        throw messagesError;
      }

      // Agrupar mensagens por aplicação e processar conversas
      const conversationsMap = new Map<string, {
        messages: ApiMessage[];
        application: any;
        student: any;
        scholarship: any;
      }>();

      // Agrupar mensagens por application_id
      (messages || []).forEach((msg: ApiMessage) => {
        if (!conversationsMap.has(msg.application_id)) {
          const application = applications.find(app => app.id === msg.application_id);
          conversationsMap.set(msg.application_id, {
            messages: [],
            application,
            student: (application as any)?.user_profiles,
            scholarship: (application as any)?.scholarships
          });
        }
        conversationsMap.get(msg.application_id)?.messages.push(msg);
      });

      // Converter para StudentConversation
      const processedConversations: StudentConversation[] = Array.from(conversationsMap.values())
        .map(({ messages, application, student, scholarship }) => {
          if (!student || !application) return null;

          // Ordenar mensagens por data (mais recente primeiro)
          const sortedMessages = messages.sort((a, b) => 
            new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
          );

          const lastMessage = formatMessage(sortedMessages[0]);
          
          // Contar mensagens não lidas (enviadas pelos estudantes para a universidade)
          const unreadCount = messages.filter(msg => 
            msg.sender_id !== user?.id && !msg.read_at
          ).length;

          // Determinar status da conversa
          let status: 'unread' | 'pending_reply' | 'active' | 'inactive' = 'inactive';
          
          if (unreadCount > 0) {
            status = 'unread';
          } else if (sortedMessages.length > 0) {
            const lastMsg = sortedMessages[0];
            const isLastFromStudent = lastMsg.sender_id !== user?.id;
            const timeSinceLastMessage = Date.now() - new Date(lastMsg.sent_at).getTime();
            const hoursSinceLastMessage = timeSinceLastMessage / (1000 * 60 * 60);
            
            if (isLastFromStudent && hoursSinceLastMessage < 24) {
              status = 'pending_reply';
            } else if (hoursSinceLastMessage < 72) {
              status = 'active';
            }
          }

          return {
            studentId: student.user_id || student.id,
            studentName: student.full_name || student.name || 'Unknown Student',
            studentCountry: student.country || 'Unknown',
            scholarshipTitle: scholarship?.title || 'No Scholarship',
            lastMessage,
            unreadCount,
            lastActivity: lastMessage.sentAt,
            status,
            applicationId: application.id
          };
        })
        .filter((conv): conv is StudentConversation => conv !== null)
        .sort((a, b) => {
          // Ordenar por: não lidas primeiro, depois por última atividade
          if (a.status === 'unread' && b.status !== 'unread') return -1;
          if (b.status === 'unread' && a.status !== 'unread') return 1;
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        });

      setConversations(processedConversations);
    } catch (err: any) {
      console.error('Error fetching university messages:', err);
      setError('Failed to fetch messages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [university, applications, user?.id]);

  useEffect(() => {
    if (user && university && applications.length > 0) {
      fetchUniversityMessages();
    }
  }, [user, university, applications, fetchUniversityMessages]);

  // Configurar real-time updates para mensagens
  useEffect(() => {
    if (!user || !university || applications.length === 0) return;

    const applicationIds = applications.map(app => app.id);
    
    // Configurar subscription para mudanças nas mensagens
    const messagesSubscription = supabase
      .channel('university-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'application_messages',
          filter: `application_id=in.(${applicationIds.join(',')})`
        },
        (payload) => {
          console.log('Real-time message update:', payload);
          // Refetch messages quando há mudanças
          setIsUpdating(true);
          fetchUniversityMessages().finally(() => {
            setIsUpdating(false);
          });
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
    };
  }, [user, university, applications, fetchUniversityMessages]);

  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      // Encontrar a aplicação correspondente
      const conversation = conversations.find(conv => conv.studentId === conversationId);
      if (!conversation) return;

      // Marcar todas as mensagens não lidas desta conversa como lidas
      const { error } = await supabase
        .from('application_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('application_id', conversation.applicationId)
        .eq('recipient_id', user?.id)
        .is('read_at', null);

      if (error) {
        console.error('Error marking messages as read:', error);
        return;
      }

      // Atualizar estado local
      setConversations(prev => 
        prev.map(conv => 
          conv.studentId === conversationId 
            ? { ...conv, unreadCount: 0, status: 'active' as const }
            : conv
        )
      );
    } catch (err) {
      console.error('Error marking conversation as read:', err);
    }
  }, [conversations, user?.id]);

  const sendQuickReply = useCallback(async (conversationId: string, message: string) => {
    try {
      const conversation = conversations.find(conv => conv.studentId === conversationId);
      if (!conversation || !user) return;

      console.log('Sending quick reply:', { conversationId, message, applicationId: conversation.applicationId });

      // Obter token de autenticação
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        console.error('No authentication token available');
        return;
      }

      // Enviar mensagem usando a função existente
      const { data, error } = await supabase.functions.invoke('send-application-message', {
        method: 'POST',
        body: {
          application_id: conversation.applicationId,
          text: message.trim() // Corrigido: usar 'text' em vez de 'message'
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (error) {
        console.error('Error sending quick reply:', error);
        return;
      }

      console.log('Quick reply sent successfully:', data);

      // Atualizar conversas localmente
      await fetchUniversityMessages();
    } catch (err) {
      console.error('Error sending quick reply:', err);
    }
  }, [conversations, user, fetchUniversityMessages]);

  return {
    conversations,
    loading,
    isUpdating,
    error,
    markAsRead,
    sendQuickReply,
    refetch: fetchUniversityMessages
  };
};
