import React, { useState, useEffect } from 'react';
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
  Calendar,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { StepProps } from '../types';
import { useCartStore } from '../../../stores/applicationStore';
import { getN8nProxyUrl } from '../../../utils/storageProxy';

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
  const [showManualReviewMessage, setShowManualReviewMessage] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(localStorage.getItem('selected_application_id'));
  const [showAppSelection, setShowAppSelection] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Obter process type do localStorage
  const processType = localStorage.getItem('studentProcessType') || 'initial';

  // Verificar se já passou pela review (tem documentos enviados ou aprovados)
  useEffect(() => {
    console.log('[DocumentsUploadStep] Component mounted. Cleaning selection ID to prevent jump.');
    window.localStorage.removeItem('selected_application_id');
    
    const checkIfLocked = async () => {
      if (!userProfile) return;
      const documentsUploaded = userProfile.documents_uploaded || false;
      const documentsApproved = userProfile.documents_status === 'approved';
      setIsLocked(documentsUploaded || documentsApproved);

      if (documentsUploaded || documentsApproved) {
        // Se já foi aprovado e o usuário já clicou em continuar anteriormente, restaurar a visualização
        if (documentsApproved && localStorage.getItem('has_viewed_applications') === 'true') {
           setShowAppSelection(true); 
        }

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
                student_process_type: localStorage.getItem('studentProcessType') || 'initial'
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

  const allFilesSelected = files.passport && files.diploma && (files.funds_proof as File[]).length > 0;

  if (isLocked) {
    const isApproved = userProfile?.documents_status === 'approved';
    const approvedApps = applications.filter(app => app.status === 'approved' || app.status === 'enrolled');
    const hasMultipleApproved = approvedApps.length > 1;

    const handleContinueToApps = () => {
      console.log('[DocumentsUploadStep] handleContinueToApps clicked. Transitioning...');
      localStorage.setItem('has_viewed_applications', 'true');
      setIsTransitioning(true);
      setTimeout(() => {
        console.log('[DocumentsUploadStep] Timeout reached. Setting showAppSelection to true.');
        setShowAppSelection(true);
        // Pequeno delay para garantir que o DOM atualizou antes de remover o blur
        setTimeout(() => {
          console.log('[DocumentsUploadStep] Finalizing transition.');
          setIsTransitioning(false);
        }, 50);
      }, 500);
    };

    const handleFinalContinue = () => {
      if (selectedAppId) {
        localStorage.setItem('selected_application_id', selectedAppId);
      } else {
        localStorage.removeItem('selected_application_id');
      }
      onNext();
    };

    return (
      <div className={`transition-all duration-700 ease-in-out transform ${
        isTransitioning 
          ? 'opacity-0 scale-95 blur-2xl rotate-1' 
          : 'opacity-100 scale-100 blur-0 rotate-0'
      }`}>
        {!showAppSelection ? (
          <div className="space-y-10 max-w-4xl mx-auto pb-12 px-4">
            {/* Header */}
            <div className="text-center md:text-left space-y-4">
              <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">
                {isApproved ? 'Documentos Aprovados' : 'Upload de Documentos'}
              </h2>
              <p className="text-lg md:text-xl text-white/60 font-medium max-w-2xl mt-2">
                {isApproved 
                  ? 'Seus documentos foram verificados com sucesso.' 
                  : 'Seus documentos estão sendo revisados pela nossa equipe.'}
              </p>
            </div>

            {/* Main White Container */}
            <div className={`bg-white border rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden transition-all duration-500 ${
              isApproved 
                ? 'border-emerald-500/30 ring-1 ring-emerald-500/20' 
                : 'border-gray-100'
            }`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
              
              <div className="relative z-10 text-center py-6">
                <div className={`mb-6 w-20 h-20 ${isApproved ? 'bg-emerald-500/20' : 'bg-blue-500/5'} rounded-full flex items-center justify-center mx-auto border ${isApproved ? 'border-emerald-500/30' : 'border-gray-100'}`}>
                  {isApproved ? (
                    <CheckCircle className="w-12 h-12 text-emerald-400" />
                  ) : (
                    <Clock className="w-12 h-12 text-blue-600 animate-pulse" />
                  )}
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-3 uppercase tracking-tight">
                  {isApproved ? 'Tudo Certo!' : 'Aguardando Aprovação'}
                </h3>
                <p className="text-base sm:text-lg text-gray-500 mb-8 font-medium max-w-lg mx-auto">
                  {isApproved 
                    ? 'Você já pode visualizar suas candidaturas e prosseguir para o pagamento.' 
                    : 'Este processo geralmente leva de 24 a 48 horas úteis. Você será notificado quando seus documentos forem revisados.'}
                </p>

                {!isApproved && (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-left mb-8 max-w-lg mx-auto">
                    <div className="flex gap-4">
                      <Info className="w-6 h-6 text-blue-500 flex-shrink-0" />
                      <p className="text-sm font-bold text-blue-800 uppercase tracking-tight leading-relaxed">
                        Você não pode prosseguir para a próxima etapa até que pelo menos uma de suas solicitações de bolsa seja aprovada por um administrador.
                      </p>
                    </div>
                  </div>
                )}

                {isApproved && (
                  <button 
                    onClick={handleContinueToApps} 
                    className="w-full max-w-xs bg-blue-600 text-white py-4 px-8 rounded-xl hover:bg-blue-700 transition-all font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 mx-auto"
                  >
                    Continuar
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-10 max-w-5xl mx-auto pb-12 px-4">
            {/* Header Outside Container */}
            <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-10 duration-1000">
              <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">
                {hasMultipleApproved && !selectedAppId ? 'Escolha sua Universidade' : 'Minhas Candidaturas'}
              </h2>
              <p className="text-lg md:text-xl text-white/60 font-medium max-w-2xl mx-auto">
                {hasMultipleApproved && !selectedAppId 
                  ? 'Parabéns! Você foi aceito. Selecione abaixo a universidade para seguir com o pagamento.'
                  : 'Confira o status das suas solicitações de bolsa e finalize seu processo.'}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {applications.map((app) => {
                      const isAppApproved = app.status === 'approved' || app.status === 'enrolled';
                      const isSelected = selectedAppId === app.id;
                      const scholarship = app.scholarships;
                      
                      return (
                        <div 
                          key={app.id} 
                          onClick={() => {
                            if (!isAppApproved) return;
                            setSelectedAppId(selectedAppId === app.id ? null : app.id);
                          }}
                          className={`group relative bg-white rounded-2xl sm:rounded-3xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-2 flex flex-col h-full hover:-translate-y-1 transform-gpu ${
                            isSelected ? 'border-blue-500 bg-blue-50/30 shadow-blue-500/20' : 
                            isAppApproved ? 'border-slate-200/60 hover:border-blue-300 cursor-pointer' : 
                            'border-slate-200/60 opacity-70 grayscale-[0.3] cursor-default'
                          }`}
                        >
                          {/* Selected Check Badge */}
                          {isSelected && (
                            <div className="absolute top-3 right-3 z-20 bg-blue-600 rounded-full p-1.5 shadow-lg animate-in zoom-in duration-300">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                          )}

                          {/* Status Badge */}
                          <div className="absolute top-3 left-3 z-20">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                              app.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              app.status === 'enrolled' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              app.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {app.status === 'rejected' ? 'Rejeitado' : 
                               app.status === 'approved' ? 'Aprovado' : 
                               app.status === 'enrolled' ? 'Matriculado' : 
                               'Em Revisão'}
                            </span>
                          </div>

                          {/* Scholarship Image */}
                          <div className="relative h-32 overflow-hidden flex-shrink-0">
                            {scholarship?.image_url ? (
                              <img
                                src={scholarship.image_url}
                                alt={scholarship.title}
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full text-slate-400 bg-gradient-to-br from-[#05294E]/5 to-slate-100">
                                <Building className="h-12 w-12 text-[#05294E]/30" />
                              </div>
                            )}
                          </div>

                          {/* Card Content */}
                          <div className="p-4 sm:p-5 flex-1 flex flex-col">
                            {/* Title */}
                            <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-2 leading-tight line-clamp-2 group-hover:text-[#05294E] transition-colors">
                              {scholarship?.title}
                            </h4>

                            {/* Field of Study Badge */}
                            {scholarship?.field_of_study && (
                              <div className="flex items-center mb-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200">
                                  {scholarship.field_of_study}
                                </span>
                              </div>
                            )}

                            {/* University */}
                            <div className="flex items-center text-slate-600 mb-3">
                              {scholarship?.universities?.logo_url ? (
                                <img 
                                  src={scholarship.universities.logo_url} 
                                  alt={scholarship.universities.name}
                                  className="w-5 h-5 rounded-full object-cover mr-2 border border-slate-200"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : (
                                <Building className="h-4 w-4 mr-2 text-[#05294E]" />
                              )}
                              <span className="text-xs sm:text-sm font-medium truncate">
                                {scholarship?.universities?.name || 'Universidade'}
                              </span>
                            </div>

                            {/* Financial Info */}
                            <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <DollarSign className="h-4 w-4 mr-1.5 text-green-600" />
                                  <span className="font-bold text-green-700 text-sm">
                                    ${scholarship?.annual_value_with_scholarship 
                                      ? Number(scholarship.annual_value_with_scholarship).toLocaleString('en-US') 
                                      : scholarship?.amount 
                                        ? Number(scholarship.amount).toLocaleString('en-US') 
                                        : 'N/A'}
                                  </span>
                                </div>
                                {scholarship?.level && (
                                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                    {scholarship.level}
                                  </span>
                                )}
                              </div>
                              {scholarship?.original_annual_value && (
                                <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-200">
                                  <span className="text-[10px] text-slate-500">Valor original</span>
                                  <span className="text-[10px] font-semibold text-slate-500 line-through">
                                    ${Number(scholarship.original_annual_value).toLocaleString('en-US')}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Rejection Notes */}
                            {app.status === 'rejected' && app.notes && (
                              <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                                <p className="text-[10px] text-red-600 font-bold uppercase tracking-tight leading-relaxed">
                                  <span className="text-red-400 block mb-0.5">Motivo:</span>
                                  {app.notes}
                                </p>
                              </div>
                            )}

                            {/* Date */}
                            <div className="mt-auto pt-3 border-t border-slate-100">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                  <Calendar className="w-3 h-3 mr-1.5" />
                                  {new Date(app.applied_at).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                              </div>
                            </div>

                            {/* Select Button */}
                            {isAppApproved && (
                              <div className="mt-3">
                                <div className={`w-full text-center py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
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

                <div className="pt-8 border-t border-gray-50 flex justify-center">
                  <button 
                    onClick={handleFinalContinue} 
                    disabled={approvedApps.length > 0 && !selectedAppId}
                    className="w-full max-w-md bg-blue-600 text-white px-10 py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-sm hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/40 hover:scale-105 active:scale-95 flex items-center justify-center space-x-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group"
                  >
                    <span className="relative z-10">{approvedApps.length > 0 && !selectedAppId ? 'Selecione uma Bolsa' : 'Seguir para Pagamento'}</span>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform relative z-10" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
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

      {/* Manual Review Message Modal */}
      {showManualReviewMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl border border-gray-100 text-center space-y-8 animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto border border-blue-100 shadow-inner">
              <Clock className="w-12 h-12 text-blue-600" />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">{t('studentDashboard.documentsAndScholarshipChoice.manualReviewTitle')}</h2>
              <p className="text-gray-500 font-medium text-lg leading-relaxed">{t('studentDashboard.documentsAndScholarshipChoice.manualReviewTimeframe')}</p>
            </div>
            <button onClick={() => { setShowManualReviewMessage(false); onNext(); }} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 hover:scale-105">
              {t('studentDashboard.documentsAndScholarshipChoice.gotItContinue') || 'Got it, Continue'}
            </button>
          </div>
        </div>
      )}

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

