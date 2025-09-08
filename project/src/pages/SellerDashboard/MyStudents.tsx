import React, { useState } from 'react';
import { 
  GraduationCap, 
  Search, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Mail, 
  ChevronLeft, 
  ChevronRight,
  Filter as FilterIcon,
  TrendingUp,
  TrendingDown,
  Building,
  Clock,
  Award
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Student {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  country?: string;
  total_paid: number;
  created_at: string;
  status: string;
  latest_activity: string;
  fees_count?: number;
  scholarship_title?: string;
  university_name?: string;
  university_id?: string;
}

interface University {
  id: string;
  name: string;
  logo_url?: string;
  location?: string;
}

interface FilterState {
  searchTerm: string;
  universityFilter: string;
  dateRange: {
    start: string;
    end: string;
  };
  statusFilter: string;
  paymentFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface MyStudentsProps {
  students: Student[];
  sellerProfile: any;
  onRefresh: () => void;
  onViewStudent: (studentId: {id: string, profile_id: string}) => void;
}

const MyStudents: React.FC<MyStudentsProps> = ({ students, sellerProfile, onRefresh, onViewStudent }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [universities, setUniversities] = useState<University[]>([]);
  
  // Estado dos filtros
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    universityFilter: 'all',
    dateRange: {
      start: '',
      end: ''
    },
    statusFilter: 'all',
    paymentFilter: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Carregar universidades
  React.useEffect(() => {
    const loadUniversities = async () => {
      try {
        const { data: universitiesData, error: universitiesError } = await supabase
          .from('universities')
          .select('id, name, logo_url, location')
          .eq('is_approved', true)
          .order('name');

        if (!universitiesError && universitiesData) {
          setUniversities(universitiesData);
        }
      } catch (error) {
        console.warn('Could not load universities:', error);
      }
    };

    loadUniversities();
  }, []);

  // Universidades únicas dos estudantes (fallback)
  const studentUniversities = React.useMemo(() => {
    const uniqueUniversities = new Map<string, University>();
    students.forEach(student => {
      if (student.university_id && student.university_name) {
        uniqueUniversities.set(student.university_id, {
          id: student.university_id,
          name: student.university_name
        });
      }
    });
    console.log(students)
    return Array.from(uniqueUniversities.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  // Usar universidades carregadas da tabela, com fallback para as dos estudantes
  const availableUniversities = universities.length > 0 ? universities : studentUniversities;
  
  // Pagination constants
  const STUDENTS_PER_PAGE = 10;

  // Aplicar filtros e ordenação
  const getFilteredAndSortedStudents = React.useCallback(() => {
    let filtered = students.filter(student => {
      // Filtro por termo de busca
      if (filters.searchTerm && 
          !student.full_name?.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
          !student.email?.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filtro por universidade
      if (filters.universityFilter !== 'all' && student.university_id !== filters.universityFilter) {
        return false;
      }
      
      // Filtro por período
      if (filters.dateRange.start || filters.dateRange.end) {
        const studentDate = new Date(student.created_at);
        const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
        const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;
        
        if (startDate && studentDate < startDate) return false;
        if (endDate && studentDate > endDate) return false;
      }
      
      // Filtro por status
      if (filters.statusFilter !== 'all' && student.status !== filters.statusFilter) {
        return false;
      }
      
      // Filtro por pagamento
      if (filters.paymentFilter !== 'all') {
        switch (filters.paymentFilter) {
          case 'paid':
            if (student.total_paid <= 0) return false;
            break;
          case 'unpaid':
            if (student.total_paid > 0) return false;
            break;
          case 'high_value':
            if (student.total_paid < 1000) return false; // $1000+
            break;
        }
      }
      
      return true;
    });

    // Aplicar ordenação
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (filters.sortBy) {
        case 'revenue':
          aValue = a.total_paid || 0;
          bValue = b.total_paid || 0;
          break;
        case 'name':
          aValue = a.full_name || '';
          bValue = b.full_name || '';
          break;
        case 'date':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [students, filters]);

  const filteredStudents = getFilteredAndSortedStudents();

  // Pagination calculations
  const totalStudents = filteredStudents.length;
  const totalPages = Math.ceil(totalStudents / STUDENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE;
  const endIndex = startIndex + STUDENTS_PER_PAGE;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Resetar filtros
  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      universityFilter: 'all',
      dateRange: { start: '', end: '' },
      statusFilter: 'all',
      paymentFilter: 'all',
      sortBy: 'date',
      sortOrder: 'desc'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  // Estatísticas calculadas dinamicamente
  const stats = React.useMemo(() => {
    const totalRevenue = filteredStudents.reduce((sum, student) => sum + (student.total_paid || 0), 0);
    const activeStudents = filteredStudents.filter(s => 
      s.status === 'active' || s.status === 'registered' || s.status === 'enrolled'
    ).length;
    const avgRevenuePerStudent = filteredStudents.length > 0 ? totalRevenue / filteredStudents.length : 0;
    const topPerformingUniversity = availableUniversities.length > 0 ? availableUniversities[0]?.name : 'N/A';

    return {
      totalRevenue,
      activeStudents,
      avgRevenuePerStudent,
      topPerformingUniversity
    };
  }, [filteredStudents, availableUniversities]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="mt-1 text-sm text-slate-600">
            Track the students you have referenced
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="bg-[#3B82F6] hover:bg-[#365d9b] text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Students</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{filteredStudents.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Students</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{stats.activeStudents}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Revenue</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Avg. Revenue/Student</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{formatCurrency(stats.avgRevenuePerStudent)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 flex items-center gap-2 ${
                showAdvancedFilters 
                  ? 'bg-[#05294E] text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FilterIcon className="h-4 w-4" />
              Advanced
            </button>
          </div>
        </div>

        {/* Filtros Avançados Expandidos */}
        {showAdvancedFilters && (
          <div className="border-t border-slate-200 pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtro por Universidade */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">University</label>
                <select
                  value={filters.universityFilter}
                  onChange={(e) => setFilters(prev => ({ ...prev, universityFilter: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                >
                  <option value="all">All Universities</option>
                  {availableUniversities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Período - Data Inicial */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                />
              </div>

              {/* Filtro por Período - Data Final */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                />
              </div>

              {/* Filtro por Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  value={filters.statusFilter}
                  onChange={(e) => setFilters(prev => ({ ...prev, statusFilter: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="registered">Registered</option>
                  <option value="enrolled">Enrolled</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="dropped">Dropped</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Segunda linha de filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro por Pagamento */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Status</label>
                <select
                  value={filters.paymentFilter}
                  onChange={(e) => setFilters(prev => ({ ...prev, paymentFilter: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                >
                  <option value="all">All Payments</option>
                  <option value="paid">Has Paid</option>
                  <option value="unpaid">No Payments</option>
                  <option value="high_value">High Value ($1000+)</option>
                </select>
              </div>

              {/* Ordenação */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                >
                  <option value="date">Registration Date</option>
                  <option value="revenue">Revenue</option>
                  <option value="name">Name</option>
                  <option value="status">Status</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Order</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, sortOrder: 'desc' }))}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                      filters.sortOrder === 'desc' 
                        ? 'bg-[#05294E] text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <TrendingDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, sortOrder: 'asc' }))}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                      filters.sortOrder === 'asc' 
                        ? 'bg-[#05294E] text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <TrendingUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Botão de reset */}
            <div className="flex justify-start">
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center text-sm text-slate-600">
            <span className="font-medium">{filteredStudents.length}</span>
            <span className="ml-1">student{filteredStudents.length !== 1 ? 's' : ''} found</span>
            {showAdvancedFilters && (
              <span className="ml-4 text-slate-500">
                • Sorted by {filters.sortBy === 'revenue' ? 'revenue' : 
                  filters.sortBy === 'name' ? 'name' : 
                  filters.sortBy === 'status' ? 'status' : 'registration date'}
              </span>
            )}
          </div>
          {totalPages > 1 && (
            <div className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </div>
          )}
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {paginatedStudents.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {paginatedStudents.map((student, index) => (
              <div 
                key={`${student.id}-${index}`}
                className="p-6 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => onViewStudent({id: student.id, profile_id: student.profile_id})}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <span className="text-lg font-medium text-blue-600">
                        {student.full_name?.charAt(0)?.toUpperCase() || 'S'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {student.full_name || 'Name not provided'}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                        <div className="flex items-center text-sm text-slate-500">
                          <Mail className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{student.email}</span>
                        </div>
                        {student.country && (
                          <div className="flex items-center text-sm text-slate-500">
                            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{student.country}</span>
                          </div>
                        )}
                        <div className="flex items-center text-sm text-slate-500">
                          <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{formatDate(student.created_at)}</span>
                        </div>
                        {student.university_name && (
                          <div className="flex items-center text-sm text-slate-500">
                            <Building className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{student.university_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      student.status === 'active' || student.status === 'registered' || student.status === 'enrolled' || student.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : student.status === 'pending' || student.status === 'processing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : student.status === 'dropped' || student.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {student.status === 'active' ? 'Active' :
                       student.status === 'registered' ? 'Registered' : 
                       student.status === 'enrolled' ? 'Enrolled' :
                       student.status === 'completed' ? 'Completed' :
                       student.status === 'pending' ? 'Pending' :
                       student.status === 'processing' ? 'Processing' :
                       student.status === 'dropped' ? 'Dropped' : 
                       student.status === 'cancelled' ? 'Cancelled' :
                       student.status || 'Unknown'}
                    </span>
                    
                    <div className="flex items-center text-sm font-medium text-green-600">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {formatCurrency(student.total_paid)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <GraduationCap className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {filters.searchTerm || filters.universityFilter !== 'all' || filters.statusFilter !== 'all' ? 'No students found' : 'No referenced students yet'}
            </h3>
            <p className="text-slate-500">
              {filters.searchTerm || filters.universityFilter !== 'all' || filters.statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Share your referral code to get started!'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200">
            {/* Page information centered */}
            <div className="flex items-center justify-center mb-4">
              <div className="text-sm text-slate-500">
                Page {currentPage} of {totalPages}
              </div>
            </div>
            
            {/* Navigation controls centered */}
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="inline-flex items-center px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
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
                      onClick={() => goToPage(pageNumber)}
                      className={`inline-flex items-center px-3 py-1 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#05294E] ${
                        currentPage === pageNumber
                          ? 'border-[#05294E] bg-[#05294E] text-white'
                          : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="px-2 text-slate-500">...</span>
                    <button
                      onClick={() => goToPage(totalPages)}
                      className="inline-flex items-center px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#05294E]"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="inline-flex items-center px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#05294E] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyStudents;
