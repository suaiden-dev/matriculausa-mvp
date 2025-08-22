import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Filter,
  Eye,
  BarChart3,
  Download,
  RefreshCw,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface SellerPerformance {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  total_students: number;
  total_revenue: number;
  conversion_rate: number;
  active_students: number;
  pending_payments: number;
  last_referral_date: string;
  created_at: string;
}

interface StudentDetail {
  id: string;
  full_name: string;
  email: string;
  country?: string;
  referred_at: string;
  payment_status: 'pending' | 'completed' | 'cancelled';
  total_paid: number;
  application_fees: number;
  scholarship_fees: number;
  last_activity: string;
  applications_count: number;
}

interface PaymentHistory {
  id: string;
  student_name: string;
  amount: number;
  fee_type: string;
  status: string;
  created_at: string;
  session_id: string;
}

const SellerPerformanceTracking: React.FC = () => {
  const [sellers, setSellers] = useState<SellerPerformance[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<SellerPerformance | null>(null);
  const [students, setStudents] = useState<StudentDetail[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'overview' | 'students' | 'payments'>('overview');
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'affiliate_admin') {
      loadSellerPerformanceData();
    }
  }, [user]);

  const loadSellerPerformanceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar dados de performance dos vendedores
      const { data: performanceData, error: performanceError } = await supabase
        .rpc('get_seller_performance_data_test');

      if (performanceError) {
        console.error('Error loading seller performance:', performanceError);
        throw new Error(`Failed to load seller performance: ${performanceError.message}`);
      }

      setSellers(performanceData || []);

    } catch (error: any) {
      console.error('Error loading seller performance data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSellerStudents = useCallback(async (sellerId: string) => {
    try {
      setLoading(true);

      // Buscar estudantes referenciados por este vendedor
      const { data: studentsData, error: studentsError } = await supabase
        .from('affiliate_referrals')
        .select(`
          *,
          referred_user:referred_id(
            id,
            email
          ),
          user_profiles!referred_id(
            full_name,
            country
          ),
          scholarship_applications!referred_id(
            id,
            status,
            created_at
          )
        `)
        .eq('referrer_id', sellerId)
        .order('created_at', { ascending: false });

      if (studentsError) throw studentsError;

      // Processar dados dos estudantes
      const processedStudents = (studentsData || []).map(referral => {
        const studentProfile = referral.user_profiles;
        const applications = referral.scholarship_applications || [];
        
        return {
          id: referral.referred_id,
          full_name: studentProfile?.full_name || 'Nome não disponível',
          email: referral.referred_user?.email || 'Email não disponível',
          country: studentProfile?.country || 'País não disponível',
          referred_at: referral.created_at,
          payment_status: referral.status as 'pending' | 'completed' | 'cancelled',
          total_paid: referral.payment_amount || 0,
          application_fees: 0, // Será calculado baseado nas aplicações
          scholarship_fees: 0, // Será calculado baseado nas aplicações
          last_activity: referral.completed_at || referral.created_at,
          applications_count: applications.length
        };
      });

      setStudents(processedStudents);

      // Buscar histórico de pagamentos
      await loadPaymentHistory(sellerId);

    } catch (error: any) {
      console.error('Error loading seller students:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPaymentHistory = async (sellerId: string) => {
    try {
      // Buscar histórico de pagamentos dos estudantes referenciados
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('stripe_sessions')
        .select(`
          id,
          amount_total,
          status,
          created_at,
          metadata,
          user_profiles!user_id(
            full_name
          )
        `)
        .contains('metadata', { referrer_id: sellerId })
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Processar histórico de pagamentos
      const processedPayments = (paymentsData || []).map(payment => ({
        id: payment.id,
        student_name: payment.user_profiles?.full_name || 'Estudante não identificado',
        amount: (payment.amount_total || 0) / 100, // Converter de centavos
        fee_type: payment.metadata?.fee_type || 'Unknown',
        status: payment.status,
        created_at: payment.created_at,
        session_id: payment.id
      }));

      setPaymentHistory(processedPayments);

    } catch (error: any) {
      console.error('Error loading payment history:', error);
    }
  };

  const handleSellerSelect = (seller: SellerPerformance) => {
    setSelectedSeller(seller);
    loadSellerStudents(seller.id);
    setViewMode('overview');
  };

  const exportData = (type: 'students' | 'payments') => {
    let data: any[] = [];
    let filename = '';

    if (type === 'students' && selectedSeller) {
      data = students;
      filename = `${selectedSeller.name}_students_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'payments' && selectedSeller) {
      data = paymentHistory;
      filename = `${selectedSeller.name}_payments_${new Date().toISOString().split('T')[0]}.csv`;
    }

    if (data.length === 0) return;

    const csvContent = convertToCSV(data);
    downloadCSV(csvContent, filename);
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && !selectedSeller) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-slate-600">Loading seller performance data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={loadSellerPerformanceData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Seller Performance Tracking</h1>
          <p className="text-slate-600">Monitor seller performance and student conversions</p>
        </div>
        <button
          onClick={loadSellerPerformanceData}
          className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </button>
      </div>

      {/* Seller Selection */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Select Seller to Monitor</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sellers.map((seller) => (
            <div
              key={seller.id}
              onClick={() => handleSellerSelect(seller)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedSeller?.id === seller.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-slate-900">{seller.name}</h3>
                <span className="text-xs text-slate-500">{seller.referral_code}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-slate-500">Students</p>
                  <p className="font-semibold text-slate-900">{seller.total_students}</p>
                </div>
                <div>
                  <p className="text-slate-500">Revenue</p>
                  <p className="font-semibold text-green-600">{formatCurrency(seller.total_revenue)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedSeller && (
        <>
          {/* Seller Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-500">Total Students</p>
                  <p className="text-2xl font-bold text-slate-900">{selectedSeller.total_students}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedSeller.total_revenue)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-500">Conversion Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{selectedSeller.conversion_rate}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-500">Active Students</p>
                  <p className="text-2xl font-bold text-orange-600">{selectedSeller.active_students}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="border-b border-slate-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setViewMode('overview')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    viewMode === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setViewMode('students')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    viewMode === 'students'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Students ({students.length})
                </button>
                <button
                  onClick={() => setViewMode('payments')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    viewMode === 'payments'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Payment History ({paymentHistory.length})
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {viewMode === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Last Referral</span>
                          <span className="text-sm font-medium text-slate-900">
                            {selectedSeller.last_referral_date ? formatDate(selectedSeller.last_referral_date) : 'No referrals yet'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Seller Since</span>
                          <span className="text-sm font-medium text-slate-900">
                            {formatDate(selectedSeller.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Pending Payments</span>
                          <span className="text-sm font-medium text-slate-900">
                            {selectedSeller.pending_payments}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Performance Metrics</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Avg. Revenue per Student</span>
                          <span className="text-sm font-medium text-slate-900">
                            {selectedSeller.total_students > 0 
                              ? formatCurrency(selectedSeller.total_revenue / selectedSeller.total_students)
                              : '$0.00'
                            }
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Monthly Growth</span>
                          <span className="text-sm font-medium text-green-600">+12.5%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={() => exportData('students')}
                      className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Students
                    </button>
                    <button
                      onClick={() => exportData('payments')}
                      className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Payments
                    </button>
                  </div>
                </div>
              )}

              {/* Students Tab */}
              {viewMode === 'students' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-slate-900">Students Referred by {selectedSeller.name}</h3>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                                             <select
                         value={statusFilter}
                         onChange={(e) => setStatusFilter(e.target.value)}
                         className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                         aria-label="Filter students by status"
                       >
                        <option value="all">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Student</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Total Paid</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Applications</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Referred</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Last Activity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {students
                          .filter(student => {
                            const matchesSearch = student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                 student.email.toLowerCase().includes(searchTerm.toLowerCase());
                            const matchesStatus = statusFilter === 'all' || student.payment_status === statusFilter;
                            return matchesSearch && matchesStatus;
                          })
                          .map((student) => (
                            <tr key={student.id} className="hover:bg-slate-50">
                              <td className="px-4 py-4">
                                <div>
                                  <p className="text-sm font-medium text-slate-900">{student.full_name}</p>
                                  <p className="text-sm text-slate-500">{student.email}</p>
                                  <p className="text-xs text-slate-400">{student.country}</p>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(student.payment_status)}`}>
                                  {getStatusIcon(student.payment_status)}
                                  <span className="ml-1 capitalize">{student.payment_status}</span>
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm font-medium text-slate-900">
                                {formatCurrency(student.total_paid)}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-900">
                                {student.applications_count}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-500">
                                {formatDate(student.referred_at)}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-500">
                                {formatDate(student.last_activity)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payments Tab */}
              {viewMode === 'payments' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-slate-900">Payment History for {selectedSeller.name}</h3>
                    <div className="flex space-x-2">
                                             <select
                         value={dateFilter}
                         onChange={(e) => setDateFilter(e.target.value)}
                         className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                         aria-label="Filter payments by date range"
                       >
                        <option value="all">All Time</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="365">Last Year</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Student</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Fee Type</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Session ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {paymentHistory
                          .filter(payment => {
                            if (dateFilter === 'all') return true;
                            const paymentDate = new Date(payment.created_at);
                            const filterDate = new Date();
                            filterDate.setDate(filterDate.getDate() - parseInt(dateFilter));
                            return paymentDate >= filterDate;
                          })
                          .map((payment) => (
                            <tr key={payment.id} className="hover:bg-slate-50">
                              <td className="px-4 py-4">
                                <p className="text-sm font-medium text-slate-900">{payment.student_name}</p>
                              </td>
                              <td className="px-4 py-4 text-sm font-medium text-green-600">
                                {formatCurrency(payment.amount)}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-900">
                                <span className="capitalize">{payment.fee_type.replace('_', ' ')}</span>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                                  {getStatusIcon(payment.status)}
                                  <span className="ml-1 capitalize">{payment.status}</span>
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-500">
                                {formatDate(payment.created_at)}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-500 font-mono">
                                {payment.session_id.substring(0, 8)}...
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SellerPerformanceTracking;
