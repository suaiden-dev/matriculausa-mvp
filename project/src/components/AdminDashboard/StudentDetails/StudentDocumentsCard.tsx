import React from 'react';
import { FileText, Eye, CheckCircle, XCircle } from 'lucide-react';

interface Document {
  type: string;
  url: string;
  status?: string;
  uploaded_at?: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  changes_requested_at?: string;
  review_notes?: string;
}

interface Application {
  id: string;
  status?: string;
  scholarships?: {
    title?: string;
    universities?: {
      name?: string;
    };
    field_of_study?: string;
    annual_value_with_scholarship?: number;
  };
  documents?: Document[];
}

interface StudentDocumentsCardProps {
  applications: Application[];
  expandedApps: Record<string, boolean>;
  canPlatformAdmin: boolean;
  canUniversityManage: boolean;
  uploadingDocs: Record<string, boolean>;
  approvingDocs: Record<string, boolean>;
  rejectingDocs: Record<string, boolean>;
  approvingStudent?: boolean;
  rejectingStudent?: boolean;
  onToggleExpand: (appKey: string) => void;
  onViewDocument: (doc: { file_url: string; filename: string }) => void;
  onUploadDocument: (appId: string, docType: string, file: File) => Promise<void>;
  onApproveDocument: (appId: string, docType: string) => Promise<void>;
  onRejectDocument: (appId: string, docType: string) => void;
  onApproveApplication?: (appId: string) => void;
  onRejectApplication?: (appId: string) => void;
}

/**
 * StudentDocumentsCard - Displays student documents by application
 * Shows all applications with expandable document lists
 */
