import React from 'react';
import { Search } from 'lucide-react';
import RefreshButton from '../RefreshButton';

interface University {
  id: string;
  name: string;
  logo_url?: string;
  location?: string;
}

interface FilterState {
  searchTerm: string;
  sellerFilter: string;
  universityFilter: string;
  dateRange: {
    start: string;
    end: string;
  };
  statusFilter: string;
  paymentStatusFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sellers: any[];
  universities: University[];
  showAdvancedFilters: boolean;
  onToggleAdvancedFilters: () => void;
  onResetFilters: () => void;
  filteredStudentsCount: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  sellers,
  filteredStudentsCount,
  onRefresh,
  isRefreshing = false
}) => {
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search sellers or students..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
            />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select
            value={filters.sellerFilter}
            onChange={(e) => handleFilterChange('sellerFilter', e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200 w-full sm:w-auto"
          >
            <option value="all">All Sellers</option>
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.name}
              </option>
            ))}
          </select>

          {onRefresh && (
            <div className="flex items-center">
              <RefreshButton
                onClick={onRefresh}
                isRefreshing={isRefreshing}
                title="Refresh student and seller data"
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center text-sm text-slate-600">
        <span className="font-medium">{filteredStudentsCount}</span>
        <span className="ml-1">student{filteredStudentsCount !== 1 ? 's' : ''} found</span>
      </div>
    </div>
  );
};

export default AdvancedFilters;
