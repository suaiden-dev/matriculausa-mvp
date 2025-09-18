import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface DocumentsViewProps {
  studentDocuments: any[];
  documentRequests: any[];
  scholarshipApplication: any;
  studentId?: string;
  onViewDocument: (doc: any) => void;
  onDownloadDocument: (doc: any) => void;
}

const DocumentsView: React.FC<DocumentsViewProps> = ({
  studentDocuments,
  documentRequests,
  scholarshipApplication,
  studentId,
  onViewDocument,
  onDownloadDocument
}) => {
  const [realScholarshipApplication, setRealScholarshipApplication] = useState<any>(null);
  const [loadingApplication, setLoadingApplication] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
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
        setRealScholarshipApplication(null);
        return;
      }

      if (studentDocuments && studentDocuments.length > 0) {
        setLoadingApplication(true);
        try {
          
          // Buscar o id da tabela user_profiles usando o user_id (studentId)
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('user_id', studentId)
            .single();
          
          if (profileError || !profileData) {
            setRealScholarshipApplication(null);
            return;
          }
          
          
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
            .order('created_at', { ascending: false })
            .limit(1);
          
            if (!studentAppError && studentApp && studentApp.length > 0) {
              applications = studentApp;
              error = null;
            } else {
              // Fallback: buscar aplicação que tenha paid application fee como alternativa
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
                .eq('is_application_fee_paid', true)
                .order('created_at', { ascending: false })
                .limit(1);
            
              if (!paidAppError && data && data.length > 0) {
                applications = data;
                error = null;
              } else {
                // Último fallback: buscar a mais recente
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
                  .order('created_at', { ascending: false })
                  .limit(1);
                
                applications = data || [];
                error = recentError;
              }
            }
          }

          if (!error && applications && applications.length > 0) {
            const app = applications[0];
            setRealScholarshipApplication(app);
          } else {
            setRealScholarshipApplication(null);
          }
        } catch (err) {
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
  
  // ✅ GAMBIARRA: Função para extrair nome do arquivo e construir URL completa
  const getDocumentInfo = (upload: any) => {
    // ✅ CORREÇÃO: Usar o bucket correto 'document-attachments'
    const baseUrl = 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/document-attachments/';
    
    // Extrair nome do arquivo do file_url
    let filename = 'Document';
    if (upload.file_url) {
      const urlParts = upload.file_url.split('/');
      filename = urlParts[urlParts.length - 1] || 'Document';
    }
    
    // ✅ CORREÇÃO: Construir URL completa para visualização/download
    // O file_url já inclui 'uploads/', então não precisamos adicionar novamente
    const fullUrl = upload.file_url ? `${baseUrl}${upload.file_url}` : null;
    
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
            // ✅ CORREÇÃO: Filtrar acceptance letter dos document requests
            const filteredRequests = documentRequests?.filter(request => request.id !== 'acceptance_letter') || [];
            return filteredRequests;
          })().length > 0 ? (
            <div className="space-y-4">
              {(() => {
                // ✅ CORREÇÃO: Filtrar acceptance letter dos document requests
                const filteredRequests = documentRequests?.filter(request => request.id !== 'acceptance_letter') || [];
                return filteredRequests;
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
                      
                      {request.attachment_url && (
                        <div className="mt-3">
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
                            <div key={upload.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 last:mb-0">
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
                              
                              <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:space-x-3 sm:self-auto self-start mt-3 sm:mt-0">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                                  upload.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  upload.status === 'rejected' ? 'bg-red-100 text-red-800' :
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
                                  className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-1 sm:flex-none text-center"
                                >
                                  View
                                </button>
                                
                                <button
                                  onClick={() => onDownloadDocument({
                                    ...upload,
                                    file_url: fullUrl,
                                    filename
                                  })}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-1 sm:flex-none text-center"
                                >
                                  Download
                                </button>
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
                      className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                    >
                      View
                    </button>
                    
                    <button
                      onClick={() => onDownloadDocument({
                        file_url: getAcceptanceLetterUrl(currentApplication),
                        filename: (getAcceptanceLetterUrl(currentApplication)?.split('/').pop() || 'Acceptance Letter')
                      })}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                    >
                      Download
                    </button>
                  </div>
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentsView;