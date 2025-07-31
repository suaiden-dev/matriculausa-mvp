import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState = () => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading connections...</span>
        </div>
      </div>
    </div>
  );
};