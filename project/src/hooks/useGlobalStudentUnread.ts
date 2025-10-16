import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { channelManager } from '../lib/supabaseChannelManager';

interface UnreadByStudentMap {
  [studentId: string]: number;
}

export const useGlobalStudentUnread = () => {
  const [countsByStudent, setCountsByStudent] = useState<UnreadByStudentMap>({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    try {
      // Buscar mensagens não lidas e mapear por student_id via tabela de conversas
      const { data, error } = await supabase
        .from('admin_student_messages')
        .select(
          `id, read_at, is_deleted, conversation_id,
           admin_student_conversations!inner(student_id)`
        )
        .is('read_at', null)
        .eq('is_deleted', false);

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
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Realtime: reagir a mudanças nas mensagens para atualizar contadores globais
  useEffect(() => {
    const channelName = 'global-student-unread-counts';
    const channel = channelManager
      .subscribe(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_student_messages' },
        () => {
          fetchCounts();
        }
      );

    return () => {
      channelManager.unsubscribe(channelName);
    };
  }, [fetchCounts]);

  const getUnreadCount = (studentId: string): number => countsByStudent[studentId] || 0;

  return { countsByStudent, totalUnread, loading, refetch: fetchCounts, getUnreadCount };
};


