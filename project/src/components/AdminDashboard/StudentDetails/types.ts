/**
 * Shared types for AdminStudentDetails components
 */

export interface StudentRecord {
  student_id: string;
  user_id: string;
  student_name: string;
  student_email: string;
  phone?: string | null;
  country?: string | null;
  field_of_interest?: string | null;
  academic_level?: string | null;
  gpa?: number | null;
  english_proficiency?: string | null;
  status?: string | null;
  avatar_url?: string | null;
  dependents?: number;
  desired_scholarship_range?: number | null;
  student_created_at: string;
  has_paid_selection_process_fee: boolean;
  has_paid_i20_control_fee: boolean;
  selection_process_fee_payment_method?: string | null;
  i20_control_fee_payment_method?: string | null;
  seller_referral_code: string | null;
  application_id: string | null;
  scholarship_id: string | null;
  application_status: string | null;
  applied_at: string | null;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  application_fee_payment_method?: string | null;
  scholarship_fee_payment_method?: string | null;
  acceptance_letter_status: string | null;
  student_process_type: string | null;
  payment_status: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  scholarship_name: string | null;
  university_name: string | null;
  total_applications: number;
  university_website?: string | null;
  is_locked: boolean;
  all_applications?: any[];
  admin_notes?: string | null;
}

export interface ReferralInfo {
  type: 'seller' | 'student' | 'affiliate';
  name: string;
  email: string;
  affiliateName?: string;
  affiliateEmail?: string;
  isRewards?: boolean;
}

export interface AdminNote {
  id: string;
  note_text: string;
  created_at: string;
  created_by: string;
  admin_name?: string;
}

export interface TermAcceptance {
  id: string;
  user_id: string;
  term_id: string;
  term_type: string;
  accepted_at: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  identity_photo_path?: string; // ✅ Caminho da foto de identidade no bucket
  identity_photo_name?: string; // ✅ Nome do arquivo da foto
  identity_photo_status?: 'pending' | 'approved' | 'rejected'; // ✅ Status da verificação da foto
  identity_photo_rejection_reason?: string | null; // ✅ Motivo da rejeição
  identity_photo_reviewed_at?: string | null; // ✅ Data da revisão
  identity_photo_reviewed_by?: string | null; // ✅ ID do admin que revisou
  user_email?: string;
  user_full_name?: string;
  term_title?: string;
  term_content?: string;
}

export interface PendingPayment {
  fee_type: 'selection_process' | 'application' | 'scholarship' | 'i20_control';
  payment_method: 'stripe' | 'zelle' | 'manual';
  amount?: number;
  scholarship_id?: string | null;
}

