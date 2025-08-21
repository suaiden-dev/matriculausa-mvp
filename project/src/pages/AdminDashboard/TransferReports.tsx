import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Users, 
  Download,
  Filter,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface TransferReportData {
  period: string;
  totalAmount: number;
  transferCount: number;
  avgAmount: number;
  successRate: number;
}

interface UniversityPerformance {
  university_name: string;
  total_amount: number;
  transfer_count: number;
  avg_transfer_time: number; // em horas
  success_rate: number;
  last_transfer: string;
}

interface PaymentMethodStats {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  period: 'day' | 'week' | 'month';
  university: string;
  transferType: string;
}

const TransferReports: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<TransferReportData[]>([]);
  const [universityPerformance, setUniversityPerformance] = useState<UniversityPerformance[]>([]);
  const [paymentMethodStats, setPaymentMethodStats] = useState<PaymentMethodStats[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias atrás
    dateTo: new Date().toISOString().split('T')[0], // hoje
    period: 'day',
    university: 'all',
    transferType: 'all'
  });

  // Estatísticas gerais
  const [overallStats, setOverallStats] = useState({
    totalTransferred: 0,
    totalTransfers: 0,
    avgTransferAmount: 0,
    totalUniversities: 0,
    successRate: 0,
    avgProcessingTime: 0 // em horas
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      loadReportData();
    }
  }, [user, filters]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadOverallStats(),
        loadTimeSeriesData(),
        loadUniversityPerformance(),
        loadPaymentMethodStats()
      ]);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOverallStats = async () => {
    // Simular carregamento de estatísticas gerais
    const mockStats = {
      totalTransferred: 156800, // $1,568.00
      totalTransfers: 47,
      avgTransferAmount: 3336, // $33.36
      totalUniversities: 12,
      successRate: 97.9,
      avgProcessingTime: 1.2 // 1.2 horas
    };
    setOverallStats(mockStats);
  };

  const loadTimeSeriesData = async () => {
    // Simular dados da série temporal baseados no período selecionado
    const mockTimeSeriesData: TransferReportData[] = [];
    const startDate = new Date(filters.dateFrom);
    const endDate = new Date(filters.dateTo);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    for (let i = 0; i < Math.min(diffDays, 30); i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      mockTimeSeriesData.push({
        period: date.toISOString().split('T')[0],
        totalAmount: Math.floor(Math.random() * 5000) + 1000, // $10-60
        transferCount: Math.floor(Math.random() * 8) + 1, // 1-8 transfers
        avgAmount: Math.floor(Math.random() * 2000) + 1000, // $10-30
        successRate: 95 + Math.random() * 5 // 95-100%
      });
    }
    
    setReportData(mockTimeSeriesData);
  };

  const loadUniversityPerformance = async () => {
    // Simular dados de performance por universidade
    const mockUniversityData: UniversityPerformance[] = [
      {
        university_name: 'Harvard University',
        total_amount: 25600,
        transfer_count: 8,
        avg_transfer_time: 0.8,
        success_rate: 100,
        last_transfer: '2024-01-15T14:30:00Z'
      },
      {
        university_name: 'Stanford University',
        total_amount: 18900,
        transfer_count: 6,
        avg_transfer_time: 1.2,
        success_rate: 100,
        last_transfer: '2024-01-14T16:45:00Z'
      },
      {
        university_name: 'MIT',
        total_amount: 31200,
        transfer_count: 12,
        avg_transfer_time: 0.5,
        success_rate: 91.7,
        last_transfer: '2024-01-16T11:20:00Z'
      },
      {
        university_name: 'Yale University',
        total_amount: 22100,
        transfer_count: 7,
        avg_transfer_time: 2.1,
        success_rate: 100,
        last_transfer: '2024-01-13T09:15:00Z'
      },
      {
        university_name: 'Princeton University',
        total_amount: 15800,
        transfer_count: 5,
        avg_transfer_time: 1.5,
        success_rate: 100,
        last_transfer: '2024-01-12T13:30:00Z'
      }
    ];
    setUniversityPerformance(mockUniversityData);
  };

  const loadPaymentMethodStats = async () => {
    // Simular estatísticas por método de pagamento
    const mockPaymentMethodData: PaymentMethodStats[] = [
      {
        method: 'Stripe Connect',
        count: 32,
        amount: 98400, // $984.00
        percentage: 62.8
      },
      {
        method: 'Bank Transfer',
        count: 15,
        amount: 58400, // $584.00
        percentage: 37.2
      }
    ];
    setPaymentMethodStats(mockPaymentMethodData);
  };

  const handleExportReport = async () => {
    setExporting(true);
    try {
      // Simular exportação de relatório
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Criar CSV com dados do relatório
      const csvData = [
        ['Date', 'Total Amount', 'Transfer Count', 'Avg Amount', 'Success Rate'],
        ...reportData.map(item => [
          item.period,
          (item.totalAmount / 100).toFixed(2),
          item.transferCount.toString(),
          (item.avgAmount / 100).toFixed(2),
          item.successRate.toFixed(1) + '%'
        ])
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transfer-report-${filters.dateFrom}-to-${filters.dateTo}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting report:', error);
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

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
          <h1 className="text-2xl font-bold text-gray-900">Transfer Reports</h1>
          <p className="text-gray-600">Financial analytics and transfer performance insights</p>
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
            onClick={handleExportReport}
            disabled={exporting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {exporting ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export Report
          </button>
          <button
            onClick={loadReportData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Report Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                aria-label="From date"
                title="From date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                aria-label="To date"
                title="To date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period
              </label>
              <select
                value={filters.period}
                onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value as any }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                aria-label="Report period"
                title="Report period"
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transfer Type
              </label>
              <select
                value={filters.transferType}
                onChange={(e) => setFilters(prev => ({ ...prev, transferType: e.target.value }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                aria-label="Transfer type filter"
                title="Transfer type filter"
              >
                <option value="all">All Types</option>
                <option value="manual">Manual</option>
                <option value="automatic">Automatic</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Transferred
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {formatCurrency(overallStats.totalTransferred)}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Transfers
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {overallStats.totalTransfers}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Universities
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {overallStats.totalUniversities}
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
                  Avg Processing Time
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {overallStats.avgProcessingTime.toFixed(1)}h
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transfer Volume Over Time */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Transfer Volume Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tickFormatter={formatDate}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip 
                formatter={(value) => [formatCurrency(value as number), 'Amount']}
                labelFormatter={(label) => formatDate(label)}
              />
              <Line 
                type="monotone" 
                dataKey="totalAmount" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Method Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Method Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentMethodStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ method, percentage }) => `${method}: ${percentage.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
              >
                {paymentMethodStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* University Performance Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">University Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  University
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transfers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Transfer
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {universityPerformance.map((university, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {university.university_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(university.total_amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {university.transfer_count}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {university.avg_transfer_time.toFixed(1)}h
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      university.success_rate >= 95 
                        ? 'bg-green-100 text-green-800' 
                        : university.success_rate >= 90 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {university.success_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(university.last_transfer).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
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

export default TransferReports;
