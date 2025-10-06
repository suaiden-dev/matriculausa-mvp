import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  link?: string;
  read_at?: string;
  created_at: string;
}

interface SmartPollingNotificationsConfig {
  userType: 'student' | 'university';
  userId: string;
  universityId?: string; // Para notificações da universidade
  onNotificationReceived?: (notification: Notification) => void;
}

export const useSmartPollingNotifications = ({ 
  userType,
  userId, 
  universityId,
  onNotificationReceived 
}: SmartPollingNotificationsConfig) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
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

  // Função para buscar notificações com retry logic
  const fetchNotifications = async (checkNewOnly = false, retryCount = 0) => {
    if (!isOnline) return;

    try {
      let query;

      if (userType === 'student') {
        if (!userId) return;
        
        // Buscar student_id
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (!profileData) return;

        query = supabase
          .from('student_notifications')
          .select('*')
          .eq('student_id', profileData.id)
          .order('created_at', { ascending: false });
      } else {
        // userType === 'university'
        if (!universityId) return;

        query = supabase
          .from('university_notifications')
          .select('*')
          .eq('university_id', universityId)
          .order('created_at', { ascending: false });
      }

      // Se estamos verificando apenas novas, filtrar por timestamp
      if (checkNewOnly && lastCheckRef.current) {
        query = query.gt('created_at', lastCheckRef.current);
      } else {
        query = query.limit(20);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar notificações:', error);
        return;
      }

      if (checkNewOnly && data && data.length > 0) {
        // Novas notificações encontradas
        console.log(`📩 ${data.length} nova(s) notificação(ões) encontrada(s) para ${userType}`);
        
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
      console.error('Erro ao verificar notificações:', error);
      
      // Retry logic para erros de rede
      if (retryCount < 3 && (error as any)?.message?.includes('Failed to fetch')) {
        console.log(`🔄 Tentativa ${retryCount + 1}/3 de reconexão...`);
        setTimeout(() => {
          fetchNotifications(checkNewOnly, retryCount + 1);
        }, 2000 * (retryCount + 1)); // Backoff exponencial
      }
    }
  };

  // Configurar polling inteligente
  useEffect(() => {
    const shouldFetch = userType === 'student' ? userId : universityId;
    if (!shouldFetch) return;

    // Carregamento inicial
    fetchNotifications(false);

    // Configurar intervalo baseado na visibilidade da aba
    const setupPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // AUMENTAR intervalos para reduzir requisições
      const interval = isVisible && isOnline ? 300000 : 600000; // 5min ativo, 10min em background
      
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
  }, [userId, universityId, userType, isVisible, isOnline]);

  // Marcar como lida
  const markAsRead = async (notificationId: string) => {
    try {
      const tableName = userType === 'student' ? 'student_notifications' : 'university_notifications';
      
      const { error } = await supabase
        .from(tableName)
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
      if (userType === 'student') {
        if (!userId) return;

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (!profileData) return;

        const { error } = await supabase
          .from('student_notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('student_id', profileData.id)
          .is('read_at', null);

        if (error) throw error;
      } else {
        // userType === 'university'
        if (!universityId) return;

        const { error } = await supabase
          .from('university_notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('university_id', universityId)
          .is('read_at', null);

        if (error) throw error;
      }

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
      if (userType === 'student') {
        if (!userId) return;

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (!profileData) return;

        const { error } = await supabase
          .from('student_notifications')
          .delete()
          .eq('student_id', profileData.id);

        if (error) throw error;
      } else {
        // userType === 'university'
        if (!universityId) return;

        const { error } = await supabase
          .from('university_notifications')
          .delete()
          .eq('university_id', universityId);

        if (error) throw error;
      }

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

  return {
    notifications,
    unreadCount,
    isOnline,
    markAsRead,
    markAllAsRead,
    clearAll,
    requestNotificationPermission,
    refresh: () => fetchNotifications(false)
  };
};
