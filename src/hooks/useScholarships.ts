import { useEffect, useState } from 'react';
import { supabase, Scholarship } from '../lib/supabase';

export function useScholarships() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchScholarships() {
      setLoading(true);
      const { data, error } = await supabase
        .from('scholarships')
        .select('*, universities(name)');
      if (error) {
        setError(error.message);
        setScholarships([]);
      } else {
        setScholarships(data as Scholarship[]);
      }
      setLoading(false);
    }
    fetchScholarships();
  }, []);

  return { scholarships, loading, error };
} 