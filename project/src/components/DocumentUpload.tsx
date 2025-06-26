import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface DocumentUploadProps {
  onUploadSuccess: () => void;
}

const DOCUMENT_TYPES = [
  { key: 'passport', label: 'Passport' },
  { key: 'diploma', label: 'High School Diploma' },
  { key: 'funds_proof', label: 'Proof of Funds' },
];

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadSuccess }) => {
  const [files, setFiles] = useState<Record<string, File | null>>({ passport: null, diploma: null, funds_proof: null });
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  // Função para sanitizar nome do arquivo removendo caracteres especiais
  const sanitizeFileName = (fileName: string): string => {
    return fileName
      .normalize('NFD') // Normaliza acentos
      .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Substitui caracteres especiais por underscore
      .replace(/_+/g, '_') // Remove underscores duplos
      .replace(/^_|_$/g, ''); // Remove underscores no início e fim
  };

  const handleFileChange = (type: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [type]: file }));
  };

  const handleUpload = async () => {
    setUploading(true);
    setError(null);
    try {
      if (!user) throw new Error('User not authenticated');
      let uploadedDocs: { name: string; url: string; type: string; uploaded_at: string }[] = [];
      for (const doc of DOCUMENT_TYPES) {
        const file = files[doc.key];
        if (!file) throw new Error(`Missing file for ${doc.label}`);
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
          const [resource, config] = args;
          if (typeof resource === 'string' && resource.includes('/storage/v1/object')) {
            console.log('[DocumentUpload] Requisição de upload:', resource, config);
            if (config && config.headers) {
              console.log('[DocumentUpload] Headers enviados:', config.headers);
            }
          }
          return originalFetch.apply(this, args);
        };
        const sanitizedFileName = sanitizeFileName(file.name);
        const { data: storageData, error: storageError } = await supabase.storage.from('student-documents').upload(`${user.id}/${doc.key}-${Date.now()}-${sanitizedFileName}`, file, { upsert: true });
        window.fetch = originalFetch;
        if (storageError) throw storageError;
        const file_url = storageData?.path ? supabase.storage.from('student-documents').getPublicUrl(storageData.path).data.publicUrl : null;
        if (!file_url) throw new Error('Failed to get file URL');
        const { error: insertError } = await supabase.from('student_documents').insert({
          user_id: user.id,
          type: doc.key,
          file_url,
          status: 'pending',
        });
        if (insertError) throw insertError;
        uploadedDocs.push({ name: file.name, url: file_url, type: doc.key, uploaded_at: new Date().toISOString() });
      }
      // Atualiza o campo documents do user_profiles
      // Busca documentos atuais
      const { data: userProfile, error: userProfileError } = await supabase
        .from('user_profiles')
        .select('documents')
        .eq('user_id', user.id)
        .single();
      if (userProfileError) throw userProfileError;
      const currentDocs = Array.isArray(userProfile.documents) ? userProfile.documents : [];
      const newDocs = [...currentDocs, ...uploadedDocs];
      if (typeof updateUserProfile === 'function') {
        await updateUserProfile({ documents: newDocs });
      } else {
        await supabase
          .from('user_profiles')
          .update({ documents: newDocs })
          .eq('user_id', user.id);
      }
      setUploading(false);
      setAnalyzing(true);
      setTimeout(() => {
        setAnalyzing(false);
        onUploadSuccess();
        navigate('/student/dashboard/application-fee');
      }, 40000);
    } catch (e: any) {
      setUploading(false);
      setError(e.message || 'Upload failed');
    }
  };

  const allFilesSelected = DOCUMENT_TYPES.every((doc) => files[doc.key]);

  return (
    <div className="relative">
      {/* Modal principal */}
      <div className="p-6 max-w-md mx-auto bg-white rounded-3xl shadow-2xl border border-slate-100 space-y-6 animate-fade-in">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Upload Required Documents</h2>
          <p className="text-slate-600 mb-2 text-sm">
            Please upload the following documents to proceed:<br />
            <span className="font-bold text-slate-800">Passport</span>, <span className="font-bold text-slate-800">High School Diploma</span>, and <span className="font-bold text-slate-800">Proof of Funds</span>.<br />
            <span className="text-xs text-slate-400">Each field below accepts only one file. All files must be clear and legible.</span>
          </p>
        </div>
        <div className="space-y-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
          {DOCUMENT_TYPES.map((doc) => (
            <div key={doc.key} className="flex flex-col gap-1">
              <label className="font-semibold text-slate-800 mb-1 text-sm">{doc.label}</label>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => handleFileChange(doc.key, e.target.files?.[0] || null)}
                disabled={uploading || analyzing}
                className="border border-slate-200 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition text-sm"
              />
              {files[doc.key] && <span className="text-xs text-slate-500 mt-1 truncate max-w-full">{files[doc.key]?.name}</span>}
            </div>
          ))}
        </div>
        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        <button
          onClick={handleUpload}
          disabled={uploading || !allFilesSelected || analyzing}
          className="w-full py-2 rounded-2xl font-bold text-base bg-green-500 hover:bg-green-600 text-white shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-5 w-5 border-4 border-green-200 border-t-green-600 rounded-full inline-block"></span>
              Uploading...
            </span>
          ) : (
            'Upload and Start Analysis'
          )}
        </button>
      </div>
      {/* Overlay e animação de análise */}
      {analyzing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-40 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center border border-slate-100 max-w-xs">
            <div className="relative mb-4">
              <span className="block animate-spin-slow h-16 w-16 border-8 border-blue-100 border-t-blue-600 rounded-full"></span>
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-700 text-xl font-extrabold animate-pulse">AI</span>
            </div>
            <div className="text-base font-bold text-slate-800 mb-1 animate-pulse">Analyzing your documents...</div>
            <div className="text-slate-500 text-center text-xs">This may take up to 40 seconds.<br />Please do not close this window.</div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin-slow { 100% { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 2.5s linear infinite; }
      `}</style>
    </div>
  );
};

export default DocumentUpload; 