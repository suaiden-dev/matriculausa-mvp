import React from 'react';
import type { Application, UserProfile, Scholarship } from '../../../types';
import { CosI20Section } from './CosI20Section';
import { groupUploadsBySubmission, getFileName } from '../../../utils/documentUploadUtils';
import { FileText, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Download, ExternalLink } from 'lucide-react';

interface ApplicationDetails extends Application {
  user_profiles: UserProfile & {
    selection_survey_passed?: boolean;
    selected_application_id?: string | null;
  };
  scholarships: Scholarship;
}

const UPLOAD_STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  under_review: { label: 'Under Review', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800', icon: XCircle },
};

function formatHistoryDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

interface DocumentsTabProps {
  application: ApplicationDetails;
  studentRecord: any;
  // Document requests
  documentRequests: any[];
  expandedRequests: Record<string, boolean>;
  setExpandedRequests: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  expandedHistory: Record<string, boolean>;
  setExpandedHistory: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  // Document actions
  handleViewUpload: (upload: any) => void;
  handleDownloadTemplate: (url: string) => void;
  handleApproveDocument: (documentId: string) => Promise<void>;
  approvingDocumentId: Record<string, boolean>;
  rejectingDocumentId: Record<string, boolean>;
  setPendingRejectDocumentId: (id: string | null) => void;
  setShowRejectDocumentModal: (show: boolean) => void;
  setShowNewRequestModal: (show: boolean) => void;
  handleViewDocument: (doc: any) => void;
  handleDownloadDocument: (doc: any) => Promise<void>;
  // Acceptance letter
  acceptanceLetterUploaded: boolean;
  acceptanceLetterFile: File | null;
  uploadingAcceptanceLetter: boolean;
  isFileSelecting: boolean;
  replacingAcceptanceLetter: boolean;
  replaceAcceptanceLetterFile: File | null;
  setReplaceAcceptanceLetterFile: React.Dispatch<React.SetStateAction<File | null>>;
  handleAcceptanceLetterFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleProcessAcceptanceLetter: () => Promise<void>;
  handleReplaceAcceptanceLetter: () => Promise<void>;
  handleViewAcceptanceLetter: () => void;
  handleDownloadAcceptanceLetter: () => Promise<void>;
  // Transfer form
  transferForm: any;
  transferFormUploads: any[];
  selectedTransferFormFile: File | null;
  setSelectedTransferFormFile: React.Dispatch<React.SetStateAction<File | null>>;
  uploadingTransferForm: boolean;
  handleUploadTransferForm: (file: File) => Promise<void>;
  handleApproveTransferFormUpload: (uploadId: string) => Promise<void>;
  setPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>;
  // Fetch
  fetchApplicationDetails: () => Promise<void>;
  // Refs
  acceptanceLetterRef: React.RefObject<HTMLDivElement | null>;
  transferFormRef: React.RefObject<HTMLDivElement | null>;
}

