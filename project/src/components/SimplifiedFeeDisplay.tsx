import React from 'react';
import { useSimplifiedFees } from '../hooks/useSimplifiedFees';
import { useSystemType } from '../hooks/useSystemType';

interface SimplifiedFeeDisplayProps {
  onFeeSelect?: (fee: number) => void;
  selectedFee?: number;
}

/**
 * Component that displays fixed fees for simplified system
 * Only shows for simplified system type
 */
export const SimplifiedFeeDisplay: React.FC<SimplifiedFeeDisplayProps> = ({ 
  onFeeSelect, 
  selectedFee 
}) => {
  const { systemType } = useSystemType();
  const { fee350, fee550, fee900, loading, error } = useSimplifiedFees();

  // Only show for simplified system
  if (systemType !== 'simplified') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 text-sm">Error loading fees: {error}</p>
      </div>
    );
  }

  const fees = [
    { value: fee350, label: 'Basic Package', description: 'Essential services' },
    { value: fee550, label: 'Standard Package', description: 'Most popular choice' },
    { value: fee900, label: 'Premium Package', description: 'Full service package' }
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">Choose Your Package</h3>
        <p className="text-sm text-gray-600">Select the package that best fits your needs</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {fees.map((fee) => (
          <div
            key={fee.value}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
              selectedFee === fee.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => onFeeSelect?.(fee.value)}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                ${fee.value}
              </div>
              <div className="text-sm font-medium text-gray-700 mt-1">
                {fee.label}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {fee.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Component that shows a simple fee summary for simplified system
 */
export const SimplifiedFeeSummary: React.FC<{ selectedFee?: number }> = ({ selectedFee }) => {
  const { systemType } = useSystemType();
  const { fee350, fee550, fee900, loading } = useSimplifiedFees();

  if (systemType !== 'simplified' || loading) {
    return null;
  }

  const getFeeLabel = (fee: number) => {
    if (fee === fee350) return 'Basic Package';
    if (fee === fee550) return 'Standard Package';
    if (fee === fee900) return 'Premium Package';
    return 'Custom Package';
  };

  if (!selectedFee) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-600">Please select a package to see details</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-blue-900">{getFeeLabel(selectedFee)}</p>
          <p className="text-sm text-blue-700">Fixed price package</p>
        </div>
        <div className="text-2xl font-bold text-blue-900">
          ${selectedFee}
        </div>
      </div>
    </div>
  );
};
