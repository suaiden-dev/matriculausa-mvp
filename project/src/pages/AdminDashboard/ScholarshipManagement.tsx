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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // Estados do modal de detalhes
  const [selectedScholarship, setSelectedScholarship] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const closeModal = () => {
    setShowModal(false);
    setSelectedScholarship(null);
  };

  React.useEffect(() => {
    const saved = localStorage.getItem('scholarship-view-mode') as 'grid' | 'list';
    if (saved) setViewMode(saved);
  }, []);

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('scholarship-view-mode', mode);
  };

  const filteredScholarships = scholarships.filter(scholarship => {
    const matchesSearch = scholarship.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scholarship.universities?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && scholarship.is_active) ||
      (statusFilter === 'inactive' && !scholarship.is_active);
    
    const matchesLevel = levelFilter === 'all' || scholarship.level === levelFilter;
    
    return matchesSearch && matchesStatus && matchesLevel;
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Scholarships</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
                {/* Scholarship Details Modal */}
                {showModal && selectedScholarship && (
                  <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 bg-opacity-40 backdrop-blur-sm p-4"
                    onClick={closeModal}
                  >
                    <div 
                      className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[90vh] overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div className="relative">
                        {/* Hero Section */}
                        <div className="h-48 overflow-hidden relative bg-gradient-to-br from-[#05294E] via-slate-800 to-[#05294E]">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                          
                          {/* Close Button */}
                      <button
                        onClick={closeModal}
                            className="absolute top-4 right-4 bg-white text-black p-2 rounded-full border border-gray-300 shadow-md hover:bg-gray-100 transition-all duration-200"
                      >
                            <X className="h-6 w-6" />
                      </button>

                          {/* Exclusive Badge */}
                          {selectedScholarship.is_exclusive && (
                            <div className="absolute top-4 left-4">
                              <span className="bg-[#D0151C] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2">
                                <Star className="h-4 w-4" />
                                Exclusive Scholarship
                              </span>
                            </div>
                          )}

                          {/* Title Overlay */}
                          <div className="absolute bottom-6 left-6 right-6">
                            <h2 className="text-3xl font-bold text-white mb-2 leading-tight">
                              {selectedScholarship.title}
                            </h2>
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-lg text-sm font-medium text-white ${getFieldBadgeColor(selectedScholarship.field_of_study)}`}>
                                {selectedScholarship.field_of_study || 'Any Field'}
                              </span>
                              <span className="text-white/80 text-sm flex items-center gap-1">
                                <Building className="h-4 w-4" />
                                {selectedScholarship.universities?.name || 'Unknown University'}
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
                                    <span className="text-slate-600 font-medium">Scholarship Value</span>
                                    <span className="font-bold text-lg text-slate-900">
                                      {formatCurrency(Number(selectedScholarship.scholarshipvalue ?? 0))}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                                    <span className="text-slate-600 font-medium">Application Fee</span>
                                    <span className="font-bold text-lg text-blue-700">
                                      {selectedScholarship.application_fee_amount ? Number(selectedScholarship.application_fee_amount).toFixed(2) : '350.00'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Program Details */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-slate-600" />
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
                                        {selectedScholarship.delivery_mode === 'online' ? <Monitor className="h-4 w-4" /> :
                                         selectedScholarship.delivery_mode === 'in_person' ? <Building className="h-4 w-4" /> :
                                         selectedScholarship.delivery_mode === 'hybrid' ? <Globe className="h-4 w-4" /> :
                                         <MapPin className="h-4 w-4" />}
                                        <span className="font-semibold text-slate-700">Study Mode</span>
                                      </div>
                                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                        selectedScholarship.delivery_mode === 'online' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                        selectedScholarship.delivery_mode === 'in_person' ? 'bg-green-100 text-green-700 border-green-200' :
                                        selectedScholarship.delivery_mode === 'hybrid' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                        'bg-gray-100 text-gray-700 border-gray-200'
                                      } border`}>
                                        {selectedScholarship.delivery_mode === 'online' ? 'Online Learning' : 
                                         selectedScholarship.delivery_mode === 'in_person' ? 'On Campus' : 
                                         selectedScholarship.delivery_mode === 'hybrid' ? 'Hybrid Mode' : selectedScholarship.delivery_mode}
                                      </span>
                                    </div>
                                  )}

                                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Zap className="h-4 w-4 text-slate-600" />
                                      <span className="font-semibold text-slate-700">Status</span>
                      </div>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                      selectedScholarship.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                          {selectedScholarship.is_active ? <><Zap className="h-3 w-3 mr-1" />Active</> : <><Clock className="h-3 w-3 mr-1" />Inactive</>}
                        </span>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Star className="h-4 w-4 text-slate-600" />
                                      <span className="font-semibold text-slate-700">Featured Status</span>
                                    </div>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                      selectedScholarship.is_highlighted ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {selectedScholarship.is_highlighted ? 'Featured' : 'Not Featured'}
                                    </span>
                                  </div>

                                  {selectedScholarship.featured_order && (
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                      <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="h-4 w-4 text-slate-600" />
                                        <span className="font-semibold text-slate-700">Featured Order</span>
                                      </div>
                                      <span className="text-slate-900">#{selectedScholarship.featured_order}</span>
                                    </div>
                                  )}

                                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Calendar className="h-4 w-4 text-slate-600" />
                                      <span className="font-semibold text-slate-700">Created</span>
                                    </div>
                                    <span className="text-slate-900">{new Date(selectedScholarship.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Work Permissions - Se disponível */}
                            {selectedScholarship.work_permissions && selectedScholarship.work_permissions.length > 0 && (
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

                            {/* Additional Fields */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-slate-600" />
                                Additional Information
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-4">
                                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                      <CheckCircle className="h-4 w-4 text-slate-600" />
                                      <span className="font-semibold text-slate-700">CPT Required</span>
                                    </div>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                      selectedScholarship.needcpt ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                      {selectedScholarship.needcpt ? 'Yes' : 'No'}
                          </span>
                                  </div>

                                  {selectedScholarship.visaassistance && (
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Building className="h-4 w-4 text-slate-600" />
                                        <span className="font-semibold text-slate-700">Visa Assistance</span>
                                      </div>
                                      <span className="text-slate-900">{selectedScholarship.visaassistance}</span>
                                    </div>
                                  )}

                                  {selectedScholarship.scholarship_type && (
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Award className="h-4 w-4 text-slate-600" />
                                        <span className="font-semibold text-slate-700">Scholarship Type</span>
                                      </div>
                                      <span className="text-slate-900">{selectedScholarship.scholarship_type}</span>
                                    </div>
                        )}
                      </div>

                                <div className="space-y-4">
                                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                      <CheckCircle className="h-4 w-4 text-slate-600" />
                                      <span className="font-semibold text-slate-700">Stripe Connect</span>
                                    </div>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                      selectedScholarship.is_stripe_connect_enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {selectedScholarship.is_stripe_connect_enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                  </div>

                                  {selectedScholarship.university_stripe_account_id && (
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Building className="h-4 w-4 text-slate-600" />
                                        <span className="font-semibold text-slate-700">Stripe Account ID</span>
                                      </div>
                                      <span className="text-slate-900 text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                                        {selectedScholarship.university_stripe_account_id}
                                      </span>
                                    </div>
                                  )}
                        </div>
                        </div>
                      </div>
                      </div>

                          {/* Sidebar */}
                          <div className="space-y-6">
                            {/* Deadline Status */}
                            <div className={`p-6 rounded-2xl border-2 ${getDeadlineStatus(selectedScholarship.deadline).bg}`}>
                              <div className="flex items-center gap-3 mb-3">
                                {getDaysUntilDeadline(selectedScholarship.deadline) > 0 ? 
                                  <Clock className="h-6 w-6 text-orange-600" /> : 
                                  <AlertCircle className="h-6 w-6 text-red-600" />
                                }
                                <span className={`font-bold text-lg ${getDeadlineStatus(selectedScholarship.deadline).color}`}>
                                  Application Deadline
                                </span>
                        </div>
                              <div className="space-y-2">
                          {getDaysUntilDeadline(selectedScholarship.deadline) > 0 ? (
                                  <p className="text-2xl font-bold text-slate-900">
                                    {getDaysUntilDeadline(selectedScholarship.deadline)} days left
                                  </p>
                                ) : (
                                  <p className="text-2xl font-bold text-red-600">Expired</p>
                                )}
                                <p className="text-slate-700">
                                  Deadline: {new Date(selectedScholarship.deadline).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>

                            {/* University Info */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Building className="h-5 w-5 text-slate-600" />
                                University Information
                              </h4>
                              <div className="space-y-3">
                                <p className="font-semibold text-slate-900">
                                  {selectedScholarship.universities?.name || 'University Name Available'}
                                </p>
                                {selectedScholarship.universities?.location && (
                                  <p className="text-slate-600 flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {selectedScholarship.universities.location}
                                  </p>
                                )}
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="h-4 w-4 text-slate-600" />
                                    <span className="font-semibold text-slate-700">Approval Status</span>
                                  </div>
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    selectedScholarship.universities?.is_approved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {selectedScholarship.universities?.is_approved ? 'Approved' : 'Not Approved'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Additional Requirements */}
                            {selectedScholarship.requirements && (
                              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                  <Target className="h-5 w-5 text-slate-600" />
                                  Requirements
                                </h4>
                                <div className="space-y-3">
                                  {Array.isArray(selectedScholarship.requirements) ? (
                                    selectedScholarship.requirements.map((requirement: string, index: number) => (
                                      <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex-shrink-0 w-2 h-2 bg-slate-400 rounded-full mt-2"></div>
                                        <span className="text-slate-700 text-sm leading-relaxed">
                                          {requirement}
                                        </span>
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

                            {/* Additional Benefits */}
                            {selectedScholarship.benefits && (
                              <div className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-sm">
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                  <Award className="h-5 w-5 text-blue-600" />
                                  Additional Benefits
                                </h4>
                                <div className="space-y-3">
                                  {Array.isArray(selectedScholarship.benefits) ? (
                                    selectedScholarship.benefits.map((benefit: string, index: number) => (
                                      <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                        <span className="text-blue-700 text-sm leading-relaxed">
                                          {benefit}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-blue-700 text-sm leading-relaxed whitespace-pre-line">
                                      {selectedScholarship.benefits}
                                    </div>
                          )}
                        </div>
                      </div>
                            )}

                            {/* Eligibility */}
                            {selectedScholarship.eligibility && (
                              <div className="bg-white rounded-2xl p-6 border-2 border-green-200 shadow-sm">
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                  <Target className="h-5 w-5 text-green-600" />
                                  Eligibility
                                </h4>
                                <div className="space-y-3">
                                  {Array.isArray(selectedScholarship.eligibility) ? (
                                    selectedScholarship.eligibility.map((item: string, index: number) => (
                                      <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                                        <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                                        <span className="text-green-700 text-sm leading-relaxed">
                                          {item}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-green-700 text-sm leading-relaxed whitespace-pre-line">
                                      {selectedScholarship.eligibility}
                                    </div>
                                  )}
                                </div>
                        </div>
                            )}
                        </div>
                      </div>
                      </div>
                    </div>
                  </div>
                )}
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Award className="h-6 w-6 text-[#05294E]" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Active Scholarships</p>
              <p className="text-3xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Funding</p>
              <p className="text-3xl font-bold text-blue-600">{formatCurrency(stats.totalFunding)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
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
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
              title="Filter by scholarship status"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
              title="Filter by academic level"
            >
              <option value="all">All Levels</option>
              <option value="undergraduate">Undergraduate</option>
              <option value="graduate">Graduate</option>
              <option value="doctorate">Doctorate</option>
            </select>

            <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'grid' ? 'bg-white text-[#05294E] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'list' ? 'bg-white text-[#05294E] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center text-sm text-slate-600">
          <span className="font-medium">{filteredScholarships.length}</span>
          <span className="ml-1">
            scholarship{filteredScholarships.length !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>

      {/* Scholarships Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScholarships.map((scholarship) => {
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
                <th className="px-4 py-2 text-left">University</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Level</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Deadline</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredScholarships.map((scholarship) => (
                <tr key={scholarship.id} className="border-b">
                  <td className="px-4 py-2 font-medium text-slate-900">{scholarship.title}</td>
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
    </div>
  );
};

export default ScholarshipManagement;