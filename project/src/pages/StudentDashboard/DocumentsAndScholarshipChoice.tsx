import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCartStore } from '../../stores/applicationStore';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { 
  Upload, 
  CheckCircle, 
  User, 
  GraduationCap, 
  DollarSign,
  Clock,
  Shield,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  Bot,
  Plus,
  X,
  FileText
} from 'lucide-react';
import './DocumentsAndScholarshipChoice.css';

const DocumentsAndScholarshipChoice: React.FC = () => {
  const { t } = useTranslation();
  const { userProfile, user } = useAuth();
  const { fetchCart, clearCart } = useCartStore();
  const [processType, setProcessType] = useState<string | null>(window.localStorage.getItem('studentProcessType'));
  const [studentType, setStudentType] = useState<string | null>(null);
  const [isSavingType, setIsSavingType] = useState(false);
  
  // Estados para upload de documentos
  const [files, setFiles] = useState<Record<string, File | File[] | null>>({ 
    passport: null, 
    diploma: null, 
    funds_proof: [] 
  });
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [mergingPdfs, setMergingPdfs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showManualReviewMessage, setShowManualReviewMessage] = useState(false);
  const [showHelpSection, setShowHelpSection] = useState(false);

  
  const navigate = useNavigate();

  // Documentos obrigatórios - mantendo exatamente os mesmos documentos
  const DOCUMENT_TYPES = [
    { key: 'passport', label: t('studentDashboard.documentsAndScholarshipChoice.passport'), icon: User, description: t('studentDashboard.documentsAndScholarshipChoice.passportDescription') },
    { key: 'diploma', label: t('studentDashboard.documentsAndScholarshipChoice.diploma'), icon: GraduationCap, description: t('studentDashboard.documentsAndScholarshipChoice.diplomaDescription') },
    { key: 'funds_proof', label: t('studentDashboard.documentsAndScholarshipChoice.fundsProof'), icon: DollarSign, description: t('studentDashboard.documentsAndScholarshipChoice.fundsProofDescription') },
  ];

  // Carregar cart quando componente monta
  useEffect(() => {
    if (userProfile?.user_id) {
      fetchCart(userProfile.user_id);
    }
  }, [userProfile?.user_id, fetchCart]);

  // Carregar processType do localStorage quando componente montar
  useEffect(() => {
    const savedProcessType = window.localStorage.getItem('studentProcessType');
    if (savedProcessType) {
      console.log('Loading processType from localStorage:', savedProcessType);
      setProcessType(savedProcessType);
      // Se já tem processType, documentos serão mostrados automaticamente
    }
  }, []);


  // Função para sanitizar nome do arquivo
  const sanitizeFileName = (fileName: string): string => {
    return fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  // Função para obter limite de documentos baseado no tipo de processo
  const getDocumentLimit = (): number => {
    const currentProcessType = processType || localStorage.getItem('studentProcessType');
    switch (currentProcessType) {
      case 'change_of_status':
        return 5;
      case 'transfer':
        return 10;
      case 'initial':
      default:
        return 5;
    }
  };

  // Função para validar tamanho de arquivo
  const validateFileSize = (file: File): boolean => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    return file.size <= maxSize;
  };

  // Função para validar tamanho total dos arquivos (limite 10MB)
  const validateTotalSize = (filesList: File[]): boolean => {
    const totalSize = filesList.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = 10 * 1024 * 1024; // 10MB
    return totalSize <= maxTotalSize;
  };

  // Função para fazer merge dos PDFs via Supabase Function
  const mergeFundsDocuments = async (filePaths: string[]): Promise<string> => {
    setMergingPdfs(true);
    try {
      const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 
                                    'https://fitpynguasqqutuhzifx.supabase.co/functions/v1';
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      const mergeResponse = await fetch(`${SUPABASE_FUNCTIONS_URL}/merge-funds-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          user_id: user?.id,
          file_paths: filePaths
        }),
      });
      
      if (!mergeResponse.ok) {
        throw new Error(`Merge request failed: ${mergeResponse.status} ${mergeResponse.statusText}`);
      }
      
      const mergeResult = await mergeResponse.json();
      
      if (!mergeResult.success) {
        throw new Error(mergeResult.error || 'Failed to merge documents');
      }
      
      console.log('✅ Documents merged successfully:', mergeResult.merged_file_path);
      return mergeResult.merged_file_path;
      
    } catch (error) {
      console.error('Error merging PDFs:', error);
      throw new Error('Failed to merge PDF documents');
    } finally {
      setMergingPdfs(false);
    }
  };

  // Função para lidar com mudança de arquivo
  const handleFileChange = (type: string, file: File | null) => {
    if (type === 'funds_proof') {
      // Para funds_proof, não usar esta função - usar handleFundsFileAdd
      return;
    }
    setFiles((prev) => ({ ...prev, [type]: file }));
    setFieldErrors(prev => ({ ...prev, [type]: '' }));
  };

  // Função para adicionar arquivo de fundos
  const handleFundsFileAdd = (newFiles: File[]) => {
    const currentFundsFiles = Array.isArray(files.funds_proof) ? files.funds_proof : [];
    const documentLimit = getDocumentLimit();
    
    // Validar se não excede o limite
    if (currentFundsFiles.length + newFiles.length > documentLimit) {
      setFieldErrors(prev => ({ 
        ...prev, 
        funds_proof: t('studentDashboard.documentsAndScholarshipChoice.documentLimitExceeded', { limit: documentLimit })
      }));
      return;
    }

    // Validar tamanho individual dos arquivos
    const invalidSizeFiles = newFiles.filter(file => !validateFileSize(file));
    if (invalidSizeFiles.length > 0) {
      setFieldErrors(prev => ({ 
        ...prev, 
        funds_proof: t('studentDashboard.documentsAndScholarshipChoice.fileSizeExceeded', { fileName: invalidSizeFiles[0].name })
      }));
      return;
    }

    // Validar se são PDFs
    const nonPdfFiles = newFiles.filter(file => file.type !== 'application/pdf');
    if (nonPdfFiles.length > 0) {
      setFieldErrors(prev => ({ 
        ...prev, 
        funds_proof: t('studentDashboard.documentsAndScholarshipChoice.onlyPdfAllowed')
      }));
      return;
    }

    const updatedFiles = [...currentFundsFiles, ...newFiles];
    
    // Validar tamanho total
    if (!validateTotalSize(updatedFiles)) {
      setFieldErrors(prev => ({ 
        ...prev, 
        funds_proof: t('studentDashboard.documentsAndScholarshipChoice.totalSizeExceeded')
      }));
      return;
    }

    setFiles((prev) => ({ ...prev, funds_proof: updatedFiles }));
    setFieldErrors(prev => ({ ...prev, funds_proof: '' }));
  };

  // Função para remover arquivo de fundos
  const handleFundsFileRemove = (index: number) => {
    const currentFundsFiles = Array.isArray(files.funds_proof) ? files.funds_proof : [];
    const updatedFiles = currentFundsFiles.filter((_, i) => i !== index);
    setFiles((prev) => ({ ...prev, funds_proof: updatedFiles }));
    setFieldErrors(prev => ({ ...prev, funds_proof: '' }));
  };

  // Função de upload de documentos (baseada no DocumentUpload.tsx)
  const handleUpload = async () => {
    setUploading(true);
    setError(null);
    setFieldErrors({}); // Limpar erros anteriores
    try {
      if (!user) throw new Error('User not authenticated');
      
      const uploadedDocs: { name: string; url: string; type: string; uploaded_at: string; status: string }[] = [];
      const docUrls: Record<string, string> = {};
      
      for (const doc of DOCUMENT_TYPES) {
        let fileToUpload: File | null = null;
        
        if (doc.key === 'funds_proof') {
          // Tratar múltiplos arquivos de fundos
          const fundsFiles = Array.isArray(files.funds_proof) ? files.funds_proof : [];
          if (fundsFiles.length === 0) {
            throw new Error(`Missing file for ${doc.label}`);
          } else if (fundsFiles.length === 1) {
            // Apenas um arquivo, upload direto
            fileToUpload = fundsFiles[0];
            const sanitizedFileName = sanitizeFileName(fileToUpload.name);
            const { data: storageData, error: storageError } = await supabase.storage
              .from('student-documents')
              .upload(`${user.id}/${doc.key}-${Date.now()}-${sanitizedFileName}`, fileToUpload, { upsert: true });
            
            if (storageError) throw storageError;
            if (!storageData?.path) throw new Error('Failed to get storage path');
            
            docUrls[doc.key] = storageData.path;
          } else {
            // Múltiplos arquivos, fazer upload individual e depois merge
            const uploadedPaths: string[] = [];
            
            for (let i = 0; i < fundsFiles.length; i++) {
              const file = fundsFiles[i];
              const sanitizedFileName = sanitizeFileName(file.name);
              const { data: storageData, error: storageError } = await supabase.storage
                .from('student-documents')
                .upload(`${user.id}/temp_funds_${i}_${Date.now()}_${sanitizedFileName}`, file, { upsert: true });
              
              if (storageError) throw storageError;
              if (!storageData?.path) throw new Error('Failed to get storage path');
              
              uploadedPaths.push(storageData.path);
            }
            
            // Fazer merge via Supabase Function
            try {
              const mergedFilePath = await mergeFundsDocuments(uploadedPaths);
              docUrls[doc.key] = mergedFilePath;
            } catch (mergeError) {
              throw new Error(`Failed to merge funds documents: ${mergeError}`);
            }
          }
        } else {
          // Documentos únicos (passport, diploma)
          const file = files[doc.key] as File | null;
          if (!file) throw new Error(`Missing file for ${doc.label}`);
          fileToUpload = file;
          
          const sanitizedFileName = sanitizeFileName(fileToUpload.name);
          const { data: storageData, error: storageError } = await supabase.storage
            .from('student-documents')
            .upload(`${user.id}/${doc.key}-${Date.now()}-${sanitizedFileName}`, fileToUpload, { upsert: true });
          
          if (storageError) throw storageError;
          if (!storageData?.path) throw new Error('Failed to get storage path');
          
          docUrls[doc.key] = storageData.path;
        }
        
        // Inserir registro no banco para todos os tipos de documento
        const { error: insertError } = await supabase.from('student_documents').insert({
          user_id: user.id,
          type: doc.key,
          file_url: docUrls[doc.key], // Usar o caminho final (merged ou original)
          status: 'pending',
        });
        
        if (insertError) throw insertError;
        
        uploadedDocs.push({ 
          name: doc.key === 'funds_proof' ? 
            (Array.isArray(files.funds_proof) && files.funds_proof.length > 1 ? 
              `funds_proof_merged.pdf` : 
              (files.funds_proof as File[])[0]?.name) :
            (fileToUpload as File)?.name,
          url: docUrls[doc.key],
          type: doc.key, 
          uploaded_at: new Date().toISOString(),
          status: 'pending'
        });
      }

      // Enviar para análise
      setUploading(false);
      setAnalyzing(true);
      
      const webhookBody = {
        user_id: user.id,
        student_name: userProfile?.full_name || (user as any)?.user_metadata?.full_name || 
                     (user as any)?.user_metadata?.name || user.email || '',
        passport_url: supabase.storage.from('student-documents').getPublicUrl(docUrls['passport']).data.publicUrl,
        diploma_url: supabase.storage.from('student-documents').getPublicUrl(docUrls['diploma']).data.publicUrl,
        funds_proof_url: supabase.storage.from('student-documents').getPublicUrl(docUrls['funds_proof']).data.publicUrl,
      };
      
      const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 
                                    'https://fitpynguasqqutuhzifx.supabase.co/functions/v1';
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      const webhookResponse = await fetch(`${SUPABASE_FUNCTIONS_URL}/analyze-student-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(webhookBody),
      });
      
      if (!webhookResponse.ok) {
        throw new Error(`Webhook request failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
      }
      
      const webhookResult = await webhookResponse.json();
      
      // Processar resposta da análise
      let n8nData = null;
      if (webhookResult.n8nResponse) {
        try {
          n8nData = JSON.parse(webhookResult.n8nResponse);
        } catch (e) {
          n8nData = webhookResult.n8nResponse;
        }
      }
      
      if (!n8nData && webhookResult.response_passaport !== undefined) {
        n8nData = webhookResult;
      }

      console.log('🔍 [DEBUG] n8nData received:', n8nData);
      
      if (n8nData) {
        const respPassport = n8nData[0].response_passaport;
        const respFunds = n8nData[0].response_funds;
        const respDegree = n8nData[0].response_degree;

        const passportOk = respPassport === true;
        const fundsOk = respFunds === true;
        const degreeOk = respDegree === true;

        console.log('🔍 [DEBUG] n8nData[0]:', n8nData[0]);
        console.log('🔍 [DEBUG] respPassport:', respPassport, 'passportOk:', passportOk);
        console.log('🔍 [DEBUG] respFunds:', respFunds, 'fundsOk:', fundsOk);
        console.log('🔍 [DEBUG] respDegree:', respDegree, 'degreeOk:', degreeOk);
        
        const passportErr = typeof respPassport === 'string' ? getFormattedErrorMessage(respPassport, 'passport') : 
                           (passportOk ? '' : getFormattedErrorMessage(n8nData[0].details_passport || 'Invalid document.', 'passport'));
        const fundsErr = typeof respFunds === 'string' ? getFormattedErrorMessage(respFunds, 'funds_proof') : 
                        (fundsOk ? '' : getFormattedErrorMessage(n8nData[0].details_funds || 'Invalid document.', 'funds_proof'));
        const degreeErr = typeof respDegree === 'string' ? getFormattedErrorMessage(respDegree, 'diploma') : 
                         (degreeOk ? '' : getFormattedErrorMessage(n8nData[0].details_degree || 'Invalid document.', 'diploma'));
        
        console.log('🔍 [DEBUG] Final errors:', { passportErr, fundsErr, degreeErr });

        const allValid = passportOk && fundsOk && degreeOk;
        
        if (allValid) {
          // Documentos aprovados - continuar processo completo
          await supabase
            .from('user_profiles')
            .update({
              documents: uploadedDocs,
              documents_uploaded: true,
              documents_status: 'approved',
            })
            .eq('user_id', user.id);

          // Log the document approval and application creation
          try {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('user_id', user.id)
              .single();
            
            if (profile) {
              await supabase.rpc('log_student_action', {
                p_student_id: profile.id,
                p_action_type: 'document_approval',
                p_action_description: `Documents approved automatically by AI - proceeding to scholarship applications`,
                p_performed_by: user.id,
                p_performed_by_type: 'student',
                p_metadata: {
                  document_types: ['passport', 'diploma', 'funds_proof'],
                  approval_method: 'ai_automatic',
                  process_type: processType
                }
              });
            }
          } catch (logError) {
            console.error('Failed to log document approval:', logError);
          }

          // Processar aplicações, limpar carrinho E notificar universidade
          await processApplicationsAndClearCart(docUrls, true);
          
          // Limpar dados de manual review do localStorage
          clearManualReviewData();
          
          setAnalyzing(false);
          setFieldErrors({});
          navigate('/student/dashboard/application-fee');
        } else {
          // Documentos com erro - apenas salvar no perfil para revisão manual
          // NÃO criar aplicações na universidade ainda
          // NÃO processar carrinho ainda
          await supabase
            .from('user_profiles')
            .update({
              documents: uploadedDocs,
              documents_uploaded: true,
              documents_status: 'under_review',
            })
            .eq('user_id', user.id);

          // Log the document rejection and manual review requirement
          try {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('user_id', user.id)
              .single();
            
            if (profile) {
              await supabase.rpc('log_student_action', {
                p_student_id: profile.id,
                p_action_type: 'document_rejection',
                p_action_description: `Documents rejected by AI - requires manual review`,
                p_performed_by: user.id,
                p_performed_by_type: 'student',
                p_metadata: {
                  document_types: ['passport', 'diploma', 'funds_proof'],
                  rejection_reason: 'ai_analysis_failed',
                  errors: {
                    passport: passportErr,
                    diploma: degreeErr,
                    funds_proof: fundsErr
                  },
                  process_type: processType
                }
              });
            }
          } catch (logError) {
            console.error('Failed to log document rejection:', logError);
          }

          // Processar aplicações sem notificar universidade
          await processApplicationsAndClearCart(docUrls, false);
          
          // Limpar dados de manual review do localStorage
          clearManualReviewData();
          
          setAnalyzing(false);
          setError(null);
          setFieldErrors({});
          setShowManualReviewMessage(true);
        }
      } else {
        // Resposta inesperada ou erro no n8n - tratar como erro e ir para manual review
        console.error('Unexpected n8n response:', webhookResult);
        
        // Salvar documentos para revisão manual
        await supabase
          .from('user_profiles')
          .update({
            documents: uploadedDocs,
            documents_uploaded: true,
            documents_status: 'under_review',
          })
          .eq('user_id', user.id);

        // Processar aplicações sem notificar universidade
        await processApplicationsAndClearCart(docUrls, false);
        
        // Limpar dados de manual review do localStorage
        clearManualReviewData();
        
        setAnalyzing(false);
        setError(null);
        setFieldErrors({});
        setShowManualReviewMessage(true);
      }
    } catch (e: any) {
      console.error('Upload error:', e);
      setUploading(false);
      setAnalyzing(false);
      setError(e.message || 'Upload failed.');
    }
  };



  // Função auxiliar para processar aplicações e limpar carrinho (com opção de notificar universidade)
  const processApplicationsAndClearCart = async (docUrls: Record<string, string>, notifyUniversity: boolean = false) => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, selected_scholarship_id')
        .eq('user_id', user.id)
        .single();
      
      const scholarshipIds: string[] = [];
      
      // Buscar bolsas do carrinho
      const { data: cartRows } = await supabase
        .from('user_cart')
        .select('scholarship_id')
        .eq('user_id', user.id);
      
      if (Array.isArray(cartRows)) {
        for (const row of cartRows) {
          if (row?.scholarship_id && !scholarshipIds.includes(row.scholarship_id)) {
            scholarshipIds.push(row.scholarship_id);
          }
        }
      }
      
      if (scholarshipIds.length === 0 && profile?.selected_scholarship_id) {
        scholarshipIds.push(profile.selected_scholarship_id);
      }

      if (profile?.id && scholarshipIds.length > 0) {
        for (const scholarshipId of scholarshipIds) {
          // Validar se a bolsa de $3800 está bloqueada antes de criar aplicação
          const { data: scholarship } = await supabase
            .from('scholarships')
            .select('id, annual_value_with_scholarship')
            .eq('id', scholarshipId)
            .single();
          
          if (scholarship) {
            const { is3800ScholarshipBlocked } = await import('../../utils/scholarshipDeadlineValidation');
            if (is3800ScholarshipBlocked(scholarship as any)) {
              console.warn('Cannot create application for expired $3800 scholarship:', scholarshipId);
              // Mostrar erro ao usuário (t já está disponível no escopo do componente)
              alert(t('alerts.scholarshipDeadlineExpired'));
              continue; // Pular esta bolsa e continuar com as outras
            }
          }
          
          const { data: existingApp } = await supabase
            .from('scholarship_applications')
            .select('id')
            .eq('student_id', profile.id)
            .eq('scholarship_id', scholarshipId)
            .maybeSingle();
          
          let applicationId: string | null = existingApp?.id || null;
          
          if (!applicationId) {
            const { data: newApp } = await supabase
              .from('scholarship_applications')
              .insert({ 
                student_id: profile.id, 
                scholarship_id: scholarshipId, 
                status: 'pending',
                student_process_type: localStorage.getItem('studentProcessType') || null
              })
              .select('id')
              .single();
            applicationId = newApp?.id || null;
            
            // Log the scholarship application creation
            if (applicationId) {
              try {
                await supabase.rpc('log_student_action', {
                  p_student_id: profile.id,
                  p_action_type: 'scholarship_application_created',
                  p_action_description: `Scholarship application created for scholarship ID: ${scholarshipId}`,
                  p_performed_by: user.id,
                  p_performed_by_type: 'student',
                  p_metadata: {
                    application_id: applicationId,
                    scholarship_id: scholarshipId,
                    process_type: localStorage.getItem('studentProcessType') || null,
                    application_method: 'ai_approved_documents'
                  }
                });
              } catch (logError) {
                console.error('Failed to log application creation:', logError);
              }
            }
          }
          
          if (applicationId) {
            const finalDocs = [
              { type: 'passport', url: docUrls['passport'] },
              { type: 'diploma', url: docUrls['diploma'] },
              { type: 'funds_proof', url: docUrls['funds_proof'] },
            ].filter(d => d.url).map(d => ({ 
              ...d, 
              uploaded_at: new Date().toISOString(), 
              status: 'under_review' 
            }));
            
            await supabase
              .from('scholarship_applications')
              .update({ documents: finalDocs })
              .eq('id', applicationId);
          }
        }
      }

      // Limpar carrinho
      const { error: cartError } = await supabase
        .from('user_cart')
        .delete()
        .eq('user_id', user.id);
      
      if (!cartError) {
        clearCart(user.id);
      }

      // Só notificar universidade se solicitado explicitamente
      if (notifyUniversity) {
        const { data: { session } } = await supabase.auth.getSession();
        const notifyPayload = { 
          user_id: user.id, 
          tipos_documentos: ['manual_review'], 
          scholarship_ids: scholarshipIds 
        };
        
        await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/notify-university-document-upload`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${session?.access_token || ''}` 
          },
          body: JSON.stringify(notifyPayload),
        });
      }
    } catch (error) {
      console.error('Error processing applications:', error);
    }
  };

  // Função para salvar o tipo de estudante na aplicação do usuário
  const saveStudentType = async (type: string) => {
    setIsSavingType(true);
    try {
      // Buscar a aplicação ativa do usuário
      const { data: applications, error } = await supabase
        .from('scholarship_applications')
        .select('id')
        .eq('student_id', userProfile?.id)
        .order('applied_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Error fetching applications:', error);
      } else if (applications && applications.length > 0) {
        const application = applications[0];
        const { error: updateError } = await supabase
          .from('scholarship_applications')
          .update({ student_process_type: type })
          .eq('id', application.id);
        
        if (updateError) {
          console.error('Error updating student_process_type:', updateError);
        } else {
          console.log('student_process_type saved successfully:', type);
        }
      }
      
      setProcessType(type);
      window.localStorage.setItem('studentProcessType', type);
      
    } catch (e) {
      console.error('Error in saveStudentType:', e);
      alert(t('alerts.failedToSaveStudentType'));
    } finally {
      setIsSavingType(false);
    }
  };

  // Função para limpar localStorage quando documents são aprovados
  const clearManualReviewData = () => {
    localStorage.removeItem('documentAnalysisErrors');
    localStorage.removeItem('documentUploadedDocs');
    console.log('Manual review data cleared from localStorage');
  };

  // Verificar se todos os arquivos foram selecionados
  const allFilesSelected = DOCUMENT_TYPES.every((doc) => {
    if (doc.key === 'funds_proof') {
      const fundsFiles = Array.isArray(files.funds_proof) ? files.funds_proof : [];
      return fundsFiles.length > 0;
    }
    return files[doc.key] !== null;
  });

  // Função para detectar se o erro é sobre documentos não estarem em inglês
  const isLanguageError = (errorMessage: string): boolean => {
    const languageErrorKeywords = [
      'not in english',
      'not in english.',
      'document is not in english',
      'document is not in english.',
      'not in english language',
      'not in english language.',
      'language is not english',
      'language is not english.',
      'not written in english',
      'not written in english.',
      'not in the english language',
      'not in the english language.',
      'the document is not in english',
      'the document is not in english.',
      'this document is not in english',
      'this document is not in english.',
      'provide an english version',
      'english version or certified translation',
      'please provide an english version',
      'please provide an english version or certified translation',
      'all documents must be in english',
      'document must be in english'
    ];
    
    return languageErrorKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  // Função para detectar se o erro é sobre acesso a dados do documento
  const isAccessError = (errorMessage: string): boolean => {
    const accessErrorKeywords = [
      'unable to access',
      'unable to access diploma data',
      'unable to access passport data',
      'unable to access funds data',
      'cannot access',
      'cannot access diploma data',
      'cannot access passport data',
      'cannot access funds data',
      'access denied',
      'failed to access',
      'failed to access diploma data',
      'failed to access passport data',
      'failed to access funds data'
    ];
    
    return accessErrorKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  // Função para detectar se o erro é sobre dados de fundos não disponíveis
  const isFundsDataError = (errorMessage: string): boolean => {
    const fundsDataErrorKeywords = [
      'dados de extrato não disponíveis',
      'funds statement data not available',
      'los datos del extracto bancario no están disponibles',
      'extrato não disponível',
      'extract not available',
      'extracto no disponible',
      'dados de fundos não disponíveis',
      'fund data not available',
      'datos de fondos no disponibles'
    ];
    
    return fundsDataErrorKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  // Função para detectar se o erro é sobre campo 'moeda' não encontrado
  const isCurrencyFieldError = (errorMessage: string): boolean => {
    const currencyFieldErrorKeywords = [
      'campo \'moeda\' não foi encontrado',
      'field \'moeda\' not found',
      'campo \'currency\' not found',
      'field \'currency\' not found',
      'moeda não foi encontrado',
      'currency not found',
      'moeda não encontrado',
      'currency field not found',
      'campo moeda não encontrado',
      'currency field missing',
      'moeda field missing',
      'campo de moeda não encontrado',
      'currency field not available',
      'moeda field not available'
    ];
    
    return currencyFieldErrorKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  };



  // Função para obter mensagem de erro formatada
  const getFormattedErrorMessage = (errorMessage: string, documentType: string): string => {
    console.log('🔍 [DEBUG] getFormattedErrorMessage called with:', { errorMessage, documentType, currentLanguage: t('common.language') });
    if (isLanguageError(errorMessage)) {
      // Usar tradução para mensagens de erro de idioma
      return t('studentDashboard.documentsAndScholarshipChoice.languageError', { 
        documentType: t(`studentDashboard.documentsAndScholarshipChoice.${documentType}`) 
      });
    }
    
    if (isAccessError(errorMessage)) {
      return t('studentDashboard.documentsAndScholarshipChoice.accessError', { 
        documentType: t(`studentDashboard.documentsAndScholarshipChoice.${documentType}`) 
      });
    }
    
    if (isFundsDataError(errorMessage)) {
      return t('studentDashboard.documentsAndScholarshipChoice.fundsDataError', { 
        documentType: t(`studentDashboard.documentsAndScholarshipChoice.${documentType}`) 
      });
    }
    
    if (isCurrencyFieldError(errorMessage)) {
      return t('studentDashboard.documentsAndScholarshipChoice.currencyFieldError', { 
        documentType: t(`studentDashboard.documentsAndScholarshipChoice.${documentType}`) 
      });
    }
    
    // Detectar mensagens específicas da API e traduzi-las
    if (errorMessage.includes('passport document format is not recognized') || 
        errorMessage.includes('format is not recognized') ||
        errorMessage.includes('passport document format') ||
        errorMessage.includes('format is not recognized')) {
      return t('studentDashboard.documentsAndScholarshipChoice.passportFormatError');
    }
    
    // Detectar mensagens específicas sobre MRZ do passaporte
    if (errorMessage.includes('passport document is not readable') || 
        errorMessage.includes('machine-readable zone') ||
        errorMessage.includes('MRZ') ||
        errorMessage.includes('not damaged or obscured') ||
        errorMessage.includes('passaporte não é legível') ||
        errorMessage.includes('zona de leitura mecânica') ||
        errorMessage.includes('pasaporte no es legible') ||
        errorMessage.includes('zona de lectura mecánica')) {
      return t('studentDashboard.documentsAndScholarshipChoice.passportMRZError');
    }
    
    // Detectar mensagens específicas sobre extrato bancário
    if (errorMessage.includes('bank statement is not readable') ||
        errorMessage.includes('extrato bancário não é legível') ||
        errorMessage.includes('estado de cuenta no es legible') ||
        errorMessage.includes('insufficient funds') ||
        errorMessage.includes('fundos insuficientes') ||
        errorMessage.includes('fondos insuficientes') ||
        errorMessage.includes('balance too low') ||
        errorMessage.includes('saldo muito baixo') ||
        errorMessage.includes('saldo muy bajo')) {
      return t('studentDashboard.documentsAndScholarshipChoice.bankStatementNotReadableError');
    }
    
    // Detectar mensagens específicas sobre diploma
    if (errorMessage.includes('diploma is not readable') ||
        errorMessage.includes('diploma não é legível') ||
        errorMessage.includes('diploma no es legible') ||
        errorMessage.includes('diploma appears damaged') ||
        errorMessage.includes('diploma parece danificado') ||
        errorMessage.includes('diploma parece dañado') ||
        errorMessage.includes('graduation certificate unclear') ||
        errorMessage.includes('certificado de graduação pouco claro') ||
        errorMessage.includes('certificado de graduación poco claro')) {
      return t('studentDashboard.documentsAndScholarshipChoice.diplomaNotReadableError');
    }
    
    if (errorMessage.includes('Unable to process High School Diploma') || 
        errorMessage.includes('Unable to process') ||
        errorMessage.includes('Unable to process High School') ||
        errorMessage.includes('process High School Diploma')) {
      return t('studentDashboard.documentsAndScholarshipChoice.diplomaProcessError');
    }
    
    if (errorMessage.includes('Unable to validate document') || 
        errorMessage.includes('Unable to validate') ||
        errorMessage.includes('validate document') ||
        errorMessage.includes('Unable to validate proof of funds') ||
        errorMessage.includes('Não foi possível validar o documento') ||
        errorMessage.includes('No se pudo validar el documento')) {
      return t('studentDashboard.documentsAndScholarshipChoice.fundsValidationError');
    }
    
    // Detectar mensagens genéricas de erro e traduzi-las baseadas no tipo de documento
    if (documentType === 'passport' && (errorMessage.includes('format') || errorMessage.includes('recognized') || errorMessage.includes('formato') || errorMessage.includes('reconocido'))) {
      return t('studentDashboard.documentsAndScholarshipChoice.passportFormatError');
    }
    
    if (documentType === 'diploma' && (errorMessage.includes('process') || errorMessage.includes('corrupted') || errorMessage.includes('procesar') || errorMessage.includes('corrupto'))) {
      return t('studentDashboard.documentsAndScholarshipChoice.diplomaProcessError');
    }
    
    if (documentType === 'funds_proof' && (errorMessage.includes('validate') || errorMessage.includes('corrupted') || errorMessage.includes('validar') || errorMessage.includes('corrupto'))) {
      return t('studentDashboard.documentsAndScholarshipChoice.fundsValidationError');
    }
    
    console.log('🔍 [DEBUG] Returning original errorMessage:', errorMessage);
    return errorMessage;
  };

  if (!userProfile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto py-4 sm:py-8 px-4">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-800 mb-3 sm:mb-4">
            {t('studentDashboard.documentsAndScholarshipChoice.title')}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto px-2">
            {t('studentDashboard.documentsAndScholarshipChoice.subtitle')}
          </p>
        </div>

        {/* Step 1: Status Selection */}
        {!processType && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-slate-200 p-4 sm:p-8 mb-6 sm:mb-8">
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full mb-3 sm:mb-4">
                <User className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-3 sm:mb-4">
                {t('studentDashboard.documentsAndScholarshipChoice.step1Title')}
              </h2>
              <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto px-2">
                {t('studentDashboard.documentsAndScholarshipChoice.step1Description')}
              </p>
            </div>
            
            <div className="space-y-3 sm:space-y-4 max-w-2xl mx-auto">
              <label className={`group flex items-start p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                studentType === 'initial' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 hover:border-blue-300'
              }`}>
                <input
                  type="radio"
                  name="processType"
                  value="initial"
                  checked={studentType === 'initial'}
                  onChange={() => setStudentType('initial')}
                  className="mt-1 sm:mt-2 mr-3 sm:mr-4 h-4 w-4 sm:h-5 sm:w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={isSavingType}
                />
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2" />
                    <div className="font-bold text-slate-800 text-base sm:text-lg">{t('studentDashboard.documentsAndScholarshipChoice.firstTimeF1')}</div>
                  </div>
                  <div className="text-sm sm:text-base text-slate-600">
                    {t('studentDashboard.documentsAndScholarshipChoice.firstTimeF1Description')}
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 text-slate-400 transition-transform flex-shrink-0 ${
                  studentType === 'initial' ? 'transform rotate-90 text-blue-500' : ''
                }`} />
              </label>

              <label className={`group flex items-start p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                studentType === 'transfer' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 hover:border-blue-300'
              }`}>
                <input
                  type="radio"
                  name="processType"
                  value="transfer"
                  checked={studentType === 'transfer'}
                  onChange={() => setStudentType('transfer')}
                  className="mt-1 sm:mt-2 mr-3 sm:mr-4 h-4 w-4 sm:h-5 sm:w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={isSavingType}
                />
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mr-2" />
                    <div className="font-bold text-slate-800 text-base sm:text-lg">{t('studentDashboard.documentsAndScholarshipChoice.schoolTransfer')}</div>
                  </div>
                  <div className="text-sm sm:text-base text-slate-600">
                    {t('studentDashboard.documentsAndScholarshipChoice.schoolTransferDescription')}
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 text-slate-400 transition-transform flex-shrink-0 ${
                  studentType === 'transfer' ? 'transform rotate-90 text-blue-500' : ''
                }`} />
              </label>

              <label className={`group flex items-start p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                studentType === 'change_of_status' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 hover:border-blue-300'
              }`}>
                <input
                  type="radio"
                  name="processType"
                  value="change_of_status"
                  checked={studentType === 'change_of_status'}
                  onChange={() => setStudentType('change_of_status')}
                  className="mt-1 sm:mt-2 mr-3 sm:mr-4 h-4 w-4 sm:h-5 sm:w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={isSavingType}
                />
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mr-2" />
                    <div className="font-bold text-slate-800 text-base sm:text-lg">{t('studentDashboard.documentsAndScholarshipChoice.statusChange')}</div>
                  </div>
                  <div className="text-sm sm:text-base text-slate-600">
                    {t('studentDashboard.documentsAndScholarshipChoice.statusChangeDescription')}
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 text-slate-400 transition-transform flex-shrink-0 ${
                  studentType === 'change_of_status' ? 'transform rotate-90 text-blue-500' : ''
                }`} />
              </label>
            </div>
            
            <div className="text-center mt-6 sm:mt-8">
              <button
                className="bg-blue-600 text-white px-8 sm:px-12 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto"
                disabled={!studentType || isSavingType}
                onClick={() => studentType && saveStudentType(studentType)}
              >
                {isSavingType ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Saving...
                  </span>
                ) : (
                  t('studentDashboard.documentsAndScholarshipChoice.continueToDocuments')
                )}
              </button>
            </div>
          </div>
        )}


        {processType && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-slate-200 p-4 sm:p-8 mb-6 sm:mb-8">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-3 sm:mb-4">
                {t('studentDashboard.documentsAndScholarshipChoice.step2Title')}
              </h2>              
              {/* Seção Importante com destaque amarelo e link do parceiro */}
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-2xl mx-auto">
                <p className="text-sm text-amber-800 font-bold mb-2">
                  {t('studentDashboard.documentsAndScholarshipChoice.step2Important').split('.')[0]}.
                </p>
                <p className="text-sm text-amber-700 leading-relaxed">
                  {t('studentDashboard.documentsAndScholarshipChoice.step2Important').split('.')[1]?.trim()}{' '}
                  <a 
                    href={`https://${t('studentDashboard.documentsAndScholarshipChoice.step2PartnerUrl')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:text-amber-800 underline font-medium transition-colors"
                  >
                    {t('studentDashboard.documentsAndScholarshipChoice.step2PartnerUrl')}
                  </a>
                  .
                </p>
              </div>
            </div>

            {/* Document Upload List */}
            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              {DOCUMENT_TYPES.map((doc) => {
                const IconComponent = doc.icon;
                const hasError = fieldErrors[doc.key];
                
                // Tratamento especial para funds_proof (múltiplos arquivos)
                if (doc.key === 'funds_proof') {
                  const fundsFiles = Array.isArray(files.funds_proof) ? files.funds_proof : [];
                  const documentLimit = getDocumentLimit();
                  const hasFiles = fundsFiles.length > 0;
                  
                  return (
                    <div key={doc.key} className={`relative p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 ${
                      hasError ? 'border-red-300 bg-red-50' :
                      hasFiles ? 'border-green-300 bg-green-50' : 
                      'border-slate-200 bg-slate-50 hover:border-blue-300'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                        <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 ${
                          hasError ? 'bg-yellow-100' :
                          hasFiles ? 'bg-green-100' : 'bg-slate-100'
                        }`}>
                          <IconComponent className={`w-5 h-5 sm:w-6 sm:h-6 ${
                            hasError ? 'text-yellow-600' :
                            hasFiles ? 'text-green-600' : 'text-slate-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-slate-800 text-sm sm:text-base">{doc.label}</h3>
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                              {fundsFiles.length}/{documentLimit} {t('studentDashboard.documentsAndScholarshipChoice.documents')}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 mb-3">{doc.description}</p>
                          
                          <div className="space-y-2 sm:space-y-3">
                            {/* Área de drag and drop para múltiplos arquivos */}
                            <div 
                              className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer"
                              onDrop={(e) => {
                                e.preventDefault();
                                const droppedFiles = Array.from(e.dataTransfer.files) as File[];
                                handleFundsFileAdd(droppedFiles);
                              }}
                              onDragOver={(e) => e.preventDefault()}
                              onDragEnter={(e) => e.preventDefault()}
                            >
                              <input
                                type="file"
                                accept="application/pdf"
                                multiple
                                onChange={(e) => {
                                  const selectedFiles = Array.from(e.target.files || []) as File[];
                                  handleFundsFileAdd(selectedFiles);
                                  e.target.value = '';
                                }}
                                disabled={uploading || analyzing || mergingPdfs}
                                className="hidden"
                                id={`funds-upload-${doc.key}`}
                              />
                              <label htmlFor={`funds-upload-${doc.key}`} className="cursor-pointer">
                                <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                                <p className="text-sm text-blue-600 font-medium">
                                  {t('studentDashboard.documentsAndScholarshipChoice.dragDropFiles')}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {t('studentDashboard.documentsAndScholarshipChoice.onlyPdfSupported')}
                                </p>
                              </label>
                            </div>

                            {/* Lista de arquivos selecionados */}
                            {fundsFiles.length > 0 && (
                              <div className="space-y-2">
                                {fundsFiles.map((file, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                    <div className="flex items-center space-x-3">
                                      <FileText className="w-4 h-4 text-red-500" />
                                      <div>
                                        <p className="text-sm font-medium text-slate-800 truncate max-w-48">{file.name}</p>
                                        <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleFundsFileRemove(index)}
                                      disabled={uploading || analyzing || mergingPdfs}
                                      className="p-1 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Botão para adicionar mais documentos */}
                            {fundsFiles.length > 0 && fundsFiles.length < documentLimit && (
                              <button
                                onClick={() => document.getElementById(`funds-upload-${doc.key}`)?.click()}
                                disabled={uploading || analyzing || mergingPdfs}
                                className="w-full flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm disabled:opacity-50"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                {t('studentDashboard.documentsAndScholarshipChoice.addMoreDocuments')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mensagem específica para comprovação de fundos */}
                      <div className="mt-4">
                        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 flex items-center rounded-md p-2">
                          <DollarSign className="w-3 h-3 mr-1.5 flex-shrink-0" />
                          <span className="font-medium">Minimum balance required:</span> <span className="font-semibold">$22,000 USD</span>
                        </div>
                      </div>

                      {/* Erro específico para funds_proof */}
                      {hasError && (
                        <div className={`mt-3 flex items-center text-xs sm:text-sm p-2 rounded-lg ${
                          isLanguageError(hasError) 
                            ? 'text-amber-700 bg-amber-50 border border-amber-200' 
                            : isAccessError(hasError)
                            ? 'text-blue-700 bg-blue-50 border border-blue-200'
                            : isFundsDataError(hasError)
                            ? 'text-green-700 bg-green-50 border border-green-200'
                            : isCurrencyFieldError(hasError)
                            ? 'text-purple-700 bg-purple-50 border border-purple-200'
                            : 'text-red-600 bg-red-50 border border-red-200'
                        }`}>
                          <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${
                            isLanguageError(hasError) 
                              ? 'bg-amber-500' 
                              : isAccessError(hasError)
                              ? 'bg-blue-500'
                              : isFundsDataError(hasError)
                              ? 'bg-green-500'
                              : isCurrencyFieldError(hasError)
                              ? 'bg-purple-500'
                              : 'bg-red-500'
                          }`}></div>
                          <span className="break-words">{hasError}</span>
                        </div>
                      )}
                    </div>
                  );
                }

                // Documentos únicos (passport, diploma)
                const hasFile = files[doc.key];
                
                return (
                  <div key={doc.key} className={`relative p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 ${
                    hasError ? 'border-red-300 bg-red-50' :
                    hasFile ? 'border-green-300 bg-green-50' : 
                    'border-slate-200 bg-slate-50 hover:border-blue-300'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                      <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 ${
                        hasError ? 'bg-yellow-100' :
                        hasFile ? 'bg-green-100' : 'bg-slate-100'
                      }`}>
                        <IconComponent className={`w-5 h-5 sm:w-6 sm:h-6 ${
                          hasError ? 'text-yellow-600' :
                          hasFile ? 'text-green-600' : 'text-slate-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 mb-1 text-sm sm:text-base">{doc.label}</h3>
                        <p className="text-xs sm:text-sm text-slate-600 mb-3">{doc.description}</p>
                        
                        <div className="space-y-2 sm:space-y-3">
                          {/* Input de arquivo customizado */}
                          <div className="flex items-center space-x-3">
                            <label className="flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors font-medium text-sm">
                              <Upload className="w-4 h-4 mr-2" />
                              {t('studentDashboard.documentsAndScholarshipChoice.chooseFile')}
                              <input
                                type="file"
                                accept="application/pdf,image/*"
                                onChange={(e) => handleFileChange(doc.key, e.target.files?.[0] || null)}
                                disabled={uploading || analyzing || mergingPdfs}
                                className="hidden"
                              />
                            </label>
                            <span className="text-sm overflow-hidden text-ellipsis whitespace-nowrap text-slate-500">
                              {hasFile ? (hasFile as File).name : t('studentDashboard.documentsAndScholarshipChoice.noFileChosen')}
                            </span>
                          </div>
                          
                          {hasFile && (
                            <div className="flex items-center text-xs sm:text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                              <span className="truncate">{(hasFile as File).name}</span>
                            </div>
                          )}
                          
                          {hasError && (
                            <div className={`flex items-center text-xs sm:text-sm p-2 rounded-lg ${
                              isLanguageError(hasError) 
                                ? 'text-amber-700 bg-amber-50 border border-amber-200' 
                                : isAccessError(hasError)
                                ? 'text-blue-700 bg-blue-50 border border-blue-200'
                                : isFundsDataError(hasError)
                                ? 'text-green-700 bg-green-50 border border-green-200'
                                : isCurrencyFieldError(hasError)
                                ? 'text-purple-700 bg-purple-50 border border-purple-200'
                                : 'text-yellow-600 bg-yellow-50 border border-yellow-200'
                            }`}>
                              <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${
                                isLanguageError(hasError) 
                                  ? 'bg-amber-500' 
                                  : isAccessError(hasError)
                                  ? 'bg-blue-500'
                                  : isFundsDataError(hasError)
                                  ? 'bg-green-500'
                                  : isCurrencyFieldError(hasError)
                                  ? 'bg-purple-500'
                                  : 'bg-yellow-500'
                              }`}></div>
                              <span className="break-words">
                                {isLanguageError(hasError) 
                                  ? t('studentDashboard.documentsAndScholarshipChoice.languageError')
                                  : isAccessError(hasError)
                                  ? t('studentDashboard.documentsAndScholarshipChoice.accessError')
                                  : isFundsDataError(hasError)
                                  ? t('studentDashboard.documentsAndScholarshipChoice.fundsDataError')
                                  : isCurrencyFieldError(hasError)
                                  ? t('studentDashboard.documentsAndScholarshipChoice.currencyFieldError')
                                  : getFormattedErrorMessage(hasError, doc.key)
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Upload Button */}
            <div className="text-center flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                onClick={handleUpload}
                disabled={uploading || !allFilesSelected || analyzing || mergingPdfs}
                className="bg-blue-600 text-white px-8 sm:px-12 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-lg hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto"
              >
                {(mergingPdfs || uploading) ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    {t('studentDashboard.documentsAndScholarshipChoice.uploadingDocuments')}
                  </span>
                ) : analyzing ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-pulse h-5 w-5 bg-white rounded-full mr-2"></div>
                    {t('studentDashboard.documentsAndScholarshipChoice.analyzingDocuments')}
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <Upload className="w-5 h-5 mr-2" />
                    {t('studentDashboard.documentsAndScholarshipChoice.uploadDocuments')}
                  </span>
                )}
              </button>
              
              {error && (
                <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}


        {/* Manual Review Message Modal - Simplified */}
        {showManualReviewMessage && (
          <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-sm w-full mx-4 border border-slate-100">
              {/* Header */}
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-3">
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-blue-800 mb-3">
                  {t('studentDashboard.documentsAndScholarshipChoice.manualReviewTitle')}
                </h2>
                
                  <p className="text-blue-700 text-sm leading-relaxed">
                    {t('studentDashboard.documentsAndScholarshipChoice.manualReviewTimeframe')}
                  </p>
              </div>

              {/* Help Section - Collapsible */}
              <div className="mb-4">
                <button
                  onClick={() => setShowHelpSection(!showHelpSection)}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {t('studentDashboard.documentsAndScholarshipChoice.needHelp')}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showHelpSection ? 'rotate-180' : ''}`} />
                </button>
                
                {showHelpSection && (
                  <div className="mt-2 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center p-2 bg-white rounded border">
                      <Bot className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0" />
                      <span>
                        <span className="font-medium">{t('studentDashboard.documentsAndScholarshipChoice.smartAssistantHelp')}</span>{' '}
                        {t('studentDashboard.documentsAndScholarshipChoice.smartAssistantDescription')}
                      </span>
                    </div>
                    <div className="flex items-center p-2 bg-white rounded border">
                      <MessageCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                      <span>
                        <span className="font-medium">{t('studentDashboard.documentsAndScholarshipChoice.supportChatHelp')}</span>{' '}
                        {t('studentDashboard.documentsAndScholarshipChoice.supportChatDescription')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={() => navigate('/student/dashboard/applications')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                {t('studentDashboard.documentsAndScholarshipChoice.backToOverview')}
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Analysis Loading Overlay */}
        {analyzing && (
          <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center border border-slate-100 max-w-sm mx-4 w-full">
              <div className="relative mb-4 sm:mb-6">
                <div className="animate-spin h-12 w-12 sm:h-16 sm:w-16 border-3 sm:border-4 border-blue-100 border-t-blue-600 rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-700 text-lg sm:text-xl font-bold">
                  AI
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-800 mb-2 animate-pulse text-center">
                {t('studentDashboard.documentsAndScholarshipChoice.analyzingOverlayTitle')}
              </div>
              <div className="text-slate-500 text-center text-xs sm:text-sm px-2">
                {t('studentDashboard.documentsAndScholarshipChoice.analyzingOverlayDescription')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsAndScholarshipChoice;