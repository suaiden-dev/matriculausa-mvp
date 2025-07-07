import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import ImagePreviewModal from './ImagePreviewModal';

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
}

const DocumentRequestsCard: React.FC<DocumentRequestsCardProps> = ({ applicationId, isSchool, currentUserId }) => {
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

  useEffect(() => {
    fetchRequests();
  }, [applicationId]);

  useEffect(() => {
    // Logar uploads carregados para debug
    if (Object.keys(uploads).length > 0) {
      console.log('[DEBUG] Uploads carregados:', uploads);
    }
  }, [uploads]);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('document_requests')
      .select('*')
      .eq('scholarship_application_id', applicationId)
      .order('created_at', { ascending: false });
    if (error) setError('Erro ao buscar solicitações');
    setRequests(data || []);
    setLoading(false);
    // Buscar uploads para cada request
    if (data) {
      const ids = data.map((r: any) => r.id);
      if (ids.length > 0) {
        const { data: uploadsData } = await supabase
          .from('document_request_uploads')
          .select('*')
          .in('document_request_id', ids);
        const uploadsMap: { [requestId: string]: DocumentRequestUpload[] } = {};
        (uploadsData || []).forEach((u: any) => {
          if (!uploadsMap[u.document_request_id]) uploadsMap[u.document_request_id] = [];
          uploadsMap[u.document_request_id].push(u);
        });
        setUploads(uploadsMap);
      }
    }
  };

  const handleNewRequest = async () => {
    if (!newRequest.title) return;
    let attachment_url = undefined;
    if (newRequest.attachment) {
      const { data, error } = await supabase.storage.from('document-attachments').upload(`modelos/${Date.now()}_${newRequest.attachment.name}`, newRequest.attachment);
      if (error) {
        setError('Erro ao fazer upload do anexo');
        return;
      }
      attachment_url = data?.path;
    }
    const { error } = await supabase.from('document_requests').insert({
      title: newRequest.title,
      description: newRequest.description,
      due_date: newRequest.due_date || null,
      attachment_url,
      scholarship_application_id: applicationId,
      created_by: currentUserId,
      status: 'open',
    });
    if (error) setError('Erro ao criar solicitação');
    setShowNewModal(false);
    setNewRequest({ title: '', description: '', due_date: '', attachment: null });
    fetchRequests();
  };

  const handleFileSelect = (requestId: string, file: File | null) => {
    setSelectedFiles(prev => ({ ...prev, [requestId]: file }));
  };

  const handleSendUpload = async (requestId: string) => {
    const file = selectedFiles[requestId];
    if (!file) return;
    setUploading(prev => ({ ...prev, [requestId]: true }));
    try {
      console.log('[UPLOAD] Iniciando upload', { requestId, file, user: currentUserId });
      const { data, error } = await supabase.storage.from('document-attachments').upload(`uploads/${Date.now()}_${file.name}`, file);
      console.log('[UPLOAD] Resultado do upload', { data, error });
      if (error) {
        setError(`Erro ao fazer upload do arquivo: ${error.message}`);
        console.error('[UPLOAD] Erro detalhado:', error, { file, requestId, user: currentUserId });
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
      console.log('[UPLOAD] Resultado do insert na tabela document_request_uploads', insertResult);
      setSelectedFiles(prev => ({ ...prev, [requestId]: null }));
      fetchRequests();
    } finally {
      setUploading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleApprove = async (uploadId: string) => {
    await supabase.from('document_request_uploads').update({ status: 'approved' }).eq('id', uploadId);
    fetchRequests();
  };
  const handleReject = async (uploadId: string) => {
    await supabase.from('document_request_uploads').update({ status: 'rejected' }).eq('id', uploadId);
    fetchRequests();
  };

  // Gera signed URL para cada upload
  const getSignedUrl = async (filePath: string, uploadId: string) => {
    setLoadingUrls(prev => ({ ...prev, [uploadId]: true }));
    try {
      const { data, error } = await supabase.storage.from('document-attachments').createSignedUrl(filePath, 60 * 60); // 1h
      if (error) {
        console.error('[DEBUG] Erro ao gerar signedUrl:', error, filePath);
        setSignedUrls(prev => ({ ...prev, [uploadId]: null }));
      } else {
        setSignedUrls(prev => ({ ...prev, [uploadId]: data.signedUrl }));
        console.log('[DEBUG] signedUrl gerada:', data.signedUrl, filePath);
      }
    } finally {
      setLoadingUrls(prev => ({ ...prev, [uploadId]: false }));
    }
  };

  // Gera signed URLs em lote sempre que uploads mudar
  useEffect(() => {
    const allUploads = Object.values(uploads).flat();
    allUploads.forEach(up => {
      const filePath = up.file_url && up.file_url.startsWith('/') ? up.file_url.slice(1) : up.file_url;
      if (!signedUrls[up.id] && !loadingUrls[up.id]) {
        getSignedUrl(filePath, up.id);
      }
    });
    // eslint-disable-next-line
  }, [uploads]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md mb-4 relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#05294E]">Document Requests</h2>
        {isSchool && (
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setShowNewModal(true)}>New Request</button>
        )}
      </div>
      {loading ? <div>Loading...</div> : null}
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {requests.length === 0 && !loading && <div>No requests found.</div>}
      <ul className="space-y-4">
        {requests.map(req => (
          <div key={req.id} className="bg-white p-6 rounded-xl shadow-md mb-4 relative">
            {/* Status do card principal */}
            {uploads[req.id] && uploads[req.id].length > 0 && (
              (() => {
                const allApproved = uploads[req.id].every(up => up.status === 'approved');
                const allRejected = uploads[req.id].every(up => up.status === 'rejected');
                const anyPending = uploads[req.id].some(up => up.status === 'pending' || up.status === 'under_review');
                let cardStatus = '';
                let cardClass = '';
                if (allApproved) {
                  cardStatus = 'Approved';
                  cardClass = 'bg-green-100 text-green-700';
                } else if (allRejected) {
                  cardStatus = 'Rejected';
                  cardClass = 'bg-red-100 text-red-700';
                } else if (anyPending) {
                  cardStatus = 'Pending';
                  cardClass = 'bg-yellow-100 text-yellow-700';
                }
                return cardStatus ? (
                  <span className={`absolute top-4 right-6 px-3 py-1 rounded font-semibold text-sm ${cardClass}`}>{cardStatus}</span>
                ) : null;
              })()
            )}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{req.title}</div>
                <div className="text-sm text-gray-600">{req.description}</div>
                {req.due_date && <div className="text-xs text-gray-500">Due date: {req.due_date}</div>}
                {req.attachment_url && (
                  <a href={supabase.storage.from('document-attachments').getPublicUrl(req.attachment_url).publicURL} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">Download template/attachment</a>
                )}
              </div>
            </div>
            {/* Uploads do aluno */}
            <div className="mt-2">
              <div className="font-medium text-sm mb-1">Uploads:</div>
              <ul className="space-y-1">
                {(uploads[req.id] || []).map(up => {
                  console.log('[DEBUG] Valor de up.file_url:', up.file_url);
                  const filePath = up.file_url && up.file_url.startsWith('/') ? up.file_url.slice(1) : up.file_url;
                  const signedUrl = signedUrls[up.id];
                  const isLoading = loadingUrls[up.id];
                  return (
                    <li key={up.id} className="flex flex-col md:flex-row md:items-center justify-between text-xs border-b last:border-0 py-2 gap-2 md:gap-0">
                      <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2">
                        <span className="truncate max-w-xs font-medium text-slate-800">{up.file_url.split('/').pop()}</span>
                        <span className="text-slate-500">{up.uploaded_at ? new Date(up.uploaded_at).toLocaleDateString() : ''}</span>
                        <span className={`px-2 py-1 rounded font-semibold 
                          ${up.status === 'approved' ? 'bg-green-100 text-green-700' : 
                            up.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                            up.status === 'under_review' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}
                        >
                          {up.status === 'approved' ? 'Approved' : up.status === 'rejected' ? 'Rejected' : up.status === 'under_review' ? 'Under review' : up.status}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-2 md:mt-0">
                        {isLoading ? (
                          <span className="text-blue-600 font-semibold">Gerando link...</span>
                        ) : signedUrl ? (
                          <>
                            <button
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium"
                              onClick={() => {
                                try {
                                  setPreviewUrl(signedUrl);
                                  console.log('[DEBUG] Preview aberto para:', signedUrl);
                                } catch (e) {
                                  console.error('[DEBUG] Erro ao abrir preview:', e, signedUrl);
                                }
                              }}
                            >
                              View
                            </button>
                            <a
                              href={signedUrl}
                              download
                              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-xs font-medium"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => console.log('[DEBUG] Download link clicado:', signedUrl)}
                            >
                              Download
                            </a>
                          </>
                        ) : (
                          <span className="text-red-600 font-semibold">Erro ao gerar link do arquivo</span>
                        )}
                        {isSchool && up.status === 'under_review' && (
                          <>
                            <button className="ml-2 text-green-600" onClick={() => handleApprove(up.id)}>Approve</button>
                            <button className="ml-2 text-red-600" onClick={() => handleReject(up.id)}>Reject</button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {/* Upload do aluno - novo fluxo */}
              {!isSchool && req.status === 'open' && (
                <div className="mt-2 flex flex-col md:flex-row md:items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer text-blue-700 font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828l6.586-6.586M16 5v6a2 2 0 002 2h6" /></svg>
                    <span>Select file</span>
                    <label htmlFor={`file-upload-${req.id}`} className="sr-only">Selecione um arquivo para upload</label>
                    <input
                      id={`file-upload-${req.id}`}
                      type="file"
                      title="Selecione um arquivo para upload"
                      placeholder="Escolha um arquivo"
                      onChange={e => handleFileSelect(req.id, e.target.files ? e.target.files[0] : null)}
                    />
                  </label>
                  {selectedFiles[req.id] && (
                    <span className="text-sm text-gray-700 truncate max-w-xs">{selectedFiles[req.id]?.name}</span>
                  )}
                  <button
                    className={`bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
                    disabled={!selectedFiles[req.id] || uploading[req.id]}
                    onClick={() => handleSendUpload(req.id)}
                  >
                    {uploading[req.id] ? 'Sending...' : 'Send'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </ul>
      {/* New Request Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-bold mb-4">New Document Request</h3>
            <input
              className="border rounded px-3 py-2 w-full mb-2"
              placeholder="Title"
              value={newRequest.title}
              onChange={e => setNewRequest(r => ({ ...r, title: e.target.value }))}
            />
            <textarea
              className="border rounded px-3 py-2 w-full mb-2"
              placeholder="Description"
              value={newRequest.description}
              onChange={e => setNewRequest(r => ({ ...r, description: e.target.value }))}
            />
            <input
              className="border rounded px-3 py-2 w-full mb-2"
              type="date"
              value={newRequest.due_date}
              onChange={e => setNewRequest(r => ({ ...r, due_date: e.target.value }))}
            />
            <input
              className="mb-2"
              type="file"
              title="Selecione um arquivo de modelo"
              placeholder="Escolha um arquivo"
              onChange={e => setNewRequest(r => ({ ...r, attachment: e.target.files ? e.target.files[0] : null }))}
            />
            <div className="flex gap-2 mt-2">
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleNewRequest}>Create</button>
              <button className="bg-gray-300 px-4 py-2 rounded" onClick={() => setShowNewModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {previewUrl && (
        <ImagePreviewModal imageUrl={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
    </div>
  );
};

export default DocumentRequestsCard; 