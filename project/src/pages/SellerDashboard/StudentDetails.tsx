import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Search, 
  Filter, 
  Eye, 
  DollarSign, 
  Calendar, 
  MapPin, 
  User, 
  ChevronDown,
  ChevronRight,
  Users,
  Phone,
  Building,
  Award,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Home,
  BarChart3,
  Settings,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getDocumentStatusDisplay } from '../../utils/documentStatusMapper';
import DocumentViewerModal from '../../components/DocumentViewerModal';

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
  scholarship?: {
    application_fee_amount?: number;
    scholarship_fee_amount?: number;
  };
}

interface FeePayment {
  payment_id: string;
  fee_type: string;
  fee_name: string;
  amount_paid: number;
  currency: string;
  payment_status: string;
  payment_date: string;
  stripe_payment_intent: string;
  notes: string;
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
  // ✅ CORREÇÃO: Adicionar propriedades para compatibilidade com a nova estrutura
  document_requests?: {
    id: string;
    title: string;
    description: string;
    created_at: string;
    is_global: boolean;
    university_id: string;
    scholarship_application_id: string;
    attachment_url: string;
    due_date: string;
  };
  file_url?: string;
  uploaded_at?: string;
}

interface StudentDetailsProps {
  studentId: string;
  profileId: string;
  onRefresh?: () => void;
}

