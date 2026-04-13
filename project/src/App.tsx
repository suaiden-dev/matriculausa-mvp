import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/reactQuery';
import { AuthProvider } from './hooks/useAuth';
import { PaymentBlockedProvider } from './contexts/PaymentBlockedContext';
import { UnreadMessagesProvider } from './contexts/UnreadMessagesContext';
import Layout from './components/Layout';
import AuthRedirect from './components/AuthRedirect';
import Home from './pages/Home';
import About from './pages/About';
import Scholarships from './pages/Scholarships';
import Universities from './pages/Universities';
import UniversityDetail from './pages/UniversityDetail';
import HowItWorks from './pages/HowItWorks';
import ProcessoDetalhado from './pages/ProcessoDetalhado';
import TermsAndConditions from './pages/TermsAndConditions';
import StudentTermsAcceptance from './pages/StudentTermsAcceptance';
import ScholarshipFeeSuccess from './pages/StudentDashboard/ScholarshipFeeSuccess';
import ApplicationFeeCancel from './pages/ApplicationFeeCancel';
import PaymentErrorPage from './pages/PaymentErrorPage';
import { captureUtmFromUrl } from './utils/utmTracker';
import { useReferralCodeCapture } from './hooks/useReferralCodeCapture';
import { ZelleCheckoutPage } from './components/ZelleCheckoutPage';
import { ZelleWaitingPage } from './components/ZelleWaitingPage';
import SmartAssistantLayout from './components/SmartAssistantLayout';
import { Toaster } from 'react-hot-toast';
import CookieBanner from './components/CookieBanner';

