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
  ArrowRight,
  Info,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { StepProps } from '../types';

import { PencilLoader } from '../../../components/PencilLoader';

const DOCUMENT_TYPES = [
  { key: 'passport', label: 'Passport', description: 'Upload a clear photo or scan of your passport' },
  { key: 'diploma', label: 'High School Diploma', description: 'Upload your high school diploma or equivalent' },
  { key: 'funds_proof', label: 'Proof of Funds', description: 'Upload bank statements or financial documents' },
];

export const DocumentsUploadStep: React.FC<StepProps> = ({ onNext }) => {
  const { t } = useTranslation();
  const { user, userProfile, refetchUserProfile } = useAuth();
// const { clearCart, fetchCart } = useCartStore(); // Removed unused variable
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

  // Obter process type do localStorage
  const processType = localStorage.getItem('studentProcessType') || 'initial';

  // Verificar se já passou pela review (tem documentos enviados ou aprovados)
  useEffect(() => {
    const checkIfLocked = () => {
      if (!userProfile) return;
      const documentsUploaded = userProfile.documents_uploaded || false;
      const documentsApproved = userProfile.documents_status === 'approved';
      setIsLocked(documentsUploaded || documentsApproved);
    };
    checkIfLocked();
  }, [userProfile?.documents_uploaded, userProfile?.documents_status]);

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
        body: JSON.stringify({ filePaths, studentId: user?.id })
      });

      if (!mergeResponse.ok) throw new Error('Failed to merge documents');
      const { mergedFilePath } = await mergeResponse.json();
      return mergedFilePath;
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

      // Analysis via Supabase Function
      setAnalyzing(true);
      const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1';
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/analyze-student-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ studentId: user.id, documentPaths: uploadedPaths })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.type === 'MANUAL_REVIEW_REQUIRED') {
          setShowManualReviewMessage(true);
        } else {
          throw new Error(errorData.error || 'Failed to analyze documents');
        }
      } else {
        await refetchUserProfile();
        onNext();
      }
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
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 border border-gray-100 shadow-2xl text-center">
          <div className="mb-6 w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle className="w-12 h-12 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-3 uppercase tracking-tight">Step Completed</h2>
          <p className="text-base sm:text-lg text-gray-500 mb-8 font-medium">Your documents have been uploaded and are being reviewed.</p>
          <button onClick={onNext} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center space-x-2 mx-auto">
            <span>Continue</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
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
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-white rounded-[4rem] p-12 max-w-sm w-full shadow-2xl text-center space-y-10 border border-white/20">
            <PencilLoader title={t('studentDashboard.documentsAndScholarshipChoice.analyzingOverlayTitle')} description={t('studentDashboard.documentsAndScholarshipChoice.analyzingOverlayDescription')} />
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

