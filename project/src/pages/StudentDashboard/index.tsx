import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { setupCacheInvalidationListener } from '../../utils/cacheInvalidation';

import StudentDashboardLayout from './StudentDashboardLayout';
import Overview from './Overview';
import ScholarshipBrowser from './ScholarshipBrowser';
import MyApplications from './MyApplications';
import ProfileManagement from './ProfileManagement';

import { useCartStore } from '../../stores/applicationStore';
import DocumentsAndScholarshipChoice from './DocumentsAndScholarshipChoice';
import CollegeEnrollmentCheckout from './CollegeEnrollmentCheckout';
import CartPage from './CartPage';
import ScholarshipFeeSuccess from './ScholarshipFeeSuccess';
import ScholarshipFeeError from './ScholarshipFeeError';
import SelectionProcessFeeError from './SelectionProcessFeeError';
import ApplicationFeeSuccess from './ApplicationFeeSuccess';
import ApplicationFeeError from './ApplicationFeeError';
import ApplicationChatPage from './ApplicationChatPage';
import StudentChatPage from './StudentChatPage';
import ApplicationFeePage from './ApplicationFeePage';
import MatriculaRewards from './MatriculaRewards';
import RewardsStore from './RewardsStore';
import ReferralCongratulationsModal from '../../components/ReferralCongratulationsModal';
import { useReferralCode } from '../../hooks/useReferralCode';
import ManualReview from './manual-review';
import { ZelleCheckoutPage } from '../../components/ZelleCheckoutPage';
import I20ControlFeeSuccess from './I20ControlFeeSuccess';
import I20ControlFeeError from './I20ControlFeeError';
import IdentityVerification from './IdentityVerification';

const StudentDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { fetchCart } = useCartStore();

  // Referral Code System
  const {
    hasUsedReferralCode,
    applyReferralCodeFromURL,
    loading: referralLoading
  } = useReferralCode();
  const [showCongratulationsModal, setShowCongratulationsModal] = React.useState(false);
  const [referralResult, setReferralResult] = React.useState<any>(null);

  // Setup cache invalidation listener — invalida queries do React Query automaticamente
  useEffect(() => {
    const cleanup = setupCacheInvalidationListener(queryClient);
    return () => { cleanup(); };
  }, [queryClient]);

  // Carregar carrinho quando usuário estiver disponível
  useEffect(() => {
    if (user?.id) {
      fetchCart(user.id);
    }
  }, [user?.id, fetchCart]);

  // Aplicar código de referência da URL automaticamente
  useEffect(() => {
    const applyReferralCode = async () => {
      if (user && !hasUsedReferralCode && !referralLoading) {
        const result = await applyReferralCodeFromURL();
        if (result && result.success) {
          setReferralResult(result);
          setShowCongratulationsModal(true);
        }
      }
    };
    applyReferralCode();
  }, [user, hasUsedReferralCode, referralLoading, applyReferralCodeFromURL]);

  return (
    <StudentDashboardLayout>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="overview" element={<Overview />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="scholarships" element={<ScholarshipBrowser />} />
        <Route path="applications" element={<MyApplications />} />
        <Route path="application/:applicationId/chat" element={<ApplicationChatPage />} />
        <Route path="chat" element={<StudentChatPage />} />
        <Route path="profile" element={<ProfileManagement />} />
        <Route path="documents-and-scholarship-choice" element={<DocumentsAndScholarshipChoice />} />
        <Route path="college-enrollment-checkout" element={<CollegeEnrollmentCheckout />} />
        <Route path="/scholarship-fee-success" element={<ScholarshipFeeSuccess />} />
        <Route path="/scholarship-fee-error" element={<ScholarshipFeeError />} />
        <Route path="/selection-process-fee-error" element={<SelectionProcessFeeError />} />
        <Route path="/application-fee-success" element={<ApplicationFeeSuccess />} />
        <Route path="/application-fee-error" element={<ApplicationFeeError />} />
        <Route path="i20-control-fee-success" element={<I20ControlFeeSuccess />} />
        <Route path="i20-control-fee-error" element={<I20ControlFeeError />} />
        <Route path="application-fee" element={<ApplicationFeePage />} />
        <Route path="rewards" element={<MatriculaRewards />} />
        <Route path="rewards/store" element={<RewardsStore />} />
        <Route path="manual-review" element={<ManualReview />} />
        <Route path="zelle-payment" element={<ZelleCheckoutPage />} />
        <Route path="identity-verification" element={<IdentityVerification />} />
      </Routes>

      {referralResult && (
        <ReferralCongratulationsModal
          isOpen={showCongratulationsModal}
          onClose={() => setShowCongratulationsModal(false)}
          discountAmount={referralResult.discount_amount || 50}
          affiliateCode={referralResult.affiliate_code || 'N/A'}
        />
      )}
    </StudentDashboardLayout>
  );
};

export default StudentDashboard;