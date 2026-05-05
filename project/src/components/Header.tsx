import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, ChevronDown, Home as HomeIcon, GraduationCap, Award, HelpCircle, LogIn, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { usePageTranslationStatus } from '../hooks/usePageTranslationStatus';
import { supabase } from '../lib/supabase';
// import StepByStepButton from './OnboardingTour/StepByStepButton';
import LanguageSelector from './LanguageSelector';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, userProfile, logout, isAuthenticated } = useAuth();
  // const navigate = useNavigate();
  const { t } = useTranslation(['common']);
  const location = useLocation();
  const { hasTranslation } = usePageTranslationStatus();
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
      case 'affiliate_admin': return '/affiliate-admin/dashboard';
      case 'seller': return '/seller/dashboard';
      default: return '/';
    }
  };

  const getDashboardLabel = () => {
    if (!user) return t('nav.dashboard');
    switch (user.role) {
      case 'student': return t('nav.studentDashboard');
      case 'school': return t('nav.schoolDashboard');
      case 'admin': return t('nav.adminDashboard');
      case 'affiliate_admin': return t('nav.affiliateDashboard');
      case 'seller': return t('nav.sellerDashboard');
      default: return t('nav.dashboard');
    }
  };

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      // Pega o scroll do window, document.body, ou qualquer container principal que causou o scroll
      const target = e.target as HTMLElement | Document;
      const scrollY = window.scrollY || 
                      document.documentElement.scrollTop || 
                      document.body.scrollTop ||
                      (target instanceof HTMLElement ? target.scrollTop : 0);
      setIsScrolled(scrollY > 20);
    };

    // Use capture: true para interceptar eventos de scroll de qualquer container interno (ex: body)
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  return (
    <>
    <header 
      className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/70 backdrop-blur-md shadow-lg border-b border-slate-200/50' 
          : 'bg-white border-b border-slate-200/50'
      }`}
    >
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
              {t('nav.universities')}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#05294E] group-hover:w-full transition-all duration-300"></span>
            </Link>
            {/* <Link
              to="/eb3-jobs"
              className="text-slate-700 hover:text-[#05294E] transition-colors font-medium relative group"
            >
              {t('nav.eb3Jobs')}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#05294E] group-hover:w-full transition-all duration-300"></span>
            </Link> */}
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
            {/* Language Selector - Only show on pages with translations */}
            {hasTranslation && <LanguageSelector variant="header" />}

            {isAuthenticated && user ? (
              <div className="relative flex items-center gap-2">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-xl bg-transparent hover:bg-slate-100/50 transition-colors"
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
                        {getDashboardLabel()}
                      </Link>
                    </div>
                    {user.role !== 'admin' && (
                      <div className="py-2">
                        <Link
                          to={getDashboardPath() + '/profile'}
                          className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          {t('nav.profileSettings')}
                        </Link>
                      </div>
                    )}
                    <div className="border-t border-slate-100 pt-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        {t('nav.signOut')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to={`/login${location.search}`}
                  className="text-slate-700 hover:text-[#05294E] transition-colors font-bold"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to={location.search.includes('seller') ? `/seller/register${location.search}` : `/register${location.search}`}
                  className="bg-[#D0151C] text-white px-6 py-3 rounded-2xl hover:bg-[#B01218] transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {t('nav.getStarted')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex lg:hidden items-center gap-2">
            {hasTranslation && (
              <div className="origin-right">
                <LanguageSelector variant="compact" />
              </div>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="lg:hidden bg-white border-t border-slate-100 overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-8 space-y-8 max-h-[calc(100vh-80px)] overflow-y-auto">
              


              {/* Main Navigation Links */}
              <div className="grid gap-3">
                {[
                  { to: "/", icon: <HomeIcon className="w-5 h-5" />, label: t('nav.home') },
                  { to: "/schools", icon: <GraduationCap className="w-5 h-5" />, label: t('nav.universities') },
                  { to: "/scholarships", icon: <Award className="w-5 h-5" />, label: t('nav.scholarships') },
                  { to: "/how-it-works", icon: <HelpCircle className="w-5 h-5" />, label: t('nav.howItWorks') },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-between p-4 rounded-[1.5rem] bg-white border border-slate-100 hover:border-[#05294E]/20 hover:bg-[#05294E]/5 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-white shadow-sm flex items-center justify-center text-[#05294E] transition-all">
                        {item.icon}
                      </div>
                      <span className="font-bold text-slate-700 text-lg">{item.label}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#05294E] group-hover:translate-x-1 transition-all" />
                  </Link>
                ))}
              </div>

              {/* User / Auth Section */}
              <div className="pt-4">
                {isAuthenticated && user ? (
                  <div className="space-y-4">
                    {/* User Card */}
                    <div className="bg-gradient-to-br from-[#05294E] to-slate-800 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                      <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                      
                      <div className="flex items-center gap-4 relative z-10 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                          {user?.avatar_url && user.role === 'student' ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full rounded-2xl object-cover" />
                          ) : user?.role === 'school' && (user?.university_image || schoolImageUrl) ? (
                            <img src={user.university_image || schoolImageUrl || ''} alt="" className="w-full h-full rounded-2xl object-cover" />
                          ) : (
                            <User className="h-6 w-6 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-black text-xl leading-tight">{userProfile?.full_name || user.email.split('@')[0]}</p>
                          <p className="text-blue-200 text-sm font-medium opacity-80 capitalize">{user.role}</p>
                        </div>
                      </div>

                      <Link
                        to={getDashboardPath()}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center justify-center w-full bg-white text-[#05294E] py-4 rounded-xl font-black transition-all hover:bg-blue-50 active:scale-95"
                      >
                        {getDashboardLabel()}
                      </Link>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="flex items-center justify-center w-full p-4 rounded-xl text-red-600 font-bold hover:bg-red-50 transition-all border border-red-100"
                    >
                      <LogOut className="w-5 h-5 mr-2" />
                      {t('nav.signOut')}
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <Link
                      to={`/login${location.search}`}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center gap-3 p-5 rounded-[1.5rem] bg-white border border-slate-200 text-[#05294E] font-black text-lg hover:bg-slate-50 transition-all"
                    >
                      <LogIn className="w-5 h-5" />
                      {t('nav.login')}
                    </Link>
                    <Link
                      to={location.search.includes('seller') ? `/seller/register${location.search}` : `/register${location.search}`}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center p-5 rounded-[1.5rem] bg-[#D0151C] text-white font-black text-lg shadow-lg shadow-red-500/20 hover:bg-[#B01218] transition-all"
                    >
                      {t('nav.getStarted')}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
    {/* Spacer para impedir que o conteúdo da página fique sob o header fixed (h-20) */}
    <div className="h-20" />
    </>
  );
};

export default Header;