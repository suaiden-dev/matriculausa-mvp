import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export const useStudentUnreadMessages = () => {
  const { user, userProfile } = useAuth();
  const [studentUnreadCounts, setStudentUnreadCounts] = useState<{[studentId: string]: number}>({});
  const [loading, setLoading] = useState(false);

  const fetchStudentUnreadCounts = async () => {
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
        setStudentUnreadCounts({});
        return;
      }

      const conversationIds = conversations.map(conv => conv.id);

      // Buscar mensagens não lidas para essas conversas
      const { data: unreadMessages, error: messagesError } = await supabase
        .from('admin_student_messages')
        .select('conversation_id, recipient_id')
        .in('conversation_id', conversationIds)
        .eq('recipient_id', user.id) // Mensagens não lidas pelo admin
        .is('read_at', null);

      if (messagesError) throw messagesError;

      // Contar mensagens não lidas por estudante
      const counts: {[studentId: string]: number} = {};
      
      conversations.forEach(conv => {
        const unreadCount = unreadMessages?.filter(msg => msg.conversation_id === conv.id).length || 0;
        if (unreadCount > 0) {
          counts[conv.student_id] = unreadCount;
        }
      });

      setStudentUnreadCounts(counts);
    } catch (e: any) {
      console.error('Failed to fetch student unread counts:', e);
      setStudentUnreadCounts({});
    } finally {
      setLoading(false);
    }
  };

  // Buscar contadores quando o usuário muda
  useEffect(() => {
    if (user && userProfile) {
      fetchStudentUnreadCounts();
    }
  }, [user, userProfile]);

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
          fetchStudentUnreadCounts();
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
          fetchStudentUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userProfile]);

  const getUnreadCount = (studentId: string): number => {
    return studentUnreadCounts[studentId] || 0;
  };

  return {
    studentUnreadCounts,
    loading,
    refetch: fetchStudentUnreadCounts,
    getUnreadCount
  };
};
