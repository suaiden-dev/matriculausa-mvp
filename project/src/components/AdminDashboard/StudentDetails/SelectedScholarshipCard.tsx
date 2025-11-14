import React from 'react';
import { Award, Building, CheckCircle } from 'lucide-react';
import { StudentRecord } from './types';

interface SelectedScholarshipCardProps {
  student: StudentRecord;
  isPlatformAdmin?: boolean;
  approvingStudent?: boolean;
  rejectingStudent?: boolean;
  onApproveApplication?: (applicationId: string) => void;
  onRejectApplication?: (applicationId: string) => void;
}

/**
 * SelectedScholarshipCard - Displays selected scholarship details
 * Shows scholarship name, university, course, and annual value
 */
const SelectedScholarshipCard: React.FC<SelectedScholarshipCardProps> = React.memo(({
  student,
  isPlatformAdmin = false,
  approvingStudent = false,
  rejectingStudent = false,
  onApproveApplication,
  onRejectApplication,
}) => {
  // Only show if scholarship is selected and application fee is paid
  if (!student.scholarship_title || !student.is_application_fee_paid) {
    return null;
  }

  // Get the paid application and scholarship details
  const paidApplication = (student.all_applications || []).find((app: any) => app.is_application_fee_paid);
  const scholarship = paidApplication?.scholarships
    ? (Array.isArray(paidApplication.scholarships) ? paidApplication.scholarships[0] : paidApplication.scholarships)
    : null;
  
  const applicationStatus = paidApplication?.status || 'pending';
  const canApproveReject = isPlatformAdmin && applicationStatus !== 'approved' && applicationStatus !== 'rejected';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="bg-gradient-to-r rounded-t-2xl from-slate-700 to-slate-800 px-6 py-4">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <Award className="w-6 h-6 mr-3" />
          Selected Scholarship
        </h2>
      </div>
      <div className="p-6 space-y-3">
        <div>
          <dt className="text-sm font-medium text-slate-600">Scholarship Program</dt>
          <dd className="text-lg font-semibold text-slate-900">{student.scholarship_title}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-600">University</dt>
          <dd className="text-lg font-semibold text-slate-900 flex items-center">
            <Building className="w-4 h-4 mr-1" />
            {student.university_name}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-600">Course</dt>
          <dd className="text-base font-semibold text-slate-900">
            {scholarship?.field_of_study || 'N/A'}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-600">Annual Value (with Scholarship)</dt>
          <dd className="text-base font-semibold text-slate-900">
            {(() => {
              const v = scholarship?.annual_value_with_scholarship;
              return typeof v === 'number' ? `$${v.toLocaleString()}` : (v ? `$${Number(v).toLocaleString()}` : 'N/A');
            })()}
          </dd>
        </div>
        
        {/* Status e botões de aprovação/rejeição */}
        {paidApplication && (
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              {applicationStatus === 'approved' && (
                <div className="flex items-center space-x-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Approved</span>
                </div>
              )}
              {applicationStatus === 'rejected' && (
                <div className="flex items-center space-x-1 text-red-600">
                  <span className="text-sm font-medium">Rejected</span>
                </div>
              )}
              {canApproveReject && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => onRejectApplication && onRejectApplication(paidApplication.id)}
                    disabled={approvingStudent || rejectingStudent}
                    className="px-4 py-2 rounded-lg font-medium border transition-colors text-center text-sm text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reject Application
                  </button>
                  <button
                    disabled={approvingStudent || rejectingStudent}
                    onClick={() => onApproveApplication && onApproveApplication(paidApplication.id)}
                    className="px-4 py-2 rounded-lg font-medium bg-[#05294E] text-white hover:bg-[#041f38] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center text-sm"
                  >
                    {approvingStudent ? 'Approving...' : 'Approve Application'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.student.student_id === nextProps.student.student_id &&
    prevProps.student.scholarship_title === nextProps.student.scholarship_title &&
    prevProps.student.is_application_fee_paid === nextProps.student.is_application_fee_paid &&
    prevProps.approvingStudent === nextProps.approvingStudent &&
    prevProps.rejectingStudent === nextProps.rejectingStudent
  );
});

SelectedScholarshipCard.displayName = 'SelectedScholarshipCard';

export default SelectedScholarshipCard;

