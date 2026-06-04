import React from 'react';
import { Edit3, Check, X } from 'lucide-react';

interface PackageManagementSectionProps {
  isEditingPackage: boolean;
  selectedPackageId: string | null;
  isUpdatingPackage: boolean;
  studentPackageFees: any;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveChange: () => void;
  onSelectPackage: (id: string) => void;
}

const PackageManagementSection: React.FC<PackageManagementSectionProps> = ({
  isEditingPackage,
  selectedPackageId,
  isUpdatingPackage,
  studentPackageFees,
  onStartEdit,
  onCancelEdit,
  onSaveChange,
  onSelectPackage
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#0a4a7a] px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Scholarship Range</h3>
          {!isEditingPackage && (
            <button
              onClick={onStartEdit}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              title="Edit package"
            >
              <Edit3 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>
      <div className="p-6">
        {isEditingPackage ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Scholarship Range
              </label>
              <div className="space-y-2">
                {[3800, 4200, 4500, 5000, 5500].map((range) => (
                  <div
                    key={`range-${range}`}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedPackageId === `range-${range}`
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => onSelectPackage(`range-${range}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-900">Scholarship Range ${range}+</h4>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={onSaveChange}
                disabled={isUpdatingPackage || !selectedPackageId}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdatingPackage ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </button>
              <button
                onClick={onCancelEdit}
                disabled={isUpdatingPackage}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {studentPackageFees ? (
              <>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-blue-900">{studentPackageFees.package_name}</h4>
                    <span className="text-sm text-blue-600">Current</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 text-center">
                  Click edit to change scholarship range
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-slate-400 mb-2">No scholarship range set</div>
                <div className="text-sm text-slate-500">Click edit to set scholarship range</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PackageManagementSection;
