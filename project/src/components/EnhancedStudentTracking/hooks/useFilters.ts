import { useState, useCallback } from 'react';
import { FilterState } from '../types';

export const useFilters = () => {
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    sellerFilter: 'all',
    universityFilter: 'all',
    dateRange: {
      start: '',
      end: ''
    },
    statusFilter: 'all',
    paymentStatusFilter: 'all',
    sortBy: 'revenue',
    sortOrder: 'desc'
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const updateFilters = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      sellerFilter: 'all',
      universityFilter: 'all',
      dateRange: { start: '', end: '' },
      statusFilter: 'all',
      paymentStatusFilter: 'all',
      sortBy: 'revenue',
      sortOrder: 'desc'
    });
  }, []);

  const toggleAdvancedFilters = useCallback(() => {
    setShowAdvancedFilters(prev => !prev);
  }, []);

  return {
    filters,
    showAdvancedFilters,
    updateFilters,
    resetFilters,
    toggleAdvancedFilters
  };
};
