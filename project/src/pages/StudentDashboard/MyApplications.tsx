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
  Inbox,
  Star
} from 'lucide-react';
import { getDeliveryModeLabel } from '../../utils/scholarshipHelpers';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Application, Scholarship } from '../../types';
import { useCartStore } from '../../stores/applicationStore';
import { useStudentApplicationsQuery, useStudentPaidAmountsQuery, usePromotionalCouponQuery } from '../../hooks/useStudentDashboardQueries';
import { invalidateStudentDashboardApplications, invalidateStudentDashboardFees, invalidateStudentDashboardCoupons } from '../../lib/queryKeys';
import { useQueryClient } from '@tanstack/react-query';

// import StudentDashboardLayout from "./StudentDashboardLayout";
// import CustomLoading from '../../components/CustomLoading';

// Combine os tipos para incluir os detalhes da bolsa na aplicação
type ApplicationWithScholarship = Application & {
  scholarships: Scholarship | null;
};

// Labels amigáveis para os documentos principais - será definido dentro do componente

const MyApplications: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common', 'registration', 'scholarships']);
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isNewFlowUser = !!(userProfile as any)?.placement_fee_flow;

  // React Query hooks for cached data
  // isPending = sem dados no cache ainda (primeira carga)
  // isFetching = buscando em background (pode ter dados em cache)
  const { data: applications = [], isPending, error: queryError } = useStudentApplicationsQuery(userProfile?.id);
  const { data: realPaidAmounts = {} } = useStudentPaidAmountsQuery(user?.id, ['application', 'scholarship', 'placement', 'ds160_package', 'i539_cos_package']);
  usePromotionalCouponQuery(user?.id, 'scholarship_fee');
  usePromotionalCouponQuery(user?.id, 'application_fee');
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



  const formatAmountShort = (v: number) => v?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || '0';

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


  const renderApplicationCard = (application: ApplicationWithScholarship) => {
    const scholarship = application.scholarships;
    if (!scholarship) return null;

    const annualSavings = (Number((scholarship as any).original_annual_value) || 0) - (Number(scholarship.annual_value_with_scholarship) || 0);
    const cardImage = (scholarship as any).image_url || (scholarship as any).universities?.image_url;
    const StatusIcon = getStatusIcon(application.status);

    const handleCardClick = () => {
      if (application.status === 'rejected') return;
      localStorage.setItem('selected_application_id', application.id);
      const savedStep = (userProfile as any)?.onboarding_current_step;
      const step = (savedStep && savedStep !== 'my_applications' && savedStep !== 'completed') ? savedStep : null;
      navigate(step ? `/student/onboarding?step=${step}` : '/student/onboarding');
    };

    return (
      <div
        key={application.id}
        onClick={handleCardClick}
        className={`group bg-white rounded-[2rem] border shadow-[0_12px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_24px_50px_rgba(5,41,78,0.12)] hover:-translate-y-1.5 transition-all duration-500 overflow-hidden flex flex-col h-full ${
          application.status === 'rejected'
            ? 'border-red-200 cursor-default'
            : 'border-slate-200 hover:border-blue-200 cursor-pointer'
        }`}
      >
        {/* Card Header (Cover Image) */}
        <div className="relative h-44 w-full bg-white z-10 overflow-hidden border-b border-slate-100 shrink-0 group">
          <div className="absolute inset-0 z-0">
            {cardImage ? (
              <img src={cardImage} alt={scholarship.title} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-slate-50">
                <Building className="h-12 w-12 text-[#05294E]/20" />
              </div>
            )}
          </div>

          {/* Text Overlay (Left side) */}
          <div className="absolute inset-y-0 left-0 w-[65%] sm:w-[70%] z-10 bg-gradient-to-r from-white via-white/95 to-transparent flex flex-col justify-center pl-4 pr-8">
            <div className="absolute top-4 left-4">
              <img src="/logo.png" alt="Matricula USA" className="h-5 w-auto object-contain mb-1.5 drop-shadow-sm" />
            </div>
            <p className="w-[95%] text-sm font-black font-['Montserrat',sans-serif] text-slate-900 line-clamp-3 pt-0.5 mt-8" style={{ lineHeight: 0.95 }}>
              {(scholarship as any).field_of_study || t('scholarships:scholarshipsPage.filters.anyField', 'Qualquer Área')}
            </p>
          </div>

          {/* Top Right: Status + Exclusive badges (hide status for rejected — shown at bottom) */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
            {application.status !== 'rejected' && (
              <div className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1 ${
                application.status === 'approved' || application.status === 'enrolled'
                  ? 'bg-green-500 text-white'
                  : 'bg-amber-500 text-white'
              }`}>
                <StatusIcon className="h-3 w-3" />
                {getStatusLabel(application.status)}
              </div>
            )}
            {(scholarship as any).is_exclusive && (
              <div className="bg-amber-500 text-white px-2.5 py-1.5 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1">
                <Star className="h-3 w-3 fill-white" />
                {t('common:exclusive', 'Exclusiva')}
              </div>
            )}
          </div>

          {/* Bottom Right: Level + Scholarship % */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-20">
            <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-800 shadow-sm border border-white/20">
              {getLevelLabel((scholarship as any).level || '')}
            </span>
            {(scholarship as any).scholarship_percentage && (
              <span className="px-2.5 py-1 bg-green-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm">
                {(scholarship as any).scholarship_percentage}%
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 flex-1 flex flex-col justify-between">
          <div>
            {/* University */}
            <div className="flex items-center gap-2 mb-3">
              <div className="relative w-7 h-7 rounded-md border border-slate-100 bg-white p-0.5 flex items-center justify-center overflow-hidden flex-shrink-0">
                {scholarship.universities?.logo_url ? (
                  <img src={scholarship.universities.logo_url} alt={scholarship.universities.name || ''} className="w-full h-full object-contain" />
                ) : (
                  <Building className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[85%]">
                {scholarship.universities?.name || 'Universidade'}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-base font-black text-slate-900 line-clamp-2 leading-snug mb-2">
              {scholarship.title}
            </h3>

            {/* Field of Study */}
            {(scholarship as any).field_of_study && (
              <div className="mb-2">
                <span className="inline-flex items-center text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-1 max-w-full">
                  <span className="truncate">{(scholarship as any).field_of_study}</span>
                </span>
              </div>
            )}

            {/* Specs: Delivery Mode + Work Permissions */}
            {((scholarship as any).delivery_mode || ((scholarship as any).work_permissions && (scholarship as any).work_permissions.length > 0)) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {(scholarship as any).delivery_mode && (
                  <span className="inline-flex items-center text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-1 max-w-full">
                    <span className="truncate">{getDeliveryModeLabel((scholarship as any).delivery_mode, t)}</span>
                  </span>
                )}
                {(scholarship as any).work_permissions && (scholarship as any).work_permissions.map((perm: string, i: number) => (
                  <span key={i} className="inline-flex items-center text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-1 max-w-full">
                    <span className="truncate">{perm}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Financial Section */}
          <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-4 sm:p-5 mt-2 flex items-center justify-between gap-4">
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                {t('scholarships:scholarshipsPage.detail.annualCost', 'Investimento Anual')}
              </span>
              <span className="text-sm font-bold text-slate-400 line-through leading-tight">
                ${formatAmountShort(Number((scholarship as any).original_annual_value))}
              </span>
              {annualSavings > 0 && (
                <span className="inline-flex items-center w-fit text-[10px] font-black text-green-700 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-xl mt-2 uppercase tracking-wider">
                  -{t('scholarships:scholarshipsPage.detail.annualSavings', 'Economia Anual').split(' ')[0]} ${formatAmountShort(annualSavings)}
                </span>
              )}
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">
                {t('scholarships:scholarshipsPage.detail.withScholarship', 'Com Bolsa')}
              </span>
              <div className="flex items-baseline justify-end">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                  ${formatAmountShort(Number(scholarship.annual_value_with_scholarship))}
                </span>
                <span className="text-xs font-bold text-slate-500 ml-0.5">
                  {t('scholarships:scholarshipsPage.detail.perYear', '/ano')}
                </span>
              </div>
            </div>
          </div>

          {/* Rejected: status + reason (after financial section, same card style) */}
          {application.status === 'rejected' && (
            <div className="bg-red-50/80 border border-red-100 rounded-[1.5rem] p-4 sm:p-5 mt-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <XCircle className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-[11px] font-extrabold text-red-500 uppercase tracking-wider">
                  {getStatusLabel(application.status)}
                </span>
              </div>
              {(application as any).notes && (
                <p className="text-xs text-red-600/80 font-medium leading-relaxed pl-8">
                  {(application as any).notes}
                </p>
              )}
            </div>
          )}

          {/* Action Button */}
          {application.status !== 'rejected' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
              className={`mt-4 w-full py-3 px-4 rounded-2xl font-bold text-sm uppercase tracking-wide flex items-center justify-center transition-all duration-300 active:scale-95 ${
                application.status === 'enrolled'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gradient-to-r from-[#05294E] to-slate-700 text-white shadow-lg hover:shadow-2xl hover:scale-[1.02]'
              }`}
            >
              <span className="truncate">
                {application.status === 'enrolled'
                  ? t('studentDashboard.myApplications.applicationCompleted', 'Aplicação Finalizada')
                  : t('studentDashboard.myApplications.continueApplication', 'Continuar Aplicação')}
              </span>
              {application.status === 'enrolled'
                ? <CheckCircle className="ml-2 h-4 w-4 flex-shrink-0" />
                : <ArrowRight className="ml-2 h-4 w-4 flex-shrink-0" />
              }
            </button>
          )}
        </div>
      </div>
    );
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

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {approvedList.map((application: ApplicationWithScholarship) => renderApplicationCard(application))}
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {otherList.map((application: ApplicationWithScholarship) => renderApplicationCard(application))}
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