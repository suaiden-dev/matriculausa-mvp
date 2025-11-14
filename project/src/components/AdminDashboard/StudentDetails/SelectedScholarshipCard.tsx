import React from 'react';
import { Award, Building } from 'lucide-react';
import { StudentRecord } from './types';

interface SelectedScholarshipCardProps {
  student: StudentRecord;
}

/**
 * SelectedScholarshipCard - Displays selected scholarship details
 * Shows scholarship name, university, course, and annual value
 */
const SelectedScholarshipCard: React.FC<SelectedScholarshipCardProps> = React.memo(({
  student,
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
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.student.student_id === nextProps.student.student_id &&
    prevProps.student.scholarship_title === nextProps.student.scholarship_title &&
    prevProps.student.is_application_fee_paid === nextProps.student.is_application_fee_paid
  );
});

SelectedScholarshipCard.displayName = 'SelectedScholarshipCard';

export default SelectedScholarshipCard;

