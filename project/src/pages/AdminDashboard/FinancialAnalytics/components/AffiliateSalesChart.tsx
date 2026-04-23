import { TrendingUp } from 'lucide-react';
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip as ReTooltip } from 'recharts';
import type { AffiliateSalesData } from '../data/types';
import { formatCentsToUSD } from '../utils/formatters';
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
  const totalRevenue = affiliateSalesData.reduce((sum, d) => sum + d.totalRevenueCents, 0);
  const totalSales = affiliateSalesData.reduce((sum, d) => sum + d.salesCount, 0);

  const isEmpty = affiliateSalesData.length === 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-blue-500" />
        Top Sellers
        <InfoTooltip text="Top 10 vendedores/afiliados ordenados por receita total gerada no período. O gráfico de pizza mostra a distribuição de receita; a lista detalha quantidade de vendas e valor total." />
      </h2>
      <FilterBadges badges={activeFilters || []} />

      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center min-h-[200px]">
          <p className="text-sm text-gray-400">Nenhuma venda com afiliado registrada no período.</p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="h-52 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={affiliateSalesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="totalRevenueCents"
                  nameKey="affiliateName"
                >
                  {affiliateSalesData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ReTooltip
                  formatter={(value: any, _name: any, props: any) => [
                    `$${formatCentsToUSD(Number(value))}`,
                    props.payload?.affiliateName || 'Seller'
                  ]}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>

          {/* Totals row */}
          <div className="flex items-center justify-between mb-3 px-1 text-xs text-gray-500 border-b border-gray-100 pb-2">
            <span>{totalSales} transações no período</span>
            <span className="font-semibold text-gray-700">Total: ${formatCentsToUSD(totalRevenue)}</span>
          </div>

          {/* List */}
          <div className="space-y-3">
            {affiliateSalesData.map((affiliate, index) => {
              const colorClass = BG_CLASSES[index % BG_CLASSES.length];
              const revenueShare = totalRevenue > 0 ? (affiliate.totalRevenueCents / totalRevenue) * 100 : 0;

              return (
                <div key={affiliate.affiliateName} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${colorClass}`} />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700 leading-tight">{affiliate.affiliateName}</span>
                      <span className="text-xs text-gray-400 font-mono mt-0.5">{affiliate.sellerCode}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      ${formatCentsToUSD(affiliate.totalRevenueCents)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {affiliate.salesCount} vendas · {revenueShare.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
