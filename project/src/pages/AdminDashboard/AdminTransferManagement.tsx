import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Users, 
  CreditCard,
  Download,
  Filter,
  Search,
  RefreshCw,
  Settings
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface TransferStats {
  totalPendingAmount: number;
  pendingTransfers: number;
  processedToday: number;
  totalProcessedAmount: number;
  averageTransferTime: number;
  successRate: number;
}

interface PendingTransfer {
  id: string;
  university_id: string;
  university_name: string;
  payment_count: number;
  total_amount: number;
  oldest_payment_date: string;
  stripe_connect_account_id?: string;
  payment_method_type: 'stripe_connect' | 'bank_transfer';
}

interface TransferHistory {
  id: string;
  university_name: string;
  transfer_amount: number;
  transfer_type: 'manual' | 'automatic' | 'scheduled';
  status: 'pending' | 'completed' | 'failed';
  transfer_date: string;
  completed_at?: string;
  admin_name?: string;
  payment_count: number;
}

const AdminTransferManagement: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TransferStats>({
    totalPendingAmount: 0,
    pendingTransfers: 0,
    processedToday: 0,
    totalProcessedAmount: 0,
    averageTransferTime: 0,
    successRate: 100
  });

  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
  const [transferHistory, setTransferHistory] = useState<TransferHistory[]>([]);
  const [selectedTransfers, setSelectedTransfers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [processingSingle, setProcessingSingle] = useState<string | null>(null);
  const [processingBatch, setProcessingBatch] = useState(false);

  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    paymentMethod: 'all',
    minAmount: '',
    maxAmount: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      loadTransferData();
    }
  }, [user]);

  const loadTransferData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadPendingTransfers(),
        loadTransferHistory()
      ]);
    } catch (error) {
      console.error('Error loading transfer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    // Simular carregamento de estatísticas - será substituído por função SQL real
    const mockStats: TransferStats = {
      totalPendingAmount: 15420, // $154.20
      pendingTransfers: 8,
      processedToday: 12,
      totalProcessedAmount: 45600, // $456.00
      averageTransferTime: 2.5, // 2.5 horas
      successRate: 98.5
    };
    setStats(mockStats);
  };

  const loadPendingTransfers = async () => {
    // Simular carregamento de transferências pendentes
    const mockPendingTransfers: PendingTransfer[] = [
      {
        id: 'pending_1',
        university_id: 'univ_1',
        university_name: 'Harvard University',
        payment_count: 3,
        total_amount: 3000, // $30.00
        oldest_payment_date: '2024-01-15T10:30:00Z',
        stripe_connect_account_id: 'acct_harvard123',
        payment_method_type: 'stripe_connect'
      },
      {
        id: 'pending_2',
        university_id: 'univ_2',
        university_name: 'Stanford University',
        payment_count: 5,
        total_amount: 5000, // $50.00
        oldest_payment_date: '2024-01-14T15:20:00Z',
        payment_method_type: 'bank_transfer'
      },
      {
        id: 'pending_3',
        university_id: 'univ_3',
        university_name: 'MIT',
        payment_count: 2,
        total_amount: 2000, // $20.00
        oldest_payment_date: '2024-01-16T09:15:00Z',
        stripe_connect_account_id: 'acct_mit456',
        payment_method_type: 'stripe_connect'
      }
    ];
    setPendingTransfers(mockPendingTransfers);
  };

  const loadTransferHistory = async () => {
    // Simular carregamento de histórico
    const mockHistory: TransferHistory[] = [
      {
        id: 'history_1',
        university_name: 'Yale University',
        transfer_amount: 7500,
        transfer_type: 'manual',
        status: 'completed',
        transfer_date: '2024-01-15T14:30:00Z',
        completed_at: '2024-01-15T14:32:00Z',
        admin_name: 'Admin User',
        payment_count: 5
      },
      {
        id: 'history_2',
        university_name: 'Princeton University',
        transfer_amount: 4200,
        transfer_type: 'automatic',
        status: 'completed',
        transfer_date: '2024-01-15T12:00:00Z',
        completed_at: '2024-01-15T12:01:00Z',
        payment_count: 3
      }
    ];
    setTransferHistory(mockHistory);
  };

  const handleProcessSingleTransfer = async (transferId: string) => {
    setProcessingSingle(transferId);
    try {
      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Remover da lista de pendentes
      setPendingTransfers(prev => prev.filter(t => t.id !== transferId));
      
      // Recarregar dados
      await loadTransferData();
    } catch (error) {
      console.error('Error processing transfer:', error);
    } finally {
      setProcessingSingle(null);
    }
  };

  const handleProcessBatchTransfers = async () => {
    if (selectedTransfers.length === 0) return;
    
    setProcessingBatch(true);
    try {
      // Simular processamento em lote
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Remover transferências processadas
      setPendingTransfers(prev => 
        prev.filter(t => !selectedTransfers.includes(t.id))
      );
      
      setSelectedTransfers([]);
      await loadTransferData();
    } catch (error) {
      console.error('Error processing batch transfers:', error);
    } finally {
      setProcessingBatch(false);
    }
  };

  const toggleTransferSelection = (transferId: string) => {
    setSelectedTransfers(prev => 
      prev.includes(transferId)
        ? prev.filter(id => id !== transferId)
        : [...prev, transferId]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
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

  const getPaymentMethodBadge = (type: 'stripe_connect' | 'bank_transfer') => {
    if (type === 'stripe_connect') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <CreditCard className="w-3 h-3 mr-1" />
          Stripe Connect
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <DollarSign className="w-3 h-3 mr-1" />
        Bank Transfer
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };

    const statusIcons = {
      pending: Clock,
      completed: CheckCircle,
      failed: XCircle
    };

    const Icon = statusIcons[status as keyof typeof statusIcons] || Clock;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || statusStyles.pending}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transfer Management</h1>
          <p className="text-gray-600">Manage university payment transfers and approvals</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
          <button
            onClick={loadTransferData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Pending Amount
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {formatCurrency(stats.totalPendingAmount)}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Pending Transfers
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.pendingTransfers}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Processed Today
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.processedToday}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Success Rate
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.successRate}%
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search University
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Search universities..."
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                aria-label="Filter by payment method"
                title="Filter by payment method"
              >
                <option value="all">All Methods</option>
                <option value="stripe_connect">Stripe Connect</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={filters.minAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Min $"
                />
                <input
                  type="number"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Max $"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Transfers */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Pending Transfers ({pendingTransfers.length})
            </h3>
            {selectedTransfers.length > 0 && (
              <button
                onClick={handleProcessBatchTransfers}
                disabled={processingBatch}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {processingBatch ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Process Selected ({selectedTransfers.length})
              </button>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      <input
                      type="checkbox"
                      checked={selectedTransfers.length === pendingTransfers.length && pendingTransfers.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTransfers(pendingTransfers.map(t => t.id));
                        } else {
                          setSelectedTransfers([]);
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label="Select all transfers"
                      title="Select all transfers"
                    />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  University
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Oldest Payment
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingTransfers.map((transfer) => (
                <tr key={transfer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedTransfers.includes(transfer.id)}
                      onChange={() => toggleTransferSelection(transfer.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label={`Select transfer for ${transfer.university_name}`}
                      title={`Select transfer for ${transfer.university_name}`}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {transfer.university_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(transfer.total_amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {transfer.payment_count} payment{transfer.payment_count !== 1 ? 's' : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPaymentMethodBadge(transfer.payment_method_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(transfer.oldest_payment_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleProcessSingleTransfer(transfer.id)}
                      disabled={processingSingle === transfer.id}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {processingSingle === transfer.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        'Process'
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transfer History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Transfer History</h3>
        </div>
        
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
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transferHistory.map((transfer) => (
                <tr key={transfer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {transfer.university_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(transfer.transfer_amount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {transfer.payment_count} payment{transfer.payment_count !== 1 ? 's' : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {transfer.transfer_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(transfer.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(transfer.transfer_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transfer.admin_name || 'System'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTransferManagement;
