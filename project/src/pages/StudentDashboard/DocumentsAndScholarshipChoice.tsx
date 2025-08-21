import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCartStore } from '../../stores/applicationStore';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  GraduationCap, 
  DollarSign,
  Clock,
  Shield,
  ChevronRight
} from 'lucide-react';
import './DocumentsAndScholarshipChoice.css';

// Documentos obrigatórios - mantendo exatamente os mesmos documentos
const DOCUMENT_TYPES = [
  { key: 'passport', label: 'Passport', icon: User, description: 'Valid passport document' },
  { key: 'diploma', label: 'High School Diploma', icon: GraduationCap, description: 'Official high school diploma or certificate' },
  { key: 'funds_proof', label: 'Proof of Funds', icon: DollarSign, description: 'Bank statement or financial documentation' },
];

const DocumentsAndScholarshipChoice: React.FC = () => {
  const { userProfile, user } = useAuth();
  const { fetchCart, clearCart } = useCartStore();
  const [documentsApproved, setDocumentsApproved] = useState(userProfile?.documents_status === 'approved');
  const [processType, setProcessType] = useState<string | null>(window.localStorage.getItem('studentProcessType'));
  const [studentType, setStudentType] = useState<string | null>(null);
  const [isSavingType, setIsSavingType] = useState(false);
  
  // Estados para upload de documentos
  const [files, setFiles] = useState<Record<string, File | null>>({ 
    passport: null, 
    diploma: null, 
    funds_proof: null 
  });
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showDocumentSection, setShowDocumentSection] = useState(false);
  
  const navigate = useNavigate();

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
      // Se já tem processType, mostrar seção de documentos
      if (!documentsApproved) {
        setShowDocumentSection(true);
      }
    }
  }, [documentsApproved]);

  // Atualizar estado quando userProfile muda
  useEffect(() => {
    setDocumentsApproved(userProfile?.documents_status === 'approved');
  }, [userProfile?.documents_status]);

  // Função para sanitizar nome do arquivo
  const sanitizeFileName = (fileName: string): string => {
    return fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  // Função para lidar com mudança de arquivo
  const handleFileChange = (type: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [type]: file }));
    setFieldErrors(prev => ({ ...prev, [type]: '' }));
  };

  // Função de upload de documentos (baseada no DocumentUpload.tsx)
  const handleUpload = async () => {
    setUploading(true);
    setError(null);
    try {
      if (!user) throw new Error('User not authenticated');
      
      const uploadedDocs: { name: string; url: string; type: string; uploaded_at: string; status: string }[] = [];
      const docUrls: Record<string, string> = {};
      
      for (const doc of DOCUMENT_TYPES) {
        const file = files[doc.key];
        if (!file) throw new Error(`Missing file for ${doc.label}`);
        
        const sanitizedFileName = sanitizeFileName(file.name);
        const { data: storageData, error: storageError } = await supabase.storage
          .from('student-documents')
          .upload(`${user.id}/${doc.key}-${Date.now()}-${sanitizedFileName}`, file, { upsert: true });
        
        if (storageError) throw storageError;
        
        if (!storageData?.path) throw new Error('Failed to get storage path');
        
        docUrls[doc.key] = storageData.path; // Salvar o caminho do storage, não a URL pública
        
        const { error: insertError } = await supabase.from('student_documents').insert({
          user_id: user.id,
          type: doc.key,
          file_url: storageData.path, // Salvar o caminho do storage
          status: 'pending',
        });
        
        if (insertError) throw insertError;
        
        uploadedDocs.push({ 
          name: file.name, 
          url: storageData.path, // Salvar com 'url' para compatibilidade com SelectionProcess
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
      
      if (n8nData) {
        const respPassport = n8nData.response_passaport;
        const respFunds = n8nData.response_funds;
        const respDegree = n8nData.response_degree;

        const passportOk = respPassport === true;
        const fundsOk = respFunds === true;
        const degreeOk = respDegree === true;

        const passportErr = typeof respPassport === 'string' ? respPassport : 
                           (passportOk ? '' : (n8nData.details_passport || 'Invalid document.'));
        const fundsErr = typeof respFunds === 'string' ? respFunds : 
                        (fundsOk ? '' : (n8nData.details_funds || 'Invalid document.'));
        const degreeErr = typeof respDegree === 'string' ? respDegree : 
                         (degreeOk ? '' : (n8nData.details_degree || 'Invalid document.'));

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

          // Processar aplicações, limpar carrinho E notificar universidade
          await processApplicationsAndClearCart(docUrls, true);
          
          // Limpar dados de manual review do localStorage
          clearManualReviewData();
          
          setAnalyzing(false);
          setFieldErrors({});
          setDocumentsApproved(true);
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

          // NÃO chamar saveDocumentsForManualReview aqui
          // As aplicações só serão criadas quando o usuário completar o manual review
          
          // Salvar dados no localStorage para manual review
          const errorData = {
            passport: passportErr || 'Invalid document.',
            funds_proof: fundsErr || 'Invalid document.',
            diploma: degreeErr || 'Invalid document.',
          };
          
          console.log('Saving to localStorage for manual review:');
          console.log('Errors:', errorData);
          console.log('Documents:', uploadedDocs);
          
          localStorage.setItem('documentAnalysisErrors', JSON.stringify(errorData));
          localStorage.setItem('documentUploadedDocs', JSON.stringify(uploadedDocs));
          
          setAnalyzing(false);
          setError(null);
          setFieldErrors(errorData);
          
          // Limpar apenas arquivos inválidos
          setFiles(prev => {
            const updated = { ...prev };
            if (!passportOk) updated['passport'] = null;
            if (!fundsOk) updated['funds_proof'] = null;
            if (!degreeOk) updated['diploma'] = null;
            return updated;
          });
        }
      } else {
        setAnalyzing(false);
        setError('Unexpected response from document analysis. Please try again.');
      }
    } catch (e: any) {
      setUploading(false);
      setAnalyzing(false);
      setError(e.message || 'Upload failed');
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
                status: 'pending' 
              })
              .select('id')
              .single();
            applicationId = newApp?.id || null;
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
      
      // Se documentos já aprovados, vai direto para pagamento
      if (documentsApproved) {
        navigate('/student/dashboard/application-fee');
      } else {
        setShowDocumentSection(true);
      }
    } catch (e) {
      console.error('Error in saveStudentType:', e);
      alert('Failed to save student type. Please try again.');
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
  const allFilesSelected = DOCUMENT_TYPES.every((doc) => files[doc.key]);

  if (!userProfile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto py-4 sm:py-8 px-4">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-800 mb-3 sm:mb-4">
            Application Process Setup
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto px-2">
            Complete your student application process by selecting your status and uploading required documents
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
                What is your current status in the US?
              </h2>
              <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto px-2">
                Please select your current immigration status to help us provide the best guidance for your application process.
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
                    <div className="font-bold text-slate-800 text-base sm:text-lg">First-time F-1 Visa Application</div>
                  </div>
                  <div className="text-sm sm:text-base text-slate-600">
                    I am outside the US and need an F-1 student visa to study in America.
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
                    <div className="font-bold text-slate-800 text-base sm:text-lg">School Transfer</div>
                  </div>
                  <div className="text-sm sm:text-base text-slate-600">
                    I am already in the US with an F-1 student visa and want to transfer schools.
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
                    <div className="font-bold text-slate-800 text-base sm:text-lg">Status Change</div>
                  </div>
                  <div className="text-sm sm:text-base text-slate-600">
                    I am already in the US with another visa (e.g., tourist) and want to change my status to student.
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
                  'Continue to Documents'
                )}
              </button>
            </div>
          </div>
        )}


        {processType && !documentsApproved && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-slate-200 p-4 sm:p-8 mb-6 sm:mb-8">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-3 sm:mb-4">
                Upload Required Documents
              </h2>
              <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto mb-2 px-2">
                Please upload the following documents to proceed with your application process.
              </p>
              <p className="text-xs sm:text-sm text-slate-500 px-2">
                <strong>All files must be clear and legible.</strong> Each field accepts only one file.
              </p>
            </div>

            {/* Document Upload List */}
            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              {DOCUMENT_TYPES.map((doc) => {
                const IconComponent = doc.icon;
                const hasFile = files[doc.key];
                const hasError = fieldErrors[doc.key];
                
                return (
                  <div key={doc.key} className={`relative p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 ${
                    hasError ? 'border-red-300 bg-red-50' :
                    hasFile ? 'border-green-300 bg-green-50' : 
                    'border-slate-200 bg-slate-50 hover:border-blue-300'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                      <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 ${
                        hasError ? 'bg-red-100' :
                        hasFile ? 'bg-green-100' : 'bg-slate-100'
                      }`}>
                        <IconComponent className={`w-5 h-5 sm:w-6 sm:h-6 ${
                          hasError ? 'text-red-600' :
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
                              Escolher arquivo
                              <input
                                type="file"
                                accept="application/pdf,image/*"
                                onChange={(e) => handleFileChange(doc.key, e.target.files?.[0] || null)}
                                disabled={uploading || analyzing}
                                className="hidden"
                              />
                            </label>
                            <span className="text-sm text-slate-500">
                              {hasFile ? hasFile.name : 'Nenhum arquivo escolhido'}
                            </span>
                          </div>
                          
                          {hasFile && (
                            <div className="flex items-center text-xs sm:text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                              <span className="truncate">{hasFile.name}</span>
                            </div>
                          )}
                          
                          {hasError && (
                            <div className="flex items-start text-xs sm:text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                              <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="flex items-center justify-center">
                                <span className="break-words">{hasError}</span>
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
              {Object.values(fieldErrors).some(Boolean) && (
                <button
                  onClick={() => navigate('/student/dashboard/manual-review')}
                  disabled={analyzing}
                  className="bg-amber-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base hover:bg-amber-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg w-full sm:w-auto"
                >
                  Continue to Manual Review
                </button>
              )}
              
              <button
                onClick={handleUpload}
                disabled={uploading || !allFilesSelected || analyzing}
                className="bg-blue-600 text-white px-8 sm:px-12 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-lg hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto"
              >
                {uploading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Uploading Documents...
                  </span>
                ) : analyzing ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-pulse h-5 w-5 bg-white rounded-full mr-2"></div>
                    Analyzing Documents...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <Upload className="w-5 h-5 mr-2" />
                    Upload and Analyze Documents
                  </span>
                )}
              </button>
              
              {error && (
                <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Documents Approved */}
        {processType && documentsApproved && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center shadow-lg">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full mb-4 sm:mb-6">
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-green-800 mb-3 sm:mb-4">
              Documents Approved! ✅
            </h2>
            <p className="text-green-700 text-sm sm:text-lg mb-4 sm:mb-6 max-w-xl mx-auto px-2">
              Excellent! Your documents have been approved and you're ready to proceed with the application fee payment.
            </p>
            <button
              onClick={() => navigate('/student/dashboard/application-fee')}
              className="bg-green-600 text-white px-8 sm:px-12 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-lg hover:bg-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              <span className="flex items-center justify-center">
                Proceed to Payment
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </span>
            </button>
          </div>
        )}

        {/* Analysis Loading Overlay */}
        {analyzing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center border border-slate-100 max-w-sm mx-4 w-full">
              <div className="relative mb-4 sm:mb-6">
                <div className="animate-spin h-12 w-12 sm:h-16 sm:w-16 border-3 sm:border-4 border-blue-100 border-t-blue-600 rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-700 text-lg sm:text-xl font-bold">
                  AI
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-800 mb-2 animate-pulse text-center">
                Analyzing your documents...
              </div>
              <div className="text-slate-500 text-center text-xs sm:text-sm px-2">
                This may take up to 40 seconds.<br />
                Please do not close this window.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsAndScholarshipChoice;