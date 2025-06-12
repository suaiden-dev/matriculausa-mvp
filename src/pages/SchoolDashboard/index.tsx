import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { supabase, University, Scholarship } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import SchoolDashboardLayout from './SchoolDashboardLayout';
import Overview from './Overview';
import ScholarshipManagement from './ScholarshipManagement';
import ProfileManagement from './ProfileManagement';

const SchoolDashboard: React.FC = () => {
  const [university, setUniversity] = useState<University | null>(null);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
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

  return (
    <Routes>
      <Route path="/" element={<SchoolDashboardLayout university={university} user={user} loading={loading} />}>
        <Route 
          index 
          element={
            <Overview 
              university={university} 
              scholarships={scholarships} 
              stats={stats} 
              user={user}
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
          element={<ProfileManagement university={university} />} 
        />
      </Route>
    </Routes>
  );
};

export default SchoolDashboard;