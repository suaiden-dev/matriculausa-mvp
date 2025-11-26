import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  CreditCard,
  Calendar,
  Tag,
  Percent
} from 'lucide-react';

interface Transaction {
  id: string;
  user_id: string;
  fee_type: string;
  amount: number;
  gross_amount_usd: number | null;
  fee_amount_usd: number | null;
  payment_date: string;
  payment_method: string;
  payment_intent_id: string | null;
  student_name: string;
  standard_amount: number;
  // Override fields
  override_selection_process?: number | null;
  override_application?: number | null;
  override_scholarship?: number | null;
  override_i20?: number | null;
  // Coupon fields
  coupon_code?: string | null;
  coupon_name?: string | null;
  discount_amount?: number | null;
  original_amount?: number | null;
  discount_type?: string | null;
  discount_value?: number | null;
}

interface FinancialTransactionsTableProps {
  transactions: Transaction[];
  loading: boolean;
}

export const FinancialTransactionsTable: React.FC<FinancialTransactionsTableProps> = ({ 
  transactions,
  loading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Transaction>('payment_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 10;

  // Format currency
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Format fee type
  const formatFeeType = (type: string) => {
    switch (type) {
      case 'selection_process_fee':
      case 'selection_process':
        return 'Selection Process';
      case 'application_fee':
      case 'application':
        return 'Application Fee';
      case 'scholarship_fee':
      case 'scholarship':
        return 'Scholarship Fee';
      case 'i20_control_fee':
        return 'I-20 Control Fee';
      default:
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get override amount for specific fee type
  const getOverrideAmount = (transaction: Transaction): number | null => {
    const feeType = transaction.fee_type;
    if (feeType === 'selection_process' && transaction.override_selection_process) {
      return transaction.override_selection_process;
    }
    if (feeType === 'application' && transaction.override_application) {
      return transaction.override_application;
    }
    if (feeType === 'scholarship' && transaction.override_scholarship) {
      return transaction.override_scholarship;
    }
    if (feeType === 'i20_control' && transaction.override_i20) {
      return transaction.override_i20;
    }
    return null;
  };

  // Check if transaction has discount
  const hasDiscount = (transaction: Transaction): boolean => {
    return !!(getOverrideAmount(transaction) || transaction.coupon_code);
  };

  // Get discount details
  const getDiscountLabel = (transaction: Transaction): string | null => {
    const override = getOverrideAmount(transaction);
    if (override) {
      return `Override: ${formatCurrency(override)}`;
    }
    if (transaction.coupon_code) {
      if (transaction.discount_type === 'percentage' && transaction.discount_value) {
        return `Cupom ${transaction.coupon_code} (${transaction.discount_value}% off)`;
      }
      return `Cupom ${transaction.coupon_code}`;
    }
    return null;
  };

  // Handle sort
  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default to desc for new field
    }
  };

  // Filter and Sort transactions
  const filteredTransactions = transactions
    .filter(t => 
      t.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.fee_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.payment_method.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.payment_intent_id && t.payment_intent_id.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle specific fields
      if (sortField === 'student_name') {
        aValue = a.student_name.toLowerCase();
        bValue = b.student_name.toLowerCase();
      } else if (sortField === 'payment_date') {
        aValue = new Date(a.payment_date).getTime();
        bValue = new Date(b.payment_date).getTime();
      }

      // Handle nulls
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const renderSortIcon = (field: keyof Transaction) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Detalhes das Transações</h2>
          <p className="text-sm text-gray-500">Visualize todas as taxas e pagamentos detalhados</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar transação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
          </div>
          <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
            <Filter className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th 
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('student_name')}
              >
                <div className="flex items-center gap-1">
                  Transação / Nome
                  <span className="text-blue-600">{renderSortIcon('student_name')}</span>
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('fee_type')}
              >
                <div className="flex items-center gap-1">
                  Fee Type
                  <span className="text-blue-600">{renderSortIcon('fee_type')}</span>
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('standard_amount')}
              >
                <div className="flex items-center gap-1">
                  Valor da Taxa
                  <span className="text-blue-600">{renderSortIcon('standard_amount')}</span>
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('payment_method')}
              >
                <div className="flex items-center gap-1">
                  Método
                  <span className="text-blue-600">{renderSortIcon('payment_method')}</span>
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center gap-1">
                  Pago pelo Cliente
                  <span className="text-blue-600">{renderSortIcon('amount')}</span>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Taxas (Fees)
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor Líquido
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentTransactions.length > 0 ? (
              currentTransactions.map((transaction) => {
                const gross = transaction.gross_amount_usd || transaction.amount;
                const fees = transaction.fee_amount_usd || 0;
                const net = gross - fees;

                return (
                  <tr key={transaction.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{transaction.student_name}</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(transaction.payment_date)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {formatFeeType(transaction.fee_type)}
                        </span>
                        {hasDiscount(transaction) && (
                          <div className="flex items-center gap-1">
                            {transaction.coupon_code ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                <Tag className="w-3 h-3 mr-1" />
                                {getDiscountLabel(transaction)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                                <Percent className="w-3 h-3 mr-1" />
                                {getDiscountLabel(transaction)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-gray-600">
                          {formatCurrency(transaction.standard_amount)}
                        </span>
                        {hasDiscount(transaction) && transaction.discount_amount && (
                          <span className="text-xs text-green-600 font-medium">
                            Desconto: -{formatCurrency(transaction.discount_amount)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-full ${
                          transaction.payment_method === 'stripe' ? 'bg-indigo-50 text-indigo-600' : 
                          transaction.payment_method === 'zelle' ? 'bg-purple-50 text-purple-600' : 
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <CreditCard className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-gray-700 capitalize">{transaction.payment_method}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(gross)}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600">
                      - {formatCurrency(fees)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-emerald-600">
                        {formatCurrency(net)}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Nenhuma transação encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando <span className="font-medium">{startIndex + 1}</span> a <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredTransactions.length)}</span> de <span className="font-medium">{filteredTransactions.length}</span> resultados
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
