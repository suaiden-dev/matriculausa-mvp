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
          
          // Primeiro, buscar o ID do affiliate admin baseado no user_id
          const { data: affiliateAdminData, error: affiliateAdminError } = await supabase
            .from('affiliate_admins')
            .select('id')
            .eq('user_id', userId)
            .single();

          if (affiliateAdminError || !affiliateAdminData) {
            throw new Error('User is not an affiliate admin');
          }

          const affiliateAdminId = affiliateAdminData.id;
          
          // Buscar dados reais usando função SQL com dependentes
          // A função espera o user_id do affiliate admin, não o affiliate_admin_id
          const { data: realSellersData, error: realSellersError } = await supabase
            .rpc('get_admin_sellers_analytics_with_dependents', { admin_user_id: userId });


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
            
          } else {
          }

          // Usar apenas a função que existe e foi atualizada
          const { data: basicStudentsData, error: basicStudentsError } = await supabase
            .rpc('get_admin_students_analytics', { admin_user_id: userId });


          // Para compatibilidade, usar os mesmos dados
          const detailedStudentsData = basicStudentsData;
          const detailedStudentsError = basicStudentsError;


          // Priorizar dados detalhados com múltiplas aplicações
          let realStudentsData, realStudentsError;
          
          if (!detailedStudentsError && detailedStudentsData && detailedStudentsData.length > 0) {
            realStudentsData = detailedStudentsData;
            realStudentsError = detailedStudentsError;
          } else {
            realStudentsData = basicStudentsData;
            realStudentsError = basicStudentsError;
          }

          if (!realStudentsError && realStudentsData && realStudentsData.length > 0) {
            // Sempre tentar processar como dados com múltiplas aplicações primeiro
            const hasApplicationData = realStudentsData.some((row: any) => row.application_id !== undefined);
            
            if (hasApplicationData) {
              // Processar dados com múltiplas aplicações
              const studentsMap = new Map();
              
              realStudentsData.forEach((row: any) => {
              const studentId = row.student_id;
              
              if (!studentsMap.has(studentId)) {
                // Primeiro registro deste estudante
                // NOTA: A função SQL retorna up.user_id as student_id, então row.student_id é o user_id real
                studentsMap.set(studentId, {
                  id: studentId,
                  profile_id: row.profile_id,
                  user_id: row.student_id, // student_id da função SQL é o user_id real (up.user_id as student_id)
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
                  system_type: row.system_type || 'legacy',
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
              
            } else {
              // Processar dados básicos (sem múltiplas aplicações)
              // NOTA: A função SQL retorna up.user_id as student_id, então student.student_id é o user_id real
              processedStudents = realStudentsData.map((student: any) => {
                const studentData = {
                  id: student.student_id,
                  profile_id: student.profile_id,
                  user_id: student.student_id, // student_id da função SQL é na verdade o user_id real
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
                  system_type: student.system_type || 'legacy',
                  hasMultipleApplications: false,
                  applicationCount: 1,
                  allApplications: []
                };
                
                
                return studentData;
              });
            }
            
            
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
          console.warn('🔍 SQL functions exception, using fallback:', error);
        }
      }

      // Se chegou aqui, as funções SQL falharam - usar query direta como fallback
      
      // Buscar sellers diretamente
      const { data: sellersData, error: sellersError } = await supabase
        .from('sellers')
        .select(`
          id,
          name,
          email,
          referral_code,
          is_active,
          created_at,
          user_id
        `)
        .eq('user_id', userId);

      if (!sellersError && sellersData) {
        const processedSellers = sellersData.map((seller: any) => ({
          id: seller.id,
          name: seller.name,
          email: seller.email,
          phone: '', // Campo obrigatório
          territory: '', // Campo obrigatório
          referral_code: seller.referral_code,
          is_active: seller.is_active,
          created_at: seller.created_at,
          students: [], // Campo obrigatório
          students_count: 0,
          total_revenue: 0,
          total_students: 0 // Campo obrigatório
        }));
        setSellers(processedSellers);

        // Buscar estudantes dos sellers
        const sellerCodes = sellersData.map((s: any) => s.referral_code);
        if (sellerCodes.length > 0) {
          const { data: studentsData, error: studentsError } = await supabase
            .from('user_profiles')
            .select(`
              id,
              user_id,
              full_name,
              email,
              country,
              created_at,
              seller_referral_code,
              has_paid_selection_process_fee,
              has_paid_i20_control_fee,
              system_type,
              scholarship_applications (
                id,
                is_scholarship_fee_paid,
                scholarships (
                  title,
                  universities (
                    name
                  )
                )
              )
            `)
            .in('seller_referral_code', sellerCodes)
            .eq('role', 'student');

          if (!studentsError && studentsData) {
            const processedStudents = studentsData.map((profile: any) => {
              const referringSeller = sellersData.find((s: any) => s.referral_code === profile.seller_referral_code);
              const scholarshipApp = profile.scholarship_applications?.[0];
              
              const studentData = {
                id: profile.id,
                profile_id: profile.id,
                user_id: profile.user_id,
                full_name: profile.full_name,
                email: profile.email,
                country: profile.country,
                referred_by_seller_id: referringSeller?.id,
                seller_name: referringSeller?.name,
                seller_referral_code: profile.seller_referral_code,
                total_paid: 0, // Será calculado pelo componente
                created_at: profile.created_at,
                status: 'active',
                has_paid_selection_process_fee: profile.has_paid_selection_process_fee,
                has_paid_i20_control_fee: profile.has_paid_i20_control_fee,
                is_scholarship_fee_paid: scholarshipApp?.is_scholarship_fee_paid || false,
                scholarship_title: scholarshipApp?.scholarships?.title,
                university_name: scholarshipApp?.scholarships?.universities?.name,
                system_type: profile.system_type,
                // Campos obrigatórios com valores padrão
                phone: '',
                field_of_interest: '',
                academic_level: '',
                gpa: 0,
                english_proficiency: '',
                registration_date: profile.created_at,
                current_status: 'active',
                total_fees_paid: 0,
                fees_count: 0,
                selected_scholarship_id: null,
                documents_status: 'pending',
                is_application_fee_paid: false,
                student_process_type: '',
                application_status: 'Not specified',
                documents: []
              };
              
              // Debug para jolie8862@uorak.com
              if (profile.email === 'jolie8862@uorak.com') {
                console.log('🔍 [useStudentData] jolie8862@uorak.com data:', {
                  system_type: profile.system_type,
                  studentData: studentData
                });
              }
              
              return studentData;
            });
            
            // Debug: verificar quantos estudantes foram carregados
            
            setStudents(processedStudents);
          }
        }
      }
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
