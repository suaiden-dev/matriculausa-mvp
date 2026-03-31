import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import DocumentViewerModal from './DocumentViewerModal';
import { 
  FileText, 
  CheckCircle2, 
  Download, 
  AlertCircle, 
  Clock, 
  Paperclip,
  Upload,
  ChevronDown,
  X
} from 'lucide-react';

interface DocumentRequest {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  attachment_url?: string;
  status: string;
  created_at: string;
}

interface DocumentRequestUpload {
  id: string;
  document_request_id: string;
  file_url: string;
  uploaded_at: string;
  status: string;
  review_notes?: string;
  rejection_reason?: string;
}

interface DocumentRequestsCardProps {
  applicationId: string;
  isSchool: boolean;
  currentUserId: string;
  studentType: 'initial' | 'transfer' | 'change_of_status';
  studentUserId?: string; // Novo: id do usuário do aluno
  onDocumentUploaded?: (requestId: string, fileName: string, isResubmission: boolean) => void; // Callback para logging
  showAcceptanceLetter?: boolean; // Controla se deve mostrar a seção de acceptance letter
}

const DocumentRequestsCard: React.FC<DocumentRequestsCardProps> = ({
  applicationId,
  isSchool,
  currentUserId,
  studentType,
  studentUserId,
  onDocumentUploaded,
  showAcceptanceLetter = true  // Por padrão mostra a acceptance letter
}) => {
  const { t } = useTranslation('dashboard');

  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [uploads, setUploads] = useState<{ [requestId: string]: DocumentRequestUpload[] }>({});
  const [selectedFiles, setSelectedFiles] = useState<{ [requestId: string]: File | null }>({});
  const [uploading, setUploading] = useState<{ [requestId: string]: boolean }>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [attachmentSignedUrls, setAttachmentSignedUrls] = useState<{ [requestId: string]: string | null }>({});
  const [acceptanceLetter, setAcceptanceLetter] = useState<any>(null);
  const [transferForm, setTransferForm] = useState<any>(null);
  const [transferFormUploads, setTransferFormUploads] = useState<any[]>([]);
  const [selectedTransferFormFile, setSelectedTransferFormFile] = useState<File | null>(null);
  const [uploadingTransferForm, setUploadingTransferForm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [pendingRejectUploadId, setPendingRejectUploadId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingAttachmentUrls, setLoadingAttachmentUrls] = useState<{ [requestId: string]: boolean }>({});
  const [acceptanceLetterSignedUrls, setAcceptanceLetterSignedUrls] = useState<{ [key: string]: string | null }>({});
  const [viewingRejectionReason, setViewingRejectionReason] = useState<string | null>(null);

  // Função para sanitizar nome do arquivo
  const sanitizeFileName = (fileName: string): string => {
    return fileName
      .normalize('NFD') // Remove acentos
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Substitui caracteres especiais por underscore
      .replace(/_+/g, '_') // Remove underscores duplicados
      .replace(/^_|_$/g, ''); // Remove underscores do início/fim
  };

  // Função utilitária para extrair caminho relativo da URL completa
  const getRelativePath = (fullUrl: string) => {
    const bucketName = 'document-attachments';
    const baseUrl = `https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/${bucketName}/`;
    if (!fullUrl) return '';
    if (fullUrl.startsWith(baseUrl)) {
      return fullUrl.replace(baseUrl, '');
    }
    // Se for URL de outro bucket ou formato, tentar simplificar
    if (fullUrl.includes('/storage/v1/object/')) {
      const parts = fullUrl.split('/storage/v1/object/');
      if (parts.length > 1) {
        const pathParts = parts[1].split('/');
        pathParts.shift(); // remove 'public' ou 'authenticated'
        pathParts.shift(); // remove bucket name
        return pathParts.join('/');
      }
    }
    return fullUrl.startsWith('/') ? fullUrl.slice(1) : fullUrl;
  };

  useEffect(() => {
    // Buscar dados da carta de aceite da aplicação
    const fetchAcceptanceLetter = async () => {

      const { data, error } = await supabase
        .from('scholarship_applications')
        .select('id, acceptance_letter_url, acceptance_letter_status, acceptance_letter_sent_at')
        .eq('id', applicationId)
        .maybeSingle();

      // console.log('Resultado da busca:', { data, error });

      if (!error && data) {
        // console.log('Acceptance letter encontrada:', data);
        setAcceptanceLetter(data);
      } else if (error) {
        console.error('Erro ao buscar acceptance letter:', error);
      } else {
        // console.log('Nenhuma acceptance letter encontrada para applicationId:', applicationId);
      }
    };

    fetchAcceptanceLetter();
  }, [applicationId]);

  useEffect(() => {
    // Buscar dados do transfer form da aplicação
    const fetchTransferForm = async () => {
      const { data, error } = await supabase
        .from('scholarship_applications')
        .select('id, transfer_form_url, transfer_form_status, transfer_form_sent_at')
        .eq('id', applicationId)
        .maybeSingle();

      if (!error && data) {
        setTransferForm(data);
      } else if (error) {
        console.error('Erro ao buscar transfer form:', error);
      }
    };

    if (studentType === 'transfer') {
      fetchTransferForm();
    }
  }, [applicationId, studentType]);

  useEffect(() => {
    // Buscar uploads do transfer form
    const fetchTransferFormUploads = async () => {
      const { data, error } = await supabase
        .from('transfer_form_uploads')
        .select('*')
        .eq('application_id', applicationId)
        .order('uploaded_at', { ascending: false });

      if (!error && data) {
        setTransferFormUploads(data);
      } else if (error) {
        console.error('Erro ao buscar transfer form uploads:', error);
      }
    };

    fetchTransferFormUploads();
  }, [applicationId]);

  useEffect(() => {
    fetchRequests();
  }, [applicationId]);

  useEffect(() => {
    // Logar uploads carregados para debug
    if (Object.keys(uploads).length > 0) {
      // console.log('[DEBUG] Uploads carregados:', uploads);
    }
  }, [uploads]);

  // LOGS DE DEBUG PARA BOTÕES DE APROVAÇÃO/REJEIÇÃO
  useEffect(() => {
    // console.log('[DocumentRequestsCard] MONTADO', {
    //   isSchool,
    //   currentUserId,
    //   studentType,
    //   studentUserId,
    //   applicationId,
    //   uploads,
    // });
  }, [isSchool, currentUserId, studentType, studentUserId, applicationId, uploads]);

  // 2. Buscar logo da universidade junto com o universityId
  const fetchRequests = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      // Buscar a aplicação para obter o university_id e logo
      const { data: appData, error: appError } = await supabase
        .from('scholarship_applications')
        .select('id, scholarship_id, scholarships(university_id, universities(logo_url, name)), student_process_type, student_id')
        .eq('id', applicationId)
        .maybeSingle();
      if (appError || !appData) throw new Error('Failed to fetch application data');
      let universityId: any = undefined;
      if (Array.isArray(appData.scholarships) && appData.scholarships.length > 0) {
        universityId = appData.scholarships[0]?.university_id;
      } else if (appData.scholarships && typeof appData.scholarships === 'object') {
        universityId = (appData.scholarships as any).university_id;
      }
      // console.log('[DEBUG] appData:', appData);
      // console.log('[DocumentRequestsCard] universityId:', universityId);
      // Buscar requests normais
      const { data: normalRequests, error: normalError } = await supabase
        .from('document_requests')
        .select('*')
        .eq('scholarship_application_id', applicationId)
        .order('created_at', { ascending: false });
      if (normalError) throw normalError;
      // console.log('[DocumentRequestsCard] normalRequests:', normalRequests?.length, normalRequests);
      // Buscar requests globais
      let globalRequests: any[] = [];
      if (universityId) {
        const { data: globalData, error: globalError } = await supabase
          .from('document_requests')
          .select('*')
          .eq('is_global', true)
          .eq('university_id', universityId)
          .order('created_at', { ascending: false });
        if (globalError) throw globalError;
        globalRequests = (globalData || []).filter((req: any) => {
          // Ocultar para estudantes quando status estiver fechado
          if (!isSchool && (req.status || '').toLowerCase() === 'closed') return false;
          // Se não houver applicable_student_types ou não for array, mostra para todos
          if (!req.applicable_student_types || !Array.isArray(req.applicable_student_types) || req.applicable_student_types.length === 0) return true;
          // Se o tipo do estudante estiver incluso, mostra
          if (req.applicable_student_types.includes(studentType)) return true;
          // Se o array inclui 'all', mostra para todos
          if (req.applicable_student_types.includes('all')) return true;
          // Caso contrário, não mostra
          return false;
        });
        // console.log('[DocumentRequestsCard] universityId usado:', universityId);
        // console.log('[DocumentRequestsCard] globalRequests:', globalRequests.length, globalRequests);
      } else {
        // console.log('[DocumentRequestsCard] universityId not found, skipping global requests');
      }
      // Substituir a lógica de merge e remoção de duplicados:
      // const allRequests = [...(normalRequests || []), ...globalRequests];
      // const uniqueRequests = Array.from(new Map(allRequests.map(r => [r.id, r])).values());
      // Por:
      const allRequests = [...(normalRequests || []), ...globalRequests];
      const uniqueRequests = allRequests.filter((req, idx, arr) => arr.findIndex(r => r.id === req.id) === idx);
      // console.log('[DocumentRequestsCard] uniqueRequests:', uniqueRequests.length, uniqueRequests);
      setRequests(uniqueRequests);
      // Buscar uploads para cada request
      if (uniqueRequests.length > 0) {
        const ids = uniqueRequests.map((r: any) => r.id);
        // console.log('[DEBUG] studentId:', studentId, 'currentUserId:', currentUserId, 'isSchool:', isSchool);
        // Buscar todos os uploads sem filtro para debug
        const { data: allUploadsData } = await supabase
          .from('document_request_uploads')
          .select('*')
          .in('document_request_id', ids);
        if (allUploadsData) {
          // allUploadsData.forEach((upload: any) => {
          //   console.log('[DEBUG UPLOAD]', {
          //     id: upload.id,
          //     document_request_id: upload.document_request_id,
          //     uploaded_by: upload.uploaded_by,
          //     file_url: upload.file_url,
          //     status: upload.status,
          //     created_at: upload.created_at,
          //     // adicione outros campos relevantes aqui
          //   });
          // });
        }
        // console.log('[DEBUG] ALL uploadsData (sem filtro):', allUploadsData?.length, allUploadsData);
        let uploadsData;
        if (isSchool) {
          // Escola vê apenas uploads do aluno específico (user_id) e da universidade
          uploadsData = (allUploadsData || []).filter((u: any) => {
            return u.uploaded_by === studentUserId || u.uploaded_by === universityId;
          });
        } else {
          // Aluno vê apenas os uploads feitos por ele
          uploadsData = (allUploadsData || []).filter((u: any) => u.uploaded_by === currentUserId);
        }
        // console.log('[DocumentRequestsCard] uploadsData:', uploadsData?.length, uploadsData);
        const uploadsMap: { [requestId: string]: DocumentRequestUpload[] } = {};
        (uploadsData || []).forEach((u: any) => {
          if (!uploadsMap[u.document_request_id]) uploadsMap[u.document_request_id] = [];
          uploadsMap[u.document_request_id].push(u);
        });
        setUploads(uploadsMap);
      }
    } catch (e: any) {
      setError('Failed to fetch document requests: ' + (e.message || e));
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [applicationId, isSchool, studentType]);



  const handleFileSelect = (requestId: string, file: File | null) => {
    if (file && file.type !== 'application/pdf') {
      alert(t('studentDashboard.documentRequests.errors.onlyPdfAllowed') || 'Only PDF files are allowed.');
      return;
    }
    setSelectedFiles((prev: typeof selectedFiles) => ({ ...prev, [requestId]: file }));
  };

  // ✅ Função auxiliar para notificar admins (movida para fora do handleSendUpload para melhor escopo)
  const notifyAdmins = async (
    studentName: string,
    studentEmail: string,
    documentTitle: string,
    scholarshipTitle: string,
    universityName: string,
    applicationId: string | null,
    isResubmission: boolean,
    studentProfileId: string // ID do user_profiles do aluno
  ) => {
    console.log('[NOTIFICAÇÃO ADMIN] 🚀 Iniciando notificação para admins', {
      studentName,
      studentEmail,
      documentTitle,
      scholarshipTitle,
      universityName,
      applicationId,
      isResubmission,
      studentProfileId
    });

    try {
      // Detectar ambiente de desenvolvimento
      const isDevelopment = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '0.0.0.0';

      // Emails a serem filtrados em ambiente de desenvolvimento
      const devBlockedEmails = [
        'luizedmiola@gmail.com',
        'chimentineto@gmail.com',
        'fsuaiden@gmail.com',
        'rayssathefuture@gmail.com'
      ];

      // Buscar todos os admins com telefone
      let admins: Array<{ user_id: string; email: string; full_name: string; phone: string }> = [];
      try {
        console.log('[NOTIFICAÇÃO ADMIN] 🔍 Buscando admins no banco de dados...');
        const { data: adminProfiles, error: adminProfileError } = await supabase
          .from('user_profiles')
          .select('user_id, email, full_name, phone')
          .eq('role', 'admin');

        console.log('[NOTIFICAÇÃO ADMIN] 📊 Resultado da busca de admins:', {
          adminProfiles,
          adminProfileError,
          count: adminProfiles?.length || 0
        });

        if (adminProfiles && !adminProfileError && adminProfiles.length > 0) {
          admins = adminProfiles
            .filter(admin => admin.email)
            .map(admin => ({
              user_id: admin.user_id,
              email: admin.email || '',
              full_name: admin.full_name || 'Admin MatriculaUSA',
              phone: admin.phone || ''
            }));

          // Filtrar emails bloqueados em desenvolvimento
          if (isDevelopment) {
            const beforeFilter = admins.length;
            admins = admins.filter(admin => !devBlockedEmails.includes(admin.email));
            console.log(`[NOTIFICAÇÃO ADMIN] 🔒 Ambiente de desenvolvimento: ${beforeFilter} → ${admins.length} admins após filtro`);
          }
        } else {
          // Fallback: usar admin padrão
          console.log('[NOTIFICAÇÃO ADMIN] ⚠️ Nenhum admin encontrado, usando fallback');
          admins = [{
            user_id: 'fallback-admin',
            email: 'admin@matriculausa.com',
            full_name: 'Admin MatriculaUSA',
            phone: ''
          }];
        }
      } catch (error) {
        console.error('[NOTIFICAÇÃO ADMIN] ❌ Erro ao buscar admins:', error);
        admins = [{
          user_id: 'fallback-admin',
          email: 'admin@matriculausa.com',
          full_name: 'Admin MatriculaUSA',
          phone: ''
        }];
      }

      if (admins.length === 0) {
        console.log('[NOTIFICAÇÃO ADMIN] ⚠️ Nenhum admin encontrado após processamento');
        return;
      }

      console.log(`[NOTIFICAÇÃO ADMIN] 👥 ${admins.length} admin(s) encontrado(s):`, admins.map(a => a.email));

      // Buscar telefone do aluno
      let studentPhone = '';
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: studentProfile } = await supabase
            .from('user_profiles')
            .select('phone')
            .eq('user_id', user.id)
            .maybeSingle();

          if (studentProfile) {
            studentPhone = studentProfile.phone || '';
          }
        }
      } catch (error) {
        console.error('[NOTIFICAÇÃO ADMIN] Erro ao buscar telefone do aluno:', error);
      }

      // ✅ ENVIAR NOTIFICAÇÕES IN-APP VIA EDGE FUNCTION (Bypass RLS)
      console.log('[NOTIFICAÇÃO ADMIN] 🔔 Enviando notificações in-app para admins via Edge Function...');
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (accessToken) {
        // Enviar in-app notification para cada admin encontrado
        await Promise.all(admins.map(async (admin) => {
          if (admin.user_id) {
            try {
              const inAppPayload = {
                notifications: [{
                  user_id: admin.user_id,
                  title: isResubmission ? 'Document Resubmitted' : 'New Document Uploaded',
                  message: isResubmission
                    ? `Student ${studentName} has resubmitted ${documentTitle}.`
                    : `Student ${studentName} has uploaded ${documentTitle}.`,
                  type: 'document_upload',
                  link: `/admin/dashboard/students/${studentProfileId}?tab=documents`
                }]
              };

              const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/create-admin-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify(inAppPayload),
              });

              if (response.ok) {
                console.log(`[NOTIFICAÇÃO ADMIN] ✅ In-app notification sent to admin ${admin.email}`);
              } else {
                console.error(`[NOTIFICAÇÃO ADMIN] ❌ Failed to send in-app notification to admin ${admin.email}:`, await response.text());
              }
            } catch (e) {
              console.error('[NOTIFICAÇÃO ADMIN] Exception sending in-app notification:', e);
            }
          }
        }));
      }

      // Enviar notificação para cada admin
      const adminNotificationPromises = admins.map(async (admin) => {
        const adminPayload = {
          tipo_notf: isResubmission
            ? 'Documento reenviado pelo aluno - Admin'
            : 'Novo documento enviado pelo aluno - Admin',
          email_admin: admin.email,
          nome_admin: admin.full_name,
          phone_admin: admin.phone || '',
          email_aluno: studentEmail,
          nome_aluno: studentName,
          phone_aluno: studentPhone,
          nome_bolsa: scholarshipTitle,
          nome_universidade: universityName,
          o_que_enviar: isResubmission
            ? `O aluno ${studentName} reenviou o documento "${documentTitle}" que foi previamente rejeitado para a bolsa "${scholarshipTitle}" (${universityName}). Por favor, revise o documento atualizado no painel administrativo.`
            : `O aluno ${studentName} enviou o documento "${documentTitle}" para a bolsa "${scholarshipTitle}" (${universityName}). Por favor, revise o documento no painel administrativo.`,
          document_title: documentTitle,
          application_id: applicationId,
          notification_type: 'admin'
        };

        console.log(`[NOTIFICAÇÃO ADMIN] 📤 Enviando notificação para admin ${admin.email}:`, adminPayload);

        try {
          const response = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'PostmanRuntime/7.36.3',
            },
            body: JSON.stringify(adminPayload),
          });

          const responseText = await response.text();
          console.log(`[NOTIFICAÇÃO ADMIN] 📥 Resposta do webhook para ${admin.email}:`, {
            status: response.status,
            statusText: response.statusText,
            responseText
          });

          if (response.ok) {
            console.log(`[NOTIFICAÇÃO ADMIN] ✅ Notificação enviada com sucesso para admin ${admin.email}`);
            return { success: true, email: admin.email };
          } else {
            console.error(`[NOTIFICAÇÃO ADMIN] ❌ Erro ao enviar notificação para admin ${admin.email}:`, response.status, responseText);
            return { success: false, email: admin.email, error: responseText };
          }
        } catch (error) {
          console.error(`[NOTIFICAÇÃO ADMIN] ❌ Erro ao enviar notificação para admin ${admin.email}:`, error);
          return { success: false, email: admin.email, error: String(error) };
        }
      });

      // Aguardar todas as notificações (não bloquear se alguma falhar)
      console.log('[NOTIFICAÇÃO ADMIN] ⏳ Aguardando envio de notificações...');
      const allResults = await Promise.allSettled(adminNotificationPromises);
      const successful = allResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const total = admins.length;
      console.log(`[NOTIFICAÇÃO ADMIN] 📧 Notificações enviadas: ${successful}/${total} (${admins.length} admin(s))`);

      // Log detalhado dos resultados
      allResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          console.log(`[NOTIFICAÇÃO ADMIN] 📊 Resultado ${index + 1}/${total}:`, result.value);
        } else {
          console.error(`[NOTIFICAÇÃO ADMIN] ❌ Erro no resultado ${index + 1}/${total}:`, result.reason);
        }
      });
    } catch (adminError) {
      console.error('[NOTIFICAÇÃO ADMIN] ❌ Erro geral ao notificar admins:', adminError);
      // Não falhar o processo se a notificação para admins falhar
    }
  };

  const handleSendUpload = async (requestId: string) => {
    if (uploading[requestId]) return;
    
    console.log('[UPLOAD] 🚀 Iniciando upload de documento', { requestId });
    const file = selectedFiles[requestId];
    if (!file) {
      console.log('[UPLOAD] ⚠️ Nenhum arquivo selecionado');
      return;
    }
    
    setUploading(prev => ({ ...prev, [requestId]: true }));
    
    try {
      if (!currentUserId) throw new Error('User ID not found');
      const sanitizedName = sanitizeFileName(file.name);
      // Use user ID folder to ensure RLS access
      const filePath = `${currentUserId}/${Date.now()}_${sanitizedName}`;
      const { data, error } = await supabase.storage.from('document-attachments').upload(filePath, file);
      if (error) {
        setError(t('studentDashboard.documentRequests.messages.errorUploadingFile') + ' ' + error.message);
        // console.error('[UPLOAD] Erro detalhado:', error, { file, requestId, user: currentUserId });
        alert(t('studentDashboard.documentRequests.messages.errorUploading') + ' ' + error.message + '\n' + JSON.stringify(error, null, 2));
        setUploading(prev => ({ ...prev, [requestId]: false }));
        return;
      }
      const file_url = data?.path;

      // Verificar se é um reenvio (já existe upload rejeitado para este request)
      const { data: existingUploads } = await supabase
        .from('document_request_uploads')
        .select('id, status')
        .eq('document_request_id', requestId)
        .eq('uploaded_by', currentUserId);

      const hasRejectedUpload = existingUploads?.some(upload => upload.status === 'rejected');
      const isResubmission = hasRejectedUpload;

      await supabase.from('document_request_uploads').insert({
        document_request_id: requestId,
        uploaded_by: currentUserId,
        file_url,
        status: 'under_review',
      });

      // Notificar universidade - diferenciando entre novo upload e reenvio
      try {
        if (isResubmission) {
          // Notificação específica para reenvio de documento rejeitado
          // console.log('[REENVIO] Enviando notificação de reenvio de documento rejeitado');

          // Buscar dados da aplicação e universidade para notificação
          const { data: requestData, error: requestError } = await supabase
            .from('document_requests')
            .select(`
              title,
              scholarship_application_id
            `)
            .eq('id', requestId)
            .single();

          if (requestError) {
            console.error('[REENVIO] Erro ao buscar dados do request:', requestError);
            return;
          }

          // Buscar dados do aluno através do contexto de autenticação
          const { data: { user } } = await supabase.auth.getUser();

          if (!user) {
            console.error('[REENVIO] Usuário não autenticado');
            return;
          }

          // Buscar o ID do perfil do aluno (user_profiles.id)
          const { data: studentProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

          const studentProfileId = studentProfile?.id || user.id;

          if (profileError) {
            console.error('[REENVIO] Erro ao buscar perfil do aluno:', profileError);
          }

          // Usar dados do usuário autenticado
          const studentData = {
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuário',
            email: user.email || 'email@exemplo.com'
          };

          // Verificar se é um documento global (sem scholarship_application_id)
          if (!requestData.scholarship_application_id) {
            // console.log('[REENVIO] Documento global - usando dados da universidade diretamente');

            // Buscar dados da universidade diretamente do document_request
            const { data: globalRequestData, error: globalError } = await supabase
              .from('document_requests')
              .select(`
                title,
                university_id,
                universities!inner(
                  name,
                  contact
                )
              `)
              .eq('id', requestId)
              .single();

            if (globalError) {
              console.error('[REENVIO] Erro ao buscar dados globais:', globalError);
              return;
            }

            if (globalRequestData?.universities) {
              const university = Array.isArray(globalRequestData.universities) 
                ? globalRequestData.universities[0] 
                : globalRequestData.universities as any;
              const emailUniversidade = university.contact?.admissionsEmail || university.contact?.email || '';

              if (emailUniversidade) {
                const payload = {
                  tipo_notf: 'Documento reenviado após rejeição',
                  email_aluno: studentData.email,
                  nome_aluno: studentData.full_name,
                  nome_bolsa: 'Documento Global',
                  nome_universidade: university.name,
                  email_universidade: emailUniversidade,
                  o_que_enviar: `O aluno ${studentData.full_name} reenviou o documento "${requestData.title}" (documento global) que foi previamente rejeitado. Acesse o painel para revisar a nova versão.`,
                  notification_target: 'university'
                };

                // console.log('[REENVIO] Payload para n8n (global):', payload);
                await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'PostmanRuntime/7.36.3',
                  },
                  body: JSON.stringify(payload),
                });
                // console.log('[REENVIO] Resposta do n8n (global):', n8nRes.status, n8nText);
              }

              // ✅ Notificar universidade in-app para documento global reenviado
              console.log('[REENVIO] 🔔 Enviando notificação in-app para universidade sobre documento global reenviado');
              try {
                const { data: globalRequestData } = await supabase
                  .from('document_requests')
                  .select('university_id')
                  .eq('id', requestId)
                  .single();

                if (globalRequestData?.university_id) {
                  const { error: universityNotifError } = await supabase
                    .from('university_notifications')
                    .insert({
                      university_id: globalRequestData.university_id,
                      title: 'Document Re-uploaded',
                      message: `Student ${studentData.full_name} has re-uploaded the document "${requestData.title}" after previous rejection.`,
                      type: 'document_reupload',
                      link: '/school/dashboard/document-requests',
                      metadata: {
                        student_name: studentData.full_name,
                        student_email: studentData.email,
                        document_title: requestData.title,
                        request_id: requestId,
                        is_global: true,
                        is_resubmission: true
                      },
                      idempotency_key: `${globalRequestData.university_id}:${requestId}:${Date.now()}`
                    });

                  if (universityNotifError) {
                    console.error('[REENVIO] ❌ Erro ao criar notificação in-app para universidade:', universityNotifError);
                  } else {
                    console.log('[REENVIO] ✅ Notificação in-app criada com sucesso para universidade');
                  }
                }
              } catch (inAppError) {
                console.error('[REENVIO] ❌ Erro ao enviar notificação in-app para universidade:', inAppError);
              }

              // ✅ Notificar admins para documento global reenviado
              console.log('[REENVIO] 📧 Chamando notifyAdmins para documento global reenviado');
              await notifyAdmins(
                studentData.full_name,
                studentData.email,
                requestData.title,
                'Documento Global',
                university.name,
                null,
                true,
                studentProfileId
              );
            }
          } else {
            // Buscar dados da aplicação separadamente
            const { data: applicationData, error: appError } = await supabase
              .from('scholarship_applications')
              .select(`
                id,
                scholarship_id,
                scholarships!inner(
                  title,
                  universities!inner(
                    id,
                    name,
                    contact
                  )
                )
              `)
              .eq('id', requestData.scholarship_application_id)
              .single();

            if (appError) {
              console.error('[REENVIO] Erro ao buscar dados da aplicação:', appError);
              return;
            }

            const scholarship = Array.isArray(applicationData?.scholarships)
              ? applicationData?.scholarships[0]
              : applicationData?.scholarships;

            if (scholarship?.universities) {
              const university = Array.isArray(scholarship.universities)
                ? scholarship.universities[0]
                : scholarship.universities;
              // const scholarship is already defined above
              const emailUniversidade = university.contact?.admissionsEmail || university.contact?.email || '';

              // Buscar dados do aluno através do contexto de autenticação (mesma abordagem do documento global)
              const { data: { user } } = await supabase.auth.getUser();

              if (!user) {
                console.error('[REENVIO] Usuário não autenticado');
                return;
              }

              // Usar dados do usuário autenticado
              const studentData = {
                full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuário',
                email: user.email || 'email@exemplo.com'
              };

              if (emailUniversidade) {
                const payload = {
                  tipo_notf: 'Documento reenviado após rejeição',
                  email_aluno: studentData.email,
                  nome_aluno: studentData.full_name,
                  nome_bolsa: scholarship.title,
                  nome_universidade: university.name,
                  email_universidade: emailUniversidade,
                  o_que_enviar: `O aluno ${studentData.full_name} reenviou o documento "${requestData.title}" que foi previamente rejeitado para a bolsa "${scholarship.title}". Acesse o painel para revisar a nova versão.`,
                  notification_target: 'university'
                };

                // console.log('[REENVIO] Payload para n8n:', payload);
                await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'PostmanRuntime/7.36.3',
                  },
                  body: JSON.stringify(payload),
                });
                // console.log('[REENVIO] Resposta do n8n:', n8nRes.status, n8nText);
              }

              // ✅ Notificar universidade in-app para documento reenviado
              console.log('[REENVIO] 🔔 Enviando notificação in-app para universidade sobre documento reenviado');
              try {
                const { error: universityNotifError } = await supabase
                  .from('university_notifications')
                  .insert({
                    university_id: university.id,
                    title: 'Document Re-uploaded',
                    message: `Student ${studentData.full_name} has re-uploaded the document "${requestData.title}" for scholarship "${scholarship.title}" after previous rejection.`,
                    type: 'document_reupload',
                    link: '/school/dashboard/selection-process',
                    metadata: {
                      student_name: studentData.full_name,
                      student_email: studentData.email,
                      document_title: requestData.title,
                      scholarship_title: scholarship.title,
                      application_id: requestData.scholarship_application_id,
                      request_id: requestId,
                      is_global: false,
                      is_resubmission: true
                    },
                    idempotency_key: `${university.id}:${requestId}:${Date.now()}`
                  });

                if (universityNotifError) {
                  console.error('[REENVIO] ❌ Erro ao criar notificação in-app para universidade:', universityNotifError);
                } else {
                  console.log('[REENVIO] ✅ Notificação in-app criada com sucesso para universidade');
                }
              } catch (inAppError) {
                console.error('[REENVIO] ❌ Erro ao enviar notificação in-app para universidade:', inAppError);
              }

              // ✅ Notificar admins para documento reenviado
              console.log('[REENVIO] 📧 Chamando notifyAdmins para documento reenviado');
              await notifyAdmins(
                studentData.full_name,
                studentData.email,
                requestData.title,
                scholarship.title,
                university.name,
                requestData.scholarship_application_id,
                true,
                studentProfileId
              );
            }
          }
        } else {
          // Notificação padrão para novo upload - DIRETO VIA WEBHOOK
          // console.log('[NOVO UPLOAD] Enviando notificação de novo documento via webhook direto');

          // Buscar dados básicos do document_request
          const { data: requestData, error: requestError } = await supabase
            .from('document_requests')
            .select(`
              title,
              description,
              scholarship_application_id,
              university_id,
              universities!inner(
                name,
                contact
              )
            `)
            .eq('id', requestId)
            .single();

          if (requestError) {
            console.error('[NOVO UPLOAD] Erro ao buscar dados do request:', requestError);
            return;
          }

          // Buscar dados do aluno através do contexto de autenticação
          const { data: { user } } = await supabase.auth.getUser();

          if (!user) {
            console.error('[NOVO UPLOAD] Usuário não autenticado');
            return;
          }

          // Buscar o ID do perfil do aluno (user_profiles.id)
          const { data: studentProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

          const studentProfileId = studentProfile?.id || user.id;

          if (profileError) {
            console.error('[NOVO UPLOAD] Erro ao buscar perfil do aluno:', profileError);
          }

          // Usar dados do usuário autenticado
          const studentData = {
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuário',
            email: user.email || 'email@exemplo.com'
          };

          // Verificar se é um documento global (sem scholarship_application_id)
          if (!requestData.scholarship_application_id) {
            // console.log('[NOVO UPLOAD] Documento global - usando dados da universidade diretamente');

            if (requestData?.universities) {
              const university = Array.isArray(requestData.universities)
                ? requestData.universities[0]
                : requestData.universities as any;
              const emailUniversidade = university.contact?.admissionsEmail || university.contact?.email || '';

              if (emailUniversidade) {
                const payload = {
                  tipo_notf: 'Novo documento enviado para análise',
                  email_aluno: studentData.email,
                  nome_aluno: studentData.full_name,
                  nome_bolsa: 'Documento Global',
                  nome_universidade: university.name,
                  email_universidade: emailUniversidade,
                  o_que_enviar: `O aluno ${studentData.full_name} enviou o documento "${requestData.title}" (documento global). Acesse o painel para revisar e analisar o documento.`,
                  notification_target: 'university'
                };

                // console.log('[NOVO UPLOAD] Payload para n8n (global):', payload);
                await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'PostmanRuntime/7.36.3',
                  },
                  body: JSON.stringify(payload),
                });
                // console.log('[NOVO UPLOAD] Resposta do n8n (global):', n8nRes.status, n8nText);
              }

              // ✅ Notificar universidade in-app para documento global novo
              console.log('[NOVO UPLOAD] 🔔 Enviando notificação in-app para universidade sobre documento global novo');
              try {
                const { data: globalRequestData } = await supabase
                  .from('document_requests')
                  .select('university_id')
                  .eq('id', requestId)
                  .single();

                if (globalRequestData?.university_id) {
                  const { error: universityNotifError } = await supabase
                    .from('university_notifications')
                    .insert({
                      university_id: globalRequestData.university_id,
                      title: 'New Document Uploaded',
                      message: `Student ${studentData.full_name} has uploaded the document "${requestData.title}".`,
                      type: 'document_upload',
                      link: '/school/dashboard/document-requests',
                      metadata: {
                        student_name: studentData.full_name,
                        student_email: studentData.email,
                        document_title: requestData.title,
                        request_id: requestId,
                        is_global: true,
                        is_resubmission: false
                      },
                      idempotency_key: `${globalRequestData.university_id}:${requestId}:${Date.now()}`
                    });

                  if (universityNotifError) {
                    console.error('[NOVO UPLOAD] ❌ Erro ao criar notificação in-app para universidade:', universityNotifError);
                  } else {
                    console.log('[NOVO UPLOAD] ✅ Notificação in-app criada com sucesso para universidade');
                  }
                }
              } catch (inAppError) {
                console.error('[NOVO UPLOAD] ❌ Erro ao enviar notificação in-app para universidade:', inAppError);
              }

              // ✅ Notificar admins para documento global novo
              console.log('[NOVO UPLOAD] 📧 Chamando notifyAdmins para documento global novo');
              await notifyAdmins(
                studentData.full_name,
                studentData.email,
                requestData.title,
                'Documento Global',
                university.name,
                null,
                false,
                studentProfileId
              );
            }
          } else {
            // Buscar dados da aplicação separadamente
            const { data: applicationData, error: appError } = await supabase
              .from('scholarship_applications')
              .select(`
                id,
                scholarship_id,
                scholarships!inner(
                  title,
                  universities!inner(
                    id,
                    name,
                    contact
                  )
                )
              `)
              .eq('id', requestData.scholarship_application_id)
              .single();

            if (appError) {
              console.error('[NOVO UPLOAD] Erro ao buscar dados da aplicação:', appError);
              return;
            }

            const scholarship = Array.isArray(applicationData?.scholarships)
              ? applicationData?.scholarships[0]
              : applicationData?.scholarships;

            if (scholarship?.universities) {
              const university = Array.isArray(scholarship.universities)
                ? scholarship.universities[0]
                : scholarship.universities;
              // const scholarship is already defined above
              const emailUniversidade = university.contact?.admissionsEmail || university.contact?.email || '';

              if (emailUniversidade) {
                const payload = {
                  tipo_notf: 'Novo documento enviado para análise',
                  email_aluno: studentData.email,
                  nome_aluno: studentData.full_name,
                  nome_bolsa: scholarship.title,
                  nome_universidade: university.name,
                  email_universidade: emailUniversidade,
                  o_que_enviar: `O aluno ${studentData.full_name} enviou o documento "${requestData.title}" para a bolsa "${scholarship.title}". Acesse o painel para revisar e analisar o documento.`,
                  notification_target: 'university'
                };

                // console.log('[NOVO UPLOAD] Payload para n8n:', payload);
                await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'PostmanRuntime/7.36.3',
                  },
                  body: JSON.stringify(payload),
                });
                // console.log('[NOVO UPLOAD] Resposta do n8n:', n8nRes.status, n8nText);
              }

              // ✅ Notificar universidade in-app para novo documento
              console.log('[NOVO UPLOAD] 🔔 Enviando notificação in-app para universidade sobre novo documento');
              try {
                const { error: universityNotifError } = await supabase
                  .from('university_notifications')
                  .insert({
                    university_id: university.id,
                    title: 'New Document Uploaded',
                    message: `Student ${studentData.full_name} has uploaded the document "${requestData.title}" for scholarship "${scholarship.title}".`,
                    type: 'document_upload',
                    link: '/school/dashboard/selection-process',
                    metadata: {
                      student_name: studentData.full_name,
                      student_email: studentData.email,
                      document_title: requestData.title,
                      scholarship_title: scholarship.title,
                      application_id: requestData.scholarship_application_id,
                      request_id: requestId,
                      is_global: false,
                      is_resubmission: false
                    },
                    idempotency_key: `${university.id}:${requestId}:${Date.now()}`
                  });

                if (universityNotifError) {
                  console.error('[NOVO UPLOAD] ❌ Erro ao criar notificação in-app para universidade:', universityNotifError);
                } else {
                  console.log('[NOVO UPLOAD] ✅ Notificação in-app criada com sucesso para universidade');
                }
              } catch (inAppError) {
                console.error('[NOVO UPLOAD] ❌ Erro ao enviar notificação in-app para universidade:', inAppError);
              }

              // ✅ Notificar admins para novo documento
              console.log('[NOVO UPLOAD] 📧 Chamando notifyAdmins para novo documento');
              await notifyAdmins(
                studentData.full_name,
                studentData.email,
                requestData.title,
                scholarship.title,
                university.name,
                requestData.scholarship_application_id,
                false,
                studentProfileId
              );
            }
          }
        }
      } catch (e) {
        console.error('Erro ao notificar universidade:', e);
      }

      setSelectedFiles((prev: typeof selectedFiles) => ({ ...prev, [requestId]: null }));

      // Chamar callback de logging se fornecido
      if (onDocumentUploaded) {
        await onDocumentUploaded(requestId, file.name, isResubmission || false);
      }
      
      await fetchRequests();
    } finally {
      setUploading(prev => ({ ...prev, [requestId]: false }));
    }
  };


  const getAttachmentSignedUrl = async (filePath: string, requestId: string) => {
    if (loadingAttachmentUrls[requestId]) return;
    setLoadingAttachmentUrls(prev => ({ ...prev, [requestId]: true }));
    try {
      const { data, error } = await supabase.storage.from('document-attachments').createSignedUrl(filePath, 60 * 60);
      setAttachmentSignedUrls(prev => ({ ...prev, [requestId]: error ? null : data.signedUrl }));
      return error ? null : data.signedUrl;
    } catch (e) {
      // console.error('Error getting attachment signed URL:', e);
      setAttachmentSignedUrls(prev => ({ ...prev, [requestId]: null }));
      return null;
    } finally {
      setLoadingAttachmentUrls(prev => ({ ...prev, [requestId]: false }));
    }
  };

  useEffect(() => {
    requests.forEach(req => {
      if (req.attachment_url && !attachmentSignedUrls[req.id] && !loadingAttachmentUrls[req.id]) {
        const filePath = getRelativePath(req.attachment_url);
        getAttachmentSignedUrl(filePath, req.id);
      }
    });
    // eslint-disable-next-line
  }, [requests]);

  // Gerar signedUrl para acceptance_letter_url e transfer_form_url
  useEffect(() => {
    const fetchSignedUrls = async () => {
      // Acceptance Letter
      if (acceptanceLetter?.acceptance_letter_url && !acceptanceLetterSignedUrls['acceptance_letter_url']) {
        const filePath = getRelativePath(acceptanceLetter.acceptance_letter_url);
        const { data, error } = await supabase.storage.from('document-attachments').createSignedUrl(filePath, 60 * 60);
        setAcceptanceLetterSignedUrls(prev => ({ ...prev, acceptance_letter_url: error ? null : data.signedUrl }));
      }
      
      // Transfer Form
      if (transferForm?.transfer_form_url && !acceptanceLetterSignedUrls['transfer_form_url']) {
        const filePath = getRelativePath(transferForm.transfer_form_url);
        const { data, error } = await supabase.storage.from('document-attachments').createSignedUrl(filePath, 60 * 60);
        setAcceptanceLetterSignedUrls(prev => ({ ...prev, transfer_form_url: error ? null : data.signedUrl }));
      }
    };
    fetchSignedUrls();
  }, [acceptanceLetter, transferForm, acceptanceLetterSignedUrls]);


  // Handler para rejeitar upload
  const handleRejectUpload = async (uploadId: string, notes?: string) => {
    try {
      // Buscar informações do upload antes de atualizar
      const { data: uploadData, error: uploadError } = await supabase
        .from('document_request_uploads')
        .select(`
          uploaded_by,
          document_request_id,
          document_requests!inner(
            title
          )
        `)
        .eq('id', uploadId)
        .single();

      if (uploadError) {
        console.error('[REJEIÇÃO] Erro ao buscar dados do upload:', uploadError);
      }

      const { error } = await supabase
        .from('document_request_uploads')
        .update({ status: 'rejected', review_notes: notes || null })
        .eq('id', uploadId);
      if (error) {
        setError(t('studentDashboard.documentRequests.forms.failedToRejectDocument') + ' ' + error.message);
        return;
      }

      // ✅ Enviar notificação para o aluno
      if (uploadData?.uploaded_by) {
        console.log('[REJEIÇÃO] 🔔 Enviando notificação para o aluno', {
          uploaded_by: uploadData.uploaded_by,
          documentTitle: Array.isArray(uploadData.document_requests)
            ? (uploadData.document_requests as any)[0]?.title
            : (uploadData.document_requests as any)?.title,
          notes
        });

        try {
          const documentTitle = Array.isArray(uploadData.document_requests)
            ? uploadData.document_requests[0]?.title
            : (uploadData.document_requests as any)?.title;

          const notificationMessage = notes
            ? `Your document "${documentTitle || 'document'}" has been rejected. Reason: ${notes}`
            : `Your document "${documentTitle || 'document'}" has been rejected. Please resubmit.`;

          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;

          console.log('[REJEIÇÃO] 📤 Payload:', {
            student_id: uploadData.uploaded_by,
            title: 'Document Rejected',
            message: notificationMessage,
            link: `/student/dashboard/application/${applicationId}/chat?tab=documents`,
            accessToken: accessToken ? '✅ presente' : '❌ ausente'
          });

          if (accessToken) {
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                student_id: uploadData.uploaded_by,
                title: 'Document Rejected',
                message: notificationMessage,
                link: `/student/dashboard/application/${applicationId}/chat?tab=documents`
              }),
            });

            console.log('[REJEIÇÃO] 📥 Response status:', response.status);

            if (response.ok) {
              console.log('[REJEIÇÃO] ✅ Notificação enviada para aluno');
            } else {
              const errorText = await response.text();
              console.error('[REJEIÇÃO] ❌ Failed to send notification:', {
                status: response.status,
                error: errorText
              });
            }
          } else {
            console.error('[REJEIÇÃO] ❌ Sem access token disponível');
          }
        } catch (notifError) {
          console.error('[REJEIÇÃO] ❌ Erro ao enviar notificação:', notifError);
        }
      } else {
        console.warn('[REJEIÇÃO] ⚠️ uploadData.uploaded_by não encontrado', uploadData);
      }

      await fetchRequests();
    } catch (e: any) {
      setError('Unexpected error while rejecting: ' + (e.message || e));
    }
  };

  // Padronizar status para snake_case
  const normalizeStatus = (status: string) => (status || '').toLowerCase().replace(/\s+/g, '_');

  // Funções para Transfer Form
  const handleStudentUploadTransferForm = async () => {
    if (uploadingTransferForm) return;
    if (!selectedTransferFormFile || !applicationId) return;

    setUploadingTransferForm(true);
    
    try {
      if (!currentUserId) throw new Error('User ID not found');
      // Upload do arquivo
      const sanitizedName = sanitizeFileName(selectedTransferFormFile.name);
      // Use user ID in path for RLS compatibility
      const filePath = `${currentUserId}/transfer-forms-filled/${Date.now()}_${sanitizedName}`;
      const { data, error } = await supabase.storage
        .from('document-attachments')
        .upload(filePath, selectedTransferFormFile);

      if (error) throw error;

      // Verificar se há upload rejeitado (para determinar se é reenvio)
      const hasRejectedUpload = transferFormUploads.some(upload => upload.status === 'rejected');
      const isResubmission = hasRejectedUpload;

      // Deletar upload anterior se existir
      if (transferFormUploads.length > 0) {
        await supabase
          .from('transfer_form_uploads')
          .delete()
          .eq('application_id', applicationId);
      }

      // Criar novo registro
      const { error: insertError } = await supabase
        .from('transfer_form_uploads')
        .insert({
          application_id: applicationId,
          file_url: data.path,
          uploaded_by: currentUserId,
          status: 'under_review'
        });

      if (insertError) throw insertError;

      // Atualizar estado local
      setTransferFormUploads([{
        id: 'temp',
        application_id: applicationId,
        file_url: data.path,
        uploaded_by: currentUserId,
        status: 'under_review',
        uploaded_at: new Date().toISOString()
      }]);

      setSelectedTransferFormFile(null);

      // Recarregar dados
      const { data: newUploads } = await supabase
        .from('transfer_form_uploads')
        .select('*')
        .eq('application_id', applicationId)
        .order('uploaded_at', { ascending: false });

      if (newUploads) {
        setTransferFormUploads(newUploads);
      }

      // ✅ ENVIAR NOTIFICAÇÃO PARA ADMINS (reutilizando tipos existentes)
      console.log('[TRANSFER FORM] 📤 Enviando notificação para admins sobre upload do transfer form...', {
        isResubmission
      });

      try {
        // Buscar dados da aplicação (bolsa e universidade)
        const { data: applicationData, error: appError } = await supabase
          .from('scholarship_applications')
          .select(`
            id,
            scholarships!inner(
              title,
              universities!inner(
                name
              )
            )
          `)
          .eq('id', applicationId)
          .maybeSingle();

        if (appError) {
          console.error('[TRANSFER FORM] Erro ao buscar dados da aplicação:', appError);
        }

        // Buscar dados do aluno
        const { data: { user } } = await supabase.auth.getUser();
        let studentName = 'Student';
        let studentEmail = '';
        let studentProfileId = '';

        if (user) {
          const { data: studentProfile } = await supabase
            .from('user_profiles')
            .select('id, full_name, email')
            .eq('user_id', user.id)
            .maybeSingle();

          if (studentProfile) {
            studentProfileId = studentProfile.id;
            studentName = studentProfile.full_name || 'Student';
            studentEmail = studentProfile.email || '';
          }
        }

        const scholarship = Array.isArray(applicationData?.scholarships)
          ? applicationData.scholarships[0]
          : applicationData?.scholarships;
        const university = Array.isArray(scholarship?.universities)
          ? scholarship.universities[0]
          : scholarship?.universities;

        const scholarshipTitle = scholarship?.title || 'Scholarship';
        const universityName = university?.name || 'University';

        // Chamar notifyAdmins para notificar sobre o upload do transfer form
        // Reutiliza os tipos existentes: 'Novo documento enviado pelo aluno - Admin' ou 'Documento reenviado pelo aluno - Admin'
        await notifyAdmins(
          studentName,
          studentEmail,
          'Transfer Form',
          scholarshipTitle,
          universityName,
          applicationId,
          isResubmission, // Detecta se é reenvio baseado em uploads rejeitados anteriores
          studentProfileId
        );

        console.log('[TRANSFER FORM] ✅ Notificação enviada para admins', {
          tipo: isResubmission ? 'reenvio' : 'novo upload'
        });
      } catch (notifyError) {
        console.error('[TRANSFER FORM] ❌ Erro ao enviar notificação para admins:', notifyError);
        // Não falhar o processo se a notificação falhar
      }
      if (onDocumentUploaded) {
        await onDocumentUploaded('transfer_form', selectedTransferFormFile.name, isResubmission);
      }
      
    } catch (error: any) {
      console.error('Erro ao fazer upload do transfer form:', error);
      setError('Erro ao fazer upload do formulário: ' + error.message);
    } finally {
      setUploadingTransferForm(false);
    }
  };


  const handleRejectTransferFormUpload = async (uploadId: string, reason: string) => {
    try {
      // Buscar informações do upload antes de atualizar
      const { data: uploadData, error: uploadError } = await supabase
        .from('transfer_form_uploads')
        .select('uploaded_by')
        .eq('id', uploadId)
        .single();

      if (uploadError) {
        console.error('[REJEIÇÃO TRANSFER FORM] Erro ao buscar dados do upload:', uploadError);
      }

      const { error } = await supabase
        .from('transfer_form_uploads')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUserId
        })
        .eq('id', uploadId);

      if (error) throw error;

      // ✅ Enviar notificação para o aluno
      if (uploadData?.uploaded_by) {
        try {
          const notificationMessage = reason
            ? `Your Transfer Form has been rejected. Reason: ${reason}`
            : 'Your Transfer Form has been rejected. Please resubmit.';

          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;

          if (accessToken) {
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                student_id: uploadData.uploaded_by,
                title: 'Transfer Form Rejected',
                message: notificationMessage,
                link: `/student/dashboard/application/${applicationId}/chat?tab=documents`
              }),
            });

            if (response.ok) {
              console.log('[REJEIÇÃO TRANSFER FORM] ✅ Notificação enviada para aluno');
            } else {
              const errorText = await response.text();
              console.error('[REJEIÇÃO TRANSFER FORM] ❌ Failed to send notification:', errorText);
            }
          }
        } catch (notifError) {
          console.error('[REJEIÇÃO TRANSFER FORM] ❌ Erro ao enviar notificação:', notifError);
        }
      }

      // Recarregar uploads
      const { data: newUploads } = await supabase
        .from('transfer_form_uploads')
        .select('*')
        .eq('application_id', applicationId)
        .order('uploaded_at', { ascending: false });

      if (newUploads) {
        setTransferFormUploads(newUploads);
      }

    } catch (error: any) {
      console.error('Erro ao rejeitar transfer form:', error);
      setError('Erro ao rejeitar formulário: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-6 md:space-y-12 pb-12 animate-pulse">
        {/* Download Area Skeleton */}
        {!isSchool && (
          <div className="bg-slate-50/50 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-12 border border-slate-200">
            <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-200 rounded-2xl md:rounded-3xl flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-6 bg-slate-200 rounded-lg w-48" />
                <div className="h-3 bg-slate-200 rounded w-72" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-14 md:h-14 bg-slate-200 rounded-xl md:rounded-2xl flex-shrink-0" />
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-32" />
                    <div className="h-3 bg-slate-200 rounded w-20" />
                  </div>
                </div>
                <div className="w-12 h-12 bg-slate-200 rounded-2xl flex-shrink-0" />
              </div>
            </div>
          </div>
        )}

        {/* Files for Submission Skeleton */}
        <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-12 border border-slate-200 shadow-2xl shadow-slate-200/50">
          <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-10">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-200 rounded-2xl md:rounded-3xl flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-7 bg-slate-200 rounded-lg w-56" />
              <div className="h-3 bg-slate-200 rounded w-64" />
            </div>
          </div>
          <div className="space-y-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-slate-50/50 rounded-2xl md:rounded-3xl p-5 md:p-8 border border-slate-200">
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4 md:gap-5 items-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-200 rounded-xl md:rounded-2xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-slate-200 rounded w-40" />
                      <div className="h-3 bg-slate-200 rounded w-64" />
                      <div className="h-3 bg-slate-200 rounded w-48" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 bg-slate-200 rounded-2xl w-36" />
                    <div className="ml-auto flex gap-2">
                      <div className="h-10 bg-slate-200 rounded-xl w-28" />
                      <div className="h-10 bg-slate-200 rounded-xl w-20" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 md:space-y-12 pb-12">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-bold uppercase tracking-tight">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-800">
            <CheckCircle2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ÁREA DE DOWNLOAD: FORMULÁRIOS DA FACULDADE */}
      {!isSchool && (
        <section className="bg-slate-50/50 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-12 border border-slate-200">
          <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
            <div className="p-3 md:p-4 bg-blue-600 rounded-2xl md:rounded-3xl shadow-lg shadow-blue-500/20">
              <Download className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight text-slate-900 leading-none">
                {t('studentDashboard.documentRequests.documentSections.download')}
              </h2>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] md:text-xs mt-1 md:mt-2">
                {t('studentDashboard.documentRequests.documentSections.downloadDescription')}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* 1. Templates das Requisições */}
            {requests.filter(r => r.attachment_url).map(req => (
              <div key={`download-${req.id}`} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 flex items-center justify-between group hover:border-blue-400 transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className="w-10 h-10 md:w-14 md:h-14 bg-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                    <FileText className="w-5 h-5 md:w-7 md:h-7 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 truncate text-sm md:text-lg leading-tight">{req.title}</h4>
                    <p className="text-[9px] md:text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">{t('studentDashboard.documentRequests.forms.templateOfficial')}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const signedUrl = attachmentSignedUrls[req.id];
                    const fileUrl = signedUrl || req.attachment_url;
                    if (fileUrl) setPreviewUrl(fileUrl);
                  }}
                  className="p-4 bg-slate-100 text-slate-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm active:scale-95"
                  title="Baixar Template"
                >
                  <Download className="w-6 h-6" />
                </button>
              </div>
            ))}

            

            {/* 3. Transfer Form (Apenas se for ALUNO TRANSFER e houver URL) */}
            {studentType === 'transfer' && transferForm?.transfer_form_url && (
              <div className="bg-blue-50 p-6 rounded-3xl border border-blue-200 flex items-center justify-between group hover:border-blue-400 transition-all shadow-sm">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 truncate text-xl leading-tight">{t('studentDashboard.documentRequests.forms.transferForm')}</h4>
                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-1">Formulário de Transferência</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const signedUrl = acceptanceLetterSignedUrls['transfer_form_url'] || transferForm.transfer_form_url;
                    if (signedUrl) setPreviewUrl(signedUrl);
                  }}
                  className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  {t('common:labels.download')}
                </button>
              </div>
            )}
          </div>
        </section>
      )}


      {/* ÁREA DE ENVIO: UPLOAD DE DOCUMENTOS */}
      <section className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-12 border border-slate-200 shadow-2xl shadow-slate-200/50">
        <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-10">
          <div className="p-3 md:p-4 bg-emerald-600 rounded-2xl md:rounded-3xl shadow-lg shadow-emerald-500/20">
            <Upload className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </div>
          <div>
             <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">{t('studentDashboard.documentRequests.uploadSection.title')}</h3>
             <p className="text-slate-500 font-medium text-xs md:text-base mt-1 md:mt-2">{t('studentDashboard.documentRequests.uploadSection.description')}</p>
          </div>
        </div>


        <div className="space-y-6">
          {/* Item Especial: Transfer Form (Apenas para Transfer) */}
          {studentType === 'transfer' && (
            <div className="bg-slate-50/50 rounded-2xl md:rounded-3xl p-5 md:p-8 border border-slate-200 group hover:border-blue-300 transition-all hover:bg-white text-left">
              <div className="flex flex-col gap-4">
                <div className="flex gap-4 md:gap-5 items-center">
                   <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl md:rounded-2xl flex items-center justify-center border border-slate-200 flex-shrink-0 shadow-sm group-hover:border-blue-200 group-hover:bg-blue-50 transition-all">
                      <FileText className="w-6 h-6 md:w-8 md:h-8 text-slate-400 group-hover:text-blue-600" />
                   </div>
                   <div className="min-w-0 flex-1 overflow-hidden">
                      <h4 className="font-black text-slate-900 text-lg md:text-xl uppercase tracking-tighter leading-tight truncate">{t('studentDashboard.documentRequests.forms.transferForm')}</h4>
                      <p className="text-slate-500 text-xs md:text-sm font-medium mt-1 leading-relaxed line-clamp-2">{t('studentDashboard.documentRequests.forms.transferFormUploadDescriptionStudent')}</p>
                   </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                   {/* Status do Transfer Form - apenas o upload mais recente */}
                   {(() => {
                      const latestUpload = transferFormUploads.slice().sort((a, b) =>
                        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
                      )[0];
                      if (!latestUpload) return null;
                      const status = normalizeStatus(latestUpload.status);
                      const isApproved = status === 'approved';
                      const isRejected = status === 'rejected';
                      const isReview = status === 'under_review';
                      return (
                        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border shadow-sm flex-shrink-0 self-start sm:self-auto transition-all ${
                          isApproved ? 'bg-emerald-50 border-emerald-200' :
                          isRejected ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                        }`}>
                           <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isApproved ? 'bg-emerald-500' : isRejected ? 'bg-red-500' : 'bg-blue-500'
                           }`}>
                              {isApproved ? <CheckCircle2 className="w-4 h-4 text-white" /> :
                               isRejected ? <AlertCircle className="w-4 h-4 text-white" /> :
                               <Clock className="w-4 h-4 text-white" />}
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">Status</p>
                              <p className={`font-bold text-sm ${
                                isApproved ? 'text-emerald-700' : isRejected ? 'text-red-700' : 'text-blue-700'
                              }`}>
                                 {isReview ? t('studentDashboard.documentRequests.forms.inAnalysis') : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </p>
                           </div>
                        </div>
                      );
                   })()}

                   {!isSchool && (
                      <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
                         <label className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-black uppercase tracking-widest text-[10px] hover:border-blue-600 hover:text-blue-600 cursor-pointer transition-all active:scale-95">
                            <Paperclip className="w-4 h-4 shrink-0" />
                            {selectedTransferFormFile ? (
                              <span className="truncate max-w-[80px]">{selectedTransferFormFile.name}</span>
                            ) : t('studentDashboard.documentRequests.forms.attachPdf')}
                            <input
                              type="file"
                              className="sr-only"
                              accept=".pdf"
                              onChange={e => setSelectedTransferFormFile(e.target.files ? e.target.files[0] : null)}
                            />
                         </label>
                         <button
                           disabled={!selectedTransferFormFile || uploadingTransferForm}
                           onClick={() => handleStudentUploadTransferForm()}
                           className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-500/10 active:scale-95"
                         >
                            {uploadingTransferForm ? t('studentDashboard.documentRequests.forms.sendingButton') : t('studentDashboard.documentRequests.forms.sendButton')}
                         </button>
                      </div>
                   )}
                </div>
              </div>

               {/* Feedback de Rejeição Transfer Form - apenas se o upload mais recente foi rejeitado */}
               {(() => {
                  const latestTransferUpload = transferFormUploads.slice().sort((a, b) =>
                    new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
                  )[0];
                  if (!latestTransferUpload || normalizeStatus(latestTransferUpload.status) !== 'rejected') return null;
                  return (
                    <div className="w-full">
                       {/* Desktop View */}
                       <div className="hidden md:flex mt-6 p-5 bg-red-50 rounded-[1.5rem] border border-red-100 gap-3 items-start">
                          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                             <AlertCircle className="w-4 h-4 text-red-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="font-black uppercase tracking-widest text-[9px] text-red-600 mb-1 text-left">{t('studentDashboard.documentRequests.modals.rejectionAttention')}</p>
                             <div className="max-h-32 overflow-y-auto pr-2">
                               <p className="text-red-900 font-medium text-sm leading-relaxed text-left break-words">
                                 {latestTransferUpload.rejection_reason || t('studentDashboard.documentRequests.modals.pleaseReviewRejection')}
                               </p>
                             </div>
                          </div>
                       </div>
                       
                       {/* Mobile View */}
                       <button
                         onClick={() => setViewingRejectionReason(latestTransferUpload.rejection_reason || t('studentDashboard.documentRequests.modals.pleaseReviewRejection'))}
                         className="flex md:hidden mt-4 w-full p-4 bg-red-50 rounded-xl border border-red-100 items-center justify-between active:scale-[0.98] transition-all text-left"
                       >
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                             <AlertCircle className="w-4 h-4 text-red-600" />
                           </div>
                           <div>
                             <p className="font-black uppercase tracking-widest text-[10px] text-red-600 leading-tight">{t('studentDashboard.documentRequests.modals.adminNotice')}</p>
                             <p className="font-bold text-xs text-red-900 mt-0.5 truncate max-w-[170px]">{t('studentDashboard.documentRequests.modals.viewCorrectionReason')}</p>
                           </div>
                         </div>
                         <div className="w-8 h-8 bg-red-100/50 rounded-full flex items-center justify-center flex-shrink-0">
                            <ChevronDown className="w-4 h-4 text-red-600" />
                         </div>
                       </button>
                    </div>
                  );
               })()}
            </div>
          )}

          {requests.map(req => {
            const latestUpload = uploads[req.id]?.slice().sort((a, b) =>
              new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
            )[0];
            const status = latestUpload ? normalizeStatus(latestUpload.status) : null;
            const isApproved = status === 'approved';
            const isRejected = status === 'rejected';
            const isReview = status === 'under_review';

            return (
              <div key={`upload-${req.id}`} className="bg-slate-50/50 rounded-2xl md:rounded-3xl p-5 md:p-8 border border-slate-200 group hover:border-emerald-300 transition-all hover:bg-white text-left">
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4 md:gap-5 items-center">
                     <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl md:rounded-2xl flex items-center justify-center border border-slate-200 flex-shrink-0 shadow-sm group-hover:border-emerald-200 group-hover:bg-emerald-50 transition-all">
                        <FileText className="w-6 h-6 md:w-8 md:h-8 text-slate-400 group-hover:text-emerald-600" />
                     </div>
                     <div className="min-w-0 flex-1 overflow-hidden">
                        <h4 className="font-black text-slate-900 text-lg md:text-xl uppercase tracking-tighter leading-tight truncate" title={req.title}>{req.title}</h4>
                        <p className="text-slate-500 text-xs md:text-sm font-medium mt-1 leading-relaxed line-clamp-2">{req.description}</p>
                     </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                     {/* Status Atual do Documento - apenas o upload mais recente */}
                     {latestUpload && (() => {
                        const statusLabel = isReview ? t('dashboard:studentDashboard.myApplicationStep.welcome.status.underReview') : (status || '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                        return (
                          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border shadow-sm flex-shrink-0 self-start sm:self-auto transition-all ${
                            isApproved ? 'bg-emerald-50 border-emerald-200' :
                            isRejected ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                          }`}>
                             <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isApproved ? 'bg-emerald-500' : isRejected ? 'bg-red-500' : 'bg-blue-500'
                             }`}>
                                {isApproved ? <CheckCircle2 className="w-4 h-4 text-white" /> :
                                 isRejected ? <AlertCircle className="w-4 h-4 text-white" /> :
                                 <Clock className="w-4 h-4 text-white" />}
                             </div>
                             <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">Status</p>
                                <p className={`font-bold text-sm ${
                                  isApproved ? 'text-emerald-700' : isRejected ? 'text-red-700' : 'text-blue-700'
                                }`}>
                                   {statusLabel}
                                </p>
                             </div>
                          </div>
                        );
                     })()}

                     {/* Ação de Upload - Oculta se já estiver aprovado */}
                     {!isSchool && !isApproved && (
                        <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
                           <label className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] hover:border-emerald-600 hover:text-emerald-600 cursor-pointer transition-all active:scale-95">
                              <Paperclip className="w-4 h-4 shrink-0" />
                              {selectedFiles[req.id] ? (
                                <span className="truncate max-w-[80px]">{selectedFiles[req.id]?.name}</span>
                              ) : t('studentDashboard.documentRequests.forms.attachPdf')}
                              <input
                                 type="file"
                                 className="sr-only"
                                 accept=".pdf"
                                 onChange={e => handleFileSelect(req.id, e.target.files ? e.target.files[0] : null)}
                              />
                           </label>
                           <button
                             disabled={!selectedFiles[req.id] || uploading[req.id]}
                             onClick={() => handleSendUpload(req.id)}
                             className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-xl shadow-emerald-500/10 active:scale-95"
                           >
                              {uploading[req.id] ? t('studentDashboard.documentRequests.forms.sendingButton') : t('studentDashboard.documentRequests.forms.sendButton')}
                           </button>
                        </div>
                     )}
                  </div>
                </div>

                 {/* Feedback de Rejeição - apenas se o upload mais recente foi rejeitado */}
                 {isRejected && latestUpload && (
                   <div className="w-full">
                      {/* Desktop View */}
                      <div className="hidden md:flex mt-4 md:mt-6 p-5 bg-red-50 rounded-[1.5rem] border border-red-100 gap-3 items-start">
                         <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="font-black uppercase tracking-widest text-[9px] text-red-600 mb-1 text-left">{t('studentDashboard.documentRequests.modals.rejectionAttention')}</p>
                            <div className="max-h-32 overflow-y-auto pr-2">
                              <p className="text-red-900 font-medium text-sm leading-relaxed text-left break-words">
                                {latestUpload.rejection_reason || t('studentDashboard.documentRequests.modals.pleaseReviewRejection')}
                              </p>
                            </div>
                         </div>
                      </div>

                      {/* Mobile View */}
                      <button
                        onClick={() => setViewingRejectionReason(latestUpload.rejection_reason || t('studentDashboard.documentRequests.modals.pleaseReviewRejection'))}
                        className="flex md:hidden mt-4 w-full p-4 bg-red-50 rounded-xl border border-red-100 items-center justify-between active:scale-[0.98] transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <p className="font-black uppercase tracking-widest text-[10px] text-red-600 leading-tight">{t('studentDashboard.documentRequests.modals.adminNotice')}</p>
                            <p className="font-bold text-xs text-red-900 mt-0.5 truncate max-w-[170px]">{t('studentDashboard.documentRequests.modals.viewCorrectionReason')}</p>
                          </div>
                        </div>
                        <div className="w-8 h-8 bg-red-100/50 rounded-full flex items-center justify-center flex-shrink-0">
                           <ChevronDown className="w-4 h-4 text-red-600" />
                        </div>
                      </button>
                   </div>
                 )}
              </div>
            );
          })}

          {requests.length === 0 && (
             <div className="py-20 text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-12 h-12 text-slate-200" />
                </div>
                <h4 className="text-xl font-bold text-slate-400 uppercase tracking-tight">{t('studentDashboard.documentRequests.uploadSection.noRequests')}</h4>
             </div>
          )}
        </div>
      </section>

      {/* Modais e Componentes Auxiliares */}
      {previewUrl && (
        <DocumentViewerModal documentUrl={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}


      {viewingRejectionReason && createPortal(
        <div className="fixed top-0 left-0 w-[100vw] h-[100dvh] z-[9999999] flex md:hidden items-end justify-center p-4 bg-slate-900/60 backdrop-blur-md"
             style={{ position: 'fixed', margin: 0, boxSizing: 'border-box' }}
             onClick={(e) => { if (e.target === e.currentTarget) setViewingRejectionReason(null); }}
        >
          <div className="bg-white rounded-[2rem] shadow-2xl w-full p-6 border border-slate-200 text-left animate-in slide-in-from-bottom-8 duration-300">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                     <AlertCircle className="w-5 h-5 text-red-600" />
                   </div>
                   <div>
                     <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">{t('studentDashboard.documentRequests.modals.correctionReason')}</h3>
                     <p className="text-red-600 text-[10px] font-black uppercase tracking-widest mt-0.5">{t('studentDashboard.documentRequests.modals.adminNotice')}</p>
                   </div>
                </div>
                <button onClick={() => setViewingRejectionReason(null)} className="p-3 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 hover:text-slate-600 transition-all">
                  <X className="w-4 h-4" />
                </button>
             </div>
             
             <div className="p-5 bg-red-50/50 rounded-2xl border border-red-100 w-full max-h-[50vh] overflow-y-auto">
                <p className="text-red-900 font-medium text-sm leading-relaxed break-words whitespace-pre-wrap">
                  {viewingRejectionReason}
                </p>
             </div>

             <button onClick={() => setViewingRejectionReason(null)} className="w-full mt-6 py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-xs hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
                {t('studentDashboard.documentRequests.modals.understandClose')}
             </button>
          </div>
        </div>,
        document.body
      )}

      {showRejectModal && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
             style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 border border-slate-200 text-left">
            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-4">{t('studentDashboard.documentRequests.modals.provideJustification')}</h3>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">{t('studentDashboard.documentRequests.modals.rejectionExplanation')}</p>
            <textarea
              className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl p-6 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all min-h-[150px] font-medium"
              placeholder={t('studentDashboard.documentRequests.modals.rejectionExplanationPlaceholder')}
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
            <div className="mt-10 flex gap-4">
              <button
                className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs border-2 border-slate-100 text-slate-400 hover:bg-slate-50 transition-all"
                onClick={() => { setShowRejectModal(false); setPendingRejectUploadId(null); setRejectNotes(''); }}
              >
                {t('studentDashboard.documentRequests.forms.cancel')}
              </button>
              <button
                className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-black uppercase tracking-widest text-xs hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all px-8"
                disabled={!pendingRejectUploadId}
                onClick={async () => {
                  if (!pendingRejectUploadId) return;
                  const isTransferForm = transferFormUploads.some(upload => upload.id === pendingRejectUploadId);
                  if (isTransferForm) {
                    await handleRejectTransferFormUpload(pendingRejectUploadId, rejectNotes.trim());
                  } else {
                    await handleRejectUpload(pendingRejectUploadId, rejectNotes.trim());
                  }
                  setShowRejectModal(false);
                  setPendingRejectUploadId(null);
                  setRejectNotes('');
                }}
              >
                {t('studentDashboard.documentRequests.modals.confirm')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DocumentRequestsCard;
