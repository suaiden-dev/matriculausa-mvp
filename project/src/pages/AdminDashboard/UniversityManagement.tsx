import React, { useState, useEffect, useEffect as _useEffectAlias, useMemo } from 'react';
import ReactOriginal, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
const UniversityFinancialManagement = lazy(() => import('./UniversityFinancialManagement'));
import { DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  Building, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Search, 
  Filter, 
  Calendar, 
  MapPin,
  Globe,
  Mail,
  Phone,
  AlertTriangle,
  Clock,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Target,
  List,
  Grid3X3
} from 'lucide-react';
import { useUniversityFinancialData } from '../../hooks/useUniversityFinancialData';

interface UniversityManagementProps {
  universities: any[];
  stats: {
    total: number;
    pending: number;
    approved: number;
  };
  onApprove: (universityId: string) => void;
  onReject: (universityId: string) => void;
}

const UniversityManagement: React.FC<UniversityManagementProps> = ({
  universities,
  stats,
  onApprove,
  onReject
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [activeTab, setActiveTab] = useState<'overview' | 'financial'>('overview');
  const [financialLoaded, setFinancialLoaded] = useState(false);
  const [expandedUniversities, setExpandedUniversities] = useState<Set<string>>(new Set());
  const UNIVERSITIES_PER_PAGE = 12;
  const [searchParams] = useSearchParams();

  // Dados financeiros para ordenar corretamente por faturamento
  const { universities: financialUniversities } = useUniversityFinancialData();
  const revenueByUniversityId = useMemo(() => {
    const map = new Map<string, number>();
    (financialUniversities || []).forEach((u: any) => {
      const value = typeof u?.totalRevenue === 'number' ? u.totalRevenue : Number(u?.totalRevenue) || 0;
      if (u?.id) map.set(u.id, value);
    });
    return map;
  }, [financialUniversities]);

  const hasApplicationsByUniversityId = useMemo(() => {
    const map = new Map<string, boolean>();
    (financialUniversities || []).forEach((u: any) => {
      if (!u?.id) return;
      const paid = Number(u?.paidApplicationsCount || 0) > 0;
      const totalApps = Number(u?.applicationsCount || u?.totalApplications || 0) > 0;
      const hasStudentsArray = Array.isArray(u?.students) && u.students.length > 0;
      map.set(u.id, paid || totalApps || hasStudentsArray);
    });
    return map;
  }, [financialUniversities]);

  // Carregar preferência de visualização do localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem('university-view-mode') as 'grid' | 'list';
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
  }, []);

  // Carregar a aba financeira apenas na primeira abertura e manter montada
  useEffect(() => {
    if (activeTab === 'financial' && !financialLoaded) {
      setFinancialLoaded(true);
    }
  }, [activeTab, financialLoaded]);

  // Deep-link: ?tab=financial&university=<id>
  useEffect(() => {
    const tab = searchParams.get('tab');
    const universityId = searchParams.get('university');
    if (tab === 'financial') {
      setActiveTab('financial');
      setFinancialLoaded(true);
    }
    if (universityId) {
      setExpandedUniversities(prev => new Set(prev).add(universityId));
      setTimeout(() => {
        const el = document.getElementById(`uni-${universityId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [searchParams]);

  // Salvar preferência no localStorage quando mudar
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('university-view-mode', mode);
  };

  const filteredUniversities = universities.filter(university => {
    const matchesSearch = university.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         university.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'approved' && university.is_approved) ||
      (statusFilter === 'pending' && !university.is_approved);
    
    return matchesSearch && matchesStatus;
  });

  // Ordenar por faturamento (desc) semelhante ao UniversityFinancialManagement
  const getUniversityRevenue = (u: any): number => {
    // Preferir total agregado; aceitar number ou string numérica
    const toNumSafe = (v: any) => {
      if (v === null || v === undefined) return 0;
      const n = typeof v === 'number' ? v : Number(String(v).replace(/[,\s]/g, ''));
      return Number.isFinite(n) ? n : 0;
    };

    const primary = toNumSafe(u?.totalRevenue ?? u?.revenue ?? u?.total_revenue);
    if (primary > 0) return primary;

    // Fallback: somar quebras conhecidas quando disponíveis
    const breakdownSum =
      toNumSafe(u?.manualPaymentsRevenue) +
      toNumSafe(u?.stripePaymentsRevenue) +
      toNumSafe(u?.zellePaymentsRevenue);
    return breakdownSum;
  };

  const sortedByRevenue = [...filteredUniversities].sort((a, b) => {
    const aRev = revenueByUniversityId.get(a.id) ?? getUniversityRevenue(a);
    const bRev = revenueByUniversityId.get(b.id) ?? getUniversityRevenue(b);
    if (bRev !== aRev) return bRev - aRev; // desc por faturamento
    // Segundo critério: universidades com alunos com aplicações nas suas bolsas primeiro
    const aActive = hasApplicationsByUniversityId.get(a.id) ? 1 : 0;
    const bActive = hasApplicationsByUniversityId.get(b.id) ? 1 : 0;
    if (bActive !== aActive) return bActive - aActive;
    // Desempate estável por nome (asc)
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  });

  // Calcular paginação
  const totalPages = Math.ceil(sortedByRevenue.length / UNIVERSITIES_PER_PAGE);
  const startIndex = (currentPage - 1) * UNIVERSITIES_PER_PAGE;
  const currentUniversities = sortedByRevenue.slice(startIndex, startIndex + UNIVERSITIES_PER_PAGE);

  return (
    <div className="space-y-8">
      {/* Header + Tabs (same style as UsersHub) */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-[#05294E] text-[#05294E]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>Overview</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'financial'
                ? 'border-[#05294E] text-[#05294E]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Financial</span>
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Universities</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Pending Approval</p>
              <p className="text-3xl font-bold text-slate-900">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Approved</p>
              <p className="text-3xl font-bold text-slate-900">{stats.approved}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
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
                placeholder="Search universities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all duration-200"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all duration-200"
              aria-label="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#05294E] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-white text-[#05294E] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center text-sm text-slate-600">
          <span className="font-medium">{sortedByRevenue.length}</span>
          <span className="ml-1">
            universit{sortedByRevenue.length !== 1 ? 'ies' : 'y'} found
          </span>
        </div>
      </div>

      {/* Universities Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="p-6">
          {filteredUniversities.length === 0 ? (
            <div className="text-center py-12">
              <Building className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No universities found</h3>
              <p className="text-slate-500">
                {searchTerm ? `No universities match "${searchTerm}"` : 'No universities registered yet'}
              </p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                /* Grid de universidades em blocos */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {currentUniversities.map((university) => (
                    <div 
                      key={university.id} 
                      id={`uni-${university.id}`}
                      className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-all duration-300 group cursor-pointer"
                      onClick={() => navigate(`universities/${university.id}`)}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Building className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-900 mb-1 truncate group-hover:text-[#05294E] transition-colors">
                              {university.name}
                            </h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              university.is_approved 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {university.is_approved ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Approved
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending Review
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Informações */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center text-sm text-slate-600">
                          <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                          <span>{university.location || 'Location not provided'}</span>
                        </div>
                        <div className="flex items-center text-sm text-slate-600">
                          <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                          <span>Applied {new Date(university.created_at).toLocaleDateString()}</span>
                        </div>
                        {university.website && (
                          <div className="flex items-center text-sm text-slate-600">
                            <Globe className="h-4 w-4 mr-2 text-slate-400" />
                            <span className="truncate">{university.website}</span>
                          </div>
                        )}
                        {university.contact?.email && (
                          <div className="flex items-center text-sm text-slate-600">
                            <Mail className="h-4 w-4 mr-2 text-slate-400" />
                            <span className="truncate">{university.contact.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        {!university.is_approved ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onApprove(university.id);
                            }}
                            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </button>
                        ) : (
                          <div className="flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium text-sm">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approved
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`universities/${university.id}`);
                            }}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {!university.is_approved && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onReject(university.id);
                              }}
                              className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Lista compacta de universidades */
                <div className="space-y-3 mb-6">
                  {/* Header da lista */}
                  <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium text-slate-600">
                    <div className="col-span-4">University</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Location</div>
                    <div className="col-span-2">Applied</div>
                    <div className="col-span-2 text-center">Actions</div>
                  </div>
                  
                  {/* Linhas da lista */}
                  {currentUniversities.map((university) => (
                    <div 
                      key={university.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all duration-200 group cursor-pointer"
                      onClick={() => navigate(`${university.id}`)}
                    >
                      {/* Nome da universidade */}
                      <div className="md:col-span-4 flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                          <Building className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 truncate group-hover:text-purple-600 transition-colors">
                            {university.name}
                          </h4>
                          <p className="text-sm text-slate-500 truncate md:hidden">
                            {university.location || 'Location not provided'}
                          </p>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="md:col-span-2 flex items-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          university.is_approved 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {university.is_approved ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </>
                          )}
                        </span>
                      </div>

                      {/* Localização */}
                      <div className="hidden md:flex md:col-span-2 items-center text-sm text-slate-600">
                        <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                        <span className="truncate">{university.location || 'Not provided'}</span>
                      </div>

                      {/* Data de aplicação */}
                      <div className="hidden md:flex md:col-span-2 items-center text-sm text-slate-600">
                        <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                        <span>{new Date(university.created_at).toLocaleDateString()}</span>
                      </div>

                      {/* Ações */}
                      <div className="md:col-span-2 flex items-center justify-center space-x-2">
                        {!university.is_approved ? (
                          <>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onApprove(university.id);
                              }}
                              className="flex items-center px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                              title="Approve university"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Approve</span>
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onReject(university.id);
                              }}
                              className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject university"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Approved</span>
                          </div>
                        )}
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`${university.id}`);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Informações adicionais em mobile */}
                      <div className="md:hidden col-span-1 pt-3 border-t border-slate-100 text-sm text-slate-500">
                        <div className="flex items-center justify-between">
                          <span>Applied: {new Date(university.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                  <div className="text-sm text-slate-600">
                    Showing {startIndex + 1}-{Math.min(startIndex + UNIVERSITIES_PER_PAGE, filteredUniversities.length)} of {filteredUniversities.length} universities
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Previous Page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <span className="px-4 py-2 text-sm font-medium text-slate-900">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Next Page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
        </>
      )}

      {financialLoaded && (
        <div className={`${activeTab === 'financial' ? '' : 'hidden'} space-y-6`}>
          <Suspense fallback={<div className="p-6">Loading financial data...</div>}>
            <UniversityFinancialManagement />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default UniversityManagement;