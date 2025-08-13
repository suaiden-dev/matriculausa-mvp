import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import ImagePreviewModal from './ImagePreviewModal';
import { useUniversity } from '../context/UniversityContext';
import { useAuth } from '../hooks/useAuth';

interface DocumentRequest {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  attachment_url?: string;
  status: string;
  created_at: string;
}

interface DocumentRequestUpload {
  id: string;
  document_request_id: string;
  file_url: string;
  uploaded_at: string;
  status: string;
  review_notes?: string;
}

interface DocumentRequestsCardProps {
  applicationId: string;
  isSchool: boolean;
  currentUserId: string;
  studentType: 'initial' | 'transfer' | 'change_of_status';
  studentUserId?: string; // Novo: id do usuário do aluno
}

const DocumentRequestsCard: React.FC<DocumentRequestsCardProps> = ({ applicationId, isSchool, currentUserId, studentType, studentUserId }) => {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [uploads, setUploads] = useState<{ [requestId: string]: DocumentRequestUpload[] }>({});
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newRequest, setNewRequest] = useState({ title: '', description: '', due_date: '', attachment: null as File | null });
  const [error, setError] = useState<string | null>(null);
  // Novo estado para upload do aluno
  const [selectedFiles, setSelectedFiles] = useState<{ [requestId: string]: File | null }>({});
  const [uploading, setUploading] = useState<{ [requestId: string]: boolean }>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string | null }>({});
  const [loadingUrls, setLoadingUrls] = useState<{ [key: string]: boolean }>({});
  // Novo: signedUrl para o attachment enviado pela faculdade
  const [attachmentSignedUrls, setAttachmentSignedUrls] = useState<{ [requestId: string]: string | null }>({});
  const [loadingAttachmentUrls, setLoadingAttachmentUrls] = useState<{ [requestId: string]: boolean }>({});
  const [creating, setCreating] = useState(false);
  // Novo: Estado para acceptance letter
  const [acceptanceLetter, setAcceptanceLetter] = useState<any>(null);
  const [acceptanceModalOpen, setAcceptanceModalOpen] = useState(false);
  const [acceptanceLetterSignedUrls, setAcceptanceLetterSignedUrls] = useState<{ [key: string]: string | null }>({});
  const [loadingAcceptanceUrls, setLoadingAcceptanceUrls] = useState<{ [key: string]: boolean }>({});
  const [acceptanceLoading, setAcceptanceLoading] = useState(false);
  const universityContext = isSchool ? useUniversity() : null;
  const refreshData = universityContext ? universityContext.refreshData : undefined;
  // 1. Adicionar estado para logo da universidade
  const [universityLogoUrl, setUniversityLogoUrl] = useState<string | null>(null);
  const [universityId, setUniversityId] = useState<string | undefined>(undefined); // novo estado global
  const { user, supabaseUser } = useAuth();
  // Modal para justificar rejeição de um upload específico
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [pendingRejectUploadId, setPendingRejectUploadId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  useEffect(() => {
    // Buscar dados da carta de aceite da aplicação
    const fetchAcceptanceLetter = async () => {
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select('id, acceptance_letter_url, acceptance_letter_status, acceptance_letter_sent_at')
        .eq('id', applicationId)
        .maybeSingle();
      if (!error && data) setAcceptanceLetter(data);
    };
    fetchAcceptanceLetter();
  }, [applicationId]);

  useEffect(() => {
    fetchRequests();
  }, [applicationId]);

  useEffect(() => {
    // Logar uploads carregados para debug
    if (Object.keys(uploads).length > 0) {
      // console.log('[DEBUG] Uploads carregados:', uploads);
    }
  }, [uploads]);

  // LOGS DE DEBUG PARA BOTÕES DE APROVAÇÃO/REJEIÇÃO
  useEffect(() => {
    // console.log('[DocumentRequestsCard] MONTADO', {
    //   isSchool,
    //   currentUserId,
    //   studentType,
    //   studentUserId,
    //   applicationId,
    //   uploads,
    // });
  }, [isSchool, currentUserId, studentType, studentUserId, applicationId, uploads]);

  // 2. Buscar logo da universidade junto com o universityId
  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      // Buscar a aplicação para obter o university_id e logo
      const { data: appData, error: appError } = await supabase
        .from('scholarship_applications')
        .select('id, scholarship_id, scholarships(university_id, universities(logo_url, name)), student_process_type, student_id')
        .eq('id', applicationId)
        .maybeSingle();
      if (appError || !appData) throw new Error('Failed to fetch application data');
      let universityId: any = undefined;
      let logoUrl: string | null = null;
      if (Array.isArray(appData.scholarships) && appData.scholarships.length > 0) {
        universityId = appData.scholarships[0]?.university_id;
        logoUrl = appData.scholarships[0]?.universities?.logo_url || null;
      } else if (appData.scholarships && typeof appData.scholarships === 'object') {
        universityId = appData.scholarships.university_id;
        logoUrl = appData.scholarships.universities?.logo_url || null;
      }
      setUniversityId(universityId); // garantir que o estado global é atualizado
      setUniversityLogoUrl(logoUrl);
      // console.log('[DEBUG] appData:', appData);
      const studentId = appData.student_id;
      // console.log('[DocumentRequestsCard] universityId:', universityId);
      // Buscar requests normais
      const { data: normalRequests, error: normalError } = await supabase
        .from('document_requests')
        .select('*')
        .eq('scholarship_application_id', applicationId)
        .order('created_at', { ascending: false });
      if (normalError) throw normalError;
      // console.log('[DocumentRequestsCard] normalRequests:', normalRequests?.length, normalRequests);
      // Buscar requests globais
      let globalRequests: any[] = [];
      if (universityId) {
        const { data: globalData, error: globalError } = await supabase
          .from('document_requests')
          .select('*')
          .eq('is_global', true)
          .eq('university_id', universityId)
          .order('created_at', { ascending: false });
        if (globalError) throw globalError;
        globalRequests = (globalData || []).filter((req: any) => {
          // Ocultar para estudantes quando status estiver fechado
          if (!isSchool && (req.status || '').toLowerCase() === 'closed') return false;
          // Se não houver applicable_student_types ou não for array, mostra para todos
          if (!req.applicable_student_types || !Array.isArray(req.applicable_student_types) || req.applicable_student_types.length === 0) return true;
          // Se o tipo do estudante estiver incluso, mostra
          if (req.applicable_student_types.includes(studentType)) return true;
          // Se o array inclui 'all', mostra para todos
          if (req.applicable_student_types.includes('all')) return true;
          // Caso contrário, não mostra
          return false;
        });
        // console.log('[DocumentRequestsCard] universityId usado:', universityId);
        // console.log('[DocumentRequestsCard] globalRequests:', globalRequests.length, globalRequests);
      } else {
        // console.log('[DocumentRequestsCard] universityId not found, skipping global requests');
      }
      // Substituir a lógica de merge e remoção de duplicados:
      // const allRequests = [...(normalRequests || []), ...globalRequests];
      // const uniqueRequests = Array.from(new Map(allRequests.map(r => [r.id, r])).values());
      // Por:
      const allRequests = [...(normalRequests || []), ...globalRequests];
      const uniqueRequests = allRequests.filter((req, idx, arr) => arr.findIndex(r => r.id === req.id) === idx);
      // console.log('[DocumentRequestsCard] uniqueRequests:', uniqueRequests.length, uniqueRequests);
      setRequests(uniqueRequests);
      setLoading(false);
      // Buscar uploads para cada request
      if (uniqueRequests.length > 0) {
        const ids = uniqueRequests.map((r: any) => r.id);
        // console.log('[DEBUG] studentId:', studentId, 'currentUserId:', currentUserId, 'isSchool:', isSchool);
        // Buscar todos os uploads sem filtro para debug
        const { data: allUploadsData } = await supabase
          .from('document_request_uploads')
          .select('*')
          .in('document_request_id', ids);
        if (allUploadsData) {
          // allUploadsData.forEach((upload: any) => {
          //   console.log('[DEBUG UPLOAD]', {
          //     id: upload.id,
          //     document_request_id: upload.document_request_id,
          //     uploaded_by: upload.uploaded_by,
          //     file_url: upload.file_url,
          //     status: upload.status,
          //     created_at: upload.created_at,
          //     // adicione outros campos relevantes aqui
          //   });
          // });
        }
        // console.log('[DEBUG] ALL uploadsData (sem filtro):', allUploadsData?.length, allUploadsData);
        let uploadsData;
        if (isSchool) {
          // Escola vê apenas uploads do aluno específico (user_id) e da universidade
          uploadsData = (allUploadsData || []).filter((u: any) => {
            return u.uploaded_by === studentUserId || u.uploaded_by === universityId;
          });
        } else {
          // Aluno vê apenas os uploads feitos por ele
          uploadsData = (allUploadsData || []).filter((u: any) => u.uploaded_by === currentUserId);
        }
        // console.log('[DocumentRequestsCard] uploadsData:', uploadsData?.length, uploadsData);
        const uploadsMap: { [requestId: string]: DocumentRequestUpload[] } = {};
        (uploadsData || []).forEach((u: any) => {
          if (!uploadsMap[u.document_request_id]) uploadsMap[u.document_request_id] = [];
          uploadsMap[u.document_request_id].push(u);
        });
        setUploads(uploadsMap);
      }
    } catch (e: any) {
      setError('Failed to fetch document requests: ' + (e.message || e));
      setRequests([]);
      setLoading(false);
    }
  };

  const handleNewRequest = async () => {
    setCreating(true);
    setError('');
    try {
      let attachment_url = '';
      if (newRequest.attachment) {
        const { data, error } = await supabase.storage.from('document-attachments').upload(`modelos/${Date.now()}_${newRequest.attachment.name}`, newRequest.attachment);
        if (error) {
          setError('Failed to upload attachment: ' + error.message);
          setCreating(false);
          return;
        }
        attachment_url = data?.path;
      }
      // LOGS DETALHADOS PARA DEBUG
      const payload = {
        title: newRequest.title,
        description: newRequest.description,
        due_date: newRequest.due_date || null,
        attachment_url,
        scholarship_application_id: applicationId,
        created_by: currentUserId,
        university_id: universityId,
        is_global: false, // Request individual
      };
      // console.log('[DEBUG] Enviando para Edge Function create-document-request', payload);
      // console.log('Payload enviado para Edge Function:', payload);
      // Antes do fetch:
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        setError('Usuário não autenticado. Faça login novamente.');
        setCreating(false);
        return;
      }
      const response = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/create-document-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      let result = {};
      try {
        result = await response.json();
      } catch (e) {
        // console.log('Erro ao fazer parse do JSON de resposta:', e);
      }
      // console.log('Resposta da Edge Function:', result);
      if (!response.ok || !result.success) {
        setError('Failed to create request: ' + (result.error || 'Unknown error'));
        setCreating(false);
        return;
      }
      setShowNewModal(false);
      setNewRequest({ title: '', description: '', due_date: '', attachment: null });
      fetchRequests();
    } catch (e: any) {
      setError('Unexpected error: ' + (e.message || e));
    } finally {
      setCreating(false);
    }
  };

  // Nova função para upload da acceptance letter pela escola
  const handleAcceptanceLetterUpload = async (file: File) => {
    if (!applicationId || !file) {
      // console.error('[LOG] applicationId ou file ausente', { applicationId, file });
      return;
    }
    
    setAcceptanceLoading(true);
    try {
      // console.log('[LOG] Iniciando upload da acceptance letter', { applicationId, file });
      // Upload do arquivo
      const { data, error } = await supabase.storage.from('document-attachments').upload(`acceptance_letters/${Date.now()}_${file.name}`, file);
      // console.log('[LOG] Resultado do upload:', { data, error });
      if (error) {
        // console.error('[LOG] Erro no upload do arquivo:', error, error?.message, error?.details, error?.hint);
        throw error;
      }
      // Logar dados do update
      const updateObj = {
        acceptance_letter_url: data.path,
        acceptance_letter_status: 'approved',
        acceptance_letter_sent_at: new Date().toISOString(),
        status: 'enrolled'
      };
      // console.log('[LOG] applicationId para update:', applicationId);
      // console.log('[LOG] Objeto enviado no update:', updateObj);
      // Atualizar a aplicação com a URL da carta e mudar status para enrolled
      const { error: updateError, data: updateData } = await supabase
        .from('scholarship_applications')
        .update(updateObj)
        .eq('id', applicationId);
      // console.log('[LOG] Resultado do update:', { updateError, updateData });
      if (updateError) {
        // console.error('[LOG] Erro no update:', updateError, updateError?.message, updateError?.details, updateError?.hint);
        throw updateError;
      }
      // Atualizar o campo i20_control_fee_due_date em user_profiles
      const { data: appData, error: appFetchError } = await supabase
        .from('scholarship_applications')
        .select('student_id')
        .eq('id', applicationId)
        .maybeSingle();
      if (!appFetchError && appData && appData.student_id) {
        const { error: profileUpdateError } = await supabase
          .from('user_profiles')
          .update({ i20_control_fee_due_date: new Date().toISOString() })
          .eq('id', appData.student_id);
        if (profileUpdateError) {
          // console.error('[LOG] Erro ao atualizar i20_control_fee_due_date:', profileUpdateError);
        }
      }
      // Atualizar o estado local
      setAcceptanceLetter(prev => prev ? {
        ...prev,
        acceptance_letter_url: data.path,
        acceptance_letter_status: 'approved',
        acceptance_letter_sent_at: new Date().toISOString(),
        status: 'enrolled'
      } : null);
      // Recarregar os dados locais
      fetchRequests();
      // Recarregar dados globais do contexto (apenas para escola)
      if (isSchool && refreshData) await refreshData();
    } catch (error: any) {
      // console.error('[LOG] Error uploading acceptance letter:', error, error?.message, error?.details, error?.hint);
      setError('Failed to upload acceptance letter: ' + error.message);
    } finally {
      setAcceptanceLoading(false);
    }
  };

  const handleFileSelect = (requestId: string, file: File | null) => {
    setSelectedFiles((prev: typeof selectedFiles) => ({ ...prev, [requestId]: file }));
  };

  const handleSendUpload = async (requestId: string) => {
    const file = selectedFiles[requestId];
    if (!file) return;
    setUploading(prev => ({ ...prev, [requestId]: true }));
    try {
      const { data, error } = await supabase.storage.from('document-attachments').upload(`uploads/${Date.now()}_${file.name}`, file);
      if (error) {
        setError(`Erro ao fazer upload do arquivo: ${error.message}`);
        // console.error('[UPLOAD] Erro detalhado:', error, { file, requestId, user: currentUserId });
        alert(`Erro ao fazer upload: ${error.message}\n${JSON.stringify(error, null, 2)}`);
        setUploading(prev => ({ ...prev, [requestId]: false }));
        return;
      }
      const file_url = data?.path;
      const insertResult = await supabase.from('document_request_uploads').insert({
        document_request_id: requestId,
        uploaded_by: currentUserId,
        file_url,
        status: 'under_review',
      });

      // Notificar universidade via Edge Function
      try {
        // console.log('[NOTIFICAÇÃO] Chamando Edge Function para notificar universidade', {
        //   user_id: currentUserId,
        //   tipos_documentos: [requestId],
        // });
        const notifResult = await supabase.functions.invoke('notify-university-document-upload', {
          body: JSON.stringify({
            user_id: currentUserId,
            tipos_documentos: [requestId], // ou tipo do documento, se disponível
          }),
        });
        // console.log('[NOTIFICAÇÃO] Resultado da chamada da Edge Function:', notifResult);
      } catch (e) {
        // console.error('Erro ao notificar universidade:', e);
      }

      setSelectedFiles((prev: typeof selectedFiles) => ({ ...prev, [requestId]: null }));
      fetchRequests();
    } finally {
      setUploading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const getSignedUrl = async (filePath: string, uploadId: string) => {
    if (loadingUrls[uploadId]) return;
    setLoadingUrls(prev => ({ ...prev, [uploadId]: true }));
    try {
      // console.log('[LOG] Gerando signedUrl para uploadId:', uploadId, 'filePath:', filePath);
      const { data, error } = await supabase.storage.from('document-attachments').createSignedUrl(filePath, 60 * 60);
      // console.log('[LOG] Resultado signedUrl:', { uploadId, filePath, data, error });
      setSignedUrls(prev => ({ ...prev, [uploadId]: error ? null : data.signedUrl }));
      if (error) {
        // console.error('[LOG] Erro ao gerar signedUrl:', error, error?.message);
      }
    } catch (e) {
      // console.error('[LOG] Exception ao gerar signedUrl:', e);
      setSignedUrls(prev => ({ ...prev, [uploadId]: null }));
    } finally {
      setLoadingUrls(prev => ({ ...prev, [uploadId]: false }));
    }
  };

  const getAttachmentSignedUrl = async (filePath: string, requestId: string) => {
    if (loadingAttachmentUrls[requestId]) return;
    setLoadingAttachmentUrls(prev => ({ ...prev, [requestId]: true }));
    try {
      const { data, error } = await supabase.storage.from('document-attachments').createSignedUrl(filePath, 60 * 60);
      setAttachmentSignedUrls(prev => ({ ...prev, [requestId]: error ? null : data.signedUrl }));
      return error ? null : data.signedUrl;
    } catch (e) {
      // console.error('Error getting attachment signed URL:', e);
        setAttachmentSignedUrls(prev => ({ ...prev, [requestId]: null }));
      return null;
    } finally {
      setLoadingAttachmentUrls(prev => ({ ...prev, [requestId]: false }));
    }
  };

  useEffect(() => {
    requests.forEach(req => {
      if (req.attachment_url && !attachmentSignedUrls[req.id] && !loadingAttachmentUrls[req.id]) {
        const filePath = req.attachment_url.startsWith('/') ? req.attachment_url.slice(1) : req.attachment_url;
        getAttachmentSignedUrl(filePath, req.id);
      }
    });
    // eslint-disable-next-line
  }, [requests]);

  // Gerar signedUrl para acceptance_letter_url
  useEffect(() => {
    const fetchSignedUrls = async () => {
      if (acceptanceLetter?.acceptance_letter_url && !acceptanceLetterSignedUrls['acceptance_letter_url']) {
        setLoadingAcceptanceUrls(prev => ({ ...prev, acceptance_letter_url: true }));
        const { data, error } = await supabase.storage.from('document-attachments').createSignedUrl(acceptanceLetter.acceptance_letter_url, 60 * 60);
        setAcceptanceLetterSignedUrls(prev => ({ ...prev, acceptance_letter_url: error ? null : data.signedUrl }));
        setLoadingAcceptanceUrls(prev => ({ ...prev, acceptance_letter_url: false }));
      }
    };
    fetchSignedUrls();
  }, [acceptanceLetter]);

  // Função utilitária para download forçado
  const handleForceDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 2000);
    } catch (e) {
      alert('Failed to download file.');
    }
  };

  useEffect(() => {
    // Gera signedUrl para todos os uploads exibidos
    Object.entries(uploads).forEach(([requestId, uploadsArr]) => {
      uploadsArr.forEach(up => {
        const filePath = up.file_url && up.file_url.startsWith('/') ? up.file_url.slice(1) : up.file_url;
        if (filePath && !signedUrls[up.id] && !loadingUrls[up.id]) {
          getSignedUrl(filePath, up.id);
        }
      });
    });
    // eslint-disable-next-line
  }, [uploads]);

  // Handler para aprovar upload
  const handleApproveUpload = async (uploadId: string) => {
    try {
      const { error } = await supabase
        .from('document_request_uploads')
        .update({ status: 'approved' })
        .eq('id', uploadId);
      if (error) {
        setError('Failed to approve the document: ' + error.message);
        return;
      }
      fetchRequests();
    } catch (e: any) {
      setError('Unexpected error while approving: ' + (e.message || e));
    }
  };

  // Handler para rejeitar upload
  const handleRejectUpload = async (uploadId: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('document_request_uploads')
        .update({ status: 'rejected', review_notes: notes || null })
        .eq('id', uploadId);
      if (error) {
        setError('Failed to reject the document: ' + error.message);
        return;
      }
      fetchRequests();
    } catch (e: any) {
      setError('Unexpected error while rejecting: ' + (e.message || e));
    }
  };

  // Padronizar status para snake_case
  const normalizeStatus = (status: string) => (status || '').toLowerCase().replace(/\s+/g, '_');

  return (
    <div className="max-w-3xl mx-auto p-6">
      {isSchool && (
        <div className="flex justify-end mb-4">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded font-semibold shadow hover:bg-blue-700 transition"
            onClick={() => setShowNewModal(true)}
          >
            New Individual Request
          </button>
        </div>
      )}
      {/* <h2 className="text-2xl font-bold mb-6 text-[#05294E]">Document Requests</h2> */}
      {/* <p className="text-slate-500 mb-8">Below are the documents requested by the university. Download templates if available and upload your files for each request.</p> */}



      {/* Lista de Document Requests - Design Antigo */}
      <div className="space-y-8">
        {requests.length === 0 ? (
          <div className="text-center text-slate-400 py-12">
            <svg className="mx-auto w-16 h-16 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            <p>No document requests found.</p>
          </div>
        ) : (
          requests.map(req => {
            // Determinar status principal do upload do aluno para cor da borda
            const mainUpload = uploads[req.id]?.[0];
            let borderColor = '#F1F5F9';
            if (mainUpload) {
              if (mainUpload.status === 'approved') borderColor = '#22C55E';
              else if (mainUpload.status === 'pending') borderColor = '#FACC15';
              else if (mainUpload.status === 'rejected') borderColor = '#EF4444';
            }
            return (
              <div key={req.id} className="bg-white p-6 rounded-xl shadow-xl border border-blue-100 mb-4">
                <div className="p-6 flex flex-col gap-4">
                  {/* 3. Exibir logo no card de cada requisição */}
                  <div className="flex items-center gap-3 mb-2">
                    {universityLogoUrl ? (
                      <img src={universityLogoUrl} alt="University Logo" className="w-10 h-10 rounded-full bg-white border border-blue-100 object-contain" />
                    ) : (
                      <span className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-50 border border-blue-100">
                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0 0H6m6 0h6" /></svg>
                      </span>
                    )}
                    <div>
                      <h3 className="font-bold text-xl text-[#05294E]">{req.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">{req.description}</p>
                    </div>
                  </div>

                  {/* University template/attachment */}
                  {req.attachment_url && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-[#F1F5F9] border border-[#3B82F6] rounded-lg px-4 py-2 w-full">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#3B82F6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h6a2 2 0 002-2V7" /></svg>
                        <span className="text-[#05294E] text-sm font-medium">Template provided by the university</span>
                      </div>
                      <button className="sm:ml-2 bg-[#3B82F6] text-white px-3 py-1 rounded hover:bg-[#05294E] transition text-xs font-semibold w-full sm:w-auto" title="Download template"
                        onClick={async () => {
                          const url = await getAttachmentSignedUrl(req.attachment_url!, req.id);
                          if (url) handleForceDownload(url, req.attachment_url!.split('/').pop() || 'document.pdf');
                        }}>
                        Download
                      </button>
                      {/* Botão View para abrir no modal padrão ou nova aba se PDF */}
                      <button className="sm:ml-2 bg-white text-[#3B82F6] border border-[#3B82F6] px-3 py-1 rounded hover:bg-[#3B82F6] hover:text-white transition text-xs font-semibold w-full sm:w-auto" title="View template"
                        onClick={async () => {
                          const url = await getAttachmentSignedUrl(req.attachment_url!, req.id);
                          if (url) {
                            const isPdf = req.attachment_url!.toLowerCase().endsWith('.pdf');
                            const isImage = req.attachment_url!.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                            if (isPdf) {
                              window.open(url, '_blank');
                            } else if (isImage) {
                              setPreviewUrl(url);
                            } else {
                              // fallback: abrir no modal se não for PDF
                              setPreviewUrl(url);
                            }
                          }
                        }}>
                        View
                      </button>
                    </div>
                  )}

                  {/* Student uploads for this request */}
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-[#05294E] mb-1">
                      {isSchool ? 'Student uploads:' : 'Your uploads:'}
                    </span>
                    {uploads[req.id]?.length > 0 ? (
                      uploads[req.id].map(upload => {
                        const normalizedStatus = normalizeStatus(upload.status);
                        // LOG: status e contexto de cada upload
                        const showApproveReject = isSchool && ['pending', 'under_review'].includes(normalizedStatus);
                        // LOG: Renderizando botões Approve/Reject
                        if (showApproveReject) {
                          // console.log('[DocumentRequestsCard] Renderizando botões Approve/Reject para upload', upload.id);
                        }
                        // Badge de status dos uploads
                        let badgeColor = 'bg-white text-[#22C55E] border border-[#22C55E]';
                        let containerColor = 'bg-[#F1F5F9] border border-[#22C55E]/30';
                        if (normalizedStatus === 'pending') { badgeColor = 'bg-white text-[#FACC15] border border-[#FACC15]'; containerColor = 'bg-[#F1F5F9] border border-[#FACC15]/30'; }
                        if (normalizedStatus === 'rejected') { badgeColor = 'bg-white text-red-600 border border-red-400'; containerColor = 'bg-red-50 border border-red-200'; }
                        if (normalizedStatus === 'under_review') {
                          badgeColor = 'bg-white text-yellow-700 border border-yellow-400';
                          containerColor = isSchool ? 'bg-[#F1F5F9] border border-[#22C55E]/30' : 'bg-yellow-50 border border-yellow-300';
                        }
                        return (
                          <div key={upload.id} className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-lg px-4 py-2 ${containerColor}`}>
                            <div className="flex items-center gap-2">
                              <svg className={`w-5 h-5 ${normalizedStatus === 'under_review' ? 'text-yellow-500' : 'text-[#22C55E]'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7v10a2 2 0 002 2h6a2 2 0 002-2V7" /></svg>
                              <span className="text-[#05294E] text-sm font-medium truncate max-w-[120px]">{upload.file_url?.split('/').pop()}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${badgeColor}`}>{normalizedStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                            {/* Botão Download */}
                            <button
                              className="flex items-center gap-1 px-3 py-1 rounded font-semibold transition text-xs border bg-white text-[#3B82F6] border-[#3B82F6] hover:bg-[#3B82F6]/10 hover:text-[#05294E] hover:border-[#05294E]"
                              title="Download file"
                              onClick={async () => {
                                const signedUrl = signedUrls[upload.id] || upload.file_url;
                                if (signedUrl) {
                                  await handleForceDownload(signedUrl, upload.file_url?.split('/').pop() || 'document.pdf');
                                }
                              }}
                              disabled={!signedUrls[upload.id] && upload.file_url.includes('document-attachments')}
                            >
                              Download
                            </button>
                            {/* Botão View */}
                            <button
                              className={`flex items-center justify-center gap-1 px-3 py-1 rounded font-semibold transition text-xs border w-full sm:w-auto
                                bg-white text-[#3B82F6] border-[#3B82F6] hover:bg-[#3B82F6]/10 hover:text-[#05294E] hover:border-[#05294E]
                              `}
                              title="View file"
                              onClick={() => {
                                const signedUrl = signedUrls[upload.id];
                                const fileUrl = signedUrl || upload.file_url;
                                const isImage = upload.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                if (fileUrl && isImage) {
                                  setPreviewUrl(fileUrl);
                                } else if (fileUrl) {
                                  window.open(fileUrl, '_blank');
                                }
                              }}
                              disabled={!signedUrls[upload.id] && upload.file_url.includes('document-attachments')}
                            >
                              View
                            </button>
                            {/* Botões de aprovação/rejeição para escola */}
                            {showApproveReject && (
                              <div className="flex gap-2 mt-2 sm:mt-0">
                                <button
                                  className="px-3 py-1 rounded bg-white text-[#22C55E] border border-[#22C55E] text-xs font-semibold hover:bg-[#22C55E]/10 hover:text-[#05294E] hover:border-[#05294E] transition"
                                  onClick={() => handleApproveUpload(upload.id)}
                                  disabled={normalizedStatus === 'approved'}
                                >
                                  Approve
                                </button>
                                <button
                                  className="px-3 py-1 rounded bg-white text-red-600 border border-red-400 text-xs font-semibold hover:bg-red-50 hover:text-red-800 hover:border-red-600 transition"
                                  onClick={() => { setPendingRejectUploadId(upload.id); setRejectNotes(''); setShowRejectModal(true); }}
                                  disabled={normalizedStatus === 'rejected'}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                              {/* Exibir nota de revisão quando existir */}
                              {upload.review_notes && (
                                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                                  <strong>Reason:</strong> {upload.review_notes}
                                </div>
                              )}
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-slate-400 text-xs">No files uploaded yet.</span>
                    )}
                  </div>

                  {/* Upload area for this request */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 w-full">
                    <label className="btn-ghost cursor-pointer bg-[#F1F5F9] hover:bg-[#3B82F6]/10 text-[#3B82F6] px-3 py-2 rounded-lg font-medium transition w-full sm:w-auto" title="Upload new file">
                      <span>Upload new file</span>
                      <input
                        id={`file-upload-${req.id}`}
                        type="file"
                        title="Select a file to upload"
                        placeholder="Choose a file"
                        onChange={e => handleFileSelect(req.id, e.target.files ? e.target.files[0] : null)}
                        className="sr-only"
                      />
                    </label>
                    {selectedFiles[req.id] && (
                      <span className="text-sm text-gray-700 truncate max-w-xs w-full sm:w-auto">{selectedFiles[req.id]?.name}</span>
                    )}
                    <button
                      className={`bg-[#22C55E] text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full sm:w-auto`}
                      disabled={!selectedFiles[req.id] || uploading[req.id]}
                      onClick={() => handleSendUpload(req.id)}
                      title="Send file"
                    >
                      {uploading[req.id] ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Acceptance Letter block - MOVIDO PARA O FINAL */}
      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-2xl p-8 mt-8 shadow-xl hover:shadow-2xl transition-shadow duration-300 ring-1 ring-yellow-100">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <svg className="w-9 h-9 text-yellow-500 drop-shadow" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2z" /></svg>
            <div>
              <h3 className="text-2xl font-extrabold text-yellow-900 mb-1 drop-shadow">Acceptance Letter</h3>
              {/* Mensagem dinâmica conforme status */}
              {(!acceptanceLetter?.acceptance_letter_url || acceptanceLetter?.acceptance_letter_status === 'pending') && (
                <p className="text-yellow-800 text-base">
                  {isSchool
                    ? 'Please upload the student\'s acceptance letter and any other required documents, such as the I-20 Control Fee receipt.'
                    : "The university will send your acceptance letter here when it's ready. Once uploaded, you will be automatically enrolled."}
                </p>
              )}
              {acceptanceLetter?.acceptance_letter_status === 'approved' && (
                <p className="text-yellow-800 text-base">
                  {isSchool
                    ? 'The acceptance letter has been successfully uploaded. The student is now officially enrolled.'
                    : 'Your acceptance letter has been uploaded. You are now officially enrolled!'}
                </p>
              )}
            </div>
          </div>
          {/* Badge/status só para aluno */}
          {!isSchool && (
            <span className={`px-4 py-1 rounded-full text-sm font-bold ml-2 shadow-sm ${acceptanceLetter?.acceptance_letter_status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-200 text-yellow-800'}`}
              style={{ minWidth: 110, textAlign: 'center', boxShadow: '0 2px 8px 0 rgba(0,0,0,0.07)' }}>
              {acceptanceLetter?.acceptance_letter_status === 'approved' ? 'Enrolled' : 'Waiting for university'}
            </span>
          )}
        </div>
        
        {/* Upload da acceptance letter pela escola */}
        {isSchool && !acceptanceLetter?.acceptance_letter_url && (
          <div className="mt-4 pt-4 border-t border-yellow-300">
            <label className="font-semibold text-yellow-900 mb-3 block">Upload Acceptance Letter</label>
            <p className="text-yellow-800 text-sm mb-4">Upload the acceptance letter to automatically enroll the student.</p>
            <label className="flex items-center gap-3 cursor-pointer bg-yellow-200 hover:bg-yellow-300 text-yellow-900 px-4 py-2 rounded-lg font-medium shadow transition w-fit">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5" /></svg>
              <span>{acceptanceLoading ? 'Uploading...' : 'Select Acceptance Letter'}</span>
              <input 
                type="file" 
                accept="application/pdf" 
                className="sr-only" 
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await handleAcceptanceLetterUpload(file);
                  }
                }}
                disabled={acceptanceLoading}
              />
            </label>
          </div>
        )}
        
        {/* Download da acceptance letter */}
        {acceptanceLetter?.acceptance_letter_url && (
          <div className="flex flex-col md:flex-row gap-6 mt-2 w-full">
            <div className="flex-1 flex flex-col gap-2">
              <label className="font-semibold text-yellow-900 mb-1">Acceptance letter file</label>
              <div className="flex gap-3 flex-wrap">
                {/* Download: força download do arquivo */}
                <button
                  className="flex items-center gap-2 bg-yellow-200 hover:bg-yellow-300 text-yellow-900 px-4 py-2 rounded-lg font-medium shadow transition w-fit"
                  onClick={() => {
                    if (acceptanceLetterSignedUrls.acceptance_letter_url) {
                      const filename = (acceptanceLetter?.acceptance_letter_url?.split('/')?.pop() || 'acceptance_letter.pdf').replace(/\?.*$/, '');
                      handleForceDownload(acceptanceLetterSignedUrls.acceptance_letter_url, filename);
                    }
                  }}
                  disabled={!acceptanceLetterSignedUrls.acceptance_letter_url}
                  type="button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5" /></svg>
                  Download
                </button>
                {/* View: abre em nova aba para visualização */}
                <a
                  className="flex items-center gap-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-900 px-4 py-2 rounded-lg font-medium shadow transition w-fit"
                  href={acceptanceLetterSignedUrls.acceptance_letter_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!acceptanceLetterSignedUrls.acceptance_letter_url}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553 2.276A2 2 0 0121 14.03V17a2 2 0 01-2 2H5a2 2 0 01-2-2v-2.97a2 2 0 01.447-1.254L8 10" /></svg>
                  View
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transfer Form block: só para transfer, no final da página */}
      {studentType === 'transfer' && (
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-2xl p-8 mt-8 shadow-xl hover:shadow-2xl transition-shadow duration-300 ring-1 ring-blue-100">
          <div className="flex items-center gap-3 mb-4">
            <svg className="w-9 h-9 text-blue-500 drop-shadow" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2z" /></svg>
            <div>
              <h3 className="text-2xl font-extrabold text-blue-900 mb-1 drop-shadow">Transfer Form</h3>
              <p className="text-blue-800 text-base">
                {isSchool
                  ? 'Upload the transfer form for this student. Only visible for transfer students.'
                  : 'Your university will upload your transfer form here. Download it when available.'}
              </p>
            </div>
          </div>
          {/* Upload para escola */}
          {isSchool ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 w-full">
              <label className="btn-ghost cursor-pointer bg-[#F1F5F9] hover:bg-[#3B82F6]/10 text-[#3B82F6] px-3 py-2 rounded-lg font-medium transition w-full sm:w-auto" title="Upload transfer form">
                <span>Upload transfer form</span>
                <input
                  id="transfer-form-upload"
                  type="file"
                  title="Select transfer form"
                  placeholder="Choose a file"
                  onChange={e => handleFileSelect('transfer_form', e.target.files ? e.target.files[0] : null)}
                  className="sr-only"
                />
              </label>
              {selectedFiles['transfer_form'] && (
                <span className="text-sm text-gray-700 truncate max-w-xs w-full sm:w-auto">{selectedFiles['transfer_form']?.name}</span>
              )}
              <button
                className={`bg-[#22C55E] text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full sm:w-auto`}
                disabled={!selectedFiles['transfer_form'] || uploading['transfer_form']}
                onClick={() => handleSendUpload('transfer_form')}
                title="Send transfer form"
              >
                {uploading['transfer_form'] ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          ) : (
            // Download/visualização para aluno
            <div className="flex flex-col gap-2 mt-2">
              {/* Exibir botão de download se houver upload feito pela escola */}
              {uploads['transfer_form'] && uploads['transfer_form'].length > 0 ? (
                uploads['transfer_form'].map(upload => (
                  <div key={upload.id} className="flex items-center gap-3">
                    <button
                      className="bg-blue-600 text-white px-4 py-2 rounded font-semibold shadow hover:bg-blue-700 transition"
                      onClick={async () => {
                        const signedUrl = await getSignedUrl(upload.file_url, upload.id);
                        if (signedUrl) handleForceDownload(signedUrl, upload.file_url.split('/').pop() || 'transfer_form.pdf');
                      }}
                    >
                      Download Transfer Form
                    </button>
                    <button
                      className="bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded font-semibold shadow hover:bg-blue-50 transition"
                      onClick={async () => {
                        const signedUrl = await getSignedUrl(upload.file_url, upload.id);
                        if (signedUrl) window.open(signedUrl, '_blank');
                      }}
                    >
                      View
                    </button>
                  </div>
                ))
              ) : (
                <span className="text-slate-400 text-xs">No transfer form uploaded yet.</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* New Request Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-slate-200 animate-fade-in">
            <h3 className="font-extrabold text-xl mb-6 text-[#05294E] text-center">New Document Request</h3>
            {error && <div className="text-red-500 mb-4 text-center font-semibold">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="doc-title">Title <span className="text-red-500">*</span></label>
                <input
                  id="doc-title"
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base"
                  placeholder="Enter document title"
                  value={newRequest.title}
                  onChange={e => setNewRequest(r => ({ ...r, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="doc-description">Description</label>
                <textarea
                  id="doc-description"
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base"
                  placeholder="Enter document description"
                  value={newRequest.description}
                  onChange={e => setNewRequest(r => ({ ...r, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="doc-date">Due date</label>
                <input
                  id="doc-date"
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base"
                  type="date"
                  value={newRequest.due_date}
                  onChange={e => setNewRequest(r => ({ ...r, due_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="doc-attachment">Attachment</label>
                <div className="flex items-center gap-3">
                  <label htmlFor="doc-attachment" className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition font-medium text-blue-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828l6.586-6.586M16 5v6a2 2 0 002 2h6" /></svg>
                    <span>{newRequest.attachment ? 'Change file' : 'Select file'}</span>
                    <input
                      id="doc-attachment"
                      type="file"
                      className="sr-only"
                      onChange={e => setNewRequest(r => ({ ...r, attachment: e.target.files ? e.target.files[0] : null }))}
                      disabled={creating}
                    />
                  </label>
                  {newRequest.attachment && (
                    <span className="text-xs text-slate-700 truncate max-w-[180px]">{newRequest.attachment.name}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition disabled:opacity-50"
                onClick={() => setShowNewModal(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                onClick={handleNewRequest}
                disabled={creating || !newRequest.title}
              >
                {creating ? 'Creating...' : 'Create Request'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showNewModal && isSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-slate-200 animate-fade-in">
            <h3 className="font-extrabold text-xl mb-6 text-[#05294E] text-center">New Individual Document Request</h3>
            {error && <div className="text-red-500 mb-4 text-center font-semibold">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="individual-title">Title <span className="text-red-500">*</span></label>
                <input
                  id="individual-title"
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base"
                  placeholder="Enter document title"
                  value={newRequest.title}
                  onChange={e => setNewRequest(r => ({ ...r, title: e.target.value }))}
                  disabled={creating}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="individual-desc">Description</label>
                <textarea
                  id="individual-desc"
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base min-h-[60px] resize-vertical"
                  placeholder="Describe the document or instructions (optional)"
                  value={newRequest.description}
                  onChange={e => setNewRequest(r => ({ ...r, description: e.target.value }))}
                  disabled={creating}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="individual-date">Due date</label>
                <input
                  id="individual-date"
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base"
                  type="date"
                  value={newRequest.due_date}
                  onChange={e => setNewRequest(r => ({ ...r, due_date: e.target.value }))}
                  disabled={creating}
                  placeholder="Due date"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="individual-attachment">Attachment</label>
                <div className="flex items-center gap-3">
                  <label htmlFor="individual-attachment" className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition font-medium text-blue-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828l6.586-6.586M16 5v6a2 2 0 002 2h6" /></svg>
                    <span>{newRequest.attachment ? 'Change file' : 'Select file'}</span>
                    <input
                      id="individual-attachment"
                      type="file"
                      className="sr-only"
                      onChange={e => setNewRequest(r => ({ ...r, attachment: e.target.files ? e.target.files[0] : null }))}
                      disabled={creating}
                    />
                  </label>
                  {newRequest.attachment && (
                    <span className="text-xs text-slate-700 truncate max-w-[180px]">{newRequest.attachment.name}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-8">
              <button
                className="px-4 py-2 rounded bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 border border-slate-200"
                onClick={() => { setShowNewModal(false); setNewRequest({ title: '', description: '', due_date: '', attachment: null }); setError(null); }}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow border border-blue-700"
                onClick={async () => {
                  if (!newRequest.title) { setError('Title is required'); return; }
                  setCreating(true);
                  setError(null);
                  let attachment_url = undefined;
                  try {
                    if (newRequest.attachment) {
                      const { data: { session } } = await supabase.auth.getSession();
                      const accessToken = session?.access_token;
                      if (!accessToken) {
                        setError('Usuário não autenticado. Faça login novamente.');
                        setCreating(false);
                        return;
                      }
                      const { data, error } = await supabase.storage.from('document-attachments').upload(`individual/${Date.now()}_${newRequest.attachment.name}`, newRequest.attachment);
                      if (error) {
                        setError('Failed to upload attachment: ' + error.message);
                        setCreating(false);
                        return;
                      }
                      attachment_url = data?.path;
                    }
                    // LOGS DETALHADOS PARA DEBUG
                    const payload = {
                      title: newRequest.title,
                      description: newRequest.description,
                      due_date: newRequest.due_date || null,
                      university_id: universityId, // agora garantido pelo estado global
                      is_global: false,
                      status: 'open',
                      created_by: currentUserId,
                      scholarship_application_id: applicationId
                    };
                    // console.log('Payload enviado para Edge Function (individual):', payload);
                    const { data: { session } } = await supabase.auth.getSession();
                    const accessToken = session?.access_token;
                    if (!accessToken) {
                      setError('Usuário não autenticado. Faça login novamente.');
                      setCreating(false);
                      return;
                    }
                    const response = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/create-document-request', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                      },
                      body: JSON.stringify(payload),
                    });
                    let result = {};
                    try {
                      result = await response.json();
                    } catch (e) {
                      // console.log('Erro ao fazer parse do JSON de resposta (individual):', e);
                    }
                    // console.log('Resposta da Edge Function (individual):', result);
                    if (!response.ok || !result.success) {
                      setError('Failed to create request: ' + (result.error || 'Unknown error'));
                      setCreating(false);
                      return;
                    }
                    setShowNewModal(false);
                    setNewRequest({ title: '', description: '', due_date: '', attachment: null });
                    fetchRequests();
                  } catch (e: any) {
                    setError('Unexpected error: ' + (e.message || e));
                  } finally {
                    setCreating(false);
                  }
                }}
                disabled={creating}
              >
                Create Request
              </button>
            </div>
          </div>
        </div>
      )}
      {previewUrl && (
        <ImagePreviewModal imageUrl={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}

      {/* Modal de justificativa para rejeição */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-[#05294E] mb-3">Provide a justification</h3>
            <p className="text-sm text-slate-600 mb-4">Explique o motivo da rejeição deste documento. O aluno verá esta mensagem.</p>
            <textarea
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 min-h-[120px]"
              placeholder="Ex.: O documento está cortado. Envie novamente em PDF com todas as páginas."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-md border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                onClick={() => { setShowRejectModal(false); setPendingRejectUploadId(null); setRejectNotes(''); }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                disabled={!pendingRejectUploadId}
                onClick={async () => {
                  if (!pendingRejectUploadId) return;
                  await handleRejectUpload(pendingRejectUploadId, rejectNotes.trim());
                  setShowRejectModal(false);
                  setPendingRejectUploadId(null);
                  setRejectNotes('');
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentRequestsCard; 