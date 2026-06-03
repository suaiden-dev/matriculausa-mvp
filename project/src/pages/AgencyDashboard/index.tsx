import React, { useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import AgencyDashboardLayout from './AgencyDashboardLayout';
import Overview from './Overview';
import SellerManagement from './SellerManagement';
import PaymentManagement from './PaymentManagement';
import EnhancedStudentTracking from './EnhancedStudentTrackingRefactored';
import Analytics from './Analytics';
import ProfileSettings from './ProfileSettings';
import MyStudents from './MyStudents';
import UtmTracking from './UtmTracking';
import { 
  useFinancialStatsQuery, 
  useAgencySellersQuery, 
  useAgencyStudentProfilesQuery,
  useAgencyDataQuery
} from '../../hooks/useAgencyQueries';



interface Student {
  id: string;
  full_name: string;
  email: string;
  country?: string;
  referred_by_seller_id: string;
  seller_name: string;
  seller_referral_code: string;
  referral_code_used: string;
  total_paid: number;
  created_at: string;
  status: string;
  application_status?: string;
  has_paid_selection_process_fee?: boolean;
  has_paid_i20_control_fee?: boolean;
  is_scholarship_fee_paid?: boolean;
  is_application_fee_paid?: boolean;
  system_type?: string;
  has_paid_reinstatement_package?: boolean;
  has_paid_ds160_package?: boolean;
  has_paid_i539_cos_package?: boolean;
}

interface Seller {
  id: string;
  name: string;
  referral_code: string;
}

const AgencyDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id;
  const userRole = user?.role;

  // React Query hooks for data loading
  const { data: adminData, isLoading: loadingAdmin } = useAgencyDataQuery(userId);
  const affiliateAdminId = adminData?.affiliateAdminId;

  const { data: statsData, isLoading: loadingStats, refetch: refetchStats } = useFinancialStatsQuery(userId);
  const { data: sellersData, isLoading: loadingSellers, refetch: refetchSellers } = useAgencySellersQuery(affiliateAdminId);
  const { data: studentsData, isLoading: loadingStudents, refetch: refetchStudents } = useAgencyStudentProfilesQuery(userId);

  const loading = loadingAdmin || loadingStats || loadingSellers || loadingStudents;

  // Processed data for components
  const stats = statsData?.stats ? {
    totalStudents: statsData.stats.totalReferrals,
    totalRevenue: statsData.stats.totalCredits,
    totalSellers: sellersData?.length || 0,
    activeSellers: sellersData?.filter(s => s.is_active).length || 0,
    availableBalance: statsData.stats.totalEarned,
    pendingSellers: 0,
    approvedSellers: 0,
    rejectedSellers: 0
  } : {
    totalStudents: 0,
    totalRevenue: 0,
    totalSellers: 0,
    activeSellers: 0,
    availableBalance: 0,
    pendingSellers: 0,
    approvedSellers: 0,
    rejectedSellers: 0
  };

  const sellers: Seller[] = (sellersData as Seller[]) || [];
  const students: Student[] = (studentsData as Student[]) || [];

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchStats(),
      refetchSellers(),
      refetchStudents()
    ]);
  }, [refetchStats, refetchSellers, refetchStudents]);

  // Trava para evitar loop infinito na checagem do onboarding
  const hasCheckedOnboarding = useRef(false);

  useEffect(() => {
    if (userId && userRole === 'affiliate_admin' && !hasCheckedOnboarding.current) {
      hasCheckedOnboarding.current = true;
      // Check onboarding completion before loading dashboard
      supabase
        .from('affiliate_admins')
        .select('onboarding_completed')
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data }) => {
          if (data && !data.onboarding_completed) {
            navigate('/agency/onboarding');
          }
        });
    }
  }, [userId, userRole, navigate]);



  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <AgencyDashboardLayout user={user} onRefresh={handleRefresh}>
      <Routes>
        <Route 
          index 
          element={
            <Overview
              stats={stats}
              sellers={sellers}
              students={students}
              onRefresh={handleRefresh}
              userId={userId}
              commissionRules={adminData?.commission_rules ?? null}
            />
          } 
        />
        <Route path="users" element={<SellerManagement />} />
        <Route path="payments" element={<PaymentManagement />} />
        <Route 
          path="sales" 
          element={
            <EnhancedStudentTracking userId={userId} />
          } 
        />
        <Route 
          path="my-students" 
          element={<MyStudents />} 
        />
        <Route 
          path="analytics" 
          element={
            <Analytics 
              stats={stats}
              sellers={sellers}
              students={students}
              userId={userId}
            />
          } 
        />
        <Route 
          path="utm-tracking" 
          element={<UtmTracking />} 
        />
        <Route 
          path="profile" 
          element={
            <ProfileSettings 
              user={user}
            />
          } 
        />
      </Routes>
    </AgencyDashboardLayout>
  );
};

export default AgencyDashboard;
