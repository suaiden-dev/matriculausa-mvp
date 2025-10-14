import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  DollarSign, 
  Search,
  ChevronRight,
  MapPin,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Eye,
  Building,
  CreditCard,
  TrendingUp,
  Users,
  Banknote,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink
} from 'lucide-react';
import { useUniversityFinancialData } from '../../hooks/useUniversityFinancialData';

interface FilterState {
  search: string;
  status: 'all' | 'active' | 'inactive';
  sortBy: 'name' | 'created_at' | 'totalRevenue' | 'paidApplicationsCount' | 'availableBalance';
  sortOrder: 'asc' | 'desc';
}

const UniversityFinancialManagement: React.FC = () => {
  const { universities, loading, error, refetch } = useUniversityFinancialData();
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    sortBy: 'totalRevenue',
    sortOrder: 'desc'
  });
  
  const [expandedUniversities, setExpandedUniversities] = useState<Set<string>>(new Set());

  // Filtrar e ordenar universidades
  const filteredAndSortedUniversities = useMemo(() => {
    let filtered = universities.filter(university => {
      // Filtro de busca
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesSearch = 
          university.name.toLowerCase().includes(searchTerm) ||
          (university.users?.email || '').toLowerCase().includes(searchTerm) ||
          university.location.toLowerCase().includes(searchTerm);
        
        if (!matchesSearch) return false;
      }

      // Filtro de status
      if (filters.status !== 'all') {
        if (filters.status === 'active') {
          return university.profile_completed && university.paidApplicationsCount > 0;
        } else if (filters.status === 'inactive') {
          return !university.profile_completed || university.paidApplicationsCount === 0;
        }
      }

      return true;
    });

    // Ordenação
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'totalRevenue':
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
          break;
        case 'paidApplicationsCount':
          aValue = a.paidApplicationsCount;
          bValue = b.paidApplicationsCount;
          break;
        case 'availableBalance':
          aValue = a.availableBalance;
          bValue = b.availableBalance;
          break;
        default:
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
      }

      if (filters.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [universities, filters]);

  // Calcular estatísticas gerais
  const overallStats = useMemo(() => {
    const totalUniversities = universities.length;
    const activeUniversities = universities.filter(u => u.profile_completed && u.paidApplicationsCount > 0).length;
    const totalRevenue = universities.reduce((sum, u) => sum + u.totalRevenue, 0);
    const totalApplications = universities.reduce((sum, u) => sum + u.paidApplicationsCount, 0);
    const totalAvailableBalance = universities.reduce((sum, u) => sum + u.availableBalance, 0);
    const totalPaidOut = universities.reduce((sum, u) => sum + u.totalPaidOut, 0);

    return {
      totalUniversities,
      activeUniversities,
      totalRevenue,
      totalApplications,
      totalAvailableBalance,
      totalPaidOut
    };
  }, [universities]);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const toggleUniversityExpansion = (universityId: string) => {
    const newExpanded = new Set(expandedUniversities);
    if (newExpanded.has(universityId)) {
      newExpanded.delete(universityId);
    } else {
      newExpanded.add(universityId);
    }
    setExpandedUniversities(newExpanded);
  };

  const handleStudentClick = (studentId: string) => {
    navigate(`/admin/dashboard/students/${studentId}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
            <div className="space-y-2 w-full">
              <div className="h-6 bg-slate-200 rounded w-48"></div>
              <div className="h-4 bg-slate-200 rounded w-72"></div>
            </div>
            <div className="h-10 bg-slate-200 rounded w-36"></div>
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2 w-full">
                  <div className="h-4 bg-slate-200 rounded w-24"></div>
                  <div className="h-6 bg-slate-200 rounded w-20"></div>
                </div>
                <div className="p-3 bg-slate-100 rounded-lg w-12 h-12"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters skeleton */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="h-10 bg-slate-200 rounded w-full"></div>
            <div className="h-10 bg-slate-200 rounded w-full lg:w-48"></div>
            <div className="h-10 bg-slate-200 rounded w-24"></div>
          </div>
          <div className="mt-4 h-4 bg-slate-200 rounded w-56"></div>
        </div>

        {/* Universities list skeleton */}
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
                    <div className="space-y-2">
                      <div className="h-5 bg-slate-200 rounded w-40"></div>
                      <div className="h-4 bg-slate-200 rounded w-64"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 w-80">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="space-y-2">
                        <div className="h-5 bg-slate-200 rounded w-12"></div>
                        <div className="h-3 bg-slate-200 rounded w-14"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Data</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">University Financial Management</h1>
            <p className="text-slate-600 mt-2">
              Monitor university revenues, application fees, and payment methods
            </p>
          </div>
          <button
            onClick={refetch}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Clock className="h-4 w-4" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(overallStats.totalRevenue)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Paid Applications</p>
                <p className="text-2xl font-bold text-blue-600">{overallStats.totalApplications.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Available Balance</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(overallStats.totalAvailableBalance)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Banknote className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Total Paid Out</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(overallStats.totalPaidOut)}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search universities..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Sort by</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
            >
              <option value="totalRevenue">Total Revenue</option>
              <option value="name">University Name</option>
              <option value="paidApplicationsCount">Paid Applications</option>
              <option value="availableBalance">Available Balance</option>
              <option value="created_at">Created Date</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Order</label>
            <select
              value={filters.sortOrder}
              onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as any }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
            >
              <option value="desc">Highest to Lowest</option>
              <option value="asc">Lowest to Highest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de universidades */}
      <div className="space-y-4">
        {filteredAndSortedUniversities.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No universities found</h3>
            <p className="text-slate-600">Try adjusting your filters to see more results.</p>
          </div>
        ) : (
          filteredAndSortedUniversities.map((university) => (
            <div key={university.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Header da universidade */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-lg">
                        {university.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-xl font-semibold text-slate-900">{university.name}</h3>                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="flex items-center text-sm text-slate-600">
                          <MapPin className="w-4 h-4 mr-1" />
                          {university.location}
                        </span>
                        <span className="flex items-center text-sm text-slate-600">
                          <Mail className="w-4 h-4 mr-1" />
                          {university.users?.email || 'No email'}
                        </span>
                        <span className="flex items-center text-sm text-slate-600">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(university.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => toggleUniversityExpansion(university.id)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      {expandedUniversities.has(university.id) ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Métricas financeiras */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1">Total Revenue</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(university.totalRevenue)}</p>
                      </div>
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1">Available Balance</p>
                        <p className="text-lg font-bold text-purple-600">{formatCurrency(university.availableBalance)}</p>
                      </div>
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Banknote className="w-4 h-4 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1">Paid Applications</p>
                        <p className="text-lg font-bold text-blue-600">{university.paidApplicationsCount}</p>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <GraduationCap className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1">Total Paid Out</p>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(university.totalPaidOut)}</p>
                      </div>
                      <div className="p-2 bg-red-100 rounded-lg">
                        <CreditCard className="w-4 h-4 text-red-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1">Total Pending</p>
                        <p className="text-lg font-bold text-yellow-600">{formatCurrency(university.totalPending)}</p>
                      </div>
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Clock className="w-4 h-4 text-yellow-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method Breakdown */}
                <div className="mt-6 bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Payment Method Breakdown</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-600 mb-1">Outside Payments</p>
                          <p className="text-sm font-bold text-slate-900">{university.manualPaymentsCount} applications</p>
                          <p className="text-lg font-bold text-green-600">{formatCurrency(university.manualPaymentsRevenue)}</p>
                        </div>
                        <div className="p-2 bg-green-100 rounded-lg">
                          <FileText className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-600 mb-1">Stripe Payments</p>
                          <p className="text-sm font-bold text-slate-900">{university.stripePaymentsCount} applications</p>
                          <p className="text-lg font-bold text-green-600">{formatCurrency(university.stripePaymentsRevenue)}</p>
                        </div>
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CreditCard className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-600 mb-1">Zelle Payments</p>
                          <p className="text-sm font-bold text-slate-900">{university.zellePaymentsCount} applications</p>
                          <p className="text-lg font-bold text-green-600">{formatCurrency(university.zellePaymentsRevenue)}</p>
                        </div>
                        <div className="p-2 bg-green-100 rounded-lg">
                          <ExternalLink className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção expandida - Estudantes */}
              {expandedUniversities.has(university.id) && (
                <div className="border-t border-slate-200 bg-slate-50">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-slate-900 flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Students ({university.students.length})
                      </h4>
                    </div>

                    {university.students.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-600">No students found for this university</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {university.students.map((student) => {
                          const user = Array.isArray(student.users) ? student.users[0] : student.users;
                          const scholarship = Array.isArray(student.scholarships) ? student.scholarships[0] : student.scholarships;
                          
                          return (
                            <div
                              key={student.id}
                              className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                              onClick={() => handleStudentClick(user?.id)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-xs">
                                      {(user?.name || 'U').charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900 text-sm">{user?.name || 'Unknown Student'}</p>
                                    <p className="text-xs text-slate-600">{user?.email}</p>
                                  </div>
                                </div>
                                <button className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-600">Scholarship:</span>
                                  <span className="font-medium text-slate-900 truncate ml-2" title={scholarship?.title}>
                                    {scholarship?.title || 'N/A'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-600">Fee Status:</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    student.is_application_fee_paid 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {student.is_application_fee_paid ? 'Paid' : 'Unpaid'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-600">Applied:</span>
                                  <span className="text-slate-900">{formatDate(student.created_at)}</span>
                                </div>
                                {student.is_application_fee_paid && scholarship?.application_fee_amount && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600">Fee Amount:</span>
                                    <span className="font-medium text-slate-700">
                                      {formatCurrency(scholarship.application_fee_amount / 100)}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-3 pt-3 border-t border-slate-200">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStudentClick(user?.id);
                                  }}
                                  className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:text-blue-800 transition-colors"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View Details
                                  <ChevronRight className="w-3 h-3 ml-1" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UniversityFinancialManagement;