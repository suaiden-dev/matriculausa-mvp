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
import { useEnvironment } from '../../hooks/useEnvironment';
import { getDisplayAmounts } from '../../utils/paymentConverter';
// import removido: useDynamicFeeCalculation não é usado aqui
// import removido: useUserSpecificFees não é usado aqui
interface FilterState {
  search: string;
  status: 'all' | 'active' | 'inactive' | 'pending';
  sortBy: 'name' | 'created_at' | 'total_revenue' | 'total_students' | 'total_sellers';
  sortOrder: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

const AffiliateManagement: React.FC = () => {
  console.log('🚀 [AffiliateManagement] Componente renderizado');
  
  const { affiliates, allSellers, allStudents, loading, error, refetch } = useAffiliateData();
  const navigate = useNavigate();
  const { isDevelopment } = useEnvironment();
  
  console.log('🚀 [AffiliateManagement] Dados recebidos:', {
    affiliates: affiliates.length,
    allSellers: allSellers.length,
    allStudents: allStudents.length,
    loading,
    isDevelopment
  });
  
  // Filtrar affiliates com email @uorak.com
  const filteredAffiliates = useMemo(() => {
    const shouldFilter = !isDevelopment; // Filtrar em produção e staging
    
    console.log('🔍 [AffiliateManagement] Filtro affiliates:', {
      shouldFilter,
      totalAffiliates: affiliates.length
    });
    
    if (!shouldFilter) {
      return affiliates;
    }
    
    const filtered = affiliates.filter((aff: any) => {
      const email = aff.email?.toLowerCase() || '';
      const shouldExclude = email.includes('@uorak.com');
      if (shouldExclude) {
        console.log('🔍 [AffiliateManagement] Excluindo affiliate:', email);
      }
      return !shouldExclude;
    });
    
    console.log('🔍 [AffiliateManagement] Affiliates filtrados:', {
      antes: affiliates.length,
      depois: filtered.length
    });
    
    return filtered;
  }, [affiliates, isDevelopment]);
  
  // Filtrar sellers com email @uorak.com
  const filteredSellers = useMemo(() => {
    const shouldFilter = !isDevelopment; // Filtrar em produção e staging
    
    console.log('🔍 [AffiliateManagement] Filtro sellers:', {
      shouldFilter,
      totalSellers: allSellers.length
    });
    
    if (!shouldFilter) {
      return allSellers;
    }
    
    const filtered = allSellers.filter((seller: any) => {
      const email = seller.email?.toLowerCase() || '';
      const shouldExclude = email.includes('@uorak.com');
      if (shouldExclude) {
        console.log('🔍 [AffiliateManagement] Excluindo seller:', email);
      }
      return !shouldExclude;
    });
    
    console.log('🔍 [AffiliateManagement] Sellers filtrados:', {
      antes: allSellers.length,
      depois: filtered.length
    });
    
    return filtered;
  }, [allSellers, isDevelopment]);
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc',
    dateFrom: '',
    dateTo: ''
  });
  
  const [expandedAffiliates, setExpandedAffiliates] = useState<Set<string>>(new Set());
  const [expandedSellers, setExpandedSellers] = useState<Set<string>>(new Set());
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  
  // ✅ NOVO: Estado para armazenar datas de pagamento de cada taxa individual dos estudantes
  const [studentPaymentDates, setStudentPaymentDates] = useState<Record<string, { selection_process?: string; scholarship?: string; i20_control?: string }>>({});

  // ===== Overrides e Dependentes (igual EnhancedStudentTrackingRefactored) =====
  const { feeConfig } = useFeeConfig();
  const [overridesMap, setOverridesMap] = useState<Record<string, any>>({}); // por user_id
  const [dependentsMap, setDependentsMap] = useState<Record<string, number>>({}); // por profile_id
  const [realPaidAmountsMap, setRealPaidAmountsMap] = useState<Record<string, { selection_process?: number; scholarship?: number; i20_control?: number }>>({});
  const [isLoadingRealPaidAmounts, setIsLoadingRealPaidAmounts] = useState(true); // ✅ NOVO: Estado para rastrear carregamento de valores

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

        // Filtrar estudantes com email @uorak.com
        const shouldFilter = !isDevelopment; // Filtrar em produção e staging
        
        const filteredProfiles = shouldFilter 
          ? (profiles || []).filter((p: any) => {
              const email = p.email?.toLowerCase() || '';
              return !email.includes('@uorak.com');
            })
          : (profiles || []);

        // 4. Preparar overrides por user_id (usar filteredProfiles)
        const uniqueUserIds = Array.from(new Set((filteredProfiles || []).map((p) => p.user_id).filter(Boolean)));
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
        const manualRevenue = filteredProfiles.reduce((sum, p) => {
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

  // Filtrar estudantes com email @uorak.com
  const filteredStudents = useMemo(() => {
    const allStudentsArray = allStudents || [];
    const shouldFilter = !isDevelopment; // Filtrar em produção e staging
    
    // Debug temporário
    console.log('🔍 [AffiliateManagement] Filtro debug:', {
      hostname: window.location.hostname,
      isDevelopment,
      shouldFilter,
      totalStudents: allStudentsArray.length
    });
    
    if (!shouldFilter) {
      console.log('🔍 [AffiliateManagement] Não filtrando - ambiente de desenvolvimento');
      return allStudentsArray;
    }
    
    const filtered = allStudentsArray.filter((s: any) => {
      const email = s.email?.toLowerCase() || '';
      const shouldExclude = email.includes('@uorak.com');
      if (shouldExclude) {
        console.log('🔍 [AffiliateManagement] Excluindo estudante:', email);
      }
      return !shouldExclude;
    });
    
    console.log('🔍 [AffiliateManagement] Resultado do filtro:', {
      antes: allStudentsArray.length,
      depois: filtered.length,
      excluidos: allStudentsArray.length - filtered.length
    });
    
    return filtered;
  }, [allStudents, isDevelopment]);

  useEffect(() => {
    const loadOverrides = async () => {
      try {
        const uniqueIds = Array.from(new Set((filteredStudents || []).map((s: any) => s.user_id).filter(Boolean)));
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
  }, [filteredStudents]);

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
        const profileIds = Array.from(new Set((filteredStudents || []).map((s: any) => s.profile_id).filter(Boolean)));
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
  }, [filteredStudents]);

  // Buscar valores reais pagos de individual_fee_payments
  useEffect(() => {
    let mounted = true;
    const loadRealPaidAmounts = async () => {
      try {
        // ✅ NOVO: Iniciar loading
        if (mounted) setIsLoadingRealPaidAmounts(true);
        
        const uniqueUserIds = Array.from(new Set((filteredStudents || []).map((s: any) => s.user_id).filter(Boolean)));
        if (uniqueUserIds.length === 0) {
          if (mounted) {
            setRealPaidAmountsMap({});
            setIsLoadingRealPaidAmounts(false);
          }
          return;
        }

        // Buscar valores reais pagos em batches (10 por vez)
        const BATCH_SIZE = 10;
        const realPaidMap: Record<string, { selection_process?: number; scholarship?: number; i20_control?: number }> = {};
        
        for (let i = 0; i < uniqueUserIds.length; i += BATCH_SIZE) {
          const batch = uniqueUserIds.slice(i, i + BATCH_SIZE);
          
          await Promise.allSettled(batch.map(async (userId) => {
            if (!mounted) return;
            
            try {
              // ✅ CORREÇÃO: Usar getDisplayAmounts para exibição nos dashboards (valores "Zelle" sem taxas)
              const amounts = await getDisplayAmounts(userId, ['selection_process', 'scholarship', 'i20_control']);
              if (mounted) {
                realPaidMap[userId] = {
                  selection_process: amounts.selection_process,
                  scholarship: amounts.scholarship,
                  i20_control: amounts.i20_control
                };
                // Atualizar incrementalmente conforme valores são carregados
                setRealPaidAmountsMap(prev => ({ ...prev, [userId]: realPaidMap[userId] }));
              }
            } catch (error) {
              console.error(`[AffiliateManagement] Erro ao buscar valores pagos para user_id ${userId}:`, error);
            }
          }));
        }

        // Atualização final com todos os valores
        if (mounted) {
          setRealPaidAmountsMap(realPaidMap);
          setIsLoadingRealPaidAmounts(false); // ✅ NOVO: Finalizar loading
        }
      } catch (error) {
        console.error('[AffiliateManagement] Erro ao carregar valores reais pagos:', error);
        if (mounted) {
          setRealPaidAmountsMap({});
          setIsLoadingRealPaidAmounts(false); // ✅ NOVO: Finalizar loading mesmo em caso de erro
        }
      }
    };
    
    loadRealPaidAmounts();
    return () => { mounted = false; };
  }, [filteredStudents]);

  // ✅ NOVO: Buscar datas de pagamento de cada taxa individual dos estudantes quando filtros de data mudarem
  useEffect(() => {
    const loadPaymentDates = async () => {
      if (!filters.dateFrom && !filters.dateTo) {
        // Se não há filtro de data, limpar o estado
        setStudentPaymentDates({});
        return;
      }

      try {
        const uniqueUserIds = Array.from(new Set((filteredStudents || []).map((s: any) => s.user_id).filter(Boolean)));
        if (uniqueUserIds.length === 0) {
          setStudentPaymentDates({});
          return;
        }

        // ✅ CORREÇÃO: Buscar datas de pagamento de cada taxa individual (selection_process, scholarship, i20_control)
        const { data: payments, error } = await supabase
          .from('individual_fee_payments')
          .select('user_id, fee_type, payment_date')
          .in('user_id', uniqueUserIds)
          .in('fee_type', ['selection_process', 'scholarship', 'i20_control'])
          .not('payment_date', 'is', null)
          .order('payment_date', { ascending: false }); // Mais recente primeiro

        if (error) {
          console.error('[AffiliateManagement] Erro ao buscar datas de pagamento:', error);
          setStudentPaymentDates({});
          return;
        }

        // ✅ CORREÇÃO: Agrupar por user_id e fee_type, armazenando a data mais recente de cada taxa
        const datesMap: Record<string, { selection_process?: string; scholarship?: string; i20_control?: string }> = {};
        
        (payments || []).forEach((payment: any) => {
          const userId = payment.user_id;
          const feeType = payment.fee_type;
          const paymentDate = payment.payment_date;
          
          if (!datesMap[userId]) {
            datesMap[userId] = {};
          }
          
          // Mapear fee_type para a chave correta e usar apenas a data mais recente
          if (feeType === 'selection_process' && !datesMap[userId].selection_process) {
            datesMap[userId].selection_process = paymentDate;
          } else if (feeType === 'scholarship' && !datesMap[userId].scholarship) {
            datesMap[userId].scholarship = paymentDate;
          } else if (feeType === 'i20_control' && !datesMap[userId].i20_control) {
            datesMap[userId].i20_control = paymentDate;
          }
        });

        setStudentPaymentDates(datesMap);
      } catch (error) {
        console.error('[AffiliateManagement] Erro ao carregar datas de pagamento:', error);
        setStudentPaymentDates({});
      }
    };

    loadPaymentDates();
  }, [filteredStudents, filters.dateFrom, filters.dateTo]);

  // ✅ CORREÇÃO: Não filtrar estudantes, mas sim filtrar quais taxas foram pagas no período
  // Todos os estudantes serão incluídos, mas apenas as taxas pagas no período serão contabilizadas
  const studentsFilteredByDate = useMemo(() => {
    // Sem filtro de data, retornar todos os estudantes
    if (!filters.dateFrom && !filters.dateTo) {
      return filteredStudents;
    }
    
    // Com filtro de data, retornar todos os estudantes (a filtragem será feita no cálculo de valores)
    return filteredStudents;
  }, [filteredStudents, filters.dateFrom, filters.dateTo]);

  // Removido: calculateUserFees não é usado neste componente

  // ✅ CORREÇÃO: Students com valores ajustados - calcular apenas taxas pagas no período selecionado
  const adjustedStudents = useMemo(() => {
    const hasDateFilter = filters.dateFrom || filters.dateTo;
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const dateTo = filters.dateTo ? new Date(filters.dateTo + 'T23:59:59') : null; // Incluir todo o dia final
    
    const result = (studentsFilteredByDate || []).map((s: any) => {
      const o = overridesMap[s.user_id] || {};
      const dependents = Number(dependentsMap[s.profile_id]) || 0;
      const realPaid = realPaidAmountsMap[s.user_id] || {};
      const paymentDates = studentPaymentDates[s.user_id] || {};
      let total = 0;
      
      // Determinar valores base baseado no system_type do estudante
      const systemType = s.system_type || 'legacy';
      const baseSelectionFee = systemType === 'simplified' ? 350 : 400;
      const baseScholarshipFee = systemType === 'simplified' ? 550 : 900;
      const baseI20Fee = 900; // Sempre 900 para ambos os sistemas
      
      // ✅ CORREÇÃO: Verificar se Selection Process Fee foi pago E se foi pago no período (se houver filtro)
      if (s.has_paid_selection_process_fee) {
        // Se há filtro de data, verificar se foi pago no período
        if (hasDateFilter) {
          const paymentDate = paymentDates.selection_process;
          if (!paymentDate) {
            // Se não tem data de pagamento registrada, não incluir
          } else {
            const paymentDateObj = new Date(paymentDate);
            const isInPeriod = (!dateFrom || paymentDateObj >= dateFrom) && (!dateTo || paymentDateObj <= dateTo);
            
            if (isInPeriod) {
        let sel = 0;
        if (realPaid.selection_process !== undefined && realPaid.selection_process > 0) {
          sel = realPaid.selection_process;
        } else if (o.selection_process_fee != null) {
          sel = Number(o.selection_process_fee);
        } else {
          sel = systemType === 'simplified' ? baseSelectionFee : baseSelectionFee + (dependents * 150);
        }
        total += sel || 0;
      }
          }
        } else {
          // Sem filtro de data, incluir normalmente
          let sel = 0;
          if (realPaid.selection_process !== undefined && realPaid.selection_process > 0) {
            sel = realPaid.selection_process;
          } else if (o.selection_process_fee != null) {
            sel = Number(o.selection_process_fee);
          } else {
            sel = systemType === 'simplified' ? baseSelectionFee : baseSelectionFee + (dependents * 150);
          }
          total += sel || 0;
        }
      }
      
      // ✅ CORREÇÃO: Verificar se Scholarship Fee foi pago E se foi pago no período (se houver filtro)
      if (s.is_scholarship_fee_paid) {
        // Se há filtro de data, verificar se foi pago no período
        if (hasDateFilter) {
          const paymentDate = paymentDates.scholarship;
          if (!paymentDate) {
            // Se não tem data de pagamento registrada, não incluir
          } else {
            const paymentDateObj = new Date(paymentDate);
            const isInPeriod = (!dateFrom || paymentDateObj >= dateFrom) && (!dateTo || paymentDateObj <= dateTo);
            
            if (isInPeriod) {
        let schol = 0;
        if (realPaid.scholarship !== undefined && realPaid.scholarship > 0) {
          schol = realPaid.scholarship;
        } else if (o.scholarship_fee != null) {
          schol = Number(o.scholarship_fee);
        } else {
          schol = baseScholarshipFee;
        }
        total += schol || 0;
      }
          }
        } else {
          // Sem filtro de data, incluir normalmente
          let schol = 0;
          if (realPaid.scholarship !== undefined && realPaid.scholarship > 0) {
            schol = realPaid.scholarship;
          } else if (o.scholarship_fee != null) {
            schol = Number(o.scholarship_fee);
          } else {
            schol = baseScholarshipFee;
          }
          total += schol || 0;
        }
      }
      
      // ✅ CORREÇÃO: Verificar se I-20 Control Fee foi pago E se foi pago no período (se houver filtro)
      // I-20 só conta se scholarship foi pago
      if (s.is_scholarship_fee_paid && s.has_paid_i20_control_fee) {
        // Se há filtro de data, verificar se foi pago no período
        if (hasDateFilter) {
          const paymentDate = paymentDates.i20_control;
          if (!paymentDate) {
            // Se não tem data de pagamento registrada, não incluir
          } else {
            const paymentDateObj = new Date(paymentDate);
            const isInPeriod = (!dateFrom || paymentDateObj >= dateFrom) && (!dateTo || paymentDateObj <= dateTo);
            
            if (isInPeriod) {
        let i20 = 0;
        if (realPaid.i20_control !== undefined && realPaid.i20_control > 0) {
          i20 = realPaid.i20_control;
        } else if (o.i20_control_fee != null) {
          i20 = Number(o.i20_control_fee);
        } else {
          i20 = baseI20Fee;
        }
        total += i20 || 0;
            }
          }
        } else {
          // Sem filtro de data, incluir normalmente
          let i20 = 0;
          if (realPaid.i20_control !== undefined && realPaid.i20_control > 0) {
            i20 = realPaid.i20_control;
          } else if (o.i20_control_fee != null) {
            i20 = Number(o.i20_control_fee);
          } else {
            i20 = baseI20Fee;
          }
          total += i20 || 0;
        }
      }
      
      return { ...s, total_paid_adjusted: total };
    });
    return result;
  }, [studentsFilteredByDate, overridesMap, dependentsMap, realPaidAmountsMap, feeConfig, studentPaymentDates, filters.dateFrom, filters.dateTo]);

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
    // Filtrar affiliates e sellers com email @uorak.com
    return filteredAffiliates.map((aff: any) => {
      // Filtrar sellers com email @uorak.com dentro de cada affiliate (exceto em localhost)
      const sellersFiltered = isDevelopment
        ? (aff.sellers || [])
        : (aff.sellers || []).filter((seller: any) => {
            const email = seller.email?.toLowerCase() || '';
            return !email.includes('@uorak.com');
          });
      
      const sellersAdjusted = sellersFiltered.map((seller: any) => {
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
  }, [filteredAffiliates, adjustedStudentsBySellerId]);

  // Aplicar filtros e ordenação sobre dados ajustados
  const filteredAndSortedAffiliates = useMemo(() => {
    let filtered = adjustedAffiliates.filter(affiliate => {
      // Filtro de busca
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          affiliate.full_name.toLowerCase().includes(searchLower) ||
          (affiliate.company_name && affiliate.company_name.toLowerCase().includes(searchLower)) ||
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
          const aDisplayName = (a.company_name && a.company_name.trim() ? a.company_name : a.full_name).toLowerCase();
          const bDisplayName = (b.company_name && b.company_name.trim() ? b.company_name : b.full_name).toLowerCase();
          aValue = aDisplayName;
          bValue = bDisplayName;
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
  // ✅ CORREÇÃO: Usar studentsFilteredByDate para contar estudantes quando há filtro de data
  const totalStats = useMemo(() => {
    return {
      totalAffiliates: adjustedAffiliates.length,
      activeAffiliates: adjustedAffiliates.filter((a: any) => a.status === 'active').length,
      totalSellers: filteredSellers.length,
      activeSellers: filteredSellers.filter((s: any) => s.is_active).length,
      totalStudents: filters.dateFrom || filters.dateTo ? studentsFilteredByDate.length : filteredStudents.length,
      totalRevenue: adjustedAffiliates.reduce((sum: number, a: any) => sum + (a.total_revenue || 0), 0)
    };
  }, [adjustedAffiliates, filteredSellers, filteredStudents, studentsFilteredByDate, filters.dateFrom, filters.dateTo]);

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

  const toggleStudentExpansion = (studentId: string) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
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
      sortOrder: 'desc',
      dateFrom: '',
      dateTo: ''
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
                {isLoadingRealPaidAmounts ? (
                  <div className="animate-pulse bg-slate-200 h-8 w-32 rounded"></div>
                ) : (
                  `$${totalStats.totalRevenue.toLocaleString()}`
                )}
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

          {/* ✅ NOVO: Date From Filter */}
          <div className="w-full lg:w-48">
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => updateFilters({ dateFrom: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              placeholder="From Date"
              title="Filter from date"
            />
          </div>

          {/* ✅ NOVO: Date To Filter */}
          <div className="w-full lg:w-48">
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => updateFilters({ dateTo: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              placeholder="To Date"
              title="Filter to date"
            />
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
                name: affiliates[0].company_name && affiliates[0].company_name.trim() 
                  ? affiliates[0].company_name 
                  : affiliates[0].full_name,
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
                          {(affiliate.company_name && affiliate.company_name.trim() 
                            ? affiliate.company_name 
                            : affiliate.full_name).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {affiliate.company_name && affiliate.company_name.trim() 
                              ? affiliate.company_name 
                              : affiliate.full_name}
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
                            {isLoadingRealPaidAmounts ? (
                              <div className="animate-pulse bg-slate-200 h-6 w-20 rounded"></div>
                            ) : (
                              `$${affiliate.total_revenue.toLocaleString()}`
                            )}
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
                                      {isLoadingRealPaidAmounts ? (
                                        <div className="animate-pulse bg-slate-200 h-8 w-32 rounded"></div>
                                      ) : (
                                        `$${affiliate.total_revenue.toLocaleString()}`
                                      )}
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
                                                {isLoadingRealPaidAmounts ? (
                                                  <div className="animate-pulse bg-slate-200 h-4 w-16 rounded"></div>
                                                ) : (
                                                  formatCurrency(seller.total_revenue)
                                                )}
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
                                          {sellerStudents.map((student: any) => {
                                            const isStudentExpanded = expandedStudents.has(student.user_id || student.id);
                                            const paymentDates = studentPaymentDates[student.user_id] || {};
                                            const realPaid = realPaidAmountsMap[student.user_id] || {};
                                            const o = overridesMap[student.user_id] || {};
                                            const dependents = Number(dependentsMap[student.profile_id]) || 0;
                                            const systemType = student.system_type || 'legacy';
                                            
                                            // Calcular valores de cada taxa
                                            const hasDateFilter = filters.dateFrom || filters.dateTo;
                                            const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
                                            const dateTo = filters.dateTo ? new Date(filters.dateTo + 'T23:59:59') : null;
                                            
                                            const baseSelectionFee = systemType === 'simplified' ? 350 : 400;
                                            const baseScholarshipFee = systemType === 'simplified' ? 550 : 900;
                                            const baseI20Fee = 900;
                                            
                                            // Selection Process Fee
                                            let selectionFee = 0;
                                            let selectionDate: string | null = null;
                                            if (student.has_paid_selection_process_fee) {
                                              selectionDate = paymentDates.selection_process || null;
                                              if (!hasDateFilter || (selectionDate && (() => {
                                                const paymentDateObj = new Date(selectionDate);
                                                return (!dateFrom || paymentDateObj >= dateFrom) && (!dateTo || paymentDateObj <= dateTo);
                                              })())) {
                                                if (realPaid.selection_process !== undefined && realPaid.selection_process > 0) {
                                                  selectionFee = realPaid.selection_process;
                                                } else if (o.selection_process_fee != null) {
                                                  selectionFee = Number(o.selection_process_fee);
                                                } else {
                                                  selectionFee = systemType === 'simplified' ? baseSelectionFee : baseSelectionFee + (dependents * 150);
                                                }
                                              }
                                            }
                                            
                                            // Scholarship Fee
                                            let scholarshipFee = 0;
                                            let scholarshipDate: string | null = null;
                                            if (student.is_scholarship_fee_paid) {
                                              scholarshipDate = paymentDates.scholarship || null;
                                              if (!hasDateFilter || (scholarshipDate && (() => {
                                                const paymentDateObj = new Date(scholarshipDate);
                                                return (!dateFrom || paymentDateObj >= dateFrom) && (!dateTo || paymentDateObj <= dateTo);
                                              })())) {
                                                if (realPaid.scholarship !== undefined && realPaid.scholarship > 0) {
                                                  scholarshipFee = realPaid.scholarship;
                                                } else if (o.scholarship_fee != null) {
                                                  scholarshipFee = Number(o.scholarship_fee);
                                                } else {
                                                  scholarshipFee = baseScholarshipFee;
                                                }
                                              }
                                            }
                                            
                                            // I-20 Control Fee
                                            let i20Fee = 0;
                                            let i20Date: string | null = null;
                                            if (student.is_scholarship_fee_paid && student.has_paid_i20_control_fee) {
                                              i20Date = paymentDates.i20_control || null;
                                              if (!hasDateFilter || (i20Date && (() => {
                                                const paymentDateObj = new Date(i20Date);
                                                return (!dateFrom || paymentDateObj >= dateFrom) && (!dateTo || paymentDateObj <= dateTo);
                                              })())) {
                                                if (realPaid.i20_control !== undefined && realPaid.i20_control > 0) {
                                                  i20Fee = realPaid.i20_control;
                                                } else if (o.i20_control_fee != null) {
                                                  i20Fee = Number(o.i20_control_fee);
                                                } else {
                                                  i20Fee = baseI20Fee;
                                                }
                                              }
                                            }
                                            
                                            return (
                                            <div 
                                              key={student.id}
                                                className="bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200"
                                              >
                                                <div className="flex items-center justify-between p-3">
                                                  <div className="flex items-center space-x-3 flex-1">
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleStudentExpansion(student.user_id || student.id);
                                                      }}
                                                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                                    >
                                                      <ChevronRight className={`h-4 w-4 transform transition-transform duration-200 ${
                                                        isStudentExpanded ? 'rotate-90' : 'rotate-0'
                                                      }`} />
                                                    </button>
                                                    
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
                                                    {isLoadingRealPaidAmounts ? (
                                                      <div className="animate-pulse bg-slate-200 h-4 w-16 rounded"></div>
                                                    ) : (
                                                      formatCurrency(student.total_paid_adjusted)
                                                    )}
                                                  </p>
                                                  <p className="text-xs text-slate-500">
                                                    {formatDate(student.created_at)}
                                                  </p>
                                                </div>
                                                
                                                <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewStudent(student.profile_id || student.id);
                                                      }}
                                                  className="flex items-center space-x-1 px-3 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                  <Eye className="h-3 w-3" />
                                                  <span>View</span>
                                                </button>
                                              </div>
                                            </div>
                                                
                                                {/* ✅ NOVO: Detalhes das Taxas Expandidas */}
                                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                                  isStudentExpanded 
                                                    ? 'max-h-[500px] opacity-100' 
                                                    : 'max-h-0 opacity-0'
                                                }`}>
                                                  <div className="px-3 pb-3 border-t border-slate-200 pt-3">
                                                    <h6 className="text-xs font-semibold text-slate-700 mb-2 flex items-center">
                                                      <CreditCard className="h-3 w-3 mr-1" />
                                                      Payment Details
                                                    </h6>
                                                    <div className="space-y-2">
                                                      {/* Selection Process Fee */}
                                                      {student.has_paid_selection_process_fee && (
                                                        <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                                                          <div className="flex-1">
                                                            <p className="text-xs font-medium text-slate-700">Selection Process Fee</p>
                                                            {selectionDate && (
                                                              <p className="text-xs text-slate-500 mt-0.5">
                                                                Paid: {new Date(selectionDate).toLocaleDateString()}
                                                              </p>
                                                            )}
                                        </div>
                                                          <div className="text-right">
                                                            <p className={`text-sm font-semibold ${
                                                              selectionFee > 0 ? 'text-green-600' : 'text-slate-400'
                                                            }`}>
                                                              {isLoadingRealPaidAmounts ? (
                                                                <div className="animate-pulse bg-slate-200 h-4 w-16 rounded"></div>
                                                              ) : (
                                                                selectionFee > 0 ? formatCurrency(selectionFee) : 'N/A'
                                                              )}
                                                            </p>
                                                            {hasDateFilter && selectionDate && (() => {
                                                              const paymentDateObj = new Date(selectionDate);
                                                              const isInPeriod = (!dateFrom || paymentDateObj >= dateFrom) && (!dateTo || paymentDateObj <= dateTo);
                                                              return !isInPeriod ? (
                                                                <p className="text-xs text-amber-600 mt-0.5">Outside period</p>
                                                              ) : null;
                                                            })()}
                                      </div>
                                    </div>
                                                      )}
                                                      
                                                      {/* Scholarship Fee */}
                                                      {student.is_scholarship_fee_paid && (
                                                        <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                                                          <div className="flex-1">
                                                            <p className="text-xs font-medium text-slate-700">Scholarship Fee</p>
                                                            {scholarshipDate && (
                                                              <p className="text-xs text-slate-500 mt-0.5">
                                                                Paid: {new Date(scholarshipDate).toLocaleDateString()}
                                                              </p>
                                                            )}
                                                          </div>
                                                          <div className="text-right">
                                                            <p className={`text-sm font-semibold ${
                                                              scholarshipFee > 0 ? 'text-green-600' : 'text-slate-400'
                                                            }`}>
                                                              {isLoadingRealPaidAmounts ? (
                                                                <div className="animate-pulse bg-slate-200 h-4 w-16 rounded"></div>
                                                              ) : (
                                                                scholarshipFee > 0 ? formatCurrency(scholarshipFee) : 'N/A'
                                                              )}
                                                            </p>
                                                            {hasDateFilter && scholarshipDate && (() => {
                                                              const paymentDateObj = new Date(scholarshipDate);
                                                              const isInPeriod = (!dateFrom || paymentDateObj >= dateFrom) && (!dateTo || paymentDateObj <= dateTo);
                                                              return !isInPeriod ? (
                                                                <p className="text-xs text-amber-600 mt-0.5">Outside period</p>
                                                              ) : null;
                                                            })()}
                                                          </div>
                                                        </div>
                                                      )}
                                                      
                                                      {/* I-20 Control Fee */}
                                                      {student.is_scholarship_fee_paid && student.has_paid_i20_control_fee && (
                                                        <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                                                          <div className="flex-1">
                                                            <p className="text-xs font-medium text-slate-700">I-20 Control Fee</p>
                                                            {i20Date && (
                                                              <p className="text-xs text-slate-500 mt-0.5">
                                                                Paid: {new Date(i20Date).toLocaleDateString()}
                                                              </p>
                                                            )}
                                                          </div>
                                                          <div className="text-right">
                                                            <p className={`text-sm font-semibold ${
                                                              i20Fee > 0 ? 'text-green-600' : 'text-slate-400'
                                                            }`}>
                                                              {isLoadingRealPaidAmounts ? (
                                                                <div className="animate-pulse bg-slate-200 h-4 w-16 rounded"></div>
                                                              ) : (
                                                                i20Fee > 0 ? formatCurrency(i20Fee) : 'N/A'
                                                              )}
                                                            </p>
                                                            {hasDateFilter && i20Date && (() => {
                                                              const paymentDateObj = new Date(i20Date);
                                                              const isInPeriod = (!dateFrom || paymentDateObj >= dateFrom) && (!dateTo || paymentDateObj <= dateTo);
                                                              return !isInPeriod ? (
                                                                <p className="text-xs text-amber-600 mt-0.5">Outside period</p>
                                                              ) : null;
                                                            })()}
                                                          </div>
                                                        </div>
                                                      )}
                                                      
                                                      {/* Total */}
                                                      <div className="flex items-center justify-between p-2 bg-slate-100 rounded border border-slate-300 mt-2">
                                                        <p className="text-xs font-semibold text-slate-900">Total (Period)</p>
                                                        <p className="text-sm font-bold text-green-700">
                                                          {isLoadingRealPaidAmounts ? (
                                                            <div className="animate-pulse bg-slate-200 h-4 w-20 rounded"></div>
                                                          ) : (
                                                            formatCurrency(selectionFee + scholarshipFee + i20Fee)
                                                          )}
                                                        </p>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
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