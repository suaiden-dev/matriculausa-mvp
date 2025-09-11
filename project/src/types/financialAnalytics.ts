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
  activeStudents: number;
  pendingPayouts: number;
  completedPayouts: number;
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
  university: string;
  revenue: number;
  students: number;
  conversionRate: number;
}

export interface PaymentTrendData {
  period: string;
  revenue: number;
  payments: number;
  conversionRate: number;
  averageValue: number;
}

export interface GeographicRevenueData {
  country: string;
  revenue: number;
  students: number;
  percentage: number;
}

export interface PayoutData {
  university: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  method: string;
  requestDate: string;
  paidDate?: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  totalPayouts: number;
  pendingPayouts: number;
  operationalCosts: number;
}

export type TimeFilter = '7d' | '30d' | '90d' | '1y' | 'all' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface FinancialAnalyticsState {
  metrics: FinancialMetrics;
  revenueData: RevenueData[];
  paymentMethodData: PaymentMethodData[];
  feeTypeData: FeeTypeData[];
  universityData: UniversityRevenueData[];
  paymentTrends: PaymentTrendData[];
  geographicData: GeographicRevenueData[];
  payoutData: PayoutData[];
  summary: FinancialSummary;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}
