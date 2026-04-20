import { Building2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import type { UniversityRevenueData } from '../data/types';
import { formatCentsToUSD } from '../utils/formatters';
import { FilterBadges } from './FilterBadges';
import type { FilterBadge } from './FilterBadges';
import { InfoTooltip } from './InfoTooltip';

export interface RevenueByUniversityChartProps {
  data: UniversityRevenueData[];
  activeFilters?: FilterBadge[];
}

const COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#14B8A6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload as UniversityRevenueData;
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-sm">
        <p className="font-semibold text-gray-900 mb-1 max-w-[200px] break-words">{d.universityName}</p>
        <p className="text-blue-600 font-bold">${formatCentsToUSD(d.revenue)}</p>
        <p className="text-gray-500">{d.count} payment{d.count !== 1 ? 's' : ''}</p>
      </div>
    );
  }
  return null;
};

export function RevenueByUniversityChart({ data, activeFilters }: RevenueByUniversityChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-center">
        <p className="text-sm text-gray-400">No university data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-500" />
          Revenue by University
          <InfoTooltip text="Top 10 universidades por receita total de pagamentos 'paid'. Agrupamento feito pelo campo university_name vinculado a cada transação. Exibe receita total e número de pagamentos por instituição." />
        </h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
          Top {data.length}
        </span>
      </div>
      <FilterBadges badges={activeFilters || []} />

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
            <XAxis
              type="number"
              tickFormatter={(v) => `$${formatCentsToUSD(v)}`}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="universityName"
              width={140}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + '…' : v}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
            <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={22}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
