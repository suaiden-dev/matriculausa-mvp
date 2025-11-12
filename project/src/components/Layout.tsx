import React, { useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import { useLocation } from 'react-router-dom';
import SmartChat from './SmartChat';
import { ModalProvider, useModal } from '../contexts/ModalContext';

interface LayoutProps {
  children: React.ReactNode;
}

const LayoutContent: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { isModalOpen } = useModal();
  
  console.log('[Layout] 🔍 Layout renderizado - pathname:', location.pathname, 'Timestamp:', new Date().toISOString());
  
  const hideHeader = location.pathname.startsWith('/school') ||
                     location.pathname.startsWith('/admin') ||
                     (location.pathname.startsWith('/student') && location.pathname !== '/student/register') ||
                     location.pathname.startsWith('/affiliate-admin') ||
                     location.pathname.startsWith('/seller') ||
                     location.pathname === '/smart-assistant';
  const hideFooter = hideHeader || location.pathname.startsWith('/checkout/zelle');
  const isDashboard = hideHeader;
  const isAdmin = location.pathname.startsWith('/admin');
  const isStudentChatPage = location.pathname.startsWith('/student/dashboard/chat');
  
  // Esconder SmartChat apenas na página do inbox OU quando modal está aberto OU na página de onboarding
  const hideSmartChat = location.pathname.includes('/microsoft-inbox') || 
                       location.pathname.includes('/microsoft') ||
                       location.pathname.includes('/email/inbox') ||
                       location.pathname.includes('/inbox') ||
                       location.pathname === '/smart-assistant' ||
                       location.pathname.includes('/applications') ||
                       location.pathname.includes('/student/onboarding') ||
                       isModalOpen; // 🎯 NOVA CONDIÇÃO: esconder quando modal está aberto
  
  // Debug log
  console.log('🔍 Layout Debug:', {
    pathname: location.pathname,
    hideSmartChat,
    isModalOpen,
    shouldShow: !isAdmin && !hideSmartChat
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full overflow-x-hidden">
      {!hideHeader && <Header />}
      <main className={`flex-grow overflow-x-hidden ${isDashboard ? '' : 'overflow-y-auto'}`}>
        {children}
        {!isAdmin && !hideSmartChat && !isStudentChatPage && (
          <SmartChat isStudentPage={location.pathname.startsWith('/student')} />
        )}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <ModalProvider>
      <LayoutContent>{children}</LayoutContent>
    </ModalProvider>
  );
};

export default Layout;