import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  Award, 
  BookOpen, 
  Settings, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Edit,
  FileText,
  Plus,
  ArrowRight,
  Sparkles,
  Target,
  Heart,
  Building,
  MapPin,
  Star,
  Zap
} from 'lucide-react';
import { supabase, Scholarship } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { mockScholarships } from '../data/mockData';

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  field_of_interest?: string;
  academic_level?: string;
  gpa?: number;
  english_proficiency?: string;
  created_at: string;
  updated_at: string;
}

interface Application {
  id: string;
  scholarship_id: string;
  student_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  applied_at: string;
  notes?: string;
  scholarship?: Scholarship;
}

const StudentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'scholarships' | 'applications' | 'profile'>('overview');
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const { user } = useAuth();

  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    country: '',
    field_of_interest: '',
    academic_level: '',
    gpa: '',
    english_proficiency: ''
  });

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // For now, using mock data for scholarships
      setScholarships(mockScholarships);
      
      // Mock profile data
      const mockProfile: StudentProfile = {
        id: user.id,
        name: user.name || user.email?.split('@')[0] || '',
        email: user.email,
        phone: '',
        country: '',
        field_of_interest: '',
        academic_level: '',
        gpa: 0,
        english_proficiency: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setProfile(mockProfile);
      setProfileForm({
        name: mockProfile.name,
        phone: mockProfile.phone || '',
        country: mockProfile.country || '',
        field_of_interest: mockProfile.field_of_interest || '',
        academic_level: mockProfile.academic_level || '',
        gpa: mockProfile.gpa?.toString() || '',
        english_proficiency: mockProfile.english_proficiency || ''
      });

      // Mock applications data
      setApplications([]);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyScholarship = async (scholarshipId: string) => {
    if (!user) return;

    // Check if already applied
    const alreadyApplied = applications.some(app => app.scholarship_id === scholarshipId);
    if (alreadyApplied) {
      alert('You have already applied for this scholarship');
      return;
    }

    try {
      // Mock application creation
      const newApplication: Application = {
        id: Date.now().toString(),
        scholarship_id: scholarshipId,
        student_id: user.id,
        status: 'pending',
        applied_at: new Date().toISOString(),
        scholarship: scholarships.find(s => s.id === scholarshipId)
      };

      setApplications(prev => [...prev, newApplication]);
      alert('Application submitted successfully!');
    } catch (error) {
      console.error('Error applying for scholarship:', error);
      alert('Error submitting application. Please try again.');
    }
  };

  const handleProfileUpdate = async () => {
    if (!user || !profile) return;

    try {
      const updatedProfile = {
        ...profile,
        name: profileForm.name,
        phone: profileForm.phone,
        country: profileForm.country,
        field_of_interest: profileForm.field_of_interest,
        academic_level: profileForm.academic_level,
        gpa: parseFloat(profileForm.gpa) || 0,
        english_proficiency: profileForm.english_proficiency,
        updated_at: new Date().toISOString()
      };

      setProfile(updatedProfile);
      setShowProfileEdit(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    }
  };

  const filteredScholarships = scholarships.filter(scholarship => {
    const matchesSearch = (scholarship.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (scholarship.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || (scholarship.level && scholarship.level === selectedLevel);
    return matchesSearch && matchesLevel;
  });

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
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircle;
      case 'rejected': return AlertCircle;
      case 'under_review': return Clock;
      default: return Clock;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#05294E]"></div>
      </div>
    );
  }

  const stats = {
    totalApplications: applications.length,
    approvedApplications: applications.filter(app => app.status === 'approved').length,
    pendingApplications: applications.filter(app => app.status === 'pending').length,
    availableScholarships: scholarships.length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {profile?.name || user?.name}!
              </h1>
              <p className="text-gray-600">Track your scholarship applications and discover new opportunities</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-[#05294E]/10 px-4 py-2 rounded-xl">
                <span className="text-sm font-medium text-[#05294E]">Student Dashboard</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BookOpen },
              { id: 'scholarships', label: 'Find Scholarships', icon: Award },
              { id: 'applications', label: 'My Applications', icon: FileText },
              { id: 'profile', label: 'Profile', icon: User }
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
                    <Award className="h-6 w-6 text-[#05294E]" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Available Scholarships</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.availableScholarships}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Applications</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalApplications}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Approved</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.approvedApplications}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingApplications}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab('scholarships')}
                    className="w-full bg-[#05294E] text-white py-3 px-4 rounded-lg hover:bg-[#05294E]/90 transition-colors flex items-center justify-center"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Find New Scholarships
                  </button>
                  <button
                    onClick={() => setActiveTab('applications')}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View My Applications
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Update Profile
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                {applications.length === 0 ? (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No applications yet</p>
                    <p className="text-sm text-gray-400">Start applying for scholarships to see your activity here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.slice(0, 3).map((application) => {
                      const StatusIcon = getStatusIcon(application.status);
                      return (
                        <div key={application.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <StatusIcon className="h-5 w-5 text-gray-600" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{application.scholarship?.title}</p>
                            <p className="text-sm text-gray-500">Applied {new Date(application.applied_at).toLocaleDateString()}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                            {application.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scholarships Tab */}
        {activeTab === 'scholarships' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Find Scholarships</h2>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search scholarships..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                  />
                </div>

                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                >
                  <option value="all">All Levels</option>
                  <option value="undergraduate">Undergraduate</option>
                  <option value="graduate">Graduate</option>
                  <option value="doctorate">Doctorate</option>
                </select>

                <div className="flex items-center justify-center bg-gray-50 rounded-lg px-3 py-3">
                  <span className="text-sm text-gray-600">
                    <span className="font-semibold text-[#05294E]">{filteredScholarships.length}</span> scholarships found
                  </span>
                </div>
              </div>
            </div>

            {/* Scholarships Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredScholarships.map((scholarship) => {
                const alreadyApplied = applications.some(app => app.scholarship_id === scholarship.id);
                
                return (
                  <div key={scholarship.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{scholarship.title}</h3>
                        {scholarship.is_exclusive && (
                          <span className="bg-[#D0151C] text-white px-2 py-1 rounded-full text-xs font-bold">
                            Exclusive
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Amount</span>
                          <span className="font-semibold text-green-600">{formatAmount(scholarship.amount)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Deadline</span>
                          <span className="text-sm text-gray-900">
                            {new Date(scholarship.deadline).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Level</span>
                          <span className="text-sm text-gray-900 capitalize">{scholarship.level}</span>
                        </div>

                        <div className="flex items-center text-sm text-gray-600">
                          <Building className="h-4 w-4 mr-2" />
                          {scholarship.schoolName}
                        </div>
                      </div>

                      <button
                        onClick={() => handleApplyScholarship(scholarship.id)}
                        disabled={alreadyApplied}
                        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                          alreadyApplied
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : 'bg-[#05294E] text-white hover:bg-[#05294E]/90'
                        }`}
                      >
                        {alreadyApplied ? 'Already Applied' : 'Apply Now'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredScholarships.length === 0 && (
              <div className="text-center py-12">
                <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No scholarships found</h3>
                <p className="text-gray-500">Try adjusting your search criteria</p>
              </div>
            )}
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">My Applications</h2>
            </div>

            {applications.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No applications yet</h3>
                <p className="text-gray-500 mb-6">Start applying for scholarships to track your progress here</p>
                <button
                  onClick={() => setActiveTab('scholarships')}
                  className="bg-[#05294E] text-white px-6 py-3 rounded-lg hover:bg-[#05294E]/90 transition-colors"
                >
                  Find Scholarships
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => {
                  const StatusIcon = getStatusIcon(application.status);
                  
                  return (
                    <div key={application.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {application.scholarship?.title}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Amount:</span> {formatAmount(application.scholarship?.amount || 0)}
                            </div>
                            <div>
                              <span className="font-medium">Applied:</span> {new Date(application.applied_at).toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-medium">University:</span> {application.scholarship?.schoolName}
                            </div>
                          </div>
                          {application.notes && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">{application.notes}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="ml-6 flex flex-col items-end space-y-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {application.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">My Profile</h2>
              {!showProfileEdit && (
                <button
                  onClick={() => setShowProfileEdit(true)}
                  className="bg-[#05294E] text-white px-4 py-2 rounded-lg hover:bg-[#05294E]/90 transition-colors flex items-center"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {showProfileEdit ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                      <input
                        type="text"
                        value={profileForm.country}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Field of Interest</label>
                      <select
                        value={profileForm.field_of_interest}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, field_of_interest: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                      >
                        <option value="">Select field</option>
                        <option value="engineering">Engineering</option>
                        <option value="business">Business</option>
                        <option value="computer-science">Computer Science</option>
                        <option value="medicine">Medicine</option>
                        <option value="law">Law</option>
                        <option value="arts">Arts & Humanities</option>
                        <option value="sciences">Natural Sciences</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Academic Level</label>
                      <select
                        value={profileForm.academic_level}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, academic_level: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                      >
                        <option value="">Select level</option>
                        <option value="high-school">High School</option>
                        <option value="undergraduate">Undergraduate</option>
                        <option value="graduate">Graduate</option>
                        <option value="doctorate">Doctorate</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">GPA</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="4"
                        value={profileForm.gpa}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, gpa: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">English Proficiency</label>
                      <select
                        value={profileForm.english_proficiency}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, english_proficiency: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                      >
                        <option value="">Select proficiency</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="native">Native</option>
                        <option value="toefl">TOEFL Certified</option>
                        <option value="ielts">IELTS Certified</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={handleProfileUpdate}
                      className="bg-[#05294E] text-white px-6 py-2 rounded-lg hover:bg-[#05294E]/90 transition-colors"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setShowProfileEdit(false)}
                      className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Name</label>
                          <p className="text-gray-900">{profile?.name || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <p className="text-gray-900">{profile?.email}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Phone</label>
                          <p className="text-gray-900">{profile?.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Country</label>
                          <p className="text-gray-900">{profile?.country || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Field of Interest</label>
                          <p className="text-gray-900">{profile?.field_of_interest || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Academic Level</label>
                          <p className="text-gray-900">{profile?.academic_level || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">GPA</label>
                          <p className="text-gray-900">{profile?.gpa || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">English Proficiency</label>
                          <p className="text-gray-900">{profile?.english_proficiency || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;