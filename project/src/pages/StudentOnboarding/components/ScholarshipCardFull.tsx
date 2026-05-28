import React from 'react';
import {
  Building,
  AlertTriangle,
  Star,
  GraduationCap,
  DollarSign,
  Eye,
  Lock
} from 'lucide-react';
import { getPlacementFee } from '../../../utils/placementFeeCalculator';
import { useTranslation } from 'react-i18next';
import {
  getFieldBadgeColor,
  getLevelIcon,
  getDeliveryModeLabel,
  getLevelLabel,
  getFieldOfStudyLabel,
  getDaysUntilDeadline
} from '../../../utils/scholarshipHelpers.tsx';
import { formatCurrency } from '../../../utils/currency';
import { is3800ScholarshipBlocked } from '../../../utils/scholarshipDeadlineValidation';


interface ScholarshipCardFullProps {
  scholarship: any;
  isSelected: boolean;
  onToggle: () => void;
  userProfile?: any;
  isLocked?: boolean;
  onViewDetails?: () => void;
  isLimitReached?: boolean;
  /** Quando fornecido, substitui o comportamento de seleção pelo label/ação customizado */
  actionLabel?: string;
}

const ScholarshipCardFullComponent: React.FC<ScholarshipCardFullProps> = ({
  scholarship,
  isSelected,
  onToggle,
  userProfile,
  isLocked = false,
  onViewDetails,
  isLimitReached = false,
  actionLabel,
}) => {
  const { t } = useTranslation(['registration', 'scholarships', 'common']);
  const isExpired = scholarship.deadline ? getDaysUntilDeadline(scholarship.deadline) < 0 : false;
  const isBlocked = is3800ScholarshipBlocked(scholarship) || isExpired;
  
  // Deadline calculation
  const deadline = scholarship.deadline ? new Date(scholarship.deadline) : null;
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : Infinity;

  // Financial calculations
  const scholarshipValue = Number(scholarship.annual_value_with_scholarship || scholarship.amount || 0);
  const originalValue = Number(scholarship.original_annual_value || scholarship.amount || 0);
  const savingsPercentage = originalValue > scholarshipValue && originalValue > 0
    ? Math.round(((originalValue - scholarshipValue) / originalValue) * 100)
    : 0;

  // Visual state
  const canViewSensitive = userProfile?.has_paid_selection_process_fee || userProfile?.role === 'admin' || userProfile?.role === 'affiliate_admin';
  const shouldApplyBlur = !canViewSensitive;

  return (
    <article 
      className={`group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border-2 ${
        isSelected 
          ? 'border-blue-600 border-[3px] bg-blue-50/50 shadow-lg shadow-blue-100/50' 
          : 'border-slate-200/60 hover:border-[#05294E]/20'
      } flex flex-col h-full hover:-translate-y-2`}
    >
      {/* Deadline Urgency Indicator */}
      {daysLeft <= 7 && daysLeft > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-500 z-10"></div>
      )}
      {daysLeft <= 3 && daysLeft > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600 z-10 animate-pulse"></div>
      )}
      {/* Scholarship Image Banner (Overlay Layout) */}
      <div className="relative w-full aspect-[8/3] bg-white z-10 overflow-hidden border-b border-slate-100 shrink-0 group">
        {/* Full Background Image */}
        <div className="absolute inset-0 z-0">
          {(scholarship.image_url || scholarship.universities?.image_url || scholarship.universities?.logo_url) ? (
            <img
              src={scholarship.image_url || scholarship.universities?.image_url || scholarship.universities?.logo_url || ''}
              alt={scholarship.title}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-slate-50 text-slate-400">
              <Building className="h-12 w-12 text-[#05294E]/20" />
            </div>
          )}
        </div>

        {/* Text Overlay Layer (Left side fade) */}
        <div className="absolute inset-y-0 left-0 w-[60%] sm:w-[70%] z-10 bg-gradient-to-r from-white via-white/95 to-transparent flex flex-col justify-center pl-5 pr-12">
          {/* Top Left Logo */}
          <div className="absolute top-5 left-5">
            <img 
              src="/logo.png" 
              alt="Matricula USA" 
              className="h-6 w-auto object-contain mb-1.5 drop-shadow-sm" 
            />
          </div>
          
          {/* Course / Field as Main Banner Text */}
          <p className="w-[95%] sm:w-[85%] md:w-[75%] text-base md:text-lg font-black font-['Montserrat',sans-serif] text-slate-900 line-clamp-4 pt-0.5 mt-10" style={{ lineHeight: 0.95 }}>
            {getFieldOfStudyLabel(scholarship.field_of_study, t) || t('scholarships:scholarshipsPage.filters.anyField')}
          </p>
        </div>
        
        {/* Top Right Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
          {scholarship.is_exclusive && (
            <div className="bg-amber-500 text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg flex items-center gap-1.5 uppercase tracking-wider">
              <Star className="h-3 w-3" />
              {t('common.exclusive')}
            </div>
          )}
          {(scholarship.is_highlighted || scholarship.featured) && (
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black flex items-center shadow-lg uppercase tracking-wider">
              <Star className="h-3 w-3 mr-1.5 fill-current" />
              {t('common.featured')}
            </div>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col z-0">
        {/* Title */}
        <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2 leading-tight line-clamp-2">
          {scholarship.title}
        </h3>
        
        {/* Field and Level Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm flex items-center gap-1.5 ${getFieldBadgeColor(scholarship.field_of_study)}`}>
            <GraduationCap className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span className="whitespace-normal break-words">{getFieldOfStudyLabel(scholarship.field_of_study, t)}</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 w-fit">
            {React.cloneElement(getLevelIcon(scholarship.level || 'undergraduate'), {
              className: "h-3.5 w-3.5",
              strokeWidth: 2.5
            })}
            <span className="capitalize">{getLevelLabel(scholarship.level || 'undergraduate', t)}</span>
          </span>
        </div>

        {/* Info Boxes Section */}
        <div className="space-y-1.5 mb-3">
          {/* University Info Box */}
          <div className="flex items-center gap-3 py-1">
            <div className="w-16 h-16 rounded-lg bg-white shadow-sm flex items-center justify-center border border-slate-200 flex-shrink-0 overflow-hidden">
              <div className="relative w-full h-full flex items-center justify-center">
                {scholarship.universities?.logo_url ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img 
                      src={scholarship.universities.logo_url} 
                      alt={scholarship.universities.name || "University Logo"} 
                      className={`w-full h-full object-contain p-2 transition-all duration-500 ${!canViewSensitive ? 'blur-[4px] opacity-50' : ''}`} 
                    />
                    {!canViewSensitive && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white/60 backdrop-blur-[2px] p-1.5 rounded-full shadow-sm border border-white/50">
                          <Lock className="h-3.5 w-3.5 text-slate-600" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <Building className={`h-8 w-8 text-[#05294E]/20 ${!canViewSensitive ? 'blur-[2px]' : ''}`} />
                    {!canViewSensitive && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="h-4 w-4 text-slate-400/80" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                {t('scholarships:scholarshipsPage.scholarshipCard.university')}
              </p>
              <p className={`text-sm font-bold truncate ${shouldApplyBlur ? 'blur-sm text-slate-400' : 'text-slate-700'}`}>
                {canViewSensitive
                  ? (scholarship.universities?.name || scholarship.university_name || 'Unknown University')
                  : '********'}
              </p>
            </div>
          </div>

          {/* Course Modality */}
          {scholarship.delivery_mode && (
            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">
                  {t('scholarships:scholarshipsPage.scholarshipCard.studyMode')}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tight text-slate-900">
                {getDeliveryModeLabel(scholarship.delivery_mode, t)}
              </span>
            </div>
          )}

          {/* Work Permissions */}
          {scholarship.work_permissions && scholarship.work_permissions.length > 0 && (
            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap mr-2">
                {t('scholarships:scholarshipsPage.scholarshipCard.workAuthorization')}
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

        {/* Financial Overview */}
        <div className="mb-4">
          <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm group-hover:shadow-md transition-shadow duration-300">
            <h4 className="text-[11px] font-black text-slate-800 mb-3 flex items-center gap-1.5 uppercase tracking-widest">
              <DollarSign className="h-3.5 w-3.5 text-green-600" />
              {t('scholarships:scholarshipsPage.scholarshipCard.financialOverview')}
            </h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">{t('scholarships:scholarshipsPage.scholarshipCard.originalPrice')}</span>
                <span className="text-slate-500 text-xs font-bold line-through">
                  {formatCurrency(originalValue)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">{t('scholarships:scholarshipsPage.scholarshipCard.withScholarship')}</span>
                <span className="text-green-700 font-extrabold text-base">
                  {formatCurrency(scholarshipValue)}
                </span>
              </div>
              
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                <span className="text-slate-400 text-xs font-medium">{t('scholarships:scholarshipsPage.scholarshipCard.perCredit')}</span>
                <span className="text-slate-500 text-xs font-bold">
                  {formatCurrency(Number(scholarship.original_value_per_credit || scholarship.per_credit_cost || 0))}
                </span>
              </div>
              
              {savingsPercentage > 0 && (
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                  <span className="text-slate-400 text-xs font-medium">
                    {t('scholarships:scholarshipsPage.scholarshipCard.scholarshipDiscount')}
                  </span>
                  <span className="text-green-600 text-xs font-black">{savingsPercentage}% OFF</span>
                </div>
              )}

              {userProfile?.placement_fee_flow && (() => {
                const placementFeeAmount = scholarship.placement_fee_amount ? Number(scholarship.placement_fee_amount) : null;
                const placementFee = getPlacementFee(scholarshipValue, placementFeeAmount);
                return (
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                    <span className="text-slate-400 text-xs font-medium">{t('scholarships:scholarshipsPage.scholarshipCard.placementFee', 'Placement Fee')}</span>
                    <span className="text-blue-600 text-xs font-black">{formatCurrency(placementFee)}</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Action Buttons - 75/25 split */}
        <div className="mt-auto">
          {/* Badge de bolsa inativa/expirada movido para fora do flow principal de botões */}
          {!scholarship.is_active && (
            <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg z-10">
              <AlertTriangle className="h-3 w-3" />
              Expirada
            </div>
          )}
          {!scholarship.is_active || isBlocked ? (
            <div className="flex flex-row gap-3">
              <button
                disabled
                className="w-3/4 bg-slate-400 text-white py-3 sm:py-4 px-2 sm:px-4 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center cursor-not-allowed opacity-60 relative overflow-hidden"
              >
                <span className="relative z-10 truncate">
                  {isBlocked ? t('scholarships:scholarshipDeadline.3800Expired') : t('scholarships:scholarshipsPage.scholarshipCard.notAvailable')}
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails?.();
                }}
                className="w-1/4 bg-transparent text-slate-400 py-3 sm:py-4 rounded-2xl flex items-center justify-center hover:text-[#05294E] transition-all duration-300 transform hover:scale-110"
              >
                <Eye className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
          ) : (
            <div className="flex flex-row gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                disabled={!actionLabel && (isLocked || (isLimitReached && !isSelected))}
                className={`w-3/4 py-3 sm:py-4 px-2 sm:px-4 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center relative overflow-hidden transition-all duration-300 active:scale-95 ${
                  !actionLabel && (isLocked || (isLimitReached && !isSelected))
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#05294E] to-slate-700 text-white shadow-lg hover:shadow-2xl hover:scale-105'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <span className="relative z-10 truncate">
                  {actionLabel
                    ? actionLabel
                    : isLocked
                      ? (t('registration:scholarshipSelection.review.alreadySelected') || 'Já Selecionada')
                      : isSelected
                        ? (t('registration:studentDashboard.findScholarships.scholarshipCard.removeSelection') || 'Remover')
                        : (t('registration:studentDashboard.findScholarships.scholarshipCard.selectScholarship') || 'Selecionar')}
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails?.();
                }}
                className="w-1/4 bg-transparent text-slate-400 py-3 sm:py-4 rounded-2xl flex items-center justify-center hover:text-[#05294E] transition-all duration-300 transform hover:scale-110"
              >
                <Eye className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
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
