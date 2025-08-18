import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Award, 
  FileText, 
  User, 
  BarChart3,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Shield,
  Star,
  Gift,
  Bell
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
// import { StripeCheckout } from '../../components/StripeCheckout';
// import StepByStepButton from '../../components/OnboardingTour/StepByStepButton';

interface StudentDashboardLayoutProps {
  user: any;
  profile: any;
  loading: boolean;
  children: React.ReactNode;
}

const StudentDashboardLayout: React.FC<StudentDashboardLayoutProps> = ({
  user,
  profile,
  loading,
  children
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  
  // Realtime notifications
  useEffect(() => {
    let channel: any;
    const fetchInitial = async () => {
      if (!user?.id) return;
      
      // Primeiro busca o perfil do usuário para obter o student_id
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (profileData) {
        const { data } = await supabase
          .from('student_notifications')
          .select('*')
          .eq('student_id', profileData.id)
          .order('created_at', { ascending: false })
          .limit(10);
        setNotifications(data || []);
        
        channel = supabase
          .channel('student-notifs')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'student_notifications', filter: `student_id=eq.${profileData.id}` }, (payload: any) => {
            setNotifications(prev => [payload.new, ...prev].slice(0, 10));
          })
          .subscribe();
      }
    };
    fetchInitial();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const openNotification = async (n: any) => {
    try {
      if (n && !n.read_at) {
        await supabase
          .from('student_notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', n.id);
      }
    } catch {}
    setShowNotif(false);
    const target = n?.link || '/student/dashboard';
    navigate(target);
  };

  const markAllAsRead = async () => {
    try {
      if (!user?.id) return;
      
      // Busca o perfil do usuário para obter o student_id
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (profileData) {
        await supabase
          .from('student_notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('student_id', profileData.id)
          .is('read_at', null as any);
        setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      }
    } catch {}
  };

  const clearAll = async () => {
    try {
      if (!user?.id) return;
      
      // Busca o perfil do usuário para obter o student_id
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (profileData) {
        await supabase
          .from('student_notifications')
          .delete()
          .eq('student_id', profileData.id);
        setNotifications([]);
      }
    } catch {}
  };

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

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/scholarships')) return 'scholarships';
    if (path.includes('/cart')) return 'cart';
    if (path.includes('/applications') || path.includes('/application/')) return 'applications';
    if (path.includes('/rewards')) return 'rewards';
    if (path.includes('/profile')) return 'profile';
    if (path.includes('/manual-review')) return 'cart';
    if (path.includes('/documents-and-scholarship-choice')) return 'cart';
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
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3, path: '/student/dashboard' },
    { id: 'scholarships', label: 'Browse Scholarships', icon: Award, path: '/student/dashboard/scholarships' },
    { id: 'cart', label: 'Selected Scholarships', icon: GraduationCap, path: '/student/dashboard/cart' },
    { id: 'applications', label: 'My Applications', icon: FileText, path: '/student/dashboard/applications' },
    { id: 'rewards', label: 'Matricula Rewards', icon: Gift, path: '/student/dashboard/rewards' },
    { id: 'profile', label: 'Profile', icon: User, path: '/student/dashboard/profile' }
  ];

  return (
    <div className="h-screen flex flex-col lg:flex-row w-full overflow-hidden">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:fixed lg:inset-y-0 lg:left-0
        h-screen flex flex-col overflow-y-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ transitionProperty: 'transform, box-shadow', transitionDuration: '300ms', WebkitOverflowScrolling: 'touch' as any }}
      >
        <div className="flex flex-col h-full flex-1 justify-between">
          <div>
            {/* Logo */}
            <div className="flex items-center justify-between h-16 sm:h-20 px-4 sm:px-6 border-b border-slate-200">
              <Link to="/" className="flex items-center justify-center w-full">
                <img 
                  src="/logo.png.png" 
                  alt="Matrícula USA" 
                  className="h-10 w-auto sm:h-12"
                />
              </Link>
              <button
                onClick={() => { setSidebarOpen(false); setUserMenuOpen(false); }}
                className="lg:hidden absolute right-3 sm:right-4 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Fechar menu lateral"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User Profile */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0">
                  {user?.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt="Profile Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate text-sm sm:text-base">{profile?.name || user?.name}</h3>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">Student</p>
                </div>
              </div>
              
              <div className="flex items-center justify-center mt-3">
                <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  <Star className="h-3 w-3 mr-1" />
                  Active Student
                </span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`group flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    onClick={() => {
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span className="text-xs sm:text-sm">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
          {/* Academic Support colado no final da sidebar, formato card */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 border-t border-slate-200 bg-white">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 sm:p-4 border border-blue-200">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-slate-900 text-xs sm:text-sm truncate">Academic Support</h4>
                  <p className="text-xs text-slate-500 truncate">24/7 assistance available</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 lg:hidden"
          onClick={() => {
            setSidebarOpen(false);
            setUserMenuOpen(false);
          }}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 ml-0 lg:ml-72 overflow-x-hidden h-screen overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 py-1 sticky top-0 z-50 pt-3 pl-3 pr-3 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 truncate">Student Dashboard</h1>
                <p className="text-xs sm:text-sm text-slate-500 truncate">Manage your scholarship applications</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Notifications Bell */}
              <div className="relative notifications-container">
                <button
                  onClick={() => setShowNotif(!showNotif)}
                  className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
                  title="Notifications"
                >
                  <Bell className="h-5 w-5 text-slate-600" />
                  {notifications.some(n => !n.read_at) && (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-red-500 rounded-full"></span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotif && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                    <div className="px-4 pb-2 border-b border-slate-200 font-semibold text-slate-900 flex items-center justify-between">
                      <span>Notifications</span>
                      <div className="flex items-center gap-2 text-xs">
                        <button onClick={markAllAsRead} className="text-blue-600 hover:underline">Mark all as read</button>
                        <span className="text-slate-300">|</span>
                        <button onClick={clearAll} className="text-red-600 hover:underline">Clear</button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-slate-500">No notifications</div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`px-4 py-3 hover:bg-slate-50 cursor-pointer ${!n.read_at ? 'bg-slate-50' : ''}`} onClick={() => openNotification(n)}>
                            <div className="text-sm font-medium text-slate-900 flex items-center justify-between">
                              <span>{n.title}</span>
                              {!n.read_at && <span className="ml-2 h-2 w-2 rounded-full bg-blue-500 inline-block"></span>}
                            </div>
                            <div className="text-xs text-slate-600 mt-0.5">{n.message}</div>
                            <div className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => {
                    setUserMenuOpen(!userMenuOpen);
                    if (!userMenuOpen) setSidebarOpen(false);
                  }}
                  className="flex items-center space-x-2 sm:space-x-3 p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user?.avatar_url ? (
                      <img 
                        src={user?.avatar_url} 
                        alt="Profile Avatar" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 sm:h-4 sm:w-4 text-white" />
                    )}
                  </div>
                  <div className="hidden sm:block text-left min-w-0">
                    <p className="font-semibold text-slate-900 text-xs sm:text-sm truncate">{profile?.name || user?.name}</p>
                    <p className="text-xs text-slate-500 truncate">Student</p>
                  </div>
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 flex-shrink-0" />
                </button>
                {/* User Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 sm:w-64 max-w-[90vw] bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 overflow-x-auto">
                    <div className="px-3 sm:px-4 py-3 border-b border-slate-100">
                      <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">{profile?.name || user?.name}</p>
                      <p className="text-xs sm:text-sm text-slate-500 truncate max-w-[180px]" style={{ direction: 'ltr', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={user?.email}>{user?.email}</p>
                    </div>
                    
                    <div className="py-2">
                      <Link
                        to="/student/dashboard/profile"
                        className="flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3" />
                        Profile Settings
                      </Link>
                    </div>
                    
                    <div className="border-t border-slate-100 pt-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 bg-slate-50 px-3 sm:px-6 lg:px-10 pb-6 max-w-full overflow-y-auto overflow-x-hidden min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default StudentDashboardLayout;