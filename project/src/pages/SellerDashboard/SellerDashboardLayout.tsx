import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  GraduationCap,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  Shield,
  Crown,
  User,
  Search,
  ChevronDown,
  Activity,
  DollarSign,
  Target
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SellerDashboardLayoutProps {
  user: any;
  sellerProfile: any;
  children: React.ReactNode;
  onNavigate?: (view: string) => void;
  currentView?: string;
}

const SellerDashboardLayout: React.FC<SellerDashboardLayoutProps> = ({
  user,
  sellerProfile,
  children,
  onNavigate,
  currentView
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const getActiveTab = () => {
    // If currentView is provided, use it (for card navigation)
    if (currentView && currentView !== 'student-details') {
      return currentView;
    }
    
    // Otherwise, fall back to URL-based detection
    const path = location.pathname;
    if (path === '/seller/dashboard' || path === '/seller/dashboard/') return 'overview';
    if (path.includes('/students')) return 'students';
    if (path.includes('/affiliate-tools')) return 'affiliate-tools';
    if (path.includes('/performance')) return 'performance';
    if (path.includes('/profile')) return 'profile';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3, path: '/seller/dashboard', badge: null },
    { id: 'students', label: 'My Students', icon: GraduationCap, path: '/seller/dashboard/students', badge: null },
    { id: 'affiliate-tools', label: 'Affiliate Tools', icon: Target, path: '/seller/dashboard/affiliate-tools', badge: null },
    { id: 'performance', label: 'Performance', icon: Activity, path: '/seller/dashboard/performance', badge: null },
    { id: 'profile', label: 'Settings', icon: Settings, path: '/seller/dashboard/profile', badge: null }
  ];

  const handleNavigation = (href: string, view: string) => {
    // Always navigate
    navigate(href);
    setSidebarOpen(false);
    
    // Call callback if available
    if (onNavigate) {
      onNavigate(view);
    }
  };

  const handleLogout = async () => {
    try {
      setSidebarOpen(false);
      await logout();
    } catch (error) {
      console.error('Error during logout:', error);
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
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center w-full hover:opacity-80 transition-opacity duration-200"
            >
              <img 
                src="/logo.png.png" 
                alt="Matrícula USA" 
                className="h-12 w-auto cursor-pointer"
              />
            </button>
            <button
              onClick={() => { setSidebarOpen(false); setUserMenuOpen(false); }}
              className="lg:hidden absolute right-4 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Close side menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Seller Status */}
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">Seller Dashboard</h3>
                <p className="text-sm text-slate-500 truncate">Affiliate Seller</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center mt-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                <Shield className="h-3 w-3 mr-1" />
                Seller Access
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path, item.id)}
                  className={`group flex items-center justify-between w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg border border-blue-500'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-blue-50 hover:border hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'}`} />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-500">
                      {item.badge}
                    </span>
                  )}
                </button>
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
              
              <div className="hidden md:block">
                <h1 className="text-2xl font-bold text-slate-900">
                  {activeTab === 'overview' && 'Seller Dashboard'}
                  {activeTab === 'students' && 'My Students'}
                  {activeTab === 'referral-tools' && 'Referral Tools'}
                  {activeTab === 'performance' && 'Performance & Metrics'}
                  {activeTab === 'profile' && 'Profile Settings'}
                </h1>
                <p className="text-slate-600">
                  {activeTab === 'overview' && 'Monitor your sales performance and activity'}
                  {activeTab === 'students' && 'Manage your referenced students and conversions'}
                  {activeTab === 'referral-tools' && 'Access tools to increase your sales'}
                  {activeTab === 'performance' && 'Analyze your performance and revenue'}
                  {activeTab === 'profile' && 'Manage your seller settings'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden lg:block">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-80 pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:bg-white hover:border-blue-300"
                  />
                </div>
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => { setUserMenuOpen(!userMenuOpen); setSidebarOpen(false); }}
                  className="flex items-center space-x-3 p-2 rounded-xl hover:bg-blue-50 transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="font-semibold text-slate-900 text-sm">{user?.name}</p>
                    <p className="text-xs text-slate-500">Seller</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-slate-200 bg-blue-50">
                      <p className="font-semibold text-slate-900">{user?.name}</p>
                      <p className="text-sm text-slate-600">{user?.email}</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        handleNavigation('/seller/dashboard/profile', 'profile');
                        setUserMenuOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-200"
                    >
                      <Settings className="h-4 w-4 mr-3 text-slate-400" />
                      Profile Settings
                    </button>
                    
                    <button
                      onClick={() => {
                        handleNavigation('/seller/dashboard/performance', 'performance');
                        setUserMenuOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-200"
                    >
                      <Activity className="h-4 w-4 mr-3 text-slate-400" />
                      Activity Logs
                    </button>
                    
                    <div className="border-t border-slate-200 my-2"></div>
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Logout
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

export default SellerDashboardLayout;
