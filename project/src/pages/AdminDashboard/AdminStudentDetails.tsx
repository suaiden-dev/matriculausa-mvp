import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { useAuth } from '../../hooks/useAuth';
import { useStudentLogs } from '../../hooks/useStudentLogs';
import DocumentsView from '../../components/EnhancedStudentTracking/DocumentsView';
import StudentLogsView from '../../components/AdminDashboard/StudentLogsView';
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
  AlertTriangle
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
  profile_status?: string | null;
  avatar_url?: string | null;
  dependents?: number;
  desired_scholarship_range?: number | null;
  student_created_at: string;
  has_paid_selection_process_fee: boolean;
  has_paid_i20_control_fee: boolean;
  seller_referral_code: string | null;
  application_id: string | null;
  scholarship_id: string | null;
  application_status: string | null;
  applied_at: string | null;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  acceptance_letter_status: string | null;
  payment_status: string | null;
  scholarship_title: string | null;
  university_name: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  is_locked: boolean;
  total_applications: number;
  all_applications: any[];
}

const AdminStudentDetails: React.FC = () => {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedApps, setExpandedApps] = useState<{[key: string]: boolean}>({});
  const [dependents, setDependents] = useState<number>(0);
  const [approvingDocs, setApprovingDocs] = useState<{[key: string]: boolean}>({});
  const [uploadingDocs, setUploadingDocs] = useState<{[key: string]: boolean}>({});
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
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'logs'>('overview');
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploadingDocumentRequest, setUploadingDocumentRequest] = useState<{[key: string]: boolean}>({});
  const [approvingDocumentRequest, setApprovingDocumentRequest] = useState<{[key: string]: boolean}>({});
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
  // Upload de Acceptance Letter (Admin) - Removido pois agora está no DocumentsView
  const [isProgressExpanded, setIsProgressExpanded] = useState(false);
  const [i20Deadline, setI20Deadline] = useState<Date | null>(null);
  const [referralInfo, setReferralInfo] = useState<{
    type: 'seller' | 'affiliate' | 'student' | null;
    name: string | null;
    email: string | null;
    company?: string | null;
    affiliateName?: string | null;
    affiliateEmail?: string | null;
    isRewards?: boolean;
  } | null>(null);

  const { user } = useAuth();
  const isPlatformAdmin = user?.role === 'admin';

  const { getFeeAmount, formatFeeAmount, hasOverride } = useFeeConfig(student?.user_id);
  const { logAction } = useStudentLogs(student?.student_id || '');

  // Função para buscar informações de referência
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
            role,
            seller_referral_code,
            scholarship_applications (
              id,
              scholarship_id,
              status,
              applied_at,
              is_application_fee_paid,
              is_scholarship_fee_paid,
              acceptance_letter_status,
              acceptance_letter_url,
              acceptance_letter_sent_at,
              acceptance_letter_signed_at,
              acceptance_letter_approved_at,
              payment_status,
              reviewed_at,
              reviewed_by,
              documents,
              scholarships (
                title,
                university_id,
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
        if (s.scholarship_applications && s.scholarship_applications.length > 0) {
          lockedApplication = s.scholarship_applications.find((app: any) => app.status === 'approved' && app.is_application_fee_paid);
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
          profile_status: s.status || null,
          avatar_url: s.avatar_url || null,
          dependents: s.dependents || 0,
          desired_scholarship_range: s.desired_scholarship_range || null,
          student_created_at: s.created_at,
          has_paid_selection_process_fee: s.has_paid_selection_process_fee || false,
          has_paid_i20_control_fee: s.has_paid_i20_control_fee || false,
          seller_referral_code: s.seller_referral_code || null,
          application_id: lockedApplication?.id || null,
          scholarship_id: lockedApplication?.scholarship_id || null,
          application_status: lockedApplication?.status || null,
          applied_at: lockedApplication?.applied_at || null,
          is_application_fee_paid: !!lockedApplication,
          is_scholarship_fee_paid: lockedApplication?.is_scholarship_fee_paid || false,
          acceptance_letter_status: lockedApplication?.acceptance_letter_status || null,
          payment_status: lockedApplication?.payment_status || null,
          scholarship_title: lockedApplication?.scholarships?.title || null,
          university_name: lockedApplication?.scholarships?.universities?.name || null,
          reviewed_at: lockedApplication?.reviewed_at || null,
          reviewed_by: lockedApplication?.reviewed_by || null,
          is_locked: !!lockedApplication,
          total_applications: s.scholarship_applications ? s.scholarship_applications.length : 0,
          all_applications: s.scholarship_applications || []
        };

        setStudent(formatted);
        setDependents(Number(s.dependents || 0));
        
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

  const getStepStatus = (st: StudentRecord, step: string) => {
    switch (step) {
      case 'selection_fee':
        return st.has_paid_selection_process_fee ? 'completed' : 'pending';
      case 'apply':
        return st.applied_at ? 'completed' : 'pending';
      case 'review':
        if (st.application_status === 'approved') return 'completed';
        if (st.application_status === 'rejected') return 'rejected';
        if (st.application_status === 'under_review') return 'in_progress';
        return 'pending';
      case 'application_fee':
        return st.is_application_fee_paid ? 'completed' : 'pending';
      case 'scholarship_fee':
        return st.is_scholarship_fee_paid ? 'completed' : 'pending';
      case 'acceptance_letter':
        if (st.acceptance_letter_status === 'approved') return 'completed';
        if (st.acceptance_letter_status === 'sent') return 'in_progress';
        return 'pending';
      case 'i20_fee':
        return st.has_paid_i20_control_fee ? 'completed' : 'pending';
      case 'enrollment':
        return st.application_status === 'enrolled' ? 'completed' : 'pending';
      default:
        return 'pending';
    }
  };


  const steps = [
    { key: 'selection_fee', label: 'Selection Fee', icon: CreditCard },
    { key: 'apply', label: 'Application', icon: FileText },
    { key: 'review', label: 'Review', icon: Eye },
    { key: 'application_fee', label: 'App Fee', icon: CreditCard },
    { key: 'scholarship_fee', label: 'Scholarship Fee', icon: Award },
    { key: 'acceptance_letter', label: 'Acceptance', icon: FileText },
    { key: 'i20_fee', label: 'I-20 Fee', icon: CreditCard },
    { key: 'enrollment', label: 'Enrollment', icon: Award }
  ];

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
    } finally {
      setApprovingDocs(p => ({ ...p, [k]: false }));
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
          status: student.profile_status,
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

  const startEditingFees = () => {
    if (!student) return;
    
    // Calcular valores atuais considerando dependentes e overrides
    const dependentsExtra = dependents * 150; // $150 por dependente apenas no Selection Process
    const baseSelectionProcess = 400; // Valor base
    const currentSelectionProcess = hasOverride('selection_process') 
      ? getFeeAmount('selection_process') 
      : baseSelectionProcess + dependentsExtra;
    
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

  const confirmPayment = async () => {
    if (!pendingPayment) return;

    const { feeType, applicationId } = pendingPayment;
    await markFeeAsPaid(feeType, applicationId, selectedPaymentMethod);
    setShowPaymentModal(false);
    setPendingPayment(null);
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
          .update({ has_paid_selection_process_fee: true })
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
            ...(method ? { payment_status: method } : {})
          })
          .eq('id', targetApplicationId);

        if (error) throw error;

        // Atualizar estado local
        setStudent(prev => prev ? { ...prev, is_application_fee_paid: true } : prev);

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
            ...(method ? { payment_status: method } : {})
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
          .update({ has_paid_i20_control_fee: true })
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
          `Scholarship application approved`,
          user?.id || '',
          'admin',
          {
            application_id: applicationId,
            student_name: student.student_name
          }
        );
      } catch (logError) {
        console.error('Failed to log action:', logError);
      }
      
      showToast('Application approved successfully! The student will be notified.', 'success');
    } catch (error: any) {
      console.error('Error approving application:', error);
      showToast(`Failed to approve application: ${error.message}`, 'error');
    } finally {
      setApprovingStudent(false);
    }
  };

  const rejectApplication = async (applicationId: string) => {
    if (!student || !isPlatformAdmin) return;
    
    try {
      setRejectingStudent(true);
      
      await supabase
        .from('scholarship_applications')
        .update({ status: 'rejected', notes: rejectStudentReason || null })
        .eq('id', applicationId);
      
      setShowRejectStudentModal(false);
      setRejectStudentReason('');
      setPendingRejectAppId(null);
      
      // Log the action
      try {
        await logAction(
          'application_rejection',
          `Scholarship application rejected${rejectStudentReason ? `: ${rejectStudentReason}` : ''}`,
          user?.id || '',
          'admin',
          {
            application_id: applicationId,
            student_name: student.student_name,
            rejection_reason: rejectStudentReason
          }
        );
      } catch (logError) {
        console.error('Failed to log action:', logError);
      }
      
      showToast('Application rejected successfully.', 'success');
    } catch (error: any) {
      console.error('Error rejecting application:', error);
      showToast(`Failed to reject application: ${error.message}`, 'error');
    } finally {
      setRejectingStudent(false);
    }
  };

  const fetchDocumentRequests = async () => {
    if (!student) return;
    
    setLoadingDocuments(true);
    try {
      // Buscar document requests específicos para as aplicações do estudante
      const applicationIds = student.all_applications?.map(app => app.id) || [];
      
      let allRequests: any[] = [];
      
      // Buscar requests específicos para cada aplicação
      if (applicationIds.length > 0) {
        const { data: specificRequests, error: specificError } = await supabase
          .from('document_requests')
          .select(`
            *,
            document_request_uploads (
              *,
              reviewed_by,
              reviewed_at
            )
          `)
          .in('scholarship_application_id', applicationIds)
          .order('created_at', { ascending: false });

        if (specificError) throw specificError;
        allRequests = [...allRequests, ...(specificRequests || [])];
      }
      
      // Buscar requests globais da universidade
      const universityIds = student.all_applications?.map(app => app.scholarships?.university_id).filter(Boolean) || [];
      const uniqueUniversityIds = [...new Set(universityIds)];
      
      console.log('University IDs found:', uniqueUniversityIds);
      
      // Buscar requests globais das universidades específicas
      if (uniqueUniversityIds.length > 0) {
        const { data: globalRequests, error: globalError } = await supabase
          .from('document_requests')
          .select(`
            *,
            document_request_uploads (
              *,
              reviewed_by,
              reviewed_at
            )
          `)
          .eq('is_global', true)
          .in('university_id', uniqueUniversityIds)
          .order('created_at', { ascending: false });

        if (globalError) throw globalError;
        console.log('Global requests found for specific universities:', globalRequests);
        allRequests = [...allRequests, ...(globalRequests || [])];
      }
      
      // Também buscar TODOS os requests globais ativos (independente da universidade)
      // Isso garante que requests globais de outras universidades também apareçam
      const { data: allGlobalRequests, error: allGlobalError } = await supabase
        .from('document_requests')
        .select(`
          *,
          document_request_uploads (
            *,
            reviewed_by,
            reviewed_at
          )
        `)
        .eq('is_global', true)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (allGlobalError) throw allGlobalError;
      console.log('All global requests found:', allGlobalRequests);
      
      // Adicionar requests globais que ainda não foram adicionados
      const existingIds = allRequests.map(req => req.id);
      const newGlobalRequests = (allGlobalRequests || []).filter(req => !existingIds.includes(req.id));
      allRequests = [...allRequests, ...newGlobalRequests];

      setDocumentRequests(allRequests);
    } catch (error) {
      console.error('Error fetching document requests:', error);
    } finally {
      setLoadingDocuments(false);
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
      let attachment_url = '';
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
              link: '/student/documents'
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
    if (doc.file_url) {
      window.open(doc.file_url, '_blank');
    }
  };

  const handleDownloadDocument = (doc: any) => {
    if (doc.file_url) {
      const link = document.createElement('a');
      link.href = doc.file_url;
      link.download = doc.filename || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
          `Document request upload approved`,
          user?.id || '',
          'admin',
          {
            upload_id: uploadId,
            document_type: 'document_request_upload'
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
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          Back
        </button>
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
                      {student.is_locked ? 'Committed to Scholarship' :
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
            </div>
          </div>

          {student.scholarship_title ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
              <div className="bg-gradient-to-r rounded-t-2xl from-slate-700 to-slate-800 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <Award className="w-6 h-6 mr-3" />
                  Committed Scholarship
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
                const applicationsWithDocs: any[] = [];
                (student.all_applications || []).forEach((app: any) => {
                  if (Array.isArray(app.documents) && app.documents.length > 0) applicationsWithDocs.push(app);
                });
                if (applicationsWithDocs.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No Documents Yet</h3>
                    </div>
                  );
                }
                return (
                  <div className="space-y-4">
                    {applicationsWithDocs
                      .sort((a: any, b: any) => {
                        // Aplicações aprovadas primeiro
                        if (a.status === 'approved' && b.status !== 'approved') return -1;
                        if (b.status === 'approved' && a.status !== 'approved') return 1;
                        return 0;
                      })
                      .map((app: any, i: number) => {
                      const appKey = app.id || `app-${i}`;
                      const isExpanded = expandedApps[appKey] || false;
                      return (
                        <div key={appKey} className={`border rounded-xl overflow-hidden ${
                          app.status === 'approved' 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-slate-200'
                        }`}>
                          <button onClick={() => setExpandedApps(p => ({ ...p, [appKey]: !isExpanded }))} className={`w-full px-4 py-3 transition-colors text-left flex items-center justify-between ${
                            app.status === 'approved' 
                              ? 'bg-green-50 hover:bg-green-100' 
                              : 'bg-slate-50 hover:bg-slate-100'
                          }`}>
                            <div className="flex items-center space-x-3">
                              {app.status === 'approved' && (
                                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
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
                              <p className="text-sm text-slate-600">{app.scholarships?.universities?.name || 'University'} • {app.documents.length} documents</p>
                              </div>
                            </div>
                            <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          {isExpanded && (
                            <div className="p-4 bg-white border-t border-slate-200">
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
                                          onClick={() => {
                                            const baseUrl = 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/student-documents/';
                                            const fullUrl = doc.url.startsWith('http') ? doc.url : `${baseUrl}${doc.url}`;
                                            window.open(fullUrl, '_blank');
                                          }}
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
                                          <button
                                            onClick={() => handleApproveDocument(app.id, doc.type)}
                                            disabled={!!approvingDocs[`${app.id}:${doc.type}`]}
                                            className={`text-xs font-medium flex items-center space-x-1 transition-colors px-2 py-1 rounded-md border ${approvingDocs[`${app.id}:${doc.type}`] ? 'text-slate-400 border-slate-200 bg-slate-50' : 'text-green-700 border-green-300 hover:bg-green-50'}`}
                                          >
                                            <CheckCircle className="w-3 h-3" />
                                            <span className="hidden md:inline">Approve</span>
                                          </button>
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
                              
                              {/* Application Approval Section - Only for Platform Admins */}
                              {isPlatformAdmin && (() => {
                                // Verificar se todos os documentos desta aplicação foram aprovados
                                const allDocsApproved = app.documents.every((doc: any) => doc.status === 'approved');
                                
                                return allDocsApproved && (
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
                                            : 'All documents approved. You can now approve this application.'
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
                                        disabled={approvingStudent || rejectingStudent || app.status === 'approved'}
                                        className="px-4 py-2 rounded-lg font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center text-sm"
                                      >
                                        {app.status === 'approved' ? 'Application Approved' : 'Reject Application'}
                                      </button>
                                      <button
                                        disabled={approvingStudent || rejectingStudent || app.status === 'approved'}
                                        onClick={() => approveApplication(app.id)}
                                        className="px-4 py-2 rounded-lg font-medium bg-[#05294E] text-white hover:bg-[#041f38] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center text-sm"
                                      >
                                        {app.status === 'approved' ? 'Approved' : (approvingStudent ? 'Approving...' : 'Approve Application')}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}
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
              <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
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
                    if (hasCustomOverride) return formatFeeAmount(getFeeAmount('selection_process'));
                    const base = Number(getFeeAmount('selection_process'));
                    return formatFeeAmount(base + dependents * 150);
                      })()}
                      {hasOverride('selection_process') && (
                        <span className="ml-2 text-xs text-blue-500">(custom)</span>
                      )}
                    </dd>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                   {student.has_paid_selection_process_fee ? (
                    <><CheckCircle className="h-5 w-5 text-green-600" /><span className="text-sm font-medium text-green-600">Paid</span></>
                  ) : (
                     <div className="flex items-center space-x-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium text-red-600">Not Paid</span>
                       {isPlatformAdmin && (
                         <button
                           onClick={() => openPaymentModal('selection_process')}
                           disabled={markingAsPaid[`${student.student_id}:selection_process`]}
                           className="px-2 py-1 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-xs rounded-md flex items-center space-x-1"
                         >
                           <CheckCircle className="w-3 h-3" />
                           <span>{markingAsPaid[`${student.student_id}:selection_process`] ? 'Marking...' : 'Mark as Paid'}</span>
                         </button>
                       )}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                <div className="flex-1">
                  <dt className="text-sm font-medium text-slate-600">Application Fee</dt>
                  <dd className="text-sm text-slate-500 mt-1">Paid after scholarship approval</dd>
                  <dd className="text-sm font-semibold text-slate-700 mt-1">$400.00</dd>
                </div>
                <div className="flex items-center space-x-2">
                  {student.is_application_fee_paid ? (
                    <><CheckCircle className="h-5 w-5 text-green-600" /><span className="text-sm font-medium text-green-600">Paid</span></>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium text-red-600">Not Paid</span>
                       {isPlatformAdmin && (() => {
                         // Buscar aplicação aprovada para application fee
                         const approvedApp = student.all_applications?.find((app: any) => app.status === 'approved');
                         return approvedApp && (
                           <button
                             onClick={() => openPaymentModal('application', approvedApp.id)}
                             disabled={markingAsPaid[`${student.student_id}:application`]}
                             className="px-2 py-1 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-xs rounded-md flex items-center space-x-1"
                           >
                             <CheckCircle className="w-3 h-3" />
                             <span>{markingAsPaid[`${student.student_id}:application`] ? 'Marking...' : 'Mark as Paid'}</span>
                           </button>
                         );
                       })()}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
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
                <div className="flex items-center space-x-2">
                   {student.is_scholarship_fee_paid ? (
                    <><CheckCircle className="h-5 w-5 text-green-600" /><span className="text-sm font-medium text-green-600">Paid</span></>
                  ) : (
                     <div className="flex items-center space-x-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium text-red-600">Not Paid</span>
                       {isPlatformAdmin && (() => {
                         // Buscar aplicação aprovada para scholarship fee
                         const approvedApp = student.all_applications?.find((app: any) => app.status === 'approved');
                         return approvedApp && (
                           <button
                             onClick={() => openPaymentModal('scholarship', approvedApp.id)}
                             disabled={markingAsPaid[`${student.student_id}:scholarship`]}
                             className="px-2 py-1 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-xs rounded-md flex items-center space-x-1"
                           >
                             <CheckCircle className="w-3 h-3" />
                             <span>{markingAsPaid[`${student.student_id}:scholarship`] ? 'Marking...' : 'Mark as Paid'}</span>
                           </button>
                         );
                       })()}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
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
                <div className="flex items-center space-x-2">
                   {student.has_paid_i20_control_fee ? (
                    <><CheckCircle className="h-5 w-5 text-green-600" /><span className="text-sm font-medium text-green-600">Paid</span></>
                  ) : (
                     <div className="flex items-center space-x-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium text-red-600">Not Paid</span>
                       {isPlatformAdmin && (
                         <button
                           onClick={() => openPaymentModal('i20_control')}
                           disabled={markingAsPaid[`${student.student_id}:i20_control`]}
                           className="px-2 py-1 bg-[#05294E] hover:bg-[#05294E]/90 text-white text-xs rounded-md flex items-center space-x-1"
                         >
                           <CheckCircle className="w-3 h-3" />
                           <span>{markingAsPaid[`${student.student_id}:i20_control`] ? 'Marking...' : 'Mark as Paid'}</span>
                         </button>
                       )}
                </div>
                  )}
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
                // Priorizar aplicação com acceptance letter
                const apps = student?.all_applications || [];
                const appWithLetter = apps.find(app => app.acceptance_letter_url);
                return appWithLetter || apps[0];
              })()}
              studentId={student?.user_id}
              onViewDocument={handleViewDocument}
              onDownloadDocument={handleDownloadDocument}
              onUploadDocument={handleUploadDocumentRequest}
              onApproveDocument={handleApproveDocumentRequest}
              isAdmin={isPlatformAdmin}
              uploadingStates={uploadingDocumentRequest}
              approvingStates={approvingDocumentRequest}
            />
          )}
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
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPayment}
                disabled={markingAsPaid[`${student?.student_id}:${pendingPayment.feeType}`]}
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