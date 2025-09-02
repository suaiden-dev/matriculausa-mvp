import React from 'react';
import { Search, Filter as FilterIcon, TrendingUp, TrendingDown } from 'lucide-react';

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
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  sellers,
  universities,
  showAdvancedFilters,
  onToggleAdvancedFilters,
  onResetFilters,
  filteredStudentsCount
}) => {
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleDateRangeChange = (key: 'start' | 'end', value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [key]: value
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        <div className="flex-1">
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
        
        <div className="flex gap-3">
          <select
            value={filters.sellerFilter}
            onChange={(e) => handleFilterChange('sellerFilter', e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
          >
            <option value="all">All Sellers</option>
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.name}
              </option>
            ))}
          </select>

          <button
            onClick={onToggleAdvancedFilters}
            className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 flex items-center gap-2 ${
              showAdvancedFilters 
                ? 'bg-[#05294E] text-white' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FilterIcon className="h-4 w-4" />
            Advanced
          </button>
        </div>
      </div>

      {/* Filtros Avançados Expandidos */}
      {showAdvancedFilters && (
        <div className="border-t border-slate-200 pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro por Universidade */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">University</label>
              <select
                value={filters.universityFilter}
                onChange={(e) => handleFilterChange('universityFilter', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
              >
                <option value="all">All Universities</option>
                {universities.map((university) => (
                  <option key={university.id} value={university.id}>
                    {university.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Período - Data Inicial */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
              />
            </div>

            {/* Filtro por Período - Data Final */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
              />
            </div>

            {/* Filtro por Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                value={filters.statusFilter}
                onChange={(e) => handleFilterChange('statusFilter', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="registered">Registered</option>
                <option value="enrolled">Enrolled</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="dropped">Dropped</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Ordenação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
              >
                <option value="revenue">Revenue</option>
                <option value="students">Students Count</option>
                <option value="name">Name</option>
                <option value="date">Date</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Order</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFilterChange('sortOrder', 'desc')}
                  className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                    filters.sortOrder === 'desc' 
                      ? 'bg-[#05294E] text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <TrendingDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleFilterChange('sortOrder', 'asc')}
                  className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                    filters.sortOrder === 'asc' 
                      ? 'bg-[#05294E] text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={onResetFilters}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center text-sm text-slate-600">
        <span className="font-medium">{filteredStudentsCount}</span>
        <span className="ml-1">student{filteredStudentsCount !== 1 ? 's' : ''} found</span>
        {showAdvancedFilters && (
          <span className="ml-4 text-slate-500">
            • Showing top performers by {filters.sortBy === 'revenue' ? 'revenue' : 
              filters.sortBy === 'students' ? 'student count' : 
              filters.sortBy === 'name' ? 'name' : 'date'}
          </span>
        )}
      </div>
    </div>
  );
};

export default AdvancedFilters;
