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

    // ✅ Atualizado: Suporta seleção múltipla (array) ou seleção única (string)
    const matchesUniversity = (() => {
      if (Array.isArray(filters.university)) {
        return filters.university.length === 0 || filters.university.includes('all') || filters.university.includes(payment.university_id);
      }
      return filters.university === 'all' || payment.university_id === filters.university;
    })();

    const matchesFeeType = (() => {
      if (Array.isArray(filters.feeType)) {
        return filters.feeType.length === 0 || filters.feeType.includes('all') || filters.feeType.includes(payment.fee_type);
      }
      return filters.feeType === 'all' || payment.fee_type === filters.feeType;
    })();

    const matchesStatus = (() => {
      if (Array.isArray(filters.status)) {
        return filters.status.length === 0 || filters.status.includes('all') || filters.status.includes(payment.status);
      }
      return filters.status === 'all' || payment.status === filters.status;
    })();
    
    // ✅ Atualizado: Filtro por método de pagamento com suporte a seleção múltipla
    const matchesPaymentMethod = (() => {
      const paymentMethodFilter = filters.paymentMethod;
      if (!paymentMethodFilter || (Array.isArray(paymentMethodFilter) && paymentMethodFilter.length === 0)) return true;
      
      // Função auxiliar para mapear valor do filtro para valor do banco
      const mapFilterToDbValue = (filterValue: string): string => {
        if (filterValue === 'pix') return 'stripe'; // PIX também é 'stripe' no banco
        if (filterValue === 'stripe') return 'stripe'; // Stripe (cartão) é 'stripe' no banco
        if (filterValue === 'zelle') return 'zelle';
        if (filterValue === 'outside') return 'manual';
        return filterValue;
      };

      // Função auxiliar para verificar se um pagamento corresponde ao filtro
      const matchesFilterValue = (filterValue: string, paymentMethod: string | undefined, metadata: any): boolean => {
        // Se o filtro é 'pix', verificar se payment_method é 'pix' OU se é 'stripe' com metadata PIX
        if (filterValue === 'pix') {
          // Caso 1: payment_method já é 'pix' diretamente
          if (paymentMethod === 'pix') return true;
          // Caso 2: payment_method é 'stripe' mas é PIX via metadata
          if (paymentMethod === 'stripe') {
            return metadata?.payment_method === 'pix' || metadata?.is_pix === true;
          }
          return false;
        }
        
        // Se o filtro é 'stripe', verificar se é stripe mas NÃO é PIX
        if (filterValue === 'stripe') {
          // Se payment_method é 'pix', não é stripe
          if (paymentMethod === 'pix') return false;
          // Deve ser 'stripe' no payment_method
          if (paymentMethod !== 'stripe') return false;
          // E NÃO deve ser PIX via metadata
          return metadata?.payment_method !== 'pix' && metadata?.is_pix !== true;
        }
        
        // Para outros métodos, usar mapeamento normal
        const dbValue = mapFilterToDbValue(filterValue);
        return paymentMethod === dbValue;
      };

      if (Array.isArray(paymentMethodFilter)) {
        if (paymentMethodFilter.includes('all')) return true;
        return paymentMethodFilter.some(filterValue => {
          return matchesFilterValue(filterValue, payment.payment_method, payment.metadata);
        });
      }
      
      // Compatibilidade com string única
      if (paymentMethodFilter === 'all') return true;
      return matchesFilterValue(paymentMethodFilter, payment.payment_method, payment.metadata);
    })();

    const matchesAffiliate = (function () {
      const affiliateFilter = filters.affiliate;
      if (!affiliateFilter || (Array.isArray(affiliateFilter) && affiliateFilter.length === 0)) return true;
      if (!payment.seller_referral_code) return false;
      
      let affiliate = affiliates.find((aff) => aff.referral_code === payment.seller_referral_code);
      if (!affiliate) {
        affiliate = affiliates.find((aff) => aff.sellers?.some((s: any) => s.referral_code === payment.seller_referral_code));
      }
      
      if (Array.isArray(affiliateFilter)) {
        if (affiliateFilter.includes('all')) return true;
        return affiliate && affiliateFilter.includes(affiliate.id);
      }
      
      // Compatibilidade com string única
      if (affiliateFilter === 'all') return true;
      return affiliate && affiliate.id === affiliateFilter;
    })();

    let matchesDate = true;
    if (filters.dateFrom || filters.dateTo) {
      const paymentDate = new Date(payment.payment_date || payment.created_at);
      if (filters.dateFrom) matchesDate = matchesDate && paymentDate >= new Date(filters.dateFrom);
      if (filters.dateTo) matchesDate = matchesDate && paymentDate <= new Date(filters.dateTo);
    }

    return matchesSearch && matchesUniversity && matchesFeeType && matchesStatus && matchesPaymentMethod && matchesAffiliate && matchesDate;
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


