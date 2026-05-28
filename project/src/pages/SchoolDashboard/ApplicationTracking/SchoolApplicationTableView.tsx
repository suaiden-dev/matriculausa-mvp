import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Calendar
} from 'lucide-react';
import { getStepStatus, APPLICATION_FLOW_STAGES } from '../../../utils/applicationFlowStages';
import { StudentRecord } from '../../../components/AdminDashboard/hooks/useStudentApplicationsQueries';

interface SchoolApplicationTableViewProps {
  students: StudentRecord[];
  getUnreadCount: (studentId: string) => number;
  getGlobalUnreadCount: (studentId: string) => number;
}

const SchoolApplicationTableView: React.FC<SchoolApplicationTableViewProps> = ({
  students,
  getUnreadCount,
  getGlobalUnreadCount
}) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const totalPages = Math.ceil(students.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentStudents = students.slice(startIndex, startIndex + itemsPerPage);

  const ApplicationFlowSteps = ({ student }: { student: StudentRecord }) => {
    // Only use the stages allowed for the university
    const allowedStageKeys = [
      'review',
      'application_fee',
      'placement_fee',
      'reinstatement_fee',
      'docs_approval',
      'send_acceptance_letter',
      'i20_fee',
      'student_sends_letter',
      'sevis_transfer',
      'visa_approval',
      'enrollment'
    ];

    const allSteps = APPLICATION_FLOW_STAGES.filter(stage => allowedStageKeys.includes(stage.key));

    // Filter steps based on process type and flow
    const steps = allSteps.filter(step => {
      if (step.requiresTransfer && student?.student_process_type !== 'transfer') {
        return false;
      }
      if (step.requiresProcessType && student?.student_process_type !== step.requiresProcessType) {
        return false;
      }
      
      const status = getStepStatus(student, step.key as any);
      if (status === 'skipped') return false;

      return true;
    });

    // Calculate overall progress
    const completedSteps = steps.filter(step => getStepStatus(student, step.key as any) === 'completed').length;
    const totalSteps = steps.length;
    const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    // Find current step
    const currentStepIndex = steps.findIndex(step => {
      const status = getStepStatus(student, step.key as any);
      return status === 'in_progress' || status === 'pending';
    });
    const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : steps[steps.length - 1] || steps[0];

    if (!currentStep) return null;

    return (
      <div className="flex items-center space-x-3">
        {/* Circular Progress */}
        <div className="relative w-8 h-8 flex-shrink-0">
          <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-slate-200"
            />
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 14}`}
              strokeDashoffset={`${2 * Math.PI * 14 * (1 - progressPercentage / 100)}`}
              className={`transition-all duration-300 ${progressPercentage === 100 ? 'text-green-500' :
                progressPercentage >= 50 ? 'text-blue-500' :
                  'text-amber-500'
                }`}
            />
          </svg>
          {/* Center Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            {React.createElement(currentStep.icon as any, {
              className: `h-3 w-3 ${progressPercentage === 100 ? 'text-green-600' :
                progressPercentage >= 50 ? 'text-blue-600' :
                  'text-amber-600'
                }`
            })}
          </div>
        </div>

        {/* Compact Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-900 truncate">
              {currentStep.shortLabel}
            </span>
            <span className="text-xs text-slate-500 flex-shrink-0">
              {completedSteps}/{totalSteps}
            </span>
          </div>
          <div className="flex items-center space-x-1 mt-1">
            {steps.map((step) => {
              const status = getStepStatus(student, step.key as any);
              return (
                <div
                  key={step.key}
                  className={`w-2 h-2 rounded-full ${
                    status === 'completed' ? 'bg-green-500' :
                    status === 'in_progress' ? 'bg-blue-500' :
                    status === 'rejected' ? 'bg-red-500' :
                    'bg-slate-200'
                  }`}
                  title={`${step.label}: ${status}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const handleStudentClick = (student: StudentRecord) => {
    if (student.status === 'enrolled') {
      navigate(`/school/dashboard/student/${student.application_id}`);
    } else {
      navigate(`/school/dashboard/student/${student.application_id}`);
    }
  };

  if (students.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-200 min-h-[400px]">
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No students found
          </h3>
          <p className="text-sm text-slate-500">
            Adjust filters to see students in the table
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
      <div className="flex-1 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Scholarship
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Application Flow
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Applied Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {currentStudents.map((student) => (
              <tr
                key={student.application_id || student.student_id}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => handleStudentClick(student)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 relative">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                        <User className="h-5 w-5 text-slate-600" />
                      </div>
                      {/* Unread indicator */}
                      {(getUnreadCount(student.user_id) > 0 || getGlobalUnreadCount(student.user_id) > 0) && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-white">
                          <span className="text-[10px] font-bold text-white leading-none">
                            {(() => {
                              const v = Math.max(getUnreadCount(student.user_id), getGlobalUnreadCount(student.user_id));
                              return v > 9 ? '9+' : v;
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-slate-900">
                          {student.student_name}
                        </div>
                      </div>
                      <div className="text-sm text-slate-500">
                        {student.student_email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-900 font-medium">
                    {student.scholarship_title}
                  </div>
                </td>
                <td className="px-6 py-4 min-w-[250px]">
                  <ApplicationFlowSteps student={student} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                    {student.applied_at
                      ? new Date(student.applied_at).toLocaleDateString()
                      : student.student_created_at 
                        ? new Date(student.student_created_at).toLocaleDateString()
                        : '-'
                    }
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6 rounded-b-xl">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(startIndex + itemsPerPage, students.length)}
                </span>{' '}
                of <span className="font-medium">{students.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === page
                      ? 'z-10 bg-[#05294E] border-[#05294E] text-white'
                      : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    {page}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolApplicationTableView;
