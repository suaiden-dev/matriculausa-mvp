import React from 'react';
import type { Application, UserProfile, Scholarship } from '../../../types';
import DocumentViewerModal from '../../DocumentViewerModal';

interface ApplicationDetails extends Application {
  user_profiles: UserProfile & {
    selection_survey_passed?: boolean;
    selected_application_id?: string | null;
  };
  scholarships: Scholarship;
}

interface StudentDetailsModalsProps {
  application: ApplicationDetails;
  allStudentApplications: any[];
  // Document viewer
  previewUrl: string | null;
  setPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>;
  // Reason modal (request changes)
  showReasonModal: boolean;
  setShowReasonModal: (show: boolean) => void;
  rejectReason: string;
  setRejectReason: (reason: string) => void;
  pendingRejectType: string | null;
  setPendingRejectType: (type: string | null) => void;
  pendingRejectDocAppId: string | null;
  setPendingRejectDocAppId: (id: string | null) => void;
  requestChangesDoc: (type: string, reason: string, targetAppId?: string) => Promise<void>;
  // Reject student modal
  showRejectStudentModal: boolean;
  setShowRejectStudentModal: (show: boolean) => void;
  rejectStudentReason: string;
  setRejectStudentReason: (reason: string) => void;
  pendingRejectAppId: string | null;
  setPendingRejectAppId: (id: string | null) => void;
  rejectStudent: (reason: string, onSuccess?: () => void) => Promise<void>;
  // New request modal
  showNewRequestModal: boolean;
  setShowNewRequestModal: (show: boolean) => void;
  newDocumentRequest: { title: string; description: string; due_date: string; attachment: File | null };
  setNewDocumentRequest: React.Dispatch<React.SetStateAction<{ title: string; description: string; due_date: string; attachment: File | null }>>;
  creatingDocumentRequest: boolean;
  handleCreateDocumentRequest: () => Promise<void>;
  // Reject document modal
  showRejectDocumentModal: boolean;
  setShowRejectDocumentModal: (show: boolean) => void;
  rejectDocumentReason: string;
  setRejectDocumentReason: (reason: string) => void;
  pendingRejectDocumentId: string | null;
  setPendingRejectDocumentId: (id: string | null) => void;
  rejectingDocumentId: Record<string, boolean>;
  handleRejectDocument: (documentId: string, reason: string) => Promise<void>;
  handleRejectTransferFormUpload: (uploadId: string, reason: string) => Promise<void>;
  transferFormUploads: any[];
  // Approve confirm modal
  showApproveConfirmModal: boolean;
  setShowApproveConfirmModal: (show: boolean) => void;
  pendingApproveAppId: string | null;
  setPendingApproveAppId: (id: string | null) => void;
  approvingApplication: Record<string, boolean>;
  handleApproveApplication: (appId?: string) => Promise<void>;
}

