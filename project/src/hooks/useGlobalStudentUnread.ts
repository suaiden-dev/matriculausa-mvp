import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { channelManager } from '../lib/supabaseChannelManager';
import { useAuth } from './useAuth';

interface UnreadByStudentMap {
  [studentId: string]: number;
}

export const useGlobalStudentUnread = () => {
  const { user, userProfile } = useAuth();
  const [countsByStudent, setCountsByStudent] = useState<UnreadByStudentMap>({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCounts = useCallback(async () => {
    // Apenas buscar contagens se for admin ou affiliate_admin
    if (!user || !userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'affiliate_admin')) {
      setCountsByStudent({});
      setTotalUnread(0);
      return;
    }

    setLoading(true);
    try {
      // Buscar mensagens não lidas onde o admin atual é o destinatário
      // Excluir mensagens do sistema (como mensagens de boas-vindas) que não devem gerar notificações
      const { data, error } = await supabase
        .from('admin_student_messages')
        .select(
          `id, read_at, is_deleted, conversation_id, recipient_id,
           admin_student_conversations!inner(student_id)`
        )
        .is('read_at', null)
        .eq('is_deleted', false)
        .eq('is_system_message', false) // Excluir mensagens do sistema
        .eq('recipient_id', user.id); // ✅ FILTRO: Apenas mensagens onde o admin logado é o destinatário

      if (error) throw error;

      const map: UnreadByStudentMap = {};
      (data || []).forEach((row: any) => {
        const studentId = row?.admin_student_conversations?.student_id;
        if (!studentId) return;
        map[studentId] = (map[studentId] || 0) + 1;
      });

      setCountsByStudent(map);
      setTotalUnread(Object.values(map).reduce((sum, n) => sum + n, 0));
    } catch (e) {
      setCountsByStudent({});
      setTotalUnread(0);
    } finally {
      setLoading(false);
    }
  }, [user, userProfile]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Realtime: reagir a mudanças nas mensagens para atualizar contadores globais
  useEffect(() => {
    if (!user || !userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'affiliate_admin')) {
      return;
    }

    const channelName = `global-student-unread-counts-${user.id}`;
    const channel = channelManager
      .subscribe(channelName)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'admin_student_messages',
          filter: `recipient_id=eq.${user.id}` // ✅ FILTRO: Apenas eventos onde o admin logado é o destinatário
        },
        () => {
          fetchCounts();
        }
      );

    return () => {
      channelManager.unsubscribe(channelName);
    };
  }, [fetchCounts, user, userProfile]);

  const getUnreadCount = (studentId: string): number => countsByStudent[studentId] || 0;

  return { countsByStudent, totalUnread, loading, refetch: fetchCounts, getUnreadCount };
};


