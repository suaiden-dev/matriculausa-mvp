import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserPlus,
  GraduationCap,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  Shield,
  Crown,
  CheckCircle,
  User,
  ChevronDown,
  Activity,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import AffiliateAdminNotifications from '../../components/AffiliateAdminNotifications';
import { useI20DeadlineMonitor } from '../../hooks/useI20DeadlineMonitor';

interface AffiliateAdminDashboardLayoutProps {
  user: any;
  children: React.ReactNode;
  onRefresh?: () => void;
}

const AffiliateAdminDashboardLayout: React.FC<AffiliateAdminDashboardLayoutProps> = ({
  user,
  children,
  onRefresh
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Monitorar deadlines do I-20
  useI20DeadlineMonitor({
    affiliateAdminId: user?.id || '',
    checkInterval: 5 * 60 * 1000 // Verificar a cada 5 minutos
  });

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/users')) return 'users';
    if (path.includes('/payments')) return 'payments';
    if (path.includes('/students')) return 'students';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/profile')) return 'profile';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3, path: '/affiliate-admin/dashboard', badge: null },
    { id: 'users', label: 'Seller Management', icon: Users, path: '/affiliate-admin/dashboard/users', badge: null },
    { id: 'payments', label: 'Payment Management', icon: CreditCard, path: '/affiliate-admin/dashboard/payments', badge: null },
    { id: 'students', label: 'Seller Tracking', icon: GraduationCap, path: '/affiliate-admin/dashboard/students', badge: null },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/affiliate-admin/dashboard/analytics', badge: null },
    { id: 'profile', label: 'Profile Settings', icon: Settings, path: '/affiliate-admin/dashboard/profile', badge: null }
  ];

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

          {/* Affiliate Admin Status */}
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-[#05294E] rounded-xl flex items-center justify-center shadow-lg">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">Affiliate Admin Panel</h3>
                <p className="text-sm text-slate-500 truncate">Affiliate Administrator</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center mt-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-[#05294E]">
                <Shield className="h-3 w-3 mr-1" />
                Affiliate Access
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
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
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
                aria-label="Open side menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              {/* Refresh Button */}
              {/* {onRefresh && (
                <button
                  onClick={() => onRefresh()}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  aria-label="Refresh data"
                  title="Refresh data"
                >
                  <Activity className="h-5 w-5" />
                </button>
              )} */}
              
              <div className="hidden md:block">
                {/* <h1 className="text-2xl font-bold text-slate-900">
                  {activeTab === 'overview' && 'Affiliate Admin Overview'}
                  {activeTab === 'users' && 'Seller Management'}
                  {activeTab === 'payments' && 'Payment Management'}
                  {activeTab === 'students' && 'Seller Tracking'}
                  {activeTab === 'analytics' && 'Analytics & Reports'}
                  {activeTab === 'profile' && 'Profile Settings'}
                </h1>
                <p className="text-slate-600">
                  {activeTab === 'overview' && 'Monitor your affiliate network performance and activity'}
                  {activeTab === 'users' && 'Promote existing users to sellers and manage your network'}
                  {activeTab === 'payments' && 'Manage commission earnings and payment requests'}
                  {activeTab === 'students' && 'Track student referrals and conversions'}
                  {activeTab === 'analytics' && 'Analyze affiliate performance and revenue metrics'}
                  {activeTab === 'profile' && 'Manage your affiliate admin settings'}
                </p> */}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <AffiliateAdminNotifications 
                affiliateAdminId={user?.id || ''}
                onNotificationClick={(notification) => {
                  if (notification.link) {
                    navigate(notification.link);
                  }
                }}
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
                    <p className="text-xs text-slate-500">Affiliate Administrator</p>
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
                      to="/affiliate-admin/dashboard/profile"
                      className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setSidebarOpen(false);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-3 text-slate-400" />
                      Profile Settings
                    </Link>
                    
                    <Link
                      to="/affiliate-admin/analytics"
                      className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setSidebarOpen(false);
                      }}
                    >
                      <Activity className="h-4 w-4 mr-3 text-slate-400" />
                      Activity Logs
                    </Link>
                    
                    <div className="border-t border-slate-200 my-2"></div>
                    
                    <button
                      onClick={async () => {
                        await logout();
                        navigate('/');
                      }}
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
        <main className="flex-1 p-6 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AffiliateAdminDashboardLayout;
