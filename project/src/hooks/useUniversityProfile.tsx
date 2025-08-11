import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface University {
  id: string;
  name: string;
  profile_completed: boolean;
  // outras propriedades conforme necessário
  [key: string]: any;
}

export const useUniversityProfile = () => {
  const [university, setUniversity] = useState<University | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || user.role !== 'school') {
      setLoading(false);
      return;
    }

    const fetchUniversityProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('universities')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        setUniversity(data);
      } catch (err: any) {
        console.error('Error fetching university profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUniversityProfile();
  }, [user]);

  return {
    university,
    loading,
    error,
    isProfileCompleted: university?.profile_completed ?? false,
    refetch: async () => {
      if (user && user.role === 'school') {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('universities')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          setUniversity(data);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
    }
  };
};


