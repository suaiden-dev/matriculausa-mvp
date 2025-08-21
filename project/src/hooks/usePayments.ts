import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface PaymentData {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  university_id: string;
  university_name: string;
  payment_type: string;
  amount_charged: number;
  currency: string;
  status: string;
  created_at: string;
  stripe_payment_intent_id?: string;
  transfer_status?: string;
  transfer_method?: string;
}

export interface PaymentStats {
  total_revenue: number;
  total_payments: number;
  completed_payments: number;
  pending_payments: number;
  processing_payments: number;
}

export interface GetPaymentsResponse {
  payments: PaymentData[];
  stats: PaymentStats;
  total_count: number;
  page: number;
  page_size: number;
}

export interface PaymentFilters {
  status_filter: string;
  payment_type_filter: string;
  date_from: string;
  date_to: string;
  search_query: string;
}

export const usePayments = (universityId: string | undefined) => {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    total_revenue: 0,
    total_payments: 0,
    completed_payments: 0,
    pending_payments: 0,
    processing_payments: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filter state
  const [filters, setFilters] = useState<PaymentFilters>({
    status_filter: 'all',
    payment_type_filter: 'all',
    date_from: '',
    date_to: '',
    search_query: '',
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  const loadPayments = async (page: number = 1) => {
    if (!universityId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/get-university-payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`,
        },
        body: JSON.stringify({
          university_id: universityId,
          page,
          page_size: pageSize,
          ...filters,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }

      const data: GetPaymentsResponse = await response.json();
      
      setPayments(data.payments);
      setStats(data.stats);
      setTotalCount(data.total_count);
      setCurrentPage(data.page);
      
    } catch (err) {
      console.error('Error loading payments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const updateFilters = (newFilters: Partial<PaymentFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setCurrentPage(1);
    loadPayments(1);
  };

  const clearFilters = () => {
    const clearedFilters: PaymentFilters = {
      status_filter: 'all',
      payment_type_filter: 'all',
      date_from: '',
      date_to: '',
      search_query: '',
    };
    setFilters(clearedFilters);
    setCurrentPage(1);
    loadPayments(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadPayments(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    loadPayments(1);
  };

  const exportPayments = async (): Promise<Blob> => {
    if (!universityId) {
      throw new Error('University ID is required');
    }
    
    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/export-payments-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabase.supabaseKey}`,
      },
      body: JSON.stringify({
        university_id: universityId,
        ...filters,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to export payments');
    }

    return await response.blob();
  };

  useEffect(() => {
    if (universityId) {
      loadPayments(1);
    }
  }, [universityId]);

  return {
    // Data
    payments,
    stats,
    totalCount,
    totalPages,
    
    // State
    loading,
    error,
    currentPage,
    pageSize,
    filters,
    
    // Actions
    loadPayments,
    updateFilters,
    clearFilters,
    handlePageChange,
    handlePageSizeChange,
    exportPayments,
    
    // Computed
    hasPayments: payments.length > 0,
    hasFilters: Object.values(filters).some(value => value !== 'all' && value !== ''),
  };
};
