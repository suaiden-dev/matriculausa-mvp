import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Award, 
  Building, 
  DollarSign, 
  Clock, 
  CheckCircle,
  ArrowRight,
  GraduationCap,
  Users,
  List,
  LayoutGrid,
  Monitor,
  MapPin,
  Briefcase,
  Globe
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

import { useCartStore } from '../../stores/applicationStore';
import { motion, AnimatePresence } from 'framer-motion';
import ScholarshipDetailModal from '../../components/ScholarshipDetailModal';

interface ScholarshipBrowserProps {
  scholarships: any[];
  applications: any[];
}

const ScholarshipBrowser: React.FC<ScholarshipBrowserProps> = ({
  scholarships,
  applications
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedField, setSelectedField] = useState('all');
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState('all');
  const [selectedWorkPermission, setSelectedWorkPermission] = useState('all');
  const [sortBy] = useState('deadline');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { userProfile, user, refetchUserProfile } = useAuth();
  const { cart, addToCart, removeFromCart } = useCartStore();
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('');
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  // Estados para filtros aplicados (separados dos valores dos campos)
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedLevel, setAppliedLevel] = useState('all');
  const [appliedField, setAppliedField] = useState('all');
  const [appliedDeliveryMode, setAppliedDeliveryMode] = useState('all');
  const [appliedWorkPermission, setAppliedWorkPermission] = useState('all');
  const [appliedMinValue, setAppliedMinValue] = useState('');
  const [appliedMaxValue, setAppliedMaxValue] = useState('');
  const [appliedDeadlineDays, setAppliedDeadlineDays] = useState('');

  // Função para aplicar filtros manualmente
  const applyFilters = (e?: React.MouseEvent) => {
    // Prevenir qualquer comportamento padrão
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setIsApplyingFilters(true);
    
    // Aplicar todos os filtros de uma vez
    setAppliedSearch(searchTerm.trim());
    setAppliedLevel(selectedLevel);
    setAppliedField(selectedField);
    setAppliedDeliveryMode(selectedDeliveryMode);
    setAppliedWorkPermission(selectedWorkPermission);
    setAppliedMinValue(minValue.trim());
    setAppliedMaxValue(maxValue.trim());
    setAppliedDeadlineDays(deadlineDays.trim());
    
    setFiltersApplied(true);
    
    // Feedback visual
    setTimeout(() => {
      setFiltersApplied(false);
      setIsApplyingFilters(false);
    }, 1500);
  };

  // Função para limpar todos os filtros
  const clearAllFilters = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Limpar valores dos campos
    setSearchTerm('');
    setSelectedLevel('all');
    setSelectedField('all');
    setSelectedDeliveryMode('all');
    setSelectedWorkPermission('all');
    setMinValue('');
    setMaxValue('');
    setDeadlineDays('');
    
    // Limpar filtros aplicados
    setAppliedSearch('');
    setAppliedLevel('all');
    setAppliedField('all');
    setAppliedDeliveryMode('all');
    setAppliedWorkPermission('all');
    setAppliedMinValue('');
    setAppliedMaxValue('');
    setAppliedDeadlineDays('');
    
    setFiltersApplied(false);
    setIsApplyingFilters(false);
    localStorage.removeItem('scholarshipFilters');
    
  };



  // Salvar filtros no localStorage quando mudarem
  useEffect(() => {
    const filters = {
      // Valores dos campos
      searchTerm,
      selectedLevel,
      selectedField,
      selectedDeliveryMode,
      selectedWorkPermission,
      minValue,
      maxValue,
      deadlineDays,
      // Filtros aplicados
      appliedSearch,
      appliedLevel,
      appliedField,
      appliedDeliveryMode,
      appliedWorkPermission,
      appliedMinValue,
      appliedMaxValue,
      appliedDeadlineDays
    };
    localStorage.setItem('scholarshipFilters', JSON.stringify(filters));
  }, [searchTerm, selectedLevel, selectedField, selectedDeliveryMode, selectedWorkPermission, minValue, maxValue, deadlineDays, appliedSearch, appliedLevel, appliedField, appliedDeliveryMode, appliedWorkPermission, appliedMinValue, appliedMaxValue, appliedDeadlineDays]);

  // Restaurar filtros do localStorage ao carregar
  useEffect(() => {
    const savedFilters = localStorage.getItem('scholarshipFilters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        // Restaurar valores dos campos
        if (filters.searchTerm) setSearchTerm(filters.searchTerm);
        if (filters.selectedLevel) setSelectedLevel(filters.selectedLevel);
        if (filters.selectedField) setSelectedField(filters.selectedField);
        if (filters.selectedDeliveryMode) setSelectedDeliveryMode(filters.selectedDeliveryMode);
        if (filters.selectedWorkPermission) setSelectedWorkPermission(filters.selectedWorkPermission);
        if (filters.minValue) setMinValue(filters.minValue);
        if (filters.maxValue) setMaxValue(filters.maxValue);
        if (filters.deadlineDays) setDeadlineDays(filters.deadlineDays);
        
        // Restaurar filtros aplicados
        if (filters.appliedSearch !== undefined) setAppliedSearch(filters.appliedSearch);
        if (filters.appliedLevel) setAppliedLevel(filters.appliedLevel);
        if (filters.appliedField) setAppliedField(filters.appliedField);
        if (filters.appliedDeliveryMode) setAppliedDeliveryMode(filters.appliedDeliveryMode);
        if (filters.appliedWorkPermission) setAppliedWorkPermission(filters.appliedWorkPermission);
        if (filters.appliedMinValue !== undefined) setAppliedMinValue(filters.appliedMinValue);
        if (filters.appliedMaxValue !== undefined) setAppliedMaxValue(filters.appliedMaxValue);
        if (filters.appliedDeadlineDays !== undefined) setAppliedDeadlineDays(filters.appliedDeadlineDays);
      } catch (error) {
        console.log('Error loading saved filters:', error);
      }
    }
  }, []);


  // Remova o flyAnimation antigo e use Framer Motion
  const [flyingCard, setFlyingCard] = useState<null | { card: any, from: DOMRect, to: DOMRect }>(null);
  const [animating, setAnimating] = useState(false);
  
  // Estados para o modal de detalhes
  const [selectedScholarshipForModal, setSelectedScholarshipForModal] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Refs para os cards de bolsas (não podem estar dentro do loop)
  const scholarshipRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Remover reload automático após pagamento
  // useEffect(() => {
  //   if (!localStorage.getItem('scholarship_browser_refreshed')) {
  //     localStorage.setItem('scholarship_browser_refreshed', 'true');
  //     window.location.reload();
  //   }
  // }, []);

  // Polling para atualizar o perfil do usuário apenas enquanto o pagamento está pendente
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (userProfile && !userProfile.has_paid_selection_process_fee) {
      interval = setInterval(() => {
        refetchUserProfile && refetchUserProfile();
      }, 3000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [refetchUserProfile, userProfile]);

  // Refetch imediato após pagamento do selection process fee
  useEffect(() => {
    if (userProfile && userProfile.has_paid_selection_process_fee) {
      refetchUserProfile && refetchUserProfile();
      // Aqui você pode também refazer o fetch das applications, se necessário
    }
  }, [userProfile?.has_paid_selection_process_fee, refetchUserProfile]);

  const formatAmount = (amount: any) => {
    if (typeof amount === 'string') return amount;
    if (typeof amount === 'number') return amount.toLocaleString('en-US');
    return amount;
  };

  const getFieldBadgeColor = (field: string | undefined) => {
    switch (field?.toLowerCase()) {
      case 'stem':
        return 'bg-gradient-to-r from-blue-600 to-indigo-600';
      case 'business':
        return 'bg-gradient-to-r from-green-600 to-emerald-600';
      case 'engineering':
        return 'bg-gradient-to-r from-purple-600 to-violet-600';
      case 'arts':
        return 'bg-gradient-to-r from-pink-600 to-rose-600';
      case 'medicine':
        return 'bg-gradient-to-r from-red-600 to-pink-600';
      case 'law':
        return 'bg-gradient-to-r from-amber-600 to-orange-600';
      default:
        return 'bg-gradient-to-r from-slate-600 to-slate-700';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'undergraduate':
        return <GraduationCap className="h-4 w-4" />;
      case 'graduate':
        return <Users className="h-4 w-4" />;
      case 'doctorate':
        return <Award className="h-4 w-4" />;
      default:
        return <GraduationCap className="h-4 w-4" />;
    }
  };

  const getDeliveryModeIcon = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'online':
        return <Monitor className="h-3 w-3" />;
      case 'in_person':
        return <Building className="h-3 w-3" />;
      case 'hybrid':
        return <Globe className="h-3 w-3" />;
      default:
        return <MapPin className="h-3 w-3" />;
    }
  };

  const getDeliveryModeColor = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'online':
        return 'bg-blue-100 text-blue-700';
      case 'in_person':
        return 'bg-green-100 text-green-700';
      case 'hybrid':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getDeliveryModeLabel = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'online':
        return 'Online';
      case 'in_person':
        return 'On Campus';
      case 'hybrid':
        return 'Hybrid';
      default:
        return 'Mixed';
    }
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

  // Memoização dos filtros e ordenação
  const filteredScholarships = useMemo(() => {
    
    // Busca por múltiplas palavras-chave
    const searchWords = appliedSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
    
    const filtered = scholarships.filter(scholarship => {
      // Busca por palavras-chave
      const text = `${scholarship.title} ${scholarship.description || ''} ${(scholarship.universities?.name || '')}`.toLowerCase();
      const matchesSearch = searchWords.length === 0 || searchWords.every(word => text.includes(word));
      
      // Filtro de nível
      const matchesLevel = appliedLevel === 'all' || 
        (scholarship.level && typeof scholarship.level === 'string' && scholarship.level.toLowerCase() === appliedLevel.toLowerCase());
      
      // Filtro de área
      const matchesField = appliedField === 'all' || 
        (scholarship.field_of_study && typeof scholarship.field_of_study === 'string' &&
         scholarship.field_of_study.toLowerCase() === appliedField.toLowerCase()) ||
        (appliedField === 'any' && scholarship.field_of_study === 'any field');
      
      // Filtro de delivery mode
      const matchesDeliveryMode = appliedDeliveryMode === 'all' || 
        (scholarship.delivery_mode && typeof scholarship.delivery_mode === 'string' && 
         scholarship.delivery_mode.toLowerCase() === appliedDeliveryMode.toLowerCase());
      
      // Filtro de work permissions
      const matchesWorkPermission = appliedWorkPermission === 'all' || 
        (scholarship.work_permissions && 
         Array.isArray(scholarship.work_permissions) && 
         scholarship.work_permissions.length > 0 &&
         scholarship.work_permissions.some((perm: any) => 
           perm && typeof perm === 'string' && perm.toLowerCase() === appliedWorkPermission.toLowerCase()
         ));
      
      // Filtro de valor
      const scholarshipValue = scholarship.annual_value_with_scholarship ?? scholarship.amount ?? 0;
      const minValueNum = appliedMinValue && appliedMinValue !== '' && !isNaN(Number(appliedMinValue)) ? Number(appliedMinValue) : null;
      const maxValueNum = appliedMaxValue && appliedMaxValue !== '' && !isNaN(Number(appliedMaxValue)) ? Number(appliedMaxValue) : null;
      
      const matchesMin = minValueNum === null || (scholarshipValue >= minValueNum);
      const matchesMax = maxValueNum === null || (scholarshipValue <= maxValueNum);
      
      // Filtro de deadline - mostrar bolsas com pelo menos X dias restantes
      const daysLeft = getDaysUntilDeadline(scholarship.deadline);
      const deadlineDaysNum = appliedDeadlineDays && appliedDeadlineDays !== '' && !isNaN(Number(appliedDeadlineDays)) ? Number(appliedDeadlineDays) : null;
      const matchesDeadline = deadlineDaysNum === null || daysLeft >= deadlineDaysNum;
      
      const passes = matchesSearch && matchesLevel && matchesField && matchesDeliveryMode && matchesWorkPermission && matchesMin && matchesMax && matchesDeadline;
      
      // Log detalhado para a primeira bolsa que não passa nos filtros (debug)
      if (!passes && scholarships.indexOf(scholarship) === 0) {
        console.log('❌ First scholarship failed filters:', {
          title: scholarship.title,
          matchesSearch,
          matchesLevel,
          matchesField,
          matchesDeliveryMode,
          matchesWorkPermission,
          matchesMin,
          matchesMax,
          matchesDeadline
        });
      }
      
      return passes;
    });
    
    // Ordenação
    const sorted = filtered.sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          const valueA = a.annual_value_with_scholarship ?? a.amount ?? 0;
          const valueB = b.annual_value_with_scholarship ?? b.amount ?? 0;
          return valueB - valueA;
        case 'deadline':
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'name':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [scholarships, appliedSearch, appliedLevel, appliedField, appliedDeliveryMode, appliedWorkPermission, appliedMinValue, appliedMaxValue, appliedDeadlineDays, sortBy]);

  // Memoização dos IDs aplicados e no carrinho
  const appliedScholarshipIds = useMemo(() => new Set(applications.map(app => app.scholarship_id)), [applications]);
  const cartScholarshipIds = useMemo(() => new Set(cart.map(s => s.scholarships.id)), [cart]);

  const handleAddToCart = (scholarship: any) => {
    if (user) {
      addToCart(scholarship, user.id);
    } else {
      console.error("User not authenticated to add items to cart");
    }
  };

  // Funções para controlar o modal
  const openScholarshipModal = (scholarship: any) => {
    setSelectedScholarshipForModal(scholarship);
    setIsModalOpen(true);
  };

  const closeScholarshipModal = () => {
    setIsModalOpen(false);
    setSelectedScholarshipForModal(null);
  };



  // Exibir apenas bolsas com deadline hoje ou futuro
  const today = new Date();
  today.setHours(0,0,0,0);
  const visibleScholarships = filteredScholarships.filter(s => {
    const deadlineDate = new Date(s.deadline);
    return deadlineDate >= today;
  });

  return (
    <div className="space-y-8 pt-10" data-testid="scholarship-list">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Find Scholarships</h2>
          <p className="text-slate-600">Discover opportunities tailored to your academic profile</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-8 gap-4 mb-4 items-center">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search scholarships..."
              value={searchTerm}
              aria-label="Search scholarships"
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            />
          </div>
          {/* Level Filter */}
          <label htmlFor="level-filter" className="sr-only">Academic Level</label>
          <select
            id="level-filter"
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            title="Filter by academic level"
            aria-label="Filter by academic level"
          >
            <option value="all">All Levels</option>
            <option value="undergraduate">Undergraduate</option>
            <option value="graduate">Graduate</option>
            <option value="postgraduate">Postgraduate</option>
          </select>
          {/* Field Filter */}
          <label htmlFor="field-filter" className="sr-only">Field of Study</label>
          <select
            id="field-filter"
            value={selectedField}
            onChange={(e) => setSelectedField(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            title="Filter by field of study"
            aria-label="Filter by field of study"
          >
            <option value="all">All Fields</option>
            <option value="stem">STEM</option>
            <option value="business">Business</option>
            <option value="engineering">Engineering</option>
            <option value="any">Any Field</option>
          </select>
          {/* Delivery Mode Filter */}
          <label htmlFor="delivery-mode-filter" className="sr-only">Study Mode</label>
          <select
            id="delivery-mode-filter"
            value={selectedDeliveryMode}
            onChange={(e) => setSelectedDeliveryMode(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            title="Filter by study mode"
            aria-label="Filter by study mode"
          >
            <option value="all">All Modes</option>
            <option value="online">Online</option>
            <option value="in_person">On Campus</option>
            <option value="hybrid">Hybrid</option>
          </select>
          {/* Work Permission Filter */}
          <label htmlFor="work-permission-filter" className="sr-only">Work Authorization</label>
          <select
            id="work-permission-filter"
            value={selectedWorkPermission}
            onChange={(e) => setSelectedWorkPermission(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            title="Filter by work authorization"
            aria-label="Filter by work authorization"
          >
            <option value="all">All Permissions</option>
            <option value="OPT">OPT</option>
            <option value="CPT">CPT</option>
            <option value="F1">F1</option>
            <option value="H1B">H1B</option>
            <option value="L1">L1</option>
          </select>
          {/* Value Filter */}
          <label htmlFor="min-value" className="sr-only">Minimum Value</label>
          <input
            id="min-value"
            type="number"
            placeholder="Min value"
            value={minValue}
            onChange={e => {
              const value = e.target.value;
              // Permitir apenas números positivos ou vazio
              if (value === '' || (Number(value) >= 0)) {
                setMinValue(value);
              }
            }}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            aria-label="Minimum value"
          />
          <label htmlFor="max-value" className="sr-only">Maximum Value</label>
          <input
            id="max-value"
            type="number"
            placeholder="Max value"
            value={maxValue}
            onChange={e => {
              const value = e.target.value;
              // Permitir apenas números positivos ou vazio
              if (value === '' || (Number(value) >= 0)) {
                setMaxValue(value);
              }
            }}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            aria-label="Maximum value"
          />
          {/* Deadline Filter */}
          <label htmlFor="deadline-days" className="sr-only">Deadline in days</label>
          <input
            id="deadline-days"
            type="number"
            placeholder="Deadline (days)"
            value={deadlineDays}
            onChange={e => {
              const value = e.target.value;
              // Permitir apenas números positivos ou vazio
              if (value === '' || (Number(value) >= 0)) {
                setDeadlineDays(value);
              }
            }}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            aria-label="Deadline in days"
          />
          {/* View Mode Toggle */}
          <div className="flex gap-2 justify-end md:col-span-1">
            <button
              className={`p-2 rounded-lg border ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
              aria-label="Grid view"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button
              className={`p-2 rounded-lg border ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
              onClick={() => setViewMode('list')}
              title="List view"
              aria-label="List view"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Botões Apply e Clear Filters */}
        <div className="flex justify-start gap-3 mb-4">
          <button
            type="button"
            onClick={(e) => applyFilters(e)}
            disabled={isApplyingFilters}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 ${
              (searchTerm.trim() !== appliedSearch || selectedLevel !== appliedLevel || selectedField !== appliedField || selectedDeliveryMode !== appliedDeliveryMode || selectedWorkPermission !== appliedWorkPermission || minValue.trim() !== appliedMinValue || maxValue.trim() !== appliedMaxValue || deadlineDays.trim() !== appliedDeadlineDays)
                ? filtersApplied 
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                  : isApplyingFilters
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white opacity-75'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                : 'bg-gradient-to-r from-slate-400 to-slate-500 text-white cursor-not-allowed'
            }`}
          >
            {isApplyingFilters ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Applying...
              </>
            ) : filtersApplied ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Filters Applied!
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Apply Filters ({filteredScholarships.length})
              </>
            )}
          </button>
          
          {(appliedSearch || appliedLevel !== 'all' || appliedField !== 'all' || appliedDeliveryMode !== 'all' || appliedWorkPermission !== 'all' || appliedMinValue || appliedMaxValue || appliedDeadlineDays) && (
            <button
              type="button"
              onClick={(e) => clearAllFilters(e)}
              className="bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-300 transition-all duration-200 flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Clear All Filters
            </button>
          )}
        </div>


        {/* Tags de filtros ativos (apenas os aplicados) */}
        <div className="flex flex-wrap gap-2 mb-2">
          {appliedSearch && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs">Search: {appliedSearch}</span>}
          {appliedLevel !== 'all' && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">Level: {appliedLevel}</span>}
          {appliedField !== 'all' && <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs">Field: {appliedField}</span>}
          {appliedDeliveryMode !== 'all' && <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs">Mode: {getDeliveryModeLabel(appliedDeliveryMode)}</span>}
          {appliedWorkPermission !== 'all' && <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs">Work: {appliedWorkPermission}</span>}
          {appliedMinValue && <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs">Min: {appliedMinValue}</span>}
          {appliedMaxValue && <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs">Max: {appliedMaxValue}</span>}
          {appliedDeadlineDays && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs">Deadline: {appliedDeadlineDays} days</span>}
        </div>



        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            <span className="font-medium text-blue-600">{filteredScholarships.length}</span> scholarships found
          </span>
        </div>
      </div>

      {/* Scholarships Grid/List */}
      <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "flex flex-col gap-4"}>
        {visibleScholarships.map((scholarship) => {
          const alreadyApplied = appliedScholarshipIds.has(scholarship.id);
          const inCart = cartScholarshipIds.has(scholarship.id);
          const layoutId = `scholarship-card-${scholarship.id}`;
          
          return (
            <motion.div
              key={scholarship.id}
              ref={(el) => {
                if (el) scholarshipRefs.current.set(scholarship.id, el);
              }}
              layoutId={layoutId}
                             className={
                 viewMode === 'grid'
                   ? "group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200 hover:-translate-y-2 flex flex-col h-full"
                   : "group relative bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-slate-200 flex flex-row items-center p-4"
               }
            >
              {/* Scholarship Image */}
              <div className={viewMode === 'grid' ? "relative h-48 overflow-hidden flex-shrink-0" : "w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden mr-6"}>
                {scholarship.image_url ? (
                  <img
                    src={scholarship.image_url}
                    alt={scholarship.title}
                                         className={viewMode === 'grid' ? "w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" : "w-full h-full object-cover"}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <GraduationCap className="h-16 w-16 text-slate-400" />
                  </div>
                )}
                {scholarship.is_exclusive && (
                  <div className={viewMode === 'grid' ? "absolute top-4 right-4" : "absolute top-2 right-2"}>
                    <span className="bg-[#D0151C] text-white px-3 py-1 rounded-xl text-xs font-bold shadow-lg">
                      Exclusive
                    </span>
                  </div>
                )}
              </div>
              {/* Card Content */}
              <div className={viewMode === 'grid' ? "p-6 flex-1 flex flex-col" : "flex-1 flex flex-col justify-between min-h-[120px]"}>
                {/* Title and University */}
                <div className={viewMode === 'grid' ? "mb-4" : "mb-2"}>
                                     <h3 className={viewMode === 'grid' ? "text-xl font-bold text-slate-900 mb-3 leading-tight line-clamp-2 group-hover:text-[#05294E] transition-colors" : "text-lg font-bold text-slate-900 mb-1 leading-tight group-hover:text-[#05294E] transition-colors"}>
                    {scholarship.title}
                  </h3>
                  <div className="flex items-center mb-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium text-white ${getFieldBadgeColor(scholarship.field_of_study)}`}>
                      {scholarship.field_of_study || 'Any Field'}
                    </span>
                  </div>
                  <div className="flex items-center text-slate-600 mb-3">
                    <Building className="h-4 w-4 mr-2 text-[#05294E]" />
                    <span className="text-xs font-semibold mr-1">University:</span>
                    <span className={`text-sm select-none ${!userProfile?.has_paid_selection_process_fee ? 'blur-sm' : ''}`}>
                      {userProfile?.has_paid_selection_process_fee
                        ? (scholarship.universities?.name || 'Unknown University')
                        : '********'}
                    </span>
                  </div>

                  {/* Program Details */}
                  <div className="grid grid-cols-1 gap-3 mb-4">
                    {/* Delivery Mode */}
                    {scholarship.delivery_mode && (
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-center">
                          {getDeliveryModeIcon(scholarship.delivery_mode)}
                          <span className="text-xs font-medium text-slate-600 ml-2">Study Mode</span>
                        </div>
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getDeliveryModeColor(scholarship.delivery_mode)}`}>
                          {getDeliveryModeLabel(scholarship.delivery_mode)}
                        </span>
                      </div>
                    )}

                    {/* Work Permissions */}
                    {scholarship.work_permissions && scholarship.work_permissions.length > 0 && (
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-center mb-2">
                          <Briefcase className="h-3 w-3 text-emerald-600" />
                          <span className="text-xs font-medium text-slate-600 ml-2">Work Authorization</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {scholarship.work_permissions.map((permission: string, index: number) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-semibold"
                            >
                              {permission}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Financial Impact Section */}
                <div className={viewMode === 'grid' ? "mb-6" : "mb-4"}>
                                     <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm group-hover:shadow-md transition-shadow duration-300">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Financial Overview
                    </h4>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Original Price</span>
                        <span className="font-bold text-blue-700">
                          ${formatAmount(scholarship.original_annual_value)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">With Scholarship</span>
                        <span className="font-bold text-green-700">
                          ${formatAmount(scholarship.annual_value_with_scholarship)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                        <span>Per Credit</span>
                        <span>${formatAmount(scholarship.original_value_per_credit)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Details */}
                <div className={viewMode === 'grid' ? "space-y-3 flex-1" : "flex flex-row gap-6 mb-2"}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Level</span>
                    <div className="flex items-center">
                      {getLevelIcon(scholarship.level || 'undergraduate')}
                      <span className="ml-1 capitalize text-slate-700">{scholarship.level}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Deadline</span>
                    <div className="flex items-center">
                      <Clock className={`h-3 w-3 mr-1 ${getDeadlineStatus(scholarship.deadline).color}`} />
                      <span className="text-slate-700">{getDaysUntilDeadline(scholarship.deadline)} days left</span>
                    </div>
                  </div>
                  {scholarship.delivery_mode && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Study Mode</span>
                      <div className="flex items-center">
                        {getDeliveryModeIcon(scholarship.delivery_mode)}
                        <span className="ml-1 text-slate-700">{getDeliveryModeLabel(scholarship.delivery_mode)}</span>
                      </div>
                    </div>
                  )}
                </div>
                {/* Action Buttons */}
                <div className={viewMode === 'grid' ? "mt-6 pt-4 border-t border-slate-100" : "mt-2"}>
                  <div className="flex gap-3">
                                                                                   {/* View Details Button */}
                       <div className="flex-shrink-0" onMouseEnter={(e) => e.stopPropagation()}>
                         <button
                           onClick={() => openScholarshipModal(scholarship)}
                           className="w-full py-3 sm:py-4 px-3 sm:px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
                           title="View scholarship details"
                           aria-label="View scholarship details"
                         >
                           <span className="hidden sm:inline">Show</span>
                           <span className="sm:hidden">View</span>
                           <span className="hidden sm:inline ml-1">Details</span>
                         </button>
                       </div>
                    
                    {/* Select/Deselect Button */}
                    <button
                      ref={(el) => {
                        if (el) buttonRefs.current.set(scholarship.id, el);
                      }}
                                             className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center group-hover:shadow-2xl transform group-hover:scale-105 transition-all duration-300 relative overflow-hidden active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#05294E]/50 focus:ring-offset-2 ${
                         inCart 
                           ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700' 
                           : 'bg-gradient-to-r from-[#05294E] via-[#05294E] to-slate-700 text-white hover:from-[#041f3a] hover:to-slate-600'
                       } ${alreadyApplied ? 'bg-slate-300 text-slate-500 cursor-not-allowed hover:scale-100' : ''}`}
                    onClick={async () => {
                      if (inCart) {
                        if (user) removeFromCart(scholarship.id, user.id);
                      } else {
                        // ANIMAÇÃO: voar para o chapéu
                        const hat = document.getElementById('floating-cart-hat');
                        const cardElement = scholarshipRefs.current.get(scholarship.id);
                        
                        if (cardElement && hat) {
                          const from = cardElement.getBoundingClientRect();
                          const to = hat.getBoundingClientRect();
                          setFlyingCard({ card: scholarship, from, to });
                          setAnimating(true);
                          setTimeout(() => {
                            setAnimating(false);
                            setFlyingCard(null);
                          }, 1100);
                        }
                        handleAddToCart(scholarship);
                      }
                    }}
                    disabled={alreadyApplied}
                  >
                                         <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                       <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-2 relative z-10 group-hover:scale-110 transition-transform" aria-hidden="true" />
                       <span className="relative z-10">{alreadyApplied ? 'Already Applied' : inCart ? 'Deselect' : 'Select Scholarship'}</span>
                       {!alreadyApplied && <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2 group-hover:translate-x-1 transition-transform relative z-10" aria-hidden="true" />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* No Results */}
      {filteredScholarships.length === 0 && (
        <div className="text-center py-20">
          <div className="bg-gradient-to-br from-slate-100 to-slate-200 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
            <Award className="h-16 w-16 text-slate-400" />
          </div>
          <h3 className="text-3xl font-bold text-slate-600 mb-4">No scholarships found</h3>
          <p className="text-slate-500 text-lg mb-8">Try adjusting your search criteria or clear filters to discover more opportunities.</p>
          <button 
            type="button"
            onClick={(e) => clearAllFilters(e)}
            className="bg-blue-600 text-white px-8 py-3 rounded-2xl hover:bg-blue-700 transition-all duration-300 font-bold"
          >
            Clear All Filters
          </button>
        </div>
      )}
      <AnimatePresence>
        {flyingCard && animating && (
          <motion.div
            initial={{
              left: flyingCard.from.left,
              top: flyingCard.from.top,
              width: flyingCard.from.width,
              height: flyingCard.from.height,
              position: 'fixed',
              zIndex: 999999,
              scale: 1,
              opacity: 1
            }}
            animate={{
              left: flyingCard.to.left,
              top: flyingCard.to.top,
              width: flyingCard.to.width,
              height: flyingCard.to.height,
              scale: 0.5,
              opacity: 0.5
            }}
            transition={{ duration: 1.1, type: 'spring' }}
            style={{ pointerEvents: 'none' }}
          >
            <div className="bg-white rounded-3xl shadow-lg border border-slate-200 flex flex-col p-4 items-center w-full h-full">
              <GraduationCap className="h-10 w-10 text-blue-600 mb-2" />
              <div className="font-bold text-slate-900 text-center text-sm line-clamp-2 mb-1">{flyingCard.card.title}</div>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium mb-1">{flyingCard.card.field_of_study}</span>
              <span className="text-xs text-slate-500">{flyingCard.card.universities?.name || 'University'}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Detalhes da Bolsa */}
      <ScholarshipDetailModal
        scholarship={selectedScholarshipForModal}
        isOpen={isModalOpen}
        onClose={closeScholarshipModal}
        userProfile={userProfile}
      />
    </div>
  );
};

export default ScholarshipBrowser;