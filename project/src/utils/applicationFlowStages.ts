import {
  CreditCard,
  FileText,
  Eye,
  DollarSign,
  Award,
  BookOpen,
  GraduationCap,
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
  | 'i20_fee'
  | 'ds160_package'
  | 'i539_cos_package'
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
  requiresProcessType?: string; // Exibir apenas para esse process_type
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
}

export const APPLICATION_FLOW_STAGES: ApplicationFlowStage[] = [
  {
    key: 'selection_fee',
    label: 'Selection Process Payment',
    shortLabel: 'Sel. Payment',
    icon: CreditCard,
    description: 'Student has paid the Selection Process Fee'
  },
  {
    key: 'apply',
    label: 'Choosing Scholarship',
    shortLabel: 'Choosing',
    icon: FileText,
    description: 'Student selected scholarships but has not yet uploaded the 3 main documents'
  },
  {
    key: 'bdp_collection',
    label: 'BDP Collection',
    shortLabel: 'BDP',
    icon: FileText,
    description: 'Pending: Bank Statement, Diploma & Passport upload'
  },
  {
    key: 'review',
    label: 'Scholarship Eligibility',
    shortLabel: 'Eligibility',
    icon: Eye,
    description: 'Awaiting admin approval of submitted documents and selected scholarship'
  },
  {
    key: 'start_admission',
    label: 'Start Admission',
    shortLabel: 'Start Admission',
    icon: BookOpen,
    description: 'Scholarship approved — student selects a scholarship to proceed with admission'
  },
  {
    key: 'application_fee',
    label: 'Awaiting Application Fee',
    shortLabel: 'App Fee',
    icon: DollarSign,
    description: 'Student selected a scholarship — pending Application Fee payment'
  },
  {
    key: 'placement_fee',
    label: 'Awaiting Placement Fee',
    shortLabel: 'Placement Fee',
    icon: DollarSign,
    description: 'Application fee paid — pending Placement Fee payment'
  },
  {
    key: 'reinstatement_fee',
    label: 'Awaiting Reinstatement Fee',
    shortLabel: 'Reinstatement',
    icon: DollarSign,
    description: 'Placement fee paid — pending Reinstatement Fee payment (transfer with inactive visa only)'
  },
  {
    key: 'scholarship_fee',
    label: 'Scholarship Fee',
    shortLabel: 'Scholarship Fee',
    icon: Award,
    description: 'Student has paid the Scholarship Fee'
  },
  {
    key: 'i20_fee',
    label: 'I-20 Fee',
    shortLabel: 'I-20 Fee',
    icon: CreditCard,
    description: 'Student has paid the I-20 Control Fee'
  },
  {
    key: 'acceptance_letter',
    label: 'Acceptance Letter',
    shortLabel: 'Acceptance',
    icon: BookOpen,
    description: 'Acceptance letter has been sent or approved'
  },
  {
    key: 'transfer_form',
    label: 'Transfer Form',
    shortLabel: 'Transfer Form',
    icon: FileText,
    description: 'Transfer form has been submitted and approved (transfer students only)',
    requiresTransfer: true
  },
  {
    key: 'ds160_package',
    label: 'DS-160 Package',
    shortLabel: 'DS-160',
    icon: FileText,
    description: 'Student pays the DS-160 Package fee (initial F-1 students)',
    requiresProcessType: 'initial'
  },
  {
    key: 'i539_cos_package',
    label: 'I-539 COS Package',
    shortLabel: 'I-539',
    icon: FileText,
    description: 'Student pays the I-539 COS Package fee (change of status students)',
    requiresProcessType: 'change_of_status'
  },
  {
    key: 'enrollment',
    label: 'Enrollment',
    shortLabel: 'Enrollment',
    icon: GraduationCap,
    description: 'Student has been enrolled in the program'
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
      // Student stays in this column until they submit the form (photo is prerequisite)
      return student.has_submitted_form ? 'completed' : 'in_progress';
    
    case 'apply':
      return student.total_applications > 0 ? 'completed' : 'pending';

    case 'bdp_collection':
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
      // Moves on when student selects a scholarship to proceed (selected_scholarship_id set)
      if (student.is_application_fee_paid) return 'completed';
      return student.selected_scholarship_id ? 'completed' : 'pending';

    case 'application_fee':
      return student.is_application_fee_paid ? 'completed' : 'pending';
    
    case 'placement_fee':
      if (!student.placement_fee_flow) return 'skipped';
      return (student.is_placement_fee_paid || isMigma) ? 'completed' : 'pending';
    
    case 'reinstatement_fee':
      // Only for transfer students with inactive visa
      if (student.student_process_type !== 'transfer' || student.visa_transfer_active !== false) return 'skipped';
      return student.has_paid_reinstatement_package ? 'completed' : 'pending';

    case 'scholarship_fee':
      if (student.placement_fee_flow) return 'skipped';
      return student.is_scholarship_fee_paid ? 'completed' : 'pending';
    
    case 'i20_fee':
      if (student.placement_fee_flow) return 'skipped';
      return student.has_paid_i20_control_fee ? 'completed' : 'pending';

    case 'ds160_package':
      if (student.student_process_type !== 'initial') return 'skipped';
      return student.has_paid_ds160_package ? 'completed' : 'pending';

    case 'i539_cos_package':
      if (student.student_process_type !== 'change_of_status') return 'skipped';
      return student.has_paid_i539_cos_package ? 'completed' : 'pending';
    
    case 'acceptance_letter':
      if (student.acceptance_letter_status === 'approved' || student.acceptance_letter_status === 'sent') {
        return 'completed';
      }
      return 'pending';
    
    case 'transfer_form':
      // Só aparece para alunos com process_type = 'transfer'
      if (student.student_process_type !== 'transfer') {
        return 'skipped';
      }
      // Verificar se existe um documento de transfer form aprovado
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
 * Retorna true se o estudante está no estágio especificado com o status especificado (ou qualquer status se não especificado)
 */
export function isStudentInStage(
  student: StudentRecord,
  stage: ApplicationFlowStageKey,
  stageStatus?: StageStatus
): boolean {
  const status = getStepStatus(student, stage);
  
  // Se stageStatus não foi especificado, verifica se o estágio não está skipped
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
    // Pular transfer_form se não for transfer student
    if (stageDef.requiresTransfer && student.student_process_type !== 'transfer') {
      continue;
    }
    // Pular stages que requerem um process_type específico
    if (stageDef.requiresProcessType && student.student_process_type !== stageDef.requiresProcessType) {
      continue;
    }
    
    const status = getStepStatus(student, stageDef.key);
    
    // Retornar o primeiro estágio que não está completed
    if (status !== 'completed' && status !== 'skipped') {
      return {
        stage: stageDef.key,
        status
      };
    }
  }
  
  // Se todos os estágios estão completed, retornar enrollment
  return {
    stage: 'enrollment',
    status: 'completed'
  };
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
