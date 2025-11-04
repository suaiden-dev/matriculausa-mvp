import type { PaymentRecord, AdminPaymentsFilters as Filters } from '../data/types';

// Filters type imported from data/types

export function filterPayments(
  payments: PaymentRecord[],
  filters: Filters,
  affiliates: any[]
): PaymentRecord[] {
  return payments.filter((payment) => {
    if (payment.scholarship_title === 'Current Students Scholarship') return false;

    const searchTerm = (filters.search || '').toLowerCase();
    const matchesSearch =
      (payment.student_name || '').toLowerCase().includes(searchTerm) ||
      (payment.student_email || '').toLowerCase().includes(searchTerm) ||
      (payment.university_name || '').toLowerCase().includes(searchTerm) ||
      (payment.scholarship_title || '').toLowerCase().includes(searchTerm);

    const matchesUniversity = filters.university === 'all' || payment.university_id === filters.university;
    const matchesFeeType = filters.feeType === 'all' || payment.fee_type === filters.feeType;
    const matchesStatus = filters.status === 'all' || payment.status === filters.status;

    const matchesAffiliate = (function () {
      if (!filters.affiliate || filters.affiliate === 'all') return true;
      if (!payment.seller_referral_code) return false;
      let affiliate = affiliates.find((aff) => aff.referral_code === payment.seller_referral_code);
      if (!affiliate) {
        affiliate = affiliates.find((aff) => aff.sellers?.some((s: any) => s.referral_code === payment.seller_referral_code));
      }
      return affiliate && affiliate.id === filters.affiliate;
    })();

    let matchesDate = true;
    if (filters.dateFrom || filters.dateTo) {
      const paymentDate = new Date(payment.payment_date || payment.created_at);
      if (filters.dateFrom) matchesDate = matchesDate && paymentDate >= new Date(filters.dateFrom);
      if (filters.dateTo) matchesDate = matchesDate && paymentDate <= new Date(filters.dateTo);
    }

    return matchesSearch && matchesUniversity && matchesFeeType && matchesStatus && matchesAffiliate && matchesDate;
  });
}

export function sortPayments(
  payments: PaymentRecord[],
  sortBy: keyof PaymentRecord,
  sortOrder: 'asc' | 'desc'
): PaymentRecord[] {
  const arr = [...payments];
  arr.sort((a, b) => {
    let aValue: any = a[sortBy] as any;
    let bValue: any = b[sortBy] as any;
    if (sortBy === 'amount') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    } else if (sortBy === 'created_at' || sortBy === 'payment_date') {
      const aDate = aValue ? new Date(aValue as string) : new Date(0);
      const bDate = bValue ? new Date(bValue as string) : new Date(0);
      aValue = aDate.getTime();
      bValue = bDate.getTime();
    } else if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    if (aValue === undefined || aValue === null || bValue === undefined || bValue === null) {
      if (aValue == null && bValue == null) return 0;
      return aValue == null ? 1 : -1;
    }
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
  return arr;
}


