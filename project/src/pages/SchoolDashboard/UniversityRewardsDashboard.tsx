import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Wallet,
  Banknote,
  Activity,
  PieChart,
  LineChart,
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

const UniversityRewardsDashboard: React.FC = () => {
  const { user } = useAuth();
  const { university } = useUniversity();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para dados
  const [rewardsAccount, setRewardsAccount] = useState<UniversityRewardsAccount | null>(null);
  const [redemptions, setRedemptions] = useState<TuitionRedemption[]>([]);
  const [stats, setStats] = useState({
    totalReceivedCoins: 0,
    totalDiscountsSent: 0,
    totalDiscountAmount: 0,
    balanceCoins: 0,
    recentRedemptions: 0
  });

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);

  // Estados para saque
  const [payouts, setPayouts] = useState<UniversityPayoutRequest[]>([]);
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);
  const [paymentRequestAmount, setPaymentRequestAmount] = useState<number>(0);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('zelle');
  const [payoutDetails, setPayoutDetails] = useState<Record<string, any>>({});
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  // Validação em tempo real do valor solicitado
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

  // Verificar se o valor solicitado é válido
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

      // Carregar conta de recompensas
      const account = await TuitionRewardsService.getUniversityRewardsAccount(university.id);
      setRewardsAccount(account);

      // Carregar histórico de resgates recebidos
      const redemptionsData = await TuitionRewardsService.getUniversityReceivedRedemptions(university.id);
      setRedemptions(redemptionsData);

      // Calcular estatísticas manualmente
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
      console.error('Erro ao carregar dados de Matricula Rewards:', error);
      setError(error.message || 'Failed to load Matricula Rewards data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPaymentRequest = async () => {
    if (!user?.id || !university?.id) return;
    
    // Validação de valor válido
    if (!paymentRequestAmount || paymentRequestAmount <= 0) {
      setError('Please enter a valid amount for payment request');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    // Validação de saldo insuficiente
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
      setError(e.message || 'Falha ao cancelar solicitação');
      setTimeout(() => setError(null), 4000);
    }
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

  // Função para exportar dados
  const handleExport = () => {
    if (!redemptions.length) {
      setShowExportSuccess(false);
      // Mostrar erro brevemente
      setError('Não há dados para exportar');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Função auxiliar para escapar campos CSV
    const escapeCSVField = (field: any): string => {
      let value = String(field || '');
      // Se contém ponto e vírgula, aspas duplas ou quebra de linha, precisa ser escapado
      if (value.includes(';') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
        // Escapar aspas duplas duplicando-as
        value = value.replace(/"/g, '""');
        // Envolver em aspas duplas
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

    // Criar cabeçalhos
    const headers = Object.keys(exportData[0]);
    
    // Criar linhas de dados usando ponto e vírgula como separador (padrão internacional)
    const csvRows = [
      headers.map(escapeCSVField).join(';'),
      ...exportData.map(row => 
        headers.map(header => escapeCSVField(row[header as keyof typeof row])).join(';')
      )
    ];

    const csvContent = csvRows.join('\r\n'); // Usar CRLF para compatibilidade com Windows

    // Adicionar BOM para UTF-8 para melhor compatibilidade com Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Limpar nome do arquivo
    const fileName = `matricula-rewards-${(university?.name || 'university').replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', fileName);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Mostrar notificação de sucesso customizada
    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 4000);
  };

  // Função para mostrar analytics
  const handleAnalytics = () => {
    setShowAnalytics(!showAnalytics);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 font-medium">Loading your rewards account...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-slate-900 font-medium">Error loading account</p>
          <p className="text-slate-500 text-sm">{error}</p>
          <button 
            onClick={loadMatriculaRewardsData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Bancário */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-slate-900">Rewards Account</h1>
                </div>
                <p className="text-slate-600">Manage your university's digital rewards and track student transactions</p>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={handleExport}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
                <button 
                  onClick={handleAnalytics}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    showAnalytics 
                      ? 'text-white bg-gradient-to-r from-purple-600 to-blue-600' 
                      : 'text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  <span>Analytics</span>
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById('payout-history');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                  title="Go to payout history"
                >
                  <Clock className="h-4 w-4" />
                  <span>History</span>
                </button>
                <button onClick={() => setShowPaymentRequestModal(true)} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                  <DollarSign className="h-4 w-4" />
                  <span>Request Payment</span>
                </button>
              </div>
            </div>
          </div>

          {/* Notificação de Sucesso na Exportação */}
          {showExportSuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between animate-fade-in">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="text-green-800 font-medium">Exportação Concluída!</h4>
                  <p className="text-green-600 text-sm">
                    {redemptions.length} registros exportados com sucesso
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExportSuccess(false)}
                className="text-green-600 hover:text-green-800 transition-colors"
                title="Fechar notificação"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Cards de Saldo - Estilo Bancário */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Saldo Principal */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
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

            {/* Total Recebido */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Total Received</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalReceivedCoins.toLocaleString()}</p>
                  <p className="text-slate-500 text-sm">Coins</p>
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

            {/* Descontos Enviados */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Discounts Sent</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalDiscountsSent}</p>
                  <p className="text-slate-500 text-sm">Transactions</p>
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

            {/* Valor Total */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Total Value</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalDiscountAmount)}</p>
                  <p className="text-slate-500 text-sm">USD Value</p>
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

          {/* Seção de Analytics */}
          {showAnalytics && (
            <div className="mb-8 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Analytics Dashboard</h2>
                    <p className="text-slate-600 mt-1">Detailed insights about your rewards program</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-slate-600">Live Data</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Estatísticas por Mês */}
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Monthly Trends</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">This Month</span>
                        <span className="text-sm font-medium text-slate-900">
                          {redemptions.filter(r => {
                            const redemptionDate = new Date(r.redeemed_at);
                            const now = new Date();
                            return redemptionDate.getMonth() === now.getMonth() && 
                                  redemptionDate.getFullYear() === now.getFullYear();
                          }).length} redemptions
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Last Month</span>
                        <span className="text-sm font-medium text-slate-900">
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
                  <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Top Students</h3>
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
                            <span className="text-sm text-slate-600 truncate">{name}</span>
                            <span className="text-sm font-medium text-slate-900">
                              {formatCurrency(stats.totalAmount)}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Popular Discounts */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Popular Discounts</h3>
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
                            <span className="text-sm text-slate-600 truncate">{name}</span>
                            <span className="text-sm font-medium text-slate-900">{count}x</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Histórico de Transações dos Alunos */}
          <div className="mt-8 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Transaction History</h2>
                  <p className="text-slate-600 mt-1">All student tuition discount redemptions</p>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by student name or email..."
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Lista */}
            <div className="p-6">
              {filteredRedemptions.length > 0 ? (
                <div className="space-y-4">
                  {filteredRedemptions.map((redemption) => (
                    <div key={redemption.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {redemption.user?.full_name || 'Unknown Student'}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {redemption.user?.email || 'No email'} • {formatDate(redemption.redeemed_at)}
                          </p>
                          <p className="text-sm text-slate-600 font-medium">
                            Tuition Discount Transaction
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900 text-lg">
                          {formatCurrency(redemption.discount_amount)}
                        </div>
                        <div className="text-sm text-slate-600">
                          {redemption.cost_coins_paid} coins
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Gift className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No transactions yet</h3>
                  <p className="text-slate-500 mb-4">
                    {searchTerm ? 'Try adjusting your filters' : 'Student transactions will appear here when they redeem tuition discounts'}
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-sm text-slate-400">
                    <Shield className="h-4 w-4" />
                    <span>Secure transactions</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal */}
          {showPaymentRequestModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-slate-900">Request Payment</h3>
                                      <button onClick={() => setShowPaymentRequestModal(false)} title="Close" className="text-slate-500 hover:text-slate-700"><XCircle className="h-5 w-5"/></button>
                </div>

                <div className="space-y-4">
                  {/* Mensagem de erro de saldo insuficiente */}
                  {inputError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-800 font-medium">{inputError}</span>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="payment-request-amount">Amount (coins)</label>
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
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                        inputError ? 'border-red-300 focus:ring-red-500' : 'border-slate-300'
                      }`}
                    />
                    {inputError ? (
                      <p className="text-xs text-red-600 mt-1">{inputError}</p>
                    ) : (
                      <p className="text-xs text-slate-500 mt-1">
                        Available: {(rewardsAccount?.balance_coins || 0).toLocaleString()} coins • USD {formatCurrency(paymentRequestAmount)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="payout-method">Payment method</label>
                    <select id="payout-method" value={payoutMethod} onChange={(e)=> setPayoutMethod(e.target.value as PayoutMethod)} className="w-full border border-slate-300 rounded-lg px-3 py-2" title="Select payment method">
                      <option value="zelle">Zelle</option>
                      <option value="bank_transfer">Bank transfer</option>
                      <option value="stripe">Stripe</option>
                    </select>
                  </div>

                  {/* Dynamic fields */}
                  {payoutMethod === 'zelle' && (
                    <div className="grid grid-cols-1 gap-3">
                      <input placeholder="Zelle email" className="border border-slate-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, zelle_email: e.target.value})}/>
                      <input placeholder="Zelle phone" className="border border-slate-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, zelle_phone: e.target.value})}/>
                      <input placeholder="Account holder name" className="border border-slate-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, account_name: e.target.value})}/>
                    </div>
                  )}
                  {payoutMethod === 'bank_transfer' && (
                    <div className="grid grid-cols-1 gap-3">
                      <input placeholder="Bank name" className="border border-slate-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, bank_name: e.target.value})}/>
                      <input placeholder="Account holder name" className="border border-slate-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, account_name: e.target.value})}/>
                      <input placeholder="Routing number" className="border border-slate-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, routing_number: e.target.value})}/>
                      <input placeholder="Account number" className="border border-slate-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, account_number: e.target.value})}/>
                      <input placeholder="SWIFT / IBAN (optional)" className="border border-slate-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, swift: e.target.value, iban: e.target.value})}/>
                    </div>
                  )}
                  {payoutMethod === 'stripe' && (
                    <div className="grid grid-cols-1 gap-3">
                      <input placeholder="Stripe email" className="border border-slate-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, stripe_email: e.target.value})}/>
                      <input placeholder="Stripe account id (optional)" className="border border-slate-300 rounded-lg px-3 py-2" onChange={(e)=> setPayoutDetails({...payoutDetails, stripe_account_id: e.target.value})}/>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button onClick={()=> setShowPaymentRequestModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700">Cancel</button>
                    <button 
                      onClick={handleSubmitPaymentRequest} 
                      disabled={submittingPayout || !isPaymentAmountValid()} 
                      className={`px-4 py-2 rounded-lg text-white transition-colors ${
                        isPaymentAmountValid() 
                          ? 'bg-blue-600 hover:bg-blue-700' 
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

          {/* Seção de Transações - Estilo Bancário */}
          <div id="payout-history" className="mt-8 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Payout Requests (Invoices)</h2>
              <p className="text-slate-600 mt-1">Track your cash-out requests sent to MatriculaUSA</p>
            </div>
            <div className="p-6">
              {payouts.length ? (
                <div className="space-y-4">
                  {payouts.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            Invoice: {(payout as any).payout_invoices?.[0]?.invoice_number || payout.id.slice(0,8)}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {formatDate(payout.created_at)} • Method: {String((payout as any).payout_method || '').replace('_',' ')}
                          </p>
                          <p className="text-sm text-slate-600 font-medium">
                            Status: {payout.status}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900 text-lg">
                          {formatCurrency(Number((payout as any).amount_usd || payout.amount_coins))}
                        </div>
                        <div className="text-sm text-slate-600">
                          {payout.amount_coins} coins
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Gift className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No payout requests yet</h3>
                  <p className="text-slate-500 mb-4">
                    Student payout requests will appear here when they are submitted.
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-sm text-slate-400">
                    <Shield className="h-4 w-4" />
                    <span>Secure transactions</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Bancário */}
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
              <Shield className="h-4 w-4" />
              <span>All transactions are secure and encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </ProfileCompletionGuard>
  );
};

export default UniversityRewardsDashboard;
