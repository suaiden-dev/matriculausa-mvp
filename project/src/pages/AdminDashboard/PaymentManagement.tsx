import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { UniversityPaymentRequestService, type UniversityPaymentRequest } from '../../services/UniversityPaymentRequestService';
import { AffiliatePaymentRequestService } from '../../services/AffiliatePaymentRequestService';
import { formatCentsToDollars } from '../../utils/currency';
import { 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  CreditCard,
  Building2,
  User,
  DollarSign,
  TrendingUp,
  AlertCircle,
  List,
  Grid3X3,
  Clock,
  CheckCircle2,
  Shield,
  MessageSquare,
  Edit
} from 'lucide-react';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import ZellePaymentReviewModal from '../../components/ZellePaymentReviewModal';
import { generateTermAcceptancePDFBlob, StudentTermAcceptanceData } from '../../utils/pdfGenerator';

// Function to send term acceptance notification with PDF after successful payment
const sendTermAcceptanceNotificationAfterPayment = async (userId: string, feeType: string) => {
  try {
    console.log('[NOTIFICAÇÃO] Buscando dados do usuário para notificação...');
    
    // Get user profile data
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('email, full_name, country, seller_referral_code')
      .eq('user_id', userId)
      .single();

    if (userError || !userProfile) {
      console.error('[NOTIFICAÇÃO] Erro ao buscar perfil do usuário:', userError);
      return;
    }

    // Get the most recent term acceptance for this user
    const { data: termAcceptance, error: termError } = await supabase
      .from('comprehensive_term_acceptance')
      .select('term_id, accepted_at, ip_address, user_agent')
      .eq('user_id', userId)
      .eq('term_type', 'checkout_terms')
      .order('accepted_at', { ascending: false })
      .limit(1)
      .single();

    if (termError || !termAcceptance) {
      console.error('[NOTIFICAÇÃO] Erro ao buscar aceitação de termos:', termError);
      return;
    }

    // Get term content
    const { data: termData, error: termDataError } = await supabase
      .from('application_terms')
      .select('title, content')
      .eq('id', termAcceptance.term_id)
      .single();

    if (termDataError || !termData) {
      console.error('[NOTIFICAÇÃO] Erro ao buscar conteúdo do termo:', termDataError);
      return;
    }

    // Get seller data if user has seller_referral_code
    let sellerData = null;
    if (userProfile.seller_referral_code) {
      const { data: sellerResult } = await supabase
        .from('sellers')
        .select('name, email, referral_code, user_id, affiliate_admin_id')
        .eq('referral_code', userProfile.seller_referral_code)
        .single();
      
      if (sellerResult) {
        sellerData = sellerResult;
      }
    }

    // Get affiliate admin data if seller has affiliate_admin_id
    let affiliateAdminData = null;
    if (sellerData?.affiliate_admin_id) {
      console.log('[NOTIFICAÇÃO] Buscando affiliate admin com ID:', sellerData.affiliate_admin_id);
      
      // First get the affiliate admin to get the user_id
      const { data: affiliateResult, error: affiliateError } = await supabase
        .from('affiliate_admins')
        .select('user_id')
        .eq('id', sellerData.affiliate_admin_id)
        .single();
      
      if (affiliateError) {
        console.error('[NOTIFICAÇÃO] Erro ao buscar affiliate admin:', affiliateError);
      } else if (affiliateResult?.user_id) {
        // Then get the user profile data
        const { data: userProfileResult, error: userProfileError } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('user_id', affiliateResult.user_id)
          .single();
        
        if (userProfileError) {
          console.error('[NOTIFICAÇÃO] Erro ao buscar user profile do affiliate admin:', userProfileError);
        } else if (userProfileResult) {
          affiliateAdminData = {
            full_name: userProfileResult.full_name,
            email: userProfileResult.email
          };
          console.log('[NOTIFICAÇÃO] Dados do affiliate admin carregados:', affiliateAdminData);
        }
      }
    }

    // Generate PDF for the term acceptance
    let pdfBlob: Blob | null = null;
    try {
      console.log('[NOTIFICAÇÃO] Gerando PDF para notificação...');
      
      // Prepare data for PDF generation
      const pdfData: StudentTermAcceptanceData = {
        student_name: userProfile.full_name,
        student_email: userProfile.email,
        term_title: termData.title,
        accepted_at: termAcceptance.accepted_at,
        ip_address: termAcceptance.ip_address || 'N/A',
        user_agent: termAcceptance.user_agent || 'N/A',
        country: userProfile.country || 'N/A',
        affiliate_code: sellerData?.referral_code || 'N/A',
        term_content: termData.content || ''
      };

      // Generate PDF blob
      pdfBlob = generateTermAcceptancePDFBlob(pdfData);
      console.log('[NOTIFICAÇÃO] PDF gerado com sucesso!');
    } catch (pdfError) {
      console.error('[NOTIFICAÇÃO] Erro ao gerar PDF:', pdfError);
      // Don't continue without PDF as it's required for this notification
      throw new Error('Failed to generate PDF for term acceptance notification');
    }

    // Prepare notification payload
    const webhookPayload = {
      tipo_notf: "Student Term Acceptance",
      email_admin: "admin@matriculausa.com",
      nome_admin: "Admin MatriculaUSA",
      email_aluno: userProfile.email,
      nome_aluno: userProfile.full_name,
      email_seller: sellerData?.email || "",
      nome_seller: sellerData?.name || "N/A",
      email_affiliate_admin: affiliateAdminData?.email || "",
      nome_affiliate_admin: affiliateAdminData?.full_name || "N/A",
      o_que_enviar: `Student ${userProfile.full_name} has accepted the ${termData.title} and completed ${feeType} payment via Zelle (manually approved). This shows the student is progressing through the enrollment process.`,
      term_title: termData.title,
      term_type: 'checkout_terms',
      accepted_at: termAcceptance.accepted_at,
      ip_address: termAcceptance.ip_address,
      student_country: userProfile.country,
      seller_id: sellerData?.user_id || "",
      referral_code: sellerData?.referral_code || "",
      affiliate_admin_id: sellerData?.affiliate_admin_id || ""
    };

    console.log('[NOTIFICAÇÃO] Enviando webhook com payload:', webhookPayload);

    // Send webhook notification with PDF (always required for term acceptance)
    if (!pdfBlob) {
      throw new Error('PDF is required for term acceptance notification but was not generated');
    }

    const formData = new FormData();
    
    // Add each field individually for n8n to process correctly
    Object.entries(webhookPayload).forEach(([key, value]) => {
      formData.append(key, value !== null && value !== undefined ? value.toString() : '');
    });

    // Add PDF with descriptive filename
    const fileName = `term_acceptance_${userProfile.full_name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
    formData.append('pdf', pdfBlob, fileName);
    console.log('[NOTIFICAÇÃO] PDF anexado à notificação:', fileName);

    const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
      method: 'POST',
      body: formData,
    });

    if (webhookResponse.ok) {
      console.log('[NOTIFICAÇÃO] Notificação enviada com sucesso!');
    } else {
      const errorText = await webhookResponse.text();
      console.warn('[NOTIFICAÇÃO] Erro ao enviar notificação:', webhookResponse.status, errorText);
    }

  } catch (error) {
    console.error('[NOTIFICAÇÃO] Erro ao enviar notificação de aceitação de termos:', error);
    // Don't throw error to avoid breaking the payment process
  }
};

interface PaymentRecord {
  id: string;
  student_id: string;
  user_id?: string; // ID do usuário na tabela zelle_payments
  student_name: string;
  student_email: string;
  university_id: string;
  university_name: string;
  scholarship_id?: string;
  scholarship_title?: string;
  fee_type: 'selection_process' | 'application' | 'scholarship' | 'i20_control_fee' | 'application_fee' | 'scholarship_fee';
  fee_type_global?: string; // Campo usado na tabela zelle_payments
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  payment_date?: string;
  stripe_session_id?: string;
  created_at: string;
  // Novos campos para Zelle
  payment_method?: 'stripe' | 'zelle' | 'manual';
  payment_proof_url?: string;
  admin_notes?: string;
  zelle_status?: 'pending_verification' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
}

interface PaymentStats {
  totalRevenue: number;
  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;
  monthlyGrowth: number;
}

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
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    totalPayments: 0,
    paidPayments: 0,
    pendingPayments: 0,
    monthlyGrowth: 0
  });

  // Filtros - Padrão: mostrar apenas pagamentos aprovados
  const [filters, setFilters] = useState({
    search: '',
    university: 'all',
    feeType: 'all',
    status: 'paid', // Padrão: mostrar apenas pagamentos aprovados
    dateFrom: '',
    dateTo: ''
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Estados para University Payment Requests
  const [activeTab, setActiveTab] = useState<'payments' | 'university-requests' | 'affiliate-requests' | 'zelle-payments'>('payments');
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

  // Estados para modais de Zelle
  const [showZelleNotesModal, setShowZelleNotesModal] = useState(false);
  const [showZelleReviewModal, setShowZelleReviewModal] = useState(false);
  const [zelleAdminNotes, setZelleAdminNotes] = useState('');
  const [zelleActionLoading, setZelleActionLoading] = useState(false);
  const [zelleRejectReason, setZelleRejectReason] = useState('');

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20); // 20 itens por página para melhor visualização

  // Estados para ordenação
  const [sortBy, setSortBy] = useState<keyof PaymentRecord>('created_at');
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

  // Estados para modal de edição de scholarship_id do pagamento Zelle
  const [showZelleEditModal, setShowZelleEditModal] = useState(false);
  const [selectedZellePaymentForEdit, setSelectedZellePaymentForEdit] = useState<PaymentRecord | null>(null);
  const [availableScholarships, setAvailableScholarships] = useState<any[]>([]);
  const [selectedScholarshipId, setSelectedScholarshipId] = useState<string>('');
  const [editingZellePayment, setEditingZellePayment] = useState(false);

  useEffect(() => {
    if (user && user.role === 'admin') {
      if (!hasLoadedPayments.current) {
        loadPaymentData();
        hasLoadedPayments.current = true;
      }
      if (!hasLoadedUniversities.current) {
        loadUniversities();
        hasLoadedUniversities.current = true;
      }
    }
  }, [user]);

  // Silenciar logs de debug enquanto esta página estiver montada
  useEffect(() => {
    const originalLog = console.log;
    // Evitar spam no console: desabilita logs desta página
    console.log = (..._args: any[]) => {};
    return () => {
      console.log = originalLog;
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'university-requests' && !hasLoadedUniversityRequests.current) {
      loadUniversityPaymentRequests();
      hasLoadedUniversityRequests.current = true;
    } else if (activeTab === 'affiliate-requests' && !hasLoadedAffiliateRequests.current) {
      loadAffiliateRequests();
      hasLoadedAffiliateRequests.current = true;
    } else if (activeTab === 'zelle-payments' && !hasLoadedZellePayments.current) {
      loadZellePayments();
      hasLoadedZellePayments.current = true;
    }
  }, [activeTab]);

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

  // Carregar preferência de itens por página
  useEffect(() => {
    const saved = localStorage.getItem('payment-items-per-page');
    if (saved) {
      const items = Number(saved);
      if ([10, 20, 50, 100].includes(items)) {
        setItemsPerPage(items);
      }
    }
  }, []);

  const loadUniversities = async () => {
    try {
      const { data, error } = await supabase
        .from('universities')
        .select('id, name')
        .eq('is_approved', true)
        .order('name');

      if (error) throw error;
      setUniversities(data || []);
    } catch (error) {
      console.error('Error loading universities:', error);
    }
  };

  const loadUniversityPaymentRequests = async () => {
    try {
      setLoadingUniversityRequests(true);
      const data = await UniversityPaymentRequestService.listAllPaymentRequests();
      setUniversityRequests(data);
    } catch (error: any) {
      console.error('Error loading university payment requests:', error);
    } finally {
      setLoadingUniversityRequests(false);
    }
  };

  const loadAffiliateRequests = async () => {
    try {
      setLoadingAffiliateRequests(true);
      const data = await AffiliatePaymentRequestService.listAllPaymentRequests();
      setAffiliateRequests(data);
    } catch (error: any) {
      console.error('Error loading affiliate payment requests (admin):', error);
      setAffiliateRequests([]);
    } finally {
      setLoadingAffiliateRequests(false);
    }
  };

  // Admin actions for Affiliate Requests
  const approveAffiliateRequest = async (id: string) => {
    try {
      setAffiliateActionLoading(true);
      await AffiliatePaymentRequestService.adminApprove(id, user!.id);
      await loadAffiliateRequests();
    } catch (error) {
      console.error('Error approving affiliate request:', error);
    } finally {
      setAffiliateActionLoading(false);
    }
  };

  const rejectAffiliateRequest = async (id: string, reason?: string) => {
    try {
      setAffiliateActionLoading(true);
      await AffiliatePaymentRequestService.adminReject(id, user!.id, reason || affiliateRejectReason);
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
    try {
      setAffiliateActionLoading(true);
      await AffiliatePaymentRequestService.adminMarkPaid(id, user!.id, reference || affiliatePaymentReference);
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

  // Helper functions for affiliate modals
  const openAffiliateRejectModal = (request: any) => {
    setSelectedAffiliateRequest(request);
    setShowAffiliateRejectModal(true);
  };

  const openAffiliateMarkPaidModal = (request: any) => {
    setSelectedAffiliateRequest(request);
    setShowAffiliateMarkPaidModal(true);
  };

  const openAffiliateNotesModal = (request: any) => {
    setSelectedAffiliateRequest(request);
    setAffiliateAdminNotes(request.admin_notes || '');
    setShowAffiliateNotesModal(true);
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

  const loadZellePayments = async () => {
    try {
      setLoadingZellePayments(true);
      console.log('🔍 Loading Zelle payments...');

      // Buscar pagamentos Zelle sem join, filtrando apenas registros com valores > 0
      const { data: zellePaymentsData, error: zelleError } = await supabase
        .from('zelle_payments')
        .select('*')
        .gt('amount', 0)
        .order('created_at', { ascending: false });

      if (zelleError) {
        console.error('Error in zelle payments query:', zelleError);
        throw zelleError;
      }

      console.log('📊 Zelle payments data:', zellePaymentsData);

      // Converter pagamentos Zelle em registros de pagamento
      const zellePaymentRecords: PaymentRecord[] = [];
      
      if (zellePaymentsData && zellePaymentsData.length > 0) {
        // Buscar dados dos usuários em uma única consulta
        const userIds = zellePaymentsData.map(p => p.user_id).filter(Boolean);
        const studentProfileIds = zellePaymentsData.map(p => p.student_profile_id).filter(Boolean);
        const allUserIds = [...new Set([...userIds, ...studentProfileIds])];

        console.log('🔍 User IDs to fetch:', allUserIds);

        let userProfiles: any[] = [];
        if (allUserIds.length > 0) {
          // Buscar por user_id (que corresponde ao auth.users.id) e também por id (que é o user_profiles.id)
          // Incluir também informações da universidade
          const { data: profilesData, error: profilesError } = await supabase
            .from('user_profiles')
            .select('id, user_id, full_name, email, university_id')
            .in('user_id', allUserIds);

          if (profilesError) {
            console.error('Error loading user profiles:', profilesError);
          } else {
            userProfiles = profilesData || [];
            console.log('👥 User profiles loaded:', userProfiles);
          }
        }

        // Processar cada pagamento Zelle
        zellePaymentsData.forEach((zellePayment: any) => {          
          // Buscar o perfil do usuário pelo user_id (auth.users.id)
          const student = userProfiles.find(p => p.user_id === zellePayment.user_id);
          
          // Determinar o nome do estudante (usar email se full_name for igual ao email ou estiver vazio)
          const studentName = student?.full_name && student.full_name !== student?.email 
            ? student.full_name 
            : student?.email || 'Unknown User';
         
          const paymentRecord: PaymentRecord = {
            id: zellePayment.id,
            student_id: student?.id || zellePayment.student_profile_id || '',
            user_id: zellePayment.user_id, // Campo necessário para a função approveZellePayment
            student_name: studentName,
            student_email: student?.email || 'Email not available',
            university_id: student?.university_id || '',
            university_name: 'N/A', // TODO: Implementar busca de universidade separadamente
            fee_type: zellePayment.fee_type || 'selection_process',
            fee_type_global: zellePayment.fee_type_global, // Campo necessário para a função approveZellePayment
            amount: parseFloat(zellePayment.amount) || 0,
            status: 'pending',
            payment_date: zellePayment.created_at,
            created_at: zellePayment.created_at,
            payment_method: 'zelle',
            payment_proof_url: zellePayment.screenshot_url,
            admin_notes: zellePayment.admin_notes,
            zelle_status: zellePayment.status,
            reviewed_by: zellePayment.admin_approved_by,
            reviewed_at: zellePayment.admin_approved_at
          };

          zellePaymentRecords.push(paymentRecord);
        });
      }

      setZellePayments(zellePaymentRecords);
      console.log('✅ Zelle payments loaded:', zellePaymentRecords.length);
    } catch (error) {
      console.error('❌ Error loading Zelle payments:', error);
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
    try {
      await UniversityPaymentRequestService.adminApprove(id, user!.id);
      await loadUniversityPaymentRequests();
      // Recarregar saldo do admin também
      await loadAdminBalance();
    } catch (error: any) {
      console.error('Error approving request:', error);
    }
  };

  const rejectUniversityRequest = async (id: string) => {
    try {
      setActionLoading(true);
      await UniversityPaymentRequestService.adminReject(id, user!.id, rejectReason);
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
    try {
      setActionLoading(true);
      await UniversityPaymentRequestService.adminMarkPaid(id, user!.id, paymentReference);
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

  // Funções para Zelle Payments - Legacy (removidas, usando novo modal)

  const addZelleAdminNotes = async (paymentId: string) => {
    try {
      setZelleActionLoading(true);
      
      const payment = zellePayments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Payment not found');

      // Atualizar as notas do admin na tabela zelle_payments
      const { error } = await supabase
        .from('zelle_payments')
        .update({
          admin_notes: zelleAdminNotes,
          admin_approved_by: user!.id,
          admin_approved_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;

      // Recarregar pagamentos Zelle
      await loadZellePayments();
      setShowZelleNotesModal(false);
      setZelleAdminNotes('');
      
      console.log('📝 Zelle payment notes added successfully');
    } catch (error: any) {
      console.error('Error adding Zelle payment notes:', error);
    } finally {
      setZelleActionLoading(false);
    }
  };

  const approveZellePayment = async (paymentId: string) => {
    try {
      setZelleActionLoading(true);
      const payment = zellePayments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Payment not found');
      console.log('🔍 [approveZellePayment] Aprovando pagamento:', payment);

      // Resolução de scholarship_id será feita apenas quando necessário
      // para tipos application_fee/scholarship_fee mais abaixo.

      // Atualizar o status do pagamento para aprovado
      const { error } = await supabase
        .from('zelle_payments')
        .update({
          status: 'approved',
          admin_approved_by: user!.id,
          admin_approved_at: new Date().toISOString(),
        })
        .eq('id', paymentId);
      if (error) throw error;

      // ...existing code...
      
      if (payment.fee_type_global === 'selection_process') {
        console.log('🎯 [approveZellePayment] Entrando na condição selection_process');
        console.log('🔍 [approveZellePayment] Executando UPDATE user_profiles SET has_paid_selection_process_fee = true WHERE user_id =', payment.user_id);
        
        // Marcar no user_profiles
        const { data: updateData, error: profileError } = await supabase
          .from('user_profiles')
          .update({ 
            has_paid_selection_process_fee: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', payment.user_id)
          .select();

        console.log('🔍 [approveZellePayment] Resultado da atualização:', { updateData, profileError });

        if (profileError) {
          console.error('❌ [approveZellePayment] Erro ao marcar selection_process_fee:', profileError);
        } else {
          console.log('✅ [approveZellePayment] has_paid_selection_process_fee marcado como true');
          console.log('🔍 [approveZellePayment] Dados atualizados:', updateData);
          
          // Buscar valor dinâmico correto baseado no pacote do usuário
          console.log('💰 [approveZellePayment] Buscando valor dinâmico correto...');
          let correctAmount = payment.amount; // Valor padrão
          
          try {
            // Buscar taxas do pacote do usuário
            const { data: userPackageFees, error: packageError } = await supabase.rpc('get_user_package_fees', {
              user_id_param: payment.user_id
            });
            
            if (!packageError && userPackageFees && userPackageFees.length > 0) {
              const packageFees = userPackageFees[0];
              correctAmount = packageFees.selection_process_fee;
              console.log('✅ [approveZellePayment] Valor dinâmico encontrado:', correctAmount, 'Pacote:', packageFees.package_name);
            } else {
              console.log('ℹ️ [approveZellePayment] Usuário sem pacote, usando valor padrão:', correctAmount);
            }
          } catch (error) {
            console.warn('⚠️ [approveZellePayment] Erro ao buscar valor dinâmico, usando valor padrão:', error);
          }

          // Registrar no faturamento com valor correto
          console.log('💰 [approveZellePayment] Registrando selection_process no faturamento com valor:', correctAmount);
          const { error: billingError } = await supabase.rpc('register_payment_billing', {
            user_id_param: payment.user_id,
            fee_type_param: 'selection_process',
            amount_param: correctAmount,
            payment_session_id_param: `zelle_${payment.id}`,
            payment_method_param: 'zelle'
          });
          
          if (billingError) {
            console.error('❌ [approveZellePayment] Erro ao registrar faturamento:', billingError);
          } else {
            console.log('✅ [approveZellePayment] Faturamento registrado com sucesso');
            
            // PROCESSAR MATRICULA REWARDS - Selection Process Fee
            console.log('🎁 [approveZellePayment] Processando Matricula Rewards para Selection Process Fee...');
            console.log('🎁 [approveZellePayment] payment.user_id para Matricula Rewards:', payment.user_id);
            try {
              // Buscar o perfil do usuário para verificar se tem código de referência
              console.log('🎁 [approveZellePayment] Buscando perfil do usuário...');
              const { data: userProfile, error: profileError } = await supabase
                .from('user_profiles')
                .select('referral_code_used')
                .eq('user_id', payment.user_id)
                .single();

              console.log('🎁 [approveZellePayment] Resultado da busca do perfil:', { userProfile, profileError });

              if (profileError) {
                console.error('❌ [approveZellePayment] Erro ao buscar perfil do usuário:', profileError);
              } else if (userProfile?.referral_code_used) {
                console.log('🎁 [approveZellePayment] Usuário tem código de referência:', userProfile.referral_code_used);
                
                // Buscar o dono do código de referência na tabela affiliate_codes
                console.log('🎁 [approveZellePayment] Buscando dono do código na tabela affiliate_codes...');
                const { data: affiliateCode, error: affiliateError } = await supabase
                  .from('affiliate_codes')
                  .select('user_id, code')
                  .eq('code', userProfile.referral_code_used)
                  .eq('is_active', true)
                  .single();

                console.log('🎁 [approveZellePayment] Resultado da busca do dono do código:', { affiliateCode, affiliateError });

                if (affiliateError) {
                  console.error('❌ [approveZellePayment] Erro ao buscar dono do código de referência:', affiliateError);
                } else if (affiliateCode && affiliateCode.user_id !== payment.user_id) {
                  console.log('🎁 [approveZellePayment] Dono do código encontrado:', affiliateCode.user_id);
                  console.log('🎁 [approveZellePayment] Verificando se não é auto-referência:', {
                    affiliateUserId: affiliateCode.user_id,
                    paymentUserId: payment.user_id,
                    isDifferent: affiliateCode.user_id !== payment.user_id
                  });
                  
                  // Dar 180 coins para o dono do código
                  console.log('🎁 [approveZellePayment] Chamando add_coins_to_user_matricula...');
                  
                  // Buscar nome do usuário que pagou
                  const { data: referredUserProfile } = await supabase
                    .from('user_profiles')
                    .select('full_name, email')
                    .eq('user_id', payment.user_id)
                    .single();
                  
                  const referredDisplayName = referredUserProfile?.full_name || referredUserProfile?.email || payment.user_id;
                  
                  const { data: coinsResult, error: coinsError } = await supabase.rpc('add_coins_to_user_matricula', {
                    user_id_param: affiliateCode.user_id,
                    coins_to_add: 180,
                    reason: `Referral reward: Selection Process Fee paid by ${referredDisplayName}`
                  });

                  console.log('🎁 [approveZellePayment] Resultado do add_coins_to_user:', { coinsResult, coinsError });

                  if (coinsError) {
                    console.error('❌ [approveZellePayment] Erro ao adicionar coins:', coinsError);
                  } else {
                    console.log('✅ [approveZellePayment] 180 coins adicionados para o dono do código de referência');
                    console.log('✅ [approveZellePayment] Resultado:', coinsResult);
                    
                    // Enviar notificação de coins para o dono do código
                    try {
                      console.log('📧 [approveZellePayment] Enviando notificação de coins...');
                      
                      // Buscar dados do dono do código
                      const { data: referrerProfile } = await supabase
                        .from('user_profiles')
                        .select('full_name, email')
                        .eq('user_id', affiliateCode.user_id)
                        .single();
                      
                      const referrerName = referrerProfile?.full_name || referrerProfile?.email || 'Unknown User';
                      const referrerEmail = referrerProfile?.email || '';
                      
                      // Enviar webhook de notificação
                      const webhookUrl = 'https://nwh.suaiden.com/webhook/notfmatriculausa';
                      const mensagem = `Você recebeu 180 MatriculaCoins como recompensa por indicação! O aluno ${referredDisplayName} pagou a taxa de Selection Process Fee via Zelle (aprovado pelo admin) usando seu código de referência.`;
                      
                      const notificationPayload = {
                        tipo_notf: 'Recompensa de MatriculaCoins por Indicação',
                        email_aluno: referrerEmail,
                        nome_aluno: referrerName,
                        o_que_enviar: mensagem,
                        coins_amount: 180,
                        referred_student_name: referredDisplayName,
                        referred_student_email: referredUserProfile?.email || '',
                        payment_method: 'zelle_admin',
                        fee_type: 'selection_process',
                        reward_type: 'referral'
                      };
                      
                      const webhookResponse = await fetch(webhookUrl, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'User-Agent': 'MatriculaUSA/1.0'
                        },
                        body: JSON.stringify(notificationPayload)
                      });
                        
                        if (webhookResponse.ok) {
                          console.log('✅ [approveZellePayment] Notificação de coins enviada com sucesso!');
                        } else {
                          console.error('❌ [approveZellePayment] Erro ao enviar notificação de coins:', webhookResponse.status);
                        }
                    } catch (notificationError) {
                      console.error('❌ [approveZellePayment] Erro ao enviar notificação de coins:', notificationError);
                    }
                  }
                } else {
                  console.log('ℹ️ [approveZellePayment] Nenhum dono do código de referência encontrado ou é o próprio usuário');
                  console.log('ℹ️ [approveZellePayment] Detalhes:', {
                    affiliateCode: !!affiliateCode,
                    affiliateUserId: affiliateCode?.user_id,
                    paymentUserId: payment.user_id,
                    isSameUser: affiliateCode?.user_id === payment.user_id
                  });
                }
              } else {
                console.log('ℹ️ [approveZellePayment] Usuário não tem código de referência Matricula Rewards');
                console.log('ℹ️ [approveZellePayment] userProfile.referral_code_used:', userProfile?.referral_code_used);
              }
            } catch (rewardsError) {
              console.error('❌ [approveZellePayment] Erro ao processar Matricula Rewards:', rewardsError);
            }
          }
        }
      } else {
        console.log('⚠️ [approveZellePayment] fee_type_global não é selection_process:', payment.fee_type_global);
      }

      console.log('🔍 [approveZellePayment] Verificando condição I-20 Control Fee...');
      console.log('🔍 [approveZellePayment] payment.fee_type_global === "i-20_control_fee":', payment.fee_type_global === 'i-20_control_fee');
      
      if (payment.fee_type_global === 'i-20_control_fee') {
        console.log('🎯 [approveZellePayment] Entrando na condição i20_control_fee');
        console.log('🔍 [approveZellePayment] Executando UPDATE user_profiles SET has_paid_i20_control_fee = true WHERE user_id =', payment.user_id);
        
        // Marcar no user_profiles
        const { data: updateData, error: profileError } = await supabase
          .from('user_profiles')
          .update({ 
            has_paid_i20_control_fee: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', payment.user_id)
          .select();

        console.log('🔍 [approveZellePayment] Resultado da atualização i20_control_fee:', { updateData, profileError });

        if (profileError) {
          console.error('❌ [approveZellePayment] Erro ao marcar i20_control_fee:', profileError);
        } else {
          console.log('✅ [approveZellePayment] has_paid_i20_control_fee marcado como true');
          console.log('🔍 [approveZellePayment] Dados atualizados i20_control_fee:', updateData);
          
          // Buscar valor dinâmico correto baseado no pacote do usuário
          console.log('💰 [approveZellePayment] Buscando valor dinâmico correto para i20_control_fee...');
          let correctAmount = payment.amount; // Valor padrão
          
          try {
            // Buscar taxas do pacote do usuário
            const { data: userPackageFees, error: packageError } = await supabase.rpc('get_user_package_fees', {
              user_id_param: payment.user_id
            });
            
            if (!packageError && userPackageFees && userPackageFees.length > 0) {
              const packageFees = userPackageFees[0];
              correctAmount = packageFees.i20_control_fee;
              console.log('✅ [approveZellePayment] Valor dinâmico encontrado para i20_control_fee:', correctAmount, 'Pacote:', packageFees.package_name);
            } else {
              console.log('ℹ️ [approveZellePayment] Usuário sem pacote, usando valor padrão para i20_control_fee:', correctAmount);
            }
          } catch (error) {
            console.warn('⚠️ [approveZellePayment] Erro ao buscar valor dinâmico para i20_control_fee, usando valor padrão:', error);
          }

          // Registrar no faturamento com valor correto
          console.log('💰 [approveZellePayment] Registrando i20_control_fee no faturamento com valor:', correctAmount);
          const { error: billingError } = await supabase.rpc('register_payment_billing', {
            user_id_param: payment.user_id,
            fee_type_param: 'i20_control_fee',
            amount_param: correctAmount,
            payment_session_id_param: `zelle_${payment.id}`,
            payment_method_param: 'zelle'
          });
          
          if (billingError) {
            console.error('❌ [approveZellePayment] Erro ao registrar faturamento:', billingError);
          } else {
            console.log('✅ [approveZellePayment] Faturamento registrado com sucesso');
          }
        }
      }

      if (payment.fee_type === 'application_fee' || payment.fee_type === 'scholarship_fee') {
        console.log('🎯 [approveZellePayment] Entrando na condição scholarship_applications');
        console.log('🔍 [approveZellePayment] fee_type:', payment.fee_type);
        
        // Buscar informações do pagamento Zelle para verificar scholarship_id específico
        const { data: zellePaymentData, error: zelleError } = await supabase
          .from('zelle_payments')
          .select('scholarships_ids')
          .eq('id', paymentId)
          .single();

        if (zelleError) {
          console.error('❌ [approveZellePayment] Erro ao buscar dados do pagamento Zelle:', zelleError);
          throw new Error('Erro ao buscar informações do pagamento');
        }

        let targetScholarshipId = null;
        
        // Verificar se há scholarship_id específico no pagamento
        if (zellePaymentData?.scholarships_ids && Array.isArray(zellePaymentData.scholarships_ids) && zellePaymentData.scholarships_ids.length > 0) {
          targetScholarshipId = zellePaymentData.scholarships_ids[0];
          console.log('🎯 [approveZellePayment] Scholarship ID específico encontrado:', targetScholarshipId);
        } else {
          console.warn('⚠️ [approveZellePayment] ATENÇÃO: Pagamento Zelle não possui scholarship_id específico!');
          console.log('🔍 [approveZellePayment] Buscando aplicações do estudante para verificar quantas existem...');
          
          // Buscar todas as aplicações do estudante para verificar se há múltiplas
          const { data: studentApplications, error: appsError } = await supabase
            .from('scholarship_applications')
            .select('id, scholarship_id, scholarships(title)')
            .eq('student_id', payment.student_id);

          if (appsError) {
            console.error('❌ [approveZellePayment] Erro ao buscar aplicações do estudante:', appsError);
            throw new Error('Erro ao verificar aplicações do estudante');
          }

          if (studentApplications && studentApplications.length > 1) {
            console.error('❌ [approveZellePayment] ERRO CRÍTICO: Estudante possui múltiplas aplicações mas o pagamento não especifica qual bolsa!');
            console.log('📋 [approveZellePayment] Aplicações encontradas:', studentApplications.map(app => ({
              id: app.id,
              scholarship_id: app.scholarship_id,
              title: (app as any).scholarships?.title
            })));
            
          } else if (studentApplications && studentApplications.length === 1) {
            // Se há apenas uma aplicação, usar ela
            targetScholarshipId = studentApplications[0].scholarship_id;
            console.log('✅ [approveZellePayment] Apenas uma aplicação encontrada, usando scholarship_id:', targetScholarshipId);
          } else {
            console.error('❌ [approveZellePayment] Nenhuma aplicação encontrada para o estudante');
            throw new Error('Nenhuma aplicação de bolsa encontrada para este estudante');
          }
        }

        console.log('🔍 [approveZellePayment] Executando UPDATE scholarship_applications WHERE scholarship_id =', targetScholarshipId);
        
        // Marcar no scholarship_applications - APENAS A APLICAÇÃO ESPECÍFICA
        const { data: updateData, error: appError } = await supabase
          .from('scholarship_applications')
          .update({ 
            [payment.fee_type === 'application_fee' ? 'is_application_fee_paid' : 'is_scholarship_fee_paid']: true,
            updated_at: new Date().toISOString()
          })
          .eq('student_id', payment.student_id)
          .eq('scholarship_id', targetScholarshipId)  // ← CORREÇÃO: Especificar a bolsa específica
          .select();

        console.log('🔍 [approveZellePayment] Resultado da atualização scholarship_applications:', { updateData, appError });

        if (appError) {
          console.error('❌ [approveZellePayment] Erro ao marcar scholarship_applications:', appError);
        } else {
          console.log(`✅ [approveZellePayment] ${payment.fee_type === 'application_fee' ? 'is_application_fee_paid' : 'is_scholarship_fee_paid'} marcado como true`);
          console.log('🔍 [approveZellePayment] Dados atualizados scholarship_applications:', updateData);
          
          // Registrar no faturamento apenas para scholarship_fee (application_fee não gera faturamento)
          if (payment.fee_type === 'scholarship_fee') {
            // Buscar valor dinâmico correto baseado no pacote do usuário
            console.log('💰 [approveZellePayment] Buscando valor dinâmico correto para scholarship_fee...');
            let correctAmount = payment.amount; // Valor padrão
            
            try {
              // Buscar taxas do pacote do usuário
              const { data: userPackageFees, error: packageError } = await supabase.rpc('get_user_package_fees', {
                user_id_param: payment.user_id
              });
              
              if (!packageError && userPackageFees && userPackageFees.length > 0) {
                const packageFees = userPackageFees[0];
                correctAmount = packageFees.scholarship_fee;
                console.log('✅ [approveZellePayment] Valor dinâmico encontrado para scholarship_fee:', correctAmount, 'Pacote:', packageFees.package_name);
              } else {
                console.log('ℹ️ [approveZellePayment] Usuário sem pacote, usando valor padrão para scholarship_fee:', correctAmount);
              }
            } catch (error) {
              console.warn('⚠️ [approveZellePayment] Erro ao buscar valor dinâmico para scholarship_fee, usando valor padrão:', error);
            }

            console.log('💰 [approveZellePayment] Registrando scholarship_fee no faturamento com valor:', correctAmount);
            const { error: billingError } = await supabase.rpc('register_payment_billing', {
              user_id_param: payment.user_id,
              fee_type_param: 'scholarship_fee',
              amount_param: correctAmount,
              payment_session_id_param: `zelle_${payment.id}`,
              payment_method_param: 'zelle'
            });
            
            if (billingError) {
              console.error('❌ [approveZellePayment] Erro ao registrar faturamento:', billingError);
            } else {
              console.log('✅ [approveZellePayment] Faturamento registrado com sucesso');
            }
          }
        }

        // Se for application_fee, também atualizar user_profiles
        if (payment.fee_type === 'application_fee') {
          console.log('🎯 [approveZellePayment] Atualizando user_profiles para application_fee');
          console.log('🔍 [approveZellePayment] Executando UPDATE user_profiles SET is_application_fee_paid = true WHERE user_id =', payment.user_id);
          
          const { data: profileUpdateData, error: profileError } = await supabase
            .from('user_profiles')
            .update({ 
              is_application_fee_paid: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', payment.user_id)
            .select();

          console.log('🔍 [approveZellePayment] Resultado da atualização user_profiles:', { profileUpdateData, profileError });

          if (profileError) {
            console.error('❌ [approveZellePayment] Erro ao marcar is_application_fee_paid no user_profiles:', profileError);
          } else {
            console.log('✅ [approveZellePayment] is_application_fee_paid marcado como true no user_profiles');
            console.log('🔍 [approveZellePayment] Dados atualizados user_profiles:', profileUpdateData);
          }
        }
      }

      // ENVIAR WEBHOOK PARA NOTIFICAR O ALUNO SOBRE APROVAÇÃO
      console.log('📤 [approveZellePayment] Enviando notificação de aprovação para o aluno...');
      
      try {
        // Buscar nome do admin
        const { data: adminProfile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', user!.id)
          .single();

        const adminName = adminProfile?.full_name || 'Admin';

        // Payload para notificar o aluno sobre a aprovação
        const approvalPayload = {
          tipo_notf: "Pagamento aprovado",
          email_aluno: payment.student_email,
          nome_aluno: payment.student_name,
          email_universidade: "",
          o_que_enviar: `Seu pagamento de ${payment.fee_type} no valor de $${payment.amount} foi aprovado e processado com sucesso!`,
          payment_id: paymentId,
          fee_type: payment.fee_type,
          amount: payment.amount,
          approved_by: adminName
        };

        console.log('📤 [approveZellePayment] Payload de aprovação:', approvalPayload);

        const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(approvalPayload),
        });

        if (webhookResponse.ok) {
          console.log('✅ [approveZellePayment] Notificação de aprovação enviada com sucesso!');
        } else {
          console.warn('⚠️ [approveZellePayment] Erro ao enviar notificação de aprovação:', webhookResponse.status);
        }
      } catch (webhookError) {
        console.error('❌ [approveZellePayment] Erro ao enviar webhook de aprovação:', webhookError);
        // Não falhar o processo se o webhook falhar
      }

      // --- NOTIFICAÇÃO DE ACEITAÇÃO DE TERMOS COM PDF (apenas para selection_process_fee) ---
      if (payment.fee_type === 'selection_process') {
        try {
          console.log('📄 [approveZellePayment] Enviando notificação de aceitação de termos com PDF...');
          await sendTermAcceptanceNotificationAfterPayment(payment.user_id!, 'selection_process');
          console.log('✅ [approveZellePayment] Notificação de aceitação de termos enviada com sucesso!');
        } catch (termNotificationError) {
          console.error('❌ [approveZellePayment] Erro ao enviar notificação de aceitação de termos:', termNotificationError);
          // Não falhar o processo se a notificação de termos falhar
        }
      }

      // --- NOTIFICAÇÃO PARA UNIVERSIDADE ---
      try {
        console.log(`📤 [approveZellePayment] Enviando notificação de ${payment.fee_type} para universidade...`);
        
        const notificationEndpoint = payment.fee_type === 'application_fee' 
          ? 'notify-university-application-fee-paid'
          : payment.fee_type === 'scholarship_fee'
          ? 'notify-university-scholarship-fee-paid'
          : null;
        
        if (notificationEndpoint) {
          const payload = {
            application_id: payment.student_id, // Sempre usar student_id para buscar a aplicação
            user_id: payment.user_id,
            scholarship_id: payment.scholarship_id || null
          };
          
          console.log(`📤 [approveZellePayment] Payload para universidade:`, payload);
          
          console.log(`🔗 [approveZellePayment] URL da Edge Function:`, `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${notificationEndpoint!}`);
          console.log(`🔗 [approveZellePayment] Headers:`, {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          });
          
          const notificationResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${notificationEndpoint!}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(payload),
          });

          console.log(`📊 [approveZellePayment] Resposta da Edge Function:`, {
            status: notificationResponse.status,
            statusText: notificationResponse.statusText,
            ok: notificationResponse.ok
          });

          if (notificationResponse.ok) {
            const responseData = await notificationResponse.json();
            console.log(`✅ [approveZellePayment] Notificação de ${payment.fee_type} enviada para universidade com sucesso!`, responseData);
          } else {
            const errorData = await notificationResponse.text();
            console.warn(`⚠️ [approveZellePayment] Erro ao enviar notificação de ${payment.fee_type} para universidade:`, {
              status: notificationResponse.status,
              statusText: notificationResponse.statusText,
              error: errorData
            });
          }
        } else {
          console.log(`ℹ️ [approveZellePayment] Tipo de taxa ${payment.fee_type} não requer notificação para universidade`);
        }
      } catch (notificationError) {
        console.error('❌ [approveZellePayment] Erro ao enviar notificação para universidade:', notificationError);
        // Não falhar o processo se a notificação falhar
      }

      // --- NOTIFICAÇÕES PARA ADMIN, AFFILIATE ADMIN E SELLER ---
      try {
        console.log(`📤 [approveZellePayment] Buscando informações do seller e affiliate admin...`);
        
        // Buscar informações do seller relacionado ao pagamento
        // Primeiro tentar buscar pelo user_id diretamente
        let { data: sellerData, error: sellerError } = await supabase
          .from('sellers')
          .select(`
            id,
            user_id,
            name,
            email,
            referral_code,
            affiliate_admin_id
          `)
          .eq('user_id', payment.user_id)
          .single();

        // Se não encontrar pelo user_id, buscar pelo seller_referral_code do usuário
        if (sellerError && sellerError.code === 'PGRST116') {
          console.log('🔍 [approveZellePayment] Seller não encontrado pelo user_id, buscando pelo seller_referral_code...');
          
          // Buscar o seller_referral_code do usuário
          const { data: userProfile, error: userError } = await supabase
            .from('user_profiles')
            .select('seller_referral_code')
            .eq('user_id', payment.user_id)
            .single();

          if (!userError && userProfile?.seller_referral_code) {
            console.log('🔍 [approveZellePayment] seller_referral_code encontrado:', userProfile.seller_referral_code);
            
            // Buscar o seller pelo referral_code
            const { data: sellerByCode, error: sellerByCodeError } = await supabase
              .from('sellers')
              .select(`
                id,
                user_id,
                name,
                email,
                referral_code,
                affiliate_admin_id
              `)
              .eq('referral_code', userProfile.seller_referral_code)
              .single();

            if (!sellerByCodeError && sellerByCode) {
              sellerData = sellerByCode;
              sellerError = null;
              console.log('✅ [approveZellePayment] Seller encontrado pelo referral_code:', sellerData);
            } else {
              console.log('❌ [approveZellePayment] Seller não encontrado pelo referral_code:', sellerByCodeError);
            }
          } else {
            console.log('❌ [approveZellePayment] seller_referral_code não encontrado no perfil do usuário:', userError);
          }
        }

        // Buscar informações do affiliate admin separadamente se existir
        let affiliateAdminData = null;
        if (sellerData && sellerData.affiliate_admin_id) {
          console.log('🔍 [approveZellePayment] Buscando affiliate admin com ID:', sellerData.affiliate_admin_id);
          
          // Primeiro buscar o affiliate_admin
          const { data: affiliateData, error: affiliateError } = await supabase
            .from('affiliate_admins')
            .select('user_id')
            .eq('id', sellerData.affiliate_admin_id)
            .single();
          
          if (!affiliateError && affiliateData) {
            console.log('✅ [approveZellePayment] Affiliate admin encontrado:', affiliateData);
            
            // Depois buscar as informações do user_profiles
            const { data: userProfileData, error: userProfileError } = await supabase
              .from('user_profiles')
              .select('full_name, email, phone')
              .eq('user_id', affiliateData.user_id)
              .single();
            
            if (!userProfileError && userProfileData) {
              affiliateAdminData = {
                user_id: affiliateData.user_id,
                user_profiles: userProfileData
              };
              console.log('✅ [approveZellePayment] Dados do affiliate admin carregados:', affiliateAdminData);
            } else {
              console.log('❌ [approveZellePayment] Erro ao buscar user_profiles do affiliate admin:', userProfileError);
            }
          } else {
            console.log('❌ [approveZellePayment] Erro ao buscar affiliate admin:', affiliateError);
          }
        }

        if (sellerData && !sellerError) {
          const { data: sellerProfile } = await supabase.from('user_profiles').select('phone').eq('user_id', sellerData.user_id).single();
          const sellerPhone = sellerProfile?.phone;

          console.log(`📤 [approveZellePayment] Seller encontrado:`, sellerData);

          // NOTIFICAÇÃO PARA ADMIN
          try {
            const adminNotificationPayload = {
              tipo_notf: "Pagamento de aluno aprovado",
              email_admin: "admin@matriculausa.com",
              nome_admin: "Admin MatriculaUSA",
              email_aluno: payment.student_email,
              nome_aluno: payment.student_name,
              email_seller: sellerData.email,
              nome_seller: sellerData.name,
              email_affiliate_admin: affiliateAdminData?.user_profiles?.email || "",
              nome_affiliate_admin: affiliateAdminData?.user_profiles?.full_name || "Affiliate Admin",
              o_que_enviar: `Pagamento de ${payment.fee_type} no valor de ${payment.amount} do aluno ${payment.student_name} foi aprovado. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
              payment_id: paymentId,
              fee_type: payment.fee_type,
              amount: payment.amount,
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code,
            };

            console.log('📧 [approveZellePayment] Enviando notificação para admin:', adminNotificationPayload);

            const adminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(adminNotificationPayload),
            });

            if (adminNotificationResponse.ok) {
              console.log('✅ [approveZellePayment] Notificação para admin enviada com sucesso!');
            } else {
              console.warn('⚠️ [approveZellePayment] Erro ao enviar notificação para admin:', adminNotificationResponse.status);
            }
          } catch (adminNotificationError) {
            console.error('❌ [approveZellePayment] Erro ao enviar notificação para admin:', adminNotificationError);
          }

          // NOTIFICAÇÃO PARA AFFILIATE ADMIN
          if (affiliateAdminData?.user_profiles?.email) {
            try {
              const affiliateAdminNotificationPayload = {
                tipo_notf: "Pagamento de aluno do seu seller aprovado",
                email_affiliate_admin: affiliateAdminData.user_profiles.email,
                nome_affiliate_admin: affiliateAdminData.user_profiles.full_name || "Affiliate Admin",
                phone_affiliate_admin: affiliateAdminData.user_profiles.phone || "",
                email_aluno: payment.student_email,
                nome_aluno: payment.student_name,
                phone_aluno: "", // Campo não disponível no PaymentRecord
                email_seller: sellerData.email,
                nome_seller: sellerData.name,
                phone_seller: sellerPhone || "",
                o_que_enviar: `Pagamento de ${payment.fee_type} no valor de ${payment.amount} do aluno ${payment.student_name} foi aprovado. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
                payment_id: paymentId,
                fee_type: payment.fee_type,
                amount: payment.amount,
                seller_id: sellerData.user_id,
                referral_code: sellerData.referral_code,
              };

              console.log('📧 [approveZellePayment] Enviando notificação para affiliate admin:', affiliateAdminNotificationPayload);

              const affiliateAdminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(affiliateAdminNotificationPayload),
              });

              if (affiliateAdminNotificationResponse.ok) {
                console.log('✅ [approveZellePayment] Notificação para affiliate admin enviada com sucesso!');
              } else {
                console.warn('⚠️ [approveZellePayment] Erro ao enviar notificação para affiliate admin:', affiliateAdminNotificationResponse.status);
              }
            } catch (affiliateAdminNotificationError) {
              console.error('❌ [approveZellePayment] Erro ao enviar notificação para affiliate admin:', affiliateAdminNotificationError);
            }
          }

          // NOTIFICAÇÃO PARA SELLER
          try {
            const sellerNotificationPayload = {
              tipo_notf: "Pagamento do seu aluno aprovado",
              email_seller: sellerData.email,
              nome_seller: sellerData.name,
              phone_seller: sellerPhone || "",
              email_aluno: payment.student_email,
              nome_aluno: payment.student_name,
              o_que_enviar: `Parabéns! O pagamento de ${payment.fee_type} no valor de ${payment.amount} do seu aluno ${payment.student_name} foi aprovado. Você ganhará comissão sobre este pagamento!`,
              payment_id: paymentId,
              fee_type: payment.fee_type,
              amount: payment.amount,
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code
            };

            console.log('📧 [approveZellePayment] Enviando notificação para seller:', sellerNotificationPayload);

            const sellerNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(sellerNotificationPayload),
            });

            if (sellerNotificationResponse.ok) {
              console.log('✅ [approveZellePayment] Notificação para seller enviada com sucesso!');
            } else {
              console.warn('⚠️ [approveZellePayment] Erro ao enviar notificação para seller:', sellerNotificationResponse.status);
            }
          } catch (sellerNotificationError) {
            console.error('❌ [approveZellePayment] Erro ao enviar notificação para seller:', sellerNotificationError);
          }

        } else {
          console.log(`ℹ️ [approveZellePayment] Nenhum seller encontrado para o usuário ${payment.user_id}`);
        }
      } catch (sellerLookupError) {
        console.error('❌ [approveZellePayment] Erro ao buscar informações do seller:', sellerLookupError);
        // Não falhar o processo se a busca do seller falhar
      }

      // Recarregar pagamentos Zelle
      await loadZellePayments();
      setShowZelleReviewModal(false);
      
      console.log('✅ [approveZellePayment] Zelle payment approved, marked as paid, and student notified successfully');
    } catch (error: any) {
      console.error('❌ [approveZellePayment] Error approving Zelle payment:', error);
    } finally {
      setZelleActionLoading(false);
    }
  };

  const rejectZellePayment = async (paymentId: string, reason?: string) => {
    try {
      setZelleActionLoading(true);
      
      const payment = zellePayments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Payment not found');

      console.log('🔍 [rejectZellePayment] Rejeitando pagamento:', payment);

      // Atualizar o status do pagamento para rejeitado
          const { error } = await supabase
      .from('zelle_payments')
      .update({
        status: 'rejected',
        admin_notes: reason || zelleRejectReason
      })
      .eq('id', paymentId);

      if (error) throw error;

      // ENVIAR WEBHOOK PARA NOTIFICAR O ALUNO
      console.log('📤 [rejectZellePayment] Enviando notificação de rejeição para o aluno...');
      
      try {
        // Buscar nome do admin
        const { data: adminProfile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', user!.id)
          .single();

        const adminName = adminProfile?.full_name || 'Admin';

        // Payload para notificar o aluno sobre a rejeição
        const rejectionPayload = {
          tipo_notf: "Pagamento rejeitado",
          email_aluno: payment.student_email,
          nome_aluno: payment.student_name,
          email_universidade: "",
          o_que_enviar: `Seu pagamento de ${payment.fee_type} no valor de $${payment.amount} foi rejeitado. Motivo: ${reason || zelleRejectReason}`,
          payment_id: paymentId,
          fee_type: payment.fee_type,
          amount: payment.amount,
          rejection_reason: reason || zelleRejectReason,
          rejected_by: adminName
        };

        console.log('📤 [rejectZellePayment] Payload de rejeição:', rejectionPayload);

        const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(rejectionPayload),
        });

        if (webhookResponse.ok) {
          console.log('✅ [rejectZellePayment] Notificação de rejeição enviada com sucesso!');
        } else {
          console.warn('⚠️ [rejectZellePayment] Erro ao enviar notificação de rejeição:', webhookResponse.status);
        }
      } catch (webhookError) {
        console.error('❌ [rejectZellePayment] Erro ao enviar webhook de rejeição:', webhookError);
        // Não falhar o processo se o webhook falhar
      }

      // Recarregar pagamentos Zelle
      await loadZellePayments();
      setShowZelleReviewModal(false);
      setZelleRejectReason('');
      
      console.log('✅ [rejectZellePayment] Zelle payment rejected and student notified successfully');
    } catch (error: any) {
      console.error('❌ [rejectZellePayment] Error rejecting Zelle payment:', error);
    } finally {
      setZelleActionLoading(false);
    }
  };

  // Função para atualizar scholarship_id de um pagamento Zelle
  const updateZellePaymentScholarship = async (paymentId: string, scholarshipId: string) => {
    try {
      setZelleActionLoading(true);
      
      console.log('🔧 [updateZellePaymentScholarship] Atualizando pagamento:', paymentId, 'com scholarship_id:', scholarshipId);

      // Atualizar o pagamento Zelle com o scholarship_id correto
      const { error } = await supabase
        .from('zelle_payments')
        .update({
          scholarships_ids: [scholarshipId],
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;

      console.log('✅ [updateZellePaymentScholarship] Pagamento Zelle atualizado com sucesso');
      
      // Recarregar pagamentos Zelle
      await loadZellePayments();
      
    } catch (error: any) {
      console.error('❌ [updateZellePaymentScholarship] Erro ao atualizar pagamento Zelle:', error);
      throw error;
    } finally {
      setZelleActionLoading(false);
    }
  };

  // Funções auxiliares para abrir modais
  const openRejectModal = (id: string) => {
    const request = universityRequests.find(r => r.id === id);
    setSelectedRequest(request || null);
    setShowRejectModal(true);
  };

  const openMarkPaidModal = (id: string) => {
    const request = universityRequests.find(r => r.id === id);
    setSelectedRequest(request || null);
    setShowMarkPaidModal(true);
  };

  const openAddNotesModal = (id: string) => {
    const request = universityRequests.find(r => r.id === id);
    setSelectedRequest(request || null);
    setShowAddNotesModal(true);
  };

  // Funções auxiliares para abrir modais de Zelle

  const openZelleReviewModal = (paymentId: string) => {
    const payment = zellePayments.find(p => p.id === paymentId);
    setSelectedZellePayment(payment || null);
    setShowZelleReviewModal(true);
  };

  const handleZelleReviewSuccess = () => {
    // Recarregar os pagamentos Zelle após aprovação/rejeição
    loadZellePayments();
    setShowZelleReviewModal(false);
    setSelectedZellePayment(null);
  };

  const openZelleNotesModal = (paymentId: string) => {
    const payment = zellePayments.find(p => p.id === paymentId);
    if (payment) {
      setSelectedZellePayment(payment);
      setZelleAdminNotes(payment.admin_notes || '');
      setShowZelleNotesModal(true);
    }
  };

  const openZelleProofModal = (paymentId: string) => {
    const payment = zellePayments.find(p => p.id === paymentId);
    if (payment && payment.payment_proof_url) {
      // Se payment_proof_url já é uma URL completa, usar diretamente
      // Se é um caminho relativo, construir URL completa
      let fullUrl = payment.payment_proof_url;
      if (!payment.payment_proof_url.startsWith('http')) {
        fullUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/zelle_comprovantes/${payment.payment_proof_url}`;
      }
      setSelectedZelleProofUrl(fullUrl);
      setSelectedZelleProofFileName(`Zelle Payment Proof - ${payment.student_name}`);
      setShowZelleProofModal(true);
    }
  };

  // Função para abrir modal de edição de scholarship_id
  const openZelleEditModal = async (paymentId: string) => {
    const payment = zellePayments.find(p => p.id === paymentId);
    if (!payment) return;

    try {
      setEditingZellePayment(true);
      
      // Buscar aplicações do estudante para mostrar as opções
      const { data: studentApplications, error } = await supabase
        .from('scholarship_applications')
        .select('id, scholarship_id, scholarships(id, title)')
        .eq('student_id', payment.student_id);

      if (error) {
        console.error('Erro ao buscar aplicações do estudante:', error);
        return;
      }

      setSelectedZellePaymentForEdit(payment);
      setAvailableScholarships(studentApplications || []);
      setSelectedScholarshipId('');
      setShowZelleEditModal(true);
      
    } catch (error) {
      console.error('Erro ao abrir modal de edição:', error);
    } finally {
      setEditingZellePayment(false);
    }
  };

  // Função para salvar a edição do scholarship_id
  const handleSaveZelleEdit = async () => {
    if (!selectedZellePaymentForEdit || !selectedScholarshipId) return;

    try {
      setEditingZellePayment(true);
      
      await updateZellePaymentScholarship(selectedZellePaymentForEdit.id, selectedScholarshipId);
      
      setShowZelleEditModal(false);
      setSelectedZellePaymentForEdit(null);
      setAvailableScholarships([]);
      setSelectedScholarshipId('');
      
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
    } finally {
      setEditingZellePayment(false);
    }
  };

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading payment data...');

      // Buscar aplicações de bolsa
      const { data: applications, error: appsError } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          user_profiles!student_id (
            id,
            user_id,
            full_name,
            email,
            has_paid_selection_process_fee,
            is_application_fee_paid,
            is_scholarship_fee_paid,
            has_paid_i20_control_fee,
            scholarship_package_id,
            dependents
          ),
          scholarships (
            id,
            title,
            amount,
            application_fee_amount,
            universities (
              id,
              name
            )
          )
        `);

      if (appsError) throw appsError;

      // Buscar pagamentos Zelle aprovados (incluindo usuários sem aplicação)
      const { data: zellePaymentsRaw, error: zelleError } = await supabase
        .from('zelle_payments')
        .select('*')
        .eq('status', 'approved');

      if (zelleError) {
        console.error('Error loading Zelle payments:', zelleError);
      }

      // Buscar dados dos usuários dos pagamentos Zelle
      let zellePayments: any[] = [];
      if (zellePaymentsRaw && zellePaymentsRaw.length > 0) {
        const userIds = zellePaymentsRaw.map(p => p.user_id);
        const { data: userProfiles, error: usersError } = await supabase
          .from('user_profiles')
          .select('id, user_id, full_name, email, has_paid_selection_process_fee, is_application_fee_paid, is_scholarship_fee_paid, has_paid_i20_control_fee, scholarship_package_id, dependents')
          .in('user_id', userIds);

        if (usersError) {
          console.error('Error loading user profiles for Zelle payments:', usersError);
        } else {
          // Combinar dados dos pagamentos Zelle com os perfis dos usuários
          zellePayments = zellePaymentsRaw.map(payment => ({
            ...payment,
            user_profiles: userProfiles?.find(profile => profile.user_id === payment.user_id)
          }));
        }
      }

      // Buscar usuários que pagaram via Stripe mas não têm aplicação
      let stripeUsers: any[] = [];
      const { data: stripeUsersRaw, error: stripeError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          user_id,
          full_name,
          email,
          has_paid_selection_process_fee,
          is_application_fee_paid,
          is_scholarship_fee_paid,
          has_paid_i20_control_fee,
          scholarship_package_id,
          dependents,
          created_at
        `)
        .or('has_paid_selection_process_fee.eq.true,is_application_fee_paid.eq.true,is_scholarship_fee_paid.eq.true,has_paid_i20_control_fee.eq.true');

      if (stripeError) {
        console.error('Error loading Stripe users:', stripeError);
      } else if (stripeUsersRaw && stripeUsersRaw.length > 0) {
        // Filtrar apenas usuários que NÃO têm aplicação
        const applicationUserIds = applications?.map(app => app.user_profiles?.user_id).filter(Boolean) || [];
        stripeUsers = stripeUsersRaw.filter(user => !applicationUserIds.includes(user.user_id));
        console.log('💳 Stripe users found:', stripeUsers.length);
      }

      console.log('📊 Applications found:', applications?.length || 0);
      console.log('💰 Zelle payments found:', zellePayments?.length || 0);
      console.log('💳 Stripe users found:', stripeUsers?.length || 0);

      
      // Buscar dados dos pacotes separadamente (aplicações, pagamentos Zelle e usuários Stripe)
      const allPackageIds = [
        ...(applications?.map(app => app.user_profiles?.scholarship_package_id).filter(Boolean) || []),
        ...(zellePayments?.map(payment => payment.user_profiles?.scholarship_package_id).filter(Boolean) || []),
        ...(stripeUsers?.map(user => user.scholarship_package_id).filter(Boolean) || [])
      ];
      const uniquePackageIds = [...new Set(allPackageIds)];
      
      let packageDataMap: { [key: string]: any } = {};
      if (uniquePackageIds.length > 0) {
        const { data: packages, error: packagesError } = await supabase
          .from('scholarship_packages')
          .select('id, name, selection_process_fee, i20_control_fee, scholarship_fee')
          .in('id', uniquePackageIds);
        
        if (packagesError) {
          console.error('Error loading packages:', packagesError);
        } else {
          packageDataMap = packages?.reduce((acc: { [key: string]: any }, pkg: any) => {
            acc[pkg.id] = pkg;
            return acc;
          }, {}) || {};
        }
      }

      // Buscar overrides de taxas para todos os usuários
      const allUserIds = [
        ...(applications?.map(app => app.user_profiles?.user_id).filter(Boolean) || []),
        ...(zellePayments?.map(payment => payment.user_profiles?.user_id).filter(Boolean) || []),
        ...(stripeUsers?.map(user => user.user_id).filter(Boolean) || [])
      ];
      const uniqueUserIds = [...new Set(allUserIds)];
      
      let overridesMap: { [key: string]: any } = {};
      if (uniqueUserIds.length > 0) {
        console.log('🔍 DEBUG: Loading overrides for user IDs:', uniqueUserIds);
        const overrideEntries = await Promise.allSettled(
          uniqueUserIds.map(async (userId) => {
            const { data, error } = await supabase.rpc('get_user_fee_overrides', { user_id_param: userId });
            if (error) {
              console.log(`❌ DEBUG: Error loading override for user ${userId}:`, error);
            } else if (data) {
              console.log(`✅ DEBUG: Override found for user ${userId}:`, data);
            }
            return { userId, data: error ? null : data };
          })
        );
        
        overridesMap = overrideEntries.reduce((acc: { [key: string]: any }, res) => {
          if (res.status === 'fulfilled') {
            const { userId, data } = res.value;
            if (data) {
              acc[userId] = {
                selection_process_fee: data.selection_process_fee != null ? Number(data.selection_process_fee) : undefined,
                application_fee: data.application_fee != null ? Number(data.application_fee) : undefined,
                scholarship_fee: data.scholarship_fee != null ? Number(data.scholarship_fee) : undefined,
                i20_control_fee: data.i20_control_fee != null ? Number(data.i20_control_fee) : undefined,
              };
            }
          }
          return acc;
        }, {});
        
        console.log('🔍 DEBUG: Final overrides map:', overridesMap);
      }
      console.log('🚨 DEBUG: First application user_profiles:', applications?.[0]?.user_profiles);
      console.log('🚨 DEBUG: First application scholarship_packages:', applications?.[0]?.user_profiles?.scholarship_packages);
      
      // Debug específico para verificar se os dados dinâmicos estão sendo carregados
      if (applications && applications.length > 0) {
        const firstApp = applications[0];
        if (firstApp.user_profiles?.scholarship_packages) {
          console.log('🚨 DEBUG: Package data found:', firstApp.user_profiles.scholarship_packages);
          console.log('🚨 DEBUG: Selection process fee:', firstApp.user_profiles.scholarship_packages.selection_process_fee);
          console.log('🚨 DEBUG: I20 control fee:', firstApp.user_profiles.scholarship_packages.i20_control_fee);
          console.log('🚨 DEBUG: Scholarship fee:', firstApp.user_profiles.scholarship_packages.scholarship_fee);
        } else {
          console.log('🚨 DEBUG: No package data found for first app');
        }
      }
      
      // Debug específico para verificar se os dados estão sendo carregados
      if (applications && applications.length > 0) {
        const firstApp = applications[0];
        console.log('🚨 DEBUG: First app user_profiles:', firstApp.user_profiles);
        console.log('🚨 DEBUG: First app scholarship_packages:', firstApp.user_profiles?.scholarship_packages);
        
        // Debug específico para verificar se os dados dinâmicos estão sendo carregados
        if (firstApp.user_profiles?.scholarship_packages) {
          console.log('🚨 DEBUG: Package data found:', firstApp.user_profiles.scholarship_packages);
          console.log('🚨 DEBUG: Selection process fee:', firstApp.user_profiles.scholarship_packages.selection_process_fee);
          console.log('🚨 DEBUG: I20 control fee:', firstApp.user_profiles.scholarship_packages.i20_control_fee);
          console.log('🚨 DEBUG: Scholarship fee:', firstApp.user_profiles.scholarship_packages.scholarship_fee);
        } else {
          console.log('🚨 DEBUG: No package data found for first app');
        }
      }

      // Converter aplicações e pagamentos Zelle em registros de pagamento
      const paymentRecords: PaymentRecord[] = [];
      
      console.log('🔄 Processing applications:', applications?.length || 0);
      console.log('🔄 Processing Zelle payments:', zellePayments?.length || 0);
      
      // Processar aplicações de bolsa
      applications?.forEach((app: any) => {
        const student = app.user_profiles;
        const scholarship = app.scholarships;
        const university = scholarship?.universities;
        const packageData = packageDataMap[student?.scholarship_package_id];

        // console.log('👤 Student:', student);
        // console.log('🎓 Scholarship:', scholarship);
        // console.log('🏫 University:', university);
        // console.log('📦 Package:', packageData);

        if (!student || !scholarship || !university) {
          console.log('⚠️ Skipping application due to missing data:', {
            hasStudent: !!student,
            hasScholarship: !!scholarship,
            hasUniversity: !!university
          });
          return;
        }

        // Verificar se os dados essenciais existem
        const studentName = student.full_name || 'Unknown Student';
        const studentEmail = student.email || '';
        const universityName = university.name || 'Unknown University';
        const scholarshipTitle = scholarship.title || 'Unknown Scholarship';

        if (!studentName || !universityName) {
          console.log('⚠️ Skipping application due to missing essential data:', {
            studentName,
            universityName,
            scholarshipTitle
          });
          return;
        }

        // Obter valores dinâmicos do pacote + dependentes ou usar valores padrão + dependentes
        const dependents = Number(student?.dependents) || 0;
        const dependentCost = dependents * 150; // $150 por dependente apenas para Selection Process (em centavos)
        const userOverrides = overridesMap[student?.user_id] || {};
        
        // Debug: Log dos overrides para este usuário
        if (Object.keys(userOverrides).length > 0) {
          console.log(`🔍 DEBUG: User ${student?.user_id} (${studentName}) has overrides:`, userOverrides);
        }
        
        // Selection Process Fee - prioridade: override > pacote > padrão
        let selectionProcessFee: number;
        if (userOverrides.selection_process_fee !== undefined) {
          // Se há override, usar exatamente o valor do override (já inclui dependentes se necessário)
          selectionProcessFee = Math.round(userOverrides.selection_process_fee * 100);
          console.log(`🔍 DEBUG: Using override for Selection Process Fee: $${userOverrides.selection_process_fee} (${selectionProcessFee} cents)`);
        } else if (packageData?.selection_process_fee) {
          selectionProcessFee = Math.round((packageData.selection_process_fee + dependentCost) * 100);
          console.log(`🔍 DEBUG: Using package for Selection Process Fee: $${packageData.selection_process_fee} + $${dependentCost/100} = $${(selectionProcessFee/100).toFixed(2)}`);
        } else {
          selectionProcessFee = Math.round((getFeeAmount('selection_process') + dependentCost) * 100);
          console.log(`🔍 DEBUG: Using default for Selection Process Fee: $${getFeeAmount('selection_process')} + $${dependentCost/100} = $${(selectionProcessFee/100).toFixed(2)}`);
        }
        
        // I-20 Control Fee - prioridade: override > pacote > padrão (sem dependentes)
        let i20ControlFee: number;
        if (userOverrides.i20_control_fee !== undefined) {
          i20ControlFee = Math.round(userOverrides.i20_control_fee * 100);
          console.log(`🔍 DEBUG: Using override for I-20 Control Fee: $${userOverrides.i20_control_fee} (${i20ControlFee} cents)`);
        } else if (packageData?.i20_control_fee) {
          i20ControlFee = Math.round(packageData.i20_control_fee * 100);
          console.log(`🔍 DEBUG: Using package for I-20 Control Fee: $${packageData.i20_control_fee} (${i20ControlFee} cents)`);
        } else {
          i20ControlFee = Math.round(getFeeAmount('i20_control_fee') * 100);
          console.log(`🔍 DEBUG: Using default for I-20 Control Fee: $${getFeeAmount('i20_control_fee')} (${i20ControlFee} cents)`);
        }
        
        // Scholarship Fee - prioridade: override > pacote > padrão (sem dependentes)
        let scholarshipFee: number;
        if (userOverrides.scholarship_fee !== undefined) {
          scholarshipFee = Math.round(userOverrides.scholarship_fee * 100);
          console.log(`🔍 DEBUG: Using override for Scholarship Fee: $${userOverrides.scholarship_fee} (${scholarshipFee} cents)`);
        } else if (packageData?.scholarship_fee) {
          scholarshipFee = Math.round(packageData.scholarship_fee * 100);
          console.log(`🔍 DEBUG: Using package for Scholarship Fee: $${packageData.scholarship_fee} (${scholarshipFee} cents)`);
        } else {
          scholarshipFee = Math.round(getFeeAmount('scholarship_fee') * 100);
          console.log(`🔍 DEBUG: Using default for Scholarship Fee: $${getFeeAmount('scholarship_fee')} (${scholarshipFee} cents)`);
        }
        
        // Debug: Log de todas as taxas calculadas
        if (studentName === 'froilan8153@uorak.com') {
          console.log('🔍 DEBUG All fees for froilan8153@uorak.com:', {
            dependents,
            dependentCost,
            selectionProcessFee: selectionProcessFee / 100,
            i20ControlFee: i20ControlFee / 100,
            scholarshipFee: scholarshipFee / 100,
            packageData: packageData
          });
        }
        // Application Fee dinâmico baseado na bolsa específica
        let applicationFee: number;
        if (scholarship?.application_fee_amount) {
          const rawValue = parseFloat(scholarship.application_fee_amount);
          // Detectar se o valor já está em centavos (valores muito altos) ou em dólares
          if (rawValue > 1000) {
            // Valor já está em centavos, usar diretamente
            applicationFee = Math.round(rawValue);
          } else {
            // Valor está em dólares, converter para centavos
            applicationFee = Math.round(rawValue * 100);
          }
          console.log('🔍 DEBUG Application Fee for', studentName, ':', {
            rawValue: scholarship.application_fee_amount,
            parsedValue: rawValue,
            isAlreadyCents: rawValue > 1000,
            finalCents: applicationFee,
            finalDollars: applicationFee / 100
          });
        } else {
          // Fallback para valor padrão do sistema (converter dólares para centavos)
          applicationFee = Math.round(getFeeAmount('application_fee') * 100);
        }
        

        // Criar registros apenas para taxas que foram pagas
        if (student.has_paid_selection_process_fee) {
        paymentRecords.push({
          id: `${app.id}-selection`,
          student_id: student.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: university.id,
          university_name: universityName,
          scholarship_id: scholarship.id,
          scholarship_title: scholarshipTitle,
          fee_type: 'selection_process',
          amount: selectionProcessFee,
            status: 'paid',
            payment_date: app.created_at,
          created_at: app.created_at,
          payment_method: 'stripe'
        });
        }

        // Application Fee - criar apenas se foi paga
        if (app.is_application_fee_paid) {
        paymentRecords.push({
          id: `${app.id}-application`,
          student_id: student.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: university.id,
          university_name: universityName,
          scholarship_id: scholarship.id,
          scholarship_title: scholarshipTitle,
          fee_type: 'application',
          amount: applicationFee,
            status: 'paid',
            payment_date: app.created_at,
          created_at: app.created_at,
          payment_method: 'stripe'
        });
        }

        // Scholarship Fee - criar apenas se foi paga E não for da bolsa "Current Students Scholarship"
        if (app.is_scholarship_fee_paid && scholarship.id !== '31c9b8e6-af11-4462-8494-c79854f3f66e') {
          paymentRecords.push({
            id: `${app.id}-scholarship`,
            student_id: student.id,
            student_name: studentName,
            student_email: studentEmail,
            university_id: university.id,
            university_name: universityName,
            scholarship_id: scholarship.id,
            scholarship_title: scholarshipTitle,
            fee_type: 'scholarship',
            amount: scholarshipFee,
            status: 'paid',
            payment_date: app.created_at,
            created_at: app.created_at,
            payment_method: 'stripe'
          });
        } else if (app.is_scholarship_fee_paid && scholarship.id === '31c9b8e6-af11-4462-8494-c79854f3f66e') {
          console.log('🚫 Excluding Current Students Scholarship payment for:', studentName, '- $', (scholarshipFee / 100).toFixed(2));
        }

        // I-20 Control Fee - criar apenas se foi paga
        if (student.has_paid_i20_control_fee) {
        paymentRecords.push({
          id: `${app.id}-i20`,
          student_id: student.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: university.id,
          university_name: universityName,
          scholarship_id: scholarship.id,
          scholarship_title: scholarshipTitle,
          fee_type: 'i20_control_fee',
          amount: i20ControlFee,
            status: 'paid',
            payment_date: app.created_at,
          created_at: app.created_at,
          payment_method: 'stripe'
        });
        }
      });

      console.log('💰 Generated payment records:', paymentRecords.length);
      if (paymentRecords.length > 0) {
        console.log('✅ Payment data loaded successfully with null safety checks');
      }

      // Processar pagamentos Zelle (apenas para usuários sem aplicação)
      // Agrupar pagamentos Zelle por usuário para evitar duplicação
      const zellePaymentsByUser: { [userId: string]: any[] } = {};
      zellePayments?.forEach((zellePayment: any) => {
        const student = zellePayment.user_profiles;
        if (student?.user_id) {
          if (!zellePaymentsByUser[student.user_id]) {
            zellePaymentsByUser[student.user_id] = [];
          }
          zellePaymentsByUser[student.user_id].push(zellePayment);
        }
      });

      // Processar cada usuário apenas uma vez
      Object.keys(zellePaymentsByUser).forEach(userId => {
        const userZellePayments = zellePaymentsByUser[userId];
        const firstPayment = userZellePayments[0];
        const student = firstPayment.user_profiles;

        if (!student) {
          console.log('⚠️ Skipping Zelle payment due to missing student data');
          return;
        }

        const studentName = student.full_name || 'Unknown Student';
        const studentEmail = student.email || '';

        if (!studentName) {
          console.log('⚠️ Skipping Zelle payment due to missing student name');
          return;
        }

        // Verificar se o usuário já tem uma aplicação (para evitar duplicação)
        const hasApplication = applications?.some(app => 
          app.user_profiles?.user_id === student.user_id
        );

        if (hasApplication) {
          console.log('⚠️ Skipping Zelle payment for', studentName, '- user already has application');
          return;
        }


        console.log('💰 Processing Zelle payments for:', studentName, 'Total payments:', userZellePayments.length);

        // Verificar quais taxas foram pagas via Zelle
        const paidFeeTypes = new Set(userZellePayments.map(payment => {
          // Mapear fee_type para fee_type_global quando necessário
          if (payment.fee_type === 'application_fee') return 'application';
          if (payment.fee_type === 'selection_process_fee') return 'selection_process';
          if (payment.fee_type === 'scholarship_fee') return 'scholarship';
          if (payment.fee_type === 'i20_control_fee') return 'i20_control_fee';
          return payment.fee_type_global;
        }));

        // Criar registros de pagamento baseados nos tipos de taxa pagos via Zelle
        if (paidFeeTypes.has('selection_process')) {
          const selectionPayment = userZellePayments.find(p => p.fee_type_global === 'selection_process' || p.fee_type === 'selection_process_fee');
          paymentRecords.push({
            id: `zelle-${selectionPayment.id}-selection`,
            student_id: student.id,
            student_name: studentName,
            student_email: studentEmail,
            university_id: '00000000-0000-0000-0000-000000000000',
            university_name: 'No University Selected',
            scholarship_id: '00000000-0000-0000-0000-000000000000',
            scholarship_title: 'No Scholarship Selected',
            fee_type: 'selection_process',
            amount: Math.round(parseFloat(selectionPayment.amount) * 100),
            status: 'paid',
            payment_date: selectionPayment.admin_approved_at || selectionPayment.created_at,
            created_at: selectionPayment.created_at,
            payment_proof_url: selectionPayment.screenshot_url,
            admin_notes: selectionPayment.admin_notes,
            zelle_status: 'approved',
            reviewed_by: selectionPayment.admin_approved_by,
            reviewed_at: selectionPayment.admin_approved_at,
            payment_method: 'zelle'
          });
        }

        if (paidFeeTypes.has('application')) {
          const applicationPayment = userZellePayments.find(p => p.fee_type_global === 'application' || p.fee_type === 'application_fee');
          // Para Application Fee, usar o valor real pago via Zelle (dinâmico por bolsa)
          const applicationAmount = Math.round(parseFloat(applicationPayment.amount) * 100);
          paymentRecords.push({
            id: `zelle-${applicationPayment.id}-application`,
            student_id: student.id,
            student_name: studentName,
            student_email: studentEmail,
            university_id: '00000000-0000-0000-0000-000000000000',
            university_name: 'No University Selected',
            scholarship_id: '00000000-0000-0000-0000-000000000000',
            scholarship_title: 'No Scholarship Selected',
            fee_type: 'application',
            amount: applicationAmount, // Converter dólares para centavos
            status: 'paid',
            payment_date: applicationPayment.admin_approved_at || applicationPayment.created_at,
            created_at: applicationPayment.created_at,
            payment_proof_url: applicationPayment.screenshot_url,
            admin_notes: applicationPayment.admin_notes,
            zelle_status: 'approved',
            reviewed_by: applicationPayment.admin_approved_by,
            reviewed_at: applicationPayment.admin_approved_at,
            payment_method: 'zelle'
          });
        }

        if (paidFeeTypes.has('scholarship')) {
          const scholarshipPayment = userZellePayments.find(p => p.fee_type_global === 'scholarship' || p.fee_type === 'scholarship_fee');
          paymentRecords.push({
            id: `zelle-${scholarshipPayment.id}-scholarship`,
            student_id: student.id,
            student_name: studentName,
            student_email: studentEmail,
            university_id: '00000000-0000-0000-0000-000000000000',
            university_name: 'No University Selected',
            scholarship_id: '00000000-0000-0000-0000-000000000000',
            scholarship_title: 'No Scholarship Selected',
            fee_type: 'scholarship',
            amount: Math.round(parseFloat(scholarshipPayment.amount) * 100),
            status: 'paid',
            payment_date: scholarshipPayment.admin_approved_at || scholarshipPayment.created_at,
            created_at: scholarshipPayment.created_at,
            payment_proof_url: scholarshipPayment.screenshot_url,
            admin_notes: scholarshipPayment.admin_notes,
            zelle_status: 'approved',
            reviewed_by: scholarshipPayment.admin_approved_by,
            reviewed_at: scholarshipPayment.admin_approved_at,
            payment_method: 'zelle'
          });
        }

        if (paidFeeTypes.has('i20_control_fee')) {
          const i20Payment = userZellePayments.find(p => p.fee_type_global === 'i20_control_fee' || p.fee_type === 'i20_control_fee');
          paymentRecords.push({
            id: `zelle-${i20Payment.id}-i20`,
            student_id: student.id,
            student_name: studentName,
            student_email: studentEmail,
            university_id: '00000000-0000-0000-0000-000000000000',
            university_name: 'No University Selected',
            scholarship_id: '00000000-0000-0000-0000-000000000000',
            scholarship_title: 'No Scholarship Selected',
            fee_type: 'i20_control_fee',
            amount: Math.round(parseFloat(i20Payment.amount) * 100),
            status: 'paid',
            payment_date: i20Payment.admin_approved_at || i20Payment.created_at,
            created_at: i20Payment.created_at,
            payment_proof_url: i20Payment.screenshot_url,
            admin_notes: i20Payment.admin_notes,
            zelle_status: 'approved',
            reviewed_by: i20Payment.admin_approved_by,
            reviewed_at: i20Payment.admin_approved_at,
            payment_method: 'zelle'
          });
        }
      });

      // Processar usuários Stripe (apenas para usuários sem aplicação e sem Zelle)
      console.log('🔄 Processing Stripe users:', stripeUsers?.length || 0);
      stripeUsers?.forEach((stripeUser: any) => {
        const packageData = packageDataMap[stripeUser.scholarship_package_id];

        if (!stripeUser) {
          console.log('⚠️ Skipping Stripe user due to missing data');
          return;
        }

        const studentName = stripeUser.full_name || 'Unknown Student';
        const studentEmail = stripeUser.email || '';

        if (!studentName) {
          console.log('⚠️ Skipping Stripe user due to missing student name');
          return;
        }

        // Verificar se o usuário já tem uma aplicação (para evitar duplicação)
        const hasApplication = applications?.some(app => 
          app.user_profiles?.user_id === stripeUser.user_id
        );

        if (hasApplication) {
          console.log('⚠️ Skipping Stripe user for', studentName, '- user already has application');
          return;
        }

        // Verificar se o usuário já foi processado via Zelle (para evitar duplicação)
        const hasZellePayment = zellePayments?.some(payment => 
          payment.user_profiles?.user_id === stripeUser.user_id
        );

        if (hasZellePayment) {
          console.log('⚠️ Skipping Stripe user for', studentName, '- user already processed via Zelle');
          return;
        }

        // Obter valores dinâmicos do pacote + dependentes ou usar valores padrão + dependentes
        const dependents = Number(stripeUser?.dependents) || 0;
        const dependentCost = dependents * 150; // $150 por dependente apenas para Selection Process (em centavos)
        const userOverrides = overridesMap[stripeUser?.user_id] || {};
        
        // Selection Process Fee - prioridade: override > pacote > padrão
        let selectionProcessFee: number;
        if (userOverrides.selection_process_fee !== undefined) {
          // Se há override, usar exatamente o valor do override (já inclui dependentes se necessário)
          selectionProcessFee = Math.round(userOverrides.selection_process_fee * 100);
        } else if (packageData?.selection_process_fee) {
          selectionProcessFee = Math.round((packageData.selection_process_fee + dependentCost) * 100);
        } else {
          selectionProcessFee = Math.round((getFeeAmount('selection_process') + dependentCost) * 100);
        }
        
        // I-20 Control Fee - prioridade: override > pacote > padrão (sem dependentes)
        let i20ControlFee: number;
        if (userOverrides.i20_control_fee !== undefined) {
          i20ControlFee = Math.round(userOverrides.i20_control_fee * 100);
        } else if (packageData?.i20_control_fee) {
          i20ControlFee = Math.round(packageData.i20_control_fee * 100);
        } else {
          i20ControlFee = Math.round(getFeeAmount('i20_control_fee') * 100);
        }
        
        // Scholarship Fee - prioridade: override > pacote > padrão (sem dependentes)
        let scholarshipFee: number;
        if (userOverrides.scholarship_fee !== undefined) {
          scholarshipFee = Math.round(userOverrides.scholarship_fee * 100);
        } else if (packageData?.scholarship_fee) {
          scholarshipFee = Math.round(packageData.scholarship_fee * 100);
        } else {
          scholarshipFee = Math.round(getFeeAmount('scholarship_fee') * 100);
        }
        // Application Fee - para usuários Stripe, usar valor padrão do sistema
        const applicationFee = Math.round(getFeeAmount('application_fee') * 100);

        console.log('💳 Processing Stripe user for:', studentName);

        // Selection Process Fee
        if (stripeUser.has_paid_selection_process_fee) {
          paymentRecords.push({
            id: `stripe-${stripeUser.user_id}-selection`,
            student_id: stripeUser.id,
            student_name: studentName,
            student_email: studentEmail,
            university_id: '00000000-0000-0000-0000-000000000000',
            university_name: 'No University Selected',
            scholarship_id: '00000000-0000-0000-0000-000000000000',
            scholarship_title: 'No Scholarship Selected',
            fee_type: 'selection_process',
            amount: selectionProcessFee,
            status: 'paid',
            payment_date: stripeUser.created_at,
            created_at: stripeUser.created_at,
            payment_method: 'stripe'
          });
        }

        // Application Fee
        paymentRecords.push({
          id: `stripe-${stripeUser.user_id}-application`,
          student_id: stripeUser.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: '00000000-0000-0000-0000-000000000000',
          university_name: 'No University Selected',
          scholarship_id: '00000000-0000-0000-0000-000000000000',
          scholarship_title: 'No Scholarship Selected',
          fee_type: 'application',
          amount: applicationFee,
          status: stripeUser.is_application_fee_paid ? 'paid' : 'pending',
          payment_date: stripeUser.is_application_fee_paid ? stripeUser.created_at : undefined,
          created_at: stripeUser.created_at,
          payment_method: 'stripe'
        });

        // Scholarship Fee
        paymentRecords.push({
          id: `stripe-${stripeUser.user_id}-scholarship`,
          student_id: stripeUser.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: '00000000-0000-0000-0000-000000000000',
          university_name: 'No University Selected',
          scholarship_id: '00000000-0000-0000-0000-000000000000',
          scholarship_title: 'No Scholarship Selected',
          fee_type: 'scholarship',
          amount: scholarshipFee,
          status: stripeUser.is_scholarship_fee_paid ? 'paid' : 'pending',
          payment_date: stripeUser.is_scholarship_fee_paid ? stripeUser.created_at : undefined,
          created_at: stripeUser.created_at,
          payment_method: 'stripe'
        });

        // I-20 Control Fee
        paymentRecords.push({
          id: `stripe-${stripeUser.user_id}-i20`,
          student_id: stripeUser.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: '00000000-0000-0000-0000-000000000000',
          university_name: 'No University Selected',
          scholarship_id: '00000000-0000-0000-0000-000000000000',
          scholarship_title: 'No Scholarship Selected',
          fee_type: 'i20_control_fee',
          amount: i20ControlFee,
          status: stripeUser.has_paid_i20_control_fee ? 'paid' : 'pending',
          payment_date: stripeUser.has_paid_i20_control_fee ? stripeUser.created_at : undefined,
          created_at: stripeUser.created_at,
          payment_method: 'stripe'
        });
      });

      // Se não há dados reais, vamos criar alguns dados de exemplo para testar
      setPayments(paymentRecords);

      // Calcular estatísticas
      const totalPayments = paymentRecords.length;
      const paidPayments = paymentRecords.filter(p => p.status === 'paid').length;
      const pendingPayments = paymentRecords.filter(p => p.status === 'pending').length;
      
        // Debug: Mostrar pagamentos pagos
      // No Admin Dashboard, incluir todas as taxas (incluindo Application Fee)
      const paidRecords = paymentRecords.filter(p => p.status === 'paid');
      console.log('🚨 DEBUG: Total payment records:', paymentRecords.length);
      console.log('🚨 DEBUG: Paid records count (including all fees):', paidRecords.length);
      
      // Debug: Verificar se há registros duplicados
      const recordIds = paymentRecords.map(p => p.id);
      const uniqueIds = [...new Set(recordIds)];
      console.log('🚨 DEBUG: Unique record IDs:', uniqueIds.length);
      console.log('🚨 DEBUG: Duplicate IDs:', recordIds.length - uniqueIds.length);
      
      // Debug: Verificar duplicações por estudante
      const studentCounts: { [email: string]: string[] } = {};
      paidRecords.forEach(p => {
        if (!studentCounts[p.student_email]) {
          studentCounts[p.student_email] = [];
        }
        studentCounts[p.student_email].push(p.fee_type);
      });
      
      console.log('🔍 DEBUG: Students with multiple fees:');
      Object.entries(studentCounts).forEach(([email, fees]) => {
        if (fees.length > 1) {
          console.log(`  ${email}: ${fees.join(', ')}`);
        }
      });
      
        console.log('🚨 DEBUG: Paid records details:', paidRecords.map(p => ({
          student: p.student_name,
          feeType: p.fee_type,
          amount: p.amount,
          amountDollars: p.amount / 100
        })));
        
        // Debug detalhado dos 5 pagamentos pagos
        console.log('🔍 DEBUG: Detailed paid records:');
        paidRecords.forEach((record, index) => {
          console.log(`  ${index + 1}. ${record.student_name} - ${record.fee_type}: $${(record.amount / 100).toFixed(2)}`);
        });
      
      // Debug: Mostrar soma passo a passo
      let runningTotal = 0;
      paidRecords.forEach((record, index) => {
        runningTotal += record.amount;
        console.log(`  ${index + 1}. ${record.student_name} - ${record.fee_type}: $${(record.amount / 100).toFixed(2)} (Running total: $${(runningTotal / 100).toFixed(2)})`);
      });
      
      const totalRevenue = paidRecords.reduce((sum, p) => sum + p.amount, 0);
      console.log('🚨 DEBUG: Total revenue (cents):', totalRevenue);
      console.log('🚨 DEBUG: Total revenue (dollars):', totalRevenue / 100);
      

      const newStats = {
        totalRevenue,
        totalPayments,
        paidPayments,
        pendingPayments,
        monthlyGrowth: 0
      };

      setStats(newStats);

    } catch (error) {
      console.error('Error loading payment data:', error);
    } finally {
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
  }, [filters.search, filters.university, filters.feeType, filters.status, filters.dateFrom, filters.dateTo]);

  // Calcular paginação
  const filteredPayments = payments.filter(payment => {
    // Excluir sempre a bolsa especial de alunos atuais
    if (payment.scholarship_title === 'Current Students Scholarship') return false;

    const searchTerm = filters.search.toLowerCase();
    const matchesSearch = 
      (payment.student_name || '').toLowerCase().includes(searchTerm) ||
      (payment.student_email || '').toLowerCase().includes(searchTerm) ||
      (payment.university_name || '').toLowerCase().includes(searchTerm) ||
      (payment.scholarship_title || '').toLowerCase().includes(searchTerm);

    const matchesUniversity = filters.university === 'all' || payment.university_id === filters.university;
    const matchesFeeType = filters.feeType === 'all' || payment.fee_type === filters.feeType;
    const matchesStatus = filters.status === 'all' || payment.status === filters.status;

    let matchesDate = true;
    if (filters.dateFrom || filters.dateTo) {
      const paymentDate = new Date(payment.payment_date || payment.created_at);
      if (filters.dateFrom) {
        matchesDate = matchesDate && paymentDate >= new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        matchesDate = matchesDate && paymentDate <= new Date(filters.dateTo);
      }
    }

    return matchesSearch && matchesUniversity && matchesFeeType && matchesStatus && matchesDate;
  });

  // Aplicar ordenação aos dados filtrados
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    // Tratamento especial para diferentes tipos de dados
    if (sortBy === 'amount') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    } else if (sortBy === 'created_at' || sortBy === 'payment_date') {
      aValue = new Date(aValue as string).getTime();
      bValue = new Date(bValue as string).getTime();
    } else if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    // Verificar se os valores são undefined
    if (aValue === undefined || bValue === undefined) {
      return 0;
    }

    if (aValue < bValue) {
      return sortOrder === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortOrder === 'asc' ? 1 : -1;
    }
    return 0;
  });
  
  const totalPages = Math.ceil(sortedPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayments = sortedPayments.slice(startIndex, endIndex);

  // Funções de navegação
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  // Gerar array de páginas para exibição
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Se temos poucas páginas, mostrar todas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Se temos muitas páginas, mostrar uma janela deslizante
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      // Ajustar se estamos no final
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  const handleExport = () => {
    const csvContent = [
      ['Student Name', 'Email', 'University', 'Scholarship', 'Fee Type', 'Amount', 'Status', 'Payment Date'].join(','),
      ...sortedPayments.map(payment => [
        payment.student_name,
        payment.student_email,
        payment.university_name,
        payment.scholarship_title || '',
        FEE_TYPES.find(ft => ft.value === payment.fee_type)?.label || payment.fee_type,
        payment.amount,
        payment.status,
        payment.payment_date || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleViewDetails = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setShowDetails(true);
  };


  const resetFilters = () => {
    setFilters({
      search: '',
      university: 'all',
      feeType: 'all',
      status: 'all',
      dateFrom: '',
      dateTo: ''
    });
    setCurrentPage(1); // Reset para primeira página
  };

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

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment data...</p>
        </div>
      </div>
    );
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
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Student Payments
            </button>
            <button
              onClick={() => setActiveTab('university-requests')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'university-requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              University Payment Requests
            </button>
            <button
              onClick={() => setActiveTab('affiliate-requests')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'affiliate-requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Affiliate Payment Requests
            </button>
            <button
              onClick={() => setActiveTab('zelle-payments')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'zelle-payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Zelle Payments
            </button>
          </nav>
          
          {/* Botão de Refresh */}
          <button
            onClick={forceRefreshAll}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Refresh all data"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Student Payments Tab Content */}
      {activeTab === 'payments' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Revenue</p>
              <p className="text-2xl font-bold">${formatCentsToDollars(stats.totalRevenue).toLocaleString()}</p>
            </div>
            <DollarSign size={32} className="text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Paid Payments</p>
              <p className="text-2xl font-bold">{stats.paidPayments}</p>
            </div>
            <CheckCircle size={32} className="text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Pending Payments</p>
              <p className="text-2xl font-bold">{stats.pendingPayments}</p>
            </div>
            <XCircle size={32} className="text-orange-200" />
          </div>
        </div>

        <div className="bg-[#05294E] rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Monthly Growth</p>
              <p className="text-2xl font-bold">+{stats.monthlyGrowth}%</p>
            </div>
            <TrendingUp size={32} className="text-purple-200" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Filter size={20} />
            Filters & Search
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Export CSV
            </button>
            <div className="flex bg-gray-100 border border-gray-200 rounded-xl p-1">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by student name, email, university, or scholarship..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
            {/* Sort Controls */}
            <div className="lg:col-span-5 mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Ordenação</h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Ordenar por:</label>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as keyof PaymentRecord)}
                  >
                    <option value="created_at">Data de Criação</option>
                    <option value="student_name">Nome do Estudante</option>
                    <option value="university_name">Universidade</option>
                    <option value="amount">Valor</option>
                    <option value="status">Status</option>
                    <option value="fee_type">Tipo de Taxa</option>
                    <option value="payment_date">Data de Pagamento</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Ordem:</label>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  >
                    <option value="desc">Decrescente</option>
                    <option value="asc">Crescente</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">University</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.university}
                onChange={(e) => setFilters({ ...filters, university: e.target.value })}
                title="Filter by university"
                aria-label="Filter by university"
              >
                <option value="all">All Universities</option>
                {universities.map(uni => (
                  <option key={uni.id} value={uni.id}>{uni.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fee Type</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.feeType}
                onChange={(e) => setFilters({ ...filters, feeType: e.target.value })}
                title="Filter by fee type"
                aria-label="Filter by fee type"
              >
                <option value="all">All Fee Types</option>
                {FEE_TYPES.map(fee => (
                  <option key={fee.value} value={fee.value}>{fee.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                title="Filter by payment status"
                aria-label="Filter by payment status"
              >
                {STATUS_OPTIONS.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                title="Filter from date"
                placeholder="Select start date"
                aria-label="Filter from date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                title="Filter to date"
                placeholder="Select end date"
                aria-label="Filter to date"
              />
            </div>

            <div className="lg:col-span-5 flex justify-end">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600">
          Showing {sortedPayments.length} of {payments.length} payments
          {totalPages > 1 && (
            <>
              <span className="mx-2">•</span>
              <span>
                Page {currentPage} of {totalPages}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Payments Table/Grid */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('student_name')}
                  >
                    <div className="flex items-center gap-1">
                      Student
                      {sortBy === 'student_name' && (
                        <span className="text-blue-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('university_name')}
                  >
                    <div className="flex items-center gap-1">
                      University
                      {sortBy === 'university_name' && (
                        <span className="text-blue-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('fee_type')}
                  >
                    <div className="flex items-center gap-1">
                      Fee Type
                      {sortBy === 'fee_type' && (
                        <span className="text-blue-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center gap-1">
                      Amount
                      {sortBy === 'amount' && (
                        <span className="text-blue-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {sortBy === 'status' && (
                        <span className="text-blue-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Date
                      {sortBy === 'created_at' && (
                        <span className="text-blue-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Try adjusting your search criteria or filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  currentPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{payment.student_name}</div>
                            <div className="text-sm text-gray-500">{payment.student_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">{payment.university_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          FEE_TYPES.find(ft => ft.value === payment.fee_type)?.color || 'bg-gray-100 text-gray-800'
                        }`}>
                          {FEE_TYPES.find(ft => ft.value === payment.fee_type)?.label || payment.fee_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        ${formatCentsToDollars(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const inferredMethod = payment.payment_method
                            || (payment.zelle_status ? 'zelle' : undefined)
                            || (payment.payment_proof_url ? 'zelle' : undefined)
                            || (typeof payment.id === 'string' && payment.id.startsWith('zelle-') ? 'zelle' : undefined)
                            || (typeof payment.id === 'string' && payment.id.startsWith('stripe-') ? 'stripe' : undefined);
                          const chipClass = inferredMethod === 'zelle'
                            ? 'bg-purple-100 text-purple-800'
                            : inferredMethod === 'stripe'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800';
                          const label = inferredMethod ? inferredMethod.charAt(0).toUpperCase() + inferredMethod.slice(1) : 'N/A';
                          return (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${chipClass}`}>
                              {label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          payment.status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : payment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {payment.status === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {payment.status === 'pending' && <XCircle className="w-3 h-3 mr-1" />}
                          {payment.status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {payment.payment_date 
                            ? new Date(payment.payment_date).toLocaleDateString()
                            : 'N/A'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(payment)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          <Eye size={16} />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentPayments.map((payment) => (
            <div key={payment.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-5 w-5 text-gray-500" />
                  <span className="font-bold text-gray-900">{payment.student_name}</span>
                </div>
                <div className="text-sm text-gray-600 mb-1">{payment.student_email}</div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{payment.university_name}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${FEE_TYPES.find(ft => ft.value === payment.fee_type)?.color || 'bg-gray-100 text-gray-800'}`}>{FEE_TYPES.find(ft => ft.value === payment.fee_type)?.label || payment.fee_type}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="font-bold text-green-700">${formatCentsToDollars(payment.amount)}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${payment.status === 'paid' ? 'bg-green-100 text-green-800' : payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span>
                </div>
              </div>
              <button
                onClick={() => handleViewDetails(payment)}
                className="mt-4 w-full bg-blue-600 text-white py-2.5 px-4 rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
                title="View details"
              >
                Details
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {sortedPayments.length > 0 && totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Informações da paginação */}
            <div className="text-sm text-gray-600">
              <span className="font-medium">
                Showing {startIndex + 1} to {Math.min(endIndex, sortedPayments.length)} of {sortedPayments.length}
              </span>
              <span className="ml-2">
                payments
              </span>
            </div>

            {/* Controles de navegação */}
            <div className="flex items-center gap-2">
              {/* Botão Primeira Página */}
              <button
                onClick={goToFirstPage}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Go to first page"
                aria-label="Go to first page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              {/* Botão Página Anterior */}
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Go to previous page"
                aria-label="Go to previous page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Números das páginas */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      page === currentPage
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    title={`Go to page ${page}`}
                    aria-label={`Go to page ${page}`}
                    aria-current={page === currentPage ? 'page' : undefined}
                  >
                    {page}
                  </button>
                ))}
              </div>

              {/* Botão Próxima Página */}
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Go to next page"
                aria-label="Go to next page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Botão Última Página */}
              <button
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Go to last page"
                aria-label="Go to last page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Seletor de itens por página */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-2 py-1 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                title="Items per page"
                aria-label="Items per page"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>per page</span>
            </div>
          </div>
        </div>
      )}
      </>)}

      {/* University Payment Requests Tab Content */}
      {activeTab === 'university-requests' && (
        <div className="space-y-6">
          {/* Stats Cards for University Requests */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{universityRequests.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {universityRequests.filter(r => r.status === 'pending').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {universityRequests.filter(r => r.status === 'approved').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${universityRequests.reduce((sum, r) => sum + r.amount_usd, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Available Balance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loadingBalance ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
                    ) : (
                      `$${adminBalance.toLocaleString()}`
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* University Requests List */}
          <div className="bg-white rounded-xl shadow border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
              <h2 className="text-lg font-semibold text-gray-900">University Payment Requests</h2>
              <p className="text-gray-600 mt-1">Manage payment requests from universities</p>
                </div>
                <div className="flex bg-gray-100 border border-gray-200 rounded-xl p-1">
                  <button
                    onClick={() => setUniversityRequestsViewMode('grid')}
                    className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                      universityRequestsViewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="Grid view"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setUniversityRequestsViewMode('list')}
                    className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                      universityRequestsViewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {loadingUniversityRequests ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : universityRequests.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No payment requests found</h3>
                <p className="text-gray-500">University payment requests will appear here when they are submitted</p>
              </div>
            ) : (
              <div className="p-6">
                {universityRequestsViewMode === 'grid' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {universityRequests.map((request) => (
                    <div 
                      key={request.id}
                      className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors cursor-pointer border"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRequestDetails(true);
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">
                            {request.university?.name || 'Unknown University'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {request.user?.full_name || request.user?.email || 'Unknown User'}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          request.status === 'paid' ? 'bg-green-100 text-green-800' :
                          request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>

                      <div className="mb-4">
                        <div className="text-2xl font-bold text-gray-900 mb-2">
                          ${request.amount_usd.toLocaleString()}
                        </div>
                        <p className="text-sm text-gray-600 capitalize">
                          {request.payout_method.replace('_', ' ')}
                        </p>
                      </div>

                      <div className="text-sm text-gray-500">
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>

                      {/* Action Buttons */}
                      {request.status === 'pending' && (
                        <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              approveUniversityRequest(request.id);
                            }}
                            className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openRejectModal(request.id);
                            }}
                            className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {request.status === 'approved' && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openMarkPaidModal(request.id);
                            }}
                            className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Mark as Paid
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // List View (Table)
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            University
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Method
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {universityRequests.map((request) => (
                          <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                    <Building2 className="h-5 w-5 text-gray-600" />
              </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {request.university?.name || 'Unknown University'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {request.user?.full_name || request.user?.email || 'Unknown User'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                <div className="font-medium">${request.amount_usd.toLocaleString()}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 capitalize">
                                {request.payout_method.replace('_', ' ')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                request.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                request.status === 'paid' ? 'bg-green-100 text-green-800' :
                                request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(request.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowRequestDetails(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                >
                                  <Eye size={16} />
                                  Details
                                </button>
                                
                                {request.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => approveUniversityRequest(request.id)}
                                      className="text-green-600 hover:text-green-900 flex items-center gap-1"
                                    >
                                      <CheckCircle size={16} />
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => openRejectModal(request.id)}
                                      className="text-red-600 hover:text-red-900 flex items-center gap-1"
                                    >
                                      <XCircle size={16} />
                                      Reject
                                    </button>
                                  </>
                                )}
                                
                                {request.status === 'approved' && (
                                  <button
                                                                          onClick={() => openMarkPaidModal(request.id)}
                                    className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                  >
                                    <DollarSign size={16} />
                                    Mark Paid
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      )}

      {/* Affiliate Payment Requests Tab */}
      {activeTab === 'affiliate-requests' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{affiliateRequests.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{affiliateRequests.filter(r => r.status === 'pending').length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">{affiliateRequests.filter(r => r.status === 'approved' || r.status === 'paid').length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Affiliate Total Requested</p>
                  <p className="text-2xl font-bold text-gray-900">${affiliateRequests.reduce((s,r)=> s + (Number(r.amount_usd)||0), 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Affiliate Requests List with Grid/List View */}
          <div className="bg-white rounded-xl shadow border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Affiliate Payment Requests</h2>
                  <p className="text-gray-600 mt-1">Manage payout requests submitted by affiliates</p>
                </div>
                <div className="flex bg-gray-100 border border-gray-200 rounded-xl p-1">
                  <button
                    onClick={() => setUniversityRequestsViewMode('grid')}
                    className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                      universityRequestsViewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="Grid view"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setUniversityRequestsViewMode('list')}
                    className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                      universityRequestsViewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {loadingAffiliateRequests ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : affiliateRequests.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No affiliate requests found</h3>
                <p className="text-gray-500">Affiliate payout requests will appear here when they are submitted</p>
              </div>
            ) : (
              <div className="p-6">
                {universityRequestsViewMode === 'grid' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {affiliateRequests.map((request) => (
                      <div 
                        key={request.id}
                        className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors cursor-pointer border"
                        onClick={() => {
                          setSelectedAffiliateRequest(request);
                          setShowAffiliateDetails(true);
                        }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg mb-1">
                              Affiliate Request
                            </h3>
                            <p className="text-sm text-gray-500">
                              ID: {String(request.referrer_user_id).slice(0,8)}...
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            request.status === 'paid' ? 'bg-green-100 text-green-800' :
                            request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </div>

                        <div className="mb-4">
                          <div className="text-2xl font-bold text-gray-900 mb-2">
                            ${request.amount_usd.toLocaleString()}
                          </div>
                          <p className="text-sm text-gray-600 capitalize">
                            {request.payout_method.replace('_', ' ')}
                          </p>
                        </div>

                        <div className="text-sm text-gray-500">
                          {new Date(request.created_at).toLocaleDateString()}
                        </div>

                        {/* Action Buttons */}
                        {request.status === 'pending' && (
                          <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                approveAffiliateRequest(request.id);
                              }}
                              className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAffiliateRejectModal(request);
                              }}
                              className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {request.status === 'approved' && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAffiliateMarkPaidModal(request);
                              }}
                              className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Mark as Paid
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // List View (Table)
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Affiliate
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Method
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {affiliateRequests.map((request) => (
                            <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                      <User className="h-5 w-5 text-gray-600" />
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      Affiliate
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      ID: {String(request.referrer_user_id).slice(0,8)}...
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  <div className="font-medium">${request.amount_usd.toLocaleString()}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 capitalize">
                                  {request.payout_method.replace('_', ' ')}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  request.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                  request.status === 'paid' ? 'bg-green-100 text-green-800' :
                                  request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(request.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => {
                                      setSelectedAffiliateRequest(request);
                                      setShowAffiliateDetails(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                  >
                                    <Eye size={16} />
                                    Details
                                  </button>
                                  
                                  {request.status === 'pending' && (
                                    <>
                                      <button
                                        onClick={() => approveAffiliateRequest(request.id)}
                                        className="text-green-600 hover:text-green-900 flex items-center gap-1"
                                      >
                                        <CheckCircle size={16} />
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => openAffiliateRejectModal(request)}
                                        className="text-red-600 hover:text-red-900 flex items-center gap-1"
                                      >
                                        <XCircle size={16} />
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  
                                  {request.status === 'approved' && (
                                    <button
                                      onClick={() => openAffiliateMarkPaidModal(request)}
                                      className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                    >
                                      <DollarSign size={16} />
                                      Mark Paid
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* University Request Details Modal */}
      {showRequestDetails && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Payment Request Details</h3>
                <button 
                  onClick={() => setShowRequestDetails(false)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* University Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">University</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-lg font-semibold">{selectedRequest.university?.name}</p>
                    <p className="text-gray-600">{selectedRequest.university?.location}</p>
                  </div>
                </div>

                {/* Request Details */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Request Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-semibold">${selectedRequest.amount_usd.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method:</span>
                      <span className="font-semibold capitalize">{selectedRequest.payout_method.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedRequest.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        selectedRequest.status === 'paid' ? 'bg-green-100 text-green-800' :
                        selectedRequest.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span>{new Date(selectedRequest.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4">


                    {selectedRequest.payout_details_preview ? (
                      (() => {
                        const details = selectedRequest.payout_details_preview as Record<string, any>;
                        const method = String(selectedRequest.payout_method);
                        

                        
                        if (method === 'zelle') {
                          return (
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-900">Zelle Information</h5>
                              <div className="space-y-2">
                                {details.email && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Email:</span>
                                    <span className="font-medium">{details.email}</span>
                                  </div>
                                )}
                                {details.phone && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Phone:</span>
                                    <span className="font-medium">{details.phone}</span>
                                  </div>
                                )}
                                {details.name && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Name:</span>
                                    <span className="font-medium">{details.name}</span>
                                  </div>
                                )}
                                {/* Fallback para mostrar todos os campos disponíveis se nenhum dos campos específicos existir */}
                                {!details.email && !details.phone && !details.name && (
                                  <div className="text-sm text-gray-600">
                                    <p className="mb-2">Available fields:</p>
                                    {Object.entries(details).map(([key, value]) => (
                                      <div key={key} className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                                        <span className="font-medium">{String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        } else if (method === 'bank_transfer') {
                          return (
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-900">Bank Transfer Information</h5>
                              <div className="space-y-2">
                                {details.bank_name && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Bank Name:</span>
                                    <span className="font-medium">{details.bank_name}</span>
                                  </div>
                                )}
                                {details.account_number && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Account Number:</span>
                                    <span className="font-medium font-mono">{details.account_number}</span>
                                  </div>
                                )}
                                {details.routing_number && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Routing Number:</span>
                                    <span className="font-medium font-mono">{details.routing_number}</span>
                                  </div>
                                )}
                                {details.account_type && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Account Type:</span>
                                    <span className="font-medium capitalize">{details.account_type}</span>
                                  </div>
                                )}
                                {/* Fallback para mostrar todos os campos disponíveis se nenhum dos campos específicos existir */}
                                {!details.bank_name && !details.account_number && !details.routing_number && !details.account_type && (
                                  <div className="text-sm text-gray-600">
                                    <p className="mb-2">Available fields:</p>
                                    {Object.entries(details).map(([key, value]) => (
                                      <div key={key} className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                                        <span className="font-medium">{String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        } else if (method === 'stripe') {
                          return (
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-900">Stripe Information</h5>
                              <div className="space-y-2">
                                {details.stripe_email && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Email:</span>
                                    <span className="font-medium">{details.stripe_email}</span>
                                  </div>
                                )}
                                {details.account_id && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Account ID:</span>
                                    <span className="font-medium font-mono">{details.account_id}</span>
                                  </div>
                                )}
                                {details.customer_id && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Customer ID:</span>
                                    <span className="font-medium font-mono">{details.customer_id}</span>
                                  </div>
                                )}
                                {details.stripe_account_id && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Stripe Account ID:</span>
                                    <span className="font-medium font-mono">{details.stripe_account_id}</span>
                                  </div>
                                )}
                                {/* Fallback para mostrar todos os campos disponíveis se nenhum dos campos específicos existir */}
                                {!details.stripe_email && !details.account_id && !details.customer_id && !details.stripe_account_id && (
                                  <div className="text-sm text-gray-600">
                                    <p className="mb-2">Available fields:</p>
                                    {Object.entries(details).map(([key, value]) => (
                                      <div key={key} className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                                        <span className="font-medium">{String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        } else {
                          // Fallback para métodos não reconhecidos
                          return (
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-900 capitalize">{method.replace('_', ' ')} Information</h5>
                              <div className="space-y-2">
                                {Object.entries(details).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                                    <span className="font-medium">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                      })()
                    ) : (
                      <div className="text-center py-4">
                        <CreditCard className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-gray-500">No payment details available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Notes */}
                {selectedRequest.admin_notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Admin Notes</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700">{selectedRequest.admin_notes}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-3 pt-4 border-t">
                  <button
                    onClick={() => openAddNotesModal(selectedRequest.id)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Add Notes
                  </button>
                  
                  {selectedRequest.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          approveUniversityRequest(selectedRequest.id);
                          setShowRequestDetails(false);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          openRejectModal(selectedRequest.id);
                          setShowRequestDetails(false);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  
                  {selectedRequest.status === 'approved' && (
                    <button
                      onClick={() => {
                          openMarkPaidModal(selectedRequest.id);
                        setShowRequestDetails(false);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Mark as Paid
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zelle Payments Tab Content */}
      {activeTab === 'zelle-payments' && (
        <div className="space-y-6">
          {/* Stats Cards for Zelle Payments */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Zelle Payments</p>
                  <p className="text-2xl font-bold text-gray-900">{zellePayments.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {zellePayments.filter(p => p.zelle_status === 'pending_verification').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {zellePayments.filter(p => p.zelle_status === 'approved').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {zellePayments.filter(p => p.zelle_status === 'rejected').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Zelle Payments List */}
          <div className="bg-white rounded-xl shadow border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Zelle Payments</h2>
                  <p className="text-gray-600 mt-1">Review and approve Zelle payment proofs</p>
                </div>
                <div className="flex bg-gray-100 border border-gray-200 rounded-xl p-1">
                  <button
                    onClick={() => setZelleViewMode('grid')}
                    className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                      zelleViewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="Grid view"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setZelleViewMode('list')}
                    className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                      zelleViewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

              {loadingZellePayments ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : zellePayments.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Zelle Payments</h3>
                  <p className="text-gray-500">No Zelle payments are currently pending review.</p>
                </div>
              ) : (
              <div className="p-6">
                {zelleViewMode === 'grid' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {zellePayments.map((payment) => (
                      <div 
                        key={payment.id}
                        className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors cursor-pointer border"
                      >
                        <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg mb-1">
                              {payment.student_name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {payment.student_email}
                            </p>
                            <p className="text-sm text-gray-500">
                              {payment.university_name}
                            </p>
                        </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            payment.zelle_status === 'pending_verification' ? 'bg-yellow-100 text-yellow-800' :
                            payment.zelle_status === 'approved' ? 'bg-green-100 text-green-800' :
                            payment.zelle_status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {payment.zelle_status === 'pending_verification' && <Clock className="w-3 h-3 mr-1" />}
                            {payment.zelle_status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {payment.zelle_status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                            {payment.zelle_status === 'pending_verification' ? 'Pending Review' :
                             payment.zelle_status === 'approved' ? 'Approved' :
                             payment.zelle_status === 'rejected' ? 'Rejected' :
                             payment.zelle_status}
                            </span>
                      </div>
                      
                        <div className="mb-4">
                          <div className="text-2xl font-bold text-gray-900 mb-2">
                            ${formatCentsToDollars(payment.amount)}
                        </div>
                          <p className="text-sm text-gray-600 capitalize">
                            {payment.fee_type.replace('_', ' ')}
                          </p>
                        </div>

                        <div className="text-sm text-gray-500 mb-4">
                          {new Date(payment.created_at).toLocaleDateString()}
                      </div>

                      {payment.payment_proof_url && (
                        <div className="mb-4">
                          <button
                            onClick={() => openZelleProofModal(payment.id)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            <Eye size={16} />
                            Proof
                          </button>
                        </div>
                      )}

                      {payment.admin_notes && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Admin Notes:</strong> {payment.admin_notes}
                          </p>
                        </div>
                      )}

                        {/* Action Buttons */}
                        {payment.zelle_status === 'pending_verification' && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openZelleReviewModal(payment.id);
                              }}
                              className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Review Payment
                            </button>
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openZelleNotesModal(payment.id);
                            }}
                            className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Add Notes
                          </button>
                        </div>

                        {/* Botão para editar scholarship_id */}
                        <div className="mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openZelleEditModal(payment.id);
                            }}
                            className="w-full px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            Edit Scholarship ID
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // List View (Table)
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Student
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Fee Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {zellePayments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                      <User className="h-5 w-5 text-gray-600" />
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {payment.student_name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {payment.student_email}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 capitalize">
                                  {payment.fee_type.replace('_', ' ')}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  <div className="font-medium">${formatCentsToDollars(payment.amount)}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  payment.zelle_status === 'pending_verification' ? 'bg-yellow-100 text-yellow-800' :
                                  payment.zelle_status === 'approved' ? 'bg-green-100 text-green-800' :
                                  payment.zelle_status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {payment.zelle_status === 'pending_verification' && <Clock className="w-3 h-3 mr-1" />}
                                  {payment.zelle_status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                                  {payment.zelle_status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                                  {payment.zelle_status === 'pending_verification' ? 'Pending Review' :
                                   payment.zelle_status === 'approved' ? 'Approved' :
                                   payment.zelle_status === 'rejected' ? 'Rejected' :
                                   payment.zelle_status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(payment.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end space-x-2">
                                                                     {payment.payment_proof_url && (
                                     <button
                                       onClick={() => openZelleProofModal(payment.id)}
                                       className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                     >
                                       <Eye size={16} />
                                       Proof
                                     </button>
                                   )}
                                  
                                  {payment.zelle_status === 'pending_verification' && (
                            <button
                              onClick={() => openZelleReviewModal(payment.id)}
                              className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                            >
                              <CheckCircle size={16} />
                              Review Payment
                            </button>
                        )}
                        
                        <button
                          onClick={() => openZelleNotesModal(payment.id)}
                                    className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
                        >
                                    <MessageSquare size={16} />
                                    Notes
                        </button>
                        
                        {/* Botão para editar scholarship_id */}
                        <button
                          onClick={() => openZelleEditModal(payment.id)}
                          className="text-orange-600 hover:text-orange-900 flex items-center gap-1"
                          title="Edit Scholarship ID"
                        >
                          <Edit size={16} />
                          Edit
                        </button>
                      </div>
                              </td>
                            </tr>
                  ))}
                        </tbody>
                      </table>
                    </div>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {showDetails && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Payment Details</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close modal"
                  aria-label="Close payment details modal"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Student</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPayment.student_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPayment.student_email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">University</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPayment.university_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Scholarship</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPayment.scholarship_title || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Fee Type</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {FEE_TYPES.find(ft => ft.value === selectedPayment.fee_type)?.label || selectedPayment.fee_type}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Amount</label>
                    <p className="mt-1 text-sm text-gray-900 font-semibold">${formatCentsToDollars(selectedPayment.amount)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <p className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedPayment.status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : selectedPayment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Payment Method</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {(() => {
                        const inferredMethod = selectedPayment.payment_method
                          || (selectedPayment.zelle_status ? 'zelle' : undefined)
                          || (selectedPayment.payment_proof_url ? 'zelle' : undefined)
                          || (typeof selectedPayment.id === 'string' && selectedPayment.id.startsWith('zelle-') ? 'zelle' : undefined)
                          || (typeof selectedPayment.id === 'string' && selectedPayment.id.startsWith('stripe-') ? 'stripe' : undefined);
                        return inferredMethod ? inferredMethod.charAt(0).toUpperCase() + inferredMethod.slice(1) : 'N/A';
                      })()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Payment Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedPayment.payment_date 
                        ? new Date(selectedPayment.payment_date).toLocaleString()
                        : 'Not paid yet'
                      }
                    </p>
                  </div>
                </div>

                {selectedPayment.stripe_session_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Stripe Session ID</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-100 p-2 rounded">
                      {selectedPayment.stripe_session_id}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Request Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Reject Payment Request</h3>
              <button 
                onClick={() => setShowRejectModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rejection
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a reason for rejecting this payment request..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => rejectUniversityRequest(selectedRequest.id)}
                  disabled={!rejectReason.trim() || actionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {showMarkPaidModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Mark as Paid</h3>
              <button 
                onClick={() => setShowMarkPaidModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Reference (Optional)
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Transaction ID, check number, or other reference..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowMarkPaidModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => markUniversityRequestAsPaid(selectedRequest.id)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Marking as Paid...' : 'Mark as Paid'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin Notes Modal */}
      {showAddNotesModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Add Admin Notes</h3>
              <button 
                onClick={() => setShowAddNotesModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any administrative notes or comments..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowAddNotesModal(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => addAdminNotes(selectedRequest.id)}
                  disabled={!adminNotes.trim() || actionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Adding Notes...' : 'Add Notes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Zelle Payment Modals - Legacy (removed) */}
      {false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Approve Zelle Payment</h3>
              <button 
                onClick={() => setShowZelleReviewModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <p className="text-green-800 font-medium">Payment Approval</p>
                </div>
                <p className="text-green-700 text-sm mt-2">
                  You are about to approve the {selectedZellePayment?.fee_type?.replace('_', ' ')} fee payment 
                  of ${formatCentsToDollars(selectedZellePayment?.amount || 0)} for {selectedZellePayment?.student_name}.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowZelleReviewModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => selectedZellePayment && approveZellePayment(selectedZellePayment.id)}
                  disabled={zelleActionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {zelleActionLoading ? 'Approving...' : 'Approve Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Zelle Payment Modal */}
      {false && selectedZellePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Reject Zelle Payment</h3>
              <button 
                onClick={() => setShowZelleReviewModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-red-800 font-medium">Payment Rejection</p>
                </div>
                <p className="text-red-700 text-sm mt-2">
                  You are about to reject the {selectedZellePayment?.fee_type?.replace('_', ' ')} fee payment 
                  of ${formatCentsToDollars(selectedZellePayment?.amount || 0)} for {selectedZellePayment?.student_name}.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rejection
                </label>
                
                {/* Opções pré-definidas */}
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">Common rejection reasons:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Proof illegible or incomplete',
                      'Incorrect amount',
                      'Proof does not match payment',
                      'Incorrect payment information',
                      'Proof too old',
                      'Missing identification on proof'
                    ].map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setZelleRejectReason(reason)}
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full border border-gray-300 transition-colors"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={zelleRejectReason}
                  onChange={(e) => setZelleRejectReason(e.target.value)}
                  placeholder="Describe the reason for payment rejection. This text will be sent to the student via notification..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowZelleReviewModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => selectedZellePayment && rejectZellePayment(selectedZellePayment.id)}
                  disabled={!zelleRejectReason.trim() || zelleActionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {zelleActionLoading ? 'Rejecting...' : 'Reject Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Zelle Admin Notes Modal */}
      {showZelleNotesModal && selectedZellePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Add Admin Notes</h3>
              <button 
                onClick={() => setShowZelleNotesModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes for Zelle Payment
                </label>
                <textarea
                  value={zelleAdminNotes}
                  onChange={(e) => setZelleAdminNotes(e.target.value)}
                  placeholder="Add any administrative notes or comments about this Zelle payment..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setShowZelleNotesModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => addZelleAdminNotes(selectedZellePayment.id)}
                disabled={!zelleAdminNotes.trim() || zelleActionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {zelleActionLoading ? 'Adding Notes...' : 'Add Notes'}
              </button>
            </div>
          </div>
        </div>
      )}





      {/* Affiliate Request Details Modal */}
      {showAffiliateDetails && selectedAffiliateRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Affiliate Payment Request Details</h3>
                <button 
                  onClick={() => setShowAffiliateDetails(false)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Affiliate Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Affiliate</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-lg font-semibold">Affiliate Request</p>
                    <p className="text-gray-600">ID: {selectedAffiliateRequest.referrer_user_id}</p>
                  </div>
                </div>

                {/* Request Details */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Request Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-semibold">${selectedAffiliateRequest.amount_usd.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method:</span>
                      <span className="font-semibold capitalize">{selectedAffiliateRequest.payout_method.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedAffiliateRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedAffiliateRequest.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        selectedAffiliateRequest.status === 'paid' ? 'bg-green-100 text-green-800' :
                        selectedAffiliateRequest.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedAffiliateRequest.status.charAt(0).toUpperCase() + selectedAffiliateRequest.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span>{new Date(selectedAffiliateRequest.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {selectedAffiliateRequest.payout_details ? (
                      <div className="space-y-2">
                        {Object.entries(selectedAffiliateRequest.payout_details as Record<string, any>).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <CreditCard className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-gray-500">No payment details available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Notes */}
                {selectedAffiliateRequest.admin_notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Admin Notes</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700">{selectedAffiliateRequest.admin_notes}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-3 pt-4 border-t">
                  <button
                    onClick={() => openAffiliateNotesModal(selectedAffiliateRequest)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Add Notes
                  </button>
                  
                  {selectedAffiliateRequest.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          approveAffiliateRequest(selectedAffiliateRequest.id);
                          setShowAffiliateDetails(false);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          openAffiliateRejectModal(selectedAffiliateRequest);
                          setShowAffiliateDetails(false);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  
                  {selectedAffiliateRequest.status === 'approved' && (
                    <button
                      onClick={() => {
                        openAffiliateMarkPaidModal(selectedAffiliateRequest);
                        setShowAffiliateDetails(false);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Mark as Paid
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Affiliate Reject Modal */}
      {showAffiliateRejectModal && selectedAffiliateRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Reject Affiliate Payment Request</h3>
              <button 
                onClick={() => setShowAffiliateRejectModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rejection
                </label>
                <textarea
                  value={affiliateRejectReason}
                  onChange={(e) => setAffiliateRejectReason(e.target.value)}
                  placeholder="Please provide a reason for rejecting this affiliate payment request..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowAffiliateRejectModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => rejectAffiliateRequest(selectedAffiliateRequest.id)}
                  disabled={!affiliateRejectReason.trim() || affiliateActionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {affiliateActionLoading ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Affiliate Mark as Paid Modal */}
      {showAffiliateMarkPaidModal && selectedAffiliateRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Mark Affiliate Request as Paid</h3>
              <button 
                onClick={() => setShowAffiliateMarkPaidModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Reference (Optional)
                </label>
                <input
                  type="text"
                  value={affiliatePaymentReference}
                  onChange={(e) => setAffiliatePaymentReference(e.target.value)}
                  placeholder="Transaction ID, check number, or other reference..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowAffiliateMarkPaidModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => markAffiliateRequestPaid(selectedAffiliateRequest.id)}
                  disabled={affiliateActionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {affiliateActionLoading ? 'Marking as Paid...' : 'Mark as Paid'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Affiliate Add Admin Notes Modal */}
      {showAffiliateNotesModal && selectedAffiliateRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Add Admin Notes</h3>
              <button 
                onClick={() => setShowAffiliateNotesModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes
                </label>
                <textarea
                  value={affiliateAdminNotes}
                  onChange={(e) => setAffiliateAdminNotes(e.target.value)}
                  placeholder="Add any administrative notes or comments..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowAffiliateNotesModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => addAffiliateAdminNotes(selectedAffiliateRequest.id)}
                  disabled={!affiliateAdminNotes.trim() || affiliateActionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {affiliateActionLoading ? 'Adding Notes...' : 'Add Notes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar scholarship_id do Zelle */}
      {showZelleEditModal && selectedZellePaymentForEdit && (
        <div className="modal-overlay" onClick={() => setShowZelleEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Scholarship ID</h3>
              <button className="close-btn" onClick={() => setShowZelleEditModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Estudante:</strong> {selectedZellePaymentForEdit.student_name}</p>
              <p><strong>Email:</strong> {selectedZellePaymentForEdit.student_email}</p>
              <p><strong>Valor:</strong> ${selectedZellePaymentForEdit.amount}</p>
              
              <div className="form-group mt-4">
                <label htmlFor="scholarship-select">Selecionar Scholarship:</label>
                <select 
                  id="scholarship-select"
                  value={selectedScholarshipId} 
                  onChange={(e) => setSelectedScholarshipId(e.target.value)}
                  className="form-control"
                >
                  <option value="">Selecione uma scholarship...</option>
                  {availableScholarships.map(app => (
                    <option key={app.id} value={app.scholarship_id}>
                      {app.scholarships?.title || `Scholarship ${app.scholarship_id}`} (ID: {app.scholarship_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowZelleEditModal(false)}
                disabled={editingZellePayment}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveZelleEdit}
                disabled={!selectedScholarshipId || editingZellePayment}
              >
                {editingZellePayment ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zelle Proof Modal */}
      {showZelleProofModal && selectedZelleProofUrl && (
        <DocumentViewerModal
          documentUrl={selectedZelleProofUrl}
          fileName={selectedZelleProofFileName}
          onClose={() => setShowZelleProofModal(false)}
        />
      )}
    </div>
  );
};

export default PaymentManagement; 