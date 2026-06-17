import React from 'react';
import { Award, Building, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudentRecord } from './types';

interface SelectedScholarshipCardProps {
  student: StudentRecord;
}

/**
 * SelectedScholarshipCard - Displays selected scholarship details
 * Shows scholarship name, university, course, and annual value
 * This is a read-only informational card, matching the original AdminStudentDetails.tsx implementation
 */
const SelectedScholarshipCard: React.FC<SelectedScholarshipCardProps> = React.memo(({
  student,
}) => {
  const navigate = useNavigate();
  // Show if fee paid OR if there's an approved application (selected before payment)
  const approvedApplication = (student.all_applications || []).find(
    (app: any) => app.is_application_fee_paid || app.status === 'approved' || app.status === 'enrolled'
  );

  if (!student.scholarship_title && !approvedApplication) {
    return null;
  }

  const scholarship = approvedApplication?.scholarships
    ? (Array.isArray(approvedApplication.scholarships) ? approvedApplication.scholarships[0] : approvedApplication.scholarships)
    : null;

  const scholarshipId = approvedApplication?.scholarship_id || scholarship?.id || student.scholarship_id;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="bg-gradient-to-r rounded-t-2xl from-slate-700 to-slate-800 px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <Award className="w-6 h-6 mr-3" />
          Selected Scholarship
        </h2>
        {scholarshipId && (
          <button
            onClick={() => navigate(`/admin/dashboard/scholarships/view/${scholarshipId}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Scholarship
          </button>
        )}
      </div>
      <div className="p-6 space-y-3">
        <div>
          <dt className="text-sm font-medium text-slate-600">Scholarship Program</dt>
          <div className="flex items-center gap-2 mt-1">
            <dd className="text-lg font-semibold text-slate-900">{student.scholarship_title}</dd>
            {student.source === 'migma' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black text-[#FFD700] border border-[#FFD700]/20 shadow-sm">
                Migma
              </span>
            )}
          </div>
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
          <dt className="text-sm font-medium text-slate-600">Semester Value (with Scholarship)</dt>
          <dd className="text-base font-semibold text-slate-900">
            {(() => {
              const v = scholarship?.annual_value_with_scholarship;
              return typeof v === 'number' ? `$${v.toLocaleString()}` : (v ? `$${Number(v).toLocaleString()}` : 'N/A');
            })()}
          </dd>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.student.student_id === nextProps.student.student_id &&
    prevProps.student.scholarship_title === nextProps.student.scholarship_title &&
    prevProps.student.is_application_fee_paid === nextProps.student.is_application_fee_paid &&
    prevProps.student.application_status === nextProps.student.application_status
  );
});

SelectedScholarshipCard.displayName = 'SelectedScholarshipCard';

export default SelectedScholarshipCard;

