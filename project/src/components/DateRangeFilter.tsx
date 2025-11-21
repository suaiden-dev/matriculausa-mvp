import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';

export type DateRangePreset = '7days' | '15days' | '30days' | 'currentMonth' | 'lastMonth' | 'custom';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  preset?: DateRangePreset;
}

interface DateRangeFilterProps {
  onDateRangeChange: (range: DateRange) => void;
  defaultPreset?: DateRangePreset;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ onDateRangeChange, defaultPreset = '30days' }) => {
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>(defaultPreset);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomInputs, setShowCustomInputs] = useState(false);

  const getDateRangeForPreset = (preset: DateRangePreset): DateRange => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of day
    
    let startDate: Date;
    let endDate: Date = today;

    switch (preset) {
      case '7days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '15days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 14);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '30days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'currentMonth':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'lastMonth':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        startDate = new Date(lastMonth);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        return { startDate: null, endDate: null, preset: 'custom' };
      default:
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate, preset };
  };

  const handlePresetChange = (preset: DateRangePreset) => {
    setSelectedPreset(preset);
    setShowCustomInputs(preset === 'custom');
    
    if (preset !== 'custom') {
      const range = getDateRangeForPreset(preset);
      onDateRangeChange(range);
    } else {
      // Se mudou para custom, usar as datas customizadas se existirem
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        onDateRangeChange({ startDate: start, endDate: end, preset: 'custom' });
      }
    }
  };

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      
      if (start <= end) {
        onDateRangeChange({ startDate: start, endDate: end, preset: 'custom' });
      }
    }
  };

  const handleClearFilter = () => {
    setSelectedPreset('30days');
    setShowCustomInputs(false);
    setCustomStartDate('');
    setCustomEndDate('');
    const range = getDateRangeForPreset('30days');
    onDateRangeChange(range);
  };

  // Initialize with default preset
  React.useEffect(() => {
    const range = getDateRangeForPreset(defaultPreset);
    onDateRangeChange(range);
  }, []);

  const formatDateRange = (range: DateRange): string => {
    if (!range.startDate || !range.endDate) return 'Select date range';
    
    const start = range.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const end = range.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-900">Filter by Date Range</h3>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: '7days', label: 'Last 7 Days' },
              { value: '15days', label: 'Last 15 Days' },
              { value: '30days', label: 'Last 30 Days' },
              { value: 'currentMonth', label: 'This Month' },
              { value: 'lastMonth', label: 'Last Month' },
              { value: 'custom', label: 'Custom' }
            ].map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetChange(preset.value as DateRangePreset)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedPreset === preset.value
                    ? 'bg-[#05294E] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Clear Button */}
          <button
            onClick={handleClearFilter}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Custom Date Inputs */}
      {showCustomInputs && (
        <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => {
                setCustomStartDate(e.target.value);
                if (e.target.value && customEndDate) {
                  setTimeout(handleCustomDateChange, 100);
                }
              }}
              max={customEndDate || undefined}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => {
                setCustomEndDate(e.target.value);
                if (customStartDate && e.target.value) {
                  setTimeout(handleCustomDateChange, 100);
                }
              }}
              min={customStartDate || undefined}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;

