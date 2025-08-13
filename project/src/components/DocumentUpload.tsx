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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { user, updateUserProfile, userProfile } = useAuth();
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
    // Limpa o erro do campo ao selecionar um novo arquivo
    setFieldErrors(prev => ({ ...prev, [type]: '' }));
  };

  const handleUpload = async () => {
    setUploading(true);
    setError(null);
    try {
      if (!user) throw new Error('User not authenticated');
      const uploadedDocs: { name: string; url: string; type: string; uploaded_at: string }[] = [];
      const docUrls: Record<string, string> = {};
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
        const { data: storageData, error: storageError } = await supabase.storage
          .from('student-documents')
          .upload(`${user.id}/${doc.key}-${Date.now()}-${sanitizedFileName}`, file, { upsert: true });
        window.fetch = originalFetch;
        if (storageError) throw storageError;
        const file_url = storageData?.path ? supabase.storage.from('student-documents').getPublicUrl(storageData.path).data.publicUrl : null;
        if (!file_url) throw new Error('Failed to get file URL');
        docUrls[doc.key] = file_url;
        const { error: insertError } = await supabase.from('student_documents').insert({
          user_id: user.id,
          type: doc.key,
          file_url,
          status: 'pending',
        });
        if (insertError) throw insertError;
        uploadedDocs.push({ name: file.name, url: file_url, type: doc.key, uploaded_at: new Date().toISOString() });
      }

      // Enviar para o webhook de análise (agora com os 3 documentos)
      setUploading(false);
      setAnalyzing(true);
      const webhookBody = {
        user_id: user.id,
        student_name: userProfile?.full_name || (user as any)?.user_metadata?.full_name || (user as any)?.user_metadata?.name || user.email || '',
        passport_url: docUrls['passport'],
        diploma_url: docUrls['diploma'],
        funds_proof_url: docUrls['funds_proof'],
      };
      const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1';
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const webhookResponse = await fetch(`${SUPABASE_FUNCTIONS_URL}/analyze-student-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(webhookBody),
      });
      const webhookResult = await webhookResponse.json();
      // Adaptação para o novo formato de resposta do n8n
      let n8nData = null;
      if (webhookResult.n8nResponse) {
        try {
          n8nData = JSON.parse(webhookResult.n8nResponse);
        } catch (e) {
          n8nData = webhookResult.n8nResponse;
        }
      }
      // Se não vier via n8nResponse, tente usar o próprio webhookResult
      if (!n8nData && webhookResult.response_passaport !== undefined) {
        n8nData = webhookResult;
      }
      if (n8nData) {
        // Normalize boolean and error-string responses
        const respPassport = n8nData.response_passaport;
        const respFunds = n8nData.response_funds;
        const respDegree = n8nData.response_degree;

        const passportOk = respPassport === true;
        const fundsOk = respFunds === true;
        const degreeOk = respDegree === true;

        const passportErr = typeof respPassport === 'string' ? respPassport : (passportOk ? '' : (n8nData.details_passport || 'Invalid document.'));
        const fundsErr = typeof respFunds === 'string' ? respFunds : (fundsOk ? '' : (n8nData.details_funds || 'Invalid document.'));
        const degreeErr = typeof respDegree === 'string' ? respDegree : (degreeOk ? '' : (n8nData.details_degree || 'Invalid document.'));

        const allValid = passportOk && fundsOk && degreeOk;
        if (allValid) {
          // Agora mesmo com sucesso automatizado, enviamos para revisão manual da universidade
          await supabase
            .from('user_profiles')
            .update({
              documents: uploadedDocs,
              documents_uploaded: true,
              documents_status: 'under_review',
            })
            .eq('user_id', user.id);

          // Garantir applications para TODAS as bolsas selecionadas e anexar documentos
          try {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('id, selected_scholarship_id')
              .eq('user_id', user.id)
              .single();
            const scholarshipIds: string[] = [];
            {
              const { data: cartRows } = await supabase
                .from('user_cart')
                .select('scholarship_id')
                .eq('user_id', user.id);
              if (Array.isArray(cartRows)) {
                for (const row of cartRows) {
                  if (row?.scholarship_id && !scholarshipIds.includes(row.scholarship_id)) {
                    scholarshipIds.push(row.scholarship_id);
                  }
                }
              }
            }
            if (scholarshipIds.length === 0 && ((userProfile as any)?.selected_scholarship_id || profile?.selected_scholarship_id)) {
              const sel = (userProfile as any)?.selected_scholarship_id || profile?.selected_scholarship_id;
              if (sel) scholarshipIds.push(sel);
            }

            if (profile?.id) {
              if (scholarshipIds.length > 0) {
                for (const scholarshipId of scholarshipIds) {
                  const { data: existingApp } = await supabase
                    .from('scholarship_applications')
                    .select('id')
                    .eq('student_id', profile.id)
                    .eq('scholarship_id', scholarshipId)
                    .maybeSingle();
                  let applicationId: string | null = existingApp?.id || null;
                  if (!applicationId) {
                    const { data: newApp } = await supabase
                      .from('scholarship_applications')
                      .insert({ student_id: profile.id, scholarship_id: scholarshipId, status: 'pending' })
                      .select('id')
                      .single();
                    applicationId = newApp?.id || null;
                  }
                  if (applicationId) {
                    const finalDocs = [
                      { type: 'passport', url: docUrls['passport'] },
                      { type: 'diploma', url: docUrls['diploma'] },
                      { type: 'funds_proof', url: docUrls['funds_proof'] },
                    ].filter(d => (d as any).url);
                    await supabase
                      .from('scholarship_applications')
                      .update({ documents: (finalDocs as any).map((d: any) => ({ ...d, uploaded_at: new Date().toISOString(), status: 'under_review' })) })
                      .eq('id', applicationId);
                  }
                }
              } else {
                const { data: latestApp } = await supabase
                  .from('scholarship_applications')
                  .select('id')
                  .eq('student_id', profile.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                const applicationId = latestApp?.id || null;
                if (applicationId) {
                  const finalDocs = [
                    { type: 'passport', url: docUrls['passport'] },
                    { type: 'diploma', url: docUrls['diploma'] },
                    { type: 'funds_proof', url: docUrls['funds_proof'] },
                  ].filter(d => (d as any).url);
                  await supabase
                    .from('scholarship_applications')
                    .update({ documents: (finalDocs as any).map((d: any) => ({ ...d, uploaded_at: new Date().toISOString(), status: 'under_review' })) })
                    .eq('id', applicationId);
                }
              }
            }

            // Limpar carrinho do usuário
            await supabase
              .from('user_cart')
              .delete()
              .eq('user_id', user.id);

            // Notificar universidade
            const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1';
            const { data: { session } } = await supabase.auth.getSession();
            const notifyPayload = { user_id: user.id, tipos_documentos: ['manual_review'], selected_scholarship_id: placeholderScholarship };
            await fetch(`${SUPABASE_FUNCTIONS_URL}/notify-university-document-upload`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
              body: JSON.stringify(notifyPayload),
            });
          } catch {}

          setAnalyzing(false);
          setFieldErrors({});
          onUploadSuccess();
          navigate('/student/dashboard/applications');
        } else {
          // Define erros por campo para exibir abaixo de cada input
          const nextFieldErrors: Record<string, string> = { ...fieldErrors };
          if (!passportOk && (passportErr || respPassport !== undefined)) {
            nextFieldErrors['passport'] = passportErr || 'Invalid document.';
          }
          if (!fundsOk && (fundsErr || respFunds !== undefined)) {
            nextFieldErrors['funds_proof'] = fundsErr || 'Invalid document.';
          }
          if (!degreeOk && (degreeErr || respDegree !== undefined)) {
            nextFieldErrors['diploma'] = degreeErr || 'Invalid document.';
          }
          setAnalyzing(false);
          setError(null);
          setFieldErrors(nextFieldErrors);
          // Persist context for manual review step
          try {
            window.localStorage.setItem('documentAnalysisErrors', JSON.stringify(nextFieldErrors));
            window.localStorage.setItem('documentUploadedDocs', JSON.stringify(uploadedDocs));
          } catch {}
          // Atualiza estado do perfil e garante applications com anexos para a universidade (todas do carrinho)
          try {
            await supabase
              .from('user_profiles')
              .update({
                documents: uploadedDocs,
                documents_uploaded: true,
                documents_status: 'under_review',
              })
              .eq('user_id', user.id);

            // Garantir applications e anexar documentos disponíveis
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('id, selected_scholarship_id')
              .eq('user_id', user.id)
              .single();
            const scholarshipIds: string[] = [];
            {
              const { data: cartRows } = await supabase
                .from('user_cart')
                .select('scholarship_id')
                .eq('user_id', user.id);
              if (Array.isArray(cartRows)) {
                for (const row of cartRows) {
                  if (row?.scholarship_id && !scholarshipIds.includes(row.scholarship_id)) {
                    scholarshipIds.push(row.scholarship_id);
                  }
                }
              }
            }
            if (scholarshipIds.length === 0 && ((userProfile as any)?.selected_scholarship_id || profile?.selected_scholarship_id)) {
              const sel = (userProfile as any)?.selected_scholarship_id || profile?.selected_scholarship_id;
              if (sel) scholarshipIds.push(sel);
            }

            if (profile?.id) {
              if (scholarshipIds.length > 0) {
                for (const scholarshipId of scholarshipIds) {
                  const { data: existingApp } = await supabase
                    .from('scholarship_applications')
                    .select('id')
                    .eq('student_id', profile.id)
                    .eq('scholarship_id', scholarshipId)
                    .maybeSingle();
                  let applicationId: string | null = existingApp?.id || null;
                  if (!applicationId) {
                    const { data: newApp } = await supabase
                      .from('scholarship_applications')
                      .insert({ student_id: profile.id, scholarship_id: scholarshipId, status: 'pending' })
                      .select('id')
                      .single();
                    applicationId = newApp?.id || null;
                  }
                  if (applicationId) {
                    const finalDocs = [
                      docUrls['passport'] ? { type: 'passport', url: docUrls['passport'] } : null,
                      docUrls['diploma'] ? { type: 'diploma', url: docUrls['diploma'] } : null,
                      docUrls['funds_proof'] ? { type: 'funds_proof', url: docUrls['funds_proof'] } : null,
                    ].filter(Boolean).map((d: any) => ({ ...d, uploaded_at: new Date().toISOString(), status: 'under_review' }));
                    if (finalDocs.length > 0) {
                      await supabase
                        .from('scholarship_applications')
                        .update({ documents: finalDocs })
                        .eq('id', applicationId);
                    }
                  }
                }
              } else {
                const { data: latestApp } = await supabase
                  .from('scholarship_applications')
                  .select('id')
                  .eq('student_id', profile.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                const applicationId = latestApp?.id || null;
                if (applicationId) {
                  const finalDocs = [
                    docUrls['passport'] ? { type: 'passport', url: docUrls['passport'] } : null,
                    docUrls['diploma'] ? { type: 'diploma', url: docUrls['diploma'] } : null,
                    docUrls['funds_proof'] ? { type: 'funds_proof', url: docUrls['funds_proof'] } : null,
                  ].filter(Boolean).map((d: any) => ({ ...d, uploaded_at: new Date().toISOString(), status: 'under_review' }));
                  if (finalDocs.length > 0) {
                    await supabase
                      .from('scholarship_applications')
                      .update({ documents: finalDocs })
                      .eq('id', applicationId);
                  }
                }
              }
            }

            // Limpar carrinho do usuário
            await supabase
              .from('user_cart')
              .delete()
              .eq('user_id', user.id);

            // Notificar universidade
            const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1';
            const { data: { session } } = await supabase.auth.getSession();
            const notifyPayload = { user_id: user.id, tipos_documentos: ['manual_review'], selected_scholarship_id: placeholderScholarship };
            await fetch(`${SUPABASE_FUNCTIONS_URL}/notify-university-document-upload`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
              body: JSON.stringify(notifyPayload),
            });
          } catch {}

          // Limpa apenas os arquivos inválidos para reenvio
          setFiles(prev => {
            const updated = { ...prev };
            if (!passportOk && (passportErr || respPassport !== undefined)) updated['passport'] = null;
            if (!fundsOk && (fundsErr || respFunds !== undefined)) updated['funds_proof'] = null;
            if (!degreeOk && (degreeErr || respDegree !== undefined)) updated['diploma'] = null;
            return updated;
          });
        }
      } else {
        setAnalyzing(false);
        setError('Unexpected response from document analysis. Please try again.');
      }
    } catch (e: any) {
      setUploading(false);
      setAnalyzing(false);
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
                placeholder={`Select ${doc.label} file`}
                className="border border-slate-200 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition text-sm"
              />
              {files[doc.key] && <span className="text-xs text-slate-500 mt-1 truncate max-w-full">{files[doc.key]?.name}</span>}
              {fieldErrors[doc.key] && (
                <span className="text-xs text-red-500 mt-1">{fieldErrors[doc.key]}</span>
              )}
            </div>
          ))}
        </div>
        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        {Object.values(fieldErrors).some(Boolean) && (
          <button
            onClick={() => navigate('/student/dashboard/manual-review')}
            disabled={analyzing}
            className="w-full py-2 rounded-2xl font-bold text-base bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            Continue to Manual Review
          </button>
        )}
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