import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { channelManager } from '../lib/supabaseChannelManager';
import { throttle } from '../utils/debounce';

export interface AdminStudentChatNotification {
  id: string;
  conversation_id?: string;
  message_id?: string;
  title: string;
  message: string;
  notification_type: 'message' | 'system' | 'alert' | 'payment';
  created_at: string;
  sender_name: string;
  sender_role: string;
  metadata: any;
  source: 'chat' | 'system_table';
  link?: string;
  is_read?: boolean;
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
      // 1. Fetch Chat Notifications
      const { data: chatData, error: fetchError } = await supabase
        .rpc('get_unread_admin_student_chat_notifications', {
          user_id_param: user.id
        });

      if (fetchError) throw fetchError;

      const formattedChatNotifications: AdminStudentChatNotification[] = (chatData || []).map((n: any) => ({
        ...n,
        source: 'chat',
        is_read: false
      }));

      // 2. Fetch System/Payment Notifications from admin_notifications
      // We fetch unread AND recent read ones to keep context in the dropdown
      const { data: systemData, error: systemError } = await supabase
        .from('admin_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (systemError) throw systemError;

      const formattedSystemNotifications: AdminStudentChatNotification[] = (systemData || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        notification_type: n.type || 'system',
        created_at: n.created_at,
        sender_name: 'System', 
        sender_role: 'system',
        metadata: n.metadata,
        source: 'system_table',
        link: n.link,
        conversation_id: undefined,
        message_id: undefined,
        is_read: n.is_read
      }));

      // Merge and Sort
      const allNotifications = [...formattedChatNotifications, ...formattedSystemNotifications].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(allNotifications);
      
      // Calculate unread count strictly
      const count = allNotifications.filter(n => !n.is_read).length;
      setUnreadCount(count);
      
    } catch (e: any) {
      console.error('Failed to fetch notifications:', e);
      setError('Failed to fetch notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    // Optimistic Update: Set is_read = true locally immediately
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, is_read: true } 
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      if (notification.source === 'chat') {
        const { error } = await supabase
          .rpc('mark_admin_student_chat_notification_as_read', {
            notification_id: notificationId
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', notificationId);
        if (error) throw error;
      }
    } catch (e: any) {
      console.error('Failed to mark notification as read:', e);
      // Revert if error? For now, we keep optimistic state to avoid flickering
    }
  }, [user, notifications]);

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

    // Optimistic Update: Mark all as read locally
    const currentNotifications = [...notifications];
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      // 1. Mark Chat Notifications as read
      const chatNotificationIds = currentNotifications.filter(n => n.source === 'chat' && !n.is_read).map(n => n.id);
      if (chatNotificationIds.length > 0) {
          const { error: chatError } = await supabase
            .from('admin_student_chat_notifications')
            .update({ 
              is_read: true, 
              read_at: new Date().toISOString() 
            })
            .eq('recipient_id', user.id)
            .eq('is_read', false);
          if (chatError) throw chatError;
      }

      // 2. Mark System Notifications as read
      const systemNotificationIds = currentNotifications.filter(n => n.source === 'system_table' && !n.is_read).map(n => n.id);
      if (systemNotificationIds.length > 0) {
          const { error: systemError } = await supabase
            .from('admin_notifications')
            .update({ 
               is_read: true, 
               read_at: new Date().toISOString() 
            })
            .eq('user_id', user.id)
            .eq('is_read', false);
          if (systemError) throw systemError;
      }

    } catch (e: any) {
      console.error('Failed to mark all notifications as read:', e);
      // Revert changes on error
      setNotifications(currentNotifications);
      setUnreadCount(currentNotifications.filter(n => !n.is_read).length); // Recalculate unread
    }
  }, [user, notifications]);

  // Buscar notificações quando o usuário muda
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // ✅ OTIMIZAÇÃO: Throttle para evitar chamadas excessivas em eventos real-time
  const throttledFetchNotifications = useRef(
    throttle(() => {
       fetchNotifications(); // Chama a função unificada
    }, 3000)
  );

  // Configurar real-time para notificações (AMBAS as tabelas)
  useEffect(() => {
    if (!user) return;

    const channelName = `admin-merged-notifications-${user.id}`;

    const channel = channelManager.subscribe(channelName)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'admin_student_chat_notifications',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          throttledFetchNotifications.current();
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'admin_notifications',
          filter: `user_id=eq.${user.id}`  // Atenção: aqui na nova tabela é user_id
        },
        () => {
          throttledFetchNotifications.current();
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
