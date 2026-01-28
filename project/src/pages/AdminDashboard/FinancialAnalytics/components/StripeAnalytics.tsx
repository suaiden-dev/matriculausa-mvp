import React from 'react';
import { Card, CardContent } from '../../../../components/ui/Card';
import { Info, ArrowRight, Minus, Equal } from 'lucide-react';
import { StripeMetrics } from '../data/types';
import { cn } from '../../../../lib/cn';

interface StripeAnalyticsProps {
  metrics: StripeMetrics;
  loading?: boolean;
}

export const StripeAnalytics: React.FC<StripeAnalyticsProps> = ({ metrics, loading = false }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercent = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Card className="w-full animate-pulse">
        <CardContent className="p-6">
          <div className="h-6 w-48 bg-gray-200 rounded mb-6" />
          <div className="h-12 w-full bg-gray-200 rounded mb-6" />
          <div className="space-y-4">
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-full bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate percentages for the bar
  const feesPercent = metrics.grossValue > 0 ? (metrics.stripeFees / metrics.grossValue) * 100 : 0;
  const netPercent = metrics.grossValue > 0 ? (metrics.netIncome / metrics.grossValue) * 100 : 0;

  return (
    <Card className="w-full overflow-hidden border border-gray-200 shadow-sm bg-white">
      <CardContent className="p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              Stripe Processing
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                Live Data
              </span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Financial breakdown of processed payments
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100">
            <Info className="w-3.5 h-3.5" />
            Since Nov 20, 2025
          </div>
        </div>

        {/* Visual Stacked Bar */}
        <div className="mb-10">
          <div className="flex justify-between text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
            <span>Distribution</span>
            <span>100% Volume</span>
          </div>
          <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
            {/* Net Income Segment (Green) */}
            <div 
              className="h-full bg-emerald-500 transition-all duration-500 ease-out relative group"
              style={{ width: `${netPercent}%` }}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {/* Fees Segment (Red) */}
            <div 
              className="h-full bg-rose-500 transition-all duration-500 ease-out relative group"
              style={{ width: `${feesPercent}%` }}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-medium text-gray-700">Net Payout</span>
              <span className="text-gray-400">({formatPercent(metrics.netIncome, metrics.grossValue)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">({formatPercent(metrics.stripeFees, metrics.grossValue)})</span>
              <span className="font-medium text-gray-700">Stripe Fees</span>
              <div className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
          </div>
        </div>

        {/* Financial Statement Flow */}
        <div className="space-y-4 max-w-3xl mx-auto">
          {/* Gross */}
          <div className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-md bg-gray-100 text-gray-600 group-hover:bg-white group-hover:shadow-sm transition-all">
                <ArrowRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Gross Volume</p>
                <p className="text-xs text-gray-400">Total processed amount</p>
              </div>
            </div>
            <span className="text-xl font-semibold text-gray-900">
              {formatCurrency(metrics.grossValue)}
            </span>
          </div>

          {/* Fees */}
          <div className="flex items-center justify-between p-4 rounded-lg hover:bg-rose-50/50 transition-colors group relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-md bg-rose-100 text-rose-600 group-hover:bg-white group-hover:shadow-sm transition-all">
                <Minus className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 group-hover:text-rose-700 transition-colors">Stripe Fees</p>
                <p className="text-xs text-gray-400 group-hover:text-rose-600/70 transition-colors">Processing & transaction costs</p>
              </div>
            </div>
            <span className="text-xl font-semibold text-rose-600">
              - {formatCurrency(metrics.stripeFees)}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 my-2" />

          {/* Net */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-50/30 border border-emerald-100/50 hover:bg-emerald-50/80 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-md bg-emerald-100 text-emerald-600 group-hover:bg-white group-hover:shadow-sm transition-all">
                <Equal className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-emerald-900 transition-colors">Net Revenue</p>
                <p className="text-xs text-emerald-600/70">Final payout amount</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-emerald-700">
              {formatCurrency(metrics.netIncome)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
