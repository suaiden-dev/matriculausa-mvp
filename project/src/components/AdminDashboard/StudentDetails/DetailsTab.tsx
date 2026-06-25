import React from 'react';
import type { Application, UserProfile, Scholarship } from '../../../types';
import { getDocumentStatusDisplay } from '../../../utils/documentStatusMapper';
import ApplicationProgressCard from './ApplicationProgressCard';
import PaymentStatusCard from './PaymentStatusCard';
import type { InstallmentPlan } from '../../../config/installmentConfig';
import { FileText, UserCircle, CheckCircle2, Award } from 'lucide-react';

interface ApplicationDetails extends Application {
  user_profiles: UserProfile & {
    selection_survey_passed?: boolean;
    selected_application_id?: string | null;
  };
  scholarships: Scholarship;
}

const DOCUMENTS_INFO = [
  {
    key: 'passport',
    label: 'Passport',
    description: 'A valid copy of the student\'s passport. Used for identification and visa purposes.'
  }
];

interface DetailsTabProps {
  application: ApplicationDetails;
  allStudentApplications: any[];
  isChoseAnother: boolean;
  studentRecord: any;
  // Progress
  steps: { key: string; label: string }[];
  getStepStatus: (step: { key: string; label: string }) => string;
  getCurrentStep: () => any;
  isProgressExpanded: boolean;
  setIsProgressExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  // Payment
  realPaidAmounts: Record<string, number>;
  loadingPaidAmounts: Record<string, boolean>;
  installmentPlans: Record<string, InstallmentPlan | null>;
  hasOverride: (feeType: string) => boolean;
  formatFeeAmount: (feeType: string) => string;
  getFeeAmount: (feeType: string) => number;
  // Document review
  expandedAppDocs: Record<string, boolean>;
  setExpandedAppDocs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  updating: string | null;
  approveDoc: (type: string, targetAppId?: string) => Promise<void>;
  handleViewDocument: (doc: any) => void;
  // Document reject
  setPendingRejectType: (type: string | null) => void;
  setPendingRejectDocAppId: (id: string | null) => void;
  setShowReasonModal: (show: boolean) => void;
  // Application approval
  approvingApplication: Record<string, boolean>;
  setPendingApproveAppId: (id: string | null) => void;
  setShowApproveConfirmModal: (show: boolean) => void;
  setPendingRejectAppId: (id: string | null) => void;
  setShowRejectStudentModal: (show: boolean) => void;
  // Ref
  documentReviewRef: React.RefObject<HTMLDivElement | null>;
}

