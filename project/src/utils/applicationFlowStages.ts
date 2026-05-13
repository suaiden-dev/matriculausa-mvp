import {
  CreditCard,
  FileText,
  Eye,
  DollarSign,
  Award,
  BookOpen,
  GraduationCap,
  Upload,
  ClipboardCheck,
  Send,
  Mail,
  RefreshCw,
  Shield,
  LucideIcon
} from 'lucide-react';

export type ApplicationFlowStageKey =
  | 'selection_fee'
  | 'bdp_collection'
  | 'apply'
  | 'review'
  | 'start_admission'
  | 'application_fee'
  | 'placement_fee'
  | 'reinstatement_fee'
  | 'scholarship_fee'
  | 'university_docs'
  | 'docs_approval'
  | 'send_docs_to_university'
  | 'receive_acceptance_letter'
  | 'send_acceptance_letter'
  | 'student_sends_letter'
  | 'sevis_transfer'
  | 'i20_fee'
  | 'ds160_package'
  | 'i539_cos_package'
  | 'visa_approval'
  | 'acceptance_letter'
  | 'transfer_form'
  | 'enrollment'
  | 'dropped';

export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'rejected' | 'skipped';

export interface ApplicationFlowStage {
  key: ApplicationFlowStageKey;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  description: string;
  requiresTransfer?: boolean;
  requiresProcessType?: string;
  actor: 'student' | 'admin' | 'both';
}

export interface StudentRecord {
  user_id: string;
  student_id: string;
  application_id: string | null;
  has_paid_selection_process_fee: boolean;
  total_applications: number;
  application_status: string | null;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  has_paid_i20_control_fee: boolean;
  placement_fee_flow?: boolean;
  is_placement_fee_paid?: boolean;
  acceptance_letter_status: string | null;
  acceptance_letter_url?: string | null;
  student_process_type: string | null;
  transfer_form_status: string | null;
  has_paid_ds160_package?: boolean;
  has_paid_i539_cos_package?: boolean;
  has_paid_reinstatement_package?: boolean;
  documents_uploaded?: boolean;
  has_submitted_form?: boolean;
  payment_status?: string | null;
  selected_scholarship_id?: string | null;
  visa_transfer_active?: boolean;
  // New stage fields
  has_sent_docs_to_university?: boolean;
  sevis_transfer_completed?: boolean;
  visa_approved?: boolean;
  // Doc aggregation fields (computed separately)
  docs_total_required?: number;
  docs_total_uploaded?: number;
  docs_total_approved?: number;
  docs_total_rejected?: number;
  docs_total_under_review?: number;

  // Basic docs aggregation fields (passport, diploma, funds_proof)
  basic_docs_total_required?: number;
  basic_docs_total_uploaded?: number;
  basic_docs_total_approved?: number;
  basic_docs_total_rejected?: number;
  basic_docs_total_under_review?: number;
}

export const APPLICATION_FLOW_STAGES: ApplicationFlowStage[] = [
  {
    key: 'selection_fee',
    label: 'Selection Process Fee Paid',
    shortLabel: 'Sel. Fee Paid',
    icon: CreditCard,
    description: 'Student has paid the Selection Process Fee',
    actor: 'student'
  },
  {
    key: 'apply',
    label: 'Choosing Scholarship',
    shortLabel: 'Choosing',
    icon: FileText,
    description: 'Student selected scholarships but has not yet uploaded the 3 main documents',
    actor: 'student'
  },
  {
    key: 'bdp_collection',
    label: 'BDP Collection',
    shortLabel: 'BDP',
    icon: FileText,
    description: 'Pending: Bank Statement, Diploma & Passport upload',
    actor: 'student'
  },
  {
    key: 'review',
    label: 'Scholarship Eligibility',
    shortLabel: 'Eligibility',
    icon: Eye,
    description: 'Awaiting admin approval of submitted documents and selected scholarship',
    actor: 'admin'
  },
  {
    key: 'start_admission',
    label: 'Start Admission',
    shortLabel: 'Start Admission',
    icon: BookOpen,
    description: 'Scholarship approved — student selects a scholarship to proceed with admission',
    actor: 'student'
  },
  {
    key: 'application_fee',
    label: 'Awaiting Application Fee',
    shortLabel: 'App Fee',
    icon: DollarSign,
    description: 'Student selected a scholarship — pending Application Fee payment',
    actor: 'student'
  },
  {
    key: 'placement_fee',
    label: 'Awaiting Placement Fee',
    shortLabel: 'Placement Fee',
    icon: DollarSign,
    description: 'Application fee paid — pending Placement Fee payment',
    actor: 'student'
  },
  {
    key: 'reinstatement_fee',
    label: 'Awaiting Reinstatement Fee',
    shortLabel: 'Reinstatement',
    icon: DollarSign,
    description: 'Placement fee paid — pending Reinstatement Fee payment (transfer with inactive visa only)',
    actor: 'student'
  },
  {
    key: 'scholarship_fee',
    label: 'Scholarship Fee',
    shortLabel: 'Scholarship Fee',
    icon: Award,
    description: 'Student has paid the Scholarship Fee',
    actor: 'student'
  },
  {
    key: 'university_docs',
    label: 'Awaiting University Docs',
    shortLabel: 'Univ. Docs',
    icon: Upload,
    description: 'Student must upload university documents (filled and translated)',
    actor: 'student'
  },
  {
    key: 'docs_approval',
    label: 'Document Approval',
    shortLabel: 'Doc Approval',
    icon: ClipboardCheck,
    description: 'Admin reviews uploaded documents — approve or reject each one',
    actor: 'admin'
  },
  {
    key: 'send_docs_to_university',
    label: 'Send Docs to University',
    shortLabel: 'Send Docs',
    icon: Send,
    description: 'Admin confirms documents were sent to the university',
    actor: 'admin'
  },
  {
    key: 'receive_acceptance_letter',
    label: 'Receive Acceptance Letter',
    shortLabel: 'Recv. Letter',
    icon: Mail,
    description: 'Admin uploads acceptance letter received from university',
    actor: 'admin'
  },
  {
    key: 'send_acceptance_letter',
    label: 'Send Acceptance Letter to Student',
    shortLabel: 'Send Letter',
    icon: Send,
    description: 'Admin sends acceptance letter to the student',
    actor: 'admin'
  },
  {
    key: 'i20_fee',
    label: 'Awaiting I-20 Control Fee',
    shortLabel: 'I-20 Fee',
    icon: CreditCard,
    description: 'Student pays the I-20 Control Fee (Initial, COS, Transfer/Reinstatement)',
    actor: 'student'
  },
  {
    key: 'student_sends_letter',
    label: 'Transfer Form',
    shortLabel: 'Transfer Form',
    icon: FileText,
    description: 'Admin sends transfer form to student → student submits to current institution → student uploads completed form → admin approves.',
    requiresTransfer: true,
    actor: 'both'
  },
  {
    key: 'sevis_transfer',
    label: 'Awaiting SEVIS Transfer',
    shortLabel: 'SEVIS',
    icon: RefreshCw,
    description: 'Admin confirms SEVIS transfer completed (happens outside the platform)',
    requiresTransfer: true,
    actor: 'admin'
  },
  {
    key: 'visa_approval',
    label: 'Awaiting Visa Approval',
    shortLabel: 'Visa',
    icon: Shield,
    description: 'Admin confirms visa approved. Student must send documentation to lawyer (Aplikei) outside the platform.',
    actor: 'admin'
  },
  {
    key: 'enrollment',
    label: 'Admitted Enrollment',
    shortLabel: 'Admitted',
    icon: GraduationCap,
    description: 'Student has been enrolled in the program',
    actor: 'admin'
  }
];

/**
 * Determina o status de um estágio específico para um estudante
 */
