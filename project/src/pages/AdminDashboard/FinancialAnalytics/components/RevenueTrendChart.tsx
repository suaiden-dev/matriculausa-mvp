import React from 'react';
import { LineChart as LineChartIcon } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import type { RevenueData } from '../data/types';
import { formatCentsToUSD, formatUSD } from '../utils/formatters';

export interface RevenueTrendChartProps {
  revenueData: RevenueData[];
}

export function RevenueTrendChart({ revenueData }: RevenueTrendChartProps) {
  if (!revenueData || revenueData.length === 0) {
    return (
      <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <LineChartIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No data for selected period</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <LineChartIcon className="h-5 w-5" />
          Revenue Trend
        </h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Payments</span>
          </div>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height={256}>
          <ReLineChart data={revenueData} margin={{ top: 12, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tickFormatter={(v) => `$${formatCentsToUSD(Number(v))}`} tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: any, _name: string, props: any) => {
              const num = Number(value);
              const key = props?.dataKey;
              if (key === 'revenue') {
                return `$${formatCentsToUSD(num)}`;
              }
              if (key === 'payments') {
                return `${Math.round(num)}`;
              }
              return formatUSD(num);
            }} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#3B82F6" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="payments" name="Payments" stroke="#22C55E" strokeWidth={2} dot={false} strokeDasharray="4 4" />
          </ReLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

