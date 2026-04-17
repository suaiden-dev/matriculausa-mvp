import { DollarSign, Users, TrendingUp, ArrowUpRight, ArrowDownRight, Target } from 'lucide-react';
import { MetricCard } from './MetricCard';
import type { FinancialMetrics } from '../data/types';
import { formatCentsToUSD } from '../utils/formatters';

export interface MetricsGridProps {
  metrics: FinancialMetrics;
  arpu: number;
}

export function MetricsGrid({ metrics, arpu }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <MetricCard
        label="Student Revenue"
        value={`$${formatCentsToUSD(metrics.totalRevenue)}`}
        icon={DollarSign}
        gradientFrom="from-blue-500"
        gradientTo="to-blue-600"
        iconColor="text-blue-200"
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
        label="University Payouts"
        value={`$${formatCentsToUSD(metrics.universityPayouts || 0)}`}
        icon={Users}
        gradientFrom="from-orange-500"
        gradientTo="to-orange-600"
        iconColor="text-orange-200"
        textColor="text-orange-100"
        info="Total pago às universidades parceiras com status 'paid'. Representa repasses já aprovados e transferidos. Não inclui solicitações pendentes ou aprovadas aguardando pagamento."
        sublabel={
          <span className="text-sm text-orange-100">
            {metrics.pendingPayouts} pending
          </span>
        }
      />

      <MetricCard
        label="Affiliate Payouts"
        value={`$${formatCentsToUSD(metrics.affiliatePayouts || 0)}`}
        icon={TrendingUp}
        gradientFrom="from-teal-500"
        gradientTo="to-teal-600"
        iconColor="text-teal-200"
        textColor="text-teal-100"
        info="Total pago a afiliados/parceiros de indicação com status 'paid'. Calculado a partir do campo amount_usd das solicitações de pagamento de afiliados aprovadas."
        sublabel={
          <span className="text-sm text-teal-100">
            {metrics.completedAffiliatePayouts || 0} completed
          </span>
        }
      />

      <MetricCard
        label="New Students"
        value={metrics.newUsers.toString()}
        icon={Users}
        gradientFrom="from-purple-500"
        gradientTo="to-purple-600"
        iconColor="text-purple-200"
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
        label="ARPU"
        value={`$${formatCentsToUSD(arpu)}`}
        icon={Target}
        gradientFrom="from-rose-500"
        gradientTo="to-rose-600"
        iconColor="text-rose-200"
        textColor="text-rose-100"
        info="Average Revenue Per User: receita total do período ÷ número de novos alunos cadastrados no mesmo período. Indica o valor médio gerado por cada aluno adquirido."
        sublabel={
          <span className="text-sm text-rose-100">Avg. revenue per new student</span>
        }
      />

    </div>
  );
}