const StudentDetailsModalsComponent: React.FC<StudentDetailsModalsProps> = (props) => {
  const {
    application,
    allStudentApplications,
    previewUrl,
    setPreviewUrl,
    showReasonModal,
    setShowReasonModal,
    rejectReason,
    setRejectReason,
    pendingRejectType,
    setPendingRejectType,
    pendingRejectDocAppId,
    setPendingRejectDocAppId,
    requestChangesDoc,
    showRejectStudentModal,
    setShowRejectStudentModal,
    rejectStudentReason,
    setRejectStudentReason,
    pendingRejectAppId,
    setPendingRejectAppId,
    rejectStudent,
    showNewRequestModal,
    setShowNewRequestModal,
    newDocumentRequest,
    setNewDocumentRequest,
    creatingDocumentRequest,
    handleCreateDocumentRequest,
    showRejectDocumentModal,
    setShowRejectDocumentModal,
    rejectDocumentReason,
    setRejectDocumentReason,
    pendingRejectDocumentId,
    setPendingRejectDocumentId,
    rejectingDocumentId,
    handleRejectDocument,
    handleRejectTransferFormUpload,
    transferFormUploads,
    showApproveConfirmModal,
    setShowApproveConfirmModal,
    pendingApproveAppId,
    setPendingApproveAppId,
    approvingApplication,
    handleApproveApplication,
  } = props;

  return (
    <>
      {previewUrl && (
        <DocumentViewerModal documentUrl={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}

      {/* Modal para justificar solicitação de mudanças */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Request Changes</h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for requesting changes to this document. This will help the student understand what needs to be fixed.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              placeholder="Enter your reason here..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowReasonModal(false);
                  setRejectReason('');
                  setPendingRejectType(null);
                  setPendingRejectDocAppId(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingRejectType) {
                    requestChangesDoc(pendingRejectType, rejectReason, pendingRejectDocAppId || undefined);
                    setShowReasonModal(false);
                    setRejectReason('');
                    setPendingRejectType(null);
                    setPendingRejectDocAppId(null);
                  }
                }}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para recusar aluno na bolsa */}
      {showRejectStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Reject Student Application</h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for rejecting this student's application. This information will be shared with the student.
            </p>
            <textarea
              value={rejectStudentReason}
              onChange={(e) => setRejectStudentReason(e.target.value)}
              className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              placeholder="Enter your reason here..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectStudentModal(false);
                  setRejectStudentReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  rejectStudent(rejectStudentReason, () => {
                    setShowRejectStudentModal(false);
                    setRejectStudentReason('');
                    setPendingRejectAppId(null);
                  });
                }}
                disabled={!rejectStudentReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
              >
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showNewRequestModal && application && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg mx-4 border border-slate-200">
            <h3 className="font-extrabold text-xl mb-6 text-[#05294E] text-center">New Document Request</h3>
            <p className="text-sm text-slate-600 mb-6 text-center">
              Request a new document from {application?.user_profiles?.full_name}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Document Title <span className="text-red-500">*</span>
                </label>
                <input
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base"
                  placeholder="e.g., Additional Reference Letter"
                  value={newDocumentRequest.title}
                  onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base min-h-[80px] resize-vertical"
                  placeholder="Describe what document you need and any specific requirements..."
                  value={newDocumentRequest.description}
                  onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Due Date
                </label>
                <input
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base"
                  type="date"
                  value={newDocumentRequest.due_date}
                  onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Template/Attachment (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition font-medium text-slate-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828l6.586-6.586M16 5v6a2 2 0 002 2h6" />
                    </svg>
                    <span>{newDocumentRequest.attachment ? 'Change file' : 'Select file'}</span>
                    <input
                      type="file"
                      className="sr-only"
                      onChange={(e) => setNewDocumentRequest(prev => ({
                        ...prev,
                        attachment: e.target.files ? e.target.files[0] : null
                      }))}
                      disabled={creatingDocumentRequest}
                    />
                  </label>
                  {newDocumentRequest.attachment && (
                    <span className="text-xs text-slate-700 truncate max-w-[180px]">
                      {newDocumentRequest.attachment.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                className="flex-1 bg-slate-200 text-slate-800 px-4 py-2 rounded-lg font-medium hover:bg-slate-300 transition disabled:opacity-50"
                onClick={() => {
                  setShowNewRequestModal(false);
                  setNewDocumentRequest({ title: '', description: '', due_date: '', attachment: null });
                }}
                disabled={creatingDocumentRequest}
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-[#05294E] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#041f38] transition disabled:opacity-50 flex items-center justify-center"
                onClick={handleCreateDocumentRequest}
                disabled={creatingDocumentRequest || !newDocumentRequest.title.trim()}
              >
                {creatingDocumentRequest ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para rejeitar documento */}
      {showRejectDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Reject Document</h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for rejecting this document. This information will be shared with the student.
            </p>
            <textarea
              value={rejectDocumentReason}
              onChange={(e) => setRejectDocumentReason(e.target.value)}
              className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              placeholder="Enter your reason here..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectDocumentModal(false);
                  setRejectDocumentReason('');
                  setPendingRejectDocumentId(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingRejectDocumentId) {
                    // Verificar se é um transfer form upload ou document request upload
                    const isTransferFormUpload = transferFormUploads.some(upload => upload.id === pendingRejectDocumentId);

                    if (isTransferFormUpload) {
                      handleRejectTransferFormUpload(pendingRejectDocumentId, rejectDocumentReason);
                    } else {
                      handleRejectDocument(pendingRejectDocumentId, rejectDocumentReason);
                    }

                    setShowRejectDocumentModal(false);
                    setRejectDocumentReason('');
                    setPendingRejectDocumentId(null);
                  }
                }}
                disabled={!rejectDocumentReason.trim() || (!!pendingRejectDocumentId && !!rejectingDocumentId[pendingRejectDocumentId])}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {pendingRejectDocumentId && rejectingDocumentId[pendingRejectDocumentId] ? 'Rejecting...' : 'Reject Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para rejeitar aplicação */}
      {showRejectStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl transform transition-all">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Reject Application</h3>
                <p className="text-slate-500">
                  {(() => {
                    const targetApp = allStudentApplications.find((a: any) => a.id === pendingRejectAppId);
                    return targetApp?.scholarships?.title
                      ? `Scholarship: ${targetApp.scholarships.title}`
                      : 'Provide a reason for this decision';
                  })()}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 font-medium">
              This message will be sent to the student to help them understand why their application was not accepted.
            </p>

            <textarea
              value={rejectStudentReason}
              onChange={(e) => setRejectStudentReason(e.target.value)}
              className="w-full h-40 p-4 border-2 border-slate-200 rounded-2xl text-slate-700 resize-none focus:outline-none focus:border-[#05294E] transition-colors bg-slate-50"
              placeholder="Ex: Missing specific prerequisite, incomplete information, etc..."
            />

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => {
                  setShowRejectStudentModal(false);
                  setRejectStudentReason('');
                  setPendingRejectAppId(null);
                }}
                className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  rejectStudent(rejectStudentReason, () => {
                    setShowRejectStudentModal(false);
                    setRejectStudentReason('');
                    setPendingRejectAppId(null);
                  });
                }}
                disabled={!rejectStudentReason.trim()}
                className="px-8 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-200 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de aprovação */}
      {showApproveConfirmModal && (() => {
        const pendingApp = allStudentApplications.find((a: any) => a.id === pendingApproveAppId);
        const scholarship = pendingApp?.scholarships || {};
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Confirm Approval</h3>
                  <p className="text-sm text-slate-500">Review the details before confirming</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide flex-shrink-0">Student</span>
                  <span className="text-sm font-semibold text-slate-900 text-right">{application?.user_profiles?.full_name || '—'}</span>
                </div>
                <div className="flex items-start justify-between gap-2 border-t border-slate-200 pt-3">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide flex-shrink-0">Scholarship</span>
                  <span className="text-sm font-semibold text-slate-900 text-right">{scholarship.title || '—'}</span>
                </div>
                {scholarship.field_of_study && (
                  <div className="flex items-start justify-between gap-2 border-t border-slate-200 pt-3">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide flex-shrink-0">Field of Study</span>
                    <span className="text-sm font-semibold text-slate-900 text-right">{scholarship.field_of_study}</span>
                  </div>
                )}
                {scholarship.annual_value_with_scholarship && (
                  <div className="flex items-start justify-between gap-2 border-t border-slate-200 pt-3">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide flex-shrink-0">With Scholarship</span>
                    <span className="text-sm font-bold text-green-700 text-right">
                      ${Number(scholarship.annual_value_with_scholarship).toLocaleString('en-US')}<span className="text-xs font-medium text-green-600">/yr</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowApproveConfirmModal(false);
                    setPendingApproveAppId(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowApproveConfirmModal(false);
                    if (pendingApproveAppId) handleApproveApplication(pendingApproveAppId);
                    setPendingApproveAppId(null);
                  }}
                  disabled={!!pendingApproveAppId && !!approvingApplication[pendingApproveAppId]}
                  className="px-5 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {pendingApproveAppId && approvingApplication[pendingApproveAppId] ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Approving...
                    </>
                  ) : (
                    'Confirm Approval'
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};

export const StudentDetailsModals = React.memo(StudentDetailsModalsComponent);
