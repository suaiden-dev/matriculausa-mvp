import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { University, Scholarship } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import SchoolDashboardLayout from './SchoolDashboardLayout';
import Overview from './Overview';
import ScholarshipManagement from './ScholarshipManagement';
import NewScholarship from './NewScholarship';
import ProfileManagement from './ProfileManagement';
import StudentManagement from './StudentManagement';

const SkeletonLoader = () => <div className="animate-pulse h-40 bg-slate-100 rounded-xl w-full my-8" />;

const SchoolDashboard: React.FC = () => {
  const [university, setUniversity] = useState<University | null>(null);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
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
      // Load university data
      const { data: universityData, error: universityError } = await supabase
        .from('universities')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (universityError) throw universityError;
      setUniversity(universityData);

      // Load scholarships only if university exists
      if (universityData) {
        const { data: scholarshipsData, error: scholarshipsError } = await supabase
          .from('scholarships')
          .select('*')
          .eq('university_id', universityData.id)
          .order('created_at', { ascending: false });

        if (scholarshipsError) throw scholarshipsError;
        setScholarships(scholarshipsData || []);

        // Buscar todas as aplicações vinculadas às bolsas desta universidade
        const { data: applicationsData, error: applicationsError } = await supabase
          .from('scholarship_applications')
          .select(`
            *,
            scholarships(*),
            user_profiles!student_id(id, user_id, full_name, phone, country)
          `)
          .in('scholarship_id', (scholarshipsData || []).map((s: any) => s.id));

        if (applicationsError) {
          console.error('Erro detalhado da consulta:', applicationsError);
          throw applicationsError;
        }
        setApplications(applicationsData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do painel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScholarship = async (scholarshipId: string) => {
    if (!confirm('Tem certeza de que deseja excluir esta bolsa?')) return;

    try {
      const { error } = await supabase
        .from('scholarships')
        .delete()
        .eq('id', scholarshipId);

      if (error) throw error;
      
      setScholarships(prev => prev.filter(s => s.id !== scholarshipId));
    } catch (error) {
      console.error('Erro ao excluir bolsa:', error);
      alert('Erro ao excluir bolsa. Tente novamente.');
    }
  };

  const toggleScholarshipStatus = async (scholarshipId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('scholarships')
        .update({ is_active: !currentStatus })
        .eq('id', scholarshipId);

      if (error) throw error;
      
      setScholarships(prev => prev.map(s => 
        s.id === scholarshipId ? { ...s, is_active: !currentStatus } : s
      ));
    } catch (error) {
      console.error('Erro ao atualizar status da bolsa:', error);
      alert('Erro ao atualizar bolsa. Tente novamente.');
    }
  };

  // Calculate stats
  const stats = {
    totalScholarships: scholarships.length,
    activeScholarships: scholarships.filter(s => s.is_active).length,
    totalFunding: scholarships.reduce((sum, s) => sum + Number(s.amount), 0),
    avgAmount: scholarships.length > 0 ? scholarships.reduce((sum, s) => sum + Number(s.amount), 0) / scholarships.length : 0
  };

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E]"></div>
    </div>;
  }
  
  return (
    <div className="bg-slate-50">
      <Routes>
        <Route 
          path="/" 
          element={
            <SchoolDashboardLayout 
              university={university} 
              user={user}
              loading={loading}
            />
          }
        >
          <Route 
            index 
            element={
              <Overview 
                university={university} 
                scholarships={scholarships} 
                stats={stats} 
                applications={applications}
              />
            } 
          />
          <Route 
            path="scholarships" 
            element={
              <ScholarshipManagement 
                university={university} 
                scholarships={scholarships} 
                handleDeleteScholarship={handleDeleteScholarship}
                toggleScholarshipStatus={toggleScholarshipStatus}
              />
            } 
          />
          <Route 
            path="profile" 
            element={
              <ProfileManagement university={university} setUniversity={setUniversity} />
            } 
          />
          <Route 
            path="students" 
            element={<StudentManagement applications={applications} />}
          />
        </Route>
        <Route 
          path="/scholarship/new" 
          element={
            <NewScholarship universityId={university?.id} />
          } 
        />
      </Routes>
    </div>
  );
};

export default SchoolDashboard;