import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface AffiliateAdminNotification {
  id: string;
  title: string;
  message: string;
  link?: string;
  read_at?: string;
  created_at: string;
  notification_type: 'general' | 'i20_deadline_expired' | 'payment_received' | 'student_status_change';
  metadata?: any;
}

interface AffiliateAdminNotificationsConfig {
  affiliateAdminId: string;
  onNotificationReceived?: (notification: AffiliateAdminNotification) => void;
}

export const useAgencyNotifications = ({ 
  affiliateAdminId,
  onNotificationReceived 
}: AffiliateAdminNotificationsConfig) => {
  const [notifications, setNotifications] = useState<AffiliateAdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const lastCheckRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Detectar quando o usuário volta para a aba
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    const handleOnlineChange = () => {
      setIsOnline(navigator.onLine);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnlineChange);
    window.addEventListener('offline', handleOnlineChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnlineChange);
      window.removeEventListener('offline', handleOnlineChange);
    };
  }, []);

  // Função para buscar notificações
  const fetchNotifications = async (checkNewOnly = false) => {
    if (!isOnline || !affiliateAdminId) return;

    try {
      let query = supabase
        .from('affiliate_admin_notifications')
        .select('*')
        .eq('affiliate_admin_id', affiliateAdminId)
        .order('created_at', { ascending: false });

      // Se estamos verificando apenas novas, filtrar por timestamp
      if (checkNewOnly && lastCheckRef.current) {
        query = query.gt('created_at', lastCheckRef.current);
      } else {
        query = query.limit(20);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar notificações do affiliate admin:', error);
        return;
      }

      if (checkNewOnly && data && data.length > 0) {
        // Novas notificações encontradas
        console.log(`📩 ${data.length} nova(s) notificação(ões) encontrada(s) para affiliate admin`);
        
        setNotifications(prev => {
          const combined = [...data, ...prev];
          const unique = combined.filter((item, index, self) => 
            index === self.findIndex(t => t.id === item.id)
          );
          return unique.slice(0, 20);
        });

        // Notificar sobre novas notificações
        data.forEach(notification => {
          if (onNotificationReceived) {
            onNotificationReceived(notification);
          }
          
          // Notificação nativa do browser
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico'
            });
          }
        });

        setUnreadCount(prev => prev + data.filter(n => !n.read_at).length);
      } else if (!checkNewOnly) {
        // Carregamento inicial
        setNotifications(data || []);
        setUnreadCount((data || []).filter(n => !n.read_at).length);
      }

      // Atualizar timestamp da última verificação
      if (data && data.length > 0) {
        lastCheckRef.current = data[0].created_at;
      } else if (!lastCheckRef.current) {
        lastCheckRef.current = new Date().toISOString();
      }

    } catch (error) {
      console.error('Erro ao verificar notificações do affiliate admin:', error);
    }
  };

  // Configurar polling inteligente
  useEffect(() => {
    if (!affiliateAdminId) return;

    // Carregamento inicial
    fetchNotifications(false);

    // Configurar intervalo baseado na visibilidade da aba
    const setupPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      const interval = isVisible && isOnline ? 10000 : 30000; // 10s ativo, 30s em background
      
      intervalRef.current = setInterval(() => {
        fetchNotifications(true); // Verificar apenas novas
      }, interval);
    };

    setupPolling();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [affiliateAdminId, isVisible, isOnline]);

  // Marcar como lida
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('affiliate_admin_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('affiliate_admin_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('affiliate_admin_id', affiliateAdminId)
        .is('read_at', null);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  // Limpar todas as notificações
  const clearAll = async () => {
    try {
      const { error } = await supabase
        .from('affiliate_admin_notifications')
        .delete()
        .eq('affiliate_admin_id', affiliateAdminId);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Erro ao limpar notificações:', error);
    }
  };

  // Solicitar permissão para notificações
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  // Criar notificação para deadline expirado do I-20
  const createI20DeadlineExpiredNotification = async (studentId: string, studentName: string, sellerName: string) => {
    try {
      const { error } = await supabase
        .from('affiliate_admin_notifications')
        .insert({
          affiliate_admin_id: affiliateAdminId,
          title: 'I-20 Control Fee Deadline Expired',
          message: `Student ${studentName} referred by ${sellerName} has exceeded the I-20 Control Fee deadline. Immediate action required.`,
          link: `/agency/dashboard/sales?student=${studentId}`,
          notification_type: 'i20_deadline_expired',
          metadata: {
            student_id: studentId,
            student_name: studentName,
            seller_name: sellerName,
            deadline_expired_at: new Date().toISOString()
          }
        });

      if (error) throw error;
      console.log('✅ Notificação de deadline expirado criada para affiliate admin');
    } catch (error) {
      console.error('❌ Erro ao criar notificação de deadline expirado:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    isOnline,
    markAsRead,
    markAllAsRead,
    clearAll,
    requestNotificationPermission,
    createI20DeadlineExpiredNotification,
    refresh: () => fetchNotifications(false)
  };
};
