import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, AlertTriangle, Building, Star, MapPin, 
  Award, Calendar, GraduationCap, Monitor, Clock, 
  Globe, CheckCircle, ExternalLink, Lock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useScholarship } from '../hooks/useScholarship';
import { useScholarships } from '../hooks/useScholarships';
import { is3800Scholarship, is3800ScholarshipBlocked } from '../utils/scholarshipDeadlineValidation';
import { getPlacementFee } from '../utils/placementFeeCalculator';
import { formatCurrency } from '../utils/currency';
import { ScholarshipCountdownTimer } from '../components/ScholarshipCountdownTimer';
import SmartChat from '../components/SmartChat';

const ScholarshipDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation(['scholarships', 'common', 'school', 'dashboard']);
  const { user, userProfile, isAuthenticated } = useAuth();

  const getLevelLabel = (lvl: string) => {
    switch (lvl?.toLowerCase()) {
      case 'undergraduate':
        return t('scholarshipsPage.filters.levels.undergraduate', 'Graduação');
      case 'graduate':
        return t('scholarshipsPage.filters.levels.graduate', 'Pós-Graduação');
      case 'doctorate':
        return t('scholarshipsPage.filters.levels.doctorate', 'Doutorado');
      default:
        return lvl;
    }
  };

  const getDeliveryModeLabel = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'in_person':
        return t('scholarshipsPage.detail.inPersonUS', 'Presencial (Estados Unidos)');
      case 'online':
        return t('scholarshipsPage.filters.courseModalities.online', 'Online');
      case 'hybrid':
        return t('scholarshipsPage.filters.courseModalities.hybrid', 'Híbrido');
      default:
        return mode;
    }
  };
  const navigate = useNavigate();
  
  const { scholarship: rawScholarship, loading, error } = useScholarship(id);
  const scholarship = rawScholarship as any;
  const { scholarships } = useScholarships();

  // Curadoria inteligente de até 3 bolsas recomendadas
  const recommendedScholarships = React.useMemo(() => {
    if (!scholarships || scholarships.length === 0 || !scholarship) return [];

    const isUorakUser = user?.email?.toLowerCase().endsWith('@uorak.com') || (userProfile as any)?.email?.toLowerCase().endsWith('@uorak.com');
    const isAdmin = user?.role === 'admin' || user?.role === 'post_sales';

    return scholarships
      .filter((s) => {
        // Excluir a bolsa atual
        if (s.id === scholarship.id) return false;
        // Somente bolsas ativas
        if (!s.is_active) return false;
        // Excluir bolsas de teste (is_test) se não for admin/uorak
        if (s.is_test && !isUorakUser && !isAdmin) return false;
        return true;
      })
      .map((s) => {
        // Calcular pontuação de relevância de forma inteligente
        let score = 0;
        // Mesma universidade
        if (s.university_id === scholarship.university_id) score += 100;
        // Mesma modalidade (in_person, online, hybrid)
        if (s.delivery_mode === scholarship.delivery_mode) score += 50;
        // Mesmo nível acadêmico (undergraduate, graduate, etc)
        if (s.level === scholarship.level) score += 30;
        // Mesma área de estudos
        if (s.field_of_study === scholarship.field_of_study) score += 20;
        // Bolsa em destaque
        if (s.is_highlighted) score += 10;

        return { scholarship: s, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.scholarship);
  }, [scholarships, scholarship, user, userProfile]);

  const getPageTitle = () => {
    if (loading) return t('scholarshipsPage.filters.loading', 'Carregando...') + ' | Matricula USA';
    if (error || !scholarship) return t('scholarshipsPage.detail.notFoundTitle', 'Bolsa de Estudo Não Localizada') + ' | Matricula USA';
    return `${scholarship.title} - ${scholarship.field_of_study || t('scholarshipsPage.detail.universityFallback', 'Bolsa de Estudos')} | Matricula USA`;
  };

  const getPageDescription = () => {
    if (scholarship?.description) {
      return scholarship.description.substring(0, 160);
    }
    return t('scholarships.subtitle', 'Encontre as melhores bolsas de estudo exclusivas nos Estados Unidos.');
  };

  if (loading) {
    return (
      <div className="bg-[#FAFBFD] min-h-screen font-sans">
        {/* Cover Image Placeholder com mesma altura e botão voltar idêntico */}
        <div className="relative h-[240px] sm:h-[320px] md:h-[380px] lg:h-[460px] w-full overflow-hidden bg-slate-100 animate-pulse">
          {/* Gradiente sutil simulando o esqueleto da capa */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-200/60 via-slate-100 to-slate-200/60" />
          
          {/* Top Navbar com botão voltar flutuante posicionado de forma idêntica */}
          <div className="absolute top-6 left-0 right-0 z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              to="/scholarships"
              className="inline-flex items-center text-[#05294E] hover:text-[#05294E]/90 transition-all duration-300 gap-2 text-xs sm:text-sm font-bold bg-white hover:bg-slate-50 px-4 py-2.5 rounded-2xl border border-white shadow-md active:scale-95 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform text-[#05294E]" />
              {t('common.back', 'Voltar para Listagem')}
            </Link>
          </div>
        </div>
        
        {/* Grid de Conteúdo Principal (Skeleton) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-10 pb-24 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Coluna da Esquerda (2/3) - Detalhes */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-[2rem] border border-slate-100/80 shadow-[0_20px_50px_rgba(8,112,184,0.05)] overflow-hidden p-6 sm:p-8 space-y-6">
                <div className="space-y-4 animate-pulse">
                  {/* Badges placeholder */}
                  <div className="flex gap-2">
                    <div className="h-5 bg-slate-200 rounded-full w-20" />
                    <div className="h-5 bg-slate-200 rounded-full w-24" />
                  </div>
                  
                  {/* Título principal placeholder */}
                  <div className="h-10 bg-slate-200 rounded-2xl w-3/4 sm:w-2/3" />
                  
                  {/* Subtítulo placeholder */}
                  <div className="h-5 bg-slate-200 rounded-xl w-1/3" />
                  
                  {/* Card de Universidade Parceira placeholder */}
                  <div className="mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-100/60 flex items-center gap-4 max-w-sm">
                    <div className="w-16 h-16 rounded-xl bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                      <div className="h-5 bg-slate-200 rounded w-3/4" />
                    </div>
                  </div>
                </div>
                
                {/* Sobre a oportunidade placeholder */}
                <div className="pt-8 border-t border-slate-100/80 space-y-4 animate-pulse">
                  <div className="h-6 bg-slate-200 rounded-lg w-1/4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-full" />
                    <div className="h-4 bg-slate-200 rounded w-full" />
                    <div className="h-4 bg-slate-200 rounded w-5/6" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Coluna da Direita (1/3) - Widget Conversão */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 space-y-6">
                <div className="space-y-4 animate-pulse">
                  {/* Detalhes de custos e economias */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100/60 space-y-4">
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-1/3" />
                      <div className="h-8 bg-slate-200 rounded-xl w-1/2" />
                    </div>
                    <div className="pt-3 border-t border-slate-200/60 space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                      <div className="h-10 bg-slate-200 rounded-xl w-2/3" />
                    </div>
                  </div>
                  
                  {/* Botão de Candidatura */}
                  <div className="h-14 bg-slate-200 rounded-2xl w-full" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  if (error || !scholarship) {
    return (
      <div className="bg-slate-50 min-h-screen flex flex-col justify-center items-center px-4 py-12">
        <div className="bg-white rounded-3xl border border-red-200 shadow-2xl p-8 text-center max-w-lg w-full">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">
            {t('scholarshipsPage.detail.notFoundTitle', 'Bolsa de Estudo Não Localizada')}
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {t('scholarshipsPage.detail.notFoundDescription', 'Não conseguimos encontrar os detalhes desta bolsa de estudos no momento. Isso pode ocorrer caso o link esteja desatualizado ou a bolsa não esteja mais ativa.')}
          </p>
          <Link
            to="/scholarships"
            className="inline-flex items-center justify-center bg-[#05294E] hover:bg-[#05294E]/90 text-white font-bold text-sm px-6 py-3.5 rounded-2xl shadow-lg transition-all active:scale-95"
          >
            {t('scholarshipsPage.detail.backToListing', 'Voltar para a Listagem')}
          </Link>
        </div>
      </div>
    );
  }

  // Trava de segurança para bolsas de teste (is_test)
  const isUorakUser = user?.email?.toLowerCase().endsWith('@uorak.com') || (userProfile as any)?.email?.toLowerCase().endsWith('@uorak.com');
  const isAdmin = user?.role === 'admin' || user?.role === 'post_sales';
  
  if (scholarship?.is_test && !isUorakUser && !isAdmin) {
    return (
      <div className="bg-slate-50 min-h-screen flex flex-col justify-center items-center px-4 py-12">
        <div className="bg-white rounded-3xl border border-red-200 shadow-2xl p-8 text-center max-w-lg w-full">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-red-800 mb-2">
            {t('scholarshipsPage.detail.restrictedTitle', 'Bolsa Restrita')}
          </h3>
          <p className="text-sm text-red-600 mb-6">
            {t('scholarshipsPage.detail.restrictedDescription', 'Esta é uma bolsa de testes reservada para administradores e auditores credenciados.')}
          </p>
          <Link to="/scholarships" className="inline-flex items-center justify-center bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold text-sm">
            {t('scholarshipsPage.detail.back', 'Voltar')}
          </Link>
        </div>
      </div>
    );
  }

  // Regra de privacidade de visualização
  const canViewSensitive = isAuthenticated && (
    user?.role !== 'student' || 
    (userProfile as any)?.has_paid_selection_process_fee ||
    (userProfile as any)?.has_paid_application_fee
  );

  const getApplicationFeeWithDependents = (base: number): number => {
    const deps = Number(userProfile?.dependents) || 0;
    return deps > 0 ? base + deps * 100 : base;
  };

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

  // Custos e Economias
  const annualSavings = (scholarship.original_annual_value || 0) - (scholarship.annual_value_with_scholarship || 0);
  const applicationFee = scholarship.application_fee_amount 
    ? getApplicationFeeWithDependents(Number(scholarship.application_fee_amount)) 
    : getApplicationFeeWithDependents(350);

  const deadlineFormatted = (() => {
    const [year, month, day] = scholarship.deadline.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const currentLang = i18n.language;
    const locale = currentLang === 'pt' ? 'pt-BR' : currentLang === 'es' ? 'es-ES' : 'en-US';
    return date.toLocaleDateString(locale, {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  })();

  const processType = userProfile?.student_process_type;
  const visaTransferActive = userProfile?.visa_transfer_active;

  // Taxas Internas
  let internalFeesData = scholarship.internal_fees;
  if (typeof internalFeesData === 'string') {
    try {
      internalFeesData = JSON.parse(internalFeesData);
    } catch (e) {
      internalFeesData = [];
    }
  }
  const baseInternalFees = Array.isArray(internalFeesData) ? internalFeesData : [];

  const internalFees = baseInternalFees;
  const canViewInternalFees = internalFees.length > 0;

  // Helper render functions to build responsive layouts modularly and avoid duplication
  const renderTitleAndSubtitle = () => (
    <div className="space-y-3.5 text-left flex-1">
      <div className="flex flex-wrap gap-2">
        {scholarship.is_exclusive && (
          <span className="inline-flex items-center gap-1 bg-amber-500 text-white px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest shadow-md">
            <Star className="h-3 w-3 fill-white" />
            {t('scholarshipsPage.modal.exclusive', 'Exclusiva') || 'Exclusiva'}
          </span>
        )}
        {isExpired && (
          <span className="inline-flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest shadow-md">
            <AlertTriangle className="h-3 w-3" />
            {t('scholarshipsPage.modal.expired', 'Expirada') || 'Expirada'}
          </span>
        )}
        {scholarship.scholarship_percentage && (
          <span className="inline-flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest shadow-md">
            <Award className="h-3 w-3" />
            {scholarship.scholarship_percentage}% OFF
          </span>
        )}
      </div>

      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-['Montserrat',sans-serif] tracking-tight leading-tight text-slate-900">
        {scholarship.title}
      </h1>

      <p className="text-slate-500 text-sm sm:text-base font-semibold tracking-wide">
        {scholarship.field_of_study || t('scholarshipsPage.modal.anyField')}
      </p>
    </div>
  );

  const renderUniversityCard = () => (
    <div className="lg:max-w-[360px] w-full flex-shrink-0">
      <div className="inline-flex items-center gap-4 bg-slate-50 border border-slate-100/60 p-5 rounded-2xl w-full">
        <div className="w-16 h-16 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100 overflow-hidden flex-shrink-0 relative">
          {scholarship.universities?.logo_url ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img 
                src={canViewSensitive ? scholarship.universities.logo_url : "https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/universities-logo/University_lock_icon.webp"} 
                alt={canViewSensitive ? (scholarship.universities.name || "University Logo") : "University Logo"} 
                className={`w-full h-full object-contain p-1.5 transition-all duration-500 ${!canViewSensitive ? 'blur-[4px] opacity-40' : ''}`} 
              />
              {!canViewSensitive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-slate-700" />
                </div>
              )}
            </div>
          ) : (
            <Building className={`h-8 w-8 text-slate-400 ${!canViewSensitive ? 'blur-[2px]' : ''}`} />
          )}
        </div>
        <div className="flex flex-col text-left min-w-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">
            {t('scholarshipsPage.detail.partnerUniversity')}
          </span>
          <span className={`text-base sm:text-lg font-black tracking-tight truncate leading-tight ${!canViewSensitive ? 'blur-sm text-slate-300' : 'text-slate-800'}`}>
            {canViewSensitive ? (scholarship.universities?.name || scholarship.university_name) : '••••••••••••'}
          </span>
          {canViewSensitive && scholarship.universities?.location && (
            <span className="text-sm text-slate-500 font-semibold mt-1 flex items-center gap-1.5 truncate">
              <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0" />
              {scholarship.universities.location}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const renderPriceElement = () => (
    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100/60 text-left space-y-4">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
          {t('scholarshipsPage.detail.regularAnnualCost', 'Investimento Anual (Sem Bolsa)')}
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-slate-400 line-through decoration-red-400/80">${formatAmount(scholarship.original_annual_value)}</span>
          <span className="text-xs font-medium text-slate-400">{t('scholarshipsPage.detail.perYear', '/ano')}</span>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200/60">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#05294E] block mb-1">
          {t('scholarshipsPage.detail.exclusiveScholarshipPrice', 'Investimento com Bolsa Exclusiva')}
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl sm:text-4xl font-black text-green-700">${formatAmount(scholarship.annual_value_with_scholarship)}</span>
          <span className="text-xs font-bold text-slate-500">{t('scholarshipsPage.detail.perYear', '/ano')}</span>
        </div>
      </div>

      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-700 rounded-lg text-[11px] font-bold uppercase tracking-widest">
          {t('scholarshipsPage.detail.annualSavingsBadge', { amount: formatAmount(annualSavings), defaultValue: `Economia de $${formatAmount(annualSavings)}/ano` })}
        </span>
      </div>

      <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
        <span className="font-bold text-slate-500 flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-amber-500 flex-shrink-0" />
          {t('scholarshipsPage.detail.applicationDeadline', 'Prazo de Inscrição')}
        </span>
        {is3800Scholarship(scholarship) ? (
          <ScholarshipCountdownTimer scholarship={scholarship} className="text-xs font-black text-slate-800" />
        ) : (
          <span className={`font-black ${daysLeft <= 7 ? 'text-red-600' : 'text-slate-800'}`}>
            {daysLeft > 0 
              ? t('scholarshipsPage.detail.daysLeft', { count: daysLeft, defaultValue: `${daysLeft} dias restantes` }) 
              : t('scholarshipsPage.detail.expired', 'Expirada')}
          </span>
        )}
      </div>
    </div>
  );

  const renderDescription = () => (
    <div className="p-6 sm:p-8 space-y-4 text-left">
      <h3 className="text-lg font-black text-slate-900 tracking-tight">
        {t('scholarshipsPage.modal.programDescription', 'Sobre a Oportunidade Acadêmica')}
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/50 p-5 rounded-2xl border border-slate-100 font-medium">
        {scholarship.description}
      </p>
    </div>
  );

  const renderAcademicSpecsAndEligibility = () => (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden divide-y divide-slate-100 text-left">
      {/* Especificações do Programa */}
      <div className="p-5 space-y-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-[#05294E] flex items-center gap-1.5 pb-1">
          {t('scholarshipsPage.detail.programSpecs', 'Especificações do Programa')}
        </h4>

        <div className="space-y-3.5 text-sm">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
              {t('scholarshipsPage.detail.academicLevel', 'Nível Acadêmico')}
            </span>
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <GraduationCap className="h-4 w-4 text-[#05294E]" />
              <span className="capitalize">{getLevelLabel(scholarship.level) || 'N/A'}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
              {t('scholarshipsPage.detail.studyMode', 'Modalidade de Estudo')}
            </span>
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <Monitor className="h-4 w-4 text-[#05294E]" />
              <span className="capitalize">
                {getDeliveryModeLabel(scholarship.delivery_mode)}
              </span>
            </div>
          </div>

          {scholarship.duration && (
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                {t('scholarshipsPage.detail.estimatedDuration', 'Duração Estimada')}
              </span>
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <Clock className="h-4 w-4 text-[#05294E]" />
                <span>{scholarship.duration}</span>
              </div>
            </div>
          )}

          {scholarship.language && (
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                {t('scholarshipsPage.detail.officialLanguage', 'Idioma Oficial')}
              </span>
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <Globe className="h-4 w-4 text-[#05294E]" />
                <span>{scholarship.language}</span>
              </div>
            </div>
          )}

          {scholarship.work_permissions && scholarship.work_permissions.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                {t('scholarshipsPage.detail.workPermission', 'Permissão de Trabalho')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {scholarship.work_permissions.map((perm: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pré-Requisitos e Elegibilidade */}
      {(scholarship.min_gpa || scholarship.min_english_proficiency || scholarship.requirements) && (
        <div className="p-5 space-y-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#05294E] pb-1">
            {t('scholarshipsPage.detail.prerequisites', 'Pré-Requisitos e Elegibilidade')}
          </h4>

          <div className="space-y-3 text-sm">
            {scholarship.min_gpa && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                  {t('scholarshipsPage.detail.minGPA', 'GPA Mínimo Acadêmico')}
                </span>
                <span className="font-bold text-slate-700">{Number(scholarship.min_gpa).toFixed(1)} / 4.0</span>
              </div>
            )}

            {scholarship.min_english_proficiency && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                  {t('scholarshipsPage.detail.englishProficiency', 'Proficiência em Inglês')}
                </span>
                <span className="font-bold text-slate-700">
                  {t(`dashboard:profileManagement.form.fields.${scholarship.min_english_proficiency}`, { defaultValue: scholarship.min_english_proficiency })}
                </span>
              </div>
            )}

            {scholarship.requirements && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  {t('scholarshipsPage.detail.academicRequirements', 'Exigências Acadêmicas')}
                </span>
                <ul className="space-y-2 text-xs text-slate-600 font-medium">
                  {Array.isArray(scholarship.requirements) ? (
                    scholarship.requirements.map((req: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <div className="w-1.5 h-1.5 bg-[#05294E] rounded-full mt-1.5 flex-shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))
                  ) : (
                    <li className="whitespace-pre-line leading-relaxed">{scholarship.requirements}</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderFinancialBreakdown = () => (
    <div className="p-6 sm:p-8 space-y-6 text-left">
      <div>
        <h3 className="text-lg font-black text-slate-900 tracking-tight">
          {t('scholarshipsPage.modal.financialBreakdown', 'Taxas internas da plataforma')}
        </h3>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs uppercase font-bold tracking-widest text-slate-400">
          {t('scholarshipsPage.detail.academicEnrollmentCosts', 'Investimentos de Inscrição Acadêmica')}
        </h4>
        {/* Application Fee */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/60">
          <div className="flex items-start gap-2.5 max-w-[75%]">
            <div className="w-1.5 h-1.5 bg-[#05294E] rounded-full mt-2 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800">
                {t('scholarshipsPage.scholarshipCard.applicationFee', 'Taxa de Matrícula (Application Fee)')}
              </span>
            </div>
          </div>
          <span className="text-lg font-bold text-slate-900">${applicationFee.toFixed(0)}</span>
        </div>

        {/* Placement Fee */}
        {(() => {
          const annualValue = scholarship.annual_value_with_scholarship ? Number(scholarship.annual_value_with_scholarship) : Number(scholarship.amount) || 0;
          const placementFeeAmount = scholarship.placement_fee_amount ? Number(scholarship.placement_fee_amount) : null;
          const placementFeeValue = getPlacementFee(annualValue, placementFeeAmount);
          return (
            <div className="p-4 bg-blue-50/20 rounded-2xl border border-blue-100/50 flex items-center justify-between">
              <div className="flex items-start gap-2.5 max-w-[75%]">
                <div className="w-1.5 h-1.5 bg-[#05294E] rounded-full mt-2 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800">
                    {t('scholarshipsPage.detail.placementFeeLabel', 'Placement Fee')}
                  </span>
                </div>
              </div>
              <span className="text-lg font-bold text-slate-800">{formatCurrency(placementFeeValue)}</span>
            </div>
          );
        })()}

        {/* Control Fee */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/60">
          <div className="flex items-start gap-2.5 max-w-[75%]">
            <div className="w-1.5 h-1.5 bg-[#05294E] rounded-full mt-2 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800">
                Control Fee
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                {t('scholarshipsPage.detail.controlFeeDetail', 'Taxa necessária para estudantes que solicitam o visto do tipo Initial/Mudança de Status (COS)')}
              </span>
            </div>
          </div>
          <span className="text-lg font-bold text-slate-900">$1,800</span>
        </div>

        {/* Reinstatement Fee */}
        {(!processType || (processType === 'transfer' && visaTransferActive === false)) && (
          <div className="p-4 bg-red-50/10 rounded-2xl border border-red-100/30 flex items-center justify-between">
            <div className="flex items-start gap-2.5 max-w-[75%]">
              <div className="w-1.5 h-1.5 bg-[#05294E] rounded-full mt-2 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">
                  Reinstatement Fee
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  {t('scholarshipsPage.modal.reinstatementPackageDescription', 'Taxa para processamento de reativação de visto F-1 irregular')}
                </span>
              </div>
            </div>
            <span className="text-lg font-bold text-slate-800">$500</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderInternalFees = () => (
    <div className="p-6 sm:p-8 space-y-6 text-left">
      <div>
        <h3 className="text-lg font-black text-slate-900 tracking-tight">
          {t('scholarshipsPage.modal.internalFeesTitle', 'Taxas Internas Acadêmicas & Operacionais')}
        </h3>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          {t('scholarshipsPage.detail.internalFeesDescription', 'Algumas taxas são pagas diretamente à universidade, enquanto outras são processadas por meio da nossa plataforma.')}
        </p>
        {canViewSensitive && scholarship.universities?.university_fees_page_url && (
          <div className="mt-2.5">
            <a 
              href={scholarship.universities.university_fees_page_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              {t('scholarshipsPage.modal.viewUniversityFeesPage', 'Ver link oficial de custos da universidade')}
            </a>
          </div>
        )}
      </div>

      <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
        {internalFees.map((fee: any, idx: number) => (
          <div key={`internal-${idx}`} className="p-4 flex items-start justify-between gap-4 bg-white/50 hover:bg-white transition-colors duration-200">
            <div className="flex items-start gap-2.5 max-w-[75%]">
              <div className="w-1.5 h-1.5 bg-[#05294E] rounded-full mt-2 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">{fee.category || fee.name}</span>
                {fee.details && (
                  <span className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {(() => {
                      const standardKeys: Record<string, string> = {
                        'One-time': 'scholarshipsPage.frequencies.oneTime',
                        'Per Semester': 'scholarshipsPage.frequencies.perSemester',
                        'Per Year': 'scholarshipsPage.frequencies.perYear',
                        'Per Credit': 'scholarshipsPage.frequencies.perCredit',
                        'Per Course': 'scholarshipsPage.frequencies.perCourse',
                        'Monthly': 'scholarshipsPage.frequencies.monthly'
                      };
                      const key = standardKeys[fee.details.trim()];
                      return key ? t(key, fee.details) : fee.details;
                    })()}
                  </span>
                )}
              </div>
            </div>
            <span className="text-lg font-bold text-slate-900">${Number(fee.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBenefits = () => {
    if (!(scholarship.benefits && (Array.isArray(scholarship.benefits) ? scholarship.benefits.length > 0 : !!scholarship.benefits))) return null;
    return (
      <div className="p-6 sm:p-8 space-y-4 text-left">
        <h3 className="text-lg font-black text-slate-900 tracking-tight">
          {t('scholarshipsPage.modal.additionalBenefits', 'Benefícios Inclusos na Bolsa')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {Array.isArray(scholarship.benefits) ? (
            scholarship.benefits.map((benefit: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2.5 p-3 bg-emerald-50/30 border border-emerald-100/50 rounded-2xl">
                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-700 leading-snug">{benefit}</span>
              </div>
            ))
          ) : (
            <div className="whitespace-pre-line text-sm text-slate-600 leading-relaxed md:col-span-2 bg-slate-50 p-4 rounded-2xl">
              {scholarship.benefits}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderApplyButtons = () => (
    <div className="pt-4 border-t border-slate-100 space-y-3">
      {isExpired ? (
        <button
          disabled
          className="w-full bg-slate-400 text-white py-4 px-4 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center cursor-not-allowed opacity-60"
        >
          {t('scholarshipsPage.detail.applicationsClosed', 'Inscrições Encerradas')}
        </button>
      ) : (!isAuthenticated) ? (
        <button
          onClick={() => navigate('/selection-fee-registration')}
          className="w-full bg-gradient-to-r from-[#05294E] to-[#093766] hover:from-[#041f3a] hover:to-[#05294E] text-white py-4 px-4 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all duration-300 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          {t('scholarshipsPage.detail.applyNowLogin', 'Candidatar-se Agora')}
        </button>
      ) : (
        <button
          onClick={() => navigate('/student/onboarding')}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white py-4 px-4 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all duration-300 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          {t('scholarshipsPage.detail.fillApplication', 'Candidatar-se')}
        </button>
      )}
    </div>
  );

  return (
    <div key={id} className="bg-[#FAFBFD] min-h-screen font-sans selection:bg-[#05294E] selection:text-white">
      <Helmet>
        <title>{getPageTitle()}</title>
        <meta name="description" content={getPageDescription()} />
        <meta property="og:title" content={getPageTitle()} />
        <meta property="og:description" content={getPageDescription()} />
        {(scholarship.image_url || scholarship.universities?.image_url) && (
          <meta property="og:image" content={scholarship.image_url || scholarship.universities?.image_url} />
        )}
      </Helmet>

      {/* Hero Cover Image (Capa Pura com botão voltar flutuante) */}
      <div className="relative h-[240px] sm:h-[320px] md:h-[380px] lg:h-[460px] w-full overflow-hidden bg-slate-950">
        {/* Background Image (when exists) */}
        {(scholarship.image_url || scholarship.universities?.image_url) ? (
          <>
            <div 
              className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none" 
              style={{
                backgroundImage: `url(${scholarship.image_url || scholarship.universities?.image_url})`
              }} 
            />
            {/* Elegant neutral dark overlay for text readability (attenuated for maximum image clarity) */}
            <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-950/40 via-transparent to-slate-950/10 pointer-events-none" />
          </>
        ) : (
          /* Fallback elegant gradient if no image */
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#05294E] via-[#093766] to-[#041a33] pointer-events-none" />
        )}

        {/* Top Navbar com botão voltar flutuante */}
        <div className="absolute top-6 left-0 right-0 z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/scholarships"
            className="inline-flex items-center text-[#05294E] hover:text-[#05294E]/90 transition-all duration-300 gap-2 text-xs sm:text-sm font-bold bg-white hover:bg-slate-50 px-4 py-2.5 rounded-2xl border border-white shadow-md active:scale-95 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform text-[#05294E]" />
            {t('common.back', 'Voltar para Listagem')}
          </Link>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-10 pb-24 relative z-20">
        
        {/* MOBILE ONLY LAYOUT (< lg) */}
        <div className="lg:hidden space-y-6 mb-6 text-left">
          {/* 1. Titulo, subtitulo e faculdade agrupados de forma padrão */}
          <div className="bg-white rounded-[2rem] border border-slate-100/80 shadow-[0_20px_50px_rgba(8,112,184,0.05)] p-6">
            <div className="flex flex-col gap-6">
              {renderTitleAndSubtitle()}
              {renderUniversityCard()}
            </div>
          </div>
          
          {/* 2. Elemento de preço */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 relative overflow-hidden">
            <div className="space-y-4 text-left">
              {renderPriceElement()}
              {renderApplyButtons()}
            </div>
          </div>
          
          {/* 4. Descrição do programa */}
          {scholarship.description && (
            <div className="bg-white rounded-[2rem] border border-slate-100/80 shadow-[0_20px_50px_rgba(8,112,184,0.05)] overflow-hidden">
              {renderDescription()}
            </div>
          )}
          
          {/* 5. Elemento que tem Program Specifications e Prerequisites & Eligibility */}
          {renderAcademicSpecsAndEligibility()}

          {/* 6. O resto (igual esta agora ou seja abaixo) */}
          <div className="bg-white rounded-[2rem] border border-slate-100/80 shadow-[0_20px_50px_rgba(8,112,184,0.05)] overflow-hidden divide-y divide-slate-100/80">
            {renderFinancialBreakdown()}
            {canViewInternalFees && renderInternalFees()}
            {renderBenefits()}
            <div className="p-6 sm:p-8 text-center bg-slate-50/50">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {t('scholarshipsPage.detail.officialDeadline', 'Prazo de Candidatura Oficial')}
              </span>
              <span className="block text-sm font-black text-slate-700 mt-0.5">{deadlineFormatted}</span>
            </div>
          </div>
        </div>

        {/* DESKTOP LAYOUT (>= lg) */}
        <div className="hidden lg:grid grid-cols-3 gap-8">
          
          {/* Left Column - Detailed Info (2/3 width) - Dossiê Unificado Monumental */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[2rem] border border-slate-100/80 shadow-[0_20px_50px_rgba(8,112,184,0.05)] overflow-hidden divide-y divide-slate-100/80">
              
              {/* Seção 1: Identificação da Oportunidade e Universidade */}
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                  {renderTitleAndSubtitle()}
                  {renderUniversityCard()}
                </div>
              </div>

              {/* Seção 5: Scholarship Program Description */}
              {scholarship.description && renderDescription()}

              {/* Seção 2: Financial Cost Breakdown */}
              {renderFinancialBreakdown()}

              {/* Seção 3: University Internal Fees / Control Fee Block */}
              {canViewInternalFees && renderInternalFees()}

              {/* Seção 4: Benefits & Details */}
              {renderBenefits()}
            </div>
          </div>

          {/* Right Column - Conversion Widget / Quick Specs (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              
              {/* Main Conversion CTA Widget */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 relative overflow-hidden">
                <div className="space-y-4 text-center">
                  {renderPriceElement()}
                  {renderApplyButtons()}
                </div>
              </div>

              {/* Painel Unificado: Detalhes Acadêmicos & Elegibilidade */}
              {renderAcademicSpecsAndEligibility()}

              {/* Deadline Footer */}
              <div className="text-center">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  {t('scholarshipsPage.detail.officialDeadline', 'Prazo de Candidatura Oficial')}
                </span>
                <span className="block text-sm font-black text-slate-700 mt-0.5">{deadlineFormatted}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Seção: Bolsas Recomendadas (Outras Oportunidades) */}
      {recommendedScholarships.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 relative z-20">
          <div className="border-t border-slate-100 pt-16">
            <div className="flex flex-col items-center text-center sm:text-left sm:flex-row sm:items-end justify-between mb-10">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {t('scholarshipsPage.detail.recommendedScholarships', 'Outras Bolsas de Estudo Recomendadas')}
                </h2>
              </div>
              
              <Link
                to="/scholarships"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#05294E] hover:text-[#093766] transition-colors mt-4 sm:mt-0 group"
              >
                {t('scholarshipsPage.detail.viewAllScholarships', 'Ver todas as bolsas')}
                <ArrowLeft className="h-4 w-4 rotate-180 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {recommendedScholarships.map((rec: any) => {
                const recAnnualSavings = (Number(rec.original_annual_value) || 0) - (Number(rec.annual_value_with_scholarship) || 0);
                const recImage = rec.image_url || rec.universities?.image_url;
                
                const getLevelLabel = (lvl: string) => {
                  switch (lvl?.toLowerCase()) {
                    case 'undergraduate':
                      return t('scholarshipsPage.filters.levels.undergraduate', 'Graduação');
                    case 'graduate':
                      return t('scholarshipsPage.filters.levels.graduate', 'Pós-Graduação');
                    case 'doctorate':
                      return t('scholarshipsPage.filters.levels.doctorate', 'Doutorado');
                    default:
                      return lvl;
                  }
                };

                return (
                  <div 
                    key={rec.id}
                    onClick={() => {
                      navigate(`/scholarships/${rec.id}`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group bg-white rounded-[2rem] border border-slate-200 shadow-[0_12px_30px_rgba(0,0,0,0.04)] hover:border-blue-200 hover:shadow-[0_24px_50px_rgba(5,41,78,0.12)] hover:-translate-y-1.5 transition-all duration-500 overflow-hidden cursor-pointer flex flex-col h-full"
                  >
                    {/* Card Header (Cover Image with Course Banner & Matricula Logo) */}
                    <div className="relative h-44 w-full bg-white z-10 overflow-hidden border-b border-slate-100 shrink-0 group">
                      
                      {/* Full Background Image */}
                      <div className="absolute inset-0 z-0">
                        {recImage ? (
                          <img 
                            src={recImage} 
                            alt={rec.title} 
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" 
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full bg-slate-50 text-slate-400">
                            <Building className="h-12 w-12 text-[#05294E]/20" />
                          </div>
                        )}
                      </div>

                      {/* Text Overlay Layer (Left side fade) */}
                      <div className="absolute inset-y-0 left-0 w-[65%] sm:w-[70%] z-10 bg-gradient-to-r from-white via-white/95 to-transparent flex flex-col justify-center pl-4 pr-8">
                        {/* Top Left Logo */}
                        <div className="absolute top-4 left-4">
                          <img 
                            src="/logo.png" 
                            alt="Matricula USA" 
                            className="h-5 w-auto object-contain mb-1.5 drop-shadow-sm" 
                          />
                        </div>
                        
                        {/* Course / Field as Main Banner Text */}
                        <p className="w-[95%] text-sm font-black font-['Montserrat',sans-serif] text-slate-900 line-clamp-3 pt-0.5 mt-8" style={{ lineHeight: 0.95 }}>
                          {rec.field_of_study || t('scholarshipsPage.filters.anyField')}
                        </p>
                      </div>

                      {/* Top Right Badges */}
                      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
                        {rec.is_exclusive && (
                          <div className="bg-amber-500 text-white px-2.5 py-1.5 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1">
                            <Star className="h-3 w-3 fill-white" />
                            {t('common.exclusive', 'Exclusiva')}
                          </div>
                        )}
                      </div>

                      {/* Floating Level/Modal Badges */}
                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-20">
                        <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-800 shadow-sm border border-white/20">
                          {getLevelLabel(rec.level || '')}
                        </span>
                        {rec.scholarship_percentage && (
                          <span className="px-2.5 py-1 bg-green-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm">
                            {rec.scholarship_percentage}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        {/* University details */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="relative w-7 h-7 rounded-md border border-slate-100 bg-white p-0.5 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {rec.universities?.logo_url ? (
                              <img 
                                src={canViewSensitive ? rec.universities.logo_url : "https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/universities-logo/University_lock_icon.webp"} 
                                alt={canViewSensitive ? (rec.universities.name || "University Logo") : "University Logo"} 
                                className={`w-full h-full object-contain transition-all duration-500 ${!canViewSensitive ? 'blur-[3px] opacity-40' : ''}`} 
                              />
                            ) : (
                              <Building className={`w-4 h-4 text-slate-400 ${!canViewSensitive ? 'blur-[1.5px]' : ''}`} />
                            )}
                            {!canViewSensitive && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[0.5px]">
                                <Lock className="h-3 w-3 text-slate-700" />
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[85%]">
                            {canViewSensitive
                              ? (rec.universities?.name || rec.university_name || 'Universidade')
                              : '********'}
                          </span>
                        </div>

                        {/* Scholarship title */}
                        <h3 className="text-base font-black text-slate-900 line-clamp-2 leading-snug mb-2">
                          {rec.title}
                        </h3>

                        {/* Course / Field of Study */}
                        {rec.field_of_study && (
                          <div className="mb-2">
                            <span className="inline-flex items-center text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-1 max-w-full">
                              <span className="truncate">{rec.field_of_study}</span>
                            </span>
                          </div>
                        )}

                        {/* Specs Tags (Delivery Mode & Work Permissions) */}
                        {(rec.delivery_mode || (rec.work_permissions && rec.work_permissions.length > 0)) && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {rec.delivery_mode && (
                              <span className="inline-flex items-center text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-1 max-w-full">
                                <span className="truncate">{getDeliveryModeLabel(rec.delivery_mode)}</span>
                              </span>
                            )}

                            {rec.work_permissions && rec.work_permissions.map((perm: string, i: number) => (
                              <span key={i} className="inline-flex items-center text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-1 max-w-full">
                                <span className="truncate">{perm}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Financial details - Premium Pricing Section */}
                      <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-4.5 sm:p-5 mt-2 flex items-center justify-between gap-4">
                        {/* Left Side: Original Cost & Savings Badge */}
                        <div className="flex flex-col text-left">
                          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                            {t('scholarshipsPage.detail.annualCost', 'Investimento Anual')}
                          </span>
                          <span className="text-sm font-bold text-slate-400 line-through leading-tight">
                            ${formatAmount(rec.original_annual_value)}
                          </span>
                          {recAnnualSavings > 0 && (
                            <span className="inline-flex items-center w-fit text-[10px] font-black text-green-700 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-xl mt-2 uppercase tracking-wider">
                              -{t('scholarshipsPage.detail.annualSavings', 'Economia Anual').split(' ')[0]} ${formatAmount(recAnnualSavings)}
                            </span>
                          )}
                        </div>

                        {/* Right Side: Hero Price with Scholarship */}
                        <div className="flex flex-col text-right">
                          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">
                            {t('scholarshipsPage.detail.withScholarship', 'Com Bolsa')}
                          </span>
                          <div className="flex items-baseline justify-end">
                            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                              ${formatAmount(rec.annual_value_with_scholarship)}
                            </span>
                            <span className="text-xs font-bold text-slate-500 ml-0.5">
                              {t('scholarshipsPage.detail.perYear', '/ano')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      <SmartChat />
    </div>
  );
};

export default ScholarshipDetail;
