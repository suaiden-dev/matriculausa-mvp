import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Award, 
  Search,
  Filter,
  DollarSign,
  Eye,
  MoreVertical,
  Zap,
  Clock,
  Users,
  Target,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useUniversity } from '../../context/UniversityContext';
import ProfileCompletionGuard from '../../components/ProfileCompletionGuard';

const ScholarshipManagement: React.FC = () => {
  const { 
    university, 
    scholarships, 
    handleDeleteScholarship, 
    toggleScholarshipStatus,
    refreshData
  } = useUniversity();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showActions, setShowActions] = useState<string | null>(null);

  // Force refresh data when component mounts
  useEffect(() => {
    refreshData();
  }, []);

  const filteredScholarships = scholarships.filter(scholarship => {
    const matchesSearch = scholarship.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && scholarship.is_active) ||
      (statusFilter === 'inactive' && !scholarship.is_active);
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineStatus = (deadline: string) => {
    const days = getDaysUntilDeadline(deadline);
    if (days < 0) return { status: 'expired', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    if (days <= 7) return { status: 'urgent', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    if (days <= 30) return { status: 'soon', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    return { status: 'normal', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
  };

  const getFieldBadgeColor = (field: string | undefined) => {
    switch (field?.toLowerCase()) {
      case 'stem':
        return 'bg-blue-600';
      case 'business':
        return 'bg-green-600';
      case 'engineering':
        return 'bg-purple-600';
      case 'arts & humanities':
        return 'bg-pink-600';
      case 'social sciences':
        return 'bg-yellow-600';
      case 'health sciences':
        return 'bg-red-600';
      case 'computer science':
        return 'bg-indigo-600';
      case 'law':
        return 'bg-gray-600';
      case 'medicine':
        return 'bg-emerald-600';
      default:
        return 'bg-slate-600';
    }
  };

  return (
    <ProfileCompletionGuard 
      isProfileCompleted={university?.profile_completed}
      title="Profile setup required"
      description="Complete your university profile to start creating and managing scholarships"
    >
      <div className="space-y-8 pt-10">
      {/* Header with Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          {scholarships.length > 0 && (
            <p className="text-slate-600">
              {`${scholarships.length} scholarship${scholarships.length > 1 ? 's' : ''} created, ${scholarships.filter(s => s.is_active).length} active`}
            </p>
          )}
        </div>
        
        <Link
          to="/school/dashboard/scholarship/new"
          className="bg-gradient-to-r from-[#D0151C] to-red-600 text-white px-6 py-3 rounded-xl hover:from-[#B01218] hover:to-red-700 transition-all duration-300 font-bold flex items-center shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Scholarship
        </Link>
      </div>

      {scholarships.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Award className="h-12 w-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">No scholarships created yet</h3>
          <p className="text-slate-500 mb-8 max-w-lg mx-auto">
            Start attracting international students by creating exclusive and attractive scholarship opportunities
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
            <div className="p-6 bg-slate-50 rounded-2xl">
              <Target className="h-8 w-8 text-[#05294E] mx-auto mb-3" />
              <h4 className="font-bold text-slate-900 mb-2">Define Criteria</h4>
              <p className="text-sm text-slate-600">Establish clear requirements for ideal candidates</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl">
              <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h4 className="font-bold text-slate-900 mb-2">Attractive Amount</h4>
              <p className="text-sm text-slate-600">Offer competitive amounts to attract talent</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h4 className="font-bold text-slate-900 mb-2">Global Reach</h4>
              <p className="text-sm text-slate-600">Connect with students from around the world</p>
            </div>
          </div>
          
          <Link
            to="/school/dashboard/scholarship/new"
            className="bg-gradient-to-r from-[#D0151C] to-red-600 text-white px-8 py-4 rounded-xl hover:from-[#B01218] hover:to-red-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Create First Scholarship
          </Link>
        </div>
      ) : (
        <>
          {/* Filters and Search */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search scholarships..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  title="Filter by status"
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                
                <button 
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors flex items-center"
                  aria-label="Filter scholarships"
                >
                  <Filter className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center text-sm text-slate-600">
              <span className="font-medium">{filteredScholarships.length}</span>
              <span className="ml-1">
                scholarship{filteredScholarships.length !== 1 ? 's' : ''} found
              </span>
            </div>
          </div>

          {/* Scholarships Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredScholarships.map((scholarship) => {
              const deadlineInfo = getDeadlineStatus(scholarship.deadline);
              const daysLeft = getDaysUntilDeadline(scholarship.deadline);
              
              return (
                <div key={scholarship.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                  {/* Image */}
                  {scholarship.image_url && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={scholarship.image_url}
                        alt={scholarship.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                  )}
                  
                  {/* Header */}
                  <div className={`p-6 ${scholarship.image_url ? 'pb-4' : 'pb-4'}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-[#05294E] transition-colors">
                          {scholarship.title}
                        </h3>
                        
                        {/* Programs */}
                        <div className="flex items-center mb-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium text-white ${getFieldBadgeColor(scholarship.field_of_study)}`}>
                            {scholarship.field_of_study || 'Any Field'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            scholarship.is_active 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {scholarship.is_active ? (
                              <>
                                <Zap className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </span>
                          
                          {scholarship.is_exclusive && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#D0151C]/10 text-[#D0151C]">
                              <Award className="h-3 w-3 mr-1" />
                              Exclusive
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="relative">
                        <button
                          onClick={() => setShowActions(showActions === scholarship.id ? null : scholarship.id)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="More actions"
                          aria-label="More actions"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>

                        {showActions === scholarship.id && (
                          <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                            <button className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                              <Eye className="h-4 w-4 mr-3" />
                              View Details
                            </button>
                            <Link
                              to={`/school/dashboard/scholarship/new?edit=${scholarship.id}`}
                              className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              onClick={() => setShowActions(null)}
                            >
                              <Edit className="h-4 w-4 mr-3" />
                              Edit Scholarship
                            </Link>
                            <button
                              onClick={() => {
                                toggleScholarshipStatus(scholarship.id, scholarship.is_active);
                                setShowActions(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <CheckCircle className="h-4 w-4 mr-3" />
                              {scholarship.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <div className="border-t border-slate-200 my-2"></div>
                            <button
                              onClick={() => {
                                handleDeleteScholarship(scholarship.id);
                                setShowActions(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-4 w-4 mr-3" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Annual Value With Scholarship</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(Number(scholarship.annual_value_with_scholarship ?? 0))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-500 mb-1">Level</p>
                        <p className="text-sm font-bold text-slate-900 capitalize">
                          {scholarship.level}
                        </p>
                      </div>
                    </div>

                    {/* Deadline */}
                    <div className={`p-3 rounded-xl border ${deadlineInfo.bg} ${deadlineInfo.border}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-700">Application Deadline</p>
                          <p className="font-bold text-slate-900">
                            {new Date(scholarship.deadline).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          {daysLeft > 0 ? (
                            <>
                              <p className={`text-2xl font-bold ${deadlineInfo.color}`}>
                                {daysLeft}
                              </p>
                              <p className={`text-xs font-medium ${deadlineInfo.color}`}>
                                day{daysLeft !== 1 ? 's' : ''} left
                              </p>
                            </>
                          ) : (
                            <div className="flex items-center">
                              <AlertTriangle className="h-5 w-5 text-red-600 mr-1" />
                              <span className="text-sm font-bold text-red-600">Expired</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="px-6 pb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-xl text-center">
                        <Users className="h-5 w-5 mx-auto mb-2 text-slate-500" />
                        <p className="text-lg font-bold text-slate-900">0</p>
                        <p className="text-xs text-slate-500">Applicants</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl text-center">
                        <Eye className="h-5 w-5 mx-auto mb-2 text-slate-500" />
                        <p className="text-lg font-bold text-slate-900">0</p>
                        <p className="text-xs text-slate-500">Views</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-6 pb-6">
                    <div className="flex space-x-2">
                      <button className="flex-1 bg-slate-100 text-slate-700 py-2.5 px-4 rounded-xl hover:bg-slate-200 transition-colors font-medium text-sm">
                        View Applicants
                      </button>
                      <Link
                        to={`/school/dashboard/scholarship/new?edit=${scholarship.id}`}
                        className="bg-[#05294E] text-white py-2.5 px-4 rounded-xl hover:bg-[#05294E]/90 transition-colors flex items-center justify-center"
                        title="Edit scholarship"
                        aria-label="Edit scholarship"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredScholarships.length === 0 && searchTerm && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">No scholarships found</h3>
              <p className="text-slate-500">
                We couldn't find any scholarships matching "{searchTerm}"
              </p>
            </div>
          )}
        </>
      )}
      </div>
    </ProfileCompletionGuard>
  );
};

export default ScholarshipManagement;