import React, { useState } from 'react';
import { Bell, MessageSquare, X, Check, CheckCheck } from 'lucide-react';
import { useAdminStudentChatNotifications, AdminStudentChatNotification } from '../hooks/useAdminStudentChatNotifications';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import AdminNotificationsModal from './AdminNotificationsModal';

interface AdminStudentChatNotificationsProps {
  onNotificationClick?: (notification: AdminStudentChatNotification) => void;
  updateUnreadCountLocally?: (newCount: number) => void;
  className?: string;
}

const AdminStudentChatNotifications: React.FC<AdminStudentChatNotificationsProps> = ({
  onNotificationClick,
  updateUnreadCountLocally,
  className = ''
}) => {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead
  } = useAdminStudentChatNotifications();
  
  const { decrementUnreadCount, resetUnreadCount } = useUnreadMessages();

  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleNotificationClick = (notification: AdminStudentChatNotification) => {
    markAsRead(notification.id);
    // Decrement local counter immediately
    decrementUnreadCount();
    onNotificationClick?.(notification);
    setIsOpen(false);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    // Reset local counter immediately
    resetUnreadCount();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'system':
        return <Bell className="h-4 w-4" />;
      case 'alert':
        return <Bell className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string, isRead: boolean) => {
    // If read, use grayscale/muted colors
    if (isRead) {
       return 'text-gray-400 bg-gray-100 border-gray-200';
    }

    switch (type) {
      case 'message':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'system':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'alert':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Notifications Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {isOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Notifications Panel */}
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-96 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white z-10">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <CheckCheck className="h-3 w-3" />
                      Mark all as read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto flex-1">
                {loading && notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    Loading notifications...
                  </div>
                ) : error ? (
                  <div className="px-4 py-8 text-center text-red-500">
                    Error loading notifications
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                        notification.is_read 
                          ? 'bg-gray-50 hover:bg-gray-100 opacity-75' 
                          : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg border ${getNotificationColor(notification.notification_type, !!notification.is_read)}`}>
                          {getNotificationIcon(notification.notification_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm font-medium truncate ${notification.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                              {notification.title}
                            </h4>
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                                locale: enUS
                              })}
                            </span>
                          </div>
                          <p className={`text-sm mt-1 line-clamp-2 ${notification.is_read ? 'text-gray-500' : 'text-gray-600'}`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">
                              From: {notification.sender_name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 sticky bottom-0 z-10">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsModalOpen(true);
                  }}
                  className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all notifications
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <AdminNotificationsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default AdminStudentChatNotifications;
