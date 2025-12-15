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
  applicationsPrev: any[];
  zellePaymentsPrev: any[];
  allStudents: any[];
  stripeUsers: any[];
  overridesMap: { [key: string]: any };
  userSystemTypesMap: Map<string, string>;
  realPaymentAmounts: Map<string, { selection_process?: number; scholarship?: number; i20_control?: number; application?: number }>;
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
  applicationsPrev: any[];
  zellePaymentsPrev: any[];
  allStudents: any[];
  stripeUsers: any[];
  overridesMap: { [key: string]: any };
  userSystemTypesMap: Map<string, string>;
  realPaymentAmounts: Map<string, { selection_process?: number; scholarship?: number; i20_control?: number; application?: number }>;
  individualFeePayments: any[];
  individualPaymentDates: Map<string, Map<string, string>>;
}

export type TimeFilter = '7d' | '30d' | '90d' | '1y' | 'all';

