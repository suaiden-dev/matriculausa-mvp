import { PieChart as PieChartIcon, Users } from 'lucide-react';
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip as ReTooltip } from 'recharts';
import type { AffiliateSalesData } from '../data/types';
import { FilterBadges } from './FilterBadges';
import type { FilterBadge } from './FilterBadges';
import { InfoTooltip } from './InfoTooltip';

export interface AffiliateSalesChartProps {
  affiliateSalesData: AffiliateSalesData[];
  activeFilters?: FilterBadge[];
}

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#14B8A6', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#84CC16', '#F97316'];
const BG_CLASSES = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-teal-500', 'bg-orange-500', 'bg-red-500', 'bg-pink-500', 'bg-indigo-500', 'bg-lime-500', 'bg-orange-400'];

export function AffiliateSalesChart({ affiliateSalesData, activeFilters }: AffiliateSalesChartProps) {
  const totalSales = affiliateSalesData.reduce((sum, data) => sum + data.salesCount, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
      <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <Users className="h-5 w-5" />
        Top Sellers
        <InfoTooltip text="Quantidade de vendas pagas ('paid') por vendedor/afiliado. O gráfico exibe o Top 10 vendedores." />
      </h2>
      <FilterBadges badges={activeFilters || []} />
      {/* Chart Section */}
      <div className="h-64 w-full">
        {affiliateSalesData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart>
              <Pie
                data={affiliateSalesData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="salesCount"
                nameKey="affiliateName"
              >
                {affiliateSalesData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ReTooltip 
                formatter={(value: any) => [`${value} vendas`, 'Quantidade']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
            </RePieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Nenhuma venda registrada
          </div>
        )}
      </div>

      {/* List Section */}
      <div className="space-y-4 mt-2">
        {affiliateSalesData.map((affiliate, index) => {
          const colorClass = BG_CLASSES[index % BG_CLASSES.length];
          const percentage = totalSales > 0 ? (affiliate.salesCount / totalSales) * 100 : 0;
          
          return (
            <div key={affiliate.affiliateName} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${colorClass}`}></div>
                <span className="text-sm font-medium text-gray-700">{affiliate.affiliateName}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  {affiliate.salesCount} vendas
                </div>
                <div className="text-xs text-gray-500">
                  {percentage.toFixed(1)}% do total
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
