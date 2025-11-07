import type { DateRange, TimeFilter } from '../data/types';

/**
 * Calcula o range de datas baseado no filtro de tempo selecionado
 */
export function getDateRange(
  timeFilter: TimeFilter,
  customDateFrom?: string,
  customDateTo?: string,
  showCustomDate?: boolean
): DateRange {
  const now = new Date();
  let startDate: Date;
  
  switch (timeFilter) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
      startDate = new Date('2020-01-01');
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  if (showCustomDate && customDateFrom && customDateTo) {
    return {
      start: new Date(customDateFrom),
      end: new Date(customDateTo)
    };
  }

  return { start: startDate, end: now };
}

/**
 * Calcula o período anterior de mesmo tamanho para comparação
 */
export function getPreviousPeriodRange(currentRange: DateRange): DateRange {
  const msRange = currentRange.end.getTime() - currentRange.start.getTime();
  const prevEnd = new Date(currentRange.start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - msRange);
  
  return { start: prevStart, end: prevEnd };
}

/**
 * Formata o label do período selecionado
 */
export function formatPeriodLabel(timeFilter: TimeFilter, showCustomDate?: boolean): string {
  if (showCustomDate) {
    return 'Custom Range';
  }
  
  switch (timeFilter) {
    case '7d': return 'Last 7 Days';
    case '30d': return 'Last 30 Days';
    case '90d': return 'Last 90 Days';
    case '1y': return 'Last Year';
    case 'all': return 'All Time';
    default: return 'Selected Period';
  }
}