const StudentDocumentsCard: React.FC<StudentDocumentsCardProps> = React.memo(({
  applications,
  expandedApps,
  canPlatformAdmin,
  canUniversityManage,
  uploadingDocs,
  approvingDocs,
  rejectingDocs,
  approvingStudent = false,
  rejectingStudent = false,
  onToggleExpand,
  onViewDocument,
  onUploadDocument,
  onApproveDocument,
  onRejectDocument,
  onApproveApplication,
  onRejectApplication,
}) => {
  if (applications.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#0a4a7a] px-6 py-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <FileText className="w-6 h-6 mr-3" />
            Student Documents
          </h2>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Applications Yet</h3>
          </div>
        </div>
      </div>
    );
  }

  const sortedApplications = [...applications].sort((a, b) => {
    if (a.status === 'approved' && b.status !== 'approved') return -1;
    if (b.status === 'approved' && a.status !== 'approved') return 1;
    return 0;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#0a4a7a] px-6 py-4">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <FileText className="w-6 h-6 mr-3" />
          Student Documents
        </h2>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {sortedApplications.map((app, i) => {
            const appKey = app.id || `app-${i}`;
            const isExpanded = expandedApps[appKey] || false;
            const scholarship = app.scholarships;
            const fieldOfStudy = scholarship?.field_of_study || 'N/A';
            const annualValue = scholarship?.annual_value_with_scholarship;
            const formattedValue = typeof annualValue === 'number' 
              ? `$${annualValue.toLocaleString()}` 
              : (annualValue ? `$${Number(annualValue).toLocaleString()}` : 'N/A');

            return (
              <div
                key={appKey}
                className={`border rounded-xl overflow-hidden ${
                  app.status === 'approved'
                    ? 'border-green-200 bg-green-50'
                    : app.status === 'rejected'
                    ? 'border-red-200 bg-red-50'
                    : 'border-slate-200'
                }`}
              >
                <button
                  onClick={() => onToggleExpand(appKey)}
                  className={`w-full px-4 py-3 transition-colors text-left flex items-center justify-between ${
                    app.status === 'approved'
                      ? 'bg-green-50 hover:bg-green-100'
                      : app.status === 'rejected'
                      ? 'bg-red-50 hover:bg-red-100'
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {app.status === 'approved' && (
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                    )}
                    {app.status === 'rejected' && (
                      <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                    )}
                    <div>
                      <h4 className="font-semibold text-slate-900 flex items-center space-x-2">
                        <span>{scholarship?.title || 'Scholarship Application'}</span>
                        {app.status === 'approved' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Approved
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-slate-600">
                        {scholarship?.universities?.name || 'University'} • {app.documents?.length || 0} documents
                      </p>
                      <div className="mt-1 text-xs text-slate-700">
                        <div>
                          <span className="text-slate-500">Course:</span>{' '}
                          <span className="font-medium">{fieldOfStudy}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Annual Value:</span>{' '}
                          <span className="font-medium">{formattedValue}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="p-4 bg-white border-t border-slate-200">
                    {app.documents && app.documents.length > 0 ? (
                      <div className="grid gap-3">
                        {app.documents.map((doc, docIndex) => (
                          <div key={`${app.id}-${doc.type}-${docIndex}`} className="border border-slate-200 rounded-lg p-4">
                            <div className="flex flex-col md:flex-row items-start justify-between gap-2 mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h5 className="font-semibold text-slate-900 text-sm">
                                    {(doc.type || '').replace('_', ' ').replace(/^./, (c: string) => c.toUpperCase())}
                                  </h5>
                                </div>
                                <p className="text-xs text-slate-600 mb-2">Document submitted by student</p>
                              </div>
                              <div className="flex items-center flex-wrap gap-1 ml-0 md:ml-3 flex-shrink-0 justify-start md:justify-end w-full md:w-auto">
                                <button
                                  onClick={() =>
                                    onViewDocument({
                                      file_url: doc.url,
                                      filename: doc.url.split('/').pop() || `${doc.type}.pdf`,
                                    })
                                  }
                                  className="text-xs text-[#05294E] hover:text-[#05294E]/80 font-medium flex items-center space-x-1 transition-colors px-2 py-1 border border-[#05294E] rounded-md hover:bg-[#05294E]/5"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span className="hidden md:inline">View</span>
                                </button>
                                {canUniversityManage && (
                                  <label className="text-xs text-slate-600 hover:text-slate-800 font-medium flex items-center space-x-1 transition-colors px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer">
                                    <input
                                      type="file"
                                      accept="application/pdf,image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) onUploadDocument(app.id, doc.type, f);
                                      }}
                                    />
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16h16M8 12l3 3 5-7" />
                                    </svg>
                                    <span className="hidden md:inline">
                                      {uploadingDocs[`${app.id}:${doc.type}`] ? 'Uploading...' : 'Replace'}
                                    </span>
                                  </label>
                                )}
                                {canPlatformAdmin &&
                                  ['passport', 'funds_proof', 'diploma'].includes(doc.type) &&
                                  (doc.status || '').toLowerCase() !== 'approved' &&
                                  ((doc.status || '').toLowerCase() !== 'rejected' ||
                                    (doc.uploaded_at &&
                                      doc.rejected_at &&
                                      new Date(doc.uploaded_at) > new Date(doc.rejected_at))) && (
                                    <>
                                      <button
                                        onClick={() => onApproveDocument(app.id, doc.type)}
                                        disabled={!!approvingDocs[`${app.id}:${doc.type}`]}
                                        className={`text-xs font-medium flex items-center space-x-1 transition-colors px-2 py-1 rounded-md border ${
                                          approvingDocs[`${app.id}:${doc.type}`]
                                            ? 'text-slate-400 border-slate-200 bg-slate-50'
                                            : 'text-green-700 border-green-300 hover:bg-green-50'
                                        }`}
                                      >
                                        <CheckCircle className="w-3 h-3" />
                                        <span className="hidden md:inline">Approve</span>
                                      </button>
                                      <button
                                        onClick={() => onRejectDocument(app.id, doc.type)}
                                        disabled={!!rejectingDocs[`${app.id}:${doc.type}`]}
                                        className={`text-xs font-medium flex items-center space-x-1 transition-colors px-2 py-1 rounded-md border ${
                                          rejectingDocs[`${app.id}:${doc.type}`]
                                            ? 'text-slate-400 border-slate-200 bg-slate-50'
                                            : 'text-red-700 border-red-300 hover:bg-red-50'
                                        }`}
                                      >
                                        <XCircle className="w-3 h-3" />
                                        <span className="hidden md:inline">Reject</span>
                                      </button>
                                    </>
                                  )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                  (doc.status || 'pending').toLowerCase() === 'approved'
                                    ? 'text-green-700 bg-green-100'
                                    : (doc.status || 'pending').toLowerCase() === 'under_review'
                                    ? 'text-blue-700 bg-blue-100'
                                    : (doc.status || 'pending').toLowerCase() === 'changes_requested'
                                    ? 'text-red-700 bg-red-100'
                                    : 'text-amber-700 bg-amber-100'
                                }`}
                              >
                                {(doc.status || 'pending').replace('_', ' ').replace(/^./, (c: string) => c.toUpperCase())}
                              </span>
                              {doc.uploaded_at && (
                                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                  Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                                </span>
                              )}
                              {doc.approved_at && (
                                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">
                                  Approved {new Date(doc.approved_at).toLocaleDateString()}
                                </span>
                              )}
                              {doc.rejected_at && (
                                <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md">
                                  Rejected {new Date(doc.rejected_at).toLocaleDateString()}
                                </span>
                              )}
                              {doc.rejection_reason && (
                                <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md">
                                  <span className="font-medium">Reason:</span> {doc.rejection_reason}
                                </span>
                              )}
                              {doc.changes_requested_at && (
                                <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md">
                                  Changes Requested {new Date(doc.changes_requested_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            {/* Exibir justificativa quando status for "changes_requested" */}
                            {doc.status === 'changes_requested' && doc.review_notes && (
                              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-start space-x-2">
                                  <div className="flex-shrink-0">
                                    <svg
                                      className="w-4 h-4 text-red-500 mt-0.5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
                                      />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <h5 className="text-sm font-medium text-red-800 mb-1">University Feedback</h5>
                                    <p className="text-sm text-red-700">{doc.review_notes}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                          <FileText className="w-6 h-6 text-slate-400" />
                        </div>
                        <h4 className="text-sm font-medium text-slate-900 mb-1">No Documents Submitted</h4>
                        <p className="text-xs text-slate-500">Student has not uploaded any documents yet.</p>
                      </div>
                    )}
                    
                    {/* Application Approval Section - Only for Platform Admins */}
                    {canPlatformAdmin && (
                      <div className={`mt-4 p-4 rounded-lg border ${
                        app.status === 'approved' 
                          ? 'bg-green-50 border-green-200' 
                          : app.status === 'rejected'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-slate-900">Application Approval</h4>
                            <p className="text-sm text-slate-600">
                              {app.status === 'approved' 
                                ? 'This application has been approved.' 
                                : app.status === 'rejected'
                                ? 'This application has been rejected.'
                                : 'You can approve this application regardless of document status.'
                              }
                            </p>
                          </div>
                          {app.status === 'approved' && (
                            <div className="flex items-center space-x-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Approved</span>
                            </div>
                          )}
                          {app.status === 'rejected' && (
                            <div className="flex items-center space-x-1 text-red-600">
                              <XCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Rejected</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => onRejectApplication && onRejectApplication(app.id)}
                            disabled={approvingStudent || rejectingStudent || app.status === 'approved' || app.status === 'rejected'}
                            className={`px-4 py-2 rounded-lg font-medium border transition-colors text-center text-sm ${
                              app.status === 'rejected' 
                                ? 'bg-red-100 text-red-700 border-red-300 cursor-not-allowed' 
                                : 'text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed'
                            }`}
                          >
                            {app.status === 'approved' ? 'Application Approved' : app.status === 'rejected' ? 'Application Rejected' : 'Reject Application'}
                          </button>
                          <button
                            disabled={approvingStudent || rejectingStudent || app.status === 'approved' || app.status === 'rejected'}
                            onClick={() => onApproveApplication && onApproveApplication(app.id)}
                            className="px-4 py-2 rounded-lg font-medium bg-[#05294E] text-white hover:bg-[#041f38] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center text-sm"
                          >
                            {app.status === 'approved' ? 'Approved' : app.status === 'rejected' ? 'Rejected' : (approvingStudent ? 'Approving...' : 'Approve Application')}
                          </button>
                        </div>
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
  );
}, (prevProps, nextProps) => {
  // Verificar se as aplicações mudaram (especialmente o status)
  const appsChanged = prevProps.applications.length !== nextProps.applications.length ||
    prevProps.applications.some((app, index) => {
      const nextApp = nextProps.applications[index];
      return !nextApp || app.id !== nextApp.id || app.status !== nextApp.status;
    });
  
  return (
    !appsChanged &&
    JSON.stringify(prevProps.expandedApps) === JSON.stringify(nextProps.expandedApps) &&
    JSON.stringify(prevProps.uploadingDocs) === JSON.stringify(nextProps.uploadingDocs) &&
    JSON.stringify(prevProps.approvingDocs) === JSON.stringify(nextProps.approvingDocs) &&
    JSON.stringify(prevProps.rejectingDocs) === JSON.stringify(nextProps.rejectingDocs) &&
    prevProps.approvingStudent === nextProps.approvingStudent &&
    prevProps.rejectingStudent === nextProps.rejectingStudent
  );
});

StudentDocumentsCard.displayName = 'StudentDocumentsCard';

export default StudentDocumentsCard;

