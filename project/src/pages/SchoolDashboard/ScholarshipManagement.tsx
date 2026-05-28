import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  Award,
  Search,
  DollarSign,
  Zap,
  Users,
  Target,
  AlertTriangle
} from 'lucide-react';
import { useUniversity } from '../../context/UniversityContext';
import ProfileCompletionGuard from '../../components/ProfileCompletionGuard';

interface ScholarshipManagementProps {
  isTabbed?: boolean;
}

const ScholarshipManagement: React.FC<ScholarshipManagementProps> = ({ isTabbed = false }) => {
  const {
    university,
    scholarships,
    handleDeleteScholarship,
    toggleScholarshipStatus,
    refreshData
  } = useUniversity();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

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
    // Criar data atual sem hora (apenas dia)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Criar deadline como data local (não UTC) para evitar problemas de timezone
    // Parse da data no formato YYYY-MM-DD como local
    const [year, month, day] = deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day); // month - 1 porque Date usa 0-11
    deadlineDate.setHours(23, 59, 59, 999); // Fim do dia

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
      <div className="space-y-6 lg:space-y-8">
        {/* Header + Filters Section */}
        <div className="w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="max-w-full mx-auto bg-slate-50">
              {/* Header: title + note + counter */}
              {!isTabbed && (
                <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                      Manage Scholarships
                    </h1>
                    <p className="mt-2 text-sm sm:text-base text-slate-600">
                      Create and manage scholarship opportunities for international students
                    </p>
                    {scholarships.length > 0 && (
                      <p className="mt-3 text-sm text-slate-500">
                        {`${scholarships.length} scholarship${scholarships.length > 1 ? 's' : ''} created, ${scholarships.filter(s => s.is_active).length} active`}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                      <Award className="w-5 h-5 mr-2" />
                      {scholarships.length} Total
                    </div>
                    <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200 shadow-sm">
                      <Zap className="w-5 h-5 mr-2" />
                      {scholarships.filter(s => s.is_active).length} Active
                    </div>
                  </div>
                </div>
              )}

              {/* Separation and Filters row */}
              <div className="border-t border-slate-200 bg-white">
                <div className="px-4 sm:px-6 lg:px-8 py-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Search and Filters */}
                    <div className="flex flex-col lg:flex-row gap-4 flex-1">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                          <input
                            type="text"
                            placeholder="Search scholarships..."
                            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          title="Filter by status"
                          className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                        >
                          <option value="all">All Status</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>

                    {/* New Scholarship Button */}
                    <Link
                      to="/school/dashboard/scholarship/new"
                      className="bg-gradient-to-r from-[#D0151C] to-red-600 text-white px-6 py-3 rounded-xl hover:from-[#B01218] hover:to-red-700 transition-all duration-300 font-bold flex items-center shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      New Scholarship
                    </Link>
                  </div>

                  <div className="mt-4 flex items-center text-sm text-slate-600">
                    <span className="font-medium">{filteredScholarships.length}</span>
                    <span className="ml-1">
                      scholarship{filteredScholarships.length !== 1 ? 's' : ''} found
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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


            {/* Scholarships Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              {filteredScholarships.map((scholarship) => {
                const deadlineInfo = getDeadlineStatus(scholarship.deadline);
                const daysLeft = getDaysUntilDeadline(scholarship.deadline);

                return (
                  <div key={scholarship.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 group h-full flex flex-col">
                    {/* Image - Always present with fixed height */}
                    <div className="relative h-48 overflow-hidden">
                      {scholarship.image_url ? (
                        <>
                          <img
                            src={scholarship.image_url}
                            alt={scholarship.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                          <Award className="h-16 w-16 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* Header */}
                    <div className="p-6 pb-4 flex-1 flex flex-col">
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

                          {scholarship.is_exclusive && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#D0151C]/10 text-[#D0151C]">
                              <Award className="h-3 w-3 mr-1" />
                              Exclusive
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col items-end space-y-3 ml-4">
                          <button
                            onClick={() => handleDeleteScholarship(scholarship.id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete scholarship"
                            aria-label="Delete scholarship"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>

                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={scholarship.is_active}
                              onChange={() => toggleScholarshipStatus(scholarship.id, scholarship.is_active)}
                              className="sr-only peer"
                            />
                            <span className="mr-2 text-xs font-semibold text-slate-700 flex items-center">
                              {scholarship.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <div className="relative w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                          </label>
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


                    {/* Actions */}
                    <div className="px-6 pb-6 mt-auto">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigate(`/school/dashboard/selection-process`)}
                          className="flex-1 bg-slate-100 text-slate-700 py-2.5 px-4 rounded-xl hover:bg-slate-200 transition-colors font-medium text-sm"
                        >
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

        {/* Scholarship Details Modal */}
      </div>
    </ProfileCompletionGuard>
  );
};

export default ScholarshipManagement;