import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { queryKeys } from "../../../lib/queryKeys";

export interface StudentRecord {
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
  system_type?: string | null;
  is_locked: boolean;
  total_applications: number;
  all_applications: any[];
  application_fee_amount?: number | null;
  scholarship_fee_amount?: number | null;
  most_recent_activity?: Date;
  has_paid_reinstatement_package?: boolean;
  visa_transfer_active?: boolean;
  is_archived: boolean;
  is_dropped: boolean;
  placement_fee_pending_balance: number;
  placement_fee_amount?: number | null;
  fee_override_placement_fee?: number | null;
  fee_override_i20_fee?: number | null;
  fee_override_selection_process_fee?: number | null;
  placement_fee_due_date: string | null;
  placement_fee_installment_number: number;
  placement_fee_installment_enabled: boolean;
  placement_fee_total_installments: number | null;
  source?: string;
  has_uploaded_photo?: boolean;
  has_submitted_form?: boolean;
  documents_uploaded?: boolean;
  selected_scholarship_id?: string | null;
  agency_name?: string | null;
  agency_email?: string | null;
  // New stage fields
  has_sent_docs_to_university?: boolean;
  sevis_transfer_completed?: boolean;
  visa_approved?: boolean;
  scholarship_level?: string | null;
  // Doc aggregation (populated by useStudentDocsQuery)
  docs_total_required?: number;
  docs_total_uploaded?: number;
  docs_total_approved?: number;
  docs_total_rejected?: number;
  docs_total_rejected_files?: number;
  docs_total_under_review?: number;
  docs_approved_names?: string[];
  docs_rejected_names?: string[];
  docs_under_review_names?: string[];
  basic_docs_total_required?: number;
  basic_docs_total_uploaded?: number;
  basic_docs_total_approved?: number;
  basic_docs_total_rejected?: number;
  basic_docs_total_under_review?: number;
  basic_docs_approved_names?: string[];
  basic_docs_rejected_names?: string[];
  basic_docs_under_review_names?: string[];
  package_fee_installment?: {
    fee_type: 'ds160_package' | 'i539_cos_package';
    installments_paid: number;
    total_installments: number;
    amount_paid: number;
    total_amount: number;
    last_payment_date: string | null;
  } | null;
}

/**
 * Hook para buscar lista de estudantes com suas aplicações
 */
export function useStudentsQuery() {
  return useQuery({
    queryKey: queryKeys.students.list(),
    queryFn: async (): Promise<StudentRecord[]> => {
      // Buscar estudantes com informações de atividade recente em paralelo com dados de agência/vendedor
      const [
        studentsResult,
        sellersResult,
        affiliateAdminsResult,
        affiliateProfilesResult,
      ] = await Promise.all([
        supabase
          .from("user_profiles")
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
            is_application_fee_paid,
            role,
            system_type,
            seller_referral_code,
            has_paid_reinstatement_package,
            visa_transfer_active,
            is_archived,
            is_dropped,
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
                  level,
                  placement_fee_amount,
                  application_fee_amount,
                  scholarship_fee_amount,
                  universities (
                    name
                  )
                )
              )
            `)
          .eq("role", "student")
          .order("created_at", { ascending: false }),
        supabase
          .from("sellers")
          .select("referral_code, affiliate_admin_id")
          .eq("is_active", true),
        supabase
          .from("affiliate_admins")
          .select("id, company_name, legal_name, user_id")
          .eq("is_active", true),
        supabase
          .from("user_profiles")
          .select("user_id, full_name, company_name, email")
          .eq("role", "affiliate_admin"),
      ]);

      if (studentsResult.error) {
        throw studentsResult.error;
      }

      const data = studentsResult.data;
      const sellersData = sellersResult.data || [];
      const affiliateAdminsData = affiliateAdminsResult.data || [];
      const affiliateProfiles = affiliateProfilesResult.data || [];

      // Mapear administradores de agência para nome exibível e e-mail
      const adminNamesMap = new Map<string, string>(
        affiliateProfiles.map((p: any) => [p.user_id, p.full_name] as [string, string])
      );
      const adminCompanyMap = new Map<string, string>(
        affiliateProfiles
          .filter((p: any) => p.company_name)
          .map((p: any) => [p.user_id, p.company_name] as [string, string])
      );
      const adminEmailsMap = new Map<string, string>(
        affiliateProfiles.map((p: any) => [p.user_id, p.email] as [string, string])
      );
      const agencyMap = new Map<string, string>();
      const agencyEmailMap = new Map<string, string>();
      affiliateAdminsData.forEach((aa: any) => {
        const name = aa.company_name || aa.legal_name ||
          adminCompanyMap.get(aa.user_id) || adminNamesMap.get(aa.user_id) || "Agência";
        agencyMap.set(aa.id, name);
        
        const email = adminEmailsMap.get(aa.user_id) || "";
        if (email) {
          agencyEmailMap.set(aa.id, email);
        }
      });

      // Mapear código de indicação do vendedor para o nome da agência e e-mail do admin
      const referralCodeToAgencyMap = new Map<string, string>();
      const referralCodeToAgencyEmailMap = new Map<string, string>();
      sellersData.forEach((s: any) => {
        if (s.referral_code && s.affiliate_admin_id) {
          const agencyName = agencyMap.get(s.affiliate_admin_id);
          if (agencyName) {
            referralCodeToAgencyMap.set(s.referral_code, agencyName);
          }
          const agencyEmail = agencyEmailMap.get(s.affiliate_admin_id);
          if (agencyEmail) {
            referralCodeToAgencyEmailMap.set(s.referral_code, agencyEmail);
          }
        }
      });

      // Batch fetch fee overrides for all students
      const userIds = data?.map((s: any) => s.user_id).filter(Boolean) || [];
      const feeOverridesMap: Record<string, any> = {};
      const placementPlanMap: Record<string, number> = {};
      const packagePlanMap: Record<string, StudentRecord['package_fee_installment']> = {};
      if (userIds.length > 0) {
        const { data: overridesData } = await supabase
          .from("user_fee_overrides")
          .select(
            "user_id, placement_fee, i20_control_fee, selection_process_fee",
          )
          .in("user_id", userIds);
        if (overridesData) {
          overridesData.forEach((o: any) => {
            feeOverridesMap[o.user_id] = o;
          });
        }

        const { data: plansData } = await supabase
          .from("fee_installment_plans")
          .select("user_id, total_installments")
          .eq("fee_type", "placement_fee")
          .in("user_id", userIds);
        if (plansData) {
          plansData.forEach((p: any) => {
            placementPlanMap[p.user_id] = p.total_installments;
          });
        }

        const { data: packagePlansData } = await supabase
          .from("fee_installment_plans")
          .select("user_id, fee_type, installments_paid, total_installments, amount_paid, total_amount, individual_fee_payments(payment_date)")
          .in("fee_type", ["ds160_package", "i539_cos_package"])
          .eq("status", "active")
          .gt("amount_paid", 0)
          .in("user_id", userIds);
        if (packagePlansData) {
          packagePlansData.forEach((p: any) => {
            if ((p.installments_paid ?? 0) < (p.total_installments ?? 1)) {
              const payments: { payment_date: string }[] = p.individual_fee_payments || [];
              const lastTs = payments.length > 0
                ? Math.max(...payments.map((pay: any) => new Date(pay.payment_date).getTime()))
                : null;
              packagePlanMap[p.user_id] = {
                fee_type: p.fee_type,
                installments_paid: p.installments_paid ?? 0,
                total_installments: p.total_installments ?? 2,
                amount_paid: Number(p.amount_paid ?? 0),
                total_amount: Number(p.total_amount ?? 0),
                last_payment_date: lastTs ? new Date(lastTs).toISOString() : null,
              };
            }
          });
        }
      }

      const formattedData = data?.map((student: any) => {
        // Cada estudante aparece apenas uma vez na tabela
        let scholarshipInfo = { title: null, university: null, course: null };
        let applicationStatus = null;

        let lockedApplication = null;

        if (
          student.scholarship_applications &&
          student.scholarship_applications.length > 0
        ) {
          // Priorizar aplicação que teve Application Fee pago, depois enrolled, depois approved, etc
          lockedApplication =
            student.scholarship_applications.find((app: any) =>
              app.status === "enrolled"
            ) ||
            student.scholarship_applications.find((app: any) =>
              app.is_application_fee_paid && app.acceptance_letter_url
            ) ||
            student.scholarship_applications.find((app: any) =>
              app.is_application_fee_paid
            ) ||
            student.scholarship_applications.find((app: any) =>
              app.status === "approved"
            ) ||
            student.scholarship_applications.find((app: any) =>
              app.status === "under_review"
            ) ||
            student.scholarship_applications.find((app: any) =>
              app.status !== "rejected"
            ) ||
            student.scholarship_applications[0];

          // Se há uma aplicação locked, mostrar informações dela no campo scholarship
          if (lockedApplication) {
            scholarshipInfo = {
              title: lockedApplication.scholarships?.title || "N/A",
              university: lockedApplication.scholarships?.universities?.name ||
                "N/A",
              course: lockedApplication.scholarships?.field_of_study ||
                student.field_of_interest || null,
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
          return activities.length > 0
            ? new Date(Math.max(...activities.map((d) => d.getTime())))
            : new Date(student.created_at);
        };

        const mostRecentActivity = getMostRecentActivity();

        // Calculate basic documents statistics
        // Old flow: 3 docs (passport + diploma + funds_proof)
        // New flow: 1 doc (passport only)
        // Detection: if student has diploma or funds_proof uploaded → old flow
        const typeLabels: Record<string, string> = {
          "passport": "Passport",
          "diploma": "Diploma",
          "funds_proof": "Proof of Funds",
        };

        const allDocTypes = (lockedApplication?.documents || []).map((d: any) =>
          d.type?.toLowerCase()
        ).filter(Boolean);
        const isOldFlow = allDocTypes.includes("diploma") ||
          allDocTypes.includes("funds_proof");
        const requiredBasicTypes = isOldFlow
          ? ["passport", "diploma", "funds_proof"]
          : ["passport"];

        const basicDocsRequired = requiredBasicTypes.length;
        let basicDocsUploaded = 0;
        let basicDocsApproved = 0;
        let basicDocsRejected = 0;
        let basicDocsUnderReview = 0;
        const basicApprovedNames: string[] = [];
        const basicRejectedNames: string[] = [];
        const basicUnderReviewNames: string[] = [];

        if (
          lockedApplication?.documents &&
          Array.isArray(lockedApplication.documents)
        ) {
          const latestStatusMap = new Map<string, string>();

          lockedApplication.documents.forEach((doc: any) => {
            const type = doc.type?.toLowerCase();
            if (type && requiredBasicTypes.includes(type)) {
              latestStatusMap.set(
                type,
                (doc.status || "pending").toLowerCase(),
              );
            }
          });

          basicDocsUploaded = latestStatusMap.size;
          latestStatusMap.forEach((status, type) => {
            const label = typeLabels[type] || type;
            if (status === "approved") {
              basicDocsApproved++;
              basicApprovedNames.push(label);
            } else if (status === "rejected") {
              basicDocsRejected++;
              basicRejectedNames.push(label);
            } else if (status === "under_review") {
              basicDocsUnderReview++;
              basicUnderReviewNames.push(label);
            }
          });
        }

        return {
          student_id: student.id,
          user_id: student.user_id,
          student_name: student.full_name || "N/A",
          student_email: student.email || "N/A",
          student_created_at: student.created_at,
          has_paid_selection_process_fee:
            student.has_paid_selection_process_fee || false,
          has_paid_i20_control_fee: student.has_paid_i20_control_fee || false,
          has_paid_i539_cos_package: student.has_paid_i539_cos_package || false,
          has_paid_ds160_package: student.has_paid_ds160_package || false,
          placement_fee_flow: student.placement_fee_flow || false,
          is_placement_fee_paid: student.is_placement_fee_paid || false,
          system_type: student.system_type || "legacy",
          seller_referral_code: student.seller_referral_code || null,
          agency_name: student.seller_referral_code
            ? (referralCodeToAgencyMap.get(student.seller_referral_code) ||
              null)
            : null,
          agency_email: student.seller_referral_code
            ? (referralCodeToAgencyEmailMap.get(student.seller_referral_code) ||
              null)
            : null,
          // Dados da aplicação só aparecem se locked
          application_id: lockedApplication?.id || null,
          scholarship_id: lockedApplication?.scholarship_id || null,
          status: applicationStatus,
          application_status: applicationStatus,
          applied_at: lockedApplication?.applied_at || null,
          is_application_fee_paid: lockedApplication?.is_application_fee_paid ||
            student.is_application_fee_paid ||
            false,
          is_scholarship_fee_paid: lockedApplication?.is_scholarship_fee_paid ||
            false,
          acceptance_letter_status:
            lockedApplication?.acceptance_letter_status || null,
          acceptance_letter_url: lockedApplication?.acceptance_letter_url ||
            null,
          payment_status: lockedApplication?.payment_status || null,
          student_process_type: lockedApplication?.student_process_type ||
            student.student_process_type || null,
          transfer_form_status: lockedApplication?.transfer_form_status || null,
          has_sent_docs_to_university:
            lockedApplication?.has_sent_docs_to_university || false,
          sevis_transfer_completed:
            lockedApplication?.sevis_transfer_completed || false,
          visa_approved: lockedApplication?.visa_approved || false,
          scholarship_title: scholarshipInfo ? scholarshipInfo.title : null,
          course_name: scholarshipInfo
            ? scholarshipInfo.course
            : student.field_of_interest || null,
          university_name: scholarshipInfo ? scholarshipInfo.university : null,
          university_id: lockedApplication?.scholarships?.university_id || null,
          reviewed_at: lockedApplication?.reviewed_at || null,
          reviewed_by: lockedApplication?.reviewed_by || null,
          is_locked: !!lockedApplication,
          total_applications: student.scholarship_applications
            ? student.scholarship_applications.length
            : 0,
          // Guardar todas as aplicações para o modal
          all_applications: student.scholarship_applications || [],
          // Campo para ordenação por atividade recente
          most_recent_activity: mostRecentActivity,
          has_paid_reinstatement_package:
            student.has_paid_reinstatement_package || false,
          visa_transfer_active: student.visa_transfer_active ?? true, // Default to true if not set
          is_archived: student.is_archived || false,
          is_dropped: student.is_dropped || false,
          placement_fee_pending_balance:
            student.placement_fee_pending_balance ?? 0,
          placement_fee_amount:
            lockedApplication?.scholarships?.placement_fee_amount ?? null,
          application_fee_amount:
            lockedApplication?.scholarships?.application_fee_amount ?? null,
          scholarship_fee_amount:
            lockedApplication?.scholarships?.scholarship_fee_amount ?? null,
          fee_override_placement_fee:
            feeOverridesMap[student.user_id]?.placement_fee ?? null,
          fee_override_i20_fee:
            feeOverridesMap[student.user_id]?.i20_control_fee ?? null,
          fee_override_selection_process_fee:
            feeOverridesMap[student.user_id]?.selection_process_fee ?? null,
          placement_fee_due_date: student.placement_fee_due_date || null,
          placement_fee_installment_number:
            student.placement_fee_installment_number ?? 0,
          placement_fee_installment_enabled:
            student.placement_fee_installment_enabled ?? false,
          placement_fee_total_installments:
            placementPlanMap[student.user_id] ?? null,
          package_fee_installment: packagePlanMap[student.user_id] ?? null,
          source: student.source,
          has_uploaded_photo: !!student.identity_photo_path,
          has_submitted_form: student.selection_survey_passed === true,
          documents_uploaded: student.documents_uploaded || false,
          selected_scholarship_id: student.selected_scholarship_id || null,
          scholarship_level: lockedApplication?.scholarships?.level || null,
          basic_docs_total_required: basicDocsRequired,
          basic_docs_total_uploaded: basicDocsUploaded,
          basic_docs_total_approved: basicDocsApproved,
          basic_docs_total_rejected: basicDocsRejected,
          basic_docs_total_under_review: basicDocsUnderReview,
          basic_docs_approved_names: basicApprovedNames,
          basic_docs_rejected_names: basicRejectedNames,
          basic_docs_under_review_names: basicUnderReviewNames,
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
      const { data: affiliateAdminsData, error: affiliateAdminsError } =
        await supabase
          .from("user_profiles")
          .select("user_id, full_name, email")
          .eq("role", "affiliate_admin")
          .eq("status", "active")
          .order("created_at", { ascending: false });

      let affiliates: any[] = [];
      if (!affiliateAdminsError && affiliateAdminsData) {
        // Para cada affiliate admin, buscar os sellers associados
        const affiliatesWithSellers = await Promise.all(
          affiliateAdminsData.map(async (admin) => {
            // Primeiro buscar o affiliate_admin_id na tabela affiliate_admins
            const { data: affiliateAdminData } = await supabase
              .from("affiliate_admins")
              .select("id")
              .eq("user_id", admin.user_id)
              .maybeSingle();

            let sellers: any[] = [];
            if (affiliateAdminData) {
              // Buscar sellers que pertencem a este affiliate admin
              const { data: sellersData } = await supabase
                .from("sellers")
                .select("id, referral_code, name, email")
                .eq("affiliate_admin_id", affiliateAdminData.id)
                .eq("is_active", true);

              sellers = sellersData || [];
            }

            // Se não encontrar sellers diretos, buscar por email
            if (sellers.length === 0) {
              const { data: sellersByEmail } = await supabase
                .from("sellers")
                .select("id, referral_code, name, email")
                .eq("email", admin.email)
                .eq("is_active", true);
              sellers = sellersByEmail || [];
            }

            return {
              id: admin.user_id,
              user_id: admin.user_id,
              name: admin.full_name || admin.email,
              email: admin.email,
              referral_code: sellers[0]?.referral_code || null,
              sellers: sellers,
            };
          }),
        );

        affiliates = affiliatesWithSellers;
      }

      // Carregar scholarships
      const { data: scholarshipsData } = await supabase
        .from("scholarships")
        .select("id, title, universities!inner(name)")
        .eq("is_active", true)
        .order("title", { ascending: true });

      // Carregar universities
      const { data: universitiesData } = await supabase
        .from("universities")
        .select("id, name")
        .eq("is_approved", true)
        .order("name", { ascending: true });

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

/**
 * Mutation para marcar/desmarcar aluno como dropped
 */
export function useDropStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      { studentId, isDropped, reason, adminId, adminName }: {
        studentId: string;
        isDropped: boolean;
        reason?: string;
        adminId?: string;
        adminName?: string;
      },
    ) => {
      // Se estiver marcando como dropped e houver uma razão, salvar nas admin_notes
      if (isDropped && reason) {
        // Buscar notas atuais primeiro para não sobrescrever
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("admin_notes")
          .eq("id", studentId);

        const profile = profileData && profileData.length > 0
          ? profileData[0]
          : null;

        let currentNotes: any[] = [];
        if (profile?.admin_notes) {
          if (Array.isArray(profile.admin_notes)) {
            currentNotes = profile.admin_notes;
          } else {
            try {
              currentNotes = JSON.parse(profile.admin_notes);
              if (!Array.isArray(currentNotes)) currentNotes = [];
            } catch (e) {
              console.error("Error parsing admin notes:", e);
              currentNotes = [];
            }
          }
        }

        const newNote = {
          id: `note-${Date.now()}-${Math.random().toString(36).substring(2)}`,
          content: `[DROPPED] ${reason.trim()}`,
          created_by: adminId || "unknown",
          created_by_name: adminName || "Admin",
          created_at: new Date().toISOString(),
        };

        const updatedNotes = [newNote, ...currentNotes];

        const { error } = await supabase
          .from("user_profiles")
          .update({
            is_dropped: isDropped,
            admin_notes: JSON.stringify(updatedNotes),
            updated_at: new Date().toISOString(),
          })
          .eq("id", studentId);

        if (error) throw error;
      } else {
        // Toggle normal (restaurar ou toggle sem razão)
        const { error } = await supabase
          .from("user_profiles")
          .update({
            is_dropped: isDropped,
            updated_at: new Date().toISOString(),
          })
          .eq("id", studentId);

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.students.details(variables.studentId),
      });
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
        .from("scholarship_applications")
        .update({ has_sent_docs_to_university: true })
        .eq("id", applicationId);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all }),
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
        .from("scholarship_applications")
        .update({ sevis_transfer_completed: true })
        .eq("id", applicationId);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all }),
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
        .from("scholarship_applications")
        .update({ visa_approved: true })
        .eq("id", applicationId);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all }),
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
        .from("scholarship_applications")
        .update({ transfer_form_status: "approved" })
        .eq("id", applicationId);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all }),
  });
}

export function useRejectTransferFormMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from("scholarship_applications")
        .update({ transfer_form_status: "sent" })
        .eq("id", applicationId);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all }),
  });
}

export function useSkipTransferFormMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      { applicationId, studentId, reason, adminId, adminName }: {
        applicationId: string;
        studentId: string;
        reason: string;
        adminId?: string;
        adminName?: string;
      },
    ) => {
      // 1. Buscar notas atuais para não sobrescrever
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("admin_notes")
        .eq("id", studentId);

      const profile = profileData && profileData.length > 0
        ? profileData[0]
        : null;

      let currentNotes: any[] = [];
      if (profile?.admin_notes) {
        if (Array.isArray(profile.admin_notes)) {
          currentNotes = profile.admin_notes;
        } else {
          try {
            currentNotes = JSON.parse(profile.admin_notes);
            if (!Array.isArray(currentNotes)) currentNotes = [];
          } catch (e) {
            console.error("Error parsing admin notes:", e);
            currentNotes = [];
          }
        }
      }

      // 2. Criar a nota de skip
      const newNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        content: `[SKIPPED TRANSFER FORM] ${reason.trim()}`,
        created_by: adminId || "unknown",
        created_by_name: adminName || "Admin",
        created_at: new Date().toISOString(),
      };

      const updatedNotes = [newNote, ...currentNotes];

      // 3. Executar updates em paralelo
      const [appUpdate, profileUpdate] = await Promise.all([
        supabase
          .from("scholarship_applications")
          .update({ transfer_form_status: "skipped" })
          .eq("id", applicationId),
        supabase
          .from("user_profiles")
          .update({
            admin_notes: JSON.stringify(updatedNotes),
            updated_at: new Date().toISOString(),
          })
          .eq("id", studentId)
      ]);

      if (appUpdate.error) throw appUpdate.error;
      if (profileUpdate.error) throw profileUpdate.error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.students.details(variables.studentId),
      });
    },
  });
}


export interface DocStats {
  docs_total_required: number;
  docs_total_uploaded: number;
  docs_total_approved: number;
  docs_total_rejected: number; // nº de document requests com rejeição (para lógica de stage)
  docs_total_rejected_files: number; // nº real de arquivos rejeitados (para exibição no kanban)
  docs_total_under_review: number;
  docs_approved_names?: string[];
  docs_rejected_names?: string[];
  docs_under_review_names?: string[];
}

/**
 * Query que agrega stats de documentos por aluno.
 * uploaded_by = user_profiles.user_id (auth UUID)
 */
export function useStudentDocsStats(students: StudentRecord[]) {
  return useQuery({
    queryKey: ["student-docs-stats"],
    queryFn: async (): Promise<Map<string, DocStats>> => {
      const appIds = students.map((s) => s.application_id).filter(
        Boolean,
      ) as string[];

      const [
        { data: globalDocs, error: drError },
        { data: appDocs, error: appDrError },
        { data: uploads, error: upError },
      ] = await Promise.all([
        supabase
          .from("document_requests")
          .select(
            "id, title, university_id, applicable_student_types, scholarship_application_id, applicable_scholarship_levels",
          )
          .eq("is_global", true)
          .eq("status", "open"),
        appIds.length > 0
          ? supabase
            .from("document_requests")
            .select(
              "id, title, university_id, applicable_student_types, scholarship_application_id, applicable_scholarship_levels",
            )
            .in("scholarship_application_id", appIds)
            .eq("status", "open")
          : Promise.resolve({ data: [] as any[], error: null }),
        supabase
          .from("document_request_uploads")
          .select("document_request_id, uploaded_by, status, uploaded_at"),
      ]);

      if (drError) throw drError;
      if (appDrError) throw appDrError;
      if (upError) throw upError;

      // Merge global + app-specific docs, deduplicating by id
      const allDocsMap = new Map<string, any>();
      for (const d of [...(globalDocs || []), ...(appDocs || [])]) {
        allDocsMap.set(d.id, d);
      }

      // Effective status per (doc_request_id, uploaded_by) considerando todos os uploads.
      // Se houver qualquer upload APROVADO, o status final é 'approved'.
      // Caso contrário, se houver 'under_review', o status é 'under_review'.
      // Se houver apenas 'rejected', o status é 'rejected'.
      const uploadsByKey = new Map<string, string[]>();
      for (const u of uploads || []) {
        const key = `${u.document_request_id}:${u.uploaded_by}`;
        if (!uploadsByKey.has(key)) uploadsByKey.set(key, []);
        uploadsByKey.get(key)!.push(u.status);
      }

      const latestUpload = new Map<string, string>();
      for (const [key, statuses] of uploadsByKey) {
        if (statuses.some((s) => s === "approved")) {
          latestUpload.set(key, "approved");
        } else if (statuses.some((s) => s === "under_review")) {
          latestUpload.set(key, "under_review");
        } else if (statuses.some((s) => s === "rejected")) {
          latestUpload.set(key, "rejected");
        } else {
          latestUpload.set(key, "pending");
        }
      }

      const result = new Map<string, DocStats>();

      for (const student of students) {
        if (!student.user_id) continue;

        const processType = student.student_process_type;
        const scholarshipLevel = student.scholarship_level;
        const rawRequiredDocs = Array.from(allDocsMap.values()).filter((dr) => {
          // App-specific doc linked to this student's application
          if (dr.scholarship_application_id) {
            return dr.scholarship_application_id === student.application_id;
          }
          // Global doc for this student's university and process type
          if (dr.university_id && dr.university_id !== student.university_id) {
            return false;
          }

          // Filter by scholarship level if applicable
          const levels: string[] = dr.applicable_scholarship_levels || [];
          if (levels.length > 0) {
            if (scholarshipLevel && !levels.includes(scholarshipLevel)) {
              return false;
            }
          }

          const types: string[] = dr.applicable_student_types || [];
          return types.includes("all") ||
            (processType ? types.includes(processType) : false);
        });

        // Desduplicação inteligente por título normalizado
        const requiredDocsByTitle = new Map<string, any>();
        for (const dr of rawRequiredDocs) {
          const normalizedTitle = (dr.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
          const existing = requiredDocsByTitle.get(normalizedTitle);
          if (!existing) {
            requiredDocsByTitle.set(normalizedTitle, dr);
          } else {
            const drKey = `${dr.id}:${student.user_id}`;
            const existingKey = `${existing.id}:${student.user_id}`;
            const drHasUpload = latestUpload.has(drKey);
            const existingHasUpload = latestUpload.has(existingKey);

            if (drHasUpload && !existingHasUpload) {
              requiredDocsByTitle.set(normalizedTitle, dr);
            } else if (drHasUpload === existingHasUpload) {
              if (dr.scholarship_application_id && !existing.scholarship_application_id) {
                requiredDocsByTitle.set(normalizedTitle, dr);
              } else if (dr.scholarship_application_id === existing.scholarship_application_id) {
                if (dr.id > existing.id) {
                  requiredDocsByTitle.set(normalizedTitle, dr);
                }
              }
            }
          }
        }
        const requiredDocs = Array.from(requiredDocsByTitle.values());

        let uploaded = 0,
          approved = 0,
          rejected = 0,
          rejectedFiles = 0,
          underReview = 0;
        const approvedNames: string[] = [];
        const rejectedNames: string[] = [];
        const underReviewNames: string[] = [];

        for (const dr of requiredDocs) {
          const key = `${dr.id}:${student.user_id}`;
          const status = latestUpload.get(key);
          if (status) {
            uploaded++;
            if (status === "approved") {
              approved++;
              approvedNames.push(dr.title);
            } else if (status === "rejected") {
              rejected++;
              // Conta o número real de arquivos rejeitados neste request
              const allStatuses = uploadsByKey.get(key) || [];
              rejectedFiles += allStatuses.filter((s) =>
                s === "rejected"
              ).length;
              rejectedNames.push(dr.title);
            } else if (status === "under_review") {
              underReview++;
              underReviewNames.push(dr.title);
            }
          }
        }

        result.set(student.student_id, {
          docs_total_required: requiredDocs.length,
          docs_total_uploaded: uploaded,
          docs_total_approved: approved,
          docs_total_rejected: rejected,
          docs_total_rejected_files: rejectedFiles,
          docs_total_under_review: underReview,
          docs_approved_names: approvedNames,
          docs_rejected_names: rejectedNames,
          docs_under_review_names: underReviewNames,
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
