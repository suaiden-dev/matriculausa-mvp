import React, { useState } from 'react';
import { 
  GraduationCap, 
  Search, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Mail, 
  ChevronLeft, 
  ChevronRight,
  Filter as FilterIcon,
  TrendingUp,
  TrendingDown,
  Building,
  Award,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SellerI20DeadlineTimer from '../../components/SellerI20DeadlineTimer';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { useState as useStateReact, useEffect } from 'react';

interface Student {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  country?: string;
  created_at: string;
  status: string;
  latest_activity: string;
  fees_count?: number;
  scholarship_title?: string;
  university_name?: string;
  university_id?: string;
  
  // Campos específicos da aplicação (para múltiplas aplicações)
  application_id?: string;
  
  // Flags de pagamento (agora obrigatórios para cálculos corretos)
  has_paid_selection_process_fee: boolean;
  has_paid_i20_control_fee: boolean;
  is_scholarship_fee_paid: boolean;
  is_application_fee_paid: boolean;
  
  // Para o deadline do I-20 (agora com tipos mais precisos)
  scholarship_fee_paid_date: string | null;
  i20_deadline: string | null; // Data ISO string
  
  // Campos da carta de aceite
  acceptance_letter_sent_at: string | null;
  acceptance_letter_status: string | null;
}

interface University {
  id: string;
  name: string;
  logo_url?: string;
  location?: string;
}

interface FilterState {
  searchTerm: string;
  universityFilter: string;
  dateRange: {
    start: string;
    end: string;
  };
  statusFilter: string;
  paymentFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface MyStudentsProps {
  students: Student[];
  onRefresh: () => void;
  onViewStudent: (studentId: {id: string, profile_id: string}) => void;
}

const MyStudents: React.FC<MyStudentsProps> = ({ students, onRefresh, onViewStudent }) => {
  const { getFeeAmount } = useFeeConfig(); // Usar sem parâmetro para valores padrão, será usado para overrides específicos por estudante
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [universities, setUniversities] = useState<University[]>([]);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  
  // Estado para armazenar as taxas do pacote de cada estudante
  const [studentPackageFees, setStudentPackageFees] = useStateReact<{[key: string]: any}>({});
  // Estado para dependentes por estudante
  const [studentDependents, setStudentDependents] = useStateReact<{[key: string]: number}>({});
  // Estado para armazenar overrides de taxas por estudante
  const [studentFeeOverrides, setStudentFeeOverrides] = useStateReact<{[key: string]: any}>({});
  // Estado para controlar requisições em andamento
  const [loadingRequests, setLoadingRequests] = useStateReact<Set<string>>(new Set());
  // Flag para desabilitar user_fee_overrides se não estiver disponível
  const [userFeeOverridesDisabled, setUserFeeOverridesDisabled] = useStateReact<boolean>(() => {
    try {
      return localStorage.getItem('user_fee_overrides_disabled') === 'true';
    } catch {
      return false;
    }
  });
  
  // Função para buscar taxas do pacote de um estudante
  const loadStudentPackageFees = async (studentUserId: string) => {
    if (!studentUserId || studentPackageFees[studentUserId] !== undefined) return;
    
    // Verificar se já está carregando
    const requestKey = `package_${studentUserId}`;
    if (loadingRequests.has(requestKey)) return;
    
    // Marcar como carregando
    setLoadingRequests(prev => new Set([...prev, requestKey]));
    
    try {
      const { data: packageFees, error } = await supabase.rpc('get_user_package_fees', {
        user_id_param: studentUserId
      });
      
      if (error) {
        console.error('❌ [MY_STUDENTS] Erro ao buscar taxas do pacote:', error);
        return;
      }
      
      if (packageFees && packageFees.length > 0) {
        setStudentPackageFees(prev => ({
          ...prev,
          [studentUserId]: packageFees[0]
        }));
      } else {
        setStudentPackageFees(prev => ({
          ...prev,
          [studentUserId]: null
        }));
      }
    } catch (error) {
      console.error('❌ [MY_STUDENTS] Erro ao buscar taxas do pacote:', error);
    } finally {
      // Remover da lista de carregando
      setLoadingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestKey);
        return newSet;
      });
    }
  };

  // Buscar dependents do perfil do estudante
  const loadStudentDependents = async (studentUserId: string) => {
    if (!studentUserId || studentDependents[studentUserId] !== undefined) return;
    
    // Verificar se já está carregando
    const requestKey = `dependents_${studentUserId}`;
    if (loadingRequests.has(requestKey)) return;
    
    // Marcar como carregando
    setLoadingRequests(prev => new Set([...prev, requestKey]));
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('dependents')
        .eq('user_id', studentUserId)
        .single();
      if (!error && data) {
        setStudentDependents(prev => ({ ...prev, [studentUserId]: Number(data.dependents || 0) }));
      } else {
        setStudentDependents(prev => ({ ...prev, [studentUserId]: 0 }));
      }
    } catch {
      setStudentDependents(prev => ({ ...prev, [studentUserId]: 0 }));
    } finally {
      // Remover da lista de carregando
      setLoadingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestKey);
        return newSet;
      });
    }
  };

  // Buscar overrides de taxas para um estudante específico
  const loadStudentFeeOverrides = async (studentUserId: string) => {
    if (!studentUserId || studentFeeOverrides[studentUserId] !== undefined) return;
    
    // Se a tabela foi desabilitada por erro anterior, não fazer requisição
    if (userFeeOverridesDisabled) {
      setStudentFeeOverrides(prev => ({ ...prev, [studentUserId]: null }));
      return;
    }
    
    // Verificar se já está carregando
    const requestKey = `overrides_${studentUserId}`;
    if (loadingRequests.has(requestKey)) return;
    
    // Marcar como carregando
    setLoadingRequests(prev => new Set([...prev, requestKey]));
    
    try {
      const { data: overrides, error } = await supabase
        .from('user_fee_overrides')
        .select('*')
        .eq('user_id', studentUserId)
        .single();
      
      if (!error && overrides) {
        setStudentFeeOverrides(prev => ({ ...prev, [studentUserId]: overrides }));
      } else {
        // Se erro 406 ou similar, desabilitar futuras chamadas
        if (error?.code === 'PGRST116' || error?.message?.includes('406') || error?.message?.includes('Not Acceptable')) {
          console.warn('⚠️ [MY_STUDENTS] Tabela user_fee_overrides não disponível. Desabilitando futuras chamadas.');
          setUserFeeOverridesDisabled(true);
          try {
            localStorage.setItem('user_fee_overrides_disabled', 'true');
          } catch {}
        }
        setStudentFeeOverrides(prev => ({ ...prev, [studentUserId]: null }));
      }
    } catch (error) {
      console.warn('⚠️ [MY_STUDENTS] Erro na tabela user_fee_overrides. Desabilitando:', error);
      setUserFeeOverridesDisabled(true);
      try {
        localStorage.setItem('user_fee_overrides_disabled', 'true');
      } catch {}
      setStudentFeeOverrides(prev => ({ ...prev, [studentUserId]: null }));
    } finally {
      // Remover da lista de carregando
      setLoadingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestKey);
        return newSet;
      });
    }
  };
  
  // Carregar taxas do pacote quando os estudantes mudarem
  useEffect(() => {
    // Debounce para evitar chamadas muito frequentes
    const timeoutId = setTimeout(() => {
      // Obter IDs únicos para evitar chamadas duplicadas
      const uniqueStudentIds = Array.from(new Set(students.map(s => s.id).filter(Boolean)));
      
      console.log('🔍 [MY_STUDENTS] Carregando dados para estudantes únicos:', uniqueStudentIds.length);
      
      if (userFeeOverridesDisabled) {
        console.log('ℹ️ [MY_STUDENTS] user_fee_overrides desabilitado - usando valores padrão');
      }
      
      uniqueStudentIds.forEach(studentId => {
        if (studentPackageFees[studentId] === undefined) {
          loadStudentPackageFees(studentId);
        }
        if (studentDependents[studentId] === undefined) {
          loadStudentDependents(studentId);
        }
        if (studentFeeOverrides[studentId] === undefined) {
          if (userFeeOverridesDisabled) {
            // Se desabilitado, definir como null diretamente
            setStudentFeeOverrides(prev => ({ ...prev, [studentId]: null }));
          } else {
            loadStudentFeeOverrides(studentId);
          }
        }
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [students, userFeeOverridesDisabled]);
  
  // Estado dos filtros
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    universityFilter: 'all',
    dateRange: {
      start: '',
      end: ''
    },
    statusFilter: 'all',
    paymentFilter: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Carregar universidades
  React.useEffect(() => {
    const loadUniversities = async () => {
      try {
        const { data: universitiesData, error: universitiesError } = await supabase
          .from('universities')
          .select('id, name, logo_url, location')
          .eq('is_approved', true)
          .order('name');

        if (!universitiesError && universitiesData) {
          setUniversities(universitiesData);
        }
      } catch (error) {
        console.warn('Could not load universities:', error);
      }
    };

    loadUniversities();
  }, []);

  // Universidades únicas dos estudantes (fallback)
  const studentUniversities = React.useMemo(() => {
    const uniqueUniversities = new Map<string, University>();
    students.forEach(student => {
      if (student.university_id && student.university_name) {
        uniqueUniversities.set(student.university_id, {
          id: student.university_id,
          name: student.university_name
        });
      }
    });
    return Array.from(uniqueUniversities.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  // Usar universidades carregadas da tabela, com fallback para as dos estudantes
  const availableUniversities = universities.length > 0 ? universities : studentUniversities;
  
  // Pagination constants
  const STUDENTS_PER_PAGE = 10;

  // Função para agrupar estudantes por ID (para dropdown de aplicações múltiplas)
  const getGroupedStudentsForDisplay = React.useCallback(() => {
    // Primeiro aplicar filtros normais
    let filtered = students.filter(student => {
      // Filtro por termo de busca
      if (filters.searchTerm && 
          !student.full_name?.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
          !student.email?.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filtro por universidade
      if (filters.universityFilter !== 'all' && student.university_id !== filters.universityFilter) {
        return false;
      }
      
      // Filtro por período
      if (filters.dateRange.start || filters.dateRange.end) {
        const studentDate = new Date(student.created_at);
        const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
        const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;
        
        if (startDate && studentDate < startDate) return false;
        if (endDate && studentDate > endDate) return false;
      }
      
      // Filtro por status
      if (filters.statusFilter !== 'all' && student.status !== filters.statusFilter) {
        return false;
      }
      
      // Filtro por pagamento
      if (filters.paymentFilter !== 'all') {
        switch (filters.paymentFilter) {
          case 'paid':
            if (calculateStudentTotalPaid(student) <= 0) return false;
            break;
          case 'unpaid':
            if (calculateStudentTotalPaid(student) > 0) return false;
            break;
          case 'high_value':
            if (calculateStudentTotalPaid(student) < 1000) return false; // $1000+
            break;
        }
      }
      
      return true;
    });
    
    // Agrupar por estudante
    const groupedByStudent = new Map<string, any[]>();
    filtered.forEach(student => {
      const studentId = student.id;
      if (!groupedByStudent.has(studentId)) {
        groupedByStudent.set(studentId, []);
      }
      groupedByStudent.get(studentId)!.push(student);
    });
    
    // Converter para array para exibição
    const displayStudents: any[] = [];
    groupedByStudent.forEach((applications) => {
      if (applications.length === 1) {
        // Estudante com apenas uma aplicação
        displayStudents.push({ ...applications[0], hasMultipleApplications: false });
      } else {
        // Estudante com múltiplas aplicações - criar entrada agrupada
        const mainStudent = { ...applications[0] };
        mainStudent.hasMultipleApplications = true;
        mainStudent.allApplications = applications;
        mainStudent.applicationCount = applications.length;
        displayStudents.push(mainStudent);
      }
    });
    
    return displayStudents;
  }, [students, filters]);

  // Aplicar ordenação aos dados agrupados
  const getFilteredAndSortedStudents = React.useCallback(() => {
    const groupedStudents = getGroupedStudentsForDisplay();
    let filtered = [...groupedStudents]; // Filtros já foram aplicados

    // Aplicar ordenação
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (filters.sortBy) {
          case 'revenue':
          aValue = calculateStudentTotalPaid(a);
          bValue = calculateStudentTotalPaid(b);
          break;
        case 'name':
          aValue = a.full_name || '';
          bValue = b.full_name || '';
          break;
        case 'date':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [students, filters]);

  const filteredStudents = getFilteredAndSortedStudents();

  // Pagination calculations
  const totalStudents = filteredStudents.length;
  const totalPages = Math.ceil(totalStudents / STUDENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE;
  const endIndex = startIndex + STUDENTS_PER_PAGE;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Resetar filtros
  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      universityFilter: 'all',
      dateRange: { start: '', end: '' },
      statusFilter: 'all',
      paymentFilter: 'all',
      sortBy: 'date',
      sortOrder: 'desc'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  // Função para determinar quais taxas estão faltando para um aluno
  const getMissingFees = (student: Student) => {
    const missingFees = [];
    const deps = studentDependents[student.id] || 0;
    const overrides = studentFeeOverrides[student.id];
    
    // Verificar Selection Process Fee (primeira taxa a ser paga)
    if (!student.has_paid_selection_process_fee) {
      const baseSelectionFee = getStudentFeeAmount(student.id, 'selection_process');
      // Se há override, usar valor do override (já inclui dependentes), senão calcular normalmente
      const selectionProcessFee = (overrides && overrides.selection_process_fee !== undefined && overrides.selection_process_fee !== null) 
        ? baseSelectionFee 
        : baseSelectionFee + (deps * 150);
      missingFees.push({ name: 'Selection Process', amount: selectionProcessFee, color: 'red' });
      return missingFees; // Se não pagou essa, não mostra as outras
    }
    
    // Após Selection Process pago, listar todas as pendências restantes (Application, Scholarship, I-20)
    if (!student.is_application_fee_paid) {
      const applicationFee = getStudentFeeAmount(student.id, 'application_fee');
      missingFees.push({ name: 'Application', amount: applicationFee, color: 'gray' });
    }

    if (!student.is_scholarship_fee_paid) {
      const scholarshipFee = getStudentFeeAmount(student.id, 'scholarship_fee');
      missingFees.push({ name: 'Scholarship', amount: scholarshipFee, color: 'blue' });
    }
    
    // I-20 Control Fee
    if (!student.has_paid_i20_control_fee) {
      const i20ControlFee = getStudentFeeAmount(student.id, 'i20_control_fee');
      missingFees.push({ name: 'I20 Control', amount: i20ControlFee, color: 'orange' });
    }
    
    return missingFees;
  };

  // Função para calcular deadline do I-20
  const calculateI20Deadline = (student: Student): Date | null => {
    // Se o I-20 já foi pago, não há deadline
    if (student.has_paid_i20_control_fee) {
      return null;
    }

    // Se a carta de aceite foi enviada, devemos mostrar o deadline
    if (student.acceptance_letter_sent_at && (student.acceptance_letter_status === 'sent' || student.acceptance_letter_status === 'approved')) {
      // Primeiro tenta usar o deadline específico do I-20
      if (student.i20_deadline) {
        return new Date(student.i20_deadline);
      }

      // Se não tiver deadline específico, usa a data de envio da carta de aceite + 10 dias
      const acceptanceDate = new Date(student.acceptance_letter_sent_at);
      return new Date(acceptanceDate.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 dias
    }

    return null;
  };



  // Função auxiliar para obter valor da taxa com override
  const getStudentFeeAmount = (studentId: string, feeType: string): number => {
    const overrides = studentFeeOverrides[studentId];
    const packageFees = studentPackageFees[studentId];
    
    // Primeiro, verificar se há override (mapear nomes corretos)
    if (overrides) {
      switch (feeType) {
        case 'selection_process':
          if (overrides.selection_process_fee !== undefined && overrides.selection_process_fee !== null) {
            return Number(overrides.selection_process_fee);
          }
          break;
        case 'application_fee':
          if (overrides.application_fee !== undefined && overrides.application_fee !== null) {
            return Number(overrides.application_fee);
          }
          break;
        case 'scholarship_fee':
          if (overrides.scholarship_fee !== undefined && overrides.scholarship_fee !== null) {
            return Number(overrides.scholarship_fee);
          }
          break;
        case 'i20_control_fee':
          if (overrides.i20_control_fee !== undefined && overrides.i20_control_fee !== null) {
            return Number(overrides.i20_control_fee);
          }
          break;
      }
    }
    
    // Segundo, verificar se há taxa personalizada do pacote
    // Mapear feeType para nome correto do campo no banco para packageFees também
    const fieldMapping: {[key: string]: string} = {
      'selection_process': 'selection_process_fee',
      'application_fee': 'application_fee',
      'scholarship_fee': 'scholarship_fee',
      'i20_control_fee': 'i20_control_fee'
    };
    const dbFieldName = fieldMapping[feeType] || feeType;
    if (packageFees && packageFees[dbFieldName]) {
      return Number(packageFees[dbFieldName]);
    }
    
    // Por último, usar taxa padrão
    return getFeeAmount(feeType);
  };

  // Estatísticas calculadas dinamicamente
  // Função para calcular o total pago por um aluno
  const calculateStudentTotalPaid = (student: Student): number => {
    let total = 0;
    const deps = studentDependents[student.id] || 0;
    const overrides = studentFeeOverrides[student.id];

    if (student.has_paid_selection_process_fee) {
      // Para Selection Process, verificar se há override primeiro
      if (overrides && overrides.selection_process_fee !== undefined && overrides.selection_process_fee !== null) {
        // Se há override, usar apenas o valor do override (já inclui dependentes)
        total += overrides.selection_process_fee;
      } else {
        // Sem override: usar taxa padrão + dependentes
        const baseSelectionFee = getFeeAmount('selection_process');
        total += baseSelectionFee + (deps * 150);
      }
    }
    
    if (student.has_paid_i20_control_fee) {
      const baseI20Fee = getStudentFeeAmount(student.id, 'i20_control_fee');
      total += baseI20Fee; // I-20 nunca tem dependentes
    }
    
    if (student.is_scholarship_fee_paid) {
      const scholarshipFee = getStudentFeeAmount(student.id, 'scholarship_fee');
      total += scholarshipFee;
    }
    
    // Application fee não é contabilizada na receita do seller (é exclusiva da universidade)

    return total;
  };

  const stats = React.useMemo(() => {
    const totalRevenue = filteredStudents.reduce((sum, student) => sum + calculateStudentTotalPaid(student), 0);
    
    // Contar estudantes únicos para as estatísticas
    const uniqueStudentIds = new Set(filteredStudents.map(s => s.id));
    const uniqueActiveStudentIds = new Set(
      filteredStudents
        .filter(s => s.status === 'active' || s.status === 'registered' || s.status === 'enrolled')
        .map(s => s.id)
    );
    
    const activeStudents = uniqueActiveStudentIds.size;
    const avgRevenuePerStudent = uniqueStudentIds.size > 0 ? totalRevenue / uniqueStudentIds.size : 0;
    const topPerformingUniversity = availableUniversities.length > 0 ? availableUniversities[0]?.name : 'N/A';

    return {
      totalRevenue,
      activeStudents,
      avgRevenuePerStudent,
      topPerformingUniversity,
      totalUniqueStudents: uniqueStudentIds.size
    };
  }, [filteredStudents, availableUniversities]);

  return (
    <div className="min-h-screen">
      {/* Header + Tabs Section */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="max-w-full mx-auto bg-slate-50">
            {/* Header: title + note + counter */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  My Students
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600">
                  Track and manage the students you have successfully referred.
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  Monitor their progress, payment status, and application journey.
                </p>
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="border-t border-slate-200 bg-white">
              <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Student Management
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Comprehensive tracking and management of your referred students
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={onRefresh}
                      className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-4 h-4 mr-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Students</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.totalUniqueStudents}</p>
              {filteredStudents.length > stats.totalUniqueStudents && (
                <p className="text-xs text-slate-500 mt-1">{filteredStudents.length} applications total</p>
              )}
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Students</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{stats.activeStudents}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Revenue</p>
              {/* Skeleton enquanto dependents/fees não carregaram completamente */}
              {Object.keys(studentDependents).length === 0 && Object.keys(studentPackageFees).length === 0 ? (
                <div className="h-8 w-40 bg-slate-200 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(stats.totalRevenue)}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Avg. Revenue/Student</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{formatCurrency(stats.avgRevenuePerStudent)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 flex items-center gap-2 ${
                showAdvancedFilters 
                  ? 'bg-[#05294E] text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FilterIcon className="h-4 w-4" />
              Advanced
            </button>
          </div>
        </div>

        {/* Filtros Avançados Expandidos */}
        {showAdvancedFilters && (
          <div className="border-t border-slate-200 pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtro por Universidade */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">University</label>
                <select
                  value={filters.universityFilter}
                  onChange={(e) => setFilters(prev => ({ ...prev, universityFilter: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                >
                  <option value="all">All Universities</option>
                  {availableUniversities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Período - Data Inicial */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                />
              </div>

              {/* Filtro por Período - Data Final */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                />
              </div>

              {/* Filtro por Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  value={filters.statusFilter}
                  onChange={(e) => setFilters(prev => ({ ...prev, statusFilter: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="registered">Registered</option>
                  <option value="enrolled">Enrolled</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="dropped">Dropped</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Segunda linha de filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro por Pagamento */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Status</label>
                <select
                  value={filters.paymentFilter}
                  onChange={(e) => setFilters(prev => ({ ...prev, paymentFilter: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                >
                  <option value="all">All Payments</option>
                  <option value="paid">Has Paid</option>
                  <option value="unpaid">No Payments</option>
                  <option value="high_value">High Value ($1000+)</option>
                </select>
              </div>

              {/* Ordenação */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                >
                  <option value="date">Registration Date</option>
                  <option value="revenue">Revenue</option>
                  <option value="name">Name</option>
                  <option value="status">Status</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Order</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, sortOrder: 'desc' }))}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                      filters.sortOrder === 'desc' 
                        ? 'bg-[#05294E] text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <TrendingDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, sortOrder: 'asc' }))}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                      filters.sortOrder === 'asc' 
                        ? 'bg-[#05294E] text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <TrendingUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Botão de reset */}
            <div className="flex justify-start">
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center text-sm text-slate-600">
            <span className="font-medium">{filteredStudents.length}</span>
            <span className="ml-1">application{filteredStudents.length !== 1 ? 's' : ''} found</span>
            {filteredStudents.length !== stats.totalUniqueStudents && (
              <span className="ml-2 text-slate-500">
                ({stats.totalUniqueStudents} unique student{stats.totalUniqueStudents !== 1 ? 's' : ''})
              </span>
            )}
            {showAdvancedFilters && (
              <span className="ml-4 text-slate-500">
                • Sorted by {filters.sortBy === 'revenue' ? 'revenue' : 
                  filters.sortBy === 'name' ? 'name' : 
                  filters.sortBy === 'status' ? 'status' : 'registration date'}
              </span>
            )}
          </div>
          {totalPages > 1 && (
            <div className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </div>
          )}
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {paginatedStudents.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {paginatedStudents.map((student, index) => (
              <div 
                key={`${student.id}-${student.application_id || 'no-app'}-${index}`}
                className="p-6 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => {
                  if (student.hasMultipleApplications) {
                    // Se tem múltiplas aplicações, expandir dropdown
                    setExpandedStudents(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(student.id)) {
                        newSet.delete(student.id);
                      } else {
                        newSet.add(student.id);
                      }
                      return newSet;
                    });
                  } else {
                    // Se tem apenas uma aplicação, ir para detalhes
                    onViewStudent({id: student.id, profile_id: student.profile_id});
                  }
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <span className="text-lg font-medium text-blue-600">
                        {student.full_name?.charAt(0)?.toUpperCase() || 'S'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {student.full_name || 'Name not provided'}
                        </h3>
                        {student.hasMultipleApplications && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
                            {student.applicationCount} Applications
                            <svg 
                              className={`ml-1 h-3 w-3 transform transition-transform ${expandedStudents.has(student.id) ? 'rotate-180' : ''}`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                        <div className="flex items-center text-sm text-slate-500">
                          <Mail className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{student.email}</span>
                        </div>
                        {student.country && (
                          <div className="flex items-center text-sm text-slate-500">
                            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{student.country}</span>
                          </div>
                        )}
                        <div className="flex items-center text-sm text-slate-500">
                          <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{formatDate(student.created_at)}</span>
                        </div>
                        {!student.hasMultipleApplications && student.university_name && (
                          <div className="flex items-center text-sm text-slate-500">
                            <Building className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{student.university_name}</span>
                          </div>
                        )}
                        {student.hasMultipleApplications && (
                          <div className="flex items-center text-sm text-slate-500">
                            <Building className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">Multiple Universities</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      student.status === 'active' || student.status === 'registered' || student.status === 'enrolled' || student.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : student.status === 'pending' || student.status === 'processing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : student.status === 'dropped' || student.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {student.status === 'active' ? 'Active' :
                       student.status === 'registered' ? 'Registered' : 
                       student.status === 'enrolled' ? 'Enrolled' :
                       student.status === 'completed' ? 'Completed' :
                       student.status === 'pending' ? 'Pending' :
                       student.status === 'processing' ? 'Processing' :
                       student.status === 'dropped' ? 'Dropped' : 
                       student.status === 'cancelled' ? 'Cancelled' :
                       student.status || 'Unknown'}
                    </span>
                    
                    <div className="flex items-center text-sm font-medium text-green-600">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {studentDependents[student.id] === undefined ? (
                        <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                      ) : (
                        formatCurrency(calculateStudentTotalPaid(student))
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Taxas Faltantes */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Payment Missing Fees:</span>
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        const missingFees = getMissingFees(student);
                        if (missingFees.length === 0) {
                          return (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              All Paid
                            </span>
                          );
                        }
                        return missingFees.map((fee, index) => (
                          <span
                            key={index}
                            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                              fee.color === 'red' ? 'text-red-700 bg-red-100' :
                              fee.color === 'orange' ? 'text-orange-700 bg-orange-100' :
                              fee.color === 'blue' ? 'text-blue-700 bg-blue-100' :
                              'text-gray-700 bg-gray-100'
                            }`}
                          >
                            {fee.name}
                          </span>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                {/* I-20 Control Fee Deadline Status */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">I-20 Control Fee:</span>
                    <SellerI20DeadlineTimer 
                      deadline={calculateI20Deadline(student)}
                      hasPaid={student.has_paid_i20_control_fee || false}
                      studentName={student.full_name}
                    />
                  </div>
                </div>

                {/* Seção Expandida - Múltiplas Aplicações */}
                {student.hasMultipleApplications && expandedStudents.has(student.id) && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">All Applications:</h4>
                    <div className="space-y-3">
                      {student.allApplications?.map((app: any, appIndex: number) => (
                        <div 
                          key={`${app.application_id}-${appIndex}`}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-slate-900">
                                {app.scholarship_title || 'No scholarship selected'}
                              </span>
                              {app.university_name && (
                                <span className="text-xs text-slate-600">
                                  @ {app.university_name}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 mt-1">
                              {app.is_application_fee_paid && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                                  Application Fee Paid
                                </span>
                              )}
                              {app.is_scholarship_fee_paid && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                                  Scholarship Fee Paid
                                </span>
                              )}
                              {!app.is_application_fee_paid && !app.is_scholarship_fee_paid && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">
                                  Pending Payment
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewStudent({id: app.id, profile_id: app.profile_id});
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Details
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <GraduationCap className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {filters.searchTerm || filters.universityFilter !== 'all' || filters.statusFilter !== 'all' ? 'No applications found' : 'No referenced students yet'}
            </h3>
            <p className="text-slate-500">
              {filters.searchTerm || filters.universityFilter !== 'all' || filters.statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Share your referral code to get started!'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200">
            {/* Page information centered */}
            <div className="flex items-center justify-center mb-4">
              <div className="text-sm text-slate-500">
                Page {currentPage} of {totalPages}
              </div>
            </div>
            
            {/* Navigation controls centered */}
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="inline-flex items-center px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
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
                      onClick={() => goToPage(pageNumber)}
                      className={`inline-flex items-center px-3 py-1 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#05294E] ${
                        currentPage === pageNumber
                          ? 'border-[#05294E] bg-[#05294E] text-white'
                          : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="px-2 text-slate-500">...</span>
                    <button
                      onClick={() => goToPage(totalPages)}
                      className="inline-flex items-center px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#05294E]"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="inline-flex items-center px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#05294E] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  );
};

export default MyStudents;
