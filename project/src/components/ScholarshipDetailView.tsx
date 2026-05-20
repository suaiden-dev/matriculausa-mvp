import React from 'react';
import { useTranslation } from 'react-i18next';
import type { UserProfile } from '../hooks/useAuth';
import type { User } from '../types';
import { 
  Award, 
  Building,
  Clock, 
  Star,
  GraduationCap,
  Monitor,
  MapPin,
  Globe,
  FileText,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Info,
  ExternalLink,
  Target,
  Lock
} from 'lucide-react';
import { is3800ScholarshipBlocked } from '../utils/scholarshipDeadlineValidation';
import { getPlacementFee } from '../utils/placementFeeCalculator';
import { formatCurrency } from '../utils/currency';

export interface ScholarshipDetailViewProps {
  scholarship: any;
  userProfile?: UserProfile | null;
  user?: User | null;
  userRole?: string | null;
}

export const ScholarshipDetailView: React.FC<ScholarshipDetailViewProps> = ({
  scholarship,
  userProfile,
  user,
  userRole
}) => {
  const { t } = useTranslation();

  if (!scholarship) return null;

  // Trava de segurança para bolsas de teste (is_test)
  const isUorakUser = user?.email?.toLowerCase().endsWith('@uorak.com') || (userProfile as any)?.email?.toLowerCase().endsWith('@uorak.com');
  const isAdmin = userRole === 'admin';
  
  if (scholarship?.is_test && !isUorakUser && !isAdmin) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-200">
        <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-red-800 mb-2">Bolsa Restrita</h3>
        <p className="text-sm text-red-600">Esta é uma bolsa de testes reservada para administradores e auditores credenciados.</p>
      </div>
    );
  }

  const getApplicationFeeWithDependents = (base: number): number => {
    const deps = Number(userProfile?.dependents) || 0;
    return deps > 0 ? base + deps * 100 : base;
  };

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

  // Parse internal fees and add fixed ones
  let internalFeesData = scholarship.internal_fees;
  if (typeof internalFeesData === 'string') {
    try { internalFeesData = JSON.parse(internalFeesData); } catch (e) { internalFeesData = []; }
  }
  
  const baseInternalFees = Array.isArray(internalFeesData) ? internalFeesData : [];
  
  const processType = userProfile?.student_process_type;
  const visaTransferActive = userProfile?.visa_transfer_active;

  const fixedFees: any[] = [];
  
  const internalFees = [...fixedFees, ...baseInternalFees];
  const hasInternalFees = internalFees.length > 0;
  const canViewInternalFees = hasInternalFees;
  const shouldShowInternalFeesNotice = false;

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

  return (
    <div className="w-full">
      {/* Premium Banner */}
      <div className="relative w-full aspect-[8/3] bg-white overflow-hidden border-b border-slate-100 shrink-0 group">
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
              <Building className="h-16 w-16 text-[#05294E]/20" />
            </div>
          )}
        </div>

        {/* Text Overlay Layer (Left side fade) */}
        <div className="absolute inset-y-0 left-0 w-[70%] z-10 bg-gradient-to-r from-white via-white/95 to-transparent flex flex-col justify-center pl-6 sm:pl-10">
          {/* Top Left Logo & Line */}
          <div className="absolute top-6 left-6 sm:left-10">
            <img 
              src="/logo.png" 
              alt="Matricula USA" 
              className="h-8 w-auto object-contain mb-2 drop-shadow-sm" 
            />
          </div>
          
          {/* Course / Field as Main Banner Text */}
          <p className="w-[85%] text-xl sm:text-2xl md:text-3xl font-black font-['Montserrat',sans-serif] text-slate-900 line-clamp-3 pt-0.5 mt-12" style={{ lineHeight: 0.95 }}>
            {scholarship.field_of_study || t('scholarshipsPage.modal.anyField')}
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {/* Title Section */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
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

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-4 tracking-tight">
            {scholarship.title}
          </h2>
          
          <div className="flex flex-wrap items-center gap-4 text-slate-600 text-sm font-bold">
            <div className="flex items-center gap-5 py-3 px-4 bg-slate-50 rounded-2xl border border-slate-100 relative">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center border border-slate-200 flex-shrink-0 overflow-hidden relative">
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
                          <Lock className="h-4 w-4 text-slate-600" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <Building className={`h-8 w-8 text-[#05294E]/20 ${!canViewSensitive ? 'blur-[2px]' : ''}`} />
                    {!canViewSensitive && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="h-5 w-5 text-slate-400/80" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">
                  {t('scholarshipsPage.scholarshipCard.university')}
                </p>
                <span className={`text-lg sm:text-xl font-black tracking-tight ${!canViewSensitive ? 'blur-sm text-slate-300' : 'text-slate-900'}`}>
                  {canViewSensitive ? scholarship.universities?.name : '••••••••••••'}
                </span>
              </div>
            </div>
            {canViewSensitive && scholarship.universities?.location && (
              <div className="flex items-center gap-2 py-2 px-3 bg-slate-50 rounded-xl border border-slate-100">
                <MapPin className="h-4 w-4 text-[#05294E]" />
                <span className="text-slate-900">{scholarship.universities.location}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Content Grid */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column (Main Info) */}
          <div className="contents lg:block lg:col-span-2 lg:space-y-6">

            {/* Premium Investment Card */}
            <div className="bg-slate-50/80 border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-4 text-left order-1 lg:order-none">
              {/* Investimento Anual Sem Bolsa */}
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                  {t('scholarshipsPage.detail.regularAnnualCost', 'Investimento Anual (Sem Bolsa)')}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-slate-400/80 line-through decoration-red-400/80">
                    ${formatAmount(scholarship.original_annual_value)}
                  </span>
                  <span className="text-xs font-medium text-slate-400">{t('scholarshipsPage.detail.perYear', '/ano')}</span>
                </div>
              </div>

              <div className="border-t border-slate-200/60" />

              {/* Investimento com Bolsa Exclusiva */}
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#05294E] mb-2">
                  {t('scholarshipsPage.detail.exclusiveScholarshipPrice', 'Investimento com Bolsa Exclusiva')}
                </span>
                <div className="flex items-baseline gap-1 mb-2.5">
                  <span className="text-3xl sm:text-4xl font-black text-green-700">
                    ${formatAmount(scholarship.annual_value_with_scholarship)}
                  </span>
                  <span className="text-xs font-bold text-slate-500">{t('scholarshipsPage.detail.perYear', '/ano')}</span>
                </div>
                <div>
                  <span className="inline-flex items-center px-3 py-1.5 bg-green-100/60 text-green-800 text-xs font-black rounded-full uppercase tracking-wider">
                    {t('scholarshipsPage.detail.annualSavingsBadge', 'Economia de ${{amount}}/ano').replace('{{amount}}', formatAmount(annualSavings))}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200/60" />

              {/* Prazo de Inscrição */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-600 font-bold">
                  <Calendar className="h-5 w-5 text-amber-500" />
                  <span>{t('scholarshipsPage.detail.applicationDeadline', 'Prazo de Inscrição')}</span>
                </div>
                <span className={`font-black ${daysLeft <= 7 ? 'text-red-600' : daysLeft <= 30 ? 'text-amber-600' : 'text-slate-800'}`}>
                  {daysLeft > 0 ? (
                    daysLeft === 1 
                      ? t('scholarshipsPage.detail.daysLeft', '1 dia restante').replace('{{count}}', String(daysLeft))
                      : t('scholarshipsPage.detail.daysLeft_plural', '{{count}} dias restantes').replace('{{count}}', String(daysLeft))
                  ) : (
                    t('scholarshipsPage.detail.expired', 'Inscrições Encerradas')
                  )}
                </span>
              </div>
            </div>

            {/* Description */}
            {scholarship.description && (
              <section className="space-y-2 order-2 lg:order-none">
                 <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#05294E]" />
                  {t('scholarshipsPage.modal.programDescription') || 'Scholarship Description'}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed bg-white p-4 border border-slate-100 rounded-xl shadow-sm">
                  {scholarship.description}
                </p>
              </section>
            )}

             {/* Financial Details Table */}
            <section className="space-y-4 order-4 lg:order-none">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                {t('scholarshipsPage.modal.financialBreakdown') || 'Financial Details'}
              </h3>
              
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-4">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 px-4 text-slate-600">{t('scholarshipsPage.scholarshipCard.applicationFee') || 'Application Fee'}</td>
                      <td className="py-3 px-4 text-right text-slate-700 font-medium">${applicationFee.toFixed(0)}</td>
                    </tr>
                    
                    {userProfile?.placement_fee_flow && (() => {
                      const annualValue = scholarship.annual_value_with_scholarship ? Number(scholarship.annual_value_with_scholarship) : Number(scholarship.amount) || 0;
                      const placementFeeAmount = scholarship.placement_fee_amount ? Number(scholarship.placement_fee_amount) : null;
                      const placementFeeValue = getPlacementFee(annualValue, placementFeeAmount);
                      return (
                        <tr>
                          <td className="py-3 px-4 text-slate-600 font-medium">{t('scholarships:scholarshipsPage.scholarshipCard.placementFee', 'Placement Fee')}</td>
                          <td className="py-3 px-4 text-right text-blue-600 font-bold">{formatCurrency(placementFeeValue)}</td>
                        </tr>
                      );
                    })()}

                    <tr>
                      <td className="py-3 px-4">
                        <div className="flex flex-col text-left">
                          <span className="text-slate-600 font-medium">Control Fee</span>
                          <span className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                            {t('scholarshipsPage.detail.controlFeeDetail', 'Taxa necessária para estudantes que solicitam o visto do tipo Initial/Mudança de Status (COS)')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 font-medium">$1,800</td>
                    </tr>

                    {(!processType || (processType === 'transfer' && visaTransferActive === false)) && (
                      <tr>
                        <td className="py-3 px-4">
                          <div className="flex flex-col text-left">
                            <span className="text-slate-600 font-medium">Reinstatement Fee</span>
                            <span className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                              {t('scholarshipsPage.modal.reinstatementPackageDescription', 'Taxa necessária para estudantes transfer que possuem o status do visto inativo/terminado.')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 font-medium">$500</td>
                      </tr>
                    )}
                    
                    {scholarship.original_value_per_credit && (
                      <tr className="bg-slate-50/50">
                        <td className="py-3 px-4 text-slate-500 text-xs">{t('scholarshipsPage.modal.costPerCredit') || 'Cost per Credit'}</td>
                        <td className="py-3 px-4 text-right text-slate-500 text-xs">${formatAmount(scholarship.original_value_per_credit)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Aviso sobre Taxas Internas */}
              {shouldShowInternalFeesNotice && (
                <div className="bg-blue-50/30 rounded-xl border-2 border-blue-200 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-blue-100/50 border-b border-blue-200">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">
                          {t('scholarshipsPage.modal.internalFeesAvailable') || 'University Internal Fees Available'}
                        </h4>
                        <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                          {t('scholarshipsPage.modal.internalFeesNotice') || 'This scholarship may have additional internal fees from the university. These fees will be visible after payment of the Selection Process Fee.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Taxas Internas da Universidade */}
            {canViewInternalFees && (
              <section className="space-y-4 order-5 lg:order-none">
                <div className="bg-blue-50/30 rounded-xl border-2 border-blue-200 overflow-hidden shadow-sm">
                  <div className="px-4 py-2.5 bg-blue-100/50 border-b border-blue-200">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide">
                        {t('scholarshipsPage.modal.internalFeesTitle') || 'Internal University Fees'}
                      </h4>
                    </div>
                    <p className="text-[10px] text-blue-700 mt-1 font-medium">
                      {t('scholarshipsPage.modal.internalFeesDisclaimer') || 'These fees are paid directly to the university, not through our platform'}
                    </p>
                    {canViewSensitive && scholarship.universities?.university_fees_page_url && (
                      <a 
                        href={scholarship.universities.university_fees_page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2 font-medium hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t('scholarshipsPage.modal.viewUniversityFeesPage')}
                      </a>
                    )}
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100">
                      {internalFees.map((fee: any, idx: number) => (
                        <tr key={`internal-${idx}`} className="bg-white/50 group hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-slate-700 font-bold text-sm tracking-tight">{fee.category || fee.name}</span>
                              {fee.details && <span className="text-[10px] text-slate-500 font-medium tracking-wide mt-1 leading-relaxed">{fee.details}</span>}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right text-slate-900 font-black text-base">
                            ${Number(fee.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Benefits */}
            {scholarship.benefits && (Array.isArray(scholarship.benefits) ? scholarship.benefits.length > 0 : !!scholarship.benefits) && (
              <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 order-6 lg:order-none">
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

          </div>

          {/* Right Column (Program Info Panel) */}
          <div className="contents lg:block lg:col-span-1">
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 lg:sticky lg:top-4 order-3 lg:order-none">
              <h3 className="text-sm font-bold text-[#05294E] uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                {t('scholarshipsPage.modal.programInformation') || 'Scholarship Information'}
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

                {/* Academic Requirements */}
                {(scholarship.min_gpa || scholarship.min_english_proficiency) && (
                  <div className="pt-4 border-t border-slate-200 space-y-4">
                    {scholarship.min_gpa && (
                      <div className="group">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">GPA Mínimo</p>
                        <div className="text-slate-700 font-medium">
                          <span>{Number(scholarship.min_gpa).toFixed(1)}</span>
                        </div>
                      </div>
                    )}

                    {scholarship.min_english_proficiency && (
                      <div className="group">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">{t('dashboard:profileManagement.form.englishProficiency')}</p>
                        <div className="text-slate-700 font-medium">
                          <span>{t(`dashboard:profileManagement.form.fields.${scholarship.min_english_proficiency}`)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Requirements */}
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

        {/* Deadline Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            {t('scholarshipsPage.modal.applicationDeadline') || 'Application Deadline'}: 
            <span className="ml-1 font-semibold text-slate-700">{deadlineFormatted}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ScholarshipDetailView;
