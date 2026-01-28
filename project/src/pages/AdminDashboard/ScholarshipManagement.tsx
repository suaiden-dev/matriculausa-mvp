import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '@headlessui/react';
import { 
  Award, 
  Building, 
  Search, 
  Eye, 
  Users,
  CheckCircle,
  Clock,
  Zap,
  List,
  Grid3X3,
  X,
  AlertCircle,
  AlertTriangle,
  Edit,
  Power
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ScholarshipManagementProps {
  scholarships: any[];
  stats: {
    total: number;
    active: number;
    totalFunding: number;
  };
  onRefresh?: () => void;
}

const ScholarshipManagement: React.FC<ScholarshipManagementProps> = ({
  scholarships,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [universityFilter, setUniversityFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [deliveryModeFilter, setDeliveryModeFilter] = useState('all');
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'expired' | 'urgent' | '14days' | 'soon' | 'normal'>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'recent' | 'applicants' | 'views' | 'deadline'>('recent');
  // Estados do modal de detalhes
  const [selectedScholarship, setSelectedScholarship] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  // Estados para ativar/desativar
  const [statusConfirmationModal, setStatusConfirmationModal] = useState<{
    isOpen: boolean;
    scholarship: any;
    newStatus: boolean;
  } | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
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

  const handleEdit = (scholarshipId: string) => {
    navigate(`/admin/dashboard/scholarships/edit/${scholarshipId}`);
  };

  const handleToggleStatus = (scholarship: any) => {
    setStatusConfirmationModal({
      isOpen: true,
      scholarship,
      newStatus: !scholarship.is_active
    });
  };

  const confirmToggleStatus = async () => {
    if (!statusConfirmationModal) return;

    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('scholarships')
        .update({ is_active: statusConfirmationModal.newStatus })
        .eq('id', statusConfirmationModal.scholarship.id);

      if (error) throw error;

      // Recarregar dados
      if (onRefresh) {
        onRefresh();
      }

      setStatusConfirmationModal(null);
    } catch (error: any) {
      console.error('Error updating scholarship status:', error);
      alert(`Erro ao atualizar status: ${error.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const closeStatusModal = () => {
    setStatusConfirmationModal(null);
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

  // Funções de deadline - devem ser definidas antes de serem usadas
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
    if (days < 0) return { status: 'expired', color: 'text-red-600', bg: 'bg-red-50' };
    if (days <= 7) return { status: 'urgent', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (days <= 30) return { status: 'soon', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { status: 'normal', color: 'text-green-600', bg: 'bg-green-50' };
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
    
    const matchesDeliveryMode = deliveryModeFilter === 'all' || 
      scholarship.delivery_mode === deliveryModeFilter;
    
    // Filtrar por deadline
    const deadlineStatus = getDeadlineStatus(scholarship.deadline);
    const daysLeft = getDaysUntilDeadline(scholarship.deadline);
    let matchesDeadline = true;
    
    if (deadlineFilter !== 'all') {
      if (deadlineFilter === '14days') {
        // Filtro específico para 14 dias: mais de 7 dias e até 14 dias
        matchesDeadline = daysLeft > 7 && daysLeft <= 14;
      } else {
        matchesDeadline = deadlineStatus.status === deadlineFilter;
      }
    }
    
    // Filtrar por valor mínimo e máximo - usar annual_value_with_scholarship
    const scholarshipValue = scholarship.annual_value_with_scholarship || scholarship.amount || scholarship.scholarshipvalue || 0;
    
    // Converter valores de string para número, validando se são números válidos
    const minAmountValue = minAmount && minAmount.trim() !== '' ? parseFloat(minAmount) : null;
    const maxAmountValue = maxAmount && maxAmount.trim() !== '' ? parseFloat(maxAmount) : null;
    
    // Validar se os valores são números válidos (não NaN)
    const validMinAmount = minAmountValue !== null && !isNaN(minAmountValue) ? minAmountValue : null;
    const validMaxAmount = maxAmountValue !== null && !isNaN(maxAmountValue) ? maxAmountValue : null;
    
    const matchesMinAmount = validMinAmount === null || scholarshipValue >= validMinAmount;
    const matchesMaxAmount = validMaxAmount === null || scholarshipValue <= validMaxAmount;
    
    return matchesSearch && matchesStatus && matchesLevel && matchesUniversity && matchesCourse && 
           matchesDeliveryMode && matchesDeadline && matchesMinAmount && matchesMaxAmount;
  }).sort((a, b) => {
    // Ordenação baseada no filtro selecionado
    switch (sortBy) {
      case 'applicants':
        return (b.application_count || 0) - (a.application_count || 0);
      case 'views':
        return (b.cart_count || 0) - (a.cart_count || 0);
      case 'deadline':
        // Ordenar por deadline (mais próximo primeiro)
        const daysA = getDaysUntilDeadline(a.deadline);
        const daysB = getDaysUntilDeadline(b.deadline);
        // Expiradas primeiro, depois por dias restantes (menor primeiro)
        if (daysA < 0 && daysB >= 0) return -1;
        if (daysA >= 0 && daysB < 0) return 1;
        return daysA - daysB;
      case 'recent':
      default:
        // Ordenar por data de criação (mais recente primeiro)
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
  });

  // Lógica de paginação
  const totalPages = Math.ceil(filteredScholarships.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentScholarships = filteredScholarships.slice(startIndex, endIndex);

  // Reset para primeira página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, levelFilter, universityFilter, courseFilter, deliveryModeFilter, deadlineFilter, minAmount, maxAmount, sortBy]);

  // Calcular estatísticas de deadline
  const deadlineStats = React.useMemo(() => {
    const stats = {
      expired: 0,
      urgent: 0,
      soon: 0,
      normal: 0,
      total: scholarships.length
    };
    
    scholarships.forEach(scholarship => {
      const status = getDeadlineStatus(scholarship.deadline);
      if (status.status === 'expired') stats.expired++;
      else if (status.status === 'urgent') stats.urgent++;
      else if (status.status === 'soon') stats.soon++;
      else stats.normal++;
    });
    
    return stats;
  }, [scholarships]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
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
    <div className="space-y-6">
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

              <div className="min-w-[160px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Deadline</label>
                <select
                  value={deadlineFilter}
                  onChange={(e) => setDeadlineFilter(e.target.value as 'all' | 'expired' | 'urgent' | '14days' | 'soon' | 'normal')}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200 text-sm"
                  title="Filter by deadline status"
                >
                  <option value="all">All Deadlines</option>
                  <option value="expired">Expired</option>
                  <option value="urgent">Urgent (≤7 days)</option>
                  <option value="14days">14 Days</option>
                  <option value="soon">Soon (≤30 days)</option>
                  <option value="normal">Normal</option>
                </select>
              </div>

              <div className="min-w-[160px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'applicants' | 'views' | 'deadline')}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200 text-sm"
                  title="Sort scholarships"
                >
                  <option value="recent">Most Recent</option>
                  <option value="applicants">Most Applicants</option>
                  <option value="views">Most Views</option>
                  <option value="deadline">Deadline (Soonest First)</option>
                </select>
              </div>
            </div>

            {/* Delivery Mode and Amount Filters */}
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="min-w-[160px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Modality</label>
                <select
                  value={deliveryModeFilter}
                  onChange={(e) => setDeliveryModeFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200 text-sm"
                  title="Filter by course modality"
                >
                  <option value="all">All Modalities</option>
                  <option value="in_person">In-Person</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="online">Online</option>
                </select>
              </div>

              <div className="min-w-[140px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Min Amount ($)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200 text-sm"
                  title="Minimum scholarship amount"
                  min="0"
                  step="100"
                />
              </div>

              <div className="min-w-[140px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Max Amount ($)</label>
                <input
                  type="number"
                  placeholder="No limit"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200 text-sm"
                  title="Maximum scholarship amount"
                  min="0"
                  step="100"
                />
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

      {/* Alert for scholarships near expiration - between filters and table */}
      {(deadlineStats.urgent > 0 || deadlineStats.expired > 0) && (
        <div className={`rounded-lg shadow-sm border ${
          deadlineStats.urgent > 0 
            ? 'bg-orange-50 border-orange-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-3 p-3">
            <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${
              deadlineStats.urgent > 0 
                ? 'text-orange-600' 
                : 'text-red-600'
            }`} />
            <div className="flex-1 flex items-center justify-between">
              <div>
                <span className={`text-sm font-medium ${
                  deadlineStats.urgent > 0 
                    ? 'text-orange-900' 
                    : 'text-red-900'
                }`}>
                  {deadlineStats.urgent > 0 
                    ? `${deadlineStats.urgent} Urgent Scholarship${deadlineStats.urgent !== 1 ? 's' : ''} (≤7 days)`
                    : `${deadlineStats.expired} Expired Scholarship${deadlineStats.expired !== 1 ? 's' : ''}`
                  }
                </span>
                <span className={`text-xs ml-2 ${
                  deadlineStats.urgent > 0 
                    ? 'text-orange-700' 
                    : 'text-red-700'
                }`}>
                  {deadlineStats.urgent > 0 
                    ? 'Consider extending deadlines or updating information.'
                    : 'Consider updating deadlines or deactivating them.'
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                {deadlineStats.urgent > 0 && (
                  <button
                    onClick={() => setDeadlineFilter('urgent')}
                    className="px-3 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-xs font-medium"
                  >
                    View Urgent
                  </button>
                )}
                {deadlineStats.expired > 0 && (
                  <button
                    onClick={() => setDeadlineFilter('expired')}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs font-medium"
                  >
                    View Expired
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <div className={`p-3 rounded-xl border-2 ${deadlineInfo.bg} ${
                    deadlineInfo.status === 'expired' ? 'border-red-300' :
                    deadlineInfo.status === 'urgent' ? 'border-orange-300' :
                    deadlineInfo.status === 'soon' ? 'border-yellow-300' :
                    'border-green-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-slate-700">Application Deadline</p>
                          {deadlineInfo.status === 'urgent' && (
                            <AlertTriangle className="h-4 w-4 text-orange-600 animate-pulse" />
                          )}
                          {deadlineInfo.status === 'expired' && (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
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
                          <>
                            <p className="text-2xl font-bold text-red-600">Expired</p>
                            <p className="text-xs font-medium text-red-600">
                              {Math.abs(daysLeft)} day{Math.abs(daysLeft) !== 1 ? 's' : ''} ago
                            </p>
                          </>
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
                      <p className="text-lg font-bold text-slate-900">{scholarship.application_count || 0}</p>
                      <p className="text-xs text-slate-500">Applicants</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl text-center">
                      <Eye className="h-5 w-5 mx-auto mb-2 text-slate-500" />
                      <p className="text-lg font-bold text-slate-900">{scholarship.cart_count || 0}</p>
                      <p className="text-xs text-slate-500">Views</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 space-y-2">
                  <button
                    className="w-full bg-slate-100 text-slate-700 py-2.5 px-4 rounded-xl hover:bg-slate-200 transition-colors font-medium text-sm flex items-center justify-center"
                    onClick={() => {
                      setSelectedScholarship(scholarship);
                      setShowModal(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="bg-[#05294E] text-white py-2.5 px-4 rounded-xl hover:bg-[#05294E]/90 transition-colors font-medium text-sm flex items-center justify-center"
                      onClick={() => handleEdit(scholarship.id)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      className={`${scholarship.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'} py-2.5 px-4 rounded-xl transition-colors font-medium text-sm flex items-center justify-center`}
                      onClick={() => handleToggleStatus(scholarship)}
                    >
                      <Power className="h-4 w-4 mr-1" />
                      {scholarship.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
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
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">{new Date(scholarship.deadline).toLocaleDateString()}</span>
                      {(() => {
                        const deadlineInfo = getDeadlineStatus(scholarship.deadline);
                        const daysLeft = getDaysUntilDeadline(scholarship.deadline);
                        return (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            deadlineInfo.status === 'expired' ? 'bg-red-100 text-red-700' :
                            deadlineInfo.status === 'urgent' ? 'bg-orange-100 text-orange-700' :
                            deadlineInfo.status === 'soon' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button 
                        className="bg-slate-100 text-slate-700 py-1 px-3 rounded-lg hover:bg-slate-200 transition-colors text-xs font-medium flex items-center" 
                        title="View details"
                        onClick={() => {
                          setSelectedScholarship(scholarship);
                          setShowModal(true);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </button>
                      <button 
                        className="bg-[#05294E] text-white py-1 px-3 rounded-lg hover:bg-[#05294E]/90 transition-colors text-xs font-medium flex items-center" 
                        title="Edit scholarship"
                        onClick={() => handleEdit(scholarship.id)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </button>
                      <button 
                        className={`${scholarship.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'} py-1 px-3 rounded-lg transition-colors text-xs font-medium flex items-center`}
                        title={scholarship.is_active ? 'Deactivate scholarship' : 'Activate scholarship'}
                        onClick={() => handleToggleStatus(scholarship)}
                      >
                        <Power className="h-3 w-3 mr-1" />
                        {scholarship.is_active ? 'Off' : 'On'}
                      </button>
                    </div>
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

      {/* Details Modal */}
      {showModal && selectedScholarship && (
        <Dialog open={showModal} onClose={closeModal} className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-30" />
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-auto p-6 z-50 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-2xl font-bold text-gray-900">
                  {selectedScholarship.title}
                </Dialog.Title>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                  <p className="text-gray-900">{selectedScholarship.description || 'No description provided'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">University</h3>
                    <p className="text-gray-900">{selectedScholarship.universities?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Level</h3>
                    <p className="text-gray-900 capitalize">{selectedScholarship.level}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Field of Study</h3>
                    <p className="text-gray-900">{selectedScholarship.field_of_study || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Deadline</h3>
                    <p className="text-gray-900">{(() => {
                      // Parse da data como local para evitar problemas de timezone
                      const [year, month, day] = selectedScholarship.deadline.split('-').map(Number);
                      const deadlineDate = new Date(year, month - 1, day);
                      return deadlineDate.toLocaleDateString();
                    })()}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Annual Value</h3>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(Number(selectedScholarship.annual_value_with_scholarship ?? 0))}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedScholarship.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {selectedScholarship.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Internal Fees Section */}
                {(() => {
                  let fees: any[] = [];
                  if (Array.isArray(selectedScholarship.internal_fees)) {
                    fees = selectedScholarship.internal_fees;
                  } else if (typeof selectedScholarship.internal_fees === 'string') {
                    try {
                      fees = JSON.parse(selectedScholarship.internal_fees);
                    } catch (e) {
                      fees = [];
                    }
                  }
                  
                  if (fees && fees.length > 0) {
                    return (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">University Internal Fees</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {fees.map((fee: any, idx: number) => (
                            <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-slate-900 text-sm">{fee.category || fee.name}</p>
                                  <p className="text-xs text-slate-500">{fee.details || fee.frequency}</p>
                                </div>
                                <span className="font-semibold text-[#05294E] text-sm whitespace-nowrap ml-2">
                                  {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                    minimumFractionDigits: 2
                                  }).format(Number(fee.amount || 0))}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {selectedScholarship.requirements && selectedScholarship.requirements.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Requirements</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-900">
                      {selectedScholarship.requirements.map((req: string, index: number) => (
                        <li key={index}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedScholarship.eligibility && selectedScholarship.eligibility.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Eligibility</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-900">
                      {selectedScholarship.eligibility.map((item: string, index: number) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedScholarship.benefits && selectedScholarship.benefits.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Benefits</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-900">
                      {selectedScholarship.benefits.map((benefit: string, index: number) => (
                        <li key={index}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex space-x-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      closeModal();
                      handleEdit(selectedScholarship.id);
                    }}
                    className="flex-1 bg-[#05294E] text-white py-2 px-4 rounded-lg hover:bg-[#05294E]/90 transition-colors font-medium"
                  >
                    <Edit className="h-4 w-4 inline-block mr-2" />
                    Edit Scholarship
                  </button>
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Status Confirmation Modal */}
      {statusConfirmationModal && (
        <Dialog open={statusConfirmationModal.isOpen} onClose={closeStatusModal} className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-30" />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-auto p-6 z-50">
              <div className="flex items-center mb-4">
                <div className={`p-2 rounded-lg ${
                  statusConfirmationModal.newStatus ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {statusConfirmationModal.newStatus ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <Dialog.Title className="text-xl font-bold ml-3 text-gray-900">
                  {statusConfirmationModal.newStatus ? 'Activate Scholarship' : 'Deactivate Scholarship'}
                </Dialog.Title>
              </div>
              
              <p className="text-gray-600 mb-6">
                {statusConfirmationModal.newStatus 
                  ? `Are you sure you want to activate "${statusConfirmationModal.scholarship.title}"? This will make it visible to students.`
                  : `Are you sure you want to deactivate "${statusConfirmationModal.scholarship.title}"? This will hide it from students.`
                }
              </p>

              <div className="flex space-x-3 justify-end">
                <button
                  onClick={closeStatusModal}
                  disabled={updatingStatus}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmToggleStatus}
                  disabled={updatingStatus}
                  className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    statusConfirmationModal.newStatus 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {updatingStatus ? (
                    <>
                      <Clock className="animate-spin h-4 w-4 inline-block mr-2" />
                      Updating...
                    </>
                  ) : (
                    statusConfirmationModal.newStatus ? 'Activate' : 'Deactivate'
                  )}
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default ScholarshipManagement;