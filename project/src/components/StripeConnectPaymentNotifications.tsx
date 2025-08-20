import React, { useState, useEffect } from 'react'
import { Bell, DollarSign, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface StripeConnectNotification {
  id: string
  title: string
  message: string
  created_at: string
  metadata: {
    student_name: string
    student_email: string
    scholarship_title: string
    amount: number
    transfer_id: string
    payment_method: string
  }
  read_at: string | null
}

interface StripeConnectPaymentNotificationsProps {
  universityId: string
}

export const StripeConnectPaymentNotifications: React.FC<StripeConnectPaymentNotificationsProps> = ({ 
  universityId 
}) => {
  const [notifications, setNotifications] = useState<StripeConnectNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchNotifications()
  }, [universityId])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('university_notifications')
        .select('*')
        .eq('university_id', universityId)
        .eq('type', 'stripe_connect_payment')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error fetching notifications:', error)
        return
      }

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.read_at).length || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('university_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) {
        console.error('Error marking notification as read:', error)
        return
      }

      // Atualizar estado local
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center p-6 text-gray-500">
        <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nenhuma notificação de pagamento
        </h3>
        <p className="text-sm text-gray-500">
          Quando estudantes pagarem taxas de aplicação, você receberá notificações aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-600" />
          Notificações de Pagamentos Stripe Connect
        </h3>
        {unreadCount > 0 && (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {unreadCount} não lidas
          </span>
        )}
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border ${
              notification.read_at 
                ? 'bg-gray-50 border-gray-200' 
                : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <h4 className="font-medium text-gray-900">
                    {notification.title}
                  </h4>
                  {!notification.read_at && (
                    <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {notification.message}
                </p>

                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                  <div>
                    <span className="font-medium">Estudante:</span> {notification.metadata.student_name}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {notification.metadata.student_email}
                  </div>
                  <div>
                    <span className="font-medium">Bolsa:</span> {notification.metadata.scholarship_title}
                  </div>
                  <div>
                    <span className="font-medium">Valor:</span> {formatAmount(notification.metadata.amount)}
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-400">
                  {formatDate(notification.created_at)}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                {notification.metadata.transfer_id && (
                  <div className="text-xs text-gray-500">
                    Transfer ID: {notification.metadata.transfer_id.slice(-8)}
                  </div>
                )}
                
                {!notification.read_at && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Marcar como lida
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-4">
        <button
          onClick={fetchNotifications}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Atualizar notificações
        </button>
      </div>
    </div>
  )
}
