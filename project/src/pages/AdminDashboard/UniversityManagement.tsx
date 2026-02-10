import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
const UniversityFinancialManagement = lazy(() => import('./UniversityFinancialManagement'));
import { DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  Building, 
  CheckCircle, 
  Eye, 
  Search, 
  Calendar, 
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
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
  loading?: boolean;
}

const UniversityManagement: React.FC<UniversityManagementProps> = ({
  universities,
  stats,
  onApprove,
  loading = false
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [activeTab, setActiveTab] = useState<'overview' | 'financial'>('overview');
  const [financialLoaded, setFinancialLoaded] = useState(false);
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
      // setExpandedUniversities(prev => new Set(prev).add(universityId)); // This variable is not defined in the provided code
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
            <input
              type="text"
              placeholder="Search universities..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Grid3X3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>

            <select
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-600 font-medium cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending Review</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-6`}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-3 bg-slate-200 rounded"></div>
                <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                <div className="h-10 bg-slate-100 rounded mt-4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="p-6">
            {sortedByRevenue.length === 0 ? (
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    {currentUniversities.map((university) => (
                      <div 
                        key={university.id} 
                        id={`uni-${university.id}`}
                        className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-all duration-300 group cursor-pointer"
                        onClick={() => navigate(`${university.id}`)}
                      >
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
                                  <><CheckCircle className="h-3 w-3 mr-1" />Approved</>
                                ) : (
                                  <><Clock className="h-3 w-3 mr-1" />Pending Review</>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 mb-4">
                          <div className="flex items-center text-sm text-slate-600">
                            <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                            <span>{university.location || 'Location not provided'}</span>
                          </div>
                          <div className="flex items-center text-sm text-slate-600">
                            <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                            <span>Applied {new Date(university.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                          {!university.is_approved ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); onApprove(university.id); }}
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
                              onClick={(e) => { e.stopPropagation(); navigate(`${university.id}`); }}
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 mb-6">
                    <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium text-slate-600">
                      <div className="col-span-5">University</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-3">Location</div>
                      <div className="col-span-2 text-center">Actions</div>
                    </div>
                    {currentUniversities.map((university) => (
                      <div 
                        key={university.id}
                        className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all duration-200 group cursor-pointer"
                        onClick={() => navigate(`${university.id}`)}
                      >
                        <div className="md:col-span-5 flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                            <Building className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 truncate group-hover:text-purple-600 transition-colors">
                              {university.name}
                            </h4>
                          </div>
                        </div>
                        <div className="md:col-span-2 flex items-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            university.is_approved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {university.is_approved ? 'Approved' : 'Pending'}
                          </span>
                        </div>
                        <div className="md:col-span-3 flex items-center text-sm text-slate-600">
                          <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                          <span className="truncate">{university.location || 'Not provided'}</span>
                        </div>
                        <div className="md:col-span-2 flex items-center justify-center space-x-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`${university.id}`); }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                    <div className="text-sm text-slate-600">
                      Showing {startIndex + 1}-{Math.min(startIndex + UNIVERSITIES_PER_PAGE, sortedByRevenue.length)} of {sortedByRevenue.length}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="px-4 py-2 text-sm font-medium text-slate-900">Page {currentPage} of {totalPages}</span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
      )}
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