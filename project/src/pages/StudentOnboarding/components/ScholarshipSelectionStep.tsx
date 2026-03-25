import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Award, Building, DollarSign, X, CheckCircle2, Info, Search, GraduationCap, BookOpen, Monitor, Briefcase, Calendar, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useCartStore } from '../../../stores/applicationStore';
import { useScholarships } from '../../../hooks/useScholarships';
import { usePackageScholarshipFilter } from '../../../hooks/usePackageScholarshipFilter';
import { StepProps } from '../types';
import { ScholarshipCardFull } from './ScholarshipCardFull';
import ScholarshipDetailModal from '../../../components/ScholarshipDetailModal';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { is3800ScholarshipBlocked } from '../../../utils/scholarshipDeadlineValidation';
import { formatAmount } from '../../../utils/scholarshipHelpers';
import { AlertTriangle, Loader2, AlertCircle as AlertCircleIcon } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

export const ScholarshipSelectionStep: React.FC<StepProps> = ({ onNext, onBack: _onBack }) => {
  const { t } = useTranslation(['registration', 'scholarships', 'common']);
  const { user, userProfile } = useAuth();
  const { cart, addToCart, removeFromCart, fetchCart } = useCartStore();
  const { scholarships: allScholarships, loading: scholarshipsLoading, error: scholarshipsError } = useScholarships();
  const { minScholarshipValue, loading: packageFilterLoading } = usePackageScholarshipFilter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const isManuallyUpdatingRef = React.useRef(false);
  const lastCartRef = React.useRef<string>('');
  const [isLocked, setIsLocked] = useState(false);
  const [selectedScholarshipForModal, setSelectedScholarshipForModal] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedField, setSelectedField] = useState<string>('all');
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState<string>('all');
  const [selectedWorkPermission, setSelectedWorkPermission] = useState<string>('all');
  const [selectedUniversity, setSelectedUniversity] = useState<string>('all');
  const [minValue, setMinValue] = useState<string>('');
  const [maxValue, setMaxValue] = useState<string>('');
  const [deadlineDays, setDeadlineDays] = useState<string>('');
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [removingScholarshipId, setRemovingScholarshipId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const scholarshipsGridRef = React.useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 12;

  // Obter faixa de bolsa desejada do perfil do usuário
  const desiredScholarshipRange = (userProfile as any)?.desired_scholarship_range ?? null;

  useEffect(() => {
    if (user?.id) {
      fetchCart(user.id);
    }
  }, [user?.id, fetchCart]);

  // Verificar se já passou pela review (tem process type selecionado)
  // IMPORTANTE: Só considerar bloqueado se o usuário já pagou a taxa de seleção
  // Isso evita mostrar "Etapa Concluída" quando há dados antigos
  useEffect(() => {
    const checkIfLocked = async () => {
      if (!userProfile?.id) return;
      
      // Só verificar se já passou pela review se o usuário já pagou a taxa de seleção
      if (!userProfile.has_paid_selection_process_fee) {
        setIsLocked(false);
        return;
      }
      
      try {
        // Verificar se há aplicações com process type (indica que já passou pela review)
        const { data: applications } = await supabase
          .from('scholarship_applications')
          .select('student_process_type')
          .eq('student_id', userProfile.id)
          .limit(1);
        
        // Só considerar bloqueado se realmente há aplicações criadas com process type
        // Não usar localStorage para evitar dados antigos
        const hasProcessType = applications && applications.length > 0 && !!applications[0].student_process_type;
        
        setIsLocked(hasProcessType ? true : false);
      } catch (error) {
        console.error('Error checking if locked:', error);
        setIsLocked(false);
      }
    };
    
    checkIfLocked();
  }, [userProfile?.id, userProfile?.has_paid_selection_process_fee]);

  useEffect(() => {
    // Sincronizar selectedIds com cart
    // Mas não sobrescrever se acabamos de fazer uma atualização manual
    if (isManuallyUpdatingRef.current) {
      // Resetar flag após um pequeno delay para permitir que a atualização do store seja processada
      setTimeout(() => {
        isManuallyUpdatingRef.current = false;
      }, 100);
      return;
    }
    
    // Criar uma chave única baseada nos IDs do cart para detectar mudanças
    const cartIdsArray = cart.map(item => item.scholarships.id).sort();
    const cartKey = cartIdsArray.join(',');
    
    // Só atualizar se o cart realmente mudou (evitar re-renders desnecessários)
    if (lastCartRef.current === cartKey) {
      return;
    }
    
    lastCartRef.current = cartKey;
    const cartIds = new Set(cartIdsArray);
    
    // Atualizar selectedIds apenas se houver diferença
    setSelectedIds(prev => {
      const prevArray = Array.from(prev).sort();
      if (prevArray.length !== cartIdsArray.length || 
          !prevArray.every((id, index) => id === cartIdsArray[index])) {
        return cartIds;
      }
      return prev;
    });
  }, [cart]);

  // Extrair opções únicas das bolsas para os filtros
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
    const universitiesMap = new Map();

    allScholarships?.forEach((scholarship: any) => {
      // Levels
      if (scholarship.level && typeof scholarship.level === 'string') {
        levelSet.add(scholarship.level);
      }
      // Fields
      if (scholarship.field_of_study && typeof scholarship.field_of_study === 'string') {
        fieldSet.add(scholarship.field_of_study);
      }
      // Delivery Modes
      if (scholarship.delivery_mode && typeof scholarship.delivery_mode === 'string') {
        deliverySet.add(scholarship.delivery_mode);
      }
      // Work Permissions (excluir F1)
      if (Array.isArray(scholarship.work_permissions)) {
        scholarship.work_permissions.forEach((wp: any) => {
          if (typeof wp === 'string' && wp.trim() !== '' && wp.trim().toUpperCase() !== 'F1') {
            workPermSet.add(wp);
          }
        });
      }
      // Universities
      if (scholarship.universities?.id && scholarship.universities?.is_approved) {
        universitiesMap.set(scholarship.universities.id, {
          id: scholarship.universities.id,
          name: scholarship.universities.name
        });
      }
    });

    return {
      uniqueLevels: Array.from(levelSet).sort(),
      uniqueFields: Array.from(fieldSet).sort(),
      uniqueDeliveryModes: Array.from(deliverySet).sort(),
      uniqueWorkPermissions: Array.from(workPermSet).sort(),
      uniqueUniversities: Array.from(universitiesMap.values()).sort((a, b) => 
      String(a.name).localeCompare(String(b.name))
      )
    };
  }, [allScholarships]);

  // Função para calcular dias até o deadline
  const getDaysUntilDeadline = useCallback((deadline: string) => {
    if (!deadline) return Infinity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [year, month, day] = deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day);
    deadlineDate.setHours(23, 59, 59, 999);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  // Função para obter label do delivery mode
  const getDeliveryModeLabel = useCallback((mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'online':
        return t('scholarshipSelection.filters.deliveryModeOptions.online');
      case 'in_person':
        return t('scholarshipSelection.filters.deliveryModeOptions.in_person');
      case 'hybrid':
        return t('scholarshipSelection.filters.deliveryModeOptions.hybrid');
      default:
        return mode || t('scholarshipSelection.filters.deliveryModeOptions.mixed');
    }
  }, []);

  // Filtrar bolsas com todos os filtros
  const filteredScholarships = useMemo(() => {
    if (!allScholarships || allScholarships.length === 0) {
      return [];
    }

    // Busca por múltiplas palavras-chave
    const searchWords = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);

    return allScholarships.filter((scholarship: any) => {
      // 1. Filtrar apenas universidades aprovadas
      if (!scholarship.universities?.is_approved) {
        return false;
      }

      // 2. Filtro de busca
      if (searchWords.length > 0) {
        const text = `${scholarship.title} ${scholarship.description || ''} ${(scholarship.universities?.name || '')}`.toLowerCase();
        const matchesSearch = searchWords.every(word => text.includes(word));
        if (!matchesSearch) return false;
      }

      // 3. Filtro de nível acadêmico
      if (selectedLevel !== 'all') {
        if (!scholarship.level || scholarship.level.toLowerCase() !== selectedLevel.toLowerCase()) {
          return false;
        }
      }

      // 4. Filtro de área de estudo
      if (selectedField !== 'all') {
        if (!scholarship.field_of_study || 
            scholarship.field_of_study.toLowerCase() !== selectedField.toLowerCase()) {
          return false;
        }
      }

      // 5. Filtro de modalidade de estudo
      if (selectedDeliveryMode !== 'all') {
        if (!scholarship.delivery_mode || 
            scholarship.delivery_mode.toLowerCase() !== selectedDeliveryMode.toLowerCase()) {
          return false;
        }
      }

      // 6. Filtro de autorização de trabalho
      if (selectedWorkPermission !== 'all') {
        if (!scholarship.work_permissions || 
            !Array.isArray(scholarship.work_permissions) ||
            !scholarship.work_permissions.some((perm: any) => 
              perm && typeof perm === 'string' && perm.toLowerCase() === selectedWorkPermission.toLowerCase()
            )) {
          return false;
        }
      }

      // 7. Filtro por universidade selecionada
      if (selectedUniversity !== 'all') {
        const universityId = scholarship.universities?.id ?? scholarship.university_id ?? null;
        if (String(universityId) !== String(selectedUniversity)) {
          return false;
        }
      }

      // 8. Filtro automático baseado na faixa de bolsa desejada ou pacote do usuário
      const scholarshipValue = scholarship.annual_value_with_scholarship ?? scholarship.amount ?? 0;
      
      if (desiredScholarshipRange !== null && desiredScholarshipRange !== undefined) {
        if (scholarshipValue < desiredScholarshipRange) {
          return false;
        }
      } else if (minScholarshipValue !== null && minScholarshipValue !== undefined) {
        if (scholarshipValue < minScholarshipValue) {
          return false;
        }
      }

      // 9. Filtro por valor mínimo
      if (minValue && minValue !== '') {
        const minValueNum = Number(minValue);
        if (!isNaN(minValueNum) && scholarshipValue < minValueNum) {
          return false;
        }
      }

      // 10. Filtro por valor máximo
      if (maxValue && maxValue !== '') {
        const maxValueNum = Number(maxValue);
        if (!isNaN(maxValueNum) && scholarshipValue > maxValueNum) {
          return false;
        }
      }

      // 11. Filtro de deadline
      if (deadlineDays && deadlineDays !== '') {
        const deadlineDaysNum = Number(deadlineDays);
        if (!isNaN(deadlineDaysNum) && scholarship.deadline) {
          const daysLeft = getDaysUntilDeadline(scholarship.deadline);
          if (daysLeft < deadlineDaysNum) {
            return false;
          }
        }
      }

      return true;
    });
  }, [
    allScholarships, 
    searchTerm,
    selectedLevel,
    selectedField,
    selectedDeliveryMode,
    selectedWorkPermission,
    selectedUniversity,
    minValue,
    maxValue,
    deadlineDays,
    desiredScholarshipRange,
    minScholarshipValue,
    getDaysUntilDeadline
  ]);

  // Separar bolsas em destaque e ordenar
  const sortedScholarships = useMemo(() => {
    if (!filteredScholarships || filteredScholarships.length === 0) {
      return [];
    }

    // Ordenação global baseada em preço ascendente
    const sorted = [...filteredScholarships].sort((a, b) => {
      // 1. Prioridade Estrita: Menor Preço (Tuition)
      // Conforme solicitado pelo usuário: "aparecer primeiro as mais baratas, mesmo que se ela tiver esgotada"
      const aVal = a.annual_value_with_scholarship ?? a.amount ?? 0;
      const bVal = b.annual_value_with_scholarship ?? b.amount ?? 0;
      const aPrice = Number(aVal);
      const bPrice = Number(bVal);
      
      if (aPrice !== bPrice) {
        return aPrice - bPrice;
      }

      // 2. Fallback: Destaque original ou disponibilidade para desempate extra
      if (a.is_highlighted !== b.is_highlighted) return a.is_highlighted ? -1 : 1;
      
      const aActive = a.is_active && !is3800ScholarshipBlocked(a);
      const bActive = b.is_active && !is3800ScholarshipBlocked(b);
      if (aActive !== bActive) return aActive ? -1 : 1;

      return 0;
    });

    // ✅ LÓGICA DE DESTAQUE DINÂMICO: As 6 primeiras DISPONÍVEIS ganham tag de destaque
    let availableCount = 0;
    return sorted.map(s => {
      const isBlockedOrInactive = !s.is_active || is3800ScholarshipBlocked(s);
      let is_highlighted = s.is_highlighted; // Mantém o original se já for
      
      if (!isBlockedOrInactive && availableCount < 6) {
        is_highlighted = true;
        availableCount++;
      }
      
      // Retornamos um novo objeto com o is_highlighted sobreposto
      return { ...s, is_highlighted };
    });
  }, [filteredScholarships]);

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUniversity, minValue, maxValue, searchTerm, selectedLevel, selectedField, selectedDeliveryMode, selectedWorkPermission, deadlineDays]);

  // Paginação
  const totalPages = Math.ceil(sortedScholarships.length / ITEMS_PER_PAGE);
  const paginatedScholarships = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedScholarships.slice(startIndex, endIndex);
  }, [sortedScholarships, currentPage]);

  const hasActiveFilters = 
    searchTerm !== '' ||
    selectedLevel !== 'all' ||
    selectedField !== 'all' ||
    selectedDeliveryMode !== 'all' ||
    selectedWorkPermission !== 'all' ||
    selectedUniversity !== 'all' ||
    minValue !== '' ||
    maxValue !== '' ||
    deadlineDays !== '';

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedLevel('all');
    setSelectedField('all');
    setSelectedDeliveryMode('all');
    setSelectedWorkPermission('all');
    setSelectedUniversity('all');
    setMinValue('');
    setMaxValue('');
    setDeadlineDays('');
  };

  // Verificar se há bolsas bloqueadas no carrinho (para a revisão)
  const hasBlockedScholarships = useMemo(() => {
    return cart.some(item => {
      const scholarship = item.scholarships;
      // Verificar se está inativa ou se é bolsa de $3800 bloqueada
      return !scholarship.is_active || is3800ScholarshipBlocked(scholarship);
    });
  }, [cart]);

  const handleRemoveScholarship = async (scholarshipId: string) => {
    if (!user?.id || removingScholarshipId) return;
    
    setRemovingScholarshipId(scholarshipId);
    try {
      // Atualização otimista
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(scholarshipId);
        return next;
      });
      await removeFromCart(scholarshipId, user.id);
    } catch (error) {
      console.error('Error removing scholarship from cart:', error);
      // Reverter sincronizando com o cart
      const cartIds = new Set(cart.map(item => item.scholarships.id));
      setSelectedIds(cartIds);
    } finally {
      setRemovingScholarshipId(null);
    }
  };

  const loading = scholarshipsLoading || packageFilterLoading;
  const displayError = error || (scholarshipsError ? 'Erro ao carregar bolsas. Tente novamente.' : null);

  const toggleSelection = useCallback(async (scholarship: any) => {
    if (!user?.id) return;
    
    // Bloquear se já passou pela review
    if (isLocked) {
      setError(t('scholarshipSelection.errors.alreadyLocked'));
      return;
    }

    const isSelected = selectedIds.has(scholarship.id);
    console.log('🔄 [ScholarshipSelection] Toggling scholarship:', scholarship.id, 'isSelected:', isSelected);

    try {
      // Marcar que estamos fazendo uma atualização manual
      isManuallyUpdatingRef.current = true;
      
      // Atualização otimista: atualizar UI imediatamente
      if (isSelected) {
        // Remover: atualizar localmente primeiro
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(scholarship.id);
          console.log('✅ [ScholarshipSelection] Removed locally, new size:', next.size);
          return next;
        });
        // Depois atualizar no store/banco
        await removeFromCart(scholarship.id, user.id);
        console.log('✅ [ScholarshipSelection] Removed from cart/store');
      } else {
        // Adicionar: atualizar localmente primeiro
        setSelectedIds(prev => {
          const next = new Set(prev).add(scholarship.id);
          console.log('✅ [ScholarshipSelection] Added locally, new size:', next.size);
          return next;
        });
        // Depois atualizar no store/banco
        await addToCart(scholarship, user.id);
        console.log('✅ [ScholarshipSelection] Added to cart/store');
      }
      
      // Resetar flag após um delay para permitir que o useEffect processe a mudança do cart
      setTimeout(() => {
        isManuallyUpdatingRef.current = false;
        console.log('🔄 [ScholarshipSelection] Reset manual update flag');
      }, 200);
    } catch (err) {
      console.error('❌ [ScholarshipSelection] Error toggling scholarship:', err);
      setError(t('scholarshipSelection.errors.updateError'));
      
      // Em caso de erro, reverter a atualização otimista sincronizando com o cart
      const cartIds = new Set(cart.map(item => item.scholarships.id));
      setSelectedIds(cartIds);
      isManuallyUpdatingRef.current = false;
      console.log('🔄 [ScholarshipSelection] Reverted to cart state due to error');
    }
  }, [user?.id, selectedIds, addToCart, removeFromCart, cart]);

  const handleContinue = () => {
    // Se já está bloqueado (passou pela review), permitir continuar mesmo sem selecionar novamente
    if (isLocked) {
      setError(null);
      onNext();
      return;
    }
    
    if (selectedIds.size === 0) {
      setError(t('scholarshipSelection.errors.selectRequired'));
      return;
    }
    
    setError(null);

    // Se já estiver na revisão, chamar onNext para ir para a próxima etapa (process_type)
    if (isReviewing) {
      // Validar se há bolsas bloqueadas antes de prosseguir
      const blockedScholarship = cart.find(item => {
        const scholarship = item.scholarships;
        return !scholarship.is_active || is3800ScholarshipBlocked(scholarship);
      });

      if (blockedScholarship) return;
      setShowConfirmModal(true);
    } else {
      // Iniciar transição para a revisão
      setIsTransitioning(true);
      setTimeout(() => {
        setIsReviewing(true);
        // Pequeno delay para garantir que o DOM atualizou antes de remover o blur
        setTimeout(() => setIsTransitioning(false), 50);
      }, 800);
    }
  };

  // Scroll to top when page changes
  useEffect(() => {
    if (!isReviewing && !scholarshipsLoading) {
      scholarshipsGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPage, isReviewing, scholarshipsLoading]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-5 sm:p-6 border border-blue-100">
          <div className="text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{t('scholarshipSelection.header.title')}</h2>
            <p className="text-base sm:text-lg text-gray-700 font-medium">{t('scholarshipSelection.header.subtitle')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6 animate-pulse">
              <div className="h-40 bg-slate-200 rounded-lg mb-4"></div>
              <div className="h-4 bg-slate-200 rounded mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
              <div className="h-10 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderReviewStep = () => {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="max-w-4xl mx-auto w-full px-4">
          <h1 className="text-center md:text-left text-2xl sm:text-4xl font-black mb-4 text-slate-900 uppercase tracking-tighter">
            <span>{t('scholarshipSelection.review.title')}</span>
          </h1>
          
          {/* Description */}
          <div className="bg-amber-50 border-l-4 border-amber-400 p-6 mb-8 rounded-2xl shadow-sm">
            <div className="flex">
              <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="ml-4">
                <p className="text-base font-black text-amber-900 mb-1 uppercase tracking-tight">
                  {t('scholarshipSelection.review.warningTitle')}
                </p>
                <p className="text-sm text-amber-800 font-medium leading-relaxed">
                  {t('scholarshipSelection.review.warningDescription')}
                </p>
              </div>
            </div>
          </div>

          {/* Cart Contents */}
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 p-6 sm:px-24 py-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
            
            <div className="relative z-10">
              <ul className="divide-y divide-slate-100 mb-8 font-medium">
                {cart.map((item) => {
                  const scholarship = item.scholarships;
                  const isBlocked = !scholarship.is_active || is3800ScholarshipBlocked(scholarship);
                  const isRemoving = removingScholarshipId === scholarship.id;
                  
                  return (
                    <li key={scholarship.id} className="py-6 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="font-black text-slate-900 text-lg uppercase tracking-tight mb-1">{scholarship.title}</div>
                              <div className="text-slate-500 text-sm mb-2 flex items-center">
                                <Building className="w-4 h-4 mr-1.5" />
                                {scholarship.universities?.name || scholarship.university_name || t('scholarshipSelection.review.unknownUniversity')}
                              </div>
                              <div className="text-lg font-black text-green-600">
                                ${formatAmount(scholarship.annual_value_with_scholarship || scholarship.amount || 'N/A')}
                              </div>
                            </div>
                            {!isRemoving && !isBlocked && !isLocked && (
                              <button
                                onClick={() => handleRemoveScholarship(scholarship.id)}
                                className="flex-shrink-0 p-2.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all border border-transparent hover:border-red-100"
                                title={t('scholarshipSelection.review.removeButton')}
                              >
                                <X className="h-5 h-5" />
                              </button>
                            )}
                            {isRemoving && (
                              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {hasBlockedScholarships && (
                <div className="mb-6 p-5 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4">
                  <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-red-800 mb-1 uppercase tracking-tight">
                      {t('studentDashboard.cartPage.cannotProceed') || 'Não é possível prosseguir'}
                    </p>
                    <p className="text-sm text-red-700 font-medium">
                      {t('studentDashboard.cartPage.removeBlockedScholarships') || 'Por favor, remova bolsas expiradas ou indisponíveis para continuar.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={() => {
                    setIsTransitioning(true);
                    setTimeout(() => {
                      setIsReviewing(false);
                      setTimeout(() => setIsTransitioning(false), 50);
                    }, 500);
                  }}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest text-sm"
                >
                  {t('scholarshipSelection.review.backButton')}
                </button>
                <button
                  onClick={handleContinue}
                  disabled={hasBlockedScholarships || cart.length === 0}
                  className="flex-1 w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
                >
                  <span>{t('scholarshipSelection.review.continueButton')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Se já passou pela review, mostrar tela de etapa concluída
  if (isLocked) {
    return (
      <div className="space-y-10 pb-12 max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center md:text-left space-y-4">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">{t('scholarshipSelection.completed.title')}</h2>
        </div>

        {/* Main White Container */}
        <div className="bg-white border border-emerald-500/30 ring-1 ring-emerald-500/20 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
          
          <div className="relative z-10 text-center py-6">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-3 uppercase tracking-tight">{t('scholarshipSelection.completed.cardTitle')}</h3>
            <p className="text-gray-500 mb-8 font-medium">{t('scholarshipSelection.completed.cardText')}</p>
            <button
              onClick={handleContinue}
              className="w-full max-w-xs bg-blue-600 text-white py-4 px-8 rounded-xl hover:bg-blue-700 transition-all font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 mx-auto"
            >
              {t('scholarshipSelection.completed.continueButton')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-all duration-500 ease-in-out transform ${
      isTransitioning 
        ? 'opacity-60 scale-[0.99] blur-md select-none pointer-events-none' 
        : 'opacity-100 scale-100 blur-0'
    }`}>
      {isReviewing ? (
        renderReviewStep()
      ) : (
        <div className="space-y-6 pb-24 sm:pb-6">
          {/* Header Section */}
          <div>
            <div className="text-center md:text-left mb-8 space-y-4">
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                {t('scholarshipSelection.header.title')}
              </h2>
              <p className="text-lg md:text-xl text-slate-600 font-medium max-w-3xl mx-auto md:mx-0">
                {t('scholarshipSelection.header.subtitle')}
              </p>
            </div>

            {/* Instructions Box - Sem background azul */}
            <div 
              className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm"
            >
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">
                    {t('scholarshipSelection.quickGuide.title')}
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span dangerouslySetInnerHTML={{ __html: t('scholarshipSelection.quickGuide.step1') }} />
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span dangerouslySetInnerHTML={{ __html: t('scholarshipSelection.quickGuide.step2') }} />
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span dangerouslySetInnerHTML={{ __html: t('scholarshipSelection.quickGuide.step3') }} />
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span dangerouslySetInnerHTML={{ __html: t('scholarshipSelection.quickGuide.step4') }} />
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {displayError && (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-center space-x-2">
              <AlertCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm font-medium text-red-700">{displayError}</p>
            </div>
          )}

          {/* Advanced Filters - Collapsible */}
          <div 
            className="bg-white rounded-xl border-2 border-slate-300 shadow-sm overflow-hidden"
          >
            {/* Filter Header - Always Visible */}
            <div 
              className="p-4 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
            >
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-semibold text-gray-900">
                  {t('scholarshipSelection.filters.title')}
                </h3>
                {hasActiveFilters && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {t('scholarshipSelection.filters.activeBadge')}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFilters();
                    }}
                    className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title={t('scholarshipSelection.filters.clear')}
                  >
                    <X className="w-3 h-3" />
                    <span>{t('scholarshipSelection.filters.clear')}</span>
                  </button>
                )}
                {filtersExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {/* Filter Content - Animatable */}
            {filtersExpanded && (
              <div className="p-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Search Bar */}
                  <div className="md:col-span-2 lg:col-span-1">
                    <label htmlFor="search" className="block text-xs font-medium text-slate-700 mb-1.5">
                      <Search className="h-3 w-3 inline mr-1" />
                      {t('scholarshipSelection.filters.searchKeyword')}
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="search"
                        type="search"
                        placeholder={t('scholarshipSelection.filters.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
                      />
                    </div>
                  </div>

                  {/* University Selection */}
                  <div>
                    <label htmlFor="university" className="block text-xs font-medium text-slate-700 mb-1.5">
                      <Building className="h-3 w-3 inline mr-1" />
                      {t('scholarshipSelection.filters.university')}
                    </label>
                    <select
                      id="university"
                      value={selectedUniversity}
                      onChange={(e) => setSelectedUniversity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
                    >
                      <option value="all">{t('scholarshipSelection.filters.allUniversities')}</option>
                      {uniqueUniversities.map((uni: any) => (
                        <option key={uni.id} value={uni.id}>{uni.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Academic Level */}
                  <div>
                    <label htmlFor="level" className="block text-xs font-medium text-slate-700 mb-1.5">
                      <GraduationCap className="h-3 w-3 inline mr-1" />
                      {t('scholarshipSelection.filters.studyLevel')}
                    </label>
                    <select
                      id="level"
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
                    >
                      <option value="all">{t('scholarshipSelection.filters.allLevels')}</option>
                      {uniqueLevels.map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>

                  {/* Field of Study */}
                  <div>
                    <label htmlFor="field" className="block text-xs font-medium text-slate-700 mb-1.5">
                      <BookOpen className="h-3 w-3 inline mr-1" />
                      {t('scholarshipSelection.filters.fieldOfStudy')}
                    </label>
                    <select
                      id="field"
                      value={selectedField}
                      onChange={(e) => setSelectedField(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
                    >
                      <option value="all">{t('scholarshipSelection.filters.allFields')}</option>
                      {uniqueFields.map((field) => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                    </select>
                  </div>

                  {/* Delivery Mode */}
                  <div>
                    <label htmlFor="delivery" className="block text-xs font-medium text-slate-700 mb-1.5">
                      <Monitor className="h-3 w-3 inline mr-1" />
                      {t('scholarshipSelection.filters.deliveryMode')}
                    </label>
                    <select
                      id="delivery"
                      value={selectedDeliveryMode}
                      onChange={(e) => setSelectedDeliveryMode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
                    >
                      <option value="all">{t('scholarshipSelection.filters.allDeliveryModes')}</option>
                      {uniqueDeliveryModes.map((mode) => (
                        <option key={mode} value={mode}>{getDeliveryModeLabel(mode)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Work Permission */}
                  <div>
                    <label htmlFor="work" className="block text-xs font-medium text-slate-700 mb-1.5">
                      <Briefcase className="h-3 w-3 inline mr-1" />
                      {t('scholarshipSelection.filters.workPermission')}
                    </label>
                    <select
                      id="work"
                      value={selectedWorkPermission}
                      onChange={(e) => setSelectedWorkPermission(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
                    >
                      <option value="all">{t('scholarshipSelection.filters.allWorkPermissions')}</option>
                      {uniqueWorkPermissions.map((wp) => (
                        <option key={wp} value={wp}>{wp}</option>
                      ))}
                    </select>
                  </div>

                  {/* Min Value Filter */}
                  <div>
                    <label htmlFor="min-value" className="block text-xs font-medium text-slate-700 mb-1.5">
                      <DollarSign className="h-3 w-3 inline mr-1" />
                      {t('scholarshipSelection.filters.minValue')}
                    </label>
                    <input
                      id="min-value"
                      type="number"
                      placeholder={t('scholarshipSelection.filters.minPlaceholder')}
                      value={minValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || (Number(value) >= 0)) {
                          setMinValue(value);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
                    />
                  </div>

                  {/* Max Value Filter */}
                  <div>
                  <label htmlFor="max-value" className="block text-xs font-medium text-slate-700 mb-1.5">
                    <DollarSign className="h-3 w-3 inline mr-1" />
                    {t('scholarshipSelection.filters.maxValue')}
                  </label>
                    <input
                      id="max-value"
                      type="number"
                      placeholder={t('scholarshipSelection.filters.maxPlaceholder')}
                      value={maxValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || (Number(value) >= 0)) {
                          setMaxValue(value);
                        }
                      }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
                    />
                  </div>

                {/* Deadline Filter */}
                <div>
                  <label htmlFor="deadline-days" className="block text-xs font-medium text-slate-700 mb-1.5">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {t('scholarshipSelection.filters.deadlineDays')}
                  </label>
                  <input
                    id="deadline-days"
                    type="number"
                    placeholder={t('scholarshipSelection.filters.deadlinePlaceholder')}
                    value={deadlineDays}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || (Number(value) >= 0)) {
                        setDeadlineDays(value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
                  />
                </div>
              </div>
                </div>
              )}
            </div>

          {/* Scholarships Grid */}
          <div ref={scholarshipsGridRef} className="scroll-mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {t('scholarshipSelection.grid.title')}
                {sortedScholarships.length > 0 && (
                  <span className="text-sm font-normal text-slate-900 ml-2">
                    ({sortedScholarships.length} {t(sortedScholarships.length === 1 ? 'scholarshipSelection.grid.option_count' : 'scholarshipSelection.grid.option_count_plural')})
                  </span>
                )}
              </h3>
            </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {paginatedScholarships.map((scholarship) => {
              
              return (
                <ScholarshipCardFull
                  key={`scholarship-${scholarship.id}`}
                  scholarship={scholarship}
                  isSelected={selectedIds.has(String(scholarship.id))}
                  onToggle={() => toggleSelection(scholarship)}
                  userProfile={userProfile}
                  isLocked={isLocked}
                  onViewDetails={() => setSelectedScholarshipForModal(scholarship)}
                />
              );
            })}
            </div>
          </div>

          {sortedScholarships.length === 0 && !loading && (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Award className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('scholarshipSelection.grid.noResults.title')}</h3>
              <p className="text-gray-600 mb-4">{t('scholarshipSelection.grid.noResults.description')}</p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm underline"
                >
                  {t('scholarshipSelection.grid.noResults.clearButton')}
                </button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pb-4">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg font-medium transition-all bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('scholarshipsPage.pagination.previous')}
                  </button>
                  <span className="px-4 py-2 text-sm text-slate-900">
                    {t('scholarshipsPage.pagination.page')} {currentPage} {t('scholarshipsPage.pagination.of')} {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-lg font-medium transition-all bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('scholarshipsPage.pagination.next')}
                  </button>
            </div>
          )}

          {/* Fixed Continue Button - Mobile */}
          <div className="fixed bottom-6 left-4 right-4 z-50 sm:hidden">
            <button
              onClick={handleContinue}
              disabled={selectedIds.size === 0}
              className="w-full !bg-blue-600 hover:!bg-blue-700 text-white py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-500/20 active:scale-95 disabled:!bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all"
            >
              <span>{t(selectedIds.size === 1 ? 'scholarshipSelection.continueWithCount' : 'scholarshipSelection.continueWithCount_plural', { count: selectedIds.size })}</span>
            </button>
          </div>

          {/* Continue Button - Desktop */}
          <div className="hidden sm:block pt-4">
            <button
              onClick={handleContinue}
              disabled={selectedIds.size === 0}
              className="w-full bg-blue-600 text-white py-3.5 px-6 rounded-lg hover:bg-blue-700 transition-all font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center space-x-2 disabled:bg-gray-400"
            >
              <span>{t(selectedIds.size === 1 ? 'scholarshipSelection.continueWithCount' : 'scholarshipSelection.continueWithCount_plural', { count: selectedIds.size })}</span>
            </button>
          </div>
        </div>
      )}

      {/* Transition Overlay - Just Blur */}
      {isTransitioning && (
        <div className="fixed inset-0 z-[100] bg-slate-950/20 backdrop-blur-md animate-in fade-in duration-500 pointer-events-none" />
      )}

      {selectedScholarshipForModal && (
        <ScholarshipDetailModal
          scholarship={selectedScholarshipForModal}
          isOpen={!!selectedScholarshipForModal}
          onClose={() => setSelectedScholarshipForModal(null)}
          userProfile={userProfile}
          userRole={user?.role}
        />
      )}

      {/* Confirmation Modal */}
      <Transition appear show={showConfirmModal} as={Fragment}>
        <Dialog as="div" className="relative z-[200]" onClose={() => setShowConfirmModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-[2.5rem] bg-white p-8 text-left align-middle shadow-2xl transition-all border border-slate-200 relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                  
                  <div className="flex flex-col items-center text-center space-y-6">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg shadow-amber-200/50">
                      <AlertCircleIcon className="w-10 h-10 text-amber-600" />
                    </div>
                    
                    <div>
                      <Dialog.Title
                        as="h3"
                        className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-3"
                      >
                        {t('scholarshipSelection.confirmationModal.title')}
                      </Dialog.Title>
                      <p className="text-slate-600 font-medium leading-relaxed">
                        {t('scholarshipSelection.confirmationModal.description', { count: selectedIds.size })}
                      </p>
                    </div>

                    <div className="flex flex-col w-full gap-3 pt-4">
                      <button
                        type="button"
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98]"
                        onClick={() => {
                          setShowConfirmModal(false);
                          onNext();
                        }}
                      >
                        {t('scholarshipSelection.confirmationModal.confirm')}
                      </button>
                      <button
                        type="button"
                        className="w-full py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
                        onClick={() => setShowConfirmModal(false)}
                      >
                        {t('scholarshipSelection.confirmationModal.cancel')}
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>

  );
};
