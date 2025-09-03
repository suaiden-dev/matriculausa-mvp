import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useUniversity } from '../../context/UniversityContext';
import { supabase } from '../../lib/supabase';
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  Filter,
  Bell,
  Users,
  Award,
  MapPin,
  Globe,
  BookOpen,
  GraduationCap,
  Phone,
  Mail,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Shield,
  Info,
  Settings,
  Building
} from 'lucide-react';
import ProfileCompletionGuard from '../../components/ProfileCompletionGuard';
import StripeConnectPaymentNotifications from '../../components/StripeConnectPaymentNotifications';

interface Transfer {
  id: string;
  transfer_id: string | null;
  session_id: string;
  payment_intent_id: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed';
  destination_account: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  
  // Application information
  application_id?: string;
  application_status?: string;
  applied_at?: string;
  reviewed_at?: string;
  application_notes?: string;
  
  // Student information
  student_profile_id?: string;
  student_name?: string;
  student_phone?: string;
  student_country?: string;
  student_field?: string;
  student_level?: string;
  student_gpa?: number;
  student_english?: string;
  
  // Scholarship information
  scholarship_id?: string;
  scholarship_title?: string;
  scholarship_description?: string;
  scholarship_amount?: number;
  scholarship_deadline?: string;
  scholarship_field?: string;
  scholarship_level?: string;
  scholarship_exclusive?: boolean;
  scholarship_active?: boolean;
  
  // University information
  university_id: string;
  university_name?: string;
  university_location?: string;
  university_website?: string;
  
  // Fee information
  fee_type?: string;
  fee_category?: string;
  status_description?: string;
  hours_since_transfer?: number;
  application_progress?: string;
}

interface StripeConnectStatus {
  is_connected: boolean;
  account_id?: string;
  account_name?: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements_completed: boolean;
}

