import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Trash2 } from 'lucide-react';
import { useAffiliateAdminNotifications } from '../hooks/useAffiliateAdminNotifications';

interface AffiliateAdminNotificationsProps {
  affiliateAdminId: string;
  onNotificationClick?: (notification: any) => void;
}

const AffiliateAdminNotifications: React.FC<AffiliateAdminNotificationsProps> = ({
  affiliateAdminId,
  onNotificationClick
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    requestNotificationPermission
  } = useAffiliateAdminNotifications({
    affiliateAdminId,
    onNotificationReceived: (notification) => {
      console.log('🔔 Nova notificação recebida para affiliate admin:', notification);
    }
  });

  // Solicitar permissão para notificações nativas na primeira renderização
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.notifications-container')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleNotificationClick = async (notification: any) => {
    try {
      if (notification && !notification.read_at) {
        await markAsRead(notification.id);
      }
    } catch {}
    
    setShowDropdown(false);
    setShowModal(false);
    
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch {}
  };

  const handleClearAll = async () => {
    try {
      await clearAll();
    } catch {}
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'i20_deadline_expired':
        return '⚠️';
      case 'payment_received':
        return '💰';
      case 'student_status_change':
        return '📋';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'i20_deadline_expired':
        return 'text-red-600 bg-red-50';
      case 'payment_received':
        return 'text-green-600 bg-green-50';
      case 'student_status_change':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <>
      {/* Notifications Bell */}
      <div className="relative notifications-container">
        <button
          onClick={() => {
            // Em mobile, abre modal; em desktop, abre dropdown
            if (window.innerWidth < 768) {
              setShowModal(true);
            } else {
              setShowDropdown(!showDropdown);
            }
          }}
          className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="h-5 w-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-medium min-w-[20px]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown - only show on desktop */}
        {showDropdown && (
          <div className="hidden md:block absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
            <div className="px-4 pb-2 border-b border-slate-200 font-semibold text-slate-900 flex items-center justify-between">
              <span>Notifications</span>
              <div className="flex items-center gap-2 text-xs">
                <button onClick={handleMarkAllAsRead} className="text-blue-600 hover:underline">Mark all as read</button>
                <span className="text-slate-300">|</span>
                <button onClick={handleClearAll} className="text-red-600 hover:underline">Clear</button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500">No notifications</div>
              ) : (
                notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`px-4 py-3 hover:bg-slate-50 cursor-pointer ${!notification.read_at ? 'bg-slate-50' : ''}`} 
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="text-sm font-medium text-slate-900 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getNotificationIcon(notification.notification_type)}</span>
                        <span>{notification.title}</span>
                      </div>
                      {!notification.read_at && <span className="ml-2 h-2 w-2 rounded-full bg-blue-500 inline-block"></span>}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">{notification.message}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{new Date(notification.created_at).toLocaleString()}</div>
                    {notification.notification_type && (
                      <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getNotificationColor(notification.notification_type)}`}>
                        {notification.notification_type.replace('_', ' ').toUpperCase()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notifications Modal - for mobile */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200">
              <div className="flex items-center gap-2 text-xs">
                <button onClick={handleMarkAllAsRead} className="text-blue-600 hover:underline flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Mark all as read
                </button>
                <span className="text-slate-300">|</span>
                <button onClick={handleClearAll} className="text-red-600 hover:underline flex items-center gap-1">
                  <Trash2 className="h-3 w-3" />
                  Clear
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500 text-center">No notifications</div>
              ) : (
                notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 ${!notification.read_at ? 'bg-slate-50' : ''}`} 
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="text-sm font-medium text-slate-900 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getNotificationIcon(notification.notification_type)}</span>
                        <span>{notification.title}</span>
                      </div>
                      {!notification.read_at && <span className="ml-2 h-2 w-2 rounded-full bg-blue-500 inline-block"></span>}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">{notification.message}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{new Date(notification.created_at).toLocaleString()}</div>
                    {notification.notification_type && (
                      <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getNotificationColor(notification.notification_type)}`}>
                        {notification.notification_type.replace('_', ' ').toUpperCase()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AffiliateAdminNotifications;
