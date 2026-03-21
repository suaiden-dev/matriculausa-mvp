import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export const useStudentUnreadMessages = () => {
  const { user, userProfile } = useAuth();
  const [countsByStudent, setCountsByStudent] = useState<{[studentId: string]: number}>({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCounts = useCallback(async () => {
    if (!user || !userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'affiliate_admin')) {
      return;
    }

    setLoading(true);
    try {
      // Buscar todas as conversas onde o admin atual é o admin_id
      const { data: conversations, error: conversationsError } = await supabase
        .from('admin_student_conversations')
        .select('id, student_id')
        .eq('admin_id', user.id);

      if (conversationsError) throw conversationsError;

      if (!conversations || conversations.length === 0) {
        setCountsByStudent({});
        setTotalUnread(0);
        return;
      }

      const conversationIds = conversations.map(conv => conv.id);

      // Buscar mensagens não lidas para essas conversas
      // Excluir mensagens do sistema (como mensagens de boas-vindas) que não devem gerar notificações
      const { data: unreadMessages, error: messagesError } = await supabase
        .from('admin_student_messages')
        .select('conversation_id, recipient_id')
        .in('conversation_id', conversationIds)
        .eq('recipient_id', user.id) // Mensagens não lidas pelo admin
        .is('read_at', null)
        .eq('is_system_message', false); // Excluir mensagens do sistema

      if (messagesError) throw messagesError;

      // Contar mensagens não lidas por estudante
      const counts: {[studentId: string]: number} = {};
      let currentTotalUnread = 0;
      
      conversations.forEach(conv => {
        const unreadCount = unreadMessages?.filter(msg => msg.conversation_id === conv.id).length || 0;
        if (unreadCount > 0) {
          counts[conv.student_id] = unreadCount;
          currentTotalUnread += unreadCount;
        }
      });

      setCountsByStudent(counts);
      setTotalUnread(currentTotalUnread);
    } catch (e: any) {
      console.error('Failed to fetch student unread counts:', e);
      setCountsByStudent({});
      setTotalUnread(0);
    } finally {
      setLoading(false);
    }
  }, [user, userProfile]);

  // Buscar contadores quando o usuário muda
  useEffect(() => {
    if (user && userProfile) {
      fetchUnreadCounts();
    }
  }, [user, userProfile, fetchUnreadCounts]);

  // Configurar real-time para atualizações
  useEffect(() => {
    if (!user || !userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'affiliate_admin')) {
      return;
    }

    const channelName = `admin-student-unread-counts-${user.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'admin_student_messages',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          fetchUnreadCounts();
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'admin_student_messages',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          fetchUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userProfile, fetchUnreadCounts]);

  const getUnreadCount = useCallback((studentId: string): number => {
    return countsByStudent[studentId] || 0;
  }, [countsByStudent]);

  return useMemo(() => ({ countsByStudent, totalUnread, loading, refetch: fetchUnreadCounts, getUnreadCount }), [countsByStudent, totalUnread, loading, fetchUnreadCounts, getUnreadCount]);
};