// ✅ OTIMIZAÇÃO: Lazy loading de Dashboards e páginas pesadas para reduzir bundle inicial
const StudentDashboard = React.lazy(() => import('./pages/StudentDashboard/index'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard/index'));
const AffiliateAdminDashboard = React.lazy(() => import('./pages/AffiliateAdminDashboard/index'));
const SellerDashboard = React.lazy(() => import('./pages/SellerDashboard/index'));
const SchoolDashboard = React.lazy(() => import('./pages/SchoolDashboard/index').then(m => ({ default: m.SchoolDashboard })));
const SchoolProfileSetup = React.lazy(() => import('./pages/SchoolProfileSetup'));
const Auth = React.lazy(() => import('./pages/Auth'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const AdminRegistration = React.lazy(() => import('./pages/AdminRegistration'));
const SellerRegistration = React.lazy(() => import('./pages/SellerRegistration'));
const SellerStudentRegistration = React.lazy(() => import('./pages/SellerStudentRegistration'));
const StudentOnboarding = React.lazy(() => import('./pages/StudentOnboarding/StudentOnboarding'));
const QuickRegistration = React.lazy(() => import('./pages/QuickRegistration'));
const PreQualificationLanding = React.lazy(() => import('./pages/PreQualificationLanding'));
const SuccessPage = React.lazy(() => import('./pages/SuccessPage'));
const CheckoutSuccess = React.lazy(() => import('./pages/CheckoutSuccess'));
const ZellePaymentSuccess = React.lazy(() => import('./pages/ZellePaymentSuccess'));
const EB3JobsLanding = React.lazy(() => import('./pages/EB3JobsLanding'));
const MatriculaRewardsLanding = React.lazy(() => import('./pages/MatriculaRewardsLanding'));
const SupportCenter = React.lazy(() => import('./pages/SupportCenter'));
const FAQ = React.lazy(() => import('./pages/FAQ'));
const ContactUs = React.lazy(() => import('./pages/ContactUs'));
const HelpCenter = React.lazy(() => import('./pages/HelpCenter'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));
const ForUniversities = React.lazy(() => import('./pages/ForUniversities'));
const ForStudents = React.lazy(() => import('./pages/ForStudents'));
const EmailOAuthCallback = React.lazy(() => import('./pages/EmailOAuthCallback'));
const AuthCallback = React.lazy(() => import('./pages/AuthCallback'));
const MicrosoftCallback = React.lazy(() => import('./pages/MicrosoftCallback'));
const Auth323NetworkCallback = React.lazy(() => import('./pages/Auth323NetworkCallback'));
const UnsubscribeNewsletter = React.lazy(() => import('./pages/UnsubscribeNewsletter'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const WorkshopRegistrationLanding = React.lazy(() => import('./pages/WorkshopRegistrationLanding'));

// Fallback de Loading
import PageSkeleton from './components/PageSkeleton';



// Componente interno que usa o hook dentro do contexto do Router
const AppContent = () => {

  // Hook global para capturar códigos de referência em qualquer página
  useReferralCodeCapture();

  // Garantir que a página role para o topo em toda mudança de rota (exceto quando é apenas uma âncora/hash)
  const location = useLocation();
  React.useEffect(() => {
    // Se temos um hash, não forçamos scroll para o topo pois o navegador deve pular para a âncora
    if (location.hash) return;

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
        if (location.hash) return; // double check no fallback
        window.scrollTo({ top: 0, behavior: 'auto' });
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
      } catch (e) { }
    }, 80);

    return () => window.clearTimeout(id);
  }, [location.pathname]); // Removido location.hash das dependências

  // Captura parâmetros UTM da URL (especificamente para links da Brant Immigration)
  useEffect(() => {
    captureUtmFromUrl();
  }, [location.pathname, location.search]);

  return (
    <Layout>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/auth" element={<Auth mode="register" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin/register" element={<AdminRegistration />} />
          <Route path="/seller/register" element={<SellerRegistration />} />
          <Route path="/student/register" element={<SellerStudentRegistration />} />
          <Route path="/scholarships" element={<Scholarships />} />
          <Route path="/selection-fee-registration" element={<QuickRegistration />} />
          <Route path="/workshop" element={<WorkshopRegistrationLanding />} />
          <Route path="/pre-qualification" element={<PreQualificationLanding />} />
          <Route path="/schools" element={<Universities />} />
          <Route path="/schools/:slug" element={<UniversityDetail />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/processo-detalhado" element={<ProcessoDetalhado />} />
          <Route path="/matricula-rewards" element={<MatriculaRewardsLanding />} />
          {/* Student Routes */}
          <Route path="/student/terms" element={<StudentTermsAcceptance />} />
          <Route path="/student/onboarding" element={<StudentOnboarding />} />
          <Route path="/student/dashboard/*" element={<StudentDashboard />} />
          {/* School Routes */}
          <Route path="/school/termsandconditions" element={<TermsAndConditions />} />
          <Route
            path="/school/setup-profile"
            element={
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Carregando...</div>}>
                <SchoolProfileSetup />
              </Suspense>
            }
          />
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
          <Route path="/for-students" element={<ForStudents />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/application-fee-cancel" element={<ApplicationFeeCancel />} />
          <Route path="/payment-error" element={<PaymentErrorPage />} />
          <Route path="/scholarship-fee-success" element={<ScholarshipFeeSuccess />} />
          <Route path="/email-oauth-callback" element={<EmailOAuthCallback />} />
          <Route path="/auth-callback" element={<AuthCallback />} />
          <Route path="/microsoft-email" element={<MicrosoftCallback />} />
          {/* SSO 323 Network - Suporta ambas as rotas para compatibilidade */}
          <Route path="/auth/callback" element={<Auth323NetworkCallback />} />
          <Route path="/auth/323-network/callback" element={<Auth323NetworkCallback />} />
          <Route path="/eb3-jobs" element={<EB3JobsLanding />} />
          <Route path="/unsubscribe" element={<UnsubscribeNewsletter />} />

          <Route path="/checkout/zelle/waiting" element={<ZelleWaitingPage />} />
          <Route path="/checkout/zelle" element={<ZelleCheckoutPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/zelle/success" element={<ZellePaymentSuccess />} />

          {/* Smart Assistant Route */}
          <Route path="/smart-assistant" element={<SmartAssistantLayout />} />

          {/* Catch-all route for 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <PaymentBlockedProvider>
              <UnreadMessagesProvider>
                <AuthRedirect>
                  <AppContent />
                  <Toaster position="top-right" />
                  <CookieBanner />
                </AuthRedirect>
              </UnreadMessagesProvider>
            </PaymentBlockedProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;