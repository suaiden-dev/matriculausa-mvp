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

  useEffect(() => {
    const checkApplicationFeeStatus = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

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
          console.error('❌ [useApplicationFeeStatus] Erro ao buscar aplicações:', fetchError);
          setError('Erro ao verificar status do pagamento');
          return;
        }

        console.log('🔍 [useApplicationFeeStatus] Aplicações com application fee paga:', applications);

        if (applications && applications.length > 0) {
          setHasPaidApplicationFee(true);
          
          // Pegar a primeira aplicação (assumindo que só pode ter uma)
          const firstApplication = applications[0];
          setCommittedUniversity(firstApplication.scholarships?.universities?.name || null);
          setCommittedScholarship(firstApplication.scholarships?.title || null);
          
          console.log('✅ [useApplicationFeeStatus] Usuário já tem application fee paga para:', {
            university: firstApplication.scholarships?.universities?.name,
            scholarship: firstApplication.scholarships?.title
          });
        } else {
          setHasPaidApplicationFee(false);
          setCommittedUniversity(null);
          setCommittedScholarship(null);
          console.log('ℹ️ [useApplicationFeeStatus] Usuário não tem application fee paga');
        }
      } catch (err) {
        console.error('❌ [useApplicationFeeStatus] Erro inesperado:', err);
        setError('Erro inesperado ao verificar status');
      } finally {
        setLoading(false);
      }
    };

    checkApplicationFeeStatus();
  }, [user?.id]);

  return {
    hasPaidApplicationFee,
    committedUniversity,
    committedScholarship,
    loading,
    error
  };
};
