import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, Loader2, X, Clock, Plus, DollarSign, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { StepProps } from '../types';
import { useCartStore } from '../../../stores/applicationStore';
import { PencilLoader } from '../../../components/PencilLoader';

const DOCUMENT_TYPES = [
  { key: 'passport', label: 'Passport', description: 'Upload a clear photo or scan of your passport' },
  { key: 'diploma', label: 'High School Diploma', description: 'Upload your high school diploma or equivalent' },
  { key: 'funds_proof', label: 'Proof of Funds', description: 'Upload bank statements or financial documents' },
];

export const DocumentsUploadStep: React.FC<StepProps> = ({ onNext }) => {
  const { t } = useTranslation();
  const { user, userProfile, refetchUserProfile } = useAuth();
  const { clearCart, cart, fetchCart } = useCartStore();
  const [files, setFiles] = useState<Record<string, File | File[] | null>>({
    passport: null,
    diploma: null,
    funds_proof: [], // Array para múltiplos arquivos
  });
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [mergingPdfs, setMergingPdfs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showManualReviewMessage, setShowManualReviewMessage] = useState(false);

  // Obter process type do localStorage ou userProfile
  const processType = userProfile?.process_type || localStorage.getItem('studentProcessType') || 'initial';

  // Função para obter limite de documentos baseado no process type
  const getDocumentLimit = (): number => {
    switch (processType) {
      case 'change_of_status':
        return 5;
      case 'transfer':
        return 10;
      case 'initial':
      default:
        return 5;
    }
  };

  // Função para validar tamanho de arquivo (max 10MB por arquivo)
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

  const sanitizeFileName = (fileName: string): string => {
    return fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
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

  // Função para adicionar arquivos de fundos
  const handleFundsFileAdd = (newFiles: File[]) => {
    const currentFundsFiles = Array.isArray(files.funds_proof) ? files.funds_proof : [];
    const documentLimit = getDocumentLimit();
    
    // Validar se não excede o limite
    if (currentFundsFiles.length + newFiles.length > documentLimit) {
      setFieldErrors(prev => ({ 
        ...prev, 
        funds_proof: `Maximum ${documentLimit} documents allowed`
      }));
      return;
    }

    // Validar tamanho individual dos arquivos
    const invalidSizeFiles = newFiles.filter(file => !validateFileSize(file));
    if (invalidSizeFiles.length > 0) {
      setFieldErrors(prev => ({ 
        ...prev, 
        funds_proof: `File size exceeds 10MB: ${invalidSizeFiles[0].name}`
      }));
      return;
    }

    // Validar se são PDFs
    const nonPdfFiles = newFiles.filter(file => file.type !== 'application/pdf');
    if (nonPdfFiles.length > 0) {
      setFieldErrors(prev => ({ 
        ...prev, 
        funds_proof: 'Only PDF files are allowed'
      }));
      return;
    }

    const updatedFiles = [...currentFundsFiles, ...newFiles];
    
    // Validar tamanho total
    if (!validateTotalSize(updatedFiles)) {
      setFieldErrors(prev => ({ 
        ...prev, 
        funds_proof: 'Total size of all files exceeds 10MB'
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

  // Função para lidar com mudança de arquivo (documentos únicos)
  const handleFileChange = (type: string, file: File | null) => {
    if (type === 'funds_proof') {
      // Para funds_proof, não usar esta função - usar handleFundsFileAdd
      return;
    }
    setFiles((prev) => ({ ...prev, [type]: file }));
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
  };

  // Função para obter mensagem de erro formatada (simplificada)
  const getFormattedErrorMessage = (errorMessage: string, documentType: string): string => {
    // Detectar mensagens específicas e traduzi-las
    if (errorMessage.toLowerCase().includes('not in english') || 
        errorMessage.toLowerCase().includes('not in english.')) {
      return t('studentDashboard.documentsAndScholarshipChoice.languageError', { 
        documentType: DOCUMENT_TYPES.find(d => d.key === documentType)?.label || documentType
      });
    }
    
    if (errorMessage.toLowerCase().includes('unable to access') ||
        errorMessage.toLowerCase().includes('cannot access')) {
      return t('studentDashboard.documentsAndScholarshipChoice.accessError', { 
        documentType: DOCUMENT_TYPES.find(d => d.key === documentType)?.label || documentType
      });
    }
    
    return errorMessage;
  };

  // Função auxiliar para processar aplicações e limpar carrinho (similar ao fluxo normal)
  const processApplicationsAndClearCart = async (docUrls: Record<string, string>, notifyUniversity: boolean = false) => {
    if (!user) {
      console.warn('🔍 [DocumentsUploadStep] processApplicationsAndClearCart: No user');
      return;
    }
    
    try {
      console.log('🔍 [DocumentsUploadStep] processApplicationsAndClearCart: Starting...');
      
      // Garantir que o carrinho está atualizado
      if (user.id) {
        await fetchCart(user.id);
        // Aguardar um pouco para o store atualizar
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, selected_scholarship_id')
        .eq('user_id', user.id)
        .single();
      
      console.log('🔍 [DocumentsUploadStep] Profile:', profile);
      
      const scholarshipIds: string[] = [];
      
      // 1. Primeiro tentar do Zustand store (mais confiável)
      const currentCart = useCartStore.getState().cart;
      console.log('🔍 [DocumentsUploadStep] Zustand cart:', currentCart);
      console.log('🔍 [DocumentsUploadStep] Zustand cart length:', currentCart?.length);
      
      if (Array.isArray(currentCart) && currentCart.length > 0) {
        for (const item of currentCart) {
          // O carrinho tem estrutura: { cart_id: string, scholarships: Scholarship }
          const scholarshipId = item?.scholarships?.id;
          console.log('🔍 [DocumentsUploadStep] Processing cart item:', { cart_id: item?.cart_id, scholarship_id: scholarshipId });
          if (scholarshipId && !scholarshipIds.includes(scholarshipId)) {
            scholarshipIds.push(scholarshipId);
          }
        }
      } else {
        console.warn('🔍 [DocumentsUploadStep] Cart is empty or not an array:', currentCart);
      }
      
      // 2. Se não encontrou no store, buscar do banco
      if (scholarshipIds.length === 0) {
        const { data: cartRows } = await supabase
          .from('user_cart')
          .select('scholarship_id')
          .eq('user_id', user.id);
        
        console.log('🔍 [DocumentsUploadStep] Cart rows from DB:', cartRows);
        
        if (Array.isArray(cartRows)) {
          for (const row of cartRows) {
            if (row?.scholarship_id && !scholarshipIds.includes(row.scholarship_id)) {
              scholarshipIds.push(row.scholarship_id);
            }
          }
        }
      }
      
      // 3. Fallback: usar selected_scholarship_id do perfil
      if (scholarshipIds.length === 0 && profile?.selected_scholarship_id) {
        console.log('🔍 [DocumentsUploadStep] Using selected_scholarship_id from profile:', profile.selected_scholarship_id);
        scholarshipIds.push(profile.selected_scholarship_id);
      }

      console.log('🔍 [DocumentsUploadStep] Final Scholarship IDs to process:', scholarshipIds);

      if (profile?.id && scholarshipIds.length > 0) {
        for (const scholarshipId of scholarshipIds) {
          // Validar se a bolsa de $3800 está bloqueada antes de criar aplicação
          const { data: scholarship } = await supabase
            .from('scholarships')
            .select('id, annual_value_with_scholarship')
            .eq('id', scholarshipId)
            .single();
          
          if (scholarship) {
            const { is3800ScholarshipBlocked } = await import('../../../utils/scholarshipDeadlineValidation');
            if (is3800ScholarshipBlocked(scholarship as any)) {
              console.warn('Cannot create application for expired $3800 scholarship:', scholarshipId);
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
            console.log('🔍 [DocumentsUploadStep] Creating new application for scholarship:', scholarshipId);
            const { data: newApp, error: insertError } = await supabase
              .from('scholarship_applications')
              .insert({ 
                student_id: profile.id, 
                scholarship_id: scholarshipId, 
                status: 'pending',
                student_process_type: processType || null
              })
              .select('id')
              .single();
            
            if (insertError) {
              console.error('🔍 [DocumentsUploadStep] Error creating application:', insertError);
            } else {
              console.log('🔍 [DocumentsUploadStep] Application created:', newApp?.id);
            }
            
            applicationId = newApp?.id || null;
          }
          
          if (applicationId) {
            console.log('🔍 [DocumentsUploadStep] Updating documents for application:', applicationId);
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

      console.log('🔍 [DocumentsUploadStep] processApplicationsAndClearCart: Completed. Created/updated applications for', scholarshipIds.length, 'scholarships');

      // Só notificar universidade se solicitado explicitamente
      if (notifyUniversity && scholarshipIds.length > 0) {
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
      
      if (!profile?.id || scholarshipIds.length === 0) {
        console.warn('🔍 [DocumentsUploadStep] No profile ID or scholarship IDs found. Profile:', profile?.id, 'Scholarship IDs:', scholarshipIds.length);
      }
    } catch (error) {
      console.error('🔍 [DocumentsUploadStep] Error processing applications:', error);
    }
  };

  const handleUpload = async () => {
    console.log('🔍 [DocumentsUploadStep] handleUpload: Starting...');
    
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    setUploading(true);
    setError(null);
    setFieldErrors({});

    try {
      const uploadedDocs: any[] = [];
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
          file_url: docUrls[doc.key],
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
        const respPassport = n8nData[0]?.response_passaport;
        const respFunds = n8nData[0]?.response_funds;
        const respDegree = n8nData[0]?.response_degree;

        const passportOk = respPassport === true;
        const fundsOk = respFunds === true;
        const degreeOk = respDegree === true;

        console.log('🔍 [DEBUG] n8nData[0]:', n8nData[0]);
        console.log('🔍 [DEBUG] respPassport:', respPassport, 'passportOk:', passportOk);
        console.log('🔍 [DEBUG] respFunds:', respFunds, 'fundsOk:', fundsOk);
        console.log('🔍 [DEBUG] respDegree:', respDegree, 'degreeOk:', degreeOk);
        
        const passportErr = typeof respPassport === 'string' ? getFormattedErrorMessage(respPassport, 'passport') : 
                           (passportOk ? '' : getFormattedErrorMessage(n8nData[0]?.details_passport || 'Invalid document.', 'passport'));
        const fundsErr = typeof respFunds === 'string' ? getFormattedErrorMessage(respFunds, 'funds_proof') : 
                        (fundsOk ? '' : getFormattedErrorMessage(n8nData[0]?.details_funds || 'Invalid document.', 'funds_proof'));
        const degreeErr = typeof respDegree === 'string' ? getFormattedErrorMessage(respDegree, 'diploma') : 
                         (degreeOk ? '' : getFormattedErrorMessage(n8nData[0]?.details_degree || 'Invalid document.', 'diploma'));
        
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

          // Processar aplicações e notificar universidade (igual ao fluxo normal)
          await processApplicationsAndClearCart(docUrls, true);

          setAnalyzing(false);
          setFieldErrors({});
          await refetchUserProfile();
          onNext();
        } else {
          // Documentos com erro - apenas salvar no perfil para revisão manual
          // NÃO mostrar erros específicos, apenas mensagem de revisão manual
          await supabase
            .from('user_profiles')
            .update({
              documents: uploadedDocs,
              documents_uploaded: true,
              documents_status: 'under_review',
            })
            .eq('user_id', user.id);

          // Processar aplicações sem notificar universidade (igual ao fluxo normal)
          await processApplicationsAndClearCart(docUrls, false);

          setAnalyzing(false);
          setError(null);
          setFieldErrors({}); // Limpar erros - não mostrar erros específicos
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

        // Processar aplicações sem notificar universidade (igual ao fluxo normal)
        await processApplicationsAndClearCart(docUrls, false);

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

  // Verificar se todos os arquivos foram selecionados
  const allFilesSelected = DOCUMENT_TYPES.every((doc) => {
    if (doc.key === 'funds_proof') {
      const fundsFiles = Array.isArray(files.funds_proof) ? files.funds_proof : [];
      return fundsFiles.length > 0;
    }
    return files[doc.key] !== null;
  });

  return (
    <div className="space-y-6 pb-24 sm:pb-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Documents</h2>
        <p className="text-gray-600">Please upload the required documents to continue</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {DOCUMENT_TYPES.map((doc) => {
          const hasError = fieldErrors[doc.key];
          
          // Tratamento especial para funds_proof (múltiplos arquivos)
          if (doc.key === 'funds_proof') {
            const fundsFiles = Array.isArray(files.funds_proof) ? files.funds_proof : [];
            const documentLimit = getDocumentLimit();
            const hasFiles = fundsFiles.length > 0;
            
            return (
              <div key={doc.key} className={`relative p-4 sm:p-6 rounded-xl border-2 transition-all duration-200 ${
                hasError ? 'border-red-300 bg-red-50' :
                hasFiles ? 'border-green-300 bg-green-50' : 
                'border-slate-200 bg-slate-50 hover:border-blue-300'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                  <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 ${
                    hasError ? 'bg-yellow-100' :
                    hasFiles ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    <DollarSign className={`w-5 h-5 sm:w-6 sm:h-6 ${
                      hasError ? 'text-yellow-600' :
                      hasFiles ? 'text-green-600' : 'text-slate-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-slate-800 text-sm sm:text-base">{doc.label}</h3>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                        {fundsFiles.length}/{documentLimit} documents
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
                            Drag and drop files here or click to select
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Only PDF files supported
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
                          Add More Documents
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
                  <div className="mt-3 flex items-center text-xs sm:text-sm p-2 rounded-lg text-red-600 bg-red-50 border border-red-200">
                    <div className="w-2 h-2 rounded-full bg-red-500 mr-2 flex-shrink-0"></div>
                    <span className="break-words">{hasError}</span>
                  </div>
                )}
              </div>
            );
          }

          // Documentos únicos (passport, diploma)
          const hasFile = files[doc.key];
          
          return (
            <div key={doc.key} className={`relative p-4 sm:p-6 rounded-xl border-2 transition-all duration-200 ${
              hasError ? 'border-red-300 bg-red-50' :
              hasFile ? 'border-green-300 bg-green-50' : 
              'border-slate-200 bg-slate-50 hover:border-blue-300'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 ${
                  hasError ? 'bg-yellow-100' :
                  hasFile ? 'bg-green-100' : 'bg-slate-100'
                }`}>
                  <FileText className={`w-5 h-5 sm:w-6 sm:h-6 ${
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
                        Choose File
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          onChange={(e) => handleFileChange(doc.key, e.target.files?.[0] || null)}
                          disabled={uploading || analyzing || mergingPdfs}
                          className="hidden"
                        />
                      </label>
                      <span className="text-sm overflow-hidden text-ellipsis whitespace-nowrap text-slate-500">
                        {hasFile ? (hasFile as File).name : 'No file chosen'}
                      </span>
                    </div>
                    
                    {hasFile && (
                      <div className="flex items-center text-xs sm:text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{(hasFile as File).name}</span>
                      </div>
                    )}
                    
                    {hasError && (
                      <div className="flex items-center text-xs sm:text-sm p-2 rounded-lg text-red-600 bg-red-50 border border-red-200">
                        <div className="w-2 h-2 rounded-full bg-red-500 mr-2 flex-shrink-0"></div>
                        <span className="break-words">{hasError}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Review Message Modal */}
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

            {/* Action Button */}
            <button
              onClick={() => {
                setShowManualReviewMessage(false);
                onNext();
              }}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              {t('studentDashboard.documentsAndScholarshipChoice.gotItContinue') || 'Got it, Continue'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Analysis Loading Overlay */}
      {analyzing && (
        <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center border border-slate-100 max-w-sm mx-4 w-full">
            <PencilLoader
              title={t('studentDashboard.documentsAndScholarshipChoice.analyzingOverlayTitle')}
              description={t('studentDashboard.documentsAndScholarshipChoice.analyzingOverlayDescription')}
            />
          </div>
        </div>
      )}

      {/* Fixed Continue Button - Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50 p-4 sm:hidden">
        <button
          onClick={handleUpload}
          disabled={!allFilesSelected || uploading || analyzing || mergingPdfs}
          className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center space-x-2"
        >
          {(mergingPdfs || uploading) ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : analyzing ? (
            <>
              <div className="animate-pulse h-5 w-5 bg-white rounded-full"></div>
              <span>Analyzing...</span>
            </>
          ) : (
            <span>Continue</span>
          )}
        </button>
      </div>

      {/* Continue Button - Desktop */}
      <div className="hidden sm:block pt-4 border-t">
        <button
          onClick={handleUpload}
          disabled={!allFilesSelected || uploading || analyzing || mergingPdfs}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {(mergingPdfs || uploading) ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : analyzing ? (
            <>
              <div className="animate-pulse h-5 w-5 bg-white rounded-full"></div>
              <span>Analyzing...</span>
            </>
          ) : (
            <span>Continue</span>
          )}
        </button>
      </div>
    </div>
  );
};
