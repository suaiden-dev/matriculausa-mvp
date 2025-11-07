import React from 'react';
import { BarChart3, RefreshCw, Download } from 'lucide-react';

export interface HeaderProps {
  onRefresh: () => void;
  onExport: () => void;
  refreshing: boolean;
}

export function Header({ onRefresh, onExport, refreshing }: HeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BarChart3 className="text-blue-600" size={32} />
          Financial Analytics
        </h1>
        <p className="text-gray-600 mt-1">Comprehensive financial insights and performance metrics</p>
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
        
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export Data
        </button>
      </div>
    </div>
  );
}