export function getStepStatus(
  student: StudentRecord,
  step: ApplicationFlowStageKey
): StageStatus {
  const isMigma = (student as any).source === 'migma';

  switch (step) {
    case 'selection_fee':
      if (!student.has_paid_selection_process_fee && !isMigma) return 'pending';
      if (student.application_status === 'enrolled') return 'completed';
      return student.has_submitted_form ? 'completed' : 'in_progress';

    case 'apply':
      if (student.application_status === 'enrolled') return 'completed';
      return student.total_applications > 0 ? 'completed' : 'pending';

    case 'bdp_collection':
      if (student.application_status === 'enrolled') return 'completed';
      return student.documents_uploaded ? 'completed' : 'pending';

    case 'review':
      if (student.application_status === 'enrolled' || student.application_status === 'approved') {
        return 'completed';
      }
      if (student.application_status === 'rejected') {
        return 'rejected';
      }
      if (student.application_status === 'under_review') {
        return 'in_progress';
      }
      return 'pending';

    case 'start_admission':
      if (student.is_application_fee_paid) return 'completed';
      if (student.application_status === 'approved' || student.application_status === 'enrolled') return 'completed';
      return student.selected_scholarship_id ? 'completed' : 'pending';

    case 'application_fee':
      return student.is_application_fee_paid ? 'completed' : 'pending';

    case 'placement_fee':
      if (!student.placement_fee_flow) return 'skipped';
      return (student.is_placement_fee_paid || isMigma) ? 'completed' : 'pending';

    case 'reinstatement_fee':
      if (student.student_process_type !== 'transfer' || student.visa_transfer_active !== false) return 'skipped';
      return student.has_paid_reinstatement_package ? 'completed' : 'pending';

    case 'scholarship_fee':
      if (student.placement_fee_flow) return 'skipped';
      return student.is_scholarship_fee_paid ? 'completed' : 'pending';

    case 'university_docs': {
      const total = student.docs_total_required ?? 0;
      if (total === 0) return 'skipped';
      const alreadyProgressed =
        !!student.acceptance_letter_url ||
        student.acceptance_letter_status === 'sent' ||
        student.has_sent_docs_to_university ||
        student.has_paid_i20_control_fee ||
        student.has_paid_i539_cos_package ||
        student.has_paid_ds160_package;
      if (alreadyProgressed) return 'completed';
      const rejected = student.docs_total_rejected ?? 0;
      const underReview = student.docs_total_under_review ?? 0;
      const uploaded = student.docs_total_uploaded ?? 0;
      if (rejected > 0) return 'pending';
      // Opção B: se tem pelo menos 1 em revisão, passa para docs_approval
      if (underReview > 0) return 'completed';
      if (uploaded < total) return 'pending';
      return 'completed';
    }

    case 'docs_approval': {
      const total = student.docs_total_required ?? 0;
      if (total === 0) return 'skipped';
      const alreadyProgressed =
        !!student.acceptance_letter_url ||
        student.acceptance_letter_status === 'sent' ||
        student.has_sent_docs_to_university ||
        student.has_paid_i20_control_fee ||
        student.has_paid_i539_cos_package ||
        student.has_paid_ds160_package;
      if (alreadyProgressed) return 'completed';
      const approved = student.docs_total_approved ?? 0;
      const rejected = student.docs_total_rejected ?? 0;
      const underReview = student.docs_total_under_review ?? 0;
      if (approved >= total) return 'completed';
      // Rejeitado sem re-upload → volta para university_docs (handled lá)
      if (rejected > 0) return 'pending';
      if (underReview > 0 || approved > 0) return 'in_progress';
      return 'pending';
    }

    case 'send_docs_to_university':
      // 'pending' é valor default da application — só conta URL ou status 'sent'
      return (student.has_sent_docs_to_university || !!student.acceptance_letter_url || student.acceptance_letter_status === 'sent')
        ? 'completed'
        : 'pending';

    case 'receive_acceptance_letter':
      // Só completa quando admin fez upload da carta (URL existe)
      return student.acceptance_letter_url ? 'completed' : 'pending';

    case 'send_acceptance_letter':
      // Show as completed if sent or URL exists (depending on school preference)
      if (student.acceptance_letter_status === 'sent') return 'completed';
      return student.acceptance_letter_url ? 'in_progress' : 'pending';

    case 'student_sends_letter':
      if (student.student_process_type !== 'transfer') return 'skipped';
      if (student.transfer_form_status === 'approved') return 'completed';
      if (student.transfer_form_status === 'returned') return 'in_progress';
      if (student.transfer_form_status === 'sent') return 'in_progress';
      return 'pending';

    case 'sevis_transfer':
      if (student.student_process_type !== 'transfer') return 'skipped';
      return student.sevis_transfer_completed ? 'completed' : 'pending';

    case 'i20_fee': {
      const isApplicable =
        student.student_process_type === 'initial' ||
        student.student_process_type === 'change_of_status' ||
        (student.student_process_type === 'transfer' && student.visa_transfer_active === false);
      if (!isApplicable) return 'skipped';
      // Retrocompatibilidade: aceita pagamento via qualquer um dos campos antigos
      const hasPaid = student.has_paid_i20_control_fee ||
                      student.has_paid_ds160_package ||
                      student.has_paid_i539_cos_package;
      return hasPaid ? 'completed' : 'pending';
    }

    case 'ds160_package':
      return 'skipped';

    case 'i539_cos_package':
      return 'skipped';

    case 'visa_approval':
      return student.visa_approved ? 'completed' : 'pending';

    // Legacy stages — kept for backward compat, no longer in flow array
    case 'acceptance_letter':
      if (student.acceptance_letter_status === 'approved' || student.acceptance_letter_status === 'sent') {
        return 'completed';
      }
      return 'pending';

    case 'transfer_form':
      if (student.student_process_type !== 'transfer') return 'skipped';
      if (student.transfer_form_status === 'approved' || student.transfer_form_status === 'sent') {
        return 'completed';
      }
      return 'pending';

    case 'enrollment':
      return student.application_status === 'enrolled' ? 'completed' : 'pending';

    default:
      return 'pending';
  }
}

