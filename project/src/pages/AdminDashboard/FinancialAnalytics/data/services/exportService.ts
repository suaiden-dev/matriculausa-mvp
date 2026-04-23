import type { FinancialMetrics } from '../types';
import { formatCentsToUSD } from '../../utils/formatters';

/**
 * Exporta métricas financeiras para CSV
 */
export function exportFinancialDataToCSV(metrics: FinancialMetrics): void {
  const csvContent = [
    ['Metric', 'Value'],
    ['Total Revenue', `$${formatCentsToUSD(metrics.totalRevenue)}`],
    ['Total Payments', metrics.totalPayments.toString()],
    ['Paid Payments', metrics.paidPayments.toString()],
    ['Pending Payments', metrics.pendingPayments.toString()],
    ['Conversion Rate', `${metrics.conversionRate.toFixed(2)}%`],
    ['Average Transaction Value', `$${formatCentsToUSD(metrics.averageTransactionValue)}`],
    ['Total Students', metrics.totalStudents.toString()],
    ['Selection Process Paid', metrics.selectionProcessPaidCount.toString()],
    ['Selection Conversion Rate', `${metrics.selectionConversionRate.toFixed(2)}%`],
    ['Revenue Growth', `${metrics.revenueGrowth.toFixed(2)}%`]
  ].map(row => row.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `financial-analytics-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

