import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/queryKeys';

interface StudentRecord {
  student_id: string;
  user_id: string;
  student_name: string;
  student_email: string;
  student_created_at: string;
  has_paid_selection_process_fee: boolean;
  has_paid_i20_control_fee: boolean;
  seller_referral_code: string | null;
  application_id: string | null;
  scholarship_id: string | null;
  status: string | null;
  application_status: string | null;
  applied_at: string | null;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  acceptance_letter_status: string | null;
  payment_status: string | null;
  student_process_type: string | null;
  transfer_form_status: string | null;
  scholarship_title: string | null;
  university_name: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  is_locked: boolean;
  total_applications: number;
  all_applications: any[];
  most_recent_activity?: Date;
}

/**
 * Hook para buscar lista de estudantes com suas aplicações
 */
export function useStudentsQuery() {
  return useQuery({
    queryKey: queryKeys.students.list(),
    queryFn: async (): Promise<StudentRecord[]> => {
      // Buscar estudantes com informações de atividade recente
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          user_id,
          full_name,
          email,
          created_at,
          updated_at,
          has_paid_selection_process_fee,
          has_paid_i20_control_fee,
          role,
          seller_referral_code,
          scholarship_applications (
            id,
            scholarship_id,
            status,
            applied_at,
            is_application_fee_paid,
            is_scholarship_fee_paid,
            acceptance_letter_status,
            payment_status,
            reviewed_at,
            reviewed_by,
            student_process_type,
            transfer_form_status,
            documents,
            updated_at,
            scholarships (
              title,
              universities (
                name
              )
            )
          )
        `)
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((student: any) => {
        // Cada estudante aparece apenas uma vez na tabela
        let scholarshipInfo = null;
        let applicationStatus = null;
        
        let lockedApplication = null;
        
        if (student.scholarship_applications && student.scholarship_applications.length > 0) {
          // Priorizar aplicação que teve Application Fee pago, depois enrolled, depois approved
          lockedApplication = student.scholarship_applications.find((app: any) => app.is_application_fee_paid) ||
                             student.scholarship_applications.find((app: any) => app.status === 'enrolled') ||
                             student.scholarship_applications.find((app: any) => app.status === 'approved');
          
          // Se há uma aplicação locked, mostrar informações dela no campo scholarship
          if (lockedApplication) {
            scholarshipInfo = {
              title: lockedApplication.scholarships?.title || 'N/A',
              university: lockedApplication.scholarships?.universities?.name || 'N/A'
            };
            applicationStatus = lockedApplication.status;
          }
        }

        // Calcular a data de atividade mais recente
        const getMostRecentActivity = () => {
          const activities = [];
          
          // Data de atualização do perfil
          if (student.updated_at) {
            activities.push(new Date(student.updated_at));
          }
          
          // Datas das aplicações
          if (student.scholarship_applications) {
            student.scholarship_applications.forEach((app: any) => {
              if (app.applied_at) activities.push(new Date(app.applied_at));
              if (app.updated_at) activities.push(new Date(app.updated_at));
              if (app.reviewed_at) activities.push(new Date(app.reviewed_at));
            });
          }
          
          // Retornar a data mais recente ou a data de criação se não houver atividades
          return activities.length > 0 ? new Date(Math.max(...activities.map(d => d.getTime()))) : new Date(student.created_at);
        };

        const mostRecentActivity = getMostRecentActivity();

        return {
          student_id: student.id,
          user_id: student.user_id,
          student_name: student.full_name || 'N/A',
          student_email: student.email || 'N/A',
          student_created_at: student.created_at,
          has_paid_selection_process_fee: student.has_paid_selection_process_fee || false,
          has_paid_i20_control_fee: student.has_paid_i20_control_fee || false,
          seller_referral_code: student.seller_referral_code || null,
          // Dados da aplicação só aparecem se locked
          application_id: lockedApplication?.id || null,
          scholarship_id: lockedApplication?.scholarship_id || null,
          status: applicationStatus,
          application_status: applicationStatus,
          applied_at: lockedApplication?.applied_at || null,
          is_application_fee_paid: lockedApplication?.is_application_fee_paid || false,
          is_scholarship_fee_paid: lockedApplication?.is_scholarship_fee_paid || false,
          acceptance_letter_status: lockedApplication?.acceptance_letter_status || null,
          payment_status: lockedApplication?.payment_status || null,
          student_process_type: lockedApplication?.student_process_type || null,
          transfer_form_status: lockedApplication?.transfer_form_status || null,
          scholarship_title: scholarshipInfo ? scholarshipInfo.title : null,
          university_name: scholarshipInfo ? scholarshipInfo.university : null,
          reviewed_at: lockedApplication?.reviewed_at || null,
          reviewed_by: lockedApplication?.reviewed_by || null,
          is_locked: !!lockedApplication,
          total_applications: student.scholarship_applications ? student.scholarship_applications.length : 0,
          // Guardar todas as aplicações para o modal
          all_applications: student.scholarship_applications || [],
          // Campo para ordenação por atividade recente
          most_recent_activity: mostRecentActivity
        };
      }) || [];

      // Ordenar por atividade recente (mais recente primeiro)
      formattedData.sort((a, b) => {
        const dateA = a.most_recent_activity || new Date(a.student_created_at);
        const dateB = b.most_recent_activity || new Date(b.student_created_at);
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

      return formattedData;
    },
    staleTime: 30 * 1000, // 30 segundos - dados dinâmicos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar dados de filtro (affiliates, scholarships, universities)
 */
export function useFilterDataQuery() {
  return useQuery({
    queryKey: queryKeys.students.filterData,
    queryFn: async () => {
      // Buscar usuários com role affiliate_admin
      const { data: affiliateAdminsData, error: affiliateAdminsError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email')
        .eq('role', 'affiliate_admin')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      let affiliates: any[] = [];
      if (!affiliateAdminsError && affiliateAdminsData) {
        // Para cada affiliate admin, buscar os sellers associados
        const affiliatesWithSellers = await Promise.all(
          affiliateAdminsData.map(async (admin) => {
            // Primeiro buscar o affiliate_admin_id na tabela affiliate_admins
            const { data: affiliateAdminData } = await supabase
              .from('affiliate_admins')
              .select('id')
              .eq('user_id', admin.user_id)
              .single();
            
            let sellers: any[] = [];
            if (affiliateAdminData) {
              // Buscar sellers que pertencem a este affiliate admin
              const { data: sellersData } = await supabase
                .from('sellers')
                .select('id, referral_code, name, email')
                .eq('affiliate_admin_id', affiliateAdminData.id)
                .eq('is_active', true);
              
              sellers = sellersData || [];
            }
            
            // Se não encontrar sellers diretos, buscar por email
            if (sellers.length === 0) {
              const { data: sellersByEmail } = await supabase
                .from('sellers')
                .select('id, referral_code, name, email')
                .eq('email', admin.email)
                .eq('is_active', true);
              sellers = sellersByEmail || [];
            }
            
            return {
              id: admin.user_id,
              user_id: admin.user_id,
              name: admin.full_name || admin.email,
              email: admin.email,
              referral_code: sellers[0]?.referral_code || null,
              sellers: sellers
            };
          })
        );
        
        affiliates = affiliatesWithSellers;
      }

      // Carregar scholarships
      const { data: scholarshipsData } = await supabase
        .from('scholarships')
        .select('id, title, universities!inner(name)')
        .eq('is_active', true)
        .order('title', { ascending: true });
      
      // Carregar universities
      const { data: universitiesData } = await supabase
        .from('universities')
        .select('id, name')
        .eq('is_approved', true)
        .order('name', { ascending: true });

      return {
        affiliates: affiliates || [],
        scholarships: scholarshipsData || [],
        universities: universitiesData || [],
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - dados de filtro mudam ocasionalmente
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

