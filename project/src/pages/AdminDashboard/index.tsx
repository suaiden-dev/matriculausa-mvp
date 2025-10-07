import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { University, Scholarship } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import AdminDashboardLayout from './AdminDashboardLayout';
import Overview from './Overview';
import UniversityManagement from './UniversityManagement';
import UsersHub from './UsersHub';
import ScholarshipManagement from './ScholarshipManagement';
import PaymentManagement from './PaymentManagement';
import ApplicationMonitoring from './ApplicationMonitoring';
import AdminApplicationView from './AdminApplicationView';
import MatriculaRewardsAdmin from './MatriculaRewardsAdmin';
import AdminPayoutRequests from './PayoutRequests';
import AffiliatePaymentRequests from './AffiliatePaymentRequests';

import FeaturedUniversitiesManagement from './FeaturedUniversitiesManagement';
import FeaturedScholarshipsManagement from './FeaturedScholarshipsManagement';
import AdminTransferManagement from './AdminTransferManagement';
import AutoTransferSettings from './AutoTransferSettings';
import FinancialAnalytics from './FinancialAnalytics';
import TermsManagement from './TermsManagement';
import AffiliateManagement from './AffiliateManagement';
import AdminChatPage from './AdminChatPage';
import AdminStudentDetails from './AdminStudentDetails';
import SystemSettings from './SystemSettings';
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

