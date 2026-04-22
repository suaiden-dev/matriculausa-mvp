import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  X, 
  Upload, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Copy,
  User,
  Files,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ScholarshipItem {
  id: string;
  title: string;
  universities?: { name?: string | null } | null;
}

interface ScholarshipBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (successfulIds: string[]) => void;
  scholarships: ScholarshipItem[];
  studentProfileId: string;
  processType: string;
  user: any;
}

type UploadMode = 'none' | 'bulk' | 'individual';

export const ScholarshipBulkUploadModal: React.FC<ScholarshipBulkUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  scholarships,
  studentProfileId,
  processType,
  user
}) => {
  const [uploadMode, setUploadMode] = useState<UploadMode>('none');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Bulk Files
  const [bulkFiles, setBulkFiles] = useState<{
    passport: File | null;
    diploma: File | null;
    funds_proof: File | null;
  }>({ passport: null, diploma: null, funds_proof: null });

  // Individual Files
  const [individualFiles, setIndividualFiles] = useState<Record<string, {
    passport: File | null;
    diploma: File | null;
    funds_proof: File | null;
  }>>({});

  // Progress tracking
  const [progress, setProgress] = useState<Record<string, {
    status: 'idle' | 'creating' | 'uploading' | 'completed' | 'error';
    percentage: number;
    error?: string;
  }>>({});

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const handleFileChange = (scholarshipId: string | 'bulk', type: 'passport' | 'diploma' | 'funds_proof', file: File | null) => {
    if (scholarshipId === 'bulk') {
      setBulkFiles(prev => ({ ...prev, [type]: file }));
    } else {
      setIndividualFiles(prev => ({
        ...prev,
        [scholarshipId]: {
          ...(prev[scholarshipId] || { passport: null, diploma: null, funds_proof: null }),
          [type]: file
        }
      }));
    }
  };

  const sanitizeFileName = (fileName: string): string => {
    return fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const uploadFile = async (appId: string, docType: string, file: File) => {
    const safeDocType = docType.replace(/[^a-z0-9_\-]/gi, '').toLowerCase();
    const sanitized = sanitizeFileName(file.name);
    const timestamp = Date.now();
    const storagePath = `${studentProfileId}/${appId}/${safeDocType}_${timestamp}_${sanitized}`;

    const { error: uploadError } = await supabase.storage
      .from('student-documents')
      .upload(storagePath, file, { upsert: true, cacheControl: '3600' });

    if (uploadError) throw uploadError;

    return storagePath;
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleModeChange = (mode: UploadMode) => {
    setUploadMode(mode);
    if (mode === 'individual') {
      const initial: Record<string, boolean> = {};
      scholarships.forEach(s => {
        initial[s.id] = true;
      });
      setExpandedItems(initial);
    }
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    const newProgress: typeof progress = {};
    scholarships.forEach(s => {
      newProgress[s.id] = { status: 'creating', percentage: 0 };
    });
    setProgress(newProgress);

    try {
      for (const scholarship of scholarships) {
        setProgress(prev => ({ 
          ...prev, 
          [scholarship.id]: { ...prev[scholarship.id], status: 'creating', percentage: 10 } 
        }));

        // 1. Criar Aplicação
        const { data: inserted, error: insertErr } = await supabase
          .from('scholarship_applications')
          .insert({
            student_id: studentProfileId,
            scholarship_id: scholarship.id,
            status: 'pending',
            student_process_type: processType || 'initial'
          })
          .select('id')
          .single();

        if (insertErr) {
          setProgress(prev => ({ 
            ...prev, 
            [scholarship.id]: { status: 'error', percentage: 0, error: insertErr.message } 
          }));
          continue;
        }

        const applicationId = inserted.id;

        // 2. Determinar arquivos para esta bolsa
        const filesToUpload = uploadMode === 'bulk' 
          ? bulkFiles 
          : (uploadMode === 'individual' ? individualFiles[scholarship.id] : null);

        const documents: any[] = [];

        if (filesToUpload) {
          setProgress(prev => ({ 
            ...prev, 
            [scholarship.id]: { ...prev[scholarship.id], status: 'uploading', percentage: 30 } 
          }));

          const types = ['passport', 'diploma', 'funds_proof'] as const;
          let uploadedCount = 0;

          for (const type of types) {
            const file = filesToUpload[type];
            if (file) {
              try {
                const path = await uploadFile(applicationId, type, file);
                documents.push({
                  type,
                  url: path,
                  status: 'under_review',
                  uploaded_at: new Date().toISOString()
                });
                uploadedCount++;
                const currentPercent = 30 + (uploadedCount / 3) * 60;
                setProgress(prev => ({ 
                  ...prev, 
                  [scholarship.id]: { ...prev[scholarship.id], percentage: currentPercent } 
                }));
              } catch (err: any) {
                console.error(`Error uploading ${type} for ${scholarship.title}:`, err);
              }
            }
          }

          // 3. Atualizar Aplicação com documentos
          if (documents.length > 0) {
            await supabase
              .from('scholarship_applications')
              .update({ documents, updated_at: new Date().toISOString() })
              .eq('id', applicationId);
          }
        }

        // 4. Log Action
        try {
          await supabase.rpc('log_student_action', {
            p_student_id: studentProfileId,
            p_action_type: 'scholarship_application_created',
            p_action_description: `Application created by admin for scholarship: ${scholarship.title}`,
            p_performed_by: user?.id || null,
            p_performed_by_type: 'admin',
            p_metadata: {
              application_id: applicationId,
              scholarship_id: scholarship.id,
              documents_uploaded: documents.length,
              upload_mode: uploadMode
            }
          });
        } catch {}

        setProgress(prev => ({ 
          ...prev, 
          [scholarship.id]: { status: 'completed', percentage: 100 } 
        }));
      }

      const successfulIds = scholarships
        .filter(s => progress[s.id]?.status === 'completed')
        .map(s => s.id);

      if (successfulIds.length > 0) {
        onSuccess(successfulIds);
        if (successfulIds.length === scholarships.length) {
          toast.success('Bolsas cadastradas com sucesso!');
          setTimeout(() => {
            onClose();
            setIsProcessing(false);
          }, 1500);
        } else {
          toast.success(`${successfulIds.length} bolsas cadastradas. Algumas falharam.`);
          setIsProcessing(false);
        }
      } else {
        toast.error('Nenhuma bolsa pôde ser cadastrada.');
        setIsProcessing(false);
      }
    } catch (error: any) {
      toast.error('Erro ao processar cadastro: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-[#05294E] flex items-center gap-2">
              <Files className="w-6 h-6 text-indigo-600" />
              Cadastrar Bolsas
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Finalize o cadastro de {scholarships.length} bolsa(s) selecionada(s)
            </p>
          </div>
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-30"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => !isProcessing && handleModeChange('none')}
              disabled={isProcessing}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-3 text-center ${
                uploadMode === 'none' 
                  ? 'border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-200' 
                  : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white'
              }`}
            >
              <div className={`p-3 rounded-xl ${uploadMode === 'none' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Apenas Cadastrar</div>
                <div className="text-xs text-slate-500 mt-1">Sem envio de documentos agora</div>
              </div>
            </button>

            <button
              onClick={() => !isProcessing && handleModeChange('bulk')}
              disabled={isProcessing}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-3 text-center ${
                uploadMode === 'bulk' 
                  ? 'border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-200' 
                  : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white'
              }`}
            >
              <div className={`p-3 rounded-xl ${uploadMode === 'bulk' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                <Copy className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Upload em Massa</div>
                <div className="text-xs text-slate-500 mt-1">Mesmos arquivos para todas</div>
              </div>
            </button>

            <button
              onClick={() => !isProcessing && handleModeChange('individual')}
              disabled={isProcessing}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-3 text-center ${
                uploadMode === 'individual' 
                  ? 'border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-200' 
                  : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white'
              }`}
            >
              <div className={`p-3 rounded-xl ${uploadMode === 'individual' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Upload Individual</div>
                <div className="text-xs text-slate-500 mt-1">Arquivos específicos por bolsa</div>
              </div>
            </button>
          </div>

          {/* Bulk Upload Inputs */}
          {uploadMode === 'bulk' && !isProcessing && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-[#05294E] flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-600" />
                  Documentos Gerais
                </h3>
                <p className="text-slate-500 text-xs mt-1">Estes arquivos serão aplicados a todas as bolsas selecionadas.</p>
              </div>
              
              <div className="space-y-3 w-full">
                {(['passport', 'diploma', 'funds_proof'] as const).map(type => (
                  <div key={type}>
                    <label className={`flex items-center gap-4 px-5 py-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                      bulkFiles[type] 
                        ? 'border-indigo-400 bg-indigo-50/50 shadow-sm' 
                        : 'border-slate-100 bg-slate-50/50 hover:border-indigo-200 hover:bg-white'
                    }`}>
                      <div className={`p-2.5 rounded-xl ${bulkFiles[type] ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                        {type === 'passport' ? <Files className="w-4 h-4" /> : type === 'diploma' ? <FileText className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 block mb-0.5 truncate">
                          {type === 'passport' ? 'Passaporte' : type === 'diploma' ? 'Diploma' : 'Comprovante Financeiro'}
                        </span>
                        <span className="text-sm font-bold text-slate-700 block truncate" title={bulkFiles[type]?.name}>
                          {bulkFiles[type] ? bulkFiles[type]?.name : 'Clique para enviar'}
                        </span>
                      </div>

                      {bulkFiles[type] ? (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleFileChange('bulk', type, null);
                          }}
                          className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      ) : (
                        <Upload className="w-5 h-5 text-slate-300" />
                      )}

                      <input 
                        type="file" 
                        className="hidden" 
                        accept="application/pdf,image/*"
                        onChange={(e) => handleFileChange('bulk', type, e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress / Scholarship List */}
          <div className="space-y-4">
            <h3 className="font-bold text-[#05294E] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              Bolsas Selecionadas
            </h3>
            <div className="divide-y border border-slate-100 rounded-2xl overflow-hidden">
              {scholarships.map((s) => (
                <div key={s.id} className="p-5 bg-white hover:bg-slate-50 transition-colors">
                  <div 
                    className="flex items-center justify-between cursor-pointer group"
                    onClick={() => uploadMode === 'individual' && toggleExpand(s.id)}
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                      {uploadMode === 'individual' && (
                        <div className="p-1 rounded-md bg-slate-50 text-slate-400 group-hover:text-indigo-600 transition-colors">
                          {expandedItems[s.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate">{s.title}</div>
                        <div className="text-xs text-slate-500">{s.universities?.name || 'Universidade'}</div>
                      </div>
                    </div>
                    {progress[s.id] && (
                      <div className="flex items-center gap-2">
                        {progress[s.id].status === 'completed' ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Concluído
                          </span>
                        ) : progress[s.id].status === 'error' ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full" title={progress[s.id].error}>
                            <AlertCircle className="w-3 h-3" /> Erro
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" /> 
                            {progress[s.id].status === 'creating' ? 'Criando...' : 'Enviando...'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {progress[s.id] && progress[s.id].status !== 'idle' && (
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          progress[s.id].status === 'error' ? 'bg-red-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${progress[s.id].percentage}%` }}
                      />
                    </div>
                  )}

                  {/* Individual File Inputs */}
                  {uploadMode === 'individual' && !isProcessing && expandedItems[s.id] && (
                    <div className="space-y-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      {(['passport', 'diploma', 'funds_proof'] as const).map(type => (
                        <div key={`${s.id}-${type}`}>
                          <label className={`flex items-center gap-4 px-5 py-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                            individualFiles[s.id]?.[type] 
                              ? 'border-indigo-400 bg-indigo-50/50 shadow-sm' 
                              : 'border-slate-100 bg-slate-50/50 hover:border-indigo-200 hover:bg-white'
                          }`}>
                            <div className={`p-2.5 rounded-xl ${individualFiles[s.id]?.[type] ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                              {type === 'passport' ? <Files className="w-4 h-4" /> : type === 'diploma' ? <FileText className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            </div>
                            
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 block mb-0.5 truncate">
                                {type === 'passport' ? 'Passaporte' : type === 'diploma' ? 'Diploma' : 'Comprovante Financeiro'}
                              </span>
                              <span className="text-sm font-bold text-slate-700 block truncate" title={individualFiles[s.id]?.[type]?.name}>
                                {individualFiles[s.id]?.[type] ? individualFiles[s.id][type]?.name : 'Clique para enviar'}
                              </span>
                            </div>

                            {individualFiles[s.id]?.[type] ? (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleFileChange(s.id, type, null);
                                }}
                                className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            ) : (
                              <Upload className="w-5 h-5 text-slate-300" />
                            )}

                            <input 
                              type="file" 
                              className="hidden" 
                              accept="application/pdf,image/*"
                              onChange={(e) => handleFileChange(s.id, type, e.target.files?.[0] || null)}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between sticky bottom-0 z-10">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || (uploadMode === 'bulk' && !bulkFiles.passport && !bulkFiles.diploma && !bulkFiles.funds_proof)}
            className="px-10 py-3 bg-[#05294E] text-white rounded-xl font-bold hover:bg-[#041f38] transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar e Cadastrar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
