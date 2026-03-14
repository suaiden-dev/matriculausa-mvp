import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  Building,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { usePaymentBlocked } from '../../hooks/usePaymentBlocked';
import { supabase } from '../../lib/supabase';
import { Application, Scholarship } from '../../types';
import { useCartStore } from '../../stores/applicationStore';
import { convertCentsToDollars } from '../../utils/currency';
import TruncatedText from '../../components/TruncatedText';
import { useStudentApplicationsQuery, useStudentPaidAmountsQuery, usePromotionalCouponQuery } from '../../hooks/useStudentDashboardQueries';
import { invalidateStudentDashboardApplications, invalidateStudentDashboardFees, invalidateStudentDashboardCoupons } from '../../lib/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { getPlacementFee, formatPlacementFee } from '../../utils/placementFeeCalculator';
// import StudentDashboardLayout from "./StudentDashboardLayout";
// import CustomLoading from '../../components/CustomLoading';

// Combine os tipos para incluir os detalhes da bolsa na aplicação
type ApplicationWithScholarship = Application & {
  scholarships: Scholarship | null;
};

// Labels amigáveis para os documentos principais - será definido dentro do componente

const MyApplications: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const { getFeeAmount } = useFeeConfig(user?.id);
  const { isBlocked, pendingPayment, loading: paymentBlockedLoading } = usePaymentBlocked();
  const queryClient = useQueryClient();

  const isNewFlowUser = !!(userProfile as any)?.placement_fee_flow;

  // React Query hooks for cached data
  // isPending = sem dados no cache ainda (primeira carga)
  // isFetching = buscando em background (pode ter dados em cache)
  const { data: applications = [], isPending, error: queryError } = useStudentApplicationsQuery(userProfile?.id);
  const { data: realPaidAmounts = {} } = useStudentPaidAmountsQuery(user?.id, ['application', 'scholarship', 'placement']);
  const { data: scholarshipFeePromotionalCoupon = null } = usePromotionalCouponQuery(user?.id, 'scholarship_fee');
  const { data: applicationFeePromotionalCoupon = null } = usePromotionalCouponQuery(user?.id, 'application_fee');
  // Helper: calcular Application Fee exibida considerando dependentes (legacy e simplified)
  // O valor vem em centavos do banco, precisa converter para dólares primeiro
  const getApplicationFeeWithDependents = (baseInCents: number): number => {
    // Converter centavos para dólares
    const baseInDollars = convertCentsToDollars(baseInCents);
    const deps = Number(userProfile?.dependents) || 0;
    // ✅ CORREÇÃO: Adicionar $100 por dependente para ambos os sistemas (legacy e simplified)
    return deps > 0 ? baseInDollars + deps * 100 : baseInDollars;
  };

  // Labels amigáveis para os documentos principais
  const DOCUMENT_LABELS: Record<string, string> = {
    passport: t('studentDashboard.myApplications.documents.passport'),
    diploma: t('studentDashboard.myApplications.documents.highSchoolDiploma'),
    funds_proof: t('studentDashboard.myApplications.documents.proofOfFunds'),
  };

  // Convert query error to string for compatibility
  const error = queryError ? 'Erro ao buscar aplicações.' : null;

  // const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // const [payingId] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  // Document Requests uploads grouped by applicationId
  const [requestUploadsByApp, setRequestUploadsByApp] = useState<Record<string, { title: string; status: string; review_notes?: string; rejection_reason?: string }[]>>({});
  // const [pendingUploads] = useState<Record<string, Record<string, File | null>>>({});
  // const [uploadingAppId, setUploadingAppId] = useState<string | null>(null);
  // const navigate = useNavigate();
  const location = useLocation();
  const syncCartWithDatabase = useCartStore(state => state.syncCartWithDatabase);


  // Estado para controlar abertura/fechamento individual dos documents checklist
  const [openChecklists, setOpenChecklists] = useState<Record<string, boolean>>({});


  // Função para alternar o estado de um checklist específico
  const toggleChecklist = (applicationId: string) => {
    setOpenChecklists(prev => ({
      ...prev,
      [applicationId]: !prev[applicationId]
    }));
  };

  /*
  // Função para verificar se há documentos pendentes (mover para antes das outras funções)
  const hasPendingDocuments = (application: ApplicationWithScholarship) => {
    const docs = parseApplicationDocuments((application as any).documents);
    return docs.some(doc =>
      doc.status === 'pending' || doc.status === 'under_review' || doc.status === 'changes_requested'
    );
  };
  */



  // Função para verificar se há documentos rejeitados e abrir automaticamente o checklist
  // Nota: Não abrimos automaticamente se a aplicação em si já foi rejeitada finalmene
  const checkAndOpenRejectedDocuments = (application: ApplicationWithScholarship) => {
    if (application.status === 'rejected') return;

    const docs = parseApplicationDocuments((application as any).documents);
    const hasRejectedDocuments = docs.some(doc =>
      (doc.status || '').toLowerCase() === 'changes_requested' ||
      (doc.status || '').toLowerCase() === 'rejected'
    );

    if (hasRejectedDocuments && !openChecklists[application.id]) {
      setOpenChecklists(prev => ({
        ...prev,
        [application.id]: true
      }));
    }
  };

  // Paid amounts are now fetched via useStudentPaidAmountsQuery hook (cached)

  // Promotional coupons are now fetched via usePromotionalCouponQuery hooks (cached)
  // Listen to coupon validation events to invalidate cache
  useEffect(() => {
    // Listen to coupon validation events from modal
    const handleCouponValidation = (event: CustomEvent) => {
      if (event.detail?.isValid && event.detail?.discountAmount) {
        // Determine which fee_type based on context
        const feeType = event.detail?.fee_type || 'scholarship_fee';

        // Invalidate the appropriate coupon query
        if (feeType === 'application_fee') {
          invalidateStudentDashboardCoupons(queryClient);
        } else {
          invalidateStudentDashboardCoupons(queryClient);
        }
      } else {
        // If coupon was removed, invalidate both
        invalidateStudentDashboardCoupons(queryClient);
        invalidateStudentDashboardCoupons(queryClient);
      }
    };

    window.addEventListener('promotionalCouponValidated', handleCouponValidation as EventListener);

    return () => {
      window.removeEventListener('promotionalCouponValidated', handleCouponValidation as EventListener);
    };
  }, [user?.id, queryClient]);

  // Fetch document requests for applications (not cached, supplementary data)
  useEffect(() => {
    let isMounted = true;

    const fetchDocumentRequests = async () => {
      if (!applications.length || !user?.id) return;

      try {
        // Verificar e abrir automaticamente checklists de documentos rejeitados
        applications.forEach((app: ApplicationWithScholarship) => checkAndOpenRejectedDocuments(app));

        // Buscar uploads de Document Requests do aluno e agrupar por aplicação
        const apps = applications as any[];
        const appIds = apps.map(a => a.id);
        const uniIds = apps.map(a => a.scholarships?.university_id).filter(Boolean);

        // Buscar requests individuais da aplicação e globais por universidade
        const { data: reqs } = await supabase
          .from('document_requests')
          .select('id,title,scholarship_application_id,university_id,is_global')
          .or(`scholarship_application_id.in.(${appIds.join(',')}),and(is_global.eq.true,university_id.in.(${uniIds.join(',')}))`);

        const requestIds = (reqs || []).map(r => r.id);

        if (requestIds.length) {
          const { data: uploads } = await supabase
            .from('document_request_uploads')
            .select('document_request_id,status,review_notes,rejection_reason,uploaded_at,uploaded_by')
            .in('document_request_id', requestIds)
            .eq('uploaded_by', user.id);

          // Mapear requestId -> {title, appIds[]}
          const reqMeta: Record<string, { title: string; appIds: string[] }> = {};
          (reqs || []).forEach((r: any) => {
            if (r.scholarship_application_id) {
              reqMeta[r.id] = { title: r.title, appIds: [r.scholarship_application_id] };
            } else if (r.is_global && r.university_id) {
              const targetApps = apps.filter(a => a.scholarships?.university_id === r.university_id).map(a => a.id);
              reqMeta[r.id] = { title: r.title, appIds: targetApps };
            }
          });

          const grouped: Record<string, { title: string; status: string; review_notes?: string; rejection_reason?: string }[]> = {};
          (uploads || []).forEach((u: any) => {
            const meta = reqMeta[u.document_request_id];
            if (!meta) return;
            meta.appIds.forEach(appId => {
              if (!grouped[appId]) grouped[appId] = [];
              grouped[appId].push({
                title: meta.title,
                status: (u.status || '').toLowerCase(),
                review_notes: u.review_notes || undefined,
                rejection_reason: u.rejection_reason || undefined
              });
            });
          });

          if (isMounted) setRequestUploadsByApp(grouped);
        } else {
          if (isMounted) setRequestUploadsByApp({});
        }
      } catch (err) {
        console.error('Error fetching document requests:', err);
      }
    };

    fetchDocumentRequests();

    return () => {
      isMounted = false;
    };
  }, [applications, user?.id]);

  // React Query handles automatic background refetching and window focus refetch
  // No manual polling needed

  // Nenhum fallback de cart: a página lista exclusivamente o que está em scholarship_applications

  // Handle redirect from payment success page
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('from') === 'payment-success') {
      // Invalidate queries to force fresh data fetch
      invalidateStudentDashboardApplications(queryClient);
      invalidateStudentDashboardFees(queryClient);
      invalidateStudentDashboardCoupons(queryClient);

      // Remove parameter from URL to avoid loops
      params.delete('from');
      window.history.replaceState({}, '', `${location.pathname}${params.toString() ? '?' + params.toString() : ''}`);
    }
  }, [location.search, queryClient]);

  // Sincronizar cart com banco de dados quando a página carrega
  useEffect(() => {
    if (user?.id) {
      syncCartWithDatabase(user.id);
    }
  }, [user?.id, syncCartWithDatabase]);

  // Configurar real-time subscription para atualizações de pagamentos
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`student-payments-myapplications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'individual_fee_payments',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Invalidate fees query to fetch fresh data
          invalidateStudentDashboardFees(queryClient);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Quando o aluno pagar a taxa de uma bolsa aprovada, escolhemos ela como principal e escondemos as demais
  // Garantimos que apenas aplicações APROVADAS ou MATRICULADAS sejam escolhidas como "principais" para esconder as outras
  const chosenPaidApp = applications.find(
    (a: ApplicationWithScholarship) => 
      (a.status === 'approved' || a.status === 'enrolled') && (
        !!(a as any).is_application_fee_paid || 
        !!(a as any).is_scholarship_fee_paid || 
        !!(a as any).acceptance_letter_url ||
        (isNewFlowUser && (!!(userProfile as any)?.is_placement_fee_paid || !!realPaidAmounts.placement))
      )
  );
  const applicationsToShow = chosenPaidApp
    ? applications.filter((a: ApplicationWithScholarship) => a.id === chosenPaidApp.id || a.status === 'rejected')
    : applications;



  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Função para sanitizar nome do arquivo
  const sanitizeFileName = (fileName: string): string => {
    return fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  // const onSelectFile = (appId: string, type: string, file: File | null) => {
  //   setPendingUploads(prev => ({ ...prev, [appId]: { ...(prev[appId] || {}), [type]: file } }));
  // };

  // const submitUpdatedDocs = async (application: any) => { };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': 
      case 'enrolled': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'under_review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending_scholarship_fee': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': 
      case 'enrolled': return CheckCircle;
      case 'rejected': return XCircle;
      case 'under_review': return AlertCircle;
      case 'pending_scholarship_fee': return DollarSign;
      default: return Clock;
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'approved' || status === 'enrolled') return t('studentDashboard.myApplications.statusLabels.approvedByUniversity');
    if (status === 'rejected') return t('studentDashboard.myApplications.statusLabels.notSelectedForScholarship');
    if (status === 'pending') return t('studentDashboard.myApplications.statusLabels.pending');
    if (status === 'under_review') return t('studentDashboard.myApplications.statusLabels.underReview');
    if (status === 'pending_scholarship_fee') return t('studentDashboard.myApplications.statusLabels.pendingScholarshipFee');
    // Fallback para outros status
    return status.replace('_', ' ').toUpperCase();
  };






  /*
  // Estilo para status dos documentos (nível do documento, não da aplicação)
  const getDocBadgeClasses = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'bg-green-100 text-green-700 border border-green-200';
    if (s === 'changes_requested') return 'bg-red-100 text-red-700 border border-red-200';
    if (s === 'under_review') return 'bg-amber-100 text-amber-700 border border-amber-200';
    return 'bg-slate-100 text-slate-700 border border-slate-200';
  };
  */

  const docKey = (applicationId: string, type: string) => `${applicationId}:${type}`;

  const handleSelectDocFile = (applicationId: string, type: string, file: File | null) => {
    setSelectedFiles(prev => ({ ...prev, [docKey(applicationId, type)]: file }));
  };

  const handleUploadDoc = async (applicationId: string, type: string) => {
    const key = docKey(applicationId, type);
    const file = selectedFiles[key];
    if (!user?.id || !file) return;
    setUploading(prev => ({ ...prev, [key]: true }));
    try {
      const sanitizedName = sanitizeFileName(file.name);
      const path = `${user.id}/${applicationId}-${type}-${Date.now()}-${sanitizedName}`;
      const { data, error: upErr } = await supabase.storage
        .from('student-documents')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const publicUrl = supabase.storage.from('student-documents').getPublicUrl(data?.path || path).data.publicUrl;
      if (!publicUrl) throw new Error('Failed to get file URL');
      // Log no histórico do aluno
      await supabase.from('student_documents').insert({ user_id: user.id, type, file_url: publicUrl, status: 'under_review' });

      // Atualizar documentos da aplicação
      const app = applications.find((a: ApplicationWithScholarship) => a.id === applicationId);
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
        // Não falhar o upload se a notificação falhar
      }

      // Invalidate applications query to refetch fresh data
      invalidateStudentDashboardApplications(queryClient);

      // Limpa seleção
      setSelectedFiles(prev => ({ ...prev, [key]: null }));
    } catch (e) {
      // opcional: setError local da página
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  // Normaliza o array de documentos da aplicação para lidar com ambos os formatos:
  // - string[] (legado)
  // - { type, url, status, review_notes }[] (atual)
  const parseApplicationDocuments = (documents: any): { type: string; status?: string; review_notes?: string; rejection_reason?: string; uploaded_at?: string }[] => {
    if (!Array.isArray(documents)) return [];
    if (documents.length === 0) return [];
    if (typeof documents[0] === 'string') {
      return (documents as string[]).map((t) => ({ type: t }));
    }
    return (documents as any[]).map((d) => ({
      type: d.type,
      status: d.status,
      review_notes: d.review_notes,
      rejection_reason: d.rejection_reason,
      uploaded_at: d.uploaded_at
    }));
  };

  // const getStatusMessage = (status: string) => {
  //   switch (status) {
  //     case 'approved': return '';
  //     case 'rejected': return 'Unfortunately, your application was not selected.';
  //     case 'under_review': return 'Your application is currently being reviewed.';
  //     case 'pending_scholarship_fee': return 'Pending scholarship fee payment.';
  //     default: return 'Your application is pending review.';
  //   }
  // };

  const stats = {
    total: applicationsToShow.length,
    pending: applicationsToShow.filter((app: ApplicationWithScholarship) => app.status === 'pending').length,
    approved: applicationsToShow.filter((app: ApplicationWithScholarship) => app.status === 'approved' || app.status === 'enrolled').length,
    rejected: applicationsToShow.filter((app: ApplicationWithScholarship) => app.status === 'rejected').length,
    under_review: applicationsToShow.filter((app: ApplicationWithScholarship) => app.status === 'under_review').length,
    pending_scholarship_fee: applicationsToShow.filter((app: ApplicationWithScholarship) => app.status === 'pending_scholarship_fee').length,
  };

  // const createOrGetApplication = async (scholarshipId: string, studentProfileId: string) => {
  //   // Verifica se já existe aplicação
  //   const { data: existing, error: fetchError } = await supabase
  //     .from('scholarship_applications')
  //     .select('id')
  //     .eq('student_id', studentProfileId)
  //     .eq('scholarship_id', scholarshipId)
  //     .maybeSingle();
  //   if (fetchError) throw fetchError;
  //   if (existing) return { applicationId: existing.id };
  //   // Cria nova aplicação
  //   const { data, error } = await supabase
  //     .from('scholarship_applications')
  //     .insert({
  //       student_id: studentProfileId,
  //       scholarship_id: scholarshipId,
  //       status: 'pending_scholarship_fee',
  //       applied_at: new Date().toISOString(),
  //       student_process_type: localStorage.getItem('studentProcessType') || null,
  //     })
  //     .select('id')
  //     .single();
  //   if (error) throw error;
  //   return { applicationId: data.id };
  // };

  // Garante/recupera a application para uso no checkout
  // DEPRECATED: Esta função não é mais necessária pois usamos React Query
  // const ensureApplication = async (scholarshipId: string): Promise<{ applicationId: string } | undefined> => {
  //   if (!userProfile?.id) return undefined;
  //   const { data: existing, error: fetchError } = await supabase
  //     .from('scholarship_applications')
  //     .select('id')
  //     .eq('student_id', userProfile.id)
  //     .eq('scholarship_id', scholarshipId)
  //     .maybeSingle();
  //   if (fetchError) return undefined;
  //   if (existing) return { applicationId: existing.id };
  //   const { data, error } = await supabase
  //     .from('scholarship_applications')
  //     .insert({
  //       student_id: userProfile.id,
  //       scholarship_id: scholarshipId,
  //       status: 'pending',
  //       applied_at: new Date().toISOString(),
  //       student_process_type: localStorage.getItem('studentProcessType') || null,
  //     })
  //     .select('id')
  //     .single();
  //   if (error) return undefined;
  //   return { applicationId: data.id };
  // };

  // Show loading state only on first load (no cached data yet)
  if (isPending) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 font-medium">{t('studentDashboard.myApplications.loading')}</p>
        </div>
      </div>
    );
  }



  const getLevelColor = (level: any) => {
    switch (level.toLowerCase()) {
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
    // Mapear "doctoral" para "doctorate" se necessário
    const mappedKey = levelKey === 'doctoral' ? 'doctorate' : levelKey;
    const translationKey = `scholarshipsPage.filters.levels.${mappedKey}`;
    const translated = t(translationKey);
    // Se a tradução não existir (retorna a própria chave), tenta fallback
    if (!translated || translated === translationKey || translated.includes('scholarshipsPage.filters.levels')) {
      // Fallback: capitaliza a primeira letra
      return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
    }
    return translated;
  };

  if (error) {
    return <div className="text-red-500">{t('studentDashboard.myApplications.error', { message: error })}</div>;
  }

  // Function to handle application fee payment confirmation
  const handleApplicationFeeClick = (application: ApplicationWithScholarship) => {
    // Redirecionar para o onboarding salvando a aplicação selecionada
    localStorage.setItem('selected_application_id', application.id);
    navigate('/student/onboarding?step=payment');
  };

  // Function to handle scholarship fee payment confirmation
  const handleScholarshipFeeClick = (application: ApplicationWithScholarship) => {
    // Redirecionar para o onboarding salvando a aplicação selecionada
    localStorage.setItem('selected_application_id', application.id);
    const step = isNewFlowUser ? 'placement_fee' : 'scholarship_fee';
    navigate(`/student/onboarding?step=${step}`);
  };


  return (
    <>
      <div className="pt-6 sm:pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 mb-1 sm:mb-2">{t('studentDashboard.sidebar.myApplications')}</h2>
              <p className="text-base sm:text-lg text-slate-600">{t('studentDashboard.myApplications.subtitle')}</p>
            </div>
          </div>

          {/* Aviso removido conforme solicitação */}

          {/* TODO: FUTURE_REMOVAL - Hiding stats per user request */}
          {false && (
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
          )}

          {/* TODO: FUTURE_REMOVAL - Hiding stats per user request */}
          {true && (
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
          )}

          {/* TODO: FUTURE_REMOVAL - Hiding guidance per user request */}
          {true && (
            <div className="hidden bg-white rounded-3xl shadow-lg border border-slate-200 p-4 sm:p-6 lg:p-8 mb-8">
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
          )}

          {applications.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 sm:p-12 text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">{t('studentDashboard.myApplications.noApplications.title')}</h3>
              <p className="text-slate-500 mb-6 sm:mb-8 max-w-lg mx-auto text-base sm:text-lg leading-relaxed px-4">
                {t('studentDashboard.myApplications.noApplications.description')}
              </p>
              <Link
                to="/student/onboarding"
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105 inline-flex items-center text-sm sm:text-base"
              >
                Começar Processo
                <ArrowRight className="ml-2 h-5 w-5 sm:h-6 sm:w-6" />
              </Link>
            </div>
          ) : (
            <>
              {/* Applications List - two sections */}
              <div className="space-y-10">
                {/* Approved */}
                {(() => {
                  const approvedList = applicationsToShow.filter((a: ApplicationWithScholarship) => a.status === 'approved' || a.status === 'enrolled');
                  if (approvedList.length === 0) return null;
                  const selectedApp = approvedList.find((a: ApplicationWithScholarship) => (a as any).is_scholarship_fee_paid);
                  const hasSelectedScholarship = !!selectedApp;
                  return (
                    <section >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-slate-900">{t('studentDashboard.myApplications.sections.approvedByUniversity')}</h3>
                        <span className="text-sm text-green-700 bg-green-100 border border-green-200 md:px-4 md:py-2 px-2 py-1 rounded-full font-medium">{approvedList.length} {t('studentDashboard.myApplications.sections.approved')}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:overflow-x-auto md:pb-4 gap-6" style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch'
                      }}>
                        {approvedList.map((application: ApplicationWithScholarship) => {
                          const Icon = getStatusIcon(application.status);
                          const scholarship = application.scholarships;
                          const applicationFeePaid = !!application.is_application_fee_paid;
                          const scholarshipFeePaid = !!application.is_scholarship_fee_paid || 
                                                     !!application.acceptance_letter_url ||
                                                     (isNewFlowUser && (!!(userProfile as any)?.is_placement_fee_paid || !!realPaidAmounts.placement));
                          if (!scholarship) return null;



                          return (
                            <div key={application.id} className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-slate-200 overflow-hidden group w-full md:flex-shrink-0 md:min-w-0 md:self-start">
                              <div className="p-4">
                                {/* Header Section Compacto */}
                                <div className="mb-4">
                                  {/* Linha 1: Título e Status Badge */}
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                    <h2 className="font-bold text-gray-900 text-base leading-tight flex-1 min-w-0 pr-0 sm:pr-3">
                                      <span className="line-clamp-2">{scholarship.title}</span>
                                    </h2>
                                    <span className={`inline-flex items-center px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold border flex-shrink-0 self-start sm:self-auto ${getStatusColor(application.status === 'enrolled' ? 'approved' : application.status)}`}>
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

                                {/* Status Details REMOVED as per user request */}


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
                                <div className="mb-6">
                                  <h3 className="font-bold text-gray-900 mb-4 text-base">{t('studentDashboard.myApplications.paymentStatus.title')}</h3>
                                  <div className="space-y-3">
                                    <div className="bg-white border-2 border-slate-200 rounded-xl p-3 shadow-sm">
                                      <div className="flex items-center justify-between mb-3">
                                        <span className="font-semibold text-gray-900 text-sm">{t('studentDashboard.myApplications.paymentStatus.applicationFee')}</span>
                                        {realPaidAmounts.application !== undefined ? (
                                          // Se há pagamento registrado, mostrar valor bruto (gross_amount_usd) ou amount
                                          <span className="text-base font-bold text-gray-700">{formatAmount(realPaidAmounts.application)}</span>
                                        ) : applicationFeePromotionalCoupon ? (
                                          // Se há cupom promocional, mostrar valor com desconto
                                          <div className="text-right">
                                            <div className="text-base font-bold text-gray-400 line-through">{formatAmount(getApplicationFeeWithDependents(Number(scholarship.application_fee_amount || 35000)))}</div>
                                            <div className="text-base font-bold text-green-600">{formatAmount(applicationFeePromotionalCoupon.finalAmount)}</div>
                                          </div>
                                        ) : (
                                          // Sem cupom, mostrar valor normal da taxa
                                          <span className="text-base font-bold text-gray-700">{formatAmount(getApplicationFeeWithDependents(Number(scholarship.application_fee_amount || 35000)))}</span>
                                        )}
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
                                          <span className="font-semibold text-gray-900 text-sm">
                                            {isNewFlowUser 
                                              ? t('studentDashboard.myApplications.paymentStatus.placementFee') 
                                              : t('studentDashboard.myApplications.paymentStatus.scholarshipFee')}
                                          </span>
                                          {realPaidAmounts.scholarship !== undefined ? (
                                            <span className="text-base font-bold text-gray-700">{formatAmount(realPaidAmounts.scholarship)}</span>
                                          ) : isNewFlowUser ? (
                                            <span className="text-base font-bold text-gray-700">
                                              {formatPlacementFee(getPlacementFee(scholarship.annual_value_with_scholarship || 0, scholarship.placement_fee_amount))}
                                            </span>
                                          ) : scholarshipFeePromotionalCoupon ? (
                                            <div className="text-right">
                                              <div className="text-base font-bold text-gray-400 line-through">{formatAmount(Number(getFeeAmount('scholarship_fee')))}</div>
                                              <div className="text-base font-bold text-green-600">{formatAmount(scholarshipFeePromotionalCoupon.finalAmount)}</div>
                                            </div>
                                          ) : (
                                            <span className="text-base font-bold text-gray-700">{formatAmount(Number(getFeeAmount('scholarship_fee')))}</span>
                                          )}
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
                                                : isNewFlowUser 
                                                  ? t('studentDashboard.myApplications.paymentStatus.payPlacementFee') 
                                                  : t('studentDashboard.myApplications.paymentStatus.payScholarshipFee')}
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {(hasSelectedScholarship && !scholarshipFeePaid) && (
                                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                      <div className="flex items-start">
                                        <AlertCircle className="h-4 w-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-amber-800 leading-relaxed">
                                          {t('studentDashboard.myApplications.importantNotice.description')}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Action Section */}
                                {(applicationFeePaid && scholarshipFeePaid) && (
                                  <div className="border-t border-slate-200 pt-4">
                                    <button
                                      onClick={() => {
                                        localStorage.setItem('selected_application_id', application.id);
                                        navigate('/student/onboarding?step=my_applications');
                                      }}
                                      className="inline-flex items-center justify-center w-full px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 text-sm"
                                    >
                                      <GraduationCap className="h-4 w-4 mr-2" />
                                      {t('studentDashboard.myApplications.applicationDetails.viewDetails')}
                                    </button>
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
                  const otherList = applicationsToShow.filter((a: ApplicationWithScholarship) => a.status !== 'approved' && a.status !== 'enrolled');
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
                        {otherList.map((application: ApplicationWithScholarship) => {
                          const Icon = getStatusIcon(application.status);
                          const scholarship = application.scholarships;
                          if (!scholarship) return null;



                          return (
                            <div key={application.id} className="bg-white rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-2 border-slate-200 group w-full max-w-full">
                              <div className="p-4 sm:p-6">
                                {/* Compact Mobile Header */}
                                <div className="mb-4">
                                  {/* Line 1: Title + Status */}
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                                    <h3 className="font-bold text-slate-900 text-base sm:text-lg group-hover:text-blue-600 transition-colors leading-tight flex-1 min-w-0 pr-0 sm:pr-3">
                                      <span className="line-clamp-2">{scholarship.title}</span>
                                    </h3>
                                    <span className={`inline-flex items-center px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold border ${getStatusColor(application.status)} flex-shrink-0 self-start sm:self-auto`}>
                                      <Icon className="h-3 w-3 mr-1 flex-shrink-0" />
                                      <span className="whitespace-nowrap">{getStatusLabel(application.status)}</span>
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

                                {/* Status Details REMOVED as per user request to maintain consistency and avoid missing translations */}



                                {/* Not selected reason for rejected applications */}
                                {application.status === 'rejected' && (application as any).notes && (
                                  <div className="mb-6 rounded-xl p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
                                    <div className="flex items-start">
                                      <XCircle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <strong className="block mb-1">{t('studentDashboard.myApplications.rejectedApplication.reason')}</strong>
                                        {(application as any).notes}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Documents Status - Individual Check List */}
                                {(() => {
                                  const docs = parseApplicationDocuments((application as any).documents);
                                  const reqUploads = requestUploadsByApp[application.id] || [];

                                  // Create a complete document list with status
                                  const allDocuments = [
                                    { type: 'passport', label: t('studentDashboard.myApplications.documents.passport') },
                                    { type: 'diploma', label: t('studentDashboard.myApplications.documents.highSchoolDiploma') },
                                    { type: 'funds_proof', label: t('studentDashboard.myApplications.documents.proofOfFunds') }
                                  ].map(docTemplate => {
                                    const docData = docs.find(d => d.type === docTemplate.type);
                                    return {
                                      ...docTemplate,
                                      status: docData?.status || 'pending',
                                      review_notes: docData?.review_notes,
                                      rejection_reason: docData?.rejection_reason,
                                      uploaded_at: docData?.uploaded_at
                                    };
                                  });

                                  if (docs.length === 0 && reqUploads.length === 0) return null;

                                  return (
                                    <div className="border-t border-slate-200 pt-6">
                                      <button
                                        onClick={() => toggleChecklist(application.id)}
                                        className="flex items-center justify-between cursor-pointer select-none mb-4 p-2 hover:bg-slate-50 rounded-lg transition-colors w-full text-left"
                                      >
                                        <h4 className="text-sm font-bold text-slate-900 flex items-center">
                                          <FileText className="h-4 w-4 mr-2 text-blue-600" />
                                          {t('studentDashboard.myApplications.documents.checklist')}
                                        </h4>
                                        <svg
                                          className={`w-4 h-4 text-slate-500 transition-transform ${openChecklists[application.id] ? 'rotate-180' : ''}`}
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                          aria-hidden="true"
                                        >
                                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                                        </svg>
                                      </button>

                                      <div
                                      className={`transition-all duration-300 ease-in-out ${openChecklists[application.id]
                                          ? 'max-h-[5000px] opacity-100'
                                          : 'max-h-0 opacity-0 overflow-hidden'
                                      }`}
                                   >
                                     <div className="space-y-3 pt-2">
                                       {/* Required Documents */}
                                       {allDocuments.map((doc) => {
                                         const status = (doc.status || '').toLowerCase();
                                         const isApproved = status === 'approved';
                                         const isRejected = status === 'changes_requested' || status === 'rejected';
                                         const isUnderReview = status === 'under_review';
                                         // const isPending = !isApproved && !isRejected && !isUnderReview;

                                            return (
                                              <div key={doc.type} className={`bg-white rounded-xl border-2 p-2 sm:p-4 hover:border-slate-300 transition-all duration-200 w-full max-w-full overflow-visible ${isRejected ? 'border-red-500' : 'border-slate-200'}`}>
                                                <div className="flex items-start justify-between min-w-0 w-full">
                                                  <div className="flex items-start flex-1 min-w-0 w-full">
                                                    {/* Check Icon */}
                                                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 mt-0.5 transition-all duration-200 ${isApproved
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
                                                    <div className="flex-1 min-w-0">
                                                      <div className="flex flex-col gap-1.5 mb-2">
                                                        <h5 className="font-semibold text-slate-900 text-sm w-full break-words">
                                                          <TruncatedText
                                                            text={doc.label}
                                                            maxLength={30}
                                                            className="font-semibold text-slate-900 text-sm"
                                                            showTooltip={true}
                                                            tooltipPosition="top"
                                                            breakWords={true}
                                                          />
                                                        </h5>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold border break-words inline-block max-w-full ${isApproved
                                                            ? 'bg-green-50 text-green-700 border-green-200'
                                                            : isRejected
                                                              ? 'bg-red-50 text-red-700 border-red-200'
                                                              : isUnderReview
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                : 'bg-slate-50 text-slate-600 border-slate-200'
                                                          }`}>
                                                          {isApproved ? t('studentDashboard.myApplications.documents.status.approved') : isRejected ? t('studentDashboard.myApplications.documents.status.changesNeeded') : isUnderReview ? t('studentDashboard.myApplications.documents.status.underReview') : t('studentDashboard.myApplications.documents.status.pending')}
                                                        </span>
                                                        {doc?.uploaded_at && (
                                                          <span className="text-[10px] text-slate-500 font-medium">
                                                            Enviado em: {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
                                                          </span>
                                                        )}
                                                      </div>

                                                      {/* Review Notes / Rejection Reason */}
                                                      {isRejected && (doc.rejection_reason || doc.review_notes) && (
                                                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg w-full max-w-full overflow-hidden">
                                                          <div className="text-xs text-red-700">
                                                            <strong className="block mb-1">{t('studentDashboard.myApplications.documents.review')}</strong>
                                                            <TruncatedText
                                                              text={doc.rejection_reason || doc.review_notes || ''}
                                                              maxLength={150}
                                                              className="text-xs text-red-700 leading-relaxed"
                                                              showTooltip={true}
                                                              tooltipPosition="top"
                                                              breakWords={true}
                                                            />
                                                          </div>
                                                        </div>
                                                      )}

                                                      {/* Upload Action for Rejected Docs */}
                                                      {isRejected && application.status !== 'rejected' && (
                                                        <div className="mt-3 space-y-2">
                                                          <div className="flex flex-col gap-2">
                                                            <label className="cursor-pointer bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-2 border-blue-200 hover:from-blue-100 hover:to-blue-200 px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex-1 text-center text-xs hover:shadow-md">
                                                              <span className="block break-words">
                                                                <TruncatedText
                                                                  text={`${t('studentDashboard.myApplications.documents.sendNew')} ${doc.label}`}
                                                                  maxLength={50}
                                                                  className="text-xs font-semibold"
                                                                  showTooltip={true}
                                                                  tooltipPosition="top"
                                                                  breakWords={true}
                                                                />
                                                              </span>
                                                              <input
                                                                type="file"
                                                                className="sr-only"
                                                                accept="application/pdf,image/*"
                                                                onChange={(e) => handleSelectDocFile(application.id, doc.type, e.target.files ? e.target.files[0] : null)}
                                                              />
                                                            </label>
                                                            <button
                                                              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:from-blue-700 hover:to-blue-800 text-xs break-words"
                                                              disabled={!selectedFiles[docKey(application.id, doc.type)] || uploading[docKey(application.id, doc.type)]}
                                                              onClick={() => handleUploadDoc(application.id, doc.type)}
                                                            >
                                                              {uploading[docKey(application.id, doc.type)] ? (
                                                                <div className="flex items-center justify-center">
                                                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                                                  <span className="whitespace-nowrap">{t('studentDashboard.myApplications.paymentStatus.uploading')}</span>
                                                                </div>
                                                              ) : (
                                                                <span className="whitespace-nowrap">{t('studentDashboard.myApplications.paymentStatus.uploadDocument')}</span>
                                                              )}
                                                            </button>
                                                          </div>
                                                          {selectedFiles[docKey(application.id, doc.type)] && (
                                                            <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 break-words">
                                                              <span className="font-medium">{t('studentDashboard.myApplications.paymentStatus.selected')}: </span>
                                                              <TruncatedText
                                                                text={selectedFiles[docKey(application.id, doc.type)]?.name || ''}
                                                                maxLength={50}
                                                                className="text-xs text-slate-600 inline"
                                                                showTooltip={true}
                                                                tooltipPosition="top"
                                                                breakWords={true}
                                                                isFilename={true}
                                                                documentType={doc.type}
                                                              />
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

                                       {/* University Additional Requests */}
                                       {reqUploads.length > 0 && (
                                         <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border-2 border-slate-200 p-4">
                                           <h5 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                                             <Building className="h-4 w-4 mr-2 text-blue-600" />
                                             {t('studentDashboard.myApplications.documents.universityAdditionalRequests')}
                                           </h5>
                                           <div className="space-y-2">
                                             {reqUploads.map((req, idx) => {
                                               const status = (req.status || '').toLowerCase();
                                               const isApproved = status === 'approved';
                                               const isRejected = status === 'rejected';
                                               // const isUnderReview = status === 'under_review';
                                               
                                               return (
                                                 <div key={idx} className="bg-white rounded-lg border border-slate-200 p-3">
                                                    <div className="flex flex-col gap-1.5">
                                                      <div className="flex items-center">
                                                       <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-2 ${
                                                         isApproved 
                                                           ? 'bg-green-100 border-green-400' 
                                                           : isRejected 
                                                             ? 'bg-red-100 border-red-400'
                                                             : 'bg-amber-100 border-amber-400'
                                                       }`}>
                                                         {isApproved ? (
                                                           <CheckCircle className="h-3 w-3 text-green-600" />
                                                         ) : isRejected ? (
                                                           <XCircle className="h-3 w-3 text-red-600" />
                                                         ) : (
                                                           <Clock className="h-3 w-3 text-amber-600" />
                                                         )}
                                                       </div>
                                                       <span className="font-medium text-slate-900 text-xs">
                                                         <TruncatedText
                                                           text={req.title}
                                                           maxLength={35}
                                                           className="font-medium text-slate-900 text-xs"
                                                           showTooltip={true}
                                                           tooltipPosition="top"
                                                         />
                                                       </span>
                                                     </div>
                                                     <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                       isApproved 
                                                         ? 'bg-green-100 text-green-700' 
                                                         : isRejected 
                                                           ? 'bg-red-100 text-red-700'
                                                           : 'bg-amber-100 text-amber-700'
                                                     }`}>
                                                       {isApproved ? t('studentDashboard.myApplications.documents.status.approved') : isRejected ? t('studentDashboard.myApplications.documents.status.changesNeeded') : t('studentDashboard.myApplications.documents.status.underReview')}
                                                     </span>
                                                   </div>
                                                   {isRejected && (req.rejection_reason || req.review_notes) && (
                                                     <div className="mt-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                                                       <strong className="block mb-1">{t('studentDashboard.myApplications.documents.review')}</strong>
                                                       <TruncatedText
                                                         text={req.rejection_reason || req.review_notes || ''}
                                                         maxLength={120}
                                                         className="text-xs text-red-700 leading-relaxed"
                                                         showTooltip={true}
                                                         tooltipPosition="top"
                                                       />
                                                     </div>
                                                   )}
                                                 </div>
                                               );
                                             })}
                                           </div>
                                         </div>
                                       )}
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
      
      </div>
    </div>
    </>
  );
};

export default MyApplications;