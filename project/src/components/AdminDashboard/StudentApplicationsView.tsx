import React, { useState, useEffect } from 'react';
import { 
  Search,
  Eye,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  GraduationCap,
  Building,
  User,
  ArrowRight,
  AlertCircle,
  Lock,
  CreditCard,
  Award,
  BookOpen
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { useAuth } from '../../hooks/useAuth';
import { useStudentUnreadMessages } from '../../hooks/useStudentUnreadMessages';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import DocumentViewerModal from '../DocumentViewerModal';

interface StudentRecord {
  // Dados do estudante (sempre presentes)
  student_id: string;
  user_id: string;
  student_name: string;
  student_email: string;
  student_created_at: string;
  has_paid_selection_process_fee: boolean;
  has_paid_i20_control_fee: boolean;
  seller_referral_code: string | null;
  
  // Dados da aplicação (podem ser null se não aplicou ainda)
  application_id: string | null;
  scholarship_id: string | null;
  status: string | null;
  application_status: string | null;
  applied_at: string | null;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  acceptance_letter_status: string | null;
  payment_status: string | null;
  student_process_type: string | null;
  transfer_form_status: string | null;
  scholarship_title: string | null;
  university_name: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  
  // Campos adicionais para múltiplas aplicações
  is_locked: boolean;
  total_applications: number;
  all_applications: any[];
}

const StudentApplicationsView: React.FC = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [expandedApps, setExpandedApps] = useState<{[key: string]: boolean}>({});
  const [dependents, setDependents] = useState<number>(0);
  const [approvingDocs, setApprovingDocs] = useState<{[key: string]: boolean}>({});
  
  // Hook para configurações dinâmicas de taxas
  const { getFeeAmount, formatFeeAmount, hasOverride } = useFeeConfig(selectedStudent?.user_id);

  // Auth e role do usuário atual
  const { user } = useAuth();
  const isPlatformAdmin = user?.role === 'admin';
  
  // Hook para mensagens não lidas por estudante
  const { getUnreadCount } = useStudentUnreadMessages();

  // Aprovação e rejeição de documentos pelo admin
  const approveableTypes = new Set(['passport', 'funds_proof', 'diploma']);
  const [rejectingDocs, setRejectingDocs] = useState<{[key: string]: boolean}>({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectData, setRejectData] = useState<{applicationId: string, docType: string} | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // Estado para modal de visualização de documentos
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleViewDocument = (doc: { file_url: string; filename?: string }) => {
    if (doc.file_url) {
      setPreviewUrl(doc.file_url);
    }
  };

  const handleApproveDocument = async (applicationId: string, docType: string) => {
    if (!isPlatformAdmin) return;
    if (!approveableTypes.has(docType)) return;

    const loadingKey = `${applicationId}:${docType}`;
    setApprovingDocs(prev => ({ ...prev, [loadingKey]: true }));
    try {
      const targetApp = selectedStudent?.all_applications?.find((a: any) => a.id === applicationId);
      if (!targetApp) {
        console.error('Aplicação não encontrada para aprovação de documento', { applicationId, docType });
        return;
      }

      const currentDocs: any[] = Array.isArray(targetApp.documents) ? targetApp.documents : [];
      const newDocuments = currentDocs.map((d: any) => {
        if (d?.type === docType) {
          return {
            ...d,
            status: 'approved',
            approved_at: new Date().toISOString()
          };
        }
        return d;
      });

      const { data: updated, error } = await supabase
        .from('scholarship_applications')
        .update({ documents: newDocuments, updated_at: new Date().toISOString() })
        .eq('id', applicationId)
        .select('id, documents')
        .single();

      if (error) {
        console.error('Erro ao aprovar documento:', error);
        return;
      }

      setSelectedStudent(prev => {
        if (!prev) return prev;
        const updatedApps = (prev.all_applications || []).map((a: any) =>
          a.id === applicationId ? { ...a, documents: updated?.documents || newDocuments } : a
        );
        return { ...prev, all_applications: updatedApps } as any;
      });
    } finally {
      setApprovingDocs(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleRejectDocument = async (applicationId: string, docType: string, reason: string) => {
    if (!isPlatformAdmin) return;
    if (!approveableTypes.has(docType)) return;

    const loadingKey = `${applicationId}:${docType}`;
    setRejectingDocs(prev => ({ ...prev, [loadingKey]: true }));
    
    try {
      const targetApp = selectedStudent?.all_applications?.find((a: any) => a.id === applicationId);
      if (!targetApp) {
        console.error('Aplicação não encontrada para rejeição de documento', { applicationId, docType });
        return;
      }

      const currentDocs: any[] = Array.isArray(targetApp.documents) ? targetApp.documents : [];
      const newDocuments = currentDocs.map((d: any) => {
        if (d?.type === docType) {
          return {
            ...d,
            status: 'rejected',
            rejected_at: new Date().toISOString(),
            rejection_reason: reason,
            rejected_by: user?.id
          };
        }
        return d;
      });

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

      setSelectedStudent(prev => {
        if (!prev) return prev;
        const updatedApps = (prev.all_applications || []).map((a: any) =>
          a.id === applicationId ? { ...a, documents: updated?.documents || newDocuments } : a
        );
        return { ...prev, all_applications: updatedApps } as any;
      });

      // Log da ação
      try {
        await supabase.rpc('log_student_action', {
          p_student_id: selectedStudent?.id,
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

      // Fechar modal e limpar dados
      setShowRejectModal(false);
      setRejectData(null);
      setRejectReason('');
      
    } catch (error: any) {
      console.error('Erro ao rejeitar documento:', error);
    } finally {
      setRejectingDocs(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const openRejectModal = (applicationId: string, docType: string) => {
    setRejectData({ applicationId, docType });
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (rejectData && rejectReason.trim()) {
      handleRejectDocument(rejectData.applicationId, rejectData.docType, rejectReason.trim());
    }
  };

  // Novos filtros
  const [stageFilter, setStageFilter] = useState('all');
  const [affiliateFilter, setAffiliateFilter] = useState('all');
  const [scholarshipFilter, setScholarshipFilter] = useState('all');
  const [universityFilter, setUniversityFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  
  // Dados para os filtros
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);

  useEffect(() => {
    fetchStudents();
    fetchFilterData();
  }, []);

  // Carregar dependents quando selectedStudent mudar (mantido para compatibilidade, mas modal foi substituído por página dedicada)
  useEffect(() => {
    if (selectedStudent?.user_id) {
      loadDependents(selectedStudent.user_id);
    } else {
      setDependents(0);
    }
  }, [selectedStudent?.user_id]);

  // Função para carregar dependents do estudante
  const loadDependents = async (studentUserId?: string) => {
    if (!studentUserId) return;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('dependents')
        .eq('user_id', studentUserId)
        .single();
      if (!error && data) setDependents(Number(data.dependents || 0));
      else setDependents(0);
    } catch {
      setDependents(0);
    }
  };

  const fetchFilterData = async () => {
    try {
      // Buscar usuários com role affiliate_admin da tabela user_profiles
      const { data: affiliateAdminsData, error: affiliateAdminsError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email')
        .eq('role', 'affiliate_admin')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (affiliateAdminsError) {
        console.error('Error loading affiliate admins:', affiliateAdminsError);
      } else if (affiliateAdminsData) {
        console.log('🔍 DEBUG: Found affiliate admins:', affiliateAdminsData);
        
        // Para cada affiliate admin, buscar os sellers associados
        const affiliatesWithSellers = await Promise.all(
          affiliateAdminsData.map(async (admin) => {
            // Primeiro buscar o affiliate_admin_id na tabela affiliate_admins
            const { data: affiliateAdminData } = await supabase
              .from('affiliate_admins')
              .select('id')
              .eq('user_id', admin.user_id)
              .single();
            
            let sellers = [];
            if (affiliateAdminData) {
              // Buscar sellers que pertencem a este affiliate admin
              const { data: sellersData } = await supabase
                .from('sellers')
                .select('id, referral_code, name, email')
                .eq('affiliate_admin_id', affiliateAdminData.id)
                .eq('is_active', true);
              
              sellers = sellersData || [];
            }
            
            // Se não encontrar sellers diretos, buscar por email
            if (sellers.length === 0) {
              const { data: sellersByEmail } = await supabase
                .from('sellers')
                .select('id, referral_code, name, email')
                .eq('email', admin.email)
                .eq('is_active', true);
              sellers = sellersByEmail || [];
            }
            
            console.log(`🔍 DEBUG: Affiliate ${admin.full_name} has sellers:`, sellers.map(s => s.referral_code));
            
            return {
              id: admin.user_id,
              user_id: admin.user_id,
              name: admin.full_name || admin.email,
              email: admin.email,
              referral_code: sellers[0]?.referral_code || null,
              sellers: sellers
            };
          })
        );
        
        console.log('🔍 DEBUG: Loaded affiliates with sellers:', affiliatesWithSellers);
        setAffiliates(affiliatesWithSellers);
      }

      // Carregar scholarships
      const { data: scholarshipsData } = await supabase
        .from('scholarships')
        .select('id, title, universities!inner(name)')
        .eq('is_active', true)
        .order('title', { ascending: true });
      
      if (scholarshipsData) {
        setScholarships(scholarshipsData);
      }

      // Carregar universities
      const { data: universitiesData } = await supabase
        .from('universities')
        .select('id, name')
        .eq('is_approved', true)
        .order('name', { ascending: true });
      
      if (universitiesData) {
        setUniversities(universitiesData);
      }
    } catch (error) {
      console.error('Error loading filter data:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      // Buscar apenas estudantes que pagaram a taxa de seleção
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          user_id,
          full_name,
          email,
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
            payment_status,
            reviewed_at,
            reviewed_by,
            student_process_type,
            transfer_form_status,
            documents,
            scholarships (
              title,
              universities (
                name
              )
            )
          )
        `)
        .eq('role', 'student')
        // .eq('has_paid_selection_process_fee', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Debug: verificar se o campo seller_referral_code está sendo retornado
      console.log('🔍 DEBUG: Raw students data (first 3):', data?.slice(0, 3).map(s => ({ 
        name: s.full_name, 
        email: s.email, 
        seller_referral_code: s.seller_referral_code 
      })));

      const formattedData = data?.map((student: any) => {
        // Cada estudante aparece apenas uma vez na tabela
        let scholarshipInfo = null;
        let applicationStatus = null;
        
        let lockedApplication = null;
        
        if (student.scholarship_applications && student.scholarship_applications.length > 0) {
          // Priorizar aplicação que teve Application Fee pago, depois enrolled, depois approved
          lockedApplication = student.scholarship_applications.find((app: any) => app.is_application_fee_paid) ||
                             student.scholarship_applications.find((app: any) => app.status === 'enrolled') ||
                             student.scholarship_applications.find((app: any) => app.status === 'approved');
          
          // Se há uma aplicação locked, mostrar informações dela no campo scholarship
          if (lockedApplication) {
            scholarshipInfo = {
              title: lockedApplication.scholarships?.title || 'N/A',
              university: lockedApplication.scholarships?.universities?.name || 'N/A'
            };
            applicationStatus = lockedApplication.status;
          }
          // Se não há aplicação locked, deixar campo scholarship vazio
        }

        const studentRecord = {
          student_id: student.id,
          user_id: student.user_id,
          student_name: student.full_name || 'N/A',
          student_email: student.email || 'N/A',
          student_created_at: student.created_at,
          has_paid_selection_process_fee: student.has_paid_selection_process_fee || false,
          has_paid_i20_control_fee: student.has_paid_i20_control_fee || false,
          seller_referral_code: student.seller_referral_code || null,
          // Dados da aplicação só aparecem se locked
          application_id: lockedApplication?.id || null,
          scholarship_id: lockedApplication?.scholarship_id || null,
          status: applicationStatus,
          application_status: applicationStatus, // Adicionar campo para compatibilidade
          applied_at: lockedApplication?.applied_at || null,
          is_application_fee_paid: lockedApplication?.is_application_fee_paid || false,
          is_scholarship_fee_paid: lockedApplication?.is_scholarship_fee_paid || false,
          acceptance_letter_status: lockedApplication?.acceptance_letter_status || null,
          payment_status: lockedApplication?.payment_status || null,
          student_process_type: lockedApplication?.student_process_type || null,
          transfer_form_status: lockedApplication?.transfer_form_status || null,
          scholarship_title: scholarshipInfo ? scholarshipInfo.title : null,
          university_name: scholarshipInfo ? scholarshipInfo.university : null,
          reviewed_at: lockedApplication?.reviewed_at || null,
          reviewed_by: lockedApplication?.reviewed_by || null,
          is_locked: !!lockedApplication,
          total_applications: student.scholarship_applications ? student.scholarship_applications.length : 0,
          // Guardar todas as aplicações para o modal
          all_applications: student.scholarship_applications || []
        };
        
        
        return studentRecord;
      }) || [];

      setStudents(formattedData);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (student: StudentRecord, step: string) => {
    switch (step) {
      case 'selection_fee':
        return student.has_paid_selection_process_fee ? 'completed' : 'pending';
      case 'apply':
        return student.total_applications > 0 ? 'completed' : 'pending';
      case 'review':
        if (student.application_status === 'enrolled' || student.application_status === 'approved') return 'completed';
        if (student.application_status === 'rejected') return 'rejected';
        if (student.application_status === 'under_review') return 'in_progress';
        return 'pending';
      case 'application_fee':
        return student.is_application_fee_paid ? 'completed' : 'pending';
      case 'scholarship_fee':
        return student.is_scholarship_fee_paid ? 'completed' : 'pending';
      case 'acceptance_letter':
        if (student.acceptance_letter_status === 'approved' || student.acceptance_letter_status === 'sent') return 'completed';
        return 'pending';
      case 'transfer_form':
        // Só aparece para alunos com process_type = 'transfer'
        if (student.student_process_type !== 'transfer') return 'skipped';
        // Verificar se existe um documento de transfer form aprovado
        if (student.transfer_form_status === 'approved' || student.transfer_form_status === 'sent') {
          return 'completed';
        }
        return 'pending';
      case 'i20_fee':
        return student.has_paid_i20_control_fee ? 'completed' : 'pending';
      case 'enrollment':
        return student.application_status === 'enrolled' ? 'completed' : 'pending';
      default:
        return 'pending';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-gray-600 bg-gray-100';
      case 'skipped': return 'text-gray-400 bg-gray-50';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in_progress': return Clock;
      case 'rejected': return XCircle;
      case 'pending': return AlertCircle;
      case 'skipped': return AlertCircle;
      default: return AlertCircle;
    }
  };

  const filteredStudents = students.filter((student: StudentRecord) => {
    // Nota: Agora todos os estudantes já pagaram a taxa de seleção (filtro aplicado na query)
    
    const matchesSearch = 
      student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.scholarship_title && student.scholarship_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.university_name && student.university_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
      student.status === statusFilter || 
      (statusFilter === 'no_applications' && !student.application_id) ||
      (statusFilter === 'multiple_applications' && student.total_applications > 1 && !student.is_locked) ||
      (statusFilter === 'locked' && student.is_locked) ||
      (statusFilter === 'single_application' && student.total_applications === 1);
    
    // Filtro por etapa do processo (baseado no Application Flow)
    const matchesStage = stageFilter === 'all' || (() => {
      // Debug: Log do estado do estudante
      if (stageFilter !== 'all') {
        console.log(`🔍 DEBUG: Student ${student.student_name} - Stage Filter: ${stageFilter}`, {
          has_paid_selection_process_fee: student.has_paid_selection_process_fee,
          total_applications: student.total_applications,
          is_locked: student.is_locked,
          status: student.status,
          is_application_fee_paid: student.is_application_fee_paid,
          is_scholarship_fee_paid: student.is_scholarship_fee_paid,
          acceptance_letter_status: student.acceptance_letter_status,
          has_paid_i20_control_fee: student.has_paid_i20_control_fee
        });
      }

      let result = false;
      switch (stageFilter) {
        case 'selection_fee':
          // Estudantes que pagaram a Selection Process Fee
          result = !!student.has_paid_selection_process_fee;
          break;
        case 'application':
          // Estudantes que já fizeram alguma aplicação
          result = (student.total_applications || 0) > 0;
          break;
        case 'review':
          // Estudantes com alguma aplicação em revisão/aprovada/rejeitada
          result = !!student.status || (student.total_applications || 0) > 0;
          break;
        case 'app_fee':
          // Application fee paga
          result = !!student.is_application_fee_paid;
          break;
        case 'scholarship_fee':
          // Scholarship fee paga
          result = !!student.is_scholarship_fee_paid;
          break;
        case 'acceptance':
          // Carta de aceitação enviada/assinada/aprovada
          result = !!student.acceptance_letter_status && 
                   (student.acceptance_letter_status === 'sent' || 
                    student.acceptance_letter_status === 'signed' || 
                    student.acceptance_letter_status === 'approved');
          break;
        case 'i20_fee':
          // I-20 Control Fee paga
          result = !!student.has_paid_i20_control_fee;
          break;
        case 'enrollment':
          // Considerar matriculado quando status for 'enrolled'
          result = student.status === 'enrolled';
          break;
        default:
          result = true;
      }
      
      if (stageFilter !== 'all') console.log(`  → Result: ${result}`);
      return result;
    })();
    
    // Filtro por bolsa
    const matchesScholarship = scholarshipFilter === 'all' || 
      (student.scholarship_id && student.scholarship_id === scholarshipFilter);
    
    // Filtro por universidade
    const matchesUniversity = universityFilter === 'all' || 
      (student.university_name && student.university_name.toLowerCase().includes(universityFilter.toLowerCase()));
    
    // Filtro por affiliate admin
    const matchesAffiliate = affiliateFilter === 'all' || (() => {
      if (affiliateFilter !== 'all') {
        console.log(`🔍 DEBUG: Checking affiliate filter for student ${student.student_name}:`, {
          student_referral_code: student.seller_referral_code,
          affiliateFilter,
          student_id: student.student_id,
          available_affiliates: affiliates.map(a => ({ 
            id: a.id, 
            name: a.name, 
            referral_code: a.referral_code,
            sellers: a.sellers?.map(s => s.referral_code) || []
          }))
        });
      }
      
      if (!student.seller_referral_code) {
        // Se não tem referral code, só aparece se filtro for "all"
        if (affiliateFilter !== 'all') {
          console.log(`  → Student has no referral code, excluding from filter`);
        }
        return affiliateFilter === 'all';
      }
      
      // Buscar o affiliate admin pelo referral code do estudante
      // Primeiro tenta pelo referral_code direto do affiliate
      let affiliate = affiliates.find(aff => aff.referral_code === student.seller_referral_code);
      
      if (affiliate) {
        console.log(`  → Found affiliate by direct referral_code:`, affiliate);
      } else {
        // Se não encontrar, busca pelos sellers do affiliate
        affiliate = affiliates.find(aff => 
          aff.sellers?.some(seller => seller.referral_code === student.seller_referral_code)
        );
        
        if (affiliate) {
          console.log(`  → Found affiliate by seller referral_code:`, affiliate);
        } else {
          console.log(`  → No affiliate found for referral_code: ${student.seller_referral_code}`);
        }
      }
      
      const result = affiliate && affiliate.id === affiliateFilter;
      
      if (affiliateFilter !== 'all') {
        console.log(`  → Final result: ${result} (affiliate.id: ${affiliate?.id}, filter: ${affiliateFilter})`);
      }
      
      return result;
    })();
    
    // Filtro por tempo
    const matchesTime = (() => {
      if (timeFilter === 'all') return true;
      
      const studentDate = dayjs(student.student_created_at);
      
      // Se tem datas específicas selecionadas, usar elas
      if (startDate && endDate) {
        return studentDate.isAfter(startDate.subtract(1, 'day')) && studentDate.isBefore(endDate.add(1, 'day'));
      }
      
      // Se tem apenas data de início
      if (startDate) {
        return studentDate.isAfter(startDate.subtract(1, 'day'));
      }
      
      // Se tem apenas data de fim
      if (endDate) {
        return studentDate.isBefore(endDate.add(1, 'day'));
      }
      
      // Filtros predefinidos
      const now = dayjs();
      switch (timeFilter) {
        case 'last_7_days': return studentDate.isAfter(now.subtract(7, 'day'));
        case 'last_30_days': return studentDate.isAfter(now.subtract(30, 'day'));
        case 'last_90_days': return studentDate.isAfter(now.subtract(90, 'day'));
        case 'last_year': return studentDate.isAfter(now.subtract(1, 'year'));
        default: return true;
      }
    })();
    
    const finalResult = matchesSearch && matchesStatus && matchesStage && matchesScholarship && matchesUniversity && matchesAffiliate && matchesTime;
    
    if (affiliateFilter !== 'all' && finalResult) {
      console.log(`✅ Student ${student.student_name} PASSED affiliate filter`);
    }
    
    return finalResult;
  });
  
  // Log do resultado final do filtro
  if (affiliateFilter !== 'all') {
    console.log(`🔍 DEBUG: Affiliate filter "${affiliateFilter}" resulted in ${filteredStudents.length} students`);
    console.log(`🔍 DEBUG: All students with referral codes:`, 
      students.map(s => ({ 
        name: s.student_name, 
        referral_code: s.seller_referral_code,
        has_referral: !!s.seller_referral_code 
      }))
    );
  }

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  const ApplicationFlowSteps = ({ student }: { student: StudentRecord }) => {
    const allSteps = [
      { key: 'selection_fee', label: 'Selection Fee', icon: CreditCard },
      { key: 'apply', label: 'Application', icon: FileText },
      { key: 'review', label: 'Review', icon: Eye },
      { key: 'application_fee', label: 'App Fee', icon: DollarSign },
      { key: 'scholarship_fee', label: 'Scholarship Fee', icon: Award },
      { key: 'acceptance_letter', label: 'Acceptance', icon: BookOpen },
      { key: 'transfer_form', label: 'Transfer Form', icon: FileText },
      { key: 'i20_fee', label: 'I-20 Fee', icon: CreditCard },
      { key: 'enrollment', label: 'Enrollment', icon: GraduationCap }
    ];

    // Filtrar steps baseado no student_process_type
    const steps = allSteps.filter(step => {
      if (step.key === 'transfer_form') {
        // Só mostrar transfer_form se o student_process_type for 'transfer'
        return student?.student_process_type === 'transfer';
      }
      return true;
    });

    return (
      <div className="flex items-center space-x-2 overflow-x-auto">
        {steps.map((step, index) => {
          const status = getStepStatus(student, step.key);
          const StatusIcon = getStatusIcon(status);
          const StepIcon = step.icon;

          return (
            <React.Fragment key={step.key}>
              <div className={`flex flex-col items-center p-2 rounded-lg transition-all ${getStatusColor(status)}`}>
                <div className="relative">
                  <StepIcon className="h-5 w-5 mb-1" />
                  <StatusIcon className="h-3 w-3 absolute -top-1 -right-1" />
                </div>
                <span className="text-xs font-medium text-center">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Application Tracking</h2>
          <p className="text-gray-600">Monitor the complete application journey of all students</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {filteredStudents.length} students found
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {/* Primeira linha - Busca e Status */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student name, email, scholarship, or university..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
            >
              <option value="all">All Students</option>
              <option value="no_applications">No Applications</option>
              <option value="single_application">Single Application</option>
              <option value="multiple_applications">Multiple Applications</option>
              <option value="locked">Scholarship Selected</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="enrolled">Enrolled</option>
            </select>
            </div>
          </div>
          
          {/* Segunda linha - Novos filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Filtro por Etapa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Process Stage</label>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] text-sm"
              >
                <option value="all">All Stages</option>
                <option value="selection_fee">Selection Fee</option>
                <option value="application">Application</option>
                <option value="review">Review</option>
                <option value="app_fee">App Fee</option>
                <option value="scholarship_fee">Scholarship Fee</option>
                <option value="acceptance">Acceptance</option>
                <option value="i20_fee">I-20 Fee</option>
                <option value="enrollment">Enrollment</option>
              </select>
            </div>
            
            {/* Filtro por Bolsa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scholarship</label>
              <select
                value={scholarshipFilter}
                onChange={(e) => setScholarshipFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] text-sm"
              >
                <option value="all">All Scholarships</option>
                {scholarships.map((scholarship) => (
                  <option key={scholarship.id} value={scholarship.id}>
                    {scholarship.title}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Filtro por Universidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">University</label>
              <select
                value={universityFilter}
                onChange={(e) => setUniversityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] text-sm"
              >
                <option value="all">All Universities</option>
                {universities.map((university) => (
                  <option key={university.id} value={university.name}>
                    {university.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Filtro por Tempo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
              <div className="space-y-2">
                <select
                  value={timeFilter}
                  onChange={(e) => {
                    setTimeFilter(e.target.value);
                    if (e.target.value !== 'custom') {
                      setStartDate(null);
                      setEndDate(null);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="last_7_days">Last 7 Days</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="last_90_days">Last 90 Days</option>
                  <option value="last_year">Last Year</option>
                  <option value="custom">Custom Range</option>
                </select>
                {timeFilter === 'custom' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                          value={startDate}
                          onChange={(newValue) => setStartDate(newValue)}
                          slotProps={{
                            textField: {
                              size: 'small',
                              placeholder: 'Select start date',
                              sx: {
                                '& .MuiOutlinedInput-root': {
                                  fontSize: '0.875rem',
                                  height: '40px',
                                  borderRadius: '0.5rem',
                                  backgroundColor: 'white',
                                  '& fieldset': {
                                    borderColor: '#d1d5db',
                                    borderWidth: '1px',
                                  },
                                  '&:hover fieldset': {
                                    borderColor: '#05294E',
                                  },
                                  '&.Mui-focused fieldset': {
                                    borderColor: '#05294E',
                                    borderWidth: '2px',
                                    boxShadow: '0 0 0 3px rgba(5, 41, 78, 0.1)',
                                  },
                                },
                                '& .MuiInputLabel-root': {
                                  display: 'none',
                                },
                                '& .MuiOutlinedInput-input': {
                                  padding: '8px 12px',
                                  fontSize: '0.875rem',
                                  color: '#374151',
                                },
                                '& .MuiInputAdornment-root': {
                                  marginLeft: '8px',
                                },
                                '& .MuiIconButton-root': {
                                  padding: '4px',
                                  color: '#6b7280',
                                },
                              }
                            }
                          }}
                        />
                      </LocalizationProvider>
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                          value={endDate}
                          onChange={(newValue) => setEndDate(newValue)}
                          slotProps={{
                            textField: {
                              size: 'small',
                              placeholder: 'Select end date',
                              sx: {
                                '& .MuiOutlinedInput-root': {
                                  fontSize: '0.875rem',
                                  height: '40px',
                                  borderRadius: '0.5rem',
                                  backgroundColor: 'white',
                                  '& fieldset': {
                                    borderColor: '#d1d5db',
                                    borderWidth: '1px',
                                  },
                                  '&:hover fieldset': {
                                    borderColor: '#05294E',
                                  },
                                  '&.Mui-focused fieldset': {
                                    borderColor: '#05294E',
                                    borderWidth: '2px',
                                    boxShadow: '0 0 0 3px rgba(5, 41, 78, 0.1)',
                                  },
                                },
                                '& .MuiInputLabel-root': {
                                  display: 'none',
                                },
                                '& .MuiOutlinedInput-input': {
                                  padding: '8px 12px',
                                  fontSize: '0.875rem',
                                  color: '#374151',
                                },
                                '& .MuiInputAdornment-root': {
                                  marginLeft: '8px',
                                },
                                '& .MuiIconButton-root': {
                                  padding: '4px',
                                  color: '#6b7280',
                                },
                              }
                            }
                          }}
                        />
                      </LocalizationProvider>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Filtro por Admin Affiliate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Affiliate Admin</label>
              <select
                value={affiliateFilter}
                onChange={(e) => setAffiliateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] text-sm"
              >
                <option value="all">All Affiliates</option>
                {affiliates.map((affiliate) => (
                  <option key={affiliate.id} value={affiliate.id}>
                    {affiliate.name || affiliate.email || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scholarship
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Application Flow
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied Date
                </th>
                
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentStudents.map((student) => (
                <tr
                  key={student.application_id || student.student_id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => { window.location.href = `/admin/dashboard/students/${student.student_id}`; }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 relative">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                        {/* Indicador de mensagens não lidas */}
                        {getUnreadCount(student.user_id) > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-white">
                              {getUnreadCount(student.user_id) > 9 ? '9+' : getUnreadCount(student.user_id)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {student.student_name}
                          </div>
                          {student.is_locked && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              <Lock className="h-3 w-3 mr-1" />
                              Selected
                            </span>
                          )}
                          {!student.is_locked && student.total_applications > 1 && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              {student.total_applications} Applications
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.student_email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {student.scholarship_title ? (
                        student.scholarship_title
                      ) : student.total_applications > 0 ? (
                        <span className="text-amber-600">
                          {student.total_applications} Application{student.total_applications > 1 ? 's' : ''} (Pending Payment)
                        </span>
                      ) : (
                        'No Application'
                      )}
                    </div>
                    {student.university_name && (
                      <div className="text-sm text-gray-500 flex items-center">
                        <Building className="h-4 w-4 mr-1" />
                        {student.university_name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <ApplicationFlowSteps student={student} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {student.applied_at 
                        ? new Date(student.applied_at).toLocaleDateString()
                        : `Joined ${new Date(student.student_created_at).toLocaleDateString()}`
                      }
                    </div>
                  </td>
                  
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(startIndex + itemsPerPage, filteredStudents.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredStudents.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === page
                          ? 'z-10 bg-[#05294E] border-[#05294E] text-white'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed View Modal */}
      {/* Modal removido */}
      {false && (
        <div className="hidden">
          <div className="bg-slate-50 rounded-3xl max-w-7xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
            {/* Header Section */}
            <div className="bg-white shadow-sm border-b border-slate-200 rounded-t-3xl sticky top-0 z-10">
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-r from-[#05294E] to-[#0a4a7a] rounded-2xl p-3">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{selectedStudent.student_name}</h3>
                    <p className="text-slate-600">{selectedStudent.student_email}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-slate-500">
                        Registered: {new Date(selectedStudent.student_created_at).toLocaleDateString()}
                      </span>
                      {selectedStudent.seller_referral_code && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-xs font-medium">
                          Ref: {selectedStudent.seller_referral_code}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl p-2 transition-colors"
                  aria-label="Close student details modal"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                  {/* Student Information Card */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                    <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#0a4a7a] px-6 py-4">
                      <h2 className="text-xl font-semibold text-white flex items-center">
                        <User className="w-6 h-6 mr-3" />
                        Student Information
                      </h2>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Contact Details</h3>
                          <div className="space-y-3">
                            <div>
                              <dt className="text-sm font-medium text-slate-600">Full Name</dt>
                              <dd className="text-base font-semibold text-slate-900 mt-1">{selectedStudent.student_name}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-slate-600">Email</dt>
                              <dd className="text-base text-slate-900 mt-1">{selectedStudent.student_email}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-slate-600">Registration Date</dt>
                              <dd className="text-base text-slate-900 mt-1">
                                {new Date(selectedStudent.student_created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </dd>
                            </div>
                            {selectedStudent.seller_referral_code && (
                              <div>
                                <dt className="text-sm font-medium text-slate-600">Referral Code</dt>
                                <dd className="text-base text-slate-900 mt-1 font-mono bg-slate-100 px-2 py-1 rounded">
                                  {selectedStudent.seller_referral_code}
                                </dd>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Application Status</h3>
                          <div className="space-y-3">
                            <div>
                              <dt className="text-sm font-medium text-slate-600">Total Applications</dt>
                              <dd className="text-base font-semibold text-slate-900 mt-1">
                                {selectedStudent.total_applications} application(s)
                              </dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-slate-600">Current Status</dt>
                              <dd className="mt-1">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    selectedStudent.is_locked ? 'bg-green-500' : 
                                    selectedStudent.status === 'approved' ? 'bg-blue-500' :
                                    selectedStudent.status === 'under_review' ? 'bg-yellow-500' :
                                    selectedStudent.total_applications > 0 ? 'bg-orange-500' : 'bg-gray-500'
                                  }`}></div>
                                  <span className={`text-sm font-medium ${
                                    selectedStudent.is_locked ? 'text-green-700' : 
                                    selectedStudent.status === 'approved' ? 'text-blue-700' :
                                    selectedStudent.status === 'under_review' ? 'text-yellow-700' :
                                    selectedStudent.total_applications > 0 ? 'text-orange-700' : 'text-gray-700'
                                  }`}>
                                    {selectedStudent.is_locked ? 'Scholarship Selected' :
                                     selectedStudent.status === 'approved' ? 'Approved - Pending Payment' :
                                     selectedStudent.status === 'under_review' ? 'Under Review' :
                                     selectedStudent.total_applications > 0 ? 'Applications Submitted' : 'No Applications Yet'}
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
                  {selectedStudent.scholarship_title ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                      <div className="bg-gradient-to-r rounded-t-2xl from-slate-700 to-slate-800 px-6 py-4">
                        <h2 className="text-xl font-semibold text-white flex items-center">
                          <Award className="w-6 h-6 mr-3" />
                          Selected Scholarship
                        </h2>
                      </div>
                      <div className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1">
                              <dt className="text-sm font-medium text-slate-600">Scholarship Program</dt>
                              <dd className="text-lg font-semibold text-slate-900">
                                {selectedStudent.scholarship_title}
                              </dd>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1">
                              <dt className="text-sm font-medium text-slate-600">University</dt>
                              <dd className="text-lg font-semibold text-slate-900">
                                {selectedStudent.university_name}
                              </dd>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1">
                              <dt className="text-sm font-medium text-slate-600">Application Status</dt>
                              <dd className="text-base text-slate-700">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  selectedStudent.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  selectedStudent.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
                                  selectedStudent.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {selectedStudent.status ? 
                                    selectedStudent.status.charAt(0).toUpperCase() + selectedStudent.status.slice(1) : 
                                    'Status not available'
                                  }
                                </span>
                              </dd>
                            </div>
                          </div>
                          {selectedStudent.applied_at && (
                            <div className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                              <div className="flex-1">
                                <dt className="text-sm font-medium text-slate-600">Applied Date</dt>
                                <dd className="text-base text-slate-700">
                                  {new Date(selectedStudent.applied_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long', 
                                    day: 'numeric'
                                  })}
                                </dd>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : selectedStudent.total_applications > 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                      <div className="bg-gradient-to-r rounded-t-2xl from-orange-600 to-orange-700 px-6 py-4">
                        <h2 className="text-xl font-semibold text-white flex items-center">
                          <FileText className="w-6 h-6 mr-3" />
                          Multiple Applications ({selectedStudent.total_applications})
                        </h2>
                        <p className="text-orange-100 text-sm mt-1">Student has applied to multiple scholarships</p>
                      </div>
                      <div className="p-6">
                        <div className="space-y-4">
                          {selectedStudent.all_applications.map((app: any, index: number) => (
                            <div key={app.id} className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:bg-slate-100 transition-colors">
                              <div className="flex flex-col md:flex-row items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2 w-full md:w-auto">
                                    <span className="text-xs font-semibold text-slate-600 bg-slate-200 px-2 py-1 rounded">#{index + 1}</span>
                                    <h5 className="font-semibold text-slate-900 text-lg">
                                      {app.scholarships?.title || 'Scholarship Title N/A'}
                                    </h5>
                                  </div>
                                  <p className="text-slate-700 font-medium mb-1">
                                    {app.scholarships?.universities?.name || 'University N/A'}
                                  </p>
                                  <p className="text-sm text-slate-600 mb-3">
                                    Applied: {app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    }) : 'Date N/A'}
                                  </p>
                                  {app.reviewed_at && (
                                    <p className="text-sm text-slate-600 mb-3">
                                      Reviewed: {new Date(app.reviewed_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right space-y-2 w-full md:w-auto">
                                  <div>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                      app.status === 'approved' ? 'bg-green-100 text-green-800' :
                                      app.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
                                      app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {(app.status || 'Pending').charAt(0).toUpperCase() + (app.status || 'pending').slice(1)}
                                    </span>
                                  </div>
                                  {app.status === 'approved' && (
                                    <div className="text-right">
                                      <div className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                                        app.is_application_fee_paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                      }`}>
                                        {app.is_application_fee_paid ? (
                                          <><CheckCircle className="w-3 h-3 mr-1" />Fee Paid</>
                                        ) : (
                                          <><Clock className="w-3 h-3 mr-1" />Payment Pending</>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                          <div className="flex items-start">
                            <AlertCircle className="w-5 h-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-blue-800 text-sm font-medium mb-1">Multiple Applications Policy</p>
                              <p className="text-blue-700 text-sm">
                                Student can apply to multiple scholarships. Once approved and application fee is paid for one scholarship, 
                                the student will be committed to that scholarship and cannot switch to others.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                      <div className="bg-gradient-to-r rounded-t-2xl from-gray-600 to-gray-700 px-6 py-4">
                        <h2 className="text-xl font-semibold text-white flex items-center">
                          <AlertCircle className="w-6 h-6 mr-3" />
                          No Applications Yet
                        </h2>
                      </div>
                      <div className="p-6">
                        <div className="text-center py-8">
                          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-slate-900 mb-2">No Scholarship Applications</h3>
                          <p className="text-slate-600 max-w-md mx-auto">
                            This student has registered but hasn't submitted any scholarship applications yet. 
                            They may still be in the process of selecting a program or preparing their documents.
                          </p>
                          {selectedStudent.has_paid_selection_process_fee && (
                            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Selection Fee Paid - Ready to Apply
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Application Progress Card */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                    <div className="bg-gradient-to-r rounded-t-2xl from-blue-600 to-blue-700 px-6 py-4">
                      <h2 className="text-xl font-semibold text-white flex items-center">
                        <FileText className="w-6 h-6 mr-3" />
                        Application Progress
                      </h2>
                    </div>
                    <div className="p-6">
                      <ApplicationFlowSteps student={selectedStudent} />
                    </div>
                  </div>

                  {/* Payment Status Card */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                    <div className="bg-gradient-to-r rounded-t-2xl from-green-600 to-green-700 px-6 py-4">
                      <h2 className="text-xl font-semibold text-white flex items-center">
                        <CreditCard className="w-6 h-6 mr-3" />
                        Payment Status
                      </h2>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        <div className="bg-slate-50 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <dt className="text-sm font-medium text-slate-600">Selection Process Fee</dt>
                              <dd className="text-sm text-slate-500 mt-1">Required to start applications</dd>
                              <dd className="text-sm font-semibold text-slate-700 mt-1">
                                {(() => {
                                  const hasCustomOverride = hasOverride('selection_process');
                                  if (hasCustomOverride) {
                                    // Com override: usar valor exato do override
                                    return formatFeeAmount(getFeeAmount('selection_process'));
                                  } else {
                                    // Sem override: valor padrão + dependentes
                                    const baseFee = Number(getFeeAmount('selection_process'));
                                    const total = baseFee + (dependents * 150);
                                    return formatFeeAmount(total);
                                  }
                                })()}
                              </dd>
                            </div>
                            <div className="flex items-center space-x-2">
                              {selectedStudent.has_paid_selection_process_fee ? (
                                <>
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                  <span className="text-sm font-medium text-green-600">Paid</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-5 w-5 text-red-600" />
                                  <span className="text-sm font-medium text-red-600">Not Paid</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <dt className="text-sm font-medium text-slate-600">Application Fee</dt>
                              <dd className="text-sm text-slate-500 mt-1">Paid after scholarship approval</dd>
                              {selectedStudent.is_application_fee_paid && (
                                <dd className="text-sm font-semibold text-slate-700 mt-1">{formatFeeAmount(getFeeAmount('application_fee'))}</dd>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              {selectedStudent.is_application_fee_paid ? (
                                <>
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                  <span className="text-sm font-medium text-green-600">Paid</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-5 w-5 text-red-600" />
                                  <span className="text-sm font-medium text-red-600">Not Paid</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <dt className="text-sm font-medium text-slate-600">Scholarship Fee</dt>
                              <dd className="text-sm text-slate-500 mt-1">Paid after application fee</dd>
                              <dd className="text-sm font-semibold text-slate-700 mt-1">{formatFeeAmount(getFeeAmount('scholarship_fee'))}</dd>
                            </div>
                            <div className="flex items-center space-x-2">
                              {selectedStudent.is_scholarship_fee_paid ? (
                                <>
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                  <span className="text-sm font-medium text-green-600">Paid</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-5 w-5 text-red-600" />
                                  <span className="text-sm font-medium text-red-600">Not Paid</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <dt className="text-sm font-medium text-slate-600">I-20 Control Fee</dt>
                              <dd className="text-sm text-slate-500 mt-1">Final step for enrollment</dd>
                              <dd className="text-sm font-semibold text-slate-700 mt-1">{formatFeeAmount(getFeeAmount('i20_control_fee'))}</dd>
                            </div>
                            <div className="flex items-center space-x-2">
                              {selectedStudent.has_paid_i20_control_fee ? (
                                <>
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                  <span className="text-sm font-medium text-green-600">Paid</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-5 w-5 text-red-600" />
                                  <span className="text-sm font-medium text-red-600">Not Paid</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Student Documents Card */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                    <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#0a4a7a] px-6 py-4">
                      <h2 className="text-xl font-semibold text-white flex items-center">
                        <FileText className="w-6 h-6 mr-3" />
                        Student Documents
                      </h2>
                      <p className="text-blue-100 text-sm mt-1">Documents submitted by the student</p>
                    </div>
                    <div className="p-6">
                      {(() => {
                        // Verificar se há aplicações com documentos
                        let hasDocuments = false;
                        let applicationsWithDocs: any[] = [];

                        // Se é uma aplicação única (student está committed)
                        if (selectedStudent.scholarship_title && selectedStudent.all_applications) {
                          const committedApp = selectedStudent.all_applications.find((app: any) => 
                            app.scholarships?.title === selectedStudent.scholarship_title
                          );
                          if (committedApp && committedApp.documents && Array.isArray(committedApp.documents) && committedApp.documents.length > 0) {
                            applicationsWithDocs = [committedApp];
                            hasDocuments = true;
                          }
                        } 
                        // Se tem múltiplas aplicações (não committed ainda)
                        else if (selectedStudent.all_applications && selectedStudent.all_applications.length > 0) {
                          selectedStudent.all_applications.forEach((app: any) => {
                            if (app.documents && Array.isArray(app.documents) && app.documents.length > 0) {
                              applicationsWithDocs.push(app);
                              hasDocuments = true;
                            }
                          });
                        }
                        
                        const documentTypes = [
                          { key: 'passport', label: 'Passport', description: 'Valid passport copy' },
                          { key: 'diploma', label: 'High School Diploma', description: 'Educational certificate' },
                          { key: 'funds_proof', label: 'Proof of Funds', description: 'Bank statement or financial document' },
                          { key: 'transcript', label: 'Academic Transcript', description: 'Official academic records' },
                          { key: 'english_test', label: 'English Test', description: 'TOEFL, IELTS or equivalent' },
                          { key: 'personal_statement', label: 'Personal Statement', description: 'Essay or motivation letter' }
                        ];

                        const getStatusColor = (status: string) => {
                          switch (status.toLowerCase()) {
                            case 'approved': return 'text-green-700 bg-green-100';
                            case 'under_review': return 'text-blue-700 bg-blue-100';
                            case 'pending': return 'text-amber-700 bg-amber-100';
                            case 'changes_requested': return 'text-orange-700 bg-orange-100';
                            case 'rejected': return 'text-red-700 bg-red-100';
                            default: return 'text-slate-700 bg-slate-100';
                          }
                        };

                        const getStatusIcon = (status: string) => {
                          switch (status.toLowerCase()) {
                            case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
                            case 'under_review': return <Clock className="w-4 h-4 text-blue-600" />;
                            case 'pending': return <Clock className="w-4 h-4 text-amber-600" />;
                            case 'changes_requested': return <AlertCircle className="w-4 h-4 text-orange-600" />;
                            case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
                            default: return <FileText className="w-4 h-4 text-slate-500" />;
                          }
                        };

                        if (!hasDocuments) {
                          return (
                            <div className="text-center py-8">
                              <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <FileText className="w-8 h-8 text-slate-400" />
                              </div>
                              <h3 className="text-lg font-medium text-slate-900 mb-2">No Documents Yet</h3>
                              <p className="text-slate-600 text-sm">
                                The student hasn't submitted any documents for their applications.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-4">
                            {applicationsWithDocs.map((app: any, appIndex: number) => {
                              const appKey = app.id || `app-${appIndex}`;
                              const isExpanded = expandedApps[appKey] || false;
                              
                              return (
                                <div key={appKey} className="border border-slate-200 rounded-xl overflow-hidden">
                                  {/* Scholarship Header - Clickable */}
                                  <button
                                    onClick={() => setExpandedApps(prev => ({ ...prev, [appKey]: !isExpanded }))}
                                    className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left flex items-center justify-between"
                                  >
                                    <div>
                                      <h4 className="font-semibold text-slate-900">
                                        {app.scholarships?.title || 'Scholarship Application'}
                                      </h4>
                                      <p className="text-sm text-slate-600">
                                        {app.scholarships?.universities?.name || 'University Name'} • {app.documents.length} documents
                                      </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        app.status === 'approved' ? 'bg-green-100 text-green-800' :
                                        app.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
                                        app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {(app.status || 'Pending').charAt(0).toUpperCase() + (app.status || 'pending').slice(1)}
                                      </span>
                                      <svg 
                                        className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>
                                  </button>

                                  {/* Documents List - Expandable */}
                                  {isExpanded && (
                                    <div className="p-4 bg-white border-t border-slate-200">
                                      <div className="grid gap-3">
                                        {app.documents.map((doc: any, docIndex: number) => {
                                          const docType = documentTypes.find(dt => dt.key === doc.type) || {
                                            key: doc.type,
                                            label: doc.type.charAt(0).toUpperCase() + doc.type.slice(1).replace('_', ' '),
                                            description: 'Document submitted by student'
                                          };

                                          return (
                                            <div 
                                              key={`${app.id}-${doc.type}-${docIndex}`}
                                              className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                                            >
                                              {/* Header com título e status */}
                                              <div className="flex flex-col md:flex-row items-start justify-between gap-2 mb-3">
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center space-x-2 mb-1">
                                                    <h5 className="font-semibold text-slate-900 text-sm">{docType.label}</h5>
                                                    {getStatusIcon(doc.status)}
                                                  </div>
                                                  <p className="text-xs text-slate-600 mb-2 line-clamp-2">{docType.description}</p>
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
                                                  <button
                                                    onClick={() => {
                                                      const baseUrl = 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/student-documents/';
                                                      const fullUrl = doc.url.startsWith('http') ? doc.url : `${baseUrl}${doc.url}`;
                                                      const link = document.createElement('a');
                                                      link.href = fullUrl;
                                                      link.download = `${docType.label}_${selectedStudent.student_name}`;
                                                      document.body.appendChild(link);
                                                      link.click();
                                                      document.body.removeChild(link);
                                                    }}
                                                    className="text-xs text-slate-600 hover:text-slate-800 font-medium flex items-center space-x-1 transition-colors px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50"
                                                  >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span className="hidden md:inline">Download</span>
                                                  </button>
                                                  {isPlatformAdmin && approveableTypes.has(doc.type) && (doc.status || '').toLowerCase() !== 'approved' && (
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
                                                        onClick={() => openRejectModal(app.id, doc.type)}
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
                                              
                                              {/* Status e datas */}
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(doc.status)}`}>
                                                  {doc.status.charAt(0).toUpperCase() + doc.status.slice(1).replace('_', ' ')}
                                                </span>
                                                {doc.uploaded_at && (
                                                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                                    Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                                                  </span>
                                                )}
                                                {doc.approved_at && (
                                                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">
                                                    Approved {new Date(doc.approved_at).toLocaleDateString()}
                                                  </span>
                                                )}
                                                {doc.rejected_at && (
                                                  <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md">
                                                    Rejected {new Date(doc.rejected_at).toLocaleDateString()}
                                                  </span>
                                                )}
                                                {doc.rejection_reason && (
                                                  <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md">
                                                    <span className="font-medium">Reason:</span> {doc.rejection_reason}
                                                  </span>
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
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Timeline Card */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                    <div className="bg-gradient-to-r rounded-t-2xl from-slate-600 to-slate-700 px-6 py-4">
                      <h2 className="text-xl font-semibold text-white flex items-center">
                        <Clock className="w-6 h-6 mr-3" />
                        Timeline
                      </h2>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">Registration</p>
                            <p className="text-sm text-slate-600">
                              {new Date(selectedStudent.student_created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        {selectedStudent.applied_at && (
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <FileText className="w-4 h-4 text-green-600" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900">Application Submitted</p>
                              <p className="text-sm text-slate-600">
                                {new Date(selectedStudent.applied_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedStudent.reviewed_at && (
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <Eye className="w-4 h-4 text-purple-600" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900">Application Reviewed</p>
                              <p className="text-sm text-slate-600">
                                {new Date(selectedStudent.reviewed_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Rejeição de Documento */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Reject Document</h3>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectData(null);
                  setRejectReason('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Document: <span className="font-medium">{rejectData?.docType}</span>
              </p>
              <label htmlFor="rejectReason" className="block text-sm font-medium text-gray-700 mb-2">
                Rejection reason *
              </label>
              <textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejecting this document..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={4}
                required
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectData(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectReason.trim() || (rejectData && rejectingDocs[`${rejectData.applicationId}:${rejectData.docType}`])}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectData && rejectingDocs[`${rejectData.applicationId}:${rejectData.docType}`] ? 'Rejecting...' : 'Reject Document'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de visualização de documentos */}
      {previewUrl && (
        <DocumentViewerModal
          url={previewUrl}
          onClose={() => setPreviewUrl(null)}
        />
      )}
    </div>
  );
};

export default StudentApplicationsView;