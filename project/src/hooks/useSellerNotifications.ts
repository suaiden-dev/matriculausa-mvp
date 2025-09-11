import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface SellerNotification {
  id: string;
  title: string;
  message: string;
  link?: string;
  read_at?: string;
  created_at: string;
  notification_type: 'general' | 'i20_deadline_expired' | 'payment_received' | 'student_status_change' | 'commission_earned';
  metadata?: any;
}

interface SellerNotificationsConfig {
  sellerId: string;
  onNotificationReceived?: (notification: SellerNotification) => void;
}

export const useSellerNotifications = ({ 
  sellerId,
  onNotificationReceived 
}: SellerNotificationsConfig) => {
  const [notifications, setNotifications] = useState<SellerNotification[]>([]);
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
    if (!isOnline || !sellerId) return;

    try {
      let query = supabase
        .from('seller_notifications')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      // Se estamos verificando apenas novas, filtrar por timestamp
      if (checkNewOnly && lastCheckRef.current) {
        query = query.gt('created_at', lastCheckRef.current);
      } else {
        query = query.limit(20);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar notificações do seller:', error);
        return;
      }

      if (checkNewOnly && data && data.length > 0) {
        // Novas notificações encontradas
        console.log(`📩 ${data.length} nova(s) notificação(ões) encontrada(s) para seller`);
        
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
      console.error('Erro ao verificar notificações do seller:', error);
    }
  };

  // Configurar polling inteligente
  useEffect(() => {
    if (!sellerId) return;

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
  }, [sellerId, isVisible, isOnline]);

  // Marcar como lida
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('seller_notifications')
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
        .from('seller_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('seller_id', sellerId)
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
        .from('seller_notifications')
        .delete()
        .eq('seller_id', sellerId);

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
  const createI20DeadlineExpiredNotification = async (studentId: string, studentName: string) => {
    try {
      const { error } = await supabase
        .from('seller_notifications')
        .insert({
          seller_id: sellerId,
          title: 'I-20 Control Fee Deadline Expired',
          message: `Your referred student ${studentName} has exceeded the I-20 Control Fee deadline. Please contact them immediately.`,
          link: `/seller/dashboard/students?student=${studentId}`,
          notification_type: 'i20_deadline_expired',
          metadata: {
            student_id: studentId,
            student_name: studentName,
            deadline_expired_at: new Date().toISOString()
          }
        });

      if (error) throw error;
      console.log('✅ Notificação de deadline expirado criada para seller');
    } catch (error) {
      console.error('❌ Erro ao criar notificação de deadline expirado:', error);
    }
  };

  // Criar notificação para pagamento recebido
  const createPaymentReceivedNotification = async (studentId: string, studentName: string, amount: number, feeType: string) => {
    try {
      const { error } = await supabase
        .from('seller_notifications')
        .insert({
          seller_id: sellerId,
          title: 'Payment Received',
          message: `Your referred student ${studentName} has paid ${feeType} of $${amount.toFixed(2)}. Commission will be calculated.`,
          link: `/seller/dashboard/students?student=${studentId}`,
          notification_type: 'payment_received',
          metadata: {
            student_id: studentId,
            student_name: studentName,
            amount: amount,
            fee_type: feeType,
            payment_received_at: new Date().toISOString()
          }
        });

      if (error) throw error;
      console.log('✅ Notificação de pagamento recebido criada para seller');
    } catch (error) {
      console.error('❌ Erro ao criar notificação de pagamento recebido:', error);
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
    createPaymentReceivedNotification,
    refresh: () => fetchNotifications(false)
  };
};
