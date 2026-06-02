import React from 'react';
import { Heart, Mail, Phone, MapPin, Eye, Target } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { useUniversityLogos } from '../hooks/useUniversityLogos';

const About: React.FC = () => {
  const { t } = useTranslation('about');
  const { universities: partnerUniversities, loading: partnersLoading } = useUniversityLogos();

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#05294E] via-[#0A3D70] to-[#05294E] text-white py-20 relative overflow-hidden">
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
      <section className="py-20 bg-white">
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

      {/* Partner Universities Carousel Strip */}
      <section className="py-16 bg-[#05294E] overflow-hidden">
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
        <div className="relative overflow-hidden">
          {/* Side fade gradients matching dark bg */}
          <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-[#05294E] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-[#05294E] to-transparent z-10 pointer-events-none" />

          {partnersLoading ? (
            <div className="flex gap-16 px-8 animate-pulse">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[140px] h-16 bg-white/10 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="animate-marquee flex gap-12 items-center py-4">
              {[...partnerUniversities, ...partnerUniversities]
                .filter(u => u.logoUrl)
                .map((university, index) => {
                  const wrapperId = `about-logo-${university.name.replace(/\s+/g, '-').toLowerCase()}-${index}`;
                  return (
                    <div
                      key={wrapperId}
                      id={wrapperId}
                      className="flex-shrink-0 w-[160px] h-16 bg-white/95 backdrop-blur-sm rounded-xl p-3 flex items-center justify-center select-none shadow-md hover:shadow-xl hover:scale-105 hover:bg-white transition-all duration-300 border border-white/10"
                    >
                      <img
                        src={university.logoUrl!}
                        alt={`${university.name} logo`}
                        className="max-h-full max-w-full object-contain transition-all duration-300"
                        onError={() => {
                          const wrapper = document.getElementById(wrapperId);
                          if (wrapper) wrapper.style.display = 'none';
                        }}
                      />
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </section>

      {/* cannibalized Mission, Vision, Values and Hero Details */}
      <section className="py-24 bg-slate-50">
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


      {/* Contact Section */}
      <section className="py-20 bg-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-white border border-slate-100 rounded-[2.5rem] shadow-none p-8 md:p-16 flex flex-col lg:flex-row items-center justify-between gap-12 overflow-hidden">
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-[#05294E]/5 rounded-full blur-xl pointer-events-none"></div>
            <div className="absolute top-10 right-1/3 w-60 h-60 bg-[#D0151C]/5 rounded-full blur-2xl pointer-events-none"></div>

            {/* Left Content */}
            <div className="relative z-10 flex-1 text-slate-900 max-w-xl text-center lg:text-left flex flex-col items-center lg:items-start">
              <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight text-slate-900">
                {t('contactSection.title')}
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed font-medium">
                {t('contactSection.description')}
              </p>
              <a
                href="/contact"
                className="inline-flex items-center gap-3 bg-[#05294E] text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
              >
                <Phone className="h-5 w-5 text-white group-hover:animate-bounce" />
                {t('contactSection.button')}
              </a>
            </div>

            {/* Right Card */}
            <div className="relative z-10 w-full lg:w-[420px] bg-slate-50 rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 self-stretch flex flex-col justify-center">
              <h3 className="text-2xl font-black text-slate-900 mb-8 border-b pb-4 border-slate-200 text-center lg:text-left">
                {t('contactSection.infoTitle')}
              </h3>
              <div className="space-y-6">
                <a href="mailto:info@matriculausa.com" className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left gap-4 p-3 rounded-2xl hover:bg-white hover:shadow-md transition-all duration-300 group">
                  <div className="bg-[#05294E]/10 p-3 rounded-xl group-hover:bg-[#05294E] transition-all duration-300">
                    <Mail className="h-6 w-6 text-[#05294E] group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{t('contactSection.emailLabel')}</p>
                    <p className="text-base font-bold text-slate-800 break-all">info@matriculausa.com</p>
                  </div>
                </a>
                <a href="tel:+12136762544" className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left gap-4 p-3 rounded-2xl hover:bg-white hover:shadow-md transition-all duration-300 group">
                  <div className="bg-[#05294E]/10 p-3 rounded-xl group-hover:bg-[#05294E] transition-all duration-300">
                    <Phone className="h-6 w-6 text-[#05294E] group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{t('contactSection.phoneLabel')}</p>
                    <p className="text-base font-bold text-slate-800 break-all">+1 (213) 676-2544</p>
                  </div>
                </a>
                <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left gap-4 p-3 rounded-2xl hover:bg-white hover:shadow-md transition-all duration-300 group">
                  <div className="bg-green-600/10 p-3 rounded-xl group-hover:bg-green-600 transition-all duration-300">
                    <MapPin className="h-6 w-6 text-green-600 group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{t('contactSection.officeLabel')}</p>
                    <p className="text-base font-bold text-slate-800">{t('contactSection.officeValue')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
