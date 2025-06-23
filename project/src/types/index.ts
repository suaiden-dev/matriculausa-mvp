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
  status: 'pending' | 'approved' | 'rejected' | 'under_review' | 'pending_scholarship_fee';
  applied_at: string;
  documents: string[];
  notes?: string;
  scholarships?: Scholarship;
  student_process_type?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: User['role']) => Promise<void>;
  logout: () => void;
  register: (userData: Omit<User, 'id'>) => Promise<void>;
  isAuthenticated: boolean;
}