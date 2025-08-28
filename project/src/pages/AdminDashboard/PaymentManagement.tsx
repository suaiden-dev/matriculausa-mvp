import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { UniversityPaymentRequestService, type UniversityPaymentRequest } from '../../services/UniversityPaymentRequestService';
import { 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  CreditCard,
  Building2,
  User,
  DollarSign,
  TrendingUp,
  AlertCircle,
  List,
  Grid3X3,
  Clock,
  CheckCircle2,
  Shield
} from 'lucide-react';

interface PaymentRecord {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  university_id: string;
  university_name: string;
  scholarship_id?: string;
  scholarship_title?: string;
  fee_type: 'selection_process' | 'application' | 'scholarship' | 'i20_control';
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  payment_date?: string;
  stripe_session_id?: string;
  created_at: string;
}

interface PaymentStats {
  totalRevenue: number;
  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;
  monthlyGrowth: number;
}

const FEE_TYPES = [
  { value: 'selection_process', label: 'Selection Process Fee', color: 'bg-blue-100 text-blue-800' },
  { value: 'application', label: 'Application Fee', color: 'bg-green-100 text-green-800' },
  { value: 'scholarship', label: 'Scholarship Fee', color: 'bg-blue-100 text-[#05294E]' },
  { value: 'i20_control', label: 'I-20 Control Fee', color: 'bg-orange-100 text-orange-800' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
];

const PaymentManagement: React.FC = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    totalPayments: 0,
    paidPayments: 0,
    pendingPayments: 0,
    monthlyGrowth: 0
  });

  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    university: 'all',
    feeType: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Estados para University Payment Requests
  const [activeTab, setActiveTab] = useState<'payments' | 'university-requests'>('payments');
  const [universityRequests, setUniversityRequests] = useState<UniversityPaymentRequest[]>([]);
  const [loadingUniversityRequests, setLoadingUniversityRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<UniversityPaymentRequest | null>(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [universityRequestsViewMode, setUniversityRequestsViewMode] = useState<'grid' | 'list'>('grid');
  const [adminBalance, setAdminBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Estados para modais de ações
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [showAddNotesModal, setShowAddNotesModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20); // 20 itens por página para melhor visualização

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadPaymentData();
      loadUniversities();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'university-requests') {
      loadUniversityPaymentRequests();
    }
  }, [activeTab]);

  useEffect(() => {
    if (universityRequests.length > 0) {
      loadAdminBalance();
    }
  }, [universityRequests]);

  useEffect(() => {
    const saved = localStorage.getItem('payment-view-mode') as 'grid' | 'list';
    if (saved) setViewMode(saved);
  }, []);

  // Carregar preferência de itens por página
  useEffect(() => {
    const saved = localStorage.getItem('payment-items-per-page');
    if (saved) {
      const items = Number(saved);
      if ([10, 20, 50, 100].includes(items)) {
        setItemsPerPage(items);
      }
    }
  }, []);

  const loadUniversities = async () => {
    try {
      const { data, error } = await supabase
        .from('universities')
        .select('id, name')
        .eq('is_approved', true)
        .order('name');

      if (error) throw error;
      setUniversities(data || []);
    } catch (error) {
      console.error('Error loading universities:', error);
    }
  };

  const loadUniversityPaymentRequests = async () => {
    try {
      setLoadingUniversityRequests(true);
      const data = await UniversityPaymentRequestService.listAllPaymentRequests();
      setUniversityRequests(data);
    } catch (error: any) {
      console.error('Error loading university payment requests:', error);
    } finally {
      setLoadingUniversityRequests(false);
    }
  };

  const loadAdminBalance = async () => {
    try {
      setLoadingBalance(true);
      // Calcular saldo baseado em todos os pagamentos recebidos menos os pagamentos feitos
      const totalRevenue = universityRequests.reduce((sum, r) => sum + r.amount_usd, 0);
      const totalPaidOut = universityRequests
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + r.amount_usd, 0);
      const availableBalance = totalRevenue - totalPaidOut;
      setAdminBalance(availableBalance);
    } catch (error: any) {
      console.error('Error loading admin balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const approveUniversityRequest = async (id: string) => {
    try {
      await UniversityPaymentRequestService.adminApprove(id, user!.id);
      await loadUniversityPaymentRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
    }
  };

  const rejectUniversityRequest = async (id: string) => {
    try {
      setActionLoading(true);
      await UniversityPaymentRequestService.adminReject(id, user!.id, rejectReason);
      await loadUniversityPaymentRequests();
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error: any) {
      console.error('Error rejecting request:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const markUniversityRequestAsPaid = async (id: string) => {
    try {
      setActionLoading(true);
      await UniversityPaymentRequestService.adminMarkPaid(id, user!.id, paymentReference);
      await loadUniversityPaymentRequests();
      await loadAdminBalance();
      setShowMarkPaidModal(false);
      setPaymentReference('');
    } catch (error: any) {
      console.error('Error marking as paid:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const addAdminNotes = async (id: string) => {
      try {
      setActionLoading(true);
      await UniversityPaymentRequestService.adminAddNotes(id, adminNotes);
        await loadUniversityPaymentRequests();
      setShowAddNotesModal(false);
      setAdminNotes('');
      } catch (error: any) {
        console.error('Error adding notes:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Funções auxiliares para abrir modais
  const openRejectModal = (id: string) => {
    const request = universityRequests.find(r => r.id === id);
    setSelectedRequest(request || null);
    setShowRejectModal(true);
  };

  const openMarkPaidModal = (id: string) => {
    const request = universityRequests.find(r => r.id === id);
    setSelectedRequest(request || null);
    setShowMarkPaidModal(true);
  };

  const openAddNotesModal = (id: string) => {
    const request = universityRequests.find(r => r.id === id);
    setSelectedRequest(request || null);
    setShowAddNotesModal(true);
  };


  const loadPaymentData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading payment data...');

      // Primeiro vamos verificar se há aplicações
      const { data: simpleApps, error: simpleError } = await supabase
        .from('scholarship_applications')
        .select('*');

      console.log('📊 Applications found:', simpleApps?.length || 0);

      // Agora vamos tentar a consulta completa
      const { data: applications, error: appsError } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          user_profiles!student_id (
            id,
            full_name,
            email,
            has_paid_selection_process_fee,
            is_application_fee_paid,
            is_scholarship_fee_paid
          ),
          scholarships (
            id,
            title,
            amount,
            universities (
              id,
              name
            )
          )
        `);

      if (appsError) throw appsError;

      // Converter aplicações em registros de pagamento
      const paymentRecords: PaymentRecord[] = [];
      
      console.log('🔄 Processing applications:', applications?.length || 0);
      
      applications?.forEach((app: any) => {
        const student = app.user_profiles;
        const scholarship = app.scholarships;
        const university = scholarship?.universities;

        // console.log('👤 Student:', student);
        // console.log('🎓 Scholarship:', scholarship);
        // console.log('🏫 University:', university);

        if (!student || !scholarship || !university) {
          console.log('⚠️ Skipping application due to missing data:', {
            hasStudent: !!student,
            hasScholarship: !!scholarship,
            hasUniversity: !!university
          });
          return;
        }

        // Verificar se os dados essenciais existem
        const studentName = student.full_name || 'Unknown Student';
        const studentEmail = student.email || '';
        const universityName = university.name || 'Unknown University';
        const scholarshipTitle = scholarship.title || 'Unknown Scholarship';

        if (!studentName || !universityName) {
          console.log('⚠️ Skipping application due to missing essential data:', {
            studentName,
            universityName,
            scholarshipTitle
          });
          return;
        }

        // Selection Process Fee
        paymentRecords.push({
          id: `${app.id}-selection`,
          student_id: student.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: university.id,
          university_name: universityName,
          scholarship_id: scholarship.id,
          scholarship_title: scholarshipTitle,
          fee_type: 'selection_process',
          amount: 60000, // $600.00 em centavos
          status: student.has_paid_selection_process_fee ? 'paid' : 'pending',
          payment_date: student.has_paid_selection_process_fee ? app.created_at : undefined,
          created_at: app.created_at
        });

        // Application Fee
        paymentRecords.push({
          id: `${app.id}-application`,
          student_id: student.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: university.id,
          university_name: universityName,
          scholarship_id: scholarship.id,
          scholarship_title: scholarshipTitle,
          fee_type: 'application',
          amount: 350, // $350.00
          status: student.is_application_fee_paid ? 'paid' : 'pending',
          payment_date: student.is_application_fee_paid ? app.created_at : undefined,
          created_at: app.created_at
        });

        // Scholarship Fee
        paymentRecords.push({
          id: `${app.id}-scholarship`,
          student_id: student.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: university.id,
          university_name: universityName,
          scholarship_id: scholarship.id,
          scholarship_title: scholarshipTitle,
          fee_type: 'scholarship',
          amount: 85000, // $850.00 em centavos
          status: student.is_scholarship_fee_paid ? 'paid' : 'pending',
          payment_date: student.is_scholarship_fee_paid ? app.created_at : undefined,
          created_at: app.created_at
        });

        // I-20 Control Fee (sempre pendente)
        paymentRecords.push({
          id: `${app.id}-i20`,
          student_id: student.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: university.id,
          university_name: universityName,
          scholarship_id: scholarship.id,
          scholarship_title: scholarshipTitle,
          fee_type: 'i20_control',
          amount: 125000, // $1,250.00 em centavos
          status: 'pending',
          created_at: app.created_at
        });
      });

      console.log('💰 Generated payment records:', paymentRecords.length);
      if (paymentRecords.length > 0) {
        console.log('✅ Payment data loaded successfully with null safety checks');
      }

      // Se não há dados reais, vamos criar alguns dados de exemplo para testar
      let finalPayments = paymentRecords;
      
      if (paymentRecords.length === 0) {
        console.log('🔧 No real data found, creating sample data for testing...');
        
        finalPayments = [
          {
            id: 'sample-1-selection',
            student_id: 'sample-student-1',
            student_name: 'João Silva',
            student_email: 'joao.silva@email.com',
            university_id: 'sample-uni-1',
            university_name: 'Harvard University',
            scholarship_id: 'sample-scholarship-1',
            scholarship_title: 'Computer Science Excellence Scholarship',
            fee_type: 'selection_process',
            amount: 50,
            status: 'paid',
            payment_date: '2024-01-15T10:30:00Z',
            created_at: '2024-01-15T10:30:00Z'
          },
          {
            id: 'sample-1-application',
            student_id: 'sample-student-1',
            student_name: 'João Silva',
            student_email: 'joao.silva@email.com',
            university_id: 'sample-uni-1',
            university_name: 'Harvard University',
            scholarship_id: 'sample-scholarship-1',
            scholarship_title: 'Computer Science Excellence Scholarship',
            fee_type: 'application',
            amount: 100,
            status: 'paid',
            payment_date: '2024-01-16T14:20:00Z',
            created_at: '2024-01-16T14:20:00Z'
          },
          {
            id: 'sample-2-selection',
            student_id: 'sample-student-2',
            student_name: 'Maria Santos',
            student_email: 'maria.santos@email.com',
            university_id: 'sample-uni-2',
            university_name: 'MIT',
            scholarship_id: 'sample-scholarship-2',
            scholarship_title: 'Engineering Innovation Grant',
            fee_type: 'selection_process',
            amount: 50,
            status: 'pending',
            created_at: '2024-01-20T09:15:00Z'
          },
          {
            id: 'sample-2-scholarship',
            student_id: 'sample-student-2',
            student_name: 'Maria Santos',
            student_email: 'maria.santos@email.com',
            university_id: 'sample-uni-2',
            university_name: 'MIT',
            scholarship_id: 'sample-scholarship-2',
            scholarship_title: 'Engineering Innovation Grant',
            fee_type: 'scholarship',
            amount: 200,
            status: 'paid',
            payment_date: '2024-01-22T16:45:00Z',
            created_at: '2024-01-22T16:45:00Z'
          },
          {
            id: 'sample-3-i20',
            student_id: 'sample-student-3',
            student_name: 'Carlos Rodriguez',
            student_email: 'carlos.rodriguez@email.com',
            university_id: 'sample-uni-3',
            university_name: 'Stanford University',
            scholarship_id: 'sample-scholarship-3',
            scholarship_title: 'Business Leadership Scholarship',
            fee_type: 'i20_control',
            amount: 150,
            status: 'pending',
            created_at: '2024-01-25T11:00:00Z'
          }
        ];

        console.log('✅ Sample data loaded:', finalPayments.length, 'records');
      }

      setPayments(finalPayments);

      // Calcular estatísticas
      const totalPayments = finalPayments.length;
      const paidPayments = finalPayments.filter(p => p.status === 'paid').length;
      const pendingPayments = finalPayments.filter(p => p.status === 'pending').length;
      const totalRevenue = finalPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

      const newStats = {
        totalRevenue,
        totalPayments,
        paidPayments,
        pendingPayments,
        monthlyGrowth: 15.2
      };

      console.log('📈 Stats calculated:', newStats);
      setStats(newStats);

    } catch (error) {
      console.error('Error loading payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('payment-view-mode', mode);
  };

  // Salvar preferência de itens por página
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset para primeira página
    localStorage.setItem('payment-items-per-page', newItemsPerPage.toString());
  };

  // Resetar para primeira página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.university, filters.feeType, filters.status, filters.dateFrom, filters.dateTo]);

  // Calcular paginação
  const filteredPayments = payments.filter(payment => {
    const searchTerm = filters.search.toLowerCase();
    const matchesSearch = 
      (payment.student_name || '').toLowerCase().includes(searchTerm) ||
      (payment.student_email || '').toLowerCase().includes(searchTerm) ||
      (payment.university_name || '').toLowerCase().includes(searchTerm) ||
      (payment.scholarship_title || '').toLowerCase().includes(searchTerm);

    const matchesUniversity = filters.university === 'all' || payment.university_id === filters.university;
    const matchesFeeType = filters.feeType === 'all' || payment.fee_type === filters.feeType;
    const matchesStatus = filters.status === 'all' || payment.status === filters.status;

    let matchesDate = true;
    if (filters.dateFrom || filters.dateTo) {
      const paymentDate = new Date(payment.payment_date || payment.created_at);
      if (filters.dateFrom) {
        matchesDate = matchesDate && paymentDate >= new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        matchesDate = matchesDate && paymentDate <= new Date(filters.dateTo);
      }
    }

    return matchesSearch && matchesUniversity && matchesFeeType && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayments = filteredPayments.slice(startIndex, endIndex);

  // Funções de navegação
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  // Gerar array de páginas para exibição
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Se temos poucas páginas, mostrar todas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Se temos muitas páginas, mostrar uma janela deslizante
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      // Ajustar se estamos no final
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  const handleExport = () => {
    const csvContent = [
      ['Student Name', 'Email', 'University', 'Scholarship', 'Fee Type', 'Amount', 'Status', 'Payment Date'].join(','),
      ...filteredPayments.map(payment => [
        payment.student_name,
        payment.student_email,
        payment.university_name,
        payment.scholarship_title || '',
        FEE_TYPES.find(ft => ft.value === payment.fee_type)?.label || payment.fee_type,
        payment.amount,
        payment.status,
        payment.payment_date || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleViewDetails = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setShowDetails(true);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      university: 'all',
      feeType: 'all',
      status: 'all',
      dateFrom: '',
      dateTo: ''
    });
    setCurrentPage(1); // Reset para primeira página
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CreditCard className="text-blue-600" size={32} />
            Payment Management
          </h1>
          <p className="text-gray-600 mt-1">Monitor and manage all payments across the platform</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Student Payments
          </button>
          <button
            onClick={() => setActiveTab('university-requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'university-requests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            University Payment Requests
          </button>
        </nav>
      </div>

      {/* Student Payments Tab Content */}
      {activeTab === 'payments' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Revenue</p>
              <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign size={32} className="text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Paid Payments</p>
              <p className="text-2xl font-bold">{stats.paidPayments}</p>
            </div>
            <CheckCircle size={32} className="text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Pending Payments</p>
              <p className="text-2xl font-bold">{stats.pendingPayments}</p>
            </div>
            <XCircle size={32} className="text-orange-200" />
          </div>
        </div>

        <div className="bg-[#05294E] rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Monthly Growth</p>
              <p className="text-2xl font-bold">+{stats.monthlyGrowth}%</p>
            </div>
            <TrendingUp size={32} className="text-purple-200" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Filter size={20} />
            Filters & Search
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Export CSV
            </button>
            <div className="flex bg-gray-100 border border-gray-200 rounded-xl p-1">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by student name, email, university, or scholarship..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">University</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.university}
                onChange={(e) => setFilters({ ...filters, university: e.target.value })}
                title="Filter by university"
                aria-label="Filter by university"
              >
                <option value="all">All Universities</option>
                {universities.map(uni => (
                  <option key={uni.id} value={uni.id}>{uni.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fee Type</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.feeType}
                onChange={(e) => setFilters({ ...filters, feeType: e.target.value })}
                title="Filter by fee type"
                aria-label="Filter by fee type"
              >
                <option value="all">All Fee Types</option>
                {FEE_TYPES.map(fee => (
                  <option key={fee.value} value={fee.value}>{fee.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                title="Filter by payment status"
                aria-label="Filter by payment status"
              >
                {STATUS_OPTIONS.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                title="Filter from date"
                placeholder="Select start date"
                aria-label="Filter from date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                title="Filter to date"
                placeholder="Select end date"
                aria-label="Filter to date"
              />
            </div>

            <div className="lg:col-span-5 flex justify-end">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredPayments.length} of {payments.length} payments
          {totalPages > 1 && (
            <>
              <span className="mx-2">•</span>
              <span>
                Page {currentPage} of {totalPages}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Payments Table/Grid */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    University
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fee Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Try adjusting your search criteria or filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  currentPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{payment.student_name}</div>
                            <div className="text-sm text-gray-500">{payment.student_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">{payment.university_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          FEE_TYPES.find(ft => ft.value === payment.fee_type)?.color || 'bg-gray-100 text-gray-800'
                        }`}>
                          {FEE_TYPES.find(ft => ft.value === payment.fee_type)?.label || payment.fee_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        ${payment.amount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          payment.status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : payment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {payment.status === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {payment.status === 'pending' && <XCircle className="w-3 h-3 mr-1" />}
                          {payment.status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {payment.payment_date 
                            ? new Date(payment.payment_date).toLocaleDateString()
                            : 'N/A'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(payment)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          <Eye size={16} />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentPayments.map((payment) => (
            <div key={payment.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-5 w-5 text-gray-500" />
                  <span className="font-bold text-gray-900">{payment.student_name}</span>
                </div>
                <div className="text-sm text-gray-600 mb-1">{payment.student_email}</div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{payment.university_name}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${FEE_TYPES.find(ft => ft.value === payment.fee_type)?.color || 'bg-gray-100 text-gray-800'}`}>{FEE_TYPES.find(ft => ft.value === payment.fee_type)?.label || payment.fee_type}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="font-bold text-green-700">${payment.amount}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${payment.status === 'paid' ? 'bg-green-100 text-green-800' : payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span>
                </div>
              </div>
              <button
                onClick={() => handleViewDetails(payment)}
                className="mt-4 w-full bg-blue-600 text-white py-2.5 px-4 rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
                title="View details"
              >
                Details
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {filteredPayments.length > 0 && totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Informações da paginação */}
            <div className="text-sm text-gray-600">
              <span className="font-medium">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredPayments.length)} of {filteredPayments.length}
              </span>
              <span className="ml-2">
                payments
              </span>
            </div>

            {/* Controles de navegação */}
            <div className="flex items-center gap-2">
              {/* Botão Primeira Página */}
              <button
                onClick={goToFirstPage}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Go to first page"
                aria-label="Go to first page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              {/* Botão Página Anterior */}
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Go to previous page"
                aria-label="Go to previous page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Números das páginas */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      page === currentPage
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    title={`Go to page ${page}`}
                    aria-label={`Go to page ${page}`}
                    aria-current={page === currentPage ? 'page' : undefined}
                  >
                    {page}
                  </button>
                ))}
              </div>

              {/* Botão Próxima Página */}
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Go to next page"
                aria-label="Go to next page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Botão Última Página */}
              <button
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Go to last page"
                aria-label="Go to last page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Seletor de itens por página */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-2 py-1 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                title="Items per page"
                aria-label="Items per page"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>per page</span>
            </div>
          </div>
        </div>
      )}
      </>)}

      {/* University Payment Requests Tab Content */}
      {activeTab === 'university-requests' && (
        <div className="space-y-6">
          {/* Stats Cards for University Requests */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{universityRequests.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {universityRequests.filter(r => r.status === 'pending').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {universityRequests.filter(r => r.status === 'approved').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${universityRequests.reduce((sum, r) => sum + r.amount_usd, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Available Balance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loadingBalance ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
                    ) : (
                      `$${adminBalance.toLocaleString()}`
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* University Requests List */}
          <div className="bg-white rounded-xl shadow border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
              <h2 className="text-lg font-semibold text-gray-900">University Payment Requests</h2>
              <p className="text-gray-600 mt-1">Manage payment requests from universities</p>
                </div>
                <div className="flex bg-gray-100 border border-gray-200 rounded-xl p-1">
                  <button
                    onClick={() => setUniversityRequestsViewMode('grid')}
                    className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                      universityRequestsViewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="Grid view"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setUniversityRequestsViewMode('list')}
                    className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                      universityRequestsViewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {loadingUniversityRequests ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : universityRequests.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No payment requests found</h3>
                <p className="text-gray-500">University payment requests will appear here when they are submitted</p>
              </div>
            ) : (
              <div className="p-6">
                {universityRequestsViewMode === 'grid' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {universityRequests.map((request) => (
                    <div 
                      key={request.id}
                      className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors cursor-pointer border"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRequestDetails(true);
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">
                            {request.university?.name || 'Unknown University'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {request.user?.full_name || request.user?.email || 'Unknown User'}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          request.status === 'paid' ? 'bg-green-100 text-green-800' :
                          request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>

                      <div className="mb-4">
                        <div className="text-2xl font-bold text-gray-900 mb-2">
                          ${request.amount_usd.toLocaleString()}
                        </div>
                        <p className="text-sm text-gray-600 capitalize">
                          {request.payout_method.replace('_', ' ')}
                        </p>
                      </div>

                      <div className="text-sm text-gray-500">
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>

                      {/* Action Buttons */}
                      {request.status === 'pending' && (
                        <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              approveUniversityRequest(request.id);
                            }}
                            className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openRejectModal(request.id);
                            }}
                            className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {request.status === 'approved' && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openMarkPaidModal(request.id);
                            }}
                            className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Mark as Paid
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // List View (Table)
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            University
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Method
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {universityRequests.map((request) => (
                          <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                    <Building2 className="h-5 w-5 text-gray-600" />
              </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {request.university?.name || 'Unknown University'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {request.user?.full_name || request.user?.email || 'Unknown User'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                <div className="font-medium">${request.amount_usd.toLocaleString()}</div>
                                <div className="text-gray-500">{request.amount_coins} coins</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 capitalize">
                                {request.payout_method.replace('_', ' ')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                request.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                request.status === 'paid' ? 'bg-green-100 text-green-800' :
                                request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(request.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowRequestDetails(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                >
                                  <Eye size={16} />
                                  Details
                                </button>
                                
                                {request.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => approveUniversityRequest(request.id)}
                                      className="text-green-600 hover:text-green-900 flex items-center gap-1"
                                    >
                                      <CheckCircle size={16} />
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => openRejectModal(request.id)}
                                      className="text-red-600 hover:text-red-900 flex items-center gap-1"
                                    >
                                      <XCircle size={16} />
                                      Reject
                                    </button>
                                  </>
                                )}
                                
                                {request.status === 'approved' && (
                                  <button
                                                                          onClick={() => openMarkPaidModal(request.id)}
                                    className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                  >
                                    <DollarSign size={16} />
                                    Mark Paid
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      )}

      {/* University Request Details Modal */}
      {showRequestDetails && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Payment Request Details</h3>
                <button 
                  onClick={() => setShowRequestDetails(false)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* University Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">University</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-lg font-semibold">{selectedRequest.university?.name}</p>
                    <p className="text-gray-600">{selectedRequest.university?.location}</p>
                  </div>
                </div>

                {/* Request Details */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Request Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-semibold">${selectedRequest.amount_usd.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method:</span>
                      <span className="font-semibold capitalize">{selectedRequest.payout_method.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedRequest.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        selectedRequest.status === 'paid' ? 'bg-green-100 text-green-800' :
                        selectedRequest.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span>{new Date(selectedRequest.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4">


                    {selectedRequest.payout_details_preview ? (
                      (() => {
                        const details = selectedRequest.payout_details_preview as Record<string, any>;
                        const method = String(selectedRequest.payout_method);
                        

                        
                        if (method === 'zelle') {
                          return (
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-900">Zelle Information</h5>
                              <div className="space-y-2">
                                {details.email && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Email:</span>
                                    <span className="font-medium">{details.email}</span>
                                  </div>
                                )}
                                {details.phone && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Phone:</span>
                                    <span className="font-medium">{details.phone}</span>
                                  </div>
                                )}
                                {details.name && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Name:</span>
                                    <span className="font-medium">{details.name}</span>
                                  </div>
                                )}
                                {/* Fallback para mostrar todos os campos disponíveis se nenhum dos campos específicos existir */}
                                {!details.email && !details.phone && !details.name && (
                                  <div className="text-sm text-gray-600">
                                    <p className="mb-2">Available fields:</p>
                                    {Object.entries(details).map(([key, value]) => (
                                      <div key={key} className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                                        <span className="font-medium">{String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        } else if (method === 'bank_transfer') {
                          return (
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-900">Bank Transfer Information</h5>
                              <div className="space-y-2">
                                {details.bank_name && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Bank Name:</span>
                                    <span className="font-medium">{details.bank_name}</span>
                                  </div>
                                )}
                                {details.account_number && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Account Number:</span>
                                    <span className="font-medium font-mono">{details.account_number}</span>
                                  </div>
                                )}
                                {details.routing_number && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Routing Number:</span>
                                    <span className="font-medium font-mono">{details.routing_number}</span>
                                  </div>
                                )}
                                {details.account_type && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Account Type:</span>
                                    <span className="font-medium capitalize">{details.account_type}</span>
                                  </div>
                                )}
                                {/* Fallback para mostrar todos os campos disponíveis se nenhum dos campos específicos existir */}
                                {!details.bank_name && !details.account_number && !details.routing_number && !details.account_type && (
                                  <div className="text-sm text-gray-600">
                                    <p className="mb-2">Available fields:</p>
                                    {Object.entries(details).map(([key, value]) => (
                                      <div key={key} className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                                        <span className="font-medium">{String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        } else if (method === 'stripe') {
                          return (
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-900">Stripe Information</h5>
                              <div className="space-y-2">
                                {details.stripe_email && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Email:</span>
                                    <span className="font-medium">{details.stripe_email}</span>
                                  </div>
                                )}
                                {details.account_id && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Account ID:</span>
                                    <span className="font-medium font-mono">{details.account_id}</span>
                                  </div>
                                )}
                                {details.customer_id && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Customer ID:</span>
                                    <span className="font-medium font-mono">{details.customer_id}</span>
                                  </div>
                                )}
                                {details.stripe_account_id && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Stripe Account ID:</span>
                                    <span className="font-medium font-mono">{details.stripe_account_id}</span>
                                  </div>
                                )}
                                {/* Fallback para mostrar todos os campos disponíveis se nenhum dos campos específicos existir */}
                                {!details.stripe_email && !details.account_id && !details.customer_id && !details.stripe_account_id && (
                                  <div className="text-sm text-gray-600">
                                    <p className="mb-2">Available fields:</p>
                                    {Object.entries(details).map(([key, value]) => (
                                      <div key={key} className="flex justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                                        <span className="font-medium">{String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        } else {
                          // Fallback para métodos não reconhecidos
                          return (
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-900 capitalize">{method.replace('_', ' ')} Information</h5>
                              <div className="space-y-2">
                                {Object.entries(details).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                                    <span className="font-medium">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                      })()
                    ) : (
                      <div className="text-center py-4">
                        <CreditCard className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-gray-500">No payment details available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Notes */}
                {selectedRequest.admin_notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Admin Notes</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700">{selectedRequest.admin_notes}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-3 pt-4 border-t">
                  <button
                    onClick={() => openAddNotesModal(selectedRequest.id)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Add Notes
                  </button>
                  
                  {selectedRequest.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          approveUniversityRequest(selectedRequest.id);
                          setShowRequestDetails(false);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          openRejectModal(selectedRequest.id);
                          setShowRequestDetails(false);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  
                  {selectedRequest.status === 'approved' && (
                    <button
                      onClick={() => {
                          openMarkPaidModal(selectedRequest.id);
                        setShowRequestDetails(false);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Mark as Paid
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {showDetails && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Payment Details</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close modal"
                  aria-label="Close payment details modal"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Student</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPayment.student_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPayment.student_email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">University</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPayment.university_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Scholarship</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPayment.scholarship_title || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Fee Type</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {FEE_TYPES.find(ft => ft.value === selectedPayment.fee_type)?.label || selectedPayment.fee_type}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Amount</label>
                    <p className="mt-1 text-sm text-gray-900 font-semibold">${selectedPayment.amount}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <p className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedPayment.status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : selectedPayment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Payment Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedPayment.payment_date 
                        ? new Date(selectedPayment.payment_date).toLocaleString()
                        : 'Not paid yet'
                      }
                    </p>
                  </div>
                </div>

                {selectedPayment.stripe_session_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Stripe Session ID</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-100 p-2 rounded">
                      {selectedPayment.stripe_session_id}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Request Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Reject Payment Request</h3>
              <button 
                onClick={() => setShowRejectModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rejection
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a reason for rejecting this payment request..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => rejectUniversityRequest(selectedRequest.id)}
                  disabled={!rejectReason.trim() || actionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {showMarkPaidModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Mark as Paid</h3>
              <button 
                onClick={() => setShowMarkPaidModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Reference (Optional)
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Transaction ID, check number, or other reference..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowMarkPaidModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => markUniversityRequestAsPaid(selectedRequest.id)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Marking as Paid...' : 'Mark as Paid'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin Notes Modal */}
      {showAddNotesModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Add Admin Notes</h3>
              <button 
                onClick={() => setShowAddNotesModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any administrative notes or comments..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowAddNotesModal(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => addAdminNotes(selectedRequest.id)}
                  disabled={!adminNotes.trim() || actionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Adding Notes...' : 'Add Notes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement; 