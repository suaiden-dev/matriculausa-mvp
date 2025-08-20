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
  X
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

const StripeConnectTransfers: React.FC = () => {
  const { user } = useAuth();
  const { university } = useUniversity();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterFeeCategory, setFilterFeeCategory] = useState<string>('all');
  const [totalAmount, setTotalAmount] = useState(0);
  const [successfulTransfers, setSuccessfulTransfers] = useState(0);
  const [activeTab, setActiveTab] = useState<'transfers' | 'notifications'>('transfers');
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);

  useEffect(() => {
    if (university?.id) {
      fetchTransfers();
    }
  }, [university?.id, filterStatus, filterFeeCategory]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('stripe_connect_transfers_detailed')
        .select('*')
        .eq('university_id', university?.id)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterFeeCategory !== 'all') {
        query = query.eq('fee_category', filterFeeCategory);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setTransfers(data || []);

      const total = data?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const successful = data?.filter(t => t.status === 'succeeded').length || 0;
      
      setTotalAmount(total);
      setSuccessfulTransfers(successful);

    } catch (err) {
      console.error('Error fetching transfers:', err);
      setError('Error loading transfers');
    } finally {
      setLoading(false);
    }
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
      title="Complete your profile to access Stripe Connect Transfers"
      description="Finish setting up your university profile to view Stripe Connect transfers and payment notifications"
    >
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Stripe Connect Transfers
              </h1>
            </div>
            <p className="text-slate-600 text-sm sm:text-base max-w-3xl">
              Monitor and track all financial transfers received via Stripe Connect integration with detailed information about fees, scholarships, and students
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Received</p>
                  <p className="text-2xl font-bold text-slate-900">{formatAmount(totalAmount)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Successful</p>
                  <p className="text-2xl font-bold text-slate-900">{successfulTransfers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Transfers</p>
                  <p className="text-2xl font-bold text-slate-900">{transfers.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
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
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
            <div className="border-b border-slate-200">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('transfers')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'transfers'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Transfers
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'notifications'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Payment Notifications
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'transfers' ? (
            <>
              {/* Filters */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
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
                      <option value="application">Application Fee</option>
                      <option value="scholarship">Scholarship Fee</option>
                      <option value="i20_control">I-20 Control Fee</option>
                      <option value="selection_process">Selection Process Fee</option>
                      <option value="custom">Custom Fee</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Transfers List */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
                    <p className="text-slate-600">No transfers found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Fee Type
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
                )}
              </div>
            </>
          ) : (
            /* Notifications Tab */
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <StripeConnectPaymentNotifications universityId={university?.id || ''} />
            </div>
          )}
        </div>

        {/* Transfer Details Modal */}
        {selectedTransfer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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

export default StripeConnectTransfers;
