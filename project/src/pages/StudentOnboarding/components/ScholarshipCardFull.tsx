import React, { useState } from 'react';
import {
  Building,
  Clock,
  AlertTriangle,
  Star,
  GraduationCap
} from 'lucide-react';
import { getPlacementFee } from '../../../utils/placementFeeCalculator';
import { useTranslation } from 'react-i18next';
import {
  getFieldBadgeColor,
  getDaysUntilDeadlineDisplay,
  getDeadlineStatus,
  getLevelIcon,
  getDeliveryModeLabel
} from '../../../utils/scholarshipHelpers.tsx';
import { formatCurrency } from '../../../utils/currency';
import { is3800Scholarship, is3800ScholarshipBlocked } from '../../../utils/scholarshipDeadlineValidation';
import { ScholarshipCountdownTimer } from '../../../components/ScholarshipCountdownTimer';
import { ScholarshipExpiryWarning } from '../../../components/ScholarshipExpiryWarning';

interface ScholarshipCardFullProps {
  scholarship: any;
  isSelected: boolean;
  onToggle: () => void;
  userProfile?: any;
  isLocked?: boolean;
  onViewDetails?: () => void;
}

const ScholarshipCardFullComponent: React.FC<ScholarshipCardFullProps> = ({
  scholarship,
  isSelected,
  onToggle,
  userProfile,
  isLocked = false,
  onViewDetails
}) => {
  const { t } = useTranslation();
  const [brokenImage, setBrokenImage] = useState<boolean>(false);
  const isBlocked = is3800ScholarshipBlocked(scholarship);

  const getApplicationFeeWithDependents = (sch: any): string => {
    const base = sch?.application_fee_amount ? Number(sch.application_fee_amount) : 350;
    const systemType = userProfile?.system_type || 'legacy';
    const deps = Number(userProfile?.dependents) || 0;
    const finalAmount = systemType === 'legacy' && deps > 0 ? base + deps * 100 : base;
    return formatCurrency(finalAmount);
  };

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
        } flex flex-col h-full hover:-translate-y-1 transform-gpu ${!scholarship.is_active || isBlocked || isLocked ? 'cursor-not-allowed' : 'cursor-pointer' // Fix: Ensure cursor is pointer when clickable
        }`}
      onClick={() => {
        // Fix: Make entire card clickable
        if (!scholarship.is_active || isBlocked || isLocked) return;
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
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent"></div>

        {scholarship.image_url && userProfile?.has_paid_selection_process_fee && !brokenImage ? (
          <img
            src={scholarship.image_url}
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
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          {/* Days Left Badge */}
          {is3800Scholarship(scholarship) ? (
            <ScholarshipCountdownTimer scholarship={scholarship} />
          ) : (
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border flex items-center gap-1.5 backdrop-blur-md ${getDeadlineStatus(scholarship.deadline).bg
              } ${getDeadlineStatus(scholarship.deadline).color} border-white/50`}>
              <Clock className="h-3.5 w-3.5" />
              <span>{getDaysUntilDeadlineDisplay(scholarship.deadline)} {t('studentDashboard.findScholarships.scholarshipCard.days')}</span>
            </div>
          )}

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">

              {scholarship.is_highlighted && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1.5 rounded-xl text-xs font-black flex items-center shadow-lg uppercase tracking-wider h-9">
                  <Star className="h-3.5 w-3.5 mr-1.5 fill-current" />
                  {t('common.featured')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        {/* Warning for $3800 scholarships */}
        <ScholarshipExpiryWarning scholarship={scholarship} variant="badge" className="mb-2" />

        {/* Title and Secondary Badges */}
        <div className="mb-2">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2 leading-tight line-clamp-2 group-hover:text-[#05294E] transition-colors">
            {scholarship.title}
          </h3>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm flex items-center gap-1.5 ${getFieldBadgeColor(scholarship.field_of_study)}`}>
              <GraduationCap className="h-3.5 w-3.5" strokeWidth={2.5} />
              {scholarship.field_of_study || 'Any Field'}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
              {React.cloneElement(getLevelIcon(scholarship.level || 'undergraduate'), {
                className: "h-3.5 w-3.5",
                strokeWidth: 2.5
              })}
              <span className="capitalize">{scholarship.level || 'Undergraduate'}</span>
            </span>
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
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                {t('studentDashboard.findScholarships.scholarshipCard.university')}
              </p>
              <p className="text-xs font-bold text-slate-700 truncate">
                {scholarship.universities?.name || scholarship.university_name || '********'}
              </p>
            </div>
          </div>

          {/* Modality Info Box */}
          {scholarship.delivery_mode && (
            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-grey-900">
                  {t('studentDashboard.findScholarships.scholarshipCard.studyMode')}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tight text-grey-900">
                {getDeliveryModeLabel(scholarship.delivery_mode, t)}
              </span>
            </div>
          )}

          {/* Work Permissions Info Box */}
          {scholarship.work_permissions && scholarship.work_permissions.length > 0 && (
            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-bold text-grey-900 whitespace-nowrap mr-2">
                {t('studentDashboard.findScholarships.scholarshipCard.workAuthorization')}
              </span>
              <div className="flex flex-wrap justify-end gap-1.5">
                {scholarship.work_permissions.slice(0, 3).map((permission: string, index: number) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-gray-100 text-grey-900 rounded-md text-[10px] font-black uppercase border border-gray-200"
                  >
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Financial Overview Table View */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
          <h4 className="text-[11px] font-black text-grey-900 mb-3 flex items-center gap-1.5 uppercase tracking-widest">
            Análise Geral
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
              <span className="text-emerald-600 font-black text-base">
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
                    <span className="text-emerald-500 text-xs font-black">{discountPercent}% OFF</span>
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-medium">{t('scholarshipsPage.scholarshipCard.applicationFee')}</span>
              <span className="text-slate-500 text-xs font-bold">
                {getApplicationFeeWithDependents(scholarship)}
              </span>
            </div>

            {/* Placement Fee - exibir apenas para novos usuários */}
            {userProfile?.placement_fee_flow && (() => {
              const annualValue = scholarship.annual_value_with_scholarship ? Number(scholarship.annual_value_with_scholarship) : Number(scholarship.amount) || 0;
              const placementFeeAmount = scholarship.placement_fee_amount ? Number(scholarship.placement_fee_amount) : null;
              const placementFee = getPlacementFee(annualValue, placementFeeAmount);
              return (
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                  <span className="text-slate-400 text-xs font-medium">Placement Fee</span>
                  <span className="text-blue-600 text-xs font-black">{formatCurrency(placementFee)}</span>
                </div>
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

          {!scholarship.is_active || isBlocked ? (
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
                onToggle();
              }}
              disabled={isLocked}
              className={`group/btn w-full h-10 px-4 rounded-xl font-bold text-sm flex items-center justify-center transition-all duration-300 relative overflow-hidden backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl ${isLocked
                  ? 'bg-slate-300/80 text-slate-500 cursor-not-allowed'
                  : isSelected
                    ? 'bg-gradient-to-r from-blue-600/90 to-blue-700/90 text-white hover:from-blue-600 hover:to-blue-700'
                    : 'bg-gradient-to-r from-blue-500/85 to-indigo-600/85 text-white hover:from-blue-600/90 hover:to-indigo-700/90'
                }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 transform -skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
              <span className="relative z-10">
                {isLocked
                  ? 'Já Selecionado'
                  : isSelected
                    ? 'Remove from Selection'
                    : t('studentDashboard.findScholarships.scholarshipCard.selectScholarship')}
              </span>
            </button>
          )}
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
    prevProps.isLocked === nextProps.isLocked &&
    prevProps.userProfile?.id === nextProps.userProfile?.id;

  return propsEqual;
});
