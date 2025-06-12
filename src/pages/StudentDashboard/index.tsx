import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { supabase, Scholarship } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import StudentDashboardLayout from './StudentDashboardLayout';
import Overview from './Overview';
import ScholarshipBrowser from './ScholarshipBrowser';
import MyApplications from './MyApplications';
import ProfileManagement from './ProfileManagement';
import { mockScholarships } from '../../data/mockData';

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
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // For now, using mock data for scholarships
      setScholarships(mockScholarships);
      
      // Mock profile data
      const mockProfile: StudentProfile = {
        id: user.id,
        name: user.name || user.email?.split('@')[0] || '',
        email: user.email,
        phone: '',
        country: '',
        field_of_interest: '',
        academic_level: '',
        gpa: 0,
        english_proficiency: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setProfile(mockProfile);

      // Mock applications data
      setApplications([]);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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
            <MyApplications 
              applications={applications}
              scholarships={scholarships}
            />
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
      </Routes>
    </StudentDashboardLayout>
  );
};

export default StudentDashboard;