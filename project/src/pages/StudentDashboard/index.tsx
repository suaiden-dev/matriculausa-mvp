import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Scholarship } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import StudentDashboardLayout from './StudentDashboardLayout';
import Overview from './Overview';
import ScholarshipBrowser from './ScholarshipBrowser';
import MyApplications from './MyApplications';
import ProfileManagement from './ProfileManagement';
import { mockScholarships } from '../../data/mockData';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '../../stores/applicationStore';
import DocumentsAndScholarshipChoice from './DocumentsAndScholarshipChoice';
import CollegeEnrollmentCheckout from './CollegeEnrollmentCheckout';
import CartPage from './CartPage';
import ScholarshipFeeSuccess from './ScholarshipFeeSuccess';
import ScholarshipFeeError from './ScholarshipFeeError';
import SelectionProcessFeeSuccess from './SelectionProcessFeeSuccess';
import SelectionProcessFeeError from './SelectionProcessFeeError';
import ApplicationFeeSuccess from './ApplicationFeeSuccess';
import ApplicationFeeError from './ApplicationFeeError';
import ApplicationChatPage from './ApplicationChatPage';

interface StudentProfile {
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

interface Application {
  id: string;
  scholarship_id: string;
  student_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  applied_at: string;
  notes?: string;
  scholarship?: Scholarship;
}

const StudentDashboard: React.FC = () => {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const { user, userProfile, loading } = useAuth();
  const { cart } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      loadDashboardData();
    }
  }, [user, loading]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Buscar bolsas reais do Supabase
      const { data: realScholarships, error: scholarshipsError } = await supabase
        .from('scholarships')
        .select('*')
        .eq('is_active', true);
      if (scholarshipsError) {
        setScholarships([]);
      } else {
        setScholarships(realScholarships || []);
      }

      // Buscar applications reais do Supabase
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('scholarship_applications')
        .select('*, scholarship:scholarships(*)')
        .eq('student_id', user.id);

      if (applicationsError) {
        setApplications([]);
      } else {
        setApplications(applicationsData as Application[]);
      }

      // Buscar perfil real do Supabase
      const { data: profileData, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        setProfile(null);
      } else if (profileData) {
        setProfile({
          id: profileData.id,
          name: profileData.full_name || user.name || user.email?.split('@')[0] || '',
          email: user.email,
          phone: profileData.phone || '',
          country: profileData.country || '',
          field_of_interest: profileData.field_of_interest || '',
          academic_level: profileData.academic_level || '',
          gpa: profileData.gpa || 0,
          english_proficiency: profileData.english_proficiency || '',
          created_at: profileData.created_at,
          updated_at: profileData.updated_at
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleApplyScholarship = async (scholarshipId: string) => {
    if (!user) return;

    // Check if already applied
    const alreadyApplied = applications.some(app => app.scholarship_id === scholarshipId);
    if (alreadyApplied) {
      alert('You have already applied for this scholarship');
      return;
    }

    try {
      // Mock application creation
      const newApplication: Application = {
        id: Date.now().toString(),
        scholarship_id: scholarshipId,
        student_id: user.id,
        status: 'pending',
        applied_at: new Date().toISOString(),
        scholarship: scholarships.find(s => s.id === scholarshipId)
      };

      setApplications(prev => [...prev, newApplication]);
      alert('Application submitted successfully!');
    } catch (error) {
      console.error('Error applying for scholarship:', error);
      alert('Error submitting application. Please try again.');
    }
  };

  const handleProfileUpdate = async (updatedData: Partial<StudentProfile>) => {
    if (!user || !profile) return;

    try {
      // Atualiza no Supabase
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: updatedData.name,
          phone: updatedData.phone,
          country: updatedData.country,
          field_of_interest: updatedData.field_of_interest,
          academic_level: updatedData.academic_level,
          gpa: updatedData.gpa,
          english_proficiency: updatedData.english_proficiency,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Atualiza localmente
      const updatedProfile = {
        ...profile,
        ...updatedData,
        updated_at: new Date().toISOString()
      };
      setProfile(updatedProfile);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    }
  };

  // Calculate stats
  const stats = {
    totalApplications: applications.length,
    approvedApplications: applications.filter(app => app.status === 'approved').length,
    pendingApplications: applications.filter(app => app.status === 'pending').length,
    availableScholarships: scholarships.length
  };

  return (
    <StudentDashboardLayout user={user} profile={profile} loading={loading}>
      {/* Cart Icon Button */}
      <button
        onClick={() => navigate('/student/dashboard/cart')}
        className="fixed bottom-8 right-8 z-50 bg-[#05294E] text-white rounded-full shadow-lg p-4 flex items-center hover:bg-[#05294E]/90 transition-all"
      >
        <ShoppingCart className="h-6 w-6" />
        {cart.length > 0 && (
          <span className="ml-2 bg-red-600 text-white rounded-full px-2 py-0.5 text-xs font-bold">{cart.length}</span>
        )}
      </button>
      <Routes>
        <Route 
          index 
          element={
            <Overview 
              profile={profile}
              scholarships={scholarships}
              applications={applications}
              stats={stats}
              onApplyScholarship={handleApplyScholarship}
            />
          } 
        />
        <Route path="cart" element={<CartPage />} />
        <Route 
          path="scholarships" 
          element={
            <ScholarshipBrowser 
              scholarships={scholarships}
              applications={applications}
              onApplyScholarship={handleApplyScholarship}
            />
          } 
        />
        <Route 
          path="applications" 
          element={
            <MyApplications />
          } 
        />
        <Route 
          path="application/:applicationId/chat" 
          element={
            <ApplicationChatPage />
          } 
        />
        <Route 
          path="profile" 
          element={
            <ProfileManagement 
              profile={profile}
              onUpdateProfile={handleProfileUpdate}
            />
          } 
        />
        <Route path="documents-and-scholarship-choice" element={<DocumentsAndScholarshipChoice />} />
        <Route path="college-enrollment-checkout" element={<CollegeEnrollmentCheckout />} />
        <Route path="/scholarship-fee-success" element={<ScholarshipFeeSuccess />} />
        <Route path="/scholarship-fee-error" element={<ScholarshipFeeError />} />
        <Route path="/selection-process-fee-success" element={<SelectionProcessFeeSuccess />} />
        <Route path="/selection-process-fee-error" element={<SelectionProcessFeeError />} />
        <Route path="/application-fee-success" element={<ApplicationFeeSuccess />} />
        <Route path="/application-fee-error" element={<ApplicationFeeError />} />
      </Routes>
    </StudentDashboardLayout>
  );
};

export default StudentDashboard;