import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Application, UserProfile, Scholarship } from '../../types';
import ApplicationChat from '../../components/ApplicationChat';
import { useApplicationChat } from '../../hooks/useApplicationChat';
import { useAuth } from '../../hooks/useAuth';
import DocumentRequestsCard from '../../components/DocumentRequestsCard';
import ImagePreviewModal from '../../components/ImagePreviewModal';
import { MessageCircle, FileText, UserCircle, Eye, Download, CheckCircle2, XCircle } from 'lucide-react';

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
  // { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'review', label: 'Review', icon: FileText },
];

const StudentDetails: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const chat = useApplicationChat(applicationId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'documents' | 'review'>('details');
  const [acceptanceLoading, setAcceptanceLoading] = useState(false);
  const [rejectingLoading, setRejectingLoading] = useState(false);
  // Removido: student_documents como fonte primária; usaremos application.documents
  const [studentDocs, setStudentDocs] = useState<any[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  // Modal para justificar solicitação de mudanças
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingRejectType, setPendingRejectType] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  // Modal para recusar aluno na bolsa
  const [showRejectStudentModal, setShowRejectStudentModal] = useState(false);
  const [rejectStudentReason, setRejectStudentReason] = useState('');

  useEffect(() => {
    if (applicationId) {
      fetchApplicationDetails();
    }
  }, [applicationId]);

  const fetchApplicationDetails = async () => {
    if (!applicationId) return;

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
        setApplication(data as ApplicationDetails);
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
    }
  };

  // Função para verificar e sincronizar o documents_status
  const syncDocumentsStatus = async () => {
    if (!application?.documents || !application?.user_profiles?.user_id) return;
    
    const allDocsApproved = ['passport', 'diploma', 'funds_proof']
      .every((docType) => {
        const doc = application.documents.find((d: any) => d.type === docType);
        return doc && (doc as any).status === 'approved';
      });
    
    // Se todos os documentos estão aprovados mas o status geral não está, atualizar
    if (allDocsApproved && application.user_profiles.documents_status !== 'approved') {
      await supabase
        .from('user_profiles')
        .update({ documents_status: 'approved' })
        .eq('user_id', application.user_profiles.user_id);
      
      // Atualizar o estado local
      setApplication((prev) => prev ? ({
        ...prev,
        user_profiles: { ...prev.user_profiles, documents_status: 'approved' }
      } as any) : prev);
    }
  };

  // Sincronizar documents_status sempre que a aplicação for carregada
  useEffect(() => {
    if (application && application.user_profiles) {
      syncDocumentsStatus();
    }
  }, [application]);

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

  const { user_profiles: student, scholarships: scholarship } = application;
  const latestDocByType = (type: string) => {
    const docs = (application as any)?.documents as any[] | undefined;
    const appDoc = Array.isArray(docs) ? docs.find((d) => d.type === type) : undefined;
    if (appDoc) return { id: `${type}`, type, file_url: appDoc.url, status: appDoc.status || 'under_review' };
    // fallback compatibilidade
    return studentDocs.find((d) => d.type === type);
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

  const approveDoc = async (type: string) => {
    try {
      setUpdating(type);
      await updateApplicationDocStatus(type, 'approved');
      
      // Buscar a aplicação atualizada para verificar o status real
      const { data: updatedApp } = await supabase
        .from('scholarship_applications')
        .select('documents')
        .eq('id', applicationId)
        .single();
      
      if (updatedApp?.documents) {
        // Verificar se todos os documentos foram aprovados usando os dados atualizados
        const allDocsApproved = ['passport', 'diploma', 'funds_proof']
          .every((docType) => {
            const doc = updatedApp.documents.find((d: any) => d.type === docType);
            return doc && doc.status === 'approved';
          });
        
        // Se todos os documentos foram aprovados, atualizar status geral
        if (allDocsApproved) {
          await supabase
            .from('user_profiles')
            .update({ documents_status: 'approved' })
            .eq('user_id', student.user_id);
          
          // Atualizar o estado local também
          setApplication((prev) => prev ? ({ ...prev, documents: updatedApp.documents } as any) : prev);
        }
      }
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
        .eq('user_id', student.user_id);
    } finally {
      setUpdating(null);
    }
  };

  const allApproved = ['passport', 'diploma', 'funds_proof']
    .every((k) => {
      const d = latestDocByType(k);
      return d && d.file_url && (d.status || '').toLowerCase() === 'approved';
    });

  const approveStudent = async () => {
    try {
      setAcceptanceLoading(true);
      await supabase
        .from('user_profiles')
        .update({ documents_status: 'approved' })
        .eq('user_id', student.user_id);
      // Atualiza a aplicação para liberar Application Fee no dashboard do aluno
      await supabase
        .from('scholarship_applications')
        .update({ status: 'approved' })
        .eq('id', applicationId);
      
      // Busca o email do usuário através de uma consulta separada
      let studentEmail = '';
      try {
        console.log('Buscando email para user_id:', student.user_id);
        
        // Tenta buscar o email através de uma consulta direta
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', student.user_id)
          .single();
        
        console.log('Resultado da busca de email:', userData, userError);
        
        if (userData?.email) {
          studentEmail = userData.email;
          console.log('Email encontrado:', studentEmail);
        } else {
          console.log('Email não encontrado na tabela user_profiles, tentando fallback...');
          // Fallback: tenta buscar através da sessão atual se for o próprio usuário
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser && currentUser.id === student.user_id) {
            studentEmail = currentUser.email || '';
            console.log('Email encontrado via sessão:', studentEmail);
          }
        }
      } catch (emailError) {
        console.error('Erro ao buscar email do usuário:', emailError);
        // Último fallback: tenta buscar através da sessão atual
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser && currentUser.id === student.user_id) {
            studentEmail = currentUser.email || '';
            console.log('Email encontrado via fallback:', studentEmail);
          }
        } catch (fallbackError) {
          console.error('Erro no fallback de busca de email:', fallbackError);
        }
      }
      
      console.log('Email final para webhook:', studentEmail);
      
      // Chama o webhook para notificar sobre o aluno aprovado
      try {
        const webhookPayload = {
          tipo_notf: "Aluno aprovado na bolsa",
          email_aluno: studentEmail,
          nome_aluno: student.full_name,
          email_universidade: user?.email,
          o_que_enviar: `Congratulations, you have been selected for the <strong>${scholarship?.title || 'Bolsa'}</strong> scholarship.`
        };

        await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        });

        // Cria notificação para o estudante
        try {
          console.log('=== DEBUG NOTIFICAÇÃO ===');
          console.log('student object completo:', student);
          console.log('student.user_id:', student.user_id);
          console.log('Tipo de student.user_id:', typeof student.user_id);
          console.log('student.id (se existir):', (student as any).id);
          
          // Busca o perfil do usuário para obter o ID correto
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('id, user_id')
            .eq('user_id', student.user_id)
            .single();
          
          console.log('Perfil encontrado:', { profileData, profileError });
          
          if (profileData) {
            // Usa o ID da tabela user_profiles (não o user_id do auth)
            const studentIdToUse = profileData.id;
            console.log('ID correto para notificação (user_profiles.id):', studentIdToUse);
            
            // Tenta inserir com o ID correto
            const { error: notificationError } = await supabase
              .from('student_notifications')
              .insert({
                student_id: studentIdToUse,
                title: "Scholarship Approved! 🎉",
                message: `Congratulations! You have been selected for the "${scholarship?.title || 'Scholarship'}" program. Check your dashboard for next steps.`,
                link: `/student/dashboard/applications`,
                created_at: new Date().toISOString()
              });

            if (notificationError) {
              console.error('Erro ao criar notificação para o estudante:', notificationError);
              console.log('Detalhes do erro:', {
                code: notificationError.code,
                message: notificationError.message,
                details: notificationError.details
              });
            } else {
              console.log('Notificação criada com sucesso para o estudante');
            }
          } else {
            console.error('Perfil do usuário não encontrado na tabela user_profiles');
            console.log('Não foi possível criar notificação - perfil não existe');
          }
        } catch (notificationError) {
          console.error('Erro ao criar notificação para o estudante:', notificationError);
          // Não falha a aprovação se a notificação falhar
        }
        
      } catch (webhookError) {
        console.error('Erro ao chamar webhook:', webhookError);
        // Não falha a aprovação se o webhook falhar
      }

      await fetchApplicationDetails();
      setActiveTab('details');
    } finally {
      setAcceptanceLoading(false);
    }
  };

  const rejectStudent = async () => {
    try {
      setRejectingLoading(true);
      // Atualiza perfil do aluno para estado rejeitado
      await supabase
        .from('user_profiles')
        .update({ documents_status: 'rejected' })
        .eq('user_id', student.user_id);
      // Atualiza aplicação com status e justificativa
      await supabase
        .from('scholarship_applications')
        .update({ status: 'rejected', notes: rejectStudentReason || null })
        .eq('id', applicationId);
      await fetchApplicationDetails();
      setActiveTab('details');
      setShowRejectStudentModal(false);
      setRejectStudentReason('');
    } finally {
      setRejectingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Student Application
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Review and manage {student.full_name}'s application details
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
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Conteúdo das abas */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 space-y-8">
              {/* Student Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#05294E] to-[#0a4a7a] px-6 py-4">
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
                          <dd className="text-base font-semibold text-slate-900 mt-1">{student.full_name}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Phone</dt>
                          <dd className="text-base text-slate-900 mt-1">{student.phone || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Country</dt>
                          <dd className="text-base text-slate-900 mt-1">{student.country || 'Not specified'}</dd>
                        </div>
                      </div>
                    </div>

                    {/* Academic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Academic Profile</h3>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Field of Interest</dt>
                          <dd className="text-base text-slate-900 mt-1">{student.field_of_interest || 'Not specified'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Academic Level</dt>
                          <dd className="text-base text-slate-900 mt-1">{student.academic_level || 'Not specified'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">GPA</dt>
                          <dd className="text-base text-slate-900 mt-1">{student.gpa || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">English Proficiency</dt>
                          <dd className="text-base text-slate-900 mt-1">{student.english_proficiency || 'Not specified'}</dd>
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
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                student.is_application_fee_paid ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              <span className={`text-sm font-medium ${
                                student.is_application_fee_paid ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {student.is_application_fee_paid ? 'Paid' : 'Pending'}
                              </span>
                            </div>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-600">Documents Status</dt>
                          <dd className="mt-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                student.documents_status === 'approved' ? 'bg-green-500' :
                                student.documents_status === 'rejected' ? 'bg-red-500' :
                                student.documents_status === 'pending' ? 'bg-yellow-500' :
                                student.documents_status === 'analyzing' ? 'bg-blue-500' :
                                'bg-slate-400'
                              }`}></div>
                              <span className={`text-sm font-medium ${
                                student.documents_status === 'approved' ? 'text-green-700' :
                                student.documents_status === 'rejected' ? 'text-red-700' :
                                student.documents_status === 'pending' ? 'text-yellow-700' :
                                student.documents_status === 'analyzing' ? 'text-blue-700' :
                                'text-slate-600'
                              }`}>
                                {student.documents_status === 'approved' ? 'Approved' :
                                 student.documents_status === 'rejected' ? 'Rejected' :
                                 student.documents_status === 'pending' ? 'Pending' :
                                 student.documents_status === 'analyzing' ? 'Analyzing' :
                                 student.documents_status || 'Not Started'}
                              </span>
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
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Scholarship Details
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">Scholarship Program</dt>
                        <dd className="text-lg font-semibold text-slate-900">{scholarship.title}</dd>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">Annual Value</dt>
                        <dd className="text-2xl font-bold text-[#05294E]">
                          ${Number(scholarship.annual_value_with_scholarship ?? 0).toLocaleString()}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-slate-600">Description</dt>
                        <dd className="text-base text-slate-700 leading-relaxed">{scholarship.description}</dd>
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
            </div>

            {/* Sidebar */}
            <div className="xl:col-span-4 space-y-6">
              {/* Quick Stats Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Application Summary</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Submitted</span>
                    <span className="text-sm text-slate-900">
                      {new Date((application as any).created_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Documents</span>
                    <span className="text-sm text-slate-900">
                      {DOCUMENTS_INFO.filter(doc => {
                        const d = latestDocByType(doc.key);
                        return d?.status === 'approved';
                      }).length} / {DOCUMENTS_INFO.length} approved
                    </span>
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <div className="text-sm text-slate-600 mb-2">Progress</div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-[#05294E] to-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(DOCUMENTS_INFO.filter(doc => {
                            const d = latestDocByType(doc.key);
                            return d?.status === 'approved';
                          }).length / DOCUMENTS_INFO.length) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4">
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
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-500 to-slate-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {[
                      { label: 'Chat', tab: 'chat', icon: MessageCircle },
                      { label: 'Documents', tab: 'documents', icon: FileText },
                      { label: 'Review', tab: 'review', icon: FileText }
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
      {/* {activeTab === 'chat' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#05294E] to-[#0a4a7a] px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <MessageCircle className="w-6 h-6 mr-3" />
              Communication Center
            </h2>
            <p className="text-slate-200 text-sm mt-1">Chat with {student.full_name}</p>
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
      )} */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <FileText className="w-6 h-6 mr-3" />
              Document Management
            </h2>
            <p className="text-slate-200 text-sm mt-1">Request and manage student documents</p>
          </div>
          <div className="p-6">
            <DocumentRequestsCard
              applicationId={applicationId!}
              isSchool={true}
              currentUserId={user?.id || ''}
              studentType={(application.student_process_type || 'initial') as any}
              studentUserId={student.user_id}
            />
          </div>
        </div>
      )}
      {activeTab === 'review' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Document Review & Approval
              </h2>
              <p className="text-slate-200 text-sm mt-1">Review each document and approve or request changes</p>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {DOCUMENTS_INFO.map((doc) => {
                  const d = latestDocByType(doc.key);
                  const status = d?.status || 'not_submitted';
                  
                  return (
                    <div key={doc.key} className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-slate-900 text-lg">{doc.label}</h3>
                              <p className="text-sm text-slate-600 mt-1 leading-relaxed">{doc.description}</p>
                            </div>
                            <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                              status === 'approved' ? 'bg-green-100 text-green-800' :
                              status === 'changes_requested' ? 'bg-red-100 text-red-800' :
                              status === 'under_review' ? 'bg-slate-100 text-slate-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              <div className={`w-2 h-2 rounded-full mr-2 ${
                                status === 'approved' ? 'bg-green-500' :
                                status === 'changes_requested' ? 'bg-red-500' :
                                status === 'under_review' ? 'bg-slate-400' :
                                'bg-slate-400'
                              }`} />
                              {status === 'approved' ? 'Approved' :
                               status === 'changes_requested' ? 'Changes Requested' :
                               status === 'under_review' ? 'Under Review' :
                               d?.file_url ? 'Submitted' : 'Not Submitted'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                          {d?.file_url && (
                            <div className="flex gap-2">
                              <a 
                                className="flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors" 
                                href={d.file_url} 
                                target="_blank" 
                                rel="noreferrer"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Preview
                              </a>
                              <a 
                                className="flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors" 
                                href={d.file_url} 
                                download
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </a>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <button
                              disabled={!d || updating === d.type || status === 'approved'}
                              onClick={() => d && approveDoc(d.type)}
                              className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                status === 'approved' 
                                  ? 'bg-green-600 text-white' 
                                  : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              {status === 'approved' ? 'Approved' : 'Approve'}
                            </button>
                            <button
                              disabled={!d || updating === d.type || status === 'approved'}
                              onClick={() => {
                                if (d) {
                                  setPendingRejectType(d.type);
                                  setShowReasonModal(true);
                                }
                              }}
                              className="flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Request Changes
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Final Approval Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Final Application Approval
              </h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-900 font-medium">
                    {allApproved ? 'All documents have been approved' : 'Approve all documents to proceed'}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    This will approve the student's application and allow them to proceed with the next steps.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRejectStudentModal(true)}
                    disabled={acceptanceLoading || rejectingLoading}
                    className="px-5 py-2 rounded-lg font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    Reject Application
                  </button>
                  <button
                    disabled={!allApproved || acceptanceLoading || rejectingLoading}
                    onClick={approveStudent}
                    className="px-5 py-2 rounded-lg font-semibold bg-[#05294E] text-white hover:bg-[#041f38] disabled:opacity-50 transition-colors"
                  >
                    {acceptanceLoading ? 'Approving...' : 'Approve Student'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        {previewUrl && (
          <ImagePreviewModal imageUrl={previewUrl} onClose={() => setPreviewUrl(null)} />
        )}

        {/* Modal para justificar solicitação de mudanças */}
        {showReasonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
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
            <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
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
                  disabled={!rejectStudentReason.trim() || rejectingLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
                >
                  {rejectingLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Rejecting...
                    </>
                  ) : (
                    'Reject Application'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDetails; 