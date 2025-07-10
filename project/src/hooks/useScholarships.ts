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
      const session = supabase.auth.session ? supabase.auth.session() : await supabase.auth.getSession();
      const userId = session?.user?.id || session?.data?.session?.user?.id;
      if (!userId) {
        setError('Usuário não autenticado');
        setScholarships([]);
        setLoading(false);
        setHasLoadedData(true);
        return;
      }
      // Chamar a função RPC
      const { data, error } = await supabase.rpc('get_scholarships_protected', { p_user_id: userId });
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