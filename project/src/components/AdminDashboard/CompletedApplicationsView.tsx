import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Building, 
  User, 
  Mail,
  Search,
  CheckCircle,
  Award,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useStudentsQuery, useFilterDataQuery } from './hooks/useStudentApplicationsQueries';
import RefreshButton from '../RefreshButton';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

interface StudentRecord {
  student_id: string;
  user_id: string;
  student_name: string;
  student_email: string;
  student_created_at: string;
  has_paid_selection_process_fee: boolean;
  has_paid_i20_control_fee: boolean;
  seller_referral_code: string | null;
  application_id: string | null;
  scholarship_id: string | null;
  status: string | null;
  application_status: string | null;
  applied_at: string | null;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  acceptance_letter_status: string | null;
  payment_status: string | null;
  student_process_type: string | null;
  transfer_form_status: string | null;
  scholarship_title: string | null;
  university_name: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  is_locked: boolean;
  total_applications: number;
  all_applications: any[];
  most_recent_activity?: Date;
  completed_at?: string;
}

const CompletedApplicationsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtros específicos
  const [scholarshipFilter, setScholarshipFilter] = useState('all');
  const [universityFilter, setUniversityFilter] = useState('all');
  const [affiliateFilter, setAffiliateFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState<dayjs.Dayjs | null>(null);
  const [endDateFilter, setEndDateFilter] = useState<dayjs.Dayjs | null>(null);
  const [completionStartDate, setCompletionStartDate] = useState<dayjs.Dayjs | null>(null);
  const [completionEndDate, setCompletionEndDate] = useState<dayjs.Dayjs | null>(null);
  const [onlyBlackCouponUsers, setOnlyBlackCouponUsers] = useState(false);
  const [blackCouponUsers, setBlackCouponUsers] = useState<Set<string>>(new Set());

  // React Query Hooks
  const studentsQuery = useStudentsQuery();
  const filterDataQuery = useFilterDataQuery();

  // Extrair dados dos queries
  const allStudents = studentsQuery.data || [];
  const loading = studentsQuery.isLoading;
  const affiliates = filterDataQuery.data?.affiliates || [];
  const scholarships = filterDataQuery.data?.scholarships || [];
  const universities = filterDataQuery.data?.universities || [];

  // Filtrar apenas estudantes completados (enrolled)
  const completedStudents = allStudents.filter((student: StudentRecord) => {
    return student.application_status === 'enrolled';
  });

  // Evitar mostrar usuários de teste em produção
  const isProductionHost = typeof window !== 'undefined' && window.location.origin === 'https://matriculausa.com';

  // Função para refresh de todos os dados
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        studentsQuery.refetch(),
        filterDataQuery.refetch(),
      ]);
      
      // Recarregar dados de cupom BLACK após refresh
      const { data } = await supabase
        .from('promotional_coupon_usage')
        .select('user_id, coupon_code')
        .ilike('coupon_code', 'BLACK');
      
      if (data) {
        const userIds = new Set<string>();
        data.forEach((row: any) => {
          if (row.user_id) {
            userIds.add(row.user_id);
          }
        });
        setBlackCouponUsers(userIds);
      }
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  };

  // Carregar estudantes que usaram cupom BLACK
  useEffect(() => {
    const loadBlackCouponUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('promotional_coupon_usage')
          .select('user_id, coupon_code')
          .ilike('coupon_code', 'BLACK');

        if (error) {
          console.error('Error loading BLACK coupon users:', error);
          return;
        }

        const userIds = new Set<string>();
        (data || []).forEach((row: any) => {
          if (row.user_id) {
            userIds.add(row.user_id);
          }
        });
        
        setBlackCouponUsers(userIds);
      } catch (e) {
        console.error('Unexpected error loading BLACK coupon users:', e);
      }
    };

    loadBlackCouponUsers();
  }, [allStudents]);

  // Chave para localStorage
  const FILTERS_STORAGE_KEY = 'admin_completed_filters';

  // Função para salvar filtros no localStorage
  const saveFiltersToStorage = () => {
    const filters = {
      searchTerm,
      scholarshipFilter,
      universityFilter,
      affiliateFilter,
      startDateFilter: startDateFilter?.toISOString() || null,
      endDateFilter: endDateFilter?.toISOString() || null,
      completionStartDate: completionStartDate?.toISOString() || null,
      completionEndDate: completionEndDate?.toISOString() || null,
      onlyBlackCouponUsers,
      currentPage
    };
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  };

  // Função para carregar filtros do localStorage
  const loadFiltersFromStorage = () => {
    try {
      const savedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (savedFilters) {
        const filters = JSON.parse(savedFilters);
        setSearchTerm(filters.searchTerm || '');
        setScholarshipFilter(filters.scholarshipFilter || 'all');
        setUniversityFilter(filters.universityFilter || 'all');
        setAffiliateFilter(filters.affiliateFilter || 'all');
        setStartDateFilter(filters.startDateFilter ? dayjs(filters.startDateFilter) : null);
        setEndDateFilter(filters.endDateFilter ? dayjs(filters.endDateFilter) : null);
        setCompletionStartDate(filters.completionStartDate ? dayjs(filters.completionStartDate) : null);
        setCompletionEndDate(filters.completionEndDate ? dayjs(filters.completionEndDate) : null);
        setOnlyBlackCouponUsers(filters.onlyBlackCouponUsers || false);
        setCurrentPage(filters.currentPage || 1);
      }
    } catch (error) {
      console.error('Error loading filters from localStorage:', error);
    }
  };

  // Função para limpar filtros salvos
  const clearSavedFilters = () => {
    localStorage.removeItem(FILTERS_STORAGE_KEY);
    setSearchTerm('');
    setScholarshipFilter('all');
    setUniversityFilter('all');
    setAffiliateFilter('all');
    setStartDateFilter(null);
    setEndDateFilter(null);
    setCompletionStartDate(null);
    setCompletionEndDate(null);
    setOnlyBlackCouponUsers(false);
    setCurrentPage(1);
  };

  useEffect(() => {
    loadFiltersFromStorage();
  }, []);

  // Salvar filtros no localStorage sempre que mudarem
  useEffect(() => {
    saveFiltersToStorage();
  }, [
    searchTerm,
    scholarshipFilter,
    universityFilter,
    affiliateFilter,
    startDateFilter,
    endDateFilter,
    completionStartDate,
    completionEndDate,
    onlyBlackCouponUsers,
    currentPage
  ]);

  const filteredStudents = completedStudents.filter((student: StudentRecord) => {
    // Em produção, ocultar usuários de teste com email contendo "uorak"
    if (isProductionHost && (student.student_email || '').toLowerCase().includes('uorak')) {
      return false;
    }

    // Filtro de busca
    const matchesSearch = 
      student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.scholarship_title && student.scholarship_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.university_name && student.university_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filtro por bolsa
    const matchesScholarship = scholarshipFilter === 'all' || 
      (student.scholarship_id && student.scholarship_id === scholarshipFilter);
    
    // Filtro por universidade
    const matchesUniversity = universityFilter === 'all' || 
      (student.university_name && student.university_name.toLowerCase().includes(universityFilter.toLowerCase()));
    
    // Filtro por affiliate admin
    const matchesAffiliate = affiliateFilter === 'all' || (() => {
      if (!student.seller_referral_code) {
        return affiliateFilter === 'all';
      }
      
      let affiliate = affiliates.find(aff => aff.referral_code === student.seller_referral_code);
      
      if (!affiliate) {
        affiliate = affiliates.find(aff => 
          aff.sellers?.some((seller: any) => seller.referral_code === student.seller_referral_code)
        );
      }
      
      return affiliate && affiliate.id === affiliateFilter;
    })();
    
    // Filtro por data de início do processo (quando foi feito)
    const matchesStartDate = (() => {
      if (!startDateFilter && !endDateFilter) return true;
      
      const studentDate = dayjs(student.student_created_at);
      
      if (startDateFilter && endDateFilter) {
        return studentDate.isAfter(startDateFilter.subtract(1, 'day')) && 
               studentDate.isBefore(endDateFilter.add(1, 'day'));
      }
      
      if (startDateFilter) {
        return studentDate.isAfter(startDateFilter.subtract(1, 'day'));
      }
      
      if (endDateFilter) {
        return studentDate.isBefore(endDateFilter.add(1, 'day'));
      }
      
      return true;
    })();
    
    // Filtro por data de conclusão (quando foi concluído)
    const matchesCompletionDate = (() => {
      if (!completionStartDate && !completionEndDate) return true;
      
      // Buscar a data de conclusão na última atividade ou reviewed_at
      const completionDate = student.most_recent_activity || new Date(student.reviewed_at || student.student_created_at);
      const completionDayjs = dayjs(completionDate);
      
      if (completionStartDate && completionEndDate) {
        return completionDayjs.isAfter(completionStartDate.subtract(1, 'day')) && 
               completionDayjs.isBefore(completionEndDate.add(1, 'day'));
      }
      
      if (completionStartDate) {
        return completionDayjs.isAfter(completionStartDate.subtract(1, 'day'));
      }
      
      if (completionEndDate) {
        return completionDayjs.isBefore(completionEndDate.add(1, 'day'));
      }
      
      return true;
    })();
    
    // Filtro para mostrar apenas usuários que usaram cupom BLACK
    const matchesBlackCoupon = !onlyBlackCouponUsers || blackCouponUsers.has(student.user_id);
    
    return matchesSearch && matchesScholarship && matchesUniversity && 
           matchesAffiliate && matchesStartDate && matchesCompletionDate && matchesBlackCoupon;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <CheckCircle className="h-8 w-8 mr-3 text-green-600" />
            Completed Enrollments
          </h2>
          <p className="text-gray-600 mt-1">Students who have successfully completed their enrollment process</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {filteredStudents.length} completed enrollment{filteredStudents.length !== 1 ? 's' : ''}
          </span>
          <RefreshButton
            onClick={handleRefresh}
            isRefreshing={isRefreshing}
            title="Refresh completed enrollments data"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {/* Primeira linha - Busca */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by student name, email, scholarship, or university..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                />
              </div>
            </div>
          </div>
          
          {/* Segunda linha - Filtros principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Filtro por Bolsa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scholarship</label>
              <select
                value={scholarshipFilter}
                onChange={(e) => setScholarshipFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] text-sm"
              >
                <option value="all">All Scholarships</option>
                {scholarships.map((scholarship) => (
                  <option key={scholarship.id} value={scholarship.id}>
                    {scholarship.title}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Filtro por Universidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">University</label>
              <select
                value={universityFilter}
                onChange={(e) => setUniversityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] text-sm"
              >
                <option value="all">All Universities</option>
                {universities.map((university) => (
                  <option key={university.id} value={university.name}>
                    {university.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Filtro por Admin Affiliate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Affiliate Admin</label>
              <select
                value={affiliateFilter}
                onChange={(e) => setAffiliateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] text-sm"
              >
                <option value="all">All Affiliates</option>
                {affiliates.map((affiliate) => (
                  <option key={affiliate.id} value={affiliate.id}>
                    {affiliate.name || affiliate.email || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Terceira linha - Filtros de data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Filtro por Data de Início do Processo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Process Start Date</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      value={startDateFilter}
                      onChange={(newValue) => setStartDateFilter(newValue as dayjs.Dayjs | null)}
                      slotProps={{
                        textField: {
                          size: 'small',
                          placeholder: 'Select start date',
                          sx: {
                            '& .MuiOutlinedInput-root': {
                              fontSize: '0.875rem',
                              height: '40px',
                              borderRadius: '0.5rem',
                              backgroundColor: 'white',
                              '& fieldset': {
                                borderColor: '#d1d5db',
                                borderWidth: '1px',
                              },
                              '&:hover fieldset': {
                                borderColor: '#05294E',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#05294E',
                                borderWidth: '2px',
                                boxShadow: '0 0 0 3px rgba(5, 41, 78, 0.1)',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              display: 'none',
                            },
                          }
                        }
                      }}
                    />
                  </LocalizationProvider>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      value={endDateFilter}
                      onChange={(newValue) => setEndDateFilter(newValue as dayjs.Dayjs | null)}
                      slotProps={{
                        textField: {
                          size: 'small',
                          placeholder: 'Select end date',
                          sx: {
                            '& .MuiOutlinedInput-root': {
                              fontSize: '0.875rem',
                              height: '40px',
                              borderRadius: '0.5rem',
                              backgroundColor: 'white',
                              '& fieldset': {
                                borderColor: '#d1d5db',
                                borderWidth: '1px',
                              },
                              '&:hover fieldset': {
                                borderColor: '#05294E',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#05294E',
                                borderWidth: '2px',
                                boxShadow: '0 0 0 3px rgba(5, 41, 78, 0.1)',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              display: 'none',
                            },
                          }
                        }
                      }}
                    />
                  </LocalizationProvider>
                </div>
              </div>
            </div>
            
            {/* Filtro por Data de Conclusão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Completion Date</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      value={completionStartDate}
                      onChange={(newValue) => setCompletionStartDate(newValue as dayjs.Dayjs | null)}
                      slotProps={{
                        textField: {
                          size: 'small',
                          placeholder: 'Select start date',
                          sx: {
                            '& .MuiOutlinedInput-root': {
                              fontSize: '0.875rem',
                              height: '40px',
                              borderRadius: '0.5rem',
                              backgroundColor: 'white',
                              '& fieldset': {
                                borderColor: '#d1d5db',
                                borderWidth: '1px',
                              },
                              '&:hover fieldset': {
                                borderColor: '#05294E',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#05294E',
                                borderWidth: '2px',
                                boxShadow: '0 0 0 3px rgba(5, 41, 78, 0.1)',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              display: 'none',
                            },
                          }
                        }
                      }}
                    />
                  </LocalizationProvider>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      value={completionEndDate}
                      onChange={(newValue) => setCompletionEndDate(newValue as dayjs.Dayjs | null)}
                      slotProps={{
                        textField: {
                          size: 'small',
                          placeholder: 'Select end date',
                          sx: {
                            '& .MuiOutlinedInput-root': {
                              fontSize: '0.875rem',
                              height: '40px',
                              borderRadius: '0.5rem',
                              backgroundColor: 'white',
                              '& fieldset': {
                                borderColor: '#d1d5db',
                                borderWidth: '1px',
                              },
                              '&:hover fieldset': {
                                borderColor: '#05294E',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#05294E',
                                borderWidth: '2px',
                                boxShadow: '0 0 0 3px rgba(5, 41, 78, 0.1)',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              display: 'none',
                            },
                          }
                        }
                      }}
                    />
                  </LocalizationProvider>
                </div>
              </div>
            </div>
          </div>
          
          {/* Checkbox e botão de limpar filtros */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="onlyBlackCouponUsers"
                checked={onlyBlackCouponUsers}
                onChange={(e) => setOnlyBlackCouponUsers(e.target.checked)}
                className="h-4 w-4 text-[#05294E] focus:ring-[#05294E] border-gray-300 rounded"
              />
              <label htmlFor="onlyBlackCouponUsers" className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span>Show only students who used BLACK coupon</span>
              </label>
            </div>
            <button
              onClick={clearSavedFilters}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
              title="Clear all filters and reset to default"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      </div>

      {/* Completed Students List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-green-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Scholarship & University
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Process Started
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Completed On
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <CheckCircle className="h-12 w-12 mb-3 text-gray-300" />
                      <p className="text-lg font-medium">No completed enrollments found</p>
                      <p className="text-sm mt-1">Students who complete their enrollment will appear here</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentStudents.map((student) => (
                  <tr
                    key={student.student_id}
                    className="hover:bg-green-50 cursor-pointer transition-colors"
                    onClick={() => { window.location.href = `/admin/dashboard/students/${student.student_id}`; }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-green-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{student.student_name}</div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {student.student_email}
                          </div>
                          {blackCouponUsers.has(student.user_id) && (
                            <div className="flex items-center mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                <Sparkles className="h-3 w-3 mr-1" />
                                BLACK Coupon
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="flex items-center text-gray-900 font-medium">
                          <Award className="h-4 w-4 mr-1 text-[#05294E]" />
                          {student.scholarship_title || 'N/A'}
                        </div>
                        {student.university_name && (
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            <Building className="h-4 w-4 mr-1" />
                            {student.university_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(student.student_created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                        {student.most_recent_activity 
                          ? new Date(student.most_recent_activity).toLocaleDateString()
                          : new Date(student.reviewed_at || student.student_created_at).toLocaleDateString()
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Enrolled
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(startIndex + itemsPerPage, filteredStudents.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredStudents.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === page
                          ? 'z-10 bg-green-600 border-green-600 text-white'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompletedApplicationsView;
