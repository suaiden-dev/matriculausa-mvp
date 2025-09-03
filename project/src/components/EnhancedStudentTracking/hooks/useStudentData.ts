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

  // Função para calcular a receita real baseada nas taxas pagas
  const calculateStudentRevenue = async (studentId: string, profileId: string) => {
    try {
      console.log('🔍 Calculating revenue for student:', studentId, 'profile:', profileId);
      
      let totalRevenue = 0;
      
      // Buscar aplicação de bolsa do estudante
      const { data: applicationData, error: applicationError } = await supabase
        .from('scholarship_applications')
        .select(`
          id,
          is_application_fee_paid,
          is_scholarship_fee_paid,
          scholarships (
            application_fee_amount
          )
        `)
        .eq('student_id', profileId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (applicationError) {
        console.log('🔍 No scholarship application found, using fallback calculation');
      } else {
        console.log('🔍 Application data found:', applicationData);
        
        // Application Fee (variável - definida pela universidade)
        if (applicationData.is_application_fee_paid) {
          const appFeeAmount = applicationData.scholarships?.[0]?.application_fee_amount || 35000; // Default $350.00
          const appFeeUSD = Number(appFeeAmount) / 100; // Converter de centavos para dólares
          totalRevenue += appFeeUSD;
          console.log(`🔍 Application fee added: $${appFeeUSD}`);
        }
        
        // Scholarship Fee (fixa - $850)
        if (applicationData.is_scholarship_fee_paid) {
          totalRevenue += 850;
          console.log('🔍 Scholarship fee added: $850');
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

          // Buscar dados reais dos estudantes
          const { data: realStudentsData, error: realStudentsError } = await supabase
            .rpc('get_admin_students_analytics', { admin_user_id: userId });

          console.log('🔍 SQL students response:', { data: realStudentsData, error: realStudentsError });

          if (!realStudentsError && realStudentsData && realStudentsData.length > 0) {
            // Processar estudantes e calcular receita real
            const studentsWithRevenue = await Promise.all(
              realStudentsData.map(async (student: any) => {
                const realRevenue = await calculateStudentRevenue(student.student_id, student.profile_id);
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
                  total_paid: realRevenue, // Usar receita real calculada
                  created_at: student.created_at,
                  status: student.status
                };
              })
            );
            
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

          // Se ambas as funções SQL funcionaram e retornaram dados, não usar fallback
          if (!realSellersError && !realStudentsError && 
              realSellersData && realSellersData.length > 0 && 
              realStudentsData && realStudentsData.length > 0) {
            console.log('🔍 SQL functions successful, skipping fallback');
            console.log('🔍 Final state - Students loaded via SQL:', realStudentsData.length);
            console.log('🔍 Final state - Sellers loaded via SQL:', realSellersData.length);
            
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

      // Fallback para método antigo se userId não estiver disponível ou se as funções SQL falharem
      console.log('🔍 Using fallback method to load data directly from tables');

      // Buscar sellers ativos
      const { data: sellersData, error: sellersError } = await supabase
        .from('sellers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      console.log('🔍 Fallback sellers response:', { data: sellersData, error: sellersError });

      if (sellersError) {
        console.error('Error loading sellers:', sellersError);
        throw new Error(`Failed to load sellers: ${sellersError.message}`);
      }

      // Buscar estudantes que têm seller_referral_code preenchido
      const { data: studentsData, error: studentsError } = await supabase
        .from('user_profiles')
        .select('*')
        .not('seller_referral_code', 'is', null)
        .neq('seller_referral_code', '')
        .order('created_at', { ascending: false });

      // Buscar vendedores ativos para filtrar estudantes
      console.log('🔍 About to query sellers table with select: referral_code, id, name');
      const { data: activeSellersData, error: activeSellersError } = await supabase
        .from('sellers')
        .select('referral_code, id, name')
        .eq('is_active', true);

      console.log('🔍 Query completed. Data:', activeSellersData?.length, 'Error:', activeSellersError);
      
      if (activeSellersError) {
        console.error('❌ Error loading active sellers:', activeSellersError);
        console.error('❌ Full error object:', JSON.stringify(activeSellersError, null, 2));
        throw new Error(`Failed to load active sellers: ${activeSellersError.message}`);
      }

      // Criar conjunto de códigos de vendedores ativos
      const activeSellerCodes = new Set(activeSellersData?.map(s => s.referral_code) || []);

      if (studentsError) {
        console.error('Error loading students:', studentsError);
        throw new Error(`Failed to load students: ${studentsError.message}`);
      }

      // Processar estudantes com dados reais - filtrar apenas aqueles referenciados por vendedores ativos
      const processedStudents = await Promise.all(
        (studentsData || [])
          .filter((studentProfile: any) => {
            const isReferencedByActiveSeller = activeSellerCodes.has(studentProfile.seller_referral_code);
            if (!isReferencedByActiveSeller) {
              console.log(`⚠️ Filtering out student ${studentProfile.full_name} (${studentProfile.email}) - referenced by inactive seller with code: ${studentProfile.seller_referral_code}`);
            }
            return isReferencedByActiveSeller;
          })
          .map(async (studentProfile: any) => {
            // Calcular receita real para cada estudante
            const realRevenue = await calculateStudentRevenue(studentProfile.user_id, studentProfile.id);
            
            // Processando estudante
            return {
              id: studentProfile.id, // Usar o ID da tabela user_profiles
              profile_id: studentProfile.profile_id, // profile_id é o mesmo que id para user_profiles
              user_id: studentProfile.user_id,
              full_name: studentProfile.full_name || 'Name not available',
              email: studentProfile.email || 'Email not available',
              country: studentProfile.country || 'Country not available',
              referred_by_seller_id: null, // Será definido depois
              seller_name: 'Seller not available',
              seller_referral_code: studentProfile.seller_referral_code || '',
              referral_code_used: studentProfile.seller_referral_code || '',
              total_paid: realRevenue, // Usar receita real calculada
              created_at: studentProfile.created_at || new Date().toISOString(),
              status: studentProfile.status || 'active'
            };
          })
      );

      // Debug: verificar dados processados
      console.log('🔍 Students filtering results:', {
        totalStudents: studentsData?.length || 0,
        activeSellerCodes: activeSellerCodes.size,
        filteredStudents: processedStudents.length,
        filteredOut: (studentsData?.length || 0) - processedStudents.length
      });
      
      console.log('🔍 Processed Students Data:', processedStudents.map(s => ({
        name: s.full_name,
        profile_id: s.profile_id,
        total_paid: s.total_paid,
        seller_code: s.seller_referral_code
      })));

      // Processar vendedores com dados reais
      const processedSellers = (sellersData || []).map((seller: any) => {
        const sellerStudents = processedStudents.filter((student: any) => 
          student.referred_by_seller_id === seller.id
        );
        
        // Calcular receita real baseada nos pagamentos dos estudantes
        const actualRevenue = sellerStudents.reduce((sum, student) => sum + (student.total_paid || 0), 0);
        
        console.log(`🔍 Processing seller: ${seller.seller_name} with code: ${seller.referral_code}, found ${sellerStudents.length} students, actual revenue: ${actualRevenue}`);
        
        return {
          id: seller.id,
          name: seller.name || 'Name not available',
          email: seller.email || 'Email not available',
          referral_code: seller.referral_code || '',
          is_active: seller.is_active,
          created_at: seller.created_at || new Date().toISOString(),
          students_count: sellerStudents.length, // Usar contagem real dos estudantes
          total_revenue: actualRevenue // Usar receita real calculada
        };
      });

      // Atualizar nomes dos sellers nos estudantes
      processedStudents.forEach((student: any) => {
        const seller = processedSellers.find((s: any) => s.referral_code === student.seller_referral_code);
        if (seller) {
          student.seller_name = seller.name;
          student.referred_by_seller_id = seller.id; // Atualizar para usar o ID do seller
          console.log(`🔍 Student ${student.full_name} linked to seller ${seller.name} (${seller.id})`);
        } else {
          console.log(`⚠️ Student ${student.full_name} with code ${student.seller_referral_code} has no matching seller`);
        }
      });

      console.log('🔍 Final processed data:', {
        students: processedStudents.map((s: any) => ({
          name: s.full_name,
          profile_id: s.profile_id,
          sellerCode: s.seller_referral_code,
          sellerId: s.referred_by_seller_id,
          sellerName: s.seller_name
        })),
        sellers: processedSellers.map((s: any) => ({
          name: s.name,
          code: s.referral_code,
          id: s.id,
          studentsCount: s.students_count
        }))
      });

      console.log('🔍 Debug - Processed data:', {
        sellers: processedSellers.length,
        students: processedStudents.length,
        sellerCodes: processedSellers.map((s: any) => s.referral_code),
        studentSellerCodes: processedStudents.map((s: any) => s.seller_referral_code),
        sellerDetails: processedSellers.map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.referral_code,
          students: s.students_count
        })),
        studentDetails: processedStudents.map((s: any) => ({
          id: s.id,
          profile_id: s.profile_id,
          name: s.full_name,
          sellerCode: s.seller_referral_code,
          sellerName: s.seller_name
        }))
      });

      setSellers(processedSellers);
      setStudents(processedStudents);

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
