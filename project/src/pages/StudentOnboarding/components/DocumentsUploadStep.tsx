import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Loader2, 
  X, 
  Clock, 
  AlertCircle,
  RefreshCw,
  Building,
  GraduationCap,
  ArrowRight,
  ChevronDown,
  XCircle,
  AlertTriangle,
  Send,
  Eye,
} from 'lucide-react';

import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { StepProps } from '../types';
import { useCartStore } from '../../../stores/applicationStore';
import { getN8nProxyUrl } from '../../../utils/storageProxy';
import { getPlacementFee } from '../../../utils/placementFeeCalculator';
import { formatCurrency } from '../../../utils/currency';
import TruncatedText from '../../../components/TruncatedText';
import ScholarshipDetailModal from '../../../components/ScholarshipDetailModal';

import { PencilLoader } from '../../../components/PencilLoader';

const DOCUMENT_TYPES = [
  { key: 'passport', label: 'Passport', description: 'Upload a clear photo or scan of your passport.' },
  { key: 'diploma', label: 'High School Diploma', description: 'Upload your high school diploma or equivalent.' },
  { key: 'funds_proof', label: 'Proof of Funds', description: 'Upload bank statements or financial documents. Minimum of $22,000 USD is required, plus $5,000 USD for each dependent.' },
];

