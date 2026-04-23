import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { MetricCard } from './MetricCard';
import type { FinancialMetrics } from '../data/types';
import { formatCentsToUSD } from '../utils/formatters';

export interface MetricsGridProps {
  metrics: FinancialMetrics;
  arpu: number;
}

export function MetricsGrid({ metrics, arpu }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <MetricCard
        label="Student Revenue"
        value={`$${formatCentsToUSD(metrics.totalRevenue)}`}
        gradientFrom="from-blue-500"
        gradientTo="to-blue-600"
        textColor="text-blue-100"
        info="Soma de todos os pagamentos com status 'paid' realizados por alunos no período selecionado. Inclui todas as categorias de taxa (Selection Process, Application, Scholarship, etc.)."
        sublabel={
          <>
            {metrics.revenueGrowth >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-300 mr-1" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-300 mr-1" />
            )}
            <span className="text-sm text-blue-100">
              {metrics.revenueGrowth >= 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}% vs previous period
            </span>
          </>
        }
      />

      <MetricCard
        label="New Students"
        value={metrics.newUsers.toString()}
        gradientFrom="from-purple-500"
        gradientTo="to-purple-600"
        textColor="text-purple-100"
        info="Número de novos usuários cadastrados no sistema (user_profiles) dentro do período selecionado. O crescimento % compara com o período imediatamente anterior de mesma duração."
        sublabel={
          <>
            {metrics.newUsersGrowth >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-300 mr-1" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-300 mr-1" />
            )}
            <span className="text-sm text-purple-100">
              {metrics.newUsersGrowth >= 0 ? '+' : ''}{metrics.newUsersGrowth.toFixed(1)}% vs previous
            </span>
          </>
        }
      />

      <MetricCard
        label="Selection Process Paid"
        value={metrics.selectionProcessPaidCount.toString()}
        gradientFrom="from-amber-500"
        gradientTo="to-amber-600"
        textColor="text-amber-100"
        info="Número de alunos únicos que realizaram o pagamento da taxa de processo seletivo (Selection Process) no período selecionado."
        sublabel={
          <>
            {metrics.selectionProcessGrowth >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-300 mr-1" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-300 mr-1" />
            )}
            <span className="text-sm text-amber-100">
              {metrics.selectionProcessGrowth >= 0 ? '+' : ''}{metrics.selectionProcessGrowth.toFixed(1)}% vs previous
            </span>
          </>
        }
      />

      <MetricCard
        label="Reg. to Selection Ratio"
        value={metrics.selectionProcessPaidCount > 0 ? (metrics.newUsers / metrics.selectionProcessPaidCount).toFixed(1) : '0'}
        gradientFrom="from-emerald-500"
        gradientTo="to-emerald-600"
        textColor="text-emerald-100"
        info="Ratio de conversão: Total de novos usuários ÷ Alunos que pagaram o processo seletivo. Ex: se for 4.0, significa que 1 a cada 4 novos alunos paga o processo seletivo."
        sublabel={
          <span className="text-sm text-emerald-100">
            {metrics.selectionConversionRate.toFixed(1)}% conversion rate
          </span>
        }
      />

      <MetricCard
        label="ARPU"
        value={`$${formatCentsToUSD(arpu)}`}
        gradientFrom="from-rose-500"
        gradientTo="to-rose-600"
        textColor="text-rose-100"
        info="Average Revenue Per User: receita total do período ÷ número de alunos que pagaram o processo seletivo no mesmo período. Indica o valor médio gerado por cada aluno convertido."
        sublabel={
          <span className="text-sm text-rose-100">Avg. revenue per paid student</span>
        }
      />

    </div>
  );
}
