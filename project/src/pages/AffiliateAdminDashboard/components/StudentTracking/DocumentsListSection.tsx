import React from 'react';
import TruncatedText from '../../../../components/TruncatedText';

interface DocumentsListSectionProps {
  studentDocuments: any[];
  onViewDocument: (doc: any) => void;
  onDownloadDocument: (doc: any) => void;
}

const DocumentsListSection: React.FC<DocumentsListSectionProps> = ({
  studentDocuments,
  onViewDocument,
  onDownloadDocument
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#041f38] px-6 py-4">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Student Documents
        </h2>
        <p className="text-slate-200 text-sm mt-1">View student submitted documents and their current status</p>
      </div>
      <div className="p-4 sm:p-6">
        {studentDocuments && studentDocuments.length > 0 ? (
          <div className="space-y-2">
            {studentDocuments.map((doc: any, index: number) => (
              <div key={doc.id || index} className="mb-4 last:mb-0">
                <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 mb-1">
                        <p className="text-sm font-medium text-slate-600 capitalize">{doc.type || 'Document'}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                          doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Submitted'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">Document uploaded for university review</p>
                      {doc.uploaded_at && (
                        <p className="text-xs text-slate-400 mt-1">
                          Uploaded: {formatDate(doc.uploaded_at)}
                        </p>
                      )}
                      
                      {/* Exibir motivo da rejeição se o documento foi rejeitado */}
                      {doc.status === 'rejected' && doc.rejection_reason && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs font-medium text-red-600 mb-1">Rejection reason:</p>
                          <TruncatedText
                            text={doc.rejection_reason}
                            maxLength={120}
                            className="text-sm text-red-700 leading-relaxed"
                            showTooltip={true}
                            tooltipPosition="top"
                          />
                        </div>
                      )}
                      
                      {/* Botões de visualização e download */}
                      <div className="flex flex-col sm:flex-row gap-2 mt-3">
                        {doc.url && (
                          <button 
                            onClick={() => onViewDocument(doc)}
                            className="bg-[#05294E] hover:bg-[#041f38] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                          >
                            View Document
                          </button>
                        )}
                        {doc.url && (
                          <button 
                            onClick={() => onDownloadDocument(doc)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                          >
                            Download
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-600 font-medium">No documents uploaded yet</p>
            <p className="text-sm text-slate-500 mt-1">Documents will appear here when the student uploads them</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsListSection;
