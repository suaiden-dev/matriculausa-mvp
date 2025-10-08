import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface DocumentsViewProps {
  studentDocuments: any[];
  documentRequests: any[];
  scholarshipApplication: any;
  studentId?: string;
  onViewDocument: (doc: any) => void;
  onDownloadDocument: (doc: any) => void;
  onUploadDocument?: (requestId: string, file: File) => void;
  onApproveDocument?: (uploadId: string) => void;
  onRejectDocument?: (uploadId: string, reason: string) => void;
  onEditTemplate?: (requestId: string, currentTemplate: string | null) => void;
  isAdmin?: boolean;
  uploadingStates?: {[key: string]: boolean};
  approvingStates?: {[key: string]: boolean};
  rejectingStates?: {[key: string]: boolean};
}

const DocumentsView: React.FC<DocumentsViewProps> = ({
  studentDocuments,
  documentRequests,
  scholarshipApplication,
  studentId,
  onViewDocument,
  onDownloadDocument,
  onUploadDocument,
  onApproveDocument,
  onRejectDocument,
  onEditTemplate,
  isAdmin = false,
  uploadingStates = {},
  approvingStates = {},
  rejectingStates = {}
}) => {
  const [realScholarshipApplication, setRealScholarshipApplication] = useState<any>(null);
  const [loadingApplication, setLoadingApplication] = useState(false);
  const [internalDocumentRequests, setInternalDocumentRequests] = useState<any[]>([]);
  const [acceptanceLetterFile, setAcceptanceLetterFile] = useState<File | null>(null);
  const [uploadingAcceptanceLetter, setUploadingAcceptanceLetter] = useState(false);
  const [markSentSuccess, setMarkSentSuccess] = useState<string | null>(null);
  
  // Estados para modal de rejeição
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [pendingRejectUploadId, setPendingRejectUploadId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Função para abrir modal de rejeição
  const handleRejectClick = (uploadId: string) => {
    setPendingRejectUploadId(uploadId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  // Função para confirmar rejeição
  const handleConfirmReject = () => {
    if (pendingRejectUploadId && onRejectDocument && rejectReason.trim()) {
      onRejectDocument(pendingRejectUploadId, rejectReason.trim());
      setShowRejectModal(false);
      setPendingRejectUploadId(null);
      setRejectReason('');
    }
  };

  // Função para cancelar rejeição
  const handleCancelReject = () => {
    setShowRejectModal(false);
    setPendingRejectUploadId(null);
    setRejectReason('');
  };

  // Utilitário para logar ação de acceptance letter (admin)
  const logAcceptanceAction = async (
    actionType: 'acceptance_letter_sent' | 'acceptance_letter_replaced',
    description: string,
    targetApplicationId: string,
    acceptanceUrl: string | null
  ) => {
    try {
      // Descobrir profile_id do estudante
      let profileId: string | null = null;
      if (currentApplication?.student_id) {
        profileId = currentApplication.student_id;
      } else if (studentId) {
        // Tentar mapear user_id -> profile_id
        const { data: upByUser } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', studentId as string)
          .maybeSingle();
        if (upByUser?.id) profileId = upByUser.id;
        if (!profileId) {
          const { data: upById } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', studentId as string)
            .maybeSingle();
          if (upById?.id) profileId = upById.id;
        }
      }

      if (!profileId) return;

      const { data: { user } } = await supabase.auth.getUser();
      const performedBy = user?.id || '';
      await supabase.rpc('log_student_action', {
        p_student_id: profileId,
        p_action_type: actionType,
        p_action_description: description,
        p_performed_by: performedBy,
        p_performed_by_type: 'admin',
        p_metadata: {
          application_id: targetApplicationId,
          acceptance_letter_url: acceptanceUrl
        }
      });
    } catch (e) {
      // Apenas logar no console; não bloquear UX
      console.error('Failed to log acceptance letter action:', e);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  // Função para buscar document requests internamente
  const fetchDocumentRequests = async (applicationId: string, universityId?: string) => {
    if (!applicationId) return;
    
    try {
      // Fetching document requests for application
      
      let allRequests: any[] = [];
      
      // Buscar requests específicos para a aplicação
      const { data: specificRequests, error: specificError } = await supabase
        .from('document_requests')
        .select(`
          *,
          document_request_uploads (
            *,
            reviewed_by,
            reviewed_at
          )
        `)
        .eq('scholarship_application_id', applicationId)
        .order('created_at', { ascending: false });

      if (specificError) throw specificError;
      allRequests = [...allRequests, ...(specificRequests || [])];
      
      // Buscar requests globais se tivermos university_id
      if (universityId) {
        // Fetching global requests for university
        const { data: globalRequests, error: globalError } = await supabase
          .from('document_requests')
          .select(`
            *,
            document_request_uploads (
              *,
              reviewed_by,
              reviewed_at
            )
          `)
          .eq('is_global', true)
          .eq('university_id', universityId)
          .order('created_at', { ascending: false });

        if (globalError) {
          console.error('❌ [DOCUMENTS VIEW] Error fetching global requests:', globalError);
          throw globalError;
        }
        // Global requests found
        allRequests = [...allRequests, ...(globalRequests || [])];
      } else {
        // No university_id provided, skipping global requests
      }
      
      // Remover busca de TODOS os requests globais - apenas mostrar os específicos do aluno

      // Found document requests
      setInternalDocumentRequests(allRequests);
    } catch (error) {
      console.error('❌ [DOCUMENTS VIEW] Error fetching document requests:', error);
    }
  };

  // Buscar a aplicação real do banco se não tivermos dados completos
  useEffect(() => {
    const fetchRealApplication = async () => {
      // Se já temos uma aplicação com acceptance letter, não precisamos buscar
      if (scholarshipApplication?.acceptance_letter_url) {
        setRealScholarshipApplication(scholarshipApplication);
        return;
      }

      // Se não temos studentId, não podemos buscar aplicação específica
      if (!studentId) {
        // No studentId provided, cannot fetch specific application
        setRealScholarshipApplication(null);
        return;
      }

      // Sempre tentar buscar a aplicação se não temos uma com acceptance letter
      if (!scholarshipApplication?.acceptance_letter_url) {
        setLoadingApplication(true);
        try {
          // Searching for application for specific student
          
          // Verificar se studentId é user_id ou profile_id
          let profileData: any = null;
          let profileError: any = null;
          
          // Primeiro, tentar como user_id
          const { data: userProfileData, error: userProfileError } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('user_id', studentId)
            .single();
          
          if (!userProfileError && userProfileData) {
            profileData = userProfileData;
          } else {
            // Se não encontrou como user_id, tentar como profile_id (id)
            const { data: profileIdData, error: profileIdError } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('id', studentId)
              .single();
            
            if (!profileIdError && profileIdData) {
              profileData = profileIdData;
            } else {
              profileError = profileIdError;
            }
          }
          
          if (profileError || !profileData) {
            console.error('❌ [DOCUMENTS VIEW] Error loading profile for student:', studentId, profileError);
            setRealScholarshipApplication(null);
            return;
          }
          
          // Found profile_id for student
          
          let applications: any[] = [];
          let error: any = null;
          
          // Primeiro, tentar buscar pela aplicação existente se fornecida
          if (scholarshipApplication?.id) {
            const { data, error: appError } = await supabase
              .from('scholarship_applications')
              .select(`
                *,
                scholarships(
                  id,
                  title,
                  universities(
                    id,
                    name
                  )
                )
              `)
              .eq('id', scholarshipApplication.id)
              .single();
            
            if (!appError && data) {
              applications = [data];
            }
          }
          
          // Se não encontrou pela aplicação existente, buscar a aplicação do estudante específico
          if (!applications || applications.length === 0) {
            const { data: studentApp, error: studentAppError } = await supabase
              .from('scholarship_applications')
              .select(`
                *,
                scholarships(
                  id,
                  title,
                  universities(
                  id,
                  name
                )
              )
            `)
            .eq('student_id', profileData.id)
            .order('acceptance_letter_url', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(1);
          
            if (!studentAppError && studentApp && studentApp.length > 0) {
              applications = studentApp;
              error = null;
            } else {
              // Fallback: buscar aplicação do MESMO estudante com application fee pago
              const { data, error: paidAppError } = await supabase
                .from('scholarship_applications')
                .select(`
                  *,
                  scholarships(
                    id,
                    title,
                    universities(
                      id,
                      name
                    )
                  )
                `)
                .eq('student_id', profileData.id)
                .eq('is_application_fee_paid', true)
                .order('acceptance_letter_url', { ascending: false, nullsFirst: false })
                .order('created_at', { ascending: false })
                .limit(1);
            
              if (!paidAppError && data && data.length > 0) {
                applications = data;
                error = null;
              } else {
                // Último fallback: buscar a mais recente do MESMO estudante
                const { data, error: recentError } = await supabase
                  .from('scholarship_applications')
                  .select(`
                    *,
                    scholarships(
                      id,
                      title,
                      universities(
                        id,
                        name
                      )
                    )
                  `)
                  .eq('student_id', profileData.id)
                  .order('created_at', { ascending: false })
                  .limit(1);
                
                applications = data || [];
                error = recentError;
              }
            }
          }

          if (!error && applications && applications.length > 0) {
            const app = applications[0];
            // Found application for student
            setRealScholarshipApplication(app);
            
            // Sempre buscar document requests para garantir que temos global requests
            const universityId = app.scholarships?.universities?.id;
            // University ID from app
            await fetchDocumentRequests(app.id, universityId);
          } else {
            // No application found for student
            setRealScholarshipApplication(null);
          }
        } catch (err) {
          console.error('❌ [DOCUMENTS VIEW] Error fetching application:', err);
          setRealScholarshipApplication(null);
        } finally {
          setLoadingApplication(false);
        }
      }
    };

    fetchRealApplication();
  }, [scholarshipApplication, studentDocuments, studentId]);

  // Usar a aplicação real se disponível, senão usar a passada como prop
  const currentApplication = realScholarshipApplication || scholarshipApplication;
  
  // Debug: Log para verificar se há acceptance letter (removido para performance)
  
  // ✅ CORREÇÃO: Função para extrair nome do arquivo e construir URL completa
  const getDocumentInfo = (upload: any) => {
    // Extrair nome do arquivo do file_url
    let filename = 'Document';
    let fullUrl = upload.file_url;
    
    if (upload.file_url) {
      const urlParts = upload.file_url.split('/');
      filename = urlParts[urlParts.length - 1] || 'Document';
      
      // Se é apenas um path (não começa com http), converter para URL completa
      if (!upload.file_url.startsWith('http')) {
        const baseUrl = 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/document-attachments/';
        fullUrl = `${baseUrl}${upload.file_url}`;
      }
    }
    
    return {
      filename,
      fullUrl
    };
  };

  // Função para obter URL correta do acceptance letter
  const getAcceptanceLetterUrl = (application: any) => {
    if (!application?.acceptance_letter_url) return null;
    
    // Se já é uma URL completa, usar diretamente
    if (application.acceptance_letter_url.startsWith('http')) {
      return application.acceptance_letter_url;
    }
    
    // Se é um path do storage, construir URL completa
    // O acceptance letter está no bucket 'document-attachments'
    const baseUrl = 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/document-attachments/';
    return `${baseUrl}${application.acceptance_letter_url}`;
  };

  return (
    <div className="space-y-8">
      {/* Document Requests from University */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200">
        <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-5 rounded-t-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-start sm:items-center space-x-4 min-w-0">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-white break-words">Document Requests</h3>
                <p className="text-slate-200 text-sm break-words">Documents requested by the university for your application</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {(() => {
            // Combinar document requests da prop com os internos para garantir global requests
            const propRequests = documentRequests || [];
            const internalRequests = internalDocumentRequests || [];
            
            // Criar um mapa para evitar duplicatas
            const requestsMap = new Map();
            
            // Adicionar requests da prop
            propRequests.forEach(request => {
              if (request.id !== 'acceptance_letter') {
                requestsMap.set(request.id, request);
              }
            });
            
            // Adicionar requests internos (global requests)
            internalRequests.forEach(request => {
              if (request.id !== 'acceptance_letter') {
                requestsMap.set(request.id, request);
              }
            });
            
            const allRequests = Array.from(requestsMap.values());
            
            // Combined requests
            
            return allRequests;
          })().length > 0 ? (
            <div className="space-y-4">
              {(() => {
                // Usar a mesma lógica de combinação
                const propRequests = documentRequests || [];
                const internalRequests = internalDocumentRequests || [];
                
                const requestsMap = new Map();
                
                propRequests.forEach(request => {
                  if (request.id !== 'acceptance_letter') {
                    requestsMap.set(request.id, request);
                  }
                });
                
                internalRequests.forEach(request => {
                  if (request.id !== 'acceptance_letter') {
                    requestsMap.set(request.id, request);
                  }
                });
                
                return Array.from(requestsMap.values());
              })().map((request) => (
                <div key={request.id} className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 mb-1">
                        <h4 className="text-lg font-semibold text-slate-900 break-words">
                          {request.title || 'Document Request'}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          request.is_global ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {request.is_global ? 'Global Request' : 'Individual Request'}
                        </span>
                      </div>
                      {request.description && (
                        <p className="text-sm text-slate-600 mt-1 break-words">
                          {request.description}
                        </p>
                      )}
                      {request.due_date && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center whitespace-nowrap">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 01-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Due: {formatDate(request.due_date)}
                        </p>
                      )}
                      
                      {request.attachment_url ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => onViewDocument({ file_url: request.attachment_url, type: 'template' })}
                            className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm flex items-center justify-center space-x-2 w-full sm:w-auto"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>View Template</span>
                          </button>
                          {isAdmin && onEditTemplate && (
                            <button
                              onClick={() => onEditTemplate(request.id, request.attachment_url)}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-medium transition-colors shadow-sm flex items-center justify-center space-x-2 w-full sm:w-auto"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit Template</span>
                            </button>
                          )}
                        </div>
                      ) : isAdmin && onEditTemplate && (
                        <div className="mt-3">
                          <button
                            onClick={() => onEditTemplate(request.id, null)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-medium transition-colors shadow-sm flex items-center justify-center space-x-2 w-full sm:w-auto"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add Template</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Documents Submitted by Student */}
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <h5 className="text-sm font-medium text-slate-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Student Response:
                    </h5>
                    
                    <div className="bg-white border border-slate-200 rounded-2xl p-4">
                      {request.document_request_uploads && request.document_request_uploads.length > 0 ? (
                        request.document_request_uploads.map((upload: any) => {
                          const { filename, fullUrl } = getDocumentInfo(upload);
                          return (
                            <div key={upload.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 last:mb-0">
                              <div className="flex items-start sm:items-center space-x-4 min-w-0">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-900 break-words">{filename}</p>
                                  <p className="text-sm text-slate-500">
                                    Submitted on {formatDate(upload.uploaded_at)}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-1 break-words">
                                    Response to: {request.title || 'Document Request'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:space-x-3 sm:self-auto self-start mt-3 sm:mt-0 items-center">
                                <span className={`px-3 py-1 rounded text-sm font-medium whitespace-nowrap ${
                                  upload.status === 'approved' ? 'text-green-600' :
                                  upload.status === 'rejected' ? 'text-red-600' :
                                  upload.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-slate-100 text-slate-800'
                                }`}>
                                  {upload.status === 'approved' ? 'Approved' :
                                   upload.status === 'rejected' ? 'Rejected' :
                                   upload.status === 'under_review' ? 'Under Review' :
                                   'Pending'}
                                </span>
                                
                                <button
                                  onClick={() => onViewDocument({
                                    ...upload,
                                    file_url: fullUrl,
                                    filename
                                  })}
                                  className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap text-center"
                                >
                                  View
                                </button>
                                
                                <button
                                  onClick={() => onDownloadDocument({
                                    ...upload,
                                    file_url: fullUrl,
                                    filename
                                  })}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap text-center"
                                >
                                  Download
                                </button>
                                
                                {/* Admin Action Buttons - Only show for admin and if document is under review */}
                                {isAdmin && upload.status === 'under_review' && (
                                  <div className="flex gap-2">
                                    {onApproveDocument && (
                                      <button
                                        onClick={() => onApproveDocument(upload.id)}
                                        disabled={approvingStates[`approve-${upload.id}`]}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap text-center disabled:cursor-not-allowed"
                                      >
                                        {approvingStates[`approve-${upload.id}`] ? 'Approving...' : 'Approve'}
                                      </button>
                                    )}
                                    
                                    {onRejectDocument && (
                                      <button
                                        onClick={() => handleRejectClick(upload.id)}
                                        disabled={rejectingStates[`reject-${upload.id}`]}
                                        className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap text-center disabled:cursor-not-allowed"
                                      >
                                        {rejectingStates[`reject-${upload.id}`] ? 'Rejecting...' : 'Reject'}
                                      </button>
                                    )}
                                  </div>
                                )}
                                
                                {/* Show rejection reason if document is rejected */}
                                {upload.status === 'rejected' && upload.rejection_reason && (
                                  <div className="w-full mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                    <p className="text-xs font-medium text-slate-600 mb-1">Rejection reason:</p>
                                    <p className="text-sm text-slate-700 leading-relaxed">{upload.rejection_reason}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-slate-500">No response submitted yet</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Upload Section */}
                  {isAdmin && onUploadDocument && (
                    <div className="border-t border-slate-200 pt-4 mt-4">
                      <h5 className="text-sm font-medium text-slate-700 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Admin Upload:
                      </h5>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                        <div className="flex flex-col sm:flex-row items-start gap-3">
                          <div className="flex-1">
                            <p className="text-sm text-slate-600 mb-2">
                              Upload a document on behalf of the student for this request.
                            </p>
                            <label className="inline-flex items-center px-4 py-2 bg-[#05294E] hover:bg-[#041f38] text-white text-sm font-medium rounded-xl cursor-pointer transition-colors">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              {uploadingStates[`request-${request.id}`] ? 'Uploading...' : 'Upload Document'}
                              <input
                                type="file"
                                accept="application/pdf,image/*,.doc,.docx"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    onUploadDocument(request.id, file);
                                    e.target.value = ''; // Reset input
                                  }
                                }}
                                disabled={uploadingStates[`request-${request.id}`]}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No document requests yet</h3>
              <p className="text-slate-500 max-w-md mx-auto">Document requests from the university will appear here once they are created for your application.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Acceptance Letter Section - Always visible */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-5 rounded-t-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-start sm:items-center space-x-4 min-w-0">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="w-6 h-6 text-[#05294E]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-white break-words">Acceptance Letter</h3>
                <p className="text-blue-100 text-sm break-words">Official acceptance letter from the university</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {loadingApplication && !currentApplication?.acceptance_letter_url ? (
            <div className="bg-white rounded-3xl p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
                </div>
                <h4 className="text-lg font-semibold text-slate-700 mb-2">Loading application...</h4>
                <p className="text-slate-500">Please wait while we fetch your application details.</p>
              </div>
            </div>
          ) : currentApplication && currentApplication.acceptance_letter_url ? (
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 mb-1">
                    <p className="font-medium text-slate-900 break-words">
                      {(() => {
                        const url = getAcceptanceLetterUrl(currentApplication);
                        return url ? (url.split('/').pop() || 'Acceptance Letter') : 'Acceptance Letter';
                      })()}
                    </p>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 whitespace-nowrap">
                      Available
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 break-words">
                    Sent on {formatDate(currentApplication.acceptance_letter_sent_at)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 break-words">
                    Official university acceptance document
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <button
                      onClick={() => onViewDocument({
                        file_url: getAcceptanceLetterUrl(currentApplication),
                        filename: (getAcceptanceLetterUrl(currentApplication)?.split('/').pop() || 'Acceptance Letter')
                      })}
                      className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors w-full sm:w-auto text-center"
                    >
                      View
                    </button>
                    
                    <button
                      onClick={() => onDownloadDocument({
                        file_url: getAcceptanceLetterUrl(currentApplication),
                        filename: (getAcceptanceLetterUrl(currentApplication)?.split('/').pop() || 'Acceptance Letter')
                      })}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors w-full sm:w-auto text-center"
                    >
                      Download
                    </button>
                    {isAdmin && (
                      <label className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl cursor-pointer transition-colors w-full sm:w-auto text-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        {uploadingAcceptanceLetter ? 'Replacing...' : (acceptanceLetterFile ? 'Change file' : 'Replace Letter')}
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => setAcceptanceLetterFile(e.target.files ? e.target.files[0] : null)}
                          disabled={uploadingAcceptanceLetter}
                        />
                      </label>
                    )}
                  </div>
                  {isAdmin && acceptanceLetterFile && (
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={async () => {
                          if (!currentApplication?.id || !studentId || !acceptanceLetterFile) return;
                          try {
                            setUploadingAcceptanceLetter(true);
                            const sanitized = acceptanceLetterFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                            const storageKey = `acceptance_letters/${Date.now()}_${sanitized}`;
                            const { data: uploadData, error: uploadError } = await supabase.storage
                              .from('document-attachments')
                              .upload(storageKey, acceptanceLetterFile);
                            if (uploadError) throw uploadError;
                            const { data: { publicUrl } } = supabase.storage
                              .from('document-attachments')
                              .getPublicUrl(uploadData?.path || storageKey);

                            const { error: updateError } = await supabase
                              .from('scholarship_applications')
                              .update({
                                acceptance_letter_url: publicUrl,
                                acceptance_letter_status: 'sent',
                                acceptance_letter_sent_at: new Date().toISOString()
                              })
                              .eq('id', currentApplication.id);
                            if (updateError) throw updateError;

                            setRealScholarshipApplication((prev: any) => prev ? ({
                              ...prev,
                              acceptance_letter_url: publicUrl,
                              acceptance_letter_status: 'sent',
                              acceptance_letter_sent_at: new Date().toISOString()
                            }) : prev);

                            // Log: acceptance letter substituída/enviada novamente
                            await logAcceptanceAction(
                              'acceptance_letter_replaced',
                              'Acceptance letter replaced by admin',
                              currentApplication.id,
                              publicUrl
                            );

                            try {
                              const { data: { session } } = await supabase.auth.getSession();
                              const accessToken = session?.access_token;
                              if (accessToken) {
                                const FUNCTIONS_URL = (import.meta as any).env.VITE_SUPABASE_FUNCTIONS_URL as string;
                                await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${accessToken}`
                                  },
                                  body: JSON.stringify({
                                    user_id: studentId,
                                    title: 'Acceptance letter sent',
                                    message: 'Your acceptance letter was sent. Check your dashboard for details.',
                                    type: 'acceptance_letter_sent',
                                    link: '/student/dashboard'
                                  })
                                });
                              }
                            } catch { /* ignore notify errors */ }

                            setAcceptanceLetterFile(null);
                          } catch (err) {
                            console.error('Error replacing acceptance letter:', err);
                          } finally {
                            setUploadingAcceptanceLetter(false);
                          }
                        }}
                        disabled={uploadingAcceptanceLetter}
                        className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                      >
                        {uploadingAcceptanceLetter ? 'Saving...' : 'Confirm Replace'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-700 mb-2">No Acceptance Letter Yet</h4>
                <p className="text-slate-500 max-w-md mx-auto">
                  Your acceptance letter will appear here once the university processes your application and sends it to you.
                </p>
                <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Please wait for the university to send your acceptance letter</span>
                </div>
                {isAdmin && (
                  <div className="mt-6">
                    <div className="flex items-center justify-center gap-3">
                      <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition font-medium text-slate-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span>{acceptanceLetterFile ? 'Change file' : 'Select file'}</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => setAcceptanceLetterFile(e.target.files ? e.target.files[0] : null)}
                          disabled={uploadingAcceptanceLetter}
                        />
                      </label>
                      {acceptanceLetterFile && (
                        <span className="text-xs text-slate-700 truncate max-w-[240px]">{acceptanceLetterFile.name}</span>
                      )}
                    </div>
                    <div className="flex justify-center mt-3 gap-3 flex-wrap">
                      <button
                        onClick={async () => {
                          if (!acceptanceLetterFile || !studentId) return;
                          try {
                            setUploadingAcceptanceLetter(true);
                            const sanitized = acceptanceLetterFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                            const storageKey = `acceptance_letters/${Date.now()}_${sanitized}`;
                            const { data: uploadData, error: uploadError } = await supabase.storage
                              .from('document-attachments')
                              .upload(storageKey, acceptanceLetterFile);
                            if (uploadError) throw uploadError;
                            const { data: { publicUrl } } = supabase.storage
                              .from('document-attachments')
                              .getPublicUrl(uploadData?.path || storageKey);

                            // Se não temos currentApplication ainda, tentar buscar o mais recente
                            let applicationId = currentApplication?.id;
                            if (!applicationId && realScholarshipApplication?.id) applicationId = realScholarshipApplication.id;

                            if (!applicationId) {
                              // Buscar a aplicação mais recente do perfil
                              const { data: apps } = await supabase
                                .from('scholarship_applications')
                                .select('id')
                                .order('created_at', { ascending: false })
                                .limit(1);
                              applicationId = apps?.[0]?.id;
                            }

                            if (!applicationId) throw new Error('No application found for this student');

                            const { error: updateError } = await supabase
                              .from('scholarship_applications')
                              .update({
                                acceptance_letter_url: publicUrl,
                                acceptance_letter_status: 'sent',
                                acceptance_letter_sent_at: new Date().toISOString()
                              })
                              .eq('id', applicationId);
                            if (updateError) throw updateError;

                            // Log: acceptance letter enviada
                            await logAcceptanceAction(
                              'acceptance_letter_sent',
                              'Acceptance letter sent by admin',
                              applicationId,
                              publicUrl
                            );

                            setRealScholarshipApplication((prev: any) => prev ? ({
                              ...prev,
                              acceptance_letter_url: publicUrl,
                              acceptance_letter_status: 'sent',
                              acceptance_letter_sent_at: new Date().toISOString()
                            }) : prev);

                            try {
                              const { data: { session } } = await supabase.auth.getSession();
                              const accessToken = session?.access_token;
                              if (accessToken) {
                                const FUNCTIONS_URL = (import.meta as any).env.VITE_SUPABASE_FUNCTIONS_URL as string;
                                await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${accessToken}`
                                  },
                                  body: JSON.stringify({
                                    user_id: studentId,
                                    title: 'Acceptance letter sent',
                                    message: 'Your acceptance letter was sent. Check your dashboard for details.',
                                    type: 'acceptance_letter_sent',
                                    link: '/student/dashboard'
                                  })
                                });
                              }
                            } catch { /* ignore notify errors */ }

                            setAcceptanceLetterFile(null);
                            setMarkSentSuccess('Acceptance letter sent successfully.');
                          } catch (err) {
                            console.error('Error uploading acceptance letter:', err);
                          } finally {
                            setUploadingAcceptanceLetter(false);
                          }
                        }}
                        disabled={!acceptanceLetterFile || uploadingAcceptanceLetter}
                        className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                      >
                        {uploadingAcceptanceLetter ? 'Uploading...' : 'Send Acceptance Letter'}
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            // Resolver applicationId como acima
                            let applicationId = currentApplication?.id;
                            if (!applicationId && realScholarshipApplication?.id) applicationId = realScholarshipApplication.id;
                            if (!applicationId) {
                              const { data: apps } = await supabase
                                .from('scholarship_applications')
                                .select('id')
                                .order('created_at', { ascending: false })
                                .limit(1);
                              applicationId = apps?.[0]?.id;
                            }
                            if (!applicationId) throw new Error('No application found for this student');

                            const { error: updateError } = await supabase
                              .from('scholarship_applications')
                              .update({
                                acceptance_letter_status: 'sent',
                                acceptance_letter_sent_at: new Date().toISOString()
                              })
                              .eq('id', applicationId);
                            if (updateError) throw updateError;

                            await logAcceptanceAction(
                              'acceptance_letter_sent',
                              'Acceptance letter marked as sent by admin (no file)',
                              applicationId,
                              null
                            );

                            setRealScholarshipApplication((prev: any) => prev ? ({
                              ...prev,
                              acceptance_letter_status: 'sent',
                              acceptance_letter_sent_at: new Date().toISOString()
                            }) : prev);
                            setMarkSentSuccess('Acceptance letter marked as sent.');
                          } catch (err) {
                            console.error('Error marking acceptance letter as sent:', err);
                          }
                        }}
                        className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 rounded-xl text-sm font-medium"
                      >
                        Mark as Sent (no file)
                      </button>
                    </div>
                    {markSentSuccess && (
                      <div className="mt-3 mx-auto max-w-xl bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">
                        {markSentSuccess}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Transfer Form Section - Only for transfer students */}
      {currentApplication?.student_process_type === 'transfer' && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-5 rounded-t-3xl">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-start sm:items-center space-x-4 min-w-0">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-6 h-6 text-[#05294E]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-white break-words">Transfer Form</h3>
                  <p className="text-blue-100 text-sm break-words">Transfer form for current F-1 students</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {(() => {
              if (currentApplication?.transfer_form_url) {
                // Formulário já enviado
                return (
                  <div className="bg-white rounded-3xl p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 mb-1">
                          <p className="font-medium text-slate-900 break-words">
                            {currentApplication.transfer_form_url.split('/').pop() || 'Transfer Form'}
                          </p>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 whitespace-nowrap">
                            {currentApplication.transfer_form_status === 'approved' ? 'Approved' : 'Sent'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 break-words">
                          Sent on {formatDate(currentApplication.transfer_form_sent_at)}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 break-words">
                          Transfer form for F-1 students
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-2 mt-3">
                          <button
                            onClick={() => onViewDocument({
                              file_url: currentApplication.transfer_form_url,
                              filename: (currentApplication.transfer_form_url.split('/').pop() || 'Transfer Form')
                            })}
                            className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors w-full sm:w-auto text-center"
                          >
                            View
                          </button>
                          
                          <button
                            onClick={() => onDownloadDocument({
                              file_url: currentApplication.transfer_form_url,
                              filename: (currentApplication.transfer_form_url.split('/').pop() || 'Transfer Form')
                            })}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors w-full sm:w-auto text-center"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              } else {
                // Formulário não enviado
                return (
                  <div className="bg-white rounded-3xl p-8">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-slate-700 mb-2">No Transfer Form Yet</h4>
                      <p className="text-slate-500 max-w-md mx-auto">
                        The transfer form will appear here once the university processes your application and sends it to you.
                      </p>
                      <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Please wait for the university to send your transfer form</span>
                      </div>
                    </div>
                  </div>
                );
              }
            })()}
          </div>
        </div>
      )}
      
      {/* Modal de rejeição de documento */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-[#05294E] mb-3">Reject Document</h3>
            <p className="text-sm text-slate-600 mb-4">Please provide a reason for rejecting this document. The student will be able to submit a new document after rejection.</p>
            <textarea
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 min-h-[120px]"
              placeholder="Enter reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={handleCancelReject}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl transition-colors disabled:cursor-not-allowed"
              >
                Reject Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsView;