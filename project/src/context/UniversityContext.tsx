import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { University, Scholarship } from '../types';

interface UniversityContextType {
  university: University | null;
  scholarships: Scholarship[];
  applications: any[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  handleDeleteScholarship: (scholarshipId: string) => Promise<void>;
  toggleScholarshipStatus: (scholarshipId: string, currentStatus: boolean) => Promise<void>;
}

const UniversityContext = createContext<UniversityContextType | undefined>(undefined);

interface UniversityProviderProps {
  children: ReactNode;
}

export const UniversityProvider: React.FC<UniversityProviderProps> = ({ children }) => {
  const [university, setUniversity] = useState<University | null>(null);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Track se já carregamos dados uma vez para cache inteligente
  const [hasLoadedData, setHasLoadedData] = useState(false);

  const loadData = async () => {
    if (!user) return;

    try {
      // CACHE INTELIGENTE: Só mostrar loading se não temos dados ainda
      if (!hasLoadedData) {
        setLoading(true);
      }
      setError(null);
      
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

        // Load applications linked to this university's scholarships
        const { data: applicationsData, error: applicationsError } = await supabase
          .from('scholarship_applications')
          .select(`
            *,
            scholarships(*),
            user_profiles!student_id(id, user_id, full_name, phone, country)
          `)
          .in('scholarship_id', (scholarshipsData || []).map((s: any) => s.id));

        if (applicationsError) {
          console.error('Error loading applications:', applicationsError);
          throw applicationsError;
        }
        setApplications(applicationsData || []);
      }
      
      // Marcar que já carregamos dados uma vez
      setHasLoadedData(true);
    } catch (error: any) {
      console.error('Error loading university data:', error);
      setError(error.message || 'Failed to load university data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await loadData();
  };

  const handleDeleteScholarship = async (scholarshipId: string) => {
    if (!confirm('Are you sure you want to delete this scholarship?')) return;

    try {
      const { error } = await supabase
        .from('scholarships')
        .delete()
        .eq('id', scholarshipId);

      if (error) throw error;
      
      setScholarships(prev => prev.filter(s => s.id !== scholarshipId));
    } catch (error: any) {
      console.error('Error deleting scholarship:', error);
      alert('Error deleting scholarship. Please try again.');
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
    } catch (error: any) {
      console.error('Error updating scholarship status:', error);
      alert('Error updating scholarship. Please try again.');
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const value: UniversityContextType = {
    university,
    scholarships,
    applications,
    loading,
    error,
    refreshData,
    handleDeleteScholarship,
    toggleScholarshipStatus,
  };

  return (
    <UniversityContext.Provider value={value}>
      {children}
    </UniversityContext.Provider>
  );
};

export const useUniversity = () => {
  const context = useContext(UniversityContext);
  if (context === undefined) {
    throw new Error('useUniversity must be used within a UniversityProvider');
  }
  return context;
}; 