import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Seller, Student, University } from '../types';

export const useStudentData = (userId?: string) => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar universidades para filtros
  const loadUniversities = useCallback(async () => {
    try {
      const { data: universitiesData, error: universitiesError } = await supabase
        .from('universities')
        .select('id, name, logo_url, location')
        .eq('is_approved', true)
        .order('name');

      if (!universitiesError && universitiesData) {
        setUniversities(universitiesData as University[]);
      }
    } catch (error) {
      
    }
  }, []);


  // Carregar dados iniciais
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Carregar universidades em paralelo
      await loadUniversities();

      // Se userId estiver disponível, tentar usar funções SQL corrigidas para dados reais
      if (userId) {
        try {
          
          // Buscar dados reais usando funções SQL corrigidas
          const { data: realSellersData, error: realSellersError } = await supabase
            .rpc('get_admin_sellers_analytics_fixed', { admin_user_id: userId });


          let processedSellers: any[] = [];
          let processedStudents: any[] = [];

          if (!realSellersError && realSellersData && realSellersData.length > 0) {
            processedSellers = realSellersData.map((seller: any) => ({
              id: seller.seller_id,
              name: seller.seller_name || 'Name not available',
              email: seller.seller_email || 'Email not available',
              referral_code: seller.referral_code || '',
              is_active: seller.is_active,
              created_at: seller.last_referral_date || new Date().toISOString(),
              students_count: seller.students_count || 0,
              total_revenue: Number(seller.total_revenue) || 0
            }));
            
          } else {
          }

          // Buscar dados reais dos estudantes usando a função existente
          const { data: realStudentsData, error: realStudentsError } = await supabase
            .rpc('get_admin_students_analytics', { admin_user_id: userId });


          if (!realStudentsError && realStudentsData && realStudentsData.length > 0) {
            // Processar estudantes usando receita já calculada pela função RPC
            const studentsWithRevenue = realStudentsData.map((student: any) => {
              return {
                id: student.student_id,
                profile_id: student.profile_id,
                user_id: student.student_id,
                full_name: student.student_name,
                email: student.student_email,
                country: student.country,
                referred_by_seller_id: student.referred_by_seller_id,
                seller_name: student.seller_name,
                seller_referral_code: student.seller_referral_code,
                referral_code_used: student.referral_code_used,
                total_paid: student.total_paid, // Usar receita já calculada pela função RPC
                created_at: student.created_at,
                status: student.status,
                application_status: student.application_status,
                scholarship_title: student.scholarship_title,
                university_name: student.university_name,
                university_id: student.university_id, // Adicionar university_id
                // Flags de pagamento necessários para a visualização das taxas faltantes
                has_paid_selection_process_fee: student.has_paid_selection_process_fee,
                has_paid_i20_control_fee: student.has_paid_i20_control_fee,
                is_scholarship_fee_paid: student.is_scholarship_fee_paid,
                is_application_fee_paid: student.is_application_fee_paid
              };
            });
            
            processedStudents = studentsWithRevenue;
            
            
            setStudents(processedStudents);
          } else {
          }

          // Se ambas as funções SQL funcionaram (mesmo que retornem arrays vazios), não usar fallback
          if (!realSellersError && !realStudentsError) {
            
            // Verificar se os estudantes têm referred_by_seller_id
            const studentsWithSellerId = processedStudents.filter((s: any) => s.referred_by_seller_id);
            
            // Calcular receita real para vendedores SQL
            const sellersWithRealRevenue = processedSellers.map((seller: any) => {
              const sellerStudents = processedStudents.filter((student: any) => 
                student.referred_by_seller_id === seller.id
              );
              
              const actualRevenue = sellerStudents.reduce((sum, student) => sum + (student.total_paid || 0), 0);
              
              return {
                ...seller,
                students_count: sellerStudents.length,
                total_revenue: actualRevenue
              };
            });
            
            
            setSellers(sellersWithRealRevenue);
            setStudents(processedStudents);
            return;
          }
        } catch (error) {
        }
      }

      // Se chegou aqui, as funções SQL falharam - retornar dados vazios
      setSellers([]);
      setStudents([]);
      return;

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [loadUniversities, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    sellers,
    students,
    universities,
    loading,
    error,
    loadData
  };
};
