import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { 
  Coins,
  Users,
  GraduationCap,
  Gift,
  ArrowRight,
  Share2,
  Play,
  Sparkles,
  DollarSign,
  BookOpen,
  Copy
} from 'lucide-react';
import { 
  AffiliateCode
} from '../types';

const MatriculaRewardsLanding: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [calculatorFriends, setCalculatorFriends] = useState(5);
  const [copiedCode, setCopiedCode] = useState(false);
  const [userAffiliateCode, setUserAffiliateCode] = useState<AffiliateCode | null>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Carregar código de afiliado se usuário estiver logado
  useEffect(() => {
    if (user?.id) {
      loadUserAffiliateCode();
    }
  }, [user?.id]);

  const loadUserAffiliateCode = async () => {
    if (!user?.id) return;
    
    try {
      const { data: affiliateCodeData, error: affiliateError } = await supabase
        .from('affiliate_codes')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (affiliateError && affiliateError.code !== 'PGRST116') {
        console.error('Erro ao carregar código de afiliado:', affiliateError);
      }

      // Se não existe código, cria um
      let affiliateCode = affiliateCodeData;
      if (!affiliateCodeData) {
        const { error: createError } = await supabase
          .rpc('create_affiliate_code_for_user', { user_id_param: user.id });
        
        if (createError) {
          console.error('Erro ao criar código de afiliado:', createError);
        } else {
          // Recarrega o código criado
          const { data: reloadedCode } = await supabase
            .from('affiliate_codes')
            .select('*')
            .eq('user_id', user.id)
            .single();
          affiliateCode = reloadedCode;
        }
      }

      setUserAffiliateCode(affiliateCode);
    } catch (error) {
      console.error('Erro ao carregar código de afiliado:', error);
    }
  };

  // Rotate testimonials
  // useEffect(() => {
  //   const timer = setInterval(() => {
  //     setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  //   }, 5000);
  //   return () => clearInterval(timer);
  // }, []);

  // const stats = [
  //   { number: "1,200+", label: t('matriculaRewardsLanding.stats.activeStudents'), icon: Users },
  //   { number: "80+", label: t('matriculaRewardsLanding.stats.partnerUniversities'), icon: GraduationCap },
  //   { number: "$500K+", label: t('matriculaRewardsLanding.stats.discountsGiven'), icon: Gift },
  //   { number: "95%", label: t('matriculaRewardsLanding.stats.satisfactionRate'), icon: Star }
  // ];

  const howItWorksSteps = [
    {
      number: "01",
      icon: Share2,
      title: t('matriculaRewardsLanding.howItWorks.steps.step1.title'),
      description: t('matriculaRewardsLanding.howItWorks.steps.step1.description'),
      details: t('matriculaRewardsLanding.howItWorks.steps.step1.details'),
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600"
    },
    {
      number: "02", 
      icon: Users,
      title: t('matriculaRewardsLanding.howItWorks.steps.step2.title'),
      description: t('matriculaRewardsLanding.howItWorks.steps.step2.description'),
      details: t('matriculaRewardsLanding.howItWorks.steps.step2.details'),
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600"
    },
    {
      number: "03",
      icon: Coins,
      title: t('matriculaRewardsLanding.howItWorks.steps.step3.title'),
      description: t('matriculaRewardsLanding.howItWorks.steps.step3.description'),
      details: t('matriculaRewardsLanding.howItWorks.steps.step3.details'),
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50",
      iconColor: "text-green-600"
    },
    {
      number: "04",
      icon: GraduationCap,
      title: t('matriculaRewardsLanding.howItWorks.steps.step4.title'),
      description: t('matriculaRewardsLanding.howItWorks.steps.step4.description'),
      details: t('matriculaRewardsLanding.howItWorks.steps.step4.details'),
      color: "from-orange-500 to-red-500",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600"
    }
  ];

  // const benefits = [
  //   {
  //     icon: DollarSign,
  //     title: t('matriculaRewardsLanding.benefits.items.0.title'),
  //     description: t('matriculaRewardsLanding.benefits.items.0.description'),
  //     highlight: t('matriculaRewardsLanding.benefits.items.0.highlight'),
  //     color: "text-green-600",
  //     bg: "bg-green-50"
  //   },
  //   {
  //     icon: Target,
  //     title: t('matriculaRewardsLanding.benefits.items.1.title'),
  //     description: t('matriculaRewardsLanding.benefits.items.1.description'),
  //     highlight: t('matriculaRewardsLanding.benefits.items.1.highlight'),
  //     color: "text-blue-600",
  //     bg: "bg-blue-50"
  //   },
  //   {
  //     icon: Zap,
  //     title: t('matriculaRewardsLanding.benefits.items.2.title'),
  //     description: t('matriculaRewardsLanding.benefits.items.2.description'),
  //     highlight: t('matriculaRewardsLanding.benefits.items.2.highlight'),
  //     color: "text-purple-600",
  //     bg: "bg-purple-50"
  //   }
  // ];

  // const testimonials = [
  //   {
  //     name: t('matriculaRewardsLanding.testimonials.stories.0.name'),
  //     university: t('matriculaRewardsLanding.testimonials.stories.0.university'),
  //     avatar: "MS",
  //     text: t('matriculaRewardsLanding.testimonials.stories.0.text'),
  //     coins: 8000,
  //     savings: t('matriculaRewardsLanding.testimonials.stories.0.savings')
  //   },
  //   {
  //     name: t('matriculaRewardsLanding.testimonials.stories.1.name'),
  //     university: t('matriculaRewardsLanding.testimonials.stories.1.university'),
  //     avatar: "JS",
  //     text: t('matriculaRewardsLanding.testimonials.stories.1.text'),
  //     coins: 12000,
  //     savings: t('matriculaRewardsLanding.testimonials.stories.1.savings')
  //   },
  //   {
  //     name: t('matriculaRewardsLanding.testimonials.stories.2.name'),
  //     university: t('matriculaRewardsLanding.testimonials.stories.2.university'),
  //     avatar: "AR", 
  //     text: t('matriculaRewardsLanding.testimonials.stories.2.text'),
  //     coins: 15000,
  //     savings: t('matriculaRewardsLanding.testimonials.stories.2.savings')
  //   }
  // ];

  const handleGetStarted = () => {
    navigate('/student/dashboard/rewards');
  };

  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ 
      behavior: 'smooth' 
    });
  };

  const copyReferralCode = async () => {
    if (userAffiliateCode) {
      try {
        const shareUrl = `${window.location.origin}?ref=${userAffiliateCode.code}`;
        await navigator.clipboard.writeText(shareUrl);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } catch (error) {
        console.error('Erro ao copiar:', error);
      }
    } else {
      // Fallback para usuários não logados
      navigator.clipboard.writeText(t('matriculaRewardsLanding.hero.demo.referralCode.code'));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const calculateSavings = (friends: number) => {
    const coins = friends * 180; // 180 coins por indicação bem-sucedida
    const dollars = coins; // 1 coin = $1
    return { coins, dollars };
  };

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-slate-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className={`text-center transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-blue-600 px-6 py-3 rounded-full text-sm font-semibold mb-8 shadow-lg border border-blue-100">
              <Sparkles className="h-4 w-4 animate-pulse" />
              {t('matriculaRewardsLanding.badge')}
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-gray-900 mb-8 leading-tight">
              {t('matriculaRewardsLanding.hero.title')}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                {t('matriculaRewardsLanding.hero.titleHighlight')}
              </span>
              <span className="block text-3xl sm:text-4xl lg:text-5xl text-gray-600 font-medium mt-2">
                {t('matriculaRewardsLanding.hero.subtitle')}
              </span>
            </h1>

            {/* Subtitle */}

            {/* Value Proposition Cards */}
            {!user || !userAffiliateCode ? (
              // 3 cards in a row when user is not logged in
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-100 transform hover:scale-105 transition-all duration-300">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Share2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{t('matriculaRewardsLanding.hero.valueCards.referFriends.title')}</h3>
                  <p className="text-gray-600 text-sm">{t('matriculaRewardsLanding.hero.valueCards.referFriends.description')}</p>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-100 transform hover:scale-105 transition-all duration-300">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Coins className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{t('matriculaRewardsLanding.hero.valueCards.accumulateCoins.title')}</h3>
                  <p className="text-gray-600 text-sm">{t('matriculaRewardsLanding.hero.valueCards.accumulateCoins.description')}</p>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-100 transform hover:scale-105 transition-all duration-300">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <GraduationCap className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{t('matriculaRewardsLanding.hero.valueCards.payLess.title')}</h3>
                  <p className="text-gray-600 text-sm">{t('matriculaRewardsLanding.hero.valueCards.payLess.description')}</p>
                </div>
              </div>
            ) : (
              // 2+2 layout when user is logged in
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-100 transform hover:scale-105 transition-all duration-300">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                      <Share2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{t('matriculaRewardsLanding.hero.valueCards.referFriends.title')}</h3>
                    <p className="text-gray-600 text-sm">{t('matriculaRewardsLanding.hero.valueCards.referFriends.description')}</p>
                  </div>
                  
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-100 transform hover:scale-105 transition-all duration-300">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                      <Coins className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{t('matriculaRewardsLanding.hero.valueCards.accumulateCoins.title')}</h3>
                    <p className="text-gray-600 text-sm">{t('matriculaRewardsLanding.hero.valueCards.accumulateCoins.description')}</p>
                  </div>
                </div>

                {/* Pay Less Card + Referral Code Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
                  {/* Pay Less Card */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-100 transform hover:scale-105 transition-all duration-300">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                      <GraduationCap className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{t('matriculaRewardsLanding.hero.valueCards.payLess.title')}</h3>
                    <p className="text-gray-600 text-sm">{t('matriculaRewardsLanding.hero.valueCards.payLess.description')}</p>
                  </div>

                  {/* Referral Code Section */}
                  <div className="bg-blue-600 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative text-center">
                      <h4 className="font-semibold mb-3 text-blue-100">{t('matriculaRewardsLanding.hero.demo.referralCode.title')}</h4>
                      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center mb-4">
                        <span className="text-2xl font-bold tracking-wider">{userAffiliateCode.code}</span>
                      </div>
                      <button 
                        onClick={copyReferralCode}
                        className="w-full bg-white/20 hover:bg-white/30 rounded-lg py-2 px-3 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        {copiedCode ? t('matriculaRewardsLanding.hero.demo.referralCode.copied') : t('matriculaRewardsLanding.hero.demo.referralCode.copy')}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <button
                onClick={handleGetStarted}
                className="group bg-blue-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-3xl"
              >
                {t('matriculaRewardsLanding.hero.cta.getStarted')}
                <ArrowRight className="inline-block ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
              </button>
              <button
                onClick={scrollToHowItWorks}
                className="group bg-white/90 backdrop-blur-sm text-gray-700 px-10 py-5 rounded-2xl font-bold text-lg border-2 border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-all duration-300 shadow-xl"
              >
                <Play className="inline-block mr-3 h-6 w-6" />
                {t('matriculaRewardsLanding.hero.cta.learnMore')}
              </button>
            </div>

          </div>
        </div>

      </section>

      {/* Stats Section */}
      {/* <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                  <stat.icon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* How It Works Section - Interactive Journey */}
      <section id="how-it-works" className="py-24 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-blue-50/30 to-indigo-50/40"></div>
          {/* Floating particles */}
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-300/40 rounded-full animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-indigo-300/50 rounded-full animate-ping"></div>
          <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-slate-300/30 rounded-full animate-bounce"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              {t('matriculaRewardsLanding.howItWorks.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {t('matriculaRewardsLanding.howItWorks.subtitle')}
            </p>
          </div>

          {/* Interactive Journey Path */}
          <div className="relative max-w-6xl mx-auto">
            {/* Journey Path Line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-300/50 to-transparent transform -translate-y-1/2"></div>
            
            {/* Steps Container */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 lg:gap-8">
              {howItWorksSteps.map((step, index) => (
                <div key={index} className="group relative">
                  {/* Step Number Circle */}
                  <div className="relative mb-8">
                    <div className="w-20 h-20 mx-auto relative">
                      {/* Animated Ring */}
                      <div className="absolute inset-0 rounded-full border-2 border-gray-300/50 group-hover:border-blue-400/60 transition-all duration-700"></div>
                      <div className="absolute inset-2 rounded-full border border-gray-400/60 group-hover:border-blue-500/70 transition-all duration-700 group-hover:animate-pulse"></div>
                      
                      {/* Number */}
                      <div className="absolute inset-4 rounded-full bg-white text-gray-700 flex items-center justify-center font-bold text-xl group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-lg">
                        {index + 1}
                      </div>
                      
                      {/* Progress Indicator */}
                      <div className="absolute -inset-1 rounded-full border-2 border-transparent group-hover:border-blue-500/50 transition-all duration-500 group-hover:animate-spin"></div>
                    </div>

                    {/* Connecting Line to Next Step */}
                    {index < howItWorksSteps.length - 1 && (
                      <div className="hidden lg:block absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-white/20 to-transparent transform translate-x-1/2 group-hover:from-blue-400/50 transition-all duration-700"></div>
                    )}
                  </div>

                  {/* Content Card */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 group-hover:bg-white group-hover:border-blue-300 transition-all duration-500 transform group-hover:-translate-y-2 shadow-lg">
                    {/* Step Title */}
                    <h3 className="text-xl font-bold text-gray-900 mb-4 text-center group-hover:text-blue-600 transition-colors duration-300">
                      {step.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-gray-600 text-center mb-6 leading-relaxed">
                      {step.description}
                    </p>
                    
                    {/* Key Point */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 group-hover:bg-blue-100 group-hover:border-blue-200 transition-all duration-300">
                      <p className="text-sm text-gray-700 font-medium text-center">
                        {step.details}
                      </p>
                        </div>

                    {/* Hover Effect - Action Preview */}
                    <div className="mt-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 animate-bounce">
                          →
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                          {index === 0 && t('matriculaRewardsLanding.howItWorks.actions.shareNow')}
                          {index === 1 && t('matriculaRewardsLanding.howItWorks.actions.inviteFriends')}
                          {index === 2 && t('matriculaRewardsLanding.howItWorks.actions.seeEarnings')}
                          {index === 3 && t('matriculaRewardsLanding.howItWorks.actions.useDiscount')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Connection Line */}
                  {index < howItWorksSteps.length - 1 && (
                    <div className="lg:hidden flex justify-center mt-8 mb-4">
                      <div className="w-px h-12 bg-gradient-to-b from-white/20 to-transparent"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Success Animation */}
            <div className="mt-16 text-center">
              <div className="inline-flex items-center gap-4 bg-green-50 backdrop-blur-sm rounded-full px-8 py-4 border border-green-200">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                  ✓
                </div>
                <span className="text-green-700 font-medium">{t('matriculaRewardsLanding.howItWorks.journey.startMessage')}</span>
              </div>
            </div>
          </div>

          {/* Interactive Calculator */}
          <div className="mt-20 bg-white/90 backdrop-blur-sm rounded-3xl p-8 lg:p-12 border border-gray-200 shadow-xl">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">{t('matriculaRewardsLanding.howItWorks.calculator.title')}</h3>
              <p className="text-gray-600">{t('matriculaRewardsLanding.howItWorks.calculator.description')}</p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                {/* Calculator Input */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-4">
                    {t('matriculaRewardsLanding.howItWorks.calculator.label')}
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={calculatorFriends}
                      onChange={(e) => setCalculatorFriends(parseInt(e.target.value))}
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-2">
                      <span>1</span>
                      <span>50+</span>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <span className="text-4xl font-bold text-blue-600">{calculatorFriends}</span>
                    <span className="text-gray-600 ml-2">{t('matriculaRewardsLanding.howItWorks.calculator.friends')}</span>
                  </div>
                </div>

                {/* Results */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-6 text-center shadow-lg">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-3 mx-auto">
                      <Coins className="h-6 w-6 text-yellow-600" />
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{t('matriculaRewardsLanding.howItWorks.calculator.coinsEarned')}</p>
                    <p className="text-2xl font-bold text-yellow-600">{calculateSavings(calculatorFriends).coins.toLocaleString()}</p>
                  </div>
                  
                  <div className="bg-white rounded-2xl p-6 text-center shadow-lg">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3 mx-auto">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{t('matriculaRewardsLanding.howItWorks.calculator.totalSavings')}</p>
                    <p className="text-2xl font-bold text-green-600">${calculateSavings(calculatorFriends).dollars}</p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="text-center mt-8">
                <button
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-2xl border border-white/20"
                >
                  {t('matriculaRewardsLanding.howItWorks.calculator.cta')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {/* <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('matriculaRewardsLanding.testimonials.title')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('matriculaRewardsLanding.testimonials.subtitle')}
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full text-blue-600 font-bold text-xl mb-6">
                  {testimonials[currentTestimonial].avatar}
                </div>

                <blockquote className="text-xl md:text-2xl text-gray-700 mb-8 leading-relaxed">
                  "{testimonials[currentTestimonial].text}"
                </blockquote>

                <div className="mb-6">
                  <div className="font-semibold text-gray-900 text-lg">
                    {testimonials[currentTestimonial].name}
                  </div>
                  <div className="text-gray-600">
                    {testimonials[currentTestimonial].university}
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full">
                  <Coins className="h-4 w-4" />
                  <span className="font-medium">
                    {testimonials[currentTestimonial].coins.toLocaleString()} coins earned
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-8 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                    index === currentTestimonial ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section> */}

      

      {/* Final CTA Section - Enhanced */}
      <section className="relative py-24 bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/70 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-100 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-slate-100 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-6xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          {/* Main Content */}
          <div className="mb-12">
            <h2 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-8">
              {t('matriculaRewardsLanding.finalCta.title')}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600"> {t('matriculaRewardsLanding.finalCta.titleHighlight')}</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
              {t('matriculaRewardsLanding.finalCta.description')}
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Primary CTA */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 border border-gray-200 hover:bg-white hover:shadow-2xl transition-all duration-300 group">
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Gift className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('matriculaRewardsLanding.finalCta.cards.startNow.title')}</h3>
              <p className="text-gray-600 mb-6">
                {t('matriculaRewardsLanding.finalCta.cards.startNow.description')}
              </p>
              <button
                onClick={handleGetStarted}
                className="w-full bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-xl"
              >
                {t('matriculaRewardsLanding.finalCta.cards.startNow.cta')}
              </button>
            </div>

            {/* Secondary CTA */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 border border-gray-200 hover:bg-white hover:shadow-2xl transition-all duration-300 group">
              <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('matriculaRewardsLanding.finalCta.cards.learnMore.title')}</h3>
              <p className="text-gray-600 mb-6">
                {t('matriculaRewardsLanding.finalCta.cards.learnMore.description')}
              </p>
              <Link
                to="/how-it-works"
                className="w-full inline-block bg-transparent text-gray-700 border-2 border-gray-300 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 text-center"
              >
                {t('matriculaRewardsLanding.finalCta.cards.learnMore.cta')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes blob {
            0% {
              transform: translate(0px, 0px) scale(1);
            }
            33% {
              transform: translate(30px, -50px) scale(1.1);
            }
            66% {
              transform: translate(-20px, 20px) scale(0.9);
            }
            100% {
              transform: translate(0px, 0px) scale(1);
            }
          }
          
          .animate-blob {
            animation: blob 7s infinite;
          }
          
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `
      }} />
    </div>
  );
};

export default MatriculaRewardsLanding;
