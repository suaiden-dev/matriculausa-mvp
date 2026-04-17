import { CheckCircle, Clock } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import type { PaidVsPendingData } from '../data/types';
import { FilterBadges } from './FilterBadges';
import type { FilterBadge } from './FilterBadges';
import { InfoTooltip } from './InfoTooltip';

export interface PaidVsPendingChartProps {
  data: PaidVsPendingData[];
  activeFilters?: FilterBadge[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-sm">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-semibold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function PaidVsPendingChart({ data, activeFilters }: PaidVsPendingChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-center">
        <p className="text-sm text-gray-400">No data available.</p>
      </div>
    );
  }

  const totalPaid = data.reduce((s, d) => s + d.paid, 0);
  const totalPending = data.reduce((s, d) => s + d.pending, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Paid vs Pending by Fee
          <InfoTooltip text="Quantidade de pagamentos com status 'paid' vs qualquer outro status (pending, overdue, etc.) por categoria de taxa. Ajuda a identificar quais taxas têm maior inadimplência ou atraso no período." />
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-gray-600">{totalPaid} paid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-gray-600">{totalPending} pending</span>
          </div>
        </div>
      </div>
      <FilterBadges badges={activeFilters || []} />

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={18} barGap={4}>
            <CartesianGrid vertical={false} stroke="#F3F4F6" />
            <XAxis
              dataKey="feeType"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + '…' : v}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
            />
            <Bar dataKey="paid" name="Paid" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pending" name="Pending" fill="#FCD34D" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
