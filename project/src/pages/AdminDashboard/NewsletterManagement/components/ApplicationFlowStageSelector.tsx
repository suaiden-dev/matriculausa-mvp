import React from 'react';
import { APPLICATION_FLOW_STAGES, ApplicationFlowStageKey, getStageMetadata } from '../../../../utils/applicationFlowStages';

interface ApplicationFlowStageSelectorProps {
  selectedStage: ApplicationFlowStageKey | null;
  onStageSelect: (stage: ApplicationFlowStageKey) => void;
  excludeStages?: ApplicationFlowStageKey[];
}

export const ApplicationFlowStageSelector: React.FC<ApplicationFlowStageSelectorProps> = ({
  selectedStage,
  onStageSelect,
  excludeStages = []
}) => {
  const availableStages = APPLICATION_FLOW_STAGES.filter(
    stage => !excludeStages.includes(stage.key)
  );

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-3">
        Application Flow Stage *
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {availableStages.map((stage) => {
          const Icon = stage.icon;
          const isSelected = selectedStage === stage.key;

          return (
            <button
              key={stage.key}
              type="button"
              onClick={() => onStageSelect(stage.key)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                isSelected
                  ? 'border-[#05294E] bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSelected
                      ? 'bg-[#05294E] text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900">{stage.label}</h4>
                    {isSelected && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#05294E] text-white">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{stage.description}</p>
                  {stage.requiresTransfer && (
                    <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                      Transfer students only
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {selectedStage && (
        <p className="text-xs text-slate-500 mt-2">
          Campaign will target students currently in the <strong>{getStageMetadata(selectedStage)?.label}</strong> stage
        </p>
      )}
    </div>
  );
};

