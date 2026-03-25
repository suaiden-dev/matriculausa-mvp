import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { University, Scholarship } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import AdminDashboardLayout from './AdminDashboardLayout';
// ✅ OTIMIZAÇÃO: Lazy loading de sub-módulos administrativos
import Overview from './Overview'; // Manter Overview estático por ser a "Home" do dash
const UniversityManagement = lazy(() => import('./UniversityManagement'));
const UniversityDetails = lazy(() => import('./UniversityDetails'));
const UsersHub = lazy(() => import('./UsersHub'));
const ScholarshipManagement = lazy(() => import('./ScholarshipManagement'));
const AdminScholarshipEdit = lazy(() => import('./AdminScholarshipEdit'));
const PaymentManagement = lazy(() => import('./PaymentManagement'));
const ApplicationMonitoring = lazy(() => import('./ApplicationMonitoring'));
const AdminApplicationView = lazy(() => import('./AdminApplicationView'));
const MatriculaRewardsAdmin = lazy(() => import('./MatriculaRewardsAdmin'));
const AdminPayoutRequests = lazy(() => import('./PayoutRequests'));
const AffiliatePaymentRequests = lazy(() => import('./AffiliatePaymentRequests'));
const FeaturedUniversitiesManagement = lazy(() => import('./FeaturedUniversitiesManagement'));
const FeaturedScholarshipsManagement = lazy(() => import('./FeaturedScholarshipsManagement'));
const AdminTransferManagement = lazy(() => import('./AdminTransferManagement'));
const AutoTransferSettings = lazy(() => import('./AutoTransferSettings'));
const FinancialAnalytics = lazy(() => import('./FinancialAnalytics'));
const TermsManagement = lazy(() => import('./TermsManagement'));
const CouponManagement = lazy(() => import('./CouponManagement'));
const NewsletterManagement = lazy(() => import('./NewsletterManagement'));
const AffiliateManagement = lazy(() => import('./AffiliateManagement'));
const AdminStudentDetailsRefactored = lazy(() => import('./AdminStudentDetails.refactored'));
const SystemSettings = lazy(() => import('./SystemSettings'));

import { AdminContentSkeleton } from '../../components/AdminDashboardSkeleton';

import { Dialog } from '@headlessui/react';

import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface AdminStats {
  totalUniversities: number;
  pendingUniversities: number;
  approvedUniversities: number;
  totalStudents: number;
  totalScholarships: number;
  totalApplications: number;
  totalFunding: number;
  monthlyGrowth: number;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'student' | 'school' | 'admin';
  country?: string;
  field_of_interest?: string;
  status: 'active' | 'inactive' | 'suspended';
  applications_count: number;
  created_at: string;
  last_active: string;
  selection_survey_passed?: boolean;
}

interface Application {
  id: string;
  student_name: string;
  student_email: string;
  scholarship_title: string;
  university_name: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  applied_at: string;
  reviewed_at?: string;
  notes?: string;
}
import { AdminNotificationsProvider } from '../../contexts/AdminNotificationsContext';

