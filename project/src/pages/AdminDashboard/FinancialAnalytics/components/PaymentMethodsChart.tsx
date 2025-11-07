import React from 'react';
import { PieChart } from 'lucide-react';
import type { PaymentMethodData } from '../data/types';
import { formatCentsToUSD } from '../utils/formatters';

export interface PaymentMethodsChartProps {
  paymentMethodData: PaymentMethodData[];
}

export function PaymentMethodsChart({ paymentMethodData }: PaymentMethodsChartProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <PieChart className="h-5 w-5" />
        Payment Methods
      </h2>
      
      <div className="space-y-4">
        {paymentMethodData.map((method, index) => (
          <div key={method.method} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${
                index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : 'bg-purple-500'
              }`}></div>
              <span className="font-medium text-gray-900">{method.method}</span>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-900">
                ${formatCentsToUSD(method.revenue)}
              </div>
              <div className="text-sm text-gray-500">
                {method.count} payments ({method.percentage.toFixed(1)}%)
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

