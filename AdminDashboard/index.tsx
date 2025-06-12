import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { supabase, University, Scholarship } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import AdminDashboardLayout from './AdminDashboardLayout';
import Overview from './Overview';
import UniversityManagement from './UniversityManagement';
import UserManagement from './UserManagement';
import ScholarshipManagement from './ScholarshipManagement';
import SystemSettings from './SystemSettings';

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

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load universities
      const { data: universitiesData, error: universitiesError } = await supabase
        .from('universities')
        .select('*')
        .order('created_at', { ascending: false });

      if (universitiesError) {
        console.error('Error loading universities:', universitiesError);
        throw new Error(`Failed to load universities: ${universitiesError.message}`);
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
            role: u.raw_user_meta_data?.role || 'student',
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
      const processedUniversities = universitiesData || [];
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
    } catch (error: any) {
      console.error('Error loading admin data:', error);
      setError(`Failed to load admin data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUniversity = async (universityId: string) => {
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

      alert('University approved successfully!');
    } catch (error: any) {
      console.error('Error approving university:', error);
      alert(`Error approving university: ${error.message}`);
    }
  };

  const handleRejectUniversity = async (universityId: string) => {
    const reason = prompt('Please provide a reason for rejection (optional):');
    
    if (confirm('Are you sure you want to reject this university? This action cannot be undone.')) {
      try {
        const { error } = await supabase.rpc('reject_university', {
          university_id_param: universityId,
          reason_text: reason || ''
        });

        if (error) throw error;

        setUniversities(prev => prev.filter(u => u.id !== universityId));
        setStats(prev => ({
          ...prev,
          totalUniversities: prev.totalUniversities - 1,
          pendingUniversities: prev.pendingUniversities - 1
        }));

        alert('University rejected and removed successfully!');
      } catch (error: any) {
        console.error('Error rejecting university:', error);
        alert(`Error rejecting university: ${error.message}`);
      }
    }
  };

  const handleSuspendUser = async (userId: string) => {
    if (confirm('Are you sure you want to suspend this user?')) {
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

        alert('User suspended successfully!');
      } catch (error: any) {
        console.error('Error suspending user:', error);
        alert(`Error suspending user: ${error.message}`);
      }
    }
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
            <UserManagement 
              users={users}
              stats={componentStats.users}
              onSuspend={handleSuspendUser}
            />
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
          path="settings" 
          element={<SystemSettings />} 
        />
      </Routes>
    </AdminDashboardLayout>
  );
};

export default AdminDashboard;