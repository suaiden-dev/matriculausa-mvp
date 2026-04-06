import React, { useState } from 'react';
import { Globe, FileText, CheckCircle, XCircle, Clock, Download, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface GlobalDocumentRequestsSectionProps {
  globalRequests: any[];
  studentUserId: string;
  isAdmin?: boolean;
  onApproveDocument?: (uploadId: string) => void;
  onRejectDocument?: (uploadId: string, reason: string) => void;
  onDeleteDocumentRequest?: (requestId: string) => void;
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

const GlobalDocumentRequestsSection: React.FC<GlobalDocumentRequestsSectionProps> = ({
  globalRequests = [],
  studentUserId,
  isAdmin = false,
  onApproveDocument,
  onRejectDocument,
  onDeleteDocumentRequest,
  approvingStates = {},
  rejectingStates = {},
  deletingStates = {},
  onViewDocument,
}) => {
  const [rejectModalUploadId, setRejectModalUploadId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedRequests, setExpandedRequests] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedRequests(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleConfirmReject = () => {
    if (rejectModalUploadId && onRejectDocument && rejectReason.trim()) {
      onRejectDocument(rejectModalUploadId, rejectReason.trim());
      setRejectModalUploadId(null);
      setRejectReason('');
    }
  };

  return (
    <>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        {/* Section Header - Matched with DocumentsView.tsx style */}
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
            <div className="ml-auto flex items-center">
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
                const studentUpload = (request.document_request_uploads || []).find(
                  (u: any) => u.uploaded_by === studentUserId
                );
                const isExpanded = expandedRequests[request.id] !== false; // expanded by default
                const applicableTypes: string[] = request.applicable_student_types || ['all'];

                return (
                  <div key={request.id} className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 relative group">
                    {/* Admin Action Buttons - Absolute positioned like in DocumentsView */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 sm:gap-2">
                       {/* Template download - moved to top right like in individual docs */}
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

                      {/* Admin delete */}
                      {isAdmin && onDeleteDocumentRequest && (
                        <button
                          onClick={() => onDeleteDocumentRequest(request.id)}
                          disabled={deletingStates[request.id]}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete request"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}

                      {/* Expand toggle */}
                      <button
                        onClick={() => toggleExpand(request.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      {/* Icon */}
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm border border-blue-200/50">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>

                      {/* Content Wrapper - with right padding for the buttons */}
                      <div className="flex-1 min-w-0 pr-0 sm:pr-40">
                        {/* Title Row */}
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

                        {/* Description */}
                        {request.description && (
                          <p className="text-sm text-slate-600 mb-3 leading-relaxed break-words">
                            {request.description}
                          </p>
                        )}

                        {/* Due Date */}
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
                        {!studentUpload ? (
                          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                            <p className="text-slate-500 text-sm">No response submitted yet</p>
                          </div>
                        ) : (
                          <div className="bg-white border border-slate-200 rounded-2xl p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-start sm:items-center space-x-4 min-w-0 flex-1">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <FileText className="h-6 w-6 text-green-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-900 break-words">Student response file</p>
                                  {studentUpload.uploaded_at && (
                                    <p className="text-sm text-slate-500">
                                      Submitted on {new Date(studentUpload.uploaded_at).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 items-center">
                                {/* Status badge */}
                                {(() => {
                                  const cfg = STATUS_CONFIG[studentUpload.status] || STATUS_CONFIG['under_review'];
                                  const Icon = cfg.icon;
                                  return (
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-sm font-medium ${cfg.className}`}>
                                      <Icon className="h-4 w-4" />
                                      {cfg.label}
                                    </span>
                                  );
                                })()}

                                {/* File link - Changed to button to open modal */}
                                {studentUpload.file_url && (
                                  <button
                                    onClick={() => onViewDocument?.({ 
                                      file_url: studentUpload.file_url, 
                                      filename: request.title || 'Student Response' 
                                    })}
                                    className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
                                  >
                                    View
                                  </button>
                                )}

                                {/* Admin actions */}
                                {isAdmin && studentUpload.status === 'under_review' && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => onApproveDocument && onApproveDocument(studentUpload.id)}
                                      disabled={approvingStates[studentUpload.id]}
                                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                                    >
                                      {approvingStates[studentUpload.id] ? 'Approving...' : 'Approve'}
                                    </button>
                                    <button
                                      onClick={() => setRejectModalUploadId(studentUpload.id)}
                                      disabled={rejectingStates[studentUpload.id]}
                                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Review notes */}
                            {studentUpload.review_notes && (
                              <div className="w-full mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-xs font-semibold text-red-800 uppercase mb-1">Rejection Reason</p>
                                <p className="text-sm text-red-900">{studentUpload.review_notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalUploadId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reject Document</h3>
            <p className="text-sm text-gray-500 mb-4">Please provide a reason for rejecting this document.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#05294E] focus:border-transparent resize-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setRejectModalUploadId(null); setRejectReason(''); }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalDocumentRequestsSection;
