import React from 'react';
import { Zap, Globe, Award, Users, Heart, BookOpen, CheckCircle, Sparkles } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

const About: React.FC = () => {
  const { t } = useTranslation('about');

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-[#05294E] text-white py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#D0151C]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <img src="/logo.png.png" alt="MatriculaUSA Logo" className="mx-auto h-16 mb-6 bg-white rounded-2xl shadow-lg p-2" />
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              <span className="text-white">{t('hero.title')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-200 max-w-3xl mx-auto leading-relaxed">
              {t('hero.description')}
            </p>
          </div>
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="bg-[#05294E] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-[#05294E]">{t('pillars.mission.title')}</h3>
              <p className="text-slate-700">{t('pillars.mission.description')}</p>
            </div>
            <div>
              <div className="bg-[#D0151C] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-[#D0151C]">{t('pillars.vision.title')}</h3>
              <p className="text-slate-700">{t('pillars.vision.description')}</p>
            </div>
            <div>
              <div className="bg-green-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-green-700">{t('pillars.values.title')}</h3>
              <p className="text-slate-700">{t('pillars.values.description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story & Impact */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center bg-[#05294E]/10 rounded-full px-6 py-2 mb-6">
                <Sparkles className="h-4 w-4 mr-2 text-[#05294E]" />
              <span className="text-sm font-bold text-slate-700">{t('story.badge')}</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8">
              {t('story.title')}
              </h2>
            <div className="space-y-6 text-slate-700 text-lg leading-relaxed">
                <p>
                {t('story.p1')}
                </p>
                <p>
                {t('story.p2')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="bg-[#05294E]/10 p-6 rounded-2xl border border-[#05294E]/20 text-center">
                <div className="text-3xl font-black text-[#05294E] mb-2">$50M+</div>
                <div className="text-sm font-medium text-slate-700">{t('story.stats.scholarships')}</div>
              </div>
              <div className="bg-[#D0151C]/10 p-6 rounded-2xl border border-[#D0151C]/20 text-center">
                <div className="text-3xl font-black text-[#D0151C] mb-2">5,000+</div>
                <div className="text-sm font-medium text-slate-700">{t('story.stats.students')}</div>
              </div>
            </div>
          </div>
          <div className="lg:pl-12">
            <img
              src="https://images.unsplash.com/photo-1557064349-d835670beb60?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="International student with USA flag"
              className="rounded-3xl shadow-2xl w-full"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              <Trans
                i18nKey="howItWorks.title"
                ns="about"
                components={[<span className="text-[#D0151C]" />]}
              />
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              {t('howItWorks.description')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center">
              <BookOpen className="h-10 w-10 mx-auto mb-4 text-[#05294E]" />
              <h3 className="font-bold text-lg mb-2">{t('howItWorks.steps.explore.title')}</h3>
              <p className="text-slate-600">{t('howItWorks.steps.explore.description')}</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center">
              <Users className="h-10 w-10 mx-auto mb-4 text-[#D0151C]" />
              <h3 className="font-bold text-lg mb-2">{t('howItWorks.steps.apply.title')}</h3>
              <p className="text-slate-600">{t('howItWorks.steps.apply.description')}</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center">
              <Award className="h-10 w-10 mx-auto mb-4 text-green-600" />
              <h3 className="font-bold text-lg mb-2">{t('howItWorks.steps.match.title')}</h3>
              <p className="text-slate-600">{t('howItWorks.steps.match.description')}</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center">
              <CheckCircle className="h-10 w-10 mx-auto mb-4 text-[#05294E]" />
              <h3 className="font-bold text-lg mb-2">{t('howItWorks.steps.succeed.title')}</h3>
              <p className="text-slate-600">{t('howItWorks.steps.succeed.description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-[#05294E] mb-6">{t('cta.title')}</h2>
          <p className="text-xl text-slate-700 mb-8">{t('cta.description')}</p>
          <a href="/register" className="inline-block bg-[#D0151C] text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-[#B01218] transition-all duration-300">
            {t('cta.button')}
          </a>
        </div>
      </section>
    </div>
  );
};

export default About;