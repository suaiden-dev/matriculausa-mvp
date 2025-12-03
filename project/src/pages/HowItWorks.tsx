import React from 'react';
import { 
  User, 
  Sparkles, 
  Shield, 
  Clock, 
  FileText,
  Star,
  BookOpen,
  Lock,
  MessageCircle,
  GraduationCap,
  CreditCard
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDynamicFees } from '../hooks/useDynamicFees';
import { useAffiliateAdminCheck } from '../hooks/useAffiliateAdminCheck';
import { useAuth } from '../hooks/useAuth';
import { useSystemType } from '../hooks/useSystemType';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { useSimplifiedFees } from '../hooks/useSimplifiedFees';
import SmartChat from '../components/SmartChat';

const HowItWorks: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { selectionProcessFee, scholarshipFee, i20ControlFee, hasSellerPackage, packageName } = useDynamicFees();
  const { affiliateAdminEmail, loading: affiliateCheckLoading, isTheFutureOfEnglishAffiliate } = useAffiliateAdminCheck();
  const { userProfile } = useAuth();
  const { systemType, loading: systemTypeLoading } = useSystemType();
  const { getFeeAmount, hasOverride, loading: feeLoading } = useFeeConfig(userProfile?.user_id);
  const { fee350, loading: simplifiedFeesLoading } = useSimplifiedFees();
  
  // Verificar se deve mostrar o texto de dependentes (+$150 per dependent)
  const isBrantImmigrationAffiliate = affiliateAdminEmail?.toLowerCase() === 'contato@brantimmigration.com';
  
  // ✅ Calcular apenas o valor base (sem dependentes) para exibição no título
  const baseSelectionFee = React.useMemo(() => {
    // Se ainda estiver carregando, retornar undefined
    if (affiliateCheckLoading || systemTypeLoading || (systemType === 'simplified' && simplifiedFeesLoading) || (systemType === 'legacy' && feeLoading)) {
      return undefined;
    }
    
    // Se for do affiliate admin info@thefutureofenglish.com, valor fixo é 350
    if (isTheFutureOfEnglishAffiliate) {
      return '$350.00';
    }
    
    // ✅ Se for do affiliate admin contato@brantimmigration.com, valor base é 400 (sem dependentes no título)
    if (isBrantImmigrationAffiliate) {
      return '$400.00';
    }
    
    // Para sistema simplificado, valor base é 350
    if (systemType === 'simplified') {
      return `$${fee350.toFixed(2)}`;
    }
    
    // Para sistema legacy
    const hasSelectionOverride = hasOverride('selection_process');
    
    if (hasSelectionOverride) {
      // Se há override, usar o valor do override (já é o valor base, sem dependentes)
      const overrideValue = Number(getFeeAmount('selection_process'));
      return `$${overrideValue.toFixed(2)}`;
    } else {
      // Valor base para legacy é 400 (sem dependentes)
      return '$400.00';
    }
  }, [affiliateCheckLoading, systemTypeLoading, simplifiedFeesLoading, feeLoading, isTheFutureOfEnglishAffiliate, isBrantImmigrationAffiliate, systemType, fee350, hasOverride, getFeeAmount]);
  
  
  return (
    <div className="bg-white min-h-screen">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-[#05294E] via-slate-800 to-[#05294E] text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#D0151C]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight">{t('howItWorks.title')}</h1>
          <h2 className="text-2xl md:text-3xl text-slate-200 max-w-2xl mx-auto mb-8 leading-relaxed font-semibold">
            {t('howItWorks.subtitle')}
          </h2>
          <div className="flex flex-wrap justify-center items-center gap-8 mt-8 text-slate-300">
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <Clock className="h-5 w-5 mr-2 text-green-400" />
                <span className="text-sm font-medium">{t('howItWorks.stats.setup')}</span>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
              <Star className="h-5 w-5 mr-2 text-yellow-400" />
                <span className="text-sm font-medium">{t('howItWorks.stats.success')}</span>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <Shield className="h-5 w-5 mr-2 text-blue-400" />
                <span className="text-sm font-medium">{t('howItWorks.stats.secure')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Journey Steps */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-4xl font-black text-center mb-12 text-[#05294E]">{t('howItWorks.journey')}</h2>
        <div className="space-y-10">
          {/* Step 1 */}
          <div className="bg-slate-50 rounded-3xl shadow-lg p-8 flex flex-col md:flex-row gap-8 items-center border border-slate-200">
            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-[#05294E]/10">
              <User className="h-8 w-8 text-[#05294E]" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2 text-[#05294E]">1. {t('howItWorks.steps.profile.title')}</h3>
              <p className="text-slate-700 mb-2 text-lg">{t('howItWorks.steps.profile.description')}</p>
              <ul className="list-disc list-inside text-slate-500 text-sm space-y-1">
                {(t('howItWorks.steps.profile.items', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          {/* Step 2 */}
          <div className="bg-slate-50 rounded-3xl shadow-lg p-8 flex flex-col md:flex-row gap-8 items-center border border-slate-200">
            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100">
              <CreditCard className="h-8 w-8 text-green-600" />
                  </div>
            <div>
              <h3 className="text-2xl font-bold mb-2 text-green-700">
                2. {(() => {
                  // Se ainda está carregando a verificação do affiliate ou o valor base, mostrar skeleton
                  const isLoading = baseSelectionFee === undefined || affiliateCheckLoading || systemTypeLoading || 
                      (systemType === 'simplified' && simplifiedFeesLoading) || 
                      (systemType === 'legacy' && feeLoading);
                  
                  if (isLoading) {
                    // Obter o texto base da tradução e remover o placeholder/valor
                    const titleText = t('howItWorks.steps.selectionFee.title', { selectionProcessFee: '{{selectionProcessFee}}' });
                    // Remover placeholder {{selectionProcessFee}} e qualquer valor já inserido ($XXX.XX)
                    const textWithoutFee = titleText
                      .replace(/\{\{selectionProcessFee\}\}/g, '')
                      .replace(/\(\$[\d.]+\)/g, '')
                      .replace(/\$[\d.]+/g, '')
                      .trim();
                    return (
                      <>
                        {textWithoutFee}
                        <span className="inline-block ml-2 h-6 w-20 bg-slate-200 rounded animate-pulse"></span>
                      </>
                    );
                  }
                  // Quando o valor estiver pronto, mostrar o valor correto
                  return t('howItWorks.steps.selectionFee.title', { selectionProcessFee: baseSelectionFee || selectionProcessFee });
                })()}
                {hasSellerPackage && (
                  <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {packageName}
                  </span>
                )}
              </h3>
              <p className="text-slate-700 mb-2 text-lg">
                {(() => {
                  let baseDescription = t('howItWorks.steps.selectionFee.description');
                  
                  // Se ainda está carregando, retornar descrição sem dependentes temporariamente
                  if (affiliateCheckLoading) {
                    return baseDescription.replace(/\s*\(\+\$150\s*(per|por)\s*dependent[^)]*\)/i, '').trim();
                  }
                  
                  // Remover o texto de dependentes do texto base (caso já esteja presente)
                  baseDescription = baseDescription.replace(/\s*\(\+\$150\s*(per|por)\s*dependent[^)]*\)/i, '').trim();
                  
                  // Se for do affiliate admin correto, adicionar o texto de dependentes
                  if (isBrantImmigrationAffiliate) {
                    // ✅ CORREÇÃO: Verificar diretamente o idioma atual do i18n
                    // Em vez de depender de chave de tradução ausente, verificar o idioma configurado
                    const currentLanguage = i18n.language || 'en';
                    const isPortuguese = currentLanguage.startsWith('pt') || 
                                         baseDescription.toLowerCase().includes('por dependente') ||
                                         baseDescription.toLowerCase().includes('processo seletivo');
                    const dependentsText = isPortuguese ? 'por dependente' : 'per dependent';
                    const dependentsNote = ` (+$150 ${dependentsText})`;
                    return baseDescription + dependentsNote;
                  }
                  
                  // Se não for do affiliate admin correto, retornar sem o texto de dependentes
                  return baseDescription;
                })()}
              </p>
              <ul className="list-disc list-inside text-slate-500 text-sm space-y-1">
                {(t('howItWorks.steps.selectionFee.items', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
                  </div>
          {/* Step 3 */}
          <div className="bg-slate-50 rounded-3xl shadow-lg p-8 flex flex-col md:flex-row gap-8 items-center border border-slate-200">
            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2 text-blue-700">3. {t('howItWorks.steps.documents.title')}</h3>
              <p className="text-slate-700 mb-2 text-lg">{t('howItWorks.steps.documents.description')}</p>
              <ul className="list-disc list-inside text-slate-500 text-sm space-y-1">
                {(t('howItWorks.steps.documents.items', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
                  </div>
                </div>
          {/* Step 4 */}
          <div className="bg-slate-50 rounded-3xl shadow-lg p-8 flex flex-col md:flex-row gap-8 items-center border border-slate-200">
            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-100">
              <GraduationCap className="h-8 w-8 text-yellow-600" />
                  </div>
            <div>
              <h3 className="text-2xl font-bold mb-2 text-yellow-700">4. {t('howItWorks.steps.applicationFee.title')}</h3>
              <p className="text-slate-700 mb-2 text-lg">{t('howItWorks.steps.applicationFee.description')}</p>
              <ul className="list-disc list-inside text-slate-500 text-sm space-y-1">
                {(t('howItWorks.steps.applicationFee.items', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
                  </div>
          {/* Step 5 */}
          <div className="bg-slate-50 rounded-3xl shadow-lg p-8 flex flex-col md:flex-row gap-8 items-center border border-slate-200">
            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-100">
              <BookOpen className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2 text-purple-700">
                5. {t('howItWorks.steps.scholarshipFee.title', { scholarshipFee })}
                {hasSellerPackage && (
                  <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {packageName}
                  </span>
                )}
              </h3>
              <p className="text-slate-700 mb-2 text-lg">
                {t('howItWorks.steps.scholarshipFee.description', { scholarshipFee })}
              </p>
              <ul className="list-disc list-inside text-slate-500 text-sm space-y-1">
                {(t('howItWorks.steps.scholarshipFee.items', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
                </div>
          {/* Step 6 */}
          <div className="bg-slate-50 rounded-3xl shadow-lg p-8 flex flex-col md:flex-row gap-8 items-center border border-slate-200">
            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100">
              <Lock className="h-8 w-8 text-red-600" />
                  </div>
            <div>
              <h3 className="text-2xl font-bold mb-2 text-red-700">
                6. {t('howItWorks.steps.i20Fee.title', { i20ControlFee })}
                {hasSellerPackage && (
                  <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {packageName}
                  </span>
                )}
              </h3>
              <p className="text-slate-700 mb-2 text-lg">
                {t('howItWorks.steps.i20Fee.description', { i20ControlFee })}
              </p>
              <ul className="list-disc list-inside text-slate-500 text-sm space-y-1">
                {(t('howItWorks.steps.i20Fee.items', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Behind the Technology Section */}
      <section className="bg-gradient-to-br from-slate-50 to-blue-50 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-4xl font-black text-center mb-12 text-[#05294E]">{t('howItWorks.whyUs.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 group hover:-translate-y-2 transition-transform duration-300 flex flex-col h-full">
              <Sparkles className="h-8 w-8 text-[#05294E] mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight">{t('howItWorks.whyUs.smartDiscovery.title')}</h3>
              <p className="text-slate-600 text-lg mt-auto">{t('howItWorks.whyUs.smartDiscovery.description')}</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 group hover:-translate-y-2 transition-transform duration-300 flex flex-col h-full">
              <FileText className="h-8 w-8 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight">{t('howItWorks.whyUs.documentManagement.title')}</h3>
              <p className="text-slate-600 text-lg mt-auto">{t('howItWorks.whyUs.documentManagement.description')}</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 group hover:-translate-y-2 transition-transform duration-300 flex flex-col h-full">
              <MessageCircle className="h-8 w-8 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight">{t('howItWorks.whyUs.personalSupport.title')}</h3>
              <p className="text-slate-600 text-lg mt-auto">{t('howItWorks.whyUs.personalSupport.description')}</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 group hover:-translate-y-2 transition-transform duration-300 flex flex-col h-full">
              <Star className="h-8 w-8 text-yellow-400 mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight">{t('howItWorks.whyUs.successTracking.title')}</h3>
              <p className="text-slate-600 text-lg mt-auto">{t('howItWorks.whyUs.successTracking.description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center text-[#05294E]">{t('howItWorks.faq.title')}</h2>
          {/* FAQ List */}
          <div className="flex flex-col gap-6 max-w-2xl mx-auto">
            {Array.from({ length: 11 }, (_, i) => i + 1).map((num) => (
              <div key={num} className="bg-slate-50 rounded-2xl p-6 shadow flex flex-col gap-2">
                <h3 className="font-bold text-[#05294E]">{num}. {t(`howItWorks.faq.q${num}.question`, { selectionProcessFee, scholarshipFee, i20ControlFee })}</h3>
                <p>{t(`howItWorks.faq.q${num}.answer`, { selectionProcessFee, scholarshipFee, i20ControlFee })}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories Section (mantido) */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#05294E]">Success Stories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.values(t('howItWorks.successStories', { returnObjects: true }))
              .filter((item): item is { text: string; name: string; major: string } => typeof item === 'object' && item !== null && 'text' in item)
              .map((story, index) => (
              <div key={index} className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200">
                <div className="flex items-center mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 text-lg leading-relaxed">
                  {story.text}
                </p>
                <div className="flex items-center">
                  <img
                    src={[
                      "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1",
                      "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1",
                      "https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1",
                      "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1",
                      "https://images.pexels.com/photos/1181696/pexels-photo-1181696.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1"
                    ][index] || "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1"}
                    alt={story.name}
                    className="w-14 h-14 rounded-2xl mr-4 shadow-lg"
                  />
                  <div>
                    <div className="font-bold text-slate-900">{story.name}</div>
                    <div className="text-sm text-green-600 font-medium">{story.major}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <SmartChat />
    </div>
  );
};

export default HowItWorks;