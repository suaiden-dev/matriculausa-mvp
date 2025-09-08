import React from 'react';
import { User, FileText } from 'lucide-react';
import { getDocumentStatusDisplay } from '../../utils/documentStatusMapper';
import { StudentInfo, ScholarshipApplication } from './types';

interface StudentDetailsViewProps {
  studentDetails: StudentInfo;
  scholarshipApplication: ScholarshipApplication | null;
  studentDocuments: any[];
  onBack: () => void;
  activeTab: 'details' | 'documents';
  onTabChange: (tab: 'details' | 'documents') => void;
  onViewDocument: (doc: any) => void;
  onDownloadDocument: (doc: any) => void;
}

const StudentDetailsView: React.FC<StudentDetailsViewProps> = ({
  studentDetails,
  scholarshipApplication,
  studentDocuments,
  activeTab,
  onTabChange,
  onViewDocument,
  onDownloadDocument
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Section */}


      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 space-y-6">
              {/* Student Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#0a4a7a] px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <User className="w-6 h-6 mr-3" />
                    Student Information
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Personal Details</h3>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Full Name</dt>
                          <dd className="text-base font-semibold text-slate-900 mt-1">{studentDetails.full_name}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Email</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentDetails.email || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Phone</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentDetails.phone || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Country</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentDetails.country || 'Not specified'}</dd>
                        </div>
                      </div>
                    </div>

                    {/* Academic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Academic Profile</h3>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Field of Interest</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentDetails.field_of_interest || 'Not specified'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Academic Level</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentDetails.academic_level || 'Not specified'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">GPA</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentDetails.gpa || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">English Proficiency</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentDetails.english_proficiency || 'Not specified'}</dd>
                        </div>
                      </div>
                    </div>

                    {/* Application & Status */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Application Status</h3>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Student Type</dt>
                          <dd className="text-base text-slate-900 mt-1">
                            {(() => {
                              if (studentDetails?.student_process_type && studentDetails.student_process_type !== 'Not specified') {
                                if (studentDetails.student_process_type === 'initial') {
                                  return 'Initial - F-1 Visa Required';
                                } else if (studentDetails.student_process_type === 'transfer') {
                                  return 'Transfer - Current F-1 Student';
                                } else if (studentDetails.student_process_type === 'change_of_status') {
                                  return 'Change of Status - From Other Visa';
                                } else {
                                  return studentDetails.student_process_type;
                                }
                              }
                              return 'Not specified';
                            })()}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Application Fee</dt>
                          <dd className="mt-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                studentDetails.is_application_fee_paid ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              <span className={`text-sm font-medium ${
                                studentDetails.is_application_fee_paid ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {studentDetails.is_application_fee_paid ? 'Paid' : 'Pending'}
                              </span>
                            </div>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Documents Status</dt>
                          <dd className="mt-1">
                            <div className="flex items-center space-x-2">
                              {(() => {
                                // Calcular status baseado nos documentos disponíveis (prioriza props recentes)
                                const requiredDocs = ['passport', 'diploma', 'funds_proof'];
                                const appDocuments = (studentDetails as any)?.documents || [];
                                const docsFromProps = Array.isArray(studentDocuments) ? studentDocuments : [];
                                
                                let documentsStatus: string | undefined = undefined;
                                
                                // Preferir documentos vindos por props (estão mais atualizados)
                                if (Array.isArray(docsFromProps) && docsFromProps.length > 0) {
                                  const allApproved = requiredDocs.every((t) => {
                                    const d = docsFromProps.find((x: any) => x.type === t);
                                    return d && (d.status || '').toLowerCase() === 'approved';
                                  });
                                  if (allApproved) {
                                    documentsStatus = 'approved';
                                  } else {
                                    const hasChanges = requiredDocs.some((t) => {
                                      const d = docsFromProps.find((x: any) => x.type === t);
                                      return d && (d.status || '').toLowerCase() === 'changes_requested';
                                    });
                                    if (hasChanges) {
                                      documentsStatus = 'changes_requested';
                                    } else {
                                      const anySubmitted = requiredDocs.some((t) => {
                                        const d = docsFromProps.find((x: any) => x.type === t);
                                        return !!d && !!(d.file_url || d.url);
                                      });
                                      documentsStatus = anySubmitted ? 'under_review' : 'pending';
                                    }
                                  }
                                } else if (Array.isArray(appDocuments) && appDocuments.length > 0) {
                                  // Fallback para documentos do studentDetails
                                  const allApproved = requiredDocs.every((t) => {
                                    const d = appDocuments.find((x: any) => x.type === t);
                                    return d && (d.status || '').toLowerCase() === 'approved';
                                  });
                                  if (allApproved) {
                                    documentsStatus = 'approved';
                                  } else {
                                    const hasChanges = requiredDocs.some((t) => {
                                      const d = appDocuments.find((x: any) => x.type === t);
                                      return d && (d.status || '').toLowerCase() === 'changes_requested';
                                    });
                                    if (hasChanges) {
                                      documentsStatus = 'changes_requested';
                                    } else {
                                      const anySubmitted = requiredDocs.some((t) => {
                                        const d = appDocuments.find((x: any) => x.type === t);
                                        return !!d && !!(d.file_url || d.url);
                                      });
                                      documentsStatus = anySubmitted ? 'under_review' : 'pending';
                                    }
                                  }
                                } else {
                                  // Último recurso: usar documents_status vindo do perfil
                                  documentsStatus = studentDetails?.documents_status || 'pending';
                                }
                                
                                const statusDisplay = getDocumentStatusDisplay(documentsStatus);
                                return (
                                  <>
                                    <div className={`w-2 h-2 rounded-full ${statusDisplay.bgColor}`}></div>
                                    <span className={`text-sm font-medium ${statusDisplay.color}`}>
                                      {statusDisplay.text}
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Enrollment Status</dt>
                          <dd className="mt-1">
                            {(() => {
                              const acceptanceStatus = (studentDetails as any)?.acceptance_letter_status as string | undefined;
                              const appStatus = (scholarshipApplication?.status || (studentDetails as any)?.application_status) as string | undefined;
                              
                              let label = 'Pending Acceptance';
                              let color = 'text-yellow-700';
                              let dot = 'bg-yellow-500';
                              
                              if ((appStatus && ['enrolled'].includes(appStatus)) || acceptanceStatus === 'approved') {
                                label = 'Enrolled';
                                color = 'text-green-700';
                                dot = 'bg-green-500';
                              } else if (appStatus && ['approved', 'accepted'].includes(appStatus)) {
                                label = 'Approved';
                                color = 'text-green-700';
                                dot = 'bg-green-500';
                              } else if (acceptanceStatus === 'signed') {
                                label = 'Letter Signed';
                                color = 'text-purple-700';
                                dot = 'bg-purple-500';
                              } else if (acceptanceStatus === 'sent') {
                                label = 'Letter Sent';
                                color = 'text-blue-700';
                                dot = 'bg-blue-500';
                              } else if (acceptanceStatus === 'pending') {
                                label = 'Pending';
                                color = 'text-yellow-700';
                                dot = 'bg-yellow-500';
                              }
                              
                              return (
                                <div className="flex items-center space-x-2">
                                  <div className={`w-2 h-2 rounded-full ${dot}`}></div>
                                  <span className={`text-sm font-medium ${color}`}>{label}</span>
                                </div>
                              );
                            })()}
                          </dd>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scholarship Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-slate-700 to-slate-800 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Scholarship Details
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">Scholarship Program</dt>
                        <dd className="text-lg font-semibold text-slate-900">
                          {studentDetails?.scholarship_title && studentDetails.scholarship_title !== 'Scholarship not specified'
                            ? studentDetails.scholarship_title
                            : 'Scholarship information not available'
                          }
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">University</dt>
                        <dd className="text-lg font-semibold text-slate-900">
                          {studentDetails?.university_name && studentDetails.university_name !== 'University not specified'
                            ? studentDetails.university_name
                            : 'University not specified'
                          }
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">Application Status</dt>
                        <dd className="text-base text-slate-700">
                          {studentDetails?.application_status && studentDetails.application_status !== 'Not specified'
                            ? studentDetails.application_status.charAt(0).toUpperCase() + studentDetails.application_status.slice(1)
                            : 'Pending'
                          }
                        </dd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Documents Section */}
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
                <div className="p-6">
                  {studentDocuments && studentDocuments.length > 0 ? (
                    <div className="space-y-2">
                      {studentDocuments.map((doc: any, index: number) => (
                        <div key={doc.id || index}>
                          <div className="bg-white p-4">
                            <div className="flex items-start space-x-4">
                              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3 mb-1">
                                  <p className="text-sm font-medium text-slate-600 capitalize">{doc.type || 'Document'}</p>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                                
                                {/* Botões de visualização e download */}
                                <div className="flex items-center space-x-2 mt-3">
                                  {doc.url && (
                                    <button 
                                      onClick={() => onViewDocument(doc)}
                                      className="bg-[#05294E] hover:bg-[#041f38] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                    >
                                      View Document
                                    </button>
                                  )}
                                  {doc.url && (
                                    <button 
                                      onClick={() => onDownloadDocument(doc)}
                                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                    >
                                      Download
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {index < (studentDetails.documents?.length || 0) - 1 && (
                            <div className="border-t border-slate-200"></div>
                          )}
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
            </div>

            {/* Sidebar */}
            <div className="xl:col-span-4 space-y-4">
              {/* Quick Stats Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#041f38] px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Application Summary</h3>
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Submitted</span>
                    <span className="text-sm text-slate-900">
                      {formatDate(studentDetails.registration_date)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-slate-600 to-slate-700 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-900">Application submitted</p>
                        <p className="text-xs text-slate-500">{formatDate(studentDetails.registration_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-900">Last updated</p>
                        <p className="text-xs text-slate-500">{formatDate(studentDetails.registration_date)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-slate-500 to-slate-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <button
                      onClick={() => onTabChange('documents')}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-slate-600" />
                        <span className="text-sm font-medium text-slate-900">Documents</span>
                      </div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Fee Status Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-slate-500 to-slate-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Fee Status</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {/* Selection Process Fee Status */}
                    <div className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${studentDetails?.has_paid_selection_process_fee ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-sm font-medium text-slate-900">Selection Process Fee</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-medium ${studentDetails?.has_paid_selection_process_fee ? 'text-green-700' : 'text-red-700'}`}>
                            {studentDetails?.has_paid_selection_process_fee ? 'Paid' : 'Pending'}
                          </span>
                          {studentDetails?.has_paid_selection_process_fee && (
                            <span className="text-xs text-slate-500">$999.00</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Application Fee Status */}
                    <div className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${studentDetails?.is_application_fee_paid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm font-medium text-slate-900">Application Fee</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-medium ${studentDetails?.is_application_fee_paid ? 'text-green-700' : 'text-red-700'}`}>
                          {studentDetails?.is_application_fee_paid ? 'Paid' : 'Pending'}
                        </span>
                        {studentDetails?.is_application_fee_paid && (
                          <span className="text-xs text-slate-500">
                            ${studentDetails?.scholarship?.application_fee_amount ? 
                              (Number(studentDetails.scholarship.application_fee_amount) / 100).toFixed(2) : 
                              '350.00'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Scholarship Fee Status */}
                    <div className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${studentDetails?.is_scholarship_fee_paid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm font-medium text-slate-900">Scholarship Fee</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-medium ${studentDetails?.is_scholarship_fee_paid ? 'text-green-700' : 'text-red-700'}`}>
                          {studentDetails?.is_scholarship_fee_paid ? 'Paid' : 'Pending'}
                        </span>
                        {studentDetails?.is_scholarship_fee_paid && (
                          <span className="text-xs text-slate-500">
                            ${studentDetails?.scholarship?.scholarship_fee_amount ? 
                              (Number(studentDetails.scholarship.scholarship_fee_amount) / 100).toFixed(2) : 
                              '850.00'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* I-20 Control Fee Status */}
                    <div className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${studentDetails?.has_paid_i20_control_fee ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-sm font-medium text-slate-900">I-20 Control Fee</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-medium ${studentDetails?.has_paid_i20_control_fee ? 'text-green-700' : 'text-red-700'}`}>
                            {studentDetails?.has_paid_i20_control_fee ? 'Paid' : 'Pending'}
                          </span>
                          {studentDetails?.has_paid_i20_control_fee && (
                            <span className="text-xs text-slate-500">$999.00</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDetailsView;
