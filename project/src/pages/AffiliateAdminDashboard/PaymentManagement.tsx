import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard,
  Plus,
  Download, 
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import FinancialOverview from './FinancialOverview';
import { AffiliatePaymentRequestService } from '../../services/AffiliatePaymentRequestService';

const PaymentManagement: React.FC = () => {
  const { user } = useAuth();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'financial-overview' | 'payment-requests' | 'commission-history'>('financial-overview');
  
  // Payment request modal state
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);
  const [paymentRequestAmount, setPaymentRequestAmount] = useState<number>(0);
  const [payoutMethod, setPayoutMethod] = useState<'zelle' | 'bank_transfer' | 'stripe'>('zelle');
  const [payoutDetails, setPayoutDetails] = useState<Record<string, any>>({});
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Affiliate credits and balance state
  const [affiliateBalance, setAffiliateBalance] = useState<number>(0);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [pendingCredits, setPendingCredits] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Affiliate payment requests state
  const [affiliatePaymentRequests, setAffiliatePaymentRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Flags para evitar requisições redundantes/concorrentes
  const hasLoadedBalanceForUser = useRef<string | null>(null);
  const hasLoadedRequestsForUser = useRef<string | null>(null);
  const isLoadingBalanceRef = useRef(false);
  const isLoadingRequestsRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [forceReloadToken, setForceReloadToken] = useState(0);

  // definido após os loaders; placeholder aqui para declaração
  let handleRefresh: () => Promise<void>;

  // Load affiliate balance e créditos (memoizado)
  const loadAffiliateBalance = useCallback(async () => {
    const uid = user?.id;
    if (!uid) return;
    if (isLoadingBalanceRef.current) return;
    if (hasLoadedBalanceForUser.current === uid) return;

    try {
      isLoadingBalanceRef.current = true;
      setLoadingBalance(true);

      const [{ data: creditsData, error: creditsError }, { data: referralsData, error: referralsError }] = await Promise.all([
        supabase.from('matriculacoin_credits').select('*').eq('user_id', uid).single(),
        supabase.from('affiliate_referrals').select('*').eq('referrer_id', uid)
      ]);

      if (creditsError && creditsError.code !== 'PGRST116') {
        console.error('Error fetching affiliate credits:', creditsError);
        return;
      }
      if (referralsError) {
        console.error('Error fetching affiliate referrals:', referralsError);
        return;
      }

      const balance = creditsData?.balance || 0;
      const earned = creditsData?.total_earned || 0;
      const pending = referralsData?.filter(r => r.status === 'pending').length * 50 || 0;

      setAffiliateBalance(balance);
      setTotalEarned(earned);
      setPendingCredits(pending);
      hasLoadedBalanceForUser.current = uid;
    } catch (error: any) {
      console.error('Error loading affiliate balance:', error);
    } finally {
      setLoadingBalance(false);
      isLoadingBalanceRef.current = false;
    }
  }, [user?.id]);

  // Load affiliate payment requests (memoizado)
  const loadAffiliatePaymentRequests = useCallback(async () => {
    const uid = user?.id;
    if (!uid) return;
    if (isLoadingRequestsRef.current) return;
    if (hasLoadedRequestsForUser.current === uid) return;

    try {
      isLoadingRequestsRef.current = true;
      setLoadingRequests(true);
      const requests = await AffiliatePaymentRequestService.listAffiliatePaymentRequests(uid);
      setAffiliatePaymentRequests(requests);
      hasLoadedRequestsForUser.current = uid;
    } catch (error: any) {
      console.error('Error loading affiliate payment requests:', error);
    } finally {
      setLoadingRequests(false);
      isLoadingRequestsRef.current = false;
    }
  }, [user?.id]);

  // Definir handleRefresh após as dependências existirem
  handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    if (refreshing) return;
    try {
      setRefreshing(true);
      hasLoadedBalanceForUser.current = null;
      hasLoadedRequestsForUser.current = null;
      // força reload do FinancialOverview via token
      setForceReloadToken((t) => t + 1);
      await Promise.all([loadAffiliateBalance(), loadAffiliatePaymentRequests()]);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, refreshing, loadAffiliateBalance, loadAffiliatePaymentRequests]);

  // Validate payment amount
  const validatePaymentAmount = (amount: number) => {
    const availableBalance = affiliateBalance;
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

  // Check if payment amount is valid
  const isPaymentAmountValid = () => {
    return paymentRequestAmount > 0 && paymentRequestAmount <= affiliateBalance;
  };

  // Check if payout details are valid based on method
  const isPayoutDetailsValid = () => {
    if (payoutMethod === 'bank_transfer') {
      return payoutDetails.bank_name && 
             payoutDetails.account_name && 
             payoutDetails.routing_number && 
             payoutDetails.account_number;
    }
    if (payoutMethod === 'zelle') {
      return (payoutDetails.zelle_email || payoutDetails.zelle_phone) && 
             !(payoutDetails.zelle_email && payoutDetails.zelle_phone);
    }
    if (payoutMethod === 'stripe') {
      return payoutDetails.stripe_email;
    }
    return true;
  };

  // Handle submit payment request
  const handleSubmitPaymentRequest = async () => {
    if (!user?.id) return;
    
    // Validations
    if (!isPaymentAmountValid()) {
      setError('Please enter a valid amount within your available balance');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    if (!isPayoutDetailsValid()) {
      setError('Please fill in all required payment details');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    try {
      setSubmittingPayout(true);
      await AffiliatePaymentRequestService.createPaymentRequest({
        referrerUserId: user.id,
        amountUsd: paymentRequestAmount,
        payoutMethod,
        payoutDetails
      });
      setShowPaymentRequestModal(false);
      setPaymentRequestAmount(0);
      setPayoutDetails({});
      // limpa caches para recarregar dados de forma controlada
      hasLoadedBalanceForUser.current = null;
      hasLoadedRequestsForUser.current = null;
      await Promise.all([loadAffiliateBalance(), loadAffiliatePaymentRequests()]);
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

  // const formatDate = (dateString: string) => {
  //   return new Date(dateString).toLocaleDateString('en-US', {
  //     year: 'numeric',
  //     month: 'short',
  //     day: 'numeric',
  //     hour: '2-digit',
  //     minute: '2-digit',
  //   });
  // };

  // Load data quando user id muda (memoized loaders evitam excesso de requisições)
  useEffect(() => {
    if (!user?.id) return;
    loadAffiliateBalance();
    loadAffiliatePaymentRequests();
  }, [user?.id, loadAffiliateBalance, loadAffiliatePaymentRequests]);

  return (
    <div className="min-h-screen">
      {/* Header + Tabs Section */}
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="max-w-full mx-auto bg-slate-50">
            {/* Header: title + note + counter */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  Payment Management
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600">
                  Monitor and manage your affiliate commission earnings and payment requests.
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  Track your referral commissions and request payouts from your available balance.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-300 shadow-sm">
                  <DollarSign className="w-5 h-5 mr-2" />
                  {loadingBalance ? (
                    <div className="animate-pulse bg-slate-200 h-5 w-16 rounded"></div>
                  ) : (
                    `${formatCurrency(affiliateBalance)} Available`
                  )}
                </div>
              </div>
            </div>

            {/* Tabs Section */}
            <div className="border-t border-slate-200 bg-white">
              <div className="px-4 sm:px-6 lg:px-8">
                <nav className="flex space-x-8 overflow-x-auto" role="tablist">
                  <button
                    onClick={() => setActiveTab('financial-overview')}
                    className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                      activeTab === 'financial-overview' 
                        ? 'border-[#05294E] text-[#05294E]' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                    type="button"
                    aria-selected={activeTab === 'financial-overview'}
                    role="tab"
                  >
                    <TrendingUp className={`w-5 h-5 mr-2 transition-colors ${
                      activeTab === 'financial-overview' ? 'text-[#05294E]' : 'text-slate-400 group-hover:text-slate-600'
                    }`} />
                    Financial Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('payment-requests')}
                    className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                      activeTab === 'payment-requests' 
                        ? 'border-[#05294E] text-[#05294E]' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                    type="button"
                    aria-selected={activeTab === 'payment-requests'}
                    role="tab"
                  >
                    <CreditCard className={`w-5 h-5 mr-2 transition-colors ${
                      activeTab === 'payment-requests' ? 'text-[#05294E]' : 'text-slate-400 group-hover:text-slate-600'
                    }`} />
                    Payment Requests
                  </button>
                </nav>
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="border-t border-slate-200 bg-white">
              <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {activeTab === 'financial-overview' ? 'Financial Overview' : 
                       activeTab === 'payment-requests' ? 'Affiliate Payment Requests' : 
                       'Commission Transaction History'}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      {activeTab === 'financial-overview' 
                        ? 'Comprehensive financial analytics, trends, and performance metrics'
                        : activeTab === 'payment-requests'
                        ? 'Request payouts from your available balance and track request status'
                        : 'View detailed commission earnings and transaction history'
                      }
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing || loadingBalance || loadingRequests}
                      className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                    >
                      {refreshing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Refresh
                    </button>
                    {activeTab === 'payment-requests' && (
                      <button
                        onClick={() => setShowPaymentRequestModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#05294E] hover:bg-[#05294E]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#05294E] transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Request Payment
                      </button>
                    )}
                    <button
                      className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#05294E] transition-all duration-200 ease-in-out"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      
      {/* Financial Overview Tab */}
      {activeTab === 'financial-overview' && (
        <FinancialOverview userId={user?.id} forceReloadToken={forceReloadToken} />
      )}

      {/* Payment Requests Tab */}
      {activeTab === 'payment-requests' && (
        <div className="space-y-6">
          {/* Balance Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Available Balance</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {loadingBalance ? (
                      <div className="animate-pulse bg-slate-200 h-8 w-20 rounded"></div>
                    ) : (
                      formatCurrency(affiliateBalance)
                    )}
                  </p>
                  <p className="text-xs text-slate-500">Ready for withdrawal</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Earned</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {loadingBalance ? (
                      <div className="animate-pulse bg-slate-200 h-8 w-20 rounded"></div>
                    ) : (
                      formatCurrency(totalEarned)
                    )}
                  </p>
                  <p className="text-xs text-slate-500">Lifetime earnings</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Pending Credits</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {loadingBalance ? (
                      <div className="animate-pulse bg-slate-200 h-8 w-20 rounded"></div>
                    ) : (
                      formatCurrency(pendingCredits)
                    )}
                  </p>
                  <p className="text-xs text-slate-500">Awaiting completion</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Payment Requests</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {loadingRequests ? (
                      <div className="animate-pulse bg-slate-200 h-8 w-8 rounded"></div>
                    ) : (
                      affiliatePaymentRequests.length
                    )}
                  </p>
                  <p className="text-xs text-slate-500">Total submitted</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Requests List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-900">Payment Requests</h3>
                <p className="text-sm text-slate-600">Your submitted payment requests and their status</p>
              </div>
            </div>

            {loadingRequests ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            ) : affiliatePaymentRequests.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No payment requests yet</h3>
                <p className="text-gray-500">Submit your first payment request to get started</p>
              </div>
            ) : (
              <div className="p-6">
                <p className="text-slate-500">Payment requests functionality will be implemented here.</p>
              </div>
            )}
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

      {/* Payment Request Modal */}
      {showPaymentRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Request Payment</h3>
              <button 
                onClick={() => setShowPaymentRequestModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              {inputError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{inputError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD)</label>
                <input
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
                    const max = affiliateBalance;
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
                <p className="text-xs text-gray-500 mt-1">
                  Available: {formatCurrency(affiliateBalance)} • Requested: {formatCurrency(paymentRequestAmount)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
                <select value={payoutMethod} onChange={(e)=> setPayoutMethod(e.target.value as any)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="zelle">Zelle</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>
              {payoutMethod === 'zelle' && (
                <div className="grid grid-cols-1 gap-3">
                  <input 
                    placeholder="Zelle email *" 
                    type='email'
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      !payoutDetails.zelle_email && !payoutDetails.zelle_phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    onChange={(e)=> setPayoutDetails({...payoutDetails, zelle_email: e.target.value, zelle_phone: ''})}
                  />
                  <input 
                    placeholder="Zelle phone *" 
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      !payoutDetails.zelle_email && !payoutDetails.zelle_phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    onChange={(e)=> setPayoutDetails({...payoutDetails, zelle_phone: e.target.value, zelle_email: ''})}
                  />
                  <input 
                    placeholder="Account holder name (optional)" 
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onChange={(e)=> setPayoutDetails({...payoutDetails, account_name: e.target.value})}
                  />
                </div>
              )}
              {payoutMethod === 'bank_transfer' && (
                <div className="grid grid-cols-1 gap-3">
                  <input 
                    placeholder="Bank name *" 
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      !payoutDetails.bank_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    onChange={(e)=> setPayoutDetails({...payoutDetails, bank_name: e.target.value})}
                  />
                  <input 
                    placeholder="Account holder name *" 
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      !payoutDetails.account_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    onChange={(e)=> setPayoutDetails({...payoutDetails, account_name: e.target.value})}
                  />
                  <input 
                    placeholder="Routing number *" 
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      !payoutDetails.routing_number ? 'border-red-300' : 'border-gray-300'
                    }`}
                    onChange={(e)=> setPayoutDetails({...payoutDetails, routing_number: e.target.value})}
                  />
                  <input 
                    placeholder="Account number *" 
                    className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      !payoutDetails.account_number ? 'border-red-300' : 'border-gray-300'
                    }`}
                    onChange={(e)=> setPayoutDetails({...payoutDetails, account_number: e.target.value})}
                  />
                  <input 
                    placeholder="SWIFT / IBAN (optional)" 
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onChange={(e)=> setPayoutDetails({...payoutDetails, swift: e.target.value, iban: e.target.value})}
                  />
                </div>
              )}
              {payoutMethod === 'stripe' && (
                <div className="grid grid-cols-1 gap-3">
                  <input placeholder="Stripe email *" className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    !payoutDetails.stripe_email ? 'border-red-300' : 'border-gray-300'
                  }`} onChange={(e)=> setPayoutDetails({...payoutDetails, stripe_email: e.target.value})}/>
                  <input placeholder="Stripe account id (optional)" className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500" onChange={(e)=> setPayoutDetails({...payoutDetails, stripe_account_id: e.target.value})}/>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={()=> setShowPaymentRequestModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700">Cancel</button>
                <button 
                  onClick={handleSubmitPaymentRequest} 
                  disabled={submittingPayout || !isPaymentAmountValid() || !isPayoutDetailsValid()} 
                  className={`px-4 py-2 rounded-lg text-white transition-colors ${
                    isPaymentAmountValid() && isPayoutDetailsValid()
                      ? 'bg-indigo-600 hover:bg-indigo-700' 
                      : 'bg-gray-400 cursor-not-allowed'
                  } disabled:opacity-60`}
                  title={!isPaymentAmountValid() ? 'Please enter a valid amount within your available balance' : 
                         !isPayoutDetailsValid() ? 'Please fill in all required payment details' : 'Submit payment request'}
                >
                  {submittingPayout ? 'Submitting...' : 'Submit request'}
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
