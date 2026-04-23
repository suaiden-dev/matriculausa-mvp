export interface FinancialMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;
  conversionRate: number;
  averageTransactionValue: number;
  totalStudents: number;
  pendingPayouts: number;
  completedPayouts: number;
  completedAffiliatePayouts: number;
  completedUniversityPayouts: number;
  universityPayouts: number;
  affiliatePayouts: number;
  newUsers: number;
  newUsersGrowth: number;
  selectionProcessPaidCount: number;
  selectionProcessGrowth: number;
  selectionConversionRate: number;
}

export interface StripeMetrics {
  netIncome: number;
  stripeFees: number;
  grossValue: number;
  totalTransactions: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  payments: number;
  students: number;
}

export interface PaymentMethodData {
  method: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface FeeTypeData {
  feeType: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface UniversityRevenueData {
  universityName: string;
  revenue: number;
  count: number;
}

export interface FunnelStepData {
  stage: string;
  count: number;
  percentage: number;
}

export interface CouponImpactData {
  withCoupon: number;
  withoutCoupon: number;
  totalDiscountCents: number;
  couponCount: number;
  nonCouponCount: number;
}

export interface PaidVsPendingData {
  feeType: string;
  paid: number;
  pending: number;
  paidRevenue: number;
}

export interface AffiliateSalesData {
  affiliateName: string;
  sellerCode: string;
  salesCount: number;
  totalRevenueCents: number;
}

export interface CohortRetentionData {
  cohortMonth: string;       // "Jan 2025"
  cohortSize: number;        // alunos que pagaram selection_process neste mês
  // Fluxo atual
  application: number;
  ds160_package: number;
  i539_package: number;
  placement: number;
  // Legado (pode ser 0 para cohorts novos)
  i20_control: number;
  scholarship: number;
  reinstatement: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface FinancialDataInputs {
  applications: any[];
  zellePayments: any[];
  universityRequests: any[];
  affiliateRequests: any[];
  currentRange: DateRange;
  allStudents: any[];
  stripeUsers: any[];
  overridesMap: { [key: string]: any };
  userSystemTypesMap: Map<string, string>;
  realPaymentAmounts: Map<string, { selection_process?: number; scholarship?: number; i20_control?: number; application?: number; placement?: number }>;
  individualPaymentDates: Map<string, Map<string, string>>;
  getFeeAmount: (key: 'i20_control_fee' | 'application_fee') => number;
}

export interface ProcessedFinancialData {
  paymentRecords: any[];
  paymentsByMethod: Record<string, { count: number; revenue: number }>;
  paymentsByFeeType: Record<string, { count: number; revenue: number }>;
  revenueData: RevenueData[];
  metrics: FinancialMetrics;
  paymentMethodData: PaymentMethodData[];
  feeTypeData: FeeTypeData[];
}

export interface LoadedFinancialData {
  applications: any[];
  zellePayments: any[];
  universityRequests: any[];
  affiliateRequests: any[];
  allStudents: any[];
  stripeUsers: any[];
  overridesMap: { [key: string]: any };
  userSystemTypesMap: Map<string, string>;
  realPaymentAmounts: Map<string, { selection_process?: number; scholarship?: number; i20_control?: number; application?: number; placement?: number }>;
  individualFeePayments: any[];
  individualPaymentDates: Map<string, Map<string, string>>;
}

export type TimeFilter = '7d' | '30d' | '90d' | '1y' | 'all';

