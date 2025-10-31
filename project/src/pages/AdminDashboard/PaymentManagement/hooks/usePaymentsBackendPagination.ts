import { useEffect } from 'react';
import { fetchPayments as fetchPaymentsApi } from '../data/adminPaymentsApi';

interface Params {
  activeTab: string;
  filters: any;
  currentPage: number;
  itemsPerPage: number;
  setLoading: (v: boolean) => void;
  setPayments: (data: any[]) => void;
  setBackendTotalCount: (n: number | null) => void;
}

export function usePaymentsBackendPagination({
  activeTab,
  filters,
  currentPage,
  itemsPerPage,
  setLoading,
  setPayments,
  setBackendTotalCount,
}: Params) {
  useEffect(() => {
    const isPaymentsTab = activeTab === 'payments';
    if (!isPaymentsTab) return;

    // Skip backend pagination when no specific university is selected
    if (!filters?.university || filters.university === 'all') return;

    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        const { data, count } = await fetchPaymentsApi({
          universityId: filters.university,
          page: currentPage,
          pageSize: itemsPerPage,
          filters: {
            application_status: undefined,
            payment_type:
              filters.feeType === 'application' ? 'application_fee' : filters.feeType === 'scholarship' ? 'scholarship_fee' : 'all',
            date_from: filters.dateFrom || undefined,
            date_to: filters.dateTo || undefined,
            search_query: filters.search || '',
            status: filters.status || 'all',
          },
          signal: controller.signal,
        });
        setPayments(data);
        setBackendTotalCount(count ?? null);
      } catch (_) {
        // silencioso por decisão do projeto
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [activeTab, filters.university, filters.feeType, filters.dateFrom, filters.dateTo, filters.search, filters.status, currentPage, itemsPerPage]);
}


