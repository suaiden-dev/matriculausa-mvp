import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAgencyNotifications } from './useAgencyNotifications';

interface I20DeadlineMonitorConfig {
  affiliateAdminId: string;
  checkInterval?: number; // em milissegundos, padrão 5 minutos
}

export const useI20DeadlineMonitor = ({ 
  affiliateAdminId, 
  checkInterval = 5 * 60 * 1000 // 5 minutos por padrão
}: I20DeadlineMonitorConfig) => {
  const { createI20DeadlineExpiredNotification } = useAgencyNotifications({
    affiliateAdminId
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const processedStudentsRef = useRef<Set<string>>(new Set());

  const checkI20Deadlines = async () => {
    try {
      
      // Buscar estudantes que receberam carta de aceite mas não pagaram I-20 Control Fee
      // CORREÇÃO: Usar scholarship_applications para dados da carta de aceite e user_profiles para dados do I-20
      const { data: studentsWithDeadline, error } = await supabase
        .from('scholarship_applications')
        .select(`
          id,
          student_id,
          acceptance_letter_sent_at,
          acceptance_letter_status,
          user_profiles!student_id (
            id,
            user_id,
            full_name,
            email,
            i20_control_fee_due_date,
            has_paid_i20_control_fee
          ),
          scholarships (
            id,
            title
          )
        `)
        .not('acceptance_letter_sent_at', 'is', null)
        .in('acceptance_letter_status', ['sent', 'approved'])
        .eq('user_profiles.has_paid_i20_control_fee', false);

      if (error) {
        console.error('❌ [I20_DEADLINE_MONITOR] Erro ao buscar estudantes:', error);
        return;
      }

      if (!studentsWithDeadline || studentsWithDeadline.length === 0) {
        return;
      }

      const now = new Date();
      const expiredStudents = [];

      for (const application of studentsWithDeadline) {
        // Verificar se a aplicação tem dados do usuário
        const student = Array.isArray(application.user_profiles) 
          ? application.user_profiles[0] 
          : application.user_profiles;
        if (!student) continue;
        
        // Calcular deadline (10 dias após o envio da carta de aceite)
        let deadline: Date;
        
        if (student.i20_control_fee_due_date) {
          // Se já tem deadline específico do I-20, usar ele
          deadline = new Date(student.i20_control_fee_due_date);
        } else {
          // Calcular deadline baseado na data de envio da carta de aceite + 10 dias
          const acceptanceDate = new Date(application.acceptance_letter_sent_at);
          deadline = new Date(acceptanceDate.getTime() + 10 * 24 * 60 * 60 * 1000);
        }
        
        // Verificar se o deadline expirou
        if (now > deadline) {
          const studentKey = `${student.user_id}_${application.id}`;
          
          // Verificar se já processamos este estudante
          if (!processedStudentsRef.current.has(studentKey)) {
            expiredStudents.push({
              ...application,
              student_id: student.user_id, // Mapear user_id para student_id
              user_profiles: student, // Manter dados do usuário
              deadline,
              daysOverdue: Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24))
            });
            
            // Marcar como processado
            processedStudentsRef.current.add(studentKey);
          }
        }
      }

      if (expiredStudents.length > 0) {
        
        // Buscar informações do seller para cada estudante
        for (const student of expiredStudents) {
          try {
            // Buscar seller que indicou este estudante usando query SQL direta
            const { data: sellerData, error: sellerError } = await supabase
              .rpc('get_seller_info_for_student', { 
                student_user_id: student.student_id 
              });

            if (sellerError || !sellerData || sellerData.length === 0) {
              continue;
            }

            const seller = sellerData[0];
            
            // Verificar se o seller pertence ao affiliate admin atual
            if (seller.affiliate_admin_id !== affiliateAdminId) {
              continue;
            }

            // Criar notificação
            await createI20DeadlineExpiredNotification(
              student.student_id,
              student.user_profiles?.full_name || 'Unknown Student',
              seller.name || 'Unknown Seller'
            );

          } catch (error) {
            console.error(`❌ [I20_DEADLINE_MONITOR] Erro ao processar estudante ${student.student_id}:`, error);
          }
        }
      } else {
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
