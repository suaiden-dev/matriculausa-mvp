import React, { useEffect, useState, useRef } from 'react';
/**
 * Payment Management (Admin)
 *
 * Fluxo de dados:
 * - Carregadores (loaders) em PaymentManagement/data/loaders/* fazem as queries (universities, affiliates, zelle) e retornam dados normalizados.
 * - Serviços (services) isolam efeitos sensíveis: zellePaymentsService (status/notes), zelleOrchestrator (aprovação/rejeição completa), notificationsService (PDF/termos).
 * - Utils em PaymentManagement/utils/* cuidam de paginação, filtro/ordenação e totais selecionados.
 * - Estado compartilhado via useAdminPaymentsState: filtros, paginação, viewMode, seleção.
 *
 * Regras preservadas: filtro padrão paid, layout/UX original, export CSV por Edge Function, sem libs novas.
 * Monitoração: console.time/timeEnd envolvendo loaders principais.
 */
import { useSearchParams } from 'react-router-dom';
import { filterPayments as filterPaymentsUtil, sortPayments as sortPaymentsUtil } from './PaymentManagement/utils/sortFilter';
import { getPageNumbers as getPageNumbersUtil, pagingGoTo, pagingNext, pagingPrev, pagingFirst, pagingLast } from './PaymentManagement/utils/pagination';
import { calculateSelectedTotalsUtil } from './PaymentManagement/utils/totals';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { UniversityPaymentRequestService, type UniversityPaymentRequest } from '../../services/UniversityPaymentRequestService';
import { AffiliatePaymentRequestService } from '../../services/AffiliatePaymentRequestService';
// Moved into PaymentsTab
import { PaymentsTab } from './PaymentManagement/components/PaymentsTab';
import { AffiliateRequests } from './PaymentManagement/components/AffiliateRequests';
import { ZellePayments } from './PaymentManagement/components/ZellePayments';
import { 
  CreditCard
} from 'lucide-react';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import ZellePaymentReviewModal from '../../components/ZellePaymentReviewModal';
import { UniversityRequestDetailsModal } from './PaymentManagement/components/Modals/UniversityRequestDetailsModal';
import { AffiliateRequestDetailsModal } from './PaymentManagement/components/Modals/AffiliateRequestDetailsModal';
import { PaymentDetailsModal } from './PaymentManagement/components/PaymentDetailsModal';
 
import RejectUniversityModal from './PaymentManagement/components/Modals/RejectUniversityModal';
import MarkUniversityPaidModal from './PaymentManagement/components/Modals/MarkUniversityPaidModal';
import UniversityAddNotesModal from './PaymentManagement/components/Modals/UniversityAddNotesModal';
import CreateUniversityPaymentModal from './PaymentManagement/components/Modals/CreateUniversityPaymentModal';
import ZelleAddNotesModal from './PaymentManagement/components/Modals/ZelleAddNotesModal';
import AffiliateRejectModal from './PaymentManagement/components/Modals/AffiliateRejectModal';
import AffiliateMarkPaidModal from './PaymentManagement/components/Modals/AffiliateMarkPaidModal';
import AffiliateAddNotesModal from './PaymentManagement/components/Modals/AffiliateAddNotesModal';
import Tabs from './PaymentManagement/components/Tabs';
import { useAdminPaymentsState } from './PaymentManagement/state/useAdminPaymentsState';
import type { PaymentRecord, PaymentStats } from './PaymentManagement/data/types';
import { UniversityRequests } from './PaymentManagement/components/UniversityRequests';
import { loadPaymentsBaseDataOptimized } from './PaymentManagement/data/loaders/paymentsLoaderOptimized';
import { getPaymentDatesForUsersLoaderOptimized } from './PaymentManagement/data/loaders/paymentDatesLoaderOptimized';
import { transformPaymentsToRecordsAndStats } from './PaymentManagement/utils/transformPayments';
import { usePaymentsBackendPagination } from './PaymentManagement/hooks/usePaymentsBackendPagination';
import { createAffiliateUIHandlers } from './PaymentManagement/handlers/affiliateHandlers';
import { createUniversityUIHandlers } from './PaymentManagement/handlers/universityHandlers';
import { createZelleUIHandlers } from './PaymentManagement/handlers/zelleHandlers';
import { exportPaymentsToCsvViaEdge, downloadCsvFromPayments } from './PaymentManagement/utils/export';
import PaymentManagementSkeleton from '../../components/PaymentManagementSkeleton';


