import React from 'react';

interface Props {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  itemLabel?: string;
  onPrev: () => void;
  onNext: () => void;
  onPageClick: (page: number) => void;
  onItemsPerPageChange: (n: number) => void;
}

const PaginationControls: React.FC<Props> = ({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  itemsPerPage,
  itemsPerPageOptions,
  itemLabel = 'results',
  onPrev,
  onNext,
  onPageClick,
  onItemsPerPageChange,
}) => {
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <label className="text-sm text-slate-700">Show:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
          >
            {itemsPerPageOptions.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="text-sm text-slate-600">per page</span>
        </div>

        <div className="text-sm text-slate-600">
          Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
          <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
          <span className="font-medium">{totalItems}</span> {itemLabel}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onPrev}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex items-center space-x-1">
            {pageNumbers.map(pageNum => (
              <button
                key={pageNum}
                onClick={() => onPageClick(pageNum)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  currentPage === pageNum
                    ? 'bg-[#05294E] text-white'
                    : 'bg-white text-slate-500 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            onClick={onNext}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaginationControls;