export const DocumentsUploadStep: React.FC<StepProps> = ({ onNext }) => {
  const { t } = useTranslation(['registration', 'common']);
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
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedScholarshipForModal, setSelectedScholarshipForModal] = useState<any>(null);
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
    passport: t('studentDashboard.documentsAndScholarshipChoice.passport') || 'Passport',
    diploma: t('studentDashboard.documentsAndScholarshipChoice.diploma') || 'High School Diploma',
    funds_proof: t('studentDashboard.documentsAndScholarshipChoice.fundsProof') || 'Proof of Funds',
  };

  const DOCUMENT_DESCRIPTIONS: Record<string, string> = {
    passport: t('studentDashboard.documentsAndScholarshipChoice.passportDescription') || 'Faça upload de uma foto ou digitalização nítida do seu passaporte.',
    diploma: t('studentDashboard.documentsAndScholarshipChoice.diplomaDescription') || 'Upload your high school diploma or equivalent.',
    funds_proof: t('studentDashboard.documentsAndScholarshipChoice.fundsProofDescription') || 'Faça upload de extratos bancários ou documentos financeiros. É necessário um mínimo de $22.000 USD, mais $5.000 USD para cada dependente.',
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
      case 'transfer': return 5;
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
      // Limpar erro após 4 segundos
      setTimeout(() => {
        setFieldErrors(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 4000);
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
      // Limpar erro após 4 segundos
      setTimeout(() => {
        setFieldErrors(prev => {
          const next = { ...prev };
          delete next.funds_proof;
          return next;
        });
      }, 4000);
      return;
    }
    const oversizedFiles = newFiles.filter(f => !validateFileSize(f));
    if (oversizedFiles.length > 0) {
      setFieldErrors(prev => ({ ...prev, funds_proof: 'Each file must be under 10MB' }));
      // Limpar erro após 4 segundos
      setTimeout(() => {
        setFieldErrors(prev => {
          const next = { ...prev };
          delete next.funds_proof;
          return next;
        });
      }, 4000);
      return;
    }
    const combinedFiles = [...currentFiles, ...newFiles];
    if (!validateTotalSize(combinedFiles)) {
      setFieldErrors(prev => ({ ...prev, funds_proof: 'Total file size exceeds 10MB' }));
      // Limpar erro após 4 segundos
      setTimeout(() => {
        setFieldErrors(prev => {
          const next = { ...prev };
          delete next.funds_proof;
          return next;
        });
      }, 4000);
      return;
    }
    setFieldErrors(prev => { const next = { ...prev }; delete next.funds_proof; return next; });
    setFiles(prev => ({ ...prev, funds_proof: combinedFiles }));
  };

  const handleFundsFileRemove = (index: number) => {
    if (isLocked) return;
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next.funds_proof;
      return next;
    });
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
      if (app.status === 'rejected') throw new Error('Cannot upload documents to a rejected application');

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

  const handleOpenDetailModal = (e: React.MouseEvent, scholarship: any) => {
    e.stopPropagation();
    setSelectedScholarshipForModal(scholarship);
    setIsDetailModalOpen(true);
  };

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

  const allFilesSelected = files.passport && files.diploma && (files.funds_proof as File[]).length > 0;

  if (isLocked) {
    const isApproved = userProfile?.documents_status === 'approved';
    const approvedApps = applications.filter(app => app.status === 'approved' || app.status === 'enrolled');
    
    // Verificar se já existe uma aplicação paga para mostrar estado concluído
    const paidApplication = applications.find(app => !!app.is_application_fee_paid);

    if (paidApplication) {
      return (
        <div className="space-y-10 pb-12 max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-left space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">
              {t('studentOnboarding.documentsUpload.approvedApps.title')}
            </h2>
          </div>

          {/* Success Card */}
          <div className="bg-white border border-emerald-500/30 ring-1 ring-emerald-500/20 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-500">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
            
            <div className="relative z-10 text-center py-4">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-3xl font-black text-gray-900 mb-4 uppercase tracking-tight">
                {t('studentOnboarding.documentsUpload.approvedApps.scholarshipConfirmed')}
              </h3>
              <p className="text-gray-500 mb-8 font-medium text-lg max-w-lg mx-auto">
                {t('studentOnboarding.documentsUpload.approvedApps.scholarshipSelectedPre')}
                <span className="text-blue-600 font-bold">{paidApplication.scholarships?.title}</span>
                {t('studentOnboarding.documentsUpload.approvedApps.scholarshipSelectedPost')}
              </p>
              <button
                onClick={onNext}
                className="w-full max-w-xs bg-blue-600 text-white py-4 px-8 rounded-xl hover:bg-blue-700 transition-all font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 mx-auto flex items-center justify-center gap-2 group"
              >
                <span>{t('studentOnboarding.documentsUpload.approvedApps.continue')}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      );
    }


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
            <div className="text-left space-y-4 animate-in fade-in slide-in-from-top-10 duration-1000">
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                {isApproved ? t('studentOnboarding.documentsUpload.approvedApps.title') : t('studentOnboarding.documentsUpload.review.title')}
              </h2>
            </div>

            {/* Main Standard White Container */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 md:p-12 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-700">
              {/* Background Decoration */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
              
              <div className="relative z-10 space-y-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-50 pb-6 gap-4">
                  <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3 whitespace-nowrap">
                    <GraduationCap className="w-8 h-8 text-blue-600 flex-shrink-0" />
                    {t('studentOnboarding.documentsUpload.cards.yourScholarships')}
                  </h3>
                  <span className="w-fit bg-blue-50 text-blue-600 px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-blue-100">
                    {t('studentOnboarding.documentsUpload.cards.applications').replace('{{count}}', applications.length.toString())}
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
                        const showAmberAlert = hasDocumentIssues;

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
                            {/* Status Badge & View Details */}
                            <div className="hidden sm:flex items-center gap-2 absolute top-4 right-4 z-20">
                              <button
                                type="button"
                                onClick={(e) => handleOpenDetailModal(e, scholarship)}
                                className="bg-white/80 p-2.5 rounded-xl text-blue-600 hover:text-blue-700 hover:scale-110 transition-all backdrop-blur-md"
                                title={t('scholarshipsPage.scholarshipCard.details')}
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <div className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm backdrop-blur-md border ${
                                isAppApproved ? 'bg-emerald-500/90 text-white border-emerald-400' :
                                app.status === 'rejected' ? 'bg-red-500/90 text-white border-red-400' :
                                'bg-amber-500/90 text-white border-amber-400'
                              }`}>
                                {isAppApproved ? t('studentOnboarding.documentsUpload.cards.status.approved') : app.status === 'rejected' ? t('studentOnboarding.documentsUpload.cards.status.rejected') : t('studentOnboarding.documentsUpload.cards.status.underReview')}
                              </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-4 sm:p-5 flex-1 flex flex-col">
                              {/* Mobile Header: Logo (left) | Eye + Status (right) */}
                              <div className="sm:hidden flex items-center justify-between mb-4 w-full">
                                {/* Left Side: University Logo */}
                                <div className="relative group/image flex-shrink-0">
                                  {scholarship?.image_url || scholarship?.universities?.logo_url ? (
                                    <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm">
                                      <img 
                                        src={scholarship?.image_url || scholarship?.universities?.logo_url} 
                                        alt="" 
                                        className="w-full h-full object-contain p-1.5"
                                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                                      <Building className="w-6 h-6 text-slate-300" />
                                    </div>
                                  )}
                                </div>

                                {/* Right Side: Eye + Status Badge */}
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenDetailModal(e, scholarship)}
                                    className="bg-transparent p-1 rounded-xl text-blue-600 active:scale-95 transition-all h-9 w-9 flex items-center justify-center"
                                  >
                                    <Eye className="w-5 h-5" />
                                  </button>
                                  <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                                    isAppApproved ? 'bg-emerald-500 text-white border-emerald-400' :
                                    app.status === 'rejected' ? 'bg-red-500 text-white border-red-400' :
                                    'bg-amber-500 text-white border-amber-400'
                                  }`}>
                                    {isAppApproved ? t('studentOnboarding.documentsUpload.cards.status.approved') : app.status === 'rejected' ? t('studentOnboarding.documentsUpload.cards.status.rejected') : t('studentOnboarding.documentsUpload.cards.status.underReview')}
                                  </div>
                                </div>
                              </div>

                              {/* Mobile Row 2: Scholarship & University Title */}
                              <div className="sm:hidden mb-4">
                                <h4 className="text-lg font-bold text-slate-900 mb-0.5 leading-tight">
                                  {scholarship?.title}
                                </h4>
                                <p className="text-sm font-medium text-slate-500">
                                  {scholarship?.universities?.name || t('studentOnboarding.documentsUpload.cards.university')}
                                </p>
                              </div>

                              {/* Desktop Content Block - Hidden on Mobile */}
                              <div className="hidden sm:flex gap-4 items-center mb-4">
                                <div className="relative group/image flex-shrink-0">
                                  {scholarship?.image_url || scholarship?.universities?.logo_url ? (
                                    <div className="w-28 h-28 bg-white rounded-[2rem] flex items-center justify-center overflow-hidden border border-gray-100/50 shadow-sm relative">
                                      <img 
                                        src={scholarship?.image_url || scholarship?.universities?.logo_url} 
                                        alt="" 
                                        className="w-full h-full object-contain transform scale-100 p-2 group-hover/image:scale-110 transition-transform duration-500"
                                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-28 h-28 bg-slate-50 rounded-[2rem] flex items-center justify-center border border-gray-100/50 relative">
                                      <Building className="w-16 h-16 text-slate-300" />
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  {/* Title */}
                                  <h4 className="text-lg font-bold text-slate-900 mb-0.5 leading-tight group-hover:text-[#05294E] transition-colors pr-0 sm:pr-20">
                                    {scholarship?.title}
                                  </h4>
                                  
                                  {/* University Name */}
                                  <p className="text-sm sm:text-base font-medium text-slate-500 truncate">
                                    {scholarship?.universities?.name || t('studentOnboarding.documentsUpload.cards.university')}
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
                                     <span className="text-xs text-slate-500 font-medium">{t('studentOnboarding.documentsUpload.cards.originalValue')}</span>
                                     <span className="text-xs font-semibold text-slate-500 line-through">
                                       ${Number(scholarship.original_annual_value).toLocaleString('en-US')}
                                     </span>
                                   </div>
                                 )}
                                 <div className="flex items-center justify-between">
                                   <span className="text-xs text-slate-500 font-medium">{t('studentOnboarding.documentsUpload.cards.withScholarship')}</span>
                                   <div className="flex items-center">
                                     <span className="font-bold text-green-700 text-base sm:text-lg">
                                       ${scholarship?.annual_value_with_scholarship 
                                         ? Number(scholarship.annual_value_with_scholarship).toLocaleString('en-US') 
                                         : scholarship?.amount 
                                           ? Number(scholarship.amount).toLocaleString('en-US') 
                                           : 'N/A'}
                                     </span>
                                     <span className="text-[10px] text-green-600 font-semibold ml-1">{t('studentOnboarding.documentsUpload.cards.perYear')}</span>
                                   </div>
                                 </div>

                                 {/* Placement Fee - exibir apenas para novos usuários */}
                                 {(userProfile as any)?.placement_fee_flow && (() => {
                                   const annualValue = scholarship?.annual_value_with_scholarship ? Number(scholarship.annual_value_with_scholarship) : Number(scholarship?.amount) || 0;
                                   const placementFeeAmount = scholarship?.placement_fee_amount ? Number(scholarship.placement_fee_amount) : null;
                                   const placementFee = getPlacementFee(annualValue, placementFeeAmount);
                                   return (
                                     <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-slate-200">
                                       <span className="text-xs text-slate-500 font-medium">Placement Fee</span>
                                       <span className="text-blue-600 font-bold text-sm">
                                         {formatCurrency(placementFee)}
                                       </span>
                                     </div>
                                   );
                                 })()}
                               </div>

                               {/* Rejection Notes */}
                               {app.status === 'rejected' && app.notes && (
                                 <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                                   <p className="text-xs text-red-600 font-bold uppercase tracking-tight leading-relaxed">
                                     <span className="text-red-400 block mb-0.5">{t('studentOnboarding.documentsUpload.cards.reason')}</span>
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
                                      showAmberAlert 
                                        ? 'bg-amber-50 border-amber-200 hover:bg-amber-100 shadow-sm shadow-amber-100' 
                                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                     <div className="flex items-center gap-2">
                                       <div className="relative">
                                         <FileText className={`w-4 h-4 ${showAmberAlert ? 'text-amber-600' : 'text-blue-600'}`} />
                                         {showAmberAlert && (
                                           <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full border border-white animate-pulse" />
                                         )}
                                       </div>
                                       <span className={`text-sm font-bold uppercase tracking-tight ${showAmberAlert ? 'text-amber-900' : 'text-slate-700'}`}>
                                         {t('studentOnboarding.documentsUpload.cards.verifyDocuments')}
                                       </span>
                                       {showAmberAlert && (
                                         <span className="flex h-2 w-2 rounded-full bg-amber-500 ml-1 shadow-sm shadow-amber-200" />
                                       )}
                                     </div>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showAmberAlert ? 'text-amber-400' : 'text-slate-400'} ${app.id && openChecklists[app.id] ? 'rotate-180' : ''}`} />
                                  </button>

                                  {app.id && openChecklists[app.id] && (
                                    <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                      {[
                                        { type: 'passport', label: DOCUMENT_LABELS.passport },
                                        { type: 'diploma', label: DOCUMENT_LABELS.diploma },
                                        { type: 'funds_proof', label: DOCUMENT_LABELS.funds_proof }
                                      ].map(docInfo => {
                                        const docData = appDocs.find(d => d.type === docInfo.type);
                                        const status = (docData?.status || 'pending').toLowerCase();
                                        const isRejectedStatus = status === 'changes_requested' || status === 'rejected';
                                        const isApprovedStatus = status === 'approved';
                                        const isUnderReviewStatus = status === 'under_review';
                                        const key = docKey(app.id, docInfo.type);
                                        const selectedFile = selectedFiles[key];
                                        const isUploading = uploadingFiles[key];

                                        return (
                                          <div key={docInfo.type} className={`p-3 rounded-xl border-2 transition-all ${
                                            isRejectedStatus ? 'border-red-100 bg-red-50/30' : 
                                            isUnderReviewStatus ? 'border-blue-100 bg-blue-50/30' :
                                            isApprovedStatus ? 'border-emerald-100 bg-emerald-50/30' :
                                            'border-amber-100 bg-amber-50/30'
                                          }`}>
                                            <div className="flex items-start justify-between gap-3">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border ${
                                                    isApprovedStatus ? 'bg-emerald-100 border-emerald-400 text-emerald-600' : 
                                                    isRejectedStatus ? 'bg-red-100 border-red-400 text-red-600' : 
                                                    isUnderReviewStatus ? 'bg-blue-100 border-blue-400 text-blue-600' :
                                                    'bg-amber-100 border-amber-400 text-amber-600'
                                                  }`}>
                                                    {isApprovedStatus ? <CheckCircle className="w-3 h-3" /> : isRejectedStatus ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                  </div>
                                                  <h5 className="text-xs font-bold text-slate-900 truncate">{docInfo.label}</h5>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                    isApprovedStatus ? 'bg-emerald-100 text-emerald-700' : 
                                                    isRejectedStatus ? 'bg-red-100 text-red-700' : 
                                                    isUnderReviewStatus ? 'bg-blue-100 text-blue-700' :
                                                    'bg-amber-100 text-amber-700'
                                                  }`}>
                                                    {isApprovedStatus ? t('studentOnboarding.documentsUpload.cards.status.isApproved') : isRejectedStatus ? t('studentOnboarding.documentsUpload.cards.status.isRejected') : isUnderReviewStatus ? t('studentOnboarding.documentsUpload.cards.status.isReview') : t('studentOnboarding.documentsUpload.cards.status.pending')}
                                                  </span>
                                                  {docData?.uploaded_at && (
                                                    <span className="text-[10px] text-slate-500 font-medium ml-2">
                                                      {t('studentOnboarding.documentsUpload.cards.sentOn').replace('{{date}}', new Date(docData.uploaded_at).toLocaleDateString('pt-BR'))}
                                                    </span>
                                                  )}
                                                  {isRejectedStatus && (
                                                    <span className="text-[9px] font-bold text-red-600 uppercase tracking-tight italic opacity-70">
                                                      {t('studentOnboarding.documentsUpload.cards.rejectionNote')}
                                                    </span>
                                                  )}
                                                </div>
                                                
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

                                            {isRejectedStatus && app.status !== 'rejected' && (
                                              <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                                                {!selectedFile ? (
                                                  <label className="flex w-1/2 cursor-pointer bg-white border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 p-1.5 rounded-lg text-center transition-all group/upload items-center justify-center">
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
                                                  <div className="flex items-center gap-2 w-1/2">
                                                    <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-1.5 flex items-center justify-between min-w-0">
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
                                                      className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20 flex items-center justify-center min-w-[48px] min-h-[32px]"
                                                    >
                                                      {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
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
                                     {isSelected ? t('studentOnboarding.documentsUpload.cards.selected') : t('studentOnboarding.documentsUpload.cards.clickToSelect')}
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
                      <span className="relative z-10">{!selectedAppId ? t('studentOnboarding.documentsUpload.actions.selectAScholarship') : t('studentOnboarding.documentsUpload.actions.selectScholarship')}</span>
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
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">{t('studentOnboarding.documentsUpload.actions.confirmSelectionModal.title')}</h2>
                <p className="text-gray-500 font-medium text-lg leading-relaxed">
                  {t('studentOnboarding.documentsUpload.actions.confirmSelectionModal.description')}
                </p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowConfirmModal(false)} 
                  className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-200 transition-all"
                >
                  {t('studentOnboarding.documentsUpload.actions.confirmSelectionModal.cancel')}
                </button>
                <button 
                  onClick={handleConfirmSelection} 
                  className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 hover:scale-105"
                >
                  {t('studentOnboarding.documentsUpload.actions.confirmSelectionModal.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scholarship Detail Modal */}
        {selectedScholarshipForModal && (
          <ScholarshipDetailModal
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            scholarship={selectedScholarshipForModal}
            userProfile={userProfile}
            userRole={userProfile?.role}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-10 pb-24 sm:pb-12 w-full">
      <div className="text-left space-y-4 px-4">
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">
          {t('studentDashboard.documentsUploadStep.title')}
        </h2>
        <p className="text-lg md:text-xl text-slate-600 font-medium max-w-2xl mt-2">
          {t('studentDashboard.documentsUploadStep.subtitle')}
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-12 shadow-2xl relative overflow-hidden mx-4">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
        
        <div className="relative z-10 space-y-10">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm font-bold text-red-700 uppercase tracking-tight">{error}</p>
            </div>
          )}

          <div className="relative overflow-hidden mb-6">
            <div className="relative z-10">
              <h4 className="text-base md:text-lg font-black text-gray-900 uppercase tracking-tight mb-2">
                {t('studentOnboarding.documentsUpload.instructions.title')}
              </h4>
              <div className="text-gray-700 md:text-gray-800 font-medium text-sm md:text-base leading-relaxed relative z-[20] text-justify">
                {t('studentOnboarding.documentsUpload.instructions.descriptionPre')}
                <strong>{t('studentOnboarding.documentsUpload.instructions.descriptionStrong')}</strong>
                {t('studentOnboarding.documentsUpload.instructions.descriptionMid')}
                <a href="https://lushamerica.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-black hover:text-blue-800 underline transition-all cursor-pointer relative z-[50]">{t('studentOnboarding.documentsUpload.instructions.descriptionLink')}</a>
                {t('studentOnboarding.documentsUpload.instructions.descriptionPost')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {DOCUMENT_TYPES.map((doc) => {
              const hasError = fieldErrors[doc.key];
              
              if (doc.key === 'funds_proof') {
                const fundsFiles = files.funds_proof as File[];
                const documentLimit = getDocumentLimit();
                
                return (
                  <div key={doc.key} className={`p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-2 transition-all duration-300 ${hasError ? 'border-red-100 bg-red-50/30' : fundsFiles.length > 0 ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-50 bg-slate-50/50 hover:border-blue-100 group'}`}>
                    <div className="flex flex-col md:flex-row gap-6">

                      <div className="flex-1 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 md:gap-3">
                            <h3 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-tight whitespace-nowrap">{DOCUMENT_LABELS[doc.key]}</h3>
                            {fundsFiles.length > 0 && <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />}
                          </div>
                          <span className="w-fit px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-full tracking-widest border border-blue-100">{fundsFiles.length}/{documentLimit} {t('common.files', 'Arquivos')}</span>
                        </div>
                        <p className="text-gray-500 font-medium text-sm leading-relaxed">{DOCUMENT_DESCRIPTIONS[doc.key]}</p>
                        
                        <div className="space-y-4">
                          <div className="relative group/upload">
                            <input type="file" accept="application/pdf" multiple onChange={(e) => handleFundsFileAdd(Array.from(e.target.files || []))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" disabled={isLocked || uploading || analyzing} />
                            <div className={`border-2 border-dashed rounded-2xl p-6 md:p-8 text-center transition-all bg-white group-hover/upload:bg-blue-50/30 ${hasError ? 'border-red-300' : 'border-blue-200 group-hover/upload:border-blue-400'}`}>
                              <Upload className={`w-8 h-8 md:w-10 md:h-10 mx-auto mb-2 md:mb-3 group-hover/upload:scale-110 transition-transform ${hasError ? 'text-red-400' : 'text-blue-400'}`} />
                              <p className={`text-xs md:text-sm font-black uppercase tracking-widest ${hasError ? 'text-red-700' : 'text-blue-700'}`}>
                                {hasError ? fieldErrors[doc.key] : t('studentDashboard.documentsAndScholarshipChoice.dragDropFiles')}
                              </p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">{processType} Limit: {documentLimit} {t('studentDashboard.documentsAndScholarshipChoice.documents')} (Max 10MB Total)</p>
                            </div>
                          </div>

                          {fundsFiles.length > 0 && (
                            <div className="grid grid-cols-1 gap-2">
                              {fundsFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                  <div className="flex items-center gap-3">
                                    <FileText className="w-4 h-4 text-red-500" />
                                    <span className="text-xs font-bold text-gray-700 uppercase tracking-tight truncate max-w-[200px]">{file.name}</span>
                                  </div>
                                  <button onClick={() => handleFundsFileRemove(idx)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><X className="w-4 h-4" /></button>
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
                <div key={doc.key} className={`p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-2 transition-all duration-300 ${hasError ? 'border-red-100 bg-red-50/30' : hasFile ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-50 bg-slate-50/50 hover:border-blue-100 group'}`}>
                  <div className="flex flex-col md:flex-row gap-6">

                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-tight">{DOCUMENT_LABELS[doc.key]}</h3>
                        {hasFile && <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />}
                      </div>
                      <p className="text-gray-500 font-medium text-sm leading-relaxed">{DOCUMENT_DESCRIPTIONS[doc.key]}</p>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <label className={`w-full sm:w-auto px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all cursor-pointer flex items-center justify-center gap-2 ${hasError ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : hasFile ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100'}`}>
                          <Upload className="w-4 h-4" />
                          {hasFile ? t('common.changeFile', 'Alterar Arquivo') : t('studentDashboard.documentsAndScholarshipChoice.chooseFile')}
                          <input type="file" accept="application/pdf,image/*" onChange={(e) => handleFileChange(doc.key, e.target.files?.[0] || null)} className="hidden" disabled={isLocked || uploading || analyzing} />
                        </label>
                        {hasError ? (
                          <span className="text-[10px] font-black text-red-600 uppercase tracking-widest animate-in fade-in slide-in-from-left-2">{fieldErrors[doc.key]}</span>
                        ) : hasFile && (
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
            <button
              onClick={handleUpload}
              disabled={!allFilesSelected || uploading || analyzing || mergingPdfs}
              className="w-full bg-blue-600 text-white py-4 sm:py-6 px-4 rounded-2xl hover:bg-blue-700 transition-all font-black uppercase tracking-widest sm:tracking-[0.3em] text-[10px] sm:text-xs shadow-xl shadow-blue-500/20 disabled:opacity-50 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 hover:scale-[1.01] active:scale-95"
            >
              {(uploading || mergingPdfs) ? (
                <>
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin flex-shrink-0" />
                  <span className="text-center">{t('studentDashboard.documentsUploadStep.uploadingDocuments')}</span>
                </>
              ) : analyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin flex-shrink-0" />
                  <span className="text-center">{t('studentDashboard.documentsUploadStep.aiAnalysisInProgress')}</span>
                </>
              ) : (
                <>
                  <span className="text-center">{t('studentDashboard.documentsUploadStep.uploadAndContinue')}</span>
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

    </div>
  );
};

