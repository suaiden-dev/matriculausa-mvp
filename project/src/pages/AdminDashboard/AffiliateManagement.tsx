import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  DollarSign, 
  Search,
  ChevronRight,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Activity,
  AlertCircle,
  CheckCircle2,
  Loader2,
  GraduationCap,
  Eye,
  Building,
  CreditCard
} from 'lucide-react';
import { useAffiliateData } from '../../hooks/useAffiliateData';
import { supabase } from '../../lib/supabase';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { AffiliatePaymentRequestService } from '../../services/AffiliatePaymentRequestService';
// import removido: useDynamicFeeCalculation não é usado aqui
// import removido: useUserSpecificFees não é usado aqui

interface FilterState {
  search: string;
  status: 'all' | 'active' | 'inactive' | 'pending';
  sortBy: 'name' | 'created_at' | 'total_revenue' | 'total_students' | 'total_sellers';
  sortOrder: 'asc' | 'desc';
}

const AffiliateManagement: React.FC = () => {
  const { affiliates, allSellers, allStudents, loading, error, refetch } = useAffiliateData();
  const navigate = useNavigate();
  
  // Debug: Log dos dados recebidos
  console.log('🔍 [AffiliateManagement] Dados recebidos:', {
    affiliates: affiliates.length,
    allSellers: allSellers.length,
    allStudents: allStudents.length,
    loading,
    error,
    affiliatesData: affiliates
  });
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  
  const [expandedAffiliates, setExpandedAffiliates] = useState<Set<string>>(new Set());
  const [expandedSellers, setExpandedSellers] = useState<Set<string>>(new Set());

  // ===== Overrides e Dependentes (igual EnhancedStudentTrackingRefactored) =====
  const { feeConfig } = useFeeConfig();
  const [overridesMap, setOverridesMap] = useState<Record<string, any>>({}); // por user_id
  const [dependentsMap, setDependentsMap] = useState<Record<string, number>>({}); // por profile_id

  // ===== Estados para informações de pagamento =====
  const [affiliatePaymentRequests, setAffiliatePaymentRequests] = useState<any[]>([]);
  const [affiliateManualPayments, setAffiliateManualPayments] = useState<Record<string, number>>({});
  const [loadingPaymentRequests, setLoadingPaymentRequests] = useState(false);
  const [loadingManualPayments, setLoadingManualPayments] = useState(false);

  // Função para carregar informações de pagamento dos affiliate admins
  const loadAffiliatePaymentRequests = async () => {
    try {
      setLoadingPaymentRequests(true);
      const data = await AffiliatePaymentRequestService.listAllPaymentRequests();
      setAffiliatePaymentRequests(data);
    } catch (error: any) {
      console.error('Error loading affiliate payment requests:', error);
      setAffiliatePaymentRequests([]);
    } finally {
      setLoadingPaymentRequests(false);
    }
  };

  // Função para carregar pagamentos manuais de cada affiliate admin
  const loadAffiliateManualPayments = async () => {
    try {
      setLoadingManualPayments(true);
      const manualPaymentsMap: Record<string, number> = {};
      
      // Para cada affiliate admin, calcular os pagamentos manuais
      for (const affiliate of affiliates) {
        // 1. Descobrir affiliate_admin_id
        const { data: aaList, error: aaErr } = await supabase
          .from('affiliate_admins')
          .select('id')
          .eq('user_id', affiliate.user_id)
          .limit(1);
        
        if (aaErr || !aaList || aaList.length === 0) {
          manualPaymentsMap[affiliate.user_id] = 0;
          continue;
        }
        const affiliateAdminId = aaList[0].id;

        // 2. Buscar sellers vinculados a este affiliate admin
        const { data: sellers, error: sellersErr } = await supabase
          .from('sellers')
          .select('referral_code')
          .eq('affiliate_admin_id', affiliateAdminId);
        
        if (sellersErr || !sellers || sellers.length === 0) {
          manualPaymentsMap[affiliate.user_id] = 0;
          continue;
        }
        
        const referralCodes = sellers.map(s => s.referral_code);
        
        // 3. Buscar perfis de estudantes vinculados via seller_referral_code
        const { data: profiles, error: profilesErr } = await supabase
          .from('user_profiles')
        .select(`
          id,
          user_id,
          has_paid_selection_process_fee, 
          has_paid_i20_control_fee, 
          selection_process_fee_payment_method,
          i20_control_fee_payment_method,
          dependents,
          seller_referral_code,
          system_type,
          scholarship_applications(is_scholarship_fee_paid, scholarship_fee_payment_method)
        `)
          .in('seller_referral_code', referralCodes);
        
        if (profilesErr || !profiles) {
          manualPaymentsMap[affiliate.user_id] = 0;
          continue;
        }

        // 4. Preparar overrides por user_id
        const uniqueUserIds = Array.from(new Set((profiles || []).map((p) => p.user_id).filter(Boolean)));
        const overrideEntries = await Promise.allSettled(uniqueUserIds.map(async (uid) => {
          const { data, error } = await supabase.rpc('get_user_fee_overrides', { target_user_id: uid });
          return [uid, error ? null : data];
        }));
        const overridesMap: Record<string, any> = overrideEntries.reduce((acc: Record<string, any>, res) => {
          if (res.status === 'fulfilled') {
            const arr = res.value;
            const uid = arr[0];
            const data = arr[1];
            if (data) acc[uid] = {
              selection_process_fee: data.selection_process_fee != null ? Number(data.selection_process_fee) : undefined,
              scholarship_fee: data.scholarship_fee != null ? Number(data.scholarship_fee) : undefined,
              i20_control_fee: data.i20_control_fee != null ? Number(data.i20_control_fee) : undefined,
            };
          }
          return acc;
        }, {});

        // 5. Calcular receita manual (pagamentos por fora) com a mesma lógica do FinancialOverview
        const manualRevenue = (profiles || []).reduce((sum, p) => {
          const deps = Number(p?.dependents || 0);
          const ov = overridesMap[p?.user_id] || {};
          const systemType = p?.system_type || 'legacy';

          // Selection Process manual
          let selManual = 0;
          const isSelManual = !!p?.has_paid_selection_process_fee && p?.selection_process_fee_payment_method === 'manual';
          if (isSelManual) {
            const baseSelDefault = systemType === 'simplified' ? 350 : 400;
            const baseSel = ov.selection_process_fee != null ? Number(ov.selection_process_fee) : baseSelDefault;
            selManual = ov.selection_process_fee != null ? baseSel : baseSel + (deps * 150);
          }

          // Scholarship manual (se qualquer application estiver paga via manual)
          const hasScholarshipPaidManual = Array.isArray(p?.scholarship_applications)
            ? p.scholarship_applications.some((a: any) => !!a?.is_scholarship_fee_paid && a?.scholarship_fee_payment_method === 'manual')
            : false;
          const baseScholarshipDefault = systemType === 'simplified' ? 550 : 900;
          const schBase = ov.scholarship_fee != null ? Number(ov.scholarship_fee) : baseScholarshipDefault;
          const schManual = hasScholarshipPaidManual ? schBase : 0;

          // I-20 Control manual (seguir mesma regra base: exigir scholarship pago para contar I-20)
          const hasAnyScholarshipPaid = Array.isArray(p?.scholarship_applications)
            ? p.scholarship_applications.some((a: any) => !!a?.is_scholarship_fee_paid)
            : false;
          const isI20Manual = !!p?.has_paid_i20_control_fee && p?.i20_control_fee_payment_method === 'manual';
          const i20Base = ov.i20_control_fee != null ? Number(ov.i20_control_fee) : 900;
          const i20Manual = (hasAnyScholarshipPaid && isI20Manual) ? i20Base : 0;

          return sum + selManual + schManual + i20Manual;
        }, 0);

        manualPaymentsMap[affiliate.user_id] = manualRevenue;
      }
      
      setAffiliateManualPayments(manualPaymentsMap);
    } catch (error: any) {
      console.error('Error loading affiliate manual payments:', error);
      setAffiliateManualPayments({});
    } finally {
      setLoadingManualPayments(false);
    }
  };

  useEffect(() => {
    const loadOverrides = async () => {
      try {
        const uniqueIds = Array.from(new Set((allStudents || []).map((s: any) => s.user_id).filter(Boolean)));
        if (uniqueIds.length === 0) {
          setOverridesMap({});
          return;
        }

        const results = await Promise.allSettled(
          uniqueIds.map(async (userId) => {
            const { data, error } = await supabase.rpc('get_user_fee_overrides', { target_user_id: userId });
            return { userId, data: error ? null : data };
          })
        );

        const map: Record<string, any> = {};
        results.forEach((res) => {
          if (res.status === 'fulfilled') {
            const v: any = res.value;
            const userId = v.userId;
            const data = v.data;
            const override = Array.isArray(data) ? (data.length > 0 ? data[0] : null) : data;
            if (override) {
              map[userId] = {
                selection_process_fee: override.selection_process_fee != null ? Number(override.selection_process_fee) : undefined,
                application_fee: override.application_fee != null ? Number(override.application_fee) : undefined,
                scholarship_fee: override.scholarship_fee != null ? Number(override.scholarship_fee) : undefined,
                i20_control_fee: override.i20_control_fee != null ? Number(override.i20_control_fee) : undefined
              };
            }
          }
        });
        setOverridesMap(map);
      } catch (e) {
        setOverridesMap({});
      }
    };
    loadOverrides();
  }, [allStudents]);

  // Carregar informações de pagamento dos affiliate admins
  useEffect(() => {
    loadAffiliatePaymentRequests();
  }, []);

  // Carregar pagamentos manuais quando os affiliates mudarem
  useEffect(() => {
    if (affiliates.length > 0) {
      loadAffiliateManualPayments();
    }
  }, [affiliates]);

  useEffect(() => {
    const loadDependents = async () => {
      try {
        const profileIds = Array.from(new Set((allStudents || []).map((s: any) => s.profile_id).filter(Boolean)));
        if (profileIds.length === 0) {
          setDependentsMap({});
          return;
        }

        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, dependents')
          .in('id', profileIds);

        if (error) {
          setDependentsMap({});
          return;
        }

        const map: Record<string, number> = {};
        (data || []).forEach((row: any) => {
          map[row.id] = Number(row.dependents) || 0;
        });
        setDependentsMap(map);
      } catch (e) {
        setDependentsMap({});
      }
    };
    loadDependents();
  }, [allStudents]);

  // Removido: calculateUserFees não é usado neste componente

  // Students com valores ajustados
  const adjustedStudents = useMemo(() => {
    const result = (allStudents || []).map((s: any) => {
      const o = overridesMap[s.user_id] || {};
      const dependents = Number(dependentsMap[s.profile_id]) || 0;
      let total = 0;
      
      // Determinar valores base baseado no system_type do estudante
      const systemType = s.system_type || 'legacy';
      const baseSelectionFee = systemType === 'simplified' ? 350 : 400;
      const baseScholarshipFee = systemType === 'simplified' ? 550 : 900;
      const baseI20Fee = 900; // Sempre 900 para ambos os sistemas
      
      if (s.has_paid_selection_process_fee) {
        const sel = o.selection_process_fee != null
          ? Number(o.selection_process_fee)
          : baseSelectionFee + (dependents * 150);
        total += sel || 0;
      }
      if (s.is_scholarship_fee_paid) {
        const schol = o.scholarship_fee != null
          ? Number(o.scholarship_fee)
          : baseScholarshipFee;
        total += schol || 0;
      }
      if (s.has_paid_i20_control_fee) {
        const i20 = o.i20_control_fee != null
          ? Number(o.i20_control_fee)
          : baseI20Fee;
        total += i20 || 0;
      }
      return { ...s, total_paid_adjusted: total };
    });
    return result;
  }, [allStudents, overridesMap, dependentsMap, feeConfig]);

  const adjustedStudentsBySellerId = useMemo(() => {
    const map: Record<string, any[]> = {};
    (adjustedStudents || []).forEach((s: any) => {
      const sellerId = s.referred_by_seller_id;
      if (!sellerId) return;
      if (!map[sellerId]) map[sellerId] = [];
      map[sellerId].push(s);
    });
    return map;
  }, [adjustedStudents]);

  const adjustedAffiliates = useMemo(() => {
    // Monta versão ajustada dos afiliados, recalculando revenue por seller e por afiliado
    return affiliates.map((aff: any) => {
      const sellersAdjusted = (aff.sellers || []).map((seller: any) => {
        const studentsForSeller = adjustedStudentsBySellerId[seller.id] || [];
        const totalRevenueAdjusted = studentsForSeller.reduce((sum, st) => sum + (st.total_paid_adjusted || 0), 0);
        return {
          ...seller,
          students_count: studentsForSeller.length, // mantém a prop usada na UI
          total_revenue: totalRevenueAdjusted // sobrescreve para UI usar o ajustado
        };
      });
      const affiliateRevenueAdjusted = sellersAdjusted.reduce((sum: number, s: any) => sum + (s.total_revenue || 0), 0);
      return {
        ...aff,
        sellers: sellersAdjusted,
        total_revenue: affiliateRevenueAdjusted // sobrescreve para UI usar o ajustado
      };
    });
  }, [affiliates, adjustedStudentsBySellerId]);

  // Aplicar filtros e ordenação sobre dados ajustados
  const filteredAndSortedAffiliates = useMemo(() => {
    let filtered = adjustedAffiliates.filter(affiliate => {
      // Filtro de busca
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          affiliate.full_name.toLowerCase().includes(searchLower) ||
          affiliate.email.toLowerCase().includes(searchLower) ||
          affiliate.country?.toLowerCase().includes(searchLower) ||
          affiliate.phone?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtro de status
      if (filters.status !== 'all' && affiliate.status !== filters.status) {
        return false;
      }

      return true;
    });

    // Ordenação
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.full_name.toLowerCase();
          bValue = b.full_name.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'total_revenue':
          aValue = a.total_revenue; // já é ajustado
          bValue = b.total_revenue;
          break;
        case 'total_students':
          aValue = a.total_students;
          bValue = b.total_students;
          break;
        case 'total_sellers':
          aValue = a.total_sellers;
          bValue = b.total_sellers;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [adjustedAffiliates, filters]);

  // Estatísticas gerais (usa revenue ajustado)
  const totalStats = useMemo(() => {
    return {
      totalAffiliates: adjustedAffiliates.length,
      activeAffiliates: adjustedAffiliates.filter((a: any) => a.status === 'active').length,
      totalSellers: allSellers.length,
      activeSellers: allSellers.filter((s: any) => s.is_active).length,
      totalStudents: allStudents.length,
      totalRevenue: adjustedAffiliates.reduce((sum: number, a: any) => sum + (a.total_revenue || 0), 0)
    };
  }, [adjustedAffiliates, allSellers, allStudents]);

  const toggleAffiliateExpansion = (affiliateId: string) => {
    setExpandedAffiliates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(affiliateId)) {
        newSet.delete(affiliateId);
      } else {
        newSet.add(affiliateId);
      }
      return newSet;
    });
  };

  const toggleSellerExpansion = (sellerId: string) => {
    setExpandedSellers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sellerId)) {
        newSet.delete(sellerId);
      } else {
        newSet.add(sellerId);
      }
      return newSet;
    });
  };

  const handleViewStudent = (studentId: string) => {
    navigate(`/admin/dashboard/students/${studentId}`);
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

  // Função para calcular informações de pagamento de um affiliate admin
  const getAffiliatePaymentInfo = (affiliateUserId: string, totalRevenue: number) => {
    const affiliateRequests = affiliatePaymentRequests.filter(req => req.referrer_user_id === affiliateUserId);
    
    // Verificar se os dados ainda estão carregando
    const isLoading = loadingPaymentRequests || loadingManualPayments;
    
    // Outside Payments = pagamentos manuais (payment_method = 'manual')
    const outsidePayments = affiliateManualPayments[affiliateUserId] || 0;
    
    // Calcular Available Balance seguindo a mesma lógica do FinancialOverview.tsx
    // availableBalance = Math.max(0, (totalRevenue - manualRevenue) - totalPaidOut - totalApproved - totalPending)
    const manualRevenue = outsidePayments; // Pagamentos manuais (outside payments)
    
    const totalPaidOut = affiliateRequests
      .filter(req => req.status === 'paid')
      .reduce((sum, req) => sum + (req.amount_usd || 0), 0);
    
    const totalApproved = affiliateRequests
      .filter(req => req.status === 'approved')
      .reduce((sum, req) => sum + (req.amount_usd || 0), 0);
    
    const totalPending = affiliateRequests
      .filter(req => req.status === 'pending')
      .reduce((sum, req) => sum + (req.amount_usd || 0), 0);
    
    const availableBalance = Math.max(0, (totalRevenue - manualRevenue) - totalPaidOut - totalApproved - totalPending);
    
    return {
      outsidePayments,
      pendingPayments: totalPending + totalApproved,
      availableBalance,
      totalRequests: affiliateRequests.length,
      isLoading
    };
  };

  const updateFilters = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { 
        color: 'bg-green-100 text-green-800 border-green-200', 
        icon: CheckCircle2,
        label: 'Active' 
      },
      inactive: { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        icon: AlertCircle,
        label: 'Inactive' 
      },
      pending: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        icon: Loader2,
        label: 'Pending' 
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </span>
    );
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
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
            <div className="h-10 bg-slate-200 rounded w-full lg:w-48"></div>
            <div className="h-10 bg-slate-200 rounded w-24"></div>
          </div>
          <div className="mt-4 h-4 bg-slate-200 rounded w-56"></div>
        </div>

        {/* Affiliates list skeleton */}
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
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="text-red-800 font-medium">Error Loading Data</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={refetch}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
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
            <h1 className="text-3xl font-bold text-slate-900">Affiliate Management</h1>
            <p className="text-slate-600 mt-2">
              Manage and monitor all affiliate partners and their performance
            </p>
          </div>
          <button
            onClick={refetch}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Activity className="h-4 w-4" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Affiliates</p>
              <p className="text-2xl font-bold text-slate-900">{totalStats.totalAffiliates}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Sellers</p>
              <p className="text-2xl font-bold text-slate-900">{totalStats.totalSellers}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Building2 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Sellers</p>
              <p className="text-2xl font-bold text-purple-600">{totalStats.activeSellers}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Students</p>
              <p className="text-2xl font-bold text-slate-900">{totalStats.totalStudents}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                ${totalStats.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search affiliates by name, email, phone, or country..."
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full lg:w-48">
            <select
              value={filters.status}
              onChange={(e) => updateFilters({ status: e.target.value as any })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Sort */}
          <div className="w-full lg:w-48">
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                updateFilters({ sortBy: sortBy as any, sortOrder: sortOrder as any });
              }}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="total_revenue-desc">Revenue High-Low</option>
              <option value="total_revenue-asc">Revenue Low-High</option>
              <option value="total_students-desc">Students High-Low</option>
              <option value="total_students-asc">Students Low-High</option>
              <option value="total_sellers-desc">Sellers High-Low</option>
              <option value="total_sellers-asc">Sellers Low-High</option>
            </select>
          </div>

          {/* Reset Filters */}
          <button
            onClick={resetFilters}
            className="px-4 py-2.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Filter Results Count */}
        <div className="mt-4 text-sm text-slate-600">
          Showing {filteredAndSortedAffiliates.length} of {adjustedAffiliates.length} affiliates
        </div>
      </div>

      {/* Affiliates List */}
      <div className="space-y-4">
        {filteredAndSortedAffiliates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No affiliates found</h3>
            <p className="text-slate-600">
              {filters.search || filters.status !== 'all' 
                ? 'Try adjusting your filters to see more results.' 
                : 'No affiliate partners have been registered yet.'}
            </p>
            {/* Debug info */}
            <div className="mt-4 text-xs text-slate-500">
              <p>Total affiliates: {affiliates.length}</p>
              <p>First affiliate sample: {affiliates[0] ? JSON.stringify({
                id: affiliates[0].id,
                name: affiliates[0].full_name,
                email: affiliates[0].email
              }) : 'None'}</p>
            </div>
          </div>
        ) : (
          filteredAndSortedAffiliates.map((affiliate) => {
            const isExpanded = expandedAffiliates.has(affiliate.id);
            
            return (
              <div 
                key={affiliate.id} 
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-200 ease-in-out transform"
                >
                {/* Affiliate Header */}
                <div 
                    className="p-6 cursor-pointer"
                    onClick={() => toggleAffiliateExpansion(affiliate.id)}
                    >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                        <span className="text-white font-bold text-lg">
                          {affiliate.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {affiliate.full_name}
                          </h3>
                          {getStatusBadge(affiliate.status)}
                        </div>
                        
                        <div className="flex items-center space-x-4 mt-1 text-sm text-slate-600">
                          <div className="flex items-center space-x-1">
                            <Mail className="h-4 w-4" />
                            <span>{affiliate.email}</span>
                          </div>
                          {affiliate.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="h-4 w-4" />
                              <span>{affiliate.phone}</span>
                            </div>
                          )}
                          {affiliate.country && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{affiliate.country}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Joined {new Date(affiliate.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {/* Quick Stats */}
                      <div className="grid grid-cols-6 gap-4 text-center">
                        <div>
                          <p className="text-lg font-bold text-slate-900">{affiliate.total_sellers}</p>
                          <p className="text-xs text-slate-600">Sellers</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-900">{affiliate.total_students}</p>
                          <p className="text-xs text-slate-600">Students</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-green-600">
                            ${affiliate.total_revenue.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-600">Total Revenue</p>
                        </div>
             <div>
               {(() => {
                 const paymentInfo = getAffiliatePaymentInfo(affiliate.user_id, affiliate.total_revenue);
                 return (
                   <>
                     <p className="text-lg font-bold text-purple-600">
                       {paymentInfo.isLoading ? (
                         <div className="animate-pulse bg-slate-200 h-6 w-16 rounded"></div>
                       ) : (
                         `$${paymentInfo.outsidePayments.toLocaleString()}`
                       )}
                     </p>
                     <p className="text-xs text-slate-600">Outside Payments</p>
                   </>
                 );
               })()}
             </div>
             <div>
               {(() => {
                 const paymentInfo = getAffiliatePaymentInfo(affiliate.user_id, affiliate.total_revenue);
                 return (
                   <>
                     <p className="text-lg font-bold text-orange-600">
                       {paymentInfo.isLoading ? (
                         <div className="animate-pulse bg-slate-200 h-6 w-16 rounded"></div>
                       ) : (
                         `$${paymentInfo.availableBalance.toLocaleString()}`
                       )}
                     </p>
                     <p className="text-xs text-slate-600">Available Balance</p>
                   </>
                 );
               })()}
             </div>
                      </div>
                      
                      {/* Expand Button */}
                      <button
                        onClick={() => toggleAffiliateExpansion(affiliate.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 transition-all duration-200 hover:bg-slate-50 rounded-lg"
                      >
                        <div className={`transform transition-transform duration-300 ${
                          isExpanded ? 'rotate-90' : 'rotate-0'
                        }`}>
                          <ChevronRight className="h-5 w-5" />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="border-t border-slate-200 bg-slate-50">
                    <div className="p-6">
                      {/* Payment Information */}
                      <div className="mb-8">
                        <h4 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
                          <DollarSign className="h-6 w-6 mr-3" />
                          Payment Information
                        </h4>
                        
                 {(() => {
                   const paymentInfo = getAffiliatePaymentInfo(affiliate.user_id, affiliate.total_revenue);
                   return (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                              <div className="bg-white rounded-lg border border-slate-200 p-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                                    <p className="text-2xl font-bold text-green-600">
                                      ${affiliate.total_revenue.toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <DollarSign className="h-6 w-6 text-green-600" />
                                  </div>
                                </div>
                              </div>
                              
                       <div className="bg-white rounded-lg border border-slate-200 p-6">
                         <div className="flex items-center justify-between">
                           <div>
                             <p className="text-sm font-medium text-slate-600">Outside Payments</p>
                             {paymentInfo.isLoading ? (
                               <div className="animate-pulse bg-slate-200 h-8 w-24 rounded mb-1"></div>
                             ) : (
                               <p className="text-2xl font-bold text-purple-600">
                                 ${paymentInfo.outsidePayments.toLocaleString()}
                               </p>
                             )}

                           </div>
                           <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                             <DollarSign className="h-6 w-6 text-purple-600" />
                           </div>
                         </div>
                       </div>
                       
                       <div className="bg-white rounded-lg border border-slate-200 p-6">
                         <div className="flex items-center justify-between">
                           <div>
                             <p className="text-sm font-medium text-slate-600">Available Balance</p>
                             {paymentInfo.isLoading ? (
                               <div className="animate-pulse bg-slate-200 h-8 w-24 rounded mb-1"></div>
                             ) : (
                               <p className="text-2xl font-bold text-orange-600">
                                 ${paymentInfo.availableBalance.toLocaleString()}
                               </p>
                             )}
                             <p className="text-xs text-slate-500 mt-1">
                               Pending withdrawal
                             </p>
                           </div>
                           <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                             <DollarSign className="h-6 w-6 text-orange-600" />
                           </div>
                         </div>
                       </div>
                       
                       <div className="bg-white rounded-lg border border-slate-200 p-6">
                         <div className="flex items-center justify-between">
                           <div>
                             <p className="text-sm font-medium text-slate-600">Payment Requests</p>
                             {paymentInfo.isLoading ? (
                               <div className="animate-pulse bg-slate-200 h-8 w-24 rounded mb-1"></div>
                             ) : (
                               <p className="text-2xl font-bold text-blue-600">
                                 ${paymentInfo.pendingPayments.toLocaleString()}
                               </p>
                             )}
                             <p className="text-xs text-slate-500 mt-1">
                               {paymentInfo.totalRequests} request{paymentInfo.totalRequests !== 1 ? 's' : ''} pending/approved
                             </p>
                           </div>
                           <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                             <CreditCard className="h-6 w-6 text-blue-600" />
                           </div>
                         </div>
                       </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Sellers - Full Width */}
                      <div>
                        <h4 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
                          <Building2 className="h-6 w-6 mr-3" />
                          Sellers ({affiliate.sellers.length})
                        </h4>
                        
                        {affiliate.sellers.length === 0 ? (
                          <div className="text-center py-12">
                            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 text-lg">No sellers registered</p>
                            <p className="text-slate-400 text-sm mt-1">Sellers will appear here once they join this affiliate</p>
                          </div>
                        ) : (
                          <div className="gap-6 space-y-3">
                            {affiliate.sellers.map((seller: any) => {
                              const isSellerExpanded = expandedSellers.has(seller.id);
                              const sellerStudents = adjustedStudents.filter((student: any) => 
                                student.referred_by_seller_id === seller.id
                              );
                              
                              return (
                                <div key={seller.id} className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200 ease-in-out transform ">
                                  <div className="p-4">
                                    <div 
                                        className="flex items-center justify-between cursor-pointer"
                                        onClick={() => toggleSellerExpansion(seller.id)}
                                        >
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <h5 className="font-medium text-slate-900">{seller.name}</h5>
                                            <p className="text-sm text-slate-600">{seller.email}</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                              Code: {seller.referral_code}
                                            </p>
                                          </div>
                                          <div className="text-right flex items-center gap-3">
                                            <div>
                                              <div className="flex items-center space-x-2">
                                                {seller.is_active ? (
                                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Active
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Inactive
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-sm font-medium text-slate-900 mt-1">
                                                {seller.students_count} students
                                              </p>
                                              <p className="text-sm text-green-600 font-medium">
                                                {formatCurrency(seller.total_revenue)}
                                              </p>
                                            </div>
                                            
                                            {sellerStudents.length > 0 && (
                                              <button
                                                onClick={() => toggleSellerExpansion(seller.id)}
                                                className="p-2 text-slate-400 hover:text-slate-600 transition-all duration-200 hover:bg-slate-50 rounded-lg"
                                              >
                                                <div className={`transform transition-transform duration-300 ${
                                                  isSellerExpanded ? 'rotate-90' : 'rotate-0'
                                                }`}>
                                                  <ChevronRight className="h-4 w-4" />
                                                </div>
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Lista de Estudantes Expandida */}
                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                      isSellerExpanded && sellerStudents.length > 0 
                                        ? 'max-h-[1200px] opacity-100 mt-4' 
                                        : 'max-h-0 opacity-0 mt-0'
                                    }`}>
                                      <div className="pt-4 border-t border-slate-200">
                                        <h6 className="text-sm font-medium text-slate-700 mb-3 flex items-center">
                                          <GraduationCap className="h-4 w-4 mr-2" />
                                          Students ({sellerStudents.length})
                                        </h6>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                          {sellerStudents.map((student: any) => (
                                            <div 
                                              key={student.id}
                                              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 hover:shadow-sm transform  transition-all duration-200 ease-in-out"
                                            >
                                              <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                  <span className="text-sm font-medium text-blue-600">
                                                    {student.full_name?.charAt(0)?.toUpperCase() || 'S'}
                                                  </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-medium text-slate-900">
                                                    {student.full_name || 'Name not provided'}
                                                  </p>
                                                  <div className="flex items-center space-x-4 text-xs text-slate-500">
                                                    <span className="flex items-center">
                                                      <Mail className="h-3 w-3 mr-1" />
                                                      {student.email}
                                                    </span>
                                                    {student.country && (
                                                      <span className="flex items-center">
                                                        <MapPin className="h-3 w-3 mr-1" />
                                                        {student.country}
                                                      </span>
                                                    )}
                                                    {student.university_name && (
                                                      <span className="flex items-center">
                                                        <Building className="h-3 w-3 mr-1" />
                                                        {student.university_name}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              <div className="flex items-center space-x-3">
                                                <div className="text-right">
                                                  <div className="flex items-center space-x-2">
                                                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                                      student.status === 'active' || student.status === 'registered' || student.status === 'enrolled' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : student.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                      {student.status || 'Unknown'}
                                                    </span>
                                                  </div>
                                                  <p className="text-sm font-medium text-green-600 mt-1">
                                                    {formatCurrency(student.total_paid_adjusted)}
                                                  </p>
                                                  <p className="text-xs text-slate-500">
                                                    {formatDate(student.created_at)}
                                                  </p>
                                                </div>
                                                
                                                <button
                                                  onClick={() => handleViewStudent(student.profile_id || student.id)}
                                                  className="flex items-center space-x-1 px-3 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                  <Eye className="h-3 w-3" />
                                                  <span>View</span>
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AffiliateManagement;