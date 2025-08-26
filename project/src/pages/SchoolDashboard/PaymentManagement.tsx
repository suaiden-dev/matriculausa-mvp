import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Filter, 
  Download, 
  Eye, 
  Calendar, 
  User, 
  Building, 
  CreditCard, 
  Banknote, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  Award,
  FileText,
  Globe,
  Plus,
  XCircle,
  Shield,
  Save
} from 'lucide-react';
import { useUniversity } from '../../context/UniversityContext';
import { useAuth } from '../../hooks/useAuth';
import { usePayments } from '../../hooks/usePayments';
import ProfileCompletionGuard from '../../components/ProfileCompletionGuard';
import { UniversityPaymentRequestService } from '../../services/UniversityPaymentRequestService';
import { supabase } from '../../lib/supabase';

const PaymentManagement: React.FC = () => {
  const { university } = useUniversity();
  const { user } = useAuth();
  
  const {
    payments,
    stats,
    totalCount,
    totalPages,
    loading,
    error: paymentsError,
    currentPage,
    pageSize,
    filters,
    loadPayments,
    updateFilters,
    clearFilters,
    handlePageChange,
    handlePageSizeChange,
    exportPayments,
    hasPayments,
    hasFilters,
  } = usePayments(university?.id);
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Payment request modal state
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);
  const [paymentRequestAmount, setPaymentRequestAmount] = useState<number>(0);
  const [payoutMethod, setPayoutMethod] = useState<'zelle' | 'bank_transfer' | 'stripe'>('zelle');
  const [payoutDetails, setPayoutDetails] = useState<Record<string, any>>({});
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // University payment requests state
  const [universityPaymentRequests, setUniversityPaymentRequests] = useState<any[]>([]);
  const [loadingUniversityRequests, setLoadingUniversityRequests] = useState(false);
  const [universityBalance, setUniversityBalance] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'student-payments' | 'university-requests'>('student-payments');
  
  // Request details modal state
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showRequestDetailsModal, setShowRequestDetailsModal] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportPayments();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment_requests_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting payments:', err);
    } finally {
      setExporting(false);
    }
  };

  const loadUniversityPaymentRequests = async () => {
    if (!university?.id) return;
    
    try {
      setLoadingUniversityRequests(true);
      const requests = await UniversityPaymentRequestService.listUniversityPaymentRequests(university.id);
      setUniversityPaymentRequests(requests);
      
      // Calcular saldo disponível baseado no faturamento real da universidade
      // O saldo deve considerar apenas requests já pagos (não pending/approved)
      const totalPaidOut = requests
        .filter((r: any) => r.status === 'paid')
        .reduce((sum: number, r: any) => sum + r.amount_usd, 0);
      
      // Buscar o total real de application fees recebidas pela universidade
      // Este é o faturamento real, independente de filtros
      const { data: totalRevenueData } = await supabase
        .from('scholarship_applications')
        .select(`
          scholarships!inner(
            application_fee_amount,
            university_id
          )
        `)
        .eq('scholarships.university_id', university.id)
        .eq('is_application_fee_paid', true);
      
      // Calcular o faturamento total real
      const totalApplicationFeesReceived = totalRevenueData?.reduce((sum: number, app: any) => {
        const feeAmount = app.scholarships?.application_fee_amount || 0;
        return sum + feeAmount;
      }, 0) || 0;
      
      // O saldo disponível é: Faturamento Real - Pago - Aprovado (reservado)
      const totalApproved = requests
        .filter((r: any) => r.status === 'approved')
        .reduce((sum: number, r: any) => sum + r.amount_usd, 0);
      
      // Saldo disponível = Faturamento Real - Pago - Aprovado (reservado)
      const availableBalance = Math.max(0, totalApplicationFeesReceived - totalPaidOut - totalApproved);
      
      console.log('💰 [Balance] Calculation:', {
        totalApplicationFeesReceived,
        totalPaidOut,
        totalApproved,
        availableBalance,
        requestsCount: requests.length,
        paidRequests: requests.filter(r => r.status === 'paid').length,
        pendingRequests: requests.filter(r => r.status === 'pending').length,
        approvedRequests: requests.filter(r => r.status === 'approved').length,
        requests: requests.map(r => ({
          id: r.id.slice(0, 8),
          status: r.status,
          amount: r.amount_usd
        }))
      });
      
      setUniversityBalance(availableBalance);
    } catch (error: any) {
      console.error('Error loading university payment requests:', error);
    } finally {
      setLoadingUniversityRequests(false);
    }
  };

  // Carregar payment requests da universidade quando a universidade mudar
  React.useEffect(() => {
    if (university?.id) {
      loadUniversityPaymentRequests();
    }
  }, [university?.id]);

  const handleFilterChange = () => {
    setShowFilters(false);
  };

  // Real-time validation of requested amount
  const validatePaymentAmount = (amount: number) => {
    const availableBalance = universityBalance;
    if (amount > availableBalance) {
      setInputError(`Insufficient balance. You have ${formatCurrency(availableBalance)} available.`);
      return false;
    } else if (amount <= 0) {
      setInputError('Amount must be greater than 0');
      return false;
    } else {
      setInputError(null);
      return true;
    }
  };

  // Check if requested amount is valid
  const isPaymentAmountValid = () => {
    return paymentRequestAmount > 0 && paymentRequestAmount <= universityBalance;
  };

  const handleSubmitPaymentRequest = async () => {
    if (!user?.id || !university?.id) return;
    
    // Valid amount validation
    if (!paymentRequestAmount || paymentRequestAmount <= 0) {
      setError('Please enter a valid amount for payment request');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    // Insufficient balance validation
    const availableBalance = universityBalance;
    if (paymentRequestAmount > availableBalance) {
      setError(`Insufficient balance. You have ${formatCurrency(availableBalance)} available, but requested ${formatCurrency(paymentRequestAmount)}.`);
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    try {
      setSubmittingPayout(true);
      
      // Create payment request using the service
      await UniversityPaymentRequestService.createPaymentRequest({
        universityId: university.id,
        userId: user.id,
        amount: paymentRequestAmount,
        payoutMethod: payoutMethod,
        payoutDetails: payoutDetails
      });
      
      setShowPaymentRequestModal(false);
      setPaymentRequestAmount(0);
      setPayoutDetails({});
      
      // Recarregar os requests e saldo para atualizar a interface
      await loadUniversityPaymentRequests();
      
      // Show success message
      setError(null);
      setSuccessMessage('Payment request submitted successfully! It will be reviewed by our admin team.');
      setTimeout(() => setSuccessMessage(null), 5000);
      
    } catch (e: any) {
      setError(e.message || 'Failed to submit payment request');
      setTimeout(() => setError(null), 4000);
    } finally {
      setSubmittingPayout(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      succeeded: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Paid' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Processing' },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Failed' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getApplicationStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Rejected' },
      under_review: { color: 'bg-blue-100 text-blue-800', icon: Eye, label: 'Under Review' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  return (
    <ProfileCompletionGuard 
      isProfileCompleted={university?.profile_completed}
      title="Complete your profile to manage payment requests"
      description="Finish setting up your university profile to track and manage scholarship payment requests"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Payment Requests Management</h1>
            <p className="text-gray-600 mt-2">Monitor and manage all scholarship payment requests and application fees</p>
          </div>
          <div className="flex items-center space-x-3 ml-8">
            <button
              onClick={() => setShowPaymentRequestModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#05294E] hover:bg-[#05294E]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#05294E] transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Request Payment
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 ease-in-out"
            >
              <Filter className={`w-4 h-4 mr-2 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
              Filters
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#05294E] hover:bg-[#05294E]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#05294E] disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export CSV
            </button>
          </div>
        </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('student-payments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'student-payments'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Student Payments
          </button>
          <button
            onClick={() => setActiveTab('university-requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'university-requests'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            University Payment Requests
          </button>
        </nav>
      </div>

            {/* Student Payments Tab Content */}
      {activeTab === 'student-payments' && (
        <>
          {/* Filters */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            showFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <input
                    id="search-query"
                    type="text"
                    placeholder="Search by name or email..."
                    value={filters.search_query}
                    onChange={(e) => updateFilters({ search_query: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Search payment requests by student name or email"
                  />
                </div>
                <div>
                  <label htmlFor="application-status-filter" className="block text-sm font-medium text-gray-700 mb-2">Application Status</label>
                  <select
                    id="application-status-filter"
                    value={filters.application_status_filter}
                    onChange={(e) => updateFilters({ application_status_filter: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Filter by application status"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="under_review">Under Review</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="payment-type-filter" className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                  <select
                    id="payment-type-filter"
                    value={filters.payment_type_filter}
                    onChange={(e) => updateFilters({ payment_type_filter: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Filter by payment type"
                  >
                    <option value="all">All Types</option>
                    <option value="application_fee">Application Fee</option>
                    <option value="scholarship_fee">Scholarship Fee</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <div className="space-y-2">
                    <input
                      id="date-from"
                      type="date"
                      value={filters.date_from}
                      onChange={(e) => updateFilters({ date_from: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label="Filter payment requests from date"
                    />
                    <input
                      id="date-to"
                      type="date"
                      value={filters.date_to}
                      onChange={(e) => updateFilters({ date_to: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label="Filter payment requests to date"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Applications</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_applications}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Application Fees Received</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_revenue)}</p>
                  <p className="text-xs text-gray-500">From paid applications</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Paid Application Fees</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.paid_application_fees}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Application Fees</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_application_fees}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Available Balance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loadingUniversityRequests ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
                    ) : (
                      formatCurrency(universityBalance)
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Requests Table */}
          <div className="bg-white shadow border rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Payment Requests</h3>
                <div className="flex items-center space-x-4">
                  <label htmlFor="page-size-select" className="text-sm text-gray-600">Show:</label>
                  <select
                    id="page-size-select"
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Select number of payment requests to display per page"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : paymentsError ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-600">{paymentsError}</p>
                <button
                  onClick={() => loadPayments(currentPage)}
                  className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student & Application
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scholarship Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Application Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applied Date
                      </th>
                      {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th> */}
                  </tr>
                </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{payment.student_name}</div>
                            <div className="text-sm text-gray-500">{payment.student_email}</div>
                            <div className="text-xs text-gray-400 flex items-center mt-1">
                              <Globe className="w-3 h-3 mr-1" />
                              {payment.student_country}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{payment.scholarship_title}</div>
                            {payment.scholarship_field && (
                              <div className="text-xs text-gray-500">
                                {payment.scholarship_field}
                              </div>
                            )}
                            {/* {payment.scholarship_amount && (
                              <div className="text-xs text-gray-500">
                                {formatScholarshipAmount(payment.scholarship_amount)}
                              </div>
                            )} */}
                            {/* <div className="text-xs text-gray-400 flex items-center mt-1">
                              <Award className="w-3 h-3 mr-1" />
                              {payment.scholarship_type || 'Not specified'}
                            </div> */}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getApplicationStatusBadge(payment.application_status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(payment.status)}
                          <div className="text-xs text-gray-500 mt-1">
                            {payment.payment_type === 'application_fee' ? 'Application Fee' : 'Scholarship Fee'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(payment.amount_charged)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(payment.applied_at)}
                      </td>
                        {/* <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                            title="View application details"
                            aria-label="View application details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="text-gray-600 hover:text-gray-900"
                            title="Download application"
                            aria-label="Download application"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      aria-label="Go to next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        </>
      )}

      {/* University Payment Requests Tab Content */}
      {activeTab === 'university-requests' && (
        <>
          {/* Stats Cards for University Requests */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{universityPaymentRequests.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Requested</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(universityPaymentRequests.reduce((sum, r) => sum + r.amount_usd, 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Available Balance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loadingUniversityRequests ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
                    ) : (
                      formatCurrency(universityBalance)
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* University Payment Requests Section */}
        <div className="bg-white shadow border rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">University Payment Requests</h3>
              <p className="text-sm text-gray-600">Your submitted payment requests and their status</p>
            </div>
          </div>

          {loadingUniversityRequests ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : universityPaymentRequests.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No payment requests yet</h3>
              <p className="text-gray-500">Submit your first payment request to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Details
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {universityPaymentRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Payment Request #{request.id.slice(0, 8)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.user?.full_name || request.user?.email || 'Unknown User'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">{formatCurrency(request.amount_usd)}</div>
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
                        {formatDate(request.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="space-y-2">
                          {/* Botão de detalhes */}
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRequestDetailsModal(true);
                            }}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Details
                          </button>
                          
                          {/* Alertas quando há notas do admin */}
                          {request.admin_notes && (
                            <div className="flex items-center space-x-1">
                              {request.status === 'rejected' ? (
                                <>
                                  <AlertCircle className="w-3 h-3 text-red-500" />
                                  <span className="text-xs text-red-600 font-medium">
                                    Has rejection reason
                                  </span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3 h-3 text-blue-500" />
                                  <span className="text-xs text-blue-600 font-medium">
                                    Has admin notes
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
      )}

      {/* Payment Request Modal */}
      {showPaymentRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Request Payment</h3>
              <button onClick={() => setShowPaymentRequestModal(false)} title="Close" className="text-gray-500 hover:text-gray-700">
                <XCircle className="h-5 w-5"/>
              </button>
            </div>

            <div className="space-y-4">
              {/* Error message */}
              {inputError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-800 font-medium">{inputError}</span>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="payment-request-amount">Amount (USD)</label>
                <input
                  id="payment-request-amount"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={Number.isNaN(paymentRequestAmount) ? '' : String(paymentRequestAmount)}
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/[^0-9]/g, '');
                    const next = onlyDigits === '' ? 0 : parseInt(onlyDigits, 10);
                    setPaymentRequestAmount(next);
                    validatePaymentAmount(next);
                  }}
                  onBlur={() => {
                    const max = universityBalance;
                    if (paymentRequestAmount > max) {
                      setPaymentRequestAmount(max);
                      validatePaymentAmount(max);
                    }
                  }}
                  placeholder="Enter amount in USD"
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 ${
                    inputError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                  }`}
                />
                {inputError ? (
                  <p className="text-xs text-red-600 mt-1">{inputError}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {formatCurrency(universityBalance)} • Requested: {formatCurrency(paymentRequestAmount)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="payout-method">Payment method</label>
                <select id="payout-method" value={payoutMethod} onChange={(e)=> setPayoutMethod(e.target.value as 'zelle' | 'bank_transfer' | 'stripe')} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="zelle">Zelle</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>

              {/* Dynamic fields */}
              {payoutMethod === 'zelle' && (
                <div className="grid grid-cols-1 gap-3">
                  <input placeholder="Zelle email" className="border border-gray-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, zelle_email: e.target.value})}/>
                  <input placeholder="Zelle phone" className="border border-gray-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, zelle_phone: e.target.value})}/>
                  <input placeholder="Account holder name" className="border border-gray-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, account_name: e.target.value})}/>
                </div>
              )}
              {payoutMethod === 'bank_transfer' && (
                <div className="grid grid-cols-1 gap-3">
                  <input placeholder="Bank name" className="border border-gray-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, bank_name: e.target.value})}/>
                  <input placeholder="Account holder name" className="border border-gray-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, account_name: e.target.value})}/>
                  <input placeholder="Routing number" className="border border-gray-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, routing_number: e.target.value})}/>
                  <input placeholder="Account number" className="border border-gray-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, account_number: e.target.value})}/>
                  <input placeholder="SWIFT / IBAN (optional)" className="border border-gray-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, swift: e.target.value, iban: e.target.value})}/>
                </div>
              )}
              {payoutMethod === 'stripe' && (
                <div className="grid grid-cols-1 gap-3">
                  <input placeholder="Stripe email" className="border border-gray-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, stripe_email: e.target.value})}/>
                  <input placeholder="Stripe account id (optional)" className="border border-gray-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, stripe_account_id: e.target.value})}/>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={()=> setShowPaymentRequestModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700">Cancel</button>
                <button 
                  onClick={handleSubmitPaymentRequest} 
                  disabled={submittingPayout || !isPaymentAmountValid()} 
                  className={`px-4 py-2 rounded-lg text-white transition-colors ${
                    isPaymentAmountValid() 
                      ? 'bg-indigo-600 hover:bg-indigo-700' 
                      : 'bg-gray-400 cursor-not-allowed'
                  } disabled:opacity-60`}
                  title={!isPaymentAmountValid() ? 'Please enter a valid amount within your available balance' : 'Submit payment request'}
                >
                  {submittingPayout ? 'Submitting...' : 'Submit request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 bg-green-500 text-white">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 bg-red-500 text-white">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Request Details Modal */}
      {showRequestDetailsModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Payment Request Details</h3>
                <button 
                  onClick={() => setShowRequestDetailsModal(false)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Request Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Request Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-semibold">{formatCurrency(selectedRequest.amount_usd)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method:</span>
                      <span className="font-semibold capitalize">{selectedRequest.payout_method.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                      <span>{formatDate(selectedRequest.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Payment Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {selectedRequest.payout_details_preview ? (
                      (() => {
                        const details = selectedRequest.payout_details_preview;
                        const method = selectedRequest.payout_method;
                        
                        if (method === 'zelle') {
                          return (
                            <div className="space-y-3">
                              {details.zelle_email && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">Zelle Email:</span>
                                  <span className="text-gray-800">{details.zelle_email}</span>
                                </div>
                              )}
                              {details.zelle_phone && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">Zelle Phone:</span>
                                  <span className="text-gray-800">{details.zelle_phone}</span>
                                </div>
                              )}
                              {details.account_name && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">Account Holder:</span>
                                  <span className="text-gray-800">{details.account_name}</span>
                                </div>
                              )}
                            </div>
                          );
                        } else if (method === 'bank_transfer') {
                          return (
                            <div className="space-y-3">
                              {details.bank_name && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">Bank Name:</span>
                                  <span className="text-gray-800">{details.bank_name}</span>
                                </div>
                              )}
                              {details.account_name && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">Account Holder:</span>
                                  <span className="text-gray-800">{details.account_name}</span>
                                </div>
                              )}
                              {details.routing_number && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">Routing Number:</span>
                                  <span className="text-gray-800 font-mono">{details.routing_number}</span>
                                </div>
                              )}
                              {details.account_number && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">Account Number:</span>
                                  <span className="text-gray-800 font-mono">{details.account_number}</span>
                                </div>
                              )}
                              {(details.swift || details.iban) && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">SWIFT/IBAN:</span>
                                  <span className="text-gray-800 font-mono">{details.swift || details.iban}</span>
                                </div>
                              )}
                            </div>
                          );
                        } else if (method === 'stripe') {
                          return (
                            <div className="space-y-3">
                              {details.stripe_email && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">Stripe Email:</span>
                                  <span className="text-gray-800">{details.stripe_email}</span>
                                </div>
                              )}
                              {details.stripe_account_id && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium">Account ID:</span>
                                  <span className="text-gray-800 font-mono">{details.stripe_account_id}</span>
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          // Fallback para outros métodos ou dados não reconhecidos
                          return (
                            <div className="space-y-2">
                              {Object.entries(details).map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center">
                                  <span className="text-gray-600 font-medium capitalize">
                                    {key.replace(/_/g, ' ')}:
                                  </span>
                                  <span className="text-gray-800 font-mono">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                      })()
                    ) : (
                      <div className="text-center py-4">
                        <CreditCard className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No payment details available for this request</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Notes - Destaque Principal */}
                {selectedRequest.admin_notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      {selectedRequest.status === 'rejected' ? (
                        <>
                          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                          Rejection Reason
                        </>
                      ) : selectedRequest.status === 'approved' ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-blue-500 mr-2" />
                          Approval Notes
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-gray-500 mr-2" />
                          Admin Notes
                        </>
                      )}
                    </h4>
                    <div className={`rounded-lg p-4 border-l-4 ${
                      selectedRequest.status === 'rejected' 
                        ? 'bg-red-50 border-red-400' 
                        : selectedRequest.status === 'approved'
                        ? 'bg-blue-50 border-blue-400'
                        : 'bg-gray-50 border-gray-400'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${
                          selectedRequest.status === 'rejected' ? 'bg-red-400' :
                          selectedRequest.status === 'approved' ? 'bg-blue-400' :
                          'bg-gray-400'
                        }`}></div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium mb-2 ${
                            selectedRequest.status === 'rejected' ? 'text-red-700' :
                            selectedRequest.status === 'approved' ? 'text-blue-700' :
                            'text-gray-700'
                          }`}>
                            {selectedRequest.status === 'rejected' ? 'Why was this request rejected?' :
                             selectedRequest.status === 'approved' ? 'Additional information about approval:' :
                             'Administrative notes:'}
                          </p>
                          <div className={`text-sm leading-relaxed ${
                            selectedRequest.status === 'rejected' ? 'text-red-800' :
                            selectedRequest.status === 'approved' ? 'text-blue-800' :
                            'text-gray-800'
                          }`}>
                            {selectedRequest.admin_notes}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* No Admin Notes */}
                {!selectedRequest.admin_notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Admin Notes</h4>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No admin notes available for this request</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end pt-4 border-t">
                  <button
                    onClick={() => setShowRequestDetailsModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </ProfileCompletionGuard>
  );
};

export default PaymentManagement;