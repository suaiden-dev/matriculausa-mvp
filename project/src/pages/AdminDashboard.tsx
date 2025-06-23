import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building, 
  Award, 
  BarChart3, 
  Settings, 
  Search, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Edit, 
  Calendar,
  AlertTriangle,
  Download,
  Star,
  RefreshCw,
  Activity,
  Crown,
  UserX,
  Ban,
  FileText,
  AlertCircle,
  MapPin
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { University, Scholarship } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Dialog } from '@headlessui/react';

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

interface AdminLog {
  id: string;
  admin_user_name: string;
  action: string;
  target_type: string;
  target_id?: string;
  details: any;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'universities' | 'users' | 'scholarships' | 'applications' | 'reports' | 'logs' | 'settings'>('overview');
  const [universities, setUniversities] = useState<University[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadAdminData();
    }
  }, [user]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load universities - should work with existing RLS policies
      const { data: universitiesData, error: universitiesError } = await supabase
        .from('universities')
        .select('*')
        .order('created_at', { ascending: false });

      if (universitiesError) {
        console.error('Error loading universities:', universitiesError);
        throw new Error(`Failed to load universities: ${universitiesError.message}`);
      }

      // Try to load users using the new admin function
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
          
          // Map profiles to user format
          usersData = (profilesData || []).map((profile: any) => ({
            id: profile.id,
            user_id: profile.user_id,
            full_name: profile.full_name || 'Unknown User',
            email: 'Email not available', // Email not available from profiles alone
            role: 'student', // Default role
            country: profile.country,
            field_of_interest: profile.field_of_interest,
            status: profile.status || 'active',
            applications_count: 0,
            created_at: profile.created_at,
            last_active: profile.last_active || profile.created_at
          }));
        } else {
          // Process users from admin function
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
        // Continue with empty users array rather than failing completely
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
        // Don't throw here, continue with empty array
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
        // Don't throw here, continue with empty array
      }

      // Load admin logs
      const { data: logsData, error: logsError } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) {
        console.error('Error loading logs:', logsError);
        // Don't throw here, continue with empty array
      }

      // Process data
      const processedUniversities = universitiesData || [];
      const processedScholarships = scholarshipsData || [];
      const processedApplications = (applicationsData || []).map((app: any) => ({
        id: app.id,
        student_name: 'Student User', // Could be enhanced with user lookup
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
      setAdminLogs(logsData || []);

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

      // Update local state
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

        // Update local state
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

  const handlePromoteToAdmin = async (userId: string) => {
    if (confirm('Are you sure you want to promote this user to admin?')) {
      try {
        const { error } = await supabase.rpc('promote_user_to_admin', {
          target_user_id: userId
        });

        if (error) throw error;

        alert('User promotion logged. Note: Actual role update must be done via Supabase admin panel.');
      } catch (error: any) {
        console.error('Error promoting user:', error);
        alert(`Error promoting user: ${error.message}`);
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

        // Log the action
        await supabase.rpc('log_admin_action', {
          action_text: 'suspend_user',
          target_type_text: 'user',
          target_id_param: userId
        });

        // Update local state
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

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        // Log the action before deletion
        await supabase.rpc('log_admin_action', {
          action_text: 'delete_user',
          target_type_text: 'user',
          target_id_param: userId
        });

        // Update user profile status to inactive
        const { error } = await supabase
          .from('user_profiles')
          .update({ status: 'inactive' })
          .eq('user_id', userId);

        if (error) throw error;

        setUsers(prev => prev.filter(u => u.user_id !== userId));
        alert('User marked as inactive successfully!');
      } catch (error: any) {
        console.error('Error deleting user:', error);
        alert(`Error deleting user: ${error.message}`);
      }
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'school': return 'bg-blue-100 text-blue-800';
      case 'student': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Crown;
      case 'school': return Building;
      case 'student': return Users;
      default: return Users;
    }
  };

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need administrator privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#05294E] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Crown className="h-6 w-6 mr-2 text-purple-600" />
                Admin Dashboard
              </h1>
              <p className="text-gray-600">Manage platform users, universities, and system settings</p>
              {error && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                    <p className="text-sm text-yellow-800">{error}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={loadAdminData}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button className="bg-[#05294E] text-white px-4 py-2 rounded-lg hover:bg-[#05294E]/90 transition-colors flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'universities', label: 'Universities', icon: Building },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'scholarships', label: 'Scholarships', icon: Award },
              { id: 'applications', label: 'Applications', icon: FileText },
              { id: 'logs', label: 'Activity Logs', icon: Activity },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#05294E] text-[#05294E]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="bg-[#05294E]/10 p-3 rounded-lg">
                    <Building className="h-6 w-6 text-[#05294E]" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Universities</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUniversities}</p>
                    <p className="text-xs text-yellow-600">{stats.pendingUniversities} pending approval</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                    <p className="text-xs text-green-600">{stats.totalStudents} students</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Award className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Scholarships</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalScholarships}</p>
                    <p className="text-xs text-gray-500">{formatAmount(stats.totalFunding)} total</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Applications</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalApplications}</p>
                    <p className="text-xs text-blue-600">Active submissions</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-yellow-500" />
                  Pending Approvals
                </h3>
                <div className="space-y-4">
                  {universities.filter(u => !u.is_approved).slice(0, 5).map((university) => (
                    <div key={university.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{university.name}</p>
                        <p className="text-sm text-gray-500">{university.location}</p>
                        <p className="text-xs text-gray-400">Applied: {new Date(university.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveUniversity(university.id)}
                          className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRejectUniversity(university.id)}
                          className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {universities.filter(u => !u.is_approved).length === 0 && (
                    <p className="text-gray-500 text-center py-4">No pending approvals</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-blue-500" />
                  Recent Activity
                </h3>
                <div className="space-y-4">
                  {adminLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-blue-100 p-1 rounded">
                        <Activity className="h-3 w-3 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {log.action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {adminLogs.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Universities Tab */}
        {activeTab === 'universities' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">University Management</h2>
              <div className="flex space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search universities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">University</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Programs</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {universities
                    .filter(university => {
                      const matchesSearch = university.name.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesStatus = statusFilter === 'all' || 
                        (statusFilter === 'approved' && university.is_approved) ||
                        (statusFilter === 'pending' && !university.is_approved);
                      return matchesSearch && matchesStatus;
                    })
                    .map((university) => (
                      <tr key={university.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{university.name}</div>
                            <div className="text-sm text-gray-500">{university.website}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {university.location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {university.programs?.length || 0} programs
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            university.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {university.is_approved ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(university.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button 
                              className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 p-1 rounded"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {!university.is_approved && (
                              <>
                                <button
                                  onClick={() => handleApproveUniversity(university.id)}
                                  className="text-green-600 hover:text-green-900 hover:bg-green-50 p-1 rounded"
                                  title="Approve University"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleRejectUniversity(university.id)}
                                  className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1 rounded"
                                  title="Reject University"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users
                .filter(user => 
                  user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  user.email.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((userProfile) => {
                  const RoleIcon = getRoleIcon(userProfile.role);
                  
                  return (
                    <div key={userProfile.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${userProfile.role === 'admin' ? 'bg-purple-100' : userProfile.role === 'school' ? 'bg-blue-100' : 'bg-green-100'}`}>
                            <RoleIcon className={`h-5 w-5 ${userProfile.role === 'admin' ? 'text-purple-600' : userProfile.role === 'school' ? 'text-blue-600' : 'text-green-600'}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{userProfile.full_name}</h3>
                            <p className="text-sm text-gray-500">{userProfile.email}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(userProfile.status)}`}>
                          {userProfile.status}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Role</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(userProfile.role)}`}>
                            {userProfile.role}
                          </span>
                        </div>
                        {userProfile.country && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2" />
                            {userProfile.country}
                          </div>
                        )}
                        {userProfile.field_of_interest && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Star className="h-4 w-4 mr-2" />
                            {userProfile.field_of_interest}
                          </div>
                        )}
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          Joined {new Date(userProfile.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => { setSelectedUser(userProfile); setIsUserModalOpen(true); }}
                          className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center justify-center"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </button>
                        {userProfile.role !== 'admin' && (
                          <button
                            onClick={() => handlePromoteToAdmin(userProfile.user_id)}
                            className="flex-1 bg-purple-100 text-purple-700 py-2 px-3 rounded-lg hover:bg-purple-200 transition-colors text-sm flex items-center justify-center font-bold border border-purple-200 shadow-sm"
                            title="Promote to Admin"
                          >
                            <Crown className="h-4 w-4 mr-1" />
                            Promote to Admin
                          </button>
                        )}
                        {userProfile.status === 'active' && (
                          <button
                            onClick={() => handleSuspendUser(userProfile.user_id)}
                            className="bg-yellow-100 text-yellow-700 py-2 px-3 rounded-lg hover:bg-yellow-200 transition-colors"
                            title="Suspend User"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(userProfile.user_id)}
                          className="bg-red-100 text-red-700 py-2 px-3 rounded-lg hover:bg-red-200 transition-colors"
                          title="Delete User"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
            
            {users.length === 0 && !loading && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No user data available</p>
                <p className="text-sm text-gray-400">User data may be limited due to permissions</p>
              </div>
            )}
          </div>
        )}

        {/* Scholarships Tab */}
        {activeTab === 'scholarships' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Scholarship Management</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scholarships.map((scholarship) => (
                <div key={scholarship.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 line-clamp-2">{scholarship.title}</h3>
                    {scholarship.is_exclusive && (
                      <span className="bg-[#D0151C] text-white px-2 py-1 rounded-full text-xs font-bold">
                        Exclusive
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Amount</span>
                      <span className="font-semibold text-green-600">{formatAmount(Number(scholarship.amount))}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">University</span>
                      <span className="text-gray-900">{scholarship.universities?.name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Level</span>
                      <span className="text-gray-900 capitalize">{scholarship.level}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Deadline</span>
                      <span className="text-gray-900">{new Date(scholarship.deadline).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Status</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${scholarship.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {scholarship.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                      View Details
                    </button>
                    <button className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors">
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Activity Logs</h2>
              <button
                onClick={loadAdminData}
                className="bg-[#05294E] text-white px-4 py-2 rounded-lg hover:bg-[#05294E]/90 transition-colors flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {log.action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.target_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.admin_user_name || 'System'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="text-indigo-600 hover:text-indigo-900">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {adminLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No activity logs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">System Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Configuration</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Auto-approve universities</span>
                    <input type="checkbox" className="rounded border-gray-300" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Email notifications</span>
                    <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Maintenance mode</span>
                    <input type="checkbox" className="rounded border-gray-300" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Statistics</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Database Size</span>
                    <span className="text-sm font-medium text-gray-900">245 MB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Active Sessions</span>
                    <span className="text-sm font-medium text-gray-900">1,247</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Server Status</span>
                    <span className="text-sm font-medium text-green-600">Healthy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      <Dialog open={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-black opacity-30" />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-auto p-8 z-50">
            <Dialog.Title className="text-xl font-bold mb-4 flex items-center">
              <Crown className="h-5 w-5 mr-2 text-purple-600" />
              User Details
            </Dialog.Title>
            {selectedUser && (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className={`p-2 rounded-lg ${selectedUser.role === 'admin' ? 'bg-purple-100' : selectedUser.role === 'school' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    {getRoleIcon(selectedUser.role)({ className: `h-5 w-5 ${selectedUser.role === 'admin' ? 'text-purple-600' : selectedUser.role === 'school' ? 'text-blue-600' : 'text-green-600'}` })}
                  </span>
                  <span className="font-semibold text-gray-900">{selectedUser.full_name}</span>
                </div>
                <div className="text-sm text-gray-500">{selectedUser.email}</div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  Joined {new Date(selectedUser.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedUser.role)}`}>{selectedUser.role}</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedUser.status)}`}>{selectedUser.status}</span>
                </div>
                {selectedUser.country && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {selectedUser.country}
                  </div>
                )}
                {selectedUser.field_of_interest && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Star className="h-4 w-4 mr-2" />
                    {selectedUser.field_of_interest}
                  </div>
                )}
                {/* Promote to Admin button inside modal */}
                {selectedUser.role !== 'admin' && (
                  <button
                    onClick={() => { handlePromoteToAdmin(selectedUser.user_id); setIsUserModalOpen(false); }}
                    className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-bold flex items-center justify-center mt-4"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Promote to Admin
                  </button>
                )}
              </div>
            )}
            <button
              onClick={() => setIsUserModalOpen(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              title="Close"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;