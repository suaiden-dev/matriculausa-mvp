import React, { useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import { useLocation } from 'react-router-dom';
import SmartChat from './SmartChat';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const hideHeader = location.pathname.startsWith('/school') ||
                     location.pathname.startsWith('/admin') ||
                     (location.pathname.startsWith('/student') && location.pathname !== '/student/register') ||
                     location.pathname.startsWith('/affiliate-admin') ||
                     location.pathname.startsWith('/seller') ||
                     location.pathname === '/smart-assistant';
  const hideFooter = hideHeader || location.pathname.startsWith('/checkout/zelle');
  const isDashboard = hideHeader;
  const isAdmin = location.pathname.startsWith('/admin');
  
  // Detectar se é uma tela de estudante para ajustar posicionamento
  const isStudentPage = location.pathname.startsWith('/student');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full overflow-x-hidden">
      {!hideHeader && <Header />}
      <main className={`flex-grow overflow-x-hidden ${isDashboard ? '' : 'overflow-y-auto'}`}>
        {children}
        {!isAdmin && location.pathname !== '/smart-assistant' && (
          <SmartChat isStudentPage={isStudentPage} />
        )}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};

export default Layout;