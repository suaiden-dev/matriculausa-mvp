import React from 'react';
import { Filter } from 'lucide-react';
import type { TimeFilter } from '../data/types';
import { formatPeriodLabel } from '../utils/dateRange';

export interface TimePeriodFilterProps {
  timeFilter: TimeFilter;
  showCustomDate: boolean;
  customDateFrom: string;
  customDateTo: string;
  onTimeFilterChange: (filter: TimeFilter) => void;
  onCustomDateToggle: () => void;
  onCustomDateFromChange: (date: string) => void;
  onCustomDateToChange: (date: string) => void;
}

export function TimePeriodFilter({
  timeFilter,
  showCustomDate,
  customDateFrom,
  customDateTo,
  onTimeFilterChange,
  onCustomDateToggle,
  onCustomDateFromChange,
  onCustomDateToChange
}: TimePeriodFilterProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Time Period Filter
        </h2>
        <span className="text-sm text-gray-600">Currently showing: {formatPeriodLabel(timeFilter, showCustomDate)}</span>
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        {(['7d', '30d', '90d', '1y', 'all'] as const).map((period) => (
          <button
            key={period}
            onClick={() => {
              onTimeFilterChange(period);
              if (showCustomDate) {
                onCustomDateToggle();
              }
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              timeFilter === period && !showCustomDate
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {period === '7d' ? 'Last 7 Days' :
             period === '30d' ? 'Last 30 Days' :
             period === '90d' ? 'Last 90 Days' :
             period === '1y' ? 'Last Year' : 'All Time'}
          </button>
        ))}
        
        <button
          onClick={onCustomDateToggle}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            showCustomDate
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Custom Range
        </button>
      </div>
      
      {showCustomDate && (
        <div className="mt-4 flex items-center gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={customDateFrom}
              onChange={(e) => onCustomDateFromChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={customDateTo}
              onChange={(e) => onCustomDateToChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

