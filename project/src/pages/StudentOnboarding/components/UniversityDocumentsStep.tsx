import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  Info,
  Clock,
  ArrowRight,
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { StepProps } from '../types';

interface DocumentRequest {
  id: string;
  title: string;
  description?: string;
  created_at: string;
}

interface DocumentUpload {
  id: string;
  document_request_id: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  file_url: string;
  uploaded_at: string;
}

export const UniversityDocumentsStep: React.FC<StepProps> = ({ onNext, onBack }) => {
  const { user, userProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [existingUploads, setExistingUploads] = useState<Record<string, DocumentUpload>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchRequestsAndUploads();
  }, [userProfile?.id]);

  const fetchRequestsAndUploads = async () => {
    if (!userProfile?.id) return;
    
    try {
      setLoading(true);
      setError(null);

      // 1. Buscar a aplicação ativa (a mais recente com scholarship_fee paga ou aprovada)
      const { data: appsData, error: appsError } = await supabase
        .from('scholarship_applications')
        .select(`
          id,
          scholarship_id,
          scholarships (university_id)
        `)
        .eq('student_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;

      if (!appsData || appsData.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const activeApp = appsData[0];
      const universityId = (activeApp.scholarships as any)?.university_id;

      // 2. Buscar solicitações de documentos:
      // - Específicas para esta aplicação
      // - OU Globais para esta universidade
      let query = supabase
        .from('document_requests')
        .select('*');

      if (universityId) {
        query = query.or(`scholarship_application_id.eq.${activeApp.id},and(university_id.eq.${universityId},is_global.eq.true)`);
      } else {
        query = query.eq('scholarship_application_id', activeApp.id);
      }

      const { data: requestsData, error: requestsError } = await query
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      setRequests(requestsData || []);

      // 2. Buscar uploads já realizados para esses requests
      if (requestsData && requestsData.length > 0) {
        const requestIds = requestsData.map(r => r.id);
        const { data: uploadsData, error: uploadsError } = await supabase
          .from('document_request_uploads')
          .select('*')
          .in('document_request_id', requestIds)
          .eq('uploaded_by', userProfile.user_id);

        if (uploadsError) {
          throw uploadsError;
        }

        const uploadsMap: Record<string, DocumentUpload> = {};
        uploadsData?.forEach(upload => {
            // Se houver múltiplos uploads, pega o mais recente ou o aprovado
            const current = uploadsMap[upload.document_request_id];
            if (!current || new Date(upload.uploaded_at) > new Date(current.uploaded_at)) {
                 uploadsMap[upload.document_request_id] = upload;
            }
        });
        setExistingUploads(uploadsMap);
      }

    } catch (err: any) {
      console.error('Error fetching university documents:', err);
      // Se a tabela não existir ou erro de coluna, vamos tentar lidar graciosamente
      // setError('Não foi possível carregar a lista de documentos necessários.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (requestId: string, file: File | null) => {
    if (file && file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('Arquivo muito grande. O limite é 10MB.');
      return;
    }
    setFiles(prev => ({ ...prev, [requestId]: file }));
  };

  const handleUpload = async () => {
    if (!user?.id || !userProfile?.id) return;
    
    // Verificar se há arquivos para upload
    const requestsWithFiles = Object.keys(files).filter(key => files[key] !== null);
    if (requestsWithFiles.length === 0) {
        // Se não tem novos arquivos, verificar se todos os requests obrigatórios já têm upload
        const pendingRequests = requests.filter(req => {
            const upload = existingUploads[req.id];
            return !upload || upload.status === 'rejected';
        });

        if (pendingRequests.length === 0) {
            onNext();
            return;
        } else {
            setError('Por favor, anexe os documentos pendentes para continuar.');
            return;
        }
    }

    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      for (const requestId of requestsWithFiles) {
        const file = files[requestId];
        if (!file) continue;

        const request = requests.find(r => r.id === requestId);
        const sanitizedTitle = request?.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || 'doc';
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id || userProfile?.id}/${requestId}_${Date.now()}_${sanitizedTitle}.${fileExt}`;

        // 1. Upload para Storage
        const { error: uploadError } = await supabase.storage
          .from('student-documents') // Usando o mesmo bucket
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('student-documents')
          .getPublicUrl(fileName);

        // 2. Insert/Update na tabela document_request_uploads
        // Sempre inserimos um novo registro de upload para histórico? O sistema admin parece pegar o mais recente.
        const { error: dbError } = await supabase
          .from('document_request_uploads')
          .insert({
            document_request_id: requestId,
            uploaded_by: user?.id || userProfile?.id,
            file_url: publicUrl,
            status: 'pending',
            uploaded_at: new Date().toISOString()
          });

        if (dbError) throw dbError;
        
        // Limpar arquivo do estado local após sucesso
        setFiles(prev => {
            const newState = { ...prev };
            delete newState[requestId];
            return newState;
        });
      }

      setSuccessMessage('Documentos enviados com sucesso!');
      await fetchRequestsAndUploads(); // Recarregar para atualizar status

      // Verificar se tudo está completo para avançar automaticamente ou deixar usuário clicar
      // setTimeout(() => onNext(), 1500); 

    } catch (err: any) {
      console.error('Error uploading documents:', err);
      setError('Ocorreu um erro ao enviar os documentos. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  // Se não houver requests, mostrar tela de sucesso/info e botão de continuar
  if (!loading && requests.length === 0) {
    return (
      <div className="max-w-4xl mx-auto pb-12 px-4 space-y-10 text-center">
         <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">
              Documentos da Universidade
            </h2>
            <p className="text-lg md:text-xl text-white/60 font-medium max-w-2xl mx-auto mt-2">
              Verificamos sua aplicação e, no momento, não há documentos adicionais pendentes.
            </p>
         </div>

         <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 md:p-16 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 mb-6">
                    <CheckCircle className="w-12 h-12 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">Tudo em Dia!</h3>
                <p className="text-gray-500 font-medium mb-10 max-w-md">
                    Você pode prosseguir para a próxima etapa. Caso a universidade solicite documentos extras futuramente, você será notificado.
                </p>

                <button 
                  onClick={onNext}
                  className="w-full max-w-sm bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
            </div>
         </div>
      </div>
    );
  }

  const allPendingFulfilled = requests.every(req => {
     const upload = existingUploads[req.id];
     // Se já tem upload (mesmo pendente) ou novo arquivo selecionado, conta como fulfilled para habilitar botão
     return (upload && upload.status !== 'rejected') || files[req.id];
  });

  return (
    <div className="space-y-10 pb-24 max-w-4xl mx-auto px-4">
      {/* Header */}
      <div className="text-center md:text-left space-y-4">
        <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">
          Documentos Adicionais
        </h2>
        <p className="text-lg md:text-xl text-white/60 font-medium max-w-3xl mt-2">
          A universidade solicitou os seguintes documentos para processar sua aceitação.
        </p>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
        
        <div className="relative z-10 space-y-8">
            {/* Status Messages */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm font-bold text-red-700">{error}</p>
                </div>
            )}
            {successMessage && (
                 <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <p className="text-sm font-bold text-emerald-700">{successMessage}</p>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    <p className="text-gray-400 font-medium text-sm">Carregando solicitações...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {requests.map((request) => {
                        const existingUpload = existingUploads[request.id];
                        const selectedFile = files[request.id];
                        const isApproved = existingUpload?.status === 'approved';
                        const isPendingReview = existingUpload?.status === 'pending' || existingUpload?.status === 'under_review';
                        const isRejected = existingUpload?.status === 'rejected';

                        return (
                            <div 
                                key={request.id} 
                                className={`p-6 md:p-8 rounded-[2rem] border-2 transition-all duration-300 ${
                                    isApproved ? 'border-emerald-100 bg-emerald-50/20' :
                                    isRejected ? 'border-red-100 bg-red-50/20' :
                                    selectedFile ? 'border-blue-200 bg-blue-50/30' :
                                    isPendingReview ? 'border-amber-100 bg-amber-50/20' :
                                    'border-slate-100 bg-slate-50/50 hover:border-blue-100'
                                }`}
                            >
                                <div className="flex flex-col md:flex-row gap-6">
                                    {/* Icon */}
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm flex-shrink-0 ${
                                        isApproved ? 'bg-emerald-100 border-emerald-200 text-emerald-600' :
                                        isRejected ? 'bg-red-100 border-red-200 text-red-600' :
                                        isPendingReview ? 'bg-amber-100 border-amber-200 text-amber-600' :
                                        'bg-white border-gray-100 text-blue-600'
                                    }`}>
                                        {isApproved ? <CheckCircle className="w-6 h-6" /> :
                                         isRejected ? <AlertCircle className="w-6 h-6" /> :
                                         isPendingReview ? <Clock className="w-6 h-6" /> :
                                         <Briefcase className="w-6 h-6" />}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                                                {request.title}
                                            </h3>
                                            {/* Status Badge */}
                                            {existingUpload && (
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border max-w-fit ${
                                                    isApproved ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                    isRejected ? 'bg-red-100 text-red-700 border-red-200' :
                                                    'bg-amber-100 text-amber-700 border-amber-200'
                                                }`}>
                                                    {isApproved ? 'Aprovado' : isRejected ? 'Rejeitado - Envie Novamente' : 'Em Análise'}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {request.description && (
                                            <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                                {request.description}
                                            </p>
                                        )}

                                        {/* Actions */}
                                        <div className="pt-2">
                                            {isApproved ? (
                                                <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wide">
                                                    <ShieldCheck className="w-4 h-4" />
                                                    Documento validado
                                                </div>
                                            ) : (
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                    <label className={`
                                                        relative overflow-hidden group cursor-pointer
                                                        px-6 py-3 rounded-xl border-2 font-bold text-xs uppercase tracking-widest transition-all
                                                        flex items-center gap-3
                                                        ${selectedFile 
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                                            : 'bg-white border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600'
                                                        }
                                                        ${(uploading) ? 'opacity-50 cursor-not-allowed' : ''}
                                                    `}>
                                                        <input 
                                                            type="file" 
                                                            className="hidden" 
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                            onChange={(e) => handleFileChange(request.id, e.target.files?.[0] || null)}
                                                            disabled={uploading}
                                                        />
                                                        {selectedFile ? (
                                                            <>
                                                                <CheckCircle className="w-4 h-4" />
                                                                <span>Arquivo Selecionado</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-4 h-4" />
                                                                <span>{isRejected ? 'Enviar Novo Arquivo' : 'Selecionar Arquivo'}</span>
                                                            </>
                                                        )}
                                                    </label>
                                                    
                                                    {selectedFile && (
                                                        <span className="text-xs font-medium text-gray-500 truncate max-w-[200px]">
                                                            {selectedFile.name}
                                                        </span>
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
            )}

            {/* Footer Action */}
            {!loading && requests.length > 0 && (
                <div className="pt-8 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3 text-gray-400 text-xs font-medium">
                        <Info className="w-4 h-4" />
                        <span>Formatos aceitos: PDF, JPG, PNG (Max 10MB)</span>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button
                          onClick={onBack}
                          className="px-6 py-4 rounded-xl font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors uppercase tracking-widest text-xs"
                        >
                          Voltar
                        </button>
                        
                        {(Object.keys(files).length > 0) ? (
                             <button 
                                onClick={handleUpload}
                                disabled={uploading}
                                className="flex-1 md:flex-none px-8 py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        Enviar Selecionados
                                        <Upload className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        ) : (
                            <button 
                                onClick={onNext}
                                disabled={!allPendingFulfilled}
                                className={`flex-1 md:flex-none px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${
                                    allPendingFulfilled 
                                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95' 
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                Continuar
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
