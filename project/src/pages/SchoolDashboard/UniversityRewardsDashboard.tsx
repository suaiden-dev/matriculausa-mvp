import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  Search,
  Download,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  BarChart3,
  ArrowUpRight,
  CreditCard,
  Wallet,
  Banknote,
  Shield,
  Zap
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUniversity } from '../../context/UniversityContext';
import { TuitionRewardsService } from '../../services/TuitionRewardsService';
import { TuitionRedemption, UniversityRewardsAccount } from '../../types';
import { PayoutService } from '../../services/PayoutService';
import type { UniversityPayoutRequest, PayoutMethod } from '../../types';
import ProfileCompletionGuard from '../../components/ProfileCompletionGuard';
import MatriculaRewardsOptIn from '../../components/MatriculaRewardsOptIn';

const UniversityRewardsDashboard: React.FC = () => {
  const { user } = useAuth();
  const { university } = useUniversity();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // States for data
  const [rewardsAccount, setRewardsAccount] = useState<UniversityRewardsAccount | null>(null);
  const [redemptions, setRedemptions] = useState<TuitionRedemption[]>([]);
  const [stats, setStats] = useState({
    totalReceivedCoins: 0,
    totalDiscountsSent: 0,
    totalDiscountAmount: 0,
    balanceCoins: 0,
    recentRedemptions: 0
  });

  // State for program participation control
  const [participatesInProgram, setParticipatesInProgram] = useState<boolean | null>(null);

  // States for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);

  // States for payout
  const [payouts, setPayouts] = useState<UniversityPayoutRequest[]>([]);
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);
  const [paymentRequestAmount, setPaymentRequestAmount] = useState<number>(0);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('zelle');
  const [payoutDetails, setPayoutDetails] = useState<Record<string, any>>({});
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  // Real-time validation of requested amount
  const validatePaymentAmount = (amount: number) => {
    const availableBalance = rewardsAccount?.balance_coins || 0;
    if (amount > availableBalance) {
      setInputError(`Insufficient balance. You have ${availableBalance.toLocaleString()} coins available.`);
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
    return paymentRequestAmount > 0 && paymentRequestAmount <= (rewardsAccount?.balance_coins || 0);
  };

  useEffect(() => {
    if (university?.id) {
      loadMatriculaRewardsData();
    }
  }, [university?.id]);

  const loadMatriculaRewardsData = async () => {
    if (!university?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Check if university participates in the program
      setParticipatesInProgram(university.participates_in_matricula_rewards || false);

      // If not participating, don't load program data
      if (!university.participates_in_matricula_rewards) {
        setLoading(false);
        return;
      }

      // Load rewards account
      const account = await TuitionRewardsService.getUniversityRewardsAccount(university.id);
      setRewardsAccount(account);

      // Load received redemptions history
      const redemptionsData = await TuitionRewardsService.getUniversityReceivedRedemptions(university.id);
      setRedemptions(redemptionsData);

      // Calculate statistics manually
      const statsData = {
        totalReceivedCoins: account?.total_received_coins || 0,
        totalDiscountsSent: account?.total_discounts_sent || 0,
        totalDiscountAmount: account?.total_discount_amount || 0,
        balanceCoins: account?.balance_coins || 0,
        recentRedemptions: redemptionsData.filter(r => r.status === 'confirmed').length
      };
      setStats(statsData);
      const payoutList = await PayoutService.listUniversityPayouts(university.id);
      setPayouts(payoutList);

    } catch (error: any) {
      console.error('Error loading Matricula Rewards data:', error);
      setError(error.message || 'Failed to load Matricula Rewards data');
    } finally {
      setLoading(false);
    }
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
    const availableBalance = rewardsAccount?.balance_coins || 0;
    if (paymentRequestAmount > availableBalance) {
      setError(`Insufficient balance. You have ${availableBalance.toLocaleString()} coins available, but requested ${paymentRequestAmount.toLocaleString()} coins.`);
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    try {
      setSubmittingPayout(true);
      await PayoutService.requestPayout({
        universityId: university.id,
        userId: user.id,
        amountCoins: paymentRequestAmount,
        payoutMethod,
        payoutDetails
      });
      setShowPaymentRequestModal(false);
      setPaymentRequestAmount(0);
      setPayoutDetails({});
      await loadMatriculaRewardsData();
      setShowExportSuccess(true);
      setTimeout(() => setShowExportSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to submit payment request');
      setTimeout(() => setError(null), 4000);
    } finally {
      setSubmittingPayout(false);
    }
  };

  const handleCancelPayout = async (requestId: string) => {
    if (!user?.id) return;
    try {
      await PayoutService.cancelPayout(requestId, user.id);
      await loadMatriculaRewardsData();
    } catch (e: any) {
      setError(e.message || 'Failed to cancel request');
      setTimeout(() => setError(null), 4000);
    }
  };

  // Function to reload data after successful opt-in
  const handleOptInSuccess = async () => {
    // Update local state
    setParticipatesInProgram(true);
    
    // Reload program data
    await loadMatriculaRewardsData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRedemptions = redemptions.filter(redemption => {
    const matchesSearch = searchTerm === '' || 
      redemption.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      redemption.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Function to export data
  const handleExport = () => {
    if (!redemptions.length) {
      setShowExportSuccess(false);
      // Show error briefly
      setError('No data to export');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Helper function to escape CSV fields
    const escapeCSVField = (field: any): string => {
      let value = String(field || '');
      // If contains semicolon, double quotes or line break, needs to be escaped
      if (value.includes(';') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
        // Escape double quotes by duplicating them
        value = value.replace(/"/g, '""');
        // Wrap in double quotes
        value = `"${value}"`;
      }
      return value;
    };

    const exportData = redemptions.map(redemption => ({
      'Student Name': redemption.user?.full_name || 'Unknown',
      'Student Email': redemption.user?.email || 'No email',
      'Discount Amount (USD)': redemption.discount_amount,
      'Coins Paid': redemption.cost_coins_paid,
      'Status': redemption.status,
      'Date': new Date(redemption.redeemed_at).toLocaleDateString('en-US'),
      'Time': new Date(redemption.redeemed_at).toLocaleTimeString('en-US'),
      'University': university?.name || 'Unknown',
      'Discount Type': redemption.discount?.name || 'Unknown'
    }));

    // Create headers
    const headers = Object.keys(exportData[0]);
    
    // Create data rows using semicolon as separator (international standard)
    const csvRows = [
      headers.map(escapeCSVField).join(';'),
      ...exportData.map(row => 
        headers.map(header => escapeCSVField(row[header as keyof typeof row])).join(';')
      )
    ];

    const csvContent = csvRows.join('\r\n'); // Use CRLF for Windows compatibility

    // Add BOM for UTF-8 for better Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Clean filename
    const fileName = `matricula-rewards-${(university?.name || 'university').replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', fileName);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show custom success notification
    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 4000);
  };

  // Function to show analytics
  const handleAnalytics = () => {
    setShowAnalytics(!showAnalytics);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E]"></div>
          <p className="text-gray-600 font-medium">Loading your rewards account...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-gray-900 font-medium">Error loading account</p>
          <p className="text-gray-500 text-sm">{error}</p>
          <button 
            onClick={loadMatriculaRewardsData}
            className="bg-[#05294E] text-white px-4 py-2 rounded-lg hover:bg-[#05294E]/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProfileCompletionGuard 
      isProfileCompleted={university?.profile_completed}
      title="Profile setup required"
      description="Complete your university profile to start creating and managing scholarships"
    >
      <div className="min-h-screen bg-gray-50">
        {/* If university does not participate in the program, show opt-in */}
        {participatesInProgram === false && (
          <MatriculaRewardsOptIn onOptInSuccess={handleOptInSuccess} />
        )}

        {/* If university participates in the program, show dashboard */}
        {participatesInProgram === true && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="hidden sm:block sm:w-12 sm:h-12 bg-[#05294E] rounded-xl flex items-center justify-center">
                  <Gift className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Matricula Rewards Dashboard</h1>
                  <p className="text-gray-600 mt-1">Manage your rewards and payments</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Active Program
                  </div>
                </div>
              </div>
            </div>

            {/* Export Success Notification */}
            {showExportSuccess && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-green-800 font-medium">Export Completed!</h4>
                    <p className="text-green-600 text-sm">
                      {redemptions.length} records exported successfully
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportSuccess(false)}
                  className="text-green-600 hover:text-green-800 transition-colors"
                  title="Close notification"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Main Balance */}
              <div className="bg-[#05294E] rounded-2xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Available Balance</p>
                    <p className="text-3xl font-bold">{stats.balanceCoins.toLocaleString()}</p>
                    <p className="text-blue-200 text-sm">Matricula Coins</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Wallet className="h-6 w-6" />
                  </div>
                </div>
                <div className="flex items-center text-blue-100 text-sm">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span>Active Account</span>
                </div>
              </div>

              {/* Total Received */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Received</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalReceivedCoins.toLocaleString()}</p>
                    <p className="text-gray-500 text-sm">Coins</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="flex items-center text-green-600 text-sm font-medium">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span>+{stats.totalReceivedCoins} this period</span>
                </div>
              </div>

              {/* Discounts Sent */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Discounts Sent</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalDiscountsSent}</p>
                    <p className="text-gray-500 text-sm">Transactions</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="flex items-center text-purple-600 text-sm font-medium">
                  <Zap className="h-4 w-4 mr-1" />
                  <span>Active rewards</span>
                </div>
              </div>

              {/* Total Value */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Value</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalDiscountAmount)}</p>
                    <p className="text-gray-500 text-sm">USD Value</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Banknote className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div className="flex items-center text-orange-600 text-sm font-medium">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  <span>Total processed</span>
                </div>
              </div>
            </div>

            {/* Analytics Section */}
            {showAnalytics && (
              <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h2>
                      <p className="text-gray-600 mt-1">Detailed insights about your rewards program</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Live Data</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Monthly Trends */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Monthly Trends</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">This Month</span>
                          <span className="text-sm font-medium text-gray-900">
                            {redemptions.filter(r => {
                              const redemptionDate = new Date(r.redeemed_at);
                              const now = new Date();
                              return redemptionDate.getMonth() === now.getMonth() && 
                                    redemptionDate.getFullYear() === now.getFullYear();
                            }).length} redemptions
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Last Month</span>
                          <span className="text-sm font-medium text-gray-900">
                            {redemptions.filter(r => {
                              const redemptionDate = new Date(r.redeemed_at);
                              const now = new Date();
                              const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
                              return redemptionDate.getMonth() === lastMonth.getMonth() && 
                                    redemptionDate.getFullYear() === lastMonth.getFullYear();
                            }).length} redemptions
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Top Students */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Top Students</h3>
                      <div className="space-y-2">
                        {(() => {
                          const studentStats = redemptions.reduce((acc, redemption) => {
                            const studentName = redemption.user?.full_name || 'Unknown';
                            if (!acc[studentName]) {
                              acc[studentName] = { count: 0, totalAmount: 0 };
                            }
                            acc[studentName].count++;
                            acc[studentName].totalAmount += redemption.discount_amount;
                            return acc;
                          }, {} as Record<string, { count: number; totalAmount: number }>);

                          const topStudents = Object.entries(studentStats)
                            .sort(([,a], [,b]) => b.totalAmount - a.totalAmount)
                            .slice(0, 3);

                          return topStudents.map(([name, stats]) => (
                            <div key={name} className="flex justify-between">
                              <span className="text-sm text-gray-600 truncate">{name}</span>
                              <span className="text-sm font-medium text-gray-900">
                                {formatCurrency(stats.totalAmount)}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Popular Discounts */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Popular Discounts</h3>
                      <div className="space-y-2">
                        {(() => {
                          const discountStats = redemptions.reduce((acc, redemption) => {
                            const discountName = redemption.discount?.name || 'Unknown';
                            if (!acc[discountName]) {
                              acc[discountName] = 0;
                            }
                            acc[discountName]++;
                            return acc;
                          }, {} as Record<string, number>);

                          const popularDiscounts = Object.entries(discountStats)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 3);

                          return popularDiscounts.map(([name, count]) => (
                            <div key={name} className="flex justify-between">
                              <span className="text-sm text-gray-600 truncate">{name}</span>
                              <span className="text-sm font-medium text-gray-900">{count}x</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction History */}
            <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Transaction History</h2>
                    <p className="text-gray-600 mt-1">All student tuition discount redemptions</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleAnalytics}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
                    </button>
                    <button
                      onClick={handleExport}
                      className="px-4 py-2 text-sm font-medium text-white bg-[#05294E] rounded-lg hover:bg-[#05294E]/90 transition-colors flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </button>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by student name or email..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* List */}
              <div className="p-6">
                {filteredRedemptions.length > 0 ? (
                  <div className="space-y-4">
                    {filteredRedemptions.map((redemption) => (
                      <div key={redemption.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-[#05294E] rounded-xl flex items-center justify-center">
                            <Users className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {redemption.user?.full_name || 'Unknown Student'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {redemption.user?.email || 'No email'} • {formatDate(redemption.redeemed_at)}
                            </p>
                            <p className="text-sm text-gray-600 font-medium">
                              Tuition Discount Transaction
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900 text-lg">
                            {formatCurrency(redemption.discount_amount)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {redemption.cost_coins_paid} coins
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Gift className="h-8 w-8 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions yet</h3>
                    <p className="text-gray-500 mb-4">
                      {searchTerm ? 'Try adjusting your filters' : 'Student transactions will appear here when they redeem tuition discounts'}
                    </p>
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                      <Shield className="h-4 w-4" />
                      <span>Secure transactions</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

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
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="payment-request-amount">Amount (coins)</label>
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
                          const max = rewardsAccount?.balance_coins || 0;
                          if (paymentRequestAmount > max) {
                            setPaymentRequestAmount(max);
                            validatePaymentAmount(max);
                          }
                        }}
                        placeholder="Enter amount in coins"
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#05294E] ${
                          inputError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                        }`}
                      />
                      {inputError ? (
                        <p className="text-xs text-red-600 mt-1">{inputError}</p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">
                          Available: {(rewardsAccount?.balance_coins || 0).toLocaleString()} coins • USD {formatCurrency(paymentRequestAmount)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="payout-method">Payment method</label>
                      <select id="payout-method" value={payoutMethod} onChange={(e)=> setPayoutMethod(e.target.value as PayoutMethod)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
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
                            ? 'bg-[#05294E] hover:bg-[#05294E]/90' 
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

            {/* Payout History */}
            <div id="payout-history" className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Payout Requests (Invoices)</h2>
                  <button
                    onClick={() => setShowPaymentRequestModal(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#05294E] rounded-lg hover:bg-[#05294E]/90 transition-colors"
                  >
                    Request Payout
                  </button>
                </div>
                <p className="text-gray-600 mt-1">Track your cash-out requests sent to MatriculaUSA</p>
              </div>
              <div className="p-6">
                {payouts.length ? (
                  <div className="space-y-4">
                    {payouts.map((payout) => (
                      <div key={payout.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-[#05294E] rounded-xl flex items-center justify-center">
                            <Users className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              Invoice: {(payout as any).payout_invoices?.[0]?.invoice_number || payout.id.slice(0,8)}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {formatDate(payout.created_at)} • Method: {String((payout as any).payout_method || '').replace('_',' ')}
                            </p>
                            <p className="text-sm text-gray-600 font-medium">
                              Status: {payout.status}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900 text-lg">
                            {formatCurrency(Number((payout as any).amount_usd || payout.amount_coins))}
                          </div>
                          <div className="text-sm text-gray-600">
                            {payout.amount_coins} coins
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Gift className="h-8 w-8 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No payout requests yet</h3>
                    <p className="text-gray-500 mb-4">
                      Student payout requests will appear here when they are submitted.
                    </p>
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                      <Shield className="h-4 w-4" />
                      <span>Secure transactions</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <Shield className="h-4 w-4" />
                <span>All transactions are secure and encrypted</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProfileCompletionGuard>
  );
};

export default UniversityRewardsDashboard;
