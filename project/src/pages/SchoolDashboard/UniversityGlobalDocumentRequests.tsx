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
  const [isTutorialMinimized, setIsTutorialMinimized] = useState(() => {
    // Se nunca foi visitado antes, mostra o tutorial (false = expandido)
    // Se já foi minimizado antes, mantém minimizado (true = minimizado)
    const hasBeenMinimized = localStorage.getItem('globalDocRequestsTutorialMinimized');
    return hasBeenMinimized === 'true';
  });

  // Auto-minimize tutorial on small screens if user has no preference saved
  useEffect(() => {
    try {
      const hasPref = localStorage.getItem('globalDocRequestsTutorialMinimized');
      if (!hasPref && typeof window !== 'undefined') {
        if (window.innerWidth < 640) {
          setIsTutorialMinimized(true);
        }
      }
    } catch (e) {
      // ignore (localStorage may be unavailable in some environments)
    }
  }, []);

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

  // Função para minimizar/expandir tutorial
  const toggleTutorial = () => {
    const newState = !isTutorialMinimized;
    setIsTutorialMinimized(newState);
    
    // Só salva no localStorage quando o usuário minimiza pela primeira vez
    // Isso garante que a primeira visita sempre mostre o tutorial
    if (newState === true) {
      // Usuário está minimizando - salvar para não mostrar novamente por padrão
      localStorage.setItem('globalDocRequestsTutorialMinimized', 'true');
    } else {
      // Usuário está expandindo - não remover a preferência, apenas expandir agora
      // O tutorial continuará minimizado por padrão nas próximas visitas
    }
  };

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
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-10">
      {/* Tutorial/Instructions */}
      <div className="bg-gradient-to-r from-[#05294E]/5 to-slate-50 border-b border-slate-200">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 sm:w-10 sm:h-10 bg-[#05294E] rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-[#05294E] text-lg">Global Document Requests Guide</h3>
                <p className="text-slate-600 text-sm">Essential information for managing university-wide document requests</p>
              </div>
            </div>
            <button
              onClick={toggleTutorial}
              className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-[#05294E] hover:bg-white/50 rounded-lg transition-all duration-200"
              title={isTutorialMinimized ? "Expand guide" : "Minimize guide"}
            >
              <span className="text-sm font-medium">{isTutorialMinimized ? "Show Guide" : "Minimize"}</span>
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${isTutorialMinimized ? "rotate-180" : ""}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {!isTutorialMinimized && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-1">Best Practices</h4>
                      <p className="text-slate-600 text-sm">Request only university-specific documents that aren't part of standard applications.</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L2.732 15.5C1.962 16.333 2.924 18 4.462 18z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-1">Avoid Duplicates</h4>
                      <p className="text-slate-600 text-sm">Do not request common documents again (such as passport, bank statement, high school diploma, etc.) — these are already collected in the standard application process.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#05294E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  How It Works
                </h4>
                <ol className="list-decimal list-inside text-slate-600 text-sm space-y-1 ml-2">
                  <li>Create a new global request using the "New Global Request" button</li>
                  <li>Specify which student types need to provide the document</li>
                  <li>All applicable students will see the request and can upload documents</li>
                  <li>This page allows you to request documents from all students at your university in a centralized way.</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Main Content */}
      <div className="p-3 sm:p-6">
        <div className="flex sm:items-center sm:justify-between mb-6 flex-col sm:flex-row gap-4 sm:gap-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#05294E] mb-1">Document Requests</h2>
            <p className="text-slate-600 text-sm">Manage university-wide document collection</p>
          </div>
          <button 
            className={`w-full sm:w-auto px-4 sm:px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              isUniversityApproved 
                ? 'bg-[#05294E] hover:bg-[#041f3a] text-white shadow-md hover:shadow-lg hover:-translate-y-0.5' 
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
            onClick={() => isUniversityApproved && setShowNewModal(true)}
            disabled={!isUniversityApproved}
            title={!isUniversityApproved ? 'University approval required to create global document requests' : 'Create new global document request'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium">New Request</span>
          </button>
        </div>
      
        {/* Warning when university is not approved */}
        {!isUniversityApproved && (
          <div className="mb-6 bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L2.732 15.5C1.962 16.333 2.924 18 4.462 18z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 mb-1">University Approval Required</h3>
                <p className="text-amber-700 text-sm leading-relaxed">
                  Your university is currently pending approval. Once approved by our team, you'll be able to create global document requests. 
                  Please contact support if you need assistance with the approval process.
                </p>
              </div>
            </div>
          </div>
        )}
      
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-slate-600">
              <svg className="animate-spin h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Loading document requests...</span>
            </div>
          </div>
        )}

        {/* No University State */}
        {!loading && !userProfile?.university_id && requests.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H7m14 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v12a2 2 0 002 2h2m2 0V9a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2h-2zm-2-4h2v-2h-2v2zm0-6h2V9h-2v2zM7 19h2v-2H7v2z" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium">No university found for this user</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && requests.length === 0 && userProfile?.university_id && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-slate-800 font-semibold mb-2">No document requests yet</h3>
            <p className="text-slate-500 mb-6">Create your first global document request to start collecting university-specific documents from students.</p>
            {isUniversityApproved && (
              <button
                onClick={() => setShowNewModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#05294E] text-white rounded-lg hover:bg-[#041f3a] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create First Request
              </button>
            )}
          </div>
        )}

        {/* Requests List */}
        {!loading && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="bg-slate-50 rounded-xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 sm:space-x-4 mb-2 sm:mb-0 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#05294E] to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm sm:text-lg">
                        {req.title[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-lg font-semibold text-slate-900 truncate">
                        {req.title || 'Untitled Request'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600">
                        {req.description && (
                          <div className="flex items-center w-full">
                            <span className="mr-1 shrink-0">Description:</span>
                            <span className="block text-slate-600" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{req.description}</span>
                          </div>
                        )}
                        {req.due_date && (
                          <div className="flex items-center">
                            <span className="mr-1">Due Date:</span>
                            <span className="whitespace-nowrap">{new Date(req.due_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end space-x-3 sm:space-x-0 sm:space-y-2">
                    <span className={`inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium ${req.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {req.status === 'open' ? 'Open' : 'Closed'}
                    </span>
                    <div className="text-xs sm:text-sm text-slate-500 text-right">
                      Created: {new Date(req.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Modal de novo request */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-lg border border-slate-200 animate-fade-in max-h-[90vh] overflow-auto">
             <h3 className="font-extrabold text-lg sm:text-xl mb-4 sm:mb-6 text-[#05294E] text-center">New Global Document Request</h3>
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
            <div className="flex gap-3 mt-6 sm:mt-8 flex-col sm:flex-row justify-center">
              <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 justify-center" onClick={handleNewRequest} disabled={creating || !newRequest.title}>
                {creating ? (
                  <svg className="animate-spin h-5 w-5 mr-1 text-white" viewBox="0 0 24 24"></svg>
                ) : null}
                <span>{creating ? 'Creating...' : 'Create'}</span>
              </button>
              <button className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold transition" onClick={() => setShowNewModal(false)} disabled={creating}>
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