/**
 * Verifica se um estudante está em um estágio específico
 */
export function isStudentInStage(
  student: StudentRecord,
  stage: ApplicationFlowStageKey,
  stageStatus?: StageStatus
): boolean {
  const status = getStepStatus(student, stage);
  if (stageStatus === undefined) {
    return status !== 'skipped';
  }
  return status === stageStatus;
}

/**
 * Obtém o estágio atual do estudante (primeiro estágio que não está completed)
 */
export function getCurrentStage(student: StudentRecord): {
  stage: ApplicationFlowStageKey | null;
  status: StageStatus;
} {
  for (const stageDef of APPLICATION_FLOW_STAGES) {
    if (stageDef.requiresTransfer && student.student_process_type !== 'transfer') {
      continue;
    }
    if (stageDef.requiresProcessType && student.student_process_type !== stageDef.requiresProcessType) {
      continue;
    }

    const status = getStepStatus(student, stageDef.key);

    if (status !== 'completed' && status !== 'skipped') {
      return { stage: stageDef.key, status };
    }
  }

  return { stage: 'enrollment', status: 'completed' };
}

/**
 * Obtém metadados de um estágio específico
 */
export function getStageMetadata(stageKey: ApplicationFlowStageKey): ApplicationFlowStage | undefined {
  return APPLICATION_FLOW_STAGES.find(stage => stage.key === stageKey);
}

/**
 * Valida se uma chave de estágio é válida
 */
export function isValidStageKey(stageKey: string): stageKey is ApplicationFlowStageKey {
  return APPLICATION_FLOW_STAGES.some(stage => stage.key === stageKey);
}
