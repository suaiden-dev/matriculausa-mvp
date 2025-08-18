import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useCartStore } from '../../stores/applicationStore';

interface UploadedDoc { name: string; url: string; type: string; uploaded_at: string }

const ManualReview: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [prevDocs, setPrevDocs] = useState<UploadedDoc[]>([]);
  const [appDocs, setAppDocs] = useState<any[]>([]);
  const [files, setFiles] = useState<Record<string, File | null>>({ passport: null, diploma: null, funds_proof: null });
  const [usePrev, setUsePrev] = useState<Record<string, boolean>>({ passport: true, diploma: true, funds_proof: true });
  const [confirmAllTrue, setConfirmAllTrue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearCart = useCartStore(state => state.clearCart);

  useEffect(() => {
    try {
      const e = JSON.parse(localStorage.getItem('documentAnalysisErrors') || '{}');
      const d = JSON.parse(localStorage.getItem('documentUploadedDocs') || '[]');
      setFieldErrors(e || {});
      setPrevDocs(Array.isArray(d) ? d : []);
      // If a field had error, default to not using previous file
      setUsePrev(() => ({
        passport: e?.passport ? false : !!(Array.isArray(d) && d.find((x: any) => x.type === 'passport')),
        diploma: e?.diploma ? false : !!(Array.isArray(d) && d.find((x: any) => x.type === 'diploma')),
        funds_proof: e?.funds_proof ? false : !!(Array.isArray(d) && d.find((x: any) => x.type === 'funds_proof')),
      }));
    } catch {}
  }, []);

  // Busca a aplicação mais recente e usa seus documentos/status para pré-preencher reenvio
  useEffect(() => {
    const fetchLatestApp = async () => {
      if (!userProfile?.id) return;
      const { data } = await supabase
        .from('scholarship_applications')
        .select('id, documents')
        .eq('student_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const docs = (data as any)?.documents || [];
      if (Array.isArray(docs) && docs.length) {
        setAppDocs(docs);
        // Mescla com prevDocs do localStorage, priorizando application
        const toUploaded: UploadedDoc[] = ['passport','diploma','funds_proof']
          .map((t) => {
            const fromApp = docs.find((d: any) => d.type === t);
            const url = fromApp?.url || (prevDocs.find(p => p.type === t)?.url);
            if (!url) return null;
            return { type: t, url, name: url.split('/').pop() || '', uploaded_at: fromApp?.uploaded_at || new Date().toISOString() };
          })
          .filter(Boolean) as UploadedDoc[];
        if (toUploaded.length) setPrevDocs(toUploaded);
        // Se algum estiver com changes_requested, forçar reenvio desse tipo
        setUsePrev(prev => ({
          passport: docs.find((d: any) => d.type==='passport')?.status === 'changes_requested' ? false : (prev.passport ?? true),
          diploma: docs.find((d: any) => d.type==='diploma')?.status === 'changes_requested' ? false : (prev.diploma ?? true),
          funds_proof: docs.find((d: any) => d.type==='funds_proof')?.status === 'changes_requested' ? false : (prev.funds_proof ?? true),
        }));
      }
    };
    fetchLatestApp();
  }, [userProfile?.id]);

  const statusOf = (type: string): string | null => {
    const d = appDocs.find((x: any) => x.type === type);
    return d?.status || null;
  };

  const attachFile = (key: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [key]: file }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (!user) throw new Error('User not authenticated');

      // Upload only the files the user chose to replace
      const newFileUrls: Record<string, string> = {};
      for (const [key, file] of Object.entries(files)) {
        if (usePrev[key]) continue;
        if (!file) continue; // nothing selected
        const { data, error: upErr } = await supabase.storage
          .from('student-documents')
          .upload(`${user.id}/manual-${key}-${Date.now()}-${file.name}`, file, { upsert: true });
        if (upErr) throw upErr;
        const fileUrl = data?.path ? supabase.storage.from('student-documents').getPublicUrl(data.path).data.publicUrl : null;
        if (!fileUrl) throw new Error('Failed to get file URL');
        await supabase.from('student_documents').insert({ user_id: user.id, type: key, file_url: fileUrl, status: 'under_review' });
        newFileUrls[key] = fileUrl;
      }

      if (confirmAllTrue) {
        // Mark documents as pending manual review
        await supabase
          .from('user_profiles')
          .update({ documents_status: 'under_review' })
          .eq('user_id', user.id);

        // Garantir que apareça na aba da universidade criando/atualizando aplicações para TODAS as bolsas selecionadas
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
          if (scholarshipIds.length === 0 && (userProfile?.selected_scholarship_id || profile?.selected_scholarship_id)) {
            const sel = userProfile?.selected_scholarship_id || profile?.selected_scholarship_id;
            if (sel) scholarshipIds.push(sel as string);
          }

          if (profile?.id) {
            if (scholarshipIds.length > 0) {
              for (const scholarshipId of scholarshipIds) {
                const { data: existingApp } = await supabase
                  .from('scholarship_applications')
                  .select('id, documents')
                  .eq('student_id', profile.id)
                  .eq('scholarship_id', scholarshipId)
                  .maybeSingle();
                let applicationId: string | null = existingApp?.id || null;
                let currentDocs: any[] = (existingApp as any)?.documents || [];
                if (!applicationId) {
                  const { data: newApp } = await supabase
                    .from('scholarship_applications')
                    .insert({
                      student_id: profile.id,
                      scholarship_id: scholarshipId,
                      status: 'pending',
                    })
                    .select('id, documents')
                    .single();
                  applicationId = newApp?.id || null;
                  currentDocs = (newApp as any)?.documents || [];
                }
                if (applicationId) {
                  const finalDocs = ['passport','diploma','funds_proof']
                    .map((k) => {
                      const fromPrev = docByType(k)?.url || (appDocs.find((d:any)=>d.type===k)?.url);
                      const fromNew = newFileUrls[k];
                      const url = usePrev[k] ? fromPrev : (fromNew || fromPrev);
                      if (!url) return null;
                      const existing = currentDocs.find((d:any)=>d.type===k) || appDocs.find((d:any)=>d.type===k);
                      const status = usePrev[k] ? (existing?.status || 'under_review') : 'under_review';
                      return { type: k, url, uploaded_at: new Date().toISOString(), status };
                    })
                    .filter(Boolean);
                  if (finalDocs.length > 0) {
                    await supabase
                      .from('scholarship_applications')
                      .update({ documents: finalDocs })
                      .eq('id', applicationId);
                  }
                }
              }
            } else {
              // Fallback: se não houver carrinho/seleção, usa a aplicação mais recente
              const { data: latestApp } = await supabase
                .from('scholarship_applications')
                .select('id, documents')
                .eq('student_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              const applicationId = (latestApp as any)?.id || null;
              const currentDocs: any[] = (latestApp as any)?.documents || [];
              if (applicationId) {
                const finalDocs = ['passport','diploma','funds_proof']
                  .map((k) => {
                    const fromPrev = docByType(k)?.url || (appDocs.find((d:any)=>d.type===k)?.url);
                    const fromNew = newFileUrls[k];
                    const url = usePrev[k] ? fromPrev : (fromNew || fromPrev);
                    if (!url) return null;
                    const existing = currentDocs.find((d:any)=>d.type===k) || appDocs.find((d:any)=>d.type===k);
                    const status = usePrev[k] ? (existing?.status || 'under_review') : 'under_review';
                    return { type: k, url, uploaded_at: new Date().toISOString(), status };
                  })
                  .filter(Boolean);
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
          try {
            const { error: cartError } = await supabase
              .from('user_cart')
              .delete()
              .eq('user_id', user.id);
            
            if (cartError) {
              console.error('Erro ao limpar carrinho:', cartError);
            } else {
              console.log('Carrinho limpo com sucesso para o usuário:', user.id);
              // Atualizar o estado local do cart store
              clearCart(user.id);
            }
          } catch (cartClearError) {
            console.error('Erro ao limpar carrinho:', cartClearError);
          }
        } catch {}

        // Dispara notificação para universidade (Edge Function)
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://fitpynguasqqutuhzifx.supabase.co/functions/v1';
          const tipos = Object.keys(files).filter((k) => !usePrev[k] && files[k]).map((k) => k);
          const payload = {
            user_id: user.id,
            tipos_documentos: tipos.length ? tipos : ['manual_review'],
            selected_scholarship_id: userProfile?.selected_scholarship_id || null,
          } as any;
          const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          } as Record<string, string>;

          // Tenta a função dedicada
          const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/notify-university-document-upload`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });

          // Fallback: se não existir no ambiente, usa o encaminhador genérico
          if (res.status === 404) {
            await fetch(`${SUPABASE_FUNCTIONS_URL}/forward-notification-to-n8n`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                tipo_notf: 'Revisão manual iniciada',
                user_id: user.id,
                tipos_documentos: payload.tipos_documentos,
              }),
            });
          }
        } catch {}
      }

      navigate('/student/dashboard/applications');
    } catch (e: any) {
      setError(e.message || 'Failed to submit manual review');
    } finally {
      setSubmitting(false);
    }
  };

  const docByType = (type: string) => prevDocs.find(d => d.type === type);
  const entries = [
    { key: 'passport', label: 'Passport' },
    { key: 'diploma', label: 'High School Diploma' },
    { key: 'funds_proof', label: 'Proof of Funds' }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Manual Document Review</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Some of your documents need manual verification by the university. You can reattach the problematic files below or confirm that all information is accurate to proceed with manual review.
          </p>
        </div>

        {/* Document Review Section */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 mb-8">
          <div className="text-center mb-8">
            
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Review Your Documents</h2>
            <p className="text-slate-600">
              Please review each document below and make any necessary corrections
            </p>
          </div>

          <div className="space-y-6">
            {entries.map(e => (
              <div key={e.key} className="p-6 rounded-2xl border-2 border-slate-200 bg-slate-50 hover:border-blue-300 transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      statusOf(e.key) === 'changes_requested' ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      <svg className={`w-5 h-5 ${
                        statusOf(e.key) === 'changes_requested' ? 'text-red-600' : 'text-blue-600'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{e.label}</h3>
                      {statusOf(e.key) === 'changes_requested' && (
                        <div className="text-sm text-red-600 font-medium">
                          University requested changes for this document
                        </div>
                      )}
                    </div>
                  </div>
                  {docByType(e.key) && (
                    <a 
                      className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-all duration-200" 
                      href={docByType(e.key)!.url} 
                      target="_blank" 
                      rel="noreferrer"
                    >
                      View Current File
                    </a>
                  )}
                </div>
                
                <div className="space-y-3">
                  {usePrev[e.key] && docByType(e.key) ? (
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-700 font-medium text-sm">
                        Using current file: {docByType(e.key)!.name || docByType(e.key)!.url.split('/').pop()}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Upload replacement file:
                      </label>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={(ev) => attachFile(e.key, ev.target.files?.[0] || null)}
                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer cursor-pointer border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                  
                  {docByType(e.key) && (
                    <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-800 transition-colors">
                      <input
                        type="checkbox"
                        checked={usePrev[e.key]}
                        onChange={(ev) => setUsePrev(prev => ({ ...prev, [e.key]: ev.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      Use current file (uncheck to upload a new one)
                    </label>
                  )}
                  
                  {fieldErrors[e.key] && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-red-600">{fieldErrors[e.key]}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Confirmation Section */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 mb-8">
          <div className="flex items-start gap-4">
            <input 
              id="confirmTruth" 
              type="checkbox" 
              className="h-5 w-5 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
              checked={confirmAllTrue} 
              onChange={e => setConfirmAllTrue(e.target.checked)} 
            />
            <label htmlFor="confirmTruth" className="text-slate-700 text-sm  sm:text-base leading-relaxed">
              <span className="font-semibold ">Declaration of Accuracy:</span> I confirm that all the information and documents provided are accurate and true to the best of my knowledge. I understand that providing false information may result in the rejection of my application.
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-8">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-600">{error}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/student/dashboard')}
            className="px-8 py-3 rounded-2xl border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 disabled:opacity-50"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || (!confirmAllTrue && !Object.entries(files).some(([k, f]) => !usePrev[k] && f))}
            className="px-8 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Submitting...
              </span>
            ) : (
              'Submit for Manual Review'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualReview;

