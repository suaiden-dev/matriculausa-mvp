import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSellerNotifications } from './useSellerNotifications';

interface SellerI20DeadlineMonitorConfig {
  sellerId: string;
  checkInterval?: number; // em milissegundos, padrão 5 minutos
}

export const useSellerI20DeadlineMonitor = ({ 
  sellerId, 
  checkInterval = 5 * 60 * 1000 // 5 minutos por padrão
}: SellerI20DeadlineMonitorConfig) => {
  const { createI20DeadlineExpiredNotification } = useSellerNotifications({
    sellerId
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const processedStudentsRef = useRef<Set<string>>(new Set());

  const checkI20Deadlines = async () => {
    try {
      console.log('🔍 [SELLER_I20_DEADLINE_MONITOR] Verificando deadlines do I-20 para seller...');
      
      // Buscar o referral_code do seller
      const { data: sellerData, error: sellerError } = await supabase
        .from('user_profiles')
        .select('seller_referral_code')
        .eq('user_id', sellerId)
        .single();

      if (sellerError || !sellerData?.seller_referral_code) {
        console.log('🔍 [SELLER_I20_DEADLINE_MONITOR] Seller não encontrado ou sem referral_code');
        return;
      }

      // Buscar estudantes que pagaram scholarship fee mas não pagaram I-20 Control Fee
      // e que foram indicados por este seller
      const { data: studentsWithDeadline, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          user_id,
          full_name,
          email,
          seller_referral_code,
          is_scholarship_fee_paid,
          has_paid_i20_control_fee,
          i20_control_fee_due_date,
          updated_at
        `)
        .eq('is_scholarship_fee_paid', true)
        .eq('has_paid_i20_control_fee', false)
        .eq('seller_referral_code', sellerData.seller_referral_code);

      if (error) {
        console.error('❌ [SELLER_I20_DEADLINE_MONITOR] Erro ao buscar estudantes:', error);
        return;
      }

      if (!studentsWithDeadline || studentsWithDeadline.length === 0) {
        console.log('🔍 [SELLER_I20_DEADLINE_MONITOR] Nenhum estudante com deadline ativo encontrado');
        return;
      }

      // Os estudantes já estão filtrados por seller_referral_code na query
      const sellerStudents = studentsWithDeadline;

      const now = new Date();
      const expiredStudents = [];

      for (const student of sellerStudents) {
        // Usar o deadline específico se disponível, senão calcular (10 dias após updated_at)
        let deadline: Date;
        if (student.i20_control_fee_due_date) {
          deadline = new Date(student.i20_control_fee_due_date);
        } else {
          const scholarshipFeePaidDate = new Date(student.updated_at);
          deadline = new Date(scholarshipFeePaidDate.getTime() + 10 * 24 * 60 * 60 * 1000);
        }
        
        // Verificar se o deadline expirou
        if (now > deadline) {
          const studentKey = `${student.user_id}_${student.id}`;
          
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
        console.log(`⚠️ [SELLER_I20_DEADLINE_MONITOR] ${expiredStudents.length} estudante(s) com deadline expirado encontrado(s)`);
        
        // Criar notificações para cada estudante com deadline expirado
        for (const student of expiredStudents) {
          try {
            await createI20DeadlineExpiredNotification(
              student.user_id,
              student.full_name || 'Unknown Student'
            );

            console.log(`✅ [SELLER_I20_DEADLINE_MONITOR] Notificação criada para estudante ${student.full_name} (${student.daysOverdue} dias em atraso)`);
          } catch (error) {
            console.error(`❌ [SELLER_I20_DEADLINE_MONITOR] Erro ao processar estudante ${student.user_id}:`, error);
          }
        }
      } else {
        console.log('✅ [SELLER_I20_DEADLINE_MONITOR] Nenhum deadline expirado encontrado');
      }

    } catch (error) {
      console.error('❌ [SELLER_I20_DEADLINE_MONITOR] Erro geral:', error);
    }
  };

  useEffect(() => {
    if (!sellerId) return;

    // Verificação inicial
    checkI20Deadlines();

    // Configurar verificação periódica
    intervalRef.current = setInterval(checkI20Deadlines, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sellerId, checkInterval]);

  return {
    checkI20Deadlines
  };
};
