import React, { useState, useEffect } from 'react';
import { X, Search, Filter, Bell, MessageSquare, Check, Calendar, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { formatDistanceToNow, format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface AdminNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  is_read: boolean;
  created_at: string;
  metadata: any;
}

const AdminNotificationsModal: React.FC<AdminNotificationsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'payment' | 'system' | 'message'>('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = async (isRefresh = false) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Build query for admin_notifications (system/payment)
      let query = supabase
        .from('admin_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(page * 20, (page + 1) * 20 - 1);

      if (searchTerm) {
        query = query.ilike('message', `%${searchTerm}%`);
      }

      if (filterType !== 'all') {
        if (filterType === 'message') {
           // We are only querying admin_notifications here for history, 
           // assuming messages are transient or we need another query.
           // For this implementation, we focus on persistent system notifications.
           // To support messages, we'd need a complex union or separate fetch.
           // For now, let's filter system types.
           // If 'message' is selected, this table returns empty unless 'message' type exists there.
        } else {
           query = query.eq('type', filterType);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      if (isRefresh) {
        setNotifications(data || []);
      } else {
        setNotifications(prev => [...prev, ...data]);
      }
      
      if ((data?.length || 0) < 20) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPage(0);
      setHasMore(true);
      fetchNotifications(true);
    }
  }, [isOpen, searchTerm, filterType]);

  const loadMore = () => {
    setPage(prev => prev + 1);
    fetchNotifications();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">All Notifications</h2>
            <p className="text-sm text-gray-500">History of all system alerts and updates</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input 
              type="text"
              placeholder="Search notifications..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {[
              { id: 'all', label: 'All' },
              { id: 'payment', label: 'Payments' },
              { id: 'system', label: 'System' },
              // { id: 'message', label: 'Messages' } // Hiding for now as we query single table
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setFilterType(type.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filterType === type.id 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6" id="notifications-scroll-container">
          {notifications.length === 0 && !loading ? (
             <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
               <Bell className="h-12 w-12 text-gray-300 mb-4" />
               <p className="text-lg font-medium">No notifications found</p>
               <p className="text-sm">Try adjusting your search or filters</p>
             </div>
          ) : (
             <div className="space-y-3">
               {notifications.map((notification) => (
                 <div 
                   key={notification.id}
                   className={`group flex items-start p-4 rounded-xl border transition-all ${
                     notification.is_read 
                       ? 'bg-white border-gray-100 opacity-75 hover:opacity-100 hover:border-gray-300' 
                       : 'bg-blue-50 border-blue-100 shadow-sm'
                   }`}
                 >
                   <div className={`p-3 rounded-lg mr-4 ${
                     notification.type === 'payment' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                   }`}>
                     {notification.type === 'payment' ? <Check className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                   </div>
                   
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center justify-between mb-1">
                       <h3 className={`text-base font-semibold ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                         {notification.title}
                       </h3>
                       <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                         {format(new Date(notification.created_at), 'MMM d, yyyy HH:mm', { locale: enUS })}
                       </span>
                     </div>
                     <p className={`text-sm ${notification.is_read ? 'text-gray-500' : 'text-gray-700'} mb-2`}>
                       {notification.message}
                     </p>
                     
                     <div className="flex items-center justify-between mt-2">
                       <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                         {notification.type}
                       </span>
                       
                       {notification.link && (
                         <a 
                           href={notification.link}
                           onClick={(e) => {
                             e.preventDefault();
                             onClose();
                             window.location.hash = '#' + notification.link; // Or use navigate if passed as prop
                           }}
                           className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                           View Details <ChevronRight className="h-4 w-4" />
                         </a>
                       )}
                     </div>
                   </div>
                 </div>
               ))}
               
               {loading && (
                 <div className="w-full py-4 flex justify-center">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                 </div>
               )}
               
               {hasMore && !loading && (
                 <button 
                   onClick={loadMore}
                   className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 font-medium rounded-lg transition-colors text-sm"
                 >
                   Load More Notifications
                 </button>
               )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationsModal;
