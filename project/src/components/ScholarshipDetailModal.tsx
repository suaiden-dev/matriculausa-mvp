import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { UserProfile } from '../hooks/useAuth';
import type { User } from '../types';
import { 
  X, 
  Award, 
  Building, 
  DollarSign, 
  Clock, 
  Target, 
  Star,
  GraduationCap,
  Monitor,
  MapPin,
  Briefcase,
  Globe,
  FileText,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { is3800Scholarship, is3800ScholarshipBlocked } from '../utils/scholarshipDeadlineValidation';
import { ScholarshipCountdownTimer } from './ScholarshipCountdownTimer';
import { useModal } from '../contexts/ModalContext';

interface ScholarshipDetailModalProps {
  scholarship: any;
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserProfile | null;
  user?: User | null;
  userRole?: string | null;
}

const ScholarshipDetailModal: React.FC<ScholarshipDetailModalProps> = ({
  scholarship,
  isOpen,
  onClose,
  userProfile,
  user,
  userRole
}) => {
  const { t } = useTranslation();
  const { openModal, closeModal } = useModal();
  
  const getApplicationFeeWithDependents = (base: number): number => {
    const deps = Number(userProfile?.dependents) || 0;
    return deps > 0 ? base + deps * 100 : base;
  };
  
  React.useEffect(() => {
    if (isOpen) {
      openModal();
      const originalOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        closeModal();
        document.body.style.overflow = originalOverflow || '';
        document.documentElement.style.overflow = originalHtmlOverflow || '';
      };
    }
  }, [isOpen, openModal, closeModal]);

  if (!scholarship) return null;
  const canViewSensitive = !!((userRole && userRole !== 'student') || userProfile?.has_paid_selection_process_fee);

  const formatAmount = (amount: any) => {
    if (typeof amount === 'string') return amount;
    if (typeof amount === 'number') return amount.toLocaleString('en-US');
    return amount;
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [year, month, day] = deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day);
    deadlineDate.setHours(23, 59, 59, 999);
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysLeft = getDaysUntilDeadline(scholarship.deadline);
  const isExpired = !scholarship.is_active || is3800ScholarshipBlocked(scholarship) || daysLeft < 0;

  // Parse internal fees
  let internalFees = scholarship.internal_fees;
  if (typeof internalFees === 'string') {
    try { internalFees = JSON.parse(internalFees); } catch (e) { internalFees = []; }
  }
  const hasInternalFees = internalFees && Array.isArray(internalFees) && internalFees.length > 0 && userProfile?.has_paid_selection_process_fee;

  const applicationFee = scholarship.application_fee_amount 
    ? getApplicationFeeWithDependents(Number(scholarship.application_fee_amount)) 
    : getApplicationFeeWithDependents(350);

  const annualSavings = (scholarship.original_annual_value || 0) - (scholarship.annual_value_with_scholarship || 0);

  const deadlineFormatted = (() => {
    const [year, month, day] = scholarship.deadline.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  })();

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Image */}
            <div className="relative flex-shrink-0">
              <div className="h-40 sm:h-48 bg-gradient-to-br from-[#05294E] via-[#0a3d6e] to-[#05294E] relative">
                {scholarship.image_url && canViewSensitive && (
                  <img 
                    src={scholarship.image_url} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>

                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {scholarship.is_exclusive && (
                    <span className="inline-flex items-center gap-1 bg-amber-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow-lg">
                      <Star className="h-3 w-3" />
                      {t('scholarshipsPage.modal.exclusive') || 'Exclusive'}
                    </span>
                  )}
                  {isExpired && (
                    <span className="inline-flex items-center gap-1 bg-red-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow-lg">
                      <AlertTriangle className="h-3 w-3" />
                      {t('scholarshipsPage.modal.expired') || 'Expired'}
                    </span>
                  )}
                </div>

                {/* Title Section */}
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-white/70 text-sm mb-1">
                    {scholarship.field_of_study || t('scholarshipsPage.modal.anyField')}
                  </p>
                  <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight mb-2">
                    {scholarship.title}
                  </h2>
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <Building className="h-4 w-4" />
                    <span className={!canViewSensitive ? 'blur-[3px]' : ''}>
                      {canViewSensitive ? scholarship.universities?.name : '••••••••••••'}
                    </span>
                    {canViewSensitive && scholarship.universities?.location && (
                      <>
                        <span className="text-white/50">•</span>
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{scholarship.universities.location}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-5 sm:p-6">
                
                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  {/* Left Column (Main Info) - Order 2 on Mobile, Order 1 on Desktop */}
                  <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
                    {/* Key Metrics - Consolidada */}
                    <div className="flex flex-wrap gap-4 sm:gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium uppercase">{t('scholarshipsPage.modal.annualSavings') || 'Annual Savings'}</p>
                          <p className="text-lg font-bold text-green-700">${formatAmount(annualSavings)}</p>
                        </div>
                      </div>
                      
                      {scholarship.scholarship_percentage && (
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                            <Award className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-medium uppercase">{t('scholarshipsPage.modal.coverage') || 'Coverage'}</p>
                            <p className="text-lg font-bold text-blue-700">{scholarship.scholarship_percentage}%</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <div className={`w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center`}>
                          <Calendar className={`h-5 w-5 ${
                            daysLeft <= 7 ? 'text-red-600' : daysLeft <= 30 ? 'text-amber-600' : 'text-slate-600'
                          }`} />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium uppercase">{t('scholarshipsPage.modal.deadline') || 'Deadline'}</p>
                          {is3800Scholarship(scholarship) ? (
                            <ScholarshipCountdownTimer scholarship={scholarship} className="text-sm font-bold" />
                          ) : (
                            <p className={`text-lg font-bold ${
                              daysLeft <= 7 ? 'text-red-600' : daysLeft <= 30 ? 'text-amber-600' : 'text-slate-800'
                            }`}>
                              {daysLeft > 0 ? `${daysLeft} ${t('scholarshipsPage.modal.days')}` : t('scholarshipsPage.modal.expired')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Financial Details Table */}
                    <section>
                      <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-[#05294E]" />
                        {t('scholarshipsPage.modal.financialBreakdown') || 'Financial Details'}
                      </h3>
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-slate-100">
                            {/* Annual Costs */}
                            <tr className="bg-slate-50/50">
                              <td className="py-3 px-4 text-slate-600 font-medium">{t('scholarshipsPage.modal.originalAnnualCost') || 'Original Annual Cost'}</td>
                              <td className="py-3 px-4 text-right text-slate-400 line-through decoration-slate-400">${formatAmount(scholarship.original_annual_value)}</td>
                            </tr>
                            <tr className="bg-green-50/30">
                              <td className="py-3 px-4 text-slate-700 font-bold">{t('scholarshipsPage.modal.withScholarship') || 'With Scholarship'}</td>
                              <td className="py-3 px-4 text-right text-green-700 font-bold text-base">${formatAmount(scholarship.annual_value_with_scholarship)}</td>
                            </tr>
                            
                            {/* Fees */}
                            <tr>
                              <td className="py-3 px-4 text-slate-600">{t('scholarshipsPage.scholarshipCard.applicationFee') || 'Application Fee'}</td>
                              <td className="py-3 px-4 text-right text-slate-700 font-medium">${applicationFee.toFixed(0)}</td>
                            </tr>
                            
                            {/* Internal Fees (Integrated) */}
                            {hasInternalFees && internalFees.map((fee: any, idx: number) => (
                              <tr key={`internal-${idx}`} className="bg-slate-50/30">
                                <td className="py-3 px-4">
                                  <div className="flex flex-col">
                                    <span className="text-slate-600">{fee.category || fee.name}</span>
                                    {fee.details && <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">{fee.details}</span>}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right text-slate-700 font-medium">${Number(fee.amount).toLocaleString()}</td>
                              </tr>
                            ))}
                            
                            {/* Per Credit */}
                            {scholarship.original_value_per_credit && (
                              <tr className="bg-slate-50/50">
                                <td className="py-3 px-4 text-slate-500 text-xs">{t('scholarshipsPage.modal.costPerCredit') || 'Cost per Credit'}</td>
                                <td className="py-3 px-4 text-right text-slate-500 text-xs">${formatAmount(scholarship.original_value_per_credit)}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        {hasInternalFees && (
                          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-wide font-medium">
                            <Info className="h-3 w-3" />
                            {t('scholarshipsPage.modal.internalFeesNote')}
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Benefits (Requirements moved to Sidebar) */}
                    {scholarship.benefits && (Array.isArray(scholarship.benefits) ? scholarship.benefits.length > 0 : !!scholarship.benefits) && (
                      <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
                        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <Award className="h-4 w-4 text-[#05294E]" />
                          {t('scholarshipsPage.modal.additionalBenefits') || 'Benefits'}
                        </h3>
                        <ul className="space-y-2 text-sm text-slate-600">
                          {Array.isArray(scholarship.benefits) ? (
                            scholarship.benefits.map((benefit: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-slate-700">{benefit}</span>
                              </li>
                            ))
                          ) : (
                            <li className="whitespace-pre-line">{scholarship.benefits}</li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    {scholarship.description && (
                      <section>
                         <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[#05294E]" />
                          {t('scholarshipsPage.modal.programDescription') || 'Description'}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed bg-white p-4 border border-slate-100 rounded-xl shadow-sm">
                          {scholarship.description}
                        </p>
                      </section>
                    )}
                  </div>

                  {/* Right Column (Program Info Panel) - Order 1 on Mobile, Order 2 on Desktop */}
                  <div className="lg:col-span-1 order-1 lg:order-2">
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 sticky top-4">
                      <h3 className="text-sm font-bold text-[#05294E] uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                        {t('scholarshipsPage.modal.programInformation') || 'Program Details'}
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="group">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">{t('scholarshipsPage.modal.academicLevel')}</p>
                          <div className="flex items-center gap-2 text-slate-700 font-medium">
                            <GraduationCap className="h-4 w-4 text-[#05294E]" />
                            <span className="capitalize">{scholarship.level || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="group">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">{t('scholarshipsPage.modal.studyMode')}</p>
                          <div className="flex items-center gap-2 text-slate-700 font-medium">
                            <Monitor className="h-4 w-4 text-[#05294E]" />
                            <span className="capitalize">
                              {scholarship.delivery_mode === 'in_person' ? t('scholarshipsPage.modal.inPerson') : scholarship.delivery_mode}
                            </span>
                          </div>
                        </div>

                        {scholarship.duration && (
                          <div className="group">
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">{t('scholarshipsPage.modal.programDuration')}</p>
                            <div className="flex items-center gap-2 text-slate-700 font-medium">
                              <Clock className="h-4 w-4 text-[#05294E]" />
                              <span>{scholarship.duration}</span>
                            </div>
                          </div>
                        )}

                        {scholarship.language && (
                          <div className="group">
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">{t('scholarshipsPage.modal.language')}</p>
                            <div className="flex items-center gap-2 text-slate-700 font-medium">
                              <Globe className="h-4 w-4 text-[#05294E]" />
                              <span>{scholarship.language}</span>
                            </div>
                          </div>
                        )}

                        {scholarship.work_permissions && scholarship.work_permissions.length > 0 && (
                          <div className="pt-4 border-t border-slate-200">
                             <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">{t('scholarshipsPage.modal.workAuthorization')}</p>
                             <div className="flex flex-wrap gap-2">
                                {scholarship.work_permissions.map((permission: string, index: number) => (
                                  <span key={index} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-md text-xs font-semibold shadow-sm">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    {permission}
                                  </span>
                                ))}
                             </div>
                          </div>
                        )}

                        {/* Requirements Moved Here */}
                        {scholarship.requirements && (
                          <div className="pt-4 border-t border-slate-200">
                             <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2 flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                {t('scholarshipsPage.modal.requirements') || 'Requirements'}
                             </p>
                             <ul className="space-y-2 text-sm text-slate-600">
                              {Array.isArray(scholarship.requirements) ? (
                                scholarship.requirements.map((req: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-[#05294E] rounded-full mt-1.5 flex-shrink-0" />
                                    <span>{req}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="whitespace-pre-line">{scholarship.requirements}</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {scholarship.description && (
                  <section className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#05294E]" />
                      {t('scholarshipsPage.modal.programDescription') || 'Description'}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                      {scholarship.description}
                    </p>
                  </section>
                )}

                {/* Deadline Footer */}
                <div className="mt-6 pt-4 border-t border-slate-200 text-center">
                  <p className="text-sm text-slate-500">
                    {t('scholarshipsPage.modal.applicationDeadline') || 'Application Deadline'}: 
                    <span className="ml-1 font-semibold text-slate-700">{deadlineFormatted}</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default ScholarshipDetailModal;
