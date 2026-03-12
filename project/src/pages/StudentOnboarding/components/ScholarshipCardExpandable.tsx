import React, { useState } from 'react';
import { 
  Building, 
  Clock, 
  DollarSign, 
  GraduationCap,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  formatAmount, 
  getFieldBadgeColor, 
  getLevelIcon, 
  getDeliveryModeLabel,
  getDaysUntilDeadlineDisplay,
  getDeadlineStatus,
  getApplicationFeeWithDependents,
  getLevelLabel,
  getFieldOfStudyLabel
} from '../../../utils/scholarshipHelpers.tsx';
import { is3800Scholarship, is3800ScholarshipBlocked } from '../../../utils/scholarshipDeadlineValidation';
import { getPlacementFee } from '../../../utils/placementFeeCalculator';
import { formatCurrency } from '../../../utils/currency';
import { ScholarshipCountdownTimer } from '../../../components/ScholarshipCountdownTimer';
import { ScholarshipExpiryWarning } from '../../../components/ScholarshipExpiryWarning';

interface ScholarshipCardExpandableProps {
  scholarship: any;
  isSelected: boolean;
  onToggle: () => void;
  userProfile?: any;
}

export const ScholarshipCardExpandable: React.FC<ScholarshipCardExpandableProps> = ({
  scholarship,
  isSelected,
  onToggle,
  userProfile
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const isBlocked = is3800ScholarshipBlocked(scholarship);
  const systemType = (userProfile?.system_type as any) || 'legacy';
  const dependents = Number(userProfile?.dependents) || 0;
  const applicationFee = getApplicationFeeWithDependents(
    scholarship.application_fee_amount || 35000,
    systemType,
    dependents
  );

  return (
    <div
      className={`group relative bg-white rounded-xl sm:rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border-2 ${
        isSelected 
          ? 'border-blue-600 bg-blue-50' 
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Compact View */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 mb-1.5 line-clamp-2">
              {scholarship.title}
            </h3>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-xs font-medium text-white shadow-sm flex items-center gap-1.5 ${getFieldBadgeColor(scholarship.field_of_study)}`}>
                <GraduationCap className="h-3.5 w-3.5" strokeWidth={2.5} />
                {getFieldOfStudyLabel(scholarship.field_of_study, t)}
              </span>
              {scholarship.is_exclusive && (
                <span className="bg-[#D0151C] text-white px-2 py-0.5 rounded text-xs font-bold">
                  {t('scholarshipsPage.modal.exclusive')}
                </span>
              )}
            </div>
            <div className="flex items-center text-slate-600 text-sm mb-1">
              <Building className="h-4 w-4 mr-1.5 text-[#05294E]" />
              <span className="truncate">{scholarship.universities?.name || t('scholarshipsPage.modal.universityNameAvailable') || 'Unknown University'}</span>
            </div>
          </div>
          {isSelected && (
            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
          )}
        </div>

        {/* Key Info Row */}
        <div className="flex items-center justify-between mb-3 p-2 bg-slate-50 rounded-lg">
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 mr-1.5 text-green-600" />
            <span className="font-bold text-green-700 text-sm">
              ${formatAmount(scholarship.annual_value_with_scholarship || scholarship.amount || 'N/A')}
            </span>
          </div>
          <div className="flex items-center">
            <Clock className={`h-4 w-4 mr-1 ${getDeadlineStatus(scholarship.deadline).color}`} />
            {is3800Scholarship(scholarship) ? (
              <ScholarshipCountdownTimer scholarship={scholarship} />
            ) : (
              <span className="text-slate-700 text-xs">
                {getDaysUntilDeadlineDisplay(scholarship.deadline)} {t('studentDashboard.findScholarships.scholarshipCard.daysLeft')}
              </span>
            )}
          </div>
        </div>

        {/* Warning for $3800 scholarships */}
        <ScholarshipExpiryWarning scholarship={scholarship} variant="badge" className="mb-3" />

        {/* Expand/Collapse Button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mb-3"
        >
          {isExpanded ? (
            <>
              <span>{t('studentDashboard.findScholarships.scholarshipCard.showLess') || 'Show Less'}</span>
              <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              <span>{t('studentDashboard.findScholarships.scholarshipCard.showMore') || 'Show More'}</span>
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>

        {/* Action Button */}
        {!scholarship.is_active || isBlocked ? (
          <button
            disabled
            className="w-full h-10 px-4 rounded-lg font-semibold cursor-not-allowed flex items-center justify-center bg-slate-300 text-slate-500 opacity-60 text-sm"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {isBlocked ? t('scholarshipDeadline.3800Expired') : t('scholarshipsPage.scholarshipCard.notAvailable')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className={`w-full h-10 px-4 rounded-lg font-bold text-sm flex items-center justify-center transition-all duration-300 ${
              isSelected
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md'
                : 'bg-gradient-to-r from-blue-400 to-blue-500 text-white hover:from-blue-500 hover:to-blue-600'
            }`}
          >
            {isSelected ? (t('scholarshipSelection.review.removeButton') || 'Remove from Selection') : t('studentDashboard.findScholarships.scholarshipCard.selectScholarship')}
          </button>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-slate-200 bg-slate-50/50">
          <div className="pt-4 space-y-2">
            {/* Program Details */}
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              {/* Course Modality */}
              {scholarship.delivery_mode && (
                <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center">
                    <span className="text-xs font-medium text-black">
                      {t('studentDashboard.findScholarships.scholarshipCard.studyMode')}
                    </span>
                  </div>
                  <span className="px-2 py-1 rounded-md text-xs font-semibold text-black">
                    {getDeliveryModeLabel(scholarship.delivery_mode, t)}
                  </span>
                </div>
              )}

              {/* Work Permissions */}
              {scholarship.work_permissions && scholarship.work_permissions.length > 0 && (
                <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-xs font-medium text-black whitespace-nowrap mr-2">
                    {t('studentDashboard.findScholarships.scholarshipCard.workAuthorization')}
                  </span>
                  <div className="flex flex-wrap justify-end gap-1">
                    {scholarship.work_permissions.map((permission: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-black rounded-md text-xs font-semibold"
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Financial Impact Section */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-3 sm:p-4 border border-slate-200">
              <h4 className="text-xs sm:text-sm font-bold text-black mb-2 sm:mb-3 flex items-center gap-2">
                {t('studentDashboard.findScholarships.scholarshipCard.financialOverview')}
              </h4>

              <div className="space-y-1 sm:space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-600">{t('studentDashboard.findScholarships.scholarshipCard.originalPrice')}</span>
                  <span className="font-bold text-blue-700">
                    ${formatAmount(scholarship.original_annual_value || scholarship.amount || scholarship.annual_value || 'N/A')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-600">{t('studentDashboard.findScholarships.scholarshipCard.withScholarship')}</span>
                  <span className="font-bold text-green-700">
                    ${formatAmount(scholarship.annual_value_with_scholarship || scholarship.amount || 'N/A')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 sm:pt-2 border-t border-slate-200">
                  <span>{t('studentDashboard.findScholarships.scholarshipCard.perCredit')}</span>
                  <span>${formatAmount(scholarship.original_value_per_credit || scholarship.per_credit_cost || 'N/A')}</span>
                </div>

                {/* Application Fee Information */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{t('scholarshipsPage.scholarshipCard.applicationFee')}</span>
                    <span className="font-semibold text-purple-600">
                      ${applicationFee}
                    </span>
                  </div>
                </div>

                {/* Placement Fee - exibir apenas para novos usuários */}
                {userProfile?.placement_fee_flow && (() => {
                  const annualValue = scholarship.annual_value_with_scholarship ? Number(scholarship.annual_value_with_scholarship) : Number(scholarship.amount) || 0;
                  const placementFeeAmount = scholarship.placement_fee_amount ? Number(scholarship.placement_fee_amount) : null;
                  const placementFeeValue = getPlacementFee(annualValue, placementFeeAmount);
                  return (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 mt-1">
                      <span className="text-xs text-slate-500">{t('studentDashboard.progressBar.placementFee') || 'Placement Fee'}</span>
                      <span className="text-xs font-bold text-blue-600">{formatCurrency(placementFeeValue)}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Quick Details */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-500">{t('studentDashboard.findScholarships.scholarshipCard.level')}</span>
                <div className="flex items-center">
                  {React.cloneElement(getLevelIcon(scholarship.level || 'undergraduate'), { 
                    className: "h-3.5 w-3.5",
                    strokeWidth: 2.5
                  })}
                  <span className="ml-1 capitalize text-slate-700 text-xs sm:text-sm">{getLevelLabel(scholarship.level || 'undergraduate', t)}</span>
                </div>
              </div>
              {scholarship.delivery_mode && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{t('studentDashboard.findScholarships.scholarshipCard.studyMode')}</span>
                  <div className="flex items-center">
                    <span className="text-black text-xs sm:text-sm font-semibold">{getDeliveryModeLabel(scholarship.delivery_mode, t)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

