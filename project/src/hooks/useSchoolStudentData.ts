import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Application, UserProfile, Scholarship } from '../types';
import { INSTALLMENT_CONFIG, InstallmentPlan } from '../config/installmentConfig';
import { useAuth } from './useAuth';
import { useFeeConfig } from './useFeeConfig';
import { getRealPaidAmounts } from '../utils/paymentConverter';

interface ApplicationDetails extends Application {
  user_profiles: UserProfile & {
    selection_survey_passed?: boolean;
    selected_application_id?: string | null;
  };
  scholarships: Scholarship;
}

export const useSchoolStudentData = (applicationId: string | undefined) => {
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [allStudentApplications, setAllStudentApplications] = useState<any[]>([]);

  const selectedAppId = application?.user_profiles?.selected_application_id;
  const isChoseAnother = !!selectedAppId && selectedAppId !== application?.id && !allStudentApplications.some((a: any) => a.id === selectedAppId);

  // Financial Monitoring Logic
  const { getFeeAmount, formatFeeAmount, hasOverride, userSystemType: configSystemType } = useFeeConfig(application?.user_profiles?.user_id);
  const [realPaidAmounts, setRealPaidAmounts] = useState<Record<string, number>>({});
  const [loadingPaidAmounts, setLoadingPaidAmounts] = useState<Record<string, boolean>>({});

  // Adapt student data for PaymentStatusCard
  const studentRecord = useMemo(() => {
    if (!application) return null;
    const profile = application.user_profiles;
    return {
      student_id: profile.id,
      user_id: profile.user_id,
      student_name: profile.full_name || '',
      student_email: profile.email || '',
      phone: profile.phone,
      country: profile.country,
      field_of_interest: profile.field_of_interest,
      academic_level: profile.academic_level,
      gpa: profile.gpa,
      english_proficiency: profile.english_proficiency,
      status: profile.status,
      avatar_url: profile.avatar_url,
      dependents: profile.dependents || 0,
      student_created_at: profile.created_at || '',
      has_paid_selection_process_fee: profile.has_paid_selection_process_fee,
      has_paid_i20_control_fee: profile.has_paid_i20_control_fee,
      is_application_fee_paid: application.is_application_fee_paid || profile.is_application_fee_paid,
      is_scholarship_fee_paid: application.is_scholarship_fee_paid || profile.is_scholarship_fee_paid,
      acceptance_letter_status: application.acceptance_letter_status || null,
      student_process_type: application.student_process_type || profile.student_process_type || null,
      visa_transfer_active: (profile as any).visa_transfer_active,
      seller_referral_code: profile.seller_referral_code || null,
      application_id: application.id,
      scholarship_id: application.scholarship_id,
      application_status: application.status,
      applied_at: application.applied_at,
      scholarship_name: application.scholarships?.title || null,
      course_name: application.scholarships?.field_of_study || null,
      university_name: application.scholarships?.university_name || null,
      scholarship_fee_amount: application.scholarships?.scholarship_fee_amount || 0,
      application_fee_amount: application.scholarships?.application_fee_amount || 0,
      all_applications: allStudentApplications.length > 0 ? allStudentApplications : [application],
      total_applications: allStudentApplications.length || 1,
      is_locked: true,
      system_type: profile.system_type || configSystemType,
      has_paid_ds160_package: (profile as any).has_paid_ds160_package || false,
      has_paid_i539_cos_package: (profile as any).has_paid_i539_cos_package || false,
      has_paid_reinstatement_package: (profile as any).has_paid_reinstatement_package || false,
      reinstatement_package_payment_method: (profile as any).reinstatement_package_payment_method || null,
      placement_fee_flow: (profile as any).placement_fee_flow || false,
      is_placement_fee_paid: (profile as any).is_placement_fee_paid || false,
      placement_fee_pending_balance: (profile as any).placement_fee_pending_balance || 0,
      selected_application_id: profile.selected_application_id || null,
    } as any;
  }, [application, configSystemType, allStudentApplications]);

  // Fetch installment plans for this student
  const [installmentPlans, setInstallmentPlans] = useState<Record<string, InstallmentPlan | null>>({});
  useEffect(() => {
    const userId = application?.user_profiles?.user_id;
    if (!userId) return;
    supabase
      .from('fee_installment_plans')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'completed'])
      .then(({ data }) => {
        const map: Record<string, InstallmentPlan | null> = {};
        (INSTALLMENT_CONFIG.SUPPORTED_FEE_TYPES as readonly string[]).forEach(ft => { map[ft] = null; });
        (data || []).forEach((plan: InstallmentPlan) => { map[plan.fee_type] = plan; });
        setInstallmentPlans(map);
      });
  }, [application?.user_profiles?.user_id]);

  // Load real paid amounts
  useEffect(() => {
    if (!application?.user_profiles?.user_id || isChoseAnother) return;

    const loadRealPaidAmounts = async () => {
      setLoadingPaidAmounts({
        selection_process: true,
        scholarship: true,
        i20_control: true,
        application: true,
        placement: true,
      });
      try {
        const feeTypes: any[] = ['selection_process', 'scholarship', 'i20_control', 'application', 'placement', 'ds160_package', 'i539_cos_package', 'reinstatement_package'];
        const amounts = await getRealPaidAmounts(application.user_profiles.user_id, feeTypes as any);
        setRealPaidAmounts(amounts);
      } catch (error) {
        console.error('Error loading real paid amounts:', error);
      } finally {
        setLoadingPaidAmounts({
          selection_process: false,
          scholarship: false,
          i20_control: false,
          application: false,
          placement: false,
        });
      }
    };

    loadRealPaidAmounts();
  }, [application?.user_profiles?.user_id, isChoseAnother]);

  // Documentos basicos do aluno (passport, diploma, funds_proof) para a aba Documents
  const [studentDocs, setStudentDocs] = useState<any[]>([]);

  // Estados para a aba Documents
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const [studentDocuments, setStudentDocuments] = useState<any[]>([]);

  // Estados para Transfer Form
  const [transferFormUploads, setTransferFormUploads] = useState<any[]>([]);
  const [transferForm, setTransferForm] = useState<any>(null);

  useEffect(() => {
    if (applicationId) {
      fetchApplicationDetails();
    }
  }, [applicationId]);

  // Sincronizar documents_status sempre que a aplicacao for carregada
  useEffect(() => {
    if (application && application.user_profiles) {
      syncDocumentsStatus();
    }
  }, [application]);

  // Carregar dados dos documentos quando a aplicacao for carregada
  useEffect(() => {
    if (applicationId && application?.user_profiles?.user_id && !isChoseAnother) {
      fetchDocumentRequests();
      fetchStudentDocuments();

      // Buscar dados do Transfer Form se for aplicacao de transfer
      if (application?.student_process_type === 'transfer') {
        fetchTransferForm();
        fetchTransferFormUploads();
      }
    }
  }, [applicationId, application, isChoseAnother]);

  const fetchApplicationDetails = async () => {
    if (!applicationId) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Tenta buscar pelo ID da aplicacao (comportamento padrao)
      let { data, error } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          user_profiles!student_id(*),
          scholarships(*, universities(*))
        `)
        .eq('id', applicationId)
        .maybeSingle();

      // 2. Fallback: Se nao encontrou, talvez o ID passado seja um student_id (ex: vindo do Chat)
      if (!data && !error) {
        const altResponse = await supabase
          .from('scholarship_applications')
          .select(`
            *,
            user_profiles!student_id(*),
            scholarships(*, universities(*))
          `)
          .eq('student_id', applicationId)
          // Ordena pela mais recente caso haja multiplas
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        data = altResponse.data;
        error = altResponse.error;
      }

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Application not found');
      }

      if (data) {
        setApplication(data as ApplicationDetails);

        // Fetch all applications from this student in the same university
        const studentProfileId = (data as any).user_profiles?.id;
        const universityId = (data as any).scholarships?.university_id || (data as any).scholarships?.universities?.id;
        if (studentProfileId && universityId) {
          const { data: allApps } = await supabase
            .from('scholarship_applications')
            .select(`
              *,
              scholarships(*)
            `)
            .eq('student_id', studentProfileId)
            .order('created_at', { ascending: false });

          // Filter to only apps belonging to the same university
          const universityApps = (allApps || []).filter((a: any) => a.scholarships?.university_id === universityId);
          setAllStudentApplications(universityApps.length > 0 ? universityApps : [data]);
        } else {
          setAllStudentApplications([data]);
        }

        // Mantemos uma copia simplificada para compatibilidade antiga
        const appDocs = (data as any).documents;
        if (Array.isArray(appDocs) && appDocs.length > 0) {
          setStudentDocs(appDocs.map((d: any) => ({ type: d.type, file_url: d.url, status: d.status || 'under_review' })));
        } else {
          // Fallback 1: usar documentos salvos no perfil do aluno (user_profiles.documents)
          const profileDocs = (data as any).user_profiles?.documents;
          if (Array.isArray(profileDocs) && profileDocs.length > 0) {
            setStudentDocs(profileDocs.map((d: any) => ({ type: d.type, file_url: d.url, status: d.status || 'under_review' })));
          } else {
            // Fallback 2: buscar do storage se a application ainda nao tiver documentos associados
            const studentId = (data as any).user_profiles?.user_id;
            if (studentId) {
              const { data: docs } = await supabase
                .from('student_documents')
                .select('*')
                .eq('user_id', studentId);
              if (docs && docs.length > 0) {
                setStudentDocs((docs || []).map((d: any) => ({ type: d.type, file_url: d.file_url, status: d.status || 'under_review' })));
              } else {
                setStudentDocs([]);
              }
            } else {
              setStudentDocs([]);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Error fetching application details:", err);
      setError("Failed to load application details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Funcao para verificar e sincronizar o documents_status
  const syncDocumentsStatus = async () => {
    if (!application?.documents || !application?.user_profiles?.user_id) return;

    const allDocsApproved = ['passport']
      .every((docType) => {
        const doc = application.documents.find((d: any) => d.type === docType);
        return doc && (doc as any).status === 'approved';
      });

    if (allDocsApproved && application.user_profiles.documents_status !== 'approved') {
      const { error } = await supabase
        .from('user_profiles')
        .update({ documents_status: 'approved' })
        .eq('user_id', application.user_profiles.user_id);

      if (error) {
        console.error('Erro ao sincronizar documents_status:', error);
      } else {
        setApplication((prev) => prev ? ({
          ...prev,
          user_profiles: { ...prev.user_profiles, documents_status: 'approved' }
        } as any) : prev);
      }
    }
  };

  const fetchDocumentRequests = async () => {
    if (!application) return;

    try {
      // Buscar requests especificos para esta aplicacao
      const { data: specificRequests, error: specificError } = await supabase
        .from('document_requests')
        .select('*')
        .eq('scholarship_application_id', application.id)
        .order('created_at', { ascending: false });

      if (specificError) {
        console.error("Error fetching specific document requests:", specificError);
      }

      // Buscar requests globais da universidade
      let globalRequests: any[] = [];
      if (application.scholarships?.university_id) {
        const { data: globalData, error: globalError } = await supabase
          .from('document_requests')
          .select('*')
          .eq('is_global', true)
          .eq('university_id', application.scholarships.university_id)
          .order('created_at', { ascending: false });

        if (globalError) {
          console.error("Error fetching global document requests:", globalError);
        } else {
          // Filtrar requests globais conforme aplicabilidade do estudante
          const studentType = application.student_process_type || application.user_profiles?.student_process_type;
          const scholarshipLevel = application.scholarships?.level;

          globalRequests = (globalData || []).filter((r: any) => {
            // Filtrar por tipo de estudante se configurado
            if (r.applicable_student_types && r.applicable_student_types.length > 0) {
              const hasMatchingType = r.applicable_student_types.includes(studentType) || r.applicable_student_types.includes('all');
              if (!hasMatchingType) return false;
            }

            // Filtrar por nivel academico da bolsa se configurado
            if (r.applicable_scholarship_levels && r.applicable_scholarship_levels.length > 0 && scholarshipLevel) {
              const hasMatchingLevel = r.applicable_scholarship_levels.includes(scholarshipLevel) || r.applicable_scholarship_levels.includes('all');
              if (!hasMatchingLevel) return false;
            }

            return true;
          });
        }
      }

      // Combinar requests especificos e globais
      const allRequests = [...(specificRequests || []), ...globalRequests];

      // Buscar uploads para cada request
      if (allRequests && allRequests.length > 0) {
        const requestIds = allRequests.map(req => req.id);

        const studentUserId = application.user_profiles?.user_id;

        let uploadsQuery = supabase
          .from('document_request_uploads')
          .select('*')
          .in('document_request_id', requestIds)
          .order('uploaded_at', { ascending: false });

        if (studentUserId) {
          uploadsQuery = uploadsQuery.eq('uploaded_by', studentUserId);
        }

        const { data: uploads, error: uploadsError } = await uploadsQuery;

        if (uploadsError) {
          console.error("Error fetching uploads:", uploadsError);
        } else {
          const requestsWithUploads = allRequests.map(request => ({
            ...request,
            // Filtrar uploads deste request (apenas do aluno atual) e garantir que o mais recente venha primeiro
            uploads: (uploads?.filter(upload =>
              upload.document_request_id === request.id &&
              (!studentUserId || upload.uploaded_by === studentUserId)
            ) || [])
              .sort((a, b) => new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime())
          }));
          setDocumentRequests(requestsWithUploads);
        }
      } else {
        setDocumentRequests([]);
      }
    } catch (error) {
      console.error("Error in fetchDocumentRequests:", error);
      setDocumentRequests([]);
    }
  };

  const fetchStudentDocuments = async () => {
    if (!application) return;

    try {
      let uploads: any[] = [];

      // Estrategia 1: Buscar uploads atraves dos document_requests da aplicacao
      try {
        const { data: uploadsForApp, error: errorApp } = await supabase
          .from('document_request_uploads')
          .select(`
            *,
            document_requests!inner(
              id,
              title,
              description,
              created_at,
              is_global,
              university_id,
              scholarship_application_id,
              applicable_student_types,
              applicable_scholarship_levels
            )
          `)
          .eq('document_requests.scholarship_application_id', application.id);

        if (errorApp) {
          console.error('Erro ao buscar uploads por aplicacao:', errorApp);
        } else if (uploadsForApp && uploadsForApp.length > 0) {
          uploads = uploadsForApp;
        }
      } catch (error) {
        console.error('Erro na estrategia 1:', error);
      }

      // Estrategia 2: Se nao encontrou por aplicacao, buscar por uploaded_by (ID do usuario)
      if (uploads.length === 0 && application.user_profiles?.user_id) {
        try {
          const { data: uploadsByUser, error: error1 } = await supabase
            .from('document_request_uploads')
            .select(`
              *,
              document_requests(
                id,
                title,
                description,
                created_at,
                is_global,
                university_id,
                scholarship_application_id,
                applicable_student_types,
                applicable_scholarship_levels
              )
            `)
            .eq('uploaded_by', application.user_profiles.user_id);

          if (error1) {
            console.error('Erro ao buscar por uploaded_by:', error1);
          } else if (uploadsByUser && uploadsByUser.length > 0) {
            uploads = uploadsByUser;
          }
        } catch (error) {
          console.error('Erro na estrategia 2:', error);
        }
      }

      // Filtrar uploads com base nas regras de aplicabilidade dos document_requests
      const studentType = application.student_process_type || application.user_profiles?.student_process_type;
      const scholarshipLevel = application.scholarships?.level;

      const filteredUploads = uploads.filter((u: any) => {
        const req = u.document_requests;
        if (!req) return false;

        // Se for request especifico desta aplicacao, e aplicavel
        if (req.scholarship_application_id === application.id) return true;

        // Se for global, validar tipo de estudante e nivel da bolsa
        if (req.is_global) {
          // Filtrar por tipo de estudante
          if (req.applicable_student_types && req.applicable_student_types.length > 0) {
            const hasMatchingType = req.applicable_student_types.includes(studentType) || req.applicable_student_types.includes('all');
            if (!hasMatchingType) return false;
          }

          // Filtrar por nivel academico da bolsa
          if (req.applicable_scholarship_levels && req.applicable_scholarship_levels.length > 0 && scholarshipLevel) {
            const hasMatchingLevel = req.applicable_scholarship_levels.includes(scholarshipLevel) || req.applicable_scholarship_levels.includes('all');
            if (!hasMatchingLevel) return false;
          }

          return true;
        }

        return false;
      });

      // Buscar tambem a carta de aceite da aplicacao
      let acceptanceLetterDoc = null;

      // Verificar se ha carta de aceite
      // So aceitar se tiver URL E status nao for 'pending'
      if (application.acceptance_letter_url &&
        application.acceptance_letter_url.trim() !== '' &&
        application.acceptance_letter_status !== 'pending') {
        acceptanceLetterDoc = {
          id: `acceptance_letter_${application.id}`,
          filename: application.acceptance_letter_url?.split('/').pop() || 'Acceptance Letter',
          file_url: application.acceptance_letter_url,
          status: application.acceptance_letter_status || 'sent',
          uploaded_at: application.acceptance_letter_sent_at || new Date().toISOString(),
          request_title: 'Acceptance Letter',
          request_description: 'Official acceptance letter from the university',
          request_created_at: application.acceptance_letter_sent_at || new Date().toISOString(),
          is_global: false,
          request_type: 'Acceptance Letter',
          is_acceptance_letter: true
        };
      }

      // Combinar uploads filtrados com a carta de aceite
      const allDocuments = [...filteredUploads];
      if (acceptanceLetterDoc) {
        allDocuments.unshift(acceptanceLetterDoc); // Colocar a carta de aceite no topo
      }

      if (!allDocuments || allDocuments.length === 0) {
        setStudentDocuments([]);
        return;
      }

      // Formatar os documentos para exibicao
      const studentDocuments = allDocuments.map(doc => {
        // Determinar o nome do arquivo
        let filename = 'Document';
        if (doc.file_url) {
          const urlParts = doc.file_url.split('/');
          filename = urlParts[urlParts.length - 1] || 'Document';
        } else if (doc.filename) {
          filename = doc.filename;
        }

        return {
          id: doc.id,
          filename: filename,
          file_url: doc.file_url,
          status: doc.status || 'under_review',
          uploaded_at: doc.uploaded_at || doc.created_at,
          request_title: doc.request_title || doc.document_requests?.title || doc.title || 'Document Request',
          request_description: doc.request_description || doc.document_requests?.description || doc.description || '',
          request_created_at: doc.request_created_at || doc.created_at,
          is_global: doc.is_global ?? doc.document_requests?.is_global ?? false,
          request_type: doc.request_type || (doc.document_requests?.is_global ? 'Global Request' : 'Individual Request') || 'document',
          is_acceptance_letter: doc.is_acceptance_letter || false
        };
      });

      setStudentDocuments(studentDocuments);
    } catch (error) {
      console.error("Error in fetchStudentDocuments:", error);
      setStudentDocuments([]);
    }
  };

  // Funcao para buscar dados do Transfer Form
  const fetchTransferForm = async () => {
    if (!application) return;

    try {
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select('id, transfer_form_url, transfer_form_status, transfer_form_sent_at')
        .eq('id', application.id)
        .single();

      if (error) {
        console.error('Erro ao buscar transfer form:', error);
        return;
      }

      setTransferForm(data);
    } catch (error) {
      console.error('Error in fetchTransferForm:', error);
    }
  };

  // Funcao para buscar uploads do Transfer Form
  const fetchTransferFormUploads = async () => {
    if (!application) return;

    try {
      const { data, error } = await supabase
        .from('transfer_form_uploads')
        .select('*')
        .eq('application_id', application.id)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar transfer form uploads:', error);
        return;
      }

      setTransferFormUploads(data || []);
    } catch (error) {
      console.error('Error in fetchTransferFormUploads:', error);
    }
  };

  const latestDocByType = (type: string) => {
    const appDocsOfType = Array.isArray((application as any)?.documents)
      ? (application as any).documents.filter((d: any) => d.type === type)
      : [];

    const profileDocsOfType = Array.isArray((application as any)?.user_profiles?.documents)
      ? (application as any).user_profiles.documents.filter((d: any) => d.type === type)
      : [];

    const storageDocsOfType = studentDocs.filter(doc => doc.type === type);

    const requestDocsOfType = studentDocuments.filter(doc => doc.type === type);

    const allDocsOfType = [
      ...appDocsOfType.map((d: any) => ({ ...d, source: 'application', file_url: d.url || d.file_url })),
      ...profileDocsOfType.map((d: any) => ({ ...d, source: 'profile', file_url: d.url || d.file_url })),
      ...storageDocsOfType.map((d: any) => ({ ...d, source: 'storage', file_url: d.file_url })),
      ...requestDocsOfType.map((d: any) => ({ ...d, source: 'request', file_url: d.file_url }))
    ];

    if (allDocsOfType.length === 0) return null;

    const latestDoc = allDocsOfType.sort((a: any, b: any) => {
      const dateA = new Date(a.uploaded_at || a.created_at || a.saved_at || 0).getTime();
      const dateB = new Date(b.uploaded_at || b.created_at || b.saved_at || 0).getTime();
      return dateB - dateA;
    })[0];

    let finalFileUrl = latestDoc.file_url;

    if (finalFileUrl && !finalFileUrl.startsWith('http')) {
      finalFileUrl = `https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/student-documents/${finalFileUrl}`;
    }

    return {
      id: latestDoc.id || `temp_${type}_${Date.now()}`,
      type: latestDoc.type,
      file_url: finalFileUrl,
      status: latestDoc.status || 'under_review',
      uploaded_at: latestDoc.uploaded_at || latestDoc.created_at || latestDoc.saved_at,
      source: latestDoc.source
    };
  };

  return {
    application, setApplication,
    loading, error,
    allStudentApplications, setAllStudentApplications,
    studentDocs, setStudentDocs,
    documentRequests, setDocumentRequests,
    studentDocuments, setStudentDocuments,
    transferForm, setTransferForm,
    transferFormUploads, setTransferFormUploads,
    studentRecord,
    installmentPlans,
    realPaidAmounts, loadingPaidAmounts,
    isChoseAnother,
    latestDocByType,
    fetchApplicationDetails,
    fetchDocumentRequests,
    fetchStudentDocuments,
    fetchTransferForm,
    fetchTransferFormUploads,
    feeConfig: { getFeeAmount, formatFeeAmount, hasOverride, configSystemType },
  };
};