const DetailsTabComponent: React.FC<DetailsTabProps> = ({
  application,
  allStudentApplications,
  isChoseAnother,
  studentRecord,
  steps,
  getStepStatus,
  getCurrentStep,
  isProgressExpanded,
  setIsProgressExpanded,
  realPaidAmounts,
  loadingPaidAmounts,
  installmentPlans,
  hasOverride,
  formatFeeAmount,
  getFeeAmount,
  expandedAppDocs,
  setExpandedAppDocs,
  updating,
  approveDoc,
  handleViewDocument,
  setPendingRejectType,
  setPendingRejectDocAppId,
  setShowReasonModal,
  approvingApplication,
  setPendingApproveAppId,
  setShowApproveConfirmModal,
  setPendingRejectAppId,
  setShowRejectStudentModal,
  documentReviewRef,
}) => {
  return (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className={`${isChoseAnother ? 'xl:col-span-12' : 'xl:col-span-8'} space-y-6`}>
              {/* Student Information Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#05294E] to-[#0a4a7a] px-8 py-5">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <UserCircle className="w-6 h-6 mr-3" />
                    Student Information
                  </h2>
                </div>

                <div className="p-8 space-y-12">
                  {/* Personal Information Section */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                      <div className="w-1.5 h-1.5 bg-[#05294E] rounded-full mr-3"></div>
                      Personal Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Full Name</dt>
                        <dd className="text-base font-semibold text-slate-900 mt-1">{application?.user_profiles?.full_name || 'Not provided'}</dd>
                      </div>
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Email Address</dt>
                        <dd className="text-base font-semibold text-slate-900 mt-1">{application?.user_profiles?.email || 'Not provided'}</dd>
                      </div>
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Phone Number</dt>
                        <dd className="text-base font-semibold text-slate-900 mt-1">{application?.user_profiles?.phone || 'Not provided'}</dd>
                      </div>
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Country of Residence</dt>
                        <dd className="text-base font-semibold text-slate-900 mt-1">{application?.user_profiles?.country || 'Not specified'}</dd>
                      </div>
                    </div>
                  </div>

                  {/* Academic Profile Section */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                      <div className="w-1.5 h-1.5 bg-[#05294E] rounded-full mr-3"></div>
                      Academic Profile
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Field of Interest</dt>
                        <dd className="text-base font-semibold text-slate-900 mt-1">{application?.user_profiles?.field_of_interest || 'Not specified'}</dd>
                      </div>
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Academic Level</dt>
                        <dd className="text-base font-semibold text-slate-900 mt-1">{application?.user_profiles?.academic_level || 'Not specified'}</dd>
                      </div>
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">GPA / Academic Performance</dt>
                        <dd className="text-base font-semibold text-slate-900 mt-1">{application?.user_profiles?.gpa || 'Not provided'}</dd>
                      </div>
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">English Proficiency</dt>
                        <dd className="text-base font-semibold text-slate-900 mt-1">{application?.user_profiles?.english_proficiency || 'Not specified'}</dd>
                      </div>
                    </div>
                  </div>

                  {/* Application Status Section */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                      <div className="w-1.5 h-1.5 bg-[#05294E] rounded-full mr-3"></div>
                      Application & Status
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Student Process Type</dt>
                        <dd className="text-base font-semibold text-slate-900 mt-1">
                          {(() => {
                            const type = application.student_process_type;
                            const visaTransferActive = (application.user_profiles as any)?.visa_transfer_active;
                            if (type === 'initial') return 'Initial – F-1 Visa';
                            if (type === 'transfer') {
                              return visaTransferActive === false
                                ? 'Transfer – Needs Reinstatement'
                                : 'Transfer – Active F-1';
                            }
                            if (type === 'change_of_status') return 'Change of Status';
                            if (type === 'resident') return 'Resident';
                            return type || 'Not specified';
                          })()}
                        </dd>
                      </div>
                      {!isChoseAnother && (
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Application Fee</dt>
                        <dd className="mt-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {(() => {
                                const paid = (application as any)?.is_application_fee_paid ?? application?.user_profiles?.is_application_fee_paid;
                                return (
                                  <>
                                    <div className={`w-2.5 h-2.5 rounded-full ${paid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className={`text-sm font-semibold ${paid ? 'text-green-700' : 'text-red-700'}`}>
                                      {paid ? 'Paid' : 'Pending Payment'}
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                            {!((application as any)?.is_application_fee_paid ?? application?.user_profiles?.is_application_fee_paid) && (
                              <div className="text-right">
                                <span className="text-[11px] font-medium text-slate-400 uppercase">Varies by scholarship</span>
                              </div>
                            )}
                          </div>
                        </dd>
                      </div>
                      )}
                      {!isChoseAnother && (
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Documents Review</dt>
                        <dd className="mt-1">
                          <div className="flex items-center space-x-2">
                            {(() => {
                              const statusDisplay = getDocumentStatusDisplay(application?.user_profiles?.documents_status || '');
                              return (
                                <>
                                  <div className={`w-2.5 h-2.5 rounded-full ${statusDisplay.bgColor}`}></div>
                                  <span className={`text-sm font-semibold ${statusDisplay.color}`}>
                                    {statusDisplay.text}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </dd>
                      </div>
                      )}
                      {!isChoseAnother && (
                      <div className="border-b border-slate-100 pb-4">
                        <dt className="text-sm font-medium text-slate-500">Enrollment Milestone</dt>
                        <dd className="mt-1">
                          {application.status === 'enrolled' || application.acceptance_letter_status === 'approved' ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-semibold text-green-700">Fully Enrolled</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div>
                              <span className="text-sm font-semibold text-amber-700">Pending Acceptance</span>
                            </div>
                          )}
                        </dd>
                      </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Scholarship — shows the scholarship the student chose to proceed with */}
              {(() => {
                const selectedAppId = application.user_profiles?.selected_application_id;
                const selectedApp = selectedAppId
                  ? allStudentApplications.find((a: any) => a.id === selectedAppId)
                  : null;

                const scholarship = selectedApp?.scholarships || {};

                if (isChoseAnother) {
                  return null;
                }

                return (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                    <div className="bg-gradient-to-r rounded-t-2xl from-slate-700 to-slate-800 px-6 py-4">
                      <h2 className="text-xl font-semibold text-white flex items-center">
                        <Award className="w-6 h-6 mr-3" />
                        Selected Scholarship
                      </h2>
                    </div>
                    {selectedApp ? (
                      <div className="p-6 space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Scholarship Program</dt>
                          <dd className="text-lg font-semibold text-slate-900 mt-1">{scholarship.title || 'Unknown'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Course</dt>
                          <dd className="text-base font-semibold text-slate-900">{scholarship.field_of_study || 'N/A'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Semester Value (with Scholarship)</dt>
                          <dd className="text-base font-semibold text-slate-900">
                            {(() => {
                              const v = scholarship.annual_value_with_scholarship;
                              return typeof v === 'number' ? `$${v.toLocaleString()}` : (v ? `$${Number(v).toLocaleString()}` : 'N/A');
                            })()}
                          </dd>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6">
                        <div className="text-center py-4">
                          <div className="mx-auto w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                            <Award className="w-5 h-5 text-slate-400" />
                          </div>
                          <p className="text-sm font-medium text-slate-500">No scholarship selected yet</p>
                          <p className="text-xs text-slate-400 mt-1">The student hasn't confirmed which scholarship they want to proceed with.</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Document Review & Application Approval — per application accordion */}
              <div ref={documentReviewRef} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-8 py-5">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Document Review & Approval
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {(allStudentApplications.length > 0 ? allStudentApplications : [application]).map((app: any) => {
                      const appKey = app.id;
                      const isExpanded = expandedAppDocs[appKey] ?? false;
                      const scholarship = app.scholarships || {};
                      const appDocs: any[] = Array.isArray(app.documents) ? app.documents : [];


                      const statusBorder = app.status === 'approved' || app.status === 'enrolled'
                        ? 'border-green-200'
                        : app.status === 'rejected'
                          ? 'border-red-200'
                          : 'border-slate-200';
                      const headerBg = app.status === 'approved' || app.status === 'enrolled'
                        ? 'bg-green-50 hover:bg-green-100'
                        : app.status === 'rejected'
                          ? 'bg-red-50 hover:bg-red-100'
                          : 'bg-slate-50 hover:bg-slate-100';

                      return (
                        <div key={appKey} className={`border rounded-xl overflow-hidden ${statusBorder}`}>
                          {/* Accordion header */}
                          <button
                            onClick={() => setExpandedAppDocs(prev => ({ ...prev, [appKey]: !isExpanded }))}
                            className={`w-full px-4 py-3 transition-colors text-left flex items-center justify-between ${headerBg}`}
                          >
                            <div className="flex items-center space-x-3">
                              {(app.status === 'approved' || app.status === 'enrolled') && (
                                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                              )}
                              {app.status === 'rejected' && (
                                <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                              )}
                              {app.status !== 'approved' && app.status !== 'enrolled' && app.status !== 'rejected' && (
                                <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0"></div>
                              )}
                              <div>
                                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                  <span>{scholarship.title || 'Scholarship Application'}</span>
                                  {app.status === 'approved' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>
                                  )}
                                  {app.status === 'enrolled' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Enrolled</span>
                                  )}
                                  {app.status === 'rejected' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>
                                  )}
                                </h4>
                                <p className="text-sm text-slate-600">
                                  {appDocs.length} document{appDocs.length !== 1 ? 's' : ''}
                                </p>
                                <div className="mt-1 text-xs text-slate-700">
                                  <div>
                                    <span className="text-slate-500">Course:</span>{' '}
                                    <span className="font-medium">{scholarship.field_of_study || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Semester Value:</span>{' '}
                                    <span className="font-medium">
                                      {(() => {
                                        const v = scholarship.annual_value_with_scholarship;
                                        return typeof v === 'number' ? `$${v.toLocaleString()}` : (v ? `$${Number(v).toLocaleString()}` : 'N/A');
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <svg
                              className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* Accordion content */}
                          {isExpanded && (
                            <div className="border-t border-slate-200">
                              {/* Documents table-style list */}
                              <div className="divide-y divide-slate-100">
                                {DOCUMENTS_INFO.map((docInfo) => {
                                  const docInApp = appDocs.find((d: any) => d.type === docInfo.key);
                                  const d = docInApp ? {
                                    ...docInApp,
                                    file_url: docInApp.url || docInApp.file_url,
                                    type: docInApp.type,
                                    status: docInApp.status || 'under_review',
                                    uploaded_at: docInApp.uploaded_at
                                  } : null;
                                  const status = d?.status || 'not_submitted';
                                  const updatingKey = `${app.id}:${docInfo.key}`;

                                  return (
                                    <div key={docInfo.key} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                          status === 'approved' ? 'bg-green-100' :
                                          status === 'changes_requested' ? 'bg-red-100' :
                                          d?.file_url ? 'bg-blue-100' : 'bg-slate-100'
                                        }`}>
                                          <FileText className={`w-4 h-4 ${
                                            status === 'approved' ? 'text-green-600' :
                                            status === 'changes_requested' ? 'text-red-600' :
                                            d?.file_url ? 'text-blue-600' : 'text-slate-400'
                                          }`} />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium text-slate-900">{docInfo.label}</p>
                                          <p className="text-xs text-slate-400">
                                            {d?.uploaded_at
                                              ? `Uploaded ${new Date(d.uploaded_at).toLocaleDateString()}`
                                              : 'Not submitted yet'}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                          status === 'approved' ? 'bg-green-100 text-green-700' :
                                          status === 'changes_requested' ? 'bg-red-100 text-red-700' :
                                          status === 'under_review' ? 'bg-amber-100 text-amber-700' :
                                          'bg-slate-100 text-slate-500'
                                        }`}>
                                          {status === 'approved' ? 'Approved' :
                                           status === 'changes_requested' ? 'Changes Requested' :
                                           status === 'under_review' ? 'Under Review' :
                                           d?.file_url ? 'Submitted' : 'Pending'}
                                        </span>
                                        {d?.file_url && (
                                          <button
                                            onClick={() => handleViewDocument(d)}
                                            className="text-xs text-[#05294E] hover:text-[#05294E]/80 font-medium px-2 py-1 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                                          >
                                            View
                                          </button>
                                        )}
                                        {d?.file_url && status !== 'approved' && app.status !== 'enrolled' && app.status !== 'rejected' && !isChoseAnother && (
                                          <>
                                            <button
                                              onClick={() => approveDoc(docInfo.key, app.id)}
                                              disabled={updating === updatingKey}
                                              className="text-xs font-medium px-2 py-1 rounded-md border border-green-200 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
                                            >
                                              Approve
                                            </button>
                                            <button
                                              onClick={() => {
                                                setPendingRejectType(docInfo.key);
                                                setPendingRejectDocAppId(app.id);
                                                setShowReasonModal(true);
                                              }}
                                              disabled={updating === updatingKey}
                                              className="text-xs font-medium px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
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

                              {/* Application Approval Section */}
                              {app.status !== 'enrolled' && (
                                <div className={`mx-4 mb-4 mt-2 p-4 rounded-xl ${
                                  isChoseAnother ? 'bg-slate-50 border border-slate-200' :
                                  app.status === 'approved' ? 'bg-green-50 border border-green-200' :
                                  app.status === 'rejected' ? 'bg-red-50 border border-red-200' :
                                  'bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200'
                                }`}>
                                  {isChoseAnother ? (
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h4 className="text-sm font-semibold text-slate-900">Application Decision</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                          This student has already been admitted to another scholarship. No actions available.
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full">
                                        <span className="text-xs font-semibold text-slate-500">Locked</span>
                                      </div>
                                    </div>
                                  ) : (
                                  <>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="text-sm font-semibold text-slate-900">Application Decision</h4>
                                      <p className="text-xs text-slate-500 mt-0.5">
                                        {(() => {
                                          if (app.status === 'approved') return 'This application has been approved.';
                                          if (app.status === 'rejected') return 'This application has been rejected.';

                                          const requiredTypes = ['passport'];
                                          const presentTypes = appDocs.map((d: any) => (d.type || '').toLowerCase());
                                          const missingRequired = requiredTypes.filter(t => !presentTypes.includes(t));

                                          if (missingRequired.length > 0) {
                                            return `Missing required documents: ${missingRequired.join(', ')}.`;
                                          }

                                          const allApproved = appDocs.length > 0 && appDocs.every((d: any) => (d.status || '').toLowerCase() === 'approved');
                                          if (!allApproved) {
                                            return 'Approve all documents first to unlock application approval.';
                                          }

                                          return 'All documents approved — ready to approve this application.';
                                        })()}
                                      </p>
                                    </div>
                                    {app.status === 'approved' && (
                                      <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 rounded-full">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                        <span className="text-xs font-semibold text-green-700">Approved</span>
                                      </div>
                                    )}
                                    {app.status === 'rejected' && (
                                      <span className="px-3 py-1 bg-red-100 rounded-full text-xs font-semibold text-red-700">Rejected</span>
                                    )}
                                  </div>
                                  {app.status !== 'approved' && app.status !== 'rejected' && (
                                    <div className="flex items-center gap-2 mt-3">
                                      {(() => {
                                        const requiredTypes = ['passport'];
                                        const presentTypes = appDocs.map((d: any) => (d.type || '').toLowerCase());
                                        const hasAllRequired = requiredTypes.every(t => presentTypes.includes(t));
                                        const allDocsApproved = appDocs.length > 0 && appDocs.every((d: any) => (d.status || '').toLowerCase() === 'approved');
                                        const canApprove = hasAllRequired && allDocsApproved;

                                        return (
                                          <>
                                            <button
                                              disabled={!canApprove || !!approvingApplication[app.id]}
                                              onClick={() => {
                                                setPendingApproveAppId(app.id);
                                                setShowApproveConfirmModal(true);
                                              }}
                                              className={`px-4 py-2 rounded-lg font-medium text-white text-sm transition-all ${
                                                canApprove
                                                  ? 'bg-[#05294E] hover:bg-[#041f38] hover:scale-[1.02] active:scale-[0.98] shadow-sm'
                                                  : 'bg-slate-300 cursor-not-allowed'
                                              }`}
                                            >
                                              {approvingApplication[app.id] ? 'Approving...' : 'Approve Application'}
                                            </button>
                                            <button
                                              onClick={() => {
                                                setPendingRejectAppId(app.id);
                                                setShowRejectStudentModal(true);
                                              }}
                                              className="px-4 py-2 rounded-lg font-medium text-sm text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                                            >
                                              Reject
                                            </button>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  )}
                                  </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>


            </div>

            {/* Sidebar */}
            {!isChoseAnother && (
              <div className="xl:col-span-4 space-y-4">
                <ApplicationProgressCard
                  currentStep={getCurrentStep()}
                  allSteps={steps}
                  isExpanded={isProgressExpanded}
                  onToggleExpand={() => setIsProgressExpanded(!isProgressExpanded)}
                  getStepStatus={getStepStatus}
                />

                {studentRecord && (
                  <PaymentStatusCard
                    student={studentRecord}
                    realPaidAmounts={realPaidAmounts}
                    loadingPaidAmounts={loadingPaidAmounts}
                    editingFees={null}
                    editingPaymentMethod={null}
                    newPaymentMethod=""
                    savingPaymentMethod={false}
                    savingFees={false}
                    isPlatformAdmin={false}
                    dependents={studentRecord.dependents || 0}
                    hasOverride={hasOverride}
                    userSystemType={studentRecord.system_type}
                    hasMatriculaRewardsDiscount={false}
                    installmentPlans={installmentPlans}
                    onStartEditFees={() => { }}
                    onSaveEditFees={async () => { }}
                    onCancelEditFees={() => { }}
                    onResetFees={async () => { }}
                    onEditFeesChange={() => { }}
                    onMarkAsPaid={() => { }}
                    onEditPaymentMethod={() => { }}
                    onUpdatePaymentMethod={async () => { }}
                    onCancelPaymentMethod={() => { }}
                    onPaymentMethodChange={() => { }}
                    formatFeeAmount={formatFeeAmount}
                    getFeeAmount={getFeeAmount}
                    hideSelectionFee={true}
                  />
                )}

                {/* Sidebar Content is now focused on Progress and Payments */}
              </div>
            )}
          </div>
  );
};

export const DetailsTab = React.memo(DetailsTabComponent);
