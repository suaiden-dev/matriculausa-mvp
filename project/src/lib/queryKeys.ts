/**
 * Centralização de todas as query keys hierárquicas
 * 
 * Estrutura hierárquica permite invalidação parcial:
 * - ['payments'] - invalida todos os payments
 * - ['payments', 'zelle'] - invalida apenas zelle payments
 * - ['payments', 'university-requests'] - invalida apenas university requests
 */

export const queryKeys = {
  // Payments
  payments: {
    all: ['payments'] as const,
    list: (filters?: any, pagination?: any) => ['payments', 'list', filters, pagination] as const,
    zelle: {
      all: ['payments', 'zelle'] as const,
      list: () => ['payments', 'zelle', 'list'] as const,
    },
    universityRequests: {
      all: ['payments', 'university-requests'] as const,
      list: () => ['payments', 'university-requests', 'list'] as const,
    },
    affiliateRequests: {
      all: ['payments', 'affiliate-requests'] as const,
      list: () => ['payments', 'affiliate-requests', 'list'] as const,
    },
    references: {
      universities: ['payments', 'references', 'universities'] as const,
      affiliates: ['payments', 'references', 'affiliates'] as const,
    },
  },
  // Students
  students: {
    all: ['students'] as const,
    list: (filters?: any, pagination?: any) => ['students', 'list', filters, pagination] as const,
    filterData: ['students', 'filter-data'] as const,
    details: (profileId?: string) => ['students', 'details', profileId] as const,
    secondaryData: (userId?: string) => ['students', 'secondary-data', userId] as const,
    pendingZellePayments: (userId?: string) => ['students', 'pending-zelle', userId] as const,
  },
} as const;

/**
 * Helpers para invalidação de queries
 */
export const invalidatePaymentQueries = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
};

export const invalidateZelleQueries = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.payments.zelle.all });
};

export const invalidateUniversityRequestsQueries = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.payments.universityRequests.all });
};

export const invalidateAffiliateRequestsQueries = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.payments.affiliateRequests.all });
};

export const invalidateStudentQueries = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
};

