import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  Award,
  CheckCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useDynamicFees } from '../../hooks/useDynamicFees';
import { supabase } from '../../lib/supabase';
import { STRIPE_PRODUCTS } from '../../stripe-config';
import ScholarshipDetailModal from '../../components/ScholarshipDetailModal';
import { PreCheckoutModal } from '../../components/PreCheckoutModal';
import { PaymentMethodSelectorDrawer } from '../../components/PaymentMethodSelectorDrawer';
import { ApplicationFeeBlockedMessage } from '../../components/ApplicationFeeBlockedMessage';
import { useApplicationFeeStatus } from '../../hooks/useApplicationFeeStatus';
import { useScholarshipsQuery } from '../../hooks/useStudentDashboardQueries';

import { ScholarshipCardFull } from '../StudentOnboarding/components/ScholarshipCardFull';

const ScholarshipBrowser: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'scholarships', 'common']);
  const { selectionProcessFee } = useDynamicFees();

  // Busca de bolsas via React Query (cache compartilhado, sem duplicação de chamadas)
  const { data: scholarships = [] } = useScholarshipsQuery();

  // Universidades a serem ocultadas (case-insensitive, igualdade exata de nome)
  const EXCLUDED_UNIVERSITY_NAMES = useMemo(() => new Set([
    'Test Universit',
  ].map((s) => s.toLowerCase())), []);
  const isExcludedUniversityName = (name?: string) => {
    if (!name) return false;
    return EXCLUDED_UNIVERSITY_NAMES.has(String(name).toLowerCase());
  };

  // Hook para verificar se usuário já tem application fee paga
  const {
    hasPaidApplicationFee,
    committedUniversity,
    committedScholarship,
    loading: applicationFeeLoading
  } = useApplicationFeeStatus();

  // Hook de pacote removido (não utilizado)

  // Obter dados do usuário primeiro
  const { userProfile, user, refetchUserProfile } = useAuth();

  const getDeliveryModeLabel = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'online':
        return t('studentDashboard.findScholarships.filters.online');
      case 'in_person':
        return t('studentDashboard.findScholarships.scholarshipCard.inPerson');
      case 'hybrid':
        return t('studentDashboard.findScholarships.filters.hybrid');
      default:
        return t('studentDashboard.findScholarships.scholarshipCard.mixed');
    }
  };



  // Obter faixa de bolsa desejada do perfil do usuário
  // ✅ Se for null/undefined, aluno verá TODAS as bolsas (sem filtro de valor)
  const desiredScholarshipRange = (userProfile as any)?.desired_scholarship_range ?? null;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedField, setSelectedField] = useState('all');
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState('all');
  const [selectedWorkPermission, setSelectedWorkPermission] = useState('all');
  const [selectedUniversity, setSelectedUniversity] = useState('all');
  const [sortBy] = useState('deadline');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const navigate = useNavigate();
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('');
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [featuredScholarships, setFeaturedScholarships] = useState<any[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  // Approved universities filter: keep only scholarships from approved universities
  const [approvedUniversityIds, setApprovedUniversityIds] = useState<Set<number>>(new Set());

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); // 12 bolsas por página

  // Estados para o PreCheckoutModal (Matricula Rewards)
  const [showPreCheckoutModal, setShowPreCheckoutModal] = useState(false);
  const [selectedScholarshipForCheckout, setSelectedScholarshipForCheckout] = useState<any>(null);
  const [isOpeningStripe, setIsOpeningStripe] = useState(false);

  // Estados para PaymentMethodSelector
  const [showPaymentMethodSelector, setShowPaymentMethodSelector] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'zelle' | 'pix' | 'parcelow' | null>(null);
  const [finalAmount, setFinalAmount] = useState<number>(0);
  const [discountCode, setDiscountCode] = useState<string>('');
  // Estados para filtros aplicados (separados dos valores dos campos)
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedLevel, setAppliedLevel] = useState('all');
  const [appliedField, setAppliedField] = useState('all');
  const [appliedDeliveryMode, setAppliedDeliveryMode] = useState('all');
  const [appliedWorkPermission, setAppliedWorkPermission] = useState('all');
  const [appliedMinValue, setAppliedMinValue] = useState('');
  const [appliedMaxValue, setAppliedMaxValue] = useState('');
  const [appliedDeadlineDays, setAppliedDeadlineDays] = useState('');
  const [appliedUniversity, setAppliedUniversity] = useState('all');

  // Opções dinâmicas deduzidas das bolsas
  const {
    uniqueLevels,
    uniqueFields,
    uniqueDeliveryModes,
    uniqueWorkPermissions,
    uniqueUniversities
  } = useMemo(() => {
    const levelSet = new Set<string>();
    const fieldSet = new Set<string>();
    const deliverySet = new Set<string>();
    const workPermSet = new Set<string>();
    const universitiesMap = new Map<string | number, { id: string | number; name: string }>();

    (scholarships || []).forEach((s: any) => {
      if (s?.level && typeof s.level === 'string') levelSet.add(s.level);
      if (s?.field_of_study && typeof s.field_of_study === 'string') fieldSet.add(s.field_of_study);
      if (s?.delivery_mode && typeof s.delivery_mode === 'string') deliverySet.add(s.delivery_mode);
      if (Array.isArray(s?.work_permissions)) {
        s.work_permissions.forEach((wp: any) => {
          if (typeof wp === 'string' && wp.trim() !== '' && wp.trim().toUpperCase() !== 'F1') workPermSet.add(wp);
        });
      }
      const uniId = s?.universities?.id ?? s?.university_id;
      const uniName = s?.universities?.name ?? s?.university_name;
      if (uniId !== undefined && uniId !== null && !isExcludedUniversityName(uniName)) {
        universitiesMap.set(uniId, { id: uniId, name: uniName || String(uniId) });
      }
    });

    return {
      uniqueLevels: Array.from(levelSet).sort(),
      uniqueFields: Array.from(fieldSet).sort(),
      uniqueDeliveryModes: Array.from(deliverySet).sort(),
      uniqueWorkPermissions: Array.from(workPermSet).sort(),
      uniqueUniversities: Array.from(universitiesMap.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)))
    };
  }, [scholarships]);



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
    setAppliedUniversity(selectedUniversity);

    setFiltersApplied(true);

    // Feedback visual
    setTimeout(() => {
      setFiltersApplied(false);
      setIsApplyingFilters(false);
    }, 2000);
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
    setSelectedUniversity('all');

    // Limpar filtros aplicados
    setAppliedSearch('');
    setAppliedLevel('all');
    setAppliedField('all');
    setAppliedDeliveryMode('all');
    setAppliedWorkPermission('all');
    setAppliedMinValue('');
    setAppliedMaxValue('');
    setAppliedDeadlineDays('');
    setAppliedUniversity('all');

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
          internal_fees,
          universities (
            id,
            name,
            logo_url,
            university_fees_page_url
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
      selectedUniversity,
      minValue,
      maxValue,
      deadlineDays,
      // Filtros aplicados
      appliedSearch,
      appliedLevel,
      appliedField,
      appliedDeliveryMode,
      appliedWorkPermission,
      appliedUniversity,
      appliedMinValue,
      appliedMaxValue,
      appliedDeadlineDays
    };
    localStorage.setItem('scholarshipFilters', JSON.stringify(filters));
  }, [searchTerm, selectedLevel, selectedField, selectedDeliveryMode, selectedWorkPermission, selectedUniversity, minValue, maxValue, deadlineDays, appliedSearch, appliedLevel, appliedField, appliedDeliveryMode, appliedWorkPermission, appliedUniversity, appliedMinValue, appliedMaxValue, appliedDeadlineDays]);

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
        if (filters.selectedUniversity) setSelectedUniversity(filters.selectedUniversity);
        if (filters.minValue) setMinValue(filters.minValue);
        if (filters.maxValue) setMaxValue(filters.maxValue);
        if (filters.deadlineDays) setDeadlineDays(filters.deadlineDays);

        // Restaurar filtros aplicados
        if (filters.appliedSearch !== undefined) setAppliedSearch(filters.appliedSearch);
        if (filters.appliedLevel) setAppliedLevel(filters.appliedLevel);
        if (filters.appliedField) setAppliedField(filters.appliedField);
        if (filters.appliedDeliveryMode) setAppliedDeliveryMode(filters.appliedDeliveryMode);
        if (filters.appliedWorkPermission) setAppliedWorkPermission(filters.appliedWorkPermission);
        if (filters.appliedUniversity) setAppliedUniversity(filters.appliedUniversity);
        if (filters.appliedMinValue !== undefined) setAppliedMinValue(filters.appliedMinValue);
        if (filters.appliedMaxValue !== undefined) setAppliedMaxValue(filters.appliedMaxValue);
        if (filters.appliedDeadlineDays !== undefined) setAppliedDeadlineDays(filters.appliedDeadlineDays);
      } catch (error) {
        // Error loading saved filters
      }
    }
  }, []);

  // Carregar bolsas destacadas quando o componente montar
  useEffect(() => {
    loadFeaturedScholarships();
  }, []);


  // Load approved universities (ids) so we can exclude scholarships from unapproved schools
  useEffect(() => {
    const loadApprovedUniversities = async () => {
      try {
        const { data, error } = await supabase
          .from('universities')
          .select('id')
          .eq('is_approved', true);

        if (error) {
          console.error('Error loading approved universities:', error);
          return;
        }

        const ids = new Set((data || []).map((u: any) => u.id));
        setApprovedUniversityIds(ids);
      } catch (err) {
        console.error('Error loading approved universities:', err);
      }
    };

    loadApprovedUniversities();
  }, []);



  // Estados para o modal de detalhes
  const [selectedScholarshipForModal, setSelectedScholarshipForModal] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);



  // Remover reload automático após pagamento
  // useEffect(() => {
  //   if (!localStorage.getItem('scholarship_browser_refreshed')) {
  //     localStorage.setItem('scholarship_browser_refreshed', 'true');
  //     window.location.reload();
  //   }
  // }, []);

  // Polling para atualizar o perfil do usuário apenas enquanto o pagamento está pendente (reduzido para 30s)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (userProfile && !userProfile.has_paid_selection_process_fee) {
      interval = setInterval(() => {
        refetchUserProfile && refetchUserProfile();
      }, 30000); // Reduzido de 3s para 30s
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

  // Check if user needs to pay selection process fee (only for students)
  // if (user && user.role === 'student' && userProfile && !userProfile.has_paid_selection_process_fee) {
  //   return <PaymentRequiredBlocker pageType="scholarships" showHeader={false} />;
  // }



  // Função para calcular dias até o deadline
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



  // Memoização dos filtros e ordenação com debounce
  const filteredScholarships = useMemo(() => {
    // const startTime = performance.now();
    console.log('🔍 [ScholarshipBrowser] Iniciando filtragem de bolsas. Total:', scholarships.length);

    // Proteção contra dados inválidos
    if (!Array.isArray(scholarships) || scholarships.length === 0) {
      console.log('⚠️ [ScholarshipBrowser] scholarships vazio ou inválido');
      return [];
    }


    // Busca por múltiplas palavras-chave (otimizada)
    const searchWords = appliedSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);

    const filtered = scholarships.filter(scholarship => {
      // Filtro de bolsas de teste (is_test)
      const isUorakUser = user?.email?.toLowerCase().endsWith('@uorak.com') || userProfile?.email?.toLowerCase().endsWith('@uorak.com');
      const isAdmin = user?.role === 'admin';
      if (scholarship.is_test && !isUorakUser && !isAdmin) {
        return false;
      }



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

      // Filtro automático baseado na faixa de bolsa desejada do usuário
      // Mostrar apenas bolsas com valor >= valor selecionado pelo seller
      // ✅ Se desiredScholarshipRange for null/undefined, mostrar TODAS as bolsas (sem filtro de valor)
      const matchesDesiredRange = desiredScholarshipRange === null || desiredScholarshipRange === undefined || scholarshipValue >= desiredScholarshipRange;

      // Exclude scholarships from universities that are not approved (if we have an approved set)
      const universityId = scholarship.universities?.id ?? scholarship.university_id ?? null;
      const universityName = scholarship.universities?.name ?? scholarship.university_name ?? '';
      const fromApprovedUniversity = approvedUniversityIds.size === 0 ? true : (universityId !== null && approvedUniversityIds.has(universityId));
      const notExcludedUniversity = !isExcludedUniversityName(universityName);
      // Filtro por universidade (apenas se aplicado e se o usuário já pagou a taxa)
      const matchesUniversity = (appliedUniversity === 'all' || !userProfile?.has_paid_selection_process_fee) ? true : (String(universityId) === String(appliedUniversity));

      const passes = matchesSearch && matchesLevel && matchesField && matchesDeliveryMode && matchesWorkPermission && matchesMin && matchesMax && matchesDeadline && matchesDesiredRange && fromApprovedUniversity && matchesUniversity && notExcludedUniversity;


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
  }, [
    scholarships,
    appliedSearch,
    appliedLevel,
    appliedField,
    appliedDeliveryMode,
    appliedWorkPermission,
    appliedMinValue,
    appliedMaxValue,
    appliedDeadlineDays,
    appliedUniversity,
    sortBy,
    desiredScholarshipRange,
    userProfile?.has_paid_selection_process_fee,
    approvedUniversityIds.size
  ]);

  // Memoização dos IDs aplicados e no carrinho


  // Lógica de paginação
  const totalPages = Math.ceil(filteredScholarships.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedScholarships = filteredScholarships.slice(startIndex, endIndex);

  // Resetar página quando filtros mudam (apenas se necessário)
  useEffect(() => {
    const newTotalPages = Math.ceil(filteredScholarships.length / itemsPerPage);

    // Se a página atual é maior que o total de páginas, voltar para a última página
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
    // Se não há resultados, voltar para página 1
    else if (newTotalPages === 0) {
      setCurrentPage(1);
    }
    // Caso contrário, manter a página atual
  }, [filteredScholarships.length, currentPage, itemsPerPage]);


  // Apply same applied-* filters to featured scholarships so featureds respect the user's filters
  const filteredFeaturedScholarships = useMemo(() => {
    if (!featuredScholarships || featuredScholarships.length === 0) return [];

    const searchWords = (appliedSearch || '').trim().toLowerCase().split(/\s+/).filter(Boolean);

    return featuredScholarships.filter(scholarship => {


      const text = `${scholarship.title} ${scholarship.description || ''} ${(scholarship.universities?.name || '')}`.toLowerCase();
      const matchesSearch = searchWords.length === 0 || searchWords.every(word => text.includes(word));

      const matchesLevel = appliedLevel === 'all' || (scholarship.level && typeof scholarship.level === 'string' && scholarship.level.toLowerCase() === appliedLevel.toLowerCase());

      const matchesField = appliedField === 'all' ||
        (scholarship.field_of_study && typeof scholarship.field_of_study === 'string' && scholarship.field_of_study.toLowerCase() === appliedField.toLowerCase()) ||
        (appliedField === 'any' && scholarship.field_of_study === 'any field');

      const matchesDeliveryMode = appliedDeliveryMode === 'all' || (scholarship.delivery_mode && typeof scholarship.delivery_mode === 'string' && scholarship.delivery_mode.toLowerCase() === appliedDeliveryMode.toLowerCase());

      const matchesWorkPermission = appliedWorkPermission === 'all' ||
        (scholarship.work_permissions && Array.isArray(scholarship.work_permissions) && scholarship.work_permissions.some((perm: any) => perm && typeof perm === 'string' && perm.toLowerCase() === appliedWorkPermission.toLowerCase()));

      const scholarshipValue = scholarship.annual_value_with_scholarship ?? scholarship.amount ?? 0;
      const minValueNum = appliedMinValue && appliedMinValue !== '' && !isNaN(Number(appliedMinValue)) ? Number(appliedMinValue) : null;
      const maxValueNum = appliedMaxValue && appliedMaxValue !== '' && !isNaN(Number(appliedMaxValue)) ? Number(appliedMaxValue) : null;
      const matchesMin = minValueNum === null || (scholarshipValue >= minValueNum);
      const matchesMax = maxValueNum === null || (scholarshipValue <= maxValueNum);

      const daysLeft = getDaysUntilDeadline(scholarship.deadline);
      const deadlineDaysNum = appliedDeadlineDays && appliedDeadlineDays !== '' && !isNaN(Number(appliedDeadlineDays)) ? Number(appliedDeadlineDays) : null;
      const matchesDeadline = deadlineDaysNum === null || daysLeft >= deadlineDaysNum;

      // Filtro automático baseado na faixa de bolsa desejada do usuário
      // Mostrar apenas bolsas com valor >= valor selecionado pelo seller
      // ✅ Se desiredScholarshipRange for null/undefined, mostrar TODAS as bolsas (sem filtro de valor)
      const matchesDesiredRange = desiredScholarshipRange === null || desiredScholarshipRange === undefined || scholarshipValue >= desiredScholarshipRange;

      const universityId = scholarship.universities?.id ?? scholarship.university_id ?? null;
      const universityName = scholarship.universities?.name ?? scholarship.university_name ?? '';
      const fromApprovedUniversity = approvedUniversityIds.size === 0 ? true : (universityId !== null && approvedUniversityIds.has(universityId));
      const matchesUniversity = (appliedUniversity === 'all' || !userProfile?.has_paid_selection_process_fee) ? true : (String(universityId) === String(appliedUniversity));
      const notExcludedUniversity = !isExcludedUniversityName(universityName);

      return matchesSearch && matchesLevel && matchesField && matchesDeliveryMode && matchesWorkPermission && matchesMin && matchesMax && matchesDeadline && matchesDesiredRange && fromApprovedUniversity && matchesUniversity && notExcludedUniversity;
    });
  }, [featuredScholarships, appliedSearch, appliedLevel, appliedField, appliedDeliveryMode, appliedWorkPermission, appliedMinValue, appliedMaxValue, appliedDeadlineDays, desiredScholarshipRange, appliedUniversity, userProfile?.has_paid_selection_process_fee, approvedUniversityIds.size]);







  // Função para lidar com seleção de método de pagamento
  const handlePaymentMethodSelect = async (method: 'stripe' | 'zelle' | 'pix' | 'parcelow') => {
    console.log('🔍 [ScholarshipBrowser] Método de pagamento selecionado:', method);
    setSelectedPaymentMethod(method);

    try {
      await handleCheckout(method);
    } catch (error) {
      console.error('Error processing payment:', error);
      // Em caso de erro, fechar modal e redirecionar para página de erro
      setShowPaymentMethodSelector(false);
      setSelectedPaymentMethod(null);
      navigate('/student/dashboard/selection-process-fee-error');
    }
  };

  // ✅ ÚNICA função handleCheckout (igual ao StripeCheckout) para os 3 métodos
  const handleCheckout = async (paymentMethod: 'stripe' | 'zelle' | 'pix' | 'parcelow') => {
    setIsOpeningStripe(true);

    try {
      // ✅ Zelle é especial - redireciona para página própria (igual ao StripeCheckout)
      if (paymentMethod === 'zelle') {
        const finalAmountToUse = (window as any).__checkout_final_amount || finalAmount;

        // ✅ Usar MESMA URL que o StripeCheckout usa
        const params = new URLSearchParams({
          feeType: 'selection_process',
          amount: finalAmountToUse.toString(),
          scholarshipsIds: '' // Para selection process não tem scholarships
        });

        const zelleUrl = `/checkout/zelle?${params.toString()}`;
        console.log('🔍 [ScholarshipBrowser] Redirecionando para Zelle:', zelleUrl);

        setShowPaymentMethodSelector(false);
        setSelectedPaymentMethod(null);
        window.location.href = zelleUrl; // ✅ Usar window.location.href como StripeCheckout
        return;
      }

      // ✅ Stripe, PIX e Parcelow usam Edge Functions similares
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      // ✅ Obter valor final de window (igual ao StripeCheckout)
      let finalAmountToUse: number;
      if ((window as any).__checkout_final_amount && typeof (window as any).__checkout_final_amount === 'number') {
        finalAmountToUse = (window as any).__checkout_final_amount;
      } else {
        finalAmountToUse = finalAmount;
      }

      console.log('🔍 [ScholarshipBrowser] Valor final para checkout:', finalAmountToUse);

      // ✅ Caso especial Parcelow
      if (paymentMethod === 'parcelow') {
        console.log('🔍 [ScholarshipBrowser] Iniciando checkout Parcelow...');

        const parcelowUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parcelow-checkout-selection-process`;

        const response = await fetch(parcelowUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: finalAmountToUse,
            fee_type: 'selection_process',
            metadata: {
              source: 'ScholarshipBrowser',
              promotional_coupon: (window as any).__checkout_promotional_coupon || null,
              referral_code: discountCode || null
            },
            promotional_coupon: (window as any).__checkout_promotional_coupon || null
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          // Se o erro for CPF obrigatório, mostrar mensagem amigável
          if (errorData.error === 'document_number_required') {
            alert(t('paymentSelector.errors.cpfRequired'));
            setIsOpeningStripe(false);
            return;
          }
          throw new Error(errorData.error || 'Erro ao criar sessão Parcelow');
        }

        const data = await response.json();
        if (data.checkout_url) {
          console.log('[Parcelow] Redirecionando para:', data.checkout_url);
          window.location.href = data.checkout_url;
          return;
        } else {
          throw new Error('URL de checkout Parcelow não encontrada');
        }
      }

      // ✅ Stripe e PIX usam a MESMA edge function
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-selection-process-fee`;

      const requestBody = {
        price_id: STRIPE_PRODUCTS.selectionProcess.priceId,
        amount: finalAmountToUse,
        payment_method: paymentMethod, // ✅ 'stripe' ou 'pix'
        success_url: `${window.location.origin}/student/onboarding?step=selection_fee&payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/student/dashboard/selection-process-fee-error`,
        mode: 'payment',
        payment_type: 'selection_process',
        fee_type: 'selection_process',
        promotional_coupon: (window as any).__checkout_promotional_coupon || null,
        referral_code: discountCode || null
      };

      console.log(`🔍 [ScholarshipBrowser] Chamando edge function com paymentMethod: ${paymentMethod}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar sessão de checkout');
      }

      const data = await response.json();

      if (data.session_url) {
        // ✅ Se for PIX, injetar script de polling (igual ao StripeCheckout)
        if (paymentMethod === 'pix') {
          console.log('[PIX] Incluindo script de redirecionamento...');

          const script = document.createElement('script');
          script.textContent = `
            (function() {
              console.log('[PIX] Script de redirecionamento ativado na página do Stripe');
              
              const checkPixStatus = async () => {
                try {
                  const SUPABASE_PROJECT_URL = '${import.meta.env.VITE_SUPABASE_URL}';
                  const EDGE_FUNCTION_ENDPOINT = SUPABASE_PROJECT_URL + '/functions/v1/verify-stripe-session-selection-process-fee';
                  
                  let token = null;
                  try {
                    const raw = localStorage.getItem('sb-' + SUPABASE_PROJECT_URL.split('//')[1].split('.')[0] + '-auth-token');
                    if (raw) {
                      const tokenObj = JSON.parse(raw);
                      token = tokenObj?.access_token || null;
                    }
                  } catch (e) {
                    token = null;
                  }
                  
                  const response = await fetch(EDGE_FUNCTION_ENDPOINT, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(token && { 'Authorization': 'Bearer ' + token }),
                    },
                    body: JSON.stringify({ sessionId: '${data.session_id}' }),
                  });
                  
                  const data = await response.json();
                  
                  if (data.payment_method === 'pix' && data.status === 'complete') {
                    console.log('[PIX] Pagamento confirmado! Redirecionando...');
                    window.location.href = '${`${window.location.origin}/student/onboarding?step=selection_fee&payment=success`}';
                    return true;
                  }
                  
                  return false;
                } catch (error) {
                  console.error('[PIX] Erro ao verificar status:', error);
                  return false;
                }
              };
              
              // Verificar imediatamente
              checkPixStatus();
              
              // Verificar a cada 3 segundos
              const interval = setInterval(async () => {
                const redirected = await checkPixStatus();
                if (redirected) {
                  clearInterval(interval);
                }
              }, 3000);
              
              // Timeout após 2 minutos
              setTimeout(() => {
                clearInterval(interval);
                console.log('[PIX] Timeout - redirecionando...');
                window.location.href = '${`${window.location.origin}/student/onboarding?step=selection_fee&payment=success`}';
              }, 120000);
              
            })();
          `;
          document.head.appendChild(script);
        }

        // ✅ Redirecionar NA MESMA ABA (para ambos Stripe e PIX)
        setShowPaymentMethodSelector(false);
        setSelectedPaymentMethod(null);
        window.location.href = data.session_url;
      } else {
        throw new Error('URL da sessão não encontrada na resposta');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      throw error;
    } finally {
      setIsOpeningStripe(false);
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
  today.setHours(0, 0, 0, 0);


  // Se usuário já tem application fee paga, mostrar mensagem de bloqueio
  if (!applicationFeeLoading && hasPaidApplicationFee) {
    return (
      <ApplicationFeeBlockedMessage
        committedUniversity={committedUniversity}
        committedScholarship={committedScholarship}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 pt-4 sm:pt-6 md:pt-10 px-4 sm:px-6 lg:px-0 pb-8 sm:pb-12" data-testid="scholarship-list">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">{t('studentDashboard.findScholarships.title')}</h2>
          <p className="text-sm sm:text-base text-slate-600">{t('studentDashboard.findScholarships.subtitle')}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
        {/* Mobile Filter Toggle */}
        <div className="block md:hidden mb-4">
          <button
            type="button"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-700 font-medium"
          >
            <span className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              {t('common.filter')} ({Object.values({ appliedSearch, appliedLevel, appliedField, appliedDeliveryMode, appliedWorkPermission, ...(userProfile?.has_paid_selection_process_fee ? { appliedUniversity } : {}), appliedMinValue, appliedMaxValue, appliedDeadlineDays }).filter(Boolean).length} {t('studentDashboard.findScholarships.filters.active')})
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
              placeholder={t('studentDashboard.findScholarships.searchPlaceholder')}
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
              <label htmlFor="level-filter" className="block text-xs font-medium text-slate-700 mb-1 md:hidden">{t('studentDashboard.findScholarships.filters.academicLevel')}</label>
              <select
                id="level-filter"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 text-sm"
                title="Filter by academic level"
                aria-label="Filter by academic level"
              >
                <option value="all">{t('studentDashboard.findScholarships.allLevels')}</option>
                {uniqueLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            {/* Field Filter */}
            <div>
              <label htmlFor="field-filter" className="block text-xs font-medium text-slate-700 mb-1 md:hidden">{t('studentDashboard.findScholarships.filters.fieldOfStudy')}</label>
              <select
                id="field-filter"
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 text-sm"
                title="Filter by field of study"
                aria-label="Filter by field of study"
              >
                <option value="all">{t('studentDashboard.findScholarships.allFields')}</option>
                {uniqueFields.map((fld) => (
                  <option key={fld} value={fld}>{fld}</option>
                ))}
                <option value="any">{t('studentDashboard.findScholarships.filters.anyField')}</option>
              </select>
            </div>

            {/* Course Modality Filter */}
            <div>
              <label htmlFor="delivery-mode-filter" className="block text-xs font-medium text-slate-700 mb-1 md:hidden">{t('studentDashboard.findScholarships.filters.studyMode')}</label>
              <select
                id="delivery-mode-filter"
                value={selectedDeliveryMode}
                onChange={(e) => setSelectedDeliveryMode(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 text-sm"
                title="Filter by study mode"
                aria-label="Filter by study mode"
              >
                <option value="all">{t('studentDashboard.findScholarships.allModes')}</option>
                {uniqueDeliveryModes.map((dm) => (
                  <option key={dm} value={dm}>{getDeliveryModeLabel(dm)}</option>
                ))}
              </select>
            </div>

            {/* Work Permission Filter */}
            <div>
              <label htmlFor="work-permission-filter" className="block text-xs font-medium text-slate-700 mb-1 md:hidden">{t('studentDashboard.findScholarships.filters.workAuthorization')}</label>
              <select
                id="work-permission-filter"
                value={selectedWorkPermission}
                onChange={(e) => setSelectedWorkPermission(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 text-sm"
                title="Filter by work authorization"
                aria-label="Filter by work authorization"
              >
                <option value="all">{t('studentDashboard.findScholarships.allPermissions')}</option>
                {uniqueWorkPermissions.map((wp) => (
                  <option key={wp} value={wp}>{wp}</option>
                ))}
              </select>
            </div>

            {/* University Filter (apenas se já pagou a taxa de seleção) */}
            {userProfile?.has_paid_selection_process_fee && (
              <div>
                <label htmlFor="university-filter" className="block text-xs font-medium text-slate-700 mb-1 md:hidden">{t('studentDashboard.findScholarships.scholarshipCard.university')}</label>
                <select
                  id="university-filter"
                  value={selectedUniversity}
                  onChange={(e) => setSelectedUniversity(e.target.value)}
                  className="w-full px-3 sm:px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200 text-sm"
                  title="Filter by university"
                  aria-label="Filter by university"
                >
                  <option value="all">{t('studentDashboard.findScholarships.allUniversities')}</option>
                  {uniqueUniversities.map((u) => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Value Filters */}
            <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2 grid grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label htmlFor="min-value" className="block text-xs font-medium text-slate-700 mb-1 md:hidden">{t('studentDashboard.findScholarships.filters.minValue')}</label>
                <input
                  id="min-value"
                  type="number"
                  placeholder={t('studentDashboard.findScholarships.minValue')}
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
                <label htmlFor="max-value" className="block text-xs font-medium text-slate-700 mb-1 md:hidden">{t('studentDashboard.findScholarships.filters.maxValue')}</label>
                <input
                  id="max-value"
                  type="number"
                  placeholder={t('studentDashboard.findScholarships.maxValue')}
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
              <label htmlFor="deadline-days" className="block text-xs font-medium text-slate-700 mb-1 md:hidden">{t('studentDashboard.findScholarships.filters.deadlineDays')}</label>
              <input
                id="deadline-days"
                type="number"
                placeholder={t('studentDashboard.findScholarships.deadline')}
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
            className={`w-full sm:w-auto px-4 sm:px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 text-sm sm:text-base ${(searchTerm.trim() !== appliedSearch || selectedLevel !== appliedLevel || selectedField !== appliedField || selectedDeliveryMode !== appliedDeliveryMode || selectedWorkPermission !== appliedWorkPermission || (userProfile?.has_paid_selection_process_fee && selectedUniversity !== appliedUniversity) || minValue.trim() !== appliedMinValue || maxValue.trim() !== appliedMaxValue || deadlineDays.trim() !== appliedDeadlineDays)
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
                <span className="hidden sm:inline">{t('studentDashboard.findScholarships.filters.applying')}</span>
                <span className="sm:hidden">{t('studentDashboard.findScholarships.filters.loading')}</span>
              </>
            ) : filtersApplied ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span className="hidden sm:inline">{t('studentDashboard.findScholarships.filters.applied')}</span>
                <span className="sm:hidden">{t('studentDashboard.findScholarships.filters.applied')}</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">{t('studentDashboard.findScholarships.applyFilters')} ({filteredScholarships.length})</span>
                <span className="sm:hidden">{t('common.apply')} ({filteredScholarships.length})</span>
              </>
            )}
          </button>

          {(appliedSearch || appliedLevel !== 'all' || appliedField !== 'all' || appliedDeliveryMode !== 'all' || appliedWorkPermission !== 'all' || (userProfile?.has_paid_selection_process_fee && appliedUniversity !== 'all') || appliedMinValue || appliedMaxValue || appliedDeadlineDays) && (
            <button
              type="button"
              onClick={(e) => clearAllFilters(e)}
              className="w-full sm:w-auto bg-slate-200 text-slate-700 px-4 sm:px-6 py-3 rounded-xl font-semibold hover:bg-slate-300 transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">{t('studentDashboard.findScholarships.filters.clearAllFilters')}</span>
              <span className="sm:hidden">{t('studentDashboard.findScholarships.filters.clear')}</span>
            </button>
          )}


        </div>

        {/* Tags de filtros ativos (apenas os aplicados) */}
        {(appliedSearch || appliedLevel !== 'all' || appliedField !== 'all' || appliedDeliveryMode !== 'all' || appliedWorkPermission !== 'all' || (userProfile?.has_paid_selection_process_fee && appliedUniversity !== 'all') || appliedMinValue || appliedMaxValue || appliedDeadlineDays) && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200">
            {appliedSearch && <span className="bg-blue-100 text-blue-700 px-2 sm:px-3 py-1 rounded-full text-xs">{t('studentDashboard.findScholarships.filters.search')} {appliedSearch}</span>}
            {appliedLevel !== 'all' && <span className="bg-green-100 text-green-700 px-2 sm:px-3 py-1 rounded-full text-xs">{t('studentDashboard.findScholarships.filters.level')} {appliedLevel}</span>}
            {appliedField !== 'all' && <span className="bg-purple-100 text-purple-700 px-2 sm:px-3 py-1 rounded-full text-xs">{t('studentDashboard.findScholarships.filters.field')} {appliedField}</span>}
            {appliedDeliveryMode !== 'all' && <span className="bg-indigo-100 text-indigo-700 px-2 sm:px-3 py-1 rounded-full text-xs">{t('studentDashboard.findScholarships.filters.mode')} {getDeliveryModeLabel(appliedDeliveryMode)}</span>}
            {appliedWorkPermission !== 'all' && <span className="bg-emerald-100 text-emerald-700 px-2 sm:px-3 py-1 rounded-full text-xs">{t('studentDashboard.findScholarships.filters.work')} {appliedWorkPermission}</span>}
            {userProfile?.has_paid_selection_process_fee && appliedUniversity !== 'all' && <span className="bg-sky-100 text-sky-700 px-2 sm:px-3 py-1 rounded-full text-xs">{t('studentDashboard.findScholarships.scholarshipCard.university')} {(() => { const u = uniqueUniversities.find(x => String(x.id) === String(appliedUniversity)); return u?.name || appliedUniversity; })()}</span>}
            {appliedMinValue && <span className="bg-yellow-100 text-yellow-700 px-2 sm:px-3 py-1 rounded-full text-xs">{t('studentDashboard.findScholarships.filters.min')} {appliedMinValue}</span>}
            {appliedMaxValue && <span className="bg-yellow-100 text-yellow-700 px-2 sm:px-3 py-1 rounded-full text-xs">{t('studentDashboard.findScholarships.filters.max')} {appliedMaxValue}</span>}
            {appliedDeadlineDays && <span className="bg-red-100 text-red-700 px-2 sm:px-3 py-1 rounded-full text-xs">{t('studentDashboard.findScholarships.filters.deadline')} {appliedDeadlineDays} {t('studentDashboard.findScholarships.filters.days')}</span>}
          </div>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-slate-600 mt-4 pt-4 border-t border-slate-200">
          <span>
            <span className="font-medium text-blue-600">{filteredScholarships.length}</span>
            <span className="hidden sm:inline"> {t('studentDashboard.findScholarships.scholarshipsFound')}</span>
            <span className="sm:hidden"> {t('studentDashboard.findScholarships.scholarshipsFound')}</span>
            {totalPages > 1 && (
              <span className="text-slate-500 ml-2">
                {t('studentDashboard.findScholarships.pagination.pageOf', {
                  current: currentPage,
                  total: totalPages
                })}
              </span>
            )}
            {filteredScholarships.length > 0 && (
              <span className="text-green-600 ml-2 text-xs">
                {t('studentDashboard.findScholarships.pagination.showing', {
                  start: startIndex + 1,
                  end: Math.min(endIndex, filteredScholarships.length),
                  total: filteredScholarships.length
                })}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Featured Scholarships Section - Only show if there are featured scholarships after filtering */}
      {filteredFeaturedScholarships.length > 0 && (
        featuredLoading ? (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl border border-blue-200 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex items-center justify-center py-8 sm:py-12">
              <div className="text-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3 sm:mb-4"></div>
                <p className="text-sm sm:text-base text-slate-600">{t('studentDashboard.findScholarships.featuredScholarships.loading')}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl border border-blue-200 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1 sm:mb-2">
                  <span className="text-[#05294E]">{t('studentDashboard.findScholarships.featuredScholarships.featured')}</span> {t('studentDashboard.findScholarships.featuredScholarships.title')}
                </h3>
                <p className="text-sm sm:text-base text-slate-600">
                  {t('studentDashboard.findScholarships.featuredScholarships.subtitle')}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xl sm:text-2xl font-bold text-[#05294E]">{filteredFeaturedScholarships.length}</div>
                <div className="text-xs sm:text-sm text-slate-500">{t('studentDashboard.findScholarships.featuredScholarships.featured')}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredFeaturedScholarships.map((scholarship) => {
                return (
                  <ScholarshipCardFull
                    key={scholarship.id}
                    scholarship={scholarship}
                    isSelected={false}
                    userProfile={userProfile}
                    hideSelectButton={true}
                    onViewDetails={() => openScholarshipModal(scholarship)}
                    // Favorito removido

                  />
                );
              })}
            </div>
          </div>
        )
      )}

      {/* Scholarships Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {paginatedScholarships.map((scholarship) => {
          return (
            <ScholarshipCardFull
              key={scholarship.id}
              scholarship={scholarship}
              isSelected={false}
              userProfile={userProfile}
              hideSelectButton={true}
              onViewDetails={() => openScholarshipModal(scholarship)}
              // Favorito removido

            />
          );
        })}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-8 mb-4">
          {/* Botão Primeira Página */}
          {currentPage > 3 && (
            <button
              onClick={() => setCurrentPage(1)}
              className="px-3 py-2 rounded-lg font-medium transition-all duration-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              «
            </button>
          )}

          {/* Botão Anterior */}
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${currentPage === 1
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
              }`}
          >
            {t('studentDashboard.findScholarships.pagination.previous')}
          </button>

          {/* Números das páginas */}
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-lg font-medium transition-all duration-200 ${currentPage === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Botão Próximo */}
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${currentPage === totalPages
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
              }`}
          >
            {t('studentDashboard.findScholarships.pagination.next')}
          </button>

          {/* Botão Última Página */}
          {currentPage < totalPages - 2 && (
            <button
              onClick={() => setCurrentPage(totalPages)}
              className="px-3 py-2 rounded-lg font-medium transition-all duration-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              »
            </button>
          )}
        </div>
      )}

      {/* No Results */}
      {filteredScholarships.length === 0 && (
        <div className="text-center py-12 sm:py-20 px-4">
          <div className="bg-gradient-to-br from-slate-100 to-slate-200 w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-lg">
            <Award className="h-12 w-12 sm:h-16 sm:w-16 text-slate-400" />
          </div>
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-600 mb-3 sm:mb-4">{t('studentDashboard.findScholarships.noResults.title')}</h3>
          <p className="text-sm sm:text-base md:text-lg text-slate-500 mb-6 sm:mb-8 max-w-md mx-auto">{t('studentDashboard.findScholarships.noResults.description')}</p>
          <button
            type="button"
            onClick={(e) => clearAllFilters(e)}
            className="bg-blue-600 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-xl sm:rounded-2xl hover:bg-blue-700 transition-all duration-300 font-bold text-sm sm:text-base"
          >
            {t('studentDashboard.findScholarships.noResults.clearAllFilters')}
          </button>
        </div>
      )}


      {/* Modal de Detalhes da Bolsa */}
      <ScholarshipDetailModal
        scholarship={selectedScholarshipForModal}
        isOpen={isModalOpen}
        onClose={closeScholarshipModal}
        userProfile={userProfile}
        user={user as any}
        userRole={user?.role || null}
      />

      {/* PreCheckoutModal para Matricula Rewards */}
      {showPreCheckoutModal && selectedScholarshipForCheckout && selectionProcessFee && (
        <PreCheckoutModal
          isOpen={showPreCheckoutModal}
          onClose={() => {
            setShowPreCheckoutModal(false);
            setSelectedScholarshipForCheckout(null);
          }}
          onProceedToCheckout={async (finalAmountFromModal, appliedDiscountCode) => {
            console.log('🎯 [ScholarshipBrowser] Código de desconto aplicado:', appliedDiscountCode, 'Valor final:', finalAmountFromModal);

            // ✅ Guardar valor final em window (igual ao StripeCheckout)
            if (typeof finalAmountFromModal === 'number') {
              (window as any).__checkout_final_amount = finalAmountFromModal;
            }
            setFinalAmount(finalAmountFromModal);
            setDiscountCode(appliedDiscountCode || '');
            setShowPreCheckoutModal(false);
            setShowPaymentMethodSelector(true);
          }}
          feeType="selection_process"
          productName="Selection Process Fee"
          productPrice={parseFloat(selectionProcessFee.replace('$', ''))} // Valor dinâmico correto (sem fallback)
          isLoading={isOpeningStripe} // Passar o estado de loading
        />
      )}

      {/* PaymentMethodSelector Modal - Responsive Drawer/Dialog */}
      {showPaymentMethodSelector && (
        <PaymentMethodSelectorDrawer
          isOpen={showPaymentMethodSelector}
          onClose={() => {
            console.log('🔍 [ScholarshipBrowser] Fechando seletor de método de pagamento');
            setShowPaymentMethodSelector(false);
            setSelectedPaymentMethod(null);
          }}
          selectedMethod={selectedPaymentMethod}
          onMethodSelect={handlePaymentMethodSelect}
          feeType="selection_process"
          amount={finalAmount}
          isLoading={isOpeningStripe}
        />
      )}
    </div>
  );
};

export default ScholarshipBrowser;