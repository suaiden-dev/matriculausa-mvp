import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { 
  Coins,
  Users,
  Gift,
  DollarSign,
  BookOpen,
  Copy
} from 'lucide-react';
import { 
  AffiliateCode
} from '../types';

const MatriculaRewardsLanding: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
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
      title: t('matriculaRewardsLanding.howItWorks.steps.step1.title'),
      description: t('matriculaRewardsLanding.howItWorks.steps.step1.description'),
      details: t('matriculaRewardsLanding.howItWorks.steps.step1.details'),
      color: "from-blue-500 to-cyan-500"
    },
    {
      number: "02", 
      title: t('matriculaRewardsLanding.howItWorks.steps.step2.title'),
      description: t('matriculaRewardsLanding.howItWorks.steps.step2.description'),
      details: t('matriculaRewardsLanding.howItWorks.steps.step2.details'),
      color: "from-purple-500 to-pink-500"
    },
    {
      number: "03",
      title: t('matriculaRewardsLanding.howItWorks.steps.step3.title'),
      description: t('matriculaRewardsLanding.howItWorks.steps.step3.description'),
      details: t('matriculaRewardsLanding.howItWorks.steps.step3.details'),
      color: "from-green-500 to-emerald-500"
    },
    {
      number: "04",
      title: t('matriculaRewardsLanding.howItWorks.steps.step4.title'),
      description: t('matriculaRewardsLanding.howItWorks.steps.step4.description'),
      details: t('matriculaRewardsLanding.howItWorks.steps.step4.details'),
      color: "from-orange-500 to-red-500"
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
    if (user) {
      if (user.role === 'affiliate') {
        navigate('/affiliate/dashboard');
      } else {
        navigate('/student/dashboard/rewards');
      }
    } else {
      navigate('/affiliate/register');
    }
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
    const coins = friends * 100; // 100 coins por indicação bem-sucedida
    const dollars = coins; // 1 coin = $1
    return { coins, dollars };
  };

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[280px] lg:h-[380px] flex items-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
        {/* Background Image - University campus scene to reinforce educational context */}
        <div className="absolute inset-0 overflow-hidden">
          {/* University campus image */}
          <img 
            src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
            alt="University Campus Background"
            className="w-full h-[110%] object-cover opacity-12 blur-sm transition-all duration-700 hover:opacity-8 transform scale-105"
            style={{ objectPosition: 'center 30%' }}
            onError={(e) => {
              // Fallback se a imagem não carregar
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          
          {/* Multi-layer gradient overlay for optimal text contrast and visual hierarchy */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/85 via-blue-50/65 to-indigo-50/75"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50/30 via-transparent to-slate-50/20"></div>
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-slate-200/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
          <div className={`text-center transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>


            {/* Main Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-8 leading-tight">
              <span className="text-slate-900 drop-shadow-sm">
                {t('matriculaRewardsLanding.hero.title')}
              </span>
              <span className="block text-[#05294E] drop-shadow-sm">
                {t('matriculaRewardsLanding.hero.titleHighlight')}
              </span>
              <span className="block text-3xl sm:text-4xl lg:text-5xl text-gray-700 font-medium mt-2 drop-shadow-sm">
                {t('matriculaRewardsLanding.hero.subtitle')}
              </span>
            </h1>

            {/* Subtitle */}




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

      {/* How It Works Section - Mobile Optimized */}
      <section id="how-it-works" className="py-16 md:py-24 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 relative overflow-hidden">
        {/* Simplified Background for Mobile */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-blue-50/30 to-indigo-50/40"></div>
          {/* Simplified floating elements - only on desktop */}
          <div className="hidden md:block absolute top-1/4 left-1/4 w-2 h-2 bg-blue-300/40 rounded-full animate-pulse"></div>
          <div className="hidden md:block absolute top-3/4 right-1/4 w-1 h-1 bg-indigo-300/50 rounded-full animate-ping"></div>
          <div className="hidden md:block absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-slate-300/30 rounded-full animate-bounce"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Novo Layout Integrado: 2 Colunas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch max-w-6xl mx-auto">
            {/* Coluna Esquerda: Imagem absoluta na altura do conteúdo */}
            <div className="lg:col-span-5 hidden lg:relative lg:block overflow-hidden" style={{ minHeight: '420px' }}>
              <img 
                src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/girl_with_palm_open.webp"
                alt="Como funciona o Matricula Rewards"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '40%',
                  transform: 'translateX(-50%)',
                  height: '100%',
                  width: 'auto',
                  maxWidth: 'none'
                }}
              />
            </div>

            {/* Mobile: imagem normal */}
            <div className="lg:hidden flex justify-center">
              <img 
                src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/girl_with_palm_open.webp"
                alt="Como funciona o Matricula Rewards"
                className="w-full max-w-sm h-auto object-contain drop-shadow-xl rounded-3xl"
              />
            </div>

            {/* Coluna Direita: Texto + Passos */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div>
                <h2 className="text-3xl md:text-[36px] font-black text-slate-900 mb-4 md:mb-6">
                  {t('matriculaRewardsLanding.howItWorks.title')}
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  {t('matriculaRewardsLanding.howItWorks.subtitle')}
                </p>
              </div>

              {/* Grid 2x2 de Passos limpos (sem fundo/sombra e sem título colorido) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-10 pt-2">
                {howItWorksSteps.map((step, index) => {
                  return (
                    <div key={index} className="space-y-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {step.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Calculator - Mobile Optimized */}
          <div className="mt-20 md:mt-32 bg-white/95 backdrop-blur-md rounded-3xl p-4 md:p-8 lg:p-12 border border-gray-100 shadow-2xl">
            {/* Calculator Header */}
            <div className="text-center mb-6 md:mb-8">
              <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 mb-3 md:mb-4">{t('matriculaRewardsLanding.howItWorks.calculator.title')}</h3>
              <p className="text-gray-600 text-sm md:text-base">{t('matriculaRewardsLanding.howItWorks.calculator.description')}</p>
            </div>

            <div className="max-w-4xl mx-auto">
              {/* Mobile Calculator Layout - Enhanced */}
              <div className="md:hidden space-y-6">
                {/* Mobile Calculator Input - Improved */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
                  <label className="block text-base font-bold text-gray-800 mb-4 text-center">
                    {t('matriculaRewardsLanding.howItWorks.calculator.label')}
                  </label>
                  
                  {/* Current Value Display - More Prominent */}
                  <div className="text-center mb-5">
                    <div className="inline-flex items-center gap-3 bg-white rounded-2xl px-5 py-3 shadow-lg border border-blue-200">
                      <Users className="h-5 w-5 text-blue-500" />
                      <span className="text-3xl font-bold text-blue-600">{calculatorFriends}</span>
                      <span className="text-gray-600 font-medium text-sm">{t('matriculaRewardsLanding.howItWorks.calculator.friends')}</span>
                    </div>
                  </div>

                  {/* Enhanced Slider */}
                  <div className="relative px-1">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={calculatorFriends}
                      onChange={(e) => setCalculatorFriends(parseInt(e.target.value))}
                      className="w-full h-4 bg-gradient-to-r from-blue-200 to-purple-200 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(calculatorFriends / 50) * 100}%, #e2e8f0 ${(calculatorFriends / 50) * 100}%, #e2e8f0 100%)`
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                      <span className="font-medium">{t('matriculaRewardsLanding.howItWorks.calculator.minValue')}</span>
                      <span className="font-medium">{t('matriculaRewardsLanding.howItWorks.calculator.maxValue')}</span>
                    </div>
                  </div>

                  {/* Quick Select Buttons - Improved */}
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {[5, 10, 20, 50].map((value) => (
                      <button
                        key={value}
                        onClick={() => setCalculatorFriends(value)}
                        className={`px-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          calculatorFriends === value 
                            ? 'bg-blue-500 text-white shadow-lg transform scale-105' 
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Results - Enhanced Layout */}
                <div className="space-y-4">
                  {/* Coins Earned - Improved */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                          <Coins className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-medium">{t('matriculaRewardsLanding.howItWorks.calculator.coinsEarned')}</p>
                          <p className="text-2xl font-bold text-yellow-600">{calculateSavings(calculatorFriends).coins.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 font-medium">{t('matriculaRewardsLanding.howItWorks.calculator.coinsPerFriend')}</div>
                        <div className="text-xs text-gray-500">{t('matriculaRewardsLanding.howItWorks.calculator.perFriend')}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Total Savings - Improved */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-medium">{t('matriculaRewardsLanding.howItWorks.calculator.totalSavings')}</p>
                          <p className="text-2xl font-bold text-green-600">${calculateSavings(calculatorFriends).dollars}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 font-medium">{t('matriculaRewardsLanding.howItWorks.calculator.coinValue')}</div>
                        <div className="text-xs text-gray-500">{t('matriculaRewardsLanding.howItWorks.calculator.usdValue')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Calculator Layout */}
              <div className="hidden md:grid md:grid-cols-2 gap-8 items-center">
                {/* Calculator Input */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100">
                  <label className="block text-base font-semibold text-gray-700 mb-4">
                    {t('matriculaRewardsLanding.howItWorks.calculator.label')}
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={calculatorFriends}
                      onChange={(e) => setCalculatorFriends(parseInt(e.target.value))}
                      className="w-full h-3 bg-gradient-to-r from-blue-200 to-purple-200 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(calculatorFriends / 50) * 100}%, #e2e8f0 ${(calculatorFriends / 50) * 100}%, #e2e8f0 100%)`
                      }}
                    />
                    <div className="flex justify-between text-base text-gray-500 mt-2">
                      <span>{t('matriculaRewardsLanding.howItWorks.calculator.minValue')}</span>
                      <span>{t('matriculaRewardsLanding.howItWorks.calculator.maxValue')}</span>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <span className="text-base font-bold text-blue-600">{calculatorFriends}</span>
                    <span className="text-base text-gray-600 ml-2">{t('matriculaRewardsLanding.howItWorks.calculator.friends')}</span>
                  </div>
                </div>

                {/* Results */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 flex flex-col justify-center">
                    <p className="text-base text-gray-600 mb-1">{t('matriculaRewardsLanding.howItWorks.calculator.coinsEarned')}</p>
                    <p className="text-[22px] font-bold text-yellow-600">{calculateSavings(calculatorFriends).coins.toLocaleString()}</p>
                    <p className="text-base text-gray-400 mt-2">
                      {t('matriculaRewardsLanding.howItWorks.calculator.coinsPerFriend')} {t('matriculaRewardsLanding.howItWorks.calculator.perFriend')}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 flex flex-col justify-center">
                    <p className="text-base text-gray-600 mb-1">{t('matriculaRewardsLanding.howItWorks.calculator.totalSavings')}</p>
                    <p className="text-[22px] font-bold text-green-600">${calculateSavings(calculatorFriends).dollars}</p>
                    <p className="text-base text-gray-400 mt-2">
                      {t('matriculaRewardsLanding.howItWorks.calculator.coinValue')} {t('matriculaRewardsLanding.howItWorks.calculator.usdValue')}
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="text-center mt-8">
                <button
                  onClick={handleGetStarted}
                  className="w-full md:w-auto bg-[#05294E] text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-[#0a3663] transition-all duration-300 transform hover:scale-105 shadow-2xl border border-white/20"
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

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Coluna Esquerda: Foto do Estudante */}
            <div className="lg:col-span-5 relative overflow-hidden rounded-3xl border border-white/20" style={{ minHeight: '500px' }}>
              <img 
                src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/man_lookin_at_cellphone.webp" 
                alt="Estudante olhando celular" 
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  height: '100%',
                  width: 'auto',
                  maxWidth: 'none'
                }}
              />
            </div>

            {/* Coluna Direita: Conteúdo + Cards Empilhados */}
            <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
              {/* Cabeçalho de Texto */}
              <div>
                <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6 leading-tight">
                  {t('matriculaRewardsLanding.finalCta.title')}
                  <span className="text-[#05294E]"> {t('matriculaRewardsLanding.finalCta.titleHighlight')}</span>
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  {t('matriculaRewardsLanding.finalCta.description')}
                </p>
              </div>

              {/* Cards Empilhados Verticalmente */}
              <div className="flex flex-col gap-6">
                {/* Se logado: Card do Código de Referência real do usuário */}
                {user && userAffiliateCode && (
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl p-6 hover:shadow-xl transition-all duration-300 group flex flex-col sm:flex-row items-center sm:items-start gap-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Gift className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-3 relative z-10 w-full">
                      <h3 className="text-xl font-bold">{t('matriculaRewardsLanding.hero.demo.referralCode.title')}</h3>
                      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
                        <span className="text-2xl font-bold tracking-wider font-mono">{userAffiliateCode.code}</span>
                      </div>
                      <button
                        onClick={copyReferralCode}
                        className="w-full sm:w-auto bg-white hover:bg-gray-50 text-blue-600 px-6 py-3 rounded-2xl font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-xl flex items-center justify-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        {copiedCode ? t('matriculaRewardsLanding.hero.demo.referralCode.copied') : t('matriculaRewardsLanding.hero.demo.referralCode.copy')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Primary CTA Card (Se não logado) */}
                {(!user || !userAffiliateCode) && (
                  <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 border border-gray-200 hover:bg-white hover:shadow-2xl transition-all duration-300 group flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg flex-shrink-0">
                      <Gift className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-3">
                      <h3 className="text-xl font-bold text-gray-900">{t('matriculaRewardsLanding.finalCta.cards.startNow.title')}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {t('matriculaRewardsLanding.finalCta.cards.startNow.description')}
                      </p>
                      <button
                        onClick={handleGetStarted}
                        className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-base hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-xl"
                      >
                        {t('matriculaRewardsLanding.finalCta.cards.startNow.cta')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Secondary CTA Card */}
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 border border-gray-200 hover:bg-white hover:shadow-2xl transition-all duration-300 group flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg flex-shrink-0">
                    <BookOpen className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1 text-center sm:text-left space-y-3">
                    <h3 className="text-xl font-bold text-gray-900">{t('matriculaRewardsLanding.finalCta.cards.learnMore.title')}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {t('matriculaRewardsLanding.finalCta.cards.learnMore.description')}
                    </p>
                    <Link
                      to="/how-it-works"
                      className="w-full sm:w-auto inline-block bg-transparent text-gray-700 border-2 border-gray-300 px-6 py-3 rounded-2xl font-bold text-base hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 text-center"
                    >
                      {t('matriculaRewardsLanding.finalCta.cards.learnMore.cta')}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QR Code Section - Desktop Only */}
      <section className="hidden lg:block py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Two Column Layout: Text + QR Code */}
          <div className="grid grid-cols-2 gap-16 items-center">
            {/* Left Side - Call to Action Text */}
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  {t('matriculaRewardsLanding.howItWorks.qrCode.title')}
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed mb-8">
                  {t('matriculaRewardsLanding.howItWorks.qrCode.subtitle')}
                </p>
              </div>

              {/* Benefits List */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-gray-900 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{t('matriculaRewardsLanding.howItWorks.qrCode.benefits.quickAccess.title')}</h3>
                    <p className="text-gray-600 text-sm">{t('matriculaRewardsLanding.howItWorks.qrCode.benefits.quickAccess.description')}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-gray-900 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{t('matriculaRewardsLanding.howItWorks.qrCode.benefits.startSaving.title')}</h3>
                    <p className="text-gray-600 text-sm">{t('matriculaRewardsLanding.howItWorks.qrCode.benefits.startSaving.description')}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-gray-900 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{t('matriculaRewardsLanding.howItWorks.qrCode.benefits.referFriends.title')}</h3>
                    <p className="text-gray-600 text-sm">{t('matriculaRewardsLanding.howItWorks.qrCode.benefits.referFriends.description')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - QR Code */}
            <div className="flex justify-center">
              <div className="relative group">
                {/* Outer Frame */}
                <div className="absolute -inset-6 bg-gray-50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Main Container */}
                <div className="relative bg-white rounded-2xl p-8 shadow-xl border border-gray-200 group-hover:shadow-2xl transition-all duration-500">
                  {/* Corner Decorations */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-gray-300 rounded-tl-lg"></div>
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-gray-300 rounded-tr-lg"></div>
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-gray-300 rounded-bl-lg"></div>
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-gray-300 rounded-br-lg"></div>
                  
                  {/* QR Code */}
                  <img 
                    src="/qr_code_register.svg" 
                    alt="QR Code para registro"
                    className="w-80 h-80 mx-auto rounded-xl"
                  />
                  
                  {/* Description */}
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600 font-medium mb-2">
                      {t('matriculaRewardsLanding.howItWorks.qrCode.description')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t('matriculaRewardsLanding.howItWorks.qrCode.instruction')}
                    </p>
                  </div>
                </div>
                
                {/* Floating Elements */}
                <div className="absolute -top-3 -right-3 w-6 h-6 bg-blue-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-100"></div>
                <div className="absolute -bottom-3 -left-3 w-4 h-4 bg-green-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-200"></div>
              </div>
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

          /* Mobile-optimized slider styles */
          .slider {
            -webkit-appearance: none;
            appearance: none;
            background: transparent;
            cursor: pointer;
          }

          .slider::-webkit-slider-track {
            background: #e2e8f0;
            height: 8px;
            border-radius: 4px;
          }

          .slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            background: #3b82f6;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
          }

          .slider::-webkit-slider-thumb:hover {
            background: #2563eb;
            transform: scale(1.1);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          }

          .slider::-moz-range-track {
            background: #e2e8f0;
            height: 8px;
            border-radius: 4px;
            border: none;
          }

          .slider::-moz-range-thumb {
            background: #3b82f6;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
          }

          .slider::-moz-range-thumb:hover {
            background: #2563eb;
            transform: scale(1.1);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          }

          /* Mobile touch improvements */
          @media (max-width: 768px) {
            .slider::-webkit-slider-thumb {
              height: 24px;
              width: 24px;
            }
            
            .slider::-moz-range-thumb {
              height: 24px;
              width: 24px;
            }
          }

          /* Smooth transitions for mobile interactions */
          @media (max-width: 768px) {
            .group:active {
              transform: scale(0.98);
              transition: transform 0.1s ease;
            }
          }
        `
      }} />
    </div>
  );
};

export default MatriculaRewardsLanding;
