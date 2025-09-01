import React from 'react';

interface DocumentsViewProps {
  studentDocuments: any[];
  documentRequests: any[];
  scholarshipApplication: any;
  onViewDocument: (doc: any) => void;
  onDownloadDocument: (doc: any) => void;
}

const DocumentsView: React.FC<DocumentsViewProps> = ({
  studentDocuments,
  documentRequests,
  scholarshipApplication,
  onViewDocument,
  onDownloadDocument
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

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
    
    console.log('🔗 [DOCUMENT VIEW] URL construction:', {
      original: upload.file_url,
      baseUrl,
      fullUrl,
      filename
    });
    
    return {
      filename,
      fullUrl
    };
  };

  console.log('Document requests:', documentRequests);

  return (
    <div className="space-y-8">
      {/* Document Requests from University */}
      {documentRequests && documentRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">
              Documents Required by University
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Documents requested by the university for your application
            </p>
          </div>
          
          <div className="divide-y divide-slate-200">
            {documentRequests.map((request) => (
              <div key={request.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-base font-medium text-slate-900">
                      {request.document_requests?.title || 'Document Request'}
                    </h4>
                    {request.document_requests?.description && (
                      <p className="text-sm text-slate-600 mt-1">
                        {request.document_requests.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                      {request.document_requests?.due_date && (
                        <span>
                          <span className="font-medium">Due Date:</span> {formatDate(request.document_requests.due_date)}
                        </span>
                      )}
                      <span>
                        <span className="font-medium">Type:</span> {request.document_requests?.is_global ? 'Global' : 'Specific'}
                      </span>
                    </div>
                  </div>
                  
                  {/* University Template */}
                  {request.document_requests?.attachment_url && (
                    <div className="ml-4">
                      <button
                        onClick={() => onViewDocument({ file_url: request.document_requests.attachment_url, type: 'template' })}
                        className="inline-flex items-center px-3 py-2 border border-slate-300 shadow-sm text-sm leading-4 font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        View Template
                      </button>
                    </div>
                  )}
                </div>

                {/* Documents Submitted by Student */}
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-slate-700 mb-2">
                    Submitted Documents:
                  </h5>
                  <div className="space-y-2">
                    {/* ✅ GAMBIARRA: Tratar cada upload individualmente */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        </div>
                        <div>
                          {/* ✅ GAMBIARRA: Usar nome extraído do file_url */}
                          <p className="text-sm font-medium text-slate-900">
                            {getDocumentInfo(request).filename}
                          </p>
                          <p className="text-xs text-slate-500">
                            Submitted on {formatDate(request.uploaded_at)}
                          </p>
                          {/* ✅ GAMBIARRA: Mostrar informações do document_request */}
                          <p className="text-xs text-slate-400 mt-1">
                            Request: {request.document_requests?.title || 'Document Request'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          request.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {request.status === 'approved' ? 'Approved' :
                           request.status === 'rejected' ? 'Rejected' :
                           request.status === 'under_review' ? 'Under Review' :
                           'Pending'}
                        </span>
                        
                        {/* ✅ GAMBIARRA: Passar documento com URL completa para as funções */}
                        <button
                          onClick={() => onViewDocument({
                            ...request,
                            file_url: getDocumentInfo(request).fullUrl,
                            filename: getDocumentInfo(request).filename
                          })}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View
                        </button>
                        
                        <button
                          onClick={() => onDownloadDocument({
                            ...request,
                            file_url: getDocumentInfo(request).fullUrl,
                            filename: getDocumentInfo(request).filename
                          })}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Documents */}
      {studentDocuments && studentDocuments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">
              Student Documents
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Documents submitted by the student during the application process
            </p>
          </div>
          
          <div className="divide-y divide-slate-200">
            {studentDocuments.map((doc, index) => (
              <div key={index} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {doc.name || `Document ${index + 1}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {doc.type || 'Document'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                      doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      doc.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {doc.status === 'approved' ? 'Approved' :
                       doc.status === 'rejected' ? 'Rejected' :
                       doc.status === 'under_review' ? 'Under Review' :
                       'Pending'}
                    </span>
                    
                    <button
                      onClick={() => onViewDocument(doc)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View
                    </button>
                    
                    <button
                      onClick={() => onDownloadDocument(doc)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acceptance Letter Section */}
      {scholarshipApplication && scholarshipApplication.acceptance_letter_url && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">
              Acceptance Letter
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Official acceptance letter from the university
            </p>
          </div>
          
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Acceptance Letter
                  </p>
                  <p className="text-xs text-slate-500">
                    Sent on {formatDate(scholarshipApplication.acceptance_letter_sent_at)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onViewDocument({
                    file_url: scholarshipApplication.acceptance_letter_url,
                    filename: 'Acceptance Letter'
                  })}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View
                </button>
                
                <button
                  onClick={() => onDownloadDocument({
                    file_url: scholarshipApplication.acceptance_letter_url,
                    filename: 'Acceptance Letter'
                  })}
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Documents Message */}
      {(!documentRequests || documentRequests.length === 0) && 
       (!studentDocuments || studentDocuments.length === 0) && 
       (!scholarshipApplication || !scholarshipApplication.acceptance_letter_url) && (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-slate-600 font-medium">No documents available</p>
          <p className="text-sm text-slate-500 mt-1">Documents will appear here once they are uploaded or requested</p>
        </div>
      )}
    </div>
  );
};

export default DocumentsView;
