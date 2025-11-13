import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface TransferFormSectionProps {
  student: any;
  isPlatformAdmin: boolean;
  transferFormFile: File | null;
  setTransferFormFile: (file: File | null) => void;
  uploadingTransferForm: boolean;
  transferFormUploads: any[];
  getTransferApplication: () => any;
  handleUploadTransferForm: () => Promise<void>;
  handleApproveTransferFormUpload: (uploadId: string) => Promise<void>;
  handleRejectTransferFormUpload: (uploadId: string, reason: string) => Promise<void>;
  handleViewDocument: (doc: any) => void;
  handleDownloadDocument: (doc: any) => void;
}

export const TransferFormSection: React.FC<TransferFormSectionProps> = React.memo(({
  student,
  isPlatformAdmin,
  transferFormFile,
  setTransferFormFile,
  uploadingTransferForm,
  transferFormUploads,
  getTransferApplication,
  handleUploadTransferForm,
  handleApproveTransferFormUpload,
  handleRejectTransferFormUpload,
  handleViewDocument,
  handleDownloadDocument
}) => {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [pendingRejectUploadId, setPendingRejectUploadId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  const transferApp = getTransferApplication();

  if (!transferApp) {
    return null;
  }

  return (
    <>
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
          {transferApp.transfer_form_url ? (
            // Formulário já enviado
            <div className="bg-white rounded-3xl p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 mb-1">
                    <p className="font-medium text-slate-900 break-words">
                      {transferApp.transfer_form_url.split('/').pop() || 'Transfer Form'}
                    </p>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 whitespace-nowrap">
                      {transferApp.transfer_form_status === 'sent' ? 'Sent' : 'Available'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 break-words">
                    Sent on {transferApp.transfer_form_sent_at ? new Date(transferApp.transfer_form_sent_at).toLocaleDateString('pt-BR') : 'N/A'}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <button
                      onClick={() => handleViewDocument({
                        file_url: transferApp.transfer_form_url,
                        filename: transferApp.transfer_form_url.split('/').pop() || 'Transfer Form'
                      })}
                      className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                    >
                      View
                    </button>
                    
                    <button
                      onClick={() => handleDownloadDocument({
                        file_url: transferApp.transfer_form_url,
                        filename: transferApp.transfer_form_url.split('/').pop() || 'Transfer Form'
                      })}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                    >
                      Download
                    </button>
                    
                    {isPlatformAdmin && (
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.pdf,.doc,.docx';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              setTransferFormFile(file);
                            }
                          };
                          input.click();
                        }}
                        className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                      >
                        Replace
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Seção de upload para substituição */}
              {isPlatformAdmin && (transferFormFile || uploadingTransferForm) && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6">
                  <h4 className="text-lg font-semibold text-[#05294E] mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {uploadingTransferForm ? 'Uploading Transfer Form...' : 'Replace Transfer Form'}
                  </h4>
                  
                  <div className="space-y-4">
                    {uploadingTransferForm ? (
                      <div className="text-center py-4">
                        <div className="w-8 h-8 border-4 border-[#05294E] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-[#05294E] font-medium">Uploading transfer form...</p>
                      </div>
                    ) : transferFormFile ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-[#05294E] mb-2">
                            New Transfer Form File
                          </label>
                          <div className="flex items-center justify-center">
                            <label className="flex items-center gap-2 px-4 py-2 bg-blue-100 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-200 transition font-medium text-[#05294E]">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <span>Change file</span>
                              <input
                                type="file"
                                className="sr-only"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => setTransferFormFile(e.target.files ? e.target.files[0] : null)}
                                disabled={uploadingTransferForm}
                              />
                            </label>
                          </div>
                          <p className="text-sm text-blue-600 mt-2 text-center">
                            Selected: {transferFormFile?.name || 'Unknown file'}
                          </p>
                        </div>
                        
                        <div className="flex gap-3">
                          <button
                            onClick={handleUploadTransferForm}
                            disabled={!transferFormFile || uploadingTransferForm}
                            className="bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                          >
                            Replace Transfer Form
                          </button>
                          
                          <button
                            onClick={() => setTransferFormFile(null)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Seção para gerenciar uploads do aluno */}
              {transferFormUploads.length > 0 && (
                <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <h4 className="text-lg font-semibold text-[#05294E] mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2z" />
                    </svg>
                    Student Uploads
                  </h4>
                  
                  <div className="space-y-4">
                    {transferFormUploads.map((upload) => {
                      const statusColor = upload.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                        upload.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                        'bg-yellow-100 text-yellow-800 border-yellow-200';
                      
                      return (
                        <div key={upload.id} className="bg-white border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {upload.file_url.split('/').pop()}
                                </p>
                                <p className="text-sm text-slate-500">
                                  Uploaded on {new Date(upload.uploaded_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColor}`}>
                              {upload.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </span>
                          </div>
                          
                          {upload.rejection_reason && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm font-medium text-red-600 mb-1">Rejection reason:</p>
                              <p className="text-sm text-red-700">{upload.rejection_reason}</p>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <button
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                              onClick={() => {
                                handleViewDocument({
                                  file_url: upload.file_url,
                                  filename: upload.file_url.split('/').pop() || 'transfer_form.pdf'
                                });
                              }}
                            >
                              View
                            </button>
                            <button
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                              onClick={() => {
                                handleDownloadDocument({
                                  file_url: upload.file_url,
                                  filename: upload.file_url.split('/').pop() || 'transfer_form.pdf'
                                });
                              }}
                            >
                              Download
                            </button>
                            
                            {upload.status === 'under_review' && isPlatformAdmin && (
                              <>
                                <button
                                  className="text-green-600 hover:text-green-800 text-sm font-medium hover:underline"
                                  onClick={() => handleApproveTransferFormUpload(upload.id)}
                                >
                                  Approve
                                </button>
                                <button
                                  className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline"
                                  onClick={() => {
                                    setPendingRejectUploadId(upload.id);
                                    setShowRejectModal(true);
                                  }}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Formulário não enviado - mostrar upload
            <div className="bg-white rounded-3xl p-6" data-transfer-upload>
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-700 mb-2">
                  {transferFormFile ? 'Replace Transfer Form' : 'Transfer Form Not Sent'}
                </h4>
                <p className="text-slate-500 max-w-md mx-auto mb-6">
                  {transferFormFile 
                    ? 'Select a new file to replace the current transfer form.'
                    : 'Upload and send the transfer form for this transfer student.'
                  }
                </p>
                
                {isPlatformAdmin && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Select Transfer Form File
                      </label>
                      <div className="flex items-center justify-center">
                        <label className="flex items-center gap-2 px-4 py-2 bg-blue-100 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-200 transition font-medium text-blue-700">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span>{transferFormFile ? 'Change file' : 'Select Transfer Form'}</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => setTransferFormFile(e.target.files ? e.target.files[0] : null)}
                            disabled={uploadingTransferForm}
                          />
                        </label>
                      </div>
                      {transferFormFile && (
                        <p className="text-sm text-slate-600 mt-2 text-center">
                          Selected: {transferFormFile.name}
                        </p>
                      )}
                    </div>
                    
                    <button
                      onClick={handleUploadTransferForm}
                      disabled={!transferFormFile || uploadingTransferForm}
                      className="bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingTransferForm ? 'Sending...' : 'Send Transfer Form'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de rejeição */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Reject Transfer Form</h3>
            <p className="text-slate-600 mb-4">
              Please provide a reason for rejecting this transfer form. This will be shared with the student.
            </p>
            
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 mb-4 min-h-[100px] focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              autoFocus
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setPendingRejectUploadId(null);
                  setRejectNotes('');
                }}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingRejectUploadId && rejectNotes.trim()) {
                    handleRejectTransferFormUpload(pendingRejectUploadId, rejectNotes);
                    setShowRejectModal(false);
                    setPendingRejectUploadId(null);
                    setRejectNotes('');
                  }
                }}
                disabled={!rejectNotes.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

TransferFormSection.displayName = 'TransferFormSection';

