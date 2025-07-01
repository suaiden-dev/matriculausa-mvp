import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Scholarship } from '../types';

export function useScholarships() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchScholarships() {
      // Only show loading on first data fetch
      if (!hasLoadedData) {
        setLoading(true);
      }
      
      const { data, error } = await supabase
        .from('scholarships')
        .select(`id, title, description, amount, deadline, requirements, field_of_study, level, eligibility, benefits, is_exclusive, is_active, university_id, created_at, updated_at, needcpt, visaassistance, scholarshipvalue, image_url, original_value_per_credit, original_annual_value, annual_value_with_scholarship, scholarship_type, universities!inner(id, name, logo_url, location, is_approved)`);
      if (error) {
        setError(error.message);
        setScholarships([]);
      } else {
        const filtered = (data || []).filter((s: any) => s.universities && s.universities.is_approved);
        setScholarships(filtered as unknown as Scholarship[]);
      }
      setLoading(false);
      setHasLoadedData(true);
    }
    fetchScholarships();
  }, [hasLoadedData]);

  return { scholarships, loading, error };
} 