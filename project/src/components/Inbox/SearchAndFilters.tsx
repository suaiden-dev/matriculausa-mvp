import React from 'react';
import { Search, Filter } from 'lucide-react';

interface SearchAndFiltersProps {
  searchTerm: string;
  filter: 'all' | 'unread' | 'starred';
  onSearchChange: (value: string) => void;
  onFilterChange: (value: 'all' | 'unread' | 'starred') => void;
  onSearch: () => void;
}

const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchTerm,
  filter,
  onSearchChange,
  onFilterChange,
  onSearch
}) => {
  return (
    <div className="px-6 sm:px-8 py-4 sm:py-5 border-b border-slate-200 bg-slate-50">
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search emails..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSearch()}
            className="w-full pl-12 pr-4 py-3 text-base border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-3">
          <select
            value={filter}
            onChange={(e) => onFilterChange(e.target.value as 'all' | 'unread' | 'starred')}
            className="px-3 sm:px-4 py-3 text-base border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
            title="Filter emails"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="starred">Starred</option>
          </select>
          <button 
            className="p-3 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors" 
            title="Filter emails"
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchAndFilters; 