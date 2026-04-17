import { PieChart as PieChartIcon } from 'lucide-react';
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip as ReTooltip } from 'recharts';
import type { PaymentMethodData } from '../data/types';
import { formatCentsToUSD } from '../utils/formatters';
import { FilterBadges } from './FilterBadges';
import type { FilterBadge } from './FilterBadges';
import { InfoTooltip } from './InfoTooltip';

export interface PaymentMethodsChartProps {
  paymentMethodData: PaymentMethodData[];
  activeFilters?: FilterBadge[];
}

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#14B8A6', '#F59E0B'];
const BG_CLASSES = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-teal-500', 'bg-orange-500'];

export function PaymentMethodsChart({ paymentMethodData, activeFilters }: PaymentMethodsChartProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
      <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <PieChartIcon className="h-5 w-5" />
        Payment Methods
        <InfoTooltip text="Distribuição da receita e quantidade de pagamentos 'paid' por método de pagamento (Stripe, Zelle, Parcelow, etc.). A porcentagem é calculada sobre o total de receita do período filtrado." />
      </h2>
      <FilterBadges badges={activeFilters || []} />
      {/* Chart Section */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie
              data={paymentMethodData}
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={80}
              paddingAngle={0}
              dataKey="revenue"
              nameKey="method"
            >
              {paymentMethodData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <ReTooltip 
              formatter={(value: any) => [`$${formatCentsToUSD(Number(value))}`, 'Revenue']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
          </RePieChart>
        </ResponsiveContainer>
      </div>

      {/* List Section */}
      <div className="space-y-4 mt-2">
        {paymentMethodData.map((method, index) => {
          const colorClass = BG_CLASSES[index % BG_CLASSES.length];
          
          return (
            <div key={method.method} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${colorClass}`}></div>
                <span className="text-sm font-medium text-gray-700">{method.method}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  ${formatCentsToUSD(method.revenue)}
                </div>
                <div className="text-xs text-gray-500">
                  {method.count} payments ({method.percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

