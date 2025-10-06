import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Scholarship } from '../types';

export function useScholarships() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  useEffect(() => {
    // Evitar loop infinito - só executar se ainda não carregou
    if (hasLoadedData) {
      return;
    }

    // Debounce: evitar múltiplas chamadas em sequência
    const now = Date.now();
    if (now - lastFetchTime < 5000) { // 5 segundos de debounce
      return;
    }
    setLastFetchTime(now);

    async function fetchScholarships() {
      try {
        setLoading(true);
        setError(null);
        
        // Buscar user_id do usuário autenticado
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        
        // Query unificada para visitantes e usuários autenticados
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
            is_highlighted,
            featured_order,
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
            application_fee_amount,
            universities (id, name, logo_url, location, is_approved)
          `)
          .eq('is_active', true);
        
        if (error) {
          console.error('❌ [useScholarships] Erro ao buscar bolsas:', error);
          setError(error.message);
          setScholarships([]);
        } else {
          setScholarships((data || []) as unknown as Scholarship[]);
        }
      } catch (err) {
        console.error('❌ [useScholarships] Erro inesperado:', err);
        setError('Erro inesperado ao carregar bolsas');
        setScholarships([]);
      } finally {
        setLoading(false);
        setHasLoadedData(true);
      }
    }
    
    fetchScholarships();
  }, []); // Removido hasLoadedData da dependência para evitar loop
  
  return { scholarships, loading, error };
} 