const DocumentsTabComponent: React.FC<DocumentsTabProps> = (props) => {
  const {
    application,
    studentRecord,
    documentRequests,
    expandedRequests,
    setExpandedRequests,
    expandedHistory,
    setExpandedHistory,
    handleViewUpload,
    handleDownloadTemplate,
    handleApproveDocument,
    approvingDocumentId,
    rejectingDocumentId,
    setPendingRejectDocumentId,
    setShowRejectDocumentModal,
    setShowNewRequestModal,
    handleViewDocument,
    handleDownloadDocument,
    acceptanceLetterUploaded,
    acceptanceLetterFile,
    uploadingAcceptanceLetter,
    isFileSelecting,
    replacingAcceptanceLetter,
    replaceAcceptanceLetterFile,
    setReplaceAcceptanceLetterFile,
    handleAcceptanceLetterFileSelect,
    handleProcessAcceptanceLetter,
    handleReplaceAcceptanceLetter,
    handleViewAcceptanceLetter,
    handleDownloadAcceptanceLetter,
    transferForm,
    transferFormUploads,
    selectedTransferFormFile,
    setSelectedTransferFormFile,
    uploadingTransferForm,
    handleUploadTransferForm,
    handleApproveTransferFormUpload,
    setPreviewUrl,
    fetchApplicationDetails,
    acceptanceLetterRef,
    transferFormRef,
  } = props;

  return (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                      <FileText className="w-6 h-6 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-white">Document Management</h2>
                      <p className="text-slate-200 text-sm">Manage document requests and student submissions</p>
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <button
                      onClick={() => setShowNewRequestModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/30 transition-all font-semibold text-sm shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>New Request</span>
                    </button>
                    <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30">
                      {documentRequests.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {documentRequests.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-700 mb-2">No document requests yet</h4>
                    <p className="text-slate-500 max-w-md mx-auto">Create your first request using the button above</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documentRequests.map((request) => (
                      <div key={request.id} className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 relative group">
                        <div className="absolute top-4 right-4 flex items-center gap-1 sm:gap-2">
                          <button
                            onClick={() => setExpandedRequests(prev => ({ ...prev, [request.id]: !(prev[request.id] !== false) }))}
                            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                          >
                            {expandedRequests[request.id] === false ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                          </button>
                          {request.attachment_url && (
                            <button
                              onClick={() => handleDownloadTemplate(request.attachment_url)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#05294E] hover:bg-[#041f38] text-white text-xs font-semibold rounded-lg shadow-sm transition-all duration-200"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              <span className="hidden sm:inline">Template</span>
                            </button>
                          )}
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${request.status === 'open' ? 'bg-blue-100 text-blue-800 border border-blue-200/50' :
                              request.status === 'closed' ? 'bg-slate-100 text-slate-800 border border-slate-200/50' :
                                'bg-green-100 text-green-800 border border-green-200/50'
                            }`}>
                            {request.status === 'open' ? 'Open' :
                              request.status === 'closed' ? 'Closed' :
                                request.status}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm border border-blue-200/50">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>

                          <div className="flex-1 min-w-0 pr-0 sm:pr-40">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h4 className="text-lg font-bold text-slate-900 leading-tight break-words">
                                {request.title}
                              </h4>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase ${request.is_global
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200/50'
                                  : 'bg-purple-100 text-purple-800 border border-purple-200/50'
                                }`}>
                                {request.is_global ? 'Global Request' : 'Individual Request'}
                              </span>
                            </div>

                            {request.description && (
                              <p className="text-sm text-slate-600 mb-3 leading-relaxed break-words">{request.description}</p>
                            )}

                            {request.due_date && (
                              <div className="flex items-center text-xs font-medium text-slate-400 mb-4 bg-slate-50 self-start px-2 py-1 rounded inline-flex">
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Due: {new Date(request.due_date).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Student Upload Section — grouped by submission rounds */}
                        {expandedRequests[request.id] !== false && (() => {
                          const allUploads = request.uploads || [];
                          const { closedGroups, currentGroup } = groupUploadsBySubmission(allUploads);
                          const lastClosedGroup = closedGroups.length > 0 ? closedGroups[closedGroups.length - 1] : null;
                          const historyGroups = currentGroup.length > 0 ? closedGroups : closedGroups.slice(0, -1);
                          const isHistoryOpen = expandedHistory[request.id] === true;

                          return (
                        <div className="mt-6 pt-6 border-t border-slate-100">
                          {allUploads.length > 0 ? (
                            <>
                              {/* Current pending group or last closed group */}
                              {currentGroup.length > 0 ? (
                                <div className="space-y-3">
                                  {currentGroup.map((upload: any) => {
                                    const uploadStatus = upload.status || 'under_review';
                                    const isPending = uploadStatus === 'under_review';
                                    const cfg = UPLOAD_STATUS_CONFIG[uploadStatus] || UPLOAD_STATUS_CONFIG['under_review'];
                                    const StatusIcon = cfg.icon;
                                    return (
                                      <div key={upload.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-start sm:items-center space-x-4 min-w-0 flex-1">
                                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-6 h-6 text-green-600" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 break-all">
                                              {upload.file_url ? getFileName(upload.file_url) : 'Student response file'}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                              Submitted on {upload.uploaded_at ? new Date(upload.uploaded_at).toLocaleDateString() : 'Unknown date'}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 items-center">
                                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-sm font-medium ${cfg.className}`}>
                                            <StatusIcon className="h-4 w-4" />
                                            {cfg.label}
                                          </span>

                                          <button
                                            onClick={() => handleViewUpload(upload)}
                                            className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
                                          >
                                            View
                                          </button>

                                          {isPending && application.status !== 'enrolled' && application.acceptance_letter_status !== 'approved' && application.status !== 'rejected' && (
                                            <div className="flex items-center gap-2">
                                              <button
                                                onClick={() => handleApproveDocument(upload.id)}
                                                disabled={approvingDocumentId[upload.id]}
                                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                                              >
                                                {approvingDocumentId[upload.id] ? 'Approving...' : 'Approve'}
                                              </button>
                                              <button
                                                onClick={() => {
                                                  setPendingRejectDocumentId(upload.id);
                                                  setShowRejectDocumentModal(true);
                                                }}
                                                disabled={rejectingDocumentId[upload.id]}
                                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                                              >
                                                Reject
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : lastClosedGroup ? (
                                <div className="space-y-3">
                                  {lastClosedGroup.map((upload: any) => {
                                    const cfg = UPLOAD_STATUS_CONFIG[upload.status] || UPLOAD_STATUS_CONFIG['under_review'];
                                    const StatusIcon = cfg.icon;
                                    return (
                                      <div key={upload.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-start sm:items-center space-x-4 min-w-0 flex-1">
                                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-6 h-6 text-green-600" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 break-all">
                                              {upload.file_url ? getFileName(upload.file_url) : 'Student response file'}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                              Submitted on {upload.uploaded_at ? new Date(upload.uploaded_at).toLocaleDateString() : 'Unknown date'}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 items-center">
                                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-sm font-medium ${cfg.className}`}>
                                            <StatusIcon className="h-4 w-4" />
                                            {cfg.label}
                                          </span>
                                          <button
                                            onClick={() => handleViewUpload(upload)}
                                            className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
                                          >
                                            View
                                          </button>
                                          {upload.status === 'under_review' && application.status !== 'enrolled' && application.acceptance_letter_status !== 'approved' && application.status !== 'rejected' && (
                                            <div className="flex items-center gap-2">
                                              <button
                                                onClick={() => handleApproveDocument(upload.id)}
                                                disabled={approvingDocumentId[upload.id]}
                                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                                              >
                                                {approvingDocumentId[upload.id] ? 'Approving...' : 'Approve'}
                                              </button>
                                              <button
                                                onClick={() => {
                                                  setPendingRejectDocumentId(upload.id);
                                                  setShowRejectDocumentModal(true);
                                                }}
                                                disabled={rejectingDocumentId[upload.id]}
                                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                                              >
                                                Reject
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {lastClosedGroup[lastClosedGroup.length - 1]?.rejection_reason && (
                                    <div className="w-full mt-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                                      <p className="text-xs font-semibold text-red-800 uppercase mb-1">Rejection Reason</p>
                                      <p className="text-sm text-red-900">{lastClosedGroup[lastClosedGroup.length - 1].rejection_reason}</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                                  <p className="text-slate-500 text-sm">No response submitted yet</p>
                                </div>
                              )}

                              {/* Grouped submission history accordion */}
                              {historyGroups.length > 0 && (
                                <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedHistory(prev => ({ ...prev, [request.id]: !prev[request.id] }))}
                                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-600"
                                  >
                                    <span>
                                      Submission History
                                      {request.title && <span className="text-slate-800 font-semibold"> — {request.title}</span>}
                                      <span className="ml-1 text-slate-400">({historyGroups.length} {historyGroups.length === 1 ? 'previous attempt' : 'previous attempts'})</span>
                                    </span>
                                    {isHistoryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>

                                  {isHistoryOpen && (
                                    <ul className="divide-y divide-slate-100">
                                      {[...historyGroups].reverse().map((group, groupIdx) => {
                                        const groupNumber = historyGroups.length - groupIdx;
                                        const lastUpload = group[group.length - 1];
                                        const cfg = UPLOAD_STATUS_CONFIG[lastUpload.status] || UPLOAD_STATUS_CONFIG['under_review'];
                                        const GroupIcon = cfg.icon;
                                        return (
                                          <li key={groupIdx} className="px-4 py-3 bg-white">
                                            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-400 font-medium">Attempt #{groupNumber}</span>
                                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.className}`}>
                                                  <GroupIcon className="w-3 h-3" />
                                                  {cfg.label}
                                                </span>
                                                <span className="text-xs text-slate-400">{group.length} file(s)</span>
                                              </div>
                                              <span className="text-xs text-slate-400">{formatHistoryDate(lastUpload.uploaded_at)}</span>
                                            </div>

                                            {lastUpload.rejection_reason && (
                                              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 mb-2">
                                                <span className="font-semibold">Reason: </span>{lastUpload.rejection_reason}
                                              </p>
                                            )}

                                            <div className="space-y-1">
                                              {group.map((upload: any, fileIdx: number) => (
                                                <div key={upload.id} className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded border border-slate-100">
                                                  <div className="flex items-center gap-1.5 min-w-0">
                                                    <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                                    <div className="flex flex-col min-w-0">
                                                      <span className="text-xs text-slate-700 font-medium truncate">
                                                        {upload.file_url ? getFileName(upload.file_url) : `File ${fileIdx + 1}`}
                                                      </span>
                                                      <span className="text-[10px] text-slate-400">
                                                        {formatHistoryDate(upload.uploaded_at)}
                                                      </span>
                                                    </div>
                                                  </div>
                                                  {upload.file_url && (
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                      <button
                                                        onClick={() => handleViewUpload(upload)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-[#05294E] text-white hover:bg-[#041f38] transition-colors"
                                                      >
                                                        <ExternalLink className="w-3 h-3" />
                                                        View
                                                      </button>
                                                      <a
                                                        href={upload.file_url}
                                                        download
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
                                                      >
                                                        <Download className="w-3 h-3" />
                                                      </a>
                                                    </div>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                              <p className="text-slate-500 text-sm">No response submitted yet</p>
                            </div>
                          )}
                        </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Acceptance Letter Section */}
            <div ref={acceptanceLetterRef} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl shadow-sm relative overflow-hidden">
              <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-5 rounded-t-3xl">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-[#05294E]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">Acceptance Letter</h4>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="bg-white rounded-3xl p-6 mb-6">
                  <p className="text-slate-700 mb-6 leading-relaxed">
                    Please upload the student's acceptance letter and any other required documents, such as the I-20 Control Fee receipt.
                  </p>

                  {acceptanceLetterUploaded && application?.acceptance_letter_url ? (
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
                              {application.acceptance_letter_url.split('/').pop() || 'Acceptance Letter'}
                            </p>
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 whitespace-nowrap">
                              Available
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 break-words">
                            Sent on {application.acceptance_letter_sent_at ? new Date(application.acceptance_letter_sent_at).toLocaleDateString() : 'Unknown date'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 break-words">
                            Official university acceptance document
                          </p>

                          <div className="flex flex-col sm:flex-row gap-2 mt-3">
                            <button
                              onClick={handleViewAcceptanceLetter}
                              className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors w-full sm:w-auto text-center"
                            >
                              View
                            </button>
                            <button
                              onClick={handleDownloadAcceptanceLetter}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors w-full sm:w-auto text-center"
                            >
                              Download
                            </button>
                            <label className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl cursor-pointer transition-colors w-full sm:w-auto text-center justify-center">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              {replacingAcceptanceLetter ? 'Replacing...' : (replaceAcceptanceLetterFile ? 'Change file' : 'Replace Letter')}
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => setReplaceAcceptanceLetterFile(e.target.files?.[0] || null)}
                                disabled={replacingAcceptanceLetter}
                              />
                            </label>
                          </div>
                          {replaceAcceptanceLetterFile && (
                            <div className="mt-3 flex items-center gap-3">
                              <div className="flex items-center space-x-2 bg-blue-50 rounded-lg px-3 py-2 flex-1 min-w-0">
                                <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-blue-800 text-sm font-medium truncate">{replaceAcceptanceLetterFile.name}</span>
                              </div>
                              <button
                                onClick={handleReplaceAcceptanceLetter}
                                disabled={replacingAcceptanceLetter}
                                className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 whitespace-nowrap"
                              >
                                {replacingAcceptanceLetter ? 'Saving...' : 'Confirm Replace'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-blue-300 rounded-3xl p-6 bg-blue-50">
                      <div className="text-center">
                        <svg className="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <h5 className="font-semibold text-blue-900 mb-2">Select Acceptance Letter</h5>
                        <p className="text-blue-700 text-sm mb-4">Drag and drop or click to browse files</p>

                        {acceptanceLetterFile ? (
                          <div className="mb-4">
                            <div className="flex items-center justify-center space-x-2 bg-blue-100 rounded-lg px-4 py-2">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-blue-800 font-medium">{acceptanceLetterFile.name}</span>
                            </div>
                          </div>
                        ) : null}

                        <div className="flex flex-col items-center space-y-4">
                          <div className="file-input-wrapper">
                            <label className={`bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer inline-flex items-center justify-center min-w-[140px] ${isFileSelecting ? 'opacity-50 cursor-not-allowed' : ''
                              }`}>
                              {isFileSelecting ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              ) : (
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                              )}
                              <span>{isFileSelecting ? 'Selecting...' : (acceptanceLetterFile ? 'Change File' : 'Choose File')}</span>
                              <input
                                type="file"
                                className="sr-only"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={handleAcceptanceLetterFileSelect}
                                disabled={uploadingAcceptanceLetter || isFileSelecting}
                                key={acceptanceLetterFile ? 'change' : 'initial'} // Força re-render do input
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!acceptanceLetterUploaded && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleProcessAcceptanceLetter}
                      disabled={!acceptanceLetterFile || uploadingAcceptanceLetter}
                      className="bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-sm flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingAcceptanceLetter ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Process Acceptance</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Transfer Form Section - Only for Transfer Students */}
            {application?.student_process_type === 'transfer' && (
              <div ref={transferFormRef} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl shadow-sm relative overflow-hidden mt-8">
                <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-5 rounded-t-3xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-[#05294E]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white">Transfer Form</h4>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="bg-white rounded-3xl p-6 mb-6">
                    <p className="text-slate-700 mb-6 leading-relaxed">
                      Upload the transfer form template for the student to download, fill out, and submit back to you for review.
                    </p>

                    {/* Upload Template Section */}
                    <div className="mb-6">
                      <h5 className="text-lg font-semibold text-slate-800 mb-4">Transfer Form Template</h5>

                      {transferForm?.transfer_form_url ? (
                        <div className="space-y-4">
                          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0" />
                                <div>
                                  <p className="font-semibold text-green-800">Template Uploaded</p>
                                  <p className="text-sm text-green-600">
                                    Sent on {transferForm.transfer_form_sent_at ? new Date(transferForm.transfer_form_sent_at).toLocaleDateString() : 'Unknown date'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = transferForm.transfer_form_url;
                                    link.download = 'transfer_form_template.pdf';
                                    link.click();
                                  }}
                                  className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
                                >
                                  Download
                                </button>
                                <button
                                  onClick={() => setPreviewUrl(transferForm.transfer_form_url)}
                                  className="bg-white text-green-600 border border-green-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-50 transition"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.pdf,.doc,.docx';
                                    input.onchange = (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (file) {
                                        setSelectedTransferFormFile(file);
                                      }
                                    };
                                    input.click();
                                  }}
                                  className="bg-[#05294E] hover:bg-[#041f38] text-white px-3 py-2 rounded-lg text-sm font-medium transition"
                                >
                                  Replace
                                </button>
                              </div>
                            </div>
                          </div>

                          {(selectedTransferFormFile || uploadingTransferForm) && (
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                              <h4 className="text-lg font-semibold text-[#05294E] mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                {uploadingTransferForm ? 'Uploading Transfer Form...' : 'Replace Transfer Form'}
                              </h4>

                              {uploadingTransferForm ? (
                                <div className="text-center py-4">
                                  <div className="w-8 h-8 border-4 border-[#05294E] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                  <p className="text-[#05294E] font-medium">Uploading transfer form...</p>
                                </div>
                              ) : selectedTransferFormFile ? (
                                <div className="space-y-4">
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
                                          onChange={(e) => setSelectedTransferFormFile(e.target.files ? e.target.files[0] : null)}
                                          disabled={uploadingTransferForm}
                                        />
                                      </label>
                                    </div>
                                    <p className="text-sm text-blue-600 mt-2 text-center">
                                      Selected: {selectedTransferFormFile?.name || 'Unknown file'}
                                    </p>
                                  </div>

                                  <div className="flex gap-3">
                                    <button
                                      onClick={() => handleUploadTransferForm(selectedTransferFormFile)}
                                      disabled={!selectedTransferFormFile || uploadingTransferForm}
                                      className="bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                                    >
                                      Replace Transfer Form
                                    </button>
                                    <button
                                      onClick={() => setSelectedTransferFormFile(null)}
                                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-blue-300 rounded-3xl p-6 bg-blue-50">
                          <div className="text-center">
                            <svg className="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <h5 className="font-semibold text-blue-900 mb-2">Upload Transfer Form Template</h5>
                            <p className="text-blue-700 text-sm mb-4">Select the transfer form template for the student</p>

                            {selectedTransferFormFile ? (
                              <div className="mb-4">
                                <div className="flex items-center justify-center space-x-2 bg-blue-100 rounded-lg px-4 py-2">
                                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="text-blue-800 font-medium">{selectedTransferFormFile.name}</span>
                                </div>
                              </div>
                            ) : null}

                            <div className="flex flex-col items-center space-y-4">
                              <label className="bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer inline-flex items-center justify-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <span>{selectedTransferFormFile ? 'Change File' : 'Choose File'}</span>
                                <input
                                  type="file"
                                  className="sr-only"
                                  accept=".pdf,.doc,.docx"
                                  onChange={(e) => setSelectedTransferFormFile(e.target.files ? e.target.files[0] : null)}
                                  disabled={uploadingTransferForm}
                                />
                              </label>

                              {selectedTransferFormFile && (
                                <button
                                  onClick={() => handleUploadTransferForm(selectedTransferFormFile)}
                                  disabled={uploadingTransferForm}
                                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-sm flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {uploadingTransferForm ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      <span>Uploading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span>Upload Template</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Student Uploads Section */}
                    {transferFormUploads.length > 0 && (
                      <div>
                        <h5 className="text-lg font-semibold text-slate-800 mb-4">Student Submissions</h5>
                        <div className="space-y-3">
                          {transferFormUploads.map((upload) => {
                            const statusColor = upload.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                              upload.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                'bg-yellow-100 text-yellow-800 border-yellow-200';

                            return (
                              <div key={upload.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start space-x-3 flex-1">
                                    <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-slate-900">
                                        {upload.file_url.split('/').pop()}
                                      </p>
                                      <p className="text-sm text-slate-500">
                                        Uploaded: {new Date(upload.uploaded_at).toLocaleDateString()}
                                      </p>
                                      {upload.rejection_reason && (
                                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                          <p className="text-xs font-medium text-red-600 mb-1">Rejection reason:</p>
                                          <p className="text-sm text-red-700">{upload.rejection_reason}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-3 ml-4">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColor}`}>
                                      {upload.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                    </span>

                                    {/* Action buttons for under_review status */}
                                    {upload.status === 'under_review' && (
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => handleApproveTransferFormUpload(upload.id)}
                                          className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => {
                                            setPendingRejectDocumentId(upload.id);
                                            setShowRejectDocumentModal(true);
                                          }}
                                          className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    )}

                                    <button
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = upload.file_url;
                                        link.download = upload.file_url.split('/').pop() || 'transfer_form.pdf';
                                        link.click();
                                      }}
                                      className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                      Download
                                    </button>
                                    <button
                                      onClick={() => setPreviewUrl(upload.file_url)}
                                      className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                      View
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* I-20 Document Section - Only for COS students */}
            {application?.student_process_type === 'change_of_status' && studentRecord && (
              <div className="mt-8">
                <CosI20Section
                  student={studentRecord}
                  isPlatformAdmin={true}
                  onRefresh={() => fetchApplicationDetails()}
                  handleViewDocument={handleViewDocument}
                  handleDownloadDocument={handleDownloadDocument}
                />
              </div>
            )}
          </div>
  );
};

export const DocumentsTab = React.memo(DocumentsTabComponent);
