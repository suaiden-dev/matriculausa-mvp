import React, { useState } from 'react';
import {
  Building,
  AlertTriangle,
  Star,
  GraduationCap,
  DollarSign
} from 'lucide-react';
import { getPlacementFee } from '../../../utils/placementFeeCalculator';
import { useTranslation } from 'react-i18next';
import {
  getFieldBadgeColor,
  getLevelIcon,
  getDeliveryModeLabel,
  getLevelLabel,
  getFieldOfStudyLabel
} from '../../../utils/scholarshipHelpers.tsx';
import { formatCurrency } from '../../../utils/currency';
import { is3800ScholarshipBlocked } from '../../../utils/scholarshipDeadlineValidation';


interface ScholarshipCardFullProps {
  scholarship: any;
  isSelected?: boolean;
  onToggle?: () => void;
  userProfile?: any;
  isLocked?: boolean;
  onViewDetails?: () => void;
  isLimitReached?: boolean;
  hideSelectButton?: boolean;
  topRightActionNode?: React.ReactNode;
}

const ScholarshipCardFullComponent: React.FC<ScholarshipCardFullProps> = ({
  scholarship,
  isSelected,
  onToggle,
  userProfile,
  isLocked = false,
  onViewDetails,
  isLimitReached = false,
  hideSelectButton = false,
  topRightActionNode
}) => {
  const { t } = useTranslation(['registration', 'scholarships', 'common']);
  const [brokenImage, setBrokenImage] = useState<boolean>(false);
  const isBlocked = is3800ScholarshipBlocked(scholarship);



  // Usar o ID da bolsa como parte da chave para garantir que cada card seja único
  const uniqueCardKey = `scholarship-card-${scholarship.id}`;

  return (
    <div
      key={uniqueCardKey}
      id={`scholarship-card-wrapper-${scholarship.id}`}
      data-scholarship-id={scholarship.id}
      className={`group relative bg-white rounded-2xl sm:rounded-3xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-2 ${isSelected
        ? 'border-blue-600 border-[3px] bg-blue-50/50 shadow-lg shadow-blue-100/50'
        : 'border-slate-200/60 hover:border-slate-300'
        } flex flex-col h-full hover:-translate-y-1 transform-gpu ${!scholarship.is_active || isBlocked || isLocked || (isLimitReached && !isSelected) ? 'cursor-not-allowed' : 'cursor-pointer' // Fix: Ensure cursor is pointer when clickable
        }`}
      onClick={() => {
        // Fix: Make entire card clickable
        if (!scholarship.is_active || isBlocked || isLocked || (isLimitReached && !isSelected) || !onToggle || hideSelectButton) return;
        onToggle();
      }}
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        isolation: 'isolate'
      }}
    >
      {/* Scholarship Image / Header Background */}
      <div className="relative h-32 sm:h-36 overflow-hidden flex-shrink-0 bg-gradient-to-b from-slate-100/50 to-white">
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-t from-white to-transparent"></div>

        {(scholarship.image_url || scholarship.universities?.image_url || scholarship.universities?.logo_url) && !brokenImage ? (
          <img
            src={scholarship.image_url || scholarship.universities?.image_url || scholarship.universities?.logo_url || ''}
            alt={scholarship.title}
            onError={() => setBrokenImage(true)}
            className="w-full h-full object-contain p-4 group-hover:scale-[1.02] transition-transform duration-700"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-slate-400">
            <Building className="h-16 w-16 text-slate-300" />
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
          <div className="flex flex-col items-start gap-2">
            {!scholarship.is_active || isBlocked ? (
              <div className="bg-red-500 text-white px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-lg">
                <AlertTriangle className="h-3 w-3" />
                <span className="uppercase tracking-wider">{t('scholarshipsPage.scholarshipCard.notAvailable')}</span>
              </div>
            ) : (scholarship.is_highlighted || scholarship.featured) && (
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black flex items-center shadow-lg uppercase tracking-wider">
                <Star className="h-3.5 w-3.5 mr-1.5 fill-current" />
                {t('common.featured')}
              </div>
            )}
          </div>
          {topRightActionNode && (
            <div className="flex flex-col items-end gap-2">
              {topRightActionNode}
            </div>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">


        {/* Title and Secondary Badges */}
        <div className="mb-2">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2 leading-tight line-clamp-2 group-hover:text-[#05294E] transition-colors">
            {scholarship.title}
          </h3>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm flex items-center gap-1.5 ${getFieldBadgeColor(scholarship.field_of_study)}`}>
              <GraduationCap className="h-3.5 w-3.5" strokeWidth={2.5} />
              {getFieldOfStudyLabel(scholarship.field_of_study, t)}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
              {React.cloneElement(getLevelIcon(scholarship.level || 'undergraduate'), {
                className: "h-3.5 w-3.5",
                strokeWidth: 2.5
              })}
              <span className="capitalize">{getLevelLabel(scholarship.level || 'undergraduate', t)}</span>
            </span>
            {scholarship.is_exclusive && (
              <span className="bg-gradient-to-r from-[#D0151C] to-red-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                <Star className="h-3 w-3" />
                {t('common.exclusive')}
              </span>
            )}
          </div>
        </div>
        {/* Info Boxes Section */}
        <div className="space-y-1.5 mb-2">
          {/* University Info Box */}
          <div className="flex items-center gap-3 py-1.5 px-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center border border-slate-200 flex-shrink-0">
              <Building className="h-4 w-4 text-[#05294E]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                {t('studentDashboard.findScholarships.scholarshipCard.university')}
              </p>
              <p className="text-sm font-bold text-slate-700 truncate">
                {scholarship.universities?.name || scholarship.university_name || '********'}
              </p>
            </div>
          </div>

          {/* Modality Info Box */}
          {scholarship.delivery_mode && (
            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">
                  {t('studentDashboard.findScholarships.scholarshipCard.studyMode')}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tight text-slate-900">
                {getDeliveryModeLabel(scholarship.delivery_mode, t)}
              </span>
            </div>
          )}

          {/* Work Permissions Info Box */}
          {scholarship.work_permissions && scholarship.work_permissions.length > 0 && (
            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap mr-2">
                {t('studentDashboard.findScholarships.scholarshipCard.workAuthorization')}
              </span>
              <div className="flex flex-wrap justify-end gap-1.5">
                {scholarship.work_permissions.slice(0, 3).map((permission: string, index: number) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-gray-100 text-slate-700 rounded-md text-[10px] font-black uppercase border border-gray-200"
                  >
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Financial Overview Table View */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm">
          <h4 className="text-[11px] font-black text-slate-800 mb-3 flex items-center gap-1.5 uppercase tracking-widest">
            <DollarSign className="h-3.5 w-3.5 text-green-600" />
            {t('studentDashboard.findScholarships.scholarshipCard.financialOverview')}
          </h4>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-medium">{t('studentDashboard.findScholarships.scholarshipCard.originalPrice')}</span>
              <span className="text-slate-500 text-xs font-bold line-through">
                {formatCurrency(Number(scholarship.original_annual_value || scholarship.amount || 0))}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-medium">{t('studentDashboard.findScholarships.scholarshipCard.withScholarship')}</span>
              <span className="text-green-700 font-extrabold text-base">
                {formatCurrency(Number(scholarship.annual_value_with_scholarship || scholarship.amount || 0))}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
              <span className="text-slate-400 text-xs font-medium">{t('studentDashboard.findScholarships.scholarshipCard.perCredit')}</span>
              <span className="text-slate-500 text-xs font-bold">
                {formatCurrency(Number(scholarship.original_value_per_credit || scholarship.per_credit_cost || 0))}
              </span>
            </div>

            {/* Discount Percentage Line */}
            {(() => {
              const original = Number(scholarship.original_annual_value || 0);
              const discounted = Number(scholarship.annual_value_with_scholarship || 0);
              if (original > discounted && discounted > 0) {
                const discountPercent = Math.round(((original - discounted) / original) * 100);
                return (
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                    <span className="text-slate-400 text-xs font-medium">
                      {t('studentDashboard.findScholarships.scholarshipCard.scholarshipDiscount')}
                    </span>
                    <span className="text-green-600 text-xs font-black">{discountPercent}% OFF</span>
                  </div>
                );
              }
              return null;
            })()}

            {/* Placement Fee - exibir apenas para novos usuários */}
            {userProfile?.placement_fee_flow && (() => {
              const annualValue = scholarship.annual_value_with_scholarship ? Number(scholarship.annual_value_with_scholarship) : Number(scholarship.amount) || 0;
              const placementFeeAmount = scholarship.placement_fee_amount ? Number(scholarship.placement_fee_amount) : null;
              const placementFee = getPlacementFee(annualValue, placementFeeAmount);
              return (
                <>
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                    <span className="text-slate-400 text-xs font-medium">{t('scholarships:scholarshipsPage.scholarshipCard.placementFee', 'Placement Fee')}</span>
                    <span className="text-blue-600 text-xs font-black">{formatCurrency(placementFee)}</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Action Buttons Container */}
        <div className="mt-auto pt-2 space-y-2 border-t border-slate-100">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onViewDetails?.();
            }}
            className="flex items-center justify-center w-full py-3 text-sm font-bold text-grey-900 bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-100 rounded-2xl transition-all duration-300"
          >
            {t('scholarshipsPage.scholarshipCard.details') || 'View Full Details'}
          </button>

          {!hideSelectButton && (
            !scholarship.is_active || isBlocked ? (
            <button
              disabled
              className="w-full h-10 px-3 rounded-xl font-semibold cursor-not-allowed flex items-center justify-center bg-slate-300 text-slate-500 opacity-60 text-sm"
            >
              <AlertTriangle className="h-3 w-3 mr-1.5" />
              {isBlocked ? t('scholarshipDeadline.3800Expired') : t('scholarshipsPage.scholarshipCard.notAvailable')}
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle?.();
              }}
              disabled={isLocked || (isLimitReached && !isSelected)}
              className={`group/btn w-full h-10 px-4 rounded-xl font-bold text-sm flex items-center justify-center transition-all duration-300 relative overflow-hidden backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl ${isLocked || (isLimitReached && !isSelected)
                ? 'bg-slate-300/80 text-slate-500 cursor-not-allowed'
                : isSelected
                  ? 'bg-gradient-to-r from-blue-600/90 to-blue-700/90 text-white hover:from-blue-600 hover:to-blue-700'
                  : 'bg-gradient-to-r from-blue-500/85 to-indigo-600/85 text-white hover:from-blue-600/90 hover:to-indigo-700/90'
                }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 transform -skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
              <span className="relative z-10">
                {isLocked
                  ? t('scholarshipSelection.review.alreadySelected') || 'Já Selecionada'
                  : isSelected
                    ? t('studentDashboard.findScholarships.scholarshipCard.removeSelection')
                    : t('studentDashboard.findScholarships.scholarshipCard.selectScholarship')}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Memoizar o componente para evitar re-renders desnecessários
export const ScholarshipCardFull = React.memo(ScholarshipCardFullComponent, (prevProps, nextProps) => {
  // Retorna true se NÃO deve re-renderizar (props são iguais)
  // Retorna false se DEVE re-renderizar (props mudaram)
  const propsEqual =
    prevProps.scholarship.id === nextProps.scholarship.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isLimitReached === nextProps.isLimitReached &&
    prevProps.isLocked === nextProps.isLocked &&
    prevProps.userProfile?.id === nextProps.userProfile?.id &&
    prevProps.userProfile?.has_paid_selection_process_fee === nextProps.userProfile?.has_paid_selection_process_fee &&
    prevProps.userProfile?.has_paid_subscription === nextProps.userProfile?.has_paid_subscription;

  return propsEqual;
});
