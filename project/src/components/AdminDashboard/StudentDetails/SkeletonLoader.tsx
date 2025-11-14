import React from 'react';

/**
 * SkeletonLoader - Loading placeholder for AdminStudentDetails page
 * Displays animated skeleton UI while data is being fetched
 */
const SkeletonLoader: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-pulse">
    {/* Header Skeleton */}
    <div className="flex items-center justify-between">
      <div className="space-y-3">
        <div className="h-8 w-48 bg-slate-200 rounded-lg"></div>
        <div className="h-5 w-64 bg-slate-200 rounded-lg"></div>
      </div>
      <div className="flex items-center space-x-3">
        <div className="h-11 w-36 bg-slate-200 rounded-xl"></div>
        <div className="h-11 w-24 bg-slate-200 rounded-xl"></div>
      </div>
    </div>

    {/* Tabs Skeleton */}
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="border-b border-slate-200">
        <div className="flex space-x-8 px-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="py-4">
              <div className="h-5 w-24 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Content Grid Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Main Content Skeleton */}
      <div className="lg:col-span-8 space-y-6">
        {/* Student Information Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="bg-gradient-to-r from-slate-300 to-slate-400 rounded-t-2xl px-6 py-4">
            <div className="h-6 w-48 bg-slate-200 rounded"></div>
          </div>
          <div className="p-6 space-y-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="h-6 w-56 bg-slate-200 rounded mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-slate-200 rounded"></div>
                    <div className="h-5 w-full bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-32 bg-slate-200 rounded"></div>
                    <div className="h-5 w-full bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Applications Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="bg-gradient-to-r from-slate-300 to-slate-400 rounded-t-2xl px-6 py-4">
            <div className="h-6 w-40 bg-slate-200 rounded"></div>
          </div>
          <div className="p-6 space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-5 w-48 bg-slate-200 rounded"></div>
                  <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-slate-200 rounded"></div>
                  <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar Skeleton */}
      <div className="lg:col-span-4 space-y-6">
        {/* Quick Actions Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="h-6 w-32 bg-slate-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-full bg-slate-200 rounded-lg"></div>
            ))}
          </div>
        </div>

        {/* Payment Status Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="h-6 w-40 bg-slate-200 rounded mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-32 bg-slate-200 rounded"></div>
                <div className="h-6 w-16 bg-slate-200 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="h-6 w-24 bg-slate-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg">
                <div className="h-4 w-full bg-slate-200 rounded mb-2"></div>
                <div className="h-4 w-2/3 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default SkeletonLoader;

