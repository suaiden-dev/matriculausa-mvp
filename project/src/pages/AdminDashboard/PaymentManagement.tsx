import React, { useEffect, useState } from 'react';
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
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { 
  usePaymentsQuery, 
  useZellePaymentsQuery, 
  useUniversityRequestsQuery, 
  useAffiliateRequestsQuery,
  useUniversitiesQuery,
  useAffiliatesQuery
} from './PaymentManagement/hooks/usePaymentQueries';
import {
  useApproveZellePaymentMutation,
  useRejectZellePaymentMutation,
  useAddZelleNotesMutation,
  useApproveUniversityRequestMutation,
  useRejectUniversityRequestMutation,
  useMarkUniversityPaidMutation,
  useAddUniversityNotesMutation,
  useCreateUniversityPaymentMutation,
  useApproveAffiliateRequestMutation,
  useRejectAffiliateRequestMutation,
  useMarkAffiliatePaidMutation,
  useAddAffiliateNotesMutation,
} from './PaymentManagement/hooks/usePaymentMutations';
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
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false); // Começar como false, será atualizado pelos hooks
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
  // zelleTotalCount agora vem do React Query (zellePaymentsQuery.data?.count)

  // Estados para ordenação
  const [sortBy, setSortBy] = useState<keyof PaymentRecord>('payment_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Estados para modal de comprovante Zelle
  const [showZelleProofModal, setShowZelleProofModal] = useState(false);
  const [selectedZelleProofUrl, setSelectedZelleProofUrl] = useState<string>('');
  const [selectedZelleProofFileName, setSelectedZelleProofFileName] = useState<string>('');

  const { viewMode, setViewMode } = adminState;

  // React Query Hooks
  // Só carregar queries quando a aba correspondente estiver ativa
  const shouldLoadPayments = activeTab === 'payments' && (!filters?.university || filters.university === 'all');
  const shouldLoadZelle = activeTab === 'zelle-payments';
  const shouldLoadUniversityRequests = activeTab === 'university-requests';
  const shouldLoadAffiliateRequests = activeTab === 'affiliate-requests';
  
  const paymentsQuery = usePaymentsQuery(shouldLoadPayments);
  const zellePaymentsQuery = useZellePaymentsQuery(currentPageZelle, itemsPerPage, shouldLoadZelle);
  const universityRequestsQuery = useUniversityRequestsQuery(shouldLoadUniversityRequests);
  const affiliateRequestsQuery = useAffiliateRequestsQuery(shouldLoadAffiliateRequests);
  // Universities e Affiliates são sempre carregados (são referências usadas em filtros)
  const universitiesQuery = useUniversitiesQuery();
  const affiliatesQuery = useAffiliatesQuery();

  // Mutations
  const approveZelleMutation = useApproveZellePaymentMutation();
  const rejectZelleMutation = useRejectZellePaymentMutation();
  const addZelleNotesMutation = useAddZelleNotesMutation();
  const approveUniversityMutation = useApproveUniversityRequestMutation();
  const rejectUniversityMutation = useRejectUniversityRequestMutation();
  const markUniversityPaidMutation = useMarkUniversityPaidMutation();
  const addUniversityNotesMutation = useAddUniversityNotesMutation();
  const createUniversityPaymentMutation = useCreateUniversityPaymentMutation();
  const approveAffiliateMutation = useApproveAffiliateRequestMutation();
  const rejectAffiliateMutation = useRejectAffiliateRequestMutation();
  const markAffiliatePaidMutation = useMarkAffiliatePaidMutation();
  const addAffiliateNotesMutation = useAddAffiliateNotesMutation();

  // Extrair dados dos queries
  const universities = universitiesQuery.data || [];
  const affiliates = affiliatesQuery.data || [];
  const universityRequests = universityRequestsQuery.data || [];
  const affiliateRequests = affiliateRequestsQuery.data || [];
  const zellePayments = zellePaymentsQuery.data?.records || [];
  const zelleTotalCount = zellePaymentsQuery.data?.count || 0;
  const loadingZellePayments = zellePaymentsQuery.isLoading;
  const loadingUniversityRequests = universityRequestsQuery.isLoading;
  const loadingAffiliateRequests = affiliateRequestsQuery.isLoading;

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

  // Fallback: quando universidade = 'all', usar processamento client-side com React Query
  useEffect(() => {
    if (activeTab === 'payments') {
      if (!filters?.university || filters.university === 'all') {
      setBackendTotalCount(null);
      
        // React Query gerencia o cache automaticamente
        if (paymentsQuery.data) {
          setPayments(paymentsQuery.data.paymentRecords);
          setStats(paymentsQuery.data.stats);
        }
        // Quando query está habilitada (shouldLoadPayments = true), usar isLoading da query
        // Quando desabilitada, isLoading é false por padrão no React Query
        if (shouldLoadPayments) {
          setLoading(paymentsQuery.isLoading);
      } else {
          // Se não deve carregar, não está em loading
          setLoading(false);
        }
      }
      // Se university não é 'all', o usePaymentsBackendPagination gerencia o loading
          } else {
      // Quando não está na aba payments, não precisa de loading
      setLoading(false);
      if (activeTab !== 'payments') {
        setPayments([]);
      }
      }
  }, [activeTab, filters?.university, paymentsQuery.data, paymentsQuery.isLoading, shouldLoadPayments]);

  // Realtime updates for Affiliate Requests - invalidar query quando houver mudança
  useEffect(() => {
    if (activeTab !== 'affiliate-requests') return;
    const channel = supabase
      .channel('adm_affiliate_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_payment_requests' }, () => {
        // Invalidar query em vez de refetch direto (mais eficiente)
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.affiliateRequests.all });
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch (_) {}
    };
  }, [activeTab, queryClient]);

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

  // Funções legacy removidas - agora usando React Query hooks

  // Admin actions for Affiliate Requests - usando mutations
  const approveAffiliateRequest = async (id: string) => {
    if (!user?.id) {
      console.error('User not available for approveAffiliateRequest');
      return;
    }
    try {
      setAffiliateActionLoading(true);
      await approveAffiliateMutation.mutateAsync({ id, adminId: user.id });
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
      await rejectAffiliateMutation.mutateAsync({ id, adminId: user.id, reason: reason || affiliateRejectReason });
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
      await markAffiliatePaidMutation.mutateAsync({ id, adminId: user.id, reference: reference || affiliatePaymentReference });
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
      await addAffiliateNotesMutation.mutateAsync({ id, notes: affiliateAdminNotes });
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

  // Estado para controlar animação do botão refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Função para forçar recarregamento quando necessário - usando invalidateQueries para garantir atualização completa
  const forceRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      // Invalidar todas as queries de payments (incluindo todas as páginas de Zelle)
      // Isso força uma nova busca e atualiza todos os componentes que dependem dessas queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.references.universities }),
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.references.affiliates }),
      ]);
      
      // Aguardar as queries refetcharem após a invalidação
      await Promise.all([
        paymentsQuery.refetch(),
        universitiesQuery.refetch(),
        affiliatesQuery.refetch(),
        universityRequestsQuery.refetch(),
        affiliateRequestsQuery.refetch(),
        zellePaymentsQuery.refetch(),
      ]);
    } finally {
      // Pequeno delay para garantir que a animação seja visível
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  };

  const approveUniversityRequest = async (id: string) => {
    if (!user?.id) {
      console.error('User not available for approveUniversityRequest');
      return;
    }
    try {
      await approveUniversityMutation.mutateAsync({ id, adminId: user.id });
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
      await rejectUniversityMutation.mutateAsync({ id, adminId: user.id, reason: rejectReason });
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
      await markUniversityPaidMutation.mutateAsync({ id, adminId: user.id, reference: paymentReference });
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
      await addUniversityNotesMutation.mutateAsync({ id, notes: adminNotes });
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
      await createUniversityPaymentMutation.mutateAsync({
        universityId: data.universityId,
        adminId: user.id,
        amount: data.amount,
        payoutMethod: data.payoutMethod,
        payoutDetails: data.payoutDetails,
      });
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
      await addZelleNotesMutation.mutateAsync({ paymentId, notes: zelleAdminNotes, adminUserId: user.id });
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

      await approveZelleMutation.mutateAsync({ paymentId, adminUserId: user.id, payment });
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

      await rejectZelleMutation.mutateAsync({ paymentId, reason: reason || zelleRejectReason, adminUserId: user.id, payment });
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
    onAfterReview: () => zellePaymentsQuery.refetch(),
  });

  const { openAffiliateRejectModal, openAffiliateMarkPaidModal, openAffiliateNotesModal } = createAffiliateUIHandlers({
    setSelectedAffiliateRequest,
    setShowAffiliateRejectModal,
    setShowAffiliateMarkPaidModal,
    setAffiliateAdminNotes,
    setShowAffiliateNotesModal,
  });

  // Função loadPaymentData removida - agora usando usePaymentsQuery hook

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

  // ✅ Só mostrar skeleton se está carregando e não há dados E está na aba payments
  if (activeTab === 'payments' && loading && payments.length === 0) {
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
      <Tabs activeTab={activeTab as any} setActiveTab={(t: any) => setActiveTab(t)} onRefresh={forceRefreshAll} isRefreshing={isRefreshing} />

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
          }}
          onItemsPerPageChange={(newItemsPerPage: number) => {
            setItemsPerPage(newItemsPerPage);
            setCurrentPageZelle(1);
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