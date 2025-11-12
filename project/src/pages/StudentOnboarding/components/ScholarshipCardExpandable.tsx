import React, { useState } from 'react';
import { 
  Building, 
  Clock, 
  DollarSign, 
  GraduationCap, 
  Award, 
  Briefcase,
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
  getDeliveryModeIcon, 
  getDeliveryModeColor, 
  getDeliveryModeLabel,
  getDaysUntilDeadlineDisplay,
  getDeadlineStatus,
  getApplicationFeeWithDependents
} from '../../../utils/scholarshipHelpers.tsx';
import { is3800Scholarship, is3800ScholarshipBlocked } from '../../../utils/scholarshipDeadlineValidation';
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
  const [imageError, setImageError] = useState(false);
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
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${getFieldBadgeColor(scholarship.field_of_study)}`}>
                {scholarship.field_of_study || 'Any Field'}
              </span>
              {scholarship.is_exclusive && (
                <span className="bg-[#D0151C] text-white px-2 py-0.5 rounded text-xs font-bold">
                  {t('studentDashboard.findScholarships.scholarshipCard.exclusive')}
                </span>
              )}
            </div>
            <div className="flex items-center text-slate-600 text-sm mb-2">
              <Building className="h-4 w-4 mr-1.5 text-[#05294E]" />
              <span className="truncate">{scholarship.universities?.name || 'Unknown University'}</span>
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
            <Award className="h-4 w-4 mr-2" />
            {isSelected ? 'Remove from Selection' : t('studentDashboard.findScholarships.scholarshipCard.selectScholarship')}
          </button>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-slate-200 bg-slate-50/50">
          <div className="pt-4 space-y-4">
            {/* Program Details */}
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              {/* Course Modality */}
              {scholarship.delivery_mode && (
                <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center">
                    {getDeliveryModeIcon(scholarship.delivery_mode)}
                    <span className="text-xs font-medium text-slate-600 ml-2">
                      {t('studentDashboard.findScholarships.scholarshipCard.studyMode')}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getDeliveryModeColor(scholarship.delivery_mode)}`}>
                    {getDeliveryModeLabel(scholarship.delivery_mode, t)}
                  </span>
                </div>
              )}

              {/* Work Permissions */}
              {scholarship.work_permissions && scholarship.work_permissions.length > 0 && (
                <div className="p-2 sm:p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center mb-2">
                    <Briefcase className="h-3 w-3 text-emerald-600" />
                    <span className="text-xs font-medium text-slate-600 ml-2">
                      {t('studentDashboard.findScholarships.scholarshipCard.workAuthorization')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {scholarship.work_permissions.map((permission: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-semibold"
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
              <h4 className="text-xs sm:text-sm font-bold text-slate-700 mb-2 sm:mb-3 flex items-center gap-2">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
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
                  <div className="text-xs text-slate-400 text-center mt-1">
                    {scholarship.application_fee_amount && Number(scholarship.application_fee_amount) !== 35000
                      ? t('scholarshipsPage.scholarshipCard.customFee')
                      : t('scholarshipsPage.scholarshipCard.standardFee')}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Details */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-500">{t('studentDashboard.findScholarships.scholarshipCard.level')}</span>
                <div className="flex items-center">
                  {getLevelIcon(scholarship.level || 'undergraduate')}
                  <span className="ml-1 capitalize text-slate-700 text-xs sm:text-sm">{scholarship.level}</span>
                </div>
              </div>
              {scholarship.delivery_mode && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{t('studentDashboard.findScholarships.scholarshipCard.studyMode')}</span>
                  <div className="flex items-center">
                    {getDeliveryModeIcon(scholarship.delivery_mode)}
                    <span className="ml-1 text-slate-700">{getDeliveryModeLabel(scholarship.delivery_mode, t)}</span>
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