const StripeConnect: React.FC = () => {
  const { user } = useAuth();
  const { university } = useUniversity();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterFeeCategory, setFilterFeeCategory] = useState<string>('all');
  const [totalAmount, setTotalAmount] = useState(0);
  const [successfulTransfers, setSuccessfulTransfers] = useState(0);
  const [activeTab, setActiveTab] = useState<'setup' | 'transfers' | 'notifications'>('setup');
  const [transferSubTab, setTransferSubTab] = useState<'platform' | 'stripe_connect'>('platform');
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  
  // Estados do Stripe Connect
  const [connectStatus, setConnectStatus] = useState<StripeConnectStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const totalPages = Math.ceil(totalCount / pageSize);

  useEffect(() => {
    if (university?.id) {
      fetchStripeConnectStatus();
      if (activeTab === 'transfers') {
        fetchTransfers();
      }
    }
  }, [university?.id, filterStatus, filterFeeCategory, currentPage, pageSize, activeTab, transferSubTab]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      
      // Construir filtros base
      const filters: any = { university_id: university?.id };
      
      if (filterStatus !== 'all') {
        filters.status = filterStatus;
      }

      // Filtrar por tipo de transação baseado na sub-aba
      if (transferSubTab === 'platform') {
        // Transações via plataforma: application, scholarship, i20_control, selection_process
        if (filterFeeCategory === 'all') {
          filters.fee_category = ['application', 'scholarship', 'i20_control', 'selection_process'];
        } else {
          filters.fee_category = filterFeeCategory;
        }
      } else if (transferSubTab === 'stripe_connect') {
        // Transações Stripe Connect: custom, test, outros tipos não padrão
        if (filterFeeCategory === 'all') {
          filters.fee_category = ['custom', 'test'];
        } else {
          filters.fee_category = filterFeeCategory;
        }
      }

      // Primeiro, buscar a contagem total
      let countQuery = supabase
        .from('stripe_connect_transfers_detailed')
        .select('*', { count: 'exact', head: true });

      // Aplicar filtros na query de contagem
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          countQuery = countQuery.in(key, value);
        } else {
          countQuery = countQuery.eq(key, value);
        }
      });

      const { count, error: countError } = await countQuery;
      
      if (countError) {
        throw countError;
      }

      setTotalCount(count || 0);
      console.log('Total count:', count, 'Page size:', pageSize, 'Total pages:', Math.ceil((count || 0) / pageSize));

      // Buscar dados com paginação
      let dataQuery = supabase
        .from('stripe_connect_transfers_detailed')
        .select('*');

      // Aplicar filtros na query de dados
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          dataQuery = dataQuery.in(key, value);
        } else {
          dataQuery = dataQuery.eq(key, value);
        }
      });

      // Aplicar ordenação e paginação
      dataQuery = dataQuery
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      const { data, error: fetchError } = await dataQuery;

      if (fetchError) {
        throw fetchError;
      }

      setTransfers(data || []);

      // Calcular estatísticas dos dados da página atual
      const pageTotal = data?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const successful = data?.filter(t => t.status === 'succeeded').length || 0;
      
      setTotalAmount(pageTotal);
      setSuccessfulTransfers(successful);

    } catch (err) {
      console.error('Error fetching transfers:', err);
      setError('Error loading transfers');
    } finally {
      setLoading(false);
    }
  };

  const fetchStripeConnectStatus = async () => {
    if (!university) return;

    try {
      const { data, error } = await supabase
        .from('university_fee_configurations')
        .select('*')
        .eq('university_id', university.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching Stripe Connect status:', error);
        return;
      }

      if (data) {
        setConnectStatus({
          is_connected: !!data.stripe_connect_account_id,
          account_id: data.stripe_connect_account_id,
          account_name: data.stripe_account_name,
          charges_enabled: data.stripe_charges_enabled || false,
          payouts_enabled: data.stripe_payouts_enabled || false,
          requirements_completed: data.stripe_requirements_completed || false
        });
      } else {
        setConnectStatus({
          is_connected: false,
          charges_enabled: false,
          payouts_enabled: false,
          requirements_completed: false
        });
      }
    } catch (error) {
      console.error('Error fetching Stripe Connect status:', error);
    }
  };

  const initiateStripeConnect = async () => {
    if (!university) return;

    setConnectLoading(true);
    setConnectError(null);

    try {
      const { data, error } = await supabase.functions.invoke('initiate-stripe-connect', {
        body: {
          university_id: university.id,
          return_url: `${window.location.origin}/school/dashboard/stripe-connect/callback`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Unable to get Stripe authorization URL');
      }
    } catch (error: any) {
      setConnectError(error.message || 'Error connecting with Stripe');
    } finally {
      setConnectLoading(false);
    }
  };

  const refreshStripeStatus = async () => {
    if (!university) return;

    setConnectLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('refresh-stripe-connect-status', {
        body: { university_id: university.id }
      });

      if (error) {
        throw new Error(error.message);
      }

      await fetchStripeConnectStatus();
    } catch (error: any) {
      setConnectError(error.message || 'Error updating status');
    } finally {
      setConnectLoading(false);
    }
  };

  const disconnectStripe = async () => {
    if (!university || !connectStatus?.is_connected) return;

    if (!confirm('Are you sure you want to disconnect your Stripe account? This will disable automatic transfers.')) {
      return;
    }

    setConnectLoading(true);
    try {
      const { error } = await supabase.functions.invoke('disconnect-stripe-connect', {
        body: { university_id: university.id }
      });

      if (error) {
        throw new Error(error.message);
      }

      await fetchStripeConnectStatus();
    } catch (error: any) {
      setConnectError(error.message || 'Error disconnecting Stripe');
    } finally {
      setConnectLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const formatScholarshipAmount = (amount: number | null | undefined) => {
    if (!amount) return 'N/A';
    // If amount is already in cents (like from transfer), format normally
    if (amount >= 100) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount / 100);
    }
    // If amount is already in dollars, format directly
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-slate-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'Transferred';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getFeeCategoryColor = (category: string) => {
    switch (category) {
      case 'application':
        return 'bg-blue-100 text-blue-800';
      case 'scholarship':
        return 'bg-green-100 text-green-800';
      case 'i20_control':
        return 'bg-purple-100 text-purple-800';
      case 'selection_process':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getFeeCategoryIcon = (category: string) => {
    switch (category) {
      case 'application':
        return <BookOpen className="w-4 h-4" />;
      case 'scholarship':
        return <Award className="w-4 h-4" />;
      case 'i20_control':
        return <Globe className="w-4 h-4" />;
      case 'selection_process':
        return <Users className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const getStudentDisplayName = (transfer: Transfer) => {
    if (transfer.student_name && transfer.student_name !== 'Student Profile Not Available') {
      // Check if it's a student ID format
      if (transfer.student_name.startsWith('Student ID:')) {
        return transfer.student_name;
      }
      return transfer.student_name;
    }
    return 'Student Profile Not Available';
  };

  const getStudentDisplayInfo = (transfer: Transfer) => {
    if (transfer.student_name && transfer.student_name !== 'Student Profile Not Available') {
      // Don't show additional info for student ID format
      if (transfer.student_name.startsWith('Student ID:')) {
        return null;
      }
      return {
        name: transfer.student_name,
        country: transfer.student_country,
        level: transfer.student_level
      };
    }
    return null;
  };

  const getStudentDisplayStyle = (transfer: Transfer) => {
    if (transfer.student_name && transfer.student_name.startsWith('Student ID:')) {
      return 'text-slate-600 text-xs font-mono bg-slate-100 px-2 py-1 rounded';
    }
    return 'text-sm font-medium text-slate-900';
  };

  if (!university) {
    return <div>Loading university...</div>;
  }

  return (
    <ProfileCompletionGuard 
      isProfileCompleted={university?.profile_completed}
      title="Complete your profile to access Stripe Connect"
      description="Finish setting up your university profile to setup Stripe Connect, view transfers and payment notifications"
    >
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-slate-50 rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                    Stripe Connect
                  </h1>
                </div>
                <p className="text-slate-600 text-sm sm:text-base max-w-3xl">
                  Setup, monitor and track all financial transfers received via Stripe Connect integration with detailed information about fees, scholarships, and students
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-300 shadow-sm">
                  <DollarSign className="w-5 h-5 mr-2" />
                  {formatAmount(totalAmount)} Total
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Received</p>
                  <p className="text-2xl font-bold text-slate-900">{formatAmount(totalAmount)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Successful</p>
                  <p className="text-2xl font-bold text-slate-900">{successfulTransfers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Transfers</p>
                  <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Unique Students</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {new Set(transfers.map(t => t.student_profile_id).filter(Boolean)).size}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 sm:mb-8 overflow-hidden">
            <div className="border-b border-slate-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('setup')}
                  className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'setup'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Setup & Configuration</span>
                    <span className="sm:hidden">Setup</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('transfers')}
                  className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'transfers'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span className="hidden sm:inline">Transfer History</span>
                    <span className="sm:hidden">Transfers</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'notifications'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Bell className="w-4 h-4" />
                    <span className="hidden sm:inline">Payment Notifications</span>
                    <span className="sm:hidden">Notifications</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'setup' ? (
            <>
              {/* Status Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 sm:mb-8">
                <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                        Connection Status
                      </h2>
                      <p className="text-slate-500 text-sm">
                        Monitor your Stripe account integration status
                      </p>
                    </div>
                    <button
                      onClick={refreshStripeStatus}
                      disabled={connectLoading}
                      className="flex items-center space-x-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <RefreshCw className={`h-4 w-4 ${connectLoading ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-5 lg:p-6">
                  {connectStatus?.is_connected ? (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <div>
                          <span className="text-green-800 font-semibold">
                            Stripe Account Connected
                          </span>
                          <p className="text-green-700 text-sm">
                            Your account is successfully integrated with Stripe
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="flex items-center space-x-2 mb-3">
                            <Building className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-700">Account ID</span>
                          </div>
                          <p className="text-sm text-slate-600 font-mono bg-white px-3 py-2 rounded border">
                            {connectStatus.account_id}
                          </p>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="flex items-center space-x-2 mb-3">
                            <Settings className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-700">Account Status</span>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600">Charges</span>
                              <div className="flex items-center space-x-2">
                                {connectStatus.charges_enabled ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                                )}
                                <span className={`text-sm font-medium ${
                                  connectStatus.charges_enabled ? 'text-green-700' : 'text-yellow-700'
                                }`}>
                                  {connectStatus.charges_enabled ? 'Enabled' : 'Pending'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600">Transfers</span>
                              <div className="flex items-center space-x-2">
                                {connectStatus.payouts_enabled ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                                )}
                                <span className={`text-sm font-medium ${
                                  connectStatus.payouts_enabled ? 'text-green-700' : 'text-yellow-700'
                                }`}>
                                  {connectStatus.payouts_enabled ? 'Enabled' : 'Pending'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-slate-200">
                        <button
                          onClick={disconnectStripe}
                          disabled={connectLoading}
                          className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                        >
                          Disconnect Account
                        </button>
                        <a
                          href="https://dashboard.stripe.com/connect/accounts"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Open Stripe Dashboard</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-12">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CreditCard className="h-10 w-10 text-slate-400" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-3">
                        No Stripe Account Connected
                      </h3>
                      <p className="text-slate-600 mb-8 max-w-md mx-auto text-sm sm:text-base">
                        Connect your Stripe account to automatically receive application fee payments. 
                        You will be redirected to Stripe to authorize the connection securely.
                      </p>
                      <button
                        onClick={initiateStripeConnect}
                        disabled={connectLoading}
                        className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {connectLoading ? (
                          <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : (
                          <CreditCard className="h-5 w-5" />
                        )}
                        <span>Connect with Stripe</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Benefits Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 sm:mb-8">
                <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-200">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                    Integration Benefits
                  </h2>
                  <p className="text-slate-500 text-sm">
                    Why connect your Stripe account with our platform
                  </p>
                </div>
                <div className="p-4 sm:p-5 lg:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <DollarSign className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">Automatic Transfers</h3>
                      <p className="text-sm text-slate-600">
                        Receive application fees directly to your bank account without manual intervention
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Shield className="h-8 w-8 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">Secure Integration</h3>
                      <p className="text-sm text-slate-600">
                        Your Stripe account, your data, complete control over your financial operations
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Info className="h-8 w-8 text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">Full Transparency</h3>
                      <p className="text-sm text-slate-600">
                        Track all payments and transactions in your Stripe dashboard with real-time updates
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {connectError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-red-700 font-medium">Error</span>
                  </div>
                  <p className="text-red-600 mt-2 text-sm">{connectError}</p>
                </div>
              )}
            </>
          ) : activeTab === 'transfers' ? (
            <>
              {/* Sub-tabs para categorias de transfers */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setTransferSubTab('platform')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                      transferSubTab === 'platform'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span className="hidden sm:inline">Transações via Plataforma</span>
                      <span className="sm:hidden">Plataforma</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setTransferSubTab('stripe_connect')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                      transferSubTab === 'stripe_connect'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span className="hidden sm:inline">Transações Stripe Connect</span>
                      <span className="sm:hidden">Stripe Connect</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-5 h-5 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">Status:</span>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      aria-label="Filter by status"
                    >
                      <option value="all">All</option>
                      <option value="succeeded">Transferred</option>
                      <option value="failed">Failed</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-700">Fee Type:</span>
                    <select
                      value={filterFeeCategory}
                      onChange={(e) => setFilterFeeCategory(e.target.value)}
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      aria-label="Filter by fee category"
                    >
                      <option value="all">All</option>
                      {transferSubTab === 'platform' ? (
                        <>
                          <option value="application">Application Fee</option>
                          <option value="scholarship">Scholarship Fee</option>
                          <option value="i20_control">I-20 Control Fee</option>
                          <option value="selection_process">Selection Process Fee</option>
                        </>
                      ) : (
                        <>
                          <option value="custom">Custom Fees</option>
                          <option value="test">Test Fees</option>
                          <option value="other">Other</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Transfers List */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {transferSubTab === 'platform' ? 'Transações via Plataforma' : 'Transações Stripe Connect'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {transferSubTab === 'platform' 
                      ? 'Transações de taxas de aplicação, bolsas e outros serviços da plataforma'
                      : 'Transações personalizadas enviadas diretamente via Stripe Connect'
                    }
                  </p>
                </div>
                {loading ? (
                  <div className="p-8 sm:p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading transfers...</p>
                  </div>
                ) : error ? (
                  <div className="p-8 sm:p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600">{error}</p>
                    <button
                      onClick={fetchTransfers}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                ) : transfers.length === 0 ? (
                  <div className="p-8 sm:p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-600">
                      {transferSubTab === 'platform' 
                        ? 'No platform transactions found'
                        : 'No Stripe Connect transactions found'
                      }
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <div className="px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-slate-900">Transfers</h3>
                          <div className="flex items-center space-x-4">
                            <label htmlFor="page-size-select" className="text-sm text-slate-600">Show:</label>
                            <select
                              id="page-size-select"
                              value={pageSize}
                              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                              className="px-3 py-1 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              aria-label="Select number of transfers to display per page"
                            >
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              {transferSubTab === 'platform' ? 'Fee Type' : 'Transaction Type'}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Student
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Scholarship
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {transfers.map((transfer) => (
                            <tr key={transfer.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {getStatusIcon(transfer.status)}
                                  <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transfer.status)}`}>
                                    {getStatusText(transfer.status)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  {transfer.fee_category && (
                                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getFeeCategoryColor(transfer.fee_category)}`}>
                                      {getFeeCategoryIcon(transfer.fee_category)}
                                      <span className="ml-1">{transfer.fee_category.replace('_', ' ')}</span>
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  {transfer.fee_type}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className={getStudentDisplayStyle(transfer)}>
                                    {getStudentDisplayName(transfer)}
                                  </div>
                                  {getStudentDisplayInfo(transfer) && (
                                    <>
                                      {transfer.student_country && (
                                        <div className="text-xs text-slate-500 flex items-center">
                                          <MapPin className="w-3 h-3 mr-1" />
                                          {getStudentDisplayInfo(transfer)?.country}
                                        </div>
                                      )}
                                      {transfer.student_level && (
                                        <div className="text-xs text-slate-500 flex items-center">
                                          <GraduationCap className="w-3 h-3 mr-1" />
                                          {getStudentDisplayInfo(transfer)?.level}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-slate-900">
                                  {transfer.scholarship_title || 'N/A'}
                                </div>
                                {transfer.scholarship_field && (
                                  <div className="text-xs text-slate-500">
                                    {transfer.scholarship_field}
                                  </div>
                                )}
                                {transfer.scholarship_amount && (
                                  <div className="text-xs text-slate-500">
                                    {formatScholarshipAmount(transfer.scholarship_amount)}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900">
                                  {formatAmount(transfer.amount)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-slate-900">
                                  {formatDate(transfer.created_at)}
                                </div>
                                {transfer.hours_since_transfer && (
                                  <div className="text-xs text-slate-500">
                                    {Math.round(transfer.hours_since_transfer)}h ago
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                  onClick={() => setSelectedTransfer(transfer)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Pagination */}
                    {totalCount > 0 && (
                      <div className="px-6 py-4 border-t border-slate-200">
                        <div className="flex items-center justify-center">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              className="px-3 py-1 border border-slate-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                              aria-label="Go to previous page"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => handlePageChange(pageNum)}
                                  className={`px-3 py-1 border rounded-md text-sm ${
                                    currentPage === pageNum
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                            
                            <button
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              className="px-3 py-1 border border-slate-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                              aria-label="Go to next page"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="text-center mt-2">
                          <div className="text-sm text-slate-700">
                            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            /* Notifications Tab */
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <StripeConnectPaymentNotifications universityId={university?.id || ''} />
            </div>
          )}
        </div>

        {/* Transfer Details Modal */}
        {selectedTransfer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Transfer Details</h3>
                  <button
                    onClick={() => setSelectedTransfer(null)}
                    className="text-slate-400 hover:text-slate-600"
                    aria-label="Close transfer details"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Transfer Information */}
                <div>
                  <h4 className="font-medium text-slate-900 mb-3">Transfer Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <span className="text-sm font-medium text-slate-600">Status:</span>
                      <div className="flex items-center mt-1">
                        {getStatusIcon(selectedTransfer.status)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedTransfer.status)}`}>
                          {getStatusText(selectedTransfer.status)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <span className="text-sm font-medium text-slate-600">Amount:</span>
                      <div className="text-lg font-semibold text-slate-900 mt-1">
                        {formatAmount(selectedTransfer.amount)}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <span className="text-sm font-medium text-slate-600">Fee Type:</span>
                      <div className="text-sm text-slate-900 mt-1">
                        {selectedTransfer.fee_type}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <span className="text-sm font-medium text-slate-600">Created:</span>
                      <div className="text-sm text-slate-900 mt-1">
                        {formatDate(selectedTransfer.created_at)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student Information */}
                {(getStudentDisplayInfo(selectedTransfer) || selectedTransfer.student_name?.startsWith('Student ID:')) && (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-3">Student Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <span className="text-sm font-medium text-slate-600">Name:</span>
                        <div className={getStudentDisplayStyle(selectedTransfer)}>
                          {getStudentDisplayName(selectedTransfer)}
                        </div>
                      </div>
                      {getStudentDisplayInfo(selectedTransfer) && (
                        <>
                          {selectedTransfer.student_country && (
                            <div className="bg-slate-50 rounded-lg p-3">
                              <span className="text-sm font-medium text-slate-600">Country:</span>
                              <div className="text-sm text-slate-900 mt-1">
                                {getStudentDisplayInfo(selectedTransfer)?.country}
                              </div>
                            </div>
                          )}
                          {selectedTransfer.student_level && (
                            <div className="bg-slate-50 rounded-lg p-3">
                              <span className="text-sm font-medium text-slate-600">Academic Level:</span>
                              <div className="text-sm text-slate-900 mt-1">
                                {getStudentDisplayInfo(selectedTransfer)?.level}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {selectedTransfer.student_field && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <span className="text-sm font-medium text-slate-600">Field of Interest:</span>
                          <div className="text-sm text-slate-900 mt-1">
                            {selectedTransfer.student_field}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Scholarship Information */}
                {selectedTransfer.scholarship_title && (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-3">Scholarship Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <span className="text-sm font-medium text-slate-600">Title:</span>
                        <div className="text-sm text-slate-900 mt-1">
                          {selectedTransfer.scholarship_title}
                        </div>
                      </div>
                      {selectedTransfer.scholarship_amount && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <span className="text-sm font-medium text-slate-600">Scholarship Amount:</span>
                          <div className="text-sm text-slate-900 mt-1">
                            {formatScholarshipAmount(selectedTransfer.scholarship_amount)}
                          </div>
                        </div>
                      )}
                      {selectedTransfer.scholarship_field && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <span className="text-sm font-medium text-slate-600">Field of Study:</span>
                          <div className="text-sm text-slate-900 mt-1">
                            {selectedTransfer.scholarship_field}
                          </div>
                        </div>
                      )}
                      {selectedTransfer.scholarship_deadline && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <span className="text-sm font-medium text-slate-600">Deadline:</span>
                          <div className="text-sm text-slate-900 mt-1">
                            {new Date(selectedTransfer.scholarship_deadline).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Application Information */}
                {selectedTransfer.application_status && (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-3">Application Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <span className="text-sm font-medium text-slate-600">Status:</span>
                        <div className="text-sm text-slate-900 mt-1">
                          {selectedTransfer.application_progress}
                        </div>
                      </div>
                      {selectedTransfer.applied_at && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <span className="text-sm font-medium text-slate-600">Applied:</span>
                          <div className="text-sm text-slate-900 mt-1">
                            {formatDate(selectedTransfer.applied_at)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Technical Details */}
                <div>
                  <h4 className="font-medium text-slate-900 mb-3">Technical Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <span className="text-sm font-medium text-slate-600">Session ID:</span>
                      <div className="text-xs font-mono text-slate-900 mt-1 break-all">
                        {selectedTransfer.session_id}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <span className="text-sm font-medium text-slate-600">Payment Intent:</span>
                      <div className="text-xs font-mono text-slate-900 mt-1 break-all">
                        {selectedTransfer.payment_intent_id}
                      </div>
                    </div>
                    {selectedTransfer.transfer_id && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <span className="text-sm font-medium text-slate-600">Transfer ID:</span>
                        <div className="text-xs font-mono text-slate-900 mt-1 break-all">
                          {selectedTransfer.transfer_id}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-200">
                <button
                  onClick={() => setSelectedTransfer(null)}
                  className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProfileCompletionGuard>
  );
};

export default StripeConnect;
