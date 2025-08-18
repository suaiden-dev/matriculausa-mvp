import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCartStore } from '../../stores/applicationStore';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  FileText, 
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
      
      const uploadedDocs: { name: string; url: string; type: string; uploaded_at: string }[] = [];
      const docUrls: Record<string, string> = {};
      
      for (const doc of DOCUMENT_TYPES) {
        const file = files[doc.key];
        if (!file) throw new Error(`Missing file for ${doc.label}`);
        
        const sanitizedFileName = sanitizeFileName(file.name);
        const { data: storageData, error: storageError } = await supabase.storage
          .from('student-documents')
          .upload(`${user.id}/${doc.key}-${Date.now()}-${sanitizedFileName}`, file, { upsert: true });
        
        if (storageError) throw storageError;
        
        const file_url = storageData?.path ? 
          supabase.storage.from('student-documents').getPublicUrl(storageData.path).data.publicUrl : null;
        
        if (!file_url) throw new Error('Failed to get file URL');
        
        docUrls[doc.key] = file_url;
        
        const { error: insertError } = await supabase.from('student_documents').insert({
          user_id: user.id,
          type: doc.key,
          file_url,
          status: 'pending',
        });
        
        if (insertError) throw insertError;
        
        uploadedDocs.push({ 
          name: file.name, 
          url: file_url, 
          type: doc.key, 
          uploaded_at: new Date().toISOString() 
        });
      }

      // Enviar para análise
      setUploading(false);
      setAnalyzing(true);
      
      const webhookBody = {
        user_id: user.id,
        student_name: userProfile?.full_name || (user as any)?.user_metadata?.full_name || 
                     (user as any)?.user_metadata?.name || user.email || '',
        passport_url: docUrls['passport'],
        diploma_url: docUrls['diploma'],
        funds_proof_url: docUrls['funds_proof'],
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
          // Documentos aprovados - continuar processo
          await supabase
            .from('user_profiles')
            .update({
              documents: uploadedDocs,
              documents_uploaded: true,
              documents_status: 'under_review',
            })
            .eq('user_id', user.id);

          // Processar aplicações e limpar carrinho
          await processApplicationsAndClearCart(docUrls);
          
          setAnalyzing(false);
          setFieldErrors({});
          setDocumentsApproved(true);
          navigate('/student/dashboard/application-fee');
        } else {
          // Documentos com erro - mostrar erros específicos
          const nextFieldErrors: Record<string, string> = {};
          if (!passportOk && (passportErr || respPassport !== undefined)) {
            nextFieldErrors['passport'] = passportErr || 'Invalid document.';
          }
          if (!fundsOk && (fundsErr || respFunds !== undefined)) {
            nextFieldErrors['funds_proof'] = fundsErr || 'Invalid document.';
          }
          if (!degreeOk && (degreeErr || respDegree !== undefined)) {
            nextFieldErrors['diploma'] = degreeErr || 'Invalid document.';
          }
          
          setAnalyzing(false);
          setError(null);
          setFieldErrors(nextFieldErrors);
          
          // Atualizar perfil mesmo com erros para revisão manual
          await supabase
            .from('user_profiles')
            .update({
              documents: uploadedDocs,
              documents_uploaded: true,
              documents_status: 'under_review',
            })
            .eq('user_id', user.id);

          await processApplicationsAndClearCart(docUrls);
          
          // Limpar apenas arquivos inválidos
          setFiles(prev => {
            const updated = { ...prev };
            if (!passportOk && (passportErr || respPassport !== undefined)) updated['passport'] = null;
            if (!fundsOk && (fundsErr || respFunds !== undefined)) updated['funds_proof'] = null;
            if (!degreeOk && (degreeErr || respDegree !== undefined)) updated['diploma'] = null;
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

  // Função auxiliar para processar aplicações e limpar carrinho
  const processApplicationsAndClearCart = async (docUrls: Record<string, string>) => {
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

      // Notificar universidade
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
        // Se não, mostra seção de upload
        setShowDocumentSection(true);
      }
    } catch (e) {
      console.error('Error in saveStudentType:', e);
      alert('Failed to save student type. Please try again.');
    } finally {
      setIsSavingType(false);
    }
  };

  // Verificar se todos os arquivos foram selecionados
  const allFilesSelected = DOCUMENT_TYPES.every((doc) => files[doc.key]);

  if (!userProfile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            Application Process Setup
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Complete your student application process by selecting your status and uploading required documents
          </p>
        </div>

        {/* Step 1: Status Selection */}
        {!processType && (
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 mb-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                What is your current status in the US?
              </h2>
              <p className="text-slate-600 max-w-xl mx-auto">
                Please select your current immigration status to help us provide the best guidance for your application process.
              </p>
            </div>
            
            <div className="space-y-4 max-w-2xl mx-auto">
              <label className={`group flex items-start p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                studentType === 'initial' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 hover:border-blue-300'
              }`}>
                <input
                  type="radio"
                  name="processType"
                  value="initial"
                  checked={studentType === 'initial'}
                  onChange={() => setStudentType('initial')}
                  className="mt-2 mr-4 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={isSavingType}
                />
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Shield className="w-5 h-5 text-blue-600 mr-2" />
                    <div className="font-bold text-slate-800 text-lg">First-time F-1 Visa Application</div>
                  </div>
                  <div className="text-slate-600">
                    I am outside the US and need an F-1 student visa to study in America.
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${
                  studentType === 'initial' ? 'transform rotate-90 text-blue-500' : ''
                }`} />
              </label>

              <label className={`group flex items-start p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                studentType === 'transfer' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 hover:border-blue-300'
              }`}>
                <input
                  type="radio"
                  name="processType"
                  value="transfer"
                  checked={studentType === 'transfer'}
                  onChange={() => setStudentType('transfer')}
                  className="mt-2 mr-4 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={isSavingType}
                />
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <GraduationCap className="w-5 h-5 text-green-600 mr-2" />
                    <div className="font-bold text-slate-800 text-lg">School Transfer</div>
                  </div>
                  <div className="text-slate-600">
                    I am already in the US with an F-1 student visa and want to transfer schools.
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${
                  studentType === 'transfer' ? 'transform rotate-90 text-blue-500' : ''
                }`} />
              </label>

              <label className={`group flex items-start p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                studentType === 'change_of_status' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 hover:border-blue-300'
              }`}>
                <input
                  type="radio"
                  name="processType"
                  value="change_of_status"
                  checked={studentType === 'change_of_status'}
                  onChange={() => setStudentType('change_of_status')}
                  className="mt-2 mr-4 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={isSavingType}
                />
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Clock className="w-5 h-5 text-amber-600 mr-2" />
                    <div className="font-bold text-slate-800 text-lg">Status Change</div>
                  </div>
                  <div className="text-slate-600">
                    I am already in the US with another visa (e.g., tourist) and want to change my status to student.
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${
                  studentType === 'change_of_status' ? 'transform rotate-90 text-blue-500' : ''
                }`} />
              </label>
            </div>
            
            <div className="text-center mt-8">
              <button
                className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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

        {/* Step 2: Document Upload */}
        {processType && !documentsApproved && (showDocumentSection || processType) && (
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 mb-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                Upload Required Documents
              </h2>
              <p className="text-slate-600 max-w-xl mx-auto mb-2">
                Please upload the following documents to proceed with your application process.
              </p>
              <p className="text-sm text-slate-500">
                <strong>All files must be clear and legible.</strong> Each field accepts only one file.
              </p>
            </div>

            {/* Document Upload List */}
            <div className="space-y-4 mb-8">
              {DOCUMENT_TYPES.map((doc) => {
                const IconComponent = doc.icon;
                const hasFile = files[doc.key];
                const hasError = fieldErrors[doc.key];
                
                return (
                  <div key={doc.key} className={`relative p-6 rounded-2xl border-2 transition-all duration-200 ${
                    hasError ? 'border-red-300 bg-red-50' :
                    hasFile ? 'border-green-300 bg-green-50' : 
                    'border-slate-200 bg-slate-50 hover:border-blue-300'
                  }`}>
                    <div className="flex items-center gap-6">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0 ${
                        hasError ? 'bg-red-100' :
                        hasFile ? 'bg-green-100' : 'bg-slate-100'
                      }`}>
                        <IconComponent className={`w-6 h-6 ${
                          hasError ? 'text-red-600' :
                          hasFile ? 'text-green-600' : 'text-slate-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800 mb-1">{doc.label}</h3>
                        <p className="text-sm text-slate-600 mb-3">{doc.description}</p>
                        
                        <div className="space-y-3">
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            onChange={(e) => handleFileChange(doc.key, e.target.files?.[0] || null)}
                            disabled={uploading || analyzing}
                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer cursor-pointer"
                          />
                          
                          {hasFile && (
                            <div className="flex items-center text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              <span className="truncate">{hasFile.name}</span>
                            </div>
                          )}
                          
                          {hasError && (
                            <div className="flex items-start text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                              <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                              <span>{hasError}</span>
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
            <div className="text-center flex justify-center items-center space-x-4">
              {Object.values(fieldErrors).some(Boolean) && (
                <button
                  onClick={() => navigate('/student/dashboard/manual-review')}
                  disabled={analyzing}
                  className="bg-amber-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-amber-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  Continue to Manual Review
                </button>
              )}
              
              <button
                onClick={handleUpload}
                disabled={uploading || !allFilesSelected || analyzing}
                className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl p-8 text-center shadow-lg">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-4">
              Documents Approved! ✅
            </h2>
            <p className="text-green-700 text-lg mb-6 max-w-xl mx-auto">
              Excellent! Your documents have been approved and you're ready to proceed with the application fee payment.
            </p>
            <button
              onClick={() => navigate('/student/dashboard/application-fee')}
              className="bg-green-600 text-white px-12 py-4 rounded-2xl font-bold text-lg hover:bg-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <span className="flex items-center justify-center">
                Proceed to Payment
                <ChevronRight className="w-5 h-5 ml-2" />
              </span>
            </button>
          </div>
        )}

        {/* Analysis Loading Overlay */}
        {analyzing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center border border-slate-100 max-w-sm mx-4">
              <div className="relative mb-6">
                <div className="animate-spin h-16 w-16 border-4 border-blue-100 border-t-blue-600 rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-700 text-xl font-bold">
                  AI
                </div>
              </div>
              <div className="text-xl font-bold text-slate-800 mb-2 animate-pulse text-center">
                Analyzing your documents...
              </div>
              <div className="text-slate-500 text-center text-sm">
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