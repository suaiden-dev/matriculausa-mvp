import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { University, Scholarship } from '../types';

interface UniversityContextType {
  university: University | null;
  scholarships: Scholarship[];
  featuredScholarships: Scholarship[];
  featuredLoading: boolean;
  applications: any[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  handleDeleteScholarship: (scholarshipId: string) => Promise<void>;
  toggleScholarshipStatus: (scholarshipId: string, currentStatus: boolean) => Promise<void>;
  toggleScholarshipHighlight: (scholarshipId: string, newHighlightStatus: boolean) => Promise<void>;
  reorderFeaturedScholarships: (scholarshipId: string, direction: 'up' | 'down') => Promise<void>;
}

const UniversityContext = createContext<UniversityContextType | undefined>(undefined);

interface UniversityProviderProps {
  children: ReactNode;
}

export const UniversityProvider: React.FC<UniversityProviderProps> = ({ children }) => {
  const [university, setUniversity] = useState<University | null>(null);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [featuredScholarships, setFeaturedScholarships] = useState<Scholarship[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);
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

        // Load featured scholarships
        await loadFeaturedScholarships();

        // Load applications linked to this university's scholarships
        const { data: applicationsData, error: applicationsError } = await supabase
          .from('scholarship_applications')
          .select(`
            *,
            scholarships(*),
            user_profiles!student_id(id, user_id, full_name, phone, country, documents_status, documents, is_application_fee_paid)
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

  const toggleScholarshipHighlight = async (scholarshipId: string, newHighlightStatus: boolean) => {
    try {
      // Check if we're already at the limit of 6 featured scholarships
      if (newHighlightStatus) {
        const currentFeaturedCount = featuredScholarships.length;
        if (currentFeaturedCount >= 6) {
          alert('Maximum of 6 featured scholarships reached. Remove one before adding another.');
          return;
        }
      }

      const updateData: any = { is_highlighted: newHighlightStatus };

      if (newHighlightStatus) {
        // Set order for new featured scholarship
        const currentFeaturedCount = featuredScholarships.length;
        updateData.featured_order = currentFeaturedCount + 1;
      } else {
        // Remove order when unhighlighting
        updateData.featured_order = null;
      }

      const { error } = await supabase
        .from('scholarships')
        .update(updateData)
        .eq('id', scholarshipId);

      if (error) throw error;

      // Update local state
      setScholarships(prev => prev.map(s =>
        s.id === scholarshipId ? { ...s, is_highlighted: newHighlightStatus, featured_order: updateData.featured_order } : s
      ));

      // Refresh featured scholarships
      await loadFeaturedScholarships();

      // Show feedback
      const action = newHighlightStatus ? 'marked as featured' : 'removed from featured';
      alert(`Scholarship ${action} successfully!`);
    } catch (error: any) {
      console.error('Error toggling scholarship highlight:', error);
      alert('Error updating scholarship highlight status');
    }
  };

  const reorderFeaturedScholarships = async (scholarshipId: string, direction: 'up' | 'down') => {
    try {
      const currentIndex = featuredScholarships.findIndex(s => s.id === scholarshipId);
      if (currentIndex === -1) return;

      let newIndex: number;
      if (direction === 'up' && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else if (direction === 'down' && currentIndex < featuredScholarships.length - 1) {
        newIndex = currentIndex + 1;
      } else {
        return; // Can't move in that direction
      }

      const currentScholarship = featuredScholarships[currentIndex];
      const targetScholarship = featuredScholarships[newIndex];

      // Swap the featured_order values
      const { error: error1 } = await supabase
        .from('scholarships')
        .update({ featured_order: targetScholarship.featured_order })
        .eq('id', currentScholarship.id);

      const { error: error2 } = await supabase
        .from('scholarships')
        .update({ featured_order: currentScholarship.featured_order })
        .eq('id', targetScholarship.id);

      if (error1 || error2) throw error1 || error2;

      // Refresh featured scholarships
      await loadFeaturedScholarships();
    } catch (error: any) {
      console.error('Error reordering featured scholarships:', error);
      alert('Error reordering featured scholarships');
    }
  };

  const loadFeaturedScholarships = async () => {
    if (!university) {
      return;
    }

    try {
      setFeaturedLoading(true);
      
      // First, let's try to get all scholarships for this university to see what we have
      const { data: allScholarships, error: allError } = await supabase
        .from('scholarships')
        .select('*')
        .eq('university_id', university.id);

      if (allError) {
        console.error('Error loading all scholarships:', allError);
        return;
      }
      
      // Filter featured scholarships locally
      const featured = allScholarships
        .filter(s => s.is_highlighted === true)
        .sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0))
        .slice(0, 6);

      setFeaturedScholarships(featured);
    } catch (error: any) {
      console.error('Error loading featured scholarships:', error);
    } finally {
      setFeaturedLoading(false);
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
    featuredScholarships,
    featuredLoading,
    applications,
    loading,
    error,
    refreshData,
    handleDeleteScholarship,
    toggleScholarshipStatus,
    toggleScholarshipHighlight,
    reorderFeaturedScholarships,
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