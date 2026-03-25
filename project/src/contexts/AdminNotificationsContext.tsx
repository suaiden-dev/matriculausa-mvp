import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { channelManager } from '../lib/supabaseChannelManager';
import { throttle } from '../utils/debounce';
import { useUnreadMessages } from './UnreadMessagesContext';

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

interface AdminNotificationsContextType {
  notifications: AdminStudentChatNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const AdminNotificationsContext = createContext<AdminNotificationsContextType | undefined>(undefined);

export const AdminNotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { updateUnreadCount } = useUnreadMessages();
  const [notifications, setNotifications] = useState<AdminStudentChatNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user || user.role !== 'admin') return;

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
      
      const count = allNotifications.filter(n => !n.is_read).length;
      setUnreadCount(count);
      
      // ✅ Sincronizar com o contexto global
      updateUnreadCount(count);
      
    } catch (e: any) {
      console.error('[AdminNotificationsContext] Failed to fetch:', e);
      setError('Failed to fetch notifications.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role, updateUnreadCount]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    // Optimistic Update
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, is_read: true } 
          : notif
      )
    );
    
    setUnreadCount(prev => {
      const newCount = Math.max(0, prev - 1);
      updateUnreadCount(newCount);
      return newCount;
    });

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
      console.error('[AdminNotificationsContext] Error marking as read:', e);
    }
  }, [user?.id, notifications, updateUnreadCount]);

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    const conversationNotifications = notifications.filter(notif => notif.conversation_id === conversationId);
    if (conversationNotifications.length === 0) return;

    setNotifications(prev => 
      prev.filter(notif => notif.conversation_id !== conversationId)
    );
    
    setUnreadCount(prev => {
      const newCount = Math.max(0, prev - conversationNotifications.length);
      updateUnreadCount(newCount);
      return newCount;
    });

    try {
      const { error } = await supabase
        .rpc('mark_conversation_notifications_as_read', {
          conversation_id_param: conversationId
        });
      if (error) throw error;
    } catch (e: any) {
      console.error('[AdminNotificationsContext] Error marking conversation:', e);
      fetchNotifications(); // Refresh on error
    }
  }, [user?.id, notifications, updateUnreadCount, fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    updateUnreadCount(0);

    try {
      const { error: chatError } = await supabase
        .from('admin_student_chat_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .eq('is_read', false);
      if (chatError) throw chatError;
      
      const { error: systemError } = await supabase
        .from('admin_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (systemError) throw systemError;

    } catch (e: any) {
      console.error('[AdminNotificationsContext] Error marking all as read:', e);
      fetchNotifications();
    }
  }, [user?.id, updateUnreadCount, fetchNotifications]);

  // Initial fetch
  useEffect(() => {
    if (user?.id && user?.role === 'admin') {
      fetchNotifications();
    }
  }, [user?.id, user?.role, fetchNotifications]);

  const throttledFetch = useRef(
    throttle(() => {
      fetchNotifications();
    }, 3000)
  );

  // Realtime subscription
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const channelName = `admin-merged-notifications-ctx-${user.id}`;
    channelManager.subscribe(channelName)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'admin_student_chat_notifications',
        filter: `recipient_id=eq.${user.id}`
      }, () => throttledFetch.current())
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'admin_notifications',
        filter: `user_id=eq.${user.id}`
      }, () => throttledFetch.current());

    return () => {
      channelManager.unsubscribe(channelName);
    };
  }, [user?.id, user?.role]);

  const value = React.useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markConversationAsRead,
    markAllAsRead,
  }), [
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markConversationAsRead,
    markAllAsRead
  ]);

  return (
    <AdminNotificationsContext.Provider value={value}>
      {children}
    </AdminNotificationsContext.Provider>
  );
};

export const useAdminNotifications = () => {
  const context = useContext(AdminNotificationsContext);
  if (context === undefined) {
    throw new Error('useAdminNotifications must be used within an AdminNotificationsProvider');
  }
  return context;
};
