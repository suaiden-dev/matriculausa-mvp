import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface DocumentRequest {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  attachment_url?: string;
  status: string;
  created_at: string;
}

const UniversityGlobalDocumentRequests: React.FC = () => {
  const { userProfile } = useAuth();
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const STUDENT_TYPE_OPTIONS = [
    { value: 'initial', label: 'Initial (F-1 Visa Required)' },
    { value: 'change_of_status', label: 'Change of Status (From Other Visa)' },
    { value: 'transfer', label: 'Transfer (Current F-1 Student)' },
    { value: 'all', label: 'All Student Types' },
  ];
  const [newRequest, setNewRequest] = useState({ title: '', description: '', attachment: null as File | null, applicable_student_types: ['all'] });
  const [creating, setCreating] = useState(false);

  // Carrega os requests globais da universidade logada
  useEffect(() => {
    if (userProfile === undefined) return; // contexto ainda carregando
    if (!userProfile?.university_id) {
      setLoading(false);
      setRequests([]);
      return;
    }
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('document_requests')
        .select('*')
        .eq('is_global', true)
        .eq('university_id', userProfile.university_id)
        .order('created_at', { ascending: false });
      console.log('[DEBUG] Requests retornados:', data);
      if (error) setError('Failed to fetch document requests');
      setRequests(data || []);
      setLoading(false);
    };
    fetchRequests();
  }, [userProfile?.university_id, userProfile]);

  const handleNewRequest = async () => {
    console.log('handleNewRequest called', { userProfile, newRequest });
    if (!userProfile?.university_id || !newRequest.title) {
      console.log('Blocked: missing university_id or title', { userProfile, newRequest });
      return;
    }
    setCreating(true);
    setError(null);
    let attachment_url = undefined;
    try {
      if (newRequest.attachment) {
        const { data, error } = await supabase.storage.from('document-attachments').upload(`global/${Date.now()}_${newRequest.attachment.name}`, newRequest.attachment);
        if (error) {
          setError('Failed to upload attachment: ' + error.message);
          setCreating(false);
          return;
        }
        attachment_url = data?.path;
      }
      const payload = {
        title: newRequest.title,
        description: newRequest.description,
        university_id: userProfile.university_id,
        is_global: true,
        created_by: userProfile.user_id,
        scholarship_application_id: null,
        applicable_student_types: newRequest.applicable_student_types
      };
      console.log('[DEBUG] Enviando para Edge Function create-document-request (global)', payload);
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
      const result = await response.json();
      console.log('[DEBUG] Resposta da Edge Function:', result);
      if (!response.ok || !result.success) {
        setError('Failed to create request: ' + (result.error || 'Unknown error'));
        setCreating(false);
        return;
      }
      setShowNewModal(false);
      setNewRequest({ title: '', description: '', attachment: null, applicable_student_types: ['all'] });
      // Recarregar lista
      const { data: updated, error: fetchError } = await supabase
        .from('document_requests')
        .select('*')
        .eq('is_global', true)
        .eq('university_id', userProfile.university_id)
        .order('created_at', { ascending: false });
      setRequests(updated || []);
      if (fetchError) setError('Failed to refresh list: ' + fetchError.message);
    } catch (e: any) {
      setError('Unexpected error: ' + (e.message || e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md mb-4">
      {/* Tutorial/Instructions */}
      <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
        <h3 className="font-bold text-blue-800 mb-2">How to Use Global Document Requests</h3>
        <ul className="list-disc pl-5 text-blue-900 text-sm space-y-1">
          <li>This page allows you to request documents from all students at your university in a centralized way.</li>
          <li><strong>Do not request common documents again</strong> (such as passport, bank statement, high school diploma, etc.) — these are already collected in the standard application process.</li>
          <li>Use this feature for <strong>special or university-specific documents</strong> that are not part of the default requirements.</li>
          <li>To create a new request, click <span className="font-semibold">"New Global Request"</span> and fill in the details.</li>
          <li>All students will see these requests and can upload the required documents directly.</li>
        </ul>
      </div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#05294E]">Global Document Requests</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setShowNewModal(true)}>
          New Global Request
        </button>
      </div>
      {loading ? <div>Loading...</div> : null}
      {!loading && !userProfile?.university_id && (
        <div className="text-gray-500 mb-2">No university found for this user.</div>
      )}
      {!loading && userProfile?.university_id && requests.length === 0 && (
        <div className="text-red-500 font-bold">No global requests found. (DEBUG: Nenhum registro retornado do banco. Veja o console para detalhes.)</div>
      )}
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <ul className="space-y-4">
        {requests.map(req => (
          <li key={req.id} className="bg-slate-50 p-4 rounded shadow flex flex-col gap-1">
            <span className="font-semibold">{req.title || ''}</span>
            <span className="text-sm text-gray-600">{req.description || ''}</span>
            {req.due_date && <span className="text-xs text-gray-500">Due date: {req.due_date}</span>}
            <span className="text-xs text-gray-400">Created at: {req.created_at ? new Date(req.created_at).toLocaleString() : ''}</span>
            <span className="text-xs text-gray-400">Status: {req.status || ''}</span>
          </li>
        ))}
      </ul>
      {/* Modal de novo request */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-slate-200 animate-fade-in">
            <h3 className="font-extrabold text-xl mb-6 text-[#05294E] text-center">New Global Document Request</h3>
            {error && <div className="text-red-500 mb-4 text-center font-semibold">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="global-title">Title <span className="text-red-500">*</span></label>
                <input
                  id="global-title"
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base"
                  placeholder="Enter document title"
                  value={newRequest.title}
                  onChange={e => setNewRequest(r => ({ ...r, title: e.target.value }))}
                  disabled={creating}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="global-desc">Description</label>
                <textarea
                  id="global-desc"
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base min-h-[60px] resize-vertical"
                  placeholder="Describe the document or instructions (optional)"
                  value={newRequest.description}
                  onChange={e => setNewRequest(r => ({ ...r, description: e.target.value }))}
                  disabled={creating}
                />
              </div>
              {/* Removido campo de due date */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="global-attachment">Attachment</label>
                <div className="flex items-center gap-3">
                  <label htmlFor="global-attachment" className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition font-medium text-blue-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828l6.586-6.586M16 5v6a2 2 0 002 2h6" /></svg>
                    <span>{newRequest.attachment ? 'Change file' : 'Select file'}</span>
                    <input
                      id="global-attachment"
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
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Applicable Student Types <span className="text-red-500">*</span></label>
                <div className="flex flex-col gap-2">
                  {STUDENT_TYPE_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          opt.value === 'all'
                            ? newRequest.applicable_student_types.length === STUDENT_TYPE_OPTIONS.length - 1
                            : newRequest.applicable_student_types.includes(opt.value)
                        }
                        onChange={e => {
                          if (opt.value === 'all') {
                          if (e.target.checked) {
                              setNewRequest(r => ({ ...r, applicable_student_types: STUDENT_TYPE_OPTIONS.filter(o => o.value !== 'all').map(o => o.value) }));
                            } else {
                              setNewRequest(r => ({ ...r, applicable_student_types: [] }));
                            }
                          } else {
                            setNewRequest(r => {
                              let updated = r.applicable_student_types.includes(opt.value)
                                ? r.applicable_student_types.filter(v => v !== opt.value)
                                : [...r.applicable_student_types, opt.value];
                              // Se todos os tipos (exceto 'all') estiverem selecionados, marque 'all' também
                              if (updated.length === STUDENT_TYPE_OPTIONS.length - 1) {
                                // nada a fazer, já está tudo selecionado
                              }
                              return { ...r, applicable_student_types: updated };
                            });
                          }
                        }}
                        disabled={creating}
                        className={
                          opt.value === 'all'
                            ? 'accent-blue-600 font-bold'
                            : newRequest.applicable_student_types.includes(opt.value)
                              ? 'accent-blue-600'
                              : ''
                        }
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8 justify-center">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2" onClick={handleNewRequest} disabled={creating || !newRequest.title}>
                {creating ? (
                  <svg className="animate-spin h-5 w-5 mr-1 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                ) : null}
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-semibold transition" onClick={() => setShowNewModal(false)} disabled={creating}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversityGlobalDocumentRequests; 