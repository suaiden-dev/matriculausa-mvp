export type OnboardingStep = 
  | 'welcome'
  | 'selection_fee'
  | 'scholarship_selection'
  | 'scholarship_review'
  | 'process_type'
  | 'documents_upload'
  | 'waiting_approval'
  | 'application_fee'
  | 'scholarship_fee'
  | 'completed';

export interface OnboardingState {
  currentStep: OnboardingStep;
  selectionFeePaid: boolean;
  scholarshipsSelected: boolean;
  processTypeSelected: boolean;
  documentsUploaded: boolean;
  documentsApproved: boolean;
  applicationFeePaid: boolean;
  scholarshipFeePaid: boolean;
  onboardingCompleted: boolean;
}

export interface OnboardingProgress {
  step: OnboardingStep;
  completed: boolean;
  canProceed: boolean;
  message?: string;
}

export type ProcessType = 'initial' | 'transfer' | 'change_of_status';

export interface StepProps {
  onNext: () => void;
  onBack: () => void;
  onComplete?: () => void;
}

