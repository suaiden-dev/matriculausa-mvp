import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { University } from '../types';

export function useUniversities() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUniversities() {
      // Only show loading on first data fetch
      if (!hasLoadedData) {
        setLoading(true);
      }
      
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .eq('is_approved', true)
        .eq('profile_completed', true);
      
      if (error) {
        setError(error.message);
        setUniversities([]);
      } else {
        setUniversities(data as University[]);
      }
      
      setLoading(false);
      setHasLoadedData(true);
    }
    fetchUniversities();
  }, [hasLoadedData]);

  return { universities, loading, error };
} 