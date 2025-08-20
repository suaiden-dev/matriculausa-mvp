import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
  metadata: {
    student_name: string;
    student_email: string;
    scholarship_title: string;
    amount: number;
    transfer_id?: string;
  };
}

interface StripeConnectPaymentNotificationsProps {
  universityId: string;
}

const StripeConnectPaymentNotifications: React.FC<StripeConnectPaymentNotificationsProps> = ({ universityId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (universityId) {
      fetchNotifications();
    }
  }, [universityId]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('university_notifications')
        .select('*')
        .eq('university_id', universityId)
        .eq('type', 'stripe_connect_payment')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read_at).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('university_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-slate-600">Loading notifications...</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bell className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          No Payment Notifications
        </h3>
        <p className="text-slate-500 text-sm">
          When students pay application fees, you will receive notifications here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-600" />
          Payment Notifications
        </h3>
        {unreadCount > 0 && (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {unreadCount} unread
          </span>
        )}
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border transition-colors ${
              notification.read_at 
                ? 'bg-slate-50 border-slate-200' 
                : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <h4 className="font-medium text-slate-900">
                    {notification.title}
                  </h4>
                  {!notification.read_at && (
                    <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                  )}
                </div>
                
                <p className="text-sm text-slate-600 mb-4">
                  {notification.message}
                </p>

                <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 mb-3">
                  <div>
                    <span className="font-medium">Student:</span> {notification.metadata.student_name}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {notification.metadata.student_email}
                  </div>
                  <div>
                    <span className="font-medium">Scholarship:</span> {notification.metadata.scholarship_title}
                  </div>
                  <div>
                    <span className="font-medium">Amount:</span> {formatAmount(notification.metadata.amount)}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    {formatDate(notification.created_at)}
                  </div>
                  
                  {notification.metadata.transfer_id && (
                    <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      Transfer ID: {notification.metadata.transfer_id.slice(-8)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                {!notification.read_at && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-4 border-t border-slate-200">
        <button
          onClick={fetchNotifications}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
        >
          Refresh notifications
        </button>
      </div>
    </div>
  );
};

export default StripeConnectPaymentNotifications;
