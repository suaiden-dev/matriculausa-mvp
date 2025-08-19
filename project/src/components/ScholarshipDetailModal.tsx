import React from 'react';
import { createPortal } from 'react-dom';
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
  BookOpen,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScholarshipDetailModalProps {
  scholarship: any;
  isOpen: boolean;
  onClose: () => void;
  userProfile?: any;
}

const ScholarshipDetailModal: React.FC<ScholarshipDetailModalProps> = ({
  scholarship,
  isOpen,
  onClose,
  userProfile
}) => {
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

  const getDeliveryModeIcon = (mode: string) => {
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

  const getDeliveryModeColor = (mode: string) => {
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
    const today = new Date();
    const deadlineDate = new Date(deadline);
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
                {scholarship.image_url && userProfile?.has_paid_selection_process_fee ? (
                  <img
                    src={scholarship.image_url}
                    alt={scholarship.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center">
                    <GraduationCap className="h-24 w-24 text-white/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 bg-white text-black p-2 rounded-full border border-gray-300 shadow-md hover:bg-gray-100 transition-all duration-200"
                >
                  <X className="h-6 w-6" />
                </button>

                {/* Exclusive Badge */}
                {scholarship.is_exclusive && (
                  <div className="absolute top-4 left-4">
                    <span className="bg-[#D0151C] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Exclusive Scholarship
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
                      {scholarship.field_of_study || 'Any Field'}
                    </span>
                    <span className="text-white/80 text-sm flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      {userProfile?.has_paid_selection_process_fee
                        ? (scholarship.universities?.name || 'University Information Available')
                        : 'University Hidden - Unlock with Selection Process'}
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
                      Financial Breakdown
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-600 font-medium">Original Annual Cost</span>
                          <span className="font-bold text-xl text-slate-900">
                            ${formatAmount(scholarship.original_annual_value)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl border border-green-200">
                          <span className="text-slate-600 font-medium">With Scholarship</span>
                          <span className="font-bold text-xl text-green-700">
                            ${formatAmount(scholarship.annual_value_with_scholarship)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-[#05294E] text-white rounded-xl">
                          <span className="font-medium">Annual Savings</span>
                          <span className="font-bold text-xl">
                            ${formatAmount((scholarship.original_annual_value || 0) - (scholarship.annual_value_with_scholarship || 0))}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-600 font-medium">Cost Per Credit</span>
                          <span className="font-bold text-lg text-slate-900">
                            ${formatAmount(scholarship.original_value_per_credit)}
                          </span>
                        </div>
                        {scholarship.total_credits && (
                          <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="text-slate-600 font-medium">Total Credits</span>
                            <span className="font-bold text-lg text-slate-900">
                              {scholarship.total_credits}
                            </span>
                          </div>
                        )}
                        {scholarship.scholarship_percentage && (
                          <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <span className="text-slate-600 font-medium">Coverage</span>
                            <span className="font-bold text-xl text-blue-700">
                              {scholarship.scholarship_percentage}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Program Details */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-slate-600" />
                      Program Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2 mb-2">
                            <GraduationCap className="h-4 w-4 text-slate-600" />
                            <span className="font-semibold text-slate-700">Academic Level</span>
                          </div>
                          <span className="text-slate-900 capitalize">{scholarship.level || 'Not specified'}</span>
                        </div>
                        
                        {scholarship.delivery_mode && (
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                              {getDeliveryModeIcon(scholarship.delivery_mode)}
                              <span className="font-semibold text-slate-700">Study Mode</span>
                            </div>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getDeliveryModeColor(scholarship.delivery_mode)}`}>
                              {scholarship.delivery_mode === 'online' ? 'Online Learning' : 
                               scholarship.delivery_mode === 'in_person' ? 'On Campus' : 
                               scholarship.delivery_mode === 'hybrid' ? 'Hybrid Mode' : scholarship.delivery_mode}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {scholarship.duration && (
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-slate-600" />
                              <span className="font-semibold text-slate-700">Program Duration</span>
                            </div>
                            <span className="text-slate-900">{scholarship.duration}</span>
                          </div>
                        )}

                        {scholarship.language && (
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Globe className="h-4 w-4 text-slate-600" />
                              <span className="font-semibold text-slate-700">Language</span>
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
                        Work Authorization
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
                        Program Description
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
                  {/* Deadline Status */}
                  <div className={`p-6 rounded-2xl border-2 ${deadlineInfo.bg}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <DeadlineIcon className={`h-6 w-6 ${deadlineInfo.color}`} />
                      <span className={`font-bold text-lg ${deadlineInfo.color}`}>
                        Application Deadline
                      </span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-2xl font-bold text-slate-900">
                        {getDaysUntilDeadline(scholarship.deadline)} days left
                      </p>
                      <p className="text-slate-700">
                        Deadline: {new Date(scholarship.deadline).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* University Info */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Building className="h-5 w-5 text-slate-600" />
                      University Information
                    </h4>
                    {userProfile?.has_paid_selection_process_fee ? (
                      <div className="space-y-3">
                        <p className="font-semibold text-slate-900">
                          {scholarship.universities?.name || 'University Name Available'}
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
                            Ranking: #{scholarship.universities.ranking}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <p className="text-blue-800 text-sm">
                          🔒 University details available after Selection Process payment.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Additional Requirements */}
                  {scholarship.requirements && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Target className="h-5 w-5 text-slate-600" />
                        Requirements
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
                        Additional Benefits
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
