import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Building, 
  Award, 
  Edit, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Settings, 
  Home,
  Users,
  BarChart3,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  Shield,
  Brain,
  Mail,
  MessageSquare,
  Gift,
  Bell,
  UserCheck,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUniversity } from '../../context/UniversityContext';
import { useSmartPollingNotifications } from '../../hooks/useSmartPollingNotifications';
import NotificationsModal from '../../components/NotificationsModal';
import PaymentNotifications from '../../components/PaymentNotifications';
import { useEnvironment } from '../../hooks/useEnvironment';
import FeatureBlockedMessage from '../../components/FeatureBlockedMessage';

interface SchoolDashboardLayoutProps {
  user: any;
  children: React.ReactNode;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  path: string;
  badge: string | null;
  status?: 'em_desenvolvimento';
  dropdown?: SidebarItem[];
}

const SchoolDashboardLayout: React.FC<SchoolDashboardLayoutProps> = ({ user, children }) => {
  // Estado para dropdowns da sidebar
  const [dropdownOpen, setDropdownOpen] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { university, loading } = useUniversity();
  const [showNotif, setShowNotif] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  // Hook para detectar ambiente
  const { isProduction } = useEnvironment();
  
  // Rotas bloqueadas em produção
  const blockedRoutes = [
    '/school/dashboard/stripe-connect-setup',
    '/school/dashboard/stripe-connect-transfers', 
    '/school/dashboard/payment-method-config',
    '/school/dashboard/payment-dashboard'
  ];
  
  // Verificar se a rota atual está bloqueada em produção
  const isCurrentRouteBlocked = isProduction && blockedRoutes.includes(location.pathname);
  
  // Usar Polling Inteligente em vez de Supabase Real-time
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    requestNotificationPermission
  } = useSmartPollingNotifications({
    userType: 'university',
    userId: user?.id || '',
    universityId: university?.id || '',
    onNotificationReceived: (notification) => {
      console.log('🔔 Nova notificação da universidade recebida via polling:', notification);
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
        setShowNotif(false);
      }
    };

    if (showNotif) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotif]);
  
  // Fechamento automático do userMenu ao abrir o sidebar
  useEffect(() => {
    if (sidebarOpen) {
      setUserMenuOpen(false);
    }
  }, [sidebarOpen]);

  const getActiveTab = () => {
    const path = location.pathname;
    // Consider both listing and creation routes as "scholarships"
    if (path.includes('/scholarships') || path.includes('/scholarship/')) return 'scholarships';
    if (path.includes('/profile')) return 'profile';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/students')) return 'students';
    if (path.includes('/selection-process')) return 'selection-process';
    if (path.includes('/ai-solutions')) return 'ai-solutions';
    if (path.includes('/stripe-connect/transfers')) return 'stripe-transfers';
    if (path.includes('/stripe-connect')) return 'stripe-connect';
    if (path.includes('/payment-method-config')) return 'payment-method-config';
    if (path.includes('/payment-dashboard')) return 'payment-dashboard';

    if (path.includes('/inbox')) return 'inbox';
    if (path.includes('/whatsapp')) return 'whatsapp';
    if (path.includes('/global-document-requests')) return 'global-docs';
    if (path.includes('/matricula-rewards')) return 'matricula-rewards';
    if (path.includes('/student')) return 'students';
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

  const openNotification = async (n: any) => {
    try {
      if (n && !n.read_at) {
        await markAsRead(n.id);
      }
    } catch {}
    setShowNotif(false);
    const target = n?.link || '/school/dashboard/students';
    navigate(target);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E]"></div>
          <p className="text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  // Se a rota estiver bloqueada em produção, mostrar mensagem de bloqueio
  if (isCurrentRouteBlocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <FeatureBlockedMessage />
      </div>
    );
  }

  const sidebarItems: SidebarItem[] = [
    { id: 'overview', label: 'Overview', icon: Home, path: '/school/dashboard', badge: null },
    { id: 'scholarships', label: 'Scholarships', icon: Award, path: '/school/dashboard/scholarships', badge: university?.profile_completed ? null : 'Setup' },
    { id: 'selection-process', label: 'Selection Process', icon: UserCheck, path: '/school/dashboard/selection-process', badge: null },
    { id: 'students', label: 'Students', icon: Users, path: '/school/dashboard/students', badge: null },
    { id: 'global-docs', label: 'Global Document Requests', icon: Edit, path: '/school/dashboard/global-document-requests', badge: null },
    {
      id: 'payments',
      label: 'Payments',
      icon: DollarSign,
      path: '/school/dashboard/analytics',
      badge: null,
      dropdown: [
        { id: 'analytics', label: 'Payment Management', icon: BarChart3, path: '/school/dashboard/analytics', badge: null },
        { id: 'stripe-connect', label: 'Stripe Connect', icon: CreditCard, path: '/school/dashboard/stripe-connect', badge: null },
        { id: 'stripe-transfers', label: 'Stripe Connect Transfers', icon: DollarSign, path: '/school/dashboard/stripe-connect/transfers', badge: null, status: 'em_desenvolvimento' },
        { id: 'payment-method-config', label: 'Payment Requests', icon: CreditCard, path: '/school/dashboard/payment-method-config', badge: null, status: 'em_desenvolvimento' }
      ]
    },
    { id: 'matricula-rewards', label: 'Matricula Rewards', icon: Gift, path: '/school/dashboard/matricula-rewards', badge: null },
    { id: 'profile', label: 'University Profile', icon: Building, path: '/school/dashboard/profile', badge: null },
    {
      id: 'ai-solutions',
      label: 'AI Solutions',
      icon: Brain,
      path: '/school/dashboard/ai-solutions',
      badge: null,
      dropdown: [
        { id: 'inbox', label: 'Inbox', icon: Mail, path: '/school/dashboard/inbox', badge: null },
        { id: 'whatsapp', label: 'WhatsApp Connection', icon: MessageSquare, path: '/school/dashboard/whatsapp', badge: null }
      ]
    }
  ];
  
  // Filtrar itens do sidebar baseado no ambiente
  const filteredSidebarItems = sidebarItems.filter(item => {
    if (isProduction && item.status === 'em_desenvolvimento') {
      return false; // Não mostrar em produção
    }
    return true; // Mostrar em desenvolvimento
  });

  return (
    <div className="min-h-screen bg-slate-50 flex w-full overflow-x-hidden">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:fixed lg:inset-y-0 lg:left-0 h-screen flex flex-col overflow-y-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ transitionProperty: 'transform, box-shadow', transitionDuration: '300ms', WebkitOverflowScrolling: 'touch' as any }}
      >
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
                onClick={() => {
                  setSidebarOpen(false);
                  setUserMenuOpen(false);
                }}
                className="lg:hidden absolute right-4 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                title="Close sidebar"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close sidebar</span>
              </button>
          </div>

          {/* University Status */}
          {university && (
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                  {university.image_url ? (
                    <img 
                      src={university.image_url} 
                      alt={`${university.name} logo`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building className="h-6 w-6 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{university.name}</h3>
                  <p className="text-sm text-slate-500 truncate">{university.location}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  university.is_approved 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {university.is_approved ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Approved
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </>
                  )}
                </span>
                
                {!university.profile_completed && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Profile Incomplete
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {filteredSidebarItems.map((item) => {
              if (item.dropdown) {
                const Icon = item.icon;
                const isActive = activeTab === item.id || item.dropdown.some(sub => activeTab === sub.id);
                return (
                  <div key={item.id} className="relative group">
                    <div className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all duration-200 ${isActive ? 'bg-[#05294E] text-white shadow-lg' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                    >
                      <Link
                        to={item.path}
                        className="flex items-center space-x-3 flex-1"
                        style={{ textDecoration: 'none' }}
                        onClick={() => {
                          setSidebarOpen(false);
                          setDropdownOpen(prev => ({ ...prev, [item.id]: true }));
                        }}
                      >
                        <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span className="text-sm">{item.label}</span>
                      </Link>
                      <button
                        type="button"
                        className={`ml-2 p-1 rounded transition-colors focus:outline-none ${isActive ? 'text-white' : 'text-slate-400 hover:bg-slate-200'}`}
                        onClick={() => setDropdownOpen(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                        tabIndex={0}
                        aria-label="Abrir submenu"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen?.[item.id] ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    {/* Dropdown */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ${dropdownOpen?.[item.id] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} bg-slate-50 rounded-xl shadow-lg border border-slate-200 mt-2 ml-4 mr-4`}
                      style={{ pointerEvents: dropdownOpen?.[item.id] ? 'auto' : 'none' }}
                    >
                      {(isProduction ? item.dropdown.filter(sub => sub.status !== 'em_desenvolvimento') : item.dropdown).map(sub => {
                        const SubIcon = sub.icon;
                        const isSubActive = activeTab === sub.id;
                        return (
                          <Link
                            key={sub.id}
                            to={sub.path}
                            className={`flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                              isSubActive ? 'bg-[#05294E] text-white shadow' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                            onClick={() => {
                              setSidebarOpen(false);
                            }}
                          >
                            <SubIcon className={`h-5 w-5 ${isSubActive ? 'text-white' : 'text-slate-500'}`} />
                            <span className="text-sm ml-3">{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              } else {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isDisabled = item.badge === 'Coming Soon';
                // Don't disable the students tab anymore
                const finalIsDisabled = isDisabled && item.id !== 'students';
                return (
                  <Link
                    key={item.id}
                    to={finalIsDisabled ? '#' : item.path}
                    className={`group flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-[#05294E] text-white shadow-lg'
                        : finalIsDisabled
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    onClick={(e) => finalIsDisabled && e.preventDefault()}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-5 w-5 ${isActive ? 'text-white' : finalIsDisabled ? 'text-slate-400' : 'text-slate-500'}`} />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    {item.badge && item.id !== 'students' && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                        item.badge === 'Coming Soon' 
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              }
            })}
          </nav>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => {
            setSidebarOpen(false);
            setUserMenuOpen(false);
          }}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-72 min-h-screen">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 py-3 sticky top-0 z-50 pl-4 pr-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setSidebarOpen(true);
                  setUserMenuOpen(false);
                }}
                className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                title="Open sidebar"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open sidebar</span>
              </button>
              
              <div className="hidden md:block">
                <h1 className="text-2xl font-bold text-slate-900">
                  {activeTab === 'overview' && 'Overview'}
                  {activeTab === 'scholarships' && 'Manage Scholarships'}
                  {activeTab === 'profile' && 'University Profile'}
                  {activeTab === 'students' && 'Students'}
                  {activeTab === 'selection-process' && 'Selection Process'}
                  {activeTab === 'analytics' && 'Payment Management'}
                  {activeTab === 'stripe-connect' && 'Stripe Connect'}
                  {activeTab === 'stripe-transfers' && 'Transfers'}
                  {activeTab === 'payment-method-config' && 'Payment Methods'}
                  {activeTab === 'payment-dashboard' && 'Payment Dashboard'}
                </h1>
                <p className="text-slate-600">
                  {activeTab === 'overview' && 'Monitor your university performance'}
                  {activeTab === 'scholarships' && 'Create and manage scholarship opportunities'}
                  {activeTab === 'profile' && 'Keep your university information up to date'}
                  {activeTab === 'students' && 'Manage applicants and students'}
                  {activeTab === 'selection-process' && 'Review and approve student applications'}
                  {activeTab === 'analytics' && 'Track and manage scholarship payment requests'}
                  {activeTab === 'stripe-connect' && 'Manage your Stripe Connect integration'}
                  {activeTab === 'stripe-transfers' && 'View and manage payment transfers'}
                  {activeTab === 'payment-method-config' && 'Configure payment methods'}
                  {activeTab === 'payment-dashboard' && 'Monitor payment activities'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Payment Notifications */}
              <PaymentNotifications />

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => {
                    setUserMenuOpen(!userMenuOpen);
                    if (!userMenuOpen) setSidebarOpen(false);
                  }}
                  className="flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-[#05294E] to-blue-700 rounded-lg flex items-center justify-center overflow-hidden">
                    {university?.image_url ? (
                      <img 
                        src={university.image_url} 
                        alt={`${university.name} logo`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="font-semibold text-slate-900 text-sm">{user?.name}</p>
                    <p className="text-xs text-slate-500">Administrator</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 max-w-[90vw] bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 overflow-x-auto">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <p className="font-semibold text-slate-900">{user?.name}</p>
                      <p className="text-sm text-slate-500 truncate max-w-[180px] text-left whitespace-nowrap overflow-hidden" title={user?.email}>{user?.email}</p>
                    </div>
                    
                    <Link
                      to="/school/dashboard/profile"
                      className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setSidebarOpen(false);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-3 text-slate-400" />
                      Edit Profile
                    </Link>
                    
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setSidebarOpen(false);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-3 text-slate-400" />
                      Settings
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
        <main className="flex justify-center pt-10 px-4 sm:px-6 lg:px-8 pb-6 max-w-full">
          {/* Welcome Message for Incomplete Profiles */}
          {(!university || !university.profile_completed) && (
            <div className="bg-gradient-to-r from-[#05294E] to-blue-700 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center overflow-hidden">
                    {university?.image_url ? (
                      <img 
                        src={university.image_url} 
                        alt={`${university.name} logo`}
                        className="w-full h-full object-cover rounded-2xl"
                      />
                    ) : (
                      <Building className="h-8 w-8 text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold mb-2">
                      {!university ? 'Welcome to Matrícula USA!' : 'Complete Your Profile'}
                    </h2>
                    <p className="text-blue-100 text-lg">
                      {!university 
                        ? 'Set up your university and start attracting international students'
                        : 'Finish your profile to unlock all features'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
                    <Edit className="h-8 w-8 text-white mb-4" />
                    <h3 className="font-bold text-white mb-2">1. Complete Profile</h3>
                    <p className="text-blue-100 text-sm">Add university information and documentation</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
                    <Award className="h-8 w-8 text-yellow-400 mb-4" />
                    <h3 className="font-bold text-white mb-2">2. Create Scholarships</h3>
                    <p className="text-blue-100 text-sm">Offer exclusive opportunities to students</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
                    <Users className="h-8 w-8 text-green-400 mb-4" />
                    <h3 className="font-bold text-white mb-2">3. Connect Students</h3>
                    <p className="text-blue-100 text-sm">Receive applications from qualified students</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    to="/school/setup-profile"
                    className="bg-white text-[#05294E] px-8 py-3 rounded-xl hover:bg-slate-100 transition-all duration-300 font-bold text-center flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Settings className="h-5 w-5 mr-2" />
                    {!university ? 'Set Up University Profile' : 'Complete Profile'}
                  </Link>
                  {!university && (
                    <Link
                      to="/school/termsandconditions"
                      className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-8 py-3 rounded-xl hover:bg-white/30 transition-all duration-300 font-bold text-center flex items-center justify-center"
                    >
                      <Shield className="h-5 w-5 mr-2" />
                      Review Terms & Conditions
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {children}
        </main>
      </div>

      {/* Notifications Modal - for mobile */}
      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        notifications={notifications}
        onNotificationClick={async (notification) => {
          await markAsRead(notification.id);
          if (notification.link) {
            navigate(notification.link);
          }
          setShowNotificationsModal(false);
        }}
        onMarkAllAsRead={markAllAsRead}
        onClearAll={clearAll}
      />
    </div>
  );
};

export default SchoolDashboardLayout;