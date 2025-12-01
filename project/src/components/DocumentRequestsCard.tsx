import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import DocumentViewerModal from './DocumentViewerModal';
import TruncatedText from './TruncatedText';

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
  const { t } = useTranslation();
  
  // Debug: verificar se studentType está chegando corretamente
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [uploads, setUploads] = useState<{ [requestId: string]: DocumentRequestUpload[] }>({});
  const [, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newRequest, setNewRequest] = useState({ title: '', description: '', due_date: '', attachment: null as File | null });
  const [error, setError] = useState<string | null>(null);
  // Novo estado para upload do aluno
  const [selectedFiles, setSelectedFiles] = useState<{ [requestId: string]: File | null }>({});
  const [uploading, setUploading] = useState<{ [requestId: string]: boolean }>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string | null }>({});
  const [loadingUrls, setLoadingUrls] = useState<{ [key: string]: boolean }>({});
  // Novo: signedUrl para o attachment enviado pela faculdade
  const [attachmentSignedUrls, setAttachmentSignedUrls] = useState<{ [requestId: string]: string | null }>({});
  const [loadingAttachmentUrls, setLoadingAttachmentUrls] = useState<{ [requestId: string]: boolean }>({});
  const [creating, setCreating] = useState(false);
  // Novo: Estado para acceptance letter
  const [acceptanceLetter, setAcceptanceLetter] = useState<any>(null);
  const [acceptanceLetterSignedUrls, setAcceptanceLetterSignedUrls] = useState<{ [key: string]: string | null }>({});
  // Estados para loading dos botões de ação
  const [downloadingAcceptanceLetter, setDownloadingAcceptanceLetter] = useState(false);
  const [viewingAcceptanceLetter, setViewingAcceptanceLetter] = useState(false);
  // Estado para o modal da carta de aceite
  const [acceptanceLetterPreviewUrl, setAcceptanceLetterPreviewUrl] = useState<string | null>(null);
  // Estado para transfer form
  const [transferForm, setTransferForm] = useState<any>(null);
  const [transferFormUploads, setTransferFormUploads] = useState<any[]>([]);
  const [selectedTransferFormFile, setSelectedTransferFormFile] = useState<File | null>(null);
  const [uploadingTransferForm, setUploadingTransferForm] = useState(false);
  // 1. Adicionar estado para logo da universidade
  const [universityId, setUniversityId] = useState<string | undefined>(undefined); // novo estado global
  // Modal para justificar rejeição de um upload específico
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [pendingRejectUploadId, setPendingRejectUploadId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

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
    setLoading(true);
    setError(null);
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
        universityId = appData.scholarships.university_id;
      }
      setUniversityId(universityId); // garantir que o estado global é atualizado
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
      setLoading(false);
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
      setLoading(false);
    }
  }, [applicationId, isSchool, studentType]);

  const handleNewRequest = async () => {
    setCreating(true);
    setError('');
    try {
      let attachment_url = '';
      if (newRequest.attachment) {
        const { data, error } = await supabase.storage.from('document-attachments').upload(`modelos/${Date.now()}_${newRequest.attachment.name}`, newRequest.attachment);
        if (error) {
          setError(t('studentDashboard.documentRequests.messages.failedToUploadAttachment') + ' ' + error.message);
          setCreating(false);
          return;
        }
        attachment_url = data?.path;
      }
      // LOGS DETALHADOS PARA DEBUG
      const payload = {
        title: newRequest.title,
        description: newRequest.description,
        due_date: newRequest.due_date || null,
        attachment_url: attachment_url || null,
        scholarship_application_id: applicationId,
        created_by: currentUserId,
        university_id: universityId,
        is_global: false, // Request individual
      };
      // console.log('[DEBUG] Enviando para Edge Function create-document-request', payload);
      // console.log('Payload enviado para Edge Function:', payload);
      // Antes do fetch:
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        setError(t('studentDashboard.documentRequests.messages.userNotAuthenticated'));
        setCreating(false);
        return;
      }
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
        // console.log('Erro ao fazer parse do JSON de resposta:', e);
      }
      // console.log('Resposta da Edge Function:', result);
      if (!response.ok || !result.success) {
        setError(t('studentDashboard.documentRequests.messages.failedToCreateRequest') + ' ' + (result.error || 'Unknown error'));
        setCreating(false);
        return;
      }
      setShowNewModal(false);
      setNewRequest({ title: '', description: '', due_date: '', attachment: null });
      fetchRequests();
    } catch (e: any) {
      setError('Unexpected error: ' + (e.message || e));
    } finally {
      setCreating(false);
    }
  };


  const handleFileSelect = (requestId: string, file: File | null) => {
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
    isResubmission: boolean
  ) => {
    console.log('[NOTIFICAÇÃO ADMIN] 🚀 Iniciando notificação para admins', {
      studentName,
      studentEmail,
      documentTitle,
      scholarshipTitle,
      universityName,
      applicationId,
      isResubmission
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
      let admins: Array<{ email: string; full_name: string; phone: string }> = [];
      try {
        console.log('[NOTIFICAÇÃO ADMIN] 🔍 Buscando admins no banco de dados...');
        const { data: adminProfiles, error: adminProfileError } = await supabase
          .from('user_profiles')
          .select('email, full_name, phone')
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
            email: 'admin@matriculausa.com',
            full_name: 'Admin MatriculaUSA',
            phone: ''
          }];
        }
      } catch (error) {
        console.error('[NOTIFICAÇÃO ADMIN] ❌ Erro ao buscar admins:', error);
        admins = [{
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
    console.log('[UPLOAD] 🚀 Iniciando upload de documento', { requestId });
    const file = selectedFiles[requestId];
    if (!file) {
      console.log('[UPLOAD] ⚠️ Nenhum arquivo selecionado');
      return;
    }
    setUploading(prev => ({ ...prev, [requestId]: true }));
    try {
      const { data, error } = await supabase.storage.from('document-attachments').upload(`uploads/${Date.now()}_${file.name}`, file);
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
              const university = globalRequestData.universities;
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

              // ✅ Notificar admins para documento global reenviado
              console.log('[REENVIO] 📧 Chamando notifyAdmins para documento global reenviado');
              await notifyAdmins(
                studentData.full_name,
                studentData.email,
                requestData.title,
                'Documento Global',
                university.name,
                null,
                true
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

            if (applicationData?.scholarships?.universities) {
              const university = (applicationData.scholarships as any).universities;
              const scholarship = applicationData.scholarships;
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

              // ✅ Notificar admins para documento reenviado
              console.log('[REENVIO] 📧 Chamando notifyAdmins para documento reenviado');
              await notifyAdmins(
                studentData.full_name,
                studentData.email,
                requestData.title,
                scholarship.title,
                university.name,
                requestData.scholarship_application_id,
                true
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

          // Usar dados do usuário autenticado
          const studentData = {
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuário',
            email: user.email || 'email@exemplo.com'
          };

          // Verificar se é um documento global (sem scholarship_application_id)
          if (!requestData.scholarship_application_id) {
            // console.log('[NOVO UPLOAD] Documento global - usando dados da universidade diretamente');
            
            if (requestData?.universities) {
              const university = requestData.universities;
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

              // ✅ Notificar admins para documento global novo
              console.log('[NOVO UPLOAD] 📧 Chamando notifyAdmins para documento global novo');
              await notifyAdmins(
                studentData.full_name,
                studentData.email,
                requestData.title,
                'Documento Global',
                university.name,
                null,
                false
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

            if (applicationData?.scholarships?.universities) {
              const university = (applicationData.scholarships as any).universities;
              const scholarship = applicationData.scholarships;
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

              // ✅ Notificar admins para novo documento
              console.log('[NOVO UPLOAD] 📧 Chamando notifyAdmins para novo documento');
              await notifyAdmins(
                studentData.full_name,
                studentData.email,
                requestData.title,
                scholarship.title,
                university.name,
                requestData.scholarship_application_id,
                false
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
        onDocumentUploaded(requestId, file.name, isResubmission || false);
      }
      
      fetchRequests();
    } finally {
      setUploading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const getSignedUrl = async (filePath: string, uploadId: string) => {
    if (loadingUrls[uploadId]) return;
    setLoadingUrls(prev => ({ ...prev, [uploadId]: true }));
    try {
      // console.log('[LOG] Gerando signedUrl para uploadId:', uploadId, 'filePath:', filePath);
      const { data, error } = await supabase.storage.from('document-attachments').createSignedUrl(filePath, 60 * 60);
      // console.log('[LOG] Resultado signedUrl:', { uploadId, filePath, data, error });
      setSignedUrls(prev => ({ ...prev, [uploadId]: error ? null : data.signedUrl }));
      if (error) {
        // console.error('[LOG] Erro ao gerar signedUrl:', error, error?.message);
      }
    } catch (e) {
      // console.error('[LOG] Exception ao gerar signedUrl:', e);
      setSignedUrls(prev => ({ ...prev, [uploadId]: null }));
    } finally {
      setLoadingUrls(prev => ({ ...prev, [uploadId]: false }));
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
        const filePath = req.attachment_url.startsWith('/') ? req.attachment_url.slice(1) : req.attachment_url;
        getAttachmentSignedUrl(filePath, req.id);
      }
    });
    // eslint-disable-next-line
  }, [requests]);

  // Função utilitária para extrair caminho relativo da URL completa
  const getRelativePath = (fullUrl: string) => {
    const baseUrl = 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/document-attachments/';
    if (fullUrl.startsWith(baseUrl)) {
      return fullUrl.replace(baseUrl, '');
    }
    return fullUrl; // Se já for relativo
  };

  // Gerar signedUrl para acceptance_letter_url
  useEffect(() => {
    const fetchSignedUrls = async () => {
      if (acceptanceLetter?.acceptance_letter_url && !acceptanceLetterSignedUrls['acceptance_letter_url']) {
        const filePath = getRelativePath(acceptanceLetter.acceptance_letter_url);
        const { data, error } = await supabase.storage.from('document-attachments').createSignedUrl(filePath, 60 * 60);
        setAcceptanceLetterSignedUrls(prev => ({ ...prev, acceptance_letter_url: error ? null : data.signedUrl }));
      }
    };
    fetchSignedUrls();
  }, [acceptanceLetter]);

  // Função utilitária para download forçado
  const handleForceDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 2000);
    } catch (e) {
      alert(t('studentDashboard.documentRequests.forms.failedToDownloadFile'));
    }
  };

  useEffect(() => {
    // Gera signedUrl para todos os uploads exibidos
    Object.entries(uploads).forEach(([, uploadsArr]) => {
      uploadsArr.forEach(up => {
        const filePath = up.file_url && up.file_url.startsWith('/') ? up.file_url.slice(1) : up.file_url;
        if (filePath && !signedUrls[up.id] && !loadingUrls[up.id]) {
          getSignedUrl(filePath, up.id);
        }
      });
    });
    // eslint-disable-next-line
  }, [uploads]);

  // Handler para aprovar upload
  const handleApproveUpload = async (uploadId: string) => {
    try {
      const { error } = await supabase
        .from('document_request_uploads')
        .update({ status: 'approved' })
        .eq('id', uploadId);
      if (error) {
        setError(t('studentDashboard.documentRequests.forms.failedToApproveDocument') + ' ' + error.message);
        return;
      }
      fetchRequests();
    } catch (e: any) {
      setError('Unexpected error while approving: ' + (e.message || e));
    }
  };

  // Handler para rejeitar upload
  const handleRejectUpload = async (uploadId: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('document_request_uploads')
        .update({ status: 'rejected', review_notes: notes || null })
        .eq('id', uploadId);
      if (error) {
        setError(t('studentDashboard.documentRequests.forms.failedToRejectDocument') + ' ' + error.message);
        return;
      }
      fetchRequests();
    } catch (e: any) {
      setError('Unexpected error while rejecting: ' + (e.message || e));
    }
  };

  // Padronizar status para snake_case
  const normalizeStatus = (status: string) => (status || '').toLowerCase().replace(/\s+/g, '_');

  // Funções para Transfer Form
  const handleStudentUploadTransferForm = async () => {
    if (!selectedTransferFormFile || !applicationId) return;
    
    setUploadingTransferForm(true);
    try {
      // Upload do arquivo
      const { data, error } = await supabase.storage
        .from('document-attachments')
        .upload(`transfer-forms-filled/${Date.now()}_${selectedTransferFormFile.name}`, selectedTransferFormFile);
      
      if (error) throw error;
      
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
      
    } catch (error: any) {
      console.error('Erro ao fazer upload do transfer form:', error);
      setError('Erro ao fazer upload do formulário: ' + error.message);
    } finally {
      setUploadingTransferForm(false);
    }
  };

  const handleApproveTransferFormUpload = async (uploadId: string) => {
    try {
      const { error } = await supabase
        .from('transfer_form_uploads')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUserId
        })
        .eq('id', uploadId);
      
      if (error) throw error;
      
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
      console.error('Erro ao aprovar transfer form:', error);
      setError('Erro ao aprovar formulário: ' + error.message);
    }
  };

  const handleRejectTransferFormUpload = async (uploadId: string, reason: string) => {
    try {
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

  return (
    <div className="max-w-3xl mx-auto p-0 sm:p-6">
      {isSchool && (
        <div className="flex justify-end mb-4">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded font-semibold shadow hover:bg-blue-700 transition"
            onClick={() => setShowNewModal(true)}
          >
            New Individual Request
          </button>
        </div>
      )}
      {/* <h2 className="text-2xl font-bold mb-6 text-[#05294E]">Document Requests</h2> */}
      {/* <p className="text-slate-500 mb-8">Below are the documents requested by the university. Download templates if available and upload your files for each request.</p> */}



      {/* Lista de Document Requests - Design Otimizado para Mobile */}
      <div className="space-y-4 sm:space-y-8">
        {requests.length === 0 ? (
          <div className="text-center text-slate-400 py-12">
            <svg className="mx-auto w-16 h-16 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            <p>No document requests found.</p>
          </div>
        ) : (
          requests.map(req => {
            return (
              <div key={req.id} className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 mb-3">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">{req.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-500 line-clamp-2">{req.description}</p>
                      {req.attachment_url && (
                        <div className="mt-2">
                          <button
                            onClick={() => {
                              const signedUrl = attachmentSignedUrls[req.id];
                              const fileUrl = signedUrl || req.attachment_url;
                              if (fileUrl) {
                                setPreviewUrl(fileUrl);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium hover:underline flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Template
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <button className="px-2 py-1 sm:px-3 sm:py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-100 transition-colors flex-shrink-0 ml-2">
                    Open
                  </button>
                </div>

                {/* Student uploads for this request */}
                <div className="ml-0 sm:ml-13">
                  <span className="text-xs sm:text-sm font-semibold text-slate-700 mb-2 block">
                    {isSchool ? t('studentDashboard.documentRequests.forms.studentUploads') : t('studentDashboard.documentRequests.forms.yourUploads')}
                  </span>
                  {uploads[req.id]?.length > 0 ? (
                    uploads[req.id].map(upload => {
                      const normalizedStatus = normalizeStatus(upload.status);
                      let statusColor = 'bg-green-100 text-green-800 border-green-200';
                      let containerColor = 'bg-green-50 border border-green-200';
                      
                      if (normalizedStatus === 'pending') { 
                        statusColor = 'bg-yellow-100 text-yellow-800 border-yellow-200'; 
                        containerColor = 'bg-yellow-50 border border-yellow-200'; 
                      }
                      if (normalizedStatus === 'rejected') { 
                        statusColor = 'bg-red-100 text-red-800 border-red-200'; 
                        containerColor = 'bg-red-50 border border-red-200'; 
                      }
                      if (normalizedStatus === 'under_review') {
                        statusColor = 'bg-blue-100 text-blue-800 border-blue-200';
                        containerColor = 'bg-blue-50 border border-blue-200';
                      }
                      
                      return (
                        <div key={upload.id} className={`p-2 sm:p-3 rounded-lg ${containerColor} mb-2`}>
                          <div className="flex items-start gap-2 sm:gap-3 mb-2">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7v10a2 2 0 002 2h6a2 2 0 002-2V7" />
                            </svg>
                            <span className="text-slate-700 text-xs sm:text-sm font-medium truncate flex-1 min-w-0">
                              {upload.file_url?.split('/').pop()}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColor} self-start`}>
                              {normalizedStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                            <div className="flex gap-2">
                              <button
                                className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium hover:underline"
                                onClick={() => {
                                  const signedUrl = signedUrls[upload.id];
                                  const fileUrl = signedUrl || upload.file_url;
                                  if (fileUrl) {
                                    const isImage = upload.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                    if (isImage) {
                                      setPreviewUrl(fileUrl);
                                    } else {
                                      // Abrir no modal ao invés de nova aba
                                      setPreviewUrl(fileUrl);
                                    }
                                  }
                                }}
                              >
                                {t('studentDashboard.documentRequests.forms.view')}
                              </button>
                              <button
                                className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium hover:underline"
                                onClick={async () => {
                                  const signedUrl = signedUrls[upload.id] || upload.file_url;
                                  if (signedUrl) {
                                    await handleForceDownload(signedUrl, upload.file_url?.split('/').pop() || 'document.pdf');
                                  }
                                }}
                              >
                                Download
                              </button>
                              
                              {/* Botões de aprovação e rejeição para administradores */}
                              {isSchool && (normalizedStatus === 'pending' || normalizedStatus === 'under_review') && (
                                <>
                                  <button
                                    className="text-green-600 hover:text-green-800 text-xs sm:text-sm font-medium hover:underline"
                                    onClick={() => handleApproveUpload(upload.id)}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="text-red-600 hover:text-red-800 text-xs sm:text-sm font-medium hover:underline"
                                    onClick={() => {
                                      setPendingRejectUploadId(upload.id);
                                      setShowRejectModal(true);
                                    }}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Show rejection reason if document is rejected */}
                          {normalizedStatus === 'rejected' && upload.rejection_reason && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-xs font-medium text-red-600 mb-1">Rejection reason:</p>
                              <p className="text-sm text-red-700 leading-relaxed">{upload.rejection_reason}</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-slate-500 text-sm italic">{t('studentDashboard.documentRequests.forms.noFilesUploadedYet')}</div>
                  )}
                </div>

                {/* Upload area for this request */}
                {!isSchool && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition flex-shrink-0">
                        <span>{t('studentDashboard.documentRequests.forms.uploadNewFile')}</span>
                        <input
                          id={`file-upload-${req.id}`}
                          type="file"
                          className="sr-only"
                          onChange={e => handleFileSelect(req.id, e.target.files ? e.target.files[0] : null)}
                        />
                      </label>
                      {selectedFiles[req.id] && (
                        <div className="text-xs sm:text-sm text-slate-600">
                          <TruncatedText
                            text={selectedFiles[req.id]?.name || ''}
                            maxLength={40}
                            className="text-xs sm:text-sm text-slate-600"
                            showTooltip={true}
                            tooltipPosition="top"
                            breakWords={true}
                            isFilename={true}
                          />
                        </div>
                      )}
                      <button
                        className={`bg-blue-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0`}
                        disabled={!selectedFiles[req.id] || uploading[req.id]}
                        onClick={() => handleSendUpload(req.id)}
                      >
                        {uploading[req.id] ? t('studentDashboard.documentRequests.forms.uploading') : t('studentDashboard.documentRequests.forms.upload')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Acceptance Letter block - Design otimizado para mobile */}
      {showAcceptanceLetter && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-4 sm:mt-8 relative">
        {/* Header escuro azul */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-3 sm:px-6 sm:py-5">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
              <svg className="w-4 h-4 sm:w-7 sm:h-7 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-2xl font-bold text-white mb-1 truncate">{t('studentDashboard.documentRequests.forms.acceptanceLetter')}</h3>
            </div>
          </div>
        </div>
        
        {/* Conteúdo principal */}
        <div className="p-3 sm:p-8">
          {/* Instruções */}
          <p className="text-slate-700 text-xs sm:text-lg mb-4 sm:mb-8 leading-relaxed max-w-4xl">
            {t('studentDashboard.documentRequests.forms.acceptanceLetterInstructions')}
          </p>
          
          {/* Status para o aluno */}
          {!isSchool && (
            <div className="flex flex-col items-center gap-3 sm:gap-4">

              {acceptanceLetter && (acceptanceLetter.acceptance_letter_status === 'approved' || acceptanceLetter.acceptance_letter_status === 'sent') ? (
                <div className="text-center w-full max-w-sm">
                  <div className="mb-3 sm:mb-4 relative">
                    <span className="inline-block px-3 py-2 sm:px-6 sm:py-3 bg-green-100 text-green-800 border border-green-300 rounded-xl text-sm sm:text-base font-semibold break-words">
                      {t('studentDashboard.documentRequests.forms.acceptanceLetterReceived')}
                    </span>
                  </div>
                  <p className="text-green-700 text-xs sm:text-sm mb-3 sm:mb-4 px-2 leading-relaxed">
                    {t('studentDashboard.documentRequests.forms.enrolledMessage')}
                  </p>
                  {acceptanceLetter.acceptance_letter_url && (
                    <div className="flex flex-col sm:flex-row gap-2 justify-center w-full px-2">
                      <button
                        className="bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-lg font-semibold shadow hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto"
                        disabled={downloadingAcceptanceLetter}
                        onClick={async () => {
                          try {
                            setDownloadingAcceptanceLetter(true);
                            // console.log('=== DEBUG Download Acceptance Letter ===');
                            // console.log('File URL:', acceptanceLetter.acceptance_letter_url);
                            
                            // Gerar signed URL diretamente
                            const filePath = getRelativePath(acceptanceLetter.acceptance_letter_url);
                            const { data, error } = await supabase.storage
                              .from('document-attachments')
                              .createSignedUrl(filePath, 60 * 60);
                            
                            if (error) {
                              console.error('Erro ao gerar signed URL:', error);
                              alert(t('studentDashboard.documentRequests.forms.errorDownloadingDocument'));
                              return;
                            }
                            
                            // console.log('Signed URL gerada:', data.signedUrl);
                            
                            // Fazer download
                            const response = await fetch(data.signedUrl);
                            if (!response.ok) {
                              throw new Error('Failed to download document');
                            }
                            
                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = 'acceptance_letter.pdf';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                            
                            // console.log('Download concluído com sucesso');
                          } catch (error) {
                            console.error('Erro no download:', error);
                            alert(t('studentDashboard.documentRequests.forms.errorDownloadingDocument'));
                          } finally {
                            setDownloadingAcceptanceLetter(false);
                          }
                        }}
                      >
                        {downloadingAcceptanceLetter ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            {t('studentDashboard.documentRequests.status.downloading')}
                          </div>
                        ) : (
                          t('studentDashboard.documentRequests.actions.downloadAcceptanceLetter')
                        )}
                      </button>
                      <button
                        className="bg-white text-blue-600 border border-blue-600 px-3 py-2 sm:px-4 rounded-lg font-semibold shadow hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto"
                        disabled={viewingAcceptanceLetter}
                        onClick={async () => {
                          try {
                            setViewingAcceptanceLetter(true);
                            // console.log('=== DEBUG View Acceptance Letter ===');
                            // console.log('File URL:', acceptanceLetter.acceptance_letter_url);
                            
                            // Gerar signed URL diretamente
                            const filePath = getRelativePath(acceptanceLetter.acceptance_letter_url);
                            const { data, error } = await supabase.storage
                              .from('document-attachments')
                              .createSignedUrl(filePath, 60 * 60);
                            
                            if (error) {
                              console.error('Erro ao gerar signed URL:', error);
                              alert(t('studentDashboard.documentRequests.forms.errorViewingDocument'));
                              return;
                            }
                            
                            // console.log('Signed URL gerada para visualização:', data.signedUrl);
                            
                            // Abrir no modal ao invés de nova aba
                            setAcceptanceLetterPreviewUrl(data.signedUrl);
                          } catch (error) {
                            console.error('Erro ao visualizar:', error);
                            alert(t('studentDashboard.documentRequests.forms.errorViewingDocument'));
                          } finally {
                            setViewingAcceptanceLetter(false);
                          }
                        }}
                      >
                        {viewingAcceptanceLetter ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            {t('studentDashboard.documentRequests.status.opening')}
                          </div>
                        ) : (
                          t('studentDashboard.documentRequests.actions.view')
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <span className="px-6 py-3 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-xl text-base font-semibold">
                  {t('studentDashboard.documentRequests.status.waitingForUniversity')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Transfer Form block: só para transfer, no final da página */}
      {studentType === 'transfer' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-4 sm:mt-8 relative">
          {/* Header escuro azul */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-3 sm:px-6 sm:py-5">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                <svg className="w-4 h-4 sm:w-7 sm:h-7 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-2xl font-bold text-white mb-1 truncate">{t('studentDashboard.documentRequests.forms.transferForm')}</h3>
              </div>
            </div>
          </div>
          
          {/* Conteúdo principal */}
          <div className="p-3 sm:p-8">
            {/* Instruções - só mostrar se não há upload aprovado */}
            {!transferFormUploads.some(upload => upload.status === 'approved') && (
              <p className="text-slate-700 text-xs sm:text-lg mb-4 sm:mb-8 leading-relaxed max-w-4xl">
                {isSchool
                  ? t('studentDashboard.documentRequests.forms.transferFormDescriptionSchool')
                  : t('studentDashboard.documentRequests.forms.transferFormDescriptionStudent')}
              </p>
            )}
            
          {/* Upload para escola */}
          {isSchool ? (
              <div className="space-y-4">
                {/* Upload do template pela universidade */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                  <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 flex-1 sm:flex-none" title={t('studentDashboard.documentRequests.actions.uploadTransferFormTitle')}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                 <span>{t('studentDashboard.documentRequests.actions.uploadTransferForm')}</span>
                <input
                  id="transfer-form-upload"
                  type="file"
                  title={t('studentDashboard.documentRequests.actions.selectTransferFormTitle')}
                  placeholder={t('studentDashboard.documentRequests.forms.chooseFile')}
                  onChange={e => handleFileSelect('transfer_form', e.target.files ? e.target.files[0] : null)}
                  className="sr-only"
                />
              </label>
              {selectedFiles['transfer_form'] && (
                    <div className="text-sm text-slate-600 flex-1 min-w-0">
                  <TruncatedText
                    text={selectedFiles['transfer_form']?.name || ''}
                    maxLength={40}
                        className="text-sm text-slate-600"
                    showTooltip={true}
                    tooltipPosition="top"
                    breakWords={true}
                    isFilename={true}
                    documentType="transfer_form"
                  />
                </div>
              )}
              <button
                    className={`bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold shadow hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-1 sm:flex-none`}
                disabled={!selectedFiles['transfer_form'] || uploading['transfer_form']}
                onClick={() => handleSendUpload('transfer_form')}
                title={t('studentDashboard.documentRequests.actions.sendTransferFormTitle')}
              >
                    {uploading['transfer_form'] ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {t('studentDashboard.documentRequests.forms.uploading')}
                      </div>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        {t('studentDashboard.documentRequests.forms.upload')}
                      </>
                    )}
              </button>
                </div>

                {/* Upload do aluno para revisão */}
                {transferFormUploads.length > 0 && (
                  <div className="border-t border-slate-200 pt-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Student Upload Status</h4>
                    {transferFormUploads.map((upload) => {
                      const statusColor = upload.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                        upload.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                        'bg-yellow-100 text-yellow-800 border-yellow-200';
                      
                      return (
                        <div key={upload.id} className="bg-white border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-sm font-medium text-slate-700">
                                {upload.file_url.split('/').pop()}
                              </span>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                              {upload.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </span>
                          </div>
                          
                          {upload.rejection_reason && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-xs font-medium text-red-600 mb-1">Rejection reason:</p>
                              <p className="text-sm text-red-700">{upload.rejection_reason}</p>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <button
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline"
                              onClick={() => {
                                const signedUrl = upload.file_url;
                                if (signedUrl) {
                                  setPreviewUrl(signedUrl);
                                }
                              }}
                            >
                              View
                            </button>
                            <button
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline"
                              onClick={async () => {
                                const signedUrl = upload.file_url;
                                if (signedUrl) {
                                  await handleForceDownload(signedUrl, upload.file_url.split('/').pop() || 'transfer_form.pdf');
                                }
                              }}
                            >
                              Download
                            </button>
                            
                            {upload.status === 'under_review' && (
                              <>
                                <button
                                  className="text-green-600 hover:text-green-800 text-xs font-medium hover:underline"
                                  onClick={() => handleApproveTransferFormUpload(upload.id)}
                                >
                                  Approve
                                </button>
                                <button
                                  className="text-red-600 hover:text-red-800 text-xs font-medium hover:underline"
                                  onClick={() => {
                                    setPendingRejectUploadId(upload.id);
                                    setShowRejectModal(true);
                                  }}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          ) : (
            // Download/visualização para aluno
              <div className="flex flex-col items-center gap-3 sm:gap-4">
                {/* Se há upload aprovado, não mostrar template */}
                {transferFormUploads.some(upload => upload.status === 'approved') ? null : (
                  <>
              {transferForm?.transfer_form_url ? (
                      <div className="text-center w-full max-w-sm">
                        <div className="mb-3 sm:mb-4 relative">
                          <span className="inline-block px-3 py-2 sm:px-6 sm:py-3 bg-green-100 text-green-800 border border-green-300 rounded-xl text-sm sm:text-base font-semibold break-words">
                            {t('studentDashboard.documentRequests.forms.transferFormReceived')}
                          </span>
                        </div>
                        <p className="text-green-700 text-xs sm:text-sm mb-3 sm:mb-4 px-2 leading-relaxed">
                          {t('studentDashboard.documentRequests.forms.transferFormReadyMessage')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 justify-center w-full px-2">
                  <button
                            className="bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-lg font-semibold shadow hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm sm:text-base w-full sm:w-auto"
                            onClick={async () => {
                              try {
                                // Função utilitária para extrair caminho relativo
                                const getRelativePath = (fullUrl: string) => {
                                  const baseUrl = 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/document-attachments/';
                                  if (fullUrl.startsWith(baseUrl)) {
                                    return fullUrl.replace(baseUrl, '');
                                  }
                                  return fullUrl;
                                };

                                const filePath = getRelativePath(transferForm.transfer_form_url);
                                const { data, error } = await supabase.storage
                                  .from('document-attachments')
                                  .createSignedUrl(filePath, 60 * 60);
                                
                                if (error) {
                                  console.error('Erro ao gerar signed URL:', error);
                                  alert('Erro ao baixar documento');
                                  return;
                                }
                                
                                // Fazer download
                                const response = await fetch(data.signedUrl);
                                if (!response.ok) throw new Error('Failed to download document');
                                
                                const blob = await response.blob();
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = 'transfer_form.pdf';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(url);
                              } catch (error) {
                                console.error('Erro no download:', error);
                                alert('Erro ao baixar documento');
                              }
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                    {t('studentDashboard.documentRequests.forms.downloadTransferForm')}
                  </button>
                  <button
                            className="bg-white text-blue-600 border border-blue-600 px-3 py-2 sm:px-4 rounded-lg font-semibold shadow hover:bg-blue-50 transition flex items-center justify-center gap-2 text-sm sm:text-base w-full sm:w-auto"
                            onClick={async () => {
                              try {
                                // Função utilitária para extrair caminho relativo
                                const getRelativePath = (fullUrl: string) => {
                                  const baseUrl = 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/document-attachments/';
                                  if (fullUrl.startsWith(baseUrl)) {
                                    return fullUrl.replace(baseUrl, '');
                                  }
                                  return fullUrl;
                                };

                                const filePath = getRelativePath(transferForm.transfer_form_url);
                                const { data, error } = await supabase.storage
                                  .from('document-attachments')
                                  .createSignedUrl(filePath, 60 * 60);
                                
                                if (error) {
                                  console.error('Erro ao gerar signed URL:', error);
                                  alert('Erro ao visualizar documento');
                                  return;
                                }
                                
                                setPreviewUrl(data.signedUrl);
                              } catch (error) {
                                console.error('Erro ao visualizar:', error);
                                alert('Erro ao visualizar documento');
                              }
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                    {t('studentDashboard.documentRequests.forms.view')}
                  </button>
                        </div>
                  {transferForm.transfer_form_sent_at && (
                          <p className="text-xs text-slate-500 mt-2">
                      {t('studentDashboard.documentRequests.forms.sentOn')} {new Date(transferForm.transfer_form_sent_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="px-6 py-3 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-xl text-base font-semibold">
                        {t('studentDashboard.documentRequests.status.waitingForUniversity')}
                    </span>
                  )}
                  </>
                )}

                {/* Área de upload do formulário preenchido pelo aluno */}
                {transferForm?.transfer_form_url && (
                  <>
                    {/* Se há upload aprovado, mostrar apenas ele */}
                    {transferFormUploads.some(upload => upload.status === 'approved') ? (
                      <div className="w-full max-w-md p-4 bg-slate-50 rounded-lg border border-slate-200">
                        {transferFormUploads
                          .filter(upload => upload.status === 'approved')
                          .map((upload) => (
                            <div key={upload.id} className="text-center">
                              <div className="flex items-center justify-center gap-2 mb-3">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-medium text-slate-700">
                                  {upload.file_url.split('/').pop()}
                                </span>
                              </div>
                              
                              {/* Botões de ação simplificados */}
                              <div className="flex gap-2 justify-center">
                                <button
                                  className="bg-blue-600 text-white px-3 py-2 rounded-lg font-medium shadow hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm"
                                  onClick={async () => {
                                    try {
                                      const getRelativePath = (fullUrl: string) => {
                                        const baseUrl = 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/document-attachments/';
                                        if (fullUrl.startsWith(baseUrl)) {
                                          return fullUrl.replace(baseUrl, '');
                                        }
                                        return fullUrl;
                                      };

                                      const filePath = getRelativePath(upload.file_url);
                                      const { data, error } = await supabase.storage
                                        .from('document-attachments')
                                        .createSignedUrl(filePath, 60 * 60);
                                      
                                      if (error) {
                                        console.error('Erro ao gerar signed URL:', error);
                                        alert('Erro ao baixar documento');
                                        return;
                                      }
                                      
                                      const response = await fetch(data.signedUrl);
                                      if (!response.ok) throw new Error('Failed to download document');
                                      
                                      const blob = await response.blob();
                                      const url = URL.createObjectURL(blob);
                                      const link = document.createElement('a');
                                      link.href = url;
                                      link.download = upload.file_url.split('/').pop() || 'transfer_form.pdf';
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      URL.revokeObjectURL(url);
                                    } catch (error) {
                                      console.error('Erro no download:', error);
                                      alert('Erro ao baixar documento');
                                    }
                                  }}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Download
                                </button>
                                <button
                                  className="bg-white text-blue-600 border border-blue-600 px-3 py-2 rounded-lg font-medium shadow hover:bg-blue-50 transition flex items-center justify-center gap-2 text-sm"
                                  onClick={async () => {
                                    try {
                                      const getRelativePath = (fullUrl: string) => {
                                        const baseUrl = 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/document-attachments/';
                                        if (fullUrl.startsWith(baseUrl)) {
                                          return fullUrl.replace(baseUrl, '');
                                        }
                                        return fullUrl;
                                      };

                                      const filePath = getRelativePath(upload.file_url);
                                      const { data, error } = await supabase.storage
                                        .from('document-attachments')
                                        .createSignedUrl(filePath, 60 * 60);
                                      
                                      if (error) {
                                        console.error('Erro ao gerar signed URL:', error);
                                        alert('Erro ao visualizar documento');
                                        return;
                                      }
                                      
                                      setPreviewUrl(data.signedUrl);
                                    } catch (error) {
                                      console.error('Erro ao visualizar:', error);
                                      alert('Erro ao visualizar documento');
                                    }
                                  }}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View
                                </button>
                              </div>
                            </div>
                          ))}
                </div>
              ) : (
                      /* Se não há upload aprovado, mostrar área completa de upload */
                      <div className="w-full max-w-md mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Upload Filled Form</h4>
                        
                        {/* Status do upload atual */}
                        {transferFormUploads.length > 0 && (
                          <div className="mb-4">
                            {transferFormUploads.map((upload) => {
                              const statusColor = upload.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                                upload.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                                'bg-yellow-100 text-yellow-800 border-yellow-200';
                              
                              return (
                                <div key={upload.id} className="mb-3">
                                  <div className="flex flex-col items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-slate-700">
                                      {upload.file_url.split('/').pop()}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                                      {upload.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                    </span>
                                  </div>
                                  
                                  {upload.rejection_reason && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-2">
                                      <p className="text-xs font-medium text-red-600 mb-1">Rejection reason:</p>
                                      <p className="text-sm text-red-700">{upload.rejection_reason}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
            </div>
          )}
                        
                        {/* Upload area */}
                        <div className="flex flex-col gap-3">
                          <label className="cursor-pointer bg-white hover:bg-slate-50 text-slate-700 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 border border-slate-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Select Filled Form</span>
                            <input
                              type="file"
                              className="sr-only"
                              onChange={e => setSelectedTransferFormFile(e.target.files ? e.target.files[0] : null)}
                            />
                          </label>
                          
                          {selectedTransferFormFile && (
                            <div className="text-sm text-slate-600">
                              <TruncatedText
                                text={selectedTransferFormFile.name}
                                maxLength={40}
                                className="text-sm text-slate-600"
                                showTooltip={true}
                                tooltipPosition="top"
                                breakWords={true}
                                isFilename={true}
                              />
                            </div>
                          )}
                          
                          <button
                            className="bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold shadow hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            disabled={!selectedTransferFormFile || uploadingTransferForm}
                            onClick={handleStudentUploadTransferForm}
                          >
                            {uploadingTransferForm ? (
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Uploading...
                              </div>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                Upload Filled Form
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-slate-200 animate-fade-in">
                            <h3 className="font-extrabold text-xl mb-6 text-[#05294E] text-center">{t('studentDashboard.documentRequests.forms.newDocumentRequest')}</h3>
            {error && <div className="text-red-500 mb-4 text-center font-semibold">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="doc-title">{t('studentDashboard.documentRequests.forms.titleRequired')}</label>
                <input
                  id="doc-title"
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base"
                  placeholder={t('studentDashboard.documentRequests.forms.enterDocumentTitle')}
                  value={newRequest.title}
                  onChange={e => setNewRequest(r => ({ ...r, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="doc-description">{t('studentDashboard.documentRequests.forms.description')}</label>
                <textarea
                  id="doc-description"
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base"
                  placeholder={t('studentDashboard.documentRequests.forms.enterDocumentDescription')}
                  value={newRequest.description}
                  onChange={e => setNewRequest(r => ({ ...r, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="doc-date">{t('studentDashboard.documentRequests.forms.dueDate')}</label>
                <input
                  id="doc-date"
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base"
                  type="date"
                  value={newRequest.due_date}
                  onChange={e => setNewRequest(r => ({ ...r, due_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="doc-attachment">{t('studentDashboard.documentRequests.forms.attachment')}</label>
                <div className="flex items-center gap-3">
                  <label htmlFor="doc-attachment" className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition font-medium text-blue-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828l6.586-6.586M16 5v6a2 2 0 002 2h6" /></svg>
                    <span>{newRequest.attachment ? t('studentDashboard.documentRequests.forms.changeFile') : t('studentDashboard.documentRequests.forms.selectFile')}</span>
                    <input
                      id="doc-attachment"
                      type="file"
                      className="sr-only"
                      onChange={e => setNewRequest(r => ({ ...r, attachment: e.target.files ? e.target.files[0] : null }))}
                      disabled={creating}
                    />
                  </label>
                  {newRequest.attachment && (
                    <div className="text-xs text-slate-700 max-w-[180px]">
                      <TruncatedText
                        text={newRequest.attachment.name}
                        maxLength={30}
                        className="text-xs text-slate-700"
                        showTooltip={true}
                        tooltipPosition="top"
                        breakWords={true}
                        isFilename={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition disabled:opacity-50"
                onClick={() => setShowNewModal(false)}
                disabled={creating}
              >
                {t('studentDashboard.documentRequests.forms.cancel')}
              </button>
              <button
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                onClick={handleNewRequest}
                disabled={creating || !newRequest.title}
              >
                {creating ? t('studentDashboard.documentRequests.forms.creating') : t('studentDashboard.documentRequests.forms.createRequest')}
              </button>
            </div>
          </div>
        </div>
      )}
      {showNewModal && isSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-slate-200 animate-fade-in">
                            <h3 className="font-extrabold text-xl mb-6 text-[#05294E] text-center">{t('studentDashboard.documentRequests.forms.newIndividualDocumentRequest')}</h3>
            {error && <div className="text-red-500 mb-4 text-center font-semibold">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="individual-title">{t('studentDashboard.documentRequests.forms.titleRequired')}</label>
                <input
                  id="individual-title"
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base"
                  placeholder={t('studentDashboard.documentRequests.forms.enterDocumentTitle')}
                  value={newRequest.title}
                  onChange={e => setNewRequest(r => ({ ...r, title: e.target.value }))}
                  disabled={creating}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="individual-desc">{t('studentDashboard.documentRequests.forms.description')}</label>
                <textarea
                  id="individual-desc"
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base min-h-[60px] resize-vertical"
                  placeholder={t('studentDashboard.documentRequests.forms.describeDocumentOptional')}
                  value={newRequest.description}
                  onChange={e => setNewRequest(r => ({ ...r, description: e.target.value }))}
                  disabled={creating}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="individual-date">{t('studentDashboard.documentRequests.forms.dueDate')}</label>
                <input
                  id="individual-date"
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition text-base"
                  type="date"
                  value={newRequest.due_date}
                  onChange={e => setNewRequest(r => ({ ...r, due_date: e.target.value }))}
                  disabled={creating}
                  placeholder={t('studentDashboard.documentRequests.forms.dueDate')}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="individual-attachment">{t('studentDashboard.documentRequests.forms.attachment')}</label>
                <div className="flex items-center gap-3">
                  <label htmlFor="individual-attachment" className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition font-medium text-blue-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828l6.586-6.586M16 5v6a2 2 0 002 2h6" /></svg>
                    <span>{newRequest.attachment ? t('studentDashboard.documentRequests.forms.changeFile') : t('studentDashboard.documentRequests.forms.selectFile')}</span>
                    <input
                      id="individual-attachment"
                      type="file"
                      className="sr-only"
                      onChange={e => setNewRequest(r => ({ ...r, attachment: e.target.files ? e.target.files[0] : null }))}
                      disabled={creating}
                    />
                  </label>
                  {newRequest.attachment && (
                    <div className="text-xs text-slate-700 max-w-[180px]">
                      <TruncatedText
                        text={newRequest.attachment.name}
                        maxLength={30}
                        className="text-xs text-slate-700"
                        showTooltip={true}
                        tooltipPosition="top"
                        breakWords={true}
                        isFilename={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-8">
              <button
                className="px-4 py-2 rounded bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 border border-slate-200"
                onClick={() => { setShowNewModal(false); setNewRequest({ title: '', description: '', due_date: '', attachment: null }); setError(null); }}
                disabled={creating}
              >
                {t('studentDashboard.documentRequests.forms.cancel')}
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow border border-blue-700"
                onClick={async () => {
                  if (!newRequest.title) { setError(t('studentDashboard.documentRequests.forms.titleRequired')); return; }
                  setCreating(true);
                  setError(null);
                  let attachment_url = undefined;
                  try {
                    if (newRequest.attachment) {
                      const { data: { session } } = await supabase.auth.getSession();
                      const accessToken = session?.access_token;
                      if (!accessToken) {
                        setError(t('studentDashboard.documentRequests.messages.userNotAuthenticated'));
                        setCreating(false);
                        return;
                      }
                      const { data, error } = await supabase.storage.from('document-attachments').upload(`individual/${Date.now()}_${newRequest.attachment.name}`, newRequest.attachment);
                      if (error) {
                        setError(t('studentDashboard.documentRequests.messages.failedToUploadAttachment') + ' ' + error.message);
                        setCreating(false);
                        return;
                      }
                      attachment_url = data?.path;
                    }
                    // LOGS DETALHADOS PARA DEBUG
                    const payload = {
                      title: newRequest.title,
                      description: newRequest.description,
                      due_date: newRequest.due_date || null,
                      attachment_url: attachment_url || null,
                      university_id: universityId, // agora garantido pelo estado global
                      is_global: false,
                      status: 'open',
                      created_by: currentUserId,
                      scholarship_application_id: applicationId
                    };
                    // console.log('Payload enviado para Edge Function (individual):', payload);
                    const { data: { session } } = await supabase.auth.getSession();
                    const accessToken = session?.access_token;
                    if (!accessToken) {
                      setError(t('studentDashboard.documentRequests.messages.userNotAuthenticated'));
                      setCreating(false);
                      return;
                    }
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
                      // console.log('Erro ao fazer parse do JSON de resposta (individual):', e);
                    }
                    // console.log('Resposta da Edge Function (individual):', result);
                    if (!response.ok || !result.success) {
                      setError(t('studentDashboard.documentRequests.messages.failedToCreateRequest') + ' ' + (result.error || 'Unknown error'));
                      setCreating(false);
                      return;
                    }
                    setShowNewModal(false);
                    setNewRequest({ title: '', description: '', due_date: '', attachment: null });
                    fetchRequests();
                  } catch (e: any) {
                    setError('Unexpected error: ' + (e.message || e));
                  } finally {
                    setCreating(false);
                  }
                }}
                disabled={creating}
              >
                {t('studentDashboard.documentRequests.forms.createRequest')}
              </button>
            </div>
          </div>
        </div>
      )}
      {previewUrl && (
        <DocumentViewerModal documentUrl={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}

      {/* Modal da carta de aceite */}
      {acceptanceLetterPreviewUrl && (
        <DocumentViewerModal 
          documentUrl={acceptanceLetterPreviewUrl} 
          onClose={() => setAcceptanceLetterPreviewUrl(null)} 
          fileName="acceptance_letter.pdf"
        />
      )}

      {/* Modal de justificativa para rejeição */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-[#05294E] mb-3">{t('studentDashboard.documentRequests.modals.provideJustification')}</h3>
            <p className="text-sm text-slate-600 mb-4">{t('studentDashboard.documentRequests.modals.rejectionExplanation')}</p>
            <textarea
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 min-h-[120px]"
              placeholder={t('studentDashboard.documentRequests.modals.rejectionExplanationPlaceholder')}
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-md border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                onClick={() => { setShowRejectModal(false); setPendingRejectUploadId(null); setRejectNotes(''); }}
              >
                {t('studentDashboard.documentRequests.forms.cancel')}
              </button>
              <button
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                disabled={!pendingRejectUploadId}
                onClick={async () => {
                  if (!pendingRejectUploadId) return;
                  
                  // Verificar se é transfer form ou document request
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
        </div>
      )}
    </div>
  );
};

export default DocumentRequestsCard; 