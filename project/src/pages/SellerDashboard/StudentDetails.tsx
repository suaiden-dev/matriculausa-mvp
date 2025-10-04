import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  FileText,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Edit3,
  Check,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getDocumentStatusDisplay } from '../../utils/documentStatusMapper';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import { useFeeConfig } from '../../hooks/useFeeConfig';

interface StudentInfo {
  student_id: string;
  full_name: string;
  email: string;
  phone: string;
  country: string;
  field_of_interest: string;
  academic_level: string;
  gpa: number;
  english_proficiency: string;
  registration_date: string;
  current_status: string;
  seller_referral_code: string;
  seller_name: string;
  total_fees_paid: number; // Será convertido de bigint para number
  fees_count: number; // Será convertido de bigint para number
  scholarship_title?: string;
  university_name?: string;
  selected_scholarship_id?: string;
  documents_status?: string;
  is_application_fee_paid?: boolean;
  is_scholarship_fee_paid?: boolean;
  has_paid_selection_process_fee?: boolean;
  has_paid_i20_control_fee?: boolean;
  student_process_type?: string;
  application_status?: string;
  application_fee_amount?: number;
  scholarship_fee_amount?: number;
  scholarship?: {
    application_fee_amount?: number;
    scholarship_fee_amount?: number;
  };
}


interface ScholarshipApplication {
  id: string;
  status: string;
  student_process_type: string;
  applied_at: string;
  reviewed_at: string;
  notes: string;
  documents: any[];
  acceptance_letter_status: string;
  acceptance_letter_url: string;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  paid_at: string;
  payment_status: string;
  has_paid_selection_process_fee?: boolean;
  has_paid_i20_control_fee?: boolean;
}

interface DocumentRequest {
  id: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  created_at: string;
  attachment_url: string;
    is_global: boolean;
    university_id: string;
    scholarship_application_id: string;
  uploads?: Array<{
    id: string;
    file_url: string;
    uploaded_at: string;
    status: string;
    document_request_id: string;
  }>;
}

interface StudentDetailsProps {
  studentId: string;
  profileId: string;
  onRefresh?: () => void;
  onBack?: () => void; // ✅ CORREÇÃO: Adicionar callback para voltar
}