const AdminDashboard: React.FC = () => {
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

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadAdminData();
    }
  }, [user]);

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

      // Load universities first
      const { data: universitiesData, error: universitiesError } = await supabase
        .from('universities')
        .select('*')
        .order('created_at', { ascending: false });

      if (universitiesError) {
        console.error('Error loading universities:', universitiesError);
        throw new Error(`Failed to load universities: ${universitiesError.message}`);
      }

      // Load user profiles separately
      let userProfiles: { [key: string]: any } = {};
      let userEmails: { [key: string]: string } = {};
      
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, phone, status');
        
        if (!profilesError && profilesData) {
          userProfiles = profilesData.reduce((acc: { [key: string]: any }, profile: any) => {
            acc[profile.user_id] = {
              full_name: profile.full_name,
              phone: profile.phone,
              status: profile.status
            };
            return acc;
          }, {});
        }
      } catch (profileError) {
        console.warn('Could not load user profiles:', profileError);
      }

      // Load user emails using the admin function
      try {
        const { data: adminUsersData, error: adminUsersError } = await supabase.rpc('get_admin_users_data');
        if (!adminUsersError && adminUsersData) {
          userEmails = adminUsersData.reduce((acc: { [key: string]: string }, user: any) => {
            acc[user.id] = user.email;
            return acc;
          }, {});
        }
      } catch (emailError) {
        console.warn('Could not load user emails:', emailError);
      }

      // Try to load users using the admin function
      let usersData: any[] = [];
      try {
        const { data: adminUsersData, error: adminUsersError } = await supabase.rpc('get_admin_users_data');
        
        if (adminUsersError) {
          console.error('Error loading admin users data:', adminUsersError);
          
          // Fallback to user_profiles only if the function fails
          const { data: profilesData, error: profilesError } = await supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (profilesError) {
            console.error('Error loading user profiles:', profilesError);
            throw new Error(`Failed to load user data: ${profilesError.message}`);
          }
          
          usersData = (profilesData || []).map((profile: any) => ({
            id: profile.id,
            user_id: profile.user_id,
            full_name: profile.full_name || 'Unknown User',
            email: 'Email not available',
            role: 'student',
            country: profile.country,
            field_of_interest: profile.field_of_interest,
            status: profile.status || 'active',
            applications_count: 0,
            created_at: profile.created_at,
            last_active: profile.last_active || profile.created_at
          }));
        } else {
          usersData = (adminUsersData || []).map((u: any) => ({
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
        }
      } catch (userError) {
        console.error('Error in user data loading:', userError);
        usersData = [];
        setError('Could not load user data. Some admin functions may be limited.');
      }

      // Load scholarships
      const { data: scholarshipsData, error: scholarshipsError } = await supabase
        .from('scholarships')
        .select(`
          *,
          universities!inner (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (scholarshipsError) {
        console.error('Error loading scholarships:', scholarshipsError);
      }

      // Load applications
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          scholarships!inner (
            title,
            amount,
            universities!inner (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (applicationsError) {
        console.error('Error loading applications:', applicationsError);
      }

      // Process data
      const processedUniversities = (universitiesData || []).map((university: any) => ({
        ...university,
        user_email: userEmails[university.user_id] || null,
        user_profile: userProfiles[university.user_id] || null
      }));
      const processedScholarships = scholarshipsData || [];
      const processedApplications = (applicationsData || []).map((app: any) => ({
        id: app.id,
        student_name: 'Student User',
        student_email: '',
        scholarship_title: app.scholarships?.title || 'Unknown Scholarship',
        university_name: app.scholarships?.universities?.name || 'Unknown University',
        amount: app.scholarships?.amount || 0,
        status: app.status,
        applied_at: app.applied_at,
        reviewed_at: app.reviewed_at,
        notes: app.notes
      }));

      setUniversities(processedUniversities);
      setUsers(usersData);
      setScholarships(processedScholarships);
      setApplications(processedApplications);

      // Calculate statistics
      const newStats: AdminStats = {
        totalUniversities: processedUniversities.length,
        pendingUniversities: processedUniversities.filter(u => !u.is_approved).length,
        approvedUniversities: processedUniversities.filter(u => u.is_approved).length,
        totalStudents: usersData.filter(u => u.role === 'student').length,
        totalScholarships: processedScholarships.length,
        totalApplications: processedApplications.length,
        totalFunding: processedScholarships.reduce((sum, s) => sum + Number(s.amount), 0),
        monthlyGrowth: 12.5
      };

      setStats(newStats);
      
      // Marcar que já carregamos dados uma vez
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
    <AdminDashboardLayout user={user} loading={loading}>
      <Routes>
        <Route 
          index 
          element={
            <Overview 
              stats={stats}
              universities={universities}
              users={users}
              applications={applications}
              error={error}
              onApprove={handleApproveUniversity}
              onReject={handleRejectUniversity}
            />
          } 
        />
        <Route 
          path="universities" 
          element={
            <UniversityManagement 
              universities={universities}
              stats={componentStats.universities}
              onApprove={handleApproveUniversity}
              onReject={handleRejectUniversity}
            />
          } 
        />
        <Route 
          path="users" 
          element={
            <UsersHub />
          } 
        />
        <Route 
          path="scholarships" 
          element={
            <ScholarshipManagement 
              scholarships={scholarships}
              stats={componentStats.scholarships}
            />
          } 
        />
        <Route 
          path="payments" 
          element={<PaymentManagement />} 
        />
        <Route 
          path="settings" 
          element={
            <SystemSettings 
              userManagementProps={{
                users: users,
                stats: componentStats.users,
                onSuspend: handleSuspendUser,
                onRefresh: loadAdminData
              }}
            />
          }
        />
        <Route path="/application-monitoring" element={<ApplicationMonitoring />} />
        <Route path="/application-monitoring/:applicationId" element={<AdminApplicationView />} />
        <Route path="/students/:profileId" element={<AdminStudentDetails />} />
        <Route path="/matricula-rewards" element={<MatriculaRewardsAdmin />} />
        <Route path="/payout-requests" element={<AdminPayoutRequests />} />
        <Route path="/affiliate-payment-requests" element={<AffiliatePaymentRequests />} />

        <Route path="/featured-universities" element={<FeaturedUniversitiesManagement />} />
        <Route path="/featured-scholarships" element={<FeaturedScholarshipsManagement />} />
        <Route path="/transfer-management" element={<AdminTransferManagement />} />
        <Route path="/transfer-settings" element={<AutoTransferSettings />} />
        <Route path="/financial-analytics" element={<FinancialAnalytics />} />
        <Route path="/affiliate-management" element={<AffiliateManagement />} />
        <Route path="/chat" element={<AdminChatPage />} />
        <Route path="/terms" element={<TermsManagement />} />
      </Routes>

      {/* Confirmation Modal */}
      {confirmationModal && (
        <Dialog open={confirmationModal.isOpen} onClose={closeConfirmationModal} className="fixed z-50 inset-0 overflow-y-auto">
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
                  <button
                    onClick={closeConfirmationModal}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {confirmationModal.cancelText}
                  </button>
                )}
                <button
                  onClick={confirmationModal.onConfirm}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    confirmationModal.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                    confirmationModal.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                    'bg-red-600 hover:bg-red-700'
                  }`}
                >
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
  );
};

export default AdminDashboard;