import React, { useState } from 'react';
import {
  Award,
  Building,
  DollarSign,
  Clock,
  GraduationCap,
  Monitor,
  Globe,
  CheckCircle,
  MapPin,
  Star,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Target,
  Download,
  Mail,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../../utils/currency';
import { getPlacementFee } from '../../../utils/placementFeeCalculator';

interface AcceptanceLetterProps {
  /** URL da carta de aceite. Se null/undefined, exibe status "em andamento". */
  url?: string | null;
  onView?: (url: string) => void;
  onDownload?: (url: string, fileName: string) => void;
}

interface ScholarshipInfoCardProps {
  scholarship: any;
  userProfile?: any;
  /** Quando fornecido, exibe a seção de carta de aceite integrada ao card. */
  acceptanceLetter?: AcceptanceLetterProps;
}

const ScholarshipInfoCard: React.FC<ScholarshipInfoCardProps> = ({
  scholarship,
  userProfile,
  acceptanceLetter,
}) => {
  const { t } = useTranslation(['scholarships', 'dashboard', 'common']);
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!scholarship) return null;

  const showAcceptanceSection = acceptanceLetter !== undefined;

  const formatAmount = (amount: any) => {
    if (typeof amount === 'number') return amount.toLocaleString('en-US');
    if (typeof amount === 'string') return amount;
    return '0';
  };

  const annualSavings =
    (Number(scholarship.original_annual_value) || 0) -
    (Number(scholarship.annual_value_with_scholarship) || 0);

  const canViewSensitive = !!(
    userProfile?.has_paid_selection_process_fee || userProfile?.has_paid_subscription
  );

  const universityName = canViewSensitive
    ? scholarship.universities?.name || scholarship.university_name
    : '••••••••••';

  const universityLocation = canViewSensitive ? scholarship.universities?.location : null;

  const logoUrl =
    scholarship.image_url ||
    scholarship.universities?.logo_url ||
    scholarship.universities?.image_url;

  const annualValue = Number(scholarship.annual_value_with_scholarship || scholarship.amount || 0);
  const placementFeeAmount = scholarship.placement_fee_amount
    ? Number(scholarship.placement_fee_amount)
    : null;
  const placementFee = getPlacementFee(annualValue, placementFeeAmount);

  const hasLetter = !!acceptanceLetter?.url;

  return (
    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">

      {/* ── HEADER: Logo da universidade ── */}
      <div className="relative bg-gradient-to-br from-[#05294E] to-slate-800 p-6 md:p-10 text-white overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <GraduationCap className="w-56 h-56" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-5 md:gap-8 text-center md:text-left">
          {/* Logo */}
          <div className="w-20 h-20 md:w-28 md:h-28 bg-white rounded-2xl md:rounded-3xl shadow-2xl flex items-center justify-center shrink-0 overflow-hidden p-2">
            {logoUrl && canViewSensitive && !imgError ? (
              <img
                src={logoUrl}
                alt={scholarship.title}
                onError={() => setImgError(true)}
                className="w-full h-full object-contain"
              />
            ) : (
              <Building className="w-10 h-10 md:w-14 md:h-14 text-slate-300" />
            )}
          </div>

          {/* Textos */}
          <div className="space-y-1.5 md:space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">
              {t('scholarships:scholarshipsPage.modal.yourScholarship', 'Sua Bolsa de Estudos')}
            </p>
            <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter leading-tight text-white">
              {scholarship.title}
            </h3>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-white/50 font-bold text-[10px]">
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                <span className={!canViewSensitive ? 'blur-[4px]' : ''}>{universityName}</span>
              </div>
              {universityLocation && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{universityLocation}</span>
                </div>
              )}
              {scholarship.universities?.website && canViewSensitive && (
                <a
                  href={scholarship.universities.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-white/80 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{t('common:labels.website', 'Site')}</span>
                </a>
              )}
            </div>
          </div>

          {/* Badge exclusivo */}
          {scholarship.is_exclusive && (
            <div className="md:ml-auto bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shrink-0">
              <Star className="w-3 h-3 fill-current" />
              {t('scholarships:common.exclusive', 'Exclusive')}
            </div>
          )}
        </div>
      </div>

      {/* ── CORPO: Métricas + tabela financeira ── */}
      <div className="p-6 md:p-8 space-y-6">
        {/* Métricas chave */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
            <div className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center mb-2">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-[9px] uppercase tracking-widest font-black text-green-600 mb-0.5">
              {t('scholarships:scholarshipsPage.modal.annualSavings', 'Economia Anual')}
            </p>
            <p className="text-lg font-black text-green-700">${formatAmount(annualSavings)}</p>
          </div>

          {scholarship.scholarship_percentage && (
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <div className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center mb-2">
                <Award className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-[9px] uppercase tracking-widest font-black text-blue-600 mb-0.5">
                {t('scholarships:scholarshipsPage.modal.coverage', 'Cobertura')}
              </p>
              <p className="text-lg font-black text-blue-700">{scholarship.scholarship_percentage}%</p>
            </div>
          )}

          {scholarship.level && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center mb-2">
                <GraduationCap className="w-4 h-4 text-slate-600" />
              </div>
              <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-0.5">
                {t('scholarships:scholarshipsPage.modal.academicLevel', 'Nível Acadêmico')}
              </p>
              <p className="text-sm font-black text-slate-700 capitalize">{scholarship.level}</p>
            </div>
          )}
        </div>

        {/* Tabela financeira */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              {t('scholarships:scholarshipsPage.modal.financialBreakdown', 'Detalhes Financeiros')}
            </p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-slate-50/50">
                <td className="py-3 px-4 text-slate-500 font-medium">
                  {t('scholarships:scholarshipsPage.modal.originalAnnualCost', 'Custo Original')}
                </td>
                <td className="py-3 px-4 text-right text-slate-400 line-through">
                  ${formatAmount(scholarship.original_annual_value)}
                </td>
              </tr>
              <tr className="bg-green-50/30">
                <td className="py-3 px-4 text-slate-700 font-bold">
                  {t('scholarships:scholarshipsPage.modal.withScholarship', 'Com Bolsa')}
                </td>
                <td className="py-3 px-4 text-right text-green-700 font-black text-base">
                  ${formatAmount(scholarship.annual_value_with_scholarship)}
                </td>
              </tr>
              {scholarship.original_value_per_credit && (
                <tr>
                  <td className="py-3 px-4 text-slate-500 text-xs">
                    {t('scholarships:scholarshipsPage.modal.costPerCredit', 'Custo por Crédito')}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500 text-xs font-bold">
                    ${formatAmount(scholarship.original_value_per_credit)}
                  </td>
                </tr>
              )}
              {userProfile?.placement_fee_flow && placementFee > 0 && (
                <tr>
                  <td className="py-3 px-4 text-slate-500 font-medium">Placement Fee</td>
                  <td className="py-3 px-4 text-right text-blue-600 font-bold">
                    {formatCurrency(placementFee)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Botão "Ver mais / Ver menos" */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
        >
          {expanded ? (
            <>{t('common:labels.seeLess', 'Ver menos')} <ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <>{t('common:labels.seeMore', 'Ver mais')} <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      </div>

      {/* ── SEÇÃO EXPANDIDA ── */}
      {expanded && (
        <div className="px-6 md:px-8 pb-8 space-y-6 border-t border-slate-100 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scholarship.delivery_mode && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 shrink-0">
                  <Monitor className="w-4 h-4 text-[#05294E]" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">
                    {t('scholarships:scholarshipsPage.modal.studyMode', 'Modalidade')}
                  </p>
                  <p className="text-sm font-bold text-slate-700 capitalize">
                    {scholarship.delivery_mode === 'in_person'
                      ? t('scholarships:scholarshipsPage.modal.inPerson', 'Presencial')
                      : scholarship.delivery_mode}
                  </p>
                </div>
              </div>
            )}

            {scholarship.duration && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 shrink-0">
                  <Clock className="w-4 h-4 text-[#05294E]" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">
                    {t('scholarships:scholarshipsPage.modal.programDuration', 'Duração')}
                  </p>
                  <p className="text-sm font-bold text-slate-700">{scholarship.duration}</p>
                </div>
              </div>
            )}

            {scholarship.language && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 shrink-0">
                  <Globe className="w-4 h-4 text-[#05294E]" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">
                    {t('scholarships:scholarshipsPage.modal.language', 'Idioma')}
                  </p>
                  <p className="text-sm font-bold text-slate-700">{scholarship.language}</p>
                </div>
              </div>
            )}

            {scholarship.min_gpa && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 shrink-0">
                  <Target className="w-4 h-4 text-[#05294E]" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">GPA Mínimo</p>
                  <p className="text-sm font-bold text-slate-700">{Number(scholarship.min_gpa).toFixed(1)}</p>
                </div>
              </div>
            )}
          </div>

          {scholarship.work_permissions && scholarship.work_permissions.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-2">
                {t('scholarships:scholarshipsPage.modal.workAuthorization', 'Autorização de Trabalho')}
              </p>
              <div className="flex flex-wrap gap-2">
                {scholarship.work_permissions.map((perm: string, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold shadow-sm"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          )}

          {scholarship.benefits &&
            (Array.isArray(scholarship.benefits) ? scholarship.benefits.length > 0 : !!scholarship.benefits) && (
              <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100">
                <h4 className="text-[10px] uppercase tracking-widest font-black text-slate-700 mb-3 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#05294E]" />
                  {t('scholarships:scholarshipsPage.modal.additionalBenefits', 'Benefícios')}
                </h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  {Array.isArray(scholarship.benefits) ? (
                    scholarship.benefits.map((benefit: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))
                  ) : (
                    <li className="whitespace-pre-line">{scholarship.benefits}</li>
                  )}
                </ul>
              </div>
            )}

          {scholarship.description && (
            <div>
              <h4 className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                {t('scholarships:scholarshipsPage.modal.programDescription', 'Descrição')}
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                {scholarship.description}
              </p>
            </div>
          )}

          {scholarship.requirements && (
            <div>
              <h4 className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                {t('scholarships:scholarshipsPage.modal.requirements', 'Requisitos')}
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                {Array.isArray(scholarship.requirements) ? (
                  scholarship.requirements.map((req: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-[#05294E] rounded-full mt-1.5 shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))
                ) : (
                  <li className="whitespace-pre-line">{scholarship.requirements}</li>
                )}
              </ul>
            </div>
          )}

          {scholarship.universities?.university_fees_page_url && (
            <a
              href={scholarship.universities.university_fees_page_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {t('scholarships:scholarshipsPage.modal.viewUniversityFeesPage', 'Ver página de taxas da universidade')}
            </a>
          )}
        </div>
      )}

      {/* ── SEÇÃO CARTA DE ACEITE (opcional) ── */}
      {showAcceptanceSection && (
        <div className="border-t border-slate-100">
          {/* Separador visual */}
          <div className="px-6 md:px-8 pt-6 pb-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {t('dashboard:studentDashboard.myApplicationStep.tabs.acceptanceLetter', 'Carta de Aceite')}
            </p>
          </div>

          <div className="px-6 md:px-8 pb-6 md:pb-8">
            {hasLetter ? (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center shrink-0">
                    <Award className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <p className="font-black text-emerald-800 text-sm uppercase tracking-tight">
                      {t('dashboard:studentDashboard.myApplicationStep.welcome.documentAvailable', 'Disponível')}
                    </p>
                    <p className="text-xs text-emerald-600 font-medium mt-0.5">
                      {t('common:labels.clickToDownload', 'Clique para visualizar ou baixar seu documento.')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {acceptanceLetter?.onView && (
                      <button
                        onClick={() => acceptanceLetter.onView!(acceptanceLetter.url!)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-emerald-200 text-emerald-700 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-100 transition-all"
                      >
                        <Award className="w-3.5 h-3.5" />
                        {t('common:labels.view', 'Visualizar')}
                      </button>
                    )}
                    {acceptanceLetter?.onDownload && (
                      <button
                        onClick={() => acceptanceLetter.onDownload!(acceptanceLetter.url!, 'acceptance_letter.pdf')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {t('common:labels.download', 'Download')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <Clock className="w-8 h-8 text-slate-300" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {t('dashboard:studentDashboard.myApplicationStep.welcome.status.inProgress', 'Liberação em Andamento')}
                  </p>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    {t('common:labels.acceptanceLetterSoon', 'Sua carta de aceite será disponibilizada em breve.')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Contato institucional (quando tem carta) */}
          {(scholarship.universities?.contact?.email || scholarship.universities?.website) && canViewSensitive && (
            <div className="px-6 md:px-8 pb-6 md:pb-8 border-t border-slate-100 pt-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
                {t('dashboard:studentDashboard.myApplicationStep.details.institution.details', 'Detalhes da Instituição')}
              </p>
              <div className="flex flex-wrap gap-3">
                {scholarship.universities?.contact?.email && (
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 text-sm font-medium text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{scholarship.universities.contact.email}</span>
                  </div>
                )}
                {scholarship.universities?.website && (
                  <a
                    href={scholarship.universities.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-600 transition-colors"
                  >
                    <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{scholarship.universities.website}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScholarshipInfoCard;