const StudentDetails: React.FC<StudentDetailsProps> = ({ studentId, profileId, onRefresh }) => {
  const navigate = useNavigate();
  
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [feeHistory, setFeeHistory] = useState<FeePayment[]>([]);
  const [scholarshipApplication, setScholarshipApplication] = useState<ScholarshipApplication | null>(null);
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [studentDocuments, setStudentDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  
  // Debug: verificar estado inicial
  console.log('🔍 [STUDENT_DETAILS] Estado inicial - documentsLoaded:', documentsLoaded);

  const TABS = [
    { id: 'details', label: 'Details', icon: User },
    { id: 'documents', label: 'Documents', icon: FileText }
  ];

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
         // Dados do estudante carregados com sucesso
       } else {
         console.warn('⚠️ [STUDENT_DETAILS] Nenhum dado retornado da RPC');
         console.warn('⚠️ [STUDENT_DETAILS] studentData:', studentData);
         console.warn('⚠️ [STUDENT_DETAILS] studentData.length:', studentData?.length);
         setStudentInfo(null);
       }

      // Carregar histórico de taxas
      const { data: feesData, error: feesError } = await supabase.rpc(
        'get_student_fee_history',
        { target_student_id: studentId }
      );

      if (feesError) {
        console.warn('⚠️ [STUDENT_DETAILS] Could not load fee history:', feesError);
      } else {
        setFeeHistory(feesData || []);
      }

             // Verificando aplicação de bolsa
       const { data: applicationsList, error: listError } = await supabase.rpc(
         'get_student_detailed_info',
         { target_student_id: studentId }
       );

       console.log('🔍 [STUDENT_DETAILS] Aplicações encontradas:', applicationsList);

               if (applicationsList && applicationsList.length > 0) {
          const studentProfile = applicationsList[0];
          console.log("studentProfile", studentProfile);
          
          // ✅ CORREÇÃO: Usar profile_id (student_id na tabela) para buscar a aplicação de bolsa
          const { data: appData, error: applicationError } = await supabase
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
            .eq('student_id', studentProfile.profile_id)  // ✅ Usar profile_id, não user_id
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
           console.log("appData", appData);
         if (!applicationError) {
           setScholarshipApplication(appData);
           
           // Atualizar studentInfo com os detalhes da bolsa
           if (studentInfo && appData.scholarships) {
             setStudentInfo(prev => prev ? {
               ...prev,
               scholarship: {
                 application_fee_amount: appData.scholarships.application_fee_amount,
                 scholarship_fee_amount: appData.scholarships.scholarship_fee_amount
               }
             } : null);
           }
         }
       }

       // Carregar documentos do estudante (independente de ter aplicação)
       console.log('🔍 [STUDENT_DETAILS] Chamando loadStudentDocuments...');
       await loadStudentDocuments(profileId);
       console.log('🔍 [STUDENT_DETAILS] loadStudentDocuments concluída');

       // Carregar solicitações de documentos (só se tiver scholarshipApplication)
       if (scholarshipApplication?.id) {
         console.log('🔍 [STUDENT_DETAILS] Chamando loadDocumentRequests...');
         await loadDocumentRequests();
         console.log('🔍 [STUDENT_DETAILS] loadDocumentRequests concluída');
       } else {
         console.log('🔍 [STUDENT_DETAILS] Sem scholarshipApplication.id, pulando loadDocumentRequests');
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
    console.log('🔍 [STUDENT_DETAILS] scholarshipApplication?.id:', scholarshipApplication?.id);
    console.log('🔍 [STUDENT_DETAILS] studentInfo?.university_name:', studentInfo?.university_name);
    
    if (!scholarshipApplication?.id) {
      console.log('🔍 [STUDENT_DETAILS] Sem scholarshipApplication.id, retornando');
      return;
    }

    try {
      // ✅ CORREÇÃO: Seguir o mesmo padrão da universidade
      // Primeiro, buscar document_requests para esta aplicação
      const { data: requestsForApp, error: requestsError } = await supabase
        .from('document_requests')
        .select('*')
        .eq('scholarship_application_id', scholarshipApplication.id);
      
      if (requestsError) {
        console.log('❌ [DOCUMENT REQUEST] Error fetching requests:', requestsError);
      } else {
        console.log('✅ [DOCUMENT REQUEST] Requests found:', requestsForApp);
      }
      
      // ✅ CORREÇÃO: Buscar uploads para cada request encontrado
      let uploads: any[] = [];
      if (requestsForApp && requestsForApp.length > 0) {
        const requestIds = requestsForApp.map(req => req.id);
        console.log('🔍 [DOCUMENT REQUEST] Request IDs to search uploads:', requestIds);
        
        const { data: uploadsForRequests, error: uploadsError } = await supabase
          .from('document_request_uploads')
          .select('*')
          .in('document_request_id', requestIds);
        
        if (uploadsError) {
          console.log('❌ [DOCUMENT REQUEST] Error fetching uploads for requests:', uploadsError);
        } else {
          console.log('✅ [DOCUMENT REQUEST] Uploads found for requests:', uploadsForRequests);
          uploads = uploadsForRequests || [];
        }
      }
      
      // ✅ CORREÇÃO: Se não encontrou nada pelos requests, tentar buscar por uploaded_by
      if (uploads.length === 0) {
        console.log('🔄 [DOCUMENT REQUEST] No uploads found for requests, trying uploaded_by =', studentId);
        
        // Teste 1: Buscar apenas document_request_uploads
        console.log('🔍 [DOCUMENT REQUEST] Test 1: Simple query on document_request_uploads');
        let { data: simpleUploads, error: simpleError } = await supabase
          .from('document_request_uploads')
          .select('*')
          .eq('uploaded_by', studentId);
        
        console.log('🔍 [DOCUMENT REQUEST] Simple query result:', {
          data: simpleUploads,
          error: simpleError,
          count: simpleUploads?.length || 0
        });
        
        // Teste 2: Buscar com join para document_requests
        console.log('🔍 [DOCUMENT REQUEST] Test 2: Query with join to document_requests');
        let { data: uploadsByUser, error: error1 } = await supabase
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
              attachment_url,
              due_date
            )
          `)
          .eq('uploaded_by', studentId);
        
        console.log('🔍 [DOCUMENT REQUEST] Join query result:', {
          data: uploadsByUser,
          error: error1,
          count: uploadsByUser?.length || 0
        });

        // ✅ CORREÇÃO: Só atualizar se os dados realmente mudaram
        if (JSON.stringify(uploadsByUser) !== JSON.stringify(documentRequests)) {
          setDocumentRequests(uploadsByUser || []);
        }
        
        let { data: allUploadsDebug, error: allError } = await supabase
          .from('document_request')
          .select('*')
          .eq('scholarship_application_id', scholarshipApplication.id);
        
        console.log('🔍 [DOCUMENT REQUEST] All uploads debug:', {
          data: allUploadsDebug,
          error: allError
        });
        
        // Teste 4: Verificar se o studentId existe na tabela
        console.log('🔍 [DOCUMENT REQUEST] Test 4: Check if studentId exists in any upload');
        if (allUploadsDebug && allUploadsDebug.length > 0) {
          const foundStudent = allUploadsDebug.find(upload => upload.uploaded_by === studentId);
          console.log('🔍 [DOCUMENT REQUEST] Student found in debug data:', foundStudent);
          
          // Verificar todos os uploaded_by únicos
          const uniqueUploadedBy = [...new Set(allUploadsDebug.map(u => u.uploaded_by))];
          console.log('🔍 [DOCUMENT REQUEST] Unique uploaded_by values in debug:', uniqueUploadedBy);
        }
        
        if (error1) {
          console.log('❌ [DOCUMENT REQUEST] Error fetching by uploaded_by:', error1);
        } else if (uploadsByUser && uploadsByUser.length > 0) {
          console.log('✅ [DOCUMENT REQUEST] Uploads found by uploaded_by:', uploadsByUser);
          uploads = uploadsByUser;
        } else {
          console.log('⚠️ [DOCUMENT REQUEST] No uploads found by uploaded_by');
          
          // Se ainda não encontrou, usar os dados simples se disponível
          if (simpleUploads && simpleUploads.length > 0) {
            console.log('🔄 [DOCUMENT REQUEST] Using simple query results instead');
            uploads = simpleUploads;
          }
        }
      }
      
      // Se ainda não encontrou nada, tentar buscar todos os uploads
      if (uploads.length === 0) {
        console.log('🔄 [DOCUMENT REQUEST] Trying to fetch all uploads for debug');
        
        let { data: allUploads, error: error2 } = await supabase
          .from('document_request_uploads')
          .select('*');
        
        if (error2) {
          console.log('❌ [DOCUMENT REQUEST] Error fetching all uploads:', error2);
        } else if (allUploads && allUploads.length > 0) {
          console.log('📊 [DOCUMENT REQUEST] Total uploads in table:', allUploads.length);
          console.log('📄 [DOCUMENT REQUEST] First 3 uploads:', allUploads.slice(0, 3));
          uploads = allUploads;
        }
      }

      console.log('📋 [DOCUMENT REQUEST] Final uploads count:', uploads.length);

      // Buscar também a carta de aceite da aplicação
      let acceptanceLetterDoc = null;
      if (scholarshipApplication.acceptance_letter_url && scholarshipApplication.acceptance_letter_url.trim() !== '') {
        acceptanceLetterDoc = {
          id: `acceptance_letter_${scholarshipApplication.id}`,
          filename: scholarshipApplication.acceptance_letter_url?.split('/').pop() || 'Acceptance Letter',
          file_url: scholarshipApplication.acceptance_letter_url,
          status: scholarshipApplication.acceptance_letter_status || 'sent',
          uploaded_at: new Date().toISOString(), // Usar data atual como fallback
          request_title: 'Acceptance Letter',
          request_description: 'Official acceptance letter from the university',
          request_created_at: new Date().toISOString(), // Usar data atual como fallback
          is_global: false,
          request_type: 'Acceptance Letter',
          is_acceptance_letter: true
        };
        console.log('✅ [DOCUMENT REQUEST] Acceptance letter found:', acceptanceLetterDoc);
      }

      // Combinar uploads com a carta de aceite
      let allDocuments = [...uploads];
      if (acceptanceLetterDoc) {
        allDocuments.unshift(acceptanceLetterDoc);
      }

      console.log('📊 [DOCUMENT REQUEST] Summary:', {
        uploadsCount: uploads.length,
        acceptanceLetterFound: !!acceptanceLetterDoc,
        totalDocuments: allDocuments.length
      });

                  if (!allDocuments || allDocuments.length === 0) {
              console.log('⚠️ [DOCUMENT REQUEST] No documents found for student');
              // ✅ CORREÇÃO: Só atualizar se os dados realmente mudaram
              if (documentRequests.length > 0) {
                setDocumentRequests([]);
              }
            } else {
        // ✅ CORREÇÃO: Usar os requests encontrados para estruturar os documentos
        const documentRequestsMap = new Map();
        
        // Primeiro, adicionar os requests encontrados
        if (requestsForApp && requestsForApp.length > 0) {
          requestsForApp.forEach(request => {
            documentRequestsMap.set(request.id, {
              id: request.id,
              title: request.title,
              description: request.description,
              is_global: request.is_global,
              status: 'open',
              attachment_url: request.attachment_url,
              due_date: request.due_date,
              document_request_uploads: []
            });
          });
        }
        
        // Depois, adicionar a carta de aceite se existir
        if (acceptanceLetterDoc) {
          if (!documentRequestsMap.has('acceptance_letter')) {
            documentRequestsMap.set('acceptance_letter', {
              id: 'acceptance_letter',
              title: 'Acceptance Letter',
              description: 'Official acceptance letter from the university',
              is_global: false,
              status: 'open',
              attachment_url: null,
              due_date: null,
              document_request_uploads: []
            });
          }
          documentRequestsMap.get('acceptance_letter').document_request_uploads.push(acceptanceLetterDoc);
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
              is_acceptance_letter: false
            };
            
            documentRequestsMap.get(requestId).document_request_uploads.push(formattedUpload);
          }
        });
        
        const finalDocumentRequests = Array.from(documentRequestsMap.values());
        console.log('🎯 [DOCUMENT REQUEST] Final document requests:', finalDocumentRequests);
        // ✅ CORREÇÃO: Só atualizar se os dados realmente mudaram
        if (JSON.stringify(finalDocumentRequests) !== JSON.stringify(documentRequests)) {
          setDocumentRequests(finalDocumentRequests);
        }
      }
      
    } catch (error) {
      console.error("❌ [DOCUMENT REQUEST] Error in document requests logic:", error);
      // ✅ CORREÇÃO: Só atualizar se os dados realmente mudaram
      if (documentRequests.length > 0) {
        setDocumentRequests([]);
      }
    }
  }, [scholarshipApplication?.id, studentId, documentRequests]);

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

  // Recarregar documentos quando a aplicação de bolsa mudar
  useEffect(() => {
    if (scholarshipApplication?.id) {
      loadDocumentRequests();
    }
  }, [scholarshipApplication?.id]); 

  // Remover este useEffect duplicado - os documentos já são carregados em loadStudentDetails

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors py-2 px-3 rounded-lg hover:bg-slate-100"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm md:text-base">Back to list</span>
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Student Application
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Review and manage {studentInfo.full_name}'s application details
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
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
                                const statusDisplay = getDocumentStatusDisplay(studentInfo.documents_status || '');
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
                            {scholarshipApplication?.status === 'enrolled' ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-medium text-green-700">Enrolled</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <span className="text-sm font-medium text-yellow-700">Pending Acceptance</span>
                              </div>
                            )}
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
                          <div className="bg-white p-4">
                            <div className="flex items-start space-x-4">
                              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3 mb-1">
                                  <p className="font-medium text-slate-900">{doc.label}</p>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                                <p className="text-sm text-slate-600">{doc.description}</p>
                                {d?.file_url && (
                                  <p className="text-xs text-slate-400 mt-1">
                                    Uploaded: {d.uploaded_at ? formatDate(d.uploaded_at) : new Date().toLocaleDateString()}
                                  </p>
                                )}
                                
                                {/* Botões de ação */}
                                <div className="flex items-center space-x-2 mt-3">
                                  {d?.file_url && (
                                    <button 
                                      onClick={() => handleViewDocument(d)}
                                      className="bg-[#05294E] hover:bg-[#041f38] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                    >
                                      View Document
                                    </button>
                                  )}
                                  {d?.file_url && (
                                    <button 
                                      onClick={() => handleDownloadDocument(d)}
                                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
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
                           {studentInfo?.has_paid_selection_process_fee && (
                             <span className="text-xs text-slate-500">$600.00</span>
                           )}
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
                         {studentInfo?.is_application_fee_paid && (
                           <span className="text-xs text-slate-500">
                             ${studentInfo?.scholarship?.application_fee_amount ? 
                               (Number(studentInfo.scholarship.application_fee_amount) / 100).toFixed(2) : 
                               '350.00'}
                           </span>
                         )}
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
                         {studentInfo?.is_scholarship_fee_paid && (
                           <span className="text-xs text-slate-500">
                             ${studentInfo?.scholarship?.scholarship_fee_amount ? 
                               (Number(studentInfo.scholarship.scholarship_fee_amount) / 100).toFixed(2) : 
                               '850.00'}
                           </span>
                         )}
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
                           {studentInfo?.has_paid_i20_control_fee && (
                             <span className="text-xs text-slate-500">$1,250.00</span>
                           )}
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
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-6 text-white h-6 mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold text-white">Document Management</h2>
                    <p className="text-slate-200 text-sm mt-1">View student submitted documents and their current status</p>
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
                        <div key={request.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="text-base font-medium text-slate-900 mb-2">
                                {request.document_requests?.title || request.title || 'Document Request'}
                              </h5>
                              {request.document_requests?.description && (
                                <p className="text-sm text-slate-600 mb-2">
                                  {request.document_requests.description}
                                </p>
                              )}
                              <div className="flex items-center space-x-4 text-xs text-slate-500">
                                {request.document_requests?.due_date && (
                                  <span>
                                    <span className="font-medium">Due Date:</span> {formatDate(request.document_requests.due_date)}
                                  </span>
                                )}
                                <span>
                                  <span className="font-medium">Type:</span> {request.document_requests?.is_global ? 'Global' : 'Specific'}
                                </span>
                              </div>
                            </div>
                            
                            {/* University Template */}
                            {request.document_requests?.attachment_url && (
                              <div className="ml-4">
                                <button
                                  onClick={() => handleViewDocument({ file_url: request.document_requests!.attachment_url, type: 'template' })}
                                  className="inline-flex items-center px-3 py-2 border border-slate-300 shadow-sm text-sm leading-4 font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  View Template
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Documents Submitted by Student */}
                          <div className="mt-4">
                            <h6 className="text-sm font-medium text-slate-700 mb-2">
                              Submitted Documents:
                            </h6>
                            <div className="space-y-2">
                              {/* ✅ GAMBIARRA: Tratar cada upload individualmente */}
                              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                                <div className="flex items-center space-x-3">
                                  <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    </div>
                                  </div>
                                  <div>
                                    {/* ✅ GAMBIARRA: Usar nome extraído do file_url */}
                                    <p className="text-sm font-medium text-slate-900">
                                      {request.file_url ? request.file_url.split('/').pop() || 'Document' : 'Document'}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Submitted on {formatDate(request.uploaded_at || request.created_at)}
                                    </p>
                                    {/* ✅ GAMBIARRA: Mostrar informações do document_request */}
                                    <p className="text-xs text-slate-400 mt-1">
                                      Request: {request.document_requests?.title || request.title || 'Document Request'}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    request.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    request.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-slate-100 text-slate-800'
                                  }`}>
                                    {request.status === 'approved' ? 'Approved' :
                                     request.status === 'rejected' ? 'Rejected' :
                                     request.status === 'under_review' ? 'Under Review' :
                                     'Pending'}
                                  </span>
                                  
                                  {/* ✅ GAMBIARRA: Passar documento com URL completa para as funções */}
                                  <button
                                    onClick={() => handleViewDocument({
                                      ...request,
                                      file_url: `https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/document-attachments/${request.file_url}`,
                                      filename: request.file_url ? request.file_url.split('/').pop() || 'Document' : 'Document'
                                    })}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                  >
                                    View
                                  </button>
                                  
                                  <button
                                    onClick={() => handleDownloadDocument({
                                      ...request,
                                      file_url: `https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/document-attachments/${request.file_url}`,
                                      filename: request.file_url ? request.file_url.split('/').pop() || 'Document' : 'Document'
                                    })}
                                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                                  >
                                    Download
                                  </button>
                                </div>
                              </div>
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

              {/* Student Uploads Section */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 mb-8">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 rounded-t-3xl">
                  <h4 className="font-semibold text-slate-900 flex items-center">
                    <svg className="w-5 h-5 mr-3 text-slate-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Student Responses to Document Requests
                  </h4>
                </div>
                
                <div className="p-6">
                  {scholarshipApplication?.documents && scholarshipApplication.documents.length > 0 ? (
                    <div className="space-y-3">
                      {scholarshipApplication.documents.map((doc: any, index: number) => (
                        <div key={doc.id || index} className="bg-slate-50 border border-slate-200 rounded-3xl p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4 flex-1">
                              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900">{doc.document_type || doc.type || 'Document'}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {doc.request_type || 'Student Document'}
                                  </span>
                                  <span className="text-sm text-slate-500">
                                    Document Type: <span className="font-medium text-slate-700">{doc.document_type || doc.type || 'Document'}</span>
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Document uploaded for university review</p>
                                {doc.uploaded_at && (
                                  <p className="text-xs text-slate-400 mt-1">
                                    Uploaded: {formatDate(doc.uploaded_at)}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3 ml-4">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                                doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Under Review'}
                              </span>
                              
                                                             {/* Botões de visualização e download */}
                               {doc.file_url && (
                                 <button 
                                   onClick={() => handleDownloadDocument(doc)}
                                   className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                                 >
                                   Download
                                 </button>
                               )}
                               {doc.file_url && (
                                 <button 
                                   onClick={() => handleViewDocument(doc)}
                                   className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                                 >
                                   View
                                 </button>
                               )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-slate-600 font-medium">No student responses yet</p>
                      <p className="text-sm text-slate-500 mt-1">Student document responses will appear here when they upload documents</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Acceptance Letter Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl shadow-sm relative overflow-hidden">
                <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-5 rounded-t-3xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-[#05294E]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white">Acceptance Letter</h4>
                      <p className="text-blue-100 text-sm">View student acceptance letter and enrollment status</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="bg-white rounded-3xl p-6 mb-6">
                    <p className="text-slate-700 mb-6 leading-relaxed">
                      The student's acceptance letter and any other required documents, such as the I-20 Control Fee receipt.
                    </p>
                    
                    {scholarshipApplication?.acceptance_letter_url ? (
                      <div className="text-center py-8 bg-green-50 border-2 border-green-200 rounded-3xl">
                        <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h5 className="font-semibold text-green-900 mb-2">Acceptance Letter Uploaded Successfully!</h5>
                        <p className="text-green-700 text-sm">The student has been enrolled and notified.</p>
                        <div className="mt-4">
                          <button className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                            View Acceptance Letter
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                        <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h5 className="font-semibold text-slate-900 mb-2">Acceptance Letter Not Uploaded Yet</h5>
                        <p className="text-slate-700 text-sm">The acceptance letter will appear here when uploaded by university staff</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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