import { Tag } from 'lucide-react';
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip as ReTooltip } from 'recharts';
import type { CouponImpactData } from '../data/types';
import { formatCentsToUSD } from '../utils/formatters';
import { FilterBadges } from './FilterBadges';
import type { FilterBadge } from './FilterBadges';
import { InfoTooltip } from './InfoTooltip';

export interface CouponImpactChartProps {
  data: CouponImpactData;
  activeFilters?: FilterBadge[];
}

export function CouponImpactChart({ data, activeFilters }: CouponImpactChartProps) {
  const total = data.couponCount + data.nonCouponCount;
  const couponPct = total > 0 ? ((data.couponCount / total) * 100).toFixed(1) : '0.0';

  const pieData = [
    { name: 'With Coupon', value: data.couponCount, revenue: data.withCoupon },
    { name: 'No Coupon', value: data.nonCouponCount, revenue: data.withoutCoupon },
  ];

  const COLORS = ['#10B981', '#E5E7EB'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-sm">
          <p className="font-semibold text-gray-900">{d.name}</p>
          <p className="text-gray-700">{d.value} transactions</p>
          <p className="text-emerald-600 font-bold">${formatCentsToUSD(d.revenue)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Tag className="h-5 w-5 text-emerald-500" />
          Coupon Impact
          <InfoTooltip text="Compara pagamentos 'paid' com e sem código de cupom. 'Total discounted' = soma dos descontos aplicados (discount_amount). A % indica a fração das transações que usaram desconto." />
        </h2>
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          {couponPct}% with discount
        </span>
      </div>
      <FilterBadges badges={activeFilters || []} />

      <div className="flex items-center gap-4">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={68}
                dataKey="value"
                paddingAngle={2}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <ReTooltip content={<CustomTooltip />} />
            </RePieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-3">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-gray-600">With Coupon</span>
            </div>
            <p className="text-base font-bold text-emerald-700">${formatCentsToUSD(data.withCoupon)}</p>
            <p className="text-xs text-gray-500">{data.couponCount} transactions</p>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
              <span className="text-xs font-semibold text-gray-600">No Coupon</span>
            </div>
            <p className="text-base font-bold text-gray-700">${formatCentsToUSD(data.withoutCoupon)}</p>
            <p className="text-xs text-gray-500">{data.nonCouponCount} transactions</p>
          </div>

          {data.totalDiscountCents > 0 && (
            <div className="p-2 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-[11px] font-semibold text-red-600">
                Total discounted: -${formatCentsToUSD(data.totalDiscountCents)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