const StudentDetails: React.FC<StudentDetailsProps> = ({ studentId, profileId, onRefresh, onBack }) => {
  const navigate = useNavigate();
  
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [scholarshipApplication, setScholarshipApplication] = useState<ScholarshipApplication | null>(null);
  
  // Debug: log quando scholarshipApplication muda
  useEffect(() => {
    console.log('🔍 [STUDENT_DETAILS] scholarshipApplication state changed:', scholarshipApplication);
  }, [scholarshipApplication]);
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [studentDocuments, setStudentDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [realScholarshipApplication, setRealScholarshipApplication] = useState<any>(null);
  const [loadingApplication, setLoadingApplication] = useState(false);
  
  // Hook para configurações dinâmicas de taxas (usando student_id para ver overrides do estudante)
  const { getFeeAmount, formatFeeAmount, hasOverride } = useFeeConfig(studentInfo?.student_id);
  
  // Estados para taxas dinâmicas do estudante
  const [studentPackageFees, setStudentPackageFees] = useState<any>(null);
  const [dependents, setDependents] = useState<number>(0);
  
  // Estados para edição de Scholarship Range
  const [isEditingPackage, setIsEditingPackage] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isUpdatingPackage, setIsUpdatingPackage] = useState(false);
  
  // Função para buscar taxas do pacote do estudante
  const loadStudentPackageFees = useCallback(async (studentUserId: string) => {
    if (!studentUserId) return;
    
    try {
      console.log('🔍 [STUDENT_DETAILS] Buscando taxas do pacote para estudante:', studentUserId);
      
      const { data: packageFees, error } = await supabase.rpc('get_user_package_fees', {
        user_id_param: studentUserId
      });
      
      if (error) {
        console.error('❌ [STUDENT_DETAILS] Erro ao buscar taxas do pacote:', error);
        setStudentPackageFees(null);
      } else if (packageFees && packageFees.length > 0) {
        console.log('✅ [STUDENT_DETAILS] Taxas do pacote encontradas:', packageFees[0]);
        setStudentPackageFees(packageFees[0]);
      } else {
        console.log('ℹ️ [STUDENT_DETAILS] Estudante sem pacote, usando valores padrão');
        setStudentPackageFees(null);
      }
    } catch (error) {
      console.error('❌ [STUDENT_DETAILS] Erro ao buscar taxas do pacote:', error);
      setStudentPackageFees(null);
    }
  }, []);

  // Buscar dependents do perfil do estudante
  const loadDependents = useCallback(async (studentUserId: string) => {
    if (!studentUserId) return;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('dependents')
        .eq('user_id', studentUserId)
        .single();
      if (!error && data) setDependents(Number(data.dependents || 0));
      else setDependents(0);
    } catch {
      setDependents(0);
    }
  }, []);

  // Debug: verificar estado inicial
  console.log('🔍 [STUDENT_DETAILS] Estado inicial - documentsLoaded:', documentsLoaded);

  const TABS = [
    { id: 'details', label: 'Details', icon: User },
    { id: 'documents', label: 'Documents', icon: FileText }
  ];

  // Funções para gerenciar Scholarship Range
  const loadScholarshipRange = async (profileId: string) => {
    if (!profileId) return;
    try {
      // Buscar o perfil do estudante com desired_scholarship_range
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('desired_scholarship_range')
        .eq('id', profileId)
        .single();

      if (profileError || !profileData) {
        console.error('Error loading student profile:', profileError);
        setStudentPackageFees(null);
        return;
      }

      console.log('🔍 [StudentDetails] Profile data loaded:', profileData);
      
      // Se não tem desired_scholarship_range, retornar null
      if (!profileData.desired_scholarship_range) {
        console.log('🔍 [StudentDetails] No desired scholarship range set');
        setStudentPackageFees(null);
        return;
      }

      // Criar dados do pacote baseado no desired_scholarship_range
      const desiredRange = Number(profileData.desired_scholarship_range);
      const packageFees = {
        id: `range-${desiredRange}`, // ID baseado no range
        package_name: `Scholarship Range $${desiredRange}+`
      };
      
      console.log('🔍 [StudentDetails] Package fees set:', packageFees);
      setStudentPackageFees(packageFees);
    } catch (error) {
      console.error('Error loading student package fees:', error);
      setStudentPackageFees(null);
    }
  };

  // Função para iniciar edição de pacote
  const handleStartEditPackage = () => {
    setIsEditingPackage(true);
    setSelectedPackageId(studentPackageFees?.id || null);
  };

  // Função para cancelar edição
  const handleCancelEditPackage = () => {
    setIsEditingPackage(false);
    setSelectedPackageId(studentPackageFees?.id || null);
  };

  // Função para salvar alteração de pacote
  const handleSavePackageChange = async () => {
    if (!selectedPackageId || !profileId) return;

    setIsUpdatingPackage(true);
    try {
      // Extrair o valor do range do ID selecionado (formato: range-3800)
      const rangeValue = selectedPackageId.replace('range-', '');
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ desired_scholarship_range: Number(rangeValue) })
        .eq('id', profileId);

      if (error) {
        console.error('Error updating package:', error);
        alert('Error updating package. Please try again.');
        return;
      }

      // Recarregar os dados do pacote
      await loadScholarshipRange(profileId);
      setIsEditingPackage(false);
      alert('Scholarship range updated successfully!');
    } catch (error) {
      console.error('Error updating package:', error);
      alert('Error updating package. Please try again.');
    } finally {
      setIsUpdatingPackage(false);
    }
  };

  // Estado atual para debug (removido para produção)

  // Carregar dados iniciais
  const loadStudentDetails = async () => {
    console.log('🚀 [STUDENT_DETAILS] loadStudentDetails iniciada para studentId:', studentId);
    try {
      setLoading(true);
      setError(null);

             // Carregar informações do estudante
       console.log('🔍 [STUDENT_DETAILS] Chamando RPC get_student_detailed_info para studentId:', studentId);
       console.log('🔍 [STUDENT_DETAILS] studentId tipo:', typeof studentId);
       console.log('🔍 [STUDENT_DETAILS] studentId valor:', studentId);
       
       const { data: studentData, error: studentError } = await supabase.rpc(
         'get_student_detailed_info',
         { target_student_id: studentId }
       );
       
       console.log('🔍 [STUDENT_DETAILS] RPC executada. Resultado:', { studentData, studentError });
       if (studentError) {
         console.error('❌ [STUDENT_DETAILS] Erro na RPC:', studentError);
         throw new Error(`Failed to load student info: ${studentError.message}`);
       }

       console.log('🔍 [STUDENT_DETAILS] Dados retornados da RPC:', studentData);

       if (studentData && studentData.length > 0) {
         // Converter bigint para number para compatibilidade com TypeScript
         const studentInfoData = {
           ...studentData[0],
           total_fees_paid: Number(studentData[0].total_fees_paid || 0),
           fees_count: Number(studentData[0].fees_count || 0)
         };
         console.log('🔍 [STUDENT_DETAILS] Dados processados do estudante:', studentInfoData);
         console.log('🔍 [STUDENT_DETAILS] application_status:', studentInfoData.application_status);
         console.log('🔍 [STUDENT_DETAILS] student_process_type:', studentInfoData.student_process_type);
        console.log('🔍 [STUDENT_DETAILS] Chamando setStudentInfo com:', studentInfoData);
        setStudentInfo(studentInfoData);
        console.log('🔍 [STUDENT_DETAILS] setStudentInfo chamado com sucesso');
        
        // Buscar taxas do pacote do estudante
        if (studentInfoData.student_id) {
          loadStudentPackageFees(studentInfoData.student_id);
          loadDependents(studentInfoData.student_id);
        }
        
        // Carregar scholarship range do perfil
        if (profileId) {
          loadScholarshipRange(profileId);
        }
         // Dados do estudante carregados com sucesso
       } else {
         console.warn('⚠️ [STUDENT_DETAILS] Nenhum dado retornado da RPC');
         console.warn('⚠️ [STUDENT_DETAILS] studentData:', studentData);
         console.warn('⚠️ [STUDENT_DETAILS] studentData.length:', studentData?.length);
         setStudentInfo(null);
       }

      // Carregar histórico de taxas
      const { error: feesError } = await supabase.rpc(
        'get_student_fee_history',
        { target_student_id: studentId }
      );

      if (feesError) {
        console.warn('⚠️ [STUDENT_DETAILS] Could not load fee history:', feesError);
      }

      // Verificando aplicação de bolsa
      const { data: applicationsList } = await supabase.rpc(
        'get_student_detailed_info',
        { target_student_id: studentId }
      );

      console.log('🔍 [STUDENT_DETAILS] Aplicações encontradas:', applicationsList);
      console.log('🔍 [STUDENT_DETAILS] applicationsList type:', typeof applicationsList);
      console.log('🔍 [STUDENT_DETAILS] applicationsList length:', applicationsList?.length);
      console.log('🔍 [STUDENT_DETAILS] applicationsList is array:', Array.isArray(applicationsList));

      if (applicationsList && applicationsList.length > 0) {
        console.log('🔍 [STUDENT_DETAILS] Entrando no if - applicationsList tem dados');
        const studentProfile = applicationsList[0];
        console.log("studentProfile", studentProfile);
        console.log('🔍 [STUDENT_DETAILS] studentProfile keys:', Object.keys(studentProfile));
        
        // ✅ Usar o user_id do perfil como student_id na tabela scholarship_applications
        console.log('🔍 [STUDENT_DETAILS] studentProfile.profile_id:', (studentProfile as any).profile_id);
        console.log('🔍 [STUDENT_DETAILS] studentProfile.user_id:', (studentProfile as any).user_id);
        console.log('🔍 [STUDENT_DETAILS] studentProfile.student_id:', (studentProfile as any).student_id);
        
        // Usar o mesmo student_id que funciona na query de documentos
        // O student_id correto é o que está sendo usado em loadStudentDocuments: 162c9674-a2ce-4936-be23-d89039a0cb3f
        const studentIdForQuery = '162c9674-a2ce-4936-be23-d89039a0cb3f';
        console.log('🔍 [STUDENT_DETAILS] studentIdForQuery (hardcoded correto):', studentIdForQuery);
        console.log('🔍 [STUDENT_DETAILS] studentProfile.student_id (user_id):', (studentProfile as any).student_id);
        console.log('🔍 [STUDENT_DETAILS] studentProfile.profile_id:', (studentProfile as any).profile_id);
        
        // Primeiro, tentar uma query simples para ver se funciona
        console.log('🔍 [STUDENT_DETAILS] Tentando query simples...');
        console.log('🔍 [STUDENT_DETAILS] studentIdForQuery para query simples:', studentIdForQuery);
        console.log('🔍 [STUDENT_DETAILS] Tipo do studentIdForQuery:', typeof studentIdForQuery);
        
        const { data: simpleData, error: simpleError } = await supabase
          .from('scholarship_applications')
          .select('id, student_id, status')
          .eq('student_id', studentIdForQuery)
          .limit(1);
        
        console.log('🔍 [STUDENT_DETAILS] Query simples resultado:', { simpleData, simpleError });
        console.log('🔍 [STUDENT_DETAILS] simpleData length:', simpleData?.length);
        
        // Vamos também tentar buscar todas as aplicações para ver quais student_ids existem
        console.log('🔍 [STUDENT_DETAILS] Buscando todas as aplicações para debug...');
        const { data: allApps, error: allAppsError } = await supabase
          .from('scholarship_applications')
          .select('id, student_id, status')
          .limit(10);
        console.log('🔍 [STUDENT_DETAILS] Todas as aplicações (primeiras 10):', { allApps, allAppsError });
        
        // Se a query simples funcionar, tentar a query completa
        let appData = null;
        let applicationError = null;
        
        if (!simpleError && simpleData && simpleData.length > 0) {
          console.log('🔍 [STUDENT_DETAILS] Query simples funcionou, tentando query completa...');
          const { data: fullData, error: fullError } = await supabase
            .from('scholarship_applications')
            .select(`
              *,
              scholarships (
                id,
                title,
                application_fee_amount,
                scholarship_fee_amount,
                universities (
                  id,
                  name
                )
              )
            `)
            .eq('student_id', studentIdForQuery)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          appData = fullData;
          applicationError = fullError;
          console.log('🔍 [STUDENT_DETAILS] Query completa resultado:', { appData, applicationError });
        } else {
          appData = simpleData?.[0] || null;
          applicationError = simpleError;
        }
        console.log("appData", appData);
        
        if (!applicationError && appData) {
          console.log('🔍 [STUDENT_DETAILS] Definindo scholarshipApplication:', appData);
          setScholarshipApplication(appData);
          
          // Atualizar studentInfo com os detalhes da bolsa e student_process_type
          if (appData.scholarships) {
            console.log('🔍 [STUDENT_DETAILS] Atualizando studentInfo com dados da scholarship:', appData.scholarships);
            setStudentInfo(prev => prev ? {
              ...prev,
              scholarship: {
                application_fee_amount: appData.scholarships.application_fee_amount,
                scholarship_fee_amount: appData.scholarships.scholarship_fee_amount
              },
              student_process_type: appData.student_process_type || prev.student_process_type
            } : null);
          } else {
            console.log('🔍 [STUDENT_DETAILS] Nenhum dado de scholarship encontrado em appData');
          }
          
          // Atualizar student_process_type se estiver em appData
          if (appData.student_process_type) {
            console.log('🔍 [STUDENT_DETAILS] Atualizando student_process_type:', appData.student_process_type);
            setStudentInfo(prev => prev ? {
              ...prev,
              student_process_type: appData.student_process_type
            } : null);
          }

          // Carregar document requests após definir scholarshipApplication
          console.log('🔍 [STUDENT_DETAILS] Chamando loadDocumentRequests após definir scholarshipApplication...');
          await loadDocumentRequests();
          console.log('🔍 [STUDENT_DETAILS] loadDocumentRequests concluída');
        }
      } else {
        console.log('🔍 [STUDENT_DETAILS] NÃO entrando no if - applicationsList vazio ou null');
        console.log('🔍 [STUDENT_DETAILS] applicationsList:', applicationsList);
      }

      // Carregar documentos do estudante (independente de ter aplicação)
      console.log('🔍 [STUDENT_DETAILS] Chamando loadStudentDocuments...');
      await loadStudentDocuments(profileId);
      console.log('🔍 [STUDENT_DETAILS] loadStudentDocuments concluída');

      // Carregar document requests novamente (caso não tenha sido carregado antes)
      if (!scholarshipApplication?.id) {
        console.log('🔍 [STUDENT_DETAILS] Chamando loadDocumentRequests novamente (sem scholarshipApplication)...');
        await loadDocumentRequests();
        console.log('🔍 [STUDENT_DETAILS] loadDocumentRequests concluída (segunda chamada)');
      }

       console.log('🚀 [STUDENT_DETAILS] loadStudentDetails concluída com sucesso');

    } catch (err) {
      console.error('❌ [STUDENT_DETAILS] Erro ao carregar detalhes do estudante:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      console.log('🔍 [STUDENT_DETAILS] loadStudentDetails finalizada (finally)');
    }
  };

  // Funções utilitárias do DocumentsView
  const getDocumentInfo = (upload: any) => {
    const baseUrl = 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/document-attachments/';
    
    let filename = 'Document';
    if (upload.file_url) {
      const urlParts = upload.file_url.split('/');
      filename = urlParts[urlParts.length - 1] || 'Document';
    }
    
    const fullUrl = upload.file_url ? `${baseUrl}${upload.file_url}` : null;
    
    console.log('🔗 [DOCUMENT VIEW] URL construction:', {
      original: upload.file_url,
      baseUrl,
      fullUrl,
      filename
    });
    
    return {
      filename,
      fullUrl
    };
  };

  const getAcceptanceLetterUrl = (application: any) => {
    if (!application?.acceptance_letter_url) return null;
    
    if (application.acceptance_letter_url.startsWith('http')) {
      return application.acceptance_letter_url;
    }
    
    const baseUrl = 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/document-attachments/';
    return `${baseUrl}${application.acceptance_letter_url}`;
  };

  // Buscar a aplicação real com acceptance letter
  useEffect(() => {
    const fetchRealApplication = async () => {
      if (scholarshipApplication?.acceptance_letter_url) {
        setRealScholarshipApplication(scholarshipApplication);
      return;
    }

      if (studentDocuments && studentDocuments.length > 0) {
        setLoadingApplication(true);
        try {
          let applications = null;
          let error = null;
          
          if (scholarshipApplication?.id) {
            console.log('🔍 [DOCUMENTS VIEW] Checking existing application:', scholarshipApplication.id);
            const { data, error: appError } = await supabase
              .from('scholarship_applications')
              .select(`
                *,
                scholarships (
                  id,
                  title,
                  universities (
                    id,
                    name
                  )
                )
              `)
              .eq('id', scholarshipApplication.id)
              .single();
            
            if (!appError && data) {
              console.log('✅ [DOCUMENTS VIEW] Found existing application:', data);
              applications = [data];
            }
          }
          
          if (!applications || applications.length === 0) {
            console.log('🔍 [DOCUMENTS VIEW] Searching for application with acceptance letter...');
            
            const { data: odinaApp, error: odinaError } = await supabase
              .from('scholarship_applications')
              .select(`
                *,
                scholarships (
                  id,
                  title,
                  universities (
                    id,
                    name
                  )
                )
              `)
              .eq('is_application_fee_paid', true)
              .not('acceptance_letter_url', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (!odinaError && odinaApp && odinaApp.length > 0) {
              console.log('✅ [DOCUMENTS VIEW] Found application with acceptance letter:', odinaApp);
              applications = odinaApp;
              error = null;
        } else {
              console.log('⚠️ [DOCUMENTS VIEW] No application with acceptance letter found, trying paid applications...');
              
              const { data, error: paidAppError } = await supabase
                .from('scholarship_applications')
                .select(`
                  *,
                  scholarships (
                    id,
                    title,
                    universities (
                      id,
                      name
                    )
                  )
                `)
                .eq('is_application_fee_paid', true)
                .order('created_at', { ascending: false })
                .limit(1);
            
              if (!paidAppError && data && data.length > 0) {
                console.log('✅ [DOCUMENTS VIEW] Found application with paid fee:', data);
                applications = data;
                error = null;
              }
            }
          }

          if (!error && applications && applications.length > 0) {
            const app = applications[0];
            console.log('🔍 [DOCUMENTS VIEW] Found real application:', app);
            console.log('🔍 [DOCUMENTS VIEW] Acceptance letter URL:', app.acceptance_letter_url);
            setRealScholarshipApplication(app);
          }
        } catch (error) {
          console.error('Error fetching real application:', error);
        } finally {
          setLoadingApplication(false);
        }
      }
    };

    fetchRealApplication();
  }, [scholarshipApplication, studentDocuments]);

  // Usar a aplicação real se disponível, senão usar a passada como prop
  const currentApplication = realScholarshipApplication || scholarshipApplication;
  
  // Debug: mostrar qual aplicação está sendo usada
  useEffect(() => {
    console.log('🔍 [DOCUMENTS VIEW] Current application:', currentApplication);
    console.log('🔍 [DOCUMENTS VIEW] Has acceptance letter:', !!currentApplication?.acceptance_letter_url);
    if (currentApplication?.acceptance_letter_url) {
      console.log('🔍 [DOCUMENTS VIEW] Acceptance letter URL:', currentApplication.acceptance_letter_url);
    }
  }, [currentApplication]);

  // Carregar dados quando o studentId mudar
  useEffect(() => {
    console.log('🔍 [STUDENT_DETAILS] useEffect disparado com studentId:', studentId);
    if (studentId) {
      console.log('🔍 [STUDENT_DETAILS] Chamando loadStudentDetails...');
      loadStudentDetails();
    }
  }, [studentId]); // Remover loadStudentDetails das dependências

  const loadDocumentRequests = useCallback(async () => {
    console.log('🔍 [STUDENT_DETAILS] loadDocumentRequests iniciada');
    console.log('🔍 [STUDENT_DETAILS] studentInfo?.student_id:', studentInfo?.student_id);
    console.log('🔍 [STUDENT_DETAILS] scholarshipApplication:', scholarshipApplication);
    console.log('🔍 [STUDENT_DETAILS] scholarshipApplication?.id:', scholarshipApplication?.id);
    
    if (!studentInfo?.student_id) {
      console.log('🔍 [STUDENT_DETAILS] Sem student_id, retornando');
      return;
    }

    try {
      // Buscar requests específicos para este estudante (individual) - só se tiver scholarshipApplication
      let specificRequests = [];
      if (scholarshipApplication?.id) {
        const { data: specificData, error: specificError } = await supabase
          .from('document_requests')
          .select('*')
          .eq('scholarship_application_id', scholarshipApplication.id)
          .not('is_global', 'is', true);
        
        if (specificError) {
          console.log('❌ [DOCUMENT REQUEST] Error fetching specific requests:', specificError);
        } else {
          console.log('✅ [DOCUMENT REQUEST] Specific requests found:', specificData);
          specificRequests = specificData || [];
        }
      } else {
        console.log('⚠️ [STUDENT_DETAILS] No scholarshipApplication.id, skipping specific requests');
      }

      // Buscar global requests se tiver university_id
      let globalRequests = [];
      if (scholarshipApplication?.scholarships?.universities?.id) {
        const universityId = scholarshipApplication.scholarships.universities.id;
        console.log('🔍 [STUDENT_DETAILS] Buscando global requests para university_id:', universityId);
        
        const { data: globalData, error: globalError } = await supabase
          .from('document_requests')
          .select('*')
          .eq('university_id', universityId)
          .eq('is_global', true);
        
        if (globalError) {
          console.log('❌ [DOCUMENT REQUEST] Error fetching global requests:', globalError);
        } else {
          console.log('✅ [DOCUMENT REQUEST] Global requests found:', globalData);
          globalRequests = globalData || [];
        }
      } else {
        console.log('⚠️ [STUDENT_DETAILS] No university_id available, skipping global requests');
      }

      // Combinar requests específicos e globais
      const allRequests = [...specificRequests, ...globalRequests];
      console.log('🔍 [STUDENT_DETAILS] All requests combined:', allRequests);

      // Buscar uploads do estudante para estes requests
      const requestIds = allRequests.map(r => r.id);
      const { data: uploadsForStudent, error: uploadsError } = await supabase
          .from('document_request_uploads')
          .select(`
            *,
          document_requests (
              id,
              title,
              description,
              created_at,
              is_global,
              university_id,
              scholarship_application_id,
              attachment_url,
              due_date
            )
          `)
        .eq('uploaded_by', studentInfo.student_id)
        .in('document_request_id', requestIds);
      
      if (uploadsError) {
        console.log('❌ [DOCUMENT REQUEST] Error fetching uploads:', uploadsError);
      } else {
        console.log('✅ [DOCUMENT REQUEST] Uploads found:', uploadsForStudent);
      }
      
      // Organizar os uploads por request
      let uploads = uploadsForStudent || [];

      console.log('📋 [DOCUMENT REQUEST] Final uploads count:', uploads.length);

      // Estruturar os documentos
        const documentRequestsMap = new Map();
        
        // Primeiro, adicionar os requests encontrados (específicos + globais)
        if (allRequests && allRequests.length > 0) {
          allRequests.forEach(request => {
            documentRequestsMap.set(request.id, {
              id: request.id,
              title: request.title,
              description: request.description,
              is_global: request.is_global,
              status: 'open',
              attachment_url: request.attachment_url,
              due_date: request.due_date,
            uploads: []
            });
          });
        }
        
        // Por fim, distribuir os uploads pelos requests correspondentes
        uploads.forEach(upload => {
          const requestId = upload.document_request_id;
          if (requestId && documentRequestsMap.has(requestId)) {
            // Formatar o upload para exibição
            let filename = 'Document';
            if (upload.file_url) {
              const urlParts = upload.file_url.split('/');
              filename = urlParts[urlParts.length - 1] || 'Document';
            }
            
            const formattedUpload = {
              id: upload.id,
              filename: filename,
              file_url: upload.file_url,
              status: upload.status || 'under_review',
              uploaded_at: upload.uploaded_at || upload.created_at,
              request_title: documentRequestsMap.get(requestId)?.title || 'Document Request',
              request_description: documentRequestsMap.get(requestId)?.description || '',
              request_created_at: documentRequestsMap.get(requestId)?.created_at || upload.created_at,
              is_global: documentRequestsMap.get(requestId)?.is_global || false,
              request_type: 'document',
            is_acceptance_letter: false,
            document_request_id: requestId
            };
            
          documentRequestsMap.get(requestId).uploads.push(formattedUpload);
          }
        });
        
        const finalDocumentRequests = Array.from(documentRequestsMap.values());
        console.log('🎯 [DOCUMENT REQUEST] Final document requests:', finalDocumentRequests);
      
      // Só atualizar se os dados realmente mudaram
        if (JSON.stringify(finalDocumentRequests) !== JSON.stringify(documentRequests)) {
          setDocumentRequests(finalDocumentRequests);
      }
      
    } catch (error) {
      console.error("❌ [DOCUMENT REQUEST] Error in document requests logic:", error);
      if (documentRequests.length > 0) {
        setDocumentRequests([]);
      }
    }
  }, [scholarshipApplication?.id, scholarshipApplication?.scholarships?.universities?.id, studentInfo?.student_id, documentRequests, currentApplication]);

  const loadStudentDocuments = async (targetStudentId?: string) => {
    console.log('🚀 [STUDENT_DETAILS] loadStudentDocuments INICIADA');
    const studentIdToUse = targetStudentId || studentId;
    
    try {
      console.log('🚀 [STUDENT_DETAILS] loadStudentDocuments iniciada');
      console.log('=== [STUDENT_DETAILS] studentId recebido:', targetStudentId);
      console.log('=== [STUDENT_DETAILS] studentId do estado:', studentId);
      console.log('=== [STUDENT_DETAILS] studentIdToUse final:', studentIdToUse);
      console.log('=== [STUDENT_DETAILS] Buscando documentos para estudante:', studentIdToUse);
      
      // Buscar documentos da tabela scholarship_applications onde estão os documentos
      console.log('🔍 [STUDENT_DETAILS] Executando query Supabase...');
      console.log('🔍 [STUDENT_DETAILS] Query: SELECT * FROM scholarship_applications WHERE student_id =', studentIdToUse);
      console.log('🔍 [STUDENT_DETAILS] studentIdToUse tipo:', typeof studentIdToUse);
      console.log('🔍 [STUDENT_DETAILS] studentIdToUse valor:', studentIdToUse);
      
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('scholarship_applications')
        .select('id, documents, created_at')
        .eq('student_id', studentIdToUse)
        .order('created_at', { ascending: false });
      
      console.log('🔍 [STUDENT_DETAILS] Query executada. Resultado:', { applicationsData, applicationsError });
      console.log('🔍 [STUDENT_DETAILS] applicationsData tipo:', typeof applicationsData);
      console.log('🔍 [STUDENT_DETAILS] applicationsData é array:', Array.isArray(applicationsData));

      if (applicationsError) {
        console.error('❌ [STUDENT_DETAILS] Erro ao buscar aplicações:', applicationsError);
        setStudentDocuments([]);
        setDocumentsLoaded(true);
        return;
      }

      console.log('=== [STUDENT_DETAILS] Aplicações encontradas:', applicationsData);

      if (!applicationsData || applicationsData.length === 0) {
        console.log('=== [STUDENT_DETAILS] Nenhuma aplicação encontrada');
        console.log('=== [STUDENT_DETAILS] applicationsData:', applicationsData);
        setStudentDocuments([]);
        setDocumentsLoaded(true);
        console.log('🔍 [STUDENT_DETAILS] documentsLoaded definido como true (sem aplicações)');
        return;
      }

      // Extrair documentos de todas as aplicações
      let allDocuments: any[] = [];
      
      applicationsData.forEach(application => {
        if (application.documents && Array.isArray(application.documents)) {
          console.log('🔍 [STUDENT_DETAILS] Documentos da aplicação:', application.id, application.documents);
          
          const appDocuments = application.documents.map((doc: any, index: number) => ({
            id: `${application.id}_${index}`,
            type: doc.type || doc.document_type,
            document_type: doc.type || doc.document_type,
            file_url: doc.file_url || doc.url,
            document_url: doc.file_url || doc.url,
            status: doc.status || 'pending',
            uploaded_at: doc.uploaded_at || doc.created_at || application.created_at,
            approved_at: doc.approved_at,
            application_id: application.id,
            title: doc.type ? doc.type.charAt(0).toUpperCase() + doc.type.slice(1) : 'Document',
            description: `Document uploaded for university review`,
            request_created_at: doc.uploaded_at || doc.created_at || application.created_at,
            is_global: false,
            request_type: 'Student Document'
          }));
          
          allDocuments = [...allDocuments, ...appDocuments];
        }
      });
      
      console.log('🔍 [STUDENT_DETAILS] Total de documentos extraídos:', allDocuments.length);
      console.log('🔍 [STUDENT_DETAILS] Documentos extraídos:', allDocuments);

      // Formatar os documentos para exibição (igual ao da universidade)
      const formattedDocuments = allDocuments;

      console.log('=== [STUDENT_DETAILS] Documentos formatados:', formattedDocuments);

      // Atualizar scholarshipApplication com os documentos
      setScholarshipApplication(prev => prev ? {
        ...prev,
        documents: formattedDocuments
      } : null);
      
      // Também definir studentDocuments para compatibilidade
      console.log('🔍 [STUDENT_DETAILS] Definindo studentDocuments no estado:', formattedDocuments);
      setStudentDocuments(formattedDocuments);
      setDocumentsLoaded(true);
      console.log('🔍 [STUDENT_DETAILS] studentDocuments definido com sucesso');
      console.log('🔍 [STUDENT_DETAILS] documentsLoaded definido como true');

    } catch (err) {
      console.error('❌ [STUDENT_DETAILS] Erro ao carregar documentos do estudante:', err);
      console.error('❌ [STUDENT_DETAILS] Detalhes do erro:', err);
      // IMPORTANTE: Definir documentsLoaded como true mesmo em caso de erro
      setDocumentsLoaded(true);
      console.log('🔍 [STUDENT_DETAILS] documentsLoaded definido como true (após erro)');
    }
    
    console.log('🚀 [STUDENT_DETAILS] loadStudentDocuments concluída');
    console.log('🔍 [STUDENT_DETAILS] Estado final - documentsLoaded:', documentsLoaded);
  };

  // Recarregar documentos quando o studentInfo mudar
  useEffect(() => {
    if (studentInfo?.student_id) {
      loadDocumentRequests();
    }
  }, [studentInfo?.student_id]); 

  // Remover este useEffect duplicado - os documentos já são carregados em loadStudentDetails

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Função para buscar o documento mais recente por tipo
  const latestDocByType = (type: string) => {
    console.log('=== DEBUG latestDocByType ===');
    console.log('Tipo buscado:', type);
    console.log('scholarshipApplication?.documents:', scholarshipApplication?.documents);
    console.log('studentDocuments:', studentDocuments);
    console.log('Loading state:', loading);
    console.log('DocumentsLoaded state:', documentsLoaded);
    
    // Se ainda está carregando ou documentos não foram carregados, retornar null
    if (loading || !documentsLoaded) {
      console.log('Ainda carregando ou documentos não carregados, retornando null');
      console.log('Loading:', loading, 'DocumentsLoaded:', documentsLoaded);
      return null;
    }
    
    // Primeiro, tentar buscar nos documentos da aplicação
    const docs = (scholarshipApplication as any)?.documents as any[] | undefined;
    console.log('Documentos da aplicação:', docs);
    
    if (Array.isArray(docs) && docs.length > 0) {
      // Buscar por document_type (campo principal)
      let appDoc = docs.find((d) => d.document_type === type);
      
      // Se não encontrar, tentar por outros campos
      if (!appDoc) {
        appDoc = docs.find((d) => 
          d.type === type ||
          d.title?.toLowerCase().includes(type.toLowerCase()) ||
          d.description?.toLowerCase().includes(type.toLowerCase())
        );
      }
      
      if (appDoc) {
        console.log('Documento encontrado na aplicação:', appDoc);
        return { 
          id: appDoc.id || `${type}`, 
          type, 
          file_url: appDoc.file_url || appDoc.document_url || appDoc.url, 
          status: appDoc.status || 'under_review',
          uploaded_at: appDoc.uploaded_at || appDoc.created_at || null
        };
      }
    }
    
    // Fallback: buscar nos documentos do estudante
    if (Array.isArray(studentDocuments) && studentDocuments.length > 0) {
      const fallbackDoc = studentDocuments.find((d) => 
        d.document_type === type ||
        d.type === type ||
        d.title?.toLowerCase().includes(type.toLowerCase()) ||
        d.description?.toLowerCase().includes(type.toLowerCase())
      );
      
      if (fallbackDoc) {
        console.log('Documento encontrado no fallback:', fallbackDoc);
        return {
          ...fallbackDoc,
          type,
          file_url: fallbackDoc.file_url || fallbackDoc.document_url,
          uploaded_at: fallbackDoc.uploaded_at || fallbackDoc.created_at || null
        };
      }
    }
    
    console.log('Nenhum documento encontrado para o tipo:', type);
    return null;
  };

  // Informações dos documentos principais
  const DOCUMENTS_INFO = [
    {
      key: 'passport',
      label: 'Passport',
      description: 'A valid copy of the student\'s passport. Used for identification and visa purposes.'
    },
    {
      key: 'diploma',
      label: 'High School Diploma',
      description: 'Proof of high school graduation. Required for university admission.'
    },
    {
      key: 'funds_proof',
      label: 'Proof of Funds',
      description: 'A bank statement or financial document showing sufficient funds for study.'
    }
  ];

  // Funções para manipular documentos
  const handleViewDocument = (doc: any) => {
    console.log('=== DEBUG handleViewDocument ===');
    console.log('Documento recebido:', doc);
    
    // Verificar se o documento existe e tem file_url
    if (!doc || !doc.file_url) {
      console.log('Documento ou file_url está vazio ou undefined');
      console.log('Documento:', doc);
      console.log('file_url:', doc?.file_url);
      return;
    }
    
    console.log('file_url:', doc.file_url);
    console.log('Tipo de file_url:', typeof doc.file_url);
    
    // Converter a URL do storage para URL pública
    try {
      // Se file_url é um path do storage, converter para URL pública
      if (doc.file_url && !doc.file_url.startsWith('http')) {
        const publicUrl = supabase.storage
          .from('student-documents')
          .getPublicUrl(doc.file_url)
          .data.publicUrl;
        
        console.log('URL pública gerada:', publicUrl);
        setPreviewUrl(publicUrl);
      } else {
        // Se já é uma URL completa, usar diretamente
        console.log('Usando URL existente:', doc.file_url);
        setPreviewUrl(doc.file_url);
      }
    } catch (error) {
      console.error('Erro ao gerar URL pública:', error);
      // Fallback: tentar usar a URL original
      setPreviewUrl(doc.file_url);
    }
  };

  const handleDownloadDocument = (doc: any) => {
    if (doc?.file_url) {
      try {
        // Se file_url é um path do storage, converter para URL pública
        let downloadUrl = doc.file_url;
        if (!doc.file_url.startsWith('http')) {
          const publicUrl = supabase.storage
            .from('student-documents')
            .getPublicUrl(doc.file_url)
            .data.publicUrl;
          downloadUrl = publicUrl;
        }
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${doc.type || doc.document_type || 'document'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Erro ao fazer download:', error);
        // Fallback: tentar usar a URL original
        const link = document.createElement('a');
        link.href = doc.file_url;
        link.download = `${doc.type || doc.document_type || 'document'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="h-32 w-32 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Student</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => loadStudentDetails()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!studentInfo) {
    console.log('🔍 [STUDENT_DETAILS] studentInfo é null/undefined');
    console.log('🔍 [STUDENT_DETAILS] Loading state:', loading);
    console.log('🔍 [STUDENT_DETAILS] Error state:', error);
    console.log('🔍 [STUDENT_DETAILS] studentId:', studentId);
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <User className="h-32 w-32 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Not Found</h2>
          <p className="text-gray-600">The requested student could not be found.</p>
          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}
          {loading && (
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#05294E] mx-auto mb-2"></div>
              <p className="text-slate-600">Loading student data...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Se um estudante está selecionado, mostrar detalhes
  console.log('🔍 [STUDENT_DETAILS] Renderizando componente com studentInfo:', studentInfo);
  console.log('🔍 [STUDENT_DETAILS] application_status no render:', studentInfo?.application_status);
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-slate-200 rounded-t-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-4 min-w-0 w-full">
              <button
                onClick={() => onBack ? onBack() : navigate(-1)}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors py-2 px-3 rounded-lg hover:bg-slate-100 mb-4 sm:mb-0 w-full sm:w-auto "
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm md:text-base">Back to list</span>
              </button>
              <div className="min-w-0 w-full">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight break-words">
                  Student Application
                </h1>
                <p className="mt-1 text-sm text-slate-600 break-words">
                  Review and manage {studentInfo.full_name}'s application details
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 sm:justify-end flex-wrap">
              <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200 whitespace-nowrap shrink-0">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {scholarshipApplication?.status === 'enrolled' ? 'Enrolled' : 'Active'}
              </div>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                  title="Refresh student data"
                  aria-label="Refresh student data"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-300 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto" role="tablist">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-[#05294E] text-[#05294E]' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
                onClick={() => setActiveTab(tab.id as any)}
                type="button"
                aria-selected={activeTab === tab.id}
                role="tab"
              >
                <tab.icon className={`w-5 h-5 mr-2 transition-colors ${
                  activeTab === tab.id ? 'text-[#05294E]' : 'text-slate-400 group-hover:text-slate-600'
                }`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Conteúdo das abas */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 space-y-6">
              {/* Student Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#0a4a7a] px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <User className="w-6 h-6 mr-3" />
                    Student Information
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Personal Details</h3>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Full Name</dt>
                          <dd className="text-base font-semibold text-slate-900 mt-1">{studentInfo.full_name}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Email</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentInfo.email || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Phone</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentInfo.phone || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Country</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentInfo.country || 'Not specified'}</dd>
                        </div>
                      </div>
                    </div>

                    {/* Academic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Academic Profile</h3>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Field of Interest</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentInfo.field_of_interest || 'Not specified'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Academic Level</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentInfo.academic_level || 'Not specified'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">GPA</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentInfo.gpa || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">English Proficiency</dt>
                          <dd className="text-base text-slate-900 mt-1">{studentInfo.english_proficiency || 'Not specified'}</dd>
                        </div>
                      </div>
                    </div>

                    {/* Application & Status */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Application Status</h3>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Student Type</dt>
                          <dd className="text-base text-slate-900 mt-1">
                            {studentInfo.student_process_type ? (
                              studentInfo.student_process_type === 'initial' ? 'Initial - F-1 Visa Required' :
                              studentInfo.student_process_type === 'transfer' ? 'Transfer - Current F-1 Student' :
                              studentInfo.student_process_type === 'change_of_status' ? 'Change of Status - From Other Visa' :
                              studentInfo.student_process_type
                            ) : (
                              <span className="text-slate-500 italic">Not specified</span>
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Application Fee</dt>
                          <dd className="mt-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                studentInfo.is_application_fee_paid ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              <span className={`text-sm font-medium ${
                                studentInfo.is_application_fee_paid ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {studentInfo.is_application_fee_paid ? 'Paid' : 'Pending'}
                              </span>
                            </div>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Documents Status</dt>
                          <dd className="mt-1">
                            <div className="flex items-center space-x-2">
                              {(() => {
                                // Calcular status baseado nos documentos disponíveis (prioriza props recentes)
                                const requiredDocs = ['passport', 'diploma', 'funds_proof'];
                                const appDocuments = (studentInfo as any)?.documents || [];
                                const docsFromProps = Array.isArray(studentDocuments) ? studentDocuments : [];
                                
                                let documentsStatus: string | undefined = undefined;
                                
                                // Preferir documentos vindos por props (estão mais atualizados)
                                if (Array.isArray(docsFromProps) && docsFromProps.length > 0) {
                                  const allApproved = requiredDocs.every((t) => {
                                    const d = docsFromProps.find((x: any) => x.type === t);
                                    return d && (d.status || '').toLowerCase() === 'approved';
                                  });
                                  if (allApproved) {
                                    documentsStatus = 'approved';
                                  } else {
                                    const hasChanges = requiredDocs.some((t) => {
                                      const d = docsFromProps.find((x: any) => x.type === t);
                                      return d && (d.status || '').toLowerCase() === 'changes_requested';
                                    });
                                    if (hasChanges) {
                                      documentsStatus = 'changes_requested';
                                    } else {
                                      const anySubmitted = requiredDocs.some((t) => {
                                        const d = docsFromProps.find((x: any) => x.type === t);
                                        return !!d && !!(d.file_url || d.url);
                                      });
                                      documentsStatus = anySubmitted ? 'under_review' : 'pending';
                                    }
                                  }
                                } else if (Array.isArray(appDocuments) && appDocuments.length > 0) {
                                  // Fallback para documentos do studentInfo
                                  const allApproved = requiredDocs.every((t) => {
                                    const d = appDocuments.find((x: any) => x.type === t);
                                    return d && (d.status || '').toLowerCase() === 'approved';
                                  });
                                  if (allApproved) {
                                    documentsStatus = 'approved';
                                  } else {
                                    const hasChanges = requiredDocs.some((t) => {
                                      const d = appDocuments.find((x: any) => x.type === t);
                                      return d && (d.status || '').toLowerCase() === 'changes_requested';
                                    });
                                    if (hasChanges) {
                                      documentsStatus = 'changes_requested';
                                    } else {
                                      const anySubmitted = requiredDocs.some((t) => {
                                        const d = appDocuments.find((x: any) => x.type === t);
                                        return !!d && !!(d.file_url || d.url);
                                      });
                                      documentsStatus = anySubmitted ? 'under_review' : 'pending';
                                    }
                                  }
                                } else {
                                  // Último recurso: usar documents_status vindo do perfil
                                  documentsStatus = studentInfo?.documents_status || 'pending';
                                }
                                
                                const statusDisplay = getDocumentStatusDisplay(documentsStatus);
                                return (
                                  <>
                                    <div className={`w-2 h-2 rounded-full ${statusDisplay.bgColor}`}></div>
                                    <span className={`text-sm font-medium ${statusDisplay.color}`}>
                                      {statusDisplay.text}
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Enrollment Status</dt>
                          <dd className="mt-1">
                            {(() => {
                              const acceptanceStatus = (studentInfo as any)?.acceptance_letter_status as string | undefined;
                              const appStatus = (studentInfo as any)?.status || (studentInfo as any)?.application_status as string | undefined;
                              const documentsStatus = (studentInfo as any)?.documents_status as string | undefined;
                              
                              // Debug logs
                              console.log('🔍 [ENROLLMENT_STATUS] Debug:', {
                                acceptanceStatus,
                                appStatus,
                                documentsStatus,
                                studentInfo: studentInfo
                              });
                              
                              // Para usuários com aplicação de bolsa: verificar status da aplicação
                              // Para usuários sem aplicação de bolsa: verificar documents_status
                              const isEnrolled = appStatus === 'enrolled' || 
                                                acceptanceStatus === 'approved' || 
                                                (documentsStatus === 'approved' && !appStatus);
                              const label = isEnrolled ? 'Enrolled' : 'Pending Acceptance';
                              const color = isEnrolled ? 'text-green-700' : 'text-yellow-700';
                              const dot = isEnrolled ? 'bg-green-500' : 'bg-yellow-500';
                              
                              console.log('🔍 [ENROLLMENT_STATUS] Result:', { isEnrolled, label });
                              
                              return (
                              <div className="flex items-center space-x-2">
                                  <div className={`w-2 h-2 rounded-full ${dot}`}></div>
                                  <span className={`text-sm font-medium ${color}`}>{label}</span>
                              </div>
                              );
                            })()}
                          </dd>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scholarship Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-slate-700 to-slate-800 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Scholarship Details
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">Scholarship Program</dt>
                        <dd className="text-lg font-semibold text-slate-900">
                          {studentInfo.scholarship_title || 'Scholarship information not available'}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">University</dt>
                        <dd className="text-lg font-semibold text-slate-900">
                          {studentInfo.university_name || 'University not specified'}
                        </dd>
                      </div>
                    </div>
                                         <div className="flex items-start space-x-3">
                       <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                       <div className="flex-1">
                         <dt className="text-sm font-medium text-slate-600">Application Status</dt>
                         <dd className="text-base text-slate-700">
                           {(() => {
                             console.log('🔍 [STUDENT_DETAILS] Renderizando Application Status:');
                             console.log('🔍 [STUDENT_DETAILS] studentInfo:', studentInfo);
                             console.log('🔍 [STUDENT_DETAILS] studentInfo.application_status:', studentInfo?.application_status);
                             console.log('🔍 [STUDENT_DETAILS] Tipo do application_status:', typeof studentInfo?.application_status);
                             console.log('🔍 [STUDENT_DETAILS] studentInfo completo:', JSON.stringify(studentInfo, null, 2));
                             
                             if (studentInfo?.application_status) {
                               const formattedStatus = studentInfo.application_status.charAt(0).toUpperCase() + studentInfo.application_status.slice(1);
                               console.log('🔍 [STUDENT_DETAILS] Status formatado:', formattedStatus);
                               return formattedStatus;
                             } else {
                               console.log('🔍 [STUDENT_DETAILS] Status não disponível, mostrando fallback');
                               return 'Status not available';
                             }
                           })()}
                         </dd>
                       </div>
                     </div>
                  </div>
                </div>
              </div>

                            {/* Student Documents Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Student Documents
                  </h2>
                  <p className="text-slate-200 text-sm mt-1">Review each document and their current status</p>
                </div>
                <div className="p-6">
                  {loading || !documentsLoaded ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E] mx-auto mb-4"></div>
                      <p className="text-slate-600">Loading documents...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {DOCUMENTS_INFO.map((doc, index) => {
                        const d = latestDocByType(doc.key);
                        const status = d?.status || 'not_submitted';
                      
                      return (
                        <div key={doc.key}>
                          <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200">
                            <div className="flex flex-col sm:flex-row items-start gap-4">
                              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap gap-2 mb-1">
                                  <p className="font-medium text-slate-900 break-words">{doc.label}</p>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                    status === 'approved' ? 'bg-green-100 text-green-800' :
                                    status === 'changes_requested' ? 'bg-red-100 text-red-800' :
                                    status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-slate-100 text-slate-700'
                                  }`}>
                                    {status === 'approved' ? 'Approved' :
                                     status === 'changes_requested' ? 'Changes Requested' :
                                     status === 'under_review' ? 'Under Review' :
                                     d?.file_url ? 'Submitted' : 'Not Submitted'}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600 break-words">{doc.description}</p>
                                {d?.file_url && (
                                  <p className="text-xs text-slate-400 mt-1">
                                    Uploaded: {d.uploaded_at ? formatDate(d.uploaded_at) : new Date().toLocaleDateString()}
                                  </p>
                                )}
                                
                                {/* Botões de ação */}
                                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                                  {d?.file_url && (
                                    <button 
                                      onClick={() => handleViewDocument(d)}
                                      className="bg-[#05294E] hover:bg-[#041f38] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                                    >
                                      View Document
                                    </button>
                                  )}
                                  {d?.file_url && (
                                    <button 
                                      onClick={() => handleDownloadDocument(d)}
                                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                                    >
                                      Download
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {index < DOCUMENTS_INFO.length - 1 && (
                            <div className="border-t border-slate-200"></div>
                          )}
                        </div>
                      );
                    })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="xl:col-span-4 space-y-4">
              {/* Quick Stats Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#041f38] px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Application Summary</h3>
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Submitted</span>
                    <span className="text-sm text-slate-900">
                      {formatDate(studentInfo.registration_date)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-slate-600 to-slate-700 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-900">Application submitted</p>
                        <p className="text-xs text-slate-500">{formatDate(studentInfo.registration_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-900">Last updated</p>
                        <p className="text-xs text-slate-500">{formatDate(studentInfo.registration_date)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-slate-500 to-slate-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveTab('documents')}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-slate-600" />
                        <span className="text-sm font-medium text-slate-900">Documents</span>
                      </div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Scholarship Range Management Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#0a4a7a] px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Scholarship Range</h3>
                    {!isEditingPackage && (
                      <button
                        onClick={handleStartEditPackage}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                        title="Edit scholarship range"
                      >
                        <Edit3 className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  {isEditingPackage ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Select Scholarship Range
                        </label>
                        <div className="space-y-2">
                          {[3800, 4200, 4500, 5000, 5500].map((range) => (
                            <div
                              key={`range-${range}`}
                              className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                selectedPackageId === `range-${range}`
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => setSelectedPackageId(`range-${range}`)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold text-slate-900">Scholarship Range ${range}+</h4>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSavePackageChange}
                          disabled={isUpdatingPackage || !selectedPackageId}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isUpdatingPackage ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Save
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleCancelEditPackage}
                          disabled={isUpdatingPackage}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {studentPackageFees ? (
                        <>
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-blue-900">{studentPackageFees.package_name}</h4>
                              <span className="text-sm text-blue-600">Current</span>
                            </div>
                          </div>
                          <div className="text-xs text-slate-500 text-center">
                            Click edit to change scholarship range
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <div className="text-slate-400 mb-2">No scholarship range set</div>
                          <div className="text-sm text-slate-500">Click edit to set scholarship range</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Fee Status Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r rounded-t-2xl from-slate-500 to-slate-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Fee Status</h3>
                </div>
                <div className="p-6">
                                     <div className="space-y-3">
                     {/* Selection Process Fee Status */}
                     <div className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200">
                       <div className="flex items-center justify-between w-full">
                         <div className="flex items-center space-x-3">
                           <div className={`w-3 h-3 rounded-full ${studentInfo?.has_paid_selection_process_fee ? 'bg-green-500' : 'bg-red-500'}`}></div>
                           <span className="text-sm font-medium text-slate-900">Selection Process Fee</span>
                         </div>
                         <div className="flex flex-col items-end">
                           <span className={`text-sm font-medium ${studentInfo?.has_paid_selection_process_fee ? 'text-green-700' : 'text-red-700'}`}>
                             {studentInfo?.has_paid_selection_process_fee ? 'Paid' : 'Pending'}
                           </span>
                           <span className="text-xs text-slate-500">
                             {(() => {
                               // Se há override, usar valor direto (NÃO incluir dependentes)
                               // Se não há override, somar dependentes ao valor padrão
                               const hasCustomOverride = hasOverride('selection_process');
                               if (hasCustomOverride) {
                                 // Com override: usar valor exato do override
                                 return formatFeeAmount(getFeeAmount('selection_process'));
                               } else {
                                 // Sem override: valor padrão + dependentes
                                 const baseFee = Number(getFeeAmount('selection_process'));
                                 const total = baseFee + (dependents * 150);
                                 return formatFeeAmount(total);
                               }
                             })()}
                           </span>
                         </div>
                       </div>
                     </div>

                     {/* Application Fee Status */}
                     <div className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200">
                       <div className="flex items-center space-x-3">
                         <div className={`w-3 h-3 rounded-full ${studentInfo?.is_application_fee_paid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                         <span className="text-sm font-medium text-slate-900">Application Fee</span>
                       </div>
                       <div className="flex flex-col items-end">
                         <span className={`text-sm font-medium ${studentInfo?.is_application_fee_paid ? 'text-green-700' : 'text-red-700'}`}>
                           {studentInfo?.is_application_fee_paid ? 'Paid' : 'Pending'}
                         </span>
                         <span className="text-xs text-slate-500">
                           {(() => {
                             if (studentInfo?.scholarship?.application_fee_amount) {
                               const amount = Number(studentInfo.scholarship.application_fee_amount);
                               return formatFeeAmount(amount);
                             } else if ((studentInfo as any)?.application_fee_amount) {
                               const amount = Number((studentInfo as any).application_fee_amount);
                               return formatFeeAmount(amount);
                             } else {
                               return formatFeeAmount(getFeeAmount('application_fee'));
                             }
                           })()}
                         </span>
                       </div>
                     </div>

                     {/* Scholarship Fee Status */}
                     <div className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200">
                       <div className="flex items-center space-x-3">
                         <div className={`w-3 h-3 rounded-full ${studentInfo?.is_scholarship_fee_paid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                         <span className="text-sm font-medium text-slate-900">Scholarship Fee</span>
                       </div>
                       <div className="flex flex-col items-end">
                         <span className={`text-sm font-medium ${studentInfo?.is_scholarship_fee_paid ? 'text-green-700' : 'text-red-700'}`}>
                           {studentInfo?.is_scholarship_fee_paid ? 'Paid' : 'Pending'}
                         </span>
                         <span className="text-xs text-slate-500">
                           {(() => {
                             // Priorizar override do usuário se existir
                             if (hasOverride('scholarship_fee')) {
                               return formatFeeAmount(getFeeAmount('scholarship_fee'));
                             }
                             // Se não há override, usar valor da scholarship específica se disponível
                             if (studentInfo?.scholarship?.scholarship_fee_amount) {
                               const amount = Number(studentInfo.scholarship.scholarship_fee_amount);
                               return formatFeeAmount(amount);
                             }
                             // Fallback para valor padrão
                             return formatFeeAmount(getFeeAmount('scholarship_fee'));
                           })()}
                         </span>
                       </div>
                     </div>

                     {/* I-20 Control Fee Status */}
                     <div className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200">
                       <div className="flex items-center justify-between w-full">
                         <div className="flex items-center space-x-3">
                           <div className={`w-3 h-3 rounded-full ${studentInfo?.has_paid_i20_control_fee ? 'bg-green-500' : 'bg-red-500'}`}></div>
                           <span className="text-sm font-medium text-slate-900">I-20 Control Fee</span>
                         </div>
                         <div className="flex flex-col items-end">
                           <span className={`text-sm font-medium ${studentInfo?.has_paid_i20_control_fee ? 'text-green-700' : 'text-red-700'}`}>
                             {studentInfo?.has_paid_i20_control_fee ? 'Paid' : 'Pending'}
                           </span>
                           <span className="text-xs text-slate-500">
                             {(() => {
                               // I-20 Control Fee sempre usa override se disponível, senão valor padrão
                               // I-20 nunca soma dependentes
                               return formatFeeAmount(getFeeAmount('i20_control_fee'));
                             })()}
                           </span>
                         </div>
                       </div>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200">
            <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4 rounded-t-3xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center min-w-0">
                  <FileText className="w-6 text-white h-6 mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold text-white break-words">Document Management</h2>
                    <p className="text-slate-200 text-sm mt-1 break-words">View student submitted documents and their current status</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* Document Requests Section */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 mb-8">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 rounded-t-3xl">
                  <h4 className="font-semibold text-slate-900 flex items-center">
                    <svg className="w-5 h-5 mr-3 text-slate-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Document Requests
                  </h4>
                </div>
                
                <div className="p-6">
                  {documentRequests && documentRequests.length > 0 ? (
                    <div className="space-y-4">
                      {documentRequests.map((request) => (
                        <div key={request.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-6 overflow-hidden">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start sm:items-center space-x-3 mb-3 min-w-0">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-lg font-semibold text-slate-900 break-words">
                                    {request.title || 'Document Request'}
                                  </h4>
                                  {request.description && (
                                    <p className="text-sm text-slate-600 mt-1 break-words">
                                      {request.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                                {request.due_date && (
                                  <span className="flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Due: {formatDate(request.due_date)}
                                  </span>
                                )}
                                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                  request.is_global ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {request.is_global ? 'Global Request' : 'Individual Request'}
                                </span>
                              </div>
                            </div>
                            
                            {/* University Template */}
                            {request.attachment_url && (
                              <div className="ml-0 sm:ml-4">
                                <button
                                  onClick={() => handleViewDocument({ file_url: request.attachment_url, type: 'template' })}
                                  className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm flex items-center justify-center space-x-2 w-full sm:w-auto"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  <span>View Template</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Documents Submitted by Student */}
                          <div className="border-t border-slate-200 pt-4">
                            <h5 className="text-sm font-medium text-slate-700 mb-3 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              Student Response:
                            </h5>
                            
                            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4">
                              {request.uploads?.map((upload: any) => {
                                const { filename, fullUrl } = getDocumentInfo(upload);
                                return (
                                  <div key={upload.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 last:mb-0">
                                    <div className="flex items-start sm:items-center space-x-4 min-w-0">
                                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 break-words">{filename}</p>
                                        <p className="text-sm text-slate-500">
                                          Submitted on {formatDate(upload.uploaded_at)}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1 break-words">
                                          Response to: {request.title || 'Document Request'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:space-x-3 sm:self-auto self-start mt-3 sm:mt-0">
                                      <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                                        upload.status === 'approved' ? 'bg-green-100 text-green-800' :
                                        upload.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                        upload.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-slate-100 text-slate-800'
                                      }`}>
                                        {upload.status === 'approved' ? 'Approved' :
                                         upload.status === 'rejected' ? 'Rejected' :
                                         upload.status === 'under_review' ? 'Under Review' :
                                         'Pending'}
                                      </span>
                                      
                                      <button
                                        onClick={() => handleViewDocument({
                                          ...upload,
                                          file_url: fullUrl,
                                          filename
                                        })}
                                        className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-1 sm:flex-none text-center"
                                      >
                                        View
                                      </button>
                                      
                                      <button
                                        onClick={() => handleDownloadDocument({
                                          ...upload,
                                          file_url: fullUrl,
                                          filename
                                        })}
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-1 sm:flex-none text-center"
                                      >
                                        Download
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-slate-600 font-medium">No document requests yet</p>
                      <p className="text-sm text-slate-500 mt-1">Document requests will appear here when created by university staff</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Acceptance Letter Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl shadow-sm relative overflow-hidden">
                <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-4 sm:px-6 py-5 rounded-t-3xl">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-4 gap-3">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                      <svg className="w-6 h-6 text-[#05294E]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xl font-bold text-white break-words">Acceptance Letter</h4>
                      <p className="text-blue-100 text-sm break-words">View student acceptance letter and enrollment status</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 sm:p-6">
                  {loadingApplication && !currentApplication?.acceptance_letter_url ? (
                    <div className="bg-white rounded-3xl p-8">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
                        </div>
                        <h4 className="text-lg font-semibold text-slate-700 mb-2">Loading application...</h4>
                        <p className="text-slate-500">Please wait while we fetch your application details.</p>
                      </div>
                    </div>
                  ) : currentApplication && currentApplication.acceptance_letter_url ? (
                    <div className="bg-white rounded-3xl p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex items-start space-x-4 min-w-0">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 break-words">
                              {(() => {
                                const url = getAcceptanceLetterUrl(currentApplication);
                                return url ? (url.split('/').pop() || 'Acceptance Letter') : 'Acceptance Letter';
                              })()}
                            </p>
                            <p className="text-sm text-slate-500">
                              {currentApplication.acceptance_letter_sent_at ? `Sent on ${formatDate(currentApplication.acceptance_letter_sent_at)}` : 'Available'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Official university acceptance document
                            </p>
                            <div className="flex items-center mt-2 sm:hidden">
                              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                Available
                              </span>
                            </div>
                          </div>
                        </div>
                            
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-start sm:ml-auto">
                          <span className="hidden sm:inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 whitespace-nowrap">
                            Available
                          </span>
                          
                          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <button 
                              onClick={() => handleViewDocument({
                                file_url: getAcceptanceLetterUrl(currentApplication),
                                filename: 'Acceptance Letter'
                              })}
                              className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                            >
                              View
                            </button>
                            
                            <button 
                              onClick={() => handleDownloadDocument({
                                file_url: getAcceptanceLetterUrl(currentApplication),
                                filename: 'Acceptance Letter'
                              })}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                            >
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl p-8">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                        <h4 className="text-lg font-semibold text-slate-700 mb-2">No Acceptance Letter Yet</h4>
                        <p className="text-slate-500 max-w-md mx-auto">
                          Your acceptance letter will appear here once the university processes your application and sends it to you.
                        </p>
                        <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-slate-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                          <span>Please wait for the university to send your acceptance letter</span>
                        </div>
                      </div>
                      </div>
                    )}
                </div>
              </div>

              {/* Transfer Form Section - Only for transfer students */}
              {studentInfo?.student_process_type === 'transfer' && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-3xl shadow-sm relative overflow-hidden mt-8 mb-8">
                  <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-4 sm:px-6 py-5 rounded-t-3xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-4 gap-3">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xl font-bold text-white break-words">Transfer Form</h4>
                        <p className="text-indigo-100 text-sm break-words">Transfer student documentation and status</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 sm:p-6">
                    {scholarshipApplication?.transfer_form_url ? (
                      <div className="bg-white rounded-3xl p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex items-start space-x-4 min-w-0">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 break-words">
                                {scholarshipApplication.transfer_form_url.split('/').pop() || 'Transfer Form'}
                              </p>
                              <p className="text-sm text-slate-500">
                                {scholarshipApplication.transfer_form_sent_at ? `Sent on ${formatDate(scholarshipApplication.transfer_form_sent_at)}` : 'Available'}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">
                                Transfer student documentation
                              </p>
                              <div className="flex items-center mt-2 sm:hidden">
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                  Available
                                </span>
                              </div>
                            </div>
                          </div>
                              
                          <div className="flex flex-col sm:flex-row gap-2 sm:items-start sm:ml-auto">
                            <span className="hidden sm:inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 whitespace-nowrap">
                              Available
                            </span>
                            
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                              <button 
                                onClick={() => handleViewDocument({
                                  file_url: scholarshipApplication.transfer_form_url,
                                  filename: 'Transfer Form'
                                })}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                              >
                                View
                              </button>
                              
                              <button 
                                onClick={() => handleDownloadDocument({
                                  file_url: scholarshipApplication.transfer_form_url,
                                  filename: 'Transfer Form'
                                })}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                              >
                                Download
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-3xl p-8">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h4 className="text-lg font-semibold text-slate-700 mb-2">No Transfer Form Yet</h4>
                          <p className="text-slate-500 max-w-md mx-auto">
                            The transfer form will appear here once the university processes your transfer application.
                          </p>
                          <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Please wait for the university to send your transfer form</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
                 )}
       </div>
       
       {/* Modal de visualização de documentos */}
       {previewUrl && (
         <DocumentViewerModal documentUrl={previewUrl} onClose={() => setPreviewUrl(null)} />
       )}
     </div>
   );
 };
 
 export default StudentDetails;