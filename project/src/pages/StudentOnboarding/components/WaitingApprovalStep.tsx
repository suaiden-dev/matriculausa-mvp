import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Clock, CheckCircle, Loader2, Building, DollarSign, AlertCircle, GraduationCap, FileText, XCircle, Calendar, X } from 'lucide-react';
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
  const [checking, setChecking] = useState(false);
  const [applications, setApplications] = useState<ApplicationWithScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const isCheckingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estados para checklist de documentos
  const [openChecklists, setOpenChecklists] = useState<Record<string, boolean>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

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
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
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

  // Função para handle Zelle Application Fee click - o ZelleCheckout será mostrado inline no modal
  const handleZelleApplicationFeeClick = () => {
    // O ScholarshipConfirmationModal já mostra o ZelleCheckout inline quando Zelle é selecionado
  };

  // Função para handle Zelle Scholarship Fee click - o ZelleCheckout será mostrado inline no modal
  const handleZelleScholarshipFeeClick = () => {
    // O ScholarshipConfirmationModal já mostra o ZelleCheckout inline quando Zelle é selecionado
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-16 h-16 text-blue-600 mx-auto animate-spin mb-4" />
        <p className="text-gray-600">Loading your applications...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        {userProfile?.documents_status === 'approved' && (
          <div className="text-center mb-6">
            <div className="mb-4">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Review Applications & Complete Payments
            </h2>
            <p className="text-gray-600 mb-2">
              Your documents have been approved! Review your applications and complete payments below.
            </p>
          </div>
        )}
        {userProfile?.documents_status !== 'approved' && (
          <div className="space-y-6">
            {/* Main Header Card */}
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 sm:p-8 border border-blue-100 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Building className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                    Processo Seletivo
                  </h2>
                  <p className="text-gray-600 text-sm sm:text-base">
                    Suas aplicações estão sendo analisadas pelas universidades
                  </p>
                </div>
              </div>
            </div>

            {/* Status Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Card */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm">
                      Status da Aplicação
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Sua aplicação foi enviada com todos os documentos necessários. As universidades estão analisando seus materiais.
                    </p>
                  </div>
                </div>
              </div>

              {/* Important Notice Card */}
              <div className="bg-white rounded-xl p-5 border-2 border-blue-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 mb-1 text-sm">
                      Atenção
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      As universidades podem rejeitar documentos. Se isso acontecer, você verá o motivo e poderá fazer upload novamente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-200">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {loading ? 'Loading your applications...' : 'No applications found. Your applications will appear here once your documents are processed.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Seção: Aplicações Aprovadas */}
          {(() => {
            const approvedList = applications.filter(a => a.status === 'approved' || a.status === 'enrolled');
            if (approvedList.length === 0) return null;
            
            // Verificar se há uma aplicação com scholarship fee pago (aplicação selecionada)
            const selectedApp = approvedList.find(a => (a as any).is_scholarship_fee_paid);
            const hasSelectedScholarship = !!selectedApp;
            
            return (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">{t('studentDashboard.myApplications.sections.approvedByUniversity') || 'Approved by the University'}</h3>
                  <span className="text-sm text-green-700 bg-green-100 border border-green-200 px-3 py-1 rounded-full font-medium">{approvedList.length} {t('studentDashboard.myApplications.sections.approved') || 'approved'}</span>
                </div>
                {/* Important Notice */}
                <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 p-4 sm:p-5 text-sm text-blue-800">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold">{t('studentDashboard.myApplications.importantNotice.title')}</span> {t('studentDashboard.myApplications.importantNotice.description')}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {approvedList.map((application) => {
                    const Icon = getStatusIcon(application.status);
                    const scholarship = application.scholarships;
                    if (!scholarship) return null;
                    
                    const applicationFeePaid = !!(application as any).is_application_fee_paid;
                    const scholarshipFeePaid = !!(application as any).is_scholarship_fee_paid;

              return (
                <div
                  key={application.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-slate-200 overflow-hidden"
                >
                  <div className="p-4">
                    {/* Header: Title + Status */}
                    <div className="mb-3">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-slate-900 text-base leading-tight flex-1 pr-2">
                          {scholarship.title}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold border ${getStatusColor(application.status)} flex-shrink-0`}>
                          <Icon className="h-3 w-3 mr-1" />
                          {getStatusLabel(application.status)}
                        </span>
                      </div>
                    </div>

                    {/* University + Level na mesma linha */}
                    <div className="flex items-center justify-between text-sm mb-2">
                      <div className="flex items-center text-slate-600">
                        <Building className="h-3 w-3 mr-1.5 text-slate-500 flex-shrink-0" />
                        <span className="font-medium text-sm truncate">{scholarship.universities?.name || 'Unknown University'}</span>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        {scholarship.level ? scholarship.level.charAt(0).toUpperCase() + scholarship.level.slice(1) : 'N/A'}
                      </span>
                    </div>

                    {/* Scholarship Value */}
                    <div className="flex items-center text-green-700 mb-3">
                      <DollarSign className="h-3 w-3 mr-1.5 text-green-600 flex-shrink-0" />
                      <span className="font-bold text-sm">
                        {formatAmount(scholarship.annual_value_with_scholarship || 0)}
                      </span>
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
                                            ? 'bg-green-100 border-green-400 text-green-600' 
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
                                                ? 'bg-green-50 text-green-700 border-green-200' 
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

                    {/* Payment Status Section - apenas quando documentos estão aprovados E aplicação está aprovada */}
                    {userProfile?.documents_status === 'approved' && (application.status === 'approved' || application.status === 'enrolled') && (
                      <div className="border-t border-slate-200 pt-3 mt-3">
                        <h3 className="font-bold text-gray-900 mb-3 text-xs">{t('studentDashboard.myApplications.paymentStatus.title') || 'Payment Status'}</h3>
                        <div className="space-y-2">
                          {/* Application Fee */}
                          <div className="bg-white border-2 border-slate-200 rounded-lg p-2.5 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-900 text-xs">{t('studentDashboard.myApplications.paymentStatus.applicationFee') || 'Application Fee'}</span>
                              <span className="text-sm font-bold text-gray-700">
                                {formatAmount(getApplicationFeeWithDependents(Number((application.scholarships as any)?.application_fee_amount || 35000)))}
                              </span>
                            </div>
                            {applicationFeePaid ? (
                              <div className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {t('studentDashboard.myApplications.paymentStatus.paid') || 'Paid'}
                              </div>
                            ) : (
                              <button
                                onClick={() => handleApplicationFeeClick(application)}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg text-xs"
                                disabled={
                                  (hasSelectedScholarship && !scholarshipFeePaid) ||
                                  (isBlocked && pendingPayment?.fee_type === 'application_fee' && 
                                   (pendingPayment.metadata?.application_id === application.id || 
                                    pendingPayment.metadata?.selected_scholarship_id === application.scholarship_id))
                                }
                              >
                                {t('studentDashboard.myApplications.paymentStatus.payApplicationFee') || 'Pay Application Fee'}
                              </button>
                            )}
                          </div>

                          {/* Scholarship Fee */}
                          <div className="bg-white border-2 border-slate-200 rounded-lg p-2.5 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-900 text-xs">{t('studentDashboard.myApplications.paymentStatus.scholarshipFee') || 'Scholarship Fee'}</span>
                              <span className="text-sm font-bold text-gray-700">{formatAmount(Number(getFeeAmount('scholarship_fee')))}</span>
                            </div>
                            {(() => {
                              const paymentKey = `${application.id}_scholarship_fee`;
                              const paymentStatus = zellePaymentStatus[paymentKey];
                              const isProcessing = paymentStatus?.status === 'processing';
                              const isRejected = paymentStatus?.status === 'rejected';
                              const isBlockedForThis = isBlocked && pendingPayment?.fee_type === 'scholarship_fee' && 
                                (pendingPayment.metadata?.application_id === application.id || 
                                 pendingPayment.metadata?.selected_scholarship_id === application.scholarship_id);

                              if (scholarshipFeePaid) {
                                return (
                                  <div className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {t('studentDashboard.myApplications.paymentStatus.paid') || 'Paid'}
                                  </div>
                                );
                              }

                              if (isRejected && paymentStatus?.rejectionReason) {
                                return (
                                  <div className="space-y-2">
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                                      <div className="flex items-start gap-2">
                                        <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                          <p className="text-xs font-semibold text-red-800 mb-1">Payment Rejected</p>
                                          <p className="text-xs text-red-700">{paymentStatus.rejectionReason}</p>
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleScholarshipFeeClick(application)}
                                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg text-xs"
                                      disabled={!applicationFeePaid || (hasSelectedScholarship && !scholarshipFeePaid)}
                                    >
                                      {t('studentDashboard.myApplications.paymentStatus.payScholarshipFee') || 'Pay Scholarship Fee'}
                                    </button>
                                  </div>
                                );
                              }

                              if (isProcessing || isBlockedForThis) {
                                return (
                                  <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-2">
                                    <div className="flex items-center gap-2">
                                      <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                                      <span className="text-xs font-semibold text-amber-800">Processing Payment...</span>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <button
                                  onClick={() => handleScholarshipFeeClick(application)}
                                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg text-xs"
                                  disabled={
                                    !applicationFeePaid || 
                                    scholarshipFeePaid || 
                                    (hasSelectedScholarship && !scholarshipFeePaid)
                                  }
                                >
                                  {t('studentDashboard.myApplications.paymentStatus.payScholarshipFee') || 'Pay Scholarship Fee'}
                                </button>
                              );
                            })()}
                          </div>
                        </div>
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

          {/* Seção: Pendentes e Em Progresso */}
          {(() => {
            const otherList = applications.filter(a => a.status !== 'approved' && a.status !== 'enrolled');
            if (otherList.length === 0) return null;
            
            return (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">{t('studentDashboard.myApplications.sections.pendingAndInProgress') || 'Pending and In Progress'}</h3>
                  <span className="text-sm text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full font-medium">{otherList.length} {t('studentDashboard.myApplications.sections.applications') || 'applications'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherList.map((application) => {
                    const Icon = getStatusIcon(application.status);
                    const scholarship = application.scholarships;
                    if (!scholarship) return null;

                    // Obter descrição detalhada do status
                    const statusInfo = getStatusDescription(application);

                    return (
                      <div
                        key={application.id}
                        className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-slate-200 overflow-hidden"
                      >
                        <div className="p-4">
                          {/* Header: Title + Status */}
                          <div className="mb-3">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-bold text-slate-900 text-base leading-tight flex-1 pr-2">
                                {scholarship.title}
                              </h3>
                              <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold border ${getStatusColor(application.status)} flex-shrink-0`}>
                                <Icon className="h-3 w-3 mr-1" />
                                {getStatusLabel(application.status)}
                              </span>
                            </div>
                          </div>

                          {/* University + Level na mesma linha */}
                          <div className="flex items-center justify-between text-sm mb-2">
                            <div className="flex items-center text-slate-600">
                              <Building className="h-3 w-3 mr-1.5 text-slate-500 flex-shrink-0" />
                              <span className="font-medium text-sm truncate">{scholarship.universities?.name || 'Unknown University'}</span>
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                              <GraduationCap className="h-3 w-3 mr-1" />
                              {scholarship.level ? scholarship.level.charAt(0).toUpperCase() + scholarship.level.slice(1) : 'N/A'}
                            </span>
                          </div>

                          {/* Compact chips row: Status, Date, Value */}
                          <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-md border ${getStatusColor(application.status)} whitespace-nowrap`}>
                              <Icon className="h-3 w-3 mr-1" />
                              {getStatusLabel(application.status)}
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-gray-700 border border-gray-200 whitespace-nowrap">
                              <Calendar className="h-3 w-3 mr-1.5 text-gray-500" />
                              {new Date(application.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 whitespace-nowrap">
                              <DollarSign className="h-3 w-3 mr-1 text-green-600" />
                              {formatAmount(scholarship.annual_value_with_scholarship || 0)}
                            </span>
                          </div>

                          {/* Status Details Section - Removed for pending status with documents under review */}
                          {!(statusInfo.title === t('studentDashboard.myApplications.statusDescriptions.documentsUnderUniversityReview.title')) && (
                            <div className="mb-4">
                              <div className={`rounded-lg p-3 border ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
                                <h3 className={`font-bold text-sm ${statusInfo.color} mb-2`}>
                                  {statusInfo.title}
                                </h3>
                                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                                  {statusInfo.description}
                                </p>
                              </div>
                            </div>
                          )}

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
                                                  ? 'bg-green-100 border-green-400 text-green-600' 
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
                                                      ? 'bg-green-50 text-green-700 border-green-200' 
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
      )}

      {/* Botão para completar onboarding quando todas as fees estiverem pagas */}
      {userProfile?.documents_status === 'approved' && applications.length > 0 && (() => {
        // Filtrar apenas aplicações aprovadas (mesma lógica do MyApplications)
        const approvedApplications = applications.filter(app => 
          app.status === 'approved' || app.status === 'enrolled'
        );
        
        // Verificar se todas as aplicações aprovadas têm todas as fees pagas
        const allFeesPaid = approvedApplications.length > 0 && approvedApplications.every(app => 
          (app as any).is_application_fee_paid && (app as any).is_scholarship_fee_paid
        );
        
        if (allFeesPaid && onComplete) {
          return (
            <div className="mt-8 text-center">
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-6">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-green-900 mb-2">All Payments Complete!</h3>
                <p className="text-sm text-green-700 mb-4">
                  You've successfully paid all fees for your applications. You can now complete the onboarding process.
                </p>
                <button
                  onClick={onComplete}
                  className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Complete Onboarding
                </button>
              </div>
            </div>
          );
        }
        return null;
      })()}

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
          onZelleSuccess={() => {
            fetchApplications();
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
          onZelleSuccess={() => {
            fetchApplications();
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
  );
};
