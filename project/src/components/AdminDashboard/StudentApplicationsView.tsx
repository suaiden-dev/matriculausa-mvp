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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

interface StudentRecord {
  // Dados do estudante (sempre presentes)
  student_id: string;
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
  applied_at: string | null;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  acceptance_letter_status: string | null;
  payment_status: string | null;
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
      // Buscar todos os estudantes com suas aplicações (se houver)
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
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
            scholarships (
              title,
              universities (
                name
              )
            )
          )
        `)
        .eq('role', 'student')
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
          // Verificar se existe uma aplicação "locked" (aprovada + application_fee paga)
          lockedApplication = student.scholarship_applications.find((app: any) => 
            app.status === 'approved' && app.is_application_fee_paid
          );
          
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

        return {
          student_id: student.id,
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
          applied_at: lockedApplication?.applied_at || null,
          is_application_fee_paid: !!lockedApplication,
          is_scholarship_fee_paid: lockedApplication?.is_scholarship_fee_paid || false,
          acceptance_letter_status: lockedApplication?.acceptance_letter_status || null,
          payment_status: lockedApplication?.payment_status || null,
          scholarship_title: scholarshipInfo ? scholarshipInfo.title : null,
          university_name: scholarshipInfo ? scholarshipInfo.university : null,
          reviewed_at: lockedApplication?.reviewed_at || null,
          reviewed_by: lockedApplication?.reviewed_by || null,
          is_locked: !!lockedApplication,
          total_applications: student.scholarship_applications ? student.scholarship_applications.length : 0,
          // Guardar todas as aplicações para o modal
          all_applications: student.scholarship_applications || []
        };
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
        return student.applied_at ? 'completed' : 'pending';
      case 'review':
        if (student.status === 'approved') return 'completed';
        if (student.status === 'rejected') return 'rejected';
        if (student.status === 'under_review') return 'in_progress';
        return 'pending';
      case 'application_fee':
        return student.is_application_fee_paid ? 'completed' : 'pending';
      case 'scholarship_fee':
        return student.is_scholarship_fee_paid ? 'completed' : 'pending';
      case 'acceptance_letter':
        if (student.acceptance_letter_status === 'approved') return 'completed';
        if (student.acceptance_letter_status === 'sent') return 'in_progress';
        return 'pending';
      case 'i20_fee':
        return student.has_paid_i20_control_fee ? 'completed' : 'pending';
      case 'enrollment':
        return student.status === 'enrolled' ? 'completed' : 'pending';
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
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in_progress': return Clock;
      case 'rejected': return XCircle;
      case 'pending': return AlertCircle;
      default: return AlertCircle;
    }
  };

  const filteredStudents = students.filter((student: StudentRecord) => {
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
          // Está na etapa Selection Fee se NÃO pagou a taxa de seleção
          result = !student.has_paid_selection_process_fee;
          break;
        case 'application':
          // Está na etapa Application se pagou a taxa de seleção mas não aplicou ainda
          result = student.has_paid_selection_process_fee && student.total_applications === 0;
          break;
        case 'review':
          // Está na etapa Review se aplicou mas está pendente ou em análise
          result = student.total_applications > 0 && (student.status === 'pending' || student.status === 'under_review') && !student.is_locked;
          break;
        case 'app_fee':
          // Está na etapa App Fee se foi aprovado mas não pagou a taxa de aplicação
          result = student.status === 'approved' && !student.is_application_fee_paid;
          break;
        case 'scholarship_fee':
          // Está na etapa Scholarship Fee se pagou a taxa de aplicação mas não a de bolsa
          result = student.is_locked && !student.is_scholarship_fee_paid;
          break;
        case 'acceptance':
          // Está na etapa Acceptance se pagou a taxa de bolsa mas não tem carta de aceitação
          result = student.is_locked && student.is_scholarship_fee_paid && !student.acceptance_letter_status;
          break;
        case 'i20_fee':
          // Está na etapa I-20 Fee se tem carta de aceitação mas não pagou a taxa I-20
          result = student.is_locked && student.acceptance_letter_status && !student.has_paid_i20_control_fee;
          break;
        case 'enrollment':
          // Está na etapa Enrollment se pagou todas as taxas e está matriculado
          result = student.is_locked && student.has_paid_i20_control_fee && student.status === 'enrolled';
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
    const steps = [
      { key: 'selection_fee', label: 'Selection Fee', icon: CreditCard },
      { key: 'apply', label: 'Application', icon: FileText },
      { key: 'review', label: 'Review', icon: Eye },
      { key: 'application_fee', label: 'App Fee', icon: DollarSign },
      { key: 'scholarship_fee', label: 'Scholarship Fee', icon: Award },
      { key: 'acceptance_letter', label: 'Acceptance', icon: BookOpen },
      { key: 'i20_fee', label: 'I-20 Fee', icon: CreditCard },
      { key: 'enrollment', label: 'Enrollment', icon: GraduationCap }
    ];

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
              <option value="locked">Committed to Scholarship</option>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentStudents.map((student) => (
                <tr key={student.application_id || student.student_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {student.student_name}
                          </div>
                          {student.is_locked && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              <Lock className="h-3 w-3 mr-1" />
                              Committed
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
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedStudent(student)}
                      className="text-[#05294E] hover:text-[#05294E]/80 transition-colors"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
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
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Student Details</h3>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Student Info */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Student Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-sm text-gray-900">{selectedStudent.student_name}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm text-gray-900">{selectedStudent.student_email}</p>
                  </div>
                </div>
              </div>

              {/* Scholarship Info */}
              {selectedStudent.scholarship_title ? (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Scholarship Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-sm font-medium text-gray-500">Scholarship</label>
                      <p className="text-sm text-gray-900">{selectedStudent.scholarship_title}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-sm font-medium text-gray-500">University</label>
                      <p className="text-sm text-gray-900">{selectedStudent.university_name}</p>
                    </div>
                  </div>
                </div>
              ) : selectedStudent.total_applications > 0 ? (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Active Applications ({selectedStudent.total_applications})
                  </h4>
                  <div className="space-y-3">
                    {selectedStudent.all_applications.map((app: any) => (
                      <div key={app.id} className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-gray-900">
                              {app.scholarships?.title || 'N/A'}
                            </h5>
                            <p className="text-sm text-gray-600">
                              {app.scholarships?.universities?.name || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Applied: {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              app.status === 'approved' 
                                ? 'bg-green-100 text-green-800'
                                : app.status === 'under_review'
                                ? 'bg-blue-100 text-blue-800' 
                                : app.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {app.status || 'Pending'}
                            </span>
                            {app.status === 'approved' && (
                              <div className="mt-1">
                                <span className={`text-xs font-medium ${
                                  app.is_application_fee_paid 
                                    ? 'text-green-600' 
                                    : 'text-amber-600'
                                }`}>
                                  {app.is_application_fee_paid ? '✓ Fee Paid' : 'Payment Pending'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 text-sm">
                      <strong>Note:</strong> Student can apply to multiple scholarships. 
                      Once approved and application fee is paid for one scholarship, 
                      the student will be committed to that scholarship.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Application Status</h4>
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <p className="text-yellow-800">This student hasn't applied to any scholarship yet.</p>
                  </div>
                </div>
              )}

              {/* Application Flow */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Application Progress</h4>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <ApplicationFlowSteps student={selectedStudent} />
                </div>
              </div>

              {/* Payment Status */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Payment Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-sm font-medium text-gray-500">Selection Process Fee</label>
                    <div className="flex items-center mt-2">
                      {selectedStudent.has_paid_selection_process_fee ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mr-2" />
                      )}
                      <span className={`text-sm font-medium ${
                        selectedStudent.has_paid_selection_process_fee 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {selectedStudent.has_paid_selection_process_fee ? 'Paid' : 'Not Paid'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-sm font-medium text-gray-500">Application Fee</label>
                    <div className="flex items-center mt-2">
                      {selectedStudent.is_application_fee_paid ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mr-2" />
                      )}
                      <span className={`text-sm font-medium ${
                        selectedStudent.is_application_fee_paid 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {selectedStudent.is_application_fee_paid ? 'Paid' : 'Not Paid'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-sm font-medium text-gray-500">Scholarship Fee</label>
                    <div className="flex items-center mt-2">
                      {selectedStudent.is_scholarship_fee_paid ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mr-2" />
                      )}
                      <span className={`text-sm font-medium ${
                        selectedStudent.is_scholarship_fee_paid 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {selectedStudent.is_scholarship_fee_paid ? 'Paid' : 'Not Paid'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-sm font-medium text-gray-500">I-20 Control Fee</label>
                    <div className="flex items-center mt-2">
                      {selectedStudent.has_paid_i20_control_fee ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mr-2" />
                      )}
                      <span className={`text-sm font-medium ${
                        selectedStudent.has_paid_i20_control_fee 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {selectedStudent.has_paid_i20_control_fee ? 'Paid' : 'Not Paid'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Timeline</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <span className="text-sm text-gray-900">
                      Joined on {new Date(selectedStudent.student_created_at).toLocaleString()}
                    </span>
                  </div>
                  {selectedStudent.applied_at && (
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-gray-900">
                        Applied on {new Date(selectedStudent.applied_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedStudent.reviewed_at && (
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-purple-600" />
                      <span className="text-sm text-gray-900">
                        Reviewed on {new Date(selectedStudent.reviewed_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentApplicationsView;