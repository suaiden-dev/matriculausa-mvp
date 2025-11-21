import React, { useState } from 'react';
import { FileText, Eye, Award, Building } from 'lucide-react';

interface ScholarshipApplication {
  id: string;
  status: string;
  scholarships?: {
    id: string;
    title: string;
    field_of_study?: string;
    annual_value_with_scholarship?: number;
    universities?: {
      id: string;
      name: string;
    };
  };
  documents?: any[];
  created_at?: string;
}

interface StudentScholarshipsListProps {
  applications: ScholarshipApplication[];
  onViewDocument?: (doc: any) => void;
}

const StudentScholarshipsList: React.FC<StudentScholarshipsListProps> = ({
  applications,
  onViewDocument
}) => {
  const [expandedApps, setExpandedApps] = useState<{[key: string]: boolean}>({});

  if (!applications || applications.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="bg-gradient-to-r rounded-t-2xl from-slate-600 to-slate-700 px-6 py-4">
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
            <p className="text-sm text-slate-500">Student has not applied to any scholarships yet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="bg-gradient-to-r rounded-t-2xl from-slate-600 to-slate-700 px-6 py-4">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <FileText className="w-6 h-6 mr-3" />
          Student Documents
        </h2>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {applications
            .sort((a: any, b: any) => {
              // Priorizar enrolled e approved primeiro
              const aIsPriority = a.status === 'approved' || a.status === 'enrolled';
              const bIsPriority = b.status === 'approved' || b.status === 'enrolled';
              if (aIsPriority && !bIsPriority) return -1;
              if (bIsPriority && !aIsPriority) return 1;
              // Depois por data de criação (mais recente primeiro)
              const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
              const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
              return dateB - dateA;
            })
            .map((app: any, i: number) => {
              const appKey = app.id || `app-${i}`;
              const isExpanded = expandedApps[appKey] || false;
              const scholarship = app.scholarships
                ? (Array.isArray(app.scholarships) ? app.scholarships[0] : app.scholarships)
                : null;
              
              return (
                <div
                  key={appKey}
                  className={`border rounded-xl overflow-hidden ${
                    app.status === 'approved' || app.status === 'enrolled'
                      ? 'border-green-200 bg-green-50'
                      : app.status === 'rejected'
                      ? 'border-red-200 bg-red-50'
                      : 'border-slate-200'
                  }`}
                >
                  <button
                    onClick={() => setExpandedApps(p => ({ ...p, [appKey]: !isExpanded }))}
                    className={`w-full px-4 py-3 transition-colors text-left flex items-center justify-between ${
                      app.status === 'approved' || app.status === 'enrolled'
                        ? 'bg-green-50 hover:bg-green-100'
                        : app.status === 'rejected'
                        ? 'bg-red-50 hover:bg-red-100'
                        : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {(app.status === 'approved' || app.status === 'enrolled') && (
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      )}
                      {app.status === 'rejected' && (
                        <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                      )}
                      {app.status !== 'approved' && app.status !== 'rejected' && app.status !== 'enrolled' && (
                        <div className="w-2 h-2 bg-slate-400 rounded-full flex-shrink-0"></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-slate-900 flex items-center space-x-2">
                            <Award className="w-4 h-4 text-slate-600" />
                            <span className="truncate">{scholarship?.title || 'Scholarship Application'}</span>
                          </h4>
                          {app.status === 'approved' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
                              Approved
                            </span>
                          )}
                          {app.status === 'enrolled' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
                              Enrolled
                            </span>
                          )}
                          {app.status === 'rejected' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex-shrink-0">
                              Rejected
                            </span>
                          )}
                          {app.status === 'pending' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 flex-shrink-0">
                              Pending
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 flex items-center space-x-1">
                          <Building className="w-3 h-3" />
                          <span className="truncate">{scholarship?.universities?.name || 'University'}</span>
                          <span className="mx-1">•</span>
                          <span>{app.documents ? app.documents.length : 0} documents</span>
                        </p>
                        <div className="mt-1 text-xs text-slate-700 space-y-0.5">
                          <div>
                            <span className="text-slate-500">Course:</span>{' '}
                            <span className="font-medium">{scholarship?.field_of_study || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Annual Value:</span>{' '}
                            <span className="font-medium">
                              {(() => {
                                const v = scholarship?.annual_value_with_scholarship;
                                return typeof v === 'number'
                                  ? `$${v.toLocaleString()}`
                                  : v
                                  ? `$${Number(v).toLocaleString()}`
                                  : 'N/A';
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ml-2 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="p-4 bg-white border-t border-slate-200">
                      {app.documents && app.documents.length > 0 ? (
                        <div className="grid gap-3">
                          {app.documents.map((doc: any, docIndex: number) => (
                            <div
                              key={`${app.id}-${doc.type}-${docIndex}`}
                              className="border border-slate-200 rounded-lg p-4"
                            >
                              <div className="flex flex-col md:flex-row items-start justify-between gap-2 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h5 className="font-semibold text-slate-900 text-sm">
                                      {(doc.type || '')
                                        .replace('_', ' ')
                                        .replace(/^./, (c: string) => c.toUpperCase())}
                                    </h5>
                                  </div>
                                  <p className="text-xs text-slate-600 mb-2">
                                    Document submitted by student
                                  </p>
                                </div>
                                <div className="flex items-center flex-wrap gap-1 ml-0 md:ml-3 flex-shrink-0 justify-start md:justify-end w-full md:w-auto">
                                  {onViewDocument && (doc.url || doc.file_url) && (
                                    <button
                                      onClick={() => {
                                        const fileUrl = doc.file_url || doc.url;
                                        const filename = doc.filename || 
                                          (fileUrl ? fileUrl.split('/').pop() : null) || 
                                          `${doc.type || 'document'}.pdf`;
                                        
                                        onViewDocument({
                                          file_url: fileUrl,
                                          filename: filename,
                                          type: doc.type
                                        });
                                      }}
                                      className="text-xs text-[#05294E] hover:text-[#05294E]/80 font-medium flex items-center space-x-1 transition-colors px-2 py-1 border border-[#05294E] rounded-md hover:bg-[#05294E]/5"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span className="hidden md:inline">View</span>
                                    </button>
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
                                  {(doc.status || 'pending')
                                    .replace('_', ' ')
                                    .replace(/^./, (c: string) => c.toUpperCase())}
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
                                      <h5 className="text-sm font-medium text-red-800 mb-1">
                                        University Feedback
                                      </h5>
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
                          <h4 className="text-sm font-medium text-slate-900 mb-1">
                            No Documents Submitted
                          </h4>
                          <p className="text-xs text-slate-500">
                            Student has not uploaded any documents yet.
                          </p>
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
};

export default StudentScholarshipsList;

