import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { channelManager } from '../lib/supabaseChannelManager';

export interface AdminStudentChatNotification {
  id: string;
  conversation_id: string;
  message_id: string;
  title: string;
  message: string;
  notification_type: 'message' | 'system' | 'alert';
  created_at: string;
  sender_name: string;
  sender_role: string;
  metadata: any;
}

export const useAdminStudentChatNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AdminStudentChatNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_unread_admin_student_chat_notifications', {
          user_id_param: user.id
        });

      if (fetchError) throw fetchError;

      setNotifications(data || []);
      setUnreadCount(data?.length || 0);
    } catch (e: any) {
      console.error('Failed to fetch notifications:', e);
      setError('Failed to fetch notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .rpc('mark_admin_student_chat_notification_as_read', {
          notification_id: notificationId
        });

      if (error) throw error;

      // Atualizar estado local
      setNotifications(prev => 
        prev.filter(notif => notif.id !== notificationId)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e: any) {
      console.error('Failed to mark notification as read:', e);
    }
  }, [user]);

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    // Atualizar estado local imediatamente
    const conversationNotifications = notifications.filter(notif => notif.conversation_id === conversationId);
    setNotifications(prev => 
      prev.filter(notif => notif.conversation_id !== conversationId)
    );
    setUnreadCount(prev => Math.max(0, prev - conversationNotifications.length));

    try {
      const { error } = await supabase
        .rpc('mark_conversation_notifications_as_read', {
          conversation_id_param: conversationId
        });

      if (error) throw error;
    } catch (e: any) {
      console.error('Failed to mark conversation notifications as read:', e);
      // Reverter mudanças locais em caso de erro
      setNotifications(prev => [...prev, ...conversationNotifications]);
      setUnreadCount(prev => prev + conversationNotifications.length);
    }
  }, [user, notifications]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    // Atualizar estado local imediatamente
    const currentNotifications = [...notifications];
    setNotifications([]);
    setUnreadCount(0);

    try {
      // Marcar todas as notificações como lidas
      const { error } = await supabase
        .from('admin_student_chat_notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    } catch (e: any) {
      console.error('Failed to mark all notifications as read:', e);
      // Reverter mudanças locais em caso de erro
      setNotifications(currentNotifications);
      setUnreadCount(currentNotifications.length);
    }
  }, [user, notifications]);

  // Buscar notificações quando o usuário muda
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // Configurar real-time para notificações
  useEffect(() => {
    if (!user) return;

    const channelName = `admin-student-chat-notifications-${user.id}`;

    const channel = channelManager.subscribe(channelName)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'admin_student_chat_notifications',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload: any) => {
          // Buscar a notificação completa
          supabase
            .rpc('get_unread_admin_student_chat_notifications', {
              user_id_param: user.id
            })
            .then(({ data, error }) => {
              if (!error && data) {
                setNotifications(data);
                setUnreadCount(data.length);
              }
            });
        }
      );

    return () => {
      channelManager.unsubscribe(channelName);
    };
  }, [user]);

  // Função para atualizar contador localmente (sem requisição ao banco)
  const updateUnreadCountLocally = useCallback((newCount: number) => {
    setUnreadCount(Math.max(0, newCount));
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markConversationAsRead,
    markAllAsRead,
    updateUnreadCountLocally,
  };
};
