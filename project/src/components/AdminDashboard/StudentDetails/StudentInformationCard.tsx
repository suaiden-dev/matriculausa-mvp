import React from 'react';
import { User, Award, CreditCard, Clock, Edit3, Save, X } from 'lucide-react';
import { StudentRecord } from './types';

interface StudentInformationCardProps {
  student: StudentRecord;
  dependents: number;
  isEditing: boolean;
  savingProfile: boolean;
  canEditProfile: boolean;
  isEditingProcessType: boolean;
  editingProcessType: string;
  savingProcessType: boolean;
  onStudentChange: (updater: (prev: StudentRecord | null) => StudentRecord | null) => void;
  onDependentsChange: (value: number) => void;
  onEditToggle: () => void;
  onSaveProfile: () => void;
  onCancelEdit: () => void;
  onEditProcessType: () => void;
  onSaveProcessType: () => void;
  onCancelProcessType: () => void;
  onProcessTypeChange: (value: string) => void;
}

/**
 * StudentInformationCard - Main card displaying student information
 * Contains Personal, Academic, Financial, and System information sections
 */
const StudentInformationCard: React.FC<StudentInformationCardProps> = React.memo(({
  student,
  dependents,
  isEditing,
  savingProfile,
  canEditProfile,
  isEditingProcessType,
  editingProcessType,
  savingProcessType,
  onStudentChange,
  onDependentsChange,
  onEditToggle,
  onSaveProfile,
  onCancelEdit,
  onEditProcessType,
  onSaveProcessType,
  onCancelProcessType,
  onProcessTypeChange,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#0a4a7a] px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <User className="w-6 h-6 mr-3" />
            Student Information
          </h2>
          {canEditProfile && (
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={onSaveProfile}
                    disabled={savingProfile}
                    className="px-3 py-1 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-1"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingProfile ? 'Saving...' : 'Save'}</span>
                  </button>
                  <button
                    onClick={onCancelEdit}
                    className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-1"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={onEditToggle}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg flex items-center space-x-1"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="p-6 space-y-6">
        {/* Personal & Contact Information */}
        <div className="bg-slate-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-[#05294E]" />
            Personal & Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-slate-600">Full Name</dt>
              {isEditing ? (
                <input
                  value={student.student_name}
                  onChange={(e) => onStudentChange(prev => prev ? { ...prev, student_name: e.target.value } : prev)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              ) : (
                <dd className="text-base font-semibold text-slate-900 mt-1">{student.student_name}</dd>
              )}
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-600">Email</dt>
              {isEditing ? (
                <input
                  type="email"
                  value={student.student_email}
                  onChange={(e) => onStudentChange(prev => prev ? { ...prev, student_email: e.target.value } : prev)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              ) : (
                <dd className="text-base text-slate-900 mt-1">{student.student_email}</dd>
              )}
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-600">Phone</dt>
              {isEditing ? (
                <input
                  value={student.phone || ''}
                  onChange={(e) => onStudentChange(prev => prev ? { ...prev, phone: e.target.value } : prev)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              ) : (
                <dd className="text-base text-slate-900 mt-1">{student.phone || 'Not provided'}</dd>
              )}
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-600">Country</dt>
              {isEditing ? (
                <input
                  value={student.country || ''}
                  onChange={(e) => onStudentChange(prev => prev ? { ...prev, country: e.target.value } : prev)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              ) : (
                <dd className="text-base text-slate-900 mt-1">{student.country || 'Not provided'}</dd>
              )}
            </div>
          </div>
        </div>

        {/* Academic Information */}
        <div className="bg-slate-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-[#05294E]" />
            Academic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-slate-600">Field of Interest</dt>
              {isEditing ? (
                <input
                  value={student.field_of_interest || ''}
                  onChange={(e) => onStudentChange(prev => prev ? { ...prev, field_of_interest: e.target.value } : prev)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              ) : (
                <dd className="text-base text-slate-900 mt-1">{student.field_of_interest || 'Not provided'}</dd>
              )}
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-600">Academic Level</dt>
              {isEditing ? (
                <select
                  value={student.academic_level || ''}
                  onChange={(e) => onStudentChange(prev => prev ? { ...prev, academic_level: e.target.value } : prev)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">Select level</option>
                  <option value="high_school">High School</option>
                  <option value="bachelor">Bachelor's</option>
                  <option value="master">Master's</option>
                  <option value="phd">PhD</option>
                </select>
              ) : (
                <dd className="text-base text-slate-900 mt-1">{student.academic_level || 'Not provided'}</dd>
              )}
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-600">GPA</dt>
              {isEditing ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  value={student.gpa || ''}
                  onChange={(e) => onStudentChange(prev => prev ? { ...prev, gpa: e.target.value ? Number(e.target.value) : null } : prev)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              ) : (
                <dd className="text-base text-slate-900 mt-1">{student.gpa ? student.gpa.toFixed(2) : 'Not provided'}</dd>
              )}
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-600">English Proficiency</dt>
              {isEditing ? (
                <select
                  value={student.english_proficiency || ''}
                  onChange={(e) => onStudentChange(prev => prev ? { ...prev, english_proficiency: e.target.value } : prev)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">Select level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="native">Native</option>
                </select>
              ) : (
                <dd className="text-base text-slate-900 mt-1">{student.english_proficiency || 'Not provided'}</dd>
              )}
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-600">Student Process Type</dt>
              <dd className="text-base text-slate-900 mt-1 capitalize">
                {isEditingProcessType ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={editingProcessType}
                      onChange={(e) => onProcessTypeChange(e.target.value)}
                      className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={savingProcessType}
                    >
                      <option value="initial">Initial</option>
                      <option value="transfer">Transfer</option>
                      <option value="change_of_status">Change of Status</option>
                      <option value="enrolled">Enrolled</option>
                    </select>
                    <button
                      onClick={onSaveProcessType}
                      disabled={savingProcessType}
                      className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      {savingProcessType ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={onCancelProcessType}
                      disabled={savingProcessType}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{student.student_process_type || 'Not defined'}</span>
                    <button
                      onClick={onEditProcessType}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit Process Type"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </dd>
            </div>
          </div>
        </div>

        {/* Financial & Scholarship Information */}
        <div className="bg-slate-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-[#05294E]" />
            Financial & Scholarship Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-slate-600">Dependents</dt>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  value={dependents}
                  onChange={(e) => onDependentsChange(Math.max(0, Number(e.target.value || 0)))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              ) : (
                <dd className="text-base text-slate-900 mt-1">{dependents}</dd>
              )}
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-600">Desired Scholarship Range</dt>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  value={student.desired_scholarship_range || ''}
                  onChange={(e) => onStudentChange(prev => prev ? { ...prev, desired_scholarship_range: e.target.value ? Number(e.target.value) : null } : prev)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              ) : (
                <dd className="text-base text-slate-900 mt-1">{student.desired_scholarship_range ? `$${student.desired_scholarship_range.toLocaleString()}` : 'Not specified'}</dd>
              )}
            </div>
          </div>
        </div>

        {/* System & Status Information */}
        <div className="bg-slate-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-[#05294E]" />
            System & Status Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-slate-600">Registration Date</dt>
              <dd className="text-base text-slate-900 mt-1">{new Date(student.student_created_at).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-600">Current Status</dt>
              <div className="flex items-center space-x-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${
                  student.is_locked ? 'bg-green-500' :
                  student.application_status === 'approved' ? 'bg-blue-500' :
                  student.application_status === 'under_review' ? 'bg-yellow-500' :
                  student.total_applications > 0 ? 'bg-orange-500' : 'bg-gray-500'
                }`}></div>
                <span className="text-sm font-medium">
                  {student.is_locked ? 'Scholarship Selected' :
                  student.application_status === 'approved' ? 'Approved - Pending Payment' :
                  student.application_status === 'under_review' ? 'Under Review' :
                  student.total_applications > 0 ? 'Applications Submitted' : 'No Applications Yet'}
                </span>
              </div>
            </div>
            {student.seller_referral_code && (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-slate-600">Referral Code</dt>
                {isEditing ? (
                  <input
                    value={student.seller_referral_code}
                    onChange={(e) => onStudentChange(prev => prev ? { ...prev, seller_referral_code: e.target.value } : prev)}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                ) : (
                  <dd className="text-base text-slate-900 mt-1 font-mono">{student.seller_referral_code}</dd>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to avoid unnecessary re-renders
  return (
    prevProps.student.student_id === nextProps.student.student_id &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.savingProfile === nextProps.savingProfile &&
    prevProps.dependents === nextProps.dependents &&
    prevProps.isEditingProcessType === nextProps.isEditingProcessType &&
    prevProps.savingProcessType === nextProps.savingProcessType
  );
});

StudentInformationCard.displayName = 'StudentInformationCard';

export default StudentInformationCard;

