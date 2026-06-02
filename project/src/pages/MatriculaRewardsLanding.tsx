import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  Coins,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  Mail,
  Share2,
  DollarSign,
  ArrowDownToLine,
  MessageCircle,
  Copy,
  Link2
} from 'lucide-react';
import {
  AffiliateCode
} from '../types';

// Número que conta suavemente até o valor alvo
const AnimatedNumber: React.FC<{ value: number; prefix?: string }> = ({ value, prefix = '' }) => {
  const count = useMotionValue(value);
  const rounded = useTransform(count, (latest) => `${prefix}${Math.round(latest).toLocaleString()}`);

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.6, ease: 'easeOut' });
    return controls.stop;
  }, [value, count]);

  return <motion.span>{rounded}</motion.span>;
};

const MatriculaRewardsLanding: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [calculatorFriends, setCalculatorFriends] = useState(5);
  const [userAffiliateCode, setUserAffiliateCode] = useState<AffiliateCode | null>(null);

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

  const calculateSavings = (friends: number) => {
    const coins = friends * 100; // 100 coins por indicação bem-sucedida
    const dollars = coins; // 1 coin = $1
    return { coins, dollars };
  };

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Efeito de luminosidade vermelho no topo */}
      <div className="absolute inset-x-0 top-0 h-[900px] z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[1000px] h-[700px] bg-red-500/20 rounded-full blur-[150px]"></div>
        <div className="absolute top-[200px] left-1/4 w-[600px] h-[500px] bg-[#D0151C]/12 rounded-full blur-[130px]"></div>
        <div className="absolute top-[200px] right-1/4 w-[600px] h-[500px] bg-rose-400/20 rounded-full blur-[130px]"></div>
      </div>

      {/* Hero header — transparente */}
      <section className="relative pt-20 pb-24 lg:pt-24 lg:pb-28 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#05294E] leading-tight tracking-tight">
            Transforme Suas
            <span className="block text-[#05294E] mt-1">
              Indicações em Descontos
            </span>
            <span className="block text-[#05294E] mt-1">
              na Sua Mensalidade
            </span>
          </h1>
          <p className="text-lg lg:text-xl text-[#05294E]/70 mt-4 max-w-2xl mx-auto leading-relaxed font-medium">
            Compartilhe seu código, indique quem quer estudar nos EUA e acumule <strong className="text-[#05294E]">MatriculaCoins</strong> a cada indicação confirmada.
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full border border-[#05294E]/20 text-[#05294E] text-sm font-semibold hover:bg-[#05294E]/5 transition-colors"
          >
            Indique um amigo
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Showcase — prova social estilo "céu" */}
      <section className="relative z-10 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-br from-[#D0151C] via-[#b01016] to-[#7a0a0f] overflow-x-clip overflow-y-visible lg:overflow-visible lg:min-h-[560px] flex flex-col lg:block">

            {/* Glows de iluminação dentro do painel */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-red-400/25 rounded-full blur-[120px]"></div>
              <div className="absolute bottom-0 -left-24 w-[450px] h-[450px] bg-red-500/20 rounded-full blur-[110px]"></div>
              <div className="absolute -bottom-20 -right-24 w-[450px] h-[450px] bg-rose-400/15 rounded-full blur-[110px]"></div>
            </div>

            {/* Cards — diferenciais */}
            <div className="relative z-10 order-4 flex flex-col items-start gap-3 sm:gap-4 px-6 pb-6 sm:px-8 sm:pb-8 lg:p-0 lg:absolute lg:left-8 lg:top-1/2 lg:-translate-y-1/2 lg:w-auto">
              {[
                'Indique seus amigos',
                'Acumule MatriculaCoins',
                'Troque por descontos reais',
              ].map((title, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 + i * 0.15 }}
                  style={{ ['--ml' as any]: `${i * 1.5}rem` }}
                  className="flex items-center gap-4 bg-white/10 backdrop-blur-2xl rounded-2xl px-6 py-5 sm:px-7 sm:py-6 ml-[var(--ml)] lg:ml-[calc(var(--ml)*1.66)]"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <p className="font-bold text-white text-base sm:text-lg leading-snug lg:whitespace-nowrap">{title}</p>
                </motion.div>
              ))}
            </div>

            {/* Cards — estatísticas */}
            <div className="relative z-20 order-3 -mt-14 sm:-mt-[4.5rem] flex flex-col gap-3 sm:gap-4 px-6 pb-6 sm:px-8 sm:pb-8 lg:mt-0 lg:p-0 lg:absolute lg:right-8 lg:top-10 lg:w-auto lg:max-w-[260px]">
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
                className="bg-white rounded-2xl px-6 py-5 sm:px-7 sm:py-6 shadow-lg"
              >
                <p className="text-4xl sm:text-5xl font-black text-[#05294E] leading-none">100</p>
                <p className="text-slate-500 text-sm sm:text-base mt-2 leading-snug">MatriculaCoins por amigo que se matricular</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.45 }}
                className="bg-white rounded-2xl px-6 py-5 sm:px-7 sm:py-6 shadow-lg"
              >
                <div className="flex -space-x-2 mb-3">
                  {[
                    'https://i.pravatar.cc/64?img=12',
                    'https://i.pravatar.cc/64?img=32',
                    'https://i.pravatar.cc/64?img=45',
                    'https://i.pravatar.cc/64?img=68',
                  ].map((src) => (
                    <img key={src} src={src} alt="" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-white object-cover" />
                  ))}
                </div>
                <p className="text-slate-700 text-sm sm:text-base leading-snug">
                  <strong className="text-[#05294E]">300+</strong> estudantes já economizando com o Rewards
                </p>
              </motion.div>
            </div>

            {/* Imagem — afiliadas (transbordando pelo topo no mobile e no desktop) */}
            <div className="relative z-[1] order-2 -mt-48 flex justify-center overflow-x-clip overflow-y-visible lg:mt-0 lg:overflow-visible lg:absolute lg:inset-x-0 lg:bottom-0 pointer-events-none">
              <motion.img
                src="/indicacao.png"
                alt="Indicação MatriculaUSA"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="block w-auto max-w-none h-[26rem] object-contain object-bottom lg:h-[48rem]"
              />
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

      {/* How It Works Section - Mobile Optimized */}
      <section id="how-it-works" className="py-16 md:py-24 relative overflow-hidden">
        {/* Floating elements - only on desktop */}
        <div className="absolute inset-0">
          <div className="hidden md:block absolute top-1/4 left-1/4 w-2 h-2 bg-blue-300/40 rounded-full animate-pulse"></div>
          <div className="hidden md:block absolute top-3/4 right-1/4 w-1 h-1 bg-indigo-300/50 rounded-full animate-ping"></div>
          <div className="hidden md:block absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-slate-300/30 rounded-full animate-bounce"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Título */}
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#05294E] tracking-tight">
              {t('matriculaRewardsLanding.howItWorks.title')}
            </h2>
          </div>

          {/* Grid de cards com mockups */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
            {[
              {
                title: 'Receba seu código único',
                desc: 'Ao entrar no Matrícula Rewards, você ganha um código exclusivo de indicação só seu.',
                mockup: (
                  <div className="w-full space-y-3 text-left">
                    <div className="bg-slate-50 border-2 border-dashed border-[#05294E]/20 rounded-xl px-3 py-2.5 text-center">
                      <span className="text-base font-black text-[#05294E] tracking-[0.15em]">MUSA-7K3D</span>
                    </div>
                    <button disabled className="w-full bg-[#05294E] text-white py-2 rounded-lg font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-default">
                      <CheckCircle className="w-3 h-3" />
                      Código copiado
                    </button>
                  </div>
                ),
              },
              {
                title: 'Indique amigos que querem estudar nos EUA',
                desc: 'Compartilhe seu código com quem sonha em iniciar uma jornada acadêmica internacional.',
                mockup: (
                  <div className="w-full space-y-3 text-left">
                    {/* Campo do link com botão copiar */}
                    <div>
                      <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Seu link de indicação</p>
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl pl-2.5 pr-1.5 py-1.5">
                        <Link2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-[9px] font-bold text-slate-700 truncate flex-1">matriculausa.com/r/MUSA-7K3D</span>
                        <button disabled className="flex items-center gap-1 bg-[#05294E] text-white px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-wider cursor-default flex-shrink-0">
                          <Copy className="w-2.5 h-2.5" />
                          Copiar
                        </button>
                      </div>
                    </div>

                    {/* Botões de canal */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-50 text-green-600' },
                        { label: 'E-mail', icon: Mail, color: 'bg-blue-50 text-blue-600' },
                        { label: 'Mais', icon: Share2, color: 'bg-slate-50 text-slate-600' },
                      ].map(({ label, icon: ChannelIcon, color }) => (
                        <div key={label} className={`rounded-xl ${color} flex flex-col items-center justify-center py-2.5 gap-1`}>
                          <ChannelIcon className="w-4 h-4" />
                          <span className="text-[7px] font-black uppercase tracking-wider">{label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 rounded-xl px-2.5 py-2 text-center">
                        <p className="text-sm font-black text-[#05294E] leading-none">12</p>
                        <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider mt-1">Convites enviados</p>
                      </div>
                      <div className="bg-emerald-50/60 rounded-xl px-2.5 py-2 text-center">
                        <p className="text-sm font-black text-emerald-600 leading-none">8</p>
                        <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider mt-1">Cliques no link</p>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                title: 'Ganhe MatriculaCoins a cada matrícula',
                desc: 'Arraste e veja quanto você ganha: a cada amigo que se matricular, os coins entram automaticamente na sua conta.',
                mockup: (
                  <div className="w-full space-y-3 text-left">
                    {/* Resultados — atualizam em tempo real */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Coins className="w-3 h-3 text-yellow-500" />
                          <span className="text-[7px] font-bold uppercase tracking-wider">Coins ganhos</span>
                        </div>
                        <p className="text-xl font-black text-[#05294E] tabular-nums leading-tight mt-0.5">
                          <AnimatedNumber value={calculateSavings(calculatorFriends).coins} />
                        </p>
                      </div>
                      <div className="bg-emerald-50/60 rounded-xl px-3 py-2.5 border border-emerald-100">
                        <div className="flex items-center gap-1 text-slate-400">
                          <DollarSign className="w-3 h-3 text-emerald-600" />
                          <span className="text-[7px] font-bold uppercase tracking-wider">Desconto</span>
                        </div>
                        <p className="text-xl font-black text-emerald-600 tabular-nums leading-tight mt-0.5">
                          <AnimatedNumber value={calculateSavings(calculatorFriends).dollars} prefix="$" />
                        </p>
                      </div>
                    </div>

                    {/* Slider — controla o número de amigos */}
                    <div className="bg-slate-50 rounded-xl px-3 py-3 border border-slate-100">
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={calculatorFriends}
                        onChange={(e) => setCalculatorFriends(parseInt(e.target.value))}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #D0151C 0%, #D0151C ${(calculatorFriends / 50) * 100}%, #e2e8f0 ${(calculatorFriends / 50) * 100}%, #e2e8f0 100%)`
                        }}
                      />
                      <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-2 text-center">
                        <span className="text-[#05294E] tabular-nums">{calculatorFriends}</span> amigos indicados
                      </p>
                    </div>
                  </div>
                ),
              },
              {
                title: 'Troque por desconto na sua mensalidade',
                desc: 'Acumule coins e use direto no valor da sua mensalidade na Matrícula USA.',
                mockup: (
                  <div className="w-full rounded-2xl overflow-hidden text-left">
                    {/* Header — saldo disponível em dólares (verde) */}
                    <div className="bg-gradient-to-br from-emerald-500 to-green-600 px-4 py-3.5 text-white rounded-2xl shadow-md shadow-green-500/20">
                      <div className="flex items-center justify-between">
                        <p className="text-[7px] font-bold uppercase tracking-widest text-white/80">Saldo disponível</p>
                        <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider">USD</span>
                      </div>
                      <div className="flex items-end gap-1 mt-1">
                        <DollarSign className="w-5 h-5 mb-0.5" />
                        <span className="text-3xl font-black leading-none tabular-nums">
                          <AnimatedNumber value={calculateSavings(calculatorFriends).dollars} />.00
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 text-white/80">
                        <Coins className="w-3 h-3 text-yellow-300" />
                        <span className="text-[8px] font-bold">{calculateSavings(calculatorFriends).coins.toLocaleString('pt-BR')} coins · 1 coin = US$ 1</span>
                      </div>
                    </div>

                    {/* Corpo — aplicar desconto */}
                    <div className="pt-3 space-y-2.5">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[9px] font-black text-slate-800">Aplicar na mensalidade</span>
                        </div>
                        <span className="text-[9px] font-black text-emerald-600">-${calculateSavings(calculatorFriends).dollars.toLocaleString('pt-BR')}.00</span>
                      </div>
                      <button disabled className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2.5 rounded-lg font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-default shadow-md shadow-green-500/20">
                        <ArrowDownToLine className="w-3 h-3" />
                        Usar desconto
                      </button>
                    </div>
                  </div>
                ),
              },
            ].map(({ title, desc, mockup }, i) => {
              const isLarge = i === 1 || i === 2;
              return (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.12 }}
                  className={`relative h-full bg-white rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(0,0,0,0.05)] p-7 hover:shadow-[0_20px_50px_rgba(5,41,78,0.10)] hover:-translate-y-1 transition-all duration-300 ${
                    isLarge ? 'lg:col-span-3' : 'lg:col-span-2'
                  }`}
                >
                  <div className={`relative h-full flex flex-col ${isLarge ? 'lg:flex-row lg:items-center lg:gap-7' : ''}`}>
                    {/* Texto */}
                    <div className={isLarge ? 'order-2 lg:order-1 lg:flex-1' : ''}>
                      <h3 className="text-xl md:text-2xl font-bold text-[#05294E] tracking-tight leading-snug mb-2.5">
                        {title}
                      </h3>
                      <p className="text-base md:text-lg text-slate-400 leading-relaxed font-medium">
                        {desc}
                      </p>
                    </div>

                    {/* Mockup ilustrativo */}
                    <div className={`relative ${isLarge ? 'order-1 lg:order-2 mb-5 lg:mb-0 lg:w-1/2 lg:flex-shrink-0' : 'mt-8'}`}>
                      {mockup}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="text-center mt-14">
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center justify-center gap-2 bg-[#D0151C] text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-[#b01016] transition-all duration-300 transform hover:scale-105 shadow-lg shadow-[#D0151C]/25"
            >
              {t('matriculaRewardsLanding.howItWorks.calculator.cta')}
              <ArrowRight className="w-5 h-5" />
            </button>
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

      {/* FAQ */}
      <MatriculaRewardsFAQ />

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
            background: #D0151C;
            height: 22px;
            width: 22px;
            border-radius: 50%;
            border: 3px solid #ffffff;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(208, 21, 28, 0.4);
            transition: all 0.2s ease;
          }

          .slider::-webkit-slider-thumb:hover {
            background: #b01016;
            transform: scale(1.15);
            box-shadow: 0 4px 10px rgba(208, 21, 28, 0.5);
          }

          .slider::-moz-range-track {
            background: #e2e8f0;
            height: 8px;
            border-radius: 4px;
            border: none;
          }

          .slider::-moz-range-thumb {
            background: #D0151C;
            height: 22px;
            width: 22px;
            border-radius: 50%;
            border: 3px solid #ffffff;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(208, 21, 28, 0.4);
            transition: all 0.2s ease;
          }

          .slider::-moz-range-thumb:hover {
            background: #b01016;
            transform: scale(1.15);
            box-shadow: 0 4px 10px rgba(208, 21, 28, 0.5);
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

const MATRICULA_REWARDS_FAQS = [
  {
    question: 'Para quem é o Matrícula Rewards?',
    answer: 'O Matrícula Rewards é para estudantes que querem transformar suas indicações em benefícios reais. A cada amigo que se matricular com o seu código, você acumula MatriculaCoins e decide como usá-los: abater no valor da sua mensalidade ou resgatar em dinheiro. Quanto mais você indica, mais você economiza ou recebe.',
  },
  {
    question: 'Quanto custa participar do Matrícula Rewards?',
    answer: 'Nada. O Matrícula Rewards é 100% gratuito. Você recebe seu código de indicação e já pode começar a indicar amigos que querem estudar nos EUA.',
  },
  {
    question: 'Como eu ganho MatriculaCoins?',
    answer: 'Você acumula coins a cada amigo que se matricular usando o seu código de indicação. Não há limite: quanto mais pessoas você indicar, mais coins ganha.',
  },
  {
    question: 'Quantos coins eu ganho por indicação?',
    answer: 'São 100 MatriculaCoins para cada amigo que concluir a matrícula a partir da sua indicação.',
  },
  {
    question: 'Quando a indicação é considerada confirmada?',
    answer: 'A indicação é validada quando a pessoa que usou o seu código conclui a etapa de matrícula na plataforma. Após a validação, os coins entram automaticamente na sua conta.',
  },
  {
    question: 'Quanto vale cada MatriculaCoin?',
    answer: 'Cada coin equivale a US$ 1 em descontos. Você acompanha o seu saldo disponível diretamente no seu painel.',
  },
  {
    question: 'Como resgato minhas recompensas?',
    answer: 'Direto no seu painel, você escolhe o que fazer com os coins acumulados: aplicar como desconto no valor da sua mensalidade ou resgatar o saldo em dinheiro. A decisão é sempre sua.',
  },
];

const MatriculaRewardsFAQ: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-black mb-10 text-center text-[#05294E]">
            Perguntas frequentes
          </h2>

          <div className="max-w-3xl mx-auto space-y-1">
            {MATRICULA_REWARDS_FAQS.map((faq, num) => (
              <div
                key={num}
                className={`group transition-all duration-300 border-b border-slate-200 ${
                  openFaq === num ? 'bg-gradient-to-br from-white to-slate-50/30' : ''
                }`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === num ? null : num)}
                  className="w-full text-left p-4 sm:p-5 flex items-center gap-4 group focus:outline-none"
                >
                  <div className="flex-1">
                    <h3 className="text-sm sm:text-base font-bold leading-tight text-slate-900">
                      {faq.question}
                    </h3>
                  </div>
                  <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-500 ${
                    openFaq === num ? 'bg-slate-100 text-slate-600 rotate-180' : 'bg-slate-50 text-slate-300 group-hover:text-slate-400'
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
                <AnimatePresence>
                  {openFaq === num && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                      <div className="px-4 sm:px-5 pb-5 pt-0">
                        <p className="text-slate-600 text-sm sm:text-base leading-relaxed border-t border-slate-100 pt-3 pr-2 sm:pr-4">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default MatriculaRewardsLanding;
