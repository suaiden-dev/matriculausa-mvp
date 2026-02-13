export type OnboardingStep =
  | "welcome"
  | "selection_fee"
  | "scholarship_selection"
  | "process_type"
  | "documents_upload"
  | "payment"
  | "scholarship_fee"
  | "university_documents"
  | "completed";

export interface OnboardingState {
  currentStep: OnboardingStep;
  selectionFeePaid: boolean;
  scholarshipsSelected: boolean;
  processTypeSelected: boolean;
  documentsUploaded: boolean;
  documentsApproved: boolean;
  applicationFeePaid: boolean;
  scholarshipFeePaid: boolean;
  universityDocumentsUploaded: boolean;
  onboardingCompleted: boolean;
}

export interface OnboardingProgress {
  step: OnboardingStep;
  completed: boolean;
  canProceed: boolean;
  message?: string;
}

export type ProcessType = "initial" | "transfer" | "change_of_status";

export interface StepProps {
  onNext: () => void;
  onBack: () => void;
  onComplete?: () => void;
}
