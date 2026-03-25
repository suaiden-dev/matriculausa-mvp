import React from 'react';

const PageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 p-8 pt-24 animate-pulse">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Banner area */}
        <div className="h-64 bg-gray-200 rounded-3xl w-full"></div>
        
        {/* Content area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="h-12 bg-gray-200 rounded-xl w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded-lg w-full"></div>
            <div className="h-4 bg-gray-200 rounded-lg w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded-lg w-4/6"></div>
            
            <div className="pt-8 grid grid-cols-2 gap-4">
              <div className="h-32 bg-gray-200 rounded-2xl"></div>
              <div className="h-32 bg-gray-200 rounded-2xl"></div>
            </div>
          </div>
          
          {/* Sidebar-like area */}
          <div className="space-y-6">
            <div className="h-80 bg-gray-200 rounded-2xl"></div>
            <div className="h-32 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageSkeleton;
