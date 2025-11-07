import React from 'react';

export const FinancialAnalyticsSkeleton: React.FC = () => {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-64 bg-gray-200 rounded-lg mb-2"></div>
          <div className="h-4 w-96 bg-gray-200 rounded"></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
          <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>

      {/* Time Filter Skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-40 bg-gray-200 rounded"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-10 w-28 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>

      {/* Metrics Grid Skeleton (6 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {[
          { from: 'from-blue-300', to: 'to-blue-400' },
          { from: 'from-green-300', to: 'to-green-400' },
          { from: 'from-purple-300', to: 'to-purple-400' },
          { from: 'from-orange-300', to: 'to-orange-400' },
          { from: 'from-teal-300', to: 'to-teal-400' },
          { from: 'from-orange-300', to: 'to-orange-400' }
        ].map((gradient, i) => (
          <div key={i} className={`bg-gradient-to-r ${gradient.from} ${gradient.to} rounded-xl p-6`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 w-24 bg-white/30 rounded mb-2"></div>
                <div className="h-8 w-32 bg-white/30 rounded mb-2"></div>
                <div className="h-3 w-40 bg-white/30 rounded"></div>
              </div>
              <div className="w-8 h-8 bg-white/30 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Chart Skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-40 bg-gray-200 rounded"></div>
          <div className="flex items-center gap-4">
            <div className="h-4 w-20 bg-gray-200 rounded"></div>
            <div className="h-4 w-20 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="h-64 bg-gray-100 rounded-lg"></div>
      </div>

      {/* Payment Methods & Fee Types Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="h-6 w-40 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                  <div className="h-5 w-24 bg-gray-200 rounded"></div>
                </div>
                <div className="text-right">
                  <div className="h-6 w-20 bg-gray-200 rounded mb-1"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fee Types Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="h-6 w-40 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                  <div className="h-5 w-32 bg-gray-200 rounded"></div>
                </div>
                <div className="text-right">
                  <div className="h-6 w-20 bg-gray-200 rounded mb-1"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialAnalyticsSkeleton;

