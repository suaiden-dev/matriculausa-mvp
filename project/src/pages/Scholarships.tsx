import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, DollarSign, Award, GraduationCap, Star, Building, Users, AlertTriangle, ChevronLeft, ChevronRight, ArrowDown, ChevronDown, Lock, Globe, Laptop, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useScholarships } from '../hooks/useScholarships';
import type { Scholarship } from '../types';
import { supabase } from '../lib/supabase';

import SmartChat from '../components/SmartChat';
import { ApplicationFeeBlockedMessage } from '../components/ApplicationFeeBlockedMessage';
import { useApplicationFeeStatus } from '../hooks/useApplicationFeeStatus';
import { usePackageScholarshipFilter } from '../hooks/usePackageScholarshipFilter';
import { is3800ScholarshipBlocked/*, is3800Scholarship*/ } from '../utils/scholarshipDeadlineValidation';
// import { ScholarshipExpiryWarning } from '../components/ScholarshipExpiryWarning';
// import { ScholarshipCountdownTimer } from '../components/ScholarshipCountdownTimer';
import { getPlacementFee } from '../utils/placementFeeCalculator';
import { formatCurrency } from '../utils/currency';
import { getFieldBadgeColor } from '../utils/scholarshipHelpers';

const Scholarships: React.FC = () => {
  const { t } = useTranslation(['scholarships', 'common', 'home', 'school']);
  const { isAuthenticated, user, userProfile } = useAuth();

  // Hook para verificar se usuário já tem application fee paga
  const {
    hasPaidApplicationFee,
    committedUniversity,
    committedScholarship,
    loading: applicationFeeLoading
  } = useApplicationFeeStatus();

  // Hook para filtro automático baseado no pacote do usuário
  const {
    minScholarshipValue
  } = usePackageScholarshipFilter();

  // Obter faixa de bolsa desejada do perfil do usuário (quando logado)
  const desiredScholarshipRange = isAuthenticated && (userProfile as any)?.desired_scholarship_range
    ? (userProfile as any).desired_scholarship_range
    : null;


  // TODOS OS HOOKS DEVEM VIR ANTES DE QUALQUER LÓGICA CONDICIONAL
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedField, setSelectedField] = useState('all');
  const [selectedStudyMode, setSelectedStudyMode] = useState('all');
  const [selectedWorkAuth, setSelectedWorkAuth] = useState('all');


  const { scholarships, loading: scholarshipsLoading, error } = useScholarships();
  const [featuredUniversities, setFeaturedUniversities] = useState<any[]>([]);
  const [featuredScholarships, setFeaturedScholarships] = useState<Scholarship[]>([]);
  // Approved universities ids cache
  const [approvedUniversityIds, setApprovedUniversityIds] = useState<Set<number | string>>(new Set());
  const scholarshipsSectionRef = useRef<HTMLDivElement | null>(null);
  const featuredSectionRef = useRef<HTMLDivElement | null>(null);

  const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false);
  const [workDropdownOpen, setWorkDropdownOpen] = useState(false);

  const fieldRef = useRef<HTMLDivElement>(null);
  const workRef = useRef<HTMLDivElement>(null);

  // Estados para o modal de detalhes


  // Determinar se o usuário pode ver detalhes sensíveis (ex: nome da universidade, logo real da faculdade)
  const canViewSensitive = isAuthenticated && (
    user?.role !== 'student' || 
    (userProfile as any)?.has_paid_selection_process_fee ||
    (userProfile as any)?.has_paid_application_fee
  );

  useEffect(() => {
  }, [isAuthenticated, canViewSensitive, userProfile, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fieldRef.current && !fieldRef.current.contains(event.target as Node)) {
        setFieldDropdownOpen(false);
      }
      if (workRef.current && !workRef.current.contains(event.target as Node)) {
        setWorkDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get min and max scholarship values from data
  const scholarshipValues = scholarships.map((s: Scholarship) => s.amount).filter(val => val && val > 0);
  const maxScholarshipValue = scholarshipValues.length > 0 ? Math.max(...scholarshipValues) : 100000;

  // Range state - Inicializado em 0 conforme solicitado (0 = sem limite superior no filtro matchesRange)
  const [maxPrice, setMaxPrice] = useState(0);

  // Removida a atualização automática de maxPrice para evitar conflitos visuais e "pulos" de valores
  /* useEffect(() => {
    setMaxPrice(maxScholarshipValue);
  }, [maxScholarshipValue]); */

  // Salvar filtros no localStorage quando mudarem
  useEffect(() => {
    const filters = {
      searchTerm,
      selectedLevel,
      selectedField,
      selectedStudyMode,
      selectedWorkAuth,
      maxPrice
    };
    localStorage.setItem('scholarshipsPageFilters', JSON.stringify(filters));
  }, [searchTerm, selectedLevel, selectedField, selectedStudyMode, selectedWorkAuth, maxPrice]);

  // Restaurar filtros do localStorage ao carregar
  useEffect(() => {
    const savedFilters = localStorage.getItem('scholarshipsPageFilters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        if (filters.searchTerm) setSearchTerm(filters.searchTerm);
        if (filters.selectedLevel) setSelectedLevel(filters.selectedLevel);
        if (filters.selectedField) setSelectedField(filters.selectedField);
        if (filters.selectedStudyMode) setSelectedStudyMode(filters.selectedStudyMode);
        if (filters.selectedWorkAuth) setSelectedWorkAuth(filters.selectedWorkAuth);
        // maxPrice será definido pelo useEffect do maxScholarshipValue
      } catch (error) {
        // Error loading saved filters
      }
    }
  }, []);

  // Fetch featured scholarships directly from the scholarships table
  useEffect(() => {
    const fetchFeaturedScholarships = async () => {
      try {
        // Fetch scholarships marked as featured
        const { data: scholarshipsData, error: scholarshipsError } = await supabase
          .from('scholarships')
          .select(`
            *,
            universities (id, name, location, logo_url, image_url)
          `)
          .eq('is_highlighted', true)
          // Removido filtro is_active=true - estudantes podem ver bolsas inativas mas não podem aplicar
          .order('featured_order', { ascending: true });

        if (!scholarshipsError && scholarshipsData) {
          setFeaturedScholarships(scholarshipsData);

          // Fetch universities of featured scholarships to display information
          const universityIds = scholarshipsData.map(s => s.university_id).filter(Boolean);
          if (universityIds.length > 0) {
            const { data: universitiesData, error: universitiesError } = await supabase
              .from('universities')
              .select('id, name, location, logo_url')
              .in('id', universityIds);

            if (!universitiesError && universitiesData) {
              setFeaturedUniversities(universitiesData);
            }
          }
        }
      } catch (error) {
        // Error loading featured scholarships
      }
    };

    fetchFeaturedScholarships();
  }, []);

  // Load approved universities ids to filter out scholarships from unapproved universities
  useEffect(() => {
    const loadApprovedUniversities = async () => {
      try {
        const { data, error } = await supabase
          .from('universities')
          .select('id')
          .eq('is_approved', true);

        if (!error && data) {
          const ids = new Set(data.map((u: any) => u.id));
          setApprovedUniversityIds(ids);
        }
      } catch (err) {
        // Error loading approved universities
      }
    };

    loadApprovedUniversities();
  }, []);

  const levelOptions = [
    { value: 'all', label: t('scholarshipsPage.filters.levels.all') },
    { value: 'graduate', label: t('scholarshipsPage.filters.levels.graduate') },
    { value: 'doctorate', label: t('scholarshipsPage.filters.levels.doctorate') },
    { value: 'undergraduate', label: t('scholarshipsPage.filters.levels.undergraduate') },
  ];

  const fieldOptions = [
    { value: 'all', label: t('scholarshipsPage.filters.allFields') },
    { value: 'stem', label: t('scholarshipsPage.filters.stem') },
    { value: 'business', label: t('scholarshipsPage.filters.business') },
    { value: 'engineering', label: t('scholarshipsPage.filters.engineering') },
    { value: 'any', label: t('scholarshipsPage.filters.anyField') },
  ];

  const workOptions = [
    { value: 'all', label: t('scholarshipsPage.filters.allPermissions') },
    { value: 'OPT', label: t('scholarshipsPage.filters.opt') },
    { value: 'CPT', label: t('scholarshipsPage.filters.cpt') },
  ];

  const currentFieldLabel = fieldOptions.find(opt => opt.value === selectedField)?.label || t('scholarshipsPage.filters.allFields');
  const currentWorkLabel = workOptions.find(opt => opt.value === selectedWorkAuth)?.label || t('scholarshipsPage.filters.allPermissions');

  const { refetchUserProfile } = useAuth();
  const navigate = useNavigate();


  // Check if user needs to pay selection process fee (only for students)
  // if (user && user.role === 'student' && (!isAuthenticated || (isAuthenticated && userProfile && !userProfile.has_paid_selection_process_fee))) {
  //   console.log('Scholarships - Showing PaymentRequiredBlocker for student');
  //   return <PaymentRequiredBlocker pageType="scholarships" showHeader={false} />;
  // }


  const filteredScholarships = scholarships.filter((scholarship: Scholarship) => {
    // Exclude featured scholarships from the general list to avoid duplication
    if (scholarship.is_highlighted) {
      return false;
    }
    // Exclude scholarships whose university is not approved (if we have the approved list)
    if (approvedUniversityIds.size > 0) {
      const uniId = scholarship.university_id ?? scholarship.universities?.id ?? scholarship.university_id;
      if (uniId && !approvedUniversityIds.has(uniId)) return false;
    }

    const allowUniSearch = isAuthenticated
      ? (user?.role !== 'student' || !!userProfile?.has_paid_selection_process_fee)
      : false;
    const term = (searchTerm || '').toLowerCase().trim();
    const uniName = (scholarship.university_name || (scholarship as any).universities?.name || '').toLowerCase();
    const matchesSearch =
      term.length === 0 ||
      scholarship.title.toLowerCase().includes(term) ||
      (allowUniSearch && uniName.includes(term));
    const value = scholarship.annual_value_with_scholarship ?? 0;
    const matchesRange = (maxPrice === 0 || value <= maxPrice);
    const matchesLevel = selectedLevel === 'all' || (scholarship.level && scholarship.level.toLowerCase() === selectedLevel);
    const matchesField = selectedField === 'all' || (scholarship.field_of_study && scholarship.field_of_study.toLowerCase().includes(selectedField.toLowerCase()));
    const matchesDeliveryMode = selectedStudyMode === 'all' || (scholarship.delivery_mode && scholarship.delivery_mode === selectedStudyMode);
    const matchesWorkPermission = selectedWorkAuth === 'all' || (scholarship.work_permissions && scholarship.work_permissions.includes(selectedWorkAuth));
    
    // Filtro automático baseado na faixa de bolsa desejada (quando logado) ou pacote do usuário
    // Mostrar apenas bolsas com valor >= valor selecionado pelo seller
    const matchesDesiredRange = desiredScholarshipRange !== null
      ? (value >= desiredScholarshipRange)
      : (minScholarshipValue === null || (value >= minScholarshipValue));
    
    // Filtro de bolsas de teste (is_test)
    const isUorakUser = user?.email?.toLowerCase().endsWith('@uorak.com') || (userProfile as any)?.email?.toLowerCase().endsWith('@uorak.com');
    const isAdmin = user?.role === 'admin' || user?.role === 'post_sales';
    if (scholarship.is_test && !isUorakUser && !isAdmin) {
      return false;
    }
    
    return matchesSearch && matchesRange && matchesLevel && matchesField && matchesDeliveryMode && matchesWorkPermission && matchesDesiredRange;
  });

  // Apply the same filter logic to featured scholarships so the featureds respect the page filters
  const matchesFilters = (scholarship: Scholarship) => {
    // Exclude scholarships from unapproved universities if we have the approved list
    if (approvedUniversityIds.size > 0) {
      const uniId = scholarship.university_id ?? scholarship.universities?.id ?? scholarship.university_id;
      if (uniId && !approvedUniversityIds.has(uniId)) return false;
    }
    const allowUniSearch = isAuthenticated
      ? (user?.role !== 'student' || !!userProfile?.has_paid_selection_process_fee)
      : false;
    const term = (searchTerm || '').toLowerCase().trim();
    const uniName = (scholarship.university_name || (scholarship as any).universities?.name || '').toLowerCase();
    const matchesSearch =
      term.length === 0 ||
      scholarship.title.toLowerCase().includes(term) ||
      (allowUniSearch && uniName.includes(term));
    const value = scholarship.annual_value_with_scholarship ?? 0;
    const matchesRange = (maxPrice === 0 || value <= maxPrice);
    const matchesLevel = selectedLevel === 'all' || (scholarship.level && scholarship.level.toLowerCase() === selectedLevel);
    const matchesField = selectedField === 'all' || (scholarship.field_of_study && scholarship.field_of_study.toLowerCase().includes(selectedField.toLowerCase()));
    const matchesDeliveryMode = selectedStudyMode === 'all' || (scholarship.delivery_mode && scholarship.delivery_mode === selectedStudyMode);
    const matchesWorkPermission = selectedWorkAuth === 'all' || (scholarship.work_permissions && scholarship.work_permissions.includes(selectedWorkAuth));
    
    // Filtro automático baseado na faixa de bolsa desejada (quando logado) ou pacote do usuário
    // Mostrar apenas bolsas com valor >= valor selecionado pelo seller
    const matchesDesiredRange = desiredScholarshipRange !== null
      ? (value >= desiredScholarshipRange)
      : (minScholarshipValue === null || (value >= minScholarshipValue));
    
    // Filtro de bolsas de teste (is_test)
    const isUorakUser = user?.email?.toLowerCase().endsWith('@uorak.com') || (userProfile as any)?.email?.toLowerCase().endsWith('@uorak.com');
    const isAdmin = user?.role === 'admin' || user?.role === 'post_sales';
    if (scholarship.is_test && !isUorakUser && !isAdmin) {
      return false;
    }
    
    return matchesSearch && matchesRange && matchesLevel && matchesField && matchesDeliveryMode && matchesWorkPermission && matchesDesiredRange;
  };

  const filteredFeaturedScholarships = featuredScholarships.filter(matchesFilters);

  // Regras de visibilidade (canViewSensitive já declarada no topo do componente)
  const shouldApplyBlur = !canViewSensitive;

  // Polling para atualizar o perfil do usuário apenas enquanto o pagamento está pendente
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (userProfile && !userProfile.has_paid_selection_process_fee) {
      interval = setInterval(() => {
        refetchUserProfile && refetchUserProfile();
      }, 120000); // Reduzido de 3s para 2 minutos
    }
    return () => { if (interval) clearInterval(interval); };
  }, [refetchUserProfile, userProfile]);

  // Refetch imediato após pagamento do selection process fee
  useEffect(() => {
    if (userProfile && userProfile.has_paid_selection_process_fee) {
      refetchUserProfile && refetchUserProfile();
    }
  }, [userProfile?.has_paid_selection_process_fee, refetchUserProfile]);

  const formatAmount = (amount: any) => {
    if (typeof amount === 'string') return amount;
    if (typeof amount === 'number') return amount.toLocaleString('en-US');
    return amount;
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



  const getDeliveryModeLabel = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'online':
        return t('scholarshipsPage.filters.courseModalities.online');
      case 'in_person':
        return t('scholarshipsPage.filters.courseModalities.inPerson');
      case 'hybrid':
        return t('scholarshipsPage.filters.courseModalities.hybrid');
      default:
        return t('scholarshipsPage.filters.courseModalities.mixed');
    }
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

  /* const getDeadlineStatus = (deadline: string) => {
    const days = getDaysUntilDeadline(deadline);
    if (days < 0) return { status: 'expired', color: 'text-red-600', bg: 'bg-red-50' };
    if (days <= 7) return { status: 'urgent', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (days <= 30) return { status: 'soon', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { status: 'normal', color: 'text-green-600', bg: 'bg-green-50' };
  }; */



  const DEFAULT_PAGE_SIZE = 21;
  const MOBILE_PAGE_SIZE = 10;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);

  // Atualizar totalCount sempre que scholarships mudar
  useEffect(() => {
    setTotalCount(filteredScholarships.length);
  }, [filteredScholarships]);

  // Ajustar quantidade por página conforme viewport (mobile vs desktop)
  useEffect(() => {
    const computePageSize = () => {
      try {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640; // breakpoint ~sm
        const newSize = isMobile ? MOBILE_PAGE_SIZE : DEFAULT_PAGE_SIZE;
        setPageSize(prev => (prev !== newSize ? newSize : prev));
      } catch { }
    };
    computePageSize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', computePageSize);
      return () => window.removeEventListener('resize', computePageSize);
    }
  }, []);

  // Priorizar Caroline University e Oikos na listagem geral
  const paginatedScholarships = useMemo(() => {
    const priorityMatch = (name: string | undefined | null): boolean => {
      if (!name) return false;
      const n = String(name).toLowerCase();
      return n.includes('caroline') || n.includes('oikos');
    };
    const withIndex = filteredScholarships.map((s, idx) => ({ s, idx }));
    withIndex.sort((a, b) => {
      // Prioridade 1: Disponibilidade de candidatura (Bolsas expiradas ou inativas vêm por último)
      const aBlocked = !a.s.is_active || is3800ScholarshipBlocked(a.s);
      const bBlocked = !b.s.is_active || is3800ScholarshipBlocked(b.s);
      
      if (aBlocked !== bBlocked) {
        return aBlocked ? 1 : -1; // Se 'a' estiver bloqueada e 'b' não, a vai para depois
      }

      // Prioridade 2: Universidades parceiras (Caroline/Oikos)
      const aName = a.s.university_name || (a.s as any).universities?.name || '';
      const bName = b.s.university_name || (b.s as any).universities?.name || '';
      const aPr = priorityMatch(aName) ? 0 : 1;
      const bPr = priorityMatch(bName) ? 0 : 1;
      if (aPr !== bPr) return aPr - bPr; 

      // Prioridade 3: Ordem original (estabilidade)
      return a.idx - b.idx;
    });
    const sorted = withIndex.map(x => x.s);
    return sorted.slice(page * pageSize, (page + 1) * pageSize);
  }, [filteredScholarships, page, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchTerm, selectedLevel, selectedField, selectedStudyMode, selectedWorkAuth, maxPrice]);

  // Scroll para a seção de bolsas — chamado ANTES de mudar a página para evitar layout shift
  const scrollToScholarships = (nextPage: number) => {
    // Na página 0 voltando aos destaques, ou em qualquer outra página vai para a listagem
    const targetRef = (nextPage === 0 && featuredSectionRef.current) ? featuredSectionRef : scholarshipsSectionRef;
    if (targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Se usuário já tem application fee paga, mostrar mensagem de bloqueio
  if (isAuthenticated && !applicationFeeLoading && hasPaidApplicationFee) {
    return (
      <ApplicationFeeBlockedMessage
        committedUniversity={committedUniversity}
        committedScholarship={committedScholarship}
      />
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-32 lg:pt-0 lg:pb-0 overflow-hidden bg-[#05294E] min-h-[600px] lg:h-[768px] flex items-center">
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 lg:right-0 lg:left-auto lg:w-[65%]">
            <img 
              src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/university-auditorium-crowded-lecture.webp" 
              alt="University Library" 
              className="w-full h-full object-cover lg:object-center"
            />
            {/* Mobile Overlay */}
            <div className="absolute inset-0 bg-[#05294E]/30 lg:hidden"></div>
            
            {/* Desktop Transition: Solid blue on left to transparent on right */}
            <div className="absolute inset-0 hidden lg:block bg-gradient-to-r from-[#05294E] via-[#05294E]/30 to-transparent"></div>
          </div>
        </div>

        {/* Decorative Glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -right-24 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-1/4 -left-24 w-[600px] h-[600px] bg-[#D0151C]/5 rounded-full blur-[120px]"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-4xl lg:mr-auto">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center lg:text-left"
            >
              <h1 className="text-5xl md:text-7xl lg:text-[100px] font-black text-white mb-8 tracking-tighter leading-[0.85] lg:pr-6">
                <span className="block mb-2">{t('scholarships.title').split(' ').slice(0, -1).join(' ')}</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-blue-200 block pb-2">
                  {t('scholarships.title').split(' ').slice(-1)[0]}
                </span>
              </h1>
              
              <p className="text-xl lg:text-2xl text-white mb-12 max-w-md mx-auto lg:mr-auto lg:ml-0 leading-relaxed font-medium drop-shadow-lg">
                {t('scholarships.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
                <button 
                  onClick={() => document.getElementById('scholarships-filters')?.scrollIntoView({ behavior: 'smooth' })}
                  className="group relative w-full sm:w-auto px-10 py-5 bg-[#D0151C] hover:bg-[#b01218] text-white rounded-2xl font-black text-xl transition-all duration-300 shadow-[0_20px_40px_rgba(208,21,28,0.3)] hover:shadow-[0_25px_50px_rgba(208,21,28,0.4)] hover:-translate-y-1 flex items-center justify-center gap-3 overflow-hidden"
                >
                  <span className="relative z-10">Explorar Bolsas</span>
                  <span className="relative z-10 bg-white/20 p-1 rounded-lg">
                    <ArrowDown className="w-6 h-6 group-hover:translate-y-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Seção de Filtros Premium Unificada */}
      <section id="scholarships-filters" className="relative -mt-10 lg:-mt-16 z-25 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-[#05294E] via-slate-800 to-[#05294E] rounded-[32px] p-6 lg:p-8 shadow-2xl relative overflow-hidden border border-white/10">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-5 left-10 w-56 h-56 bg-[#D0151C]/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-5 right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10">
            {/* Camada 1: Abas de Seleção Superior (Nível Acadêmico) */}
            <div className="mb-4 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-2 sm:inline-flex sm:items-center sm:gap-2">
              <div className="flex items-center px-2 pb-2 sm:pb-0 sm:pr-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  {t('scholarshipsPage.filters.academicLevelLabel')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-900/30 p-1 sm:inline-grid sm:grid-cols-3">
                {levelOptions.filter((level) => level.value !== 'all').map((level) => {
                  const isActive = selectedLevel === level.value;
                  return (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setSelectedLevel(isActive && level.value !== 'all' ? 'all' : level.value)}
                      disabled={scholarshipsLoading}
                      className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                        isActive
                          ? 'bg-white text-[#D0151C] shadow-sm'
                          : 'text-slate-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {level.value === 'undergraduate' && <GraduationCap className="h-3.5 w-3.5 shrink-0" />}
                      {level.value === 'graduate' && <Users className="h-3.5 w-3.5 shrink-0" />}
                      {level.value === 'doctorate' && <Award className="h-3.5 w-3.5 shrink-0" />}
                      <span className="truncate">{level.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Camada 2: Barra Branca Unificada Integrada */}
            <div className="bg-white rounded-[28px] lg:rounded-full p-2.5 flex flex-col lg:flex-row items-center gap-3 lg:gap-4 shadow-2xl">
              
              {/* Coluna 1: Busca Textual */}
              <div className="flex flex-col flex-1 min-w-[200px] w-full px-4 py-1.5 justify-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  {t('scholarshipsPage.filters.studySearchLabel')}
                </span>
                <div className="flex items-center">
                  <Search className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    placeholder={t('scholarships.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-transparent outline-none border-none text-sm font-bold text-slate-800 placeholder-slate-400"
                    disabled={scholarshipsLoading}
                  />
                </div>
              </div>

              {/* Coluna 3: Preço Máximo */}
              <div className="flex flex-col w-full lg:w-36 px-4 py-1.5 justify-center">
                <label htmlFor="max-price-input" className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  {t('scholarshipsPage.filters.maxPriceLabel')}
                </label>
                <div className="flex items-center">
                  <span className="text-sm font-bold text-slate-400 mr-0.5">$</span>
                  <input
                    id="max-price-input"
                    type="number"
                    min={0}
                    max={maxScholarshipValue}
                    value={maxPrice || ''}
                    onChange={e => setMaxPrice(Number(e.target.value))}
                    className="w-full bg-transparent outline-none border-none text-sm font-bold text-slate-700"
                    placeholder={formatAmount(maxScholarshipValue)}
                    disabled={scholarshipsLoading}
                  />
                </div>
              </div>

              {/* Coluna 4: Área de Estudo */}
              <div ref={fieldRef} className="flex flex-col w-full lg:w-52 px-4 py-1 justify-center relative">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5 select-none">
                  {t('scholarshipsPage.filters.fieldOfInterestLabel')}
                </span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setFieldDropdownOpen(!fieldDropdownOpen);
                      setWorkDropdownOpen(false);
                    }}
                    disabled={scholarshipsLoading}
                    className="w-full flex items-center justify-between bg-transparent outline-none border-none text-sm font-bold text-slate-700 cursor-pointer pr-1 py-0.5 hover:text-slate-900 transition-colors text-left"
                  >
                    <span className="truncate">{currentFieldLabel}</span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-300 ${fieldDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {fieldDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-2 w-full bg-white shadow-2xl rounded-2xl border border-slate-100 py-1.5 z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                      {fieldOptions.map((opt) => {
                        const isSelected = selectedField === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSelectedField(opt.value);
                              setFieldDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-xs font-bold transition-all duration-200 flex items-center justify-between ${
                              isSelected
                                ? 'bg-[#05294E]/5 text-[#05294E] font-black'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna 5: Permissão de Trabalho */}
              <div ref={workRef} className="flex flex-col w-full lg:w-52 px-4 py-1 justify-center relative">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5 select-none">
                  {t('scholarshipsPage.filters.visaPermissionLabel')}
                </span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setWorkDropdownOpen(!workDropdownOpen);
                      setFieldDropdownOpen(false);
                    }}
                    disabled={scholarshipsLoading}
                    className="w-full flex items-center justify-between bg-transparent outline-none border-none text-sm font-bold text-slate-700 cursor-pointer pr-1 py-0.5 hover:text-slate-900 transition-colors text-left"
                  >
                    <span className="truncate">{currentWorkLabel}</span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-300 ${workDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {workDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-2 w-full bg-white shadow-2xl rounded-2xl border border-slate-100 py-1.5 z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                      {workOptions.map((opt) => {
                        const isSelected = selectedWorkAuth === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSelectedWorkAuth(opt.value);
                              setWorkDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-xs font-bold transition-all duration-200 flex items-center justify-between ${
                              isSelected
                                ? 'bg-[#05294E]/5 text-[#05294E] font-black'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Botão Buscar Integrado na Extremidade Direita */}
              <div className="w-full lg:w-auto p-1 shrink-0 self-stretch lg:self-auto flex items-center">
                <button
                  type="button"
                  className="w-full lg:w-auto bg-[#D0151C] hover:bg-[#D0151C]/90 text-white font-black px-8 py-4 rounded-[22px] lg:rounded-full flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-95 shadow-md shadow-[#D0151C]/25 text-sm shrink-0"
                  disabled={scholarshipsLoading}
                >
                  <Search className="h-4.5 w-4.5" />
                  <span>{t('scholarshipsPage.filters.searchButton')}</span>
                </button>
              </div>
            </div>

            {/* Camada 3: Atalhos Rápidos de Modalidades e Ações Inferiores */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 px-2 sm:px-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest shrink-0">
                  {t('scholarshipsPage.filters.modalitiesLabel')}
                </span>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {[
                    { value: 'online', label: t('scholarshipsPage.filters.online') },
                    { value: 'in_person', label: t('scholarshipsPage.filters.inPerson') },
                    { value: 'hybrid', label: t('scholarshipsPage.filters.hybrid') },
                  ].map((mode) => {
                    const isActive = selectedStudyMode === mode.value;
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setSelectedStudyMode(isActive && mode.value !== 'all' ? 'all' : mode.value)}
                        disabled={scholarshipsLoading}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 border ${
                          isActive
                            ? 'bg-white text-[#05294E] border-white/20 shadow-md font-extrabold'
                            : 'bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border-white/10 shadow-sm'
                        }`}
                      >
                        {mode.value === 'online' && <Laptop className="h-3 w-3" />}
                        {mode.value === 'in_person' && <Building className="h-3 w-3" />}
                        {mode.value === 'hybrid' && <Globe className="h-3 w-3" />}
                        <span>{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botão de Limpar e Resultados */}
              <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                {/* Botão Limpar Filtros */}
                {(searchTerm !== '' ||
                  selectedLevel !== 'all' ||
                  selectedField !== 'all' ||
                  selectedStudyMode !== 'all' ||
                  selectedWorkAuth !== 'all' ||
                  maxPrice !== 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedLevel('all');
                      setSelectedField('all');
                      setSelectedStudyMode('all');
                      setSelectedWorkAuth('all');
                      setMaxPrice(0);
                      setFieldDropdownOpen(false);
                      setWorkDropdownOpen(false);
                      localStorage.removeItem('scholarshipsPageFilters');
                    }}
                    disabled={scholarshipsLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-red-200 hover:text-red-100 bg-red-500/10 hover:bg-red-500/20 transition-colors shadow-sm cursor-pointer border border-red-500/20"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{t('scholarshipsPage.filters.clearButton')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 relative z-20">
        {/* Featured Scholarships Section */}
        {scholarshipsLoading ? (
          // Skeleton para a seção de destaques durante o carregamento
          <div className="mb-12 scroll-mt-24" ref={featuredSectionRef}>
            <div className="text-center mb-8">
              <div className="h-10 bg-slate-200 rounded-lg w-80 mx-auto mb-4 animate-pulse" />
              <div className="h-5 bg-slate-100 rounded w-96 mx-auto animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden animate-pulse">
                  <div className="w-full aspect-[8/3] bg-slate-200" />
                  <div className="p-5 space-y-4">
                    <div className="h-6 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                    <div className="space-y-2">
                      <div className="h-10 bg-slate-100 rounded-xl" />
                      <div className="h-10 bg-slate-100 rounded-xl" />
                    </div>
                    <div className="h-12 bg-slate-200 rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredFeaturedScholarships.length > 0 && (
          <div className="mb-12 scroll-mt-24" ref={featuredSectionRef}>
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                <span className="text-[#05294E]">{t('scholarshipsPage.featuredSection.subtitle')}</span>
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                {t('scholarshipsPage.featuredSection.description')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
              {filteredFeaturedScholarships.slice(0, 6).map((scholarship) => {
                // const deadlineStatus = getDeadlineStatus(scholarship.deadline);
                const daysLeft = getDaysUntilDeadline(scholarship.deadline);
                const originalValue = scholarship.original_annual_value ?? 0;
                const scholarshipValue = scholarship.annual_value_with_scholarship ?? 0;
                const savings = originalValue - scholarshipValue;
                const savingsPercentage = originalValue > 0 ? Math.round((savings / originalValue) * 100) : 0;

                return (
                  <article
                    key={scholarship.id}
                    onClick={() => navigate(`/scholarships/${scholarship.id}`)}
                    className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200 hover:-translate-y-3 hover:border-[#05294E]/20 focus-within:ring-2 focus-within:ring-[#05294E]/50 flex flex-col h-full cursor-pointer"
                    role="article"
                    aria-labelledby={`featured-scholarship-title-${scholarship.id}`}
                  >
                    {/* Overlay de blur quando não autenticado */}

                    {/* <div className="absolute top-4 right-4 z-10">
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg backdrop-blur-sm border border-white/20 flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        {t('common.featured')}
                      </div>
                    </div> */}

                    {/* Deadline Urgency Indicator */}
                    {daysLeft <= 7 && daysLeft > 0 && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-500 z-10"></div>
                    )}
                    {daysLeft <= 3 && daysLeft > 0 && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600 z-10 animate-pulse"></div>
                    )}

                    {/* Scholarship Image Banner (Overlay Layout) */}
                    <div className="relative w-full aspect-[8/3] bg-white z-10 overflow-hidden border-b border-slate-100 shrink-0 group">
                      
                      {/* Full Background Image */}
                      <div className="absolute inset-0 z-0">
                        {(scholarship.image_url || scholarship.universities?.image_url || scholarship.universities?.logo_url) ? (
                          <img
                            src={scholarship.image_url || scholarship.universities?.image_url || scholarship.universities?.logo_url || ''}
                            alt={scholarship.title}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full bg-slate-50 text-slate-400">
                            <Building className="h-12 w-12 text-[#05294E]/20" />
                          </div>
                        )}
                      </div>

                      {/* Text Overlay Layer (Left side fade) */}
                      <div className="absolute inset-y-0 left-0 w-[60%] sm:w-[70%] z-10 bg-gradient-to-r from-white via-white/95 to-transparent flex flex-col justify-center pl-5 pr-12">
                        {/* Top Left Logo */}
                        <div className="absolute top-5 left-5">
                          <img 
                            src="/logo.png" 
                            alt="Matricula USA" 
                            className="h-6 w-auto object-contain mb-1.5 drop-shadow-sm" 
                          />
                        </div>
                        
                        {/* Course / Field as Main Banner Text */}
                        <p className="w-[95%] sm:w-[85%] md:w-[75%] text-base md:text-lg font-black font-['Montserrat',sans-serif] text-slate-900 line-clamp-4 pt-0.5 mt-10" style={{ lineHeight: 0.95 }}>
                          {scholarship.field_of_study || t('scholarshipsPage.filters.anyField')}
                        </p>
                      </div>
                      
                      {/* Top Right Badges */}
                      <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
                        {/* Exclusive Badge */}
                        {scholarship.is_exclusive && (
                          <div className="bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1.5">
                            <Star className="h-3 w-3" />
                            {t('common.exclusive')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col z-0">
                      {/* Title */}
                      <h3 id={`featured-scholarship-title-${scholarship.id}`} className="text-lg sm:text-xl font-black text-slate-900 mb-2 leading-tight line-clamp-2">
                        {scholarship.title}
                      </h3>
                      
                      {/* Field and Level Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm flex items-center gap-1.5 ${getFieldBadgeColor(scholarship.field_of_study)}`}>
                          <GraduationCap className="h-3.5 w-3.5" strokeWidth={2.5} />
                          <span className="whitespace-normal break-words">{scholarship.field_of_study || t('scholarshipsPage.filters.anyField')}</span>
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 w-fit">
                          {React.cloneElement(getLevelIcon(scholarship.level || 'undergraduate'), {
                            className: "h-3.5 w-3.5",
                            strokeWidth: 2.5
                          })}
                          <span className="capitalize">{levelOptions.find(option => option.value === scholarship.level)?.label || t('scholarshipsPage.filters.allLevels')}</span>
                        </span>
                      </div>

                        {/* Info Boxes Section */}
                        <div className="space-y-1.5 mb-3">
                          {/* University Info Box */}
                          <div className="flex items-center gap-3 py-1">
                            <div className="w-16 h-16 rounded-lg bg-white shadow-sm flex items-center justify-center border border-slate-200 flex-shrink-0 overflow-hidden">
                              <div className="relative w-full h-full flex items-center justify-center">
                                {scholarship.universities?.logo_url ? (
                                  <div className="relative w-full h-full flex items-center justify-center">
                                    <img 
                                      src={canViewSensitive ? scholarship.universities.logo_url : "https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/universities-logo/University_lock_icon.webp"} 
                                      alt={canViewSensitive ? (scholarship.universities.name || "University Logo") : "University Logo"} 
                                      className={`w-full h-full object-contain p-2 transition-all duration-500 ${!canViewSensitive ? 'blur-[4px] opacity-50' : ''}`} 
                                    />
                                    {!canViewSensitive && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-white/60 backdrop-blur-[2px] p-1.5 rounded-full shadow-sm border border-white/50">
                                          <Lock className="h-3.5 w-3.5 text-slate-600" />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="relative w-full h-full flex items-center justify-center">
                                    <Building className={`h-8 w-8 text-[#05294E]/20 ${!canViewSensitive ? 'blur-[2px]' : ''}`} />
                                    {!canViewSensitive && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <Lock className="h-4 w-4 text-slate-400/80" />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                                {t('scholarshipsPage.scholarshipCard.university')}
                              </p>
                              <p className={`text-sm font-bold truncate ${shouldApplyBlur ? 'blur-sm text-slate-400' : 'text-slate-700'}`}>
                                {canViewSensitive
                                  ? (featuredUniversities.find(u => u.id === scholarship.university_id)?.name || 'Unknown University')
                                  : '********'}
                              </p>
                            </div>
                          </div>

                          {/* Course Modality */}
                          {scholarship.delivery_mode && (
                            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-700">
                                  {t('scholarshipsPage.scholarshipCard.studyMode')}
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tight text-slate-900">
                                {getDeliveryModeLabel(scholarship.delivery_mode)}
                              </span>
                            </div>
                          )}

                          {/* Work Permissions */}
                          {scholarship.work_permissions && scholarship.work_permissions.length > 0 && (
                            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
                              <span className="text-xs font-bold text-slate-700 whitespace-nowrap mr-2">
                                {t('scholarshipsPage.scholarshipCard.workAuthorization')}
                              </span>
                              <div className="flex flex-wrap justify-end gap-1.5">
                                {scholarship.work_permissions.filter((p: any) => String(p).toUpperCase() !== 'F1').map((permission: string, index: number) => (
                                  <span
                                    key={index}
                                    className="px-2 py-0.5 bg-gray-100 text-slate-700 rounded-md text-[10px] font-black uppercase border border-gray-200"
                                  >
                                    {permission}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Financial Overview Table View */}
                        <div className="mb-4 px-4 sm:px-5">
                          <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm group-hover:shadow-md transition-shadow duration-300">
                            <h4 className="text-[11px] font-black text-slate-800 mb-3 flex items-center gap-1.5 uppercase tracking-widest">
                              <DollarSign className="h-3.5 w-3.5 text-green-600" />
                              {t('scholarshipsPage.scholarshipCard.financialOverview')}
                            </h4>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 text-xs font-medium">{t('scholarshipsPage.scholarshipCard.originalPrice')}</span>
                                <span className="text-slate-500 text-xs font-bold line-through">
                                  ${formatAmount(originalValue)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 text-xs font-medium">{t('scholarshipsPage.scholarshipCard.withScholarship')}</span>
                                <span className="text-green-700 font-extrabold text-base">
                                  ${formatAmount(scholarshipValue)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                                <span className="text-slate-400 text-xs font-medium">{t('scholarshipsPage.scholarshipCard.perCredit')}</span>
                                <span className="text-slate-500 text-xs font-bold">
                                  ${formatAmount(scholarship.original_value_per_credit ?? 0)}
                                </span>
                              </div>

                              {/* Discount Percentage Line */}
                              {savingsPercentage > 0 && (
                                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                                  <span className="text-slate-400 text-xs font-medium">
                                    {t('scholarshipsPage.scholarshipCard.scholarshipDiscount')}
                                  </span>
                                  <span className="text-green-600 text-xs font-black">{savingsPercentage}% OFF</span>
                                </div>
                              )}

                              {/* Placement Fee - exibir apenas para novos usuários */}
                              {userProfile?.placement_fee_flow && (() => {
                                const annualValue = scholarship.annual_value_with_scholarship ? Number(scholarship.annual_value_with_scholarship) : Number(scholarship.amount) || 0;
                                const placementFeeAmount = scholarship.placement_fee_amount ? Number(scholarship.placement_fee_amount) : null;
                                const placementFee = getPlacementFee(annualValue, placementFeeAmount);
                                return (
                                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                                    <span className="text-slate-400 text-xs font-medium">Placement Fee</span>
                                    <span className="text-blue-600 text-xs font-black">{formatCurrency(placementFee)}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                      {/* Action Buttons - Removed as card is clickable now */}
                      {!scholarship.is_active && (
                        <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg z-10">
                          <AlertTriangle className="h-3 w-3" />
                          Expirada
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* All Scholarships Section */}
        <div className="mb-12 scroll-mt-24" ref={scholarshipsSectionRef}>
          {filteredScholarships.length > 0 && (
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                <span className="text-[#05294E]">{t('scholarshipsPage.allScholarships.title')}</span>
              </h2>

            </div>
          )}

          {/* Scholarships Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {scholarshipsLoading ? (
              // Skeleton cards during loading
              Array.from({ length: pageSize }).map((_, i) => (
                 <div key={i} className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 animate-pulse">
                   <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
                   <div className="h-4 bg-slate-200 rounded w-1/2 mb-8"></div>
                   <div className="space-y-3">
                     <div className="h-10 bg-slate-200 rounded"></div>
                     <div className="h-10 bg-slate-200 rounded"></div>
                     <div className="h-10 bg-slate-200 rounded"></div>
                   </div>
                   <div className="mt-6 h-12 bg-slate-200 rounded-xl"></div>
                 </div>
               ))
             ) : error ? (
               <div className="col-span-full text-center text-slate-500 py-12">
                 <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                 <p>{error}</p>
               </div>
             ) : paginatedScholarships.length === 0 ? (
               <div className="col-span-full text-center text-slate-500 py-12">
                 <div className="bg-gradient-to-br from-slate-100 to-slate-200 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
                   <Award className="h-16 w-16 text-slate-400" />
                 </div>
                 <h3 className="text-3xl font-bold text-slate-600 mb-4">{t('scholarshipsPage.noResults.title')}</h3>
                 <p className="text-slate-500 text-lg mb-8">{t('scholarshipsPage.noResults.description')}</p>
                 <button 
                   onClick={() => {
                     setSearchTerm('');
                                           setSelectedLevel('all');
                      setSelectedField('all');
                      setSelectedStudyMode('all');
                      setSelectedWorkAuth('all');
                       setMaxPrice(0);
                      localStorage.removeItem('scholarshipsPageFilters');
                   }}
                   className="bg-[#05294E] text-white px-8 py-3 rounded-2xl hover:bg-[#05294E]/90 transition-all duration-300 font-bold"
                 >
                   {t('scholarshipsPage.noResults.clearFilters')}
                 </button>
               </div>
             ) : (
               paginatedScholarships.map((scholarship: Scholarship) => {
                 // const deadlineStatus = getDeadlineStatus(scholarship.deadline);
                 const daysLeft = getDaysUntilDeadline(scholarship.deadline);
                 const originalValue = scholarship.original_annual_value ?? 0;
                 const scholarshipValue = scholarship.annual_value_with_scholarship ?? 0;
                 const savings = originalValue - scholarshipValue;
                 const savingsPercentage = originalValue > 0 ? Math.round((savings / originalValue) * 100) : 0;
                 
                 return (
                   <article
                     key={scholarship.id}
                     onClick={() => navigate(`/scholarships/${scholarship.id}`)}
                     className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden hover:-translate-y-3 hover:border-[#05294E]/20 focus-within:ring-2 focus-within:ring-[#05294E]/50 flex flex-col h-full cursor-pointer"
                     role="article"
                     aria-labelledby={`scholarship-title-${scholarship.id}`}
                   >
                     {/* Deadline Urgency Indicator */}
                     {daysLeft <= 7 && daysLeft > 0 && (
                       <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-500 z-10"></div>
                     )}
                     {daysLeft <= 3 && daysLeft > 0 && (
                       <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600 z-10 animate-pulse"></div>
                     )}

                    {/* Scholarship Image Banner (Overlay Layout) */}
                    <div className="relative w-full aspect-[8/3] bg-white z-10 overflow-hidden border-b border-slate-100 shrink-0 group">
                      
                      {/* Full Background Image */}
                      <div className="absolute inset-0 z-0">
                        {(scholarship.image_url || scholarship.universities?.image_url || scholarship.universities?.logo_url) && canViewSensitive ? (
                          <img
                            src={scholarship.image_url || scholarship.universities?.image_url || scholarship.universities?.logo_url || ''}
                            alt={scholarship.title}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full bg-slate-50 text-slate-400">
                            <Building className="h-12 w-12 text-[#05294E]/20" />
                          </div>
                        )}
                      </div>

                      {/* Text Overlay Layer (Left side fade) */}
                      <div className="absolute inset-y-0 left-0 w-[60%] sm:w-[70%] z-10 bg-gradient-to-r from-white via-white/95 to-transparent flex flex-col justify-center pl-5 pr-12">
                        {/* Top Left Logo */}
                        <div className="absolute top-5 left-5">
                          <img 
                            src="/logo.png" 
                            alt="Matricula USA" 
                            className="h-6 w-auto object-contain mb-1.5 drop-shadow-sm" 
                          />
                        </div>
                        
                        {/* Course / Field as Main Banner Text */}
                        <p className="w-[95%] sm:w-[85%] md:w-[75%] text-base md:text-lg font-black font-['Montserrat',sans-serif] text-slate-900 line-clamp-4 pt-0.5 mt-10" style={{ lineHeight: 0.85 }}>
                          {scholarship.field_of_study || t('scholarshipsPage.filters.anyField')}
                        </p>
                      </div>
                      
                      {/* Top Right Badges */}
                      <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
                        {/* Exclusive Badge */}
                        {scholarship.is_exclusive && (
                          <div className="bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1.5">
                            <Star className="h-3 w-3" />
                            {t('common.exclusive')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col z-0">
                      {/* Title */}
                      <h3 id={`scholarship-title-${scholarship.id}`} className="text-lg sm:text-xl font-black text-slate-900 mb-2 leading-tight line-clamp-2">
                        {scholarship.title}
                      </h3>
                      
                      {/* Field and Level Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm flex items-center gap-1.5 ${getFieldBadgeColor(scholarship.field_of_study)}`}>
                          <GraduationCap className="h-3.5 w-3.5" strokeWidth={2.5} />
                          <span className="whitespace-normal break-words">{scholarship.field_of_study || t('scholarshipsPage.filters.anyField')}</span>
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 w-fit">
                          {React.cloneElement(getLevelIcon(scholarship.level || 'undergraduate'), {
                            className: "h-3.5 w-3.5",
                            strokeWidth: 2.5
                          })}
                          <span className="capitalize">{levelOptions.find(option => option.value === scholarship.level)?.label || t('scholarshipsPage.filters.allLevels')}</span>
                        </span>
                      </div>

                          {/* Info Boxes Section */}
                          <div className="space-y-1.5 mb-3">
                            {/* University Info Box */}
                            <div className="flex items-center gap-3 py-1">
                              <div className="w-16 h-16 rounded-lg bg-white shadow-sm flex items-center justify-center border border-slate-200 flex-shrink-0 overflow-hidden">
                                <div className="relative w-full h-full flex items-center justify-center">
                                  {scholarship.universities?.logo_url ? (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                      <img 
                                        src={canViewSensitive ? scholarship.universities.logo_url : "https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/universities-logo/University_lock_icon.webp"} 
                                        alt={canViewSensitive ? (scholarship.universities.name || "University Logo") : "University Logo"} 
                                        className={`w-full h-full object-contain p-2 transition-all duration-500 ${!canViewSensitive ? 'blur-[4px] opacity-50' : ''}`} 
                                      />
                                      {!canViewSensitive && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="bg-white/60 backdrop-blur-[2px] p-1.5 rounded-full shadow-sm border border-white/50">
                                            <Lock className="h-3.5 w-3.5 text-slate-600" />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                      <Building className={`h-8 w-8 text-[#05294E]/20 ${!canViewSensitive ? 'blur-[2px]' : ''}`} />
                                      {!canViewSensitive && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <Lock className="h-4 w-4 text-slate-400/80" />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                                  {t('scholarshipsPage.scholarshipCard.university')}
                                </p>
                                <p className={`text-sm font-bold truncate ${shouldApplyBlur ? 'blur-sm text-slate-400' : 'text-slate-700'}`}>
                                  {canViewSensitive
                                    ? (scholarship.universities?.name || scholarship.university_name || 'Unknown University')
                                    : '********'}
                                </p>
                              </div>
                            </div>

                            {/* Course Modality */}
                            {scholarship.delivery_mode && (
                              <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-700">
                                    {t('scholarshipsPage.scholarshipCard.studyMode')}
                                  </span>
                                </div>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tight text-slate-900">
                                  {getDeliveryModeLabel(scholarship.delivery_mode)}
                                </span>
                              </div>
                            )}

                             {/* Work Permissions */}
                             {scholarship.work_permissions && scholarship.work_permissions.length > 0 && (
                               <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
                                 <span className="text-xs font-bold text-slate-700 whitespace-nowrap mr-2">
                                   {t('scholarshipsPage.scholarshipCard.workAuthorization')}
                                 </span>
                                 <div className="flex flex-wrap justify-end gap-1.5">
                                   {scholarship.work_permissions.map((permission, index) => (
                                     <span
                                       key={index}
                                       className="px-2 py-0.5 bg-gray-100 text-slate-700 rounded-md text-[10px] font-black uppercase border border-gray-200"
                                     >
                                       {permission}
                                     </span>
                                   ))}
                                 </div>
                               </div>
                             )}
                           </div>

                          {/* Financial Overview Table View */}
                          <div className="mb-4">
                            <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm group-hover:shadow-md transition-shadow duration-300">
                              <h4 className="text-[11px] font-black text-slate-800 mb-3 flex items-center gap-1.5 uppercase tracking-widest">
                                <DollarSign className="h-3.5 w-3.5 text-green-600" />
                                {t('scholarshipsPage.scholarshipCard.financialOverview')}
                              </h4>
                              
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 text-xs font-medium">{t('scholarshipsPage.scholarshipCard.originalPrice')}</span>
                                  <span className="text-slate-500 text-xs font-bold line-through">
                                    ${formatAmount(originalValue)}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 text-xs font-medium">{t('scholarshipsPage.scholarshipCard.withScholarship')}</span>
                                  <span className="text-green-700 font-extrabold text-base">
                                    ${formatAmount(scholarshipValue)}
                                  </span>
                                </div>
                                
                                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                                  <span className="text-slate-400 text-xs font-medium">{t('scholarshipsPage.scholarshipCard.perCredit')}</span>
                                  <span className="text-slate-500 text-xs font-bold">
                                    ${formatAmount(scholarship.original_value_per_credit ?? 0)}
                                  </span>
                                </div>
                                
                                {/* Discount Percentage Line */}
                                {savingsPercentage > 0 && (
                                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                                    <span className="text-slate-400 text-xs font-medium">
                                      {t('scholarshipsPage.scholarshipCard.scholarshipDiscount')}
                                    </span>
                                    <span className="text-green-600 text-xs font-black">{savingsPercentage}% OFF</span>
                                  </div>
                                )}

                                {/* Placement Fee - exibir apenas para novos usuários */}
                                {userProfile?.placement_fee_flow && (() => {
                                  const annualValue = scholarship.annual_value_with_scholarship ? Number(scholarship.annual_value_with_scholarship) : Number(scholarship.amount) || 0;
                                  const placementFeeAmount = scholarship.placement_fee_amount ? Number(scholarship.placement_fee_amount) : null;
                                  const placementFee = getPlacementFee(annualValue, placementFeeAmount);
                                  return (
                                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                                      <span className="text-slate-400 text-xs font-medium">Placement Fee</span>
                                      <span className="text-blue-600 text-xs font-black">{formatCurrency(placementFee)}</span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>

                        {/* Action Buttons - Removed as card is clickable now */}
                        {!scholarship.is_active && (
                          <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg z-10">
                            <AlertTriangle className="h-3 w-3" />
                            Expirada
                          </div>
                        )}
                      </div>
                     
                     {/* Enhanced Hover Effect Overlay */}
                     <div className="absolute inset-0 bg-gradient-to-t from-[#05294E]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                     
                     {/* Subtle Border Animation */}
                     <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                       <div className="absolute inset-0 rounded-3xl border-2 border-[#05294E]/20 animate-pulse"></div>
                     </div>
                   </article>
                 );
               })
             )}
           </div>
         </div>

        {/* Call to Action */}

        {/* Paginação Premium */}
        {totalCount > pageSize && (
          <div className="flex justify-center items-center gap-16 sm:gap-24 mt-16 mb-8">
            <button
              className="group flex items-center justify-center gap-2 px-5 py-3 sm:px-6 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-[#05294E] hover:text-white hover:border-[#05294E] hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-600 disabled:hover:border-slate-200 disabled:hover:shadow-none"
              onClick={() => { const next = Math.max(0, page - 1); scrollToScholarships(next); setPage(next); }}
              disabled={page === 0 || scholarshipsLoading}
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline">{t('scholarshipsPage.pagination.previous')}</span>
            </button>
            
            <div className="flex items-center">
              <span className="text-slate-500 font-medium text-sm sm:text-base">
                <span className="hidden sm:inline">{t('scholarshipsPage.pagination.page')}</span> <span className="text-[#05294E] font-black mx-1 text-base sm:text-lg">{page + 1}</span> <span className="hidden sm:inline">{t('scholarshipsPage.pagination.of')}</span><span className="sm:hidden">/</span> <span className="text-[#05294E] font-black ml-1 text-base sm:text-lg">{Math.ceil(totalCount / pageSize) || 1}</span>
              </span>
            </div>

            <button
              className="group flex items-center justify-center gap-2 px-5 py-3 sm:px-6 rounded-2xl bg-[#05294E] border border-[#05294E] text-white font-bold hover:bg-[#05294E]/90 hover:shadow-lg hover:shadow-[#05294E]/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#05294E] disabled:hover:shadow-none"
              onClick={() => { const next = Math.min(Math.ceil(totalCount / pageSize) - 1, page + 1); scrollToScholarships(next); setPage(next); }}
              disabled={(page + 1) * pageSize >= totalCount || scholarshipsLoading}
            >
              <span className="hidden sm:inline">{t('scholarshipsPage.pagination.next')}</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>



      <SmartChat />
    </div>
  );
};

export default Scholarships;
