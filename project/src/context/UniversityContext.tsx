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
      
      // Load university data - ensure only one result
      // school_manager: load by university_id from profile
      // school (owner): load by user_id as before
      const universityQuery = (user.role === 'school_manager' && user.university_id)
        ? supabase.from('universities').select('*').eq('id', user.university_id).limit(1).maybeSingle()
        : supabase.from('universities').select('*').eq('user_id', user.id).limit(1).maybeSingle();

      const { data: universityData, error: universityError } = await universityQuery;

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

        // Filtrar bolsas Migma — não devem aparecer no dashboard da universidade
        const filteredScholarships = (scholarshipsData || []).filter(s => !s.title?.includes('(Migma)'));

        // Load application counts for all scholarships in a single query (otimizado)
        const scholarshipIds = filteredScholarships.map(s => s.id);
        const applicationCounts: Record<string, number> = {};
        
        if (scholarshipIds.length > 0) {
          const { data: countsData, error: countsError } = await supabase
            .from('scholarship_applications')
            .select('scholarship_id')
            .in('scholarship_id', scholarshipIds);
          
          if (!countsError && countsData) {
            // Contar aplicações por bolsa
            countsData.forEach(app => {
              applicationCounts[app.scholarship_id] = (applicationCounts[app.scholarship_id] || 0) + 1;
            });
          }
        }
        
        const scholarshipsWithCounts = filteredScholarships.map(scholarship => ({
          ...scholarship,
          application_count: applicationCounts[scholarship.id] || 0
        }));
        
        setScholarships(scholarshipsWithCounts);

        // Load featured scholarships
        await loadFeaturedScholarships();

        // Load applications linked to this university's scholarships
        const { data: applicationsData, error: applicationsError } = await supabase
          .from('scholarship_applications')
          .select(`
            *,
            scholarships(*),
            user_profiles!student_id(
              id, user_id, full_name, phone, country, email,
              documents_status, documents, 
              is_application_fee_paid, is_scholarship_fee_paid, 
              is_placement_fee_paid, placement_fee_flow, 
              placement_fee_pending_balance, placement_fee_due_date, 
              placement_fee_installment_number, placement_fee_installment_enabled,
              source, student_process_type, visa_transfer_active,
              has_paid_reinstatement_package, has_paid_ds160_package, has_paid_i539_cos_package,
              has_paid_i20_control_fee, selected_scholarship_id, selected_application_id, is_dropped
            )
          `)
          .in('scholarship_id', filteredScholarships.map((s: any) => s.id));

        if (applicationsError) {
          console.error('Error loading applications:', applicationsError);
          throw applicationsError;
        }

        // --- ENRIQUECIMENTO DE DOCUMENTOS DA UNIVERSIDADE ---
        const appIds = (applicationsData || []).map(a => a.id);
        
        if (appIds.length > 0) {
          // 1. Buscar todos os requests (específicos e globais da universidade)
          const { data: allReqs, error: reqsError } = await supabase
            .from('document_requests')
            .select('id, title, scholarship_application_id, is_global, applicable_student_types')
            .or(`scholarship_application_id.in.(${appIds.join(',')}),and(university_id.eq.${universityData.id},is_global.eq.true)`);

          if (reqsError) console.error('[UNI_CONTEXT_DEBUG] Reqs Error:', reqsError);

          // 2. Buscar todos os uploads para esses requests
          const { data: allUploads, error: uploadsError } = await supabase
            .from('document_request_uploads')
            .select('id, document_request_id, status, uploaded_by')
            .in('document_request_id', (allReqs || []).map(r => r.id));

          if (uploadsError) console.error('[UNI_CONTEXT_DEBUG] Uploads Error:', uploadsError);



          // 3. Mapear para cada aplicação
          const enrichedApps = (applicationsData || []).map(app => {
            const studentUserId = app.user_profiles?.user_id;
            const studentProcessType = app.student_process_type || app.user_profiles?.student_process_type || 'initial';
            
            // Requests que se aplicam a esta aplicação: específicos + globais filtrados por tipo de aluno
            const rawRelevantReqs = (allReqs || []).filter(r => {
              if (r.scholarship_application_id === app.id) return true;
              if (r.is_global) {
                // Se não houver tipos especificados, assume que é para todos
                if (!r.applicable_student_types || r.applicable_student_types.length === 0) return true;
                return r.applicable_student_types.includes(studentProcessType);
              }
              return false;
            });

            // Desduplicação inteligente por título normalizado
            const reqsByTitle = new Map<string, any>();
            for (const r of rawRelevantReqs) {
              const normalizedTitle = (r.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
              const existing = reqsByTitle.get(normalizedTitle);
              if (!existing) {
                reqsByTitle.set(normalizedTitle, r);
              } else {
                const rHasUpload = (allUploads || []).some(u => u.document_request_id === r.id && u.uploaded_by === studentUserId);
                const existingHasUpload = (allUploads || []).some(u => u.document_request_id === existing.id && u.uploaded_by === studentUserId);

                if (rHasUpload && !existingHasUpload) {
                  reqsByTitle.set(normalizedTitle, r);
                } else if (rHasUpload === existingHasUpload) {
                  if (r.scholarship_application_id && !existing.scholarship_application_id) {
                    reqsByTitle.set(normalizedTitle, r);
                  }
                }
              }
            }
            const relevantReqs = Array.from(reqsByTitle.values());

            // Uploads que pertencem a esses requests E a este aluno
            const relevantUploads = (allUploads || []).filter(u => 
              relevantReqs.some(r => r.id === u.document_request_id) && 
              u.uploaded_by === studentUserId
            );

            const stats = {
              required: relevantReqs.length,
              uploaded: relevantUploads.length,
              approved: relevantUploads.filter(u => u.status === 'approved').length,
              rejected: relevantUploads.filter(u => u.status === 'rejected' || u.status === 'changes_requested').length,
              under_review: relevantUploads.filter(u => u.status === 'under_review' || !u.status).length
            };

            return {
              ...app,
              university_document_stats: stats
            };
          });



          setApplications(enrichedApps);
        } else {
          setApplications(applicationsData || []);
        }
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
    if (user && !hasLoadedData) {
      loadData();
    }
  }, [user, hasLoadedData]);

  // Sincronização em tempo real (Supabase Realtime)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('university-dashboard-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scholarship_applications' },
        () => {
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_profiles' },
        () => {
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'document_request_uploads' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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