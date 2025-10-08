import React, { useState, useMemo, useEffect } from 'react';
import { Search, Clock, FileText, Globe, Phone, AlertCircle, Eye, Download, CheckCircle2, XCircle, UserCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Scholarship, Application, UserProfile } from '../../types';
import { useUniversity } from '../../context/UniversityContext';
import ProfileCompletionGuard from '../../components/ProfileCompletionGuard';
import { supabase } from '../../lib/supabase';
import { getDocumentStatusDisplay } from '../../utils/documentStatusMapper';
// import { useApplicationChat } from '../../hooks/useApplicationChat'; // Removido pois não está sendo usado
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string;
import DocumentViewerModal from '../../components/DocumentViewerModal';

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
  { id: 'details', label: 'Details', icon: UserCircle }
];

const SelectionProcess: React.FC = () => {
  const { applications, university, refreshData } = useUniversity();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  // States para filtros e pesquisa
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScholarship, setSelectedScholarship] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  
  // States para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // States para o modal de detalhes do estudante
  const [selectedStudent, setSelectedStudent] = useState<ApplicationDetails | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentDocs, setStudentDocs] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details'>('details');
  const [updating, setUpdating] = useState<string | null>(null);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingRejectType, setPendingRejectType] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectStudentModal, setShowRejectStudentModal] = useState(false);
  const [rejectStudentReason, setRejectStudentReason] = useState('');
  const [acceptanceLoading, setAcceptanceLoading] = useState(false);
  const [rejectingLoading, setRejectingLoading] = useState(false);
  
  // const chat = useApplicationChat(selectedStudent?.id); // Removido pois não está sendo usado

  // Filtrar estudantes em processo de seleção OU aprovados que ainda não pagaram as taxas
  const selectionProcessApplications = useMemo(() => {
    const filtered = applications.filter(app => {
      const hasPaidApplicationFee = (app as any).is_application_fee_paid;
      const hasPaidScholarshipFee = (app as any).is_scholarship_fee_paid;
      const bothFeesPaid = hasPaidApplicationFee && hasPaidScholarshipFee;
      const userProfile = (app as any).user_profiles;
      
      // Incluir estudantes que:
      // 1. Estão em processo de seleção (documents_status === 'under_review') E ainda não pagaram ambas as taxas
      // 2. OU foram aprovados (status === 'approved') - independente do status de pagamento
      // 3. OU têm documentos aprovados mas ainda não pagaram ambas as taxas
      return (
        (userProfile?.documents_status === 'under_review' && !bothFeesPaid) || 
        app.status === 'approved' ||
        (userProfile?.documents_status === 'approved' && !bothFeesPaid)
      );
    });
    
    return filtered;
  }, [applications]);

  // Função para buscar detalhes completos do estudante
  const fetchStudentDetails = async (applicationId: string) => {
    setStudentLoading(true);
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
        setSelectedStudent(data as ApplicationDetails);
        setActiveTab('details');
        
        // Buscar documentos
        const appDocs = (data as any).documents;
        if (Array.isArray(appDocs) && appDocs.length > 0) {
          setStudentDocs(appDocs.map((d: any) => ({ type: d.type, file_url: d.url, status: d.status || 'under_review' })));
        } else {
          const profileDocs = (data as any).user_profiles?.documents;
          if (Array.isArray(profileDocs) && profileDocs.length > 0) {
            setStudentDocs(profileDocs.map((d: any) => ({ type: d.type, file_url: d.url, status: d.status || 'under_review' })));
          } else {
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
      console.error("Error fetching student details:", err);
    } finally {
      setStudentLoading(false);
    }
  };

  // Funções para gerenciar documentos (copiadas de StudentDetails)
  const latestDocByType = (type: string) => {
    // Priorizar sempre studentDocs (estado local atualizado)
    const doc = studentDocs.find((d) => d.type === type);
    
    if (doc) {
      return doc;
    }
    
    // Fallback para selectedStudent.documents se não encontrar em studentDocs
    const docs = (selectedStudent as any)?.documents as any[] | undefined;
    const appDoc = Array.isArray(docs) ? docs.find((d) => d.type === type) : undefined;
    
    if (appDoc) {
      return { id: `${type}`, type, file_url: appDoc.url, status: appDoc.status || 'under_review' };
    }
    
    return undefined;
  };


  const approveDoc = async (type: string) => {
    if (!selectedStudent) return;
    
    try {
      setUpdating(type);
      
      // Buscar a aplicação atual para obter os documentos existentes
      const { data: currentApp, error: fetchError } = await supabase
        .from('scholarship_applications')
        .select('documents')
        .eq('id', selectedStudent.id)
        .single();
      
      if (fetchError) {
        throw new Error('Failed to fetch current application: ' + fetchError.message);
      }

      // Preparar os documentos atualizados
      let updatedDocuments = currentApp?.documents || [];
      
      // Garantir que updatedDocuments seja sempre um array
      if (!Array.isArray(updatedDocuments)) {
        console.warn('currentApp.documents is not an array:', updatedDocuments);
        // Se for um objeto vazio {}, converter para array vazio
        if (updatedDocuments && typeof updatedDocuments === 'object' && Object.keys(updatedDocuments).length === 0) {
          updatedDocuments = [];
        } else {
          updatedDocuments = [];
        }
      }
      
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

      // Salvar no banco de dados - scholarship_applications.documents
      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({ documents: updatedDocuments })
        .eq('id', selectedStudent.id);

      if (updateError) {
        throw new Error('Failed to update application documents: ' + updateError.message);
      }

      // Atualizar o estado local dos documentos
      const updatedStudentDocs = studentDocs.map(doc => {
        if (doc.type === type) {
          return { ...doc, status: 'approved' };
        }
        return doc;
      });
      
      setStudentDocs(updatedStudentDocs);

      // Log the document approval action
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', selectedStudent.user_profiles.user_id)
          .single();
        
        if (profile) {
          await supabase.rpc('log_student_action', {
            p_student_id: profile.id,
            p_action_type: 'document_approval',
            p_action_description: `Document ${type} approved by university`,
            p_performed_by: user?.id || '',
            p_performed_by_type: 'university',
            p_metadata: {
              document_type: type,
              application_id: selectedStudent.id,
              university_name: university?.name || 'University',
              approved_by: user?.email || 'University Staff'
            }
          });
        }
      } catch (logError) {
        console.error('Failed to log document approval:', logError);
      }
      
      // Verificar se todos os documentos foram aprovados
      const allDocsApproved = ['passport', 'diploma', 'funds_proof']
        .every((docType) => {
          const doc = updatedStudentDocs.find((d) => d.type === docType);
          return doc && doc.status === 'approved';
        });
      
      if (allDocsApproved) {
        // Atualizar o contexto global para refletir as mudanças
        await refreshData();
      }
    } catch (error: any) {
      console.error(`Error approving document ${type}:`, error);
      alert(`Failed to approve document: ${error.message || 'Unknown error'}`);
    } finally {
      setUpdating(null);
    }
  };

  const requestChangesDoc = async (type: string, reason: string) => {
    if (!selectedStudent) return;
    try {
      setUpdating(type);
      
      // Buscar a aplicação atual para obter os documentos existentes
      const { data: currentApp, error: fetchError } = await supabase
        .from('scholarship_applications')
        .select('documents')
        .eq('id', selectedStudent.id)
        .single();
      
      if (fetchError) {
        throw new Error('Failed to fetch current application: ' + fetchError.message);
      }

      // Preparar os documentos atualizados
      let updatedDocuments = currentApp?.documents || [];
      
      // Garantir que updatedDocuments seja sempre um array
      if (!Array.isArray(updatedDocuments)) {
        console.warn('currentApp.documents is not an array:', updatedDocuments);
        // Se for um objeto vazio {}, converter para array vazio
        if (updatedDocuments && typeof updatedDocuments === 'object' && Object.keys(updatedDocuments).length === 0) {
          updatedDocuments = [];
        } else {
          updatedDocuments = [];
        }
      }
      
      const existingDocIndex = updatedDocuments.findIndex((d: any) => d.type === type);
      
      if (existingDocIndex >= 0) {
        // Atualizar documento existente
        updatedDocuments[existingDocIndex] = {
          ...updatedDocuments[existingDocIndex],
          status: 'changes_requested',
          changes_requested_at: new Date().toISOString(),
          changes_requested_by: user?.id,
          review_notes: reason || undefined
        };
      } else {
        // Adicionar novo documento com mudanças solicitadas
        updatedDocuments.push({
          type,
          status: 'changes_requested',
          changes_requested_at: new Date().toISOString(),
          changes_requested_by: user?.id,
          review_notes: reason || undefined
        });
      }

      // Salvar no banco de dados - scholarship_applications.documents
      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({ documents: updatedDocuments })
        .eq('id', selectedStudent.id);

      if (updateError) {
        throw new Error('Failed to update application documents: ' + updateError.message);
      }

      // Atualizar o estado local dos documentos
      const updatedStudentDocs = studentDocs.map(doc => {
        if (doc.type === type) {
          return { ...doc, status: 'changes_requested' };
        }
        return doc;
      });
      
      setStudentDocs(updatedStudentDocs);
      
      // Manter o fluxo do aluno em revisão
      await supabase
        .from('user_profiles')
        .update({ documents_status: 'under_review' })
        .eq('user_id', selectedStudent.user_profiles.user_id);

      // Log the document rejection action
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', selectedStudent.user_profiles.user_id)
          .single();
        
        if (profile) {
          await supabase.rpc('log_student_action', {
            p_student_id: profile.id,
            p_action_type: 'document_rejection',
            p_action_description: `Document ${type} rejected by university - changes requested`,
            p_performed_by: user?.id || '',
            p_performed_by_type: 'university',
            p_metadata: {
              document_type: type,
              application_id: selectedStudent.id,
              university_name: university?.name || 'University',
              rejected_by: user?.email || 'University Staff',
              rejection_reason: reason || 'Changes requested',
              changes_requested_at: new Date().toISOString()
            }
          });
        }
      } catch (logError) {
        console.error('Failed to log document rejection:', logError);
      }

      // Webhook + notificação no sino para "Request Changes"
      try {
        // Buscar e-mail do aluno
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email, full_name')
          .eq('user_id', selectedStudent.user_profiles.user_id)
          .single();

        // Montar mensagem amigável
        const titleMap: Record<string, string> = {
          passport: 'Passport',
          diploma: 'High School Diploma',
          funds_proof: 'Proof of Funds',
        };
        const docLabel = titleMap[type] || type;

        // Enviar webhook (se tiver e-mail)
        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: 'Changes Requested',
            email_aluno: userData.email,
            nome_aluno: userData.full_name || selectedStudent.user_profiles.full_name,
            email_universidade: user?.email,
            o_que_enviar: `Changes were requested for your document <strong>${docLabel}</strong>. Reason: <strong>${reason || 'Please review the instructions'}</strong>.`
          };

          try {
            const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            });
            if (!webhookResponse.ok) {
              console.error('Webhook (Request Changes) erro:', await webhookResponse.text());
            }
          } catch (e) {
            console.error('Erro ao enviar webhook (Request Changes):', e);
          }
        }

        // Notificação in-app no sino (Edge Function)
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;
          if (accessToken) {
            const notificationPayload = {
              user_id: selectedStudent.user_profiles.user_id,
              title: 'Changes requested',
              message: `Changes were requested for your document: ${docLabel}. Reason: ${reason || 'Please review the instructions'}.`,
              type: 'document_changes_requested',
              link: `/student/dashboard/application/${selectedStudent.id}/chat?tab=documents`,
            };
            const resp = await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify(notificationPayload),
            });
            if (!resp.ok) {
              let txt = '';
              try { txt = await resp.text(); } catch {}
              console.error('Edge Function (Request Changes) erro:', txt);
            }
          } else {
            console.error('Access token não encontrado (Request Changes)');
          }
        } catch (e) {
          console.error('Erro ao enviar notificação in-app (Request Changes):', e);
        }
      } catch (notifyErr) {
        console.error('Falha notificando aluno (Request Changes):', notifyErr);
      }
    } finally {
      setUpdating(null);
    }
  };

  const approveStudent = async () => {
    if (!selectedStudent) return;
    try {
      setAcceptanceLoading(true);
      
      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({ status: 'approved' })
        .eq('id', selectedStudent.id)
        .select();

      if (updateError) {
        console.error('Erro ao atualizar status da aplicação:', updateError);
        throw new Error('Failed to update application status: ' + updateError.message);
      }

      // Atualizar também o documents_status no perfil do usuário
      const { error: profileUpdateError } = await supabase
        .from('user_profiles')
        .update({ documents_status: 'approved' })
        .eq('user_id', selectedStudent.user_profiles.user_id);

      if (profileUpdateError) {
        console.error('Erro ao atualizar documents_status:', profileUpdateError);
      }

      // Log the student approval action
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', selectedStudent.user_profiles.user_id)
          .single();
        
        if (profile) {
          await supabase.rpc('log_student_action', {
            p_student_id: profile.id,
            p_action_type: 'application_approval',
            p_action_description: `Scholarship application approved by university`,
            p_performed_by: user?.id || '',
            p_performed_by_type: 'university',
            p_metadata: {
              application_id: selectedStudent.id,
              scholarship_id: selectedStudent.scholarship_id,
              scholarship_title: selectedStudent.scholarships?.title || 'Scholarship',
              university_name: university?.name || 'University',
              approved_by: user?.email || 'University Staff',
              approval_date: new Date().toISOString(),
              student_name: selectedStudent.user_profiles.full_name
            }
          });
        }
      } catch (logError) {
        console.error('Failed to log student approval:', logError);
      }

      // Webhook e notificação (simplificado)
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', selectedStudent.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Aluno aprovado na bolsa",
            email_aluno: userData.email,
            nome_aluno: selectedStudent.user_profiles.full_name,
            email_universidade: user?.email,
            o_que_enviar: `Congratulations, you have been selected for the <strong>${selectedStudent.scholarships?.title || 'Bolsa'}</strong> scholarship.`
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

          // Enviar também notificação in-app para o aluno (sino)
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
                  user_id: selectedStudent.user_profiles.user_id,
                  title: 'Scholarship approved',
                  message: `You have been selected for the ${selectedStudent.scholarships?.title || 'scholarship'}.`,
                  type: 'scholarship_approved',
                  link: '/student/dashboard',
                }),
              });
            }
          } catch (e) {
            console.error('Error sending in-app student notification:', e);
          }
        }
      } catch (error) {
        console.error('Error sending webhook:', error);
      }

      // Atualizar o estado local antes de fechar
      if (selectedStudent) {
        // Atualizar o status na aplicação local
        const updatedStudent = {
          ...selectedStudent,
          status: 'approved' as const
        };
        setSelectedStudent(updatedStudent);
        
        // Também atualizar o estado local dos documentos para refletir que estão aprovados
        const updatedStudentDocs = studentDocs.map(doc => ({
          ...doc,
          status: 'approved'
        }));
        setStudentDocs(updatedStudentDocs);
        
      }
      
      // Verificar se a atualização foi persistida no banco
      const { error: verifyError } = await supabase
        .from('scholarship_applications')
        .select('id, status, student_id, scholarship_id')
        .eq('id', selectedStudent.id)
        .single();

      if (verifyError) {
        console.error('Erro ao verificar atualização:', verifyError);
      }

      // Atualizar o contexto global para refletir as mudanças
      
      // Forçar uma atualização completa dos dados
      await refreshData();
      
      // Aguardar um pouco para garantir que os dados foram atualizados
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Atualizar novamente para garantir sincronização
      await refreshData();
      
      // Fechar o modal após um breve delay para mostrar o sucesso
      setTimeout(() => {
        setSelectedStudent(null);
        setActiveTab('details');
      }, 1000);
    } finally {
      setAcceptanceLoading(false);
    }
  };

  const rejectStudent = async () => {
    if (!selectedStudent) return;
    try {
      setRejectingLoading(true);
      await supabase
        .from('user_profiles')
        .update({ documents_status: 'rejected' })
        .eq('user_id', selectedStudent.user_profiles.user_id);
      
      await supabase
        .from('scholarship_applications')
        .update({ status: 'rejected', notes: rejectStudentReason || null })
        .eq('id', selectedStudent.id);

      // Log the student rejection action
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', selectedStudent.user_profiles.user_id)
          .single();
        
        if (profile) {
          await supabase.rpc('log_student_action', {
            p_student_id: profile.id,
            p_action_type: 'application_rejection',
            p_action_description: `Scholarship application rejected by university`,
            p_performed_by: user?.id || '',
            p_performed_by_type: 'university',
            p_metadata: {
              application_id: selectedStudent.id,
              scholarship_id: selectedStudent.scholarship_id,
              scholarship_title: selectedStudent.scholarships?.title || 'Scholarship',
              university_name: university?.name || 'University',
              rejected_by: user?.email || 'University Staff',
              rejection_reason: rejectStudentReason || 'Application rejected',
              rejection_date: new Date().toISOString(),
              student_name: selectedStudent.user_profiles.full_name
            }
          });
        }
      } catch (logError) {
        console.error('Failed to log student rejection:', logError);
      }
      
      // Atualizar o contexto global para refletir as mudanças
      await refreshData();
      
      setSelectedStudent(null);
      setActiveTab('details');
      setShowRejectStudentModal(false);
      setRejectStudentReason('');
    } finally {
      setRejectingLoading(false);
    }
  };

  const allApproved = selectedStudent && ['passport', 'diploma', 'funds_proof']
    .every((k) => {
      // Priorizar documentos da aplicação específica
      const applicationDocuments = selectedStudent.documents || [];
      const appDoc = applicationDocuments.find((d: any) => d.type === k);
      
      if (appDoc && (appDoc as any).status === 'approved') {
        return true;
      }
      
      // Fallback para studentDocs se não encontrar na aplicação
      const d = studentDocs.find(doc => doc.type === k);
      return d && d.file_url && (d.status || '').toLowerCase() === 'approved';
    });

  // Extrai bolsas únicas das aplicações em processo de seleção
  const scholarships: Scholarship[] = Array.from(
    selectionProcessApplications
      .map(app => app.scholarships)
      .filter((s): s is Scholarship => !!s)
      .reduce((map, scholarship) => {
        if (!map.has(scholarship.id)) map.set(scholarship.id, scholarship);
        return map;
      }, new Map<string, Scholarship>()).values()
  );

  // Extrai países únicos
  const countries = useMemo(() => {
    const countrySet = new Set<string>();
    selectionProcessApplications.forEach(app => {
      const country = (app as any).user_profiles?.country;
      if (country) countrySet.add(country);
    });
    return Array.from(countrySet).sort();
  }, [selectionProcessApplications]);

  // Filtra aplicações
  const filteredApplications = useMemo(() => {
    let filtered = selectionProcessApplications;

    // Filtro por bolsa
    if (selectedScholarship) {
      filtered = filtered.filter(app => app.scholarship_id === selectedScholarship);
    }

    // Filtro por país
    if (selectedCountry) {
      filtered = filtered.filter(app => (app as any).user_profiles?.country === selectedCountry);
    }

    // Filtro por termo de pesquisa
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(app => {
        const student = (app as any).user_profiles;
        return (
          student?.full_name?.toLowerCase().includes(term) ||
          student?.name?.toLowerCase().includes(term) ||
          student?.phone?.includes(term) ||
          student?.country?.toLowerCase().includes(term)
        );
      });
    }

    return filtered;
  }, [selectionProcessApplications, selectedScholarship, selectedCountry, searchTerm]);

  // Ordenação aplicada antes da paginação
  const sortedApplications = useMemo(() => {
    const arr = [...filteredApplications];

    const normalizeName = (app: any) => ((app as any).user_profiles?.full_name || (app as any).user_profiles?.name || '').toString().toLowerCase();
    const createdAt = (app: any) => new Date((app as any).created_at || 0).getTime();
    const statusRank = (status?: string) => {
      const s = (status || '').toLowerCase();
      if (s === 'enrolled') return 0;
      if (s === 'approved') return 1;
      if (s === 'under_review') return 2;
      if (s === 'pending') return 3;
      return 9;
    };

    const documentProgress = (app: any) => {
      const { reviewed, total } = getDocumentProgress(app);
      return reviewed / Math.max(total, 1);
    };

    switch (sortBy) {
      case 'oldest':
        arr.sort((a, b) => createdAt(a) - createdAt(b));
        break;
      case 'name_asc':
        arr.sort((a, b) => normalizeName(a).localeCompare(normalizeName(b)));
        break;
      case 'name_desc':
        arr.sort((a, b) => normalizeName(b).localeCompare(normalizeName(a)));
        break;
      case 'status':
        arr.sort((a, b) => statusRank((a as any).status) - statusRank((b as any).status));
        break;
      case 'docs_progress':
        arr.sort((a, b) => documentProgress(b) - documentProgress(a));
        break;
      case 'newest':
      default:
        arr.sort((a, b) => createdAt(b) - createdAt(a));
        break;
    }

    return arr;
  }, [filteredApplications, sortBy]);

  // Lógica de paginação
  const totalPages = Math.ceil(sortedApplications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedApplications = sortedApplications.slice(startIndex, endIndex);

  // Reset para primeira página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedScholarship, selectedCountry]);

  // Função para obter contagem de documentos analisados
  const getDocumentProgress = (app: any) => {
    const documents = app.documents || [];
    
    // Verificar se documents é realmente um array
    if (!Array.isArray(documents)) {
      console.warn('Documents is not an array:', documents);
      return { reviewed: 0, total: 3 };
    }
    
    const totalDocs = 3; // passport, diploma, funds_proof
    const reviewedDocs = documents.filter((doc: any) => 
      doc.status === 'approved' || doc.status === 'changes_requested'
    ).length;
    
    return { reviewed: reviewedDocs, total: totalDocs };
  };

  // New Request Modal State
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [newDocumentRequest, setNewDocumentRequest] = useState({
    title: '',
    description: '',
    due_date: '',
    attachment: null as File | null,
  });
  const [creatingDocumentRequest, setCreatingDocumentRequest] = useState(false);

  // Document Rejection Modal State
  const [showRejectDocumentModal, setShowRejectDocumentModal] = useState(false);
  const [pendingRejectDocumentId, setPendingRejectDocumentId] = useState<string | null>(null);
  const [rejectDocumentReason, setRejectDocumentReason] = useState('');

  // Acceptance Letter Upload State
  const [acceptanceLetterFile, setAcceptanceLetterFile] = useState<File | null>(null);
  const [acceptanceLetterUploaded, setAcceptanceLetterUploaded] = useState<boolean>(false);
  const [uploadingAcceptanceLetter, setUploadingAcceptanceLetter] = useState<boolean>(false);

  // State para documentos enviados pelo aluno
  const [studentDocuments, setStudentDocuments] = useState<any[]>([]);
  // State para requests criados pela universidade
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);

    // Função para buscar documentos enviados pelo aluno
  const fetchStudentDocuments = async () => {
    if (!selectedStudent) return;
    
    try {
      // Simplificar a busca para evitar erros 400
      // Buscar apenas uploads básicos sem inner join complexo
      const { data: uploads, error } = await supabase
        .from('document_request_uploads')
        .select('*')
        .eq('uploaded_by', selectedStudent.user_profiles.user_id);
      
      if (error) {
        console.error('Erro ao buscar uploads:', error);
        setStudentDocuments([]);
        return;
      }

      if (!uploads || uploads.length === 0) {
        setStudentDocuments([]);
        return;
      }

      // Formatar os documentos para exibição de forma simples
      const studentDocuments = uploads.map(upload => ({
        id: upload.id,
        filename: upload.file_url?.split('/').pop() || 'Document',
        file_url: upload.file_url,
        status: upload.status || 'under_review',
        uploaded_at: upload.uploaded_at || upload.created_at,
        request_title: 'Document Upload',
        request_description: 'Student uploaded document',
        request_created_at: upload.created_at,
        is_global: false,
        request_type: 'Individual Upload'
      }));

      setStudentDocuments(studentDocuments);
    } catch (error) {
      console.error("Error in fetchStudentDocuments:", error);
      setStudentDocuments([]);
    }
  };



  // Função para buscar requests criados pela universidade
  const fetchDocumentRequests = async () => {
    if (!selectedStudent) return;
    
    try {
      // Buscar requests específicos para esta aplicação
      const { data: requests, error: requestsError } = await supabase
        .from('document_requests')
        .select('*')
        .eq('scholarship_application_id', selectedStudent.id)
        .order('created_at', { ascending: false });
      
      if (requestsError) {
        console.error("Error fetching document requests:", requestsError);
        setDocumentRequests([]);
        return;
      }

      // Buscar uploads para cada request
      if (requests && requests.length > 0) {
        const requestIds = requests.map(req => req.id);
        
        const { data: uploads, error: uploadsError } = await supabase
          .from('document_request_uploads')
          .select('*')
          .in('document_request_id', requestIds);

        if (uploadsError) {
          console.error("Error fetching uploads:", uploadsError);
        } else {
          // Associar uploads aos requests
          const requestsWithUploads = requests.map(request => ({
            ...request,
            uploads: uploads?.filter(upload => upload.document_request_id === request.id) || []
          }));
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

  // Função para baixar arquivo
  const handleDownloadDocument = async (doc: any) => {
    if (!doc.file_url) return;
    try {
      const { data, error } = await supabase.storage
        .from('student-documents')
        .download(doc.file_url);
      
      if (error) {
        throw new Error('Failed to download document: ' + error.message);
      }

      const arrayBuffer = await data.arrayBuffer();
      const blob = new Blob([arrayBuffer]);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.filename || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Failed to download document: ${err.message}`);
    }
  };

  // Função para visualizar arquivo
  const handleViewDocument = (doc: any) => {
    // Verificar se é file_url ou url
    const fileUrl = doc.file_url || doc.url;
    
    if (!fileUrl) return;
    
    // Converter a URL do storage para URL pública
    try {
      // Se fileUrl é um path do storage, converter para URL pública
      if (fileUrl && !fileUrl.startsWith('http')) {
        const publicUrl = supabase.storage
          .from('student-documents')
          .getPublicUrl(fileUrl)
          .data.publicUrl;
        
        setPreviewUrl(publicUrl);
      } else {
        // Se já é uma URL completa, usar diretamente
        setPreviewUrl(fileUrl);
      }
    } catch (error) {
      console.error('Erro ao gerar URL pública:', error);
      // Fallback: tentar usar a URL original
      setPreviewUrl(fileUrl);
    }
  };


  // Função para visualizar upload de um request
  const handleViewUpload = (upload: any) => {
    if (!upload.file_url) return;
    
    // Converter a URL do storage para URL pública
    try {
      // Se file_url é um path do storage, converter para URL pública
      if (upload.file_url && !upload.file_url.startsWith('http')) {
        const publicUrl = supabase.storage
          .from('student-documents')
          .getPublicUrl(upload.file_url)
          .data.publicUrl;
        
        setPreviewUrl(publicUrl);
      } else {
        // Se já é uma URL completa, usar diretamente
        setPreviewUrl(upload.file_url);
      }
    } catch (error) {
      console.error('Erro ao gerar URL pública:', error);
      // Fallback: tentar usar a URL original
      setPreviewUrl(upload.file_url);
    }
  };

  // Função para aprovar documento enviado pelo aluno
  const handleApproveDocument = async (uploadId: string) => {
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
        .eq('id', uploadId)
        .single();

      if (fetchError) {
        throw new Error('Failed to fetch upload data: ' + fetchError.message);
      }

      // Atualizar o status para aprovado
      const { error } = await supabase
        .from('document_request_uploads')
        .update({ status: 'approved' })
        .eq('id', uploadId);
      
      if (error) {
        throw new Error('Failed to approve document: ' + error.message);
      }

      // Enviar notificação ao aluno
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', selectedStudent?.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Documento aprovado",
            email_aluno: userData.email,
            nome_aluno: selectedStudent?.user_profiles.full_name,
            email_universidade: user?.email,
            o_que_enviar: `Congratulations! Your document <strong>${uploadData.file_url?.split('/').pop()}</strong> for the request <strong>${uploadData.document_requests?.title}</strong> has been approved.`
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
            } else {
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
                  user_id: selectedStudent?.user_profiles.user_id,
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

      // Recarregar os dados para mostrar o novo status
      if (selectedStudent) {
        fetchStudentDocuments();
      }

      alert('Document approved successfully! The student will be notified.');
    } catch (err: any) {
      console.error("Error approving document:", err);
      alert(`Failed to approve document: ${err.message}`);
    }
  };

  // Função para rejeitar documento enviado pelo aluno
  const handleRejectDocument = async (uploadId: string, reason: string) => {
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
        .eq('id', uploadId)
        .single();

      if (fetchError) {
        throw new Error('Failed to fetch upload data: ' + fetchError.message);
      }

      // Atualizar o status para rejeitado
      const { error } = await supabase
        .from('document_request_uploads')
        .update({ 
          status: 'rejected',
          review_notes: reason || null
        })
        .eq('id', uploadId);
      
      if (error) {
        throw new Error('Failed to reject document: ' + error.message);
      }

      // Enviar notificação ao aluno
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', selectedStudent?.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Changes Requested",
            email_aluno: userData.email,
            nome_aluno: selectedStudent?.user_profiles.full_name,
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
            } else {
            }
          } catch (webhookError) {
            console.error('Erro ao enviar webhook:', webhookError);
          }
        }

        // Notificação in-app no sino do aluno — deve ser enviada SEMPRE, independente do e-mail
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;
          
          if (accessToken) {
            const notificationPayload = {
              user_id: selectedStudent?.user_profiles.user_id,
              title: t('notifications.documentRejected.title'),
              message: t('notifications.documentRejected.message', { 
                fileName: uploadData.file_url?.split('/').pop(),
                reason: reason 
              }),
              type: 'document_rejected',
              link: '/student/dashboard/applications',
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
              console.error('Erro ao fazer parse da resposta da Edge Function:', parseError);
              const responseText = await response.text();
              console.error('Resposta da Edge Function (texto):', responseText);
            }
            
            if (!response.ok) {
              console.error('Erro na Edge Function:', responseData);
            } else {
              console.log('✅ Notificação de rejeição enviada com sucesso:', responseData);
            }
          } else {
            console.error('Access token não encontrado');
          }
        } catch (e) {
          console.error('Error sending in-app student notification:', e);
          console.error('Error details:', e);
        }
      } catch (notificationError) {
        console.error('Error sending rejection notification:', notificationError);
      }

      // Recarregar os dados para mostrar o novo status
      if (selectedStudent) {
        fetchStudentDocuments();
      }

      alert('Document rejected successfully! The student will be notified.');
    } catch (err: any) {
      console.error("Error rejecting document:", err);
      alert(`Failed to reject document: ${err.message}`);
    }
  };

  // Função para selecionar arquivo da carta de aceite
  const handleAcceptanceLetterFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAcceptanceLetterFile(file);
      setAcceptanceLetterUploaded(false);
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
    if (!selectedStudent || !acceptanceLetterFile) {
      alert('Please select a file first.');
      return;
    }

    setUploadingAcceptanceLetter(true);
    try {
      // Sanitizar o nome do arquivo e gerar chave segura
      const sanitizedFileName = sanitizeFileName(acceptanceLetterFile.name);
      const fileName = `acceptance_letters/${Date.now()}_${sanitizedFileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(fileName, acceptanceLetterFile);

      if (uploadError) {
        throw new Error('Failed to upload file: ' + uploadError.message);
      }

      // Atualizar a aplicação com a URL da carta de aceite
      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({
          acceptance_letter_url: uploadData.path,
          acceptance_letter_status: 'approved',
          acceptance_letter_sent_at: new Date().toISOString(),
          status: 'enrolled'
        })
        .eq('id', selectedStudent.id);

      if (updateError) {
        throw new Error('Failed to update application: ' + updateError.message);
      }

      // Atualizar o perfil do usuário
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          documents_status: 'approved',
          enrollment_status: 'enrolled'
        })
        .eq('user_id', selectedStudent.user_profiles.user_id);

      if (profileError) {
        console.error('Error updating user profile:', profileError);
      }



      setAcceptanceLetterUploaded(true);
      alert('Acceptance letter processed successfully! The student is now enrolled and will be notified.');
      
      // Recarregar dados do estudante
      if (selectedStudent) {
        fetchStudentDetails(selectedStudent.id);
      }
    } catch (err: any) {
      console.error("Error processing acceptance letter:", err);
      alert(`Failed to process acceptance letter: ${err.message}`);
    } finally {
      setUploadingAcceptanceLetter(false);
    }
  };

  // Effect para buscar documentos e requests quando o estudante for selecionado
  useEffect(() => {
    if (selectedStudent) {
      // Debug: verificar todas as tabelas relacionadas
      debugAllTables();
      
      fetchStudentDocuments();
      fetchDocumentRequests();
      
      // Verificar se já existe carta de aceite
      if (selectedStudent.acceptance_letter_url) {
        setAcceptanceLetterUploaded(true);
      } else {
        setAcceptanceLetterUploaded(false);
      }
      
      // Verificar se o estudante deve ser movido para a página Students
      checkIfStudentShouldBeMoved(selectedStudent);
    }
  }, [selectedStudent]);
  

  
  // Função para verificar se o estudante deve ser movido para a página Students
  const checkIfStudentShouldBeMoved = (student: ApplicationDetails) => {
    const hasPaidApplicationFee = (student as any).is_application_fee_paid;
    const hasPaidScholarshipFee = (student as any).is_scholarship_fee_paid;
    
    if (hasPaidApplicationFee && hasPaidScholarshipFee) {
      // Atualizar o status para 'approved' para mover para a página Students
      updateStudentStatusToApproved(student.id);
    }
  };
  
  // Função para atualizar o status do estudante para 'approved'
  const updateStudentStatusToApproved = async (applicationId: string) => {
    try {
      // Apenas atualizar o status da aplicação para 'approved'
      // NÃO alterar o documents_status - isso deve ser controlado separadamente
      // pela aprovação de documentos pela universidade
      const { error: appError } = await supabase
        .from('scholarship_applications')
        .update({ status: 'approved' })
        .eq('id', applicationId);
      
      if (appError) {
        console.error('Error updating application status:', appError);
        return;
      }
      
      
      // Fechar o modal de detalhes do estudante
      setSelectedStudent(null);
      
      // Recarregar os dados para refletir as mudanças
      if (university) {
        // Forçar recarregamento dos dados
        window.location.reload();
      }
    } catch (err) {
      console.error('Error in updateStudentStatusToApproved:', err);
    }
  };

  // Função de debug para verificar todas as tabelas relacionadas
  const debugAllTables = async () => {
    if (!selectedStudent) return;
    
    try {
      // 1. Verificar student_documents
      const { data: studentDocs, error: studentDocsError } = await supabase
        .from('student_documents')
        .select('*')
        .eq('user_id', selectedStudent.user_profiles.user_id);
      
      // 2. Verificar document_requests
      const { data: docRequests, error: docRequestsError } = await supabase
        .from('document_requests')
        .select('*')
        .eq('scholarship_application_id', selectedStudent.id);
      
      // 3. Verificar document_request_uploads (TODOS)
      const { data: docUploads, error: docUploadsError } = await supabase
        .from('document_request_uploads')
        .select('*');
      
      // 4. Verificar document_request_uploads com relacionamento
      const { data: docUploadsWithRel, error: docUploadsRelError } = await supabase
        .from('document_request_uploads')
        .select(`
          *,
          document_requests!inner(
            id,
            title,
            description,
            is_global,
            university_id,
            scholarship_application_id
          )
        `);
      
      // 5. Verificar document_request_uploads filtrados por uploaded_by
      const { data: docUploadsByUser, error: docUploadsByUserError } = await supabase
        .from('document_request_uploads')
        .select(`
          *,
          document_requests!inner(
            id,
            title,
            description,
            is_global,
            university_id,
            scholarship_application_id
          )
        `)
        .eq('uploaded_by', selectedStudent.user_profiles.user_id);
      
      // 6. Verificar scholarship_applications documents
      const { data: appDocs, error: appDocsError } = await supabase
        .from('scholarship_applications')
        .select('documents')
        .eq('id', selectedStudent.id);
      
      // 7. Verificar user_profiles documents
      const { data: profileDocs, error: profileDocsError } = await supabase
        .from('user_profiles')
        .select('documents')
        .eq('user_id', selectedStudent.user_profiles.user_id);
      
    } catch (error) {
      console.error('Error in debugAllTables:', error);
    }
  };

  const handleCreateDocumentRequest = async () => {
    if (!selectedStudent) return;
    setCreatingDocumentRequest(true);
    try {
      let attachment_url = '';
      
      // Upload do arquivo se houver
      if (newDocumentRequest.attachment) {
        const { data, error } = await supabase.storage
          .from('student-documents')
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
        .eq('id', selectedStudent.id)
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
        scholarship_application_id: selectedStudent.id
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
        console.error('Erro ao fazer parse do JSON de resposta:', e);
      }

      if (!response.ok || !result.success) {
        throw new Error('Failed to create request: ' + (result.error || 'Unknown error'));
      }

      // Enviar notificação para o aluno
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', selectedStudent.user_profiles.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Nova solicitação de documento",
            email_aluno: userData.email,
            nome_aluno: selectedStudent.user_profiles.full_name,
            email_universidade: user?.email,
            o_que_enviar: `A new document request has been submitted for your review: <strong>${newDocumentRequest.title}</strong>. Please log in to your dashboard to view the details and upload the requested document.`
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
            } else {
            }
          } catch (webhookError) {
            console.error('Erro ao enviar webhook:', webhookError);
          }
        }
      } catch (error) {
        console.error('Error sending webhook:', error);
      }

      // Fechar modal e limpar formulário
      setShowNewRequestModal(false);
      setNewDocumentRequest({ title: '', description: '', due_date: '', attachment: null });
      
      // Recarregar dados para mostrar o novo request
      if (selectedStudent) {
        fetchDocumentRequests();
        fetchStudentDocuments();
      }
      
      // Mostrar mensagem de sucesso
      alert('Document request created successfully! The student will be notified.');
    } catch (err: any) {
      console.error("Error creating document request:", err);
      alert(`Failed to create document request: ${err.message}`);
    } finally {
      setCreatingDocumentRequest(false);
    }
  };

  // Quando um estudante é selecionado mostramos um overlay/modal —
  // desabilita o scroll no body para evitar navegar pela página debaixo
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    if (selectedStudent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = previousOverflow || '';
    }
    return () => {
      document.body.style.overflow = previousOverflow || '';
    };
  }, [selectedStudent]);

  return (
    <ProfileCompletionGuard 
      isProfileCompleted={university?.profile_completed}
      title="Complete your profile to manage selection process"
      description="Finish setting up your university profile to view and manage student selection process"
    >
      <div className="min-h-screen">
        {/* Header + Filters Section */}
        <div className="w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="max-w-full mx-auto bg-slate-50">
              {/* Header: title + note + counter */}
              <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                    Students in Process & Approved
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-slate-600">
                    Students in the selection process or already approved. Approved students are waiting for fee payments to complete enrollment.
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    Students will be moved to the Students page after both fees are paid: the application fee and the scholarship fee.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                    <Clock className="w-5 h-5 mr-2" />
                    {selectionProcessApplications.filter(app => app.status !== 'approved').length} In Process
                  </div>
                  <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {selectionProcessApplications.filter(app => app.status === 'approved').length} Approved
                  </div>
                </div>
              </div>

              {/* Separation and Filters row */}
              <div className="border-t border-slate-200 bg-white">
                <div className="px-4 sm:px-6 lg:px-8 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Search Bar */}
                    <div className="lg:col-span-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                          type="text"
                          placeholder="Search students in selection process..."
                          className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Scholarship Filter */}
                    <div>
                      <select
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                        value={selectedScholarship}
                        onChange={(e) => setSelectedScholarship(e.target.value)}
                      >
                        <option value="">All Scholarships</option>
                        {scholarships.map(s => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                    </div>

                    {/* Country Filter */}
                    <div>
                      <select
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                      >
                        <option value="">All Countries</option>
                        {countries.map(country => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sort By */}
                    <div>
                      <select
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        aria-label="Sort By"
                      >
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="name_asc">Name A–Z</option>
                        <option value="name_desc">Name Z–A</option>
                        <option value="status">Status</option>
                        <option value="docs_progress">Documents Reviewed</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Selection Process Summary */}
          {selectionProcessApplications.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900">Selection Process & Approved Students</h3>
                    <p className="text-xs sm:text-sm text-slate-600">
                      {selectionProcessApplications.filter(app => app.status !== 'approved').length} students in process, {selectionProcessApplications.filter(app => app.status === 'approved').length} approved - all waiting for fee payments
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 text-center sm:text-right">
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">{selectionProcessApplications.filter(app => app.status !== 'approved').length}</div>
                    <div className="text-xs sm:text-sm text-slate-600">In Process</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-green-600">{selectionProcessApplications.filter(app => app.status === 'approved').length}</div>
                    <div className="text-xs sm:text-sm text-slate-600">Approved</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Students Grid */}
          <div className="space-y-4">
            {paginatedApplications.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center">
                {selectionProcessApplications.length === 0 ? (
                  <>
                    <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">No students in process or approved</h3>
                    <p className="text-sm sm:text-base text-slate-600">All students have completed their fee payments and moved to the Students page.</p>
                  </>
                ) : (
                  <>
                    <Search className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">No students found</h3>
                    <p className="text-sm sm:text-base text-slate-600">Try adjusting your filters or search terms.</p>
                  </>
                )}
              </div>
            ) : (
              paginatedApplications.map((app) => {
                const student = (app as any).user_profiles;
                const progress = getDocumentProgress(app);
                const hasUrgentAction = progress.reviewed < progress.total;

                return (
                  <div
                    key={app.id} 
                    onClick={() => fetchStudentDetails(app.id)}
                    className="block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer"
                  >
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                          {student?.avatar_url ? (
                            <img
                              src={student.avatar_url}
                              alt={student?.full_name || student?.name || 'Student Avatar'}
                              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border border-slate-200 bg-slate-100 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-semibold text-base sm:text-lg">
                                {(student?.full_name || student?.name || 'U')[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-semibold text-slate-900 break-words">
                              {student?.full_name || student?.name || 'Unknown Student'}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-600 mt-1">
                              {student?.country && (
                                <div className="flex items-center">
                                  <Globe className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                                  <span className="truncate">{student.country}</span>
                                </div>
                              )}
                              {student?.phone && (
                                <div className="flex items-center">
                                  <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                                  <span className="truncate">{student.phone}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Document Progress */}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <div className="flex items-center space-x-1">
                                <FileText className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                <span className="text-xs text-slate-600">
                                  Documents: {progress.reviewed}/{progress.total} reviewed
                                </span>
                              </div>
                              {app.status === 'approved' ? (
                                (() => {
                                  const hasPaidApplicationFee = (app as any).is_application_fee_paid;
                                  const hasPaidScholarshipFee = (app as any).is_scholarship_fee_paid;
                                  const bothFeesPaid = hasPaidApplicationFee && hasPaidScholarshipFee;
                                  
                                  if (bothFeesPaid) {
                                    return (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Fees Paid
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Waiting for Fees
                                      </span>
                                    );
                                  }
                                })()
                              ) : hasUrgentAction && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Needs Review
                                </span>
                              )}
                            </div>
                            
                            {/* Scholarship Information */}
                            {(app as any).scholarships && (
                              <div className="mt-2">
                                <span className="text-xs text-slate-600 break-words">
                                  <span className="font-medium">Scholarship:</span> {(app as any).scholarships.title}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      
                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-3">
                          <span className={`inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium border ${
                            app.status === 'approved' 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {app.status === 'approved' ? (
                              <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                            ) : (
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                            )}
                            {app.status === 'approved' ? 'Approved' : 'In Review'}
                          </span>
                          <div className="text-xs sm:text-sm text-slate-500 text-right">
                            Applied: {new Date((app as any).created_at || Date.now()).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {sortedApplications.length > itemsPerPage && (
            <div className="bg-white mt-4 rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Results Info */}
                <div className="text-sm text-slate-600">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, sortedApplications.length)}</span> of{' '}
                  <span className="font-medium">{sortedApplications.length}</span> students
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center space-x-2">
                  {/* Previous Button */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber;
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === pageNumber
                              ? 'bg-[#05294E] text-white'
                              : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Student Details View */}
        {selectedStudent && (
          <div className="fixed inset-0 lg:left-72 bg-black bg-opacity-50 z-40 overflow-y-auto">
            <div className="min-h-full bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
              

              {/* Page Title and Navigation Section */}
              <div className="bg-white border-b border-slate-200 pt-20">
                <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
                    <div className="min-w-0 flex-1">
                      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
                        Student Application
                      </h1>
                      <p className="mt-1 text-sm text-slate-600 break-words">
                        Review and manage {selectedStudent.user_profiles.full_name}'s application details
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setSelectedStudent(null)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        <X className="w-4 h-4 mr-1.5" />
                        Close
                      </button>
                      {selectedStudent.status === 'approved' ? (
                        <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          Approved
                        </div>
                      ) : selectedStudent.status === 'enrolled' || selectedStudent.acceptance_letter_status === 'approved' ? (
                        <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          Enrolled
                        </div>
                      ) : (
                        <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700 border border-blue-300">
                          <Clock className="w-4 h-4 mr-1.5" />
                          In Review
                        </div>
                        )}
                    </div>
                  </div>
                  
                  {/* Navigation Tabs */}
                  <nav className="flex space-x-8 overflow-x-auto border-b border-slate-200" role="tablist">
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

              {/* Student Details Content */}
              <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {studentLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E]"></div>
                  </div>
                ) : (
                  <>
                    {activeTab === 'details' && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 space-y-6">
                          {/* Student Information Card */}
                          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-[#05294E] to-[#0a4a7a] px-4 sm:px-5 py-3">
                              <h2 className="text-base sm:text-lg font-semibold text-white flex items-center">
                                <UserCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                Student Information
                              </h2>
                            </div>
                            <div className="p-4 sm:p-5">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                                {/* Personal Information */}
                                <div className="space-y-4">
                                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Personal Details</h3>
                                  <div className="space-y-3">
                                    <div>
                                      <dt className="text-xs sm:text-sm font-medium text-slate-600">Full Name</dt>
                                      <dd className="text-sm sm:text-base font-semibold text-slate-900 mt-1 break-words">{selectedStudent.user_profiles.full_name}</dd>
                                    </div>
                                    <div>
                                      <dt className="text-xs sm:text-sm font-medium text-slate-600">Email</dt>
                                      <dd className="text-sm sm:text-base text-slate-900 mt-1 break-words">{selectedStudent.user_profiles.email || 'Not provided'}</dd>
                                    </div>
                                    <div>
                                      <dt className="text-xs sm:text-sm font-medium text-slate-600">Phone</dt>
                                      <dd className="text-sm sm:text-base text-slate-900 mt-1">{selectedStudent.user_profiles.phone || 'Not provided'}</dd>
                                    </div>
                                    <div>
                                      <dt className="text-xs sm:text-sm font-medium text-slate-600">Country</dt>
                                      <dd className="text-sm sm:text-base font-semibold text-slate-900 mt-1">{selectedStudent.user_profiles.country || 'Not specified'}</dd>
                                    </div>
                                  </div>
                                </div>

                                {/* Academic Information */}
                                <div className="space-y-4">
                                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Academic Profile</h3>
                                  <div className="space-y-3">
                                    <div>
                                      <dt className="text-xs sm:text-sm font-medium text-slate-600">Field of Interest</dt>
                                      <dd className="text-sm sm:text-base font-semibold text-slate-900 mt-1 break-words">{selectedStudent.user_profiles.field_of_interest || 'Not specified'}</dd>
                                    </div>
                                    <div>
                                      <dt className="text-xs sm:text-sm font-medium text-slate-600">Academic Level</dt>
                                      <dd className="text-sm sm:text-base font-semibold text-slate-900 mt-1">{selectedStudent.user_profiles.academic_level || 'Not specified'}</dd>
                                    </div>
                                    <div>
                                      <dt className="text-xs sm:text-sm font-medium text-slate-600">GPA</dt>
                                      <dd className="text-sm sm:text-base font-semibold text-slate-900 mt-1">{selectedStudent.user_profiles.gpa || 'Not provided'}</dd>
                                    </div>
                                    <div>
                                      <dt className="text-xs sm:text-sm font-medium text-slate-600">English Proficiency</dt>
                                      <dd className="text-sm sm:text-base font-semibold text-slate-900 mt-1">{selectedStudent.user_profiles.english_proficiency || 'Not specified'}</dd>
                                    </div>
                                  </div>
                                </div>

                                {/* Application & Status */}
                                <div className="space-y-4">
                                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Application Status</h3>
                                  <div className="space-y-3">
                                    <div>
                                      <dt className="text-xs sm:text-sm font-medium text-slate-600">Student Type</dt>
                                      <dd className="text-sm sm:text-base font-semibold text-slate-900 mt-1 break-words">
                                        {selectedStudent.student_process_type === 'initial' ? 'Initial - F-1 Visa Required' :
                                         selectedStudent.student_process_type === 'transfer' ? 'Transfer - Current F-1 Student' :
                                         selectedStudent.student_process_type === 'change_of_status' ? 'Change of Status - From Other Visa' :
                                         selectedStudent.student_process_type || 'Not specified'}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-xs sm:text-sm font-medium text-slate-600">Application Fee</dt>
                                      <dd className="mt-1">
                                        <div className="flex items-center space-x-2">
                                          <div className={`w-2 h-2 rounded-full ${
                                            (selectedStudent as any).is_application_fee_paid ? 'bg-green-500' : 'bg-red-500'
                                          }`}></div>
                                          <span className={`text-xs sm:text-sm font-medium ${
                                            (selectedStudent as any).is_application_fee_paid ? 'text-green-700' : 'text-red-700'
                                          }`}>
                                            {(selectedStudent as any).is_application_fee_paid ? 'Paid' : 'Pending'}
                                          </span>
                                        </div>
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-xs sm:text-sm font-medium text-slate-600">Documents Status</dt>
                                      <dd className="mt-1">
                                        <div className="flex items-center space-x-2">
                                          {(() => {
                                            // Calcular o status baseado nos documentos da aplicação específica
                                            const applicationDocuments = selectedStudent.documents || [];
                                            const requiredDocs = ['passport', 'diploma', 'funds_proof'];
                                            
                                            let documentsStatus = 'under_review';
                                            
                                            if (Array.isArray(applicationDocuments) && applicationDocuments.length > 0) {
                                              const allApproved = requiredDocs.every(docType => {
                                                const doc = applicationDocuments.find((d: any) => d.type === docType);
                                                return doc && (doc as any).status === 'approved';
                                              });
                                              
                                              if (allApproved) {
                                                documentsStatus = 'approved';
                                              } else {
                                                const hasRejected = requiredDocs.some(docType => {
                                                  const doc = applicationDocuments.find((d: any) => d.type === docType);
                                                  return doc && (doc as any).status === 'changes_requested';
                                                });
                                                
                                                if (hasRejected) {
                                                  documentsStatus = 'changes_requested';
                                                }
                                              }
                                            }
                                            
                                            const statusDisplay = getDocumentStatusDisplay(documentsStatus);
                                            return (
                                              <>
                                                <div className={`w-2 h-2 rounded-full ${statusDisplay.bgColor}`}></div>
                                                <span className={`text-xs sm:text-sm font-medium ${statusDisplay.color}`}>
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
                                        <div className="flex items-center space-x-2">
                                          <div className={`w-2 h-2 rounded-full ${
                                            selectedStudent.status === 'approved' ? 'bg-green-500' :
                                            selectedStudent.acceptance_letter_status === 'approved' ? 'bg-green-500' :
                                            selectedStudent.acceptance_letter_status === 'sent' ? 'bg-blue-500' :
                                            selectedStudent.acceptance_letter_status === 'signed' ? 'bg-purple-500' :
                                            selectedStudent.acceptance_letter_status === 'pending' ? 'bg-yellow-500' :
                                            'bg-slate-400'
                                          }`}></div>
                                          <span className={`text-sm font-medium ${
                                            selectedStudent.status === 'approved' ? 'text-green-700' :
                                            selectedStudent.acceptance_letter_status === 'approved' ? 'text-green-700' :
                                            selectedStudent.acceptance_letter_status === 'sent' ? 'text-blue-700' :
                                            selectedStudent.acceptance_letter_status === 'signed' ? 'text-purple-700' :
                                            selectedStudent.acceptance_letter_status === 'pending' ? 'text-yellow-700' :
                                            'text-slate-600'
                                          }`}>
                                            {selectedStudent.status === 'approved' ? 'Approved' :
                                             selectedStudent.acceptance_letter_status === 'approved' ? 'Enrolled' :
                                             selectedStudent.acceptance_letter_status === 'sent' ? 'Letter Sent' :
                                             selectedStudent.acceptance_letter_status === 'signed' ? 'Letter Signed' :
                                             selectedStudent.acceptance_letter_status === 'pending' ? 'Pending' :
                                             selectedStudent.acceptance_letter_status || 'Not Started'}
                                          </span>
                                        </div>
                                      </dd>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Scholarship Information Card */}
                          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-3">
                              <h2 className="text-lg font-semibold text-white flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                                Scholarship Details
                              </h2>
                            </div>
                            <div className="p-5">
                              <div className="space-y-6">
                                <div className="flex items-start space-x-3">
                                  <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                                  <div className="flex-1">
                                    <dt className="text-sm font-medium text-slate-600">Scholarship Program</dt>
                                    <dd className="text-lg font-semibold text-slate-900">{selectedStudent.scholarships.title}</dd>
                                  </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                  <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                                  <div className="flex-1">
                                    <dt className="text-sm font-medium text-slate-600">Annual Value</dt>
                                    <dd className="text-2xl font-bold text-[#05294E]">
                                      ${Number(selectedStudent.scholarships.annual_value_with_scholarship ?? 0).toLocaleString()}
                                    </dd>
                                  </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                  <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                                  <div className="flex-1">
                                    <dt className="text-sm font-medium text-slate-600">Description</dt>
                                    <dd className="text-base text-slate-700 leading-relaxed">{selectedStudent.scholarships.description}</dd>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Document Review & Approval Section */}
                          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-4 sm:px-5 py-3">
                              <h2 className="text-base sm:text-lg font-semibold text-white flex items-center">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Document Review & Approval
                              </h2>
                              <p className="text-slate-200 text-xs sm:text-sm mt-1">Review each document and approve or request changes</p>
                            </div>
                            <div className="p-4 sm:p-5">
                              <div className="space-y-0">
                                {DOCUMENTS_INFO.map((doc, index) => {
                                  const d = latestDocByType(doc.key);
                                  const status = d?.status || 'not_submitted';
                                  
                                  return (
                                    <div key={doc.key}>
                                      <div className="bg-white p-3 sm:p-4">
                                        <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
                                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 mb-2">
                                              <p className="text-sm sm:text-base font-medium text-slate-900">{doc.label}</p>
                                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
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
                                            <p className="text-xs sm:text-sm text-slate-600 mb-2">{doc.description}</p>
                                            {d?.file_url && (
                                              <p className="text-xs text-slate-400 mb-3">
                                                Uploaded: {d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : new Date().toLocaleDateString()}
                                              </p>
                                            )}
                                            
                                            {/* Botões responsivos */}
                                            <div className="flex flex-col sm:flex-row gap-2">
                                              {/* Botões de Preview e Download */}
                                              {d?.file_url && (
                                                <div className="flex gap-2">
                                                  <button 
                                                    onClick={() => handleViewDocument(d)}
                                                    className="flex-1 sm:flex-initial flex items-center justify-center px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors" 
                                                  >
                                                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                                                    Preview
                                                  </button>
                                                  <button 
                                                    onClick={() => handleDownloadDocument(d)}
                                                    className="flex-1 sm:flex-initial flex items-center justify-center px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors" 
                                                  >
                                                    <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                                                    Download
                                                  </button>
                                                </div>
                                              )}
                                              
                                                                              {/* Botões de Approve e Request Changes */}
                                <div className="flex gap-2">
                                  <button
                                    disabled={!d || updating === d.type || status === 'approved' || selectedStudent?.status === 'approved'}
                                    onClick={() => {
                                      if (d) approveDoc(d.type);
                                    }}
                                    className={`flex-1 sm:flex-initial flex items-center justify-center px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                                      status === 'approved' 
                                        ? 'bg-green-600 text-white' 
                                        : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'
                                    }`}
                                  >
                                    <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                                    {status === 'approved' ? 'Approved' : 'Approve'}
                                  </button>
                                  <button
                                    disabled={!d || updating === d.type || status === 'approved' || selectedStudent?.status === 'approved'}
                                    onClick={() => {
                                      if (d) {
                                        setPendingRejectType(d.type);
                                        setShowReasonModal(true);
                                      }
                                    }}
                                    className="flex-1 sm:flex-initial flex items-center justify-center px-3 py-2 text-xs sm:text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                                  >
                                    <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                                    <span className="hidden sm:inline">Request Changes</span>
                                    <span className="sm:hidden">Changes</span>
                                  </button>
                                </div>
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

                          {/* Final Application Approval Section */}
                          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-4 sm:px-5 py-3">
                              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center">
                                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                Final Application Approval
                              </h3>
                            </div>
                            <div className="p-4 sm:p-5">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm sm:text-base text-slate-900 font-medium">
                                    {selectedStudent?.status === 'approved' ? 'Student application has been approved' : 
                                     allApproved ? 'All documents have been approved' : 'Approve all documents to proceed'}
                                  </p>
                                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                                    {selectedStudent?.status === 'approved' ? 'The student can now proceed with the next steps in the enrollment process.' :
                                     'This will approve the student\'s application and allow them to proceed with the next steps.'}
                                  </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                  <button
                                    onClick={() => setShowRejectStudentModal(true)}
                                    disabled={acceptanceLoading || rejectingLoading || selectedStudent?.status === 'approved'}
                                    className="px-4 sm:px-5 py-2 rounded-lg font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors text-center"
                                  >
                                    {selectedStudent?.status === 'approved' ? 'Application Approved' : 'Reject Application'}
                                  </button>
                                  <button
                                    disabled={!allApproved || acceptanceLoading || rejectingLoading || selectedStudent?.status === 'approved'}
                                    onClick={approveStudent}
                                    className="px-4 sm:px-5 py-2 rounded-lg font-semibold bg-[#05294E] text-white hover:bg-[#041f38] disabled:opacity-50 transition-colors text-center"
                                  >
                                    {selectedStudent?.status === 'approved' ? 'Approved' : (acceptanceLoading ? 'Approving...' : 'Approve Student')}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-4 space-y-6">
                          {/* Quick Stats Card */}
                          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-4 sm:px-5 py-3">
                              <h3 className="text-base sm:text-lg font-semibold text-white">Application Summary</h3>
                            </div>
                            <div className="p-4 sm:p-5 space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-xs sm:text-sm text-slate-600">Status</span>
                                <span className="text-xs sm:text-sm text-slate-900">
                                  {selectedStudent.status === 'enrolled' || selectedStudent.acceptance_letter_status === 'approved' ? 'Approved' : 'Pending'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Recent Activity Card */}
                          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-5 py-3">
                              <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                            </div>
                            <div className="p-5">
                              <div className="space-y-3">
                                <div className="flex items-start space-x-3">
                                  <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                                  <div className="flex-1">
                                    <p className="text-sm text-slate-900">Application submitted</p>
                                    <p className="text-xs text-slate-500">{new Date((selectedStudent as any).created_at || Date.now()).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                {(selectedStudent as any).updated_at !== (selectedStudent as any).created_at && (
                                  <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                                    <div className="flex-1">
                                      <p className="text-sm text-slate-900">Last updated</p>
                                      <p className="text-xs text-slate-500">{new Date((selectedStudent as any).updated_at || Date.now()).toLocaleDateString()}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>


                        </div>
                      </div>
                    )}

                    
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* New Request Modal */}
        {showNewRequestModal && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-lg mx-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
              <h3 className="font-extrabold text-lg sm:text-xl mb-4 sm:mb-6 text-[#05294E] text-center">New Document Request</h3>
              <p className="text-xs sm:text-sm text-slate-600 mb-4 sm:mb-6 text-center">
                Request a new document from {selectedStudent.user_profiles.full_name}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    Document Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="border border-slate-300 rounded-lg px-3 sm:px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-sm sm:text-base"
                    placeholder="e.g., Additional Reference Letter"
                    value={newDocumentRequest.title}
                    onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="border border-slate-300 rounded-lg px-3 sm:px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-sm sm:text-base min-h-[80px] resize-vertical"
                    placeholder="Describe what document you need and any specific requirements..."
                    value={newDocumentRequest.description}
                    onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    className="border border-slate-300 rounded-lg px-3 sm:px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-sm sm:text-base"
                    type="date"
                    value={newDocumentRequest.due_date}
                    onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    Template/Attachment (Optional)
                  </label>
                  <div className="flex flex-col sm:flex-row items-start gap-3">
                    <label className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition font-medium text-slate-700 text-xs sm:text-sm">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
                      <span className="text-xs text-slate-700 truncate max-w-[200px]">
                        {newDocumentRequest.attachment.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 mt-6 sm:mt-8">
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

        {/* Document Preview Modal */}
        {previewUrl && (
          <DocumentViewerModal documentUrl={previewUrl} onClose={() => setPreviewUrl(null)} />
        )}

        {/* Modal para justificar solicitação de mudanças */}
        {showReasonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-4 sm:p-6 max-w-lg w-full mx-4">
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-4">Request Changes</h3>
              <p className="text-xs sm:text-sm text-slate-600 mb-4">
                Please provide a reason for requesting changes to this document. This will help the student understand what needs to be fixed.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full h-24 sm:h-32 p-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                placeholder="Enter your reason here..."
              />
              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4">
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

        {/* Document Rejection Modal */}
        {showRejectDocumentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4 border border-slate-200">
              <h3 className="font-extrabold text-xl mb-6 text-[#05294E] text-center">Reject Document</h3>
              <p className="text-sm text-slate-600 mb-6 text-center">
                Please provide a reason for rejecting this document. This will help the student understand what needs to be corrected.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base min-h-[100px] resize-vertical"
                    placeholder="Explain why this document was rejected and what needs to be corrected..."
                    value={rejectDocumentReason}
                    onChange={(e) => setRejectDocumentReason(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-8">
                <button
                  className="flex-1 bg-slate-200 text-slate-800 px-4 py-2 rounded-lg font-medium hover:bg-slate-300 transition"
                  onClick={() => {
                    setShowRejectDocumentModal(false);
                    setPendingRejectDocumentId(null);
                    setRejectDocumentReason('');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
                  onClick={() => {
                    if (pendingRejectDocumentId && rejectDocumentReason.trim()) {
                      handleRejectDocument(pendingRejectDocumentId, rejectDocumentReason);
                      setShowRejectDocumentModal(false);
                      setPendingRejectDocumentId(null);
                      setRejectDocumentReason('');
                    }
                  }}
                  disabled={!rejectDocumentReason.trim()}
                >
                  Reject Document
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProfileCompletionGuard>
  );
};

export default SelectionProcess;
