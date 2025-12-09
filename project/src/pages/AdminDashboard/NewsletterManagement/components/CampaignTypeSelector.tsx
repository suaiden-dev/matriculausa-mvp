import React from 'react';
import { Mail, Target } from 'lucide-react';

export type CampaignType = 'traditional' | 'application_flow_stage';

interface CampaignTypeSelectorProps {
  selectedType: CampaignType | null;
  onTypeSelect: (type: CampaignType) => void;
}

export const CampaignTypeSelector: React.FC<CampaignTypeSelectorProps> = ({
  selectedType,
  onTypeSelect
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-3">
        Campaign Type *
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Traditional Campaign Type */}
        <button
          type="button"
          onClick={() => onTypeSelect('traditional')}
          className={`p-4 border-2 rounded-lg text-left transition-all ${
            selectedType === 'traditional'
              ? 'border-[#05294E] bg-blue-50'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                selectedType === 'traditional'
                  ? 'bg-[#05294E] text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Mail className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900 mb-1">Traditional Campaign</h4>
              <p className="text-sm text-slate-600">
                Target users based on registration or payment status (e.g., registered but not paid, paid but no application)
              </p>
            </div>
          </div>
        </button>

        {/* Application Flow Stage Campaign Type */}
        <button
          type="button"
          onClick={() => onTypeSelect('application_flow_stage')}
          className={`p-4 border-2 rounded-lg text-left transition-all ${
            selectedType === 'application_flow_stage'
              ? 'border-[#05294E] bg-blue-50'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                selectedType === 'application_flow_stage'
                  ? 'bg-[#05294E] text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Target className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900 mb-1">Application Flow Stage</h4>
              <p className="text-sm text-slate-600">
                Target students based on their current stage in the application process (e.g., Selection Fee, Review, Application Fee)
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};




