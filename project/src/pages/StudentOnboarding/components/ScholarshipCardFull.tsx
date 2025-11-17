import React, { useState } from 'react';
import { 
  Building, 
  Clock, 
  DollarSign, 
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Star,
  ArrowRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  formatAmount, 
  getFieldBadgeColor, 
  getDaysUntilDeadlineDisplay,
  getDeadlineStatus,
  getLevelIcon,
  getDeliveryModeIcon,
  getDeliveryModeColor,
  getDeliveryModeLabel
} from '../../../utils/scholarshipHelpers.tsx';
import { is3800Scholarship, is3800ScholarshipBlocked } from '../../../utils/scholarshipDeadlineValidation';
import { ScholarshipCountdownTimer } from '../../../components/ScholarshipCountdownTimer';
import { ScholarshipExpiryWarning } from '../../../components/ScholarshipExpiryWarning';

interface ScholarshipCardFullProps {
  scholarship: any;
  isSelected: boolean;
  onToggle: () => void;
  userProfile?: any;
  isLocked?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
}

const ScholarshipCardFullComponent: React.FC<ScholarshipCardFullProps> = ({
  scholarship,
  isSelected,
  onToggle,
  userProfile,
  isLocked = false,
  isExpanded: isExpandedProp,
  onToggleExpand
}) => {
  const { t } = useTranslation();
  const scholarshipId = String(scholarship.id);
  // Se o estado expandido for controlado pelo pai, usar a prop; caso contrário, usar estado local
  const [isExpandedLocal, setIsExpandedLocal] = useState<boolean>(false);
  const [brokenImage, setBrokenImage] = useState<boolean>(false);
  const isBlocked = is3800ScholarshipBlocked(scholarship);
  
  // Usar prop se fornecida, caso contrário usar estado local
  const isExpanded = isExpandedProp !== undefined ? isExpandedProp : isExpandedLocal;
  
  // Handler específico para este card
  const handleToggleExpand = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onToggleExpand) {
      // Se o pai controla o estado, notificar o pai
      onToggleExpand(scholarshipId);
    } else {
      // Caso contrário, usar estado local
      setIsExpandedLocal(prev => !prev);
    }
  }, [scholarshipId, onToggleExpand]);
  
  const getApplicationFeeWithDependents = (sch: any): string => {
    const base = sch?.application_fee_amount ? Number(sch.application_fee_amount) : 350;
    const systemType = userProfile?.system_type || 'legacy';
    const deps = Number(userProfile?.dependents) || 0;
    const finalAmount = systemType === 'legacy' && deps > 0 ? base + deps * 100 : base;
    return finalAmount.toFixed(2);
  };

  // Usar o ID da bolsa como parte da chave para garantir que cada card seja único
  const uniqueCardKey = `scholarship-card-${scholarship.id}`;
  
  return (
    <div
      key={uniqueCardKey}
      id={`scholarship-card-wrapper-${scholarship.id}`}
      data-scholarship-id={scholarship.id}
      data-card-expanded={isExpanded ? 'true' : 'false'}
      className={`group relative bg-white rounded-2xl sm:rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border ${
        isSelected 
          ? 'border-blue-500 bg-blue-50/30' 
          : 'border-slate-200 hover:border-slate-300'
      } flex flex-col h-full hover:-translate-y-1`}
    >
      {/* Scholarship Image */}
      <div className="relative h-32 overflow-hidden flex-shrink-0">
        {scholarship.image_url && userProfile?.has_paid_selection_process_fee && !brokenImage ? (
          <img
            src={scholarship.image_url}
            alt={scholarship.title}
            onError={() => setBrokenImage(true)}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-slate-400 bg-gradient-to-br from-[#05294E]/5 to-slate-100">
            <Building className="h-12 w-12 text-[#05294E]/30" />
          </div>
        )}
        {scholarship.is_exclusive && (
          <div className="absolute top-2 right-2">
            <span className="bg-[#D0151C] text-white px-2 py-0.5 rounded-lg text-xs font-bold shadow-lg">
              {t('studentDashboard.findScholarships.scholarshipCard.exclusive')}
            </span>
          </div>
        )}
        {scholarship.is_highlighted && (
          <div className="absolute top-2 left-2">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center shadow-lg">
              <Star className="h-3 w-3 mr-1 fill-current" />
              {t('studentDashboard.findScholarships.scholarshipCard.featured')}
            </div>
          </div>
        )}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-1 shadow-lg">
            <CheckCircle className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
      
      {/* Card Content */}
      <div className="p-4 sm:p-6 flex-1 flex flex-col">
        {/* Warning for $3800 scholarships */}
        <ScholarshipExpiryWarning scholarship={scholarship} variant="badge" className="mb-3" />
        
        {/* Title and University */}
        <div className="mb-3 sm:mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3 leading-tight line-clamp-2 group-hover:text-[#05294E] transition-colors">
            {scholarship.title}
          </h3>
          <div className="flex items-center mb-2">
            <span className={`px-2 py-1 rounded-lg text-xs font-medium text-white ${getFieldBadgeColor(scholarship.field_of_study)}`}>
              {scholarship.field_of_study || 'Any Field'}
            </span>
          </div>
          <div className="flex items-center text-slate-600 mb-2 sm:mb-3">
            <Building className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-[#05294E]" />
            <span className="text-xs font-semibold mr-1">{t('studentDashboard.findScholarships.scholarshipCard.university')}</span>
            <span className="text-xs sm:text-sm truncate">
              {scholarship.universities?.name || 'Unknown University'}
            </span>
          </div>
        </div>

        {/* Key Info: Value and Deadline */}
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-green-600" />
              <span className="font-bold text-green-700 text-xs sm:text-sm">
                ${formatAmount(scholarship.annual_value_with_scholarship || scholarship.amount || 'N/A')}
              </span>
            </div>
            <div className="flex items-center">
              {is3800Scholarship(scholarship) ? (
                <ScholarshipCountdownTimer scholarship={scholarship} />
              ) : (
                <>
                  <Clock className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${getDeadlineStatus(scholarship.deadline).color}`} />
                  <span className="text-slate-700 text-xs sm:text-sm">
                    {getDaysUntilDeadlineDisplay(scholarship.deadline)} {t('studentDashboard.findScholarships.scholarshipCard.daysLeft')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          type="button"
          id={`expand-btn-${scholarship.id}`}
          onClick={handleToggleExpand}
          className="flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mb-2 py-1 transition-colors"
          aria-expanded={isExpanded}
          aria-controls={`scholarship-details-${scholarship.id}`}
        >
          {isExpanded ? (
            <>
              <span>{t('studentDashboard.findScholarships.scholarshipCard.showLess') || 'Show Less'}</span>
              <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              <span>{t('studentDashboard.findScholarships.scholarshipCard.showMore') || 'Show More Details'}</span>
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>

        {/* Expanded Content - Renderizar apenas quando expandido */}
        {isExpanded ? (
          <div
            id={`scholarship-details-${scholarship.id}`}
            key={`details-${scholarship.id}-expanded`}
            className="mb-3 pt-2 border-t border-slate-200 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200"
            data-expanded="true"
            data-scholarship-id={scholarship.id}
            data-card-id={`card-${scholarship.id}`}
            style={{ 
              display: 'block',
              position: 'relative',
              zIndex: 1
            }}
          >
            {/* Program Details */}
            {scholarship.delivery_mode && (
              <div className="flex items-center justify-between p-2 sm:p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center">
                  {getDeliveryModeIcon(scholarship.delivery_mode)}
                  <span className="text-xs font-medium text-slate-600 ml-1 sm:ml-2">
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
              <div className="p-2 sm:p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center mb-1 sm:mb-2">
                  <Briefcase className="h-3 w-3 text-emerald-600" />
                  <span className="text-xs font-medium text-slate-600 ml-1 sm:ml-2">
                    {t('studentDashboard.findScholarships.scholarshipCard.workAuthorization')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {scholarship.work_permissions.slice(0, 3).map((permission: string, index: number) => (
                    <span
                      key={index}
                      className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold"
                    >
                      {permission}
                    </span>
                  ))}
                  {scholarship.work_permissions.length > 3 && (
                    <span className="text-xs text-slate-500">+{scholarship.work_permissions.length - 3} {t('studentDashboard.findScholarships.scholarshipCard.more')}</span>
                  )}
                </div>
              </div>
            )}

            {/* Financial Overview */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-2 sm:p-3 border border-slate-200">
              <h4 className="text-xs sm:text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                {t('studentDashboard.findScholarships.scholarshipCard.financialOverview')}
              </h4>
              <div className="space-y-1.5">
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
                <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 pt-1.5 border-t border-slate-200">
                  <span>{t('studentDashboard.findScholarships.scholarshipCard.perCredit')}</span>
                  <span>${formatAmount(scholarship.original_value_per_credit || scholarship.per_credit_cost || 'N/A')}</span>
                </div>
                <div className="pt-1.5 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
                    <span>{t('scholarshipsPage.scholarshipCard.applicationFee')}</span>
                    <span className="font-semibold text-purple-600">
                      ${getApplicationFeeWithDependents(scholarship)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 text-center mt-0.5">
                    {scholarship.application_fee_amount && Number(scholarship.application_fee_amount) !== 350
                      ? t('scholarshipsPage.scholarshipCard.customFee')
                      : t('scholarshipsPage.scholarshipCard.standardFee')}
                  </div>
                </div>
              </div>
            </div>

            {/* Level */}
            <div className="flex items-center justify-between text-xs sm:text-sm p-2 sm:p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500">{t('studentDashboard.findScholarships.scholarshipCard.level')}</span>
              <div className="flex items-center">
                {getLevelIcon(scholarship.level || 'undergraduate')}
                <span className="ml-1 sm:ml-2 capitalize text-slate-700">{scholarship.level}</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Action Button */}
        <div className="mt-auto pt-2 border-t border-slate-100">
          {!scholarship.is_active || isBlocked ? (
            <button
              disabled
              className="w-full h-9 px-3 rounded-lg font-semibold cursor-not-allowed flex items-center justify-center bg-slate-300 text-slate-500 opacity-60 text-xs"
            >
              <AlertTriangle className="h-3 w-3 mr-1.5" />
              {isBlocked ? t('scholarshipDeadline.3800Expired') : t('scholarshipsPage.scholarshipCard.notAvailable')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggle}
              disabled={isLocked}
              className={`w-full h-9 px-3 rounded-lg font-bold text-xs flex items-center justify-center transition-all duration-300 relative overflow-hidden ${
                isLocked
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                  : isSelected
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md'
                  : 'bg-gradient-to-r from-blue-400 to-blue-500 text-white hover:from-blue-500 hover:to-blue-600'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <span className="relative z-10">
                {isLocked 
                  ? 'Já Selecionado'
                  : isSelected 
                  ? 'Remove from Selection' 
                  : t('studentDashboard.findScholarships.scholarshipCard.selectScholarship')}
              </span>
              {!isLocked && !isSelected && (
                <ArrowRight className="h-3 w-3 ml-1.5 group-hover:translate-x-1 transition-transform relative z-10 text-white" />
              )}
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
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.userProfile?.id === nextProps.userProfile?.id;
  
  return propsEqual;
});
