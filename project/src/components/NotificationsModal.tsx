import React from 'react';
import { X } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  link?: string;
  read_at?: string;
  created_at: string;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onNotificationClick,
  onMarkAllAsRead,
  onClearAll
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-4 top-20 bottom-20 sm:inset-x-6 sm:top-24 sm:bottom-24 lg:left-1/2 lg:top-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-96 lg:h-auto lg:max-h-[80vh] bg-white rounded-xl shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3 text-sm">
            <button 
              onClick={onMarkAllAsRead}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Mark all as read
            </button>
            <span className="text-slate-300">|</span>
            <button 
              onClick={onClearAll}
              className="text-red-600 hover:text-red-800 font-medium transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5c-3.8 0-7-3.2-7-7s3.2-7 7-7 7 3.2 7 7c0 1.1-.3 2.1-.7 3" />
                </svg>
              </div>
              <p className="text-slate-500 text-center">No notifications</p>
              <p className="text-slate-400 text-sm text-center mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => onNotificationClick(notification)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                    !notification.read_at ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-slate-900 truncate">
                          {notification.title}
                        </h3>
                        {!notification.read_at && (
                          <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationsModal;
