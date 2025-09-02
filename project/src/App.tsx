import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './hooks/useAuth';
import Layout from './components/Layout';
import AuthRedirect from './components/AuthRedirect';
import Home from './pages/Home';
import About from './pages/About';
import Auth from './pages/Auth';
import Scholarships from './pages/Scholarships';
import Universities from './pages/Universities';
import UniversityDetail from './pages/UniversityDetail';
import HowItWorks from './pages/HowItWorks';
import TermsAndConditions from './pages/TermsAndConditions';
import StudentTermsAcceptance from './pages/StudentTermsAcceptance';
import SchoolProfileSetup from './pages/SchoolProfileSetup';
import { SchoolDashboard } from './pages/SchoolDashboard/index';
import StudentDashboard from './pages/StudentDashboard/index';
import AdminDashboard from './pages/AdminDashboard/index';
import AffiliateAdminDashboard from './pages/AffiliateAdminDashboard/index';
import SellerDashboard from './pages/SellerDashboard/index';
import ForgotPassword from './pages/ForgotPassword';
import AdminRegistration from './pages/AdminRegistration';
import SellerRegistration from './pages/SellerRegistration';
import SuccessPage from './pages/SuccessPage';
import ScholarshipFeeSuccess from './pages/StudentDashboard/ScholarshipFeeSuccess';
import ApplicationFeeSuccess from './pages/StudentDashboard/ApplicationFeeSuccess';
import ApplicationFeeCancel from './pages/ApplicationFeeCancel';
import PaymentErrorPage from './pages/PaymentErrorPage';
import ApplicationFeeError from './pages/StudentDashboard/ApplicationFeeError';
import I20ControlFeeSuccess from './pages/StudentDashboard/I20ControlFeeSuccess';
import I20ControlFeeError from './pages/StudentDashboard/I20ControlFeeError';
import SupportCenter from './pages/SupportCenter';
import FAQ from './pages/FAQ';
import ContactUs from './pages/ContactUs';
import HelpCenter from './pages/HelpCenter';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ForUniversities from './pages/ForUniversities';
import EmailOAuthCallback from './pages/EmailOAuthCallback';
import AuthCallback from './pages/AuthCallback';
import { useReferralCodeCapture } from './hooks/useReferralCodeCapture';
import { ZelleCheckoutPage } from './components/ZelleCheckoutPage';
import { ZelleWaitingPage } from './components/ZelleWaitingPage';
import SmartAssistantLayout from './components/SmartAssistantLayout';

// Componente interno que usa o hook dentro do contexto do Router
const AppContent = () => {
  // Hook global para capturar códigos de referência em qualquer página
  useReferralCodeCapture();

  // Garantir que a página role para o topo em toda mudança de rota
  const location = useLocation();
  React.useEffect(() => {
    // scroll imediato para o topo após navegação
    try {
      window.scrollTo({ top: 0, behavior: 'auto' });
      // garantir também nos elementos document e body
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    } catch (e) {
      // ignore
    }

    // fallback: executar novamente após um curto delay para sobrepor efeitos filhos
    const id = window.setTimeout(() => {
      try {
        window.scrollTo({ top: 0, behavior: 'auto' });
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
      } catch (e) {}
    }, 80);

    return () => window.clearTimeout(id);
  }, [location.pathname, location.hash]);

  return (
    <AuthProvider>
      <AuthRedirect>
        <Layout>
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin/register" element={<AdminRegistration />} />
          <Route path="/seller/register" element={<SellerRegistration />} />
          <Route path="/scholarships" element={<Scholarships />} />
          <Route path="/schools" element={<Universities />} />
          <Route path="/schools/:slug" element={<UniversityDetail />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          {/* Student Routes */}
          <Route path="/student/terms" element={<StudentTermsAcceptance />} />
          <Route path="/student/dashboard/*" element={<StudentDashboard />} />
          {/* School Routes */}
          <Route path="/school/termsandconditions" element={<TermsAndConditions />} />
          <Route path="/school/setup-profile" element={<SchoolProfileSetup />} />
          {/* New Scholarship is nested inside SchoolDashboard provider */}
          <Route path="/school/dashboard/*" element={<SchoolDashboard />} />
          {/* Admin Dashboard Direct Route */}
          <Route path="/admin/dashboard/*" element={<AdminDashboard />} />
          {/* Affiliate Admin Dashboard */}
          <Route path="/affiliate-admin/dashboard/*" element={<AffiliateAdminDashboard />} />
          {/* Seller Dashboard */}
          <Route path="/seller/dashboard/*" element={<SellerDashboard />} />
          {/* Seller Student Details */}
          <Route path="/seller/student/:studentId" element={<SellerDashboard />} />
          {/* Placeholder routes for other pages */}
          <Route path="/services" element={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-2xl text-gray-600">Services page coming soon...</div></div>} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/support" element={<SupportCenter />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/for-universities" element={<ForUniversities />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/application-fee-cancel" element={<ApplicationFeeCancel />} />
          <Route path="/payment-error" element={<PaymentErrorPage />} />
          <Route path="/scholarship-fee-success" element={<ScholarshipFeeSuccess />} />
          <Route path="/email-oauth-callback" element={<EmailOAuthCallback />} />
          <Route path="/auth-callback" element={<AuthCallback />} />
          {/* Zelle Checkout Routes */}
          <Route path="/checkout/zelle/waiting" element={<ZelleWaitingPage />} />
          <Route path="/checkout/zelle" element={<ZelleCheckoutPage />} />
          
          {/* Smart Assistant Route */}
          <Route path="/smart-assistant" element={<SmartAssistantLayout />} />

          {/* Catch-all route for 404 */}
          <Route path="*" element={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-2xl text-gray-600">Page not found</div></div>} />
          </Routes>
        </Layout>
      </AuthRedirect>
      
      {/* Rotas de teste fora do AuthRedirect */}
      <Routes>
        <Route path="/test-simple" element={<div className="min-h-screen bg-blue-50 flex items-center justify-center"><div className="text-2xl text-blue-600">Test Simple Page - Working!</div></div>} />
        <Route path="/test-layout" element={<Layout><div className="min-h-screen bg-green-50 flex items-center justify-center"><div className="text-2xl text-green-600">Test Layout Page - Working!</div></div></Layout>} />
      </Routes>
      
    </AuthProvider>
  );
};

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <Router>
        <AppContent />
      </Router>
    </HelmetProvider>
  );
};

export default App;