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
      
      // Buscar user_id do usuário autenticado
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        // Visitante: buscar todas as bolsas ativas e o nome da universidade
        const { data, error } = await supabase
          .from('scholarships')
          .select(`
            id,
            title,
            description,
            amount,
            deadline,
            requirements,
            field_of_study,
            level,
            delivery_mode,
            eligibility,
            benefits,
            is_exclusive,
            is_active,
            university_id,
            created_at,
            updated_at,
            needcpt,
            visaassistance,
            scholarshipvalue,
            image_url,
            original_value_per_credit,
            original_annual_value,
            annual_value_with_scholarship,
            scholarship_type,
            work_permissions,
            university_name,
            universities (id, name, logo_url, location, is_approved)
          `)
          .eq('is_active', true);
        
        if (error) {
          setError(error.message);
          setScholarships([]);
        } else {
          setScholarships((data || []) as unknown as Scholarship[]);
        }
        setLoading(false);
        setHasLoadedData(true);
        return;
      }
      
      // Usuário autenticado: buscar todas as bolsas ativas com todos os campos
      const { data, error } = await supabase
        .from('scholarships')
        .select(`
          id,
          title,
          description,
          amount,
          deadline,
          requirements,
          field_of_study,
          level,
          delivery_mode,
          eligibility,
          benefits,
          is_exclusive,
          is_active,
          university_id,
          created_at,
          updated_at,
          needcpt,
          visaassistance,
          scholarshipvalue,
          image_url,
          original_value_per_credit,
          original_annual_value,
          annual_value_with_scholarship,
          scholarship_type,
          work_permissions,
          universities (id, name, logo_url, location, is_approved)
        `)
        .eq('is_active', true);
        
      if (error) {
        setError(error.message);
        setScholarships([]);
      } else {
        setScholarships((data || []) as unknown as Scholarship[]);
      }
      setLoading(false);
      setHasLoadedData(true);
    }
    fetchScholarships();
  }, [hasLoadedData]);
  return { scholarships, loading, error };
} 