const FEE_TYPES = [
  { value: 'selection_process', label: 'Selection Process Fee', color: 'bg-blue-100 text-blue-800' },
  { value: 'application', label: 'Application Fee', color: 'bg-green-100 text-green-800' },
  { value: 'scholarship', label: 'Scholarship Fee', color: 'bg-blue-100 text-[#05294E]' },
  { value: 'i20_control_fee', label: 'I-20 Control Fee', color: 'bg-orange-100 text-orange-800' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
];

const PaymentManagement = (): React.JSX.Element => {
  const { user } = useAuth();
  const { getFeeAmount } = useFeeConfig();
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    totalPayments: 0,
    paidPayments: 0,
    pendingPayments: 0,
    monthlyGrowth: 0,
    manualRevenue: 0
  });

  // Estado centralizado (incremental: filtros/paginação/abas)
  const adminState = useAdminPaymentsState();
  const { filters, setFilters, currentPage, setCurrentPage, pageSize, setPageSize, activeTab, setActiveTab } = adminState;
  // Inicialização padrão de filtros (apenas na primeira montagem)
  useEffect(() => {
    if (!filters || Object.keys(filters).length === 0) {
      setFilters((prev: any) => ({
        ...prev,
    search: '',
    university: 'all',
    feeType: 'all',
        status: 'paid',
        dateFrom: undefined,
        dateTo: undefined,
        affiliate: undefined,
      }));
    }
  }, []);

  const [showFilters, setShowFilters] = useState(false);
  const { selectedPayments, setSelectedPayments, selectAll, setSelectAll } = adminState;

  // Estados para modal de detalhes de pagamento
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Estados para University Payment Requests

  // Read URL parameters on component mount
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'zelle') {
      setActiveTab('zelle-payments');
    } else if (tab === 'university-requests') {
      setActiveTab('university-requests');
    } else if (tab === 'affiliate-requests') {
      setActiveTab('affiliate-requests');
    } else {
      setActiveTab('payments');
    }
  }, [searchParams]);
  const [universityRequests, setUniversityRequests] = useState<UniversityPaymentRequest[]>([]);
  const [loadingUniversityRequests, setLoadingUniversityRequests] = useState(false);
  const [affiliateRequests, setAffiliateRequests] = useState<any[]>([]);
  const [loadingAffiliateRequests, setLoadingAffiliateRequests] = useState(false);
  const [affiliateActionLoading, setAffiliateActionLoading] = useState(false);
  const [selectedAffiliateRequest, setSelectedAffiliateRequest] = useState<any>(null);
  const [showAffiliateDetails, setShowAffiliateDetails] = useState(false);
  const [showAffiliateRejectModal, setShowAffiliateRejectModal] = useState(false);
  const [showAffiliateMarkPaidModal, setShowAffiliateMarkPaidModal] = useState(false);
  const [showAffiliateNotesModal, setShowAffiliateNotesModal] = useState(false);
  const [affiliateRejectReason, setAffiliateRejectReason] = useState('');
  const [affiliatePaymentReference, setAffiliatePaymentReference] = useState('');
  const [affiliateAdminNotes, setAffiliateAdminNotes] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<UniversityPaymentRequest | null>(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [universityRequestsViewMode, setUniversityRequestsViewMode] = useState<'grid' | 'list'>('list');
  const [adminBalance, setAdminBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Estados para Zelle Payments
  const [zellePayments, setZellePayments] = useState<PaymentRecord[]>([]);
  const [loadingZellePayments, setLoadingZellePayments] = useState(false);
  const [selectedZellePayment, setSelectedZellePayment] = useState<PaymentRecord | null>(null);
  const [zelleViewMode, setZelleViewMode] = useState<'grid' | 'list'>('list');

  // Estados para modais de ações
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [showAddNotesModal, setShowAddNotesModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreatePaymentModal, setShowCreatePaymentModal] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);

  // Estados para modais de Zelle
  const [showZelleNotesModal, setShowZelleNotesModal] = useState(false);
  const [showZelleReviewModal, setShowZelleReviewModal] = useState(false);
  const [zelleAdminNotes, setZelleAdminNotes] = useState('');
  const [zelleActionLoading, setZelleActionLoading] = useState(false);
  const [zelleRejectReason, setZelleRejectReason] = useState('');

  // Estados de paginação
  const itemsPerPage = pageSize;
  const setItemsPerPage = (n: number) => setPageSize(n);
  const [backendTotalCount, setBackendTotalCount] = useState<number | null>(null);
  const [currentPageZelle, setCurrentPageZelle] = useState(1);
  const [zelleTotalCount, setZelleTotalCount] = useState<number>(0);

  // Estados para ordenação
  const [sortBy, setSortBy] = useState<keyof PaymentRecord>('payment_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const hasLoadedPayments = useRef(false);
  const hasLoadedUniversities = useRef(false);
  const hasLoadedUniversityRequests = useRef(false);
  const hasLoadedAffiliateRequests = useRef(false);
  const hasLoadedZellePayments = useRef(false);

  // Estados para modal de comprovante Zelle
  const [showZelleProofModal, setShowZelleProofModal] = useState(false);
  const [selectedZelleProofUrl, setSelectedZelleProofUrl] = useState<string>('');
  const [selectedZelleProofFileName, setSelectedZelleProofFileName] = useState<string>('');

  const { viewMode, setViewMode } = adminState;

  // Controle de concorrência (cancelamento/obsolescência)
  const universityReqLoadToken = useRef(0);
  const affiliateReqLoadToken = useRef(0);
  const zelleLoadController = useRef<AbortController | null>(null);
  
  // ✅ Cache de dados para evitar skeleton quando voltar à aba
  const cachedPayments = useRef<PaymentRecord[]>([]);
  const cachedStats = useRef<PaymentStats | null>(null);
  const cacheTimestamp = useRef<number>(0);
  const cachedUniversityRequests = useRef<UniversityPaymentRequest[]>([]);
  const universityRequestsCacheTimestamp = useRef<number>(0);
  const cachedAffiliateRequests = useRef<any[]>([]);
  const affiliateRequestsCacheTimestamp = useRef<number>(0);
  const cachedZellePayments = useRef<PaymentRecord[]>([]);
  const zellePaymentsCacheTimestamp = useRef<number>(0);
  const cachedZellePage = useRef<number>(1);
  const cachedZelleItemsPerPage = useRef<number>(10);
  const CACHE_TTL = 2 * 60 * 1000; // Cache válido por 2 minutos

  // Backend pagination for Payments tab (supports specific university or all)
  usePaymentsBackendPagination({
    activeTab,
    filters,
    currentPage,
    itemsPerPage,
    setLoading,
    setPayments,
    setBackendTotalCount,
  });

  // Fallback: quando universidade = 'all', usar processamento client-side
  useEffect(() => {
    if (activeTab === 'payments' && (!filters?.university || filters.university === 'all')) {
      setBackendTotalCount(null);
      
      // ✅ Se temos dados em cache válidos, mostrar imediatamente
      const now = Date.now();
      const isCacheValid = cachedPayments.current.length > 0 && 
                          cachedStats.current !== null && 
                          (now - cacheTimestamp.current) < CACHE_TTL;
      
      if (isCacheValid) {
        // Mostrar dados em cache imediatamente (sem skeleton)
        setPayments(cachedPayments.current);
        if (cachedStats.current) {
          setStats(cachedStats.current);
        }
        setLoading(false);
        
        // Recarregar em background para atualizar dados
        loadPaymentData(true); // true = background refresh
      } else {
        // Não há cache válido, carregar normalmente (mostra skeleton)
        loadPaymentData(false);
      }
    }
  }, [activeTab, filters.university]);

  // ✅ OTIMIZADO: Começar a carregar dados imediatamente, sem esperar user completo do useAuth
  // Busca a sessão diretamente e valida role de forma não-bloqueante
  useEffect(() => {
    if (hasLoadedPayments.current) return;
    
    const startLoading = async () => {
      try {
        // Buscar sessão diretamente (mais rápido que esperar useAuth)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.warn('[PaymentManagement] Sem sessão, aguardando...');
          return;
        }
        
        // Validar role diretamente do perfil (mais rápido)
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        if (profileError || profile?.role !== 'admin') {
          console.warn('[PaymentManagement] Usuário não é admin');
          return;
        }
        
        // ✅ Carregar dados em paralelo - não esperar user do useAuth
        if (!hasLoadedPayments.current) {
          hasLoadedPayments.current = true;
          
          // Verificar cache antes de carregar
          const now = Date.now();
          const isCacheValid = cachedPayments.current.length > 0 && 
                              cachedStats.current !== null && 
                              (now - cacheTimestamp.current) < CACHE_TTL;
          
          if (isCacheValid) {
            // Mostrar cache imediatamente
            setPayments(cachedPayments.current);
            if (cachedStats.current) {
              setStats(cachedStats.current);
            }
            setLoading(false);
            // Recarregar em background
            loadPaymentData(true);
          } else {
            // Não há cache, carregar normalmente
            loadPaymentData(false);
          }
        }
        if (!hasLoadedUniversities.current) {
          hasLoadedUniversities.current = true;
          loadUniversities(); // Em paralelo
          loadAffiliates(); // Em paralelo
        }
      } catch (err) {
        console.error('[PaymentManagement] Erro ao iniciar carregamento:', err);
      }
    };
    
    // Iniciar imediatamente na montagem
    startLoading();
  }, []); // Executar apenas uma vez na montagem

  useEffect(() => {
    if (activeTab === 'university-requests') {
      const now = Date.now();
      const isCacheValid = cachedUniversityRequests.current.length > 0 && 
                          (now - universityRequestsCacheTimestamp.current) < CACHE_TTL;
      
      if (isCacheValid && !hasLoadedUniversityRequests.current) {
        // Mostrar cache imediatamente
        setUniversityRequests(cachedUniversityRequests.current);
        setLoadingUniversityRequests(false);
        // Recarregar em background
        loadUniversityPaymentRequests(true);
        hasLoadedUniversityRequests.current = true;
      } else if (!hasLoadedUniversityRequests.current) {
        loadUniversityPaymentRequests(false);
        hasLoadedUniversityRequests.current = true;
      }
    } else if (activeTab === 'affiliate-requests') {
      const now = Date.now();
      const isCacheValid = cachedAffiliateRequests.current.length > 0 && 
                          (now - affiliateRequestsCacheTimestamp.current) < CACHE_TTL;
      
      if (isCacheValid && !hasLoadedAffiliateRequests.current) {
        // Mostrar cache imediatamente
        setAffiliateRequests(cachedAffiliateRequests.current);
        setLoadingAffiliateRequests(false);
        // Recarregar em background
        loadAffiliateRequests(true);
        hasLoadedAffiliateRequests.current = true;
      } else if (!hasLoadedAffiliateRequests.current) {
        loadAffiliateRequests(false);
        hasLoadedAffiliateRequests.current = true;
      }
    } else if (activeTab === 'zelle-payments') {
      const now = Date.now();
      // Verificar se o cache é válido E se é para a mesma página e itemsPerPage
      const isCacheValid = cachedZellePayments.current.length > 0 && 
                          (now - zellePaymentsCacheTimestamp.current) < CACHE_TTL &&
                          cachedZellePage.current === currentPageZelle &&
                          cachedZelleItemsPerPage.current === itemsPerPage;
      
      if (isCacheValid && !hasLoadedZellePayments.current) {
        // Mostrar cache imediatamente apenas se for para a mesma página
        setZellePayments(cachedZellePayments.current);
        setLoadingZellePayments(false);
        // Recarregar em background
        loadZellePayments(true);
        hasLoadedZellePayments.current = true;
      } else if (!hasLoadedZellePayments.current) {
        loadZellePayments(false);
        hasLoadedZellePayments.current = true;
      }
    }
  }, [activeTab]);

  // Recarregar Zelle payments quando página ou itemsPerPage mudarem
  useEffect(() => {
    if (activeTab === 'zelle-payments') {
      // Invalidar cache se página ou itemsPerPage mudaram
      if (cachedZellePage.current !== currentPageZelle || cachedZelleItemsPerPage.current !== itemsPerPage) {
        hasLoadedZellePayments.current = false;
        loadZellePayments(false);
        hasLoadedZellePayments.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageZelle, itemsPerPage, activeTab]);

  // Realtime updates for Affiliate Requests
  useEffect(() => {
    if (activeTab !== 'affiliate-requests') return;
    const channel = supabase
      .channel('adm_affiliate_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_payment_requests' }, () => {
        loadAffiliateRequests();
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch (_) {}
    };
  }, [activeTab]);

  useEffect(() => {
    if (universityRequests.length > 0) {
      loadAdminBalance();
    }
  }, [universityRequests]);

  useEffect(() => {
    const saved = localStorage.getItem('payment-view-mode') as 'grid' | 'list';
    if (saved) setViewMode(saved);
  }, []);

  // Nota: A preferência de itens por página já é inicializada no useAdminPaymentsState
  // Este useEffect garante sincronização adicional se necessário
  useEffect(() => {
    const saved = localStorage.getItem('payment-items-per-page');
    if (saved) {
      const items = Number(saved);
      if ([10, 20, 50, 100].includes(items)) {
        // Só atualizar se for diferente do valor atual
        if (items !== pageSize) {
          setItemsPerPage(items);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas uma vez na montagem

  const loadUniversities = async () => {
    try {
      const { loadUniversitiesLoader } = await import('./PaymentManagement/data/loaders/referencesLoader');
      const data = await loadUniversitiesLoader(supabase);
      setUniversities(data);
    } catch (error) {
      console.error('Error loading universities:', error);
    }
  };

  const loadAffiliates = async () => {
    try {
      const { loadAffiliatesLoader } = await import('./PaymentManagement/data/loaders/referencesLoader');
      const affiliatesData = await loadAffiliatesLoader(supabase);
      setAffiliates(affiliatesData);
    } catch (error) {
      console.error('Error loading affiliates:', error);
    }
  };

  const loadUniversityPaymentRequests = async (backgroundRefresh: boolean = false) => {
    try {
      if (!backgroundRefresh) {
        setLoadingUniversityRequests(true);
      }
      console.time('[requests] loadUniversityPaymentRequests');
      const token = ++universityReqLoadToken.current;
      const data = await UniversityPaymentRequestService.listAllPaymentRequests();
      if (token === universityReqLoadToken.current) {
        // ✅ Salvar no cache
        cachedUniversityRequests.current = data;
        universityRequestsCacheTimestamp.current = Date.now();
        
        setUniversityRequests(data);
      }
    } catch (error: any) {
      console.error('Error loading university payment requests:', error);
    } finally {
      console.timeEnd('[requests] loadUniversityPaymentRequests');
      setLoadingUniversityRequests(false);
    }
  };

  const loadAffiliateRequests = async (backgroundRefresh: boolean = false) => {
    try {
      if (!backgroundRefresh) {
        setLoadingAffiliateRequests(true);
      }
      console.time('[requests] loadAffiliateRequests');
      const token = ++affiliateReqLoadToken.current;
      const data = await AffiliatePaymentRequestService.listAllPaymentRequests();
      if (token === affiliateReqLoadToken.current) {
        // ✅ Salvar no cache
        cachedAffiliateRequests.current = data;
        affiliateRequestsCacheTimestamp.current = Date.now();
        
        setAffiliateRequests(data);
      }
    } catch (error: any) {
      console.error('Error loading affiliate payment requests (admin):', error);
      setAffiliateRequests([]);
    } finally {
      console.timeEnd('[requests] loadAffiliateRequests');
      setLoadingAffiliateRequests(false);
    }
  };

  // Admin actions for Affiliate Requests
  const approveAffiliateRequest = async (id: string) => {
    if (!user?.id) {
      console.error('User not available for approveAffiliateRequest');
      return;
    }
    try {
      setAffiliateActionLoading(true);
      await AffiliatePaymentRequestService.adminApprove(id, user.id);
      await loadAffiliateRequests();
    } catch (error) {
      console.error('Error approving affiliate request:', error);
    } finally {
      setAffiliateActionLoading(false);
    }
  };

  const rejectAffiliateRequest = async (id: string, reason?: string) => {
    if (!user?.id) {
      console.error('User not available for rejectAffiliateRequest');
      return;
    }
    try {
      setAffiliateActionLoading(true);
      await AffiliatePaymentRequestService.adminReject(id, user.id, reason || affiliateRejectReason);
      await loadAffiliateRequests();
      setShowAffiliateRejectModal(false);
      setAffiliateRejectReason('');
    } catch (error) {
      console.error('Error rejecting affiliate request:', error);
    } finally {
      setAffiliateActionLoading(false);
    }
  };

  const markAffiliateRequestPaid = async (id: string, reference?: string) => {
    if (!user?.id) {
      console.error('User not available for markAffiliateRequestPaid');
      return;
    }
    try {
      setAffiliateActionLoading(true);
      await AffiliatePaymentRequestService.adminMarkPaid(id, user.id, reference || affiliatePaymentReference);
      await loadAffiliateRequests();
      setShowAffiliateMarkPaidModal(false);
      setAffiliatePaymentReference('');
    } catch (error) {
      console.error('Error marking affiliate request as paid:', error);
    } finally {
      setAffiliateActionLoading(false);
    }
  };

  const addAffiliateAdminNotes = async (id: string) => {
    try {
      setAffiliateActionLoading(true);
      await AffiliatePaymentRequestService.adminAddNotes(id, affiliateAdminNotes);
      await loadAffiliateRequests();
      setShowAffiliateNotesModal(false);
      setAffiliateAdminNotes('');
    } catch (error) {
      console.error('Error adding affiliate notes:', error);
    } finally {
      setAffiliateActionLoading(false);
    }
  };

  

  const loadAdminBalance = async () => {
    try {
      setLoadingBalance(true);
      // Calcular saldo baseado em todos os pagamentos recebidos menos os pagamentos feitos
      const totalRevenue = universityRequests.reduce((sum, r) => sum + r.amount_usd, 0);
      const totalPaidOut = universityRequests
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + r.amount_usd, 0);
      const availableBalance = totalRevenue - totalPaidOut;
      setAdminBalance(availableBalance);
    } catch (error: any) {
      console.error('Error loading admin balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const loadZellePayments = async (backgroundRefresh: boolean = false) => {
    try {
      if (!backgroundRefresh) {
        setLoadingZellePayments(true);
      }
      if (zelleLoadController.current) {
        try { zelleLoadController.current.abort(); } catch (_) {}
      }
      zelleLoadController.current = new AbortController();
      const { loadZellePaymentsLoader } = await import('./PaymentManagement/data/loaders/zelleLoader');
      
      const { records, count } = await loadZellePaymentsLoader(
        supabase,
        currentPageZelle,
        itemsPerPage,
        zelleLoadController.current.signal
      );
      
      // ✅ Salvar no cache (incluindo página e itemsPerPage para validação)
      cachedZellePayments.current = records as any;
      zellePaymentsCacheTimestamp.current = Date.now();
      cachedZellePage.current = currentPageZelle;
      cachedZelleItemsPerPage.current = itemsPerPage;
      
      setZellePayments(records as any);
      setZelleTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading Zelle payments:', error);
      setError('Failed to load Zelle payments');
    } finally {
      setLoadingZellePayments(false);
    }
  };

  // Funções para forçar recarregamento quando necessário

  const forceRefreshAll = () => {
    hasLoadedPayments.current = false;
    hasLoadedUniversities.current = false;
    hasLoadedUniversityRequests.current = false;
    hasLoadedZellePayments.current = false;
    
    if (user && user.role === 'admin') {
      loadPaymentData();
      loadUniversities();
      loadAffiliates();
      hasLoadedPayments.current = true;
      hasLoadedUniversities.current = true;
    }
    
    if (activeTab === 'university-requests') {
      loadUniversityPaymentRequests();
      hasLoadedUniversityRequests.current = true;
    } else if (activeTab === 'zelle-payments') {
      loadZellePayments();
      hasLoadedZellePayments.current = true;
    }
  };

  const approveUniversityRequest = async (id: string) => {
    if (!user?.id) {
      console.error('User not available for approveUniversityRequest');
      return;
    }
    try {
      await UniversityPaymentRequestService.adminApprove(id, user.id);
      await loadUniversityPaymentRequests();
      // Recarregar saldo do admin também
      await loadAdminBalance();
    } catch (error: any) {
      console.error('Error approving request:', error);
    }
  };

  const rejectUniversityRequest = async (id: string) => {
    if (!user?.id) {
      console.error('User not available for rejectUniversityRequest');
      return;
    }
    try {
      setActionLoading(true);
      await UniversityPaymentRequestService.adminReject(id, user.id, rejectReason);
      await loadUniversityPaymentRequests();
      // Recarregar saldo do admin também
      await loadAdminBalance();
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error: any) {
      console.error('Error rejecting request:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const markUniversityRequestAsPaid = async (id: string) => {
    if (!user?.id) {
      console.error('User not available for markUniversityRequestAsPaid');
      return;
    }
    try {
      setActionLoading(true);
      await UniversityPaymentRequestService.adminMarkPaid(id, user.id, paymentReference);
      await loadUniversityPaymentRequests();
      await loadAdminBalance();
      setShowMarkPaidModal(false);
      setPaymentReference('');
    } catch (error: any) {
      console.error('Error marking as paid:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const addAdminNotes = async (id: string) => {
    try {
      setActionLoading(true);
      await UniversityPaymentRequestService.adminAddNotes(id, adminNotes);
      await loadUniversityPaymentRequests();
      setShowAddNotesModal(false);
      setAdminNotes('');
    } catch (error: any) {
      console.error('Error adding notes:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePayment = async (data: {
    universityId: string;
    amount: number;
    payoutMethod: 'zelle' | 'bank_transfer' | 'stripe';
    payoutDetails: Record<string, any>;
  }) => {
    if (!user?.id) {
      console.error('User not available for createPayment');
      return;
    }
    try {
      setCreatingPayment(true);
      await UniversityPaymentRequestService.adminCreatePaymentRequest({
        universityId: data.universityId,
        adminId: user.id,
        amount: data.amount,
        payoutMethod: data.payoutMethod,
        payoutDetails: data.payoutDetails,
      });
      await loadUniversityPaymentRequests();
      await loadAdminBalance();
      setShowCreatePaymentModal(false);
    } catch (error: any) {
      console.error('Error creating payment request:', error);
      throw error;
    } finally {
      setCreatingPayment(false);
    }
  };

  

  const addZelleAdminNotes = async (paymentId: string) => {
    if (!user?.id) {
      console.error('User not available for addZelleAdminNotes');
      return;
    }
    try {
      setZelleActionLoading(true);
      
      const payment = zellePayments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Payment not found');

      // Atualizar as notas via serviço centralizado
      const { error } = await (await import('./PaymentManagement/data/services/zellePaymentsService')).addZelleAdminNotesService({
        paymentId,
        notes: zelleAdminNotes,
        adminUserId: user.id,
      });

      if (error) throw error;

      // Recarregar pagamentos Zelle
      await loadZellePayments();
      setShowZelleNotesModal(false);
      setZelleAdminNotes('');
      
    } catch (error: any) {
      console.error('Error adding Zelle payment notes:', error);
    } finally {
      setZelleActionLoading(false);
    }
  };


  const approveZellePayment = async (paymentId: string) => {
    if (!user?.id) {
      console.error('User not available for approveZellePayment');
      return;
    }
    try {
      setZelleActionLoading(true);
      const payment = zellePayments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Payment not found');

      const { approveZelleStatusService } = await import('./PaymentManagement/data/services/zellePaymentsService');
      const { error } = await approveZelleStatusService({ paymentId, adminUserId: user.id });
      if (error) throw error;
      
      const { approveZelleFlow } = await import('./PaymentManagement/data/services/zelleOrchestrator');
      await approveZelleFlow({ supabase, adminUserId: user.id, payment: {
        id: payment.id,
        user_id: payment.user_id || '',
        student_id: payment.student_id,
        student_email: payment.student_email,
        student_name: payment.student_name,
          fee_type: payment.fee_type,
        fee_type_global: payment.fee_type_global,
          amount: payment.amount,
        admin_approved_at: payment.admin_approved_at,
        created_at: payment.created_at,
        scholarships_ids: payment.scholarships_ids,
        scholarship_id: payment.scholarship_id || null,
      } });

      await loadZellePayments();
      setShowZelleReviewModal(false);
    } catch (error: any) {
      console.error('❌ [approveZellePayment] Error approving Zelle payment:', error);
    } finally {
      setZelleActionLoading(false);
    }
  };

  const rejectZellePayment = async (paymentId: string, reason?: string) => {
    if (!user?.id) {
      console.error('User not available for rejectZellePayment');
      return;
    }
    try {
      setZelleActionLoading(true);
      const payment = zellePayments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Payment not found');

      const { rejectZelleStatusService } = await import('./PaymentManagement/data/services/zellePaymentsService');
      const { error } = await rejectZelleStatusService({ paymentId, reason: reason || zelleRejectReason });
      if (error) throw error;

      const { rejectZelleFlow } = await import('./PaymentManagement/data/services/zelleOrchestrator');
      await rejectZelleFlow({ supabase, adminUserId: user.id, payment: {
        id: payment.id,
        user_id: payment.user_id || '',
        student_id: payment.student_id,
        student_email: payment.student_email,
        student_name: payment.student_name,
          fee_type: payment.fee_type,
        fee_type_global: payment.fee_type_global,
          amount: payment.amount,
        admin_approved_at: payment.admin_approved_at,
        created_at: payment.created_at,
        scholarships_ids: payment.scholarships_ids,
      }, reason: reason || zelleRejectReason });

      await loadZellePayments();
      setShowZelleReviewModal(false);
      setZelleRejectReason('');
    } catch (error: any) {
      console.error('❌ [rejectZellePayment] Error rejecting Zelle payment:', error);
    } finally {
      setZelleActionLoading(false);
    }
  };

  // Funções auxiliares para abrir modais
  const { openRejectModal, openMarkPaidModal, openAddNotesModal } = createUniversityUIHandlers({
    universityRequests,
    setSelectedRequest,
    setShowRejectModal,
    setShowMarkPaidModal,
    setShowAddNotesModal,
  });

  // Funções auxiliares para abrir modais de Zelle

  const { openZelleReviewModal, handleZelleReviewSuccess, openZelleNotesModal, openZelleProofModal } = createZelleUIHandlers({
    zellePayments,
    setSelectedZellePayment,
    setShowZelleReviewModal,
    setZelleAdminNotes,
    setShowZelleNotesModal,
    setSelectedZelleProofUrl,
    setSelectedZelleProofFileName,
    setShowZelleProofModal,
    onAfterReview: () => loadZellePayments(),
  });

  const { openAffiliateRejectModal, openAffiliateMarkPaidModal, openAffiliateNotesModal } = createAffiliateUIHandlers({
    setSelectedAffiliateRequest,
    setShowAffiliateRejectModal,
    setShowAffiliateMarkPaidModal,
    setAffiliateAdminNotes,
    setShowAffiliateNotesModal,
  });

  const loadPaymentData = async (backgroundRefresh: boolean = false) => {
    if (activeTab !== 'payments') {
      return;
    }
    try {
      // ✅ Se não for background refresh, mostrar skeleton
      if (!backgroundRefresh) {
        setLoading(true);
      }
      console.time('[payments] loadPaymentData');

      // ✅ OTIMIZADO: Usar versão batch otimizada
      const { applications, zellePayments, stripeUsers, overridesMap, userSystemTypesMap } = await loadPaymentsBaseDataOptimized(supabase as any);

      // NOTA: Pacotes não são mais usados para calcular taxas. Mantemos apenas overrides por usuário.
      const allUserIds = [
        ...(applications?.map(app => (app as any).user_profiles?.user_id).filter(Boolean) || []),
        ...(zellePayments?.map(payment => (payment as any).user_profiles?.user_id).filter(Boolean) || []),
        ...(stripeUsers?.map((user: any) => user.user_id).filter(Boolean) || [])
      ];
      const uniqueUserIds = [...new Set(allUserIds)];

      // ✅ OTIMIZADO: Buscar valores reais de pagamento em batch paralelo
      const batchSize = 50;
      const batches: string[][] = [];
      for (let i = 0; i < uniqueUserIds.length; i += batchSize) {
        batches.push(uniqueUserIds.slice(i, i + batchSize));
      }
      
      // Executar todas as queries em paralelo
      const batchPromises = batches.map(batch =>
        supabase
          .from('affiliate_referrals')
          .select('referred_id, payment_amount')
          .in('referred_id', batch)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      const allAffiliateReferrals = batchResults
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value.data || [])
        .flat()
        .filter(Boolean);

      // Criar mapa de valores reais por user_id
      const realPaymentAmounts = new Map<string, number>();
      allAffiliateReferrals?.forEach(ar => {
        realPaymentAmounts.set(ar.referred_id, ar.payment_amount);
      });

      // ✅ OTIMIZADO: Usar versão batch otimizada para payment dates
      const individualPaymentDates = await getPaymentDatesForUsersLoaderOptimized(supabase as any, uniqueUserIds);
 

      // Converter aplicações e pagamentos Zelle em registros de pagamento
      const base = transformPaymentsToRecordsAndStats({
        applications,
        zellePayments,
        stripeUsers,
        overridesMap,
        userSystemTypesMap,
        individualPaymentDates,
        getFeeAmount,
        realPaymentAmounts,
      });
      const paymentRecords: PaymentRecord[] = [...base.paymentRecords];
 

      // ✅ Salvar no cache
      cachedPayments.current = paymentRecords;
      cachedStats.current = base.stats;
      cacheTimestamp.current = Date.now();

      // Atualizar estado
      setPayments(paymentRecords);
      setStats(base.stats);

    } catch (error) {
      console.error('Error loading payment data:', error);
    } finally {
      console.timeEnd('[payments] loadPaymentData');
      setLoading(false);
    }
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('payment-view-mode', mode);
  };

  // Salvar preferência de itens por página
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset para primeira página
    localStorage.setItem('payment-items-per-page', newItemsPerPage.toString());
  };

  // Resetar para primeira página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.university, filters.feeType, filters.status, filters.dateFrom, filters.dateTo, filters.affiliate]);

  // Calcular paginação (usar utils de filtro/ordenação)
  const filteredPayments = filterPaymentsUtil(payments, filters as any, affiliates);
  const sortedPayments = sortPaymentsUtil(filteredPayments, sortBy, sortOrder);
  
  let totalPages = Math.ceil(sortedPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayments = backendTotalCount !== null
    ? payments // já paginado do backend
    : sortedPayments.slice(startIndex, endIndex);
  if (backendTotalCount !== null) {
    const total = backendTotalCount ?? payments.length;
    totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  }

  // Funções de navegação
  const goToPage = (page: number) => {
    setCurrentPage(pagingGoTo(page, totalPages));
  };

  const goToNextPage = () => {
    setCurrentPage(pagingNext(currentPage, totalPages));
  };

  const goToPreviousPage = () => {
    setCurrentPage(pagingPrev(currentPage));
  };

  const goToFirstPage = () => {
    setCurrentPage(pagingFirst());
  };

  const goToLastPage = () => {
    setCurrentPage(pagingLast(totalPages));
  };

  // Gerar array de páginas para exibição
  const getPageNumbers = () => getPageNumbersUtil(totalPages, currentPage, 5);

  const handleExport = async () => {
    try {
      await exportPaymentsToCsvViaEdge(filters as any);
    } catch (_) {
      try {
        downloadCsvFromPayments(sortedPayments as any);
      } catch (_) {}
    }
  };

  const handleViewDetails = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setShowDetails(true);
  };


  // resetFilters incorporado no PaymentsTab

  // Função para alterar ordenação
  const handleSort = (field: keyof PaymentRecord) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset para primeira página ao ordenar
  };

  // Funções para cálculos de totais
  const calculateSelectedTotals = () => calculateSelectedTotalsUtil(payments, selectedPayments);

  // Funções para seleção de linhas
  const handleSelectPayment = (paymentId: string) => {
    const newSelected = new Set(selectedPayments);
    if (newSelected.has(paymentId)) {
      newSelected.delete(paymentId);
    } else {
      newSelected.add(paymentId);
    }
    setSelectedPayments(newSelected);
    setSelectAll(newSelected.size === currentPayments.length && currentPayments.length > 0);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedPayments(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(currentPayments.map(payment => payment.id));
      setSelectedPayments(allIds);
      setSelectAll(true);
    }
  };

  // clearSelection incorporado no PaymentsTab

  // ✅ Só mostrar skeleton se não há dados em cache (primeira vez ou cache expirado)
  if (loading && payments.length === 0 && cachedPayments.current.length === 0) {
    return <PaymentManagementSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CreditCard className="text-blue-600" size={32} />
            Payment Management
          </h1>
          <p className="text-gray-600 mt-1">Monitor and manage all payments across the platform</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs activeTab={activeTab as any} setActiveTab={(t: any) => setActiveTab(t)} onRefresh={forceRefreshAll} />

      {/* Student Payments Tab Content */}
      {activeTab === 'payments' && (
        <PaymentsTab
          stats={stats}
          payments={payments}
          sortedPayments={sortedPayments}
          currentPayments={currentPayments}
          universities={universities}
          affiliates={affiliates}
          filters={filters}
          setFilters={(next: any) => { setFilters((prev: any) => ({ ...prev, ...next })); setCurrentPage(1); }}
          viewMode={viewMode}
          handleViewModeChange={handleViewModeChange}
          FEE_TYPES={FEE_TYPES}
          STATUS_OPTIONS={STATUS_OPTIONS}
          selectedPayments={selectedPayments}
          selectAll={selectAll}
          handleSelectAll={handleSelectAll}
          handleSelectPayment={handleSelectPayment}
          handleSort={handleSort}
          sortBy={sortBy}
          sortOrder={sortOrder}
          handleExport={handleExport}
          handleViewDetails={handleViewDetails}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          calculateSelectedTotals={calculateSelectedTotals}
          currentPage={currentPage}
          totalPages={totalPages}
          backendTotalCount={backendTotalCount}
          startIndex={startIndex}
          endIndex={endIndex}
          itemsPerPage={itemsPerPage}
          onFirst={goToFirstPage}
          onPrev={goToPreviousPage}
          onNext={goToNextPage}
          onLast={goToLastPage}
          onGoTo={goToPage}
          pageNumbers={getPageNumbers()}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {/* University Payment Requests Tab Content */}
      {activeTab === 'university-requests' && (
        <UniversityRequests
          universityRequests={universityRequests}
          loadingUniversityRequests={loadingUniversityRequests}
          adminBalance={adminBalance}
          loadingBalance={loadingBalance}
          universityRequestsViewMode={universityRequestsViewMode}
          setUniversityRequestsViewMode={setUniversityRequestsViewMode}
          setSelectedRequest={setSelectedRequest}
          setShowRequestDetails={setShowRequestDetails}
          approveUniversityRequest={approveUniversityRequest}
          openRejectModal={openRejectModal}
          openMarkPaidModal={openMarkPaidModal}
          onCreatePayment={() => setShowCreatePaymentModal(true)}
        />
      )}

      {/* Affiliate Payment Requests Tab */}
      {activeTab === 'affiliate-requests' && (
        <AffiliateRequests
          affiliateRequests={affiliateRequests}
          loadingAffiliateRequests={loadingAffiliateRequests}
          adminBalance={adminBalance}
          affiliateRequestsViewMode={universityRequestsViewMode}
          setAffiliateRequestsViewMode={setUniversityRequestsViewMode}
          setSelectedAffiliateRequest={setSelectedAffiliateRequest}
          setShowAffiliateDetails={setShowAffiliateDetails}
          affiliateActionLoading={affiliateActionLoading}
          approveAffiliateRequest={approveAffiliateRequest}
          openAffiliateRejectModal={openAffiliateRejectModal}
          openAffiliateMarkPaidModal={openAffiliateMarkPaidModal}
        />
      )}

      {/* University Request Details Modal */}
      <UniversityRequestDetailsModal
        isOpen={!!(showRequestDetails && selectedRequest)}
        selectedRequest={selectedRequest}
        onClose={() => setShowRequestDetails(false)}
        openAddNotesModal={openAddNotesModal}
        approveUniversityRequest={approveUniversityRequest}
        openRejectModal={openRejectModal}
        openMarkPaidModal={openMarkPaidModal}
      />

      {/* Zelle Payments Tab Content */}
      {activeTab === 'zelle-payments' && (
        <ZellePayments
          zellePayments={zellePayments}
          loadingZellePayments={loadingZellePayments}
          zelleViewMode={zelleViewMode}
          setZelleViewMode={setZelleViewMode}
          openZelleProofModal={openZelleProofModal}
          openZelleReviewModal={openZelleReviewModal}
          openZelleNotesModal={openZelleNotesModal}
          currentPage={currentPageZelle}
          totalPages={Math.max(1, Math.ceil(zelleTotalCount / itemsPerPage))}
          totalItems={zelleTotalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={(page: number) => { 
            setCurrentPageZelle(page); 
            loadZellePayments(); 
          }}
          onItemsPerPageChange={(newItemsPerPage: number) => {
            setItemsPerPage(newItemsPerPage);
            setCurrentPageZelle(1);
            loadZellePayments();
          }}
        />
      )}
      {/* Payment Details Modal */}

      {/* Reject Request Modal */}
      <RejectUniversityModal
        isOpen={!!(showRejectModal && selectedRequest)}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        onClose={() => setShowRejectModal(false)}
        onConfirm={() => selectedRequest && rejectUniversityRequest(selectedRequest.id)}
        loading={actionLoading}
      />

      {/* Mark as Paid Modal */}
      <MarkUniversityPaidModal
        isOpen={!!(showMarkPaidModal && selectedRequest)}
        reference={paymentReference}
        onReferenceChange={setPaymentReference}
        onClose={() => setShowMarkPaidModal(false)}
        onConfirm={() => selectedRequest && markUniversityRequestAsPaid(selectedRequest.id)}
        loading={actionLoading}
      />

      {/* Add Admin Notes Modal */}
      <UniversityAddNotesModal
        isOpen={!!(showAddNotesModal && selectedRequest)}
        notes={adminNotes}
        onNotesChange={setAdminNotes}
        onClose={() => setShowAddNotesModal(false)}
        onConfirm={() => selectedRequest && addAdminNotes(selectedRequest.id)}
        loading={actionLoading}
      />

      {/* Create University Payment Modal */}
      <CreateUniversityPaymentModal
        isOpen={showCreatePaymentModal}
        universities={universities}
        onClose={() => setShowCreatePaymentModal(false)}
        onSubmit={handleCreatePayment}
        loading={creatingPayment}
      />

      {/* Zelle Payment Review Modal */}
      {showZelleReviewModal && selectedZellePayment && user && (
        <ZellePaymentReviewModal
          isOpen={showZelleReviewModal}
          onClose={() => {
            setShowZelleReviewModal(false);
            setSelectedZellePayment(null);
          }}
          payment={{
            id: selectedZellePayment.id,
            user_id: selectedZellePayment.student_id,
            student_name: selectedZellePayment.student_name,
            student_email: selectedZellePayment.student_email,
            fee_type: selectedZellePayment.fee_type,
            amount: selectedZellePayment.amount,
            status: selectedZellePayment.zelle_status || 'pending_verification',
            payment_date: selectedZellePayment.payment_date,
            screenshot_url: selectedZellePayment.payment_proof_url,
            created_at: selectedZellePayment.created_at
          }}
          onSuccess={handleZelleReviewSuccess}
          adminId={user.id}
          onApprove={approveZellePayment}
          onReject={rejectZellePayment}
        />
      )}

      

      {/* Add Zelle Admin Notes Modal */}
      <ZelleAddNotesModal
        isOpen={!!(showZelleNotesModal && selectedZellePayment)}
        notes={zelleAdminNotes}
        onNotesChange={setZelleAdminNotes}
        onClose={() => setShowZelleNotesModal(false)}
        onConfirm={() => selectedZellePayment && addZelleAdminNotes(selectedZellePayment.id)}
        loading={zelleActionLoading}
      />





      {/* Affiliate Request Details Modal */}
      <AffiliateRequestDetailsModal
        isOpen={!!(showAffiliateDetails && selectedAffiliateRequest)}
        selectedRequest={selectedAffiliateRequest}
        onClose={() => setShowAffiliateDetails(false)}
        openAffiliateNotesModal={openAffiliateNotesModal}
        approveAffiliateRequest={approveAffiliateRequest}
        openAffiliateRejectModal={openAffiliateRejectModal}
        openAffiliateMarkPaidModal={openAffiliateMarkPaidModal}
      />

      {/* Affiliate Reject Modal */}
      <AffiliateRejectModal
        isOpen={!!(showAffiliateRejectModal && selectedAffiliateRequest)}
        reason={affiliateRejectReason}
        onReasonChange={setAffiliateRejectReason}
        onClose={() => setShowAffiliateRejectModal(false)}
        onConfirm={() => selectedAffiliateRequest && rejectAffiliateRequest(selectedAffiliateRequest.id)}
        loading={affiliateActionLoading}
      />

      {/* Affiliate Mark as Paid Modal */}
      <AffiliateMarkPaidModal
        isOpen={!!(showAffiliateMarkPaidModal && selectedAffiliateRequest)}
        reference={affiliatePaymentReference}
        onReferenceChange={setAffiliatePaymentReference}
        onClose={() => setShowAffiliateMarkPaidModal(false)}
        onConfirm={() => selectedAffiliateRequest && markAffiliateRequestPaid(selectedAffiliateRequest.id)}
        loading={affiliateActionLoading}
      />

      {/* Affiliate Add Admin Notes Modal */}
      <AffiliateAddNotesModal
        isOpen={!!(showAffiliateNotesModal && selectedAffiliateRequest)}
        notes={affiliateAdminNotes}
        onNotesChange={setAffiliateAdminNotes}
        onClose={() => setShowAffiliateNotesModal(false)}
        onConfirm={() => selectedAffiliateRequest && addAffiliateAdminNotes(selectedAffiliateRequest.id)}
        loading={affiliateActionLoading}
      />

      {/* Zelle Proof Modal */}
      {showZelleProofModal && selectedZelleProofUrl && (
        <DocumentViewerModal
          documentUrl={selectedZelleProofUrl}
          fileName={selectedZelleProofFileName}
          onClose={() => setShowZelleProofModal(false)}
        />
      )}

      {/* Payment Details Modal */}
      <PaymentDetailsModal
        open={showDetails}
        payment={selectedPayment}
        onClose={() => {
          setShowDetails(false);
          setSelectedPayment(null);
        }}
        FEE_TYPES={FEE_TYPES}
      />
    </div>
  );
};

export default PaymentManagement; 