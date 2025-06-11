import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building, Users, DollarSign, Award, Plus, Edit, Trash2, Eye, Calendar, CheckCircle, Clock, AlertCircle, Settings, FileText, Zap } from 'lucide-react';
import { supabase, University, Scholarship } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const SchoolDashboard: React.FC = () => {
  const [university, setUniversity] = useState<University | null>(null);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'scholarships' | 'profile'>('overview');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Load university data
      const { data: universityData, error: universityError } = await supabase
        .from('universities')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (universityError) throw universityError;
      setUniversity(universityData);

      // Load scholarships only if university exists
      if (universityData) {
        const { data: scholarshipsData, error: scholarshipsError } = await supabase
          .from('scholarships')
          .select('*')
          .eq('university_id', universityData.id);

        if (scholarshipsError) throw scholarshipsError;
        setScholarships(scholarshipsData || []);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScholarship = async (scholarshipId: string) => {
    if (!confirm('Are you sure you want to delete this scholarship?')) return;

    try {
      const { error } = await supabase
        .from('scholarships')
        .delete()
        .eq('id', scholarshipId);

      if (error) throw error;
      
      setScholarships(prev => prev.filter(s => s.id !== scholarshipId));
    } catch (error) {
      console.error('Error deleting scholarship:', error);
      alert('Error deleting scholarship. Please try again.');
    }
  };

  const toggleScholarshipStatus = async (scholarshipId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('scholarships')
        .update({ is_active: !currentStatus })
        .eq('id', scholarshipId);

      if (error) throw error;
      
      setScholarships(prev => prev.map(s => 
        s.id === scholarshipId ? { ...s, is_active: !currentStatus } : s
      ));
    } catch (error) {
      console.error('Error updating scholarship status:', error);
      alert('Error updating scholarship. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#05294E]"></div>
      </div>
    );
  }

  // Get stats even without university profile
  const stats = {
    totalScholarships: scholarships.length,
    activeScholarships: scholarships.filter(s => s.is_active).length,
    totalFunding: scholarships.reduce((sum, s) => sum + Number(s.amount), 0),
    avgAmount: scholarships.length > 0 ? scholarships.reduce((sum, s) => sum + Number(s.amount), 0) / scholarships.length : 0
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {university?.name || user?.name || 'University Dashboard'}
              </h1>
              {university?.location && (
                <p className="text-gray-600">{university.location}</p>
              )}
              
              <div className="flex items-center mt-2 space-x-4">
                {university ? (
                  <>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      university.is_approved 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {university.is_approved ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Pending Approval
                        </>
                      )}
                    </span>
                    {!university.profile_completed && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Profile Incomplete
                      </span>
                    )}
                  </>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Settings className="h-3 w-3 mr-1" />
                    Profile Setup Required
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex space-x-3">
              {!university?.profile_completed ? (
                <Link
                  to="/school/setup-profile"
                  className="bg-[#05294E] text-white px-4 py-2 rounded-lg hover:bg-[#05294E]/90 transition-colors flex items-center"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Complete Profile
                </Link>
              ) : (
                <Link
                  to="/school/scholarship/new"
                  className="bg-[#05294E] text-white px-4 py-2 rounded-lg hover:bg-[#05294E]/90 transition-colors flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Scholarship
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Show welcome message if no university profile or profile not completed */}
        {(!university || !university.profile_completed) && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
            <div className="text-center">
              <div className="bg-[#05294E] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {!university ? 'Welcome to Matrícula USA!' : 'Complete Your Profile'}
              </h2>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                {!university 
                  ? 'Complete your university profile to start attracting international students and manage scholarship opportunities on our platform.'
                  : 'Finish setting up your university profile to start creating scholarship opportunities for international students.'
                }
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <FileText className="h-8 w-8 text-[#05294E] mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Complete Profile</h3>
                  <p className="text-sm text-gray-600">Add your university information and get approved</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <Award className="h-8 w-8 text-[#D0151C] mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Create Scholarships</h3>
                  <p className="text-sm text-gray-600">Offer exclusive scholarships to international students</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <Users className="h-8 w-8 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Connect with Students</h3>
                  <p className="text-sm text-gray-600">Reach qualified international applicants</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/school/setup-profile"
                  className="bg-[#05294E] text-white px-6 py-3 rounded-lg hover:bg-[#05294E]/90 transition-colors font-medium flex items-center justify-center"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {!university ? 'Setup University Profile' : 'Complete Profile'}
                </Link>
                {!university && (
                  <Link
                    to="/school/terms"
                    className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Review Terms & Conditions
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Building },
              { id: 'scholarships', label: 'Scholarships', icon: Award },
              { id: 'profile', label: 'Profile', icon: Edit }
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
                    <p className="text-sm font-medium text-gray-500">Total Scholarships</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalScholarships}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Active Scholarships</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeScholarships}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Funding</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${stats.totalFunding.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Avg. Amount</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${Math.round(stats.avgAmount).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Scholarships */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Scholarships</h3>
                  {university?.profile_completed && (
                    <Link
                      to="/school/scholarship/new"
                      className="text-[#05294E] hover:text-[#05294E]/80 font-medium text-sm"
                    >
                      Create New
                    </Link>
                  )}
                </div>
              </div>
              <div className="p-6">
                {!university?.profile_completed ? (
                  <div className="text-center py-12">
                    <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Complete your profile first</h3>
                    <p className="text-gray-500 mb-4">Set up your university profile to start creating scholarships</p>
                    <Link
                      to="/school/setup-profile"
                      className="bg-[#05294E] text-white px-4 py-2 rounded-lg hover:bg-[#05294E]/90 transition-colors"
                    >
                      Complete Profile
                    </Link>
                  </div>
                ) : scholarships.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No scholarships yet</h3>
                    <p className="text-gray-500 mb-4">Start by creating your first scholarship opportunity</p>
                    <Link
                      to="/school/scholarship/new"
                      className="bg-[#05294E] text-white px-4 py-2 rounded-lg hover:bg-[#05294E]/90 transition-colors"
                    >
                      Create Scholarship
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scholarships.slice(0, 5).map((scholarship) => (
                      <div key={scholarship.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{scholarship.title}</h4>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                            <span>${scholarship.amount.toLocaleString()}</span>
                            <span>•</span>
                            <span>Due: {new Date(scholarship.deadline).toLocaleDateString()}</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              scholarship.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {scholarship.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="text-gray-400 hover:text-gray-600">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="text-gray-400 hover:text-gray-600">
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
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
              <h2 className="text-xl font-semibold text-gray-900">Manage Scholarships</h2>
              {university?.profile_completed && (
                <Link
                  to="/school/scholarship/new"
                  className="bg-[#05294E] text-white px-4 py-2 rounded-lg hover:bg-[#05294E]/90 transition-colors flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Scholarship
                </Link>
              )}
            </div>

            {!university?.profile_completed ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Profile setup required</h3>
                <p className="text-gray-500 mb-6">Complete your university profile to start creating scholarships</p>
                <Link
                  to="/school/setup-profile"
                  className="bg-[#05294E] text-white px-6 py-3 rounded-lg hover:bg-[#05294E]/90 transition-colors"
                >
                  Complete University Profile
                </Link>
              </div>
            ) : scholarships.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No scholarships created yet</h3>
                <p className="text-gray-500 mb-6">Start attracting international students by creating scholarship opportunities</p>
                <Link
                  to="/school/scholarship/new"
                  className="bg-[#05294E] text-white px-6 py-3 rounded-lg hover:bg-[#05294E]/90 transition-colors"
                >
                  Create Your First Scholarship
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scholarships.map((scholarship) => (
                  <div key={scholarship.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{scholarship.title}</h3>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => toggleScholarshipStatus(scholarship.id, scholarship.is_active)}
                            className={`p-1 rounded transition-colors ${
                              scholarship.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'
                            }`}
                            title={scholarship.is_active ? 'Deactivate' : 'Activate'}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteScholarship(scholarship.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Amount</span>
                          <span className="font-semibold text-green-600">${scholarship.amount.toLocaleString()}</span>
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
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Status</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            scholarship.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {scholarship.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        {scholarship.is_exclusive && (
                          <div className="flex items-center text-sm text-[#D0151C]">
                            <Award className="h-4 w-4 mr-1" />
                            Exclusive Scholarship
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">University Profile</h2>
              {university ? (
                <Link
                  to="/school/edit-profile"
                  className="bg-[#05294E] text-white px-4 py-2 rounded-lg hover:bg-[#05294E]/90 transition-colors flex items-center"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Link>
              ) : (
                <Link
                  to="/school/setup-profile"
                  className="bg-[#05294E] text-white px-4 py-2 rounded-lg hover:bg-[#05294E]/90 transition-colors flex items-center"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Setup Profile
                </Link>
              )}
            </div>

            {!university ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No university profile found</h3>
                <p className="text-gray-500 mb-6">
                  Create your university profile to showcase your institution to international students
                </p>
                <Link
                  to="/school/setup-profile"
                  className="bg-[#05294E] text-white px-6 py-3 rounded-lg hover:bg-[#05294E]/90 transition-colors"
                >
                  Create University Profile
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">University Name</label>
                        <p className="text-gray-900">{university.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Website</label>
                        <a href={university.website} target="_blank" rel="noopener noreferrer" className="text-[#05294E] hover:underline block">
                          {university.website}
                        </a>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Location</label>
                        <p className="text-gray-900">{university.location}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="text-gray-900">{university.contact?.phone}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-gray-900">{university.contact?.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Admissions Email</label>
                        <p className="text-gray-900">{university.contact?.admissionsEmail}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {university.description && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
                    <p className="text-gray-700 leading-relaxed">{university.description}</p>
                  </div>
                )}

                {university.programs && university.programs.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Programs</h3>
                    <div className="flex flex-wrap gap-2">
                      {university.programs.map((program, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
                        >
                          {program}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolDashboard;