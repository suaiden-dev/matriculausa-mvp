import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  User,
  FileText,
  BarChart3,
  Menu,
  X,
  LogOut,
  Gift,
  Bell,
  MessageSquare
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useSmartPollingNotifications } from '../../hooks/useSmartPollingNotifications';
import { useStudentChatUnreadCount } from '../../hooks/useStudentChatUnreadCount';
import { useUnreadMessages } from '../../contexts/UnreadMessagesContext';
import NotificationsModal from '../../components/NotificationsModal';
import LanguageSelector from '../../components/LanguageSelector';
import { IdentityVerificationModal } from '../../components/IdentityVerificationModal';
import { useIdentityPhotoStatusQuery } from '../../hooks/useStudentDashboardQueries';
// import { StripeCheckout } from '../../components/StripeCheckout';
// import StepByStepButton from '../../components/OnboardingTour/StepByStepButton';

interface StudentDashboardLayoutProps {
  children: React.ReactNode;
}

const StudentDashboardLayout: React.FC<StudentDashboardLayoutProps> = ({ children }) => {
  const { user, userProfile: profile, loading } = useAuth();
  const { t } = useTranslation(['dashboard', 'common']);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Usar Polling Inteligente em vez de Supabase Real-time
  const {
    notifications,
    unreadCount: newNotificationCount,
    markAsRead,
    markAllAsRead,
    clearAll, // Use clearAll directly from the hook to ensure UI updates
    requestNotificationPermission
  } = useSmartPollingNotifications({
    userType: 'student',
    userId: user?.id || '',
    onNotificationReceived: (notification) => {
      console.log('🔔 Nova notificação recebida via polling:', notification);
    }
  });

  // Hook para mensagens não lidas do chat admin-estudante
  const { unreadCount: serverChatUnreadCount, markStudentMessagesAsRead } = useStudentChatUnreadCount();
  const { unreadCount: contextChatUnreadCount, resetUnreadCount } = useUnreadMessages();

  // Foto de identidade
  const { isPending: _unusedLoading, refetch: refetchIdentityStatus } = useIdentityPhotoStatusQuery(user?.id);
  const [isSelfieModalOpen, setIsSelfieModalOpen] = useState(false);


  // Removido auto-opening da selfie - agora ocorre organicamente no Onboarding

  // Use context count if it's been updated, otherwise use server count
  const displayChatUnreadCount = contextChatUnreadCount > 0 ? contextChatUnreadCount : serverChatUnreadCount;


  // Scroll to top when location changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  // Solicitar permissão para notificações nativas na primeira renderização
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Threshold para obrigatoriedade do questionário: 18/02/2026 às 21:50 UTC (aproximadamente agora)
  const SURVEY_THRESHOLD_DATE = new Date('2026-02-18T21:50:00Z');
  const paidAt = profile?.selection_process_paid_at ? new Date(profile.selection_process_paid_at) : null;
  const isExemptedByLegacy = profile?.has_paid_selection_process_fee && (!paidAt || paidAt < SURVEY_THRESHOLD_DATE);

  // Redirecionamento obrigatório unificado removido para permitir acesso ao dashboard restrito (Chat/Perfil/Suporte) durante o onboarding.
  // A própria Overview.tsx e o estado isRestricted já lidam com a experiência do usuário nessas etapas.


  // Clean up duplicate useEffect if present (lines 80-83 in original file were duplicate)

  const openNotification = async (n: any) => {
    try {
      if (n && !n.read_at) {
        await markAsRead(n.id);
      }
    } catch { }
    setShowNotif(false);
    const target = n?.link || '/student/dashboard';
    navigate(target);
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await markAllAsRead();
    } catch { }
  };

  // Local clearAll removed in favor of hook's clearAll which manages state  // Close notifications dropdown when clicking outside
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
    if (path.includes('/chat')) return 'chat';
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
          <p className="text-slate-600 font-medium">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  /* Sidebar Items Definitions */
  const allSidebarItems = [
    { id: 'overview', label: t('studentDashboard.sidebar.overview'), icon: BarChart3, path: '/student/dashboard/overview' },
    // TODO: FUTURE_REMOVAL - Hiding per user request
    // { id: 'scholarships', label: t('studentDashboard.sidebar.browseScholarships'), icon: Award, path: '/student/dashboard/scholarships' },
    // { id: 'cart', label: t('studentDashboard.sidebar.selectedScholarships'), icon: GraduationCap, path: '/student/dashboard/cart' },
    { id: 'applications', label: t('studentDashboard.sidebar.myApplications'), icon: FileText, path: '/student/dashboard/applications' },
    { id: 'chat', label: t('studentDashboard.sidebar.supportChat'), icon: MessageSquare, path: '/student/dashboard/chat' },
    { id: 'rewards', label: t('studentDashboard.sidebar.matriculaRewards'), icon: Gift, path: '/student/dashboard/rewards' },
    { id: 'profile', label: t('studentDashboard.sidebar.profile'), icon: User, path: '/student/dashboard/profile' }
  ];

  /* Lógica de Bloqueio: Se pagou e não passou, entra em modo restrito */
  const selectionFeePaid = profile?.has_paid_selection_process_fee;
  const surveyPassed = profile?.selection_survey_passed;

  // Bloqueado se:
  // 1. Pagou a taxa recentemente (pós-threshold) MAS ainda não passou na prova.
  const isRestricted = !loading && !isExemptedByLegacy && selectionFeePaid && !surveyPassed;

  let displayedSidebarItems = allSidebarItems;

  if (isRestricted) {
    // Em modo restrito, garantimos que os itens essenciais continuem visíveis.
    // O questionário e o guia de onboarding estão dentro da Visão Geral, 
    // portanto 'overview' NÃO deve ser escondido.
    const allowedIds = ['overview', 'applications', 'chat', 'profile', 'rewards'];
    displayedSidebarItems = allSidebarItems.filter(item => allowedIds.includes(item.id));
  }

  const showSidebar = true; // Sidebar sempre exibe os permitidos, visto que sem obrigações concluídas ele sequer fica no Dashboard

  return (
    <div className="h-screen flex flex-col lg:flex-row w-full overflow-hidden">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:fixed lg:inset-y-0 lg:left-0
        h-screen flex flex-col overflow-y-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${!showSidebar ? 'hidden lg:hidden' : ''}
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
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden absolute right-3 sm:right-4 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Fechar menu lateral"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User Profile */}
            <div className="px-4 py-8 sm:px-6 border-b border-slate-200">
              <div className="flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="relative mb-4 group cursor-pointer" onClick={() => navigate('/student/dashboard/profile')}>
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl overflow-hidden ring-4 ring-white relative z-10 group-hover:scale-105 transition-transform duration-300">
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt="Profile Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    )}
                  </div>
                  {/* Subtle Glow behind avatar */}
                  <div className="absolute inset-0 bg-blue-400 blur-2xl opacity-20 -z-0 rounded-full scale-150 group-hover:opacity-40 transition-opacity" />
                </div>
                
                {/* User Info */}
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-lg sm:text-xl tracking-tight leading-tight">
                    {profile?.full_name || user?.name}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 font-medium truncate max-w-[240px] px-2" title={user?.email}>
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            {/* Navigation */}
            <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-2">
              <div className="px-3 mb-4 text-center lg:hidden">
                <p className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-[0.2em]">
                  {t('nav.studentDashboard')}
                </p>
              </div>
              {displayedSidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                // Em modo restrito, o item do Processo Seletivo deve pulsar


                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`group flex items-center justify-between px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl font-semibold transition-all duration-200 
                      ${isActive
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    onClick={() => {
                      if (window.innerWidth < 1024) setSidebarOpen(false);

                      // Resetar contador de mensagens não lidas quando clicar no Support Chat
                      if (item.id === 'chat') {
                        markStudentMessagesAsRead();
                        resetUnreadCount();
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="relative">
                        <Icon className={`h-5 w-5 sm:h-6 sm:w-6 
                            ${isActive ? 'text-white' : ''} 
                            ${!isActive ? 'text-slate-500' : ''}
                        `} />

                        {item.id === 'chat' && displayChatUnreadCount > 0 && (
                          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse ${isActive
                            ? 'bg-white border-2 border-blue-500'
                            : 'bg-blue-500'
                            }`}></div>
                        )}
                      </div>
                      <span className="text-sm sm:text-base">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sign Out - Bottom of Sidebar */}
          <div className="px-3 sm:px-4 py-4 border-t border-slate-200">
            <button
              onClick={handleLogout}
              className="group flex items-center w-full px-3 sm:px-4 py-3 sm:py-3.5 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 font-semibold"
            >
              <LogOut className="h-5 w-5 sm:h-6 sm:w-6 mr-3 group-hover:translate-x-1 transition-transform" />
              <span className="text-sm sm:text-base">{t('nav.signOut')}</span>
            </button>
          </div>
        </div>
      </div >

      {/* Overlay for mobile */}
      {
        sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )
      }

      {/* Main Content */}
      <div
        id="student-dashboard-content"
        ref={scrollContainerRef}
        className={`flex-1 ml-0 overflow-x-hidden h-screen overflow-y-auto ${showSidebar ? 'lg:ml-72' : ''}`}
      >
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-20 relative">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {showSidebar && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
                  aria-label="Open sidebar"
                >
                  <Menu className="h-6 w-6 lg:h-5 lg:w-5" />
                </button>
              )}
              <div className="min-w-0 flex-1 hidden lg:block">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 truncate">{t('studentDashboard.title')}</h1>
              </div>
            </div>
            
            {/* Logo Central (Mobile Only) */}
            <div className="lg:hidden absolute left-1/2 transform -translate-x-1/2">
              <Link to="/" className="flex items-center">
                <img
                  src="/logo.png.png"
                  alt="Matrícula USA"
                  className="h-10 w-auto lg:h-12"
                />
              </Link>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-4">
              {/* Notifications Bell */}
              <div className="relative notifications-container">
                <button
                  onClick={() => {
                    // Em mobile, abre modal; em desktop, abre dropdown
                    if (window.innerWidth < 768) {
                      setShowNotificationsModal(true);
                    } else {
                      setShowNotif(!showNotif);
                    }
                  }}
                  className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
                  title="Notifications"
                >
                  <Bell className="h-6 w-6 lg:h-5 lg:w-5 text-slate-600" />
                  {newNotificationCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold min-w-[20px] shadow-sm">
                      {newNotificationCount > 99 ? '99+' : newNotificationCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown - only show on desktop */}
                {showNotif && (
                  <div className="hidden md:block absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                    <div className="px-4 pb-2 border-b border-slate-200 font-semibold text-slate-900 flex items-center justify-between">
                      <span>{t('dashboard:studentDashboard.notifications.title')}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <button onClick={markAllNotificationsAsRead} className="text-blue-600 hover:underline">{t('dashboard:studentDashboard.notifications.markAllAsRead')}</button>
                        <span className="text-slate-300">|</span>
                        <button onClick={clearAll} className="text-red-600 hover:underline">{t('dashboard:studentDashboard.notifications.clearAll')}</button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-slate-500">{t('dashboard:studentDashboard.notifications.noNotifications')}</div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`px-4 py-3 hover:bg-slate-50 cursor-pointer ${!n.read_at ? 'bg-slate-50' : ''}`} onClick={() => openNotification(n)}>
                            <div className="text-sm font-medium text-slate-900 flex items-center justify-between">
                              <span>{t(`dashboard:studentDashboard.notifications.${n.title}`, n.title)}</span>
                              {!n.read_at && <span className="ml-2 h-2 w-2 rounded-full bg-blue-500 inline-block"></span>}
                            </div>
                            <div className="text-xs text-slate-600 mt-0.5">{t(`dashboard:studentDashboard.notifications.${n.message}`, n.message)}</div>
                            <div className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>



              {/* Language Selector */}
              <LanguageSelector variant="dashboard" showLabel={true} />

              {/* User Menu removed as it was moved to sidebar */}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 bg-slate-50 px-3 sm:px-6 lg:px-10 pb-6 max-w-full min-h-0">
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

      {/* Modal de Verificação de Identidade (Selfie) */}
      <IdentityVerificationModal
        isOpen={isSelfieModalOpen}
        onClose={() => setIsSelfieModalOpen(false)}
        onSuccess={() => {
          console.log('✅ [DashboardLayout] Selfie enviada com sucesso!');
          refetchIdentityStatus();
        }}
      />
    </div>
  );
};

export default StudentDashboardLayout;