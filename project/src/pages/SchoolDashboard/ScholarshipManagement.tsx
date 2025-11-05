import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Info,
  X,
  Building,
  GraduationCap,
  Globe,
  FileText,
  Briefcase
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
  const [selectedScholarship, setSelectedScholarship] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
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

  const openDetailsModal = (scholarship: any) => {
    setSelectedScholarship(scholarship);
    setShowDetailsModal(true);
    setShowActions(null);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedScholarship(null);
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
                        
                        <button 
                          className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors flex items-center"
                          aria-label="Filter scholarships"
                        >
                          <Filter className="h-5 w-5 text-slate-500" />
                        </button>
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
                            <button 
                              onClick={() => openDetailsModal(scholarship)}
                              className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
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
       {showDetailsModal && selectedScholarship && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center  z-50">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
             {/* Header */}
             <div className="relative">
               {/* Hero Section */}
               <div className="h-48 overflow-hidden relative bg-gradient-to-br from-[#05294E] to-slate-800">
                 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                 
                 {/* Close Button */}
                 <button
                   onClick={closeDetailsModal}
                   className="absolute top-4 right-4 bg-white text-black p-2 rounded-full border border-gray-300 shadow-md hover:bg-gray-100 transition-all duration-200"
                 >
                   <X className="h-6 w-6" />
                 </button>

                 {/* Exclusive Badge */}
                 {selectedScholarship.is_exclusive && (
                   <div className="absolute top-4 left-4">
                     <span className="bg-[#D0151C] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2">
                       <Award className="h-4 w-4" />
                       Exclusive Scholarship
                     </span>
                   </div>
                 )}

                 {/* Title Overlay */}
                 <div className="absolute bottom-6 left-6 right-6">
                   <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
                     {selectedScholarship.title}
                   </h2>
                   <div className="flex items-center gap-3">
                     <span className="px-3 py-1 rounded-lg text-sm font-medium text-white bg-slate-600">
                       {selectedScholarship.field_of_study || 'Any Field'}
                     </span>
                     <span className="text-white/80 text-sm flex items-center gap-1">
                       <Building className="h-4 w-4" />
                       {selectedScholarship.universities?.name || 'University Information'}
                     </span>
                   </div>
                 </div>
               </div>
             </div>

             {/* Content */}
             <div className="p-8 overflow-y-auto max-h-[calc(90vh-12rem)]">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 {/* Main Content */}
                 <div className="lg:col-span-2 space-y-6">
                   {/* Financial Overview - Destacado */}
                   <div className="bg-white rounded-2xl p-6 border-2 border-[#05294E]/20 shadow-sm">
                     <h3 className="text-xl font-bold text-[#05294E] mb-6 flex items-center gap-2">
                       <DollarSign className="h-5 w-5" />
                       Financial Breakdown
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-3">
                         <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                           <span className="text-slate-600 font-medium">Original Annual Cost</span>
                           <span className="font-bold text-xl text-slate-900">
                             {formatCurrency(Number(selectedScholarship.original_annual_value ?? 0))}
                           </span>
                         </div>
                         <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl border border-green-200">
                           <span className="text-slate-600 font-medium">With Scholarship</span>
                           <span className="font-bold text-xl text-green-700">
                             {formatCurrency(Number(selectedScholarship.annual_value_with_scholarship ?? 0))}
                           </span>
                         </div>
                         <div className="flex justify-between items-center p-4 bg-[#05294E] text-white rounded-xl">
                           <span className="font-medium">Annual Savings</span>
                           <span className="font-bold text-xl">
                             {formatCurrency((Number(selectedScholarship.original_annual_value ?? 0)) - (Number(selectedScholarship.annual_value_with_scholarship ?? 0)))}
                           </span>
                         </div>
                       </div>
                       <div className="space-y-3">
                         <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                           <span className="text-slate-600 font-medium">Cost Per Credit</span>
                           <span className="font-bold text-lg text-slate-900">
                             {formatCurrency(Number(selectedScholarship.original_value_per_credit ?? 0))}
                           </span>
                         </div>
                         <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                           <span className="text-slate-600 font-medium">Application Fee</span>
                           <span className="font-bold text-lg text-slate-900">
                             {formatCurrency(Number(selectedScholarship.application_fee_amount ?? 0))}
                           </span>
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Program Details */}
                   <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                     <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                       <Target className="h-5 w-5 text-slate-600" />
                       Program Information
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-4">
                         <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                           <div className="flex items-center gap-2 mb-2">
                             <GraduationCap className="h-4 w-4 text-slate-600" />
                             <span className="font-semibold text-slate-700">Academic Level</span>
                           </div>
                           <span className="text-slate-900 capitalize">{selectedScholarship.level || 'Not specified'}</span>
                         </div>
                         
                         {selectedScholarship.delivery_mode && (
                           <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                             <div className="flex items-center gap-2 mb-2">
                               <Building className="h-4 w-4 text-slate-600" />
                               <span className="font-semibold text-slate-700">Course Modality</span>
                             </div>
                             <span className="text-slate-900 capitalize">
                               {selectedScholarship.delivery_mode?.replace('_', ' ') || 'Not specified'}
                             </span>
                           </div>
                         )}
                       </div>

                       <div className="space-y-4">
                         {selectedScholarship.duration && (
                           <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                             <div className="flex items-center gap-2 mb-2">
                               <Clock className="h-4 w-4 text-slate-600" />
                               <span className="font-semibold text-slate-700">Program Duration</span>
                             </div>
                             <span className="text-slate-900">{selectedScholarship.duration}</span>
                           </div>
                         )}

                         {selectedScholarship.language && (
                           <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                             <div className="flex items-center gap-2 mb-2">
                               <Globe className="h-4 w-4 text-slate-600" />
                               <span className="font-semibold text-slate-700">Language</span>
                             </div>
                             <span className="text-slate-900">{selectedScholarship.language}</span>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>

                   {/* Description */}
                   {selectedScholarship.description && (
                     <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                       <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                         <FileText className="h-5 w-5 text-slate-600" />
                         Program Description
                       </h3>
                       <div className="prose prose-slate max-w-none">
                         <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                           {selectedScholarship.description}
                         </p>
                       </div>
                     </div>
                   )}

                   {/* Requirements */}
                   {selectedScholarship.requirements && (
                     <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                       <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                         <CheckCircle className="h-5 w-5 text-slate-600" />
                         Requirements
                       </h3>
                       <div className="space-y-3">
                         {Array.isArray(selectedScholarship.requirements) ? (
                           selectedScholarship.requirements.map((req: string, index: number) => (
                             <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                               <div className="flex-shrink-0 w-2 h-2 bg-slate-400 rounded-full mt-2"></div>
                               <span className="text-slate-700 text-sm leading-relaxed">{req}</span>
                             </div>
                           ))
                         ) : (
                           <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                             {selectedScholarship.requirements}
                           </div>
                         )}
                       </div>
                     </div>
                   )}

                   {/* Eligibility */}
                   {selectedScholarship.eligibility?.length > 0 && (
                     <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                       <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                         <Users className="h-5 w-5 text-slate-600" />
                         Eligibility Criteria
                       </h3>
                       <div className="space-y-3">
                         {selectedScholarship.eligibility.map((item: string, index: number) => (
                           <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                             <div className="flex-shrink-0 w-2 h-2 bg-slate-400 rounded-full mt-2"></div>
                             <span className="text-slate-700 text-sm leading-relaxed">{item}</span>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}

                   {/* Benefits */}
                   {selectedScholarship.benefits?.length > 0 && (
                     <div className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-sm">
                       <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                         <Award className="h-5 w-5 text-blue-600" />
                         Additional Benefits
                       </h3>
                       <div className="space-y-3">
                         {Array.isArray(selectedScholarship.benefits) ? (
                           selectedScholarship.benefits.map((benefit: string, index: number) => (
                             <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                               <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                               <span className="text-blue-700 text-sm leading-relaxed">{benefit}</span>
                             </div>
                           ))
                         ) : (
                           <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                             {selectedScholarship.benefits}
                           </div>
                         )}
                       </div>
                     </div>
                   )}

                   {/* Work Permissions */}
                   {selectedScholarship.work_permissions?.length > 0 && (
                     <div className="bg-white rounded-2xl p-6 border-2 border-green-200 shadow-sm">
                       <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                         <Briefcase className="h-5 w-5 text-green-600" />
                         Work Authorization
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         {selectedScholarship.work_permissions.map((permission: string, index: number) => (
                           <div
                             key={index}
                             className="flex items-center justify-center p-4 bg-green-50 rounded-xl border border-green-200"
                           >
                             <span className="font-semibold text-green-700 text-center">
                               {permission}
                             </span>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                 </div>

                 {/* Sidebar */}
                 <div className="space-y-6">
                   {/* Deadline Status */}
                   <div className={`p-6 rounded-2xl border-2 ${getDeadlineStatus(selectedScholarship.deadline).bg}`}>
                     <div className="flex items-center gap-3 mb-3">
                       <Clock className="h-6 w-6 text-slate-600" />
                       <span className="font-bold text-lg text-slate-900">
                         Application Deadline
                       </span>
                     </div>
                     <div className="space-y-2">
                       <p className="text-2xl font-bold text-slate-900">
                         {getDaysUntilDeadline(selectedScholarship.deadline)} days left
                       </p>
                       <p className="text-slate-700">
                         {(() => {
                           // Parse da data como local para evitar problemas de timezone
                           const [year, month, day] = selectedScholarship.deadline.split('-').map(Number);
                           const deadlineDate = new Date(year, month - 1, day);
                           return deadlineDate.toLocaleDateString('en-US', {
                             weekday: 'long',
                             year: 'numeric',
                             month: 'long',
                             day: 'numeric'
                           });
                         })()}
                       </p>
                     </div>
                   </div>

                   {/* Status Information */}
                   <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                     <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <Info className="h-5 w-5 text-slate-600" />
                       Status Information
                     </h4>
                     <div className="space-y-3">
                       <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                         <span className="text-slate-600 font-medium">Status</span>
                         <div className="flex items-center gap-2">
                           <div className={`w-3 h-3 rounded-full ${selectedScholarship.is_active ? 'bg-slate-600' : 'bg-slate-400'}`}></div>
                           <span className="font-semibold text-slate-700">
                             {selectedScholarship.is_active ? 'Active' : 'Inactive'}
                           </span>
                         </div>
                       </div>
                       <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                         <span className="text-slate-600 font-medium">Exclusive</span>
                         <div className="flex items-center gap-2">
                           <div className={`w-3 h-3 rounded-full ${selectedScholarship.is_exclusive ? 'bg-slate-600' : 'bg-slate-400'}`}></div>
                           <span className="font-semibold text-slate-700">
                             {selectedScholarship.is_exclusive ? 'Exclusive' : 'Standard'}
                           </span>
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Application Statistics */}
                   <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                     <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <Users className="h-5 w-5 text-slate-600" />
                       Application Statistics
                     </h4>
                     <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                       <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-600 rounded-lg">
                           <Users className="h-5 w-5 text-white" />
                         </div>
                         <div>
                           <p className="text-2xl font-bold text-blue-900">{selectedScholarship.application_count || 0}</p>
                           <p className="text-sm text-blue-700 font-medium">Total Applications</p>
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Quick Actions */}
                   <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                     <h4 className="font-bold text-slate-800 mb-4">Quick Actions</h4>
                     <div className="space-y-3">
                       <Link
                         to={`/school/dashboard/scholarship/new?edit=${selectedScholarship.id}`}
                         onClick={closeDetailsModal}
                         className="w-full bg-[#05294E] text-white py-3 px-4 rounded-xl hover:bg-[#05294E]/90 transition-colors font-medium flex items-center justify-center gap-2"
                       >
                         <Edit className="h-4 w-4" />
                         Edit Scholarship
                       </Link>
                       <button
                         onClick={() => {
                           toggleScholarshipStatus(selectedScholarship.id, selectedScholarship.is_active);
                           closeDetailsModal();
                         }}
                         className="w-full bg-slate-100 text-slate-700 py-3 px-4 rounded-xl hover:bg-slate-200 transition-colors font-medium flex items-center justify-center gap-2"
                       >
                         <CheckCircle className="h-4 w-4" />
                         {selectedScholarship.is_active ? 'Deactivate' : 'Activate'}
                       </button>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </div>
       )}
      </div>
    </ProfileCompletionGuard>
  );
};

export default ScholarshipManagement;