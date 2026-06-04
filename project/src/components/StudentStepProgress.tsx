import React from 'react';
import { Check } from 'lucide-react';
import { getStepStatus } from '../utils/applicationFlowStages';

const SUMMARY_STEPS = [
  { label: 'Selection',    keys: ['selection_fee'] as const },
  { label: 'Applying',     keys: ['apply', 'bdp_collection', 'review', 'start_admission'] as const },
  { label: 'Fees',         keys: ['application_fee', 'placement_fee', 'scholarship_fee', 'reinstatement_fee'] as const },
  { label: 'Sending Docs', keys: ['university_docs', 'docs_approval', 'send_docs_to_university'] as const },
  { label: 'Processing',   keys: ['receive_acceptance_letter', 'send_acceptance_letter', 'student_sends_letter', 'sevis_transfer', 'i20_fee', 'visa_approval'] as const },
  { label: 'Admitted',     keys: ['enrollment'] as const },
];

function getSummaryStepState(record: any, stepKeys: readonly string[]): 'completed' | 'current' | 'pending' {
  const statuses = stepKeys.map(k => getStepStatus(record, k as any));
  if (statuses.every(s => s === 'completed' || s === 'skipped')) return 'completed';
  if (statuses.some(s => s === 'in_progress')) return 'current';
  return 'pending';
}

function getSummarySteps(record: any): ('completed' | 'current' | 'pending')[] {
  const results: ('completed' | 'current' | 'pending')[] = [];
  let seenPending = false;
  for (const step of SUMMARY_STEPS) {
    if (seenPending) { results.push('pending'); continue; }
    const state = getSummaryStepState(record, step.keys);
    if (state === 'pending') {
      results.push(results.length > 0 && results[results.length - 1] === 'completed' ? 'current' : 'pending');
      seenPending = true;
    } else if (state === 'current') {
      results.push('current');
      seenPending = true;
    } else {
      results.push('completed');
    }
  }
  return results;
}

export function buildStudentRecord(student: any) {
  return {
    user_id: student.user_id || student.id,
    student_id: student.student_id || student.id,
    application_id: student.application_id || null,
    has_paid_selection_process_fee: !!student.has_paid_selection_process_fee,
    total_applications: student.total_applications || 0,
    application_status: student.application_status || student.current_status || null,
    is_application_fee_paid: !!student.is_application_fee_paid,
    is_scholarship_fee_paid: !!student.is_scholarship_fee_paid,
    has_paid_i20_control_fee: !!student.has_paid_i20_control_fee,
    placement_fee_flow: !!student.placement_fee_flow,
    is_placement_fee_paid: !!student.is_placement_fee_paid,
    acceptance_letter_status: student.acceptance_letter_status || null,
    acceptance_letter_url: student.acceptance_letter_url || null,
    student_process_type: student.student_process_type || null,
    transfer_form_status: student.transfer_form_status || null,
    has_paid_ds160_package: !!student.has_paid_ds160_package,
    has_paid_i539_cos_package: !!student.has_paid_i539_cos_package,
    has_paid_reinstatement_package: !!student.has_paid_reinstatement_package,
    documents_uploaded: !!student.documents_uploaded,
    has_submitted_form: !!student.has_submitted_form,
    selected_scholarship_id: student.selected_scholarship_id || null,
    visa_transfer_active: student.visa_transfer_active ?? null,
    has_sent_docs_to_university: !!student.has_sent_docs_to_university,
    sevis_transfer_completed: !!student.sevis_transfer_completed,
    visa_approved: !!student.visa_approved,
  };
}

interface StudentStepProgressProps {
  student: any;
}

const StudentStepProgress: React.FC<StudentStepProgressProps> = ({ student }) => {
  const record = buildStudentRecord(student);
  const states = getSummarySteps(record);

  return (
    <div className="flex items-center gap-0">
      {SUMMARY_STEPS.map((step, i) => {
        const state = states[i];
        const isLast = i === SUMMARY_STEPS.length - 1;

        return (
          <React.Fragment key={step.label}>
            <div className="flex flex-col items-center gap-1">
              <div
                title={`${step.label}: ${state}`}
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                  ${state === 'completed'
                    ? 'bg-slate-800'
                    : state === 'current'
                    ? 'bg-white border-2 border-slate-800 shadow-sm'
                    : 'bg-white border-2 border-slate-200'
                  }`}
              >
                {state === 'completed' && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                {state === 'current' && <span className="w-2 h-2 rounded-full bg-slate-800" />}
              </div>
              <span className={`text-[9px] font-medium whitespace-nowrap
                ${state === 'completed' ? 'text-slate-700' : state === 'current' ? 'text-slate-900 font-semibold' : 'text-slate-300'}`}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className={`h-0.5 w-4 flex-shrink-0 mb-3 ${state === 'completed' ? 'bg-slate-800' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StudentStepProgress;