const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const [universities, setUniversities] = useState<University[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Track se já carregamos dados uma vez para cache inteligente
  const [hasLoadedData, setHasLoadedData] = useState(false);
  
  
  // Estados para modais de confirmação
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    type: 'success' | 'warning' | 'danger';
  } | null>(null);
  
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    universityId: string;
    universityName: string;
  } | null>(null);
  
  const [rejectionReason, setRejectionReason] = useState('');

  const [stats, setStats] = useState<AdminStats>({
    totalUniversities: 0,
    pendingUniversities: 0,
    approvedUniversities: 0,
    totalStudents: 0,
    totalScholarships: 0,
    totalApplications: 0,
    totalFunding: 0,
    monthlyGrowth: 12.5
  });

  // Novos estados consolidados para o Overview
  const [pendingStats, setPendingStats] = useState({
    universityRequestsCount: 0,
    universityRequestsAmount: 0,
    affiliateRequestsCount: 0,
    affiliateRequestsAmount: 0,
    zellePaymentsCount: 0,
    zellePaymentsAmount: 0,
    loadingPayments: true
  });


  useEffect(() => {
    const path = location.pathname;

    if (!user || user.role !== 'admin') return;

    if (path.includes('/payments')) {
      // Rota de payments: PaymentManagement carrega seus próprios dados
      setLoading(false);
      return;
    }

    // Carregar dados apenas para rotas que precisam
    const needsData =
      path.endsWith('/admin/dashboard') ||
      path.endsWith('/admin/dashboard/') ||
      path.includes('/universities') ||
      path.includes('/scholarships') ||
      path.includes('/users') ||
      path.includes('/settings');

    if (needsData) {
      loadAdminData();
    } else {
      setLoading(false);
    }
    // Usar user.id e user.role (primitivos) como dependências, não o objeto user inteiro.
    // O useAuth reconstrói o objeto user várias vezes no boot, o que causava 3 chamadas duplicadas.
  }, [user?.id, user?.role, location.pathname]);

  const showConfirmationModal = (
    title: string,
    message: string,
    confirmText: string,
    cancelText: string,
    onConfirm: () => void,
    type: 'success' | 'warning' | 'danger' = 'warning'
  ) => {
    setConfirmationModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm,
      type
    });
  };

  const closeConfirmationModal = () => {
    setConfirmationModal(null);
  };

  const loadAdminData = async () => {
    try {
      // CACHE INTELIGENTE: Só mostrar loading se não temos dados ainda
      if (!hasLoadedData) {
        setLoading(true);
      }
      setError(null);

      // PARALELIZAÇÃO: Disparar todas as queries independentes de uma vez
      // Reduzimos de 8 queries sequenciais para 5 paralelas
      // Reduzimos de 8 queries sequenciais para 5 paralelas
      const isDev = window.location.hostname === 'localhost';

      let universitiesQuery = supabase.from('universities').select('*').order('created_at', { ascending: false });
      let applicationsQuery = supabase.from('scholarship_applications').select('*, scholarships!inner(title, amount, universities!inner(name))').order('created_at', { ascending: false });

      if (!isDev) {
        // Filtrar e-mails de teste diretamente no banco para performance em produção
        universitiesQuery = universitiesQuery.not('email', 'ilike', '%@uorak.com%');
        applicationsQuery = applicationsQuery.not('email', 'ilike', '%@uorak.com%');
      }

      const [
        universitiesRes,
        scholarshipsRes,
        applicationsRes,
        usersRes,
        statsRes,
        universityPayoutsRes,
        zellePaymentsRes
      ] = await Promise.all([
        universitiesQuery,
        supabase.from('scholarships').select('*, universities!inner(name)').order('created_at', { ascending: false }),
        applicationsQuery,
        supabase.rpc('get_admin_users_data'),
        supabase.rpc('get_admin_dashboard_stats_v2'),
        // Busca consolidada de solicitações de pagamento (university e affiliate)
        supabase.from('university_payout_requests').select('status, amount_usd, request_type').eq('status', 'pending').in('request_type', ['university_payment', 'affiliate_payout']),
        supabase.from('zelle_payments').select('amount').eq('status', 'pending_verification').gt('amount', 0)
      ]);


      // Verificar erros críticos (Universidades e Usuários são fundamentais)
      if (universitiesRes.error) throw new Error(`Universities: ${universitiesRes.error.message}`);
      if (usersRes.error) {
        console.error('Error loading admin users data:', usersRes.error);
        // Fallback silencioso para não quebrar o dashboard todo
      }

      // Logs de erros não-críticos para debug
      if (scholarshipsRes.error) console.error('Error loading scholarships:', scholarshipsRes.error);
      if (applicationsRes.error) console.error('Error loading applications:', applicationsRes.error);
      if (statsRes.error) console.error('Error loading dashboard stats:', statsRes.error);

      const universitiesData = universitiesRes.data || [];
      const scholarshipsData = scholarshipsRes.data || [];
      const applicationsData = applicationsRes.data || [];
      const adminUsersData = usersRes.data || [];
      const dashboardStatsData = statsRes.data || [];

      // Mapeamentos rápidos para processamento eficiente no frontend
      const userEmails: Record<string, string> = {};
      const userProfilesMap: Record<string, any> = {};
      
      adminUsersData.forEach((u: any) => {
        userEmails[u.id] = u.email;
        userProfilesMap[u.id] = {
          full_name: u.full_name,
          phone: u.phone,
          status: u.status
        };
      });

      const applicationCounts: Record<string, number> = {};
      const cartCounts: Record<string, number> = {};
      
      dashboardStatsData.forEach((s: any) => {
        applicationCounts[s.scholarship_id] = Number(s.application_count);
        cartCounts[s.scholarship_id] = Number(s.cart_count);
      });

      // Processar dados para o estado do componente
      const processedUniversities = universitiesData.map((university: any) => ({
        ...university,
        user_email: userEmails[university.user_id] || null,
        user_profile: userProfilesMap[university.user_id] || null
      }));

      const processedScholarships = scholarshipsData.map((scholarship: any) => ({
        ...scholarship,
        application_count: applicationCounts[scholarship.id] || 0,
        cart_count: cartCounts[scholarship.id] || 0
      }));

      const finalUsersData = adminUsersData.map((u: any) => ({
        id: u.id,
        user_id: u.id,
        full_name: u.full_name || 'Unknown User',
        email: u.email || 'Email not available',
        role: u.role || u.raw_user_meta_data?.role || 'student',
        country: u.country,
        field_of_interest: u.field_of_interest,
        status: u.status || 'active',
        applications_count: 0,
        created_at: u.created_at,
        last_active: u.last_active || u.created_at
      }));

      const processedApplications = applicationsData.map((app: any) => ({
        id: app.id,
        student_name: userProfilesMap[app.student_id]?.full_name || 'Student User',
        student_email: userEmails[app.student_id] || '',
        scholarship_title: app.scholarships?.title || 'Unknown Scholarship',
        university_name: app.scholarships?.universities?.name || 'Unknown University',
        amount: app.scholarships?.amount || 0,
        status: app.status,
        applied_at: app.applied_at,
        reviewed_at: app.reviewed_at,
        notes: app.notes
      }));

      setUniversities(processedUniversities);
      setUsers(finalUsersData);
      setScholarships(processedScholarships);
      setApplications(processedApplications);

      // Processar dados de pagamentos pendentes
      const allPayoutRequests = universityPayoutsRes.data || [];
      const pendingUni = allPayoutRequests.filter(r => r.request_type === 'university_payment');
      const pendingAff = allPayoutRequests.filter(r => r.request_type === 'affiliate_payout');
      const pendingZelle = zellePaymentsRes.data || [];

      setPendingStats({
        universityRequestsCount: pendingUni.length,
        universityRequestsAmount: pendingUni.reduce((sum, r) => sum + (r.amount_usd || 0), 0),
        affiliateRequestsCount: pendingAff.length,
        affiliateRequestsAmount: pendingAff.reduce((sum, r) => sum + (r.amount_usd || 0), 0),
        zellePaymentsCount: pendingZelle.length,
        zellePaymentsAmount: pendingZelle.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
        loadingPayments: false
      });

      // Calcular estatísticas consolidadas para os cards do topo
      const newStats: AdminStats = {
        totalUniversities: processedUniversities.length,
        pendingUniversities: processedUniversities.filter((u: any) => !u.is_approved).length,
        approvedUniversities: processedUniversities.filter((u: any) => u.is_approved).length,
        totalStudents: finalUsersData.filter((u: any) => u.role === 'student').length,

        totalScholarships: processedScholarships.length,
        totalApplications: processedApplications.length,
        totalFunding: processedScholarships.reduce((sum, s) => sum + Number(s.amount), 0),
        monthlyGrowth: 12.5
      };

      setStats(newStats);
      setHasLoadedData(true);
    } catch (error: any) {
      console.error('Error loading admin data:', error);
      setError(`Failed to load admin data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUniversity = async (universityId: string) => {
    const university = universities.find(u => u.id === universityId);
    if (!university) return;

    showConfirmationModal(
      'Approve University',
      `Are you sure you want to approve "${university.name}"? This will grant them access to create scholarships and manage students.`,
      'Approve University',
      'Cancel',
      async () => {
        try {
          const { error } = await supabase.rpc('approve_university', {
            university_id_param: universityId
          });

          if (error) throw error;

          setUniversities(prev => prev.map(u => 
            u.id === universityId ? { ...u, is_approved: true } : u
          ));
          
          setStats(prev => ({
            ...prev,
            approvedUniversities: prev.approvedUniversities + 1,
            pendingUniversities: prev.pendingUniversities - 1
          }));

          // Show success message
          showConfirmationModal(
            'Success!',
            `${university.name} has been approved successfully.`,
            'OK',
            '',
            () => closeConfirmationModal(),
            'success'
          );
        } catch (error: any) {
          console.error('Error approving university:', error);
          showConfirmationModal(
            'Error',
            `Failed to approve university: ${error.message}`,
            'OK',
            '',
            () => closeConfirmationModal(),
            'danger'
          );
        }
      },
      'success'
    );
  };

  const handleRejectUniversity = async (universityId: string) => {
    const university = universities.find(u => u.id === universityId);
    if (!university) return;

    setRejectionModal({
      isOpen: true,
      universityId,
      universityName: university.name
    });
  };

  const confirmRejectUniversity = async () => {
    if (!rejectionModal) return;

    try {
      const { error } = await supabase.rpc('reject_university', {
        university_id_param: rejectionModal.universityId,
        reason_text: rejectionReason || ''
      });

      if (error) throw error;

      // Update local state
      setUniversities(prev => prev.filter(u => u.id !== rejectionModal.universityId));
      setStats(prev => ({
        ...prev,
        totalUniversities: prev.totalUniversities - 1,
        pendingUniversities: prev.pendingUniversities - 1
      }));

      // Close modal and show success
      setRejectionModal(null);
      setRejectionReason('');
      
      showConfirmationModal(
        'Success!',
        `${rejectionModal.universityName} has been rejected and removed successfully.`,
        'OK',
        '',
        () => closeConfirmationModal(),
        'success'
      );
    } catch (error: any) {
      console.error('Error rejecting university:', error);
      showConfirmationModal(
        'Error',
        `Failed to reject university: ${error.message}`,
        'OK',
        '',
        () => closeConfirmationModal(),
        'danger'
      );
    }
  };

  const handleSuspendUser = async (userId: string) => {
    const userProfile = users.find(u => u.user_id === userId);
    if (!userProfile) return;

    showConfirmationModal(
      'Suspend User',
      `Are you sure you want to suspend "${userProfile.full_name}"? This will prevent them from accessing the platform.`,
      'Suspend User',
      'Cancel',
      async () => {
        try {
          const { error } = await supabase
            .from('user_profiles')
            .update({ status: 'suspended' })
            .eq('user_id', userId);

          if (error) throw error;

          await supabase.rpc('log_admin_action', {
            action_text: 'suspend_user',
            target_type_text: 'user',
            target_id_param: userId
          });

          setUsers(prev => prev.map(u => 
            u.user_id === userId ? { ...u, status: 'suspended' } : u
          ));

          showConfirmationModal(
            'Success!',
            `${userProfile.full_name} has been suspended successfully.`,
            'OK',
            '',
            () => closeConfirmationModal(),
            'success'
          );
        } catch (error: any) {
          console.error('Error suspending user:', error);
          showConfirmationModal(
            'Error',
            `Failed to suspend user: ${error.message}`,
            'OK',
            '',
            () => closeConfirmationModal(),
            'danger'
          );
        }
      },
      'warning'
    );
  };

  // Calculate stats for components
  const componentStats = {
    universities: {
      total: stats.totalUniversities,
      pending: stats.pendingUniversities,
      approved: stats.approvedUniversities
    },
    users: {
      total: users.length,
      students: stats.totalStudents,
      schools: users.filter(u => u.role === 'school').length,
      admins: users.filter(u => u.role === 'admin').length
    },
    scholarships: {
      total: stats.totalScholarships,
      active: scholarships.filter(s => s.is_active).length,
      totalFunding: stats.totalFunding
    },
    applications: {
      total: stats.totalApplications,
      pending: applications.filter(a => a.status === 'pending').length,
      approved: applications.filter(a => a.status === 'approved').length
    }
  };

  return (
    <AdminNotificationsProvider>
      <AdminDashboardLayout user={user} loading={loading}>
        <Suspense fallback={<AdminContentSkeleton />}>
          <Routes>
            <Route 
              index 
              element={
                <Overview 
                  stats={stats}
                  universities={universities}
                  users={users}
                  pendingStats={pendingStats}
                  error={error}
                  onApprove={handleApproveUniversity}
                  onReject={handleRejectUniversity}
                />
              } 
            />
            {/* ... resto das rotas ... */}
            <Route path="universities" element={<UniversityManagement universities={universities} stats={componentStats.universities} onApprove={handleApproveUniversity} onReject={handleRejectUniversity} />} />
            <Route path="universities/:universityId" element={<UniversityDetails />} />
            <Route path="users" element={<UsersHub />} />
            <Route path="scholarships" element={<ScholarshipManagement scholarships={scholarships} stats={componentStats.scholarships} onRefresh={loadAdminData} />} />
            <Route path="scholarships/edit/:id" element={<AdminScholarshipEdit />} />
            <Route path="payments" element={<PaymentManagement />} />
            <Route path="settings" element={<SystemSettings userManagementProps={{ users, stats: componentStats.users, onSuspend: handleSuspendUser, onRefresh: loadAdminData }} />} />
            <Route path="/application-monitoring" element={<ApplicationMonitoring />} />
            <Route path="/application-monitoring/:applicationId" element={<AdminApplicationView />} />
            <Route path="/students/:profileId" element={<AdminStudentDetailsRefactored />} />
            <Route path="/matricula-rewards" element={<MatriculaRewardsAdmin />} />
            <Route path="/payout-requests" element={<AdminPayoutRequests />} />
            <Route path="/affiliate-payment-requests" element={<AffiliatePaymentRequests />} />
            <Route path="affiliate-management" element={<AffiliateManagement />} />
            <Route path="/featured-universities" element={<FeaturedUniversitiesManagement />} />
            <Route path="/featured-scholarships" element={<FeaturedScholarshipsManagement />} />
            <Route path="/transfer-management" element={<AdminTransferManagement />} />
            <Route path="/transfer-settings" element={<AutoTransferSettings />} />
            <Route path="/financial-analytics" element={<FinancialAnalytics />} />
            <Route path="/coupons" element={<CouponManagement />} />
            <Route path="/newsletter" element={<NewsletterManagement />} />
            <Route path="/terms" element={<TermsManagement />} />
          </Routes>
        </Suspense>

        {/* Confirmation Modal */}
        {confirmationModal && (
          <Dialog open={confirmationModal.isOpen} onClose={closeConfirmationModal} className="fixed z-50 inset-0 overflow-y-auto">
            {/* ... */}
            <div className="flex items-center justify-center min-h-screen px-4">
              <div className="fixed inset-0 bg-black opacity-30" />
              <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-auto p-6 z-50">
                <div className="flex items-center mb-4">
                  <div className={`p-2 rounded-lg ${
                    confirmationModal.type === 'success' ? 'bg-green-100' :
                    confirmationModal.type === 'warning' ? 'bg-yellow-100' :
                    'bg-red-100'
                  }`}>
                    {confirmationModal.type === 'success' ? (
                      <CheckCircle className={`h-6 w-6 ${
                        confirmationModal.type === 'success' ? 'text-green-600' :
                        confirmationModal.type === 'warning' ? 'text-yellow-600' :
                        'text-red-600'
                      }`} />
                    ) : confirmationModal.type === 'warning' ? (
                      <AlertTriangle className="h-6 w-6 text-yellow-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                  <Dialog.Title className="text-xl font-bold ml-3 text-gray-900">
                    {confirmationModal.title}
                  </Dialog.Title>
                </div>
                
                <p className="text-gray-600 mb-6">
                  {confirmationModal.message}
                </p>

                <div className="flex space-x-3 justify-end">
                  {confirmationModal.cancelText && (
                    <button onClick={closeConfirmationModal} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                      {confirmationModal.cancelText}
                    </button>
                  )}
                  <button onClick={confirmationModal.onConfirm} className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    confirmationModal.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                    confirmationModal.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                    'bg-red-600 hover:bg-red-700'
                  }`}>
                    {confirmationModal.confirmText}
                  </button>
                </div>
              </div>
            </div>
          </Dialog>
        )}

        {/* Rejection Modal */}
        {rejectionModal && (
          <Dialog open={rejectionModal.isOpen} onClose={() => setRejectionModal(null)} className="fixed z-50 inset-0 overflow-y-auto">
            {/* ... */}
             <div className="flex items-center justify-center min-h-screen px-4">
              <div className="fixed inset-0 bg-black opacity-30" />
              <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-auto p-6 z-50">
                <div className="flex items-center mb-4">
                  <div className="p-2 rounded-lg bg-red-100">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <Dialog.Title className="text-xl font-bold ml-3 text-gray-900">
                    Reject University
                  </Dialog.Title>
                </div>
                
                <p className="text-gray-600 mb-4">
                  Are you sure you want to reject <strong>{rejectionModal.universityName}</strong>? This action cannot be undone.
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for rejection (optional)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Provide a reason for rejection..."
                    rows={3}
                  />
                </div>

                <div className="flex space-x-3 justify-end">
                  <button
                    onClick={() => {
                      setRejectionModal(null);
                      setRejectionReason('');
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRejectUniversity}
                    className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Reject University
                  </button>
                </div>
              </div>
            </div>
          </Dialog>
        )}
      </AdminDashboardLayout>
    </AdminNotificationsProvider>
  );
};

export default AdminDashboard;