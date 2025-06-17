import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Award, 
  FileText, 
  User, 
  Settings, 
  BarChart3,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Shield,
  BookOpen,
  Target,
  Star
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

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
  
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/scholarships')) return 'scholarships';
    if (path.includes('/applications')) return 'applications';
    if (path.includes('/profile')) return 'profile';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 font-medium">Loading student dashboard...</p>
        </div>
      </div>
    );
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3, path: '/student/dashboard', badge: null },
    { id: 'scholarships', label: 'Find Scholarships', icon: Award, path: '/student/dashboard/scholarships', badge: null },
    { id: 'applications', label: 'My Applications', icon: FileText, path: '/student/dashboard/applications', badge: null },
    { id: 'profile', label: 'Profile', icon: User, path: '/student/dashboard/profile', badge: null }
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
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden absolute right-4 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Student Status */}
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">{profile?.name || user?.name}</h3>
                <p className="text-sm text-slate-500 truncate">Student</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center mt-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                <Star className="h-3 w-3 mr-1" />
                Active Student
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
                      ? 'bg-blue-600 text-white shadow-lg'
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

          {/* Quick Actions */}
          <div className="px-4 py-4 border-t border-slate-200">
            <Link
              to="/student/dashboard/scholarships"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-bold text-sm flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Award className="h-4 w-4 mr-2" />
              Find Scholarships
            </Link>
          </div>

          {/* Support */}
          <div className="px-4 py-4 border-t border-slate-200">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">Student Support</h4>
                  <p className="text-xs text-slate-500">We're here to help</p>
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
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              <div className="hidden md:block">
                <h1 className="text-2xl font-bold text-slate-900">
                  {activeTab === 'overview' && 'Student Overview'}
                  {activeTab === 'scholarships' && 'Find Scholarships'}
                  {activeTab === 'applications' && 'My Applications'}
                  {activeTab === 'profile' && 'Student Profile'}
                </h1>
                <p className="text-slate-600">
                  {activeTab === 'overview' && 'Track your progress and discover new opportunities'}
                  {activeTab === 'scholarships' && 'Discover scholarship opportunities tailored for you'}
                  {activeTab === 'applications' && 'Track your scholarship applications and status'}
                  {activeTab === 'profile' && 'Manage your academic profile and preferences'}
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
                    placeholder="Search scholarships..."
                    className="w-80 pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Notifications */}
              <button className="relative p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="font-semibold text-slate-900 text-sm">{profile?.name || user?.name}</p>
                    <p className="text-xs text-slate-500">Student</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <p className="font-semibold text-slate-900">{profile?.name || user?.name}</p>
                      <p className="text-sm text-slate-500">{user?.email}</p>
                    </div>
                    
                    <Link
                      to="/student/dashboard/profile"
                      className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-3 text-slate-400" />
                      Edit Profile
                    </Link>
                    
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
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
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default StudentDashboardLayout;