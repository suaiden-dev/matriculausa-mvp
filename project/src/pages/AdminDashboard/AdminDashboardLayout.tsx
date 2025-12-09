import React, { useState } from 'react';
import AdminDashboardSkeleton from '../../components/AdminDashboardSkeleton';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Crown, 
  Building,
  Users, 
  Award, 
  Settings, 
  BarChart3,
  Search,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  DollarSign,
  Tag,
  Mail
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import AdminStudentChatNotifications from '../../components/AdminStudentChatNotifications';
import { useAdminStudentChatNotifications } from '../../hooks/useAdminStudentChatNotifications';
import { useUnreadMessagesCount } from '../../hooks/useUnreadMessagesCount';
import { useUnreadMessages } from '../../contexts/UnreadMessagesContext';

interface AdminDashboardLayoutProps {
  user: any;
  loading: boolean;
  children: React.ReactNode;
}

const AdminDashboardLayout: React.FC<AdminDashboardLayoutProps> = ({
  user,
  loading,
  children
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { unreadCount: serverUnreadCount } = useAdminStudentChatNotifications();
  const { unreadCount: contextUnreadCount, updateUnreadCount } = useUnreadMessages();
  const { unreadCount: messagesFallbackUnreadCount } = useUnreadMessagesCount();
  
  // Use context count if it's been updated, otherwise use server count
  const displayUnreadCount =
    contextUnreadCount > 0
      ? contextUnreadCount
      : serverUnreadCount > 0
        ? serverUnreadCount
        : messagesFallbackUnreadCount;
  
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/admin/dashboard/students')) return 'users';
    if (path.includes('/universities')) return 'universities';
    if (path.includes('/university-financial-management')) return 'university-financial-management';
    if (path.includes('/users')) return 'users';
    if (path.includes('/scholarships')) return 'scholarships';
    if (path.includes('/payments')) return 'payments';
    if (path.includes('/affiliate-payment-requests')) return 'affiliate-payment-requests';
    if (path.includes('/affiliate-management')) return 'affiliate-management';
    if (path.includes('/coupons')) return 'coupons';
    if (path.includes('/newsletter')) return 'newsletter';
    if (path.includes('/matricula-rewards')) return 'matricula-rewards';
    if (path.includes('/financial-analytics')) return 'financial-analytics';
    if (path.includes('/settings')) return 'settings';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const handleLogout = async () => {
    try {
      setSidebarOpen(false);
      await logout();
      // O logout já faz o redirecionamento, não precisamos fazer nada aqui
    } catch (error) {
      console.error('Error during logout:', error);
      // Mesmo com erro, fechar sidebar
      setSidebarOpen(false);
    }
  };

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need administrator privileges to access this page.</p>
        </div>
      </div>
    );
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3, path: '/admin/dashboard', badge: null },
    { id: 'users', label: 'Users', icon: Users, path: '/admin/dashboard/users', badge: null },
    { id: 'scholarships', label: 'Scholarships', icon: Award, path: '/admin/dashboard/scholarships', badge: null },
    { id: 'universities', label: 'Universities', icon: Building, path: '/admin/dashboard/universities', badge: null },
    { id: 'payments', label: 'Payment Management', icon: CreditCard, path: '/admin/dashboard/payments', badge: null },
    { id: 'financial-analytics', label: 'Financial Analytics', icon: BarChart3, path: '/admin/dashboard/financial-analytics', badge: null },
    { id: 'coupons', label: 'Coupons', icon: Tag, path: '/admin/dashboard/coupons', badge: null },
    { id: 'newsletter', label: 'Newsletter', icon: Mail, path: '/admin/dashboard/newsletter', badge: null },
    { id: 'affiliate-management', label: 'Affiliate Management', icon: Users, path: '/admin/dashboard/affiliate-management', badge: null },
    { id: 'matricula-rewards', label: 'Matricula Rewards', icon: Award, path: '/admin/dashboard/matricula-rewards', badge: null },
    { id: 'settings', label: 'Content Management', icon: Settings, path: '/admin/dashboard/settings', badge: null }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-slate-200">
            <Link to="/" className="flex items-center justify-center w-full">
              <img 
                src="/logo.png.png" 
                alt="Matrícula USA" 
                className="h-12 w-auto"
              />
            </Link>
            <button
              onClick={() => { setSidebarOpen(false); setUserMenuOpen(false); }}
              className="lg:hidden absolute right-4 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Fechar menu lateral"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Admin Status */}
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-[#05294E] rounded-xl flex items-center justify-center shadow-lg">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">Admin Panel</h3>
                <p className="text-sm text-slate-500 truncate">System Administrator</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center mt-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-[#05294E]">
                <Shield className="h-3 w-3 mr-1" />
                Full Access
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`group flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[#05294E] text-white shadow-lg'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      {item.id === 'users' && displayUnreadCount > 0 && (
                        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse ${
                          isActive 
                            ? 'bg-white ' 
                            : 'bg-blue-500'
                        }`}></div>
                      )}
                    </div>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-500">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* System Status */}
          <div className="px-4 py-4 border-t border-slate-200">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">System Status</h4>
                  <p className="text-xs text-slate-500">All systems operational</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => { setSidebarOpen(false); setUserMenuOpen(false); }}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => { setSidebarOpen(true); setUserMenuOpen(false); }}
                className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="Abrir menu lateral"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              <div className="hidden md:block">
                <h1 className="text-2xl font-bold text-slate-900">
                  {activeTab === 'overview' && 'Dashboard Overview'}
                  {activeTab === 'universities' && 'Universities'}
                  {activeTab === 'users' && 'Users'}
                  {activeTab === 'scholarships' && 'Scholarships'}
                  {activeTab === 'payments' && 'Payment Management'}
                  {activeTab === 'financial-analytics' && 'Financial Analytics'}
                  {activeTab === 'coupons' && 'Coupon Management'}
                  {activeTab === 'newsletter' && 'Newsletter Management'}
                  {activeTab === 'affiliate-management' && 'Affiliate Management'}
                  {activeTab === 'matricula-rewards' && 'Matricula Rewards'}
                  {activeTab === 'settings' && 'Content Management'}
                </h1>
                <p className="text-slate-600">
                  {activeTab === 'overview' && 'System overview and key metrics'}
                  {activeTab === 'universities' && 'Manage university partnerships'}
                  {activeTab === 'university-financial-management' && 'Monitor university revenues and financial data'}
                  {activeTab === 'users' && 'Manage student and user accounts'}
                  {activeTab === 'scholarships' && 'Manage scholarship programs'}
                  {activeTab === 'payments' && 'Payment processing and management'}
                  {activeTab === 'financial-analytics' && 'Financial reports and analytics'}
                  {activeTab === 'coupons' && 'Manage promotional coupons'}
                  {activeTab === 'newsletter' && 'Manage newsletter campaigns and user preferences'}
                  {activeTab === 'affiliate-management' && 'Affiliate partner management'}
                  {activeTab === 'matricula-rewards' && 'Reward system management'}
                  {activeTab === 'settings' && 'Content and system settings'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">

              {/* Notifications */}
              <AdminStudentChatNotifications 
                onNotificationClick={(notification) => {
                  // Navegar para a aba de mensagens quando clicar em uma notificação
                  if (notification.conversation_id) {
                    navigate(`/admin/dashboard/users?tab=messages&conversation=${notification.conversation_id}`);
                  }
                }}
                updateUnreadCountLocally={updateUnreadCount}
              />

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => { setUserMenuOpen(!userMenuOpen); setSidebarOpen(false); }}
                  className="flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-[#05294E] rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="font-semibold text-slate-900 text-sm">{user?.name}</p>
                    <p className="text-xs text-slate-500">System Administrator</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <p className="font-semibold text-slate-900">{user?.name}</p>
                      <p className="text-sm text-slate-500">{user?.email}</p>
                    </div>
                    
                    <Link
                      to="/admin/dashboard/settings"
                      className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setSidebarOpen(false);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-3 text-slate-400" />
                      System Settings
                    </Link>
                    
                    <div className="border-t border-slate-200 my-2"></div>
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardLayout;