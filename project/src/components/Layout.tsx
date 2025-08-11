import React, { useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
// import StepByStepButton from './OnboardingTour/StepByStepButton';
// import GuideTestButton from './OnboardingTour/GuideTestButton';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const hideHeader = location.pathname.startsWith('/school') ||
                     location.pathname.startsWith('/admin') ||
                     location.pathname.startsWith('/student');
  const hideFooter = hideHeader;
  const isDashboard = hideHeader;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full overflow-x-hidden">
      {!hideHeader && <Header />}
      <main className={`flex-grow overflow-x-hidden ${isDashboard ? '' : 'overflow-hidden'}`}>
        {children}
      </main>
      {!hideFooter && <Footer />}
      {/* <StepByStepButton /> */}
      {/* <GuideTestButton /> */}
    </div>
  );
};

export default Layout;

export const AnalyzingLoader: React.FC<{ message?: string }> = ({ message = 'Analyzing uploaded documents...' }) => (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[1000]">
    <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 relative animate-fade-in flex flex-col items-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-6"></div>
      <h2 className="text-2xl font-extrabold mb-2 text-slate-800 text-center">{message}</h2>
      <p className="text-slate-500 text-center">This may take up to 1 minute.</p>
    </div>
  </div>
);