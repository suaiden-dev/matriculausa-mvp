import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import SchoolProfileSetup from './pages/SchoolProfileSetup';
import SchoolDashboard from './pages/SchoolDashboard/index';
import StudentDashboard from './pages/StudentDashboard/index';
import AdminDashboard from './pages/AdminDashboard/index';
import NewScholarship from './pages/SchoolDashboard/NewScholarship';
import ForgotPassword from './pages/ForgotPassword';
import AdminRegistration from './pages/AdminRegistration';
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

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
            <Route path="/scholarships" element={<Scholarships />} />
            <Route path="/schools" element={<Universities />} />
            <Route path="/schools/:slug" element={<UniversityDetail />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            {/* Student/Admin Dashboard Switch - sempre renderize StudentDashboard por padrão */}
            <Route path="/student/dashboard/*" element={<StudentDashboard />} />
            {/* School Routes */}
            <Route path="/school/termsandconditions" element={<TermsAndConditions />} />
            <Route path="/school/setup-profile" element={<SchoolProfileSetup />} />
            <Route path="/school/scholarship/new" element={<NewScholarship />} />
            <Route path="/school/dashboard/*" element={<SchoolDashboard />} />
            {/* Admin Dashboard Direct Route */}
            <Route path="/admin/dashboard/*" element={<AdminDashboard />} />
            {/* Placeholder routes for other pages */}
            <Route path="/services" element={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-2xl text-gray-600">Services page coming soon...</div></div>} />
            <Route path="/contact" element={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-2xl text-gray-600">Contact page coming soon...</div></div>} />
            <Route path="/checkout/success" element={<SuccessPage />} />
            <Route path="/scholarship-fee-success" element={<ScholarshipFeeSuccess />} />
            <Route path="/student/dashboard/scholarship-fee-success" element={<ScholarshipFeeSuccess />} />
            <Route path="/student/dashboard/application-fee/success" element={<ApplicationFeeSuccess />} />
            <Route path="/application-fee/cancel" element={<ApplicationFeeCancel />} />
            <Route path="/student/dashboard/payment-success" element={<SuccessPage />} />
            <Route path="/student/dashboard/enrollment-fee-success" element={<SuccessPage />} />
            <Route path="/student/dashboard/payment-error" element={<PaymentErrorPage />} />
            <Route path="/student/dashboard/application-fee-success" element={<ApplicationFeeSuccess />} />
            <Route path="/student/dashboard/application-fee-error" element={<ApplicationFeeError />} />
            <Route path="/student/i20-control-fee-success" element={<I20ControlFeeSuccess />} />
            <Route path="/student/i20-control-fee-error" element={<I20ControlFeeError />} />
            <Route path="/support-center" element={<SupportCenter />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact-us" element={<ContactUs />} />
            <Route path="/help-center" element={<HelpCenter />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/for-universities" element={<ForUniversities />} />
            <Route path="/email-oauth-callback" element={<EmailOAuthCallback />} />
            </Routes>
          </Layout>
        </AuthRedirect>
      </AuthProvider>
      </Router>
  );
}

export default App;