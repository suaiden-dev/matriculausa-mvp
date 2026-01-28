import React from 'react';
import { DollarSign, Target, CreditCard, Users, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { MetricCard } from './MetricCard';
import type { FinancialMetrics } from '../data/types';
import { formatCentsToUSD } from '../utils/formatters';

export interface MetricsGridProps {
  metrics: FinancialMetrics;
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <MetricCard
        label="Student Revenue"
        value={`$${formatCentsToUSD(metrics.totalRevenue)}`}
        icon={DollarSign}
        gradientFrom="from-blue-500"
        gradientTo="to-blue-600"
        iconColor="text-blue-200"
        textColor="text-blue-100"
        sublabel={
          <>
            {metrics.revenueGrowth >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-300 mr-1" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-300 mr-1" />
            )}
            <span className="text-sm text-blue-100">
              {metrics.revenueGrowth >= 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}% vs previous period
            </span>
          </>
        }
      />

      <MetricCard
        label="University Payouts"
        value={`$${formatCentsToUSD(metrics.universityPayouts || 0)}`}
        icon={Users}
        gradientFrom="from-orange-500"
        gradientTo="to-orange-600"
        iconColor="text-orange-200"
        textColor="text-orange-100"
        sublabel={
          <span className="text-sm text-orange-100">
            {metrics.pendingPayouts} pending
          </span>
        }
      />

      <MetricCard
        label="Affiliate Payouts"
        value={`$${formatCentsToUSD(metrics.affiliatePayouts || 0)}`}
        icon={TrendingUp}
        gradientFrom="from-teal-500"
        gradientTo="to-teal-600"
        iconColor="text-teal-200"
        textColor="text-teal-100"
        sublabel={
          <span className="text-sm text-teal-100">
            {metrics.completedAffiliatePayouts || 0} completed
          </span>
        }
      />

    </div>
  );
}

