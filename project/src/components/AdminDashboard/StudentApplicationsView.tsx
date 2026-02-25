import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  AlertCircle,
  CreditCard,
  Award,
  BookOpen,
  Sparkles,
  LayoutGrid,
  Table
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { useAuth } from '../../hooks/useAuth';
import { useStudentUnreadMessages } from '../../hooks/useStudentUnreadMessages';
import { useGlobalStudentUnread } from '../../hooks/useGlobalStudentUnread';
import { useStudentsQuery, useFilterDataQuery } from './hooks/useStudentApplicationsQueries';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import RefreshButton from '../RefreshButton';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import DocumentViewerModal from '../DocumentViewerModal';
import { toast } from 'react-hot-toast';
import BulkDocumentActionsBar from './BulkDocumentActionsBar';
import StudentApplicationsKanbanView from './StudentApplicationsKanbanView';

export interface StudentRecord {
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
  most_recent_activity?: Date;
}

const StudentApplicationsView: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [expandedApps, setExpandedApps] = useState<{[key: string]: boolean}>({});
  const [dependents, setDependents] = useState<number>(0);
  const [approvingDocs, setApprovingDocs] = useState<{[key: string]: boolean}>({});
  const [pendingZelleByUser, setPendingZelleByUser] = useState<{ [userId: string]: number }>({});
  const [blackCouponUsers, setBlackCouponUsers] = useState<Set<string>>(new Set());
  
  // View mode toggle (table ou kanban) com persistência
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('student_view_mode');
      return (saved === 'table' || saved === 'kanban') ? saved : 'table';
    }
    return 'table';
  });

  // Atualizar localStorage quando mudar o modo de visualização
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('student_view_mode', viewMode);
    }
  }, [viewMode]);
  
  // Estados para geração em massa de documentos
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [isGeneratingDocuments, setIsGeneratingDocuments] = useState(false);

  // React Query Hooks
  const studentsQuery = useStudentsQuery();
  const filterDataQuery = useFilterDataQuery();

  // Extrair dados dos queries
  // Extrair dados dos queries com useMemo para evitar loops de renderização infinitos
  const students = React.useMemo(() => studentsQuery.data || [], [studentsQuery.data]);
  const loading = studentsQuery.isLoading;
  const affiliates = React.useMemo(() => filterDataQuery.data?.affiliates || [], [filterDataQuery.data?.affiliates]);
  const scholarships = React.useMemo(() => filterDataQuery.data?.scholarships || [], [filterDataQuery.data?.scholarships]);
  const universities = React.useMemo(() => filterDataQuery.data?.universities || [], [filterDataQuery.data?.universities]);

  // Função para refresh de todos os dados
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        studentsQuery.refetch(),
        filterDataQuery.refetch(),
      ]);
      // Recarregar dados de cupom BLACK após refresh
      const { data } = await supabase
        .from('promotional_coupon_usage')
        .select('user_id, coupon_code')
        .ilike('coupon_code', 'BLACK');
      
      if (data) {
        const userIds = new Set<string>();
        data.forEach((row: any) => {
          if (row.user_id) {
            userIds.add(row.user_id);
          }
        });
        setBlackCouponUsers(userIds);
      }
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  };

  // Evitar mostrar usuários de teste em produção
  const isProductionHost = typeof window !== 'undefined' && 
    (window.location.hostname === 'matriculausa.com' || window.location.hostname === 'www.matriculausa.com');
  
  // Hook para configurações dinâmicas de taxas
  const { getFeeAmount, formatFeeAmount, hasOverride } = useFeeConfig(selectedStudent?.user_id);

  // Auth e role do usuário atual
  const { user } = useAuth();
  const isPlatformAdmin = user?.role === 'admin';
  
  // Hook para mensagens não lidas por estudante
  const { getUnreadCount } = useStudentUnreadMessages();
  const { getUnreadCount: getGlobalUnreadCount } = useGlobalStudentUnread();

  // Aprovação e rejeição de documentos pelo admin
  const approveableTypes = new Set(['passport', 'funds_proof', 'diploma']);
  const [rejectingDocs, setRejectingDocs] = useState<{[key: string]: boolean}>({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectData, setRejectData] = useState<{applicationId: string, docType: string} | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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

      // Invalidar query de students para refetch automático
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
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
          p_student_id: selectedStudent?.student_id,
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

      // Invalidar query de students para refetch automático
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      
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
  const [onlyPaidSelectionFee, setOnlyPaidSelectionFee] = useState(false);
  const [onlyBlackCouponUsers, setOnlyBlackCouponUsers] = useState(false);
  const [showCurrentStudents, setShowCurrentStudents] = useState(false);
  
  // Dados para os filtros - agora vêm do React Query (filterDataQuery)

  // Chave para localStorage
  const FILTERS_STORAGE_KEY = 'admin_student_filters';
  
  // Lista de bolsas a ocultar por padrão
  const HIDDEN_SCHOLARSHIPS = ['Current Students Scholarship'];

  // Função para salvar filtros no localStorage
  const saveFiltersToStorage = () => {
    const filters = {
      searchTerm,
      statusFilter,
      stageFilter,
      affiliateFilter,
      scholarshipFilter,
      universityFilter,
      timeFilter,
      startDate: startDate?.toISOString() || null,
      endDate: endDate?.toISOString() || null,
      onlyPaidSelectionFee,
      onlyBlackCouponUsers,
      showCurrentStudents,
      currentPage
    };
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  };

  // Função para carregar filtros do localStorage
  const loadFiltersFromStorage = () => {
    try {
      const savedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (savedFilters) {
        const filters = JSON.parse(savedFilters);
        setSearchTerm(filters.searchTerm || '');
        setStatusFilter(filters.statusFilter || 'all');
        setStageFilter(filters.stageFilter || 'all');
        setAffiliateFilter(filters.affiliateFilter || 'all');
        setScholarshipFilter(filters.scholarshipFilter || 'all');
        setUniversityFilter(filters.universityFilter || 'all');
        setTimeFilter(filters.timeFilter || 'all');
        setStartDate(filters.startDate ? dayjs(filters.startDate) : null);
        setEndDate(filters.endDate ? dayjs(filters.endDate) : null);
        setOnlyPaidSelectionFee(filters.onlyPaidSelectionFee || false);
        setOnlyBlackCouponUsers(filters.onlyBlackCouponUsers || false);
        setShowCurrentStudents(filters.showCurrentStudents || false);
        setCurrentPage(filters.currentPage || 1);
      }
    } catch (error) {
      console.error('Error loading filters from localStorage:', error);
    }
  };

  // Função para limpar filtros salvos (opcional)
  const clearSavedFilters = () => {
    localStorage.removeItem(FILTERS_STORAGE_KEY);
    // Resetar todos os filtros para valores padrão
    setSearchTerm('');
    setStatusFilter('all');
    setStageFilter('all');
    setAffiliateFilter('all');
    setScholarshipFilter('all');
    setUniversityFilter('all');
    setTimeFilter('all');
    setStartDate(null);
    setEndDate(null);
    setOnlyPaidSelectionFee(false);
    setOnlyBlackCouponUsers(false);
    setShowCurrentStudents(false);
    setCurrentPage(1);
  };

  useEffect(() => {
    // Carregar filtros salvos primeiro
    loadFiltersFromStorage();
    // fetchStudents e fetchFilterData removidos - agora usando React Query hooks
  }, []);

  // Carregar pagamentos Zelle pendentes para os estudantes listados
  useEffect(() => {
    const loadPendingZelle = async () => {
      try {
        const userIds = (students || []).map(s => s.user_id).filter(Boolean);
        if (!userIds.length) {
          setPendingZelleByUser({});
          return;
        }

        const { data, error } = await supabase
          .from('zelle_payments')
          .select('user_id, status')
          .in('user_id', userIds)
          .eq('status', 'pending_verification');

        if (error) {
          console.error('Error loading pending Zelle payments:', error);
          return;
        }

        const counts: { [userId: string]: number } = {};
        (data || []).forEach((row: any) => {
          const uid = row.user_id;
          counts[uid] = (counts[uid] || 0) + 1;
        });
        setPendingZelleByUser(counts);
      } catch (e) {
        console.error('Unexpected error loading pending Zelle payments:', e);
      }
    };

    loadPendingZelle();
  }, [students]);

  // Carregar estudantes que usaram cupom BLACK
  useEffect(() => {
    const loadBlackCouponUsers = async () => {
      try {
        // Buscar com ilike para ser case-insensitive
        const { data, error } = await supabase
          .from('promotional_coupon_usage')
          .select('user_id, coupon_code')
          .ilike('coupon_code', 'BLACK');

        if (error) {
          console.error('Error loading BLACK coupon users:', error);
          return;
        }


        const userIds = new Set<string>();
        (data || []).forEach((row: any) => {
          if (row.user_id) {
            userIds.add(row.user_id);
          }
        });
        
        setBlackCouponUsers(userIds);
      } catch (e) {
        console.error('Unexpected error loading BLACK coupon users:', e);
      }
    };

    loadBlackCouponUsers();
  }, [students]);

  // Salvar filtros no localStorage sempre que mudarem
  useEffect(() => {
    saveFiltersToStorage();
  }, [
    searchTerm,
    statusFilter,
    stageFilter,
    affiliateFilter,
    scholarshipFilter,
    universityFilter,
    timeFilter,
    startDate,
    endDate,
    onlyPaidSelectionFee,
    onlyBlackCouponUsers,
    showCurrentStudents,
    currentPage
  ]);

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

  // Funções fetchStudents e fetchFilterData removidas - agora usando React Query hooks
  // useStudentsQuery e useFilterDataQuery fazem o trabalho

  // Handlers para seleção em massa de documentos
  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents(new Set());
    } else {
      const ids = currentStudents.map(s => s.student_id);
      setSelectedStudents(new Set(ids));
    }
    setSelectAll(!selectAll);
  };

  const handleClearSelection = () => {
    setSelectedStudents(new Set());
    setSelectAll(false);
  };

  const handleBulkGenerateDocuments = async () => {
    setIsGeneratingDocuments(true);
    
    const selectedRecords = currentStudents.filter(s => 
      selectedStudents.has(s.student_id)
    );
    
    // Extrair apenas os user_ids
    const user_ids = selectedRecords.map(s => s.user_id);
    
    try {
      // Chamar Edge Function para processamento em massa
      const { data, error } = await supabase.functions.invoke(
        'bulk-generate-legal-documents',
        {
          body: {
            user_ids
          }
        }
      );
      
      if (error) {
        console.error('Erro ao gerar documentos em massa:', error);
        toast.error(
          `Erro ao processar documentos: ${error.message}`,
          { duration: 5000 }
        );
        setIsGeneratingDocuments(false);
        return;
      }
      
      // Exibir toast com resumo
      const { success_count, skipped_count, error_count } = data;
      const totalDocs = success_count + skipped_count;
      
      if (error_count > 0) {
        toast.error(
          `Processamento concluído com erros: ${totalDocs} processados (${success_count} gerados, ${skipped_count} pulados, ${error_count} erros)`,
          { duration: 6000 }
        );
      } else {
        toast.success(
          `Documents processed: ${totalDocs} total (${success_count} generated, ${skipped_count} skipped)`,
          { duration: 5000 }
        );
      }
      
    } catch (error: any) {
      console.error('Erro ao chamar Edge Function:', error);
      toast.error(
        `Erro ao processar documentos: ${error.message || 'Erro desconhecido'}`,
        { duration: 5000 }
      );
    } finally {
      setIsGeneratingDocuments(false);
      
      // Limpar seleção
      setSelectedStudents(new Set());
      setSelectAll(false);
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
      case 'i20_fee':
        return student.has_paid_i20_control_fee ? 'completed' : 'pending';
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
      case 'enrollment':
        return student.application_status === 'enrolled' ? 'completed' : 'pending';
      default:
        return 'pending';
    }
  };

  /* 
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
  */

  const filteredStudents = students.filter((student: StudentRecord) => {
    // Excluir estudantes com status enrolled (eles aparecem na aba Completed)
    if (student.application_status === 'enrolled') {
      return false;
    }

    // Ocultar estudantes de Current Students Scholarship por padrão (a menos que o toggle esteja ativo)
    if (!showCurrentStudents && student.scholarship_title && HIDDEN_SCHOLARSHIPS.includes(student.scholarship_title)) {
      return false;
    }

    // Em produção, ocultar usuários de teste com email contendo "uorak"
    if (isProductionHost && (student.student_email || '').toLowerCase().includes('uorak')) {
      return false;
    }
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
    
    // Filtro para mostrar apenas usuários que pagaram a taxa de seleção
    const matchesSelectionFee = !onlyPaidSelectionFee || student.has_paid_selection_process_fee;
    
    // Filtro para mostrar apenas usuários que usaram cupom BLACK
    const matchesBlackCoupon = !onlyBlackCouponUsers || blackCouponUsers.has(student.user_id);
    
    // Debug: verificar se o student.user_id está no Set
    if (onlyBlackCouponUsers && student.user_id) {
      const hasCoupon = blackCouponUsers.has(student.user_id);
      if (!hasCoupon && blackCouponUsers.size > 0) {
        // Log apenas uma vez para não poluir o console
        if (!(window as any).__blackCouponDebugLogged) {
          console.log('[BLACK Coupon Filter] Debug:', {
            student_user_id: student.user_id,
            blackCouponUsers_size: blackCouponUsers.size,
            blackCouponUsers_list: Array.from(blackCouponUsers),
            hasCoupon
          });
          (window as any).__blackCouponDebugLogged = true;
        }
      }
    }
    
    // Filtro por etapa do processo (baseado no Application Flow)
    const matchesStage = stageFilter === 'all' || (() => {
      let result = false;
      switch (stageFilter) {
        case 'selection_fee':
          // Estudantes que pagaram a Selection Process Fee mas ainda não fizeram aplicações
          result = student.has_paid_selection_process_fee && (student.total_applications || 0) === 0;
          break;
        case 'application':
          // Estudantes que fizeram aplicações mas ainda não foram aprovados
          result = (student.total_applications || 0) > 0 && 
                   student.status !== 'approved' && 
                   student.status !== 'enrolled' && 
                   !student.is_application_fee_paid;
          break;
        case 'review':
          // Estudantes com aplicações aprovadas mas ainda não pagaram application fee
          result = student.status === 'approved' && !student.is_application_fee_paid;
          break;
        case 'app_fee':
          // Application fee paga mas ainda não pagaram scholarship fee
          result = student.is_application_fee_paid && !student.is_scholarship_fee_paid;
          break;
        case 'scholarship_fee':
          // Scholarship fee paga mas ainda não pagaram I-20 fee
          result = student.is_scholarship_fee_paid && !student.has_paid_i20_control_fee;
          break;
        case 'i20_fee':
          // I-20 Control Fee paga mas ainda não tem acceptance letter
          result = student.has_paid_i20_control_fee && !student.acceptance_letter_status;
          break;
        case 'acceptance':
          // Carta de aceitação enviada/assinada/aprovada mas ainda não matriculado
          result = !!student.acceptance_letter_status && 
                   (student.acceptance_letter_status === 'sent' || 
                    student.acceptance_letter_status === 'signed' || 
                    student.acceptance_letter_status === 'approved') &&
                   student.status !== 'enrolled';
          break;
        case 'enrollment':
          // Matriculado
          result = student.status === 'enrolled';
          break;
        default:
          result = true;
      }
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
      if (!student.seller_referral_code) {
        // Se não tem referral code, só aparece se filtro for "all"
        return affiliateFilter === 'all';
      }
      
      // Buscar o affiliate admin pelo referral code do estudante
      // Primeiro tenta pelo referral_code direto do affiliate
      let affiliate = affiliates.find(aff => aff.referral_code === student.seller_referral_code);
      
      if (!affiliate) {
        // Se não encontrar, busca pelos sellers do affiliate
        affiliate = affiliates.find(aff => 
          aff.sellers?.some((seller: any) => seller.referral_code === student.seller_referral_code)
        );
      }
      
      return affiliate && affiliate.id === affiliateFilter;
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
    
    const finalResult = matchesSearch && matchesStatus && matchesSelectionFee && matchesBlackCoupon && matchesStage && matchesScholarship && matchesUniversity && matchesAffiliate && matchesTime;
    
    return finalResult;
  });
  

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  const ApplicationFlowSteps = ({ student }: { student: StudentRecord }) => {
    const allSteps = [
      { key: 'selection_fee', label: 'Selection Fee', icon: CreditCard, shortLabel: 'Selection Fee' },
      { key: 'apply', label: 'Application', icon: FileText, shortLabel: 'Application' },
      { key: 'review', label: 'Review', icon: Eye, shortLabel: 'Review' },
      { key: 'application_fee', label: 'App Fee', icon: DollarSign, shortLabel: 'App Fee' },
      { key: 'scholarship_fee', label: 'Scholarship Fee', icon: Award, shortLabel: 'Scholarship Fee' },
      { key: 'i20_fee', label: 'I-20 Fee', icon: CreditCard, shortLabel: 'I-20 Fee' },
      { key: 'acceptance_letter', label: 'Acceptance', icon: BookOpen, shortLabel: 'Acceptance' },
      { key: 'transfer_form', label: 'Transfer Form', icon: FileText, shortLabel: 'Transfer Form' },
      { key: 'enrollment', label: 'Enrollment', icon: GraduationCap, shortLabel: 'Enrollment' }
    ];

    // Filtrar steps baseado no student_process_type
    const steps = allSteps.filter(step => {
      if (step.key === 'transfer_form') {
        return student?.student_process_type === 'transfer';
      }
      return true;
    });

    // Calcular progresso geral
    const completedSteps = steps.filter(step => getStepStatus(student, step.key) === 'completed').length;
    const totalSteps = steps.length;
    const progressPercentage = (completedSteps / totalSteps) * 100;

    // Encontrar a etapa atual
    const currentStepIndex = steps.findIndex(step => {
      const status = getStepStatus(student, step.key);
      return status === 'in_progress' || status === 'pending';
    });
    const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : steps[steps.length - 1];

    return (
      <div className="flex items-center space-x-3">
        {/* Progresso Circular */}
        <div className="relative w-8 h-8 flex-shrink-0">
          <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
            {/* Background circle */}
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 14}`}
              strokeDashoffset={`${2 * Math.PI * 14 * (1 - progressPercentage / 100)}`}
              className={`transition-all duration-300 ${
                progressPercentage === 100 ? 'text-green-500' : 
                progressPercentage >= 50 ? 'text-blue-500' : 
                'text-yellow-500'
              }`}
            />
          </svg>
          {/* Ícone da etapa atual no centro */}
          <div className="absolute inset-0 flex items-center justify-center">
            {React.createElement(currentStep.icon, { 
              className: `h-3 w-3 ${
                progressPercentage === 100 ? 'text-green-600' : 
                progressPercentage >= 50 ? 'text-blue-600' : 
                'text-yellow-600'
              }` 
            })}
          </div>
        </div>

        {/* Informações compactas */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {currentStep.shortLabel}
            </span>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {completedSteps}/{totalSteps}
            </span>
          </div>
          <div className="flex items-center space-x-1 mt-1">
            {steps.slice(0, 8).map((step, index) => {
              const status = getStepStatus(student, step.key);
              return (
                <div
                  key={step.key}
                  className={`w-2 h-2 rounded-full ${
                    status === 'completed' ? 'bg-green-500' :
                    status === 'in_progress' ? 'bg-blue-500' :
                    status === 'rejected' ? 'bg-red-500' :
                    'bg-gray-300'
                  }`}
                  title={`${step.label}: ${status}`}
                />
              );
            })}
            {steps.length > 8 && (
              <span className="text-xs text-gray-400 ml-1">+{steps.length - 8}</span>
            )}
          </div>
        </div>

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
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Table className="w-4 h-4" />
              Table
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Kanban
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {filteredStudents.length} students found
            </span>
            <RefreshButton
              onClick={handleRefresh}
              isRefreshing={isRefreshing}
              title="Refresh student data"
            />
          </div>
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
                          onChange={(newValue) => setStartDate(newValue as dayjs.Dayjs | null)}
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
                          onChange={(newValue) => setEndDate(newValue as dayjs.Dayjs | null)}
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
          
          {/* Checkboxes para filtros e botão para limpar filtros */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="onlyPaidSelectionFee"
                  checked={onlyPaidSelectionFee}
                  onChange={(e) => setOnlyPaidSelectionFee(e.target.checked)}
                  className="h-4 w-4 text-[#05294E] focus:ring-[#05294E] border-gray-300 rounded"
                />
                <label htmlFor="onlyPaidSelectionFee" className="text-sm font-medium text-gray-700">
                  Show only students who paid Selection Process Fee
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="onlyBlackCouponUsers"
                  checked={onlyBlackCouponUsers}
                  onChange={(e) => setOnlyBlackCouponUsers(e.target.checked)}
                  className="h-4 w-4 text-[#05294E] focus:ring-[#05294E] border-gray-300 rounded"
                />
                <label htmlFor="onlyBlackCouponUsers" className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span>Show only students who used BLACK coupon</span>
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showCurrentStudents"
                  checked={showCurrentStudents}
                  onChange={(e) => setShowCurrentStudents(e.target.checked)}
                  className="h-4 w-4 text-[#05294E] focus:ring-[#05294E] border-gray-300 rounded"
                />
                <label htmlFor="showCurrentStudents" className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                  <span>Show Current Students Scholarship</span>
                </label>
              </div>
            </div>
            <button
              onClick={clearSavedFilters}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
              title="Clear all filters and reset to default"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar - aparece quando há estudantes selecionados */}
      {selectedStudents.size > 0 && (
        <BulkDocumentActionsBar
          selectedCount={selectedStudents.size}
          onGenerateDocuments={handleBulkGenerateDocuments}
          onClearSelection={handleClearSelection}
          isGenerating={isGeneratingDocuments}
        />
      )}

      {/* Conditional Rendering: Table View or Kanban View */}
      {viewMode === 'kanban' ? (
        <StudentApplicationsKanbanView students={filteredStudents} />
      ) : (
      /* Applications List - Table View */
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
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
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(student.student_id)}
                      onChange={() => handleSelectStudent(student.student_id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 relative">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                        {/* Indicador de mensagens não lidas */}
                        {(getUnreadCount(student.user_id) > 0 || getGlobalUnreadCount(student.user_id) > 0) && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-white">
                              {(() => {
                                const v = Math.max(getUnreadCount(student.user_id), getGlobalUnreadCount(student.user_id));
                                return v > 9 ? '9+' : v;
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {student.student_name}
                          </div>
                          {blackCouponUsers.has(student.user_id) && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md" title="Student used BLACK promotional coupon">
                              <Sparkles className="h-3 w-3 mr-1" />
                              BLACK
                            </span>
                          )}
                          {pendingZelleByUser[student.user_id] > 0 && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800" title="Zelle payment awaiting admin approval">
                              Zelle pending approval
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {(() => {
                        if (!student.most_recent_activity) {
                          return new Date(student.student_created_at).toLocaleDateString();
                        }
                        const now = new Date();
                        const activityDate = new Date(student.most_recent_activity);
                        const hoursDiff = (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60);
                        
                        if (hoursDiff < 1) {
                          return 'Just now';
                        } else if (hoursDiff < 24) {
                          return `${Math.floor(hoursDiff)}h ago`;
                        } else if (hoursDiff < 168) { // 7 days
                          return `${Math.floor(hoursDiff / 24)}d ago`;
                        } else {
                          return activityDate.toLocaleDateString();
                        }
                      })()}
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
      )}

      {/* Detailed View Modal - Removido por estar desativado e causando erros de lint */}
      {selectedStudent && false && (
        <div className="hidden" />
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
                disabled={!rejectReason.trim() || !!(rejectData && rejectingDocs[`${rejectData.applicationId}:${rejectData.docType}`])}
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
          documentUrl={previewUrl}
          onClose={() => setPreviewUrl(null)}
        />
      )}
    </div>
  );
};

export default StudentApplicationsView;