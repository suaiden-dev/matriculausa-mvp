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
  // Student Dashboard (student-specific data)
  studentDashboard: {
    all: ['student-dashboard'] as const,
    profile: (userId?: string) => ['student-dashboard', 'profile', userId] as const,
    applications: {
      all: ['student-dashboard', 'applications'] as const,
      list: (userId?: string) => ['student-dashboard', 'applications', 'list', userId] as const,
      recent: (userId?: string) => ['student-dashboard', 'applications', 'recent', userId] as const,
    },
    documents: {
      all: ['student-dashboard', 'documents'] as const,
      list: (userId?: string) => ['student-dashboard', 'documents', 'list', userId] as const,
    },
    scholarships: {
      all: ['student-dashboard', 'scholarships'] as const,
      list: () => ['student-dashboard', 'scholarships', 'list'] as const,
      featured: () => ['student-dashboard', 'scholarships', 'featured'] as const,
    },
    fees: {
      all: ['student-dashboard', 'fees'] as const,
      config: (userId?: string) => ['student-dashboard', 'fees', 'config', userId] as const,
      paidAmounts: (userId?: string) => ['student-dashboard', 'fees', 'paid-amounts', userId] as const,
    },
    coupons: {
      all: ['student-dashboard', 'coupons'] as const,
      promotional: (userId?: string, feeType?: string) => ['student-dashboard', 'coupons', 'promotional', userId, feeType] as const,
    },
    identityPhoto: {
      all: ['student-dashboard', 'identity-photo'] as const,
      status: (userId?: string) => ['student-dashboard', 'identity-photo', 'status', userId] as const,
    },
    referral: {
      all: ['student-dashboard', 'referral'] as const,
      discount: (userId?: string) => ['student-dashboard', 'referral', 'discount', userId] as const,
    },
    rewards: {
      all: ['student-dashboard', 'rewards'] as const,
      affiliateCode: (userId?: string) => ['student-dashboard', 'rewards', 'affiliate-code', userId] as const,
      credits: (userId?: string) => ['student-dashboard', 'rewards', 'credits', userId] as const,
      referrals: (userId?: string) => ['student-dashboard', 'rewards', 'referrals', userId] as const,
      transactions: (userId?: string) => ['student-dashboard', 'rewards', 'transactions', userId] as const,
      universities: () => ['student-dashboard', 'rewards', 'universities'] as const,
    },
  },
  // Affiliate Admin Dashboard
  affiliateAdmin: {
    all: ['affiliate-admin'] as const,
    adminData: (userId?: string) => ['affiliate-admin', 'admin-data', userId] as const,
    sellers: (affiliateAdminId?: string) => ['affiliate-admin', 'sellers', affiliateAdminId] as const,
    studentProfiles: (userId?: string) => ['affiliate-admin', 'student-profiles', userId] as const,
    feeOverrides: (userIds: string[]) => ['affiliate-admin', 'fee-overrides', ...userIds] as const,
    realPaidAmounts: (userIds: string[]) => ['affiliate-admin', 'real-paid-amounts', ...userIds] as const,
    paymentMethods: (profileIds: string[]) => ['affiliate-admin', 'payment-methods', ...profileIds] as const,
    revenueCalculation: (userId?: string, profileCount?: number) => ['affiliate-admin', 'revenue-calculation', userId, profileCount] as const,
    // Enhanced Student Tracking específicos
    studentOverrides: (userIds: string[]) => ['affiliate-admin', 'student-overrides', ...userIds] as const,
    studentDependents: (profileIds: string[]) => ['affiliate-admin', 'student-dependents', ...profileIds] as const,
    blackCouponUsers: () => ['affiliate-admin', 'black-coupon-users'] as const,
    // Student Details Cache
    studentDetails: (studentId?: string, profileId?: string) => ['affiliate-admin', 'student-details', studentId, profileId] as const,
    studentApplications: (profileId?: string) => ['affiliate-admin', 'student-applications', profileId] as const,
    studentDocuments: (profileId?: string) => ['affiliate-admin', 'student-documents', profileId] as const,
    studentFeeHistory: (studentUserId?: string) => ['affiliate-admin', 'student-fee-history', studentUserId] as const,
    // Financial Overview Cache
    financialOverview: {
      all: (userId?: string) => ['affiliate-admin', 'financial-overview', userId] as const,
      stats: (userId?: string) => ['affiliate-admin', 'financial-overview', 'stats', userId] as const,
      analytics: (userId?: string) => ['affiliate-admin', 'financial-overview', 'analytics', userId] as const,
      paymentRequests: (userId?: string) => ['affiliate-admin', 'financial-overview', 'payment-requests', userId] as const,
    },
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

/**
 * Helpers para invalidação de queries do Student Dashboard
 */
export const invalidateStudentDashboardProfile = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: ['student-dashboard', 'profile'] });
};

export const invalidateStudentDashboardApplications = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.applications.all });
};

export const invalidateStudentDashboardDocuments = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.documents.all });
};

export const invalidateStudentDashboardFees = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.fees.all });
};

export const invalidateStudentDashboardCoupons = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.coupons.all });
};

export const invalidateStudentDashboardAll = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.all });
};

export const invalidateStudentDashboardRewards = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.rewards.all });
};

/**
 * Helpers para invalidação de queries do Affiliate Admin Dashboard
 */
export const invalidateAffiliateAdminAll = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.affiliateAdmin.all });
};

export const invalidateAffiliateAdminSellers = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: ['affiliate-admin', 'sellers'] });
};

export const invalidateAffiliateAdminStudentProfiles = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: ['affiliate-admin', 'student-profiles'] });
};

export const invalidateAffiliateAdminRevenueCalculation = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: ['affiliate-admin', 'revenue-calculation'] });
};

export const invalidateAffiliateAdminFinancialOverview = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: ['affiliate-admin', 'financial-overview'] });
};
