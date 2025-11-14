import React from 'react';

interface Step {
  key: string;
  label: string;
}

interface ApplicationProgressCardProps {
  currentStep: { step: Step; index: number; status: string } | null;
  allSteps: Step[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  getStepStatus: (step: Step) => string;
}

/**
 * ApplicationProgressCard - Shows current application progress
 * Displays current step and expandable timeline of all steps
 */
const ApplicationProgressCard: React.FC<ApplicationProgressCardProps> = React.memo(({
  currentStep,
  allSteps,
  isExpanded,
  onToggleExpand,
  getStepStatus,
}) => {
  if (!currentStep) return null;

  const { step, index, status } = currentStep;
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in_progress';
  const isRejected = status === 'rejected';

  const getStepDescription = (stepKey: string) => {
    switch (stepKey) {
      case 'selection_fee': return 'Student pays the initial application fee';
      case 'apply': return 'Student submits scholarship application';
      case 'review': return 'University reviews the application';
      case 'application_fee': return 'Student pays the application fee';
      case 'scholarship_fee': return 'Student pays the scholarship fee';
      case 'acceptance_letter': return 'University sends acceptance letter';
      case 'transfer_form': return 'University sends transfer form (for transfer students)';
      case 'i20_fee': return 'Student pays I-20 control fee';
      case 'enrollment': return 'Student enrolls in the program';
      default: return 'Process step';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Application Progress</h2>
      </div>
      <div className="p-6">
        {/* Current Step Display */}
        <div
          className={`p-4 rounded-xl border-2 transition-all duration-200 ${
            isCompleted ? 'border-green-200 bg-green-50' :
            isInProgress ? 'border-blue-200 bg-blue-50' :
            isRejected ? 'border-red-200 bg-red-50' :
            'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                  isCompleted ? 'bg-green-500 text-white' :
                  isInProgress ? 'bg-blue-500 text-white' :
                  isRejected ? 'bg-red-500 text-white' :
                  'bg-slate-300 text-slate-600'
                }`}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className={`text-sm sm:text-base font-semibold ${
                    isCompleted ? 'text-green-900' :
                    isInProgress ? 'text-blue-900' :
                    isRejected ? 'text-red-900' :
                    'text-slate-700'
                  }`}
                >
                  {step.label}
                </h3>
                <p
                  className={`text-xs sm:text-sm ${
                    isCompleted ? 'text-green-700' :
                    isInProgress ? 'text-blue-700' :
                    isRejected ? 'text-red-700' :
                    'text-slate-500'
                  }`}
                >
                  {getStepDescription(step.key)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap">
              <div
                className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                  isCompleted ? 'bg-green-100 text-green-700' :
                  isInProgress ? 'bg-blue-100 text-blue-700' :
                  isRejected ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-500'
                }`}
              >
                {isCompleted ? 'Completed' :
                 isInProgress ? 'In Progress' :
                 isRejected ? 'Rejected' :
                 'Pending'}
              </div>
              {isInProgress && (
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-600 font-medium">Active</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={onToggleExpand}
            className="flex items-center space-x-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200"
          >
            <span className="whitespace-nowrap">{isExpanded ? 'Show Less' : 'View All Steps'}</span>
            <svg
              className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Expanded Timeline */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5 bg-slate-200"></div>

              {/* Steps */}
              <div className="space-y-4 sm:space-y-6">
                {allSteps.map((stepItem) => {
                  const stepStatus = getStepStatus(stepItem);
                  const stepCompleted = stepStatus === 'completed';
                  const stepInProgress = stepStatus === 'in_progress';
                  const stepRejected = stepStatus === 'rejected';

                  return (
                    <div key={stepItem.key} className="relative flex items-start">
                      {/* Timeline Dot */}
                      <div
                        className={`relative z-10 flex-shrink-0 w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 sm:border-4 border-white shadow-sm flex items-center justify-center ${
                          stepCompleted ? 'bg-green-500' :
                          stepInProgress ? 'bg-blue-500' :
                          stepRejected ? 'bg-red-500' :
                          'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                            stepCompleted || stepInProgress || stepRejected ? 'bg-white' : 'bg-slate-100'
                          }`}
                        ></div>
                      </div>

                      {/* Content Card */}
                      <div className="ml-4 sm:ml-6 flex-1 min-w-0">
                        <div
                          className={`p-3 sm:p-4 rounded-lg border transition-all duration-200 ${
                            stepCompleted ? 'border-green-200 bg-green-50' :
                            stepInProgress ? 'border-blue-200 bg-blue-50' :
                            stepRejected ? 'border-red-200 bg-red-50' :
                            'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <h4 className="text-sm font-semibold text-slate-900 mb-1">{stepItem.label}</h4>
                          <p className="text-xs text-slate-600">{getStepDescription(stepItem.key)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ApplicationProgressCard.displayName = 'ApplicationProgressCard';

export default ApplicationProgressCard;

