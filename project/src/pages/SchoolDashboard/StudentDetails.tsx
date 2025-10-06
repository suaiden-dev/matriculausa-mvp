import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getDocumentStatusDisplay } from '../../utils/documentStatusMapper';
import type { Application, UserProfile, Scholarship } from '../../types';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { useAuth } from '../../hooks/useAuth';
import { FileText, UserCircle, CheckCircle2, MessageCircle } from 'lucide-react';
import ApplicationChat from '../../components/ApplicationChat';
import { useApplicationChat } from '../../hooks/useApplicationChat';
const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string;

interface ApplicationDetails extends Application {
  user_profiles: UserProfile;
  scholarships: Scholarship;
}

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

const TABS = [
  { id: 'details', label: 'Details', icon: UserCircle },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'documents', label: 'Documents', icon: FileText },
  // { id: 'review', label: 'Review', icon: FileText }, // Removida a aba Review
];

const StudentDetails: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { getFeeAmount, formatFeeAmount } = useFeeConfig();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'documents'>('details');
  const chat = useApplicationChat(applicationId);

  // Documentos básicos do aluno (passport, diploma, funds_proof) para a aba Documents
  const [studentDocs, setStudentDocs] = useState<any[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  // Modal para justificar solicitação de mudanças
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingRejectType, setPendingRejectType] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  // Modal para recusar aluno na bolsa
  const [showRejectStudentModal, setShowRejectStudentModal] = useState(false);
  const [rejectStudentReason, setRejectStudentReason] = useState('');
  
  // Estados para a aba Documents
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const [studentDocuments, setStudentDocuments] = useState<any[]>([]);
  const [showRejectDocumentModal, setShowRejectDocumentModal] = useState(false);
  const [pendingRejectDocumentId, setPendingRejectDocumentId] = useState<string | null>(null);
  const [rejectDocumentReason, setRejectDocumentReason] = useState('');

  // Estados para Acceptance Letter
  const [acceptanceLetterFile, setAcceptanceLetterFile] = useState<File | null>(null);
  const [uploadingAcceptanceLetter, setUploadingAcceptanceLetter] = useState(false);
  const [acceptanceLetterUploaded, setAcceptanceLetterUploaded] = useState(false);

  const [isFileSelecting, setIsFileSelecting] = useState(false);

  // Estados para o modal de nova solicitação de documento
  const [newDocumentRequest, setNewDocumentRequest] = useState({
    title: '',
    description: '',
    due_date: '',
    attachment: null as File | null
  });
  const [creatingDocumentRequest, setCreatingDocumentRequest] = useState(false);

  useEffect(() => {
    if (applicationId) {
      fetchApplicationDetails();
    }
  }, [applicationId]);

  // Inicializar estado da Acceptance Letter baseado na aplicação
  useEffect(() => {
    if (application) {
      console.log('=== useEffect Acceptance Letter disparado ===');
      console.log('Application status:', application.status);
      console.log('Acceptance letter URL:', application.acceptance_letter_url);
      console.log('Acceptance letter status:', application.acceptance_letter_status);
      
      // Usar a lógica correta que verifica se a carta foi enviada
      const shouldBeUploaded = !!(application.acceptance_letter_url && 
        application.acceptance_letter_status && 
        application.acceptance_letter_status !== 'pending');
      
      console.log('Setting acceptanceLetterUploaded to:', shouldBeUploaded);
      setAcceptanceLetterUploaded(shouldBeUploaded);
    }
  }, [application]);

  // Limpar erros quando o arquivo for alterado
  useEffect(() => {
    if (acceptanceLetterFile) {
      clearFileSelectionError();
    }
  }, [acceptanceLetterFile]);

  // Limpar estados de arquivo quando a aba for alterada
  useEffect(() => {
    if (activeTab !== 'documents') {
      setAcceptanceLetterFile(null);
    }
  }, [activeTab]);

  const fetchApplicationDetails = async () => {
    if (!applicationId) return;

    console.log('=== fetchApplicationDetails iniciado ===');
    console.log('Application ID:', applicationId);
    
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          user_profiles!student_id(*),
          scholarships(*, universities(*))
        `)
        .eq('id', applicationId)
        .single();

      if (error) {
        throw error;
      }
      
      if (data) {
        console.log('=== Dados recebidos do banco ===');
        console.log('Status da aplicação:', data.status);
        console.log('Acceptance letter URL:', data.acceptance_letter_url);
        console.log('Acceptance letter status:', data.acceptance_letter_status);
        console.log('Acceptance letter sent at:', data.acceptance_letter_sent_at);
        console.log('🔍 [STUDENT_DETAILS] Scholarship data:', data.scholarships);
        console.log('🔍 [STUDENT_DETAILS] Application fee amount from scholarship:', data.scholarships?.application_fee_amount);
        console.log('🔍 [STUDENT_DETAILS] Scholarship fee amount from scholarship:', data.scholarships?.scholarship_fee_amount);
        
        setApplication(data as ApplicationDetails);
        console.log('=== Estado application atualizado ===');
        console.log('🔍 [STUDENT_DETAILS] Full application object:', data);
        console.log('🔍 [STUDENT_DETAILS] Application scholarships:', data.scholarships);
        console.log('🔍 [STUDENT_DETAILS] Application scholarships type:', typeof data.scholarships);
        console.log('🔍 [STUDENT_DETAILS] Application scholarships keys:', data.scholarships ? Object.keys(data.scholarships) : 'null');
        // Mantemos uma cópia simplificada para compatibilidade antiga
        const appDocs = (data as any).documents;
        if (Array.isArray(appDocs) && appDocs.length > 0) {
          setStudentDocs(appDocs.map((d: any) => ({ type: d.type, file_url: d.url, status: d.status || 'under_review' })));
        } else {
          // Fallback 1: usar documentos salvos no perfil do aluno (user_profiles.documents)
          const profileDocs = (data as any).user_profiles?.documents;
          if (Array.isArray(profileDocs) && profileDocs.length > 0) {
            setStudentDocs(profileDocs.map((d: any) => ({ type: d.type, file_url: d.url, status: d.status || 'under_review' })));
          } else {
            // Fallback 2: buscar do storage se a application ainda não tiver documentos associados
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
      console.log('=== fetchApplicationDetails finalizado ===');
    }
  };

  // Função para verificar e sincronizar o documents_status
  const syncDocumentsStatus = async () => {
    if (!application?.documents || !application?.user_profiles?.user_id) return;
    
    console.log('=== SINCRONIZANDO STATUS DOS DOCUMENTOS ===');
    console.log('Application documents:', application.documents);
    console.log('Current documents_status:', application.user_profiles.documents_status);
    
    const allDocsApproved = ['passport', 'diploma', 'funds_proof']
      .every((docType) => {
        const doc = application.documents.find((d: any) => d.type === docType);
        const isApproved = doc && (doc as any).status === 'approved';
        console.log(`Document ${docType}:`, doc, 'Approved:', isApproved);
        return isApproved;
      });
    
    console.log('All documents approved:', allDocsApproved);
    
    // Se todos os documentos estão aprovados mas o status geral não está, atualizar
    if (allDocsApproved && application.user_profiles.documents_status !== 'approved') {
      console.log('Atualizando documents_status para approved...');
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ documents_status: 'approved' })
        .eq('user_id', application.user_profiles.user_id);
      
      if (error) {
        console.error('Erro ao sincronizar documents_status:', error);
      } else {
        console.log('documents_status sincronizado com sucesso!');
        
        // Atualizar o estado local
        setApplication((prev) => prev ? ({
          ...prev,
          user_profiles: { ...prev.user_profiles, documents_status: 'approved' }
        } as any) : prev);
      }
    }
  };

  // Sincronizar documents_status sempre que a aplicação for carregada
  useEffect(() => {
    if (application && application.user_profiles) {
      syncDocumentsStatus();
    }
  }, [application]);

  // Carregar dados dos documentos quando a aplicação for carregada
  useEffect(() => {
    if (applicationId && application?.user_profiles?.user_id) {
      console.log('=== useEffect fetchStudentDocuments disparado ===');
      console.log('Application ID:', applicationId);
      console.log('Application status:', application?.status);
      console.log('Acceptance letter URL:', application?.acceptance_letter_url);
      console.log('Acceptance letter status:', application?.acceptance_letter_status);
      console.log('Carregando dados dos documentos para application:', applicationId);
      fetchDocumentRequests();
      fetchStudentDocuments();
    }
  }, [applicationId, application]); // Incluída a dependência 'application' para garantir que os documentos sejam recarregados quando a aplicação for atualizada

  const fetchDocumentRequests = async () => {
    if (!application) return;
    
    try {
      console.log('=== Buscando document requests ===');
      
      // Buscar requests específicos para esta aplicação
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
          globalRequests = globalData || [];
        }
      }

      // Combinar requests específicos e globais
      const allRequests = [...(specificRequests || []), ...globalRequests];
      console.log('Document requests encontrados (específicos + globais):', allRequests);

      // Buscar uploads para cada request
      if (allRequests && allRequests.length > 0) {
        const requestIds = allRequests.map(req => req.id);
        console.log('IDs dos requests para buscar uploads:', requestIds);
        
        const { data: uploads, error: uploadsError } = await supabase
          .from('document_request_uploads')
          .select('*')
          .in('document_request_id', requestIds);

        if (uploadsError) {
          console.error("Error fetching uploads:", uploadsError);
        } else {
          console.log('Uploads encontrados para os requests:', uploads);
          // Associar uploads aos requests
          const requestsWithUploads = allRequests.map(request => ({
            ...request,
            uploads: uploads?.filter(upload => upload.document_request_id === request.id) || []
          }));
          console.log('Requests com uploads:', requestsWithUploads);
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
      console.log('=== Buscando uploads específicos do aluno ===');
      console.log('Application ID:', application.id);
      console.log('Student user_id:', application.user_profiles?.user_id);
      
      let uploads: any[] = [];
      
      // Estratégia 1: Buscar uploads através dos document_requests da aplicação
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
              scholarship_application_id
            )
          `)
          .eq('document_requests.scholarship_application_id', application.id);
        
        if (errorApp) {
          console.log('Erro ao buscar uploads por aplicação:', errorApp);
        } else if (uploadsForApp && uploadsForApp.length > 0) {
          console.log('Uploads encontrados por aplicação:', uploadsForApp.length);
          uploads = uploadsForApp;
        }
      } catch (error) {
        console.log('Erro na estratégia 1:', error);
      }
      
      // Estratégia 2: Se não encontrou por aplicação, buscar por uploaded_by (ID do usuário)
      if (uploads.length === 0 && application.user_profiles?.user_id) {
        try {
          console.log('Tentativa alternativa: buscando por uploaded_by =', application.user_profiles.user_id);
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
                scholarship_application_id
              )
            `)
            .eq('uploaded_by', application.user_profiles.user_id);
          
          if (error1) {
            console.log('Erro ao buscar por uploaded_by:', error1);
          } else if (uploadsByUser && uploadsByUser.length > 0) {
            console.log('Uploads encontrados por uploaded_by:', uploadsByUser.length);
            uploads = uploadsByUser;
          }
        } catch (error) {
          console.log('Erro na estratégia 2:', error);
        }
      }
      
      // Se não encontrou nada, retornar array vazio (não buscar todos os uploads!)
      if (uploads.length === 0) {
        console.log('Nenhum upload encontrado para este aluno específico');
        uploads = [];
      }

      console.log('Uploads finais encontrados:', uploads);

      // Buscar também a carta de aceite da aplicação
      let acceptanceLetterDoc = null;
      console.log('=== Verificando carta de aceite ===');
      console.log('application.acceptance_letter_url:', application.acceptance_letter_url);
      console.log('application.acceptance_letter_status:', application.acceptance_letter_status);
      console.log('application.acceptance_letter_sent_at:', application.acceptance_letter_sent_at);
      
      // Verificar se há carta de aceite
      // Só aceitar se tiver URL E status não for 'pending' (ou se não tiver status definido)
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
        console.log('Carta de aceite encontrada:', acceptanceLetterDoc);
      } else {
        console.log('Carta de aceite NÃO encontrada ou status é pending');
        console.log('Motivos possíveis:');
        console.log('- acceptance_letter_url está vazio:', !application.acceptance_letter_url);
        console.log('- acceptance_letter_status está vazio:', !application.acceptance_letter_status);
        console.log('- acceptance_letter_status é pending:', application.acceptance_letter_status === 'pending');
        console.log('- acceptance_letter_url valor:', application.acceptance_letter_url);
        console.log('- acceptance_letter_status valor:', application.acceptance_letter_status);
      }

      // Combinar uploads com a carta de aceite
      let allDocuments = [...uploads];
      if (acceptanceLetterDoc) {
        allDocuments.unshift(acceptanceLetterDoc); // Colocar a carta de aceite no topo
      }

      console.log('=== Resumo final ===');
      console.log('Uploads encontrados:', uploads.length);
      console.log('Carta de aceite encontrada:', !!acceptanceLetterDoc);
      console.log('Total de documentos:', allDocuments.length);

      if (!allDocuments || allDocuments.length === 0) {
        console.log('Nenhum documento encontrado para este aluno');
        setStudentDocuments([]);
        return;
      }

      // Formatar os documentos para exibição
      const studentDocuments = allDocuments.map(doc => {
        console.log('=== Formatando documento ===');
        console.log('Documento original:', doc);
        console.log('file_url:', doc.file_url);
        console.log('Tipo de file_url:', typeof doc.file_url);
        
        // Determinar o nome do arquivo
        let filename = 'Document';
        if (doc.file_url) {
          const urlParts = doc.file_url.split('/');
          filename = urlParts[urlParts.length - 1] || 'Document';
        } else if (doc.filename) {
          filename = doc.filename;
        }
        
        const formatted = {
          id: doc.id,
          filename: filename,
          file_url: doc.file_url,
          status: doc.status || 'under_review',
          uploaded_at: doc.uploaded_at || doc.created_at,
          request_title: doc.request_title || doc.title || 'Document Request',
          request_description: doc.request_description || doc.description || '',
          request_created_at: doc.request_created_at || doc.created_at,
          is_global: doc.is_global || false,
          request_type: doc.request_type || 'document',
          is_acceptance_letter: doc.is_acceptance_letter || false
        };
        
        console.log('Documento formatado:', formatted);
        return formatted;
      });

      console.log('Documentos formatados para exibição:', studentDocuments);
      setStudentDocuments(studentDocuments);
    } catch (error) {
      console.error("Error in fetchStudentDocuments:", error);
      setStudentDocuments([]);
    }
  };

  // Debug: verificar estado da autenticação
  useEffect(() => {
    // Estado da autenticação verificado
  }, [user]);

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E] mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }
  
  if (!application) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p>Application not found.</p>
      </div>
    );
  }

  // Verificar se application existe antes de extrair dados
  if (!application) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E] mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading application details...</p>
        </div>
      </div>
    );
  }

  // Verificar se application.user_profiles existe
  if (!application.user_profiles) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-slate-600">Student profile not found</p>
          <p className="text-sm text-slate-500 mt-2">Please check the application data</p>
        </div>
      </div>
    );
  }
  const latestDocByType = (type: string) => {
    // ✅ CORREÇÃO: Buscar documentos de MÚLTIPLAS fontes para garantir que todos os 3 sejam exibidos
    
    // Fonte 1: Documentos da aplicação (scholarship_applications.documents)
    const appDocsOfType = Array.isArray((application as any)?.documents) 
      ? (application as any).documents.filter((d: any) => d.type === type)
      : [];
    
    // Fonte 2: Documentos do perfil do aluno (user_profiles.documents)
    const profileDocsOfType = Array.isArray((application as any)?.user_profiles?.documents)
      ? (application as any).user_profiles.documents.filter((d: any) => d.type === type)
      : [];
    
    // Fonte 3: Documentos da tabela student_documents
    const storageDocsOfType = studentDocs.filter(doc => doc.type === type);
    
    // Combinar todas as fontes
    const allDocsOfType = [
      ...appDocsOfType.map((d: any) => ({ ...d, source: 'application', file_url: d.url || d.file_url })),
      ...profileDocsOfType.map((d: any) => ({ ...d, source: 'profile', file_url: d.url || d.file_url })),
      ...storageDocsOfType.map((d: any) => ({ ...d, source: 'storage', file_url: d.file_url }))
    ];
    
    if (allDocsOfType.length > 0) {
      // Ordenar por uploaded_at e pegar o mais recente
      const latestDoc = allDocsOfType.sort((a: any, b: any) => {
        const dateA = new Date(a.uploaded_at || a.created_at || 0).getTime();
        const dateB = new Date(b.uploaded_at || b.created_at || 0).getTime();
        return dateB - dateA;
      })[0];
      
      console.log(`latestDocByType(${type}): Found document from source ${latestDoc.source}:`, latestDoc);
      
      // ✅ CORREÇÃO: Garantir que file_url seja sempre uma URL completa
      let finalFileUrl = latestDoc.file_url;
      
      // Se file_url não é uma URL completa, construir a URL completa do Supabase
      if (finalFileUrl && !finalFileUrl.startsWith('http')) {
        finalFileUrl = `https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/student-documents/${finalFileUrl}`;
        console.log(`latestDocByType(${type}): Construída URL completa:`, finalFileUrl);
      }
      
      return {
        id: latestDoc.id || `temp_${type}_${Date.now()}`,
        type: latestDoc.type,
        file_url: finalFileUrl,
        status: latestDoc.status || 'under_review',
        uploaded_at: latestDoc.uploaded_at || latestDoc.created_at,
        source: latestDoc.source
      };
    }
    
    console.log(`latestDocByType(${type}): No document found`);
    return null;
  };

  const updateApplicationDocStatus = async (
    type: string,
    status: 'approved' | 'changes_requested' | 'under_review',
    reviewNotes?: string
  ) => {
    const docs = Array.isArray((application as any)?.documents) ? ([...(application as any).documents] as any[]) : [];
    const idx = docs.findIndex((d) => d.type === type);
    if (idx >= 0) {
      docs[idx] = { ...docs[idx], status, review_notes: reviewNotes ?? docs[idx]?.review_notes };
    }
    await supabase.from('scholarship_applications').update({ documents: docs }).eq('id', applicationId);
    setApplication((prev) => prev ? ({ ...prev, documents: docs } as any) : prev);
  };

  // Funções para a aba Documents
  const handleViewUpload = (upload: any) => {
    // Implementar visualização do upload
    console.log('View upload:', upload);
  };

  const handleDownloadTemplate = (url: string) => {
    // Implementar download do template
    console.log('Download template:', url);
  };

  const handleApproveDocument = async (documentId: string) => {
    try {
      // Primeiro, buscar informações do upload para notificação
      const { data: uploadData, error: fetchError } = await supabase
        .from('document_request_uploads')
        .select(`
          *,
          document_requests!inner(
            id,
            title,
            description
          )
        `)
        .eq('id', documentId)
        .single();

      if (fetchError) {
        throw new Error('Failed to fetch upload data: ' + fetchError.message);
      }

      // Atualizar o status para aprovado
      const { error } = await supabase
        .from('document_request_uploads')
        .update({ status: 'approved' })
        .eq('id', documentId);
      
      if (error) {
        throw new Error('Failed to approve document: ' + error.message);
      }

      // Enviar notificação ao aluno
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', application?.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Documento aprovado",
            email_aluno: userData.email,
            nome_aluno: application?.user_profiles.full_name,
            email_universidade: user?.email,
            o_que_enviar: `Congratulations! Your document <strong>${uploadData.file_url?.split('/').pop()}</strong> for the request <strong>${uploadData.document_requests?.title}</strong> has been approved.`
          };

          console.log('Enviando webhook...');
          console.log('Webhook URL:', 'https://nwh.suaiden.com/webhook/notfmatriculausa');
          console.log('Webhook payload:', webhookPayload);
          
          try {
            const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            });
            
            console.log('Webhook response status:', webhookResponse.status);
            console.log('Webhook response ok:', webhookResponse.ok);
            
            if (!webhookResponse.ok) {
              const webhookErrorText = await webhookResponse.text();
              console.error('Webhook error:', webhookErrorText);
            } else {
              console.log('Webhook enviado com sucesso');
            }
          } catch (webhookError) {
            console.error('Erro ao enviar webhook:', webhookError);
          }

          // Notificação in-app no sino do aluno
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (accessToken) {
              await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  user_id: application?.user_profiles.user_id,
                  title: 'Document approved',
                  message: `Your document ${uploadData.file_url?.split('/').pop()} was approved for request ${uploadData.document_requests?.title}.`,
                  type: 'document_approved',
                  link: '/student/dashboard',
                }),
              });
            }
          } catch (e) {
            console.error('Error sending in-app student notification:', e);
          }
        }
      } catch (notificationError) {
        console.error('Error sending approval notification:', notificationError);
      }

      // Atualizar o estado local dos documentos do aluno
      setStudentDocuments(prev => prev.map(doc => 
        doc.id === documentId ? { ...doc, status: 'approved' } : doc
      ));

      // Recarregar os dados para mostrar o novo status
      fetchStudentDocuments();

      // Log: aprovação de document request pela universidade
      try {
        const studentProfileId = application?.user_profiles?.id;
        const performedBy = user?.id || '';
        if (studentProfileId && performedBy) {
          // Enriquecer metadados com IP público (melhor esforço)
          let clientIp: string | undefined = undefined;
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
              const j = await res.json();
              clientIp = j?.ip;
            }
          } catch (_) { /* ignore */ }

          await supabase.rpc('log_student_action', {
            p_student_id: studentProfileId,
            p_action_type: 'document_approval',
            p_action_description: `University approved document request upload: ${uploadData.file_url?.split('/').pop() || 'file'} (${uploadData.document_requests?.title || 'Request'})`,
            p_performed_by: performedBy,
            p_performed_by_type: 'university',
            p_metadata: {
              upload_id: documentId,
              request_id: uploadData.document_requests?.id || null,
              request_title: uploadData.document_requests?.title || null,
              ip: clientIp
            }
          });
        }
      } catch (logErr) {
        console.error('Failed to log university document approval:', logErr);
      }

    } catch (err: any) {
      console.error("Error approving document:", err);
      alert(`Failed to approve document: ${err.message}`);
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    if (!doc.file_url) return;
    
    try {
      // ✅ CORREÇÃO: Não converter a URL aqui, deixar o DocumentViewerModal fazer isso
      // Isso permite que o modal teste ambos os buckets (document-attachments e student-documents)
      let downloadUrl = doc.file_url;
      
      // Fazer download usando a URL
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Failed to download document: ' + response.statusText);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.filename || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Erro no download:', err);
      alert(`Failed to download document: ${err.message}`);
    }
  };

  const handleViewDocument = (doc: any) => {
    // Verificação de segurança adicional
    if (!doc || !doc.file_url) {
      return;
    }
    
    // ✅ CORREÇÃO: Não converter a URL aqui, deixar o DocumentViewerModal fazer isso
    // Isso permite que o modal teste ambos os buckets (document-attachments e student-documents)
    setPreviewUrl(doc.file_url);
  };

  const approveDoc = async (type: string) => {
    try {
      setUpdating(type);
      
      // Buscar a aplicação atual para obter os documentos existentes
      const { data: currentApp, error: fetchError } = await supabase
        .from('scholarship_applications')
        .select('documents')
        .eq('id', applicationId)
        .single();
      
      if (fetchError) {
        throw new Error('Failed to fetch current application: ' + fetchError.message);
      }

      // Preparar os documentos atualizados
      let updatedDocuments = currentApp?.documents || [];
      const existingDocIndex = updatedDocuments.findIndex((d: any) => d.type === type);
      
      if (existingDocIndex >= 0) {
        // Atualizar documento existente
        updatedDocuments[existingDocIndex] = {
          ...updatedDocuments[existingDocIndex],
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        };
      } else {
        // Adicionar novo documento aprovado
        updatedDocuments.push({
          type,
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        });
      }

      // Salvar no banco de dados
      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({ documents: updatedDocuments })
        .eq('id', applicationId);

      if (updateError) {
        throw new Error('Failed to update application documents: ' + updateError.message);
      }

      // Verificar se todos os documentos foram aprovados
      const allDocsApproved = ['passport', 'diploma', 'funds_proof']
        .every((docType) => {
          const doc = updatedDocuments.find((d: any) => d.type === docType);
          return doc && doc.status === 'approved';
        });
      
      // Se todos os documentos foram aprovados, atualizar status geral
      if (allDocsApproved) {
        console.log('=== TODOS OS DOCUMENTOS APROVADOS - ATUALIZANDO STATUS ===');
        console.log('User ID:', application.user_profiles.user_id);
        
        const { error: profileUpdateError } = await supabase
          .from('user_profiles')
          .update({ documents_status: 'approved' })
          .eq('user_id', application.user_profiles.user_id);
        
        if (profileUpdateError) {
          console.error('Erro ao atualizar documents_status:', profileUpdateError);
        } else {
          console.log('documents_status atualizado para approved!');
        }
        
        // Atualizar o estado local da aplicação
        setApplication((prev) => prev ? ({ ...prev, documents: updatedDocuments } as any) : prev);
      }

      // Atualizar o estado local dos documentos do aluno
      setStudentDocs(prev => prev.map(doc => 
        doc.type === type ? { ...doc, status: 'approved' } : doc
      ));

      // Atualizar estado local dos documentos
      setStudentDocs(prev => prev.map(doc => 
        doc.type === type ? { ...doc, status: 'approved' } : doc
      ));
      
      console.log(`Document ${type} approved successfully`);
      
    } catch (error: any) {
      console.error(`Error approving document ${type}:`, error);
      alert(`Failed to approve document: ${error.message}`);
    } finally {
      setUpdating(null);
    }
  };

  const requestChangesDoc = async (type: string, reason: string) => {
    try {
      setUpdating(type);
      await updateApplicationDocStatus(type, 'changes_requested', reason || undefined);
      // Mantém o fluxo do aluno em revisão
      await supabase
        .from('user_profiles')
        .update({ documents_status: 'under_review' })
        .eq('user_id', application.user_profiles.user_id);

      // --- NOTIFICAÇÃO VIA WEBHOOK N8N ---
      try {
        console.log('Enviando notificação de rejeição de documento via webhook...');
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', application.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const documentLabel = DOCUMENTS_INFO.find(doc => doc.key === type)?.label || type;
          const webhookPayload = {
            tipo_notf: "Documento rejeitado",
            email_aluno: userData.email,
            nome_aluno: application.user_profiles.full_name || 'Student',
            email_universidade: user?.email,
            o_que_enviar: `Your document <strong>${documentLabel}</strong> has been rejected and needs changes. Reason: <strong>${reason}</strong>. Please review and upload a corrected version.`
          };

          console.log('Enviando webhook para documento rejeitado:', webhookPayload);
          
          const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
          });
          
          console.log('Webhook response status:', webhookResponse.status);
          
          if (!webhookResponse.ok) {
            const webhookErrorText = await webhookResponse.text();
            console.error('Webhook error:', webhookErrorText);
          } else {
            console.log('Webhook enviado com sucesso para rejeição de documento');
          }

          // Notificação in-app no sino do aluno
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (accessToken) {
              await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  user_id: application.user_profiles.user_id,
                  title: 'Document rejected',
                  message: `Your ${documentLabel} document was rejected. Reason: ${reason}`,
                  type: 'document_rejected',
                  link: '/student/dashboard',
                }),
              });
            }
          } catch (e) {
            console.error('Error sending in-app student notification:', e);
          }
        }
      } catch (notificationError) {
        console.error('Error sending rejection notification:', notificationError);
      }
      // --- FIM DA NOTIFICAÇÃO ---
    } finally {
      setUpdating(null);
    }
  };





  const rejectStudent = async () => {
    try {
      // Atualiza perfil do aluno para estado rejeitado
      await supabase
        .from('user_profiles')
        .update({ documents_status: 'rejected' })
        .eq('user_id', application.user_profiles.user_id);
      // Atualiza aplicação com status e justificativa
      await supabase
        .from('scholarship_applications')
        .update({ status: 'rejected', notes: rejectStudentReason || null })
        .eq('id', applicationId);
      
      // Atualizar o estado local da aplicação
      setApplication(prev => prev ? ({
        ...prev,
        status: 'rejected'
      } as any) : prev);
      
      setActiveTab('details');
      setShowRejectStudentModal(false);
      setRejectStudentReason('');
    } catch (error) {
      console.error('Error rejecting student:', error);
    }
  };

  const handleRejectDocument = async (documentId: string, reason: string) => {
    try {
      // Primeiro, buscar informações do upload para notificação
      const { data: uploadData, error: fetchError } = await supabase
        .from('document_request_uploads')
        .select(`
          *,
          document_requests!inner(
            id,
            title,
            description
          )
        `)
        .eq('id', documentId)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar dados do upload:', fetchError);
        throw new Error('Failed to fetch upload data: ' + fetchError.message);
      }

      // Atualizar o status para rejeitado
      const { error } = await supabase
        .from('document_request_uploads')
        .update({ 
          status: 'rejected',
          review_notes: reason || null
        })
        .eq('id', documentId);
      
      if (error) {
        console.error('Erro ao atualizar status:', error);
        throw new Error('Failed to reject document: ' + error.message);
      }

      // Atualizar o estado local dos documentos do aluno
      setStudentDocuments(prev => prev.map(doc => 
        doc.id === documentId ? { ...doc, status: 'rejected' } : doc
      ));

      // Enviar notificação ao aluno
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', application?.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Documento rejeitado",
            email_aluno: userData.email,
            nome_aluno: application?.user_profiles.full_name,
            email_universidade: user?.email,
            o_que_enviar: `Your document <strong>${uploadData.file_url?.split('/').pop()}</strong> for the request <strong>${uploadData.document_requests?.title}</strong> has been rejected. Reason: <strong>${reason}</strong>. Please review and upload a corrected version.`
          };

          try {
            const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            });
            
            if (!webhookResponse.ok) {
              const webhookErrorText = await webhookResponse.text();
              console.error('Webhook error:', webhookErrorText);
            }
          } catch (webhookError) {
            console.error('Erro ao enviar webhook:', webhookError);
          }

          // Notificação in-app no sino do aluno — deve ser enviada SEMPRE, independente do e-mail
        }

        try {
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;
          
          if (accessToken) {
            const notificationPayload = {
              user_id: application?.user_profiles.user_id,
              title: 'Document rejected',
              message: `Your document ${uploadData.file_url?.split('/').pop()} was rejected. Reason: ${reason}`,
              type: 'document_rejected',
              link: '/student/dashboard',
            };
            
            const response = await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify(notificationPayload),
            });
            
            let responseData;
            try {
              responseData = await response.json();
            } catch (parseError) {
              console.error('Erro ao fazer parse da resposta:', parseError);
              const responseText = await response.text();
              console.error('Resposta da Edge Function (texto):', responseText);
            }
            
            if (!response.ok) {
              console.error('Erro na Edge Function:', responseData);
            } else {
              console.log('✅ Notificação de rejeição enviada com sucesso:', responseData);
            }
          }
        } catch (e) {
          console.error('Error sending in-app student notification:', e);
        }
      } catch (notificationError) {
        console.error('Error sending rejection notification:', notificationError);
      }

      // Recarregar documentos do estudante
      fetchStudentDocuments();
      
    } catch (err: any) {
      console.error("Error rejecting document:", err);
      alert(`Failed to reject document: ${err.message}`);
    }
  };

  // Função para limpar erros de seleção de arquivo
  const clearFileSelectionError = () => {
    // Função removida - não há mais fileSelectionError
  };

  // Função para selecionar arquivo da carta de aceite
  const handleAcceptanceLetterFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {

      setTimeout(() => {
        try {
          const file = event.target.files?.[0];
          if (file) {
            // Validar o arquivo
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
              alert('File size must be less than 10MB');
              return;
            }
            
            // Validar tipo de arquivo
            const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
            const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
            if (!allowedTypes.includes(fileExtension)) {
              alert('Please select a valid file type: PDF, DOC, DOCX, JPG, JPEG, or PNG');
              return;
            }
            
            setAcceptanceLetterFile(file);
            setAcceptanceLetterUploaded(false);
            
            // Limpar o input para permitir selecionar o mesmo arquivo novamente
            event.target.value = '';
          }
        } catch (error) {
          console.error('Error processing file selection:', error);
          alert('Error processing file. Please try again.');
        } finally {
          setIsFileSelecting(false);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error selecting file:', error);
      alert('Error selecting file. Please try again.');
      setIsFileSelecting(false);
    }
  };

  // Função para sanitizar nomes de arquivos (remover acentos, espaços e caracteres especiais)
  const sanitizeFileName = (fileName: string): string => {
    return fileName
      .normalize('NFD') // Decompor caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos (acentos)
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Substituir caracteres especiais por underscore
      .replace(/_+/g, '_') // Remover underscores múltiplos
      .replace(/^_|_$/g, ''); // Remover underscores do início e fim
  };

  // Função para processar a carta de aceite
  const handleProcessAcceptanceLetter = async () => {
    if (!application || !acceptanceLetterFile) {
      alert('Please select a file first.');
      return;
    }

    setUploadingAcceptanceLetter(true);
    try {
      // Sanitizar o nome do arquivo e gerar chave segura
      const sanitizedFileName = sanitizeFileName(acceptanceLetterFile.name);
      const fileName = `acceptance_letters/${Date.now()}_${sanitizedFileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(fileName, acceptanceLetterFile);

      if (uploadError) {
        throw new Error('Failed to upload file: ' + uploadError.message);
      }

      // Obter a URL pública do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from('document-attachments')
        .getPublicUrl(uploadData.path);

      // Atualizar a aplicação com a URL da carta de aceite
      const updateData = {
        acceptance_letter_url: publicUrl,
        acceptance_letter_status: 'sent',
        acceptance_letter_sent_at: new Date().toISOString(),
        status: 'enrolled'
      };
      
      console.log('=== ATUALIZANDO APLICAÇÃO COM STATUS ENROLLED ===');
      console.log('Application ID:', application.id);
      console.log('Update data:', updateData);
      
      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update(updateData)
        .eq('id', application.id);

      if (updateError) {
        console.error('Erro ao atualizar aplicação:', updateError);
        throw new Error('Failed to update application: ' + updateError.message);
      }

      console.log('Aplicação atualizada com sucesso!');

      // Atualizar o estado local da aplicação
      setApplication(prev => prev ? ({
        ...prev,
        acceptance_letter_url: publicUrl,
        acceptance_letter_status: 'sent',
        acceptance_letter_sent_at: new Date().toISOString(),
        status: 'enrolled'
      } as any) : prev);

      // Atualizar o estado local da carta de aceite
      setAcceptanceLetterUploaded(true);

      // Atualizar o perfil do usuário com documents_status e status geral
      console.log('=== ATUALIZANDO PERFIL DO USUÁRIO ===');
      console.log('User ID:', application.user_profiles.user_id);
      
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          documents_status: 'approved',
          status: 'enrolled'
        })
        .eq('user_id', application.user_profiles.user_id);

      if (profileError) {
        console.error('Error updating user profile:', profileError);
      } else {
        console.log('Perfil do usuário atualizado com sucesso!');
      }

      // Enviar notificação ao aluno
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', application.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Carta de aceite enviada",
            email_aluno: userData.email,
            nome_aluno: application.user_profiles.full_name,
            email_universidade: user?.email,
            o_que_enviar: `Congratulations! Your acceptance letter has been processed and you are now enrolled. Please check your dashboard for next steps.`
          };

          console.log('Enviando webhook...');
          console.log('Webhook URL:', 'https://nwh.suaiden.com/webhook/notfmatriculausa');
          console.log('Webhook payload:', webhookPayload);
          
          try {
            const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            });
            
            console.log('Webhook response status:', webhookResponse.status);
            console.log('Webhook response ok:', webhookResponse.ok);
            
            if (!webhookResponse.ok) {
              const webhookErrorText = await webhookResponse.text();
              console.error('Webhook error:', webhookErrorText);
            } else {
              console.log('Webhook enviado com sucesso');
            }
          } catch (webhookError) {
            console.error('Erro ao enviar webhook:', webhookError);
          }

          // Segundo webhook: Notificar sobre I-20 Control Fee disponível
          try {
            const i20ControlFeePayload = {
              tipo_notf: "I-20 Control Fee Disponível",
              email_aluno: userData.email,
              nome_aluno: application.user_profiles.full_name,
              email_universidade: user?.email,
              o_que_enviar: `Great news! Your I-20 Control Fee is now available for payment. This fee is required for the issuance of your I-20 document, essential for your F-1 visa. You have 10 days to complete this payment. Please check your dashboard to proceed.`
            };

            console.log('Enviando webhook I-20 Control Fee...');
            console.log('Webhook URL:', 'https://nwh.suaiden.com/webhook/notfmatriculausa');
            console.log('I-20 Control Fee payload:', i20ControlFeePayload);
            
            const i20WebhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(i20ControlFeePayload),
            });
            
            console.log('I-20 Control Fee webhook response status:', i20WebhookResponse.status);
            console.log('I-20 Control Fee webhook response ok:', i20WebhookResponse.ok);
            
            if (!i20WebhookResponse.ok) {
              const i20WebhookErrorText = await i20WebhookResponse.text();
              console.error('I-20 Control Fee webhook error:', i20WebhookErrorText);
            } else {
              console.log('I-20 Control Fee webhook enviado com sucesso');
            }
          } catch (i20WebhookError) {
            console.error('Erro ao enviar webhook I-20 Control Fee:', i20WebhookError);
          }

          // Notificação in-app no sino do aluno
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (accessToken) {
              await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  user_id: application.user_profiles.user_id,
                  title: 'Enrolled - Acceptance letter processed',
                  message: 'Your enrollment is confirmed. Check your dashboard for next steps.',
                  type: 'enrolled',
                  link: '/student/dashboard',
                }),
              });
            }
          } catch (e) {
            console.error('Error sending in-app student notification:', e);
          }
        }
      } catch (notificationError) {
        console.error('Error sending acceptance notification:', notificationError);
      }

      setAcceptanceLetterUploaded(true);
      
      // Recarregar apenas os documentos do aluno
      await fetchStudentDocuments();
      
      // Recarregar os dados da aplicação para garantir sincronização
      console.log('=== RECARREGANDO DADOS DA APLICAÇÃO ===');
      await fetchApplicationDetails();

      // Log: envio de acceptance letter pela universidade
      try {
        const studentProfileId = application?.user_profiles?.id;
        const performedBy = user?.id || '';
        if (studentProfileId && performedBy) {
          // Enriquecer metadados com IP público (melhor esforço)
          let clientIp: string | undefined = undefined;
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
              const j = await res.json();
              clientIp = j?.ip;
            }
          } catch (_) { /* ignore */ }

          await supabase.rpc('log_student_action', {
            p_student_id: studentProfileId,
            p_action_type: 'acceptance_letter_sent',
            p_action_description: 'University sent acceptance letter',
            p_performed_by: performedBy,
            p_performed_by_type: 'university',
            p_metadata: {
              application_id: application.id,
              acceptance_letter_url: publicUrl,
              ip: clientIp
            }
          });
        }
      } catch (logErr) {
        console.error('Failed to log acceptance letter sent (university):', logErr);
      }
    } catch (error: any) {
      console.error('Error processing acceptance letter:', error);
      alert(`Failed to process acceptance letter: ${error.message}`);
    } finally {
      setUploadingAcceptanceLetter(false);
    }
  };

  // Função para criar nova solicitação de documento
  const handleCreateDocumentRequest = async () => {
    if (!application) return;
    setCreatingDocumentRequest(true);
    try {
      let attachment_url = '';
      
      // Upload do arquivo se houver
      if (newDocumentRequest.attachment) {
        const { data, error } = await supabase.storage
          .from('document-attachments')
          .upload(`individual/${Date.now()}_${newDocumentRequest.attachment.name}`, newDocumentRequest.attachment);
        
        if (error) {
          throw new Error('Failed to upload attachment: ' + error.message);
        }
        attachment_url = data?.path;
      }

      // Buscar university_id da aplicação
      const { data: appData } = await supabase
        .from('scholarship_applications')
        .select('scholarship_id, scholarships(university_id)')
        .eq('id', application.id)
        .single();

      let university_id: string | undefined = undefined;
      if (appData?.scholarships) {
        if (Array.isArray(appData.scholarships)) {
          university_id = (appData.scholarships[0] as any)?.university_id;
        } else {
          university_id = (appData.scholarships as any).university_id;
        }
      }

      // Criar o request usando a Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      const payload = {
        title: newDocumentRequest.title,
        description: newDocumentRequest.description,
        due_date: newDocumentRequest.due_date || null,
        attachment_url,
        university_id,
        is_global: false,
        status: 'open',
        created_by: user?.id || '',
        scholarship_application_id: application.id
      };

      const response = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/create-document-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      let result: any = {};
      try {
        result = await response.json();
      } catch (e) {
        console.log('Erro ao fazer parse do JSON de resposta:', e);
      }

      if (!response.ok || !result.success) {
        throw new Error('Failed to create request: ' + (result.error || 'Unknown error'));
      }

      // Enviar notificação para o aluno
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', application.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Nova solicitação de documento",
            email_aluno: userData.email,
            nome_aluno: application.user_profiles.full_name,
            email_universidade: user?.email,
            o_que_enviar: `A new document request has been submitted for your review: <strong>${newDocumentRequest.title}</strong>. Please log in to your dashboard to view the details and upload the requested document.`
          };

          console.log('Enviando webhook...');
          console.log('Webhook URL:', 'https://nwh.suaiden.com/webhook/notfmatriculausa');
          console.log('Webhook payload:', webhookPayload);
          
          try {
            const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            });
            
            console.log('Webhook response status:', webhookResponse.status);
            console.log('Webhook response ok:', webhookResponse.ok);
            
            if (!webhookResponse.ok) {
              const webhookErrorText = await webhookResponse.text();
              console.error('Webhook error:', webhookErrorText);
            } else {
              console.log('Webhook enviado com sucesso');
            }
          } catch (webhookError) {
            console.error('Erro ao enviar webhook:', webhookError);
          }

          // Notificação in-app no sino do aluno
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (accessToken) {
              await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/create-student-notification', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  user_id: application.user_profiles.user_id,
                  title: 'New document request',
                  message: `A new document request was created: ${newDocumentRequest.title}.`,
                  type: 'document_request_created',
                  link: '/student/documents',
                }),
              });
            }
          } catch (e) {
            console.error('Error sending in-app student notification:', e);
          }
        }
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
      }

      // Limpar formulário e fechar modal
      setNewDocumentRequest({ title: '', description: '', due_date: '', attachment: null });
      setShowNewRequestModal(false);
      
      // Recarregar solicitações de documentos
      fetchDocumentRequests();
      
    } catch (err: any) {
      console.error("Error creating document request:", err);
      alert(`Failed to create document request: ${err.message}`);
    } finally {
      setCreatingDocumentRequest(false);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto">   
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-slate-200 rounded-t-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Student Application
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Review and manage {application?.user_profiles?.full_name || 'Student'}'s application details
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {application.status === 'enrolled' || application.acceptance_letter_status === 'approved' ? (
                <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Enrolled
                </div>
              ) : (
                <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-300">
                  <div className="w-2 h-2 bg-slate-400 rounded-full mr-2 animate-pulse"></div>
                  Pending Review
                </div>
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
                    <UserCircle className="w-6 h-6 mr-3" />
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
                          <dd className="text-base font-semibold text-slate-900 mt-1">{application?.user_profiles?.full_name || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Email</dt>
                          <dd className="text-base text-slate-900 mt-1">{application?.user_profiles?.email || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Phone</dt>
                          <dd className="text-base text-slate-900 mt-1">{application?.user_profiles?.phone || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Country</dt>
                          <dd className="text-base text-slate-900 mt-1">{application?.user_profiles?.country || 'Not specified'}</dd>
                        </div>
                      </div>
                    </div>

                    {/* Academic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Academic Profile</h3>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Field of Interest</dt>
                          <dd className="text-base text-slate-900 mt-1">{application?.user_profiles?.field_of_interest || 'Not specified'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Academic Level</dt>
                          <dd className="text-base text-slate-900 mt-1">{application?.user_profiles?.academic_level || 'Not specified'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">GPA</dt>
                          <dd className="text-base text-slate-900 mt-1">{application?.user_profiles?.gpa || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">English Proficiency</dt>
                          <dd className="text-base text-slate-900 mt-1">{application?.user_profiles?.english_proficiency || 'Not specified'}</dd>
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
                            {application.student_process_type === 'initial' ? 'Initial - F-1 Visa Required' :
                             application.student_process_type === 'transfer' ? 'Transfer - Current F-1 Student' :
                             application.student_process_type === 'change_of_status' ? 'Change of Status - From Other Visa' :
                             application.student_process_type || 'Not specified'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Application Fee</dt>
                          <dd className="mt-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {(() => {
                                  const paid = (application as any)?.is_application_fee_paid ?? application?.user_profiles?.is_application_fee_paid;
                                  return (
                                    <>
                                      <div className={`w-2 h-2 rounded-full ${paid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                      <span className={`text-sm font-medium ${paid ? 'text-green-700' : 'text-red-700'}`}>
                                        {paid ? 'Paid' : 'Pending'}
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                              <div className="text-right">
                                <span className="text-lg font-bold text-slate-900">
                                  {(() => {
                                    console.log('🔍 [STUDENT_DETAILS] Application Fee Debug:', {
                                      hasScholarship: !!application?.scholarships,
                                      applicationFeeAmount: application?.scholarships?.application_fee_amount,
                                      isApplicationFeePaid: application?.is_application_fee_paid,
                                      defaultFee: getFeeAmount('application_fee')
                                    });
                                    
                                    // Usar valor dinâmico da bolsa se disponível, senão usar valor padrão do sistema
                                    // Verificar se scholarships é array ou objeto
                                    const scholarship = Array.isArray(application?.scholarships) 
                                      ? application.scholarships[0] 
                                      : application?.scholarships;
                                    
                                    if (scholarship?.application_fee_amount) {
                                      const amount = Number(scholarship.application_fee_amount);
                                      console.log('🔍 [STUDENT_DETAILS] Using dynamic amount from scholarship (already in dollars):', amount);
                                      return formatFeeAmount(amount);
                                    } else {
                                      console.log('🔍 [STUDENT_DETAILS] Using default amount:', getFeeAmount('application_fee'));
                                      return formatFeeAmount(getFeeAmount('application_fee'));
                                    }
                                  })()}
                                </span>
                                <div className="text-xs text-slate-500">USD</div>
                              </div>
                            </div>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Documents Status</dt>
                          <dd className="mt-1">
                            <div className="flex items-center space-x-2">
                              {(() => {
                                const statusDisplay = getDocumentStatusDisplay(application?.user_profiles?.documents_status || '');
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
                            {application.status === 'enrolled' || application.acceptance_letter_status === 'approved' ? (
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
                        <dd className="text-lg font-semibold text-slate-900">{application.scholarships.title}</dd>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">Annual Value</dt>
                        <dd className="text-2xl font-bold text-[#05294E]">
                          ${Number(application.scholarships.annual_value_with_scholarship ?? 0).toLocaleString()}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">Description</dt>
                        <dd className="text-base text-slate-700 leading-relaxed">{application.scholarships.description}</dd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Exemplo de exibição condicional do botão do I-20 Control Fee */}
              {application.acceptance_letter_status === 'approved' && (
                <div className="mt-6">
                  {/* Aqui vai o botão do I-20 Control Fee, se já não estiver em outro lugar */}
                  {/* <ButtonI20ControlFee ... /> */}
                </div>
              )}

              {/* Student Documents Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Student Documents
                  </h2>
                  <p className="text-slate-200 text-sm mt-1">Review each document and approve or request changes</p>
                </div>
                <div className="p-6">
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
                                    Uploaded: {d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : new Date().toLocaleDateString()}
                                  </p>
                                )}
                                
                                {/* Botões posicionados abaixo das informações */}
                                <div className="flex items-center space-x-2 mt-3">
                                  {/* Botões de ação para documentos Under Review */}
                                  {d?.file_url && status !== 'approved' && application.status !== 'enrolled' && application.acceptance_letter_status !== 'approved' && (
                                    <div className="flex items-center space-x-2 mr-3">
                                      <button
                                        onClick={() => d && approveDoc(d.type)}
                                        disabled={updating === d.type}
                                        className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (d) {
                                            setPendingRejectType(d.type);
                                            setShowReasonModal(true);
                                          }
                                        }}
                                        disabled={updating === d.type}
                                        className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                  
                                  {/* Botões de visualização e download - só mostrar se houver documento */}
                                  {d?.file_url && (
                                    <>
                                      <button 
                                        onClick={() => handleViewDocument(d)}
                                        className="bg-[#05294E] hover:bg-[#041f38] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                      >
                                        View Document
                                      </button>
                                      <button 
                                        onClick={() => handleDownloadDocument(d)}
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                      >
                                        Download
                                      </button>
                                    </>
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
                      {new Date((application as any).created_at || Date.now()).toLocaleDateString()}
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
                        <p className="text-xs text-slate-500">{new Date((application as any).created_at || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {(application as any).updated_at !== (application as any).created_at && (
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-900">Last updated</p>
                          <p className="text-xs text-slate-500">{new Date((application as any).updated_at || Date.now()).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
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
                    {[
                      { label: 'Documents', tab: 'documents', icon: FileText }
                    ].map((action) => (
                      <button
                        key={action.tab}
                        onClick={() => setActiveTab(action.tab as any)}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <action.icon className="w-5 h-5 text-slate-600" />
                          <span className="text-sm font-medium text-slate-900">{action.label}</span>
                        </div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
      )}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#05294E] to-[#0a4a7a] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <MessageCircle className="w-6 h-6 mr-3" />
              Communication Center
            </h2>
          </div>
          <div className="p-6">
            <div className="flex-1 flex flex-col">
              <ApplicationChat
                messages={chat.messages}
                onSend={chat.sendMessage as any}
                loading={chat.loading}
                isSending={chat.isSending}
                error={chat.error}
                currentUserId={user?.id || ''}
                messageContainerClassName="gap-6 py-4"
              />
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
                    <p className="text-slate-200 text-sm mt-1">Request and manage student documents</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* New Request Button */}
              <div className="flex justify-end mb-6">
                <button 
                  onClick={() => setShowNewRequestModal(true)}
                  className="bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-3 rounded-xl font-semibold shadow-sm transition-all duration-200 flex items-center space-x-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Request</span>
                </button>
              </div>

              {/* University Document Requests */}
              <div className="mb-6">
                {documentRequests.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-slate-600 font-medium">No document requests yet</p>
                    <p className="text-sm text-slate-500 mt-1">Create your first request using the button above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documentRequests.map((request) => (
                      <div key={request.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <h6 className="font-semibold text-slate-900">{request.title}</h6>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    request.is_global 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {request.is_global ? 'Global Request' : 'Individual Request'}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600">{request.description}</p>
                                {request.due_date && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    Due: {new Date(request.due_date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Student Upload Status */}
                            {request.uploads && request.uploads.length > 0 ? (
                              <div className="ml-13 mt-3">
                                <div className="flex items-center space-x-3">
                                  <span className="text-sm text-slate-600">Student response:</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    request.uploads[0].status === 'approved' ? 'bg-green-100 text-green-800' :
                                    request.uploads[0].status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {request.uploads[0].status === 'approved' ? 'Approved' :
                                     request.uploads[0].status === 'rejected' ? 'Rejected' :
                                     'Under Review'}
                                  </span>
                                  <button 
                                    onClick={() => handleViewUpload(request.uploads[0])}
                                    className="text-[#05294E] hover:text-[#041f38] text-sm font-medium hover:underline"
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="ml-13 mt-3">
                                <span className="text-sm text-slate-500 italic">No response from student yet</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              request.status === 'open' ? 'bg-blue-100 text-blue-800' :
                              request.status === 'closed' ? 'bg-slate-100 text-slate-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {request.status === 'open' ? 'Open' :
                               request.status === 'closed' ? 'Closed' :
                               request.status}
                            </span>
                            
                            {request.attachment_url && (
                              <button 
                                onClick={() => handleDownloadTemplate(request.attachment_url)}
                                className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                              >
                                Template
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Student Uploads Section */}
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

                  {/* Student Uploads */}
                  <div className="border-t border-slate-200 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-lg font-semibold text-slate-800 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Student Responses to Document Requests
                      </h5>
                      <button
                        onClick={() => {
                          console.log('Refresh manual dos documentos');
                          fetchStudentDocuments();
                        }}
                        className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                      </button>
                    </div>
                    {studentDocuments.length === 0 ? (
                      <div className="text-center py-6 bg-slate-50 rounded-3xl">
                        <p className="text-slate-500">No responses from student yet</p>
                        <p className="text-sm text-slate-400 mt-1">Documents will appear here once the student responds to your document requests</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {studentDocuments.map((doc) => {
                          return (
                            <div key={doc.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-4 flex-1">
                                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900">{doc.filename || 'Document'}</p>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        doc.is_global ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                      }`}>
                                        {doc.request_type || 'Individual Request'}
                                      </span>
                                      <span className="text-sm text-slate-500">
                                        Response to: <span className="font-medium text-slate-700">{doc.request_title || 'Unknown Request'}</span>
                                      </span>
                                    </div>
                                    {doc.request_description && (
                                      <p className="text-xs text-slate-400 mt-1">{doc.request_description}</p>
                                    )}
                                    <p className="text-xs text-slate-400 mt-1">
                                      Uploaded: {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Unknown date'}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-3 ml-4">
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {doc.status === 'approved' ? 'Approved' :
                                     doc.status === 'rejected' ? 'Rejected' :
                                     'Under Review'}
                                  </span>
                                  
                                  {/* Botões de ação para documentos Under Review */}
                                  {doc.status === 'under_review' && application.status !== 'enrolled' && application.acceptance_letter_status !== 'approved' && (
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => handleApproveDocument(doc.id)}
                                        className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => {
                                          setPendingRejectDocumentId(doc.id);
                                          setShowRejectDocumentModal(true);
                                        }}
                                        className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                  
                                  <button 
                                    onClick={() => handleDownloadDocument(doc)}
                                    className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                                  >
                                    Download
                                  </button>
                                  <button 
                                    onClick={() => handleViewDocument(doc)}
                                    className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
                      <p className="text-blue-100 text-sm">Upload to automatically enroll the student</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="bg-white rounded-3xl p-6 mb-6">
                    <p className="text-slate-700 mb-6 leading-relaxed">
                      Please upload the student's acceptance letter and any other required documents, such as the I-20 Control Fee receipt.
                    </p>
                    
                    {acceptanceLetterUploaded ? (
                      <div className="text-center py-8 bg-green-50 border-2 border-green-200 rounded-3xl">
                        <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h5 className="font-semibold text-green-900 mb-2">Acceptance Letter Uploaded Successfully!</h5>
                        <p className="text-green-700 text-sm">The student has been enrolled and notified.</p>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-blue-300 rounded-3xl p-6 bg-blue-50">
                        <div className="text-center">
                          <svg className="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <h5 className="font-semibold text-blue-900 mb-2">Select Acceptance Letter</h5>
                          <p className="text-blue-700 text-sm mb-4">Drag and drop or click to browse files</p>
                          
                          {acceptanceLetterFile ? (
                            <div className="mb-4">
                              <div className="flex items-center justify-center space-x-2 bg-blue-100 rounded-lg px-4 py-2">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-blue-800 font-medium">{acceptanceLetterFile.name}</span>
                              </div>
                            </div>
                          ) : null}
                          
                          <div className="flex flex-col items-center space-y-4">
                            <div className="file-input-wrapper">
                              <label className={`bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer inline-flex items-center justify-center min-w-[140px] ${
                                isFileSelecting ? 'opacity-50 cursor-not-allowed' : ''
                              }`}>
                                {isFileSelecting ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                ) : (
                                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                )}
                                <span>{isFileSelecting ? 'Selecting...' : (acceptanceLetterFile ? 'Change File' : 'Choose File')}</span>
                                <input
                                  type="file"
                                  className="sr-only"
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                  onChange={handleAcceptanceLetterFileSelect}
                                  disabled={uploadingAcceptanceLetter || isFileSelecting}
                                  key={acceptanceLetterFile ? 'change' : 'initial'} // Força re-render do input
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {!acceptanceLetterUploaded && (
                    <div className="flex justify-end">
                      <button
                        onClick={handleProcessAcceptanceLetter}
                        disabled={!acceptanceLetterFile || uploadingAcceptanceLetter}
                        className="bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-sm flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingAcceptanceLetter ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Process Acceptance</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Transfer Form Section - Only for transfer students */}
              {(application as any)?.student_process_type === 'transfer' && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl shadow-sm relative mt-8 overflow-hidden">
                  <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-5 rounded-t-3xl">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-[#05294E]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white">Transfer Form</h4>
                        <p className="text-blue-100 text-sm">Transfer form for current F-1 students</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {(application as any)?.transfer_form_url ? (
                      <div className="bg-white rounded-3xl p-6">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-2 mb-1">
                              <p className="font-medium text-slate-900 break-words">
                                {(application as any).transfer_form_url.split('/').pop() || 'Transfer Form'}
                              </p>
                              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 whitespace-nowrap">
                                {(application as any).transfer_form_status === 'approved' ? 'Approved' : 'Sent'}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 break-words">
                              Sent on {(application as any).transfer_form_sent_at ? new Date((application as any).transfer_form_sent_at).toLocaleDateString() : new Date().toLocaleDateString()}
                            </p>
                            <p className="text-xs text-slate-400 mt-1 break-words">
                              Transfer form for F-1 students
                            </p>

                            <div className="flex flex-col sm:flex-row gap-2 mt-3">
                              <button
                                onClick={() => handleViewDocument({ file_url: (application as any).transfer_form_url, filename: (((application as any).transfer_form_url as string).split('/').pop() || 'Transfer Form') })}
                                className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleDownloadDocument({ file_url: (application as any).transfer_form_url, filename: (((application as any).transfer_form_url as string).split('/').pop() || 'Transfer Form') })}
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
                            The transfer form will appear here once the university processes your application and sends it to you.
                          </p>
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


      {/* Modals */}
      {previewUrl && (
        <DocumentViewerModal documentUrl={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}

      {/* Modal para justificar solicitação de mudanças */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Request Changes</h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for requesting changes to this document. This will help the student understand what needs to be fixed.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              placeholder="Enter your reason here..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowReasonModal(false);
                  setRejectReason('');
                  setPendingRejectType(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingRejectType) {
                    requestChangesDoc(pendingRejectType, rejectReason);
                    setShowReasonModal(false);
                    setRejectReason('');
                    setPendingRejectType(null);
                  }
                }}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para recusar aluno na bolsa */}
      {showRejectStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Reject Student Application</h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for rejecting this student's application. This information will be shared with the student.
            </p>
            <textarea
              value={rejectStudentReason}
              onChange={(e) => setRejectStudentReason(e.target.value)}
              className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              placeholder="Enter your reason here..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectStudentModal(false);
                  setRejectStudentReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
                              <button
                  onClick={rejectStudent}
                  disabled={!rejectStudentReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
                >
                  Reject Application
                </button>
            </div>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showNewRequestModal && application && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg mx-4 border border-slate-200">
            <h3 className="font-extrabold text-xl mb-6 text-[#05294E] text-center">New Document Request</h3>
            <p className="text-sm text-slate-600 mb-6 text-center">
              Request a new document from {application?.user_profiles?.full_name}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Document Title <span className="text-red-500">*</span>
                </label>
                <input
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base"
                  placeholder="e.g., Additional Reference Letter"
                  value={newDocumentRequest.title}
                  onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base min-h-[80px] resize-vertical"
                  placeholder="Describe what document you need and any specific requirements..."
                  value={newDocumentRequest.description}
                  onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Due Date
                </label>
                <input
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base"
                  type="date"
                  value={newDocumentRequest.due_date}
                  onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Template/Attachment (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition font-medium text-slate-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828l6.586-6.586M16 5v6a2 2 0 002 2h6" />
                    </svg>
                    <span>{newDocumentRequest.attachment ? 'Change file' : 'Select file'}</span>
                    <input
                      type="file"
                      className="sr-only"
                      onChange={(e) => setNewDocumentRequest(prev => ({ 
                        ...prev, 
                        attachment: e.target.files ? e.target.files[0] : null 
                      }))}
                      disabled={creatingDocumentRequest}
                    />
                  </label>
                  {newDocumentRequest.attachment && (
                    <span className="text-xs text-slate-700 truncate max-w-[180px]">
                      {newDocumentRequest.attachment.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-8">
              <button
                className="flex-1 bg-slate-200 text-slate-800 px-4 py-2 rounded-lg font-medium hover:bg-slate-300 transition disabled:opacity-50"
                onClick={() => {
                  setShowNewRequestModal(false);
                  setNewDocumentRequest({ title: '', description: '', due_date: '', attachment: null });
                }}
                disabled={creatingDocumentRequest}
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-[#05294E] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#041f38] transition disabled:opacity-50 flex items-center justify-center"
                onClick={handleCreateDocumentRequest}
                disabled={creatingDocumentRequest || !newDocumentRequest.title.trim()}
              >
                {creatingDocumentRequest ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para rejeitar documento */}
      {showRejectDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Reject Document</h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for rejecting this document. This information will be shared with the student.
            </p>
            <textarea
              value={rejectDocumentReason}
              onChange={(e) => setRejectDocumentReason(e.target.value)}
              className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              placeholder="Enter your reason here..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectDocumentModal(false);
                  setRejectDocumentReason('');
                  setPendingRejectDocumentId(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingRejectDocumentId) {
                    handleRejectDocument(pendingRejectDocumentId, rejectDocumentReason);
                    setShowRejectDocumentModal(false);
                    setRejectDocumentReason('');
                    setPendingRejectDocumentId(null);
                  }
                }}
                disabled={!rejectDocumentReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Reject Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetails;