import { TrendingDown } from 'lucide-react';
import type { FunnelStepData } from '../data/types';
import { FilterBadges } from './FilterBadges';
import type { FilterBadge } from './FilterBadges';
import { InfoTooltip } from './InfoTooltip';

export interface ConversionFunnelChartProps {
  funnelData: FunnelStepData[];
  totalStudents: number;
  activeFilters?: FilterBadge[];
}

const STEP_COLORS = [
  { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700', bar: '#3B82F6' },
  { bg: 'bg-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-700', bar: '#6366F1' },
  { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700', bar: '#8B5CF6' },
  { bg: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-700', bar: '#14B8A6' },
  { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', bar: '#10B981' },
];

export function ConversionFunnelChart({ funnelData, totalStudents, activeFilters }: ConversionFunnelChartProps) {
  if (!funnelData || funnelData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex items-center justify-center">
        <p className="text-sm text-gray-400">No funnel data available.</p>
      </div>
    );
  }

  const maxCount = Math.max(...funnelData.map(s => s.count), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-indigo-500" />
          Conversion Funnel
          <InfoTooltip text="Mostra quantos alunos únicos realizaram pelo menos um pagamento 'paid' em cada etapa. A % é calculada sobre o total de alunos cadastrados. 'lost' indica quantos não avançaram da etapa anterior." />
        </h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
          {totalStudents.toLocaleString()} total students
        </span>
      </div>
      <FilterBadges badges={activeFilters || []} />

      <div className="space-y-3">
        {funnelData.map((step, i) => {
          const colors = STEP_COLORS[i % STEP_COLORS.length];
          const barWidth = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
          const dropOff = i > 0 ? funnelData[i - 1].count - step.count : 0;

          return (
            <div key={step.stage}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full ${colors.bg} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{step.stage}</span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  {dropOff > 0 && (
                    <span className="text-xs text-red-400">-{dropOff} lost</span>
                  )}
                  <span className="text-sm font-bold text-gray-900">{step.count.toLocaleString()}</span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${colors.light} ${colors.text}`}>
                    {step.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%`, backgroundColor: colors.bar }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
