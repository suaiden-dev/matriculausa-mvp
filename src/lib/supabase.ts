import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
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
  university?: University;
}