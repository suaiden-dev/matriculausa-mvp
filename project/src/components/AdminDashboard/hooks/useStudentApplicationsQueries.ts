import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  has_paid_i539_cos_package?: boolean;
  has_paid_ds160_package?: boolean;
  seller_referral_code: string | null;
  application_id: string | null;
  scholarship_id: string | null;
  university_id: string | null;
  status: string | null;
  application_status: string | null;
  applied_at: string | null;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  acceptance_letter_status: string | null;
  acceptance_letter_url: string | null;
  payment_status: string | null;
  student_process_type: string | null;
  transfer_form_status: string | null;
  scholarship_title: string | null;
  course_name?: string | null;
  university_name: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  placement_fee_flow?: boolean;
  is_placement_fee_paid?: boolean;
  is_locked: boolean;
  total_applications: number;
  all_applications: any[];
  most_recent_activity?: Date;
  has_paid_reinstatement_package?: boolean;
  visa_transfer_active?: boolean;
  is_archived: boolean;
  is_dropped: boolean;
  assigned_to_admin_id: string | null;
  assigned_to_admin_name: string | null;
  placement_fee_pending_balance: number;
  placement_fee_due_date: string | null;
  placement_fee_installment_number: number;
  placement_fee_installment_enabled: boolean;
  source?: string;
  has_uploaded_photo?: boolean;
  has_submitted_form?: boolean;
  documents_uploaded?: boolean;
  selected_scholarship_id?: string | null;
  // New stage fields
  has_sent_docs_to_university?: boolean;
  sevis_transfer_completed?: boolean;
  visa_approved?: boolean;
  // Doc aggregation (populated by useStudentDocsQuery)
  docs_total_required?: number;
  docs_total_uploaded?: number;
  docs_total_approved?: number;
  docs_total_rejected?: number;
  docs_total_under_review?: number;
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
          has_paid_i539_cos_package,
          has_paid_ds160_package,
          placement_fee_flow,
          is_placement_fee_paid,
          role,
          seller_referral_code,
          has_paid_reinstatement_package,
          visa_transfer_active,
          is_archived,
          is_dropped,
          assigned_to_admin_id,
          assigned_admin:user_profiles!assigned_to_admin_id(id, full_name),
          placement_fee_pending_balance,
          placement_fee_due_date,
          placement_fee_installment_number,
          placement_fee_installment_enabled,
          source,
          identity_photo_path,
          selection_survey_passed,
          documents_uploaded,
          field_of_interest,
          selected_scholarship_id,
          student_process_type,
          scholarship_applications!scholarship_applications_student_id_fkey (
              id,
              scholarship_id,
              status,
              applied_at,
              is_application_fee_paid,
              is_scholarship_fee_paid,
              acceptance_letter_status,
              acceptance_letter_url,
              payment_status,
              reviewed_at,
              reviewed_by,
              student_process_type,
              transfer_form_status,
              has_sent_docs_to_university,
              sevis_transfer_completed,
              visa_approved,
              documents,
              updated_at,
              scholarships (
                id,
                title,
                field_of_study,
                university_id,
                universities (
                  name
                )
              )
            )
          `)
          .eq('role', 'student')
          .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const formattedData = data?.map((student: any) => {
        // Cada estudante aparece apenas uma vez na tabela
        let scholarshipInfo = { title: null, university: null, course: null };
        let applicationStatus = null;
        
        let lockedApplication = null;
        
        if (student.scholarship_applications && student.scholarship_applications.length > 0) {
          // Priorizar aplicação que teve Application Fee pago, depois enrolled, depois approved, etc
          lockedApplication = student.scholarship_applications.find((app: any) => app.status === 'enrolled') ||
                             student.scholarship_applications.find((app: any) => app.is_application_fee_paid && app.acceptance_letter_url) ||
                             student.scholarship_applications.find((app: any) => app.is_application_fee_paid) ||
                             student.scholarship_applications.find((app: any) => app.status === 'approved') ||
                             student.scholarship_applications.find((app: any) => app.status === 'under_review') ||
                             student.scholarship_applications.find((app: any) => app.status !== 'rejected') ||
                             student.scholarship_applications[0];
          
          // Se há uma aplicação locked, mostrar informações dela no campo scholarship
          if (lockedApplication) {
            scholarshipInfo = {
              title: lockedApplication.scholarships?.title || 'N/A',
              university: lockedApplication.scholarships?.universities?.name || 'N/A',
              course: lockedApplication.scholarships?.field_of_study || student.field_of_interest || null
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

        // Calculate basic documents statistics (passport, diploma, funds_proof)
        let basicDocsRequired = 3; // Basic docs are always 3 (passport, diploma, funds_proof)
        let basicDocsUploaded = 0;
        let basicDocsApproved = 0;
        let basicDocsRejected = 0;
        let basicDocsUnderReview = 0;

        if (lockedApplication?.documents && Array.isArray(lockedApplication.documents)) {
          const requiredBasicTypes = ['passport', 'diploma', 'funds_proof'];
          const latestStatusMap = new Map<string, string>();
          
          lockedApplication.documents.forEach((doc: any) => {
            if (doc.type && requiredBasicTypes.includes(doc.type.toLowerCase())) {
              // Simplistic deduction: Since they are in the array, they are uploaded
              latestStatusMap.set(doc.type.toLowerCase(), (doc.status || 'pending').toLowerCase());
            }
          });
          
          basicDocsUploaded = latestStatusMap.size;
          latestStatusMap.forEach(status => {
            if (status === 'approved') basicDocsApproved++;
            else if (status === 'rejected') basicDocsRejected++;
            else if (status === 'under_review') basicDocsUnderReview++;
          });
        }

        return {
          student_id: student.id,
          user_id: student.user_id,
          student_name: student.full_name || 'N/A',
          student_email: student.email || 'N/A',
          student_created_at: student.created_at,
          has_paid_selection_process_fee: student.has_paid_selection_process_fee || false,
          has_paid_i20_control_fee: student.has_paid_i20_control_fee || false,
          has_paid_i539_cos_package: student.has_paid_i539_cos_package || false,
          has_paid_ds160_package: student.has_paid_ds160_package || false,
          placement_fee_flow: student.placement_fee_flow || false,
          is_placement_fee_paid: student.is_placement_fee_paid || false,
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
          acceptance_letter_url: lockedApplication?.acceptance_letter_url || null,
          payment_status: lockedApplication?.payment_status || null,
          student_process_type: lockedApplication?.student_process_type || student.student_process_type || null,
          transfer_form_status: lockedApplication?.transfer_form_status || null,
          has_sent_docs_to_university: lockedApplication?.has_sent_docs_to_university || false,
          sevis_transfer_completed: lockedApplication?.sevis_transfer_completed || false,
          visa_approved: lockedApplication?.visa_approved || false,
          scholarship_title: scholarshipInfo ? scholarshipInfo.title : null,
          course_name: scholarshipInfo ? scholarshipInfo.course : student.field_of_interest || null,
          university_name: scholarshipInfo ? scholarshipInfo.university : null,
          university_id: lockedApplication?.scholarships?.university_id || null,
          reviewed_at: lockedApplication?.reviewed_at || null,
          reviewed_by: lockedApplication?.reviewed_by || null,
          is_locked: !!lockedApplication,
          total_applications: student.scholarship_applications ? student.scholarship_applications.length : 0,
          // Guardar todas as aplicações para o modal
          all_applications: student.scholarship_applications || [],
          // Campo para ordenação por atividade recente
          most_recent_activity: mostRecentActivity,
          has_paid_reinstatement_package: student.has_paid_reinstatement_package || false,
          visa_transfer_active: student.visa_transfer_active ?? true, // Default to true if not set
          is_archived: student.is_archived || false,
          is_dropped: student.is_dropped || false,
          assigned_to_admin_id: student.assigned_to_admin_id || null,
          assigned_to_admin_name: (student.assigned_admin as any)?.full_name || null,
          placement_fee_pending_balance: student.placement_fee_pending_balance ?? 0,
          placement_fee_due_date: student.placement_fee_due_date || null,
          placement_fee_installment_number: student.placement_fee_installment_number ?? 0,
          placement_fee_installment_enabled: student.placement_fee_installment_enabled ?? false,
          source: student.source,
          has_uploaded_photo: !!student.identity_photo_path,
          has_submitted_form: student.selection_survey_passed === true,
          documents_uploaded: student.documents_uploaded || false,
          selected_scholarship_id: student.selected_scholarship_id || null,
          basic_docs_total_required: basicDocsRequired,
          basic_docs_total_uploaded: basicDocsUploaded,
          basic_docs_total_approved: basicDocsApproved,
          basic_docs_total_rejected: basicDocsRejected,
          basic_docs_total_under_review: basicDocsUnderReview,
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

      // Carregar admins internos (Raíssa, Romeu, Luiz etc.)
      const { data: internalAdminsData } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .eq('role', 'admin')
        .order('full_name', { ascending: true });

      return {
        affiliates: affiliates || [],
        scholarships: scholarshipsData || [],
        universities: universitiesData || [],
        internalAdmins: (internalAdminsData || []).map((a: any) => ({
          id: a.id,
          name: a.full_name || a.email,
          email: a.email,
        })),
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - dados de filtro mudam ocasionalmente
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Mutation para marcar/desmarcar aluno como dropped
 */
export function useDropStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, isDropped }: { studentId: string; isDropped: boolean }) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_dropped: isDropped })
        .eq('id', studentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
    },
  });
}

/**
 * Mutation para marcar que docs foram enviados para a universidade (Stage 3)
 */
export function useMarkSentDocsToUniversityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from('scholarship_applications')
        .update({ has_sent_docs_to_university: true })
        .eq('id', applicationId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.students.all }),
  });
}

/**
 * Mutation para marcar SEVIS transfer como concluído (Stage 7)
 */
export function useMarkSevisCompletedMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from('scholarship_applications')
        .update({ sevis_transfer_completed: true })
        .eq('id', applicationId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.students.all }),
  });
}

/**
 * Mutation para marcar visto como aprovado (Stage 8)
 */
export function useMarkVisaApprovedMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from('scholarship_applications')
        .update({ visa_approved: true })
        .eq('id', applicationId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.students.all }),
  });
}

/**
 * Mutations para aprovar/rejeitar transfer form devolvido pelo aluno
 */
export function useApproveTransferFormMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from('scholarship_applications')
        .update({ transfer_form_status: 'approved' })
        .eq('id', applicationId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.students.all }),
  });
}

export function useRejectTransferFormMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from('scholarship_applications')
        .update({ transfer_form_status: 'sent' })
        .eq('id', applicationId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.students.all }),
  });
}

export interface DocStats {
  docs_total_required: number;
  docs_total_uploaded: number;
  docs_total_approved: number;
  docs_total_rejected: number;
  docs_total_under_review: number;
}

/**
 * Query que agrega stats de documentos por aluno.
 * uploaded_by = user_profiles.user_id (auth UUID)
 */
export function useStudentDocsStats(students: StudentRecord[]) {
  return useQuery({
    queryKey: ['student-docs-stats'],
    queryFn: async (): Promise<Map<string, DocStats>> => {
      const appIds = students.map(s => s.application_id).filter(Boolean) as string[];

      const [{ data: globalDocs, error: drError }, { data: appDocs, error: appDrError }, { data: uploads, error: upError }] = await Promise.all([
        supabase
          .from('document_requests')
          .select('id, university_id, applicable_student_types, scholarship_application_id')
          .eq('is_global', true)
          .eq('status', 'open'),
        appIds.length > 0
          ? supabase
              .from('document_requests')
              .select('id, university_id, applicable_student_types, scholarship_application_id')
              .in('scholarship_application_id', appIds)
              .eq('status', 'open')
          : Promise.resolve({ data: [] as any[], error: null }),
        supabase
          .from('document_request_uploads')
          .select('document_request_id, uploaded_by, status, uploaded_at'),
      ]);

      if (drError) throw drError;
      if (appDrError) throw appDrError;
      if (upError) throw upError;

      // Merge global + app-specific docs, deduplicating by id
      const allDocsMap = new Map<string, any>();
      for (const d of [...(globalDocs || []), ...(appDocs || [])]) {
        allDocsMap.set(d.id, d);
      }

      // Latest upload per (doc_request_id, uploaded_by)
      const latestUpload = new Map<string, string>();
      const sorted = [...(uploads || [])].sort(
        (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      );
      for (const u of sorted) {
        const key = `${u.document_request_id}:${u.uploaded_by}`;
        if (!latestUpload.has(key)) latestUpload.set(key, u.status);
      }

      const result = new Map<string, DocStats>();

      for (const student of students) {
        if (!student.user_id) continue;

        const processType = student.student_process_type;
        const requiredDocs = Array.from(allDocsMap.values()).filter(dr => {
          // App-specific doc linked to this student's application
          if (dr.scholarship_application_id) {
            return dr.scholarship_application_id === student.application_id;
          }
          // Global doc for this student's university and process type
          if (dr.university_id && dr.university_id !== student.university_id) return false;
          const types: string[] = dr.applicable_student_types || [];
          return types.includes('all') || (processType ? types.includes(processType) : false);
        });

        let uploaded = 0, approved = 0, rejected = 0, underReview = 0;
        for (const dr of requiredDocs) {
          const status = latestUpload.get(`${dr.id}:${student.user_id}`);
          if (status) {
            uploaded++;
            if (status === 'approved') approved++;
            else if (status === 'rejected') rejected++;
            else if (status === 'under_review') underReview++;
          }
        }

        result.set(student.student_id, {
          docs_total_required: requiredDocs.length,
          docs_total_uploaded: uploaded,
          docs_total_approved: approved,
          docs_total_rejected: rejected,
          docs_total_under_review: underReview,
        });
      }

      return result;
    },
    enabled: students.length > 0,
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Mutation para atribuir (ou remover) um admin responsável de um aluno
 */
export function useAssignAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, adminId }: { studentId: string; adminId: string | null }) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ assigned_to_admin_id: adminId })
        .eq('id', studentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
    },
  });
}
