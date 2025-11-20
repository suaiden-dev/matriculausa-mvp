import React from 'react';
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
  AlertCircle,
  AlertTriangle,
  BookOpen,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { is3800Scholarship, is3800ScholarshipBlocked } from '../utils/scholarshipDeadlineValidation';
import { ScholarshipCountdownTimer } from './ScholarshipCountdownTimer';

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
  
  // Helper: calcular Application Fee exibida considerando dependentes (legacy e simplified)
  const getApplicationFeeWithDependents = (base: number): number => {
    const deps = Number(userProfile?.dependents) || 0;
    // ✅ CORREÇÃO: Adicionar $100 por dependente para ambos os sistemas (legacy e simplified)
    return deps > 0 ? base + deps * 100 : base;
  };
  
  // Controlar o scroll do body quando o modal estiver aberto
  React.useEffect(() => {
    if (isOpen) {
      // Salvar o estado atual
      const originalOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      
      // Desabilitar scroll apenas no modal aberto
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      
      // Cleanup - restaurar estados originais
      return () => {
        document.body.style.overflow = originalOverflow || '';
        document.documentElement.style.overflow = originalHtmlOverflow || '';
      };
    }
  }, [isOpen]);

  if (!scholarship) return null;
  const canViewSensitive = !!((userRole && userRole !== 'student') || userProfile?.has_paid_selection_process_fee);

  const formatAmount = (amount: any) => {
    if (typeof amount === 'string') return amount;
    if (typeof amount === 'number') return amount.toLocaleString('en-US');
    return amount;
  };

  const getFieldBadgeColor = (field: string | undefined) => {
    switch (field?.toLowerCase()) {
      case 'stem':
        return 'bg-gradient-to-r from-blue-600 to-indigo-600';
      case 'business':
        return 'bg-gradient-to-r from-green-600 to-emerald-600';
      case 'engineering':
        return 'bg-gradient-to-r from-purple-600 to-violet-600';
      case 'arts':
        return 'bg-gradient-to-r from-pink-600 to-rose-600';
      case 'medicine':
        return 'bg-gradient-to-r from-red-600 to-pink-600';
      case 'law':
        return 'bg-gradient-to-r from-amber-600 to-orange-600';
      default:
        return 'bg-gradient-to-r from-slate-600 to-slate-700';
    }
  };

  const getCourseModalityIcon = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'online':
        return <Monitor className="h-4 w-4" />;
      case 'in_person':
        return <Building className="h-4 w-4" />;
      case 'hybrid':
        return <Globe className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getCourseModalityColor = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'online':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in_person':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'hybrid':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDaysUntilDeadline = (deadline: string) => {
    // Criar data atual sem hora (apenas dia)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Criar deadline como data local (não UTC) para evitar problemas de timezone
    // Parse da data no formato YYYY-MM-DD como local
    const [year, month, day] = deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day); // month - 1 porque Date usa 0-11
    deadlineDate.setHours(23, 59, 59, 999); // Fim do dia
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineStatus = (deadline: string) => {
    const days = getDaysUntilDeadline(deadline);
    if (days < 0) return { status: 'expired', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: AlertCircle };
    if (days <= 7) return { status: 'urgent', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', icon: AlertCircle };
    if (days <= 30) return { status: 'soon', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', icon: Clock };
    return { status: 'normal', color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: CheckCircle };
  };

  const deadlineInfo = getDeadlineStatus(scholarship.deadline);
  const DeadlineIcon = deadlineInfo.icon;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={onClose}
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh'
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative">
              {/* Hero Image */}
              <div className="h-64 overflow-hidden relative">
                {scholarship.image_url ? (
                  <div className="relative w-full h-full">
                    <img
                      src={scholarship.image_url}
                      alt={scholarship.title}
                      className={`w-full h-full object-contain transition-all duration-300 ${
                        canViewSensitive 
                          ? 'blur-0 opacity-100' 
                          : 'blur-md opacity-30'
                      }`}
                    />
                    {/* Overlay para usuários não logados ou não pagos */}
                    {(!canViewSensitive) && (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/80 via-blue-700/80 to-indigo-800/80 flex items-center justify-center">
                        <div className="text-center text-white">
                          <GraduationCap className="h-16 w-16 mx-auto mb-2 text-white/60" />
                          <p className="text-sm font-medium opacity-80">
                            {t('scholarshipsPage.modal.unlockImage')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center">
                    <GraduationCap className="h-24 w-24 text-white/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                
                {/* Close Button - Sempre no topo direito */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 bg-white text-black p-2 rounded-full border border-gray-300 shadow-md hover:bg-gray-100 transition-all duration-200 z-10"
                >
                  <X className="h-6 w-6" />
                </button>

                {/* Exclusive Badge */}
                {scholarship.is_exclusive && (
                  <div className="absolute top-4 left-4">
                    <span className="bg-[#D0151C] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      {t('scholarshipsPage.modal.exclusiveScholarship')}
                    </span>
                  </div>
                )}

                {/* Inactive/Expired Badge - Posicionado abaixo do botão de fechar */}
                {(!scholarship.is_active || is3800ScholarshipBlocked(scholarship)) && (
                  <div className="absolute top-16 right-4">
                    <span className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {t('scholarshipsPage.modal.expired')}
                    </span>
                  </div>
                )}

                {/* Title Overlay */}
                <div className="absolute bottom-6 left-6 right-6">
                  <h2 className="text-3xl font-bold text-white mb-2 leading-tight">
                    {scholarship.title}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium text-white ${getFieldBadgeColor(scholarship.field_of_study)}`}>
                      {scholarship.field_of_study || t('scholarshipsPage.modal.anyField')}
                    </span>
                    <span className={`text-white/80 text-sm flex items-center gap-1 ${
                      !canViewSensitive ? 'blur-sm opacity-50' : ''
                    }`}>
                      <Building className="h-4 w-4" />
                      {canViewSensitive
                        ? (scholarship.universities?.name || t('scholarshipsPage.modal.universityInfoAvailable'))
                        : t('scholarshipsPage.modal.universityHidden')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-16rem)]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Financial Overview - Destacado */}
                  <div className="bg-white rounded-2xl p-6 border-2 border-[#05294E]/20 shadow-sm">
                    <h3 className="text-xl font-bold text-[#05294E] mb-6 flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      {t('scholarshipsPage.modal.financialBreakdown')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-600 font-medium">{t('scholarshipsPage.modal.originalAnnualCost')}</span>
                          <span className="font-bold text-xl text-slate-900">
                            ${formatAmount(scholarship.original_annual_value)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl border border-green-200">
                          <span className="text-slate-600 font-medium">{t('scholarshipsPage.modal.withScholarship')}</span>
                          <span className="font-bold text-xl text-green-700">
                            ${formatAmount(scholarship.annual_value_with_scholarship)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-[#05294E] text-white rounded-xl">
                          <span className="font-medium">{t('scholarshipsPage.modal.annualSavings')}</span>
                          <span className="font-bold text-xl">
                            ${formatAmount((scholarship.original_annual_value || 0) - (scholarship.annual_value_with_scholarship || 0))}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-600 font-medium">{t('scholarshipsPage.modal.costPerCredit')}</span>
                          <span className="font-bold text-lg text-slate-900">
                            ${formatAmount(scholarship.original_value_per_credit)}
                          </span>
                        </div>
                        {scholarship.total_credits && (
                          <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="text-slate-600 font-medium">{t('scholarshipsPage.modal.totalCredits')}</span>
                            <span className="font-bold text-lg text-slate-900">
                              {scholarship.total_credits}
                            </span>
                          </div>
                        )}
                        {scholarship.scholarship_percentage && (
                          <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <span className="text-slate-600 font-medium">{t('scholarshipsPage.modal.coverage')}</span>
                            <span className="font-bold text-xl text-blue-700">
                              {scholarship.scholarship_percentage}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Application Fee Information */}
                    <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-purple-600" />
                          <span className="text-slate-600 font-medium">{t('scholarshipsPage.scholarshipCard.applicationFee')}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-purple-600 text-lg">
                            ${scholarship.application_fee_amount 
                              ? getApplicationFeeWithDependents(Number(scholarship.application_fee_amount)).toFixed(2) 
                              : getApplicationFeeWithDependents(350).toFixed(2)}
                          </span>
                          <div className="text-xs text-slate-400">
                            {scholarship.application_fee_amount && Number(scholarship.application_fee_amount) !== 350 ? 
                              t('scholarshipsPage.scholarshipCard.customFee') : 
                              t('scholarshipsPage.scholarshipCard.standardFee')
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Program Details */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-slate-600" />
                      {t('scholarshipsPage.modal.programInformation')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2 mb-2">
                            <GraduationCap className="h-4 w-4 text-slate-600" />
                            <span className="font-semibold text-slate-700">{t('scholarshipsPage.modal.academicLevel')}</span>
                          </div>
                          <span className="text-slate-900 capitalize">{scholarship.level || t('scholarshipsPage.modal.notSpecified')}</span>
                        </div>
                        
                        {scholarship.delivery_mode && (
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                              {getCourseModalityIcon(scholarship.delivery_mode)}
                              <span className="font-semibold text-slate-700">{t('scholarshipsPage.modal.studyMode')}</span>
                            </div>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getCourseModalityColor(scholarship.delivery_mode)}`}>
                              {scholarship.delivery_mode === 'online' ? t('scholarshipsPage.modal.onlineLearning') : 
                               scholarship.delivery_mode === 'in_person' ? t('scholarshipsPage.modal.inPerson') : 
                               scholarship.delivery_mode === 'hybrid' ? t('scholarshipsPage.modal.hybridMode') : scholarship.delivery_mode}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {scholarship.duration && (
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-slate-600" />
                              <span className="font-semibold text-slate-700">{t('scholarshipsPage.modal.programDuration')}</span>
                            </div>
                            <span className="text-slate-900">{scholarship.duration}</span>
                          </div>
                        )}

                        {scholarship.language && (
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Globe className="h-4 w-4 text-slate-600" />
                              <span className="font-semibold text-slate-700">{t('scholarshipsPage.modal.language')}</span>
                            </div>
                            <span className="text-slate-900">{scholarship.language}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Work Permissions - Se disponível */}
                  {scholarship.work_permissions && scholarship.work_permissions.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 border-2 border-green-200 shadow-sm">
                      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-green-600" />
                        {t('scholarshipsPage.modal.workAuthorization')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {scholarship.work_permissions.map((permission: string, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-center p-4 bg-green-50 rounded-xl border border-green-200"
                          >
                            <span className="font-semibold text-green-700 text-center">
                              {permission}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {scholarship.description && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-slate-600" />
                        {t('scholarshipsPage.modal.programDescription')}
                      </h3>
                      <div className="prose prose-slate max-w-none">
                        <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                          {scholarship.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Inactive Scholarship Warning */}
                  {(!scholarship.is_active || is3800ScholarshipBlocked(scholarship)) && (
                    <div className="p-6 rounded-2xl border-2 border-red-200 bg-red-50">
                      <div className="flex items-center gap-3 mb-3">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                        <span className="font-bold text-lg text-red-600">
                          {t('scholarshipsPage.modal.scholarshipExpired')}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-red-700 font-semibold">
                          {t('scholarshipsPage.modal.noLongerAccepting')}
                        </p>
                        <p className="text-red-600 text-sm">
                          {t('scholarshipsPage.modal.canStillView')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Deadline Status */}
                  {scholarship.is_active && (
                    <div className={`p-6 rounded-2xl border-2 ${deadlineInfo.bg}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <DeadlineIcon className={`h-6 w-6 ${deadlineInfo.color}`} />
                        <span className={`font-bold text-lg ${deadlineInfo.color}`}>
                          {t('scholarshipsPage.modal.applicationDeadline')}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {/* Timer para bolsas de $3800, ou dias restantes para outras */}
                        {is3800Scholarship(scholarship) ? (
                          <div className="flex items-center gap-2">
                            <ScholarshipCountdownTimer 
                              scholarship={scholarship} 
                              className="text-sm px-4 py-2"
                            />
                          </div>
                        ) : (
                          <p className="text-2xl font-bold text-slate-900">
                            {getDaysUntilDeadline(scholarship.deadline)} {t('scholarshipsPage.modal.daysLeft')}
                          </p>
                        )}
                        <p className="text-slate-700">
                          {t('scholarshipsPage.modal.deadline')} {(() => {
                            // Parse da data como local para evitar problemas de timezone
                            const [year, month, day] = scholarship.deadline.split('-').map(Number);
                            const deadlineDate = new Date(year, month - 1, day);
                            return deadlineDate.toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            });
                          })()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* University Info */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Building className="h-5 w-5 text-slate-600" />
                      {t('scholarshipsPage.modal.universityInformation')}
                    </h4>
                    {!canViewSensitive ? (
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <p className="text-blue-800 text-sm">
                          {!user ? t('scholarshipsPage.modal.loginRequired') : t('scholarshipsPage.modal.universityDetailsLocked')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="font-semibold text-slate-900">
                          {scholarship.universities?.name || t('scholarshipsPage.modal.universityNameAvailable')}
                        </p>
                        {scholarship.universities?.location && (
                          <p className="text-slate-600 flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {scholarship.universities.location}
                          </p>
                        )}
                        {scholarship.universities?.ranking && (
                          <p className="text-slate-600 flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            {t('scholarshipsPage.modal.ranking')} #{scholarship.universities.ranking}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Overlay de bloqueio para usuários não logados ou não pagos */}
                    {!canViewSensitive && (
                      <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                        <div className="text-center p-6">
                          <Building className="h-10 w-10 mx-auto mb-3 text-slate-400" />
                          <p className="text-base font-semibold text-slate-700 mb-1">
                            {t('scholarshipsPage.modal.unlockUniversityInfo')}
                          </p>
                          <p className="text-sm text-slate-500">
                            {!user ? t('scholarshipsPage.modal.loginRequired') : t('scholarshipsPage.modal.universityDetailsLocked')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional Requirements */}
                  {scholarship.requirements && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Target className="h-5 w-5 text-slate-600" />
                        {t('scholarshipsPage.modal.requirements')}
                      </h4>
                      <div className="space-y-3">
                        {Array.isArray(scholarship.requirements) ? (
                          scholarship.requirements.map((requirement: string, index: number) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="flex-shrink-0 w-2 h-2 bg-slate-400 rounded-full mt-2"></div>
                              <span className="text-slate-700 text-sm leading-relaxed">
                                {requirement}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                            {scholarship.requirements}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Additional Benefits */}
                  {scholarship.benefits && (
                    <div className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-sm">
                      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Award className="h-5 w-5 text-blue-600" />
                        {t('scholarshipsPage.modal.additionalBenefits')}
                      </h4>
                      <div className="space-y-3">
                        {Array.isArray(scholarship.benefits) ? (
                          scholarship.benefits.map((benefit: string, index: number) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                              <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                              <span className="text-blue-700 text-sm leading-relaxed">
                                {benefit}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                            {scholarship.benefits}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
