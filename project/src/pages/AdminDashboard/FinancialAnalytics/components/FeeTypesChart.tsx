import { BarChart3 as BarChartIcon } from 'lucide-react';
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, Cell } from 'recharts';
import type { FeeTypeData } from '../data/types';
import { formatCentsToUSD } from '../utils/formatters';

export interface FeeTypesChartProps {
  feeTypeData: FeeTypeData[];
}

const COLORS = ['#6366F1', '#10B981', '#F43F5E', '#F59E0B', '#8B5CF6'];
const BG_CLASSES = ['bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-purple-500'];

export function FeeTypesChart({ feeTypeData }: FeeTypesChartProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
      <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <BarChartIcon className="h-5 w-5" />
        Revenue by Fee Type
      </h2>

      {/* Bar Chart Section */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart data={feeTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              dataKey="feeType" 
              hide={true} // Ocultado para manter o design limpo, já que temos a lista embaixo
            />
            <YAxis 
              tickFormatter={(v) => `$${Number(v) / 100}`} // Amostra simplificada em dólares
              fontSize={10}
              width={40}
            />
            <ReTooltip 
              formatter={(value: any) => [`$${formatCentsToUSD(Number(value))}`, 'Revenue']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
              {feeTypeData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </ReBarChart>
        </ResponsiveContainer>
      </div>

      {/* List Section */}
      <div className="space-y-4 mt-2">
        {feeTypeData.map((fee, index) => (
          <div key={fee.feeType} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${BG_CLASSES[index % BG_CLASSES.length]}`}></div>
              <span className="text-sm font-medium text-gray-700">{fee.feeType}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">
                ${formatCentsToUSD(fee.revenue)}
              </div>
              <div className="text-xs text-gray-500">
                {fee.count} payments ({fee.percentage.toFixed(1)}%)
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

