import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { StudentInfo, Seller, Student, University } from '../types';

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
        setUniversities(universitiesData);
      }
    } catch (error) {
      console.warn('Could not load universities:', error);
    }
  }, []);

  // Função para calcular a receita real baseada nas taxas pagas (SEM Application Fee)
  const calculateStudentRevenue = async (studentId: string, profileId: string) => {
    try {
      console.log('🔍 Calculating revenue for student:', studentId, 'profile:', profileId);
      
      let totalRevenue = 0;
      
      // Buscar aplicação de bolsa do estudante
      const { data: applicationData, error: applicationError } = await supabase
        .from('scholarship_applications')
        .select(`
          id,
          is_scholarship_fee_paid
        `)
        .eq('student_id', profileId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!applicationError && applicationData) {
        console.log('🔍 Application data found:', applicationData);
        
        // Scholarship Fee (fixa - $400) - APENAS esta taxa do sistema
        if (applicationData.is_scholarship_fee_paid) {
          totalRevenue += 400;
          console.log('🔍 Scholarship fee added: $400');
        }
      }
      
      // Buscar perfil do usuário para taxas fixas
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          has_paid_selection_process_fee,
          has_paid_i20_control_fee
        `)
        .eq('id', profileId)
        .single();

      if (!profileError && profileData) {
        console.log('🔍 Profile data found:', profileData);
        
        // Selection Process Fee (fixa - $999)
        if (profileData.has_paid_selection_process_fee) {
          totalRevenue += 999;
          console.log('🔍 Selection process fee added: $999');
        }
        
        // I-20 Control Fee (fixa - $999)
        if (profileData.has_paid_i20_control_fee) {
          totalRevenue += 999;
          console.log('🔍 I-20 control fee added: $999');
        }
      }
      
      console.log(`🔍 Total revenue calculated for student ${studentId}: $${totalRevenue}`);
      return totalRevenue;
      
    } catch (error) {
      console.error('🔍 Error calculating student revenue:', error);
      return 0;
    }
  };

  // Carregar dados iniciais
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Carregar universidades em paralelo
      await loadUniversities();

      // Se userId estiver disponível, tentar usar funções SQL corrigidas para dados reais
      if (userId) {
        try {
          console.log('🔍 Attempting to load data using SQL functions for admin user:', userId);
          
          // Buscar dados reais usando funções SQL corrigidas
          const { data: realSellersData, error: realSellersError } = await supabase
            .rpc('get_admin_sellers_analytics_fixed', { admin_user_id: userId });

          console.log('🔍 SQL sellers response:', { data: realSellersData, error: realSellersError });

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
            
            console.log('🔍 Processed sellers from SQL:', processedSellers);
          } else {
            console.log('🔍 SQL sellers function failed or returned no data, will use fallback');
          }

          // Buscar dados reais dos estudantes usando a função existente
          const { data: realStudentsData, error: realStudentsError } = await supabase
            .rpc('get_admin_students_analytics', { admin_user_id: userId });

          console.log('🔍 SQL students response:', { data: realStudentsData, error: realStudentsError });

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
                // Flags de pagamento necessários para a visualização das taxas faltantes
                has_paid_selection_process_fee: student.has_paid_selection_process_fee,
                has_paid_i20_control_fee: student.has_paid_i20_control_fee,
                is_scholarship_fee_paid: student.is_scholarship_fee_paid,
                is_application_fee_paid: student.is_application_fee_paid
              };
            });
            
            processedStudents = studentsWithRevenue;
            
            console.log('🔍 Processed students from SQL with real revenue:', processedStudents);
            console.log('🔍 SQL Students debug - referred_by_seller_id values:', processedStudents.map((s: any) => ({
              name: s.full_name,
              referred_by_seller_id: s.referred_by_seller_id,
              seller_name: s.seller_name,
              total_paid: s.total_paid
            })));
            
            setStudents(processedStudents);
          } else {
            console.log('🔍 SQL students function failed or returned no data, will use fallback');
          }

          // Se ambas as funções SQL funcionaram (mesmo que retornem arrays vazios), não usar fallback
          if (!realSellersError && !realStudentsError) {
            console.log('🔍 SQL functions successful, skipping fallback');
            console.log('🔍 Final state - Students loaded via SQL:', realStudentsData?.length || 0);
            console.log('🔍 Final state - Sellers loaded via SQL:', realSellersData?.length || 0);
            
            // Debug: verificar se os dados estão sendo mapeados corretamente
            console.log('🔍 Final processed students:', processedStudents);
            console.log('🔍 Final processed sellers:', processedSellers);
            
            // Verificar se os estudantes têm referred_by_seller_id
            const studentsWithSellerId = processedStudents.filter((s: any) => s.referred_by_seller_id);
            console.log('🔍 Students with referred_by_seller_id:', studentsWithSellerId.length);
            console.log('🔍 Students without referred_by_seller_id:', processedStudents.length - studentsWithSellerId.length);
            
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
            
            console.log('🔍 Sellers with real revenue:', sellersWithRealRevenue);
            
            setSellers(sellersWithRealRevenue);
            setStudents(processedStudents);
            return;
          }
        } catch (error) {
          console.warn('🔍 SQL functions exception, using fallback:', error);
        }
      }

      // Se chegou aqui, as funções SQL falharam - retornar dados vazios
      console.log('🔍 SQL functions failed, returning empty data');
      setSellers([]);
      setStudents([]);
      return;

    } catch (error: any) {
      console.error('Error loading data:', error);
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
