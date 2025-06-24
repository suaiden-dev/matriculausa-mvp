import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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

  useEffect(() => {
    fetchRequests();
  }, [applicationId]);

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

  const handleUpload = async (requestId: string, file: File) => {
    const { data, error } = await supabase.storage.from('document-attachments').upload(`uploads/${Date.now()}_${file.name}`, file);
    if (error) {
      setError('Erro ao fazer upload do arquivo');
      return;
    }
    const file_url = data?.path;
    await supabase.from('document_request_uploads').insert({
      document_request_id: requestId,
      uploaded_by: currentUserId,
      file_url,
      status: 'pending',
    });
    fetchRequests();
  };

  const handleApprove = async (uploadId: string) => {
    await supabase.from('document_request_uploads').update({ status: 'approved' }).eq('id', uploadId);
    fetchRequests();
  };
  const handleReject = async (uploadId: string) => {
    await supabase.from('document_request_uploads').update({ status: 'rejected' }).eq('id', uploadId);
    fetchRequests();
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
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
          <li key={req.id} className="border rounded p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{req.title}</div>
                <div className="text-sm text-gray-600">{req.description}</div>
                {req.due_date && <div className="text-xs text-gray-500">Due date: {req.due_date}</div>}
                {req.attachment_url && (
                  <a href={supabase.storage.from('document-attachments').getPublicUrl(req.attachment_url).publicURL} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">Download template/attachment</a>
                )}
              </div>
              <div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${req.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{req.status === 'open' ? 'Pending' : 'Closed'}</span>
              </div>
            </div>
            {/* Uploads do aluno */}
            <div className="mt-2">
              <div className="font-medium text-sm mb-1">Uploads:</div>
              <ul className="space-y-1">
                {(uploads[req.id] || []).map(up => (
                  <li key={up.id} className="flex items-center justify-between text-xs border-b last:border-0 py-1">
                    <a href={supabase.storage.from('document-attachments').getPublicUrl(up.file_url).publicURL} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{up.file_url.split('/').pop()}</a>
                    <span className={`ml-2 px-2 py-1 rounded ${up.status === 'approved' ? 'bg-green-100 text-green-700' : up.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{up.status}</span>
                    {isSchool && up.status === 'pending' && (
                      <>
                        <button className="ml-2 text-green-600" onClick={() => handleApprove(up.id)}>Approve</button>
                        <button className="ml-2 text-red-600" onClick={() => handleReject(up.id)}>Reject</button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              {/* Upload do aluno */}
              {!isSchool && req.status === 'open' && (
                <div className="mt-2">
                  <input type="file" onChange={e => e.target.files && handleUpload(req.id, e.target.files[0])} />
                </div>
              )}
            </div>
          </li>
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
              onChange={e => setNewRequest(r => ({ ...r, attachment: e.target.files ? e.target.files[0] : null }))}
            />
            <div className="flex gap-2 mt-2">
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleNewRequest}>Create</button>
              <button className="bg-gray-300 px-4 py-2 rounded" onClick={() => setShowNewModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentRequestsCard; 