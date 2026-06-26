import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
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
import MatriculaRewardsInvitePopup from '../../components/MatriculaRewardsInvitePopup';
import { useReferralCode } from '../../hooks/useReferralCode';
import { useStudentApplicationsQuery } from '../../hooks/useStudentDashboardQueries';
import ManualReview from './manual-review';
import { ZelleCheckoutPage } from '../../components/ZelleCheckoutPage';
import I20ControlFeeSuccess from './I20ControlFeeSuccess';
import I20ControlFeeError from './I20ControlFeeError';
import IdentityVerification from './IdentityVerification';
import Translations from './Translations';

const REWARDS_POPUP_KEY = 'rewards_invite_popup_dismissed_at';
const REWARDS_POPUP_SUPPRESS_DAYS = 7;

const StudentDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, userProfile } = useAuth();
  const { fetchCart } = useCartStore();
  const navigate = useNavigate();

  // Dados da universidade/curso para o popup de embaixador
  const { data: applications } = useStudentApplicationsQuery(userProfile?.id);
  const selectedApp = applications?.find(
    app => app.id === userProfile?.selected_application_id
  ) || applications?.[0];
  const ambassadorUniversityName = (selectedApp as any)?.scholarships?.universities?.name as string | undefined;
  const ambassadorCourseName = (selectedApp as any)?.scholarships?.field_of_study as string | undefined;

  // Referral Code System
  const {
    hasUsedReferralCode,
    applyReferralCodeFromURL,
    loading: referralLoading
  } = useReferralCode();
  const [showCongratulationsModal, setShowCongratulationsModal] = React.useState(false);
  const [referralResult, setReferralResult] = React.useState<any>(null);
  const [showRewardsPopup, setShowRewardsPopup] = React.useState(false);

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

  // MatriculaRewards invite popup — show to students who paid app fee but haven't seen it recently
  useEffect(() => {
    if (!userProfile?.is_application_fee_paid) return;

    const dismissedAt = localStorage.getItem(REWARDS_POPUP_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < REWARDS_POPUP_SUPPRESS_DAYS) return;
    }

    const timer = setTimeout(() => {
      setShowRewardsPopup(true);
      if (user?.id && !userProfile?.rewards_popup_shown_at) {
        supabase.from('user_profiles')
          .update({ rewards_popup_shown_at: new Date().toISOString() })
          .eq('user_id', user.id);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [userProfile?.is_application_fee_paid, user?.id, userProfile?.rewards_popup_shown_at]);

  const handleRewardsPopupClose = () => {
    localStorage.setItem(REWARDS_POPUP_KEY, String(Date.now()));
    setShowRewardsPopup(false);
  };

  const handleRewardsPopupAccept = () => {
    setShowRewardsPopup(false);
    if (user?.id) {
      supabase.from('user_profiles')
        .update({ rewards_popup_accepted_at: new Date().toISOString() })
        .eq('user_id', user.id);
    }
    navigate('/student/dashboard/rewards');
  };

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
        <Route path="translations" element={<Translations />} />
      </Routes>

      {referralResult && (
        <ReferralCongratulationsModal
          isOpen={showCongratulationsModal}
          onClose={() => setShowCongratulationsModal(false)}
          discountAmount={referralResult.discount_amount || 50}
          affiliateCode={referralResult.affiliate_code || 'N/A'}
        />
      )}

      <MatriculaRewardsInvitePopup
        isOpen={showRewardsPopup}
        onClose={handleRewardsPopupClose}
        onAccept={handleRewardsPopupAccept}
        variant="dashboard"
        universityName={ambassadorUniversityName}
        courseName={ambassadorCourseName}
      />
    </StudentDashboardLayout>
  );
};

export default StudentDashboard;