import React from 'react';

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  itemsPerPage: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  onGoTo: (page: number) => void;
  onItemsPerPageChange: (n: number) => void;
  pageNumbers: number[];
}

export function PaginationBar(props: PaginationBarProps) {
  const { currentPage, totalPages, startIndex, endIndex, totalItems, itemsPerPage, onFirst, onPrev, onNext, onLast, onGoTo, onItemsPerPageChange, pageNumbers } = props;
  if (totalPages <= 1) return null;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-600">
          <span className="font-medium">
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems}
          </span>
          <span className="ml-2">payments</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onFirst} disabled={currentPage === 1} className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Go to first page" aria-label="Go to first page">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
          <button onClick={onPrev} disabled={currentPage === 1} className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Go to previous page" aria-label="Go to previous page">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center gap-1">
            {pageNumbers.map((page) => (
              <button key={page} onClick={() => onGoTo(page)} className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${page === currentPage ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} title={`Go to page ${page}`} aria-label={`Go to page ${page}`} aria-current={page === currentPage ? 'page' : undefined}>
                {page}
              </button>
            ))}
          </div>
          <button onClick={onNext} disabled={currentPage === totalPages} className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Go to next page" aria-label="Go to next page">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <button onClick={onLast} disabled={currentPage === totalPages} className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Go to last page" aria-label="Go to last page">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" /></svg>
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Show:</span>
          <select value={itemsPerPage} onChange={(e) => onItemsPerPageChange(Number(e.target.value))} className="px-2 py-1 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" title="Items per page" aria-label="Items per page">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>per page</span>
        </div>
      </div>
    </div>
  );
}


