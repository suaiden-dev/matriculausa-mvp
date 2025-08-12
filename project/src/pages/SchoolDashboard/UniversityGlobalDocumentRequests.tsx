import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useUniversity } from '../../context/UniversityContext';

interface DocumentRequest {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  attachment_url?: string;
  status: string;
  created_at: string;
  created_by?: string;
  applicable_student_types?: string[];
}

const UniversityGlobalDocumentRequests: React.FC = () => {
  const { userProfile } = useAuth();
  const { university } = useUniversity();
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
  // Edição
  const [editingRequest, setEditingRequest] = useState<DocumentRequest | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; description: string; attachment: File | null; applicable_student_types: string[]; status: 'open' | 'closed' }>({
    title: '',
    description: '',
    attachment: null,
    applicable_student_types: ['all'],
    status: 'open',
  });

  // Verificar se a universidade está aprovada
  const isUniversityApproved = university?.is_approved === true;

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
    console.log('handleNewRequest called', { userProfile, newRequest, university });
    
    // Verificar se a universidade está aprovada
    if (!isUniversityApproved) {
      setError('Your university must be approved before you can create global document requests. Please contact support for approval.');
      return;
    }
    
    if (!userProfile?.university_id || !newRequest.title) {
      console.log('Blocked: missing university_id or title', { userProfile, newRequest });
      return;
    }
    setCreating(true);
    setError(null);
    let attachment_url: string | undefined = undefined;
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
        applicable_student_types: newRequest.applicable_student_types,
        attachment_url
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
        <div className="flex flex-col items-end">
          <button 
            className={`px-4 py-2 rounded font-medium transition-all duration-200 ${
              isUniversityApproved 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            onClick={() => isUniversityApproved && setShowNewModal(true)}
            disabled={!isUniversityApproved}
            title={!isUniversityApproved ? 'University approval required to create global document requests' : ''}
          >
            New Global Request
          </button>
          {!isUniversityApproved && (
            <p className="text-xs text-red-600 mt-1 max-w-xs text-right">
              University approval required
            </p>
          )}
        </div>
      </div>
      
      {/* Warning when university is not approved */}
      {!isUniversityApproved && (
        <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">University Approval Required</h3>
              <p className="mt-1 text-sm text-amber-700">
                Your university is currently pending approval. Once approved by our team, you'll be able to create global document requests. 
                Please contact support if you need assistance with the approval process.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {loading ? <div>Loading...</div> : null}
      {!loading && !userProfile?.university_id && requests.length === 0 && (
        <div className="text-gray-500 mb-2">No university found for this user.</div>
      )}
      <ul className="space-y-4">
        {requests.map(req => (
          <li key={req.id} className="bg-slate-50 p-4 rounded shadow flex flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <span className="font-semibold">{req.title || ''}</span>
                <span className="block text-sm text-gray-600">{req.description || ''}</span>
                {req.due_date && <span className="block text-xs text-gray-500">Due date: {req.due_date}</span>}
                <span className="block text-xs text-gray-400">Created at: {req.created_at ? new Date(req.created_at).toLocaleString() : ''}</span>
                <span className="block text-xs text-gray-400">Status: {req.status || ''}</span>
              </div>
              {userProfile?.user_id && req.created_by === userProfile.user_id && (
                <button
                  className="text-blue-600 text-sm font-semibold px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 self-start"
                  onClick={() => {
                    setEditingRequest(req);
                    setEditForm({
                      title: req.title || '',
                      description: req.description || '',
                      attachment: null,
                      applicable_student_types: Array.isArray(req.applicable_student_types) && req.applicable_student_types.length > 0
                        ? req.applicable_student_types!
                        : ['all'],
                      status: (req.status as 'open' | 'closed') || 'open',
                    });
                  }}
                  title="Edit this global request"
                >
                  Edit
                </button>
              )}
            </div>
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
      {/* Modal de edição de request global */}
      {editingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-slate-200 animate-fade-in">
            <h3 className="font-extrabold text-xl mb-6 text-[#05294E] text-center">Edit Global Document Request</h3>
            {error && <div className="text-red-500 mb-4 text-center font-semibold">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="edit-title">Title <span className="text-red-500">*</span></label>
                <input
                  id="edit-title"
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base"
                  placeholder="Enter document title"
                  value={editForm.title}
                  onChange={e => setEditForm(r => ({ ...r, title: e.target.value }))}
                  disabled={creating}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="edit-desc">Description</label>
                <textarea
                  id="edit-desc"
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base min-h-[60px] resize-vertical"
                  placeholder="Describe the document or instructions (optional)"
                  value={editForm.description}
                  onChange={e => setEditForm(r => ({ ...r, description: e.target.value }))}
                  disabled={creating}
                />
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
                            ? editForm.applicable_student_types.length === STUDENT_TYPE_OPTIONS.length - 1
                            : editForm.applicable_student_types.includes(opt.value)
                        }
                        onChange={e => {
                          if (opt.value === 'all') {
                            if (e.target.checked) {
                              setEditForm(r => ({ ...r, applicable_student_types: STUDENT_TYPE_OPTIONS.filter(o => o.value !== 'all').map(o => o.value) }));
                            } else {
                              setEditForm(r => ({ ...r, applicable_student_types: [] }));
                            }
                          } else {
                            setEditForm(r => {
                              const next = r.applicable_student_types.includes(opt.value)
                                ? r.applicable_student_types.filter(v => v !== opt.value)
                                : [...r.applicable_student_types, opt.value];
                              return { ...r, applicable_student_types: next };
                            });
                          }
                        }}
                        disabled={creating}
                        className={opt.value === 'all' ? 'accent-blue-600 font-bold' : editForm.applicable_student_types.includes(opt.value) ? 'accent-blue-600' : ''}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="edit-status">Status</label>
                <select
                  id="edit-status"
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base"
                  value={editForm.status}
                  onChange={e => setEditForm(r => ({ ...r, status: e.target.value as 'open' | 'closed' }))}
                  disabled={creating}
                >
                  <option value="open">open</option>
                  <option value="closed">closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="edit-attachment">Attachment</label>
                <div className="flex items-center gap-3">
                  <label htmlFor="edit-attachment" className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition font-medium text-blue-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828l6.586-6.586M16 5v6a2 2 0 002 2h6" /></svg>
                    <span>{editForm.attachment ? 'Change file' : 'Select file'}</span>
                    <input
                      id="edit-attachment"
                      type="file"
                      className="sr-only"
                      onChange={e => setEditForm(r => ({ ...r, attachment: e.target.files ? e.target.files[0] : null }))}
                      disabled={creating}
                    />
                  </label>
                  {editingRequest.attachment_url && !editForm.attachment && (
                    <span className="text-xs text-slate-500">Current: {editingRequest.attachment_url.split('/').pop()}</span>
                  )}
                  {editForm.attachment && (
                    <span className="text-xs text-slate-700 truncate max-w-[180px]">{editForm.attachment.name}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8 justify-center">
              <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-semibold transition" onClick={() => { setEditingRequest(null); setEditForm({ title: '', description: '', attachment: null, applicable_student_types: ['all'], status: 'open' }); }} disabled={creating}>
                Cancel
              </button>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow transition disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={async () => {
                  if (!editingRequest) return;
                  if (!editForm.title) { setError('Title is required'); return; }
                  setCreating(true);
                  setError(null);
                  try {
                    let attachment_url: string | undefined = editingRequest.attachment_url;
                    if (editForm.attachment) {
                      const { data, error } = await supabase.storage.from('document-attachments').upload(`global/${Date.now()}_${editForm.attachment.name}`, editForm.attachment);
                      if (error) {
                        setError('Failed to upload attachment: ' + error.message);
                        setCreating(false);
                        return;
                      }
                      attachment_url = data?.path;
                    }
                    const updatePayload: any = {
                      title: editForm.title,
                      description: editForm.description,
                      applicable_student_types: editForm.applicable_student_types,
                      attachment_url,
                      status: editForm.status,
                    };
                    const { error: updError } = await supabase
                      .from('document_requests')
                      .update(updatePayload)
                      .eq('id', editingRequest.id)
                      .eq('is_global', true)
                      .eq('university_id', userProfile?.university_id || '')
                      .eq('created_by', userProfile?.user_id || '');
                    if (updError) {
                      setError('Failed to update request: ' + updError.message);
                      setCreating(false);
                      return;
                    }
                    // Recarregar lista
                    const { data: updated } = await supabase
                      .from('document_requests')
                      .select('*')
                      .eq('is_global', true)
                      .eq('university_id', userProfile?.university_id)
                      .order('created_at', { ascending: false });
                    setRequests(updated || []);
                    setEditingRequest(null);
                    setEditForm({ title: '', description: '', attachment: null, applicable_student_types: ['all'], status: 'open' });
                  } catch (e: any) {
                    setError('Unexpected error: ' + (e.message || e));
                  } finally {
                    setCreating(false);
                  }
                }}
                disabled={creating}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversityGlobalDocumentRequests; 