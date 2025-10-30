import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { useAuth } from '../../hooks/useAuth';
import { useStudentLogs } from '../../hooks/useStudentLogs';
import DocumentsView from '../../components/EnhancedStudentTracking/DocumentsView';
import AdminScholarshipSelection from '../../components/AdminDashboard/AdminScholarshipSelection';
import StudentLogsView from '../../components/AdminDashboard/StudentLogsView';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import { generateTermAcceptancePDF, StudentTermAcceptanceData } from '../../utils/pdfGenerator';
// Função simples de toast
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white font-medium transition-all duration-300 ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
};
import { 
  User,
  Eye,
  FileText,
  Award,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Building,
  Edit3,
  Save,
  X,
  AlertTriangle,
  Download,
  Calendar,
  Globe,
  Users,
  MessageCircle,
  ExternalLink
} from 'lucide-react';

interface StudentRecord {
  student_id: string;
  user_id: string;
  student_name: string;
  student_email: string;
  phone?: string | null;
  country?: string | null;
  field_of_interest?: string | null;
  academic_level?: string | null;
  gpa?: number | null;
  english_proficiency?: string | null;
  status?: string | null;
  avatar_url?: string | null;
  dependents?: number;
  desired_scholarship_range?: number | null;
  student_created_at: string;
  has_paid_selection_process_fee: boolean;
  has_paid_i20_control_fee: boolean;
  selection_process_fee_payment_method?: string | null;
  i20_control_fee_payment_method?: string | null;
  seller_referral_code: string | null;
  application_id: string | null;
  scholarship_id: string | null;
  application_status: string | null;
  applied_at: string | null;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  application_fee_payment_method?: string | null;
  scholarship_fee_payment_method?: string | null;
  acceptance_letter_status: string | null;
  student_process_type: string | null;
  payment_status: string | null;
  scholarship_title: string | null;
  university_name: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  is_locked: boolean;
  total_applications: number;
  all_applications: any[];
  admin_notes?: string | null;
}

interface TermAcceptance {
  id: string;
  user_id: string;
  term_id: string;
  term_type: string;
  accepted_at: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user_email?: string;
  user_full_name?: string;
  term_title?: string;
  term_content?: string;
}

const AdminStudentDetails: React.FC = () => {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedApps, setExpandedApps] = useState<{[key: string]: boolean}>({});
  const [dependents, setDependents] = useState<number>(0);
  const [approvingDocs, setApprovingDocs] = useState<{[key: string]: boolean}>({});
  const [rejectingDocs, setRejectingDocs] = useState<{[key: string]: boolean}>({});
  const [uploadingDocs, setUploadingDocs] = useState<{[key: string]: boolean}>({});
  const [showRejectDocModal, setShowRejectDocModal] = useState(false);
  const [rejectDocData, setRejectDocData] = useState<{applicationId: string, docType: string} | null>(null);
  const [rejectDocReason, setRejectDocReason] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingFees, setEditingFees] = useState<{[key: string]: number} | null>(null);
  const [savingFees, setSavingFees] = useState(false);
  const [markingAsPaid, setMarkingAsPaid] = useState<{[key: string]: boolean}>({});
  const [approvingStudent, setApprovingStudent] = useState(false);
  const [rejectingStudent, setRejectingStudent] = useState(false);
  const [showRejectStudentModal, setShowRejectStudentModal] = useState(false);
  const [rejectStudentReason, setRejectStudentReason] = useState('');
  const [pendingRejectAppId, setPendingRejectAppId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'scholarships' | 'logs'>('overview');
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploadingDocumentRequest, setUploadingDocumentRequest] = useState<{[key: string]: boolean}>({});
  const [approvingDocumentRequest, setApprovingDocumentRequest] = useState<{[key: string]: boolean}>({});
  const [rejectingDocumentRequest, setRejectingDocumentRequest] = useState<{[key: string]: boolean}>({});
  const [deletingDocumentRequest, setDeletingDocumentRequest] = useState<{[key: string]: boolean}>({});
  const [isEditingProcessType, setIsEditingProcessType] = useState(false);
  const [editingProcessType, setEditingProcessType] = useState('');
  const [savingProcessType, setSavingProcessType] = useState(false);
  // Estado para modal de visualização de documentos
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Debug: Log do estado previewUrl
  React.useEffect(() => {
    console.log('🔍 [ADMIN] previewUrl state changed:', previewUrl);
    if (previewUrl) {
      console.log('🔍 [ADMIN] Modal should be visible now');
      // Verificar se o modal está sendo renderizado
      setTimeout(() => {
        const modal = document.querySelector('.document-viewer-overlay');
        console.log('🔍 [ADMIN] Modal element found:', modal);
        if (modal) {
          console.log('🔍 [ADMIN] Modal is visible:', (modal as HTMLElement).style.display !== 'none');
        } else {
          console.log('❌ [ADMIN] Modal element NOT found in DOM');
        }
      }, 100);
    }
  }, [previewUrl]);
  // Campo de notas do admin - agora como lista
  const [adminNotes, setAdminNotes] = useState<Array<{
    id: string;
    content: string;
    created_by: string;
    created_by_name: string;
    created_at: string;
  }>>([]);
  const [savingNotes, setSavingNotes] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Estados para edição de métodos de pagamento
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<string | null>(null);
  const [newPaymentMethod, setNewPaymentMethod] = useState<'stripe' | 'zelle' | 'manual'>('manual');
  const [savingPaymentMethod, setSavingPaymentMethod] = useState(false);
  
  // Estados para seleção de aplicação quando há múltiplas aprovadas
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [editingApplicationId, setEditingApplicationId] = useState<string | null>(null);
  // Modal de confirmação de pagamento
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{
    feeType: 'selection_process' | 'application' | 'scholarship' | 'i20_control';
    applicationId?: string;
    feeName: string;
  } | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'zelle' | 'manual'>('manual');
  // Criação de Document Request pelo Admin
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [creatingDocumentRequest, setCreatingDocumentRequest] = useState(false);
  const [newDocumentRequest, setNewDocumentRequest] = useState<{ title: string; description: string; due_date: string; attachment: File | null }>({
    title: '',
    description: '',
    due_date: '',
    attachment: null
  });
  
  // Estados para edição de template
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [editingTemplateRequestId, setEditingTemplateRequestId] = useState<string | null>(null);
  const [editingTemplateFile, setEditingTemplateFile] = useState<File | null>(null);
  const [currentTemplateUrl, setCurrentTemplateUrl] = useState<string | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  // Upload de Acceptance Letter (Admin) - Removido pois agora está no DocumentsView
  const [isProgressExpanded, setIsProgressExpanded] = useState(false);
  const [i20Deadline, setI20Deadline] = useState<Date | null>(null);
  
  // Estados para termos aceitos
  const [termAcceptances, setTermAcceptances] = useState<TermAcceptance[]>([]);
  const [loadingTermAcceptances, setLoadingTermAcceptances] = useState(false);
  
  // Estados para formulário de transferência
  const [transferFormFile, setTransferFormFile] = useState<File | null>(null);
  const [uploadingTransferForm, setUploadingTransferForm] = useState(false);
  const [transferFormUploads, setTransferFormUploads] = useState<any[]>([]);
  const [pendingZellePayments, setPendingZellePayments] = useState<any[]>([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [pendingRejectUploadId, setPendingRejectUploadId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [referralInfo, setReferralInfo] = useState<{
    type: 'seller' | 'affiliate' | 'student' | null;
    name: string | null;
    email: string | null;
    company?: string | null;
    affiliateName?: string | null;
    affiliateEmail?: string | null;
    isRewards?: boolean;
  } | null>(null);

  const { user, userProfile } = useAuth();
  const isPlatformAdmin = user?.role === 'admin';

  const { getFeeAmount, formatFeeAmount, hasOverride, userSystemType } = useFeeConfig(student?.user_id);
  const { logAction } = useStudentLogs(student?.student_id || '');

  // Função para buscar informações de referência
  // Função para buscar termos aceitos pelo estudante
  const fetchTermAcceptances = async (userId: string) => {
    try {
      setLoadingTermAcceptances(true);
      
      // Buscar aceitações do estudante
      const { data: acceptances, error: acceptancesError } = await supabase
        .from('comprehensive_term_acceptance')
        .select('*')
        .eq('user_id', userId)
        .order('accepted_at', { ascending: false });

      if (acceptancesError) throw acceptancesError;

      if (!acceptances || acceptances.length === 0) {
        setTermAcceptances([]);
        return;
      }

      // Buscar informações dos termos
      const termIds = [...new Set(acceptances.map(a => a.term_id))];
      const { data: terms, error: termsError } = await supabase
        .from('application_terms')
        .select('id, title, content')
        .in('id', termIds);

      if (termsError) throw termsError;

      // Buscar informações do usuário se não estiver disponível
      let userEmail = student?.student_email;
      let userFullName = student?.student_name;
      
      if (!userEmail || !userFullName) {
        const { data: userProfile, error: userError } = await supabase
          .from('user_profiles')
          .select('email, full_name')
          .eq('user_id', userId)
          .single();
          
        if (!userError && userProfile) {
          userEmail = userEmail || userProfile.email;
          userFullName = userFullName || userProfile.full_name;
        }
      }

      // Criar mapa para lookup rápido
      const termMap = new Map(terms?.map(t => [t.id, t]) || []);

      // Combinar os dados
      const transformedData = acceptances.map(acceptance => ({
        id: acceptance.id,
        user_id: acceptance.user_id,
        term_id: acceptance.term_id,
        term_type: acceptance.term_type,
        accepted_at: acceptance.accepted_at,
        ip_address: acceptance.ip_address,
        user_agent: acceptance.user_agent,
        created_at: acceptance.created_at,
        user_email: userEmail || acceptance.user_email || 'N/A',
        user_full_name: userFullName || acceptance.user_full_name || 'N/A',
        term_title: termMap.get(acceptance.term_id)?.title || 'N/A',
        term_content: termMap.get(acceptance.term_id)?.content || ''
      }));

      // Debug log para verificar os dados
      console.log('🔍 [TermAcceptances] Debug data for user:', userId);
      console.log('  - userEmail:', userEmail);
      console.log('  - userFullName:', userFullName);
      console.log('  - student?.student_email:', student?.student_email);
      console.log('  - student?.student_name:', student?.student_name);
      console.log('  - transformedData:', transformedData);

      setTermAcceptances(transformedData);
    } catch (error: any) {
      console.error('Error loading term acceptances:', error);
    } finally {
      setLoadingTermAcceptances(false);
    }
  };

  const handleDeleteDocumentRequest = async (requestId: string) => {
    if (!student) return;
    
    try {
      setDeletingDocumentRequest(prev => ({ ...prev, [`delete-${requestId}`]: true }));
      
      // Primeiro, deletar todos os uploads relacionados ao request
      const { error: deleteUploadsError } = await supabase
        .from('document_request_uploads')
        .delete()
        .eq('document_request_id', requestId);

      if (deleteUploadsError) throw deleteUploadsError;

      // Depois, deletar o document request
      const { error: deleteRequestError } = await supabase
        .from('document_requests')
        .delete()
        .eq('id', requestId);

      if (deleteRequestError) throw deleteRequestError;

      // Log da ação de exclusão
      await logAction(
        'document_request_deleted',
        `Document request deleted by admin`,
        user?.id || '',
        'admin',
        {
          request_id: requestId,
          deleted_by: user?.email || 'Admin'
        }
      );

      showToast('Document request deleted successfully!', 'success');

      // Recarregar document requests
      await fetchDocumentRequests();
      
    } catch (error: any) {
      console.error('Error deleting document request:', error);
      showToast(`Failed to delete document request: ${error.message}`, 'error');
    } finally {
      setDeletingDocumentRequest(prev => ({ ...prev, [`delete-${requestId}`]: false }));
    }
  };

  const handleEditProcessType = () => {
    setIsEditingProcessType(true);
    setEditingProcessType(student?.student_process_type || '');
  };

  const handleSaveProcessType = async () => {
    if (!student || !editingProcessType) return;

    try {
      setSavingProcessType(true);

      // Atualizar todas as aplicações do estudante
      const { error } = await supabase
        .from('scholarship_applications')
        .update({ student_process_type: editingProcessType })
        .eq('student_id', student.student_id);

      if (error) {
        console.error('Erro ao atualizar student_process_type:', error);
        showToast('Erro ao atualizar tipo de processo', 'error');
        return;
      }

      // Atualizar o estado local
      setStudent(prev => prev ? { ...prev, student_process_type: editingProcessType } : null);
      
      setIsEditingProcessType(false);
      showToast('Tipo de processo atualizado com sucesso');

      // Log da ação
      await logAction(
        'student_process_type_updated',
        `Student process type updated by admin`,
        user?.id || '',
        'admin',
        {
          student_id: student.student_id,
          old_process_type: student.student_process_type,
          new_process_type: editingProcessType,
          updated_by: user?.email || 'Admin'
        }
      );

    } catch (error) {
      console.error('Erro ao salvar student_process_type:', error);
      showToast('Erro ao salvar tipo de processo', 'error');
    } finally {
      setSavingProcessType(false);
    }
  };

  const handleCancelProcessType = () => {
    setIsEditingProcessType(false);
    setEditingProcessType('');
  };

  const fetchReferralInfo = async (referralCode: string) => {
    if (!referralCode) {
      setReferralInfo(null);
      return;
    }

    try {
      // 0) Matricula Rewards: códigos iniciados com MATR pertencem à tabela affiliate_codes
      if (/^MATR/i.test(referralCode)) {
        // Encontrar o dono do código na affiliate_codes
        const { data: codeOwner } = await supabase
          .from('affiliate_codes')
          .select('user_id')
          .eq('code', referralCode)
          .maybeSingle();

        let ownerName: string | null = null;
        let ownerEmail: string | null = null;
        if (codeOwner?.user_id) {
          const { data: ownerProfile } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', codeOwner.user_id)
            .maybeSingle();
          ownerName = (ownerProfile as any)?.full_name || null;
          ownerEmail = (ownerProfile as any)?.email || null;
        }

        setReferralInfo({
          type: 'student',
          name: ownerName,
          email: ownerEmail,
          isRewards: true
        });
        return;
      }

      // 1) Buscar em sellers (referral_code referencia seller_referral_code do user_profiles)
      const { data: sellerData } = await supabase
        .from('sellers')
        .select('name, email, affiliate_admin_id')
        .eq('referral_code', referralCode)
        .single();

      if (sellerData) {
        // Buscar SEMPRE o affiliate vinculado ao seller via affiliate_admin_id
        let affiliateName: string | null = null;
        let affiliateEmail: string | null = null;
        // 2.1) Mapear affiliate_admin_id -> user_id via affiliate_admins
        let affiliateUserId: string | null = null;
        const { data: affiliateAdmin } = await supabase
          .from('affiliate_admins')
          .select('user_id')
          .eq('id', (sellerData as any).affiliate_admin_id)
          .maybeSingle();
        affiliateUserId = (affiliateAdmin as any)?.user_id || null;

        // 2.2) Carregar perfil do affiliate via user_id
        if (affiliateUserId) {
          const { data: affiliateProfileByUserId } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', affiliateUserId)
            .maybeSingle();
          if (affiliateProfileByUserId) {
            affiliateName = (affiliateProfileByUserId as any)?.full_name || null;
            affiliateEmail = (affiliateProfileByUserId as any)?.email || null;
          }
        }

        // 2.3) Fallback final: tentar em user_profiles pelo id (caso id seja o profile_id)
        if (!affiliateName && !affiliateEmail) {
          const { data: affiliateProfileById } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('id', (sellerData as any).affiliate_admin_id)
            .maybeSingle();
          if (affiliateProfileById) {
            affiliateName = (affiliateProfileById as any)?.full_name || null;
            affiliateEmail = (affiliateProfileById as any)?.email || null;
          }
        }

        setReferralInfo({
          type: 'seller',
          name: (sellerData as any)?.name || null,
          email: (sellerData as any)?.email || null,
          affiliateName,
          affiliateEmail
        });
        return;
      }

      // 2) Buscar em used_referral_codes (Matricula Rewards - student referrals)
      const { data: studentData } = await supabase
        .from('used_referral_codes')
        .select(`
          affiliate_code,
          user_profiles!used_referral_codes_referrer_id_fkey (
            full_name,
            email
          )
        `)
        .eq('affiliate_code', referralCode)
        .single();

      if (studentData) {
        setReferralInfo({
          type: 'student',
          name: (studentData.user_profiles as any)?.full_name || null,
          email: (studentData.user_profiles as any)?.email || null
        });
        return;
      }

      // 3) Buscar em affiliate_referrals (outras referências via afiliado)
      const { data: affiliateData } = await supabase
        .from('affiliate_referrals')
        .select(`
          affiliate_code,
          user_profiles!affiliate_referrals_referrer_id_fkey (
            full_name,
            email
          )
        `)
        .eq('affiliate_code', referralCode)
        .single();

      if (affiliateData) {
        setReferralInfo({
          type: 'affiliate',
          name: (affiliateData.user_profiles as any)?.full_name || null,
          email: (affiliateData.user_profiles as any)?.email || null
        });
        return;
      }

      // Se não encontrou em nenhuma tabela
      setReferralInfo(null);
    } catch (error) {
      console.error('Error fetching referral info:', error);
      setReferralInfo(null);
    }
  };

  // Função para calcular o deadline do I-20
  const calculateI20Deadline = (studentData: StudentRecord) => {
    try {
      console.log('🔍 [ADMIN_I20_DEADLINE] Calculating deadline from student data:', {
        has_paid_i20_control_fee: studentData.has_paid_i20_control_fee,
        acceptance_letter_sent_at: studentData.all_applications?.find(app => app.acceptance_letter_sent_at)?.acceptance_letter_sent_at,
        acceptance_letter_status: studentData.all_applications?.find(app => app.acceptance_letter_status)?.acceptance_letter_status
      });

      // Se o I-20 já foi pago, não há deadline
      if (studentData.has_paid_i20_control_fee) {
        setI20Deadline(null);
        console.log('🔍 [ADMIN_I20_DEADLINE] I-20 already paid, no deadline');
        return;
      }

      // Buscar aplicação com acceptance letter
      const appWithLetter = studentData.all_applications?.find(app => 
        app.acceptance_letter_sent_at && 
        (app.acceptance_letter_status === 'sent' || app.acceptance_letter_status === 'approved')
      );

      if (appWithLetter) {
        // Calcular deadline baseado na data de envio da carta de aceite + 10 dias
        const acceptanceDate = new Date(appWithLetter.acceptance_letter_sent_at);
        const deadline = new Date(acceptanceDate.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 dias
        setI20Deadline(deadline);
        console.log('🔍 [ADMIN_I20_DEADLINE] Calculated deadline from acceptance letter:', deadline);
      } else {
        setI20Deadline(null);
        console.log('🔍 [ADMIN_I20_DEADLINE] No acceptance letter sent yet');
      }
    } catch (error) {
      console.error('❌ [ADMIN_I20_DEADLINE] Error calculating deadline:', error);
      setI20Deadline(null);
    }
  };

  // Função para encontrar o passo atual
  const getCurrentStep = () => {
    if (!student) return null;
    
    for (let i = 0; i < steps.length; i++) {
      const status = getStepStatus(student, steps[i].key);
      if (status === 'in_progress' || status === 'pending') {
        return { step: steps[i], index: i, status };
      }
    }
    
    // Se todos estão completos, retorna o último
    return { step: steps[steps.length - 1], index: steps.length - 1, status: 'completed' };
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('user_profiles')
          .select(`
            id,
            user_id,
            full_name,
            email,
            phone,
            country,
            field_of_interest,
            academic_level,
            gpa,
            english_proficiency,
            status,
            avatar_url,
            dependents,
            desired_scholarship_range,
            created_at,
            has_paid_selection_process_fee,
            has_paid_i20_control_fee,
            selection_process_fee_payment_method,
            i20_control_fee_payment_method,
            role,
            seller_referral_code,
            admin_notes,
            scholarship_applications (
              id,
              scholarship_id,
              status,
              applied_at,
              is_application_fee_paid,
              is_scholarship_fee_paid,
              application_fee_payment_method,
              scholarship_fee_payment_method,
              acceptance_letter_status,
              acceptance_letter_url,
              acceptance_letter_sent_at,
              acceptance_letter_signed_at,
              acceptance_letter_approved_at,
              transfer_form_url,
              transfer_form_status,
              transfer_form_sent_at,
              student_process_type,
              payment_status,
              reviewed_at,
              reviewed_by,
              documents,
              scholarships (
                title,
                university_id,
                field_of_study,
                annual_value_with_scholarship,
                application_fee_amount,
                universities (
                  name
                )
              )
            )
          `)
          .eq('id', profileId)
          .single();

        if (error) throw error;

        const s = data as any;
        let lockedApplication = null;
        let activeApplication = null;
        if (s.scholarship_applications && s.scholarship_applications.length > 0) {
          console.log('🔍 [ADMIN STUDENT DETAILS] scholarship_applications:', s.scholarship_applications.map((app: any) => ({
            id: app.id,
            status: app.status,
            is_application_fee_paid: app.is_application_fee_paid,
            is_scholarship_fee_paid: app.is_scholarship_fee_paid,
            scholarship_title: app.scholarships?.title
          })));
          console.log('🔍 [ADMIN STUDENT DETAILS] Full scholarship_applications data:', JSON.stringify(s.scholarship_applications, null, 2));
          
          // Priorizar aplicação enrolled, depois approved com application fee pago, depois approved
          const enrolledApp = s.scholarship_applications.find((app: any) => app.status === 'enrolled');
          const approvedWithFeeApp = s.scholarship_applications.find((app: any) => app.status === 'approved' && app.is_application_fee_paid);
          const anyApprovedApp = s.scholarship_applications.find((app: any) => app.status === 'approved');
          
          lockedApplication = enrolledApp || approvedWithFeeApp || anyApprovedApp;
          
          console.log('🔍 DEBUG lockedApplication selection:', {
            enrolledApp: enrolledApp?.id,
            approvedWithFeeApp: approvedWithFeeApp?.id,
            anyApprovedApp: anyApprovedApp?.id,
            finalLockedApp: lockedApplication?.id
          });
          
          // Se não há aplicação locked, buscar a aplicação mais recente para o student_process_type
          if (!lockedApplication) {
            activeApplication = s.scholarship_applications
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            console.log('🔍 DEBUG activeApplication:', activeApplication?.id);
          }
        }

        const formatted: StudentRecord = {
          student_id: s.id,
          user_id: s.user_id,
          student_name: s.full_name || 'N/A',
          student_email: s.email || 'N/A',
          phone: s.phone || null,
          country: s.country || null,
          field_of_interest: s.field_of_interest || null,
          academic_level: s.academic_level || null,
          gpa: s.gpa || null,
          english_proficiency: s.english_proficiency || null,
          status: s.status || null,
          avatar_url: s.avatar_url || null,
          dependents: s.dependents || 0,
          desired_scholarship_range: s.desired_scholarship_range || null,
          student_created_at: s.created_at,
          has_paid_selection_process_fee: s.has_paid_selection_process_fee || false,
          has_paid_i20_control_fee: s.has_paid_i20_control_fee || false,
          selection_process_fee_payment_method: s.selection_process_fee_payment_method || null,
          i20_control_fee_payment_method: s.i20_control_fee_payment_method || null,
          seller_referral_code: s.seller_referral_code || null,
          admin_notes: s.admin_notes || null,
          application_id: lockedApplication?.id || null,
          scholarship_id: lockedApplication?.scholarship_id || null,
          application_status: lockedApplication?.status || null,
          applied_at: lockedApplication?.applied_at || null,
          is_application_fee_paid: (() => {
            // Verificar se alguma aplicação tem Application Fee pago
            return s.scholarship_applications?.some((app: any) => app.is_application_fee_paid) || false;
          })(),
          is_scholarship_fee_paid: lockedApplication?.is_scholarship_fee_paid || false,
          application_fee_payment_method: lockedApplication?.application_fee_payment_method || null,
          scholarship_fee_payment_method: lockedApplication?.scholarship_fee_payment_method || null,
          acceptance_letter_status: lockedApplication?.acceptance_letter_status || null,
          student_process_type: lockedApplication?.student_process_type || activeApplication?.student_process_type || null,
          payment_status: lockedApplication?.payment_status || null,
          scholarship_title: (() => {
            // Buscar aplicação que teve Application Fee pago
            const paidApplication = s.scholarship_applications?.find((app: any) => app.is_application_fee_paid);
            if (paidApplication?.scholarships) {
              const scholarship = Array.isArray(paidApplication.scholarships) 
                ? paidApplication.scholarships[0] 
                : paidApplication.scholarships;
              return scholarship?.title || null;
            }
            return null;
          })(),
          university_name: (() => {
            // Buscar aplicação que teve Application Fee pago
            const paidApplication = s.scholarship_applications?.find((app: any) => app.is_application_fee_paid);
            if (paidApplication?.scholarships) {
              const scholarship = Array.isArray(paidApplication.scholarships) 
                ? paidApplication.scholarships[0] 
                : paidApplication.scholarships;
              const university = Array.isArray(scholarship?.universities) 
                ? scholarship.universities[0] 
                : scholarship?.universities;
              return university?.name || null;
            }
            return null;
          })(),
          reviewed_at: lockedApplication?.reviewed_at || null,
          reviewed_by: lockedApplication?.reviewed_by || null,
          is_locked: !!lockedApplication,
          total_applications: s.scholarship_applications ? s.scholarship_applications.length : 0,
          all_applications: s.scholarship_applications || []
        };

        console.log('🔍 [ADMIN STUDENT DETAILS] Setting student state with formatted data:', {
          student_id: formatted.student_id,
          student_name: formatted.student_name,
          total_applications: formatted.total_applications,
          application_statuses: formatted.all_applications.map((app: any) => ({
            id: app.id,
            status: app.status,
            scholarship_title: app.scholarships?.title
          })),
          timestamp: new Date().toISOString()
        });
        
        // Verificar se há aplicações rejeitadas
        const rejectedApps = formatted.all_applications.filter((app: any) => app.status === 'rejected');
        if (rejectedApps.length > 0) {
          console.log('⚠️ [ADMIN STUDENT DETAILS] Aplicações REJEITADAS encontradas:', rejectedApps.map((app: any) => ({
            id: app.id,
            status: app.status,
            scholarship_title: app.scholarships?.title
          })));
        } else {
          console.log('ℹ️ [ADMIN STUDENT DETAILS] Nenhuma aplicação rejeitada encontrada');
        }
        
        setStudent(formatted);
        setDependents(Number(s.dependents || 0));
        
        // Buscar termos aceitos pelo estudante
        if (s.user_id) {
          fetchTermAcceptances(s.user_id);
        }
        
        // Processar notas do admin - converter de string para array se necessário
        if (s.admin_notes) {
          try {
            // Se for um array JSON, usar diretamente
            if (Array.isArray(s.admin_notes)) {
              setAdminNotes(s.admin_notes);
            } else {
              // Se for string, tentar fazer parse ou criar array com nota única
              const parsed = JSON.parse(s.admin_notes);
              if (Array.isArray(parsed)) {
                setAdminNotes(parsed);
              } else {
                // Fallback: criar array com nota única
                setAdminNotes([{
                  id: `note-${Date.now()}`,
                  content: s.admin_notes,
                  created_by: 'unknown',
                  created_by_name: 'Admin',
                  created_at: new Date().toISOString()
                }]);
              }
            }
          } catch {
            // Se não conseguir fazer parse, criar array com nota única
            setAdminNotes([{
              id: `note-${Date.now()}`,
              content: s.admin_notes,
              created_by: 'unknown',
              created_by_name: 'Admin',
              created_at: new Date().toISOString()
            }]);
          }
        } else {
          setAdminNotes([]);
        }
        
        // Calcular deadline do I-20
        calculateI20Deadline(formatted);
        
        // Buscar informações de referência
        if (formatted.seller_referral_code) {
          fetchReferralInfo(formatted.seller_referral_code);
        }
      } catch (e) {
        // noop
      } finally {
        setLoading(false);
      }
    };
    if (profileId) run();
  }, [profileId]);

  useEffect(() => {
    if (activeTab === 'documents' && student) {
      fetchDocumentRequests();
    }
  }, [activeTab, student]);

  // Buscar uploads do transfer form
  useEffect(() => {
    const fetchTransferFormUploads = async () => {
      if (!student) return;
      
      // Encontrar aplicação transfer
      const transferApp = getTransferApplication();
      
      if (!transferApp) return;
      
      const { data, error } = await supabase
        .from('transfer_form_uploads')
        .select('*')
        .eq('application_id', transferApp.id)
        .order('uploaded_at', { ascending: false });
      
      if (!error && data) {
        setTransferFormUploads(data);
      } else if (error) {
        console.error('Erro ao buscar transfer form uploads:', error);
      }
    };
    
    fetchTransferFormUploads();
  }, [student]);

  // Buscar pagamentos Zelle pendentes
  useEffect(() => {
    const fetchPendingZellePayments = async () => {
      if (!student?.user_id) return;
      
      try {
        const { data, error } = await supabase
          .from('zelle_payments')
          .select('*')
          .eq('user_id', student.user_id)
          .eq('status', 'pending_verification')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching pending Zelle payments:', error);
          return;
        }

        setPendingZellePayments(data || []);
      } catch (error) {
        console.error('Error fetching pending Zelle payments:', error);
      }
    };
    
    fetchPendingZellePayments();
  }, [student]);

  const getStepStatus = (st: StudentRecord, step: string) => {
    switch (step) {
      case 'selection_fee':
        return st.has_paid_selection_process_fee ? 'completed' : 'pending';
      case 'apply':
        return st.total_applications > 0 ? 'completed' : 'pending';
      case 'review':
        if (st.application_status === 'enrolled' || st.application_status === 'approved') return 'completed';
        if (st.application_status === 'rejected') return 'rejected';
        if (st.application_status === 'under_review') return 'in_progress';
        return 'pending';
      case 'application_fee':
        return st.is_application_fee_paid ? 'completed' : 'pending';
      case 'scholarship_fee':
        return st.is_scholarship_fee_paid ? 'completed' : 'pending';
      case 'i20_fee':
        return st.has_paid_i20_control_fee ? 'completed' : 'pending';
      case 'acceptance_letter':
        if (st.acceptance_letter_status === 'approved' || st.acceptance_letter_status === 'sent') return 'completed';
        return 'pending';
      case 'transfer_form':
        // Só aparece para alunos com process_type = 'transfer'
        if (st.student_process_type !== 'transfer') return 'skipped';
        // Verificar se existe um documento de transfer form aprovado
        const transferApp = st.all_applications?.find((app: any) => 
          app.student_process_type === 'transfer' && 
          (app.transfer_form_status === 'approved' || app.transfer_form_status === 'sent')
        );
        return transferApp ? 'completed' : 'pending';
      case 'enrollment':
        return st.application_status === 'enrolled' ? 'completed' : 'pending';
      default:
        return 'pending';
    }
  };


  const allSteps = [
    { key: 'selection_fee', label: 'Selection Fee', icon: CreditCard },
    { key: 'apply', label: 'Application', icon: FileText },
    { key: 'review', label: 'Review', icon: Eye },
    { key: 'application_fee', label: 'App Fee', icon: CreditCard },
    { key: 'scholarship_fee', label: 'Scholarship Fee', icon: Award },
    { key: 'i20_fee', label: 'I-20 Fee', icon: CreditCard },
    { key: 'acceptance_letter', label: 'Acceptance', icon: FileText },
    { key: 'transfer_form', label: 'Transfer Form', icon: FileText },
    { key: 'enrollment', label: 'Enrollment', icon: Award }
  ];

  // Filtrar steps baseado no student_process_type
  const steps = allSteps.filter(step => {
    if (step.key === 'transfer_form') {
      // Só mostrar transfer_form se o student_process_type for 'transfer'
      return student?.student_process_type === 'transfer';
    }
    return true;
  });

  const approveableTypes = new Set(['passport', 'funds_proof', 'diploma']);
  const handleApproveDocument = async (applicationId: string, docType: string) => {
    if (!isPlatformAdmin || !student) return;
    if (!approveableTypes.has(docType)) return;
    const k = `${applicationId}:${docType}`;
    setApprovingDocs(p => ({ ...p, [k]: true }));
    try {
      const targetApp = student.all_applications?.find((a: any) => a.id === applicationId);
      if (!targetApp) return;
      const currentDocs: any[] = Array.isArray(targetApp.documents) ? targetApp.documents : [];
      const newDocuments = currentDocs.map((d: any) => d?.type === docType ? { ...d, status: 'approved', approved_at: new Date().toISOString() } : d);
      const { data, error } = await supabase
        .from('scholarship_applications')
        .update({ documents: newDocuments, updated_at: new Date().toISOString() })
        .eq('id', applicationId)
        .select('id, documents')
        .single();
      if (error) return;
      setStudent(prev => {
        if (!prev) return prev;
        const updatedApps = (prev.all_applications || []).map((a: any) => a.id === applicationId ? { ...a, documents: data?.documents || newDocuments } : a);
        return { ...prev, all_applications: updatedApps } as any;
      });

      // Log the action
      try {
        await logAction(
          'document_approval',
          `Document ${docType} approved by admin`,
          user?.id || '',
          'admin',
          {
            document_type: docType,
            application_id: applicationId,
            approved_by: user?.email || 'Admin'
          }
        );
      } catch (logError) {
        console.error('Failed to log action:', logError);
      }
    } finally {
      setApprovingDocs(p => ({ ...p, [k]: false }));
    }
  };

  const handleRejectDocument = async (applicationId: string, docType: string, reason: string) => {
    if (!isPlatformAdmin || !student) return;
    if (!approveableTypes.has(docType)) return;
    
    const k = `${applicationId}:${docType}`;
    setRejectingDocs(p => ({ ...p, [k]: true }));
    
    try {
      const targetApp = student.all_applications?.find((a: any) => a.id === applicationId);
      if (!targetApp) return;
      
      const currentDocs: any[] = Array.isArray(targetApp.documents) ? targetApp.documents : [];
      const newDocuments = currentDocs.map((d: any) => 
        d?.type === docType ? { 
          ...d, 
          status: 'rejected', 
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          rejected_by: user?.id
        } : d
      );
      
      const { data: updated, error } = await supabase
        .from('scholarship_applications')
        .update({ documents: newDocuments, updated_at: new Date().toISOString() })
        .eq('id', applicationId)
        .select('id, documents')
        .single();
      
      if (error) {
        console.error('Erro ao rejeitar documento:', error);
        return;
      }
      
      setStudent(prev => {
        if (!prev) return prev;
        const updatedApps = (prev.all_applications || []).map((a: any) =>
          a.id === applicationId ? { ...a, documents: updated?.documents || newDocuments } : a
        );
        return { ...prev, all_applications: updatedApps } as any;
      });
      
      // Log da ação
      try {
        await supabase.rpc('log_student_action', {
          p_student_id: student?.student_id,
          p_action_type: 'document_rejection',
          p_action_description: `Document ${docType} rejected by platform admin: ${reason}`,
          p_performed_by: user?.id || '',
          p_performed_by_type: 'admin',
          p_metadata: {
            document_type: docType,
            application_id: applicationId,
            rejection_reason: reason,
            rejected_by: user?.email || 'Platform Admin'
          }
        });
      } catch (logError) {
        console.error('Failed to log document rejection:', logError);
      }

      // ENVIAR NOTIFICAÇÕES PARA O ALUNO
      console.log('📤 [handleRejectDocument] Enviando notificações de rejeição para o aluno...');
      
      try {
        // Buscar nome do admin


      // 1. ENVIAR EMAIL VIA WEBHOOK (payload idêntico ao da universidade)
      const rejectionPayload = {
        tipo_notf: "Changes Requested",
        email_aluno: student.student_email,
        nome_aluno: student.student_name,
        email_universidade: user?.email,
        o_que_enviar: `Your document <strong>${docType}</strong> for the request <strong>${docType}</strong> has been rejected. Reason: <strong>${reason}</strong>. Please review and upload a corrected version.`
      };

        console.log('📤 [handleRejectDocument] Payload de rejeição:', rejectionPayload);

        const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(rejectionPayload),
        });

        if (webhookResponse.ok) {
          console.log('✅ [handleRejectDocument] Email de rejeição enviado com sucesso!');
        } else {
          console.warn('⚠️ [handleRejectDocument] Erro ao enviar email de rejeição:', webhookResponse.status);
        }
      } catch (webhookError) {
        console.error('❌ [handleRejectDocument] Erro ao enviar webhook de rejeição:', webhookError);
        // Não falhar o processo se o webhook falhar
      }

      // 2. ENVIAR NOTIFICAÇÃO IN-APP PARA O ALUNO (SINO)
      console.log('📤 [handleRejectDocument] Enviando notificação in-app para o aluno...');
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        
        if (accessToken) {
          const notificationPayload = {
            user_id: student.user_id,
            title: 'Document Rejected',
            message: `Your ${docType} document has been rejected by platform admin. Reason: ${reason}`,
            type: 'document_rejected',
            link: '/student/dashboard/applications',
          };
          
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/create-student-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(notificationPayload),
          });
          
          if (response.ok) {
            console.log('✅ [handleRejectDocument] Notificação in-app enviada com sucesso!');
          } else {
            console.warn('⚠️ [handleRejectDocument] Erro ao enviar notificação in-app:', response.status);
          }
        } else {
          console.error('❌ [handleRejectDocument] Access token não encontrado para notificação in-app');
        }
      } catch (notificationError) {
        console.error('❌ [handleRejectDocument] Erro ao enviar notificação in-app:', notificationError);
        // Não falhar o processo se a notificação in-app falhar
      }
      
      // Fechar modal e limpar dados
      setShowRejectDocModal(false);
      setRejectDocData(null);
      setRejectDocReason('');
      
    } catch (error: any) {
      console.error('Erro ao rejeitar documento:', error);
    } finally {
      setRejectingDocs(p => ({ ...p, [k]: false }));
    }
  };

  const openRejectDocModal = (applicationId: string, docType: string) => {
    setRejectDocData({ applicationId, docType });
    setShowRejectDocModal(true);
  };

  const confirmRejectDoc = () => {
    if (rejectDocData && rejectDocReason.trim()) {
      handleRejectDocument(rejectDocData.applicationId, rejectDocData.docType, rejectDocReason.trim());
    }
  };

  // Upload ou substituição de documento pela universidade (ou admin)
  const canUniversityManage = user?.role === 'school' || user?.role === 'admin';
  const canEditProfile = user?.role === 'admin' || user?.role === 'school';
  const canEditFees = user?.role === 'admin';

  const handleSaveProfile = async () => {
    if (!student || !canEditProfile) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: student.student_name,
          email: student.student_email,
          phone: student.phone,
          country: student.country,
          field_of_interest: student.field_of_interest,
          academic_level: student.academic_level,
          gpa: student.gpa,
          english_proficiency: student.english_proficiency,
          status: student.status,
          dependents: dependents,
          desired_scholarship_range: student.desired_scholarship_range,
          seller_referral_code: student.seller_referral_code
        })
        .eq('id', student.student_id);
      
      if (error) throw error;
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddNote = async () => {
    if (!student || !newNoteContent.trim()) return;
    
    setSavingNotes(true);
    try {
      const newNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: newNoteContent.trim(),
        created_by: user?.id || 'unknown',
        created_by_name: user?.email || 'Admin',
        created_at: new Date().toISOString()
      };

      const updatedNotes = [newNote, ...adminNotes];
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          admin_notes: JSON.stringify(updatedNotes),
          updated_at: new Date().toISOString()
        })
        .eq('id', student.student_id);

      if (error) throw error;
      
      setAdminNotes(updatedNotes);
      setNewNoteContent('');
      setStudent(prev => prev ? { ...prev, admin_notes: JSON.stringify(updatedNotes) } : prev);
      showToast('Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      showToast('Error adding note', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleEditNote = (noteId: string) => {
    const note = adminNotes.find(n => n.id === noteId);
    if (note) {
      setEditingNoteId(noteId);
      setEditingNoteContent(note.content);
    }
  };

  const handleSaveEditNote = async () => {
    if (!student || !editingNoteId || !editingNoteContent.trim()) return;
    
    setSavingNotes(true);
    try {
      const updatedNotes = adminNotes.map(note => 
        note.id === editingNoteId 
          ? { ...note, content: editingNoteContent.trim() }
          : note
      );
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          admin_notes: JSON.stringify(updatedNotes),
          updated_at: new Date().toISOString()
        })
        .eq('id', student.student_id);

      if (error) throw error;
      
      setAdminNotes(updatedNotes);
      setEditingNoteId(null);
      setEditingNoteContent('');
      setStudent(prev => prev ? { ...prev, admin_notes: JSON.stringify(updatedNotes) } : prev);
      showToast('Note updated successfully');
    } catch (error) {
      console.error('Error updating note:', error);
      showToast('Error updating note', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  const handleDeleteNote = (noteId: string) => {
    setDeletingNoteId(noteId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteNote = async () => {
    if (!student || !deletingNoteId) return;
    
    setSavingNotes(true);
    try {
      const updatedNotes = adminNotes.filter(note => note.id !== deletingNoteId);
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          admin_notes: JSON.stringify(updatedNotes),
          updated_at: new Date().toISOString()
        })
        .eq('id', student.student_id);

      if (error) throw error;
      
      setAdminNotes(updatedNotes);
      setStudent(prev => prev ? { ...prev, admin_notes: JSON.stringify(updatedNotes) } : prev);
      showToast('Note deleted successfully');
    } catch (error) {
      console.error('Error deleting note:', error);
      showToast('Error deleting note', 'error');
    } finally {
      setSavingNotes(false);
      setDeletingNoteId(null);
      setShowDeleteConfirm(false);
    }
  };

  const cancelDeleteNote = () => {
    setDeletingNoteId(null);
    setShowDeleteConfirm(false);
  };

  const handleUpdatePaymentMethod = async (feeType: 'selection_process' | 'application' | 'scholarship' | 'i20_control') => {
    if (!student || !isPlatformAdmin) return;
    
    setSavingPaymentMethod(true);
    try {
      if (feeType === 'selection_process' || feeType === 'i20_control') {
        // Atualizar na tabela user_profiles
        const fieldName = feeType === 'selection_process' 
          ? 'selection_process_fee_payment_method' 
          : 'i20_control_fee_payment_method';
        
        const { error } = await supabase
          .from('user_profiles')
          .update({ [fieldName]: newPaymentMethod })
          .eq('id', student.student_id);

        if (error) throw error;

        // Log the action
        try {
          await logAction(
            'payment_method_updated',
            `${feeType === 'selection_process' ? 'Selection Process Fee' : 'I-20 Control Fee'} payment method updated to ${newPaymentMethod}`,
            user?.id || '',
            'admin',
            {
              fee_type: feeType,
              old_method: 'unknown',
              new_method: newPaymentMethod,
              student_name: student.student_name
            }
          );
        } catch (logError) {
          console.error('Failed to log action:', logError);
        }
      } else if (feeType === 'application' || feeType === 'scholarship') {
        // Atualizar na tabela scholarship_applications
        const fieldName = feeType === 'application' 
          ? 'application_fee_payment_method' 
          : 'scholarship_fee_payment_method';
        
        // Usar a aplicação específica que foi selecionada para edição
        let targetApplicationId = editingApplicationId;
        
        if (!targetApplicationId) {
          // Fallback: buscar aplicação aprovada ou mais recente
        const { data: applications, error: fetchError } = await supabase
          .from('scholarship_applications')
          .select('id, status')
          .eq('student_id', student.student_id)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        const targetApplication = applications?.find(app => app.status === 'approved') || applications?.[0];
        if (!targetApplication) {
          throw new Error('No application found for this student');
          }
          targetApplicationId = targetApplication.id;
        }

        const { error } = await supabase
          .from('scholarship_applications')
          .update({ [fieldName]: newPaymentMethod })
          .eq('id', targetApplicationId);

        if (error) throw error;

        // Log the action
        try {
          await logAction(
            'payment_method_updated',
            `${feeType === 'application' ? 'Application Fee' : 'Scholarship Fee'} payment method updated to ${newPaymentMethod}`,
            user?.id || '',
            'admin',
            {
              fee_type: feeType,
              old_method: 'unknown',
              new_method: newPaymentMethod,
              application_id: targetApplicationId,
              student_name: student.student_name
            }
          );
        } catch (logError) {
          console.error('Failed to log action:', logError);
        }
      }

      setEditingPaymentMethod(null);
      setEditingApplicationId(null);
      showToast(`Payment method updated to ${newPaymentMethod}`, 'success');
      
      // Recarregar dados do estudante
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating payment method:', error);
      showToast(`Error updating payment method: ${error.message}`, 'error');
    } finally {
      setSavingPaymentMethod(false);
    }
  };

  const startEditingFees = () => {
    if (!student) return;
    
    // Calcular valores atuais considerando dependentes e overrides
    const dependentsExtra = dependents * 150; // $150 por dependente apenas no Selection Process
    const baseSelectionProcess = Number(getFeeAmount('selection_process')); // Valor base dinâmico
    const currentSelectionProcess = hasOverride('selection_process') 
      ? getFeeAmount('selection_process') 
      : baseSelectionProcess + dependentsExtra;
    
    // Debug para jolie8862@uorak.com
    if (student.user_id === '935e0eec-82c6-4a70-b013-e85dde6e63f7') {
      console.log('🔍 [AdminStudentDetails] jolie8862@uorak.com - Fee calculation:', {
        baseSelectionProcess,
        dependentsExtra,
        currentSelectionProcess,
        hasOverride: hasOverride('selection_process'),
        getFeeAmount: getFeeAmount('selection_process'),
        applicationFee: getFeeAmount('application_fee'),
        scholarshipFee: getFeeAmount('scholarship_fee'),
        i20ControlFee: getFeeAmount('i20_control_fee')
      });
    }
    
    setEditingFees({
      selection_process: currentSelectionProcess,
      scholarship: getFeeAmount('scholarship_fee'),
      i20_control: getFeeAmount('i20_control_fee')
    });
  };

  const cancelEditingFees = () => {
    setEditingFees(null);
  };

  const saveFeeOverrides = async () => {
    if (!editingFees || !student) return;

    try {
      setSavingFees(true);

      // Criar tabela se não existir
      const { error: createTableError } = await supabase.rpc('create_user_fee_overrides_table_if_not_exists');
      
      if (createTableError) {
        console.warn('Erro ao criar tabela, tentando continuar:', createTableError);
      }

      // Salvar ou atualizar override
      const { error } = await supabase
        .from('user_fee_overrides')
        .upsert({
          user_id: student.user_id,
          selection_process_fee: editingFees.selection_process,
          scholarship_fee: editingFees.scholarship,
          i20_control_fee: editingFees.i20_control,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      cancelEditingFees();
      // Recarregar dados do estudante para refletir as mudanças
      window.location.reload();
    } catch (error) {
      console.error('Error saving fee overrides:', error);
      alert('Erro ao salvar as taxas personalizadas');
    } finally {
      setSavingFees(false);
    }
  };

  const resetFeesToDefault = async () => {
    if (!student) return;

    try {
      setSavingFees(true);

      // Remover override do banco
      const { error } = await supabase
        .from('user_fee_overrides')
        .delete()
        .eq('user_id', student.user_id);

      if (error) throw error;

      cancelEditingFees();
      // Recarregar dados do estudante para refletir as mudanças
      window.location.reload();
    } catch (error) {
      console.error('Error resetting fees:', error);
      alert('Erro ao resetar as taxas');
    } finally {
      setSavingFees(false);
    }
  };

  const openPaymentModal = (
    feeType: 'selection_process' | 'application' | 'scholarship' | 'i20_control',
    applicationId?: string
  ) => {
    const feeNames = {
      'selection_process': 'Selection Process Fee',
      'application': 'Application Fee',
      'scholarship': 'Scholarship Fee',
      'i20_control': 'I-20 Control Fee'
    };

    setPendingPayment({
      feeType,
      applicationId,
      feeName: feeNames[feeType]
    });
    setSelectedPaymentMethod('manual');
    setShowPaymentModal(true);
  };

  const startEditingPaymentMethod = (feeType: 'application' | 'scholarship') => {
    const approvedApps = student?.all_applications?.filter((app: any) => app.status === 'approved') || [];
    
    if (approvedApps.length === 1) {
      // Usar a única aplicação aprovada
      const app = approvedApps[0];
      setEditingPaymentMethod(feeType);
      setEditingApplicationId(app.id);
      const currentMethod = feeType === 'application' 
        ? app.application_fee_payment_method 
        : app.scholarship_fee_payment_method;
      setNewPaymentMethod((currentMethod as 'stripe' | 'zelle' | 'manual') || 'manual');
    } else {
      // Para múltiplas aplicações, por enquanto usar a primeira aprovada
      // TODO: Implementar seleção para edição também se necessário
      const app = approvedApps[0];
      if (app) {
        setEditingPaymentMethod(feeType);
        setEditingApplicationId(app.id);
        const currentMethod = feeType === 'application' 
          ? app.application_fee_payment_method 
          : app.scholarship_fee_payment_method;
        setNewPaymentMethod((currentMethod as 'stripe' | 'zelle' | 'manual') || 'manual');
      }
    }
  };

  const confirmPayment = async () => {
    if (!pendingPayment) return;

    let { feeType, applicationId } = pendingPayment;
    
    console.log('🔍 DEBUG confirmPayment START:', {
      feeType,
      originalApplicationId: applicationId,
      selectedApplicationId,
      pendingPayment
    });
    
    // Para Application Fee, sempre verificar se há seleção manual
    if (feeType === 'application') {
      const approvedApps = student?.all_applications?.filter((app: any) => app.status === 'approved') || [];
      console.log('🔍 DEBUG approvedApps:', approvedApps.map(app => ({ id: app.id, title: app.scholarships?.title })));
      
      if (approvedApps.length > 1) {
        // Com múltiplas aplicações, SEMPRE usar a selecionada
        if (selectedApplicationId) {
          applicationId = selectedApplicationId;
          console.log('🔍 DEBUG Using selectedApplicationId:', selectedApplicationId);
        } else {
          console.error('❌ Multiple applications but no selection made!');
          return; // Não prosseguir sem seleção
        }
      } else if (approvedApps.length === 1 && !applicationId) {
        // Com uma aplicação, usar ela se não foi especificada
        applicationId = approvedApps[0].id;
        console.log('🔍 DEBUG Using single approved app:', approvedApps[0].id);
      }
    }
    
    console.log('🔍 DEBUG confirmPayment FINAL:', {
      feeType,
      finalApplicationId: applicationId,
      selectedPaymentMethod
    });
    
    await markFeeAsPaid(feeType, applicationId, selectedPaymentMethod);
    setShowPaymentModal(false);
    setPendingPayment(null);
    setSelectedApplicationId(null); // Reset selection
  };

  const markFeeAsPaid = async (
    feeType: 'selection_process' | 'application' | 'scholarship' | 'i20_control',
    applicationId?: string,
    method?: 'stripe' | 'zelle' | 'manual'
  ) => {
    if (!student || !isPlatformAdmin) return;

    const key = `${student.student_id}:${feeType}`;
    setMarkingAsPaid(prev => ({ ...prev, [key]: true }));

    try {
      if (feeType === 'selection_process') {
        // Marcar selection process fee como pago
        const { error } = await supabase
          .from('user_profiles')
          .update({ 
            has_paid_selection_process_fee: true,
            selection_process_fee_payment_method: method || 'manual'
          })
          .eq('id', student.student_id);

        if (error) throw error;

        // Atualizar estado local
        setStudent(prev => prev ? { ...prev, has_paid_selection_process_fee: true } : prev);

        // Log the action
        try {
          await logAction(
            'fee_payment',
            `Selection Process Fee marked as paid via ${method || 'manual'} payment`,
            user?.id || '',
            'admin',
            {
              fee_type: 'selection_process',
              payment_method: method || 'manual',
              amount: (() => {
                const base = Number(getFeeAmount('selection_process'));
                return base + (student?.dependents || 0) * 150;
              })()
            }
          );
        } catch (logError) {
          console.error('Failed to log action:', logError);
        }
      } else if (feeType === 'application') {
        // Marcar application fee como pago na scholarship_applications
        let targetApplicationId = applicationId;
        
        console.log('🔍 DEBUG Application Fee Payment:', {
          receivedApplicationId: applicationId,
          targetApplicationId: targetApplicationId,
          studentId: student.student_id
        });
        
        // Se não foi fornecido applicationId, buscar a aplicação aprovada ou mais recente
        if (!targetApplicationId) {
          const { data: applications, error: fetchError } = await supabase
            .from('scholarship_applications')
            .select('id, status')
            .eq('student_id', student.student_id)
            .order('created_at', { ascending: false });

          if (fetchError) throw fetchError;

          // Se há uma aplicação aprovada, usar ela; senão usar a mais recente
          const targetApplication = applications?.find(app => app.status === 'approved') || applications?.[0];
          
          if (!targetApplication) {
            throw new Error('No application found for this student');
          }
          
          targetApplicationId = targetApplication.id;
        }

        const { error } = await supabase
          .from('scholarship_applications')
          .update({
            is_application_fee_paid: true,
            application_fee_payment_method: method || 'manual'
          })
          .eq('id', targetApplicationId);

        if (error) throw error;

        // Buscar dados da aplicação que foi marcada como paga para atualizar o committed scholarship
        const { data: updatedApplication, error: fetchAppError } = await supabase
          .from('scholarship_applications')
          .select(`
            id,
            scholarships!inner (
              title,
              universities!inner (
                name
              )
            )
          `)
          .eq('id', targetApplicationId)
          .single();

        if (fetchAppError) {
          console.error('Error fetching application details:', fetchAppError);
        }

        // Atualizar estado local com a bolsa comprometida
        setStudent(prev => {
          if (!prev) return prev;
          
          const updatedStudent = { ...prev, is_application_fee_paid: true };
          
          // Se conseguimos buscar os dados da aplicação, atualizar scholarship_title e university_name
          if (updatedApplication?.scholarships) {
            const scholarship = Array.isArray(updatedApplication.scholarships) 
              ? updatedApplication.scholarships[0] 
              : updatedApplication.scholarships;
            
            if (scholarship) {
              updatedStudent.scholarship_title = scholarship.title;
              const university = Array.isArray(scholarship.universities) 
                ? scholarship.universities[0] 
                : scholarship.universities;
              updatedStudent.university_name = university?.name;
              console.log('🔍 DEBUG Updated committed scholarship:', {
                scholarship_title: scholarship.title,
                university_name: university?.name
              });
            }
          }
          
          return updatedStudent;
        });

        // Log the action
        try {
          await logAction(
            'fee_payment',
            `Application Fee marked as paid via ${method || 'manual'} payment`,
            user?.id || '',
            'admin',
            {
              fee_type: 'application',
              payment_method: method || 'manual',
              amount: 400,
              application_id: targetApplicationId
            }
          );
        } catch (logError) {
          console.error('Failed to log action:', logError);
        }
      } else if (feeType === 'scholarship') {
        // Marcar scholarship fee como pago na scholarship_applications
        let targetApplicationId = applicationId;
        
        // Se não foi fornecido applicationId, buscar a aplicação aprovada ou mais recente
        if (!targetApplicationId) {
          const { data: applications, error: fetchError } = await supabase
            .from('scholarship_applications')
            .select('id, status')
            .eq('student_id', student.student_id)
            .order('created_at', { ascending: false });

          if (fetchError) throw fetchError;

          // Se há uma aplicação aprovada, usar ela; senão usar a mais recente
          const targetApplication = applications?.find(app => app.status === 'approved') || applications?.[0];
          
          if (!targetApplication) {
            throw new Error('No application found for this student');
          }
          
          targetApplicationId = targetApplication.id;
        }

        const { error } = await supabase
          .from('scholarship_applications')
          .update({
            is_scholarship_fee_paid: true,
            scholarship_fee_payment_method: method || 'manual'
          })
          .eq('id', targetApplicationId);

        if (error) throw error;

        // Atualizar estado local
        setStudent(prev => prev ? { ...prev, is_scholarship_fee_paid: true } : prev);

        // Log the action
        try {
          await logAction(
            'fee_payment',
            `Scholarship Fee marked as paid via ${method || 'manual'} payment`,
            user?.id || '',
            'admin',
            {
              fee_type: 'scholarship',
              payment_method: method || 'manual',
              amount: getFeeAmount('scholarship_fee'),
              application_id: targetApplicationId
            }
          );
        } catch (logError) {
          console.error('Failed to log action:', logError);
        }
      } else if (feeType === 'i20_control') {
        // Marcar I-20 control fee como pago
        const { error } = await supabase
          .from('user_profiles')
          .update({ 
            has_paid_i20_control_fee: true,
            i20_control_fee_payment_method: method || 'manual'
          })
          .eq('id', student.student_id);

        if (error) throw error;

        // Atualizar estado local
        setStudent(prev => prev ? { ...prev, has_paid_i20_control_fee: true } : prev);

        // Log the action
        try {
          await logAction(
            'fee_payment',
            `I-20 Control Fee marked as paid via ${method || 'manual'} payment`,
            user?.id || '',
            'admin',
            {
              fee_type: 'i20_control',
              payment_method: method || 'manual',
              amount: getFeeAmount('i20_control_fee')
            }
          );
        } catch (logError) {
          console.error('Failed to log action:', logError);
        }

        // Nota: No novo fluxo, o enrollment (matrícula) acontece após a acceptance letter ser enviada,
        // não imediatamente após o pagamento do I-20. A universidade enviará a acceptance letter
        // após receber o pagamento do I-20, e então o aluno será considerado enrolled.
      }

      showToast(`${feeType === 'selection_process' ? 'Selection Process Fee' : feeType === 'application' ? 'Application Fee' : feeType === 'scholarship' ? 'Scholarship Fee' : 'I-20 Control Fee'} marked as paid successfully!`, 'success');
    } catch (error) {
      console.error(`Error marking ${feeType} as paid:`, error);
      const feeName = feeType === 'selection_process' ? 'Selection Process Fee' : 
                     feeType === 'application' ? 'Application Fee' :
                     feeType === 'scholarship' ? 'Scholarship Fee' : 'I-20 Control Fee';
      showToast(`Error marking ${feeName} as paid`, 'error');
    } finally {
      setMarkingAsPaid(prev => ({ ...prev, [key]: false }));
    }
  };


  const approveApplication = async (applicationId: string) => {
    if (!student || !isPlatformAdmin) return;
    
    try {
      setApprovingStudent(true);
      
      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({ status: 'approved' })
        .eq('id', applicationId)
        .select();

      if (updateError) {
        console.error('Erro ao atualizar status da aplicação:', updateError);
        throw new Error('Failed to update application status: ' + updateError.message);
      }

      // Atualizar também o documents_status no perfil do usuário
      const { error: profileUpdateError } = await supabase
        .from('user_profiles')
        .update({ documents_status: 'approved' })
        .eq('user_id', student.user_id);

      if (profileUpdateError) {
        console.error('Erro ao atualizar documents_status:', profileUpdateError);
      }

      // Webhook e notificação
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('user_id', student.user_id)
          .single();

        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: "Aluno aprovado na bolsa",
            email_aluno: userData.email,
            nome_aluno: student.student_name,
            email_universidade: user?.email,
            o_que_enviar: `Congratulations, you have been selected for the scholarship.`
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
              await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/create-student-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  user_id: student.user_id,
                  title: 'Scholarship approved',
                  message: `You have been selected for the scholarship.`,
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

      // Atualizar o estado local
      setStudent(prev => prev ? { ...prev, application_status: 'approved' } : prev);
      
      // Log the action
      try {
        await logAction(
          'application_approval',
          `Scholarship application approved by admin`,
          user?.id || '',
          'admin',
          {
            application_id: applicationId,
            student_name: student.student_name,
            approved_by: user?.email || 'Admin'
          }
        );
      } catch (logError) {
        console.error('Failed to log action:', logError);
      }

      window.location.reload();
      
      showToast('Application approved successfully! The student will be notified.', 'success');
    } catch (error: any) {
      console.error('Error approving application:', error);
      showToast(`Failed to approve application: ${error.message}`, 'error');
    } finally {
      setApprovingStudent(false);
    }
  };

  const rejectApplication = async (applicationId: string) => {
    console.log('🚨 [REJECT APPLICATION] Iniciando rejeição da aplicação:', {
      applicationId,
      studentName: student?.student_name,
      reason: rejectStudentReason,
      timestamp: new Date().toISOString()
    });
    
    if (!student || !isPlatformAdmin) {
      console.log('❌ [REJECT APPLICATION] Rejeição bloqueada:', {
        hasStudent: !!student,
        isPlatformAdmin,
        userRole: user?.role
      });
      return;
    }
    
    try {
      setRejectingStudent(true);
      console.log('🔄 [REJECT APPLICATION] Atualizando status no banco de dados...');
      
      const { data: updateData, error: updateError } = await supabase
        .from('scholarship_applications')
        .update({ status: 'rejected', notes: rejectStudentReason || null })
        .eq('id', applicationId)
        .select();
      
      if (updateError) {
        console.error('❌ [REJECT APPLICATION] Erro ao atualizar banco de dados:', updateError);
        throw updateError;
      }
      
      console.log('✅ [REJECT APPLICATION] Status atualizado com sucesso:', updateData);
      
      setShowRejectStudentModal(false);
      setRejectStudentReason('');
      setPendingRejectAppId(null);
      
      // Log the action
      try {
        console.log('📝 [REJECT APPLICATION] Registrando log da ação...');
        await logAction(
          'application_rejection',
          `Scholarship application rejected by admin${rejectStudentReason ? `: ${rejectStudentReason}` : ''}`,
          user?.id || '',
          'admin',
          {
            application_id: applicationId,
            student_name: student.student_name,
            rejection_reason: rejectStudentReason,
            rejected_by: user?.email || 'Admin'
          }
        );
        console.log('✅ [REJECT APPLICATION] Log registrado com sucesso');
      } catch (logError) {
        console.error('⚠️ [REJECT APPLICATION] Falha ao registrar log (não crítico):', logError);
      }

      console.log('🔄 [REJECT APPLICATION] Recarregando página para atualizar dados...');
      window.location.reload();
      
      showToast('Application rejected successfully.', 'success');
    } catch (error: any) {
      console.error('❌ [REJECT APPLICATION] Erro crítico ao rejeitar aplicação:', error);
      console.error('❌ [REJECT APPLICATION] Detalhes do erro:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      showToast(`Failed to reject application: ${error.message}`, 'error');
    } finally {
      console.log('🏁 [REJECT APPLICATION] Finalizando processo de rejeição');
      setRejectingStudent(false);
    }
  };

  const fetchDocumentRequests = async () => {
    if (!student) {
      console.log('🚫 [ADMIN] No student data available');
      return;
    }
    
    console.log('🔍 [ADMIN] Starting fetchDocumentRequests for student:', student.user_id);
    console.log('🔍 [ADMIN] Student applications:', student.all_applications);
    
    setLoadingDocuments(true);
    try {
      // Buscar document requests específicos para as aplicações do estudante
      const applicationIds = student.all_applications?.map(app => app.id) || [];
      console.log('🔍 [ADMIN] Application IDs:', applicationIds);
      
      let allRequests: any[] = [];
      
      // Buscar requests específicos para cada aplicação
      if (applicationIds.length > 0) {
        console.log('🔍 [ADMIN] Fetching specific requests for applications...');
        const { data: specificRequests, error: specificError } = await supabase
          .from('document_requests')
          .select('*')
          .in('scholarship_application_id', applicationIds)
          .order('created_at', { ascending: false });

        if (specificError) {
          console.error('❌ [ADMIN] Error fetching specific requests:', specificError);
          throw specificError;
        }
        console.log('✅ [ADMIN] Specific requests found:', specificRequests);
        allRequests = [...allRequests, ...(specificRequests || [])];
      }
      
      // Buscar requests globais da universidade
      const universityIds = student.all_applications?.map(app => app.scholarships?.university_id).filter(Boolean) || [];
      const uniqueUniversityIds = [...new Set(universityIds)];
      
      console.log('🔍 [ADMIN] University IDs found:', uniqueUniversityIds);
      
      // Buscar requests globais das universidades específicas
      if (uniqueUniversityIds.length > 0) {
        console.log('🔍 [ADMIN] Fetching global requests for universities...');
        const { data: globalRequests, error: globalError } = await supabase
          .from('document_requests')
          .select('*')
          .eq('is_global', true)
          .in('university_id', uniqueUniversityIds)
          .order('created_at', { ascending: false });

        if (globalError) {
          console.error('❌ [ADMIN] Error fetching global requests:', globalError);
          throw globalError;
        }
        console.log('✅ [ADMIN] Global requests found for specific universities:', globalRequests);
        allRequests = [...allRequests, ...(globalRequests || [])];
      }
      
      console.log('🔍 [ADMIN] Total requests found:', allRequests.length);
      console.log('🔍 [ADMIN] All requests:', allRequests);
      
      // ✅ CORREÇÃO: Buscar uploads separadamente e filtrar por estudante
      if (allRequests.length > 0) {
        const requestIds = allRequests.map(req => req.id);
        const studentUserId = student.user_id; // user_id do estudante
        
        console.log('🔍 [ADMIN] Request IDs to search uploads for:', requestIds);
        console.log('🔍 [ADMIN] Filtering uploads by student user ID:', studentUserId);
        
        const { data: uploads, error: uploadsError } = await supabase
          .from('document_request_uploads')
          .select(`
            *,
            reviewed_by,
            reviewed_at
          `)
          .in('document_request_id', requestIds)
          .eq('uploaded_by', studentUserId); // ✅ Filtrar apenas uploads deste estudante
        
        if (uploadsError) {
          console.error('❌ [ADMIN] Error fetching uploads:', uploadsError);
          console.error('❌ [ADMIN] Uploads error details:', {
            message: uploadsError.message,
            details: uploadsError.details,
            hint: uploadsError.hint,
            code: uploadsError.code
          });
        } else {
          console.log('✅ [ADMIN] Uploads found for this student:', uploads);
          console.log('✅ [ADMIN] Number of uploads found:', uploads?.length || 0);
          
          // Estruturar os requests com seus uploads
          const requestsWithUploads = allRequests.map(request => {
            const requestUploads = uploads?.filter(upload => upload.document_request_id === request.id) || [];
            console.log(`🔍 [ADMIN] Request ${request.id} (${request.title}) has ${requestUploads.length} uploads`);
            return {
            ...request,
              document_request_uploads: requestUploads
            };
          });
          
          console.log('✅ [ADMIN] Final requests with uploads:', requestsWithUploads);
          setDocumentRequests(requestsWithUploads);
          return; // Sair da função aqui
        }
      } else {
        console.log('⚠️ [ADMIN] No document requests found for this student');
      }
      
      // Se não há requests ou uploads, definir como array vazio
      console.log('🔍 [ADMIN] Setting empty document requests');
      setDocumentRequests(allRequests);
    } catch (error) {
      console.error('❌ [ADMIN] Error fetching document requests:', error);
      console.error('❌ [ADMIN] Error details:', {
        message: error.message,
        stack: error.stack
      });
    } finally {
      setLoadingDocuments(false);
      console.log('🔍 [ADMIN] fetchDocumentRequests completed');
    }
  };

  // Utilitário para sanitizar nome de arquivo
  const sanitizeFileName = (fileName: string): string => {
    return fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  // Função para editar template de um document request
  const handleEditTemplate = async (requestId: string, currentTemplate: string | null) => {
    setEditingTemplateRequestId(requestId);
    setCurrentTemplateUrl(currentTemplate);
    setShowEditTemplateModal(true);
  };

  // Função para salvar template editado
  const handleSaveTemplate = async () => {
    if (!editingTemplateRequestId || !editingTemplateFile) return;
    
    try {
      setUploadingTemplate(true);
      
      // Upload do template para o storage
      const sanitized = editingTemplateFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `templates/${Date.now()}_${sanitized}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(storagePath, editingTemplateFile);
      
      if (uploadError) throw uploadError;
      
      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('document-attachments')
        .getPublicUrl(uploadData?.path || storagePath);

      // Atualizar document request com novo template
      const { error: updateError } = await supabase
        .from('document_requests')
        .update({ attachment_url: publicUrl })
        .eq('id', editingTemplateRequestId);

      if (updateError) throw updateError;

      // Log da ação de edição de template
      await logAction(
        'document_request_template_edited',
        `Document request template updated by admin`,
        user?.id || '',
        'admin',
        {
          request_id: editingTemplateRequestId,
          template_url: publicUrl,
          edited_by: user?.email || 'Admin'
        }
      );

      // Fechar modal e limpar estados
      setShowEditTemplateModal(false);
      setEditingTemplateRequestId(null);
      setEditingTemplateFile(null);
      setCurrentTemplateUrl(null);

      // Recarregar document requests
      await fetchDocumentRequests();

      showToast('Template updated successfully!', 'success');
    } catch (error: any) {
      console.error('Error updating template:', error);
      showToast(`Error updating template: ${error.message}`, 'error');
    } finally {
      setUploadingTemplate(false);
    }
  };

  // Criar Document Request (Admin)
  const handleCreateDocumentRequest = async () => {
    if (!student) return;
    try {
      setCreatingDocumentRequest(true);

      // Selecionar uma aplicação alvo (prioriza com acceptance letter, senão primeira)
      const apps = student.all_applications || [];
      const targetApp = apps.find((a: any) => !!a.acceptance_letter_url) || apps[0];
      if (!targetApp) {
        showToast('No application found for this student.', 'error');
        return;
      }

      // Identificar university_id
      let university_id: string | undefined = undefined;
      if (targetApp?.scholarships) {
        university_id = (targetApp.scholarships as any)?.university_id;
      }

      // Upload do anexo (opcional)
      let attachment_url: string | null = null;
      if (newDocumentRequest.attachment) {
        const sanitized = sanitizeFileName(newDocumentRequest.attachment.name);
        const storagePath = `individual/${Date.now()}_${sanitized}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('document-attachments')
          .upload(storagePath, newDocumentRequest.attachment);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('document-attachments')
          .getPublicUrl(uploadData?.path || storagePath);
        attachment_url = publicUrl;
      }

      // Chamar Edge Function para criar request (mesmo fluxo usado pela universidade)
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('Sessão inválida. Faça login novamente.');

      const payload = {
        title: newDocumentRequest.title,
        description: newDocumentRequest.description,
        due_date: newDocumentRequest.due_date || null,
        attachment_url,
        university_id,
        is_global: false,
        status: 'open',
        created_by: user?.id || '',
        scholarship_application_id: targetApp.id
      };

      const FUNCTIONS_URL = (import.meta as any).env.VITE_SUPABASE_FUNCTIONS_URL as string;
      const resp = await fetch(`${FUNCTIONS_URL}/create-document-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });
      let result: any = {};
      try { result = await resp.json(); } catch { /* noop */ }
      if (!resp.ok || !result?.success) throw new Error(result?.error || 'Failed to create request');

      // Recarregar lista
      await fetchDocumentRequests();
      // Limpar formulário
      setNewDocumentRequest({ title: '', description: '', due_date: '', attachment: null });
      setShowNewRequestModal(false);

      // Log: Document Request criado pelo admin
      try {
        await logAction(
          'document_request_created',
          `Document request created by admin: ${newDocumentRequest.title}`,
          user?.id || '',
          'admin',
          {
            title: newDocumentRequest.title,
            description: newDocumentRequest.description,
            due_date: newDocumentRequest.due_date || null,
            is_global: false,
            university_id,
            application_id: targetApp.id
          }
        );
      } catch (logErr) {
        console.error('Failed to log document request creation:', logErr);
      }

      // Notificar aluno (email + sino) - melhor esforço
      try {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email, full_name')
          .eq('user_id', student.user_id)
          .single();
        if (userData?.email) {
          const webhookPayload = {
            tipo_notf: 'Nova solicitação de documento',
            email_aluno: userData.email,
            nome_aluno: userData.full_name || student.student_name,
            email_universidade: user?.email,
            o_que_enviar: `A new document request has been submitted for your review: <strong>${newDocumentRequest.title}</strong>. Please log in to your dashboard to view the details and upload the requested document.`
          };
          await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload)
          });
        }
        // Sino in-app
        if (accessToken) {
          await fetch(`${FUNCTIONS_URL}/create-student-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              user_id: student.user_id,
              title: 'New document request',
              message: `A new document request was created: ${newDocumentRequest.title}.`,
              type: 'document_request_created',
              link: `/student/dashboard/application/${targetApp.id}/chat?tab=documents`
            })
          });
        }
      } catch { /* ignore notification errors */ }

      showToast('Document request created successfully!', 'success');
    } catch (err: any) {
      console.error('Error creating document request:', err);
      showToast(`Failed to create document request: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setCreatingDocumentRequest(false);
    }
  };

  const handleViewDocument = (doc: any) => {
    console.log('🔍 [ADMIN] Opening document:', doc);
    console.log('🔍 [ADMIN] file_url:', doc.file_url);
    console.log('🔍 [ADMIN] Current previewUrl:', previewUrl);
    
    if (doc.file_url) {
      // Sempre atualizar para forçar re-render
      setPreviewUrl(doc.file_url);
      console.log('🔍 [ADMIN] Set previewUrl to:', doc.file_url);
      
      // Verificar se o modal está sendo renderizado
      setTimeout(() => {
        const modal = document.querySelector('.document-viewer-overlay');
        console.log('🔍 [ADMIN] Modal element found after setState:', modal);
        if (modal) {
          console.log('🔍 [ADMIN] Modal is visible:', (modal as HTMLElement).style.display !== 'none');
          console.log('🔍 [ADMIN] Modal z-index:', (modal as HTMLElement).style.zIndex);
        } else {
          console.log('❌ [ADMIN] Modal element NOT found after setState');
        }
      }, 200);
    } else {
      console.log('❌ [ADMIN] No file_url found in document');
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    if (!doc.file_url) return;
    
    try {
      // Fazer download direto sem abrir nova aba
      const response = await fetch(doc.file_url);
      if (!response.ok) {
        throw new Error('Failed to download document: ' + response.statusText);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.filename || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Erro no download:', err);
      showToast(`Failed to download document: ${err.message}`, 'error');
    }
  };

  const handleUploadDocumentRequest = async (requestId: string, file: File) => {
    if (!student || !isPlatformAdmin) return;
    
    const key = `request-${requestId}`;
    setUploadingDocumentRequest(prev => ({ ...prev, [key]: true }));
    
    try {
      // Upload do arquivo para o Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${student.student_id}/${requestId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('student-documents')
        .getPublicUrl(filePath);
      
      if (!publicUrl) throw new Error('Uploaded file is not accessible');
      
      // Inserir registro na tabela document_request_uploads
      const { error: insertError } = await supabase
        .from('document_request_uploads')
        .insert({
          document_request_id: requestId,
          uploaded_by: student.user_id,
          file_url: publicUrl,
          status: 'under_review',
          uploaded_at: new Date().toISOString()
        });
      
      if (insertError) throw insertError;
      
      // Recarregar document requests para mostrar o novo upload
      await fetchDocumentRequests();
      
      // Log: Upload feito pelo admin para um document request
      try {
        await logAction(
          'document_request_uploaded',
          `Admin uploaded a document for request ${requestId}`,
          user?.id || '',
          'admin',
          {
            request_id: requestId,
            file_url: publicUrl,
            filename: fileName
          }
        );
      } catch (logErr) {
        console.error('Failed to log admin document upload:', logErr);
      }

      showToast('Document uploaded successfully!', 'success');
    } catch (error: any) {
      console.error('Error uploading document:', error);
      showToast(`Error uploading document: ${error.message}`, 'error');
    } finally {
      setUploadingDocumentRequest(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleApproveDocumentRequest = async (uploadId: string) => {
    if (!isPlatformAdmin) return;
    
    const key = `approve-${uploadId}`;
    setApprovingDocumentRequest(prev => ({ ...prev, [key]: true }));
    
    try {
      console.log('🔍 [APPROVE] Approving document upload:', uploadId);
      console.log('🔍 [APPROVE] Current user ID:', user?.id);
      console.log('🔍 [APPROVE] Is platform admin:', isPlatformAdmin);
      
      const { data, error } = await supabase
        .from('document_request_uploads')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', uploadId)
        .select();
      
      if (error) throw error;
      
      console.log('✅ [APPROVE] Document approved successfully:', data);
      
      // Recarregar document requests para mostrar a mudança
      await fetchDocumentRequests();
      
      // Log the action
      try {
        await logAction(
          'document_approval',
          `Document request upload approved by admin`,
          user?.id || '',
          'admin',
          {
            upload_id: uploadId,
            document_type: 'document_request_upload',
            approved_by: user?.email || 'Admin'
          }
        );
      } catch (logError) {
        console.error('Failed to log action:', logError);
      }
      
      showToast('Document approved successfully!', 'success');
    } catch (error: any) {
      console.error('❌ [APPROVE] Error approving document:', error);
      showToast(`Error approving document: ${error.message}`, 'error');
    } finally {
      setApprovingDocumentRequest(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleRejectDocumentRequest = async (uploadId: string, reason: string) => {
    if (!isPlatformAdmin) return;
    
    const key = `reject-${uploadId}`;
    setRejectingDocumentRequest(prev => ({ ...prev, [key]: true }));
    
    try {
      console.log('🔍 [REJECT] Rejecting document upload:', uploadId);
      console.log('🔍 [REJECT] Reason:', reason);
      console.log('🔍 [REJECT] Current user ID:', user?.id);
      console.log('🔍 [REJECT] Is platform admin:', isPlatformAdmin);
      
      const { data, error } = await supabase
        .from('document_request_uploads')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', uploadId)
        .select();
      
      if (error) throw error;
      
      console.log('✅ [REJECT] Document rejected successfully:', data);
      
      // Recarregar document requests para mostrar a mudança
      await fetchDocumentRequests();
      
      // Log the action
      try {
        await logAction(
          'document_rejection',
          `Document request upload rejected by admin: ${reason}`,
          user?.id || '',
          'admin',
          {
            upload_id: uploadId,
            document_type: 'document_request_upload',
            rejected_by: user?.email || 'Admin',
            rejection_reason: reason
          }
        );
      } catch (logError) {
        console.error('Failed to log action:', logError);
      }
      
      showToast('Document rejected successfully!', 'success');
    } catch (error: any) {
      console.error('❌ [REJECT] Error rejecting document:', error);
      showToast(`Error rejecting document: ${error.message}`, 'error');
    } finally {
      setRejectingDocumentRequest(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleUploadOrReplaceDocument = async (applicationId: string, docType: string, file: File) => {
    if (!canUniversityManage || !student) return;
    const k = `${applicationId}:${docType}`;
    setUploadingDocs(p => ({ ...p, [k]: true }));
    try {
      // Caminho no bucket
      const safeDocType = docType.replace(/[^a-z0-9_\-]/gi, '').toLowerCase();
      const timestamp = Date.now();
      const storagePath = `${student.student_id}/${applicationId}/${safeDocType}_${timestamp}_${file.name}`;

      // Upload no bucket student-documents (upsert para substituir)
      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(storagePath, file, { upsert: true, cacheControl: '3600' });
      if (uploadError) {
        console.error('Upload error:', uploadError);
        return;
      }

      // URL pública
      const { data: pub } = supabase.storage.from('student-documents').getPublicUrl(storagePath);
      const publicUrl = pub?.publicUrl || storagePath;

      // Atualizar array de documentos na aplicação
      const targetApp = student.all_applications?.find((a: any) => a.id === applicationId);
      if (!targetApp) return;
      const currentDocs: any[] = Array.isArray(targetApp.documents) ? targetApp.documents : [];
      let found = false;
      const updatedDocs = currentDocs.map((d: any) => {
        if (d?.type === docType) {
          found = true;
          return {
            ...d,
            url: publicUrl,
            status: 'under_review',
            uploaded_at: new Date().toISOString()
          };
        }
        return d;
      });
      const finalDocs = found
        ? updatedDocs
        : [...updatedDocs, { type: docType, url: publicUrl, status: 'under_review', uploaded_at: new Date().toISOString() }];

      const { data, error } = await supabase
        .from('scholarship_applications')
        .update({ documents: finalDocs, updated_at: new Date().toISOString() })
        .eq('id', applicationId)
        .select('id, documents')
        .single();
      if (error) {
        console.error('Update documents error:', error);
        return;
      }

      setStudent(prev => {
        if (!prev) return prev;
        const updatedApps = (prev.all_applications || []).map((a: any) => a.id === applicationId ? { ...a, documents: data?.documents || finalDocs } : a);
        return { ...prev, all_applications: updatedApps } as any;
      });
    } finally {
      setUploadingDocs(p => ({ ...p, [k]: false }));
    }
  };

  // Função para enviar formulário de transferência
  const handleUploadTransferForm = async () => {
    if (!isPlatformAdmin || !student || !transferFormFile) return;
    
    try {
      setUploadingTransferForm(true);
      
      // Encontrar aplicação do aluno transfer
      const transferApp = getTransferApplication();
      
      if (!transferApp) {
        showToast('No transfer application found for this student', 'error');
        return;
      }
      
      // Se já existe um formulário, deletar o arquivo anterior
      if (transferApp.transfer_form_url) {
        try {
          const oldPath = transferApp.transfer_form_url.split('/').pop();
          if (oldPath) {
            await supabase.storage
              .from('document-attachments')
              .remove([`transfer-forms/${oldPath}`]);
          }
        } catch (deleteError) {
          console.warn('Could not delete old transfer form:', deleteError);
          // Continuar mesmo se não conseguir deletar o arquivo antigo
        }
      }
      
      // Sanitizar nome do arquivo
      const sanitized = sanitizeFileName(transferFormFile.name);
      const storagePath = `transfer-forms/${Date.now()}_${sanitized}`;
      
      // Upload para Supabase Storage (upsert para substituir se existir)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(storagePath, transferFormFile, { upsert: true });
        
      if (uploadError) throw uploadError;
      
      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('document-attachments')
        .getPublicUrl(uploadData?.path || storagePath);
      
      // Atualizar a aplicação com o formulário de transferência
      const { error: updateError } = await supabase
        .from('scholarship_applications')
        .update({
          transfer_form_url: publicUrl,
          transfer_form_status: 'sent',
          transfer_form_sent_at: new Date().toISOString()
        })
        .eq('id', transferApp.id);
        
      if (updateError) throw updateError;
      
      const isReplacement = transferApp.transfer_form_url ? 'replaced' : 'sent';
      showToast(`Transfer form ${isReplacement} successfully!`, 'success');
      
      // Não limpar o arquivo selecionado - deixar o usuário decidir quando cancelar
      // setTransferFormFile(null);
      
      // Recarregar dados do estudante
      if (profileId) {
        const { data: s, error } = await supabase
          .from('user_profiles')
          .select(`
            id,
            user_id,
            full_name,
            email,
            phone,
            country,
            field_of_interest,
            academic_level,
            gpa,
            english_proficiency,
            status,
            avatar_url,
            dependents,
            desired_scholarship_range,
            created_at,
            has_paid_selection_process_fee,
            has_paid_i20_control_fee,
            selection_process_fee_payment_method,
            i20_control_fee_payment_method,
            role,
            seller_referral_code,
            admin_notes,
            scholarship_applications (
              id,
              scholarship_id,
              status,
              applied_at,
              is_application_fee_paid,
              is_scholarship_fee_paid,
              application_fee_payment_method,
              scholarship_fee_payment_method,
              acceptance_letter_status,
              acceptance_letter_url,
              acceptance_letter_sent_at,
              acceptance_letter_signed_at,
              acceptance_letter_approved_at,
              transfer_form_url,
              transfer_form_status,
              transfer_form_sent_at,
              student_process_type,
              payment_status,
              reviewed_at,
              reviewed_by,
              documents,
              scholarships (
                title,
                university_id,
                field_of_study,
                annual_value_with_scholarship,
                application_fee_amount,
                universities (
                  name
                )
              )
            )
          `)
          .eq('id', profileId)
          .single();

        if (error) throw error;
        if (s) {
          // Processar dados do estudante
          const lockedApplication = s.scholarship_applications?.find((app: any) => app.status === 'locked');
          let activeApplication = null;
          if (!lockedApplication && s.scholarship_applications && s.scholarship_applications.length > 0) {
            activeApplication = s.scholarship_applications
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          }
          setStudent({
            student_id: s.id,
            user_id: s.user_id,
            student_name: s.full_name || 'Unknown Student',
            student_email: s.email || '',
            phone: s.phone,
            country: s.country,
            field_of_interest: s.field_of_interest,
            academic_level: s.academic_level,
            gpa: s.gpa,
            english_proficiency: s.english_proficiency,
            status: s.status,
            avatar_url: s.avatar_url,
            dependents: s.dependents || 0,
            desired_scholarship_range: s.desired_scholarship_range,
            student_created_at: s.created_at,
            has_paid_selection_process_fee: s.has_paid_selection_process_fee || false,
            has_paid_i20_control_fee: s.has_paid_i20_control_fee || false,
            selection_process_fee_payment_method: s.selection_process_fee_payment_method,
            i20_control_fee_payment_method: s.i20_control_fee_payment_method,
            seller_referral_code: s.seller_referral_code,
            application_id: lockedApplication?.id || null,
            scholarship_id: lockedApplication?.scholarship_id || null,
            application_status: lockedApplication?.status || null,
            applied_at: lockedApplication?.applied_at || null,
            is_application_fee_paid: (() => {
              // Verificar se alguma aplicação tem Application Fee pago
              return s.scholarship_applications?.some((app: any) => app.is_application_fee_paid) || false;
            })(),
            is_scholarship_fee_paid: lockedApplication?.is_scholarship_fee_paid || false,
            application_fee_payment_method: lockedApplication?.application_fee_payment_method || null,
            scholarship_fee_payment_method: lockedApplication?.scholarship_fee_payment_method || null,
            acceptance_letter_status: lockedApplication?.acceptance_letter_status || null,
            student_process_type: lockedApplication?.student_process_type || activeApplication?.student_process_type || null,
            payment_status: lockedApplication?.payment_status || null,
            scholarship_title: (() => {
              // Buscar aplicação que teve Application Fee pago
              const paidApplication = s.scholarship_applications?.find((app: any) => app.is_application_fee_paid);
              if (paidApplication?.scholarships) {
                const scholarship = Array.isArray(paidApplication.scholarships) 
                  ? paidApplication.scholarships[0] 
                  : paidApplication.scholarships;
                return scholarship?.title || null;
              }
              return null;
            })(),
            university_name: (() => {
              // Buscar aplicação que teve Application Fee pago
              const paidApplication = s.scholarship_applications?.find((app: any) => app.is_application_fee_paid);
              if (paidApplication?.scholarships) {
                const scholarship = Array.isArray(paidApplication.scholarships) 
                  ? paidApplication.scholarships[0] 
                  : paidApplication.scholarships;
                const university = Array.isArray(scholarship?.universities) 
                  ? scholarship.universities[0] 
                  : scholarship?.universities;
                return university?.name || null;
              }
              return null;
            })(),
            reviewed_at: lockedApplication?.reviewed_at || null,
            reviewed_by: lockedApplication?.reviewed_by || null,
            is_locked: !!lockedApplication,
            total_applications: s.scholarship_applications ? s.scholarship_applications.length : 0,
            all_applications: s.scholarship_applications || [],
            admin_notes: s.admin_notes
          });
        }
      }
      
    } catch (error: any) {
      console.error('Error uploading transfer form:', error);
      showToast(error.message || 'Failed to upload transfer form', 'error');
    } finally {
      setUploadingTransferForm(false);
    }
  };

  // Funções para gerenciar uploads do transfer form
  // Função utilitária para encontrar a aplicação transfer correta (priorizando a que tem application fee paga)
  const getTransferApplication = () => {
    const transferApps = student?.all_applications?.filter((app: any) => 
      app.student_process_type === 'transfer'
    ) || [];
    
    // Priorizar aplicação com application fee paga
    return transferApps.find((app: any) => app.is_application_fee_paid) || transferApps[0];
  };

  // Função para redirecionar para o inbox do chat
  const handleOpenChat = async () => {
    if (student?.user_id) {
      // First, try to find existing conversation with this student
      try {
        let query = supabase
          .from('admin_student_conversations')
          .select('id, admin_id')
          .eq('student_id', student.user_id);

        // For affiliate admins, only look for their own conversations
        // For regular admins, look for any existing conversation with this student
        if (userProfile && userProfile.role === 'affiliate_admin') {
          query = query.eq('admin_id', user?.id);
        }

        const { data: existingConversations, error } = await query;

        if (error) {
          console.error('Error finding existing conversation:', error);
        }

        if (existingConversations && existingConversations.length > 0) {
          // Use the first existing conversation (most recent)
          const existingConversation = existingConversations[0];
          navigate(`/admin/dashboard/users?tab=messages&conversation=${existingConversation.id}&recipient_id=${student.user_id}`);
        } else {
          // Navigate to create new conversation
          navigate(`/admin/dashboard/users?tab=messages&recipient_id=${student.user_id}`);
        }
      } catch (e) {
        console.error('Error in handleOpenChat:', e);
        // Fallback to creating new conversation
        navigate(`/admin/dashboard/users?tab=messages&recipient_id=${student.user_id}`);
      }
    }
  };

  const handleGoToZellePayments = () => {
    navigate('/admin/dashboard/payments?tab=zelle');
  };

  const handleApproveTransferFormUpload = async (uploadId: string) => {
    try {
      const { error } = await supabase
        .from('transfer_form_uploads')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', uploadId);
      
      if (error) throw error;
      
      // Recarregar uploads
      const transferApp = getTransferApplication();
      
      if (transferApp) {
        const { data: newUploads } = await supabase
          .from('transfer_form_uploads')
          .select('*')
          .eq('application_id', transferApp.id)
          .order('uploaded_at', { ascending: false });
        
        if (newUploads) {
          setTransferFormUploads(newUploads);
        }
      }
      
      showToast('Transfer form approved successfully!', 'success');
      
    } catch (error: any) {
      console.error('Erro ao aprovar transfer form:', error);
      showToast('Error approving transfer form: ' + error.message, 'error');
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
          reviewed_by: user?.id
        })
        .eq('id', uploadId);
      
      if (error) throw error;
      
      // Recarregar uploads
      const transferApp = getTransferApplication();
      
      if (transferApp) {
        const { data: newUploads } = await supabase
          .from('transfer_form_uploads')
          .select('*')
          .eq('application_id', transferApp.id)
          .order('uploaded_at', { ascending: false });
        
        if (newUploads) {
          setTransferFormUploads(newUploads);
        }
      }
      
      showToast('Transfer form rejected successfully!', 'success');
      
    } catch (error: any) {
      console.error('Erro ao rejeitar transfer form:', error);
      showToast('Error rejecting transfer form: ' + error.message, 'error');
    }
  };

  if (loading || !student) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Details</h1>
          <p className="text-slate-600">Detailed view for {student.student_name}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleOpenChat}
            className="group relative px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl flex items-center space-x-3 transition-all duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-100 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2"
            title="Send message to student"
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </div>
            <span className="font-medium text-sm relative z-10">Send Message</span>
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2"
          >
            <span className="font-medium text-sm">Back</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-[#05294E] text-[#05294E]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'documents'
                  ? 'border-[#05294E] text-[#05294E]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => setActiveTab('scholarships')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'scholarships'
                  ? 'border-[#05294E] text-[#05294E]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Scholarships
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'logs'
                  ? 'border-[#05294E] text-[#05294E]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Activity Log
            </button>
          </nav>
        </div>
      </div>

      {/* Zelle Payments Pending Alert */}
      {pendingZellePayments.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-yellow-600" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Pending Zelle Payment Approvals
                </h3>
                <p className="text-sm text-yellow-700">
                  This student has a Zelle payment awaiting administrative approval.
                </p>
              </div>
            </div>
            <button
              onClick={handleGoToZellePayments}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <span>Review Payments</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#0a4a7a] px-6 py-4">
              <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <User className="w-6 h-6 mr-3" />
                Student Information
              </h2>
                {canEditProfile && (
                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSaveProfile}
                          disabled={savingProfile}
                          className="px-3 py-1 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-1"
                        >
                          <Save className="w-4 h-4" />
                          <span>{savingProfile ? 'Saving...' : 'Save'}</span>
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-1"
                        >
                          <X className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg flex items-center space-x-1"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                    )}
            </div>
                )}
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Personal & Contact Information */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-[#05294E]" />
                  Personal & Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-slate-600">Full Name</dt>
                    {isEditing ? (
                      <input
                        value={student.student_name}
                        onChange={(e) => setStudent(prev => prev ? { ...prev, student_name: e.target.value } : prev)}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    ) : (
                      <dd className="text-base font-semibold text-slate-900 mt-1">{student.student_name}</dd>
                    )}
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-600">Email</dt>
                    {isEditing ? (
                      <input
                        type="email"
                        value={student.student_email}
                        onChange={(e) => setStudent(prev => prev ? { ...prev, student_email: e.target.value } : prev)}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    ) : (
                      <dd className="text-base text-slate-900 mt-1">{student.student_email}</dd>
                    )}
                    </div>
                    <div>
                    <dt className="text-sm font-medium text-slate-600">Phone</dt>
                    {isEditing ? (
                      <input
                        value={student.phone || ''}
                        onChange={(e) => setStudent(prev => prev ? { ...prev, phone: e.target.value } : prev)}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    ) : (
                      <dd className="text-base text-slate-900 mt-1">{student.phone || 'Not provided'}</dd>
                    )}
                    </div>
                      <div>
                    <dt className="text-sm font-medium text-slate-600">Country</dt>
                    {isEditing ? (
                      <input
                        value={student.country || ''}
                        onChange={(e) => setStudent(prev => prev ? { ...prev, country: e.target.value } : prev)}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    ) : (
                      <dd className="text-base text-slate-900 mt-1">{student.country || 'Not provided'}</dd>
                    )}
                      </div>
                </div>
              </div>

              {/* Academic Information */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-[#05294E]" />
                  Academic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-slate-600">Field of Interest</dt>
                    {isEditing ? (
                      <input
                        value={student.field_of_interest || ''}
                        onChange={(e) => setStudent(prev => prev ? { ...prev, field_of_interest: e.target.value } : prev)}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    ) : (
                      <dd className="text-base text-slate-900 mt-1">{student.field_of_interest || 'Not provided'}</dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-600">Academic Level</dt>
                    {isEditing ? (
                      <select
                        value={student.academic_level || ''}
                        onChange={(e) => setStudent(prev => prev ? { ...prev, academic_level: e.target.value } : prev)}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="">Select level</option>
                        <option value="high_school">High School</option>
                        <option value="bachelor">Bachelor's</option>
                        <option value="master">Master's</option>
                        <option value="phd">PhD</option>
                      </select>
                    ) : (
                      <dd className="text-base text-slate-900 mt-1">{student.academic_level || 'Not provided'}</dd>
                    )}
                </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-600">GPA</dt>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="4"
                        value={student.gpa || ''}
                        onChange={(e) => setStudent(prev => prev ? { ...prev, gpa: e.target.value ? Number(e.target.value) : null } : prev)}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    ) : (
                      <dd className="text-base text-slate-900 mt-1">{student.gpa ? student.gpa.toFixed(2) : 'Not provided'}</dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-600">English Proficiency</dt>
                    {isEditing ? (
                      <select
                        value={student.english_proficiency || ''}
                        onChange={(e) => setStudent(prev => prev ? { ...prev, english_proficiency: e.target.value } : prev)}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="">Select level</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="native">Native</option>
                      </select>
                    ) : (
                      <dd className="text-base text-slate-900 mt-1">{student.english_proficiency || 'Not provided'}</dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-600">Student Process Type</dt>
                    <dd className="text-base text-slate-900 mt-1 capitalize">
                      {isEditingProcessType ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editingProcessType}
                            onChange={(e) => setEditingProcessType(e.target.value)}
                            className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={savingProcessType}
                          >
                            <option value="initial">Initial</option>
                            <option value="transfer">Transfer</option>
                            <option value="change_of_status">Change of Status</option>
                            <option value="enrolled">Enrolled</option>
                          </select>
                          <button
                            onClick={handleSaveProcessType}
                            disabled={savingProcessType}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                            title="Save"
                          >
                            {savingProcessType ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={handleCancelProcessType}
                            disabled={savingProcessType}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{student.student_process_type || 'Not defined'}</span>
                          <button
                            onClick={handleEditProcessType}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit Process Type"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </dd>
                  </div>
                </div>
              </div>

              {/* Financial & Scholarship Information */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-[#05294E]" />
                  Financial & Scholarship Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-slate-600">Dependents</dt>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={dependents}
                        onChange={(e) => setDependents(Math.max(0, Number(e.target.value || 0)))}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    ) : (
                      <dd className="text-base text-slate-900 mt-1">{dependents}</dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-600">Desired Scholarship Range</dt>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={student.desired_scholarship_range || ''}
                        onChange={(e) => setStudent(prev => prev ? { ...prev, desired_scholarship_range: e.target.value ? Number(e.target.value) : null } : prev)}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    ) : (
                      <dd className="text-base text-slate-900 mt-1">{student.desired_scholarship_range ? `$${student.desired_scholarship_range.toLocaleString()}` : 'Not specified'}</dd>
                    )}
                  </div>
                </div>
              </div>

              {/* System & Status Information */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-[#05294E]" />
                  System & Status Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-slate-600">Registration Date</dt>
                    <dd className="text-base text-slate-900 mt-1">{new Date(student.student_created_at).toLocaleDateString()}</dd>
                  </div>
                  <div>
                  <dt className="text-sm font-medium text-slate-600">Current Status</dt>
                    <div className="flex items-center space-x-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${
                      student.is_locked ? 'bg-green-500' :
                        student.application_status === 'approved' ? 'bg-blue-500' :
                        student.application_status === 'under_review' ? 'bg-yellow-500' :
                      student.total_applications > 0 ? 'bg-orange-500' : 'bg-gray-500'
                    }`}></div>
                    <span className="text-sm font-medium">
                      {student.is_locked ? 'Scholarship Selected' :
                          student.application_status === 'approved' ? 'Approved - Pending Payment' :
                          student.application_status === 'under_review' ? 'Under Review' :
                        student.total_applications > 0 ? 'Applications Submitted' : 'No Applications Yet'}
                    </span>
                  </div>
                </div>
                  {student.seller_referral_code && (
                    <div className="md:col-span-2">
                      <dt className="text-sm font-medium text-slate-600">Referral Code</dt>
                      {isEditing ? (
                        <input
                          value={student.seller_referral_code}
                          onChange={(e) => setStudent(prev => prev ? { ...prev, seller_referral_code: e.target.value } : prev)}
                          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                        />
                      ) : (
                        <div className="mt-1 space-y-2">
                          <dd className="text-base text-slate-900 font-mono bg-slate-200 px-3 py-2 rounded-lg">{student.seller_referral_code}</dd>
                          {referralInfo && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  referralInfo.type === 'seller' ? 'bg-green-500' :
                                  referralInfo.type === 'affiliate' ? 'bg-blue-500' :
                                  'bg-purple-500'
                                }`}></div>
                                <span className="text-sm font-medium text-slate-700">
                                  {referralInfo.type === 'seller' ? 'Seller' :
                                   referralInfo.type === 'affiliate' ? 'Affiliate' :
                                   (referralInfo.isRewards ? 'Student Referral (Rewards)' : 'Student')} Referral
                                </span>
              </div>
                              <div className="text-sm text-slate-600">
                                <div className="font-medium">{referralInfo.name || 'Unknown'}</div>
                                <div className="text-slate-500">{referralInfo.email || 'No email'}</div>
                                {referralInfo.type === 'seller' && (referralInfo.affiliateName || referralInfo.affiliateEmail) && (
                                  <div className="mt-2 pl-3 border-l-2 border-blue-200">
                                    <div className="text-xs text-slate-500 mb-1">Affiliate</div>
                                    <div className="text-sm font-medium text-slate-700">{referralInfo.affiliateName || 'Unknown'}</div>
                                    <div className="text-sm text-slate-500">{referralInfo.affiliateEmail || 'No email'}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {!referralInfo && (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                              <div className="text-sm text-slate-500">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                  <span>Referral source not found</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Notes - Only for Platform Admins */}
              {isPlatformAdmin && (
                <div className="bg-slate-50 rounded-xl p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-[#05294E]" />
                  Admin Notes
                </h3>
                <button
                  onClick={() => setIsAddingNote(true)}
                  className="px-3 py-1 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  <span>New Note</span>
                </button>
              </div>
                  <div className="space-y-4">
                    {/* Formulário para adicionar nova nota */}
                    {isAddingNote && (
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Add a new note
                      </label>
                      <textarea
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        placeholder="Enter your note about this student..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] resize-none"
                        rows={3}
                        disabled={savingNotes}
                      />
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-slate-500">
                          These notes are only visible to platform administrators.
                        </p>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => { setIsAddingNote(false); setNewNoteContent(''); }}
                            disabled={savingNotes}
                            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span>Cancel</span>
                          </button>
                          <button
                            onClick={async () => { await handleAddNote(); setIsAddingNote(false); }}
                            disabled={savingNotes || !newNoteContent.trim()}
                            className="px-4 py-2 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Save className="w-4 h-4" />
                            <span>{savingNotes ? 'Adding...' : 'Add Note'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    )}

                    {/* Lista de notas existentes */}
                    <div className="space-y-3">
                      {adminNotes.length > 0 ? (
                        <div className="space-y-3">
                          {adminNotes.map((note, index) => (
                            <div key={note.id} className="bg-white border border-slate-200 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-[#05294E] rounded-full flex-shrink-0 mt-2"></div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-900">{note.created_by_name}</p>
                                    <p className="text-xs text-slate-500">
                                      {new Date(note.created_at).toLocaleString('pt-BR', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                                    #{adminNotes.length - index}
                                  </span>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={() => handleEditNote(note.id)}
                                      disabled={savingNotes || editingNoteId === note.id}
                                      className="p-1 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Edit note"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteNote(note.id)}
                                      disabled={savingNotes || editingNoteId === note.id}
                                      className="p-1 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Delete note"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Conteúdo da nota - modo visualização ou edição */}
                              {editingNoteId === note.id ? (
                                <div className="ml-4 space-y-3">
                                  <textarea
                                    value={editingNoteContent}
                                    onChange={(e) => setEditingNoteContent(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] resize-none text-sm"
                                    rows={3}
                                    disabled={savingNotes}
                                  />
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={handleSaveEditNote}
                                      disabled={savingNotes || !editingNoteContent.trim()}
                                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <Save className="w-3 h-3" />
                                      <span>{savingNotes ? 'Saving...' : 'Save'}</span>
                                    </button>
                                    <button
                                      onClick={handleCancelEditNote}
                                      disabled={savingNotes}
                                      className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <X className="w-3 h-3" />
                                      <span>Cancel</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-slate-900 text-sm whitespace-pre-wrap ml-4">
                                  {note.content}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">No notes added yet</p>
                          <p className="text-xs text-slate-400 mt-1">Add your first note above</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {student.scholarship_title && student.is_application_fee_paid ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
              <div className="bg-gradient-to-r rounded-t-2xl from-slate-700 to-slate-800 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <Award className="w-6 h-6 mr-3" />
                  Selected Scholarship
                </h2>
              </div>
              <div className="p-6 space-y-3">
                <div>
                  <dt className="text-sm font-medium text-slate-600">Scholarship Program</dt>
                  <dd className="text-lg font-semibold text-slate-900">{student.scholarship_title}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-600">University</dt>
                  <dd className="text-lg font-semibold text-slate-900 flex items-center"><Building className="w-4 h-4 mr-1" />{student.university_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-600">Course</dt>
                  <dd className="text-base font-semibold text-slate-900">
                    {(() => {
                      const paidApplication = (student.all_applications || []).find((app: any) => app.is_application_fee_paid);
                      const scholarship = paidApplication?.scholarships
                        ? (Array.isArray(paidApplication.scholarships) ? paidApplication.scholarships[0] : paidApplication.scholarships)
                        : null;
                      return scholarship?.field_of_study || 'N/A';
                    })()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-600">Annual Value (with Scholarship)</dt>
                  <dd className="text-base font-semibold text-slate-900">
                    {(() => {
                      const paidApplication = (student.all_applications || []).find((app: any) => app.is_application_fee_paid);
                      const scholarship = paidApplication?.scholarships
                        ? (Array.isArray(paidApplication.scholarships) ? paidApplication.scholarships[0] : paidApplication.scholarships)
                        : null;
                      const v = scholarship?.annual_value_with_scholarship;
                      return typeof v === 'number' ? `$${v.toLocaleString()}` : (v ? `$${Number(v).toLocaleString()}` : 'N/A');
                    })()}
                  </dd>
                </div>
              </div>
            </div>
          ) : null}

          {/* Documents */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#0a4a7a] px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <FileText className="w-6 h-6 mr-3" />
                Student Documents
              </h2>
            </div>
            <div className="p-6">
              {(() => {
                const allApplications = student.all_applications || [];
                if (allApplications.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No Applications Yet</h3>
                    </div>
                  );
                }
                return (
                  <div className="space-y-4">
                    {allApplications
                      .sort((a: any, b: any) => {
                        // Aplicações aprovadas primeiro
                        if (a.status === 'approved' && b.status !== 'approved') return -1;
                        if (b.status === 'approved' && a.status !== 'approved') return 1;
                        return 0;
                      })
                      .map((app: any, i: number) => {
                      const appKey = app.id || `app-${i}`;
                      const isExpanded = expandedApps[appKey] || false;
                      
                      console.log('🎨 [RENDER APPLICATION CARD]', {
                        appId: app.id,
                        status: app.status,
                        scholarship: app.scholarships?.title,
                        isExpanded
                      });
                      
                      return (
                        <div key={appKey} className={`border rounded-xl overflow-hidden ${
                          app.status === 'approved' 
                            ? 'border-green-200 bg-green-50' 
                            : app.status === 'rejected'
                            ? 'border-red-200 bg-red-50'
                            : 'border-slate-200'
                        }`}>
                          <button onClick={() => setExpandedApps(p => ({ ...p, [appKey]: !isExpanded }))} className={`w-full px-4 py-3 transition-colors text-left flex items-center justify-between ${
                            app.status === 'approved' 
                              ? 'bg-green-50 hover:bg-green-100' 
                              : app.status === 'rejected'
                              ? 'bg-red-50 hover:bg-red-100'
                              : 'bg-slate-50 hover:bg-slate-100'
                          }`}>
                            <div className="flex items-center space-x-3">
                              {app.status === 'approved' && (
                                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                              )}
                              {app.status === 'rejected' && (
                                <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                              )}
                            <div>
                                <h4 className="font-semibold text-slate-900 flex items-center space-x-2">
                                  <span>{app.scholarships?.title || 'Scholarship Application'}</span>
                                  {app.status === 'approved' && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Approved
                                    </span>
                                  )}
                                </h4>
                              <p className="text-sm text-slate-600">{app.scholarships?.universities?.name || 'University'} • {app.documents ? app.documents.length : 0} documents</p>
                              <div className="mt-1 text-xs text-slate-700">
                                <div>
                                  <span className="text-slate-500">Course:</span>{' '}
                                  <span className="font-medium">{(() => {
                                    const scholarship = app.scholarships ? (Array.isArray(app.scholarships) ? app.scholarships[0] : app.scholarships) : null;
                                    return scholarship?.field_of_study || 'N/A';
                                  })()}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Annual Value:</span>{' '}
                                  <span className="font-medium">{(() => {
                                    const scholarship = app.scholarships ? (Array.isArray(app.scholarships) ? app.scholarships[0] : app.scholarships) : null;
                                    const v = scholarship?.annual_value_with_scholarship;
                                    return typeof v === 'number' ? `$${v.toLocaleString()}` : (v ? `$${Number(v).toLocaleString()}` : 'N/A');
                                  })()}</span>
                                </div>
                              </div>
                              </div>
                            </div>
                            <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          {isExpanded && (
                            <div className="p-4 bg-white border-t border-slate-200">
                              {app.documents && app.documents.length > 0 ? (
                                <div className="grid gap-3">
                                  {app.documents.map((doc: any, docIndex: number) => (
                                  <div key={`${app.id}-${doc.type}-${docIndex}`} className="border border-slate-200 rounded-lg p-4">
                                    <div className="flex flex-col md:flex-row items-start justify-between gap-2 mb-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1">
                                          <h5 className="font-semibold text-slate-900 text-sm">{(doc.type || '').replace('_',' ').replace(/^./, (c: string) => c.toUpperCase())}</h5>
                                        </div>
                                        <p className="text-xs text-slate-600 mb-2">Document submitted by student</p>
                                      </div>
                                      <div className="flex items-center flex-wrap gap-1 ml-0 md:ml-3 flex-shrink-0 justify-start md:justify-end w-full md:w-auto">
                                        <button
                                          onClick={() => handleViewDocument({
                                            file_url: doc.url,
                                            filename: doc.url.split('/').pop() || `${doc.type}.pdf`
                                          })}
                                          className="text-xs text-[#05294E] hover:text-[#05294E]/80 font-medium flex items-center space-x-1 transition-colors px-2 py-1 border border-[#05294E] rounded-md hover:bg-[#05294E]/5"
                                        >
                                          <Eye className="w-3 h-3" />
                                          <span className="hidden md:inline">View</span>
                                        </button>
                                        {canUniversityManage && (
                                          <label className="text-xs text-slate-600 hover:text-slate-800 font-medium flex items-center space-x-1 transition-colors px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer">
                                            <input
                                              type="file"
                                              accept="application/pdf,image/*"
                                              className="hidden"
                                              onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) handleUploadOrReplaceDocument(app.id, doc.type, f);
                                              }}
                                            />
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16h16M8 12l3 3 5-7" /></svg>
                                            <span className="hidden md:inline">{uploadingDocs[`${app.id}:${doc.type}`] ? 'Uploading...' : 'Replace'}</span>
                                          </label>
                                        )}
                                        {isPlatformAdmin && ['passport','funds_proof','diploma'].includes(doc.type) && (doc.status || '').toLowerCase() !== 'approved' && (
                                          (doc.status || '').toLowerCase() !== 'rejected' || 
                                          (doc.status || '').toLowerCase() === 'rejected' && doc.uploaded_at && doc.rejected_at && new Date(doc.uploaded_at) > new Date(doc.rejected_at)
                                        ) && (
                                          <>
                                            <button
                                              onClick={() => handleApproveDocument(app.id, doc.type)}
                                              disabled={!!approvingDocs[`${app.id}:${doc.type}`]}
                                              className={`text-xs font-medium flex items-center space-x-1 transition-colors px-2 py-1 rounded-md border ${approvingDocs[`${app.id}:${doc.type}`] ? 'text-slate-400 border-slate-200 bg-slate-50' : 'text-green-700 border-green-300 hover:bg-green-50'}`}
                                            >
                                              <CheckCircle className="w-3 h-3" />
                                              <span className="hidden md:inline">Approve</span>
                                            </button>
                                            <button
                                              onClick={() => openRejectDocModal(app.id, doc.type)}
                                              disabled={!!rejectingDocs[`${app.id}:${doc.type}`]}
                                              className={`text-xs font-medium flex items-center space-x-1 transition-colors px-2 py-1 rounded-md border ${rejectingDocs[`${app.id}:${doc.type}`] ? 'text-slate-400 border-slate-200 bg-slate-50' : 'text-red-700 border-red-300 hover:bg-red-50'}`}
                                            >
                                              <XCircle className="w-3 h-3" />
                                              <span className="hidden md:inline">Reject</span>
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                        (doc.status || 'pending').toLowerCase() === 'approved' ? 'text-green-700 bg-green-100' :
                                        (doc.status || 'pending').toLowerCase() === 'under_review' ? 'text-blue-700 bg-blue-100' :
                                        (doc.status || 'pending').toLowerCase() === 'changes_requested' ? 'text-red-700 bg-red-100' :
                                        'text-amber-700 bg-amber-100'
                                      }`}>
                                        {(doc.status || 'pending').replace('_',' ').replace(/^./, (c: string) => c.toUpperCase())}
                                      </span>
                                      {doc.uploaded_at && (
                                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                      )}
                                      {doc.approved_at && (
                                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">Approved {new Date(doc.approved_at).toLocaleDateString()}</span>
                                      )}
                                      {doc.rejected_at && (
                                        <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md">Rejected {new Date(doc.rejected_at).toLocaleDateString()}</span>
                                      )}
                                      {doc.rejection_reason && (
                                        <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md">
                                          <span className="font-medium">Reason:</span> {doc.rejection_reason}
                                        </span>
                                      )}
                                      {doc.changes_requested_at && (
                                        <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md">Changes Requested {new Date(doc.changes_requested_at).toLocaleDateString()}</span>
                                      )}
                                    </div>
                                    
                                    {/* Exibir justificativa quando status for "changes_requested" */}
                                    {doc.status === 'changes_requested' && doc.review_notes && (
                                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <div className="flex items-start space-x-2">
                                          <div className="flex-shrink-0">
                                            <svg className="w-4 h-4 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                          </div>
                                          <div className="flex-1">
                                            <h5 className="text-sm font-medium text-red-800 mb-1">University Feedback</h5>
                                            <p className="text-sm text-red-700">{doc.review_notes}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                </div>
                              ) : (
                                <div className="text-center py-6">
                                  <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                    <FileText className="w-6 h-6 text-slate-400" />
                                  </div>
                                  <h4 className="text-sm font-medium text-slate-900 mb-1">No Documents Submitted</h4>
                                  <p className="text-xs text-slate-500">Student has not uploaded any documents yet.</p>
                                </div>
                              )}
                              
                              {/* Application Approval Section - Only for Platform Admins */}
                              {isPlatformAdmin && (
                                <div className={`mt-4 p-4 rounded-lg border ${
                                  app.status === 'approved' 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-slate-50 border-slate-200'
                                }`}>
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <h4 className="font-semibold text-slate-900">Application Approval</h4>
                                      <p className="text-sm text-slate-600">
                                        {app.status === 'approved' 
                                          ? 'This application has been approved.' 
                                          : 'You can approve this application regardless of document status.'
                                        }
                                      </p>
                                    </div>
                                    {app.status === 'approved' && (
                                      <div className="flex items-center space-x-1 text-green-600">
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="text-sm font-medium">Approved</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <button
                                      onClick={() => {
                                        setPendingRejectAppId(app.id);
                                        setShowRejectStudentModal(true);
                                      }}
                                      disabled={approvingStudent || rejectingStudent || app.status === 'approved' || app.status === 'rejected'}
                                      className={`px-4 py-2 rounded-lg font-medium border transition-colors text-center text-sm ${
                                        app.status === 'rejected' 
                                          ? 'bg-red-100 text-red-700 border-red-300 cursor-not-allowed' 
                                          : 'text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed'
                                      }`}
                                    >
                                      {app.status === 'approved' ? 'Application Approved' : app.status === 'rejected' ? 'Application Rejected' : 'Reject Application'}
                                    </button>
                                    <button
                                      disabled={approvingStudent || rejectingStudent || app.status === 'approved' || app.status === 'rejected'}
                                      onClick={() => approveApplication(app.id)}
                                      className="px-4 py-2 rounded-lg font-medium bg-[#05294E] text-white hover:bg-[#041f38] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center text-sm"
                                    >
                                      {app.status === 'approved' ? 'Approved' : app.status === 'rejected' ? 'Rejected' : (approvingStudent ? 'Approving...' : 'Approve Application')}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Application Progress</h2>
            </div>
            <div className="p-6">
              {/* Current Step Display */}
              {(() => {
                const currentStep = getCurrentStep();
                if (!currentStep) return null;
                
                const { step, index, status } = currentStep;
                const isCompleted = status === 'completed';
                const isInProgress = status === 'in_progress';
                const isRejected = status === 'rejected';
                
                  return (
                  <div className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    isCompleted ? 'border-green-200 bg-green-50' :
                    isInProgress ? 'border-blue-200 bg-blue-50' :
                    isRejected ? 'border-red-200 bg-red-50' :
                    'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                          isCompleted ? 'bg-green-500 text-white' :
                          isInProgress ? 'bg-blue-500 text-white' :
                          isRejected ? 'bg-red-500 text-white' :
                          'bg-slate-300 text-slate-600'
                        }`}>
                          {isCompleted ? '✓' : index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className={`text-sm sm:text-base font-semibold ${
                            isCompleted ? 'text-green-900' :
                            isInProgress ? 'text-blue-900' :
                            isRejected ? 'text-red-900' :
                            'text-slate-700'
                          }`}>
                            {step.label}
                          </h3>
                          <p className={`text-xs sm:text-sm ${
                            isCompleted ? 'text-green-700' :
                            isInProgress ? 'text-blue-700' :
                            isRejected ? 'text-red-700' :
                            'text-slate-500'
                          }`}>
                            {(() => {
                              switch (step.key) {
                                case 'selection_fee': return 'Student pays the initial application fee';
                                case 'apply': return 'Student submits scholarship application';
                                case 'review': return 'University reviews the application';
                                case 'application_fee': return 'Student pays the application fee';
                                case 'scholarship_fee': return 'Student pays the scholarship fee';
                                case 'acceptance_letter': return 'University sends acceptance letter';
                                case 'transfer_form': return 'University sends transfer form (for transfer students)';
                                case 'i20_fee': return 'Student pays I-20 control fee';
                                case 'enrollment': return 'Student enrolls in the program';
                                default: return 'Process step';
                              }
                            })()}
                          </p>
                      </div>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap">
                        <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                          isCompleted ? 'bg-green-100 text-green-700' :
                          isInProgress ? 'bg-blue-100 text-blue-700' :
                          isRejected ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {isCompleted ? 'Completed' :
                           isInProgress ? 'In Progress' :
                           isRejected ? 'Rejected' :
                           'Pending'}
                        </div>
                        {isInProgress && (
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-blue-600 font-medium">Active</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {/* Expand/Collapse Button */}
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setIsProgressExpanded(!isProgressExpanded)}
                  className="flex items-center space-x-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200"
                >
                  <span className="whitespace-nowrap">{isProgressExpanded ? 'Show Less' : 'View All Steps'}</span>
                  <svg 
                    className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 ${isProgressExpanded ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {/* Expanded Timeline */}
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
                isProgressExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5 bg-slate-200"></div>
                    
                    {/* Steps */}
                    <div className="space-y-4 sm:space-y-6">
                      {steps.map((step) => {
                        const status = getStepStatus(student, step.key);
                        const isCompleted = status === 'completed';
                        const isInProgress = status === 'in_progress';
                        const isRejected = status === 'rejected';
                        
                        return (
                          <div key={step.key} className="relative flex items-start">
                            {/* Timeline Dot */}
                            <div className={`relative z-10 flex-shrink-0 w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 sm:border-4 border-white shadow-sm flex items-center justify-center ${
                              isCompleted ? 'bg-green-500' :
                              isInProgress ? 'bg-blue-500' :
                              isRejected ? 'bg-red-500' :
                              'bg-slate-300'
                            }`}>
                              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                                isCompleted ? 'bg-white' :
                                isInProgress ? 'bg-white' :
                                isRejected ? 'bg-white' :
                                'bg-slate-100'
                              }`}></div>
                            </div>
                            
                            {/* Content Card */}
                            <div className="ml-4 sm:ml-6 flex-1 min-w-0">
                              <div className={`p-3 sm:p-4 rounded-lg border transition-all duration-200 ${
                                isCompleted ? 'border-green-200 bg-green-50' :
                                isInProgress ? 'border-blue-200 bg-blue-50' :
                                isRejected ? 'border-red-200 bg-red-50' :
                                'border-slate-200 bg-slate-50'
                              }`}>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <h4 className={`text-sm font-semibold ${
                                    isCompleted ? 'text-green-900' :
                                    isInProgress ? 'text-blue-900' :
                                    isRejected ? 'text-red-900' :
                                    'text-slate-700'
                                  }`}>
                                    {step.label}
                                  </h4>
                                  <div className={`px-2 py-1 rounded-full text-xs font-medium self-start sm:self-auto ${
                                    isCompleted ? 'bg-green-100 text-green-700' :
                                    isInProgress ? 'bg-blue-100 text-blue-700' :
                                    isRejected ? 'bg-red-100 text-red-700' :
                                    'bg-slate-100 text-slate-500'
                                  }`}>
                                    {isCompleted ? 'Done' :
                                     isInProgress ? 'Active' :
                                     isRejected ? 'Failed' :
                                     'Waiting'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                  );
                })}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Progress Summary */}
              <div className="mt-6 p-3 sm:p-4 bg-slate-50 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <span className="text-sm font-medium text-slate-700">Overall Progress</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {(() => {
                      const completedSteps = steps.filter(step => getStepStatus(student, step.key) === 'completed').length;
                      const percentage = Math.round((completedSteps / steps.length) * 100);
                      return `${percentage}% Complete`;
                    })()}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 sm:h-3">
                  <div 
                    className="bg-[#05294E] h-2 sm:h-3 rounded-full transition-all duration-700 ease-out"
                    style={{ 
                      width: `${(steps.filter(step => getStepStatus(student, step.key) === 'completed').length / steps.length) * 100}%` 
                    }}
                  />
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {(() => {
                    const completedSteps = steps.filter(step => getStepStatus(student, step.key) === 'completed').length;
                    return `${completedSteps} of ${steps.length} steps completed`;
                  })()}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="bg-gradient-to-r rounded-t-2xl from-green-600 to-green-700 px-6 py-4">
              <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <CreditCard className="w-6 h-6 mr-3" />
                Payment Status
              </h2>
                {canEditFees && (
                  <div className="flex items-center space-x-2">
                    {editingFees ? (
                      <>
                        <button
                          onClick={saveFeeOverrides}
                          disabled={savingFees}
                          className="px-3 py-1 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-1"
                        >
                          <Save className="w-4 h-4" />
                          <span>{savingFees ? 'Saving...' : 'Save'}</span>
                        </button>
                        <button
                          onClick={cancelEditingFees}
                          className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-1"
                        >
                          <X className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={startEditingFees}
                        className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg flex items-center space-x-1"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit Fees</span>
                      </button>
                    )}
                    {(hasOverride('selection_process') || hasOverride('scholarship_fee') || hasOverride('i20_control_fee')) && !editingFees && (
                      <button
                        onClick={resetFeesToDefault}
                        disabled={savingFees}
                        className="px-3 py-1 bg-slate-500 hover:bg-slate-600 text-white text-sm rounded-lg flex items-center space-x-1"
                      >
                        <X className="w-4 h-4" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <dt className="text-sm font-medium text-slate-600">Selection Process Fee</dt>
                    <dd className="text-sm text-slate-500 mt-1">Required to start applications</dd>
                    {editingFees ? (
                      <div className="mt-2">
                        <input
                          type="number"
                          value={editingFees.selection_process}
                          onChange={(e) => setEditingFees(prev => prev ? { ...prev, selection_process: Number(e.target.value) } : null)}
                          className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    ) : (
                      <dd className="text-sm font-semibold text-slate-700 mt-1 flex items-center">
                        {(() => {
                      const hasCustomOverride = hasOverride('selection_process');
                      const base = Number(getFeeAmount('selection_process'));
                      const finalAmount = hasCustomOverride ? getFeeAmount('selection_process') : base + dependents * 150;
                      const formatted = formatFeeAmount(finalAmount);
                      
                      if (student?.user_id === '935e0eec-82c6-4a70-b013-e85dde6e63f7') {
                        console.log('🔍 [AdminStudentDetails] jolie8862@uorak.com - Selection Process Fee display:', { 
                          hasCustomOverride, 
                          base, 
                          dependents, 
                          finalAmount, 
                          formatted 
                        });
                      }
                      
                      return formatted;
                        })()}
                        {hasOverride('selection_process') && (
                          <span className="ml-2 text-xs text-blue-500">(custom)</span>
                        )}
                      </dd>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                     {student.has_paid_selection_process_fee ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-green-600">Paid</span>
                        </div>
                        {isPlatformAdmin && (
                          <div className="flex flex-col gap-3">
                            {editingPaymentMethod === 'selection_process' ? (
                              <div className="flex flex-col gap-3">
                                <select
                                  value={newPaymentMethod}
                                  onChange={(e) => setNewPaymentMethod(e.target.value as 'stripe' | 'zelle' | 'manual')}
                                  className="text-sm px-3 py-2 border border-slate-300 rounded-lg w-full max-w-[150px]"
                                  disabled={savingPaymentMethod}
                                >
                                  <option value="manual">Manual</option>
                                  <option value="stripe">Stripe</option>
                                  <option value="zelle">Zelle</option>
                                </select>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleUpdatePaymentMethod('selection_process')}
                                    disabled={savingPaymentMethod}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                  >
                                    <Save className="w-4 h-4" />
                                    <span>{savingPaymentMethod ? 'Saving...' : 'Save'}</span>
                                  </button>
                                  <button
                                    onClick={() => setEditingPaymentMethod(null)}
                                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                  >
                                    <X className="w-4 h-4" />
                                    <span>Cancel</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingPaymentMethod('selection_process');
                                  setNewPaymentMethod((student.selection_process_fee_payment_method as 'stripe' | 'zelle' | 'manual') || 'manual');
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                              >
                                <Edit3 className="w-4 h-4" />
                                <span>Edit Method</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                       <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="text-sm font-medium text-red-600">Not Paid</span>
                        </div>
                         {isPlatformAdmin && (
                           <button
                             onClick={() => openPaymentModal('selection_process')}
                             disabled={markingAsPaid[`${student.student_id}:selection_process`]}
                             className="px-4 py-2 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                           >
                             <CheckCircle className="w-4 h-4" />
                             <span>{markingAsPaid[`${student.student_id}:selection_process`] ? 'Marking...' : 'Mark as Paid'}</span>
                           </button>
                         )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <dt className="text-sm font-medium text-slate-600">Application Fee</dt>
                    <dd className="text-sm text-slate-500 mt-1">Paid after scholarship approval</dd>
                    {student.is_application_fee_paid ? (
                      <dd className="text-sm font-semibold text-slate-700 mt-1">
                        {(() => {
                          const paidApplication = student.all_applications?.find((app: any) => app.is_application_fee_paid);
                          if (paidApplication?.scholarships) {
                            const scholarship = Array.isArray(paidApplication.scholarships)
                              ? paidApplication.scholarships[0]
                              : paidApplication.scholarships;
                            
                            let baseAmount = scholarship?.application_fee_amount ? Number(scholarship.application_fee_amount) : getFeeAmount('application_fee');
                            const systemType = userSystemType || 'legacy';
                            const studentDependents = dependents || Number(student.dependents || 0);
                            
                            // Adicionar $100 por dependente apenas para sistema legacy
                            if (systemType === 'legacy' && studentDependents > 0) {
                              baseAmount += studentDependents * 100;
                            }
                            
                            return formatFeeAmount(baseAmount);
                          }
                          return 'Fee paid';
                        })()}
                      </dd>
                    ) : (
                      <div className="mt-1">
                        <dd className="text-sm font-semibold text-slate-700">Varies by scholarship</dd>
                        <div className="text-xs text-slate-500">+ $100 per dependent (applied at checkout)</div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    {student.is_application_fee_paid ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-green-600">Paid</span>
                        </div>
                        {isPlatformAdmin && (
                          <div className="flex flex-col gap-3">
                            {editingPaymentMethod === 'application' ? (
                              <div className="flex flex-col gap-3">
                                <select
                                  value={newPaymentMethod}
                                  onChange={(e) => setNewPaymentMethod(e.target.value as 'stripe' | 'zelle' | 'manual')}
                                  className="text-sm px-3 py-2 border border-slate-300 rounded-lg w-full max-w-[150px]"
                                  disabled={savingPaymentMethod}
                                >
                                  <option value="manual">Manual</option>
                                  <option value="stripe">Stripe</option>
                                  <option value="zelle">Zelle</option>
                                </select>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleUpdatePaymentMethod('application')}
                                    disabled={savingPaymentMethod}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                  >
                                    <Save className="w-4 h-4" />
                                    <span>{savingPaymentMethod ? 'Saving...' : 'Save'}</span>
                                  </button>
                                  <button
                                    onClick={() => setEditingPaymentMethod(null)}
                                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                  >
                                    <X className="w-4 h-4" />
                                    <span>Cancel</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditingPaymentMethod('application')}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                              >
                                <Edit3 className="w-4 h-4" />
                                <span>Edit Method</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="text-sm font-medium text-red-600">Not Paid</span>
                        </div>
                         {isPlatformAdmin && (() => {
                           // Buscar aplicação aprovada para application fee
                           const approvedApp = student.all_applications?.find((app: any) => app.status === 'approved');
                           return approvedApp && (
                             <button
                               onClick={() => openPaymentModal('application', approvedApp.id)}
                               disabled={markingAsPaid[`${student.student_id}:application`]}
                               className="px-4 py-2 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                             >
                               <CheckCircle className="w-4 h-4" />
                               <span>{markingAsPaid[`${student.student_id}:application`] ? 'Marking...' : 'Mark as Paid'}</span>
                             </button>
                           );
                         })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <dt className="text-sm font-medium text-slate-600">Scholarship Fee</dt>
                    <dd className="text-sm text-slate-500 mt-1">Paid after application fee</dd>
                    {editingFees ? (
                      <div className="mt-2">
                        <input
                          type="number"
                          value={editingFees.scholarship}
                          onChange={(e) => setEditingFees(prev => prev ? { ...prev, scholarship: Number(e.target.value) } : null)}
                          className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    ) : (
                      <dd className="text-sm font-semibold text-slate-700 mt-1 flex items-center">
                        {formatFeeAmount(getFeeAmount('scholarship_fee'))}
                        {hasOverride('scholarship_fee') && (
                          <span className="ml-2 text-xs text-blue-500">(custom)</span>
                        )}
                      </dd>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    {student.is_scholarship_fee_paid ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-green-600">Paid</span>
                        </div>
                        {isPlatformAdmin && (
                          <div className="flex flex-col gap-3">
                            {editingPaymentMethod === 'scholarship' ? (
                              <div className="flex flex-col gap-3">
                                <select
                                  value={newPaymentMethod}
                                  onChange={(e) => setNewPaymentMethod(e.target.value as 'stripe' | 'zelle' | 'manual')}
                                  className="text-sm px-3 py-2 border border-slate-300 rounded-lg w-full max-w-[150px]"
                                  disabled={savingPaymentMethod}
                                >
                                  <option value="manual">Manual</option>
                                  <option value="stripe">Stripe</option>
                                  <option value="zelle">Zelle</option>
                                </select>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleUpdatePaymentMethod('scholarship')}
                                    disabled={savingPaymentMethod}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                  >
                                    <Save className="w-4 h-4" />
                                    <span>{savingPaymentMethod ? 'Saving...' : 'Save'}</span>
                                  </button>
                                  <button
                                    onClick={() => setEditingPaymentMethod(null)}
                                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                  >
                                    <X className="w-4 h-4" />
                                    <span>Cancel</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditingPaymentMethod('scholarship')}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                              >
                                <Edit3 className="w-4 h-4" />
                                <span>Edit Method</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="text-sm font-medium text-red-600">Not Paid</span>
                        </div>
                         {isPlatformAdmin && (() => {
                           // Buscar aplicação aprovada para scholarship fee
                           const approvedApp = student.all_applications?.find((app: any) => app.status === 'approved');
                           return approvedApp && (
                             <button
                               onClick={() => openPaymentModal('scholarship', approvedApp.id)}
                               disabled={markingAsPaid[`${student.student_id}:scholarship`]}
                               className="px-4 py-2 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                             >
                               <CheckCircle className="w-4 h-4" />
                               <span>{markingAsPaid[`${student.student_id}:scholarship`] ? 'Marking...' : 'Mark as Paid'}</span>
                             </button>
                           );
                         })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <dt className="text-sm font-medium text-slate-600">I-20 Control Fee</dt>
                    <dd className="text-sm text-slate-500 mt-1">Final step for enrollment</dd>
                    {editingFees ? (
                      <div className="mt-2">
                        <input
                          type="number"
                          value={editingFees.i20_control}
                          onChange={(e) => setEditingFees(prev => prev ? { ...prev, i20_control: Number(e.target.value) } : null)}
                          className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    ) : (
                      <dd className="text-sm font-semibold text-slate-700 mt-1 flex items-center">
                        {formatFeeAmount(getFeeAmount('i20_control_fee'))}
                        {hasOverride('i20_control_fee') && (
                          <span className="ml-2 text-xs text-blue-500">(custom)</span>
                        )}
                      </dd>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                     {student.has_paid_i20_control_fee ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-green-600">Paid</span>
                        </div>
                        {isPlatformAdmin && (
                          <div className="flex flex-col gap-3">
                            {editingPaymentMethod === 'i20_control' ? (
                              <div className="flex flex-col gap-3">
                                <select
                                  value={newPaymentMethod}
                                  onChange={(e) => setNewPaymentMethod(e.target.value as 'stripe' | 'zelle' | 'manual')}
                                  className="text-sm px-3 py-2 border border-slate-300 rounded-lg w-full max-w-[150px]"
                                  disabled={savingPaymentMethod}
                                >
                                  <option value="manual">Manual</option>
                                  <option value="stripe">Stripe</option>
                                  <option value="zelle">Zelle</option>
                                </select>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleUpdatePaymentMethod('i20_control')}
                                    disabled={savingPaymentMethod}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                  >
                                    <Save className="w-4 h-4" />
                                    <span>{savingPaymentMethod ? 'Saving...' : 'Save'}</span>
                                  </button>
                                  <button
                                    onClick={() => setEditingPaymentMethod(null)}
                                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center space-x-2"
                                  >
                                    <X className="w-4 h-4" />
                                    <span>Cancel</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingPaymentMethod('i20_control');
                                  setNewPaymentMethod((student.i20_control_fee_payment_method as 'stripe' | 'zelle' | 'manual') || 'manual');
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center space-x-2 w-fit"
                              >
                                <Edit3 className="w-4 h-4" />
                                <span>Edit Method</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                       <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="text-sm font-medium text-red-600">Not Paid</span>
                        </div>
                          {isPlatformAdmin && (() => {
                            // Guardas: só pode marcar I-20 se SP Fee pago e scholarship fee paga
                            // Se o aluno já está enrolled, permitir marcar I-20 como pago independente dos outros fees
                            const isEnrolled = student.application_status === 'enrolled';
                            
                            // Se está enrolled, pode marcar I-20 independente dos outros fees
                            // Se não está enrolled, precisa ter SP fee pago e scholarship fee paga
                            const canMarkI20 = isEnrolled || (student.has_paid_selection_process_fee && student.is_scholarship_fee_paid);
                            
                            return (
                              <button
                                onClick={() => openPaymentModal('i20_control')}
                                disabled={markingAsPaid[`${student.student_id}:i20_control`] || !canMarkI20}
                                className="px-4 py-2 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-sm rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed w-fit"
                                title={!canMarkI20 ? (isEnrolled ? 'I-20 can be marked as paid for enrolled students' : 'Complete previous steps: Selection Process Fee and Scholarship Fee must be completed first') : ''}
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>{markingAsPaid[`${student.student_id}:i20_control`] ? 'Marking...' : (!canMarkI20 ? 'Complete previous steps' : 'Mark as Paid')}</span>
                              </button>
                            );
                          })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* I-20 Deadline Timer */}
          {i20Deadline && !student.has_paid_i20_control_fee && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
              <div className="p-6">
                <AdminI20DeadlineTimer 
                  deadline={i20Deadline} 
                  hasPaid={student.has_paid_i20_control_fee}
                  studentName={student.student_name}
                />
              </div>
            </div>
          )}

          {/* Term Acceptance History */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="bg-gradient-to-r rounded-t-2xl from-blue-600 to-blue-700 px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <FileText className="w-6 h-6 mr-3" />
                Term Acceptance History
              </h2>
            </div>
            <div className="p-6">
              {loadingTermAcceptances ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : termAcceptances.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">No terms accepted yet</p>
                  <p className="text-sm text-gray-400 mt-2">
                    This student hasn't accepted any terms yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {termAcceptances.map((acceptance) => (
                    <div key={acceptance.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-green-600" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-medium text-gray-900 truncate">
                                {acceptance.term_title || 'N/A'}
                              </h3>
                              <p className="text-sm text-gray-500 capitalize truncate">
                                {acceptance.term_type.replace(/_/g, ' ')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                              <span className="truncate">
                                Accepted: {new Date(acceptance.accepted_at).toLocaleString('pt-BR')}
                              </span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Globe className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                              <span className="truncate" title={acceptance.ip_address || 'N/A'}>
                                IP: {acceptance.ip_address || 'N/A'}
                              </span>
                            </div>
                            {acceptance.user_agent && (
                              <div className="flex items-start text-sm text-gray-600">
                                <Users className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                                <span className="truncate" title={acceptance.user_agent}>
                                  {acceptance.user_agent.length > 80 
                                    ? acceptance.user_agent.substring(0, 80) + '...' 
                                    : acceptance.user_agent
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => {
                              const pdfData: StudentTermAcceptanceData = {
                                student_name: acceptance.user_full_name || 'N/A',
                                student_email: acceptance.user_email || 'N/A',
                                term_title: acceptance.term_title || 'N/A',
                                accepted_at: new Date(acceptance.accepted_at).toLocaleString('en-US'),
                                ip_address: acceptance.ip_address || 'N/A',
                                user_agent: acceptance.user_agent || 'N/A',
                                country: 'N/A',
                                affiliate_code: undefined,
                                term_content: acceptance.term_content || ''
                              };
                              generateTermAcceptancePDF(pdfData);
                            }}
                            className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            title="Download PDF certificate"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      )}

      {/* Modal para recusar aluno na bolsa */}
      {showRejectStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Reject Application</h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for rejecting this application. This information will be shared with the student.
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
                  setPendingRejectAppId(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingRejectAppId) {
                    rejectApplication(pendingRejectAppId);
                  }
                }}
                disabled={!rejectStudentReason.trim() || rejectingStudent}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
              >
                {rejectingStudent ? (
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

      {/* Modal: New Document Request (Admin) */}
      {showNewRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg mx-4 border border-slate-200">
            <h3 className="font-extrabold text-xl mb-6 text-[#05294E] text-center">New Document Request</h3>
            <p className="text-sm text-slate-600 mb-6 text-center">
              Request a new document from {student?.student_name}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Document Title <span className="text-red-500">*</span></label>
                <input
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base"
                  placeholder="e.g., Additional Bank Statement"
                  value={newDocumentRequest.title}
                  onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base min-h-[80px] resize-vertical"
                  placeholder="Describe what document you need and any specific requirements..."
                  value={newDocumentRequest.description}
                  onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Due Date</label>
                <input
                  className="border border-slate-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition text-base"
                  type="date"
                  value={newDocumentRequest.due_date}
                  onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Template/Attachment (Optional)</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition font-medium text-slate-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828l6.586-6.586M16 5v6a2 2 0 002 2h6" />
                    </svg>
                    <span>{newDocumentRequest.attachment ? 'Change file' : 'Select file'}</span>
                    <input
                      type="file"
                      className="sr-only"
                      onChange={(e) => setNewDocumentRequest(prev => ({ ...prev, attachment: e.target.files ? e.target.files[0] : null }))}
                      disabled={creatingDocumentRequest}
                    />
                  </label>
                  {newDocumentRequest.attachment && (
                    <span className="text-xs text-slate-700 truncate max-w-[180px]">{newDocumentRequest.attachment.name}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                className="flex-1 bg-slate-200 text-slate-800 px-4 py-2 rounded-lg font-medium hover:bg-slate-300 transition disabled:opacity-50"
                onClick={() => { setShowNewRequestModal(false); setNewDocumentRequest({ title: '', description: '', due_date: '', attachment: null }); }}
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

      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Botão para criar novo Document Request (somente Admin) */}
          {isPlatformAdmin && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowNewRequestModal(true)}
                className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                New Request
              </button>
            </div>
          )}

          {/* Transfer Form Section - Only for transfer students */}
          {student?.student_process_type === 'transfer' && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl shadow-sm relative overflow-hidden">
              <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-5 rounded-t-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-start sm:items-center space-x-4 min-w-0">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                      <svg className="w-6 h-6 text-[#05294E]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-white break-words">Transfer Form</h3>
                      <p className="text-blue-100 text-sm break-words">Transfer form for current F-1 students</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {(() => {
                  // Encontrar aplicação transfer
                  const transferApp = getTransferApplication();
                  
                  if (transferApp?.transfer_form_url) {
                    // Formulário já enviado
                    return (
                      <div className="bg-white rounded-3xl p-6">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-2 mb-1">
                              <p className="font-medium text-slate-900 break-words">
                                {transferApp.transfer_form_url.split('/').pop() || 'Transfer Form'}
                              </p>
                              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 whitespace-nowrap">
                                {transferApp.transfer_form_status === 'sent' ? 'Sent' : 'Available'}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 break-words">
                              Sent on {transferApp.transfer_form_sent_at ? new Date(transferApp.transfer_form_sent_at).toLocaleDateString('pt-BR') : 'N/A'}
                            </p>
                            
                            <div className="flex flex-col sm:flex-row gap-2 mt-3">
                              <button
                                onClick={() => handleViewDocument({
                                  file_url: transferApp.transfer_form_url,
                                  filename: transferApp.transfer_form_url.split('/').pop() || 'Transfer Form'
                                })}
                                className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                              >
                                View
                              </button>
                              
                              <button
                                onClick={() => handleDownloadDocument({
                                  file_url: transferApp.transfer_form_url,
                                  filename: transferApp.transfer_form_url.split('/').pop() || 'Transfer Form'
                                })}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                              >
                                Download
                              </button>
                              
                              {isPlatformAdmin && (
                                <button
                                  onClick={() => {
                                    // Limpar arquivo selecionado e mostrar seção de substituição
                                    setTransferFormFile(null);
                                    // Forçar um novo arquivo para mostrar a seção
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.pdf,.doc,.docx';
                                    input.onchange = (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (file) {
                                        setTransferFormFile(file);
                                      }
                                    };
                                    input.click();
                                  }}
                                  className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto text-center"
                                >
                                  Replace
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Seção de upload para substituição */}
                        {isPlatformAdmin && (transferFormFile || uploadingTransferForm) && (
                          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6">
                            <h4 className="text-lg font-semibold text-[#05294E] mb-4 flex items-center">
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              {uploadingTransferForm ? 'Uploading Transfer Form...' : 'Replace Transfer Form'}
                            </h4>
                            
                            <div className="space-y-4">
                              {uploadingTransferForm ? (
                                <div className="text-center py-4">
                                  <div className="w-8 h-8 border-4 border-[#05294E] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                  <p className="text-[#05294E] font-medium">Uploading transfer form...</p>
                                </div>
                              ) : transferFormFile ? (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-[#05294E] mb-2">
                                      New Transfer Form File
                                    </label>
                                    <div className="flex items-center justify-center">
                                      <label className="flex items-center gap-2 px-4 py-2 bg-blue-100 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-200 transition font-medium text-[#05294E]">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <span>Change file</span>
                                        <input
                                          type="file"
                                          className="sr-only"
                                          accept=".pdf,.doc,.docx"
                                          onChange={(e) => setTransferFormFile(e.target.files ? e.target.files[0] : null)}
                                          disabled={uploadingTransferForm}
                                        />
                                      </label>
                                    </div>
                                    <p className="text-sm text-blue-600 mt-2 text-center">
                                      Selected: {transferFormFile?.name || 'Unknown file'}
                                    </p>
                                  </div>
                                  
                                  <div className="flex gap-3">
                                    <button
                                      onClick={handleUploadTransferForm}
                                      disabled={!transferFormFile || uploadingTransferForm}
                                      className="bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                                    >
                                      Replace Transfer Form
                                    </button>
                                    
                                    <button
                                      onClick={() => setTransferFormFile(null)}
                                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center py-4">
                                  <p className="text-[#05294E] font-medium mb-4">Transfer form uploaded successfully!</p>
                                  <button
                                    onClick={() => setTransferFormFile(null)}
                                    className="bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-2 rounded-lg font-medium"
                                  >
                                    Done
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Seção para gerenciar uploads do aluno */}
                        {transferFormUploads.length > 0 && (
                          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-6">
                            <h4 className="text-lg font-semibold text-[#05294E] mb-4 flex items-center">
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2z" />
                              </svg>
                              Student Uploads
                            </h4>
                            
                            <div className="space-y-4">
                              {transferFormUploads.map((upload) => {
                                const statusColor = upload.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                                  upload.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                                  'bg-yellow-100 text-yellow-800 border-yellow-200';
                                
                                return (
                                  <div key={upload.id} className="bg-white border border-slate-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2z" />
                                          </svg>
                                        </div>
                                        <div>
                                          <p className="font-medium text-slate-900">
                                            {upload.file_url.split('/').pop()}
                                          </p>
                                          <p className="text-sm text-slate-500">
                                            Uploaded on {new Date(upload.uploaded_at).toLocaleDateString()}
                                          </p>
                                        </div>
                                      </div>
                                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColor}`}>
                                        {upload.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                      </span>
                                    </div>
                                    
                                    {upload.rejection_reason && (
                                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-sm font-medium text-red-600 mb-1">Rejection reason:</p>
                                        <p className="text-sm text-red-700">{upload.rejection_reason}</p>
                                      </div>
                                    )}
                                    
                                    <div className="flex gap-2">
                                      <button
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                                        onClick={() => {
                                          const signedUrl = upload.file_url;
                                          if (signedUrl) {
                                            handleViewDocument({
                                              file_url: signedUrl,
                                              filename: upload.file_url.split('/').pop() || 'transfer_form.pdf'
                                            });
                                          }
                                        }}
                                      >
                                        View
                                      </button>
                                      <button
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                                        onClick={() => {
                                          const signedUrl = upload.file_url;
                                          if (signedUrl) {
                                            handleDownloadDocument({
                                              file_url: signedUrl,
                                              filename: upload.file_url.split('/').pop() || 'transfer_form.pdf'
                                            });
                                          }
                                        }}
                                      >
                                        Download
                                      </button>
                                      
                                      {upload.status === 'under_review' && isPlatformAdmin && (
                                        <>
                                          <button
                                            className="text-green-600 hover:text-green-800 text-sm font-medium hover:underline"
                                            onClick={() => handleApproveTransferFormUpload(upload.id)}
                                          >
                                            Approve
                                          </button>
                                          <button
                                            className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline"
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
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    // Formulário não enviado - mostrar upload
                    return (
                      <div className="bg-white rounded-3xl p-6" data-transfer-upload>
                        <div className="text-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h4 className="text-lg font-semibold text-slate-700 mb-2">
                            {transferFormFile ? 'Replace Transfer Form' : 'Transfer Form Not Sent'}
                          </h4>
                          <p className="text-slate-500 max-w-md mx-auto mb-6">
                            {transferFormFile 
                              ? 'Select a new file to replace the current transfer form.'
                              : 'Upload and send the transfer form for this transfer student.'
                            }
                          </p>
                          
                          {isPlatformAdmin && (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                  Select Transfer Form File
                                </label>
                                <div className="flex items-center justify-center">
                                  <label className="flex items-center gap-2 px-4 py-2 bg-blue-100 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-200 transition font-medium text-blue-700">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span>{transferFormFile ? 'Change file' : 'Select Transfer Form'}</span>
                                    <input
                                      type="file"
                                      className="sr-only"
                                      accept=".pdf,.doc,.docx"
                                      onChange={(e) => setTransferFormFile(e.target.files ? e.target.files[0] : null)}
                                      disabled={uploadingTransferForm}
                                    />
                                  </label>
                                </div>
                                {transferFormFile && (
                                  <p className="text-sm text-slate-600 mt-2 text-center">
                                    Selected: {transferFormFile.name}
                                  </p>
                                )}
                              </div>
                              
                              <button
                                onClick={handleUploadTransferForm}
                                disabled={!transferFormFile || uploadingTransferForm}
                                className="bg-[#05294E] hover:bg-[#041f38] text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {uploadingTransferForm ? 'Sending...' : 'Send Transfer Form'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}

          {loadingDocuments ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
                </div>
                <h4 className="text-lg font-semibold text-slate-700 mb-2">Loading documents...</h4>
                <p className="text-slate-500">Please wait while we fetch the document requests.</p>
              </div>
            </div>
          ) : (
            <DocumentsView
              studentDocuments={[]}
              documentRequests={documentRequests}
              scholarshipApplication={(() => {
                // Priorizar aplicação com application fee pago (aplicação ativa)
                const apps = student?.all_applications || [];
                const paidApp = apps.find(app => app.is_application_fee_paid);
                return paidApp || apps[0];
              })()}
              studentId={student?.user_id}
              onViewDocument={handleViewDocument}
              onDownloadDocument={handleDownloadDocument}
              onUploadDocument={handleUploadDocumentRequest}
              onApproveDocument={handleApproveDocumentRequest}
              onRejectDocument={handleRejectDocumentRequest}
              onEditTemplate={handleEditTemplate}
              onDeleteDocumentRequest={handleDeleteDocumentRequest}
              isAdmin={isPlatformAdmin}
              uploadingStates={uploadingDocumentRequest}
              approvingStates={approvingDocumentRequest}
              rejectingStates={rejectingDocumentRequest}
              deletingStates={deletingDocumentRequest}
            />
          )}
        </div>
        )}

      {activeTab === 'scholarships' && student && (
        <div className="space-y-6">
          <AdminScholarshipSelection
            studentProfileId={student.student_id}
            studentUserId={student.user_id}
          />
        </div>
      )}

      {activeTab === 'logs' && student && (
        <div className="p-6">
          <StudentLogsView 
            studentId={student.student_id} 
            studentName={student.student_name} 
          />
        </div>
      )}

      {/* Delete Note Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Delete Note
              </h3>
            </div>
            
            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to delete this note? This action cannot be undone.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={cancelDeleteNote}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteNote}
                disabled={savingNotes}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
              >
                <XCircle className="w-4 h-4" />
                <span>
                  {savingNotes ? 'Deleting...' : 'Delete Note'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Document Modal */}
      {showRejectDocModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Reject Document</h3>
              <button
                onClick={() => {
                  setShowRejectDocModal(false);
                  setRejectDocData(null);
                  setRejectDocReason('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Document: <span className="font-medium">{rejectDocData?.docType}</span>
              </p>
              <label htmlFor="rejectDocReason" className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                id="rejectDocReason"
                value={rejectDocReason}
                onChange={(e) => setRejectDocReason(e.target.value)}
                placeholder="Enter the reason for rejecting this document..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={4}
                required
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectDocModal(false);
                  setRejectDocData(null);
                  setRejectDocReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmRejectDoc()}
                disabled={!rejectDocReason.trim() || (rejectDocData ? !!rejectingDocs[`${rejectDocData.applicationId}:${rejectDocData.docType}`] : false)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectDocData && rejectingDocs[`${rejectDocData.applicationId}:${rejectDocData.docType}`] ? 'Rejecting...' : 'Reject Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Transfer Form Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Reject Transfer Form</h3>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setPendingRejectUploadId(null);
                  setRejectNotes('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <label htmlFor="rejectNotes" className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                id="rejectNotes"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Enter the reason for rejecting this transfer form..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={4}
                required
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setPendingRejectUploadId(null);
                  setRejectNotes('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!pendingRejectUploadId) return;
                  await handleRejectTransferFormUpload(pendingRejectUploadId, rejectNotes.trim());
                  setShowRejectModal(false);
                  setPendingRejectUploadId(null);
                  setRejectNotes('');
                }}
                disabled={!rejectNotes.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject Transfer Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {showEditTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">
                {currentTemplateUrl ? 'Edit Template' : 'Add Template'}
              </h3>
              <button
                onClick={() => {
                  setShowEditTemplateModal(false);
                  setEditingTemplateRequestId(null);
                  setEditingTemplateFile(null);
                  setCurrentTemplateUrl(null);
                }}
                className="text-slate-400 hover:text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {currentTemplateUrl && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-700 mb-2 font-medium">Current Template:</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-600 truncate">
                      {currentTemplateUrl.split('/').pop()}
                    </span>
                    <button
                      onClick={() => handleViewDocument({ file_url: currentTemplateUrl, type: 'template' })}
                      className="text-blue-700 hover:text-blue-800"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {currentTemplateUrl ? 'Replace Template File' : 'Template File'}
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition font-medium text-slate-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>{editingTemplateFile ? 'Change file' : 'Select file'}</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setEditingTemplateFile(e.target.files ? e.target.files[0] : null)}
                      disabled={uploadingTemplate}
                    />
                  </label>
                  {editingTemplateFile && (
                    <span className="text-xs text-slate-700 truncate max-w-[180px]">
                      {editingTemplateFile.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditTemplateModal(false);
                  setEditingTemplateRequestId(null);
                  setEditingTemplateFile(null);
                  setCurrentTemplateUrl(null);
                }}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!editingTemplateFile || uploadingTemplate}
                className="px-4 py-2 bg-[#05294E] text-white rounded-lg hover:bg-[#041f38] disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {uploadingTemplate ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Template</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {showPaymentModal && pendingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Confirm Payment
              </h3>
            </div>
            
            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to mark the <strong>{pendingPayment.feeName}</strong> as paid?
            </p>

            {/* Seleção de aplicação para Application Fee quando há múltiplas aprovadas */}
            {pendingPayment.feeType === 'application' && (() => {
              const approvedApps = student?.all_applications?.filter((app: any) => app.status === 'approved') || [];
              return approvedApps.length > 1 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Application
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {approvedApps.map((app: any) => (
                      <label key={app.id} className="flex items-center space-x-3 p-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          name="selectedApplication"
                          value={app.id}
                          checked={selectedApplicationId === app.id}
                          onChange={(e) => setSelectedApplicationId(e.target.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">
                            {app.scholarships?.title || 'Scholarship'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {app.scholarships?.universities?.name || 'University'} • Applied: {new Date(app.applied_at).toLocaleDateString()}
                          </div>
                          {app.is_application_fee_paid && (
                            <div className="text-xs text-green-600 mt-1">✓ Already Paid ({app.application_fee_payment_method})</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })()}
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Payment Method
              </label>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value as 'stripe' | 'zelle' | 'manual')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="stripe">Stripe</option>
                <option value="zelle">Zelle</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPendingPayment(null);
                  setSelectedApplicationId(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPayment}
                disabled={
                  markingAsPaid[`${student?.student_id}:${pendingPayment.feeType}`] ||
                  (pendingPayment.feeType === 'application' && 
                   (student?.all_applications?.filter((app: any) => app.status === 'approved') || []).length > 1 && 
                   !selectedApplicationId)
                }
                className="flex-1 px-4 py-2 bg-[#05294E] text-white rounded-lg hover:bg-[#041f38] disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  {markingAsPaid[`${student?.student_id}:${pendingPayment.feeType}`] ? 'Processing...' : 'Confirm Payment'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* Modal de visualização de documentos */}
      {previewUrl && (
        <>
          {console.log('🔍 [ADMIN] Rendering modal with URL:', previewUrl)}
          {console.log('🔍 [ADMIN] previewUrl is truthy:', !!previewUrl)}
          {console.log('🔍 [ADMIN] About to render DocumentViewerModal')}
          <DocumentViewerModal 
            documentUrl={previewUrl} 
            onClose={() => {
              console.log('🔍 [ADMIN] Closing modal');
              setPreviewUrl(null);
            }} 
          />
        </>
      )}
    </div>
  );
};

// Componente do timer do I-20 adaptado para o admin
interface AdminI20DeadlineTimerProps {
  deadline: Date;
  hasPaid: boolean;
  studentName: string;
}

const AdminI20DeadlineTimer: React.FC<AdminI20DeadlineTimerProps> = ({ deadline, hasPaid, studentName }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  // Don't render if already paid
  if (hasPaid) {
    return null;
  }

  // Calculate time remaining
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const timeDiff = deadline.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [deadline]);

  // Determine section style based on time remaining
  const getSectionStyle = () => {
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    if (timeDiff <= 0) {
      return {
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-500',
        textColor: 'text-red-700',
        titleColor: 'text-red-800'
      };
    } else if (daysLeft <= 1) {
      return {
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-500',
        textColor: 'text-red-700',
        titleColor: 'text-red-800'
      };
    } else if (daysLeft <= 3) {
      return {
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        iconColor: 'text-yellow-500',
        textColor: 'text-yellow-700',
        titleColor: 'text-yellow-800'
      };
    } else {
      return {
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-500',
        textColor: 'text-blue-700',
        titleColor: 'text-blue-800'
      };
    }
  };

  // Get status message
  const getStatusMessage = () => {
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    if (timeDiff <= 0) {
      return 'Deadline expired. Student needs to contact support immediately.';
    } else if (daysLeft <= 1) {
      return 'URGENT: I-20 Control Fee deadline is approaching! Contact student immediately.';
    } else if (daysLeft <= 3) {
      return 'I-20 Control Fee deadline is approaching. Student should pay soon.';
    } else {
      return 'I-20 Control Fee deadline is active. Monitor student progress.';
    }
  };

  // Get appropriate icon
  const getIcon = () => {
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24)); 

    if (timeDiff <= 0) {
      return <AlertTriangle className="w-5 h-5" />;
    } else if (daysLeft <= 3) {
      return <AlertTriangle className="w-5 h-5" />;
    } else {
      return <Clock className="w-5 h-5" />;
    }
  };

  const styles = getSectionStyle();

  return (
    <div className={`${styles.bgColor} rounded-lg border ${styles.borderColor} p-4`}>
      <div className="flex items-center space-x-3 mb-3">
        <div className={styles.iconColor}>
          {getIcon()}
        </div>
        <h3 className={`text-lg font-semibold ${styles.titleColor}`}>
          I-20 Control Fee Deadline - {studentName}
        </h3>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium ${styles.textColor}`}>
              Time Remaining:
            </span>
            <span className={`text-xl font-bold ${styles.textColor}`}>
              {timeLeft}
            </span>
          </div>
          <div className={`text-sm ${styles.textColor}`}>
            {isExpired ? 'Expired' : 'Active'}
          </div>
        </div>
        
        <div className={`text-sm ${styles.textColor}`}>
          <div className="font-medium mb-1">Deadline:</div>
          <div>{deadline.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</div>
        </div>
        
        <div className={`text-sm ${styles.textColor}`}>
          <div className="font-medium mb-1">Admin Status:</div>
          <div>{getStatusMessage()}</div>
        </div>
      </div>
    </div>
  );
};

export default AdminStudentDetails;