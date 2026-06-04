import React from 'react';
import { CreditCard } from 'lucide-react';

interface FeeStatusSectionProps {
  hasPaidSelectionProcessFee: boolean;
  isScholarshipFeePaid: boolean;
  hasPaidI20ControlFee: boolean;
  isApplicationFeePaid: boolean;
  scholarshipFeeAmount?: number;
  i20ControlFeeAmount?: number;
  selectionProcessFeeAmount?: number;
  applicationFeeAmount?: number;
  systemType?: string;
}

const FeeStatusSection: React.FC<FeeStatusSectionProps> = ({
  hasPaidSelectionProcessFee,
  isScholarshipFeePaid,
  hasPaidI20ControlFee,
  isApplicationFeePaid,
  scholarshipFeeAmount,
  i20ControlFeeAmount,
  selectionProcessFeeAmount,
  applicationFeeAmount,
  systemType = 'legacy'
}) => {
  const formatFeeAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const isSimplified = systemType === 'simplified';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#0a4a7a] px-6 py-4">
        <h3 className="text-lg font-semibold text-white">Fee Status</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Selection Process Fee */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-3">
              <CreditCard className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-900">Selection Process Fee</span>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-sm font-medium ${hasPaidSelectionProcessFee ? 'text-green-700' : 'text-red-700'}`}>
                {hasPaidSelectionProcessFee ? 'Paid' : 'Pending'}
              </span>
              <span className="text-xs text-slate-500">
                {formatFeeAmount(selectionProcessFeeAmount != null ? selectionProcessFeeAmount : (isSimplified ? 350 : 400))}
              </span>
            </div>
          </div>

          {/* Application Fee */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-3">
              <CreditCard className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-900">Application Fee</span>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-sm font-medium ${isApplicationFeePaid ? 'text-green-700' : 'text-red-700'}`}>
                {isApplicationFeePaid ? 'Paid' : 'Pending'}
              </span>
              <span className="text-xs text-slate-500">
                {formatFeeAmount(applicationFeeAmount != null ? applicationFeeAmount : 100)}
              </span>
            </div>
          </div>

          {/* Scholarship Fee */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-3">
              <CreditCard className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-900">Scholarship Fee</span>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-sm font-medium ${isScholarshipFeePaid ? 'text-green-700' : 'text-red-700'}`}>
                {isScholarshipFeePaid ? 'Paid' : 'Pending'}
              </span>
              <span className="text-xs text-slate-500">
                {formatFeeAmount(scholarshipFeeAmount != null ? scholarshipFeeAmount : (isSimplified ? 550 : 900))}
              </span>
            </div>
          </div>

          {/* I-20 Control Fee */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-3">
              <CreditCard className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-900">I-20 Control Fee</span>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-sm font-medium ${hasPaidI20ControlFee ? 'text-green-700' : 'text-red-700'}`}>
                {hasPaidI20ControlFee ? 'Paid' : 'Pending'}
              </span>
              <span className="text-xs text-slate-500">
                {formatFeeAmount(i20ControlFeeAmount != null ? i20ControlFeeAmount : 900)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeStatusSection;
