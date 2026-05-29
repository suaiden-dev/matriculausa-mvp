import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useResumableUpload } from '../hooks/useResumableUpload';
import DocumentViewerModal from './DocumentViewerModal';
import DocumentHistoryAccordion from './DocumentHistoryAccordion';
import {
  FileText,
  CheckCircle2,
  CheckCircle,
  Download,
  AlertCircle,
  Clock,
  Paperclip,
  Upload,
  ChevronDown,
  X,
  ExternalLink
} from 'lucide-react';

import { groupUploadsBySubmission, getFileName } from '../utils/documentUploadUtils';

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

}

const DocumentRequestsCard: React.FC<DocumentRequestsCardProps> = ({
  applicationId,
  isSchool,
  currentUserId,
  studentType,
  studentUserId,
  onDocumentUploaded
}) => {
  const { t } = useTranslation('dashboard');

  const { progress: uploadProgress, uploading: tusUploading, startUpload } = useResumableUpload();

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
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofUploadError, setProofUploadError] = useState<string | null>(null);
  const proofFileInputRef = React.useRef<HTMLInputElement>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [pendingRejectUploadId, setPendingRejectUploadId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingAttachmentUrls, setLoadingAttachmentUrls] = useState<{ [requestId: string]: boolean }>({});
  const [acceptanceLetterSignedUrls, setAcceptanceLetterSignedUrls] = useState<{ [key: string]: string | null }>({});
  const [viewingRejectionReason, setViewingRejectionReason] = useState<string | null>(null);
  const [stagedFiles, setStagedFiles] = useState<{ [requestId: string]: File[] }>({});
  const [submitting, setSubmitting] = useState<{ [requestId: string]: boolean }>({});
  const [stagingErrors, setStagingErrors] = useState<{ [requestId: string]: string | null }>({});

  // Função para sanitizar nome do arquivo
  const handleProofUpload = async (file: File) => {
    setUploadingProof(true);
    setProofUploadError(null);
    try {
      const sanitized = sanitizeFileName(file.name);
      const storagePath = `transfer-proof-to-school/${currentUserId}/${Date.now()}_${sanitized}`;
      const { error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(storagePath, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage
        .from('document-attachments')
        .getPublicUrl(storagePath);
      const { error: dbError } = await supabase
        .from('scholarship_applications')
        .update({
          transfer_proof_to_school_url: publicData.publicUrl,
          transfer_proof_to_school_at: new Date().toISOString(),
          transfer_proof_to_school_status: 'submitted',
        })
        .eq('id', applicationId);
      if (dbError) throw dbError;
      const { data: refreshed } = await supabase
        .from('scholarship_applications')
        .select('id, transfer_form_url, transfer_form_status, transfer_form_sent_at, transfer_proof_to_school_url, transfer_proof_to_school_at, transfer_proof_to_school_status')
        .eq('id', applicationId)
        .maybeSingle();
      if (refreshed) setTransferForm(refreshed);
    } catch (err: any) {
      setProofUploadError(err.message || 'Erro ao enviar comprovante');
    } finally {
      setUploadingProof(false);
      if (proofFileInputRef.current) proofFileInputRef.current.value = '';
    }
  };

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
        .select('id, transfer_form_url, transfer_form_status, transfer_form_sent_at, transfer_proof_to_school_url, transfer_proof_to_school_at, transfer_proof_to_school_status')
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

  // Realtime: re-fetch uploads when any upload for the current requests changes (e.g. admin approval/rejection)
  useEffect(() => {
    if (requests.length === 0) return;
    const ids = new Set(requests.map(r => r.id));
    const channel = supabase
      .channel(`doc-uploads-${applicationId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'document_request_uploads' },
        (payload) => {
          if (ids.has((payload.new as any)?.document_request_id)) {
            fetchRequests();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line
  }, [requests.length, applicationId]);

  // Realtime: re-fetch requests when document_requests are updated (e.g. admin hides/restores for student)
  useEffect(() => {
    if (!applicationId) return;
    const channel = supabase
      .channel(`doc-requests-${applicationId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'document_requests' },
        () => {
          fetchRequests();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line
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
        .select('id, scholarship_id, scholarships(university_id, level, universities(logo_url, name)), student_process_type, student_id')
        .eq('id', applicationId)
        .maybeSingle();
      if (appError || !appData) throw new Error('Failed to fetch application data');
      let universityId: any = undefined;
      let scholarshipLevel: string | undefined = undefined;
      if (Array.isArray(appData.scholarships) && appData.scholarships.length > 0) {
        universityId = appData.scholarships[0]?.university_id;
        scholarshipLevel = appData.scholarships[0]?.level;
      } else if (appData.scholarships && typeof appData.scholarships === 'object') {
        universityId = (appData.scholarships as any).university_id;
        scholarshipLevel = (appData.scholarships as any).level;
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
          .or(`university_id.eq.${universityId},university_id.is.null`)
          .order('created_at', { ascending: false });
        if (globalError) throw globalError;
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        globalRequests = (globalData || []).filter((req: any) => {
          // Ocultar para estudantes quando status estiver fechado
          if (!isSchool && (req.status || '').toLowerCase() === 'closed') return false;
          // Ocultar requests escondidos para este aluno
          if (!isSchool && currentUser?.id && req.hidden_for_students?.includes(currentUser.id)) return false;
          // Filtro por process type
          if (!req.applicable_student_types || !Array.isArray(req.applicable_student_types) || req.applicable_student_types.length === 0) return false;
          const passesStudentType = req.applicable_student_types.includes(studentType) || req.applicable_student_types.includes('all');
          if (!passesStudentType) return false;
          // Filtro por nível de bolsa
          const levels = req.applicable_scholarship_levels;
          if (!levels || !Array.isArray(levels) || levels.length === 0) return true; // retrocompatível
          if (!scholarshipLevel) return true; // sem nível definido, não bloqueia
          return levels.includes(scholarshipLevel);
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



  const handleFileSelect = (requestId: string, file: File | null, isGlobal?: boolean, inputEl?: HTMLInputElement) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert(t('studentDashboard.documentRequests.errors.onlyPdfAllowed') || 'Only PDF files are allowed.');
      return;
    }
    if (isGlobal) {
      const current = stagedFiles[requestId] || [];
      if (current.length >= 10) {
        alert('Máximo de 10 arquivos por envio.');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        alert('Arquivo muito grande. Tamanho máximo: 20 MB.');
        return;
      }
      setStagedFiles(prev => ({ ...prev, [requestId]: [...(prev[requestId] || []), file] }));
      setStagingErrors(prev => ({ ...prev, [requestId]: null }));
      // Reset o input para que o mesmo arquivo possa ser selecionado novamente
      if (inputEl) inputEl.value = '';
    } else {
      handleSendUpload(requestId, file);
    }
  };

  const handleRemoveFromStaging = (requestId: string, index: number) => {
    setStagedFiles(prev => ({
      ...prev,
      [requestId]: (prev[requestId] || []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmitStaging = async (requestId: string) => {
    const files = stagedFiles[requestId] || [];
    if (files.length === 0) return;
    setSubmitting(prev => ({ ...prev, [requestId]: true }));
    setStagingErrors(prev => ({ ...prev, [requestId]: null }));

    // Calcula isResubmission 1x via estado local (sem query ao banco por arquivo)
    const existingUploads = uploads[requestId] || [];
    const isResubmission = existingUploads.some((u: any) => u.status === 'rejected');

    const failedFiles: File[] = [];
    let successCount = 0;

    for (const file of files) {
      try {
        await handleSendUpload(requestId, file, { skipNotification: true, isResubmission });
        successCount++;
      } catch {
        failedFiles.push(file);
      }
    }

    // Notificação única para o batch inteiro (Fix 3)
    if (successCount > 0) {
      try { await notifyGlobalUploadBatch(requestId, isResubmission); } catch { /* silencia */ }
    }

    // Mantém em staging apenas os arquivos que falharam
    setStagedFiles(prev => ({ ...prev, [requestId]: failedFiles }));

    if (failedFiles.length > 0) {
      setStagingErrors(prev => ({
        ...prev,
        [requestId]: `${failedFiles.length} arquivo(s) não puderam ser enviados. Tente novamente.`
      }));
    }

    setSubmitting(prev => ({ ...prev, [requestId]: false }));
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
          .in('role', ['admin', 'post_sales']);

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
    }
  };

  // Notificação única disparada após todo o batch de global requests ser enviado
  const notifyGlobalUploadBatch = async (requestId: string, isResubmission: boolean) => {
    const { data: requestData } = await supabase
      .from('document_requests')
      .select('title, university_id, universities(name)')
      .eq('id', requestId)
      .single();
    if (!requestData?.university_id) return;

    const { data: { user } } = await supabase.auth.getUser();
    const { data: studentProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    const studentData = {
      full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || 'Usuário',
      email: user?.email || 'email@exemplo.com',
    };
    const universityName = (requestData.universities as any)?.name || 'Universidade';

    await supabase.from('university_notifications').insert({
      university_id: requestData.university_id,
      title: isResubmission ? 'Document Re-uploaded' : 'New Document Uploaded',
      message: `Student ${studentData.full_name} has ${isResubmission ? 're-uploaded' : 'uploaded'} the document "${requestData.title}".`,
      type: isResubmission ? 'document_reupload' : 'document_upload',
      link: '/school/dashboard/scholarships/global-document-requests',
      metadata: { student_name: studentData.full_name, document_title: requestData.title, is_resubmission: isResubmission },
      idempotency_key: `${requestData.university_id}:${requestId}:${Date.now()}`
    });

    await notifyAdmins(
      studentData.full_name,
      studentData.email,
      requestData.title,
      'Documento Global',
      universityName,
      null,
      isResubmission,
      studentProfile?.id || user?.id || ''
    );
  };

  const handleSendUpload = async (requestId: string, fileOverride?: File, options?: { skipNotification?: boolean; isResubmission?: boolean }) => {
    if (uploading[requestId]) return;

    console.log('[UPLOAD] 🚀 Iniciando upload de documento', { requestId });
    const file = fileOverride ?? selectedFiles[requestId];
    if (!file) {
      console.log('[UPLOAD] ⚠️ Nenhum arquivo selecionado');
      return;
    }

    setUploading(prev => ({ ...prev, [requestId]: true }));

    try {
      if (!currentUserId) throw new Error('User ID not found');
      const sanitizedName = sanitizeFileName(file.name);
      const filePath = `${currentUserId}/${Date.now()}_${sanitizedName}`;

      let file_url: string;
      try {
        file_url = await startUpload(requestId, file, filePath);
      } catch (err: any) {
        // Lança para que o chamador (handleSubmitStaging) possa rastrear quais arquivos falharam
        throw new Error((t('studentDashboard.documentRequests.messages.errorUploadingFile') || 'Erro ao enviar arquivo') + ': ' + err.message);
      }

      // Verificar se é um reenvio — usa valor pré-calculado se fornecido (evita N queries no batch)
      let isResubmission: boolean;
      if (options?.isResubmission !== undefined) {
        isResubmission = options.isResubmission;
      } else {
        const { data: existingUploads } = await supabase
          .from('document_request_uploads')
          .select('id, status')
          .eq('document_request_id', requestId)
          .eq('uploaded_by', currentUserId);
        isResubmission = existingUploads?.some(upload => upload.status === 'rejected') || false;
      }

      const { data: insertedUpload } = await supabase.from('document_request_uploads').insert({
        document_request_id: requestId,
        uploaded_by: currentUserId,
        file_url,
        status: 'under_review',
      }).select('id').single();

      // Notificar universidade e admins (skipped para global batches — notificado 1x pelo handleSubmitStaging)
      if (!options?.skipNotification) {
        try {
          const { data: requestData } = await supabase
            .from('document_requests')
            .select('title, scholarship_application_id')
            .eq('id', requestId)
            .single();

          if (requestData) {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: studentProfile } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('user_id', user?.id)
              .single();

            const studentData = {
              full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || 'Usuário',
              email: user?.email || 'email@exemplo.com'
            };
            const studentProfileId = studentProfile?.id || user?.id || '';

            if (!requestData.scholarship_application_id) {
              // Documento Global
              const { data: globalData } = await supabase
                .from('document_requests')
                .select('university_id, universities(name)')
                .eq('id', requestId)
                .single();

              if (globalData?.university_id) {
                const universityName = (globalData.universities as any)?.name || 'Universidade';

                // In-app Notification
                await supabase.from('university_notifications').insert({
                  university_id: globalData.university_id,
                  title: isResubmission ? 'Document Re-uploaded' : 'New Document Uploaded',
                  message: `Student ${studentData.full_name} has ${isResubmission ? 're-uploaded' : 'uploaded'} the document "${requestData.title}".`,
                  type: isResubmission ? 'document_reupload' : 'document_upload',
                  link: '/school/dashboard/scholarships/global-document-requests',
                  metadata: { student_name: studentData.full_name, document_title: requestData.title, is_resubmission: isResubmission },
                  idempotency_key: `${globalData.university_id}:${requestId}:${Date.now()}`
                });

                // Admin Notification
                await notifyAdmins(studentData.full_name, studentData.email, requestData.title, 'Documento Global', universityName, null, isResubmission, studentProfileId);
              }
            } else {
              // Documento de Bolsa
              const { data: applicationData } = await supabase
                .from('scholarship_applications')
                .select('id, scholarships(title, universities(id, name))')
                .eq('id', requestData.scholarship_application_id)
                .single();

              const scholarship = Array.isArray(applicationData?.scholarships) ? (applicationData?.scholarships[0] as any) : (applicationData?.scholarships as any);
              const university = Array.isArray(scholarship?.universities) ? scholarship.universities[0] : scholarship?.universities;

              if (university?.id && scholarship) {
                // In-app Notification
                await supabase.from('university_notifications').insert({
                  university_id: university.id,
                  title: isResubmission ? 'Document Re-uploaded' : 'New Document Uploaded',
                  message: `Student ${studentData.full_name} has ${isResubmission ? 're-uploaded' : 'uploaded'} the document "${requestData.title}" for scholarship "${scholarship.title}".`,
                  type: isResubmission ? 'document_reupload' : 'document_upload',
                  link: `/school/dashboard/student/${applicationData?.id}`,
                  metadata: { student_name: studentData.full_name, scholarship_title: scholarship.title, document_title: requestData.title, is_resubmission: isResubmission },
                  idempotency_key: `${university.id}:${requestId}:${Date.now()}`
                });

                // Admin Notification
                await notifyAdmins(studentData.full_name, studentData.email, requestData.title, scholarship.title, university.name, applicationData?.id || null, isResubmission, studentProfileId);
              }
            }
          }
        } catch (notifErr) {
          console.error('Erro ao processar notificações:', notifErr);
        }
      }

      // Atualização otimista
      const newUpload = {
        id: insertedUpload?.id ?? crypto.randomUUID(),
        document_request_id: requestId,
        uploaded_by: currentUserId!,
        file_url,
        uploaded_at: new Date().toISOString(),
        status: 'under_review' as const,
      };

      setUploads(prev => ({
        ...prev,
        [requestId]: [...(prev[requestId] || []), newUpload as any]
      }));
      setSelectedFiles(prev => ({ ...prev, [requestId]: null }));

      if (onDocumentUploaded) {
        await onDocumentUploaded(requestId, file.name, isResubmission);
      }
    } catch (err: any) {
      console.error('Erro fatal no upload:', err);
      setError(err.message || 'Erro ao realizar upload');
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
  const handleStudentUploadTransferForm = async (fileOverride?: File) => {
    if (uploadingTransferForm) return;
    const file = fileOverride ?? selectedTransferFormFile;
    if (!file || !applicationId) return;

    setUploadingTransferForm(true);

    try {
      if (!currentUserId) throw new Error('User ID not found');
      // Upload do arquivo
      const sanitizedName = sanitizeFileName(file.name);
      // Use user ID in path for RLS compatibility
      const filePath = `${currentUserId}/transfer-forms-filled/${Date.now()}_${sanitizedName}`;
      const uploadedPath = await startUpload('transfer-form', file, filePath);
      const data = { path: uploadedPath };

      // Verificar se há upload rejeitado (para determinar se é reenvio)
      const hasRejectedUpload = transferFormUploads.some(upload => upload.status === 'rejected');
      const isResubmission = hasRejectedUpload;

      // Manter histórico de envios anteriores (sempre fazer INSERT)

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

      // Atualizar transfer_form_status para 'returned' na aplicação
      await supabase
        .from('scholarship_applications')
        .update({ transfer_form_status: 'returned' })
        .eq('id', applicationId);

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
        await onDocumentUploaded('transfer_form', file.name, isResubmission);
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
                    <h4 className="font-bold text-slate-900 truncate whitespace-nowrap text-sm md:text-lg leading-tight">{req.title}</h4>
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
              <div className="bg-blue-50 rounded-3xl border border-blue-200 overflow-hidden shadow-sm">
                {/* Linha de download */}
                <div className="p-6 flex items-center justify-between group hover:bg-blue-100/50 transition-all">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 truncate whitespace-nowrap text-xl leading-tight">{t('studentDashboard.documentRequests.forms.transferForm')}</h4>
                      <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-1">Formulário de Transferência</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const signedUrl = acceptanceLetterSignedUrls['transfer_form_url'] || transferForm.transfer_form_url;
                      if (signedUrl) setPreviewUrl(signedUrl);
                    }}
                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2 flex-shrink-0"
                  >
                    <Download className="w-5 h-5" />
                    {t('common:labels.download')}
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-blue-200 mx-6" />

                {/* Seção de comprovante */}
                <div className="p-6">
                  {transferForm.transfer_proof_to_school_url ? (
                    /* ESTADO 3: Comprovante enviado */
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-tight">
                            {t('studentDashboard.documentRequests.forms.transferProofToSchool.submitted')}
                          </p>
                          {transferForm.transfer_proof_to_school_at && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {t('studentDashboard.documentRequests.forms.transferProofToSchool.submittedAt')}{' '}
                              {new Date(transferForm.transfer_proof_to_school_at).toLocaleDateString('pt-BR', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                      <a
                        href={transferForm.transfer_proof_to_school_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold flex-shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {t('studentDashboard.documentRequests.forms.transferProofToSchool.viewProof')}
                      </a>
                    </div>
                  ) : transferForm.transfer_proof_to_school_status === 'confirmed' ? (
                    /* ESTADO 2: Confirmou que enviou, aguardando upload do comprovante */
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-amber-600" />
                        </div>
                        <p className="text-sm font-bold text-slate-900">
                          {t('studentDashboard.documentRequests.forms.transferProofToSchool.confirmed')}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {t('studentDashboard.documentRequests.forms.transferProofToSchool.confirmedDescription')}
                      </p>
                      {proofUploadError && (
                        <p className="text-xs text-red-600">{proofUploadError}</p>
                      )}
                      <input
                        ref={proofFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleProofUpload(file);
                        }}
                        disabled={uploadingProof}
                      />
                      <button
                        onClick={() => proofFileInputRef.current?.click()}
                        disabled={uploadingProof}
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-white border-2 border-blue-300 rounded-2xl text-blue-700 hover:bg-blue-50 transition-colors text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Upload className="w-4 h-4" />
                        {uploadingProof
                          ? t('studentDashboard.documentRequests.forms.uploading')
                          : t('studentDashboard.documentRequests.forms.transferProofToSchool.uploadButton')}
                      </button>
                    </div>
                  ) : (
                    /* ESTADO 1: Pergunta se já enviou */
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm leading-tight">
                          {t('studentDashboard.documentRequests.forms.transferProofToSchool.title')}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {t('studentDashboard.documentRequests.forms.transferProofToSchool.description')}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          const { error } = await supabase
                            .from('scholarship_applications')
                            .update({ transfer_proof_to_school_status: 'confirmed' })
                            .eq('id', applicationId);
                          if (!error) {
                            setTransferForm((prev: any) => ({ ...prev, transfer_proof_to_school_status: 'confirmed' }));
                          }
                        }}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm flex-shrink-0"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {t('studentDashboard.documentRequests.forms.transferProofToSchool.confirmButton')}
                      </button>
                    </div>
                  )}
                </div>
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
                      <h4 className="font-black text-slate-900 text-lg md:text-xl uppercase tracking-tighter leading-tight truncate whitespace-nowrap">{t('studentDashboard.documentRequests.forms.transferForm')}</h4>
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
                      <div className="flex flex-col gap-1.5 sm:ml-auto w-full sm:w-auto">
                         <label className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-black uppercase tracking-widest text-[10px] hover:border-blue-600 hover:text-blue-600 cursor-pointer transition-all active:scale-95 ${uploadingTransferForm ? 'opacity-50 cursor-wait' : ''}`}>
                            <Paperclip className="w-4 h-4 shrink-0" />
                            {tusUploading['transfer-form'] ? (
                              <span>{uploadProgress['transfer-form'] ?? 0}%</span>
                            ) : uploadingTransferForm ? (
                              <span>Sending...</span>
                            ) : selectedTransferFormFile ? (
                              <span className="truncate max-w-[80px]">{selectedTransferFormFile.name}</span>
                            ) : t('studentDashboard.documentRequests.forms.attachPdf')}
                            <input
                              type="file"
                              className="sr-only"
                              accept=".pdf"
                              disabled={uploadingTransferForm}
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                if (f.type !== 'application/pdf') {
                                  alert(t('studentDashboard.documentRequests.errors.onlyPdfAllowed') || 'Only PDF files are allowed.');
                                  return;
                                }
                                handleStudentUploadTransferForm(f);
                              }}
                            />
                         </label>
                         {tusUploading['transfer-form'] && (
                           <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                             <div
                               className="h-full bg-emerald-500 transition-all duration-300"
                               style={{ width: `${uploadProgress['transfer-form'] ?? 0}%` }}
                             />
                           </div>
                         )}
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
               {/* Histórico de Envios (Transfer Form) */}
               {transferFormUploads.length > 1 && (
                 <div className="mt-6 pt-6 border-t border-slate-100">
                    <DocumentHistoryAccordion
                      uploads={transferFormUploads}
                      skipFirst={true}
                      documentLabel={t('studentDashboard.documentRequests.forms.transferForm')}
                      onViewDocument={({ file_url }) => setPreviewUrl(file_url)}
                    />
                 </div>
               )}

          {requests.map(req => {
            const allUploads = uploads[req.id] || [];
            const isGlobal = !!(req as any).is_global;

            if (isGlobal) {
              // ── GLOBAL REQUEST: staging + submit flow ──────────────────────
              const { closedGroups, currentGroup } = groupUploadsBySubmission(allUploads as any);
              const lastClosedGroup = closedGroups.length > 0 ? closedGroups[closedGroups.length - 1] : null;
              const lastClosedUpload = lastClosedGroup ? lastClosedGroup[lastClosedGroup.length - 1] : null;
              const isPending = currentGroup.length > 0;
              const isGlobalApproved = !isPending && lastClosedUpload?.status === 'approved';
              const isGlobalRejected = !isPending && lastClosedUpload?.status === 'rejected';
              const staged = stagedFiles[req.id] || [];
              const isSubmitting = submitting[req.id] || false;
              const historyGroups = isPending ? closedGroups : closedGroups.slice(0, -1);

              return (
                <div key={`upload-${req.id}`} className="bg-slate-50/50 rounded-2xl md:rounded-3xl p-5 md:p-8 border border-slate-200 group hover:border-emerald-300 transition-all hover:bg-white text-left">
                  {/* Header */}
                  <div className="flex gap-4 md:gap-5 items-center mb-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl md:rounded-2xl flex items-center justify-center border border-slate-200 flex-shrink-0 shadow-sm group-hover:border-emerald-200 group-hover:bg-emerald-50 transition-all">
                      <FileText className="w-6 h-6 md:w-8 md:h-8 text-slate-400 group-hover:text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <h4 className="font-black text-slate-900 text-lg md:text-xl uppercase tracking-tighter leading-tight truncate whitespace-nowrap" title={req.title}>{req.title}</h4>
                      <p className="text-slate-500 text-xs md:text-sm font-medium mt-1 leading-relaxed">{req.description}</p>
                    </div>
                  </div>

                  {/* Current submission files or last closed group status */}
                  {isPending ? (
                    <div className="space-y-2 mb-4">
                      {currentGroup.map((upload: any) => {
                        const uploadStatus = normalizeStatus(upload.status);
                        const isUploadApproved = uploadStatus === 'approved';
                        const isUploadRejected = uploadStatus === 'rejected';

                        return (
                          <div
                            key={upload.id}
                            className={`flex items-center justify-between px-4 py-3 border rounded-xl transition-all ${
                              isUploadApproved ? 'bg-emerald-50 border-emerald-100' :
                              isUploadRejected ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isUploadApproved ? 'bg-emerald-500' :
                                isUploadRejected ? 'bg-red-500' : 'bg-blue-500'
                              }`}>
                                {isUploadApproved ? <CheckCircle2 className="w-4 h-4 text-white" /> :
                                 isUploadRejected ? <AlertCircle className="w-4 h-4 text-white" /> :
                                 <Clock className="w-4 h-4 text-white" />}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-slate-800 truncate">{getFileName(upload.file_url)}</p>
                                <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${
                                  isUploadApproved ? 'text-emerald-600' :
                                  isUploadRejected ? 'text-red-600' : 'text-blue-600'
                                }`}>
                                  {isUploadApproved ? 'Aprovado' :
                                   isUploadRejected ? 'Correção Solicitada' : 'Em Análise'}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setPreviewUrl(upload.file_url)}
                              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#05294E] text-white hover:bg-[#041f38] transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Ver
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : isGlobalApproved && lastClosedUpload ? (
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border shadow-sm bg-emerald-50 border-emerald-200 mb-4 self-start">
                      <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">Status</p>
                        <p className="font-bold text-sm text-emerald-700">Aprovado</p>
                      </div>
                    </div>
                  ) : isGlobalRejected && lastClosedUpload ? (
                    <>
                      <div className="hidden md:flex mb-4 p-5 bg-red-50 rounded-[1.5rem] border border-red-100 gap-3 items-start">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black uppercase tracking-widest text-[9px] text-red-600 mb-1">{t('studentDashboard.documentRequests.modals.rejectionAttention')}</p>
                          <div className="max-h-32 overflow-y-auto pr-2">
                            <p className="text-red-900 font-medium text-sm leading-relaxed break-words">
                              {lastClosedUpload.rejection_reason || t('studentDashboard.documentRequests.modals.pleaseReviewRejection')}
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setViewingRejectionReason(lastClosedUpload.rejection_reason || t('studentDashboard.documentRequests.modals.pleaseReviewRejection'))}
                        className="flex md:hidden mb-4 w-full p-4 bg-red-50 rounded-xl border border-red-100 items-center justify-between active:scale-[0.98] transition-all text-left"
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
                    </>
                  ) : null}

                  {/* Staging area — hidden when approved or school view */}
                  {!isSchool && !isGlobalApproved && (
                    <div className="border border-dashed border-slate-300 rounded-2xl p-4 bg-white">
                      {staged.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {staged.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <span className="text-sm text-slate-700 font-medium truncate">{file.name}</span>
                              </div>
                              <button
                                onClick={() => handleRemoveFromStaging(req.id, idx)}
                                className="flex-shrink-0 p-1 text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-2">
                        <label className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all active:scale-95 ${isSubmitting ? 'opacity-50 cursor-not-allowed border-slate-200' : 'border-slate-200 hover:border-emerald-600 hover:text-emerald-600 cursor-pointer'}`}>
                          <Paperclip className="w-4 h-4 shrink-0" />
                          Adicionar mais um documento
                          <input
                            type="file"
                            className="sr-only"
                            accept=".pdf"
                            disabled={isSubmitting}
                            onChange={e => handleFileSelect(req.id, e.target.files ? e.target.files[0] : null, true, e.target)}
                          />
                        </label>

                        {staged.length > 0 && (
                          <button
                            onClick={() => handleSubmitStaging(req.id)}
                            disabled={isSubmitting}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all active:scale-95"
                          >
                            {isSubmitting ? (
                              <>Enviando...</>
                            ) : (
                              <>Enviar {staged.length} arquivo{staged.length > 1 ? 's' : ''} para revisão →</>
                            )}
                          </button>
                        )}
                      </div>

                      {staged.length === 0 && !isPending && !isGlobalApproved && (
                        <p className="text-xs text-slate-400 mt-2 text-center">
                          Adicione os arquivos e clique em "Enviar para revisão"
                        </p>
                      )}

                      {stagingErrors[req.id] && (
                        <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <p className="text-xs font-semibold text-red-700">{stagingErrors[req.id]}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Grouped history */}
                  {historyGroups.length > 0 && (
                    <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
                      <details className="group/hist">
                        <summary className="flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors text-sm font-medium text-slate-600 list-none">
                          <span>
                            Histórico de envios
                            <span className="text-slate-800 font-semibold"> — {req.title}</span>
                            <span className="ml-1 text-slate-400">({historyGroups.length} tentativa{historyGroups.length > 1 ? 's' : ''} anterior{historyGroups.length > 1 ? 'es' : ''})</span>
                          </span>
                          <ChevronDown className="w-4 h-4 group-open/hist:rotate-180 transition-transform" />
                        </summary>
                        <ul className="divide-y divide-slate-100">
                          {[...historyGroups].reverse().map((group: any[], groupIdx: number) => {
                            const groupNumber = historyGroups.length - groupIdx;
                            const lastUpload = group[group.length - 1];
                            const isGroupRejected = lastUpload.status === 'rejected';
                            const isGroupApproved = lastUpload.status === 'approved';
                            return (
                              <li key={groupIdx} className="px-4 py-3 bg-white">
                                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400 font-medium">Tentativa #{groupNumber}</span>
                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${isGroupApproved ? 'bg-green-100 text-green-700 border-green-200' : isGroupRejected ? 'bg-red-100 text-red-700 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                                      {isGroupApproved ? <CheckCircle className="w-3 h-3" /> : isGroupRejected ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                      {isGroupApproved ? 'Aprovado' : isGroupRejected ? 'Rejeitado' : 'Em revisão'}
                                    </span>
                                    <span className="text-xs text-slate-400">{group.length} arquivo{group.length > 1 ? 's' : ''}</span>
                                  </div>
                                </div>
                                {lastUpload.rejection_reason && (
                                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 mb-2">
                                    <span className="font-semibold">Motivo: </span>{lastUpload.rejection_reason}
                                  </p>
                                )}
                                <div className="space-y-1">
                                  {group.map((upload: any) => (
                                    <div key={upload.id} className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded border border-slate-100">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                        <span className="text-xs text-slate-600 truncate">{getFileName(upload.file_url)}</span>
                                      </div>
                                      {upload.file_url && (
                                        <button
                                          onClick={() => setPreviewUrl(upload.file_url)}
                                          className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-[#05294E] text-white hover:bg-[#041f38] transition-colors"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                          Ver
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    </div>
                  )}
                </div>
              );
            }

            // ── NON-GLOBAL REQUEST: existing behavior ──────────────────────
            const latestUpload = allUploads.slice().sort((a, b) =>
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
                        <h4 className="font-black text-slate-900 text-lg md:text-xl uppercase tracking-tighter leading-tight truncate whitespace-nowrap" title={req.title}>{req.title}</h4>
                        <p className="text-slate-500 text-xs md:text-sm font-medium mt-1 leading-relaxed">{req.description}</p>
                     </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
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

                     {!isSchool && !isApproved && (
                        <div className="flex flex-col gap-1.5 sm:ml-auto w-full sm:w-auto">
                           <label className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all active:scale-95 ${uploading[req.id] ? 'border-emerald-300 text-emerald-600 cursor-wait opacity-70' : 'border-slate-200 hover:border-emerald-600 hover:text-emerald-600 cursor-pointer'}`}>
                              <Paperclip className="w-4 h-4 shrink-0" />
                              {tusUploading[req.id] ? (
                                <span className="truncate max-w-[80px]">{uploadProgress[req.id] ?? 0}%</span>
                              ) : uploading[req.id] ? (
                                <span className="truncate max-w-[80px]">{t('studentDashboard.documentRequests.forms.sendingButton')}</span>
                              ) : t('studentDashboard.documentRequests.forms.attachPdf')}
                              <input
                                 type="file"
                                 className="sr-only"
                                 accept=".pdf"
                                 disabled={uploading[req.id]}
                                 onChange={e => handleFileSelect(req.id, e.target.files ? e.target.files[0] : null)}
                              />
                           </label>
                           {tusUploading[req.id] && (
                             <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                               <div
                                 className="h-full bg-emerald-500 transition-all duration-300"
                                 style={{ width: `${uploadProgress[req.id] ?? 0}%` }}
                               />
                             </div>
                           )}
                        </div>
                     )}
                  </div>
                </div>

                 {isRejected && latestUpload && (
                   <div className="w-full">
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

              {allUploads.length > 1 && (
                <div className="px-0 pb-2">
                  <DocumentHistoryAccordion
                    uploads={allUploads as any}
                    skipFirst
                    documentLabel={req.title}
                    onViewDocument={({ file_url }) => setPreviewUrl(file_url)}
                  />
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
