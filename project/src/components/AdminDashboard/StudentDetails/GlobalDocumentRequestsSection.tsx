import React, { useState } from 'react';
import { Globe, FileText, CheckCircle, XCircle, Clock, Download, Trash2, ChevronDown, ChevronUp, Plus, X, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import AdminUploadAttachmentModal from './AdminUploadAttachmentModal';

interface GlobalDocumentRequestsSectionProps {
  globalRequests: any[];
  studentUserId: string;
  isAdmin?: boolean;
  onApproveDocument?: (uploadId: string) => void;
  onRejectDocument?: (uploadId: string, reason: string) => void;
  onDeleteDocumentRequest?: (requestId: string) => void;
  onUploadGlobalAttachment?: (title: string, file: File) => Promise<void>;
  onUploadDocument?: (requestId: string, file: File) => void;
  uploadingStates?: { [key: string]: boolean };
  approvingStates?: { [key: string]: boolean };
  rejectingStates?: { [key: string]: boolean };
  deletingStates?: { [key: string]: boolean };
  onViewDocument?: (file: any) => void;
}

const STUDENT_TYPE_LABELS: Record<string, string> = {
  initial: 'Initial F-1',
  transfer: 'Transfer',
  change_of_status: 'Change of Status',
  all: 'All Types',
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.FC<any> }> = {
  under_review: { label: 'Under Review', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800', icon: XCircle },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

import { groupUploadsBySubmission, getFileName } from '../../../utils/documentUploadUtils';

const GlobalDocumentRequestsSection: React.FC<GlobalDocumentRequestsSectionProps> = ({
  globalRequests = [],
  studentUserId,
  isAdmin = false,
  onApproveDocument,
  onRejectDocument,
  onDeleteDocumentRequest,
  onUploadGlobalAttachment,
  onUploadDocument,
  uploadingStates = {},
  approvingStates = {},
  rejectingStates = {},
  deletingStates = {},
  onViewDocument,
}) => {
  const [rejectModalUploadId, setRejectModalUploadId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteRequestId, setDeleteRequestId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [expandedRequests, setExpandedRequests] = useState<Record<string, boolean>>({});
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedRequests(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleHistory = (id: string) => {
    setExpandedHistory(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleConfirmReject = () => {
    if (rejectModalUploadId && onRejectDocument && rejectReason.trim()) {
      onRejectDocument(rejectModalUploadId, rejectReason.trim());
      setRejectModalUploadId(null);
      setRejectReason('');
    }
  };

  const handleConfirmDelete = () => {
    if (deleteRequestId && onDeleteDocumentRequest) {
      onDeleteDocumentRequest(deleteRequestId);
      setDeleteRequestId(null);
    }
  };

  return (
    <>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        {/* Section Header */}
        <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-start sm:items-center space-x-4 min-w-0">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                <Globe className="h-6 w-6 text-slate-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-white break-words">Global Document Requests</h3>
                <p className="text-slate-200 text-sm break-words">
                  Documents requested for all students of this university
                </p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {isAdmin && onUploadGlobalAttachment && (
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/30 transition-all font-semibold text-sm shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Attachment</span>
                </button>
              )}
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30">
                {globalRequests.length}
              </span>
            </div>
          </div>
        </div>

        {/* Requests List or Empty State */}
        <div className="p-6">
          {globalRequests.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h4 className="text-lg font-semibold text-slate-700 mb-2">No global document requests yet</h4>
              <p className="text-slate-500 max-w-md mx-auto">
                Global document requests for this university will appear here once they are created.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {globalRequests.map((request) => {
                const allStudentUploads = (request.document_request_uploads || [])
                  .filter((u: any) => u.uploaded_by === studentUserId);

                const { closedGroups, currentGroup } = groupUploadsBySubmission(allStudentUploads);

                // The upload used for approve/reject is the most recent of the current pending group
                const activeUpload = currentGroup.length > 0
                  ? currentGroup[currentGroup.length - 1]
                  : closedGroups.length > 0
                    ? closedGroups[closedGroups.length - 1][closedGroups[closedGroups.length - 1].length - 1]
                    : null;

                // Groups shown in history: all closedGroups when currentGroup is pending,
                // or all closedGroups except the last when last closed group is shown in main card
                const historyGroups = currentGroup.length > 0
                  ? closedGroups
                  : closedGroups.slice(0, -1);

                const isExpanded = expandedRequests[request.id] !== false;
                const isHistoryOpen = expandedHistory[request.id] === true;
                const applicableTypes: string[] = request.applicable_student_types || ['all'];

                return (
                  <div key={request.id} className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 relative group">
                    {/* Admin Action Buttons */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 sm:gap-2">
                      {(request.template_url || request.attachment_url) && (
                        <a
                          href={request.template_url || request.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#05294E] hover:bg-[#041f38] text-white text-xs font-semibold rounded-lg shadow-sm transition-all duration-200"
                          title="Download template"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Template</span>
                        </a>
                      )}

                      {isAdmin && onDeleteDocumentRequest && (
                        <button
                          onClick={() => setDeleteRequestId(request.id)}
                          disabled={deletingStates[request.id]}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete request"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => toggleExpand(request.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm border border-blue-200/50">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>

                      <div className="flex-1 min-w-0 pr-0 sm:pr-40">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h4 className="text-lg font-bold text-slate-900 leading-tight break-words">
                            {request.title || 'Global Request'}
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase bg-blue-100 text-blue-800 border border-blue-200/50">
                              Global Request
                            </span>
                            {applicableTypes.map((type: string) => (
                              <span
                                key={type}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase bg-slate-100 text-slate-600 border border-slate-200/50"
                              >
                                {STUDENT_TYPE_LABELS[type] || type}
                              </span>
                            ))}
                          </div>
                        </div>

                        {request.description && (
                          <p className="text-sm text-slate-600 mb-3 leading-relaxed break-words">
                            {request.description}
                          </p>
                        )}

                        {request.due_date && (
                          <div className="flex items-center text-xs font-medium text-slate-400 mb-4 bg-slate-50 self-start px-2 py-1 rounded">
                            <Clock className="w-3.5 h-3.5 mr-1.5" />
                            <span>Due: {new Date(request.due_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Upload Status (expandable) */}
                    {isExpanded && (
                      <div className="mt-6 pt-6 border-t border-slate-100">
                        {allStudentUploads.length === 0 ? (
                          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                            <p className="text-slate-500 text-sm">No response submitted yet</p>
                          </div>
                        ) : (
                          <>
                            {/* Main card */}
                            {currentGroup.length > 0 ? (
                              /* PENDING SUBMISSION — one card per file */
                              <div className="space-y-3">
                                  {currentGroup.map((upload: any, idx: number) => {
                                    const uploadStatus = upload.status || 'under_review';
                                    const cfg = STATUS_CONFIG[uploadStatus] || STATUS_CONFIG['under_review'];
                                    const StatusIcon = cfg.icon;
                                    const isPending = uploadStatus === 'under_review';
                                    return (
                                    <div key={upload.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                      <div className="flex items-start sm:items-center space-x-4 min-w-0 flex-1">
                                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                          <FileText className="h-6 w-6 text-green-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-slate-900 break-all">
                                            {upload.file_url ? getFileName(upload.file_url) : (upload.is_admin_upload ? 'Uploaded by Admin' : 'Student response file')}
                                          </p>
                                          <p className="text-sm text-slate-500">
                                            Submitted on {new Date(upload.uploaded_at).toLocaleDateString()}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap gap-2 items-center">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-sm font-medium ${cfg.className}`}>
                                          <StatusIcon className="h-4 w-4" />
                                          {cfg.label}
                                        </span>

                                        {upload.file_url && (
                                          <button
                                            onClick={() => onViewDocument?.({
                                              ...upload,
                                              file_url: upload.file_url,
                                              filename: request.title || 'Student Response',
                                            })}
                                            className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
                                          >
                                            View
                                          </button>
                                        )}

                                        {isAdmin && isPending && (
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => onApproveDocument && onApproveDocument(upload.id)}
                                              disabled={approvingStates[upload.id]}
                                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                                            >
                                              {approvingStates[upload.id] ? 'Approving...' : 'Approve'}
                                            </button>
                                            <button
                                              onClick={() => setRejectModalUploadId(upload.id)}
                                              disabled={rejectingStates[upload.id]}
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
                              ) : (
                                /* LAST CLOSED GROUP — all files, approved or rejected */
                                <div className="space-y-3">
                                  {closedGroups[closedGroups.length - 1].map((upload: any) => {
                                    const cfg = STATUS_CONFIG[upload.status] || STATUS_CONFIG['under_review'];
                                    const Icon = cfg.icon;
                                    return (
                                      <div key={upload.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-start sm:items-center space-x-4 min-w-0 flex-1">
                                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <FileText className="h-6 w-6 text-green-600" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <p className="font-medium text-slate-900 break-all">
                                                {upload.file_url ? getFileName(upload.file_url) : (upload.is_admin_upload ? 'Uploaded by Admin' : 'Student response file')}
                                              </p>
                                              {upload.is_admin_upload && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700 border border-blue-200">
                                                  Admin
                                                </span>
                                              )}
                                            </div>
                                            {upload.uploaded_at && (
                                              <p className="text-sm text-slate-500">
                                                Submitted on {new Date(upload.uploaded_at).toLocaleDateString()}
                                              </p>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 items-center">
                                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-sm font-medium ${cfg.className}`}>
                                            <Icon className="h-4 w-4" />
                                            {cfg.label}
                                          </span>
                                          {upload.file_url && (
                                            <button
                                              onClick={() => onViewDocument?.({
                                                ...upload,
                                                file_url: upload.file_url,
                                                filename: request.title || 'Student Response'
                                              })}
                                              className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
                                            >
                                              View
                                            </button>
                                          )}
                                          {isAdmin && upload.status === 'under_review' && (
                                            <div className="flex items-center gap-2">
                                              <button
                                                onClick={() => onApproveDocument && onApproveDocument(upload.id)}
                                                disabled={approvingStates[upload.id]}
                                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                                              >
                                                {approvingStates[upload.id] ? 'Approving...' : 'Approve'}
                                              </button>
                                              <button
                                                onClick={() => setRejectModalUploadId(upload.id)}
                                                disabled={rejectingStates[upload.id]}
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

                                  {activeUpload!.rejection_reason && (
                                    <div className="w-full mt-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                                      <p className="text-xs font-semibold text-red-800 uppercase mb-1">Rejection Reason</p>
                                      <p className="text-sm text-red-900">{activeUpload!.rejection_reason}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                            {/* Grouped submission history */}
                            {historyGroups.length > 0 && (
                              <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => toggleHistory(request.id)}
                                  className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-600"
                                >
                                  <span>
                                    Histórico de envios
                                    {request.title && <span className="text-slate-800 font-semibold"> — {request.title}</span>}
                                    <span className="ml-1 text-slate-400">({historyGroups.length} {historyGroups.length === 1 ? 'tentativa anterior' : 'tentativas anteriores'})</span>
                                  </span>
                                  {isHistoryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>

                                {isHistoryOpen && (
                                  <ul className="divide-y divide-slate-100">
                                    {[...historyGroups].reverse().map((group, groupIdx) => {
                                      const groupNumber = historyGroups.length - groupIdx;
                                      const lastUpload = group[group.length - 1];
                                      const cfg = STATUS_CONFIG[lastUpload.status] || STATUS_CONFIG['under_review'];
                                      const Icon = cfg.icon;
                                      return (
                                        <li key={groupIdx} className="px-4 py-3 bg-white">
                                          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-slate-400 font-medium">Tentativa #{groupNumber}</span>
                                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.className}`}>
                                                <Icon className="w-3 h-3" />
                                                {cfg.label}
                                              </span>
                                              <span className="text-xs text-slate-400">{group.length} arquivo(s)</span>
                                            </div>
                                            <span className="text-xs text-slate-400">{formatDate(lastUpload.uploaded_at)}</span>
                                          </div>

                                          {lastUpload.rejection_reason && (
                                            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 mb-2">
                                              <span className="font-semibold">Motivo: </span>{lastUpload.rejection_reason}
                                            </p>
                                          )}

                                          <div className="space-y-1">
                                            {group.map((upload: any, fileIdx: number) => (
                                              <div key={upload.id} className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded border border-slate-100">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                  <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                                  <div className="flex flex-col min-w-0">
                                                    <span className="text-xs text-slate-700 font-medium truncate">
                                                      {upload.file_url ? getFileName(upload.file_url) : `Arquivo ${fileIdx + 1}`}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                      {upload.is_admin_upload ? 'Enviado pelo admin' : 'Enviado pelo aluno'} · {formatDate(upload.uploaded_at)}
                                                    </span>
                                                  </div>
                                                </div>
                                                {upload.file_url && (
                                                  <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button
                                                      onClick={() => onViewDocument?.({
                                                        ...upload,
                                                        file_url: upload.file_url,
                                                        filename: upload.file_url ? getFileName(upload.file_url) : `${request.title || 'Document'} — tentativa ${groupNumber}, arquivo ${fileIdx + 1}`,
                                                      })}
                                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-[#05294E] text-white hover:bg-[#041f38] transition-colors"
                                                    >
                                                      <ExternalLink className="w-3 h-3" />
                                                      Ver
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
                        )}
                      </div>
                    )}

                    {/* Admin Upload Section */}
                    {isAdmin && onUploadDocument && (
                      <div className="mt-6 pt-6 border-t border-slate-100">
                        <h5 className="text-sm font-medium text-slate-700 mb-3 flex items-center">
                          <Plus className="w-4 h-4 mr-2 text-blue-600" />
                          Admin Upload:
                        </h5>

                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                          <div className="flex flex-col sm:flex-row items-start gap-3">
                            <div className="flex-1">
                              <p className="text-sm text-slate-600 mb-3">
                                Upload a document on behalf of the student for this global request.
                              </p>
                              <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#05294E] hover:bg-[#041f38] text-white rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer">
                                <Plus className="w-4 h-4" />
                                <span>
                                  {uploadingStates[request.id] ? 'Uploading...' : 'Upload Document'}
                                </span>
                                <input
                                  type="file"
                                  className="hidden"
                                  disabled={uploadingStates[request.id]}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      onUploadDocument(request.id, file);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectModalUploadId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3 text-white">
                <XCircle className="w-5 h-5" />
                <h3 className="text-lg font-bold">Reject Document</h3>
              </div>
              <button
                onClick={() => { setRejectModalUploadId(null); setRejectReason(''); }}
                className="text-white/70 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">
                    Please provide a clear justification for rejecting this document.
                    This will be sent to the student to help them correct the submission.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Justification</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ex: Image is too blurry, please upload a clear photo of your passport."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:bg-white outline-none transition-all resize-none"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => { setRejectModalUploadId(null); setRejectReason(''); }}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={!rejectReason.trim()}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteRequestId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3 text-white">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-lg font-bold">Delete Request</h3>
              </div>
              <button
                onClick={() => setDeleteRequestId(null)}
                className="text-white/70 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">
                    Are you sure you want to delete this document request?
                    This action <span className="font-bold text-red-600">cannot be undone</span> and will also remove any student submissions.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => setDeleteRequestId(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Upload Modal */}
      <AdminUploadAttachmentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={onUploadGlobalAttachment || (async () => {})}
        applicationTitle="Global Documents"
      />
    </>
  );
};

export default GlobalDocumentRequestsSection;
