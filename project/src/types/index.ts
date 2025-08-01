export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'school' | 'admin';
  avatar?: string;
  hasPaidProcess?: boolean;
}

export interface University {
  id: string;
  user_id: string;
  name: string;
  location: string;
  description: string;
  website?: string;
  image_url?: string;
  type?: string;
  ranking?: number;
  programs?: string[];
  contact: {
    phone: string;
    email: string;
    admissionsEmail: string;
    fax?: string;
  };
  is_approved: boolean;
  terms_accepted: boolean;
  profile_completed: boolean;
  created_at: string;
}

export interface Scholarship {
  id: string;
  title: string;
  description: string;
  amount: number;
  deadline: string;
  requirements: string[];
  field_of_study: string;
  level: 'undergraduate' | 'graduate' | 'doctorate' | string;
  eligibility: string[];
  benefits: string[];
  is_exclusive: boolean;
  is_active: boolean;
  university_id: string;
  created_at: string;
  updated_at: string;
  needcpt: boolean;
  visaassistance: string;
  scholarshipvalue: number;
  image_url?: string;
  original_value_per_credit?: number;
  original_annual_value?: number;
  annual_value_with_scholarship?: number;
  scholarship_type?: string;
  universities: {
    id: string;
    name: string;
    logo_url?: string;
    location: string;
    is_approved: boolean;
  } | null;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  field_of_interest?: string;
  academic_level?: string;
  gpa?: number;
  english_proficiency?: string;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  scholarship_id: string;
  student_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review' | 'pending_scholarship_fee' | 'enrolled';
  applied_at: string;
  documents: string[];
  notes?: string;
  scholarships?: Scholarship;
  student_process_type?: string;
  is_application_fee_paid?: boolean;
  is_scholarship_fee_paid?: boolean;
  // Acceptance letter fields
  acceptance_letter_status?: 'pending' | 'sent' | 'signed' | 'approved';
  acceptance_letter_url?: string | null;
  acceptance_letter_signed_url?: string | null;
  acceptance_letter_sent_at?: string | null;
  acceptance_letter_signed_at?: string | null;
  acceptance_letter_approved_at?: string | null;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: User['role']) => Promise<void>;
  logout: () => void;
  register: (userData: Omit<User, 'id'>) => Promise<void>;
  isAuthenticated: boolean;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  country: string | null;
  field_of_interest: string | null;
  academic_level: string | null;
  gpa: number | null;
  english_proficiency: string | null;
  status: string | null;
  last_active: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_application_fee_paid: boolean;
  has_paid_selection_process_fee: boolean;
  is_admin: boolean;
  stripe_customer_id: string | null;
  stripe_payment_intent_id: string | null;
  university_id?: string | null;
  documents_status?: 'pending' | 'analyzing' | 'approved' | 'rejected';
  documents_uploaded?: boolean;
  selected_scholarship_id?: string | null;
  has_paid_college_enrollment_fee?: boolean;
  has_paid_i20_control_fee?: boolean;
  i20_control_fee_due_date?: string | null;
  i20_control_fee_payment_intent_id?: string | null;
  is_scholarship_fee_paid: boolean;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

export interface Email {
  id: string;
  threadId?: string;
  from: string;
  to?: string;
  subject: string;
  preview?: string;
  snippet: string;
  body?: string;
  htmlBody?: string;
  date: string;
  isRead: boolean;
  isStarred?: boolean;
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
  priority: 'high' | 'normal' | 'low';
  labels?: string[];
  avatar?: string;
}

export interface ChatwootAccount {
  id: string;
  user_id: string;
  chatwoot_user_name?: string;
  chatwoot_email?: string;
  chatwoot_password?: string;
  chatwoot_access_token?: string;
  chatwoot_instance_name?: string;
  chatwoot_user_id?: string;
  chatwoot_account_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateChatwootAccountData {
  user_name: string;
  user_id: string;
  instance_name: string;
  email: string;
}

export interface ChatwootAccountResponse {
  success: boolean;
  access_token?: string;
  error?: string;
}

export interface AIConfiguration {
  id: string;
  user_id: string;
  university_id?: string;
  ai_name: string;
  company_name: string;
  agent_type: string;
  personality: string;
  custom_prompt?: string;
  has_tested: boolean;
  created_at?: string;
  updated_at?: string;
}