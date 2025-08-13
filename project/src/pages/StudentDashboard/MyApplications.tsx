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
  Search,
  Award,
  ArrowRight
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Application, Scholarship } from '../../types';
import { StripeCheckout } from '../../components/StripeCheckout';
// import StudentDashboardLayout from "./StudentDashboardLayout";
// import CustomLoading from '../../components/CustomLoading';

// Combine os tipos para incluir os detalhes da bolsa na aplicação
type ApplicationWithScholarship = Application & {
  scholarships: Scholarship | null;
};

// Labels amigáveis para os documentos principais
const DOCUMENT_LABELS: Record<string, string> = {
  passport: 'Passport',
  diploma: 'High School Diploma',
  funds_proof: 'Proof of Funds',
};

const MyApplications: React.FC = () => {
  const { user, userProfile, refetchUserProfile } = useAuth();
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationWithScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  // const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // const [payingId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  // Document Requests uploads grouped by applicationId
  const [requestUploadsByApp, setRequestUploadsByApp] = useState<Record<string, { title: string; status: string; review_notes?: string }[]>>({});
  // const [pendingUploads] = useState<Record<string, Record<string, File | null>>>({});
  // const [uploadingAppId, setUploadingAppId] = useState<string | null>(null);
  // const navigate = useNavigate();
  const location = useLocation();


  useEffect(() => {
    setUserProfileId(userProfile?.id || null);
    // Mantemos o polling ativo para refletir mudanças de pagamento/edge imediatamente
    setIsPolling(true);
  }, [userProfile?.id]);

  useEffect(() => {
    let isMounted = true;
    const fetchApplications = async (showLoading = false) => {
      if (showLoading && isFirstLoad) setLoading(true);
      try {
        if (!userProfileId) {
          if (isMounted) setApplications([]);
          if (showLoading && isFirstLoad) setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from('scholarship_applications')
          .select(`*, scholarships(*, universities!inner(id, name, logo_url, location, is_approved))`)
          .eq('student_id', userProfileId)
          .order('created_at', { ascending: false });
        if (error) {
          if (isMounted) setError('Erro ao buscar aplicações.');
        } else {
          if (isMounted) setApplications(data || []);
          // Buscar uploads de Document Requests do aluno e agrupar por aplicação
          if (data && data.length && user?.id) {
            try {
              const apps = (data as any[]);
              const appIds = apps.map(a => a.id);
              const uniIds = apps.map(a => (a as any).scholarships?.university_id).filter(Boolean);
              // Buscar requests individuais da aplicação e globais por universidade
              const { data: reqs } = await supabase
                .from('document_requests')
                .select('id,title,scholarship_application_id,university_id,is_global')
                .or(`scholarship_application_id.in.(${appIds.join(',')}),and(is_global.eq.true,university_id.in.(${uniIds.join(',')}))`);
              const requestIds = (reqs || []).map(r => r.id);
              if (requestIds.length) {
                const { data: uploads } = await supabase
                  .from('document_request_uploads')
                  .select('document_request_id,status,review_notes,uploaded_at,uploaded_by')
                  .in('document_request_id', requestIds)
                  .eq('uploaded_by', user.id);
                // Mapear requestId -> {title, appIds[]}
                const reqMeta: Record<string, { title: string; appIds: string[] }> = {};
                (reqs || []).forEach((r: any) => {
                  if (r.scholarship_application_id) {
                    reqMeta[r.id] = { title: r.title, appIds: [r.scholarship_application_id] };
                  } else if (r.is_global && r.university_id) {
                    const targetApps = apps.filter(a => (a as any).scholarships?.university_id === r.university_id).map(a => a.id);
                    reqMeta[r.id] = { title: r.title, appIds: targetApps };
                  }
                });
                const grouped: Record<string, { title: string; status: string; review_notes?: string }[]> = {};
                (uploads || []).forEach((u: any) => {
                  const meta = reqMeta[u.document_request_id];
                  if (!meta) return;
                  meta.appIds.forEach(appId => {
                    if (!grouped[appId]) grouped[appId] = [];
                    grouped[appId].push({ title: meta.title, status: (u.status || '').toLowerCase(), review_notes: u.review_notes || undefined });
                  });
                });
                if (isMounted) setRequestUploadsByApp(grouped);
              } else {
                if (isMounted) setRequestUploadsByApp({});
              }
            } catch {}
          }
        }
      } catch (err) {
        if (isMounted) setError('Erro inesperado ao buscar aplicações.');
      }
      if (showLoading && isFirstLoad) setLoading(false);
      if (isFirstLoad) setIsFirstLoad(false);
    };
    if (userProfileId) fetchApplications(true);

    // Polling eficiente: só roda enquanto isPolling for true
    let interval: NodeJS.Timeout | null = null;
    if (isPolling) {
      interval = setInterval(async () => {
        if (userProfileId) {
          await refetchUserProfile();
          fetchApplications(false);
        }
      }, 1000);
    }
    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [userProfileId, refetchUserProfile, isPolling]);

  // Nenhum fallback de cart: a página lista exclusivamente o que está em scholarship_applications

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('from') === 'payment-success') {
      // Força o refetch dos dados
      setLoading(true);
      setError(null);
      const fetchApplications = async () => {
        try {
          if (!userProfile?.id) {
            setApplications([]);
            setLoading(false);
            return;
          }
          const { data, error } = await supabase
            .from('scholarship_applications')
            .select(`*, scholarships(*, universities!inner(id, name, logo_url, location, is_approved))`)
            .eq('student_id', userProfile.id)
            .order('created_at', { ascending: false });
          if (error) {
            setError('Erro ao buscar aplicações.');
          } else {
            setApplications(data || []);
          }
        } catch (err) {
          setError('Erro inesperado ao buscar aplicações.');
        }
        setLoading(false);
      };
      fetchApplications();
      // Remove o parâmetro da URL para evitar loops
      params.delete('from');
      window.history.replaceState({}, '', `${location.pathname}${params.toString() ? '?' + params.toString() : ''}`);
    }
  }, [location.search, userProfile]);

  // Quando o aluno pagar a taxa de uma bolsa aprovada, escondemos as demais aprovadas não pagas
  const chosenPaidApp = applications.find(
    (a) => !!(a as any).is_application_fee_paid || !!(a as any).is_scholarship_fee_paid
  );
  const applicationsToShow = chosenPaidApp
    ? applications.filter((a) => a.id === chosenPaidApp.id)
    : applications;

  const filteredApplications = applicationsToShow.filter(application => {
    const scholarshipTitle = application.scholarships?.title || '';
    const universityName = application.scholarships?.universities?.name || '';
    
    const matchesSearch = scholarshipTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         universityName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || application.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // const sanitizeFileName = (fileName: string): string => fileName;

  // const onSelectFile = (appId: string, type: string, file: File | null) => {
  //   setPendingUploads(prev => ({ ...prev, [appId]: { ...(prev[appId] || {}), [type]: file } }));
  // };

  // const submitUpdatedDocs = async (application: any) => { };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'under_review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending_scholarship_fee': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircle;
      case 'rejected': return XCircle;
      case 'under_review': return AlertCircle;
      case 'pending_scholarship_fee': return DollarSign;
      default: return Clock;
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'approved') return 'APPROVED BY THE UNIVERSITY';
    if (status === 'rejected') return 'NOT SELECTED FOR THE SCHOLARSHIP';
    return status.replace('_', ' ').toUpperCase();
  };

  // Estilo para status dos documentos (nível do documento, não da aplicação)
  const getDocBadgeClasses = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'bg-green-100 text-green-700 border border-green-200';
    if (s === 'changes_requested') return 'bg-red-100 text-red-700 border border-red-200';
    if (s === 'under_review') return 'bg-amber-100 text-amber-700 border border-amber-200';
    return 'bg-slate-100 text-slate-700 border border-slate-200';
  };

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
      // Atualiza estado local
      setApplications(prev => prev.map(a => a.id === applicationId ? ({ ...a, documents: newDocs } as any) : a));
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
  const parseApplicationDocuments = (documents: any): { type: string; status?: string; review_notes?: string }[] => {
    if (!Array.isArray(documents)) return [];
    if (documents.length === 0) return [];
    if (typeof documents[0] === 'string') {
      return (documents as string[]).map((t) => ({ type: t }));
    }
    return (documents as any[]).map((d) => ({ type: d.type, status: d.status, review_notes: d.review_notes }));
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
    pending: applicationsToShow.filter(app => app.status === 'pending').length,
    approved: applicationsToShow.filter(app => app.status === 'approved').length,
    rejected: applicationsToShow.filter(app => app.status === 'rejected').length,
    under_review: applicationsToShow.filter(app => app.status === 'under_review').length,
    pending_scholarship_fee: applicationsToShow.filter(app => app.status === 'pending_scholarship_fee').length,
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
  const ensureApplication = async (scholarshipId: string): Promise<{ applicationId: string } | undefined> => {
    if (!userProfileId) return undefined;
    const { data: existing, error: fetchError } = await supabase
      .from('scholarship_applications')
      .select('id')
      .eq('student_id', userProfileId)
      .eq('scholarship_id', scholarshipId)
      .maybeSingle();
    if (fetchError) return undefined;
    if (existing) return { applicationId: existing.id };
    const { data, error } = await supabase
      .from('scholarship_applications')
      .insert({
        student_id: userProfileId,
        scholarship_id: scholarshipId,
        status: 'pending',
        applied_at: new Date().toISOString(),
        student_process_type: localStorage.getItem('studentProcessType') || null,
      })
      .select('id')
      .single();
    if (error) return undefined;
    return { applicationId: data.id };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 font-medium">Carregando suas aplicações...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="pt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">My Applications</h2>
            <p className="mt-1 text-slate-600">Track the status of your scholarship applications and next steps</p>
          </div>
        </div>

        {/* Aviso removido conforme solicitação */}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[120px] flex items-center">
            <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Applications</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[120px] flex items-center">
            <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Approved</p>
              <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 border border-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[120px] flex items-center">
            <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Under Review</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.under_review}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-50 border border-yellow-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[120px] flex items-center">
            <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Pending</p>
              <p className="text-3xl font-bold text-gray-600">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
              <Clock className="h-6 w-6 text-gray-600" />
            </div>
            </div>
          </div>
        </div>

        {/* Guidance: explain fees and next steps */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-sm font-semibold text-slate-900 mb-1">Step 1 — Submit your documents</div>
              <div className="text-sm text-slate-600">Upload passport, high school diploma and proof of funds so the university can evaluate your application.</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-sm font-semibold text-slate-900 mb-1">Step 2 — University review</div>
              <div className="text-sm text-slate-600">Your application will show as Pending/Under Review until the university approves your candidacy.</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-sm font-semibold text-slate-900 mb-1">Step 3 — Payments</div>
              <div className="text-sm text-slate-600">After approval, pay the Application Fee. Once confirmed, pay the Scholarship Fee to secure your benefits.</div>
            </div>
          </div>
        </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <FileText className="h-12 w-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">No applications yet</h3>
          <p className="text-slate-500 mb-8 max-w-lg mx-auto">
            Start applying for scholarships to track your progress here. We'll help you find the best opportunities that match your profile.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
            <div className="p-6 bg-slate-50 rounded-2xl">
              <Award className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h4 className="font-bold text-slate-900 mb-2">Find Scholarships</h4>
              <p className="text-sm text-slate-600">Browse through hundreds of opportunities</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl">
              <FileText className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h4 className="font-bold text-slate-900 mb-2">Apply Easily</h4>
              <p className="text-sm text-slate-600">Simple application process with guidance</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl">
              <CheckCircle className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <h4 className="font-bold text-slate-900 mb-2">Track Progress</h4>
              <p className="text-sm text-slate-600">Monitor your applications in real-time</p>
            </div>
          </div>
          
          <Link
            to="/student/dashboard/scholarships"
            className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105 inline-flex items-center"
          >
            Find Scholarships
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search applications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  title="Filter applications by status"
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="pending_scholarship_fee">Pending Scholarship Fee</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center text-sm text-slate-600">
              <span className="font-medium">{filteredApplications.length}</span>
              <span className="ml-1">
                application{filteredApplications.length !== 1 ? 's' : ''} found
              </span>
            </div>
          </div>

          {/* Applications List - two sections */}
          <div className="space-y-10">
            {/* Approved */}
            {(() => {
              const approvedList = filteredApplications.filter(a => a.status === 'approved' || a.status === 'enrolled');
              if (approvedList.length === 0) return null;
              const selectedApp = approvedList.find(a => (a as any).is_scholarship_fee_paid);
              const hasSelectedScholarship = !!selectedApp;
              return (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Approved by the University</h3>
                    <span className="text-sm text-green-700 bg-green-100 border border-green-200 px-3 py-1 rounded-lg">{approvedList.length} approved</span>
                  </div>
                  <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
                    <span className="font-semibold">Important:</span> You can choose only one scholarship. After you pay the Application Fee for a scholarship, other options will be disabled.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {approvedList.map((application) => {
              const Icon = getStatusIcon(application.status);
              const scholarship = application.scholarships;
              const applicationFeePaid = !!application.is_application_fee_paid;
              const scholarshipFeePaid = !!application.is_scholarship_fee_paid;
              if (!scholarship) return null;
              return (
                        <div key={application.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 overflow-hidden">
                  <div className="p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                                <div className="font-bold text-slate-900 text-xl">{scholarship.title}</div>
                                <div className="flex items-center text-slate-600 mt-1">
                                <Building className="h-4 w-4 mr-2" />
                                {scholarship.universities?.name}
                              </div>
                            </div>
                              <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold border ${getStatusColor(application.status === 'enrolled' ? 'approved' : application.status)} bg-white`}>
                                <Icon className="h-4 w-4 mr-2" />
                                {getStatusLabel(application.status === 'enrolled' ? 'approved' : application.status)}
                              </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                                <span className="font-semibold text-green-700">{formatAmount(scholarship.annual_value_with_scholarship ?? 0)}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-slate-500" />
                            <span className="text-slate-600">Applied on {new Date(application.applied_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center">
                                <span className="text-slate-600 capitalize">Level: {scholarship.level}</span>
                              </div>
                          </div>
                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {applicationFeePaid ? (
                          <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle className="h-4 w-4 mr-2" />
                                  Application Fee Paid
                          </span>
                        ) : (
                          <StripeCheckout
                            productId="applicationFee"
                            feeType="application_fee"
                            paymentType="application_fee"
                            buttonText="Pay Application Fee ($350)"
                            className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            successUrl={`${window.location.origin}/student/dashboard/application-fee-success?session_id={CHECKOUT_SESSION_ID}`}
                            cancelUrl={`${window.location.origin}/student/dashboard/application-fee-error`}
                            disabled={hasSelectedScholarship && !scholarshipFeePaid}
                            scholarshipsIds={[application.scholarship_id]}
                            beforeCheckout={() => ensureApplication(application.scholarship_id)}
                                  metadata={{ application_id: application.id, selected_scholarship_id: application.scholarship_id }}
                          />
                        )}
                        {scholarshipFeePaid ? (
                          <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle className="h-4 w-4 mr-2" />
                                  Scholarship Fee Paid
                          </span>
                        ) : (
                          <StripeCheckout
                            productId="scholarshipFee"
                            feeType="scholarship_fee"
                            paymentType="scholarship_fee"
                            buttonText="Pay Scholarship Fee ($550)"
                            className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            successUrl={`${window.location.origin}/student/dashboard/scholarship-fee-success?session_id={CHECKOUT_SESSION_ID}`}
                            cancelUrl={`${window.location.origin}/student/dashboard/scholarship-fee-error`}
                            disabled={!applicationFeePaid || scholarshipFeePaid || (hasSelectedScholarship && !scholarshipFeePaid)}
                            scholarshipsIds={[application.scholarship_id]}
                                  metadata={{ application_id: application.id, selected_scholarship_id: application.scholarship_id }}
                          />
                        )}
                        {(hasSelectedScholarship && !scholarshipFeePaid) && (
                          <div className="sm:col-span-2 text-xs text-slate-500 mt-2">
                            You have already selected another scholarship. Payments for additional scholarships are disabled.
                          </div>
                        )}
                        {(applicationFeePaid && scholarshipFeePaid) && (
                          <div className="sm:col-span-2">
                            <Link
                              to={`/student/dashboard/application/${application.id}/chat`}
                              className="inline-flex items-center px-4 py-2 rounded-xl font-semibold bg-blue-600 text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            >
                              View Details
                            </Link>
                          </div>
                        )}
                      </div>
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
              const otherList = filteredApplications.filter(a => a.status !== 'approved' && a.status !== 'enrolled');
              if (otherList.length === 0) return null;
              return (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Pending and In Progress</h3>
                    <span className="text-sm text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">{otherList.length} applications</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {otherList.map((application) => {
                      const Icon = getStatusIcon(application.status);
                      const scholarship = application.scholarships;
                      if (!scholarship) return null;
                      return (
                        <div key={application.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 overflow-hidden">
                          <div className="p-6">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-900 truncate">{scholarship.title}</div>
                                <div className="flex items-center text-slate-600 text-sm mt-1 truncate"><Building className="h-4 w-4 mr-2 shrink-0" /><span className="truncate">{scholarship.universities?.name}</span></div>
                              </div>
                              <span className={`shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusColor(application.status)}`}>
                                <Icon className="h-3.5 w-3.5 mr-2" />
                                {getStatusLabel(application.status)}
                              </span>
                            </div>
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                              <div className="flex items-center"><DollarSign className="h-4 w-4 mr-2 text-green-600" /><span className="font-semibold text-green-700">{formatAmount(scholarship.annual_value_with_scholarship ?? 0)}</span></div>
                              <div className="flex items-center"><Calendar className="h-4 w-4 mr-2 text-slate-500" /><span className="text-slate-600">Applied on {new Date(application.applied_at).toLocaleDateString()}</span></div>
                              <div className="flex items-center col-span-2 md:col-span-1"><span className="text-slate-600 capitalize">Level: {scholarship.level}</span></div>
                            </div>

                            {/* Not selected reason for rejected applications */}
                            {application.status === 'rejected' && (application as any).notes && (
                              <div className="mt-4 rounded-lg p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
                                <strong>Reason:</strong> {(application as any).notes}
                              </div>
                            )}

                            {/* Lista dos documentos com status/justificativa quando houver */}
                            {(() => {
                              const docs = parseApplicationDocuments((application as any).documents);
                              const approvedDocs = docs.filter(d => (d.status || '').toLowerCase() === 'approved');
                              const changesRequestedDocs = docs.filter(d => (d.status || '').toLowerCase() === 'changes_requested');
                              const underReviewDocs = docs.filter(d => (d.status || '').toLowerCase() === 'under_review');
                              const rejectedDocs = docs.filter(d => (d.status || '').toLowerCase() === 'rejected');
                              const hasAny = approvedDocs.length > 0 || changesRequestedDocs.length > 0 || underReviewDocs.length > 0 || rejectedDocs.length > 0;
                              if (docs.length === 0 || !hasAny) return null;
                              return (
                                <details className="mt-4 border-t pt-4 group">
                                  <summary className="flex items-center justify-between text-sm font-semibold text-slate-700 cursor-pointer select-none">
                                    <span>Documents status</span>
                                    <svg className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
                                  </summary>
                                  <div className="mt-3 space-y-3">
                                    {/* Approved docs (chips) */}
                                    {approvedDocs.length > 0 && (
                                      <div className="rounded-lg p-3 bg-green-50 border border-green-200">
                                        <div className="flex items-center justify-between gap-3">
                                          <span className="text-sm font-medium text-green-800">Approved</span>
                                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getDocBadgeClasses('approved')}`}>Approved</span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {approvedDocs.map((d) => (
                                            <span key={`approved-${d.type}`} className="px-2 py-0.5 rounded-full text-xs bg-white text-green-700 border border-green-300">
                                              {DOCUMENT_LABELS[d.type] || d.type}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Changes requested (with reason + upload) */}
                                    {changesRequestedDocs.map(d => {
                                      const status = 'changes_requested';
                                      const label = DOCUMENT_LABELS[d.type] || d.type;
                                      return (
                                        <div key={`cr-${d.type}`} className="rounded-lg p-4 bg-red-50 border border-red-200">
                                          <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm font-medium text-red-800">{label}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getDocBadgeClasses(status)}`}>Changes requested</span>
                                          </div>
                                          {d.review_notes && (
                                            <div className="mt-2 text-xs text-red-700">
                                              <strong>Reason:</strong> {d.review_notes}
                                            </div>
                                          )}
                                          {/* Reenvio do documento */}
                                          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                                            <label className="cursor-pointer bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-3 py-2 rounded-lg font-medium transition w-full sm:w-auto">
                                              <span>Select new {label}</span>
                                              <input
                                                type="file"
                                                className="sr-only"
                                                accept="application/pdf,image/*"
                                                onChange={(e) => handleSelectDocFile(application.id, d.type, e.target.files ? e.target.files[0] : null)}
                                              />
                                            </label>
                                            {selectedFiles[docKey(application.id, d.type)] && (
                                              <span className="text-xs text-slate-700 truncate max-w-xs w-full sm:w-auto">{selectedFiles[docKey(application.id, d.type)]?.name}</span>
                                            )}
                                            <button
                                              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full sm:w-auto hover:bg-blue-700"
                                              disabled={!selectedFiles[docKey(application.id, d.type)] || uploading[docKey(application.id, d.type)]}
                                              onClick={() => handleUploadDoc(application.id, d.type)}
                                            >
                                              {uploading[docKey(application.id, d.type)] ? 'Uploading...' : 'Upload replacement'}
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {/* Under review docs (chips) */}
                                    {underReviewDocs.length > 0 && (
                                      <div className="rounded-lg p-3 bg-amber-50 border border-amber-200">
                                        <div className="flex items-center justify-between gap-3">
                                          <span className="text-sm font-medium text-amber-800">Awaiting review</span>
                                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getDocBadgeClasses('under_review')}`}>Under review</span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {underReviewDocs.map((d) => (
                                            <span key={`ur-${d.type}`} className="px-2 py-0.5 rounded-full text-xs bg-white text-amber-700 border border-amber-300">
                                              {DOCUMENT_LABELS[d.type] || d.type}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Rejected docs (com motivo) */}
                                    {rejectedDocs.length > 0 && (
                                      <div className="rounded-lg p-3 bg-red-50 border border-red-200">
                                        <div className="flex items-center justify-between gap-3">
                                          <span className="text-sm font-medium text-red-800">Rejected</span>
                                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getDocBadgeClasses('changes_requested')}`}>Rejected</span>
                                        </div>
                                        <div className="mt-2 space-y-2">
                                          {rejectedDocs.map((d) => (
                                            <div key={`rj-${d.type}`} className="text-xs text-red-700 bg-white border border-red-200 rounded px-2 py-1">
                                              <strong>{DOCUMENT_LABELS[d.type] || d.type}:</strong> {d.review_notes || 'Rejected by the university.'}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* University Document Requests statuses (uploads do aluno) */}
                                    {(() => {
                                      const reqUploads = requestUploadsByApp[application.id] || [];
                                      if (!reqUploads.length) return null;
                                      const reqRejected = reqUploads.filter(u => u.status === 'rejected');
                                      const reqUnder = reqUploads.filter(u => u.status === 'under_review');
                                      const reqApproved = reqUploads.filter(u => u.status === 'approved');
                                      if (!reqRejected.length && !reqUnder.length && !reqApproved.length) return null;
                                      return (
                                        <div className="rounded-lg p-3 bg-slate-50 border border-slate-200">
                                          <div className="text-sm font-semibold text-slate-800 mb-2">University document requests</div>
                                          {reqRejected.length > 0 && (
                                            <div className="mb-2">
                                              <div className="text-xs font-semibold text-red-700 mb-1">Rejected</div>
                                              <div className="space-y-1">
                                                {reqRejected.map((u, idx) => (
                                                  <div key={`req-rj-${idx}`} className="text-xs text-red-700 bg-white border border-red-200 rounded px-2 py-1">
                                                    <strong>{u.title}:</strong> {u.review_notes || 'Rejected by the university.'}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          {reqUnder.length > 0 && (
                                            <div className="mb-2">
                                              <div className="text-xs font-semibold text-amber-700 mb-1">Under review</div>
                                              <div className="flex flex-wrap gap-2">
                                                {reqUnder.map((u, idx) => (
                                                  <span key={`req-ur-${idx}`} className="px-2 py-0.5 rounded-full text-xs bg-white text-amber-700 border border-amber-300">{u.title}</span>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          {reqApproved.length > 0 && (
                                            <div>
                                              <div className="text-xs font-semibold text-green-700 mb-1">Approved</div>
                                              <div className="flex flex-wrap gap-2">
                                                {reqApproved.map((u, idx) => (
                                                  <span key={`req-ap-${idx}`} className="px-2 py-0.5 rounded-full text-xs bg-white text-green-700 border border-green-300">{u.title}</span>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </details>
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
  );
};

export default MyApplications;