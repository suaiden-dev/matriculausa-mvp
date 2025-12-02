// Tipos para estudantes
export interface StudentInfo {
  student_id: string;
  profile_id: string;
  full_name: string;
  email: string;
  phone: string;
  country: string;
  field_of_interest: string;
  academic_level: string;
  gpa: number;
  english_proficiency: string;
  registration_date: string;
  current_status: string;
  seller_referral_code: string;
  seller_name: string;
  total_fees_paid: number;
  fees_count: number;
  scholarship_title: string;
  university_name: string;
  selected_scholarship_id: string | null;
  documents_status: string;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  has_paid_selection_process_fee: boolean;
  has_paid_i20_control_fee: boolean;
  student_process_type: string;
  application_status: string;
  documents: any[];
  dependents?: number;
  selection_process_fee_amount?: number; // ✅ Adicionar campo para valor da taxa de seleção
  acceptance_letter_sent_at?: string | null; // ✅ Adicionar campo faltante
  scholarship?: {
    application_fee_amount: number;
    scholarship_fee_amount: number;
  };
}

// Tipos para pagamentos de taxas
export interface FeePayment {
  payment_id: string;
  fee_type: string;
  fee_name: string;
  amount_paid: number;
  currency: string;
  payment_status: string;
  payment_date: string;
  stripe_payment_intent: string;
  notes: string;
}

// Tipos para aplicações de bolsa
export interface ScholarshipApplication {
  id: string;
  status: string;
  student_process_type: string;
  applied_at: string;
  reviewed_at: string;
  notes: string;
  documents: any[];
  acceptance_letter_status: string;
  acceptance_letter_url: string;
  acceptance_letter_sent_at: string | null;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  paid_at: string;
  payment_status: string;
  has_paid_selection_process_fee?: boolean;
  has_paid_i20_control_fee?: boolean;
}

// Tipos para vendedores
export interface Seller {
  id: string;
  name: string;
  email: string;
  phone: string;
  territory: string;
  referral_code: string;
  is_active: boolean;
  created_at: string;
  students: Student[];
  total_revenue: number;
  total_students: number;
}

// Tipos para estudantes
export interface Student {
  id: string;
  profile_id?: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone: string;
  country: string;
  field_of_interest: string;
  academic_level: string;
  gpa: number;
  english_proficiency: string;
  registration_date: string;
  current_status: string;
  seller_referral_code: string;
  seller_name: string;
  total_fees_paid: number;
  fees_count: number;
  scholarship_title: string;
  university_name: string;
  university_id?: string;
  selected_scholarship_id: string | null;
  documents_status: string;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  has_paid_selection_process_fee: boolean;
  has_paid_i20_control_fee: boolean;
  student_process_type: string;
  application_status: string;
  documents: any[];
  scholarship?: {
    application_fee_amount: number;
    scholarship_fee_amount: number;
  };
  // Campos para múltiplas aplicações
  hasMultipleApplications?: boolean;
  applicationCount?: number;
  allApplications?: any[];
  // Campos adicionais do affiliate
  referred_by_seller_id?: string;
  referral_code_used?: string;
  total_paid?: number;
  total_paid_adjusted?: number;
  created_at?: string;
  status?: string;
}

// Tipos para universidades
export interface University {
  id: string;
  name: string;
  description: string;
  location: string;
  website: string;
  logo_url: string;
  is_approved: boolean;
  created_at: string;
}

// Tipos para document requests
export interface DocumentRequest {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  attachment_url: string | null;
  university_id: string;
  is_global: boolean;
  applicable_student_types: string[];
  status: string;
  created_at: string;
  document_request_uploads?: DocumentRequestUpload[];
}

// Tipos para uploads de document requests
export interface DocumentRequestUpload {
  id: string;
  document_request_id: string;
  uploaded_by: string;
  file_url: string;
  uploaded_at: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

// Tipos para filtros
export interface FilterState {
  searchTerm: string;
  sellerFilter: string;
  universityFilter: string;
  dateRange: {
    start: string;
    end: string;
  };
  statusFilter: string;
  paymentStatusFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}
