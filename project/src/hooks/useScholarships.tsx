import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useScholarships() {
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScholarships = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('scholarships')
          .select('*, university:university_id(*)')
          .eq('is_active', true);
        if (error) throw error;
        const approvedScholarships = (data || []).filter(s => s.university && s.university.is_approved);
        setScholarships(approvedScholarships);
      } catch (err: any) {
        setError('Failed to load scholarships');
        setScholarships([]);
      } finally {
        setLoading(false);
      }
    };
    fetchScholarships();
  }, []);

  return { scholarships, loading, error };
} 