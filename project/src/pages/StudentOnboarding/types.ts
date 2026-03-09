export type OnboardingStep =
  | "selection_fee"
  | "identity_verification"
  | "selection_survey"
  | "scholarship_selection"
  | "process_type"
  | "documents_upload"
  | "payment"
  | "scholarship_fee"
  | "placement_fee"
  | "my_applications"
  | "completed";

export interface OnboardingState {
  currentStep: OnboardingStep;
  selectionFeePaid: boolean;
  selectionSurveyPassed: boolean;
  scholarshipsSelected: boolean;
  processTypeSelected: boolean;
  documentsUploaded: boolean;
  documentsApproved: boolean;
  applicationFeePaid: boolean;
  scholarshipFeePaid: boolean;
  placementFeePaid: boolean;
  universityDocumentsUploaded: boolean;
  onboardingCompleted: boolean;
  isNewFlowUser: boolean;
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
