import { Users } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import type { RevenueData } from '../data/types';
import { FilterBadges } from './FilterBadges';
import type { FilterBadge } from './FilterBadges';
import { InfoTooltip } from './InfoTooltip';

export interface UserGrowthChartProps {
  data: RevenueData[];
  activeFilters?: FilterBadge[];
}

export function UserGrowthChart({ data, activeFilters }: UserGrowthChartProps) {
  // Calcular acumulado para a linha de crescimento
  let cumulative = 0;
  const chartData = data.map(day => {
    cumulative += day.students;
    return {
      ...day,
      cumulative
    };
  });

  if (!data || data.length === 0) {
    return (
      <div className="h-64 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 font-medium">No activity in this period</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            User Acquisition & Growth
            <InfoTooltip text="Barras: alunos que criaram conta (user_profiles) em cada dia do período. Linha 'Cumulative Total': soma acumulada de novos alunos ao longo do tempo, mostrando o ritmo de crescimento da base." />
          </h2>
          <p className="text-sm text-gray-500">Correlation between daily entries and total expansion</p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-2 bg-indigo-500 rounded-sm"></div>
            <span className="text-gray-600 font-medium whitespace-nowrap">Daily New Users</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-2 bg-emerald-100 border border-emerald-400 rounded-sm"></div>
            <span className="text-gray-600 font-medium whitespace-nowrap">Growth Trend</span>
          </div>
        </div>
      </div>
      <FilterBadges badges={activeFilters || []} />
      
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f3f4f6" vertical={false} strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11, fill: '#6B7280' }} 
              axisLine={false}
              tickLine={false}
              tickFormatter={(date) => {
                const d = new Date(date);
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#6B7280' }} 
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              tick={{ fontSize: 11, fill: '#6B7280' }} 
              axisLine={false}
              tickLine={false}
              hide // Esconder para manter o visual limpo, já temos os tooltips
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '8px', 
                border: 'none', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                padding: '12px'
              }}
              cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              name="Cumulative Total"
              stroke="#10B981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCumulative)"
            />
            <Bar 
              yAxisId="left"
              dataKey="students" 
              name="New Registrations" 
              fill="#6366F1" 
              radius={[4, 4, 0, 0]} 
              barSize={20}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
