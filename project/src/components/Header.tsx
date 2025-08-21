import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, BookOpen, Zap, Shield, ChevronDown, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import StepByStepButton from './OnboardingTour/StepByStepButton';
import LanguageSelector from './LanguageSelector';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, userProfile, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [schoolImageUrl, setSchoolImageUrl] = useState<string | null>(null);

  // Garantir imagem da universidade quando usuário é "school"
  useEffect(() => {
    const ensureSchoolImage = async () => {
      if (!user || user.role !== 'school') return;
      if (user.university_image) {
        setSchoolImageUrl(user.university_image);
        return;
      }
      try {
        // Tentar por university_id do perfil primeiro
        if (userProfile?.university_id) {
          const { data } = await supabase
            .from('universities')
            .select('image_url, logo_url')
            .eq('id', userProfile.university_id)
            .single();
          if (data) {
            setSchoolImageUrl(data.image_url || data.logo_url || null);
            return;
          }
        }
        // Fallback: procurar pela relação user_id
        const { data: uniByUser } = await supabase
          .from('universities')
          .select('image_url, logo_url')
          .eq('user_id', user.id)
          .single();
        if (uniByUser) setSchoolImageUrl(uniByUser.image_url || uniByUser.logo_url || null);
      } catch (e) {
        // silencioso
      }
    };
    ensureSchoolImage();
  }, [user?.id, user?.role, user?.university_image, userProfile?.university_id]);

  const handleLogout = async () => {
    try {
      setIsMenuOpen(false);
      setIsUserMenuOpen(false);
      await logout();
      // O logout já faz o redirecionamento, não precisamos fazer nada aqui
    } catch (error) {
      console.error('Error during logout:', error);
      // Mesmo com erro, fechar menus
      setIsMenuOpen(false);
      setIsUserMenuOpen(false);
    }
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
              {t('nav.home')}
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
              {t('nav.scholarships')}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#05294E] group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link to="/how-it-works" className="text-slate-700 hover:text-[#05294E] transition-colors font-medium relative group">
              {t('nav.howItWorks')}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#05294E] group-hover:w-full transition-all duration-300"></span>
            </Link>
          </nav>

          {/* User Menu / Auth Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Language Selector */}
            <LanguageSelector variant="header" />
            
            {isAuthenticated && user ? (
              <div className="relative flex items-center gap-2">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  {
                    user?.avatar_url && user.role === 'student' ? (
                      <img src={user.avatar_url} alt="User Avatar" className="w-8 h-8 rounded-lg" />
                    ) : user?.role === 'school' && (user?.university_image || schoolImageUrl) ? (
                      <img src={user.university_image || schoolImageUrl || ''} alt="University Logo" className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )
                  }
                  <div className="hidden md:block text-left">
                    <p className="font-semibold text-slate-900 text-sm">{userProfile?.full_name || user.email}</p>
                    <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
                {/* Botão do Guia ao lado do perfil */}
                {/* <StepByStepButton /> */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 max-w-[90vw] bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 overflow-x-auto">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="font-semibold text-slate-900">{userProfile?.full_name || user.email}</p>
                      <p className="text-sm text-slate-500 truncate max-w-[180px] overflow-hidden whitespace-nowrap" title={user.email}>{user.email}</p>
                    </div>
                    <div className="py-2 border-b border-slate-100">
                      <Link
                        to={getDashboardPath()}
                        className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-semibold"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <BookOpen className="h-4 w-4 mr-3 text-[#05294E]" />
                        {getDashboardLabel()}
                      </Link>
                    </div>
                    <div className="py-2">
                      <Link
                        to={getDashboardPath() + '/profile'}
                        className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <User className="h-4 w-4 mr-3" />
                        Profile Settings
                      </Link>
                    </div>
                    <div className="border-t border-slate-100 pt-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-slate-700 hover:text-[#05294E] transition-colors font-bold"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="bg-[#D0151C] text-white px-6 py-3 rounded-2xl hover:bg-[#B01218] transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {t('nav.getStarted')}
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
            {/* Language Selector for Mobile */}
            <div className="flex justify-center pb-4 border-b border-slate-200">
              <LanguageSelector variant="compact" />
            </div>
            
            <Link to="/" className="block px-4 py-3 text-slate-700 hover:bg-[#05294E]/5 rounded-xl font-medium transition-all duration-200" onClick={() => setIsMenuOpen(false)}>{t('nav.home')}</Link>
            <Link 
              to="/schools" 
              className="block px-4 py-3 text-slate-700 hover:bg-[#05294E]/5 rounded-xl font-medium transition-all duration-200" 
              onClick={() => setIsMenuOpen(false)}
            >
              Universities
            </Link>
            <Link to="/scholarships" className="block px-4 py-3 text-slate-700 hover:bg-[#05294E]/5 rounded-xl font-medium transition-all duration-200 flex items-center" onClick={() => setIsMenuOpen(false)}>
              {t('nav.scholarships')}
            </Link>
            <Link to="/how-it-works" className="block px-4 py-3 text-slate-700 hover:bg-[#05294E]/5 rounded-xl font-medium transition-all duration-200" onClick={() => setIsMenuOpen(false)}>{t('nav.howItWorks')}</Link>
            
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
                <Link to="/login" className="block px-4 py-3 text-slate-700 hover:bg-[#05294E]/5 rounded-xl font-medium transition-all duration-200" onClick={() => setIsMenuOpen(false)}>{t('nav.login')}</Link>
                <Link to="/register" className="block px-4 py-3 bg-[#D0151C] text-white hover:bg-[#B01218] rounded-xl font-bold transition-all duration-200 text-center" onClick={() => setIsMenuOpen(false)}>{t('nav.getStarted')}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;