import { School, Scholarship, User, Application } from '../types';

export const mockSchools: School[] = [
  {
    id: '1',
    name: 'Harvard University',
    location: 'Cambridge, Massachusetts',
    description: 'Harvard University is a private Ivy League research university in Cambridge, Massachusetts. Established in 1636, Harvard is the oldest institution of higher education in the United States and one of the most prestigious universities worldwide.',
    image: 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
    website: 'https://harvard.edu',
    programs: ['Business', 'Medicine', 'Law', 'Engineering', 'Liberal Arts'],
    accreditations: ['NEASC', 'AACSB', 'LCME'],
    ranking: 1,
    type: 'Private',
    address: {
      street: 'Massachusetts Hall, Cambridge',
      city: 'Cambridge',
      state: 'Massachusetts',
      zipCode: '02138',
      country: 'United States'
    },
    contact: {
      phone: '+1 (617) 495-1000',
      email: 'info@harvard.edu',
      admissionsEmail: 'admissions@harvard.edu',
      fax: '+1 (617) 495-8821'
    }
  },
  {
    id: '2',
    name: 'Stanford University',
    location: 'Stanford, California',
    description: 'Stanford University is a private research university in Stanford, California. Stanford is known for its academic strength, wealth, proximity to Silicon Valley, and ranking as one of the world\'s top universities.',
    image: 'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
    website: 'https://stanford.edu',
    programs: ['Computer Science', 'Engineering', 'Business', 'Medicine', 'Education'],
    accreditations: ['WASC', 'AACSB', 'ABET'],
    ranking: 2,
    type: 'Private',
    address: {
      street: '450 Serra Mall',
      city: 'Stanford',
      state: 'California',
      zipCode: '94305',
      country: 'United States'
    },
    contact: {
      phone: '+1 (650) 723-2300',
      email: 'info@stanford.edu',
      admissionsEmail: 'admission@stanford.edu',
      fax: '+1 (650) 725-2846'
    }
  },
  {
    id: '3',
    name: 'MIT',
    location: 'Cambridge, Massachusetts',
    description: 'The Massachusetts Institute of Technology is a private land-grant research university in Cambridge, Massachusetts. MIT has played a key role in the development of modern technology and science.',
    image: 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
    website: 'https://mit.edu',
    programs: ['Engineering', 'Computer Science', 'Physics', 'Mathematics', 'Economics'],
    accreditations: ['NEASC', 'ABET', 'AACSB'],
    ranking: 3,
    type: 'Private',
    address: {
      street: '77 Massachusetts Avenue',
      city: 'Cambridge',
      state: 'Massachusetts',
      zipCode: '02139',
      country: 'United States'
    },
    contact: {
      phone: '+1 (617) 253-1000',
      email: 'info@mit.edu',
      admissionsEmail: 'admissions@mit.edu',
      fax: '+1 (617) 258-8304'
    }
  },
  {
    id: '4',
    name: 'Yale University',
    location: 'New Haven, Connecticut',
    description: 'Yale University is a private Ivy League research university in New Haven, Connecticut. Founded in 1701, Yale is the third-oldest institution of higher education in the United States.',
    image: 'https://images.pexels.com/photos/1595391/pexels-photo-1595391.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
    website: 'https://yale.edu',
    programs: ['Liberal Arts', 'Law', 'Medicine', 'Drama', 'Music'],
    accreditations: ['NEASC', 'AACSB', 'LCME'],
    ranking: 4,
    type: 'Private',
    address: {
      street: '38 Hillhouse Avenue',
      city: 'New Haven',
      state: 'Connecticut',
      zipCode: '06511',
      country: 'United States'
    },
    contact: {
      phone: '+1 (203) 432-4771',
      email: 'info@yale.edu',
      admissionsEmail: 'student.questions@yale.edu',
      fax: '+1 (203) 432-9392'
    }
  },
  {
    id: '5',
    name: 'Princeton University',
    location: 'Princeton, New Jersey',
    description: 'Princeton University is a private Ivy League research university in Princeton, New Jersey. Founded in 1746, Princeton is the fourth-oldest college in the United States.',
    image: 'https://images.pexels.com/photos/2280549/pexels-photo-2280549.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
    website: 'https://princeton.edu',
    programs: ['Engineering', 'Public Policy', 'Economics', 'Physics', 'History'],
    accreditations: ['MSCHE', 'ABET', 'AACSB'],
    ranking: 5,
    type: 'Private',
    address: {
      street: 'Princeton University',
      city: 'Princeton',
      state: 'New Jersey',
      zipCode: '08544',
      country: 'United States'
    },
    contact: {
      phone: '+1 (609) 258-3000',
      email: 'uaoffice@princeton.edu',
      admissionsEmail: 'admission@princeton.edu',
      fax: '+1 (609) 258-6743'
    }
  },
  {
    id: '6',
    name: 'University of California, Berkeley',
    location: 'Berkeley, California',
    description: 'The University of California, Berkeley is a public land-grant research university in Berkeley, California. Established in 1868, UC Berkeley is the flagship institution of the University of California system.',
    image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
    website: 'https://berkeley.edu',
    programs: ['Engineering', 'Business', 'Computer Science', 'Law', 'Public Health'],
    accreditations: ['WASC', 'ABET', 'AACSB'],
    ranking: 6,
    type: 'Public',
    address: {
      street: '200 California Hall',
      city: 'Berkeley',
      state: 'California',
      zipCode: '94720',
      country: 'United States'
    },
    contact: {
      phone: '+1 (510) 642-6000',
      email: 'info@berkeley.edu',
      admissionsEmail: 'admissions@berkeley.edu',
      fax: '+1 (510) 642-7333'
    }
  }
];

export const mockScholarships = [
  {
    id: '1',
    programName: 'International Excellence Program',
    originalValue: {
      perCredit: 1200,
      annual: 36000
    },
    scholarshipValue: 25000,
    scholarshipType: 'prata',
    level: 'undergraduate',
    needCPT: false,
    visaAssistance: 'initial',
  },
  {
    id: '2',
    programName: 'STEM Innovation Grant',
    originalValue: {
      perCredit: 1500,
      annual: 45000
    },
    scholarshipValue: 35000,
    scholarshipType: 'ouro',
    level: 'master',
    needCPT: true,
    visaAssistance: 'cos',
  },
  {
    id: '3',
    programName: 'Global Leadership Fellowship',
    originalValue: {
      perCredit: 1800,
      annual: 54000
    },
    scholarshipValue: 45000,
    scholarshipType: 'platina',
    level: 'doctor',
    needCPT: true,
    visaAssistance: 'initial',
  },
  {
    id: '4',
    programName: 'Business Excellence Award',
    originalValue: {
      perCredit: 1000,
      annual: 30000
    },
    scholarshipValue: 20000,
    scholarshipType: 'especial',
    level: 'transfer',
    needCPT: false,
    visaAssistance: 'cos',
  }
];

export const mockUser: User = {
  id: '1',
  email: 'student@example.com',
  name: 'John Doe',
  role: 'student',
  hasPaidProcess: false
};

export const mockApplications: Application[] = [
  {
    id: '1',
    scholarshipId: '1',
    studentId: '1',
    status: 'under_review',
    appliedAt: '2024-01-15',
    documents: ['transcript.pdf', 'essay.pdf', 'recommendation.pdf']
  },
  {
    id: '2',
    scholarshipId: '4',
    studentId: '1',
    status: 'approved',
    appliedAt: '2024-01-10',
    documents: ['transcript.pdf', 'business_plan.pdf'],
    notes: 'Excellent application with strong business plan.'
  }
];