import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAffiliateAdminNotifications } from './useAffiliateAdminNotifications';

interface I20DeadlineMonitorConfig {
  affiliateAdminId: string;
  checkInterval?: number; // em milissegundos, padrão 5 minutos
}

export const useI20DeadlineMonitor = ({ 
  affiliateAdminId, 
  checkInterval = 5 * 60 * 1000 // 5 minutos por padrão
}: I20DeadlineMonitorConfig) => {
  const { createI20DeadlineExpiredNotification } = useAffiliateAdminNotifications({
    affiliateAdminId
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const processedStudentsRef = useRef<Set<string>>(new Set());

  const checkI20Deadlines = async () => {
    try {
      console.log('🔍 [I20_DEADLINE_MONITOR] Verificando deadlines do I-20...');
      
      // Buscar estudantes que pagaram scholarship fee mas não pagaram I-20 Control Fee
      const { data: studentsWithDeadline, error } = await supabase
        .from('scholarship_applications')
        .select(`
          id,
          student_id,
          is_scholarship_fee_paid,
          has_paid_i20_control_fee,
          updated_at,
          user_profiles!student_id (
            full_name,
            email
          ),
          scholarships (
            id,
            title
          )
        `)
        .eq('is_scholarship_fee_paid', true)
        .eq('has_paid_i20_control_fee', false);

      if (error) {
        console.error('❌ [I20_DEADLINE_MONITOR] Erro ao buscar estudantes:', error);
        return;
      }

      if (!studentsWithDeadline || studentsWithDeadline.length === 0) {
        console.log('🔍 [I20_DEADLINE_MONITOR] Nenhum estudante com deadline ativo encontrado');
        return;
      }

      const now = new Date();
      const expiredStudents = [];

      for (const student of studentsWithDeadline) {
        // Calcular deadline (10 dias após o pagamento da scholarship fee)
        const scholarshipFeePaidDate = new Date(student.updated_at);
        const deadline = new Date(scholarshipFeePaidDate.getTime() + 10 * 24 * 60 * 60 * 1000);
        
        // Verificar se o deadline expirou
        if (now > deadline) {
          const studentKey = `${student.student_id}_${student.id}`;
          
          // Verificar se já processamos este estudante
          if (!processedStudentsRef.current.has(studentKey)) {
            expiredStudents.push({
              ...student,
              deadline,
              daysOverdue: Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24))
            });
            
            // Marcar como processado
            processedStudentsRef.current.add(studentKey);
          }
        }
      }

      if (expiredStudents.length > 0) {
        console.log(`⚠️ [I20_DEADLINE_MONITOR] ${expiredStudents.length} estudante(s) com deadline expirado encontrado(s)`);
        
        // Buscar informações do seller para cada estudante
        for (const student of expiredStudents) {
          try {
            // Buscar seller que indicou este estudante
            const { data: sellerData, error: sellerError } = await supabase
              .from('user_profiles')
              .select(`
                seller_referral_code,
                sellers!seller_referral_code (
                  name,
                  user_id,
                  affiliate_admin_id
                )
              `)
              .eq('user_id', student.student_id)
              .single();

            if (sellerError || !sellerData?.sellers) {
              console.warn(`⚠️ [I20_DEADLINE_MONITOR] Não foi possível encontrar seller para estudante ${student.student_id}`);
              continue;
            }

            // Verificar se o seller pertence ao affiliate admin atual
            if (sellerData.sellers.affiliate_admin_id !== affiliateAdminId) {
              console.log(`🔍 [I20_DEADLINE_MONITOR] Estudante ${student.student_id} não pertence ao affiliate admin ${affiliateAdminId}`);
              continue;
            }

            // Criar notificação
            await createI20DeadlineExpiredNotification(
              student.student_id,
              student.user_profiles?.full_name || 'Unknown Student',
              sellerData.sellers.name || 'Unknown Seller'
            );

            console.log(`✅ [I20_DEADLINE_MONITOR] Notificação criada para estudante ${student.user_profiles?.full_name} (${student.daysOverdue} dias em atraso)`);
          } catch (error) {
            console.error(`❌ [I20_DEADLINE_MONITOR] Erro ao processar estudante ${student.student_id}:`, error);
          }
        }
      } else {
        console.log('✅ [I20_DEADLINE_MONITOR] Nenhum deadline expirado encontrado');
      }

    } catch (error) {
      console.error('❌ [I20_DEADLINE_MONITOR] Erro geral:', error);
    }
  };

  useEffect(() => {
    if (!affiliateAdminId) return;

    // Verificação inicial
    checkI20Deadlines();

    // Configurar verificação periódica
    intervalRef.current = setInterval(checkI20Deadlines, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [affiliateAdminId, checkInterval]);

  return {
    checkI20Deadlines
  };
};
