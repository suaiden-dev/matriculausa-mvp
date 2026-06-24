import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useUniversity } from '../../context/UniversityContext';
import { Paperclip } from 'lucide-react';

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
  applicable_scholarship_levels?: string[];
  requires_english?: boolean;
}

interface UniversityGlobalDocumentRequestsProps {
  isTabbed?: boolean;
}

const UniversityGlobalDocumentRequests: React.FC<UniversityGlobalDocumentRequestsProps> = ({ isTabbed = false }) => {
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
    { value: 'resident', label: 'Resident (U.S. Citizen / Green Card)' },
    { value: 'all', label: 'All Student Types' },
  ];
  const SCHOLARSHIP_LEVEL_OPTIONS = [
    { value: 'undergraduate', label: 'Undergraduate' },
    { value: 'graduate',      label: 'Graduate' },
    { value: 'doctorate',     label: 'Doctorate' },
    { value: 'all',           label: 'All Levels' },
  ];
  const [newRequest, setNewRequest] = useState({ title: '', description: '', attachment: null as File | null, applicable_student_types: [] as string[], applicable_scholarship_levels: ['undergraduate', 'graduate', 'doctorate'] as string[], requires_english: false });
  const [creating, setCreating] = useState(false);
  // Edição
  const [editingRequest, setEditingRequest] = useState<DocumentRequest | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; description: string; attachment: File | null; applicable_student_types: string[]; applicable_scholarship_levels: string[]; status: 'open' | 'closed'; requires_english: boolean }>({
    title: '',
    description: '',
    attachment: null,
    applicable_student_types: [],
    applicable_scholarship_levels: ['undergraduate', 'graduate', 'doctorate'],
    status: 'open',
    requires_english: false,
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

  const openEditModal = (request: DocumentRequest) => {
    // Sanitizar tipos legados: se houver tipos específicos, remover 'all'
    let sanitizedTypes = request.applicable_student_types || [];
    if (sanitizedTypes.includes('all') && sanitizedTypes.length > 1) {
      sanitizedTypes = sanitizedTypes.filter(t => t !== 'all');
    }

    setEditingRequest(request);
    setEditForm({
      title: request.title || '',
      description: request.description || '',
      attachment: null,
      applicable_student_types: sanitizedTypes,
      applicable_scholarship_levels: request.applicable_scholarship_levels?.length
        ? request.applicable_scholarship_levels
        : ['undergraduate', 'graduate', 'doctorate'],
      status: (request.status as 'open' | 'closed') || 'open',
      requires_english: request.requires_english ?? false,
    });
  };

  // Carrega os requests globais da universidade logada
  useEffect(() => {
    if (!university?.id) {
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
        .eq('university_id', university.id)
        .order('created_at', { ascending: false });
      console.log('[DEBUG] Requests retornados:', data);
      if (error) setError('Failed to fetch document requests');
      setRequests(data || []);
      setLoading(false);
    };
    fetchRequests();
  }, [university?.id]);

  const handleNewRequest = async () => {
    console.log('handleNewRequest called', { university, newRequest });
    
    // Verificar se a universidade está aprovada
    if (!isUniversityApproved) {
      setError('Your university must be approved before you can create global document requests. Please contact support for approval.');
      return;
    }
    
    if (!university?.id || !newRequest.title) {
      console.log('Blocked: missing university_id or title', { university, newRequest });
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
        university_id: university.id,
        is_global: true,
        created_by: userProfile?.user_id || university.user_id, // Usar university.user_id como fallback
        scholarship_application_id: null,
        applicable_student_types: newRequest.applicable_student_types,
        applicable_scholarship_levels: newRequest.applicable_scholarship_levels,
        requires_english: newRequest.requires_english,
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
      setNewRequest({ title: '', description: '', attachment: null, applicable_student_types: [], applicable_scholarship_levels: ['undergraduate', 'graduate', 'doctorate'], requires_english: false });
      // Recarregar lista
      const { data: updated, error: fetchError } = await supabase
        .from('document_requests')
        .select('*')
        .eq('is_global', true)
        .eq('university_id', university.id)
        .order('created_at', { ascending: false });
      setRequests(updated || []);
      if (fetchError) setError('Failed to refresh list: ' + fetchError.message);
    } catch (e: any) {
      setError('Unexpected error: ' + (e.message || e));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document request? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('document_requests')
        .delete()
        .eq('id', id)
        .eq('is_global', true)
        .eq('university_id', university?.id || '');

      if (error) {
        setError('Failed to delete request: ' + error.message);
        return;
      }

      // Atualizar lista localmente
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      setError('Unexpected error during deletion: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (request: DocumentRequest) => {
    const newStatus = request.status === 'open' ? 'closed' : 'open';
    
    try {
      // Atualizar localmente primeiro para feedback instantâneo (Optimistic UI)
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: newStatus } : r));

      const { error } = await supabase
        .from('document_requests')
        .update({ status: newStatus })
        .eq('id', request.id)
        .eq('is_global', true);

      if (error) {
        // Reverter em caso de erro
        setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: request.status } : r));
        setError('Failed to update status: ' + error.message);
      }
    } catch (err: any) {
      setError('Unexpected error updating status: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header + Tutorial Section */}
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="max-w-full mx-auto bg-slate-50">
            {/* Header: title + note + counter */}
            {/* Header: title + note + counter */}
            {!isTabbed && (
              <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">

                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                      Global Document Requests
                    </h1>
                  </div>
                  <p className="text-slate-600 text-sm sm:text-base">
                    Create and manage university-wide document collection requests for all students.
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    Request specific documents from students based on their application type and university requirements.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-300 shadow-sm">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {requests.length} Requests
                  </div>
                </div>
              </div>
            )}

            {/* Tutorial/Instructions */}
            <div className="border-t border-slate-200 bg-gradient-to-r from-[#05294E]/5 to-slate-50">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">


                  </div>
                  <button
                    onClick={toggleTutorial}
                    className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-[#05294E] hover:bg-white/50 rounded-lg transition-all duration-200"
                    title={isTutorialMinimized ? "Expand guide" : "Minimize guide"}
                  >
                    <span className="text-sm font-medium">{isTutorialMinimized ? "Show Guide" : "Minimize"}</span>
                    <svg 
                      className={`w-4 h-4 transition-transform duration-300 ease-in-out ${isTutorialMinimized ? "rotate-180" : ""}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
          
          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
            isTutorialMinimized ? 'max-h-0 opacity-0' : 'max-h-[800px] opacity-100'
          }`}>
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
          </div>
        </div>
      </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-200">
          <div className="flex sm:items-center sm:justify-between flex-col sm:flex-row gap-4 sm:gap-0">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">Document Requests</h2>
              <p className="text-slate-500 text-sm">Manage university-wide document collection</p>
            </div>
            <button 
              className={`w-full sm:w-auto px-4 sm:px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                isUniversityApproved 
                  ? 'bg-[#05294E] hover:bg-[#041f3a] text-white shadow-sm hover:shadow-md' 
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
        </div>

        <div className="p-4 sm:p-5 lg:p-6">
      
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
          {!loading && !university?.id && requests.length === 0 && (
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
          {!loading && requests.length === 0 && university?.id && (
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
            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req.id} className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-[#05294E]/30 hover:shadow-md transition-all duration-300 group">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    
                    {/* Column 1: Document Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#05294E] to-blue-700 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <span className="text-white font-bold text-lg">
                          {req.title[0].toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 mb-1 truncate group-hover:text-[#05294E] transition-colors">
                          {req.title || 'Untitled Request'}
                        </h3>
                        
                        <div className="space-y-1.5">
                          {req.description && (
                            <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                              {req.description}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                            {req.due_date && (
                              <div className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Due: {new Date(req.due_date).toLocaleDateString()}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Added {new Date(req.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Student Types Tags */}
                          {req.applicable_student_types && req.applicable_student_types.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {req.applicable_student_types.map((type: string) => {
                                const option = STUDENT_TYPE_OPTIONS.find(opt => opt.value === type);
                                const label = option ? option.label.split(' (')[0] : type;
                                return (
                                  <span
                                    key={type}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider"
                                  >
                                    {label}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {/* Scholarship Level Tags — só mostra quando não é "todos os níveis" */}
                          {req.applicable_scholarship_levels && req.applicable_scholarship_levels.length > 0 && req.applicable_scholarship_levels.length < 3 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {req.applicable_scholarship_levels.map((level: string) => (
                                <span
                                  key={level}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 uppercase tracking-wider"
                                >
                                  {level}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Status Toggle (Centered on Desktop) */}
                    <div className="flex lg:flex-col items-center justify-between lg:justify-center p-3 lg:p-4 bg-slate-50 rounded-2xl border border-slate-100 min-w-[140px]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0 lg:mb-2">Visibility</span>
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => handleToggleStatus(req)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
                            req.status === 'open' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300'
                          }`}
                          title={req.status === 'open' ? 'Click to close request' : 'Click to open request'}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
                              req.status === 'open' ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${req.status === 'open' ? 'text-green-600' : 'text-slate-500'}`}>
                          {req.status === 'open' ? 'Open' : 'Closed'}
                        </span>
                      </div>
                    </div>

                    {/* Column 3: Actions */}
                    <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(req)}
                          className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 border border-transparent hover:border-blue-100 shadow-sm hover:shadow"
                          title="Edit Request"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteRequest(req.id)}
                          className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 border border-transparent hover:border-red-100 shadow-sm hover:shadow"
                          title="Delete Request"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Modal de novo request */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-lg border border-slate-200 animate-fade-in max-h-[90vh] overflow-auto">
             <h3 className="font-bold text-lg sm:text-xl mb-4 sm:mb-6 text-slate-900 text-center">New Global Document Request</h3>
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
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newRequest.requires_english}
                    onChange={e => setNewRequest(r => ({ ...r, requires_english: e.target.checked }))}
                    disabled={creating}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span className="text-sm font-semibold text-slate-700">
                    This document must be in English
                  </span>
                </label>
                <p className="text-xs text-slate-500 mt-1 ml-6">Students will see a warning when uploading this document.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="global-attachment">Attachment</label>
                <div className="flex items-center gap-3">
                  <label htmlFor="global-attachment" className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition font-medium text-blue-700">
                    <Paperclip className="h-5 w-5" />
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
                    <span className="text-xs text-slate-700 truncate max-w-[180px]">{newRequest.attachment?.name}</span>
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
                              const withoutAll = r.applicable_student_types.filter(v => v !== 'all');
                              const updated = withoutAll.includes(opt.value)
                                ? withoutAll.filter(v => v !== opt.value)
                                : [...withoutAll, opt.value];
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
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Scholarship Level <span className="text-red-500">*</span></label>
                <div className="flex flex-col gap-2">
                  {SCHOLARSHIP_LEVEL_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          opt.value === 'all'
                            ? newRequest.applicable_scholarship_levels.length === SCHOLARSHIP_LEVEL_OPTIONS.length - 1
                            : newRequest.applicable_scholarship_levels.includes(opt.value)
                        }
                        onChange={e => {
                          if (opt.value === 'all') {
                            if (e.target.checked) {
                              setNewRequest(r => ({ ...r, applicable_scholarship_levels: SCHOLARSHIP_LEVEL_OPTIONS.filter(o => o.value !== 'all').map(o => o.value) }));
                            } else {
                              setNewRequest(r => ({ ...r, applicable_scholarship_levels: [] }));
                            }
                          } else {
                            setNewRequest(r => {
                              const updated = r.applicable_scholarship_levels.includes(opt.value)
                                ? r.applicable_scholarship_levels.filter(v => v !== opt.value)
                                : [...r.applicable_scholarship_levels, opt.value];
                              return { ...r, applicable_scholarship_levels: updated };
                            });
                          }
                        }}
                        disabled={creating}
                        className={opt.value === 'all' ? 'accent-blue-600 font-bold' : newRequest.applicable_scholarship_levels.includes(opt.value) ? 'accent-blue-600' : ''}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6 sm:mt-8 flex-col sm:flex-row justify-center">
              <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 justify-center" onClick={handleNewRequest} disabled={creating || !newRequest.title || newRequest.applicable_student_types.length === 0 || newRequest.applicable_scholarship_levels.length === 0}>
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
            <h3 className="font-bold text-lg sm:text-xl mb-6 text-slate-900 text-center">Edit Global Document Request</h3>
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
                              const withoutAll = r.applicable_student_types.filter(v => v !== 'all');
                              const next = withoutAll.includes(opt.value)
                                ? withoutAll.filter(v => v !== opt.value)
                                : [...withoutAll, opt.value];
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
                <label className="block text-sm font-semibold text-slate-700 mb-1">Scholarship Level <span className="text-red-500">*</span></label>
                <div className="flex flex-col gap-2">
                  {SCHOLARSHIP_LEVEL_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          opt.value === 'all'
                            ? editForm.applicable_scholarship_levels.length === SCHOLARSHIP_LEVEL_OPTIONS.length - 1
                            : editForm.applicable_scholarship_levels.includes(opt.value)
                        }
                        onChange={e => {
                          if (opt.value === 'all') {
                            if (e.target.checked) {
                              setEditForm(r => ({ ...r, applicable_scholarship_levels: SCHOLARSHIP_LEVEL_OPTIONS.filter(o => o.value !== 'all').map(o => o.value) }));
                            } else {
                              setEditForm(r => ({ ...r, applicable_scholarship_levels: [] }));
                            }
                          } else {
                            setEditForm(r => {
                              const updated = r.applicable_scholarship_levels.includes(opt.value)
                                ? r.applicable_scholarship_levels.filter(v => v !== opt.value)
                                : [...r.applicable_scholarship_levels, opt.value];
                              return { ...r, applicable_scholarship_levels: updated };
                            });
                          }
                        }}
                        disabled={creating}
                        className={opt.value === 'all' ? 'accent-blue-600 font-bold' : editForm.applicable_scholarship_levels.includes(opt.value) ? 'accent-blue-600' : ''}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editForm.requires_english}
                    onChange={e => setEditForm(r => ({ ...r, requires_english: e.target.checked }))}
                    disabled={creating}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span className="text-sm font-semibold text-slate-700">
                    This document must be in English
                  </span>
                </label>
                <p className="text-xs text-slate-500 mt-1 ml-6">Students will see a warning when uploading this document.</p>
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
                    <Paperclip className="h-5 w-5" />
                    <span>{editForm.attachment ? 'Change file' : 'Select file'}</span>
                    <input
                      id="edit-attachment"
                      type="file"
                      className="sr-only"
                      onChange={e => setEditForm(r => ({ ...r, attachment: e.target.files ? e.target.files[0] : null }))}
                      disabled={creating}
                    />
                  </label>
                  {editingRequest?.attachment_url && !editForm.attachment && (
                    <span className="text-xs text-slate-500">Current: {editingRequest.attachment_url?.split('/').pop()}</span>
                  )}
                  {editForm.attachment && (
                    <span className="text-xs text-slate-700 truncate max-w-[180px]">{editForm.attachment?.name}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8 justify-center">
              <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-semibold transition" onClick={() => { setEditingRequest(null); setEditForm({ title: '', description: '', attachment: null, applicable_student_types: [], applicable_scholarship_levels: ['undergraduate', 'graduate', 'doctorate'], status: 'open' }); }} disabled={creating}>
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
                      applicable_scholarship_levels: editForm.applicable_scholarship_levels,
                      requires_english: editForm.requires_english,
                      attachment_url,
                      status: editForm.status,
                    };
                    const { error: updError } = await supabase
                      .from('document_requests')
                      .update(updatePayload)
                      .eq('id', editingRequest.id)
                      .eq('is_global', true)
                      .eq('university_id', university?.id || '')
                      .eq('created_by', userProfile?.user_id || university?.user_id || '');
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
                      .eq('university_id', university?.id)
                      .order('created_at', { ascending: false });
                    setRequests(updated || []);
                    setEditingRequest(null);
                    setEditForm({ title: '', description: '', attachment: null, applicable_student_types: [], applicable_scholarship_levels: ['undergraduate', 'graduate', 'doctorate'], status: 'open' });
                  } catch (e: any) {
                    setError('Unexpected error: ' + (e.message || e));
                  } finally {
                    setCreating(false);
                  }
                }}
                disabled={creating || !editForm.title || editForm.applicable_student_types.length === 0}
              >
                {creating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversityGlobalDocumentRequests;