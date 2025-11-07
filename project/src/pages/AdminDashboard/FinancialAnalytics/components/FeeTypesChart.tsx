import React from 'react';
import { BarChart3 } from 'lucide-react';
import type { FeeTypeData } from '../data/types';
import { formatCentsToUSD } from '../utils/formatters';

export interface FeeTypesChartProps {
  feeTypeData: FeeTypeData[];
}

export function FeeTypesChart({ feeTypeData }: FeeTypesChartProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        Revenue by Fee Type
      </h2>
      
      <div className="space-y-4">
        {feeTypeData.map((fee, index) => (
          <div key={fee.feeType} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${
                index === 0 ? 'bg-indigo-500' : 
                index === 1 ? 'bg-emerald-500' : 
                index === 2 ? 'bg-amber-500' : 'bg-rose-500'
              }`}></div>
              <span className="font-medium text-gray-900">{fee.feeType}</span>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-900">
                ${formatCentsToUSD(fee.revenue)}
              </div>
              <div className="text-sm text-gray-500">
                {fee.count} payments ({fee.percentage.toFixed(1)}%)
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

