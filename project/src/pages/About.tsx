import React from 'react';
import { Heart, Eye, Target } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { useUniversityLogos } from '../hooks/useUniversityLogos';

const About: React.FC = () => {
  const { t } = useTranslation('about');
  const { universities: partnerUniversities, loading: partnersLoading } = useUniversityLogos();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isTransitioning, setIsTransitioning] = React.useState(true);

  const activePartners = React.useMemo(() => {
    return partnerUniversities.filter(u => u.logoUrl);
  }, [partnerUniversities]);

  React.useEffect(() => {
    if (activePartners.length === 0) return;
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setCurrentIndex((prev) => prev + 1);
    }, 5000); // Avança a cada 5 segundos
    return () => clearInterval(timer);
  }, [activePartners.length]);

  React.useEffect(() => {
    if (currentIndex >= activePartners.length && activePartners.length > 0) {
      const timeout = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex(0);
      }, 3500); // Aguarda a transição de 3.5s terminar para reiniciar silenciosamente
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, activePartners.length]);

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-[#05294E] via-[#0A3D70] to-[#05294E] text-white py-28 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/students-walking-university-campus-autumn.webp"
            alt="Students walking on university campus"
            className="w-full h-full object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#05294E]/60 via-[#0A3D70]/45 to-[#05294E]/60 mix-blend-multiply"></div>
        </div>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-300 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
              {t('story.badge')}
            </h1>
          </div>
        </div>
      </div>

      {/* Our Story & Impact */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="text-center lg:text-left">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight">
              <Trans i18nKey="story.title" t={t} components={[<span className="text-[#D0151C]" />]} />
            </h2>
            <div className="space-y-6 text-slate-600 text-lg leading-relaxed font-medium">
              <p>
                {t('story.p1')}
              </p>
              <p>
                {t('story.p2')}
              </p>
            </div>
          </div>
          <div className="lg:pl-12 relative flex items-center justify-center">
            {/* Decorative solid red square in the background behind the bottom-left of the image */}
            <div className="absolute left-6 lg:left-6 bottom-[-24px] w-[140px] h-[140px] lg:w-[180px] lg:h-[180px] bg-[#D0151C] z-0"></div>
            <img
              src="https://images.unsplash.com/photo-1557064349-d835670beb60?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="International student with USA flag"
              className="relative z-10 w-full shadow-2xl border border-slate-100 object-cover"
              style={{ aspectRatio: '1.2' }}
            />
          </div>
        </div>
      </section>

      {/* Stats Cards Section */}
      <section className="pb-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            {/* Card 1: Vermelho */}
            <div className="border-t-4 border-t-[#D0151C] p-8 bg-white flex flex-col justify-between border-r border-b lg:border-b-0 border-slate-200">
              <div>
                <p className="text-4xl font-extrabold text-[#D0151C] mb-2">+5000</p>
                <h4 className="text-lg font-bold text-slate-800 mb-3">{t('stats.students.title', 'Estudantes Atendidos')}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {t('stats.students.desc', 'Jovens que já deram o primeiro passo para transformar o sonho americano em uma jornada real.')}
                </p>
              </div>
            </div>

            {/* Card 2: Azul */}
            <div className="border-t-4 border-t-[#05294E] p-8 bg-slate-50/50 flex flex-col justify-between border-r border-b lg:border-b-0 border-slate-200">
              <div>
                <p className="text-4xl font-extrabold text-[#05294E] mb-2">US$5M+</p>
                <h4 className="text-lg font-bold text-slate-800 mb-3">{t('stats.scholarships.title', 'Em Bolsas de Estudos')}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {t('stats.scholarships.desc', 'Oportunidades que tornam estudar em universidades americanas mais acessível e possível.')}
                </p>
              </div>
            </div>

            {/* Card 3: Azul */}
            <div className="border-t-4 border-t-[#05294E] p-8 bg-slate-50/50 flex flex-col justify-between border-r border-b sm:border-b-0 border-slate-200">
              <div>
                <p className="text-4xl font-extrabold text-[#05294E] mb-2">500+</p>
                <h4 className="text-lg font-bold text-slate-800 mb-3">{t('stats.partners.title', 'Universidades Parceiras')}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {t('stats.partners.desc', 'Mais opções para encontrar a universidade certa para o seu perfil, sua área e seu futuro.')}
                </p>
              </div>
            </div>

            {/* Card 4: Azul */}
            <div className="border-t-4 border-t-[#05294E] p-8 bg-slate-50/50 flex flex-col justify-between border-slate-200">
              <div>
                <p className="text-4xl font-extrabold text-[#05294E] mb-2">98%</p>
                <h4 className="text-lg font-bold text-slate-800 mb-3">{t('stats.visas.title', 'Taxa de Satisfação')}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {t('stats.visas.desc', 'Um resultado que reflete processos bem direcionados, escolhas estratégicas e candidaturas mais fortes.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Universities Carousel Strip */}
      <section className="py-24 relative overflow-hidden bg-cover bg-center bg-fixed bg-no-repeat bg-[url('https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/university-library-facade-classical-architecture.webp')]">
        {/* Dark Blue Overlay for Legibility */}
        <div className="absolute inset-0 bg-[#05294E]/90 z-0"></div>
        
        <div className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="max-w-xl text-center md:text-left">
                <p className="text-[#D0151C] text-sm font-black uppercase tracking-widest mb-3">
                  {t('partners.badge')}
                </p>
                <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
                  {t('partners.title')}
                </h2>
              </div>
              <p className="text-slate-300 text-base max-w-sm leading-relaxed text-center md:text-right mx-auto md:mx-0">
                {t('partners.description')}
              </p>
            </div>
          </div>

          {/* Marquee */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden">

              {partnersLoading ? (
                <div className="flex gap-16 px-8 animate-pulse">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-[140px] h-16 bg-white/10 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="w-full overflow-hidden py-4">
                  <div
                    className={`flex gap-6 md:gap-12 [--carousel-gap:24px] md:[--carousel-gap:48px] ${
                      isTransitioning ? 'transition-transform duration-[3500ms] ease-in-out' : ''
                    }`}
                    style={{
                      transform: `translateX(calc(-${currentIndex} * (160px + var(--carousel-gap))))`,
                    }}
                  >
                    {/* Duplicamos a lista para garantir elementos suficientes para deslizar em loop de 1 em 1 */}
                    {[...activePartners, ...activePartners, ...activePartners].map((university, index) => {
                      const wrapperId = `about-logo-${university.name.replace(/\s+/g, '-').toLowerCase()}-${index}`;
                      return (
                        <div
                          key={wrapperId}
                          id={wrapperId}
                          className="flex-shrink-0 w-[160px] h-16 bg-white rounded-xl p-3 flex items-center justify-center select-none shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 border border-slate-100"
                        >
                          <img
                            src={university.logoUrl!}
                            alt={`${university.name} logo`}
                            className="w-full h-full object-contain transition-all duration-300"
                            onError={() => {
                              const wrapper = document.getElementById(wrapperId);
                              if (wrapper) wrapper.style.display = 'none';
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* cannibalized Mission, Vision, Values and Hero Details */}
      <section className="py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
            <div className="lg:col-span-6 text-center lg:text-left">
              <h2 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight">
                {t('hero.title')}
              </h2>
            </div>
            <div className="lg:col-span-6 lg:pl-8 text-center lg:text-left">
              <p className="text-lg text-slate-600 leading-relaxed font-medium">
                {t('hero.description')}
              </p>
            </div>
          </div>

          {/* Connected Cards Block */}
          <div className="grid grid-cols-1 lg:grid-cols-4 rounded-t-[2rem] rounded-b-none lg:rounded-l-[2rem] lg:rounded-r-none shadow-none overflow-hidden border border-slate-100 bg-white items-stretch">
            {/* Card 1: Nossos Valores (Wide - 2 cols) */}
            <div className="lg:col-span-2 p-8 lg:p-12 flex flex-col justify-between min-h-[320px] bg-white border-b lg:border-b-0 lg:border-r border-slate-100 text-center lg:text-left">
              <div>
                <Heart className="h-10 w-10 text-[#D0151C] mb-8 mx-auto lg:mx-0" />
                <h3 className="text-2xl font-black text-slate-900 mb-4">{t('pillars.values.title')}</h3>
                <p className="text-slate-600 text-lg leading-relaxed font-medium">
                  {t('pillars.values.description')}
                </p>
              </div>
            </div>

            {/* Card 2: Nossa Visão (1 col - Dark Blue) */}
            <div className="lg:col-span-1 p-8 lg:p-10 flex flex-col justify-between min-h-[320px] bg-[#05294E] text-white border-b lg:border-b-0 border-slate-700/30 text-center lg:text-left">
              <div>
                <Eye className="h-10 w-10 text-white mb-8 mx-auto lg:mx-0" />
                <h3 className="text-2xl font-black mb-4">{t('pillars.vision.title')}</h3>
                <p className="text-white/80 text-base leading-relaxed font-medium">
                  {t('pillars.vision.description')}
                </p>
              </div>
            </div>

            {/* Card 3: Nossa Missão (1 col - Red) */}
            <div className="lg:col-span-1 p-8 lg:p-10 flex flex-col justify-between min-h-[320px] bg-[#D0151C] text-white text-center lg:text-left">
              <div>
                <Target className="h-10 w-10 text-white mb-8 mx-auto lg:mx-0" />
                <h3 className="text-2xl font-black mb-4">{t('pillars.mission.title')}</h3>
                <p className="text-white/80 text-base leading-relaxed font-medium">
                  {t('pillars.mission.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
