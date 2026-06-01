import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Star,
  Award,
  Building,
  DollarSign,
  GraduationCap,
  Users,
  Lock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

import { useDynamicFees } from '../../hooks/useDynamicFees';
import { supabase } from '../../lib/supabase';
import { getPlacementFee } from '../../utils/placementFeeCalculator';
import { formatCurrency } from '../../utils/currency';
import { STRIPE_PRODUCTS } from '../../stripe-config';
import ScholarshipDetailModal from '../../components/ScholarshipDetailModal';
import { PreCheckoutModal } from '../../components/PreCheckoutModal';
import { PaymentMethodSelectorDrawer } from '../../components/PaymentMethodSelectorDrawer';

import { ApplicationFeeBlockedMessage } from '../../components/ApplicationFeeBlockedMessage';
import { useApplicationFeeStatus } from '../../hooks/useApplicationFeeStatus';
import { ScholarshipExpiryWarning } from '../../components/ScholarshipExpiryWarning';
import { useScholarshipsQuery } from '../../hooks/useStudentDashboardQueries';

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
  const navigate = useNavigate();
  const [maxValue, setMaxValue] = useState('');
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

  const clearAllFilters = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setSearchTerm('');
    setSelectedLevel('all');
    setSelectedField('all');
    setSelectedDeliveryMode('all');
    setSelectedWorkPermission('all');
    setMaxValue('');
    setSelectedUniversity('all');
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
      searchTerm,
      selectedLevel,
      selectedField,
      selectedDeliveryMode,
      selectedWorkPermission,
      selectedUniversity,
      maxValue
    };
    localStorage.setItem('scholarshipFilters', JSON.stringify(filters));
  }, [searchTerm, selectedLevel, selectedField, selectedDeliveryMode, selectedWorkPermission, selectedUniversity, maxValue]);

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
        if (filters.maxValue) setMaxValue(filters.maxValue);

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

  // Refs para os cards de bolsas (não podem estar dentro do loop)
  const scholarshipRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Controle de imagens quebradas para exibir placeholder
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string | number>>(new Set());
  const markImageAsBroken = (id: string | number) => {
    setBrokenImageIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

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

  // Memoização dos filtros e ordenação com debounce
  const filteredScholarships = useMemo(() => {
    // Proteção contra dados inválidos
    if (!Array.isArray(scholarships) || scholarships.length === 0) {
      return [];
    }


    // Busca por múltiplas palavras-chave (otimizada)
    const searchWords = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);

    const filtered = scholarships.filter(scholarship => {
      // Filtro de bolsas de teste (is_test)
      const isUorakUser = user?.email?.toLowerCase().endsWith('@uorak.com') || userProfile?.email?.toLowerCase().endsWith('@uorak.com');
      const isAdmin = user?.role === 'admin' || user?.role === 'post_sales';
      if (scholarship.is_test && !isUorakUser && !isAdmin) {
        return false;
      }


      // Busca por palavras-chave
      const text = `${scholarship.title} ${scholarship.description || ''} ${(scholarship.universities?.name || '')}`.toLowerCase();
      const matchesSearch = searchWords.length === 0 || searchWords.every(word => text.includes(word));

      // Filtro de nível
      const matchesLevel = selectedLevel === 'all' ||
        (scholarship.level && typeof scholarship.level === 'string' && scholarship.level.toLowerCase() === selectedLevel.toLowerCase());

      // Filtro de área
      const matchesField = selectedField === 'all' ||
        (scholarship.field_of_study && typeof scholarship.field_of_study === 'string' &&
          scholarship.field_of_study.toLowerCase() === selectedField.toLowerCase()) ||
        (selectedField === 'any' && scholarship.field_of_study === 'any field');

      // Filtro de delivery mode
      const matchesDeliveryMode = selectedDeliveryMode === 'all' ||
        (scholarship.delivery_mode && typeof scholarship.delivery_mode === 'string' &&
          scholarship.delivery_mode.toLowerCase() === selectedDeliveryMode.toLowerCase());

      // Filtro de work permissions
      const matchesWorkPermission = selectedWorkPermission === 'all' ||
        (scholarship.work_permissions &&
          Array.isArray(scholarship.work_permissions) &&
          scholarship.work_permissions.length > 0 &&
          scholarship.work_permissions.some((perm: any) =>
            perm && typeof perm === 'string' && perm.toLowerCase() === selectedWorkPermission.toLowerCase()
          ));

      // Filtro de valor
      const scholarshipValue = scholarship.annual_value_with_scholarship ?? scholarship.amount ?? 0;
      const maxValueNum = maxValue && maxValue !== '' && !isNaN(Number(maxValue)) ? Number(maxValue) : null;
      const matchesMax = maxValueNum === null || (scholarshipValue <= maxValueNum);

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
      const matchesUniversity = (selectedUniversity === 'all' || !userProfile?.has_paid_selection_process_fee) ? true : (String(universityId) === String(selectedUniversity));

      const passes = matchesSearch && matchesLevel && matchesField && matchesDeliveryMode && matchesWorkPermission && matchesMax && matchesDesiredRange && fromApprovedUniversity && matchesUniversity && notExcludedUniversity;


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
    searchTerm,
    selectedLevel,
    selectedField,
    selectedDeliveryMode,
    selectedWorkPermission,
    maxValue,
    selectedUniversity,
    sortBy,
    desiredScholarshipRange,
    userProfile?.has_paid_selection_process_fee,
    approvedUniversityIds.size,
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

    const searchWords = (searchTerm || '').trim().toLowerCase().split(/\s+/).filter(Boolean);

    return featuredScholarships.filter(scholarship => {

      const text = `${scholarship.title} ${scholarship.description || ''} ${(scholarship.universities?.name || '')}`.toLowerCase();
      const matchesSearch = searchWords.length === 0 || searchWords.every(word => text.includes(word));

      const matchesLevel = selectedLevel === 'all' || (scholarship.level && typeof scholarship.level === 'string' && scholarship.level.toLowerCase() === selectedLevel.toLowerCase());

      const matchesField = selectedField === 'all' ||
        (scholarship.field_of_study && typeof scholarship.field_of_study === 'string' && scholarship.field_of_study.toLowerCase() === selectedField.toLowerCase()) ||
        (selectedField === 'any' && scholarship.field_of_study === 'any field');

      const matchesDeliveryMode = selectedDeliveryMode === 'all' || (scholarship.delivery_mode && typeof scholarship.delivery_mode === 'string' && scholarship.delivery_mode.toLowerCase() === selectedDeliveryMode.toLowerCase());

      const matchesWorkPermission = selectedWorkPermission === 'all' ||
        (scholarship.work_permissions && Array.isArray(scholarship.work_permissions) && scholarship.work_permissions.some((perm: any) => perm && typeof perm === 'string' && perm.toLowerCase() === selectedWorkPermission.toLowerCase()));

      const scholarshipValue = scholarship.annual_value_with_scholarship ?? scholarship.amount ?? 0;
      const maxValueNum = maxValue && maxValue !== '' && !isNaN(Number(maxValue)) ? Number(maxValue) : null;
      const matchesMax = maxValueNum === null || (scholarshipValue <= maxValueNum);

      // Filtro automático baseado na faixa de bolsa desejada do usuário
      // Mostrar apenas bolsas com valor >= valor selecionado pelo seller
      // ✅ Se desiredScholarshipRange for null/undefined, mostrar TODAS as bolsas (sem filtro de valor)
      const matchesDesiredRange = desiredScholarshipRange === null || desiredScholarshipRange === undefined || scholarshipValue >= desiredScholarshipRange;

      const universityId = scholarship.universities?.id ?? scholarship.university_id ?? null;
      const universityName = scholarship.universities?.name ?? scholarship.university_name ?? '';
      const fromApprovedUniversity = approvedUniversityIds.size === 0 ? true : (universityId !== null && approvedUniversityIds.has(universityId));
      const matchesUniversity = (selectedUniversity === 'all' || !userProfile?.has_paid_selection_process_fee) ? true : (String(universityId) === String(selectedUniversity));
      const notExcludedUniversity = !isExcludedUniversityName(universityName);

      return matchesSearch && matchesLevel && matchesField && matchesDeliveryMode && matchesWorkPermission && matchesMax && matchesDesiredRange && fromApprovedUniversity && matchesUniversity && notExcludedUniversity;
    });
  }, [featuredScholarships, searchTerm, selectedLevel, selectedField, selectedDeliveryMode, selectedWorkPermission, maxValue, desiredScholarshipRange, selectedUniversity, userProfile?.has_paid_selection_process_fee, approvedUniversityIds.size]);







  // Função para lidar com seleção de método de pagamento
  const handlePaymentMethodSelect = async (method: 'stripe' | 'zelle' | 'pix' | 'parcelow', _exchangeRate?: number, payerInfo?: any) => {
    console.log('🔍 [ScholarshipBrowser] Método de pagamento selecionado:', method, 'Payer Info:', payerInfo);
    setSelectedPaymentMethod(method);

    try {
      await handleCheckout(method, payerInfo);
    } catch (error) {
      console.error('Error processing payment:', error);
      // Em caso de erro, fechar modal e redirecionar para página de erro
      setShowPaymentMethodSelector(false);
      setSelectedPaymentMethod(null);
      navigate('/student/dashboard/selection-process-fee-error');
    }
  };

  // ✅ ÚNICA função handleCheckout (igual ao StripeCheckout) para os 3 métodos
  const handleCheckout = async (paymentMethod: 'stripe' | 'zelle' | 'pix' | 'parcelow', payerInfo?: any) => {
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
              promotional_coupon: (window as any).__checkout_promotional_coupon || null,
              ...(payerInfo && { payer_info: payerInfo })
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
      <div className="rounded-[28px] bg-white p-4 sm:p-5">
        {/* Filters Container */}
        <div className="block space-y-4">
          {/* Search */}
          <div className="bg-white rounded-[28px] p-3 sm:p-4 border border-slate-200 w-full">
            <div className="flex flex-col w-full px-2 sm:px-3 py-1 justify-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                {t('studentDashboard.findScholarships.filters.search')}
              </span>
              <div className="flex items-center">
                <Search className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder={t('studentDashboard.findScholarships.searchPlaceholder')}
                  value={searchTerm}
                  aria-label="Search scholarships"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent outline-none border-none text-sm font-bold text-slate-800 placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 w-full">
            {/* Level Filter */}
            <div>
              <label htmlFor="level-filter" className="block text-xs font-medium text-slate-700 mb-1 md:hidden">{t('studentDashboard.findScholarships.filters.academicLevel')}</label>
              <select
                id="level-filter"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-slate-400 transition-all duration-200 text-sm font-semibold"
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
                className="w-full px-3 sm:px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-slate-400 transition-all duration-200 text-sm font-semibold"
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
                className="w-full px-3 sm:px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-slate-400 transition-all duration-200 text-sm font-semibold"
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
                className="w-full px-3 sm:px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-slate-400 transition-all duration-200 text-sm font-semibold"
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
                  className="w-full px-3 sm:px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-slate-400 transition-all duration-200 text-sm font-semibold"
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

            {/* Value Filter */}
            <div>
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
                  className="w-full px-3 sm:px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-slate-400 transition-all duration-200 text-sm font-semibold"
                  aria-label="Maximum value"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-3 mt-5">
          {(searchTerm || selectedLevel !== 'all' || selectedField !== 'all' || selectedDeliveryMode !== 'all' || selectedWorkPermission !== 'all' || (userProfile?.has_paid_selection_process_fee && selectedUniversity !== 'all') || maxValue) && (
            <button
              type="button"
              onClick={(e) => clearAllFilters(e)}
            className="w-full sm:w-auto bg-slate-100 text-slate-700 px-4 sm:px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base border border-slate-200"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">{t('studentDashboard.findScholarships.filters.clearAllFilters')}</span>
              <span className="sm:hidden">{t('studentDashboard.findScholarships.filters.clear')}</span>
            </button>
          )}


        </div>

      </div>

      {/* Featured Scholarships Section - Only show if there are featured scholarships after filtering */}
      {currentPage === 1 && filteredFeaturedScholarships.length > 0 && (
        featuredLoading ? (
          <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex items-center justify-center py-8 sm:py-12">
              <div className="text-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-3 sm:mb-4"></div>
                <p className="text-sm sm:text-base text-slate-600">{t('studentDashboard.findScholarships.featuredScholarships.loading')}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="mb-4 sm:mb-6 text-center">
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {t('studentDashboard.findScholarships.featuredScholarships.title')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredFeaturedScholarships.map((scholarship) => {
                const layoutId = `featured-scholarship-${scholarship.id}`;
                const canViewSensitive = userProfile?.has_paid_selection_process_fee || userProfile?.role === 'admin' || userProfile?.role === 'post_sales';
                const scholarshipValue = Number(scholarship.annual_value_with_scholarship || scholarship.amount || 0);
                const originalValue = Number(scholarship.original_annual_value || scholarship.amount || 0);
                const savingsPercentage = originalValue > scholarshipValue && originalValue > 0
                  ? Math.round(((originalValue - scholarshipValue) / originalValue) * 100)
                  : 0;
                return (
                  <motion.div
                    key={scholarship.id}
                    ref={(el) => {
                      if (el) scholarshipRefs.current.set(scholarship.id, el);
                    }}
                    layoutId={layoutId}
                    className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border-2 border-slate-200/60 hover:border-[#05294E]/20 flex flex-col h-full hover:-translate-y-2"
                  >
                    {/* Scholarship Image Banner (Overlay Layout) */}
                    <div className="relative w-full aspect-[8/3] bg-white z-10 overflow-hidden border-b border-slate-100 shrink-0">
                      {/* Full Background Image */}
                      <div className="absolute inset-0 z-0">
                        {scholarship.image_url && !brokenImageIds.has(scholarship.id) ? (
                          <img
                            src={scholarship.image_url}
                            alt={scholarship.title}
                            onError={() => markImageAsBroken(scholarship.id)}
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
                          {scholarship.field_of_study || t('scholarships:scholarshipsPage.filters.anyField')}
                        </p>
                      </div>
                      
                      {/* Top Right Badges */}
                      <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
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
                      {/* Warning for $3800 scholarships */}
                      <ScholarshipExpiryWarning scholarship={scholarship} variant="badge" className="mb-3" />

                      {/* Title */}
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2 leading-tight line-clamp-2">
                        {scholarship.title}
                      </h3>
                      
                      {/* Field and Level Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm flex items-center gap-1.5 ${getFieldBadgeColor(scholarship.field_of_study)}`}>
                          <GraduationCap className="h-3.5 w-3.5" strokeWidth={2.5} />
                          <span className="whitespace-normal break-words">{scholarship.field_of_study || 'Any Field'}</span>
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 w-fit">
                          {getLevelIcon(scholarship.level || 'undergraduate')}
                          <span className="capitalize">{scholarship.level || 'undergraduate'}</span>
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
                                    src={scholarship.universities.logo_url} 
                                    alt={scholarship.universities.name || "University Logo"} 
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
                              {t('studentDashboard.findScholarships.scholarshipCard.university')}
                            </p>
                            <p className={`text-sm font-bold truncate ${!canViewSensitive ? 'blur-sm text-slate-400' : 'text-slate-700'}`}>
                              {canViewSensitive
                                ? (scholarship.universities?.name || 'Unknown University')
                                : '********'}
                            </p>
                          </div>
                        </div>

                        {/* Course Modality */}
                        {scholarship.delivery_mode && (
                          <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-700">
                                {t('studentDashboard.findScholarships.scholarshipCard.studyMode')}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tight text-slate-700 bg-slate-100 border border-slate-200">
                              {getDeliveryModeLabel(scholarship.delivery_mode)}
                            </span>
                          </div>
                        )}

                        {/* Work Permissions */}
                        {scholarship.work_permissions && scholarship.work_permissions.length > 0 && (
                          <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <span className="text-xs font-bold text-slate-700 whitespace-nowrap mr-2">
                              {t('studentDashboard.findScholarships.scholarshipCard.workAuthorization')}
                            </span>
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {scholarship.work_permissions.filter((p: any) => String(p).toUpperCase() !== 'F1').slice(0, 3).map((permission: string, index: number) => (
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

                      {/* Financial Overview */}
                      <div className="mb-4">
                        <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm group-hover:shadow-md transition-shadow duration-300">
                          <h4 className="text-[11px] font-black text-slate-800 mb-3 flex items-center gap-1.5 uppercase tracking-widest">
                            <DollarSign className="h-3.5 w-3.5 text-green-600" />
                            {t('studentDashboard.findScholarships.scholarshipCard.financialOverview')}
                          </h4>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-xs font-medium">{t('studentDashboard.findScholarships.scholarshipCard.originalPrice')}</span>
                              <span className="text-slate-500 text-xs font-bold line-through">
                                {formatCurrency(originalValue)}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-xs font-medium">{t('studentDashboard.findScholarships.scholarshipCard.withScholarship')}</span>
                              <span className="text-green-700 font-extrabold text-base">
                                {formatCurrency(scholarshipValue)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                              <span className="text-slate-400 text-xs font-medium">{t('studentDashboard.findScholarships.scholarshipCard.perCredit')}</span>
                              <span className="text-slate-500 text-xs font-bold">
                                {formatCurrency(Number(scholarship.original_value_per_credit || scholarship.per_credit_cost || 0))}
                              </span>
                            </div>
                            
                            {savingsPercentage > 0 && (
                              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                                <span className="text-slate-400 text-xs font-medium">
                                  {t('studentDashboard.findScholarships.scholarshipCard.scholarshipDiscount')}
                                </span>
                                <span className="text-green-600 text-xs font-black">{savingsPercentage}% OFF</span>
                              </div>
                            )}

                            {userProfile?.placement_fee_flow && (() => {
                              const placementFeeAmount = scholarship.placement_fee_amount ? Number(scholarship.placement_fee_amount) : null;
                              const placementFee = getPlacementFee(scholarshipValue, placementFeeAmount);
                              return (
                                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                                  <span className="text-slate-400 text-xs font-medium">{t('studentDashboard.myApplications.paymentStatus.placementFee')}</span>
                                  <span className="text-blue-600 text-xs font-black">{formatCurrency(placementFee)}</span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-auto">
                        <button
                          onClick={() => openScholarshipModal(scholarship)}
                          className="w-full bg-gradient-to-r from-[#05294E] to-slate-700 text-white py-3 sm:py-4 px-2 sm:px-4 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center relative overflow-hidden transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                          <span className="relative z-10 truncate">
                            {t('studentDashboard.findScholarships.scholarshipCard.details')}
                          </span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* Scholarships Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {paginatedScholarships.map((scholarship) => {
          const layoutId = `scholarship-card-${scholarship.id}`;
          const canViewSensitive = userProfile?.has_paid_selection_process_fee || userProfile?.role === 'admin' || userProfile?.role === 'post_sales';
          const scholarshipValue = Number(scholarship.annual_value_with_scholarship || scholarship.amount || 0);
          const originalValue = Number(scholarship.original_annual_value || scholarship.amount || 0);
          const savingsPercentage = originalValue > scholarshipValue && originalValue > 0
            ? Math.round(((originalValue - scholarshipValue) / originalValue) * 100)
            : 0;
          return (
            <motion.div
              key={scholarship.id}
              ref={(el) => {
                if (el) scholarshipRefs.current.set(scholarship.id, el);
              }}
              layoutId={layoutId}
              className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border-2 border-slate-200/60 hover:border-[#05294E]/20 flex flex-col h-full hover:-translate-y-2"
            >
              {/* Scholarship Image Banner (Overlay Layout) */}
              <div className="relative w-full aspect-[8/3] bg-white z-10 overflow-hidden border-b border-slate-100 shrink-0">
                {/* Full Background Image */}
                <div className="absolute inset-0 z-0">
                  {scholarship.image_url && !brokenImageIds.has(scholarship.id) ? (
                    <img
                      src={scholarship.image_url}
                      alt={scholarship.title}
                      onError={() => markImageAsBroken(scholarship.id)}
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
                    {scholarship.field_of_study || t('scholarships:scholarshipsPage.filters.anyField')}
                  </p>
                </div>
                
                {/* Top Right Badges */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
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
                {/* Warning for $3800 scholarships */}
                <ScholarshipExpiryWarning scholarship={scholarship} variant="badge" className="mb-3" />

                {/* Title */}
                <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2 leading-tight line-clamp-2">
                  {scholarship.title}
                </h3>
                
                {/* Field and Level Badges */}
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm flex items-center gap-1.5 ${getFieldBadgeColor(scholarship.field_of_study)}`}>
                    <GraduationCap className="h-3.5 w-3.5" strokeWidth={2.5} />
                    <span className="whitespace-normal break-words">{scholarship.field_of_study || 'Any Field'}</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 w-fit">
                    {getLevelIcon(scholarship.level || 'undergraduate')}
                    <span className="capitalize">{scholarship.level || 'undergraduate'}</span>
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
                              src={scholarship.universities.logo_url} 
                              alt={scholarship.universities.name || "University Logo"} 
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
                        {t('studentDashboard.findScholarships.scholarshipCard.university')}
                      </p>
                      <p className={`text-sm font-bold truncate ${!canViewSensitive ? 'blur-sm text-slate-400' : 'text-slate-700'}`}>
                        {canViewSensitive
                          ? (scholarship.universities?.name || 'Unknown University')
                          : '********'}
                      </p>
                    </div>
                  </div>

                  {/* Course Modality */}
                  {scholarship.delivery_mode && (
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">
                          {t('studentDashboard.findScholarships.scholarshipCard.studyMode')}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tight text-slate-700 bg-slate-100 border border-slate-200">
                        {getDeliveryModeLabel(scholarship.delivery_mode)}
                      </span>
                    </div>
                  )}

                  {/* Work Permissions */}
                  {scholarship.work_permissions && scholarship.work_permissions.length > 0 && (
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
                      <span className="text-xs font-bold text-slate-700 whitespace-nowrap mr-2">
                        {t('studentDashboard.findScholarships.scholarshipCard.workAuthorization')}
                      </span>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {scholarship.work_permissions.filter((p: any) => String(p).toUpperCase() !== 'F1').slice(0, 3).map((permission: string, index: number) => (
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

                {/* Financial Overview */}
                <div className="mb-4">
                  <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm group-hover:shadow-md transition-shadow duration-300">
                    <h4 className="text-[11px] font-black text-slate-800 mb-3 flex items-center gap-1.5 uppercase tracking-widest">
                      <DollarSign className="h-3.5 w-3.5 text-green-600" />
                      {t('studentDashboard.findScholarships.scholarshipCard.financialOverview')}
                    </h4>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-xs font-medium">{t('studentDashboard.findScholarships.scholarshipCard.originalPrice')}</span>
                        <span className="text-slate-500 text-xs font-bold line-through">
                          {formatCurrency(originalValue)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-xs font-medium">{t('studentDashboard.findScholarships.scholarshipCard.withScholarship')}</span>
                        <span className="text-green-700 font-extrabold text-base">
                          {formatCurrency(scholarshipValue)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                        <span className="text-slate-400 text-xs font-medium">{t('studentDashboard.findScholarships.scholarshipCard.perCredit')}</span>
                        <span className="text-slate-500 text-xs font-bold">
                          {formatCurrency(Number(scholarship.original_value_per_credit || scholarship.per_credit_cost || 0))}
                        </span>
                      </div>
                      
                      {savingsPercentage > 0 && (
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                          <span className="text-slate-400 text-xs font-medium">
                            {t('studentDashboard.findScholarships.scholarshipCard.scholarshipDiscount')}
                          </span>
                          <span className="text-green-600 text-xs font-black">{savingsPercentage}% OFF</span>
                        </div>
                      )}

                      {userProfile?.placement_fee_flow && (() => {
                        const placementFeeAmount = scholarship.placement_fee_amount ? Number(scholarship.placement_fee_amount) : null;
                        const placementFee = getPlacementFee(scholarshipValue, placementFeeAmount);
                        return (
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                            <span className="text-slate-400 text-xs font-medium">{t('studentDashboard.myApplications.paymentStatus.placementFee')}</span>
                            <span className="text-blue-600 text-xs font-black">{formatCurrency(placementFee)}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-auto">
                  <button
                    onClick={() => openScholarshipModal(scholarship)}
                    className="w-full bg-gradient-to-r from-[#05294E] to-slate-700 text-white py-3 sm:py-4 px-2 sm:px-4 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center relative overflow-hidden transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    <span className="relative z-10 truncate">
                      {t('studentDashboard.findScholarships.scholarshipCard.details')}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
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
              : 'bg-[#05294E] text-white hover:bg-[#05294E]/90 hover:scale-105'
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
                    ? 'bg-[#05294E] text-white'
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
              : 'bg-[#05294E] text-white hover:bg-[#05294E]/90 hover:scale-105'
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
