import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface ApplicationFeeStatus {
  hasPaidApplicationFee: boolean;
  committedUniversity: string | null;
  committedScholarship: string | null;
  loading: boolean;
  error: string | null;
}

export const useApplicationFeeStatus = (): ApplicationFeeStatus => {
  const { user } = useAuth();
  const [hasPaidApplicationFee, setHasPaidApplicationFee] = useState(false);
  const [committedUniversity, setCommittedUniversity] = useState<string | null>(null);
  const [committedScholarship, setCommittedScholarship] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkApplicationFeeStatus = async () => {
      if (!user?.id || hasChecked) {
        setLoading(false);
        return;
      }

      // Debounce: evitar múltiplas verificações em sequência
      const now = Date.now();
      if (now - (window as any).lastApplicationFeeCheck < 10000) { // 10 segundos de debounce
        return;
      }
      (window as any).lastApplicationFeeCheck = now;

      try {
        setLoading(true);
        setError(null);

        // Buscar aplicações com application fee paga
        const { data: applications, error: fetchError } = await supabase
          .from('scholarship_applications')
          .select(`
            id,
            scholarship_id,
            is_application_fee_paid,
            status,
            scholarships (
              id,
              title,
              universities (
                id,
                name
              )
            )
          `)
          .eq('student_id', user.id)
          .eq('is_application_fee_paid', true);

        if (fetchError) {
          setError('Erro ao verificar status do pagamento');
          return;
        }

        if (applications && applications.length > 0) {
          setHasPaidApplicationFee(true);
          
          // Pegar a primeira aplicação (assumindo que só pode ter uma)
          const firstApplication = applications[0];
          setCommittedUniversity((firstApplication.scholarships as any)?.universities?.name || null);
          setCommittedScholarship((firstApplication.scholarships as any)?.title || null);
          
        } else {
          setHasPaidApplicationFee(false);
          setCommittedUniversity(null);
          setCommittedScholarship(null);
        }
      } catch (err) {
        setError('Erro inesperado ao verificar status');
      } finally {
        setLoading(false);
        setHasChecked(true);
      }
    };

    checkApplicationFeeStatus();
  }, [user?.id, hasChecked]);

  return {
    hasPaidApplicationFee,
    committedUniversity,
    committedScholarship,
    loading,
    error
  };
};
