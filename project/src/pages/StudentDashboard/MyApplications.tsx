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
  Download,
  Eye,
  Inbox
} from 'lucide-react';
import { ScholarshipCardFull } from '../StudentOnboarding/components/ScholarshipCardFull';
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
  const { t } = useTranslation(['dashboard', 'common', 'registration']);
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
  const { data: realPaidAmounts = {} } = useStudentPaidAmountsQuery(user?.id, ['application', 'scholarship', 'placement', 'ds160_package', 'i539_cos_package']);
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

  // Convert query error to string for compatibility
  const error = queryError ? 'Erro ao buscar aplicações.' : null;

  // const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // const [payingId] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  // Document Requests uploads grouped by applicationId
  const [requestUploadsByApp, setRequestUploadsByApp] = useState<Record<string, { title: string; status: string; review_notes?: string; rejection_reason?: string; is_admin_upload?: boolean }[]>>({});
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

        // Buscar requests individuais da aplicação e globais (por universidade ou gerais)
        const { data: reqs } = await supabase
          .from('document_requests')
          .select('id,title,scholarship_application_id,university_id,is_global,applicable_scholarship_levels,applicable_student_types,status,hidden_for_students')
          .or(`scholarship_application_id.in.(${appIds.join(',')}),and(is_global.eq.true,university_id.in.(${uniIds.join(',')})),and(is_global.eq.true,university_id.is.null)`);

        const requestIds = (reqs || []).map(r => r.id);

        if (requestIds.length) {
          const { data: uploads } = await supabase
            .from('document_request_uploads')
            .select('document_request_id,status,review_notes,rejection_reason,uploaded_at,uploaded_by,is_admin_upload')
            .in('document_request_id', requestIds)
            .eq('uploaded_by', user.id);

          // Mapear requestId -> {title, appIds[]}
          const studentType = userProfile?.student_process_type;
          const reqMeta: Record<string, { title: string; appIds: string[] }> = {};
          (reqs || []).forEach((r: any) => {
            if (r.scholarship_application_id) {
              reqMeta[r.id] = { title: r.title, appIds: [r.scholarship_application_id] };
            } else if (r.is_global) {
              // Skip closed global requests
              if ((r.status || '').toLowerCase() === 'closed') return;
              // Skip requests hidden for this student
              if (r.hidden_for_students?.includes(user.id)) return;
              // Filter by student type
              if (r.applicable_student_types?.length > 0
                && !r.applicable_student_types.includes(studentType)
                && !r.applicable_student_types.includes('all')) return;

              let candidateApps = r.university_id
                ? apps.filter((a: any) => a.scholarships?.university_id === r.university_id)
                : apps;

              // Filter by scholarship level per app
              const levels: string[] | undefined = r.applicable_scholarship_levels;
              if (levels && levels.length > 0) {
                candidateApps = candidateApps.filter((a: any) => {
                  const appLevel = a.scholarships?.level;
                  if (!appLevel) return true;
                  return levels.includes(appLevel);
                });
              }

              const targetAppIds = candidateApps.map((a: any) => a.id);
              if (targetAppIds.length > 0) {
                reqMeta[r.id] = { title: r.title, appIds: targetAppIds };
              }
            }
          });

          const grouped: Record<string, { title: string; status: string; review_notes?: string; rejection_reason?: string; is_admin_upload?: boolean }[]> = {};
          (uploads || []).forEach((u: any) => {
            const meta = reqMeta[u.document_request_id];
            if (!meta) return;
            meta.appIds.forEach(appId => {
              if (!grouped[appId]) grouped[appId] = [];
              grouped[appId].push({
                title: meta.title,
                status: (u.status || '').toLowerCase(),
                review_notes: u.review_notes || undefined,
                rejection_reason: u.rejection_reason || undefined,
                is_admin_upload: u.is_admin_upload              });
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

  const packageD160PaidGlobal = !!(userProfile as any)?.has_paid_ds160_package || !!realPaidAmounts.ds160_package;
  const packageI539PaidGlobal = !!(userProfile as any)?.has_paid_i539_cos_package || !!realPaidAmounts.i539_cos_package;
  const hasPaidPackageGlobal = packageD160PaidGlobal || packageI539PaidGlobal;

  // Quando o aluno pagar a taxa de uma bolsa aprovada, escolhemos ela como principal e escondemos as demais
  // Garantimos que apenas aplicações APROVADAS ou MATRICULADAS sejam escolhidas como "principais" para esconder as outras
  const chosenPaidApp = applications.find(
    (a: ApplicationWithScholarship) => 
      (a.status === 'approved' || a.status === 'enrolled') && (
        !!(a as any).is_application_fee_paid || 
        !!(a as any).is_scholarship_fee_paid || 
        !!(a as any).acceptance_letter_url ||
        (isNewFlowUser && (!!(userProfile as any)?.is_placement_fee_paid || !!realPaidAmounts.placement)) ||
        hasPaidPackageGlobal
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
        // Preservar versão anterior no histórico antes de sobrescrever
        newDocs = (currentDocs as any[]).map((d: any) => {
          if (d.type !== type) return d;
          const { history: prevHistory = [], ...oldDoc } = d;
          const historyEntry = { ...oldDoc, saved_at: new Date().toISOString() };
          return { ...newDoc, history: [...prevHistory, historyEntry] };
        });
      } else {
        const base = Array.isArray(currentDocs) ? [...currentDocs] : [];
        newDocs = [...base, { ...newDoc, history: [] }];
      }
      await supabase.from('scholarship_applications').update({ documents: newDocs }).eq('id', applicationId);

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
              {(() => {
                const savedStep = (userProfile as any)?.onboarding_current_step;
                const hasStarted = !!(
                  userProfile?.has_paid_selection_process_fee ||
                  (savedStep && savedStep !== 'selection_fee')
                );
                const onboardingUrl = (hasStarted && savedStep && savedStep !== 'my_applications' && savedStep !== 'completed')
                  ? `/student/onboarding?step=${savedStep}`
                  : '/student/onboarding';
                return (
                  <Link
                    to={onboardingUrl}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105 inline-flex items-center text-sm sm:text-base"
                  >
                    {hasStarted ? 'Continuar Processo' : 'Começar Processo'}
                    <ArrowRight className="ml-2 h-5 w-5 sm:h-6 sm:w-6" />
                  </Link>
                );
              })()}
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {approvedList.map((application: ApplicationWithScholarship) => {
                          const Icon = getStatusIcon(application.status);
                          const scholarship = application.scholarships;
                          
                          const packageD160Paid = !!(userProfile as any)?.has_paid_ds160_package || !!realPaidAmounts.ds160_package;
                          const packageI539Paid = !!(userProfile as any)?.has_paid_i539_cos_package || !!realPaidAmounts.i539_cos_package;
                          const hasPaidPackage = packageD160Paid || packageI539Paid;
                          
                          const applicationFeePaid = !!application.is_application_fee_paid || hasPaidPackage;
                          const scholarshipFeePaid = !!application.is_scholarship_fee_paid || 
                                                     !!application.acceptance_letter_url ||
                                                     (isNewFlowUser && (!!(userProfile as any)?.is_placement_fee_paid || !!realPaidAmounts.placement)) ||
                                                     hasPaidPackage;
                          if (!scholarship) return null;



                          return (
                            <ScholarshipCardFull
                              key={application.id}
                              scholarship={scholarship}
                              isSelected={scholarshipFeePaid}
                              onToggle={() => {
                                localStorage.setItem('selected_application_id', application.id);
                                const savedStep = (userProfile as any)?.onboarding_current_step;
                                const step = (savedStep && savedStep !== 'my_applications' && savedStep !== 'completed')
                                  ? savedStep
                                  : null;
                                navigate(step ? `/student/onboarding?step=${step}` : '/student/onboarding');
                              }}
                              userProfile={userProfile}
                              isLocked={false}
                              actionLabel={application.status === 'enrolled' ? 'Aplicação Finalizada' : 'Continuar Aplicação'}
                            />
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {otherList.map((application: ApplicationWithScholarship) => {
                          const scholarship = application.scholarships;
                          if (!scholarship) return null;


                          return (
                            <div
                              key={application.id}
                              className={`group relative bg-white rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border-2 hover:-translate-y-0.5 transform-gpu ${
                                application.status === 'rejected' ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                              }`}
                            >
                              {/* Desktop status badge — absolute */}
                              <div className="hidden sm:flex items-center absolute top-4 right-4 z-20">
                                <div className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm border ${
                                  application.status === 'rejected' ? 'bg-red-500/90 text-white border-red-400' : 'bg-amber-500/90 text-white border-amber-400'
                                }`}>
                                  {getStatusLabel(application.status)}
                                </div>
                              </div>

                              <div className="p-4 sm:p-5 flex flex-col">
                                {/* Mobile: logo + status row */}
                                <div className="sm:hidden flex items-center justify-between mb-4">
                                  <div className="flex-shrink-0">
                                    {scholarship?.universities?.logo_url || (scholarship as any)?.image_url ? (
                                      <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm">
                                        <img src={scholarship?.universities?.logo_url || (scholarship as any)?.image_url} alt="" className="w-full h-full object-contain p-1.5" onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
                                      </div>
                                    ) : (
                                      <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                                        <Building className="w-6 h-6 text-slate-300" />
                                      </div>
                                    )}
                                  </div>
                                  <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                                    application.status === 'rejected' ? 'bg-red-500 text-white border-red-400' : 'bg-amber-500 text-white border-amber-400'
                                  }`}>
                                    {getStatusLabel(application.status)}
                                  </div>
                                </div>

                                {/* Mobile: title + university */}
                                <div className="sm:hidden mb-4">
                                  <h4 className="text-lg font-bold text-slate-900 mb-0.5 leading-tight">{scholarship?.title}</h4>
                                  <p className="text-sm font-medium text-slate-500">{scholarship?.universities?.name}</p>
                                </div>

                                {/* Desktop: logo + title */}
                                <div className="hidden sm:flex gap-4 items-center mb-4">
                                  <div className="flex-shrink-0">
                                    {scholarship?.universities?.logo_url || (scholarship as any)?.image_url ? (
                                      <div className="w-28 h-28 bg-white rounded-[2rem] flex items-center justify-center overflow-hidden border border-gray-100/50 shadow-sm">
                                        <img src={scholarship?.universities?.logo_url || (scholarship as any)?.image_url} alt="" className="w-full h-full object-contain p-2" onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
                                      </div>
                                    ) : (
                                      <div className="w-28 h-28 bg-slate-50 rounded-[2rem] flex items-center justify-center border border-gray-100/50">
                                        <Building className="w-16 h-16 text-slate-300" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-lg font-bold text-slate-900 mb-0.5 leading-tight pr-20">{scholarship?.title}</h4>
                                    <p className="text-sm font-medium text-slate-500 truncate">{scholarship?.universities?.name}</p>
                                  </div>
                                </div>

                                {/* Field of study */}
                                {(scholarship as any)?.field_of_study && (
                                  <div className="flex items-center mb-3">
                                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200">
                                      {(scholarship as any).field_of_study}
                                    </span>
                                  </div>
                                )}

                                {/* Financial info */}
                                <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                  {(scholarship as any)?.original_annual_value && (
                                    <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-slate-200">
                                      <span className="text-xs text-slate-500 font-medium">Valor original</span>
                                      <span className="text-xs font-semibold text-slate-500 line-through">
                                        ${Number((scholarship as any).original_annual_value).toLocaleString('en-US')}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500 font-medium">Com Bolsa</span>
                                    <div className="flex items-center">
                                      <span className="font-bold text-green-700 text-base sm:text-lg">
                                        ${scholarship?.annual_value_with_scholarship ? Number(scholarship.annual_value_with_scholarship).toLocaleString('en-US') : 'N/A'}
                                      </span>
                                      <span className="text-[10px] text-green-600 font-semibold ml-1">/ ano</span>
                                    </div>
                                  </div>
                                  {(scholarship as any)?.application_fee_amount && (
                                    <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-slate-200">
                                      <span className="text-xs text-slate-500 font-medium">Taxa de Matrícula</span>
                                      <span className="text-blue-600 font-bold text-sm">{formatAmount(Number((scholarship as any).application_fee_amount))}</span>
                                    </div>
                                  )}
                                  {(userProfile as any)?.placement_fee_flow && (() => {
                                    const annualValue = Number(scholarship?.annual_value_with_scholarship || 0);
                                    const pfa = (scholarship as any)?.placement_fee_amount ? Number((scholarship as any).placement_fee_amount) : null;
                                    const pf = getPlacementFee(annualValue, pfa);
                                    return (
                                      <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-slate-200">
                                        <span className="text-xs text-slate-500 font-medium">Placement Fee</span>
                                        <span className="text-blue-600 font-bold text-sm">{formatAmount(pf)}</span>
                                      </div>
                                    );
                                  })()}
                                  {(() => {
                                    const pType = userProfile?.student_process_type;
                                    if (!pType) return null;
                                    const fees: { name: string; amount: number }[] = [];
                                    if (pType === 'initial') fees.push({ name: 'Control Fee', amount: 1800 });
                                    else if (pType === 'change_of_status') fees.push({ name: 'Control Fee', amount: 1800 });
                                    else if (pType === 'transfer' && userProfile?.visa_transfer_active === false) {
                                      fees.push({ name: 'Control Fee', amount: 500 });
                                      fees.push({ name: 'Control Fee', amount: 1800 });
                                    }
                                    if (fees.length === 0) return null;
                                    return fees.map((f, idx) => (
                                      <div key={idx} className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-slate-200">
                                        <span className="text-xs text-slate-500 font-medium">{f.name}</span>
                                        <span className="text-blue-600 font-bold text-sm">{formatAmount(f.amount)}</span>
                                      </div>
                                    ));
                                  })()}
                                </div>

                                {/* Rejection notes */}
                                {application.status === 'rejected' && (application as any).notes && (
                                  <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                                    <p className="text-xs text-red-600 font-bold uppercase tracking-tight leading-relaxed">
                                      <span className="text-red-400 block mb-0.5">{t('studentDashboard.myApplications.rejectedApplication.reason')}</span>
                                      {(application as any).notes}
                                    </p>
                                  </div>
                                )}

                                {/* Continue to onboarding */}
                                {application.status !== 'rejected' && (
                                  <div className="mb-1">
                                    <button
                                      onClick={() => {
                                        localStorage.setItem('selected_application_id', application.id);
                                        const savedStep = (userProfile as any)?.onboarding_current_step;
                                        const step = (savedStep && savedStep !== 'my_applications' && savedStep !== 'completed') ? savedStep : null;
                                        navigate(step ? `/student/onboarding?step=${step}` : '/student/onboarding');
                                      }}
                                      className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[#05294E] hover:bg-[#041f3a] text-white font-bold text-sm transition-all"
                                    >
                                      Continuar Processo
                                      <ArrowRight className="w-4 h-4" />
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
          </div>
        </>
      )}
      
      </div>
    </div>
    </>
  );
};

export default MyApplications;