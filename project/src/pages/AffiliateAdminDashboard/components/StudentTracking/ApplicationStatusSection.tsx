import React from 'react';
import { getDocumentStatusDisplay } from '../../../../utils/documentStatusMapper';

interface ApplicationStatusSectionProps {
  studentProcessType?: string;
  isApplicationFeePaid: boolean;
  documentsStatus?: string;
  acceptanceLetterStatus?: string;
  applicationStatus?: string;
  studentDocuments: any[];
}

const ApplicationStatusSection: React.FC<ApplicationStatusSectionProps> = ({
  studentProcessType,
  isApplicationFeePaid,
  documentsStatus,
  acceptanceLetterStatus,
  applicationStatus,
  studentDocuments
}) => {
  // Helper for enrollment status
  const getEnrollmentInfo = () => {
    const isEnrolled = applicationStatus === 'enrolled' || 
                      acceptanceLetterStatus === 'approved' || 
                      acceptanceLetterStatus === 'sent' ||
                      (documentsStatus === 'approved' && !applicationStatus);
    return {
      label: isEnrolled ? 'Enrolled' : 'Pending Acceptance',
      color: isEnrolled ? 'text-green-700' : 'text-yellow-700',
      dot: isEnrolled ? 'bg-green-500' : 'bg-yellow-500'
    };
  };

  const enrollmentInfo = getEnrollmentInfo();

  // Helper for documents status
  const getDocsDisplay = () => {
    const requiredDocs = ['passport', 'diploma', 'funds_proof'];
    let finalStatus = documentsStatus || 'pending';

    if (studentDocuments && studentDocuments.length > 0) {
      const allApproved = requiredDocs.every((t) => {
        const d = studentDocuments.find((x: any) => x.type === t);
        return d && (d.status || '').toLowerCase() === 'approved';
      });
      if (allApproved) {
        finalStatus = 'approved';
      } else {
        const hasChanges = requiredDocs.some((t) => {
          const d = studentDocuments.find((x: any) => x.type === t);
          return d && (d.status || '').toLowerCase() === 'changes_requested';
        });
        if (hasChanges) {
          finalStatus = 'changes_requested';
        } else {
          const anySubmitted = requiredDocs.some((t) => {
            const d = studentDocuments.find((x: any) => x.type === t);
            return !!d && !!(d.file_url || d.url);
          });
          finalStatus = anySubmitted ? 'under_review' : 'pending';
        }
      }
    }

    return getDocumentStatusDisplay(finalStatus);
  };

  const docsDisplay = getDocsDisplay();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Application Status</h3>
      <div className="space-y-3">
        <div>
          <dt className="text-sm font-medium text-slate-600">Student Type</dt>
          <dd className="text-base text-slate-900 mt-1">
            {(() => {
              if (studentProcessType && studentProcessType !== 'Not specified') {
                if (studentProcessType === 'initial') return 'Initial - F-1 Visa Required';
                if (studentProcessType === 'transfer') return 'Transfer - Current F-1 Student';
                if (studentProcessType === 'change_of_status') return 'Change of Status - From Other Visa';
                return studentProcessType;
              }
              return 'Not specified';
            })()}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-600">Application Fee</dt>
          <dd className="mt-1">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isApplicationFeePaid ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm font-medium ${isApplicationFeePaid ? 'text-green-700' : 'text-red-700'}`}>
                {isApplicationFeePaid ? 'Paid' : 'Pending'}
              </span>
            </div>
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-600">Documents Status</dt>
          <dd className="mt-1">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${docsDisplay.bgColor}`}></div>
              <span className={`text-sm font-medium ${docsDisplay.color}`}>
                {docsDisplay.text}
              </span>
            </div>
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-600">Enrollment Status</dt>
          <dd className="mt-1">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${enrollmentInfo.dot}`}></div>
              <span className={`text-sm font-medium ${enrollmentInfo.color}`}>{enrollmentInfo.label}</span>
            </div>
          </dd>
        </div>
      </div>
    </div>
  );
};

export default ApplicationStatusSection;
