import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  Star, 
  Award, 
  Building, 
  MapPin, 
  Clock, 
  DollarSign, 
  GraduationCap, 
  ArrowRight,
  X,
  CheckCircle,
  Users,
  Monitor,
  Globe,
  Briefcase,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../stores/applicationStore';
import { supabase } from '../../lib/supabase';
import { STRIPE_PRODUCTS } from '../../stripe-config';
import ScholarshipDetailModal from '../../components/ScholarshipDetailModal';
import { PreCheckoutModal } from '../../components/PreCheckoutModal';

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
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const { userProfile, user, refetchUserProfile } = useAuth();
  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart } = useCartStore();
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('');
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [featuredScholarships, setFeaturedScholarships] = useState<any[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);

  // Estados para o PreCheckoutModal (Matricula Rewards)
  const [showPreCheckoutModal, setShowPreCheckoutModal] = useState(false);
  const [selectedScholarshipForCheckout, setSelectedScholarshipForCheckout] = useState<any>(null);
  const [isCheckingDiscount, setIsCheckingDiscount] = useState(false);
  const [isOpeningStripe, setIsOpeningStripe] = useState(false);

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

  // Função para carregar bolsas destacadas
  const loadFeaturedScholarships = async () => {
    try {
      setFeaturedLoading(true);
      
      // Buscar todas as bolsas destacadas do sistema
      const { data: featuredData, error } = await supabase
        .from('scholarships')
        .select(`
          *,
          universities (
            id,
            name,
            logo_url
          )
        `)
        .eq('is_highlighted', true)
        .order('featured_order', { ascending: true })
        .limit(6);

      if (error) {
        console.error('Error loading featured scholarships:', error);
        return;
      }

      
      setFeaturedScholarships(featuredData || []);
    } catch (error) {
      console.error('Error in loadFeaturedScholarships:', error);
    } finally {
      setFeaturedLoading(false);
    }
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

  // Carregar bolsas destacadas quando o componente montar
  useEffect(() => {
    loadFeaturedScholarships();
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

  // Função para ir direto para Stripe (quando já tem desconto ativo)
  const proceedToStripeDirectly = async (scholarship: any) => {
    console.log('🎯 [ScholarshipBrowser] Indo direto para Stripe (desconto já aplicado)');
    
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-selection-process-fee`;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price_id: STRIPE_PRODUCTS.selectionProcess.priceId,
          success_url: `${window.location.origin}/student/dashboard/selection-process-fee-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/student/dashboard/selection-process-fee-error`,
          mode: 'payment',
          payment_type: 'selection_process',
          fee_type: 'selection_process'
          // Não precisa passar discount_code pois já foi aplicado
        })
      });
      
      const data = await response.json();
      if (data.session_url) {
        // Abrir Stripe em nova aba
        window.open(data.session_url, '_blank');
      } else {
        console.error('Error creating Stripe session:', data);
        navigate('/student/dashboard/selection-process-fee-error');
      }
    } catch (error) {
      console.error('Error proceeding to Stripe:', error);
      navigate('/student/dashboard/selection-process-fee-error');
    }
  };

  // Função para verificar desconto ativo e decidir fluxo
  const checkDiscountAndProceed = async (scholarship: any) => {
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    // PRIMEIRO: Verificar se já pagou a selection process fee
    if (!userProfile?.has_paid_selection_process_fee) {
      console.log('❌ User has not paid selection process fee, checking for active discount...');
      
      // SEGUNDO: Verificar se já tem desconto ativo
      setIsCheckingDiscount(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        
        if (!token) {
          console.log('❌ No token, showing referral code modal');
          setSelectedScholarshipForCheckout(scholarship);
          setShowPreCheckoutModal(true);
          return;
        }

        // Verificar se já há desconto ativo usando função RPC
        console.log('🔍 [ScholarshipBrowser] Verificando desconto ativo...');
        const { data: result, error } = await supabase.rpc('get_user_active_discount', {
          user_id_param: user.id
        });

        if (error) {
          console.error('❌ Erro ao verificar desconto:', error);
          // Em caso de erro, mostrar modal por segurança
          setSelectedScholarshipForCheckout(scholarship);
          setShowPreCheckoutModal(true);
          return;
        }

        console.log('🔍 [ScholarshipBrowser] Resultado da verificação:', result);
        
        if (result && result.has_discount) {
          console.log('✅ Usuário já tem desconto ativo, indo direto para Stripe');
          // Se já tem desconto, ir direto para Stripe
          proceedToStripeDirectly(scholarship);
        } else {
          console.log('❌ Sem desconto ativo, mostrando modal para código de referência');
          // Se não tem desconto, mostrar modal
          setSelectedScholarshipForCheckout(scholarship);
          setShowPreCheckoutModal(true);
        }
      } catch (error) {
        console.error('❌ Erro ao verificar desconto:', error);
        // Em caso de erro, mostrar modal por segurança
        setSelectedScholarshipForCheckout(scholarship);
        setShowPreCheckoutModal(true);
      } finally {
        setIsCheckingDiscount(false);
      }
      return;
    }

    proceedToCheckout(scholarship);
  };

  // Função para ir direto para checkout (quando já tem desconto)
  const proceedToCheckout = (scholarship: any) => {
    if (!user) return;
    // Adicionar ao carrinho SEM redirecionar - usuário pode continuar selecionando
    addToCart(scholarship, user.id);
    // NÃO redirecionar para o carrinho - deixar usuário continuar selecionando
    // navigate('/student/dashboard/cart'); // REMOVIDO - quebrava o fluxo
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

  // Filtrar bolsas destacadas - remover as que já estão em featuredScholarships
  const regularScholarships = visibleScholarships.filter(s => {
    // Não incluir bolsas que são destacadas
    if (s.is_highlighted === true) return false;
    
    // Também não incluir bolsas que estão no array featuredScholarships
    const isInFeatured = featuredScholarships.some(fs => fs.id === s.id);
    return !isInFeatured;
  });

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 pt-4 sm:pt-6 md:pt-10 px-4 sm:px-6 lg:px-0 pb-8 sm:pb-12" data-testid="scholarship-list">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">Find Scholarships</h2>
          <p className="text-sm sm:text-base text-slate-600">Discover opportunities tailored to your academic profile</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
        {/* Mobile Filter Toggle */}
        <div className="block md:hidden mb-4">
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-700 font-medium"
          >
            <span className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filters ({Object.values({ appliedSearch, appliedLevel, appliedField, appliedDeliveryMode, appliedWorkPermission, appliedMinValue, appliedMaxValue, appliedDeadlineDays }).filter(Boolean).length} active)
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${filtersExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filters Container */}
        <div className={`${filtersExpanded ? 'block' : 'hidden'} md:block space-y-4`}>
          {/* Search - Always visible on mobile */}
          <div className="relative">
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

          {/* Filter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
            {/* Level Filter */}
            <div>
              <label htmlFor="level-filter" className="block text-xs font-medium text-slate-700 mb-1 md:hidden">Academic Level</label>
              <select
                id="level-filter"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 text-sm"
                title="Filter by academic level"
                aria-label="Filter by academic level"
              >
                <option value="all">All Levels</option>
                <option value="undergraduate">Undergraduate</option>
                <option value="graduate">Graduate</option>
                <option value="postgraduate">Postgraduate</option>
              </select>
            </div>

            {/* Field Filter */}
            <div>
              <label htmlFor="field-filter" className="block text-xs font-medium text-slate-700 mb-1 md:hidden">Field of Study</label>
              <select
                id="field-filter"
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 text-sm"
                title="Filter by field of study"
                aria-label="Filter by field of study"
              >
                <option value="all">All Fields</option>
                <option value="stem">STEM</option>
                <option value="business">Business</option>
                <option value="engineering">Engineering</option>
                <option value="any">Any Field</option>
              </select>
            </div>

            {/* Delivery Mode Filter */}
            <div>
              <label htmlFor="delivery-mode-filter" className="block text-xs font-medium text-slate-700 mb-1 md:hidden">Study Mode</label>
              <select
                id="delivery-mode-filter"
                value={selectedDeliveryMode}
                onChange={(e) => setSelectedDeliveryMode(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 text-sm"
                title="Filter by study mode"
                aria-label="Filter by study mode"
              >
                <option value="all">All Modes</option>
                <option value="online">Online</option>
                <option value="in_person">On Campus</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            {/* Work Permission Filter */}
            <div>
              <label htmlFor="work-permission-filter" className="block text-xs font-medium text-slate-700 mb-1 md:hidden">Work Authorization</label>
              <select
                id="work-permission-filter"
                value={selectedWorkPermission}
                onChange={(e) => setSelectedWorkPermission(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 text-sm"
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
            </div>

            {/* Value Filters */}
            <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2 grid grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label htmlFor="min-value" className="block text-xs font-medium text-slate-700 mb-1 md:hidden">Min Value</label>
                <input
                  id="min-value"
                  type="number"
                  placeholder="Min value"
                  value={minValue}
                  onChange={e => {
                    const value = e.target.value;
                    if (value === '' || (Number(value) >= 0)) {
                      setMinValue(value);
                    }
                  }}
                  className="w-full px-3 sm:px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 text-sm"
                  aria-label="Minimum value"
                />
              </div>
              <div>
                <label htmlFor="max-value" className="block text-xs font-medium text-slate-700 mb-1 md:hidden">Max Value</label>
                <input
                  id="max-value"
                  type="number"
                  placeholder="Max value"
                  value={maxValue}
                  onChange={e => {
                    const value = e.target.value;
                    if (value === '' || (Number(value) >= 0)) {
                      setMaxValue(value);
                    }
                  }}
                  className="w-full px-3 sm:px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 text-sm"
                  aria-label="Maximum value"
                />
              </div>
            </div>

            {/* Deadline Filter */}
            <div>
              <label htmlFor="deadline-days" className="block text-xs font-medium text-slate-700 mb-1 md:hidden">Deadline (days)</label>
              <input
                id="deadline-days"
                type="number"
                placeholder="Deadline (days)"
                value={deadlineDays}
                onChange={e => {
                  const value = e.target.value;
                  if (value === '' || (Number(value) >= 0)) {
                    setDeadlineDays(value);
                  }
                }}
                className="w-full px-3 sm:px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 text-sm"
                aria-label="Deadline in days"
              />
            </div>
          </div>


        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-3 mt-4">
          <button
            type="button"
            onClick={(e) => applyFilters(e)}
            disabled={isApplyingFilters}
            className={`w-full sm:w-auto px-4 sm:px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 text-sm sm:text-base ${
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
                <span className="hidden sm:inline">Applying...</span>
                <span className="sm:hidden">Loading...</span>
              </>
            ) : filtersApplied ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Filters Applied!</span>
                <span className="sm:hidden">Applied!</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Apply Filters ({filteredScholarships.length})</span>
                <span className="sm:hidden">Apply ({filteredScholarships.length})</span>
              </>
            )}
          </button>
          
          {(appliedSearch || appliedLevel !== 'all' || appliedField !== 'all' || appliedDeliveryMode !== 'all' || appliedWorkPermission !== 'all' || appliedMinValue || appliedMaxValue || appliedDeadlineDays) && (
            <button
              type="button"
              onClick={(e) => clearAllFilters(e)}
              className="w-full sm:w-auto bg-slate-200 text-slate-700 px-4 sm:px-6 py-3 rounded-xl font-semibold hover:bg-slate-300 transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Clear All Filters</span>
              <span className="sm:hidden">Clear</span>
            </button>
          )}


        </div>

        {/* Tags de filtros ativos (apenas os aplicados) */}
        {(appliedSearch || appliedLevel !== 'all' || appliedField !== 'all' || appliedDeliveryMode !== 'all' || appliedWorkPermission !== 'all' || appliedMinValue || appliedMaxValue || appliedDeadlineDays) && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200">
            {appliedSearch && <span className="bg-blue-100 text-blue-700 px-2 sm:px-3 py-1 rounded-full text-xs">Search: {appliedSearch}</span>}
            {appliedLevel !== 'all' && <span className="bg-green-100 text-green-700 px-2 sm:px-3 py-1 rounded-full text-xs">Level: {appliedLevel}</span>}
            {appliedField !== 'all' && <span className="bg-purple-100 text-purple-700 px-2 sm:px-3 py-1 rounded-full text-xs">Field: {appliedField}</span>}
            {appliedDeliveryMode !== 'all' && <span className="bg-indigo-100 text-indigo-700 px-2 sm:px-3 py-1 rounded-full text-xs">Mode: {getDeliveryModeLabel(appliedDeliveryMode)}</span>}
            {appliedWorkPermission !== 'all' && <span className="bg-emerald-100 text-emerald-700 px-2 sm:px-3 py-1 rounded-full text-xs">Work: {appliedWorkPermission}</span>}
            {appliedMinValue && <span className="bg-yellow-100 text-yellow-700 px-2 sm:px-3 py-1 rounded-full text-xs">Min: {appliedMinValue}</span>}
            {appliedMaxValue && <span className="bg-yellow-100 text-yellow-700 px-2 sm:px-3 py-1 rounded-full text-xs">Max: {appliedMaxValue}</span>}
            {appliedDeadlineDays && <span className="bg-red-100 text-red-700 px-2 sm:px-3 py-1 rounded-full text-xs">Deadline: {appliedDeadlineDays} days</span>}
          </div>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-slate-600 mt-4 pt-4 border-t border-slate-200">
          <span>
            <span className="font-medium text-blue-600">{filteredScholarships.length}</span> 
            <span className="hidden sm:inline"> scholarships found</span>
            <span className="sm:hidden"> results</span>
          </span>
        </div>
      </div>

      {/* Featured Scholarships Section */}
      {featuredLoading ? (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl border border-blue-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center justify-center py-8 sm:py-12">
            <div className="text-center">
              <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3 sm:mb-4"></div>
              <p className="text-sm sm:text-base text-slate-600">Loading featured scholarships...</p>
            </div>
          </div>
        </div>
      ) : featuredScholarships.length > 0 ? (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl border border-blue-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1 sm:mb-2">
                <span className="text-[#05294E]">Featured</span> Scholarships
              </h3>
              <p className="text-sm sm:text-base text-slate-600">
                These scholarships are prominently displayed and may have special benefits
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xl sm:text-2xl font-bold text-[#05294E]">{featuredScholarships.length}</div>
              <div className="text-xs sm:text-sm text-slate-500">Featured</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {featuredScholarships.map((scholarship) => {
              const alreadyApplied = appliedScholarshipIds.has(scholarship.id);
              const inCart = cartScholarshipIds.has(scholarship.id);
              const layoutId = `featured-scholarship-${scholarship.id}`;
              
              return (
                <motion.div
                  key={scholarship.id}
                  ref={(el) => {
                    if (el) scholarshipRefs.current.set(scholarship.id, el);
                  }}
                  layoutId={layoutId}
                  className="group relative bg-white rounded-2xl sm:rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200 hover:-translate-y-1 sm:hover:-translate-y-2 flex flex-col h-full"
                >
                  {/* Featured Badge */}
                  <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-10">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs font-bold flex items-center shadow-lg">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Featured
                    </div>
                  </div>

                  {/* Scholarship Image */}
                  <div className="relative h-40 sm:h-48 overflow-hidden flex-shrink-0">
                    {scholarship.image_url ? (
                      <img
                        src={scholarship.image_url}
                        alt={scholarship.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                        <GraduationCap className="h-12 w-12 sm:h-16 sm:w-16 text-slate-400" />
                      </div>
                    )}
                    {scholarship.is_exclusive && (
                      <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                        <span className="bg-[#D0151C] text-white px-2 sm:px-3 py-1 rounded-lg sm:rounded-xl text-xs font-bold shadow-lg">
                          Exclusive
                        </span>
                      </div>
                    )}
                    {/* Featured Order Badge */}
                    <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4">
                      <span className="bg-white/90 text-blue-600 px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                        #{scholarship.featured_order || 1}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 sm:p-6 flex-1 flex flex-col">
                    {/* Title and University */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight line-clamp-2 group-hover:text-[#05294E] transition-colors">
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
                        <span className={`text-sm select-none ${!user || !userProfile?.has_paid_selection_process_fee ? 'blur-sm' : ''}`}>
                          {user && userProfile?.has_paid_selection_process_fee
                            ? (scholarship.universities?.name || 'Unknown University')
                            : '********'}
                        </span>
                      </div>
                    </div>

                    {/* Financial Impact Section */}
                    <div className="mb-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200 shadow-sm group-hover:shadow-md transition-shadow duration-300">
                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          Financial Overview
                        </h4>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600">Original Price:</span>
                            <span className="text-sm font-bold text-slate-700">
                              ${formatAmount(scholarship.original_annual_value || scholarship.amount || scholarship.annual_value || 'N/A')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600">With Scholarship:</span>
                            <span className="text-sm font-bold text-green-600">
                              ${formatAmount(scholarship.annual_value_with_scholarship || scholarship.amount || 'N/A')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600">Per Credit:</span>
                            <span className="text-sm font-bold text-slate-700">
                              ${formatAmount(scholarship.original_value_per_credit || scholarship.per_credit_cost || 'N/A')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Details for Featured Scholarships */}
                    <div className="mb-6 space-y-3">
                      {/* Study Mode */}
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

                      {/* Deadline */}
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 text-red-500" />
                          <span className="text-xs font-medium text-slate-600 ml-2">Deadline</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          {getDaysUntilDeadline(scholarship.deadline)} days left
                        </span>
                      </div>
                    </div>
                      
                                         {/* Action Buttons */}
                     <div className="mt-auto">
                       <div className="flex gap-3">
                         {/* Show Details Button */}
                         <div className="flex-shrink-0" onMouseEnter={(e) => e.stopPropagation()}>
                         <button
                           onClick={() => openScholarshipModal(scholarship)}
                           className="w-full py-4 sm:py-4 px-3 sm:px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
                           title="View scholarship details"
                           aria-label="View scholarship details"
                         >
                           <span className="hidden sm:inline">Show</span>
                           <span className="sm:hidden">View</span>
                           <span className="hidden sm:inline ml-1">Details</span>
                         </button>
                       </div>
                         
                         {alreadyApplied ? (
                           <button
                             disabled
                             className="flex-1 bg-green-100 text-green-700 py-3 px-4 rounded-2xl font-semibold cursor-not-allowed flex items-center justify-center"
                           >
                             <CheckCircle className="h-4 w-4 mr-2" />
                             ALREADY APPLIED
                           </button>
                         ) : inCart ? (
                           <button
                             onClick={() => removeFromCart(scholarship.id, user?.id || '')}
                             className="flex-1 bg-red-100 text-red-700 py-3 px-4 rounded-2xl font-semibold hover:bg-red-200 transition-colors flex items-center justify-center"
                           >
                             <Trash2 className="h-4 w-4 mr-2" />
                             Deselect
                           </button>
                         ) : (
                           <button
                    onClick={async () => {
                      if (alreadyApplied) return;
                      
                      if (inCart) {
                        if (user) removeFromCart(scholarship.id, user.id);
                      } else {
                        // ANIMAÇÃO: voar para o chapéu (apenas se já pagou a taxa)
                        if (userProfile?.has_paid_selection_process_fee) {
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
                        }
                        // Usar a nova função que verifica desconto antes de adicionar ao carrinho
                        checkDiscountAndProceed(scholarship);
                      }
                    }}
                             ref={(el) => {
                               if (el) buttonRefs.current.set(scholarship.id, el);
                             }}
                             className={`py-3 sm:py-4 px-4 sm:px-6 w-5/6 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center group-hover:shadow-2xl transform group-hover:scale-105 transition-all duration-300 relative overflow-hidden active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#05294E]/50 focus:ring-offset-2 ${
                                inCart 
                                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700' 
                                  : 'bg-gradient-to-r from-[#05294E] via-[#05294E] to-slate-700 text-white hover:from-[#041f3a] hover:to-slate-600'
                              } ${alreadyApplied ? 'bg-slate-300 text-slate-500 cursor-not-allowed hover:scale-100' : ''}`}
                             disabled={alreadyApplied || isCheckingDiscount}
                           >
                             <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                             <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-2 relative z-10 group-hover:scale-110 transition-transform" aria-hidden="true" />
                             <span className="relative z-10">
                               {alreadyApplied ? 'Already Applied' : inCart ? 'Deselect' : (
                                 isCheckingDiscount ? 'Checking...' : 'Select Scholarship'
                               )}
                             </span>
                             {!alreadyApplied && !isCheckingDiscount && <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2 group-hover:translate-x-1 transition-transform relative z-10" aria-hidden="true" />}
                             {!alreadyApplied && isCheckingDiscount && (
                               <div className="w-3 h-3 sm:w-4 sm:h-4 ml-2 border-2 border-white border-t-transparent rounded-full animate-spin relative z-10"></div>
                             )}
                           </button>
                         )}
                       </div>
                     </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-6 mb-8">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-600 mb-2">No Featured Scholarships</h3>
            <p className="text-sm text-slate-500">
              Check back later for highlighted opportunities
            </p>
          </div>
        </div>
      )}

      {/* Scholarships Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {regularScholarships.map((scholarship) => {
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
              className="group relative bg-white rounded-2xl sm:rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200 hover:-translate-y-1 sm:hover:-translate-y-2 flex flex-col h-full"
            >
              {/* Scholarship Image */}
              <div className="relative h-40 sm:h-48 overflow-hidden flex-shrink-0">
                {scholarship.image_url ? (
                  <img
                    src={scholarship.image_url}
                    alt={scholarship.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <GraduationCap className="h-12 w-12 sm:h-16 sm:w-16 text-slate-400" />
                  </div>
                )}
                {scholarship.is_exclusive && (
                  <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                    <span className="bg-[#D0151C] text-white px-2 sm:px-3 py-1 rounded-lg sm:rounded-xl text-xs font-bold shadow-lg">
                      Exclusive
                    </span>
                  </div>
                )}
              </div>
              
              {/* Card Content */}
              <div className="p-4 sm:p-6 flex-1 flex flex-col">
                {/* Title and University */}
                <div className="mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3 leading-tight line-clamp-2 group-hover:text-[#05294E] transition-colors">
                    {scholarship.title}
                  </h3>
                  <div className="flex items-center mb-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium text-white ${getFieldBadgeColor(scholarship.field_of_study)}`}>
                      {scholarship.field_of_study || 'Any Field'}
                    </span>
                  </div>
                  <div className="flex items-center text-slate-600 mb-2 sm:mb-3">
                    <Building className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-[#05294E]" />
                    <span className="text-xs font-semibold mr-1">University:</span>
                    <span className={`text-xs sm:text-sm select-none ${!user || !userProfile?.has_paid_selection_process_fee ? 'blur-sm' : ''}`}>
                      {user && userProfile?.has_paid_selection_process_fee
                        ? (scholarship.universities?.name || 'Unknown University')
                        : '********'}
                    </span>
                  </div>

                  {/* Program Details */}
                  <div className="grid grid-cols-1 gap-2 sm:gap-3 mb-3 sm:mb-4">
                    {/* Delivery Mode */}
                    {scholarship.delivery_mode && (
                      <div className="flex items-center justify-between p-2 sm:p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center">
                          {getDeliveryModeIcon(scholarship.delivery_mode)}
                          <span className="text-xs font-medium text-slate-600 ml-1 sm:ml-2">Study Mode</span>
                        </div>
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getDeliveryModeColor(scholarship.delivery_mode)}`}>
                          {getDeliveryModeLabel(scholarship.delivery_mode)}
                        </span>
                      </div>
                    )}

                    {/* Work Permissions */}
                    {scholarship.work_permissions && scholarship.work_permissions.length > 0 && (
                      <div className="p-2 sm:p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center mb-1 sm:mb-2">
                          <Briefcase className="h-3 w-3 text-emerald-600" />
                          <span className="text-xs font-medium text-slate-600 ml-1 sm:ml-2">Work Authorization</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {scholarship.work_permissions.slice(0, 3).map((permission: string, index: number) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-semibold"
                            >
                              {permission}
                            </span>
                          ))}
                          {scholarship.work_permissions.length > 3 && (
                            <span className="text-xs text-slate-500">+{scholarship.work_permissions.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Financial Impact Section */}
                <div className="mb-4 sm:mb-6">
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm group-hover:shadow-md transition-shadow duration-300">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-700 mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2">
                      <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                      Financial Overview
                    </h4>
                    
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-slate-600">Original Price</span>
                        <span className="font-bold text-blue-700">
                          ${formatAmount(scholarship.original_annual_value)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-slate-600">With Scholarship</span>
                        <span className="font-bold text-green-700">
                          ${formatAmount(scholarship.annual_value_with_scholarship)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 sm:pt-2 border-t border-slate-200">
                        <span>Per Credit</span>
                        <span>${formatAmount(scholarship.original_value_per_credit)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Details */}
                <div className="space-y-2 sm:space-y-3 flex-1 mb-4">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-500">Level</span>
                    <div className="flex items-center">
                      {getLevelIcon(scholarship.level || 'undergraduate')}
                      <span className="ml-1 capitalize text-slate-700 text-xs sm:text-sm">{scholarship.level}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-500">Deadline</span>
                    <div className="flex items-center">
                      <Clock className={`h-3 w-3 mr-1 ${getDeadlineStatus(scholarship.deadline).color}`} />
                      <span className="text-slate-700 text-xs sm:text-sm">{getDaysUntilDeadline(scholarship.deadline)} days left</span>
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
                <div className="mt-6 pt-4 border-t border-slate-100">
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
                      if (alreadyApplied) return;
                      
                      if (inCart) {
                        if (user) removeFromCart(scholarship.id, user.id);
                      } else {
                        // ANIMAÇÃO: voar para o chapéu (apenas se já pagou a taxa)
                        if (userProfile?.has_paid_selection_process_fee) {
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
                        }
                        // Usar a nova função que verifica desconto antes de adicionar ao carrinho
                        checkDiscountAndProceed(scholarship);
                      }
                    }}
                    disabled={alreadyApplied || isCheckingDiscount}
                  >
                                         <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                       <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-2 relative z-10 group-hover:scale-110 transition-transform" aria-hidden="true" />
                       <span className="relative z-10">
                         {alreadyApplied ? 'Already Applied' : inCart ? 'Deselect' : (
                           isCheckingDiscount ? 'Checking...' : 'Select Scholarship'
                         )}
                       </span>
                       {!alreadyApplied && !isCheckingDiscount && <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2 group-hover:translate-x-1 transition-transform relative z-10" aria-hidden="true" />}
                       {!alreadyApplied && isCheckingDiscount && (
                         <div className="w-3 h-3 sm:w-4 sm:h-4 ml-2 border-2 border-white border-t-transparent rounded-full animate-spin relative z-10"></div>
                       )}
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
        <div className="text-center py-12 sm:py-20 px-4">
          <div className="bg-gradient-to-br from-slate-100 to-slate-200 w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-lg">
            <Award className="h-12 w-12 sm:h-16 sm:w-16 text-slate-400" />
          </div>
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-600 mb-3 sm:mb-4">No scholarships found</h3>
          <p className="text-sm sm:text-base md:text-lg text-slate-500 mb-6 sm:mb-8 max-w-md mx-auto">Try adjusting your search criteria or clear filters to discover more opportunities.</p>
          <button 
            type="button"
            onClick={(e) => clearAllFilters(e)}
            className="bg-blue-600 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-xl sm:rounded-2xl hover:bg-blue-700 transition-all duration-300 font-bold text-sm sm:text-base"
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

      {/* PreCheckoutModal para Matricula Rewards */}
      {showPreCheckoutModal && selectedScholarshipForCheckout && (
        <PreCheckoutModal
          isOpen={showPreCheckoutModal}
          onClose={() => {
            setShowPreCheckoutModal(false);
            setSelectedScholarshipForCheckout(null);
          }}
          onProceedToCheckout={async (discountCode) => {
            console.log('🎯 [ScholarshipBrowser] Código de desconto aplicado:', discountCode);
            
            // Ativar loading imediatamente
            setIsOpeningStripe(true);
            
            try {
              // PRIMEIRO: Se há código de desconto, aplicar via edge function (igual ao StripeCheckout)
              if (discountCode) {
                console.log('🎯 [ScholarshipBrowser] Aplicando código de desconto via edge function...');
                const { data: sessionData } = await supabase.auth.getSession();
                const token = sessionData.session?.access_token;
                
                if (!token) {
                  throw new Error('Usuário não autenticado');
                }

                // Aplicar código de desconto
                const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-referral-code`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                  },
                  body: JSON.stringify({ affiliate_code: discountCode }),
                });

                const result = await response.json();
                console.log('🎯 [ScholarshipBrowser] Resultado da aplicação do código:', result);
                
                if (!result.success) {
                  console.error('🎯 [ScholarshipBrowser] ❌ Erro ao aplicar código:', result.error);
                  throw new Error(result.error || 'Erro ao aplicar código de desconto');
                }
                
                console.log('🎯 [ScholarshipBrowser] ✅ Código aplicado com sucesso');
              }

              // SEGUNDO: Agora ir para o checkout (o desconto já foi aplicado)
              console.log('🎯 [ScholarshipBrowser] Continuando para checkout...');
              const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-selection-process-fee`;
              const { data: sessionData } = await supabase.auth.getSession();
              const token = sessionData.session?.access_token;
              
              const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  price_id: STRIPE_PRODUCTS.selectionProcess.priceId,
                  success_url: `${window.location.origin}/student/dashboard/selection-process-fee-success?session_id={CHECKOUT_SESSION_ID}`,
                  cancel_url: `${window.location.origin}/student/dashboard/selection-process-fee-error`,
                  mode: 'payment',
                  payment_type: 'selection_process',
                  fee_type: 'selection_process'
                  // NÃO precisamos mais passar discount_code aqui, pois já foi aplicado
                })
              });
              
              const data = await response.json();
              if (data.session_url) {
                // Abrir Stripe em nova aba SEM fechar o modal
                window.open(data.session_url, '_blank');
                // O modal permanece aberto para o usuário
              } else {
                console.error('Error creating Stripe session:', data);
                // Em caso de erro, fechar modal e redirecionar para página de erro
                setShowPreCheckoutModal(false);
                setSelectedScholarshipForCheckout(null);
                navigate('/student/dashboard/selection-process-fee-error');
              }
            } catch (error) {
              console.error('Error proceeding to checkout:', error);
              // Em caso de erro, fechar modal e redirecionar para página de erro
              setShowPreCheckoutModal(false);
              setSelectedScholarshipForCheckout(null);
              navigate('/student/dashboard/selection-process-fee-error');
            } finally {
              // Sempre desativar loading
              setIsOpeningStripe(false);
            }
          }}
          feeType="selection_process"
          productName="Selection Process Fee"
          productPrice={50} // Preço da taxa de seleção
          isLoading={isOpeningStripe} // Passar o estado de loading
        />
      )}
    </div>
  );
};

export default ScholarshipBrowser;