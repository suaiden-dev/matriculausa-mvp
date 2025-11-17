import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Clock, CheckCircle, Loader2, Building, DollarSign, AlertCircle, GraduationCap, FileText, XCircle, Calendar, X, ArrowLeft, RefreshCw, ChevronDown } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { StepProps } from '../types';
import { useTranslation } from 'react-i18next';
import { useFeeConfig } from '../../../hooks/useFeeConfig';
import { ScholarshipConfirmationModal } from '../../../components/ScholarshipConfirmationModal';
import { convertCentsToDollars } from '../../../utils/currency';
import { ZelleCheckout } from '../../../components/ZelleCheckout';
import { usePaymentBlocked } from '../../../hooks/usePaymentBlocked';

interface ApplicationWithScholarship {
  id: string;
  status: string;
  applied_at: string;
  documents?: any;
  is_application_fee_paid?: boolean;
  is_scholarship_fee_paid?: boolean;
  scholarship_id: string;
  scholarships: {
    id: string;
    title: string;
    annual_value_with_scholarship: number;
    level: string;
    university_id?: string;
    application_fee_amount?: number;
    universities: {
      id: string;
      name: string;
      logo_url?: string;
    };
  };
}

export const WaitingApprovalStep: React.FC<StepProps & { onComplete?: () => void }> = ({ onNext, onComplete }) => {
  const { t } = useTranslation();
  const { user, userProfile } = useAuth();
  const { getFeeAmount, formatFeeAmount } = useFeeConfig(user?.id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checking, setChecking] = useState(false);
  const [applications, setApplications] = useState<ApplicationWithScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isCheckingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estados para checklist de documentos
  const [openChecklists, setOpenChecklists] = useState<Record<string, boolean>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  
  // Estado para controlar expansão/colapso da seção de aplicações pendentes
  const [showPendingApplications, setShowPendingApplications] = useState(false);
  
  // Mobile: controlar expansão/colapso dos detalhes de cada aplicação
  const [mobileExpandedApps, setMobileExpandedApps] = useState<Record<string, boolean>>({});
  const toggleMobileExpanded = (applicationId: string) => {
    setMobileExpandedApps(prev => ({
      ...prev,
      [applicationId]: !prev[applicationId]
    }));
  };

  // Estados para modais de pagamento
  const [pendingApplication, setPendingApplication] = useState<ApplicationWithScholarship | null>(null);
  const [pendingScholarshipFeeApplication, setPendingScholarshipFeeApplication] = useState<ApplicationWithScholarship | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showScholarshipFeeModal, setShowScholarshipFeeModal] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [isProcessingScholarshipFeeCheckout, setIsProcessingScholarshipFeeCheckout] = useState(false);
  
  // Estados para rastrear pagamentos Zelle por aplicação
  const [zellePaymentStatus, setZellePaymentStatus] = useState<Record<string, {
    status: 'processing' | 'rejected' | null;
    rejectionReason?: string;
    feeType?: 'application_fee' | 'scholarship_fee';
  }>>({});
  
  // Hook para verificar pagamentos bloqueados (verifica todos os tipos de pagamento)
  const { isBlocked, pendingPayment, loading: paymentBlockedLoading } = usePaymentBlocked();

  // Verificar pagamentos pendentes e atualizar status para cada aplicação
  useEffect(() => {
    if (paymentBlockedLoading || !user?.id) return;

    const checkAllPayments = async () => {
      try {
        // Buscar todos os pagamentos Zelle pendentes/rejeitados do usuário
        const { data: payments } = await supabase
          .from('zelle_payments')
          .select('id, fee_type, status, admin_notes, metadata')
          .eq('user_id', user.id)
          .in('status', ['pending', 'pending_verification', 'rejected'])
          .order('created_at', { ascending: false });

        if (!payments || payments.length === 0) {
          setZellePaymentStatus({});
          return;
        }

        const statusMap: Record<string, {
          status: 'processing' | 'rejected' | null;
          rejectionReason?: string;
          feeType?: 'application_fee' | 'scholarship_fee';
        }> = {};

        // Para cada pagamento, encontrar a aplicação correspondente
        for (const payment of payments) {
          const applicationId = payment.metadata?.application_id;
          const scholarshipId = payment.metadata?.selected_scholarship_id;
          
          if (!applicationId && !scholarshipId) continue;

          const matchingApp = applications.find(app => 
            app.id === applicationId ||
            app.scholarship_id === scholarshipId
          );

          if (!matchingApp) continue;

          const key = `${matchingApp.id}_${payment.fee_type}`;
          
          if (payment.status === 'rejected') {
            statusMap[key] = {
              status: 'rejected',
              rejectionReason: payment.admin_notes || undefined,
              feeType: payment.fee_type as 'application_fee' | 'scholarship_fee'
            };
          } else if (payment.status === 'pending' || payment.status === 'pending_verification') {
            statusMap[key] = {
              status: 'processing',
              feeType: payment.fee_type as 'application_fee' | 'scholarship_fee'
            };
          }
        }

        setZellePaymentStatus(statusMap);
      } catch (error) {
        console.error('Erro ao verificar status dos pagamentos:', error);
      }
    };

    checkAllPayments();
    
    // Verificar a cada 10 segundos
    const interval = setInterval(checkAllPayments, 10000);
    return () => clearInterval(interval);
  }, [paymentBlockedLoading, applications, user?.id]);

  // Labels amigáveis para os documentos principais
  const DOCUMENT_LABELS: Record<string, string> = {
    passport: t('studentDashboard.myApplications.documents.passport'),
    diploma: t('studentDashboard.myApplications.documents.highSchoolDiploma'),
    funds_proof: t('studentDashboard.myApplications.documents.proofOfFunds'),
  };

  // Helper: calcular Application Fee exibida considerando dependentes (legacy)
  const getApplicationFeeWithDependents = (baseInCents: number): number => {
    const baseInDollars = convertCentsToDollars(baseInCents);
    const systemType = (userProfile?.system_type as any) || 'legacy';
    const deps = Number(userProfile?.dependents) || 0;
    return systemType === 'legacy' && deps > 0 ? baseInDollars + deps * 100 : baseInDollars;
  };

  // Função para formatar valores monetários
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'under_review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Função para obter ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircle;
      case 'rejected': return AlertCircle;
      case 'under_review': return Clock;
      case 'pending': return Clock;
      default: return Clock;
    }
  };

  // Função para obter label do status
  const getStatusLabel = (status: string) => {
    if (status === 'approved') return t('studentDashboard.myApplications.statusLabels.approvedByUniversity') || 'Approved';
    if (status === 'rejected') return t('studentDashboard.myApplications.statusLabels.notSelectedForScholarship') || 'Rejected';
    if (status === 'under_review') return 'Under Review';
    if (status === 'pending') return 'Pending';
    return status.replace('_', ' ').toUpperCase();
  };

  // Função para obter descrição detalhada do status (similar ao MyApplications)
  const getStatusDescription = (application: ApplicationWithScholarship) => {
    const status = application.status;
    const hasDocuments = (application as any)?.documents && Array.isArray((application as any).documents) && (application as any).documents.length > 0;
    const hasPendingDocuments = hasDocuments && (application as any).documents.some((doc: any) => 
      doc.status === 'pending' || doc.status === 'under_review' || doc.status === 'changes_requested'
    );

    switch (status) {
      case 'rejected':
        return {
          title: t('studentDashboard.myApplications.statusDescriptions.applicationNotSelected.title'),
          description: t('studentDashboard.myApplications.statusDescriptions.applicationNotSelected.description'),
          nextSteps: t('studentDashboard.myApplications.statusDescriptions.applicationNotSelected.nextSteps', { returnObjects: true }) as string[],
          icon: '📝',
          color: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      
      case 'under_review':
        return {
          title: t('studentDashboard.myApplications.statusDescriptions.applicationUnderReview.title'),
          description: t('studentDashboard.myApplications.statusDescriptions.applicationUnderReview.description'),
          nextSteps: t('studentDashboard.myApplications.statusDescriptions.applicationUnderReview.nextSteps', { returnObjects: true }) as string[],
          icon: '🔍',
          color: 'text-amber-700',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200'
        };
      
      case 'pending':
      default:
        if (hasPendingDocuments) {
          return {
            title: t('studentDashboard.myApplications.statusDescriptions.documentsUnderUniversityReview.title'),
            description: t('studentDashboard.myApplications.statusDescriptions.documentsUnderUniversityReview.description'),
            nextSteps: t('studentDashboard.myApplications.statusDescriptions.documentsUnderUniversityReview.nextSteps', { returnObjects: true }) as string[],
            icon: '📋',
            color: 'text-blue-700',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200'
          };
        } else {
          return {
            title: t('studentDashboard.myApplications.statusDescriptions.applicationSubmitted.title'),
            description: t('studentDashboard.myApplications.statusDescriptions.applicationSubmitted.description'),
            nextSteps: t('studentDashboard.myApplications.statusDescriptions.applicationSubmitted.nextSteps', { returnObjects: true }) as string[],
            icon: '📤',
            color: 'text-slate-700',
            bgColor: 'bg-slate-50',
            borderColor: 'border-slate-200'
          };
        }
    }
  };

  // Função para toggle do checklist
  const toggleChecklist = (applicationId: string) => {
    setOpenChecklists(prev => ({
      ...prev,
      [applicationId]: !prev[applicationId]
    }));
  };

  // Função para gerar chave única do documento
  const docKey = (applicationId: string, type: string) => `${applicationId}:${type}`;

  // Normaliza o array de documentos da aplicação
  const parseApplicationDocuments = (documents: any): { type: string; status?: string; review_notes?: string; rejection_reason?: string }[] => {
    if (!Array.isArray(documents)) return [];
    if (documents.length === 0) return [];
    if (typeof documents[0] === 'string') {
      return (documents as string[]).map((t) => ({ type: t }));
    }
    return (documents as any[]).map((d) => ({ 
      type: d.type, 
      status: d.status, 
      review_notes: d.review_notes,
      rejection_reason: d.rejection_reason
    }));
  };

  // Função para selecionar arquivo
  const handleSelectDocFile = (applicationId: string, type: string, file: File | null) => {
    setSelectedFiles(prev => ({ ...prev, [docKey(applicationId, type)]: file }));
  };

  // Função para fazer upload de documento
  const handleUploadDoc = async (applicationId: string, type: string) => {
    const key = docKey(applicationId, type);
    const file = selectedFiles[key];
    if (!user?.id || !file) return;
    setUploading(prev => ({ ...prev, [key]: true }));
    try {
      const path = `${user.id}/${applicationId}-${type}-${Date.now()}-${file.name}`;
      const { data, error: upErr } = await supabase.storage
        .from('student-documents')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const publicUrl = supabase.storage.from('student-documents').getPublicUrl(data?.path || path).data.publicUrl;
      if (!publicUrl) throw new Error('Failed to get file URL');
      
      // Log no histórico do aluno
      await supabase.from('student_documents').insert({ user_id: user.id, type, file_url: publicUrl, status: 'under_review' });

      // Atualizar documentos da aplicação
      const app = applications.find(a => a.id === applicationId);
      const currentDocs: any[] = (app as any)?.documents || [];
      const normalized = parseApplicationDocuments(currentDocs);
      const idx = normalized.findIndex(d => d.type === type);
      const newDoc = { type, url: publicUrl, status: 'under_review', review_notes: undefined as any } as any;
      let newDocs: any[];
      if (idx >= 0) {
        // preservar outros docs com estrutura o mais completa possível
        newDocs = (currentDocs as any[]).map((d: any) => d.type === type ? { ...(d || {}), ...newDoc } : d);
      } else {
        const base = Array.isArray(currentDocs) ? [...currentDocs] : [];
        newDocs = [...base, newDoc];
      }
      await supabase.from('scholarship_applications').update({ documents: newDocs }).eq('id', applicationId);
      
      // Notificar universidade sobre o reenvio do documento
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token && app?.scholarships?.university_id) {
          const documentLabel = DOCUMENT_LABELS[type] || type;
          const notificationPayload = {
            user_id: user.id,
            application_id: applicationId,
            document_type: type,
            document_label: documentLabel,
            university_id: app.scholarships.university_id,
            scholarship_title: app.scholarships.title,
            is_reupload: true
          };
          
          await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/notify-university-document-reupload`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${session.access_token}` 
            },
            body: JSON.stringify(notificationPayload),
          });
        }
      } catch (notificationError) {
        console.error('Erro ao notificar universidade sobre reenvio:', notificationError);
      }
      
      // Atualiza estado local
      setApplications(prev => prev.map(a => a.id === applicationId ? ({ ...a, documents: newDocs } as any) : a));
      // Limpa seleção
      setSelectedFiles(prev => ({ ...prev, [key]: null }));
    } catch (e) {
      console.error('Error uploading document:', e);
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  // Buscar aplicações - recarregar quando userProfile mudar ou quando o componente montar
  useEffect(() => {
    let isMounted = true;
    
    const fetchApplications = async () => {
      if (!userProfile?.id) {
        if (isMounted) {
          setLoading(false);
          setApplications([]);
        }
        return;
      }

      try {
        console.log('🔍 [WaitingApprovalStep] Fetching applications for user:', userProfile.id);
        
        // Buscar TODAS as aplicações do aluno (similar ao MyApplications) - incluindo documents
        const { data, error } = await supabase
          .from('scholarship_applications')
          .select(`*, scholarships(*, universities(id, name, logo_url))`)
          .eq('student_id', userProfile.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('🔍 [WaitingApprovalStep] Error fetching applications:', error);
        } else {
          console.log('🔍 [WaitingApprovalStep] Applications found:', data?.length || 0, data);
          if (isMounted) {
            const newApplications = (data || []) as ApplicationWithScholarship[];
            setApplications(newApplications);
            
            // Abrir automaticamente checklist se houver documentos rejeitados (apenas se aplicação não foi rejeitada E não está aprovada)
            newApplications.forEach((app) => {
              // Não abrir checklist se a aplicação foi rejeitada ou está aprovada
              if (app.status === 'rejected' || app.status === 'approved' || app.status === 'enrolled') return;
              
              const docs = parseApplicationDocuments((app as any).documents);
              const hasRejectedDocuments = docs.some(d => {
                const status = (d.status || '').toLowerCase();
                return status === 'changes_requested' || status === 'rejected';
              });
              
              if (hasRejectedDocuments && !openChecklists[app.id]) {
                setOpenChecklists(prev => ({ ...prev, [app.id]: true }));
              }
            });
          }
        }
      } catch (error) {
        console.error('🔍 [WaitingApprovalStep] Error fetching applications:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchApplications();

    // Recarregar a cada 10 segundos para pegar novas aplicações e atualizar status de pagamento
    const interval = setInterval(() => {
      if (isMounted && userProfile?.id) {
        fetchApplications();
      }
    }, 10000);

    // Recarregar quando retornar de pagamento (verificar URL params)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      // Aguardar um pouco para garantir que o banco foi atualizado
      setTimeout(() => {
        if (isMounted && userProfile?.id) {
          fetchApplications();
        }
      }, 2000);
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [userProfile?.id]);

  // Quando o aluno pagar a taxa de uma bolsa aprovada, escondemos as demais aprovadas não pagas
  const chosenPaidApp = applications.find(
    (a) => !!(a as any).is_application_fee_paid || !!(a as any).is_scholarship_fee_paid
  );
  const applicationsToShow = chosenPaidApp
    ? applications.filter((a) => a.id === chosenPaidApp.id)
    : applications;

  // Função para handle application fee click
  const handleApplicationFeeClick = (application: ApplicationWithScholarship) => {
    setPendingApplication(application);
    setShowConfirmationModal(true);
  };

  // Função para handle scholarship fee click
  const handleScholarshipFeeClick = (application: ApplicationWithScholarship) => {
    setPendingScholarshipFeeApplication(application);
    setShowScholarshipFeeModal(true);
  };

  // Função para handle Zelle Application Fee click
  const handleZelleApplicationFeeClick = () => {
    if (pendingApplication) {
      // Sempre redirecionar para página Zelle (tanto mobile quanto desktop)
      const params = new URLSearchParams({
        zelle_payment: 'true',
        fee_type: 'application_fee',
        application_id: pendingApplication.id,
        scholarship_id: pendingApplication.scholarship_id,
        amount: getApplicationFeeWithDependents(Number((pendingApplication.scholarships as any)?.application_fee_amount || 35000)).toString()
      });
      navigate(`/student/onboarding?step=waiting_approval&${params.toString()}`);
      setShowConfirmationModal(false);
    }
  };

  // Função para handle Zelle Scholarship Fee click
  const handleZelleScholarshipFeeClick = () => {
    if (pendingScholarshipFeeApplication) {
      // Sempre redirecionar para página Zelle (tanto mobile quanto desktop)
      const scholarshipFeeAmount = getFeeAmount('scholarship_fee');
      const params = new URLSearchParams({
        zelle_payment: 'true',
        fee_type: 'scholarship_fee',
        application_id: pendingScholarshipFeeApplication.id,
        scholarship_id: pendingScholarshipFeeApplication.scholarship_id,
        amount: scholarshipFeeAmount.toString()
      });
      navigate(`/student/onboarding?step=waiting_approval&${params.toString()}`);
      setShowScholarshipFeeModal(false);
    }
  };

  // Função para processar checkout Stripe (Application Fee)
  const handleStripeCheckout = async () => {
    if (!pendingApplication) return;
    
    try {
      setIsProcessingCheckout(true);
      
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-application-fee`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price_id: 'price_application_fee',
          success_url: `${window.location.origin}/student/onboarding?step=waiting_approval&payment=success`,
          cancel_url: `${window.location.origin}/student/onboarding?step=waiting_approval&payment=cancelled`,
          mode: 'payment',
          payment_type: 'application_fee',
          fee_type: 'application_fee',
          metadata: {
            application_id: pendingApplication.id,
            selected_scholarship_id: pendingApplication.scholarship_id,
            fee_type: 'application_fee',
            amount: getApplicationFeeWithDependents((pendingApplication.scholarships as any)?.application_fee_amount || 35000),
            application_fee_amount: getApplicationFeeWithDependents((pendingApplication.scholarships as any)?.application_fee_amount || 35000)
          },
          scholarships_ids: [pendingApplication.scholarship_id],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar sessão de checkout');
      }

      const { session_url } = await response.json();
      if (session_url) {
        window.location.href = session_url;
      }
    } catch (error) {
      console.error('Erro ao processar checkout:', error);
      setShowConfirmationModal(true);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Função para processar checkout PIX (Application Fee)
  const handlePixCheckout = async () => {
    if (!pendingApplication) return;
    
    try {
      setIsProcessingCheckout(true);
      
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-application-fee`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price_id: 'price_application_fee',
          success_url: `${window.location.origin}/student/onboarding?step=waiting_approval&payment=success`,
          cancel_url: `${window.location.origin}/student/onboarding?step=waiting_approval&payment=cancelled`,
          mode: 'payment',
          payment_type: 'application_fee',
          fee_type: 'application_fee',
          payment_method: 'pix',
          metadata: {
            application_id: pendingApplication.id,
            selected_scholarship_id: pendingApplication.scholarship_id,
            fee_type: 'application_fee',
            amount: getApplicationFeeWithDependents((pendingApplication.scholarships as any)?.application_fee_amount || 35000),
            application_fee_amount: getApplicationFeeWithDependents((pendingApplication.scholarships as any)?.application_fee_amount || 35000)
          },
          scholarships_ids: [pendingApplication.scholarship_id],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar sessão de checkout PIX');
      }

      const { session_url } = await response.json();
      if (session_url) {
        window.location.href = session_url;
      }
    } catch (error) {
      console.error('Erro ao processar checkout PIX:', error);
      setShowConfirmationModal(true);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Função para processar checkout Stripe (Scholarship Fee)
  const handleScholarshipFeeCheckout = async () => {
    if (!pendingScholarshipFeeApplication) return;
    
    try {
      setIsProcessingScholarshipFeeCheckout(true);
      
      const scholarshipFeeAmount = getFeeAmount('scholarship_fee');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-scholarship-fee`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price_id: 'price_scholarship_fee',
          amount: scholarshipFeeAmount,
          success_url: `${window.location.origin}/student/onboarding?step=waiting_approval&payment=success`,
          cancel_url: `${window.location.origin}/student/onboarding?step=waiting_approval&payment=cancelled`,
          mode: 'payment',
          payment_type: 'scholarship_fee',
          fee_type: 'scholarship_fee',
          scholarships_ids: [pendingScholarshipFeeApplication.scholarship_id],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar sessão de checkout');
      }

      const { session_url } = await response.json();
      if (session_url) {
        window.location.href = session_url;
      }
    } catch (error) {
      console.error('Erro ao processar checkout:', error);
      setShowScholarshipFeeModal(true);
    } finally {
      setIsProcessingScholarshipFeeCheckout(false);
    }
  };

  // Função para processar checkout PIX (Scholarship Fee)
  const handleScholarshipFeePixCheckout = async () => {
    if (!pendingScholarshipFeeApplication) return;
    
    try {
      setIsProcessingScholarshipFeeCheckout(true);
      
      const scholarshipFeeAmount = getFeeAmount('scholarship_fee');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-scholarship-fee`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price_id: 'price_scholarship_fee',
          amount: scholarshipFeeAmount,
          payment_method: 'pix',
          success_url: `${window.location.origin}/student/onboarding?step=waiting_approval&payment=success`,
          cancel_url: `${window.location.origin}/student/onboarding?step=waiting_approval&payment=cancelled`,
          mode: 'payment',
          payment_type: 'scholarship_fee',
          fee_type: 'scholarship_fee',
          scholarships_ids: [pendingScholarshipFeeApplication.scholarship_id],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar sessão de checkout PIX');
      }

      const { session_url } = await response.json();
      if (session_url) {
        window.location.href = session_url;
      }
    } catch (error) {
      console.error('Erro ao processar checkout PIX:', error);
      setShowScholarshipFeeModal(true);
    } finally {
      setIsProcessingScholarshipFeeCheckout(false);
    }
  };

  // Verificar se deve mostrar página Zelle (mobile)
  const zellePayment = searchParams.get('zelle_payment') === 'true';
  const zelleFeeType = searchParams.get('fee_type') as 'application_fee' | 'scholarship_fee' | null;
  const zelleApplicationId = searchParams.get('application_id');
  const zelleScholarshipId = searchParams.get('scholarship_id');
  const zelleAmount = searchParams.get('amount');

  // Se tiver query params de Zelle, mostrar página Zelle (tanto mobile quanto desktop)
  if (zellePayment && zelleFeeType && zelleScholarshipId && zelleAmount) {
    const application = applications.find(app => 
      app.id === zelleApplicationId || app.scholarship_id === zelleScholarshipId
    );

    if (!application && loading) {
      return (
        <div className="text-center py-12">
          <Loader2 className="w-16 h-16 text-blue-600 mx-auto animate-spin mb-4" />
          <p className="text-gray-600">Loading payment information...</p>
        </div>
      );
    }

    if (!application) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Application not found. Please try again.</p>
          <button
            onClick={() => navigate('/student/onboarding?step=waiting_approval')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Applications
          </button>
        </div>
      );
    }

    const scholarship = application.scholarships;
    const metadata = zelleFeeType === 'application_fee' 
      ? {
          application_id: application.id,
          selected_scholarship_id: application.scholarship_id,
          application_fee_amount: parseFloat(zelleAmount)
        }
      : {
          application_id: application.id,
          selected_scholarship_id: application.scholarship_id
        };

    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        {/* Header com botão voltar */}
        <div className="mb-6">
          <button
            onClick={() => {
              // Remover query params de Zelle e voltar para a lista
              navigate('/student/onboarding?step=waiting_approval');
            }}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </button>
          
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {zelleFeeType === 'scholarship_fee' 
                ? t('scholarshipConfirmationModal.scholarshipFee.title') || 'Pay Scholarship Fee'
                : t('scholarshipConfirmationModal.applicationFee.title') || 'Pay Application Fee'}
            </h2>
            <p className="text-gray-600 mb-4">
              {scholarship?.title || 'Scholarship'}
            </p>
            <div className="text-sm text-gray-700">
              <p><strong>University:</strong> {scholarship?.universities?.name || 'Unknown'}</p>
              <p className="mt-2"><strong>Amount:</strong> <span className="text-emerald-600 font-bold">${parseFloat(zelleAmount).toFixed(2)}</span></p>
            </div>
          </div>
        </div>

        {/* Zelle Checkout */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
          <ZelleCheckout
            feeType={zelleFeeType}
            amount={parseFloat(zelleAmount)}
            scholarshipsIds={[zelleScholarshipId]}
            onSuccess={async () => {
              // Recarregar aplicações
              const { data: apps } = await supabase
                .from('scholarship_applications')
                .select(`
                  *,
                  scholarships:scholarship_id (
                    *,
                    universities:university_id (*)
                  )
                `)
                .eq('student_id', userProfile?.id)
                .order('applied_at', { ascending: false });
              
              if (apps) {
                setApplications(apps as ApplicationWithScholarship[]);
              }
              
              // Se for Application Fee, remover query params de Zelle mas manter na mesma step
              // Isso faz o componente voltar a mostrar a lista, mas com Application Fee marcada como paga
              // O usuário continuará na mesma step e poderá pagar a Scholarship Fee
              if (zelleFeeType === 'application_fee') {
                // Remover query params de Zelle para voltar à visualização da lista
                // Mas manter na mesma step (waiting_approval)
                navigate('/student/onboarding?step=waiting_approval', { replace: true });
                return;
              }
              
              // Se for Scholarship Fee ou outro tipo, voltar para a lista
              navigate('/student/onboarding?step=waiting_approval');
            }}
            metadata={metadata}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-16 h-16 text-blue-600 mx-auto animate-spin mb-4" />
        <p className="text-gray-600">Loading your applications...</p>
      </div>
    );
  }

  // Função para refresh manual
  const handleRefresh = async () => {
    if (!userProfile?.id || refreshing) return;
    
    const fetchApplications = async () => {
      try {
        setRefreshing(true);
        console.log('🔄 [WaitingApprovalStep] Manual refresh triggered');
        
        const { data, error } = await supabase
          .from('scholarship_applications')
          .select(`*, scholarships(*, universities(id, name, logo_url))`)
          .eq('student_id', userProfile.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('🔍 [WaitingApprovalStep] Error fetching applications:', error);
        } else {
          const newApplications = (data || []) as ApplicationWithScholarship[];
          setApplications(newApplications);
        }
      } catch (error) {
        console.error('🔍 [WaitingApprovalStep] Error fetching applications:', error);
      } finally {
        setRefreshing(false);
      }
    };
    
    await fetchApplications();
  };

  // Calcular stats
  const stats = {
    total: applicationsToShow.length,
    pending: applicationsToShow.filter(app => app.status === 'pending' || app.status === 'under_review').length,
    approved: applicationsToShow.filter(app => app.status === 'approved' || app.status === 'enrolled').length,
    rejected: applicationsToShow.filter(app => app.status === 'rejected').length,
    under_review: applicationsToShow.filter(app => app.status === 'under_review').length,
    pending_scholarship_fee: applicationsToShow.filter(app => app.status === 'pending_scholarship_fee').length,
  };

  // Verificar se há bolsas aprovadas para priorizar na hierarquia
  const approvedList = applications.length > 0 
    ? applicationsToShow.filter(a => a.status === 'approved' || a.status === 'enrolled')
    : [];
  const hasApprovedScholarships = approvedList.length > 0;

  // Funções auxiliares para level
  const getLevelColor = (level: any) => {
    switch (level?.toLowerCase()) {
      case 'undergraduate':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'graduate':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'doctoral':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLevelLabel = (level: string) => {
    if (!level) return '';
    const levelKey = level.toLowerCase().trim();
    const mappedKey = levelKey === 'doctoral' ? 'doctorate' : levelKey;
    const translationKey = `scholarshipsPage.filters.levels.${mappedKey}`;
    const translated = t(translationKey);
    if (!translated || translated === translationKey || translated.includes('scholarshipsPage.filters.levels')) {
      return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
    }
    return translated;
  };

  return (
    <div className="pt-6 sm:pt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 mb-1 sm:mb-2">
              {t('studentDashboard.sidebar.myApplications')}
            </h2>
            <p className="text-base sm:text-lg text-slate-600">
              {t('studentDashboard.myApplications.subtitle')}
            </p>
          </div>
          {/* Botão de Refresh */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            title="Atualizar aplicações"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium hidden sm:inline">
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </span>
          </button>
        </div>

        {/* Stats - Mobile: Single compact summary card with 3 columns */}
        <div className="sm:hidden mb-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="grid grid-cols-3 divide-x divide-slate-200">
              <div className="p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mb-1 leading-none">
                  <span className="inline-flex items-center justify-center w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full bg-blue-50 border border-blue-200">
                    <FileText className="h-3 w-3 text-blue-600" aria-hidden="true" />
                  </span>
                  <span>{t('studentDashboard.myApplications.totalApplications')}</span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 leading-none">{stats.total}</div>
              </div>
              <div className="p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mb-1 leading-none">
                  <span className="inline-flex items-center justify-center w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full bg-green-50 border border-green-200">
                    <CheckCircle className="h-3 w-3 text-green-600" aria-hidden="true" />
                  </span>
                  <span>{t('studentDashboard.myApplications.approved')}</span>
                </div>
                <div className="text-2xl font-extrabold text-green-600 leading-none">{stats.approved}</div>
              </div>
              <div className="p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mb-1 leading-none">
                  <span className="inline-flex items-center justify-center w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full bg-slate-50 border border-slate-200">
                    <Clock className="h-3 w-3 text-gray-600" aria-hidden="true" />
                  </span>
                  <span>{t('studentDashboard.myApplications.pending')}</span>
                </div>
                <div className="text-2xl font-extrabold text-gray-700 leading-none">{stats.pending}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats - Desktop Cards */}
        <div className="hidden sm:grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 min-h-[140px] flex items-center hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-2">{t('studentDashboard.myApplications.totalApplications')}</p>
                <p className="text-4xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center">
                <FileText className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 min-h-[140px] flex items-center hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-2">{t('studentDashboard.myApplications.approved')}</p>
                <p className="text-4xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <div className="w-14 h-14 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 min-h-[140px] flex items-center hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-2">{t('studentDashboard.myApplications.pending')}</p>
                <p className="text-4xl font-bold text-gray-600">{stats.pending}</p>
              </div>
              <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center">
                <Clock className="h-7 w-7 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Guidance: explain fees and next steps */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-4 sm:p-6 lg:p-8 mb-8">
          {/* Important Notice */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">!</div>
              <div>
                <h3 className="font-bold text-blue-900 text-sm mb-2">{t('studentDashboard.myApplications.stayUpdated')}</h3>
                <p className="text-blue-800 text-sm leading-relaxed">
                  <strong>{t('studentDashboard.myApplications.important')}</strong> {t('studentDashboard.myApplications.emailNotification')}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile: Collapsible steps */}
          <div className="block sm:hidden">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">4</div>
                  <span className="font-bold text-slate-900">{t('studentDashboard.myApplications.steps.processSteps')}</span>
                </div>
                <svg className="w-5 h-5 text-blue-600 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-3 space-y-3">
                <div className="flex items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">1</div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm mb-1">{t('studentDashboard.myApplications.steps.step1Title')}</div>
                    <div className="text-xs text-slate-600">{t('studentDashboard.myApplications.steps.step1Description')}</div>
                  </div>
                </div>
                <div className="flex items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">2</div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm mb-1">{t('studentDashboard.myApplications.steps.step2Title')}</div>
                    <div className="text-xs text-slate-600">{t('studentDashboard.myApplications.steps.step2Description')}</div>
                  </div>
                </div>
                <div className="flex items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">3</div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm mb-1">{t('studentDashboard.myApplications.steps.step3Title')}</div>
                    <div className="text-xs text-slate-600">{t('studentDashboard.myApplications.steps.step3Description')}</div>
                  </div>
                </div>
                <div className="flex items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">4</div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm mb-1">{t('studentDashboard.myApplications.steps.step4Title')}</div>
                    <div className="text-xs text-slate-600">{t('studentDashboard.myApplications.steps.step4Description')}</div>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Desktop: Original layout */}
          <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200">
              <div className="text-sm sm:text-base font-bold text-slate-900 mb-2">{t('studentDashboard.myApplications.steps.step1Title')}</div>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">{t('studentDashboard.myApplications.steps.step1Description')}</div>
            </div>
            <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200">
              <div className="text-sm sm:text-base font-bold text-slate-900 mb-2">{t('studentDashboard.myApplications.steps.step2Title')}</div>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">{t('studentDashboard.myApplications.steps.step2Description')}</div>
            </div>
            <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200">
              <div className="text-sm sm:text-base font-bold text-slate-900 mb-2">{t('studentDashboard.myApplications.steps.step3Title')}</div>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">{t('studentDashboard.myApplications.steps.step3Description')}</div>
            </div>
            <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200">
              <div className="text-sm sm:text-base font-bold text-slate-900 mb-2">{t('studentDashboard.myApplications.steps.step4Title')}</div>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">{t('studentDashboard.myApplications.steps.step4Description')}</div>
            </div>
          </div>
        </div>

        {/* Important Notice - Apenas uma bolsa */}
        {(() => {
          // Verificar se há alguma aplicação com bolsa selecionada mas sem pagar a taxa da bolsa
          const hasSelectedScholarship = applications.some(app => {
            const hasScholarship = !!(app as any).scholarship_id;
            const hasPaidScholarshipFee = !!(app as any).has_paid_scholarship_fee;
            return hasScholarship && !hasPaidScholarshipFee;
          });
          
          if (!hasSelectedScholarship) return null;
          
          return (
            <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-5 text-sm text-amber-800">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold">{t('studentDashboard.myApplications.importantNotice.title')}</span> {t('studentDashboard.myApplications.importantNotice.description')}
                </div>
              </div>
            </div>
          );
        })()}

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 sm:p-12 text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8">
            <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">{t('studentDashboard.myApplications.noApplications.title')}</h3>
          <p className="text-slate-500 mb-6 sm:mb-8 max-w-lg mx-auto text-base sm:text-lg leading-relaxed px-4">
            {t('studentDashboard.myApplications.noApplications.description')}
          </p>
        </div>
      ) : (
        <>

          {/* Applications List - two sections */}
          <div className="space-y-10">
            {/* Approved */}
            {(() => {
              if (approvedList.length === 0) return null;
              const selectedApp = approvedList.find(a => (a as any).is_scholarship_fee_paid);
              const hasSelectedScholarship = !!selectedApp;
              return (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">{t('studentDashboard.myApplications.sections.approvedByUniversity')}</h3>
                    <span className="text-sm text-green-700 bg-green-100 border border-green-200 md:px-4 md:py-2 px-2 py-1 rounded-full font-medium">{approvedList.length} {t('studentDashboard.myApplications.sections.approved')}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:overflow-x-auto md:pb-4 gap-6" style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                  }}>
                  {approvedList.map((application) => {
                    const Icon = getStatusIcon(application.status);
                    const scholarship = application.scholarships;
                    const applicationFeePaid = !!application.is_application_fee_paid;
                    const scholarshipFeePaid = !!application.is_scholarship_fee_paid;
                    if (!scholarship) return null;

                    // Obter descrição detalhada do status
                    const statusInfo = getStatusDescription(application);
                    
                    return (
                      <div key={application.id} className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group w-full md:flex-shrink-0 md:min-w-0 md:self-start">
                        <div className="p-4">
                          {/* Header Section Compacto */}
                          <div className="mb-4">
                            {/* Linha 1: Título e Status Badge */}
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <h2 className="font-bold text-gray-900 text-base leading-tight flex-1 pr-3">
                                {scholarship.title}
                              </h2>
                              <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold border flex-shrink-0 ${getStatusColor(application.status === 'enrolled' ? 'approved' : application.status)}`}>
                                <Icon className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="whitespace-nowrap">{application.status === 'approved' || application.status === 'enrolled' ? t('studentDashboard.myApplications.statusLabels.approved') : getStatusLabel(application.status)}</span>
                              </span>
                            </div>
                            
                            {/* Linha 3: Universidade + Level */}
                            <div className="flex items-center gap-2 text-sm mb-3">
                              <div className="flex items-center text-gray-600 flex-1 min-w-0 max-w-[calc(100%-80px)] overflow-hidden">
                                <Building className="h-3 w-3 mr-1.5 text-gray-500 flex-shrink-0" />
                                <span className="font-medium truncate">{scholarship.universities?.name}</span>
                              </div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${getLevelColor(scholarship.level)} flex-shrink-0 whitespace-nowrap`}>
                                <GraduationCap className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="whitespace-nowrap">{getLevelLabel(scholarship.level)}</span>
                              </span>
                            </div>
                          </div>

                          {/* Status Details - Mobile: botão colapsável; Desktop: sempre visível */}
                          <div className="mb-4">
                            <button
                              className="w-full sm:hidden cursor-pointer bg-slate-50 hover:bg-slate-100 rounded-lg p-3 transition-colors flex items-center justify-between border border-gray-200"
                              onClick={() => toggleMobileExpanded(application.id)}
                            >
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-blue-600" />
                                <span className="text-sm font-medium text-gray-700">{t('studentDashboard.myApplications.statusDetails.title')}</span>
                              </div>
                              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${mobileExpandedApps[application.id] ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`${mobileExpandedApps[application.id] ? 'max-h-96' : 'max-h-0'} sm:max-h-none overflow-hidden transition-all duration-300 ease-in-out sm:block`}>
                              <div className={`mt-2 sm:mt-0 rounded-lg p-3 border ${statusInfo.bgColor} ${statusInfo.borderColor}`}> 
                                <h3 className={`font-bold text-sm ${statusInfo.color} mb-2`}>
                                  {statusInfo.title}
                                </h3>
                                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                                  {statusInfo.description}
                                </p>
                                
                                {/* Next Steps */}
                                {statusInfo.nextSteps && statusInfo.nextSteps.length > 0 && (
                                  <div>
                                    <h4 className={`font-semibold text-xs ${statusInfo.color} mb-2 uppercase tracking-wide`}>
                                      {t('studentDashboard.myApplications.nextSteps')}
                                    </h4>
                                    <ul className="space-y-2">
                                      {statusInfo.nextSteps.map((step, index) => (
                                        <li key={index} className="flex items-start text-xs text-slate-700">
                                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                                          {step}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
  
                          {/* Details Section */}
                          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 border border-slate-200">
                            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                              <div className="flex items-center">
                                <div className="bg-green-100 p-2 rounded-lg mr-3 flex-shrink-0">
                                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-gray-600 mb-1 font-medium">{t('studentDashboard.myApplications.scholarshipDetails.annualScholarshipValue')}</p>
                                  <p className="font-bold text-base sm:text-lg text-green-700 truncate">
                                    {formatAmount(scholarship.annual_value_with_scholarship ?? 0)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center">
                                <div className="bg-blue-100 p-2 rounded-lg mr-3 flex-shrink-0">
                                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-gray-600 mb-1 font-medium">{t('studentDashboard.myApplications.scholarshipDetails.applicationDate')}</p>
                                  <p className="font-semibold text-gray-900 text-xs sm:text-sm">
                                    {new Date(application.applied_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                    {/* Documents Status - Individual Check List - apenas se aplicação não foi rejeitada E não está aprovada */}
                    {application.status !== 'rejected' && application.status !== 'approved' && application.status !== 'enrolled' && (() => {
                      const docs = parseApplicationDocuments((application as any).documents);
                      
                      // Create a complete document list with status
                      const allDocuments = [
                        { type: 'passport', label: DOCUMENT_LABELS.passport },
                        { type: 'diploma', label: DOCUMENT_LABELS.diploma },
                        { type: 'funds_proof', label: DOCUMENT_LABELS.funds_proof }
                      ].map(docTemplate => {
                        const docData = docs.find(d => d.type === docTemplate.type);
                        return {
                          ...docTemplate,
                          status: docData?.status || 'pending',
                          review_notes: docData?.review_notes,
                          rejection_reason: docData?.rejection_reason
                        };
                      });

                      if (docs.length === 0) return null;

                      const isOpen = openChecklists[application.id];

                      return (
                        <div className="border-t border-slate-200 pt-3 mt-3">
                          <div className="border border-slate-300 rounded-xl bg-white overflow-hidden transition-all duration-500">
                          <button 
                            onClick={() => toggleChecklist(application.id)}
                              className="flex items-center justify-between cursor-pointer select-none w-full p-4 hover:bg-slate-50 transition-colors text-left"
                          >
                            <h4 className="text-xs font-bold text-slate-900 flex items-center">
                              <FileText className="h-3 w-3 mr-2 text-blue-600" />
                                Documentos em Análise
                            </h4>
                              <span 
                                className={`text-2xl text-slate-700 transition-all duration-350 ease-in-out ${
                                  isOpen ? 'rotate-90' : '-rotate-90'
                                }`}
                                style={{ transitionDelay: isOpen ? '0ms' : '85ms' }}
                              >
                                ›
                              </span>
                          </button>
                          
                          <div 
                              className={`transition-all duration-500 ease-in-out ${
                                isOpen 
                                  ? 'opacity-100 translate-y-0 mt-4 mb-4 max-h-[500px] overflow-y-auto' 
                                  : 'opacity-0 -translate-y-12 max-h-0 overflow-hidden pointer-events-none'
                            }`}
                              style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: 'transparent transparent'
                              }}
                          >
                              <div 
                                className="px-4 pb-2 space-y-3 custom-scrollbar"
                                onMouseEnter={(e) => {
                                  const target = e.currentTarget;
                                  target.style.scrollbarColor = '#c1c2c5 transparent';
                                }}
                                onMouseLeave={(e) => {
                                  const target = e.currentTarget;
                                  target.style.scrollbarColor = 'transparent transparent';
                                }}
                              >
                              {/* Required Documents */}
                              {allDocuments.map((doc) => {
                                const status = (doc.status || '').toLowerCase();
                                const isApproved = status === 'approved';
                                const isRejected = status === 'changes_requested' || status === 'rejected';
                                const isUnderReview = status === 'under_review';
                                const isPending = !isApproved && !isRejected && !isUnderReview;

                                return (
                                  <div key={doc.type} className="bg-white rounded-xl border-2 border-slate-200 p-4 hover:border-slate-300 transition-all duration-200">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-start flex-1">
                                        {/* Check Icon */}
                                        <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 mt-0.5 transition-all duration-200 ${
                                          isApproved 
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-600' 
                                            : isRejected 
                                              ? 'bg-red-100 border-red-400 text-red-600'
                                              : isUnderReview
                                                ? 'bg-amber-100 border-amber-400 text-amber-600'
                                                : 'bg-slate-100 border-slate-300 text-slate-400'
                                        }`}>
                                          {isApproved ? (
                                            <CheckCircle className="h-4 w-4" />
                                          ) : isRejected ? (
                                            <XCircle className="h-4 w-4" />
                                          ) : isUnderReview ? (
                                            <Clock className="h-4 w-4" />
                                          ) : (
                                            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                          )}
                                        </div>
                                        
                                        {/* Document Info */}
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                          <div className="flex items-center justify-between mb-1">
                                            <h5 className="font-semibold text-slate-900 text-sm">
                                              {doc.label}
                                            </h5>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                              isApproved 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                : isRejected 
                                                  ? 'bg-red-50 text-red-700 border-red-200'
                                                : isUnderReview
                                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                                            }`}>
                                              {isApproved ? t('studentDashboard.myApplications.documents.status.approved') || 'Approved' : isRejected ? t('studentDashboard.myApplications.documents.status.changesNeeded') || 'Changes Needed' : isUnderReview ? t('studentDashboard.myApplications.documents.status.underReview') || 'Under Review' : t('studentDashboard.myApplications.documents.status.pending') || 'Pending'}
                                            </span>
                                          </div>
                                          
                                          {/* Review Notes / Rejection Reason */}
                                          {isRejected && (doc.rejection_reason || doc.review_notes) && (
                                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                              <p className="text-xs text-red-700">
                                                <strong className="block mb-1">{t('studentDashboard.myApplications.documents.review') || 'Review'}</strong>
                                                {doc.rejection_reason || doc.review_notes || ''}
                                              </p>
                                            </div>
                                          )}
                                          
                                          {/* Upload Action for Rejected Docs */}
                                          {isRejected && (
                                            <div className="mt-3 space-y-2">
                                              <div className="flex flex-col sm:flex-row gap-2">
                                                <label className="cursor-pointer bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-2 border-blue-200 hover:from-blue-100 hover:to-blue-200 px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex-1 block text-center text-xs hover:shadow-md">
                                                  <span>
                                                    {t('studentDashboard.myApplications.documents.sendNew') || 'Send New'} {doc.label}
                                                  </span>
                                                  <input
                                                    type="file"
                                                    className="sr-only"
                                                    accept="application/pdf,image/*"
                                                    onChange={(e) => handleSelectDocFile(application.id, doc.type, e.target.files ? e.target.files[0] : null)}
                                                  />
                                                </label>
                                                <button
                                                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:from-blue-700 hover:to-blue-800 text-xs"
                                                  disabled={!selectedFiles[docKey(application.id, doc.type)] || uploading[docKey(application.id, doc.type)]}
                                                  onClick={() => handleUploadDoc(application.id, doc.type)}
                                                >
                                                  {uploading[docKey(application.id, doc.type)] ? (
                                                    <div className="flex items-center justify-center">
                                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                                      {t('studentDashboard.myApplications.paymentStatus.uploading') || 'Uploading...'}
                                                    </div>
                                                  ) : t('studentDashboard.myApplications.paymentStatus.uploadDocument') || 'Upload Document'}
                                                </button>
                                              </div>
                                              {selectedFiles[docKey(application.id, doc.type)] && (
                                                <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                  <span className="font-medium">{t('studentDashboard.myApplications.paymentStatus.selected') || 'Selected'}: </span>
                                                  {selectedFiles[docKey(application.id, doc.type)]?.name || ''}
                                                </div>
                                              )}
                                            </div>
                                          )}
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
                      );
                    })()}

                          {/* Payment Status Section */}
                          <div className="mb-6">
                            <h3 className="font-bold text-gray-900 mb-4 text-base">{t('studentDashboard.myApplications.paymentStatus.title')}</h3>
                            <div className="space-y-3">
                              <div className="bg-white border-2 border-slate-200 rounded-xl p-3 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="font-semibold text-gray-900 text-sm">{t('studentDashboard.myApplications.paymentStatus.applicationFee')}</span>
                                  <span className="text-base font-bold text-gray-700">
                                    {formatAmount(getApplicationFeeWithDependents(Number(scholarship.application_fee_amount || 35000)))}
                                  </span>
                                </div>
                                {applicationFeePaid ? (
                                  <div className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {t('studentDashboard.myApplications.paymentStatus.paid')}
                                  </div>
                                ) : (
                                  <>
                                    {isBlocked && pendingPayment ? (
                                      <div className="w-full bg-amber-50 border-2 border-amber-200 rounded-lg p-3">
                                        <div className="flex items-center justify-center">
                                          <Clock className="h-4 w-4 text-amber-600 mr-2 animate-spin" />
                                          <span className="text-xs font-semibold text-amber-800">
                                            {t('studentDashboard.myApplications.paymentStatus.processingZellePayment')}
                                          </span>
                                        </div>
                                        {pendingPayment.fee_type && (
                                          <p className="text-xs text-amber-700 mt-1 text-center">
                                            {t('studentDashboard.myApplications.paymentStatus.pendingPaymentType', { 
                                              feeType: pendingPayment.fee_type === 'application_fee' 
                                                ? t('studentDashboard.myApplications.paymentStatus.applicationFee')
                                                : pendingPayment.fee_type === 'scholarship_fee'
                                                ? t('studentDashboard.myApplications.paymentStatus.scholarshipFee')
                                                : pendingPayment.fee_type
                                            })}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => handleApplicationFeeClick(application)}
                                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
                                        disabled={(hasSelectedScholarship && !scholarshipFeePaid) || paymentBlockedLoading}
                                      >
                                        {paymentBlockedLoading 
                                          ? t('studentDashboard.myApplications.paymentStatus.checking')
                                          : t('studentDashboard.myApplications.paymentStatus.payApplicationFee')}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
  
                              <div className="bg-white border-2 border-slate-200 rounded-xl p-3 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="font-semibold text-gray-900 text-sm">{t('studentDashboard.myApplications.paymentStatus.scholarshipFee')}</span>
                                  <span className="text-base font-bold text-gray-700">{formatAmount(Number(getFeeAmount('scholarship_fee')))}</span>
                                </div>
                                {scholarshipFeePaid ? (
                                  <div className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {t('studentDashboard.myApplications.paymentStatus.paid')}
                                  </div>
                                ) : (
                                  <>
                                    {isBlocked && pendingPayment ? (
                                      <div className="w-full bg-amber-50 border-2 border-amber-200 rounded-lg p-3">
                                        <div className="flex items-center justify-center">
                                          <Clock className="h-4 w-4 text-amber-600 mr-2 animate-spin" />
                                          <span className="text-xs font-semibold text-amber-800">
                                            {t('studentDashboard.myApplications.paymentStatus.processingZellePayment')}
                                          </span>
                                        </div>
                                        {pendingPayment.fee_type && (
                                          <p className="text-xs text-amber-700 mt-1 text-center">
                                            {t('studentDashboard.myApplications.paymentStatus.pendingPaymentType', { 
                                              feeType: pendingPayment.fee_type === 'application_fee' 
                                                ? t('studentDashboard.myApplications.paymentStatus.applicationFee')
                                                : pendingPayment.fee_type === 'scholarship_fee'
                                                ? t('studentDashboard.myApplications.paymentStatus.scholarshipFee')
                                                : pendingPayment.fee_type
                                            })}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => handleScholarshipFeeClick(application)}
                                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
                                        disabled={!applicationFeePaid || scholarshipFeePaid || (hasSelectedScholarship && !scholarshipFeePaid) || paymentBlockedLoading}
                                      >
                                        {paymentBlockedLoading 
                                          ? t('studentDashboard.myApplications.paymentStatus.checking')
                                          : t('studentDashboard.myApplications.paymentStatus.payScholarshipFee')}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
  
                          {/* Action Section */}
                          {(applicationFeePaid && scholarshipFeePaid) && (
                            <div className="border-t border-slate-200 pt-4">
                              <Link
                                to={`/student/dashboard/application/${application.id}/chat`}
                                className="inline-flex items-center justify-center w-full px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 text-sm"
                              >
                                <GraduationCap className="h-4 w-4 mr-2" />
                                {t('studentDashboard.myApplications.applicationDetails.viewDetails')}
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}

            {/* Others */}
            {(() => {
              const otherList = applicationsToShow.filter(a => a.status !== 'approved' && a.status !== 'enrolled');
              if (otherList.length === 0) return null;
              return (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900">{t('studentDashboard.myApplications.sections.pendingAndInProgress')}</h3>
                    <span className="text-sm text-slate-700 bg-slate-100 border border-slate-200 px-4 py-2 rounded-full font-medium">{otherList.length} {t('studentDashboard.myApplications.sections.applications')}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                  }}>
                  {otherList.map((application) => {
                    const Icon = getStatusIcon(application.status);
                    const scholarship = application.scholarships;
                    if (!scholarship) return null;

                    // Obter descrição detalhada do status
                    const statusInfo = getStatusDescription(application);
                    
                    return (
                      <div key={application.id} className="bg-white rounded-3xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 overflow-hidden group w-full">
                        <div className="p-4 sm:p-6">
                          {/* Compact Mobile Header */}
                          <div className="mb-4">
                            {/* Line 1: Title + Status */}
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors leading-tight flex-1 pr-3">
                                {scholarship.title}
                              </h3>
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusColor(application.status)} flex-shrink-0`}>
                                <Icon className="h-3 w-3 mr-1" />
                                {getStatusLabel(application.status)}
                              </span>
                            </div>
                            
                            {/* Line 2: University + Level */}
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center text-slate-600 flex-1 min-w-0 max-w-[calc(100%-80px)] overflow-hidden">
                                <Building className="h-4 w-4 mr-2 text-slate-500 flex-shrink-0" />
                                <span className="font-medium text-sm truncate">{scholarship.universities?.name}</span>
                              </div>
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getLevelColor(scholarship.level)} flex-shrink-0 whitespace-nowrap`}>
                                <GraduationCap className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="whitespace-nowrap">{getLevelLabel(scholarship.level)}</span>
                              </span>
                            </div>
                          </div>

                          {/* Status Details - Mobile collapsible, desktop always visible */}
                          <div className="mb-4">
                            <button
                              className="w-full sm:hidden cursor-pointer bg-slate-50 hover:bg-slate-100 rounded-lg p-3 transition-colors flex items-center justify-between border border-gray-200"
                              onClick={() => toggleMobileExpanded(application.id)}
                            >
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-blue-600" />
                                <span className="text-sm font-medium text-gray-700">{t('studentDashboard.myApplications.statusDetails.title')}</span>
                              </div>
                              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${mobileExpandedApps[application.id] ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`${mobileExpandedApps[application.id] ? 'max-h-96' : 'max-h-0'} sm:max-h-none overflow-hidden transition-all duration-300 ease-in-out sm:block`}>
                              <div className={`mt-2 sm:mt-0 rounded-lg p-3 border ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
                                <h3 className={`font-bold text-sm ${statusInfo.color} mb-2`}>
                                  {statusInfo.title}
                                </h3>
                                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                                  {statusInfo.description}
                                </p>
                                
                                {/* Next Steps */}
                                {statusInfo.nextSteps && statusInfo.nextSteps.length > 0 && (
                                  <div>
                                    <h4 className={`font-semibold text-xs ${statusInfo.color} mb-2 uppercase tracking-wide`}>
                                      {t('studentDashboard.myApplications.nextSteps')}
                                    </h4>
                                    <ul className="space-y-2">
                                      {statusInfo.nextSteps.map((step, index) => (
                                        <li key={index} className="flex items-start text-xs text-slate-700">
                                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                                          {step}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Not selected reason for rejected applications */}
                          {application.status === 'rejected' && (application as any).notes && (
                            <div className="mb-4 rounded-xl p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
                              <div className="flex items-start">
                                <XCircle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                                <div>
                                  <strong className="block mb-1">{t('studentDashboard.myApplications.rejectionReason') || 'Motivo:'}</strong>
                                  <p className="text-xs text-red-700 leading-relaxed">
                                    {(application as any).notes}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Details Section */}
                          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 border border-slate-200">
                            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                              <div className="flex items-center">
                                <div className="bg-green-100 p-2 rounded-lg mr-3 flex-shrink-0">
                                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-gray-600 mb-1 font-medium">{t('studentDashboard.myApplications.scholarshipDetails.annualScholarshipValue')}</p>
                                  <p className="font-bold text-base sm:text-lg text-green-700 truncate">
                                    {formatAmount(scholarship.annual_value_with_scholarship ?? 0)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center">
                                <div className="bg-blue-100 p-2 rounded-lg mr-3 flex-shrink-0">
                                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-gray-600 mb-1 font-medium">{t('studentDashboard.myApplications.scholarshipDetails.applicationDate')}</p>
                                  <p className="font-semibold text-gray-900 text-xs sm:text-sm">
                                    {new Date(application.applied_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Payment Status Section */}
                          {(() => {
                            const applicationFeePaid = (application as any).has_paid_application_fee;
                            const scholarshipFeePaid = (application as any).has_paid_scholarship_fee;
                            const hasSelectedScholarship = !!application.scholarship_id;
                            
                            return (
                              <div className="mb-6">
                                <h3 className="font-bold text-gray-900 mb-4 text-base">{t('studentDashboard.myApplications.paymentStatus.title')}</h3>
                                <div className="space-y-3">
                                  <div className="bg-white border-2 border-slate-200 rounded-xl p-3 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="font-semibold text-gray-900 text-sm">{t('studentDashboard.myApplications.paymentStatus.applicationFee')}</span>
                                      <span className="text-base font-bold text-gray-700">
                                        {formatAmount(getApplicationFeeWithDependents(Number(scholarship.application_fee_amount || 35000)))}
                                      </span>
                                    </div>
                                    {applicationFeePaid ? (
                                      <div className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        {t('studentDashboard.myApplications.paymentStatus.paid')}
                                      </div>
                                    ) : (
                                      <>
                                        {isBlocked && pendingPayment ? (
                                          <div className="w-full bg-amber-50 border-2 border-amber-200 rounded-lg p-3">
                                            <div className="flex items-center justify-center">
                                              <Clock className="h-4 w-4 text-amber-600 mr-2 animate-spin" />
                                              <span className="text-xs font-semibold text-amber-800">
                                                {t('studentDashboard.myApplications.paymentStatus.processingZellePayment')}
                                              </span>
                                            </div>
                                            {pendingPayment.fee_type && (
                                              <p className="text-xs text-amber-700 mt-1 text-center">
                                                {t('studentDashboard.myApplications.paymentStatus.pendingPaymentType', { 
                                                  feeType: pendingPayment.fee_type === 'application_fee' 
                                                    ? t('studentDashboard.myApplications.paymentStatus.applicationFee')
                                                    : pendingPayment.fee_type === 'scholarship_fee'
                                                    ? t('studentDashboard.myApplications.paymentStatus.scholarshipFee')
                                                    : pendingPayment.fee_type
                                                })}
                                              </p>
                                            )}
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => handleApplicationFeeClick(application)}
                                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
                                            disabled={(hasSelectedScholarship && !scholarshipFeePaid) || paymentBlockedLoading}
                                          >
                                            {paymentBlockedLoading 
                                              ? t('studentDashboard.myApplications.paymentStatus.checking')
                                              : t('studentDashboard.myApplications.paymentStatus.payApplicationFee')}
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
    
                                  <div className="bg-white border-2 border-slate-200 rounded-xl p-3 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="font-semibold text-gray-900 text-sm">{t('studentDashboard.myApplications.paymentStatus.scholarshipFee')}</span>
                                      <span className="text-base font-bold text-gray-700">{formatAmount(Number(getFeeAmount('scholarship_fee')))}</span>
                                    </div>
                                    {scholarshipFeePaid ? (
                                      <div className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        {t('studentDashboard.myApplications.paymentStatus.paid')}
                                      </div>
                                    ) : (
                                      <>
                                        {isBlocked && pendingPayment ? (
                                          <div className="w-full bg-amber-50 border-2 border-amber-200 rounded-lg p-3">
                                            <div className="flex items-center justify-center">
                                              <Clock className="h-4 w-4 text-amber-600 mr-2 animate-spin" />
                                              <span className="text-xs font-semibold text-amber-800">
                                                {t('studentDashboard.myApplications.paymentStatus.processingZellePayment')}
                                              </span>
                                            </div>
                                            {pendingPayment.fee_type && (
                                              <p className="text-xs text-amber-700 mt-1 text-center">
                                                {t('studentDashboard.myApplications.paymentStatus.pendingPaymentType', { 
                                                  feeType: pendingPayment.fee_type === 'application_fee' 
                                                    ? t('studentDashboard.myApplications.paymentStatus.applicationFee')
                                                    : pendingPayment.fee_type === 'scholarship_fee'
                                                    ? t('studentDashboard.myApplications.paymentStatus.scholarshipFee')
                                                    : pendingPayment.fee_type
                                                })}
                                              </p>
                                            )}
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => handleScholarshipFeeClick(application)}
                                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
                                            disabled={!applicationFeePaid || scholarshipFeePaid || (hasSelectedScholarship && !scholarshipFeePaid) || paymentBlockedLoading}
                                          >
                                            {paymentBlockedLoading 
                                              ? t('studentDashboard.myApplications.paymentStatus.checking')
                                              : t('studentDashboard.myApplications.paymentStatus.payScholarshipFee')}
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Action Section */}
                          {(() => {
                            const applicationFeePaid = (application as any).has_paid_application_fee;
                            const scholarshipFeePaid = (application as any).has_paid_scholarship_fee;
                            
                            if (applicationFeePaid && scholarshipFeePaid) {
                              return (
                                <div className="border-t border-slate-200 pt-4 mb-4">
                                  <Link
                                    to={`/student/dashboard/application/${application.id}/chat`}
                                    className="inline-flex items-center justify-center w-full px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 text-sm"
                                  >
                                    <GraduationCap className="h-4 w-4 mr-2" />
                                    {t('studentDashboard.myApplications.applicationDetails.viewDetails')}
                                  </Link>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Documents Status - Individual Check List - apenas se aplicação não foi rejeitada E não está aprovada */}
                          {application.status !== 'rejected' && application.status !== 'approved' && application.status !== 'enrolled' && (() => {
                            const docs = parseApplicationDocuments((application as any).documents);
                            
                            // Create a complete document list with status
                            const allDocuments = [
                              { type: 'passport', label: DOCUMENT_LABELS.passport },
                              { type: 'diploma', label: DOCUMENT_LABELS.diploma },
                              { type: 'funds_proof', label: DOCUMENT_LABELS.funds_proof }
                            ].map(docTemplate => {
                              const docData = docs.find(d => d.type === docTemplate.type);
                              return {
                                ...docTemplate,
                                status: docData?.status || 'pending',
                                review_notes: docData?.review_notes,
                                rejection_reason: docData?.rejection_reason
                              };
                            });

                            if (docs.length === 0) return null;

                            const isOpen = openChecklists[application.id];

                            return (
                              <div className="border-t border-slate-200 pt-3 mt-3">
                                <div className="border border-slate-300 rounded-xl bg-white overflow-hidden transition-all duration-500">
                                <button 
                                  onClick={() => toggleChecklist(application.id)}
                                    className="flex items-center justify-between cursor-pointer select-none w-full p-4 hover:bg-slate-50 transition-colors text-left"
                                >
                                  <h4 className="text-xs font-bold text-slate-900 flex items-center">
                                    <FileText className="h-3 w-3 mr-2 text-blue-600" />
                                      Documentos em Análise
                                  </h4>
                                    <span 
                                      className={`text-2xl text-slate-700 transition-all duration-350 ease-in-out ${
                                        isOpen ? 'rotate-90' : '-rotate-90'
                                      }`}
                                      style={{ transitionDelay: isOpen ? '0ms' : '85ms' }}
                                    >
                                      ›
                                    </span>
                                </button>
                                
                                <div 
                                    className={`transition-all duration-500 ease-in-out ${
                                      isOpen 
                                        ? 'opacity-100 translate-y-0 mt-4 mb-4 max-h-[500px] overflow-y-auto' 
                                        : 'opacity-0 -translate-y-12 max-h-0 overflow-hidden pointer-events-none'
                                  }`}
                                    style={{
                                      scrollbarWidth: 'thin',
                                      scrollbarColor: 'transparent transparent'
                                    }}
                                >
                                    <div 
                                      className="px-4 pb-2 space-y-3 custom-scrollbar"
                                      onMouseEnter={(e) => {
                                        const target = e.currentTarget;
                                        target.style.scrollbarColor = '#c1c2c5 transparent';
                                      }}
                                      onMouseLeave={(e) => {
                                        const target = e.currentTarget;
                                        target.style.scrollbarColor = 'transparent transparent';
                                      }}
                                    >
                                    {/* Required Documents */}
                                    {allDocuments.map((doc) => {
                                      const status = (doc.status || '').toLowerCase();
                                      const isApproved = status === 'approved';
                                      const isRejected = status === 'changes_requested' || status === 'rejected';
                                      const isUnderReview = status === 'under_review';
                                      const isPending = !isApproved && !isRejected && !isUnderReview;

                                      return (
                                        <div key={doc.type} className="bg-white rounded-xl border-2 border-slate-200 p-4 hover:border-slate-300 transition-all duration-200">
                                          <div className="flex items-start justify-between">
                                            <div className="flex items-start flex-1">
                                              {/* Check Icon */}
                                              <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 mt-0.5 transition-all duration-200 ${
                                                isApproved 
                                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-600' 
                                                  : isRejected 
                                                    ? 'bg-red-100 border-red-400 text-red-600'
                                                    : isUnderReview
                                                      ? 'bg-amber-100 border-amber-400 text-amber-600'
                                                      : 'bg-slate-100 border-slate-300 text-slate-400'
                                              }`}>
                                                {isApproved ? (
                                                  <CheckCircle className="h-4 w-4" />
                                                ) : isRejected ? (
                                                  <XCircle className="h-4 w-4" />
                                                ) : isUnderReview ? (
                                                  <Clock className="h-4 w-4" />
                                                ) : (
                                                  <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                                )}
                                              </div>
                                              
                                              {/* Document Info */}
                                              <div className="flex-1 min-w-0 overflow-hidden">
                                                <div className="flex items-center justify-between mb-1">
                                                  <h5 className="font-semibold text-slate-900 text-sm">
                                                    {doc.label}
                                                  </h5>
                                                  <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                                    isApproved 
                                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                      : isRejected 
                                                        ? 'bg-red-50 text-red-700 border-red-200'
                                                      : isUnderReview
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                                  }`}>
                                                    {isApproved ? t('studentDashboard.myApplications.documents.status.approved') || 'Approved' : isRejected ? t('studentDashboard.myApplications.documents.status.changesNeeded') || 'Changes Needed' : isUnderReview ? t('studentDashboard.myApplications.documents.status.underReview') || 'Under Review' : t('studentDashboard.myApplications.documents.status.pending') || 'Pending'}
                                                  </span>
                                                </div>
                                                
                                                {/* Review Notes / Rejection Reason */}
                                                {isRejected && (doc.rejection_reason || doc.review_notes) && (
                                                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                    <p className="text-xs text-red-700">
                                                      <strong className="block mb-1">{t('studentDashboard.myApplications.documents.review') || 'Review'}</strong>
                                                      {doc.rejection_reason || doc.review_notes || ''}
                                                    </p>
                                                  </div>
                                                )}
                                                
                                                {/* Upload Action for Rejected Docs */}
                                                {isRejected && (
                                                  <div className="mt-3 space-y-2">
                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                      <label className="cursor-pointer bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-2 border-blue-200 hover:from-blue-100 hover:to-blue-200 px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex-1 block text-center text-xs hover:shadow-md">
                                                        <span>
                                                          {t('studentDashboard.myApplications.documents.sendNew') || 'Send New'} {doc.label}
                                                        </span>
                                                        <input
                                                          type="file"
                                                          className="sr-only"
                                                          accept="application/pdf,image/*"
                                                          onChange={(e) => handleSelectDocFile(application.id, doc.type, e.target.files ? e.target.files[0] : null)}
                                                        />
                                                      </label>
                                                      <button
                                                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:from-blue-700 hover:to-blue-800 text-xs"
                                                        disabled={!selectedFiles[docKey(application.id, doc.type)] || uploading[docKey(application.id, doc.type)]}
                                                        onClick={() => handleUploadDoc(application.id, doc.type)}
                                                      >
                                                        {uploading[docKey(application.id, doc.type)] ? (
                                                          <div className="flex items-center justify-center">
                                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                                            {t('studentDashboard.myApplications.paymentStatus.uploading') || 'Uploading...'}
                                                          </div>
                                                        ) : t('studentDashboard.myApplications.paymentStatus.uploadDocument') || 'Upload Document'}
                                                      </button>
                                                    </div>
                                                    {selectedFiles[docKey(application.id, doc.type)] && (
                                                      <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                        <span className="font-medium">{t('studentDashboard.myApplications.paymentStatus.selected') || 'Selected'}: </span>
                                                        {selectedFiles[docKey(application.id, doc.type)]?.name || ''}
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
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
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </section>
            );
          })()}
        </div>
        </>
      )}

      {/* Modal de confirmação para Application Fee */}
      {pendingApplication && (
        <ScholarshipConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => {
            setShowConfirmationModal(false);
            setPendingApplication(null);
          }}
          scholarship={pendingApplication.scholarships as any}
          onStripeCheckout={handleStripeCheckout}
          onPixCheckout={handlePixCheckout}
          onZelleCheckout={handleZelleApplicationFeeClick}
          onZelleSuccess={async () => {
            const { data: apps } = await supabase
              .from('scholarship_applications')
              .select(`
                *,
                scholarships:scholarship_id (
                  *,
                  universities:university_id (*)
                )
              `)
              .eq('student_id', userProfile?.id)
              .order('applied_at', { ascending: false });
            
            if (apps) {
              setApplications(apps as ApplicationWithScholarship[]);
            }
          }}
          isProcessing={isProcessingCheckout}
          zelleMetadata={{
            application_id: pendingApplication.id,
            selected_scholarship_id: pendingApplication.scholarship_id,
            application_fee_amount: getApplicationFeeWithDependents(Number((pendingApplication.scholarships as any)?.application_fee_amount || 35000))
          }}
        />
      )}

      {/* Modal de confirmação para Scholarship Fee */}
      {pendingScholarshipFeeApplication && (
        <ScholarshipConfirmationModal
          isOpen={showScholarshipFeeModal}
          onClose={() => {
            setShowScholarshipFeeModal(false);
            setPendingScholarshipFeeApplication(null);
          }}
          scholarship={pendingScholarshipFeeApplication.scholarships as any}
          onStripeCheckout={handleScholarshipFeeCheckout}
          onPixCheckout={handleScholarshipFeePixCheckout}
          onZelleCheckout={handleZelleScholarshipFeeClick}
          onZelleSuccess={async () => {
            const { data: apps } = await supabase
              .from('scholarship_applications')
              .select(`
                *,
                scholarships:scholarship_id (
                  *,
                  universities:university_id (*)
                )
              `)
              .eq('student_id', userProfile?.id)
              .order('applied_at', { ascending: false });
            
            if (apps) {
              setApplications(apps as ApplicationWithScholarship[]);
            }
          }}
          isProcessing={isProcessingScholarshipFeeCheckout}
          feeType="scholarship_fee"
          zelleMetadata={{
            application_id: pendingScholarshipFeeApplication.id,
            selected_scholarship_id: pendingScholarshipFeeApplication.scholarship_id
          }}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 9999px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: #c1c2c5;
        }
      `}</style>
      </div>
    </div>
  );
};
