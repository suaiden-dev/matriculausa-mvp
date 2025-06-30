import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, BookOpen, Zap, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, userProfile, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  const getDashboardPath = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'student': return '/student/dashboard';
      case 'school': return '/school/dashboard';
      case 'admin': return '/admin/dashboard';
      default: return '/';
    }
  };

  const getDashboardLabel = () => {
    if (!user) return 'Dashboard';
    switch (user.role) {
      case 'student': return 'Student Dashboard';
      case 'school': return 'School Dashboard';
      case 'admin': return 'Admin Dashboard';
      default: return 'Dashboard';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-600';
      case 'school': return 'bg-green-600';
      case 'student': return 'bg-[#05294E]';
      default: return 'bg-[#05294E]';
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-lg shadow-lg border-b border-slate-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <img 
              src="/logo.png.png" 
              alt="Matrícula USA" 
              className="h-12 w-auto group-hover:scale-105 transition-transform duration-300"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link to="/" className="text-slate-700 hover:text-[#05294E] transition-colors font-medium relative group">
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#05294E] group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link 
              to="/schools" 
              className="text-slate-700 hover:text-[#05294E] transition-colors font-medium relative group"
            >
              Universities
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#05294E] group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link to="/scholarships" className="text-slate-700 hover:text-[#05294E] transition-colors font-medium relative group flex items-center">
              Scholarships
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#05294E] group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link to="/how-it-works" className="text-slate-700 hover:text-[#05294E] transition-colors font-medium relative group">
              How It Works
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#05294E] group-hover:w-full transition-all duration-300"></span>
            </Link>
          </nav>

          {/* User Menu / Auth Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 bg-gradient-to-r from-slate-100 to-slate-200 rounded-2xl px-4 py-3 hover:from-slate-200 hover:to-slate-300 transition-all duration-300 shadow-lg"
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${getRoleColor(user.role)}`}>
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-slate-700 block">{userProfile?.full_name || user.email}</span>
                    <span className="text-xs text-slate-500 capitalize">
                      {user.role}
                    </span>
                  </div>
                </button>
                
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl py-2 border border-slate-200/50 backdrop-blur-lg">
                    <button
                      onClick={() => {
                        navigate(getDashboardPath());
                        setIsUserMenuOpen(false);
                      }}
                      className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-[#05294E]/5 transition-all duration-200 mx-2 rounded-xl w-full text-left"
                    >
                      <BookOpen className="h-4 w-4 mr-3 text-[#05294E]" />
                      {getDashboardLabel()}
                    </button>
                    
                    {/* Admin Panel Quick Access */}
                    {user.role === 'admin' && (
                      <Link
                        to="/admin/dashboard"
                        className="flex items-center px-4 py-3 text-sm text-purple-700 hover:bg-purple-50 transition-all duration-200 mx-2 rounded-xl"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Shield className="h-4 w-4 mr-3 text-purple-600" />
                        Admin Panel
                      </Link>
                    )}
                    
                    <div className="border-t border-slate-200 my-2"></div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-[#D0151C]/5 transition-all duration-200 mx-2 rounded-xl"
                    >
                      <LogOut className="h-4 w-4 mr-3 text-[#D0151C]" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-slate-700 hover:text-[#05294E] transition-colors font-bold"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-[#D0151C] text-white px-6 py-3 rounded-2xl hover:bg-[#B01218] transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-lg border-t border-slate-200/50">
          <div className="px-4 pt-4 pb-6 space-y-2">
            <Link to="/" className="block px-4 py-3 text-slate-700 hover:bg-[#05294E]/5 rounded-xl font-medium transition-all duration-200" onClick={() => setIsMenuOpen(false)}>Home</Link>
            <Link 
              to="/schools" 
              className="block px-4 py-3 text-slate-700 hover:bg-[#05294E]/5 rounded-xl font-medium transition-all duration-200" 
              onClick={() => setIsMenuOpen(false)}
            >
              Universities
            </Link>
            <Link to="/scholarships" className="block px-4 py-3 text-slate-700 hover:bg-[#05294E]/5 rounded-xl font-medium transition-all duration-200 flex items-center" onClick={() => setIsMenuOpen(false)}>
              Scholarships
            </Link>
            <Link to="/how-it-works" className="block px-4 py-3 text-slate-700 hover:bg-[#05294E]/5 rounded-xl font-medium transition-all duration-200" onClick={() => setIsMenuOpen(false)}>How It Works</Link>
            
            {isAuthenticated && user ? (
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex items-center px-4 py-3 mb-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center mr-3 ${getRoleColor(user.role)}`}>
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 block">{userProfile?.full_name || user.email}</span>
                    <span className="text-sm text-slate-500 capitalize">
                      {user.role}
                    </span>
                  </div>
                </div>

                <Link to={getDashboardPath()} className="block px-4 py-3 text-slate-700 hover:bg-[#05294E]/5 rounded-xl font-medium transition-all duration-200" onClick={() => setIsMenuOpen(false)}>{getDashboardLabel()}</Link>
                
                <button onClick={handleLogout} className="block w-full text-left px-4 py-3 text-slate-700 hover:bg-[#D0151C]/5 rounded-xl font-medium transition-all duration-200">Logout</button>
              </div>
            ) : (
              <div className="border-t border-slate-200 pt-4 mt-4 space-y-2">
                <Link to="/login" className="block px-4 py-3 text-slate-700 hover:bg-[#05294E]/5 rounded-xl font-medium transition-all duration-200" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
                <Link to="/register" className="block px-4 py-3 bg-[#D0151C] text-white hover:bg-[#B01218] rounded-xl font-bold transition-all duration-200 text-center" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;