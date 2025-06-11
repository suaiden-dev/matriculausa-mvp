export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'school' | 'admin';
  avatar?: string;
  hasPaidProcess?: boolean;
}

export interface School {
  id: string;
  name: string;
  location: string;
  description: string;
  image: string;
  website: string;
  programs: string[];
  accreditations: string[];
  ranking?: number;
  type?: 'Public' | 'Private';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
    admissionsEmail: string;
    fax?: string;
  };
}

export interface Scholarship {
  id: string;
  title: string;
  description: string;
  schoolId: string;
  schoolName: string;
  amount: number;
  deadline: string;
  requirements: string[];
  isExclusive: boolean;
  image: string;
  fieldOfStudy: string;
  level: 'undergraduate' | 'graduate' | 'doctorate';
  eligibility: string[];
  benefits: string[];
}

export interface Application {
  id: string;
  scholarshipId: string;
  studentId: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  appliedAt: string;
  documents: string[];
  notes?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: User['role']) => Promise<void>;
  logout: () => void;
  register: (userData: Omit<User, 'id'>) => Promise<void>;
  isAuthenticated: boolean;
}