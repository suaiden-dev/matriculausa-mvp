import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  CreditCard,
  Calendar,
  Tag,
  Percent,
  X
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
  student_email?: string | null;
  seller_referral_code?: string | null;
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
  affiliates?: any[];
}

export const FinancialTransactionsTable: React.FC<FinancialTransactionsTableProps> = ({ 
  transactions,
  loading,
  affiliates = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Transaction>('payment_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filterFeeType, setFilterFeeType] = useState<string[]>([]);
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string[]>([]);
  const [filterAffiliate, setFilterAffiliate] = useState<string[]>([]);
  const [filterValueMin, setFilterValueMin] = useState<string>('');
  const [filterValueMax, setFilterValueMax] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter function to exclude test users (@uorak.com) in production/staging
  const shouldFilter = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    const href = window.location.href;
    
    const isProduction = hostname === 'matriculausa.com' || 
                         hostname.includes('matriculausa.com') ||
                         href.includes('matriculausa.com');
    
    const isStaging = hostname === 'staging-matriculausa.netlify.app' || 
                      hostname.includes('staging-matriculausa.netlify.app') ||
                      hostname.includes('staging-matriculausa') ||
                      href.includes('staging-matriculausa.netlify.app') ||
                      href.includes('staging-matriculausa');
    
    return isProduction || isStaging;
  }, []);

  const shouldExcludeStudent = (email: string | null | undefined): boolean => {
    if (!shouldFilter) return false; // Em localhost, não excluir
    if (!email) return false; // Se não tem email, não excluir
    return email.toLowerCase().includes('@uorak.com');
  };

  // Get unique fee types and payment methods
  const uniqueFeeTypes = useMemo(() => {
    const types = new Set(transactions.map(t => t.fee_type));
    return Array.from(types).sort();
  }, [transactions]);

  const uniquePaymentMethods = useMemo(() => {
    const methods = new Set(transactions.map(t => t.payment_method).filter(Boolean));
    // Keep all methods to allow explicit filtering, including zelle
    return Array.from(methods).sort();
  }, [transactions]);

  // Get unique affiliates from transactions (matching by referral code)
  const uniqueAffiliates = useMemo(() => {
    const affiliateMap = new Map<string, any>();
    
    transactions.forEach(t => {
      if (!t.seller_referral_code) return;
      
      // Find affiliate by referral code (same logic as StudentApplicationsView)
      let affiliate = affiliates.find((aff: any) => 
        aff.referral_code === t.seller_referral_code
      );
      
      if (!affiliate) {
        // If not found, search in sellers
        affiliate = affiliates.find((aff: any) => 
          aff.sellers?.some((s: any) => s.referral_code === t.seller_referral_code)
        );
      }
      
      if (affiliate && !affiliateMap.has(affiliate.id)) {
        affiliateMap.set(affiliate.id, affiliate);
      }
    });
    
    return Array.from(affiliateMap.values()).sort((a, b) => 
      (a.name || a.email || '').localeCompare(b.name || b.email || '')
    );
  }, [transactions, affiliates]);

  // Get affiliate ID from transaction's seller_referral_code
  const getAffiliateIdFromTransaction = (transaction: Transaction): string | null => {
    if (!transaction.seller_referral_code) return null;
    
    // Find affiliate by referral code (same logic as StudentApplicationsView)
    let affiliate = affiliates.find((aff: any) => 
      aff.referral_code === transaction.seller_referral_code
    );
    
    if (!affiliate) {
      // If not found, search in sellers
      affiliate = affiliates.find((aff: any) => 
        aff.sellers?.some((s: any) => s.referral_code === transaction.seller_referral_code)
      );
    }
    
    return affiliate?.id || null;
  };

  // Reset filters
  const resetFilters = () => {
    setFilterFeeType([]);
    setFilterPaymentMethod([]);
    setFilterAffiliate([]);
    setFilterValueMin('');
    setFilterValueMax('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setCurrentPage(1);
    setSelectedTransactions(new Set());
    setSelectAll(false);
  };

  // Toggle payment method in filter
  const togglePaymentMethod = (method: string) => {
    setFilterPaymentMethod(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  // Toggle affiliate in filter
  const toggleAffiliate = (code: string) => {
    setFilterAffiliate(prev => 
      prev.includes(code) 
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  // Handle transaction selection
  const handleSelectTransaction = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
    setSelectAll(newSelected.size === currentTransactions.length && currentTransactions.length > 0);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTransactions(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(currentTransactions.map(t => t.id));
      setSelectedTransactions(allIds);
      setSelectAll(true);
    }
  };


  // Check if any filter is active
  const hasActiveFilters = filterFeeType.length > 0 || filterPaymentMethod.length > 0 || filterAffiliate.length > 0 || filterValueMin || filterValueMax || filterDateFrom || filterDateTo;

  // Toggle fee type in filter
  const toggleFeeType = (feeType: string) => {
    setFilterFeeType(prev => 
      prev.includes(feeType) 
        ? prev.filter(t => t !== feeType)
        : [...prev, feeType]
    );
  };

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
    return new Date(dateString).toLocaleDateString('en-US', {
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
        return `Coupon ${transaction.coupon_code} (${transaction.discount_value}% off)`;
      }
      return `Coupon ${transaction.coupon_code}`;
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
    .filter(t => {
      // Exclude test users (@uorak.com) in production/staging
      if (shouldExcludeStudent(t.student_email)) return false;

      // Search filter
      const matchesSearch = 
      t.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.fee_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.payment_method.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.payment_intent_id && t.payment_intent_id.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      // Fee type filter (multiple selection)
      if (filterFeeType.length > 0 && !filterFeeType.includes(t.fee_type)) return false;

      // Payment method filter (multiple selection)
      if (filterPaymentMethod.length > 0 && !filterPaymentMethod.includes(t.payment_method)) return false;

      // Affiliate filter (multiple selection) - same logic as StudentApplicationsView
      if (filterAffiliate.length > 0) {
        const affiliateId = getAffiliateIdFromTransaction(t);
        if (!affiliateId || !filterAffiliate.includes(affiliateId)) return false;
      }

      // Date range filter
      const paymentDate = new Date(t.payment_date);
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        if (paymentDate < fromDate) return false;
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        // include the entire end day by setting time to end-of-day
        toDate.setHours(23, 59, 59, 999);
        if (paymentDate > toDate) return false;
      }

      // Value filters (using standard_amount)
      const value = t.standard_amount;
      if (filterValueMin) {
        const minValue = parseFloat(filterValueMin);
        if (!isNaN(minValue) && value < minValue) return false;
      }
      if (filterValueMax) {
        const maxValue = parseFloat(filterValueMax);
        if (!isNaN(maxValue) && value > maxValue) return false;
      }

      return true;
    })
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

  // Calculate totals from filtered transactions
  const totals = useMemo(() => {
    let totalGross = 0;
    let totalFees = 0;
    
    filteredTransactions.forEach(transaction => {
      const gross = transaction.gross_amount_usd || transaction.amount || 0;
      const fees = transaction.fee_amount_usd || 0;
      totalGross += gross;
      totalFees += fees;
    });
    
    const totalNet = totalGross - totalFees;
    
    return {
      gross: totalGross,
      fees: totalFees,
      net: totalNet
    };
  }, [filteredTransactions]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  // Calculate totals for selected transactions
  const calculateSelectedTotals = useMemo(() => {
    let totalGross = 0;
    let totalFees = 0;
    
    filteredTransactions
      .filter(t => selectedTransactions.has(t.id))
      .forEach(transaction => {
        const gross = transaction.gross_amount_usd || transaction.amount || 0;
        const fees = transaction.fee_amount_usd || 0;
        totalGross += gross;
        totalFees += fees;
      });
    
    const totalNet = totalGross - totalFees;
    
    return {
      gross: totalGross,
      fees: totalFees,
      net: totalNet,
      count: selectedTransactions.size
    };
  }, [filteredTransactions, selectedTransactions]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedTransactions(new Set());
    setSelectAll(false);
  }, [filterFeeType, filterPaymentMethod, filterAffiliate, filterValueMin, filterValueMax, filterDateFrom, filterDateTo, searchTerm]);

  // Update selectAll when currentTransactions change
  useEffect(() => {
    if (currentTransactions.length > 0) {
      const allSelected = currentTransactions.every(t => selectedTransactions.has(t.id));
      setSelectAll(allSelected);
    } else {
      setSelectAll(false);
    }
  }, [currentTransactions, selectedTransactions]);

  // Export to CSV
  const exportToCSV = () => {
    // Create CSV headers
    const headers = [
      'Student Name',
      'Fee Type',
      'Fee Amount (USD)',
      'Payment Method',
      'Amount Paid by Customer (USD)',
      'Fees (USD)',
      'Net Amount (USD)',
      'Payment Date',
      'Payment Intent ID',
      'Coupon',
      'Discount (USD)'
    ];

    // Create CSV rows
    const rows = filteredTransactions.map(transaction => {
      const gross = transaction.gross_amount_usd || transaction.amount;
      const fees = transaction.fee_amount_usd || 0;
      const net = gross - fees;
      
      return [
        transaction.student_name || '',
        formatFeeType(transaction.fee_type),
        transaction.standard_amount?.toFixed(2) || '0.00',
        transaction.payment_method || '',
        gross.toFixed(2),
        fees.toFixed(2),
        net.toFixed(2),
        new Date(transaction.payment_date).toLocaleString('en-US'),
        transaction.payment_intent_id || '',
        transaction.coupon_code || '',
        transaction.discount_amount?.toFixed(2) || '0.00'
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape commas and quotes in cell content
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          <h2 className="text-lg font-semibold text-gray-900">Transaction Details</h2>
          <p className="text-sm text-gray-500">View all fees and detailed payments</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transaction..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors ${
              hasActiveFilters 
                ? 'bg-blue-50 text-blue-600 border-blue-200' 
                : 'text-gray-600 hover:bg-gray-50 border-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
          <button 
            onClick={exportToCSV}
            disabled={filteredTransactions.length === 0}
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export to CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Filters</h3>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Clear filters
                </button>
              )}
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Fee Type Filter - Multiple Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Fee Type {filterFeeType.length > 0 && `(${filterFeeType.length} selected)`}
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white p-2 space-y-2">
                {uniqueFeeTypes.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">No types available</p>
                ) : (
                  uniqueFeeTypes.map(type => (
                    <label
                      key={type}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filterFeeType.includes(type)}
                        onChange={() => toggleFeeType(type)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{formatFeeType(type)}</span>
                    </label>
                  ))
                )}
              </div>
              {filterFeeType.length > 0 && (
                <button
                  onClick={() => setFilterFeeType([])}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Clear selection
                </button>
              )}
            </div>

            {/* Payment Method Filter - Multiple Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Payment Method {filterPaymentMethod.length > 0 && `(${filterPaymentMethod.length} selected)`}
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white p-2 space-y-2">
                {uniquePaymentMethods.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">No methods available</p>
                ) : (
                  uniquePaymentMethods.map(method => (
                    <label
                      key={method}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filterPaymentMethod.includes(method)}
                        onChange={() => togglePaymentMethod(method)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">{method}</span>
                    </label>
                  ))
                )}
              </div>
              {filterPaymentMethod.length > 0 && (
                <button
                  onClick={() => setFilterPaymentMethod([])}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Clear selection
                </button>
              )}
            </div>

            {/* Affiliate Filter - Multiple Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Admin Affiliate {filterAffiliate.length > 0 && `(${filterAffiliate.length} selected)`}
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white p-2 space-y-2">
                {uniqueAffiliates.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">No affiliates available</p>
                ) : (
                  uniqueAffiliates.map(affiliate => (
                    <label
                      key={affiliate.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filterAffiliate.includes(affiliate.id)}
                        onChange={() => toggleAffiliate(affiliate.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{affiliate.name || affiliate.email || 'Unknown'}</span>
                    </label>
                  ))
                )}
              </div>
              {filterAffiliate.length > 0 && (
                <button
                  onClick={() => setFilterAffiliate([])}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Clear selection
                </button>
              )}
            </div>

            {/* Min Value Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Min Value (USD)
              </label>
              <input
                type="number"
                value={filterValueMin}
                onChange={(e) => setFilterValueMin(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Max Value Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Max Value (USD)
              </label>
              <input
                type="number"
                value={filterValueMax}
                onChange={(e) => setFilterValueMax(e.target.value)}
                placeholder="999999.99"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date From Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Date From
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date To Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Date To
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gross Amount Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-blue-700 uppercase tracking-wide">Gross Amount</h3>
              <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center">
                <span className="text-blue-700 text-xs font-bold">$</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(totals.gross)}</p>
            <p className="text-xs text-blue-600 mt-1">{filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Fees Card */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-red-700 uppercase tracking-wide">Total Fees</h3>
              <div className="w-8 h-8 bg-red-200 rounded-lg flex items-center justify-center">
                <span className="text-red-700 text-xs font-bold">-</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-red-900">- {formatCurrency(totals.fees)}</p>
            <p className="text-xs text-red-600 mt-1">Platform fees</p>
          </div>

          {/* Net Amount Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Net Amount</h3>
              <div className="w-8 h-8 bg-emerald-200 rounded-lg flex items-center justify-center">
                <span className="text-emerald-700 text-xs font-bold">✓</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-900">{formatCurrency(totals.net)}</p>
            <p className="text-xs text-emerald-600 mt-1">After fees</p>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedTransactions.size > 0 && (
        <div className="px-6 py-3 border-b border-gray-100 bg-blue-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-900">
                {selectedTransactions.size} transaction{selectedTransactions.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-gray-600">Gross: </span>
                  <span className="font-semibold text-blue-900">{formatCurrency(calculateSelectedTotals.gross)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Fees: </span>
                  <span className="font-semibold text-red-900">- {formatCurrency(calculateSelectedTotals.fees)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Net: </span>
                  <span className="font-semibold text-emerald-900">{formatCurrency(calculateSelectedTotals.net)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedTransactions(new Set());
                setSelectAll(false);
              }}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('student_name')}
              >
                <div className="flex items-center gap-1">
                  Transaction / Name
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
                  Fee Amount
                  <span className="text-blue-600">{renderSortIcon('standard_amount')}</span>
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('payment_method')}
              >
                <div className="flex items-center gap-1">
                  Method
                  <span className="text-blue-600">{renderSortIcon('payment_method')}</span>
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center gap-1">
                  Paid by Customer
                  <span className="text-blue-600">{renderSortIcon('amount')}</span>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fees
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Net Amount
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
                      <input
                        type="checkbox"
                        checked={selectedTransactions.has(transaction.id)}
                        onChange={() => handleSelectTransaction(transaction.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                      />
                    </td>
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
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 w-fit">
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
                            Discount: -{formatCurrency(transaction.discount_amount)}
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
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                          No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredTransactions.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">
              Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredTransactions.length)}</span> of <span className="font-medium">{filteredTransactions.length}</span> results
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="itemsPerPage" className="text-sm text-gray-600">
                Items per page:
              </label>
              <select
                id="itemsPerPage"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when changing items per page
                }}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          {totalPages > 1 && (
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
          )}
        </div>
      )}
    </div>
  );
};
