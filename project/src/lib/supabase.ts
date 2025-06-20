import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface University {
  id: string;
  name: string;
  description?: string;
  location?: string;
  website?: string;
  logo_url?: string;
  programs?: string[];
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    admissionsEmail?: string;
    fax?: string;
  };
  user_id: string;
  is_approved: boolean;
  profile_completed: boolean;
  terms_accepted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Scholarship {
  id: string;
  title: string;
  description?: string;
  amount: number;
  deadline: string;
  requirements?: string[];
  field_of_study?: string;
  level?: 'undergraduate' | 'graduate' | 'doctorate';
  eligibility?: string[];
  benefits?: string[];
  is_exclusive: boolean;
  is_active: boolean;
  university_id: string;
  created_at: string;
  updated_at: string;
  universities?: University;
  original_value_per_credit?: number;
  original_annual_value?: number;
  annual_value_with_scholarship?: number;
  scholarship_type?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  phone?: string;
  country?: string;
  field_of_interest?: string;
  academic_level?: string;
  gpa?: number;
  english_proficiency?: string;
  status: 'active' | 'inactive' | 'suspended';
  last_active: string;
  created_at: string;
  updated_at: string;
}

export interface ScholarshipApplication {
  id: string;
  student_id: string;
  scholarship_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  applied_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  notes?: string;
  documents?: any;
  created_at: string;
  updated_at: string;
}

export interface AdminLog {
  id: string;
  admin_user_id: string;
  action: string;
  target_type: string;
  target_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}