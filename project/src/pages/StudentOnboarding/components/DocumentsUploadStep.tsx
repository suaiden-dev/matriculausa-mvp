import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Loader2, 
  X, 
  Clock, 
  DollarSign, 
  AlertCircle,
  Info,
  RefreshCw,
  Building,
  GraduationCap,
  ArrowRight,
  ChevronDown,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { getDeliveryModeColor, getDeliveryModeLabel } from '../../../utils/scholarshipHelpers';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { StepProps } from '../types';
import { useCartStore } from '../../../stores/applicationStore';
import { getN8nProxyUrl } from '../../../utils/storageProxy';
import TruncatedText from '../../../components/TruncatedText';

import { PencilLoader } from '../../../components/PencilLoader';

const DOCUMENT_TYPES = [
  { key: 'passport', label: 'Passport', description: 'Upload a clear photo or scan of your passport' },
  { key: 'diploma', label: 'High School Diploma', description: 'Upload your high school diploma or equivalent' },
  { key: 'funds_proof', label: 'Proof of Funds', description: 'Upload bank statements or financial documents' },
];

export const DocumentsUploadStep: React.FC<StepProps> = ({ onNext }) => {
  const { t } = useTranslation();
  const { user, userProfile, refetchUserProfile } = useAuth();
  const { clearCart } = useCartStore();
  const [files, setFiles] = useState<Record<string, File | File[] | null>>({
    passport: null,
    diploma: null,
    funds_proof: [], // Array para múltiplos arquivos
  });
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [mergingPdfs, setMergingPdfs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLocked, setIsLocked] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(localStorage.getItem('selected_application_id'));
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [openChecklists, setOpenChecklists] = useState<Record<string, boolean>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showConfirmModal) {
      // Pequeno delay para garantir que o modal renderizou
      setTimeout(() => {
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 10);
    }
  }, [showConfirmModal]);

  const DOCUMENT_LABELS: Record<string, string> = {
    passport: t('studentDashboard.myApplications.documents.passport') || 'Passport',
    diploma: t('studentDashboard.myApplications.documents.highSchoolDiploma') || 'High School Diploma',
    funds_proof: t('studentDashboard.myApplications.documents.proofOfFunds') || 'Proof of Funds',
  };

  // Obter process type do localStorage (escopado pref.)
  const userProcessTypeKey = userProfile?.id ? `studentProcessType_${userProfile.id}` : 'studentProcessType';
  const processType = (window.localStorage.getItem(userProcessTypeKey) || window.localStorage.getItem('studentProcessType')) || 'initial';

  // Verificar se já passou pela review (tem documentos enviados ou aprovados)
  useEffect(() => {
    console.log('[DocumentsUploadStep] Component mounted.');
    // window.localStorage.removeItem('selected_application_id'); // Remoção removida para manter persistência
    
    const checkIfLocked = async () => {
      if (!userProfile) return;
      const documentsUploaded = userProfile.documents_uploaded || false;
      const documentsApproved = userProfile.documents_status === 'approved';
      setIsLocked(documentsUploaded || documentsApproved);

      if (documentsUploaded || documentsApproved) {
        // Se já foi aprovado e o usuário já clicou em continuar anteriormente, restaurar a visualização
        

        setLoadingApplications(true);
        try {
          const { data, error } = await supabase
            .from('scholarship_applications')
            .select('*, scholarships(*, universities(id, name, logo_url))')
            .eq('student_id', userProfile.id)
            .order('created_at', { ascending: false });
          
          if (!error && data) {
            setApplications(data);
            
            // Auto-select if there's only one approved application
            const approvedApps = data.filter(a => a.status === 'approved' || a.status === 'enrolled');
            if (approvedApps.length === 1) {
              setSelectedAppId(approvedApps[0].id);
            }
          }
        } catch (err) {
          console.error('Error fetching applications:', err);
        } finally {
          setLoadingApplications(false);
        }
      }
    };
    checkIfLocked();

    return () => {
      console.log('[DocumentsUploadStep] Component UNMOUNTING.');
    };
  }, [userProfile?.id, userProfile?.documents_uploaded, userProfile?.documents_status]);

  const getDocumentLimit = (): number => {
    switch (processType) {
      case 'change_of_status': return 5;
      case 'transfer': return 10;
      case 'initial':
      default: return 5;
    }
  };

  const validateFileSize = (file: File): boolean => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    return file.size <= maxSize;
  };

  const validateTotalSize = (filesList: File[]): boolean => {
    const totalSize = filesList.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = 10 * 1024 * 1024; // 10MB
    return totalSize <= maxTotalSize;
  };

  const sanitizeFileName = (fileName: string): string => {
    return fileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9.-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  };

  const mergeFundsDocuments = async (filePaths: string[]): Promise<string> => {
    setMergingPdfs(true);
    try {
      const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1';
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      const mergeResponse = await fetch(`${SUPABASE_FUNCTIONS_URL}/merge-funds-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ file_paths: filePaths, user_id: user?.id })
      });

      if (!mergeResponse.ok) throw new Error('Failed to merge documents');
      const { merged_file_path } = await mergeResponse.json();
      return merged_file_path;
    } catch (error) {
      console.error('Error merging documents:', error);
      throw error;
    } finally {
      setMergingPdfs(false);
    }
  };

  const handleFileChange = (key: string, file: File | null) => {
    if (isLocked) return;
    if (file && !validateFileSize(file)) {
      setFieldErrors(prev => ({ ...prev, [key]: 'File size exceeds 10MB' }));
      return;
    }
    setFieldErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
    setFiles(prev => ({ ...prev, [key]: file }));
  };

  const handleFundsFileAdd = (newFiles: File[]) => {
    if (isLocked) return;
    const currentFiles = files.funds_proof as File[];
    const maxLimit = getDocumentLimit();
    if (currentFiles.length + newFiles.length > maxLimit) {
      setFieldErrors(prev => ({ ...prev, funds_proof: `Maximum limit is ${maxLimit} documents` }));
      return;
    }
    const oversizedFiles = newFiles.filter(f => !validateFileSize(f));
    if (oversizedFiles.length > 0) {
      setFieldErrors(prev => ({ ...prev, funds_proof: 'Each file must be under 10MB' }));
      return;
    }
    const combinedFiles = [...currentFiles, ...newFiles];
    if (!validateTotalSize(combinedFiles)) {
      setFieldErrors(prev => ({ ...prev, funds_proof: 'Total file size exceeds 10MB' }));
      return;
    }
    setFieldErrors(prev => { const next = { ...prev }; delete next.funds_proof; return next; });
    setFiles(prev => ({ ...prev, funds_proof: combinedFiles }));
  };

  const handleFundsFileRemove = (index: number) => {
    if (isLocked) return;
    setFiles(prev => {
      const currentFiles = [...(prev.funds_proof as File[])];
      currentFiles.splice(index, 1);
      return { ...prev, funds_proof: currentFiles };
    });
  };

  const handleUpload = async () => {
    if (!user?.id) { setError('User not authenticated'); return; }
    setUploading(true);
    setError(null);
    try {
      const uploadedPaths: Record<string, string> = {};
      
      // Upload Passport and Diploma
      for (const key of ['passport', 'diploma']) {
        const file = files[key] as File;
        const sanitizedName = sanitizeFileName(file.name);
        const fileName = `${user.id}/${key}_${Date.now()}_${sanitizedName}`;
        const { error: uploadError } = await supabase.storage.from('student-documents').upload(fileName, file);
        if (uploadError) throw uploadError;
        uploadedPaths[key] = fileName;
      }

      // Upload and Merge Funds Proofs
      const groupFundsFiles = files.funds_proof as File[];
      const uploadedFundsPaths: string[] = [];
      for (const [index, file] of groupFundsFiles.entries()) {
        const sanitizedName = sanitizeFileName(file.name);
        const fileName = `${user.id}/temp_funds/${Date.now()}_${index}_${sanitizedName}`;
        const { error: uploadError } = await supabase.storage.from('student-documents').upload(fileName, file);
        if (uploadError) throw uploadError;
        uploadedFundsPaths.push(fileName);
      }
      
      const mergedFilePath = await mergeFundsDocuments(uploadedFundsPaths);
      uploadedPaths.funds_proof = mergedFilePath;

      // Obter URLs públicas para salvar no banco e enviar para análise
      const getUrl = (path: string) => supabase.storage.from('student-documents').getPublicUrl(path).data.publicUrl;
      const passportUrl = getUrl(uploadedPaths.passport);
      const diplomaUrl = getUrl(uploadedPaths.diploma);
      const fundsUrl = getUrl(uploadedPaths.funds_proof);

      // 1. Inserir no histórico de documentos (student_documents)
      const docInserts = [
        { user_id: user.id, type: 'passport', file_url: passportUrl, status: 'pending' },
        { user_id: user.id, type: 'diploma', file_url: diplomaUrl, status: 'pending' },
        { user_id: user.id, type: 'funds_proof', file_url: fundsUrl, status: 'pending' }
      ];
      await supabase.from('student_documents').insert(docInserts);

      // 2. Criar Candidaturas para itens no carrinho se não existirem
      const { data: cartItems } = await supabase.from('user_cart').select('scholarship_id').eq('user_id', user.id);
      const scholarshipIds = (cartItems?.map(item => item.scholarship_id) || []);
      if (scholarshipIds.length === 0 && userProfile?.selected_scholarship_id) {
        scholarshipIds.push(userProfile.selected_scholarship_id);
      }

      if (scholarshipIds.length > 0) {
        for (const scholarshipId of scholarshipIds) {
          // Verificar se já existe aplicação
          const { data: existingApp } = await supabase
            .from('scholarship_applications')
            .select('id')
            .eq('student_id', userProfile?.id || '')
            .eq('scholarship_id', scholarshipId)
            .maybeSingle();

          let applicationId = existingApp?.id;

          if (!applicationId && userProfile?.id) {
            const { data: newApp } = await supabase
              .from('scholarship_applications')
              .insert({
                student_id: userProfile.id,
                scholarship_id: scholarshipId,
                status: 'pending',
                student_process_type: (userProfile?.id ? (window.localStorage.getItem(`studentProcessType_${userProfile.id}`) || window.localStorage.getItem('studentProcessType')) : window.localStorage.getItem('studentProcessType')) || 'initial'
              })
              .select('id')
              .single();
            applicationId = newApp?.id;
          }

          if (applicationId) {
            // Anexar documentos à aplicação
            const appDocs = [
              { type: 'passport', url: passportUrl, status: 'under_review', uploaded_at: new Date().toISOString() },
              { type: 'diploma', url: diplomaUrl, status: 'under_review', uploaded_at: new Date().toISOString() },
              { type: 'funds_proof', url: fundsUrl, status: 'under_review', uploaded_at: new Date().toISOString() }
            ];
            await supabase.from('scholarship_applications').update({ documents: appDocs }).eq('id', applicationId);
          }
        }
      }

      // 3. Atualizar Perfil do Usuário
      if (userProfile?.id) {
        await supabase.from('user_profiles').update({
          documents_uploaded: true,
          documents_status: 'under_review'
        }).eq('id', userProfile.id);
      }

      // 4. Limpar Carrinho
      await supabase.from('user_cart').delete().eq('user_id', user.id);
      clearCart(user.id);

      // 5. Chamada de Análise (Webhook n8n via Edge Function)
      setAnalyzing(true);
      const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1';
      const { data: { session } } = await supabase.auth.getSession();
      
      const webhookBody = {
        user_id: user.id,
        student_name: userProfile?.full_name || user.email || '',
        passport_url: getN8nProxyUrl(passportUrl),
        diploma_url: getN8nProxyUrl(diplomaUrl),
        funds_proof_url: getN8nProxyUrl(fundsUrl),
      };

      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/analyze-student-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(webhookBody)
      });

      if (!response.ok) {
        // Log error but we already saved to DB, so we don't throw to not confuse the user
        console.error('Document analysis webhook failed but records were saved.');
      }
      
      await refetchUserProfile();
    } catch (err: any) {
      console.error('Error in document upload/analysis:', err);
      setError(err.message || 'An error occurred during document processing.');
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const docKey = (applicationId: string, type: string) => `${applicationId}:${type}`;

  const handleSelectAppDocFile = (applicationId: string, type: string, file: File | null) => {
    setSelectedFiles(prev => ({ ...prev, [docKey(applicationId, type)]: file }));
  };

  const handleUploadAppDoc = async (applicationId: string, type: string) => {
    const key = docKey(applicationId, type);
    const file = selectedFiles[key];
    if (!user?.id || !file) return;
    
    setUploadingFiles(prev => ({ ...prev, [key]: true }));
    try {
      const path = `${user.id}/${applicationId}-${type}-${Date.now()}-${file.name}`;
      const { data, error: upErr } = await supabase.storage
        .from('student-documents')
        .upload(path, file, { upsert: true });
      
      if (upErr) throw upErr;
      
      const publicUrl = supabase.storage.from('student-documents').getPublicUrl(data?.path || path).data.publicUrl;
      if (!publicUrl) throw new Error('Failed to get file URL');
      
      // Log no histórico do aluno
      await supabase.from('student_documents').insert({ 
        user_id: user.id, 
        type, 
        file_url: publicUrl, 
        status: 'under_review' 
      });

      // Atualizar documentos da aplicação
      const app = applications.find((a: any) => a.id === applicationId);
      if (!app) throw new Error('Application not found');

      const currentDocs: any[] = app.documents || [];
      const normalized = parseApplicationDocuments(currentDocs);
      const idx = normalized.findIndex(d => d.type === type);
      
      const newDoc = { 
        type, 
        url: publicUrl, 
        status: 'under_review', 
        uploaded_at: new Date().toISOString() 
      };
      
      let newDocs: any[];
      if (idx >= 0) {
        newDocs = currentDocs.map((d: any) => d.type === type ? { ...d, ...newDoc } : d);
      } else {
        newDocs = [...currentDocs, newDoc];
      }
      
      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({ documents: newDocs })
        .eq('id', applicationId);
      
      if (updateError) throw updateError;
      
      // Notificar universidade
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token && app.scholarships?.university_id) {
          const notificationPayload = {
            user_id: user.id,
            application_id: applicationId,
            document_type: type,
            document_label: DOCUMENT_LABELS[type] || type,
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
      } catch (notifErr) {
        console.error('Error notifying university:', notifErr);
      }
      
      // Atualizar lista local
      const { data: refreshedApps } = await supabase
        .from('scholarship_applications')
        .select('*, scholarships(*, universities(id, name, logo_url))')
        .eq('student_id', userProfile?.id)
        .order('created_at', { ascending: false });
      
      if (refreshedApps) setApplications(refreshedApps);
      
      // Limpar seleção
      setSelectedFiles(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err: any) {
      console.error('Error uploading document:', err);
      setError(err.message || 'Error uploading document.');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [key]: false }));
    }
  };

  const toggleChecklist = (applicationId: string) => {
    setOpenChecklists(prev => {
      // Se já estiver aberto, fecha. Se estiver fechado, abre apenas este e fecha os outros.
      const isCurrentlyOpen = !!prev[applicationId];
      return isCurrentlyOpen ? {} : { [applicationId]: true };
    });
  };

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

  const allFilesSelected = files.passport && files.diploma && (files.funds_proof as File[]).length > 0;

  if (isLocked) {
    const isApproved = userProfile?.documents_status === 'approved';
    const approvedApps = applications.filter(app => app.status === 'approved' || app.status === 'enrolled');

    const handleConfirmSelection = () => {
      if (selectedAppId) {
        localStorage.setItem('selected_application_id', selectedAppId);
      } else {
        localStorage.removeItem('selected_application_id');
      }
      setShowConfirmModal(false);
      onNext();
    };

    const handleFinalContinue = () => {
      if (selectedAppId) {
        setShowConfirmModal(true);
      } else {
        handleConfirmSelection();
      }
    };

    return (
      <>
        <div 
          ref={topRef}
          className="transition-all duration-700 ease-in-out transform opacity-100 scale-100 blur-0 rotate-0"
        >
          <div className="space-y-10 max-w-5xl mx-auto pb-12 px-4">
            {/* Header Outside Container */}
            <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-10 duration-1000">
              <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">
                {isApproved ? 'Escolha sua Universidade' : 'Candidaturas em Análise'}
              </h2>
              <p className="text-lg md:text-xl text-white/60 font-medium max-w-2xl mx-auto">
                {isApproved 
                  ? 'Parabéns! Você foi aceito. Selecione abaixo a universidade para seguir com o pagamento.' 
                  : 'Seus documentos estão sendo revisados. Você pode acompanhar o status de cada bolsa abaixo.'}
              </p>
            </div>

            {/* Main Standard White Container */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 md:p-12 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-700">
              {/* Background Decoration */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
              
              <div className="relative z-10 space-y-10">
                <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                  <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                    <GraduationCap className="w-8 h-8 text-blue-600" />
                    Suas Bolsas
                  </h3>
                  <span className="bg-blue-50 text-blue-600 px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-blue-100">
                    {applications.length} Candidaturas
                  </span>
                </div>

                {loadingApplications ? (
                  <div className="flex justify-center py-24">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {applications.map((app) => {
                      const isAppApproved = app.status === 'approved' || app.status === 'enrolled';
                      const isSelected = selectedAppId === app.id;
                      const scholarship = app.scholarships;
                      const appDocs = parseApplicationDocuments(app.documents);
                      const hasDocumentIssues = app.status !== 'rejected' && appDocs.some(d => 
                        ['rejected', 'changes_requested'].includes(d.status?.toLowerCase() || '')
                      );
                      
                      return (
                        <div 
                          key={app.id} 
                          onClick={() => {
                            if (!isAppApproved) return;
                            setSelectedAppId(selectedAppId === app.id ? null : app.id);
                          }}
                          className={`group relative bg-white rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border-2 hover:-translate-y-0.5 transform-gpu ${
                            isSelected ? 'border-blue-500 bg-blue-50/10 shadow-blue-500/10 cursor-pointer' : 
                            app.status === 'rejected' ? 'border-red-500 bg-red-50/30' :
                            isAppApproved ? 'border-slate-300 hover:border-blue-300 cursor-pointer' : 
                            'border-slate-300 cursor-default opacity-80'
                          }`}
                        >
                          {/* Selected Check Badge */}
                          {isSelected && (
                            <div className="absolute top-4 right-4 z-20 bg-blue-600 text-white p-1.5 rounded-full shadow-lg animate-in zoom-in duration-300">
                              <CheckCircle className="w-5 h-5" />
                            </div>
                          )}

                          {/* Status Badge */}
                          {/* Status Badge */}
                          <div className="absolute top-4 right-14 z-10">
                            <div className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm backdrop-blur-md border ${
                              isAppApproved ? 'bg-emerald-500/90 text-white border-emerald-400' :
                              app.status === 'rejected' ? 'bg-red-500/90 text-white border-red-400' :
                              'bg-amber-500/90 text-white border-amber-400'
                            }`}>
                              {isAppApproved ? 'Aprovada' : app.status === 'rejected' ? 'Reprovada' : 'Em Análise'}
                            </div>
                          </div>



                          {/* Card Content */}
                          <div className="p-4 sm:p-5 flex-1 flex flex-col">
                            <div className="flex gap-5 items-center mb-5">
                              {scholarship?.universities?.logo_url ? (
                                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm p-2 flex-shrink-0">
                                  <img 
                                    src={scholarship.universities.logo_url} 
                                    alt="" 
                                    className="w-full h-full object-contain"
                                    onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                                  />
                                </div>
                              ) : (
                                <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 flex-shrink-0">
                                  <Building className="w-10 h-10 text-slate-400" />
                                </div>
                              )}
                              
                              <div className="flex-1 min-w-0">
                                {/* Title */}
                                <h4 className="text-lg sm:text-xl font-bold text-slate-900 mb-1 leading-tight group-hover:text-[#05294E] transition-colors pr-24">
                                  {scholarship?.title}
                                </h4>
                                
                                {/* University Name */}
                                <p className="text-sm sm:text-base font-medium text-slate-500 truncate">
                                  {scholarship?.universities?.name || 'Universidade'}
                                </p>
                              </div>
                            </div>

                            {/* Field of Study Badge */}
                            {scholarship?.field_of_study && (
                              <div className="flex items-center mb-3">
                                <span className="px-2 py-0.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200">
                                  {scholarship.field_of_study}
                                </span>
                              </div>
                            )}

                             {/* Financial Info */}
                             <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                               {scholarship?.original_annual_value && (
                                 <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-slate-200">
                                   <span className="text-xs text-slate-500 font-medium">Valor original</span>
                                   <span className="text-xs font-semibold text-slate-500 line-through">
                                     ${Number(scholarship.original_annual_value).toLocaleString('en-US')}
                                   </span>
                                 </div>
                               )}
                               <div className="flex items-center justify-between">
                                 <span className="text-xs text-slate-500 font-medium">Com Bolsa</span>
                                 <div className="flex items-center">
                                   <span className="font-bold text-green-700 text-base sm:text-lg">
                                     ${scholarship?.annual_value_with_scholarship 
                                       ? Number(scholarship.annual_value_with_scholarship).toLocaleString('en-US') 
                                       : scholarship?.amount 
                                         ? Number(scholarship.amount).toLocaleString('en-US') 
                                         : 'N/A'}
                                   </span>
                                   <span className="text-[10px] text-green-600 font-semibold ml-1">/ ano</span>
                                 </div>
                               </div>
                             </div>

                             {/* Rejection Notes */}
                             {app.status === 'rejected' && app.notes && (
                               <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                                 <p className="text-xs text-red-600 font-bold uppercase tracking-tight leading-relaxed">
                                   <span className="text-red-400 block mb-0.5">Motivo:</span>
                                   {app.notes}
                                 </p>
                               </div>
                             )}

                            {/* Documents Checklist for Non-Approved Applications */}
                            {!isAppApproved && (
                              <div className="mb-4">
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (app.id) toggleChecklist(app.id); 
                                  }}
                                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border group/btn ${
                                    hasDocumentIssues 
                                      ? 'bg-amber-50 border-amber-200 hover:bg-amber-100 shadow-sm shadow-amber-100' 
                                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                   <div className="flex items-center gap-2">
                                     <div className="relative">
                                       <FileText className={`w-4 h-4 ${hasDocumentIssues ? 'text-amber-600' : 'text-blue-600'}`} />
                                       {hasDocumentIssues && (
                                         <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full border border-white animate-pulse" />
                                       )}
                                     </div>
                                     <span className={`text-sm font-bold uppercase tracking-tight ${hasDocumentIssues ? 'text-amber-900' : 'text-slate-700'}`}>
                                       Verificar Documentos
                                     </span>
                                     {hasDocumentIssues && (
                                       <span className="flex h-2 w-2 rounded-full bg-orange-500 ml-1 shadow-sm shadow-orange-200" />
                                     )}
                                   </div>
                                  <ChevronDown className={`w-4 h-4 transition-transform ${hasDocumentIssues ? 'text-amber-400' : 'text-slate-400'} ${app.id && openChecklists[app.id] ? 'rotate-180' : ''}`} />
                                </button>

                                {app.id && openChecklists[app.id] && (
                                  <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {[
                                      { type: 'passport', label: DOCUMENT_LABELS.passport },
                                      { type: 'diploma', label: DOCUMENT_LABELS.diploma },
                                      { type: 'funds_proof', label: DOCUMENT_LABELS.funds_proof }
                                    ].map(docInfo => {
                                      const docData = appDocs.find(d => d.type === docInfo.type);                                          const status = (docData?.status || 'pending').toLowerCase();
                                          const isRejectedStatus = status === 'changes_requested' || status === 'rejected';
                                          const isApprovedStatus = status === 'approved';
                                          const isUnderReviewStatus = status === 'under_review';
                                          const key = docKey(app.id, docInfo.type);
                                          const selectedFile = selectedFiles[key];
                                          const isUploading = uploadingFiles[key];

                                          return (
                                            <div key={docInfo.type} className={`p-3 rounded-xl border-2 transition-all ${isRejectedStatus ? 'border-red-100 bg-red-50/30' : 'border-slate-50 bg-white'}`}>
                                              <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border ${isApprovedStatus ? 'bg-emerald-100 border-emerald-400 text-emerald-600' : isRejectedStatus ? 'bg-red-100 border-red-400 text-red-600' : 'bg-slate-100 border-slate-300 text-slate-400'}`}>
                                                      {isApprovedStatus ? <CheckCircle className="w-3 h-3" /> : isRejectedStatus ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                    </div>
                                                    <h5 className="text-xs font-bold text-slate-900 truncate">{docInfo.label}</h5>
                                                  </div>
                                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${isApprovedStatus ? 'bg-emerald-100 text-emerald-700' : isRejectedStatus ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {isApprovedStatus ? 'Aprovado' : isRejectedStatus ? 'Pendência' : isUnderReviewStatus ? 'Em Revisão' : 'Pendente'}
                                                  </span>
                                                  
                                                  {isRejectedStatus && (docData?.rejection_reason || docData?.review_notes) && (
                                                    <div className="mt-2">
                                                      <TruncatedText
                                                        text={docData.rejection_reason || docData.review_notes || ''}
                                                        maxLength={100}
                                                        className="text-[10px] text-red-600 font-medium leading-relaxed italic"
                                                        showTooltip={true}
                                                      />
                                                    </div>
                                                  )}
                                                </div>
                                              </div>

                                              {isRejectedStatus && (
                                                <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                                                  {!selectedFile ? (
                                                    <label className="block w-full cursor-pointer bg-white border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 p-2 rounded-lg text-center transition-all group/upload">
                                                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center justify-center gap-2">
                                                        <Upload className="w-3 h-3 group-hover/upload:scale-110 transition-transform" />
                                                        Selecionar Novo Arquivo
                                                      </span>
                                                      <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="application/pdf,image/*"
                                                        onChange={(e) => handleSelectAppDocFile(app.id, docInfo.type, e.target.files?.[0] || null)}
                                                      />
                                                    </label>
                                                  ) : (
                                                    <div className="flex items-center gap-2">
                                                      <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center justify-between min-w-0">
                                                        <span className="text-[10px] font-bold text-blue-700 truncate mr-2">{selectedFile.name}</span>
                                                        <button 
                                                          onClick={() => handleSelectAppDocFile(app.id, docInfo.type, null)}
                                                          className="text-blue-400 hover:text-red-500 transition-colors"
                                                        >
                                                          <X className="w-3 h-3" />
                                                        </button>
                                                      </div>
                                                      <button
                                                        onClick={() => handleUploadAppDoc(app.id, docInfo.type)}
                                                        disabled={isUploading}
                                                        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20 flex items-center justify-center min-w-[32px] min-h-[32px]"
                                                      >
                                                        {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Date */}
                            <div className="mt-auto pt-3 border-t border-slate-100">
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                  {new Date(app.applied_at).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                              </div>
                            </div>

                            {/* Select Button */}
                            {isAppApproved && (
                              <div className="mt-3">
                                 <div className={`w-full text-center py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-300 ${
                                   isSelected 
                                     ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                     : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600'
                                 }`}>
                                   {isSelected ? '✓ Selecionado' : 'Clique para selecionar'}
                                 </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {approvedApps.length > 0 && (
                  <div className="pt-8 border-t border-gray-50 flex justify-center">
                    <button 
                      onClick={handleFinalContinue} 
                      disabled={!selectedAppId}
                      className="w-full max-w-md bg-blue-600 text-white px-10 py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-sm hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/40 hover:scale-105 active:scale-95 flex items-center justify-center space-x-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group"
                    >
                      <span className="relative z-10">{!selectedAppId ? 'Selecione uma Bolsa' : 'Confirmar Bolsa'}</span>
                      <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform relative z-10" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-transparent backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl border border-gray-100 text-center space-y-8 animate-in zoom-in-95 duration-300">
              <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto border border-red-100 shadow-inner">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Confirmar Bolsa</h2>
                <p className="text-gray-500 font-medium text-lg leading-relaxed">
                  Essa decisão é final e que não tem como mudar.
                </p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowConfirmModal(false)} 
                  className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmSelection} 
                  className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 hover:scale-105"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-10 pb-24 sm:pb-12 max-w-4xl mx-auto">
      <div className="text-center md:text-left space-y-4 px-4">
        <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">Upload Documents</h2>
        <p className="text-lg md:text-xl text-white/60 font-medium max-w-2xl mt-2">
          We need few documents to verify your eligibility and process your application.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 md:p-12 shadow-2xl relative overflow-hidden mx-4">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
        
        <div className="relative z-10 space-y-10">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm font-bold text-red-700 uppercase tracking-tight">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-8">
            {DOCUMENT_TYPES.map((doc) => {
              const hasError = fieldErrors[doc.key];
              
              if (doc.key === 'funds_proof') {
                const fundsFiles = files.funds_proof as File[];
                const documentLimit = getDocumentLimit();
                
                return (
                  <div key={doc.key} className={`p-6 md:p-8 rounded-[2rem] border-2 transition-all duration-300 ${hasError ? 'border-red-100 bg-red-50/30' : 'border-slate-50 bg-slate-50/50 hover:border-blue-100 group'}`}>
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-gray-50 shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform">
                        <DollarSign className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{doc.label}</h3>
                          <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-full tracking-widest border border-blue-100">{fundsFiles.length}/{documentLimit} Files</span>
                        </div>
                        <p className="text-gray-500 font-medium text-sm leading-relaxed">{doc.description}</p>
                        
                        <div className="space-y-4">
                          <div className="relative group/upload">
                            <input type="file" accept="application/pdf" multiple onChange={(e) => handleFundsFileAdd(Array.from(e.target.files || []))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" disabled={isLocked || uploading || analyzing} />
                            <div className="border-2 border-dashed border-blue-200 rounded-2xl p-8 text-center bg-white group-hover/upload:border-blue-400 group-hover/upload:bg-blue-50/30 transition-all">
                              <Upload className="w-10 h-10 text-blue-400 mx-auto mb-3 group-hover/upload:scale-110 transition-transform" />
                              <p className="text-sm text-blue-700 font-black uppercase tracking-widest">Drag & Drop or Click to Select</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">{processType} Limit: {documentLimit} Documents (Max 10MB Total)</p>
                            </div>
                          </div>

                          {fundsFiles.length > 0 && (
                            <div className="grid grid-cols-1 gap-2">
                              {fundsFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-white border border-gray-50 rounded-xl shadow-sm animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                  <div className="flex items-center gap-3">
                                    <FileText className="w-4 h-4 text-red-500" />
                                    <span className="text-xs font-bold text-gray-700 uppercase tracking-tight truncate max-w-[200px]">{file.name}</span>
                                  </div>
                                  <button onClick={() => handleFundsFileRemove(idx)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><X className="w-4 h-4" /></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              const hasFile = files[doc.key] as File;
              return (
                <div key={doc.key} className={`p-6 md:p-8 rounded-[2rem] border-2 transition-all duration-300 ${hasError ? 'border-red-100 bg-red-50/30' : hasFile ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-50 bg-slate-50/50 hover:border-blue-100 group'}`}>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border border-gray-50 shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform ${hasFile ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-blue-600'}`}>
                      <FileText className="w-8 h-8" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{doc.label}</h3>
                        {hasFile && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                      </div>
                      <p className="text-gray-500 font-medium text-sm leading-relaxed">{doc.description}</p>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <label className={`w-full sm:w-auto px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all cursor-pointer flex items-center justify-center gap-2 ${hasFile ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100'}`}>
                          <Upload className="w-4 h-4" />
                          {hasFile ? 'Change File' : 'Choose File'}
                          <input type="file" accept="application/pdf,image/*" onChange={(e) => handleFileChange(doc.key, e.target.files?.[0] || null)} className="hidden" disabled={isLocked || uploading || analyzing} />
                        </label>
                        {hasFile && (
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest truncate max-w-[200px]">{hasFile.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-8 border-t border-gray-50 space-y-6">
            <div className="flex items-center gap-4 p-5 bg-blue-50/50 rounded-2xl border border-blue-100/30">
              <Info className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <p className="text-xs font-bold text-blue-800/70 uppercase tracking-wide leading-relaxed">
                Make sure all documents are clear, legible, and match the information provided in your profile. Our AI will analyze them automatically.
              </p>
            </div>

            <button
              onClick={handleUpload}
              disabled={!allFilesSelected || uploading || analyzing || mergingPdfs}
              className="w-full bg-blue-600 text-white py-6 rounded-2xl hover:bg-blue-700 transition-all font-black uppercase tracking-[0.3em] text-xs shadow-xl shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-95"
            >
              {(uploading || mergingPdfs) ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Uploading Documents...</span>
                </>
              ) : analyzing ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span>AI Analysis in Progress...</span>
                </>
              ) : (
                <>
                  <span>Upload and Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Manual Review Message Modal - Removed as per user request */}



      {/* Analysis Overlay */}
      {analyzing && (
        <div 
          className="fixed top-0 left-0 w-screen h-screen z-[9999] flex flex-col items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-500"
          style={{ margin: 0, padding: 0 }}
        >
          <div className="bg-white rounded-[2.5rem] p-12 max-w-sm w-full shadow-2xl text-center space-y-10 border border-white/20 relative mx-auto my-auto">
            <PencilLoader 
              title={t('studentDashboard.documentsAndScholarshipChoice.analyzingOverlayTitle')} 
              description={t('studentDashboard.documentsAndScholarshipChoice.analyzingOverlayDescription')} 
            />
          </div>
        </div>
      )}

      {/* Fixed Continue Button Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-2xl z-50 p-4 sm:hidden">
        <button onClick={handleUpload} disabled={!allFilesSelected || uploading || analyzing || mergingPdfs} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
          {uploading || analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Upload and Continue</span>}
        </button>
      </div>
    </div>
  );
};

