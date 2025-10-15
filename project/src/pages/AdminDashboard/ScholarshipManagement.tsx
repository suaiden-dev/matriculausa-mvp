import React, { useState } from 'react';
import { 
  Award, 
  DollarSign, 
  Calendar, 
  Building, 
  Search, 
  Filter, 
  Eye, 
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  Zap,
  List,
  Grid3X3,
  X,
  Target,
  Star,
  GraduationCap,
  Monitor,
  MapPin,
  Briefcase,
  Globe,
  FileText,
  AlertCircle,
  BookOpen,
  AlertTriangle
} from 'lucide-react';

interface ScholarshipManagementProps {
  scholarships: any[];
  stats: {
    total: number;
    active: number;
    totalFunding: number;
  };
}

const ScholarshipManagement: React.FC<ScholarshipManagementProps> = ({
  scholarships,
  stats
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [universityFilter, setUniversityFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // Estados do modal de detalhes
  const [selectedScholarship, setSelectedScholarship] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  // Estados da paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  // Dados para os filtros
  const [universities, setUniversities] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const closeModal = () => {
    setShowModal(false);
    setSelectedScholarship(null);
  };

  React.useEffect(() => {
    const saved = localStorage.getItem('scholarship-view-mode') as 'grid' | 'list';
    if (saved) setViewMode(saved);
    loadFilterData();
  }, []);

  const loadFilterData = () => {
    // Extrair universidades únicas dos scholarships
    const uniqueUniversities = Array.from(
      new Set(
        scholarships
          .map(scholarship => scholarship.universities?.name)
          .filter(Boolean)
      )
    ).map(name => ({ name }));

    // Extrair cursos únicos dos scholarships
    const uniqueCourses = Array.from(
      new Set(
        scholarships
          .map(scholarship => scholarship.field_of_study)
          .filter(Boolean)
      )
    ).map(course => ({ name: course }));

    setUniversities(uniqueUniversities);
    setCourses(uniqueCourses);
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('scholarship-view-mode', mode);
  };

  const filteredScholarships = scholarships.filter(scholarship => {
    const matchesSearch = scholarship.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scholarship.universities?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (scholarship.field_of_study && scholarship.field_of_study.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && scholarship.is_active) ||
      (statusFilter === 'inactive' && !scholarship.is_active);
    
    const matchesLevel = levelFilter === 'all' || scholarship.level === levelFilter;
    
    const matchesUniversity = universityFilter === 'all' || 
      scholarship.universities?.name === universityFilter;
    
    const matchesCourse = courseFilter === 'all' || 
      scholarship.field_of_study === courseFilter;
    
    return matchesSearch && matchesStatus && matchesLevel && matchesUniversity && matchesCourse;
  });

  // Lógica de paginação
  const totalPages = Math.ceil(filteredScholarships.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentScholarships = filteredScholarships.slice(startIndex, endIndex);

  // Reset para primeira página quando filtros mudarem
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, levelFilter, universityFilter, courseFilter]);

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
    if (days < 0) return { status: 'expired', color: 'text-red-600', bg: 'bg-red-50' };
    if (days <= 7) return { status: 'urgent', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (days <= 30) return { status: 'soon', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { status: 'normal', color: 'text-green-600', bg: 'bg-green-50' };
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
    <div className="space-y-8">
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="space-y-6">
          {/* Search Bar */}
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

          {/* Filter Controls */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Filter Dropdowns */}
            <div className="flex flex-wrap gap-3 flex-1">
              <div className="min-w-[140px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200 text-sm"
                  title="Filter by scholarship status"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="min-w-[140px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Level</label>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200 text-sm"
                  title="Filter by academic level"
                >
                  <option value="all">All Levels</option>
                  <option value="undergraduate">Undergraduate</option>
                  <option value="graduate">Graduate</option>
                  <option value="doctorate">Doctorate</option>
                </select>
              </div>

              <div className="min-w-[180px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">University</label>
                <select
                  value={universityFilter}
                  onChange={(e) => setUniversityFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200 text-sm"
                  title="Filter by university"
                >
                  <option value="all">All Universities</option>
                  {universities.map((university, index) => (
                    <option key={index} value={university.name}>
                      {university.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-[180px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Course</label>
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200 text-sm"
                  title="Filter by course"
                >
                  <option value="all">All Courses</option>
                  {courses.map((course, index) => (
                    <option key={index} value={course.name}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-end">
              <div className="flex bg-slate-50 border border-slate-200 rounded-lg p-1">
                <button
                  onClick={() => handleViewModeChange('grid')}
                  className={`flex items-center px-3 py-2 rounded-md transition-all duration-200 ${
                    viewMode === 'grid' ? 'bg-white text-[#05294E] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  title="Grid view"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleViewModeChange('list')}
                  className={`flex items-center px-3 py-2 rounded-md transition-all duration-200 ${
                    viewMode === 'list' ? 'bg-white text-[#05294E] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  title="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <div>
            <span className="font-medium">{filteredScholarships.length}</span>
            <span className="ml-1">
              scholarship{filteredScholarships.length !== 1 ? 's' : ''} found
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
              >
                <option value={6}>6 per page</option>
                <option value={12}>12 per page</option>
                <option value={24}>24 per page</option>
                <option value={48}>48 per page</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Scholarships Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentScholarships.map((scholarship) => {
            const deadlineInfo = getDeadlineStatus(scholarship.deadline);
            const daysLeft = getDaysUntilDeadline(scholarship.deadline);
            
            return (
              <div key={scholarship.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                {/* Header */}
                <div className="p-6 pb-4">
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
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            <Award className="h-3 w-3 mr-1" />
                            Exclusive
                          </span>
                        )}
                      </div>
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

                  {/* University */}
                  <div className="flex items-center text-sm text-slate-600 mb-4">
                    <Building className="h-4 w-4 mr-2" />
                    {scholarship.universities?.name || 'Unknown University'}
                  </div>

                  {/* Deadline */}
                  <div className={`p-3 rounded-xl border ${deadlineInfo.bg} border-slate-200`}>
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
                          <span className="text-sm font-bold text-red-600">Expired</span>
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
                  <button
                    className="w-full bg-slate-100 text-slate-700 py-2.5 px-4 rounded-xl hover:bg-slate-200 transition-colors font-medium text-sm"
                    onClick={() => {
                      setSelectedScholarship(scholarship);
                      setShowModal(true);
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Course</th>
                <th className="px-4 py-2 text-left">University</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Level</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Deadline</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentScholarships.map((scholarship) => (
                <tr key={scholarship.id} className="border-b">
                  <td className="px-4 py-2 font-medium text-slate-900">{scholarship.title}</td>
                  <td className="px-4 py-2 text-slate-600">{scholarship.field_of_study || 'Not specified'}</td>
                  <td className="px-4 py-2 text-slate-600">{scholarship.universities?.name || 'Unknown University'}</td>
                  <td className="px-4 py-2 text-green-600 font-bold">{formatCurrency(Number(scholarship.annual_value_with_scholarship ?? 0))}</td>
                  <td className="px-4 py-2 text-slate-600">{scholarship.level}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${scholarship.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{scholarship.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{new Date(scholarship.deadline).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <button 
                      className="bg-slate-100 text-slate-700 py-1 px-3 rounded-lg hover:bg-slate-200 transition-colors text-xs font-medium" 
                      title="View details"
                      onClick={() => {
                        setSelectedScholarship(scholarship);
                        setShowModal(true);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredScholarships.length === 0 && (
        <div className="text-center py-12">
          <Award className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No scholarships found</h3>
          <p className="text-slate-500">
            {searchTerm ? `No scholarships match "${searchTerm}"` : 'No scholarships available yet'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {filteredScholarships.length > 0 && totalPages > 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
              <span className="font-medium">{Math.min(endIndex, filteredScholarships.length)}</span> of{' '}
              <span className="font-medium">{filteredScholarships.length}</span> results
            </div>
            
            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === pageNumber
                          ? 'bg-[#05294E] text-white'
                          : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
              
              {/* Next Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholarshipManagement;