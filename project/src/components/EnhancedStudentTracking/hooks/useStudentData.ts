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
      console.warn('Could not load universities:', error);
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
          console.log('🔍 Attempting to load data using SQL functions for admin user:', userId);
          
          // Buscar dados reais usando função SQL com dependentes
          const { data: realSellersData, error: realSellersError } = await supabase
            .rpc('get_admin_sellers_analytics_with_dependents', { admin_user_id: userId });

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
              students_count: Number(seller.students_count) || 0,
              total_revenue: Number(seller.total_revenue) || 0
            }));
            
            console.log('🔍 Processed sellers from SQL:', processedSellers);
          } else {
            console.log('🔍 SQL sellers function failed or returned no data, will use fallback');
          }

          // Primeiro, buscar dados básicos com a função existente
          const { data: basicStudentsData, error: basicStudentsError } = await supabase
            .rpc('get_admin_students_analytics_with_dependents', { admin_user_id: userId });

          // Depois, buscar dados detalhados das aplicações
          const { data: detailedStudentsData, error: detailedStudentsError } = await supabase
            .rpc('get_admin_students_with_applications', { admin_user_id: userId });

          console.log('🔍 DETAILED STUDENTS RESPONSE:', { 
            data: detailedStudentsData?.length || 0, 
            error: detailedStudentsError?.message || 'No error',
            hasData: !detailedStudentsError && detailedStudentsData && detailedStudentsData.length > 0
          });

          // Priorizar dados detalhados com múltiplas aplicações
          let realStudentsData, realStudentsError;
          
          if (!detailedStudentsError && detailedStudentsData && detailedStudentsData.length > 0) {
            realStudentsData = detailedStudentsData;
            realStudentsError = detailedStudentsError;
            console.log('🔍 ✅ USING DETAILED STUDENTS DATA - Multiple applications enabled!');
          } else {
            realStudentsData = basicStudentsData;
            realStudentsError = basicStudentsError;
            console.log('🔍 ⚠️ FALLBACK TO BASIC STUDENTS DATA - No multiple applications', detailedStudentsError?.message);
          }

          if (!realStudentsError && realStudentsData && realStudentsData.length > 0) {
            // Sempre tentar processar como dados com múltiplas aplicações primeiro
            const hasApplicationData = realStudentsData.some((row: any) => row.application_id !== undefined);
            
            if (hasApplicationData) {
              // Processar dados com múltiplas aplicações
              console.log('🔍 PROCESSING MULTIPLE APPLICATIONS DATA');
              const studentsMap = new Map();
              
              realStudentsData.forEach((row: any) => {
              const studentId = row.student_id;
              console.log('🔍 PROCESSING ROW FOR STUDENT:', studentId, {
                student_name: row.student_name,
                student_email: row.student_email,
                application_id: row.application_id,
                scholarship_title: row.scholarship_title,
                university_name: row.university_name
              });
              
              if (!studentsMap.has(studentId)) {
                // Primeiro registro deste estudante
                studentsMap.set(studentId, {
                  id: studentId,
                  profile_id: row.profile_id,
                  user_id: studentId,
                  full_name: row.student_name,
                  email: row.student_email,
                  country: row.country,
                  referred_by_seller_id: row.referred_by_seller_id,
                  seller_name: row.seller_name,
                  seller_referral_code: row.seller_referral_code,
                  referral_code_used: row.referral_code_used,
                  total_paid: Number(row.total_paid) || 0,
                  created_at: row.created_at,
                  status: row.status,
                  has_paid_selection_process_fee: row.has_paid_selection_process_fee,
                  has_paid_i20_control_fee: row.has_paid_i20_control_fee,
                  // Dados da primeira aplicação (ou única)
                  scholarship_title: row.scholarship_title,
                  university_name: row.university_name,
                  university_id: row.university_id,
                  application_status: row.application_status,
                  is_scholarship_fee_paid: row.is_scholarship_fee_paid,
                  is_application_fee_paid: row.is_application_fee_paid,
                  // Arrays para múltiplas aplicações
                  allApplications: row.application_id ? [{
                    id: row.application_id,
                    application_id: row.application_id,
                    scholarship_id: row.scholarship_id,
                    scholarship_title: row.scholarship_title,
                    university_name: row.university_name,
                    university_id: row.university_id,
                    is_application_fee_paid: row.is_application_fee_paid,
                    is_scholarship_fee_paid: row.is_scholarship_fee_paid,
                    application_status: row.application_status
                  }] : [],
                  hasMultipleApplications: false,
                  applicationCount: row.application_id ? 1 : 0
                });
              } else {
                // Estudante já existe, adicionar nova aplicação
                const existingStudent = studentsMap.get(studentId);
                
                if (row.application_id) {
                  existingStudent.allApplications.push({
                    id: row.application_id,
                    application_id: row.application_id,
                    scholarship_id: row.scholarship_id,
                    scholarship_title: row.scholarship_title,
                    university_name: row.university_name,
                    university_id: row.university_id,
                    is_application_fee_paid: row.is_application_fee_paid,
                    is_scholarship_fee_paid: row.is_scholarship_fee_paid,
                    application_status: row.application_status
                  });
                  
                  existingStudent.applicationCount = existingStudent.allApplications.length;
                  existingStudent.hasMultipleApplications = existingStudent.applicationCount > 1;
                  
                  // Se tem múltiplas aplicações, mostrar "Multiple Universities" no título principal
                  if (existingStudent.hasMultipleApplications) {
                    existingStudent.university_name = 'Multiple Universities';
                    existingStudent.scholarship_title = 'Multiple Scholarships';
                  }
                  
                  // Atualizar flags de pagamento baseado em todas as aplicações
                  const hasAnyScholarshipPaid = existingStudent.allApplications.some((app: any) => app.is_scholarship_fee_paid);
                  const hasAnyApplicationPaid = existingStudent.allApplications.some((app: any) => app.is_application_fee_paid);
                  
                  existingStudent.is_scholarship_fee_paid = hasAnyScholarshipPaid;
                  existingStudent.is_application_fee_paid = hasAnyApplicationPaid;
                }
              }
            });
            
              processedStudents = Array.from(studentsMap.values());
              
              // Aplicar filtro: Se o estudante pagou application fee, mostrar apenas essa aplicação
              processedStudents = processedStudents.map((student: any) => {
                if (student.allApplications && student.allApplications.length > 1) {
                  // Verificar se há aplicação com application fee paga
                  const paidApplication = student.allApplications.find((app: any) => app.is_application_fee_paid);
                  
                  if (paidApplication) {
                    // Se encontrou aplicação paga, mostrar apenas ela
                    return {
                      ...student,
                      // Atualizar dados principais com a aplicação paga
                      scholarship_title: paidApplication.scholarship_title,
                      university_name: paidApplication.university_name,
                      university_id: paidApplication.university_id,
                      application_status: paidApplication.application_status,
                      is_scholarship_fee_paid: paidApplication.is_scholarship_fee_paid,
                      is_application_fee_paid: paidApplication.is_application_fee_paid,
                      // Manter apenas a aplicação paga
                      allApplications: [paidApplication],
                      hasMultipleApplications: false,
                      applicationCount: 1
                    };
                  }
                }
                
                // Se não há aplicação paga ou tem apenas uma, manter como está
                return student;
              });
              
              console.log('🔍 FINAL PROCESSED STUDENTS FROM MAP (after application fee filter):', processedStudents.length);
              processedStudents.forEach((student: any) => {
                console.log(`🔍 STUDENT ${student.email}:`, {
                  hasMultipleApplications: student.hasMultipleApplications,
                  applicationCount: student.applicationCount,
                  allApplications: student.allApplications?.length || 0,
                  university_name: student.university_name,
                  has_paid_application_fee: student.is_application_fee_paid
                });
              });
            } else {
              // Processar dados básicos (sem múltiplas aplicações)
              processedStudents = realStudentsData.map((student: any) => {
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
                  total_paid: Number(student.total_paid) || 0,
                  created_at: student.created_at,
                  status: student.status,
                  application_status: student.application_status,
                  scholarship_title: student.scholarship_title,
                  university_name: student.university_name,
                  university_id: student.university_id,
                  has_paid_selection_process_fee: student.has_paid_selection_process_fee,
                  has_paid_i20_control_fee: student.has_paid_i20_control_fee,
                  is_scholarship_fee_paid: student.is_scholarship_fee_paid,
                  is_application_fee_paid: student.is_application_fee_paid,
                  hasMultipleApplications: false,
                  applicationCount: 1,
                  allApplications: []
                };
              });
            }
            
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
