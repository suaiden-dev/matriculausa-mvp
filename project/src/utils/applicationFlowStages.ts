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
  | 'apply'
  | 'review'
  | 'application_fee'
  | 'scholarship_fee'
  | 'i20_fee'
  | 'acceptance_letter'
  | 'transfer_form'
  | 'enrollment';

export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'rejected' | 'skipped';

export interface ApplicationFlowStage {
  key: ApplicationFlowStageKey;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  description: string;
  requiresTransfer?: boolean;
}

export interface StudentRecord {
  user_id: string;
  student_id: string;
  has_paid_selection_process_fee: boolean;
  total_applications: number;
  application_status: string | null;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  has_paid_i20_control_fee: boolean;
  acceptance_letter_status: string | null;
  student_process_type: string | null;
  transfer_form_status: string | null;
}

export const APPLICATION_FLOW_STAGES: ApplicationFlowStage[] = [
  {
    key: 'selection_fee',
    label: 'Selection Fee',
    shortLabel: 'Selection Fee',
    icon: CreditCard,
    description: 'Student has paid the Selection Process Fee'
  },
  {
    key: 'apply',
    label: 'Application',
    shortLabel: 'Application',
    icon: FileText,
    description: 'Student has submitted scholarship applications'
  },
  {
    key: 'review',
    label: 'Review',
    shortLabel: 'Review',
    icon: Eye,
    description: 'Application is under review by the university'
  },
  {
    key: 'application_fee',
    label: 'Application Fee',
    shortLabel: 'App Fee',
    icon: DollarSign,
    description: 'Student has paid the Application Fee'
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
  switch (step) {
    case 'selection_fee':
      return student.has_paid_selection_process_fee ? 'completed' : 'pending';
    
    case 'apply':
      return student.total_applications > 0 ? 'completed' : 'pending';
    
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
    
    case 'application_fee':
      return student.is_application_fee_paid ? 'completed' : 'pending';
    
    case 'scholarship_fee':
      return student.is_scholarship_fee_paid ? 'completed' : 'pending';
    
    case 'i20_fee':
      return student.has_paid_i20_control_fee ? 'completed' : 'pending';
    
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




